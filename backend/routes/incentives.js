/**
 * Incentive Management System Router
 * 
 * Production-ready Incentive Engine for SHRAWELLO Travel Hub.
 * Manages Plans, Rules, Monthly Runs, Calculation Engine, Ledger,
 * Adjustments, Reversals, Approvals, Payouts, and Disputes.
 */

import express from 'express';
import crypto from 'crypto';

export function createIncentiveRoutes(app, pool) {
    const router = express.Router();

    // ─── Helper: Auth Extraction ───
    const getUser = (req) => req.user || { id: 1, name: 'Super Admin', email: 'admin@shravyatours.com', role: 'admin' };

    // ─── Helper: Notification Dispatcher ───
    async function sendNotification(staffId, title, message, type = 'system') {
        try {
            await pool.query(`
                INSERT INTO in_app_notifications (id, staff_id, title, message, type, is_read, created_at)
                VALUES (?, ?, ?, ?, ?, 0, NOW())
            `, [crypto.randomUUID(), staffId, title, message, type]);
        } catch (err) {
            console.warn('[Incentive Notification Error]:', err.message);
        }
    }

    // ─── Helper: Audit Logger ───
    async function logAudit(action, entityId, details, performedBy, staffId = null, changes = null) {
        try {
            await pool.query(`
                INSERT INTO audit_logs (action, module, details, severity, performed_by, staff_id, staff_name, entity_type, entity_id, changes, timestamp)
                VALUES (?, 'incentives', ?, 'Info', ?, ?, ?, 'Incentive', ?, ?, NOW())
            `, [action, typeof details === 'string' ? details : JSON.stringify(details), performedBy, staffId, performedBy, String(entityId), changes ? JSON.stringify(changes) : null]);
        } catch (err) {
            console.warn('[Incentive Audit Error]:', err.message);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. OVERVIEW & METRICS
    // ═══════════════════════════════════════════════════════════════════════════
    router.get('/overview', async (req, res) => {
        try {
            const { monthYear, department, employeeId } = req.query;

            // Fetch overall aggregate metrics
            let runFilter = '';
            const runParams = [];
            if (monthYear) {
                runFilter += ' AND r.month_year = ?';
                runParams.push(monthYear);
            }

            const [runs] = await pool.query(`
                SELECT 
                    COALESCE(SUM(total_booking_value), 0) as eligibleBookingValue,
                    COALESCE(SUM(total_gross_profit), 0) as grossProfit,
                    COALESCE(SUM(total_incentive), 0) as totalIncentiveCalculated,
                    COALESCE(SUM(maximum_capacity), 0) as maximumCapacity,
                    COALESCE(SUM(gp_protection_limit), 0) as gpProtectionLimit
                FROM incentive_runs r
                WHERE r.status != 'REJECTED' ${runFilter}
            `, runParams);

            // Fetch status-wise amounts from summaries
            let summaryFilter = '';
            const summaryParams = [];
            if (monthYear) {
                summaryFilter += ' AND s.month_year = ?';
                summaryParams.push(monthYear);
            }
            if (department && department !== 'all') {
                summaryFilter += ' AND s.department = ?';
                summaryParams.push(department);
            }
            if (employeeId && employeeId !== 'all') {
                summaryFilter += ' AND s.employee_id = ?';
                summaryParams.push(employeeId);
            }

            const [statusTotals] = await pool.query(`
                SELECT 
                    approval_status,
                    payment_status,
                    COALESCE(SUM(final_payable), 0) as amount
                FROM incentive_employee_summaries s
                WHERE 1=1 ${summaryFilter}
                GROUP BY approval_status, payment_status
            `, summaryParams);

            let pendingApproval = 0;
            let approved = 0;
            let paid = 0;
            let onHold = 0;

            for (const item of statusTotals) {
                if (item.payment_status === 'PAID') {
                    paid += parseFloat(item.amount);
                } else if (item.approval_status === 'FINAL_APPROVED' || item.approval_status === 'APPROVED') {
                    approved += parseFloat(item.amount);
                } else if (item.approval_status === 'REJECTED' || item.approval_status === 'HOLD') {
                    onHold += parseFloat(item.amount);
                } else {
                    pendingApproval += parseFloat(item.amount);
                }
            }

            // Adjustments total
            const [adjustments] = await pool.query(`
                SELECT COALESCE(SUM(amount), 0) as totalAdjustments
                FROM incentive_adjustments
                WHERE status = 'APPROVED'
            `);

            const eligibleValue = parseFloat(runs[0]?.eligibleBookingValue || 0);
            const grossProfit = parseFloat(runs[0]?.grossProfit || 0);
            const totalIncentive = parseFloat(runs[0]?.totalIncentiveCalculated || 0);

            const incentivePctBooking = eligibleValue > 0 ? ((totalIncentive / eligibleValue) * 100).toFixed(2) : '0.00';
            const incentivePctGP = grossProfit > 0 ? ((totalIncentive / grossProfit) * 100).toFixed(2) : '0.00';

            // Recent runs
            const [recentRuns] = await pool.query(`
                SELECT * FROM incentive_runs ORDER BY created_at DESC LIMIT 6
            `);

            // Department breakdown
            const [deptBreakdown] = await pool.query(`
                SELECT 
                    department,
                    COUNT(DISTINCT employee_id) as staffCount,
                    COALESCE(SUM(eligible_business), 0) as business,
                    COALESCE(SUM(final_payable), 0) as incentive
                FROM incentive_employee_summaries
                GROUP BY department
            `);

            res.json({
                success: true,
                data: {
                    eligibleBookingValue: eligibleValue,
                    grossProfit: grossProfit,
                    totalIncentiveCalculated: totalIncentive,
                    incentivePctBooking: parseFloat(incentivePctBooking),
                    incentivePctGP: parseFloat(incentivePctGP),
                    pendingApproval,
                    approved,
                    paid,
                    onHold,
                    totalAdjustments: parseFloat(adjustments[0]?.totalAdjustments || 0),
                    maximumCapacity: parseFloat(runs[0]?.maximumCapacity || 0),
                    recentRuns,
                    departmentBreakdown: deptBreakdown
                }
            });
        } catch (err) {
            console.error('[Incentives Overview Error]:', err);
            res.status(500).json({ error: 'Failed to load incentive overview: ' + err.message });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. INCENTIVE PLANS & RULES (Configurable & Versioned)
    // ═══════════════════════════════════════════════════════════════════════════
    router.get('/plans', async (req, res) => {
        try {
            const [plans] = await pool.query(`SELECT * FROM incentive_plans ORDER BY created_at DESC`);
            const [rules] = await pool.query(`SELECT * FROM incentive_rules ORDER BY priority ASC, created_at ASC`);
            
            // Map rules to plans
            const plansWithRules = plans.map(p => ({
                ...p,
                rules: rules.filter(r => r.plan_id === p.id)
            }));

            res.json({ success: true, data: plansWithRules });
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch plans: ' + err.message });
        }
    });

    router.post('/plans', async (req, res) => {
        try {
            const user = getUser(req);
            const { name, description, effectiveFrom, effectiveTo, maximumBookingPercentage, gpProtectionPercentage } = req.body;
            
            if (!name || !effectiveFrom) {
                return res.status(400).json({ error: 'Name and Effective From date are required' });
            }

            const id = 'plan-' + crypto.randomBytes(4).toString('hex');
            await pool.query(`
                INSERT INTO incentive_plans (
                    id, name, description, effective_from, effective_to, maximum_booking_percentage, gp_protection_percentage, status, version, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', '1.0', ?)
            `, [
                id, name, description || '', effectiveFrom, effectiveTo || null,
                parseFloat(maximumBookingPercentage || 7.00),
                parseFloat(gpProtectionPercentage || 40.00),
                user.name
            ]);

            await logAudit('RULE_CREATED', id, `Created new incentive plan ${name}`, user.name);

            res.json({ success: true, message: 'Plan created successfully', id });
        } catch (err) {
            res.status(500).json({ error: 'Failed to create plan: ' + err.message });
        }
    });

    router.post('/plans/:id/rules', async (req, res) => {
        try {
            const user = getUser(req);
            const planId = req.params.id;
            const { department, role, incentiveType, percentage, fixedAmount, kpiDependency, targetDependency, slabs, kpiWeights, kpiMultipliers, priority } = req.body;

            const id = 'rule-' + crypto.randomBytes(4).toString('hex');
            await pool.query(`
                INSERT INTO incentive_rules (
                    id, plan_id, department, role, incentive_type, percentage, fixed_amount,
                    kpi_dependency, target_dependency, slabs_json, kpi_weights_json, kpi_multipliers_json,
                    priority, status, version
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', '1.0')
            `, [
                id, planId, department, role, incentiveType || 'percentage',
                parseFloat(percentage || 0), parseFloat(fixedAmount || 0),
                kpiDependency ? 1 : 0, targetDependency ? 1 : 0,
                slabs ? JSON.stringify(slabs) : null,
                kpiWeights ? JSON.stringify(kpiWeights) : null,
                kpiMultipliers ? JSON.stringify(kpiMultipliers) : null,
                priority || 1
            ]);

            await logAudit('RULE_CREATED', id, `Added rule for ${department} - ${role}`, user.name);
            res.json({ success: true, message: 'Rule added successfully', id });
        } catch (err) {
            res.status(500).json({ error: 'Failed to add rule: ' + err.message });
        }
    });

    // Update Plan or Rule creating a new version to protect historical calculations!
    router.put('/plans/:id', async (req, res) => {
        try {
            const user = getUser(req);
            const { id } = req.params;
            const { name, description, effectiveFrom, effectiveTo, maximumBookingPercentage, gpProtectionPercentage, status } = req.body;

            const [oldPlan] = await pool.query(`SELECT * FROM incentive_plans WHERE id = ?`, [id]);
            if (oldPlan.length === 0) return res.status(404).json({ error: 'Plan not found' });

            // Calculate next version
            const currentVer = parseFloat(oldPlan[0].version || '1.0');
            const nextVer = (currentVer + 0.1).toFixed(1);

            await pool.query(`
                UPDATE incentive_plans SET
                    name = ?, description = ?, effective_from = ?, effective_to = ?,
                    maximum_booking_percentage = ?, gp_protection_percentage = ?, status = ?,
                    version = ?
                WHERE id = ?
            `, [
                name ?? oldPlan[0].name,
                description ?? oldPlan[0].description,
                effectiveFrom ?? oldPlan[0].effective_from,
                effectiveTo ?? oldPlan[0].effective_to,
                maximumBookingPercentage !== undefined ? parseFloat(maximumBookingPercentage) : oldPlan[0].maximum_booking_percentage,
                gpProtectionPercentage !== undefined ? parseFloat(gpProtectionPercentage) : oldPlan[0].gp_protection_percentage,
                status ?? oldPlan[0].status,
                nextVer,
                id
            ]);

            await logAudit('RULE_UPDATED', id, `Updated plan ${oldPlan[0].name} to version ${nextVer}`, user.name);
            res.json({ success: true, message: `Plan updated to version ${nextVer}` });
        } catch (err) {
            res.status(500).json({ error: 'Failed to update plan: ' + err.message });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. BOOKING ELIGIBILITY CHECK UTILITY
    // ═══════════════════════════════════════════════════════════════════════════
    async function checkBookingEligibility(conn, booking) {
        const issues = [];

        // 1. Trip/booking status = completed
        const bStatus = (booking.status || '').toLowerCase().trim();
        if (bStatus !== 'completed') {
            issues.push(`Booking status is '${booking.status}', must be 'completed'`);
        }

        // 2. Customer payment = fully settled
        const pStatus = (booking.payment_status || '').toLowerCase().trim();
        if (pStatus !== 'paid') {
            issues.push(`Customer payment status is '${booking.payment_status}', must be 'paid'`);
        }

        // 3. Vendor costs finalized and settled
        const [suppliers] = await conn.query(`
            SELECT cost, paid_amount, payment_status, booking_status 
            FROM supplier_bookings 
            WHERE booking_id = ?
        `, [booking.id]);

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

        if (unsettledSuppliers > 0) {
            issues.push(`${unsettledSuppliers} supplier booking(s) have pending payments`);
        }

        // 4. Cancelled or refund pending check
        if (bStatus === 'cancelled') {
            issues.push('Booking is cancelled');
        }

        const [refunds] = await conn.query(`
            SELECT id FROM booking_transactions 
            WHERE booking_id = ? AND type = 'Refund' AND status = 'Pending'
        `, [booking.id]);
        if (refunds.length > 0) {
            issues.push('Pending customer refund exists');
        }

        // Check for admin override
        const [overrides] = await conn.query(`
            SELECT id, reason, override_by FROM incentive_booking_overrides WHERE booking_id = ?
        `, [booking.id]);

        const hasOverride = overrides.length > 0;
        const isEligible = issues.length === 0 || hasOverride;

        // Calculate eligible booking value (after direct GST if present)
        const totalAmount = parseFloat(booking.total_price || 0);
        let eligibleValue = totalAmount;
        
        // If invoice exists with tax breakdown, deduct GST
        const [invs] = await conn.query(`
            SELECT tax_total, subtotal FROM invoices WHERE booking_id = ? LIMIT 1
        `, [booking.id]);
        if (invs.length > 0 && parseFloat(invs[0].subtotal || 0) > 0) {
            eligibleValue = parseFloat(invs[0].subtotal);
        }

        const grossProfit = Math.max(0, eligibleValue - totalSupplierCost);

        return {
            isEligible,
            issues,
            hasOverride,
            overrideInfo: hasOverride ? overrides[0] : null,
            eligibleValue,
            grossProfit,
            supplierCost: totalSupplierCost
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. INCENTIVE CALCULATION ENGINE (MONTHLY RUNS)
    // ═══════════════════════════════════════════════════════════════════════════
    router.post('/runs/calculate', async (req, res) => {
        const user = getUser(req);
        const { monthYear, periodStart, periodEnd, planId } = req.body;

        if (!monthYear || !periodStart || !periodEnd) {
            return res.status(400).json({ error: 'Month (YYYY-MM), Period Start, and Period End are required' });
        }

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            // 1. Fetch active plan
            let activePlanId = planId;
            if (!activePlanId) {
                const [activePlans] = await conn.query(`
                    SELECT id FROM incentive_plans WHERE status = 'Active' ORDER BY created_at DESC LIMIT 1
                `);
                if (activePlans.length === 0) {
                    throw new Error('No active incentive plan found. Please create or activate a plan first.');
                }
                activePlanId = activePlans[0].id;
            }

            const [planRows] = await conn.query(`SELECT * FROM incentive_plans WHERE id = ?`, [activePlanId]);
            if (planRows.length === 0) throw new Error(`Plan ${activePlanId} not found`);
            const plan = planRows[0];

            // 2. Fetch rules for plan
            const [rules] = await conn.query(`
                SELECT * FROM incentive_rules WHERE plan_id = ? AND status = 'Active' ORDER BY priority ASC
            `, [activePlanId]);
            if (rules.length === 0) throw new Error('No active rules configured for this plan');

            // 3. Check for existing run for this period
            const runNumber = `RUN-${monthYear.replace('-', '')}`;
            const [existingRuns] = await conn.query(`SELECT * FROM incentive_runs WHERE run_number = ?`, [runNumber]);
            let runId = existingRuns.length > 0 ? existingRuns[0].id : crypto.randomUUID();

            if (existingRuns.length > 0 && ['FINAL_APPROVED', 'PAID', 'LOCKED'].includes(existingRuns[0].status)) {
                throw new Error(`Incentive Run ${runNumber} is already finalized/paid and locked against recalculation.`);
            }

            // 4. Fetch all bookings for the period
            const [bookings] = await conn.query(`
                SELECT 
                    id, booking_number, customer_name, total_price, status, payment_status,
                    assigned_to, assigned_staff_ids, booking_date
                FROM bookings
                WHERE booking_date >= ? AND booking_date <= ?
            `, [periodStart, periodEnd]);

            let totalBookingCount = bookings.length;
            let eligibleBookingCount = 0;
            let excludedBookingCount = 0;
            let totalBookingValue = 0;
            let totalGrossProfit = 0;

            // Clean existing draft/calculated ledger & summaries for this run
            await conn.query(`DELETE FROM incentive_ledger WHERE incentive_run_id = ?`, [runId]);
            await conn.query(`DELETE FROM incentive_employee_summaries WHERE incentive_run_id = ?`, [runId]);

            // Cache staff members
            const [staffList] = await conn.query(`SELECT id, name, role, department FROM staff_members`);
            const staffMap = new Map();
            staffList.forEach(s => staffMap.set(String(s.id), s));

            // Structure to collect per-employee calculations
            const employeeAggregates = new Map();

            // Structure to collect per-booking ledger rows
            const ledgerRows = [];

            // 5. Evaluate each booking
            for (const b of bookings) {
                const evalResult = await checkBookingEligibility(conn, b);

                if (!evalResult.isEligible) {
                    excludedBookingCount++;
                    continue;
                }

                eligibleBookingCount++;
                totalBookingValue += evalResult.eligibleValue;
                totalGrossProfit += evalResult.grossProfit;

                // Identify assigned staff
                let staffIds = [];
                if (b.assigned_staff_ids) {
                    try {
                        const parsed = typeof b.assigned_staff_ids === 'string' ? JSON.parse(b.assigned_staff_ids) : b.assigned_staff_ids;
                        if (Array.isArray(parsed)) staffIds = parsed.map(String);
                    } catch (_) {}
                }
                if (staffIds.length === 0 && b.assigned_to) {
                    staffIds.push(String(b.assigned_to));
                }

                // If no staff assigned, attribute to Super Admin/System (id 1)
                if (staffIds.length === 0) {
                    staffIds.push('1');
                }

                // For each assigned staff, match rules
                for (const staffId of staffIds) {
                    const staffMember = staffMap.get(staffId) || { id: staffId, name: 'Staff #' + staffId, role: 'Sales Executive', department: 'Sales' };
                    const staffDept = staffMember.department || 'Sales';
                    const staffRole = staffMember.role || 'Sales Executive';

                    // Find matching rule for this staff's department or role
                    let matchingRule = rules.find(r => 
                        r.department.toLowerCase() === staffDept.toLowerCase() && 
                        (r.role.toLowerCase() === staffRole.toLowerCase() || r.role.toLowerCase().includes('executive'))
                    );

                    // Fallback to department rule
                    if (!matchingRule) {
                        matchingRule = rules.find(r => r.department.toLowerCase() === staffDept.toLowerCase());
                    }

                    // Fallback to primary Sales rule
                    if (!matchingRule) {
                        matchingRule = rules[0];
                    }

                    // Base rate
                    let applicableRate = parseFloat(matchingRule.percentage || 0);

                    // If rule has target dependency (Sales), rate will be calibrated at employee monthly level
                    // For line-item ledger calculation:
                    const grossIncentive = (evalResult.eligibleValue * applicableRate) / 100;
                    const finalIncentive = grossIncentive; // further adjusted at summary level

                    const ledgerId = crypto.randomUUID();
                    ledgerRows.push({
                        id: ledgerId,
                        incentive_run_id: runId,
                        booking_id: b.id,
                        booking_number: b.booking_number,
                        employee_id: staffMember.id,
                        department: staffDept,
                        role: staffRole,
                        incentive_type: matchingRule.incentive_type,
                        booking_value: parseFloat(b.total_price || 0),
                        eligible_value: evalResult.eligibleValue,
                        supplier_cost: evalResult.supplierCost,
                        gross_profit: evalResult.grossProfit,
                        applicable_rate: applicableRate,
                        gross_incentive: grossIncentive,
                        kpi_score: 100.00,
                        kpi_multiplier: 1.00,
                        target_achievement: 100.00,
                        target_multiplier: 1.00,
                        bonus: 0,
                        deduction: 0,
                        adjustment: 0,
                        final_incentive: finalIncentive,
                        incentive_plan_id: plan.id,
                        incentive_plan_version: plan.version,
                        rule_id: matchingRule.id,
                        rule_version: matchingRule.version,
                        period: monthYear,
                        status: 'CALCULATED',
                        trace: {
                            formula: `${evalResult.eligibleValue} * ${applicableRate}%`,
                            ruleName: `${matchingRule.department} - ${matchingRule.role}`
                        }
                    });

                    // Aggregate for employee summary
                    if (!employeeAggregates.has(staffMember.id)) {
                        employeeAggregates.set(staffMember.id, {
                            staff: staffMember,
                            rule: matchingRule,
                            eligibleBusiness: 0,
                            bookingCount: 0,
                            baseIncentive: 0,
                            kpiScore: 100,
                            targetAmount: 500000 // default target per employee if not found
                        });
                    }

                    const empAgg = employeeAggregates.get(staffMember.id);
                    empAgg.eligibleBusiness += evalResult.eligibleValue;
                    empAgg.bookingCount += 1;
                    empAgg.baseIncentive += grossIncentive;
                }
            }

            // 6. Refine employee aggregations with Target Slabs and KPI Multipliers
            const summaryRows = [];
            let totalCalculatedIncentive = 0;

            for (const [empId, agg] of employeeAggregates.entries()) {
                let applicableSlabRate = parseFloat(agg.rule.percentage || 0);
                let targetAchievementPct = 100.00;
                let targetMultiplier = 1.00;

                // Check if target dependency applies (Sales target slabs)
                if (agg.rule.target_dependency && agg.rule.slabs_json) {
                    try {
                        const slabs = typeof agg.rule.slabs_json === 'string' ? JSON.parse(agg.rule.slabs_json) : agg.rule.slabs_json;
                        // Fetch stored target for employee if available
                        const [targets] = await conn.query(`
                            SELECT target_conversions, target_bookings FROM daily_targets 
                            WHERE staff_id = ? AND date >= ? AND date <= ?
                        `, [empId, periodStart, periodEnd]);

                        let employeeTarget = agg.targetAmount;
                        if (targets.length > 0) {
                            const sumTargetBookings = targets.reduce((sum, t) => sum + (t.target_bookings || 0), 0);
                            if (sumTargetBookings > 0) employeeTarget = sumTargetBookings * 50000;
                        }

                        targetAchievementPct = employeeTarget > 0 ? (agg.eligibleBusiness / employeeTarget) * 100 : 100;

                        // Find applicable slab
                        if (Array.isArray(slabs)) {
                            const matchedSlab = slabs.find(s => targetAchievementPct >= s.min_pct && targetAchievementPct <= s.max_pct);
                            if (matchedSlab) {
                                applicableSlabRate = parseFloat(matchedSlab.rate_pct);
                            }
                        }
                    } catch (_) {}
                }

                // Check KPI dependency (Operations / Customer Care)
                let kpiScore = 95.00; // standard default high performance
                let kpiMultiplier = 1.00;
                if (agg.rule.kpi_dependency && agg.rule.kpi_multipliers_json) {
                    try {
                        const mults = typeof agg.rule.kpi_multipliers_json === 'string' ? JSON.parse(agg.rule.kpi_multipliers_json) : agg.rule.kpi_multipliers_json;
                        if (Array.isArray(mults)) {
                            const matchedMult = mults.find(m => kpiScore >= m.min_score && kpiScore <= m.max_score);
                            if (matchedMult) {
                                kpiMultiplier = parseFloat(matchedMult.multiplier);
                            }
                        }
                    } catch (_) {}
                }

                // Fetch any approved manual adjustments/reversals for this employee in this period
                const [empAdjs] = await conn.query(`
                    SELECT adjustment_type, amount FROM incentive_adjustments
                    WHERE employee_id = ? AND status = 'APPROVED' AND (incentive_run_id IS NULL OR incentive_run_id = ?)
                `, [empId, runId]);

                let bonus = 0;
                let deduction = 0;
                let reversal = 0;
                for (const adj of empAdjs) {
                    const amt = parseFloat(adj.amount || 0);
                    if (adj.adjustment_type === 'BONUS') bonus += amt;
                    else if (adj.adjustment_type === 'DEDUCTION') deduction += amt;
                    else if (adj.adjustment_type === 'REVERSAL' || adj.adjustment_type === 'CLAWBACK') reversal += Math.abs(amt);
                }

                // Re-calculate base incentive with calibrated slab rate & KPI multiplier
                const calibratedBase = (agg.eligibleBusiness * applicableSlabRate) / 100;
                const finalPayable = Math.max(0, (calibratedBase * kpiMultiplier) + bonus - deduction - reversal);

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
                    kpi_score: kpiScore,
                    kpi_multiplier: kpiMultiplier,
                    base_incentive: calibratedBase,
                    kpi_adjustment: 0,
                    target_adjustment: 0,
                    performance_bonus: bonus,
                    deduction: deduction,
                    manual_adjustment: 0,
                    reversal: reversal,
                    final_payable: finalPayable,
                    approval_status: 'PENDING',
                    payment_status: 'UNPAID'
                });
            }

            // 7. Calculate Ceilings and GP Protection
            const maxBookingPct = parseFloat(plan.maximum_booking_percentage || 7.00);
            const gpProtectionPct = parseFloat(plan.gp_protection_percentage || 40.00);

            const maxCapacityBooking = (totalBookingValue * maxBookingPct) / 100;
            const gpProtectionLimit = (totalGrossProfit * gpProtectionPct) / 100;
            const allowedCeiling = Math.min(maxCapacityBooking, gpProtectionLimit);

            const isExceeded = totalCalculatedIncentive > allowedCeiling;
            const validationFlags = {
                withinCeiling: !isExceeded,
                ceilingDifference: (allowedCeiling - totalCalculatedIncentive).toFixed(2),
                warning: isExceeded ? `Calculated incentive (₹${totalCalculatedIncentive.toLocaleString('en-IN')}) exceeds ceiling limit (₹${allowedCeiling.toLocaleString('en-IN')}). Finalization blocked.` : null
            };

            // 8. Insert or update Run
            if (existingRuns.length > 0) {
                await conn.query(`
                    UPDATE incentive_runs SET
                        period_start = ?, period_end = ?, incentive_plan_id = ?, incentive_plan_version = ?,
                        total_bookings = ?, eligible_bookings = ?, excluded_bookings = ?,
                        total_booking_value = ?, total_gross_profit = ?, maximum_capacity = ?,
                        gp_protection_limit = ?, total_incentive = ?, status = 'CALCULATED',
                        validation_flags = ?, finalized_at = NULL
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
                        maximum_capacity, gp_protection_limit, total_incentive, status, created_by, validation_flags
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CALCULATED', ?, ?)
                `, [
                    runId, runNumber, periodStart, periodEnd, monthYear, plan.id, plan.version,
                    totalBookingCount, eligibleBookingCount, excludedBookingCount, totalBookingValue, totalGrossProfit,
                    allowedCeiling, gpProtectionLimit, totalCalculatedIncentive, user.name, JSON.stringify(validationFlags)
                ]);
            }

            // 9. Batch insert ledger items
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

            // 10. Batch insert employee summaries
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

            await logAudit('RUN_CALCULATED', runId, `Calculated run ${runNumber} with ${eligibleBookingCount} eligible bookings`, user.name);

            res.json({
                success: true,
                message: `Incentive Run ${runNumber} calculated successfully.`,
                runId,
                runNumber,
                summary: {
                    totalBookings: totalBookingCount,
                    eligibleBookings: eligibleBookingCount,
                    excludedBookings: excludedBookingCount,
                    totalBookingValue,
                    totalGrossProfit,
                    maximumCapacity: allowedCeiling,
                    gpProtectionLimit,
                    totalCalculatedIncentive,
                    withinCeiling: !isExceeded,
                    employeeCount: summaryRows.length
                }
            });
        } catch (err) {
            await conn.rollback();
            console.error('[Incentive Calculation Error]:', err);
            res.status(500).json({ error: 'Calculation failed: ' + err.message });
        } finally {
            conn.release();
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. APPROVAL WORKFLOW ENGINE
    // ═══════════════════════════════════════════════════════════════════════════
    router.post('/runs/:id/advance-status', async (req, res) => {
        try {
            const user = getUser(req);
            const { id } = req.params;
            const { action, comment } = req.body; // 'LEAD_APPROVE', 'FINANCE_APPROVE', 'FINAL_APPROVE', 'REJECT', 'HOLD'

            const [runs] = await pool.query(`SELECT * FROM incentive_runs WHERE id = ?`, [id]);
            if (runs.length === 0) return res.status(404).json({ error: 'Incentive Run not found' });
            const run = runs[0];

            let newStatus = run.status;
            let valFlags = {};
            try { valFlags = JSON.parse(run.validation_flags || '{}'); } catch (_) {}

            // CEILING GUARD: If ceiling exceeded, BLOCK finalization!
            if (['FINAL_APPROVE', 'FINANCE_APPROVE'].includes(action) && valFlags.withinCeiling === false) {
                return res.status(400).json({
                    error: `FINAL APPROVAL BLOCKED: Total calculated incentive (₹${parseFloat(run.total_incentive).toLocaleString('en-IN')}) exceeds allowable ceiling of ₹${parseFloat(run.maximum_capacity).toLocaleString('en-IN')}. Please add deductions or calibrate rule rates.`
                });
            }

            if (action === 'LEAD_APPROVE') {
                newStatus = 'LEAD_APPROVED';
                await pool.query(`UPDATE incentive_runs SET status = ?, lead_approved_by = ?, lead_approved_at = NOW() WHERE id = ?`, [newStatus, user.name, id]);
                // Notify finance
                await sendNotification(1, `Incentive Run ${run.run_number} Approved by Lead`, `Run ${run.run_number} is ready for Finance review.`);
            } else if (action === 'FINANCE_APPROVE') {
                newStatus = 'FINANCE_APPROVED';
                await pool.query(`UPDATE incentive_runs SET status = ?, finance_approved_by = ?, finance_approved_at = NOW() WHERE id = ?`, [newStatus, user.name, id]);
                await sendNotification(1, `Incentive Run ${run.run_number} Approved by Finance`, `Run ${run.run_number} is ready for Final Executive Approval.`);
            } else if (action === 'FINAL_APPROVE') {
                newStatus = 'FINAL_APPROVED';
                await pool.query(`UPDATE incentive_runs SET status = ?, final_approved_by = ?, final_approved_at = NOW(), finalized_at = NOW() WHERE id = ?`, [newStatus, user.name, id]);
                // Update employee summaries to APPROVED
                await pool.query(`UPDATE incentive_employee_summaries SET approval_status = 'APPROVED' WHERE incentive_run_id = ?`, [id]);
                // Notify employees
                const [emps] = await pool.query(`SELECT DISTINCT employee_id FROM incentive_employee_summaries WHERE incentive_run_id = ?`, [id]);
                for (const e of emps) {
                    await sendNotification(e.employee_id, `Incentive Approved for ${run.month_year}`, `Your incentive for ${run.month_year} has been approved by management and is ready for payment.`);
                }
            } else if (action === 'REJECT') {
                newStatus = 'REJECTED';
                await pool.query(`UPDATE incentive_runs SET status = ? WHERE id = ?`, [newStatus, id]);
                await pool.query(`UPDATE incentive_employee_summaries SET approval_status = 'REJECTED' WHERE incentive_run_id = ?`, [id]);
            } else if (action === 'READY_FOR_PAYMENT') {
                newStatus = 'READY_FOR_PAYMENT';
                await pool.query(`UPDATE incentive_runs SET status = ? WHERE id = ?`, [newStatus, id]);
            }

            await logAudit('RUN_APPROVED', id, `Run ${run.run_number} advanced to ${newStatus}. Note: ${comment || 'N/A'}`, user.name);

            res.json({ success: true, message: `Run advanced to ${newStatus}`, newStatus });
        } catch (err) {
            res.status(500).json({ error: 'Failed to advance status: ' + err.message });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 6. INCENTIVE LEDGER (Line items & traceability)
    // ═══════════════════════════════════════════════════════════════════════════
    router.get('/ledger', async (req, res) => {
        try {
            const { runId, employeeId, bookingId, search, limit = 100, page = 1 } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);

            let filter = ' WHERE 1=1';
            const params = [];

            if (runId && runId !== 'all') {
                filter += ' AND l.incentive_run_id = ?';
                params.push(runId);
            }
            if (employeeId && employeeId !== 'all') {
                filter += ' AND l.employee_id = ?';
                params.push(employeeId);
            }
            if (bookingId) {
                filter += ' AND (l.booking_id = ? OR l.booking_number = ?)';
                params.push(bookingId, bookingId);
            }
            if (search) {
                filter += ' AND (sm.name LIKE ? OR b.customer_name LIKE ? OR l.department LIKE ?)';
                const term = `%${search}%`;
                params.push(term, term, term);
            }

            const [countRes] = await pool.query(`
                SELECT COUNT(*) as total 
                FROM incentive_ledger l
                LEFT JOIN staff_members sm ON l.employee_id = sm.id
                LEFT JOIN bookings b ON l.booking_id = b.id
                ${filter}
            `, params);

            const [rows] = await pool.query(`
                SELECT 
                    l.*,
                    sm.name as employee_name,
                    sm.email as employee_email,
                    b.customer_name,
                    b.title as tour_title,
                    b.booking_date
                FROM incentive_ledger l
                LEFT JOIN staff_members sm ON l.employee_id = sm.id
                LEFT JOIN bookings b ON l.booking_id = b.id
                ${filter}
                ORDER BY l.created_at DESC
                LIMIT ? OFFSET ?
            `, [...params, parseInt(limit), offset]);

            res.json({
                success: true,
                data: rows,
                pagination: {
                    total: countRes[0]?.total || 0,
                    page: parseInt(page),
                    limit: parseInt(limit)
                }
            });
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch ledger: ' + err.message });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 7. EMPLOYEE SUMMARIES (Monthly roll-up)
    // ═══════════════════════════════════════════════════════════════════════════
    router.get('/summaries', async (req, res) => {
        try {
            const { runId, monthYear, department } = req.query;
            let filter = ' WHERE 1=1';
            const params = [];

            if (runId && runId !== 'all') {
                filter += ' AND s.incentive_run_id = ?';
                params.push(runId);
            }
            if (monthYear && monthYear !== 'all') {
                filter += ' AND s.month_year = ?';
                params.push(monthYear);
            }
            if (department && department !== 'all') {
                filter += ' AND s.department = ?';
                params.push(department);
            }

            const [rows] = await pool.query(`
                SELECT 
                    s.*,
                    sm.name as employee_name,
                    sm.email as employee_email,
                    sm.initials,
                    sm.color
                FROM incentive_employee_summaries s
                LEFT JOIN staff_members sm ON s.employee_id = sm.id
                ${filter}
                ORDER BY s.final_payable DESC
            `, params);

            res.json({ success: true, data: rows });
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch summaries: ' + err.message });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 8. ADJUSTMENTS & REVERSALS
    // ═══════════════════════════════════════════════════════════════════════════
    router.get('/adjustments', async (req, res) => {
        try {
            const [rows] = await pool.query(`
                SELECT a.*, sm.name as employee_name, sm.department as employee_dept
                FROM incentive_adjustments a
                LEFT JOIN staff_members sm ON a.employee_id = sm.id
                ORDER BY a.created_at DESC
            `);
            res.json({ success: true, data: rows });
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch adjustments: ' + err.message });
        }
    });

    router.post('/adjustments', async (req, res) => {
        try {
            const user = getUser(req);
            const { employeeId, bookingId, incentiveRunId, adjustmentType, amount, reason, supportingDocument } = req.body;

            if (!employeeId || !adjustmentType || !amount || !reason) {
                return res.status(400).json({ error: 'Employee, Adjustment Type, Amount, and Reason are mandatory.' });
            }

            const id = 'adj-' + crypto.randomBytes(4).toString('hex');
            await pool.query(`
                INSERT INTO incentive_adjustments (
                    id, employee_id, booking_id, incentive_run_id, adjustment_type,
                    amount, reason, supporting_document, created_by, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED')
            `, [
                id, employeeId, bookingId || null, incentiveRunId || null, adjustmentType,
                parseFloat(amount), reason, supportingDocument || null, user.name
            ]);

            await logAudit('INCENTIVE_ADJUSTED', id, `Added ${adjustmentType} of ₹${amount} for staff #${employeeId}: ${reason}`, user.name);

            res.json({ success: true, message: 'Adjustment recorded successfully', id });
        } catch (err) {
            res.status(500).json({ error: 'Failed to add adjustment: ' + err.message });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 9. PAYOUTS MODULE (Batches, Bank Transfer & Paid Locking)
    // ═══════════════════════════════════════════════════════════════════════════
    router.get('/payouts', async (req, res) => {
        try {
            const [rows] = await pool.query(`
                SELECT 
                    p.*,
                    sm.name as employee_name,
                    sm.department as employee_dept,
                    r.run_number,
                    r.month_year
                FROM incentive_payouts p
                LEFT JOIN staff_members sm ON p.employee_id = sm.id
                LEFT JOIN incentive_runs r ON p.incentive_run_id = r.id
                ORDER BY p.created_at DESC
            `);
            res.json({ success: true, data: rows });
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch payouts: ' + err.message });
        }
    });

    router.post('/payouts/create-batch', async (req, res) => {
        try {
            const user = getUser(req);
            const { incentiveRunId } = req.body;

            const [runRows] = await pool.query(`SELECT * FROM incentive_runs WHERE id = ?`, [incentiveRunId]);
            if (runRows.length === 0) return res.status(404).json({ error: 'Run not found' });
            const run = runRows[0];

            if (run.status !== 'FINAL_APPROVED' && run.status !== 'READY_FOR_PAYMENT') {
                return res.status(400).json({ error: 'Only FINAL_APPROVED runs can be converted into payout batches.' });
            }

            const [summaries] = await pool.query(`
                SELECT * FROM incentive_employee_summaries WHERE incentive_run_id = ? AND final_payable > 0
            `, [incentiveRunId]);

            const batchNumber = `BATCH-${run.month_year.replace('-', '')}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
            let count = 0;

            for (const s of summaries) {
                // Check if already batched
                const [existing] = await pool.query(`
                    SELECT id FROM incentive_payouts WHERE incentive_run_id = ? AND employee_id = ?
                `, [incentiveRunId, s.employee_id]);

                if (existing.length === 0) {
                    await pool.query(`
                        INSERT INTO incentive_payouts (
                            id, batch_number, incentive_run_id, employee_id, amount, payment_status, processed_by
                        ) VALUES (?, ?, ?, ?, ?, 'PENDING', ?)
                    `, [crypto.randomUUID(), batchNumber, incentiveRunId, s.employee_id, s.final_payable, user.name]);
                    count++;
                }
            }

            await pool.query(`UPDATE incentive_runs SET status = 'READY_FOR_PAYMENT' WHERE id = ?`, [incentiveRunId]);
            await logAudit('PAYOUT_CREATED', batchNumber, `Created payout batch ${batchNumber} with ${count} payouts`, user.name);

            res.json({ success: true, message: `Batch ${batchNumber} created with ${count} employee payouts`, batchNumber });
        } catch (err) {
            res.status(500).json({ error: 'Failed to create payout batch: ' + err.message });
        }
    });

    router.post('/payouts/:id/mark-paid', async (req, res) => {
        try {
            const user = getUser(req);
            const { id } = req.params;
            const { paymentReference, paymentDate, paymentMethod } = req.body;

            const [payouts] = await pool.query(`SELECT * FROM incentive_payouts WHERE id = ?`, [id]);
            if (payouts.length === 0) return res.status(404).json({ error: 'Payout record not found' });
            const p = payouts[0];

            if (p.is_locked) {
                return res.status(400).json({ error: 'This payout is already marked as PAID and locked against editing.' });
            }

            await pool.query(`
                UPDATE incentive_payouts SET
                    payment_status = 'PAID',
                    payment_reference = ?,
                    payment_date = ?,
                    payment_method = ?,
                    processed_by = ?,
                    is_locked = 1
                WHERE id = ?
            `, [paymentReference || 'Direct Bank NEFT/IMPS', paymentDate || new Date().toISOString().split('T')[0], paymentMethod || 'Bank Transfer', user.name, id]);

            // Update summary payment status
            await pool.query(`
                UPDATE incentive_employee_summaries SET payment_status = 'PAID'
                WHERE incentive_run_id = ? AND employee_id = ?
            `, [p.incentive_run_id, p.employee_id]);

            // Check if all payouts for the run are paid -> lock the run!
            const [pendingCount] = await pool.query(`
                SELECT COUNT(*) as c FROM incentive_payouts 
                WHERE incentive_run_id = ? AND payment_status != 'PAID'
            `, [p.incentive_run_id]);

            if (pendingCount[0].c === 0) {
                await pool.query(`UPDATE incentive_runs SET status = 'PAID' WHERE id = ?`, [p.incentive_run_id]);
            }

            await sendNotification(p.employee_id, 'Incentive Payment Processed', `Your incentive payment of ₹${parseFloat(p.amount).toLocaleString('en-IN')} has been disbursed via ${paymentMethod || 'Bank Transfer'}. Ref: ${paymentReference || 'N/A'}`);
            await logAudit('PAYOUT_PAID', id, `Marked payout ₹${p.amount} as PAID for employee #${p.employee_id}`, user.name);

            res.json({ success: true, message: 'Payout marked as PAID and locked.' });
        } catch (err) {
            res.status(500).json({ error: 'Failed to mark payout: ' + err.message });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 10. EMPLOYEE PORTAL ("My Incentives" restricted view)
    // ═══════════════════════════════════════════════════════════════════════════
    router.get('/my-summary', async (req, res) => {
        try {
            const user = getUser(req);
            let empId = user.id;

            // Allow admin to specify employeeId query parameter for preview
            if (req.query.employeeId && (user.role === 'admin' || user.role === 'Administrator')) {
                empId = req.query.employeeId;
            }

            // Fetch latest summary for this employee
            const [summaries] = await pool.query(`
                SELECT s.*, r.run_number, r.status as run_status
                FROM incentive_employee_summaries s
                LEFT JOIN incentive_runs r ON s.incentive_run_id = r.id
                WHERE s.employee_id = ?
                ORDER BY s.created_at DESC
            `, [empId]);

            // Fetch booking ledger rows for this employee
            const [ledger] = await pool.query(`
                SELECT 
                    l.*, b.customer_name, b.title as tour_title, b.booking_date
                FROM incentive_ledger l
                LEFT JOIN bookings b ON l.booking_id = b.id
                WHERE l.employee_id = ?
                ORDER BY l.created_at DESC
                LIMIT 50
            `, [empId]);

            // Fetch disputes raised by this employee
            const [disputes] = await pool.query(`
                SELECT * FROM incentive_disputes WHERE employee_id = ? ORDER BY created_at DESC
            `, [empId]);

            res.json({
                success: true,
                data: {
                    employeeId: empId,
                    summaries,
                    recentBookings: ledger,
                    disputes
                }
            });
        } catch (err) {
            res.status(500).json({ error: 'Failed to load employee incentive data: ' + err.message });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 11. DISPUTES
    // ═══════════════════════════════════════════════════════════════════════════
    router.post('/disputes', async (req, res) => {
        try {
            const user = getUser(req);
            const { employeeId, incentiveRunId, ledgerId, reason } = req.body;

            if (!reason) return res.status(400).json({ error: 'Dispute reason is required' });

            const id = 'disp-' + crypto.randomBytes(4).toString('hex');
            await pool.query(`
                INSERT INTO incentive_disputes (id, employee_id, incentive_run_id, ledgerId, reason, status)
                VALUES (?, ?, ?, ?, ?, 'SUBMITTED')
            `, [id, employeeId || user.id, incentiveRunId || null, ledgerId || null, reason]);

            // Notify Finance/Admin
            await sendNotification(1, 'Incentive Dispute Raised', `Staff #${employeeId || user.id} submitted a dispute: ${reason}`);

            res.json({ success: true, message: 'Dispute submitted for management review', id });
        } catch (err) {
            res.status(500).json({ error: 'Failed to raise dispute: ' + err.message });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 12. BOOKING OVERRIDE (Explicit Admin action with reason)
    // ═══════════════════════════════════════════════════════════════════════════
    router.post('/override-eligibility', async (req, res) => {
        try {
            const user = getUser(req);
            if (user.role !== 'admin' && user.role !== 'Administrator') {
                return res.status(403).json({ error: 'Only authorized Admin can override booking eligibility.' });
            }

            const { bookingId, reason } = req.body;
            if (!bookingId || !reason) {
                return res.status(400).json({ error: 'Booking ID and Reason are required.' });
            }

            await pool.query(`
                INSERT INTO incentive_booking_overrides (id, booking_id, reason, override_by, approved_by)
                VALUES (?, ?, ?, ?, ?)
            `, [crypto.randomUUID(), bookingId, reason, user.name, user.name]);

            await logAudit('INCENTIVE_UPDATED', bookingId, `Manually overridden booking ${bookingId} eligibility: ${reason}`, user.name);

            res.json({ success: true, message: 'Booking eligibility override recorded.' });
        } catch (err) {
            res.status(500).json({ error: 'Failed to override eligibility: ' + err.message });
        }
    });

    // Mount all routes under /api/incentives
    app.use('/api/incentives', router);
    console.log('[Incentives API] Router mounted at /api/incentives');
}
