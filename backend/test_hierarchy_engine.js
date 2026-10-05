import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });
import {
    findNearestActiveManager,
    getStaffReportingChain,
    getStaffDownline,
    isStaffInDownline,
    resolveEligibleApprover
} from './utils/hierarchyResolver.js';

async function runTests() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 5,
        connectTimeout: 30000
    });

    console.log('🚀 Starting Hierarchy Engine & Vacancy Test Suite...\n');
    let passed = 0;
    let failed = 0;

    function assert(condition, testName) {
        if (condition) {
            console.log(`  ✅ PASS: ${testName}`);
            passed++;
        } else {
            console.error(`  ❌ FAIL: ${testName}`);
            failed++;
        }
    }

    try {
        // Setup isolated test entities
        // 1. Founder (L1, Apex)
        // 2. Head of Sales (L3, HOD)
        // 3. Area Sales Manager (L5, Manager)
        // 4. Sales Executive (L8, Junior)

        console.log('📦 Setting up synthetic test hierarchy nodes in DB...');

        // Fetch designation IDs for L1, L3, L5, L8
        const [desigRows] = await pool.query(
            "SELECT id, grade_level, default_discount_limit, default_expense_limit FROM designations WHERE grade_level IN ('L1', 'L3', 'L5', 'L8')"
        );
        const desigMap = {};
        desigRows.forEach(d => { desigMap[d.grade_level] = d.id; });

        // Clean any old test records
        await pool.query("DELETE FROM staff_members WHERE email LIKE 'test.hierarchy.%@shrawellotours.com'");

        // Insert L1 Founder
        const [resL1] = await pool.query(
            `INSERT INTO staff_members (name, email, role, grade_level, designation_id, department, status, employment_status, employee_code)
             VALUES ('Test Founder MD', 'test.hierarchy.l1@shrawellotours.com', 'Managing Director', 'L1', ?, 'Executive', 'Active', 'Active', 'EMP-T001')`,
            [desigMap['L1'] || null]
        );
        const l1Id = resL1.insertId;

        // Insert L3 HOD reporting to L1
        const [resL3] = await pool.query(
            `INSERT INTO staff_members (name, email, role, grade_level, designation_id, department, reporting_to_id, status, employment_status, employee_code)
             VALUES ('Test Sales Head', 'test.hierarchy.l3@shrawellotours.com', 'Head of Sales', 'L3', ?, 'Sales', ?, 'Active', 'Active', 'EMP-T003')`,
            [desigMap['L3'] || null, l1Id]
        );
        const l3Id = resL3.insertId;

        // Insert L5 Manager reporting to L3
        const [resL5] = await pool.query(
            `INSERT INTO staff_members (name, email, role, grade_level, designation_id, department, reporting_to_id, status, employment_status, employee_code)
             VALUES ('Test Area Manager', 'test.hierarchy.l5@shrawellotours.com', 'Area Sales Manager', 'L5', ?, 'Sales', ?, 'Active', 'Active', 'EMP-T005')`,
            [desigMap['L5'] || null, l3Id]
        );
        const l5Id = resL5.insertId;

        // Insert L8 Executive reporting to L5
        const [resL8] = await pool.query(
            `INSERT INTO staff_members (name, email, role, grade_level, designation_id, department, reporting_to_id, status, employment_status, employee_code)
             VALUES ('Test Junior Executive', 'test.hierarchy.l8@shrawellotours.com', 'Sales Executive', 'L8', ?, 'Sales', ?, 'Active', 'Active', 'EMP-T008')`,
            [desigMap['L8'] || null, l5Id]
        );
        const l8Id = resL8.insertId;

        console.log(`   Hierarchy created: L8(#${l8Id}) -> L5(#${l5Id}) -> L3(#${l3Id}) -> L1(#${l1Id})\n`);

        // ─── TEST 1: Normal 1:1 Direct Manager Resolution ───
        console.log('🧪 Test 1: Normal Direct Manager Resolution');
        const mgr1 = await findNearestActiveManager(pool, l8Id);
        assert(mgr1 !== null, 'Found a manager');
        assert(mgr1.id === l5Id, 'L8 directly reports to L5');
        assert(mgr1.is_direct_manager === true, 'is_direct_manager flag is true');
        assert(mgr1.steps_climbed === 1, 'Steps climbed is 1');
        assert(mgr1.vacancy_bypassed === false, 'Vacancy was not bypassed');

        // ─── TEST 2: Self-Healing Vacancy Rule (Manager Resigned) ───
        console.log('\n🧪 Test 2: Self-Healing Vacancy Rule');
        console.log('   Simulating L5 Area Manager resignation (employment_status = "Resigned")...');
        await pool.query("UPDATE staff_members SET employment_status = 'Resigned' WHERE id = ?", [l5Id]);

        const mgrVacant = await findNearestActiveManager(pool, l8Id);
        assert(mgrVacant !== null, 'Found an escalated manager despite L5 vacancy');
        assert(mgrVacant.id === l3Id, 'L8 automatically escalated past resigned L5 directly to L3 HOD');
        assert(mgrVacant.steps_climbed === 2, 'Steps climbed is 2 (skipped vacant L5)');
        assert(mgrVacant.vacancy_bypassed === true, 'vacancy_bypassed flag is true');

        // ─── TEST 3: Multi-Level Vacancy Cascade (Both L5 and L3 Resigned) ───
        console.log('\n🧪 Test 3: Multi-Level Vacancy Cascade');
        console.log('   Simulating L3 HOD also resigns (employment_status = "Resigned")...');
        await pool.query("UPDATE staff_members SET employment_status = 'Resigned' WHERE id = ?", [l3Id]);

        const mgrDoubleVacant = await findNearestActiveManager(pool, l8Id);
        assert(mgrDoubleVacant !== null, 'Found apex manager');
        assert(mgrDoubleVacant.id === l1Id, 'L8 cascaded all the way to L1 Founder/MD with zero dead ends');
        assert(mgrDoubleVacant.steps_climbed === 3, 'Steps climbed is 3');

        // Restore L3 and L5 back to Active
        await pool.query("UPDATE staff_members SET employment_status = 'Active' WHERE id IN (?, ?)", [l3Id, l5Id]);

        // ─── TEST 4: Upward Chain of Command ───
        console.log('\n🧪 Test 4: Upward Chain of Command Tracing');
        const chain = await getStaffReportingChain(pool, l8Id);
        assert(chain.length === 4, 'Full chain length from L8 to L1 is 4');
        assert(chain[0].id === l8Id, 'Chain starts with self (L8)');
        assert(chain[1].id === l5Id, 'Chain step 1 is L5');
        assert(chain[2].id === l3Id, 'Chain step 2 is L3');
        assert(chain[3].id === l1Id, 'Chain step 3 is L1');

        // ─── TEST 5: Downline Tree Subordinate Resolution ───
        console.log('\n🧪 Test 5: Subordinate Downline Tree Resolution');
        const downlineL3 = await getStaffDownline(pool, l3Id);
        assert(downlineL3.total_downline_count === 2, 'L3 has exactly 2 downline subordinates (L5 and L8)');
        assert(downlineL3.ids.includes(l5Id), 'L3 downline includes L5');
        assert(downlineL3.ids.includes(l8Id), 'L3 downline includes L8');

        const isL8UnderL3 = await isStaffInDownline(pool, l3Id, l8Id);
        assert(isL8UnderL3 === true, 'isStaffInDownline(L3, L8) is true');

        const isL3UnderL8 = await isStaffInDownline(pool, l8Id, l3Id);
        assert(isL3UnderL8 === false, 'isStaffInDownline(L8, L3) is false');

        // ─── TEST 6: Delegation of Authority (DOA) Limit Matching ───
        console.log('\n🧪 Test 6: Delegation of Authority (DOA) Approver Resolution');
        // Let's set specific limits:
        // L5: 5% discount, ₹10,000 expense
        // L3: 10% discount, ₹50,000 expense
        // L1: 100% discount, ₹9999999 expense
        await pool.query("UPDATE designations SET default_discount_limit = 5, default_expense_limit = 10000 WHERE id = ?", [desigMap['L5']]);
        await pool.query("UPDATE designations SET default_discount_limit = 10, default_expense_limit = 50000 WHERE id = ?", [desigMap['L3']]);

        // Scenario A: 3% discount (within L5 limit of 5%)
        const resA = await resolveEligibleApprover(pool, l8Id, 'discount', 3);
        assert(resA.approver.id === l5Id, '3% discount is approved directly by L5 Manager');
        assert(resA.escalated === false, 'No escalation needed');

        // Scenario B: 7% discount (exceeds L5 limit of 5%, within L3 limit of 10%)
        const resB = await resolveEligibleApprover(pool, l8Id, 'discount', 7);
        assert(resB.approver.id === l3Id, '7% discount automatically escalates to L3 HOD');
        assert(resB.escalated === true, 'Escalated flag is true');

        // Scenario C: 15% discount (exceeds L3 limit of 10%, routes to L1 Founder)
        const resC = await resolveEligibleApprover(pool, l8Id, 'discount', 15);
        assert(resC.approver.id === l1Id, '15% discount escalates to L1 Founder/MD');

        // Scenario D: ₹25,000 emergency expense (exceeds L5 limit of ₹10,000, within L3 limit of ₹50,000)
        const resD = await resolveEligibleApprover(pool, l8Id, 'expense', 25000);
        assert(resD.approver.id === l3Id, '₹25,000 expense routes to L3 HOD');

        // ─── TEST 7: Circular Loop Protection ───
        console.log('\n🧪 Test 7: Circular Reporting Loop Protection');
        console.log('   Simulating malicious/corrupt circular reference: L3 -> L5 and L5 -> L3...');
        await pool.query("UPDATE staff_members SET reporting_to_id = ? WHERE id = ?", [l5Id, l3Id]);
        
        const loopSafeMgr = await findNearestActiveManager(pool, l8Id);
        assert(loopSafeMgr !== null, 'Gracefully handled circular loop without infinite hang');
        assert(loopSafeMgr.id === l5Id, 'Returned closest valid node before cycle');

        // ─── CLEANUP ───
        console.log('\n🧹 Cleaning up synthetic test staff...');
        await pool.query("DELETE FROM staff_members WHERE id IN (?, ?, ?, ?)", [l1Id, l3Id, l5Id, l8Id]);
        console.log('   Test records cleaned up.');

        console.log(`\n========================================`);
        console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
        console.log(`========================================\n`);

        if (failed > 0) {
            process.exit(1);
        } else {
            process.exit(0);
        }
    } catch (err) {
        console.error('💥 Test suite crashed with error:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runTests();
