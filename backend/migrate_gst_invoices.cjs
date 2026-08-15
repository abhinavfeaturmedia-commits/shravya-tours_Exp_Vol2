const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
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
        console.log("Starting GST Invoicing migration on database:", process.env.DB_NAME);

        // 1. Create document_sequences table
        console.log("Creating document_sequences table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS document_sequences (
                id VARCHAR(64) PRIMARY KEY,
                doc_type VARCHAR(50) NOT NULL,
                financial_year VARCHAR(10) NOT NULL,
                prefix VARCHAR(20) NOT NULL,
                current_number INT NOT NULL DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_type_fy (doc_type, financial_year)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("document_sequences table ensured.");

        // 2. Add columns to invoices table
        console.log("Altering 'invoices' table to add GST fields...");
        const invoiceColumns = [
            "ADD COLUMN IF NOT EXISTS invoice_no VARCHAR(50) DEFAULT NULL",
            "ADD COLUMN IF NOT EXISTS financial_year VARCHAR(10) DEFAULT NULL",
            "ADD COLUMN IF NOT EXISTS sequence_number INT DEFAULT NULL",
            "ADD COLUMN IF NOT EXISTS is_locked TINYINT DEFAULT 0",
            "ADD COLUMN IF NOT EXISTS place_of_supply VARCHAR(100) DEFAULT 'Maharashtra'",
            "ADD COLUMN IF NOT EXISTS place_of_supply_code VARCHAR(10) DEFAULT '27'",
            "ADD COLUMN IF NOT EXISTS reverse_charge VARCHAR(10) DEFAULT 'No'",
            "ADD COLUMN IF NOT EXISTS original_invoice_id VARCHAR(255) DEFAULT NULL",
            "ADD COLUMN IF NOT EXISTS original_invoice_no VARCHAR(50) DEFAULT NULL",
            "ADD COLUMN IF NOT EXISTS credit_reason TEXT DEFAULT NULL",
            "ADD COLUMN IF NOT EXISTS copy_type VARCHAR(50) DEFAULT 'ORIGINAL FOR RECIPIENT'",
            "ADD COLUMN IF NOT EXISTS is_gst TINYINT DEFAULT 1",
            "ADD COLUMN IF NOT EXISTS client_gst VARCHAR(50) DEFAULT NULL",
            "ADD COLUMN IF NOT EXISTS gst_type VARCHAR(20) DEFAULT 'CGST_SGST'",
            "ADD COLUMN IF NOT EXISTS field_labels TEXT DEFAULT NULL"
        ];

        for (const colDef of invoiceColumns) {
            try {
                await pool.query(`ALTER TABLE invoices ${colDef}`);
            } catch (err) {
                if (!err.message?.includes('Duplicate column')) {
                    console.warn(`[Invoices Column Migration] Note: ${err.message}`);
                }
            }
        }

        // Add index on invoice_no if possible
        try {
            await pool.query("CREATE INDEX idx_invoices_no ON invoices (invoice_no)");
        } catch (e) { /* index may already exist */ }
        try {
            await pool.query("CREATE INDEX idx_invoices_doc_type ON invoices (document_type)");
        } catch (e) { /* index may already exist */ }

        console.log("Successfully altered 'invoices' table with all GST columns.");

        // 3. Add columns to invoice_items table (hsn_sac)
        console.log("Altering 'invoice_items' table for HSN/SAC code...");
        try {
            await pool.query("ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS hsn_sac VARCHAR(20) DEFAULT '9985'");
        } catch (e) { /* ignore */ }

        console.log("GST Invoicing database migration completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

runMigration();
