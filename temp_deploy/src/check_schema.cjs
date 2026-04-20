const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function check() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });

        console.log("=== BOOKINGS ===");
        const [b] = await pool.query('SHOW CREATE TABLE bookings');
        console.log(b[0]['Create Table']);
        
        console.log("\n=== TOURS ===");
        try {
            const [t] = await pool.query('SHOW CREATE TABLE tours');
            console.log(t[0]['Create Table']);
        } catch(e) { console.log('No tours table'); }

        console.log("\n=== AUDIT_LOGS ===");
        try {
            const [a] = await pool.query('SHOW CREATE TABLE audit_logs');
            console.log(a[0]['Create Table']);
        } catch(e) { console.log('No audit_logs table'); }

        process.exit(0);
    } catch(e) {
        console.log("Error:", e.message);
        process.exit(1);
    }
}
check();
