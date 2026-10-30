const mysql = require('mysql2/promise');
const crypto = require('crypto');
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

async function checkBookingEligibility(conn, booking) {
    const issues = [];
    const bStatus = (booking.status || '').toLowerCase().trim();
    if (bStatus !== 'completed' && bStatus !== 'confirmed') issues.push(`Booking status is '${booking.status}', must be 'completed' or 'confirmed'`);
    const pStatus = (booking.payment_status || '').toLowerCase().trim();
    if (pStatus !== 'paid') issues.push(`Customer payment status is '${booking.payment_status}', must be 'paid'`);

    const [suppliers] = await conn.query(`
        SELECT cost, paid_amount, payment_status, booking_status FROM supplier_bookings WHERE booking_id = ?
    `, [booking.id]);

    let totalSupplierCost = 0;
    let unsettledSuppliers = 0;
    for (const sup of suppliers) {
        const cost = parseFloat(sup.cost || 0);
        const paid = parseFloat(sup.paid_amount || 0);
        totalSupplierCost += cost;
        if (cost > 0 && cost > paid) unsettledSuppliers++;
    }
    if (unsettledSuppliers > 0) issues.push(`${unsettledSuppliers} supplier booking(s) have pending payments`);

    const [refunds] = await conn.query(`
        SELECT id FROM booking_transactions WHERE booking_id = ? AND type = 'Refund' AND status = 'Pending'
    `, [booking.id]);
    if (refunds.length > 0) issues.push('Pending customer refund exists');

    const [overrides] = await conn.query(`
        SELECT id, reason, override_by FROM incentive_booking_overrides WHERE booking_id = ?
    `, [booking.id]);

    const hasOverride = overrides.length > 0;
    const isEligible = issues.length === 0 || hasOverride;

    const totalAmount = parseFloat(booking.total_price || 0);
    let eligibleValue = totalAmount;
    const [invs] = await conn.query(`SELECT subtotal FROM invoices WHERE booking_id = ? LIMIT 1`, [booking.id]);
    if (invs.length > 0 && parseFloat(invs[0].subtotal || 0) > 0) {
        eligibleValue = parseFloat(invs[0].subtotal);
    }
    const grossProfit = Math.max(0, eligibleValue - totalSupplierCost);

    return { isEligible, issues, eligibleValue, grossProfit, supplierCost: totalSupplierCost };
}

async function runRecalculation(monthYear, periodStart, periodEnd) {
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
        await conn.beginTransaction();
        console.log(`\n>>> CALCULATING INCENTIVE RUN FOR ${monthYear} (${periodStart} to ${periodEnd}) <<<`);

        // 1. Plan & rules
        const [plans] = await conn.query(`SELECT * FROM incentive_plans WHERE status = 'Active' ORDER BY created_at DESC LIMIT 1`);
        const plan = plans[0];
        const [rules] = await conn.query(`SELECT * FROM incentive_rules WHERE plan_id = ? AND status = 'Active' ORDER BY priority ASC`, [plan.id]);

        const runNumber = `RUN-${monthYear.replace('-', '')}`;
        const [existingRuns] = await conn.query(`SELECT * FROM incentive_runs WHERE run_number = ?`, [runNumber]);
        let runId = existingRuns.length > 0 ? existingRuns[0].id : crypto.randomUUID();

        // 2. Fetch bookings
        const [bookings] = await conn.query(`
            SELECT id, booking_number, customer_name, total_price, status, payment_status, assigned_to, assigned_staff_ids, booking_date, lead_id
            FROM bookings WHERE booking_date >= ? AND booking_date <= ?
        `, [periodStart, periodEnd]);

        // Clean existing draft/calculated ledger & summaries
        await conn.query(`DELETE FROM incentive_ledger WHERE incentive_run_id = ?`, [runId]);
        await conn.query(`DELETE FROM incentive_employee_summaries WHERE incentive_run_id = ?`, [runId]);

        const [staffList] = await conn.query(`SELECT id, name, role, department, status FROM staff_members`);
        const staffMap = new Map();
        staffList.forEach(s => staffMap.set(String(s.id), s));

        let totalBookingCount = bookings.length;
        let eligibleBookingCount = 0;
        let excludedBookingCount = 0;
        let totalBookingValue = 0;
        let totalGrossProfit = 0;
        const employeeAggregates = new Map();
        for (const s of staffList) {
            if (s.status && s.status.toLowerCase() === 'inactive') continue;
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
        const ledgerRows = [];

        for (const b of bookings) {
            const evalResult = await checkBookingEligibility(conn, b);
            if (!evalResult.isEligible) {
                excludedBookingCount++;
                continue;
            }

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
            if (staffIds.length === 2 && staffIds[0] !== staffIds[1]) {
                const s1 = staffMap.get(staffIds[0]) || { id: staffIds[0], name: 'Staff #' + staffIds[0], role: 'Sales Executive', department: 'Sales' };
                const s2 = staffMap.get(staffIds[1]) || { id: staffIds[1], name: 'Staff #' + staffIds[1], role: 'Sales Executive', department: 'Sales' };
                transferSplits.push({ staffMember: s1, ratio: 0.30, isSplit: true, roleDescription: 'Sales Executive (30% Split)', splitTag: 'SPLIT_30' });
                transferSplits.push({ staffMember: s2, ratio: 0.70, isSplit: true, roleDescription: 'Sales Executive (70% Split)', splitTag: 'SPLIT_70' });
            } else if (staffIds.length > 2) {
                const equalRatio = 1.0 / staffIds.length;
                for (const sId of staffIds) {
                    const s = staffMap.get(sId) || { id: sId, name: 'Staff #' + sId, role: 'Sales Executive', department: 'Sales' };
                    transferSplits.push({ staffMember: s, ratio: equalRatio, isSplit: true, roleDescription: s.role, splitTag: 'TEAM_SPLIT' });
                }
            } else {
                const s = staffMap.get(staffIds[0]) || { id: staffIds[0], name: 'Staff #' + staffIds[0], role: 'Sales Executive', department: 'Sales' };
                transferSplits.push({ staffMember: s, ratio: 1.00, isSplit: false, roleDescription: s.role, splitTag: 'DIRECT_100' });
            }

            for (const split of transferSplits) {
                const staffMember = split.staffMember;
                const staffDept = staffMember.department || 'Sales';
                const staffRole = staffMember.role || 'Sales Executive';
                const matchingRule = findMatchingRule(rules, staffDept, staffRole);

                const applicableRate = parseFloat(matchingRule.percentage || 0);
                const splitEligibleValue = evalResult.eligibleValue * split.ratio;
                const splitGrossProfit = evalResult.grossProfit * split.ratio;
                const splitGrossIncentive = (splitEligibleValue * applicableRate) / 100;

                const ledgerId = crypto.randomUUID();
                ledgerRows.push({
                    id: ledgerId,
                    incentive_run_id: runId,
                    booking_id: b.id,
                    booking_number: b.booking_number,
                    employee_id: staffMember.id,
                    department: staffDept,
                    role: split.isSplit ? split.roleDescription : staffRole,
                    incentive_type: matchingRule.incentive_type,
                    booking_value: parseFloat(b.total_price || 0) * split.ratio,
                    eligible_value: splitEligibleValue,
                    supplier_cost: evalResult.supplierCost * split.ratio,
                    gross_profit: splitGrossProfit,
                    applicable_rate: applicableRate,
                    gross_incentive: splitGrossIncentive,
                    kpi_score: 100.00,
                    kpi_multiplier: 1.00,
                    target_achievement: 100.00,
                    target_multiplier: 1.00,
                    bonus: 0,
                    deduction: 0,
                    adjustment: 0,
                    final_incentive: splitGrossIncentive,
                    incentive_plan_id: plan.id,
                    incentive_plan_version: plan.version,
                    rule_id: matchingRule.id,
                    rule_version: matchingRule.version,
                    period: monthYear,
                    status: 'CALCULATED',
                    trace: {
                        formula: `₹${Math.round(splitEligibleValue).toLocaleString('en-IN')} * ${applicableRate}% = ₹${splitGrossIncentive.toFixed(2)}`,
                        ruleName: `${matchingRule.department} - ${matchingRule.role}`
                    }
                });

                const empKey = String(staffMember.id);
                if (!employeeAggregates.has(empKey)) {
                    employeeAggregates.set(empKey, {
                        staff: staffMember,
                        rule: matchingRule,
                        eligibleBusiness: 0,
                        bookingCount: 0,
                        baseIncentive: 0,
                        kpiScore: 100,
                        targetAmount: null
                    });
                }
                const empAgg = employeeAggregates.get(empKey);
                empAgg.eligibleBusiness += splitEligibleValue;
                empAgg.bookingCount += (split.isSplit ? split.ratio : 1);
                empAgg.baseIncentive += splitGrossIncentive;
            }
        }

        const summaryRows = [];
        let totalCalculatedIncentive = 0;

        for (const [empId, agg] of employeeAggregates.entries()) {
            let applicableSlabRate = parseFloat(agg.rule.percentage || 0);
            let targetAchievementPct = 100.00;
            let targetMultiplier = 1.00;

            const [storedTargets] = await conn.query(`
                SELECT target_amount FROM staff_monthly_targets WHERE staff_id = ? AND month_year = ?
            `, [empId, monthYear]);

            let employeeTarget = null;
            if (storedTargets.length > 0 && parseFloat(storedTargets[0].target_amount) > 0) {
                employeeTarget = parseFloat(storedTargets[0].target_amount);
            }
            agg.targetAmount = employeeTarget || 0;

            if (agg.rule.target_dependency && agg.rule.slabs_json) {
                try {
                    const slabs = typeof agg.rule.slabs_json === 'string' ? JSON.parse(agg.rule.slabs_json) : agg.rule.slabs_json;
                    if (employeeTarget && employeeTarget > 0) {
                        targetAchievementPct = (agg.eligibleBusiness / employeeTarget) * 100;
                        if (Array.isArray(slabs)) {
                            const matchedSlab = slabs.find(s => targetAchievementPct >= s.min_pct && targetAchievementPct <= s.max_pct);
                            if (matchedSlab) applicableSlabRate = parseFloat(matchedSlab.rate_pct);
                        }
                    } else {
                        targetAchievementPct = agg.eligibleBusiness > 0 ? 100.00 : 0.00;
                        applicableSlabRate = parseFloat(agg.rule.percentage || 2.0);
                    }
                } catch (_) {}
            } else {
                targetAchievementPct = agg.eligibleBusiness > 0 ? 100.00 : 0.00;
                applicableSlabRate = parseFloat(agg.rule.percentage || 2.0);
            }

            if (applicableSlabRate <= 0 && agg.eligibleBusiness > 0) {
                applicableSlabRate = 1.00;
            }

            let kpiMultiplier = 1.00;
            const calibratedBase = (agg.eligibleBusiness * applicableSlabRate) / 100;
            const finalPayable = Math.max(0, calibratedBase * kpiMultiplier);
            totalCalculatedIncentive += finalPayable;

            summaryRows.push({
                id: crypto.randomUUID(),
                incentive_run_id: runId,
                employee_id: empId,
                department: agg.staff.department || 'Sales',
                role: agg.staff.role || 'Sales Executive',
                month_year: monthYear,
                eligible_business: agg.eligibleBusiness,
                booking_count: agg.bookingCount,
                monthly_target: agg.targetAmount,
                target_achievement_pct: parseFloat(targetAchievementPct.toFixed(2)),
                target_slab_rate: applicableSlabRate,
                kpi_score: 95.00,
                kpi_multiplier: kpiMultiplier,
                base_incentive: calibratedBase,
                kpi_adjustment: 0,
                target_adjustment: 0,
                performance_bonus: 0,
                deduction: 0,
                manual_adjustment: 0,
                reversal: 0,
                final_payable: finalPayable,
                approval_status: 'PENDING',
                payment_status: 'UNPAID'
            });
        }

        const maxBookingPct = parseFloat(plan.maximum_booking_percentage || 7.00);
        const gpProtectionPct = parseFloat(plan.gp_protection_percentage || 40.00);
        const maxCapacityBooking = (totalBookingValue * maxBookingPct) / 100;
        const gpProtectionLimit = (totalGrossProfit * gpProtectionPct) / 100;
        const allowedCeiling = Math.min(maxCapacityBooking, gpProtectionLimit);
        const isExceeded = totalCalculatedIncentive > allowedCeiling;

        const validationFlags = {
            withinCeiling: !isExceeded,
            ceilingDifference: (allowedCeiling - totalCalculatedIncentive).toFixed(2),
            warning: isExceeded ? `Exceeds ceiling limit` : null
        };

        if (existingRuns.length > 0) {
            await conn.query(`
                UPDATE incentive_runs SET
                    period_start = ?, period_end = ?, incentive_plan_id = ?, incentive_plan_version = ?,
                    total_bookings = ?, eligible_bookings = ?, excluded_bookings = ?,
                    total_booking_value = ?, total_gross_profit = ?, maximum_capacity = ?,
                    gp_protection_limit = ?, total_incentive = ?, status = 'CALCULATED',
                    validation_flags = ?, finalized_at = NULL, updated_at = NOW()
                WHERE id = ?
            `, [
                periodStart, periodEnd, plan.id, plan.version,
                totalBookingCount, eligibleBookingCount, excludedBookingCount,
                totalBookingValue, totalGrossProfit, allowedCeiling, gpProtectionLimit,
                totalCalculatedIncentive, JSON.stringify(validationFlags), runId
            ]);
        } else {
            await conn.query(`
                INSERT INTO incentive_runs (
                    id, run_number, period_start, period_end, month_year, incentive_plan_id, incentive_plan_version,
                    total_bookings, eligible_bookings, excluded_bookings, total_booking_value, total_gross_profit,
                    maximum_capacity, gp_protection_limit, total_incentive, status, created_by, validation_flags, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CALCULATED', 'Super Admin', ?, NOW(), NOW())
            `, [
                runId, runNumber, periodStart, periodEnd, monthYear, plan.id, plan.version,
                totalBookingCount, eligibleBookingCount, excludedBookingCount, totalBookingValue, totalGrossProfit,
                allowedCeiling, gpProtectionLimit, totalCalculatedIncentive, JSON.stringify(validationFlags)
            ]);
        }

        // Insert ledger items
        for (const item of ledgerRows) {
            await conn.query(`
                INSERT INTO incentive_ledger (
                    id, incentive_run_id, booking_id, booking_number, employee_id, department, role,
                    incentive_type, booking_value, eligible_value, supplier_cost, gross_profit,
                    applicable_rate, gross_incentive, kpi_score, kpi_multiplier, target_achievement,
                    target_multiplier, bonus, deduction, adjustment, final_incentive, incentive_plan_id,
                    incentive_plan_version, rule_id, rule_version, period, status, calculation_trace
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CALCULATED', ?)
            `, [
                item.id, item.incentive_run_id, item.booking_id, item.booking_number, item.employee_id,
                item.department, item.role, item.incentive_type, item.booking_value, item.eligible_value,
                item.supplier_cost, item.gross_profit, item.applicable_rate, item.gross_incentive,
                item.kpi_score, item.kpi_multiplier, item.target_achievement, item.target_multiplier,
                item.bonus, item.deduction, item.adjustment, item.final_incentive, item.incentive_plan_id,
                item.incentive_plan_version, item.rule_id, item.rule_version, item.period, JSON.stringify(item.trace)
            ]);
        }

        // Insert summaries
        for (const s of summaryRows) {
            await conn.query(`
                INSERT INTO incentive_employee_summaries (
                    id, incentive_run_id, employee_id, department, role, month_year, eligible_business,
                    booking_count, monthly_target, target_achievement_pct, target_slab_rate, kpi_score,
                    kpi_multiplier, base_incentive, kpi_adjustment, target_adjustment, performance_bonus,
                    deduction, manual_adjustment, reversal, final_payable, approval_status, payment_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                s.id, s.incentive_run_id, s.employee_id, s.department, s.role, s.month_year, s.eligible_business,
                s.booking_count, s.monthly_target, s.target_achievement_pct, s.target_slab_rate, s.kpi_score,
                s.kpi_multiplier, s.base_incentive, s.kpi_adjustment, s.target_adjustment, s.performance_bonus,
                s.deduction, s.manual_adjustment, s.reversal, s.final_payable, s.approval_status, s.payment_status
            ]);
        }

        await conn.commit();
        console.log(`Success! Run ${runNumber} calculated:`);
        console.log(`  Eligible Bookings: ${eligibleBookingCount}/${totalBookingCount}`);
        console.log(`  Total Business: ₹${totalBookingValue.toFixed(2)}`);
        console.log(`  Gross Profit: ₹${totalGrossProfit.toFixed(2)}`);
        console.log(`  Total Incentive: ₹${totalCalculatedIncentive.toFixed(2)}`);
        console.log(`  Allowed Ceiling: ₹${allowedCeiling.toFixed(2)}`);
        console.log(`  Summary Staff Count: ${summaryRows.length}`);

    } catch (e) {
        await conn.rollback();
        console.error('Calculation Error:', e);
    } finally {
        conn.release();
        await pool.end();
    }
}

async function main() {
    await runRecalculation('2026-10', '2026-10-01', '2026-10-31');
    await runRecalculation('2026-06', '2026-06-01', '2026-06-30');
    await runRecalculation('2026-09', '2026-09-01', '2026-09-30');
    await runRecalculation('2026-03', '2026-03-01', '2026-03-31');
}

main();

