const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function runAttendanceMigration() {
    console.log('[Migration] Starting Attendance schema updates...');
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        // 1. Update attendance_logs with additional tracking columns
        const attCols = [
            "ADD COLUMN IF NOT EXISTS break_start_time DATETIME DEFAULT NULL",
            "ADD COLUMN IF NOT EXISTS total_break_minutes INT DEFAULT 0",
            "ADD COLUMN IF NOT EXISTS worked_minutes INT DEFAULT 0",
            "ADD COLUMN IF NOT EXISTS system_active_minutes INT DEFAULT 0",
            "ADD COLUMN IF NOT EXISTS is_late TINYINT(1) DEFAULT 0",
            "ADD COLUMN IF NOT EXISTS late_minutes INT DEFAULT 0",
            "ADD COLUMN IF NOT EXISTS overtime_minutes INT DEFAULT 0",
            "ADD COLUMN IF NOT EXISTS shift_name VARCHAR(100) DEFAULT 'General Shift'",
            "ADD COLUMN IF NOT EXISTS ip_address VARCHAR(100) DEFAULT NULL",
            "ADD COLUMN IF NOT EXISTS device_info VARCHAR(255) DEFAULT NULL",
            "ADD COLUMN IF NOT EXISTS regularization_status VARCHAR(50) DEFAULT 'None'",
            "ADD COLUMN IF NOT EXISTS regularization_reason TEXT DEFAULT NULL",
            "ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ];

        for (const colDef of attCols) {
            try {
                await pool.query(`ALTER TABLE attendance_logs ${colDef}`);
            } catch (e) {
                // Column might already exist or slight syntax variation
                console.warn(`[Attendance Migration] Note on column alteration:`, e.message);
            }
        }
        console.log('[Migration] attendance_logs columns verified.');

        // 2. Create attendance_breaks table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS attendance_breaks (
                id VARCHAR(64) PRIMARY KEY,
                attendance_id VARCHAR(255) NOT NULL,
                staff_id INT NOT NULL,
                break_type VARCHAR(50) DEFAULT 'Tea/Lunch',
                start_time DATETIME NOT NULL,
                end_time DATETIME DEFAULT NULL,
                duration_minutes INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_att_id (attendance_id),
                INDEX idx_staff_id (staff_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[Migration] attendance_breaks table verified/created.');

        // 3. Create staff_leaves table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS staff_leaves (
                id VARCHAR(64) PRIMARY KEY,
                staff_id INT NOT NULL,
                leave_type VARCHAR(50) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                days_count DECIMAL(4,1) NOT NULL DEFAULT 1.0,
                reason TEXT NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'Pending',
                approved_by INT DEFAULT NULL,
                approved_at DATETIME DEFAULT NULL,
                rejection_reason TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_leave_staff (staff_id),
                INDEX idx_leave_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[Migration] staff_leaves table verified/created.');

        // 4. Create attendance_settings table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS attendance_settings (
                id VARCHAR(64) PRIMARY KEY,
                shift_start VARCHAR(10) DEFAULT '09:30',
                shift_end VARCHAR(10) DEFAULT '18:30',
                grace_period_mins INT DEFAULT 15,
                half_day_hours DECIMAL(3,1) DEFAULT 4.5,
                full_day_hours DECIMAL(3,1) DEFAULT 8.0,
                work_days VARCHAR(100) DEFAULT 'Mon,Tue,Wed,Thu,Fri,Sat',
                auto_clockout_time VARCHAR(10) DEFAULT '23:59',
                ip_restriction_enabled TINYINT(1) DEFAULT 0,
                allowed_ips TEXT DEFAULT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Seed default attendance setting if not present
        await pool.query(`
            INSERT IGNORE INTO attendance_settings (id, shift_start, shift_end, grace_period_mins, half_day_hours, full_day_hours, work_days)
            VALUES ('default', '09:30', '18:30', 15, 4.5, 8.0, 'Mon,Tue,Wed,Thu,Fri,Sat')
        `);
        console.log('[Migration] attendance_settings table verified & seeded.');

        console.log('[Migration] Attendance migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('[Migration Error]:', err);
        process.exit(1);
    }
}

runAttendanceMigration();
