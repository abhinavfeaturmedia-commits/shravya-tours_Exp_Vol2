require('dotenv').config();
const mysql = require('mysql2/promise');

async function ensureAssignedToColumn() {
    console.log('Connecting to database:', process.env.DB_HOST);
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
        await pool.query('ALTER TABLE leads ADD COLUMN assigned_to INT NULL');
        console.log('Successfully added assigned_to column to leads table.');
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Column assigned_to already exists in leads table.');
        } else {
            console.error('Error altering table:', err.message);
        }
    } finally {
        await pool.end();
    }
}

ensureAssignedToColumn();
