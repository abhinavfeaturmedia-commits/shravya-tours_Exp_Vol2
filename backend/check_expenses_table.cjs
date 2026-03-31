require('dotenv').config();
const mysql = require('mysql2/promise');

async function ensureExpensesTable() {
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
        const query = `
            CREATE TABLE IF NOT EXISTS expenses (
                id VARCHAR(50) PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                category VARCHAR(50) NOT NULL,
                date DATE NOT NULL,
                paymentMethod VARCHAR(50) NOT NULL,
                status VARCHAR(50) NOT NULL,
                notes TEXT,
                receiptUrl VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `;
        await pool.query(query);
        console.log("Checked/created expenses table");
        
        // Let's also verify its columns
        const [columns] = await pool.query("SHOW COLUMNS FROM expenses");
        console.log("expenses table columns:", columns.map(c => c.Field));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

ensureExpensesTable();
