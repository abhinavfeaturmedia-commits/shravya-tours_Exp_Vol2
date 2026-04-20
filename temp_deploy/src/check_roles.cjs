const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function check() {
    try {
        const pool = mysql.createPool({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
        const [rows] = await pool.query('SELECT DISTINCT role FROM users');
        console.log('Unique roles in users table:', rows);
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
check();
