
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

export type BookingType = 'Tour' | 'Hotel' | 'Car' | 'Bus';

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
  offerEndTime?: string; // ISO String for countdown
  included?: string[];
  notIncluded?: string[];
  builderData?: any; // To store raw Itinerary Builder state for editing
}

export interface Booking {
  id: string; // Internal ID
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
}

export interface LeadLog {
  id: string;
  type: 'Note' | 'Call' | 'Email' | 'Quote' | 'System' | 'WhatsApp';
  content: string;
  timestamp: string; // ISO String
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
  id: string;
  name: string;
  email: string;
  phone: string;
  location?: string; // Added for PDF generation
  destination: string;
  startDate?: string;
  endDate?: string; // New: Travel end date
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
  assignedTo?: number; // Staff ID
  whatsapp?: string; // WhatsApp Number
  isWhatsappSame?: boolean;
  aiScore?: number; // 0-100
  aiSummary?: string;
  serviceType?: ServiceType; // New: Type of service requested
  paxAdult?: number; // New: Number of adults
  paxChild?: number; // New: Number of children
  paxInfant?: number; // New: Number of infants
  residentialAddress?: string; // New: Residential Address
  officeAddress?: string; // New: Office Address
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
  itinerary: StaffModulePermissions;
  inventory: StaffModulePermissions; // Packages
  masters: StaffModulePermissions;
  vendors: StaffModulePermissions;
  finance: StaffModulePermissions;
  marketing: StaffModulePermissions;
  staff: StaffModulePermissions;
  reports: StaffModulePermissions;
  audit: StaffModulePermissions;
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
  date: number;
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
export type FollowUpStatus = 'Scheduled' | 'Done' | 'Pending' | 'Overdue';

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
  assignedTo: number;
  assignedBy: number;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  createdAt: string;
  completedAt?: string;
  relatedLeadId?: string;
  relatedBookingId?: string;
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
