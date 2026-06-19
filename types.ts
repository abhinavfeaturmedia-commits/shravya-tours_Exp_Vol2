
export enum UserRole {
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
  AGENT = 'AGENT'
}

export enum BookingStatus {
  PENDING = 'Pending',
  CONFIRMED = 'Confirmed',
  CANCELLED = 'Cancelled',
  COMPLETED = 'Completed'
}

export type BookingType = 'Tour' | 'Hotel' | 'Car' | 'Bus' | 'Train' | 'Flight';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface Package {
  id: string;
  title: string;
  days: number;
  groupSize: string;
  location: string;
  description: string;
  price: number;
  originalPrice?: number;          // Pre-discount price for offer strikethrough display
  pricingMode?: 'per_person' | 'group'; // How price is applied: per person or total group price
  image: string;
  tag?: string;
  tagColor?: string;
  theme: string;
  overview: string;
  highlights: { icon: string; label: string }[];
  itinerary: { day: number; title: string; desc: string }[];
  gallery: string[];
  status?: 'Active' | 'Inactive';
  remainingSeats?: number;
  offerEndTime?: string;           // ISO String for countdown
  included?: string[];
  notIncluded?: string[];
  builderData?: any;               // Raw Itinerary Builder state for editing
  proposalStatus?: 'Draft' | 'Sent' | 'Viewed' | 'Approved' | 'Changes Requested';
  addons?: { id: string; label: string; price: number }[]; // Per-package configurable add-ons
  itinerary_status?: string;
  client_name?: string | null;
  client_id?: string | null;
  validity_date?: string | null;
  terms_and_conditions?: string | null;
  partnerCommissionType?: CommissionType;
  partnerCommissionValue?: number;
}

export interface Booking {
  id: string; // Internal UUID from DB
  bookingNumber?: number; // DB AUTO_INCREMENT number → displayed as BK-0001
  invoiceNo?: string; // Custom Invoice Number (e.g. BU-2602-0001)
  type: BookingType;
  customerId?: string; // Link to Customer Profile
  customer: string; // Keep for display/historic

  email: string;
  phone?: string;
  title: string;
  date: string;
  endDate?: string;
  amount: number;
  guests?: string;
  status: BookingStatus;
  payment: 'Paid' | 'Unpaid' | 'Deposit' | 'Refunded';
  details?: string;
  packageId?: string;
  assignedTo?: number;
  supplierBookings?: SupplierBooking[];
  transactions?: BookingTransaction[];
  notes?: BookingNote[];
  // Live Operations fields (synced with MySQL)
  durationDays?: number;       // Explicit trip duration — avoids fragile package lookup
  paxCount?: number;           // Explicit passenger count — avoids regex on guests string
  whatsappGroupUrl?: string;   // WhatsApp group link for the tour group
  liveStatus?: 'Live' | 'Completed' | 'Cancelled' | 'Issue'; // Operational status
  partnerId?: string;          // Link to Partner
  partnerName?: string;
  partnerCompanyName?: string;
  leadId?: string;             // Associated lead ID if converted
  
  // NEW: Lead CRM Carry Forward Fields
  whatsapp?: string;           // WhatsApp Number
  isWhatsappSame?: boolean;    // Is WhatsApp same as primary phone number
  altPhone?: string;           // Alternate Phone Number
  paxAdult?: number;           // Number of adults
  paxChild?: number;           // Number of children
  paxInfant?: number;          // Number of infants
  serviceType?: string;        // Category of service requested
  residentialAddress?: string; // Residential Address
  officeAddress?: string;      // Office Address
  appliedCouponCode?: string;
  couponDiscountAmount?: number;
  originalPrice?: number;
}

export interface BookingNote {
  id: string;
  text: string;
  date: string;
  author: string;
  isPinned?: boolean;
}

export interface BookingTransaction {
  id: string;
  bookingId: string;
  date: string;
  amount: number;
  type: 'Payment' | 'Refund';
  method: 'Cash' | 'Bank Transfer' | 'UPI' | 'Credit Card' | 'Cheque';
  reference?: string;
  notes?: string;
  recordedBy?: string;
  status?: 'Pending' | 'Verified' | 'Rejected';
  receiptUrl?: string;
}

export type SupplierBookingStatus = 'Pending' | 'Confirmed' | 'Cancelled' | 'Partially Paid' | 'Paid';

export interface SupplierBooking {
  id: string;
  bookingId: string;
  vendorId: string;
  serviceType: 'Hotel' | 'Transport' | 'Flight' | 'Activity' | 'Other';
  confirmationNumber?: string;
  cost: number;
  paidAmount: number;
  paymentStatus: 'Unpaid' | 'Partially Paid' | 'Paid' | 'Refunded';
  bookingStatus: SupplierBookingStatus;
  paymentDueDate?: string; // ISO String
  notes?: string;
  // Transport-specific fields (Live Operations)
  driverName?: string;    // Actual driver name
  driverPhone?: string;   // Driver contact number
  vehicleNumber?: string; // Vehicle registration number
}

// Attendance log entry persisted per-day per-staff in MySQL attendance_logs table
export interface AttendanceLog {
  id: string;
  staffId: number;
  date: string;           // YYYY-MM-DD
  status: 'Present' | 'Absent' | 'On Field' | 'Remote' | 'On Leave';
  checkInTime?: string;   // ISO DateTime string
  checkOutTime?: string;  // ISO DateTime string
  location?: string;
  notes?: string;
}

export interface LeadLog {
  id: string;
  type: 'Note' | 'Call' | 'Email' | 'Quote' | 'System' | 'WhatsApp' | 'Chat';
  content: string;
  timestamp: string; // ISO String
  sender?: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: 'Rent' | 'Salaries' | 'Software' | 'Marketing' | 'Office Supplies' | 'Utilities' | 'Other';
  date: string;
  paymentMethod: 'Bank Transfer' | 'Cash' | 'Credit Card' | 'UPI';
  status: 'Paid' | 'Pending';
  notes?: string;
  receiptUrl?: string;
}



export interface AuditLog {
  id: string;
  action: string; // e.g., "Deleted Lead", "Updated Staff"
  module: string; // e.g., "Leads", "Staff", "Finance"
  performedBy: string; // User Name
  details: string;
  timestamp: string;
  severity: 'Info' | 'Warning' | 'Critical';
}

export interface Lead {
  id: string;                      // Internal UUID from DB
  customerId?: string;             // Link to Customer Profile
  leadNumber?: number;             // DB AUTO_INCREMENT number → displayed as LD-0001
  packageId?: string;              // Source package that generated this lead (for admin linkage)
  name: string;
  email: string;
  phone: string;
  location?: string;               // Added for PDF generation
  destination: string;
  startDate?: string;
  endDate?: string;                // Travel end date
  travelers: string;
  budget: string;
  type: string;
  status: 'New' | 'Warm' | 'Hot' | 'Cold' | 'Offer Sent' | 'Converted';
  priority: 'High' | 'Medium' | 'Low';
  potentialValue: number;
  addedOn: string;
  source: string;
  preferences?: string;
  logs: LeadLog[];
  avatarColor?: string;
  assignedTo?: number;             // Staff ID
  whatsapp?: string;               // WhatsApp Number
  isWhatsappSame?: boolean;
  aiScore?: number;                // 0-100
  aiSummary?: string;
  serviceType?: ServiceType;       // Type of service requested
  paxAdult?: number;               // Number of adults
  paxChild?: number;               // Number of children
  paxInfant?: number;              // Number of infants
  residentialAddress?: string;     // Residential Address
  officeAddress?: string;          // Office Address
  partnerId?: string;              // Partner Referral ID
  partnerName?: string;
  partnerCompanyName?: string;
  
  // NEW: Lead CRM Carry Forward Fields
  altPhone?: string;           // Alternate Phone Number
}

export interface CustomerPreference {
  dietary: string[]; // e.g. ['Vegan', 'Nut-Free']
  flight: string[]; // e.g. ['Aisle Seat', 'Forward Cabin']
  accommodation: string[]; // e.g. ['King Bed', 'High Floor']
}

export interface CustomerNote {
  id: string;
  text: string;
  date: string;
  author: string;
  isPinned?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  location?: string;
  type: 'New' | 'Returning' | 'VIP';
  status: 'Active' | 'Inactive';
  totalSpent: number;
  bookingsCount: number;
  joinedDate: string;
  tags?: string[];
  lastActive?: string;
  preferences?: CustomerPreference;
  notes?: CustomerNote[];
  prefix?: string;
  dob?: string;
  altPhone?: string;
  whatsapp?: string;
  isWhatsappSame?: boolean;
  address?: string;
  officeAddress?: string;
}




export interface StaffModulePermissions {
  view: boolean;
  manage: boolean;
}

export interface StaffPermissions {
  dashboard: StaffModulePermissions;
  leads: StaffModulePermissions;
  customers: StaffModulePermissions;
  bookings: StaffModulePermissions;
  operations: StaffModulePermissions;  // Live Operations (separate from bookings)
  itinerary: StaffModulePermissions;
  inventory: StaffModulePermissions;   // Packages
  masters: StaffModulePermissions;
  vendors: StaffModulePermissions;
  finance: StaffModulePermissions;     // Accounts & Expenses
  invoices: StaffModulePermissions;    // Invoices & Payment Approvals
  proposals: StaffModulePermissions;   // Proposals (separate from leads)
  marketing: StaffModulePermissions;
  staff: StaffModulePermissions;
  reports: StaffModulePermissions;     // Analytics
  audit: StaffModulePermissions;       // Audit Logs only
  settings: StaffModulePermissions;    // Settings (was incorrectly under audit)
  cms: StaffModulePermissions;         // CMS and Content
  partners: StaffModulePermissions;    // B2B Partners
  memberships: StaffModulePermissions; // Memberships
  testimonials: StaffModulePermissions;// Testimonials
}

export interface StaffMember {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  userType: 'Staff' | 'Admin';
  department: string;
  status: 'Active' | 'Inactive';
  lastActive: string;
  initials: string;
  color: string;
  currentSessionId?: string; // For single session enforcement
  permissions?: StaffPermissions;
  queryScope?: 'Show Assigned Query Only' | 'Show All Queries';
  whatsappScope?: 'Assigned Queries Messages' | 'All Messages';
  // Attendance
  attendanceStatus?: 'Present' | 'Absent' | 'On Field' | 'Remote' | 'On Leave';
  currentLocation?: string;
  checkInTime?: string;
}

export interface DailySlot {
  id?: string;
  date: string; // YYYY-MM-DD
  assetId: string;
  assetType: 'Tour' | 'Car' | 'Bus';
  capacity: number;
  booked: number;
  price: number;
  isBlocked: boolean;
}

export interface VendorService {
  id: string;
  name: string;
  unit: string;
  baseCost: number;
  markupType: 'Percentage' | 'Fixed';
  markupValue: number;
  sellingPrice: number;
  status: 'Active' | 'Inactive';
}

export interface VendorDocument {
  id: string;
  name: string;
  type: 'Contract' | 'License' | 'ID' | 'Insurance' | 'Other';
  expiryDate?: string;
  url: string;
  status: 'Valid' | 'Expired' | 'Pending';
  uploadDate: string;
}

export interface VendorTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'Credit' | 'Debit';
  reference?: string;
}

export interface VendorNote {
  id: string;
  text: string;
  date: string;
  author: string;
}

export interface Vendor {
  id: string;
  name: string;
  category: 'Hotel' | 'Transport' | 'Guide' | 'Activity' | 'DMC';
  subCategory?: 'Flight' | 'Bus' | 'Taxi/Cab' | 'Other';
  location: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  rating: number;
  contractStatus: 'Active' | 'Expiring' | 'Reviewing' | 'Blacklisted';
  contractExpiryDate?: string;
  logo: string;

  totalSales: number;
  totalCommission: number;
  balanceDue: number;

  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    ifsc: string;
    upiId?: string;
    upiNumber?: string;
  };

  services: VendorService[];
  documents: VendorDocument[];
  transactions: VendorTransaction[];
  notes: VendorNote[];
}

// --- New Features Types ---

export interface AccountTransaction {
  id: string;
  date: string;
  type: 'Credit' | 'Debit';
  amount: number;
  status?: 'Pending' | 'Confirmed' | 'Rejected';
  description: string;
  reference?: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'Agent' | 'Corporate';
  companyName: string;
  email: string;
  phone: string;
  location: string;
  currentBalance: number; // Wallet Balance (Positive = Funds Available)
  status: 'Active' | 'Inactive' | 'Blocked';
  logo: string;
  transactions: AccountTransaction[];
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'User' | 'System' | 'Lead';
  timestamp: string;
}

export interface Campaign {
  id: string;
  name: string;
  type: 'Email' | 'WhatsApp' | 'SMS';
  audience: 'Leads' | 'Customers' | 'Agents';
  status: 'Draft' | 'Scheduled' | 'Sent';
  metrics: {
    sent: number;
    opened: number;
    clicked: number;
  };
}

// --- Master Data Types ---

export type MasterLocationType = 'City' | 'State' | 'Country';

export interface MasterLocation {
  id: string;
  name: string;
  type: MasterLocationType;
  region: string;
  image?: string;
  status: 'Active' | 'Inactive';
}

export interface MasterHotel {
  id: string;
  name: string;
  locationId: string;
  rating: number;
  amenities: string[];
  pricePerNight: number;
  image?: string;
  address?: string;
  status: 'Active' | 'Inactive';
}

export interface MasterActivity {
  id: string;
  name: string;
  locationId: string;
  duration: string;
  cost: number;
  category: 'Sightseeing' | 'Adventure' | 'Cultural' | 'Leisure' | 'Other';
  image?: string;
  status: 'Active' | 'Inactive';
}

export type MasterTransportType = 'Sedan' | 'SUV' | 'Hatchback' | 'Bus' | 'Tempo Traveller' | 'Train' | 'Flight';

export interface MasterTransport {
  id: string;
  name: string;
  type: MasterTransportType;
  capacity: number;
  baseRate: number;
  image?: string;
  status: 'Active' | 'Inactive';
}

export interface MasterPlanDay {
  day: number;
  title: string;
  activities: string[];
  hotelId?: string;
  transportId?: string;
}

export interface MasterPlan {
  id: string;
  title: string;
  duration: number;
  locationId: string;
  days: MasterPlanDay[];
  estimatedCost: number;
  status: 'Active' | 'Draft';
}

// --- Lead Management 2.0 Types ---

export type ServiceType =
  | 'Activities only'
  | 'Flight only'
  | 'Full package'
  | 'Hotel + Flight'
  | 'Hotel + Transport'
  | 'Hotel only'
  | 'Transport only'
  | 'Visa only';

export const SERVICE_TYPES: ServiceType[] = [
  'Activities only',
  'Flight only',
  'Full package',
  'Hotel + Flight',
  'Hotel + Transport',
  'Hotel only',
  'Transport only',
  'Visa only'
];

export type FollowUpType = 'Call' | 'Email' | 'Meeting' | 'WhatsApp';
export type FollowUpStatus = 'Scheduled' | 'Done' | 'Pending' | 'Overdue' | 'Cancelled';

export interface FollowUp {
  id: string;
  leadId: string;
  leadName?: string; // Added for display
  type: FollowUpType;
  description: string; // Used as notes
  scheduledAt: string; // ISO String
  reminderEnabled: boolean;
  status: FollowUpStatus;
  priority?: 'High' | 'Medium' | 'Low';
  createdAt: string;
  completedAt?: string;
  assignedTo?: number; // Staff ID
  notes?: string; // Optional alias if needed, or stick to description
}

// --- Proposal Management Types ---

export interface Proposal {
  id: string;
  leadId: string;
  title: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected';
  options: ProposalOption[];
  createdAt: string;
  validUntil?: string;
}

export interface ProposalOption {
  id: string;
  name: string; // e.g: "Luxury", "Standard"
  description?: string;
  price: number;
  items: string[]; // List of hotel IDs or Names (Legacy)
  hotels: string[]; // List of hotel IDs
  activities: string[]; // List of activity IDs
  inclusions: string[];
  exclusions: string[];
  image?: string;
}

// --- Pricing Engine Types ---

export type PricingCategory = 'Hotel' | 'Activity' | 'Transport' | 'Visa' | 'Flight' | 'Guide' | 'DMC' | 'Other';
export type CurrencyCode = 'INR' | 'USD' | 'AED' | 'EUR' | 'GBP';

export interface PricingItem {
  id: string;
  name: string;
  category: PricingCategory;
  quantity: number;
  netCost: number;
  baseMarkupPercent: number;
  extraMarkupFlat: number;
  sellPrice: number; // Auto-calculated: netCost * (1 + baseMarkupPercent/100) + extraMarkupFlat
}

export interface TaxConfig {
  cgstPercent: number;
  sgstPercent: number;
  igstPercent: number;
  tcsPercent: number;
  gstOnTotal: boolean; // If true, GST on (net + markup). If false, GST on markup only.
}

export const DEFAULT_TAX_CONFIG: TaxConfig = {
  cgstPercent: 2.5,
  sgstPercent: 2.5,
  igstPercent: 0,
  tcsPercent: 0,
  gstOnTotal: true
};

export interface ItineraryPricing {
  items: PricingItem[];
  currency: CurrencyCode;
  taxes: TaxConfig;
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
}

// --- Additional Master Data Types ---

export interface MasterRoomType {
  id: string;
  name: string;
  description?: string;
  image?: string;
  status: 'Active' | 'Inactive';
}

export type MealPlanCode = 'EP' | 'CP' | 'MAP' | 'AP' | 'AI';

export interface MasterMealPlan {
  id: string;
  code: MealPlanCode;
  name: string;
  description: string;
  image?: string;
  status: 'Active' | 'Inactive';
}

export const MEAL_PLAN_DESCRIPTIONS: Record<MealPlanCode, string> = {
  'EP': 'Room only, no meals included',
  'CP': 'Breakfast included',
  'MAP': 'Breakfast and Dinner included',
  'AP': 'All three meals included',
  'AI': 'All meals, snacks, and beverages included'
};

export interface MasterLeadSource {
  id: string;
  name: string;
  category?: 'Organic' | 'Paid' | 'Referral' | 'Direct';
  image?: string;
  status: 'Active' | 'Inactive';
}

export type TermsCategory = 'Booking & Payment' | 'Pricing & Inclusions' | 'Cancellation Policy' | 'Travel Insurance' | 'Other';

export interface MasterTermsTemplate {
  id: string;
  title: string;
  image?: string;
  category: TermsCategory;
  content: string; // Rich text HTML content
  isDefault: boolean;
  status: 'Active' | 'Inactive';
}

// --- Workflow Status Types ---

export interface WorkflowStatus {
  id: string;
  name: string;
  color: string; // Hex color code
  order: number;
  showOnDashboard: boolean;
  requiresNote: boolean;
  isActive: boolean;
}

// --- CMS Types ---

export interface CMSBanner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaText: string;
  ctaLink: string;
  isActive: boolean;
}

export interface CMSTestimonial {
  id: string;
  customerName: string;
  location: string;
  rating: number; // 1-5
  text: string;
  avatarUrl?: string; // Optional
  isActive: boolean;
}

export interface CMSGalleryImage {
  id: string;
  title: string;
  imageUrl: string;
  category: 'Landscape' | 'Hotel' | 'Activity' | 'Other';
  // Enhanced fields (v2)
  tag?: string;
  linkUrl?: string;
  featured?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CMSPost {
  id: string;
  title: string;
  slug: string; // url-friendly-title
  excerpt: string;
  content: string; // HTML or Markdown
  coverImage: string;
  author: string;
  publishedDate: string;
  status: 'Draft' | 'Published';
  tags: string[];
}

// --- Trending Destinations ---
export interface TrendingDestination {
  id: string;
  name: string;
  country?: string;
  region?: string;
  imageUrl: string;
  badge?: string;
  badgeColor?: string;
  statLabel?: string;
  packageCount?: number;
  sortOrder?: number;
  isActive?: boolean;
  packageIds?: string[];
}

// --- Productivity Features Types ---

// User Activity Tracking
export interface UserActivity {
  id: string;
  staffId: number;
  staffName: string;
  action: string;
  module: string;
  details?: string;
  timestamp: string;
}

// Task Management
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Overdue';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignedTo: number | string;
  assignedBy: number | string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  createdAt: string;
  completedAt?: string;
  relatedLeadId?: string;
  relatedBookingId?: string;
  category?: string;
}

// Daily Targets
export interface DailyTarget {
  id: string;
  staffId: number;
  date: string;
  targetLeads: number;
  targetCalls: number;
  targetConversions: number;
  targetBookings: number;
  actualLeads: number;
  actualCalls: number;
  actualConversions: number;
  actualBookings: number;
}

// Performance Metrics (calculated, not stored)
export interface PerformanceMetrics {
  staffId: number;
  staffName: string;
  period: 'daily' | 'weekly' | 'monthly';
  leadsHandled: number;
  callsMade: number;
  conversions: number;
  bookingsCreated: number;
  revenue: number;
  targetAchievement: number; // percentage
  avgResponseTime: number; // minutes
}

// Time Tracking
export interface TimeSession {
  id: string;
  staffId: number;
  taskId?: string;
  startTime: string;
  endTime?: string;
  duration: number; // milliseconds
  idleTime: number; // milliseconds of detected idle
  status: 'Active' | 'Paused' | 'Completed';
  notes?: string;
}

// Auto-Assignment Rules
export type AssignmentStrategy = 'round-robin' | 'workload' | 'specialty' | 'manual';

export interface AssignmentRule {
  id: string;
  name: string;
  isActive: boolean;
  strategy: AssignmentStrategy;
  triggerOn: 'new-lead' | 'new-booking' | 'new-task';
  eligibleStaffIds: number[]; // Empty means all active staff
  priority: number; // Lower = higher priority
  conditions?: {
    leadSource?: string[];
    packageId?: string[];
    minValue?: number;
    maxValue?: number;
  };
  createdAt: string;
  updatedAt: string;
}

// --- Membership Types ---

export interface MembershipPlan {
  id: string;
  name: string;
  tier: 'Bronze' | 'Silver' | 'Gold';
  pricePerMonth: number;
  pricePerQuarter: number;
  pricePerHalfYear: number;
  pricePerYear: number;
  discountType: 'Percentage' | 'Flat_Amount';
  discountPercent: number;   // Flat discount percentage
  discountFlat: number;      // Flat discount fixed amount (₹)
  hotelDiscount: number;     // Extra hotel-specific discount
  tourDiscount: number;      // Extra tour-specific discount
  flightDiscount: number;    // Extra flight-specific discount
  cabDiscount: number;       // Extra cab/taxi-specific discount
  perks: string[];           // Editable list of perk strings
  color: string;             // Hex color for tier badge display
  isActive: boolean;
}

export interface CustomerMembership {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  planId: string;
  planName: string;
  tier: 'Bronze' | 'Silver' | 'Gold';
  status: 'Active' | 'Suspended' | 'Expired';
  billingCycle: 'Monthly' | 'Quarterly' | '6 Months' | 'Yearly';
  pricePaid: number;
  enrolledOn: string;        // YYYY-MM-DD
  expiresOn: string;         // YYYY-MM-DD (calculated dynamically)
  discountType: 'Percentage' | 'Flat_Amount';
  discountPercent: number;   // Snapshot of plan discount percent at enrollment time
  discountFlat: number;      // Snapshot of plan flat discount amount at enrollment time
  hotelDiscount: number;
  tourDiscount: number;
  flightDiscount: number;
  cabDiscount: number;
  notes?: string;
  enrolledBy?: string;       // Staff name who enrolled the customer
}

// ─── B2B Partner Portal Types ───

export type PartnerStatus = 'Pending Approval' | 'Active' | 'Blocked';
export type CommissionType = 'Percentage' | 'Flat_Amount';
export type PartnerCommissionStatus = 'Pending' | 'Approved' | 'Paid' | 'Rejected';

export interface Partner {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName: string;
  location?: string;
  status: PartnerStatus;
  commissionType: CommissionType;
  commissionValue: number;       // Percentage (e.g. 5) or Flat amount (e.g. 500)
  cabCommissionType?: CommissionType;
  cabCommissionValue?: number;
  busCommissionType?: CommissionType;
  busCommissionValue?: number;
  trainCommissionType?: CommissionType;
  trainCommissionValue?: number;
  flightCommissionType?: CommissionType;
  flightCommissionValue?: number;
  totalEarnings: number;         // Lifetime earnings
  pendingPayout: number;         // Unpaid approved commissions
  totalLeadsSubmitted: number;   // Total leads submitted
  totalBookingsConverted: number;// Converted bookings
  joinedDate: string;            // ISO date string
  notes?: string;
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    ifsc: string;
    upiId?: string;
  };
  // Auth – populated on login, not stored in DB response
  passwordHash?: string;
}

export interface PartnerCommission {
  id: string;
  partnerId: string;
  partnerName?: string;          // Joined from partners table
  bookingId: string;
  bookingTitle?: string;         // Joined from bookings table
  customerName?: string;         // Joined from bookings table
  bookingAmount: number;
  commissionType: CommissionType;
  commissionRate: number;        // Rate snapshot at commission creation time
  commissionAmount: number;      // Actual calculated commission
  status: PartnerCommissionStatus;
  createdAt: string;
  paidAt?: string;
  notes?: string;
}

export interface PartnerLead {
  id: string;
  partnerId: string;
  leadId: string;                // FK to main leads table
  leadName: string;
  destination: string;
  leadStatus: string;            // Mirrors the main lead status
  submittedAt: string;
  convertedToBooking: boolean;
  bookingId?: string;
}

// ─── Coupon Manager Types ───

export interface Coupon {
  id: string;
  code: string;
  type: 'ToursOnly' | 'MultiCategory';
  discountType: 'Percentage' | 'Price';
  discountValue: number;
  minBookingAmount?: number;
  validFrom?: string; // YYYY-MM-DD
  validTo?: string;   // YYYY-MM-DD
  status: 'Active' | 'Inactive' | 'Expired';
  isUsed: boolean;
  useCount: number;
  downloadCount?: number; // tracks how many times this coupon was downloaded as image/PDF
  createdAt?: string;
  updatedAt?: string;
}

export interface DailyMarketingLog {
  id: string;
  date: string;              // YYYY-MM-DD
  staffId: number;           // Mapped to staff_id in DB
  staffName?: string;        // Mapped for display
  momentumScore: number;     // calculated
  rating: 'sluggish' | 'steady' | 'high-momentum' | 'unstoppable';
  emailsSent: number;
  socialDms: number;
  callsMade: number;
  followUps: number;
  proposalsSent: number;
  dealsClosed: number;
  revenueGenerated: number;
  metaSpend: number;
  metaLeads: number;
  adCreativeNotes?: string;
  dailySummary?: string;
  keyLearnings?: string;
  createdAt?: string;
  updatedAt?: string;
  taggedLeads?: string[];     // Lead IDs tagged in this log
  taggedBookings?: string[];  // Booking IDs tagged in this log
  comments?: LogComment[];    // Comments on this log
  reactions?: LogReaction[];  // Reactions on this log
}

export interface MarketingTarget {
  id: string;
  staffId: number;
  date: string;              // YYYY-MM-DD
  targetEmails: number;
  targetDms: number;
  targetCalls: number;
  targetSpend: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LogComment {
  id: string;
  logId: string;
  staffId: number;
  staffName?: string;
  commentText: string;
  createdAt?: string;
}

export interface LogReaction {
  id: string;
  logId: string;
  staffId: number;
  reactionType: string;
  createdAt?: string;
}

export interface InAppNotification {
  id: string;
  staffId: number;
  senderId: number;
  senderName?: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt?: string;
}



