const mysql = require('mysql2/promise');
require('dotenv').config();

async function alterInvoiceItems() {
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
        console.log("Altering invoice_items table...");
        
        // 1. Add columns
        await pool.query(`
            ALTER TABLE invoice_items 
            ADD COLUMN IF NOT EXISTS date_from DATE,
            ADD COLUMN IF NOT EXISTS date_to DATE;
        `);
        console.log("Added date_from and date_to columns.");

        // 2. Data migration: migrate existing '||' formats
        console.log("Migrating existing data...");
        const [rows] = await pool.query('SELECT id, description FROM invoice_items WHERE description LIKE "%||%"');
        
        for (const row of rows) {
            const parts = (row.description || '').split('||');
            const desc = parts[0] || '';
            const dateFrom = parts[1] || null;
            const dateTo = parts[2] || null;

            await pool.query(
                'UPDATE invoice_items SET description = ?, date_from = ?, date_to = ? WHERE id = ?',
                [desc, dateFrom, dateTo, row.id]
            );
        }
        
        console.log(`Migrated ${rows.length} rows.`);
        console.log("Altered invoice_items successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Error altering table:", err);
        process.exit(1);
    }
}

alterInvoiceItems();
