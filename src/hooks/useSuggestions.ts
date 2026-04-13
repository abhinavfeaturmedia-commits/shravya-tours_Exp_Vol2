/**
 * useSuggestions.ts
 * ─────────────────
 * Central suggestion engine. Evaluates current context + data state and
 * returns the most relevant suggestion(s) to surface to the user.
 *
 * Usage:
 *   const suggestion = useSuggestions({ page: 'lead-detail', lead, followUps });
 *   if (suggestion) return <SuggestPopup {...suggestion} />;
 */

import { useMemo } from 'react';
import { Lead, Booking, FollowUp } from '../../types';
import { isDismissed, isSnoozed } from '../../components/ui/SuggestPopup';

// ─── Context shapes per page ──────────────────────────────────────────────────

interface BaseContext {
  page: string;
}

interface LeadDetailContext extends BaseContext {
  page: 'lead-detail';
  lead: Lead;
  followUps: FollowUp[];
  proposals?: any[];
}

interface BookingDetailContext extends BaseContext {
  page: 'booking-detail';
  booking: Booking;
}

interface AdminGlobalContext extends BaseContext {
  page: 'admin-global';
  bookings: Booking[];
  leads: Lead[];
}

export type SuggestionContext =
  | LeadDetailContext
  | BookingDetailContext
  | AdminGlobalContext;

// ─── Suggestion output type ───────────────────────────────────────────────────

export interface Suggestion {
  id: string;
  icon: string;
  color: 'indigo' | 'amber' | 'emerald' | 'red' | 'blue' | 'purple' | 'rose';
  title: string;
  description: string;
  primaryAction?: { label: string; icon?: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  snoozeMinutes?: number;
  autoDismissMs?: number;
  variant: 'float' | 'banner' | 'modal';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isAvailable(id: string): boolean {
  return !isDismissed(id) && !isSnoozed(id);
}

function daysSince(dateStr: string | undefined): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function daysUntil(dateStr: string | undefined): number {
  if (!dateStr) return Infinity;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

// ─── Lead-detail evaluator ────────────────────────────────────────────────────

function evalLeadDetail(ctx: LeadDetailContext): Suggestion | null {
  const { lead, followUps, proposals = [] } = ctx;
  const pendingFollowUps = followUps.filter(
    f => f.leadId === lead.id && f.status === 'Pending'
  );
  const hasLogs = (lead.logs?.length ?? 0) > 0;
  const hasProposal = proposals.some((p: any) => p.leadId === lead.id);

  // — Status: New, no logs, untouched >24h
  if (lead.status === 'New' && !hasLogs && daysSince(lead.addedOn) >= 1) {
    const id = `lead-first-contact-${lead.id}`;
    if (!isAvailable(id)) return null;
    return {
      id,
      variant: 'banner',
      icon: 'warning',
      color: 'red',
      title: 'This lead is going cold — make first contact now!',
      description: `${lead.name} has been waiting ${daysSince(lead.addedOn)} day(s). A quick call or WhatsApp message can win them over.`,
      primaryAction: { label: 'Log a Call', icon: 'call', onClick: () => {} },
      snoozeMinutes: 60,
    };
  }

  // — Status: New, no logs, fresh but warm nudge
  if (lead.status === 'New' && !hasLogs) {
    const id = `lead-new-nudge-${lead.id}`;
    if (!isAvailable(id)) return null;
    return {
      id,
      variant: 'banner',
      icon: 'phone_in_talk',
      color: 'blue',
      title: 'New lead — make the first contact!',
      description: `Say hi to ${lead.name} and understand their travel needs.`,
      primaryAction: { label: 'Log a Call', icon: 'call', onClick: () => {} },
      snoozeMinutes: 30,
    };
  }

  // — Status: Warm, has logs but no pending follow-up
  if (lead.status === 'Warm' && hasLogs && pendingFollowUps.length === 0) {
    const id = `lead-schedule-followup-${lead.id}`;
    if (!isAvailable(id)) return null;
    return {
      id,
      variant: 'banner',
      icon: 'event',
      color: 'amber',
      title: 'Schedule a follow-up to keep momentum',
      description: `${lead.name} is warm — don't let the conversation go cold. Set a reminder.`,
      primaryAction: { label: 'Schedule Follow-up', icon: 'add_alert', onClick: () => {} },
      snoozeMinutes: 60,
    };
  }

  // — Status: Hot, no proposal
  if (lead.status === 'Hot' && !hasProposal) {
    const id = `lead-create-proposal-${lead.id}`;
    if (!isAvailable(id)) return null;
    return {
      id,
      variant: 'banner',
      icon: 'description',
      color: 'purple',
      title: 'Hot lead — create a proposal to close the deal!',
      description: `${lead.name} is ready. A well-crafted proposal will convert them into a booking.`,
      primaryAction: { label: 'Create Proposal', icon: 'add', onClick: () => {} },
      snoozeMinutes: 120,
    };
  }

  // — Status: Offer Sent, no response in 3+ days
  if (lead.status === 'Offer Sent') {
    const lastLog = lead.logs?.[lead.logs.length - 1];
    const daysSinceLastLog = daysSince(lastLog?.timestamp ?? lead.addedOn);
    if (daysSinceLastLog >= 3) {
      const id = `lead-followup-offer-${lead.id}`;
      if (!isAvailable(id)) return null;
      return {
        id,
        variant: 'banner',
        icon: 'refresh',
        color: 'amber',
        title: 'No response in 3+ days — time to follow up!',
        description: `${lead.name} hasn't responded since the offer was sent. A gentle nudge could close the deal.`,
        primaryAction: { label: 'Send WhatsApp', icon: 'chat', onClick: () => {} },
        secondaryAction: { label: 'Log Note', onClick: () => {} },
        snoozeMinutes: 180,
      };
    }
  }

  // — Status: Converted
  if (lead.status === 'Converted') {
    const id = `lead-view-booking-${lead.id}`;
    if (!isAvailable(id)) return null;
    return {
      id,
      variant: 'banner',
      icon: 'check_circle',
      color: 'emerald',
      title: 'Lead converted — view the booking!',
      description: `${lead.name} is now a customer. Add supplier bookings and record their advance payment.`,
      primaryAction: { label: 'View Booking', icon: 'open_in_new', onClick: () => {} },
      snoozeMinutes: 0,
    };
  }

  return null;
}

// ─── Booking-detail evaluator ─────────────────────────────────────────────────

function evalBookingDetail(ctx: BookingDetailContext): Suggestion | null {
  const { booking } = ctx;
  if (booking.status !== 'Pending') return null;

  const id = `booking-checklist-${booking.id}`;
  if (!isAvailable(id)) return null;

  const hasSuppliers = (booking.supplierBookings?.length ?? 0) > 0;
  const hasPaid = booking.payment === 'Paid' || booking.payment === 'Deposit';

  // Build a readable description of remaining steps
  const remaining: string[] = [];
  if (!hasPaid) remaining.push('record advance payment');
  if (!hasSuppliers) remaining.push('add supplier bookings');
  if (!booking.assignedTo) remaining.push('assign a staff member');
  if (remaining.length === 0) return null;

  return {
    id,
    variant: 'float',
    icon: 'checklist',
    color: 'indigo',
    title: 'Pending booking — complete these steps',
    description: `Still needed: ${remaining.join(', ')}.`,
    primaryAction: { label: 'Add Suppliers', icon: 'storefront', onClick: () => {} },
    secondaryAction: { label: 'Dismiss', onClick: () => {} },
    snoozeMinutes: 30,
  };
}

// ─── Admin-global evaluator ───────────────────────────────────────────────────

function evalAdminGlobal(ctx: AdminGlobalContext): Suggestion | null {
  const { bookings } = ctx;

  // Payment collection nudge: Unpaid/Deposit + departing within 15 days
  const urgentPayments = bookings.filter(b => {
    const isUnpaid = b.payment === 'Unpaid' || b.payment === 'Deposit';
    const departsInDays = daysUntil(b.date);
    return isUnpaid && departsInDays >= 0 && departsInDays <= 15;
  });

  if (urgentPayments.length > 0) {
    const id = `payment-nudge-global`;
    if (!isAvailable(id)) return null;
    const first = urgentPayments[0];
    return {
      id,
      variant: 'banner',
      icon: 'payments',
      color: 'red',
      title: `${urgentPayments.length} booking${urgentPayments.length > 1 ? 's' : ''} with payment due before departure!`,
      description: `${first.customer}'s trip departs in ${daysUntil(first.date)} days — collect payment now.`,
      primaryAction: { label: 'View Bookings', icon: 'open_in_new', onClick: () => {} },
      snoozeMinutes: 60 * 4, // 4 hours
    };
  }

  return null;
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export function useSuggestions(ctx: SuggestionContext): Suggestion | null {
  return useMemo(() => {
    switch (ctx.page) {
      case 'lead-detail':
        return evalLeadDetail(ctx);
      case 'booking-detail':
        return evalBookingDetail(ctx);
      case 'admin-global':
        return evalAdminGlobal(ctx);
      default:
        return null;
    }
  }, [ctx]);
}

// ─── Stale-lead helper (for dashboard) ───────────────────────────────────────

export function getStaleLeads(leads: Lead[], daysThreshold = 30): Lead[] {
  return leads.filter(lead => {
    if (!['New', 'Warm'].includes(lead.status)) return false;
    const lastActivity = lead.logs?.[lead.logs.length - 1]?.timestamp ?? lead.addedOn;
    return daysSince(lastActivity) >= daysThreshold;
  });
}

// ─── Payment-due-bookings helper ──────────────────────────────────────────────

export function getPaymentDueBookings(bookings: Booking[], daysThreshold = 15): Booking[] {
  return bookings.filter(b => {
    const isUnpaid = b.payment === 'Unpaid' || b.payment === 'Deposit';
    const d = daysUntil(b.date);
    return isUnpaid && d >= 0 && d <= daysThreshold;
  });
}
