import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { api } from '../src/lib/api';
import { toast } from 'sonner';
import { Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line } from 'recharts';
import { formatPrice, formatPriceCompact } from '../utils/packageUtils';

// Timezone-safe local date parser
const parseLocalDate = (dateStr?: string): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length !== 3) return new Date(dateStr);
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
};

export const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const {
        bookings: globalBookings, packages, leads: globalLeads, masterLocations, masterHotels, masterActivities,
        tasks, followUps, customers, getActiveMembershipForCustomer, expenses = [], vendors = []
    } = useData() as any;
    const { currentUser, staff, getModuleScope } = useAuth();
    const [greeting, setGreeting] = useState('');
    const [selectedYear, setSelectedYear] = useState('This Year');
    const [salesTimeFilter, setSalesTimeFilter] = useState<'7' | '14' | '30'>('7');
    const [deletionRequests, setDeletionRequests] = useState<any[]>([]);
    const [isProcessingDel, setIsProcessingDel] = useState<string | null>(null);
    const [isAlertsExpanded, setIsAlertsExpanded] = useState(false);
    const [unlinkedTransactions, setUnlinkedTransactions] = useState<any[]>(() => api.getUnlinkedTransactions());
    const [incentiveSummary, setIncentiveSummary] = useState<any>(null);
    const [duesTab, setDuesTab] = useState<'all' | 'receivables' | 'payables'>('all');
    const [duesHorizon, setDuesHorizon] = useState<'all' | '7d' | 'overdue'>('7d');
    const [showAllDues, setShowAllDues] = useState(false);
    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        setUnlinkedTransactions(api.getUnlinkedTransactions());
    }, []);

    useEffect(() => {
        api.getMyIncentiveSummary().then(res => {
            if (res && res.data) {
                setIncentiveSummary(res.data);
            }
        }).catch(err => console.warn('[AdminDashboard] Failed to fetch incentive summary:', err));
    }, [currentUser]);

    useEffect(() => {
        if (currentUser?.userType === 'Admin') {
            api.getDeletionRequests().then(data => {
                setDeletionRequests((data || []).filter((req: any) => req.status === 'pending'));
            }).catch(console.error);
        }
    }, [currentUser]);

    const handleApproveDeletion = async (id: string) => {
        setIsProcessingDel(id);
        try {
            await api.approveDeletionRequest(id);
            setDeletionRequests(prev => prev.filter(req => req.id !== id));
            toast.success('Deletion request approved and item hard-deleted');
        } catch (error: any) {
            toast.error(error.message || 'Failed to approve');
        } finally {
            setIsProcessingDel(null);
        }
    };

    const handleRejectDeletion = async (id: string) => {
        setIsProcessingDel(id);
        try {
            await api.rejectDeletionRequest(id);
            setDeletionRequests(prev => prev.filter(req => req.id !== id));
            toast.success('Deletion request rejected');
        } catch (error: any) {
            toast.error(error.message || 'Failed to reject');
        } finally {
            setIsProcessingDel(null);
        }
    };

    // --- RBAC Scoping ---
    const effectiveScope = useMemo(() => {
        if (!currentUser || currentUser.userType === 'Admin') return 'all';
        return getModuleScope ? getModuleScope('dashboard') : (
            currentUser.queryScope === 'Show All Queries' ? 'all' :
            currentUser.queryScope === 'Show Department Queries' ? 'department' : 'assigned'
        );
    }, [currentUser, getModuleScope]);

    const myId = String(currentUser?.id || (currentUser as any)?.staffId || '');
    const deptStaffIds = useMemo(() => {
        if (!staff || !currentUser?.department) return [myId];
        return staff.filter(s => s.department === currentUser.department).map(s => String(s.id));
    }, [staff, currentUser?.department, myId]);

    const matchesRecordScope = (item: any) => {
        if (effectiveScope === 'all') return true;
        const assigned = item.assignedTo ? String(item.assignedTo) : null;
        const staffList: string[] = Array.isArray(item.assignedStaffIds)
            ? item.assignedStaffIds.map(String)
            : (item.assignedStaffIds ? [String(item.assignedStaffIds)] : []);

        if (effectiveScope === 'department') {
            return (assigned ? deptStaffIds.includes(assigned) : false) || 
                   staffList.some(id => deptStaffIds.includes(id)) || 
                   (assigned === myId);
        }
        // assigned only
        return assigned === myId || staffList.includes(myId);
    };

    const bookings = useMemo(() => {
        if (effectiveScope === 'all') return globalBookings;
        return globalBookings.filter(matchesRecordScope);
    }, [globalBookings, effectiveScope, deptStaffIds, myId]);

    const leads = useMemo(() => {
        if (effectiveScope === 'all') return globalLeads;
        return globalLeads.filter(matchesRecordScope);
    }, [globalLeads, effectiveScope, deptStaffIds, myId]);

    // --- Enhanced Business Intelligence Calculations ---

    // Shared helper: net cash received for a booking (verified txs only)
    const getNetPaid = (b: any): number => {
        const paid = (b.transactions || [])
            .filter((t: any) => t.type === 'Payment' && t.status === 'Verified')
            .reduce((s: number, t: any) => s + t.amount, 0);
        const refunded = (b.transactions || [])
            .filter((t: any) => t.type === 'Refund' && t.status === 'Verified')
            .reduce((s: number, t: any) => s + t.amount, 0);
        return Math.max(0, paid - refunded);
    };

    // Unlinked verified bank deposits (not tied to specific booking rows)
    const unlinkedVerifiedSum = useMemo(() => {
        return (unlinkedTransactions || [])
            .filter(t => t.type === 'Payment' && t.status === 'Verified')
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    }, [unlinkedTransactions]);

    // Booking-only revenue (verified payments directly tied to non-cancelled bookings)
    const bookingRevenue = useMemo(() => {
        return bookings
            .filter(b => b.status !== 'Cancelled')
            .reduce((acc, b) => acc + getNetPaid(b), 0);
    }, [bookings]);

    // Revenue = sum of verified payments received on bookings + unlinked verified bank deposits
    const totalRevenue = useMemo(() => {
        return bookingRevenue + unlinkedVerifiedSum;
    }, [bookingRevenue, unlinkedVerifiedSum]);

    // Total booking value (invoice total, for reference)
    const totalBookingValue = bookings
        .filter(b => b.status !== 'Cancelled')
        .reduce((acc, b) => acc + b.amount, 0);

    // Bookings with pending dues (amount - netPaid > 0)
    const bookingsWithDues = useMemo(() => {
        return bookings.filter(b => b.status !== 'Cancelled' && (b.amount - getNetPaid(b)) > 0);
    }, [bookings]);

    const totalDuesAmount = useMemo(() => {
        return bookingsWithDues.reduce((sum, b) => sum + Math.max(0, b.amount - getNetPaid(b)), 0);
    }, [bookingsWithDues]);

    const activePackages = packages.filter(p => p.status === 'Active').length;

    // Membership Metrics
    const activeMembersCount = useMemo(() => {
        let count = 0;
        customers.forEach(c => {
            if (getActiveMembershipForCustomer(c.id)) {
                count++;
            }
        });
        return count;
    }, [customers, getActiveMembershipForCustomer]);

    // Lead Analytics
    const hotLeadsCount = leads.filter(l => l.status === 'Hot').length;
    const convertedLeadsCount = leads.filter(l => l.status === 'Converted').length;

    // Pipeline Value: active pipeline statuses (exclude Cold & Converted)
    const ACTIVE_PIPELINE_STATUSES = ['New', 'Warm', 'Hot', 'Offer Sent'];
    const activeLeadsCount = leads.filter(l => ACTIVE_PIPELINE_STATUSES.includes(l.status)).length;
    const totalLeadsValue = leads
        .filter(l => ACTIVE_PIPELINE_STATUSES.includes(l.status))
        .reduce((sum, l) => sum + (l.potentialValue || 0), 0);

    // Win Rate: Converted ÷ (Converted + Cold)
    const closedLeadsCount = leads.filter(l => l.status === 'Converted' || l.status === 'Cold').length;
    const winRate = closedLeadsCount > 0
        ? Math.round((convertedLeadsCount / closedLeadsCount) * 100)
        : 0;

    const conversionRate = leads.length > 0
        ? Math.round((convertedLeadsCount / leads.length) * 100)
        : 0;

    // Pending Actions & Operational Ticker Stats
    const pendingBookings = bookings.filter(b => b.status === 'Pending').length;
    const ongoingBookings = bookings.filter(b => b.status === 'Confirmed' && today >= b.date && today <= (b.endDate || b.date)).length;
    const unpaidBookings = bookingsWithDues.length;

    const urgentTasksCount = useMemo(() => {
        return (tasks || []).filter(t => t.status !== 'Completed' && (t.priority === 'Urgent' || t.priority === 'High')).length;
    }, [tasks]);

    const unassignedDriversCount = useMemo(() => {
        const now = Date.now();
        return bookings.filter(b => {
            if (b.status === 'Cancelled' || b.status === 'Completed') return false;
            const departureDate = new Date(b.date).getTime();
            const hoursUntilTrip = (departureDate - now) / (1000 * 3600);
            const hasDriver = !!(b.supplierBookings?.some(sb => (sb.serviceType === 'Transport' || sb.serviceType?.includes('Transport')) && sb.driverName) || b.details?.includes('Driver:'));
            return !hasDriver && hoursUntilTrip > -24 && hoursUntilTrip <= 48;
        }).length;
    }, [bookings]);

    const thisWeekNewBookings = bookings.filter(b => {
        const createdDate = new Date((b as any).createdAt || b.date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return createdDate >= weekAgo;
    }).length;

    // Smart Alerts & Recommendations
    const smartAlerts = useMemo(() => {
        const alerts: { type: 'warning' | 'info' | 'success'; message: string; action: string; path: string }[] = [];

        if (hotLeadsCount > 0) {
            alerts.push({
                type: 'warning',
                message: `${hotLeadsCount} hot lead${hotLeadsCount > 1 ? 's' : ''} need immediate attention`,
                action: 'View Leads',
                path: '/admin/leads'
            });
        }

        if (bookingsWithDues.length > 0) {
            alerts.push({
                type: 'warning',
                message: `${bookingsWithDues.length} booking${bookingsWithDues.length > 1 ? 's' : ''} pending payment (${formatPriceCompact(totalDuesAmount)} uncollected)`,
                action: 'Collect Payment',
                path: '/admin/bookings?status=payment_pending'
            });
        }

        if (pendingBookings > 3) {
            alerts.push({
                type: 'info',
                message: `${pendingBookings} bookings awaiting confirmation`,
                action: 'Review',
                path: '/admin/bookings?status=Pending'
            });
        }

        if (winRate > 25) {
            alerts.push({
                type: 'success',
                message: `Strong deal win rate: ${winRate}% on closed leads (${conversionRate}% overall conversion)!`,
                action: 'View Analytics',
                path: '/admin/analytics'
            });
        }

        return alerts;
    }, [hotLeadsCount, bookingsWithDues.length, totalDuesAmount, pendingBookings, winRate, conversionRate]);

    // Dynamic Activity Log
    const recentActivities = useMemo(() => {
        const getRelativeTime = (dateStr: string) => {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            return date.toLocaleDateString();
        };

        return [
            ...bookings.map(b => ({
                id: b.id,
                type: 'Booking',
                title: `Booking: ${b.customer}`,
                desc: `${b.title} - ${formatPrice(b.amount)}`,
                time: b.date,
                displayTime: getRelativeTime(b.date),
                icon: 'airplane_ticket',
                color: b.status === 'Confirmed' ? 'text-green-500' : 'text-blue-500'
            })),
            ...leads.map(l => ({
                id: l.id,
                type: 'Lead',
                title: `Lead: ${l.name}`,
                desc: `${l.destination} (${l.status})`,
                time: l.addedOn,
                displayTime: getRelativeTime(l.addedOn),
                icon: l.status === 'Hot' ? 'local_fire_department' : 'person_add',
                color: l.status === 'Hot' ? 'text-red-500' : 'text-purple-500'
            }))
        ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);
    }, [bookings, leads]);

    // Master Data Stats
    const masterDataStats = {
        locations: masterLocations?.length || 0,
        hotels: masterHotels?.length || 0,
        activities: masterActivities?.length || 0
    };

    // Sales Leaderboard Calculation
    const salesLeaderboard = useMemo(() => {
        const daysToSubtract = parseInt(salesTimeFilter);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToSubtract);
        cutoffDate.setHours(0, 0, 0, 0);

        const validBookings = bookings.filter(b => {
            if (b.status === 'Cancelled') return false;
            const bDate = new Date(b.date);
            return bDate >= cutoffDate;
        });

        const salesMap = new Map<number, { count: number, revenue: number, name: string, initials: string, color: string }>();

        validBookings.forEach(b => {
            if (b.assignedTo) {
                const existing = salesMap.get(b.assignedTo) || { count: 0, revenue: 0, name: 'Unknown Staff', initials: 'US', color: 'slate' };
                if (existing.count === 0) {
                    const st = staff.find(s => String(s.id) === String(b.assignedTo));
                    if (st) {
                        existing.name = st.name;
                        existing.initials = st.initials;
                        existing.color = st.color;
                    } else if (currentUser && String(currentUser.id) === String(b.assignedTo)) {
                        existing.name = currentUser.name;
                        existing.initials = currentUser.initials;
                        existing.color = currentUser.color;
                    }
                }
                existing.count += 1;
                existing.revenue += b.amount;
                salesMap.set(b.assignedTo, existing);
            }
        });

        return Array.from(salesMap.values()).sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count;
            return b.revenue - a.revenue;
        }).slice(0, 5);
    }, [bookings, salesTimeFilter, staff, currentUser]);

    // Lead Conversion Funnel
    const leadFunnel = useMemo(() => {
        const counts = { New: 0, Warm: 0, Hot: 0, 'Offer Sent': 0, Converted: 0, Cold: 0 };
        leads.forEach(l => {
            if (counts[l.status as keyof typeof counts] !== undefined) {
                counts[l.status as keyof typeof counts]++;
            }
        });
        const total = leads.length || 1;
        return [
            { stage: 'New', count: counts.New, color: 'from-blue-400 to-indigo-500', width: `${Math.round((counts.New / total) * 100)}%` },
            { stage: 'Warm', count: counts.Warm, color: 'from-amber-400 to-orange-500', width: `${Math.round((counts.Warm / total) * 100)}%` },
            { stage: 'Hot', count: counts.Hot, color: 'from-rose-400 to-red-500', width: `${Math.round((counts.Hot / total) * 100)}%` },
            { stage: 'Offer Sent', count: counts['Offer Sent'], color: 'from-purple-400 to-fuchsia-500', width: `${Math.round((counts['Offer Sent'] / total) * 100)}%` },
            { stage: 'Converted', count: counts.Converted, color: 'from-emerald-400 to-teal-500', width: `${Math.round((counts.Converted / total) * 100)}%` },
        ].filter(f => f.count > 0);
    }, [leads]);

    // Upcoming Departures (Next 14 Days)
    const upcomingDepartures = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const in14Days = new Date(now);
        in14Days.setDate(in14Days.getDate() + 14);

        return bookings.filter(b => {
            if (b.status === 'Cancelled') return false;
            const bDate = new Date(b.date);
            return bDate >= now && bDate <= in14Days;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 5);
    }, [bookings]);

    // Pending Follow-ups & Tasks
    const myActionItems = useMemo(() => {
        const pendingFollowUps = (followUps || []).filter(f => {
            if (f.assignedTo !== currentUser?.id) return false;
            return f.status === 'Pending' || f.status === 'Scheduled' || f.status === 'Overdue';
        }).map(f => ({
            id: f.id,
            type: 'Follow-up' as const,
            title: `Follow up: ${f.leadName || 'Lead'}`,
            desc: f.description,
            date: new Date(f.scheduledAt),
            icon: f.type === 'WhatsApp' ? 'forum' : f.type === 'Call' ? 'call' : 'mail',
            color: f.status === 'Overdue' ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/40' : 'text-amber-500 bg-amber-50 dark:bg-amber-950/40',
            link: '/admin/leads'
        }));

        const pendingTasks = (tasks || []).filter(t => {
            if (t.assignedTo !== currentUser?.id && t.assignedTo !== '1') return false;
            return t.status === 'Pending' || t.status === 'In Progress' || t.status === 'Overdue';
        }).map(t => ({
            id: t.id,
            type: 'Task' as const,
            title: t.title,
            desc: t.description || 'Action required',
            date: new Date(t.dueDate),
            icon: 'task_alt',
            color: t.status === 'Overdue' || t.priority === 'Urgent' ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/40' : 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40',
            link: '/admin/inbox'
        }));

        return [...pendingFollowUps, ...pendingTasks]
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .slice(0, 5);
    }, [followUps, tasks, currentUser]);

    // Top Destinations
    const topDestinations = useMemo(() => {
        const destMap = new Map<string, number>();
        bookings.forEach(b => {
            if (b.status !== 'Cancelled' && b.title) {
                const dest = b.title.split('-')[0].trim() || 'Custom Tour';
                destMap.set(dest, (destMap.get(dest) || 0) + 1);
            }
        });
        return Array.from(destMap.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 4);
    }, [bookings]);

    // Outstanding Payments & Financial Health
    const financialHealth = useMemo(() => {
        let receivables = 0;
        let payables = 0;

        bookings.forEach(b => {
            if (b.status === 'Cancelled') return;
            const netPaid = getNetPaid(b);
            const remaining = b.amount - netPaid;
            if (remaining > 0) receivables += remaining;

            if (b.supplierBookings) {
                b.supplierBookings.forEach(sb => {
                    if (sb.bookingStatus !== 'Cancelled' && (sb.paymentStatus === 'Unpaid' || sb.paymentStatus === 'Partially Paid')) {
                        const rem = Math.max(0, sb.cost - (sb.paidAmount || 0));
                        if (rem > 0) payables += rem;
                    }
                });
            }
        });

        // Add unpaid/pending office OPEX to payables
        (expenses || []).forEach(exp => {
            if (exp.status === 'Cancelled' || exp.status === 'Rejected') return;
            if (exp.status === 'Pending' || exp.status === 'Unpaid') {
                payables += Number(exp.amount) || 0;
            }
        });

        return { receivables, payables };
    }, [bookings, expenses]);

    const netWorkingCapital = financialHealth.receivables - financialHealth.payables;

    // Today's Active Traveling Tours (Guest Program)
    const todaysActiveTours = useMemo(() => {
        const todayNow = new Date();
        todayNow.setHours(0, 0, 0, 0);

        return bookings.filter(b => {
            if (b.status === 'Cancelled' || b.liveStatus === 'Cancelled') return false;
            const start = parseLocalDate(b.date);
            if (!start) return false;

            let duration = b.durationDays || 1;
            if (b.endDate) {
                const endD = parseLocalDate(b.endDate);
                if (endD && endD >= start) {
                    duration = Math.max(Math.round((endD.getTime() - start.getTime()) / 86_400_000) + 1, duration);
                }
            } else {
                const pkg = packages?.find((p: any) => p.id === b.packageId || p.title === b.title);
                if (pkg?.days) duration = pkg.days;
            }

            const end = new Date(start);
            end.setDate(start.getDate() + (duration - 1));
            end.setHours(23, 59, 59, 999);

            return todayNow >= start && todayNow <= end;
        }).map(b => {
            const start = parseLocalDate(b.date)!;
            let duration = b.durationDays || 1;
            if (b.endDate) {
                const endD = parseLocalDate(b.endDate);
                if (endD && endD >= start) {
                    duration = Math.max(Math.round((endD.getTime() - start.getTime()) / 86_400_000) + 1, duration);
                }
            } else {
                const pkg = packages?.find((p: any) => p.id === b.packageId || p.title === b.title);
                if (pkg?.days) duration = pkg.days;
            }

            const diffDays = Math.round((todayNow.getTime() - start.getTime()) / 86_400_000) + 1;
            const currentDay = Math.min(Math.max(diffDays, 1), duration);
            const percent = Math.min(Math.max(Math.round((currentDay / duration) * 100), 5), 100);

            const pkg = packages?.find((p: any) => p.id === b.packageId || p.title === b.title);
            const dayItinerary = pkg?.itinerary?.[currentDay - 1];

            const transportBooking = b.supplierBookings?.find((sb: any) => sb.serviceType === 'Transport' || sb.serviceType?.includes('Transport'));
            const driverInfo = b.driverName || transportBooking?.driverName || null;
            const driverPhone = b.driverPhone || transportBooking?.driverPhone || null;

            const customerPhone = b.customerPhone || b.phone || '';

            return {
                ...b,
                currentDay,
                duration,
                percent,
                dayTitle: dayItinerary?.title || `Day ${currentDay} Tour Schedule`,
                driverInfo,
                driverPhone,
                customerPhone
            };
        });
    }, [bookings, packages]);

    // Unified Due Payments & Obligations (Screenshot 24 benchmark)
    const unifiedDues = useMemo(() => {
        const todayNow = new Date();
        todayNow.setHours(0, 0, 0, 0);

        interface DueItem {
            id: string;
            type: 'receivable' | 'payable';
            bookingId: string;
            bookingTitle: string;
            partyName: string;
            partyPhone?: string;
            partyRole: string;
            dueDate: Date;
            dueDateStr: string;
            daysUntilDue: number;
            totalAmount: number;
            paidAmount: number;
            balanceDue: number;
            isOverdue: boolean;
            supplierBookingId?: string;
        }

        const items: DueItem[] = [];

        // 1. Customer Receivables
        bookings.forEach(b => {
            if (b.status === 'Cancelled') return;
            const netPaid = getNetPaid(b);
            const balance = b.amount - netPaid;
            if (balance > 0) {
                const depDate = parseLocalDate(b.date) || new Date();
                const daysUntilDue = Math.round((depDate.getTime() - todayNow.getTime()) / 86_400_000);
                const isOverdue = daysUntilDue < 0;

                items.push({
                    id: `rec-${b.id}`,
                    type: 'receivable',
                    bookingId: b.id,
                    bookingTitle: b.title || 'Custom Tour',
                    partyName: b.customer || 'Guest',
                    partyPhone: b.customerPhone || b.phone || '',
                    partyRole: 'Client Balance',
                    dueDate: depDate,
                    dueDateStr: depDate.toISOString().split('T')[0],
                    daysUntilDue,
                    totalAmount: b.amount,
                    paidAmount: netPaid,
                    balanceDue: balance,
                    isOverdue
                });
            }

            // 2. Supplier Payables
            if (b.supplierBookings) {
                b.supplierBookings.forEach((sb: any) => {
                    if (sb.bookingStatus === 'Cancelled') return;
                    if (sb.paymentStatus === 'Paid') return;
                    const rem = Math.max(0, sb.cost - (sb.paidAmount || 0));
                    if (rem > 0) {
                        const dueDate = sb.paymentDueDate
                            ? (parseLocalDate(sb.paymentDueDate) || parseLocalDate(b.date) || new Date())
                            : (parseLocalDate(b.date) || new Date());
                        const daysUntilDue = Math.round((dueDate.getTime() - todayNow.getTime()) / 86_400_000);
                        const isOverdue = daysUntilDue < 0;

                        const vendorObj = (vendors || []).find((v: any) => String(v.id) === String(sb.vendorId));
                        const vendorName = vendorObj?.name || sb.notes || `${sb.serviceType} Vendor`;

                        items.push({
                            id: `pay-${b.id}-${sb.id}`,
                            type: 'payable',
                            bookingId: b.id,
                            bookingTitle: b.title || 'Tour',
                            partyName: vendorName,
                            partyPhone: vendorObj?.phone || '',
                            partyRole: `${sb.serviceType || 'Supplier'} Payable`,
                            dueDate,
                            dueDateStr: dueDate.toISOString().split('T')[0],
                            daysUntilDue,
                            totalAmount: sb.cost,
                            paidAmount: sb.paidAmount || 0,
                            balanceDue: rem,
                            isOverdue,
                            supplierBookingId: sb.id
                        });
                    }
                });
            }
        });

        // Sort: Overdue items first, then ascending by days until due
        items.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

        const totalReceivables = items.filter(i => i.type === 'receivable').reduce((s, i) => s + i.balanceDue, 0);
        const totalPayables = items.filter(i => i.type === 'payable').reduce((s, i) => s + i.balanceDue, 0);
        const netHorizon = totalReceivables - totalPayables;

        return {
            items,
            totalReceivables,
            totalPayables,
            netHorizon,
            receivablesCount: items.filter(i => i.type === 'receivable').length,
            payablesCount: items.filter(i => i.type === 'payable').length,
            overdueCount: items.filter(i => i.isOverdue).length
        };
    }, [bookings, vendors]);

    const filteredDues = useMemo(() => {
        return unifiedDues.items.filter(item => {
            if (duesTab === 'receivables' && item.type !== 'receivable') return false;
            if (duesTab === 'payables' && item.type !== 'payable') return false;

            if (duesHorizon === '7d' && item.daysUntilDue > 7 && !item.isOverdue) return false;
            if (duesHorizon === 'overdue' && !item.isOverdue) return false;

            return true;
        });
    }, [unifiedDues, duesTab, duesHorizon]);

    const handleSendMorningBriefing = (tour: any) => {
        const phone = (tour.customerPhone || '').replace(/\D/g, '');
        if (!phone) {
            toast.error('No contact phone number recorded for this guest');
            return;
        }
        const driverText = tour.driverInfo ? ` Your assigned transport is with ${tour.driverInfo}${tour.driverPhone ? ` (${tour.driverPhone})` : ''}.` : '';
        const highlightText = tour.dayTitle ? ` Today's scheduled highlight: ${tour.dayTitle}.` : '';
        const message = `Good morning ${tour.customer}! ☀️\n\nWarm greetings from Shrawello Travel Hub! Today is Day ${tour.currentDay} of your ${tour.title || 'tour'}.${highlightText}${driverText}\n\nWe hope you have a delightful journey today. Feel free to message us here if you need anything at all! 🌟`;
        window.open(`https://wa.me/${phone.length === 10 ? '91' + phone : phone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const handleSendPaymentReminder = (item: any) => {
        const phone = (item.partyPhone || '').replace(/\D/g, '');
        if (!phone) {
            toast.error('No contact number available for this booking');
            return;
        }
        const message = `Namaste ${item.partyName}! 🙏\n\nThis is a friendly reminder from Shrawello Travel Hub regarding your upcoming tour "${item.bookingTitle}".\n\n• Package Total: ${formatPrice(item.totalAmount)}\n• Paid so far: ${formatPrice(item.paidAmount)}\n• Pending Balance Due: ${formatPrice(item.balanceDue)}\n• Due Date: ${new Date(item.dueDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}\n\nKindly complete the balance payment and share the confirmation screenshot. Let us know if you need any assistance!`;
        window.open(`https://wa.me/${phone.length === 10 ? '91' + phone : phone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    // Lead Source Performance
    const leadSourcesData = useMemo(() => {
        const sourceMap = new Map<string, { total: number, converted: number }>();
        leads.forEach(l => {
            const src = l.source || 'Other';
            const existing = sourceMap.get(src) || { total: 0, converted: 0 };
            existing.total += 1;
            if (l.status === 'Converted') existing.converted += 1;
            sourceMap.set(src, existing);
        });

        return Array.from(sourceMap.entries())
            .map(([source, stats]) => ({
                source,
                total: stats.total,
                rate: Math.round((stats.converted / stats.total) * 100)
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 4);
    }, [leads]);

    // Revenue Overview Analytics
    const [chartMetricMode, setChartMetricMode] = useState<'collected' | 'comparison' | 'profit'>('collected');

    const revenueAnalytics = useMemo(() => {
        const yearOffset = selectedYear === 'This Year' ? 0 : selectedYear === 'Last Year' ? 1 : 0;
        const currentYear = new Date().getFullYear();
        const targetYear = currentYear - yearOffset;
        const prevYear = targetYear - 1;

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        const monthlyData = months.map(m => ({
            name: m,
            revenue: 0,
            bookingValue: 0,
            vendorCosts: 0,
            opex: 0,
            grossProfit: 0,
            netProfit: 0,
            bookings: 0,
            monthIndex: months.indexOf(m)
        }));

        let totalYearCollected = 0;
        let totalYearBookingCollected = 0;
        let totalYearInvoiced = 0;
        let totalYearVendorCosts = 0;
        let totalYearOpex = 0;
        let prevYearCollected = 0;

        bookings.forEach(b => {
            if (b.status === 'Cancelled') return;
            const d = new Date(b.date);
            const bYear = d.getFullYear();
            const month = d.getMonth();
            const paid = getNetPaid(b);

            let vCost = 0;
            if (b.supplierBookings) {
                b.supplierBookings.forEach(sb => {
                    if (sb.bookingStatus !== 'Cancelled') vCost += (sb.cost || 0);
                });
            }

            if (bYear === targetYear) {
                monthlyData[month].revenue += paid;
                monthlyData[month].bookingValue += (b.amount || 0);
                monthlyData[month].vendorCosts += vCost;
                monthlyData[month].bookings += 1;

                totalYearCollected += paid;
                totalYearBookingCollected += paid;
                totalYearInvoiced += (b.amount || 0);
                totalYearVendorCosts += vCost;
            } else if (bYear === prevYear) {
                prevYearCollected += paid;
            }
        });

        // Add verified unlinked bank transactions
        (unlinkedTransactions || []).forEach(tx => {
            if (tx.type !== 'Payment' || tx.status !== 'Verified') return;
            const txDate = tx.date || tx.payment_date || tx.created_at;
            if (!txDate) return;
            const d = new Date(txDate);
            const txYear = d.getFullYear();
            const month = d.getMonth();
            const amt = Number(tx.amount) || 0;

            if (txYear === targetYear) {
                monthlyData[month].revenue += amt;
                totalYearCollected += amt;
            } else if (txYear === prevYear) {
                prevYearCollected += amt;
            }
        });

        // Add operating expenses (OPEX)
        (expenses || []).forEach(exp => {
            if (exp.status === 'Cancelled' || exp.status === 'Rejected') return;
            if (!exp.date) return;
            const d = new Date(exp.date);
            const expYear = d.getFullYear();
            const month = d.getMonth();
            const amt = Number(exp.amount) || 0;

            if (expYear === targetYear) {
                monthlyData[month].opex += amt;
                totalYearOpex += amt;
            }
        });

        // Calculate Gross Trip Margin & True Net Profit for each month
        monthlyData.forEach(m => {
            m.grossProfit = Math.max(0, m.bookingValue - m.vendorCosts);
            m.netProfit = m.grossProfit - m.opex;
        });

        const totalYearGrossProfit = Math.max(0, totalYearInvoiced - totalYearVendorCosts);
        const totalYearNetProfit = totalYearGrossProfit - totalYearOpex;

        const yoyGrowth = prevYearCollected > 0
            ? Math.round(((totalYearCollected - prevYearCollected) / prevYearCollected) * 100)
            : totalYearCollected > 0 ? 100 : 0;

        const collectionEfficiency = totalYearInvoiced > 0
            ? Math.min(100, Math.round((totalYearBookingCollected / totalYearInvoiced) * 100))
            : 100;

        let peakMonth = monthlyData[0];
        monthlyData.forEach(m => {
            if (m.revenue > peakMonth.revenue) peakMonth = m;
        });

        return {
            monthlyData,
            totalYearCollected,
            totalYearInvoiced,
            totalYearVendorCosts,
            totalYearOpex,
            totalYearGrossProfit,
            totalYearNetProfit,
            yoyGrowth,
            collectionEfficiency,
            peakMonth,
            targetYear
        };
    }, [bookings, expenses, unlinkedTransactions, selectedYear]);

    const revenueData = revenueAnalytics.monthlyData;

    const handleExportRevenueCSV = () => {
        const headers = ['Month', 'Cash Collected (INR)', 'Gross Invoiced (INR)', 'Vendor Costs (INR)', 'Office OPEX (INR)', 'Gross Margin (INR)', 'True Net Profit (INR)', 'Bookings Count'];
        const rows = revenueData.map(d => [
            d.name,
            d.revenue,
            d.bookingValue,
            d.vendorCosts,
            d.opex,
            d.grossProfit,
            d.netProfit,
            d.bookings
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Revenue_Overview_${selectedYear.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Revenue report exported to CSV!');
    };

    const handleChartPointClick = (dataState: any) => {
        if (dataState && dataState.activePayload && dataState.activePayload.length) {
            const pointData = dataState.activePayload[0].payload;
            navigate(`/admin/bookings?month=${pointData.name}&year=${revenueAnalytics.targetYear}`);
            toast.info(`Filtered bookings for ${pointData.name} ${revenueAnalytics.targetYear}`);
        }
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            const eff = d.bookingValue > 0 ? Math.min(100, Math.round((d.revenue / d.bookingValue) * 100)) : 100;
            return (
                <div className="bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-xl p-4 rounded-2xl border border-slate-700/80 shadow-2xl text-white z-50 min-w-[250px] animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between border-b border-slate-700/60 pb-2 mb-3">
                        <p className="font-bold text-sm tracking-wide text-indigo-300">{label} {revenueAnalytics.targetYear}</p>
                        <span className="text-[10px] font-extrabold bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-500/30">
                            {d.bookings} {d.bookings === 1 ? 'Booking' : 'Bookings'}
                        </span>
                    </div>

                    <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-slate-300">
                                <span className="size-2.5 rounded-full bg-indigo-500 ring-2 ring-indigo-500/30"></span>
                                <span>Collected Cash</span>
                            </span>
                            <span className="font-black text-indigo-400">{formatPrice(d.revenue)}</span>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-slate-300">
                                <span className="size-2.5 rounded-full bg-amber-400 ring-2 ring-amber-400/30"></span>
                                <span>Gross Invoiced</span>
                            </span>
                            <span className="font-bold text-amber-300">{formatPrice(d.bookingValue)}</span>
                        </div>

                        {d.vendorCosts > 0 && (
                            <div className="flex items-center justify-between gap-4">
                                <span className="flex items-center gap-1.5 text-slate-300">
                                    <span className="size-2.5 rounded-full bg-slate-400 ring-2 ring-slate-400/30"></span>
                                    <span>Vendor Dues</span>
                                </span>
                                <span className="font-medium text-slate-300">{formatPrice(d.vendorCosts)}</span>
                            </div>
                        )}

                        {d.opex > 0 && (
                            <div className="flex items-center justify-between gap-4">
                                <span className="flex items-center gap-1.5 text-slate-300">
                                    <span className="size-2.5 rounded-full bg-rose-400 ring-2 ring-rose-400/30"></span>
                                    <span>Office OPEX</span>
                                </span>
                                <span className="font-bold text-rose-400">-{formatPrice(d.opex)}</span>
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800/60">
                            <span className="flex items-center gap-1.5 text-slate-300">
                                <span className="size-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30"></span>
                                <span>True Net Profit</span>
                            </span>
                            <span className={`font-black ${d.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {formatPrice(d.netProfit)}
                            </span>
                        </div>

                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                            <span>Collection Rate</span>
                            <span className="font-extrabold text-white">{eff}%</span>
                        </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-indigo-300 font-semibold flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">touch_app</span>
                        <span>Click point to filter bookings</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 18) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');
    }, []);

    // Collection efficiency percentage (verified payments against invoiced booking value)
    const collectionRatePct = totalBookingValue > 0 ? Math.min(100, Math.round((bookingRevenue / totalBookingValue) * 100)) : 100;

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1700px] mx-auto space-y-6">

            {/* ─── 1. Executive Horizon Command Header (Compact & Actionable) ─── */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-900 dark:bg-slate-950 text-white shadow-xl border border-slate-800">
                {/* Subtle Ambient Background Lighting */}
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/90 via-slate-900/90 to-purple-950/80"></div>
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 p-5 sm:p-7 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
                    
                    {/* Left: Greeting & Live Operational Ticker */}
                    <div className="space-y-2.5 max-w-3xl">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-black uppercase tracking-wider text-emerald-400">
                                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                Live Operating Cockpit
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                                · {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </span>
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                            {greeting}, {currentUser?.name?.split(' ')[0] || 'Abhinav'}.
                        </h1>

                        {/* Live Situational Awareness Ticker */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                                onClick={() => navigate('/admin/bookings?status=Pending')}
                                className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 border border-white/10 text-slate-200 flex items-center gap-1.5 transition-all active:scale-95"
                            >
                                <span className="size-2 rounded-full bg-amber-400"></span>
                                <span><strong className="text-white">{pendingBookings}</strong> Pending Bookings</span>
                            </button>

                            <button
                                onClick={() => navigate('/admin/inbox')}
                                className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-200 flex items-center gap-1.5 transition-all active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[14px] text-rose-400">bolt</span>
                                <span><strong className="text-white">{urgentTasksCount}</strong> Urgent SLAs</span>
                            </button>

                            {unassignedDriversCount > 0 && (
                                <button
                                    onClick={() => navigate('/admin/inbox')}
                                    className="px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-200 flex items-center gap-1.5 transition-all active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-[14px] text-blue-400">local_taxi</span>
                                    <span><strong className="text-white">{unassignedDriversCount}</strong> Drivers Needed</span>
                                </button>
                            )}

                            {financialHealth.receivables > 0 && (
                                <button
                                    onClick={() => navigate('/admin/finance-verification')}
                                    className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-200 flex items-center gap-1.5 transition-all active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-[14px] text-emerald-400">payments</span>
                                    <span><strong className="text-white">{formatPriceCompact(financialHealth.receivables)}</strong> Uncollected</span>
                                </button>
                            )}

                            {todaysActiveTours.length > 0 && (
                                <button
                                    onClick={() => navigate('/admin/operations?tab=guest-program')}
                                    className="px-2.5 py-1 rounded-xl text-xs font-bold bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/30 text-teal-200 flex items-center gap-1.5 transition-all active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-[14px] text-teal-400">tour</span>
                                    <span><strong className="text-white">{todaysActiveTours.length}</strong> On-Tour</span>
                                </button>
                            )}

                            {unifiedDues.overdueCount > 0 && (
                                <button
                                    onClick={() => {
                                        setDuesTab('all');
                                        setDuesHorizon('overdue');
                                        const el = document.getElementById('unified-dues-section');
                                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-200 flex items-center gap-1.5 transition-all active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-[14px] text-amber-400">notification_important</span>
                                    <span><strong className="text-white">{unifiedDues.overdueCount}</strong> Overdue Dues</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right: Quick Launch Command Hub */}
                    <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto shrink-0">
                        <button
                            onClick={() => navigate('/admin/itinerary-builder')}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[18px]">add_circle</span>
                            <span>Create Package</span>
                        </button>

                        <button
                            onClick={() => navigate('/admin/leads')}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[18px]">person_add</span>
                            <span>Add Lead</span>
                        </button>

                        <button
                            onClick={() => navigate('/admin/invoices/new')}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                            <span>New Invoice</span>
                        </button>

                        <button
                            onClick={() => navigate('/admin/inbox')}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600/80 hover:bg-indigo-600 text-white border border-indigo-500/40 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[18px]">inbox</span>
                            <span>Inbox Hub</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── Monthly Target & Advance Next Month Quota Cockpit (25th Deadline Protocol) ─── */}
            {(() => {
                const currentTarget = incentiveSummary?.targetsInfo?.currentMonth;
                const nextTarget = incentiveSummary?.targetsInfo?.nextMonth;
                const latestSummary = incentiveSummary?.summaries?.[0];
                const targetAchievementPct = latestSummary?.target_achievement_pct || 0;
                const eligibleAchieved = parseFloat(String(latestSummary?.eligible_business || 0));

                return (
                    <div className="bg-white dark:bg-[#1A2633] rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5">
                            
                            {/* Left: Current Month Quota & Pacing */}
                            <div className="flex-1 space-y-2.5">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-2">
                                        <div className="size-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                                            <span className="material-symbols-outlined text-[18px]">target</span>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                                                My Monthly Sales Target ({currentTarget?.monthYear || new Date().toISOString().slice(0, 7)})
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    targetAchievementPct >= 100 
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                                }`}>
                                                    {targetAchievementPct >= 100 ? 'Target Achieved' : `${targetAchievementPct}% Pacing`}
                                                </span>
                                            </h4>
                                            <p className="text-[11px] text-slate-400">Personal performance quota calibrated for monthly incentive slabs</p>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                                            {formatPriceCompact(eligibleAchieved)} <span className="text-slate-400 font-normal">/ {formatPriceCompact(currentTarget?.targetAmount || 500000)}</span>
                                        </div>
                                        <div className="text-[11px] text-slate-400">
                                            {incentiveSummary?.recentBookings?.length || 0} of {currentTarget?.targetBookings || 5} Bookings Closed
                                        </div>
                                    </div>
                                </div>

                                {/* Progress meter */}
                                <div className="space-y-1">
                                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500" 
                                            style={{ width: `${Math.min(100, Math.max(2, targetAchievementPct))}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Middle Divider */}
                            <div className="hidden lg:block w-px h-16 bg-slate-200 dark:bg-slate-800 shrink-0"></div>

                            {/* Right: Next Month Target (Advance Notification - 25th Deadline Protocol) */}
                            <div className="flex-1 lg:max-w-md bg-gradient-to-r from-indigo-50/70 to-purple-50/70 dark:from-indigo-950/30 dark:to-purple-950/20 p-3.5 rounded-2xl border border-indigo-100/80 dark:border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[16px] text-indigo-500">calendar_month</span>
                                        <span className="text-xs font-black text-indigo-950 dark:text-indigo-200">
                                            Next Month Target ({nextTarget?.monthYear || 'Upcoming'})
                                        </span>
                                        {nextTarget?.isSet ? (
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                Confirmed
                                            </span>
                                        ) : nextTarget?.isBeforeDeadline25th ? (
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                                Deadline: 25th
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                                Pending Pub
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        Quota: <span className="text-indigo-600 dark:text-indigo-400 font-black">{formatPriceCompact(nextTarget?.targetAmount || 500000)}</span> • {nextTarget?.targetBookings || 5} Bookings
                                    </div>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                        {nextTarget?.isSet 
                                            ? 'Set on/before 25th by Super Admin.' 
                                            : (nextTarget?.isBeforeDeadline25th 
                                                ? 'Target setting underway. Finalizes on/before 25th.' 
                                                : 'Awaiting Super Admin target confirmation.')}
                                    </p>
                                </div>

                                <button
                                    onClick={() => navigate('/admin/my-incentives')}
                                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                                >
                                    <span>Incentives</span>
                                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                                </button>
                            </div>

                        </div>
                    </div>
                );
            })()}

            {/* ─── 2. Interactive KPI Bento Cards with Progress Visualizers ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                
                {/* 1. Revenue Collected */}
                <div
                    onClick={() => navigate('/admin/finance-verification')}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="size-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-xs">
                                <span className="material-symbols-outlined text-2xl">payments</span>
                            </div>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                                {thisWeekNewBookings > 0 ? `+${thisWeekNewBookings} this week` : 'Live'}
                            </span>
                        </div>

                        <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider">
                            Revenue Collected
                        </p>
                        <h3 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white mt-0.5">
                            {formatPriceCompact(totalRevenue)}
                        </h3>
                    </div>

                    {/* Progress Bar & Subtitle */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                            <span>Collection Rate</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{collectionRatePct}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${collectionRatePct}%` }}></div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 truncate">
                            of {formatPriceCompact(totalBookingValue)} invoiced • {formatPriceCompact(totalDuesAmount)} pending
                        </p>
                    </div>
                </div>

                {/* 2. Active Members */}
                <div
                    onClick={() => navigate('/admin/memberships')}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-amber-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="size-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shadow-xs">
                                <span className="material-symbols-outlined text-2xl">workspace_premium</span>
                            </div>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                                Loyalty
                            </span>
                        </div>

                        <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider">
                            Active Members
                        </p>
                        <h3 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white mt-0.5">
                            {activeMembersCount}
                        </h3>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-slate-500">
                        <span>VIP Tier Retention</span>
                        <span className="text-amber-600 font-extrabold">Active</span>
                    </div>
                </div>

                {/* 3. Deal Win Rate */}
                <div
                    onClick={() => navigate('/admin/leads')}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="size-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-xs">
                                <span className="material-symbols-outlined text-2xl">trending_up</span>
                            </div>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                                {winRate > 50 ? 'Above Avg' : 'Normal'}
                            </span>
                        </div>

                        <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider">
                            Deal Win Rate
                        </p>
                        <h3 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white mt-0.5">
                            {winRate}%
                        </h3>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${winRate}%` }}></div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium truncate">
                            {convertedLeadsCount} won of {closedLeadsCount} closed ({conversionRate}% total)
                        </p>
                    </div>
                </div>

                {/* 4. Active Pipeline */}
                <div
                    onClick={() => navigate('/admin/leads')}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-purple-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="size-11 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shadow-xs">
                                <span className="material-symbols-outlined text-2xl">account_balance</span>
                            </div>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                                {hotLeadsCount} Hot
                            </span>
                        </div>

                        <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider">
                            Active Pipeline
                        </p>
                        <h3 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white mt-0.5">
                            {formatPriceCompact(totalLeadsValue)}
                        </h3>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-slate-500">
                        <span>Active Enquiries</span>
                        <span className="text-purple-600 font-extrabold">{activeLeadsCount} leads</span>
                    </div>
                </div>

                {/* 5. Active Packages */}
                <div
                    onClick={() => navigate('/admin/packages')}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-rose-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="size-11 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shadow-xs">
                                <span className="material-symbols-outlined text-2xl">travel_explore</span>
                            </div>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                                Active
                            </span>
                        </div>

                        <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider">
                            Tour Catalog
                        </p>
                        <h3 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white mt-0.5">
                            {activePackages}
                        </h3>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-slate-500">
                        <span>Destinations</span>
                        <span className="text-rose-600 font-extrabold">{masterDataStats.locations} places</span>
                    </div>
                </div>

            </div>

            {/* ─── 3. Actionable Smart Alerts Section ─── */}
            {smartAlerts.length > 0 && (
                <div className="space-y-2.5">
                    <div className="md:hidden">
                        <button
                            onClick={() => setIsAlertsExpanded(!isAlertsExpanded)}
                            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/40 font-bold text-xs text-indigo-900 dark:text-indigo-200"
                        >
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-600 text-[18px]">notifications_active</span>
                                <span>{smartAlerts.length} Actionable Alerts</span>
                            </div>
                            <span className={`material-symbols-outlined transition-transform duration-300 ${isAlertsExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                        </button>
                    </div>

                    <div className={`${isAlertsExpanded ? 'flex flex-col gap-2' : 'hidden'} md:grid md:grid-cols-2 gap-3`}>
                        {smartAlerts.map((alert, idx) => (
                            <div
                                key={idx}
                                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                                    alert.type === 'warning'
                                        ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200'
                                        : alert.type === 'success'
                                        ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200'
                                        : 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50 text-blue-900 dark:text-blue-200'
                                }`}
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="material-symbols-outlined text-[20px] shrink-0">
                                        {alert.type === 'warning' ? 'priority_high' : alert.type === 'success' ? 'verified' : 'info'}
                                    </span>
                                    <span className="font-bold text-xs truncate">{alert.message}</span>
                                </div>
                                <button
                                    onClick={() => navigate(alert.path)}
                                    className="px-3 py-1 rounded-xl text-xs font-black bg-white dark:bg-slate-900 shadow-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors shrink-0 ml-2 cursor-pointer"
                                >
                                    {alert.action} →
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── 4. Unified Cashflow & Working Capital Radar ─── */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="size-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-black text-slate-900 dark:text-white text-sm">Working Capital & Dues Radar</h4>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                netWorkingCapital >= 0
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}>
                                {netWorkingCapital >= 0 ? `+${formatPriceCompact(netWorkingCapital)} Net Liquidity` : `${formatPriceCompact(netWorkingCapital)} Net Position`}
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 font-medium">Real-time comparison between pending client receivables and vendor payables</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40">
                        <span className="text-[9px] font-black uppercase text-emerald-700 dark:text-emerald-300 tracking-wider block">To Collect (Receivables)</span>
                        <span className="text-base font-black text-emerald-700 dark:text-emerald-300 mt-0.5 block">{formatPriceCompact(financialHealth.receivables)}</span>
                    </div>

                    <div className="px-4 py-2 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/40">
                        <span className="text-[9px] font-black uppercase text-rose-700 dark:text-rose-300 tracking-wider block">To Pay (Payables)</span>
                        <span className="text-base font-black text-rose-700 dark:text-rose-300 mt-0.5 block">{formatPriceCompact(financialHealth.payables)}</span>
                    </div>
                </div>
            </div>

            {/* ─── 5. Main Split Grid: Charts & Operational Dispatch ─── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Left (Col Span 2): Revenue Chart & Recent Bookings Table */}
                <div className="xl:col-span-2 flex flex-col gap-6">

                    {/* ─── Today's Active Guest Program Widget (On-Tour Live Operations) ─── */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold shadow-xs">
                                    <span className="material-symbols-outlined text-2xl">tour</span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-black text-slate-900 dark:text-white">Today's Active Guest Program</h3>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 text-[10px] font-black border border-emerald-200 dark:border-emerald-800">
                                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                            {todaysActiveTours.length} Live on Tour
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium mt-0.5">Real-time daily tour progress, assigned transport & 1-click morning briefing</p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/admin/operations?tab=guest-program')}
                                className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 group self-start sm:self-auto cursor-pointer"
                            >
                                <span>Open Operations Hub</span>
                                <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1">arrow_forward</span>
                            </button>
                        </div>

                        {todaysActiveTours.length > 0 ? (
                            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {todaysActiveTours.slice(0, 4).map((tour, idx) => (
                                    <div
                                        key={idx}
                                        className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50 flex flex-col justify-between gap-3 hover:border-teal-500/40 transition-all group"
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-black text-xs text-slate-900 dark:text-white truncate">{tour.customer}</h4>
                                                        <span className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                                            {tour.paxCount || 2} Pax
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 font-medium line-clamp-1 mt-0.5">{tour.title}</p>
                                                </div>
                                                <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-[10px] font-black shrink-0">
                                                    Day {tour.currentDay} of {tour.duration}
                                                </span>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="mt-2.5">
                                                <div className="flex justify-between text-[10px] text-slate-400 font-semibold mb-1">
                                                    <span>Tour Progress</span>
                                                    <span>{tour.percent}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full" style={{ width: `${tour.percent}%` }} />
                                                </div>
                                            </div>

                                            {/* Today's Plan */}
                                            <div className="mt-3 p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 text-[11px] space-y-1">
                                                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-bold truncate">
                                                    <span className="material-symbols-outlined text-[14px] text-teal-500 shrink-0">location_on</span>
                                                    <span className="truncate">{tour.dayTitle}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 truncate">
                                                    <span className="material-symbols-outlined text-[14px] text-blue-500 shrink-0">directions_car</span>
                                                    <span className="truncate">
                                                        {tour.driverInfo ? `Driver: ${tour.driverInfo}${tour.driverPhone ? ` (${tour.driverPhone})` : ''}` : 'No driver allocated'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                                            <button
                                                onClick={() => handleSendMorningBriefing(tour)}
                                                className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs cursor-pointer"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">chat</span>
                                                <span>WhatsApp Morning Briefing</span>
                                            </button>
                                            <button
                                                onClick={() => navigate('/admin/operations?tab=guest-program')}
                                                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                                                title="View in Operations"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">visibility</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                                <div className="size-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                    <span className="material-symbols-outlined text-2xl">luggage</span>
                                </div>
                                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No active traveler tours on the road today</p>
                                {upcomingDepartures.length > 0 ? (
                                    <p className="text-[11px] text-slate-400">
                                        Next departure: <strong className="text-slate-700 dark:text-slate-200">{upcomingDepartures[0].customer}</strong> departing on {new Date(upcomingDepartures[0].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </p>
                                ) : (
                                    <p className="text-[11px] text-slate-400">All recent departures completed or scheduled for next week.</p>
                                )}
                                <button
                                    onClick={() => navigate('/admin/operations?tab=checklist-hub')}
                                    className="mt-2 text-xs font-bold text-teal-600 hover:underline cursor-pointer"
                                >
                                    Check 10-Point Pre-Tour Departure Readiness →
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Executive Revenue Overview Chart Card */}
                    <div className="bg-white dark:bg-slate-900 p-5 lg:p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col gap-5">
                        
                        {/* Header Controls */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Revenue Overview</h3>
                                    {revenueAnalytics.yoyGrowth !== 0 && (
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                                            revenueAnalytics.yoyGrowth > 0
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                        }`}>
                                            <span className="material-symbols-outlined text-[12px]">
                                                {revenueAnalytics.yoyGrowth > 0 ? 'trending_up' : 'trending_down'}
                                            </span>
                                            {revenueAnalytics.yoyGrowth > 0 ? `+${revenueAnalytics.yoyGrowth}%` : `${revenueAnalytics.yoyGrowth}%`} YoY
                                        </span>
                                    )}
                                </div>
                                <p className="text-slate-400 text-xs font-medium mt-0.5">
                                    Monthly collection timeline, invoicing volume, and profit margins
                                </p>
                            </div>

                            {/* View Mode Segmented Controls & Export Action */}
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                    <button
                                        onClick={() => setChartMetricMode('collected')}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            chartMetricMode === 'collected'
                                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        Cash Collected
                                    </button>
                                    <button
                                        onClick={() => setChartMetricMode('comparison')}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            chartMetricMode === 'comparison'
                                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        Invoiced
                                    </button>
                                    <button
                                        onClick={() => setChartMetricMode('profit')}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            chartMetricMode === 'profit'
                                                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        Margin
                                    </button>
                                </div>

                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    className="bg-slate-100 dark:bg-slate-800 border-none text-xs font-bold rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-300 cursor-pointer outline-none"
                                >
                                    <option value="This Year">This Year ({new Date().getFullYear()})</option>
                                    <option value="Last Year">Last Year ({new Date().getFullYear() - 1})</option>
                                </select>

                                <button
                                    onClick={handleExportRevenueCSV}
                                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                                    title="Export to CSV"
                                >
                                    <span className="material-symbols-outlined text-[18px]">file_download</span>
                                </button>
                            </div>
                        </div>

                        {/* Executive Metric Highlights Strip */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Collected Cash</p>
                                <p className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                                    {formatPriceCompact(revenueAnalytics.totalYearCollected)}
                                </p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Gross Invoiced</p>
                                <p className="text-base font-black text-amber-500 mt-0.5">
                                    {formatPriceCompact(revenueAnalytics.totalYearInvoiced)}
                                </p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Office OPEX</p>
                                <p className="text-base font-black text-rose-500 mt-0.5">
                                    {formatPriceCompact(revenueAnalytics.totalYearOpex)}
                                </p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">True Net Profit</p>
                                <p className={`text-base font-black mt-0.5 ${revenueAnalytics.totalYearNetProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {formatPriceCompact(revenueAnalytics.totalYearNetProfit)}
                                </p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Efficiency & Peak</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <span className="text-xs font-black text-emerald-500">{revenueAnalytics.collectionEfficiency}%</span>
                                    <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-black text-[10px]">
                                        {revenueAnalytics.peakMonth.name} ({formatPriceCompact(revenueAnalytics.peakMonth.revenue)})
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Recharts Visualization Container */}
                        <div className="relative h-[280px] w-full mt-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart 
                                    data={revenueData} 
                                    margin={{ top: 15, right: 10, left: -10, bottom: 0 }}
                                    onClick={handleChartPointClick}
                                >
                                    <defs>
                                        <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35}/>
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                                        </linearGradient>
                                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                                        </linearGradient>
                                    </defs>

                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                                    
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                                        dy={10}
                                    />
                                    
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                                        tickFormatter={(value) => formatPriceCompact(value)}
                                        dx={-5}
                                    />
                                    
                                    <Tooltip content={<CustomTooltip />} />

                                    {(chartMetricMode === 'collected' || chartMetricMode === 'comparison') && (
                                        <Area 
                                            type="monotone" 
                                            dataKey="revenue" 
                                            stroke="#6366f1" 
                                            strokeWidth={3}
                                            fillOpacity={1} 
                                            fill="url(#colorCollected)" 
                                            activeDot={{ r: 7, strokeWidth: 2, stroke: '#ffffff', fill: '#6366f1' }}
                                        />
                                    )}

                                    {chartMetricMode === 'comparison' && (
                                        <Line 
                                            type="monotone" 
                                            dataKey="bookingValue" 
                                            stroke="#f59e0b" 
                                            strokeWidth={2.5}
                                            strokeDasharray="4 4"
                                            dot={{ r: 3, fill: '#f59e0b' }}
                                            activeDot={{ r: 6, strokeWidth: 2, stroke: '#ffffff', fill: '#f59e0b' }}
                                        />
                                    )}

                                    {chartMetricMode === 'profit' && (
                                        <>
                                            <Line 
                                                type="monotone" 
                                                dataKey="grossProfit" 
                                                stroke="#3b82f6" 
                                                strokeWidth={2}
                                                strokeDasharray="4 4"
                                                dot={{ r: 3, fill: '#3b82f6' }}
                                                activeDot={{ r: 6, strokeWidth: 2, stroke: '#ffffff', fill: '#3b82f6' }}
                                            />
                                            <Area 
                                                type="monotone" 
                                                dataKey="netProfit" 
                                                stroke="#10b981" 
                                                strokeWidth={3}
                                                fillOpacity={1} 
                                                fill="url(#colorProfit)" 
                                                activeDot={{ r: 7, strokeWidth: 2, stroke: '#ffffff', fill: '#10b981' }}
                                            />
                                        </>
                                    )}
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Recent Bookings & Dispatch Readiness */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white">Recent Bookings & Tours</h3>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">Active client departures and payment progress</p>
                            </div>
                            <Link to="/admin/bookings" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group">
                                <span>All Bookings</span>
                                <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1">arrow_forward</span>
                            </Link>
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    <tr>
                                        <th className="px-5 py-3.5">Customer & Tour</th>
                                        <th className="px-5 py-3.5">Departure</th>
                                        <th className="px-5 py-3.5">Gross Amount</th>
                                        <th className="px-5 py-3.5 text-right">Payment</th>
                                        <th className="px-5 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                                    {bookings.slice(0, 5).map((row, i) => {
                                        const daysLeft = Math.ceil((new Date(row.date).getTime() - Date.now()) / (1000 * 3600 * 24));
                                        return (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer" onClick={() => navigate('/admin/bookings')}>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black flex items-center justify-center text-xs">
                                                            {row.customer?.charAt(0) || 'C'}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900 dark:text-white text-xs">{row.customer}</p>
                                                            <p className="text-[11px] text-slate-400 line-clamp-1">{row.title}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <p className="font-bold text-slate-700 dark:text-slate-300">{new Date(row.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                                                    <p className="text-[10px] text-slate-400">
                                                        {daysLeft > 0 ? `Starts in ${daysLeft}d` : daysLeft === 0 ? 'Starts Today' : 'Completed'}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-3.5 font-black text-slate-900 dark:text-white">
                                                    {formatPrice(row.amount)}
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        row.payment === 'Paid'
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                                            : row.payment === 'Deposit'
                                                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                                                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                                                    }`}>
                                                        ● {row.payment}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    {row.phone && (
                                                        <a
                                                            href={`https://wa.me/${row.phone.replace(/\D/g, '')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 inline-flex items-center justify-center transition-colors"
                                                            title="WhatsApp Customer"
                                                        >
                                                            <span className="material-symbols-outlined text-[15px]">chat</span>
                                                        </a>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ─── Unified Due Payments & Financial Horizon Console (Screenshot 24 Benchmark) ─── */}
                    <div id="unified-dues-section" className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-black text-slate-900 dark:text-white">Due Payments & Financial Horizon</h3>
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-black">
                                        {filteredDues.length} shown
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">
                                    Unified radar of pending customer collections & upcoming vendor supplier payables
                                </p>
                            </div>

                            {/* Dues Tab Segmented Control & Filter */}
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                    <button
                                        onClick={() => setDuesTab('all')}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            duesTab === 'all'
                                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        All Dues ({unifiedDues.items.length})
                                    </button>
                                    <button
                                        onClick={() => setDuesTab('receivables')}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            duesTab === 'receivables'
                                                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        Receivables ({unifiedDues.receivablesCount})
                                    </button>
                                    <button
                                        onClick={() => setDuesTab('payables')}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            duesTab === 'payables'
                                                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        Payables ({unifiedDues.payablesCount})
                                    </button>
                                </div>

                                <select
                                    value={duesHorizon}
                                    onChange={(e) => setDuesHorizon(e.target.value as any)}
                                    className="bg-slate-100 dark:bg-slate-800 border-none text-xs font-bold rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-300 cursor-pointer outline-none"
                                >
                                    <option value="7d">Due within 7 Days</option>
                                    <option value="all">All Pending Dates</option>
                                    <option value="overdue">Overdue Only ({unifiedDues.overdueCount})</option>
                                </select>
                            </div>
                        </div>

                        {/* KPI Cashflow Horizon Strip */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50/60 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Receivables</p>
                                    <h4 className="text-base font-black text-slate-900 dark:text-white mt-0.5">{formatPrice(unifiedDues.totalReceivables)}</h4>
                                </div>
                                <span className="material-symbols-outlined text-emerald-500 text-2xl">call_received</span>
                            </div>

                            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Total Payables Due</p>
                                    <h4 className="text-base font-black text-slate-900 dark:text-white mt-0.5">{formatPrice(unifiedDues.totalPayables)}</h4>
                                </div>
                                <span className="material-symbols-outlined text-amber-500 text-2xl">call_made</span>
                            </div>

                            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Net Cashflow Horizon</p>
                                    <h4 className={`text-base font-black mt-0.5 ${unifiedDues.netHorizon >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                        {formatPrice(unifiedDues.netHorizon)}
                                    </h4>
                                </div>
                                <span className="material-symbols-outlined text-indigo-500 text-2xl">account_balance_wallet</span>
                            </div>
                        </div>

                        {/* Due Items List */}
                        <div>
                            {filteredDues.length > 0 ? (
                                <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
                                    {(showAllDues ? filteredDues : filteredDues.slice(0, 6)).map((item) => {
                                        const isRecv = item.type === 'receivable';
                                        const dueLabel = item.isOverdue
                                            ? `Overdue by ${Math.abs(item.daysUntilDue)}d`
                                            : item.daysUntilDue === 0
                                            ? 'Due today'
                                            : `Due in ${item.daysUntilDue}d`;
                                        const dueTone = item.isOverdue
                                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                                            : item.daysUntilDue <= 7
                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
                                        return (
                                            <li key={item.id} className="px-4 sm:px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                {/* Line 1: party + amount */}
                                                <div className="flex items-start gap-3">
                                                    <div className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${
                                                        isRecv
                                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                                    }`}>
                                                        <span className="material-symbols-outlined text-[18px]">{isRecv ? 'person' : 'store'}</span>
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate" title={item.partyName}>{item.partyName}</p>
                                                        <p className="text-[11px] text-slate-400 truncate" title={item.bookingTitle}>{item.bookingTitle}</p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-[13px] font-black tabular-nums text-slate-900 dark:text-white">{formatPrice(item.balanceDue)}</p>
                                                        <p className="text-[10px] text-slate-400 tabular-nums">of {formatPriceCompact(item.totalAmount)}</p>
                                                    </div>
                                                </div>

                                                {/* Line 2: status chips + action */}
                                                <div className="mt-2 pl-12 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                                        isRecv
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                                                    }`}>
                                                        {isRecv ? 'Client Balance' : 'Vendor Payable'}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${dueTone}`}>
                                                        {dueLabel}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        {new Date(item.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                    {isRecv && !item.isOverdue && item.daysUntilDue <= 7 && (
                                                        <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 inline-flex items-center gap-0.5">
                                                            <span className="material-symbols-outlined text-[11px]">flight_takeoff</span>
                                                            Collect before travel
                                                        </span>
                                                    )}

                                                    <div className="ml-auto">
                                                        {isRecv ? (
                                                            <button
                                                                onClick={() => handleSendPaymentReminder(item)}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
                                                                title="Send 1-click WhatsApp reminder"
                                                            >
                                                                <span className="material-symbols-outlined text-[14px]">chat</span>
                                                                <span>Remind</span>
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => {
                                                                    const params = new URLSearchParams();
                                                                    if (item.bookingId) params.set('manageSuppliers', item.bookingId);
                                                                    if (item.supplierBookingId) params.set('supplierBookingId', item.supplierBookingId);
                                                                    navigate(`/admin/bookings?${params.toString()}`);
                                                                }}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
                                                                title="Manage supplier payments and allocations"
                                                            >
                                                                <span className="material-symbols-outlined text-[14px]">payments</span>
                                                                <span>Manage</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <div className="p-8 text-center text-slate-400 text-xs">
                                    <span className="material-symbols-outlined text-3xl mb-1 text-slate-300">verified</span>
                                    <p className="font-bold text-slate-700 dark:text-slate-300">No pending dues in this category</p>
                                    <p className="text-[11px] text-slate-400">All customer payments and supplier balances are up to date for this horizon.</p>
                                </div>
                            )}
                        </div>

                        {filteredDues.length > 6 && (
                            <div className="p-3 border-t border-slate-100 dark:border-slate-800 text-center">
                                <button
                                    onClick={() => setShowAllDues(!showAllDues)}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                                >
                                    {showAllDues ? 'Show Fewer Dues' : `View All ${filteredDues.length} Dues`}
                                </button>
                            </div>
                        )}
                    </div>

                </div>

                {/* Right (Col Span 1): Priority Action Queue & Operational Radars */}
                <div className="flex flex-col gap-6">

                    {/* Pending Deletion Requests (Admin Only) */}
                    {currentUser?.userType === 'Admin' && deletionRequests.length > 0 && (
                        <div className="bg-rose-50/80 dark:bg-rose-950/30 p-5 rounded-3xl border border-rose-200 dark:border-rose-800/60 shadow-xs">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-black text-xs text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px] text-rose-600">delete_sweep</span>
                                    <span>Pending Deletions ({deletionRequests.length})</span>
                                </h4>
                            </div>
                            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                                {deletionRequests.map((req) => (
                                    <div key={req.id} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-rose-100 dark:border-rose-900/40 text-xs flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-900 dark:text-white truncate">{req.record_name}</span>
                                            <span className="text-[9px] font-black uppercase text-rose-600 bg-rose-100 dark:bg-rose-950 px-1.5 py-0.5 rounded">{req.table_name}</span>
                                        </div>
                                        <div className="flex gap-1.5">
                                            <button onClick={() => handleRejectDeletion(req.id)} className="flex-1 py-1 rounded-lg border border-slate-200 text-slate-600 text-[11px] font-bold">Reject</button>
                                            <button onClick={() => handleApproveDeletion(req.id)} className="flex-1 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold">Approve</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* My Action Queue (Prioritized Operational Directives) */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                        <div className="flex items-center justify-between mb-3.5">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-rose-500 text-[18px]">assignment</span>
                                <h4 className="font-black text-xs text-slate-900 dark:text-white">Priority Action Queue</h4>
                            </div>
                            <span className="size-5 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400 text-[10px] font-black flex items-center justify-center">
                                {myActionItems.length}
                            </span>
                        </div>

                        <div className="space-y-2">
                            {myActionItems.length > 0 ? myActionItems.map((item, i) => (
                                <div
                                    key={i}
                                    onClick={() => navigate(item.link)}
                                    className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer flex items-start gap-2.5 group"
                                >
                                    <div className={`mt-0.5 size-7 rounded-lg flex items-center justify-center ${item.color} shrink-0`}>
                                        <span className="material-symbols-outlined text-[15px]">{item.icon}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.title}</p>
                                        <p className="text-[11px] text-slate-400 line-clamp-1">{item.desc}</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-5 text-center text-xs text-slate-400 font-medium">
                                    ✓ All caught up! No pending actions.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Upcoming Departures */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                        <div className="flex justify-between items-center mb-3.5">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-teal-500 text-[18px]">flight_takeoff</span>
                                <h4 className="font-black text-xs text-slate-900 dark:text-white">Upcoming Departures</h4>
                            </div>
                            <span className="text-[10px] font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">Next 14d</span>
                        </div>

                        <div className="space-y-2.5">
                            {upcomingDepartures.length > 0 ? upcomingDepartures.map((dep, i) => (
                                <div key={i} className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 text-xs">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white">{dep.customer}</p>
                                        <p className="text-[11px] text-slate-400">{dep.title?.split('-')[0]}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-teal-600 dark:text-teal-400">{new Date(dep.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">
                                            {Math.ceil((new Date(dep.date).getTime() - Date.now()) / (1000 * 3600 * 24))}d left
                                        </p>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-5 text-center text-xs text-slate-400 font-medium">
                                    No imminent departures in next 14 days.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sales Leaderboard */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-amber-500 text-[18px]">emoji_events</span>
                                <span>Top Sales Performers</span>
                            </h4>
                            <select
                                value={salesTimeFilter}
                                onChange={(e) => setSalesTimeFilter(e.target.value as any)}
                                className="bg-slate-100 dark:bg-slate-800 border-none text-[10px] font-bold rounded-lg px-2 py-1 text-slate-600 dark:text-slate-300 cursor-pointer outline-none"
                            >
                                <option value="7">7 Days</option>
                                <option value="14">14 Days</option>
                                <option value="30">30 Days</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            {salesLeaderboard.map((user, i) => (
                                <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs">
                                    <div className="flex items-center gap-2.5">
                                        <div className="size-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                                            {user.initials}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">{user.name}</p>
                                            <p className="text-[10px] text-slate-400">{user.count} deals</p>
                                        </div>
                                    </div>
                                    <span className="font-black text-indigo-600 dark:text-indigo-400">{formatPriceCompact(user.revenue)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Activity Timeline */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                        <h4 className="font-black text-xs text-slate-900 dark:text-white mb-3">Live System Activity</h4>
                        <div className="space-y-3">
                            {recentActivities.map((item, i) => (
                                <div key={i} className="flex items-start gap-2.5 text-xs">
                                    <span className={`material-symbols-outlined text-[16px] ${item.color} mt-0.5 shrink-0`}>{item.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-900 dark:text-white truncate">{item.title}</p>
                                        <p className="text-[10px] text-slate-400">{item.displayTime}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ─── Intelligence Sub-Widgets (Stacked Vertically in Right Rail) ─── */}

                    {/* 1. Lead Funnel */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-3.5">
                            <div className="flex items-center gap-2">
                                <div className="size-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[18px]">filter_alt</span>
                                </div>
                                <div>
                                    <h4 className="font-black text-xs text-slate-900 dark:text-white">Lead Funnel</h4>
                                    <p className="text-[10px] text-slate-400">Pipeline conversion stages</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                                {leads.length} Leads
                            </span>
                        </div>
                        <div className="space-y-3 pt-1">
                            {leadFunnel.map((stage, i) => (
                                <div key={i} className="space-y-1.5">
                                    <div className="flex items-center justify-between text-[11px] font-bold">
                                        <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                            <span className={`size-1.5 rounded-full bg-gradient-to-r ${stage.color}`}></span>
                                            {stage.stage}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-400 font-semibold">{stage.width}</span>
                                            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-700 dark:text-slate-300 tabular-nums">
                                                {stage.count}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full bg-gradient-to-r ${stage.color} transition-all duration-500`} 
                                            style={{ width: stage.width }} 
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 2. Trending Destinations */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-3.5">
                            <div className="flex items-center gap-2">
                                <div className="size-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[18px]">map</span>
                                </div>
                                <div>
                                    <h4 className="font-black text-xs text-slate-900 dark:text-white">Trending Destinations</h4>
                                    <p className="text-[10px] text-slate-400">Most booked tour circuits</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50">
                                Top Circuits
                            </span>
                        </div>
                        <div className="space-y-2">
                            {topDestinations.map((dest, i) => (
                                <div 
                                    key={i} 
                                    className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-xs"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <span className={`size-5 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                                            i === 0 
                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' 
                                                : i === 1 
                                                ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' 
                                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                        }`}>
                                            #{i + 1}
                                        </span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{dest.name}</span>
                                    </div>
                                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200/50 dark:border-emerald-800/50 px-2 py-0.5 rounded-full shrink-0">
                                        {dest.count} tours
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 3. Lead Acquisition Channels */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-3.5">
                            <div className="flex items-center gap-2">
                                <div className="size-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[18px]">hub</span>
                                </div>
                                <div>
                                    <h4 className="font-black text-xs text-slate-900 dark:text-white">Lead Channels</h4>
                                    <p className="text-[10px] text-slate-400">Acquisition win rate</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50">
                                Win Rates
                            </span>
                        </div>
                        <div className="space-y-2.5">
                            {leadSourcesData.map((src, i) => (
                                <div key={i} className="p-2.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 text-xs space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-700 dark:text-slate-300 truncate">{src.source}</span>
                                        <span className="text-[11px] font-black text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-md bg-purple-100/70 dark:bg-purple-950/80">
                                            {src.rate}% win
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-200/60 dark:bg-slate-700/60 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full rounded-full bg-purple-500 transition-all duration-500" 
                                            style={{ width: `${Math.min(100, Math.max(0, src.rate))}%` }} 
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

            </div>

        </div>
    );
};