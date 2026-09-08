import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../src/lib/api';
import { toast } from 'sonner';
import { TodayAttendanceResponse, TodayRosterItem, StaffLeave, AttendanceSettings, AttendanceReportResponse } from '../../types';

export const Attendance: React.FC = () => {
    const { currentUser, isAuthenticated, hasPermission, canAccess } = useAuth();

    // Active tab state
    const [activeTab, setActiveTab] = useState<'roster' | 'my-attendance' | 'reports' | 'leaves' | 'settings'>('roster');

    // Live clock
    const [liveTime, setLiveTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setLiveTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Main Data State
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [todayData, setTodayData] = useState<TodayAttendanceResponse | null>(null);

    // Filters for Today's Roster
    const [searchQuery, setSearchQuery] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');

    // Edit/Adjust Modal State
    const [editingItem, setEditingItem] = useState<TodayRosterItem | null>(null);
    const [editForm, setEditForm] = useState({
        status: 'Present',
        checkInTime: '',
        checkOutTime: '',
        workedMinutes: 0,
        totalBreakMinutes: 0,
        notes: ''
    });
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // My Attendance Tab State
    const [myMonth, setMyMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [selectedStaffId, setSelectedStaffId] = useState<number | undefined>(undefined);
    const [myHistory, setMyHistory] = useState<any>(null);
    const [loadingMyHistory, setLoadingMyHistory] = useState(false);
    const [showRegularizeModal, setShowRegularizeModal] = useState(false);
    const [regForm, setRegForm] = useState({ date: '', checkIn: '09:30', checkOut: '18:30', reason: '' });

    // Pending Regularizations State (For Managers / Admins)
    const [pendingRegularizations, setPendingRegularizations] = useState<any[]>([]);
    const [loadingRegs, setLoadingRegs] = useState(false);

    // Reports Tab State
    const [reportDateRange, setReportDateRange] = useState({
        startDate: () => {
            const d = new Date();
            d.setDate(1);
            return d.toISOString().split('T')[0];
        },
        endDate: () => new Date().toISOString().split('T')[0]
    });
    const [reportDept, setReportDept] = useState('All');
    const [reportData, setReportData] = useState<AttendanceReportResponse | null>(null);
    const [loadingReports, setLoadingReports] = useState(false);

    // Leaves Tab State
    const [leavesList, setLeavesList] = useState<StaffLeave[]>([]);
    const [loadingLeaves, setLoadingLeaves] = useState(false);
    const [showApplyLeaveModal, setShowApplyLeaveModal] = useState(false);
    const [leaveForm, setLeaveForm] = useState({
        leaveType: 'Casual' as 'Casual' | 'Sick' | 'Paid' | 'Unpaid' | 'Half Day',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        daysCount: 1.0,
        reason: ''
    });
    const [rejectingLeaveId, setRejectingLeaveId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    // Settings Tab State
    const [settingsForm, setSettingsForm] = useState<AttendanceSettings>({
        shift_start: '09:30',
        shift_end: '18:30',
        grace_period_mins: 15,
        half_day_hours: 4.5,
        full_day_hours: 8.0,
        work_days: 'Mon,Tue,Wed,Thu,Fri,Sat',
        auto_clockout_time: '23:59',
        ip_restriction_enabled: 0,
        allowed_ips: ''
    });
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    // Fetch Today's Roster
    const fetchTodayRoster = async (isManualRefresh = false) => {
        if (isManualRefresh) setRefreshing(true);
        try {
            const data = await api.getTodayAttendance();
            setTodayData(data);
            if (data.settings) {
                setSettingsForm(data.settings);
            }
        } catch (err: any) {
            console.error('Failed to fetch today roster:', err);
            toast.error('Failed to load live attendance roster');
        } finally {
            setLoading(false);
            if (isManualRefresh) setRefreshing(false);
        }
    };

    // Fetch Pending Regularizations for Managers
    const fetchPendingRegs = async () => {
        if (currentUser?.userType === 'Admin' || canAccess('attendance', 'approve_regularization') || hasPermission('attendance', 'manage') || hasPermission('settings', 'manage')) {
            setLoadingRegs(true);
            try {
                const regs = await api.getPendingRegularizations();
                setPendingRegularizations(regs || []);
            } catch (err) {
                console.error('Failed to load pending regularizations:', err);
            } finally {
                setLoadingRegs(false);
            }
        }
    };

    useEffect(() => {
        fetchTodayRoster();
        fetchPendingRegs();
        const poll = setInterval(() => {
            fetchTodayRoster(false);
            fetchPendingRegs();
        }, 60000);
        return () => clearInterval(poll);
    }, [isAuthenticated]);

    // Handle URL search parameter ?staffId=...
    useEffect(() => {
        try {
            const hash = window.location.hash || '';
            const qIdx = hash.indexOf('?');
            let staffIdParam: string | null = null;
            if (qIdx !== -1) {
                const params = new URLSearchParams(hash.substring(qIdx));
                staffIdParam = params.get('staffId');
            } else {
                const urlParams = new URLSearchParams(window.location.search);
                staffIdParam = urlParams.get('staffId');
            }

            if (staffIdParam) {
                const sId = Number(staffIdParam);
                if (sId) {
                    setSelectedStaffId(sId);
                    if (todayData?.roster) {
                        const target = todayData.roster.find(r => r.staffId === sId);
                        if (target) {
                            setSearchQuery(target.name);
                        }
                    }
                }
            }
        } catch (e) {}
    }, [todayData]);

    // Listen to global attendance update events from topbar widget or other tabs
    useEffect(() => {
        const handleSync = () => {
            fetchTodayRoster(false);
            fetchPendingRegs();
        };
        window.addEventListener('shrawello:attendance-updated', handleSync);
        return () => window.removeEventListener('shrawello:attendance-updated', handleSync);
    }, []);

    // Fetch My Attendance when tab active or selected staff changes
    useEffect(() => {
        if (activeTab === 'my-attendance' && currentUser) {
            fetchMyHistory();
        }
    }, [activeTab, myMonth, selectedStaffId, currentUser]);

    const fetchMyHistory = async () => {
        setLoadingMyHistory(true);
        try {
            const res = await api.getMyAttendanceHistory(myMonth, selectedStaffId);
            setMyHistory(res);
        } catch (err: any) {
            console.error('Failed to fetch my attendance:', err);
        } finally {
            setLoadingMyHistory(false);
        }
    };

    // Fetch Reports when tab active
    useEffect(() => {
        if (activeTab === 'reports') {
            fetchReports();
        }
    }, [activeTab, reportDateRange, reportDept]);

    const fetchReports = async () => {
        setLoadingReports(true);
        try {
            const res = await api.getAttendanceReports({
                startDate: typeof reportDateRange.startDate === 'function' ? reportDateRange.startDate() : reportDateRange.startDate,
                endDate: typeof reportDateRange.endDate === 'function' ? reportDateRange.endDate() : reportDateRange.endDate,
                department: reportDept !== 'All' ? reportDept : undefined
            });
            setReportData(res);
        } catch (err: any) {
            console.error('Failed to load reports:', err);
        } finally {
            setLoadingReports(false);
        }
    };

    // Fetch Leaves when tab active
    useEffect(() => {
        if (activeTab === 'leaves') {
            fetchLeaves();
        }
    }, [activeTab]);

    const fetchLeaves = async () => {
        setLoadingLeaves(true);
        try {
            const res = await api.getStaffLeaves();
            setLeavesList(res);
        } catch (err: any) {
            console.error('Failed to load leaves:', err);
        } finally {
            setLoadingLeaves(false);
        }
    };

    // Format Helpers
    const formatClockTime = (iso?: string | null) => {
        if (!iso) return '-';
        try {
            const d = new Date(iso);
            return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
        } catch {
            return '-';
        }
    };

    const formatMinsToDuration = (mins?: number) => {
        if (!mins || mins <= 0) return '-';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    // Live Current User Attendance
    const currentAttendance = todayData?.currentAttendance || null;
    const settings = todayData?.settings;
    const shiftTimingStr = `Shift: ${settings?.shift_start || '09:30'} - ${settings?.shift_end || '18:30'}`;

    // Filtered Roster
    const filteredRoster = useMemo(() => {
        if (!todayData?.roster) return [];
        return todayData.roster.filter(item => {
            const matchesSearch = !searchQuery.trim() ||
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.role.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDept = departmentFilter === 'All' || item.department === departmentFilter;
            const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
            return matchesSearch && matchesDept && matchesStatus;
        });
    }, [todayData?.roster, searchQuery, departmentFilter, statusFilter]);

    // Unique departments for filter
    const departments = useMemo(() => {
        if (!todayData?.roster) return ['All'];
        const depts = new Set<string>();
        todayData.roster.forEach(r => { if (r.department) depts.add(r.department); });
        return ['All', ...Array.from(depts)];
    }, [todayData?.roster]);

    // Punch Handlers
    const handleClockIn = async () => {
        try {
            const staffId = currentAttendance?.staffId || currentUser?.id;
            const res = await api.clockIn({ staffId });
            toast.success(res.message || 'Clocked in successfully!');
            fetchTodayRoster();
            window.dispatchEvent(new CustomEvent('shrawello:attendance-updated'));
        } catch (err: any) {
            toast.error(err.message || 'Failed to clock in');
        }
    };

    const handleClockOut = async () => {
        try {
            const staffId = currentAttendance?.staffId || currentUser?.id;
            const res = await api.clockOut({ staffId });
            toast.success(res.message || 'Clocked out successfully!');
            fetchTodayRoster();
            window.dispatchEvent(new CustomEvent('shrawello:attendance-updated'));
        } catch (err: any) {
            toast.error(err.message || 'Failed to clock out');
        }
    };

    const handleStartBreak = async () => {
        try {
            const staffId = currentAttendance?.staffId || currentUser?.id;
            const res = await api.startBreak({ staffId });
            toast.success(res.message || 'Break started');
            fetchTodayRoster();
            window.dispatchEvent(new CustomEvent('shrawello:attendance-updated'));
        } catch (err: any) {
            toast.error(err.message || 'Failed to start break');
        }
    };

    const handleEndBreak = async () => {
        try {
            const staffId = currentAttendance?.staffId || currentUser?.id;
            const res = await api.endBreak({ staffId });
            toast.success(res.message || 'Resumed work');
            fetchTodayRoster();
            window.dispatchEvent(new CustomEvent('shrawello:attendance-updated'));
        } catch (err: any) {
            toast.error(err.message || 'Failed to end break');
        }
    };

    const handleQuickMarkPresent = async (staffId: number) => {
        try {
            const res = await api.quickMarkAttendance({ staffId, status: 'Present' });
            toast.success(res.message || 'Marked present');
            fetchTodayRoster();
            window.dispatchEvent(new CustomEvent('shrawello:attendance-updated'));
        } catch (err: any) {
            toast.error(err.message || 'Failed to update attendance');
        }
    };

    // Open Edit Modal
    const handleOpenEdit = (item: TodayRosterItem) => {
        setEditingItem(item);
        setEditForm({
            status: item.status,
            checkInTime: item.checkInTime ? new Date(item.checkInTime).toISOString().slice(0, 16) : '',
            checkOutTime: item.checkOutTime ? new Date(item.checkOutTime).toISOString().slice(0, 16) : '',
            workedMinutes: item.workedMinutes || 0,
            totalBreakMinutes: item.totalBreakMinutes || 0,
            notes: item.notes || ''
        });
    };

    const handleSaveEdit = async () => {
        if (!editingItem) return;
        if (!canAccess('attendance', 'manage_roster')) {
            toast.error('Permission Denied: You do not have permission to adjust roster attendance records.');
            return;
        }
        setIsSavingEdit(true);
        try {
            await api.adjustAttendance(editingItem.id, {
                status: editForm.status,
                checkInTime: editForm.checkInTime ? new Date(editForm.checkInTime).toISOString() : null,
                checkOutTime: editForm.checkOutTime ? new Date(editForm.checkOutTime).toISOString() : null,
                workedMinutes: Number(editForm.workedMinutes || 0),
                totalBreakMinutes: Number(editForm.totalBreakMinutes || 0),
                notes: editForm.notes
            });
            toast.success('Attendance record adjusted successfully!');
            setEditingItem(null);
            fetchTodayRoster();
            window.dispatchEvent(new CustomEvent('shrawello:attendance-updated'));
        } catch (err: any) {
            toast.error(err.message || 'Failed to adjust attendance');
        } finally {
            setIsSavingEdit(false);
        }
    };

    // Inspecting Staff Sessions Modal State
    const [inspectingStaffItem, setInspectingStaffItem] = useState<TodayRosterItem | null>(null);

    // Save Settings
    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        try {
            await api.updateAttendanceSettings(settingsForm);
            toast.success('Shift and attendance settings saved!');
            fetchTodayRoster();
        } catch (err: any) {
            toast.error(err.message || 'Failed to save settings');
        } finally {
            setIsSavingSettings(false);
        }
    };

    // Apply Leave
    const handleApplyLeave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.applyStaffLeave({
                leaveType: leaveForm.leaveType,
                startDate: leaveForm.startDate,
                endDate: leaveForm.endDate,
                daysCount: Number(leaveForm.daysCount),
                reason: leaveForm.reason
            });
            toast.success('Leave application submitted!');
            setShowApplyLeaveModal(false);
            setLeaveForm({
                leaveType: 'Casual',
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0],
                daysCount: 1.0,
                reason: ''
            });
            fetchLeaves();
        } catch (err: any) {
            toast.error(err.message || 'Failed to submit leave');
        }
    };

    // Approve/Reject Leave
    const handleUpdateLeaveStatus = async (leaveId: string, status: 'Approved' | 'Rejected', rejectionReason?: string) => {
        if (!canAccess('attendance', 'approve_leaves')) {
            toast.error('Permission Denied: You do not have permission to approve or reject staff leaves.');
            return;
        }
        try {
            await api.updateStaffLeaveStatus(leaveId, { status, rejectionReason });
            toast.success(`Leave request ${status.toLowerCase()}!`);
            setRejectingLeaveId(null);
            setRejectReason('');
            fetchLeaves();
            fetchTodayRoster();
        } catch (err: any) {
            toast.error(err.message || 'Failed to update leave');
        }
    };

    // Regularization Submit
    const handleRegularizeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const checkInIso = regForm.date ? `${regForm.date}T${regForm.checkIn}:00` : undefined;
            const checkOutIso = regForm.date ? `${regForm.date}T${regForm.checkOut}:00` : undefined;
            await api.submitRegularization({
                date: regForm.date,
                requestedCheckIn: checkInIso,
                requestedCheckOut: checkOutIso,
                reason: regForm.reason
            });
            toast.success('Regularization request submitted to manager!');
            setShowRegularizeModal(false);
            fetchMyHistory();
            fetchPendingRegs();
        } catch (err: any) {
            toast.error(err.message || 'Failed to submit regularization');
        }
    };

    const handleApproveReg = async (logId: string) => {
        if (!canAccess('attendance', 'approve_regularization')) {
            toast.error('Permission Denied: You do not have permission to approve regularizations.');
            return;
        }
        try {
            await api.updateRegularizationStatus(logId, { status: 'Approved' });
            toast.success('Attendance regularization approved!');
            fetchPendingRegs();
            fetchTodayRoster();
            fetchMyHistory();
            window.dispatchEvent(new CustomEvent('shrawello:attendance-updated'));
        } catch (err: any) {
            toast.error(err.message || 'Failed to approve regularization');
        }
    };

    const handleRejectReg = async (logId: string) => {
        if (!canAccess('attendance', 'approve_regularization')) {
            toast.error('Permission Denied: You do not have permission to reject regularizations.');
            return;
        }
        const reason = window.prompt('Please enter a rejection reason:', 'Discrepancy in punch times');
        if (reason === null) return;
        try {
            await api.updateRegularizationStatus(logId, { status: 'Rejected', rejectionReason: reason });
            toast.success('Regularization request rejected');
            fetchPendingRegs();
            fetchTodayRoster();
            fetchMyHistory();
            window.dispatchEvent(new CustomEvent('shrawello:attendance-updated'));
        } catch (err: any) {
            toast.error(err.message || 'Failed to reject regularization');
        }
    };

    // Status Badge Helper
    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'Present':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        PRESENT
                    </span>
                );
            case 'Late':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                        <span className="size-1.5 rounded-full bg-amber-500" />
                        LATE
                    </span>
                );
            case 'On Break':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-50 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800/40">
                        <span className="size-1.5 rounded-full bg-yellow-500 animate-pulse" />
                        ON BREAK
                    </span>
                );
            case 'On Leave':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800/40">
                        <span className="size-1.5 rounded-full bg-sky-500" />
                        ON LEAVE
                    </span>
                );
            case 'Half Day':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40">
                        <span className="size-1.5 rounded-full bg-indigo-500" />
                        HALF DAY
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40">
                        <span className="size-1.5 rounded-full bg-rose-500" />
                        ABSENT
                    </span>
                );
        }
    };

    // Export CSV
    const handleExportTodayCSV = () => {
        if (!todayData?.roster || todayData.roster.length === 0) {
            toast.error('No roster data to export');
            return;
        }
        const headers = ['Staff Name', 'Email', 'Role', 'Department', 'Status', 'Sessions', 'Clock In', 'Clock Out', 'Worked (Mins)', 'Active Time (Mins)', 'Idle Time (Mins)', 'System Time (Mins)'];
        const rows = todayData.roster.map(r => [
            `"${r.name}"`,
            `"${r.email}"`,
            `"${r.role}"`,
            `"${r.department}"`,
            `"${r.status}"`,
            r.loginCount || r.sessions?.length || 1,
            `"${formatClockTime(r.checkInTime)}"`,
            `"${formatClockTime(r.checkOutTime)}"`,
            r.workedMinutes || 0,
            r.activeMinutes || 0,
            r.idleMinutes || 0,
            r.systemMinutes || r.systemActiveMinutes || 0
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `shrawello-attendance-roster-${todayData.date}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Roster exported successfully');
    };

    const formattedTodayDate = liveTime.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="space-y-6 pb-20">
            {/* Top Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="size-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                        <span className="material-symbols-outlined text-2xl">fingerprint</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                            Staff Attendance & Roster
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Automated clock-in, multi-session auditing, active vs idle tracking, and live presence.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <div className="px-4 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-xs font-bold text-slate-600 dark:text-slate-300">
                        {formattedTodayDate}
                    </div>
                </div>
            </div>

            {/* Current Logged-in Staff Live Punch Hero Card */}
            <div className="bg-slate-900 dark:bg-slate-950 text-white rounded-3xl p-5 md:p-6 shadow-xl border border-slate-800 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="size-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-3xl">badge</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-lg font-black tracking-tight text-white">
                                    {currentUser?.name || 'Staff Member'}
                                </h2>
                                {currentAttendance?.checkInTime && currentAttendance.status !== 'Absent' ? (
                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                        currentAttendance.status === 'On Break'
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    }`}>
                                        {currentAttendance.status === 'On Break' ? 'ON BREAK' : 'CLOCKED IN'}
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                                        CLOCKED OUT
                                    </span>
                                )}
                                {currentAttendance?.autoClockedIn && (
                                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                        Auto Clock-in
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                                {currentAttendance?.firstLoginTime && (
                                    <span>First Login: <strong className="text-white font-bold">{formatClockTime(currentAttendance.firstLoginTime)}</strong></span>
                                )}
                                {currentAttendance?.checkInTime && currentAttendance.status !== 'Absent' ? (
                                    <span>Clocked in: <strong className="text-emerald-400 font-bold">{formatClockTime(currentAttendance.checkInTime)}</strong></span>
                                ) : (
                                    <span>Not clocked in today</span>
                                )}
                                {currentAttendance?.checkOutTime && (
                                    <span>Clocked out: <strong className="text-rose-400 font-bold">{formatClockTime(currentAttendance.checkOutTime)}</strong></span>
                                )}
                                <span>· {shiftTimingStr}</span>
                            </p>
                        </div>
                    </div>

                    {/* Hero Card Punch Buttons */}
                    <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                        {currentAttendance?.checkInTime && currentAttendance.status !== 'Absent' && !currentAttendance.checkOutTime ? (
                            <>
                                {currentAttendance.status === 'On Break' ? (
                                    <button
                                        onClick={handleEndBreak}
                                        className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                                        <span>Resume Work</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleStartBreak}
                                        className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-2xl border border-amber-500/30 transition-all active:scale-95 cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-[18px] text-amber-400">coffee</span>
                                        <span>Start Break</span>
                                    </button>
                                )}

                                <button
                                    onClick={handleClockOut}
                                    className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-rose-600/30 transition-all active:scale-95 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[18px]">logout</span>
                                    <span>Clock Out</span>
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={handleClockIn}
                                className="w-full md:w-auto flex items-center justify-center gap-2 px-7 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[18px]">login</span>
                                <span>Clock In for Today</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* 4-Metric Summary Bar for Current User */}
                {currentAttendance?.checkInTime && (
                    <div className="pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="bg-slate-800/60 rounded-2xl p-2.5 border border-slate-700/60">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Total Worked</span>
                            <p className="text-sm font-black text-emerald-400 mt-0.5">{formatMinsToDuration(currentAttendance.workedMinutes)}</p>
                        </div>
                        <div className="bg-slate-800/60 rounded-2xl p-2.5 border border-slate-700/60">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Active Work</span>
                            <p className="text-sm font-black text-cyan-400 mt-0.5">{formatMinsToDuration(currentAttendance.activeMinutes || currentAttendance.workedMinutes)}</p>
                        </div>
                        <div className="bg-slate-800/60 rounded-2xl p-2.5 border border-slate-700/60">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Idle Time</span>
                            <p className="text-sm font-black text-amber-400 mt-0.5">{formatMinsToDuration(currentAttendance.idleMinutes || 0)}</p>
                        </div>
                        <div className="bg-slate-800/60 rounded-2xl p-2.5 border border-slate-700/60">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Login Sessions</span>
                            <p className="text-sm font-black text-indigo-300 mt-0.5">
                                {currentAttendance.loginCount || currentAttendance.sessions?.length || 1} Sessions Today
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation Tabs Header */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar pb-px">
                <button
                    onClick={() => setActiveTab('roster')}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                        activeTab === 'roster'
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <span className="material-symbols-outlined text-[18px]">schedule</span>
                    <span>Today's Roster</span>
                </button>

                <button
                    onClick={() => setActiveTab('my-attendance')}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                        activeTab === 'my-attendance'
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                    <span>My Attendance</span>
                </button>

                <button
                    onClick={() => setActiveTab('reports')}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                        activeTab === 'reports'
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <span className="material-symbols-outlined text-[18px]">analytics</span>
                    <span>Reports</span>
                </button>

                <button
                    onClick={() => setActiveTab('leaves')}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                        activeTab === 'leaves'
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <span className="material-symbols-outlined text-[18px]">beach_access</span>
                    <span>Leaves</span>
                    {leavesList.filter(l => l.status === 'Pending').length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white">
                            {leavesList.filter(l => l.status === 'Pending').length}
                        </span>
                    )}
                </button>

                {(currentUser?.userType === 'Admin' || hasPermission('attendance', 'manage') || hasPermission('settings', 'manage')) && (
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'settings'
                                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[18px]">tune</span>
                        <span>Settings</span>
                    </button>
                )}
            </div>

            {/* TAB 1: TODAY'S ROSTER */}
            {activeTab === 'roster' && (
                <div className="space-y-6">
                    {/* 4 Metric Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/40 rounded-3xl p-5">
                            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                                {todayData?.kpis.presentCount ?? 0}
                            </p>
                            <p className="text-xs font-bold text-emerald-800/80 dark:text-emerald-300/80 mt-1">
                                Present Today
                            </p>
                        </div>

                        <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/40 rounded-3xl p-5">
                            <p className="text-3xl font-black text-amber-600 dark:text-amber-400">
                                {todayData?.kpis.lateCount ?? 0}
                            </p>
                            <p className="text-xs font-bold text-amber-800/80 dark:text-amber-300/80 mt-1">
                                Late Arrivals
                            </p>
                        </div>

                        <div className="bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/70 dark:border-sky-800/40 rounded-3xl p-5">
                            <p className="text-3xl font-black text-sky-600 dark:text-sky-400">
                                {todayData?.kpis.onLeaveCount ?? 0}
                            </p>
                            <p className="text-xs font-bold text-sky-800/80 dark:text-sky-300/80 mt-1">
                                On Leave
                            </p>
                        </div>

                        <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-800/40 rounded-3xl p-5">
                            <p className="text-3xl font-black text-rose-600 dark:text-rose-400">
                                {todayData?.kpis.absentPendingCount ?? 0}
                            </p>
                            <p className="text-xs font-bold text-rose-800/80 dark:text-rose-300/80 mt-1">
                                Absent / Pending
                            </p>
                        </div>
                    </div>

                    {/* Filter & Controls Bar */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
                        <div className="flex flex-1 items-center gap-3 w-full">
                            <div className="relative flex-1 min-w-[220px]">
                                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                                    search
                                </span>
                                <input
                                    type="text"
                                    placeholder="Search staff by name, dept, role..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                />
                            </div>

                            <select
                                value={departmentFilter}
                                onChange={e => setDepartmentFilter(e.target.value)}
                                className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                            >
                                {departments.map(d => (
                                    <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>
                                ))}
                            </select>

                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Present">Present</option>
                                <option value="Late">Late</option>
                                <option value="On Break">On Break</option>
                                <option value="Absent">Absent</option>
                                <option value="On Leave">On Leave</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
                            <button
                                onClick={handleExportTodayCSV}
                                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-2xl transition-all cursor-pointer"
                                title="Export Today's Roster CSV"
                            >
                                <span className="material-symbols-outlined text-[18px]">download</span>
                                <span className="hidden sm:inline">Export CSV</span>
                            </button>

                            <button
                                disabled={refreshing}
                                onClick={() => fetchTodayRoster(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-2xl shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                            >
                                <span className={`material-symbols-outlined text-[18px] ${refreshing ? 'animate-spin text-indigo-600' : 'text-slate-500'}`}>
                                    refresh
                                </span>
                                <span>Refresh Live Status</span>
                            </button>
                        </div>
                    </div>

                    {/* Table View with Session & Active/Idle Details */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                                        <th className="py-3.5 px-5">Staff Member</th>
                                        <th className="py-3.5 px-3">Status</th>
                                        <th className="py-3.5 px-3">First Login</th>
                                        <th className="py-3.5 px-3">Clock In</th>
                                        <th className="py-3.5 px-3">Clock Out</th>
                                        <th className="py-3.5 px-3">Sessions</th>
                                        <th className="py-3.5 px-3">Worked</th>
                                        <th className="py-3.5 px-3">Active Time</th>
                                        <th className="py-3.5 px-3">Idle Time</th>
                                        <th className="py-3.5 px-3">Productivity</th>
                                        <th className="py-3.5 px-5 text-right">Quick Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={11} className="py-12 text-center text-slate-400">
                                                <div className="flex flex-col items-center gap-2">
                                                    <span className="material-symbols-outlined text-3xl animate-spin text-indigo-500">progress_activity</span>
                                                    <p className="font-semibold">Loading live staff roster & sessions...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredRoster.length === 0 ? (
                                        <tr>
                                            <td colSpan={11} className="py-12 text-center text-slate-400">
                                                <p className="font-bold text-sm">No staff records match the criteria</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRoster.map(item => {
                                            const totalActiveMins = item.activeMinutes || 0;
                                            const totalIdleMins = item.idleMinutes || 0;
                                            const activePlusIdle = totalActiveMins + totalIdleMins;
                                            const productivity = activePlusIdle > 0
                                                ? Math.min(100, Math.round((totalActiveMins / activePlusIdle) * 100))
                                                : (item.checkInTime ? 100 : 0);

                                            return (
                                                <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                                                    {/* Staff Info */}
                                                    <td className="py-3.5 px-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`size-9 rounded-2xl ${item.color || 'bg-indigo-600'} text-white font-bold flex items-center justify-center text-xs shadow-sm shrink-0`}>
                                                                {item.initials}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <p className="font-bold text-slate-900 dark:text-white text-xs leading-tight">
                                                                        {item.name}
                                                                    </p>
                                                                    {item.autoClockedIn && (
                                                                        <span className="px-1.5 py-0.2 text-[9px] font-bold bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 rounded border border-cyan-200 dark:border-cyan-800" title="Auto clocked in on system login">
                                                                            Auto
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-[11px] text-slate-400 mt-0.5">
                                                                    {item.department} · {item.role}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Status Badge */}
                                                    <td className="py-3.5 px-3">
                                                        {renderStatusBadge(item.status)}
                                                    </td>

                                                    {/* First Login */}
                                                    <td className="py-3.5 px-3 font-semibold text-slate-700 dark:text-slate-200">
                                                        {formatClockTime(item.firstLoginTime || item.checkInTime)}
                                                    </td>

                                                    {/* Clock In */}
                                                    <td className="py-3.5 px-3 font-semibold text-slate-700 dark:text-slate-200">
                                                        {formatClockTime(item.checkInTime)}
                                                    </td>

                                                    {/* Clock Out */}
                                                    <td className="py-3.5 px-3 font-semibold text-slate-700 dark:text-slate-200">
                                                        {formatClockTime(item.checkOutTime)}
                                                    </td>

                                                    {/* Sessions Count & Inspector Button */}
                                                    <td className="py-3.5 px-3">
                                                        <button
                                                            onClick={() => setInspectingStaffItem(item)}
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                                                            title="Inspect session history & timeline"
                                                        >
                                                            <span className="material-symbols-outlined text-[14px] text-indigo-500">devices</span>
                                                            <span>{item.loginCount || item.sessions?.length || (item.checkInTime ? 1 : 0)} Logins</span>
                                                        </button>
                                                    </td>

                                                    {/* Worked */}
                                                    <td className="py-3.5 px-3 font-bold text-slate-800 dark:text-slate-100">
                                                        {formatMinsToDuration(item.workedMinutes)}
                                                    </td>

                                                    {/* Active Time */}
                                                    <td className="py-3.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400">
                                                        {formatMinsToDuration(item.activeMinutes || item.workedMinutes)}
                                                    </td>

                                                    {/* Idle Time */}
                                                    <td className="py-3.5 px-3 font-semibold text-amber-600 dark:text-amber-400">
                                                        {item.idleMinutes && item.idleMinutes > 0 ? formatMinsToDuration(item.idleMinutes) : '0m'}
                                                    </td>

                                                    {/* Productivity % */}
                                                    <td className="py-3.5 px-3">
                                                        {item.checkInTime ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-12 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full ${productivity >= 85 ? 'bg-emerald-500' : productivity >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                                        style={{ width: `${productivity}%` }}
                                                                    />
                                                                </div>
                                                                <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300">{productivity}%</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400">-</span>
                                                        )}
                                                    </td>

                                                    {/* Quick Actions */}
                                                    <td className="py-3.5 px-5 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {item.status === 'Absent' && (
                                                                <button
                                                                    onClick={() => handleQuickMarkPresent(item.staffId)}
                                                                    className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300/80 transition-all cursor-pointer"
                                                                >
                                                                    Mark Present
                                                                </button>
                                                            )}

                                                            <button
                                                                onClick={() => setInspectingStaffItem(item)}
                                                                className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors"
                                                                title="View Sessions Timeline"
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">history</span>
                                                            </button>

                                                            <button
                                                                onClick={() => handleOpenEdit(item)}
                                                                className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors"
                                                                title="Edit / Adjust Time"
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">edit</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: MY ATTENDANCE */}
            {activeTab === 'my-attendance' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                        <div>
                            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                                {selectedStaffId ? `Attendance Log: ${todayData?.roster?.find(r => r.staffId === selectedStaffId)?.name || 'Staff'}` : 'My Attendance Log & Regularization'}
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                View monthly punch times, break totals, and manage regularizations for missed punches.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {(currentUser?.userType === 'Admin' || hasPermission('attendance', 'manage') || canAccess('attendance', 'approve_regularization')) && todayData?.roster && (
                                <select
                                    value={selectedStaffId || ''}
                                    onChange={e => setSelectedStaffId(e.target.value ? Number(e.target.value) : undefined)}
                                    className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                                >
                                    <option value="">My Own Attendance ({currentUser.name})</option>
                                    {todayData.roster.map(r => (
                                        <option key={r.staffId} value={r.staffId}>{r.name} ({r.department})</option>
                                    ))}
                                </select>
                            )}
                            <input
                                type="month"
                                value={myMonth}
                                onChange={e => setMyMonth(e.target.value)}
                                className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                            />
                            <button
                                onClick={() => setShowRegularizeModal(true)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-md transition-all cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[16px]">edit_calendar</span>
                                <span>Request Regularization</span>
                            </button>
                        </div>
                    </div>

                    {/* Pending Regularizations Review Box (Admins/Managers) */}
                    {(currentUser?.userType === 'Admin' || canAccess('attendance', 'approve_regularization') || hasPermission('attendance', 'manage') || hasPermission('settings', 'manage')) && pendingRegularizations.length > 0 && (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-amber-500 text-[20px]">edit_calendar</span>
                                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                                        Pending Attendance Regularizations ({pendingRegularizations.length})
                                    </h4>
                                </div>
                                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                                    Awaiting Manager Authorization
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {pendingRegularizations.map(reg => (
                                    <div key={reg.id} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-3">
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-xs text-slate-900 dark:text-white">{reg.staff_name}</span>
                                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">
                                                    {reg.date}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                                Requested: <strong className="text-slate-800 dark:text-slate-200">{formatClockTime(reg.requested_check_in)}</strong> → <strong className="text-slate-800 dark:text-slate-200">{formatClockTime(reg.requested_check_out)}</strong>
                                            </p>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-300 italic mt-1 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                                                "{reg.regularization_reason || 'Discrepancy correction requested'}"
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                            <button
                                                onClick={() => handleRejectReg(reg.id)}
                                                className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40 rounded-xl text-xs font-bold transition-all"
                                            >
                                                Reject
                                            </button>
                                            <button
                                                onClick={() => handleApproveReg(reg.id)}
                                                className="px-4 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                                            >
                                                Approve Punch
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
                            <p className="text-xs font-bold text-slate-400 uppercase">Present Days</p>
                            <p className="text-2xl font-black text-emerald-600 mt-1">{myHistory?.summary?.presentDays ?? 0}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
                            <p className="text-xs font-bold text-slate-400 uppercase">Late Days</p>
                            <p className="text-2xl font-black text-amber-600 mt-1">{myHistory?.summary?.lateDays ?? 0}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
                            <p className="text-xs font-bold text-slate-400 uppercase">Total Worked</p>
                            <p className="text-2xl font-black text-indigo-600 mt-1">{myHistory?.summary?.totalWorkedHours ? `${myHistory.summary.totalWorkedHours}h` : '0h'}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
                            <p className="text-xs font-bold text-slate-400 uppercase">Overtime Hours</p>
                            <p className="text-2xl font-black text-sky-600 mt-1">{myHistory?.summary?.totalOvertimeHours ? `${myHistory.summary.totalOvertimeHours}h` : '0h'}</p>
                        </div>
                    </div>

                    {/* My History Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
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
                                        <th className="py-3.5 px-4">Notes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                    {loadingMyHistory ? (
                                        <tr>
                                            <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">Loading history...</td>
                                        </tr>
                                    ) : (!myHistory?.logs || myHistory.logs.length === 0) ? (
                                        <tr>
                                            <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">No attendance records found for this month</td>
                                        </tr>
                                    ) : (
                                        myHistory.logs.map((log: any) => (
                                            <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                                                <td className="py-3 px-5 font-bold text-slate-900 dark:text-white">{log.date}</td>
                                                <td className="py-3 px-4">{renderStatusBadge(log.status)}</td>
                                                <td className="py-3 px-4 font-semibold">{formatClockTime(log.check_in_time)}</td>
                                                <td className="py-3 px-4 font-semibold">{formatClockTime(log.check_out_time)}</td>
                                                <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">{formatMinsToDuration(log.worked_minutes)}</td>
                                                <td className="py-3 px-4 text-slate-500">{formatMinsToDuration(log.total_break_minutes)}</td>
                                                <td className="py-3 px-4">
                                                    {log.regularization_status === 'Requested' ? (
                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200" title={log.regularization_reason}>
                                                            Pending Review
                                                        </span>
                                                    ) : log.regularization_status === 'Approved' ? (
                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                                                            Regularized
                                                        </span>
                                                    ) : log.regularization_status === 'Rejected' ? (
                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200" title={log.regularization_reason}>
                                                            Rejected
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">-</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-slate-400 text-[11px]">{log.notes || '-'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: REPORTS */}
            {activeTab === 'reports' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                        <div>
                            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                                Attendance & Productivity Reports
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Aggregated team attendance, punctuality, and overtime metrics across dates.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <input
                                type="date"
                                value={typeof reportDateRange.startDate === 'function' ? reportDateRange.startDate() : reportDateRange.startDate}
                                onChange={e => setReportDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold"
                            />
                            <span className="text-slate-400 font-bold">to</span>
                            <input
                                type="date"
                                value={typeof reportDateRange.endDate === 'function' ? reportDateRange.endDate() : reportDateRange.endDate}
                                onChange={e => setReportDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold"
                            />
                            <select
                                value={reportDept}
                                onChange={e => setReportDept(e.target.value)}
                                className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold"
                            >
                                {departments.map(d => (
                                    <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Report Summary Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
                            <p className="text-xs font-bold text-slate-400 uppercase">Total Shifts</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{reportData?.summary?.totalRecords ?? 0}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
                            <p className="text-xs font-bold text-slate-400 uppercase">Avg Attendance %</p>
                            <p className="text-2xl font-black text-emerald-600 mt-1">{reportData?.summary?.attendanceRate ? `${reportData.summary.attendanceRate}%` : '100%'}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
                            <p className="text-xs font-bold text-slate-400 uppercase">Late Percentage</p>
                            <p className="text-2xl font-black text-amber-600 mt-1">{reportData?.summary?.latePercentage ? `${reportData.summary.latePercentage}%` : '0%'}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
                            <p className="text-xs font-bold text-slate-400 uppercase">Total Overtime Hours</p>
                            <p className="text-2xl font-black text-indigo-600 mt-1">{reportData?.summary?.totalOvertimeHours ? `${reportData.summary.totalOvertimeHours}h` : '0h'}</p>
                        </div>
                    </div>

                    {/* Report Records Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                                        <th className="py-3.5 px-5">Staff</th>
                                        <th className="py-3.5 px-4">Department</th>
                                        <th className="py-3.5 px-4">Present</th>
                                        <th className="py-3.5 px-4">Late</th>
                                        <th className="py-3.5 px-4">Half-Days</th>
                                        <th className="py-3.5 px-4">Total Worked</th>
                                        <th className="py-3.5 px-4">Overtime</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                    {loadingReports ? (
                                        <tr>
                                            <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">Generating report...</td>
                                        </tr>
                                    ) : (!reportData?.staffSummaries || reportData.staffSummaries.length === 0) ? (
                                        <tr>
                                            <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">No report data for this period</td>
                                        </tr>
                                    ) : (
                                        reportData.staffSummaries.map((st: any) => (
                                            <tr key={st.staffId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                                                <td className="py-3 px-5 font-bold text-slate-900 dark:text-white">{st.name}</td>
                                                <td className="py-3 px-4 text-slate-500">{st.department}</td>
                                                <td className="py-3 px-4 font-bold text-emerald-600">{st.presentCount}</td>
                                                <td className="py-3 px-4 font-bold text-amber-600">{st.lateCount}</td>
                                                <td className="py-3 px-4 text-slate-600">{st.halfDayCount || 0}</td>
                                                <td className="py-3 px-4 font-bold">{formatMinsToDuration(st.totalWorkedMinutes)}</td>
                                                <td className="py-3 px-4 text-indigo-600 font-semibold">{formatMinsToDuration(st.totalOvertimeMinutes)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: LEAVES */}
            {activeTab === 'leaves' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                        <div>
                            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                                Staff Leave Management & Approvals
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Review pending requests, approve absences, or apply for personal time off.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowApplyLeaveModal(true)}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl shadow-md transition-all cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[18px]">add</span>
                            <span>Apply for Leave</span>
                        </button>
                    </div>

                    {/* Leaves Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                                        <th className="py-3.5 px-5">Staff Member</th>
                                        <th className="py-3.5 px-4">Leave Type</th>
                                        <th className="py-3.5 px-4">Duration</th>
                                        <th className="py-3.5 px-4">Days</th>
                                        <th className="py-3.5 px-4">Reason</th>
                                        <th className="py-3.5 px-4">Status</th>
                                        <th className="py-3.5 px-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                    {loadingLeaves ? (
                                        <tr>
                                            <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">Loading leave requests...</td>
                                        </tr>
                                    ) : leavesList.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">No leave applications found</td>
                                        </tr>
                                    ) : (
                                        leavesList.map(l => (
                                            <tr key={l.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                                                <td className="py-3 px-5 font-bold text-slate-900 dark:text-white">{l.staffName || `Staff #${l.staffId}`}</td>
                                                <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">{l.leaveType}</td>
                                                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{l.startDate} → {l.endDate}</td>
                                                <td className="py-3 px-4 font-bold">{l.daysCount} d</td>
                                                <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">{l.reason}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                                                        l.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' :
                                                        l.status === 'Rejected' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' :
                                                        'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                                    }`}>
                                                        {l.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-5 text-right">
                                                    {l.status === 'Pending' && (canAccess('attendance', 'approve_leaves') || hasPermission('attendance', 'manage') || hasPermission('settings', 'manage')) && (
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => handleUpdateLeaveStatus(l.id, 'Approved')}
                                                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => setRejectingLeaveId(l.id)}
                                                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold"
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 5: SETTINGS */}
            {activeTab === 'settings' && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
                    <div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                            Shift, Automation & Attendance Rules
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Configure standard working hours, automated clock-in, inactivity thresholds, and shift schedules.
                        </p>
                    </div>

                    <div className="space-y-6">
                        {/* Automation Section */}
                        <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 space-y-4">
                            <h4 className="text-xs font-extrabold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
                                Real-time Automation & Inactivity Tracking
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-slate-800">
                                    <div>
                                        <p className="text-xs font-bold text-slate-800 dark:text-white">Auto Clock-in on Daily Login</p>
                                        <p className="text-[11px] text-slate-400">Automatically record first activity as clock-in timestamp</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={!!settingsForm.auto_clockin_on_login}
                                        onChange={e => setSettingsForm(prev => ({ ...prev, auto_clockin_on_login: e.target.checked ? 1 : 0 }))}
                                        className="size-4 accent-indigo-600 rounded cursor-pointer"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                                        Inactivity Idle Threshold (Seconds)
                                    </label>
                                    <select
                                        value={settingsForm.idle_threshold_seconds || 180}
                                        onChange={e => setSettingsForm(prev => ({ ...prev, idle_threshold_seconds: Number(e.target.value) }))}
                                        className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer"
                                    >
                                        <option value="60">1 Minute (60s)</option>
                                        <option value="120">2 Minutes (120s)</option>
                                        <option value="180">3 Minutes (180s - Recommended)</option>
                                        <option value="300">5 Minutes (300s)</option>
                                        <option value="600">10 Minutes (600s)</option>
                                    </select>
                                    <p className="text-[11px] text-slate-400 mt-1">Transitions session from Active to Idle when no mouse/keyboard activity detected.</p>
                                </div>
                            </div>
                        </div>

                        {/* Shift Times */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                                    Default Shift Start Time
                                </label>
                                <input
                                    type="time"
                                    value={settingsForm.shift_start || '09:30'}
                                    onChange={e => setSettingsForm(prev => ({ ...prev, shift_start: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                                    Default Shift End Time
                                </label>
                                <input
                                    type="time"
                                    value={settingsForm.shift_end || '18:30'}
                                    onChange={e => setSettingsForm(prev => ({ ...prev, shift_end: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100"
                                />
                            </div>
                        </div>

                        {/* Grace Period & Half Day */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                                    Grace Period (Minutes)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="60"
                                    value={settingsForm.grace_period_mins ?? 15}
                                    onChange={e => setSettingsForm(prev => ({ ...prev, grace_period_mins: Number(e.target.value) }))}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">Punches after 09:45 AM will automatically be flagged as Late.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                                    Half-Day Hours Threshold
                                </label>
                                <input
                                    type="number"
                                    step="0.5"
                                    min="1"
                                    max="8"
                                    value={settingsForm.half_day_hours ?? 4.5}
                                    onChange={e => setSettingsForm(prev => ({ ...prev, half_day_hours: Number(e.target.value) }))}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">Worked hours below 4.5h will be marked as Half Day.</p>
                            </div>
                        </div>

                        {/* Working Days */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
                                Standard Working Days
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                                    const activeDays = (settingsForm.work_days || '').split(',');
                                    const isChecked = activeDays.includes(day);
                                    return (
                                        <button
                                            type="button"
                                            key={day}
                                            onClick={() => {
                                                const newDays = isChecked
                                                    ? activeDays.filter(d => d !== day)
                                                    : [...activeDays, day];
                                                setSettingsForm(prev => ({ ...prev, work_days: newDays.join(',') }));
                                            }}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                isChecked
                                                    ? 'bg-indigo-600 text-white shadow-md'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                            }`}
                                        >
                                            {day}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <button
                                disabled={isSavingSettings}
                                onClick={handleSaveSettings}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                            >
                                {isSavingSettings ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: STAFF SESSIONS TIMELINE INSPECTOR */}
            {inspectingStaffItem && (
                <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="flex items-center gap-3.5">
                                <div className={`size-12 rounded-2xl ${inspectingStaffItem.color || 'bg-indigo-600'} text-white font-bold flex items-center justify-center text-sm shadow-md shrink-0`}>
                                    {inspectingStaffItem.initials}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                                            {inspectingStaffItem.name}
                                        </h3>
                                        {renderStatusBadge(inspectingStaffItem.status)}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                        <span>{inspectingStaffItem.department} · {inspectingStaffItem.role} · {todayData?.date}</span>
                                        {inspectingStaffItem.firstLoginTime && (
                                            <span className="text-slate-600 dark:text-slate-300 font-semibold">
                                                (1st Login: {formatClockTime(inspectingStaffItem.firstLoginTime)})
                                            </span>
                                        )}
                                        {inspectingStaffItem.checkInTime && (
                                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                                · In: {formatClockTime(inspectingStaffItem.checkInTime)}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setInspectingStaffItem(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <span className="material-symbols-outlined text-[24px]">close</span>
                            </button>
                        </div>

                        {/* Summary Metrics Bar */}
                        <div className="grid grid-cols-4 gap-2 text-center text-xs">
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-800/40">
                                <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                                    {formatMinsToDuration(inspectingStaffItem.workedMinutes)}
                                </p>
                                <p className="text-[10px] font-bold text-emerald-600/80 dark:text-emerald-400 uppercase mt-0.5">Worked</p>
                            </div>
                            <div className="p-3 bg-cyan-50 dark:bg-cyan-950/30 rounded-2xl border border-cyan-100 dark:border-cyan-800/40">
                                <p className="text-sm font-black text-cyan-700 dark:text-cyan-300">
                                    {formatMinsToDuration(inspectingStaffItem.activeMinutes || inspectingStaffItem.workedMinutes)}
                                </p>
                                <p className="text-[10px] font-bold text-cyan-600/80 dark:text-cyan-400 uppercase mt-0.5">Active</p>
                            </div>
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-800/40">
                                <p className="text-sm font-black text-amber-700 dark:text-amber-300">
                                    {formatMinsToDuration(inspectingStaffItem.idleMinutes || 0)}
                                </p>
                                <p className="text-[10px] font-bold text-amber-600/80 dark:text-amber-400 uppercase mt-0.5">Idle</p>
                            </div>
                            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                                    {inspectingStaffItem.loginCount || inspectingStaffItem.sessions?.length || 1}
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Logins</p>
                            </div>
                        </div>

                        {/* Sessions Timeline List */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                                Today's Login Sessions ({inspectingStaffItem.sessions?.length || 0})
                            </h4>

                            {(!inspectingStaffItem.sessions || inspectingStaffItem.sessions.length === 0) ? (
                                <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-slate-400 text-xs font-semibold">
                                    No discrete session breakdown recorded yet for today.
                                </div>
                            ) : (
                                inspectingStaffItem.sessions.map((ses, idx) => {
                                    const sesActive = ses.activeMinutes || 0;
                                    const sesIdle = ses.idleMinutes || 0;
                                    const sesTotal = sesActive + sesIdle;
                                    const activePct = sesTotal > 0 ? Math.round((sesActive / sesTotal) * 100) : 100;
                                    const idlePct = sesTotal > 0 ? (100 - activePct) : 0;
                                    const activeDisplay = sesTotal === 0 ? '< 1m' : `${sesActive}m`;

                                    return (
                                        <div key={ses.id || idx} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className={`size-2 rounded-full ${!ses.sessionEnd ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                                    <span className="font-black text-slate-900 dark:text-white">
                                                        Session #{ses.sessionNumber || idx + 1}
                                                    </span>
                                                    <span className="text-[11px] font-semibold text-slate-500">
                                                        ({formatClockTime(ses.sessionStart)} → {ses.sessionEnd ? formatClockTime(ses.sessionEnd) : 'Active'})
                                                    </span>
                                                </div>
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                                                    ses.sessionEnd 
                                                        ? (ses.logoutType === 'user_logout' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300')
                                                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 animate-pulse'
                                                }`}>
                                                    {ses.sessionEnd ? (ses.logoutType === 'user_logout' ? 'User Logout' : ses.logoutType === 'manual_punch_out' ? 'Clocked Out' : (ses.logoutType || 'Closed')) : 'Active Now'}
                                                </span>
                                            </div>

                                            {/* Active vs Idle Progress Bar */}
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-[11px] font-bold">
                                                    <span className="text-emerald-600 dark:text-emerald-400">Active: {activeDisplay} ({activePct}%)</span>
                                                    <span className="text-amber-600 dark:text-amber-400">Idle: {sesIdle}m ({idlePct}%)</span>
                                                </div>
                                                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700/60 rounded-full overflow-hidden flex">
                                                    <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${activePct}%` }} />
                                                    <div className="h-full bg-amber-400 transition-all duration-300" style={{ width: `${idlePct}%` }} />
                                                </div>
                                            </div>

                                            {/* Metadata details */}
                                            <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-400">
                                                {ses.ipAddress && <span>IP: {ses.ipAddress}</span>}
                                                {ses.loginType && <span>Type: {ses.loginType}</span>}
                                                {ses.deviceInfo && <span className="truncate max-w-[280px]">Device: {ses.deviceInfo}</span>}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setInspectingStaffItem(null)}
                                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl cursor-pointer"
                            >
                                Close Inspector
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 1: EDIT / ADJUST ATTENDANCE */}
            {editingItem && (
                <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                                Adjust Attendance: {editingItem.name}
                            </h3>
                            <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                                <select
                                    value={editForm.status}
                                    onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                >
                                    <option value="Present">Present</option>
                                    <option value="Late">Late</option>
                                    <option value="On Break">On Break</option>
                                    <option value="Absent">Absent</option>
                                    <option value="On Leave">On Leave</option>
                                    <option value="Half Day">Half Day</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Clock In Time</label>
                                <input
                                    type="datetime-local"
                                    value={editForm.checkInTime}
                                    onChange={e => setEditForm(prev => ({ ...prev, checkInTime: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Clock Out Time</label>
                                <input
                                    type="datetime-local"
                                    value={editForm.checkOutTime}
                                    onChange={e => setEditForm(prev => ({ ...prev, checkOutTime: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Adjustment Notes / Remarks</label>
                                <textarea
                                    rows={2}
                                    value={editForm.notes}
                                    onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Reason for manual adjustment..."
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                onClick={() => setEditingItem(null)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={isSavingEdit}
                                onClick={handleSaveEdit}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md"
                            >
                                {isSavingEdit ? 'Saving...' : 'Save Adjustments'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: APPLY LEAVE */}
            {showApplyLeaveModal && (
                <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
                    <form onSubmit={handleApplyLeave} className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Apply for Leave</h3>
                            <button type="button" onClick={() => setShowApplyLeaveModal(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Leave Type</label>
                                <select
                                    value={leaveForm.leaveType}
                                    onChange={e => setLeaveForm(prev => ({ ...prev, leaveType: e.target.value as any }))}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                >
                                    <option value="Casual">Casual Leave</option>
                                    <option value="Sick">Sick Leave</option>
                                    <option value="Paid">Paid Vacation</option>
                                    <option value="Half Day">Half Day Leave</option>
                                    <option value="Unpaid">Unpaid Leave</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={leaveForm.startDate}
                                        onChange={e => setLeaveForm(prev => ({ ...prev, startDate: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={leaveForm.endDate}
                                        onChange={e => setLeaveForm(prev => ({ ...prev, endDate: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Reason for Leave</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={leaveForm.reason}
                                    onChange={e => setLeaveForm(prev => ({ ...prev, reason: e.target.value }))}
                                    placeholder="Please provide details for the leave application..."
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowApplyLeaveModal(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md"
                            >
                                Submit Application
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL 3: REQUEST REGULARIZATION */}
            {showRegularizeModal && (
                <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
                    <form onSubmit={handleRegularizeSubmit} className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Request Regularization</h3>
                            <button type="button" onClick={() => setShowRegularizeModal(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Date to Correct</label>
                                <input
                                    type="date"
                                    required
                                    value={regForm.date}
                                    onChange={e => setRegForm(prev => ({ ...prev, date: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Actual Clock In</label>
                                    <input
                                        type="time"
                                        required
                                        value={regForm.checkIn}
                                        onChange={e => setRegForm(prev => ({ ...prev, checkIn: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Actual Clock Out</label>
                                    <input
                                        type="time"
                                        required
                                        value={regForm.checkOut}
                                        onChange={e => setRegForm(prev => ({ ...prev, checkOut: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Reason / Explanation</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={regForm.reason}
                                    onChange={e => setRegForm(prev => ({ ...prev, reason: e.target.value }))}
                                    placeholder="Explain why punch was missed or discrepancy occurred..."
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowRegularizeModal(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md"
                            >
                                Submit Request
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL 4: REJECT LEAVE REASON */}
            {rejectingLeaveId && (
                <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Reject Leave Request</h3>
                        <p className="text-xs text-slate-400">Please provide a reason for rejecting this leave application.</p>
                        <textarea
                            rows={3}
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            placeholder="Rejection reason..."
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                        />
                        <div className="flex justify-end gap-2 pt-1">
                            <button
                                onClick={() => setRejectingLeaveId(null)}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleUpdateLeaveStatus(rejectingLeaveId, 'Rejected', rejectReason)}
                                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow"
                            >
                                Confirm Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default Attendance;
