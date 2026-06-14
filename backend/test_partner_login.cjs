const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: __dirname + '/.env' });

const API_BASE = 'http://localhost:3001/api';

async function run() {
    console.log('=== STARTING B2B PARTNER LOGIN & SYNC VERIFICATION TESTS ===');
    
    // Connect to DB directly for state checking and cleanup
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        // --- PRE-TEST DATABASE STATE AUDIT ---
        console.log('\nChecking existing users and partners in the database...');
        const [users] = await pool.query('SELECT email, role FROM users WHERE email IN (?, ?, ?)', [
            'abhinavgaikwad063@gmail.com',
            'admin@shravyatours.com',
            'test-crud-partner@shravyatours.com'
        ]);
        console.log('Matching Users in DB:', users);

        const [partners] = await pool.query('SELECT id, email, status FROM partners WHERE email IN (?, ?)', [
            'abhinavgaikwad063@gmail.com',
            'test-crud-partner@shravyatours.com'
        ]);
        console.log('Matching Partners in DB:', partners);

        // --- TEST 1: Login as Admin Who Has a Partner Profile ---
        console.log('\n--- TEST 1: Logging in as Admin who is also a Partner ---');
        // abhinavgaikwad063@gmail.com is an admin in `users` and has a partner profile in `partners`
        const loginRes1 = await fetch(`${API_BASE}/partner/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'abhinavgaikwad063@gmail.com',
                password: 'Abhinav@16'
            })
        });

        const loginData1 = await loginRes1.json();
        if (loginRes1.status === 200) {
            console.log('✅ TEST 1 PASSED: Successfully logged in as admin-partner!');
            console.log('Token successfully generated:', loginData1.token ? 'YES' : 'NO');
            console.log('Partner details returned:', loginData1.partner.email, 'Status:', loginData1.partner.status);
            
            // Verify token access to /api/partner/me
            const meRes = await fetch(`${API_BASE}/partner/me`, {
                headers: { 'Authorization': `Bearer ${loginData1.token}` }
            });
            const meData = await meRes.json();
            if (meRes.status === 200) {
                console.log('✅ TEST 1b PASSED: /api/partner/me successfully fetched using partner-scoped JWT!');
                console.log('Me Name:', meData.name, 'Email:', meData.email);
            } else {
                console.log('❌ TEST 1b FAILED:', meRes.status, meData);
            }
        } else {
            console.log('❌ TEST 1 FAILED:', loginRes1.status, loginData1);
        }

        // --- TEST 2: Registration Non-Degradation Guard ---
        console.log('\n--- TEST 2: Registering a Partner with an Email That Already Exists as Admin ---');
        // Let's create a temporary admin/staff in users to test this
        const testStaffEmail = 'temp-test-staff@shravyatours.com';
        
        // Cleanup potential stale temp records
        await pool.query('DELETE FROM users WHERE email = ?', [testStaffEmail]);
        await pool.query('DELETE FROM partners WHERE email = ?', [testStaffEmail]);

        // Insert user as 'staff'
        const staffHash = await bcrypt.hash('staffPass123', 10);
        await pool.query('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', [
            testStaffEmail,
            staffHash,
            'staff'
        ]);

        // Register this email as a partner
        const regRes = await fetch(`${API_BASE}/partner/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Temp Test Staff Partner',
                email: testStaffEmail,
                password: 'newPartnerPassword123',
                phone: '1234567890',
                companyName: 'Test Staff Company',
                location: 'Mumbai'
            })
        });

        const regData = await regRes.json();
        if (regRes.status === 200) {
            console.log('✅ Registration request completed successfully!');
            // Query DB to check if role remained 'staff' (not degraded to 'partner')
            const [checkUser] = await pool.query('SELECT role FROM users WHERE email = ?', [testStaffEmail]);
            if (checkUser[0] && checkUser[0].role === 'staff') {
                console.log('✅ TEST 2 PASSED: Privilege isolation preserved! Role remained:', checkUser[0].role);
            } else {
                console.log('❌ TEST 2 FAILED: Role was degraded or user not found. Current role:', checkUser[0] ? checkUser[0].role : 'NULL');
            }
        } else {
            console.log('❌ TEST 2 FAILED: Registration request failed:', regRes.status, regData);
        }

        // Cleanup Temp Test Staff
        await pool.query('DELETE FROM users WHERE email = ?', [testStaffEmail]);
        await pool.query('DELETE FROM partners WHERE email = ?', [testStaffEmail]);

        // --- TEST 3: CRUD Auto-Sync ---
        console.log('\n--- TEST 3: CRUD Creation Auto-Sync ---');
        // Log in as Admin to obtain authorization token
        const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@shravyatours.com',
                password: 'admin' // dev bypass
            })
        });
        const adminLoginData = await adminLoginRes.json();
        const adminToken = adminLoginData.token;
        if (!adminToken) {
            throw new Error('Could not log in as admin for CRUD testing');
        }
        console.log('Logged in as admin successfully.');

        // Cleanup any existing test-crud-partner
        const testPartnerEmail = 'test-crud-partner@shravyatours.com';
        await pool.query('DELETE FROM users WHERE email = ?', [testPartnerEmail]);
        await pool.query('DELETE FROM partners WHERE email = ?', [testPartnerEmail]);

        // Create partner via admin CRUD endpoint
        const createRes = await fetch(`${API_BASE}/crud/partners`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                name: 'CRUD Automated Test Partner',
                email: testPartnerEmail,
                phone: '9876543210',
                company_name: 'CRUD Test Co',
                location: 'Pune',
                status: 'Active',
                commission_type: 'Percentage',
                commission_value: 7.50,
                joined_date: new Date().toISOString().split('T')[0]
            })
        });

        const createData = await createRes.json();
        if (createRes.status === 201) {
            console.log('✅ CRUD Partner creation endpoint succeeded!');
            
            // Check if user account was auto-created in `users` table
            const [syncedUsers] = await pool.query('SELECT email, role FROM users WHERE email = ?', [testPartnerEmail]);
            if (syncedUsers.length > 0 && syncedUsers[0].role === 'partner') {
                console.log('✅ TEST 3 PASSED: Sync hook auto-created users record successfully with role:', syncedUsers[0].role);
                
                // Test login of this new CRUD-created partner using default password 'password123'
                const partnerLoginRes = await fetch(`${API_BASE}/partner/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: testPartnerEmail,
                        password: 'password123'
                    })
                });

                const partnerLoginData = await partnerLoginRes.json();
                if (partnerLoginRes.status === 200) {
                    console.log('✅ TEST 3b PASSED: CRUD-created partner successfully logged in using default password!');
                    console.log('Token successfully generated for new partner:', partnerLoginData.token ? 'YES' : 'NO');
                } else {
                    console.log('❌ TEST 3b FAILED: CRUD-created partner login failed:', partnerLoginRes.status, partnerLoginData);
                }
            } else {
                console.log('❌ TEST 3 FAILED: No users record synced or wrong role. Records:', syncedUsers);
            }
        } else {
            console.log('❌ TEST 3 FAILED: CRUD partner creation failed:', createRes.status, createData);
        }

        // --- CLEANUP ---
        console.log('\nCleaning up automated test records...');
        await pool.query('DELETE FROM users WHERE email = ?', [testPartnerEmail]);
        await pool.query('DELETE FROM partners WHERE email = ?', [testPartnerEmail]);
        console.log('Cleanup complete.');

    } catch (error) {
        console.error('An unexpected error occurred during test execution:', error);
    } finally {
        pool.end();
        console.log('\n=== VERIFICATION TESTS COMPLETED ===');
    }
}

run();
