export interface PaxCounts {
  adults: number;
  children: number;
  infants: number;
}

/**
 * Parses any string representation of guests/travelers (e.g. "3 Adults, 2 Children, 1 Infant", "4 Adults", "2")
 * into a structured PaxCounts object.
 */
export const parsePaxString = (val?: string | number | null, fallbackAdults = 2): PaxCounts => {
  if (val === undefined || val === null || val === '') {
    return { adults: fallbackAdults, children: 0, infants: 0 };
  }

  const str = String(val).trim();

  // If passed a simple number string like "4"
  if (/^\d+$/.test(str)) {
    const num = parseInt(str, 10);
    return { adults: isNaN(num) || num < 1 ? fallbackAdults : num, children: 0, infants: 0 };
  }

  const adultsMatch = str.match(/(\d+)\s*Adults?/i);
  const childrenMatch = str.match(/(\d+)\s*Child(ren)?/i);
  const infantsMatch = str.match(/(\d+)\s*Infants?/i);

  const adults = adultsMatch ? parseInt(adultsMatch[1], 10) : fallbackAdults;
  const children = childrenMatch ? parseInt(childrenMatch[1], 10) : 0;
  const infants = infantsMatch ? parseInt(infantsMatch[1], 10) : 0;

  return {
    adults: isNaN(adults) || adults < 1 ? fallbackAdults : adults,
    children: isNaN(children) || children < 0 ? 0 : children,
    infants: isNaN(infants) || infants < 0 ? 0 : infants,
  };
};

/**
 * Formats adults, children, and infants into a clean standard string like "3 Adults, 2 Children, 1 Infant".
 */
export const formatPaxString = (adults = 2, children = 0, infants = 0): string => {
  const safeAdults = Math.max(1, adults);
  const safeChildren = Math.max(0, children);
  const safeInfants = Math.max(0, infants);

  const parts: string[] = [];
  parts.push(`${safeAdults} Adult${safeAdults !== 1 ? 's' : ''}`);
  if (safeChildren > 0) {
    parts.push(`${safeChildren} Child${safeChildren !== 1 ? 'ren' : ''}`);
  }
  if (safeInfants > 0) {
    parts.push(`${safeInfants} Infant${safeInfants !== 1 ? 's' : ''}`);
  }
  return parts.join(', ');
};
