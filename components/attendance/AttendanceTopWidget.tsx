import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../../src/lib/api';
import { useAuth } from '../../context/AuthContext';
import { TodayAttendanceResponse, TodayRosterItem, AttendanceSession } from '../../types';
import { activityTracker, ActivityState } from '../../src/lib/activityTracker';

export const AttendanceTopWidget: React.FC = () => {
    const { currentUser, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [attendanceData, setAttendanceData] = useState<TodayAttendanceResponse | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showSessionsList, setShowSessionsList] = useState(false);
    const [activityState, setActivityState] = useState<ActivityState>(() => activityTracker.getState());
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Live clock interval (updates every 1s)
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Initialize Activity Tracker
    useEffect(() => {
        if (!isAuthenticated || !currentUser) return;
        activityTracker.init(currentUser.id, attendanceData?.settings?.idle_threshold_seconds || 180);
        const unsubscribe = activityTracker.subscribe(state => {
            setActivityState({ ...state });
        });
        return () => {
            unsubscribe();
        };
    }, [isAuthenticated, currentUser?.id, attendanceData?.settings?.idle_threshold_seconds]);

    // Fetch live attendance data
    const fetchAttendance = async () => {
        if (!isAuthenticated) return;
        try {
            const data = await api.getTodayAttendance();
            setAttendanceData(data);
        } catch (err: any) {
            console.debug('[AttendanceWidget] fetch skipped/error:', err.message);
        }
    };

    useEffect(() => {
        fetchAttendance();
        const poll = setInterval(fetchAttendance, 45000); // refresh every 45s
        return () => clearInterval(poll);
    }, [isAuthenticated]);

    // Cross-component synchronizer: listen for attendance updates from any page
    useEffect(() => {
        const handleSync = () => {
            fetchAttendance();
        };
        window.addEventListener('shrawello:attendance-updated', handleSync);
        return () => window.removeEventListener('shrawello:attendance-updated', handleSync);
    }, []);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const currentAttendance: TodayRosterItem | null = attendanceData?.currentAttendance || null;
    const settings = attendanceData?.settings;
    const shiftText = `Shift: ${settings?.shift_start || '09:30'} - ${settings?.shift_end || '18:30'}`;

    // Format time helper
    const formatTimeStr = (isoString?: string | null) => {
        if (!isoString) return '--:--';
        try {
            const d = new Date(isoString);
            if (isNaN(d.getTime())) return '--:--';
            return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
        } catch {
            return '--:--';
        }
    };

    const formatMinsStr = (mins: number) => {
        if (!mins || mins <= 0) return '0m';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    // Calculate dynamic worked time: sum of all completed sessions today + live active session duration - breaks
    const workedDurationStr = useMemo(() => {
        if (!currentAttendance?.checkInTime && (!currentAttendance?.sessions || currentAttendance.sessions.length === 0)) return '0m';
        
        const sessions = currentAttendance?.sessions || [];
        let totalMins = 0;

        if (sessions.length > 0) {
            for (const s of sessions) {
                const sStart = new Date(s.sessionStart);
                if (s.sessionEnd) {
                    const sEnd = new Date(s.sessionEnd);
                    totalMins += Math.max(0, Math.floor((sEnd.getTime() - sStart.getTime()) / 60000));
                } else {
                    totalMins += Math.max(0, Math.floor((currentTime.getTime() - sStart.getTime()) / 60000));
                }
            }
        } else if (currentAttendance?.checkInTime) {
            if (!currentAttendance.checkOutTime) {
                const checkIn = new Date(currentAttendance.checkInTime);
                totalMins = Math.max(0, Math.floor((currentTime.getTime() - checkIn.getTime()) / 60000));
            } else {
                totalMins = currentAttendance.workedMinutes || 0;
            }
        }

        const netWorkedMins = Math.max(0, totalMins - (currentAttendance?.totalBreakMinutes || 0));
        return formatMinsStr(netWorkedMins);
    }, [currentAttendance, currentTime]);

    // Active time string
    const activeDurationStr = useMemo(() => {
        const liveSecs = activityState.activeSeconds || 0;
        const totalMins = Math.max(currentAttendance?.activeMinutes || 0, Math.floor(liveSecs / 60));
        return formatMinsStr(totalMins);
    }, [currentAttendance?.activeMinutes, activityState.activeSeconds]);

    // Idle time string
    const idleDurationStr = useMemo(() => {
        const liveSecs = activityState.idleSeconds || 0;
        const totalMins = Math.max(currentAttendance?.idleMinutes || 0, Math.floor(liveSecs / 60));
        return formatMinsStr(totalMins);
    }, [currentAttendance?.idleMinutes, activityState.idleSeconds]);

    // System time string
    const systemDurationStr = useMemo(() => {
        const liveSecs = activityState.systemSeconds || 0;
        const totalMins = Math.max(currentAttendance?.systemMinutes || currentAttendance?.systemActiveMinutes || 0, Math.floor(liveSecs / 60));
        return formatMinsStr(totalMins);
    }, [currentAttendance?.systemMinutes, currentAttendance?.systemActiveMinutes, activityState.systemSeconds]);

    // Status pill rendering details
    const pillDetails = useMemo(() => {
        const isClockedOut = !currentAttendance || !currentAttendance.checkInTime || currentAttendance.status === 'Absent' || !!currentAttendance.checkOutTime;

        if (isClockedOut) {
            return {
                label: 'Clocked Out',
                dotColor: 'bg-red-500',
                bgColor: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200/60 dark:border-red-900/40',
                isClockedIn: false,
                isOnBreak: false,
                isIdle: false
            };
        }
        if (currentAttendance.status === 'On Break') {
            return {
                label: 'On Break',
                dotColor: 'bg-amber-500 animate-pulse',
                bgColor: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/40',
                isClockedIn: true,
                isOnBreak: true,
                isIdle: false
            };
        }
        if (currentAttendance.status === 'On Leave') {
            return {
                label: 'On Leave',
                dotColor: 'bg-blue-500',
                bgColor: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-900/40',
                isClockedIn: false,
                isOnBreak: false,
                isIdle: false
            };
        }

        // Check live active vs idle
        if (!activityState.isActive) {
            const idleSecs = Math.floor((Date.now() - activityState.lastActiveTime.getTime()) / 1000);
            const idleMins = Math.floor(idleSecs / 60);
            return {
                label: idleMins > 0 ? `Idle ${idleMins}m` : 'Idle',
                dotColor: 'bg-amber-400 animate-ping',
                bgColor: 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/40',
                isClockedIn: true,
                isOnBreak: false,
                isIdle: true
            };
        }

        // Punctuality verification (Check if punch was after shift start + grace period)
        let isLatePunch = false;
        if (currentAttendance.checkInTime && settings?.shift_start) {
            try {
                const checkIn = new Date(currentAttendance.checkInTime);
                const [sHour, sMin] = (settings.shift_start || '09:30').split(':').map(Number);
                const grace = Number(settings.grace_period_mins || 15);
                const cutoffMinutes = sHour * 60 + sMin + grace;
                
                const checkInMinutes = checkIn.getHours() * 60 + checkIn.getMinutes();
                if (checkInMinutes > cutoffMinutes) {
                    isLatePunch = true;
                }
            } catch {
                isLatePunch = !!currentAttendance.isLate || currentAttendance.status === 'Late';
            }
        } else {
            isLatePunch = !!currentAttendance.isLate || currentAttendance.status === 'Late';
        }

        if (isLatePunch) {
            return {
                label: `Late ${formatTimeStr(currentAttendance.checkInTime)}`,
                dotColor: 'bg-amber-500',
                bgColor: 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/40',
                isClockedIn: true,
                isOnBreak: false,
                isIdle: false
            };
        }
        return {
            label: `In ${formatTimeStr(currentAttendance.checkInTime)}`,
            dotColor: 'bg-emerald-500',
            bgColor: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/40',
            isClockedIn: true,
            isOnBreak: false,
            isIdle: false
        };
    }, [currentAttendance, activityState.isActive, activityState.lastActiveTime, settings?.shift_start, settings?.grace_period_mins]);

    // Action Handlers
    const handleClockIn = async () => {
        try {
            setLoading(true);
            const staffId = currentAttendance?.staffId || currentUser?.id;
            const res = await api.clockIn({ staffId });
            toast.success(res.message || 'Clocked in successfully!');
            await fetchAttendance();
            if (staffId) activityTracker.startSession(staffId, 'manual_punch');
            window.dispatchEvent(new CustomEvent('shrawello:attendance-updated'));
        } catch (err: any) {
            toast.error(err.message || 'Failed to clock in');
        } finally {
            setLoading(false);
        }
    };

    const handleClockOut = async () => {
        try {
            setLoading(true);
            const staffId = currentAttendance?.staffId || currentUser?.id;
            const res = await api.clockOut({ staffId });
            toast.success(res.message || 'Clocked out successfully!');
            await activityTracker.endSession('manual_punch_out', true);
            await fetchAttendance();
            window.dispatchEvent(new CustomEvent('shrawello:attendance-updated'));
        } catch (err: any) {
            toast.error(err.message || 'Failed to clock out');
        } finally {
            setLoading(false);
        }
    };

    const handleStartBreak = async () => {
        try {
            setLoading(true);
            const staffId = currentAttendance?.staffId || currentUser?.id;
            const res = await api.startBreak({ staffId });
            toast.success(res.message || 'Break started');
            await fetchAttendance();
            window.dispatchEvent(new CustomEvent('shrawello:attendance-updated'));
        } catch (err: any) {
            toast.error(err.message || 'Failed to start break');
        } finally {
            setLoading(false);
        }
    };

    const handleEndBreak = async () => {
        try {
            setLoading(true);
            const staffId = currentAttendance?.staffId || currentUser?.id;
            const res = await api.endBreak({ staffId });
            toast.success(res.message || 'Resumed work');
            await fetchAttendance();
            window.dispatchEvent(new CustomEvent('shrawello:attendance-updated'));
        } catch (err: any) {
            toast.error(err.message || 'Failed to end break');
        } finally {
            setLoading(false);
        }
    };

    const todayDateFormatted = currentTime.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
    const liveTimeFormatted = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
    const sessionsList: AttendanceSession[] = currentAttendance?.sessions || [];

    return (
        <div ref={dropdownRef} className="relative shrink-0">
            {/* Topbar Attendance Pill Button */}
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className={`flex items-center gap-2 h-9 px-3 rounded-full text-xs font-semibold border transition-all duration-200 shadow-sm hover:scale-[1.02] cursor-pointer ${pillDetails.bgColor}`}
                title="Click to manage attendance & sessions"
            >
                <span className={`size-2 rounded-full ${pillDetails.dotColor}`} />
                <span className="whitespace-nowrap tracking-tight">{pillDetails.label}</span>
            </button>

            {/* Floating Dropdown Card Popover */}
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[150]" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 sm:right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-slate-900/25 border border-slate-200/90 dark:border-slate-800 z-[160] animate-in fade-in zoom-in-95 overflow-hidden">
                        
                        {/* Header Banner - Emerald/Teal Gradient with Live Session Status */}
                        <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="size-9 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shrink-0">
                                        <span className="material-symbols-outlined text-[22px]">schedule</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <h4 className="font-extrabold text-sm leading-tight tracking-tight">Attendance</h4>
                                            {currentAttendance?.autoClockedIn && (
                                                <span className="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-400/30 text-emerald-200 rounded border border-emerald-300/30">
                                                    Auto
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-emerald-100 font-medium">{todayDateFormatted}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-base font-black tracking-tight">{liveTimeFormatted}</span>
                                    <p className="text-[10px] text-emerald-100/90 font-medium mt-0.5">{shiftText}</p>
                                </div>
                            </div>

                            {/* Current Session Banner */}
                            {pillDetails.isClockedIn && (
                                <div className="mt-3 pt-2.5 border-t border-white/15 flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`size-2 rounded-full ${activityState.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'}`} />
                                        <span className="font-bold">
                                            Session #{activityState.sessionNumber || currentAttendance?.loginCount || 1}
                                        </span>
                                        <span className="text-emerald-200/80 text-[11px]">
                                            ({activityState.isActive ? 'Active' : 'Idle'})
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setShowSessionsList(!showSessionsList)}
                                        className="text-[11px] font-semibold text-emerald-200 hover:text-white underline underline-offset-2 transition-colors cursor-pointer"
                                    >
                                        {showSessionsList ? 'Hide Sessions' : `${sessionsList.length || 1} Sessions`}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Stats Metric Block (4 Columns Grid) */}
                        <div className="p-4 space-y-3.5">
                            {/* Punch Timestamps Bar */}
                            <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">1st Login:</span>
                                    <span className="font-extrabold text-slate-900 dark:text-white">
                                        {formatTimeStr(currentAttendance?.firstLoginTime || currentAttendance?.checkInTime)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">In:</span>
                                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                                        {formatTimeStr(sessionsList.find(s => !s.sessionEnd)?.sessionStart || currentAttendance?.checkInTime)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Out:</span>
                                    <span className="font-extrabold text-rose-600 dark:text-rose-400">
                                        {currentAttendance?.checkOutTime ? formatTimeStr(currentAttendance.checkOutTime) : (pillDetails.isClockedIn ? 'Active' : '--:--')}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-2 text-center">
                                <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-2 rounded-2xl border border-emerald-100/80 dark:border-emerald-800/40">
                                    <p className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                                        {workedDurationStr}
                                    </p>
                                    <p className="text-[9px] font-bold text-emerald-600/80 dark:text-emerald-400 mt-0.5 uppercase tracking-wider">Worked</p>
                                </div>
                                <div className="bg-cyan-50/70 dark:bg-cyan-950/30 p-2 rounded-2xl border border-cyan-100/80 dark:border-cyan-800/40">
                                    <p className="text-xs font-black text-cyan-700 dark:text-cyan-300">
                                        {activeDurationStr}
                                    </p>
                                    <p className="text-[9px] font-bold text-cyan-600/80 dark:text-cyan-400 mt-0.5 uppercase tracking-wider">Active</p>
                                </div>
                                <div className="bg-amber-50/70 dark:bg-amber-950/30 p-2 rounded-2xl border border-amber-100/80 dark:border-amber-800/40">
                                    <p className="text-xs font-black text-amber-700 dark:text-amber-300">
                                        {idleDurationStr}
                                    </p>
                                    <p className="text-[9px] font-bold text-amber-600/80 dark:text-amber-400 mt-0.5 uppercase tracking-wider">Idle</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/70 p-2 rounded-2xl border border-slate-100 dark:border-slate-700/60">
                                    <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                                        {systemDurationStr}
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-400 dark:text-slate-400 mt-0.5 uppercase tracking-wider">System</p>
                                </div>
                            </div>

                            {/* Expandable Session Log List */}
                            {showSessionsList && sessionsList.length > 0 && (
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 max-h-48 overflow-y-auto">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                        <span>TODAY'S SESSIONS ({sessionsList.length})</span>
                                        <span>ACTIVE / IDLE</span>
                                    </div>
                                    {sessionsList.map((ses, sIdx) => (
                                        <div key={ses.id || sIdx} className="flex items-center justify-between text-xs py-1.5 px-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-2">
                                                <span className="size-2 rounded-full bg-emerald-500" />
                                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                                    Session #{ses.sessionNumber || sIdx + 1}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    {formatTimeStr(ses.sessionStart)} - {ses.sessionEnd ? formatTimeStr(ses.sessionEnd) : 'Active'}
                                                </span>
                                            </div>
                                            <div className="text-right text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                                <span className="text-emerald-600 font-bold">{ses.activeMinutes}m</span> / <span className="text-amber-600">{ses.idleMinutes}m</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="space-y-2">
                                {pillDetails.isClockedIn ? (
                                    <>
                                        {/* Start / Resume Break Button */}
                                        {pillDetails.isOnBreak ? (
                                            <button
                                                disabled={loading}
                                                onClick={handleEndBreak}
                                                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-2xl shadow-md transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                                                <span>Resume Work</span>
                                            </button>
                                        ) : (
                                            <button
                                                disabled={loading}
                                                onClick={handleStartBreak}
                                                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60 text-xs font-bold rounded-2xl transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                                            >
                                                <span className="material-symbols-outlined text-[18px] text-amber-600">coffee</span>
                                                <span>Start Break</span>
                                            </button>
                                        )}

                                        {/* Clock Out Button */}
                                        <button
                                            disabled={loading}
                                            onClick={handleClockOut}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-2xl shadow-md transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">logout</span>
                                            <span>Clock Out</span>
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        disabled={loading}
                                        onClick={handleClockIn}
                                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl shadow-lg shadow-emerald-600/20 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">login</span>
                                        <span>Clock In for Today</span>
                                    </button>
                                )}
                            </div>

                            {/* Open Full Attendance Roster Link */}
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        navigate('/admin/attendance');
                                    }}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-1 cursor-pointer"
                                >
                                    <span>Open Full Attendance Roster</span>
                                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
