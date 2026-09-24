export interface GstState {
  code: string;
  name: string;
}

export const INDIAN_GST_STATES: GstState[] = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' }
];

/**
 * Resolves the 2-digit financial year format for Indian tax years (1st April to 31st March).
 * e.g. 15th August 2026 -> '26-27'
 * e.g. 15th February 2026 -> '25-26'
 */
export function getIndianFinancialYear(dateInput?: string | Date | null): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  const month = validDate.getMonth(); // 0 = Jan, 3 = Apr, 11 = Dec
  const year = validDate.getFullYear();
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;
  return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
}

/**
 * Returns clean prefix for a document type
 */
export function getDocPrefix(docType: string, customPrefix?: string): string {
  const type = (docType || 'Invoice').trim().toLowerCase();
  if (type === 'invoice' || type === 'tax invoice') return (customPrefix || 'ST').trim().toUpperCase();
  if (type === 'proforma' || type === 'proforma invoice') return 'PI';
  if (type === 'quotation' || type === 'quote') return 'QT';
  if (type === 'creditnote' || type === 'credit note' || type === 'credit_note') return 'CN';
  if (type === 'receipt' || type === 'receipt voucher') return 'RC';
  return (customPrefix || 'ST').trim().toUpperCase();
}

/**
 * Formats a GST compliant sequential invoice number (≤ 16 chars).
 * e.g. 'ST/25-26/0001'
 */
export function formatGstInvoiceNumber(prefix: string, fy: string, seq: number): string {
  const cleanPrefix = (prefix || 'ST').trim().toUpperCase();
  const padded = String(seq).padStart(4, '0');
  return `${cleanPrefix}/${fy}/${padded}`;
}

/**
 * GSTIN Validator: 15-character alphanumeric pattern
 * Structure: 2-digit State Code + 10-digit PAN + 1-digit entity number + 'Z' + 1-digit checksum
 */
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function isValidGstin(gstin: string): boolean {
  if (!gstin) return false;
  return GSTIN_REGEX.test(gstin.trim().toUpperCase());
}

/**
 * Extracts State and State Code from client GSTIN
 */
export function getStateFromGstin(gstin: string): GstState | null {
  if (!gstin || gstin.length < 2) return null;
  const stateCode = gstin.trim().slice(0, 2);
  const matched = INDIAN_GST_STATES.find(s => s.code === stateCode);
  return matched || null;
}

/**
 * Indian GST SAC (Services Accounting Code) structure for Tours, Travel & Cab Bookings.
 * Default SAC code is 996601: Passenger Vehicle Rental with Operator (Cab/Taxi bookings).
 */
export interface SacCodeItem {
  code: string;
  name: string;
  shortName: string;
  category: 'Cab & Vehicle Rental' | 'Tour Operator & Packages' | 'Travel Agency & Ticketing' | 'Accommodation & Stays' | 'Other Travel Services';
  gstRate: number; // Standard applicable GST rate in %
  gstRateDescription: string;
  description: string;
}

export const DEFAULT_SAC_CODE = '996601';

export const INDIAN_TOUR_TRAVEL_SAC_CODES: SacCodeItem[] = [
  {
    code: '996601',
    name: 'Rental Services of Passenger Vehicles with Operators',
    shortName: 'Cab / Taxi Booking with Driver',
    category: 'Cab & Vehicle Rental',
    gstRate: 5,
    gstRateDescription: '5% (without ITC) or 12% (with ITC)',
    description: 'Chauffeur-driven cab booking, outstation car rentals, airport transfers, city taxis, hourly rentals.'
  },
  {
    code: '996602',
    name: 'Rental Services of Buses and Coaches with Operators',
    shortName: 'Bus / Tempo Traveler Rental',
    category: 'Cab & Vehicle Rental',
    gstRate: 5,
    gstRateDescription: '5% (without ITC) or 12% (with ITC)',
    description: 'Mini-bus, tempo traveler, luxury tourist coach rental with operator for group & corporate journeys.'
  },
  {
    code: '996411',
    name: 'Local Passenger Transportation Services by Road',
    shortName: 'Local Road Passenger Transport',
    category: 'Cab & Vehicle Rental',
    gstRate: 5,
    gstRateDescription: '5% (without ITC)',
    description: 'Point-to-point road passenger transportation by metered cabs, app taxis, or stage carriages.'
  },
  {
    code: '996412',
    name: 'Sightseeing & Non-scheduled Passenger Transportation',
    shortName: 'Sightseeing Passenger Transport',
    category: 'Cab & Vehicle Rental',
    gstRate: 5,
    gstRateDescription: '5% (without ITC)',
    description: 'Dedicated sightseeing transport, chartered tourist bus circuits, special event passenger road transport.'
  },
  {
    code: '998555',
    name: 'Tour Operator Services',
    shortName: 'Tour Package / Holiday Package',
    category: 'Tour Operator & Packages',
    gstRate: 5,
    gstRateDescription: '5% (without ITC on composite package)',
    description: 'Bundled holiday itineraries including tour arrangement, guided sightseeing, accommodation, and transport.'
  },
  {
    code: '998551',
    name: 'Travel Agency Services for Passenger Transport Reservation',
    shortName: 'Flight / Train / Bus Ticket Booking',
    category: 'Travel Agency & Ticketing',
    gstRate: 18,
    gstRateDescription: '18% on agency service fees / markup',
    description: 'Arranging passenger transport tickets (flights, railways, luxury buses), travel itinerary curation.'
  },
  {
    code: '998552',
    name: 'Travel Agency Services for Accommodation Reservation',
    shortName: 'Hotel & Resort Booking Services',
    category: 'Travel Agency & Ticketing',
    gstRate: 18,
    gstRateDescription: '18% on facilitation commission / service charge',
    description: 'Facilitating hotel room reservations, vacation rental bookings, resort stays.'
  },
  {
    code: '996311',
    name: 'Room or Unit Accommodation Services',
    shortName: 'Hotel Accommodation Tariff',
    category: 'Accommodation & Stays',
    gstRate: 12,
    gstRateDescription: '12% (tariffs ₹1,000–₹7,500/night) or 18% (>₹7,500)',
    description: 'Direct room tariffs for hotel, resort, guest house, or homestay accommodations.'
  },
  {
    code: '998559',
    name: 'Tourist Guide & Other Travel Assistance Services',
    shortName: 'Tourist Guide & Travel Assistance',
    category: 'Other Travel Services',
    gstRate: 18,
    gstRateDescription: '18% standard rate',
    description: 'Certified tourist guides, safari trackers, trekking leaders, visa consultation, baggage assistance.'
  }
];

export function getSacDetails(code?: string): SacCodeItem | undefined {
  if (!code) return undefined;
  const clean = code.trim();
  return INDIAN_TOUR_TRAVEL_SAC_CODES.find(s => s.code === clean);
}

export function formatSacDisplay(code?: string): string {
  if (!code) return DEFAULT_SAC_CODE;
  const item = getSacDetails(code);
  return item ? `${item.code} (${item.shortName})` : code;
}

