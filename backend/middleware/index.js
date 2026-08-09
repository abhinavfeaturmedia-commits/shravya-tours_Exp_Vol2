/**
 * Middleware Module
 * 
 * Extracted from index.js — contains auth, validation, permission, 
 * and write-guard middleware for the Express API.
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

// ═══════════════════════════════════════════
// ALLOWED TABLES WHITELIST
// ═══════════════════════════════════════════

export const ALLOWED_TABLES = new Set([
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
    'attendance_logs',
    'membership_plans', 'customer_memberships',
    'partners', 'partner_commissions',
    'coupons',
    'marketing_logs',
    'marketing_targets', 'marketing_log_comments', 'marketing_log_reactions',
    'marketing_log_leads', 'marketing_log_bookings', 'in_app_notifications',
    'booking_daily_deliverables',
    'vehicle_categories', 'vehicles', 'drivers', 'car_bookings', 'car_booking_payments', 'car_reviews'
]);

// ═══════════════════════════════════════════
// TABLE → PERMISSION MODULE MAPPING
// ═══════════════════════════════════════════

export const TABLE_TO_MODULE = {
    'packages': 'inventory',
    'daily_inventory': 'inventory',
    'bookings': 'bookings',
    'booking_transactions': 'invoices',
    'supplier_bookings': 'operations',
    'booking_daily_deliverables': 'operations',
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
    'in_app_notifications': 'dashboard',
    'vehicle_categories': 'operations',
    'vehicles': 'operations',
    'drivers': 'operations',
    'car_bookings': 'operations',
    'car_booking_payments': 'operations',
    'car_reviews': 'operations'
};

// ═══════════════════════════════════════════
// AUTH MIDDLEWARE
// ═══════════════════════════════════════════

export function authMiddleware(req, res, next) {
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

// ═══════════════════════════════════════════
// TABLE VALIDATION
// ═══════════════════════════════════════════

export function validateTable(req, res, next) {
    const table = req.params.table;
    if (!ALLOWED_TABLES.has(table)) {
        return res.status(400).json({ error: `Invalid table: ${table}` });
    }
    next();
}

// ═══════════════════════════════════════════
// COLUMN VALIDATION
// ═══════════════════════════════════════════

const VALID_COL_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
export function isValidColumn(name) {
    return VALID_COL_RE.test(name);
}

// ═══════════════════════════════════════════
// WRITE GUARD (admin-only tables)
// ═══════════════════════════════════════════

const ADMIN_ONLY_TABLES = new Set(['users', 'staff_members', 'audit_logs', 'settings']);
export function writeGuard(req, res, next) {
    const table = req.params.table;
    if (ADMIN_ONLY_TABLES.has(table) && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required for this table' });
    }
    next();
}

// ═══════════════════════════════════════════
// PERMISSION GUARD
// ═══════════════════════════════════════════

export function createPermissionGuard(pool) {
    return async function permissionGuard(req, res, next) {
        const table = req.params.table;
        const method = req.method;
        const action = (method === 'GET') ? 'view' : 'manage';

        if (!req.user) {
            // For unauthenticated requests (via optionalAuthMiddleware), only allow
            // reading from explicitly public tables. Block all writes.
            const publicReadTables = new Set([
                'packages', 'cms_banners', 'cms_testimonials', 'cms_gallery_images',
                'cms_posts', 'master_locations', 'master_hotels', 'master_activities', 'membership_plans'
            ]);
            if (method === 'GET' && publicReadTables.has(table)) {
                return next();
            }
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Admin gets unrestricted access
        if (req.user?.role === 'admin' || req.user?.role === 'Admin') {
            return next();
        }

        // Self-access bypass for staff_members
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
            return next();
        }

        try {
            const { permissions, isAdmin } = await getStaffPermissionsAndScope(pool, req.user?.email);
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
    };
}

// ═══════════════════════════════════════════
// OPTIONAL AUTH (public reads + auth for writes)
// ═══════════════════════════════════════════

const PUBLIC_READ_TABLES = new Set([
    'packages', 'cms_banners', 'cms_testimonials', 'cms_gallery_images',
    'cms_posts', 'master_locations', 'master_hotels', 'master_activities'
]);

export function optionalAuthMiddleware(req, res, next) {
    const table = req.params.table;
    if (req.method === 'GET' && PUBLIC_READ_TABLES.has(table)) {
        // Try to attach user if token present (for admin features), but don't require it
        const header = req.headers.authorization;
        if (header && header.startsWith('Bearer ')) {
            try {
                req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
            } catch { /* not authenticated — fine for public reads */ }
        }
        return next();
    }
    return authMiddleware(req, res, next);
}

// ═══════════════════════════════════════════
// PACKAGE STATUS FILTER (public reads show Active only)
// ═══════════════════════════════════════════

export function injectPackageStatusFilter(req, res, next) {
    if (req.params.table === 'packages' && !req.headers.authorization) {
        req.query = { ...req.query, eq_status: 'Active' };
    }
    next();
}

// ═══════════════════════════════════════════
// DATE SANITIZER (prevents MySQL 0000-00-00 dates)
// ═══════════════════════════════════════════

const DATE_COLUMNS = new Set([
    'start_date', 'end_date', 'booking_date', 'travel_date', 'departure_date',
    'return_date', 'check_in', 'check_out', 'dob', 'date_of_birth',
    'created_at', 'updated_at', 'scheduled_at', 'completed_at'
]);

export function sanitizeDbBody(body) {
    if (!body || typeof body !== 'object') return body;
    const sanitized = { ...body };
    for (const [key, val] of Object.entries(sanitized)) {
        if (DATE_COLUMNS.has(key) && (val === '' || val === undefined)) {
            sanitized[key] = null;
        }
    }
    return sanitized;
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function parsePermissionsSafe(raw) {
    let parsed = raw;
    while (typeof parsed === 'string') {
        if (!parsed.trim()) break;
        try {
            parsed = JSON.parse(parsed);
        } catch {
            break;
        }
    }
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
}

export async function getStaffPermissionsAndScope(pool, email) {
    if (!email) return { permissions: {}, queryScope: 'Show Assigned Query Only', isAdmin: false };
    const [rows] = await pool.query('SELECT permissions, query_scope, user_type FROM staff_members WHERE email = ?', [email]);
    if (rows.length === 0) {
        return { permissions: {}, queryScope: 'Show Assigned Query Only', isAdmin: false };
    }
    const row = rows[0];
    const permissions = parsePermissionsSafe(row.permissions);
    return {
        permissions,
        queryScope: row.query_scope || 'Show Assigned Query Only',
        isAdmin: row.user_type === 'Admin'
    };
}

// ═══════════════════════════════════════════
// AUDIT LOGGER
// ═══════════════════════════════════════════

export function createAuditLogger(pool) {
    return async function auditLog(action, table, details, performedBy) {
        try {
            await pool.query(
                'INSERT INTO `audit_logs` (action, module, details, severity, performed_by, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
                [action, table, details, 'Info', performedBy || 'System', new Date().toISOString()]
            );
        } catch (e) {
            console.error('Audit log write failed:', e.message);
        }
    };
}
