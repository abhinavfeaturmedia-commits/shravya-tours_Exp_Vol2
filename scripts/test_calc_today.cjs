const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config({ path: './backend/.env' });

async function testCalculation(monthYear, periodStart, periodEnd) {
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
        console.log(`\n================ RUNNING TEST CALCULATION FOR ${monthYear} ================`);
        
        // 1. Fetch active plan
        const [activePlans] = await conn.query(`
            SELECT id FROM incentive_plans WHERE status = 'Active' ORDER BY created_at DESC LIMIT 1
        `);
        const activePlanId = activePlans[0].id;
        const [planRows] = await conn.query(`SELECT * FROM incentive_plans WHERE id = ?`, [activePlanId]);
        const plan = planRows[0];
        console.log('Using Plan:', plan.name, 'Max Booking %:', plan.maximum_booking_percentage, 'GP Protection %:', plan.gp_protection_percentage);

        // 2. Fetch rules
        const [rules] = await conn.query(`
            SELECT * FROM incentive_rules WHERE plan_id = ? AND status = 'Active' ORDER BY priority ASC
        `, [activePlanId]);
        console.log(`Active Rules count: ${rules.length}`);

        // 3. Fetch bookings
        const [bookings] = await conn.query(`
            SELECT 
                id, booking_number, customer_name, total_price, status, payment_status,
                assigned_to, assigned_staff_ids, booking_date, lead_id
            FROM bookings
            WHERE booking_date >= ? AND booking_date <= ?
        `, [periodStart, periodEnd]);
        console.log(`Bookings in period: ${bookings.length}`);

        // 4. Cache staff members
        const [staffList] = await conn.query(`SELECT id, name, role, department FROM staff_members`);
        const staffMap = new Map();
        staffList.forEach(s => staffMap.set(String(s.id), s));

        // Eligibility check
        async function checkEligibility(b) {
            const issues = [];
            const bStatus = (b.status || '').toLowerCase().trim();
            if (bStatus !== 'completed') issues.push(`Booking status is '${b.status}', must be 'completed'`);
            const pStatus = (b.payment_status || '').toLowerCase().trim();
            if (pStatus !== 'paid') issues.push(`Customer payment status is '${b.payment_status}', must be 'paid'`);
            
            const [suppliers] = await conn.query(`
                SELECT cost, paid_amount, payment_status, booking_status 
                FROM supplier_bookings 
                WHERE booking_id = ?
            `, [b.id]);

            let totalSupplierCost = 0;
            let totalSupplierPaid = 0;
            let unsettledSuppliers = 0;

            for (const sup of suppliers) {
                const cost = parseFloat(sup.cost || 0);
                const paid = parseFloat(sup.paid_amount || 0);
                totalSupplierCost += cost;
                totalSupplierPaid += paid;
                const supPayStatus = (sup.payment_status || '').toLowerCase();
                if (cost > 0 && (cost > paid || (supPayStatus !== 'paid' && supPayStatus !== 'partially paid'))) {
                    unsettledSuppliers++;
                }
            }
            if (unsettledSuppliers > 0) issues.push(`${unsettledSuppliers} supplier booking(s) have pending payments`);

            const [refunds] = await conn.query(`
                SELECT id FROM booking_transactions 
                WHERE booking_id = ? AND type = 'Refund' AND status = 'Pending'
            `, [b.id]);
            if (refunds.length > 0) issues.push('Pending customer refund exists');

            const [overrides] = await conn.query(`
                SELECT id, reason, override_by FROM incentive_booking_overrides WHERE booking_id = ?
            `, [b.id]);

            const hasOverride = overrides.length > 0;
            const isEligible = issues.length === 0 || hasOverride;

            const totalAmount = parseFloat(b.total_price || 0);
            let eligibleValue = totalAmount;
            const [invs] = await conn.query(`
                SELECT tax_total, subtotal FROM invoices WHERE booking_id = ? LIMIT 1
            `, [b.id]);
            if (invs.length > 0 && parseFloat(invs[0].subtotal || 0) > 0) {
                eligibleValue = parseFloat(invs[0].subtotal);
            }
            const grossProfit = Math.max(0, eligibleValue - totalSupplierCost);

            return { isEligible, issues, eligibleValue, grossProfit, supplierCost: totalSupplierCost };
        }

        let eligibleBookingCount = 0;
        let totalBookingValue = 0;
        let totalGrossProfit = 0;
        const employeeAggregates = new Map();
        const ledgerRows = [];

        for (const b of bookings) {
            const evalResult = await checkEligibility(b);
            if (!evalResult.isEligible) continue;

            eligibleBookingCount++;
            totalBookingValue += evalResult.eligibleValue;
            totalGrossProfit += evalResult.grossProfit;

            let staffIds = [];
            if (b.assigned_staff_ids) {
                try {
                    const parsed = typeof b.assigned_staff_ids === 'string' ? JSON.parse(b.assigned_staff_ids) : b.assigned_staff_ids;
                    if (Array.isArray(parsed)) staffIds = parsed.map(String);
                } catch (_) {}
            }
            if (staffIds.length === 0 && b.assigned_to) staffIds.push(String(b.assigned_to));
            if (staffIds.length === 0) staffIds.push('1');

            const transferSplits = [];
            if (staffIds.length >= 2 && staffIds[0] !== staffIds[1]) {
                const s1 = staffMap.get(staffIds[0]) || { id: staffIds[0], name: 'Staff #' + staffIds[0], role: 'Sales Executive', department: 'Sales' };
                const s2 = staffMap.get(staffIds[1]) || { id: staffIds[1], name: 'Staff #' + staffIds[1], role: 'Sales Executive', department: 'Sales' };
                transferSplits.push({ staffMember: s1, ratio: 0.30, isSplit: true });
                transferSplits.push({ staffMember: s2, ratio: 0.70, isSplit: true });
            } else {
                const s1 = staffMap.get(staffIds[0]) || { id: staffIds[0], name: 'Staff #' + staffIds[0], role: 'Sales Executive', department: 'Sales' };
                transferSplits.push({ staffMember: s1, ratio: 1.00, isSplit: false });
            }

            for (const split of transferSplits) {
                const staffMember = split.staffMember;
                const staffDept = staffMember.department || 'Sales';
                const staffRole = staffMember.role || 'Sales Executive';

                let matchingRule = rules.find(r => 
                    r.department.toLowerCase() === staffDept.toLowerCase() && 
                    (r.role.toLowerCase() === staffRole.toLowerCase() || r.role.toLowerCase().includes('executive'))
                );
                if (!matchingRule) {
                    matchingRule = rules.find(r => r.department.toLowerCase() === staffDept.toLowerCase());
                }
                if (!matchingRule) {
                    matchingRule = rules[0];
                }

                const applicableRate = parseFloat(matchingRule.percentage || 0);
                const splitEligibleValue = evalResult.eligibleValue * split.ratio;
                const splitGrossProfit = evalResult.grossProfit * split.ratio;
                const splitGrossIncentive = (splitEligibleValue * applicableRate) / 100;

                ledgerRows.push({
                    booking_number: b.booking_number,
                    staff: staffMember.name,
                    dept: staffDept,
                    role: staffRole,
                    rule: `${matchingRule.department} - ${matchingRule.role} (${applicableRate}%)`,
                    splitEligibleValue,
                    splitGrossIncentive
                });

                if (!employeeAggregates.has(staffMember.id)) {
                    employeeAggregates.set(staffMember.id, {
                        staff: staffMember,
                        rule: matchingRule,
                        eligibleBusiness: 0,
                        bookingCount: 0,
                        baseIncentive: 0,
                        kpiScore: 100,
                        targetAmount: 500000
                    });
                }
                const empAgg = employeeAggregates.get(staffMember.id);
                empAgg.eligibleBusiness += splitEligibleValue;
                empAgg.bookingCount += (split.isSplit ? split.ratio : 1);
                empAgg.baseIncentive += splitGrossIncentive;
            }
        }

        console.log(`Eligible Bookings: ${eligibleBookingCount}, Total Value: ${totalBookingValue}, GP: ${totalGrossProfit}`);
        console.log('\n--- SAMPLE LEDGER ENTRIES ---');
        console.log(ledgerRows.slice(0, 5));

        console.log('\n--- EMPLOYEE AGGREGATION & FINAL PAYABLE ---');
        let totalCalculatedIncentive = 0;
        for (const [empId, agg] of employeeAggregates.entries()) {
            let applicableSlabRate = parseFloat(agg.rule.percentage || 0);
            let targetAchievementPct = 100.00;

            const [storedTargets] = await conn.query(`
                SELECT target_amount, target_bookings FROM staff_monthly_targets 
                WHERE staff_id = ? AND month_year = ?
            `, [empId, monthYear]);

            let employeeTarget = agg.targetAmount;
            if (storedTargets.length > 0 && parseFloat(storedTargets[0].target_amount) > 0) {
                employeeTarget = parseFloat(storedTargets[0].target_amount);
            }
            agg.targetAmount = employeeTarget;

            if (agg.rule.target_dependency && agg.rule.slabs_json) {
                try {
                    const slabs = typeof agg.rule.slabs_json === 'string' ? JSON.parse(agg.rule.slabs_json) : agg.rule.slabs_json;
                    targetAchievementPct = employeeTarget > 0 ? (agg.eligibleBusiness / employeeTarget) * 100 : 100;
                    if (Array.isArray(slabs)) {
                        const matchedSlab = slabs.find(s => targetAchievementPct >= s.min_pct && targetAchievementPct <= s.max_pct);
                        if (matchedSlab) {
                            applicableSlabRate = parseFloat(matchedSlab.rate_pct);
                        }
                    }
                } catch (_) {}
            }

            const calibratedBase = (agg.eligibleBusiness * applicableSlabRate) / 100;
            const finalPayable = Math.max(0, calibratedBase);
            totalCalculatedIncentive += finalPayable;

            console.log(`Staff: ${agg.staff.name} (ID: ${empId}, Dept: ${agg.staff.department}, Role: ${agg.staff.role})`);
            console.log(`  Rule: ${agg.rule.department} - ${agg.rule.role} (target_dep: ${agg.rule.target_dependency})`);
            console.log(`  Eligible Business: ₹${agg.eligibleBusiness.toFixed(2)}, Target: ₹${employeeTarget.toFixed(2)}, Achievement: ${targetAchievementPct.toFixed(1)}%`);
            console.log(`  Initial Rate: ${agg.rule.percentage}%, Slab Rate: ${applicableSlabRate}%, Final Payable: ₹${finalPayable.toFixed(2)}\n`);
        }

        console.log(`TOTAL CALCULATED INCENTIVE: ₹${totalCalculatedIncentive.toFixed(2)}`);

    } finally {
        conn.release();
        await pool.end();
    }
}

testCalculation('2026-10', '2026-10-01', '2026-10-31');

