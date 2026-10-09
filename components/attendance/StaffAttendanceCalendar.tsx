import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../src/lib/api';
import { toast } from 'sonner';
import { StaffBotAvatar } from '../../src/components/ui/StaffBotAvatar';
import { TodayRosterItem } from '../../types';

interface StaffAttendanceCalendarProps {
    currentStaffId?: number;
    canViewAllStaff: boolean;
    canManageRoster?: boolean;
    canApproveRegularization?: boolean;
    rosterList?: TodayRosterItem[];
    selectedStaffId?: number;
    onSelectStaffId?: (id?: number) => void;
    onRequestRegularization?: (date: string, checkIn?: string, checkOut?: string) => void;
    onQuickAdjust?: (item: any) => void;
}

export const StaffAttendanceCalendar: React.FC<StaffAttendanceCalendarProps> = ({
    currentStaffId,
    canViewAllStaff,
    canManageRoster,
    canApproveRegularization,
    rosterList = [],
    selectedStaffId,
    onSelectStaffId,
    onRequestRegularization,
    onQuickAdjust
}) => {
    // Current date helpers
    const today = useMemo(() => new Date(), []);
    const todayStr = useMemo(() => {
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }, [today]);

    // Month Selector State: format "YYYY-MM"
    const [selectedMonth, setSelectedMonth] = useState<string>(() => {
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
    });

    // Active View: 'calendar' (7-day grid), 'muster' (All-staff 31-day matrix), 'logs' (Table list)
    const [viewMode, setViewMode] = useState<'calendar' | 'muster' | 'logs'>('calendar');

    // Selected staff ID for individual view
    const activeStaffId = useMemo(() => {
        if (!canViewAllStaff) {
            return currentStaffId;
        }
        return selectedStaffId || currentStaffId;
    }, [canViewAllStaff, selectedStaffId, currentStaffId]);

    // Data States
    const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
    const [historyData, setHistoryData] = useState<any>(null);

    const [loadingMatrix, setLoadingMatrix] = useState<boolean>(false);
    const [matrixData, setMatrixData] = useState<any>(null);

    // Filter states for Muster Roll
    const [musterDept, setMusterDept] = useState<string>('All');
    const [musterSearch, setMusterSearch] = useState<string>('');

    // Modal state for inspecting a single day's card
    const [selectedDayDetails, setSelectedDayDetails] = useState<any | null>(null);

    // Load Single Staff Attendance History (Calendar & Logs views)
    useEffect(() => {
        if (!activeStaffId) return;
        let isMounted = true;

        const loadHistory = async () => {
            setLoadingHistory(true);
            try {
                const res = await api.getMyAttendanceHistory(selectedMonth, canViewAllStaff ? activeStaffId : undefined);
                if (isMounted) {
                    setHistoryData(res);
                }
            } catch (err: any) {
                console.error('Error fetching staff attendance history:', err);
                if (isMounted) {
                    toast.error(err.message || 'Failed to load attendance records');
                }
            } finally {
                if (isMounted) setLoadingHistory(false);
            }
        };

        loadHistory();
        return () => { isMounted = false; };
    }, [selectedMonth, activeStaffId, canViewAllStaff]);

    // Load Company-Wide Muster Roll Matrix (Admin / Permitted Only)
    useEffect(() => {
        if (!canViewAllStaff || viewMode !== 'muster') return;
        let isMounted = true;

        const loadMatrix = async () => {
            setLoadingMatrix(true);
            try {
                const res = await api.getAttendanceMonthlyMatrix(selectedMonth, musterDept);
                if (isMounted) {
                    setMatrixData(res);
                }
            } catch (err: any) {
                console.error('Error loading monthly attendance matrix:', err);
                if (isMounted) {
                    toast.error(err.message || 'Failed to load muster roll');
                }
            } finally {
                if (isMounted) setLoadingMatrix(false);
            }
        };

        loadMatrix();
        return () => { isMounted = false; };
    }, [canViewAllStaff, viewMode, selectedMonth, musterDept]);

    // Month Navigation Helpers
    const handlePrevMonth = () => {
        const [yearStr, monthStr] = selectedMonth.split('-');
        let year = parseInt(yearStr, 10);
        let month = parseInt(monthStr, 10) - 1;
        if (month < 1) {
            month = 12;
            year -= 1;
        }
        setSelectedMonth(`${year}-${String(month).padStart(2, '0')}`);
    };

    const handleNextMonth = () => {
        const [yearStr, monthStr] = selectedMonth.split('-');
        let year = parseInt(yearStr, 10);
        let month = parseInt(monthStr, 10) + 1;
        if (month > 12) {
            month = 1;
            year += 1;
        }
        setSelectedMonth(`${year}-${String(month).padStart(2, '0')}`);
    };

    const handleCurrentMonthJump = () => {
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        setSelectedMonth(`${y}-${m}`);
    };

    // Formatters
    const monthDisplayName = useMemo(() => {
        try {
            const [y, m] = selectedMonth.split('-');
            const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
            return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        } catch {
            return selectedMonth;
        }
    }, [selectedMonth]);

    const formatClockTime = (iso?: string | null) => {
        if (!iso) return '-';
        try {
            return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
        } catch {
            return '-';
        }
    };

    const formatMins = (mins?: number) => {
        if (!mins || mins <= 0) return '0m';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    // Calculate Calendar Days for 7-Column Grid (Monday to Sunday)
    const calendarGrid = useMemo(() => {
        const [yearStr, monthStr] = selectedMonth.split('-');
        const year = parseInt(yearStr, 10);
        const monthIndex = parseInt(monthStr, 10) - 1; // 0-based
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

        // 1st day of month: 0 = Sun, 1 = Mon, ..., 6 = Sat
        const firstDaySundayBased = new Date(year, monthIndex, 1).getDay();
        // Shift to Monday-first: Mon=0, Tue=1, ..., Sun=6
        const leadingBlanks = (firstDaySundayBased + 6) % 7;

        // Map logs by date string (YYYY-MM-DD)
        const logMap = new Map<string, any>();
        if (historyData?.logs && Array.isArray(historyData.logs)) {
            historyData.logs.forEach((log: any) => {
                const dateKey = log.date ? String(log.date).split('T')[0] : '';
                if (dateKey) logMap.set(dateKey, log);
            });
        }

        // Map approved leaves by date
        const leaveMap = new Map<string, any>();
        if (historyData?.approvedLeaves && Array.isArray(historyData.approvedLeaves)) {
            historyData.approvedLeaves.forEach((lv: any) => {
                const start = new Date(lv.start_date || lv.startDate);
                const end = new Date(lv.end_date || lv.endDate);
                const curr = new Date(start);
                while (curr <= end) {
                    const y = curr.getFullYear();
                    const m = String(curr.getMonth() + 1).padStart(2, '0');
                    const d = String(curr.getDate()).padStart(2, '0');
                    leaveMap.set(`${y}-${m}-${d}`, lv);
                    curr.setDate(curr.getDate() + 1);
                }
            });
        }

        const days = [];

        // Leading blanks from previous month
        for (let i = 0; i < leadingBlanks; i++) {
            days.push({ isBlank: true, id: `blank-${i}` });
        }

        // Days of current month
        for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
            const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dateObj = new Date(year, monthIndex, dayNum);
            const isSunday = dateObj.getDay() === 0;
            const isToday = dateStr === todayStr;
            const isFuture = dateStr > todayStr;

            const log = logMap.get(dateStr);
            const leave = leaveMap.get(dateStr);

            // Did the person log in, punch, work, or attend on this day?
            const hasPunched = Boolean(
                log && (
                    log.check_in_time ||
                    log.first_login_time ||
                    Number(log.worked_minutes || 0) > 0 ||
                    ['Present', 'Clocked Out', 'On Break', 'On Field', 'Late', 'Half Day'].includes(log.status) ||
                    (log.sessions && log.sessions.length > 0)
                )
            );

            let status = 'Not Marked';
            let badgeVariant: 'present' | 'leave' | 'off' | 'absent' | 'future' = 'future';
            let isLate = false;
            let isHalfDay = false;
            let isActive = false;
            let isOnBreak = false;
            let workedDurationMins = 0;

            if (isFuture) {
                badgeVariant = 'future';
                status = isSunday ? 'Weekly Off' : 'Upcoming';
            } else if (hasPunched && log) {
                // Irrespective of what time they logged in: Marked PRESENT!
                badgeVariant = 'present';
                status = 'Present';

                workedDurationMins = Number(log.worked_minutes || 0);

                // Sub-attribute: Late arrival
                isLate = Boolean(log.is_late || log.status === 'Late');

                // Sub-attribute: Half day (explicit status or worked < half day threshold)
                const halfDayThresholdMins = (historyData?.settings?.half_day_hours || 4.5) * 60;
                isHalfDay = Boolean(
                    log.status === 'Half Day' ||
                    (log.check_out_time && workedDurationMins > 0 && workedDurationMins < halfDayThresholdMins && !isToday)
                );

                // Sub-attribute: Currently live/active or on break
                isActive = Boolean(log.check_in_time && !log.check_out_time && log.status !== 'Clocked Out');
                isOnBreak = Boolean(log.status === 'On Break');
            } else if (leave) {
                status = `Leave (${leave.leave_type || 'Approved'})`;
                badgeVariant = 'leave';
            } else if (isSunday) {
                status = 'Weekly Off';
                badgeVariant = 'off';
            } else {
                status = 'Absent';
                badgeVariant = 'absent';
            }

            days.push({
                isBlank: false,
                dayNum,
                dateStr,
                dateObj,
                isToday,
                isFuture,
                isSunday,
                log,
                leave,
                status,
                badgeVariant,
                hasPunched,
                isLate,
                isHalfDay,
                isActive,
                isOnBreak,
                workedDurationMins
            });
        }

        return days;
    }, [selectedMonth, historyData, todayStr]);

    // Active staff info banner
    const currentViewStaff = useMemo(() => {
        if (historyData?.staffInfo) return historyData.staffInfo;
        if (rosterList && activeStaffId) {
            const found = rosterList.find(r => r.staffId === activeStaffId);
            if (found) {
                return {
                    id: found.staffId,
                    name: found.name,
                    email: found.email,
                    role: found.role,
                    department: found.department,
                    userType: found.userType
                };
            }
        }
        return null;
    }, [historyData, rosterList, activeStaffId]);

    // Unique departments for muster filter
    const departmentsList = useMemo(() => {
        const set = new Set<string>();
        if (rosterList) {
            rosterList.forEach(r => {
                if (r.department) set.add(r.department);
            });
        }
        return ['All', ...Array.from(set)];
    }, [rosterList]);

    // Filtered Muster Roll Matrix records
    const filteredMatrix = useMemo(() => {
        if (!matrixData?.matrix || !Array.isArray(matrixData.matrix)) return [];
        const q = musterSearch.trim().toLowerCase();
        return matrixData.matrix.filter((row: any) => {
            const name = (row?.staff?.name || '').toLowerCase();
            const email = (row?.staff?.email || '').toLowerCase();
            const dept = (row?.staff?.department || '').toLowerCase();
            const matchesSearch = !q || name.includes(q) || email.includes(q) || dept.includes(q);
            const matchesDept = musterDept === 'All' || (row?.staff?.department || '') === musterDept;
            return matchesSearch && matchesDept;
        });
    }, [matrixData, musterSearch, musterDept]);

    // Safe extraction of totals and day data to prevent runtime crashes
    const getRowTotals = (row: any) => {
        const t = row?.totals || row?.summary || {};
        return {
            present: t.present ?? t.presentCount ?? 0,
            late: t.late ?? t.lateCount ?? 0,
            halfDay: t.halfDay ?? t.halfDayCount ?? 0,
            leave: t.leave ?? t.leaveCount ?? 0,
            weeklyOff: t.weeklyOff ?? t.weeklyOffCount ?? 0,
            absent: t.absent ?? t.absentCount ?? 0,
            workedHours: t.workedHours ?? t.totalWorkedHours ?? '0.0',
            breakHours: t.breakHours ?? 0,
            punctualityRate: t.punctualityRate ?? 100
        };
    };

    const getDayCellData = (row: any, dayNum: number) => {
        if (!row?.days) return null;
        if (Array.isArray(row.days)) {
            return row.days.find((d: any) => d.dayNum === dayNum || d.day === dayNum) || row.days[dayNum - 1] || null;
        }
        return row.days[dayNum] || null;
    };

    // Export Muster Roll to CSV
    const handleExportMusterCSV = () => {
        if (!matrixData?.matrix || matrixData.matrix.length === 0) {
            toast.error('No muster roll data available to export');
            return;
        }

        const daysCount = matrixData.daysInMonth || 31;
        const dayHeaders = Array.from({ length: daysCount }, (_, i) => `Day ${i + 1}`);
        const headers = [
            'Staff ID',
            'Staff Name',
            'Email',
            'Department',
            'Role',
            ...dayHeaders,
            'Total Present',
            'Total Late',
            'Total Half Days',
            'Total Leaves',
            'Total Weekly Offs',
            'Total Absents',
            'Total Worked (Hours)',
            'Total Breaks (Hours)'
        ];

        const rows = filteredMatrix.map((r: any) => {
            const rowTotals = getRowTotals(r);
            const dayCodes = [];
            for (let d = 1; d <= daysCount; d++) {
                const dayData = getDayCellData(r, d);
                dayCodes.push(dayData?.code || '-');
            }
            return [
                r.staff?.id || '',
                `"${r.staff?.name || ''}"`,
                `"${r.staff?.email || ''}"`,
                `"${r.staff?.department || ''}"`,
                `"${r.staff?.role || ''}"`,
                ...dayCodes,
                rowTotals.present,
                rowTotals.late,
                rowTotals.halfDay,
                rowTotals.leave,
                rowTotals.weeklyOff,
                rowTotals.absent,
                rowTotals.workedHours,
                rowTotals.breakHours
            ];
        });

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Shrawello_Attendance_Muster_${selectedMonth}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Exported muster roll for ${selectedMonth}!`);
    };

    return (
        <div className="space-y-6">
            {/* Top Navigation & Controls Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
                {/* Left: Title & Staff Profile Badge */}
                <div className="flex items-center gap-3.5">
                    {currentViewStaff ? (
                        <StaffBotAvatar
                            staff={currentViewStaff}
                            size={44}
                        />
                    ) : (
                        <div className="size-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <span className="material-symbols-outlined text-2xl">calendar_month</span>
                        </div>
                    )}
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                                {viewMode === 'muster'
                                    ? 'Company Muster Roll'
                                    : currentViewStaff
                                        ? `${currentViewStaff.name}'s Attendance`
                                        : 'My Attendance Calendar'}
                            </h2>
                            {currentViewStaff && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {currentViewStaff.department || 'Staff'}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {viewMode === 'muster'
                                ? `Monthly 1-${matrixData?.daysInMonth || 31} company-wide attendance matrix for all employees`
                                : `Visual calendar timeline, daily punch stamps, sessions audit & regularizations`}
                        </p>
                    </div>
                </div>

                {/* Right: Controls & Selectors */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* View Switcher Pills */}
                    <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                        <button
                            type="button"
                            onClick={() => setViewMode('calendar')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                                viewMode === 'calendar'
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[16px]">calendar_view_month</span>
                            <span>Visual Calendar</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('logs')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                                viewMode === 'logs'
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[16px]">list_alt</span>
                            <span>Log Table</span>
                        </button>
                        {/* Admin-only Muster Roll Tab */}
                        {canViewAllStaff && (
                            <button
                                type="button"
                                onClick={() => setViewMode('muster')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                                    viewMode === 'muster'
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[16px]">grid_on</span>
                                <span>Muster Roll (All Staff)</span>
                            </button>
                        )}
                    </div>

                    {/* Staff Member Selector (Only if Permitted!) */}
                    {canViewAllStaff && viewMode !== 'muster' && (
                        <div className="relative">
                            <select
                                value={activeStaffId || ''}
                                onChange={e => {
                                    const val = e.target.value ? Number(e.target.value) : undefined;
                                    if (onSelectStaffId) onSelectStaffId(val);
                                }}
                                className="px-3 py-2 pr-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer focus:ring-2 focus:ring-indigo-500/20"
                            >
                                <option value={currentStaffId}>My Attendance (Me)</option>
                                {rosterList.map(r => (
                                    <option key={r.staffId} value={r.staffId}>
                                        {r.name} • {r.department}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Month Navigator Controls */}
                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-1">
                        <button
                            type="button"
                            onClick={handlePrevMonth}
                            title="Previous Month"
                            className="size-7 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                        </button>

                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 px-2 min-w-[110px] text-center">
                            {monthDisplayName}
                        </span>

                        <button
                            type="button"
                            onClick={handleNextMonth}
                            title="Next Month"
                            className="size-7 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </button>
                    </div>

                    {/* Today Jump */}
                    <button
                        type="button"
                        onClick={handleCurrentMonthJump}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-2xl transition-colors cursor-pointer"
                    >
                        Current Month
                    </button>

                    {/* Action: Request Regularization */}
                    {onRequestRegularization && viewMode !== 'muster' && (
                        <button
                            type="button"
                            onClick={() => onRequestRegularization(todayStr)}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[16px]">edit_calendar</span>
                            <span>Regularize</span>
                        </button>
                    )}

                    {/* Action: Export CSV in Muster Roll */}
                    {viewMode === 'muster' && (
                        <button
                            type="button"
                            onClick={handleExportMusterCSV}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[16px]">download</span>
                            <span>Export Muster CSV</span>
                        </button>
                    )}
                </div>
            </div>

            {/* VIEW MODE 1: VISUAL CALENDAR GRID */}
            {viewMode === 'calendar' && (
                <div className="space-y-6">
                    {/* Monthly KPI Metrics Ribbon */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                        {/* Working Days */}
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Days</span>
                            <div className="flex items-baseline gap-1.5 mt-1">
                                <span className="text-2xl font-black text-slate-900 dark:text-white">
                                    {historyData?.summary?.daysInMonth || 31}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400">
                                    ({historyData?.summary?.workingDaysInMonth || 26} work)
                                </span>
                            </div>
                        </div>

                        {/* Present */}
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-emerald-100 dark:border-emerald-950/40 shadow-sm bg-gradient-to-br from-emerald-50/40 to-transparent dark:from-emerald-950/10">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Present</span>
                                <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            </div>
                            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                                {historyData?.summary?.presentDays || 0}
                            </span>
                        </div>

                        {/* Late */}
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-amber-100 dark:border-amber-950/40 shadow-sm bg-gradient-to-br from-amber-50/40 to-transparent dark:from-amber-950/10">
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Late Arrivals</span>
                            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
                                {historyData?.summary?.lateDays || 0}
                            </span>
                        </div>

                        {/* Half Day */}
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-indigo-100 dark:border-indigo-950/40 shadow-sm bg-gradient-to-br from-indigo-50/40 to-transparent dark:from-indigo-950/10">
                            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Half Days</span>
                            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
                                {historyData?.summary?.halfDays || 0}
                            </span>
                        </div>

                        {/* Approved Leaves */}
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-sky-100 dark:border-sky-950/40 shadow-sm bg-gradient-to-br from-sky-50/40 to-transparent dark:from-sky-950/10">
                            <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">Leaves</span>
                            <span className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1 block">
                                {historyData?.summary?.leaveDays || 0}
                            </span>
                        </div>

                        {/* Absent */}
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-rose-100 dark:border-rose-950/40 shadow-sm bg-gradient-to-br from-rose-50/40 to-transparent dark:from-rose-950/10">
                            <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">Absent / Missed</span>
                            <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 block">
                                {historyData?.summary?.absentDays || 0}
                            </span>
                        </div>

                        {/* Total Productive Hours & Score */}
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-purple-100 dark:border-purple-950/40 shadow-sm bg-gradient-to-br from-purple-50/40 to-transparent dark:from-purple-950/10 col-span-2 sm:col-span-1">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">Punctuality</span>
                                <span className="text-[10px] font-black text-purple-600">{historyData?.summary?.punctualityScore || 100}%</span>
                            </div>
                            <span className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1 block">
                                {historyData?.summary?.totalWorkedHours ? `${historyData.summary.totalWorkedHours}h` : '0h'}
                            </span>
                        </div>
                    </div>

                    {/* Interactive 7-Column Calendar Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden p-5">
                        {/* Day of Week Headers */}
                        <div className="grid grid-cols-7 gap-2 mb-3 text-center">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                                <div
                                    key={day}
                                    className={`py-2 text-[11px] font-black uppercase tracking-wider rounded-xl ${
                                        idx === 6
                                            ? 'text-rose-500 bg-rose-50/50 dark:bg-rose-950/20'
                                            : 'text-slate-400 bg-slate-50 dark:bg-slate-800/40'
                                    }`}
                                >
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid Cells */}
                        {loadingHistory ? (
                            <div className="py-24 text-center">
                                <div className="inline-block size-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-xs font-bold text-slate-400 mt-3">Loading attendance calendar...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-7 gap-2">
                                {calendarGrid.map((cell: any, index: number) => {
                                    if (cell.isBlank) {
                                        return (
                                            <div
                                                key={cell.id || index}
                                                className="min-h-[115px] rounded-2xl bg-slate-50/40 dark:bg-slate-800/10 border border-dashed border-slate-100 dark:border-slate-800/40 opacity-40"
                                            />
                                        );
                                    }

                                    // Badge styling
                                    let cellBorder = 'border-slate-200/70 dark:border-slate-800';
                                    let cellBg = 'bg-white dark:bg-slate-900/90 hover:bg-slate-50/90 dark:hover:bg-slate-800/60';
                                    let badgeClass = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
                                    let badgeLabel = cell.status;

                                    if (cell.badgeVariant === 'present') {
                                        cellBorder = 'border-emerald-200/90 dark:border-emerald-800/40';
                                        cellBg = 'bg-emerald-50/15 dark:bg-emerald-950/10 hover:bg-emerald-50/30';
                                        badgeClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80';
                                        badgeLabel = 'PRESENT';
                                    } else if (cell.badgeVariant === 'leave') {
                                        cellBorder = 'border-sky-200/90 dark:border-sky-800/40';
                                        cellBg = 'bg-sky-50/20 dark:bg-sky-950/10 hover:bg-sky-50/40';
                                        badgeClass = 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200/80';
                                        badgeLabel = 'ON LEAVE';
                                    } else if (cell.badgeVariant === 'off') {
                                        cellBorder = 'border-slate-200/50 dark:border-slate-800/50';
                                        cellBg = 'bg-slate-50/40 dark:bg-slate-800/20 hover:bg-slate-100/60';
                                        badgeClass = 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
                                        badgeLabel = 'OFF';
                                    } else if (cell.badgeVariant === 'absent') {
                                        cellBorder = 'border-rose-200/90 dark:border-rose-800/40';
                                        cellBg = 'bg-rose-50/20 dark:bg-rose-950/10 hover:bg-rose-50/40';
                                        badgeClass = 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/80';
                                        badgeLabel = 'ABSENT';
                                    } else if (cell.badgeVariant === 'future') {
                                        cellBorder = 'border-dashed border-slate-200 dark:border-slate-800';
                                        cellBg = 'bg-slate-50/20 dark:bg-slate-900/40';
                                        badgeClass = 'text-slate-400';
                                        badgeLabel = cell.isSunday ? 'WEEKLY OFF' : 'UPCOMING';
                                    }

                                    return (
                                        <div
                                            key={cell.dateStr}
                                            onClick={() => {
                                                if (!cell.isFuture || cell.log) {
                                                    setSelectedDayDetails(cell);
                                                }
                                            }}
                                            className={`min-h-[120px] p-2.5 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer group ${cellBorder} ${cellBg} ${
                                                cell.isToday ? 'ring-2 ring-indigo-500 shadow-md' : 'shadow-xs hover:shadow-sm'
                                            }`}
                                        >
                                            {/* Top: Day Number & Primary Status Badge */}
                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`text-sm font-black ${
                                                            cell.isToday
                                                                ? 'text-indigo-600 dark:text-indigo-400'
                                                                : cell.isSunday
                                                                    ? 'text-rose-500'
                                                                    : 'text-slate-800 dark:text-slate-200'
                                                        }`}>
                                                            {cell.dayNum}
                                                        </span>
                                                        {cell.isToday && (
                                                            <span className="px-1.5 py-0.2 rounded-md bg-indigo-600 text-white text-[9px] font-black uppercase">
                                                                Today
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Primary Status Badge */}
                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${badgeClass}`}>
                                                        {badgeLabel}
                                                    </span>
                                                </div>

                                                {/* Sub-attribute tags: Late, Half Day, Active, Break */}
                                                {cell.hasPunched && (
                                                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                                        {cell.isLate && (
                                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-black tracking-tight bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                                                                <span>⏰</span> LATE
                                                            </span>
                                                        )}
                                                        {cell.isHalfDay && (
                                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-black tracking-tight bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                                                                <span>🌓</span> HALF DAY
                                                            </span>
                                                        )}
                                                        {cell.isOnBreak && (
                                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-black tracking-tight bg-yellow-500/20 text-yellow-800 dark:text-yellow-300 border border-yellow-500/30 animate-pulse">
                                                                <span>☕</span> BREAK
                                                            </span>
                                                        )}
                                                        {cell.isActive && !cell.isOnBreak && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black tracking-tight bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                                                                <span className="size-1 rounded-full bg-emerald-500 animate-ping" /> ACTIVE
                                                            </span>
                                                        )}
                                                        {!cell.isLate && !cell.isHalfDay && !cell.isActive && !cell.isOnBreak && cell.log?.check_out_time && (
                                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50">
                                                                ✓ On Time
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Middle: Check-In & Check-Out Timestamps */}
                                            <div className="my-1.5 space-y-0.5">
                                                {cell.log?.check_in_time ? (
                                                    <div className="flex items-center justify-between text-[10px]">
                                                        <span className="text-slate-400 font-semibold flex items-center gap-1">
                                                            <span className="size-1.5 rounded-full bg-emerald-500"></span> In:
                                                        </span>
                                                        <span className="font-bold text-slate-800 dark:text-slate-200">
                                                            {formatClockTime(cell.log.check_in_time)}
                                                        </span>
                                                    </div>
                                                ) : null}

                                                {cell.log?.check_out_time ? (
                                                    <div className="flex items-center justify-between text-[10px]">
                                                        <span className="text-slate-400 font-semibold flex items-center gap-1">
                                                            <span className="size-1.5 rounded-full bg-sky-500"></span> Out:
                                                        </span>
                                                        <span className="font-bold text-slate-800 dark:text-slate-200">
                                                            {formatClockTime(cell.log.check_out_time)}
                                                        </span>
                                                    </div>
                                                ) : null}

                                                {!cell.hasPunched && !cell.isFuture && !cell.isSunday && (
                                                    <span className="text-[10px] text-rose-500 font-semibold italic block">
                                                        No punches logged
                                                    </span>
                                                )}
                                            </div>

                                            {/* Bottom: Worked Hours & Regularization status */}
                                            <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
                                                {cell.workedDurationMins > 0 ? (
                                                    <span className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-1 text-[10.5px]">
                                                        <span className="text-[11px]">⏱️</span> {formatMins(cell.workedDurationMins)}
                                                    </span>
                                                ) : cell.isActive ? (
                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[9.5px] flex items-center gap-1">
                                                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Working Now
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-[9px]">-</span>
                                                )}

                                                {cell.log?.regularization_status === 'Requested' && (
                                                    <span className="size-2 rounded-full bg-amber-500" title="Regularization Pending"></span>
                                                )}
                                                {cell.log?.regularization_status === 'Approved' && (
                                                    <span className="material-symbols-outlined text-emerald-500 text-[13px]" title="Regularized">verified</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* VIEW MODE 2: MONTHLY MUSTER ROLL MATRIX (ADMIN ONLY) */}
            {viewMode === 'muster' && canViewAllStaff && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden p-5 space-y-4">
                    {/* Muster Filters */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-600 text-xl">calendar_view_week</span>
                            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                                All Staff Muster Roll (1-{matrixData?.daysInMonth || 31} {monthDisplayName})
                            </h3>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <input
                                type="text"
                                placeholder="Search staff name..."
                                value={musterSearch}
                                onChange={e => setMusterSearch(e.target.value)}
                                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                            />

                            <select
                                value={musterDept}
                                onChange={e => setMusterDept(e.target.value)}
                                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold cursor-pointer"
                            >
                                {departmentsList.map(d => (
                                    <option key={d} value={d}>Dept: {d}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Muster Legend */}
                    <div className="flex flex-wrap items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl text-[10px] font-bold">
                        <span className="text-slate-400 uppercase tracking-wider">Legend:</span>
                        <span className="inline-flex items-center gap-1"><span className="size-2 rounded bg-emerald-500"></span> P = Present</span>
                        <span className="inline-flex items-center gap-1"><span className="size-2 rounded bg-amber-500"></span> L = Late</span>
                        <span className="inline-flex items-center gap-1"><span className="size-2 rounded bg-indigo-500"></span> HD = Half Day</span>
                        <span className="inline-flex items-center gap-1"><span className="size-2 rounded bg-sky-500"></span> LV = Approved Leave</span>
                        <span className="inline-flex items-center gap-1"><span className="size-2 rounded bg-slate-400"></span> WO = Weekly Off</span>
                        <span className="inline-flex items-center gap-1"><span className="size-2 rounded bg-rose-500"></span> A = Absent</span>
                    </div>

                    {/* Muster Roll Table */}
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                        {loadingMatrix ? (
                            <div className="py-20 text-center text-slate-400 font-bold text-xs">
                                Loading company muster roll matrix...
                            </div>
                        ) : filteredMatrix.length === 0 ? (
                            <div className="py-20 text-center text-slate-400 font-bold text-xs">
                                No staff attendance records found for this month/filter
                            </div>
                        ) : (
                            <table className="w-full text-left text-[11px] border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-extrabold uppercase">
                                        <th className="py-3 px-3 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 min-w-[160px]">
                                            Employee
                                        </th>
                                        <th className="py-3 px-2 min-w-[90px]">Dept</th>
                                        {Array.from({ length: matrixData?.daysInMonth || 31 }, (_, i) => i + 1).map(day => (
                                            <th key={day} className="py-2 px-1 text-center min-w-[28px] border-x border-slate-100 dark:border-slate-800">
                                                {day}
                                            </th>
                                        ))}
                                        <th className="py-3 px-2 text-center bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 min-w-[45px]">P</th>
                                        <th className="py-3 px-2 text-center bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 min-w-[45px]">L</th>
                                        <th className="py-3 px-2 text-center bg-sky-50/50 dark:bg-sky-950/20 text-sky-700 min-w-[45px]">LV</th>
                                        <th className="py-3 px-2 text-center bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 min-w-[45px]">A</th>
                                        <th className="py-3 px-3 text-right bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 min-w-[65px]">Worked</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredMatrix.map((row: any) => {
                                        const rowTotals = getRowTotals(row);
                                        return (
                                        <tr key={row.staff?.id || Math.random()} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                            {/* Sticky Staff Name */}
                                            <td className="py-2.5 px-3 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center gap-2">
                                                    <StaffBotAvatar staff={row.staff} size={28} />
                                                    <div className="truncate max-w-[130px]">
                                                        <span className="font-bold text-slate-900 dark:text-white block truncate">
                                                            {row.staff?.name || 'Staff'}
                                                        </span>
                                                        <span className="text-[9px] text-slate-400 block truncate">
                                                            {row.staff?.role || ''}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Department */}
                                            <td className="py-2.5 px-2 text-slate-500 font-semibold">
                                                {row.staff?.department || '-'}
                                            </td>

                                            {/* Day 1 to N Cells */}
                                            {Array.from({ length: matrixData?.daysInMonth || 31 }, (_, i) => i + 1).map(day => {
                                                const dayData = getDayCellData(row, day);
                                                const code = dayData?.code || '-';

                                                let colorClass = 'text-slate-300';
                                                if (code === 'P') colorClass = 'bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-black';
                                                else if (code === 'L') colorClass = 'bg-amber-100/80 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-black';
                                                else if (code === 'HD') colorClass = 'bg-indigo-100/70 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 font-black';
                                                else if (code === 'LV') colorClass = 'bg-sky-100/70 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 font-black';
                                                else if (code === 'WO') colorClass = 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
                                                else if (code === 'A') colorClass = 'bg-rose-100/70 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-black';

                                                return (
                                                    <td
                                                        key={day}
                                                        title={`${dayData?.date || ''}: ${dayData?.status || 'No record'}${dayData?.checkInTime ? ` (In: ${formatClockTime(dayData.checkInTime)})` : ''}`}
                                                        className="py-1 px-0.5 text-center border-x border-slate-100 dark:border-slate-800"
                                                    >
                                                        <span className={`inline-block size-6 leading-6 text-center rounded-lg text-[10px] ${colorClass}`}>
                                                            {code}
                                                        </span>
                                                    </td>
                                                );
                                            })}

                                            {/* Summary Counts */}
                                            <td className="py-2.5 px-2 text-center font-bold text-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/10">
                                                {rowTotals.present}
                                            </td>
                                            <td className="py-2.5 px-2 text-center font-bold text-amber-600 bg-amber-50/20 dark:bg-amber-950/10">
                                                {rowTotals.late}
                                            </td>
                                            <td className="py-2.5 px-2 text-center font-bold text-sky-600 bg-sky-50/20 dark:bg-sky-950/10">
                                                {rowTotals.leave}
                                            </td>
                                            <td className="py-2.5 px-2 text-center font-bold text-rose-600 bg-rose-50/20 dark:bg-rose-950/10">
                                                {rowTotals.absent}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/10">
                                                {rowTotals.workedHours}h
                                            </td>
                                        </tr>
                                    );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* VIEW MODE 3: DETAILED TABLE LOG VIEW */}
            {viewMode === 'logs' && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden p-5">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                                    <th className="py-3.5 px-5">Date</th>
                                    <th className="py-3.5 px-4">Status</th>
                                    <th className="py-3.5 px-4">Clock In</th>
                                    <th className="py-3.5 px-4">Clock Out</th>
                                    <th className="py-3.5 px-4">Worked</th>
                                    <th className="py-3.5 px-4">Break Total</th>
                                    <th className="py-3.5 px-4">Regularization</th>
                                    <th className="py-3.5 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {loadingHistory ? (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">
                                            Loading history records...
                                        </td>
                                    </tr>
                                ) : (!historyData?.logs || historyData.logs.length === 0) ? (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                                            No attendance punch logs found for {monthDisplayName}
                                        </td>
                                    </tr>
                                ) : (
                                    historyData.logs.map((log: any) => (
                                        <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-white">
                                                {log.date ? String(log.date).split('T')[0] : '-'}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                {(() => {
                                                    const hasLogPunched = Boolean(
                                                        log.check_in_time ||
                                                        log.first_login_time ||
                                                        Number(log.worked_minutes || 0) > 0 ||
                                                        ['Present', 'Clocked Out', 'On Break', 'On Field', 'Late', 'Half Day'].includes(log.status) ||
                                                        (log.sessions && log.sessions.length > 0)
                                                    );
                                                    const isLate = Boolean(log.is_late || log.status === 'Late');
                                                    const isHalfDay = log.status === 'Half Day';
                                                    const isOnBreak = log.status === 'On Break';

                                                    if (hasLogPunched) {
                                                        return (
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60">
                                                                    PRESENT
                                                                </span>
                                                                {isLate && (
                                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60">
                                                                        ⏰ Late
                                                                    </span>
                                                                )}
                                                                {isHalfDay && (
                                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/60">
                                                                        🌓 Half Day
                                                                    </span>
                                                                )}
                                                                {isOnBreak && (
                                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-50 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300 border border-yellow-200/60 animate-pulse">
                                                                        ☕ Break
                                                                    </span>
                                                                )}
                                                                {!isLate && !isHalfDay && !isOnBreak && log.check_out_time && (
                                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-emerald-600 bg-emerald-50/50">
                                                                        ✓ On Time
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    }

                                                    if (log.status === 'On Leave') {
                                                        return (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200/60">
                                                                ON LEAVE
                                                            </span>
                                                        );
                                                    }

                                                    return (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60">
                                                            ABSENT
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                                                {formatClockTime(log.check_in_time)}
                                            </td>
                                            <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                                                {formatClockTime(log.check_out_time)}
                                            </td>
                                            <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                                                {formatMins(log.worked_minutes)}
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-500">
                                                {formatMins(log.total_break_minutes)}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                {log.regularization_status === 'Requested' ? (
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">
                                                        Pending Review
                                                    </span>
                                                ) : log.regularization_status === 'Approved' ? (
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                                                        Approved
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {onRequestRegularization && (log.status === 'Absent' || log.status === 'Half Day' || log.status === 'Late' || !log.check_out_time) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onRequestRegularization(String(log.date).split('T')[0], formatClockTime(log.check_in_time), formatClockTime(log.check_out_time))}
                                                            className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                                                        >
                                                            Regularize
                                                        </button>
                                                    )}
                                                    {canManageRoster && onQuickAdjust && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onQuickAdjust(log)}
                                                            className="text-xs font-bold text-slate-600 hover:text-indigo-600 cursor-pointer"
                                                        >
                                                            Adjust
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* DAY INSPECTION DRAWER / MODAL */}
            {selectedDayDetails && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <span className="material-symbols-outlined text-indigo-600 text-2xl">event_available</span>
                                <div>
                                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                                        Day Audit: {selectedDayDetails.dateStr}
                                    </h3>
                                    <p className="text-xs text-slate-400 font-semibold">
                                        {new Date(selectedDayDetails.dateStr).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedDayDetails(null)}
                                className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>

                        {/* Status Strip */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-black uppercase text-slate-400 block">Attendance Status</span>
                                <span className={`text-sm font-black ${
                                    selectedDayDetails.badgeVariant === 'present'
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : selectedDayDetails.badgeVariant === 'leave'
                                            ? 'text-sky-600 dark:text-sky-400'
                                            : selectedDayDetails.badgeVariant === 'off'
                                                ? 'text-slate-500'
                                                : selectedDayDetails.badgeVariant === 'absent'
                                                    ? 'text-rose-600 dark:text-rose-400'
                                                    : 'text-slate-500'
                                }`}>
                                    {selectedDayDetails.badgeVariant === 'present' ? 'PRESENT' : selectedDayDetails.status}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {selectedDayDetails.isLate && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200">
                                        ⏰ Late Arrival
                                    </span>
                                )}
                                {selectedDayDetails.isHalfDay && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200">
                                        🌓 Half Day Shift
                                    </span>
                                )}
                                {selectedDayDetails.isOnBreak && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300 border border-yellow-200">
                                        ☕ On Break
                                    </span>
                                )}
                                {selectedDayDetails.isActive && !selectedDayDetails.isOnBreak && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 animate-pulse">
                                        🟢 Live Active Shift
                                    </span>
                                )}
                                {selectedDayDetails.hasPunched && !selectedDayDetails.isLate && !selectedDayDetails.isHalfDay && !selectedDayDetails.isActive && !selectedDayDetails.isOnBreak && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
                                        ✓ On Time
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Punch Timings & Worked Minutes */}
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] font-bold text-slate-400 block uppercase">Check In</span>
                                <span className="text-sm font-black text-emerald-600 mt-1 block">
                                    {formatClockTime(selectedDayDetails.log?.check_in_time)}
                                </span>
                            </div>
                            <div className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] font-bold text-slate-400 block uppercase">Check Out</span>
                                <span className="text-sm font-black text-sky-600 mt-1 block">
                                    {formatClockTime(selectedDayDetails.log?.check_out_time)}
                                </span>
                            </div>
                            <div className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] font-bold text-slate-400 block uppercase">Duration</span>
                                <span className="text-sm font-black text-indigo-600 mt-1 block">
                                    {formatMins(selectedDayDetails.log?.worked_minutes)}
                                </span>
                            </div>
                        </div>

                        {/* Sessions Breakdown */}
                        {selectedDayDetails.log?.sessions && selectedDayDetails.log.sessions.length > 0 && (
                            <div className="space-y-2">
                                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                                    Login Sessions ({selectedDayDetails.log.sessions.length})
                                </span>
                                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                    {selectedDayDetails.log.sessions.map((sess: any, sIdx: number) => (
                                        <div key={sess.id || sIdx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-[11px] flex items-center justify-between">
                                            <div>
                                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                                    Session #{sIdx + 1}: {formatClockTime(sess.session_start)} → {formatClockTime(sess.session_end)}
                                                </span>
                                                <span className="text-[10px] text-slate-400 block">
                                                    IP: {sess.ip_address || 'Local'} • Device: {sess.device_info || 'Web Browser'}
                                                </span>
                                            </div>
                                            <span className="font-black text-indigo-600">
                                                {formatMins(sess.active_minutes)} active
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Breaks Breakdown */}
                        {selectedDayDetails.log?.breaks && selectedDayDetails.log.breaks.length > 0 && (
                            <div className="space-y-2">
                                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                                    Breaks Logged ({selectedDayDetails.log.breaks.length})
                                </span>
                                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                                    {selectedDayDetails.log.breaks.map((brk: any, bIdx: number) => (
                                        <div key={brk.id || bIdx} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-[11px] flex items-center justify-between">
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                {brk.break_type || 'General Break'}: {formatClockTime(brk.start_time)} → {formatClockTime(brk.end_time)}
                                            </span>
                                            <span className="font-bold text-amber-600">
                                                {formatMins(brk.duration_minutes)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Regularization note if any */}
                        {selectedDayDetails.log?.regularization_reason && (
                            <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs">
                                <span className="font-black text-amber-800 dark:text-amber-300 block">
                                    Regularization Note ({selectedDayDetails.log.regularization_status}):
                                </span>
                                <p className="text-slate-600 dark:text-slate-300 italic mt-0.5">
                                    "{selectedDayDetails.log.regularization_reason}"
                                </p>
                            </div>
                        )}

                        {/* Footer Actions */}
                        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                            {onRequestRegularization && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const d = selectedDayDetails.dateStr;
                                        setSelectedDayDetails(null);
                                        onRequestRegularization(d);
                                    }}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                                >
                                    Request Regularization
                                </button>
                            )}

                            {canManageRoster && onQuickAdjust && selectedDayDetails.log && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const l = selectedDayDetails.log;
                                        setSelectedDayDetails(null);
                                        onQuickAdjust(l);
                                    }}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                                >
                                    Admin Adjust Record
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => setSelectedDayDetails(null)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
