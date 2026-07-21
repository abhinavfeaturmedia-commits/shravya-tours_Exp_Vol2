import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { DailySlot, Booking, BookingStatus } from '../../types';

// ─── Helpers ───────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');

const getDateStr = (year: number, month: number, day: number) =>
    `${year}-${pad(month + 1)}-${pad(day)}`;

const getPax = (b: Booking): number => {
    if (b.paxCount && b.paxCount > 0) return b.paxCount;
    const adults = b.paxAdult || 0;
    const children = b.paxChild || 0;
    if (adults + children > 0) return adults + children;
    if (b.guests) {
        let total = 0;
        b.guests.split(',').forEach(p => { const n = parseInt(p.trim()); if (!isNaN(n)) total += n; });
        if (total > 0) return total;
    }
    return 1;
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
    Confirmed:  { color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/40',  dot: 'bg-emerald-500' },
    Pending:    { color: 'text-amber-700 dark:text-amber-300',    bg: 'bg-amber-50 dark:bg-amber-950/40',     dot: 'bg-amber-500' },
    Completed:  { color: 'text-blue-700 dark:text-blue-300',      bg: 'bg-blue-50 dark:bg-blue-950/40',       dot: 'bg-blue-500' },
    Cancelled:  { color: 'text-red-700 dark:text-red-300',        bg: 'bg-red-50 dark:bg-red-950/40',         dot: 'bg-red-500' },
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// ─── Component ─────────────────────────────────────────────────────────────

export const Inventory: React.FC = () => {
    const navigate = useNavigate();
    const { inventory, updateInventory, packages, bookings, updateBooking, updateBookingStatus } = useData();
    const { staff } = useAuth();

    const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

    // ── State ────────────────────────────────────────────────────────────────
    const [viewDate, setViewDate]       = useState(new Date());
    const [activeDay, setActiveDay]     = useState<string | null>(null);    // YYYY-MM-DD
    const [filterStatus, setFilterStatus] = useState<'All' | BookingStatus>('All');
    const [isSaving, setIsSaving]       = useState(false);

    const year  = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Mon-aligned offset (0 = Monday)
    const firstDow = new Date(year, month, 1).getDay();
    const offset = firstDow === 0 ? 6 : firstDow - 1;

    // ── Derived data ────────────────────────────────────────────────────────

    // Map date → bookings (handles multi-day range)
    const bookingsByDate = useMemo(() => {
        const map: Record<string, Booking[]> = {};
        bookings.forEach(b => {
            if (b.status === 'Cancelled') return;
            if (!b.date) return;
            const start = b.date.slice(0, 10);
            let end = b.endDate ? b.endDate.slice(0, 10) : start;
            if (!b.endDate && b.durationDays && b.durationDays > 1) {
                const d = new Date(start);
                d.setDate(d.getDate() + b.durationDays - 1);
                end = d.toISOString().slice(0, 10);
            }
            for (let i = 1; i <= daysInMonth; i++) {
                const ds = getDateStr(year, month, i);
                if (ds >= start && ds <= end) {
                    (map[ds] = map[ds] || []).push(b);
                }
            }
        });
        return map;
    }, [bookings, year, month, daysInMonth]);

    // Monthly KPIs
    const kpis = useMemo(() => {
        const seen = new Set<string>();
        let trips = 0, pax = 0, rev = 0, unassigned = 0, unpaid = 0, blocked = 0;
        for (let i = 1; i <= daysInMonth; i++) {
            const ds = getDateStr(year, month, i);
            if (inventory[`${ds}_all`]?.isBlocked) blocked++;
            (bookingsByDate[ds] || []).forEach(b => {
                if (!seen.has(b.id)) {
                    seen.add(b.id);
                    trips++; pax += getPax(b); rev += b.amount || 0;
                    if (!b.assignedTo) unassigned++;
                    if (b.payment !== 'Paid') unpaid++;
                }
            });
        }
        return { trips, pax, rev, unassigned, unpaid, blocked };
    }, [bookingsByDate, inventory, year, month, daysInMonth]);

    // Active day bookings
    const activeDayBookings = useMemo(() => {
        if (!activeDay) return [];
        const all = bookingsByDate[activeDay] || [];
        if (filterStatus === 'All') return all;
        return all.filter(b => b.status === filterStatus);
    }, [activeDay, bookingsByDate, filterStatus]);

    const isBlocked = (ds: string) =>
        !!(inventory[`${ds}_all`]?.isBlocked || inventory[`${ds}_Tour`]?.isBlocked);

    const isPast = (ds: string) => new Date(ds) < today;

    // ── Handlers ────────────────────────────────────────────────────────────

    const handleToggleBlock = useCallback(async (ds: string, block: boolean) => {
        if (isPast(ds)) return;
        const trips = bookingsByDate[ds] || [];
        if (block && trips.length > 0 &&
            !window.confirm(`${trips.length} active trip(s) on this date. Block new bookings anyway?`)) return;

        setIsSaving(true);
        try {
            await updateInventory(ds, { date: ds, assetId: 'all', assetType: 'Tour', capacity: 0, booked: 0, price: 0, isBlocked: block });
        } finally { setIsSaving(false); }
    }, [bookingsByDate, updateInventory]);

    const changeMonth = (delta: number) => {
        setActiveDay(null);
        setViewDate(v => new Date(v.getFullYear(), v.getMonth() + delta, 1));
    };

    // ── Export ───────────────────────────────────────────────────────────────
    const handleExport = () => {
        const rows = Array.from({ length: daysInMonth }, (_, i) => {
            const ds = getDateStr(year, month, i + 1);
            const trips = bookingsByDate[ds] || [];
            const p = trips.reduce((s, b) => s + getPax(b), 0);
            const r = trips.reduce((s, b) => s + (b.amount || 0), 0);
            return `${ds},${trips.length},${p},${r},${isBlocked(ds) ? 'Blocked' : 'Open'}`;
        });
        const csv = 'Date,Trips,Pax,Revenue,Status\n' + rows.join('\n');
        const a = document.createElement('a');
        a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        a.download = `inventory_${MONTH_NAMES[month]}_${year}.csv`;
        a.click();
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="flex h-full overflow-hidden bg-slate-50 dark:bg-[#0E1520]">

            {/* ═══════════════════════════════════════════════════════════
                LEFT: MAIN PANEL — Header + KPIs + Calendar Heat-Map
            ═══════════════════════════════════════════════════════════ */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

                {/* ── Page Header ─────────────────────────────────────── */}
                <div className="shrink-0 px-5 py-4 bg-white dark:bg-[#141E2B] border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            <span className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                <span className="material-symbols-outlined text-[20px]">event_available</span>
                            </span>
                            Inventory & Availability
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 ml-10">
                            {MONTH_FULL[month]} {year} · Click any date to see trips & manage day
                        </p>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { setViewDate(new Date()); setActiveDay(today.toISOString().slice(0,10)); }}
                            className="px-3 py-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors"
                        >
                            Today
                        </button>
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5">
                            <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors">
                                <span className="material-symbols-outlined text-[18px] text-slate-600 dark:text-slate-300">chevron_left</span>
                            </button>
                            <select
                                value={month}
                                onChange={e => { setActiveDay(null); setViewDate(new Date(year, +e.target.value, 1)); }}
                                className="bg-transparent text-sm font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer px-1"
                            >
                                {MONTH_FULL.map((m, i) => <option key={m} value={i}>{m}</option>)}
                            </select>
                            <select
                                value={year}
                                onChange={e => { setActiveDay(null); setViewDate(new Date(+e.target.value, month, 1)); }}
                                className="bg-transparent text-sm font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer px-1 border-l border-slate-200 dark:border-slate-700"
                            >
                                {[-2,-1,0,1,2].map(d => year + d).map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <button onClick={() => changeMonth(1)} className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors">
                                <span className="material-symbols-outlined text-[18px] text-slate-600 dark:text-slate-300">chevron_right</span>
                            </button>
                        </div>
                        <button
                            onClick={handleExport}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
                        >
                            <span className="material-symbols-outlined text-[16px]">download</span> Export
                        </button>
                    </div>
                </div>

                {/* ── KPI Strip ────────────────────────────────────────── */}
                <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 px-5 py-4 bg-white dark:bg-[#141E2B] border-b border-slate-200 dark:border-slate-800">
                    {[
                        { icon: 'directions_bus', label: 'Trips', value: kpis.trips, sub: 'This month', color: 'text-primary', bg: 'bg-primary/10' },
                        { icon: 'groups',         label: 'Passengers', value: kpis.pax + ' Pax', sub: 'Across all trips', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10' },
                        { icon: 'payments',       label: 'Revenue',    value: '₹' + kpis.rev.toLocaleString(), sub: 'Total bookings value', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
                        { icon: 'person_off',     label: 'No Driver',  value: kpis.unassigned, sub: 'Bookings unassigned', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', alert: kpis.unassigned > 0 },
                        { icon: 'credit_card_off',label: 'Unpaid',     value: kpis.unpaid, sub: 'Pending payment', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10', alert: kpis.unpaid > 0 },
                    ].map(k => (
                        <div key={k.label} className={`flex items-center gap-3 p-3 rounded-2xl border ${k.alert ? 'border-current/30 animate-pulse' : 'border-slate-100 dark:border-slate-800'} bg-slate-50 dark:bg-slate-900/50`}>
                            <div className={`size-10 rounded-xl ${k.bg} ${k.color} flex items-center justify-center shrink-0`}>
                                <span className="material-symbols-outlined text-[20px]">{k.icon}</span>
                            </div>
                            <div className="min-w-0">
                                <div className={`text-lg font-extrabold ${k.color} leading-none`}>{k.value}</div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{k.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Heat-Map Calendar ────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto p-5">
                    <div className="bg-white dark:bg-[#141E2B] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">

                        {/* Day-of-week header */}
                        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                            {DAY_LABELS.map(d => (
                                <div key={d} className={`py-2.5 text-center text-[11px] font-bold tracking-widest uppercase ${d === 'Sat' || d === 'Sun' ? 'text-rose-400' : 'text-slate-400 dark:text-slate-500'}`}>{d}</div>
                            ))}
                        </div>

                        {/* Days */}
                        <div className="grid grid-cols-7">
                            {/* Offset blanks */}
                            {Array.from({ length: offset }, (_, i) => (
                                <div key={`blank-${i}`} className="border-b border-r border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20 h-24 md:h-28" />
                            ))}

                            {Array.from({ length: daysInMonth }, (_, i) => {
                                const day = i + 1;
                                const ds = getDateStr(year, month, day);
                                const trips = bookingsByDate[ds] || [];
                                const totalPax = trips.reduce((s, b) => s + getPax(b), 0);
                                const totalRev = trips.reduce((s, b) => s + (b.amount || 0), 0);
                                const blocked = isBlocked(ds);
                                const past = isPast(ds);
                                const isToday = ds === today.toISOString().slice(0,10);
                                const isActive = activeDay === ds;
                                const hasDanger = trips.some(b => !b.assignedTo) || trips.some(b => b.payment !== 'Paid');
                                const count = trips.length;

                                // Heat-map intensity
                                const heat = count === 0 ? '' : count <= 1 ? 'bg-primary/5' : count <= 3 ? 'bg-primary/10' : count <= 5 ? 'bg-primary/20' : 'bg-primary/30';

                                const dow = new Date(year, month, day).getDay();
                                const isWeekend = dow === 0 || dow === 6;

                                return (
                                    <div
                                        key={day}
                                        onClick={() => setActiveDay(isActive ? null : ds)}
                                        className={[
                                            'relative group border-b border-r border-slate-100 dark:border-slate-800 h-24 md:h-28 p-2 flex flex-col gap-1 cursor-pointer transition-all duration-150 select-none',
                                            isActive ? 'ring-2 ring-inset ring-primary z-10' : '',
                                            blocked ? 'bg-rose-50/60 dark:bg-rose-950/10' : heat || (past ? 'bg-slate-50/50 dark:bg-slate-900/20 opacity-60' : isWeekend ? 'bg-slate-50/60 dark:bg-slate-800/20' : 'bg-white dark:bg-transparent'),
                                            !blocked && !past ? 'hover:bg-primary/5 dark:hover:bg-primary/10' : '',
                                        ].join(' ')}
                                    >
                                        {/* Date Number */}
                                        <div className="flex items-center justify-between">
                                            <span className={[
                                                'text-xs md:text-sm font-extrabold size-6 md:size-7 rounded-full flex items-center justify-center transition-all',
                                                isToday ? 'bg-primary text-white shadow ring-2 ring-primary/30' : 'text-slate-700 dark:text-slate-200',
                                                isActive && !isToday ? 'ring-2 ring-primary text-primary bg-primary/10' : '',
                                            ].join(' ')}>{day}</span>

                                            {/* Indicator badges */}
                                            {blocked ? (
                                                <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40 px-1.5 py-0.5 rounded-full">BLOCKED</span>
                                            ) : hasDanger && count > 0 ? (
                                                <span className="size-2 rounded-full bg-amber-400 ring-2 ring-amber-400/30 animate-pulse" title="Action needed" />
                                            ) : count > 0 ? (
                                                <span className="size-2 rounded-full bg-primary" title="Trips scheduled" />
                                            ) : null}
                                        </div>

                                        {/* Trip data or empty */}
                                        {blocked ? (
                                            <div className="flex-1 flex items-center justify-center">
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-100 dark:bg-rose-900/30 px-2 py-1 rounded-lg">
                                                    <span className="material-symbols-outlined text-[12px]">block</span> Stop Sell
                                                </div>
                                            </div>
                                        ) : count > 0 ? (
                                            <div className="flex flex-col gap-0.5 mt-auto">
                                                {/* Compact trip summary pill */}
                                                <div className={`px-2 py-1 rounded-xl text-[10px] font-bold flex items-center justify-between ${isActive ? 'bg-primary text-white' : 'bg-primary/10 text-primary dark:bg-primary/20'}`}>
                                                    <span className="flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[12px]">confirmation_number</span>
                                                        {count} {count === 1 ? 'trip' : 'trips'}
                                                    </span>
                                                    <span className="font-extrabold opacity-80">{totalPax}p</span>
                                                </div>
                                                {/* Revenue line — shown on larger cells */}
                                                <div className="hidden md:flex items-center justify-between text-[9px] font-semibold text-slate-400 px-1">
                                                    <span>₹{(totalRev / 1000).toFixed(0)}k</span>
                                                    {hasDanger && <span className="text-amber-500">⚠ action</span>}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex items-end justify-center pb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-[9px] text-slate-400 font-medium">tap to manage</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {[
                            { dot: 'bg-primary', label: 'Trips Scheduled' },
                            { dot: 'bg-amber-400 animate-pulse', label: 'Action Needed (Driver / Payment)' },
                            { dot: 'bg-rose-500', label: 'Stop Sell / Blocked' },
                            { dot: 'bg-primary/30', label: 'High-demand date' },
                        ].map(l => (
                            <div key={l.label} className="flex items-center gap-1.5">
                                <div className={`size-2.5 rounded-full ${l.dot}`} />
                                {l.label}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                RIGHT: DAY DETAIL PANEL
            ═══════════════════════════════════════════════════════════ */}
            <aside className={[
                'flex flex-col bg-white dark:bg-[#141E2B] border-l border-slate-200 dark:border-slate-800 transition-all duration-300 overflow-hidden shrink-0',
                activeDay ? 'w-full sm:w-[420px] xl:w-[460px]' : 'w-0 xl:w-[320px]',
            ].join(' ')}>

                {activeDay ? (
                    <DayPanel
                        dateStr={activeDay}
                        bookings={activeDayBookings}
                        allBookingsForDay={bookingsByDate[activeDay] || []}
                        blocked={isBlocked(activeDay)}
                        past={isPast(activeDay)}
                        isSaving={isSaving}
                        filterStatus={filterStatus}
                        packages={packages}
                        staff={staff}
                        onToggleBlock={handleToggleBlock}
                        onStatusChange={updateBookingStatus}
                        onDriverChange={(bookingId, staffId) => updateBooking(bookingId, { assignedTo: staffId ? parseInt(staffId, 10) : undefined })}
                        onFilterChange={setFilterStatus}
                        onClose={() => setActiveDay(null)}
                        onNavigate={navigate}
                        getPax={getPax}
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
                        <div className="size-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[36px]">touch_app</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400">Select a Date</h3>
                            <p className="text-xs text-slate-400 dark:text-slate-600 mt-1 leading-relaxed">
                                Click any date in the calendar to view its trips, manage bookings, assign drivers, and control availability.
                            </p>
                        </div>
                        <div className="w-full space-y-2 mt-2">
                            <QuickStat label="Total Active Trips This Month" value={String(kpis.trips)} icon="confirmation_number" />
                            <QuickStat label="Blocked / Stop-Sell Dates" value={String(kpis.blocked)} icon="block" />
                        </div>
                    </div>
                )}
            </aside>
        </div>
    );
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function QuickStat({ label, value, icon }: { label: string; value: string; icon: string }) {
    return (
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <span className="material-symbols-outlined text-[18px]">{icon}</span>
                <span className="text-xs font-medium">{label}</span>
            </div>
            <span className="text-sm font-black text-slate-900 dark:text-white">{value}</span>
        </div>
    );
}

interface DayPanelProps {
    dateStr: string;
    bookings: Booking[];
    allBookingsForDay: Booking[];
    blocked: boolean;
    past: boolean;
    isSaving: boolean;
    filterStatus: 'All' | BookingStatus;
    packages: any[];
    staff: any[];
    onToggleBlock: (ds: string, block: boolean) => void;
    onStatusChange: (id: string, status: BookingStatus) => void;
    onDriverChange: (bookingId: string, staffId: string) => void;
    onFilterChange: (s: 'All' | BookingStatus) => void;
    onClose: () => void;
    onNavigate: (path: string, opts?: any) => void;
    getPax: (b: Booking) => number;
}

function DayPanel({
    dateStr, bookings, allBookingsForDay, blocked, past, isSaving, filterStatus,
    packages, staff, onToggleBlock, onStatusChange, onDriverChange, onFilterChange,
    onClose, onNavigate, getPax,
}: DayPanelProps) {
    const date = new Date(dateStr + 'T00:00:00');
    const dayLabel = date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const isToday = dateStr === new Date().toISOString().slice(0, 10);

    const totalPax = allBookingsForDay.reduce((s, b) => s + getPax(b), 0);
    const totalRev = allBookingsForDay.reduce((s, b) => s + (b.amount || 0), 0);

    return (
        <div className="flex flex-col h-full overflow-hidden">

            {/* Panel Header */}
            <div className="shrink-0 px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-base font-black text-slate-900 dark:text-white">{dayLabel}</h2>
                        {isToday && <span className="text-[10px] font-extrabold bg-primary text-white px-2 py-0.5 rounded-full">TODAY</span>}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {allBookingsForDay.length} booking(s) · {totalPax} pax · ₹{totalRev.toLocaleString()}
                    </p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
                    <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">

                {/* ── Day Controls Section ─────────────────────────── */}
                <div className="px-5 pt-4 pb-3 space-y-3 border-b border-slate-100 dark:border-slate-800">

                    {/* 3-Metric Row */}
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { label: 'Trips', val: allBookingsForDay.length, icon: 'confirmation_number', color: 'text-primary' },
                            { label: 'Guests', val: totalPax, icon: 'groups', color: 'text-violet-600 dark:text-violet-400' },
                            { label: 'Revenue', val: '₹' + (totalRev/1000).toFixed(1)+'k', icon: 'payments', color: 'text-emerald-600 dark:text-emerald-400' },
                        ].map(m => (
                            <div key={m.label} className="text-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                                <div className={`text-base font-extrabold ${m.color}`}>{m.val}</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{m.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Stop Sell Toggle Row */}
                    <div className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${blocked ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50' : 'bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800'}`}>
                        <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-lg ${blocked ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                <span className="material-symbols-outlined text-[18px]">block</span>
                            </div>
                            <div>
                                <div className={`text-xs font-bold ${blocked ? 'text-rose-700 dark:text-rose-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {blocked ? 'Stop Sell Active' : 'Date is Open'}
                                </div>
                                <div className="text-[10px] text-slate-400">{past ? 'Past date — read only' : 'Toggle to block new bookings'}</div>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={blocked}
                                disabled={isSaving || past}
                                onChange={e => onToggleBlock(dateStr, e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500" />
                        </label>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => onNavigate('/admin/bookings', { state: { date: dateStr } })}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm"
                        >
                            <span className="material-symbols-outlined text-[15px]">add</span> New Booking
                        </button>
                        <button
                            onClick={() => onNavigate('/admin/operations', { state: { date: dateStr } })}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                        >
                            <span className="material-symbols-outlined text-[15px]">alt_route</span> Live Ops
                        </button>
                    </div>
                </div>

                {/* ── Bookings List ─────────────────────────────────── */}
                <div className="px-5 pt-4 pb-6 space-y-3">
                    {/* Filter tabs */}
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            Bookings
                        </h3>
                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 gap-0.5">
                            {(['All', 'Confirmed', 'Pending', 'Completed'] as const).map(s => (
                                <button
                                    key={s}
                                    onClick={() => onFilterChange(s as any)}
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors ${filterStatus === s ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {bookings.length === 0 ? (
                        <div className="py-10 text-center space-y-3">
                            <div className="size-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600">
                                <span className="material-symbols-outlined text-[28px]">event_busy</span>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No bookings</p>
                                <p className="text-xs text-slate-400 dark:text-slate-600 mt-0.5">
                                    {filterStatus !== 'All' ? `No ${filterStatus} bookings` : 'No trips scheduled for this date'}
                                </p>
                            </div>
                            <button
                                onClick={() => onNavigate('/admin/bookings')}
                                className="text-xs font-bold text-primary hover:underline"
                            >
                                + Create a new booking
                            </button>
                        </div>
                    ) : (
                        bookings.map(b => <BookingCard key={b.id} booking={b} packages={packages} staff={staff} onStatusChange={onStatusChange} onDriverChange={onDriverChange} onNavigate={onNavigate} getPax={getPax} />)
                    )}
                </div>
            </div>
        </div>
    );
}

interface BookingCardProps {
    booking: Booking;
    packages: any[];
    staff: any[];
    onStatusChange: (id: string, status: BookingStatus) => void;
    onDriverChange: (bookingId: string, staffId: string) => void;
    onNavigate: (path: string, opts?: any) => void;
    getPax: (b: Booking) => number;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking: b, packages, staff, onStatusChange, onDriverChange, onNavigate, getPax }) => {
    const pax = getPax(b);
    const pkg = packages.find(p => p.id === b.packageId);
    const sc = STATUS_CONFIG[b.status] || STATUS_CONFIG.Pending;
    const bkNum = b.bookingNumber ? `BK-${String(b.bookingNumber).padStart(4, '0')}` : `BK-${b.id.slice(0, 6).toUpperCase()}`;
    const wa = b.whatsapp || b.phone || '';
    const cleanPhone = wa.replace(/[^0-9+]/g, '');

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden hover:border-primary/40 transition-all group">

            {/* Card Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                    {/* Avatar */}
                    <div className="size-8 rounded-full bg-primary/10 text-primary font-extrabold text-sm flex items-center justify-center shrink-0 border border-primary/20">
                        {b.customer.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white leading-none">{b.customer}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{bkNum}</div>
                    </div>
                </div>

                {/* Status Selector */}
                <select
                    value={b.status}
                    onChange={e => onStatusChange(b.id, e.target.value as BookingStatus)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border cursor-pointer focus:outline-none ${sc.bg} ${sc.color} border-current/20`}
                >
                    <option value="Confirmed">Confirmed</option>
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                </select>
            </div>

            {/* Card Body */}
            <div className="px-4 py-3 space-y-2.5">

                {/* Trip Title & Price */}
                <div className="flex justify-between items-start gap-2">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug line-clamp-2">
                        {pkg?.title || b.title || 'Trip Booking'}
                    </p>
                    <span className="text-sm font-extrabold text-primary shrink-0">₹{(b.amount || 0).toLocaleString()}</span>
                </div>

                {/* Tags row */}
                <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">
                        <span className="material-symbols-outlined text-[11px]">groups</span> {pax} Pax
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${b.payment === 'Paid' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'}`}>
                        <span className="material-symbols-outlined text-[11px]">credit_card</span> {b.payment}
                    </span>
                    {b.type && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full">
                            {b.type}
                        </span>
                    )}
                </div>

                {/* Driver Assignment */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 shrink-0">Driver:</span>
                    <select
                        value={b.assignedTo ? String(b.assignedTo) : ''}
                        onChange={e => onDriverChange(b.id, e.target.value)}
                        className={`flex-1 text-[10px] font-semibold py-1 px-2 rounded-lg border focus:outline-none cursor-pointer ${!b.assignedTo ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}
                    >
                        <option value="">⚠️ Unassigned</option>
                        {staff.map(s => (
                            <option key={s.id} value={s.id}>{s.name}{s.role ? ` · ${s.role}` : ''}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Card Footer — Action Buttons */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                {cleanPhone && (
                    <a
                        href={`https://wa.me/${cleanPhone}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 py-1.5 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                        title="WhatsApp"
                    >
                        <span className="material-symbols-outlined text-[13px]">chat</span> WA
                    </a>
                )}
                <button
                    onClick={() => onNavigate('/admin/bookings', { state: { search: b.id } })}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                    <span className="material-symbols-outlined text-[13px]">open_in_new</span> Booking
                </button>
                <button
                    onClick={() => onNavigate('/admin/operations', { state: { bookingId: b.id } })}
                    className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="Live Operations"
                >
                    <span className="material-symbols-outlined text-[13px]">alt_route</span>
                </button>
                {b.leadId && (
                    <button
                        onClick={() => onNavigate('/admin/leads', { state: { leadId: b.leadId } })}
                        className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        title="View Lead"
                    >
                        <span className="material-symbols-outlined text-[13px]">person</span>
                    </button>
                )}
            </div>
        </div>
    );
}
