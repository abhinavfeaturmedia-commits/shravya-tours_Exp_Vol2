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
