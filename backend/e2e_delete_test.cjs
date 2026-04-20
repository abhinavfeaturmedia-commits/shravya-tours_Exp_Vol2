const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const http = require('http');
require('dotenv').config({ path: './.env' });

async function testDelete() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    // 1. Create a test booking
    const testId = 'TEST-DELETE-' + Date.now();
    await pool.query('INSERT INTO bookings (id, customer_name, status) VALUES (?, ?, ?)', [testId, 'Test Delete User', 'pending']);
    console.log('Created test booking:', testId);

    // 2. Generate admin JWT
    const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
    const adminToken = jwt.sign({ id: 999, email: 'admin@shravyatours.com', role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });

    // 3. Call DELETE via HTTP
    const result = await new Promise((resolve, reject) => {
        const options = {
            host: 'localhost',
            port: 3001,
            path: `/api/crud/bookings/${testId}`,
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

    console.log('\nDELETE API response:');
    console.log('  Status:', result.status);
    console.log('  Body:', result.body);

    // 4. Verify it's gone from DB
    const [rows] = await pool.query('SELECT id FROM bookings WHERE id = ?', [testId]);
    if (rows.length === 0) {
        console.log('\n✅ SUCCESS: Booking was deleted from database!');
    } else {
        console.log('\n❌ FAILURE: Booking still exists in database!');
    }

    await pool.end();
    process.exit(result.status === 200 ? 0 : 1);
}

testDelete().catch(e => { console.error(e); process.exit(1); });
