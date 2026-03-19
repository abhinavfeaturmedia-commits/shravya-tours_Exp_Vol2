import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const {
        bookings: globalBookings, packages, leads: globalLeads, vendors, masterLocations, masterHotels, masterActivities,
        tasks, followUps,
    } = useData();
    const { currentUser, staff } = useAuth();
    const [greeting, setGreeting] = useState('');
    const [selectedYear, setSelectedYear] = useState('This Year');
    const [salesTimeFilter, setSalesTimeFilter] = useState<'7' | '14' | '30'>('7');

    // --- RBAC Scoping ---
    const isRestricted = currentUser?.queryScope === 'Show Assigned Query Only';

    const bookings = useMemo(() => {
        if (!isRestricted) return globalBookings;
        return globalBookings.filter(b => b.assignedTo === currentUser?.id);
    }, [globalBookings, isRestricted, currentUser?.id]);

    const leads = useMemo(() => {
        if (!isRestricted) return globalLeads;
        return globalLeads.filter(l => l.assignedTo === currentUser?.id);
    }, [globalLeads, isRestricted, currentUser?.id]);

    // --- Enhanced Business Intelligence Calculations ---

    // Revenue Metrics
    const totalRevenue = bookings.reduce((acc, b) => b.payment === 'Paid' ? acc + b.amount : acc, 0);
    const bookingCount = bookings.length;
    const activePackages = packages.filter(p => p.status === 'Active').length;

    // Lead Analytics
    const newLeadsCount = leads.filter(l => l.status === 'New').length;
    const hotLeadsCount = leads.filter(l => l.status === 'Hot').length;
    const convertedLeadsCount = leads.filter(l => l.status === 'Converted').length;
    const totalLeadsValue = leads.reduce((sum, l) => sum + l.potentialValue, 0);

    // Conversion Rate Calculation
    const conversionRate = leads.length > 0
        ? Math.round((convertedLeadsCount / leads.length) * 100)
        : 0;

    // Pending Actions
    const pendingBookings = bookings.filter(b => b.status === 'Pending').length;
    const unpaidBookings = bookings.filter(b => b.payment === 'Unpaid').length;

    // Recent Week Analysis (simulated comparison)
    const thisWeekBookings = bookings.filter(b => {
        const bookingDate = new Date(b.date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return bookingDate >= weekAgo;
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

        if (unpaidBookings > 0) {
            alerts.push({
                type: 'warning',
                message: `${unpaidBookings} booking${unpaidBookings > 1 ? 's' : ''} pending payment`,
                action: 'Collect Payment',
                path: '/admin/bookings'
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

        if (conversionRate > 25) {
            alerts.push({
                type: 'success',
                message: `Great conversion rate: ${conversionRate}%! Keep it up.`,
                action: 'View Analytics',
                path: '/admin/analytics'
            });
        }

        return alerts;
    }, [hotLeadsCount, unpaidBookings, pendingBookings, conversionRate]);

    // Dynamic Activity Log with better time display
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
                desc: `${b.title} - ₹${b.amount.toLocaleString()}`,
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

    // --- Sales Leaderboard Calculation ---
    const salesLeaderboard = useMemo(() => {
        const daysToSubtract = parseInt(salesTimeFilter);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToSubtract);
        cutoffDate.setHours(0, 0, 0, 0);

        // Filter valid bookings within timeframe
        const validBookings = globalBookings.filter(b => {
            if (isRestricted && b.assignedTo !== currentUser?.id) return false;
            if (b.status === 'Cancelled') return false;
            const bDate = new Date(b.date);
            return bDate >= cutoffDate;
        });

        const salesMap = new Map<number, { count: number, revenue: number, name: string, initials: string, color: string }>();

        validBookings.forEach(b => {
            if (b.assignedTo) {
                const existing = salesMap.get(b.assignedTo) || { count: 0, revenue: 0, name: 'Unknown Staff', initials: 'US', color: 'slate' };
                // Find staff details if first time
                if (existing.count === 0) {
                    const st = staff.find(s => s.id === b.assignedTo);
                    if (st) {
                        existing.name = st.name;
                        existing.initials = st.initials;
                        existing.color = st.color;
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
        }).slice(0, 5); // Top 5
    }, [globalBookings, salesTimeFilter, staff, isRestricted, currentUser]);

    // --- 1. Lead Conversion Funnel ---
    const leadFunnel = useMemo(() => {
        const counts = { New: 0, Warm: 0, Hot: 0, 'Offer Sent': 0, Converted: 0, Cold: 0 };
        leads.forEach(l => {
            if (counts[l.status as keyof typeof counts] !== undefined) {
                counts[l.status as keyof typeof counts]++;
            }
        });
        const total = leads.length || 1;
        return [
            { stage: 'New', count: counts.New, color: 'from-blue-400 to-indigo-500', width: `${(counts.New / total) * 100}%` },
            { stage: 'Warm', count: counts.Warm, color: 'from-amber-400 to-orange-500', width: `${(counts.Warm / total) * 100}%` },
            { stage: 'Hot', count: counts.Hot, color: 'from-rose-400 to-red-500', width: `${(counts.Hot / total) * 100}%` },
            { stage: 'Offer Sent', count: counts['Offer Sent'], color: 'from-purple-400 to-fuchsia-500', width: `${(counts['Offer Sent'] / total) * 100}%` },
            { stage: 'Converted', count: counts.Converted, color: 'from-emerald-400 to-teal-500', width: `${(counts.Converted / total) * 100}%` },
        ].filter(f => f.count > 0);
    }, [leads]);

    // --- 2. Upcoming Departures (Next 14 Days) ---
    const upcomingDepartures = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const in14Days = new Date(now);
        in14Days.setDate(in14Days.getDate() + 14);

        return bookings.filter(b => {
            if (b.status === 'Cancelled') return false;
            // Extract start date from generic booking date (assuming the primary date field is start date for this context)
            const bDate = new Date(b.date);
            return bDate >= now && bDate <= in14Days;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 5);
    }, [bookings]);

    // --- 3. My Pending Follow-ups & Tasks ---
    const myActionItems = useMemo(() => {
        // Collect FollowUps
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
            color: f.status === 'Overdue' ? 'text-rose-500 bg-rose-50' : 'text-amber-500 bg-amber-50',
            link: '/admin/leads'
        }));

        // Collect Tasks
        const pendingTasks = (tasks || []).filter(t => {
            if (t.assignedTo !== currentUser?.id) return false;
            return t.status === 'Pending' || t.status === 'In Progress' || t.status === 'Overdue';
        }).map(t => ({
            id: t.id,
            type: 'Task' as const,
            title: t.title,
            desc: t.description || 'Action required',
            date: new Date(t.dueDate),
            icon: 'task_alt',
            color: t.status === 'Overdue' || t.priority === 'Urgent' ? 'text-rose-500 bg-rose-50' : 'text-indigo-500 bg-indigo-50',
            link: '/admin/tasks' // Assuming tasks page exists, or generic
        }));

        return [...pendingFollowUps, ...pendingTasks]
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .slice(0, 5);
    }, [followUps, tasks, currentUser]);

    // --- 4. Top Destinations ---
    const topDestinations = useMemo(() => {
        const destMap = new Map<string, number>();
        bookings.forEach(b => {
            if (b.status !== 'Cancelled' && b.title) {
                // Approximate destination by booking title if location isn't strictly normalized
                const dest = b.title.split('-')[0].trim() || 'Unknown';
                destMap.set(dest, (destMap.get(dest) || 0) + 1);
            }
        });
        return Array.from(destMap.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 4);
    }, [bookings]);

    // --- 5. Outstanding Payments & Dues ---
    const financialHealth = useMemo(() => {
        let receivables = 0;
        let payables = 0;

        bookings.forEach(b => {
            if (b.status === 'Cancelled') return;

            // Receivables calculations
            if (b.payment === 'Unpaid' || b.payment === 'Deposit') {
                const paid = (b.transactions || []).filter(t => t.type === 'Payment').reduce((sum, t) => sum + t.amount, 0);
                const refunded = (b.transactions || []).filter(t => t.type === 'Refund').reduce((sum, t) => sum + t.amount, 0);
                const netPaid = paid - refunded;
                const remaining = b.amount - netPaid;
                if (remaining > 0) receivables += remaining;
            }

            // Payables calculations (Supplier Bookings)
            if (b.supplierBookings) {
                b.supplierBookings.forEach(sb => {
                    if (sb.bookingStatus !== 'Cancelled' && (sb.paymentStatus === 'Unpaid' || sb.paymentStatus === 'Partially Paid')) {
                        const remaining = sb.cost - (sb.paidAmount || 0);
                        if (remaining > 0) payables += remaining;
                    }
                });
            }
        });

        return { receivables, payables };
    }, [bookings]);

    // --- 6. Lead Source Performance ---
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


    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 18) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');
    }, []);

    return (
        <div className="p-6 lg:p-10 max-w-[1600px] mx-auto space-y-8">

            {/* 1. Hero Section */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 dark:bg-[#1A202C] text-white shadow-2xl shadow-slate-900/10">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-700 to-slate-900 opacity-90"></div>

                {/* Abstract Shapes */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-500/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>

                <div className="relative z-10 p-8 lg:p-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                    <div className="space-y-4 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-bold uppercase tracking-widest text-indigo-100">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                            System Online
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                            {greeting}, {currentUser?.name || 'there'}.
                        </h1>
                        <p className="text-lg text-indigo-100 font-medium leading-relaxed opacity-90">
                            Here's what's happening in your travel business today. You have <span className="text-white font-bold underline decoration-indigo-400 decoration-2 underline-offset-4">{pendingBookings} pending bookings</span> requiring action.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <button onClick={() => navigate('/admin/itinerary-builder')} className="group flex items-center gap-3 px-6 py-4 bg-white text-slate-900 rounded-2xl font-bold shadow-xl shadow-white/10 hover:bg-indigo-50 transition-all active:scale-95">
                            <div className="size-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-[18px]">add</span>
                            </div>
                            <span>Create Package</span>
                        </button>
                        <button onClick={() => navigate('/admin/bookings')} className="flex items-center gap-3 px-6 py-4 bg-white/10 text-white backdrop-blur-md border border-white/10 rounded-2xl font-bold hover:bg-white/20 transition-all active:scale-95">
                            <span>Manage Bookings</span>
                            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Key Performance Indicators - Premium Gradient Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Revenue', value: `₹${(totalRevenue / 100000).toFixed(2)}L`, icon: 'payments', gradient: 'from-emerald-500 to-teal-600', shadowColor: 'shadow-emerald-500/20', trend: thisWeekBookings > 0 ? `${thisWeekBookings} this week` : 'No bookings', trendUp: thisWeekBookings > 0 },
                    { label: 'Conversion Rate', value: `${conversionRate}%`, icon: 'trending_up', gradient: 'from-blue-500 to-indigo-600', shadowColor: 'shadow-blue-500/20', trend: conversionRate > 20 ? 'Above avg' : 'Needs focus', trendUp: conversionRate > 20 },
                    { label: 'Pipeline Value', value: `₹${(totalLeadsValue / 100000).toFixed(1)}L`, icon: 'account_balance', gradient: 'from-violet-500 to-purple-600', shadowColor: 'shadow-violet-500/20', trend: `${hotLeadsCount} hot leads`, trendUp: hotLeadsCount > 0 },
                    { label: 'Active Packages', value: activePackages, icon: 'travel_explore', gradient: 'from-orange-500 to-rose-500', shadowColor: 'shadow-orange-500/20', trend: `${masterDataStats.locations} destinations`, trendUp: null },
                ].map((kpi, idx) => (
                    <div key={idx} className="group relative bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden card-lift">
                        {/* Gradient Background Accent */}
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${kpi.gradient} opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500`} />

                        <div className="relative p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`size-14 rounded-2xl bg-gradient-to-br ${kpi.gradient} text-white flex items-center justify-center shadow-xl ${kpi.shadowColor} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                                    <span className="material-symbols-outlined text-2xl">{kpi.icon}</span>
                                </div>
                                <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 backdrop-blur-sm ${kpi.trendUp ? 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : kpi.trendUp === false ? 'bg-amber-100/80 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100/80 text-slate-600 dark:bg-slate-800/80 dark:text-slate-400'}`}>
                                    {kpi.trendUp && <span className="material-symbols-outlined text-[12px]">arrow_upward</span>}
                                    {kpi.trendUp === false && <span className="material-symbols-outlined text-[12px]">priority_high</span>}
                                    {kpi.trend}
                                </div>
                            </div>
                            <div>
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">{kpi.label}</p>
                                <h3 className="text-4xl kpi-number text-slate-900 dark:text-white mt-1">{kpi.value}</h3>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Smart Alerts Section - Modern Glassmorphism */}
            {smartAlerts.length > 0 && (
                <div className="space-y-3">
                    {smartAlerts.map((alert, idx) => (
                        <div key={idx} className={`group flex items-center justify-between p-5 rounded-2xl backdrop-blur-sm border transition-all duration-300 hover:scale-[1.01] ${alert.type === 'warning'
                            ? 'bg-gradient-to-r from-amber-50/90 to-orange-50/90 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200/50 dark:border-amber-700/30'
                            : alert.type === 'success'
                                ? 'bg-gradient-to-r from-emerald-50/90 to-teal-50/90 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200/50 dark:border-emerald-700/30'
                                : 'bg-gradient-to-r from-blue-50/90 to-indigo-50/90 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200/50 dark:border-blue-700/30'
                            }`}>
                            <div className="flex items-center gap-4">
                                <div className={`size-10 rounded-xl flex items-center justify-center ${alert.type === 'warning'
                                    ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                                    : alert.type === 'success'
                                        ? 'bg-gradient-to-br from-emerald-400 to-teal-500'
                                        : 'bg-gradient-to-br from-blue-400 to-indigo-500'
                                    }`}>
                                    <span className="material-symbols-outlined text-white text-[20px]">
                                        {alert.type === 'warning' ? 'priority_high' : alert.type === 'success' ? 'check' : 'info'}
                                    </span>
                                </div>
                                <span className="font-semibold text-slate-700 dark:text-slate-200">{alert.message}</span>
                            </div>
                            <button
                                onClick={() => navigate(alert.path)}
                                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all btn-press shadow-lg ${alert.type === 'warning'
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/25 hover:shadow-amber-500/40'
                                    : alert.type === 'success'
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/25 hover:shadow-emerald-500/40'
                                        : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-blue-500/25 hover:shadow-blue-500/40'
                                    }`}
                            >
                                {alert.action}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Financial Health Ribbon - Quick visibility for Top Mgmt */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white flex items-center justify-between shadow-lg shadow-emerald-500/20">
                    <div>
                        <p className="text-emerald-100 text-sm font-bold uppercase tracking-wider mb-1">To Collect (Receivables)</p>
                        <h4 className="text-3xl font-black">₹{(financialHealth.receivables / 100000).toFixed(2)}L</h4>
                        <p className="text-xs text-emerald-100 mt-2 font-medium">Pending payments from customers</p>
                    </div>
                    <div className="size-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
                        <span className="material-symbols-outlined text-[32px]">system_update_alt</span>
                    </div>
                </div>
                <div className="bg-gradient-to-r from-rose-500 to-orange-600 rounded-2xl p-6 text-white flex items-center justify-between shadow-lg shadow-rose-500/20">
                    <div>
                        <p className="text-rose-100 text-sm font-bold uppercase tracking-wider mb-1">To Pay (Payables)</p>
                        <h4 className="text-3xl font-black">₹{(financialHealth.payables / 100000).toFixed(2)}L</h4>
                        <p className="text-xs text-rose-100 mt-2 font-medium">Pending dues to vendors & hotels</p>
                    </div>
                    <div className="size-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
                        <span className="material-symbols-outlined text-[32px]">publish</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* 3. Main Chart & Table Area */}
                <div className="xl:col-span-2 flex flex-col gap-8">

                    {/* Revenue Chart Placeholder */}
                    <div className="bg-white dark:bg-[#151d29] p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Revenue Overview</h3>
                                <p className="text-slate-500 text-sm font-medium mt-1">Monthly performance statistics</p>
                            </div>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-900 border-none text-sm font-bold rounded-xl px-4 py-2 text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="This Year">This Year</option>
                                <option value="Last Year">Last Year</option>
                            </select>
                        </div>

                        {/* SVG Chart Visualization */}
                        <div className="relative h-[280px] w-full">
                            <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 300" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.15" />
                                        <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                {/* Grid Lines */}
                                {[0, 75, 150, 225, 300].map((y, i) => (
                                    <line key={i} x1="0" y1={300 - y} x2="1000" y2={300 - y} stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" strokeDasharray="4 4" />
                                ))}
                                {/* Smooth Curve Data: Example */}
                                {selectedYear === 'This Year' ? (
                                    <>
                                        <path
                                            d="M0,250 C100,280 200,100 300,150 C400,200 500,80 600,120 C700,160 800,40 900,80 L1000,60"
                                            fill="none"
                                            stroke="#6366f1"
                                            strokeWidth="4"
                                            strokeLinecap="round"
                                            className="drop-shadow-lg"
                                        />
                                        <path
                                            d="M0,250 C100,280 200,100 300,150 C400,200 500,80 600,120 C700,160 800,40 900,80 L1000,60 L1000,300 L0,300 Z"
                                            fill="url(#chartGradient)"
                                        />
                                    </>
                                ) : (
                                    <>
                                        <path
                                            d="M0,220 C100,240 200,180 300,200 C400,220 500,140 600,160 C700,190 800,90 900,110 L1000,100"
                                            fill="none"
                                            stroke="#818cf8"
                                            strokeWidth="4"
                                            strokeLinecap="round" // Dashed line for last year comparison if overlaid, but here just swapping
                                            strokeDasharray="8 4"
                                            className="drop-shadow-lg opacity-60"
                                        />
                                        <path
                                            d="M0,220 C100,240 200,180 300,200 C400,220 500,140 600,160 C700,190 800,90 900,110 L1000,100 L1000,300 L0,300 Z"
                                            fill="url(#chartGradient)"
                                            opacity="0.3"
                                        />
                                    </>
                                )}
                            </svg>

                            {/* X-Axis Labels */}
                            <div className="flex justify-between mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                                    <span key={m}>{m}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Recent Bookings Table */}
                    <div className="bg-white dark:bg-[#151d29] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Recent Bookings</h3>
                            <Link to="/admin/bookings" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group">
                                View All <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">arrow_right_alt</span>
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-xs font-black uppercase tracking-widest text-slate-400">
                                    <tr>
                                        <th className="px-8 py-5">Customer</th>
                                        <th className="px-8 py-5">Destination</th>
                                        <th className="px-8 py-5">Date</th>
                                        <th className="px-8 py-5">Amount</th>
                                        <th className="px-8 py-5 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {bookings.slice(0, 5).map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer" onClick={() => navigate('/admin/bookings')}>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="size-10 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center font-black text-slate-500 dark:text-slate-300 text-xs shadow-sm">
                                                        {row.customer.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white">{row.customer}</p>
                                                        <p className="text-xs font-medium text-slate-500 font-mono mt-0.5">{row.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 font-medium text-slate-600 dark:text-slate-300">
                                                {row.title}
                                            </td>
                                            <td className="px-8 py-5 font-medium text-slate-500">
                                                {new Date(row.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </td>
                                            <td className="px-8 py-5 font-bold text-slate-900 dark:text-white">
                                                ₹{row.amount.toLocaleString()}
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${row.payment === 'Paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                    row.payment === 'Deposit' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                        'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                    }`}>
                                                    {row.payment}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* New Row: 3 Intelligence Widgets grid under Main Area */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
                        {/* Widget: Lead Conversion Funnel */}
                        <div className="bg-white dark:bg-[#151d29] p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col h-full">
                            <div className="flex items-center gap-2 mb-6">
                                <span className="material-symbols-outlined text-indigo-500">filter_alt</span>
                                <h3 className="font-bold text-slate-900 dark:text-white">Lead Funnel</h3>
                            </div>
                            <div className="flex-1 flex flex-col justify-center space-y-4">
                                {leadFunnel.map((stage, i) => (
                                    <div key={i} className="space-y-1">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-slate-700 dark:text-slate-300">{stage.stage}</span>
                                            <span className="text-slate-500">{stage.count}</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex justify-end">
                                            <div
                                                className={`h-full rounded-full bg-gradient-to-r ${stage.color}`}
                                                style={{ width: stage.width }}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {leadFunnel.length === 0 && <p className="text-sm text-center text-slate-500">No active leads</p>}
                            </div>
                        </div>

                        {/* Widget: Top Destinations */}
                        <div className="bg-white dark:bg-[#151d29] p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col h-full">
                            <div className="flex items-center gap-2 mb-6">
                                <span className="material-symbols-outlined text-emerald-500">map</span>
                                <h3 className="font-bold text-slate-900 dark:text-white">Trending Specs</h3>
                            </div>
                            <div className="space-y-3 flex-1">
                                {topDestinations.map((dest, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-black text-slate-400 dark:text-slate-600">#{i + 1}</span>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">{dest.name}</span>
                                        </div>
                                        <span className="text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded-md">
                                            {dest.count} trips
                                        </span>
                                    </div>
                                ))}
                                {topDestinations.length === 0 && <p className="text-sm text-center text-slate-500 mt-4">No destinations recorded</p>}
                            </div>
                        </div>

                        {/* Widget: Lead Sources */}
                        <div className="bg-white dark:bg-[#151d29] p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col h-full">
                            <div className="flex items-center gap-2 mb-6">
                                <span className="material-symbols-outlined text-purple-500">hub</span>
                                <h3 className="font-bold text-slate-900 dark:text-white">Source Perf.</h3>
                            </div>
                            <div className="space-y-4 flex-1">
                                {leadSourcesData.map((src, i) => (
                                    <div key={i} className="flex items-center justify-between border-b last:border-0 border-slate-100 dark:border-slate-800 pb-3 last:pb-0">
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">{src.source}</p>
                                            <p className="text-xs font-medium text-slate-500">{src.total} total leads</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{src.rate}%</p>
                                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">WIN RATE</p>
                                        </div>
                                    </div>
                                ))}
                                {leadSourcesData.length === 0 && <p className="text-sm text-center text-slate-500 mt-4">No sources recorded</p>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Right Sidebar (Widgets) */}
                <div className="flex flex-col gap-8">

                    {/* Sales by User Leaderboard */}
                    <div className="bg-white dark:bg-[#151d29] p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-500">emoji_events</span>
                                Top Performers
                            </h3>
                            <select
                                value={salesTimeFilter}
                                onChange={(e) => setSalesTimeFilter(e.target.value as any)}
                                className="bg-slate-50 dark:bg-slate-900 border-none text-xs font-bold rounded-lg px-3 py-1.5 text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:ring-1 focus:ring-indigo-500 outline-none"
                            >
                                <option value="7">7 Days</option>
                                <option value="14">14 Days</option>
                                <option value="30">30 Days</option>
                            </select>
                        </div>

                        <div className="space-y-4">
                            {salesLeaderboard.length > 0 ? salesLeaderboard.map((user, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800/50">
                                    <div className="flex items-center gap-3">
                                        <div className={`relative size-10 rounded-full bg-gradient-to-br from-${user.color}-400 to-${user.color}-600 flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                                            {user.initials}
                                            {i === 0 && (
                                                <div className="absolute -top-1 -right-1 size-4 bg-yellow-400 rounded-full shadow-sm flex items-center justify-center border-2 border-white dark:border-[#151d29]">
                                                    <span className="material-symbols-outlined text-[10px] text-yellow-900">star</span>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">{user.name}</p>
                                            <p className="text-xs font-medium text-slate-500">{user.count} {user.count === 1 ? 'Sale' : 'Sales'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">₹{user.revenue.toLocaleString()}</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 border-dashed">
                                    <span className="material-symbols-outlined text-slate-400 text-3xl mb-2">monitoring</span>
                                    <p className="text-slate-500 text-sm font-medium">No sales found in this period</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Widget: My Action Items (Follow-ups & Tasks) */}
                    <div className="bg-white dark:bg-[#151d29] p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-rose-500">assignment</span>
                                My Action Queue
                            </h3>
                            <span className="size-6 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 text-xs font-bold flex items-center justify-center">
                                {myActionItems.length}
                            </span>
                        </div>
                        <div className="space-y-3">
                            {myActionItems.length > 0 ? myActionItems.map((item, i) => (
                                <div key={i} onClick={() => navigate(item.link)} className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800/50 group">
                                    <div className={`mt-0.5 size-8 shrink-0 rounded-lg flex items-center justify-center ${item.color} dark:bg-opacity-10 shadow-sm`}>
                                        <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{item.title}</p>
                                        <p className="text-xs font-medium text-slate-500 line-clamp-1 mt-0.5">{item.desc}</p>
                                        <div className="flex items-center gap-2 mt-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <span className="material-symbols-outlined text-[12px] text-slate-400">schedule</span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                {item.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 border-dashed">
                                    <span className="material-symbols-outlined text-emerald-400 text-3xl mb-2">done_all</span>
                                    <p className="text-slate-500 text-sm font-medium">All caught up! No pending actions.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Widget: Upcoming Departures */}
                    <div className="bg-white dark:bg-[#151d29] p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-teal-500">flight_takeoff</span>
                                Upcoming Departures
                            </h3>
                            <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">Next 14d</span>
                        </div>
                        <div className="space-y-4">
                            {upcomingDepartures.length > 0 ? upcomingDepartures.map((dep, i) => (
                                <div key={i} className="flex items-center justify-between border-b last:border-0 border-slate-100 dark:border-slate-800 pb-4 last:pb-0">
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white mb-0.5">{dep.customer}</p>
                                        <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">place</span>
                                            {dep.title.split('-')[0]}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-teal-600 dark:text-teal-400">
                                            {new Date(dep.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </p>
                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                            {Math.ceil((new Date(dep.date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))} Days Left
                                        </p>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 border-dashed">
                                    <p className="text-slate-500 text-sm font-medium">No departures in the next 14 days.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Activity Timeline */}
                    <div className="bg-white dark:bg-[#151d29] p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex-1">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Activity Log</h3>
                        <div className="relative pl-4 space-y-8 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 dark:before:bg-slate-800">
                            {recentActivities.length > 0 ? recentActivities.map((item, i) => (
                                <div key={i} className="relative pl-6">
                                    <div className={`absolute -left-[9px] top-0 bg-white dark:bg-[#151d29] border-4 border-white dark:border-[#151d29] rounded-full z-10`}>
                                        <span className={`material-symbols-outlined text-[20px] ${item.color} bg-slate-50 dark:bg-slate-800 rounded-full p-1`}>{item.icon}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</p>
                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.desc}</p>
                                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">{item.displayTime}</p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-slate-500 italic">No recent activity.</p>
                            )}
                        </div>
                        <button
                            onClick={() => navigate('/admin/analytics')}
                            className="w-full mt-8 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            View Full History
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};