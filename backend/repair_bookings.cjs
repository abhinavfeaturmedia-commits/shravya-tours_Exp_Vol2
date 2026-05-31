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
        const [result] = await pool.query(`
            UPDATE bookings b
            JOIN leads l ON (b.customer_name = l.name OR b.customer_name LIKE CONCAT(l.name, '%'))
            SET b.assigned_to = l.assigned_to
            WHERE b.assigned_to IS NULL AND l.assigned_to IS NOT NULL
        `);
        console.log('Fixed bookings assigned_to using leads match:', result.affectedRows);
        
        // Also if any are still NULL but created by a specific user or something, we could try.
        // But for Manali's leads (Sheetal, Bradley Farnandes) this will fix it.
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
