const mysql = require('mysql2/promise');
require('dotenv').config();

async function createTables() {
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
        console.log("Creating invoices table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS invoices (
                id VARCHAR(255) PRIMARY KEY,
                document_type VARCHAR(50) DEFAULT 'Invoice',
                booking_id VARCHAR(255),
                client_name VARCHAR(255),
                email VARCHAR(255),
                address TEXT,
                travel_dates VARCHAR(255),
                adults INT DEFAULT 0,
                children INT DEFAULT 0,
                subtotal DECIMAL(10,2) DEFAULT 0.00,
                discount DECIMAL(10,2) DEFAULT 0.00,
                tax_total DECIMAL(10,2) DEFAULT 0.00,
                total_amount DECIMAL(10,2) DEFAULT 0.00,
                status VARCHAR(50) DEFAULT 'Draft',
                issue_date DATE,
                due_date DATE,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log("Created invoices table.");

        console.log("Creating invoice_items table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS invoice_items (
                id VARCHAR(255) PRIMARY KEY,
                invoice_id VARCHAR(255),
                description TEXT,
                quantity INT DEFAULT 1,
                unit_price DECIMAL(10,2) DEFAULT 0.00,
                tax_rate DECIMAL(5,2) DEFAULT 0.00,
                tax_amount DECIMAL(10,2) DEFAULT 0.00,
                total DECIMAL(10,2) DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
            )
        `);
        console.log("Created invoice_items table.");

        console.log("Done.");
        process.exit(0);
    } catch (err) {
        console.error("Error creating tables:", err);
        process.exit(1);
    }
}

createTables();
