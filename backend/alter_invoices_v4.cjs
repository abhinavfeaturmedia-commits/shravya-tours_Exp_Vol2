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

        // Alter invoices table to add balance_due
        console.log("Altering 'invoices' table to add 'balance_due'...");
        await pool.query(`
            ALTER TABLE invoices 
            ADD COLUMN IF NOT EXISTS balance_due DECIMAL(10,2) DEFAULT 0.00;
        `);
        console.log("Successfully altered 'invoices' table.");

        console.log("Database migration (v4) completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

runMigration();
