import React, { useState, useMemo, useCallback } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    Map, Calendar, Users, Briefcase, CheckCircle,
    XCircle, AlertTriangle, LogOut, Car, RefreshCw,
    Plus, Trash2, Clock, ChevronDown, ChevronUp, Compass,
    Search, Filter, PhoneCall, ExternalLink, ShieldAlert, Sparkles, UserCheck, CheckSquare,
    MessageSquare, Activity, Check, User
} from 'lucide-react';
import { Booking, SupplierBooking, BookingDailyDeliverable } from '../../types';
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
/** Parse a date string into a local midnight Date without UTC shifting */
const parseLocalDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const cleanStr = String(dateStr).split('T')[0].trim();
    const parts = cleanStr.split(/[-/]/);
    if (parts.length >= 3) {
        let year = parseInt(parts[0], 10);
        let month = parseInt(parts[1], 10) - 1;
        let day = parseInt(parts[2], 10);

        // Handle DD-MM-YYYY or DD/MM/YYYY
        if (parts[0].length <= 2 && parts[2].length === 4) {
            day = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            year = parseInt(parts[2], 10);
        }

        if (!isNaN(year) && !isNaN(month) && !isNaN(day) && year > 1900 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
            const d = new Date(year, month, day);
            d.setHours(0, 0, 0, 0);
            return d;
        }
    }
    const fallback = new Date(dateStr);
    if (!isNaN(fallback.getTime())) {
        fallback.setHours(0, 0, 0, 0);
        return fallback;
    }
    return null;
};

/** Format a YYYY-MM-DD string for display without UTC shifting */
const formatLocalDate = (dateStr: string): string => {
    const d = parseLocalDate(dateStr);
    return d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : dateStr;
};

/** Format external WhatsApp URLs with protocol if missing */
const formatExternalUrl = (url: string): string => {
    if (!url) return '';
    if (/^(https?:\/\/|wa\.me)/i.test(url)) return url;
    return `https://${url}`;
};

/** Tour progress calculation (Day count & percentage) */
const getTourProgress = (dateStr: string, duration: number): { day: number; percent: number } => {
    const start = parseLocalDate(dateStr);
    if (!start || duration <= 0) return { day: 1, percent: 100 };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + (duration - 1));
    end.setHours(23, 59, 59, 999);

    if (today < start) {
        return { day: 0, percent: 0 };
    }
    if (today > end) {
        return { day: duration, percent: 100 };
    }

    const diffDays = Math.round((today.getTime() - start.getTime()) / 86_400_000) + 1;
    const currentDay = Math.min(Math.max(diffDays, 1), duration);
    const percent = Math.min(Math.max(Math.round((currentDay / duration) * 100), 5), 100);
    return { day: currentDay, percent };
};

// ─── Pax count extraction ─────────────────────────────────────────────────────
const extractPaxCount = (guestsStr?: string): number => {
    if (!guestsStr) return 1;
    const str = guestsStr.toLowerCase();
    const clean = str.replace(/\d+\s*(?:yr|year|room|bed|night)/g, '');
    const nums = clean.match(/\d+/g);
    if (nums && nums.length > 0) return nums.reduce((a, c) => a + parseInt(c), 0);
    return 1;
};

// ─── Deliverable Icon Helper ──────────────────────────────────────────────────
const getDeliverableCategoryIcon = (type: string) => {
    switch (type) {
        case 'meal': return '🍳';
        case 'transport': return '🚗';
        case 'guide': return '🗣️';
        case 'activity': return '🎟️';
        case 'hotel': return '🏨';
        default: return '⚙️';
    }
};

export const Operations: React.FC = () => {
    const { bookings, packages, vendors, addSupplierBooking, updateSupplierBooking, updateBooking, refreshData } = useData() as any;
    const { staff, updateStaff, currentUser } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'Tours' | 'Attendance'>('Tours');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // ─── Search & Filters ─────────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'attention' | 'unassigned' | 'upcoming'>('all');

    // ─── Staff Search & Filter (Attendance) ──────────────────────────────────
    const [staffSearchQuery, setStaffSearchQuery] = useState('');
    const [staffRoleFilter, setStaffRoleFilter] = useState<string>('all');

    // ─── Upcoming window toggle (7 / 14 / 30 / 60 days) ─────────────────────────
    const [upcomingDays, setUpcomingDays] = useState<7 | 14 | 30 | 60>(30);

    // ─── Recently Completed — Show More toggle ───────────────────────────────
    const [showAllCompleted, setShowAllCompleted] = useState(false);

    // ─── Deliverables Checklist States ────────────────────────────────────────
    const [deliverables, setDeliverables] = useState<Record<string, BookingDailyDeliverable[]>>({});
    const [loadingDeliverables, setLoadingDeliverables] = useState<Record<string, boolean>>({});
    const [expandedChecklists, setExpandedChecklists] = useState<Record<string, boolean>>({});
    const [selectedDays, setSelectedDays] = useState<Record<string, number>>({});
    const [newDeliverableName, setNewDeliverableName] = useState<Record<string, string>>({});
    const [newDeliverableType, setNewDeliverableType] = useState<Record<string, 'meal' | 'transport' | 'guide' | 'activity' | 'hotel' | 'other'>>({});
    const [newDeliverableTime, setNewDeliverableTime] = useState<Record<string, string>>({});

    // Fetch deliverables for a specific booking
    const fetchDeliverableForBooking = useCallback(async (bookingId: string) => {
        setLoadingDeliverables(prev => ({ ...prev, [bookingId]: true }));
        try {
            const data = await api.getDailyDeliverables(bookingId);
            setDeliverables(prev => ({ ...prev, [bookingId]: data }));
        } catch (err) {
            console.error(`Failed to fetch deliverables for ${bookingId}:`, err);
        } finally {
            setLoadingDeliverables(prev => ({ ...prev, [bookingId]: false }));
        }
    }, []);

    const refreshDeliverables = useCallback((bookingId: string) => {
        fetchDeliverableForBooking(bookingId);
    }, [fetchDeliverableForBooking]);

    // Listen for external booking changes
    React.useEffect(() => {
        const onBookingsChanged = () => {
            refreshData?.();
        };
        window.addEventListener('bookings-changed', onBookingsChanged);
        return () => window.removeEventListener('bookings-changed', onBookingsChanged);
    }, [refreshData]);

    // Manual Refresh handler
    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await refreshData?.();
            setDeliverables({});
            toast.success('Operations data refreshed');
        } catch {
            toast.error('Refresh failed');
        } finally {
            setIsRefreshing(false);
        }
    }, [refreshData]);

    // Deliverables Generation
    const handleGenerateChecklist = async (booking: Booking, duration: number) => {
        const existing = deliverables[booking.id] || [];
        if (existing.length > 0) {
            const ok = window.confirm(
                `This tour already has ${existing.length} checklist items.\nRegenerate and add new ones?`
            );
            if (!ok) return;
        }

        try {
            const pkg = packages.find((p: any) => p.id === booking.packageId) || packages.find((p: any) => p.title === booking.title);
            const newItems: BookingDailyDeliverable[] = [];
            const runTs = Date.now();

            for (let day = 1; day <= duration; day++) {
                const dayItin = pkg?.itinerary?.find((item: any) => item.day === day);
                const desc = dayItin?.desc?.toLowerCase() || '';
                const title = dayItin?.title?.toLowerCase() || '';
                const uid = () => Math.random().toString(36).substr(2, 6);

                newItems.push({ id: `DD-${booking.id}-${day}-bf-${runTs}-${uid()}`, bookingId: booking.id, dayNumber: day, itemName: 'Breakfast (Included in Hotel Plan)', itemType: 'meal', scheduledTime: '08:00 AM', status: 'Pending' });

                if (day < duration) {
                    newItems.push({ id: `DD-${booking.id}-${day}-ht-${runTs}-${uid()}`, bookingId: booking.id, dayNumber: day, itemName: 'Overnight Stay check', itemType: 'hotel', scheduledTime: '12:00 PM', status: 'Pending' });
                }

                const transportItemName = day === 1 ? 'Airport / Station Pickup' : day === duration ? 'Airport / Station Drop' : 'Lobby Pickup';
                newItems.push({ id: `DD-${booking.id}-${day}-tr-${runTs}-${uid()}`, bookingId: booking.id, dayNumber: day, itemName: transportItemName, itemType: 'transport', scheduledTime: '09:00 AM', status: 'Pending' });

                if (pkg && (desc.includes('guide') || desc.includes('sightseeing') || title.includes('sightseeing') || title.includes('guided'))) {
                    newItems.push({ id: `DD-${booking.id}-${day}-gd-${runTs}-${uid()}`, bookingId: booking.id, dayNumber: day, itemName: 'Guide check-in', itemType: 'guide', scheduledTime: '09:30 AM', status: 'Pending' });
                }

                let activityCount = 0;
                let hasSightseeing = false;
                if (pkg) {
                    const lines = desc.split(/[.\n•]/);
                    lines.forEach((line) => {
                        const cleanLine = line.trim();
                        if (cleanLine.length > 10 && (cleanLine.includes('visit') || cleanLine.includes('explore') || cleanLine.includes('sightseeing') || cleanLine.includes('safari') || cleanLine.includes('ride') || cleanLine.includes('boating'))) {
                            let name = cleanLine.charAt(0).toUpperCase() + cleanLine.slice(1);
                            name = name.replace(/^(visit|explore|enjoy|see)\s+/i, '');
                            name = name.charAt(0).toUpperCase() + name.slice(1);
                            if (name.length > 50) name = name.substring(0, 47) + '...';
                            newItems.push({ id: `DD-${booking.id}-${day}-ac${activityCount}-${runTs}-${uid()}`, bookingId: booking.id, dayNumber: day, itemName: `${name} Entry`, itemType: 'activity', scheduledTime: '10:00 AM', status: 'Pending' });
                            activityCount++;
                        }
                    });
                    if (activityCount === 0 && (desc.includes('sightseeing') || desc.includes('explore') || desc.includes('visit'))) hasSightseeing = true;
                } else {
                    if (day > 1 && day < duration) hasSightseeing = true;
                }
                if (hasSightseeing) {
                    newItems.push({ id: `DD-${booking.id}-${day}-sg-${runTs}-${uid()}`, bookingId: booking.id, dayNumber: day, itemName: 'Sightseeing tour entry', itemType: 'activity', scheduledTime: '10:00 AM', status: 'Pending' });
                }
            }

            for (const item of newItems) {
                await api.createDailyDeliverable(item);
            }

            toast.success(`Checklist generated with ${newItems.length} items!`);
            refreshDeliverables(booking.id);
        } catch (e) {
            console.error('Failed to generate checklist:', e);
            toast.error('Failed to generate checklist');
        }
    };

    const handleAddCustomDeliverable = async (bookingId: string, dayNum: number) => {
        const name = newDeliverableName[bookingId]?.trim();
        if (!name) { toast.error('Please enter a deliverable name'); return; }
        const type = newDeliverableType[bookingId] || 'other';
        const time = newDeliverableTime[bookingId] || '';
        try {
            const newItem: BookingDailyDeliverable = {
                id: `DD-${bookingId}-${dayNum}-custom-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                bookingId,
                dayNumber: dayNum,
                itemName: name,
                itemType: type,
                scheduledTime: time || undefined,
                status: 'Pending'
            };
            await api.createDailyDeliverable(newItem);
            toast.success('Deliverable added!');
            setNewDeliverableName(prev => ({ ...prev, [bookingId]: '' }));
            setNewDeliverableTime(prev => ({ ...prev, [bookingId]: '' }));
            refreshDeliverables(bookingId);
        } catch {
            toast.error('Failed to add deliverable');
        }
    };

    const handleDeleteDeliverable = async (id: string, bookingId: string) => {
        try {
            await api.deleteDailyDeliverable(id);
            toast.success('Deliverable deleted');
            refreshDeliverables(bookingId);
        } catch {
            toast.error('Failed to delete deliverable');
        }
    };

    const handleUpdateStatus = async (id: string, bookingId: string, status: 'Pending' | 'Verified Success' | 'Delayed' | 'Substituted', notes?: string) => {
        setDeliverables(prev => ({
            ...prev,
            [bookingId]: (prev[bookingId] || []).map(d => d.id === id ? { ...d, status, notes } : d)
        }));
        try {
            await api.updateDailyDeliverable(id, { status, notes });
        } catch {
            toast.error('Failed to update status');
            refreshDeliverables(bookingId);
        }
    };

    // Mark all items verified for active day
    const handleMarkAllVerified = async (bookingId: string, dayNum: number) => {
        const bookingDeliverables = deliverables[bookingId] || [];
        const dayItems = bookingDeliverables.filter(d => d.dayNumber === dayNum && d.status !== 'Verified Success');
        if (dayItems.length === 0) {
            toast.info('All items for this day are already verified!');
            return;
        }
        try {
            setDeliverables(prev => ({
                ...prev,
                [bookingId]: (prev[bookingId] || []).map(d => d.dayNumber === dayNum ? { ...d, status: 'Verified Success' } : d)
            }));
            for (const item of dayItems) {
                await api.updateDailyDeliverable(item.id, { status: 'Verified Success' });
            }
            toast.success(`Marked ${dayItems.length} items as verified!`);
        } catch {
            toast.error('Failed to update items');
            refreshDeliverables(bookingId);
        }
    };

    // ─── Tour Classification Logic (Robust Overrides & Date Matching) ───────────
    const tourStats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcomingCutoff = new Date(today);
        upcomingCutoff.setDate(today.getDate() + upcomingDays);
        upcomingCutoff.setHours(23, 59, 59, 999);

        const live: (Booking & { paxCount: number; duration: number; liveEndDate: Date; durationEstimated: boolean })[] = [];
        const upcoming: (Booking & { paxCount: number; paxUnknown: boolean })[] = [];
        const completed: Booking[] = [];
        const completedIds = new Set<string>();

        bookings.forEach((b: Booking) => {
            const start = parseLocalDate(b.date);
            if (!start) return;

            let duration: number;
            let durationEstimated = false;

            if (b.endDate) {
                const startD = parseLocalDate(b.date);
                const endD = parseLocalDate(b.endDate);
                if (startD && endD && endD >= startD) {
                    const calcSpan = Math.round((endD.getTime() - startD.getTime()) / 86_400_000) + 1;
                    duration = Math.max(calcSpan, b.durationDays || 1);
                } else if (b.durationDays && b.durationDays > 0) {
                    duration = b.durationDays;
                } else {
                    duration = 1;
                    durationEstimated = true;
                }
            } else if (b.durationDays && b.durationDays > 0) {
                duration = b.durationDays;
            } else {
                const pkg = packages.find((p: any) => p.id === b.packageId)
                    || packages.find((p: any) => b.packageId && p.title === b.title);
                if (pkg?.days && pkg.days > 0) {
                    duration = pkg.days;
                } else {
                    duration = 1;
                    durationEstimated = true;
                }
            }

            const end = new Date(start);
            end.setDate(start.getDate() + (duration - 1));
            end.setHours(23, 59, 59, 999);

            const rawPax = b.paxCount != null
                ? b.paxCount
                : (b.paxAdult != null ? (b.paxAdult + (b.paxChild ?? 0) + (b.paxInfant ?? 0)) : null);
            const paxCount = rawPax ?? extractPaxCount(b.guests);
            const paxUnknown = rawPax == null && !b.guests;

            const statusLower = (b.status ?? 'pending').toLowerCase();
            const liveStatusRaw = b.liveStatus ? String(b.liveStatus).trim() : '';

            const isCancelledBooking = statusLower === 'cancelled' || liveStatusRaw.toLowerCase() === 'cancelled';
            if (isCancelledBooking) return; // Exclude cancelled tours

            // ── Priority 1: Explicitly completed ──
            if (statusLower === 'completed' || liveStatusRaw.toLowerCase() === 'completed') {
                if (!completedIds.has(b.id)) {
                    completed.push(b);
                    completedIds.add(b.id);
                }
                return;
            }

            // ── Priority 2: Explicit LIVE or ISSUE override by Admin ──
            // Only trigger if liveStatus is explicitly set by admin to 'Live' or 'Issue'
            if (liveStatusRaw === 'Live' || liveStatusRaw === 'Issue') {
                live.push({ ...b, paxCount, duration, liveEndDate: end, durationEstimated });
                return;
            }

            // ── Priority 3: Automatic Date Window (Today falls within tour start & end) ──
            if (start <= today && end >= today) {
                live.push({ ...b, paxCount, duration, liveEndDate: end, durationEstimated });
                return;
            }

            // ── Priority 4: UPCOMING (Start date is in future within upcomingCutoff) ──
            if (start > today && start <= upcomingCutoff) {
                upcoming.push({ ...b, paxCount, paxUnknown });
                return;
            }

            // ── Priority 5: COMPLETED / PAST TOURS (End date in past) ──
            if (end < today) {
                if (!completedIds.has(b.id)) {
                    completed.push(b);
                    completedIds.add(b.id);
                }
            }
        });

        const byDate = (a: Booking, b: Booking) =>
            (parseLocalDate(a.date)?.getTime() ?? 0) - (parseLocalDate(b.date)?.getTime() ?? 0);
        live.sort(byDate);
        upcoming.sort(byDate);
        completed.sort((a, b) =>
            (parseLocalDate(b.date)?.getTime() ?? 0) - (parseLocalDate(a.date)?.getTime() ?? 0));

        return { live, upcoming, completed };
    }, [bookings, packages, upcomingDays]);

    // ─── Pre-fetch deliverables for active live tours ──────────────────────────
    React.useEffect(() => {
        tourStats.live.forEach(t => {
            if (deliverables[t.id] === undefined && !loadingDeliverables[t.id]) {
                fetchDeliverableForBooking(t.id);
            }
        });
    }, [tourStats.live, deliverables, loadingDeliverables, fetchDeliverableForBooking]);

    // ─── Fault Detection ──────────────────────────────────────────────────────
    const faults = useMemo(() => {
        return tourStats.live.map(tour => {
            const issues: { type: 'issue' | 'no-driver' | 'no-guide'; label: string }[] = [];

            if ((tour as any).liveStatus === 'Issue') {
                issues.push({ type: 'issue', label: 'Flagged as Issue by team' });
            }

            const hasTransport = tour.supplierBookings?.some(sb => sb.serviceType === 'Transport');
            if (!hasTransport) {
                issues.push({ type: 'no-driver', label: 'No transport / driver assigned' });
            }

            const hasGuide = tour.supplierBookings?.some(sb => sb.serviceType === 'Guide');
            const pkg = packages.find((p: any) => p.id === tour.packageId || p.title === tour.title);
            const mentionsGuide = pkg?.itinerary?.some((i: any) => i.desc?.toLowerCase().includes('guide'));
            if (mentionsGuide && !hasGuide) {
                issues.push({ type: 'no-guide', label: 'No tour guide assigned' });
            }

            return issues.length > 0 ? { tour, issues } : null;
        }).filter(Boolean) as { tour: typeof tourStats.live[0]; issues: { type: string; label: string }[] }[];
    }, [tourStats.live, packages]);

    const [faultPanelOpen, setFaultPanelOpen] = useState(true);

    // ─── KPI Control Header Metrics ──────────────────────────────────────────
    const kpiSummary = useMemo(() => {
        const activeLiveCount = tourStats.live.length;
        const totalLivePax = tourStats.live.reduce((acc, t) => acc + (t.paxCount || 0), 0);
        const attentionNeededCount = faults.length;
        const unassignedTransportCount = tourStats.live.filter(t => !t.supplierBookings?.some(sb => sb.serviceType === 'Transport')).length;
        const upcomingCount = tourStats.upcoming.length;

        let totalItems = 0;
        let verifiedItems = 0;
        tourStats.live.forEach(t => {
            const tourDeliverables = deliverables[t.id] || [];
            totalItems += tourDeliverables.length;
            verifiedItems += tourDeliverables.filter(d => d.status === 'Verified Success').length;
        });

        const presentStaff = staff.filter((s: any) => s.attendanceStatus === 'Present').length;
        const fieldStaff = staff.filter((s: any) => s.attendanceStatus === 'Remote' || s.attendanceStatus === 'On Field').length;

        return {
            activeLiveCount,
            totalLivePax,
            attentionNeededCount,
            unassignedTransportCount,
            upcomingCount,
            totalDeliverablesCount: totalItems,
            verifiedDeliverablesCount: verifiedItems,
            presentStaff,
            fieldStaff
        };
    }, [tourStats, faults, deliverables, staff]);

    // ─── Search & Filtered Lists ──────────────────────────────────────────────
    const filteredLive = useMemo(() => {
        return tourStats.live.filter(t => {
            const q = searchQuery.toLowerCase().trim();
            const matchesQuery = !q || (
                t.customer.toLowerCase().includes(q) ||
                t.title.toLowerCase().includes(q) ||
                (t.invoiceNo && t.invoiceNo.toLowerCase().includes(q)) ||
                (t.phone && t.phone.toLowerCase().includes(q)) ||
                t.supplierBookings?.some(sb => sb.driverName?.toLowerCase().includes(q) || sb.vehicleNumber?.toLowerCase().includes(q))
            );

            if (!matchesQuery) return false;

            if (statusFilter === 'attention') {
                return faults.some(f => f.tour.id === t.id);
            }
            if (statusFilter === 'unassigned') {
                return !t.supplierBookings?.some(sb => sb.serviceType === 'Transport');
            }
            return true;
        });
    }, [tourStats.live, searchQuery, statusFilter, faults]);

    const filteredUpcoming = useMemo(() => {
        return tourStats.upcoming.filter(t => {
            const q = searchQuery.toLowerCase().trim();
            return !q || (
                t.customer.toLowerCase().includes(q) ||
                t.title.toLowerCase().includes(q) ||
                (t.invoiceNo && t.invoiceNo.toLowerCase().includes(q)) ||
                (t.phone && t.phone.toLowerCase().includes(q))
            );
        });
    }, [tourStats.upcoming, searchQuery]);

    const filteredCompleted = useMemo(() => {
        return tourStats.completed.filter(t => {
            const q = searchQuery.toLowerCase().trim();
            return !q || (
                t.customer.toLowerCase().includes(q) ||
                t.title.toLowerCase().includes(q) ||
                (t.invoiceNo && t.invoiceNo.toLowerCase().includes(q))
            );
        });
    }, [tourStats.completed, searchQuery]);

    // ─── Attendance Logic ─────────────────────────────────────────────────────
    const isAdmin = currentUser?.role === 'admin' || currentUser?.userType === 'Admin';

    const handleStatusChange = async (empId: number, newStatus: string) => {
        const isSelf = Number(currentUser?.id) === empId || Number((currentUser as any)?.staffId) === empId;
        if (!isAdmin && !isSelf) {
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

    const handleCheckOut = async (empId: number) => {
        const isSelfCO = Number(currentUser?.id) === empId || Number((currentUser as any)?.staffId) === empId;
        if (!isAdmin && !isSelfCO) { toast.error('You can only check out yourself.'); return; }
        try {
            const today = new Date().toISOString().split('T')[0];
            const logId = `ATL-${empId}-${today}`;
            await api.updateAttendanceLog(logId, { checkOutTime: new Date().toISOString() });
            await updateStaff(empId, { checkInTime: '-' });
            toast.success('Checked out successfully');
        } catch { toast.error('Failed to check out'); }
    };

    const handleLocationChange = async (id: number, newLocation: string) => {
        const isSelfLoc = Number(currentUser?.id) === id || Number((currentUser as any)?.staffId) === id;
        if (!isAdmin && !isSelfLoc) return;
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

    const handleLiveStatusChange = async (bookingId: string, liveStatus: string) => {
        if (liveStatus === 'Cancelled') {
            const ok = window.confirm('Are you sure you want to cancel this live tour? This will mark the booking as Cancelled.');
            if (!ok) return;
        }
        try {
            const updatePayload: any = { liveStatus: liveStatus === 'Auto' ? null : liveStatus };
            if (liveStatus === 'Completed') {
                updatePayload.status = 'Completed';
            } else if (liveStatus === 'Cancelled') {
                updatePayload.status = 'Cancelled';
            }
            await updateBooking(bookingId, updatePayload);
            window.dispatchEvent(new CustomEvent('bookings-changed'));
            toast.success(liveStatus === 'Auto' ? 'Reset to automatic date classification' : `Tour status updated to ${liveStatus}`);
        } catch { toast.error('Failed to update tour status'); }
    };

    // ─── Prep / Assignment Modal ──────────────────────────────────────────────
    const [selectedBookingForPrep, setSelectedBookingForPrep] = useState<Booking | null>(null);
    const [prepModalOpen, setPrepModalOpen] = useState(false);
    
    // Transport assignment states
    const [driverVendorId, setDriverVendorId] = useState('');
    const [driverCost, setDriverCost] = useState('');
    const [driverName, setDriverName] = useState('');
    const [driverPhone, setDriverPhone] = useState('');
    const [vehicleNumber, setVehicleNumber] = useState('');
    
    // Guide assignment states
    const [guideVendorId, setGuideVendorId] = useState('');
    const [guideCost, setGuideCost] = useState('');
    const [guideName, setGuideName] = useState('');
    const [guidePhone, setGuidePhone] = useState('');

    const [whatsappGroupUrl, setWhatsappGroupUrl] = useState('');
    const [modalDurationDays, setModalDurationDays] = useState('');

    const openPrepModal = (booking: Booking) => {
        setSelectedBookingForPrep(booking);
        const transport = booking.supplierBookings?.find(sb => sb.serviceType === 'Transport');
        const guide = booking.supplierBookings?.find(sb => sb.serviceType === 'Guide');

        setDriverVendorId(transport?.vendorId || '');
        setDriverCost(transport?.cost ? String(transport.cost) : '');
        setDriverName(transport?.driverName || '');
        setDriverPhone(transport?.driverPhone || '');
        setVehicleNumber(transport?.vehicleNumber || '');

        setGuideVendorId(guide?.vendorId || '');
        setGuideCost(guide?.cost ? String(guide.cost) : '');
        setGuideName(guide?.driverName || '');
        setGuidePhone(guide?.driverPhone || '');

        setWhatsappGroupUrl(booking.whatsappGroupUrl || '');
        setModalDurationDays(booking.durationDays ? String(booking.durationDays) : '');
        setPrepModalOpen(true);
    };

    const handleSaveBookingDetails = async () => {
        if (!selectedBookingForPrep) return;
        const updates: any = {};
        const newDuration = parseInt(modalDurationDays) || 0;
        if (newDuration > 0 && newDuration !== (selectedBookingForPrep.durationDays ?? 0)) {
            updates.durationDays = newDuration;
        }
        if (whatsappGroupUrl !== (selectedBookingForPrep.whatsappGroupUrl || '')) {
            updates.whatsappGroupUrl = whatsappGroupUrl;
        }
        if (Object.keys(updates).length === 0) {
            toast.info('No changes to save.');
            return;
        }
        try {
            await updateBooking(selectedBookingForPrep.id, updates as any);
            toast.success('Tour details saved!');
            await refreshData?.();
        } catch { toast.error('Failed to save tour details'); }
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
                id: `SB-TR-${Date.now()}`,
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

        const bookingUpdates: any = {};
        if (whatsappGroupUrl !== (selectedBookingForPrep.whatsappGroupUrl || '')) {
            bookingUpdates.whatsappGroupUrl = whatsappGroupUrl;
        }
        const newDuration = parseInt(modalDurationDays) || 0;
        if (newDuration > 0 && newDuration !== (selectedBookingForPrep.durationDays ?? 0)) {
            bookingUpdates.durationDays = newDuration;
        }
        if (Object.keys(bookingUpdates).length > 0) {
            await updateBooking(selectedBookingForPrep.id, bookingUpdates as any);
        }

        toast.success(existingTransport ? 'Driver updated' : 'Driver assigned');
        await refreshData?.();
        setPrepModalOpen(false);
    };

    const handleAssignGuide = async () => {
        if (!selectedBookingForPrep || !guideVendorId) return;
        const costVal = parseFloat(guideCost) || 0;

        const existingGuide = selectedBookingForPrep.supplierBookings?.find(sb => sb.serviceType === 'Guide');
        if (existingGuide) {
            await updateSupplierBooking(selectedBookingForPrep.id, existingGuide.id, {
                vendorId: guideVendorId,
                cost: costVal,
                driverName: guideName || undefined,
                driverPhone: guidePhone || undefined,
            });
        } else {
            const newSb: SupplierBooking = {
                id: `SB-GD-${Date.now()}`,
                bookingId: selectedBookingForPrep.id,
                vendorId: guideVendorId,
                serviceType: 'Guide',
                cost: costVal,
                paidAmount: 0,
                paymentStatus: 'Unpaid',
                bookingStatus: 'Confirmed',
                notes: 'Assigned via Operations Console',
                driverName: guideName || undefined,
                driverPhone: guidePhone || undefined,
            };
            await addSupplierBooking(selectedBookingForPrep.id, newSb);
        }
        toast.success(existingGuide ? 'Guide updated' : 'Guide assigned');
        await refreshData?.();
        setPrepModalOpen(false);
    };

    const transportVendors = useMemo(() =>
        vendors.filter((v: any) => v.category === 'Transport'),
        [vendors]);

    const guideVendors = useMemo(() =>
        vendors.filter((v: any) => v.category === 'Guide' || v.category === 'Activity' || v.category === 'Other'),
        [vendors]);

    // Attendance summary counts
    const attSummary = useMemo(() => ({
        present: staff.filter((s: any) => s.attendanceStatus === 'Present').length,
        field: staff.filter((s: any) => s.attendanceStatus === 'Remote' || s.attendanceStatus === 'On Field').length,
        leave: staff.filter((s: any) => s.attendanceStatus === 'On Leave').length,
        absent: staff.filter((s: any) => !s.attendanceStatus || s.attendanceStatus === 'Absent').length,
    }), [staff]);

    const filteredStaff = useMemo(() => {
        return staff.filter((emp: any) => {
            const q = staffSearchQuery.toLowerCase().trim();
            const matchesQuery = !q || (
                emp.name.toLowerCase().includes(q) ||
                (emp.role && emp.role.toLowerCase().includes(q)) ||
                (emp.currentLocation && emp.currentLocation.toLowerCase().includes(q))
            );
            if (!matchesQuery) return false;

            if (staffRoleFilter !== 'all') {
                return emp.role?.toLowerCase() === staffRoleFilter.toLowerCase();
            }
            return true;
        });
    }, [staff, staffSearchQuery, staffRoleFilter]);

    return (
        <div className="flex flex-col h-full admin-page-bg min-h-screen">
            {/* ── Header ── */}
            <div className="bg-white/90 dark:bg-[#1A2633]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                        <div className="p-2 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-xl">
                            <Briefcase size={22} />
                        </div>
                        <span className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">Operations Control Center</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium mt-0.5">
                        Real-time tracking for active tours, transport assignments, deliverable checklists &amp; field staff.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        title="Refresh data"
                        className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all disabled:opacity-50 border border-slate-200/60 dark:border-slate-700/50 shadow-xs"
                    >
                        <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-blue-600' : ''} />
                    </button>
                    <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                        <button
                            onClick={() => setActiveTab('Tours')}
                            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${activeTab === 'Tours' ? 'bg-white dark:bg-slate-700 shadow-xs text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            <Compass size={14} /> Tour Operations
                        </button>
                        <button
                            onClick={() => setActiveTab('Attendance')}
                            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${activeTab === 'Attendance' ? 'bg-white dark:bg-slate-700 shadow-xs text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            <UserCheck size={14} /> Field Attendance
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

                {/* ══ TOURS TAB ══ */}
                {activeTab === 'Tours' && (
                    <div className="max-w-7xl mx-auto space-y-6">

                        {/* ── KPI Summary Dashboard Control Header ── */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                            <div className="bg-white dark:bg-[#1A2633] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden group hover:border-blue-300 transition-all">
                                <div className="flex items-center justify-between text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                    <span>Active Live Tours</span>
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{kpiSummary.activeLiveCount}</span>
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">({kpiSummary.totalLivePax} Guests)</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                                    <div className="bg-green-500 h-full rounded-full" style={{ width: `${Math.min(kpiSummary.activeLiveCount * 25, 100)}%` }}></div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-[#1A2633] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs group hover:border-amber-300 transition-all">
                                <div className="flex items-center justify-between text-xs font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
                                    <span>Attention Required</span>
                                    <AlertTriangle size={15} className="text-amber-500" />
                                </div>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className={`text-3xl font-black tracking-tight ${kpiSummary.attentionNeededCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                                        {kpiSummary.attentionNeededCount}
                                    </span>
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Tours</span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 mt-2 truncate">
                                    {kpiSummary.unassignedTransportCount > 0 ? `${kpiSummary.unassignedTransportCount} missing transport` : 'All transport assigned'}
                                </p>
                            </div>

                            <div className="bg-white dark:bg-[#1A2633] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs group hover:border-blue-300 transition-all">
                                <div className="flex items-center justify-between text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
                                    <span>Upcoming Arrivals</span>
                                    <Calendar size={15} className="text-blue-500" />
                                </div>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{kpiSummary.upcomingCount}</span>
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Next {upcomingDays}d</span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 mt-2">Scheduled tour departures</p>
                            </div>

                            <div className="bg-white dark:bg-[#1A2633] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs group hover:border-indigo-300 transition-all">
                                <div className="flex items-center justify-between text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
                                    <span>Checklist Health</span>
                                    <CheckSquare size={15} className="text-indigo-500" />
                                </div>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                        {kpiSummary.totalDeliverablesCount > 0 ? `${Math.round((kpiSummary.verifiedDeliverablesCount / kpiSummary.totalDeliverablesCount) * 100)}%` : '0%'}
                                    </span>
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">({kpiSummary.verifiedDeliverablesCount}/{kpiSummary.totalDeliverablesCount})</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${kpiSummary.totalDeliverablesCount > 0 ? (kpiSummary.verifiedDeliverablesCount / kpiSummary.totalDeliverablesCount) * 100 : 0}%` }}></div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-[#1A2633] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs group hover:border-emerald-300 transition-all col-span-2 sm:col-span-1">
                                <div className="flex items-center justify-between text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
                                    <span>Field Operations Staff</span>
                                    <UserCheck size={15} className="text-emerald-500" />
                                </div>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{kpiSummary.presentStaff + kpiSummary.fieldStaff}</span>
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">/ {staff.length} Active</span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 mt-2">{kpiSummary.fieldStaff} On Field / Remote</p>
                            </div>
                        </div>

                        {/* ── Search & Filter Controls ── */}
                        <div className="bg-white dark:bg-[#1A2633] p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
                            <div className="relative w-full md:w-80">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search customer, tour, driver or invoice..."
                                    className="w-full pl-10 pr-8 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-medium placeholder-slate-400 outline-none focus:ring-2 ring-blue-500/20 text-slate-900 dark:text-white transition-all"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold">×</button>
                                )}
                            </div>

                            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                                <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1 hidden sm:flex">
                                    <Filter size={12} /> Filter:
                                </span>
                                <button
                                    onClick={() => setStatusFilter('all')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${statusFilter === 'all' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}`}
                                >
                                    All Tours ({tourStats.live.length})
                                </button>
                                <button
                                    onClick={() => setStatusFilter('live')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${statusFilter === 'live' ? 'bg-green-600 text-white shadow-xs' : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100'}`}
                                >
                                    🟢 Live Only
                                </button>
                                <button
                                    onClick={() => setStatusFilter('attention')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${statusFilter === 'attention' ? 'bg-red-600 text-white shadow-xs' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100'}`}
                                >
                                    ⚠️ Needs Attention ({faults.length})
                                </button>
                                <button
                                    onClick={() => setStatusFilter('unassigned')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${statusFilter === 'unassigned' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100'}`}
                                >
                                    🚗 Transport Pending ({kpiSummary.unassignedTransportCount})
                                </button>
                            </div>
                        </div>

                        {/* ── Faults / Alerts Banner ── */}
                        {faults.length > 0 && (
                            <div className="mb-2 animate-in fade-in slide-in-from-top-2">
                                <button
                                    onClick={() => setFaultPanelOpen(v => !v)}
                                    className="w-full flex items-center justify-between px-5 py-3.5 bg-red-50/90 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl text-left group transition-all hover:bg-red-100/80 dark:hover:bg-red-900/30 shadow-xs"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="relative flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                        </span>
                                        <AlertTriangle size={17} className="text-red-500" />
                                        <span className="font-extrabold text-red-800 dark:text-red-300 text-sm">
                                            {faults.length} Tour{faults.length > 1 ? 's' : ''} Need Operational Attention
                                        </span>
                                        <span className="text-xs text-red-600 dark:text-red-400 font-semibold hidden sm:inline">
                                            — {faults.reduce((acc, f) => acc + f.issues.length, 0)} total fault{faults.reduce((acc, f) => acc + f.issues.length, 0) > 1 ? 's' : ''} detected
                                        </span>
                                    </div>
                                    <span className="text-red-500 text-xs font-black">{faultPanelOpen ? '▲ Hide' : '▼ View Alerts'}</span>
                                </button>

                                {faultPanelOpen && (
                                    <div className="mt-2 bg-white dark:bg-[#1A2633] border border-red-200 dark:border-red-800/30 rounded-2xl overflow-hidden shadow-xs divide-y divide-red-50 dark:divide-red-900/20">
                                        {faults.map(({ tour, issues }) => (
                                            <div key={tour.id} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-colors">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-extrabold text-slate-900 dark:text-white text-sm">{tour.customer}</p>
                                                        <span className="text-slate-400 font-mono text-xs">#{tour.invoiceNo || tour.id}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 font-medium mt-0.5">{tour.title}</p>
                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                        {issues.map((issue, i) => (
                                                            <span
                                                                key={i}
                                                                className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                                                                    issue.type === 'issue'
                                                                        ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                                                                        : issue.type === 'no-driver'
                                                                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                                                                        : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                                                                }`}
                                                            >
                                                                {issue.type === 'issue' && '🔴'}
                                                                {issue.type === 'no-driver' && '🚗'}
                                                                {issue.type === 'no-guide' && '🗣️'}
                                                                {issue.label}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 flex-shrink-0 self-end sm:self-center">
                                                    {!tour.supplierBookings?.some(sb => sb.serviceType === 'Transport') && (
                                                        <button
                                                            onClick={() => openPrepModal(tour)}
                                                            className="text-xs font-bold px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-xs transition-colors"
                                                        >
                                                            Assign Transport
                                                        </button>
                                                    )}
                                                    {(tour as any).liveStatus === 'Issue' && (
                                                        <button
                                                            onClick={() => handleLiveStatusChange(tour.id, 'Live')}
                                                            className="text-xs font-bold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors"
                                                        >
                                                            Mark Resolved
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Live Tours Section */}
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                    </span>
                                    Live Tours Currently On Field ({filteredLive.length})
                                </span>
                                {searchQuery && (
                                    <span className="text-xs font-medium text-slate-400">Filtered from {tourStats.live.length} total live</span>
                                )}
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {filteredLive.map(tour => {
                                    const assignedTransport = tour.supplierBookings?.find(sb => sb.serviceType === 'Transport');
                                    const transportVendor = assignedTransport ? vendors.find((v: any) => v.id === assignedTransport.vendorId) : null;
                                    const driverDisplayName = assignedTransport
                                        ? (transportVendor?.name || assignedTransport.driverName || 'Assigned')
                                        : 'Not Assigned';

                                    const assignedGuide = tour.supplierBookings?.find(sb => sb.serviceType === 'Guide');
                                    const guideVendor = assignedGuide ? vendors.find((v: any) => v.id === assignedGuide.vendorId) : null;
                                    const guideDisplayName = assignedGuide
                                        ? (guideVendor?.name || assignedGuide.driverName || 'Assigned')
                                        : null;

                                    const { day: dayOfTour, percent: progressPercent } = getTourProgress(tour.date, tour.duration);
                                    const endDateLabel = (tour as any).liveEndDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

                                    const formattedPhone = tour.phone?.replace(/\D/g, '');
                                    const waPhone = formattedPhone ? (formattedPhone.length === 10 ? `91${formattedPhone}` : formattedPhone) : '';
                                    const directWaUrl = waPhone ? `https://wa.me/${waPhone}` : '';
                                    const groupWaUrl = tour.whatsappGroupUrl;

                                    const hasFault = faults.some(f => f.tour.id === tour.id);
                                    const isIssue = (tour as any).liveStatus === 'Issue';

                                    // Deliverables stats calculation for tour card summary
                                    const tourDeliverables = deliverables[tour.id] || [];
                                    const totalDeliverablesCount = tourDeliverables.length;
                                    const verifiedDeliverablesCount = tourDeliverables.filter(d => d.status === 'Verified Success').length;

                                    return (
                                        <div key={tour.id} className={`bg-white dark:bg-[#1A2633] p-5 rounded-2xl border shadow-sm relative overflow-hidden transition-all flex flex-col justify-between ${
                                            isIssue
                                                ? 'border-red-400 dark:border-red-700/80 ring-2 ring-red-100 dark:ring-red-900/30'
                                                : hasFault
                                                ? 'border-amber-400 dark:border-amber-700/80 ring-2 ring-amber-100 dark:ring-amber-900/30'
                                                : 'border-slate-200/80 dark:border-slate-800 hover:border-blue-300'
                                        }`}>
                                            <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
                                                <Map size={90} className="text-blue-600" />
                                            </div>

                                            <div>
                                                {/* Header Status Row */}
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                                                        isIssue
                                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                                            : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                                                    }`}>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                                        {isIssue ? 'Issue Flagged' : 'On Tour'}
                                                    </span>
                                                    <button
                                                        onClick={() => navigate(`/admin/bookings?search=${encodeURIComponent(tour.customer)}`)}
                                                        className="text-slate-400 hover:text-blue-600 text-xs font-mono font-bold transition-colors"
                                                        title="View in Bookings"
                                                    >
                                                        #{tour.invoiceNo || tour.id}
                                                    </button>
                                                </div>

                                                <h4
                                                    onClick={() => navigate(`/admin/customers?search=${encodeURIComponent(tour.customer)}`)}
                                                    className="font-black text-slate-900 dark:text-white text-lg truncate cursor-pointer hover:text-blue-600 transition-colors"
                                                    title={`View ${tour.customer} in Customers`}
                                                >
                                                    {tour.customer}
                                                </h4>
                                                <p className="text-xs text-slate-500 font-semibold mb-4 truncate" title={tour.title}>
                                                    {tour.title}
                                                </p>

                                                {/* Dynamic Tour Progress Bar */}
                                                <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 mb-4">
                                                    <div className="flex items-center justify-between text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar size={13} className="text-blue-500" />
                                                            Day {dayOfTour} of {tour.duration}
                                                            {(tour as any).durationEstimated && (
                                                                <span className="text-amber-500 font-bold text-[9px] bg-amber-50 dark:bg-amber-900/20 px-1 py-0.2 rounded" title="Estimated duration">⚠ Est</span>
                                                            )}
                                                        </span>
                                                        <span className="text-blue-600 dark:text-blue-400 font-bold">{progressPercent}%</span>
                                                    </div>
                                                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium mt-1.5">
                                                        <span>Start: {formatLocalDate(tour.date)}</span>
                                                        <span>End: {endDateLabel}</span>
                                                    </div>
                                                </div>

                                                {/* Tour Info Badges */}
                                                <div className="space-y-2 text-xs">
                                                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-bold">
                                                        <span className="flex items-center gap-1.5"><Users size={13} className="text-slate-400" /> Guests:</span>
                                                        <span className="text-slate-900 dark:text-white font-extrabold">
                                                            {(tour as any).paxUnknown ? '? Guests' : `${tour.paxCount} Pax`}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-bold">
                                                        <span className="flex items-center gap-1.5"><Car size={13} className="text-slate-400" /> Transport:</span>
                                                        {assignedTransport && transportVendor ? (
                                                            <button
                                                                onClick={() => navigate(`/admin/vendors?search=${encodeURIComponent(transportVendor.name)}`)}
                                                                className="text-blue-600 hover:underline font-extrabold truncate max-w-[140px] text-right"
                                                            >
                                                                {driverDisplayName}
                                                            </button>
                                                        ) : (
                                                            <span className="text-amber-600 dark:text-amber-400 font-black flex items-center gap-1">
                                                                <AlertTriangle size={11} /> Unassigned
                                                            </span>
                                                        )}
                                                    </div>

                                                    {assignedGuide && (
                                                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-bold">
                                                            <span className="flex items-center gap-1.5">🗣️ Tour Guide:</span>
                                                            <span className="text-slate-900 dark:text-white font-extrabold truncate max-w-[140px] text-right">
                                                                {guideDisplayName}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* ─── Daily Deliverables Checklist Accordion ─── */}
                                                {(() => {
                                                    const currentChecklistDay = selectedDays[tour.id] || dayOfTour;
                                                    const dayItems = tourDeliverables.filter(d => d.dayNumber === currentChecklistDay);
                                                    const dayTotal = dayItems.length;
                                                    const dayVerified = dayItems.filter(d => d.status === 'Verified Success').length;
                                                    const isExpanded = !!expandedChecklists[tour.id];

                                                    return (
                                                        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800">
                                                            <button
                                                                onClick={() => {
                                                                    const nowExpanded = !expandedChecklists[tour.id];
                                                                    setExpandedChecklists(prev => ({ ...prev, [tour.id]: nowExpanded }));
                                                                    if (nowExpanded && !deliverables[tour.id]) {
                                                                        fetchDeliverableForBooking(tour.id);
                                                                    }
                                                                }}
                                                                className="w-full flex items-center justify-between text-xs font-extrabold text-slate-700 dark:text-slate-300 hover:text-blue-600 transition-colors p-1 rounded-lg"
                                                            >
                                                                <span className="flex items-center gap-1.5">
                                                                    <CheckCircle size={14} className={dayVerified === dayTotal && dayTotal > 0 ? "text-green-500" : "text-slate-400"} />
                                                                    <span>Day {currentChecklistDay} Deliverables ({dayVerified}/{dayTotal})</span>
                                                                </span>
                                                                <span className="text-slate-400">{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
                                                            </button>

                                                            {isExpanded && (
                                                                <div className="mt-2.5 space-y-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 animate-in fade-in">
                                                                    {loadingDeliverables[tour.id] ? (
                                                                        <div className="text-center py-4 text-xs text-slate-400 font-medium">Loading checklist...</div>
                                                                    ) : (
                                                                        <>
                                                                            {/* Day Selector Buttons & Mark All Action */}
                                                                            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2 gap-2">
                                                                                <div className="flex flex-wrap gap-1">
                                                                                    {Array.from({ length: tour.duration }, (_, i) => i + 1).map(dayNum => (
                                                                                        <button
                                                                                            key={dayNum}
                                                                                            onClick={() => setSelectedDays(prev => ({ ...prev, [tour.id]: dayNum }))}
                                                                                            className={`px-2 py-0.5 text-[10px] font-black rounded-md transition-all ${
                                                                                                currentChecklistDay === dayNum
                                                                                                    ? 'bg-blue-600 text-white shadow-xs'
                                                                                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                                                                                            }`}
                                                                                        >
                                                                                            D{dayNum}
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                                {dayTotal > 0 && dayVerified < dayTotal && (
                                                                                    <button
                                                                                        onClick={() => handleMarkAllVerified(tour.id, currentChecklistDay)}
                                                                                        className="text-[10px] font-bold text-emerald-600 hover:underline whitespace-nowrap"
                                                                                    >
                                                                                        ✓ Mark All Verified
                                                                                    </button>
                                                                                )}
                                                                            </div>

                                                                            {dayTotal === 0 ? (
                                                                                <div className="text-center py-3">
                                                                                    <p className="text-[11px] text-slate-400 font-medium mb-2">No checklist items generated.</p>
                                                                                    <button
                                                                                        onClick={() => handleGenerateChecklist(tour, tour.duration)}
                                                                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition-colors inline-flex items-center gap-1 shadow-xs"
                                                                                    >
                                                                                        <Plus size={11} /> Auto-Generate Checklist
                                                                                    </button>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                                                                    {dayItems.map(item => {
                                                                                        const isSuccess = item.status === 'Verified Success';
                                                                                        const isDelayed = item.status === 'Delayed';
                                                                                        const isSubstituted = item.status === 'Substituted';

                                                                                        return (
                                                                                            <div key={item.id} className="flex flex-col gap-1 bg-white dark:bg-slate-800/70 p-2 rounded-lg border border-slate-100 dark:border-slate-800 group/item">
                                                                                                <div className="flex items-start justify-between gap-2">
                                                                                                    <label className="flex items-start gap-2 cursor-pointer flex-1">
                                                                                                        <input
                                                                                                            type="checkbox"
                                                                                                            checked={isSuccess}
                                                                                                            onChange={(e) => handleUpdateStatus(
                                                                                                                item.id,
                                                                                                                tour.id,
                                                                                                                e.target.checked ? 'Verified Success' : 'Pending',
                                                                                                                item.notes
                                                                                                            )}
                                                                                                            className="mt-0.5 size-3.5 rounded text-blue-600 border-slate-300 focus:ring-blue-500/20 cursor-pointer"
                                                                                                        />
                                                                                                        <div className="flex flex-col flex-1">
                                                                                                            <span className={`text-[11px] font-bold ${isSuccess ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                                                                                                {getDeliverableCategoryIcon(item.itemType)} {item.itemName}
                                                                                                            </span>
                                                                                                            {item.scheduledTime && (
                                                                                                                <span className="text-[9px] text-slate-400 font-mono flex items-center gap-0.5">
                                                                                                                    <Clock size={8} /> {item.scheduledTime}
                                                                                                                </span>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </label>

                                                                                                    <div className="flex items-center gap-1">
                                                                                                        <select
                                                                                                            value={item.status}
                                                                                                            onChange={(e) => {
                                                                                                                const newStatus = e.target.value;
                                                                                                                if (newStatus === 'Substituted' || newStatus === 'Delayed') {
                                                                                                                    const notesVal = window.prompt(`Enter reason for ${newStatus}:`, item.notes || '');
                                                                                                                    if (notesVal !== null) {
                                                                                                                        handleUpdateStatus(item.id, tour.id, newStatus as any, notesVal);
                                                                                                                    }
                                                                                                                } else {
                                                                                                                    handleUpdateStatus(item.id, tour.id, newStatus as any, undefined);
                                                                                                                }
                                                                                                            }}
                                                                                                            className={`px-1.5 py-0.5 text-[9px] font-black rounded border border-slate-200 dark:border-slate-700 outline-none cursor-pointer bg-slate-50 dark:bg-slate-800 ${
                                                                                                                isSuccess ? 'text-green-600 dark:text-green-400' :
                                                                                                                isDelayed ? 'text-red-500' :
                                                                                                                isSubstituted ? 'text-purple-500' :
                                                                                                                'text-slate-500'
                                                                                                            }`}
                                                                                                        >
                                                                                                            <option value="Pending">Pending</option>
                                                                                                            <option value="Verified Success">Success</option>
                                                                                                            <option value="Delayed">Delayed</option>
                                                                                                            <option value="Substituted">Substituted</option>
                                                                                                        </select>

                                                                                                        <button
                                                                                                            onClick={() => handleDeleteDeliverable(item.id, tour.id)}
                                                                                                            className="text-slate-300 hover:text-red-500 p-0.5 rounded opacity-0 group-hover/item:opacity-100 transition-opacity"
                                                                                                            title="Delete item"
                                                                                                        >
                                                                                                            <Trash2 size={10} />
                                                                                                        </button>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            )}

                                                                            {/* Custom Deliverable Input */}
                                                                            <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center gap-1">
                                                                                <input
                                                                                    type="text"
                                                                                    value={newDeliverableName[tour.id] || ''}
                                                                                    onChange={(e) => setNewDeliverableName(prev => ({ ...prev, [tour.id]: e.target.value }))}
                                                                                    placeholder="Add item..."
                                                                                    className="flex-1 min-w-0 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] placeholder-slate-400 outline-none text-slate-800 dark:text-slate-200"
                                                                                />
                                                                                <select
                                                                                    value={newDeliverableType[tour.id] || 'other'}
                                                                                    onChange={(e) => setNewDeliverableType(prev => ({ ...prev, [tour.id]: e.target.value as any }))}
                                                                                    className="px-1 py-1 bg-white dark:bg-slate-800 text-[10px] rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 outline-none"
                                                                                >
                                                                                    <option value="other">⚙️</option>
                                                                                    <option value="meal">🍛</option>
                                                                                    <option value="transport">🚗</option>
                                                                                    <option value="guide">🗣️</option>
                                                                                    <option value="activity">🎟️</option>
                                                                                    <option value="hotel">🏨</option>
                                                                                </select>
                                                                                <button
                                                                                    onClick={() => handleAddCustomDeliverable(tour.id, currentChecklistDay)}
                                                                                    className="p-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
                                                                                >
                                                                                    <Plus size={10} />
                                                                                </button>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {/* Action Buttons Row */}
                                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                                <div className="flex gap-1.5">
                                                    {directWaUrl && (
                                                        <button
                                                            onClick={() => window.open(directWaUrl, '_blank')}
                                                            className="flex-1 py-1.5 px-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1"
                                                            title="Chat with Customer on WhatsApp"
                                                        >
                                                            <MessageSquare size={12} /> Customer WA
                                                        </button>
                                                    )}
                                                    {groupWaUrl && (
                                                        <button
                                                            onClick={() => window.open(formatExternalUrl(groupWaUrl), '_blank')}
                                                            className="flex-1 py-1.5 px-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1"
                                                            title="Open WhatsApp Group"
                                                        >
                                                            <Users size={12} /> WA Group
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="flex gap-2">
                                                    <select
                                                        value={tour.liveStatus || 'Live'}
                                                        onChange={(e) => handleLiveStatusChange(tour.id, e.target.value)}
                                                        className="px-2 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl border-none outline-none cursor-pointer"
                                                    >
                                                        <option value="Live">🟢 Force Live</option>
                                                        <option value="Issue">🔴 Flag Issue</option>
                                                        <option value="Auto">⚡ Auto (Date)</option>
                                                        <option value="Cancelled">❌ Cancel</option>
                                                    </select>

                                                    <button
                                                        onClick={() => openPrepModal(tour)}
                                                        className="flex-1 py-1.5 px-3 bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1"
                                                    >
                                                        <Car size={12} /> Assign Supplier
                                                    </button>

                                                    <button
                                                        onClick={() => navigate(`/admin/bookings?search=${tour.id}`)}
                                                        className="py-1.5 px-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors"
                                                    >
                                                        Details
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {filteredLive.length === 0 && (
                                    <div className="col-span-1 md:col-span-2 lg:col-span-3 py-12 text-center bg-white dark:bg-[#1A2633] rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                                        <Compass size={36} className="mx-auto text-slate-300 mb-2" />
                                        <p className="text-slate-500 font-bold">No active live tours match your current filter.</p>
                                        <p className="text-xs text-slate-400 mt-1">Try adjusting search or status filter options.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Upcoming Arrivals Section */}
                        <div className="mt-8">
                            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <Calendar className="text-blue-500" size={20} />
                                    Upcoming Arrivals ({filteredUpcoming.length})
                                </h3>
                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-0.5 border border-slate-200/60 dark:border-slate-700/60">
                                    {([7, 14, 30, 60] as const).map(d => (
                                        <button
                                            key={d}
                                            onClick={() => setUpcomingDays(d)}
                                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                                upcomingDays === d
                                                    ? 'bg-white dark:bg-slate-700 shadow-xs text-blue-600 dark:text-blue-400'
                                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                            }`}
                                        >
                                            {d}d Window
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white dark:bg-[#1A2633] rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-[11px] uppercase font-black text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                        <tr>
                                            <th className="px-6 py-3.5">Start Date</th>
                                            <th className="px-6 py-3.5">Customer &amp; Pax</th>
                                            <th className="px-6 py-3.5">Package Title</th>
                                            <th className="px-6 py-3.5">Supplier Assignments</th>
                                            <th className="px-6 py-3.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                                        {filteredUpcoming.map(tour => {
                                            const assignedTransport = tour.supplierBookings?.find(sb => sb.serviceType === 'Transport');
                                            const vendorName = assignedTransport ? vendors.find((v: any) => v.id === assignedTransport.vendorId)?.name : null;
                                            const driverLabel = vendorName || assignedTransport?.driverName || null;

                                            return (
                                                <tr key={tour.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="px-6 py-4 font-black text-blue-600 dark:text-blue-400">
                                                        {formatLocalDate(tour.date)}
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                                                        <div>{tour.customer}</div>
                                                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                                                            {(tour as any).paxUnknown ? '? Pax' : `${tour.paxCount} Pax`}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">{tour.title}</td>
                                                    <td className="px-6 py-4">
                                                        {driverLabel ? (
                                                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                                                                <CheckCircle size={13} /> {driverLabel}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded">
                                                                <AlertTriangle size={12} /> Transport Pending
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => openPrepModal(tour)}
                                                            className="text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 px-3 py-1.5 rounded-xl font-bold text-xs transition-colors"
                                                        >
                                                            {driverLabel ? 'Manage Supplier' : 'Assign Driver'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredUpcoming.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-medium">
                                                    No upcoming tours scheduled in the next {upcomingDays} days matching filters.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Recently Completed Tours Section */}
                        {filteredCompleted.length > 0 && (
                            <div className="mt-8">
                                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                        <CheckCircle className="text-slate-400" size={20} />
                                        Recently Completed ({filteredCompleted.length})
                                    </h3>
                                    {filteredCompleted.length > 10 && (
                                        <button
                                            onClick={() => setShowAllCompleted(v => !v)}
                                            className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            {showAllCompleted ? 'Show Less ▲' : `Show All ${filteredCompleted.length} ▼`}
                                        </button>
                                    )}
                                </div>
                                <div className="bg-white dark:bg-[#1A2633] rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-[11px] uppercase font-black text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                            <tr>
                                                <th className="px-6 py-3.5">End Date</th>
                                                <th className="px-6 py-3.5">Customer</th>
                                                <th className="px-6 py-3.5">Package</th>
                                                <th className="px-6 py-3.5">Status</th>
                                                <th className="px-6 py-3.5 text-right">Booking</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                                            {(showAllCompleted ? filteredCompleted : filteredCompleted.slice(0, 10)).map(tour => {
                                                return (
                                                    <tr key={tour.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 opacity-85 transition-colors">
                                                        <td className="px-6 py-4 text-slate-500 font-mono">{formatLocalDate(tour.date)}</td>
                                                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{tour.customer}</td>
                                                        <td className="px-6 py-4 text-slate-500 font-medium">{tour.title}</td>
                                                        <td className="px-6 py-4">
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                                                <CheckCircle size={10} /> Tour Completed
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={() => navigate(`/admin/bookings?search=${tour.id}`)}
                                                                className="text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-xl font-bold text-xs transition-colors"
                                                            >
                                                                View Details
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ══ ATTENDANCE TAB ══ */}
                {activeTab === 'Attendance' && (
                    <div className="max-w-5xl mx-auto space-y-5">
                        {/* Attendance Summary Stat Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/50">
                                <div className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase">Present</div>
                                <div className="text-2xl font-black text-emerald-800 dark:text-emerald-300 mt-1">{attSummary.present}</div>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-200/60 dark:border-blue-800/50">
                                <div className="text-xs font-extrabold text-blue-700 dark:text-blue-400 uppercase">On Field / Remote</div>
                                <div className="text-2xl font-black text-blue-800 dark:text-blue-300 mt-1">{attSummary.field}</div>
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-200/60 dark:border-amber-800/50">
                                <div className="text-xs font-extrabold text-amber-700 dark:text-amber-400 uppercase">On Leave</div>
                                <div className="text-2xl font-black text-amber-800 dark:text-amber-300 mt-1">{attSummary.leave}</div>
                            </div>
                            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl border border-red-200/60 dark:border-red-800/50">
                                <div className="text-xs font-extrabold text-red-700 dark:text-red-400 uppercase">Absent</div>
                                <div className="text-2xl font-black text-red-800 dark:text-red-300 mt-1">{attSummary.absent}</div>
                            </div>
                        </div>

                        {/* Search & Filter Bar for Staff */}
                        <div className="bg-white dark:bg-[#1A2633] p-4 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
                            <div className="relative w-full sm:w-72">
                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={staffSearchQuery}
                                    onChange={(e) => setStaffSearchQuery(e.target.value)}
                                    placeholder="Search staff by name or role..."
                                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none text-slate-900 dark:text-white"
                                />
                            </div>

                            <select
                                value={staffRoleFilter}
                                onChange={(e) => setStaffRoleFilter(e.target.value)}
                                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl outline-none text-slate-700 dark:text-slate-300"
                            >
                                <option value="all">All Staff Roles</option>
                                <option value="admin">Admin</option>
                                <option value="operations">Operations</option>
                                <option value="driver">Driver</option>
                                <option value="guide">Guide</option>
                            </select>
                        </div>

                        <div className="bg-white dark:bg-[#1A2633] rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 text-[11px] uppercase font-black text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                    <tr>
                                        <th className="px-6 py-4">Employee</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Check-In</th>
                                        <th className="px-6 py-4">Current Location</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                                    {filteredStaff.map((emp: any) => (
                                        <tr key={emp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
                                                    <div
                                                        style={{ backgroundColor: getAvatarBg(emp.color) }}
                                                        className="size-8 rounded-full flex items-center justify-center text-xs text-white font-black flex-shrink-0 shadow-xs"
                                                    >
                                                        {emp.initials}
                                                    </div>
                                                    <div>
                                                        <div>{emp.name}</div>
                                                        <div className="text-[10px] text-slate-400 font-semibold capitalize">{emp.role}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={emp.attendanceStatus || 'Absent'}
                                                    onChange={(e) => handleStatusChange(emp.id, e.target.value)}
                                                    disabled={!isAdmin && Number(currentUser?.id) !== emp.id && Number((currentUser as any)?.staffId) !== emp.id}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-black border-none outline-none cursor-pointer disabled:opacity-50
                                                        ${emp.attendanceStatus === 'Present' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' :
                                                            emp.attendanceStatus === 'On Field' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                                                                emp.attendanceStatus === 'Remote' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300' :
                                                                    emp.attendanceStatus === 'On Leave' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' :
                                                                        'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'}`}
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
                                                    {emp.attendanceStatus && emp.attendanceStatus !== 'Absent' && emp.checkInTime && emp.checkInTime !== '-' && (isAdmin || Number(currentUser?.id) === emp.id || Number((currentUser as any)?.staffId) === emp.id) && (
                                                        <button onClick={() => handleCheckOut(emp.id)} className="text-[10px] text-red-500 hover:text-red-700 font-black flex items-center gap-0.5 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-md" title="Check Out">
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
                                                        disabled={!isAdmin && Number(currentUser?.id) !== emp.id && Number((currentUser as any)?.staffId) !== emp.id}
                                                        className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none w-36 transition-colors text-xs font-semibold disabled:opacity-50 text-slate-800 dark:text-slate-200"
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

            {/* ══ PREP / SUPPLIER ASSIGNMENT MODAL ══ */}
            {prepModalOpen && selectedBookingForPrep && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A2633] rounded-3xl w-full max-w-lg shadow-2xl p-6 relative overflow-y-auto max-h-[90vh] border border-slate-200 dark:border-slate-800">
                        <button
                            onClick={() => setPrepModalOpen(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600"
                        >
                            <XCircle size={20} />
                        </button>

                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                            <Car className="text-blue-600" size={22} /> Supplier &amp; Staff Assignment
                        </h3>
                        <p className="text-xs text-slate-500 mb-5 font-medium">
                            Assign transport drivers and tour guides for <strong>{selectedBookingForPrep.customer}</strong>.
                        </p>

                        <div className="space-y-5">
                            {/* Section 1: Driver / Transport */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                                <h4 className="text-xs font-black uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                    <Car size={14} /> Transport / Vehicle Assignment
                                </h4>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Transport Agency / Vendor</label>
                                    <select
                                        value={driverVendorId}
                                        onChange={(e) => setDriverVendorId(e.target.value)}
                                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs font-bold text-slate-800 dark:text-slate-200"
                                    >
                                        <option value="">-- Select Transport Vendor --</option>
                                        {transportVendors.map((v: any) => (
                                            <option key={v.id} value={v.id}>{v.name} ({v.location})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-2.5">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Driver Name</label>
                                        <input type="text" value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="e.g. Ramesh Kumar" className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Driver Phone</label>
                                        <input type="tel" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} placeholder="+91 98765 43210" className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2.5">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Vehicle Number</label>
                                        <input type="text" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="e.g. HP 01 AB 1234" className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cost (₹)</label>
                                        <input type="number" value={driverCost} onChange={(e) => setDriverCost(e.target.value)} placeholder="0" className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs" />
                                    </div>
                                </div>

                                <button
                                    onClick={handleAssignDriver}
                                    disabled={!driverVendorId}
                                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors disabled:opacity-50 shadow-xs"
                                >
                                    Confirm Transport Assignment
                                </button>
                            </div>

                            {/* Section 2: Tour Guide / Escort */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                                <h4 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                    🗣️ Tour Guide / Field Coordinator
                                </h4>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Select Guide / Agency</label>
                                    <select
                                        value={guideVendorId}
                                        onChange={(e) => setGuideVendorId(e.target.value)}
                                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs font-bold text-slate-800 dark:text-slate-200"
                                    >
                                        <option value="">-- Select Guide --</option>
                                        {guideVendors.map((v: any) => (
                                            <option key={v.id} value={v.id}>{v.name} ({v.category})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-2.5">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Guide Name</label>
                                        <input type="text" value={guideName} onChange={(e) => setGuideName(e.target.value)} placeholder="e.g. Vikram Sharma" className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Guide Phone</label>
                                        <input type="tel" value={guidePhone} onChange={(e) => setGuidePhone(e.target.value)} placeholder="+91 99999 11111" className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs" />
                                    </div>
                                </div>

                                <button
                                    onClick={handleAssignGuide}
                                    disabled={!guideVendorId}
                                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors disabled:opacity-50 shadow-xs"
                                >
                                    Confirm Guide Assignment
                                </button>
                            </div>

                            {/* Section 3: Tour Parameters & WhatsApp */}
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tour Duration (Days)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={modalDurationDays}
                                        onChange={(e) => setModalDurationDays(e.target.value)}
                                        placeholder="e.g. 5"
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs font-bold text-slate-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">WhatsApp Group Link</label>
                                    <input
                                        type="url"
                                        value={whatsappGroupUrl}
                                        onChange={(e) => setWhatsappGroupUrl(e.target.value)}
                                        placeholder="https://chat.whatsapp.com/..."
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs font-bold text-slate-900 dark:text-white"
                                    />
                                </div>

                                <button
                                    onClick={handleSaveBookingDetails}
                                    className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-xs transition-colors"
                                >
                                    💾 Save Duration &amp; WA Group
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
