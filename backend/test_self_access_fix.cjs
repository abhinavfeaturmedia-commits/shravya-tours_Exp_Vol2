const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_please_change';
const PORT = process.env.PORT || 3001;

async function run() {
    console.log('=== STARTING SELF-ACCESS BYPASS SECURITY TESTS ===');
    console.log('JWT Secret:', JWT_SECRET);
    console.log('Target Server URL:', `http://localhost:${PORT}`);

    // 1. Generate a JWT token representing Ajinkya (Staff ID 31, email: avjagdale96@gmail.com, role: Editor)
    const token = jwt.sign(
        { id: 12, email: 'avjagdale96@gmail.com', role: 'Editor', staffId: 31 },
        JWT_SECRET,
        { expiresIn: '1h' }
    );
    console.log('\nGenerated Mock Staff JWT Token for Ajinkya.');

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    // 2. Test 1: Fetching Ajinkya's own profile (should succeed via self-bypass logic)
    try {
        console.log('\n--- Test 1: Fetching own staff record (self-bypass) ---');
        const res = await fetch(`http://localhost:${PORT}/api/crud/staff_members?eq_email=avjagdale96@gmail.com`, {
            headers
        });
        const data = await res.json();
        console.log('HTTP Status:', res.status);
        if (res.status === 200) {
            console.log('✓ Success! Allowed to view own profile.');
            console.log('Fetched Staff Name:', data.data?.[0]?.name);
            console.log('Fetched Staff Email:', data.data?.[0]?.email);
        } else {
            console.error('❌ Failed! Blocked from viewing own profile.', data);
        }
    } catch (e) {
        console.error('Test 1 error:', e.message);
    }

    // 3. Test 2: Fetching another staff record (should be blocked with 403 Forbidden)
    try {
        console.log('\n--- Test 2: Fetching another staff member (should fail) ---');
        const res = await fetch(`http://localhost:${PORT}/api/crud/staff_members?eq_email=rohit14101987@gmail.com`, {
            headers
        });
        const data = await res.json();
        console.log('HTTP Status:', res.status);
        if (res.status === 403) {
            console.log('✓ Success! Correctly blocked with 403 Forbidden.');
            console.log('Response Message:', data.error);
        } else {
            console.error('❌ Security Vulnerability! Allowed to view other staff profiles without permissions.', data);
        }
    } catch (e) {
        console.error('Test 2 error:', e.message);
    }

    console.log('\n=== SELF-ACCESS BYPASS SECURITY TESTS COMPLETE ===');
}

run();
