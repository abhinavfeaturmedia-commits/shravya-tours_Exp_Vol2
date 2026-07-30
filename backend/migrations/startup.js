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
        console.log('[Migration] inventory_slots table verified/created');

        // Clean up expired OTPs
        await pool.query(`DELETE FROM otp_tokens WHERE expires_at < NOW() - INTERVAL 1 HOUR`).catch(() => {});

        // Backfill missing customer names/emails in customer_memberships table from customers table
        await pool.query(`
            UPDATE customer_memberships cm
            JOIN customers c ON cm.customer_id = c.id
            SET 
                cm.customer_name = COALESCE(NULLIF(cm.customer_name, ''), c.name),
                cm.customer_email = COALESCE(NULLIF(cm.customer_email, ''), c.email)
            WHERE (cm.customer_name IS NULL OR cm.customer_name = '' OR cm.customer_email IS NULL OR cm.customer_email = '')
        `).catch(() => {});

        console.log('[Migration] All startup migrations completed successfully.');
    } catch (err) {
        console.error('[Migration Error]', err.message);
    }
}
