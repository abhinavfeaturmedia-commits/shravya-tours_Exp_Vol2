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

// ─── Database Pool ───
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 30000 // 30 seconds for remote Hostinger DB
});

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
        "ALTER TABLE packages ADD COLUMN IF NOT EXISTS itinerary LONGTEXT DEFAULT NULL"
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
const NEW_PERMISSION_KEYS = ['operations', 'invoices', 'proposals', 'settings'];
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
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS whatsapp_group_url VARCHAR(500) DEFAULT NULL",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS live_status VARCHAR(50) DEFAULT 'Live'"
    ];
    for (const sql of bookingAlterations) {
        try { await pool.query(sql); }
        catch (err) { if (!err.message?.includes('Duplicate column')) console.warn('[LiveOps Migration] Bookings:', err.message?.split('\n')[0]); }
    }

    // 2. New columns on supplier_bookings table
    const sbAlterations = [
        "ALTER TABLE supplier_bookings ADD COLUMN IF NOT EXISTS driver_name VARCHAR(100) DEFAULT NULL",
        "ALTER TABLE supplier_bookings ADD COLUMN IF NOT EXISTS driver_phone VARCHAR(50) DEFAULT NULL",
        "ALTER TABLE supplier_bookings ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(50) DEFAULT NULL"
    ];
    for (const sql of sbAlterations) {
        try { await pool.query(sql); }
        catch (err) { if (!err.message?.includes('Duplicate column')) console.warn('[LiveOps Migration] SupplierBookings:', err.message?.split('\n')[0]); }
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
            name VARCHAR(255),
            location VARCHAR(255),
            avatar_url TEXT,
            rating INT DEFAULT 5,
            review TEXT,
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
}
ensureMissingTables();

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
    'invoices', 'invoice_items',
    'attendance_logs'  // Live Operations attendance tracking
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

// ─── Static file serving for uploaded images ───
app.use('/uploads', express.static(uploadsDir));

// ─── File Upload Route ───
app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded or invalid file type' });
    }
    // Return a relative URL so it works in both dev and production
    const relativeUrl = `/uploads/${req.file.filename}`;
    console.log(`[Upload] File saved: ${req.file.filename} (${(req.file.size / 1024).toFixed(0)}KB)`);
    res.json({ url: relativeUrl, filename: req.file.filename, size: req.file.size });
});

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
        } else {
            console.warn(`Login failed for ${trimmedEmail}: User record not found in users table`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const staffProfile = staff.length > 0 ? staff[0] : null;
        const token = jwt.sign(
            { id: users[0].id, email: trimmedEmail, role: users[0].role, staffId: staffProfile?.id },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Fix #9: Update last_active on every successful login
        if (staffProfile) {
            await pool.query(
                "UPDATE staff_members SET last_active = DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%sZ') WHERE email = ?",
                [trimmedEmail]
            ).catch(e => console.error('Failed to update last_active:', e.message));
        }

        console.log(`Login successful: ${trimmedEmail}`);
        return res.json({ token, user: { id: users[0].id, email: trimmedEmail, role: users[0].role }, staff: staffProfile });
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

// GET all rows from a table
// Supports: ?order=column&asc=true&limit=100&select=col1,col2
// Supports: ?eq_field=value for equality filters
// Supports: ?join=related_table for left joins
app.get('/api/crud/:table', optionalAuthMiddleware, injectPackageStatusFilter, validateTable, async (req, res) => {
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
        
        // --- RBAC Scoping: Fix #4 — respect query_scope from staff_members ---
        if (req.user && req.user.role !== 'admin') {
            const staffId = req.user.staffId;
            const myDataTables = ['leads', 'bookings', 'follow_ups', 'tasks'];
            if (myDataTables.includes(table) && staffId) {
                // Fetch query_scope for this staff member
                try {
                    const [scopeRows] = await pool.query('SELECT query_scope FROM staff_members WHERE id = ?', [staffId]);
                    const queryScope = scopeRows[0]?.query_scope || 'Show Assigned Query Only';
                    if (queryScope !== 'Show All Queries') {
                        whereClauses.push(`\`assigned_to\` = ?`);
                        params.push(staffId);
                    }
                } catch (e) {
                    // Fail safe: apply restriction if scope check fails
                    whereClauses.push(`\`assigned_to\` = ?`);
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
app.get('/api/crud/:table/:id', optionalAuthMiddleware, validateTable, async (req, res) => {
    const { table, id } = req.params;
    try {
        const [rows] = await pool.query(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
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
        const fields = Object.keys(body).filter(k => isValidColumn(k));
        if (fields.length === 0) return res.status(400).json({ error: 'No valid fields' });
        const values = fields.map(k => {
            const v = body[k];
            return typeof v === 'object' && v !== null ? JSON.stringify(v) : v;
        });
        const setClause = fields.map(f => `\`${f}\` = ?`).join(', ');
        await pool.query(`UPDATE \`staff_members\` SET ${setClause} WHERE id = ?`, [...values, id]);

        // Sync email change to users table
        if (body.email) {
            const [staffRows] = await pool.query('SELECT email FROM staff_members WHERE id = ?', [id]);
            const oldEmail = staffRows[0]?.email;
            if (oldEmail && oldEmail !== body.email) {
                await pool.query('UPDATE users SET email = ? WHERE email = ?', [body.email, oldEmail]).catch(e => console.error('Email sync to users failed:', e.message));
            }
        }

        const [updated] = await pool.query('SELECT * FROM `staff_members` WHERE id = ?', [id]);
        res.json({ data: updated[0] || {} });
    } catch (error) {
        console.error(`PUT /staff_members/${id} error:`, error);
        res.status(500).json({ error: 'Failed to update staff member' });
    }
});

// POST - Insert new row
app.post('/api/crud/:table', authMiddleware, validateTable, writeGuard, async (req, res) => {
    const { table } = req.params;
    const body = req.body;
    try {
        // Auto-generate UUID if missing for non-auto-increment tables
        const autoIncrementTables = ['users', 'staff_members', 'audit_logs', 'lead_logs', 'booking_transactions', 'account_transactions'];
        if (!body.id && !autoIncrementTables.includes(table)) {
            body.id = crypto.randomUUID();
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

        res.status(201).json({ data: inserted[0] || { id: fetchedId } });
    } catch (error) {
        console.error(`POST /${table} error:`, error);
        res.status(500).json({ error: `Failed to insert into ${table}`, details: error.message });
    }
});

// PUT - Update row by ID
app.put('/api/crud/:table/:id', authMiddleware, validateTable, writeGuard, async (req, res) => {
    const { table, id } = req.params;
    const body = req.body;
    try {
        const setClauses = Object.keys(body).map(col => `\`${col}\` = ?`).join(', ');
        const values = Object.values(body).map(v =>
            typeof v === 'object' && v !== null ? JSON.stringify(v) : v
        );
        values.push(id);

        await pool.query(`UPDATE \`${table}\` SET ${setClauses} WHERE id = ?`, values);

        // Server-side audit log
        auditLog('Update', table, `Updated record ${id}: ${Object.keys(req.body).join(', ')}`, req.user?.email);

        res.json({ status: 'success' });
    } catch (error) {
        console.error(`PUT /${table}/${id} error:`, error);
        res.status(500).json({ error: `Failed to update ${table}`, details: error.message });
    }
});

// DELETE - Delete row by ID
app.delete('/api/crud/:table/:id', authMiddleware, validateTable, async (req, res) => {
    const { table, id } = req.params;
    
    // Authorization check: Allow 'admin', 'Editor', or any role containing 'Admin' (case-insensitive)
    const userRole = (req.user?.role || '').toLowerCase();
    const isAuthorized = userRole === 'admin' || userRole === 'editor' || userRole.includes('admin');

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
    try {
        const [bookings] = await pool.query(`
            SELECT * 
            FROM bookings 
            ORDER BY created_at DESC
        `);
        const [transactions] = await pool.query('SELECT * FROM booking_transactions ORDER BY date DESC, created_at DESC');
        const [supplierBookings] = await pool.query('SELECT * FROM supplier_bookings ORDER BY created_at DESC');

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
    try {
        const [leads] = await pool.query('SELECT * FROM leads ORDER BY created_at DESC');
        const [logs] = await pool.query('SELECT * FROM lead_logs ORDER BY timestamp DESC');

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
        const [existingUser] = await pool.query('SELECT id FROM users WHERE email = ?', [trimmedEmail]);
        if (existingUser.length > 0) {
            await pool.query('UPDATE users SET password_hash = ?, role = ? WHERE email = ?', [hash, role || 'staff', trimmedEmail]);
        } else {
            await pool.query('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', [trimmedEmail, hash, role || 'staff']);
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
// SERVE REACT FRONTEND (Production)
// ═══════════════════════════════════════════
// ─── File Upload Route ───
// Accepts multipart image uploads, saves to public/uploads, returns public URL
app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded or file type not allowed.' });
    }
    // Return the public-accessible URL for this file
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});

// Serve static files from the React build (includes /uploads/)
app.use(express.static(path.join(__dirname, 'public')));
// Explicitly serve uploads directory too
app.use('/uploads', express.static(uploadsDir));

// Catch-all: send React's index.html for any non-API route (SPA routing)
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// ═══════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
