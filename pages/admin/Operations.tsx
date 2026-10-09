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
import { TourChecklistModal } from '../../components/admin/TourChecklistModal';
import {
    getBookingReadiness, getBalanceFlag, getAttentionFlags,
    READINESS_STYLES, BALANCE_FLAG_STYLES, type ReadinessLevel
} from '../../utils/tourReadiness';

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
    return d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : (dateStr || '');
};

/** Format booking badge reference cleanly without long raw UUIDs */
const formatBookingBadge = (b: Booking): string => {
    if (b.bookingNumber) return `BK-${String(b.bookingNumber).padStart(4, '0')}`;
    if (b.invoiceNo && !b.invoiceNo.startsWith('INV-') && b.invoiceNo.length <= 16) return `#${b.invoiceNo}`;
    if (b.invoiceNo && b.invoiceNo.startsWith('INV-') && b.invoiceNo.length <= 16) return `#${b.invoiceNo}`;
    if (b.id) return `#BK-${b.id.slice(0, 8).toUpperCase()}`;
    return '#BK';
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
        return { day: 1, percent: 0 };
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
    const [isRefreshing, setIsRefreshing] = useState(false);

    // ─── Search & Filters ─────────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'attention' | 'unassigned' | 'upcoming'>('all');

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

            // ── Priority 2: UPCOMING (Start date is strictly in the future) ──
            // Future departures always belong in Upcoming, never on-field today
            if (start > today) {
                if (start <= upcomingCutoff) {
                    upcoming.push({ ...b, paxCount, paxUnknown });
                }
                return;
            }

            // ── Priority 3: LIVE (Today falls within tour start & end date) ──
            if ((start <= today && end >= today) || (liveStatusRaw === 'Live' && end >= today)) {
                live.push({ ...b, paxCount, duration, liveEndDate: end, durationEstimated });
                return;
            }

            // ── Priority 4: COMPLETED / PAST TOURS (End date in past) ──
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
        const list: { tour: Booking; issues: { type: 'issue' | 'no-driver' | 'no-guide'; label: string }[] }[] = [];

        // 1. Check live tours
        tourStats.live.forEach(tour => {
            const issues: { type: 'issue' | 'no-driver' | 'no-guide'; label: string }[] = [];

            if ((tour as any).liveStatus === 'Issue') {
                issues.push({ type: 'issue', label: 'Flagged as Issue by team' });
            }

            const hasTransport = tour.supplierBookings?.some(sb => sb.serviceType === 'Transport' || sb.serviceType?.includes('Transport'));
            if (!hasTransport) {
                issues.push({ type: 'no-driver', label: 'No transport / driver assigned' });
            }

            const hasGuide = tour.supplierBookings?.some(sb => sb.serviceType === 'Guide' || sb.serviceType?.includes('Guide'));
            const pkg = packages.find((p: any) => p.id === tour.packageId || p.title === tour.title);
            const mentionsGuide = pkg?.itinerary?.some((i: any) => i.desc?.toLowerCase().includes('guide'));
            if (mentionsGuide && !hasGuide) {
                issues.push({ type: 'no-guide', label: 'No tour guide assigned' });
            }

            if (issues.length > 0) {
                list.push({ tour, issues });
            }
        });

        // 2. Check upcoming tours with explicitly flagged issues
        tourStats.upcoming.forEach(tour => {
            if ((tour as any).liveStatus === 'Issue') {
                list.push({
                    tour: tour as any,
                    issues: [{ type: 'issue', label: 'Flagged as Issue by team' }]
                });
            }
        });

        return list;
    }, [tourStats.live, tourStats.upcoming, packages]);

    const [faultPanelOpen, setFaultPanelOpen] = useState(true);

    // ─── KPI Control Header Metrics ──────────────────────────────────────────
    const kpiSummary = useMemo(() => {
        const activeLiveCount = tourStats.live.length;
        const totalLivePax = tourStats.live.reduce((acc, t) => acc + (t.paxCount || 0), 0);
        const attentionNeededCount = faults.length;
        const unassignedTransportCount = tourStats.live.filter(t => !t.supplierBookings?.some(sb => sb.serviceType === 'Transport' || sb.serviceType?.includes('Transport'))).length;
        const upcomingCount = tourStats.upcoming.length;

        let totalItems = 0;
        let verifiedItems = 0;
        tourStats.live.forEach(t => {
            const tourDeliverables = deliverables[t.id] || [];
            totalItems += tourDeliverables.length;
            verifiedItems += tourDeliverables.filter(d => d.status === 'Verified Success').length;
        });

        const completedCount = tourStats.completed.length;

        return {
            activeLiveCount,
            totalLivePax,
            attentionNeededCount,
            unassignedTransportCount,
            upcomingCount,
            totalDeliverablesCount: totalItems,
            verifiedDeliverablesCount: verifiedItems,
            completedCount
        };
    }, [tourStats, faults, deliverables]);

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
                return !t.supplierBookings?.some(sb => sb.serviceType === 'Transport' || sb.serviceType?.includes('Transport'));
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

    const handleLiveStatusChange = async (bookingId: string, liveStatus: string) => {
        try {
            const isAuto = liveStatus === 'Auto' || liveStatus === 'Resolved';
            const updatePayload: any = { liveStatus: isAuto ? null : liveStatus };
            await updateBooking(bookingId, updatePayload);
            window.dispatchEvent(new CustomEvent('bookings-changed'));
            toast.success(isAuto ? 'Reset to automatic date classification' : `Tour operational status set to ${liveStatus}`);
        } catch { toast.error('Failed to update tour status'); }
    };

    // ─── Phase 1: Operational Extensions (Guest Program & Checklists) ────────
    const [operationsTab, setOperationsTab] = useState<'live' | 'guest-program' | 'pre-tour-checklists'>('live');
    const [programDate, setProgramDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
    const [selectedBookingForChecklistId, setSelectedBookingForChecklistId] = useState<string | null>(null);
    const selectedBookingForChecklist = useMemo(() => {
        if (!selectedBookingForChecklistId || !bookings) return null;
        return (bookings as Booking[]).find((b: Booking) => b.id === selectedBookingForChecklistId) || null;
    }, [bookings, selectedBookingForChecklistId]);
    const [checklistFilter, setChecklistFilter] = useState<'all' | 'ready' | 'pending'>('all');
    const [guestProgramSearch, setGuestProgramSearch] = useState('');
    const [attentionOnly, setAttentionOnly] = useState(false);

    // Guest Program calculation (Screenshot 23)
    const guestProgramData = useMemo(() => {
        const targetDate = parseLocalDate(programDate);
        if (!targetDate) return [];

        const activeList: Array<{
            booking: Booking;
            currentDay: number;
            totalDays: number;
            percent: number;
            todayItineraryTitle: string;
            todayItineraryDesc: string;
            overnightHotel: string;
            mealPlan: string;
            transportInfo: string;
            driverName: string;
            driverPhone: string;
            vehicleNumber: string;
        }> = [];

        bookings.forEach((b: Booking) => {
            if (b.status === 'Cancelled') return;
            const start = parseLocalDate(b.date);
            if (!start) return;

            const pkg = packages.find((p: any) => p.id === b.packageId || p.title === b.title);
            let duration = b.durationDays || (b.endDate ? Math.max(1, Math.round((parseLocalDate(b.endDate)!.getTime() - start.getTime()) / 86400000) + 1) : 0);
            if (!duration || duration <= 0) {
                duration = pkg?.days || 3;
            }

            const end = new Date(start);
            end.setDate(start.getDate() + (duration - 1));
            end.setHours(23, 59, 59, 999);

            if (targetDate >= start && targetDate <= end) {
                const diffDays = Math.round((targetDate.getTime() - start.getTime()) / 86400000) + 1;
                const currentDay = Math.min(Math.max(diffDays, 1), duration);
                const percent = Math.min(Math.max(Math.round((currentDay / duration) * 100), 5), 100);

                const dayItin = pkg?.itinerary?.find((item: any) => item.day === currentDay);
                const todayItineraryTitle = dayItin?.title || `Tour Day ${currentDay} Itinerary & Sightseeing`;
                const todayItineraryDesc = dayItin?.desc || 'Scheduled activities & transfers as per itinerary docket.';

                const hotelBooking = b.supplierBookings?.find((sb: any) => sb.serviceType === 'Hotel' || sb.serviceType?.toLowerCase().includes('hotel'));
                const overnightHotel = hotelBooking?.notes || (pkg?.location ? `Selected Hotel, ${pkg.location}` : 'Confirmed Property');
                const mealPlan = 'CP (Breakfast Included)';

                const transportBooking = b.supplierBookings?.find((sb: any) => sb.serviceType === 'Transport' || sb.serviceType?.toLowerCase().includes('transport'));
                const driverName = transportBooking?.driverName || '';
                const driverPhone = transportBooking?.driverPhone || '';
                const vehicleNumber = transportBooking?.vehicleNumber || '';
                const transportInfo = transportBooking 
                    ? `${vehicleNumber ? `[${vehicleNumber}] ` : ''}${driverName ? `${driverName} (${driverPhone})` : 'Assigned'}`
                    : 'Pending Transport Assignment';

                activeList.push({
                    booking: b,
                    currentDay,
                    totalDays: duration,
                    percent,
                    todayItineraryTitle,
                    todayItineraryDesc,
                    overnightHotel,
                    mealPlan,
                    transportInfo,
                    driverName,
                    driverPhone,
                    vehicleNumber
                });
            }
        });

        return activeList;
    }, [bookings, programDate, packages]);

    // Attach "needs attention" flags (no driver / hotel unconfirmed / checklist open / balance pending)
    const guestProgramWithFlags = useMemo(() => (
        guestProgramData.map(item => ({
            ...item,
            flags: getAttentionFlags(item.booking, { hasDriver: !!item.driverName }),
        }))
    ), [guestProgramData]);

    const attentionCount = useMemo(
        () => guestProgramWithFlags.filter(i => i.flags.length > 0).length,
        [guestProgramWithFlags]
    );

    const visibleGuestProgram = useMemo(
        () => (attentionOnly ? guestProgramWithFlags.filter(i => i.flags.length > 0) : guestProgramWithFlags),
        [guestProgramWithFlags, attentionOnly]
    );

    const handleSendGuestBriefing = (item: any) => {
        const phone = item.booking.whatsapp || item.booking.phone;
        if (!phone) {
            toast.error('No contact phone/WhatsApp found for this customer');
            return;
        }
        const cleanPhone = phone.replace(/\D/g, '');
        const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const clientName = item.booking.customer || 'Guest';
        const bRef = item.booking.bookingNumber ? `BK-${String(item.booking.bookingNumber).padStart(4, '0')}` : `#${item.booking.id.slice(0, 8)}`;
        const dateStr = formatLocalDate(programDate);

        const driverDetails = item.driverName ? `${item.driverName} (${item.driverPhone || 'Active'}) - ${item.vehicleNumber || 'Assigned'}` : 'Local tour coordinator on standby';

        const message = `Namaste ${clientName}! ✨\n\nGood morning from Shravya Tours! Here is your daily tour program for Today (${dateStr}):\n\n📅 *Day ${item.currentDay} of ${item.totalDays}* (${item.booking.title} - ${bRef})\n📍 *Today's Highlights:* ${item.todayItineraryTitle}\n🏨 *Overnight Stay:* ${item.overnightHotel}\n🚗 *Transport:* ${driverDetails}\n\nOur 24/7 guest care helpline is active for any support. Wishing you a magnificent and memorable day! 🌴`;

        const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    // Pre-Tour Checklists calculation (Screenshots 21 & 22)
    const upcomingChecklistTours = useMemo(() => {
        const rank: Record<ReadinessLevel, number> = { critical: 0, 'at-risk': 1, 'not-started': 2, 'on-track': 3, ready: 4 };
        const rows = tourStats.upcoming.map(tour => {
            const chk = tour.checklist || [];
            const completed = chk.filter(c => c.status === 'Completed').length;
            const applicable = chk.filter(c => c.status !== 'Not Applicable').length;
            const actionable = applicable > 0 ? applicable : 10;
            const percent = chk.length > 0 ? Math.round((completed / actionable) * 100) : 0;
            const isReady = chk.length > 0 && completed >= actionable;
            const readiness = getBookingReadiness(tour);
            const balanceFlag = getBalanceFlag(tour);

            return {
                tour,
                checklist: chk,
                completed,
                total: actionable,
                percent,
                isReady,
                readiness,
                balanceFlag
            };
        });
        // Most urgent tours float to the top (stable within the same level)
        return rows
            .map((r, i) => ({ r, i }))
            .sort((a, b) => (rank[a.r.readiness.level] - rank[b.r.readiness.level]) || (a.i - b.i))
            .map(x => x.r);
    }, [tourStats.upcoming]);

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
        const transport = booking.supplierBookings?.find(sb => sb.serviceType === 'Transport' || sb.serviceType?.includes('Transport'));
        const guide = booking.supplierBookings?.find(sb => sb.serviceType === 'Guide' || sb.serviceType?.includes('Guide'));

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

        const existingTransport = selectedBookingForPrep.supplierBookings?.find(sb => sb.serviceType === 'Transport' || sb.serviceType?.includes('Transport'));
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

        const existingGuide = selectedBookingForPrep.supplierBookings?.find(sb => sb.serviceType === 'Guide' || sb.serviceType?.includes('Guide'));
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
                        Real-time tracking for active tours, transport assignments &amp; deliverable checklists.
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
                </div>
            </div>

            {/* ─── Operational View Switcher Tabs (iTours Ergonomics) ─── */}
            <div className="bg-white/80 dark:bg-[#1A2633]/80 border-b border-slate-200/80 dark:border-slate-800 px-6 py-2.5 flex items-center gap-2 overflow-x-auto sticky top-[73px] z-10 backdrop-blur-sm">
                <button
                    onClick={() => setOperationsTab('live')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                        operationsTab === 'live'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                    </span>
                    <span>Live Tours Monitor</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 font-black">
                        {tourStats.live.length}
                    </span>
                </button>

                <button
                    onClick={() => setOperationsTab('guest-program')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                        operationsTab === 'guest-program'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <Calendar size={14} />
                    <span>Today's Guest Program</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${operationsTab === 'guest-program' ? 'bg-white/25 text-white' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'}`}>
                        {guestProgramData.length} On Tour
                    </span>
                </button>

                <button
                    onClick={() => setOperationsTab('pre-tour-checklists')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                        operationsTab === 'pre-tour-checklists'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <CheckSquare size={14} />
                    <span>10-Point Pre-Tour Checklists</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${operationsTab === 'pre-tour-checklists' ? 'bg-white/25 text-white' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'}`}>
                        {tourStats.upcoming.length} Upcoming
                    </span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                <div className="max-w-7xl mx-auto space-y-6">

                {operationsTab === 'live' && (
                    <>

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
                                <span>Completed Tours</span>
                                <CheckCircle size={15} className="text-emerald-500" />
                            </div>
                            <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{kpiSummary.completedCount}</span>
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Tours</span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 mt-2">Executed &amp; finalized</p>
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
                                                        <span className="text-slate-400 font-mono text-xs font-bold">{formatBookingBadge(tour)}</span>
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
                                                    {!tour.supplierBookings?.some(sb => sb.serviceType === 'Transport' || sb.serviceType?.includes('Transport')) && (
                                                        <button
                                                            onClick={() => openPrepModal(tour)}
                                                            className="text-xs font-bold px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-xs transition-colors"
                                                        >
                                                            Assign Transport
                                                        </button>
                                                    )}
                                                    {(tour as any).liveStatus === 'Issue' && (
                                                        <button
                                                            onClick={() => handleLiveStatusChange(tour.id, 'Auto')}
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
                                    const assignedTransport = tour.supplierBookings?.find(sb => sb.serviceType === 'Transport' || sb.serviceType?.includes('Transport'));
                                    const transportVendor = assignedTransport ? vendors.find((v: any) => v.id === assignedTransport.vendorId) : null;
                                    const driverDisplayName = assignedTransport
                                        ? (transportVendor?.name || assignedTransport.driverName || 'Assigned')
                                        : 'Not Assigned';

                                    const assignedGuide = tour.supplierBookings?.find(sb => sb.serviceType === 'Guide' || sb.serviceType?.includes('Guide'));
                                    const guideVendor = assignedGuide ? vendors.find((v: any) => v.id === assignedGuide.vendorId) : null;
                                    const guideDisplayName = assignedGuide
                                        ? (guideVendor?.name || assignedGuide.driverName || 'Assigned')
                                        : null;

                                    const { day: dayOfTour, percent: progressPercent } = getTourProgress(tour.date, tour.duration);
                                    const endDateLabel = formatLocalDate(tour.endDate || (tour as any).liveEndDate.toISOString());

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
                                                        className="text-slate-400 hover:text-blue-600 text-xs font-mono font-bold transition-colors truncate max-w-[140px]"
                                                        title="View in Bookings"
                                                    >
                                                        {formatBookingBadge(tour)}
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
                                                    const currentChecklistDay = Math.max(1, Math.min(selectedDays[tour.id] || dayOfTour, tour.duration));
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
                                                        value={tour.liveStatus || 'Auto'}
                                                        onChange={(e) => handleLiveStatusChange(tour.id, e.target.value)}
                                                        className="px-2 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl border-none outline-none cursor-pointer"
                                                    >
                                                        <option value="Auto">⚡ Auto (Date)</option>
                                                        <option value="Live">🟢 Force Live</option>
                                                        <option value="Issue">🔴 Flag Issue</option>
                                                    </select>

                                                    <button
                                                        onClick={() => setSelectedBookingForChecklistId(tour.id)}
                                                        className="py-1.5 px-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1"
                                                        title="10-Point Pre-Tour Checklist"
                                                    >
                                                        <CheckSquare size={12} /> Checklist
                                                    </button>

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
                                            const assignedTransport = tour.supplierBookings?.find(sb => sb.serviceType === 'Transport' || sb.serviceType?.includes('Transport'));
                                            const vendorName = assignedTransport ? vendors.find((v: any) => v.id === assignedTransport.vendorId)?.name : null;
                                            const driverLabel = vendorName || assignedTransport?.driverName || null;

                                            return (
                                                <tr key={tour.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="px-6 py-4 font-black text-blue-600 dark:text-blue-400">
                                                        {formatLocalDate(tour.date)}
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                                                        <div className="flex items-center gap-1.5">
                                                            <span>{tour.customer}</span>
                                                            {(tour as any).liveStatus === 'Issue' && (
                                                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                                                                    Issue
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                                                            {(tour as any).paxUnknown ? '? Pax' : `${tour.paxCount} Pax`} • <span className="font-mono">{formatBookingBadge(tour)}</span>
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
                    </>
                )}

                {/* ══════════════════════════════════════════════════════════════
                    TAB 2: TODAY'S GUEST PROGRAM (Screenshot 23)
                ══════════════════════════════════════════════════════════════ */}
                {operationsTab === 'guest-program' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Date Toolbar & Overview */}
                        <div className="bg-white dark:bg-[#1A2633] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                                        Select Program Date
                                    </label>
                                    <input
                                        type="date"
                                        value={programDate}
                                        onChange={(e) => setProgramDate(e.target.value)}
                                        className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 ring-blue-500/20"
                                    />
                                </div>

                                <div className="flex items-center gap-1.5 pt-3 sm:pt-4">
                                    <button
                                        onClick={() => {
                                            const d = new Date(programDate);
                                            d.setDate(d.getDate() - 1);
                                            setProgramDate(d.toISOString().split('T')[0]);
                                        }}
                                        className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                                    >
                                        ◀ Yesterday
                                    </button>
                                    <button
                                        onClick={() => setProgramDate(new Date().toISOString().split('T')[0])}
                                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                                    >
                                        Today
                                    </button>
                                    <button
                                        onClick={() => {
                                            const d = new Date(programDate);
                                            d.setDate(d.getDate() + 1);
                                            setProgramDate(d.toISOString().split('T')[0]);
                                        }}
                                        className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                                    >
                                        Tomorrow ▶
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                                        {guestProgramData.length} Group{guestProgramData.length === 1 ? '' : 's'}
                                    </p>
                                    <p className="text-xs text-slate-500 font-semibold">
                                        {guestProgramData.reduce((acc, item) => acc + (item.booking.paxCount || 1), 0)} Total Guests on Tour
                                    </p>
                                </div>
                                {guestProgramData.length > 0 && (
                                    <button
                                        onClick={() => setAttentionOnly(v => !v)}
                                        title="Show only groups that need action (no driver, hotel unconfirmed, checklist open, balance pending)"
                                        className={`px-3 py-2 rounded-xl text-xs font-black border transition-all flex items-center gap-1.5 ${
                                            attentionOnly
                                                ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-500/20'
                                                : attentionCount > 0
                                                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                        }`}
                                    >
                                        <AlertTriangle size={13} />
                                        <span>
                                            {attentionCount > 0 ? `${attentionCount} need attention` : 'All clear'}
                                            {attentionOnly ? ' · showing only these' : ''}
                                        </span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Guest Program Grid */}
                        {guestProgramData.length === 0 ? (
                            <div className="bg-white dark:bg-[#1A2633] p-12 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
                                <Calendar size={40} className="mx-auto text-slate-300 dark:text-slate-600" />
                                <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                                    No Traveling Guests on {formatLocalDate(programDate)}
                                </h4>
                                <p className="text-xs text-slate-500 max-w-md mx-auto">
                                    No active booking spans across this date. Check tomorrow or jump back to the Live Tours Monitor.
                                </p>
                                <button
                                    onClick={() => setProgramDate(new Date().toISOString().split('T')[0])}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
                                >
                                    Return to Today
                                </button>
                            </div>
                        ) : visibleGuestProgram.length === 0 ? (
                            <div className="bg-white dark:bg-[#1A2633] p-10 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 text-center space-y-2">
                                <CheckCircle size={36} className="mx-auto text-emerald-500" />
                                <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">Nothing needs attention</h4>
                                <p className="text-xs text-slate-500">Every group on tour has a driver, confirmed hotel, completed checklist and cleared balance.</p>
                                <button
                                    onClick={() => setAttentionOnly(false)}
                                    className="mt-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
                                >
                                    Show all groups
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {visibleGuestProgram.map((item) => (
                                    <div
                                        key={item.booking.id}
                                        className="bg-white dark:bg-[#1A2633] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 flex flex-col justify-between space-y-4 hover:border-blue-400 transition-all"
                                    >
                                        <div>
                                            {/* Top badges */}
                                            <div className="flex items-center justify-between gap-2 mb-3">
                                                <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                                    {formatBookingBadge(item.booking)}
                                                </span>
                                                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                    Day {item.currentDay} of {item.totalDays}
                                                </span>
                                            </div>

                                            {/* Needs-attention flags */}
                                            {item.flags.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mb-3">
                                                    {item.flags.map(flag => (
                                                        <span
                                                            key={flag.key}
                                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black border ${
                                                                flag.severity === 'red'
                                                                    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                                                                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                                            }`}
                                                        >
                                                            <AlertTriangle size={10} />
                                                            {flag.label}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Guest Profile */}
                                            <h4 className="text-base font-black text-slate-900 dark:text-white">
                                                {item.booking.customer}
                                            </h4>
                                            <p className="text-xs text-slate-500 font-medium">
                                                {item.booking.title} • <span className="font-bold text-slate-700 dark:text-slate-300">{item.booking.guests || `${item.booking.paxCount || 1} Guests`}</span>
                                            </p>

                                            {/* Tour Progress Bar */}
                                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full my-3 overflow-hidden">
                                                <div className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full rounded-full transition-all" style={{ width: `${item.percent}%` }}></div>
                                            </div>

                                            {/* Today's Activities */}
                                            <div className="space-y-2 text-xs">
                                                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                                                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-0.5">
                                                        <span>📍</span>
                                                        <span>Today's Program:</span>
                                                    </div>
                                                    <p className="text-slate-600 dark:text-slate-300 text-[11px] font-medium line-clamp-2">
                                                        {item.todayItineraryTitle}
                                                    </p>
                                                </div>

                                                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                                                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-0.5">
                                                        <span>🏨</span>
                                                        <span>Overnight Stay:</span>
                                                    </div>
                                                    <p className="text-slate-600 dark:text-slate-300 text-[11px] font-medium truncate">
                                                        {item.overnightHotel} ({item.mealPlan})
                                                    </p>
                                                </div>

                                                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                                                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-0.5">
                                                        <span>🚗</span>
                                                        <span>Transport:</span>
                                                    </div>
                                                    <p className={`text-[11px] font-semibold truncate ${item.driverName ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}`}>
                                                        {item.transportInfo}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                            <button
                                                onClick={() => handleSendGuestBriefing(item)}
                                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5"
                                            >
                                                <MessageSquare size={13} />
                                                <span>WhatsApp Morning Briefing</span>
                                            </button>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setSelectedBookingForChecklistId(item.booking.id)}
                                                    className="flex-1 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <CheckSquare size={12} />
                                                    <span>Checklist</span>
                                                </button>
                                                <button
                                                    onClick={() => openPrepModal(item.booking)}
                                                    className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <Car size={12} />
                                                    <span>Driver</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════
                    TAB 3: PRE-TOUR CHECKLISTS HUB (Screenshots 21 & 22)
                ══════════════════════════════════════════════════════════════ */}
                {operationsTab === 'pre-tour-checklists' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Header Metrics */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white dark:bg-[#1A2633] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                                <p className="text-xs font-black uppercase tracking-wider text-slate-400">Total Upcoming Tours</p>
                                <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                                    {upcomingChecklistTours.length}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">Departing in next {upcomingDays} days</p>
                            </div>
                            <div className="bg-white dark:bg-[#1A2633] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                                <p className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Ready for Departure</p>
                                <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                                    {upcomingChecklistTours.filter(t => t.isReady).length}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">100% Pre-Tour items verified</p>
                            </div>
                            <div className="bg-white dark:bg-[#1A2633] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                                <p className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Checklist In Progress</p>
                                <p className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">
                                    {upcomingChecklistTours.filter(t => !t.isReady).length}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">Vouchers or tickets pending</p>
                            </div>
                        </div>

                        {/* Checklist List Table */}
                        <div className="bg-white dark:bg-[#1A2633] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                    Upcoming Pre-Tour Deliverables Checklist
                                </h3>
                                <div className="flex gap-1.5">
                                    <button
                                        onClick={() => setChecklistFilter('all')}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${checklistFilter === 'all' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                                    >
                                        All ({upcomingChecklistTours.length})
                                    </button>
                                    <button
                                        onClick={() => setChecklistFilter('ready')}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${checklistFilter === 'ready' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                                    >
                                        Ready ({upcomingChecklistTours.filter(t => t.isReady).length})
                                    </button>
                                    <button
                                        onClick={() => setChecklistFilter('pending')}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${checklistFilter === 'pending' ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                                    >
                                        Pending ({upcomingChecklistTours.filter(t => !t.isReady).length})
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                        <tr>
                                            <th className="px-6 py-3.5">Booking &amp; Customer</th>
                                            <th className="px-6 py-3.5">Departure Date</th>
                                            <th className="px-6 py-3.5">Checklist Progress</th>
                                            <th className="px-6 py-3.5 text-center">Status</th>
                                            <th className="px-6 py-3.5 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {upcomingChecklistTours
                                            .filter(t => {
                                                if (checklistFilter === 'ready') return t.isReady;
                                                if (checklistFilter === 'pending') return !t.isReady;
                                                return true;
                                            })
                                            .map(({ tour, completed, total, percent, isReady, readiness, balanceFlag }) => (
                                                <tr key={tour.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-[11px] font-extrabold text-blue-600 dark:text-blue-400">
                                                                {formatBookingBadge(tour)}
                                                            </span>
                                                            <p className="font-bold text-slate-900 dark:text-white">
                                                                {tour.customer}
                                                            </p>
                                                        </div>
                                                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">{tour.title}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="font-bold text-slate-800 dark:text-slate-200">
                                                            {formatLocalDate(tour.date)}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400">
                                                            Departs in {Math.max(0, Math.round((new Date(tour.date).getTime() - Date.now()) / 86400000))} days
                                                        </p>
                                                    </td>
                                                    <td className="px-6 py-4 min-w-[200px]">
                                                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                                            <span>{completed} of {total} Done</span>
                                                            <span>{percent}%</span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${isReady ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                                style={{ width: `${percent}%` }}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span
                                                                title={readiness.reason}
                                                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${READINESS_STYLES[readiness.level].chip}`}
                                                            >
                                                                <span className={`w-1.5 h-1.5 rounded-full ${READINESS_STYLES[readiness.level].dot}`} />
                                                                {readiness.level === 'ready' ? 'Ready for Tour' : readiness.label}
                                                            </span>
                                                            {readiness.overdueCount > 0 && (
                                                                <span className="text-[10px] font-black text-rose-600 dark:text-rose-400">
                                                                    {readiness.overdueCount} item{readiness.overdueCount === 1 ? '' : 's'} overdue
                                                                </span>
                                                            )}
                                                            {balanceFlag.level !== 'none' && (
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${BALANCE_FLAG_STYLES[balanceFlag.level]}`}>
                                                                    {balanceFlag.label}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => setSelectedBookingForChecklistId(tour.id)}
                                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-xs"
                                                        >
                                                            <CheckSquare size={13} /> Open Checklist
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        {upcomingChecklistTours.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-medium">
                                                    No upcoming tours found to checklist.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                </div>
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

            {/* ══ 10-POINT PRE-TOUR CHECKLIST MODAL ══ */}
            {selectedBookingForChecklist && (
                <TourChecklistModal
                    isOpen={!!selectedBookingForChecklist}
                    onClose={() => setSelectedBookingForChecklistId(null)}
                    booking={selectedBookingForChecklist}
                />
            )}
        </div>
    );
};
