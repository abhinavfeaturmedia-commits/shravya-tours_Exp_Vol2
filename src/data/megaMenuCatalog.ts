import { MasterLocation, Package, TrendingDestination } from '../../types';
import { formatPrice, getLocationName, getPackagePricingInfo } from '../../utils/packageUtils';

export type MegaCategoryId = 'domestic' | 'international' | 'honeymoon';
export type PackageCategorySlug =
  | 'all'
  | 'domestic'
  | 'international'
  | 'honeymoon'
  | 'group'
  | 'seasonal'
  | 'trending'
  | 'corporate';

export interface MegaDestinationTile {
  id: string;
  name: string;
  searchTerm: string;
  regionLabel: string;
  imageUrl: string;
  fallbackStartingPrice: number;
  badge?: string;
  badgeColor?: string;
  subtitle?: string;
  categories: MegaCategoryId[];
  isBestSeller?: boolean;
  isTrending?: boolean;
}

export interface MegaCategoryConfig {
  id: MegaCategoryId;
  label: string;
  subtitle: string;
  icon: string;
  gridHeading: string;
  regionSubheading: string;
  defaultStartingPrice: number;
  accentColor: string;
  href: string;
}

export interface EnrichedDestinationTile extends MegaDestinationTile {
  startingPrice: number;
  packageCount: number;
  href: string;
  destinationId?: string;
}

export const MEGA_CATEGORIES: MegaCategoryConfig[] = [
  {
    id: 'domestic',
    label: 'Domestic Tours',
    subtitle: 'Starting From ₹ 12,999',
    icon: 'public',
    gridHeading: 'DOMESTIC TOURS DESTINATIONS',
    regionSubheading: 'INDIA',
    defaultStartingPrice: 12999,
    accentColor: '#C9732A',
    href: '/packages?category=domestic',
  },
  {
    id: 'international',
    label: 'International Tours',
    subtitle: 'Starting From ₹ 34,999',
    icon: 'flight_takeoff',
    gridHeading: 'INTERNATIONAL TOURS DESTINATIONS',
    regionSubheading: 'WORLDWIDE ESCAPES',
    defaultStartingPrice: 34999,
    accentColor: '#2D6A4F',
    href: '/packages?category=international',
  },
  {
    id: 'honeymoon',
    label: 'Honeymoon Packages',
    subtitle: 'India & International',
    icon: 'favorite',
    gridHeading: 'HONEYMOON & ROMANTIC ESCAPES',
    regionSubheading: 'CURATED FOR COUPLES',
    defaultStartingPrice: 22999,
    accentColor: '#e11d48',
    href: '/packages?category=honeymoon',
  },
];

export const CURATED_DESTINATION_TILES: MegaDestinationTile[] = [
  // ── Domestic India Destinations ──
  {
    id: 'dest-himachal',
    name: 'Himachal',
    searchTerm: 'Himachal',
    regionLabel: 'North India',
    imageUrl: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=400&q=80&auto=format&fit=crop',
    fallbackStartingPrice: 14999,
    categories: ['domestic', 'honeymoon'],
    isBestSeller: true,
    subtitle: 'Manali, Shimla & Kasol',
  },
  {
    id: 'dest-kashmir',
    name: 'Kashmir',
    searchTerm: 'Kashmir',
    regionLabel: 'North India',
    imageUrl: 'https://images.unsplash.com/photo-1598091383021-15ddea10925d?w=400&q=80&auto=format&fit=crop',
    fallbackStartingPrice: 18999,
    categories: ['domestic', 'honeymoon'],
    isBestSeller: true,
    subtitle: 'Srinagar, Gulmarg & Pahalgam',
  },
  {
    id: 'dest-uttarakhand',
    name: 'Uttarakhand',
    searchTerm: 'Uttarakhand',
    regionLabel: 'Himalayas',
    imageUrl: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=400&q=80&auto=format&fit=crop',
    fallbackStartingPrice: 15999,
    categories: ['domestic'],
    isBestSeller: true,
    subtitle: 'Nainital, Rishikesh & Mussoorie',
  },
  {
    id: 'dest-meghalaya',
    name: 'Meghalaya',
    searchTerm: 'Meghalaya',
    regionLabel: 'North East',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80&auto=format&fit=crop',
    fallbackStartingPrice: 21999,
    categories: ['domestic'],
    isTrending: true,
    subtitle: 'Shillong, Cherrapunji & Dawki',
  },
  {
    id: 'dest-spiti',
    name: 'Spiti Valley',
    searchTerm: 'Spiti',
    regionLabel: 'Himalayas',
    imageUrl: 'https://images.unsplash.com/photo-1585543805890-6051f7829f98?w=400&q=80&auto=format&fit=crop',
    fallbackStartingPrice: 19999,
    categories: ['domestic'],
    isTrending: true,
    subtitle: 'Kaza, Key Monastery & Chandratal',
  },
  {
    id: 'dest-karnataka',
    name: 'Karnataka',
    searchTerm: 'Karnataka',
    regionLabel: 'South India',
    imageUrl: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=400&q=80&auto=format&fit=crop',
    fallbackStartingPrice: 13999,
    categories: ['domestic'],
    isTrending: true,
    subtitle: 'Coorg, Chikmagalur & Hampi',
  },
  {
    id: 'dest-sikkim',
    name: 'Sikkim',
    searchTerm: 'Sikkim',
    regionLabel: 'North East',
    imageUrl: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=400&q=80&auto=format&fit=crop',
    fallbackStartingPrice: 24999,
    categories: ['domestic', 'honeymoon'],
    isBestSeller: true,
    isTrending: true,
    subtitle: 'Gangtok, Lachung & Pelling',
  },
  {
    id: 'dest-kerala',
    name: 'Kerala',
    searchTerm: 'Kerala',
    regionLabel: 'South India',
    imageUrl: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=400&q=80&auto=format&fit=crop',
    fallbackStartingPrice: 17999,
    categories: ['domestic', 'honeymoon'],
    isBestSeller: true,
    subtitle: 'Munnar, Alleppey & Kovalam',
  },
  {
    id: 'dest-arunachal',
    name: 'Arunachal',
    searchTerm: 'Arunachal',
    regionLabel: 'North East',
    imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&q=80&auto=format&fit=crop',
    fallbackStartingPrice: 29999,
    categories: ['domestic'],
    isBestSeller: true,
    isTrending: true,
    subtitle: 'Tawang, Ziro & Bomdila',
  },
  {
    id: 'dest-tamil-nadu',
    name: 'Tamil Nadu',
    searchTerm: 'Tamil Nadu',
    regionLabel: 'South India',
    imageUrl: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=400&q=80&auto=format&fit=crop',
    fallbackStartingPrice: 14999,
    categories: ['domestic'],
    isTrending: true,
    subtitle: 'Ooty, Kodaikanal & Madurai',
  },
  {
    id: 'dest-rajasthan',
    name: 'Rajasthan',
    searchTerm: 'Rajasthan',
    regionLabel: 'West India',
    imageUrl: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=400&q=80&auto=format&fit=crop',
    fallbackStartingPrice: 16999,
    categories: ['domestic', 'honeymoon'],
    subtitle: 'Jaipur, Udaipur & Jaisalmer',
  },
  {
    id: 'dest-andaman',
    name: 'Andaman',
    searchTerm: 'Andaman',
    regionLabel: 'Islands',
    imageUrl: 'https://images.unsplash.com/photo-1586500036706-41963de24d8b?w=400&q=80&auto=format&fit=crop',
    fallbackStartingPrice: 24999,
    categories: ['domestic', 'honeymoon'],
    subtitle: 'Havelock, Neil Island & Port Blair',
  },
  {
    id: 'dest-goa',
    name: 'Goa',
    searchTerm: 'Goa',
    regionLabel: 'West India',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80&auto=format&fit=crop',
    fallbackStartingPrice: 11999,
    categories: ['domestic', 'honeymoon'],
    isBestSeller: true,
    subtitle: 'Beaches, Yachts & Heritage Villas',
  },
  {
    id: 'dest-maharashtra',
    name: 'Maharashtra',
    searchTerm: 'Maharashtra',
    regionLabel: 'West India',
    imageUrl: 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=400&q=80&auto=format&fit=crop',
    fallbackStartingPrice: 7999,
    categories: ['domestic'],
    subtitle: 'Mahabaleshwar, Lonavala & Konkan',
  },
  {
    id: 'dest-ladakh',
    name: 'Leh Ladakh',
    searchTerm: 'Ladakh',
    regionLabel: 'Himalayas',
    imageUrl: 'https://images.unsplash.com/photo-1589793907316-f94025b46850?w=400&q=80&auto=format&fit=crop',
    fallbackStartingPrice: 21999,
    categories: ['domestic'],
    isTrending: true,
    subtitle: 'Pangong, Nubra & Khardung La',
  },

  // ── International Destinations ──
  {
    id: 'dest-bali',
    name: 'Bali',
    searchTerm: 'Bali',
    regionLabel: 'Southeast Asia',
    imageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&q=80&auto=format&fit=crop',
    fallbackStartingPrice: 34999,
    categories: ['international', 'honeymoon'],
    isTrending: true,
    isBestSeller: true,
    subtitle: 'Ubud Pool Villas & Nusa Penida',
  },
  {
    id: 'dest-dubai',
    name: 'Dubai',
    searchTerm: 'Dubai',
    regionLabel: 'Middle East',
    imageUrl: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&q=80&auto=format&fit=crop',
    fallbackStartingPrice: 38999,
    categories: ['international', 'honeymoon'],
    isBestSeller: true,
    subtitle: 'Burj Khalifa, Desert Safari & Marina',
  },
  {
    id: 'dest-singapore',
    name: 'Singapore',
    searchTerm: 'Singapore',
    regionLabel: 'Southeast Asia',
    imageUrl: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=400&q=80&auto=format&fit=crop',
    fallbackStartingPrice: 44999,
    badge: 'NEW',
    badgeColor: '#ef4444',
    categories: ['international'],
    isTrending: true,
    subtitle: 'Sentosa, Marina Bay & Universal',
  },
  {
    id: 'dest-thailand',
    name: 'Thailand',
    searchTerm: 'Thailand',
    regionLabel: 'Southeast Asia',
    imageUrl: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=400&q=80&auto=format&fit=crop',
    fallbackStartingPrice: 26999,
    categories: ['international', 'honeymoon'],
    isTrending: true,
    subtitle: 'Phuket, Krabi & Bangkok',
  },
  {
    id: 'dest-vietnam',
    name: 'Vietnam',
    searchTerm: 'Vietnam',
    regionLabel: 'Southeast Asia',
    imageUrl: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=400&q=80&auto=format&fit=crop',
    fallbackStartingPrice: 39999,
    categories: ['international', 'honeymoon'],
    isBestSeller: true,
    subtitle: 'Ha Long Bay, Da Nang & Phu Quoc',
  },
  {
    id: 'dest-maldives',
    name: 'Maldives',
    searchTerm: 'Maldives',
    regionLabel: 'Indian Ocean',
    imageUrl: 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=400&q=80&auto=format&fit=crop',
    fallbackStartingPrice: 54999,
    categories: ['international', 'honeymoon'],
    isBestSeller: true,
    subtitle: 'Overwater Villas & Coral Reefs',
  },
  {
    id: 'dest-switzerland',
    name: 'Switzerland',
    searchTerm: 'Switzerland',
    regionLabel: 'Europe',
    imageUrl: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=400&q=80&auto=format&fit=crop',
    fallbackStartingPrice: 114999,
    categories: ['international', 'honeymoon'],
    subtitle: 'Interlaken, Zermatt & Glacier Express',
  },
  {
    id: 'dest-bhutan',
    name: 'Bhutan',
    searchTerm: 'Bhutan',
    regionLabel: 'Himalayas',
    imageUrl: 'https://images.unsplash.com/photo-1553856622-d1b352e9a211?w=400&q=80&auto=format&fit=crop',
    fallbackStartingPrice: 32999,
    categories: ['international'],
    subtitle: 'Paro, Thimphu & Punakha',
  },
];

export const GROUP_TRIP_LINKS = [
  {
    title: 'Weekend & Road Trips',
    subtitle: 'Short 2N/3D escapes from Pune & Mumbai',
    icon: 'directions_car',
    href: '/packages?category=group&search=Weekend',
    badge: 'Popular',
  },
  {
    title: 'Himalayan Fixed Departures',
    subtitle: 'Ladakh, Spiti, Himachal & Kashmir batches',
    icon: 'hiking',
    href: '/packages?category=group',
    badge: 'Batch Dates',
  },
  {
    title: 'Backpacker & Youth Trips',
    subtitle: 'Social group tours for solo & young travelers',
    icon: 'groups',
    href: '/packages?category=group&search=Group',
  },
  {
    title: 'Family & Senior Group Tours',
    subtitle: 'Comfort-first guided group departures',
    icon: 'family_restroom',
    href: '/packages?category=domestic&search=Family',
  },
  {
    title: 'Maharashtra City Departure Hubs',
    subtitle: '100+ commercial cabs & pickups statewide',
    icon: 'location_city',
    href: '/travel-agency/pune',
  },
];

export const PACKAGE_CATEGORY_TABS: {
  id: PackageCategorySlug;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
}[] = [
  {
    id: 'all',
    label: 'All Packages',
    shortLabel: 'All',
    icon: 'travel_explore',
    description: 'Every active domestic, international & tailored itinerary',
  },
  {
    id: 'domestic',
    label: 'Domestic Tours',
    shortLabel: 'Domestic',
    icon: 'public',
    description: 'Handcrafted tours across India — Himalayas, Beaches & Heritage',
  },
  {
    id: 'international',
    label: 'International',
    shortLabel: 'International',
    icon: 'flight_takeoff',
    description: 'Seamless global holidays with visas, flights & private stays',
  },
  {
    id: 'honeymoon',
    label: 'Honeymoon',
    shortLabel: 'Honeymoon',
    icon: 'favorite',
    description: 'Private pool villas, candlelight dinners & romantic escapes',
  },
  {
    id: 'group',
    label: 'Group Trips',
    shortLabel: 'Group Trips',
    icon: 'groups',
    description: 'Curated social batches, treks & guided group departures',
  },
  {
    id: 'seasonal',
    label: 'Festive & Seasonal',
    shortLabel: 'Seasonal',
    icon: 'celebration',
    description: 'Limited-time festive offers, winter getaways & special deals',
  },
  {
    id: 'corporate',
    label: 'Corporate & MICE',
    shortLabel: 'Corporate',
    icon: 'business_center',
    description: 'Team offsites, conferences & executive retreats',
  },
];

const INTERNATIONAL_KEYWORDS = [
  'dubai',
  'uae',
  'bali',
  'indonesia',
  'singapore',
  'thailand',
  'bangkok',
  'phuket',
  'krabi',
  'maldives',
  'vietnam',
  'hanoi',
  'switzerland',
  'europe',
  'paris',
  'london',
  'bhutan',
  'nepal',
  'sri lanka',
  'malaysia',
  'mauritius',
  'baku',
  'azerbaijan',
  'georgia',
  'turkey',
  'japan',
  'australia',
  'international',
];

const DOMESTIC_KEYWORDS = [
  'india',
  'himachal',
  'manali',
  'shimla',
  'kashmir',
  'srinagar',
  'gulmarg',
  'ladakh',
  'leh',
  'uttarakhand',
  'rishikesh',
  'nainital',
  'chardham',
  'meghalaya',
  'shillong',
  'spiti',
  'karnataka',
  'coorg',
  'hampi',
  'sikkim',
  'gangtok',
  'kerala',
  'munnar',
  'alleppey',
  'kochi',
  'arunachal',
  'tawang',
  'tamil nadu',
  'ooty',
  'rajasthan',
  'jaipur',
  'udaipur',
  'jodhpur',
  'andaman',
  'goa',
  'maharashtra',
  'pune',
  'mumbai',
  'lonavala',
  'mahabaleshwar',
  'konkan',
  'agra',
  'delhi',
  'varanasi',
  'prayagraj',
  'gujarat',
  'darjeeling',
];

/**
 * Determines whether a package belongs to a domestic (India) or international location
 * using MasterLocation metadata first, then keyword fallback.
 */
export function isInternationalPackage(
  pkg: Package,
  masterLocations: MasterLocation[]
): boolean {
  const locObj = masterLocations.find(
    (l) =>
      String(l.id) === String(pkg.location) ||
      l.name.toLowerCase() === String(pkg.location || '').toLowerCase()
  );

  if (locObj?.country) {
    return locObj.country.trim().toLowerCase() !== 'india';
  }

  const resolvedLoc = getLocationName(pkg.location, masterLocations);
  const haystack = `${pkg.title || ''} ${resolvedLoc} ${pkg.location || ''} ${pkg.theme || ''} ${pkg.tag || ''}`.toLowerCase();

  if (INTERNATIONAL_KEYWORDS.some((kw) => haystack.includes(kw))) {
    return true;
  }
  if (DOMESTIC_KEYWORDS.some((kw) => haystack.includes(kw))) {
    return false;
  }
  return false;
}

/**
 * Classifies whether a Package matches a URL ?category= slug.
 */
export function matchesPackageCategory(
  pkg: Package,
  category: PackageCategorySlug,
  masterLocations: MasterLocation[]
): boolean {
  if (!category || category === 'all') return true;

  const resolvedLoc = getLocationName(pkg.location, masterLocations);
  const haystack = [
    pkg.title,
    resolvedLoc,
    pkg.location,
    pkg.theme,
    pkg.tag,
    pkg.groupSize,
    pkg.overview,
    pkg.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  switch (category) {
    case 'domestic':
      return !isInternationalPackage(pkg, masterLocations);
    case 'international':
      return isInternationalPackage(pkg, masterLocations);
    case 'honeymoon':
      return (
        /honeymoon|couple|romantic|villa|love|candlelight|newlywed/.test(haystack) ||
        /maldives|bali|switzerland|kashmir|kerala|andaman|udaipur|goa/.test(haystack)
      );
    case 'group':
      return (
        /group|batch|departure|backpack|trek|youth|friends|weekend|expedition|family/.test(haystack) ||
        pkg.pricingMode === 'per_person'
      );
    case 'seasonal':
      return (
        Boolean(pkg.offerEndTime) ||
        Boolean(pkg.originalPrice && pkg.originalPrice > pkg.price) ||
        /xmas|christmas|new year|winter|monsoon|summer|festive|diwali|sale|offer|special|hot|bestseller/.test(haystack)
      );
    case 'corporate':
      return /corporate|mice|offsite|conference|retreat|team|executive|business/.test(haystack);
    case 'trending':
      return /trending|popular|bestseller|hot|top/.test(haystack) || (pkg.remainingSeats !== undefined && pkg.remainingSeats <= 12);
    default:
      return true;
  }
}

/**
 * Normalizes raw ?category= query strings (including legacy links like ?category=International)
 * into canonical PackageCategorySlug values.
 */
export function normalizeCategorySlug(raw: string | null | undefined): PackageCategorySlug {
  if (!raw) return 'all';
  const v = raw.trim().toLowerCase();
  if (v === 'domestic' || v === 'domestic tours') return 'domestic';
  if (v === 'international' || v === 'international tours') return 'international';
  if (v === 'honeymoon' || v === 'honeymoon packages') return 'honeymoon';
  if (v === 'group' || v === 'group trips') return 'group';
  if (v === 'seasonal' || v === 'festive' || v === 'xmas' || v === 'deals') return 'seasonal';
  if (v === 'corporate' || v === 'mice') return 'corporate';
  if (v === 'trending') return 'trending';
  return 'all';
}

/**
 * Computes live starting price and matching active package count for a destination tile.
 */
export function enrichDestinationTiles(
  tiles: MegaDestinationTile[],
  packages: Package[],
  masterLocations: MasterLocation[],
  trendingDestinations: TrendingDestination[],
  category: MegaCategoryId
): EnrichedDestinationTile[] {
  const activePkgs = packages.filter((p) => !p.status || p.status === 'Active');

  return tiles
    .filter((tile) => tile.categories.includes(category))
    .map((tile) => {
      const q = tile.searchTerm.toLowerCase();
      const matchingPkgs = activePkgs.filter((p) => {
        const loc = getLocationName(p.location, masterLocations).toLowerCase();
        const title = (p.title || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return loc.includes(q) || title.includes(q) || desc.includes(q);
      });

      const matchingTrend = trendingDestinations.find(
        (td) => td.isActive !== false && td.name.toLowerCase().includes(q)
      );

      let startingPrice = tile.fallbackStartingPrice;
      if (matchingPkgs.length > 0) {
        const prices = matchingPkgs
          .map((p) => getPackagePricingInfo(p).perPersonPrice || p.price)
          .filter((price) => price > 0);
        if (prices.length > 0) {
          startingPrice = Math.min(...prices);
        }
      }

      const packageCount = matchingPkgs.length || matchingTrend?.packageCount || 0;
      const href = `/packages?category=${category}&search=${encodeURIComponent(tile.searchTerm)}`;

      return {
        ...tile,
        imageUrl: matchingTrend?.imageUrl || tile.imageUrl,
        badge: matchingTrend?.badge || tile.badge,
        badgeColor: matchingTrend?.badgeColor || tile.badgeColor,
        startingPrice,
        packageCount,
        destinationId: matchingTrend?.id,
        href,
      };
    });
}

/**
 * Builds the Trending column items for the mega-menu from live DB trendingDestinations + curated items.
 */
export function getMegaMenuTrendingList(
  packages: Package[],
  masterLocations: MasterLocation[],
  trendingDestinations: TrendingDestination[]
): {
  id: string;
  name: string;
  sublabel: string;
  badge?: string;
  badgeColor?: string;
  href: string;
  imageUrl?: string;
}[] {
  const activePkgs = packages.filter((p) => !p.status || p.status === 'Active');
  const seen = new Set<string>();
  const items: {
    id: string;
    name: string;
    sublabel: string;
    badge?: string;
    badgeColor?: string;
    href: string;
    imageUrl?: string;
  }[] = [];

  // 1. Live DB trending destinations first
  trendingDestinations
    .filter((td) => td.isActive !== false)
    .forEach((td) => {
      const key = td.name.toLowerCase();
      seen.add(key);
      const count = td.packageIds?.length || td.packageCount || 0;
      const matchingPkgs = activePkgs.filter((p) => {
        const loc = getLocationName(p.location, masterLocations).toLowerCase();
        return loc.includes(key) || (p.title || '').toLowerCase().includes(key);
      });
      const minPrice = matchingPkgs.length
        ? Math.min(...matchingPkgs.map((p) => getPackagePricingInfo(p).perPersonPrice || p.price).filter((n) => n > 0))
        : 0;

      const sublabel =
        minPrice > 0
          ? `Starting From ${formatPrice(minPrice)}`
          : count > 0
          ? `${count}+ Itineraries`
          : td.statLabel || `${td.country || 'Curated'} Tours`;

      items.push({
        id: td.id,
        name: td.name,
        sublabel,
        badge: td.badge,
        badgeColor: td.badgeColor,
        href: `/packages?destinationId=${encodeURIComponent(td.id)}`,
        imageUrl: td.imageUrl,
      });
    });

  // 2. Fill with curated trending tiles not already included
  CURATED_DESTINATION_TILES.filter((t) => t.isTrending).forEach((tile) => {
    const key = tile.name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    items.push({
      id: tile.id,
      name: tile.name,
      sublabel: `Starting From ${formatPrice(tile.fallbackStartingPrice)}`,
      badge: tile.badge,
      badgeColor: tile.badgeColor,
      href: `/packages?search=${encodeURIComponent(tile.searchTerm)}`,
      imageUrl: tile.imageUrl,
    });
  });

  return items;
}

/**
 * Builds the Best Selling column items with live starting prices.
 */
export function getMegaMenuBestSellingList(
  packages: Package[],
  masterLocations: MasterLocation[],
  category: MegaCategoryId
): {
  id: string;
  name: string;
  sublabel: string;
  href: string;
}[] {
  const activePkgs = packages.filter((p) => !p.status || p.status === 'Active');
  const categoryBest = CURATED_DESTINATION_TILES.filter(
    (t) => t.isBestSeller && t.categories.includes(category)
  );
  const pool =
    categoryBest.length >= 5
      ? categoryBest
      : [
          ...categoryBest,
          ...CURATED_DESTINATION_TILES.filter(
            (t) => t.isBestSeller && !categoryBest.some((b) => b.id === t.id)
          ),
        ];

  return pool.slice(0, 6).map((tile) => {
    const q = tile.searchTerm.toLowerCase();
    const matched = activePkgs.filter((p) => {
      const loc = getLocationName(p.location, masterLocations).toLowerCase();
      return loc.includes(q) || (p.title || '').toLowerCase().includes(q);
    });
    const minPrice = matched.length
      ? Math.min(...matched.map((p) => getPackagePricingInfo(p).perPersonPrice || p.price).filter((n) => n > 0))
      : tile.fallbackStartingPrice;

    return {
      id: tile.id,
      name: tile.name,
      sublabel: `Starting From ${formatPrice(minPrice)}`,
      href: `/packages?category=${category}&search=${encodeURIComponent(tile.searchTerm)}`,
    };
  });
}

/**
 * Returns the seasonal pill label based on the current month.
 */
export function getSeasonalMenuPill(): { label: string; badgeText: string; href: string } {
  const month = new Date().getMonth(); // 0 = Jan, 10 = Nov, 11 = Dec
  if (month === 10 || month === 11 || month === 0) {
    return {
      label: 'Xmas & New Year',
      badgeText: 'FESTIVE',
      href: '/packages?category=seasonal',
    };
  }
  if (month >= 5 && month <= 8) {
    return {
      label: 'Monsoon Specials',
      badgeText: 'DEALS',
      href: '/packages?category=seasonal',
    };
  }
  if (month >= 2 && month <= 4) {
    return {
      label: 'Summer Escapes',
      badgeText: 'HOT',
      href: '/packages?category=seasonal',
    };
  }
  return {
    label: 'Festive & Deals',
    badgeText: 'OFFERS',
    href: '/packages?category=seasonal',
  };
}
