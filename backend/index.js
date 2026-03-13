import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── Database Pool ───
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
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
    'packages', 'bookings', 'booking_transactions',
    'leads', 'lead_logs', 'daily_inventory',
    'vendors', 'accounts', 'account_transactions',
    'staff_members', 'customers', 'campaigns',
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
    const { email, password } = req.body;

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

// GET all rows from a table
// Supports: ?order=column&asc=true&limit=100&select=col1,col2
// Supports: ?eq_field=value for equality filters
// Supports: ?join=related_table for left joins
app.get('/api/crud/:table', validateTable, async (req, res) => {
    const { table } = req.params;
    const { order, asc, limit, select } = req.query;

    try {
        let columns = select || '*';
        let query = `SELECT ${columns} FROM \`${table}\``;
        const params = [];

        // Build WHERE clauses from eq_ prefixed query params
        const eqFilters = Object.entries(req.query).filter(([k]) => k.startsWith('eq_'));
        if (eqFilters.length > 0) {
            const whereClauses = eqFilters.map(([key, val]) => {
                const col = key.replace('eq_', '');
                params.push(val);
                return `\`${col}\` = ?`;
            });
            query += ' WHERE ' + whereClauses.join(' AND ');
        }

        if (order) {
            const dir = asc === 'true' ? 'ASC' : 'DESC';
            query += ` ORDER BY \`${order}\` ${dir}`;
        }

        if (limit) {
            query += ` LIMIT ${parseInt(limit)}`;
        }

        const [rows] = await pool.query(query, params);
        res.json({ data: rows });
    } catch (error) {
        console.error(`GET /${table} error:`, error);
        res.status(500).json({ error: `Failed to fetch from ${table}` });
    }
});

// GET single row by ID
app.get('/api/crud/:table/:id', validateTable, async (req, res) => {
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
app.post('/api/crud/:table', validateTable, async (req, res) => {
    const { table } = req.params;
    const body = req.body;
    try {
        // Auto-generate UUID if missing for non-auto-increment tables
        if (!body.id && table !== 'users' && table !== 'staff_members') {
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
        res.status(201).json({ data: inserted[0] || { id: fetchedId } });
    } catch (error) {
        console.error(`POST /${table} error:`, error);
        res.status(500).json({ error: `Failed to insert into ${table}`, details: error.message });
    }
});

// PUT - Update row by ID
app.put('/api/crud/:table/:id', validateTable, async (req, res) => {
    const { table, id } = req.params;
    const body = req.body;
    try {
        const setClauses = Object.keys(body).map(col => `\`${col}\` = ?`).join(', ');
        const values = Object.values(body).map(v =>
            typeof v === 'object' && v !== null ? JSON.stringify(v) : v
        );
        values.push(id);

        await pool.query(`UPDATE \`${table}\` SET ${setClauses} WHERE id = ?`, values);
        res.json({ status: 'success' });
    } catch (error) {
        console.error(`PUT /${table}/${id} error:`, error);
        res.status(500).json({ error: `Failed to update ${table}`, details: error.message });
    }
});

// DELETE - Delete row by ID
app.delete('/api/crud/:table/:id', validateTable, async (req, res) => {
    const { table, id } = req.params;
    try {
        await pool.query(`DELETE FROM \`${table}\` WHERE id = ?`, [id]);
        res.json({ status: 'success' });
    } catch (error) {
        console.error(`DELETE /${table}/${id} error:`, error);
        res.status(500).json({ error: `Failed to delete from ${table}` });
    }
});

// UPSERT - Insert or update (for daily_inventory etc.)
app.post('/api/crud/:table/upsert', validateTable, async (req, res) => {
    const { table } = req.params;
    const body = req.body;
    try {
        // Auto-generate UUID if missing for non-auto-increment tables
        if (!body.id && table !== 'users' && table !== 'staff_members') {
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

// Bookings with package title
app.get('/api/bookings-with-package', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT b.*, p.title as package_title 
            FROM bookings b 
            LEFT JOIN packages p ON b.package_id = p.id 
            ORDER BY b.created_at DESC
        `);
        res.json({ data: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// Leads with logs
app.get('/api/leads-with-logs', async (req, res) => {
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

// Accounts with transactions
app.get('/api/accounts-with-transactions', async (req, res) => {
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

// Follow-ups with lead name
app.get('/api/follow-ups-with-lead', async (req, res) => {
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
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the React build
app.use(express.static(path.join(__dirname, 'public')));

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
