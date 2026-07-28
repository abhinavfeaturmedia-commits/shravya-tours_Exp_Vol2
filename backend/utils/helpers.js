/**
 * Utility: Date Sanitization & Body Helpers
 * 
 * Prevents MySQL 0000-00-00 date issues and handles JSON column serialization.
 * Extracted from index.js for reuse across route modules.
 */

// Date columns that should be nullified when empty (prevents MySQL 0000-00-00)
const DATE_COLUMNS = new Set([
    'start_date', 'end_date', 'booking_date', 'travel_date', 'departure_date',
    'return_date', 'check_in', 'check_out', 'dob', 'date_of_birth',
    'created_at', 'updated_at', 'scheduled_at', 'completed_at',
    'validity_date', 'contract_expiry_date'
]);

/**
 * Sanitize request body for DB insertion:
 * - Convert empty-string date fields to NULL
 * - Prevents MySQL from storing 0000-00-00 dates
 */
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

/**
 * Validate column name to prevent SQL injection in dynamic queries.
 * Only allows alphanumeric + underscore, starting with a letter or underscore.
 */
const VALID_COL_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
export function isValidColumn(name) {
    return VALID_COL_RE.test(name);
}

/**
 * Server-side audit logger factory.
 * Returns a function that writes to the audit_logs table.
 */
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
