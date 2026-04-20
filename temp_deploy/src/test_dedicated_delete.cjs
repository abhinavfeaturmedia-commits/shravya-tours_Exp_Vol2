const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const http = require('http');
require('dotenv').config({ path: './.env' });

async function testDedicatedDelete() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    // 1. Create test booking (no transaction — FK issue with int id)
    const testId = 'TEST-DEDICATED-' + Date.now();
    await pool.query('INSERT INTO bookings (id, customer_name, status) VALUES (?, ?, ?)', [testId, 'Test User Dedicated', 'pending']);
    console.log('✓ Created test booking:', testId);

    // 2. Generate admin JWT
    const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
    const adminToken = jwt.sign({ id: 999, email: 'admin@shravyatours.com', role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });

    // 3. Call the NEW dedicated DELETE endpoint
    const result = await new Promise((resolve, reject) => {
        const options = {
            host: 'localhost',
            port: 3001,
            path: `/api/bookings/${encodeURIComponent(testId)}`,
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', reject);
        req.end();
    });

    console.log('\nDedicated DELETE endpoint response:');
    console.log('  Status:', result.status);
    console.log('  Body:', result.body);

    // 4. Verify completely gone from DB
    const [bookingRows] = await pool.query('SELECT id FROM bookings WHERE id = ?', [testId]);

    if (bookingRows.length === 0) {
        if (result.status === 200) {
            console.log('\n✅ FULL SUCCESS: Booking deleted from database via dedicated endpoint!');
        } else {
            console.log('\n⚠️  Endpoint returned non-200 but booking is gone');
        }
    } else {
        console.log('\n❌ FAILURE: Booking still exists in database!');
        console.log('   If status was 404, the backend may need restart to pick up new endpoint.');
    }

    if (result.status === 404 && result.body.includes('Cannot DELETE')) {
        console.log('\n⚠️  NOTE: Backend needs to be restarted to register the new /api/bookings/:id route!');
        console.log('   Stop the current backend and run: node index.js');
    }

    await pool.end();
    
    // Clean up if booking still exists
    if (bookingRows.length > 0) {
        const pool2 = mysql.createPool({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
        await pool2.query('DELETE FROM bookings WHERE id = ?', [testId]);
        await pool2.end();
    }
    
    process.exit(result.status === 200 ? 0 : 1);
}

testDedicatedDelete().catch(e => { console.error(e); process.exit(1); });
