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

// ─── Date helpers (timezone-safe: YYYY-MM-DD is always treated as LOCAL) ───

export const parseDay = (value?: string | null): Date | null => {
    if (!value) return null;
    const parts = String(value).split('T')[0].split('-');
    if (parts.length !== 3) {
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    return new Date(y, m, d);
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
    Math.round((to.getTime() - from.getTime()) / DAY_MS);

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
