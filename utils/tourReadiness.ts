/**
 * tourReadiness.ts
 * ---------------------------------------------------------------------------
 * Pure, deterministic rules (no AI) that turn raw booking data into simple
 * "is this tour OK?" signals:
 *
 *   - Per-item checklist due dates (suggested from departure date)
 *   - Booking readiness level  -> Ready / On Track / At Risk / Critical
 *   - Balance-before-departure flag
 *   - "Needs attention" flags for the Guest Program cards
 *
 * Used by: TourChecklistModal, Bookings.tsx, Operations.tsx
 */
import { Booking, TourChecklistCategory, TourChecklistItem } from '../types';

const DAY_MS = 86_400_000;

// ─── Date helpers (timezone-safe: YYYY-MM-DD is always treated as calendar date) ─

const getTemporalApi = (): any => (globalThis as any).Temporal;

/** Normalize a date string to canonical YYYY-MM-DD without timezone drift. */
export const toPlainDateYMD = (value?: string | null): string | null => {
    if (!value) return null;
    const clean = String(value).split('T')[0].trim();
    const match = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
        const y = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const d = parseInt(match[3], 10);
        if (y > 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
            const iso = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const TemporalApi = getTemporalApi();
            if (TemporalApi?.PlainDate) {
                try {
                    return TemporalApi.PlainDate.from(iso).toString();
                } catch {
                    return null;
                }
            }
            const probe = new Date(Date.UTC(y, m - 1, d));
            if (probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d) {
                return iso;
            }
            return null;
        }
    }
    const dmy = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmy) {
        const d = parseInt(dmy[1], 10);
        const m = parseInt(dmy[2], 10);
        const y = parseInt(dmy[3], 10);
        return toPlainDateYMD(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    const fallback = new Date(value);
    if (isNaN(fallback.getTime())) return null;
    return `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, '0')}-${String(fallback.getDate()).padStart(2, '0')}`;
};

/** Today's calendar date as YYYY-MM-DD in the user's local calendar. */
export const todayDateStr = (): string => {
    const TemporalApi = getTemporalApi();
    if (TemporalApi?.Now?.plainDateISO) {
        try {
            return TemporalApi.Now.plainDateISO().toString();
        } catch {
            // Fall through to local Date
        }
    }
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

/** Add/subtract calendar days to a YYYY-MM-DD string without UTC/DST drift. */
export const addDaysToDateStr = (value?: string | null, deltaDays: number = 0): string | null => {
    const ymd = toPlainDateYMD(value);
    if (!ymd) return null;
    const TemporalApi = getTemporalApi();
    if (TemporalApi?.PlainDate) {
        try {
            return TemporalApi.PlainDate.from(ymd).add({ days: deltaDays }).toString();
        } catch {
            // Fall through
        }
    }
    const [y, m, d] = ymd.split('-').map(Number);
    const utc = new Date(Date.UTC(y, m - 1, d + deltaDays));
    return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, '0')}-${String(utc.getUTCDate()).padStart(2, '0')}`;
};

/** Inclusive calendar days between start and end (e.g. Nov 23..Nov 29 => 7). Returns null if invalid or end < start. */
export const inclusiveDaysBetween = (startStr?: string | null, endStr?: string | null): number | null => {
    const s = toPlainDateYMD(startStr);
    const e = toPlainDateYMD(endStr);
    if (!s || !e) return null;
    const TemporalApi = getTemporalApi();
    if (TemporalApi?.PlainDate) {
        try {
            const pStart = TemporalApi.PlainDate.from(s);
            const pEnd = TemporalApi.PlainDate.from(e);
            if (TemporalApi.PlainDate.compare(pEnd, pStart) < 0) return null;
            return pEnd.since(pStart, { largestUnit: 'day' }).days + 1;
        } catch {
            // Fall through
        }
    }
    const [sy, sm, sd] = s.split('-').map(Number);
    const [ey, em, ed] = e.split('-').map(Number);
    const diff = Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(sy, sm - 1, sd)) / DAY_MS);
    return diff >= 0 ? diff + 1 : null;
};

/** Resolve authoritative tour duration in inclusive days:
 *  1. Explicit start + end date span (source of truth so Day X of Y always matches Start/End dates)
 *  2. Explicit booking.durationDays (> 0)
 *  3. Linked package days / itinerary length
 *  4. Fallback 1 day (estimated)
 */
export const resolveTourDuration = (
    booking: { date?: string; endDate?: string; durationDays?: number | null; packageId?: string; title?: string },
    packages?: Array<{ id?: string; title?: string; days?: number; itinerary?: any[] }>
): { duration: number; estimated: boolean } => {
    const span = inclusiveDaysBetween(booking.date, booking.endDate);
    if (span !== null && span >= 1) {
        return { duration: span, estimated: false };
    }

    if (booking.durationDays && booking.durationDays > 0) {
        return { duration: Math.round(booking.durationDays), estimated: false };
    }

    if (packages && packages.length > 0) {
        const pkg = packages.find(p => booking.packageId && p.id === booking.packageId)
            || packages.find(p => booking.title && p.title === booking.title);
        const pkgDays = pkg?.days && pkg.days > 0
            ? pkg.days
            : (Array.isArray(pkg?.itinerary) && pkg.itinerary.length > 0 ? pkg.itinerary.length : 0);
        if (pkgDays > 0) {
            return { duration: Math.round(pkgDays), estimated: false };
        }
    }

    return { duration: 1, estimated: true };
};

/** Tour day & progress percentage using location-agnostic calendar dates. */
export const getTourProgress = (
    dateStr?: string | null,
    duration: number = 1,
    targetDateStr?: string | null
): { day: number; percent: number } => {
    const startYmd = toPlainDateYMD(dateStr);
    if (!startYmd || duration <= 0) return { day: 1, percent: 100 };

    const refYmd = toPlainDateYMD(targetDateStr) || todayDateStr();
    const endYmd = addDaysToDateStr(startYmd, duration - 1);

    if (refYmd < startYmd) {
        return { day: 1, percent: 0 };
    }
    if (endYmd && refYmd > endYmd) {
        return { day: duration, percent: 100 };
    }

    const diffDays = inclusiveDaysBetween(startYmd, refYmd) ?? 1;
    const currentDay = Math.min(Math.max(diffDays, 1), duration);
    const percent = Math.min(Math.max(Math.round((currentDay / duration) * 100), 5), 100);
    return { day: currentDay, percent };
};

export const parseDay = (value?: string | null): Date | null => {
    const ymd = toPlainDateYMD(value);
    if (!ymd) return null;
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d);
};

export const startOfToday = (): Date => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
};

export const toDayString = (d: Date): string => {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
};

/** Whole days from `from` until `to` (negative when `to` is in the past). */
export const daysBetween = (from: Date, to: Date): number =>
    Math.round((Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) - Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) / DAY_MS);

// ─── 1. Checklist due dates ────────────────────────────────────────────────

/** How many days BEFORE departure each type of task should be finished. */
export const DEFAULT_DUE_OFFSET_DAYS: Record<TourChecklistCategory, number> = {
    Visa: 30,
    Tickets: 14,
    Hotel: 10,
    Activities: 7,
    Transport: 3,
    Vouchers: 3,
    Briefing: 1,
    Other: 3,
};

/**
 * Suggested due date (YYYY-MM-DD) for a task, counted back from departure.
 * Never suggests a date in the past for a tour that still has time left;
 * if departure is very close the date is clamped to today.
 */
export const suggestDueDate = (
    departure: string | undefined,
    category: TourChecklistCategory
): string | undefined => {
    const dep = parseDay(departure);
    if (!dep) return undefined;
    const due = new Date(dep.getTime() - (DEFAULT_DUE_OFFSET_DAYS[category] ?? 3) * DAY_MS);
    const today = startOfToday();
    // Tour is still ahead but the ideal date already passed -> make it "today"
    if (dep.getTime() >= today.getTime() && due.getTime() < today.getTime()) {
        return toDayString(today);
    }
    return toDayString(due);
};

export type ItemDueState = 'done' | 'overdue' | 'due-soon' | 'upcoming' | 'none';

/** Where a single checklist item stands against its due date. */
export const getItemDueState = (item: TourChecklistItem, today: Date = startOfToday()): ItemDueState => {
    if (item.status === 'Completed' || item.status === 'Not Applicable') return 'done';
    const due = parseDay(item.dueDate);
    if (!due) return 'none';
    const diff = daysBetween(today, due);
    if (diff < 0) return 'overdue';
    if (diff <= 2) return 'due-soon';
    return 'upcoming';
};

// ─── 2. Booking readiness (green / amber / red) ────────────────────────────

export type ReadinessLevel = 'ready' | 'on-track' | 'at-risk' | 'critical' | 'not-started';

export interface BookingReadiness {
    level: ReadinessLevel;
    label: string;
    /** Completed actionable items */
    done: number;
    /** Actionable items (excludes Not Applicable) */
    total: number;
    overdueCount: number;
    /** Days until departure (negative once the tour has started) */
    daysToDeparture: number | null;
    /** Short human sentence used as a tooltip */
    reason: string;
}

export const READINESS_STYLES: Record<ReadinessLevel, { chip: string; dot: string }> = {
    ready: {
        chip: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
        dot: 'bg-emerald-500',
    },
    'on-track': {
        chip: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
        dot: 'bg-sky-500',
    },
    'at-risk': {
        chip: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
        dot: 'bg-amber-500',
    },
    critical: {
        chip: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
        dot: 'bg-rose-500',
    },
    'not-started': {
        chip: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
        dot: 'bg-slate-400',
    },
};

/**
 * Rules (simple on purpose):
 *   READY     every applicable item is Completed
 *   CRITICAL  something is open AND (departure <= 3 days away, or already on tour,
 *             or an item is overdue while departure is <= 7 days away)
 *   AT RISK   something is open AND (an item is overdue, or departure <= 7 days)
 *   ON TRACK  something is open but there is still comfortable time
 *   NOT STARTED  no checklist created yet (escalates like above near departure)
 */
export const getBookingReadiness = (booking: Booking, today: Date = startOfToday()): BookingReadiness => {
    const dep = parseDay(booking.date);
    const daysToDeparture = dep ? daysBetween(today, dep) : null;
    const chk = booking.checklist || [];
    const actionable = chk.filter(c => c.status !== 'Not Applicable');
    const done = actionable.filter(c => c.status === 'Completed').length;
    const overdueCount = actionable.filter(c => getItemDueState(c, today) === 'overdue').length;
    const hasChecklist = chk.length > 0;
    const allDone = hasChecklist && actionable.length > 0 && done >= actionable.length;

    if (allDone) {
        return { level: 'ready', label: 'Ready', done, total: actionable.length, overdueCount: 0, daysToDeparture, reason: 'All checklist items completed' };
    }

    const total = hasChecklist ? actionable.length : 10;
    const d = daysToDeparture;
    const imminent = d !== null && d <= 3;
    const soon = d !== null && d <= 7;

    let level: ReadinessLevel;
    let reason: string;

    if (imminent || (overdueCount > 0 && soon)) {
        level = 'critical';
        reason = imminent
            ? (d! < 0 ? 'Tour already started with open items' : `Departs in ${d} day${d === 1 ? '' : 's'} with open items`)
            : `${overdueCount} overdue item${overdueCount === 1 ? '' : 's'} and departure within a week`;
    } else if (overdueCount > 0 || soon) {
        level = 'at-risk';
        reason = overdueCount > 0
            ? `${overdueCount} item${overdueCount === 1 ? '' : 's'} past due date`
            : `Departs in ${d} days with open items`;
    } else if (!hasChecklist) {
        level = 'not-started';
        reason = 'Checklist not started yet';
    } else {
        level = 'on-track';
        reason = 'Open items, but plenty of time before departure';
    }

    const label = level === 'not-started' ? 'Not Started'
        : level === 'critical' ? 'Critical'
        : level === 'at-risk' ? 'At Risk'
        : 'On Track';

    return { level, label, done, total, overdueCount, daysToDeparture, reason };
};

// ─── 3. Balance before departure ───────────────────────────────────────────

/** Verified payments minus verified refunds (same rule the dashboard uses). */
export const getNetPaid = (b: Booking): number => {
    const tx = b.transactions || [];
    const paid = tx
        .filter(t => t.type === 'Payment' && t.status === 'Verified')
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const refunded = tx
        .filter(t => t.type === 'Refund' && t.status === 'Verified')
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    return Math.max(0, paid - refunded);
};

export type BalanceFlagLevel = 'none' | 'soon' | 'critical' | 'overdue';

export interface BalanceFlag {
    level: BalanceFlagLevel;
    balance: number;
    netPaid: number;
    daysToDeparture: number | null;
    label: string;
}

/**
 *   overdue   tour already started/finished and money is still pending
 *   critical  departure within 7 days and money is pending   (RED)
 *   soon      departure within 8-14 days and money is pending (AMBER)
 */
export const getBalanceFlag = (booking: Booking, today: Date = startOfToday()): BalanceFlag => {
    const netPaid = getNetPaid(booking);
    const balance = Math.max(0, (Number(booking.amount) || 0) - netPaid);
    const dep = parseDay(booking.date);
    const days = dep ? daysBetween(today, dep) : null;

    if (booking.status === 'Cancelled' || balance <= 0 || days === null) {
        return { level: 'none', balance, netPaid, daysToDeparture: days, label: '' };
    }
    if (days < 0) return { level: 'overdue', balance, netPaid, daysToDeparture: days, label: 'Balance overdue' };
    if (days <= 7) {
        return {
            level: 'critical', balance, netPaid, daysToDeparture: days,
            label: days === 0 ? 'Balance due today' : `Balance due before travel (${days}d)`,
        };
    }
    if (days <= 14) return { level: 'soon', balance, netPaid, daysToDeparture: days, label: `Balance due in ${days}d` };
    return { level: 'none', balance, netPaid, daysToDeparture: days, label: '' };
};

export const BALANCE_FLAG_STYLES: Record<Exclude<BalanceFlagLevel, 'none'>, string> = {
    overdue: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    critical: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    soon: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
};

// ─── 4. "Needs attention" flags for Guest Program cards ────────────────────

export interface AttentionFlag {
    key: 'driver' | 'checklist' | 'balance' | 'hotel';
    label: string;
    severity: 'red' | 'amber';
}

export const getAttentionFlags = (
    booking: Booking,
    opts: { hasDriver: boolean },
    today: Date = startOfToday()
): AttentionFlag[] => {
    const flags: AttentionFlag[] = [];

    if (!opts.hasDriver) {
        flags.push({ key: 'driver', label: 'No driver assigned', severity: 'red' });
    }

    const hotel = (booking.supplierBookings || []).find(
        sb => sb.serviceType === 'Hotel' || String(sb.serviceType || '').toLowerCase().includes('hotel')
    );
    if (!hotel || hotel.bookingStatus === 'Pending') {
        flags.push({ key: 'hotel', label: hotel ? 'Hotel not confirmed' : 'No hotel booked', severity: 'amber' });
    }

    const readiness = getBookingReadiness(booking, today);
    if (readiness.level !== 'ready') {
        flags.push({
            key: 'checklist',
            label: `Checklist ${readiness.done}/${readiness.total}${readiness.overdueCount > 0 ? ` · ${readiness.overdueCount} overdue` : ''}`,
            severity: readiness.level === 'critical' ? 'red' : 'amber',
        });
    }

    const balance = getBalanceFlag(booking, today);
    if (balance.level === 'critical' || balance.level === 'overdue') {
        flags.push({ key: 'balance', label: `Balance pending ₹${Math.round(balance.balance).toLocaleString('en-IN')}`, severity: 'red' });
    } else if (balance.level === 'soon') {
        flags.push({ key: 'balance', label: `Balance pending ₹${Math.round(balance.balance).toLocaleString('en-IN')}`, severity: 'amber' });
    }

    return flags;
};
