import React, { useMemo, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useLeads } from '../../src/hooks/useLeads';
import {
    CheckCircle2, Clock, IndianRupee, TrendingUp, Users,
    AlertTriangle, Target, X, ChevronDown, Download, ArrowRight,
    Calendar, Activity, BarChart2, Award, Zap, PieChart
} from 'lucide-react';

// ── Types & helpers ──────────────────────────────────────────────────────────

type TimePeriod = 'all' | '7d' | '30d' | '90d';

const PERIOD_LABELS: Record<TimePeriod, string> = {
    all: 'All Time',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
};

function getPeriodStart(period: TimePeriod): Date | null {
    if (period === 'all') return null;
    const d = new Date();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    d.setDate(d.getDate() - days);
    return d;
}

const STATUS_TEXT_COLORS: Record<string, string> = {
    New: 'text-blue-600 dark:text-blue-400',
    Warm: 'text-amber-500 dark:text-amber-400',
    Hot: 'text-orange-500 dark:text-orange-400',
    Cold: 'text-slate-500 dark:text-slate-400',
    'Offer Sent': 'text-purple-600 dark:text-purple-400',
    Converted: 'text-emerald-600 dark:text-emerald-400',
};

// ── Sub-components ───────────────────────────────────────────────────────────

const ProgressBar: React.FC<{ percent: number; color?: string; height?: string }> = ({
    percent, color = 'bg-primary', height = 'h-1.5'
}) => (
    <div className={`${height} bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden`}>
        <div
            className={`h-full rounded-full transition-all duration-700 ${color}`}
            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
    </div>
);

const DonutChart: React.FC<{ data: { label: string; value: number; color: string }[]; total: number }> = ({ data, total }) => {
    let cumulative = 0;
    const radius = 38;
    const cx = 50; const cy = 50;
    const circumference = 2 * Math.PI * radius;
    return (
        <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
            {total === 0
                ? <circle cx={cx} cy={cy} r={radius} fill="none" stroke="currentColor" strokeWidth="12" className="text-slate-100 dark:text-slate-800" />
                : data.map((s, i) => {
                    const pct = s.value / total;
                    const dash = pct * circumference;
                    const offset = circumference - cumulative * circumference;
                    cumulative += pct;
                    if (!pct) return null;
                    return <circle key={i} cx={cx} cy={cy} r={radius} fill="none" stroke={s.color} strokeWidth="12" strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={offset} />;
                })
            }
        </svg>
    );
};

function exportToCSV(rows: any[], filename: string) {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

// ── Drill-down Modal ─────────────────────────────────────────────────────────

const DrillDownModal: React.FC<{ member: any; onClose: () => void }> = ({ member, onClose }) => {
    const donutData = [
        { label: 'Hot', value: member.leadsByStatus['Hot'] || 0, color: '#f97316' },
        { label: 'Warm', value: member.leadsByStatus['Warm'] || 0, color: '#fbbf24' },
        { label: 'New', value: member.leadsByStatus['New'] || 0, color: '#3b82f6' },
        { label: 'Offer Sent', value: member.leadsByStatus['Offer Sent'] || 0, color: '#a855f7' },
        { label: 'Converted', value: member.leadsByStatus['Converted'] || 0, color: '#10b981' },
        { label: 'Cold', value: member.leadsByStatus['Cold'] || 0, color: '#94a3b8' },
    ].filter(d => d.value > 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white dark:bg-[#1A2633] rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-[#1A2633] flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 rounded-t-3xl z-10">
                    <div className="flex items-center gap-4">
                        <div className={`size-14 rounded-2xl flex items-center justify-center font-black text-lg bg-${member.color || 'blue'}-100 text-${member.color || 'blue'}-600 dark:bg-${member.color || 'blue'}-900/30 dark:text-${member.color || 'blue'}-400`}>
                            {member.initials || member.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white">{member.name}</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">{member.role}</p>
                        </div>
                        {member.badge && <span className="ml-2 text-sm bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-full px-3 py-1 font-bold">{member.badge}</span>}
                    </div>
                    <button onClick={onClose} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><X size={16} className="text-slate-500" /></button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Quick stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'Total Leads', value: member.totalLeads, icon: '👥', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
                            { label: 'Converted', value: member.convertedLeads, icon: '✅', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400' },
                            { label: 'Pending Tasks', value: member.pendingTasks, icon: '⏳', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400' },
                            { label: 'Stalled Leads', value: member.stalledLeads, icon: '⚠️', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400' },
                        ].map((s, i) => (
                            <div key={i} className={`${s.bg} rounded-2xl p-4 text-center`}>
                                <p className="text-2xl mb-1">{s.icon}</p>
                                <p className={`text-2xl font-black ${s.text}`}>{s.value}</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{s.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Donut + Breakdown */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5">
                        <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                            <PieChart size={14} className="text-indigo-500" /> Lead Pipeline Breakdown
                        </h3>
                        <div className="flex items-center gap-6">
                            <div className="relative shrink-0">
                                <DonutChart data={donutData} total={member.totalLeads} />
                                <div className="absolute inset-0 flex items-center justify-center rotate-90">
                                    <div className="text-center">
                                        <p className="text-lg font-black text-slate-900 dark:text-white leading-none">{member.totalLeads}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">Leads</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 space-y-2">
                                {donutData.length === 0
                                    ? <p className="text-sm text-slate-400">No leads assigned.</p>
                                    : donutData.map(d => (
                                        <div key={d.label} className="flex items-center gap-2">
                                            <div className="size-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                                            <span className="text-sm text-slate-600 dark:text-slate-300 flex-1">{d.label}</span>
                                            <span className="font-black text-slate-900 dark:text-white text-sm">{d.value}</span>
                                            <span className="text-xs text-slate-400 w-8 text-right">{member.totalLeads > 0 ? ((d.value / member.totalLeads) * 100).toFixed(0) : 0}%</span>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </div>

                    {/* Revenue split */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4">
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Active Pipeline</p>
                            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-300 mt-1">₹{(member.pipelineValue / 1000).toFixed(0)}k</p>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4">
                            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Actual Revenue</p>
                            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-300 mt-1">₹{(member.actualRevenue / 1000).toFixed(0)}k</p>
                        </div>
                    </div>

                    {/* Target progress */}
                    {member.todayTarget && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5">
                            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                                <Target size={14} className="text-primary" /> Today's Targets
                            </h3>
                            <div className="space-y-3">
                                {[
                                    { label: 'Leads', actual: member.todayTarget.actualLeads, target: member.todayTarget.targetLeads },
                                    { label: 'Calls', actual: member.todayTarget.actualCalls, target: member.todayTarget.targetCalls },
                                    { label: 'Conversions', actual: member.todayTarget.actualConversions, target: member.todayTarget.targetConversions },
                                ].map(t => (
                                    <div key={t.label}>
                                        <div className="flex justify-between text-xs font-bold mb-1.5">
                                            <span className="text-slate-500">{t.label}</span>
                                            <span className="text-slate-800 dark:text-white">{t.actual}/{t.target}</span>
                                        </div>
                                        <ProgressBar percent={t.target > 0 ? (t.actual / t.target) * 100 : 0} color={t.actual >= t.target ? 'bg-emerald-500' : 'bg-primary'} height="h-2" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Stalled leads */}
                    {member.stalledLeadsList.length > 0 && (
                        <div className="rounded-2xl border border-red-100 dark:border-red-900/40 overflow-hidden">
                            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-5 py-3">
                                <AlertTriangle size={14} className="text-red-500" />
                                <p className="font-bold text-sm text-red-700 dark:text-red-400">At-Risk Leads (idle {'>'} 7 days)</p>
                            </div>
                            <div className="divide-y divide-slate-50 dark:divide-slate-800">
                                {member.stalledLeadsList.slice(0, 5).map((lead: any) => (
                                    <div key={lead.id} className="flex items-center justify-between px-5 py-3 bg-white dark:bg-[#1A2633]">
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">{lead.name}</p>
                                            <p className="text-xs text-slate-400">{lead.destination}</p>
                                        </div>
                                        <div className="flex items-center gap-2.5 shrink-0">
                                            <span className={`text-xs font-bold ${STATUS_TEXT_COLORS[lead.status] || 'text-slate-500'}`}>{lead.status}</span>
                                            <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold px-2 py-0.5 rounded-full">{lead.idleDays}d idle</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recent follow-ups */}
                    {member.recentTasks.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5">
                            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                                <Activity size={14} className="text-blue-500" /> Recent Follow-ups
                            </h3>
                            <div className="space-y-2.5">
                                {member.recentTasks.slice(0, 4).map((t: any) => (
                                    <div key={t.id} className="flex items-start gap-3">
                                        <div className={`size-2 rounded-full mt-1.5 shrink-0 ${t.status === 'Done' ? 'bg-emerald-500' : t.status === 'Overdue' ? 'bg-red-500' : 'bg-amber-400'}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-slate-700 dark:text-slate-200 truncate">{t.description}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">{t.type} · {new Date(t.scheduledAt).toLocaleDateString('en-IN')}</p>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${t.status === 'Done' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>{t.status}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Main Component ───────────────────────────────────────────────────────────

export const TeamPerformance: React.FC = () => {
    const { staff } = useAuth();
    const { followUps, bookings, dailyTargets } = useData();
    const { leads } = useLeads();

    const [period, setPeriod] = useState<TimePeriod>('30d');
    const [showPeriodMenu, setShowPeriodMenu] = useState(false);
    const [selectedMember, setSelectedMember] = useState<any | null>(null);

    const today = new Date().toISOString().split('T')[0];
    const periodStart = useMemo(() => getPeriodStart(period), [period]);

    const inPeriod = useCallback((dateStr: string) => {
        if (!periodStart) return true;
        return new Date(dateStr) >= periodStart;
    }, [periodStart]);

    const metrics = useMemo(() => {
        return staff.map(member => {
            const allMemberLeads = leads.filter(l => l.assignedTo === member.id);
            const memberLeads = allMemberLeads.filter(l => inPeriod(l.addedOn));
            const totalLeads = memberLeads.length;
            const convertedLeads = memberLeads.filter(l => l.status === 'Converted').length;
            const conversionRate = totalLeads ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0.0';
            const activeLeads = memberLeads.filter(l => l.status !== 'Converted' && l.status !== 'Cold');
            const pipelineValue = activeLeads.reduce((sum, l) => sum + (l.potentialValue || 0), 0);

            const leadsByStatus: Record<string, number> = {};
            allMemberLeads.forEach(l => { leadsByStatus[l.status] = (leadsByStatus[l.status] || 0) + 1; });

            const memberLeadIds = new Set(allMemberLeads.map(l => l.id));
            const memberTasks = followUps.filter(f => f.leadId && memberLeadIds.has(f.leadId));
            const periodTasks = memberTasks.filter(f => inPeriod(f.createdAt));
            const pendingTasks = memberTasks.filter(f => f.status === 'Pending').length;
            const completedTasks = periodTasks.filter(f => f.status === 'Done').length;
            const totalTasksPeriod = periodTasks.length;
            const taskCompletionRate = totalTasksPeriod ? Math.round((completedTasks / totalTasksPeriod) * 100) : 0;

            const nowMs = Date.now();
            const stalledLeadsList = allMemberLeads
                .filter(l => l.status !== 'Converted' && l.status !== 'Cold')
                .map(l => {
                    const lastLog = l.logs?.length ? Math.max(...l.logs.map(lg => new Date(lg.timestamp).getTime())) : new Date(l.addedOn).getTime();
                    return { ...l, idleDays: Math.floor((nowMs - lastLog) / (1000 * 60 * 60 * 24)) };
                })
                .filter(l => l.idleDays >= 7)
                .sort((a, b) => b.idleDays - a.idleDays);

            const stalledLeads = stalledLeadsList.length;
            const actualRevenue = bookings.filter(b => b.assignedTo === member.id && (b.status === 'Confirmed' || b.status === 'Completed') && inPeriod(b.date)).reduce((sum, b) => sum + b.amount, 0);

            const convertedWithDates = memberLeads.filter(l => l.status === 'Converted');
            const avgConversionDays = convertedWithDates.length
                ? Math.round(convertedWithDates.reduce((sum, l) => sum + ((nowMs - new Date(l.addedOn).getTime()) / (1000 * 60 * 60 * 24)), 0) / convertedWithDates.length)
                : null;

            const todayTarget = dailyTargets.find(t => t.staffId === member.id && t.date === today) || null;
            const recentTasks = [...memberTasks].sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()).slice(0, 4);

            let badge: string | null = null;
            if (parseFloat(conversionRate as string) >= 40) badge = '🏆 Top Converter';
            else if (pipelineValue >= 200000) badge = '💰 Pipeline King';
            else if (taskCompletionRate === 100 && totalTasksPeriod > 0) badge = '✅ Task Champion';
            else if (stalledLeads === 0 && totalLeads > 3) badge = '⚡ Zero Stalls';

            return { ...member, totalLeads, convertedLeads, conversionRate, pipelineValue, pendingTasks, completedTasks, totalTasksPeriod, taskCompletionRate, leadsByStatus, stalledLeads, stalledLeadsList, actualRevenue, avgConversionDays, todayTarget, recentTasks, badge };
        });
    }, [staff, leads, followUps, bookings, dailyTargets, inPeriod, today]);

    const overallPipeline = metrics.reduce((sum, m) => sum + m.pipelineValue, 0);
    const overallPendingTasks = metrics.reduce((sum, m) => sum + m.pendingTasks, 0);
    const overallConverted = metrics.reduce((sum, m) => sum + m.convertedLeads, 0);
    const overallRevenue = metrics.reduce((sum, m) => sum + m.actualRevenue, 0);
    const totalStalledAlerts = metrics.reduce((sum, m) => sum + m.stalledLeads, 0);

    const handleExport = () => {
        exportToCSV(metrics.map(m => ({
            Name: m.name, Role: m.role, 'Total Leads': m.totalLeads, Converted: m.convertedLeads,
            'Conversion Rate (%)': m.conversionRate, 'Pipeline Value (₹)': m.pipelineValue,
            'Actual Revenue (₹)': m.actualRevenue, 'Pending Tasks': m.pendingTasks,
            'Task Completion (%)': m.taskCompletionRate, 'Stalled Leads': m.stalledLeads,
            'Avg Conversion Days': m.avgConversionDays ?? 'N/A',
        })), `team-performance-${period}-${today}.csv`);
    };

    const maxRevenue = Math.max(...metrics.map(m => m.actualRevenue), 1);
    const maxConvDays = Math.max(...metrics.filter(m => m.avgConversionDays !== null).map(m => m.avgConversionDays as number), 1);

    return (
        <div className="flex h-full admin-page-bg overflow-y-auto">
            <div className="flex-1 flex flex-col min-w-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-10 py-8 gap-6">

                {/* ── Header ── */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                            <span className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                <TrendingUp size={22} />
                            </span>
                            Team Performance
                        </h1>
                        <p className="text-slate-400 mt-2 text-sm ml-[52px]">Monitor staff activity, task completion and pipeline metrics.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <button
                                onClick={() => setShowPeriodMenu(p => !p)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
                            >
                                <Calendar size={14} className="text-primary" />
                                {PERIOD_LABELS[period]}
                                <ChevronDown size={14} className={`text-slate-400 transition-transform ${showPeriodMenu ? 'rotate-180' : ''}`} />
                            </button>
                            {showPeriodMenu && (
                                <div className="absolute right-0 top-full mt-2 bg-white dark:bg-[#1A2633] border border-slate-100 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-20 min-w-[160px]">
                                    {(Object.keys(PERIOD_LABELS) as TimePeriod[]).map(p => (
                                        <button key={p} onClick={() => { setPeriod(p); setShowPeriodMenu(false); }}
                                            className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${period === p ? 'bg-primary/10 text-primary font-bold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                            {PERIOD_LABELS[p]}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-sm">
                            <Download size={14} /> Export CSV
                        </button>
                    </div>
                </div>

                {/* ── KPI Cards ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {[
                        { emoji: '👥', label: 'Active Staff', value: staff.filter(s => s.status === 'Active').length, sub: `${staff.length} members`, gradient: 'from-blue-500 to-blue-600' },
                        { emoji: '✅', label: 'Conversions', value: overallConverted, sub: PERIOD_LABELS[period], gradient: 'from-emerald-500 to-emerald-600' },
                        { emoji: '⏳', label: 'Pending Tasks', value: overallPendingTasks, sub: 'open across team', gradient: 'from-amber-500 to-orange-500' },
                        { emoji: '🚨', label: 'Stalled Leads', value: totalStalledAlerts, sub: 'idle > 7 days', gradient: totalStalledAlerts > 0 ? 'from-red-500 to-rose-600' : 'from-slate-400 to-slate-500' },
                        { emoji: '💰', label: 'Revenue', value: `₹${(overallRevenue / 1000).toFixed(0)}k`, sub: `Pipeline ₹${(overallPipeline / 1000).toFixed(0)}k`, gradient: 'from-indigo-500 to-violet-600' },
                    ].map((card, i) => (
                        <div key={i} className="bg-white dark:bg-[#1A2633] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                            <div className={`h-1 bg-gradient-to-r ${card.gradient}`} />
                            <div className="p-4 flex items-center gap-3">
                                <div className={`size-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-xl shrink-0 shadow-sm`}>
                                    {card.emoji}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{card.label}</p>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{card.value}</p>
                                    <p className="text-[10px] text-slate-400 truncate">{card.sub}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Staff Cards Grid ── */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                            <BarChart2 size={18} className="text-indigo-500" /> Staff Performance Matrix
                        </h2>
                        <span className="text-xs text-slate-400 font-medium flex items-center gap-1">Click a card to view details <ArrowRight size={12} /></span>
                    </div>

                    {metrics.length === 0 ? (
                        <div className="bg-white dark:bg-[#1A2633] rounded-2xl border border-slate-100 dark:border-slate-800 p-12 text-center">
                            <p className="text-sm font-bold text-slate-400">No staff members found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {metrics.map((member) => {
                                const convRate = parseFloat(member.conversionRate as string);
                                const isGoodConverter = convRate >= 15;
                                return (
                                    <div
                                        key={member.id}
                                        onClick={() => setSelectedMember(member)}
                                        className="bg-white dark:bg-[#1A2633] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-lg hover:border-primary/30 dark:hover:border-primary/30 transition-all cursor-pointer group p-5"
                                    >
                                        {/* Card Header */}
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`size-12 rounded-2xl flex items-center justify-center font-black text-base bg-${member.color || 'blue'}-100 text-${member.color || 'blue'}-600 dark:bg-${member.color || 'blue'}-900/30 dark:text-${member.color || 'blue'}-400 shrink-0`}>
                                                    {member.initials || member.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 dark:text-white text-base">{member.name}</p>
                                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{member.role}</p>
                                                </div>
                                            </div>
                                            <ArrowRight size={14} className="text-slate-300 dark:text-slate-600 group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-1" />
                                        </div>

                                        {/* Badge */}
                                        {member.badge && (
                                            <div className="mb-3">
                                                <span className="text-[11px] bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-full px-3 py-1 font-bold">{member.badge}</span>
                                            </div>
                                        )}

                                        {/* Metric Row */}
                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                            <div className="text-center bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5">
                                                <p className="text-xl font-black text-slate-900 dark:text-white">{member.totalLeads}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Leads</p>
                                            </div>
                                            <div className="text-center bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5">
                                                <p className={`text-xl font-black ${isGoodConverter ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>{member.conversionRate}%</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Converted</p>
                                            </div>
                                            <div className="text-center bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5">
                                                <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">₹{(member.pipelineValue / 1000).toFixed(0)}k</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Pipeline</p>
                                            </div>
                                        </div>

                                        {/* Task Completion */}
                                        <div className="mb-3">
                                            <div className="flex justify-between text-xs font-bold mb-1.5">
                                                <span className="text-slate-500">Task Completion</span>
                                                <span className={member.taskCompletionRate === 100 ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300'}>{member.taskCompletionRate}%</span>
                                            </div>
                                            <ProgressBar percent={member.taskCompletionRate} color={member.taskCompletionRate === 100 ? 'bg-emerald-500' : 'bg-primary'} height="h-2" />
                                        </div>

                                        {/* Footer indicators */}
                                        <div className="flex items-center gap-2 flex-wrap pt-1">
                                            {member.pendingTasks > 0 && (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                                                    <Clock size={9} /> {member.pendingTasks} pending
                                                </span>
                                            )}
                                            {member.stalledLeads > 0 ? (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                                                    <AlertTriangle size={9} /> {member.stalledLeads} stalled
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                                                    <CheckCircle2 size={9} /> Clean pipeline
                                                </span>
                                            )}
                                            {member.avgConversionDays !== null && (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-full">
                                                    <Zap size={9} /> {member.avgConversionDays}d avg
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Stalled Lead Alerts ── */}
                {totalStalledAlerts > 0 && (
                    <div className="rounded-2xl border border-red-100 dark:border-red-900/30 overflow-hidden">
                        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/10 px-6 py-4 border-b border-red-100 dark:border-red-900/20">
                            <AlertTriangle size={16} className="text-red-500" />
                            <h2 className="font-bold text-base text-red-700 dark:text-red-400">Stalled Lead Alerts</h2>
                            <span className="ml-auto text-sm font-bold text-red-500 bg-red-100 dark:bg-red-900/30 px-2.5 py-0.5 rounded-full">{totalStalledAlerts} leads idle {'>'} 7 days</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 divide-x divide-y divide-slate-50 dark:divide-slate-800">
                            {metrics.filter(m => m.stalledLeads > 0).map(m => (
                                <div key={m.id} className="bg-white dark:bg-[#1A2633] p-5 cursor-pointer hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors" onClick={() => setSelectedMember(m)}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`size-8 rounded-xl flex items-center justify-center text-xs font-black bg-${m.color || 'blue'}-100 text-${m.color || 'blue'}-600`}>{m.initials}</div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white text-sm">{m.name}</p>
                                            <p className="text-[10px] text-red-500 font-bold">{m.stalledLeads} stalled lead{m.stalledLeads > 1 ? 's' : ''}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        {m.stalledLeadsList.slice(0, 2).map((l: any) => (
                                            <div key={l.id} className="flex items-center justify-between text-xs">
                                                <span className="text-slate-600 dark:text-slate-300 truncate max-w-[130px]">{l.name}</span>
                                                <span className="text-red-500 font-bold shrink-0 ml-2">{l.idleDays}d idle</span>
                                            </div>
                                        ))}
                                        {m.stalledLeads > 2 && <p className="text-[10px] text-slate-400">+{m.stalledLeads - 2} more…</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Bottom Row: Velocity + Awards ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Velocity */}
                    <div className="bg-white dark:bg-[#1A2633] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
                        <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2 mb-5">
                            <span className="size-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 flex items-center justify-center">
                                <Zap size={14} />
                            </span>
                            Conversion Speed
                        </h2>
                        <div className="space-y-4">
                            {metrics.filter(m => m.avgConversionDays !== null).length === 0 ? (
                                <p className="text-sm text-slate-400 py-4 text-center">No conversion data for this period.</p>
                            ) : (
                                [...metrics]
                                    .filter(m => m.avgConversionDays !== null)
                                    .sort((a, b) => (a.avgConversionDays as number) - (b.avgConversionDays as number))
                                    .map(m => (
                                        <div key={m.id} className="flex items-center gap-3">
                                            <div className={`size-8 rounded-xl flex items-center justify-center text-xs font-black bg-${m.color || 'blue'}-100 text-${m.color || 'blue'}-600 shrink-0`}>{m.initials}</div>
                                            <div className="flex-1">
                                                <div className="flex justify-between text-xs font-bold mb-1.5">
                                                    <span className="text-slate-700 dark:text-slate-200">{m.name}</span>
                                                    <span className="text-indigo-600 dark:text-indigo-400">{m.avgConversionDays}d avg</span>
                                                </div>
                                                <ProgressBar
                                                    percent={100 - ((m.avgConversionDays as number) / maxConvDays * 100)}
                                                    color="bg-gradient-to-r from-indigo-500 to-violet-500"
                                                    height="h-2"
                                                />
                                            </div>
                                        </div>
                                    ))
                            )}
                        </div>
                    </div>

                    {/* Awards + Revenue Leaderboard */}
                    <div className="bg-white dark:bg-[#1A2633] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
                        <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2 mb-5">
                            <span className="size-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-500 flex items-center justify-center">
                                <Award size={14} />
                            </span>
                            Revenue Leaderboard
                        </h2>
                        <div className="space-y-3">
                            {[...metrics].sort((a, b) => b.actualRevenue - a.actualRevenue).map((m, i) => (
                                <div key={m.id} className="flex items-center gap-3" onClick={() => setSelectedMember(m)} style={{ cursor: 'pointer' }}>
                                    <span className={`text-sm font-black w-5 shrink-0 ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-slate-300 dark:text-slate-600'}`}>#{i + 1}</span>
                                    <div className={`size-8 rounded-xl flex items-center justify-center text-xs font-black bg-${m.color || 'blue'}-100 text-${m.color || 'blue'}-600 shrink-0`}>{m.initials}</div>
                                    <div className="flex-1">
                                        <div className="flex justify-between text-xs font-bold mb-1.5">
                                            <span className="text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                                {m.name}
                                                {m.badge && <span className="text-[9px] text-amber-600">{m.badge.split(' ')[0]}</span>}
                                            </span>
                                            <span className="text-emerald-600 dark:text-emerald-400">₹{(m.actualRevenue / 1000).toFixed(0)}k</span>
                                        </div>
                                        <ProgressBar percent={(m.actualRevenue / maxRevenue) * 100} color={i === 0 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-emerald-500'} height="h-2" />
                                    </div>
                                </div>
                            ))}
                            {metrics.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">No revenue data yet.</p>}
                        </div>
                        {/* Badges */}
                        {metrics.some(m => m.badge) && (
                            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Awards</p>
                                <div className="flex flex-wrap gap-2">
                                    {metrics.filter(m => m.badge).map(m => (
                                        <div key={m.id} className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                                            {m.badge?.split(' ')[0]} {m.name.split(' ')[0]}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom padding */}
                <div className="h-4" />
            </div>

            {selectedMember && <DrillDownModal member={selectedMember} onClose={() => setSelectedMember(null)} />}
        </div>
    );
};
