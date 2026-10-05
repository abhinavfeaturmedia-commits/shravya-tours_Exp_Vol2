/**
 * SHRAWELLO Corporate Hierarchy & Reporting Engine
 * 
 * Implements:
 * 1. Self-Healing Vacancy Rule:
 *    If an employee's direct manager is vacant, resigned, terminated, or suspended,
 *    requests automatically climb upward to the next active senior manager.
 * 2. Downline Tree Resolution:
 *    Resolves direct and indirect subordinates for CRM visibility and approval delegation.
 * 3. Delegation of Authority (DOA) Limit Matching:
 *    Finds the nearest active manager whose designation limit covers the discount or expense request.
 * 4. Cycle & Loop Protection:
 *    Detects and breaks circular reporting structures gracefully.
 */

// Inactive or offboarding statuses that trigger vacancy climbing
const VACANT_STATUSES = new Set(['Resigned', 'Terminated', 'Suspended']);

/**
 * Clean numeric grade level for comparisons:
 * L1 (Founder) = 1, L2 = 2, ..., L8 (Junior) = 8
 */
export function parseGradeNumber(gradeLevel) {
    if (!gradeLevel) return 8;
    const match = String(gradeLevel).match(/L([1-8])/i);
    return match ? parseInt(match[1], 10) : 8;
}

/**
 * Check if a staff member record is actively working
 */
export function isStaffActive(staff) {
    if (!staff) return false;
    const isDbActive = (staff.status || 'Active').toLowerCase() === 'active';
    const isEmploymentActive = !VACANT_STATUSES.has(staff.employment_status);
    return isDbActive && isEmploymentActive;
}

/**
 * Fetch a staff member with designation DOA limits
 */
async function fetchStaffHierarchyRecord(pool, staffId) {
    const [rows] = await pool.query(
        `SELECT 
            s.id, s.name, s.email, s.role, s.grade_level, s.department, 
            s.reporting_to_id, s.branch_id, s.status, s.employment_status, s.employee_code,
            d.id as designation_id, d.name as designation_name,
            COALESCE(d.default_discount_limit, 0) as max_discount_limit,
            COALESCE(d.default_expense_limit, 0) as max_expense_limit,
            b.name as branch_name
         FROM staff_members s
         LEFT JOIN designations d ON s.designation_id = d.id
         LEFT JOIN branches b ON s.branch_id = b.id
         WHERE s.id = ?`,
        [staffId]
    );
    return rows[0] || null;
}

/**
 * Find the nearest active reporting manager for a staff member.
 * If the direct manager is resigned/vacant/suspended, it recursively climbs
 * to that manager's manager until an active senior manager is found.
 * 
 * @param {object} pool - MySQL connection pool
 * @param {number} staffId - Current staff ID
 * @param {object} [options]
 * @param {number[]} [options.excludeStaffIds=[]] - Staff IDs to bypass (e.g. on leave)
 * @param {number} [options.maxDepth=12] - Max depth guard
 * @returns {Promise<object|null>} Nearest active manager record or null if none
 */
export async function findNearestActiveManager(pool, staffId, options = {}) {
    const { excludeStaffIds = [], maxDepth = 12 } = options;
    const excludeSet = new Set(excludeStaffIds.map(Number));

    const currentStaff = await fetchStaffHierarchyRecord(pool, staffId);
    if (!currentStaff) return null;

    let targetManagerId = currentStaff.reporting_to_id;
    const visited = new Set([Number(staffId)]);
    let depth = 0;

    while (targetManagerId && depth < maxDepth) {
        const numId = Number(targetManagerId);

        // Circular loop detection
        if (visited.has(numId)) {
            console.warn(`[HierarchyResolver] Circular reporting loop detected for staff ${staffId} at manager ${numId}. Breaking loop.`);
            break;
        }
        visited.add(numId);
        depth++;

        const manager = await fetchStaffHierarchyRecord(pool, numId);
        if (!manager) {
            console.warn(`[HierarchyResolver] Manager ID ${numId} referenced by staff does not exist in DB.`);
            break;
        }

        // Check if this manager is active and not excluded
        if (isStaffActive(manager) && !excludeSet.has(numId)) {
            return {
                ...manager,
                is_direct_manager: depth === 1,
                steps_climbed: depth,
                vacancy_bypassed: depth > 1
            };
        }

        // Vacant or inactive manager: climb to next manager up the chain
        targetManagerId = manager.reporting_to_id;
    }

    // If no active manager found along direct chain, check if company apex (L1) exists and is not self
    const [apexRows] = await pool.query(
        `SELECT 
            s.id, s.name, s.email, s.role, s.grade_level, s.department, 
            s.reporting_to_id, s.branch_id, s.status, s.employment_status, s.employee_code,
            COALESCE(d.default_discount_limit, 100) as max_discount_limit,
            COALESCE(d.default_expense_limit, 9999999) as max_expense_limit
         FROM staff_members s
         LEFT JOIN designations d ON s.designation_id = d.id
         WHERE s.grade_level = 'L1' AND s.status = 'Active' AND (s.employment_status IS NULL OR s.employment_status = 'Active')
         LIMIT 1`
    );

    if (apexRows.length > 0 && Number(apexRows[0].id) !== Number(staffId)) {
        return {
            ...apexRows[0],
            is_direct_manager: false,
            steps_climbed: depth + 1,
            vacancy_bypassed: true,
            is_fallback_apex: true
        };
    }

    return null;
}

/**
 * Get the full upward chain of command for an employee
 * (from the employee all the way to Founder/MD).
 * 
 * @param {object} pool
 * @param {number} staffId
 * @returns {Promise<Array<object>>} Upward chain ordered from nearest to highest
 */
export async function getStaffReportingChain(pool, staffId) {
    const chain = [];
    const visited = new Set();
    let currentId = Number(staffId);
    let depth = 0;

    while (currentId && depth < 15) {
        if (visited.has(currentId)) {
            break;
        }
        visited.add(currentId);
        depth++;

        const member = await fetchStaffHierarchyRecord(pool, currentId);
        if (!member) break;

        chain.push({
            id: member.id,
            name: member.name,
            email: member.email,
            role: member.role,
            grade_level: member.grade_level || 'L8',
            department: member.department,
            branch_name: member.branch_name,
            employee_code: member.employee_code,
            status: member.status,
            employment_status: member.employment_status || 'Active',
            is_active: isStaffActive(member),
            max_discount_limit: Number(member.max_discount_limit || 0),
            max_expense_limit: Number(member.max_expense_limit || 0)
        });

        currentId = member.reporting_to_id ? Number(member.reporting_to_id) : null;
    }

    return chain;
}

/**
 * Get all subordinates (downline tree) reporting to a manager
 * both directly and indirectly.
 * 
 * @param {object} pool
 * @param {number} managerId
 * @returns {Promise<{ ids: number[], directReports: object[], allReports: object[] }>}
 */
export async function getStaffDownline(pool, managerId) {
    const managerNum = Number(managerId);
    const directReports = [];
    const allReports = [];
    const ids = [];

    const visited = new Set([managerNum]);
    // Queue contains: { id, level }
    const queue = [{ id: managerNum, level: 0 }];

    while (queue.length > 0) {
        const { id: currentId, level } = queue.shift();

        const [rows] = await pool.query(
            `SELECT 
                s.id, s.name, s.email, s.role, s.grade_level, s.department, 
                s.reporting_to_id, s.branch_id, s.status, s.employment_status, s.employee_code,
                b.name as branch_name
             FROM staff_members s
             LEFT JOIN branches b ON s.branch_id = b.id
             WHERE s.reporting_to_id = ?`,
            [currentId]
        );

        for (const child of rows) {
            const childId = Number(child.id);
            if (!visited.has(childId)) {
                visited.add(childId);
                ids.push(childId);

                const item = {
                    ...child,
                    level: level + 1,
                    is_active: isStaffActive(child)
                };

                if (level === 0) {
                    directReports.push(item);
                }
                allReports.push(item);

                // Push to queue to resolve this child's own subordinates
                queue.push({ id: childId, level: level + 1 });
            }
        }
    }

    return {
        manager_id: managerNum,
        ids,
        direct_count: directReports.length,
        total_downline_count: allReports.length,
        directReports,
        allReports
    };
}

/**
 * Check if targetStaffId reports (directly or indirectly) to managerId
 */
export async function isStaffInDownline(pool, managerId, targetStaffId) {
    if (Number(managerId) === Number(targetStaffId)) return true;
    const { ids } = await getStaffDownline(pool, managerId);
    return ids.includes(Number(targetStaffId));
}

/**
 * Resolve the nearest active manager with sufficient Delegation of Authority (DOA)
 * for a discount or expense approval.
 * 
 * @param {object} pool
 * @param {number} staffId - Submitter
 * @param {'discount'|'expense'|'leave'} type - Approval category
 * @param {number} requiredValue - Percentage (e.g. 7) or Amount in INR (e.g. 15000) or Leave days
 * @returns {Promise<object|null>}
 */
export async function resolveEligibleApprover(pool, staffId, type, requiredValue = 0) {
    const numValue = Number(requiredValue) || 0;
    const chain = await getStaffReportingChain(pool, staffId);

    // Filter chain to strictly managers above the submitter who are active
    const managersAbove = chain.slice(1).filter(m => m.is_active);

    for (let i = 0; i < managersAbove.length; i++) {
        const mgr = managersAbove[i];
        const gradeNum = parseGradeNumber(mgr.grade_level);

        // L1 (Founder) and L2 (Director) always have unlimited authority
        if (gradeNum <= 2) {
            return {
                approver: mgr,
                escalated: i > 0,
                steps_climbed: i + 1,
                reason: 'Apex Authority (Unlimited DOA)'
            };
        }

        if (type === 'discount') {
            const limit = mgr.max_discount_limit || 0;
            if (limit >= numValue) {
                return {
                    approver: mgr,
                    escalated: i > 0,
                    steps_climbed: i + 1,
                    reason: `Within Manager Discount Limit (${limit}% >= ${numValue}%)`
                };
            }
        } else if (type === 'expense') {
            const limit = mgr.max_expense_limit || 0;
            if (limit >= numValue) {
                return {
                    approver: mgr,
                    escalated: i > 0,
                    steps_climbed: i + 1,
                    reason: `Within Manager Expense Limit (₹${limit} >= ₹${numValue})`
                };
            }
        } else if (type === 'leave') {
            // Short leaves (<= 2 days) can be approved by direct manager (L4-L7)
            // Longer leaves (> 2 days) require L3 HOD or above
            if (numValue <= 2 || gradeNum <= 3) {
                return {
                    approver: mgr,
                    escalated: i > 0,
                    steps_climbed: i + 1,
                    reason: numValue <= 2 ? 'Standard Leave Authority' : 'Extended Leave HOD Authority'
                };
            }
        }
    }

    // If nobody in the direct upward line had sufficient limit, return apex L1
    const apex = managersAbove.find(m => parseGradeNumber(m.grade_level) === 1);
    if (apex) {
        return {
            approver: apex,
            escalated: true,
            steps_climbed: managersAbove.length,
            reason: 'Escalated to Apex Authority (Exceeded Intermediate Limits)'
        };
    }

    return null;
}
