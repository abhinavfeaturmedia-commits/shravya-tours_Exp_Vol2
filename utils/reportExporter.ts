import * as XLSX from 'xlsx';
import { ReportEntityKey, ReportEntityMeta } from '../types';

export const REPORT_ENTITIES: ReportEntityMeta[] = [
  {
    key: 'bookings',
    label: 'Sales & Bookings',
    category: 'Sales & CRM',
    icon: 'airplane_ticket',
    color: 'blue',
    table: 'bookings',
    description: 'Trip reservations, itineraries, customer bookings, payment status & billing.',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
    badgeText: 'Sales Records'
  },
  {
    key: 'daily_inventory',
    label: 'Inventory Stock',
    category: 'Operations & Inventory',
    icon: 'calendar_month',
    color: 'amber',
    table: 'daily_inventory',
    description: 'Hotel room allotment schedule, booked capacity, rates & availability.',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
    badgeText: 'Inventory Stock'
  },
  {
    key: 'leads',
    label: 'CRM Leads & Pipeline',
    category: 'Sales & CRM',
    icon: 'groups',
    color: 'purple',
    table: 'leads',
    description: 'Inquiries funnel, lead status, potential value, destinations & assigned agents.',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
    badgeText: 'CRM Leads'
  },
  {
    key: 'customers',
    label: 'Customer Base',
    category: 'Sales & CRM',
    icon: 'face',
    color: 'emerald',
    table: 'customers',
    description: 'Traveler profiles, contact details, VIP tiers, preferences & lifetime spend.',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
    badgeText: 'Customer Base'
  },
  {
    key: 'expenses',
    label: 'Expenses Logged',
    category: 'Finance & Billing',
    icon: 'receipt_long',
    color: 'rose',
    table: 'expenses',
    description: 'Operational costs, vendor payouts, vouchers, rent & office expenditures.',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800',
    badgeText: 'Expenses Logged'
  },
  {
    key: 'invoices',
    label: 'Invoices & GST Billing',
    category: 'Finance & Billing',
    icon: 'receipt',
    color: 'indigo',
    table: 'invoices',
    description: 'GST tax invoices, place of supply, taxable amounts, CGST/SGST/IGST & dues.',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800',
    badgeText: 'Invoices Issued'
  },
  {
    key: 'vendors',
    label: 'Vendors & Suppliers',
    category: 'Operations & Inventory',
    icon: 'storefront',
    color: 'sky',
    table: 'vendors',
    description: 'Hotels, transporters, guides, suppliers directory, ratings & balance payable.',
    badgeBg: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800',
    badgeText: 'Vendors Active'
  },
  {
    key: 'car_bookings',
    label: 'Car Rentals & Fleet',
    category: 'Operations & Inventory',
    icon: 'directions_car',
    color: 'teal',
    table: 'car_bookings',
    description: 'Vehicle trips, driver assignments, route kilometers, fares & toll schedules.',
    badgeBg: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800',
    badgeText: 'Fleet Bookings'
  },
  {
    key: 'partners',
    label: 'B2B Partners Network',
    category: 'Sales & CRM',
    icon: 'handshake',
    color: 'fuchsia',
    table: 'partners',
    description: 'Affiliate agents, commission balances, referral leads & KYC records.',
    badgeBg: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-900/20 dark:text-fuchsia-400 dark:border-fuchsia-800',
    badgeText: 'Partner Network'
  },
  {
    key: 'staff_members',
    label: 'Staff & Team Roster',
    category: 'Team & System',
    icon: 'badge',
    color: 'cyan',
    table: 'staff_members',
    description: 'Employee profiles, designations, contact info, sales roles & system access.',
    badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800',
    badgeText: 'Staff Roster'
  },
  {
    key: 'packages',
    label: 'Tour Packages Catalog',
    category: 'Operations & Inventory',
    icon: 'inventory_2',
    color: 'orange',
    table: 'packages',
    description: 'Public holiday packages, itineraries, duration, inclusions & price catalogs.',
    badgeBg: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
    badgeText: 'Tour Catalog'
  },
  {
    key: 'audit_logs',
    label: 'Audit & Security Trail',
    category: 'Team & System',
    icon: 'history',
    color: 'slate',
    table: 'audit_logs',
    description: 'System actions, data modifications, login events & compliance logs.',
    badgeBg: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    badgeText: 'Audit Trail'
  }
];

export type PresetKey = 'today' | 'this_month' | 'last_30_days' | 'this_year' | 'all_time';

export function getPresetDates(preset: PresetKey): { startDate: string; endDate: string } {
  const now = new Date();
  const formatYMD = (d: Date) => d.toISOString().split('T')[0];

  switch (preset) {
    case 'today': {
      const todayStr = formatYMD(now);
      return { startDate: todayStr, endDate: todayStr };
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: formatYMD(start), endDate: formatYMD(now) };
    }
    case 'last_30_days': {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      return { startDate: formatYMD(start), endDate: formatYMD(now) };
    }
    case 'this_year': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { startDate: formatYMD(start), endDate: formatYMD(now) };
    }
    case 'all_time':
    default:
      return { startDate: '', endDate: '' };
  }
}

// ─── Normalizers for each entity type ───

export function normalizeEntityData(entity: ReportEntityKey, rawRows: any[]): { headers: string[]; rows: (string | number)[][] } {
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    return { headers: ['No Data Available'], rows: [] };
  }

  switch (entity) {
    case 'bookings': {
      const headers = [
        'Booking ID', 'Invoice No', 'Type', 'Customer Name', 'Customer Email', 'Customer Phone',
        'Package / Tour Title', 'Travel Start Date', 'End Date', 'Duration (Days)', 'Guests / Pax',
        'Total Amount (INR)', 'Original Price', 'Coupon Code', 'Discount (INR)', 'Payment Status',
        'Booking Status', 'Assigned Agent ID', 'Partner Name', 'Created At'
      ];
      const rows = rawRows.map(r => [
        r.bookingNumber ? `BK-${String(r.bookingNumber).padStart(4, '0')}` : (r.id || ''),
        r.invoiceNo || '',
        r.type || 'Tour',
        r.customer || r.customer_name || '',
        r.email || r.customer_email || '',
        r.phone || r.customer_phone || '',
        r.title || '',
        r.date ? r.date.split('T')[0] : '',
        r.endDate ? r.endDate.split('T')[0] : '',
        r.durationDays || '',
        r.guests || (r.paxCount ? `${r.paxCount} Pax` : ''),
        Number(r.amount || 0),
        Number(r.originalPrice || r.amount || 0),
        r.appliedCouponCode || '',
        Number(r.couponDiscountAmount || 0),
        r.payment || 'Unpaid',
        r.status || 'Pending',
        r.assignedTo || '',
        r.partnerName || r.partnerCompanyName || '',
        r.created_at ? new Date(r.created_at).toLocaleString('en-IN') : ''
      ]);
      return { headers, rows };
    }

    case 'leads': {
      const headers = [
        'Lead ID', 'Lead Name', 'Email', 'Phone', 'WhatsApp', 'Destination', 'Service Type',
        'Travelers', 'Budget', 'Status', 'Priority', 'Potential Value (INR)', 'Lead Source',
        'Assigned Agent ID', 'AI Score', 'Added Date'
      ];
      const rows = rawRows.map(r => [
        r.leadNumber ? `LD-${String(r.leadNumber).padStart(4, '0')}` : (r.id || ''),
        r.name || '',
        r.email || '',
        r.phone || '',
        r.whatsapp || r.phone || '',
        r.destination || '',
        r.serviceType || 'Holiday Tour',
        r.travelers || (r.paxAdult ? `${r.paxAdult} Adults` : ''),
        r.budget || '',
        r.status || 'New',
        r.priority || 'Medium',
        Number(r.potentialValue || 0),
        r.source || 'Website',
        r.assignedTo || '',
        r.aiScore ? `${r.aiScore}%` : 'N/A',
        r.addedOn || (r.created_at ? r.created_at.split('T')[0] : '')
      ]);
      return { headers, rows };
    }

    case 'customers': {
      const headers = [
        'Customer ID', 'Full Name', 'Email', 'Phone', 'City / Location', 'Customer Type',
        'Status', 'Total Bookings', 'Total Spent (INR)', 'Joined Date', 'Tags'
      ];
      const rows = rawRows.map(r => [
        r.id || '',
        r.name || '',
        r.email || '',
        r.phone || '',
        r.location || '',
        r.type || 'Regular',
        r.status || 'Active',
        Number(r.bookingsCount || r.totalBookings || 0),
        Number(r.totalSpent || 0),
        r.joinedDate || (r.created_at ? r.created_at.split('T')[0] : ''),
        Array.isArray(r.tags) ? r.tags.join(', ') : (r.tags || '')
      ]);
      return { headers, rows };
    }

    case 'expenses': {
      const headers = [
        'Expense ID', 'Title / Description', 'Category', 'Amount (INR)', 'Expense Date',
        'Payment Mode', 'Status', 'Notes', 'Logged By', 'Created At'
      ];
      const rows = rawRows.map(r => [
        r.id || '',
        r.title || '',
        r.category || 'Other',
        Number(r.amount || 0),
        r.date ? r.date.split('T')[0] : '',
        r.paymentMethod || 'UPI',
        r.status || 'Pending',
        r.notes || '',
        r.created_by || 'Admin',
        r.created_at ? new Date(r.created_at).toLocaleString('en-IN') : ''
      ]);
      return { headers, rows };
    }

    case 'invoices': {
      const headers = [
        'Invoice No', 'Financial Year', 'Invoice Date', 'Due Date', 'Customer Name',
        'Client GSTIN', 'Place of Supply', 'Taxable Amount (INR)', 'Total Tax (INR)',
        'Grand Total (INR)', 'Status', 'Reverse Charge'
      ];
      const rows = rawRows.map(r => [
        r.invoice_no || r.id || '',
        r.financial_year || '',
        r.invoice_date ? r.invoice_date.split('T')[0] : '',
        r.due_date ? r.due_date.split('T')[0] : '',
        r.customer_name || '',
        r.client_gst || 'N/A',
        r.place_of_supply || 'Maharashtra',
        Number(r.taxable_amount || r.subtotal || 0),
        Number(r.tax_amount || 0),
        Number(r.total_amount || r.grand_total || 0),
        r.status || 'Pending',
        r.reverse_charge || 'No'
      ]);
      return { headers, rows };
    }

    case 'daily_inventory': {
      const headers = [
        'Inventory ID', 'Date', 'Asset / Departure Title', 'Service Type',
        'Capacity (Pax)', 'Active Bookings', 'Pax Booked', 'Available Remaining',
        'Allocated Revenue (INR)', 'Blocked Status', 'Operational Status', 'Notes'
      ];
      const rows = rawRows.map(r => [
        r.id || '',
        r.date ? String(r.date).split('T')[0] : '',
        r.assetId || r.hotel_name || r.hotelName || r.name || 'All Departures',
        r.assetType || r.room_type || r.category || 'Tour Package',
        Number(r.capacity || r.allotted || r.total || 50),
        Number(r.booked || 0),
        Number(r.paxBooked || r.bookedPax || r.booked || 0),
        Number(r.remaining !== undefined ? r.remaining : Math.max(0, Number(r.capacity || r.allotted || 50) - Number(r.paxBooked || r.booked || 0))),
        Number(r.revenue || r.price || r.rate || 0),
        r.isBlocked ? 'Blocked' : 'Unblocked',
        r.status || (r.isBlocked ? 'Blocked' : 'Available'),
        r.notes || ''
      ]);
      return { headers, rows };
    }

    case 'vendors': {
      const headers = [
        'Vendor ID', 'Business Name', 'Category', 'City', 'Contact Person', 'Phone',
        'Email', 'Rating', 'Total Bookings', 'Total Paid (INR)', 'Outstanding Balance (INR)',
        'Bank Account No', 'IFSC Code', 'GSTIN', 'Status'
      ];
      const rows = rawRows.map(r => [
        r.id || '',
        r.name || '',
        r.category || 'Hotel',
        r.city || r.location || '',
        r.contactPerson || '',
        r.phone || '',
        r.email || '',
        r.rating ? `${r.rating}★` : 'N/A',
        Number(r.totalBookings || 0),
        Number(r.totalPaid || 0),
        Number(r.outstandingBalance || r.balance || 0),
        r.bankDetails?.accountNumber || r.account_number || '',
        r.bankDetails?.ifsc || r.ifsc_code || '',
        r.gstNumber || r.gst || '',
        r.status || 'Active'
      ]);
      return { headers, rows };
    }

    case 'car_bookings': {
      const headers = [
        'Rental ID', 'Customer Name', 'Customer Mobile', 'Customer Email', 'Pickup Location',
        'Drop Location', 'Pickup Date', 'Trip Days', 'Vehicle Assigned', 'Driver Assigned',
        'Driver Mobile', 'Total Fare (INR)', 'Advance Paid (INR)', 'Trip Status'
      ];
      const rows = rawRows.map(r => [
        r.id || '',
        r.customer_name || '',
        r.customer_mobile || '',
        r.customer_email || '',
        r.pickup_location || '',
        r.drop_location || '',
        r.pickup_date ? r.pickup_date.split('T')[0] : '',
        Number(r.days || 1),
        r.assigned_vehicle_name || r.vehicle_number || 'Sedan',
        r.assigned_driver_name || 'Driver',
        r.assigned_driver_mobile || '',
        Number(r.total_amount || 0),
        Number(r.advance_amount || 0),
        r.status || 'Scheduled'
      ]);
      return { headers, rows };
    }

    case 'partners': {
      const headers = [
        'Partner ID', 'Agent Name', 'Agency / Company', 'Email', 'Phone', 'City',
        'Tier Level', 'Commission Rate (%)', 'Total Leads', 'Total Bookings',
        'Total Commission Earned (INR)', 'Commission Paid (INR)', 'KYC Status', 'Status'
      ];
      const rows = rawRows.map(r => [
        r.id || '',
        r.name || '',
        r.company_name || r.companyName || '',
        r.email || '',
        r.phone || '',
        r.city || '',
        r.tier || 'Silver',
        r.commission_rate ? `${r.commission_rate}%` : '5%',
        Number(r.total_leads || 0),
        Number(r.total_bookings || 0),
        Number(r.commission_earned || 0),
        Number(r.commission_paid || 0),
        r.kyc_status || 'Pending',
        r.status || 'Active'
      ]);
      return { headers, rows };
    }

    case 'staff_members': {
      const headers = [
        'Staff ID', 'Full Name', 'Email', 'Phone', 'Designation / Role', 'Department',
        'Attendance Today', 'Check-In Time', 'Check-Out Time', 'Query Scope', 'Status'
      ];
      const rows = rawRows.map(r => [
        r.id || '',
        r.name || '',
        r.email || '',
        r.phone || '',
        r.role || r.designation || 'Sales Agent',
        r.department || 'Sales',
        r.attendance_status || 'Present',
        r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString('en-IN') : '',
        r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString('en-IN') : '',
        r.query_scope || 'Show Assigned Query Only',
        r.status || 'Active'
      ]);
      return { headers, rows };
    }

    case 'packages': {
      const headers = [
        'Package ID', 'Tour Title', 'Destination / Region', 'Duration (Days)', 'Group Size',
        'Regular Price (INR)', 'Offer Price (INR)', 'Pricing Mode', 'Theme', 'Status'
      ];
      const rows = rawRows.map(r => [
        r.id || '',
        r.title || '',
        r.location || '',
        Number(r.days || 1),
        r.groupSize || '2-6 Pax',
        Number(r.originalPrice || r.price || 0),
        Number(r.price || 0),
        r.pricingMode || 'per_person',
        r.theme || 'Holiday',
        r.status || 'Active'
      ]);
      return { headers, rows };
    }

    case 'audit_logs': {
      const headers = [
        'Log ID', 'Action Executed', 'Module', 'Performed By', 'Severity',
        'Details', 'Timestamp'
      ];
      const rows = rawRows.map(r => [
        r.id || '',
        r.action || '',
        r.module || 'System',
        r.performedBy || 'Admin',
        r.severity || 'Info',
        r.details || '',
        r.timestamp ? new Date(r.timestamp).toLocaleString('en-IN') : (r.created_at || '')
      ]);
      return { headers, rows };
    }

    default: {
      const firstRow = rawRows[0];
      const headers = Object.keys(firstRow);
      const rows = rawRows.map(r => headers.map(h => typeof r[h] === 'object' ? JSON.stringify(r[h]) : (r[h] ?? '')));
      return { headers, rows };
    }
  }
}

// ─── Export Generators ───

/**
 * Generates an RFC-4180 compliant CSV string with UTF-8 Byte Order Mark (BOM)
 * Ensures Excel correctly displays currency symbols (₹) and non-ASCII characters without mojibake.
 */
export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]): number {
  const escapeCell = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const csvHeader = headers.map(escapeCell).join(',');
  const csvRows = rows.map(r => r.map(escapeCell).join(','));
  const csvContent = '\uFEFF' + [csvHeader, ...csvRows].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const sizeKb = Number((blob.size / 1024).toFixed(2));

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return sizeKb;
}

/**
 * Generates an Excel Workbook (.xlsx) with auto-formatted column widths and header styling.
 */
export function exportToXLSX(filename: string, sheetName: string, headers: string[], rows: (string | number)[][]): number {
  const data = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Auto-fit column widths
  const colWidths = headers.map((h, i) => {
    let maxLen = h.length;
    for (let r = 0; r < Math.min(rows.length, 100); r++) {
      const cellVal = rows[r][i];
      if (cellVal !== undefined && cellVal !== null) {
        maxLen = Math.max(maxLen, String(cellVal).length);
      }
    }
    return { wch: Math.min(Math.max(maxLen + 4, 12), 45) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const sizeKb = Number((blob.size / 1024).toFixed(2));

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return sizeKb;
}

/**
 * Generates a formatted JSON file download.
 */
export function exportToJSON(filename: string, data: any): number {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const sizeKb = Number((blob.size / 1024).toFixed(2));

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.json') ? filename : `${filename}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return sizeKb;
}
