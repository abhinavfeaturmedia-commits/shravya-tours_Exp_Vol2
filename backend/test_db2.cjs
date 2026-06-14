const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
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
        const [users] = await pool.query('SELECT id, email, role FROM users');
        console.log('Users:', users);

        const [staff] = await pool.query('SELECT id, name, email FROM staff_members');
        console.log('Staff:', staff);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();

