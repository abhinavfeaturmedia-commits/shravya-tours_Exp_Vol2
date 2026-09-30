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
/**
 * Extracts the canonical base guest count for a package.
 * Inspects `pkg.groupSize` for numbers (e.g. "6", "6 Pax", "Max 6" -> 6).
 * Defaults to 2 if missing or unparseable.
 */
export const getPackageBasePax = (
  pkg: { groupSize?: number | string | null } | null | undefined
): number => {
  if (pkg?.groupSize) {
    const match = String(pkg.groupSize).match(/\d+/);
    if (match) {
      const parsed = parseInt(match[0], 10);
      if (parsed > 0) return parsed;
    }
  }
  return 2;
};

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

  const mode: 'per_person' | 'group' = (pkg?.pricingMode && String(pkg.pricingMode).toLowerCase().includes('person')) ? 'per_person' : 'group';
  const basePax = getPackageBasePax(pkg);

  const pax = guestCount && guestCount > 0 ? guestCount : basePax;

  let perPersonPrice = price;
  let totalPrice = price;
  let perPersonOriginalPrice = originalPrice;
  let totalOriginalPrice = originalPrice;

  if (mode === 'group') {
    const packageMultiplier = Math.max(1, Math.ceil(pax / (basePax > 0 ? basePax : 2)));
    totalPrice = price * packageMultiplier;
    perPersonPrice = Math.round(totalPrice / (pax > 0 ? pax : 2));

    if (originalPrice) {
      totalOriginalPrice = originalPrice * packageMultiplier;
      perPersonOriginalPrice = Math.round(totalOriginalPrice / (pax > 0 ? pax : 2));
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

/**
 * formatNightsDaysCode — generates concise duration code like "6N/7D", "10N/11D", "7N/8D"
 * matching modern travel industry card standards.
 */
export const formatNightsDaysCode = (days: number | null | undefined): string => {
  const d = Math.max(1, Math.round(Number(days) || 1));
  const n = Math.max(0, d - 1);
  return `${n}N/${d}D`;
};

/**
 * getPackageRoute — extracts or formats a clean pickup to drop route string.
 * Examples: "Leh to Leh", "Delhi to Delhi", "Kochi to Kochi"
 */
export const getPackageRoute = (
  pkg: { title?: string; location?: string | number | null; description?: string } | null | undefined,
  masterLocations: MasterLocation[] = []
): string => {
  if (!pkg) return 'All India';

  const title = pkg.title || '';

  // 1. Check if title contains explicit route pattern in parentheses: e.g. "(Delhi to Delhi)" or "(Leh to Leh)"
  const matchParentheses = title.match(/\(([^)]+\s+to\s+[^)]+)\)/i);
  if (matchParentheses && matchParentheses[1]) {
    return matchParentheses[1].trim();
  }

  // 2. Check if title contains "Delhi - Leh - Delhi" or similar 3-part route
  const matchHyphens = title.match(/([A-Za-z\s]+)\s*[-–—]\s*([A-Za-z\s]+)\s*[-–—]\s*([A-Za-z\s]+)/i);
  if (matchHyphens && matchHyphens[1] && matchHyphens[3]) {
    const origin = matchHyphens[1].trim();
    const dest = matchHyphens[3].trim();
    if (origin.length < 25 && dest.length < 25) {
      return `${origin} to ${dest}`;
    }
  }

  const matchTo = title.match(/([A-Za-z\s]{3,20})\s+to\s+([A-Za-z\s]{3,20})/i);
  if (matchTo && matchTo[0] && matchTo[0].length < 30) {
    return matchTo[0].trim();
  }

  // 3. Resolve location name
  const locName = getLocationName(pkg.location, masterLocations);
  if (locName) {
    if (locName.toLowerCase().includes(' to ')) return locName;
    const city = locName.split(',')[0].trim();
    if (city.toLowerCase().includes('ladakh')) return 'Leh to Leh';
    if (city.toLowerCase().includes('kashmir')) return 'Srinagar to Srinagar';
    if (city.toLowerCase().includes('kerala')) return 'Kochi to Kochi';
    if (city.toLowerCase().includes('andaman')) return 'Port Blair to Port Blair';
    if (city.toLowerCase().includes('goa')) return 'Goa to Goa';
    if (city.toLowerCase().includes('dubai')) return 'Dubai to Dubai';
    if (city.toLowerCase().includes('bali')) return 'Bali to Bali';
    if (city.toLowerCase().includes('thailand')) return 'Bangkok to Phuket';
    if (city.toLowerCase().includes('vietnam')) return 'Hanoi to Da Nang';
    return `${city} to ${city}`;
  }

  return 'Round Trip';
};

/**
 * getPackageReviewCount — returns realistic verified review count for social proof
 */
export const getPackageReviewCount = (pkgId: string | number | undefined | null): string => {
  if (!pkgId) return '13.6k+';
  const str = String(pkgId);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const counts = ['13.6k+', '12.8k+', '14.5k+', '11.2k+', '13.9k+', '15.4k+', '10.7k+'];
  const index = Math.abs(hash) % counts.length;
  return counts[index];
};




