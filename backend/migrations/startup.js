/**
 * Migration Runner Module
 * 
 * Extracted from index.js — contains all inline schema migrations
 * (CREATE TABLE IF NOT EXISTS, ALTER TABLE ADD COLUMN IF NOT EXISTS).
 * 
 * Usage in index.js:
 *   import { runStartupMigrations } from './migrations/startup.js';
 *   await runStartupMigrations(pool);
 */

export async function runStartupMigrations(pool) {
    try {
        // ─── Multi-Staff Assignment for Leads & Bookings ───
        try {
            await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_staff_ids JSON DEFAULT NULL`);
        } catch (e) {
            try { await pool.query(`ALTER TABLE leads ADD COLUMN assigned_staff_ids JSON DEFAULT NULL`); } catch (_) {}
        }
        try {
            await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS assigned_staff_ids JSON DEFAULT NULL`);
        } catch (e) {
            try { await pool.query(`ALTER TABLE bookings ADD COLUMN assigned_staff_ids JSON DEFAULT NULL`); } catch (_) {}
        }
        // One-time backfill: if assigned_to is set and assigned_staff_ids is empty/null, initialize as JSON_ARRAY(assigned_to)
        try {
            await pool.query(`UPDATE leads SET assigned_staff_ids = JSON_ARRAY(assigned_to) WHERE assigned_to IS NOT NULL AND (assigned_staff_ids IS NULL OR assigned_staff_ids = '[]')`);
            await pool.query(`UPDATE bookings SET assigned_staff_ids = JSON_ARRAY(assigned_to) WHERE assigned_to IS NOT NULL AND (assigned_staff_ids IS NULL OR assigned_staff_ids = '[]')`);
            console.log('[Migration] Multi-staff assignment columns verified and backfilled for leads and bookings');
        } catch (err) {
            console.warn('[Migration] Multi-staff backfill notice:', err.message);
        }

        // ─── Enhanced Audit Log Columns (Entity & Staff Accountability) ───
        try {
            await pool.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS staff_id INT DEFAULT NULL`);
            await pool.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS staff_name VARCHAR(255) DEFAULT NULL`);
            await pool.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50) DEFAULT NULL`);
            await pool.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id VARCHAR(100) DEFAULT NULL`);
            await pool.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS changes JSON DEFAULT NULL`);
        } catch (e) {
            try { await pool.query(`ALTER TABLE audit_logs ADD COLUMN staff_id INT DEFAULT NULL`); } catch (_) {}
            try { await pool.query(`ALTER TABLE audit_logs ADD COLUMN staff_name VARCHAR(255) DEFAULT NULL`); } catch (_) {}
            try { await pool.query(`ALTER TABLE audit_logs ADD COLUMN entity_type VARCHAR(50) DEFAULT NULL`); } catch (_) {}
            try { await pool.query(`ALTER TABLE audit_logs ADD COLUMN entity_id VARCHAR(100) DEFAULT NULL`); } catch (_) {}
            try { await pool.query(`ALTER TABLE audit_logs ADD COLUMN changes JSON DEFAULT NULL`); } catch (_) {}
        }
        try {
            await pool.query(`ALTER TABLE audit_logs ADD INDEX IF NOT EXISTS idx_audit_entity (entity_type, entity_id)`);
        } catch (_) {}
        try {
            await pool.query(`ALTER TABLE audit_logs ADD INDEX IF NOT EXISTS idx_audit_staff (staff_id)`);
        } catch (_) {}
        console.log('[Migration] audit_logs table columns verified/added: staff_id, staff_name, entity_type, entity_id, changes');

        // ─── Tasks: source tracking columns ───
        await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'playbook'`);
        await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_by VARCHAR(100) DEFAULT NULL`);
        await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completion_note TEXT DEFAULT NULL`);
        await pool.query(`UPDATE tasks SET source = 'manual' WHERE description = 'Manually added checklist task' AND source = 'playbook'`);
        console.log('[Migration] tasks table columns verified/added: source, completed_by, completion_note');

        // ─── Membership Plans: homepage visibility ───
        await pool.query(`ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS show_on_homepage TINYINT(1) NOT NULL DEFAULT 0`);
        console.log('[Migration] membership_plans.show_on_homepage column verified/added');

        // ─── Car Rental Bookings: extra columns ───
        await pool.query(`ALTER TABLE car_bookings ADD COLUMN IF NOT EXISTS days INT NOT NULL DEFAULT 1`);
        await pool.query(`ALTER TABLE car_bookings ADD COLUMN IF NOT EXISTS lead_id VARCHAR(64) DEFAULT NULL`);
        console.log('[Migration] car_bookings extra columns verified/added');

        // ─── Customer Packing Checklists ───
        await pool.query(`
            CREATE TABLE IF NOT EXISTS customer_packing_checklists (
                id VARCHAR(64) PRIMARY KEY,
                booking_id VARCHAR(64) NOT NULL,
                customer_email VARCHAR(255) NOT NULL,
                items LONGTEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('[Migration] customer_packing_checklists table verified/created');

        // ─── Booking Purchased Add-ons ───
        await pool.query(`
            CREATE TABLE IF NOT EXISTS booking_purchased_addons (
                id VARCHAR(64) PRIMARY KEY,
                booking_id VARCHAR(64) NOT NULL,
                addon_id VARCHAR(64) NOT NULL,
                label VARCHAR(255) NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'Pending Payment',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('[Migration] booking_purchased_addons table verified/created');

        // ─── Booking Daily Deliverables ───
        await pool.query(`
            CREATE TABLE IF NOT EXISTS booking_daily_deliverables (
                id VARCHAR(64) PRIMARY KEY,
                booking_id VARCHAR(64) NOT NULL,
                day_number INT NOT NULL,
                item_name VARCHAR(255) NOT NULL,
                item_type VARCHAR(50) NOT NULL DEFAULT 'other',
                scheduled_time VARCHAR(50) DEFAULT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'Pending',
                notes TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_booking_day (booking_id, day_number)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[Migration] booking_daily_deliverables table verified/created');

        // ─── OTP Tokens for forgot-password ───
        await pool.query(`
            CREATE TABLE IF NOT EXISTS otp_tokens (
                id VARCHAR(64) PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                portal ENUM('admin','partner','customer') NOT NULL,
                otp_hash VARCHAR(255) NOT NULL,
                reset_session_token VARCHAR(128) DEFAULT NULL,
                session_token_expires DATETIME DEFAULT NULL,
                expires_at DATETIME NOT NULL,
                used TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_otp_email_portal (email, portal),
                INDEX idx_otp_session_token (reset_session_token)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[Migration] otp_tokens table verified/created');

        // ─── Car Rental Master Tables ───
        await pool.query(`
            CREATE TABLE IF NOT EXISTS vehicle_categories (
                id VARCHAR(64) PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                rate_per_km DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                min_km INT NOT NULL DEFAULT 0,
                driver_allowance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                night_charge DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                extra_km_rate DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                extra_hour_rate DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                waiting_charges DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                airport_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                permit_charges DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                gst_percent DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
                passenger_capacity INT NOT NULL DEFAULT 4,
                luggage_capacity INT NOT NULL DEFAULT 2,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS vehicles (
                id VARCHAR(64) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                registration_number VARCHAR(50) UNIQUE NOT NULL,
                category_id VARCHAR(64) NOT NULL,
                ownership VARCHAR(20) NOT NULL DEFAULT 'Owned',
                vendor_id VARCHAR(64) DEFAULT NULL,
                model_year INT DEFAULT NULL,
                fuel_type VARCHAR(20) DEFAULT NULL,
                transmission VARCHAR(20) DEFAULT NULL,
                fastag_number VARCHAR(50) DEFAULT NULL,
                current_odometer INT NOT NULL DEFAULT 0,
                status VARCHAR(20) NOT NULL DEFAULT 'Available',
                notes TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS drivers (
                id VARCHAR(64) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                mobile VARCHAR(50) UNIQUE NOT NULL,
                license_number VARCHAR(50) NOT NULL,
                license_expiry DATE NOT NULL,
                badge_number VARCHAR(50) DEFAULT NULL,
                police_verification VARCHAR(50) DEFAULT 'Pending',
                languages VARCHAR(255) DEFAULT NULL,
                assigned_vehicle_id VARCHAR(64) DEFAULT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'Available',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS car_bookings (
                id VARCHAR(64) PRIMARY KEY,
                customer_id VARCHAR(255) NOT NULL,
                customer_name VARCHAR(255) NOT NULL,
                customer_email VARCHAR(255) NOT NULL,
                customer_mobile VARCHAR(50) NOT NULL,
                pickup_location VARCHAR(255) NOT NULL,
                drop_location VARCHAR(255) NOT NULL,
                pickup_date DATE NOT NULL,
                pickup_time TIME NOT NULL,
                trip_type VARCHAR(50) NOT NULL,
                vehicle_category_id VARCHAR(64) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'Confirmed',
                assigned_vehicle_id VARCHAR(64) DEFAULT NULL,
                assigned_driver_id VARCHAR(64) DEFAULT NULL,
                assigned_vendor_id VARCHAR(64) DEFAULT NULL,
                base_fare DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                estimated_km INT NOT NULL DEFAULT 0,
                days INT NOT NULL DEFAULT 1,
                lead_id VARCHAR(64) DEFAULT NULL,
                driver_allowance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                night_charges DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                toll_charges DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                parking_charges DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                permit_charges DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                gst_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                vendor_cost DECIMAL(10, 2) DEFAULT 0.00,
                notes TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS car_booking_payments (
                id VARCHAR(64) PRIMARY KEY,
                booking_id VARCHAR(64) NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                payment_date DATE NOT NULL,
                payment_method VARCHAR(50) NOT NULL,
                transaction_reference VARCHAR(100) DEFAULT NULL,
                type VARCHAR(20) NOT NULL DEFAULT 'Payment',
                status VARCHAR(20) NOT NULL DEFAULT 'Verified',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS car_reviews (
                id VARCHAR(64) PRIMARY KEY,
                booking_id VARCHAR(64) NOT NULL,
                driver_rating INT NOT NULL DEFAULT 5,
                vehicle_rating INT NOT NULL DEFAULT 5,
                cleanliness_rating INT NOT NULL DEFAULT 5,
                overall_rating INT NOT NULL DEFAULT 5,
                comments TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('[Migration] Car rental management tables verified/created');

        // ─── Inventory Slots ───
        await pool.query(`
            CREATE TABLE IF NOT EXISTS inventory_slots (
                id VARCHAR(128) PRIMARY KEY,
                date VARCHAR(20) NOT NULL,
                asset_id VARCHAR(64) NOT NULL DEFAULT 'all',
                asset_type VARCHAR(20) NOT NULL DEFAULT 'Tour',
                is_blocked TINYINT(1) NOT NULL DEFAULT 0,
                price DECIMAL(10, 2) NOT NULL DEFAULT 0,
                capacity INT NOT NULL DEFAULT 0,
                booked INT NOT NULL DEFAULT 0,
                notes TEXT DEFAULT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_date_asset (date, asset_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        // ─── Attendance & Sessions Tables & Column Migrations ───
        await pool.query(`
            CREATE TABLE IF NOT EXISTS attendance_logs (
                id VARCHAR(64) PRIMARY KEY,
                staff_id INT NOT NULL,
                date DATE NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'Present',
                first_login_time DATETIME DEFAULT NULL,
                check_in_time DATETIME DEFAULT NULL,
                check_out_time DATETIME DEFAULT NULL,
                break_start_time DATETIME DEFAULT NULL,
                total_break_minutes INT NOT NULL DEFAULT 0,
                worked_minutes INT NOT NULL DEFAULT 0,
                active_minutes INT NOT NULL DEFAULT 0,
                idle_minutes INT NOT NULL DEFAULT 0,
                system_minutes INT NOT NULL DEFAULT 0,
                overtime_minutes INT NOT NULL DEFAULT 0,
                is_late TINYINT(1) NOT NULL DEFAULT 0,
                late_minutes INT NOT NULL DEFAULT 0,
                login_count INT NOT NULL DEFAULT 1,
                auto_clocked_in TINYINT(1) NOT NULL DEFAULT 0,
                auto_clocked_out TINYINT(1) NOT NULL DEFAULT 0,
                last_activity_time DATETIME DEFAULT NULL,
                shift_name VARCHAR(100) DEFAULT 'General Shift',
                location VARCHAR(255) DEFAULT NULL,
                ip_address VARCHAR(100) DEFAULT NULL,
                device_info VARCHAR(255) DEFAULT NULL,
                notes TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uk_staff_date (staff_id, date),
                INDEX idx_date_status (date, status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS attendance_breaks (
                id VARCHAR(64) PRIMARY KEY,
                attendance_id VARCHAR(64) NOT NULL,
                staff_id INT NOT NULL,
                break_type VARCHAR(50) NOT NULL DEFAULT 'Tea/Lunch',
                start_time DATETIME NOT NULL,
                end_time DATETIME DEFAULT NULL,
                duration_minutes INT NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_attendance (attendance_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS attendance_sessions (
                id VARCHAR(64) PRIMARY KEY,
                attendance_id VARCHAR(64) NOT NULL,
                staff_id INT NOT NULL,
                session_number INT NOT NULL DEFAULT 1,
                session_start DATETIME NOT NULL,
                session_end DATETIME DEFAULT NULL,
                last_ping_time DATETIME NOT NULL,
                active_minutes INT NOT NULL DEFAULT 0,
                idle_minutes INT NOT NULL DEFAULT 0,
                system_minutes INT NOT NULL DEFAULT 0,
                login_type VARCHAR(50) NOT NULL DEFAULT 'web_login',
                logout_type VARCHAR(50) DEFAULT NULL,
                ip_address VARCHAR(100) DEFAULT NULL,
                device_info VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_attendance (attendance_id),
                INDEX idx_staff_date (staff_id, session_start)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS staff_leaves (
                id VARCHAR(64) PRIMARY KEY,
                staff_id INT NOT NULL,
                leave_type VARCHAR(50) NOT NULL DEFAULT 'Casual',
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                days_count DECIMAL(4, 1) NOT NULL DEFAULT 1.0,
                reason TEXT NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'Pending',
                approved_by INT DEFAULT NULL,
                approval_date DATETIME DEFAULT NULL,
                rejection_reason TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_staff_status (staff_id, status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS attendance_settings (
                id VARCHAR(32) PRIMARY KEY DEFAULT 'default',
                shift_start VARCHAR(10) NOT NULL DEFAULT '09:30',
                shift_end VARCHAR(10) NOT NULL DEFAULT '18:30',
                grace_period_mins INT NOT NULL DEFAULT 15,
                half_day_hours DECIMAL(3, 1) NOT NULL DEFAULT 4.5,
                full_day_hours DECIMAL(3, 1) NOT NULL DEFAULT 8.0,
                work_days VARCHAR(100) NOT NULL DEFAULT 'Mon,Tue,Wed,Thu,Fri,Sat',
                auto_clockout_time VARCHAR(10) NOT NULL DEFAULT '23:59',
                auto_clockin_on_login TINYINT(1) NOT NULL DEFAULT 1,
                idle_threshold_seconds INT NOT NULL DEFAULT 180,
                auto_clockout_idle_minutes INT NOT NULL DEFAULT 60,
                ip_restriction_enabled TINYINT(1) NOT NULL DEFAULT 0,
                allowed_ips TEXT DEFAULT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await pool.query(`
            INSERT IGNORE INTO attendance_settings (id, shift_start, shift_end, grace_period_mins, half_day_hours, full_day_hours, work_days, auto_clockout_time, auto_clockin_on_login, idle_threshold_seconds, auto_clockout_idle_minutes, ip_restriction_enabled)
            VALUES ('default', '09:30', '18:30', 15, 4.5, 8.0, 'Mon,Tue,Wed,Thu,Fri,Sat', '23:59', 1, 180, 60, 0)
        `);

        // Safely add missing columns to attendance_logs if existing table
        try {
            const [logCols] = await pool.query("SHOW COLUMNS FROM attendance_logs");
            const logColNames = logCols.map(c => c.Field);
            if (!logColNames.includes('first_login_time')) await pool.query("ALTER TABLE attendance_logs ADD COLUMN first_login_time DATETIME DEFAULT NULL AFTER status").catch(() => {});
            if (!logColNames.includes('active_minutes')) await pool.query("ALTER TABLE attendance_logs ADD COLUMN active_minutes INT NOT NULL DEFAULT 0 AFTER worked_minutes").catch(() => {});
            if (!logColNames.includes('idle_minutes')) await pool.query("ALTER TABLE attendance_logs ADD COLUMN idle_minutes INT NOT NULL DEFAULT 0 AFTER active_minutes").catch(() => {});
            if (!logColNames.includes('system_minutes')) await pool.query("ALTER TABLE attendance_logs ADD COLUMN system_minutes INT NOT NULL DEFAULT 0 AFTER idle_minutes").catch(() => {});
            if (!logColNames.includes('login_count')) await pool.query("ALTER TABLE attendance_logs ADD COLUMN login_count INT NOT NULL DEFAULT 1 AFTER late_minutes").catch(() => {});
            if (!logColNames.includes('auto_clocked_in')) await pool.query("ALTER TABLE attendance_logs ADD COLUMN auto_clocked_in TINYINT(1) NOT NULL DEFAULT 0 AFTER login_count").catch(() => {});
            if (!logColNames.includes('auto_clocked_out')) await pool.query("ALTER TABLE attendance_logs ADD COLUMN auto_clocked_out TINYINT(1) NOT NULL DEFAULT 0 AFTER auto_clocked_in").catch(() => {});
            if (!logColNames.includes('last_activity_time')) await pool.query("ALTER TABLE attendance_logs ADD COLUMN last_activity_time DATETIME DEFAULT NULL AFTER auto_clocked_out").catch(() => {});
            if (!logColNames.includes('requested_check_in')) await pool.query("ALTER TABLE attendance_logs ADD COLUMN requested_check_in DATETIME DEFAULT NULL AFTER last_activity_time").catch(() => {});
            if (!logColNames.includes('requested_check_out')) await pool.query("ALTER TABLE attendance_logs ADD COLUMN requested_check_out DATETIME DEFAULT NULL AFTER requested_check_in").catch(() => {});
            if (!logColNames.includes('regularization_status')) await pool.query("ALTER TABLE attendance_logs ADD COLUMN regularization_status VARCHAR(50) DEFAULT 'None' AFTER requested_check_out").catch(() => {});
            if (!logColNames.includes('regularization_reason')) await pool.query("ALTER TABLE attendance_logs ADD COLUMN regularization_reason TEXT DEFAULT NULL AFTER regularization_status").catch(() => {});
            if (!logColNames.includes('regularization_approved_by')) await pool.query("ALTER TABLE attendance_logs ADD COLUMN regularization_approved_by INT DEFAULT NULL AFTER regularization_reason").catch(() => {});
            if (!logColNames.includes('regularization_approved_at')) await pool.query("ALTER TABLE attendance_logs ADD COLUMN regularization_approved_at DATETIME DEFAULT NULL AFTER regularization_approved_by").catch(() => {});
        } catch (e) {
            console.warn('[Migration Log Columns Error]', e.message);
        }

        // Safely add missing columns to staff_leaves
        try {
            const [leaveCols] = await pool.query("SHOW COLUMNS FROM staff_leaves");
            const leaveColNames = leaveCols.map(c => c.Field);
            if (!leaveColNames.includes('rejection_reason')) await pool.query("ALTER TABLE staff_leaves ADD COLUMN rejection_reason TEXT DEFAULT NULL").catch(() => {});
            if (!leaveColNames.includes('approved_by')) await pool.query("ALTER TABLE staff_leaves ADD COLUMN approved_by INT DEFAULT NULL").catch(() => {});
            if (!leaveColNames.includes('approval_date')) await pool.query("ALTER TABLE staff_leaves ADD COLUMN approval_date DATETIME DEFAULT NULL").catch(() => {});
            // Consolidate legacy merged staff ID 1006 -> 29
            await pool.query("UPDATE staff_leaves SET staff_id = 29 WHERE staff_id = 1006").catch(() => {});
        } catch (e) {
            console.warn('[Migration Leave Columns Error]', e.message);
        }

        // Safely add missing columns to attendance_settings
        try {
            const [settingCols] = await pool.query("SHOW COLUMNS FROM attendance_settings");
            const settingColNames = settingCols.map(c => c.Field);
            if (!settingColNames.includes('auto_clockin_on_login')) await pool.query("ALTER TABLE attendance_settings ADD COLUMN auto_clockin_on_login TINYINT(1) NOT NULL DEFAULT 1").catch(() => {});
            if (!settingColNames.includes('idle_threshold_seconds')) await pool.query("ALTER TABLE attendance_settings ADD COLUMN idle_threshold_seconds INT NOT NULL DEFAULT 180").catch(() => {});
            if (!settingColNames.includes('auto_clockout_idle_minutes')) await pool.query("ALTER TABLE attendance_settings ADD COLUMN auto_clockout_idle_minutes INT NOT NULL DEFAULT 5").catch(() => {});
        } catch (e) {
            console.warn('[Migration Settings Columns Error]', e.message);
        }

        console.log('[Migration] Attendance and sessions schema verified/migrated');

        console.log('[Migration] All startup migrations completed successfully.');
    } catch (err) {
        console.error('[Migration Error]', err.message);
    }
}
