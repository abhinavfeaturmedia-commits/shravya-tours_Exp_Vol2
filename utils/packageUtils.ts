import { MasterLocation } from '../types';

// UUID v4 regex — more reliable than the length+dash heuristic
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves a package location value to a human-readable name.
 * Handles both UUID references (looked up in masterLocations) and plain text strings.
 */
export const getLocationName = (
  locationValue: string | undefined | null,
  masterLocations: MasterLocation[]
): string => {
  if (!locationValue) return '';
  if (UUID_REGEX.test(locationValue)) {
    const found = masterLocations.find(l => l.id === locationValue);
    return found ? found.name : locationValue;
  }
  return locationValue;
};

/**
 * formatPrice — canonical price formatter for the entire app.
 *
 * WHY: MySQL stores prices as DECIMAL(10,2). JavaScript receives these as
 * floating-point numbers (e.g. 20569.50). Displaying them raw shows unwanted
 * decimals. We always want whole-rupee display with Indian comma grouping.
 *
 * Rules:
 *  - Rounds to nearest whole number (Math.round).
 *  - Uses Indian locale (en-IN) so thousands are grouped as lakhs (e.g. ₹1,20,000).
 *  - Returns "₹0" for null/undefined/NaN input.
 *
 * @example formatPrice(20569.50) → "₹20,570"
 * @example formatPrice(100000)   → "₹1,00,000"
 */
export const formatPrice = (value: number | string | null | undefined): string => {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (isNaN(num)) return '₹0';
  const rounded = Math.round(num);
  return '₹' + rounded.toLocaleString('en-IN');
};

/**
 * formatPriceCompact — short format for dashboard KPIs and tight spaces.
 *
 * @example formatPriceCompact(250000)  → "₹2.5L"
 * @example formatPriceCompact(45000)   → "₹45k"
 * @example formatPriceCompact(500)     → "₹500"
 */
export const formatPriceCompact = (value: number | string | null | undefined): string => {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (isNaN(num)) return '₹0';
  const rounded = Math.round(num);
  if (rounded >= 100000) return `₹${(rounded / 100000).toFixed(rounded % 100000 === 0 ? 0 : 1)}L`;
  if (rounded >= 1000) return `₹${(rounded / 1000).toFixed(rounded % 1000 === 0 ? 0 : 1)}k`;
  return `₹${rounded}`;
};

