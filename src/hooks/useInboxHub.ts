import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFinance, FinanceTransaction } from './useFinance';
import { useTransfers, TransferRequest } from './useTransfers';
import { useExpenses } from './useExpenses';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { Booking, Lead, FollowUp, Task, StaffLeave } from '../../types';

export type InboxItemCategory = 
  | 'finance' 
  | 'operations' 
  | 'crm' 
  | 'hr' 
  | 'tasks'
  | 'partner_kyc' 
  | 'transfer';

export type InboxItemPriority = 'Urgent' | 'High' | 'Medium' | 'Low';
export type InboxFolder = 'inbox' | 'starred' | 'authorized' | 'exceptions' | 'drafts' | 'trash';

export interface UnifiedInboxItem {
  id: string;
  originalId: string;
  category: InboxItemCategory;
  categoryLabel: string;
  type: string;
  title: string;
  subtitle: string;
  requesterName: string;
  requesterEmail?: string;
  requesterPhone?: string;
  requesterInitials: string;
  avatarColor: string;
  activityIcon: string;
  iconBgColor: string;
  amount?: number;
  referenceCode?: string;
  priority: InboxItemPriority;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Sent Back' | 'Completed' | 'Dismissed';
  createdAt: string;
  dueAt?: string;
  isOverdue?: boolean;
  timeAgo: string;
  starred?: boolean;
  deepLinkUrl?: string;
  resolutionNote?: string;
  resolvedAt?: string;
  metadata: Record<string, any>;
  actions: {
    canApprove?: boolean;
    canReject?: boolean;
    canSendBack?: boolean;
    canReassign?: boolean;
    customActionLabel?: string;
  };
}

const AVATAR_BG_COLORS = [
  'bg-emerald-600',
  'bg-indigo-600',
  'bg-blue-600',
  'bg-amber-600',
  'bg-purple-600',
  'bg-rose-600',
  'bg-teal-600',
  'bg-cyan-600'
];

export function resolveStaffDisplayName(val?: any): string {
  if (!val) return 'System / Manager';
  const str = String(val).trim();
  if (str === '1' || str.toLowerCase() === 'admin') return 'Admin (Manager)';
  if (/^\d+$/.test(str)) return `Staff #${str}`;
  return str;
}

export function resolveStaffInitials(val?: any): string {
  if (!val) return 'TK';
  const str = String(val).trim();
  if (str === '1' || str.toLowerCase() === 'admin') return 'AD';
  if (/^\d+$/.test(str)) return `S${str}`;
  return getInitials(str);
}

function getInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_BG_COLORS[Math.abs(hash) % AVATAR_BG_COLORS.length];
}

export function formatCleanDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const dateFormatted = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const hasTime = dateStr.includes('T') && !dateStr.endsWith('T00:00:00.000Z') && !dateStr.endsWith('T00:00:00');
  if (hasTime) {
    const timeFormatted = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dateFormatted}, ${timeFormatted}`;
  }
  return dateFormatted;
}

export function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return 'Recently';
  const time = new Date(dateStr).getTime();
  if (isNaN(time)) return 'Recently';
  const now = Date.now();
  const diffSec = Math.floor((now - time) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export const useInboxHub = () => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const { transactions, updateTransactionStatus } = useFinance();
  const { transfers, approveTransfer, rejectTransfer } = useTransfers();
  const { bookings, updateBooking, leads, updateLead, followUps, updateFollowUp, tasks, updateTask } = useData();

  // Local persistent state for starred items
  const [starredIds, setStarredIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('shravya_inbox_starred') || '[]');
    } catch {
      return [];
    }
  });

  const toggleStar = useCallback((id: string) => {
    setStarredIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('shravya_inbox_starred', JSON.stringify(next));
      return next;
    });
  }, []);

  // Fetch staff leaves
  const { data: leaves = [], refetch: refetchLeaves } = useQuery<StaffLeave[]>({
    queryKey: ['staff-leaves'],
    queryFn: () => api.getStaffLeaves().catch(() => []),
    refetchInterval: 30000,
  });

  // Fetch pending attendance regularizations
  const { data: regularizations = [], refetch: refetchRegularizations } = useQuery<any[]>({
    queryKey: ['staff-regularizations'],
    queryFn: () => api.getPendingRegularizations().catch(() => []),
    refetchInterval: 30000,
  });

  // Fetch KYC submissions
  const { data: kycRecords = [], refetch: refetchKyc } = useQuery<any[]>({
    queryKey: ['admin-kyc-records'],
    queryFn: async () => {
      const token = localStorage.getItem('shravya_jwt');
      const API_BASE = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_BASE}/api/admin/kyc`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    refetchInterval: 30000,
  });

  // Fetch Partners for pending approvals
  const { data: partners = [], refetch: refetchPartners } = useQuery<any[]>({
    queryKey: ['admin-partners-list'],
    queryFn: async () => {
      const token = localStorage.getItem('shravya_jwt');
      const API_BASE = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_BASE}/api/admin/partners`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    refetchInterval: 30000,
  });

  // Combine and normalize all pending items
  const allItems = useMemo<UnifiedInboxItem[]>(() => {
    const items: UnifiedInboxItem[] = [];
    const now = Date.now();

    // 1. 💰 FINANCE: Customer Payment Proofs
    transactions.forEach(tx => {
      const isPending = tx.status === 'Pending';
      const isApproved = tx.status === 'Verified';
      const isStarred = starredIds.includes(`pay_${tx.id}`);

      items.push({
        id: `pay_${tx.id}`,
        originalId: tx.id,
        category: 'finance',
        categoryLabel: 'Finance & Payments',
        type: 'Payment Verification',
        title: `Payment Verification: ${tx.customer || 'Customer'}`,
        subtitle: `Ref: ${tx.reference || 'N/A'} • Method: ${tx.method} • ${tx.bookingName || 'Tour Booking'}`,
        requesterName: tx.customer || 'Traveler',
        requesterEmail: tx.email,
        requesterPhone: tx.phone,
        requesterInitials: getInitials(tx.customer || 'CU'),
        avatarColor: getAvatarColor(tx.customer || tx.id),
        activityIcon: 'payments',
        iconBgColor: 'bg-emerald-500 text-white',
        amount: tx.amount,
        referenceCode: tx.reference || `TX-${tx.id.substring(0, 8)}`,
        priority: tx.amount && tx.amount > 50000 ? 'Urgent' : 'High',
        status: isPending ? 'Pending' : isApproved ? 'Approved' : 'Rejected',
        createdAt: tx.date || new Date().toISOString(),
        timeAgo: formatRelativeTime(tx.date),
        starred: isStarred,
        deepLinkUrl: '/admin/finance-verification',
        metadata: {
          ...tx,
          bookingId: tx.bookingId,
          receiptUrl: tx.receiptUrl,
          recordedBy: tx.recordedBy
        },
        actions: {
          canApprove: isPending,
          canReject: isPending,
          canSendBack: isPending
        }
      });
    });

    // 2. 🔄 TRANSFERS: Lead & Booking Ownership Reassignments
    transfers.forEach(tr => {
      const isPending = tr.status === 'Pending';
      const isApproved = tr.status === 'Approved';
      const isStarred = starredIds.includes(`tr_${tr.id}`);

      items.push({
        id: `tr_${tr.id}`,
        originalId: tr.id,
        category: 'transfer',
        categoryLabel: 'Ownership Transfers',
        type: `${tr.item_type} Transfer`,
        title: `Transfer ${tr.item_type}: ${tr.item_name || tr.item_id}`,
        subtitle: `From ${tr.from_staff_name || 'Staff'} ➔ To ${tr.to_staff_name || 'Staff'} • Reason: "${tr.reason}"`,
        requesterName: tr.requested_by_name || tr.from_staff_name || 'Staff Member',
        requesterInitials: getInitials(tr.requested_by_name || tr.from_staff_name || 'ST'),
        avatarColor: getAvatarColor(tr.requested_by_name || tr.id),
        activityIcon: 'swap_horiz',
        iconBgColor: 'bg-amber-500 text-white',
        amount: tr.item_value,
        referenceCode: `TR-${tr.id.substring(0, 8)}`,
        priority: 'Medium',
        status: isPending ? 'Pending' : isApproved ? 'Approved' : 'Rejected',
        createdAt: tr.created_at || new Date().toISOString(),
        timeAgo: formatRelativeTime(tr.created_at),
        starred: isStarred,
        deepLinkUrl: tr.item_type === 'Booking' ? '/admin/bookings' : '/admin/leads',
        metadata: {
          ...tr
        },
        actions: {
          canApprove: isPending,
          canReject: isPending,
          canSendBack: isPending
        }
      });
    });

    // 3. 👥 HR: Staff Leave Requests
    leaves.forEach(lv => {
      const raw = lv as any;
      const isPending = raw.status === 'Pending';
      const isApproved = raw.status === 'Approved';
      const isStarred = starredIds.includes(`leave_${raw.id}`);

      const staffName = raw.staff_name || raw.staffName || (raw.staff_id ? `Staff #${raw.staff_id}` : 'Staff Member');
      const leaveType = raw.leave_type || raw.leaveType || 'Casual';
      const startDate = raw.start_date ? String(raw.start_date).split('T')[0] : (raw.startDate ? String(raw.startDate).split('T')[0] : 'TBD');
      const endDate = raw.end_date ? String(raw.end_date).split('T')[0] : (raw.endDate ? String(raw.endDate).split('T')[0] : 'TBD');
      const daysCount = Number(raw.days_count ?? raw.daysCount ?? 1);
      const department = raw.department || 'Operations';
      const role = raw.role || 'Staff';
      const reason = raw.reason || 'Personal / Leave application';
      const initials = raw.initials || getInitials(staffName);
      const color = raw.color || getAvatarColor(staffName);
      const createdAt = raw.created_at || raw.createdAt || new Date().toISOString();
      const email = raw.staff_email || raw.email || '';
      const phone = raw.staff_phone || raw.phone || '';

      items.push({
        id: `leave_${raw.id}`,
        originalId: raw.id,
        category: 'hr',
        categoryLabel: 'HR & Staff Leaves',
        type: `${leaveType} Leave (${daysCount} Day${daysCount > 1 ? 's' : ''})`,
        title: `Leave Request: ${staffName} (${leaveType})`,
        subtitle: `${formatCleanDate(startDate)} to ${formatCleanDate(endDate)} • ${department} (${role})`,
        requesterName: staffName,
        requesterEmail: email,
        requesterPhone: phone,
        requesterInitials: initials,
        avatarColor: color,
        activityIcon: 'beach_access',
        iconBgColor: 'bg-pink-500 text-white',
        referenceCode: `LV-${String(raw.id).substring(0, 6).toUpperCase()}`,
        priority: leaveType === 'Sick' ? 'Urgent' : 'Medium',
        status: isPending ? 'Pending' : isApproved ? 'Approved' : 'Rejected',
        createdAt: createdAt,
        timeAgo: formatRelativeTime(createdAt),
        starred: isStarred,
        deepLinkUrl: '/admin/attendance',
        metadata: {
          ...raw,
          staffName,
          leaveType,
          startDate,
          endDate,
          daysCount,
          department,
          role,
          reason
        },
        actions: {
          canApprove: isPending,
          canReject: isPending,
          canSendBack: isPending
        }
      });
    });

    // 3b. ⏰ HR: Attendance Regularization Requests
    regularizations.forEach(reg => {
      const isPending = reg.regularization_status === 'Requested';
      if (!isPending) return;

      const isStarred = starredIds.includes(`reg_${reg.id}`);
      const staffName = reg.staff_name || `Staff #${reg.staff_id}`;
      const reqIn = reg.requested_check_in ? new Date(reg.requested_check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '09:30 AM';
      const reqOut = reg.requested_check_out ? new Date(reg.requested_check_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '06:30 PM';

      items.push({
        id: `reg_${reg.id}`,
        originalId: reg.id,
        category: 'hr',
        categoryLabel: 'Staff & Attendance',
        type: 'Attendance Regularization',
        title: `Regularization: ${staffName}`,
        subtitle: `Date: ${reg.date} • In: ${reqIn} / Out: ${reqOut} • Note: "${reg.regularization_reason || 'Missed punch'}"`,
        requesterName: staffName,
        requesterEmail: reg.staff_email,
        requesterInitials: reg.initials || 'ST',
        avatarColor: reg.color || 'bg-amber-600',
        activityIcon: 'edit_calendar',
        iconBgColor: 'bg-amber-500 text-white',
        referenceCode: `REG-${String(reg.id).substring(0, 8)}`,
        priority: 'High',
        status: 'Pending',
        createdAt: reg.created_at || new Date().toISOString(),
        timeAgo: formatRelativeTime(reg.created_at),
        starred: isStarred,
        deepLinkUrl: `/admin/attendance?staffId=${reg.staff_id}`,
        metadata: {
          ...reg,
          staffName,
          reqIn,
          reqOut
        },
        actions: {
          canApprove: true,
          canReject: true,
          canSendBack: true
        }
      });
    });

    // 4. 🚗 OPERATIONS: Driver & Vehicle Allocation Missing
    bookings.forEach(b => {
      if (b.status === 'Cancelled' || b.status === 'Completed') return;

      const departureDate = new Date(b.date).getTime();
      const hoursUntilTrip = (departureDate - now) / (1000 * 3600);
      const hasDriver = !!(b.supplierBookings?.some(sb => sb.serviceType === 'Transport' && sb.driverName) || b.details?.includes('Driver:'));
      const isImminent = hoursUntilTrip > -24 && hoursUntilTrip <= 48;

      if (!hasDriver && isImminent) {
        const isStarred = starredIds.includes(`ops_driver_${b.id}`);
        const urgency: InboxItemPriority = hoursUntilTrip <= 24 ? 'Urgent' : 'High';
        const formattedDeparture = formatCleanDate(b.date);

        items.push({
          id: `ops_driver_${b.id}`,
          originalId: b.id,
          category: 'operations',
          categoryLabel: 'Live Operations & Cabs',
          type: 'Driver Allocation Needed',
          title: `Assign Driver: ${b.title || b.customer}`,
          subtitle: `Starts in ${Math.max(0, Math.round(hoursUntilTrip))}h (${formattedDeparture}) • ${b.guests || '1 Pax'}`,
          requesterName: b.customer,
          requesterEmail: b.email,
          requesterPhone: b.phone,
          requesterInitials: getInitials(b.customer),
          avatarColor: getAvatarColor(b.customer),
          activityIcon: 'directions_car',
          iconBgColor: 'bg-blue-500 text-white',
          amount: b.amount,
          referenceCode: b.invoiceNo || (b.bookingNumber ? `BK-${String(b.bookingNumber).padStart(4, '0')}` : b.id.substring(0, 8)),
          priority: urgency,
          status: 'Pending',
          createdAt: b.date,
          dueAt: b.date,
          isOverdue: hoursUntilTrip < 0,
          timeAgo: formatRelativeTime(b.date),
          starred: isStarred,
          deepLinkUrl: '/admin/bookings',
          metadata: {
            ...b,
            hoursUntilTrip: Math.round(hoursUntilTrip)
          },
          actions: {
            canApprove: true,
            customActionLabel: 'Assign Driver Now'
          }
        });
      }

      // Check for unconfirmed supplier bookings
      b.supplierBookings?.forEach(sb => {
        if (sb.bookingStatus === 'Pending') {
          const isStarred = starredIds.includes(`ops_sb_${sb.id}`);
          items.push({
            id: `ops_sb_${sb.id}`,
            originalId: sb.id,
            category: 'operations',
            categoryLabel: 'Supplier Confirmations',
            type: `${sb.serviceType} Voucher Confirmation`,
            title: `Confirm ${sb.serviceType}: ${b.customer}`,
            subtitle: `Trip: ${b.title} • Vendor Cost: ₹${(sb.cost || 0).toLocaleString('en-IN')}`,
            requesterName: b.customer,
            requesterPhone: b.phone,
            requesterInitials: getInitials(b.customer),
            avatarColor: getAvatarColor(b.customer),
            activityIcon: 'hotel',
            iconBgColor: 'bg-indigo-500 text-white',
            amount: sb.cost,
            referenceCode: `SUP-${sb.id.substring(0, 6)}`,
            priority: 'High',
            status: 'Pending',
            createdAt: b.date,
            timeAgo: formatRelativeTime(b.date),
            starred: isStarred,
            deepLinkUrl: '/admin/bookings',
            metadata: {
              ...sb,
              bookingId: b.id,
              bookingTitle: b.title,
              customer: b.customer
            },
            actions: {
              canApprove: true,
              customActionLabel: 'Confirm Supplier'
            }
          });
        }
      });
    });

    // 5. 📞 CRM & SALES: Overdue Follow-ups & Unassigned Inquiries
    followUps.forEach(f => {
      const isPending = f.status === 'Pending' || f.status === 'Scheduled';
      if (!isPending) return;

      const scheduledTime = new Date(f.scheduledAt).getTime();
      const isOverdue = scheduledTime < now;
      const isStarred = starredIds.includes(`crm_fu_${f.id}`);

      if (isOverdue) {
        items.push({
          id: `crm_fu_${f.id}`,
          originalId: f.id,
          category: 'crm',
          categoryLabel: 'Sales & Follow-ups',
          type: `Overdue ${f.type} Reminder`,
          title: `Follow-up: ${f.leadName || 'Lead Inquiry'} (${f.type})`,
          subtitle: `Scheduled: ${formatCleanDate(f.scheduledAt)} • "${f.description || f.notes || 'Call lead'}"`,
          requesterName: f.leadName || 'Lead Traveler',
          requesterInitials: getInitials(f.leadName || 'LD'),
          avatarColor: getAvatarColor(f.leadName || f.id),
          activityIcon: 'call',
          iconBgColor: 'bg-purple-500 text-white',
          referenceCode: `FU-${f.id.substring(0, 6)}`,
          priority: 'Urgent',
          status: 'Pending',
          createdAt: f.createdAt || f.scheduledAt,
          dueAt: f.scheduledAt,
          isOverdue: true,
          timeAgo: formatRelativeTime(f.scheduledAt),
          starred: isStarred,
          deepLinkUrl: '/admin/leads',
          metadata: {
            ...f
          },
          actions: {
            canApprove: true,
            customActionLabel: 'Mark Done'
          }
        });
      }
    });

    // Unassigned Fresh Leads
    leads.forEach(l => {
      if (l.status === 'New' && (!l.assignedTo || l.assignedTo === 0)) {
        const isStarred = starredIds.includes(`crm_lead_${l.id}`);
        items.push({
          id: `crm_lead_${l.id}`,
          originalId: l.id,
          category: 'crm',
          categoryLabel: 'Unassigned Leads',
          type: 'Unassigned Inbound Lead',
          title: `New Inquiry: ${l.name} (${l.destination || 'Custom Tour'})`,
          subtitle: `Budget: ${l.budget || 'Flexible'} • Travelers: ${l.travelers || '1'} • Source: ${l.source || 'Website'}`,
          requesterName: l.name,
          requesterEmail: l.email,
          requesterPhone: l.phone,
          requesterInitials: getInitials(l.name),
          avatarColor: getAvatarColor(l.name),
          activityIcon: 'person_add',
          iconBgColor: 'bg-purple-500 text-white',
          amount: l.potentialValue,
          referenceCode: l.leadNumber ? `LD-${String(l.leadNumber).padStart(4, '0')}` : l.id.substring(0, 8),
          priority: 'High',
          status: 'Pending',
          createdAt: l.addedOn || new Date().toISOString(),
          timeAgo: formatRelativeTime(l.addedOn),
          starred: isStarred,
          deepLinkUrl: '/admin/leads',
          metadata: {
            ...l
          },
          actions: {
            canApprove: true,
            customActionLabel: 'Assign Agent'
          }
        });
      }
    });

    // 6. 🤝 PARTNERS & KYC: Approvals and KYC Verification
    partners.forEach(p => {
      if (p.status === 'Pending Approval') {
        const isStarred = starredIds.includes(`partner_${p.id}`);
        items.push({
          id: `partner_${p.id}`,
          originalId: p.id,
          category: 'partner_kyc',
          categoryLabel: 'B2B Partners & KYC',
          type: 'Partner Onboarding Approval',
          title: `Partner Registration: ${p.name} (${p.company_name || 'Travel Agency'})`,
          subtitle: `Location: ${p.location || 'India'} • Email: ${p.email}`,
          requesterName: p.name,
          requesterEmail: p.email,
          requesterPhone: p.phone,
          requesterInitials: getInitials(p.name),
          avatarColor: getAvatarColor(p.name),
          activityIcon: 'handshake',
          iconBgColor: 'bg-teal-500 text-white',
          referenceCode: `PTR-${p.id.substring(0, 6).toUpperCase()}`,
          priority: 'Medium',
          status: 'Pending',
          createdAt: p.created_at || new Date().toISOString(),
          timeAgo: formatRelativeTime(p.created_at),
          starred: isStarred,
          deepLinkUrl: '/admin/partners',
          metadata: {
            ...p
          },
          actions: {
            canApprove: true,
            canReject: true,
            canSendBack: true
          }
        });
      }
    });

    kycRecords.forEach(kyc => {
      if (kyc.kyc_status === 'Submitted') {
        const isStarred = starredIds.includes(`kyc_${kyc.id}`);
        items.push({
          id: `kyc_${kyc.id}`,
          originalId: kyc.id,
          category: 'partner_kyc',
          categoryLabel: 'KYC Document Audits',
          type: 'Partner KYC Audit',
          title: `KYC Audit: ${kyc.name} (${kyc.company_name || 'Partner'})`,
          subtitle: `PAN, GST & ID Proof submitted on ${formatCleanDate(kyc.kyc_submitted_at)}`,
          requesterName: kyc.name,
          requesterEmail: kyc.email,
          requesterPhone: kyc.phone,
          requesterInitials: getInitials(kyc.name),
          avatarColor: getAvatarColor(kyc.name),
          activityIcon: 'badge',
          iconBgColor: 'bg-teal-500 text-white',
          referenceCode: `KYC-${kyc.id.substring(0, 6).toUpperCase()}`,
          priority: 'High',
          status: 'Pending',
          createdAt: kyc.kyc_submitted_at || new Date().toISOString(),
          timeAgo: formatRelativeTime(kyc.kyc_submitted_at),
          starred: isStarred,
          deepLinkUrl: '/admin/partners',
          metadata: {
            ...kyc
          },
          actions: {
            canApprove: true,
            canReject: true,
            canSendBack: true
          }
        });
      }
    });

    // 7. 📋 PRODUCTIVITY TASKS (Assigned & Urgent Playbooks)
    tasks.forEach(t => {
      if (t.status === 'Pending' || t.status === 'In Progress') {
        const isStarred = starredIds.includes(`task_${t.id}`);
        const assignedByName = resolveStaffDisplayName(t.assignedBy);
        const assignedToName = resolveStaffDisplayName(t.assignedTo);
        const initials = resolveStaffInitials(t.assignedBy);

        // Pick intuitive icon based on task title
        let taskIcon = 'checklist';
        const lowerTitle = t.title.toLowerCase();
        if (lowerTitle.includes('pick-up') || lowerTitle.includes('driver') || lowerTitle.includes('cab') || lowerTitle.includes('transport')) {
          taskIcon = 'local_taxi';
        } else if (lowerTitle.includes('hotel') || lowerTitle.includes('supplier') || lowerTitle.includes('room') || lowerTitle.includes('stay')) {
          taskIcon = 'hotel';
        } else if (lowerTitle.includes('proposal') || lowerTitle.includes('itinerary') || lowerTitle.includes('quote')) {
          taskIcon = 'description';
        } else if (lowerTitle.includes('flight') || lowerTitle.includes('train') || lowerTitle.includes('ticket')) {
          taskIcon = 'flight';
        }

        // Clean title (strip redundant "Task:" prefix if already present)
        const cleanTitle = t.title.replace(/^Task:\s*/i, '');

        // Dynamic cross-linking & target entity resolution
        let deepLinkUrl = '/admin/productivity';
        let linkedEntityDisplay = assignedToName || 'Staff Task';

        if (t.relatedBookingId) {
          deepLinkUrl = '/admin/bookings';
          const bk = bookings.find(b => b.id === t.relatedBookingId);
          if (bk) {
            linkedEntityDisplay = `${bk.customer} (${bk.invoiceNo || (bk.bookingNumber ? `BK-${String(bk.bookingNumber).padStart(4, '0')}` : bk.id.substring(0, 8))})`;
          }
        } else if (t.relatedLeadId) {
          deepLinkUrl = '/admin/leads';
          const ld = leads.find(l => l.id === t.relatedLeadId);
          if (ld) {
            linkedEntityDisplay = `${ld.name} (${ld.leadNumber ? `LD-${String(ld.leadNumber).padStart(4, '0')}` : ld.id.substring(0, 8)})`;
          }
        }

        items.push({
          id: `task_${t.id}`,
          originalId: t.id,
          category: 'tasks',
          categoryLabel: 'Tasks & Playbooks',
          type: 'Playbook Directive',
          title: cleanTitle,
          subtitle: t.description || 'Assigned operations task awaiting completion.',
          requesterName: assignedByName,
          requesterInitials: initials,
          avatarColor: 'bg-indigo-600',
          activityIcon: taskIcon,
          iconBgColor: 'bg-indigo-500 text-white',
          referenceCode: `TSK-${t.id.substring(0, 6)}`,
          priority: t.priority as InboxItemPriority,
          status: 'Pending',
          createdAt: t.createdAt || new Date().toISOString(),
          dueAt: t.dueDate,
          timeAgo: formatRelativeTime(t.createdAt),
          starred: isStarred,
          deepLinkUrl: deepLinkUrl,
          metadata: {
            ...t,
            cleanTitle,
            assignedByName,
            assignedToName: linkedEntityDisplay
          },
          actions: {
            canApprove: true,
            customActionLabel: 'Mark Completed'
          }
        });
      }
    });

    // Sort by priority first (Urgent > High > Medium > Low), then latest createdAt
    const priorityWeight: Record<InboxItemPriority, number> = {
      Urgent: 4,
      High: 3,
      Medium: 2,
      Low: 1
    };

    return items.sort((a, b) => {
      const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [transactions, transfers, leaves, regularizations, bookings, followUps, leads, partners, kycRecords, tasks, starredIds]);

  // Folder Counts
  const counts = useMemo(() => {
    const pendingItems = allItems.filter(i => i.status === 'Pending');
    return {
      inbox: pendingItems.length,
      starred: allItems.filter(i => i.starred).length,
      authorized: allItems.filter(i => i.status === 'Approved' || i.status === 'Completed').length,
      rejected: allItems.filter(i => i.status === 'Rejected').length,
      urgent: pendingItems.filter(i => i.priority === 'Urgent').length,
      byCategory: {
        finance: pendingItems.filter(i => i.category === 'finance').length,
        operations: pendingItems.filter(i => i.category === 'operations').length,
        crm: pendingItems.filter(i => i.category === 'crm').length,
        hr: pendingItems.filter(i => i.category === 'hr').length,
        tasks: pendingItems.filter(i => i.category === 'tasks').length,
        partner_kyc: pendingItems.filter(i => i.category === 'partner_kyc').length,
        transfer: pendingItems.filter(i => i.category === 'transfer').length,
      }
    };
  }, [allItems]);

  // Unified Action Handlers
  const handleApprove = async (item: UnifiedInboxItem, decisionNote?: string) => {
    const token = localStorage.getItem('shravya_jwt');
    const API_BASE = import.meta.env.VITE_API_URL || '';

    try {
      if (item.category === 'finance') {
        await updateTransactionStatus(item.originalId, 'Verified');
        toast.success(`Payment verified successfully!`);
      } else if (item.category === 'transfer') {
        await approveTransfer(item.originalId);
        toast.success(`Transfer request approved!`);
      } else if (item.category === 'hr' && item.type.includes('Leave')) {
        await api.updateStaffLeaveStatus(item.originalId, { status: 'Approved' });
        await refetchLeaves();
        toast.success(`Leave request approved!`);
      } else if (item.category === 'hr' && item.type.includes('Regularization')) {
        await api.updateRegularizationStatus(item.originalId, { status: 'Approved' });
        await refetchRegularizations();
        toast.success(`Attendance regularization approved!`);
      } else if (item.category === 'partner_kyc' && item.type.includes('KYC')) {
        const res = await fetch(`${API_BASE}/api/admin/partners/${item.originalId}/kyc`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: 'verify' })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to verify KYC');
        }
        await refetchKyc();
        toast.success(`Partner KYC verified!`);
      } else if (item.category === 'partner_kyc' && item.type.includes('Partner')) {
        const res = await fetch(`${API_BASE}/api/admin/partners/${item.originalId}/approve`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to activate partner');
        }
        await refetchPartners();
        toast.success(`Partner account activated!`);
      } else if (item.category === 'crm' && item.type.includes('Follow-up')) {
        updateFollowUp(item.originalId, { status: 'Done', completedAt: new Date().toISOString() });
        toast.success(`Follow-up marked as completed!`);
      } else if (item.category === 'tasks' || (item.category === 'hr' && item.type.includes('Task'))) {
        await updateTask(item.originalId, {
          status: 'Completed',
          completedAt: new Date().toISOString(),
          completedBy: currentUser?.name || 'Admin',
          completionNote: decisionNote
        });
        toast.success(`Task marked as completed!`);
      } else if (item.category === 'operations') {
        if (item.type.includes('Driver Allocation')) {
          const booking = bookings.find(b => b.id === item.originalId);
          if (booking) {
            const existingNotes = booking.notes || [];
            const updatedNotes = [...existingNotes, {
              id: `NOTE-OPS-${Date.now()}`,
              text: decisionNote ? `Driver & Tour Confirmed: ${decisionNote}` : `Driver Confirmed & Authorized via Inbox Hub`,
              date: new Date().toISOString(),
              author: currentUser?.name || 'Admin'
            }];
            await updateBooking(booking.id, { notes: updatedNotes });

            // Automatically complete matching pending checklist tasks on this booking
            const matchingTasks = tasks.filter(t => 
              t.relatedBookingId === booking.id && 
              t.status === 'Pending' && 
              (t.title.toLowerCase().includes('driver') || t.title.toLowerCase().includes('cab') || t.title.toLowerCase().includes('pick-up'))
            );
            for (const mt of matchingTasks) {
              await updateTask(mt.id, {
                status: 'Completed',
                completedAt: new Date().toISOString(),
                completedBy: currentUser?.name || 'Admin',
                completionNote: decisionNote || 'Driver allocated via Inbox Hub'
              });
            }
          }
        } else if (item.type.includes('Voucher Confirmation') || item.type.includes('Supplier')) {
          const sbId = item.originalId;
          if (sbId) {
            await api.updateSupplierBooking(sbId, {
              bookingStatus: 'Confirmed',
              notes: decisionNote || 'Voucher confirmed via Inbox & Approvals Hub'
            });
            window.dispatchEvent(new CustomEvent('supplier-bookings-changed', {
              detail: { supplierBookingId: sbId }
            }));
          }
        }
        toast.success(`Operations task updated!`);
      }

      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transfer-requests'] });
      queryClient.invalidateQueries({ queryKey: ['staff-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['staff-regularizations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-records'] });
      queryClient.invalidateQueries({ queryKey: ['admin-partners-list'] });
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
      throw err;
    }
  };

  const handleReject = async (item: UnifiedInboxItem, rejectionReason: string) => {
    if (!rejectionReason.trim()) {
      toast.error('A rejection reason or note is required.');
      return;
    }

    const token = localStorage.getItem('shravya_jwt');
    const API_BASE = import.meta.env.VITE_API_URL || '';

    try {
      if (item.category === 'finance') {
        await updateTransactionStatus(item.originalId, 'Rejected');
        toast.success(`Transaction rejected`);
      } else if (item.category === 'transfer') {
        await rejectTransfer(item.originalId, rejectionReason);
        toast.success(`Transfer request rejected`);
      } else if (item.category === 'hr' && item.type.includes('Leave')) {
        await api.updateStaffLeaveStatus(item.originalId, { status: 'Rejected', rejectionReason });
        await refetchLeaves();
        toast.success(`Leave request rejected`);
      } else if (item.category === 'hr' && item.type.includes('Regularization')) {
        await api.updateRegularizationStatus(item.originalId, { status: 'Rejected', rejectionReason });
        await refetchRegularizations();
        toast.success(`Attendance regularization rejected`);
      } else if (item.category === 'partner_kyc' && item.type.includes('KYC')) {
        const res = await fetch(`${API_BASE}/api/admin/partners/${item.originalId}/kyc`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: 'reject', reason: rejectionReason })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to reject KYC');
        }
        await refetchKyc();
        toast.success(`KYC submission rejected`);
      } else if (item.category === 'partner_kyc' && item.type.includes('Partner')) {
        const res = await fetch(`${API_BASE}/api/admin/partners/${item.originalId}/block`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to block partner');
        }
        await refetchPartners();
        toast.success(`Partner registration rejected`);
      } else if (item.category === 'tasks') {
        updateTask(item.originalId, { status: 'Pending', description: `${item.metadata.description || ''} [Rejected: ${rejectionReason}]` });
        toast.success(`Task rejected with feedback`);
      }

      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transfer-requests'] });
      queryClient.invalidateQueries({ queryKey: ['staff-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['staff-regularizations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-records'] });
      queryClient.invalidateQueries({ queryKey: ['admin-partners-list'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject request');
      throw err;
    }
  };

  const handleSendBack = async (item: UnifiedInboxItem, feedbackNote: string) => {
    if (!feedbackNote.trim()) {
      toast.error('Please enter feedback or clarifications needed.');
      return;
    }

    try {
      if (item.category === 'tasks') {
        updateTask(item.originalId, {
          status: 'In Progress',
          description: `${item.metadata.description || ''}\n[Feedback: ${feedbackNote}]`
        });
      } else if (item.category === 'hr' && item.type.includes('Leave')) {
        await api.updateStaffLeaveStatus(item.originalId, { status: 'Rejected', rejectionReason: `Sent back for revision: ${feedbackNote}` });
        await refetchLeaves();
      } else if (item.category === 'hr' && item.type.includes('Regularization')) {
        await api.updateRegularizationStatus(item.originalId, { status: 'Rejected', rejectionReason: `Sent back for revision: ${feedbackNote}` });
        await refetchRegularizations();
      }
      toast.success(`Feedback sent back to requester: "${feedbackNote.substring(0, 40)}..."`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send back feedback');
      throw err;
    }
  };

  return {
    allItems,
    counts,
    toggleStar,
    handleApprove,
    handleReject,
    handleSendBack,
    refetchAll: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transfer-requests'] });
      queryClient.invalidateQueries({ queryKey: ['staff-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['staff-regularizations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-records'] });
      queryClient.invalidateQueries({ queryKey: ['admin-partners-list'] });
    }
  };
};
