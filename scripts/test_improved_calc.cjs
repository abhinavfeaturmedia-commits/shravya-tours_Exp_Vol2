const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config({ path: './backend/.env' });

function findMatchingRule(rules, staffDept = '', staffRole = '') {
    const sDept = (staffDept || '').toLowerCase().trim();
    const sRole = (staffRole || '').toLowerCase().trim();

    // 1. Direct match
    let rule = rules.find(r => 
        (r.department || '').toLowerCase().trim() === sDept &&
        (r.role || '').toLowerCase().trim() === sRole
    );
    if (rule) return rule;

    const isSales = sDept.includes('sales') || sDept.includes('business development') || sRole.includes('sales');
    const isOps = sDept.includes('operation') || sRole.includes('ticketing') || sRole.includes('operation');
    const isCustomerCare = sDept.includes('customer') || sDept.includes('support') || sRole.includes('customer');
    const isMarketing = sDept.includes('market');
    const isManagement = sDept.includes('management') || sDept.includes('executive') || sRole.includes('director') || sRole.includes('head');

    if (isSales) {
        if (sRole.includes('lead') || sRole.includes('manager')) {
            rule = rules.find(r => (r.department || '').toLowerCase().includes('sales') && (r.role || '').toLowerCase().includes('lead'));
        } else if (sRole.includes('senior')) {
            rule = rules.find(r => (r.department || '').toLowerCase().includes('sales') && (r.role || '').toLowerCase().includes('senior'));
        }
        if (!rule) rule = rules.find(r => (r.department || '').toLowerCase().includes('sales') && (r.role || '').toLowerCase().includes('executive'));
        if (!rule) rule = rules.find(r => (r.department || '').toLowerCase().includes('sales'));
    } else if (isOps) {
        rule = rules.find(r => (r.department || '').toLowerCase().includes('operation'));
    } else if (isCustomerCare) {
        rule = rules.find(r => (r.department || '').toLowerCase().includes('customer'));
    } else if (isMarketing) {
        rule = rules.find(r => (r.department || '').toLowerCase().includes('marketing'));
    } else if (isManagement) {
        rule = rules.find(r => (r.department || '').toLowerCase().includes('management'));
    }

    if (rule) return rule;

    // Default to sales executive if nothing else
    return rules.find(r => (r.department || '').toLowerCase().includes('sales')) || rules[0];
}

async function testImprovedLogic(monthYear, periodStart, periodEnd) {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 5
    });

    const conn = await pool.getConnection();
    try {
        console.log(`\n================ IMPROVED LOGIC TEST FOR ${monthYear} ================`);
        const [activePlans] = await conn.query(`SELECT * FROM incentive_plans WHERE status = 'Active' ORDER BY created_at DESC LIMIT 1`);
        const plan = activePlans[0];
        const [rules] = await conn.query(`SELECT * FROM incentive_rules WHERE plan_id = ? AND status = 'Active' ORDER BY priority ASC`, [plan.id]);
        const [bookings] = await conn.query(`
            SELECT id, booking_number, customer_name, total_price, status, payment_status, assigned_to, assigned_staff_ids, booking_date, lead_id
            FROM bookings WHERE booking_date >= ? AND booking_date <= ?
        `, [periodStart, periodEnd]);
        const [staffList] = await conn.query(`SELECT id, name, role, department FROM staff_members`);
        const staffMap = new Map();
        staffList.forEach(s => staffMap.set(String(s.id), s));

        let eligibleCount = 0;
        let totalValue = 0;
        let totalGP = 0;
        const employeeAggregates = new Map();

        for (const b of bookings) {
            const bStatus = (b.status || '').toLowerCase().trim();
            const pStatus = (b.payment_status || '').toLowerCase().trim();
            if (bStatus !== 'completed' || pStatus !== 'paid') continue;

            const [suppliers] = await conn.query(`SELECT cost, paid_amount, payment_status FROM supplier_bookings WHERE booking_id = ?`, [b.id]);
            let totalSupplierCost = 0;
            let unsettled = 0;
            for (const s of suppliers) {
                const c = parseFloat(s.cost || 0);
                const p = parseFloat(s.paid_amount || 0);
                totalSupplierCost += c;
                if (c > 0 && c > p) unsettled++;
            }
            if (unsettled > 0) continue;

            const [refunds] = await conn.query(`SELECT id FROM booking_transactions WHERE booking_id = ? AND type = 'Refund' AND status = 'Pending'`, [b.id]);
            if (refunds.length > 0) continue;

            eligibleCount++;
            const totalAmount = parseFloat(b.total_price || 0);
            totalValue += totalAmount;
            const grossProfit = Math.max(0, totalAmount - totalSupplierCost);
            totalGP += grossProfit;

            let staffIds = [];
            if (b.assigned_staff_ids) {
                try {
                    const parsed = typeof b.assigned_staff_ids === 'string' ? JSON.parse(b.assigned_staff_ids) : b.assigned_staff_ids;
                    if (Array.isArray(parsed)) staffIds = parsed.map(String);
                } catch (_) {}
            }
            if (staffIds.length === 0 && b.assigned_to) staffIds.push(String(b.assigned_to));
            if (staffIds.length === 0) staffIds.push('1');

            const splits = [];
            if (staffIds.length === 2 && staffIds[0] !== staffIds[1]) {
                const s1 = staffMap.get(staffIds[0]) || { id: staffIds[0], name: 'Staff #' + staffIds[0], role: 'Sales Executive', department: 'Sales' };
                const s2 = staffMap.get(staffIds[1]) || { id: staffIds[1], name: 'Staff #' + staffIds[1], role: 'Sales Executive', department: 'Sales' };
                splits.push({ staffMember: s1, ratio: 0.30 });
                splits.push({ staffMember: s2, ratio: 0.70 });
            } else if (staffIds.length > 2) {
                const equalRatio = 1.0 / staffIds.length;
                for (const sId of staffIds) {
                    const s = staffMap.get(sId) || { id: sId, name: 'Staff #' + sId, role: 'Sales Executive', department: 'Sales' };
                    splits.push({ staffMember: s, ratio: equalRatio });
                }
            } else {
                const s = staffMap.get(staffIds[0]) || { id: staffIds[0], name: 'Staff #' + staffIds[0], role: 'Sales Executive', department: 'Sales' };
                splits.push({ staffMember: s, ratio: 1.00 });
            }

            for (const sp of splits) {
                const staff = sp.staffMember;
                const matchingRule = findMatchingRule(rules, staff.department, staff.role);
                const rate = parseFloat(matchingRule.percentage || 2.0);
                const splitVal = totalAmount * sp.ratio;
                const splitGP = grossProfit * sp.ratio;
                const splitIncentive = (splitVal * rate) / 100;

                if (!employeeAggregates.has(staff.id)) {
                    employeeAggregates.set(staff.id, {
                        staff,
                        rule: matchingRule,
                        eligibleBusiness: 0,
                        bookingCount: 0,
                        baseIncentive: 0,
                        targetAmount: null
                    });
                }
                const agg = employeeAggregates.get(staff.id);
                agg.eligibleBusiness += splitVal;
                agg.bookingCount += sp.ratio;
                agg.baseIncentive += splitIncentive;
            }
        }

        console.log(`Eligible Bookings: ${eligibleCount}, Business: ₹${totalValue.toFixed(2)}, GP: ₹${totalGP.toFixed(2)}`);

        let totalPayable = 0;
        for (const [empId, agg] of employeeAggregates.entries()) {
            const [storedTargets] = await conn.query(`SELECT target_amount FROM staff_monthly_targets WHERE staff_id = ? AND month_year = ?`, [empId, monthYear]);
            let target = storedTargets.length > 0 && parseFloat(storedTargets[0].target_amount) > 0 ? parseFloat(storedTargets[0].target_amount) : null;
            agg.targetAmount = target;

            let applicableRate = parseFloat(agg.rule.percentage || 2.0);
            let achievementPct = 100.0;

            if (agg.rule.target_dependency) {
                if (target !== null && target > 0) {
                    achievementPct = (agg.eligibleBusiness / target) * 100;
                    // Slabs with 1.0% floor for valid business below 70%
                    if (achievementPct < 70) applicableRate = 1.0;
                    else if (achievementPct < 90) applicableRate = 1.5;
                    else if (achievementPct < 100) applicableRate = 1.75;
                    else if (achievementPct < 120) applicableRate = 2.0;
                    else if (achievementPct < 150) applicableRate = 2.5;
                    else applicableRate = 3.0;
                } else {
                    // No target set by admin -> Baseline on-target rate (2.0%)
                    achievementPct = 100.0;
                    applicableRate = parseFloat(agg.rule.percentage || 2.0);
                }
            }

            const kpiMultiplier = 1.0; // standard 100%
            const payable = (agg.eligibleBusiness * applicableRate) / 100 * kpiMultiplier;
            totalPayable += payable;

            console.log(`Staff: ${agg.staff.name} (${agg.staff.department} - ${agg.staff.role})`);
            console.log(`  Rule: ${agg.rule.department} - ${agg.rule.role}`);
            console.log(`  Business: ₹${agg.eligibleBusiness.toFixed(2)} | Target: ${target ? `₹${target}` : 'None Set (100% baseline)'} | Ach: ${achievementPct.toFixed(1)}%`);
            console.log(`  Rate: ${applicableRate}% | Final Payable: ₹${payable.toFixed(2)}\n`);
        }

        const maxBookingPct = parseFloat(plan.maximum_booking_percentage || 7.0);
        const gpProtectionPct = parseFloat(plan.gp_protection_percentage || 40.0);
        const maxCapacity = (totalValue * maxBookingPct) / 100;
        const gpLimit = (totalGP * gpProtectionPct) / 100;
        const allowedCeiling = Math.min(maxCapacity, gpLimit);

        console.log(`TOTAL CALCULATED INCENTIVE: ₹${totalPayable.toFixed(2)}`);
        console.log(`CEILING CAP (Max: 7% = ₹${maxCapacity.toFixed(2)}, 40% GP = ₹${gpLimit.toFixed(2)}) -> Allowed: ₹${allowedCeiling.toFixed(2)}`);
        console.log(`WITHIN CEILING? ${totalPayable <= allowedCeiling} (Difference: ₹${(allowedCeiling - totalPayable).toFixed(2)})`);

    } finally {
        conn.release();
        await pool.end();
    }
}

async function main() {
    await testImprovedLogic('2026-10', '2026-10-01', '2026-10-31');
    await testImprovedLogic('2026-06', '2026-06-01', '2026-06-30');
}
main();

