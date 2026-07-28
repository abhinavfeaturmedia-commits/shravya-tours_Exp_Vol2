/**
 * Utility: Phone Number Normalization
 * 
 * Pure helper functions for phone number handling.
 * Extracted from index.js for reuse across routes.
 */

/**
 * Normalises any phone number to its last 10 digits for consistent matching.
 * Strips country codes (+91, 91), spaces, dashes, brackets.
 * Examples: '+91-9876543210' → '9876543210', '09876543210' → '9876543210'
 */
export function normalisePhone(phone) {
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
export async function findMatchingCustomer(pool, normPhone) {
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
