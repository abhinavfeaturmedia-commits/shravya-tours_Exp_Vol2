const mysql = require('mysql2/promise');
require('dotenv').config();

async function alterInvoices() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 30000
    });

    try {
        console.log("Altering invoices table...");
        await pool.query(`
            ALTER TABLE invoices 
            ADD COLUMN IF NOT EXISTS lead_id VARCHAR(255),
            ADD COLUMN IF NOT EXISTS customer_id VARCHAR(255);
        `);
        console.log("Altered invoices table successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Error altering table:", err);
        process.exit(1);
    }
}

alterInvoices();
