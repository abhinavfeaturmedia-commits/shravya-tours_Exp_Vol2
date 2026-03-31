require('dotenv').config();
const mysql = require('mysql2/promise');

async function updateVendorsTable() {
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
        const queries = [
            "ALTER TABLE vendors ADD COLUMN sub_category VARCHAR(255)",
            "ALTER TABLE vendors ADD COLUMN contact_email VARCHAR(255)",
            "ALTER TABLE vendors ADD COLUMN contract_status VARCHAR(50) DEFAULT 'Active'",
            "ALTER TABLE vendors ADD COLUMN contract_expiry_date DATE",
            "ALTER TABLE vendors ADD COLUMN logo VARCHAR(500)",
            "ALTER TABLE vendors ADD COLUMN total_sales DECIMAL(10,2) DEFAULT 0",
            "ALTER TABLE vendors ADD COLUMN total_commission DECIMAL(10,2) DEFAULT 0",
            "ALTER TABLE vendors ADD COLUMN bank_details TEXT"
        ];

        for (const query of queries) {
            try {
                await pool.query(query);
                console.log(`Executed: ${query}`);
            } catch(e) {
                if (e.code === 'ER_DUP_FIELDNAME') {
                    console.log(`Column already exists: ${query}`);
                } else {
                    console.error(`Error on query ${query}:`, e.message);
                }
            }
        }
        console.log("Updated vendors schema.");
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

updateVendorsTable();
