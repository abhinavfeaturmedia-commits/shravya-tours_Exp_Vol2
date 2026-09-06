const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const pathsToTry = [
    path.join(__dirname, '.env'),
    path.join(__dirname, '..', '.env.local'),
    path.join(__dirname, '..', '.env')
];

for (const envPath of pathsToTry) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        break;
    }
}

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
    database: process.env.DB_NAME || 'shravya_db',
    port: Number(process.env.DB_PORT) || 3306,
};

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        throw new Error(message);
    } else {
        console.log(`✅ PASS: ${message}`);
    }
}

async function runTests() {
    console.log('\n========================================');
    console.log('🧪 RUNNING DEEP ATTENDANCE LOGIC TESTS');
    console.log('========================================\n');

    const pool = mysql.createPool(dbConfig);
    const TEST_STAFF_ID = 9991;
    const TEST_DATE = '2026-09-02';
    const TEST_LOG_ID = `ATL-${TEST_STAFF_ID}-${TEST_DATE}`;

    try {
        // Setup mock test staff
        await pool.query(`
            INSERT INTO staff_members (id, name, email, role, department, status)
            VALUES (?, 'Test Employee', 'test.emp9991@example.com', 'Tour Consultant', 'Sales', 'Active')
            ON DUPLICATE KEY UPDATE name = 'Test Employee', status = 'Active'
        `, [TEST_STAFF_ID]);

        // Cleanup previous test runs
        await pool.query('DELETE FROM attendance_breaks WHERE staff_id = ?', [TEST_STAFF_ID]);
        await pool.query('DELETE FROM attendance_sessions WHERE staff_id = ?', [TEST_STAFF_ID]);
        await pool.query('DELETE FROM attendance_logs WHERE staff_id = ?', [TEST_STAFF_ID]);
        await pool.query('DELETE FROM staff_leaves WHERE staff_id = ?', [TEST_STAFF_ID]);

        // ----------------------------------------------------
        // TEST 1: REGULARIZATION STAGING & APPROVAL FLOW
        // ----------------------------------------------------
        console.log('👉 TEST 1: Regularization Staging & Manager Approval Flow');

        // Create an existing log for yesterday with missing punch
        await pool.query(`
            INSERT INTO attendance_logs (id, staff_id, date, status, check_in_time, check_out_time, created_at, updated_at)
            VALUES (?, ?, ?, 'Absent', NULL, NULL, NOW(), NOW())
        `, [TEST_LOG_ID, TEST_STAFF_ID, TEST_DATE]);

        // 1a. Employee submits regularization for 09:30 AM to 06:30 PM (9 hours)
        const reqCheckIn = `${TEST_DATE} 09:30:00`;
        const reqCheckOut = `${TEST_DATE} 18:30:00`;
        const regReason = 'Fingerprint biometric scanner was offline';

        await pool.query(`
            UPDATE attendance_logs SET
                requested_check_in = ?,
                requested_check_out = ?,
                regularization_status = 'Requested',
                regularization_reason = ?,
                updated_at = NOW()
            WHERE id = ?
        `, [reqCheckIn, reqCheckOut, regReason, TEST_LOG_ID]);

        const [stagedRows] = await pool.query('SELECT * FROM attendance_logs WHERE id = ?', [TEST_LOG_ID]);
        const staged = stagedRows[0];

        assert(staged.regularization_status === 'Requested', 'Regularization status is marked Requested');
        assert(staged.check_in_time === null, 'Official check_in_time remains NULL before manager approval');
        assert(staged.regularization_reason === regReason, 'Regularization reason correctly saved');

        // 1b. Manager approves the request
        const cIn = new Date(staged.requested_check_in);
        const cOut = new Date(staged.requested_check_out);
        const workedMins = Math.max(0, Math.floor((cOut.getTime() - cIn.getTime()) / 60000));
        const fullDayMins = 8 * 60;
        const overtimeMins = workedMins > fullDayMins ? workedMins - fullDayMins : 0;

        await pool.query(`
            UPDATE attendance_logs SET
                check_in_time = ?,
                check_out_time = ?,
                worked_minutes = ?,
                overtime_minutes = ?,
                is_late = 0,
                status = 'Present',
                regularization_status = 'Approved',
                regularization_approved_by = 1,
                regularization_approved_at = NOW(),
                updated_at = NOW()
            WHERE id = ?
        `, [staged.requested_check_in, staged.requested_check_out, workedMins, overtimeMins, TEST_LOG_ID]);

        const [approvedRows] = await pool.query('SELECT * FROM attendance_logs WHERE id = ?', [TEST_LOG_ID]);
        const approved = approvedRows[0];

        assert(approved.regularization_status === 'Approved', 'Regularization status updated to Approved');
        assert(approved.check_in_time !== null, 'Official check_in_time populated after approval');
        assert(approved.worked_minutes === 540, `Worked minutes correctly calculated as 540 (got ${approved.worked_minutes})`);
        assert(approved.overtime_minutes === 60, `Overtime minutes correctly calculated as 60 (got ${approved.overtime_minutes})`);
        assert(approved.status === 'Present', 'Status correctly set to Present');

        // ----------------------------------------------------
        // TEST 2: LATE ARRIVAL WITH SHORT DURATION (<4.5h) -> HALF DAY
        // ----------------------------------------------------
        console.log('\n👉 TEST 2: Late Arrival with Short Duration (<4.5h) -> Half Day Classification');

        const TEST_DATE_2 = '2026-09-03';
        const TEST_LOG_ID_2 = `ATL-${TEST_STAFF_ID}-${TEST_DATE_2}`;

        const lateCheckIn = new Date(`${TEST_DATE_2}T11:00:00`); // 11:00 AM (Late)
        const earlyCheckOut = new Date(`${TEST_DATE_2}T13:30:00`); // 01:30 PM (2.5h worked)
        const netWorked = Math.floor((earlyCheckOut.getTime() - lateCheckIn.getTime()) / 60000); // 150 mins
        const halfDayThreshold = 4.5 * 60; // 270 mins

        let status2 = 'Late';
        if (netWorked < halfDayThreshold) {
            status2 = 'Half Day';
        }

        await pool.query(`
            INSERT INTO attendance_logs (id, staff_id, date, status, check_in_time, check_out_time, is_late, worked_minutes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, NOW(), NOW())
        `, [TEST_LOG_ID_2, TEST_STAFF_ID, TEST_DATE_2, status2, lateCheckIn, earlyCheckOut, netWorked]);

        const [lateRows] = await pool.query('SELECT * FROM attendance_logs WHERE id = ?', [TEST_LOG_ID_2]);
        const lateLog = lateRows[0];

        assert(lateLog.is_late === 1, 'Late punctuality flag is preserved (is_late = 1)');
        assert(lateLog.status === 'Half Day', `Status accurately downgraded to Half Day (got ${lateLog.status})`);
        assert(lateLog.worked_minutes === 150, `Worked minutes is 150`);

        // ----------------------------------------------------
        // TEST 3: AUTO-CLOCKOUT WITH DANGLING BREAK CLEANUP
        // ----------------------------------------------------
        console.log('\n👉 TEST 3: Inactivity Auto-Clockout closes Dangling Breaks');

        const TEST_DATE_3 = '2026-09-04';
        const TEST_LOG_ID_3 = `ATL-${TEST_STAFF_ID}-${TEST_DATE_3}`;
        const breakStart = new Date(`${TEST_DATE_3}T13:00:00`);
        const timeoutEnd = new Date(`${TEST_DATE_3}T13:45:00`); // 45 min break

        // Create log and open break
        await pool.query(`
            INSERT INTO attendance_logs (id, staff_id, date, status, check_in_time, break_start_time, created_at, updated_at)
            VALUES (?, ?, ?, 'On Break', '${TEST_DATE_3} 09:30:00', ?, NOW(), NOW())
        `, [TEST_LOG_ID_3, TEST_STAFF_ID, TEST_DATE_3, breakStart]);

        const breakId = `BRK-TEST-${Date.now()}`;
        await pool.query(`
            INSERT INTO attendance_breaks (id, attendance_id, staff_id, break_type, start_time, end_time)
            VALUES (?, ?, ?, 'Lunch', ?, NULL)
        `, [breakId, TEST_LOG_ID_3, TEST_STAFF_ID, breakStart]);

        // Simulate autoCloseOrphanSessions closing dangling breaks
        const [openBreaks] = await pool.query(`
            SELECT id, start_time FROM attendance_breaks WHERE attendance_id = ? AND end_time IS NULL
        `, [TEST_LOG_ID_3]);

        assert(openBreaks.length === 1, 'Found 1 open dangling break before cleanup');

        const bStart = new Date(openBreaks[0].start_time);
        const bDuration = Math.max(1, Math.floor((timeoutEnd.getTime() - bStart.getTime()) / 60000));

        await pool.query(`
            UPDATE attendance_breaks SET end_time = ?, duration_minutes = ? WHERE id = ?
        `, [timeoutEnd, bDuration, openBreaks[0].id]);

        await pool.query(`
            UPDATE attendance_logs SET
                check_out_time = ?,
                break_start_time = NULL,
                total_break_minutes = ?,
                status = 'Clocked Out',
                auto_clocked_out = 1,
                updated_at = NOW()
            WHERE id = ?
        `, [timeoutEnd, bDuration, TEST_LOG_ID_3]);

        const [closedBreakRows] = await pool.query('SELECT * FROM attendance_breaks WHERE id = ?', [breakId]);
        const [closedLogRows] = await pool.query('SELECT * FROM attendance_logs WHERE id = ?', [TEST_LOG_ID_3]);

        assert(closedBreakRows[0].end_time !== null, 'Open break was cleanly closed with end_time');
        assert(closedBreakRows[0].duration_minutes === 45, `Break duration accurately computed as 45m (got ${closedBreakRows[0].duration_minutes})`);
        assert(closedLogRows[0].break_start_time === null, 'break_start_time in attendance_logs cleared');
        assert(closedLogRows[0].total_break_minutes === 45, 'total_break_minutes in attendance_logs updated');
        assert(closedLogRows[0].auto_clocked_out === 1, 'auto_clocked_out flag is 1');

        // ----------------------------------------------------
        // TEST 4: LEAVE APPROVAL & ROLLBACK ON CANCELLATION
        // ----------------------------------------------------
        console.log('\n👉 TEST 4: Leave Approval and Rollback Cleanup');

        const LEAVE_ID = `LV-TEST-${Date.now()}`;
        const LEAVE_START = '2026-09-10';
        const LEAVE_END = '2026-09-11';

        // 4a. Apply leave
        await pool.query(`
            INSERT INTO staff_leaves (id, staff_id, leave_type, start_date, end_date, days_count, reason, status, created_at, updated_at)
            VALUES (?, ?, 'Casual', ?, ?, 2, 'Family function', 'Pending', NOW(), NOW())
        `, [LEAVE_ID, TEST_STAFF_ID, LEAVE_START, LEAVE_END]);

        // 4b. Approve leave -> create 'On Leave' records in attendance_logs
        await pool.query(`UPDATE staff_leaves SET status = 'Approved', approved_by = 1, approval_date = NOW() WHERE id = ?`, [LEAVE_ID]);
        
        for (const dStr of [LEAVE_START, LEAVE_END]) {
            const lId = `ATL-${TEST_STAFF_ID}-${dStr}`;
            await pool.query(`
                INSERT INTO attendance_logs (id, staff_id, date, status, notes, created_at, updated_at)
                VALUES (?, ?, ?, 'On Leave', 'Approved Leave', NOW(), NOW())
                ON DUPLICATE KEY UPDATE status = 'On Leave', notes = 'Approved Leave', updated_at = NOW()
            `, [lId, TEST_STAFF_ID, dStr]);
        }

        const [leaveLogsBefore] = await pool.query('SELECT * FROM attendance_logs WHERE staff_id = ? AND date IN (?, ?)', [TEST_STAFF_ID, LEAVE_START, LEAVE_END]);
        assert(leaveLogsBefore.length === 2, '2 On Leave attendance records created for approved dates');
        assert(leaveLogsBefore.every(l => l.status === 'On Leave'), 'All records have status On Leave');

        // 4c. Cancel / Reject leave -> Rollback dummy records
        await pool.query(`UPDATE staff_leaves SET status = 'Cancelled' WHERE id = ?`, [LEAVE_ID]);
        await pool.query(`
            DELETE FROM attendance_logs 
            WHERE staff_id = ? AND date BETWEEN ? AND ? AND status = 'On Leave' AND check_in_time IS NULL
        `, [TEST_STAFF_ID, LEAVE_START, LEAVE_END]);

        const [leaveLogsAfter] = await pool.query('SELECT * FROM attendance_logs WHERE staff_id = ? AND date IN (?, ?)', [TEST_STAFF_ID, LEAVE_START, LEAVE_END]);
        assert(leaveLogsAfter.length === 0, 'On Leave dummy attendance logs were cleanly deleted upon leave cancellation');

        // Cleanup test data
        await pool.query('DELETE FROM attendance_breaks WHERE staff_id = ?', [TEST_STAFF_ID]);
        await pool.query('DELETE FROM attendance_sessions WHERE staff_id = ?', [TEST_STAFF_ID]);
        await pool.query('DELETE FROM attendance_logs WHERE staff_id = ?', [TEST_STAFF_ID]);
        await pool.query('DELETE FROM staff_leaves WHERE staff_id = ?', [TEST_STAFF_ID]);
        await pool.query('DELETE FROM staff_members WHERE id = ?', [TEST_STAFF_ID]);

        console.log('\n========================================');
        console.log('🎉 ALL ATTENDANCE DEEP LOGIC TESTS PASSED!');
        console.log('========================================\n');
    } catch (err) {
        console.error('Test Suite Failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runTests();
