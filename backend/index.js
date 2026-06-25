import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Redirect shrawello.com to shravyatours.com
app.use((req, res, next) => {
    const host = req.headers.host || '';
    if (host.includes('shrawello.com')) {
        return res.redirect(301, `https://shravyatours.com${req.originalUrl}`);
    }
    next();
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── File Upload Setup (Multer) ───
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        cb(null, allowed.includes(file.mimetype));
    }
});

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 30000, // 30 seconds for remote Hostinger DB
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
});

// ─── DB Migration: Add new task columns if not present ───
async function runMigration() {
    try {
        await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'playbook'`);
        await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_by VARCHAR(100) DEFAULT NULL`);
        await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completion_note TEXT DEFAULT NULL`);
        // Back-fill existing manual-style tasks (those with a description of 'Manually added checklist task')
        await pool.query(`UPDATE tasks SET source = 'manual' WHERE description = 'Manually added checklist task' AND source = 'playbook'`);
        console.log('[Migration] tasks table columns verified/added: source, completed_by, completion_note');
    } catch (err) {
        console.error('[Migration Error]', err.message);
    }
}

// Helper to save uploaded file to database
async function saveUploadedFileToDb(file) {
    try {
        const filePath = file.path;
        if (!fs.existsSync(filePath)) return;
        const fileData = fs.readFileSync(filePath);
        const id = crypto.randomBytes(16).toString('hex');
        await pool.query(
            'INSERT INTO uploaded_files (id, filename, mime_type, data) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data), mime_type = VALUES(mime_type)',
            [id, file.filename, file.mimetype, fileData]
        );
        console.log(`[Upload DB Sync] Saved ${file.filename} to database.`);
    } catch (err) {
        console.error('[Upload DB Sync Error]', err.message);
    }
}

// Helper to sync local files to DB on startup
async function syncLocalUploadsToDb() {
    try {
        if (!fs.existsSync(uploadsDir)) return;
        const files = fs.readdirSync(uploadsDir);
        console.log(`[Uploads Sync] Found ${files.length} files in local uploads directory.`);
        
        let syncedCount = 0;
        for (const file of files) {
            const filePath = path.join(uploadsDir, file);
            const stat = fs.statSync(filePath);
            if (!stat.isFile()) continue;

            const [rows] = await pool.query('SELECT id FROM uploaded_files WHERE filename = ?', [file]);
            if (rows.length === 0) {
                const fileData = fs.readFileSync(filePath);
                const id = crypto.randomBytes(16).toString('hex');
                const ext = path.extname(file).toLowerCase();
                let mimeType = 'image/jpeg';
                if (ext === '.png') mimeType = 'image/png';
                else if (ext === '.webp') mimeType = 'image/webp';
                else if (ext === '.gif') mimeType = 'image/gif';
                else if (ext === '.svg') mimeType = 'image/svg+xml';
                
                await pool.query(
                    'INSERT INTO uploaded_files (id, filename, mime_type, data) VALUES (?, ?, ?, ?)',
                    [id, file, mimeType, fileData]
                );
                syncedCount++;
            }
        }
        if (syncedCount > 0) {
            console.log(`[Uploads Sync] Successfully synced ${syncedCount} new local files to database.`);
        } else {
            console.log('[Uploads Sync] All local files are already synced with database.');
        }
    } catch (err) {
        console.error('[Uploads Sync Error]', err.message);
    }
}

// Helper to restore all files from database back to local disk cache on startup
async function syncDbUploadsToLocal() {
    try {
        const [rows] = await pool.query('SELECT filename, mime_type, data FROM uploaded_files');
        console.log(`[Uploads Restore] Found ${rows.length} files in database.`);
        
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        let restoredCount = 0;
        for (const row of rows) {
            const filePath = path.join(uploadsDir, row.filename);
            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, row.data);
                restoredCount++;
            }
        }
        if (restoredCount > 0) {
            console.log(`[Uploads Restore] Successfully restored ${restoredCount} files from database to disk.`);
        } else {
            console.log('[Uploads Restore] All database files are already present on disk.');
        }
    } catch (err) {
        console.error('[Uploads Restore Error]', err.message);
    }
}

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

// Ensure the users table exists (for auth)
async function ensureUsersTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'staff',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Users table ensured.');
        
        try {
            await pool.query('ALTER TABLE staff_members ADD COLUMN phone VARCHAR(50)');
            console.log('Added phone column to staff_members.');
        } catch(err) { /* already exists */ }

        // Ensure last_active column exists for login tracking
        try {
            await pool.query("ALTER TABLE staff_members ADD COLUMN last_active VARCHAR(100) DEFAULT 'Never'");
            console.log('Added last_active column to staff_members.');
        } catch(err) { /* already exists */ }

        // Ensure status column exists with proper default
        try {
            await pool.query("ALTER TABLE staff_members ADD COLUMN status VARCHAR(50) DEFAULT 'Active'");
            console.log('Added status column to staff_members.');
        } catch(err) { /* already exists */ }

        // Seed default admin user into users table if not present
        // This ensures admin@shravyatours.com can log in with a real password
        try {
            const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', ['admin@shravyatours.com']);
            if (existing.length === 0) {
                const adminHash = await bcrypt.hash('Shravya@2026', 10);
                await pool.query(
                    'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
                    ['admin@shravyatours.com', adminHash, 'admin']
                );
                console.log('Seeded default admin@shravyatours.com into users table (password: Shravya@2026).');
            }
        } catch (seedErr) {
            console.warn('Admin seed warning:', seedErr.message);
        }

        // Fix any existing Admin staff members whose users row has wrong role
        // (They were created with role='Editor'/'Agent' but should be 'admin')
        try {
            await pool.query(`
                UPDATE users u
                JOIN staff_members sm ON sm.email = u.email
                SET u.role = 'admin'
                WHERE sm.user_type = 'Admin' AND u.role != 'admin'
            `);
        } catch (fixErr) {
            console.warn('Role fix warning:', fixErr.message);
        }

    } catch (err) {
        console.error('Failed to ensure users table:', err.message);
    }
}
ensureUsersTable();

// Ensure audit_logs table has correct INT AUTO_INCREMENT id (not VARCHAR)
async function ensureAuditLogsSchema() {
    try {
        // Create if not exists with correct schema
        await pool.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                action VARCHAR(100),
                module VARCHAR(100),
                details TEXT,
                severity VARCHAR(50) DEFAULT 'Info',
                performed_by VARCHAR(255),
                timestamp VARCHAR(100)
            )
        `);
    } catch (err) {
        console.error('Failed to ensure audit_logs schema:', err.message);
    }
}
ensureAuditLogsSchema();

// Ensure packages table has the extra columns added after initial schema
async function migratePackagesColumns() {
    const alterations = [
        "ALTER TABLE packages ADD COLUMN IF NOT EXISTS addons LONGTEXT",
        "ALTER TABLE packages ADD COLUMN IF NOT EXISTS remaining_seats INT DEFAULT NULL",
        "ALTER TABLE packages ADD COLUMN IF NOT EXISTS itinerary_status VARCHAR(50) DEFAULT 'Draft'",
        "ALTER TABLE packages ADD COLUMN IF NOT EXISTS client_name VARCHAR(255) DEFAULT NULL",
        "ALTER TABLE packages ADD COLUMN IF NOT EXISTS client_id VARCHAR(255) DEFAULT NULL",
        "ALTER TABLE packages ADD COLUMN IF NOT EXISTS validity_date DATE DEFAULT NULL",
        "ALTER TABLE packages ADD COLUMN IF NOT EXISTS terms_and_conditions LONGTEXT DEFAULT NULL",
        // v2 fields — UI badges, pricing mode, offer price, highlights with icons, itinerary JSON
        "ALTER TABLE packages ADD COLUMN IF NOT EXISTS tag VARCHAR(100) DEFAULT NULL",
        "ALTER TABLE packages ADD COLUMN IF NOT EXISTS tag_color VARCHAR(100) DEFAULT NULL",
        "ALTER TABLE packages ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2) DEFAULT NULL",
        "ALTER TABLE packages ADD COLUMN IF NOT EXISTS pricing_mode VARCHAR(50) DEFAULT 'group'",
        "ALTER TABLE packages ADD COLUMN IF NOT EXISTS highlights LONGTEXT DEFAULT NULL",
        "ALTER TABLE packages ADD COLUMN IF NOT EXISTS itinerary LONGTEXT DEFAULT NULL",
        "ALTER TABLE packages ADD COLUMN IF NOT EXISTS partner_commission_type VARCHAR(50) DEFAULT NULL",
        "ALTER TABLE packages ADD COLUMN IF NOT EXISTS partner_commission_value DECIMAL(10,2) DEFAULT NULL",
        "ALTER TABLE packages ADD COLUMN IF NOT EXISTS gallery LONGTEXT DEFAULT NULL"
    ];
    for (const sql of alterations) {
        try {
            await pool.query(sql);
        } catch (err) {
            // Column already exists or DB doesn't support IF NOT EXISTS — safe to ignore
            if (!err.message?.includes('Duplicate column')) {
                console.warn('[Packages Migration] Skipped:', err.message?.split('\n')[0]);
            }
        }
    }
    console.log('[Packages Migration] Column check complete.');
}
migratePackagesColumns();

// Ensure leads.package_id column exists for package → lead linkage
async function migrateLeadsPackageId() {
    try {
        await pool.query("ALTER TABLE leads ADD COLUMN IF NOT EXISTS package_id VARCHAR(255) DEFAULT NULL");
        console.log('[Leads Migration] package_id column ensured.');
    } catch (err) {
        if (!err.message?.includes('Duplicate column')) {
            console.warn('[Leads Migration] package_id skipped:', err.message?.split('\n')[0]);
        }
    }
}
migrateLeadsPackageId();

// Ensure customers table has the new columns for extended customer profiles
async function migrateCustomersColumns() {
    const alterations = [
        { col: 'prefix', sql: "ALTER TABLE customers ADD COLUMN prefix VARCHAR(20) DEFAULT NULL" },
        { col: 'dob', sql: "ALTER TABLE customers ADD COLUMN dob VARCHAR(50) DEFAULT NULL" },
        { col: 'alt_phone', sql: "ALTER TABLE customers ADD COLUMN alt_phone VARCHAR(50) DEFAULT NULL" },
        { col: 'whatsapp', sql: "ALTER TABLE customers ADD COLUMN whatsapp VARCHAR(50) DEFAULT NULL" },
        { col: 'is_whatsapp_same', sql: "ALTER TABLE customers ADD COLUMN is_whatsapp_same BOOLEAN DEFAULT FALSE" },
        { col: 'address', sql: "ALTER TABLE customers ADD COLUMN address TEXT DEFAULT NULL" },
        { col: 'office_address', sql: "ALTER TABLE customers ADD COLUMN office_address TEXT DEFAULT NULL" }
    ];
    for (const alt of alterations) {
        try {
            await pool.query(alt.sql);
            console.log(`[Customers Migration] Added column ${alt.col} to customers.`);
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME' || err.message?.includes('Duplicate column') || err.message?.includes('already exists')) {
                // Column already exists, safe to ignore
            } else {
                console.warn(`[Customers Migration] Failed to add ${alt.col}:`, err.message?.split('\n')[0]);
            }
        }
    }
    console.log('[Customers Migration] Column check complete.');
}
migrateCustomersColumns();

// Ensure vendors table has services and documents columns
async function migrateVendorsColumns() {
    const alterations = [
        { col: 'services', sql: "ALTER TABLE vendors ADD COLUMN services LONGTEXT DEFAULT NULL" },
        { col: 'documents', sql: "ALTER TABLE vendors ADD COLUMN documents LONGTEXT DEFAULT NULL" }
    ];
    for (const alt of alterations) {
        try {
            await pool.query(alt.sql);
            console.log(`[Vendors Migration] Added column ${alt.col} to vendors.`);
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME' || err.message?.includes('Duplicate column') || err.message?.includes('already exists')) {
                // Column already exists, safe to ignore
            } else {
                console.warn(`[Vendors Migration] Failed to add ${alt.col}:`, err.message?.split('\n')[0]);
            }
        }
    }
    console.log('[Vendors Migration] Column check complete.');
}
migrateVendorsColumns();

// Ensure the settings table exists (key-value store for admin configuration)
async function ensureSettingsTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id VARCHAR(255) PRIMARY KEY,
                \`key\` VARCHAR(255) UNIQUE NOT NULL,
                value LONGTEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('Settings table ensured.');
    } catch (err) {
        console.error('Failed to ensure settings table:', err.message);
    }
}
ensureSettingsTable();

// ─── Migrate Staff Permissions (adds new permission keys to existing records) ───
// Runs on every startup. Non-destructive: only adds missing keys, never overwrites.
const NEW_PERMISSION_KEYS = ['operations', 'invoices', 'proposals', 'settings', 'cms', 'partners', 'memberships', 'testimonials'];
const DEFAULT_NEW_PERMISSION = { view: false, manage: false };

async function migrateStaffPermissions() {
    try {
        const [rows] = await pool.query('SELECT id, permissions FROM `staff_members`');
        let migratedCount = 0;
        for (const row of rows) {
            let perms = {};
            try {
                perms = typeof row.permissions === 'string'
                    ? JSON.parse(row.permissions)
                    : (row.permissions || {});
            } catch { perms = {}; }

            let changed = false;
            for (const key of NEW_PERMISSION_KEYS) {
                if (!(key in perms)) {
                    perms[key] = { ...DEFAULT_NEW_PERMISSION };
                    changed = true;
                }
            }

            if (changed) {
                await pool.query(
                    'UPDATE `staff_members` SET `permissions` = ? WHERE id = ?',
                    [JSON.stringify(perms), row.id]
                );
                migratedCount++;
            }
        }
        if (migratedCount > 0) {
            console.log(`[Permissions Migration] Updated ${migratedCount} staff record(s) with new permission keys: ${NEW_PERMISSION_KEYS.join(', ')}`);
        } else {
            console.log('[Permissions Migration] All staff records up to date.');
        }
    } catch (err) {
        console.error('[Permissions Migration] Failed:', err.message);
    }
}
migrateStaffPermissions();

// Ensure inventory table has the correct schema for V2 (Asset specific)
async function ensureInventoryTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS daily_inventory (
                id VARCHAR(255) PRIMARY KEY,
                date VARCHAR(50) NOT NULL,
                asset_id VARCHAR(255) NOT NULL,
                asset_type VARCHAR(50) NOT NULL,
                capacity INT DEFAULT 0,
                booked INT DEFAULT 0,
                is_blocked BOOLEAN DEFAULT false,
                price DECIMAL(10,2) DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_slot (date, asset_id)
            )
        `);
        console.log('Daily Inventory table ensured.');
    } catch (err) {
        console.error('Failed to ensure daily_inventory table:', err.message);
    }
}
ensureInventoryTable();


// ─── Live Operations Schema Migration ───
// Adds new columns to bookings/supplier_bookings and creates attendance_logs table
async function ensureLiveOpsSchema() {
    // 1. New columns on bookings table
    const bookingAlterations = [
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS duration_days INT DEFAULT NULL",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pax_count INT DEFAULT NULL",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pax_child INT DEFAULT 0",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS whatsapp_group_url VARCHAR(500) DEFAULT NULL",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS live_status VARCHAR(50) DEFAULT 'Live'",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50) DEFAULT NULL",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_whatsapp_same TINYINT(1) DEFAULT 1",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS alt_phone VARCHAR(50) DEFAULT NULL",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS residential_address TEXT DEFAULT NULL",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS office_address TEXT DEFAULT NULL",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pax_adult INT DEFAULT 1",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pax_infant INT DEFAULT 0",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_type VARCHAR(100) DEFAULT NULL",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS applied_coupon_code VARCHAR(100) DEFAULT NULL",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS coupon_discount_amount DECIMAL(10,2) DEFAULT 0.00",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2) DEFAULT NULL"
    ];
    for (const sql of bookingAlterations) {
        try { await pool.query(sql); }
        catch (err) { if (!err.message?.includes('Duplicate column') && err.code !== 'ER_DUP_FIELDNAME') console.warn('[LiveOps Migration] Bookings:', err.message?.split('\n')[0]); }
    }

    // 1b. New columns on leads table
    const leadAlterations = [
        "ALTER TABLE leads ADD COLUMN IF NOT EXISTS alt_phone VARCHAR(50) DEFAULT NULL",
        // Returning customer linking (Rank 1 + Rank 4 feature)
        "ALTER TABLE leads ADD COLUMN IF NOT EXISTS customer_id VARCHAR(64) DEFAULT NULL",
        "ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_returning_customer TINYINT(1) DEFAULT 0"
    ];
    for (const sql of leadAlterations) {
        try { await pool.query(sql); }
        catch (err) { if (!err.message?.includes('Duplicate column') && err.code !== 'ER_DUP_FIELDNAME') console.warn('[LiveOps Migration] Leads:', err.message?.split('\n')[0]); }
    }

    // 2. New columns on supplier_bookings table
    const sbAlterations = [
        "ALTER TABLE supplier_bookings ADD COLUMN IF NOT EXISTS driver_name VARCHAR(100) DEFAULT NULL",
        "ALTER TABLE supplier_bookings ADD COLUMN IF NOT EXISTS driver_phone VARCHAR(50) DEFAULT NULL",
        "ALTER TABLE supplier_bookings ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(50) DEFAULT NULL"
    ];
    for (const sql of sbAlterations) {
        try { await pool.query(sql); }
        catch (err) { if (!err.message?.includes('Duplicate column') && err.code !== 'ER_DUP_FIELDNAME') console.warn('[LiveOps Migration] SupplierBookings:', err.message?.split('\n')[0]); }
    }

    // 3. Create attendance_logs table
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS attendance_logs (
                id VARCHAR(255) PRIMARY KEY,
                staff_id INT NOT NULL,
                date DATE NOT NULL,
                status VARCHAR(50) NOT NULL,
                check_in_time DATETIME DEFAULT NULL,
                check_out_time DATETIME DEFAULT NULL,
                location VARCHAR(255) DEFAULT NULL,
                notes VARCHAR(500) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_staff_date (staff_id, date)
            )
        `);
        console.log('[LiveOps Migration] attendance_logs table ensured.');
    } catch (err) {
        console.error('[LiveOps Migration] Failed to create attendance_logs:', err.message);
    }

    console.log('[LiveOps Migration] Schema check complete.');
}
ensureLiveOpsSchema();

// ─── Ensure booking_transactions table and all its columns ───
async function ensureBookingTransactionsSchema() {
    try {
        // Create table if not exists (with BIGINT to prevent INT overflow from timestamp IDs)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS booking_transactions (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                booking_id VARCHAR(64),
                date DATE,
                amount DECIMAL(10,2),
                type VARCHAR(50),
                method VARCHAR(100),
                reference VARCHAR(255),
                notes TEXT,
                status VARCHAR(50) DEFAULT 'Pending',
                receipt_url VARCHAR(255),
                recorded_by VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // Fix existing tables: upgrade id to BIGINT if it's still INT (prevents AUTO_INCREMENT overflow)
        try {
            await pool.query("ALTER TABLE booking_transactions MODIFY COLUMN id BIGINT AUTO_INCREMENT");
        } catch(e) { /* already BIGINT */ }
        // Add missing recorded_by column if upgrading existing table
        try {
            await pool.query("ALTER TABLE booking_transactions ADD COLUMN IF NOT EXISTS recorded_by VARCHAR(255) DEFAULT NULL");
        } catch(e) { /* already exists or DB doesn't support IF NOT EXISTS */ }
        console.log('[BookingTransactions Migration] Schema ensured.');
    } catch (err) {
        console.error('[BookingTransactions Migration] Failed:', err.message);
    }
}
ensureBookingTransactionsSchema();

// ─── Sync bookings.payment_status from actual Verified transactions ───
// Runs on startup to ensure DB consistency between bookings and booking_transactions
async function syncPaymentStatusFromTransactions() {
    try {
        const [bookings] = await pool.query('SELECT id, total_price, payment_status FROM bookings');
        const [allTxs] = await pool.query(
            "SELECT booking_id, amount, type, status FROM booking_transactions WHERE status = 'Verified'"
        );

        // Group verified txs by booking_id
        const txMap = {};
        allTxs.forEach(t => {
            if (!txMap[t.booking_id]) txMap[t.booking_id] = [];
            txMap[t.booking_id].push(t);
        });

        let updated = 0;
        for (const booking of bookings) {
            const txs = txMap[booking.id] || [];
            const netPaid = txs.reduce((sum, t) => {
                return sum + (t.type === 'Payment' ? Number(t.amount) : t.type === 'Refund' ? -Number(t.amount) : 0);
            }, 0);
            const totalPrice = Number(booking.total_price || 0);

            let newStatus = 'pending';
            if (totalPrice > 0 && netPaid >= totalPrice) newStatus = 'paid';
            else if (netPaid > 0) newStatus = 'deposit';
            else if (netPaid < 0) newStatus = 'refunded';

            if (newStatus !== booking.payment_status) {
                await pool.query('UPDATE bookings SET payment_status = ? WHERE id = ?', [newStatus, booking.id]);
                updated++;
            }
        }
        if (updated > 0) console.log('[Payment Sync] Corrected payment_status for ' + updated + ' booking(s).');
        else console.log('[Payment Sync] All booking payment statuses are in sync.');
    } catch (err) {
        console.error('[Payment Sync] Failed:', err.message);
    }
}
syncPaymentStatusFromTransactions();


// ─── Ensure all remaining whitelisted tables exist ───
// Prevents 500 errors on first run or after a reset. All safe to run repeatedly.
async function ensureMissingTables() {
    const tables = [
        // CMS Tables
        `CREATE TABLE IF NOT EXISTS cms_banners (
            id VARCHAR(255) PRIMARY KEY,
            title VARCHAR(255),
            subtitle TEXT,
            image_url TEXT,
            cta_text VARCHAR(255),
            cta_link VARCHAR(500),
            is_active BOOLEAN DEFAULT true,
            sort_order INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS cms_testimonials (
            id VARCHAR(255) PRIMARY KEY,
            customer_name VARCHAR(255),
            location VARCHAR(255),
            avatar_url TEXT,
            rating INT DEFAULT 5,
            content TEXT,
            package_name VARCHAR(255),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS cms_gallery_images (
            id VARCHAR(255) PRIMARY KEY,
            url TEXT NOT NULL,
            caption VARCHAR(500),
            category VARCHAR(100),
            sort_order INT DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS cms_posts (
            id VARCHAR(255) PRIMARY KEY,
            title VARCHAR(500),
            slug VARCHAR(500) UNIQUE,
            content LONGTEXT,
            excerpt TEXT,
            cover_image TEXT,
            author VARCHAR(255),
            status VARCHAR(50) DEFAULT 'Draft',
            tags TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        // Master Data Tables
        `CREATE TABLE IF NOT EXISTS master_activities (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            category VARCHAR(100),
            description TEXT,
            base_price DECIMAL(10,2) DEFAULT 0,
            unit VARCHAR(100),
            tags TEXT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS master_transports (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            type VARCHAR(100),
            capacity INT DEFAULT 0,
            base_price DECIMAL(10,2) DEFAULT 0,
            unit VARCHAR(100),
            description TEXT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS master_plans (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            duration_days INT DEFAULT 1,
            destinations TEXT,
            inclusions TEXT,
            exclusions TEXT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS master_room_types (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            base_price DECIMAL(10,2) DEFAULT 0,
            max_occupancy INT DEFAULT 2,
            amenities TEXT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS master_meal_plans (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            code VARCHAR(50),
            description TEXT,
            price_per_person DECIMAL(10,2) DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS master_lead_sources (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS master_terms_templates (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            content LONGTEXT,
            category VARCHAR(100),
            is_default BOOLEAN DEFAULT false,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        // Business Operations Tables
        `CREATE TABLE IF NOT EXISTS proposals (
            id VARCHAR(255) PRIMARY KEY,
            lead_id VARCHAR(255),
            customer_name VARCHAR(255),
            destination VARCHAR(255),
            title VARCHAR(500),
            content LONGTEXT,
            status VARCHAR(50) DEFAULT 'Draft',
            total_amount DECIMAL(10,2) DEFAULT 0,
            valid_until DATE,
            created_by VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS daily_targets (
            id VARCHAR(255) PRIMARY KEY,
            staff_id INT,
            date DATE NOT NULL,
            target_type VARCHAR(100),
            target_value DECIMAL(10,2) DEFAULT 0,
            achieved_value DECIMAL(10,2) DEFAULT 0,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS time_sessions (
            id VARCHAR(255) PRIMARY KEY,
            staff_id INT,
            start_time DATETIME,
            end_time DATETIME,
            duration_minutes INT DEFAULT 0,
            activity_type VARCHAR(100),
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS assignment_rules (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            priority INT DEFAULT 0,
            conditions LONGTEXT,
            assigned_to INT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS user_activities (
            id VARCHAR(255) PRIMARY KEY,
            staff_id INT,
            email VARCHAR(255),
            action VARCHAR(255),
            module VARCHAR(100),
            details TEXT,
            ip_address VARCHAR(100),
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS marketing_logs (
            id VARCHAR(255) PRIMARY KEY,
            date DATE NOT NULL,
            staff_id INT NOT NULL,
            momentum_score INT DEFAULT 0,
            rating VARCHAR(50) DEFAULT 'steady',
            emails_sent INT DEFAULT 0,
            social_dms INT DEFAULT 0,
            calls_made INT DEFAULT 0,
            follow_ups INT DEFAULT 0,
            proposals_sent INT DEFAULT 0,
            deals_closed INT DEFAULT 0,
            revenue_generated DECIMAL(15,2) DEFAULT 0.00,
            meta_spend DECIMAL(15,2) DEFAULT 0.00,
            meta_leads INT DEFAULT 0,
            ad_creative_notes TEXT,
            daily_summary TEXT,
            key_learnings TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_staff_date (staff_id, date)
        )`,
        `CREATE TABLE IF NOT EXISTS marketing_targets (
            id VARCHAR(255) PRIMARY KEY,
            staff_id INT NOT NULL,
            date DATE NOT NULL,
            target_emails INT DEFAULT 0,
            target_dms INT DEFAULT 0,
            target_calls INT DEFAULT 0,
            target_spend DECIMAL(15,2) DEFAULT 0.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_staff_target_date (staff_id, date)
        )`,
        `CREATE TABLE IF NOT EXISTS marketing_log_comments (
            id VARCHAR(255) PRIMARY KEY,
            log_id VARCHAR(255) NOT NULL,
            staff_id INT NOT NULL,
            comment_text TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS marketing_log_reactions (
            id VARCHAR(255) PRIMARY KEY,
            log_id VARCHAR(255) NOT NULL,
            staff_id INT NOT NULL,
            reaction_type VARCHAR(50) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_log_staff_reaction (log_id, staff_id, reaction_type)
        )`,
        `CREATE TABLE IF NOT EXISTS marketing_log_leads (
            id VARCHAR(255) PRIMARY KEY,
            log_id VARCHAR(255) NOT NULL,
            lead_id VARCHAR(255) NOT NULL,
            UNIQUE KEY unique_log_lead (log_id, lead_id)
        )`,
        `CREATE TABLE IF NOT EXISTS marketing_log_bookings (
            id VARCHAR(255) PRIMARY KEY,
            log_id VARCHAR(255) NOT NULL,
            booking_id VARCHAR(255) NOT NULL,
            UNIQUE KEY unique_log_booking (log_id, booking_id)
        )`,
        `CREATE TABLE IF NOT EXISTS in_app_notifications (
            id VARCHAR(255) PRIMARY KEY,
            staff_id INT NOT NULL,
            sender_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(50) DEFAULT 'info',
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        // ─── Trending Destinations ───
        `CREATE TABLE IF NOT EXISTS trending_destinations (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            country VARCHAR(100) DEFAULT NULL,
            region VARCHAR(100) DEFAULT NULL,
            image_url TEXT NOT NULL,
            badge VARCHAR(100) DEFAULT NULL,
            badge_color VARCHAR(50) DEFAULT '#ef4444',
            stat_label VARCHAR(255) DEFAULT NULL,
            package_count INT DEFAULT 0,
            sort_order INT DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        // ─── Uploaded Files Backup (MySQL persistence) ───
        `CREATE TABLE IF NOT EXISTS uploaded_files (
            id VARCHAR(255) PRIMARY KEY,
            filename VARCHAR(255) UNIQUE NOT NULL,
            mime_type VARCHAR(100) NOT NULL,
            data LONGBLOB NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
    ];

    for (const sql of tables) {
        try {
            await pool.query(sql);
        } catch (err) {
            console.warn('[Tables Migration] Skipped:', err.message?.split('\n')[0]);
        }
    }
    console.log('[Tables Migration] All required tables ensured.');
    
    // Sync local uploads to DB on startup
    await syncLocalUploadsToDb();
    // Restore DB uploads to local disk on startup
    await syncDbUploadsToLocal();
}
ensureMissingTables();

// Migrate/Alter cms_testimonials columns if they are using the old schema
async function migrateCMSTestimonials() {
    try {
        const [columns] = await pool.query("SHOW COLUMNS FROM cms_testimonials");
        const columnNames = columns.map(c => c.Field);
        
        if (columnNames.includes('name') && !columnNames.includes('customer_name')) {
            console.log('[Migration] Renaming cms_testimonials.name to customer_name...');
            await pool.query("ALTER TABLE cms_testimonials CHANGE COLUMN name customer_name VARCHAR(255)");
        }
        
        if (columnNames.includes('review') && !columnNames.includes('content')) {
            console.log('[Migration] Renaming cms_testimonials.review to content...');
            await pool.query("ALTER TABLE cms_testimonials CHANGE COLUMN review content TEXT");
        }
    } catch (err) {
        console.warn('[Migration] cms_testimonials column renaming skipped/failed:', err.message);
    }
}
migrateCMSTestimonials();


// ─── Ensure Membership Tables ───
async function ensureMembershipTables() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS membership_plans (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                tier ENUM('Bronze','Silver','Gold') NOT NULL,
                price_per_month DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                price_per_quarter DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                price_per_half_year DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                price_per_year DECIMAL(10,2) NOT NULL DEFAULT 0,
                discount_type VARCHAR(50) DEFAULT 'Percentage',
                discount_percent INT DEFAULT 0,
                discount_flat DECIMAL(10,2) DEFAULT 0.00,
                hotel_discount INT DEFAULT 0,
                tour_discount INT DEFAULT 0,
                flight_discount INT DEFAULT 0,
                cab_discount INT DEFAULT 0,
                perks LONGTEXT,
                color VARCHAR(50) DEFAULT '#CD7F32',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS customer_memberships (
                id VARCHAR(255) PRIMARY KEY,
                customer_id VARCHAR(255) NOT NULL,
                customer_name VARCHAR(255),
                customer_email VARCHAR(255),
                plan_id VARCHAR(255) NOT NULL,
                plan_name VARCHAR(100),
                tier VARCHAR(50),
                status ENUM('Active','Suspended','Expired') DEFAULT 'Active',
                billing_cycle VARCHAR(50) DEFAULT 'Yearly',
                price_paid DECIMAL(10,2) DEFAULT 0.00,
                enrolled_on DATE NOT NULL,
                expires_on DATE NOT NULL,
                discount_type VARCHAR(50) DEFAULT 'Percentage',
                discount_percent INT DEFAULT 0,
                discount_flat DECIMAL(10,2) DEFAULT 0.00,
                hotel_discount INT DEFAULT 0,
                tour_discount INT DEFAULT 0,
                flight_discount INT DEFAULT 0,
                cab_discount INT DEFAULT 0,
                notes TEXT,
                enrolled_by VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Ensure new price columns exist on membership_plans (Defensive Migrations)
        const planAlterations = [
            "ALTER TABLE membership_plans ADD COLUMN price_per_month DECIMAL(10,2) NOT NULL DEFAULT 0.00",
            "ALTER TABLE membership_plans ADD COLUMN price_per_quarter DECIMAL(10,2) NOT NULL DEFAULT 0.00",
            "ALTER TABLE membership_plans ADD COLUMN price_per_half_year DECIMAL(10,2) NOT NULL DEFAULT 0.00",
            "ALTER TABLE membership_plans ADD COLUMN discount_type VARCHAR(50) DEFAULT 'Percentage'",
            "ALTER TABLE membership_plans ADD COLUMN discount_flat DECIMAL(10,2) DEFAULT 0.00",
            "ALTER TABLE membership_plans ADD COLUMN cab_discount INT DEFAULT 0"
        ];
        for (const sql of planAlterations) {
            try {
                await pool.query(sql);
            } catch (err) {
                // Column duplicate or duplicate column name is safe to ignore
                if (!err.message?.includes('Duplicate column') && err.code !== 'ER_DUP_FIELDNAME') {
                    console.warn('[Membership Migration] Plan alter warning:', err.message?.split('\n')[0]);
                }
            }
        }

        // Ensure new columns exist on customer_memberships (Defensive Migrations)
        const membershipAlterations = [
            "ALTER TABLE customer_memberships ADD COLUMN billing_cycle VARCHAR(50) DEFAULT 'Yearly'",
            "ALTER TABLE customer_memberships ADD COLUMN price_paid DECIMAL(10,2) DEFAULT 0.00",
            "ALTER TABLE customer_memberships ADD COLUMN discount_type VARCHAR(50) DEFAULT 'Percentage'",
            "ALTER TABLE customer_memberships ADD COLUMN discount_flat DECIMAL(10,2) DEFAULT 0.00",
            "ALTER TABLE customer_memberships ADD COLUMN cab_discount INT DEFAULT 0"
        ];
        for (const sql of membershipAlterations) {
            try {
                await pool.query(sql);
            } catch (err) {
                if (!err.message?.includes('Duplicate column') && err.code !== 'ER_DUP_FIELDNAME') {
                    console.warn('[Membership Migration] Membership alter warning:', err.message?.split('\n')[0]);
                }
            }
        }

        console.log('[Membership Migration] Tables and alterations ensured.');
    } catch (err) {
        console.error('[Membership Migration] Failed:', err.message);
    }
}
ensureMembershipTables();

// ─── Ensure Partner Portal Tables ───
async function ensurePartnerTables() {
    try {
        // Core partners table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS partners (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                phone VARCHAR(50),
                company_name VARCHAR(255),
                location VARCHAR(255),
                status ENUM('Pending Approval', 'Active', 'Blocked') DEFAULT 'Pending Approval',
                commission_type ENUM('Percentage', 'Flat_Amount') DEFAULT 'Percentage',
                commission_value DECIMAL(10,2) DEFAULT 5.00,
                notes TEXT,
                bank_details LONGTEXT,
                joined_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Commission ledger
        await pool.query(`
            CREATE TABLE IF NOT EXISTS partner_commissions (
                id VARCHAR(255) PRIMARY KEY,
                partner_id VARCHAR(255) NOT NULL,
                booking_id VARCHAR(255) NOT NULL,
                booking_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                commission_type ENUM('Percentage', 'Flat_Amount') DEFAULT 'Percentage',
                commission_rate DECIMAL(10,4) NOT NULL DEFAULT 0,
                commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                status ENUM('Pending', 'Approved', 'Paid', 'Rejected') DEFAULT 'Pending',
                notes TEXT,
                paid_at DATETIME DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_partner_id (partner_id),
                INDEX idx_booking_id (booking_id),
                INDEX idx_status (status)
            )
        `);

        // Add partner_id column to leads table
        try {
            await pool.query("ALTER TABLE leads ADD COLUMN IF NOT EXISTS partner_id VARCHAR(255) DEFAULT NULL");
            console.log('[Partner Migration] partner_id added to leads.');
        } catch(e) { /* already exists */ }

        // Add partner_id column to bookings table
        try {
            await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS partner_id VARCHAR(255) DEFAULT NULL");
            console.log('[Partner Migration] partner_id added to bookings.');
        } catch(e) { /* already exists */ }

        // Add sender column to lead_logs table
        try {
            await pool.query("ALTER TABLE lead_logs ADD COLUMN IF NOT EXISTS sender VARCHAR(255) DEFAULT 'System'");
            console.log('[Partner Migration] sender added to lead_logs.');
        } catch(e) { /* already exists */ }

        // Add cab_commission columns to partners table
        try {
            await pool.query("ALTER TABLE partners ADD COLUMN IF NOT EXISTS cab_commission_type VARCHAR(50) DEFAULT 'Flat_Amount'");
            await pool.query("ALTER TABLE partners ADD COLUMN IF NOT EXISTS cab_commission_value DECIMAL(10,2) DEFAULT 300.00");
            console.log('[Partner Migration] cab_commission columns added to partners.');
        } catch(e) { /* already exists */ }

        // Add bus_commission columns to partners table
        try {
            await pool.query("ALTER TABLE partners ADD COLUMN IF NOT EXISTS bus_commission_type VARCHAR(50) DEFAULT 'Flat_Amount'");
            await pool.query("ALTER TABLE partners ADD COLUMN IF NOT EXISTS bus_commission_value DECIMAL(10,2) DEFAULT 150.00");
            console.log('[Partner Migration] bus_commission columns added to partners.');
        } catch(e) { /* already exists */ }

        // Add train_commission columns to partners table
        try {
            await pool.query("ALTER TABLE partners ADD COLUMN IF NOT EXISTS train_commission_type VARCHAR(50) DEFAULT 'Flat_Amount'");
            await pool.query("ALTER TABLE partners ADD COLUMN IF NOT EXISTS train_commission_value DECIMAL(10,2) DEFAULT 100.00");
            console.log('[Partner Migration] train_commission columns added to partners.');
        } catch(e) { /* already exists */ }

        // Add flight_commission columns to partners table
        try {
            await pool.query("ALTER TABLE partners ADD COLUMN IF NOT EXISTS flight_commission_type VARCHAR(50) DEFAULT 'Flat_Amount'");
            await pool.query("ALTER TABLE partners ADD COLUMN IF NOT EXISTS flight_commission_value DECIMAL(10,2) DEFAULT 200.00");
            console.log('[Partner Migration] flight_commission columns added to partners.');
        } catch(e) { /* already exists */ }

        console.log('[Partner Migration] Partner tables ensured.');
    } catch (err) {
        console.error('[Partner Migration] Failed:', err.message);
    }
}
ensurePartnerTables();

// ─── Ensure Coupons Table ───
async function ensureCouponsTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS coupons (
                id VARCHAR(255) PRIMARY KEY,
                code VARCHAR(100) UNIQUE NOT NULL,
                type VARCHAR(50) NOT NULL DEFAULT 'ToursOnly',
                discount_type VARCHAR(50) NOT NULL DEFAULT 'Percentage',
                discount_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                min_booking_amount DECIMAL(10,2) DEFAULT 0.00,
                valid_from DATE DEFAULT NULL,
                valid_to DATE DEFAULT NULL,
                status VARCHAR(50) DEFAULT 'Active',
                is_used TINYINT(1) DEFAULT 0,
                use_count INT DEFAULT 0,
                download_count INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        // Add download_count column if missing (migration for existing tables)
        try {
            await pool.query('ALTER TABLE coupons ADD COLUMN download_count INT DEFAULT 0');
            console.log('[Coupons Migration] Added download_count column.');
        } catch (e) { /* already exists */ }
        console.log('[Coupons Migration] Coupons table ensured.');
    } catch (err) {
        console.error('[Coupons Migration] Failed to ensure coupons table:', err.message);
    }
}
ensureCouponsTable();

// ─── Ensure Trending Destinations Table + cms_gallery_images migration ───
async function ensureTrendingDestinationsTable() {
    try {
        // 1. Create trending_destinations table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS trending_destinations (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                country VARCHAR(255) DEFAULT NULL,
                region VARCHAR(255) DEFAULT NULL,
                image_url TEXT NOT NULL,
                badge VARCHAR(100) DEFAULT NULL,
                badge_color VARCHAR(50) DEFAULT '#ef4444',
                stat_label VARCHAR(255) DEFAULT NULL,
                package_count INT DEFAULT 0,
                sort_order INT DEFAULT 0,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('[TrendingDest] trending_destinations table ensured.');

        // 2. Seed initial destinations if table is empty
        const [existing] = await pool.query('SELECT COUNT(*) as cnt FROM trending_destinations');
        if (existing[0].cnt === 0) {
            const seeds = [
                { id: 'TD-001', name: 'Goa', country: 'India', region: 'West India', image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80', badge: 'Most Popular', badge_color: '#f59e0b', stat_label: '12,400+ travelers visited', package_count: 8, sort_order: 1 },
                { id: 'TD-002', name: 'Manali', country: 'India', region: 'Himachal Pradesh', image_url: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&q=80', badge: 'Trending', badge_color: '#8b5cf6', stat_label: '8,200+ travelers visited', package_count: 6, sort_order: 2 },
                { id: 'TD-003', name: 'Kerala', country: 'India', region: 'South India', image_url: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&q=80', badge: 'Top Rated', badge_color: '#10b981', stat_label: '9,800+ travelers visited', package_count: 7, sort_order: 3 },
                { id: 'TD-004', name: 'Dubai', country: 'UAE', region: 'Middle East', image_url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80', badge: 'International', badge_color: '#3b82f6', stat_label: '6,500+ travelers visited', package_count: 5, sort_order: 4 },
                { id: 'TD-005', name: 'Bali', country: 'Indonesia', region: 'South-East Asia', image_url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80', badge: 'Hot', badge_color: '#ef4444', stat_label: '7,100+ travelers visited', package_count: 4, sort_order: 5 },
                { id: 'TD-006', name: 'Jaipur', country: 'India', region: 'Rajasthan', image_url: 'https://images.unsplash.com/photo-1477587458883-47145ed6979c?w=800&q=80', badge: 'Cultural', badge_color: '#ec4899', stat_label: '5,900+ travelers visited', package_count: 4, sort_order: 6 },
                { id: 'TD-007', name: 'Ladakh', country: 'India', region: 'Jammu & Kashmir', image_url: 'https://images.unsplash.com/photo-1598091383021-15ddea10925d?w=800&q=80', badge: 'Adventure', badge_color: '#06b6d4', stat_label: '3,400+ travelers visited', package_count: 3, sort_order: 7 },
                { id: 'TD-008', name: 'Maldives', country: 'Maldives', region: 'Indian Ocean', image_url: 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=800&q=80', badge: 'Luxury', badge_color: '#f59e0b', stat_label: '4,200+ travelers visited', package_count: 3, sort_order: 8 }
            ];
            for (const s of seeds) {
                try {
                    await pool.query(
                        'INSERT INTO trending_destinations (id, name, country, region, image_url, badge, badge_color, stat_label, package_count, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)',
                        [s.id, s.name, s.country, s.region, s.image_url, s.badge, s.badge_color, s.stat_label, s.package_count, s.sort_order]
                    );
                } catch(e) { /* skip duplicate */ }
            }
            console.log('[TrendingDest] Seeded 8 initial trending destinations.');
        }

        // 2b. Create trending_destination_packages junction table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS trending_destination_packages (
                trending_destination_id VARCHAR(255) NOT NULL,
                package_id VARCHAR(64) NOT NULL,
                PRIMARY KEY (trending_destination_id, package_id),
                FOREIGN KEY (trending_destination_id) REFERENCES trending_destinations(id) ON DELETE CASCADE,
                FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
            )
        `);
        console.log('[TrendingDest] trending_destination_packages table ensured.');

        // 2c. Backfill: If junction table is completely empty, insert matches based on name/location matching
        const [existingLinks] = await pool.query('SELECT COUNT(*) as cnt FROM trending_destination_packages');
        if (existingLinks[0].cnt === 0) {
            console.log('[TrendingDest] Backfilling trending_destination_packages...');
            try {
                await pool.query(`
                    INSERT IGNORE INTO trending_destination_packages (trending_destination_id, package_id)
                    SELECT d.id AS trending_destination_id, p.id AS package_id
                    FROM trending_destinations d
                    JOIN packages p ON (
                        LOWER(p.location) LIKE CONCAT('%', LOWER(d.name), '%')
                        OR p.location IN (
                            SELECT ml.id FROM master_locations ml 
                            WHERE LOWER(ml.name) LIKE CONCAT('%', LOWER(d.name), '%')
                        )
                    )
                `);
                console.log('[TrendingDest] Backfill completed.');
            } catch (backfillErr) {
                console.error('[TrendingDest] Backfill error:', backfillErr.message);
            }
        }

        // 3. Migrate cms_gallery_images — add enhanced columns
        const galleryMigrations = [
            "ALTER TABLE cms_gallery_images ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT NULL",
            "ALTER TABLE cms_gallery_images ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL",
            "ALTER TABLE cms_gallery_images ADD COLUMN IF NOT EXISTS tag VARCHAR(100) DEFAULT NULL",
            "ALTER TABLE cms_gallery_images ADD COLUMN IF NOT EXISTS link_url VARCHAR(500) DEFAULT NULL",
            "ALTER TABLE cms_gallery_images ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false"
        ];
        for (const sql of galleryMigrations) {
            try { await pool.query(sql); }
            catch (e) { /* column already exists — safe to ignore */ }
        }
        // Backfill: copy caption → title and url → image_url for existing rows
        try {
            await pool.query("UPDATE cms_gallery_images SET title = caption WHERE title IS NULL AND caption IS NOT NULL");
            await pool.query("UPDATE cms_gallery_images SET image_url = url WHERE image_url IS NULL AND url IS NOT NULL");
        } catch(e) { /* safe */ }
        console.log('[TrendingDest] cms_gallery_images enhanced columns ensured.');
    } catch (err) {
        console.error('[TrendingDest] Migration failed:', err.message);
    }
}
ensureTrendingDestinationsTable();

// ─── Database Index Migration ───
// Creates indexes on foreign key and frequently filtered/sorted columns in MySQL
async function addIndexSafe(table, column, indexName) {
    try {
        const [rows] = await pool.query(
            `SHOW INDEX FROM \`${table}\` WHERE Key_name = ?`,
            [indexName]
        );
        if (rows.length === 0) {
            await pool.query(
                `ALTER TABLE \`${table}\` ADD INDEX \`${indexName}\` (\`${column}\`)`
            );
            console.log(`[Index Migration] Created index ${indexName} on ${table}(${column})`);
        }
    } catch (err) {
        console.warn(`[Index Migration] Failed/Skipped for ${table}(${column}):`, err.message?.split('\n')[0]);
    }
}

async function ensureDatabaseIndexes() {
    console.log('[Index Migration] Checking database indexes...');
    
    // Core relations & filters indexes
    await addIndexSafe('bookings', 'assigned_to', 'idx_bookings_assigned_to');
    await addIndexSafe('bookings', 'package_id', 'idx_bookings_package_id');
    await addIndexSafe('bookings', 'partner_id', 'idx_bookings_partner_id');
    
    await addIndexSafe('booking_transactions', 'booking_id', 'idx_booking_transactions_booking_id');
    
    await addIndexSafe('supplier_bookings', 'booking_id', 'idx_supplier_bookings_booking_id');
    await addIndexSafe('supplier_bookings', 'vendor_id', 'idx_supplier_bookings_vendor_id');
    
    await addIndexSafe('leads', 'assigned_to', 'idx_leads_assigned_to');
    await addIndexSafe('leads', 'package_id', 'idx_leads_package_id');
    await addIndexSafe('leads', 'partner_id', 'idx_leads_partner_id');
    
    await addIndexSafe('lead_logs', 'lead_id', 'idx_lead_logs_lead_id');
    
    await addIndexSafe('follow_ups', 'lead_id', 'idx_follow_ups_lead_id');
    await addIndexSafe('follow_ups', 'assigned_to', 'idx_follow_ups_assigned_to');
    
    await addIndexSafe('tasks', 'assigned_to', 'idx_tasks_assigned_to');
    await addIndexSafe('tasks', 'related_lead_id', 'idx_tasks_related_lead_id');
    await addIndexSafe('tasks', 'related_booking_id', 'idx_tasks_related_booking_id');
    
    await addIndexSafe('proposals', 'lead_id', 'idx_proposals_lead_id');
    await addIndexSafe('daily_targets', 'staff_id', 'idx_daily_targets_staff_id');
    await addIndexSafe('time_sessions', 'staff_id', 'idx_time_sessions_staff_id');
    await addIndexSafe('user_activities', 'staff_id', 'idx_user_activities_staff_id');
    await addIndexSafe('attendance_logs', 'staff_id', 'idx_attendance_logs_staff_id');
    await addIndexSafe('customer_memberships', 'customer_id', 'idx_customer_memberships_customer_id');
    await addIndexSafe('customer_memberships', 'plan_id', 'idx_customer_memberships_plan_id');
    
    await addIndexSafe('partner_commissions', 'partner_id', 'idx_partner_commissions_partner_id');
    await addIndexSafe('partner_commissions', 'booking_id', 'idx_partner_commissions_booking_id');
    
    console.log('[Index Migration] Index checks completed.');
}
ensureDatabaseIndexes();

// ─── Ensure Invoice Custom Fields Table + field_labels column ───
async function ensureInvoiceCustomFields() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS invoice_custom_fields (
                id VARCHAR(255) PRIMARY KEY,
                invoice_id VARCHAR(255) NOT NULL,
                label VARCHAR(255) NOT NULL DEFAULT '',
                amount DECIMAL(10,2) DEFAULT 0.00,
                is_deduction TINYINT(1) DEFAULT 0,
                sort_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_icf_invoice_id (invoice_id)
            )
        `);
        // Add field_labels JSON column to invoices if it doesn't exist
        try {
            await pool.query("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS field_labels TEXT DEFAULT NULL");
        } catch(e) { /* already exists */ }
        // Add balance_due column to invoices if it doesn't exist
        try {
            await pool.query("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS balance_due DECIMAL(10,2) DEFAULT 0.00");
        } catch(e) { /* already exists */ }
        // Add is_gst column to invoices if it doesn't exist
        try {
            await pool.query("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_gst TINYINT(1) DEFAULT 1");
        } catch(e) { /* already exists */ }
        // Add client_gst column to invoices if it doesn't exist
        try {
            await pool.query("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_gst VARCHAR(50) DEFAULT NULL");
        } catch(e) { /* already exists */ }
        // Add gst_type column to invoices if it doesn't exist
        try {
            await pool.query("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gst_type VARCHAR(20) DEFAULT 'CGST_SGST'");
        } catch(e) { /* already exists */ }
        // Add hsn_sac column to invoice_items if it doesn't exist
        try {
            await pool.query("ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS hsn_sac VARCHAR(50) DEFAULT '9985'");
        } catch(e) { /* already exists */ }
        console.log('[InvoiceCustomFields Migration] Table and columns ensured.');
    } catch (err) {
        console.error('[InvoiceCustomFields Migration] Failed:', err.message);
    }
}
ensureInvoiceCustomFields();

// Ensure tasks table has category column
// Ensure tasks table has category column
async function ensureTasksCategoryColumn() {
    try {
        await pool.query("ALTER TABLE tasks ADD COLUMN category VARCHAR(100) DEFAULT NULL");
        console.log('[Tasks Migration] Category column ensured.');
    } catch (err) {
        // Ignored if column already exists
        console.log('[Tasks Migration] Category column already exists or migration skipped.');
    }
}
ensureTasksCategoryColumn();

// ─── Playbooks & Checklists Mapping ───
// Fix #5: Added priority to every task. Fix #6: Added dueDaysOffset (relative to booking date for bookings, relative to today for leads)
const LEAD_STAGE_PLAYBOOKS = {
    'New': [
        { title: 'Send WhatsApp greeting message', description: 'Introduce Shravya Tours and acknowledge receipt of inquiry.', priority: 'High', dueDaysOffset: 0 },
        { title: 'Call customer to qualify requirements', description: 'Understand duration, pax count, budget, and destinations.', priority: 'High', dueDaysOffset: 0 },
        { title: 'Update lead source and assignment', description: 'Ensure source tracking and owner details are correct.', priority: 'Medium', dueDaysOffset: 1 }
    ],
    'Warm': [
        { title: 'Research destination & plan options', description: 'Review flight connections and hotel options for traveler details.', priority: 'Medium', dueDaysOffset: 1 },
        { title: 'Create initial itinerary draft', description: 'Design a draft itinerary matching the client requirements.', priority: 'High', dueDaysOffset: 2 },
        { title: 'Send initial pricing estimate', description: 'Provide a ballpark figure for client review.', priority: 'High', dueDaysOffset: 3 }
    ],
    'Hot': [
        { title: 'Customize itinerary based on feedback', description: 'Adjust activities, hotels, and timing.', priority: 'High', dueDaysOffset: 1 },
        { title: 'Verify supplier/hotel availability', description: 'Double check rooms and services for selected dates.', priority: 'Urgent', dueDaysOffset: 1 },
        { title: 'Prepare final official proposal', description: 'Build formal proposal with final pricing and inclusions.', priority: 'Urgent', dueDaysOffset: 2 }
    ],
    'Offer Sent': [
        { title: 'Follow up on proposal acceptance', description: 'Call or message the traveler to review the sent proposal.', priority: 'High', dueDaysOffset: 1 },
        { title: 'Offer flexible payment terms', description: 'Explain deposit options and balance payment timeline.', priority: 'Medium', dueDaysOffset: 2 },
        { title: 'Address customization requests', description: 'Modify details if they request last-minute tweaks.', priority: 'Medium', dueDaysOffset: 2 }
    ],
    'Converted': [
        { title: 'Verify payment receipt & confirmation', description: 'Confirm that deposit/advance payment is received in accounts.', priority: 'Urgent', dueDaysOffset: 0 },
        { title: 'Sync lead data to booking', description: 'Verify all travel documents and contact details.', priority: 'High', dueDaysOffset: 1 },
        { title: 'Send official confirmation voucher', description: 'Issue tour confirmation voucher to client.', priority: 'High', dueDaysOffset: 1 }
    ],
    'Cold': [
        { title: 'Send final re-engagement offer', description: 'Send a special coupon code or limited-time discount.', priority: 'Low', dueDaysOffset: 0 },
        { title: 'Document lost reasons', description: 'Log why the lead was lost or went cold.', priority: 'Low', dueDaysOffset: 1 }
    ]
};

// Fix #6: Booking tasks use dueDaysOffset relative to booking travel date (negative = before travel, positive = after creation)
const BOOKING_TYPE_PLAYBOOKS = {
    'Tour': [
        { title: 'Create WhatsApp group for group tours', description: 'Include travelers, tour leader, and support contacts.', priority: 'High', dueDaysOffset: -7 },
        { title: 'Issue tour vouchers and itinerary details', description: 'Provide PDF vouchers for all booked elements.', priority: 'High', dueDaysOffset: -5 },
        { title: 'Assign tour coordinator / guide', description: 'Confirm guide availability and share contact info.', priority: 'Urgent', dueDaysOffset: -3 },
        { title: 'Coordinate transport operator details', description: 'Confirm pickup times and driver information.', priority: 'High', dueDaysOffset: -2 },
        { title: 'Re-confirm hotel bookings', description: 'Ensure hotels are ready for check-in.', priority: 'Urgent', dueDaysOffset: -1 }
    ],
    'Hotel': [
        { title: 'Send booking details to hotel', description: 'Confirm room category and meal plan details.', priority: 'High', dueDaysOffset: -5 },
        { title: 'Obtain hotel voucher reference ID', description: 'Confirm room booking is registered in hotel PMS.', priority: 'High', dueDaysOffset: -3 },
        { title: 'Verify special requests (bedding/check-in)', description: 'Confirm king bed, twin beds, or early arrival if requested.', priority: 'Medium', dueDaysOffset: -1 }
    ],
    'Car': [
        { title: 'Assign driver and share contact details', description: 'Share contact information with traveler via WhatsApp.', priority: 'High', dueDaysOffset: -2 },
        { title: 'Inspect vehicle cleanliness & condition', description: 'Ensure the assigned vehicle is serviced and clean.', priority: 'Medium', dueDaysOffset: -1 },
        { title: 'Confirm pick-up time and location details', description: 'Send exact coordinates and time to driver.', priority: 'Urgent', dueDaysOffset: -1 }
    ],
    'Bus': [
        { title: 'Confirm seat numbers and boarding point', description: 'Provide boarding point map and timing to passenger.', priority: 'High', dueDaysOffset: -2 },
        { title: 'Share bus operator tracking link', description: 'Enable tracking for traveler on travel day.', priority: 'Medium', dueDaysOffset: -1 }
    ],
    'Train': [
        { title: 'Verify PNR status', description: 'Check seat numbers, coach numbers, and confirmation status.', priority: 'Urgent', dueDaysOffset: -3 },
        { title: 'Send ticket PDF to customer', description: 'Share confirmation via email/WhatsApp.', priority: 'High', dueDaysOffset: -2 }
    ],
    'Flight': [
        { title: 'Generate & send air tickets', description: 'Email e-ticket to traveler.', priority: 'Urgent', dueDaysOffset: -5 },
        { title: 'Perform web check-in', description: 'Select preferred seats and retrieve boarding passes 24 hours prior.', priority: 'High', dueDaysOffset: -1 },
        { title: 'Verify terminal & flight status', description: 'Check for delays or terminal updates 4 hours before departure.', priority: 'High', dueDaysOffset: 0 }
    ]
};

async function generateLeadPlaybook(leadId, status, assignedTo, userEmail) {
    const playbookKey = status;
    const tasksToInsert = LEAD_STAGE_PLAYBOOKS[playbookKey] || BOOKING_TYPE_PLAYBOOKS[playbookKey];
    if (!playbookKey || !tasksToInsert) return;
    try {
        let staffId = 'System';
        if (userEmail) {
            const [staffRows] = await pool.query('SELECT id FROM staff_members WHERE email = ?', [userEmail]);
            if (staffRows.length > 0) staffId = String(staffRows[0].id);
        }
        
        // Fix #1: Only delete playbook-sourced pending tasks — preserves manually added tasks
        await pool.query(
            "DELETE FROM tasks WHERE related_lead_id = ? AND category = 'checklist' AND source = 'playbook' AND status != 'Completed'",
            [leadId]
        );
        
        // Fix #6: Lead tasks use offset from today (creation/status-change date)
        const today = new Date();
        const defaultAssignee = assignedTo || staffId;
        
        for (const t of tasksToInsert) {
            const taskId = crypto.randomUUID();
            const dueDate = new Date(today);
            dueDate.setDate(dueDate.getDate() + (t.dueDaysOffset || 0));
            const dueDateStr = dueDate.toISOString().split('T')[0];
            await pool.query(
                `INSERT INTO tasks (id, title, description, assigned_to, assigned_by, status, priority, due_date, category, source, related_lead_id, created_at)
                 VALUES (?, ?, ?, ?, ?, 'Pending', ?, ?, 'checklist', 'playbook', ?, NOW())`,
                [taskId, t.title, t.description, defaultAssignee, staffId, t.priority || 'Medium', dueDateStr, leadId]
            );
        }
        console.log(`[Lead Playbook] Generated ${tasksToInsert.length} checklist tasks for lead ${leadId} (key: ${playbookKey})`);
    } catch (err) {
        console.error('[Lead Playbook Error] Failed to generate playbook:', err);
    }
}

async function generateBookingPlaybook(bookingId, type, assignedTo, userEmail) {
    const playbookKey = type;
    // Fix #3: Remove wrong LEAD_STAGE_PLAYBOOKS fallback — bookings only use booking templates
    const tasksToInsert = BOOKING_TYPE_PLAYBOOKS[playbookKey];
    if (!playbookKey || !tasksToInsert) {
        console.warn(`[Booking Playbook] No template found for booking type: "${playbookKey}". Skipping.`);
        return;
    }
    try {
        let staffId = 'System';
        if (userEmail) {
            const [staffRows] = await pool.query('SELECT id FROM staff_members WHERE email = ?', [userEmail]);
            if (staffRows.length > 0) staffId = String(staffRows[0].id);
        }
        
        // Fix #1: Only delete playbook-sourced pending tasks — preserves manually added tasks
        await pool.query(
            "DELETE FROM tasks WHERE related_booking_id = ? AND category = 'checklist' AND source = 'playbook' AND status != 'Completed'",
            [bookingId]
        );
        
        // Fix #6: Booking tasks use offset relative to booking travel date
        const defaultAssignee = assignedTo || staffId;
        let bookingTravelDate = null;
        try {
            const [[bRow]] = await pool.query('SELECT date FROM bookings WHERE id = ?', [bookingId]);
            if (bRow && bRow.date) bookingTravelDate = new Date(bRow.date);
        } catch (e) { /* fallback to today */ }
        const anchorDate = bookingTravelDate || new Date();
        
        for (const t of tasksToInsert) {
            const taskId = crypto.randomUUID();
            const dueDate = new Date(anchorDate);
            dueDate.setDate(dueDate.getDate() + (t.dueDaysOffset || 0));
            // Ensure due date is not in the past — clamp to today minimum
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (dueDate < today) dueDate.setTime(today.getTime());
            const dueDateStr = dueDate.toISOString().split('T')[0];
            await pool.query(
                `INSERT INTO tasks (id, title, description, assigned_to, assigned_by, status, priority, due_date, category, source, related_booking_id, created_at)
                 VALUES (?, ?, ?, ?, ?, 'Pending', ?, ?, 'checklist', 'playbook', ?, NOW())`,
                [taskId, t.title, t.description, defaultAssignee, staffId, t.priority || 'Medium', dueDateStr, bookingId]
            );
        }
        console.log(`[Booking Playbook] Generated ${tasksToInsert.length} checklist tasks for booking ${bookingId} (key: ${playbookKey})`);
    } catch (err) {
        console.error('[Booking Playbook Error] Failed to generate playbook:', err);
    }
}


// Allowed tables (whitelist to prevent SQL injection)
const ALLOWED_TABLES = new Set([
    'packages', 'bookings', 'booking_transactions', 'supplier_bookings',
    'leads', 'lead_logs', 'daily_inventory',
    'vendors', 'accounts', 'account_transactions',
    'staff_members', 'customers', 'campaigns', 'expenses',
    'master_locations', 'master_hotels', 'tasks',
    'master_room_types', 'master_meal_plans', 'master_activities',
    'master_transports', 'master_plans', 'master_lead_sources',
    'master_terms_templates',
    'cms_banners', 'cms_testimonials', 'cms_gallery_images', 'cms_posts',
    'follow_ups', 'proposals', 'daily_targets', 'time_sessions',
    'assignment_rules', 'user_activities', 'audit_logs', 'settings',
    'invoices', 'invoice_items', 'invoice_custom_fields',
    'attendance_logs',  // Live Operations attendance tracking
    'membership_plans', 'customer_memberships',  // Membership Module
    'partners', 'partner_commissions',  // B2B Partner Portal
    'coupons',  // Coupon Manager
    'marketing_logs',
    'marketing_targets', 'marketing_log_comments', 'marketing_log_reactions',
    'marketing_log_leads', 'marketing_log_bookings', 'in_app_notifications'
]);

// ─── Auth Middleware ───
function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// ─── Validate Table Name ───
function validateTable(req, res, next) {
    const table = req.params.table;
    if (!ALLOWED_TABLES.has(table)) {
        return res.status(400).json({ error: `Invalid table: ${table}` });
    }
    next();
}

// ─── Validate Column Name (prevent SQL injection via select/order params) ───
const VALID_COL_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
function isValidColumn(name) {
    return VALID_COL_RE.test(name);
}

// ─── Write Guard: restrict writes to sensitive tables to admins only ───
const ADMIN_ONLY_TABLES = new Set(['users', 'staff_members', 'audit_logs', 'settings']);
function writeGuard(req, res, next) {
    const table = req.params.table;
    if (ADMIN_ONLY_TABLES.has(table) && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required for this table' });
    }
    next();
}

// ─── Permissions & Scoping Helpers ───

// Map DB tables to their logical permission modules in AuthContext
const TABLE_TO_MODULE = {
    'packages': 'inventory',
    'daily_inventory': 'inventory',
    'bookings': 'bookings',
    'booking_transactions': 'invoices',
    'supplier_bookings': 'operations',
    'leads': 'leads',
    'lead_logs': 'leads',
    'vendors': 'vendors',
    'accounts': 'finance',
    'account_transactions': 'finance',
    'staff_members': 'staff',
    'customers': 'customers',
    'campaigns': 'marketing',
    'expenses': 'finance',
    'master_locations': 'masters',
    'master_hotels': 'masters',
    'tasks': 'dashboard',
    'master_room_types': 'masters',
    'master_meal_plans': 'masters',
    'master_activities': 'masters',
    'master_transports': 'masters',
    'master_plans': 'masters',
    'master_lead_sources': 'masters',
    'master_terms_templates': 'masters',
    'cms_banners': 'cms',
    'cms_testimonials': 'testimonials',
    'cms_gallery_images': 'cms',
    'cms_posts': 'cms',
    'follow_ups': 'leads',
    'proposals': 'proposals',
    'daily_targets': 'dashboard',
    'time_sessions': 'dashboard',
    'assignment_rules': 'staff',
    'user_activities': 'audit',
    'audit_logs': 'audit',
    'settings': 'settings',
    'invoices': 'invoices',
    'invoice_items': 'invoices',
    'invoice_custom_fields': 'invoices',
    'attendance_logs': 'operations',
    'membership_plans': 'memberships',
    'customer_memberships': 'memberships',
    'partners': 'partners',
    'partner_commissions': 'partners',
    'coupons': 'marketing',
    'marketing_logs': 'marketing',
    'marketing_targets': 'marketing',
    'marketing_log_comments': 'marketing',
    'marketing_log_reactions': 'marketing',
    'marketing_log_leads': 'marketing',
    'marketing_log_bookings': 'marketing',
    'in_app_notifications': 'dashboard'
};

async function getStaffPermissionsAndScope(email) {
    if (!email) return { permissions: {}, queryScope: 'Show Assigned Query Only', isAdmin: false };
    const [rows] = await pool.query('SELECT permissions, query_scope, user_type FROM staff_members WHERE email = ?', [email]);
    if (rows.length === 0) {
        return { permissions: {}, queryScope: 'Show Assigned Query Only', isAdmin: false };
    }
    const row = rows[0];
    let permissions = {};
    try {
        permissions = typeof row.permissions === 'string' ? JSON.parse(row.permissions) : (row.permissions || {});
    } catch (e) {
        permissions = {};
    }
    return {
        permissions,
        queryScope: row.query_scope || 'Show Assigned Query Only',
        isAdmin: row.user_type === 'Admin'
    };
}

async function permissionGuard(req, res, next) {
    const table = req.params.table;
    const method = req.method;
    const action = (method === 'GET') ? 'view' : 'manage';

    if (!req.user) {
        return next();
    }

    // 1. Admin gets unrestricted access
    if (req.user?.role === 'admin' || req.user?.role === 'Admin') {
        return next();
    }

    // Self-access bypass for staff_members table (allows any staff to view their own profile/record)
    if (table === 'staff_members') {
        const isSelf = (req.params.id && String(req.params.id) === String(req.user.staffId)) ||
                       (req.query.eq_email && req.query.eq_email === req.user.email) ||
                       (req.query.eq_id && String(req.query.eq_id) === String(req.user.staffId));
        if (isSelf) {
            return next();
        }
    }

    const module = TABLE_TO_MODULE[table];
    if (!module) {
        // Table not in mapped list, allow it
        return next();
    }

    try {
        const { permissions, isAdmin } = await getStaffPermissionsAndScope(req.user?.email);
        if (isAdmin) {
            return next();
        }

        const allowed = permissions[module]?.[action] ?? false;
        if (!allowed) {
            console.warn(`[Permission Denied] User ${req.user?.email} lacks '${action}' permission for table '${table}' (Module: ${module})`);
            return res.status(403).json({ error: `Unauthorized: You do not have permission to ${action} this module (${module}).` });
        }

        // Ownership checks for non-admin on write/modify actions
        if (action === 'manage') {
            const myDataTables = ['leads', 'bookings', 'follow_ups', 'tasks'];
            if (myDataTables.includes(table)) {
                // For update/delete, check that the user owns the existing record
                if ((method === 'PUT' || method === 'DELETE') && req.params.id) {
                    const [existing] = await pool.query(`SELECT assigned_to FROM \`${table}\` WHERE id = ?`, [req.params.id]);
                    if (existing.length > 0) {
                        const owner = String(existing[0].assigned_to || '');
                        const staffId = String(req.user.staffId || '');
                        if (owner && owner !== staffId) {
                            return res.status(403).json({ error: `Unauthorized: You cannot modify records outside your ownership scope.` });
                        }
                    }
                }
            }
        }

        next();
    } catch (err) {
        console.error('Permission guard check failed:', err.message);
        res.status(500).json({ error: 'Permission guard check failed' });
    }
}

// ─── Server-Side Audit Logger ───
async function auditLog(action, table, details, performedBy) {
    try {
        await pool.query(
            'INSERT INTO `audit_logs` (action, module, details, severity, performed_by, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
            [action, table, details, 'Info', performedBy || 'System', new Date().toISOString()]
        );
    } catch (e) {
        console.error('Audit log write failed:', e.message);
    }
}

// ─── Returning Customer Helpers (Rank 3 + Rank 1) ───

/**
 * Normalises any phone number to its last 10 digits for consistent matching.
 * Strips country codes (+91, 91), spaces, dashes, brackets.
 * Examples: '+91-9876543210' → '9876543210', '09876543210' → '9876543210'
 */
function normalisePhone(phone) {
    if (!phone) return null;
    const digits = String(phone).replace(/\D/g, ''); // strip everything non-numeric
    if (!digits) return null;
    return digits.length >= 10 ? digits.slice(-10) : digits;
}

/**
 * Searches the customers table for a record whose phone / alt_phone / whatsapp
 * matches the normalised input. Returns the first match or null.
 * Uses RIGHT(REPLACE(...), 10) so the comparison is format-agnostic in SQL too.
 */
async function findMatchingCustomer(normPhone) {
    if (!normPhone || normPhone.length < 6) return null;
    try {
        const [rows] = await pool.query(`
            SELECT id, name, type, bookings_count
            FROM customers
            WHERE
                RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', ''), '()', ''), 10) = ?
                OR RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(alt_phone, ' ', ''), '-', ''), '+', ''), '()', ''), 10) = ?
                OR RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(whatsapp, ' ', ''), '-', ''), '+', ''), '()', ''), 10) = ?
            LIMIT 1
        `, [normPhone, normPhone, normPhone]);
        return rows.length > 0 ? rows[0] : null;
    } catch (err) {
        // Non-fatal: if query fails, proceed without linking
        console.warn('[ReturnCustomer] findMatchingCustomer error:', err.message);
        return null;
    }
}

// ─── Health Check ───
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

app.get('/api/db-test', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT 1 + 1 AS solution');
        res.json({ status: 'success', data: rows });
    } catch (error) {
        console.error('Database connection failed:', error);
        res.status(500).json({ status: 'error', message: 'Database connection failed' });
    }
});

// Serving and uploads handled at the end of the file

// ═══════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body || {};

    // Validate required fields
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    // Dev/Demo bypass
    if (email === 'admin@shravyatours.com' && password === 'admin') {
        const token = jwt.sign({ id: 999, email, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ token, user: { id: 999, email, role: 'admin' } });
    }

    try {
        const trimmedEmail = email?.trim();
        // Check staff_members table for the user
        const [staff] = await pool.query('SELECT * FROM staff_members WHERE email = ?', [trimmedEmail]);

        // Check users table for password auth
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [trimmedEmail]);

        if (users.length > 0) {
            const valid = await bcrypt.compare(password, users[0].password_hash);
            if (!valid) {
                console.warn(`Login failed for ${trimmedEmail}: Invalid password`);
                return res.status(401).json({ error: 'Invalid credentials' });
            }
        } else if (staff.length > 0 && staff[0].password_hash) {
            // Fallback: staff member has a password in staff_members table (no users row yet)
            const valid = await bcrypt.compare(password, staff[0].password_hash);
            if (!valid) {
                console.warn(`Login failed for ${trimmedEmail}: Invalid staff password`);
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            // Auto-create the users row so future logins work normally
            try {
                await pool.query(
                    'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
                    [trimmedEmail, staff[0].password_hash, staff[0].user_type === 'Admin' ? 'admin' : 'staff']
                );
                console.log(`Auto-created users record for staff: ${trimmedEmail}`);
            } catch (insertErr) {
                // Ignore duplicate key errors silently
                if (insertErr.code !== 'ER_DUP_ENTRY') console.warn('Auto-create users row warning:', insertErr.message);
            }
        } else {
            console.warn(`Login failed for ${trimmedEmail}: User record not found in users table`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const staffProfile = staff.length > 0 ? staff[0] : null;

        // Derive effective role: if staff member is Admin, promote to 'admin' in JWT
        // so the frontend isAdminOverride flag works correctly
        const effectiveRole = (staffProfile?.user_type === 'Admin') ? 'admin' : (users[0]?.role || 'staff');

        const userId = users[0]?.id || null;
        const token = jwt.sign(
            { id: userId, email: trimmedEmail, role: effectiveRole, staffId: staffProfile?.id },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Update last_active on every successful login
        if (staffProfile) {
            await pool.query(
                "UPDATE staff_members SET last_active = DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%sZ') WHERE email = ?",
                [trimmedEmail]
            ).catch(e => console.error('Failed to update last_active:', e.message));
        }

        console.log(`Login successful: ${trimmedEmail} (role: ${effectiveRole})`);
        return res.json({ token, user: { id: userId, email: trimmedEmail, role: effectiveRole }, staff: staffProfile });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user info from token
app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
        const [staff] = await pool.query('SELECT * FROM staff_members WHERE email = ?', [req.user.email]);
        // Update last_active on every session restore (page load with valid JWT)
        if (staff.length > 0) {
            await pool.query(
                "UPDATE staff_members SET last_active = DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%sZ') WHERE email = ?",
                [req.user.email]
            ).catch(e => console.error('Failed to update last_active on /me:', e.message));
            // Return the record with updated last_active so frontend sees it immediately
            const now = new Date();
            const isoNow = now.toISOString().replace('.000', '').replace(/\.\d{3}/, '');
            staff[0].last_active = isoNow;
        }
        res.json({ user: req.user, staff: staff[0] || null });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch user info' });
    }
});

// Create auth user (admin only)
app.post('/api/auth/create-user', authMiddleware, async (req, res) => {
    const { email, password, role } = req.body;
    try {

        const hash = await bcrypt.hash(password, 10);
        // Use UPSERT logic: if email exists, update the password. This allows admins to use the "reset password" feature
        // or fix users who were created in staff_members but failed to create in users.
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            await pool.query('UPDATE users SET password_hash = ?, role = ? WHERE email = ?', [hash, role || 'staff', email]);
        } else {
            await pool.query('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', [email, hash, role || 'staff']);
        }
        res.json({ status: 'success' });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user', details: error.message });
    }
});

// ═══════════════════════════════════════════
// CUSTOMER PORTAL AUTH & PORTAL ROUTES
// ═══════════════════════════════════════════

// Ensure customer_users table exists and perform migrations
(async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS customer_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                phone VARCHAR(50) DEFAULT NULL,
                whatsapp VARCHAR(50) DEFAULT NULL,
                address TEXT DEFAULT NULL,
                dob VARCHAR(50) DEFAULT NULL,
                password_hash VARCHAR(255) NOT NULL,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('[Customer Auth] customer_users table ensured.');

        // Alterations for customer portal features
        try {
            await pool.query("ALTER TABLE customer_users ADD COLUMN travel_preferences LONGTEXT DEFAULT NULL");
        } catch (e) { /* ignore duplicate column */ }
        try {
            await pool.query("ALTER TABLE customer_users ADD COLUMN referral_code VARCHAR(100) UNIQUE DEFAULT NULL");
        } catch (e) { /* ignore duplicate column */ }
        try {
            await pool.query("ALTER TABLE customer_users ADD COLUMN loyalty_points INT DEFAULT 0");
        } catch (e) { /* ignore duplicate column */ }

        // Seed referral code for existing users if any
        await pool.query("UPDATE customer_users SET referral_code = CONCAT('REF-', UPPER(SUBSTRING(MD5(RAND()), 1, 6))) WHERE referral_code IS NULL");

        // Ensure other customer portal tables exist
        const tables = [
            `CREATE TABLE IF NOT EXISTS customer_wishlists (
                customer_id INT,
                package_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (customer_id, package_id)
            )`,
            `CREATE TABLE IF NOT EXISTS customer_enquiries (
                id VARCHAR(255) PRIMARY KEY,
                customer_id INT,
                name VARCHAR(255),
                email VARCHAR(255),
                phone VARCHAR(50),
                destination VARCHAR(255),
                travel_date DATE,
                pax INT,
                budget VARCHAR(100),
                message TEXT,
                status VARCHAR(50) DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS customer_co_travelers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id INT,
                name VARCHAR(255) NOT NULL,
                relation VARCHAR(100),
                phone VARCHAR(50),
                passport_no VARCHAR(100),
                dob DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS customer_documents (
                id VARCHAR(255) PRIMARY KEY,
                customer_id INT,
                doc_type VARCHAR(100),
                filename VARCHAR(255),
                file_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS customer_loyalty_points (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id INT,
                points INT,
                transaction_type VARCHAR(50),
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS customer_referrals (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id INT,
                referral_code VARCHAR(100),
                referred_email VARCHAR(255),
                status VARCHAR(50) DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS customer_chat_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id INT,
                booking_id VARCHAR(64) DEFAULT NULL,
                sender_type VARCHAR(50),
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS customer_notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id INT,
                type VARCHAR(50),
                title VARCHAR(255),
                message TEXT,
                is_read BOOLEAN DEFAULT false,
                link VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS customer_reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id INT,
                booking_id VARCHAR(64),
                rating INT,
                review_text TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS customer_cancellation_requests (
                id VARCHAR(255) PRIMARY KEY,
                customer_id INT,
                booking_id VARCHAR(64),
                reason TEXT,
                status VARCHAR(50) DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS customer_reschedule_requests (
                id VARCHAR(255) PRIMARY KEY,
                customer_id INT,
                booking_id VARCHAR(64),
                requested_date DATE,
                reason TEXT,
                status VARCHAR(50) DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        for (const sql of tables) {
            await pool.query(sql);
        }
        console.log('[Customer Portal] Tables and schemas ensured.');
    } catch (err) {
        console.error('[Customer Portal] Failed to ensure database tables:', err.message);
    }
})();

// Customer Register
app.post('/api/customer/auth/register', async (req, res) => {
    const { name, email, password, phone, whatsapp } = req.body || {};
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    try {
        const trimmedEmail = email.trim().toLowerCase();
        const [existing] = await pool.query('SELECT id FROM customer_users WHERE email = ?', [trimmedEmail]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
        }
        const hash = await bcrypt.hash(password, 10);
        const refCode = 'REF-' + crypto.randomBytes(3).toString('hex').toUpperCase();
        
        await pool.query(
            'INSERT INTO customer_users (name, email, phone, whatsapp, password_hash, referral_code) VALUES (?, ?, ?, ?, ?, ?)',
            [name.trim(), trimmedEmail, phone || null, whatsapp || phone || null, hash, refCode]
        );
        console.log(`[Customer Auth] New customer registered: ${trimmedEmail}`);
        return res.json({ message: 'Account created successfully!' });
    } catch (err) {
        console.error('[Customer Auth] Register error:', err.message);
        return res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// Customer Login
app.post('/api/customer/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }
    try {
        const trimmedEmail = email.trim().toLowerCase();
        const [rows] = await pool.query('SELECT * FROM customer_users WHERE email = ?', [trimmedEmail]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'No account found with this email. Please register first.' });
        }
        const user = rows[0];
        if (!user.is_active) {
            return res.status(403).json({ error: 'Your account has been deactivated. Please contact support.' });
        }
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Incorrect password. Please try again.' });
        }
        const token = jwt.sign(
            { id: user.id, email: user.email, role: 'customer' },
            JWT_SECRET,
            { expiresIn: '30d' }
        );
        console.log(`[Customer Auth] Customer login: ${trimmedEmail}`);
        return res.json({
            token,
            customer: {
                id: user.id, name: user.name, email: user.email,
                phone: user.phone, whatsapp: user.whatsapp, address: user.address,
                dob: user.dob, referral_code: user.referral_code, loyalty_points: user.loyalty_points || 0,
                travel_preferences: user.travel_preferences, created_at: user.created_at,
            }
        });
    } catch (err) {
        console.error('[Customer Auth] Login error:', err.message);
        return res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// Customer auth middleware
function customerAuthMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
        if (decoded.role !== 'customer') {
            return res.status(403).json({ error: 'Access denied. Customer token required.' });
        }
        req.customer = decoded;
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// Get customer profile
app.get('/api/customer/me', customerAuthMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, name, email, phone, whatsapp, address, dob, travel_preferences, referral_code, loyalty_points, created_at FROM customer_users WHERE id = ?',
            [req.customer.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
        return res.json(rows[0]);
    } catch (err) {
        console.error('[Customer Auth] /me error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Get customer bookings (matches bookings by email)
app.get('/api/customer/bookings', customerAuthMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT id, package_name, destination, travel_date, total_price,
                   payment_status, status, pax_count, pax_adult, pax_child, created_at
            FROM bookings
            WHERE LOWER(customer_email) = ?
            ORDER BY created_at DESC
            LIMIT 50
        `, [req.customer.email]);
        return res.json(rows);
    } catch (err) {
        console.warn('[Customer Auth] Bookings query warning:', err.message);
        return res.json([]);
    }
});

// Get specific booking details
app.get('/api/customer/bookings/:id', customerAuthMiddleware, async (req, res) => {
    try {
        const [bookingRows] = await pool.query(
            'SELECT * FROM bookings WHERE id = ? AND LOWER(customer_email) = ?',
            [req.params.id, req.customer.email]
        );
        if (bookingRows.length === 0) return res.status(404).json({ error: 'Booking not found.' });
        const booking = bookingRows[0];

        const [suppliers] = await pool.query(
            'SELECT service_type, supplier_name, start_date, end_date, notes, driver_name, driver_phone, vehicle_number FROM supplier_bookings WHERE booking_id = ?',
            [booking.id]
        );

        return res.json({
            booking,
            suppliers
        });
    } catch (err) {
        console.error('[Customer Booking Detail] Get error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch booking details.' });
    }
});

// Get transactions for a booking
app.get('/api/customer/bookings/:id/transactions', customerAuthMiddleware, async (req, res) => {
    try {
        const [bookingRows] = await pool.query(
            'SELECT 1 FROM bookings WHERE id = ? AND LOWER(customer_email) = ?',
            [req.params.id, req.customer.email]
        );
        if (bookingRows.length === 0) return res.status(404).json({ error: 'Booking not found.' });

        const [txs] = await pool.query(
            'SELECT * FROM booking_transactions WHERE booking_id = ? ORDER BY date DESC, created_at DESC',
            [req.params.id]
        );
        return res.json(txs);
    } catch (err) {
        console.error('[Customer Booking Transactions] Get error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch payment history.' });
    }
});

// Submit payment transaction receipt / UTR for admin verification
app.post('/api/customer/bookings/:id/pay', customerAuthMiddleware, upload.single('receipt'), async (req, res) => {
    const { amount, method, reference, notes } = req.body || {};
    if (!amount || !method || !reference) {
        return res.status(400).json({ error: 'Amount, payment method, and Reference/UTR are required.' });
    }
    try {
        const [bookingRows] = await pool.query(
            'SELECT package_name FROM bookings WHERE id = ? AND LOWER(customer_email) = ?',
            [req.params.id, req.customer.email]
        );
        if (bookingRows.length === 0) return res.status(404).json({ error: 'Booking not found.' });

        let receiptUrl = null;
        if (req.file) {
            receiptUrl = `/uploads/${req.file.filename}`;
            await saveUploadedFileToDb(req.file);
        }

        await pool.query(`
            INSERT INTO booking_transactions (booking_id, date, amount, type, method, reference, notes, status, receipt_url, recorded_by)
            VALUES (?, CURDATE(), ?, 'Payment', ?, ?, ?, 'Pending', ?, ?)
        `, [req.params.id, amount, method, reference, notes || 'Submitted via customer portal', receiptUrl, req.customer.email]);

        await pool.query(`
            INSERT INTO audit_logs (action, module, details, severity, performed_by, timestamp)
            VALUES ('Submit Payment Receipt', 'Bookings', ?, 'Info', ?, DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s'))
        `, [`Submitted UTR ${reference} for booking ${req.params.id} (${bookingRows[0].package_name})`, req.customer.email]);

        return res.json({ message: 'Payment receipt submitted successfully! Staff will verify it shortly.' });
    } catch (err) {
        console.error('[Customer Booking Pay] Post error:', err.message);
        return res.status(500).json({ error: 'Failed to submit payment details.' });
    }
});

// Apply coupon code to booking
app.post('/api/customer/bookings/:id/apply-coupon', customerAuthMiddleware, async (req, res) => {
    const { couponCode } = req.body || {};
    if (!couponCode) return res.status(400).json({ error: 'Coupon code is required.' });
    try {
        const [bookingRows] = await pool.query(
            'SELECT * FROM bookings WHERE id = ? AND LOWER(customer_email) = ?',
            [req.params.id, req.customer.email]
        );
        if (bookingRows.length === 0) return res.status(404).json({ error: 'Booking not found.' });
        const booking = bookingRows[0];

        if (booking.applied_coupon_code) {
            return res.status(400).json({ error: 'A coupon has already been applied to this booking.' });
        }

        const [coupons] = await pool.query(
            'SELECT * FROM coupons WHERE code = ? AND is_active = true',
            [couponCode.trim().toUpperCase()]
        );
        if (coupons.length === 0) {
            return res.status(400).json({ error: 'Invalid or inactive coupon code.' });
        }
        const coupon = coupons[0];

        const originalPrice = Number(booking.original_price || booking.total_price);
        let discount = 0;
        if (coupon.discount_type === 'percentage') {
            discount = (originalPrice * Number(coupon.discount_value)) / 100;
        } else {
            discount = Number(coupon.discount_value);
        }
        
        if (coupon.max_discount && discount > Number(coupon.max_discount)) {
            discount = Number(coupon.max_discount);
        }

        const newTotalPrice = Math.max(0, originalPrice - discount);

        await pool.query(`
            UPDATE bookings
            SET applied_coupon_code = ?,
                coupon_discount_amount = ?,
                original_price = ?,
                total_price = ?
            WHERE id = ?
        `, [coupon.code, discount, originalPrice, newTotalPrice, req.params.id]);

        return res.json({
            message: `Coupon ${coupon.code} applied! Saved ₹${discount.toLocaleString('en-IN')}`,
            discount,
            newTotalPrice
        });
    } catch (err) {
        console.error('[Customer Booking Coupon] Post error:', err.message);
        return res.status(500).json({ error: 'Failed to apply coupon.' });
    }
});

// Cancellation Request
app.post('/api/customer/bookings/:id/cancel', customerAuthMiddleware, async (req, res) => {
    const { reason } = req.body || {};
    if (!reason) return res.status(400).json({ error: 'Reason for cancellation is required.' });
    const id = crypto.randomBytes(16).toString('hex');
    try {
        const [bookingRows] = await pool.query(
            'SELECT 1 FROM bookings WHERE id = ? AND LOWER(customer_email) = ?',
            [req.params.id, req.customer.email]
        );
        if (bookingRows.length === 0) return res.status(404).json({ error: 'Booking not found.' });

        await pool.query(`
            INSERT INTO customer_cancellation_requests (id, customer_id, booking_id, reason)
            VALUES (?, ?, ?, ?)
        `, [id, req.customer.id, req.params.id, reason]);

        return res.json({ message: 'Cancellation request submitted. Staff will review it.' });
    } catch (err) {
        console.error('[Customer Booking Cancel] Post error:', err.message);
        return res.status(500).json({ error: 'Failed to submit cancellation request.' });
    }
});

// Reschedule Request
app.post('/api/customer/bookings/:id/reschedule', customerAuthMiddleware, async (req, res) => {
    const { requestedDate, reason } = req.body || {};
    if (!requestedDate || !reason) {
        return res.status(400).json({ error: 'Requested travel date and reason are required.' });
    }
    const id = crypto.randomBytes(16).toString('hex');
    try {
        const [bookingRows] = await pool.query(
            'SELECT 1 FROM bookings WHERE id = ? AND LOWER(customer_email) = ?',
            [req.params.id, req.customer.email]
        );
        if (bookingRows.length === 0) return res.status(404).json({ error: 'Booking not found.' });

        await pool.query(`
            INSERT INTO customer_reschedule_requests (id, customer_id, booking_id, requested_date, reason)
            VALUES (?, ?, ?, ?, ?)
        `, [id, req.customer.id, req.params.id, requestedDate, reason]);

        return res.json({ message: 'Reschedule request submitted. Staff will review it.' });
    } catch (err) {
        console.error('[Customer Booking Reschedule] Post error:', err.message);
        return res.status(500).json({ error: 'Failed to submit reschedule request.' });
    }
});

// Get wishlist
app.get('/api/customer/wishlist', customerAuthMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT p.* FROM packages p
            JOIN customer_wishlists w ON w.package_id = p.id
            WHERE w.customer_id = ?
        `, [req.customer.id]);
        return res.json(rows);
    } catch (err) {
        console.error('[Customer Wishlist] Get error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch wishlist.' });
    }
});

// Toggle wishlist
app.post('/api/customer/wishlist/toggle', customerAuthMiddleware, async (req, res) => {
    const { packageId } = req.body || {};
    if (!packageId) return res.status(400).json({ error: 'Package ID is required.' });
    try {
        const [existing] = await pool.query(
            'SELECT 1 FROM customer_wishlists WHERE customer_id = ? AND package_id = ?',
            [req.customer.id, packageId]
        );
        if (existing.length > 0) {
            await pool.query(
                'DELETE FROM customer_wishlists WHERE customer_id = ? AND package_id = ?',
                [req.customer.id, packageId]
            );
            return res.json({ added: false, message: 'Removed from wishlist' });
        } else {
            await pool.query(
                'INSERT INTO customer_wishlists (customer_id, package_id) VALUES (?, ?)',
                [req.customer.id, packageId]
            );
            return res.json({ added: true, message: 'Added to wishlist' });
        }
    } catch (err) {
        console.error('[Customer Wishlist] Toggle error:', err.message);
        return res.status(500).json({ error: 'Failed to toggle wishlist.' });
    }
});

// Get customer enquiries
app.get('/api/customer/enquiries', customerAuthMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM customer_enquiries WHERE customer_id = ? ORDER BY created_at DESC',
            [req.customer.id]
        );
        return res.json(rows);
    } catch (err) {
        console.error('[Customer Enquiry] Get error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch enquiries.' });
    }
});

// Create new enquiry
app.post('/api/customer/enquiries', customerAuthMiddleware, async (req, res) => {
    const { name, email, phone, destination, travel_date, pax, budget, message, packageId } = req.body || {};
    if (!destination) return res.status(400).json({ error: 'Destination is required.' });
    const id = crypto.randomBytes(16).toString('hex');
    const leadId = crypto.randomBytes(16).toString('hex');
    try {
        // ─── Returning Customer Check (Rank 1 + Rank 3 + Rank 4) ───
        const inputPhone = phone || req.customer.phone;
        const normPhone = normalisePhone(inputPhone);
        const matchedCustomer = await findMatchingCustomer(normPhone);
        const leadSource   = matchedCustomer ? 'Returning Customer' : 'Customer Portal';
        const leadPriority = matchedCustomer ? 'High' : 'Medium';
        const linkedCustomerId = matchedCustomer ? matchedCustomer.id : null;
        const isReturning  = matchedCustomer ? 1 : 0;
        if (matchedCustomer) {
            console.log(`[ReturnCustomer] Portal enquiry from ${name || req.customer.name} matched customer: ${matchedCustomer.name} (${matchedCustomer.id})`);
        }
        // ─────────────────────────────────────────────────────────────

        await pool.query(`
            INSERT INTO customer_enquiries (id, customer_id, name, email, phone, destination, travel_date, pax, budget, message)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, req.customer.id, name || req.customer.name, email || req.customer.email, inputPhone || null, destination, travel_date || null, pax || 1, budget || null, message || null]);

        await pool.query(`
            INSERT INTO leads (id, name, email, phone, destination, travelers, budget, preferences,
                               source, status, priority, package_id, customer_id, is_returning_customer)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'New', ?, ?, ?, ?)
        `, [leadId, name || req.customer.name, email || req.customer.email, inputPhone || null,
            destination, pax || 1, budget || null, message || null,
            leadSource, leadPriority, packageId || null, linkedCustomerId, isReturning]);

        return res.json({ message: 'Enquiry submitted successfully!', isReturningCustomer: !!matchedCustomer });
    } catch (err) {
        console.error('[Customer Enquiry] Create error:', err.message);
        return res.status(500).json({ error: 'Failed to submit enquiry.' });
    }
});

// Get co-travelers
app.get('/api/customer/co-travelers', customerAuthMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM customer_co_travelers WHERE customer_id = ? ORDER BY created_at DESC',
            [req.customer.id]
        );
        return res.json(rows);
    } catch (err) {
        console.error('[Customer Co-Travelers] Get error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch co-travelers.' });
    }
});

// Add co-traveler
app.post('/api/customer/co-travelers', customerAuthMiddleware, async (req, res) => {
    const { name, relation, phone, passport_no, dob } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Name is required.' });
    try {
        await pool.query(`
            INSERT INTO customer_co_travelers (customer_id, name, relation, phone, passport_no, dob)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [req.customer.id, name, relation || null, phone || null, passport_no || null, dob || null]);
        return res.json({ message: 'Co-traveler added successfully!' });
    } catch (err) {
        console.error('[Customer Co-Travelers] Create error:', err.message);
        return res.status(500).json({ error: 'Failed to add co-traveler.' });
    }
});

app.delete('/api/customer/co-travelers/:id', customerAuthMiddleware, async (req, res) => {
    try {
        await pool.query(
            'DELETE FROM customer_co_travelers WHERE id = ? AND customer_id = ?',
            [req.params.id, req.customer.id]
        );
        return res.json({ message: 'Co-traveler removed.' });
    } catch (err) {
        console.error('[Customer Co-Travelers] Delete error:', err.message);
        return res.status(500).json({ error: 'Failed to delete co-traveler.' });
    }
});

// Update co-traveler
app.put('/api/customer/co-travelers/:id', customerAuthMiddleware, async (req, res) => {
    const { id } = req.params;
    const { name, relation, phone, passport_no, dob } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Name is required.' });
    try {
        const [result] = await pool.query(`
            UPDATE customer_co_travelers 
            SET name = ?, relation = ?, phone = ?, passport_no = ?, dob = ?
            WHERE id = ? AND customer_id = ?
        `, [name, relation || null, phone || null, passport_no || null, dob || null, id, req.customer.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Co-traveler not found or unauthorized.' });
        }
        return res.json({ message: 'Co-traveler updated successfully!' });
    } catch (err) {
        console.error('[Customer Co-Travelers] Update error:', err.message);
        return res.status(500).json({ error: 'Failed to update co-traveler.' });
    }
});

// Get documents
app.get('/api/customer/documents', customerAuthMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM customer_documents WHERE customer_id = ? ORDER BY created_at DESC',
            [req.customer.id]
        );
        return res.json(rows);
    } catch (err) {
        console.error('[Customer Documents] Get error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch documents.' });
    }
});

// Add document
app.post('/api/customer/documents', customerAuthMiddleware, upload.single('file'), async (req, res) => {
    const { docType } = req.body || {};
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const id = crypto.randomBytes(16).toString('hex');
    const fileUrl = `/uploads/${req.file.filename}`;
    try {
        await saveUploadedFileToDb(req.file);

        await pool.query(`
            INSERT INTO customer_documents (id, customer_id, doc_type, filename, file_url)
            VALUES (?, ?, ?, ?, ?)
        `, [id, req.customer.id, docType || 'Other', req.file.originalname, fileUrl]);
        
        return res.json({ message: 'Document uploaded successfully!', document: { id, doc_type: docType, filename: req.file.originalname, file_url: fileUrl } });
    } catch (err) {
        console.error('[Customer Documents] Upload error:', err.message);
        return res.status(500).json({ error: 'Failed to upload document.' });
    }
});

// Delete document
app.delete('/api/customer/documents/:id', customerAuthMiddleware, async (req, res) => {
    try {
        await pool.query(
            'DELETE FROM customer_documents WHERE id = ? AND customer_id = ?',
            [req.params.id, req.customer.id]
        );
        return res.json({ message: 'Document deleted successfully.' });
    } catch (err) {
        console.error('[Customer Documents] Delete error:', err.message);
        return res.status(500).json({ error: 'Failed to delete document.' });
    }
});

// Get loyalty
app.get('/api/customer/loyalty', customerAuthMiddleware, async (req, res) => {
    try {
        const [customerRows] = await pool.query(
            'SELECT loyalty_points, referral_code FROM customer_users WHERE id = ?',
            [req.customer.id]
        );
        if (customerRows.length === 0) return res.status(404).json({ error: 'Customer not found.' });

        const [history] = await pool.query(
            'SELECT * FROM customer_loyalty_points WHERE customer_id = ? ORDER BY created_at DESC',
            [req.customer.id]
        );

        const [referrals] = await pool.query(
            'SELECT * FROM customer_referrals WHERE customer_id = ? ORDER BY created_at DESC',
            [req.customer.id]
        );

        return res.json({
            points: customerRows[0].loyalty_points || 0,
            referral_code: customerRows[0].referral_code,
            history,
            referrals
        });
    } catch (err) {
        console.error('[Customer Loyalty] Get error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch loyalty details.' });
    }
});

// Add Referral invite
app.post('/api/customer/referral', customerAuthMiddleware, async (req, res) => {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    try {
        const [customerRows] = await pool.query('SELECT referral_code FROM customer_users WHERE id = ?', [req.customer.id]);
        const code = customerRows[0]?.referral_code || 'REF';
        await pool.query(`
            INSERT INTO customer_referrals (customer_id, referral_code, referred_email, status)
            VALUES (?, ?, ?, 'Pending')
        `, [req.customer.id, code, email.trim().toLowerCase()]);
        return res.json({ message: `Referral invitation logged for ${email}!` });
    } catch (err) {
        console.error('[Customer Referral] Post error:', err.message);
        return res.status(500).json({ error: 'Failed to log referral.' });
    }
});

// Get chat
app.get('/api/customer/chat', customerAuthMiddleware, async (req, res) => {
    const { bookingId } = req.query || {};
    try {
        let query = 'SELECT * FROM customer_chat_messages WHERE customer_id = ?';
        const params = [req.customer.id];
        if (bookingId) {
            query += ' AND booking_id = ?';
            params.push(bookingId);
        }
        query += ' ORDER BY created_at ASC LIMIT 100';
        const [rows] = await pool.query(query, params);
        return res.json(rows);
    } catch (err) {
        console.error('[Customer Chat] Get error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch chat logs.' });
    }
});

// Post message
app.post('/api/customer/chat', customerAuthMiddleware, async (req, res) => {
    const { bookingId, message } = req.body || {};
    if (!message) return res.status(400).json({ error: 'Message is required.' });
    try {
        await pool.query(`
            INSERT INTO customer_chat_messages (customer_id, booking_id, sender_type, message)
            VALUES (?, ?, 'customer', ?)
        `, [req.customer.id, bookingId || null, message.trim()]);
        return res.json({ success: true });
    } catch (err) {
        console.error('[Customer Chat] Post error:', err.message);
        return res.status(500).json({ error: 'Failed to send message.' });
    }
});

// Get notifications
app.get('/api/customer/notifications', customerAuthMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM customer_notifications WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50',
            [req.customer.id]
        );
        return res.json(rows);
    } catch (err) {
        console.error('[Customer Notifications] Get error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch notifications.' });
    }
});

// Mark notification as read
app.post('/api/customer/notifications/mark-read', customerAuthMiddleware, async (req, res) => {
    const { id } = req.body || {};
    try {
        if (id) {
            await pool.query(
                'UPDATE customer_notifications SET is_read = true WHERE id = ? AND customer_id = ?',
                [id, req.customer.id]
            );
        } else {
            await pool.query(
                'UPDATE customer_notifications SET is_read = true WHERE customer_id = ?',
                [req.customer.id]
            );
        }
        return res.json({ success: true });
    } catch (err) {
        console.error('[Customer Notifications] Mark read error:', err.message);
        return res.status(500).json({ error: 'Failed to update notifications.' });
    }
});

// Special offers
app.get('/api/customer/special-offers', customerAuthMiddleware, async (req, res) => {
    try {
        const [user] = await pool.query('SELECT dob FROM customer_users WHERE id = ?', [req.customer.id]);
        if (user.length === 0 || !user[0].dob) return res.json({ promo: null });
        
        const dobStr = user[0].dob;
        const todayStr = new Date().toISOString().slice(5, 10);
        
        if (dobStr.includes(todayStr)) {
            return res.json({
                promo: {
                    title: '🎂 Happy Birthday! Special 15% Off',
                    code: 'BDAY15',
                    description: 'Celebrate your special day with 15% off on any of our luxury packages!'
                }
            });
        }
        return res.json({ promo: null });
    } catch (err) {
        return res.json({ promo: null });
    }
});

// Update profile
app.put('/api/customer/profile', customerAuthMiddleware, async (req, res) => {
    const { name, phone, whatsapp, address, dob } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Name is required.' });
    try {
        await pool.query(`
            UPDATE customer_users
            SET name = ?, phone = ?, whatsapp = ?, address = ?, dob = ?
            WHERE id = ?
        `, [name.trim(), phone || null, whatsapp || null, address || null, dob || null, req.customer.id]);
        return res.json({ message: 'Profile updated successfully!' });
    } catch (err) {
        console.error('[Customer Profile] Put error:', err.message);
        return res.status(500).json({ error: 'Failed to update profile.' });
    }
});

// Update preferences
app.put('/api/customer/preferences', customerAuthMiddleware, async (req, res) => {
    const { travel_preferences } = req.body || {};
    try {
        const prefStr = typeof travel_preferences === 'string' ? travel_preferences : JSON.stringify(travel_preferences);
        await pool.query(
            'UPDATE customer_users SET travel_preferences = ? WHERE id = ?',
            [prefStr, req.customer.id]
        );
        return res.json({ message: 'Preferences updated successfully!' });
    } catch (err) {
        console.error('[Customer Preferences] Put error:', err.message);
        return res.status(500).json({ error: 'Failed to update preferences.' });
    }
});

// Change Password
app.post('/api/customer/change-password', customerAuthMiddleware, async (req, res) => {
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Both passwords are required.' });
    try {
        const [rows] = await pool.query('SELECT password_hash FROM customer_users WHERE id = ?', [req.customer.id]);
        const user = rows[0];
        const valid = await bcrypt.compare(oldPassword, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Current password is incorrect.' });
        
        const newHash = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE customer_users SET password_hash = ? WHERE id = ?', [newHash, req.customer.id]);
        return res.json({ message: 'Password changed successfully!' });
    } catch (err) {
        console.error('[Customer Change Password] Post error:', err.message);
        return res.status(500).json({ error: 'Failed to change password.' });
    }
});

// Submit review
app.post('/api/customer/reviews', customerAuthMiddleware, async (req, res) => {
    const { bookingId, rating, reviewText } = req.body || {};
    if (!bookingId || !rating) return res.status(400).json({ error: 'Booking ID and rating are required.' });
    try {
        const [bookingRows] = await pool.query(
            'SELECT package_name, destination FROM bookings WHERE id = ? AND LOWER(customer_email) = ?',
            [bookingId, req.customer.email]
        );
        if (bookingRows.length === 0) return res.status(404).json({ error: 'Booking not found.' });
        const booking = bookingRows[0];

        await pool.query(`
            INSERT INTO customer_reviews (customer_id, booking_id, rating, review_text)
            VALUES (?, ?, ?, ?)
        `, [req.customer.id, bookingId, rating, reviewText || null]);

        const testId = crypto.randomBytes(16).toString('hex');
        await pool.query(`
            INSERT INTO cms_testimonials (id, customer_name, rating, content, package_name, is_active)
            VALUES (?, ?, ?, ?, ?, false)
        `, [testId, req.customer.name, rating, reviewText || 'Loved it!', booking.package_name || booking.destination || 'Tour']);

        return res.json({ message: 'Thank you for your feedback! Your review will be featured soon.' });
    } catch (err) {
        console.error('[Customer Reviews] Post error:', err.message);
        return res.status(500).json({ error: 'Failed to submit review.' });
    }
});


// ═══════════════════════════════════════════
// UNIVERSAL CRUD ROUTES
// ═══════════════════════════════════════════

const PUBLIC_READ_TABLES = new Set([
    'packages', 'cms_banners', 'cms_testimonials', 'cms_gallery_images', 
    'cms_posts', 'master_locations', 'master_hotels', 'master_activities'
]);

function optionalAuthMiddleware(req, res, next) {
    const table = req.params.table;
    if (req.method === 'GET' && PUBLIC_READ_TABLES.has(table)) {
        return next(); // Bypass full auth check for public GET
    }
    return authMiddleware(req, res, next);
}

// Inject an Active-only filter for public package reads (no auth header present)
function injectPackageStatusFilter(req, res, next) {
    if (req.params.table === 'packages' && !req.headers.authorization) {
        // Append an eq_ filter so the generic GET handler restricts to Active
        req.query = { ...req.query, eq_status: 'Active' };
    }
    next();
}

// ─── Custom Endpoints ───
app.get('/api/invoices/stats', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                SUM(total_amount) as totalRevenue,
                SUM(total_amount - amount_paid) as pendingAmount,
                COUNT(CASE WHEN payment_status = 'Paid' AND MONTH(issue_date) = MONTH(CURRENT_DATE()) AND YEAR(issue_date) = YEAR(CURRENT_DATE()) THEN 1 END) as paidThisMonthCount,
                SUM(CASE WHEN due_date < CURRENT_DATE() AND payment_status != 'Paid' THEN (total_amount - amount_paid) ELSE 0 END) as overdueAmount
            FROM invoices
            WHERE status != 'Draft'
        `);
        res.json({ data: rows[0] || {} });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to fetch invoice stats' });
    }
});

// Dedicated staff members fetch to include today's daily attendance logs
app.get('/api/crud/staff_members', authMiddleware, async (req, res) => {
    // Check permission
    if (req.user?.role !== 'admin' && req.user?.role !== 'Admin') {
        // Allow if querying for their own email or ID (self-access bypass)
        const isSelfQuery = (req.query.eq_email && req.query.eq_email === req.user.email) ||
                            (req.query.eq_id && String(req.query.eq_id) === String(req.user.staffId));

        if (!isSelfQuery) {
            const { permissions, isAdmin } = await getStaffPermissionsAndScope(req.user?.email);
            if (!isAdmin && !permissions.staff?.view) {
                return res.status(403).json({ error: 'Unauthorized: Staff view access required.' });
            }
        }
    }

    try {
        let query = `
            SELECT 
                s.*,
                a.status AS attendance_status,
                a.check_in_time,
                a.check_out_time,
                a.location AS current_location
            FROM \`staff_members\` s
            LEFT JOIN \`attendance_logs\` a 
                ON s.id = a.staff_id AND a.date = CURRENT_DATE()
        `;
        const params = [];
        const whereClauses = [];

        // Support standard equality filters (e.g. eq_email=...)
        const eqFilters = Object.entries(req.query).filter(([k]) => k.startsWith('eq_'));
        if (eqFilters.length > 0) {
            eqFilters.forEach(([key, val]) => {
                const col = key.replace('eq_', '');
                if (isValidColumn(col)) {
                    whereClauses.push(`s.\`${col}\` = ?`);
                    params.push(val);
                }
            });
        }

        if (whereClauses.length > 0) {
            query += ' WHERE ' + whereClauses.join(' AND ');
        }

        query += ' ORDER BY s.created_at DESC';

        const [rows] = await pool.query(query, params);
        res.json({ data: rows });
    } catch (error) {
        console.error('GET /staff_members error:', error);
        res.status(500).json({ error: 'Failed to fetch staff members' });
    }
});

// GET all rows from a table
// Supports: ?order=column&asc=true&limit=100&select=col1,col2
// Supports: ?eq_field=value for equality filters
// Supports: ?join=related_table for left joins
app.get('/api/crud/:table', optionalAuthMiddleware, injectPackageStatusFilter, validateTable, permissionGuard, async (req, res) => {
    const { table } = req.params;
    const { order, asc, limit, select } = req.query;

    try {
        // Validate select columns
        let columns = '*';
        if (select) {
            const cols = select.split(',').map(c => c.trim());
            if (!cols.every(isValidColumn)) {
                return res.status(400).json({ error: 'Invalid column name in select parameter' });
            }
            columns = cols.map(c => `\`${c}\``).join(', ');
        }
        let query = `SELECT ${columns} FROM \`${table}\``;
        const params = [];

        // Build WHERE clauses from eq_ prefixed query params
        const whereClauses = [];
        
        // --- Strict RBAC Scoping & Ownership Validation ---
        const { isAdmin } = await getStaffPermissionsAndScope(req.user?.email);
        if (req.user && req.user.role !== 'admin' && req.user.role !== 'Admin' && !isAdmin) {
            const staffId = req.user.staffId;
            if (staffId) {
                const myDataTables = ['leads', 'bookings', 'follow_ups', 'tasks'];
                if (myDataTables.includes(table)) {
                    whereClauses.push(`\`assigned_to\` = ?`);
                    params.push(staffId);
                } else if (table === 'proposals' || table === 'lead_logs') {
                    // Filter by lead ownership (optimized subquery)
                    whereClauses.push(`\`lead_id\` IN (SELECT \`id\` FROM \`leads\` WHERE \`assigned_to\` = ?)`);
                    params.push(staffId);
                } else if (table === 'booking_transactions' || table === 'supplier_bookings') {
                    // Filter by booking ownership (optimized subquery)
                    whereClauses.push(`\`booking_id\` IN (SELECT \`id\` FROM \`bookings\` WHERE \`assigned_to\` = ?)`);
                    params.push(staffId);
                }
            }
        }

        const eqFilters = Object.entries(req.query).filter(([k]) => k.startsWith('eq_'));
        if (eqFilters.length > 0) {
            eqFilters.forEach(([key, val]) => {
                const col = key.replace('eq_', '');
                if (isValidColumn(col)) {
                    whereClauses.push(`\`${col}\` = ?`);
                    params.push(val);
                }
            });
        }

        if (whereClauses.length > 0) {
            query += ' WHERE ' + whereClauses.join(' AND ');
        }

        if (order) {
            if (!isValidColumn(order)) {
                return res.status(400).json({ error: 'Invalid column name in order parameter' });
            }
            const dir = asc === 'true' ? 'ASC' : 'DESC';
            query += ` ORDER BY \`${order}\` ${dir}`;
        }

        if (limit) {
            query += ` LIMIT ${parseInt(limit) || 100}`;
            if (req.query.offset) {
                query += ` OFFSET ${parseInt(req.query.offset) || 0}`;
            } else if (req.query.page) {
                const p = parseInt(req.query.page) || 1;
                const l = parseInt(limit) || 100;
                query += ` OFFSET ${(p - 1) * l}`;
            }
        }

        const [rows] = await pool.query(query, params);
        res.json({ data: rows });
    } catch (error) {
        console.error(`GET /${table} error:`, error);
        res.status(500).json({ error: `Failed to fetch from ${table}` });
    }
});

// GET single row by ID
app.get('/api/crud/:table/:id', optionalAuthMiddleware, validateTable, permissionGuard, async (req, res) => {
    const { table, id } = req.params;
    try {
        const [rows] = await pool.query(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        
        // Ownership check for non-admin users
        const { isAdmin } = await getStaffPermissionsAndScope(req.user?.email);
        if (req.user && req.user.role !== 'admin' && req.user.role !== 'Admin' && !isAdmin) {
            const staffId = req.user.staffId;
            const myDataTables = ['leads', 'bookings', 'follow_ups', 'tasks'];
            if (myDataTables.includes(table)) {
                if (String(rows[0].assigned_to || '') !== String(staffId)) {
                    return res.status(403).json({ error: 'Unauthorized: You do not own this record.' });
                }
            } else if (table === 'proposals' || table === 'lead_logs') {
                const leadId = rows[0].lead_id;
                const [leadRows] = await pool.query('SELECT assigned_to FROM leads WHERE id = ?', [leadId]);
                if (leadRows.length === 0 || String(leadRows[0].assigned_to || '') !== String(staffId)) {
                    return res.status(403).json({ error: 'Unauthorized: You do not own this record.' });
                }
            } else if (table === 'booking_transactions' || table === 'supplier_bookings') {
                const bookingId = rows[0].booking_id;
                const [bookingRows] = await pool.query('SELECT assigned_to FROM bookings WHERE id = ?', [bookingId]);
                if (bookingRows.length === 0 || String(bookingRows[0].assigned_to || '') !== String(staffId)) {
                    return res.status(403).json({ error: 'Unauthorized: You do not own this record.' });
                }
            }
        }
        
        res.json({ data: rows[0] });
    } catch (error) {
        console.error(`GET /${table}/${id} error:`, error);
        res.status(500).json({ error: `Failed to fetch from ${table}` });
    }
});

// Fix #21: When staff_members email is updated, sync to users table
app.put('/api/crud/staff_members/:id', authMiddleware, writeGuard, async (req, res) => {
    const { id } = req.params;
    const body = req.body;
    try {
        if (!body || Object.keys(body).length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        // Fetch old staff details for sync before the update is applied
        const [oldStaffRows] = await pool.query('SELECT email, user_type FROM staff_members WHERE id = ?', [id]);
        const oldStaff = oldStaffRows[0];

        const fields = Object.keys(body).filter(k => isValidColumn(k));
        if (fields.length === 0) return res.status(400).json({ error: 'No valid fields' });
        const values = fields.map(k => {
            const v = body[k];
            return typeof v === 'object' && v !== null ? JSON.stringify(v) : v;
        });
        const setClause = fields.map(f => `\`${f}\` = ?`).join(', ');
        await pool.query(`UPDATE \`staff_members\` SET ${setClause} WHERE id = ?`, [...values, id]);

        // Sync email and user_type changes to the users table
        if (oldStaff) {
            const targetEmail = body.email || oldStaff.email;

            // Sync email if changed
            if (body.email && oldStaff.email !== body.email) {
                await pool.query('UPDATE users SET email = ? WHERE email = ?', [body.email, oldStaff.email])
                    .catch(e => console.error('Email sync to users failed:', e.message));
            }

            // Sync role/user_type if user_type is updated
            if (body.user_type && oldStaff.user_type !== body.user_type) {
                const newRole = body.user_type === 'Admin' ? 'admin' : 'staff';
                await pool.query('UPDATE users SET role = ? WHERE email = ?', [newRole, targetEmail])
                    .catch(e => console.error('Role sync to users failed:', e.message));
            }
        }

        const [updated] = await pool.query('SELECT * FROM `staff_members` WHERE id = ?', [id]);
        res.json({ data: updated[0] || {} });
    } catch (error) {
        console.error(`PUT /staff_members/${id} error:`, error);
        res.status(500).json({ error: 'Failed to update staff member' });
    }
});


// ─── Sanitize DB Body: convert empty-string dates to null ───────────────────
// MySQL stores empty-string dates as 0000-00-00, which Node.js mysql2 returns
// as a JavaScript Date of 1899-11-30. Nullifying them prevents this bug.
const DATE_COLUMNS = new Set([
    'start_date', 'end_date', 'booking_date', 'travel_date', 'departure_date',
    'return_date', 'check_in', 'check_out', 'dob', 'date_of_birth',
    'created_at', 'updated_at', 'scheduled_at', 'completed_at'
]);
function sanitizeDbBody(body) {
    if (!body || typeof body !== 'object') return body;
    const sanitized = { ...body };
    for (const [key, val] of Object.entries(sanitized)) {
        if (DATE_COLUMNS.has(key) && (val === '' || val === undefined)) {
            sanitized[key] = null;
        }
    }
    return sanitized;
}
// ─────────────────────────────────────────────────────────────────────────────

// POST - Insert new row
app.post('/api/crud/:table', authMiddleware, validateTable, writeGuard, permissionGuard, async (req, res) => {
    const { table } = req.params;
    const body = sanitizeDbBody(req.body);
    try {
        // Auto-generate UUID if missing for non-auto-increment tables
        const autoIncrementTables = ['users', 'staff_members', 'audit_logs', 'lead_logs', 'booking_transactions', 'account_transactions'];
        if (!body.id && !autoIncrementTables.includes(table)) {
            body.id = crypto.randomUUID();
        }

        // Default auto-assignment: If a staff (non-admin) creates a record in assigned data tables without an explicit assignee, assign it to them
        const assignedDataTables = ['leads', 'bookings', 'follow_ups', 'tasks'];
        const { isAdmin } = await getStaffPermissionsAndScope(req.user?.email);
        if (assignedDataTables.includes(table) && req.user && req.user.role !== 'admin' && req.user.role !== 'Admin' && !isAdmin) {
            if (body.assigned_to === undefined || body.assigned_to === null || body.assigned_to === '') {
                if (req.user.staffId) {
                    body.assigned_to = req.user.staffId;
                } else if (req.user.email) {
                    const [staffRows] = await pool.query('SELECT id FROM staff_members WHERE email = ?', [req.user.email]);
                    if (staffRows.length > 0) body.assigned_to = staffRows[0].id;
                }
            }
        }

        // Convert JSON objects/arrays to strings for JSON columns
        const columns = Object.keys(body);
        const values = Object.values(body).map(v =>
            typeof v === 'object' && v !== null ? JSON.stringify(v) : v
        );
        const placeholders = columns.map(() => '?').join(', ');
        const colNames = columns.map(c => `\`${c}\``).join(', ');

        const [result] = await pool.query(
            `INSERT INTO \`${table}\` (${colNames}) VALUES (${placeholders})`,
            values
        );

        // Fetch the inserted row using the provided id or the auto-increment insertId
        const fetchedId = body.id || result.insertId;
        const [inserted] = await pool.query(`SELECT * FROM \`${table}\` WHERE id = ?`, [fetchedId]);

        // Server-side audit log
        auditLog('Create', table, `Created record ${fetchedId}`, req.user?.email);

        // Auto-create user record for partners if created via CRUD
        if (table === 'partners' && body.email) {
            const trimmedEmail = body.email.trim().toLowerCase();
            const [existingUser] = await pool.query('SELECT id FROM users WHERE email = ?', [trimmedEmail]);
            if (existingUser.length === 0) {
                const defaultHash = await bcrypt.hash('password123', 10);
                await pool.query(
                    'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
                    [trimmedEmail, defaultHash, 'partner']
                );
                console.log(`Auto-created users record for partner: ${trimmedEmail} (default password: password123)`);
            }
        }

        // Auto-create system note in lead_logs when a lead is tagged in marketing_logs
        if (table === 'marketing_log_leads' && body.lead_id && body.log_id) {
            try {
                const senderEmail = req.user?.email || 'System';
                let senderName = 'System';
                if (req.user?.staffId) {
                    const [[staffMember]] = await pool.query('SELECT name FROM staff_members WHERE id = ?', [req.user.staffId]);
                    if (staffMember) senderName = staffMember.name;
                } else {
                    senderName = senderEmail.split('@')[0];
                }
                const [[log]] = await pool.query('SELECT date FROM marketing_logs WHERE id = ?', [body.log_id]);
                const formattedDate = log && log.date ? new Date(log.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date().toDateString();
                
                await pool.query(
                    `INSERT INTO lead_logs (lead_id, type, content, sender, timestamp) VALUES (?, 'Activity', ?, ?, NOW())`,
                    [body.lead_id, `Touched during daily marketing log on ${formattedDate} by ${senderName}`, senderName]
                );
            } catch (err) {
                console.warn('[Lead Logs Hook] Failed to auto-create lead activity log:', err.message);
            }
        }

        // Auto-create system note in booking_notes when a booking is tagged in marketing_logs
        if (table === 'marketing_log_bookings' && body.booking_id && body.log_id) {
            try {
                const senderEmail = req.user?.email || 'System';
                let senderName = 'System';
                if (req.user?.staffId) {
                    const [[staffMember]] = await pool.query('SELECT name FROM staff_members WHERE id = ?', [req.user.staffId]);
                    if (staffMember) senderName = staffMember.name;
                } else {
                    senderName = senderEmail.split('@')[0];
                }
                const [[log]] = await pool.query('SELECT date FROM marketing_logs WHERE id = ?', [body.log_id]);
                const formattedDate = log && log.date ? new Date(log.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date().toDateString();
                
                // Fetch existing booking notes
                const [[booking]] = await pool.query('SELECT booking_notes FROM bookings WHERE id = ?', [body.booking_id]);
                let notes = [];
                if (booking && booking.booking_notes) {
                    try {
                        notes = typeof booking.booking_notes === 'string' ? JSON.parse(booking.booking_notes) : booking.booking_notes;
                    } catch (e) {
                        notes = [];
                    }
                }
                if (!Array.isArray(notes)) notes = [];

                // Append new system note
                const noteId = crypto.randomUUID();
                notes.push({
                    id: noteId,
                    text: `Touched during daily marketing log on ${formattedDate} by ${senderName}`,
                    date: new Date().toISOString(),
                    author: senderName,
                    isPinned: false
                });

                // Save back to bookings table
                await pool.query(
                    'UPDATE bookings SET booking_notes = ? WHERE id = ?',
                    [JSON.stringify(notes), body.booking_id]
                );
            } catch (err) {
                console.warn('[Booking Notes Hook] Failed to auto-create booking log note:', err.message);
            }
        }

        // Lead & Booking Playbook Triggers on Creation
        if (table === 'leads' && inserted[0]) {
            await generateLeadPlaybook(fetchedId, inserted[0].status, inserted[0].assigned_to, req.user?.email);
        } else if (table === 'bookings' && inserted[0]) {
            await generateBookingPlaybook(fetchedId, inserted[0].type, inserted[0].assigned_to, req.user?.email);
        }

        // ─── Returning Customer Auto-Link for Admin-Created Leads (Rank 1 + Rank 3 + Rank 4) ───
        // Only runs if no customer_id was explicitly provided by the form
        if (table === 'leads' && body.phone && !body.customer_id) {
            try {
                const normPhone = normalisePhone(body.phone);
                const matchedCustomer = await findMatchingCustomer(normPhone);
                if (matchedCustomer) {
                    await pool.query(
                        'UPDATE leads SET customer_id = ?, is_returning_customer = 1 WHERE id = ?',
                        [matchedCustomer.id, fetchedId]
                    );
                    // Refresh the inserted row so the response contains the linked fields
                    const [refreshed] = await pool.query(`SELECT * FROM \`leads\` WHERE id = ?`, [fetchedId]);
                    if (refreshed[0]) inserted[0] = refreshed[0];
                    console.log(`[ReturnCustomer] Admin lead ${fetchedId} auto-linked to customer: ${matchedCustomer.name} (${matchedCustomer.id})`);
                }
            } catch (linkErr) {
                // Non-fatal — lead was already created, just log the warning
                console.warn('[ReturnCustomer] Admin lead link failed (non-fatal):', linkErr.message);
            }
        }
        // ─────────────────────────────────────────────────────────────────────────────────────────

        res.status(201).json({ data: inserted[0] || { id: fetchedId } });
    } catch (error) {
        console.error(`POST /${table} error:`, error);
        res.status(500).json({ error: `Failed to insert into ${table}`, details: error.message });
    }
});

// PUT - Update row by ID
app.put('/api/crud/:table/:id', authMiddleware, validateTable, writeGuard, permissionGuard, async (req, res) => {
    const { table, id } = req.params;
    const body = sanitizeDbBody(req.body);
    try {
        // Enforce that regular staff cannot assign their own records to others unless they have global scope
        const assignedDataTables = ['leads', 'bookings', 'follow_ups', 'tasks'];
        const { isAdmin, queryScope } = await getStaffPermissionsAndScope(req.user?.email);
        if (assignedDataTables.includes(table) && req.user && req.user.role !== 'admin' && req.user.role !== 'Admin' && !isAdmin) {
            if ('assigned_to' in body && queryScope !== 'Global') {
                if (req.user.staffId) {
                    body.assigned_to = req.user.staffId;
                } else if (req.user.email) {
                    const [staffRows] = await pool.query('SELECT id FROM staff_members WHERE email = ?', [req.user.email]);
                    if (staffRows.length > 0) body.assigned_to = staffRows[0].id;
                }
            }
        }

        // Lead & Booking Playbook Triggers on Update (fetch old record before update)
        let oldLead = null;
        let oldBooking = null;
        if (table === 'leads') {
            const [[row]] = await pool.query('SELECT status, assigned_to FROM leads WHERE id = ?', [id]);
            oldLead = row;
        } else if (table === 'bookings') {
            const [[row]] = await pool.query('SELECT type, assigned_to FROM bookings WHERE id = ?', [id]);
            oldBooking = row;
        }

        const setClauses = Object.keys(body).map(col => `\`${col}\` = ?`).join(', ');
        const values = Object.values(body).map(v =>
            typeof v === 'object' && v !== null ? JSON.stringify(v) : v
        );
        values.push(id);

        await pool.query(`UPDATE \`${table}\` SET ${setClauses} WHERE id = ?`, values);

        // Trigger Lead Playbook if status or assignment changes
        if (table === 'leads') {
            const newStatus = body.status !== undefined ? body.status : (oldLead ? oldLead.status : null);
            const newAssignee = body.assigned_to !== undefined ? body.assigned_to : (oldLead ? oldLead.assigned_to : null);
            
            const statusChanged = oldLead && oldLead.status !== body.status && body.status !== undefined;
            const assigneeChanged = oldLead && oldLead.assigned_to !== body.assigned_to && body.assigned_to !== undefined;
            
            if (statusChanged) {
                await generateLeadPlaybook(id, newStatus, newAssignee, req.user?.email);
            } else if (assigneeChanged) {
                await pool.query(
                    "UPDATE tasks SET assigned_to = ? WHERE related_lead_id = ? AND category = 'checklist' AND status = 'Pending'",
                    [newAssignee, id]
                );
                // Propagate assignment to associated bookings
                await pool.query(
                    "UPDATE bookings SET assigned_to = ? WHERE lead_id = ?",
                    [newAssignee, id]
                );
                // Fallback for legacy bookings: sync by matching email/phone
                const [[lead]] = await pool.query("SELECT email, phone FROM leads WHERE id = ?", [id]);
                if (lead && (lead.email || lead.phone)) {
                    await pool.query(
                        "UPDATE bookings SET assigned_to = ? WHERE (customer_email = ? AND customer_email != '') OR (customer_phone = ? AND customer_phone != '')",
                        [newAssignee, lead.email || null, lead.phone || null]
                    );
                }
            }
            
            // Fallback: if no checklist tasks exist, generate them
            const [existingChecklists] = await pool.query(
                "SELECT id FROM tasks WHERE related_lead_id = ? AND category = 'checklist'",
                [id]
            );
            if (existingChecklists.length === 0 && newStatus) {
                await generateLeadPlaybook(id, newStatus, newAssignee, req.user?.email);
            }
        }

        // Trigger Booking Playbook if type or assignment changes
        if (table === 'bookings') {
            const newType = body.type !== undefined ? body.type : (oldBooking ? oldBooking.type : null);
            const newAssignee = body.assigned_to !== undefined ? body.assigned_to : (oldBooking ? oldBooking.assigned_to : null);
            
            const typeChanged = oldBooking && oldBooking.type !== body.type && body.type !== undefined;
            const assigneeChanged = oldBooking && oldBooking.assigned_to !== body.assigned_to && body.assigned_to !== undefined;
            
            if (typeChanged) {
                await generateBookingPlaybook(id, newType, newAssignee, req.user?.email);
            } else if (assigneeChanged) {
                await pool.query(
                    "UPDATE tasks SET assigned_to = ? WHERE related_booking_id = ? AND category = 'checklist' AND status = 'Pending'",
                    [newAssignee, id]
                );
            }
            
            // Fallback: if no checklist tasks exist, generate them
            const [existingChecklists] = await pool.query(
                "SELECT id FROM tasks WHERE related_booking_id = ? AND category = 'checklist'",
                [id]
            );
            if (existingChecklists.length === 0 && newType) {
                await generateBookingPlaybook(id, newType, newAssignee, req.user?.email);
            }
        }

        // Auto-Commission Trigger
        if (table === 'bookings' && (body.status === 'confirmed' || body.status === 'completed' || body.payment_status === 'paid')) {
            autoCalculatePartnerCommission(id);
        }

        // Server-side audit log
        auditLog('Update', table, `Updated record ${id}: ${Object.keys(req.body).join(', ')}`, req.user?.email);

        res.json({ status: 'success' });
    } catch (error) {
        console.error(`PUT /${table}/${id} error:`, error);
        res.status(500).json({ error: `Failed to update ${table}`, details: error.message });
    }
});

// DELETE - Delete row by ID
app.delete('/api/crud/:table/:id', authMiddleware, validateTable, permissionGuard, async (req, res) => {
    const { table, id } = req.params;
    
    // Authorization check: Allow 'admin', 'Editor', or any role containing 'Admin' (case-insensitive) or users with manage permission who own the record (already checked in permissionGuard!)
    const userRole = (req.user?.role || '').toLowerCase();
    const { permissions, isAdmin } = await getStaffPermissionsAndScope(req.user?.email);
    const isAuthorized = isAdmin || userRole === 'admin' || userRole === 'editor' || userRole.includes('admin') || permissions[TABLE_TO_MODULE[table]]?.manage;

    if (!isAuthorized) {
        console.warn(`[Delete] Unauthorized attempt by ${req.user?.email} (Role: ${req.user?.role}) to delete from ${table}`);
        return res.status(403).json({ error: 'Unauthorized: Only Administrators or Editors can permanently delete data.' });
    }

    console.log(`[Delete] ${req.user?.email} is deleting record ${id} from ${table}`);

    try {
        // Handle cascading deletes manually to prevent foreign key constraint errors
        if (table === 'bookings') {
            await pool.query(`DELETE FROM booking_transactions WHERE booking_id = ?`, [id]);
            await pool.query(`DELETE FROM supplier_bookings WHERE booking_id = ?`, [id]);
            console.log(`[Delete] Cleared transactions and supplier bookings for booking ${id}`);
        } else if (table === 'leads') {
            await pool.query(`DELETE FROM lead_logs WHERE lead_id = ?`, [id]);
            await pool.query(`DELETE FROM follow_ups WHERE lead_id = ?`, [id]);
            console.log(`[Delete] Cleared logs and follow-ups for lead ${id}`);
        } else if (table === 'packages') {
            // Nullify packageId references in bookings and leads to prevent broken links
            await pool.query(`UPDATE bookings SET package_id = NULL WHERE package_id = ?`, [id]).catch(() => {});
            await pool.query(`UPDATE leads SET package_id = NULL WHERE package_id = ?`, [id]).catch(() => {});
            console.log(`[Delete] Nullified packageId references for package ${id}`);
        }

        const [result] = await pool.query(`DELETE FROM \`${table}\` WHERE id = ?`, [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }

        // Server-side audit log
        auditLog('Delete', table, `Deleted record ${id}`, req.user?.email);

        res.json({ status: 'success' });
    } catch (error) {
        console.error(`DELETE /${table}/${id} error:`, error.message);
        res.status(500).json({ error: `Failed to delete from ${table}`, details: error.message });
    }
});

// ═══════════════════════════════════════════
// ATOMIC PACKAGE SEAT DECREMENT
// ═══════════════════════════════════════════

// PATCH /api/packages/:id/decrement-seats
// Atomically decrements remaining_seats by 1 using a WHERE guard.
// No auth required — called from the public booking form.
// Returns 409 if no seats available.
app.patch('/api/packages/:id/decrement-seats', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query(
            `UPDATE packages
             SET remaining_seats = remaining_seats - 1
             WHERE id = ? AND remaining_seats IS NOT NULL AND remaining_seats > 0`,
            [id]
        );
        if (result.affectedRows === 0) {
            // Either package not found or no seats available
            const [[pkg]] = await pool.query('SELECT remaining_seats FROM packages WHERE id = ?', [id]);
            if (!pkg) return res.status(404).json({ error: 'Package not found' });
            return res.status(409).json({ error: 'No seats available', remainingSeats: pkg.remaining_seats });
        }
        const [[updated]] = await pool.query('SELECT remaining_seats FROM packages WHERE id = ?', [id]);
        res.json({ status: 'success', remainingSeats: updated?.remaining_seats ?? 0 });
    } catch (error) {
        console.error('[DecrementSeats] Error:', error.message);
        res.status(500).json({ error: 'Failed to decrement seats', details: error.message });
    }
});

// On-demand playbook generation endpoints
app.post('/api/leads/:id/generate-playbook', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const [[lead]] = await pool.query('SELECT status, assigned_to FROM leads WHERE id = ?', [id]);
        if (!lead) return res.status(404).json({ error: 'Lead not found' });
        const targetStatus = status || lead.status;
        await generateLeadPlaybook(id, targetStatus, lead.assigned_to, req.user?.email);
        res.json({ message: 'Lead playbook generated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/bookings/:id/generate-playbook', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { type } = req.body;
    try {
        const [[booking]] = await pool.query('SELECT type, assigned_to FROM bookings WHERE id = ?', [id]);
        if (!booking) return res.status(404).json({ error: 'Booking not found' });
        const targetType = type || booking.type;
        await generateBookingPlaybook(id, targetType, booking.assigned_to, req.user?.email);
        res.json({ message: 'Booking playbook generated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════
// DELETION REQUESTS WORKFLOW
// ═══════════════════════════════════════════

// Get all pending deletion requests (Admin only)
app.get('/api/deletion-requests', authMiddleware, async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
    try {
        const [rows] = await pool.query('SELECT * FROM deletion_requests ORDER BY created_at DESC');
        res.json({ data: rows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch deletion requests' });
    }
});

// Create a new deletion request (Staff)
app.post('/api/deletion-requests', authMiddleware, async (req, res) => {
    const { table_name, record_id, record_name, reason } = req.body;
    try {
        const id = crypto.randomUUID();
        await pool.query(
            'INSERT INTO deletion_requests (id, table_name, record_id, record_name, requested_by, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, table_name, record_id, record_name || 'Unknown', req.user?.email, reason || 'No reason provided', 'pending']
        );
        res.status(201).json({ status: 'success', id });
    } catch (error) {
        console.error('Create deletion request error:', error);
        res.status(500).json({ error: 'Failed to create deletion request' });
    }
});

// Approve a deletion request (Admin)
app.post('/api/deletion-requests/:id/approve', authMiddleware, async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
    const { id } = req.params;
    
    try {
        const [reqs] = await pool.query('SELECT * FROM deletion_requests WHERE id = ?', [id]);
        if (!reqs.length) return res.status(404).json({ error: 'Request not found' });
        
        const request = reqs[0];
        if (request.status !== 'pending') return res.status(400).json({ error: 'Already processed' });

        // Validate table to prevent injection
        if (!ALLOWED_TABLES.has(request.table_name)) {
            return res.status(400).json({ error: 'Invalid table requested' });
        }

        // 1. Handle cascading deletes manually
        if (request.table_name === 'bookings') {
            await pool.query(`DELETE FROM booking_transactions WHERE booking_id = ?`, [request.record_id]);
            await pool.query(`DELETE FROM supplier_bookings WHERE booking_id = ?`, [request.record_id]);
        } else if (request.table_name === 'leads') {
            await pool.query(`DELETE FROM lead_logs WHERE lead_id = ?`, [request.record_id]);
            await pool.query(`DELETE FROM follow_ups WHERE lead_id = ?`, [request.record_id]);
        }

        // 2. Perform actual hard delete
        await pool.query(`DELETE FROM \`${request.table_name}\` WHERE id = ?`, [request.record_id]);
        
        // 2. Mark request as approved
        await pool.query('UPDATE deletion_requests SET status = "approved" WHERE id = ?', [id]);
        
        // 3. Audit log
        auditLog('Delete Approved', request.table_name, `Approved deletion of ${request.record_id} requested by ${request.requested_by}`, req.user?.email);

        res.json({ status: 'success' });
    } catch (error) {
        console.error('Approve deletion error:', error);
        res.status(500).json({ error: 'Failed to approve deletion' });
    }
});

// Reject a deletion request (Admin)
app.post('/api/deletion-requests/:id/reject', authMiddleware, async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
    const { id } = req.params;
    
    try {
        await pool.query('UPDATE deletion_requests SET status = "rejected" WHERE id = ?', [id]);
        res.json({ status: 'success' });
    } catch (error) {
        console.error('Reject deletion error:', error);
        res.status(500).json({ error: 'Failed to reject deletion' });
    }
});

// UPSERT - Insert or update (for daily_inventory etc.)
app.post('/api/crud/:table/upsert', authMiddleware, validateTable, writeGuard, async (req, res) => {
    const { table } = req.params;
    const body = req.body;
    try {
        // Auto-generate UUID if missing for non-auto-increment tables
        const autoIncrementTables = ['users', 'staff_members', 'audit_logs', 'bookings', 'tours', 'packages', 'booking_transactions', 'account_transactions'];
        if (!body.id && !autoIncrementTables.includes(table)) {
            body.id = crypto.randomUUID();
        }

        const columns = Object.keys(body);
        const values = Object.values(body).map(v =>
            typeof v === 'object' && v !== null ? JSON.stringify(v) : v
        );
        const placeholders = columns.map(() => '?').join(', ');
        const colNames = columns.map(c => `\`${c}\``).join(', ');
        const updateClauses = columns.map(c => `\`${c}\` = VALUES(\`${c}\`)`).join(', ');

        await pool.query(
            `INSERT INTO \`${table}\` (${colNames}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClauses}`,
            values
        );
        res.json({ status: 'success' });
    } catch (error) {
        console.error(`UPSERT /${table} error:`, error);
        res.status(500).json({ error: `Failed to upsert into ${table}` });
    }
});

// ═══════════════════════════════════════════
// DEDICATED BOOKING DELETE ENDPOINT
// ═══════════════════════════════════════════

// DELETE /api/bookings/:id — Admin-safe booking deletion with full cascade
app.delete('/api/bookings/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    console.log(`[Booking Delete] Request from ${req.user?.email} (role: ${req.user?.role}) for booking: ${id}`);

    // Check permission & ownership
    const { permissions, isAdmin } = await getStaffPermissionsAndScope(req.user?.email);
    if (req.user?.role !== 'admin' && req.user?.role !== 'Admin' && !isAdmin) {
        if (!permissions.bookings?.manage) {
            return res.status(403).json({ error: 'Unauthorized: Bookings manage permission required.' });
        }
        const [existing] = await pool.query('SELECT assigned_to FROM bookings WHERE id = ?', [id]);
        if (existing.length > 0 && String(existing[0].assigned_to || '') !== String(req.user.staffId)) {
            return res.status(403).json({ error: 'Unauthorized: You do not own this booking.' });
        }
    }

    try {
        // Step 1: Clear related booking_transactions
        const [txResult] = await pool.query('DELETE FROM booking_transactions WHERE booking_id = ?', [id]);
        console.log(`[Booking Delete] Cleared ${txResult.affectedRows} transactions`);

        // Step 2: Clear related supplier_bookings
        const [sbResult] = await pool.query('DELETE FROM supplier_bookings WHERE booking_id = ?', [id]);
        console.log(`[Booking Delete] Cleared ${sbResult.affectedRows} supplier bookings`);

        // Step 3: Delete the booking itself
        const [result] = await pool.query('DELETE FROM bookings WHERE id = ?', [id]);
        console.log(`[Booking Delete] Deleted ${result.affectedRows} booking record(s)`);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Audit log
        auditLog('Delete', 'bookings', `Deleted booking ${id} with ${txResult.affectedRows} transactions and ${sbResult.affectedRows} supplier records`, req.user?.email);

        res.json({ status: 'success', deletedId: id });
    } catch (error) {
        console.error(`[Booking Delete] ERROR for ${id}:`, error.message);
        res.status(500).json({ error: 'Failed to delete booking', details: error.message });
    }
});

// DELETE /api/customers/:id — Dedicated customer deletion with full cascade
app.delete('/api/customers/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    console.log(`[Customer Delete] Request from ${req.user?.email} (role: ${req.user?.role}) for customer: ${id}`);

    // Check permission
    if (req.user?.role !== 'admin' && req.user?.role !== 'Admin') {
        const { permissions, isAdmin } = await getStaffPermissionsAndScope(req.user?.email);
        if (!isAdmin && !permissions.customers?.manage) {
            return res.status(403).json({ error: 'Unauthorized: Customers manage permission required.' });
        }
    }

    try {
        const [result] = await pool.query('DELETE FROM customers WHERE id = ?', [id]);
        console.log(`[Customer Delete] Deleted ${result.affectedRows} customer record(s)`);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        auditLog('Delete', 'customers', `Deleted customer ${id}`, req.user?.email);
        res.json({ status: 'success', deletedId: id });
    } catch (error) {
        console.error(`[Customer Delete] ERROR for ${id}:`, error.message);
        res.status(500).json({ error: 'Failed to delete customer', details: error.message });
    }
});

// POST /api/sync-customers-from-bookings — Backfill customers from all bookings
// Deduplicates by email (primary) or phone (fallback). Safe to run multiple times.
app.post('/api/sync-customers-from-bookings', authMiddleware, async (req, res) => {
    console.log(`[Customer Sync] Triggered by ${req.user?.email}`);

    // Check permission
    if (req.user?.role !== 'admin' && req.user?.role !== 'Admin') {
        const { permissions, isAdmin } = await getStaffPermissionsAndScope(req.user?.email);
        if (!isAdmin && !permissions.customers?.manage) {
            return res.status(403).json({ error: 'Unauthorized: Customers manage permission required.' });
        }
    }

    try {
        const [bookings] = await pool.query('SELECT * FROM bookings ORDER BY created_at ASC');
        const [existingCustomers] = await pool.query('SELECT * FROM customers');

        // Build lookup maps for fast dedup
        const byEmail = new Map(); // email -> customer row
        const byPhone = new Map(); // phone -> customer row
        existingCustomers.forEach(c => {
            if (c.email && c.email.trim()) byEmail.set(c.email.trim().toLowerCase(), c);
            if (c.phone && c.phone.trim()) byPhone.set(c.phone.trim(), c);
        });

        let created = 0, updated = 0, skipped = 0;

        for (const booking of bookings) {
            const name = booking.customer_name || '';
            const email = (booking.customer_email || '').trim().toLowerCase();
            const phone = (booking.customer_phone || '').trim();
            const amount = Number(booking.total_price) || 0;

            if (!name) { skipped++; continue; }

            // Find existing customer
            let existing = null;
            if (email) existing = byEmail.get(email);
            if (!existing && phone) existing = byPhone.get(phone);

            if (existing) {
                // Update aggregates
                const newSpent = (Number(existing.total_spent) || 0) + amount;
                const newCount = (Number(existing.bookings_count) || 0) + 1;
                await pool.query(
                    'UPDATE customers SET total_spent = ?, bookings_count = ? WHERE id = ?',
                    [newSpent, newCount, existing.id]
                );
                // Update map to prevent double-counting if same booking email appears again
                existing.total_spent = newSpent;
                existing.bookings_count = newCount;
                updated++;
            } else {
                // Create new customer from booking data
                const newId = `CUST-BK-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
                await pool.query(
                    `INSERT INTO customers (id, name, email, phone, location, type, status, total_spent, bookings_count, notes, tags, preferences)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [newId, name, email || null, phone || null, '', 'New', 'Active', amount, 1, '[]', '[]', '{}']
                );
                const newCust = { id: newId, name, email, phone, total_spent: amount, bookings_count: 1 };
                if (email) byEmail.set(email, newCust);
                if (phone) byPhone.set(phone, newCust);
                created++;
            }
        }

        console.log(`[Customer Sync] Done — created: ${created}, updated: ${updated}, skipped: ${skipped}`);
        auditLog('Sync', 'customers', `Synced customers from bookings: created=${created}, updated=${updated}`, req.user?.email);
        res.json({ status: 'success', created, updated, skipped });
    } catch (error) {
        console.error('[Customer Sync] Error:', error.message);
        res.status(500).json({ error: 'Failed to sync customers from bookings', details: error.message });
    }
});


app.get('/api/bookings-with-package', authMiddleware, async (req, res) => {
    // Check permission
    const { permissions, isAdmin } = await getStaffPermissionsAndScope(req.user?.email);
    if (req.user?.role !== 'admin' && req.user?.role !== 'Admin' && !isAdmin) {
        if (!permissions.bookings?.view) {
            return res.status(403).json({ error: 'Unauthorized: Bookings view access required.' });
        }
    }

    try {
        let bookingsQuery = 'SELECT b.*, p.name as partner_name, p.company_name as partner_company_name FROM bookings b LEFT JOIN partners p ON b.partner_id = p.id';
        const params = [];
        if (req.user?.role !== 'admin' && req.user?.role !== 'Admin' && !isAdmin) {
            bookingsQuery += ' WHERE b.assigned_to = ?';
            params.push(req.user.staffId);
        }
        bookingsQuery += ' ORDER BY b.created_at DESC';
        const [bookings] = await pool.query(bookingsQuery, params);

        const bookingIds = bookings.map(b => b.id);
        if (bookingIds.length === 0) {
            return res.json({ data: [] });
        }

        const [transactions] = await pool.query(
            `SELECT * FROM booking_transactions WHERE booking_id IN (${bookingIds.map(() => '?').join(',')}) ORDER BY date DESC, created_at DESC`,
            bookingIds
        );
        const [supplierBookings] = await pool.query(
            `SELECT * FROM supplier_bookings WHERE booking_id IN (${bookingIds.map(() => '?').join(',')}) ORDER BY created_at DESC`,
            bookingIds
        );

        // Group transactions by booking_id
        const txByBooking = {};
        transactions.forEach(tx => {
            if (!txByBooking[tx.booking_id]) txByBooking[tx.booking_id] = [];
            txByBooking[tx.booking_id].push(tx);
        });

        const sbByBooking = {};
        supplierBookings.forEach(sb => {
            if (!sbByBooking[sb.booking_id]) sbByBooking[sb.booking_id] = [];
            sbByBooking[sb.booking_id].push(sb);
        });

        const result = bookings.map(b => ({
            ...b,
            booking_transactions: txByBooking[b.id] || [],
            supplier_bookings: sbByBooking[b.id] || []
        }));

        res.json({ data: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// Leads with logs
app.get('/api/leads-with-logs', authMiddleware, async (req, res) => {
    // Check permission
    const { permissions, isAdmin } = await getStaffPermissionsAndScope(req.user?.email);
    if (req.user?.role !== 'admin' && req.user?.role !== 'Admin' && !isAdmin) {
        if (!permissions.leads?.view) {
            return res.status(403).json({ error: 'Unauthorized: Leads view access required.' });
        }
    }

    try {
        // JOIN partners and customers so returning-customer info is available in admin UI (Rank 2)
        let leadsQuery = `
            SELECT l.*,
                   p.name as partner_name, p.company_name as partner_company_name,
                   c.name as matched_customer_name,
                   c.type as matched_customer_type,
                   c.bookings_count as matched_customer_bookings_count
            FROM leads l
            LEFT JOIN partners p ON l.partner_id = p.id
            LEFT JOIN customers c ON l.customer_id = c.id
        `;
        const params = [];
        if (req.user?.role !== 'admin' && req.user?.role !== 'Admin' && !isAdmin) {
            leadsQuery += ' WHERE l.assigned_to = ?';
            params.push(req.user.staffId);
        }
        leadsQuery += ' ORDER BY l.created_at DESC';
        const [leads] = await pool.query(leadsQuery, params);

        const leadIds = leads.map(l => l.id);
        if (leadIds.length === 0) {
            return res.json({ data: [] });
        }

        const [logs] = await pool.query(
            `SELECT * FROM lead_logs WHERE lead_id IN (${leadIds.map(() => '?').join(',')}) ORDER BY timestamp DESC`,
            leadIds
        );

        // Group logs by lead_id
        const logsByLead = {};
        logs.forEach(log => {
            if (!logsByLead[log.lead_id]) logsByLead[log.lead_id] = [];
            logsByLead[log.lead_id].push(log);
        });

        const result = leads.map(lead => ({
            ...lead,
            lead_logs: logsByLead[lead.id] || []
        }));

        res.json({ data: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
});

// Vendors with stats calculated from supplier_bookings
app.get('/api/vendors-with-stats', authMiddleware, async (req, res) => {
    try {
        const [vendors] = await pool.query('SELECT * FROM vendors ORDER BY created_at DESC');
        const [supplierBookings] = await pool.query(`
            SELECT sb.*, b.customer_name, b.booking_date
            FROM supplier_bookings sb
            LEFT JOIN bookings b ON sb.booking_id = b.id
            ORDER BY sb.created_at DESC
        `);
        
        const statsByVendor = {};
        const ledgerByVendor = {};

        supplierBookings.forEach(sb => {
            if (!statsByVendor[sb.vendor_id]) {
                statsByVendor[sb.vendor_id] = { totalCost: 0, totalPaid: 0 };
            }
            statsByVendor[sb.vendor_id].totalCost += Number(sb.cost) || 0;
            statsByVendor[sb.vendor_id].totalPaid += Number(sb.paid_amount) || 0;

            if (!ledgerByVendor[sb.vendor_id]) {
                ledgerByVendor[sb.vendor_id] = [];
            }

            const cost = Number(sb.cost) || 0;
            const paidAmount = Number(sb.paid_amount) || 0;
            const customerLabel = sb.customer_name || sb.booking_id || 'Booking';
            const serviceLabel = sb.service_type || 'Service';

            // Credit: we owe them this cost
            if (cost > 0) {
                ledgerByVendor[sb.vendor_id].push({
                    id: `${sb.id}-cost`,
                    date: sb.booking_date || sb.created_at,
                    description: `${serviceLabel} for ${customerLabel}`,
                    amount: cost,
                    type: 'Credit',
                    reference: sb.booking_id
                });
            }
            // Debit: we paid them this amount
            if (paidAmount > 0) {
                ledgerByVendor[sb.vendor_id].push({
                    id: `${sb.id}-paid`,
                    date: sb.created_at,
                    description: `Payment for ${serviceLabel} (${customerLabel})`,
                    amount: paidAmount,
                    type: 'Debit',
                    reference: sb.booking_id
                });
            }
        });

        const result = vendors.map(v => {
            const stats = statsByVendor[v.id] || { totalCost: 0, totalPaid: 0 };
            
            let manualTransactions = [];
            try {
                if (v.transactions && typeof v.transactions === 'string') {
                    manualTransactions = JSON.parse(v.transactions);
                } else if (Array.isArray(v.transactions)) {
                    manualTransactions = v.transactions;
                }
            } catch(e) {}
            if (!Array.isArray(manualTransactions)) manualTransactions = [];

            const pureManualTransactions = manualTransactions.filter(tx => !tx.id || (!tx.id.includes('-cost') && !tx.id.includes('-paid')));

            let manualPaid = 0;
            pureManualTransactions.forEach(tx => {
                const amount = Number(tx.amount) || 0;
                if (tx.type === 'Debit') manualPaid += amount;
                else if (tx.type === 'Credit') manualPaid -= amount;
            });
            
            const combinedLedger = [
                ...pureManualTransactions,
                ...(ledgerByVendor[v.id] || [])
            ].sort((a,b) => new Date(b.date) - new Date(a.date));

            return {
                ...v,
                total_sales: stats.totalCost,
                balance_due: stats.totalCost - (stats.totalPaid + manualPaid),
                ledger_entries: combinedLedger
            };
        });

        res.json({ data: result });
    } catch (error) {
        console.error('vendors-with-stats error:', error);
        res.status(500).json({ error: 'Failed to fetch vendors with stats: ' + error.message });
    }
});

// Accounts with transactions
app.get('/api/accounts-with-transactions', authMiddleware, async (req, res) => {
    try {
        const [accounts] = await pool.query('SELECT * FROM accounts ORDER BY created_at DESC');
        const [transactions] = await pool.query('SELECT * FROM account_transactions ORDER BY created_at DESC');

        const txByAccount = {};
        transactions.forEach(tx => {
            if (!txByAccount[tx.account_id]) txByAccount[tx.account_id] = [];
            txByAccount[tx.account_id].push(tx);
        });

        const result = accounts.map(acc => ({
            ...acc,
            account_transactions: txByAccount[acc.id] || []
        }));

        res.json({ data: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch accounts' });
    }
});

// Finance: Booking transactions + Expenses with booking context
app.get('/api/finance/booking-transactions', authMiddleware, async (req, res) => {
    try {
        // Query 1: Client payments (booking transactions)
        const [txRows] = await pool.query(`
            SELECT 
                t.id, t.date, t.amount, t.type, t.method, t.reference, t.notes, t.status, t.receipt_url, t.recorded_by,
                t.booking_id as bookingId, t.created_at,
                b.customer_name as customer, b.customer_email as email, b.customer_phone as phone, b.package_id as packageId, b.title as bookingName,
                'booking_payment' as source,
                s.name as recordedByName
            FROM booking_transactions t
            LEFT JOIN bookings b ON t.booking_id = b.id
            LEFT JOIN staff_members s ON t.recorded_by = s.id OR t.recorded_by = s.name
        `);

        // Query 2: Operational expenses
        const [expRows] = await pool.query(`
            SELECT 
                id, date, amount, 'Expense' as type, paymentMethod as method, notes as reference, notes, status, receiptUrl as receipt_url,
                NULL as bookingId, created_at,
                title as customer, NULL as email, NULL as phone, category as packageId,
                'expense' as source
            FROM expenses
        `);

        // Combine and sort by created_at descending
        const combined = [...txRows, ...expRows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        res.json({ data: combined });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch finance transactions', details: error.message });
    }
});

// POST /api/finance/sync-booking-payment
// Called after a transaction is approved or rejected on the Payment Approvals page.
// Re-derives the booking's payment_status from its Verified transactions and persists it.
app.post('/api/finance/sync-booking-payment', authMiddleware, async (req, res) => {
    try {
        const { transactionId } = req.body;
        if (!transactionId) return res.status(400).json({ error: 'transactionId required' });

        // Find the booking_id for this transaction
        const [[tx]] = await pool.query(
            'SELECT booking_id FROM booking_transactions WHERE id = ?', [transactionId]
        );
        if (!tx || !tx.booking_id) return res.json({ status: 'skipped', reason: 'Transaction not found or not a booking tx' });

        const bookingId = tx.booking_id;

        // Get all Verified transactions for this booking
        const [verifiedTxs] = await pool.query(
            "SELECT amount, type FROM booking_transactions WHERE booking_id = ? AND status = 'Verified'",
            [bookingId]
        );

        const netPaid = verifiedTxs.reduce((sum, t) => {
            return sum + (t.type === 'Payment' ? Number(t.amount) : t.type === 'Refund' ? -Number(t.amount) : 0);
        }, 0);

        // Get the booking's total price
        const [[booking]] = await pool.query('SELECT total_price FROM bookings WHERE id = ?', [bookingId]);
        if (!booking) return res.json({ status: 'skipped', reason: 'Booking not found' });

        const totalPrice = Number(booking.total_price || 0);

        let newStatus = 'pending';
        if (totalPrice > 0 && netPaid >= totalPrice) newStatus = 'paid';
        else if (netPaid > 0) newStatus = 'deposit';
        else if (netPaid < 0) newStatus = 'refunded';

        await pool.query('UPDATE bookings SET payment_status = ? WHERE id = ?', [newStatus, bookingId]);

        console.log('[Payment Approval Sync] Booking ' + bookingId + ' payment_status → ' + newStatus + ' (netPaid=' + netPaid + ', total=' + totalPrice + ')');
        auditLog('Finance', 'bookings', 'Payment status synced to ' + newStatus + ' after transaction approval for booking ' + bookingId, req.user?.email);

        res.json({ status: 'ok', bookingId, newPaymentStatus: newStatus, netPaid, totalPrice });
    } catch (error) {
        console.error('[Payment Sync] Error:', error.message);
        res.status(500).json({ error: 'Failed to sync booking payment status', details: error.message });
    }
});


// Follow-ups with lead name
app.get('/api/follow-ups-with-lead', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT f.*, l.name as lead_name 
            FROM follow_ups f 
            LEFT JOIN leads l ON f.lead_id = l.id 
            ORDER BY f.scheduled_at ASC
        `);
        res.json({ data: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch follow-ups' });
    }
});

// ─── Create Staff + Auth User (Atomic) ───
// This single endpoint handles creating both the users auth record AND the staff_members profile.
// No separate auth call needed from the frontend.
app.post('/api/staff/create', authMiddleware, async (req, res) => {
    const { email, password, role, name, user_type, department, status, initials, color, permissions, query_scope, whatsapp_scope, phone } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const trimmedEmail = email.trim();

        // 1. Create or update auth user
        const hash = await bcrypt.hash(password, 10);
        // Map display role to auth role: Admin user_type → 'admin', all others → 'staff'
        const authRole = (user_type === 'Admin') ? 'admin' : 'staff';
        const [existingUser] = await pool.query('SELECT id FROM users WHERE email = ?', [trimmedEmail]);
        if (existingUser.length > 0) {
            await pool.query('UPDATE users SET password_hash = ?, role = ? WHERE email = ?', [hash, authRole, trimmedEmail]);
        } else {
            await pool.query('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', [trimmedEmail, hash, authRole]);
        }

        // 2. Create staff_members record
        const staffPayload = { name, email: trimmedEmail, role, user_type, department, status, initials, color, permissions, query_scope, whatsapp_scope };
        if (phone !== undefined) staffPayload.phone = phone;

        // Serialize JSON fields
        const columns = Object.keys(staffPayload).filter(k => staffPayload[k] !== undefined);
        const values = columns.map(k => {
            const v = staffPayload[k];
            return typeof v === 'object' && v !== null ? JSON.stringify(v) : v;
        });
        const colNames = columns.map(c => `\`${c}\``).join(', ');
        const placeholders = columns.map(() => '?').join(', ');

        const [result] = await pool.query(
            `INSERT INTO \`staff_members\` (${colNames}) VALUES (${placeholders})`,
            values
        );

        const fetchedId = result.insertId;
        const [inserted] = await pool.query('SELECT * FROM `staff_members` WHERE id = ?', [fetchedId]);
        return res.status(201).json({ data: inserted[0] || { id: fetchedId } });
    } catch (error) {
        console.error('Staff create error:', error);
        return res.status(500).json({ error: 'Failed to create staff member', details: error.message });
    }
});

// Fix #13: Sync staff to users — unique random temp password per user
function generateTempPassword() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}

app.post('/api/admin/sync-staff-auth', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admins only' });
    }
    try {
        const [staffMembers] = await pool.query('SELECT * FROM staff_members');
        const created = [];
        for (const staff of staffMembers) {
            const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [staff.email]);
            if (users.length === 0) {
                const tempPass = generateTempPassword();
                const hash = await bcrypt.hash(tempPass, 10);
                await pool.query('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', [staff.email, hash, staff.user_type === 'Admin' ? 'admin' : 'staff']);
                created.push({ name: staff.name, email: staff.email, tempPassword: tempPass });
            }
        }
        res.json({ message: `Sync complete. Created ${created.length} missing auth account(s).`, created });
    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ error: 'Sync failed' });
    }
});

// Fix #3: Atomic Staff Delete — removes from staff_members AND users table
app.delete('/api/staff/:id', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    const { id } = req.params;
    try {
        const [staff] = await pool.query('SELECT email FROM staff_members WHERE id = ?', [id]);
        if (staff.length === 0) return res.status(404).json({ error: 'Staff member not found' });
        const email = staff[0].email;

        // Delete from both tables atomically
        await pool.query('DELETE FROM staff_members WHERE id = ?', [id]);
        await pool.query('DELETE FROM users WHERE email = ?', [email]);

        await auditLog('Delete', 'staff_members', `Staff member ID ${id} (${email}) deleted`, req.user.email);
        res.json({ message: 'Staff member and auth account deleted successfully' });
    } catch (error) {
        console.error('Staff delete error:', error);
        res.status(500).json({ error: 'Failed to delete staff member' });
    }
});

// Fix #1: Reset staff password endpoint
app.post('/api/staff/:id/reset-password', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    try {
        const [staff] = await pool.query('SELECT email FROM staff_members WHERE id = ?', [id]);
        if (staff.length === 0) return res.status(404).json({ error: 'Staff member not found' });
        const email = staff[0].email;
        const hash = await bcrypt.hash(newPassword, 10);
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            await pool.query('UPDATE users SET password_hash = ? WHERE email = ?', [hash, email]);
        } else {
            // Create auth record if missing
            await pool.query('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', [email, hash, 'staff']);
        }
        await auditLog('PasswordReset', 'staff_members', `Password reset for staff ID ${id} (${email})`, req.user.email);
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// ═══════════════════════════════════════════
// PARTNER AUTH ROUTES
// ═══════════════════════════════════════════

// Partner Registration (public)
app.post('/api/partner/auth/register', async (req, res) => {
    const { name, email, password, phone, companyName, location } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });
    try {
        const trimmedEmail = email.trim().toLowerCase();
        const [existing] = await pool.query('SELECT id FROM partners WHERE email = ?', [trimmedEmail]);
        if (existing.length > 0) return res.status(409).json({ error: 'Email already registered' });

        const hash = await bcrypt.hash(password, 10);
        const partnerId = `PART-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        const joinedDate = new Date().toISOString().split('T')[0];

        await pool.query(
            `INSERT INTO partners (id, name, email, phone, company_name, location, status, commission_type, commission_value, joined_date) VALUES (?, ?, ?, ?, ?, ?, 'Pending Approval', 'Percentage', 5.00, ?)`,
            [partnerId, name, trimmedEmail, phone || '', companyName || '', location || '', joinedDate]
        );
        // Create partner user in users table. If email already exists, preserve its existing role!
        await pool.query(
            'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE password_hash = ?',
            [trimmedEmail, hash, 'partner', hash]
        );

        await auditLog('PartnerRegister', 'Partners', `New partner registered: ${name} (${trimmedEmail}). Pending admin approval.`, 'System');
        console.log(`[Email Service Mock] Sending registration confirmation email to partner: ${trimmedEmail}`);
        console.log(`[Email Service Mock] Sending new partner alert to admin: admin@shravyatours.com (Partner: ${name})`);
        res.json({ message: 'Registration successful. Your account is pending admin approval.', partnerId });
    } catch (error) {
        console.error('Partner registration error:', error);
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
});

// Partner Login (returns JWT scoped as 'partner')
app.post('/api/partner/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    try {
        const trimmedEmail = email.trim().toLowerCase();
        // 1. Look up user by email only (allows admins who also have a partner profile to log in)
        const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [trimmedEmail]);
        if (users.length === 0) return res.status(401).json({ error: 'Invalid credentials or account not a partner account' });

        // 2. Validate password
        const valid = await bcrypt.compare(password, users[0].password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        // 3. Ensure they have a valid partner profile
        const [partners] = await pool.query('SELECT * FROM partners WHERE email = ?', [trimmedEmail]);
        if (partners.length === 0) return res.status(401).json({ error: 'Invalid credentials or account not a partner account' });

        const partner = partners[0];
        if (partner.status === 'Blocked') return res.status(403).json({ error: 'Your partner account has been blocked. Please contact support.' });
        if (partner.status === 'Pending Approval') return res.status(403).json({ error: 'Your account is pending admin approval. You will be notified once approved.' });

        const token = jwt.sign(
            { id: partner.id, email: trimmedEmail, role: 'partner', partnerId: partner.id },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        console.log(`Partner login: ${trimmedEmail}`);
        res.json({ token, partner });
    } catch (error) {
        console.error('Partner login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Partner auth middleware (scoped to 'partner' role JWT)
function partnerAuthMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
        if (decoded.role !== 'partner') return res.status(403).json({ error: 'Partner access required' });
        req.partner = decoded;
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// Partner profile (GET self)
app.get('/api/partner/me', partnerAuthMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM partners WHERE id = ?', [req.partner.partnerId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Partner not found' });
        const p = rows[0];

        // Compute stats
        const [leadsRows] = await pool.query('SELECT COUNT(*) as cnt FROM leads WHERE partner_id = ?', [p.id]);
        const [commissionsRows] = await pool.query(
            "SELECT COALESCE(SUM(commission_amount),0) as total_earnings, COALESCE(SUM(CASE WHEN status='Approved' THEN commission_amount ELSE 0 END),0) as pending_payout, COUNT(DISTINCT booking_id) as converted_bookings FROM partner_commissions WHERE partner_id = ?",
            [p.id]
        );
        const stats = commissionsRows[0];
        const bankDetails = p.bank_details ? (typeof p.bank_details === 'string' ? JSON.parse(p.bank_details) : p.bank_details) : null;

        res.json({
            ...p,
            bank_details: bankDetails,
            total_leads_submitted: Number(leadsRows[0].cnt) || 0,
            total_bookings_converted: Number(stats.converted_bookings) || 0,
            total_earnings: Number(stats.total_earnings) || 0,
            pending_payout: Number(stats.pending_payout) || 0,
        });
    } catch (err) {
        console.error('Partner /me error:', err);
        res.status(500).json({ error: 'Failed to fetch partner info' });
    }
});

// Partner update profile (self-service)
app.put('/api/partner/me', partnerAuthMiddleware, async (req, res) => {
    try {
        const { phone, companyName, location, bankDetails } = req.body;
        const updates = {};
        if (phone !== undefined) updates.phone = phone;
        if (companyName !== undefined) updates.company_name = companyName;
        if (location !== undefined) updates.location = location;
        if (bankDetails !== undefined) updates.bank_details = JSON.stringify(bankDetails);
        if (Object.keys(updates).length === 0) return res.json({ message: 'No changes' });
        await pool.query('UPDATE partners SET ? WHERE id = ?', [updates, req.partner.partnerId]);
        res.json({ message: 'Profile updated successfully' });
    } catch (err) {
        console.error('Partner update profile error:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Partner change password
app.post('/api/partner/auth/change-password', partnerAuthMiddleware, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const [users] = await pool.query("SELECT * FROM users WHERE email = ? AND role = 'partner'", [req.partner.email]);
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });
        const valid = await bcrypt.compare(currentPassword, users[0].password_hash);
        if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
        const hash = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password_hash = ? WHERE email = ?', [hash, req.partner.email]);
        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// ═══════════════════════════════════════════
// PARTNER LEAD ROUTES
// ═══════════════════════════════════════════

// Partner: Submit a new lead
// Partner: Submit a new lead
app.post('/api/partner/leads', partnerAuthMiddleware, async (req, res) => {
    try {
        const lead = req.body;
        const currentPartnerId = req.partner.partnerId;

        // Smart Lead Duplication Check (Rejection if email/phone referred by another partner within 30 days and active)
        const { email, phone } = lead;
        if ((email && email.trim() !== '') || (phone && phone.trim() !== '')) {
            const checkQuery = `
                SELECT id, partner_id, created_at, status 
                FROM leads 
                WHERE (
                    (email IS NOT NULL AND email != '' AND email = ?) 
                    OR (phone IS NOT NULL AND phone != '' AND phone = ?)
                ) 
                AND partner_id IS NOT NULL 
                AND partner_id != ?
                AND status NOT IN ('Cold', 'Rejected')
                AND created_at >= NOW() - INTERVAL 30 DAY
                LIMIT 1
            `;
            const [dups] = await pool.query(checkQuery, [
                email ? email.trim().toLowerCase() : '',
                phone ? phone.trim() : '',
                currentPartnerId
            ]);
            if (dups.length > 0) {
                return res.status(409).json({ error: 'Lead already referred. This customer is already linked to another active B2B partner.' });
            }
        }

        // ─── Returning Customer Check (Rank 1 + Rank 3 + Rank 4) ───
        const normPhone = normalisePhone(lead.phone);
        const matchedCustomer = await findMatchingCustomer(normPhone);
        const linkedCustomerId = matchedCustomer ? matchedCustomer.id : null;
        const isReturning     = matchedCustomer ? 1 : 0;
        // For partner leads: keep source as 'Partner Referral' but bump priority if returning
        const leadPriority = matchedCustomer ? 'High' : 'Medium';
        if (matchedCustomer) {
            console.log(`[ReturnCustomer] Partner lead from ${lead.name} matched customer: ${matchedCustomer.name} (${matchedCustomer.id})`);
        }
        // ──────────────────────────────────────────────────────────

        const leadId = `PLEAD-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        await pool.query(
            `INSERT INTO leads (id, name, email, phone, location, destination, start_date, end_date, travelers, budget, type, status, priority, potential_value, source, preferences, partner_id, package_id, customer_id, is_returning_customer, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'New', ?, ?, 'Partner Referral', ?, ?, ?, ?, ?, NOW())`,
            [
                leadId,
                lead.name, lead.email || '', lead.phone || '',
                lead.location || '', lead.destination || '',
                lead.startDate || null, lead.endDate || null,
                lead.travelers || '2 Adults', lead.budget || 'Flexible',
                lead.type || 'Tour',
                leadPriority,
                Number(lead.potentialValue) || 0,
                lead.preferences || '',
                currentPartnerId,
                lead.packageId || null,
                linkedCustomerId,
                isReturning
            ]
        );
        res.json({ message: 'Lead submitted successfully', leadId, isReturningCustomer: !!matchedCustomer });
    } catch (err) {
        console.error('Partner submit lead error:', err);
        res.status(500).json({ error: 'Failed to submit lead' });
    }
});

// Partner: Get my submitted leads with status tracking
app.get('/api/partner/leads', partnerAuthMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT l.id, l.name, l.email, l.phone, l.destination, l.start_date, l.end_date, 
             l.travelers, l.budget, l.status, l.potential_value, l.created_at,
             b.id as booking_id, b.total_price as booking_amount
             FROM leads l
             LEFT JOIN bookings b ON b.partner_id = ? AND b.customer_email = l.email
             WHERE l.partner_id = ?
             ORDER BY l.created_at DESC`,
            [req.partner.partnerId, req.partner.partnerId]
        );
        res.json({ data: rows });
    } catch (err) {
        console.error('Partner get leads error:', err);
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
});

// Partner: Get logs/chat for a specific lead
app.get('/api/partner/leads/:id/logs', partnerAuthMiddleware, async (req, res) => {
    try {
        const leadId = req.params.id;
        const partnerId = req.partner.partnerId;

        // Verify lead belongs to partner
        const [leads] = await pool.query('SELECT id FROM leads WHERE id = ? AND partner_id = ?', [leadId, partnerId]);
        if (leads.length === 0) {
            return res.status(404).json({ error: 'Lead not found or unauthorized' });
        }

        const [rows] = await pool.query(
            'SELECT * FROM lead_logs WHERE lead_id = ? ORDER BY timestamp DESC',
            [leadId]
        );
        res.json({ data: rows });
    } catch (err) {
        console.error('Partner get lead logs error:', err);
        res.status(500).json({ error: 'Failed to fetch lead logs' });
    }
});

// Partner: Send a chat message/note on a lead
app.post('/api/partner/leads/:id/logs', partnerAuthMiddleware, async (req, res) => {
    try {
        const leadId = req.params.id;
        const partnerId = req.partner.partnerId;
        const { content } = req.body;
        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'Message content is required' });
        }

        // Verify lead belongs to partner
        const [leads] = await pool.query('SELECT id, name FROM leads WHERE id = ? AND partner_id = ?', [leadId, partnerId]);
        if (leads.length === 0) {
            return res.status(404).json({ error: 'Lead not found or unauthorized' });
        }

        // Get partner name or company name for the sender field
        const [partners] = await pool.query('SELECT name, company_name FROM partners WHERE id = ?', [partnerId]);
        const partnerName = partners.length > 0 ? (partners[0].company_name || partners[0].name) : 'Partner';

        await pool.query(
            `INSERT INTO lead_logs (lead_id, type, content, sender, timestamp) VALUES (?, 'Chat', ?, ?, NOW())`,
            [leadId, content.trim(), partnerName]
        );
        res.json({ message: 'Message sent successfully' });
    } catch (err) {
        console.error('Partner send lead log error:', err);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Staff/Admin: Post a log or chat message to a lead
app.post('/api/leads/:id/logs', authMiddleware, async (req, res) => {
    try {
        const leadId = req.params.id;
        const { content, type } = req.body;
        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'Log content is required' });
        }

        // Resolve staff name
        let senderName = 'System';
        if (req.user?.staffId) {
            const [staff] = await pool.query('SELECT name FROM staff_members WHERE id = ?', [req.user.staffId]);
            if (staff.length > 0) senderName = staff[0].name;
        } else if (req.user?.role === 'admin') {
            senderName = 'Admin';
        }

        await pool.query(
            `INSERT INTO lead_logs (lead_id, type, content, sender, timestamp) VALUES (?, ?, ?, ?, NOW())`,
            [leadId, type || 'Chat', content.trim(), senderName]
        );
        res.json({ message: 'Log added successfully' });
    } catch (err) {
        console.error('Admin add lead log error:', err);
        res.status(500).json({ error: 'Failed to add log' });
    }
});

// Partner: Get analytics and performance metrics
app.get('/api/partner/analytics', partnerAuthMiddleware, async (req, res) => {
    try {
        const partnerId = req.partner.partnerId;

        // 1. Monthly Earnings (last 6 months)
        const earningsQuery = `
            SELECT 
                DATE_FORMAT(created_at, '%b %Y') as month,
                COALESCE(SUM(commission_amount), 0) as amount
            FROM partner_commissions
            WHERE partner_id = ? AND status != 'Rejected'
            GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b %Y')
            ORDER BY MIN(created_at) ASC
            LIMIT 6
        `;
        const [earnings] = await pool.query(earningsQuery, [partnerId]);

        // 2. Lead Conversion (count by status)
        const funnelQuery = `
            SELECT status, COUNT(*) as count
            FROM leads
            WHERE partner_id = ?
            GROUP BY status
        `;
        const [funnel] = await pool.query(funnelQuery, [partnerId]);

        // 3. Top Destinations Booked
        const destinationsQuery = `
            SELECT destination, COUNT(*) as count, COALESCE(SUM(potential_value), 0) as value
            FROM leads
            WHERE partner_id = ?
            GROUP BY destination
            ORDER BY count DESC
            LIMIT 5
        `;
        const [destinations] = await pool.query(destinationsQuery, [partnerId]);

        res.json({
            earnings: earnings || [],
            funnel: funnel || [],
            destinations: destinations || []
        });
    } catch (err) {
        console.error('Partner analytics error:', err);
        res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
});

// ═══════════════════════════════════════════
// PARTNER COMMISSION ROUTES
// ═══════════════════════════════════════════

// Partner: Get my commissions / earnings
app.get('/api/partner/commissions', partnerAuthMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT pc.*, b.customer_name as customer_name, b.title as booking_title
             FROM partner_commissions pc
             LEFT JOIN bookings b ON b.id = pc.booking_id
             WHERE pc.partner_id = ?
             ORDER BY pc.created_at DESC`,
            [req.partner.partnerId]
        );
        res.json({ data: rows });
    } catch (err) {
        console.error('Partner get commissions error:', err);
        res.status(500).json({ error: 'Failed to fetch commissions' });
    }
});

// ═══════════════════════════════════════════
// ADMIN: PARTNER MANAGEMENT ROUTES
// ═══════════════════════════════════════════

// Middleware to check if user is admin OR has partners.manage permission
async function requirePartnerAdmin(req, res, next) {
    if (req.user?.role === 'admin') return next();
    if (req.user?.staffId) {
        try {
            const [rows] = await pool.query('SELECT permissions FROM staff_members WHERE id = ?', [req.user.staffId]);
            if (rows.length > 0) {
                let perms = rows[0].permissions;
                if (typeof perms === 'string') {
                    try { perms = JSON.parse(perms); } catch(e) { perms = {}; }
                }
                if (perms?.partners?.manage === true) {
                    return next();
                }
            }
        } catch (e) {
            console.error('Permission check error:', e);
        }
    }
    return res.status(403).json({ error: 'Unauthorized' });
}

// Admin: Get all partners with stats
app.get('/api/admin/partners', authMiddleware, async (req, res) => {
    try {
        const [partners] = await pool.query('SELECT * FROM partners ORDER BY created_at DESC');
        const enriched = await Promise.all(partners.map(async (p) => {
            const [leadsRows] = await pool.query('SELECT COUNT(*) as cnt FROM leads WHERE partner_id = ?', [p.id]);
            const [commRows] = await pool.query(
                `SELECT 
                  COALESCE(SUM(commission_amount), 0) as total_earnings,
                  COALESCE(SUM(CASE WHEN status='Approved' THEN commission_amount ELSE 0 END), 0) as pending_payout,
                  COUNT(DISTINCT booking_id) as converted_bookings
                 FROM partner_commissions WHERE partner_id = ?`,
                [p.id]
            );
            const stats = commRows[0];
            const bankDetails = p.bank_details ? (typeof p.bank_details === 'string' ? JSON.parse(p.bank_details) : p.bank_details) : null;
            return {
                ...p,
                bank_details: bankDetails,
                total_leads_submitted: Number(leadsRows[0].cnt) || 0,
                total_bookings_converted: Number(stats.converted_bookings) || 0,
                total_earnings: Number(stats.total_earnings) || 0,
                pending_payout: Number(stats.pending_payout) || 0,
            };
        }));
        res.json({ data: enriched });
    } catch (err) {
        console.error('Admin get partners error:', err);
        res.status(500).json({ error: 'Failed to fetch partners' });
    }
});

// Admin: Add new partner manually
app.post('/api/admin/partners', authMiddleware, requirePartnerAdmin, async (req, res) => {
    const { name, email, password, phone, companyName, location, commissionType, commissionValue, cabCommissionType, cabCommissionValue, busCommissionType, busCommissionValue, trainCommissionType, trainCommissionValue, flightCommissionType, flightCommissionValue, status, bankDetails } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });
    
    try {
        const trimmedEmail = email.trim().toLowerCase();
        const [existing] = await pool.query('SELECT id FROM partners WHERE email = ?', [trimmedEmail]);
        if (existing.length > 0) return res.status(409).json({ error: 'Email already registered' });
 
        const hash = await bcrypt.hash(password, 10);
        const partnerId = `PART-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        const joinedDate = new Date().toISOString().split('T')[0];
        
        const finalStatus = status || 'Active';
        const finalCommType = commissionType || 'Percentage';
        const finalCommValue = commissionValue || 5.00;
        const finalCabCommType = cabCommissionType || 'Flat_Amount';
        const finalCabCommValue = cabCommissionValue !== undefined ? cabCommissionValue : 300.00;
        const finalBusCommType = busCommissionType || 'Flat_Amount';
        const finalBusCommValue = busCommissionValue !== undefined ? busCommissionValue : 150.00;
        const finalTrainCommType = trainCommissionType || 'Flat_Amount';
        const finalTrainCommValue = trainCommissionValue !== undefined ? trainCommissionValue : 100.00;
        const finalFlightCommType = flightCommissionType || 'Flat_Amount';
        const finalFlightCommValue = flightCommissionValue !== undefined ? flightCommissionValue : 200.00;
        const finalBankDetails = bankDetails ? JSON.stringify(bankDetails) : null;
 
        await pool.query(
            `INSERT INTO partners (id, name, email, phone, company_name, location, status, commission_type, commission_value, cab_commission_type, cab_commission_value, bus_commission_type, bus_commission_value, train_commission_type, train_commission_value, flight_commission_type, flight_commission_value, joined_date, bank_details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [partnerId, name, trimmedEmail, phone || '', companyName || '', location || '', finalStatus, finalCommType, finalCommValue, finalCabCommType, finalCabCommValue, finalBusCommType, finalBusCommValue, finalTrainCommType, finalTrainCommValue, finalFlightCommType, finalFlightCommValue, joinedDate, finalBankDetails]
        );
        
        // Create partner user in users table with role 'partner'
        await pool.query(
            'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE password_hash = ?, role = ?',
            [trimmedEmail, hash, 'partner', hash, 'partner']
        );
 
        await auditLog('AdminPartnerAdd', 'Partners', `Admin manually added partner: ${name} (${trimmedEmail}).`, req.user.email);
        res.json({ message: 'Partner added successfully', partnerId });
    } catch (error) {
        console.error('Admin add partner error:', error);
        res.status(500).json({ error: 'Failed to add partner', details: error.message });
    }
});


// Admin: Get single partner
app.get('/api/admin/partners/:id', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM partners WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Partner not found' });
        const p = rows[0];
        const bankDetails = p.bank_details ? JSON.parse(p.bank_details) : null;
        res.json({ data: { ...p, bank_details: bankDetails } });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch partner' });
    }
});

// Admin: Get partner details (deep-inspection for drawer/profile)
app.get('/api/admin/partners/:id/details', authMiddleware, async (req, res) => {
    try {
        const partnerId = req.params.id;
        const [partners] = await pool.query('SELECT * FROM partners WHERE id = ?', [partnerId]);
        if (partners.length === 0) return res.status(404).json({ error: 'Partner not found' });
        const p = partners[0];
        
        // Parse bank details safely
        let bankDetails = null;
        if (p.bank_details) {
            try {
                bankDetails = typeof p.bank_details === 'string' ? JSON.parse(p.bank_details) : p.bank_details;
            } catch (e) {
                console.error('Failed to parse bank details JSON:', e);
            }
        }

        // Query leads
        const [leads] = await pool.query('SELECT * FROM leads WHERE partner_id = ? ORDER BY created_at DESC', [partnerId]);

        // Query bookings & commissions
        const [commissions] = await pool.query(
            `SELECT pc.*, b.customer_name, b.title as booking_title, b.status as booking_status, b.payment_status as booking_payment_status
             FROM partner_commissions pc
             LEFT JOIN bookings b ON pc.booking_id = b.id
             WHERE pc.partner_id = ?
             ORDER BY pc.created_at DESC`,
            [partnerId]
        );

        // Compute live ledger financial statistics
        const totalLeads = leads.length;
        const bookingsConverted = commissions.filter(c => c.status !== 'Rejected').length; // count of non-rejected commissions
        
        let totalEarnings = 0;
        let amountPaid = 0;
        let amountApproved = 0;
        let amountPending = 0;
        let amountRejected = 0;

        commissions.forEach(c => {
            const amt = Number(c.commission_amount) || 0;
            if (c.status === 'Paid') {
                amountPaid += amt;
                totalEarnings += amt;
            } else if (c.status === 'Approved') {
                amountApproved += amt;
                totalEarnings += amt;
            } else if (c.status === 'Pending') {
                amountPending += amt;
                totalEarnings += amt;
            } else if (c.status === 'Rejected') {
                amountRejected += amt;
            }
        });

        const conversionRate = totalLeads > 0 ? Math.round((bookingsConverted / totalLeads) * 100) : 0;

        res.json({
            data: {
                partner: {
                    ...p,
                    bank_details: bankDetails
                },
                leads,
                commissions,
                stats: {
                    totalLeads,
                    bookingsConverted,
                    totalEarnings,
                    amountPaid,
                    amountApproved,
                    amountPending,
                    amountRejected,
                    conversionRate
                }
            }
        });
    } catch (err) {
        console.error('Admin get partner details error:', err);
        res.status(500).json({ error: 'Failed to fetch partner details' });
    }
});

// Admin: Approve partner
app.patch('/api/admin/partners/:id/approve', authMiddleware, requirePartnerAdmin, async (req, res) => {
    try {
        await pool.query("UPDATE partners SET status = 'Active' WHERE id = ?", [req.params.id]);
        
        // Simulated Email Notification
        const [p] = await pool.query("SELECT email FROM partners WHERE id = ?", [req.params.id]);
        if (p.length) {
            console.log(`[Email Service Mock] Sending approval email to partner: ${p[0].email}`);
        }
        await auditLog('PartnerApprove', 'Partners', `Partner ID ${req.params.id} approved.`, req.user.email);
        res.json({ message: 'Partner approved' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to approve partner' });
    }
});

// Admin: Block partner
app.patch('/api/admin/partners/:id/block', authMiddleware, requirePartnerAdmin, async (req, res) => {
    try {
        await pool.query("UPDATE partners SET status = 'Blocked' WHERE id = ?", [req.params.id]);
        await auditLog('PartnerBlock', 'Partners', `Partner ID ${req.params.id} blocked.`, req.user.email);
        res.json({ message: 'Partner blocked' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to block partner' });
    }
});

// Admin: Update partner commission config
app.put('/api/admin/partners/:id', authMiddleware, requirePartnerAdmin, async (req, res) => {
    try {
        const { commissionType, commissionValue, cabCommissionType, cabCommissionValue, busCommissionType, busCommissionValue, trainCommissionType, trainCommissionValue, flightCommissionType, flightCommissionValue, status, notes, bankDetails } = req.body;
        const updates = {};
        if (commissionType !== undefined) updates.commission_type = commissionType;
        if (commissionValue !== undefined) updates.commission_value = commissionValue;
        if (cabCommissionType !== undefined) updates.cab_commission_type = cabCommissionType;
        if (cabCommissionValue !== undefined) updates.cab_commission_value = cabCommissionValue;
        if (busCommissionType !== undefined) updates.bus_commission_type = busCommissionType;
        if (busCommissionValue !== undefined) updates.bus_commission_value = busCommissionValue;
        if (trainCommissionType !== undefined) updates.train_commission_type = trainCommissionType;
        if (trainCommissionValue !== undefined) updates.train_commission_value = trainCommissionValue;
        if (flightCommissionType !== undefined) updates.flight_commission_type = flightCommissionType;
        if (flightCommissionValue !== undefined) updates.flight_commission_value = flightCommissionValue;
        if (status !== undefined) updates.status = status;
        if (notes !== undefined) updates.notes = notes;
        if (bankDetails !== undefined) updates.bank_details = JSON.stringify(bankDetails);
        if (Object.keys(updates).length === 0) return res.json({ message: 'No changes' });
        await pool.query('UPDATE partners SET ? WHERE id = ?', [updates, req.params.id]);
        await auditLog('PartnerUpdate', 'Partners', `Partner ID ${req.params.id} updated.`, req.user.email);
        res.json({ message: 'Partner updated' });
    } catch (err) {
        console.error('Admin update partner error:', err);
        res.status(500).json({ error: 'Failed to update partner' });
    }
});

// Admin: Delete partner
app.delete('/api/admin/partners/:id', authMiddleware, requirePartnerAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM partners WHERE id = ?', [req.params.id]);
        await pool.query("DELETE FROM users WHERE email = (SELECT email FROM partners WHERE id = ?) AND role = 'partner'", [req.params.id]).catch(()=>{});
        res.json({ message: 'Partner deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete partner' });
    }
});

// Admin: Get all commissions (for payout management)
app.get('/api/admin/partner-commissions', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT pc.*, p.name as partner_name, p.email as partner_email,
             b.customer_name, b.title as booking_title
             FROM partner_commissions pc
             LEFT JOIN partners p ON p.id = pc.partner_id
             LEFT JOIN bookings b ON b.id = pc.booking_id
             ORDER BY pc.created_at DESC`
        );
        res.json({ data: rows });
    } catch (err) {
        console.error('Admin get commissions error:', err);
        res.status(500).json({ error: 'Failed to fetch commissions' });
    }
});

// Admin: Approve commission (mark as Approved)
app.patch('/api/admin/partner-commissions/:id/approve', authMiddleware, requirePartnerAdmin, async (req, res) => {
    try {
        await pool.query("UPDATE partner_commissions SET status = 'Approved' WHERE id = ?", [req.params.id]);
        await auditLog('CommissionApprove', 'Partners', `Commission ${req.params.id} approved.`, req.user.email);
        res.json({ message: 'Commission approved' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to approve commission' });
    }
});

// Admin: Mark commission as Paid
app.patch('/api/admin/partner-commissions/:id/pay', authMiddleware, requirePartnerAdmin, async (req, res) => {
    try {
        await pool.query(
            "UPDATE partner_commissions SET status = 'Paid', paid_at = NOW() WHERE id = ?",
            [req.params.id]
        );
        
        // Simulated Email Notification
        const [c] = await pool.query("SELECT p.email, pc.commission_amount FROM partner_commissions pc JOIN partners p ON pc.partner_id = p.id WHERE pc.id = ?", [req.params.id]);
        if (c.length) {
            console.log(`[Email Service Mock] Sending payout confirmation email to partner: ${c[0].email} for ₹${c[0].commission_amount}`);
        }
        await auditLog('CommissionPaid', 'Partners', `Commission ${req.params.id} marked as Paid.`, req.user.email);
        res.json({ message: 'Commission marked as paid' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to mark commission as paid' });
    }
});

// Admin: Reject commission
app.patch('/api/admin/partner-commissions/:id/reject', authMiddleware, requirePartnerAdmin, async (req, res) => {
    try {
        const { notes } = req.body || {};
        await pool.query(
            "UPDATE partner_commissions SET status = 'Rejected', notes = ? WHERE id = ?",
            [notes || null, req.params.id]
        );
        await auditLog('CommissionReject', 'Partners', `Commission ${req.params.id} rejected.`, req.user.email);
        res.json({ message: 'Commission rejected' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to reject commission' });
    }
});

// Internal helper: Auto-calculate commission when a booking becomes 'completed' or 'paid'
// Called from booking status update route
async function autoCalculatePartnerCommission(bookingId) {
    try {
        const [bookings] = await pool.query('SELECT * FROM bookings WHERE id = ?', [bookingId]);
        if (bookings.length === 0) return;
        const booking = bookings[0];
        if (!booking.partner_id) return; // No partner linked

        // Check if commission already exists for this booking
        const [existing] = await pool.query('SELECT id FROM partner_commissions WHERE booking_id = ?', [bookingId]);
        if (existing.length > 0) return; // Already created

        const [partners] = await pool.query('SELECT * FROM partners WHERE id = ?', [booking.partner_id]);
        if (partners.length === 0) return;
        const partner = partners[0];

        const bookingAmount = Number(booking.total_price) || 0;
        let commissionAmount = 0;
        let commissionType = partner.commission_type;
        let commissionRate = Number(partner.commission_value);

        // Check if package has override
        if (booking.package_id) {
            const [packages] = await pool.query('SELECT partner_commission_type, partner_commission_value FROM packages WHERE id = ?', [booking.package_id]);
            if (packages.length > 0) {
                const pkg = packages[0];
                if (pkg.partner_commission_value !== null && pkg.partner_commission_value !== undefined) {
                    commissionType = pkg.partner_commission_type || 'Percentage';
                    commissionRate = Number(pkg.partner_commission_value);
                    console.log(`[Commission] Using package override: ${commissionRate} (${commissionType})`);
                }
            }
        } else if (booking.type === 'Car') {
            // Check if cab-only booking (type 'Car') and has custom partner cab rate
            if (partner.cab_commission_value !== null && partner.cab_commission_value !== undefined) {
                commissionType = partner.cab_commission_type || 'Flat_Amount';
                commissionRate = Number(partner.cab_commission_value);
                console.log(`[Commission] Using partner cab booking rate: ${commissionRate} (${commissionType})`);
            }
        } else if (booking.type === 'Bus') {
            // Check if bus-only booking (type 'Bus') and has custom partner bus rate
            if (partner.bus_commission_value !== null && partner.bus_commission_value !== undefined) {
                commissionType = partner.bus_commission_type || 'Flat_Amount';
                commissionRate = Number(partner.bus_commission_value);
                console.log(`[Commission] Using partner bus booking rate: ${commissionRate} (${commissionType})`);
            }
        } else if (booking.type === 'Train') {
            // Check if train-only booking (type 'Train') and has custom partner train rate
            if (partner.train_commission_value !== null && partner.train_commission_value !== undefined) {
                commissionType = partner.train_commission_type || 'Flat_Amount';
                commissionRate = Number(partner.train_commission_value);
                console.log(`[Commission] Using partner train booking rate: ${commissionRate} (${commissionType})`);
            }
        } else if (booking.type === 'Flight') {
            // Check if flight-only booking (type 'Flight') and has custom partner flight rate
            if (partner.flight_commission_value !== null && partner.flight_commission_value !== undefined) {
                commissionType = partner.flight_commission_type || 'Flat_Amount';
                commissionRate = Number(partner.flight_commission_value);
                console.log(`[Commission] Using partner flight booking rate: ${commissionRate} (${commissionType})`);
            }
        }

        if (commissionType === 'Percentage') {
            commissionAmount = (bookingAmount * commissionRate) / 100;
        } else {
            commissionAmount = commissionRate;
        }

        const commId = `COMM-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        await pool.query(
            `INSERT INTO partner_commissions (id, partner_id, booking_id, booking_amount, commission_type, commission_rate, commission_amount, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')`,
            [commId, booking.partner_id, bookingId, bookingAmount, commissionType, commissionRate, commissionAmount]
        );
        console.log(`[Commission] Auto-created commission ${commId} for partner ${booking.partner_id}: ₹${commissionAmount.toFixed(2)}`);
    } catch (err) {
        console.error('[Commission] Auto-calculate failed:', err.message);
    }
}

// ─── Coupons Application & Detachment Endpoints ───

// POST /api/coupons/apply
app.post('/api/coupons/apply', authMiddleware, async (req, res) => {
    const { couponCode, bookingId } = req.body || {};
    if (!couponCode || !bookingId) {
        return res.status(400).json({ error: 'couponCode and bookingId are required' });
    }

    try {
        // 1. Get booking
        const [[booking]] = await pool.query('SELECT * FROM bookings WHERE id = ?', [bookingId]);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // 2. Get coupon
        const [[coupon]] = await pool.query('SELECT * FROM coupons WHERE code = ?', [couponCode.trim().toUpperCase()]);
        if (!coupon) {
            return res.status(404).json({ error: 'Coupon code not found' });
        }

        // 3. Validation Checks
        if (coupon.status !== 'Active') {
            return res.status(400).json({ error: `Coupon is not active (Status: ${coupon.status})` });
        }

        const currentDate = new Date().toISOString().split('T')[0];
        if (coupon.valid_from) {
            const validFromStr = new Date(coupon.valid_from).toISOString().split('T')[0];
            if (currentDate < validFromStr) {
                return res.status(400).json({ error: 'Coupon validity period has not started yet' });
            }
        }
        if (coupon.valid_to) {
            const validToStr = new Date(coupon.valid_to).toISOString().split('T')[0];
            if (currentDate > validToStr) {
                return res.status(400).json({ error: 'Coupon has expired' });
            }
        }

        if (coupon.is_used) {
            return res.status(400).json({ error: 'This coupon has been locked or already used' });
        }

        // Determine current booking price (use original_price if already discounted, else total_price)
        const currentBasePrice = Number(booking.original_price !== null ? booking.original_price : booking.total_price) || 0;

        if (coupon.min_booking_amount && currentBasePrice < Number(coupon.min_booking_amount)) {
            return res.status(400).json({ error: `Booking amount (₹${currentBasePrice}) is less than the minimum required spend (₹${coupon.min_booking_amount})` });
        }

        if (coupon.type === 'ToursOnly' && booking.type !== 'Tour') {
            return res.status(400).json({ error: 'This coupon can only be applied to Tour bookings' });
        }

        // 4. Calculate discount
        let discount = 0;
        if (coupon.discount_type === 'Percentage') {
            discount = currentBasePrice * (Number(coupon.discount_value) / 100);
        } else {
            discount = Number(coupon.discount_value);
        }
        // Cap discount at total price
        if (discount > currentBasePrice) {
            discount = currentBasePrice;
        }

        const newTotalPrice = currentBasePrice - discount;

        // 5. Run DB Transaction to Apply
        await pool.query('START TRANSACTION');

        // Update booking
        await pool.query(
            `UPDATE bookings 
             SET original_price = ?, coupon_discount_amount = ?, applied_coupon_code = ?, total_price = ? 
             WHERE id = ?`,
            [currentBasePrice, discount, coupon.code, newTotalPrice, bookingId]
        );

        // Update coupon usage count
        await pool.query(
            `UPDATE coupons SET use_count = use_count + 1 WHERE id = ?`,
            [coupon.id]
        );

        await pool.query('COMMIT');

        // Audit Log
        await auditLog('Apply Coupon', 'bookings', `Applied coupon ${coupon.code} to booking ${booking.id} (Saved ₹${discount})`, req.user?.email);

        // Fetch updated booking
        const [[updatedBooking]] = await pool.query('SELECT * FROM bookings WHERE id = ?', [bookingId]);
        res.json({
            status: 'success',
            message: `Coupon ${coupon.code} successfully applied! Discount of ₹${discount} applied.`,
            booking: updatedBooking
        });

    } catch (error) {
        await pool.query('ROLLBACK').catch(() => {});
        console.error('[Apply Coupon Error]:', error.message);
        res.status(500).json({ error: 'Failed to apply coupon', details: error.message });
    }
});

// POST /api/coupons/detach
app.post('/api/coupons/detach', authMiddleware, async (req, res) => {
    const { bookingId } = req.body || {};
    if (!bookingId) {
        return res.status(400).json({ error: 'bookingId is required' });
    }

    try {
        // 1. Get booking
        const [[booking]] = await pool.query('SELECT * FROM bookings WHERE id = ?', [bookingId]);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (!booking.applied_coupon_code) {
            return res.status(400).json({ error: 'No coupon is currently applied to this booking' });
        }

        // 2. Get coupon
        const [[coupon]] = await pool.query('SELECT * FROM coupons WHERE code = ?', [booking.applied_coupon_code]);

        // 3. Run DB Transaction to Detach
        await pool.query('START TRANSACTION');

        const originalPrice = booking.original_price !== null ? booking.original_price : booking.total_price;

        // Restore booking values
        await pool.query(
            `UPDATE bookings 
             SET total_price = ?, original_price = NULL, coupon_discount_amount = 0.00, applied_coupon_code = NULL 
             WHERE id = ?`,
            [originalPrice, bookingId]
        );

        // Decrement coupon usage if coupon exists
        if (coupon) {
            await pool.query(
                `UPDATE coupons SET use_count = GREATEST(0, use_count - 1) WHERE id = ?`,
                [coupon.id]
            );
        }

        await pool.query('COMMIT');

        // Audit Log
        await auditLog('Detach Coupon', 'bookings', `Removed coupon ${booking.applied_coupon_code} from booking ${booking.id}`, req.user?.email);

        // Fetch updated booking
        const [[updatedBooking]] = await pool.query('SELECT * FROM bookings WHERE id = ?', [bookingId]);
        res.json({
            status: 'success',
            message: 'Coupon removed successfully. Price restored.',
            booking: updatedBooking
        });

    } catch (error) {
        await pool.query('ROLLBACK').catch(() => {});
        console.error('[Detach Coupon Error]:', error.message);
        res.status(500).json({ error: 'Failed to detach coupon', details: error.message });
    }
});

// ═══════════════════════════════════════════
// TRENDING DESTINATIONS API
// ═══════════════════════════════════════════

// Helper to fetch destinations with dynamic package ids and count
let trendingDestinationsCache = null;

async function fetchTrendingDestinationsWithLinks(isAdmin = false) {
    if (!isAdmin && trendingDestinationsCache) {
        return trendingDestinationsCache;
    }

    const queryStr = isAdmin
        ? 'SELECT * FROM trending_destinations ORDER BY sort_order ASC, created_at ASC'
        : 'SELECT * FROM trending_destinations WHERE is_active = true ORDER BY sort_order ASC, created_at ASC';
    const [dests] = await pool.query(queryStr);
    
    if (dests.length === 0) {
        if (!isAdmin) trendingDestinationsCache = [];
        return [];
    }

    // Fetch all package linkages
    const [links] = await pool.query('SELECT trending_destination_id, package_id FROM trending_destination_packages');
    
    // Group links by destination id
    const linksMap = {};
    for (const link of links) {
        const dId = link.trending_destination_id;
        if (!linksMap[dId]) linksMap[dId] = [];
        linksMap[dId].push(link.package_id);
    }

    // Attach package_ids and set package_count dynamically
    for (const dest of dests) {
        dest.package_ids = linksMap[dest.id] || [];
        dest.package_count = dest.package_ids.length;
    }

    if (!isAdmin) {
        trendingDestinationsCache = dests;
    }

    return dests;
}

// GET all active trending destinations (public)
app.get('/api/trending-destinations', async (req, res) => {
    try {
        const dests = await fetchTrendingDestinationsWithLinks(false);
        res.json({ data: dests });
    } catch (err) {
        console.error('[TrendingDest GET]', err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET all trending destinations (admin — includes inactive)
app.get('/api/trending-destinations/all', authMiddleware, async (req, res) => {
    try {
        const dests = await fetchTrendingDestinationsWithLinks(true);
        res.json({ data: dests });
    } catch (err) {
        console.error('[TrendingDest GET ALL]', err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST create trending destination (admin)
app.post('/api/trending-destinations', authMiddleware, async (req, res) => {
    try {
        const { id, name, country, region, image_url, badge, badge_color, stat_label, sort_order, is_active, package_ids } = req.body;
        const destId = id || crypto.randomUUID();
        const pkgCount = Array.isArray(package_ids) ? package_ids.length : 0;
        
        await pool.query(
            `INSERT INTO trending_destinations (id, name, country, region, image_url, badge, badge_color, stat_label, package_count, sort_order, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [destId, name, country || null, region || null, image_url, badge || null, badge_color || '#ef4444', stat_label || null, pkgCount, sort_order || 0, is_active !== false]
        );

        // Insert package linkages
        if (Array.isArray(package_ids) && package_ids.length > 0) {
            for (const pkgId of package_ids) {
                await pool.query(
                    'INSERT IGNORE INTO trending_destination_packages (trending_destination_id, package_id) VALUES (?, ?)',
                    [destId, pkgId]
                );
            }
        }

        const [rows] = await pool.query('SELECT * FROM trending_destinations WHERE id = ?', [destId]);
        const dest = rows[0];
        dest.package_ids = package_ids || [];
        dest.package_count = dest.package_ids.length;

        // Invalidate cache
        trendingDestinationsCache = null;

        res.json({ data: dest });
    } catch (err) {
        console.error('[TrendingDest POST]', err.message);
        res.status(500).json({ error: err.message });
    }
});

// PUT update trending destination (admin)
app.put('/api/trending-destinations/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const fields = req.body;
        const allowed = ['name','country','region','image_url','badge','badge_color','stat_label','sort_order','is_active'];
        const updates = [];
        const values = [];
        for (const key of allowed) {
            if (fields[key] !== undefined) {
                updates.push(`\`${key}\` = ?`);
                values.push(fields[key]);
            }
        }

        const packageIds = fields.package_ids;
        if (Array.isArray(packageIds)) {
            updates.push('`package_count` = ?');
            values.push(packageIds.length);
        }

        if (updates.length > 0) {
            values.push(id);
            await pool.query(`UPDATE trending_destinations SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        if (Array.isArray(packageIds)) {
            // Remove old links
            await pool.query('DELETE FROM trending_destination_packages WHERE trending_destination_id = ?', [id]);
            // Insert new links
            for (const pkgId of packageIds) {
                await pool.query(
                    'INSERT IGNORE INTO trending_destination_packages (trending_destination_id, package_id) VALUES (?, ?)',
                    [id, pkgId]
                );
            }
        }

        const [rows] = await pool.query('SELECT * FROM trending_destinations WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Destination not found' });
        const dest = rows[0];

        const [links] = await pool.query('SELECT package_id FROM trending_destination_packages WHERE trending_destination_id = ?', [id]);
        dest.package_ids = links.map(l => l.package_id);
        dest.package_count = dest.package_ids.length;

        // Invalidate cache
        trendingDestinationsCache = null;

        res.json({ data: dest });
    } catch (err) {
        console.error('[TrendingDest PUT]', err.message);
        res.status(500).json({ error: err.message });
    }
});

// DELETE trending destination (admin)
app.delete('/api/trending-destinations/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM trending_destinations WHERE id = ?', [id]);

        // Invalidate cache
        trendingDestinationsCache = null;

        res.json({ success: true });
    } catch (err) {
        console.error('[TrendingDest DELETE]', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════
// SERVE REACT FRONTEND (Production)
// ═══════════════════════════════════════════
// ─── File Upload Route ───
// Accepts multipart image uploads, saves to public/uploads, returns public URL
app.post('/api/upload', authMiddleware, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded or file type not allowed.' });
    }
    
    // Save to DB for persistence
    await saveUploadedFileToDb(req.file);

    // Return the public-accessible URL for this file
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});

// Serve static files from the React build (includes /uploads/)
app.use(express.static(path.join(__dirname, 'public')));
// Explicitly serve uploads directory too
app.use('/uploads', express.static(uploadsDir));

// Fallback auto-healing route to restore deleted images from DB
app.get('/uploads/:filename', async (req, res) => {
    const { filename } = req.params;
    try {
        const [rows] = await pool.query(
            'SELECT mime_type, data FROM uploaded_files WHERE filename = ?',
            [filename]
        );
        if (rows.length > 0) {
            const { mime_type, data } = rows[0];
            const targetPath = path.join(uploadsDir, filename);
            
            // Ensure uploads directory exists
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            
            // Write to local disk cache
            fs.writeFileSync(targetPath, data);
            console.log(`[Auto-Heal] Restored file to disk: ${filename}`);
            
            res.setHeader('Content-Type', mime_type);
            return res.send(data);
        }
    } catch (err) {
        console.error('[Auto-Heal Error]', err.message);
    }
    res.status(404).send('Not Found');
});

// Catch-all: send React's index.html for any non-API route (SPA routing)
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// ═══════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════
// Fix #17: Expose available playbook keys so frontend can dynamically populate the dropdown
app.get('/api/playbook-keys', authMiddleware, (req, res) => {
    res.json({
        leadStages: Object.keys(LEAD_STAGE_PLAYBOOKS),
        bookingTypes: Object.keys(BOOKING_TYPE_PLAYBOOKS)
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server running on port ${PORT}`);
    // Run DB migration on startup to add new task columns
    await runMigration();
    syncLocalUploadsToDb();
});
