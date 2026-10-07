const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function migrate() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 5,
            connectTimeout: 30000,
        });

        await pool.query(`
            CREATE TABLE IF NOT EXISTS hotel_availability_requests (
                id VARCHAR(64) PRIMARY KEY,
                hotel_id VARCHAR(64) DEFAULT NULL,
                hotel_name VARCHAR(255) NOT NULL,
                hotel_email VARCHAR(255) DEFAULT NULL,
                hotel_phone VARCHAR(64) DEFAULT NULL,
                proposal_id VARCHAR(64) DEFAULT NULL,
                lead_id VARCHAR(64) DEFAULT NULL,
                guest_name VARCHAR(255) DEFAULT NULL,
                destination VARCHAR(255) DEFAULT NULL,
                check_in_date DATE DEFAULT NULL,
                check_out_date DATE DEFAULT NULL,
                room_category VARCHAR(128) DEFAULT NULL,
                room_count INT DEFAULT 1,
                meal_plan VARCHAR(64) DEFAULT 'CP (Breakfast)',
                adults INT DEFAULT 2,
                children INT DEFAULT 0,
                status VARCHAR(64) DEFAULT 'Pending',
                token VARCHAR(64) NOT NULL,
                hotel_notes TEXT DEFAULT NULL,
                agent_notes TEXT DEFAULT NULL,
                offered_alternative TEXT DEFAULT NULL,
                responded_by VARCHAR(255) DEFAULT NULL,
                responded_at DATETIME DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_token (token),
                INDEX idx_proposal (proposal_id),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('SUCCESS: hotel_availability_requests table created or verified.');
        const [rows] = await pool.query('DESCRIBE hotel_availability_requests');
        console.table(rows);
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
