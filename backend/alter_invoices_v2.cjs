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
        console.log("Altering invoices table v2...");
        await pool.query(`
            ALTER TABLE invoices 
            ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'Unpaid',
            ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS billed_by_name VARCHAR(255),
            ADD COLUMN IF NOT EXISTS billed_by_address TEXT,
            ADD COLUMN IF NOT EXISTS billed_by_email VARCHAR(255),
            ADD COLUMN IF NOT EXISTS billed_by_phone VARCHAR(50),
            ADD COLUMN IF NOT EXISTS billed_by_gst VARCHAR(50);
        `);
        console.log("Altered invoices table successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Error altering table:", err);
        process.exit(1);
    }
}

alterInvoices();
