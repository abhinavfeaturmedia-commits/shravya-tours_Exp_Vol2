/**
 * Staff Attendance & Roster Routes Module
 * 
 * Provides complete attendance management:
 * - Real-time roster and live presence KPIs
 * - Punch in/out with automated shift & grace period evaluation
 * - Break tracking (start/end)
 * - Real-time system activity heartbeat tracking
 * - Admin manual adjustment and quick-mark actions
 * - Personal attendance logs & regularization requests
 * - Muster roll and multi-range reports
 * - Leave applications and approval workflow
 * - Shift and attendance configuration
 */

import crypto from 'crypto';
import { authMiddleware } from '../middleware/index.js';

// Helper to get local date string YYYY-MM-DD in IST (+05:30)
function getTodayISTDate() {
    const now = new Date();
    // Offset for IST: 5 hours 30 mins
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    return istDate.toISOString().split('T')[0];
}

// Helper to resolve staff member from request
async function resolveStaff(pool, req) {
    if (req.user?.staffId) {
        const [staff] = await pool.query('SELECT * FROM staff_members WHERE id = ?', [req.user.staffId]);
        if (staff.length > 0) return staff[0];
    }
    if (req.user?.email) {
        const [staff] = await pool.query('SELECT * FROM staff_members WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))', [req.user.email]);
        if (staff.length > 0) return staff[0];
        const prefix = req.user.email.split('@')[0];
        const [fuzzyStaff] = await pool.query(
            'SELECT * FROM staff_members WHERE email LIKE ? OR name LIKE ?',
            [`${prefix}%`, `%${prefix.replace(/_/g, ' ')}%`]
        );
        if (fuzzyStaff.length > 0) return fuzzyStaff[0];
    }
    if (req.user?.id) {
        const [staff] = await pool.query('SELECT * FROM staff_members WHERE id = ?', [req.user.id]);
        if (staff.length > 0) return staff[0];
    }
    const [fallback] = await pool.query("SELECT * FROM staff_members WHERE status = 'Active' ORDER BY id ASC LIMIT 1");
    return fallback.length > 0 ? fallback[0] : null;
}

// Routine to cleanly close orphan unclosed sessions from previous days or long inactivity
export async function autoCloseOrphanSessions(pool) {
    try {
        const today = getTodayISTDate();
        const now = new Date();
        // 1. Close open sessions from previous days
        await pool.query(`
            UPDATE attendance_sessions SET
                session_end = last_ping_time,
                logout_type = 'day_rollover',
                updated_at = ?
            WHERE session_end IS NULL AND DATE(session_start) < ?
        `, [now, today]);

        // 2. Check for long-inactive sessions (> auto_clockout_idle_minutes) for today
        const [settingsRows] = await pool.query('SELECT * FROM attendance_settings WHERE id = ?', ['default']).catch(() => [[]]);
        const autoClockoutMins = settingsRows[0]?.auto_clockout_idle_minutes || 60;
        
        const cutoffTime = new Date(now.getTime() - autoClockoutMins * 60 * 1000);

        // Find sessions with no heartbeat for > autoClockoutMins minutes
        const [timedOutSessions] = await pool.query(`
            SELECT id, staff_id, attendance_id, last_ping_time FROM attendance_sessions
            WHERE session_end IS NULL 
              AND DATE(session_start) = ?
              AND last_ping_time < ?
        `, [today, cutoffTime]);

        for (const s of timedOutSessions) {
            await pool.query(`
                UPDATE attendance_sessions SET
                    session_end = last_ping_time,
                    logout_type = 'inactivity_timeout',
                    updated_at = ?
                WHERE id = ?
            `, [now, s.id]);

            // Mark attendance log as auto clocked out
            await pool.query(`
                UPDATE attendance_logs SET
                    check_out_time = COALESCE(check_out_time, ?),
                    status = 'Clocked Out',
                    auto_clocked_out = 1,
                    updated_at = ?
                WHERE id = ? AND check_out_time IS NULL
            `, [s.last_ping_time, now, s.attendance_id]);
        }
    } catch (e) {
        console.warn('[AutoCloseOrphanSessions Warn]:', e.message);
    }
}

// Unified core auto-punch & session initializer
export async function recordStaffLoginAndAutoClockIn(pool, staffMember, req, loginType = 'Web Login (Auto)') {
    if (!staffMember || !staffMember.id) return null;
    const staffId = Number(staffMember.id);
    const today = getTodayISTDate();
    const logId = `ATL-${staffId}-${today}`;
    const now = new Date();
    const ipAddress = req?.headers ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '') : '';
    const deviceInfo = req?.headers?.['user-agent'] ? req.headers['user-agent'].substring(0, 250) : '';

    try {
        // 1. Fetch shift settings
        const [settingsRows] = await pool.query('SELECT * FROM attendance_settings WHERE id = ?', ['default']).catch(() => [[]]);
        const settings = settingsRows.length > 0 ? settingsRows[0] : {
            shift_start: '09:30',
            shift_end: '18:30',
            grace_period_mins: 15,
            auto_clockin_on_login: 1
        };

        if (settings.auto_clockin_on_login === 0 || settings.auto_clockin_on_login === false) {
            return null; // Admin disabled auto clock in
        }

        // 2. Calculate late / punctuality status
        const [shiftHour, shiftMinute] = (settings.shift_start || '09:30').split(':').map(Number);
        const graceMins = Number(settings.grace_period_mins || 15);
        const shiftCutoffMins = shiftHour * 60 + shiftMinute + graceMins;
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istDate = new Date(now.getTime() + istOffset);
        const currentMins = istDate.getUTCHours() * 60 + istDate.getUTCMinutes();

        let isLate = 0;
        let lateMinutes = 0;
        let status = 'Present';
        if (currentMins > shiftCutoffMins) {
            isLate = 1;
            lateMinutes = currentMins - (shiftHour * 60 + shiftMinute);
            status = 'Late';
        }

        // 3. Upsert today's attendance log (preserve first_login_time permanently)
        const [existingLogs] = await pool.query('SELECT * FROM attendance_logs WHERE id = ?', [logId]);

        if (existingLogs.length === 0) {
            // First daily punch: insert record
            await pool.query(`
                INSERT INTO attendance_logs (
                    id, staff_id, date, status, first_login_time, check_in_time, is_late, late_minutes,
                    login_count, auto_clocked_in, auto_clocked_out, last_activity_time, shift_name,
                    location, ip_address, device_info, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 0, ?, 'General Shift', ?, ?, ?, ?, ?)
            `, [logId, staffId, today, status, now, now, isLate, lateMinutes, now, req?.body?.location || null, ipAddress, deviceInfo, now, now]);
        } else {
            const log = existingLogs[0];
            const isReopening = (log.status === 'Clocked Out' || log.status === 'Absent' || log.check_out_time != null);

            await pool.query(`
                UPDATE attendance_logs SET
                    first_login_time = COALESCE(first_login_time, ?),
                    check_in_time = COALESCE(check_in_time, ?),
                    check_out_time = CASE WHEN ? = 1 THEN NULL ELSE check_out_time END,
                    status = CASE WHEN ? = 1 THEN ? ELSE status END,
                    auto_clocked_in = 1,
                    auto_clocked_out = 0,
                    last_activity_time = ?,
                    updated_at = ?
                WHERE id = ?
            `, [now, now, isReopening ? 1 : 0, isReopening ? 1 : 0, status, now, now, logId]);
        }

        // 4. Manage attendance session with smart resumption
        const [openSessions] = await pool.query(
            'SELECT * FROM attendance_sessions WHERE staff_id = ? AND session_end IS NULL AND DATE(session_start) = ? ORDER BY session_start DESC LIMIT 1',
            [staffId, today]
        );

        let session = null;
        if (openSessions.length > 0) {
            session = openSessions[0];
            await pool.query('UPDATE attendance_sessions SET last_ping_time = ?, updated_at = ? WHERE id = ?', [now, now, session.id]);
        } else {
            // Check if the most recent session ended LESS than 3 minutes ago (e.g. tab reload, page switch)
            const [recentSessions] = await pool.query(
                'SELECT * FROM attendance_sessions WHERE staff_id = ? AND DATE(session_start) = ? ORDER BY id DESC LIMIT 1',
                [staffId, today]
            );

            const lastSession = recentSessions[0];
            const isRecentEnd = lastSession && lastSession.session_end && (now.getTime() - new Date(lastSession.session_end).getTime() < 3 * 60 * 1000);

            if (isRecentEnd) {
                // Resume existing session seamlessly
                await pool.query(
                    'UPDATE attendance_sessions SET session_end = NULL, logout_type = NULL, last_ping_time = ?, updated_at = ? WHERE id = ?',
                    [now, now, lastSession.id]
                );
                session = lastSession;
                session.session_end = null;
                session.logout_type = null;
            } else {
                // Create clean new session
                const [countRows] = await pool.query(
                    'SELECT COUNT(*) as count FROM attendance_sessions WHERE staff_id = ? AND DATE(session_start) = ?',
                    [staffId, today]
                );
                const sessionNumber = (countRows[0]?.count || 0) + 1;
                const sessionId = `ATS-${staffId}-${Date.now()}`;

                await pool.query(`
                    INSERT INTO attendance_sessions (
                        id, attendance_id, staff_id, session_number, session_start,
                        last_ping_time, login_type, ip_address, device_info, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [sessionId, logId, staffId, sessionNumber, now, now, loginType, ipAddress, deviceInfo, now, now]);

                await pool.query('UPDATE attendance_logs SET login_count = ?, updated_at = ? WHERE id = ?', [sessionNumber, now, logId]);

                const [newSessionRows] = await pool.query('SELECT * FROM attendance_sessions WHERE id = ?', [sessionId]);
                session = newSessionRows[0];
            }
        }

        await pool.query("UPDATE staff_members SET last_active = ? WHERE id = ?", [now, staffId]).catch(() => {});
        return session;
    } catch (e) {
        console.error('[RecordStaffLoginAndAutoClockIn Error]:', e);
        return null;
    }
}

export function createAttendanceRoutes(app, pool) {

    // ─── 1. GET /api/attendance/today ───
    // Fetch today's live roster, KPIs, session metrics, and current user status
    app.get('/api/attendance/today', authMiddleware, async (req, res) => {
        try {
            const today = getTodayISTDate();

            // 0. Auto-close lingering orphan sessions
            await autoCloseOrphanSessions(pool);

            // 1. Fetch shift settings
            const [settingsRows] = await pool.query('SELECT * FROM attendance_settings WHERE id = ?', ['default']);
            const settings = settingsRows.length > 0 ? settingsRows[0] : {
                shift_start: '09:30',
                shift_end: '18:30',
                grace_period_mins: 15,
                half_day_hours: 4.5,
                full_day_hours: 8.0,
                work_days: 'Mon,Tue,Wed,Thu,Fri,Sat',
                auto_clockin_on_login: 1,
                idle_threshold_seconds: 180,
                auto_clockout_idle_minutes: 60
            };

            // 2. Resolve requesting staff member and auto clock-in if enabled
            const currentStaff = await resolveStaff(pool, req);
            if (currentStaff && (settings.auto_clockin_on_login === 1 || settings.auto_clockin_on_login === true || settings.auto_clockin_on_login === undefined)) {
                await recordStaffLoginAndAutoClockIn(pool, currentStaff, req, 'web_activity');
            }

            // 3. Fetch all active staff members
            const [staffList] = await pool.query(
                "SELECT id, name, email, role, user_type, department, status, initials, color, last_active, phone FROM staff_members WHERE status = 'Active' ORDER BY name ASC"
            );

            // 4. Fetch all attendance logs for today
            const [logs] = await pool.query(
                'SELECT * FROM attendance_logs WHERE date = ?',
                [today]
            );
            const logsMap = new Map();
            logs.forEach(l => logsMap.set(Number(l.staff_id), l));

            // 5. Fetch all sessions for today
            let sessionsMap = new Map();
            try {
                const [sessions] = await pool.query(
                    'SELECT * FROM attendance_sessions WHERE DATE(session_start) = ? ORDER BY session_start ASC',
                    [today]
                );
                const rawSessions = sessions || [];
                const staffMap = new Map();
                rawSessions.forEach(s => {
                    const sid = Number(s.staff_id);
                    if (!staffMap.has(sid)) staffMap.set(sid, []);
                    staffMap.get(sid).push(s);
                });

                staffMap.forEach((sList, sid) => {
                    // Filter out abandoned 0-duration micro-sessions (< 20s with 0 active/idle)
                    const meaningful = sList.filter((s, idx) => {
                        if (!s.session_end) return true; // keep all active sessions
                        const durationSecs = Math.floor((new Date(s.session_end).getTime() - new Date(s.session_start).getTime()) / 1000);
                        if (durationSecs < 20 && (s.active_minutes || 0) === 0 && (s.idle_minutes || 0) === 0 && sList.length > 1) {
                            return false; // skip ghost micro-session
                        }
                        return true;
                    });

                    const mapped = meaningful.map((s, idx) => ({
                        id: s.id,
                        attendanceId: s.attendance_id,
                        staffId: s.staff_id,
                        sessionNumber: idx + 1,
                        sessionStart: s.session_start,
                        sessionEnd: s.session_end,
                        lastPingTime: s.last_ping_time,
                        activeMinutes: s.active_minutes || 0,
                        idleMinutes: s.idle_minutes || 0,
                        systemMinutes: s.system_minutes || 0,
                        loginType: s.login_type,
                        logoutType: s.logout_type,
                        ipAddress: s.ip_address,
                        deviceInfo: s.device_info,
                        createdAt: s.created_at,
                        updatedAt: s.updated_at
                    }));

                    sessionsMap.set(sid, mapped);
                });
            } catch (e) {
                console.warn('[Attendance Sessions Query Warn]:', e.message);
            }

            // 6. Fetch approved leaves for today
            const [leaves] = await pool.query(
                "SELECT * FROM staff_leaves WHERE status = 'Approved' AND ? BETWEEN start_date AND end_date",
                [today]
            );
            const leavesMap = new Map();
            leaves.forEach(lv => leavesMap.set(Number(lv.staff_id), lv));

            // 7. Combine into roster items
            let presentCount = 0;
            let lateCount = 0;
            let onLeaveCount = 0;
            let absentPendingCount = 0;

            const roster = staffList.map(member => {
                const log = logsMap.get(Number(member.id));
                const leave = leavesMap.get(Number(member.id));
                const staffSessions = sessionsMap.get(Number(member.id)) || [];

                let status = 'Absent';
                let isLate = false;
                let firstLoginTime = null;
                let checkInTime = null;
                let checkOutTime = null;
                let breakStartTime = null;
                let workedMinutes = 0;
                let activeMinutes = 0;
                let idleMinutes = 0;
                let systemMinutes = 0;
                let totalBreakMinutes = 0;
                let loginCount = staffSessions.length > 0 ? staffSessions.length : 0;
                let autoClockedIn = false;
                let autoClockedOut = false;
                let logId = log?.id || `ATL-${member.id}-${today}`;

                if (leave) {
                    status = 'On Leave';
                    onLeaveCount++;
                } else if (log) {
                    status = log.status || 'Present';
                    firstLoginTime = log.first_login_time || log.check_in_time || null;
                    checkInTime = log.check_in_time;
                    checkOutTime = log.check_out_time;
                    breakStartTime = log.break_start_time;
                    workedMinutes = log.worked_minutes || 0;
                    activeMinutes = log.active_minutes || 0;
                    idleMinutes = log.idle_minutes || 0;
                    systemMinutes = log.system_minutes || log.system_active_minutes || 0;
                    totalBreakMinutes = log.total_break_minutes || 0;
                    loginCount = log.login_count || staffSessions.length || (checkInTime ? 1 : 0);
                    autoClockedIn = !!log.auto_clocked_in;
                    autoClockedOut = !!log.auto_clocked_out;

                    // Punctuality verification based on check_in_time vs shift_start + grace_period
                    isLate = !!log.is_late;
                    if (checkInTime && settings?.shift_start) {
                        try {
                            const [sHour, sMin] = (settings.shift_start || '09:30').split(':').map(Number);
                            const grace = Number(settings.grace_period_mins || 15);
                            const cutoffMins = sHour * 60 + sMin + grace; // e.g. 9:30 + 15 = 9:45 AM (585 mins)
                            
                            const punchDate = new Date(checkInTime);
                            const punchMins = punchDate.getHours() * 60 + punchDate.getMinutes();
                            
                            if (punchMins <= cutoffMins) {
                                isLate = false;
                                if (status === 'Late') status = 'Present';
                            } else {
                                isLate = true;
                                if (status === 'Present') status = 'Late';
                            }
                        } catch {
                            isLate = !!log.is_late || status === 'Late';
                        }
                    }

                    // If currently clocked in and not clocked out, calculate live elapsed worked minutes
                    if (checkInTime && !checkOutTime) {
                        const checkInDate = new Date(checkInTime);
                        const now = new Date();
                        const elapsedMs = Math.max(0, now.getTime() - checkInDate.getTime());
                        const elapsedMins = Math.floor(elapsedMs / 60000);
                        workedMinutes = Math.max(0, elapsedMins - totalBreakMinutes);
                    }

                    if (status === 'Present' || status === 'On Break' || status === 'On Field') {
                        presentCount++;
                    } else if (status === 'Late' || isLate) {
                        lateCount++;
                        presentCount++;
                    } else if (status === 'On Leave') {
                        onLeaveCount++;
                    } else if (status === 'Clocked Out') {
                        presentCount++; // Clocked out counts towards present attendance
                    } else {
                        absentPendingCount++;
                    }
                } else {
                    absentPendingCount++;
                }

                return {
                    id: logId,
                    staffId: member.id,
                    name: member.name,
                    email: member.email,
                    role: member.role,
                    userType: member.user_type,
                    department: member.department || 'Operations',
                    initials: member.initials || (member.name ? member.name.substring(0, 2).toUpperCase() : 'ST'),
                    color: member.color || 'bg-indigo-600',
                    lastActive: member.last_active,
                    status,
                    isLate,
                    firstLoginTime,
                    checkInTime,
                    checkOutTime,
                    breakStartTime,
                    workedMinutes,
                    activeMinutes,
                    idleMinutes,
                    systemMinutes,
                    systemActiveMinutes: systemMinutes,
                    totalBreakMinutes,
                    loginCount,
                    autoClockedIn,
                    autoClockedOut,
                    shiftName: log?.shift_name || 'General Shift',
                    location: log?.location || null,
                    notes: log?.notes || null,
                    sessions: staffSessions
                };
            });

            // 8. Find current user's attendance
            const currentStaffRoster = currentStaff ? roster.find(r => Number(r.staffId) === Number(currentStaff.id)) : null;

            res.json({
                date: today,
                kpis: {
                    presentCount,
                    lateCount,
                    onLeaveCount,
                    absentPendingCount,
                    totalStaff: staffList.length
                },
                roster,
                currentStaff: currentStaff ? {
                    id: currentStaff.id,
                    name: currentStaff.name,
                    email: currentStaff.email,
                    role: currentStaff.role,
                    userType: currentStaff.user_type,
                    department: currentStaff.department,
                    initials: currentStaff.initials,
                    color: currentStaff.color
                } : null,
                currentAttendance: currentStaffRoster || null,
                settings
            });
        } catch (err) {
            console.error('[Attendance /today Error]:', err);
            res.status(500).json({ error: 'Failed to fetch today attendance: ' + err.message });
        }
    });

    // ─── 2. POST /api/attendance/session/start ───
    // Starts or resumes a staff work session, automatically clocking in on first daily activity
    app.post('/api/attendance/session/start', authMiddleware, async (req, res) => {
        try {
            const currentStaff = await resolveStaff(pool, req);
            const staffId = req.body.staffId ? Number(req.body.staffId) : currentStaff?.id;

            if (!staffId) return res.status(400).json({ error: 'Staff member could not be identified' });

            const session = await recordStaffLoginAndAutoClockIn(
                pool,
                { id: staffId },
                req,
                req.body.loginType || 'web_login'
            );

            res.json({ success: true, message: 'Session active', session });
        } catch (err) {
            console.error('[Session Start Error]:', err);
            res.status(500).json({ error: 'Failed to start session: ' + err.message });
        }
    });

    // ─── 3. POST /api/attendance/session/end ───
    // Closes the current active session
    app.post('/api/attendance/session/end', authMiddleware, async (req, res) => {
        try {
            const currentStaff = await resolveStaff(pool, req);
            const staffId = req.body.staffId ? Number(req.body.staffId) : currentStaff?.id;
            const sessionId = req.body.sessionId;
            const logoutType = req.body.logoutType || 'manual_logout';
            const now = new Date();

            if (!staffId && !sessionId) return res.status(400).json({ error: 'Session or staff identifier required' });

            const today = getTodayISTDate();
            const logId = `ATL-${staffId}-${today}`;

            if (sessionId) {
                await pool.query(`
                    UPDATE attendance_sessions SET
                        session_end = ?,
                        logout_type = ?,
                        updated_at = ?
                    WHERE id = ? AND session_end IS NULL
                `, [now, logoutType, now, sessionId]);
            } else {
                await pool.query(`
                    UPDATE attendance_sessions SET
                        session_end = ?,
                        logout_type = ?,
                        updated_at = ?
                    WHERE staff_id = ? AND session_end IS NULL
                `, [now, logoutType, now, staffId]);
            }

            // If clockOut requested (e.g. user logout, punch out, or inactivity clock-out)
            if (req.body.clockOut) {
                await pool.query(`
                    UPDATE attendance_logs SET
                        check_out_time = ?,
                        status = 'Clocked Out',
                        auto_clocked_out = ?,
                        updated_at = ?
                    WHERE id = ?
                `, [now, logoutType === 'inactivity_timeout' ? 1 : 0, now, logId]);
            }

            res.json({ success: true, message: 'Session closed' });
        } catch (err) {
            console.error('[Session End Error]:', err);
            res.status(500).json({ error: 'Failed to end session: ' + err.message });
        }
    });
    // ─── 4. POST /api/attendance/clock-in ───
    app.post('/api/attendance/clock-in', authMiddleware, async (req, res) => {
        try {
            const currentStaff = await resolveStaff(pool, req);
            const staffId = req.body.staffId ? Number(req.body.staffId) : currentStaff?.id;

            if (!staffId) {
                return res.status(400).json({ error: 'Staff member could not be identified' });
            }

            const today = getTodayISTDate();
            const logId = `ATL-${staffId}-${today}`;
            const now = new Date();

            // Fetch settings for shift & grace period
            const [settingsRows] = await pool.query('SELECT * FROM attendance_settings WHERE id = ?', ['default']);
            const settings = settingsRows.length > 0 ? settingsRows[0] : { shift_start: '09:30', grace_period_mins: 15 };

            // Calculate if late
            const [shiftHour, shiftMinute] = (settings.shift_start || '09:30').split(':').map(Number);
            const graceMins = Number(settings.grace_period_mins || 15);
            const shiftCutoffMins = shiftHour * 60 + shiftMinute + graceMins;

            const istOffset = 5.5 * 60 * 60 * 1000;
            const istDate = new Date(now.getTime() + istOffset);
            const currentMins = istDate.getUTCHours() * 60 + istDate.getUTCMinutes();

            let isLate = 0;
            let lateMinutes = 0;
            let status = 'Present';

            if (currentMins > shiftCutoffMins) {
                isLate = 1;
                lateMinutes = currentMins - (shiftHour * 60 + shiftMinute);
                status = 'Late';
            }

            const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
            const deviceInfo = req.headers['user-agent'] ? req.headers['user-agent'].substring(0, 250) : '';

            // Check if record exists
            const [existing] = await pool.query('SELECT * FROM attendance_logs WHERE id = ?', [logId]);

            if (existing.length > 0) {
                if (existing[0].check_in_time && !existing[0].check_out_time) {
                    return res.json({ success: true, message: 'Already clocked in for today', record: existing[0] });
                }
                // Update re-punch
                await pool.query(`
                    UPDATE attendance_logs SET
                        status = ?,
                        first_login_time = COALESCE(first_login_time, ?),
                        check_in_time = COALESCE(check_in_time, ?),
                        check_out_time = NULL,
                        auto_clocked_out = 0,
                        is_late = ?,
                        late_minutes = ?,
                        location = COALESCE(?, location),
                        ip_address = ?,
                        device_info = ?,
                        notes = COALESCE(?, notes),
                        updated_at = ?
                    WHERE id = ?
                `, [status, now, now, isLate, lateMinutes, req.body.location || null, ipAddress, deviceInfo, req.body.notes || null, now, logId]);
            } else {
                await pool.query(`
                    INSERT INTO attendance_logs (
                        id, staff_id, date, status, first_login_time, check_in_time, is_late, late_minutes,
                        login_count, auto_clocked_in, auto_clocked_out, shift_name, location, ip_address, device_info, notes, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, 'General Shift', ?, ?, ?, ?, ?, ?)
                `, [logId, staffId, today, status, now, now, isLate, lateMinutes, req.body.location || null, ipAddress, deviceInfo, req.body.notes || null, now, now]);
            }

            // Also create/resume session
            const [openSessions] = await pool.query(
                'SELECT * FROM attendance_sessions WHERE staff_id = ? AND session_end IS NULL AND DATE(session_start) = ? LIMIT 1',
                [staffId, today]
            );
            if (openSessions.length === 0) {
                const [countRows] = await pool.query(
                    'SELECT COUNT(*) as count FROM attendance_sessions WHERE staff_id = ? AND DATE(session_start) = ?',
                    [staffId, today]
                );
                const sessionNumber = (countRows[0]?.count || 0) + 1;
                const sessionId = `ATS-${staffId}-${Date.now()}`;
                await pool.query(`
                    INSERT INTO attendance_sessions (
                        id, attendance_id, staff_id, session_number, session_start,
                        last_ping_time, login_type, ip_address, device_info, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, 'manual_punch', ?, ?, ?, ?)
                `, [sessionId, logId, staffId, sessionNumber, now, now, ipAddress, deviceInfo, now, now]);
            }

            await pool.query("UPDATE staff_members SET last_active = ? WHERE id = ?", [now, staffId]);

            const [updated] = await pool.query('SELECT * FROM attendance_logs WHERE id = ?', [logId]);
            res.json({ success: true, message: `Clocked in successfully as ${status}`, record: updated[0] });
        } catch (err) {
            console.error('[Attendance Clock-In Error]:', err);
            res.status(500).json({ error: 'Clock-in failed: ' + err.message });
        }
    });

    // ─── 5. POST /api/attendance/clock-out ───
    app.post('/api/attendance/clock-out', authMiddleware, async (req, res) => {
        try {
            const currentStaff = await resolveStaff(pool, req);
            const staffId = req.body.staffId ? Number(req.body.staffId) : currentStaff?.id;

            if (!staffId) {
                return res.status(400).json({ error: 'Staff member could not be identified' });
            }

            const today = getTodayISTDate();
            const logId = `ATL-${staffId}-${today}`;

            const [rows] = await pool.query('SELECT * FROM attendance_logs WHERE id = ?', [logId]);
            if (rows.length === 0 || !rows[0].check_in_time) {
                return res.status(400).json({ error: 'No active clock-in found for today to clock out' });
            }

            const current = rows[0];
            const now = new Date();
            const checkInDate = new Date(current.check_in_time);

            // If active break is running, close it
            let additionalBreakMins = 0;
            if (current.break_start_time) {
                const breakStart = new Date(current.break_start_time);
                additionalBreakMins = Math.max(0, Math.floor((now.getTime() - breakStart.getTime()) / 60000));
                await pool.query(
                    'UPDATE attendance_breaks SET end_time = ?, duration_minutes = ? WHERE attendance_id = ? AND end_time IS NULL',
                    [now, additionalBreakMins, logId]
                );
            }

            // Close active session
            await pool.query(`
                UPDATE attendance_sessions SET
                    session_end = ?,
                    logout_type = 'manual_punch_out',
                    updated_at = ?
                WHERE staff_id = ? AND session_end IS NULL
            `, [now, now, staffId]);

            const totalBreaks = (current.total_break_minutes || 0) + additionalBreakMins;
            const grossWorkedMs = Math.max(0, now.getTime() - checkInDate.getTime());
            const grossWorkedMins = Math.floor(grossWorkedMs / 60000);
            const netWorkedMins = Math.max(0, grossWorkedMins - totalBreaks);

            const [settingsRows] = await pool.query('SELECT * FROM attendance_settings WHERE id = ?', ['default']);
            const settings = settingsRows.length > 0 ? settingsRows[0] : { half_day_hours: 4.5, full_day_hours: 8.0 };

            const fullDayMins = Number(settings.full_day_hours || 8.0) * 60;
            const halfDayMins = Number(settings.half_day_hours || 4.5) * 60;

            let overtimeMins = 0;
            if (netWorkedMins > fullDayMins) {
                overtimeMins = netWorkedMins - fullDayMins;
            }

            let status = current.status;
            if (status === 'On Break') {
                status = current.is_late ? 'Late' : 'Present';
            }
            if (netWorkedMins < halfDayMins && status !== 'Late') {
                status = 'Half Day';
            }

            await pool.query(`
                UPDATE attendance_logs SET
                    check_out_time = ?,
                    break_start_time = NULL,
                    total_break_minutes = ?,
                    worked_minutes = ?,
                    overtime_minutes = ?,
                    status = ?,
                    notes = COALESCE(?, notes),
                    updated_at = ?
                WHERE id = ?
            `, [now, totalBreaks, netWorkedMins, overtimeMins, status, req.body.notes || null, now, logId]);

            const [updated] = await pool.query('SELECT * FROM attendance_logs WHERE id = ?', [logId]);
            res.json({ success: true, message: 'Clocked out successfully', record: updated[0] });
        } catch (err) {
            console.error('[Attendance Clock-Out Error]:', err);
            res.status(500).json({ error: 'Clock-out failed: ' + err.message });
        }
    });

    // ─── 6. POST /api/attendance/break/start ───
    app.post('/api/attendance/break/start', authMiddleware, async (req, res) => {
        try {
            const currentStaff = await resolveStaff(pool, req);
            const staffId = req.body.staffId ? Number(req.body.staffId) : currentStaff?.id;
            const breakType = req.body.breakType || 'Tea/Lunch';

            if (!staffId) return res.status(400).json({ error: 'Staff member not identified' });

            const today = getTodayISTDate();
            const logId = `ATL-${staffId}-${today}`;

            const [rows] = await pool.query('SELECT * FROM attendance_logs WHERE id = ?', [logId]);
            if (rows.length === 0 || !rows[0].check_in_time) {
                return res.status(400).json({ error: 'Must clock in before starting a break' });
            }

            if (rows[0].break_start_time) {
                return res.status(400).json({ error: 'Already on an active break' });
            }

            const breakId = crypto.randomBytes(16).toString('hex');
            const now = new Date();
            await pool.query(`
                INSERT INTO attendance_breaks (id, attendance_id, staff_id, break_type, start_time)
                VALUES (?, ?, ?, ?, ?)
            `, [breakId, logId, staffId, breakType, now]);

            await pool.query(`
                UPDATE attendance_logs SET
                    break_start_time = ?,
                    status = 'On Break',
                    updated_at = ?
                WHERE id = ?
            `, [now, now, logId]);

            res.json({ success: true, message: 'Break started', breakId });
        } catch (err) {
            console.error('[Break Start Error]:', err);
            res.status(500).json({ error: 'Failed to start break: ' + err.message });
        }
    });

    // ─── 7. POST /api/attendance/break/end ───
    app.post('/api/attendance/break/end', authMiddleware, async (req, res) => {
        try {
            const currentStaff = await resolveStaff(pool, req);
            const staffId = req.body.staffId ? Number(req.body.staffId) : currentStaff?.id;

            if (!staffId) return res.status(400).json({ error: 'Staff member not identified' });

            const today = getTodayISTDate();
            const logId = `ATL-${staffId}-${today}`;

            const [rows] = await pool.query('SELECT * FROM attendance_logs WHERE id = ?', [logId]);
            if (rows.length === 0 || !rows[0].break_start_time) {
                return res.status(400).json({ error: 'No active break to resume from' });
            }

            const breakStartTime = new Date(rows[0].break_start_time);
            const now = new Date();
            const breakElapsedMins = Math.max(1, Math.floor((now.getTime() - breakStartTime.getTime()) / 60000));

            // Update open break in breaks table
            await pool.query(`
                UPDATE attendance_breaks SET
                    end_time = ?,
                    duration_minutes = ?
                WHERE attendance_id = ? AND end_time IS NULL
            `, [now, breakElapsedMins, logId]);

            const newTotalBreaks = (rows[0].total_break_minutes || 0) + breakElapsedMins;
            const newStatus = rows[0].is_late ? 'Late' : 'Present';

            await pool.query(`
                UPDATE attendance_logs SET
                    break_start_time = NULL,
                    total_break_minutes = ?,
                    status = ?,
                    updated_at = ?
                WHERE id = ?
            `, [newTotalBreaks, newStatus, now, logId]);

            res.json({ success: true, message: 'Break ended, resumed work', totalBreakMinutes: newTotalBreaks });
        } catch (err) {
            console.error('[Break End Error]:', err);
            res.status(500).json({ error: 'Failed to end break: ' + err.message });
        }
    });

    // ─── 8. POST /api/attendance/heartbeat ───
    // Active / Idle delta sync heartbeat received every 30 seconds
    app.post('/api/attendance/heartbeat', authMiddleware, async (req, res) => {
        try {
            const currentStaff = await resolveStaff(pool, req);
            const staffId = req.body.staffId ? Number(req.body.staffId) : currentStaff?.id;
            if (!staffId) return res.json({ success: false, message: 'Unrecognized staff' });

            const today = getTodayISTDate();
            const logId = `ATL-${staffId}-${today}`;
            const sessionId = req.body.sessionId;
            const now = new Date();
            const activeDeltaSecs = Number(req.body.activeDeltaSeconds || 0);
            const idleDeltaSecs = Number(req.body.idleDeltaSeconds || 0);
            const systemDeltaSecs = Number(req.body.systemDeltaSeconds || (activeDeltaSecs + idleDeltaSecs) || 30);

            const activeMins = Math.round(activeDeltaSecs / 60);
            const idleMins = Math.round(idleDeltaSecs / 60);
            const systemMins = Math.max(1, Math.round(systemDeltaSecs / 60));

            // Update active session ping & minute counters
            if (sessionId) {
                await pool.query(`
                    UPDATE attendance_sessions SET
                        active_minutes = active_minutes + ?,
                        idle_minutes = idle_minutes + ?,
                        system_minutes = system_minutes + ?,
                        last_ping_time = ?,
                        updated_at = ?
                    WHERE id = ?
                `, [activeMins, idleMins, systemMins, now, now, sessionId]);
            } else {
                await pool.query(`
                    UPDATE attendance_sessions SET
                        active_minutes = active_minutes + ?,
                        idle_minutes = idle_minutes + ?,
                        system_minutes = system_minutes + ?,
                        last_ping_time = ?,
                        updated_at = ?
                    WHERE staff_id = ? AND session_end IS NULL AND DATE(session_start) = ?
                `, [activeMins, idleMins, systemMins, now, now, staffId, today]);
            }

            // Update attendance log totals
            await pool.query(`
                UPDATE attendance_logs SET
                    active_minutes = active_minutes + ?,
                    idle_minutes = idle_minutes + ?,
                    system_minutes = system_minutes + ?,
                    last_activity_time = ?,
                    updated_at = ?
                WHERE id = ?
            `, [activeMins, idleMins, systemMins, now, now, logId]);

            // Update staff member's last active
            await pool.query("UPDATE staff_members SET last_active = ? WHERE id = ?", [now, staffId]);

            res.json({ success: true });
        } catch (err) {
            console.error('[Attendance Heartbeat Error]:', err.message);
            res.status(500).json({ error: err.message });
        }
    });

    // ─── 9. GET /api/attendance/sessions/today ───
    // Get all sessions for today (optionally by staffId)
    app.get('/api/attendance/sessions/today', authMiddleware, async (req, res) => {
        try {
            const today = getTodayISTDate();
            let query = 'SELECT s.*, sm.name as staff_name, sm.email as staff_email, sm.role as staff_role, sm.department FROM attendance_sessions s JOIN staff_members sm ON s.staff_id = sm.id WHERE DATE(s.session_start) = ?';
            const params = [today];

            if (req.query.staffId) {
                query += ' AND s.staff_id = ?';
                params.push(Number(req.query.staffId));
            }

            query += ' ORDER BY s.session_start ASC';
            const [rows] = await pool.query(query, params);
            res.json(rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── 10. GET /api/attendance/sessions/staff/:staffId ───
    // Historical session trail for a specific staff member
    app.get('/api/attendance/sessions/staff/:staffId', authMiddleware, async (req, res) => {
        try {
            const staffId = Number(req.params.staffId);
            const { startDate, endDate } = req.query;

            let query = 'SELECT * FROM attendance_sessions WHERE staff_id = ?';
            const params = [staffId];

            if (startDate && endDate) {
                query += ' AND DATE(session_start) BETWEEN ? AND ?';
                params.push(startDate, endDate);
            }

            query += ' ORDER BY session_start DESC LIMIT 100';
            const [rows] = await pool.query(query, params);
            res.json(rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ─── 7. POST /api/attendance/quick-mark ───
    // Admin 1-click action: Mark Present, Absent, On Field, On Leave
    app.post('/api/attendance/quick-mark', authMiddleware, async (req, res) => {
        try {
            const { staffId, status = 'Present', checkInTime, checkOutTime, notes } = req.body;
            if (!staffId) return res.status(400).json({ error: 'Staff ID is required' });

            const today = getTodayISTDate();
            const logId = `ATL-${staffId}-${today}`;

            const isLate = status === 'Late' ? 1 : 0;
            const checkIn = checkInTime ? new Date(checkInTime) : (status === 'Present' || status === 'Late' ? new Date() : null);

            await pool.query(`
                INSERT INTO attendance_logs (
                    id, staff_id, date, status, check_in_time, check_out_time, is_late, notes, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE
                    status = VALUES(status),
                    check_in_time = COALESCE(VALUES(check_in_time), check_in_time),
                    check_out_time = COALESCE(VALUES(check_out_time), check_out_time),
                    is_late = VALUES(is_late),
                    notes = COALESCE(VALUES(notes), notes),
                    updated_at = NOW()
            `, [logId, staffId, today, status, checkIn, checkOutTime || null, isLate, notes || null]);

            res.json({ success: true, message: `Updated attendance to ${status}` });
        } catch (err) {
            console.error('[Quick-Mark Error]:', err);
            res.status(500).json({ error: 'Quick-mark failed: ' + err.message });
        }
    });

    // ─── 8. PUT /api/attendance/adjust/:id ───
    // Admin adjustment of punch records
    app.put('/api/attendance/adjust/:id', authMiddleware, async (req, res) => {
        try {
            const logId = req.params.id;
            const { status, checkInTime, checkOutTime, workedMinutes, totalBreakMinutes, isLate, notes } = req.body;

            await pool.query(`
                UPDATE attendance_logs SET
                    status = COALESCE(?, status),
                    check_in_time = ?,
                    check_out_time = ?,
                    worked_minutes = COALESCE(?, worked_minutes),
                    total_break_minutes = COALESCE(?, total_break_minutes),
                    is_late = COALESCE(?, is_late),
                    notes = COALESCE(?, notes),
                    regularization_status = 'Approved',
                    updated_at = NOW()
                WHERE id = ?
            `, [
                status,
                checkInTime ? new Date(checkInTime) : null,
                checkOutTime ? new Date(checkOutTime) : null,
                workedMinutes,
                totalBreakMinutes,
                isLate !== undefined ? (isLate ? 1 : 0) : null,
                notes,
                logId
            ]);

            res.json({ success: true, message: 'Attendance record adjusted successfully' });
        } catch (err) {
            console.error('[Adjust Attendance Error]:', err);
            res.status(500).json({ error: 'Adjustment failed: ' + err.message });
        }
    });

    // ─── 9. GET /api/attendance/my-history ───
    // Monthly history for authenticated staff
    app.get('/api/attendance/my-history', authMiddleware, async (req, res) => {
        try {
            const currentStaff = await resolveStaff(pool, req);
            const targetStaffId = req.query.staffId ? Number(req.query.staffId) : currentStaff?.id;

            if (!targetStaffId) return res.status(400).json({ error: 'Staff ID not found' });

            const month = req.query.month || getTodayISTDate().substring(0, 7); // e.g. "2026-08"

            const [logs] = await pool.query(
                `SELECT * FROM attendance_logs 
                 WHERE staff_id = ? AND date LIKE ? 
                 ORDER BY date DESC`,
                [targetStaffId, `${month}%`]
            );

            // Compute monthly summary
            let presentDays = 0;
            let lateDays = 0;
            let absentDays = 0;
            let totalWorkedMinutes = 0;
            let totalOvertimeMinutes = 0;

            logs.forEach(l => {
                if (l.status === 'Present' || l.status === 'On Break' || l.status === 'On Field') presentDays++;
                else if (l.status === 'Late' || l.is_late) { lateDays++; presentDays++; }
                else if (l.status === 'Absent') absentDays++;

                totalWorkedMinutes += Number(l.worked_minutes || 0);
                totalOvertimeMinutes += Number(l.overtime_minutes || 0);
            });

            res.json({
                month,
                staffId: targetStaffId,
                summary: {
                    presentDays,
                    lateDays,
                    absentDays,
                    totalWorkedHours: (totalWorkedMinutes / 60).toFixed(1),
                    totalOvertimeHours: (totalOvertimeMinutes / 60).toFixed(1),
                    avgDailyHours: presentDays > 0 ? (totalWorkedMinutes / presentDays / 60).toFixed(1) : '0'
                },
                logs
            });
        } catch (err) {
            console.error('[My-History Error]:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // ─── 10. POST /api/attendance/regularize ───
    app.post('/api/attendance/regularize', authMiddleware, async (req, res) => {
        try {
            const currentStaff = await resolveStaff(pool, req);
            const { date, requestedCheckIn, requestedCheckOut, reason } = req.body;

            if (!currentStaff?.id || !date || !reason) {
                return res.status(400).json({ error: 'Date and reason are required' });
            }

            const logId = `ATL-${currentStaff.id}-${date}`;

            await pool.query(`
                INSERT INTO attendance_logs (
                    id, staff_id, date, status, check_in_time, check_out_time,
                    regularization_status, regularization_reason, created_at, updated_at
                ) VALUES (?, ?, ?, 'Pending Regularization', ?, ?, 'Requested', ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE
                    regularization_status = 'Requested',
                    regularization_reason = VALUES(regularization_reason),
                    updated_at = NOW()
            `, [logId, currentStaff.id, date, requestedCheckIn || null, requestedCheckOut || null, reason]);

            res.json({ success: true, message: 'Regularization request submitted' });
        } catch (err) {
            console.error('[Regularization Error]:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // ─── 11. GET /api/attendance/reports ───
    // Comprehensive reports & Muster Roll matrix
    app.get('/api/attendance/reports', authMiddleware, async (req, res) => {
        try {
            const { startDate, endDate, department, staffId } = req.query;
            const start = startDate || getTodayISTDate().substring(0, 7) + '-01';
            const end = endDate || getTodayISTDate();

            let query = `
                SELECT l.*, s.name as staff_name, s.department, s.role, s.initials, s.color
                FROM attendance_logs l
                JOIN staff_members s ON l.staff_id = s.id
                WHERE l.date BETWEEN ? AND ?
            `;
            const params = [start, end];

            if (department && department !== 'All') {
                query += ' AND s.department = ?';
                params.push(department);
            }
            if (staffId) {
                query += ' AND l.staff_id = ?';
                params.push(staffId);
            }

            query += ' ORDER BY l.date DESC, s.name ASC';

            const [records] = await pool.query(query, params);

            // Fetch all staff for Muster Roll matrix
            const [allStaff] = await pool.query(
                "SELECT id, name, department, role, initials, color FROM staff_members WHERE status = 'Active' ORDER BY name ASC"
            );

            // Calculate aggregations
            let totalPunches = records.length;
            let lateCount = 0;
            let onTimeCount = 0;
            let totalWorkedMins = 0;

            records.forEach(r => {
                if (r.is_late || r.status === 'Late') lateCount++;
                else if (r.status === 'Present') onTimeCount++;
                totalWorkedMins += Number(r.worked_minutes || 0);
            });

            const punctualityRate = totalPunches > 0 ? Math.round(((totalPunches - lateCount) / totalPunches) * 100) : 100;

            res.json({
                dateRange: { startDate: start, endDate: end },
                kpis: {
                    totalPunches,
                    onTimeCount,
                    lateCount,
                    punctualityRate,
                    totalWorkedHours: (totalWorkedMins / 60).toFixed(1)
                },
                staffList: allStaff,
                records
            });
        } catch (err) {
            console.error('[Attendance Reports Error]:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // ─── 12. Leaves Endpoints ───
    app.get('/api/attendance/leaves', authMiddleware, async (req, res) => {
        try {
            const [leaves] = await pool.query(`
                SELECT l.*, 
                       COALESCE(s.name, CONCAT('Staff #', l.staff_id)) as staff_name, 
                       s.email as staff_email,
                       s.phone as staff_phone,
                       COALESCE(s.department, 'Operations') as department, 
                       COALESCE(s.role, 'Staff') as role, 
                       s.initials, 
                       s.color,
                       approver.name as approved_by_name
                FROM staff_leaves l
                LEFT JOIN staff_members s ON l.staff_id = s.id
                LEFT JOIN staff_members approver ON l.approved_by = approver.id
                ORDER BY l.created_at DESC
            `);
            res.json(leaves);
        } catch (err) {
            console.error('[Get Leaves Error]:', err);
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/attendance/leaves/apply', authMiddleware, async (req, res) => {
        try {
            const currentStaff = await resolveStaff(pool, req);
            const { staffId, leaveType = 'Casual', startDate, endDate, daysCount = 1.0, reason } = req.body;
            const targetStaffId = staffId || currentStaff?.id;

            if (!targetStaffId || !startDate || !endDate || !reason) {
                return res.status(400).json({ error: 'Missing required leave fields' });
            }

            const leaveId = crypto.randomBytes(16).toString('hex');
            await pool.query(`
                INSERT INTO staff_leaves (
                    id, staff_id, leave_type, start_date, end_date, days_count, reason, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', NOW(), NOW())
            `, [leaveId, targetStaffId, leaveType, startDate, endDate, daysCount, reason]);

            res.json({ success: true, message: 'Leave application submitted successfully', leaveId });
        } catch (err) {
            console.error('[Apply Leave Error]:', err);
            res.status(500).json({ error: err.message });
        }
    });

    app.put('/api/attendance/leaves/:id/status', authMiddleware, async (req, res) => {
        try {
            const leaveId = req.params.id;
            const { status, rejectionReason } = req.body;
            const currentStaff = await resolveStaff(pool, req);

            if (!['Approved', 'Rejected', 'Cancelled'].includes(status)) {
                return res.status(400).json({ error: 'Invalid status' });
            }

            await pool.query(`
                UPDATE staff_leaves SET
                    status = ?,
                    approved_by = ?,
                    approved_at = NOW(),
                    rejection_reason = ?,
                    updated_at = NOW()
                WHERE id = ?
            `, [status, currentStaff?.id || null, rejectionReason || null, leaveId]);

            // If approved, update attendance_logs for those dates as 'On Leave'
            if (status === 'Approved') {
                const [leaveRow] = await pool.query('SELECT * FROM staff_leaves WHERE id = ?', [leaveId]);
                if (leaveRow.length > 0) {
                    const { staff_id, start_date, end_date } = leaveRow[0];
                    const start = new Date(start_date);
                    const end = new Date(end_date);
                    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                        const dateStr = d.toISOString().split('T')[0];
                        const logId = `ATL-${staff_id}-${dateStr}`;
                        await pool.query(`
                            INSERT INTO attendance_logs (id, staff_id, date, status, notes, created_at, updated_at)
                            VALUES (?, ?, ?, 'On Leave', 'Approved Leave', NOW(), NOW())
                            ON DUPLICATE KEY UPDATE status = 'On Leave', notes = 'Approved Leave', updated_at = NOW()
                        `, [logId, staff_id, dateStr]);
                    }
                }
            }

            res.json({ success: true, message: `Leave status updated to ${status}` });
        } catch (err) {
            console.error('[Leave Status Update Error]:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // ─── 13. Settings Endpoints ───
    app.get('/api/attendance/settings', authMiddleware, async (req, res) => {
        try {
            const [rows] = await pool.query('SELECT * FROM attendance_settings WHERE id = ?', ['default']);
            if (rows.length > 0) {
                res.json(rows[0]);
            } else {
                res.json({
                    id: 'default',
                    shift_start: '09:30',
                    shift_end: '18:30',
                    grace_period_mins: 15,
                    half_day_hours: 4.5,
                    full_day_hours: 8.0,
                    work_days: 'Mon,Tue,Wed,Thu,Fri,Sat',
                    auto_clockout_time: '23:59',
                    ip_restriction_enabled: 0
                });
            }
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.put('/api/attendance/settings', authMiddleware, async (req, res) => {
        try {
            const {
                shift_start = '09:30',
                shift_end = '18:30',
                grace_period_mins = 15,
                half_day_hours = 4.5,
                full_day_hours = 8.0,
                work_days = 'Mon,Tue,Wed,Thu,Fri,Sat',
                auto_clockout_time = '23:59',
                ip_restriction_enabled = 0,
                allowed_ips = ''
            } = req.body;

            await pool.query(`
                INSERT INTO attendance_settings (
                    id, shift_start, shift_end, grace_period_mins, half_day_hours, full_day_hours,
                    work_days, auto_clockout_time, ip_restriction_enabled, allowed_ips, updated_at
                ) VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                    shift_start = VALUES(shift_start),
                    shift_end = VALUES(shift_end),
                    grace_period_mins = VALUES(grace_period_mins),
                    half_day_hours = VALUES(half_day_hours),
                    full_day_hours = VALUES(full_day_hours),
                    work_days = VALUES(work_days),
                    auto_clockout_time = VALUES(auto_clockout_time),
                    ip_restriction_enabled = VALUES(ip_restriction_enabled),
                    allowed_ips = VALUES(allowed_ips),
                    updated_at = NOW()
            `, [
                shift_start, shift_end, grace_period_mins, half_day_hours, full_day_hours,
                work_days, auto_clockout_time, ip_restriction_enabled ? 1 : 0, allowed_ips
            ]);

            res.json({ success: true, message: 'Attendance & shift settings updated successfully' });
        } catch (err) {
            console.error('[Save Settings Error]:', err);
            res.status(500).json({ error: err.message });
        }
    });
}
