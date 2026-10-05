const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
    console.log('=== CREATING HR GRIEVANCES TABLE & ADDING LEAVE APPROVER COLUMNS ===');
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 1,
    });

    try {
        // 1. Create hr_grievances table for confidential escalation bypassing immediate supervisors
        await pool.query(`
            CREATE TABLE IF NOT EXISTS hr_grievances (
                id VARCHAR(64) PRIMARY KEY,
                ticket_number VARCHAR(50) NOT NULL UNIQUE,
                staff_id INT NOT NULL,
                staff_name VARCHAR(255) NOT NULL,
                staff_email VARCHAR(255) NOT NULL,
                department VARCHAR(100) NULL,
                category VARCHAR(100) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                details TEXT NOT NULL,
                is_anonymous BOOLEAN DEFAULT FALSE,
                status VARCHAR(50) DEFAULT 'Submitted',
                assigned_to_name VARCHAR(255) DEFAULT 'HR Head / Founder',
                resolution_notes TEXT NULL,
                resolved_by INT NULL,
                resolved_at DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ hr_grievances table created/verified');

        // 2. Add assigned_manager_id to staff_leaves if missing
        try {
            await pool.query(`ALTER TABLE staff_leaves ADD COLUMN assigned_manager_id INT NULL AFTER approved_by`);
            console.log('✓ added assigned_manager_id to staff_leaves');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('✓ assigned_manager_id already exists in staff_leaves');
            } else {
                console.warn('Note on assigned_manager_id:', e.message);
            }
        }

        console.log('=== MIGRATION COMPLETE ===');
    } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
