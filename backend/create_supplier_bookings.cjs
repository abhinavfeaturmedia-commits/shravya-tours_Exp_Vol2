const mysql = require('mysql2/promise');
require('dotenv').config();

async function createTable() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS supplier_bookings (
                id VARCHAR(64) PRIMARY KEY,
                booking_id VARCHAR(64) NOT NULL,
                vendor_id VARCHAR(64) NOT NULL,
                service_type VARCHAR(100),
                confirmation_number VARCHAR(100),
                cost DECIMAL(10,2) DEFAULT 0.00,
                paid_amount DECIMAL(10,2) DEFAULT 0.00,
                payment_status VARCHAR(50) DEFAULT 'Unpaid',
                booking_status VARCHAR(50) DEFAULT 'Pending',
                payment_due_date DATE NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX (booking_id),
                INDEX (vendor_id)
            )
        `);
        console.log('Successfully created supplier_bookings table.');
    } catch (err) {
        console.error('Error creating table:', err);
    } finally {
        pool.end();
    }
}
createTable();
