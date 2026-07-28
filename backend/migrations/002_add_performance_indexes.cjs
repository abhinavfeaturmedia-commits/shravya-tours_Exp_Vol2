/**
 * Migration 002: Add Performance Indexes
 * 
 * Adds indexes on frequently queried columns to eliminate full table scans.
 * Each index is wrapped in a try-catch so pre-existing indexes are silently skipped.
 * 
 * Run: node backend/migrations/002_add_performance_indexes.cjs
 */

const mysql = require('mysql2/promise');
const path = require('path');

// Load env from backend directory
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const INDEXES = [
    // ─── Ownership scoping (used on EVERY authenticated CRUD GET) ───
    { table: 'leads',       name: 'idx_leads_assigned_to',        columns: 'assigned_to' },
    { table: 'bookings',    name: 'idx_bookings_assigned_to',     columns: 'assigned_to' },
    { table: 'tasks',       name: 'idx_tasks_assigned_to',        columns: 'assigned_to' },
    { table: 'follow_ups',  name: 'idx_followups_assigned_to',    columns: 'assigned_to' },

    // ─── Customer matching (customer-with-stats, booking creation) ───
    { table: 'bookings',    name: 'idx_bookings_customer_id',     columns: 'customer_id' },
    { table: 'bookings',    name: 'idx_bookings_customer_email',  columns: 'customer_email' },
    { table: 'bookings',    name: 'idx_bookings_status',          columns: 'status' },
    { table: 'customers',   name: 'idx_customers_email',          columns: 'email' },
    { table: 'customers',   name: 'idx_customers_phone',          columns: 'phone' },

    // ─── Child table lookups (cascade deletes, ownership checks) ───
    { table: 'booking_transactions',  name: 'idx_btxn_booking_id',   columns: 'booking_id' },
    { table: 'supplier_bookings',     name: 'idx_sb_booking_id',     columns: 'booking_id' },
    { table: 'supplier_bookings',     name: 'idx_sb_vendor_id',      columns: 'vendor_id' },
    { table: 'tasks',                 name: 'idx_tasks_booking_id',  columns: 'booking_id' },
    { table: 'tasks',                 name: 'idx_tasks_lead_id',     columns: 'lead_id' },
    { table: 'follow_ups',            name: 'idx_followups_lead_id', columns: 'lead_id' },
    { table: 'lead_logs',             name: 'idx_leadlogs_lead_id',  columns: 'lead_id' },

    // ─── Partner queries ───
    { table: 'leads',                 name: 'idx_leads_partner_id',       columns: 'partner_id' },
    { table: 'partner_commissions',   name: 'idx_pc_partner_id',          columns: 'partner_id' },
    { table: 'partner_commissions',   name: 'idx_pc_booking_id',          columns: 'booking_id' },

    // ─── Booking daily deliverables (cascade deletes) ───
    { table: 'booking_daily_deliverables', name: 'idx_bdd_booking_id', columns: 'booking_id' },

    // ─── Staff lookups (permission checks on every request) ───
    { table: 'staff_members', name: 'idx_staff_email',  columns: 'email' },
    { table: 'users',         name: 'idx_users_email',  columns: 'email' },

    // ─── Audit logs (ordered queries) ───
    { table: 'audit_logs',   name: 'idx_auditlogs_timestamp', columns: 'timestamp' },

    // ─── Invoices ───
    { table: 'invoice_items',         name: 'idx_invitems_invoice_id',  columns: 'invoice_id' },
    { table: 'invoice_custom_fields', name: 'idx_invcf_invoice_id',     columns: 'invoice_id' },
];

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 5,
        connectTimeout: 30000,
    });

    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  Migration 002: Add Performance Indexes      ║');
    console.log('╚══════════════════════════════════════════════╝\n');

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const idx of INDEXES) {
        try {
            await pool.query(`CREATE INDEX \`${idx.name}\` ON \`${idx.table}\` (\`${idx.columns}\`)`);
            console.log(`  ✅ Created: ${idx.name} ON ${idx.table}(${idx.columns})`);
            created++;
        } catch (err) {
            if (err.code === 'ER_DUP_KEYNAME') {
                console.log(`  ⏭️  Skipped: ${idx.name} (already exists)`);
                skipped++;
            } else if (err.code === 'ER_NO_SUCH_TABLE') {
                console.log(`  ⚠️  Skipped: ${idx.name} — table '${idx.table}' does not exist`);
                skipped++;
            } else if (err.code === 'ER_KEY_COLUMN_DOES_NOT_EXIST' || err.code === 'ER_KEY_COLUMN_DOES_NOT_EXITS') {
                console.log(`  ⚠️  Skipped: ${idx.name} — column '${idx.columns}' not found in '${idx.table}'`);
                skipped++;
            } else {
                console.error(`  ❌ FAILED: ${idx.name} — ${err.message}`);
                failed++;
            }
        }
    }

    console.log(`\n──────────────────────────────────────────────`);
    console.log(`  Created: ${created} | Skipped: ${skipped} | Failed: ${failed}`);
    console.log(`──────────────────────────────────────────────\n`);

    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
