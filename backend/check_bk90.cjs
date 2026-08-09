const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    const [rows] = await pool.query("SELECT * FROM bookings WHERE id = 'BK-0090' OR customer_name LIKE '%Sheela%'");
    console.log('BK-0090 BOOKING ROW:', JSON.stringify(rows, null, 2));

    const [pkgs] = await pool.query("SELECT id, title, days FROM packages WHERE title LIKE '%Bhandardara%'");
    console.log('PACKAGES FOR Bhandardara:', JSON.stringify(pkgs, null, 2));

    await pool.end();
}

run();
