/**
 * Corporate Hierarchy & Reporting Structure Router
 * 
 * Provides REST endpoints for:
 * - Reporting Manager Resolution (Self-Healing Vacancies)
 * - Chain of Command Upward Trace
 * - Downline Subordinate Tree Resolution (CRM Scoping)
 * - Delegation of Authority (DOA) Limit Matching for Approvals
 */

import express from 'express';
import crypto from 'crypto';
import {
    findNearestActiveManager,
    getStaffReportingChain,
    getStaffDownline,
    isStaffInDownline,
    resolveEligibleApprover
} from '../utils/hierarchyResolver.js';

export function createHierarchyRoutes(app, pool, authMiddleware) {
    const router = express.Router();

    /**
     * Helper to find staff member record from JWT user
     */
    async function getStaffFromUser(user) {
        if (!user) return null;
        if (user.email) {
            const [rows] = await pool.query('SELECT * FROM staff_members WHERE email = ? LIMIT 1', [user.email]);
            if (rows.length > 0) return rows[0];
        }
        if (user.id) {
            const [rows] = await pool.query('SELECT * FROM staff_members WHERE id = ? LIMIT 1', [user.id]);
            if (rows.length > 0) return rows[0];
        }
        return null;
    }

    /**
     * GET /api/hierarchy/my-reporting
     * Returns the authenticated user's current resolved manager and subordinate downline.
     */
    router.get('/my-reporting', authMiddleware, async (req, res) => {
        try {
            const currentStaff = await getStaffFromUser(req.user);
            if (!currentStaff) {
                return res.status(404).json({ error: 'Staff profile not found for authenticated user' });
            }

            const reportingManager = await findNearestActiveManager(pool, currentStaff.id);
            const downline = await getStaffDownline(pool, currentStaff.id);

            return res.json({
                staff: {
                    id: currentStaff.id,
                    name: currentStaff.name,
                    email: currentStaff.email,
                    role: currentStaff.role,
                    grade_level: currentStaff.grade_level || 'L8',
                    department: currentStaff.department,
                    employee_code: currentStaff.employee_code
                },
                reporting_manager: reportingManager,
                downline
            });
        } catch (error) {
            console.error('[Hierarchy Route /my-reporting Error]:', error);
            return res.status(500).json({ error: 'Failed to resolve reporting hierarchy', details: error.message });
        }
    });

    /**
     * GET /api/hierarchy/staff/:id/chain
     * Returns the full upward chain of command for an employee (from self up to Founder/MD).
     */
    router.get('/staff/:id/chain', authMiddleware, async (req, res) => {
        try {
            const staffId = Number(req.params.id);
            if (isNaN(staffId)) {
                return res.status(400).json({ error: 'Invalid staff ID' });
            }

            const chain = await getStaffReportingChain(pool, staffId);
            return res.json({ staff_id: staffId, chain_length: chain.length, chain });
        } catch (error) {
            console.error('[Hierarchy Route /staff/:id/chain Error]:', error);
            return res.status(500).json({ error: 'Failed to fetch reporting chain', details: error.message });
        }
    });

    /**
     * GET /api/hierarchy/staff/:id/downline
     * Returns all direct and indirect subordinates under a manager.
     */
    router.get('/staff/:id/downline', authMiddleware, async (req, res) => {
        try {
            const staffId = Number(req.params.id);
            if (isNaN(staffId)) {
                return res.status(400).json({ error: 'Invalid staff ID' });
            }

            const downline = await getStaffDownline(pool, staffId);
            return res.json(downline);
        } catch (error) {
            console.error('[Hierarchy Route /staff/:id/downline Error]:', error);
            return res.status(500).json({ error: 'Failed to fetch staff downline', details: error.message });
        }
    });

    /**
     * POST /api/hierarchy/resolve-approver
     * Resolves the nearest active manager with sufficient Delegation of Authority (DOA)
     * Body: { staff_id?: number, approval_type: 'discount'|'expense'|'leave', required_value: number }
     */
    router.post('/resolve-approver', authMiddleware, async (req, res) => {
        try {
            let staffId = req.body.staff_id;
            if (!staffId) {
                const currentStaff = await getStaffFromUser(req.user);
                if (!currentStaff) {
                    return res.status(400).json({ error: 'Staff ID is required or user profile must exist' });
                }
                staffId = currentStaff.id;
            }

            const approvalType = req.body.approval_type || 'discount';
            const requiredValue = Number(req.body.required_value) || 0;

            const resolution = await resolveEligibleApprover(pool, staffId, approvalType, requiredValue);
            if (!resolution) {
                return res.status(404).json({ error: 'No eligible active approver found along hierarchy chain' });
            }

            return res.json(resolution);
        } catch (error) {
            console.error('[Hierarchy Route /resolve-approver Error]:', error);
            return res.status(500).json({ error: 'Failed to resolve eligible approver', details: error.message });
        }
    });

    /**
     * POST /api/hierarchy/grievances
     * Submit a confidential HR grievance / escalation that bypasses the immediate reporting manager.
     * Body: { category: string, subject: string, details: string, is_anonymous?: boolean }
     */
    router.post('/grievances', authMiddleware, async (req, res) => {
        try {
            const currentStaff = await getStaffFromUser(req.user);
            if (!currentStaff) {
                return res.status(401).json({ error: 'Staff profile required to submit grievance' });
            }

            const { category, subject, details, description, is_anonymous, isAnonymous } = req.body;
            const grievanceDetails = details || description;
            if (!subject || !grievanceDetails || !category) {
                return res.status(400).json({ error: 'Category, subject, and details/description are required' });
            }

            const isAnon = Boolean(is_anonymous ?? isAnonymous);
            const id = crypto.randomUUID();

            // Generate clean ticket number
            const [[countResult]] = await pool.query('SELECT COUNT(*) as total FROM hr_grievances');
            const ticketNumber = `GRV-${String((countResult?.total || 0) + 1).padStart(4, '0')}`;

            const displayName = isAnon ? 'Confidential Employee' : currentStaff.name;
            const displayEmail = isAnon ? 'confidential@shrawellotours.com' : currentStaff.email;

            await pool.query(
                `INSERT INTO hr_grievances (
                    id, ticket_number, staff_id, staff_name, staff_email, department, category, 
                    subject, details, is_anonymous, status, assigned_to_name, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted', 'HR Head / Founder', NOW(), NOW())`,
                [
                    id, ticketNumber, currentStaff.id, displayName, displayEmail, 
                    currentStaff.department, category, subject, grievanceDetails, isAnon ? 1 : 0
                ]
            );

            // Fetch created row
            const [[created]] = await pool.query('SELECT * FROM hr_grievances WHERE id = ?', [id]);
            return res.status(201).json({
                message: 'Confidential grievance submitted directly to HR Head / Founder',
                grievance: created,
                id
            });
        } catch (error) {
            console.error('[Hierarchy Route /grievances Error]:', error);
            return res.status(500).json({ error: 'Failed to submit grievance', details: error.message });
        }
    });

    /**
     * GET /api/hierarchy/grievances
     * List grievances. Admins and HR see all; regular staff see only self-submitted.
     */
    router.get('/grievances', authMiddleware, async (req, res) => {
        try {
            const currentStaff = await getStaffFromUser(req.user);
            if (!currentStaff) {
                return res.status(401).json({ error: 'Staff profile required' });
            }

            const isAdmin = req.user?.role === 'admin' || req.user?.role === 'Admin' || currentStaff.user_type === 'Admin';
            const isHR = currentStaff.department === 'Human Resources' || ['L1', 'L2'].includes(currentStaff.grade_level);

            let query = 'SELECT * FROM hr_grievances';
            let params = [];

            if (!isAdmin && !isHR) {
                query += ' WHERE staff_id = ?';
                params.push(currentStaff.id);
            }

            query += ' ORDER BY created_at DESC';
            const [rows] = await pool.query(query, params);

            const mapped = (rows || []).map(r => ({
                ...r,
                id: String(r.id),
                ticketNumber: r.ticket_number,
                staffId: r.staff_id,
                staffName: r.staff_name,
                staffEmail: r.staff_email,
                department: r.department,
                gradeLevel: r.grade_level,
                category: r.category,
                subject: r.subject,
                description: r.details,
                details: r.details,
                isAnonymous: Boolean(r.is_anonymous),
                status: r.status,
                resolutionNotes: r.resolution_notes,
                resolvedBy: r.resolved_by,
                resolvedByName: r.resolved_by_name,
                resolvedAt: r.resolved_at,
                createdAt: r.created_at,
                updatedAt: r.updated_at
            }));

            return res.json({ count: mapped.length, grievances: mapped, data: mapped });
        } catch (error) {
            console.error('[Hierarchy Route GET /grievances Error]:', error);
            return res.status(500).json({ error: 'Failed to fetch grievances', details: error.message });
        }
    });

    /**
     * PATCH /api/hierarchy/grievances/:id/status
     * Update grievance status and add resolution notes (HR / Founder only).
     */
    router.patch('/grievances/:id/status', authMiddleware, async (req, res) => {
        try {
            const currentStaff = await getStaffFromUser(req.user);
            const isAdmin = req.user?.role === 'admin' || req.user?.role === 'Admin' || currentStaff?.user_type === 'Admin';
            const isHR = currentStaff?.department === 'Human Resources' || ['L1', 'L2'].includes(currentStaff?.grade_level);

            if (!isAdmin && !isHR) {
                return res.status(403).json({ error: 'Only HR leadership or Administrators can update grievance resolutions' });
            }

            const { status, resolution_notes, resolutionNotes } = req.body;
            const finalNotes = resolution_notes || resolutionNotes || null;
            const grievanceId = req.params.id;

            await pool.query(
                `UPDATE hr_grievances SET
                    status = COALESCE(?, status),
                    resolution_notes = COALESCE(?, resolution_notes),
                    resolved_by = ?,
                    resolved_at = NOW(),
                    updated_at = NOW()
                 WHERE id = ?`,
                [status, finalNotes, currentStaff?.id || null, grievanceId]
            );

            const [[updated]] = await pool.query('SELECT * FROM hr_grievances WHERE id = ?', [grievanceId]);
            const normalizedUpdated = updated ? {
                ...updated,
                id: String(updated.id),
                ticketNumber: updated.ticket_number,
                staffId: updated.staff_id,
                staffName: updated.staff_name,
                staffEmail: updated.staff_email,
                description: updated.details,
                details: updated.details,
                isAnonymous: Boolean(updated.is_anonymous),
                resolutionNotes: updated.resolution_notes,
                createdAt: updated.created_at,
                updatedAt: updated.updated_at
            } : null;

            return res.json({ message: 'Grievance updated successfully', grievance: normalizedUpdated || updated });
        } catch (error) {
            console.error('[Hierarchy Route PATCH /grievances/:id/status Error]:', error);
            return res.status(500).json({ error: 'Failed to update grievance', details: error.message });
        }
    });

    // Mount under /api/hierarchy
    app.use('/api/hierarchy', router);
}
