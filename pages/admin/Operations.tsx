import React, { useState, useMemo, useCallback } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    Map, Calendar, Users, Briefcase, CheckCircle,
    XCircle, AlertTriangle, LogOut, Car, RefreshCw
} from 'lucide-react';
import { Booking, SupplierBooking } from '../../types';
import { api } from '../../src/lib/api';
import { toast } from 'sonner';

// ─── Palette for staff avatars – avoids Tailwind purge of dynamic class names ──
const AVATAR_PALETTE: Record<string, string> = {
    blue: '#3b82f6', red: '#ef4444', green: '#22c55e', yellow: '#eab308',
    purple: '#a855f7', pink: '#ec4899', indigo: '#6366f1', teal: '#14b8a6',
    orange: '#f97316', cyan: '#06b6d4', rose: '#f43f5e', emerald: '#10b981',
    violet: '#8b5cf6', sky: '#0ea5e9', lime: '#84cc16', amber: '#f59e0b',
};
const getAvatarBg = (color: string) => AVATAR_PALETTE[color] ?? '#64748b';

// ─── Timezone-safe helpers ───────────────────────────────────────────────────
/** Parse a YYYY-MM-DD string into a local midnight Date without UTC shifting */
const parseLocalDate = (dateStr: string): Date | null => {
    const parts = dateStr ? dateStr.split('-') : [];
    if (parts.length < 3) return null;
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    d.setHours(0, 0, 0, 0);
    return d;
};

/** Format a YYYY-MM-DD string for display without UTC shifting */
const formatLocalDate = (dateStr: string): string => {
    const d = parseLocalDate(dateStr);
    return d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : dateStr;
};

/** Day-of-tour counter (1-based, clamped to duration) */
const getDayOfTour = (dateStr: string, duration: number): number => {
    const start = parseLocalDate(dateStr);
    if (!start) return 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1;
    return Math.min(Math.max(diff, 1), duration);
};

// ─── Pax count extraction ─────────────────────────────────────────────────────
const extractPaxCount = (guestsStr?: string): number => {
    if (!guestsStr) return 1;
    const str = guestsStr.toLowerCase();
    const match = str.match(/(\d+)\s*(?:adult|pax|guest|person|member)/);
    if (match) return parseInt(match[1]);
    const clean = str.replace(/\d+\s*(?:yr|year|room|bed)/g, '');
    const nums = clean.match(/\d+/g);
    if (nums && nums.length > 0) return nums.reduce((a, c) => a + parseInt(c), 0);
    const fallback = str.match(/\d+/g);
    return fallback ? parseInt(fallback[0]) : 1;
};

export const Operations: React.FC = () => {
    const { bookings, packages, vendors, addSupplierBooking, updateSupplierBooking, updateBooking, refreshData } = useData() as any;
    const { staff, updateStaff, currentUser } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'Tours' | 'Attendance'>('Tours');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // ─── Refresh handler (#9) ────────────────────────────────────────────────
    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await refreshData?.();
            toast.success('Data refreshed');
        } catch {
            toast.error('Refresh failed');
        } finally {
            setIsRefreshing(false);
        }
    }, [refreshData]);

    // ─── Tour Operations — only Tour-type bookings (#6) ──────────────────────
    const tourStats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const in7Days = new Date(today.getTime() + 7 * 86_400_000);

        const live: (Booking & { paxCount: number; duration: number; liveEndDate: Date })[] = [];
        const upcoming: (Booking & { paxCount: number })[] = [];
        const completed: Booking[] = [];

        bookings.forEach((b: Booking) => {
            // #6 — only process Tour-type bookings
            if (b.type && b.type !== 'Tour') return;

            const start = parseLocalDate(b.date);
            if (!start) return;

            // Use explicit DB field, fall back to package lookup
            let duration = b.durationDays ?? null;
            if (!duration) {
                const pkg = packages.find((p: any) => p.id === b.packageId) || packages.find((p: any) => p.title === b.title);
                duration = pkg?.days || 1;
            }

            const end = new Date(start);
            end.setDate(start.getDate() + (duration - 1));
            end.setHours(23, 59, 59, 999);

            const paxCount = b.paxCount || extractPaxCount(b.guests);

            if (start <= today && end >= today && b.status === 'Confirmed' && b.liveStatus !== 'Completed' && b.liveStatus !== 'Cancelled') {
                live.push({ ...b, paxCount, duration, liveEndDate: end });
            } else if (start > today && start <= in7Days && b.status === 'Confirmed') {
                upcoming.push({ ...b, paxCount });
            } else if ((end < today && b.status !== 'Cancelled' && b.liveStatus !== 'Cancelled') || b.status === 'Completed' || b.liveStatus === 'Completed') {
                completed.push(b);
            }
        });

        // #3 — sort using parseLocalDate (timezone-safe), not new Date(dateStr)
        const byDate = (a: Booking, b: Booking) => (parseLocalDate(a.date)?.getTime() ?? 0) - (parseLocalDate(b.date)?.getTime() ?? 0);
        live.sort(byDate);
        upcoming.sort(byDate);
        completed.sort((a, b) => (parseLocalDate(b.date)?.getTime() ?? 0) - (parseLocalDate(a.date)?.getTime() ?? 0));

        return { live, upcoming, completed };
    }, [bookings, packages]);

    // ─── Fault Detection ──────────────────────────────────────────────────────
    const faults = useMemo(() => {
        return tourStats.live.map(tour => {
            const issues: { type: 'issue' | 'no-driver'; label: string }[] = [];

            // 1. Manually flagged as Issue
            if ((tour as any).liveStatus === 'Issue') {
                issues.push({ type: 'issue', label: 'Flagged as Issue by team' });
            }

            // 2. No transport/driver assigned
            const hasTransport = tour.supplierBookings?.some(sb => sb.serviceType === 'Transport');
            if (!hasTransport) {
                issues.push({ type: 'no-driver', label: 'No driver / transport assigned' });
            }

            return issues.length > 0 ? { tour, issues } : null;
        }).filter(Boolean) as { tour: typeof tourStats.live[0]; issues: { type: string; label: string }[] }[];
    }, [tourStats.live]);

    const [faultPanelOpen, setFaultPanelOpen] = useState(true);

    // ─── Attendance Logic ─────────────────────────────────────────────────────
    const isAdmin = currentUser?.role === 'admin' || currentUser?.userType === 'Admin';

    const handleStatusChange = async (empId: number, newStatus: string) => {
        if (!isAdmin && currentUser?.id !== empId) {
            toast.error('You can only update your own attendance.');
            return;
        }
        try {
            const today = new Date().toISOString().split('T')[0];
            const nowISO = new Date().toISOString();
            const logId = `ATL-${empId}-${today}`;
            if (newStatus === 'Present' || newStatus === 'On Field' || newStatus === 'Remote') {
                await api.upsertAttendanceLog({ id: logId, staffId: empId, date: today, status: newStatus as any, checkInTime: nowISO });
                await updateStaff(empId, { attendanceStatus: newStatus as any, checkInTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) });
            } else {
                await api.upsertAttendanceLog({ id: logId, staffId: empId, date: today, status: newStatus as any, checkOutTime: nowISO });
                await updateStaff(empId, { attendanceStatus: newStatus as any, checkInTime: newStatus === 'Absent' ? '-' : undefined });
            }
            toast.success('Attendance updated');
        } catch {
            toast.error('Failed to update attendance');
        }
    };

    // #8 — checkout keeps status 'Present' (checked in but left); only sets checkOutTime
    const handleCheckOut = async (empId: number) => {
        if (!isAdmin && currentUser?.id !== empId) { toast.error('You can only check out yourself.'); return; }
        try {
            const today = new Date().toISOString().split('T')[0];
            const logId = `ATL-${empId}-${today}`;
            await api.updateAttendanceLog(logId, { checkOutTime: new Date().toISOString() });
            // Keep attendanceStatus unchanged — staff was present, now checked out
            // We clear checkInTime to "-" so the "Out" button disappears
            await updateStaff(empId, { checkInTime: '-' });
            toast.success('Checked out successfully');
        } catch { toast.error('Failed to check out'); }
    };

    const handleLocationChange = async (id: number, newLocation: string) => {
        if (!isAdmin && currentUser?.id !== id) return;
        try {
            const today = new Date().toISOString().split('T')[0];
            const logId = `ATL-${id}-${today}`;
            const currentStatus = staff.find((s: any) => s.id === id)?.attendanceStatus || 'Present';
            await api.upsertAttendanceLog({ id: logId, staffId: id, date: today, status: currentStatus as any, location: newLocation });
            await updateStaff(id, { currentLocation: newLocation });
            toast.success('Location updated');
        } catch (e) {
            console.error('Failed to update location', e);
            toast.error('Failed to update location');
        }
    };

    // #14 — confirm before cancelling
    const handleLiveStatusChange = async (bookingId: string, liveStatus: string) => {
        if (liveStatus === 'Cancelled') {
            const ok = window.confirm('Are you sure you want to cancel this live tour? This cannot be easily undone.');
            if (!ok) return;
        }
        try {
            await updateBooking(bookingId, { liveStatus } as any);
            toast.success('Tour status updated');
        } catch { toast.error('Failed to update tour status'); }
    };

    // ─── Prep / Assignment Modal ──────────────────────────────────────────────
    const [selectedBookingForPrep, setSelectedBookingForPrep] = useState<Booking | null>(null);
    const [prepModalOpen, setPrepModalOpen] = useState(false);
    const [driverVendorId, setDriverVendorId] = useState('');
    const [driverCost, setDriverCost] = useState('');
    const [driverName, setDriverName] = useState('');
    const [driverPhone, setDriverPhone] = useState('');
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [whatsappGroupUrl, setWhatsappGroupUrl] = useState('');
    // #10 — durationDays editable in modal
    const [modalDurationDays, setModalDurationDays] = useState('');

    const openPrepModal = (booking: Booking) => {
        setSelectedBookingForPrep(booking);
        const transport = booking.supplierBookings?.find(sb => sb.serviceType === 'Transport');
        setDriverVendorId(transport?.vendorId || '');
        setDriverCost(transport?.cost ? String(transport.cost) : '');
        setDriverName(transport?.driverName || '');
        setDriverPhone(transport?.driverPhone || '');
        setVehicleNumber(transport?.vehicleNumber || '');
        setWhatsappGroupUrl(booking.whatsappGroupUrl || '');
        setModalDurationDays(booking.durationDays ? String(booking.durationDays) : '');
        setPrepModalOpen(true);
    };

    const handleAssignDriver = async () => {
        if (!selectedBookingForPrep || !driverVendorId) return;
        const costVal = parseFloat(driverCost) || 0;
        if (costVal < 0) { toast.error('Cost cannot be negative'); return; }

        const existingTransport = selectedBookingForPrep.supplierBookings?.find(sb => sb.serviceType === 'Transport');
        if (existingTransport) {
            await updateSupplierBooking(selectedBookingForPrep.id, existingTransport.id, {
                vendorId: driverVendorId,
                cost: costVal,
                driverName: driverName || undefined,
                driverPhone: driverPhone || undefined,
                vehicleNumber: vehicleNumber || undefined,
            });
        } else {
            const newSb: SupplierBooking = {
                id: `SB-${Date.now()}`,
                bookingId: selectedBookingForPrep.id,
                vendorId: driverVendorId,
                serviceType: 'Transport',
                cost: costVal,
                paidAmount: 0,
                paymentStatus: 'Unpaid',
                bookingStatus: 'Confirmed',
                notes: 'Assigned via Operations Console',
                driverName: driverName || undefined,
                driverPhone: driverPhone || undefined,
                vehicleNumber: vehicleNumber || undefined,
            };
            await addSupplierBooking(selectedBookingForPrep.id, newSb);
        }

        // Persist WhatsApp group URL
        if (whatsappGroupUrl !== (selectedBookingForPrep.whatsappGroupUrl || '')) {
            await updateBooking(selectedBookingForPrep.id, { whatsappGroupUrl } as any);
        }

        // #10 — persist durationDays if changed
        const newDuration = parseInt(modalDurationDays) || 0;
        if (newDuration > 0 && newDuration !== (selectedBookingForPrep.durationDays ?? 0)) {
            await updateBooking(selectedBookingForPrep.id, { durationDays: newDuration } as any);
        }

        toast.success(existingTransport ? 'Driver updated successfully' : 'Driver assigned successfully');
        setPrepModalOpen(false);
    };

    const transportVendors = useMemo(() =>
        vendors.filter((v: any) => v.category === 'Transport' || v.category === 'Guide'),
        [vendors]);

    // ─── Attendance summary counts (#11) ────────────────────────────────────
    const attSummary = useMemo(() => ({
        present: staff.filter((s: any) => s.attendanceStatus === 'Present').length,
        field: staff.filter((s: any) => s.attendanceStatus === 'Remote' || s.attendanceStatus === 'On Field').length,
        leave: staff.filter((s: any) => s.attendanceStatus === 'On Leave').length,
        absent: staff.filter((s: any) => !s.attendanceStatus || s.attendanceStatus === 'Absent').length,
    }), [staff]);

    return (
        <div className="flex flex-col h-full admin-page-bg">
            {/* ── Header ── */}
            <div className="bg-white dark:bg-[#1A2633] border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Briefcase className="text-blue-600" />
                        <span className="font-display text-3xl">Operations Center</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Monitor live tours and manage staff availability.</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* #9 — Manual refresh button */}
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        title="Refresh data"
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                    </button>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('Tours')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'Tours' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Tour Ops
                        </button>
                        <button
                            onClick={() => setActiveTab('Attendance')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'Attendance' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Staff Attendance
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">

                {/* ══ TOURS TAB ══ */}
                {activeTab === 'Tours' && (
                    <div className="max-w-7xl mx-auto space-y-8">

                        {/* ── Faults / Alerts Banner ── */}
                        {faults.length > 0 && (
                            <div className="mb-6">
                                <button
                                    onClick={() => setFaultPanelOpen(v => !v)}
                                    className="w-full flex items-center justify-between px-5 py-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl text-left group transition-colors hover:bg-red-100 dark:hover:bg-red-900/30"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="relative flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                        </span>
                                        <AlertTriangle size={16} className="text-red-500" />
                                        <span className="font-black text-red-700 dark:text-red-400 text-sm">
                                            {faults.length} Tour{faults.length > 1 ? 's' : ''} Need Attention
                                        </span>
                                        <span className="text-xs text-red-500 font-medium">
                                            — {faults.reduce((acc, f) => acc + f.issues.length, 0)} fault{faults.reduce((acc, f) => acc + f.issues.length, 0) > 1 ? 's' : ''} detected
                                        </span>
                                    </div>
                                    <span className="text-red-400 text-xs font-bold">{faultPanelOpen ? '▲ Collapse' : '▼ Expand'}</span>
                                </button>

                                {faultPanelOpen && (
                                    <div className="mt-2 bg-white dark:bg-[#1A2633] border border-red-200 dark:border-red-800/30 rounded-2xl overflow-hidden shadow-sm">
                                        {faults.map(({ tour, issues }) => (
                                            <div key={tour.id} className="px-5 py-4 border-b last:border-b-0 border-red-50 dark:border-red-900/20">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white text-sm">
                                                            {tour.customer}
                                                            <span className="text-slate-400 font-normal ml-2 text-xs">{tour.title}</span>
                                                        </p>
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {issues.map((issue, i) => (
                                                                <span
                                                                    key={i}
                                                                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                                                                        issue.type === 'issue'
                                                                            ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                                                                            : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                                                                    }`}
                                                                >
                                                                    {issue.type === 'issue' && '🔴'}
                                                                    {issue.type === 'no-driver' && '🚗'}
                                                                    {issue.label}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 flex-shrink-0">
                                                        {!tour.supplierBookings?.some(sb => sb.serviceType === 'Transport') && (
                                                            <button
                                                                onClick={() => openPrepModal(tour)}
                                                                className="text-[11px] font-bold px-3 py-1.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400 rounded-lg transition-colors"
                                                            >
                                                                Assign Driver
                                                            </button>
                                                        )}
                                                        {(tour as any).liveStatus === 'Issue' && (
                                                            <button
                                                                onClick={() => handleLiveStatusChange(tour.id, 'Live')}
                                                                className="text-[11px] font-bold px-3 py-1.5 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 rounded-lg transition-colors"
                                                            >
                                                                Mark Resolved
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Live Tours */}
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                                Live Tours (<span className="kpi-number text-xl">{tourStats.live.length}</span>)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-cards">
                                {tourStats.live.map(tour => {
                                    const assignedTransport = tour.supplierBookings?.find(sb => sb.serviceType === 'Transport');
                                    const transportVendor = assignedTransport ? vendors.find((v: any) => v.id === assignedTransport.vendorId) : null;
                                    const driverDisplayName = assignedTransport
                                        ? (transportVendor?.name || assignedTransport.driverName || 'Assigned')
                                        : 'Not Assigned';
                                    const dayOfTour = getDayOfTour(tour.date, tour.duration);

                                    // Compute end date display from liveEndDate
                                    const endDateLabel = (tour as any).liveEndDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

                                    // #7 — determine WA URL before rendering button
                                    const formattedPhone = tour.phone?.replace(/\D/g, '');
                                    const waPhone = formattedPhone ? (formattedPhone.length === 10 ? `91${formattedPhone}` : formattedPhone) : '';
                                    const waUrl = tour.whatsappGroupUrl || (waPhone ? `https://wa.me/${waPhone}` : '');
                                    const hasWa = !!waUrl;

                                    const hasFault = faults.some(f => f.tour.id === tour.id);
                                    const isIssue = (tour as any).liveStatus === 'Issue';

                                    return (
                                        <div key={tour.id} className={`bg-white dark:bg-[#1A2633] p-5 rounded-2xl border shadow-sm relative overflow-hidden transition-all ${
                                            isIssue
                                                ? 'border-red-300 dark:border-red-700/50 ring-1 ring-red-200 dark:ring-red-800/30'
                                                : hasFault
                                                ? 'border-amber-300 dark:border-amber-700/50 ring-1 ring-amber-200 dark:ring-amber-800/30'
                                                : 'border-green-200 dark:border-green-900/30'
                                        }`}>
                                            <div className="absolute top-0 right-0 p-3 opacity-10">
                                                <Map size={80} className="text-green-500" />
                                            </div>
                                            <div className="relative z-10">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-[10px] font-black px-2 py-0.5 rounded uppercase">On Tour</span>
                                                    <span className="text-slate-400 text-xs font-mono">{tour.invoiceNo || tour.id}</span>
                                                </div>
                                                <h4 className="font-bold text-slate-900 dark:text-white text-lg truncate" title={tour.customer}>{tour.customer}</h4>
                                                <p className="text-sm text-slate-500 font-medium mb-4 truncate" title={tour.title}>{tour.title}</p>

                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                                                        <Calendar size={14} />
                                                        Day {dayOfTour} of {tour.duration}
                                                        <span className="text-slate-400 font-normal ml-1">
                                                            (Ends {endDateLabel})
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                                                        <Users size={14} /> {tour.paxCount} Guests
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                                                        <Car size={14} />
                                                        {assignedTransport && transportVendor ? (
                                                            <button
                                                                onClick={() => navigate(`/admin/vendors?search=${encodeURIComponent(transportVendor.name)}`)}
                                                                className="text-blue-600 hover:text-blue-700 hover:underline font-bold text-left inline"
                                                            >
                                                                {driverDisplayName}
                                                            </button>
                                                        ) : (
                                                            <span className="text-amber-500">{driverDisplayName}</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2 flex-wrap">
                                                    {/* #7 — visually disabled WA button when no link/phone */}
                                                    <button
                                                        onClick={() => hasWa && window.open(waUrl, '_blank')}
                                                        disabled={!hasWa}
                                                        title={hasWa ? (tour.whatsappGroupUrl ? 'Open WA Group' : 'Open WhatsApp') : 'No phone or WA group set'}
                                                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${hasWa
                                                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 cursor-pointer'
                                                            : 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 cursor-not-allowed opacity-60'
                                                        }`}
                                                    >
                                                        {tour.whatsappGroupUrl ? 'WA Group' : 'WhatsApp'}
                                                    </button>

                                                    {/* #14 — liveStatus select with cancel confirmation built into handler */}
                                                    <select
                                                        value={tour.liveStatus || 'Live'}
                                                        onChange={(e) => handleLiveStatusChange(tour.id, e.target.value)}
                                                        className="px-2 py-2 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg border-none outline-none cursor-pointer"
                                                    >
                                                        <option value="Live">🟢 Live</option>
                                                        <option value="Issue">🔴 Issue</option>
                                                        <option value="Cancelled">❌ Cancel</option>
                                                    </select>

                                                    {/* #4 — Assign/Edit driver on live tour cards */}
                                                    <button
                                                        onClick={() => openPrepModal(tour)}
                                                        className="py-2 px-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors"
                                                        title={assignedTransport ? 'Edit Transport' : 'Assign Driver'}
                                                    >
                                                        <Car size={12} className="inline mr-1" />
                                                        {assignedTransport ? 'Edit' : 'Assign'}
                                                    </button>

                                                    <button
                                                        onClick={() => navigate(`/admin/bookings?search=${tour.id}`)}
                                                        className="flex-1 py-2 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-100 transition-colors"
                                                    >
                                                        Details
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {tourStats.live.length === 0 && (
                                    <div className="col-span-3 py-10 text-center bg-white dark:bg-[#1A2633] rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                                        <p className="text-slate-400 font-medium">No live tours at the moment.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Upcoming Tours */}
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <Calendar className="text-blue-500" size={20} />
                                Upcoming Arrivals (Next 7 Days)
                            </h3>
                            <div className="bg-white dark:bg-[#1A2633] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase font-bold text-slate-400">
                                        <tr>
                                            <th className="px-6 py-4">Start Date</th>
                                            <th className="px-6 py-4">Customer</th>
                                            <th className="px-6 py-4">Package</th>
                                            <th className="px-6 py-4">Assignment</th>
                                            <th className="px-6 py-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {tourStats.upcoming.map(tour => {
                                            const assignedTransport = tour.supplierBookings?.find(sb => sb.serviceType === 'Transport');
                                            const vendorName = assignedTransport ? vendors.find((v: any) => v.id === assignedTransport.vendorId)?.name : null;
                                            const driverLabel = vendorName || assignedTransport?.driverName || null;
                                            return (
                                                <tr key={tour.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                    <td className="px-6 py-4 font-bold text-blue-600">
                                                        {/* #3 — timezone-safe date display */}
                                                        {formatLocalDate(tour.date)}
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                                        {tour.customer}
                                                        <div className="text-[10px] text-slate-400 font-normal">{tour.paxCount} Pax</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-500">{tour.title}</td>
                                                    <td className="px-6 py-4 text-sm">
                                                        {driverLabel ? (
                                                            <span className="flex items-center gap-1 text-green-600 font-bold text-xs">
                                                                <CheckCircle size={12} /> {driverLabel}
                                                            </span>
                                                        ) : (
                                                            <span className="text-amber-500 flex items-center gap-1 text-xs font-medium">
                                                                <AlertTriangle size={12} /> Pending
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => openPrepModal(tour)}
                                                            className="text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors"
                                                        >
                                                            {driverLabel ? 'Manage' : 'Assign Driver'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {tourStats.upcoming.length === 0 && (
                                            <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No upcoming tours in the next 7 days.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* #13 — Completed Tours Section (previously dead code, now rendered) */}
                        {tourStats.completed.length > 0 && (
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <CheckCircle className="text-slate-400" size={20} />
                                    Recently Completed
                                    <span className="text-sm font-normal text-slate-400">({tourStats.completed.length})</span>
                                </h3>
                                <div className="bg-white dark:bg-[#1A2633] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase font-bold text-slate-400">
                                            <tr>
                                                <th className="px-6 py-4">Date</th>
                                                <th className="px-6 py-4">Customer</th>
                                                <th className="px-6 py-4">Package</th>
                                                <th className="px-6 py-4 text-right">Booking</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {tourStats.completed.slice(0, 10).map(tour => (
                                                <tr key={tour.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 opacity-70">
                                                    <td className="px-6 py-4 text-sm text-slate-500">{formatLocalDate(tour.date)}</td>
                                                    <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">{tour.customer}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-500">{tour.title}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => navigate(`/admin/bookings?search=${tour.id}`)}
                                                            className="text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors"
                                                        >
                                                            View
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                    </div>
                )}

                {/* ══ ATTENDANCE TAB ══ */}
                {activeTab === 'Attendance' && (
                    <div className="max-w-5xl mx-auto">
                        <div className="bg-white dark:bg-[#1A2633] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-3 bg-slate-50/50">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Daily Attendance</h3>
                                    <p className="text-xs text-slate-500 font-bold">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                </div>
                                {/* #11 — Full attendance summary badges */}
                                <div className="flex flex-wrap gap-2">
                                    <div className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold flex items-center gap-1">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div> {attSummary.present} Present
                                    </div>
                                    <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div> {attSummary.field} Remote/Field
                                    </div>
                                    <div className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold flex items-center gap-1">
                                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div> {attSummary.leave} On Leave
                                    </div>
                                    <div className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold flex items-center gap-1">
                                        <div className="w-2 h-2 bg-red-500 rounded-full"></div> {attSummary.absent} Absent
                                    </div>
                                </div>
                            </div>

                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase font-bold text-slate-400">
                                    <tr>
                                        <th className="px-6 py-4">Employee</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Check-In</th>
                                        <th className="px-6 py-4">Current Location</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {staff.map((emp: any) => (
                                        <tr key={emp.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                    {/* #12 — inline style instead of dynamic Tailwind class */}
                                                    <div
                                                        style={{ backgroundColor: getAvatarBg(emp.color) }}
                                                        className="size-8 rounded-full flex items-center justify-center text-xs text-white font-bold flex-shrink-0"
                                                    >
                                                        {emp.initials}
                                                    </div>
                                                    {emp.name}
                                                    {emp.id === currentUser?.id && (
                                                        <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded ml-1">YOU</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-500 pl-10 capitalize">{emp.role}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={emp.attendanceStatus || 'Absent'}
                                                    onChange={(e) => handleStatusChange(emp.id, e.target.value)}
                                                    disabled={!isAdmin && currentUser?.id !== emp.id}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border-none outline-none cursor-pointer disabled:opacity-50
                                                        ${emp.attendanceStatus === 'Present' ? 'bg-green-100 text-green-700' :
                                                            emp.attendanceStatus === 'On Field' ? 'bg-blue-100 text-blue-700' :
                                                                emp.attendanceStatus === 'Remote' ? 'bg-sky-100 text-sky-700' :
                                                                    emp.attendanceStatus === 'On Leave' ? 'bg-amber-100 text-amber-700' :
                                                                        'bg-red-100 text-red-700'}`}
                                                >
                                                    <option value="Present">Present</option>
                                                    <option value="Absent">Absent</option>
                                                    <option value="On Field">On Field</option>
                                                    <option value="Remote">Remote</option>
                                                    <option value="On Leave">On Leave</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-mono text-slate-600 dark:text-slate-400">
                                                <div className="flex items-center gap-2">
                                                    <span>{emp.checkInTime || '-'}</span>
                                                    {/* #8 — show checkout button only when checkInTime is a real time (not '-') */}
                                                    {emp.attendanceStatus && emp.attendanceStatus !== 'Absent' && emp.checkInTime && emp.checkInTime !== '-' && (isAdmin || currentUser?.id === emp.id) && (
                                                        <button onClick={() => handleCheckOut(emp.id)} className="text-[10px] text-red-500 hover:text-red-700 font-bold flex items-center gap-0.5" title="Check Out">
                                                            <LogOut size={10} /> Out
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                                                <div className="flex items-center gap-2">
                                                    {emp.attendanceStatus === 'On Field' && <Map size={14} className="text-blue-500" />}
                                                    <input
                                                        type="text"
                                                        defaultValue={emp.currentLocation || (emp.attendanceStatus === 'Present' ? 'Office' : '')}
                                                        onBlur={(e) => handleLocationChange(emp.id, e.target.value)}
                                                        disabled={!isAdmin && currentUser?.id !== emp.id}
                                                        className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none w-32 transition-colors text-xs disabled:opacity-50"
                                                        placeholder="Set Location..."
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>

            {/* ══ PREP / ASSIGNMENT MODAL ══ */}
            {prepModalOpen && selectedBookingForPrep && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A2633] rounded-2xl w-full max-w-md shadow-2xl p-6 relative overflow-y-auto max-h-[90vh]">
                        <button
                            onClick={() => setPrepModalOpen(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                        >
                            <XCircle size={20} className="text-slate-400" />
                        </button>

                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Assign Transport</h3>
                        <p className="text-sm text-slate-500 mb-6">Assign a driver or vehicle for <strong>{selectedBookingForPrep.customer}</strong>.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Driver / Agency</label>
                                <select
                                    value={driverVendorId}
                                    onChange={(e) => setDriverVendorId(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 ring-blue-500/20"
                                >
                                    <option value="">-- Select Vendor --</option>
                                    {transportVendors.map((v: any) => (
                                        <option key={v.id} value={v.id}>{v.name} ({v.location})</option>
                                    ))}
                                </select>
                                {transportVendors.length === 0 && (
                                    <p className="text-xs text-red-500 mt-1">No Transport vendors found. Add one in Vendors tab.</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Driver Name</label>
                                    <input type="text" value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="e.g. Raju Kumar" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 ring-blue-500/20 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Driver Phone</label>
                                    <input type="tel" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} placeholder="+91 99999 00000" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 ring-blue-500/20 text-sm" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vehicle Number</label>
                                    <input type="text" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="MH 01 AB 1234" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 ring-blue-500/20 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cost (₹)</label>
                                    <input type="number" value={driverCost} onChange={(e) => setDriverCost(e.target.value)} placeholder="0" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 ring-blue-500/20 text-sm" />
                                </div>
                            </div>

                            {/* #10 — Tour Duration editable from modal */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tour Duration (Days)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={modalDurationDays}
                                    onChange={(e) => setModalDurationDays(e.target.value)}
                                    placeholder="e.g. 5"
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 ring-blue-500/20 text-sm"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Used by Operations to calculate live tour progress. Leave blank to use package default.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">WhatsApp Group Link</label>
                                <input type="url" value={whatsappGroupUrl} onChange={(e) => setWhatsappGroupUrl(e.target.value)} placeholder="https://chat.whatsapp.com/..." className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 ring-blue-500/20 text-sm" />
                            </div>

                            <button
                                onClick={handleAssignDriver}
                                disabled={!driverVendorId}
                                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mt-2 btn-glow"
                            >
                                Confirm Assignment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
