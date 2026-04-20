const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function check() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            connectTimeout: 10000,
        });
        console.log("=== BOOKINGS TABLE SCHEMA ===");
        const [schema] = await pool.query('DESCRIBE bookings');
        console.table(schema);
        
        console.log("\n=== BOOKINGS COUNT ===");
        const [count] = await pool.query('SELECT COUNT(*) as total FROM bookings');
        console.log("Total bookings:", count[0].total);
        
        console.log("\n=== DAILY_INVENTORY TABLE CHECK ===");
        try {
            const [inv] = await pool.query('DESCRIBE daily_inventory');
            console.table(inv);
        } catch (e) {
            console.log("daily_inventory table does NOT exist:", e.message);
        }
        
        await pool.end();
        process.exit(0);
    } catch (e) {
        console.error("ERROR:", e.message);
        process.exit(1);
    }
}
check();
