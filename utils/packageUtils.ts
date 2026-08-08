import { MasterLocation } from '../types';

// UUID v4 regex — more reliable than the length+dash heuristic
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves a package location value to a human-readable name.
 * Handles both UUID references (looked up in masterLocations) and plain text strings.
 */
export const getLocationName = (
  locationValue: string | number | undefined | null,
  masterLocations: MasterLocation[]
): string => {
  if (!locationValue) return '';
  const strVal = String(locationValue);
  const found = masterLocations.find(l => String(l.id) === strVal);
  if (found) return found.name;
  return strVal;
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

export interface TripDurationInfo {
  nights: number;
  days: number;
}

/**
 * calculateTripDuration — canonical duration calculator for Shravya Tours.
 * Calculates exact nights and days given start/end dates, daysCount, or nightsCount.
 * 
 * Rules:
 *  - 2026-08-15 to 2026-08-16 => 1 Night, 2 Days
 *  - 2026-08-15 to 2026-08-15 => 0 Nights, 1 Day
 *  - daysCount = 2 => 1 Night, 2 Days
 *  - nightsCount = 1 => 1 Night, 2 Days
 */
export const calculateTripDuration = (
  startDate?: string | Date | null,
  endDate?: string | Date | null,
  daysCount?: number | string | null,
  nightsCount?: number | string | null
): TripDurationInfo => {
  let nights = 0;
  let days = 1;

  if (startDate) {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : start;
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
      const diffMs = end.getTime() - start.getTime();
      nights = Math.max(0, Math.round(diffMs / 86400000));
      days = nights + 1;
      return { nights, days };
    }
  }

  if (nightsCount !== undefined && nightsCount !== null && !isNaN(Number(nightsCount))) {
    nights = Math.max(0, Math.round(Number(nightsCount)));
    days = nights + 1;
    return { nights, days };
  }

  if (daysCount !== undefined && daysCount !== null && !isNaN(Number(daysCount))) {
    days = Math.max(1, Math.round(Number(daysCount)));
    nights = Math.max(0, days - 1);
    return { nights, days };
  }

  return { nights: 0, days: 1 };
};

/**
 * formatTripDuration — canonical trip duration text formatter.
 * Standard format: "1 Night & 2 Days", "2 Nights & 3 Days", "1 Day"
 * 
 * @example formatTripDuration({ nights: 1, days: 2 }) → "1 Night & 2 Days"
 * @example formatTripDuration({ nights: 2, days: 3 }) → "2 Nights & 3 Days"
 * @example formatTripDuration({ nights: 0, days: 1 }) → "1 Day"
 */
export const formatTripDuration = (
  duration: TripDurationInfo | { nights?: number | null; days?: number | null } | null | undefined
): string => {
  if (!duration) return '1 Day';
  const nights = duration.nights ?? (duration.days ? Math.max(0, duration.days - 1) : 0);
  const days = duration.days ?? (nights + 1);

  if (nights <= 0) {
    return `${days} ${days === 1 ? 'Day' : 'Days'}`;
  }

  const nightStr = `${nights} ${nights === 1 ? 'Night' : 'Nights'}`;
  const dayStr = `${days} ${days === 1 ? 'Day' : 'Days'}`;
  return `${nightStr} & ${dayStr}`;
};

/**
 * formatTripDurationCompact — compact badge version for tight headers.
 * 
 * @example formatTripDurationCompact({ nights: 1, days: 2 }) → "1N & 2D"
 */
export const formatTripDurationCompact = (
  duration: TripDurationInfo | { nights?: number | null; days?: number | null } | null | undefined
): string => {
  if (!duration) return '1D';
  const nights = duration.nights ?? (duration.days ? Math.max(0, duration.days - 1) : 0);
  const days = duration.days ?? (nights + 1);

  if (nights <= 0) return `${days}D`;
  return `${nights}N & ${days}D`;
};

export interface FormattedPackagePricing {
  perPersonPrice: number;
  perPersonOriginalPrice?: number;
  totalPrice: number;
  totalOriginalPrice?: number;
  paxCount: number;
  pricingMode: 'per_person' | 'group';
  perPersonFormatted: string;
  perPersonCompact: string;
  totalFormatted: string;
  totalCompact: string;
  savingsPercent?: number;
}

/**
 * getPackagePricingInfo — calculates canonical per-person and total pricing for any package.
 * Implements Travel UI/UX Pricing Psychology rules:
 *  - Primary focus is ALWAYS the Per Person Price.
 *  - Handles both 'group' (total package rate) and 'per_person' pricing modes smoothly.
 * 
 * @example getPackagePricingInfo({ price: 69367, pricingMode: 'group' }, 2)
 *          → { perPersonPrice: 34684, perPersonFormatted: "₹34,684", perPersonCompact: "₹34.7k", totalPrice: 69367, totalFormatted: "₹69,367" }
 */
export const getPackagePricingInfo = (
  pkg: {
    price?: number | string | null;
    originalPrice?: number | string | null;
    pricingMode?: 'per_person' | 'group' | string | null;
    groupSize?: number | string | null;
  } | null | undefined,
  guestCount?: number | null
): FormattedPackagePricing => {
  const rawPrice = typeof pkg?.price === 'string' ? parseFloat(pkg.price) : (pkg?.price ?? 0);
  const price = isNaN(rawPrice) ? 0 : Math.round(rawPrice);

  const rawOrigPrice = typeof pkg?.originalPrice === 'string' ? parseFloat(pkg.originalPrice) : (pkg?.originalPrice ?? 0);
  const originalPrice = isNaN(rawOrigPrice) || rawOrigPrice <= 0 ? undefined : Math.round(rawOrigPrice);

  const mode: 'per_person' | 'group' = pkg?.pricingMode === 'per_person' ? 'per_person' : 'group';

  let pax = guestCount && guestCount > 0 ? guestCount : 2;
  if (!guestCount && pkg?.groupSize) {
    const match = String(pkg.groupSize).match(/\d+/);
    if (match) {
      const parsed = parseInt(match[0], 10);
      if (parsed > 0) pax = parsed;
    }
  }

  let perPersonPrice = price;
  let totalPrice = price;
  let perPersonOriginalPrice = originalPrice;
  let totalOriginalPrice = originalPrice;

  if (mode === 'group') {
    totalPrice = price;
    perPersonPrice = Math.round(price / (pax > 0 ? pax : 2));

    if (originalPrice) {
      totalOriginalPrice = originalPrice;
      perPersonOriginalPrice = Math.round(originalPrice / (pax > 0 ? pax : 2));
    }
  } else {
    // per_person mode
    perPersonPrice = price;
    totalPrice = price * pax;

    if (originalPrice) {
      perPersonOriginalPrice = originalPrice;
      totalOriginalPrice = originalPrice * pax;
    }
  }

  let savingsPercent: number | undefined;
  if (originalPrice && originalPrice > price) {
    savingsPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
  }

  return {
    perPersonPrice,
    perPersonOriginalPrice,
    totalPrice,
    totalOriginalPrice,
    paxCount: pax,
    pricingMode: mode,
    perPersonFormatted: formatPrice(perPersonPrice),
    perPersonCompact: formatPriceCompact(perPersonPrice),
    totalFormatted: formatPrice(totalPrice),
    totalCompact: formatPriceCompact(totalPrice),
    savingsPercent,
  };
};



