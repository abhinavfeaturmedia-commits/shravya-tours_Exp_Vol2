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
        const [bookings] = await pool.query('SELECT id, customer_name, assigned_to FROM bookings ORDER BY created_at DESC LIMIT 10');
        console.log('Bookings:', bookings);

        const [staff] = await pool.query('SELECT id, name, email, user_type FROM staff_members WHERE name LIKE "%Manali%"');
        console.log('Manali Staff:', staff);

        const [leads] = await pool.query('SELECT id, name, assigned_to FROM leads WHERE name = "Bradley Farnandes" OR name = "Sheetal"');
        console.log('Leads:', leads);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
