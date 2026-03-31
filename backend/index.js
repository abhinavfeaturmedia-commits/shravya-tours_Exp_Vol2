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
        } catch(err) {
            // Ignore if column already exists or table doesn't exist
        }
    } catch (err) {
        console.error('Failed to ensure users table:', err.message);
    }
}
ensureUsersTable();

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
    'assignment_rules', 'user_activities', 'audit_logs', 'settings'
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
            'INSERT INTO `audit_logs` (id, action, module, details, severity, performed_by, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [crypto.randomUUID(), action, table, details, 'Info', performedBy || 'System', new Date().toISOString()]
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

// GET all rows from a table
// Supports: ?order=column&asc=true&limit=100&select=col1,col2
// Supports: ?eq_field=value for equality filters
// Supports: ?join=related_table for left joins
app.get('/api/crud/:table', optionalAuthMiddleware, validateTable, async (req, res) => {
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
        const eqFilters = Object.entries(req.query).filter(([k]) => k.startsWith('eq_'));
        if (eqFilters.length > 0) {
            const whereClauses = eqFilters.map(([key, val]) => {
                const col = key.replace('eq_', '');
                if (!isValidColumn(col)) return null;
                params.push(val);
                return `\`${col}\` = ?`;
            }).filter(Boolean);
            if (whereClauses.length > 0) {
                query += ' WHERE ' + whereClauses.join(' AND ');
            }
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

// POST - Insert new row
app.post('/api/crud/:table', authMiddleware, validateTable, writeGuard, async (req, res) => {
    const { table } = req.params;
    const body = req.body;
    try {
        // Auto-generate UUID if missing for non-auto-increment tables
        const autoIncrementTables = ['users', 'staff_members', 'audit_logs', 'lead_logs'];
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
app.delete('/api/crud/:table/:id', authMiddleware, validateTable, writeGuard, async (req, res) => {
    const { table, id } = req.params;
    try {
        await pool.query(`DELETE FROM \`${table}\` WHERE id = ?`, [id]);

        // Server-side audit log
        auditLog('Delete', table, `Deleted record ${id}`, req.user?.email);

        res.json({ status: 'success' });
    } catch (error) {
        console.error(`DELETE /${table}/${id} error:`, error);
        res.status(500).json({ error: `Failed to delete from ${table}` });
    }
});

// UPSERT - Insert or update (for daily_inventory etc.)
app.post('/api/crud/:table/upsert', authMiddleware, validateTable, writeGuard, async (req, res) => {
    const { table } = req.params;
    const body = req.body;
    try {
        // Auto-generate UUID if missing for non-auto-increment tables
        const autoIncrementTables = ['users', 'staff_members', 'audit_logs', 'bookings', 'tours', 'packages'];
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
// SPECIAL QUERY ROUTES (Joins, RPC-like)
// ═══════════════════════════════════════════

// Bookings with package title AND transactions AND supplier bookings
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
            return {
                ...v,
                total_sales: stats.totalCost,
                balance_due: stats.totalCost - stats.totalPaid,
                ledger_entries: ledgerByVendor[v.id] || []
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
                t.id, t.date, t.amount, t.type, t.method, t.reference, t.notes, t.status, t.receipt_url,
                t.booking_id as bookingId, t.created_at,
                b.customer_name as customer, b.customer_email as email, b.customer_phone as phone, b.tour_id as packageId,
                'booking_payment' as source
            FROM booking_transactions t
            LEFT JOIN bookings b ON t.booking_id = b.id
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

// Sync all staff members with users table
app.post('/api/admin/sync-staff-auth', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admins only' });
    }

    try {
        const [staffMembers] = await pool.query('SELECT * FROM staff_members');
        const defaultPassword = 'password123';
        const hash = await bcrypt.hash(defaultPassword, 10);
        let createdCount = 0;

        for (const staff of staffMembers) {
            const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [staff.email]);
            if (users.length === 0) {
                await pool.query('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', [staff.email, hash, staff.role || 'staff']);
                createdCount++;
            }
        }
        res.json({ message: `Sync complete. Created ${createdCount} missing user records with default password: ${defaultPassword}` });
    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ error: 'Sync failed' });
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
