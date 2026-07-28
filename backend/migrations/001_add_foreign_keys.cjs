/**
 * Migration: Add Foreign Key Constraints
 * 
 * This migration adds FOREIGN KEY constraints to critical cross-table 
 * relationships that currently only rely on application-level string matching.
 * 
 * Safety: Each ALTER TABLE is wrapped in try/catch so existing constraints
 * won't cause failures. This script is idempotent — safe to re-run.
 * 
 * Run: node backend/migrations/001_add_foreign_keys.cjs
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
        waitForConnections: true,
        connectionLimit: 5,
    });

    console.log('🔗 Connected to database. Running FK migration...\n');

    // Helper: Attempt to add a foreign key, skip if it already exists
    async function addFK(table, column, refTable, refColumn, constraintName, onDelete = 'SET NULL') {
        try {
            // Check if constraint already exists
            const [existing] = await pool.query(
                `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS 
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
                [process.env.DB_NAME, table, constraintName]
            );
            if (existing.length > 0) {
                console.log(`  ⏭️  ${constraintName} already exists, skipping.`);
                return;
            }

            // Ensure the column exists
            const [cols] = await pool.query(
                `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
                [process.env.DB_NAME, table, column]
            );
            if (cols.length === 0) {
                console.log(`  ⚠️  ${table}.${column} doesn't exist, skipping ${constraintName}.`);
                return;
            }

            // Ensure referenced table/column exists
            const [refCols] = await pool.query(
                `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
                [process.env.DB_NAME, refTable, refColumn]
            );
            if (refCols.length === 0) {
                console.log(`  ⚠️  ${refTable}.${refColumn} doesn't exist, skipping ${constraintName}.`);
                return;
            }

            // Clean up orphaned references first (rows that point to non-existent parent records)
            try {
                const [orphaned] = await pool.query(
                    `UPDATE \`${table}\` SET \`${column}\` = NULL 
                     WHERE \`${column}\` IS NOT NULL 
                     AND \`${column}\` != '' 
                     AND \`${column}\` NOT IN (SELECT \`${refColumn}\` FROM \`${refTable}\`)`,
                );
                if (orphaned.affectedRows > 0) {
                    console.log(`  🧹 Cleaned ${orphaned.affectedRows} orphaned refs in ${table}.${column}`);
                }
            } catch (cleanErr) {
                // Some tables may have type mismatches, skip cleaning
                console.log(`  ⚠️  Couldn't clean orphans for ${table}.${column}: ${cleanErr.message.split('\n')[0]}`);
            }

            // Add the index on the FK column if one doesn't exist
            try {
                await pool.query(`CREATE INDEX idx_${table}_${column} ON \`${table}\` (\`${column}\`)`);
            } catch (idxErr) {
                // Index already exists — fine
            }

            // Add the FK constraint
            await pool.query(
                `ALTER TABLE \`${table}\` 
                 ADD CONSTRAINT \`${constraintName}\` 
                 FOREIGN KEY (\`${column}\`) REFERENCES \`${refTable}\`(\`${refColumn}\`) 
                 ON DELETE ${onDelete}`
            );
            console.log(`  ✅ Added ${constraintName}: ${table}.${column} → ${refTable}.${refColumn} (ON DELETE ${onDelete})`);

        } catch (err) {
            console.error(`  ❌ Failed ${constraintName}: ${err.message.split('\n')[0]}`);
        }
    }

    // ═══════════════════════════════════════════
    // BOOKING RELATIONSHIPS
    // ═══════════════════════════════════════════
    console.log('📋 Booking relationships:');
    await addFK('bookings', 'customer_id', 'customers', 'id', 'fk_bookings_customer', 'SET NULL');
    await addFK('bookings', 'lead_id', 'leads', 'id', 'fk_bookings_lead', 'SET NULL');
    await addFK('bookings', 'assigned_to', 'staff_members', 'id', 'fk_bookings_assigned_to', 'SET NULL');

    // ═══════════════════════════════════════════
    // BOOKING CHILD TABLES (cascade delete)
    // ═══════════════════════════════════════════
    console.log('\n📋 Booking child tables:');
    await addFK('booking_transactions', 'booking_id', 'bookings', 'id', 'fk_booking_txn_booking', 'CASCADE');
    await addFK('supplier_bookings', 'booking_id', 'bookings', 'id', 'fk_supplier_booking_booking', 'CASCADE');
    await addFK('supplier_bookings', 'vendor_id', 'vendors', 'id', 'fk_supplier_booking_vendor', 'SET NULL');
    await addFK('booking_daily_deliverables', 'booking_id', 'bookings', 'id', 'fk_deliverables_booking', 'CASCADE');

    // ═══════════════════════════════════════════
    // LEAD RELATIONSHIPS
    // ═══════════════════════════════════════════
    console.log('\n📋 Lead relationships:');
    await addFK('leads', 'assigned_to', 'staff_members', 'id', 'fk_leads_assigned_to', 'SET NULL');
    await addFK('leads', 'customer_id', 'customers', 'id', 'fk_leads_customer', 'SET NULL');
    await addFK('leads', 'converted_booking_id', 'bookings', 'id', 'fk_leads_converted_booking', 'SET NULL');

    // ═══════════════════════════════════════════
    // LEAD CHILD TABLES
    // ═══════════════════════════════════════════
    console.log('\n📋 Lead child tables:');
    await addFK('lead_logs', 'lead_id', 'leads', 'id', 'fk_leadlogs_lead', 'CASCADE');
    await addFK('follow_ups', 'lead_id', 'leads', 'id', 'fk_followups_lead', 'CASCADE');

    // ═══════════════════════════════════════════
    // TASK RELATIONSHIPS
    // ═══════════════════════════════════════════
    console.log('\n📋 Task relationships:');
    await addFK('tasks', 'assigned_to', 'staff_members', 'id', 'fk_tasks_assigned_to', 'SET NULL');
    await addFK('tasks', 'related_lead_id', 'leads', 'id', 'fk_tasks_lead', 'CASCADE');
    await addFK('tasks', 'related_booking_id', 'bookings', 'id', 'fk_tasks_booking', 'CASCADE');

    // ═══════════════════════════════════════════
    // INVOICE RELATIONSHIPS
    // ═══════════════════════════════════════════
    console.log('\n📋 Invoice relationships:');
    await addFK('invoice_items', 'invoice_id', 'invoices', 'id', 'fk_invoice_items_invoice', 'CASCADE');
    await addFK('invoice_custom_fields', 'invoice_id', 'invoices', 'id', 'fk_invoice_cf_invoice', 'CASCADE');

    // ═══════════════════════════════════════════
    // PARTNER & COMMISSION RELATIONSHIPS
    // ═══════════════════════════════════════════
    console.log('\n📋 Partner relationships:');
    await addFK('partner_commissions', 'partner_id', 'partners', 'id', 'fk_commission_partner', 'CASCADE');
    await addFK('partner_commissions', 'booking_id', 'bookings', 'id', 'fk_commission_booking', 'SET NULL');

    // ═══════════════════════════════════════════
    // MEMBERSHIP RELATIONSHIPS
    // ═══════════════════════════════════════════
    console.log('\n📋 Membership relationships:');
    await addFK('customer_memberships', 'plan_id', 'membership_plans', 'id', 'fk_membership_plan', 'CASCADE');

    // ═══════════════════════════════════════════
    // MARKETING LOG JUNCTION TABLES
    // ═══════════════════════════════════════════
    console.log('\n📋 Marketing log junctions:');
    await addFK('marketing_log_leads', 'log_id', 'marketing_logs', 'id', 'fk_mktlog_leads_log', 'CASCADE');
    await addFK('marketing_log_leads', 'lead_id', 'leads', 'id', 'fk_mktlog_leads_lead', 'CASCADE');
    await addFK('marketing_log_bookings', 'log_id', 'marketing_logs', 'id', 'fk_mktlog_bookings_log', 'CASCADE');
    await addFK('marketing_log_bookings', 'booking_id', 'bookings', 'id', 'fk_mktlog_bookings_booking', 'CASCADE');
    await addFK('marketing_log_comments', 'log_id', 'marketing_logs', 'id', 'fk_mktlog_comments_log', 'CASCADE');
    await addFK('marketing_log_reactions', 'log_id', 'marketing_logs', 'id', 'fk_mktlog_reactions_log', 'CASCADE');

    // ═══════════════════════════════════════════
    // CAR BOOKING RELATIONSHIPS
    // ═══════════════════════════════════════════
    console.log('\n📋 Car booking relationships:');
    await addFK('car_booking_payments', 'booking_id', 'car_bookings', 'id', 'fk_car_payment_booking', 'CASCADE');
    await addFK('car_reviews', 'booking_id', 'car_bookings', 'id', 'fk_car_review_booking', 'CASCADE');

    // ═══════════════════════════════════════════
    // MASTER DATA RELATIONSHIPS
    // ═══════════════════════════════════════════
    console.log('\n📋 Master data relationships:');
    await addFK('master_hotels', 'location_id', 'master_locations', 'id', 'fk_hotel_location', 'SET NULL');

    console.log('\n✅ Foreign key migration complete!');
    await pool.end();
}

run().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
