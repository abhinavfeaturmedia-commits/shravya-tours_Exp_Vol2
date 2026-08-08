import { formatTripDuration } from '../utils/packageUtils';

export type TourCategoryType = 'Heritage' | 'Hills' | 'Beach' | 'Spiritual' | 'Wildlife' | 'Honeymoon';

export interface TourPackage {
  id: string;
  name: string;
  categoryId: TourCategoryType;
  destination: string;
  duration: string; // e.g. "6 Days / 5 Nights"
  daysCount: number;
  startingPrice: number;
  badge?: string;
  image: string;
  fallbackImage: string;
  inclusions: string[]; // e.g. ["3★/4★ Hotels", "Private Vehicle", "Meals Included", "Sightseeing"]
  highlights: string[];
  idealFor: string;
  description: string;
}

export interface TourCategory {
  id: TourCategoryType;
  name: string;
  displayName: string;
  tagline: string;
  icon: string;
  count: number;
  topPackages: string[];
  image: string;
  color: string;
}

export const TOUR_CATEGORIES: TourCategory[] = [
  {
    id: 'Heritage',
    name: 'Heritage & Culture',
    displayName: 'Heritage & Culture',
    tagline: 'Royal palaces, magnificent forts & rich Indian history',
    icon: 'castle',
    count: 14,
    topPackages: ['Royal Rajasthan Heritage', 'Golden Triangle Circuit', 'South India Temple & Heritage'],
    image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&q=80&auto=format&fit=crop',
    color: 'from-amber-600 to-yellow-800'
  },
  {
    id: 'Hills',
    name: 'Hills & Mountains',
    displayName: 'Hills & Mountains',
    tagline: 'Cool mountain escapes, scenic valleys & majestic peaks',
    icon: 'landscape',
    count: 18,
    topPackages: ['Himachal Scenic Escape', 'Kashmir Paradise Valley', 'Leh Ladakh Expedition'],
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80&auto=format&fit=crop',
    color: 'from-emerald-600 to-teal-800'
  },
  {
    id: 'Beach',
    name: 'Beach & Leisure',
    displayName: 'Beach & Leisure',
    tagline: 'Sun-drenched beaches, pristine oceans & tranquil backwaters',
    icon: 'beach_access',
    count: 12,
    topPackages: ['Goa Party & Beach Holiday', 'Kerala Backwaters & Houseboat', 'Andaman Island Magic'],
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80&auto=format&fit=crop',
    color: 'from-cyan-600 to-blue-800'
  },
  {
    id: 'Spiritual',
    name: 'Pilgrimage & Yatra',
    displayName: 'Pilgrimage & Spiritual',
    tagline: 'Sacred temples, holy shrines & soul-stirring spiritual yatras',
    icon: 'temple_hindu',
    count: 16,
    topPackages: ['Chardham Yatra Express', 'Jyotirlinga Darshan Tour', 'South India Temple Circuit'],
    image: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=800&q=80&auto=format&fit=crop',
    color: 'from-orange-600 to-amber-700'
  },
  {
    id: 'Wildlife',
    name: 'Wildlife & Safari',
    displayName: 'Wildlife & Safari',
    tagline: 'Thrilling jungle safaris, tiger reserves & wilderness adventures',
    icon: 'pets',
    count: 10,
    topPackages: ['Jim Corbett Tiger Safari', 'Ranthambore Jungle Safari', 'Gir National Park Tour'],
    image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80&auto=format&fit=crop',
    color: 'from-lime-700 to-green-900'
  },
  {
    id: 'Honeymoon',
    name: 'Honeymoon & Luxury',
    displayName: 'Honeymoon & Couples',
    tagline: 'Romantic retreats, luxury villas & unforgettable memories for two',
    icon: 'favorite',
    count: 15,
    topPackages: ['Kashmir Luxury Honeymoon', 'Bali Tropical Villa Escapes', 'Switzerland Dream Tour'],
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80&auto=format&fit=crop',
    color: 'from-rose-600 to-pink-800'
  }
];

export const TOUR_PACKAGES: TourPackage[] = [
  // HERITAGE
  {
    id: 'pkg-royal-rajasthan',
    name: 'Royal Rajasthan Heritage Circuit',
    categoryId: 'Heritage',
    destination: 'Rajasthan (Jaipur, Jodhpur, Udaipur)',
    duration: '7 Days / 6 Nights',
    daysCount: 7,
    startingPrice: 18999,
    badge: 'Popular Family Special',
    image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&q=80&auto=format&fit=crop',
    fallbackImage: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800&q=80&auto=format&fit=crop',
    inclusions: ['3★/4★ Heritage Hotels', 'Private AC Sedan/SUV', 'Daily Breakfast & Dinner', 'Fort & Palace Tickets', 'Tour Escort'],
    highlights: ['Amber Fort Elephant Ride / Jeep', 'Lake Pichola Sunset Boat Cruise', 'Mehrangarh Fort Guided Tour', 'Cultural Folk Dance Night'],
    idealFor: 'Families, Couples & Cultural Enthusiasts',
    description: 'Experience royal grandeur across Jaipur, Jodhpur, and Udaipur with luxury palace stays, authentic Rajasthani cuisine, and private chauffeur-driven comfort.'
  },
  {
    id: 'pkg-golden-triangle',
    name: 'Golden Triangle Express',
    categoryId: 'Heritage',
    destination: 'Delhi - Agra - Jaipur',
    duration: '5 Days / 4 Nights',
    daysCount: 5,
    startingPrice: 13999,
    badge: 'Best Seller',
    image: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&q=80&auto=format&fit=crop',
    fallbackImage: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=80&auto=format&fit=crop',
    inclusions: ['4★ Star Hotels', 'Private Chauffeur Car', 'Breakfast Included', 'Taj Mahal Sunrise Ticket'],
    highlights: ['Sunrise view at Taj Mahal', 'Fatehpur Sikri Heritage Walk', 'Qutub Minar & Red Fort', 'Jaipur City Palace & Hawa Mahal'],
    idealFor: 'First-time travellers & Short Vacations',
    description: 'India\'s quintessential heritage trail connecting the political and cultural capitals: Delhi, Agra\'s Taj Mahal, and Jaipur\'s Pink City.'
  },
  {
    id: 'pkg-south-heritage',
    name: 'South India Temple & Heritage Circuit',
    categoryId: 'Heritage',
    destination: 'Mysore - Hampi - Madurai - Tanjore',
    duration: '6 Days / 5 Nights',
    daysCount: 6,
    startingPrice: 16499,
    badge: 'Cultural Highlight',
    image: 'https://images.unsplash.com/photo-1600100397608-f010e423b971?w=800&q=80&auto=format&fit=crop',
    fallbackImage: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&q=80&auto=format&fit=crop',
    inclusions: ['3★ Premium Stays', 'Dedicated Transport', 'Breakfast & Dinner', 'Archaeology Guide'],
    highlights: ['UNESCO Hampi Ruins Tour', 'Mysore Palace Illumination', 'Madurai Meenakshi Temple', 'Thanjavur Brihadisvara Temple'],
    idealFor: 'History Buffs & Families',
    description: 'Explore Dravidian architecture, ancient stone sculptures, and grand royal palaces of Southern dynasties.'
  },

  // HILLS
  {
    id: 'pkg-himachal-scenic',
    name: 'Himachal Scenic Escape (Shimla & Manali)',
    categoryId: 'Hills',
    destination: 'Shimla & Manali',
    duration: '6 Days / 5 Nights',
    daysCount: 6,
    startingPrice: 14999,
    badge: 'Trending Nature Escapes',
    image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&q=80&auto=format&fit=crop',
    fallbackImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80&auto=format&fit=crop',
    inclusions: ['Deluxe Valley View Stays', 'Private Vehicle transfers', 'MAP Meals (Breakfast & Dinner)', 'Solang Valley Sightseeing'],
    highlights: ['Solang Valley Snow Activities', 'Atal Tunnel Experience', 'Mall Road Shimla & Jakhoo Temple', 'Hadimba Temple & Club House'],
    idealFor: 'Honeymooners, Youth & Families',
    description: 'Cool mountain breezes, pine-scented valleys, and thrilling snow activities across Shimla, Kufri, Manali, and Solang Valley.'
  },
  {
    id: 'pkg-kashmir-paradise',
    name: 'Kashmir Paradise Valley & Houseboat',
    categoryId: 'Hills',
    destination: 'Srinagar, Gulmarg, Pahalgam',
    duration: '6 Days / 5 Nights',
    daysCount: 6,
    startingPrice: 19999,
    badge: 'All-Time Favorite',
    image: 'https://images.unsplash.com/photo-1598091383021-15ddea10925d?w=800&q=80&auto=format&fit=crop',
    fallbackImage: 'https://images.unsplash.com/photo-1566837945700-30057527ade0?w=800&q=80&auto=format&fit=crop',
    inclusions: ['Dal Lake Luxury Houseboat Stay', 'Gulmarg Gondola Ride Ticket', 'Private Cab for Transfers', 'Breakfast & Dinner'],
    highlights: ['Shikara Ride on Dal Lake', 'Gulmarg Cable Car (Gondola)', 'Betaab Valley & Aru Valley', 'Mughal Gardens Srinagar'],
    idealFor: 'Couples, Families & Photography Lovers',
    description: 'Immerse in heaven on earth with romantic Shikara rides, snowcapped mountains, and luxury stays on Dal Lake.'
  },
  {
    id: 'pkg-leh-ladakh',
    name: 'Leh Ladakh High Altitude Expedition',
    categoryId: 'Hills',
    destination: 'Leh, Nubra Valley, Pangong Tso',
    duration: '7 Days / 6 Nights',
    daysCount: 7,
    startingPrice: 24999,
    badge: 'Adventure Special',
    image: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?w=800&q=80&auto=format&fit=crop',
    fallbackImage: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&q=80&auto=format&fit=crop',
    inclusions: ['Luxury Camps & Boutique Hotels', 'Oxygen Cylinder equipped SUV', 'Permits Included', 'Daily Meals'],
    highlights: ['Pangong Lake Camping', 'Khardung La Highest Motorable Pass', 'Diskit Monastery & Hunder Dunes', 'Magnetic Hill & Sangam Point'],
    idealFor: 'Adventure Seekers & Explorers',
    description: 'Conquer highest motorable passes, marvel at crystal blue Pangong Lake, and experience double-hump camel safaris in Nubra Dunes.'
  },

  // BEACH
  {
    id: 'pkg-goa-beach',
    name: 'Goa Party & Beach Retreat',
    categoryId: 'Beach',
    destination: 'North & South Goa',
    duration: '4 Days / 3 Nights',
    daysCount: 4,
    startingPrice: 9999,
    badge: 'Budget Friendly',
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&q=80&auto=format&fit=crop',
    fallbackImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80&auto=format&fit=crop',
    inclusions: ['4★ Resort near Beach with Pool', 'Airport Pickup & Drop', 'Mandovi River Sunset Cruise', 'Daily Breakfast'],
    highlights: ['Baga & Calangute Beach Watersports', 'Mandovi River DJ Cruise', 'Old Goa Churches & Spice Plantation', 'Dudhsagar Waterfalls Trek Option'],
    idealFor: 'Friends Groups, Couples & Solo Travellers',
    description: 'Relax on sunlit palm beaches, enjoy thrilling water sports, taste spicy Konkani seafood, and sail on sunset cruises.'
  },
  {
    id: 'pkg-kerala-backwaters',
    name: 'Kerala Backwaters & Houseboat Magic',
    categoryId: 'Beach',
    destination: 'Munnar, Thekkady, Alleppey',
    duration: '5 Days / 4 Nights',
    daysCount: 5,
    startingPrice: 15999,
    badge: 'Serene Nature',
    image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&q=80&auto=format&fit=crop',
    fallbackImage: 'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?w=800&q=80&auto=format&fit=crop',
    inclusions: ['Private Deluxe Houseboat (Alleppey)', 'Hill Resort Munnar', 'Private AC Car Transfers', 'All Meals on Houseboat'],
    highlights: ['Overnight Cruise on Alleppey Backwaters', 'Munnar Tea Plantation Walk', 'Periyar Wildlife Sanctuary Boat Ride', 'Kathakali & Kalaripayattu Show'],
    idealFor: 'Couples & Nature Lovers',
    description: 'Cruise through emerald palm-fringed lagoons on a private houseboat and relax amidst misty tea gardens in Munnar.'
  },
  {
    id: 'pkg-andaman-islands',
    name: 'Andaman Island Coral Reef Experience',
    categoryId: 'Beach',
    destination: 'Port Blair, Havelock, Neil Island',
    duration: '6 Days / 5 Nights',
    daysCount: 6,
    startingPrice: 22999,
    badge: 'Tropical Island Special',
    image: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=800&q=80&auto=format&fit=crop',
    fallbackImage: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80&auto=format&fit=crop',
    inclusions: ['Beachfront Resorts', 'Makruzz Cruise Ferry Tickets', 'Scuba Diving / Snorkeling Trial', 'Breakfast Included'],
    highlights: ['Radhanagar Beach Sunset', 'Scuba Diving at Elephant Beach', 'Cellular Jail Light & Sound Show', 'Natural Coral Bridge Neil Island'],
    idealFor: 'Honeymooners & Water Sports Enthusiasts',
    description: 'Pristine turquoise waters, white sand beaches, and vibrant coral reefs in India\'s tropical island paradise.'
  },

  // SPIRITUAL
  {
    id: 'pkg-chardham-yatra',
    name: 'Chardham Yatra Sacred Circuit',
    categoryId: 'Spiritual',
    destination: 'Yamunotri, Gangotri, Kedarnath, Badrinath',
    duration: '10 Days / 9 Nights',
    daysCount: 10,
    startingPrice: 28999,
    badge: 'Divine Pilgrimage',
    image: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=800&q=80&auto=format&fit=crop',
    fallbackImage: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&q=80&auto=format&fit=crop',
    inclusions: ['Clean Pilgrimage Hotel Stays', 'Dedicated Tempo Traveller / SUV', 'Kedarnath VIP Darshan Pass Support', 'Sattvik Meals'],
    highlights: ['Kedarnath Jyotirlinga Temple Trek/Helicopter', 'Badrinath Temple & Mana Village', 'Gangotri & Yamunotri Holy Dips', 'Haridwar Ganga Aarti'],
    idealFor: 'Elders, Families & Devotees',
    description: 'The ultimate holy pilgrimage across Garhwal Himalayas for spiritual salvation, divine blessings, and serene mountain darshans.'
  },
  {
    id: 'pkg-jyotirlinga-tour',
    name: 'Maharashtra 5 Jyotirlinga Pilgrimage',
    categoryId: 'Spiritual',
    destination: 'Nashik, Trimbakeshwar, Shirdi, Bhimashankar, Grishneshwar',
    duration: '5 Days / 4 Nights',
    daysCount: 5,
    startingPrice: 12999,
    badge: 'Popular Yatra',
    image: 'https://images.unsplash.com/photo-1609946727706-0331083a992e?w=800&q=80&auto=format&fit=crop',
    fallbackImage: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=800&q=80&auto=format&fit=crop',
    inclusions: ['3★ Hotel Accommodations', 'Private AC Bus/Car', 'Shirdi VIP Pass Option', 'Breakfast & Dinner'],
    highlights: ['Trimbakeshwar & Bhimashankar Shiva Shrines', 'Shirdi Sai Baba Temple VIP Darshan', 'Ellora Caves & Grishneshwar', 'Panchavati & Godavari Ghats'],
    idealFor: 'Devotees & Senior Citizens',
    description: 'Complete 5 sacred Jyotirlinga temples in Maharashtra along with Shirdi Sai Baba blessings in comfort.'
  },

  // WILDLIFE
  {
    id: 'pkg-corbett-safari',
    name: 'Jim Corbett Tiger Safari Expedition',
    categoryId: 'Wildlife',
    destination: 'Jim Corbett National Park (Uttarakhand)',
    duration: '3 Days / 2 Nights',
    daysCount: 3,
    startingPrice: 8999,
    badge: 'Weekend Wildlife Special',
    image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80&auto=format&fit=crop',
    fallbackImage: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&q=80&auto=format&fit=crop',
    inclusions: ['Jungle Resort Stay with Pool', 'Open 4x4 Jeep Safari Permit', 'All Resort Meals Included', 'Nature Walk Escort'],
    highlights: ['Morning Open Jeep Safari in Corbett Zone', 'Kosi River Nature Walk & Bonfire', 'Corbett Waterfall & Museum', 'Birdwatching Tour'],
    idealFor: 'Wildlife Photographers, Families & Youth',
    description: 'Thrilling open 4x4 Jeep safaris into India\'s oldest tiger national park, luxury resort stays, and Kosi river walks.'
  },
  {
    id: 'pkg-ranthambore-safari',
    name: 'Ranthambore Tiger Reserve Tour',
    categoryId: 'Wildlife',
    destination: 'Ranthambore (Sawai Madhopur, Rajasthan)',
    duration: '3 Days / 2 Nights',
    daysCount: 3,
    startingPrice: 10499,
    badge: 'Tiger Sightseeing',
    image: 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=800&q=80&auto=format&fit=crop',
    fallbackImage: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80&auto=format&fit=crop',
    inclusions: ['Heritage Wildlife Lodge', '2 Jungle Canter / Jeep Safaris', 'Breakfast & Dinner', 'Station Pickup'],
    highlights: ['Royal Bengal Tiger Sighting Safari', 'Ranthambore Fort Trek', 'Padam Talao Lake Sightseeing', 'Rajasthani Cultural Performance'],
    idealFor: 'Adventure & Nature Enthusiasts',
    description: 'Unforgettable wilderness safari in royal hunting grounds turned tiger sanctuary surrounded by ancient fort ruins.'
  },

  // HONEYMOON
  {
    id: 'pkg-kashmir-luxury-honeymoon',
    name: 'Kashmir Luxury Romantic Escapes',
    categoryId: 'Honeymoon',
    destination: 'Srinagar, Gulmarg, Sonamarg',
    duration: '6 Days / 5 Nights',
    daysCount: 6,
    startingPrice: 26999,
    badge: 'Honeymoon Bestseller',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80&auto=format&fit=crop',
    fallbackImage: 'https://images.unsplash.com/photo-1598091383021-15ddea10925d?w=800&q=80&auto=format&fit=crop',
    inclusions: ['Super Luxury Houseboat Suite', 'Honeymoon Cake & Flower Bed Decor', 'Private Audi/Innova Chauffeur', 'Candlelight Dinner'],
    highlights: ['Romantic Candlelight Dinner on Houseboat', 'Private Decorated Shikara Ride', 'Gulmarg Gondola Snow Experience', 'Couples Photography Session'],
    idealFor: 'Newlyweds & Romantic Couples',
    description: 'Unmatched romance in Kashmir with luxury houseboat suites, private candlelight dining, flower decorations, and snowcapped memories.'
  },
  {
    id: 'pkg-bali-villas',
    name: 'Bali Tropical Villa & Island Dreams',
    categoryId: 'Honeymoon',
    destination: 'Bali (Ubud, Kuta, Seminyak)',
    duration: '6 Days / 5 Nights',
    daysCount: 6,
    startingPrice: 34999,
    badge: 'International Luxury',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80&auto=format&fit=crop',
    fallbackImage: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80&auto=format&fit=crop',
    inclusions: ['Private Pool Villa in Ubud', 'Floating Breakfast & Spa', 'Airport Pickup & Daily Chauffeur', 'Inter-island Speedboat'],
    highlights: ['Floating Breakfast in Private Pool', 'Couples Balinese Spa Treatment', 'Nusa Penida Kelingking Beach Tour', 'Tanah Lot Sunset Temple'],
    idealFor: 'Couples & International Seekers',
    description: 'Private pool villas, floating breakfasts, tropical jungle swings, and romantic sunsets on Bali\'s iconic beaches.'
  }
];

export function getTourCatalogFromPackages(realPackages: any[] = []): { categories: TourCategory[]; packages: TourPackage[] } {
  if (!realPackages || realPackages.length === 0) {
    return { categories: TOUR_CATEGORIES, packages: TOUR_PACKAGES };
  }

  // Filter only active or valid packages if status is defined
  const validPkgs = realPackages.filter(p => !p.status || p.status === 'Active');

  if (validPkgs.length === 0) {
    return { categories: TOUR_CATEGORIES, packages: TOUR_PACKAGES };
  }

  const mappedPackages: TourPackage[] = validPkgs.map((p) => {
    const rawTheme = (p.theme || p.tag || p.location || 'Heritage').toLowerCase();
    let categoryId: TourCategoryType = 'Heritage';

    if (rawTheme.includes('hill') || rawTheme.includes('mountain') || rawTheme.includes('snow') || rawTheme.includes('scenic') || rawTheme.includes('kashmir') || rawTheme.includes('himachal') || rawTheme.includes('manali') || rawTheme.includes('ladakh')) {
      categoryId = 'Hills';
    } else if (rawTheme.includes('beach') || rawTheme.includes('island') || rawTheme.includes('sea') || rawTheme.includes('ocean') || rawTheme.includes('goa') || rawTheme.includes('andaman') || rawTheme.includes('kerala')) {
      categoryId = 'Beach';
    } else if (rawTheme.includes('spiritual') || rawTheme.includes('yatra') || rawTheme.includes('temple') || rawTheme.includes('pilgrim') || rawTheme.includes('chardham') || rawTheme.includes('jyotirlinga')) {
      categoryId = 'Spiritual';
    } else if (rawTheme.includes('wild') || rawTheme.includes('safari') || rawTheme.includes('jungle') || rawTheme.includes('tiger') || rawTheme.includes('corbett') || rawTheme.includes('ranthambore') || rawTheme.includes('gir')) {
      categoryId = 'Wildlife';
    } else if (rawTheme.includes('honey') || rawTheme.includes('love') || rawTheme.includes('romance') || rawTheme.includes('luxury') || rawTheme.includes('villa') || rawTheme.includes('couple')) {
      categoryId = 'Honeymoon';
    } else {
      categoryId = 'Heritage';
    }

    const durationStr = formatTripDuration({ nights: p.days ? Math.max(0, p.days - 1) : 4, days: p.days || 5 });
    
    // Normalize inclusions
    const inclusionsList = Array.isArray(p.included) && p.included.length > 0
      ? p.included
      : ['3★/4★ Stays', 'Private Transfers', 'Daily Breakfast', 'Sightseeing'];

    // Normalize highlights
    const highlightsList = Array.isArray(p.highlights)
      ? p.highlights.map((h: any) => typeof h === 'string' ? h : (h?.label || 'Sightseeing Tour'))
      : ['Top Sightseeing Tour', 'Guided Local Experience', 'Curated Itinerary'];

    return {
      id: p.id,
      name: p.title || p.name || 'Custom Tour Package',
      categoryId,
      destination: p.location || 'India',
      duration: durationStr,
      daysCount: p.days || 5,
      startingPrice: p.price || 9999,
      badge: p.tag || (p.originalPrice ? 'Special Discount' : undefined),
      image: p.image || 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&q=80&auto=format&fit=crop',
      fallbackImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80&auto=format&fit=crop',
      inclusions: inclusionsList,
      highlights: highlightsList,
      idealFor: p.groupSize || 'Families & Couples',
      description: p.overview || p.description || ''
    };
  });

  // Calculate dynamic count & top packages per category
  const dynamicCategories: TourCategory[] = TOUR_CATEGORIES.map(cat => {
    const catPackages = mappedPackages.filter(p => p.categoryId === cat.id);
    const count = catPackages.length;
    const topPackages = catPackages.slice(0, 3).map(p => p.name);

    return {
      ...cat,
      count: count > 0 ? count : cat.count,
      topPackages: topPackages.length > 0 ? topPackages : cat.topPackages
    };
  });

  return { categories: dynamicCategories, packages: mappedPackages };
}
