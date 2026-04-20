require('dotenv').config();
const mysql = require('mysql2/promise');

async function updateVendorsTableBlobs() {
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
            "ALTER TABLE vendors ADD COLUMN notes TEXT",
            "ALTER TABLE vendors ADD COLUMN transactions TEXT"
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
        console.log("Updated vendors schema with notes and transactions.");
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

updateVendorsTableBlobs();
