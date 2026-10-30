const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config({ path: './backend/.env' });

function findMatchingRule(rules, staffDept = '', staffRole = '') {
    const sDept = (staffDept || '').toLowerCase().trim();
    const sRole = (staffRole || '').toLowerCase().trim();

    let rule = rules.find(r => 
        (r.department || '').toLowerCase().trim() === sDept &&
        (r.role || '').toLowerCase().trim() === sRole
    );
    if (rule) return rule;

    const isSales = sDept.includes('sales') || sDept.includes('business development') || sRole.includes('sales');
    const isOps = sDept.includes('operation') || sRole.includes('ticketing') || sRole.includes('operation');
    const isCustomerCare = sDept.includes('customer') || sDept.includes('support') || sRole.includes('customer');
    const isMarketing = sDept.includes('market');
    const isTech = sDept.includes('tech') || sDept.includes('it') || sRole.includes('admin');
    const isManagement = sDept.includes('management') || sDept.includes('executive') || sRole.includes('director') || sRole.includes('founder');

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
    } else if (isTech) {
        rule = rules.find(r => (r.department || '').toLowerCase().includes('technology'));
    } else if (isManagement) {
        rule = rules.find(r => (r.department || '').toLowerCase().includes('management'));
    }

    if (rule) return rule;
    rule = rules.find(r => (r.department || '').toLowerCase().trim() === sDept);
    if (rule) return rule;

    return rules.find(r => (r.department || '').toLowerCase().includes('sales')) || rules[0];
}

async function testWithAllStaffAndConfirmed(monthYear, periodStart, periodEnd) {
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
        console.log(`\n================ TESTING ALL STAFF & CONFIRMED/PAID ELIGIBILITY FOR ${monthYear} ================`);
        const [plans] = await conn.query(`SELECT * FROM incentive_plans WHERE status = 'Active' ORDER BY created_at DESC LIMIT 1`);
        const plan = plans[0];
        const [rules] = await conn.query(`SELECT * FROM incentive_rules WHERE plan_id = ? AND status = 'Active' ORDER BY priority ASC`, [plan.id]);
        const [staffList] = await conn.query(`SELECT id, name, role, department, status FROM staff_members`);
        const staffMap = new Map();
        staffList.forEach(s => staffMap.set(String(s.id), s));

        // Seed all active staff into employeeAggregates!
        const employeeAggregates = new Map();
        for (const s of staffList) {
            if (s.status === 'Inactive') continue;
            const matchingRule = findMatchingRule(rules, s.department, s.role);
            employeeAggregates.set(String(s.id), {
                staff: s,
                rule: matchingRule,
                eligibleBusiness: 0,
                bookingCount: 0,
                baseIncentive: 0,
                targetAmount: null
            });
        }

        // Fetch bookings
        const [bookings] = await conn.query(`
            SELECT id, booking_number, customer_name, total_price, status, payment_status, assigned_to, assigned_staff_ids, booking_date, lead_id
            FROM bookings WHERE booking_date >= ? AND booking_date <= ?
        `, [periodStart, periodEnd]);

        let eligibleCount = 0;
        let totalValue = 0;
        let totalGP = 0;

        for (const b of bookings) {
            const bStatus = (b.status || '').toLowerCase().trim();
            const pStatus = (b.payment_status || '').toLowerCase().trim();
            // Accept completed OR confirmed (with paid customer payment)
            const isStatusEligible = bStatus === 'completed' || bStatus === 'confirmed';
            if (!isStatusEligible || pStatus !== 'paid') continue;

            const [suppliers] = await conn.query(`SELECT cost, paid_amount FROM supplier_bookings WHERE booking_id = ?`, [b.id]);
            let totalSupplierCost = 0;
            let unsettled = 0;
            for (const sup of suppliers) {
                const c = parseFloat(sup.cost || 0);
                const p = parseFloat(sup.paid_amount || 0);
                totalSupplierCost += c;
                if (c > 0 && c > p) unsettled++;
            }
            if (unsettled > 0) continue;

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
                const agg = employeeAggregates.get(String(staff.id));
                if (agg) {
                    const rate = parseFloat(agg.rule.percentage || 2.0);
                    const splitVal = totalAmount * sp.ratio;
                    const splitIncentive = (splitVal * rate) / 100;
                    agg.eligibleBusiness += splitVal;
                    agg.bookingCount += sp.ratio;
                    agg.baseIncentive += splitIncentive;
                }
            }
        }

        console.log(`Eligible Bookings: ${eligibleCount}/${bookings.length}, Total Business: ₹${totalValue.toFixed(2)}, GP: ₹${totalGP.toFixed(2)}\n`);

        console.log('--- ALL STAFF SUMMARY ROSTER ---');
        let totalCalculatedIncentive = 0;
        for (const [empId, agg] of employeeAggregates.entries()) {
            const [storedTargets] = await conn.query(`SELECT target_amount FROM staff_monthly_targets WHERE staff_id = ? AND month_year = ?`, [empId, monthYear]);
            let target = storedTargets.length > 0 && parseFloat(storedTargets[0].target_amount) > 0 ? parseFloat(storedTargets[0].target_amount) : null;
            agg.targetAmount = target;

            let applicableRate = parseFloat(agg.rule.percentage || 2.0);
            let achievementPct = 0.0;

            if (agg.eligibleBusiness > 0) {
                if (agg.rule.target_dependency && target && target > 0) {
                    achievementPct = (agg.eligibleBusiness / target) * 100;
                    if (achievementPct < 70) applicableRate = 1.0;
                    else if (achievementPct < 90) applicableRate = 1.0;
                    else if (achievementPct < 100) applicableRate = 1.5;
                    else if (achievementPct < 120) applicableRate = 2.0;
                    else if (achievementPct < 150) applicableRate = 2.5;
                    else applicableRate = 3.0;
                } else {
                    achievementPct = 100.0;
                    applicableRate = parseFloat(agg.rule.percentage || 2.0);
                }
            }

            const payable = (agg.eligibleBusiness * applicableRate) / 100;
            totalCalculatedIncentive += payable;

            console.log(`Staff ID: ${empId.padEnd(4)} | Name: ${agg.staff.name.padEnd(20)} | Dept: ${(agg.staff.department || '').padEnd(25)} | Bookings: ${agg.bookingCount.toFixed(1)} | Business: ₹${agg.eligibleBusiness.toFixed(2).padStart(10)} | Rate: ${applicableRate}% | Final Payable: ₹${payable.toFixed(2)}`);
        }

        console.log(`\nTOTAL CALCULATED INCENTIVE: ₹${totalCalculatedIncentive.toFixed(2)}`);

    } finally {
        conn.release();
        await pool.end();
    }
}

testWithAllStaffAndConfirmed('2026-10', '2026-10-01', '2026-10-31');

