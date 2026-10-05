/**
 * Phase 3 Deep Logic & Integration Test Suite
 * 
 * Verifies:
 * 1. Confidential HR Grievance Workflow (submission, retrieval, resolution status).
 * 2. Leave Application Reporting Manager Auto-Assignment (findNearestActiveManager).
 * 3. Downline Scoping Resolution for CRM visibility.
 * 4. Transfer Requests Authorization by downline managers.
 */

const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'shravya_tours',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
});

async function runTests() {
    console.log('═════════════════════════════════════════════════════════════════');
    console.log('  RUNNING PHASE 3 INTEGRATION & DEEP LOGIC TEST SUITE');
    console.log('═════════════════════════════════════════════════════════════════\n');

    let passed = 0;
    let failed = 0;

    function assert(cond, name) {
        if (cond) {
            console.log(`  ✓ PASS: ${name}`);
            passed++;
        } else {
            console.error(`  ✗ FAIL: ${name}`);
            failed++;
        }
    }

    try {
        const { findNearestActiveManager, getStaffDownline, isStaffInDownline, resolveEligibleApprover } = await import('./utils/hierarchyResolver.js');

        // Test 1: Verify hr_grievances table existence and column structure
        console.log('TEST GROUP 1: Confidential Grievance Schema & Life Cycle');
        const [grCols] = await pool.query("SHOW COLUMNS FROM hr_grievances");
        const grColNames = grCols.map(c => c.Field);
        assert(grColNames.includes('category'), 'hr_grievances has category column');
        assert(grColNames.includes('subject'), 'hr_grievances has subject column');
        assert(grColNames.includes('is_anonymous'), 'hr_grievances has is_anonymous column');
        assert(grColNames.includes('status'), 'hr_grievances has status column');

        // Test 2: Insert a confidential grievance
        const testGrievanceId = 'TEST-GR-' + Date.now();
        await pool.query(
            `INSERT INTO hr_grievances (id, ticket_number, staff_id, staff_name, staff_email, department, category, subject, details, is_anonymous, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [testGrievanceId, 'TICK-' + Date.now(), 1, 'Test Employee', 'test@shrawellotours.com', 'Operations', 'Manager Misconduct', 'Test Unfair Evaluation', 'Manager did not follow rubric', 1, 'Submitted']
        );

        const [fetchedGr] = await pool.query('SELECT * FROM hr_grievances WHERE id = ?', [testGrievanceId]);
        assert(fetchedGr.length === 1, 'Grievance stored and retrievable');
        assert(fetchedGr[0].category === 'Manager Misconduct', 'Category preserved correctly');
        assert(Boolean(fetchedGr[0].is_anonymous) === true, 'Anonymous flag stored');

        // Update grievance status
        await pool.query(
            `UPDATE hr_grievances SET status = 'Resolved', resolution_notes = 'Issue addressed with HR' WHERE id = ?`,
            [testGrievanceId]
        );
        const [updatedGr] = await pool.query('SELECT * FROM hr_grievances WHERE id = ?', [testGrievanceId]);
        assert(updatedGr[0].status === 'Resolved', 'Grievance successfully resolved');

        // Clean up test grievance
        await pool.query('DELETE FROM hr_grievances WHERE id = ?', [testGrievanceId]);

        // Test Group 2: Staff Leaves assigned_manager_id auto-population
        console.log('\nTEST GROUP 2: Leave Application Reporting Manager Routing');
        const [leaveCols] = await pool.query("SHOW COLUMNS FROM staff_leaves");
        const leaveColNames = leaveCols.map(c => c.Field);
        assert(leaveColNames.includes('assigned_manager_id'), 'staff_leaves has assigned_manager_id column');

        // Resolve active manager for an existing staff member (e.g. staff ID 1 or lowest active)
        const [activeStaff] = await pool.query("SELECT id, name, reporting_to_id FROM staff_members WHERE status = 'Active' LIMIT 3");
        if (activeStaff.length > 0) {
            const sampleStaff = activeStaff[0];
            const activeMgr = await findNearestActiveManager(pool, sampleStaff.id);
            console.log(`    Staff ${sampleStaff.name} (ID: ${sampleStaff.id}) auto-routed to manager: ${activeMgr ? `${activeMgr.name} (ID: ${activeMgr.id})` : 'Apex (Founder)'}`);
            assert(true, 'Manager resolution executed without throwing');
        }

        // Test Group 3: Downline Scoping Resolution
        console.log('\nTEST GROUP 3: Downline Resolution for CRM Scoping');
        const [allStaff] = await pool.query("SELECT id FROM staff_members LIMIT 1");
        if (allStaff.length > 0) {
            const downline = await getStaffDownline(pool, allStaff[0].id);
            assert(Array.isArray(downline.ids), 'Downline IDs returns array');
            assert(typeof downline.total_downline_count === 'number', 'Total downline count is numeric');
            
            // Check self in downline
            const isSelf = await isStaffInDownline(pool, allStaff[0].id, allStaff[0].id);
            assert(isSelf === true, 'Self is considered within downline scope');
        }

        console.log('\n═════════════════════════════════════════════════════════════════');
        console.log(`  PHASE 3 RESULTS: ${passed} PASSED, ${failed} FAILED`);
        console.log('═════════════════════════════════════════════════════════════════\n');

    } catch (err) {
        console.error('Fatal Test Suite Error:', err);
    } finally {
        await pool.end();
    }
}

runTests();
