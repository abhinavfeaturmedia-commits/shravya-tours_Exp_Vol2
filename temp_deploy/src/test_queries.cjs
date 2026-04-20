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
        
        console.log("Testing bookings-with-package query...");
        try {
            const [rows] = await pool.query(`
                SELECT b.*, p.title as package_title 
                FROM bookings b 
                LEFT JOIN packages p ON b.package_id = p.id 
                ORDER BY b.created_at DESC
            `);
            console.log("Query Success! Rows:", rows.length);
        } catch (e) {
            console.log("Query ERROR:", e.message);
        }
        
        console.log("\nTesting lead_logs query...");
        try {
            const [rows] = await pool.query('SELECT * FROM lead_logs ORDER BY timestamp DESC');
            console.log("Lead Logs Success");
        } catch(e) {
            console.log("Lead Logs ERROR:", e.message);
        }

        process.exit(0);
    } catch (e) {
        console.error("Connection ERROR:", e.message);
        process.exit(1);
    }
}
check();
