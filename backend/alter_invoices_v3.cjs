const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from backend/.env or parent .env or .env.local
const pathsToTry = [
    path.join(__dirname, '.env'),
    path.join(__dirname, '..', '.env.local'),
    path.join(__dirname, '..', '.env')
];

for (const envPath of pathsToTry) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        console.log(`Loaded environment from: ${envPath}`);
        break;
    }
}

async function runMigration() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        connectTimeout: 30000
    });

    try {
        console.log("Starting migration on database:", process.env.DB_NAME);

        // Alter invoices table
        console.log("Altering 'invoices' table to add premium charges...");
        await pool.query(`
            ALTER TABLE invoices 
            ADD COLUMN IF NOT EXISTS driver_stay_allowance DECIMAL(10,2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS extra_km_charges DECIMAL(10,2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS extra_hrs_charges DECIMAL(10,2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS advance_received DECIMAL(10,2) DEFAULT 0.00;
        `);
        console.log("Successfully altered 'invoices' table.");

        // Alter invoice_items table
        console.log("Altering 'invoice_items' table to add 'total_days_km' column...");
        await pool.query(`
            ALTER TABLE invoice_items 
            ADD COLUMN IF NOT EXISTS total_days_km VARCHAR(50) DEFAULT '1';
        `);
        console.log("Successfully altered 'invoice_items' table.");

        console.log("Database migration completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

runMigration();
