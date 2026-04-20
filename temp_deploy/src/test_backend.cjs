const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './.env' });

async function test() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    // Simulate admin login token
    const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
    const adminToken = jwt.sign({ id: 999, email: 'admin@shravyatours.com', role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
    
    console.log('Admin JWT Token:', adminToken);
    console.log('\nTest this URL manually:');
    console.log('curl -X DELETE http://localhost:3001/api/crud/bookings/BOOKING_ID -H "Authorization: Bearer ' + adminToken + '"');
    
    // Check if backend is running on port 3001
    const http = require('http');
    const req = http.request({ host: 'localhost', port: 3001, path: '/api/health', method: 'GET' }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log('\nBackend health check response:', res.statusCode, data);
            process.exit(0);
        });
    });
    req.on('error', (e) => {
        console.error('\nBackend NOT running on localhost:3001:', e.message);
        console.log('You need to restart the backend with: node index.js');
        process.exit(1);
    });
    req.end();
}

test().catch(e => { console.error(e); process.exit(1); });
