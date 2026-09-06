// src/config/permissionsConfig.ts
// Central Role & Feature-Based Access Control (RBAC/RFAC) Registry for Shrawello Travel Hub

export type DataScopeLevel = 'assigned' | 'department' | 'all';
export type FeatureRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface SubFeatureDefinition {
  key: string;
  name: string;
  description: string;
  risk: FeatureRiskLevel;
  defaultStaff: boolean;
  defaultAdmin: boolean;
}

export interface ModuleDefinition {
  key: string;
  name: string;
  category: 'overview' | 'crm' | 'operations' | 'finance' | 'system';
  path: string;
  icon: string;
  description: string;
  hasScope?: boolean;
  defaultScope?: DataScopeLevel;
  subFeatures: SubFeatureDefinition[];
}

export interface CategoryDefinition {
  key: 'overview' | 'crm' | 'operations' | 'finance' | 'system';
  name: string;
  icon: string;
  description: string;
}

export const PERMISSION_CATEGORIES: CategoryDefinition[] = [
  { key: 'overview', name: 'Overview & Governance', icon: 'dashboard', description: 'Core analytics, approvals, presence, and executive KPIs' },
  { key: 'crm', name: 'CRM & Growth', icon: 'rocket_launch', description: 'Leads, inquiries, customers, loyalty, partners, and campaigns' },
  { key: 'operations', name: 'Operations & Fleet', icon: 'grid_view', description: 'Trip execution, bookings, hotels, transport, vendors, and catalogs' },
  { key: 'finance', name: 'Finance & Billing', icon: 'account_balance_wallet', description: 'Bank accounts, expenses, invoices, approvals, and client quotations' },
  { key: 'system', name: 'Team & System', icon: 'tune', description: 'Staff, attendance, performance, CMS, onboarding, security, and settings' },
];

export const ALL_MODULE_DEFINITIONS: ModuleDefinition[] = [
  // ─── 1. OVERVIEW & GOVERNANCE ───
  {
    key: 'dashboard',
    name: 'Dashboard Overview',
    category: 'overview',
    path: '/admin',
    icon: 'dashboard',
    description: 'Real-time metrics, revenue KPIs, quick booking & lead operations',
    hasScope: true,
    defaultScope: 'all',
    subFeatures: [
      { key: 'view_revenue_kpis', name: 'View Revenue & Profit KPIs', description: 'Show total revenue, profit margins, and financial summary cards', risk: 'high', defaultStaff: false, defaultAdmin: true },
      { key: 'view_team_feed', name: 'View Team Activity Stream', description: 'See live system updates and staff activity stream', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'access_quick_actions', name: 'Access Quick Action Buttons', description: 'Use quick shortcuts to add leads, bookings, or tasks', risk: 'low', defaultStaff: true, defaultAdmin: true },
    ]
  },
  {
    key: 'inbox',
    name: 'Inbox & Approvals Hub',
    category: 'overview',
    path: '/admin/inbox',
    icon: 'all_inbox',
    description: 'Central governance queue: Bank payments, staff leaves, ops handoffs, and KYC verification',
    hasScope: true,
    defaultScope: 'department',
    subFeatures: [
      { key: 'approve_payments', name: 'Approve Payment Transactions', description: 'Authorize or reject customer payment receipts & bank transfers', risk: 'critical', defaultStaff: false, defaultAdmin: true },
      { key: 'approve_leaves', name: 'Approve Staff Leaves & Regularization', description: 'Authorize or reject employee leave and attendance requests', risk: 'high', defaultStaff: false, defaultAdmin: true },
      { key: 'approve_ops_cabs', name: 'Approve Ops & Assign Cabs', description: 'Assign drivers/cabs and authorize live operations handoffs', risk: 'medium', defaultStaff: true, defaultAdmin: true },
      { key: 'approve_kyc', name: 'Approve Partner & Driver KYC', description: 'Verify legal KYC identification and partner documentation', risk: 'high', defaultStaff: false, defaultAdmin: true },
      { key: 'batch_approve', name: 'Batch / Bulk Approvals', description: 'Perform bulk approve or reject actions on multiple items at once', risk: 'high', defaultStaff: false, defaultAdmin: true },
    ]
  },
  {
    key: 'attendance',
    name: 'Staff Attendance & Roster',
    category: 'overview',
    path: '/admin/attendance',
    icon: 'fingerprint',
    description: 'Live presence, biometric/web punches, shift schedule, and leave approvals',
    hasScope: true,
    defaultScope: 'assigned',
    subFeatures: [
      { key: 'punch_attendance', name: 'Punch Web Check-In / Out', description: 'Record own daily check-in, check-out, and duty status', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'view_all_staff', name: 'View All Staff Attendance', description: 'See live presence and attendance history of all employees', risk: 'medium', defaultStaff: false, defaultAdmin: true },
      { key: 'manage_roster', name: 'Manage Shifts & Weekly Offs', description: 'Configure staff shifts, work timings, and team roster', risk: 'high', defaultStaff: false, defaultAdmin: true },
      { key: 'approve_regularization', name: 'Approve Attendance Regularization', description: 'Approve or reject attendance dispute & missed punch requests', risk: 'high', defaultStaff: false, defaultAdmin: true },
      { key: 'export_attendance', name: 'Export Monthly Attendance to Excel', description: 'Download monthly payroll attendance reports', risk: 'medium', defaultStaff: false, defaultAdmin: true },
    ]
  },
  {
    key: 'analytics',
    name: 'Analytics & Insights',
    category: 'overview',
    path: '/admin/analytics',
    icon: 'bar_chart',
    description: 'Revenue breakdown, sales pipeline velocity, agent rankings, and conversion insights',
    hasScope: true,
    defaultScope: 'department',
    subFeatures: [
      { key: 'view_revenue_profit', name: 'View Revenue & Profit Margins', description: 'Access monthly financial breakdown, margins, and P&L charts', risk: 'critical', defaultStaff: false, defaultAdmin: true },
      { key: 'view_sales_funnel', name: 'View Sales Funnel & Lead Sources', description: 'Analyze lead conversion rates and lost deal insights', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'view_leaderboard', name: 'View Agent Performance Leaderboard', description: 'See revenue and deal rankings across all sales representatives', risk: 'medium', defaultStaff: true, defaultAdmin: true },
      { key: 'export_charts', name: 'Export Analytics Reports', description: 'Download analytics summaries and visual charts', risk: 'medium', defaultStaff: false, defaultAdmin: true },
    ]
  },
  {
    key: 'reports',
    name: 'Reports Extractor',
    category: 'overview',
    path: '/admin/reports',
    icon: 'file_download',
    description: 'Custom data extractor, aggregated CSV/Excel reports, and operational history',
    hasScope: true,
    defaultScope: 'department',
    subFeatures: [
      { key: 'run_standard_reports', name: 'Run Standard On-Screen Reports', description: 'Generate filtered reports for leads, bookings, and operations', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'export_raw_excel', name: 'Export Full Raw CSV/Excel Data', description: 'Download complete database dumps (Sensitive data leakage risk)', risk: 'critical', defaultStaff: false, defaultAdmin: true },
      { key: 'custom_date_ranges', name: 'Access Historical Multi-Year Data', description: 'Query archives beyond the current operational quarter', risk: 'medium', defaultStaff: false, defaultAdmin: true },
    ]
  },

  // ─── 2. CRM & GROWTH ───
  {
    key: 'leads',
    name: 'Leads CRM',
    category: 'crm',
    path: '/admin/leads',
    icon: 'groups',
    description: 'Inquiries, sales pipeline stages, follow-up reminders, and communication history',
    hasScope: true,
    defaultScope: 'assigned',
    subFeatures: [
      { key: 'add_lead', name: 'Create / Add New Lead', description: 'Add new client inquiries and lead records', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'edit_lead', name: 'Edit Lead Details & Requirements', description: 'Update budget, dates, traveler notes, and preferences', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'delete_lead', name: 'Permanently Delete Lead', description: 'Hard delete lead records from the CRM', risk: 'critical', defaultStaff: false, defaultAdmin: true },
      { key: 'change_status', name: 'Update Pipeline Stage', description: 'Move leads between New, Contacted, Quoted, Won, or Lost', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'reassign_staff', name: 'Reassign Lead to Another Staff', description: 'Transfer lead ownership to a different team member', risk: 'high', defaultStaff: false, defaultAdmin: true },
      { key: 'mask_contacts', name: 'Mask Client Contact Numbers', description: 'Hide phone & email (+91 98*** **210) to prevent lead poaching', risk: 'high', defaultStaff: true, defaultAdmin: false },
      { key: 'export_leads', name: 'Export Leads to CSV / Excel', description: 'Download client database and lead records', risk: 'critical', defaultStaff: false, defaultAdmin: true },
      { key: 'send_communication', name: 'Direct WhatsApp & Email Messaging', description: 'Send templates and direct messages from CRM', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'convert_to_booking', name: 'Convert Lead to Booking', description: 'Turn inquiry into confirmed booking reservation', risk: 'medium', defaultStaff: true, defaultAdmin: true },
    ]
  },
  {
    key: 'customers',
    name: 'Customer Profiles',
    category: 'crm',
    path: '/admin/customers',
    icon: 'face',
    description: 'Traveler profiles, passports, travel history, preferences, and loyalty details',
    hasScope: true,
    defaultScope: 'department',
    subFeatures: [
      { key: 'add_customer', name: 'Add New Customer Profile', description: 'Create new traveler profile and contact details', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'edit_customer', name: 'Edit Customer Information', description: 'Update customer address, family details, and preferences', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'delete_customer', name: 'Delete Customer Record', description: 'Remove customer profile permanently', risk: 'critical', defaultStaff: false, defaultAdmin: true },
      { key: 'view_id_docs', name: 'View Passports & ID Documents', description: 'View and download sensitive passenger documents', risk: 'high', defaultStaff: false, defaultAdmin: true },
      { key: 'export_customers', name: 'Export Customer Directory', description: 'Download customer database to Excel', risk: 'critical', defaultStaff: false, defaultAdmin: true },
    ]
  },
  {
    key: 'memberships',
    name: 'VIP Memberships',
    category: 'crm',
    path: '/admin/memberships',
    icon: 'card_membership',
    description: 'Customer loyalty tiers, VIP membership privileges, and discount tiers',
    hasScope: false,
    defaultScope: 'all',
    subFeatures: [
      { key: 'assign_vip_tier', name: 'Assign / Upgrade Customer Tier', description: 'Enroll customer into Gold/Platinum/Diamond VIP tier', risk: 'medium', defaultStaff: true, defaultAdmin: true },
      { key: 'manage_membership_plans', name: 'Create & Edit Membership Plans', description: 'Configure membership pricing, perks, and point rules', risk: 'high', defaultStaff: false, defaultAdmin: true },
      { key: 'cancel_membership', name: 'Cancel or Revoke Membership', description: 'Deactivate customer VIP membership status', risk: 'high', defaultStaff: false, defaultAdmin: true },
    ]
  },
  {
    key: 'support_inbox',
    name: 'Support Inbox & Tickets',
    category: 'crm',
    path: '/admin/support-inbox',
    icon: 'forum',
    description: 'Customer support inquiries, complaint resolution, and messaging tickets',
    hasScope: true,
    defaultScope: 'assigned',
    subFeatures: [
      { key: 'reply_ticket', name: 'Reply & Resolve Tickets', description: 'Send official customer responses and internal notes', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'reassign_ticket', name: 'Reassign Ticket Department', description: 'Escalate or transfer ticket to another executive', risk: 'medium', defaultStaff: true, defaultAdmin: true },
      { key: 'close_ticket', name: 'Close & Archive Tickets', description: 'Mark ticket status as Closed/Resolved', risk: 'low', defaultStaff: true, defaultAdmin: true },
    ]
  },
  {
    key: 'partners',
    name: 'Associates & B2B Partners',
    category: 'crm',
    path: '/admin/partners',
    icon: 'handshake',
    description: 'B2B agent network, travel affiliate directory, and commission structures',
    hasScope: false,
    defaultScope: 'all',
    subFeatures: [
      { key: 'add_partner', name: 'Onboard New B2B Partner', description: 'Register new partner agency profile and contracts', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'approve_partner', name: 'Approve & Activate Partner', description: 'Authorize partner login access and credit limits', risk: 'high', defaultStaff: false, defaultAdmin: true },
      { key: 'edit_commissions', name: 'Edit Commission Rates', description: 'Set custom commission percentage and markup tiers', risk: 'high', defaultStaff: false, defaultAdmin: true },
      { key: 'settle_payouts', name: 'Authorize Commission Payouts', description: 'Release referral payouts and commission settlements', risk: 'critical', defaultStaff: false, defaultAdmin: true },
    ]
  },
  {
    key: 'kyc',
    name: 'KYC Document Verification',
    category: 'crm',
    path: '/admin/kyc',
    icon: 'verified_user',
    description: 'Document verification for partners, drivers, and corporate customers',
    hasScope: false,
    defaultScope: 'all',
    subFeatures: [
      { key: 'verify_kyc_docs', name: 'Verify & Approve KYC', description: 'Inspect Aadhaar, PAN, GST, or Driving License and mark Verified', risk: 'high', defaultStaff: false, defaultAdmin: true },
      { key: 'reject_kyc_docs', name: 'Reject KYC with Remarks', description: 'Reject invalid documentation and request re-submission', risk: 'medium', defaultStaff: false, defaultAdmin: true },
    ]
  },
  {
    key: 'coupons',
    name: 'Coupons & Vouchers',
    category: 'crm',
    path: '/admin/coupons',
    icon: 'local_offer',
    description: 'Promotional discount vouchers, promo codes, and referral codes',
    hasScope: false,
    defaultScope: 'all',
    subFeatures: [
      { key: 'create_coupon', name: 'Create Discount Promo Codes', description: 'Create percentage or flat discount coupon codes', risk: 'medium', defaultStaff: false, defaultAdmin: true },
      { key: 'edit_coupon', name: 'Edit Dates & Max Discount Limits', description: 'Modify valid date range, min spend, and max discount', risk: 'medium', defaultStaff: false, defaultAdmin: true },
      { key: 'delete_coupon', name: 'Deactivate / Delete Coupons', description: 'Disable or remove promo coupons from checkout', risk: 'medium', defaultStaff: false, defaultAdmin: true },
    ]
  },
  {
    key: 'marketing_logs',
    name: 'Marketing Logs & Campaigns',
    category: 'crm',
    path: '/admin/marketing-logs',
    icon: 'campaign',
    description: 'Promotional broadcasts, WhatsApp blasts, and marketing logs',
    hasScope: false,
    defaultScope: 'all',
    subFeatures: [
      { key: 'create_campaign', name: 'Draft Broadcast Campaign', description: 'Design email or WhatsApp broadcast messages', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'execute_broadcast', name: 'Trigger Mass Broadcast Blast', description: 'Send mass marketing messages to client database', risk: 'high', defaultStaff: false, defaultAdmin: true },
      { key: 'view_reactions', name: 'View Analytics & Open Rates', description: 'Inspect campaign click rates and client responses', risk: 'low', defaultStaff: true, defaultAdmin: true },
    ]
  },

  // ─── 3. OPERATIONS & FLEET ───
  {
    key: 'bookings',
    name: 'Bookings Management',
    category: 'operations',
    path: '/admin/bookings',
    icon: 'airplane_ticket',
    description: 'Customer reservations, ticketing, supplier bookings, and passenger manifests',
    hasScope: true,
    defaultScope: 'assigned',
    subFeatures: [
      { key: 'create_booking', name: 'Create New Booking', description: 'Create confirmed booking reservation and invoice shell', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'edit_booking', name: 'Edit Booking & Passenger List', description: 'Update traveler details, dates, and package components', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'cancel_booking', name: 'Cancel Booking', description: 'Cancel trip booking and trigger cancellation policy', risk: 'high', defaultStaff: false, defaultAdmin: true },
      { key: 'delete_booking', name: 'Permanently Delete Booking', description: 'Hard delete booking record from system', risk: 'critical', defaultStaff: false, defaultAdmin: true },
      { key: 'view_cost_margins', name: 'View Buying Cost & Profit Margins', description: 'See supplier purchase prices, gross profit, and agency margin', risk: 'critical', defaultStaff: false, defaultAdmin: true },
      { key: 'manage_payments', name: 'Record Client Payments', description: 'Add payment installments, receipts, and refund entries', risk: 'high', defaultStaff: true, defaultAdmin: true },
      { key: 'issue_vouchers', name: 'Issue & Email Vouchers', description: 'Generate official hotel, transport, and flight vouchers', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'manage_suppliers', name: 'Book & Confirm Suppliers', description: 'Manage hotel room confirmations, flights, and guide bookings', risk: 'medium', defaultStaff: true, defaultAdmin: true },
      { key: 'assign_driver_cab', name: 'Assign Cab & Driver Details', description: 'Allocate driver contact and vehicle registration number', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'export_bookings', name: 'Export Bookings to Excel', description: 'Download passenger manifests and financial booking summaries', risk: 'critical', defaultStaff: false, defaultAdmin: true },
    ]
  },
  {
    key: 'inventory',
    name: 'Inventory Allotments',
    category: 'operations',
    path: '/admin/inventory',
    icon: 'calendar_month',
    description: 'Hotel room blocks, vehicle availability calendar, and season allotment schedules',
    hasScope: false,
    defaultScope: 'all',
    subFeatures: [
      { key: 'block_rooms', name: 'Block / Reserve Inventory', description: 'Lock room or vehicle inventory for group tours', risk: 'medium', defaultStaff: true, defaultAdmin: true },
      { key: 'update_rates', name: 'Update Dynamic Seasonal Rates', description: 'Adjust peak season pricing and blackout dates', risk: 'high', defaultStaff: false, defaultAdmin: true },
      { key: 'manage_allotments', name: 'Release / Cancel Inventory Blocks', description: 'Free up unsold rooms back to supplier pool', risk: 'medium', defaultStaff: true, defaultAdmin: true },
    ]
  },
  {
    key: 'vendors',
    name: 'Vendors & Suppliers',
    category: 'operations',
    path: '/admin/vendors',
    icon: 'storefront',
    description: 'Hotel contracts, transport fleet owners, activity operators, and payables',
    hasScope: false,
    defaultScope: 'all',
    subFeatures: [
      { key: 'add_vendor', name: 'Onboard New Supplier', description: 'Add hotel property, fleet operator, or local guide profile', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'edit_vendor', name: 'Edit Vendor Contracts & Rates', description: 'Modify contracted B2B net rates and payment terms', risk: 'medium', defaultStaff: false, defaultAdmin: true },
      { key: 'view_ledger', name: 'View Outstanding Payable Ledger', description: 'Inspect vendor balance sheets and payment history', risk: 'high', defaultStaff: false, defaultAdmin: true },
      { key: 'record_payout', name: 'Record Vendor Payout', description: 'Submit record of payment made to supplier', risk: 'high', defaultStaff: false, defaultAdmin: true },
      { key: 'delete_vendor', name: 'Delete Vendor Profile', description: 'Permanently remove vendor record', risk: 'critical', defaultStaff: false, defaultAdmin: true },
    ]
  },
  {
    key: 'itinerary',
    name: 'Itinerary Builder',
    category: 'operations',
    path: '/admin/itinerary-builder',
    icon: 'map',
    description: 'Interactive day-by-day tour planner, attraction schedule, and quote generator',
    hasScope: true,
    defaultScope: 'department',
    subFeatures: [
      { key: 'create_itinerary', name: 'Build New Custom Itinerary', description: 'Design day-by-day plan with activities and routes', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'edit_itinerary', name: 'Edit Existing Itineraries', description: 'Modify days, route timeline, and hotel allocations', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'export_pdf', name: 'Export Branded PDF & Share Link', description: 'Generate client PDF proposal or web interactive link', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'clone_itinerary', name: 'Clone Master Templates', description: 'Duplicate pre-made master itinerary templates', risk: 'low', defaultStaff: true, defaultAdmin: true },
    ]
  },
  {
    key: 'operations',
    name: 'Live Operations',
    category: 'operations',
    path: '/admin/operations',
    icon: 'traffic',
    description: 'Real-time daily execution: Driver tracking, airport pickups, and deliverable status',
    hasScope: true,
    defaultScope: 'department',
    subFeatures: [
      { key: 'mark_deliverable', name: 'Check-off Daily Deliverables', description: 'Mark airport pickup, hotel check-in, or tour as completed', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'assign_cab_driver', name: 'Reassign Driver / Cab in Real-time', description: 'Update vehicle or driver contact on live ongoing trips', risk: 'medium', defaultStaff: true, defaultAdmin: true },
      { key: 'raise_escalation', name: 'Raise Emergency Trip Escalation', description: 'Flag delayed flights, car breakdowns, or client complaints', risk: 'low', defaultStaff: true, defaultAdmin: true },
    ]
  },
  {
    key: 'car_rental',
    name: 'Car Rentals & Fleet',
    category: 'operations',
    path: '/admin/car-rental',
    icon: 'directions_car',
    description: 'Vehicle fleet management, driver rosters, daily tariffs, and rental bookings',
    hasScope: false,
    defaultScope: 'all',
    subFeatures: [
      { key: 'add_vehicle', name: 'Add / Edit Fleet Vehicles', description: 'Add cars, registration numbers, RC, and insurance details', risk: 'medium', defaultStaff: false, defaultAdmin: true },
      { key: 'add_driver', name: 'Register Drivers & Licenses', description: 'Add driver profiles, phone numbers, and badges', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'create_car_booking', name: 'Create Standalone Car Booking', description: 'Book point-to-point transfers and daily car rentals', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'manage_maintenance', name: 'Manage Maintenance & Service', description: 'Log oil changes, repairs, and fuel reimbursements', risk: 'medium', defaultStaff: false, defaultAdmin: true },
    ]
  },
  {
    key: 'masters',
    name: 'Masters Catalog',
    category: 'operations',
    path: '/admin/masters',
    icon: 'dataset',
    description: 'System master catalogs: Destinations, hotels, room types, meal plans, activities, and transports',
    hasScope: false,
    defaultScope: 'all',
    subFeatures: [
      { key: 'manage_destinations', name: 'Manage Destinations & Spots', description: 'Add and edit tourist cities, sightseeing spots, and states', risk: 'medium', defaultStaff: false, defaultAdmin: true },
      { key: 'manage_hotels', name: 'Manage Master Hotel Directory', description: 'Add master hotels, room categories, and default rates', risk: 'medium', defaultStaff: false, defaultAdmin: true },
      { key: 'manage_activities', name: 'Manage Activities & Excursions', description: 'Add entry tickets, safaris, water sports, and rates', risk: 'medium', defaultStaff: false, defaultAdmin: true },
      { key: 'manage_pricing_terms', name: 'Manage Inclusions & Terms Presets', description: 'Configure cancellation policies, terms templates, and meal plans', risk: 'high', defaultStaff: false, defaultAdmin: true },
    ]
  },

  // ─── 4. FINANCE & BILLING ───
  {
    key: 'accounts',
    name: 'Bank Accounts & Balances',
    category: 'finance',
    path: '/admin/accounts',
    icon: 'account_balance',
    description: 'Company bank accounts, UPI IDs, petty cash balances, and ledger reconciliation',
    hasScope: false,
    defaultScope: 'all',
    subFeatures: [
      { key: 'view_balances', name: 'View Live Bank & Cash Balances', description: 'See real-time company account balances (Confidential financial data)', risk: 'critical', defaultStaff: false, defaultAdmin: true },
      { key: 'add_edit_account', name: 'Add / Modify Bank Accounts', description: 'Configure account numbers, IFSC codes, and UPI handles', risk: 'critical', defaultStaff: false, defaultAdmin: true },
      { key: 'transfer_funds', name: 'Record Inter-Account Fund Transfers', description: 'Transfer funds between company bank accounts or petty cash', risk: 'critical', defaultStaff: false, defaultAdmin: true },
      { key: 'reconcile', name: 'Reconcile Bank Statements', description: 'Match ledger transactions with bank statements', risk: 'high', defaultStaff: false, defaultAdmin: true },
    ]
  },
  {
    key: 'expenses',
    name: 'Business Expenses',
    category: 'finance',
    path: '/admin/expenses',
    icon: 'receipt_long',
    description: 'Operational expenses, vendor payouts, utility bills, and staff expense claims',
    hasScope: true,
    defaultScope: 'department',
    subFeatures: [
      { key: 'add_expense', name: 'Submit New Expense Claim', description: 'Record office, travel, or client expense voucher with receipt', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'approve_expense', name: 'Approve & Release Expense', description: 'Authorize payout of submitted expense claims', risk: 'critical', defaultStaff: false, defaultAdmin: true },
      { key: 'delete_expense', name: 'Delete Expense Record', description: 'Remove expense entry permanently', risk: 'critical', defaultStaff: false, defaultAdmin: true },
      { key: 'export_expenses', name: 'Export Expense Ledger for CA', description: 'Download complete expense records to Excel', risk: 'high', defaultStaff: false, defaultAdmin: true },
    ]
  },
  {
    key: 'finance_verification',
    name: 'Payment Verification',
    category: 'finance',
    path: '/admin/finance-verification',
    icon: 'fact_check',
    description: 'Bank transaction matching, UTR verification, and payment auditing',
    hasScope: false,
    defaultScope: 'all',
    subFeatures: [
      { key: 'verify_payment', name: 'Confirm & Approve Payment (UTR)', description: 'Confirm funds received in bank account and approve booking status', risk: 'critical', defaultStaff: false, defaultAdmin: true },
      { key: 'reject_payment', name: 'Reject Unmatched Payment', description: 'Flag invalid transaction or duplicate UTR receipt', risk: 'high', defaultStaff: false, defaultAdmin: true },
      { key: 'reconcile_utr', name: 'Edit Transaction UTR / Ref Number', description: 'Update reference numbers and payment modes', risk: 'medium', defaultStaff: false, defaultAdmin: true },
    ]
  },
  {
    key: 'proposals',
    name: 'Client Proposals & Quotes',
    category: 'finance',
    path: '/admin/proposals',
    icon: 'description',
    description: 'Tiered client quotations, price estimates, and proposal drafts',
    hasScope: true,
    defaultScope: 'assigned',
    subFeatures: [
      { key: 'create_proposal', name: 'Generate Proposal Draft', description: 'Build 3-tier quotation (Budget, Standard, Luxury)', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'edit_proposal', name: 'Edit Price Margins & Inclusions', description: 'Modify pricing, discounts, and itinerary details', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'send_proposal', name: 'Send Proposal to Client', description: 'Email or WhatsApp quotation directly to traveler', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'delete_proposal', name: 'Delete Proposal Draft', description: 'Remove proposal draft from system', risk: 'medium', defaultStaff: false, defaultAdmin: true },
    ]
  },
  {
    key: 'invoices',
    name: 'Invoices & Billing',
    category: 'finance',
    path: '/admin/invoices',
    icon: 'receipt',
    description: 'Official GST tax invoices, billing records, proforma invoices, and credit notes',
    hasScope: true,
    defaultScope: 'department',
    subFeatures: [
      { key: 'create_invoice', name: 'Generate Official GST Invoice', description: 'Issue tax invoices with HSN codes and GST breakup', risk: 'medium', defaultStaff: true, defaultAdmin: true },
      { key: 'edit_invoice', name: 'Edit Invoice Items & Totals', description: 'Modify billing address, customer GSTIN, or line items', risk: 'high', defaultStaff: false, defaultAdmin: true },
      { key: 'cancel_invoice', name: 'Void / Cancel Invoice', description: 'Cancel an issued invoice or issue credit note', risk: 'critical', defaultStaff: false, defaultAdmin: true },
      { key: 'download_pdf', name: 'Download Branded Invoice PDF', description: 'Generate official PDF invoice for client or accounting', risk: 'low', defaultStaff: true, defaultAdmin: true },
    ]
  },

  // ─── 5. TEAM & SYSTEM ───
  {
    key: 'staff',
    name: 'Staff Management',
    category: 'system',
    path: '/admin/staff',
    icon: 'badge',
    description: 'Employee directory, roles, system access rights, and login credentials',
    hasScope: true,
    defaultScope: 'department',
    subFeatures: [
      { key: 'add_staff', name: 'Add New Employee Account', description: 'Create new staff login with email and initial password', risk: 'high', defaultStaff: false, defaultAdmin: true },
      { key: 'edit_profile', name: 'Edit Employee Profile', description: 'Update staff name, mobile, role, and department', risk: 'medium', defaultStaff: false, defaultAdmin: true },
      { key: 'edit_permissions', name: 'Edit System Permissions & Scopes', description: 'Configure granular feature access and security scope (Strict Admin only)', risk: 'critical', defaultStaff: false, defaultAdmin: true },
      { key: 'reset_password', name: 'Reset Staff Login Password', description: 'Set new login password for team members', risk: 'critical', defaultStaff: false, defaultAdmin: true },
      { key: 'toggle_status', name: 'Suspend / Reactivate Staff', description: 'Deactivate or reactivate employee system access', risk: 'high', defaultStaff: false, defaultAdmin: true },
      { key: 'delete_staff', name: 'Permanently Delete Staff Account', description: 'Remove staff profile and auth account', risk: 'critical', defaultStaff: false, defaultAdmin: true },
      { key: 'masquerade', name: 'Masquerade / "View As" User', description: 'Log in as another user to audit and test their view', risk: 'critical', defaultStaff: false, defaultAdmin: true },
    ]
  },
  {
    key: 'team_performance',
    name: 'Team Performance & KPIs',
    category: 'system',
    path: '/admin/team-performance',
    icon: 'monitoring',
    description: 'Sales targets, agent KPIs, target achievement rates, and productivity metrics',
    hasScope: true,
    defaultScope: 'department',
    subFeatures: [
      { key: 'view_agent_kpis', name: 'View Agent Revenue & Deal KPIs', description: 'Inspect individual revenue, target pacing, and close ratios', risk: 'medium', defaultStaff: true, defaultAdmin: true },
      { key: 'set_targets', name: 'Set Monthly Sales Targets', description: 'Configure target quotas for sales representatives', risk: 'high', defaultStaff: false, defaultAdmin: true },
      { key: 'export_kpi_data', name: 'Export Performance Summaries', description: 'Download agent KPI reports to Excel', risk: 'medium', defaultStaff: false, defaultAdmin: true },
    ]
  },
  {
    key: 'productivity',
    name: 'Staff Productivity & Workload',
    category: 'system',
    path: '/admin/productivity',
    icon: 'speed',
    description: 'Active workload, follow-up velocity, pending tasks, and time tracking metrics',
    hasScope: true,
    defaultScope: 'department',
    subFeatures: [
      { key: 'view_workload', name: 'View Active Workload & Tasks', description: 'See active leads, follow-ups, and pending tasks per employee', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'reassign_tasks', name: 'Rebalance Workload / Tasks', description: 'Shift overdue tasks between available executives', risk: 'medium', defaultStaff: false, defaultAdmin: true },
      { key: 'view_activity_scores', name: 'View System Velocity Scores', description: 'Inspect response time benchmarks and turnaround times', risk: 'low', defaultStaff: true, defaultAdmin: true },
    ]
  },
  {
    key: 'packages',
    name: 'Tour Packages Catalog',
    category: 'system',
    path: '/admin/packages',
    icon: 'inventory_2',
    description: 'Holiday packages, seasonal tour offerings, public website package cards',
    hasScope: false,
    defaultScope: 'all',
    subFeatures: [
      { key: 'create_package', name: 'Create New Holiday Package', description: 'Add new holiday packages with day-wise itinerary & rates', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'edit_package', name: 'Edit Package Details & Photos', description: 'Update package highlights, inclusions, and photo galleries', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'publish_package', name: 'Publish / Unpublish on Website', description: 'Control public website visibility of holiday packages', risk: 'medium', defaultStaff: false, defaultAdmin: true },
      { key: 'delete_package', name: 'Delete Holiday Package', description: 'Remove tour package from catalog', risk: 'high', defaultStaff: false, defaultAdmin: true },
    ]
  },
  {
    key: 'testimonials',
    name: 'Testimonials & Reviews (CMS)',
    category: 'system',
    path: '/admin/testimonials',
    icon: 'rate_review',
    description: 'Client reviews, ratings, and customer testimonial cards on the website',
    hasScope: false,
    defaultScope: 'all',
    subFeatures: [
      { key: 'add_testimonial', name: 'Add New Client Review', description: 'Upload client photo, review text, and trip destination', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'approve_testimonial', name: 'Approve & Publish Reviews', description: 'Toggle visibility of customer reviews on homepage', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'delete_testimonial', name: 'Delete Testimonial', description: 'Remove review from the website', risk: 'low', defaultStaff: false, defaultAdmin: true },
    ]
  },
  {
    key: 'trending',
    name: 'Trending Destinations (CMS)',
    category: 'system',
    path: '/admin/trending',
    icon: 'trending_up',
    description: 'Homepage featured destinations, trending spots, and banner carousels',
    hasScope: false,
    defaultScope: 'all',
    subFeatures: [
      { key: 'add_spot', name: 'Add Featured Spot', description: 'Highlight destination on the public landing page', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'edit_order', name: 'Re-order Display Sequence', description: 'Change display ranking of trending destination cards', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'delete_spot', name: 'Remove Trending Spot', description: 'Delete featured card from homepage', risk: 'low', defaultStaff: false, defaultAdmin: true },
    ]
  },
  {
    key: 'offer_banners',
    name: 'Offer Banners (CMS)',
    category: 'system',
    path: '/admin/offer-banners',
    icon: 'view_carousel',
    description: 'Homepage top promotional banners, festival deals, and call-to-action sliders',
    hasScope: false,
    defaultScope: 'all',
    subFeatures: [
      { key: 'upload_banner', name: 'Upload New Promo Banner', description: 'Upload desktop/mobile marketing banners with redirect links', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'toggle_banner', name: 'Activate / Pause Banners', description: 'Set banner active status and scheduling dates', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'delete_banner', name: 'Delete Banner', description: 'Permanently remove banner from carousel', risk: 'low', defaultStaff: false, defaultAdmin: true },
    ]
  },
  {
    key: 'training',
    name: 'Video Training & Onboarding',
    category: 'system',
    path: '/admin/training',
    icon: 'video_library',
    description: 'Employee onboarding, video SOPs, destination masterclasses, and learning hub',
    hasScope: false,
    defaultScope: 'all',
    subFeatures: [
      { key: 'view_training', name: 'Watch Training Videos & SOPs', description: 'Access company tutorials, destination knowledge, and sales guides', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'upload_lessons', name: 'Upload Video Lessons & Guides', description: 'Add new onboarding videos, quizzes, and training material', risk: 'medium', defaultStaff: false, defaultAdmin: true },
      { key: 'track_staff_progress', name: 'Track Staff Completion Status', description: 'Check which employees completed required training modules', risk: 'low', defaultStaff: false, defaultAdmin: true },
    ]
  },
  {
    key: 'audit',
    name: 'Security & Audit Logs',
    category: 'system',
    path: '/admin/audit',
    icon: 'history',
    description: 'Real-time user activity feed, security audit trail, and record change history',
    hasScope: true,
    defaultScope: 'department',
    subFeatures: [
      { key: 'view_activity_feed', name: 'View Real-time Activity Feed', description: 'See live logs of user edits, logins, and status updates', risk: 'low', defaultStaff: true, defaultAdmin: true },
      { key: 'view_security_logs', name: 'View Critical Security Audit Trail', description: 'Inspect login attempts, password changes, and deletions', risk: 'high', defaultStaff: false, defaultAdmin: true },
      { key: 'export_audit_trail', name: 'Export Audit Logs to CSV', description: 'Download security history for compliance review', risk: 'critical', defaultStaff: false, defaultAdmin: true },
    ]
  },
  {
    key: 'settings',
    name: 'System Settings & Config',
    category: 'system',
    path: '/admin/settings',
    icon: 'settings',
    description: 'Global business settings, GSTIN, payment gateways, WhatsApp APIs, and automation rules',
    hasScope: false,
    defaultScope: 'all',
    subFeatures: [
      { key: 'company_profile', name: 'Edit Company Profile & Branding', description: 'Update agency name, GSTIN, registered address, and logos', risk: 'critical', defaultStaff: false, defaultAdmin: true },
      { key: 'payment_gateways', name: 'Manage Payment Gateways & Bank Keys', description: 'Configure Razorpay, Stripe, and merchant account keys', risk: 'critical', defaultStaff: false, defaultAdmin: true },
      { key: 'whatsapp_api', name: 'Configure WhatsApp & Email SMTP', description: 'Update WhatsApp API credentials and outgoing mail servers', risk: 'critical', defaultStaff: false, defaultAdmin: true },
      { key: 'lead_distribution_rules', name: 'Manage Auto-Assignment & SLA Rules', description: 'Configure round-robin lead allocation and response timers', risk: 'high', defaultStaff: false, defaultAdmin: true },
    ]
  },
];

// Helper to quickly look up any module definition
export const MODULES_BY_KEY: Record<string, ModuleDefinition> = ALL_MODULE_DEFINITIONS.reduce((acc, mod) => {
  acc[mod.key] = mod;
  return acc;
}, {} as Record<string, ModuleDefinition>);

// Build Default Staff Permissions (Clean baseline with safe defaults)
export const buildDefaultPermissions = (): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const mod of ALL_MODULE_DEFINITIONS) {
    const features: Record<string, boolean> = {};
    for (const feat of mod.subFeatures) {
      features[feat.key] = feat.defaultStaff;
    }
    // Most operational modules start accessible for view, sensitive ones start false
    const sensitiveKeys = new Set(['accounts', 'finance_verification', 'staff', 'audit', 'settings', 'analytics', 'reports', 'kyc']);
    const isViewAllowed = !sensitiveKeys.has(mod.key);

    result[mod.key] = {
      view: isViewAllowed,
      manage: isViewAllowed && !['inbox', 'accounts', 'finance_verification', 'staff'].includes(mod.key),
      scope: mod.defaultScope || 'assigned',
      features,
    };
  }
  return result;
};

// Build Default Admin Permissions (Unrestricted access to everything)
export const buildAdminPermissions = (): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const mod of ALL_MODULE_DEFINITIONS) {
    const features: Record<string, boolean> = {};
    for (const feat of mod.subFeatures) {
      features[feat.key] = true;
    }
    result[mod.key] = {
      view: true,
      manage: true,
      scope: 'all',
      features,
    };
  }
  return result;
};

// ─── ROLE PRESETS (One-Click Convenience) ───
export interface RolePreset {
  id: string;
  name: string;
  description: string;
  badgeColor: string;
  userType: 'Staff' | 'Admin';
  queryScope: 'Show Assigned Query Only' | 'Show Department Queries' | 'Show All Queries';
  whatsappScope: 'Assigned Queries Messages' | 'Department Messages' | 'All Messages';
  apply: (base: Record<string, any>) => Record<string, any>;
}

export const ROLE_PRESETS: RolePreset[] = [
  {
    id: 'super_admin',
    name: 'Super Administrator',
    description: 'Unrestricted access to all 39 modules, full sub-features, and global scope.',
    badgeColor: 'purple',
    userType: 'Admin',
    queryScope: 'Show All Queries',
    whatsappScope: 'All Messages',
    apply: () => buildAdminPermissions(),
  },
  {
    id: 'sales_executive',
    name: 'Sales Executive / Consultant',
    description: 'Manages assigned leads, quotes, customer queries. Contacts masked, export & delete blocked.',
    badgeColor: 'cyan',
    userType: 'Staff',
    queryScope: 'Show Assigned Query Only',
    whatsappScope: 'Assigned Queries Messages',
    apply: () => {
      const perms = buildDefaultPermissions();
      // Enable CRM & Proposals
      ['dashboard', 'leads', 'customers', 'itinerary', 'proposals', 'packages', 'training'].forEach(k => {
        if (perms[k]) {
          perms[k].view = true;
          perms[k].manage = true;
          perms[k].scope = 'assigned';
        }
      });
      // Safety locks on Leads
      if (perms.leads?.features) {
        perms.leads.features.delete_lead = false;
        perms.leads.features.export_leads = false;
        perms.leads.features.reassign_staff = false;
        perms.leads.features.mask_contacts = true; // Mask phone
      }
      // Safety locks on Bookings
      if (perms.bookings) {
        perms.bookings.view = true;
        perms.bookings.manage = true;
        perms.bookings.scope = 'assigned';
        if (perms.bookings.features) {
          perms.bookings.features.view_cost_margins = false; // Hide confidential margins
          perms.bookings.features.cancel_booking = false;
          perms.bookings.features.delete_booking = false;
          perms.bookings.features.export_bookings = false;
        }
      }
      // Block sensitive modules
      ['accounts', 'expenses', 'finance_verification', 'inbox', 'staff', 'settings', 'audit'].forEach(k => {
        if (perms[k]) { perms[k].view = false; perms[k].manage = false; }
      });
      return perms;
    },
  },
  {
    id: 'sales_manager',
    name: 'Sales Head / Branch Manager',
    description: 'Full CRM oversight for their entire department, deals conversion, target setting, and reports.',
    badgeColor: 'blue',
    userType: 'Staff',
    queryScope: 'Show Department Queries',
    whatsappScope: 'Department Messages',
    apply: () => {
      const perms = buildDefaultPermissions();
      ['dashboard', 'leads', 'customers', 'memberships', 'support_inbox', 'itinerary', 'proposals', 'packages', 'team_performance', 'productivity', 'analytics', 'reports', 'training'].forEach(k => {
        if (perms[k]) {
          perms[k].view = true;
          perms[k].manage = true;
          perms[k].scope = 'department';
          Object.keys(perms[k].features || {}).forEach(fk => perms[k].features[fk] = true);
        }
      });
      if (perms.leads?.features) {
        perms.leads.features.delete_lead = false; // Still protect against accidental deletion
        perms.leads.features.mask_contacts = false; // Manager sees full numbers
      }
      if (perms.bookings?.features) {
        perms.bookings.features.view_cost_margins = true; // Manager can negotiate margins
      }
      return perms;
    },
  },
  {
    id: 'operations_executive',
    name: 'Operations & Fleet Executive',
    description: 'Coordinates live deliverables, car rentals, drivers, vendors, and supplier vouchers.',
    badgeColor: 'emerald',
    userType: 'Staff',
    queryScope: 'Show Department Queries',
    whatsappScope: 'Department Messages',
    apply: () => {
      const perms = buildDefaultPermissions();
      // Block sales & finance
      ['leads', 'proposals', 'accounts', 'invoices', 'staff', 'settings'].forEach(k => {
        if (perms[k]) { perms[k].view = false; perms[k].manage = false; }
      });
      // Enable operations modules
      ['dashboard', 'operations', 'car_rental', 'bookings', 'inventory', 'vendors', 'masters', 'inbox', 'training'].forEach(k => {
        if (perms[k]) {
          perms[k].view = true;
          perms[k].manage = true;
          perms[k].scope = 'department';
        }
      });
      // Inbox permissions: allow cab approvals, block payments/leaves
      if (perms.inbox?.features) {
        perms.inbox.features.approve_ops_cabs = true;
        perms.inbox.features.approve_payments = false;
        perms.inbox.features.approve_leaves = false;
        perms.inbox.features.approve_kyc = true;
      }
      return perms;
    },
  },
  {
    id: 'finance_accountant',
    name: 'Finance & Accounts Executive',
    description: 'Manages invoices, bank accounts, vendor expenses, and payment receipts verification.',
    badgeColor: 'amber',
    userType: 'Staff',
    queryScope: 'Show All Queries',
    whatsappScope: 'All Messages',
    apply: () => {
      const perms = buildDefaultPermissions();
      // Block operations fleet & marketing
      ['car_rental', 'trending', 'offer_banners', 'testimonials', 'marketing_logs', 'coupons'].forEach(k => {
        if (perms[k]) { perms[k].view = false; perms[k].manage = false; }
      });
      // Enable finance modules
      ['dashboard', 'accounts', 'expenses', 'finance_verification', 'invoices', 'vendors', 'inbox', 'reports', 'analytics'].forEach(k => {
        if (perms[k]) {
          perms[k].view = true;
          perms[k].manage = true;
          perms[k].scope = 'all';
          Object.keys(perms[k].features || {}).forEach(fk => perms[k].features[fk] = true);
        }
      });
      // Can verify payments in inbox
      if (perms.inbox?.features) {
        perms.inbox.features.approve_payments = true;
        perms.inbox.features.approve_leaves = false;
        perms.inbox.features.approve_ops_cabs = false;
      }
      return perms;
    },
  },
];
