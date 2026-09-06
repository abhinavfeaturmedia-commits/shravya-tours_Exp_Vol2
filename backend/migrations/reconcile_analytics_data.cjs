const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function migrateAndReconcile() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    console.log("=== 1. CHECKING STAFF ID 1006 vs ID 29 ===");
    const [staffRows] = await pool.query('SELECT id, name, email, role FROM staff_members WHERE id IN (29, 1006)');
    console.table(staffRows);

    // 1. Update bookings
    const [bRes] = await pool.query('UPDATE bookings SET assigned_to = 29 WHERE assigned_to = 1006');
    console.log(`Updated bookings assigned_to: ${bRes.affectedRows} rows moved to ID 29`);

    // 2. Update leads
    const [lRes] = await pool.query('UPDATE leads SET assigned_to = 29 WHERE assigned_to = 1006');
    console.log(`Updated leads assigned_to: ${lRes.affectedRows} rows moved to ID 29`);

    // 3. Update follow_ups
    try {
        const [fuRes] = await pool.query('UPDATE follow_ups SET assigned_to = 29 WHERE assigned_to = 1006');
        console.log(`Updated follow_ups assigned_to: ${fuRes.affectedRows} rows moved to ID 29`);
    } catch (e) {
        console.log("No follow_ups to update or column differs:", e.message);
    }

    // 4. Update tasks
    try {
        const [tRes] = await pool.query('UPDATE tasks SET assigned_to = 29 WHERE assigned_to = 1006');
        console.log(`Updated tasks assigned_to: ${tRes.affectedRows} rows moved to ID 29`);
    } catch (e) {
        console.log("No tasks to update:", e.message);
    }

    // 5. Update attendance_sessions
    try {
        const [attRes] = await pool.query('UPDATE attendance_sessions SET staff_id = 29 WHERE staff_id = 1006');
        console.log(`Updated attendance_sessions: ${attRes.affectedRows} rows moved to ID 29`);
    } catch (e) {
        console.log("No attendance_sessions to update:", e.message);
    }

    // 6. Update attendance_logs
    try {
        const [alRes] = await pool.query('UPDATE attendance_logs SET staff_id = 29 WHERE staff_id = 1006');
        console.log(`Updated attendance_logs: ${alRes.affectedRows} rows moved to ID 29`);
    } catch (e) {
        console.log("No attendance_logs to update:", e.message);
    }

    // 7. Update daily_targets
    try {
        const [dtRes] = await pool.query('UPDATE daily_targets SET staff_id = 29 WHERE staff_id = 1006');
        console.log(`Updated daily_targets: ${dtRes.affectedRows} rows moved to ID 29`);
    } catch (e) {
        console.log("No daily_targets to update:", e.message);
    }

    // 8. Update time_sessions
    try {
        const [tsRes] = await pool.query('UPDATE time_sessions SET staff_id = 29 WHERE staff_id = 1006');
        console.log(`Updated time_sessions: ${tsRes.affectedRows} rows moved to ID 29`);
    } catch (e) {
        console.log("No time_sessions to update:", e.message);
    }

    // 9. Update user_activities
    try {
        const [uaRes] = await pool.query('UPDATE user_activities SET user_id = 29 WHERE user_id = 1006');
        console.log(`Updated user_activities: ${uaRes.affectedRows} rows moved to ID 29`);
    } catch (e) {
        console.log("No user_activities to update:", e.message);
    }

    // 10. In staff_members: Remove or mark ID 1006 merged
    const [delStaff] = await pool.query('DELETE FROM staff_members WHERE id = 1006');
    console.log(`Removed duplicate staff row ID 1006: ${delStaff.affectedRows} deleted`);

    // Verify consolidated bookings for Rohit Sankpal (ID 29)
    const [rohitBookings] = await pool.query('SELECT count(*) as cnt, sum(total_price) as sum_price FROM bookings WHERE assigned_to = 29');
    console.log(`Rohit Sankpal (ID 29) now has: ${rohitBookings[0].cnt} bookings totaling ₹${Number(rohitBookings[0].sum_price).toLocaleString('en-IN')}`);

    // Check orphaned transactions in booking_transactions
    console.log("\n=== 2. CHECKING ORPHANED TRANSACTIONS ===");
    const [orphaned] = await pool.query(`
        SELECT t.id, t.booking_id, t.amount, t.type, t.status, t.reference, t.notes
        FROM booking_transactions t
        LEFT JOIN bookings b ON t.booking_id = b.id
        WHERE b.id IS NULL AND t.status = 'Verified'
    `);
    console.table(orphaned);

    await pool.end();
    console.log("\nConsolidation migration complete!");
    process.exit(0);
}

migrateAndReconcile().catch(err => {
    console.error("Migration error:", err);
    process.exit(1);
});
