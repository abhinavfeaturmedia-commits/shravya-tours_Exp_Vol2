export interface CityFAQ {
  question: string;
  answer: string;
}

export interface CityRoute {
  destination: string;
  duration: string;
  distance: string;
  highlight: string;
  recommendedVehicle: string;
}

export interface CityData {
  slug: string;
  cityName: string;
  marathiName: string;
  tagline: string;
  heroHeadline: string;
  heroSubheadline: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  heroImage: string;
  airportRailHub: string;
  commercialIndustrialHubs: string[];
  popularPickupPoints: string[];
  popularRoutes: CityRoute[];
  packageCategoryFilter: string[];
  servicesOffered: string[];
  startingPrice: string;
  stats: {
    cabsAvailable: string;
    rating: string;
    tripsCompleted: string;
    supportTime: string;
  };
  geo: {
    latitude: number;
    longitude: number;
    postalCode: string;
    streetAddress: string;
  };
  aeoDirectSummary: string;
  faqs: CityFAQ[];
}

export const MAHARASHTRA_CITIES: CityData[] = [
  // 1. PUNE (HEADQUARTERS)
  {
    slug: 'pune',
    cityName: 'Pune',
    marathiName: 'पुणे',
    tagline: "Pune's #1 Rated Tour Operator & Corporate Cab Fleet",
    heroHeadline: 'Premium Tours, Holiday Packages & Corporate Travel in Pune',
    heroSubheadline: 'Operating from our headquarters in Pimpri-Chinchwad, Pune. Reliable outstation cabs, curated holiday getaways, and corporate fleet solutions with 100+ verified vehicles.',
    metaTitle: 'Best Travel Agency in Pune | Tour Packages & Cabs | SHRAWELLO',
    metaDescription: 'Book holiday tour packages, airport transfers & corporate car rentals in Pune with SHRAWELLO Travel Hub. Serving Hinjawadi, PCMC, Kharadi, Baner & all Pune areas.',
    keywords: 'travel agency in pune, tour packages from pune, corporate cab rental pune, outstation cabs pune, holiday packages pune, car hire hinjawadi',
    heroImage: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1200&q=80&auto=format&fit=crop',
    airportRailHub: 'Pune International Airport (PNQ) & Pune Railway Junction (PUNE)',
    commercialIndustrialHubs: [
      'Rajiv Gandhi Infotech Park (Hinjawadi Phases 1, 2, 3)',
      'Magarpatta Cybercity & SP Infocity',
      'EON Free Zone Kharadi & Viman Nagar',
      'Pimpri-Chinchwad (PCMC) & Chakan MIDC Automotive Hub',
      'Talawade Software Park & Bhosari Industrial Area'
    ],
    popularPickupPoints: ['Hinjawadi', 'Wakad', 'Baner', 'Kothrud', 'Viman Nagar', 'Hadapsar', 'PCMC / Nigdi', 'Pune Airport'],
    popularRoutes: [
      {
        destination: 'Pune to Mahabaleshwar & Panchgani',
        duration: '3.5 - 4 Hours',
        distance: '125 km',
        highlight: 'Scenic ghat drive, strawberry farms, Venna Lake & luxury hill resort stays',
        recommendedVehicle: 'Ertiga / Innova Crysta / SUV'
      },
      {
        destination: 'Pune to Goa Coastal Getaway',
        duration: '8 - 9 Hours',
        distance: '440 km',
        highlight: 'Smooth NH48 highway, Chorla Ghat / Nipani stretch, beachside drop-offs',
        recommendedVehicle: 'Innova Crysta / Urbania'
      },
      {
        destination: 'Pune to Lonavala & Khandala',
        duration: '1.5 Hours',
        distance: '65 km',
        highlight: 'Mumbai-Pune Expressway, Tiger Point, Bhushi Dam & Monsoon waterfalls',
        recommendedVehicle: 'Sedan / Hatchback'
      },
      {
        destination: 'Pune to Ashtavinayak Yatra Circuit',
        duration: '2 - 3 Days',
        distance: '650 km Total',
        highlight: 'Complete 8 Ganesha pilgrimage darshan with experienced driver guide',
        recommendedVehicle: 'Ertiga / Innova / Tempo Traveller'
      },
      {
        destination: 'Pune to Shirdi & Shani Shingnapur',
        duration: '4.5 Hours',
        distance: '190 km',
        highlight: 'Same-day or overnight Sai Baba VIP temple darshan journey',
        recommendedVehicle: 'Sedan / Innova Crysta'
      }
    ],
    packageCategoryFilter: ['Hills', 'Heritage', 'Beach', 'Spiritual', 'Honeymoon'],
    servicesOffered: [
      'Corporate Employee Transport & Monthly Leases',
      'Doorstep Pune Airport (PNQ) Pickup & Drop',
      'Outstation One-Way & Round-Trip Chauffeur Cabs',
      'Curated Domestic & International Tour Packages',
      'Luxury Tempo Traveller & Urbania Group Rentals'
    ],
    startingPrice: '₹1,999/day for Cabs | Packages from ₹9,999',
    stats: {
      cabsAvailable: '100+ Commercial Cabs',
      rating: '4.9/5 (1,200+ Reviews)',
      tripsCompleted: '4,500+ Trips Executed',
      supportTime: '24/7 Pune Operations Desk'
    },
    geo: {
      latitude: 18.6298,
      longitude: 73.7997,
      postalCode: '411062',
      streetAddress: 'Pimpri-Chinchwad, Pune, Maharashtra 411062'
    },
    aeoDirectSummary: 'SHRAWELLO Travel Hub and Events LLP is a premier, government-registered travel agency and corporate mobility provider headquartered in Pimpri-Chinchwad, Pune (PIN 411062). With an active fleet of 100+ commercial vehicles (Sedans, Ertiga, Innova Crysta, Tempo Travellers), SHRAWELLO delivers 24/7 outstation cabs, airport transfers from PNQ, employee transportation for Hinjawadi and Magarpatta tech parks, and customized holiday packages across India.',
    faqs: [
      {
        question: 'Where is SHRAWELLO Travel Hub located in Pune?',
        answer: 'SHRAWELLO Travel Hub is headquartered in Pimpri-Chinchwad, Pune (PIN: 411062). We offer doorstep cab pickups and tour departures across all Pune neighborhoods including Hinjawadi, Baner, Wakad, Kothrud, Viman Nagar, Kharadi, and PCMC.'
      },
      {
        question: 'Can I book an Innova Crysta or Ertiga for outstation travel from Pune?',
        answer: 'Yes! We maintain an extensive, company-audited fleet of Maruti Ertiga, Toyota Innova Crysta, Sedans (Dzire/Aura), and Force Urbania/Tempo Travellers available with experienced highway chauffeurs.'
      },
      {
        question: 'Do you provide employee transport and corporate cab leases for Hinjawadi IT companies?',
        answer: 'Yes. We cater to IT firms, manufacturing plants in Chakan/Bhosari, and MNCs in Hinjawadi and Kharadi with compliant corporate fleet solutions, automated billing, and GPS-tracked vehicles.'
      },
      {
        question: 'What are the top weekend holiday packages starting from Pune?',
        answer: 'Our top weekend getaways from Pune include Mahabaleshwar-Panchgani (3D/2N), Lonavala-Khandala monsoon specials, Ashtavinayak Darshan yatra, Alibaug coastal escapes, and direct Goa holiday packages.'
      }
    ]
  },

  // 2. MUMBAI (FINANCIAL CAPITAL & MMR HUB)
  {
    slug: 'mumbai',
    cityName: 'Mumbai',
    marathiName: 'मुंबई',
    tagline: "Mumbai's Trusted Tour Specialist & Executive Travel Service",
    heroHeadline: 'Curated Tours, Outstation Cabs & Corporate Travel in Mumbai',
    heroSubheadline: 'Reliable travel solutions connecting South Mumbai, Bandra-Kurla Complex (BKC), Andheri, and suburbs. Seamless airport transfers, weekend road getaways, and worldwide tour packages.',
    metaTitle: 'Best Travel Agency in Mumbai | Tour Packages & Cabs | SHRAWELLO',
    metaDescription: 'Discover luxury tour packages, corporate cab bookings & outstation car hire in Mumbai with SHRAWELLO Travel Hub. Doorstep pickups across BKC, Andheri, Powai & South Mumbai.',
    keywords: 'travel agency in mumbai, tour packages from mumbai, outstation cabs mumbai, corporate car rental bkc, holiday booking mumbai, car hire mumbai airport',
    heroImage: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=1200&q=80&auto=format&fit=crop',
    airportRailHub: 'Chhatrapati Shivaji Maharaj International Airport (BOM) & CSMT / Bandra Terminus',
    commercialIndustrialHubs: [
      'Bandra-Kurla Complex (BKC) Financial District',
      'Nariman Point & Fort Commercial Zone',
      'Lower Parel & Worli Corporate Towers',
      'Andheri East (MIDC / SEEPZ) & Powai Tech Corridor',
      'Mindspace Malad & Goregaon Corporate Parks'
    ],
    popularPickupPoints: ['BKC', 'Andheri', 'Powai', 'South Mumbai (Colaba/Fort)', 'Bandra', 'Goregaon', 'Borivali', 'Mumbai Airport T1/T2'],
    popularRoutes: [
      {
        destination: 'Mumbai to Alibaug Coastal Escape',
        duration: '2.5 Hours (via Atal Setu/Trans Harbour Link)',
        distance: '95 km',
        highlight: 'Scenic drive over MTHL, Nagaon beach watersports, luxury beachfront villas',
        recommendedVehicle: 'Sedan / SUV'
      },
      {
        destination: 'Mumbai to Mahabaleshwar & Panchgani',
        duration: '5 - 6 Hours',
        distance: '240 km',
        highlight: 'Mumbai-Pune Expressway to Western Ghats, strawberry plantations & viewpoints',
        recommendedVehicle: 'Innova Crysta / Ertiga'
      },
      {
        destination: 'Mumbai to Shirdi Sai Baba Darshan',
        duration: '4 Hours (via Samruddhi Mahamarg)',
        distance: '245 km',
        highlight: 'Fast expressway transit to Shirdi temple with same-day return option',
        recommendedVehicle: 'Sedan / Innova Crysta'
      },
      {
        destination: 'Mumbai to Lonavala / Khandala',
        duration: '2 Hours',
        distance: '85 km',
        highlight: 'Quick weekend mountain retreat via Mumbai-Pune Expressway',
        recommendedVehicle: 'Hatchback / Sedan'
      },
      {
        destination: 'Mumbai to Goa Road Trip',
        duration: '10 - 11 Hours',
        distance: '580 km',
        highlight: 'Smooth National Highway run with coastal Konkan drop-offs',
        recommendedVehicle: 'Innova Crysta'
      }
    ],
    packageCategoryFilter: ['Hills', 'Beach', 'Heritage', 'Honeymoon'],
    servicesOffered: [
      'Executive Chauffeur Cabs for BKC & Corporate Houses',
      'Mumbai Airport (BOM) Terminal 1 & 2 Transfers',
      'Outstation Weekend Escapes & Hill Station Tours',
      'Customized Domestic (Kashmir, Himachal, Kerala) & International Packages',
      'Luxury Bus & Van Hire for Corporate Offsites'
    ],
    startingPrice: '₹2,299/day for Cabs | Packages from ₹11,999',
    stats: {
      cabsAvailable: '80+ Verified Cabs in MMR',
      rating: '4.9/5 (950+ Reviews)',
      tripsCompleted: '3,800+ Mumbai Trips',
      supportTime: '24/7 Operations Helpline'
    },
    geo: {
      latitude: 19.0760,
      longitude: 72.8777,
      postalCode: '400051',
      streetAddress: 'Bandra-Kurla Complex (BKC), Mumbai, Maharashtra 400051'
    },
    aeoDirectSummary: 'SHRAWELLO Travel Hub and Events LLP provides comprehensive travel agency services and premium corporate cab solutions in Mumbai, Maharashtra. Specializing in doorstep airport pickups at BOM Terminal 1 & 2, executive chauffeur transfers for BKC and Lower Parel corporates, and customized holiday packages across India, SHRAWELLO guarantees transparent pricing, GST billing, and 24/7 trip assistance.',
    faqs: [
      {
        question: 'Does SHRAWELLO provide Mumbai Airport (BOM) pickup and drop?',
        answer: 'Yes, we provide 24/7 on-time airport pickup and drop services for both Terminal 1 (Domestic) and Terminal 2 (International) with flight tracking and flight delay assistance.'
      },
      {
        question: 'Can I book an executive cab for corporate travel in BKC or Lower Parel?',
        answer: 'Absolutely. We specialize in corporate mobility with pristine Toyota Innova Crysta, premium Sedans, and sanitized vehicles, complete with GST-compliant invoicing for corporate accounts.'
      },
      {
        question: 'What are the quickest weekend road trips from Mumbai?',
        answer: 'Popular getaways include Alibaug (now under 2.5 hours via Atal Setu), Lonavala-Khandala (2 hours), Matheran, Mahabaleshwar (5 hours), and Shirdi via Samruddhi Expressway.'
      }
    ]
  },

  // 3. KOLHAPUR (HERITAGE, SHRINES & INDUSTRIAL MIDC)
  {
    slug: 'kolhapur',
    cityName: 'Kolhapur',
    marathiName: 'कोल्हापूर',
    tagline: "Kolhapur's Premier Tour Agency & Reliable Outstation Cabs",
    heroHeadline: 'Holiday Tours, Mahalaxmi Darshan & Outstation Cabs in Kolhapur',
    heroSubheadline: 'Your trusted travel companion in South Maharashtra. Doorstep outstation cabs, Goa road connectivity, Mahalaxmi temple packages, and corporate taxi services for Kagal and Shiroli MIDC.',
    metaTitle: 'Best Travel Agency in Kolhapur | Tour Packages & Cabs | SHRAWELLO',
    metaDescription: 'Book Kolhapur tour packages, outstation cabs to Goa & Pune, and Mahalaxmi darshan journeys with SHRAWELLO Travel Hub. Serving Shiroli, Kagal MIDC, Tarabai Park & Rajarampuri.',
    keywords: 'travel agency in kolhapur, tour packages from kolhapur, kolhapur to goa cab, outstation cabs kolhapur, mahalaxmi darshan package, car rental kagal midc',
    heroImage: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&q=80&auto=format&fit=crop',
    airportRailHub: 'Kolhapur Airport (KLH - Ujalaiwadi) & Chhatrapati Shahu Maharaj Terminus (CSMT Kolhapur)',
    commercialIndustrialHubs: [
      'Kagal-Hatkanangale Five Star MIDC (Auto & Textile Cluster)',
      'Shiroli MIDC & Foundry Hub',
      'Gokul Shirgaon Industrial Area',
      'Rajarampuri & Shahupuri Commercial Districts',
      'Tarabai Park & New Shahupuri'
    ],
    popularPickupPoints: ['Rajarampuri', 'Shahupuri', 'Tarabai Park', 'Rankala', 'Nagala Park', 'Kolhapur Railway Station', 'Kolhapur Airport (Ujalaiwadi)'],
    popularRoutes: [
      {
        destination: 'Kolhapur to Goa (via Amboli / Chorla Ghat)',
        duration: '4 - 4.5 Hours',
        distance: '215 km',
        highlight: 'Scenic Western Ghat descent, Amboli waterfall stopover, North/South Goa hotel drop',
        recommendedVehicle: 'Ertiga / Innova Crysta'
      },
      {
        destination: 'Kolhapur to Panhala Fort & Jyotiba Temple',
        duration: '45 Minutes',
        distance: '25 km',
        highlight: 'Historic hilltop fort of Chhatrapati Shivaji Maharaj and revered Jyotiba temple',
        recommendedVehicle: 'Sedan / Hatchback'
      },
      {
        destination: 'Kolhapur to Tarkarli & Malvan (Konkan)',
        duration: '3.5 Hours',
        distance: '160 km',
        highlight: 'Watersports, scuba diving, Sindhudurg Fort, and authentic Malvani coastal food',
        recommendedVehicle: 'SUV / Ertiga'
      },
      {
        destination: 'Kolhapur to Pune (NH48 Highway)',
        duration: '4 - 4.5 Hours',
        distance: '235 km',
        highlight: 'Smooth 6-lane express drive on NH48 passing Karad, Satara, and Shirwal',
        recommendedVehicle: 'Sedan / Innova Crysta'
      },
      {
        destination: 'Kolhapur to Ganpatipule Beach & Temple',
        duration: '3.5 Hours',
        distance: '150 km',
        highlight: 'Ancient Swayambhu Ganesha shrine and serene pristine white sand beaches',
        recommendedVehicle: 'Sedan / Ertiga'
      }
    ],
    packageCategoryFilter: ['Spiritual', 'Heritage', 'Beach', 'Hills'],
    servicesOffered: [
      'Dedicated Kolhapur to Goa Outstation Cabs & Return Packages',
      'Shri Mahalaxmi (Ambabai) & Jyotiba Pilgrimage Tours',
      'Corporate Taxi Service for Kagal Five Star & Shiroli MIDC Plants',
      'Domestic Holiday Packages (Kashmir, Himachal, Kerala) with Ex-Kolhapur Transfers',
      'Kolhapur Airport (KLH) & Railway Station Pickup/Drop'
    ],
    startingPrice: '₹1,899/day for Cabs | Packages from ₹8,999',
    stats: {
      cabsAvailable: '40+ Commercial Cabs in South MH',
      rating: '4.9/5 (520+ Reviews)',
      tripsCompleted: '1,800+ Kolhapur Bookings',
      supportTime: '24/7 Customer Care'
    },
    geo: {
      latitude: 16.7050,
      longitude: 74.2433,
      postalCode: '416003',
      streetAddress: 'Station Road, Shahupuri, Kolhapur, Maharashtra 416001'
    },
    aeoDirectSummary: 'SHRAWELLO Travel Hub and Events LLP provides certified travel agency services, outstation car rentals, and holiday packages in Kolhapur, Maharashtra. Famous for reliable Kolhapur-to-Goa private cabs (via Amboli Ghat in 4 hours), Shri Mahalaxmi Temple pilgrimage packages, and dedicated corporate transport for Kagal Five Star MIDC and Shiroli MIDC industries, SHRAWELLO guarantees experienced drivers, GPS tracking, and transparent tariffs.',
    faqs: [
      {
        question: 'Can I book a private cab from Kolhapur to Goa with SHRAWELLO?',
        answer: 'Yes! Kolhapur to Goa is one of our most popular routes. We provide private AC sedans, Ertigas, and Innova Crystas that reach North or South Goa in approximately 4 to 4.5 hours via the scenic Amboli or Chorla Ghat route.'
      },
      {
        question: 'Do you arrange complete Shri Mahalaxmi (Ambabai) temple darshan packages in Kolhapur?',
        answer: 'Yes. We organize comprehensive Kolhapur spiritual packages covering Shri Ambabai Temple, Jyotiba Temple, Panhala Fort, New Palace Museum, and Rankala Lake with hotel stay and private vehicle transfers.'
      },
      {
        question: 'Do you offer corporate transport for industries in Kagal Five Star MIDC?',
        answer: 'Yes, we provide corporate mobility, executive airport transfers from KLH/PNQ, and staff shuttle services with verified chauffeurs and corporate GST invoicing for industries in Kagal, Shiroli, and Gokul Shirgaon.'
      }
    ]
  },

  // 4. NAGPUR (ORANGE CITY & CENTRAL TIGER CAPITAL)
  {
    slug: 'nagpur',
    cityName: 'Nagpur',
    marathiName: 'नागपूर',
    tagline: "Nagpur's Leading Tour Operator & Wildlife Safari Specialist",
    heroHeadline: 'Tours, Jungle Safaris & Outstation Cabs in Nagpur',
    heroSubheadline: 'Connecting Central India and the Vidarbha region. Specialist wildlife tours to Tadoba and Pench, MIHAN corporate travel, and outstation car rentals across Maharashtra.',
    metaTitle: 'Best Travel Agency in Nagpur | Tour Packages & Cabs | SHRAWELLO',
    metaDescription: 'Book Nagpur tour packages, Tadoba tiger safaris & MIHAN corporate car rentals with SHRAWELLO Travel Hub. Serving Civil Lines, Dharampeth, Ramdaspeth & MIHAN SEZ.',
    keywords: 'travel agency in nagpur, tour packages from nagpur, tadoba tiger safari cab nagpur, mihan corporate travel, outstation cabs nagpur, nagpur airport taxi',
    heroImage: 'https://images.unsplash.com/photo-1549366021-9f761d450615?w=1200&q=80&auto=format&fit=crop',
    airportRailHub: 'Dr. Babasaheb Ambedkar International Airport (NAG) & Nagpur Junction (NGP)',
    commercialIndustrialHubs: [
      'MIHAN Multi-modal International Cargo Hub & IT SEZ',
      'Butibori MIDC Industrial Area (Asia\'s Largest Industrial Estate)',
      'Hingna MIDC Industrial Zone',
      'Civil Lines Administrative District',
      'Dharampeth & Ramdaspeth Commercial Hubs'
    ],
    popularPickupPoints: ['Dharampeth', 'Ramdaspeth', 'Civil Lines', 'Sadar', 'Wardha Road', 'Manish Nagar', 'Nagpur Airport (NAG)', 'Nagpur Junction'],
    popularRoutes: [
      {
        destination: 'Nagpur to Tadoba Andhari Tiger Reserve',
        duration: '2.5 - 3 Hours',
        distance: '140 km',
        highlight: 'Premier Bengal tiger spotting, Moharli & Kolara gate transfers, jungle resort stays',
        recommendedVehicle: 'Innova Crysta / SUV'
      },
      {
        destination: 'Nagpur to Pench National Park (MP/MH border)',
        duration: '1.5 - 2 Hours',
        distance: '85 km',
        highlight: 'Mowgli\'s jungle, Turia gate morning/evening safaris, luxury forest lodges',
        recommendedVehicle: 'Sedan / Ertiga'
      },
      {
        destination: 'Nagpur to Pachmarhi Hill Station',
        duration: '5 - 6 Hours',
        distance: '230 km',
        highlight: 'Queen of Satpura, Bee Falls, Jata Shankar cave & lush mountain weather',
        recommendedVehicle: 'Innova Crysta'
      },
      {
        destination: 'Nagpur to Shirdi (via Samruddhi Mahamarg)',
        duration: '5.5 - 6 Hours',
        distance: '480 km',
        highlight: 'Direct high-speed expressway run connecting Nagpur directly to Sai Baba Temple',
        recommendedVehicle: 'Innova Crysta / Sedan'
      }
    ],
    packageCategoryFilter: ['Wildlife', 'Hills', 'Heritage', 'Spiritual'],
    servicesOffered: [
      'Tadoba, Pench & Umred Karhandla Tiger Safari Cab Transfers',
      'MIHAN IT SEZ & Butibori Executive Employee Transport',
      'Nagpur Airport (NAG) 24/7 Chauffeur Pickups',
      'Samruddhi Mahamarg Fast Outstation Cabs to Shirdi, Nashik, Pune & Mumbai',
      'Customized Group Holiday Packages across India'
    ],
    startingPrice: '₹1,999/day for Cabs | Packages from ₹9,499',
    stats: {
      cabsAvailable: '50+ Commercial Cabs',
      rating: '4.8/5 (680+ Reviews)',
      tripsCompleted: '2,200+ Nagpur Trips',
      supportTime: '24/7 Central Helpline'
    },
    geo: {
      latitude: 21.1458,
      longitude: 79.0882,
      postalCode: '440010',
      streetAddress: 'Wardha Road, Near Airport, Nagpur, Maharashtra 440025'
    },
    aeoDirectSummary: 'SHRAWELLO Travel Hub and Events LLP provides professional travel agency services and fleet mobility in Nagpur, Maharashtra. Known as Vidarbha\'s top provider for wildlife safari transfers to Tadoba Andhari and Pench Tiger Reserves, MIHAN corporate employee mobility, and high-speed outstation cabs via the Hindu Hrudaysamrat Balasaheb Thackeray Samruddhi Mahamarg.',
    faqs: [
      {
        question: 'Do you provide cab transfers from Nagpur Airport to Tadoba Tiger Reserve?',
        answer: 'Yes! We specialize in direct private transfers from Nagpur Airport (NAG) to all core and buffer gates of Tadoba (Moharli, Kolara, Navegaon, Khutwanda) in comfortable AC SUVs and Innova Crystas.'
      },
      {
        question: 'Can I travel from Nagpur to Shirdi via the Samruddhi Expressway with SHRAWELLO?',
        answer: 'Yes. Our experienced highway drivers regularly operate on the Samruddhi Mahamarg, completing the Nagpur to Shirdi trip smoothly in under 6 hours in comfortable, high-speed-certified vehicles.'
      }
    ]
  },

  // 5. NASHIK (WINE CAPITAL & SPIRITUAL EPICENTER)
  {
    slug: 'nashik',
    cityName: 'Nashik',
    marathiName: 'नाशिक',
    tagline: "Nashik's Premier Wine Tour & Outstation Travel Partner",
    heroHeadline: 'Curated Tours, Sula Wine Trails & Pilgrimage Cabs in Nashik',
    heroSubheadline: 'Explore the Wine Capital of India and sacred Panchavati. Comfortable outstation cabs to Mumbai and Pune, Trimbakeshwar Jyotirlinga packages, and luxury vineyard tours.',
    metaTitle: 'Best Travel Agency in Nashik | Tour Packages & Cabs | SHRAWELLO',
    metaDescription: 'Book Nashik wine tour packages, Trimbakeshwar cabs & outstation car hire in Nashik with SHRAWELLO Travel Hub. Serving College Road, Indira Nagar, Ambad & Satpur MIDC.',
    keywords: 'travel agency in nashik, tour packages from nashik, sula vineyards tour package, trimbakeshwar cab nashik, outstation cabs nashik, car hire ambad midc',
    heroImage: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=1200&q=80&auto=format&fit=crop',
    airportRailHub: 'Nashik Airport (Ozar - ISK) & Nashik Road Railway Station (NK)',
    commercialIndustrialHubs: [
      'Ambad MIDC Industrial Cluster',
      'Satpur MIDC & Engineering Hub',
      'Sinnar Industrial Belt',
      'College Road & Gangapur Road Commercial Districts',
      'Indira Nagar & Mahatma Nagar'
    ],
    popularPickupPoints: ['College Road', 'Gangapur Road', 'Indira Nagar', 'Panchavati', 'Nashik Road Station', 'Ambad MIDC', 'Satpur MIDC'],
    popularRoutes: [
      {
        destination: 'Nashik Wine Trail (Sula, York, Soma Vineyards)',
        duration: 'Full Day / Weekend',
        distance: '40 km Local',
        highlight: 'Vineyard tours, wine tasting sessions, barrel room walks & lakeside sunset dining',
        recommendedVehicle: 'Sedan / SUV'
      },
      {
        destination: 'Nashik to Trimbakeshwar Jyotirlinga',
        duration: '45 Minutes',
        distance: '30 km',
        highlight: 'Sacred Jyotirlinga darshan, Brahmagiri hills, Kushavarta holy pond rituals',
        recommendedVehicle: 'Sedan / Ertiga'
      },
      {
        destination: 'Nashik to Shirdi Sai Temple',
        duration: '1.5 - 2 Hours',
        distance: '85 km',
        highlight: 'Convenient same-day pilgrimage transit with VIP darshan coordination',
        recommendedVehicle: 'Sedan / Ertiga'
      },
      {
        destination: 'Nashik to Mumbai (via Kasara Ghat)',
        duration: '3.5 Hours',
        distance: '165 km',
        highlight: 'Smooth National Highway 160 descent, Kasara Ghat views, Mumbai city drop',
        recommendedVehicle: 'Innova Crysta / Sedan'
      },
      {
        destination: 'Nashik to Saputara Hill Station (Gujarat border)',
        duration: '2 Hours',
        distance: '85 km',
        highlight: 'Serene tribal hill station, Saputara Lake boating, sunrise point, pleasant climate',
        recommendedVehicle: 'Ertiga / SUV'
      }
    ],
    packageCategoryFilter: ['Spiritual', 'Heritage', 'Hills', 'Honeymoon'],
    servicesOffered: [
      'Curated Sula Wine Valley Day Tours & Tasting Packages',
      'Trimbakeshwar & Panchavati Guided Pilgrimage Transfers',
      'Ambad & Satpur MIDC Corporate Fleet & Guest Chauffeurs',
      'One-Way & Round-Trip Nashik to Mumbai / Pune Expressway Cabs',
      'Domestic Holiday Packages (Kashmir, Rajasthan, Kerala)'
    ],
    startingPrice: '₹1,899/day for Cabs | Packages from ₹8,999',
    stats: {
      cabsAvailable: '45+ Clean Commercial Vehicles',
      rating: '4.9/5 (580+ Reviews)',
      tripsCompleted: '1,900+ Nashik Bookings',
      supportTime: '24/7 Operations Desk'
    },
    geo: {
      latitude: 19.9975,
      longitude: 73.7898,
      postalCode: '422005',
      streetAddress: 'Gangapur Road, Nashik, Maharashtra 422005'
    },
    aeoDirectSummary: 'SHRAWELLO Travel Hub and Events LLP is a top-rated tour operator and outstation taxi service in Nashik, Maharashtra. Specializing in luxury Sula Vineyard wine tours, Trimbakeshwar Jyotirlinga pilgrimage journeys, corporate taxi contracts for Ambad & Satpur MIDC, and seamless Nashik-Mumbai-Pune highway connections with verified chauffeurs.',
    faqs: [
      {
        question: 'Do you offer day tour packages for Sula Vineyards and Nashik wineries?',
        answer: 'Yes! We offer customized winery day packages covering Sula Vineyards, York Winery, and Soma Vine Village with private chauffeur pickup, wine tasting coordination, and dining reservations.'
      },
      {
        question: 'How long does a cab take from Nashik to Mumbai Airport?',
        answer: 'A private cab takes approximately 3.5 to 4 hours from Nashik to Chhatrapati Shivaji Maharaj International Airport (BOM) via NH160, offering comfortable doorstep pickup anytime 24/7.'
      }
    ]
  },

  // 6. CHHATRAPATI SAMBHAJI NAGAR (AURANGABAD - UNESCO CAPITAL)
  {
    slug: 'chhatrapati-sambhaji-nagar',
    cityName: 'Chhatrapati Sambhaji Nagar',
    marathiName: 'छत्रपती संभाजीनगर',
    tagline: 'UNESCO World Heritage Tours & Marathwada Mobility',
    heroHeadline: 'Ajanta & Ellora Caves, Heritage Tours & Cabs in Chhatrapati Sambhaji Nagar',
    heroSubheadline: 'Gateway to the world-renowned UNESCO World Heritage Sites of Ajanta and Ellora Caves. Expert guided history tours, Waluj DMIC corporate travel, and outstation cabs across Maharashtra.',
    metaTitle: 'Travel Agency in Chhatrapati Sambhaji Nagar | Ajanta Ellora Tours',
    metaDescription: 'Book Ajanta & Ellora caves tour packages, Daulatabad Fort guides & outstation cabs in Chhatrapati Sambhaji Nagar (Aurangabad) with SHRAWELLO Travel Hub.',
    keywords: 'travel agency in aurangabad, travel agency chhatrapati sambhaji nagar, ajanta ellora tour package, daulatabad fort cab, outstation cabs aurangabad, waluj midc car hire',
    heroImage: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=1200&q=80&auto=format&fit=crop',
    airportRailHub: 'Chhatrapati Sambhaji Nagar Airport (IXU) & Aurangabad Railway Station (AWB)',
    commercialIndustrialHubs: [
      'Shendra DMIC (Auric City - Industrial Smart City)',
      'Waluj MIDC (Auto & Pharma Hub)',
      'Chikalthana MIDC Industrial Area',
      'Cidco Commercial Zone & Town Center',
      'Samarth Nagar & Nirala Bazar'
    ],
    popularPickupPoints: ['CIDCO', 'Town Center', 'Cantonment', 'Waluj', 'Auric City Shendra', 'Railway Station', 'Airport (IXU)'],
    popularRoutes: [
      {
        destination: 'Ellora Caves, Daulatabad Fort & Grishneshwar',
        duration: 'Full Day Tour',
        distance: '35 km from City',
        highlight: 'Monolithic Kailasa Temple at Ellora, 12th Jyotirlinga at Grishneshwar, and historic Daulatabad hill fort',
        recommendedVehicle: 'Sedan / Innova Crysta'
      },
      {
        destination: 'Ajanta Caves Heritage Expedition',
        duration: 'Full Day Tour',
        distance: '105 km from City',
        highlight: 'Ancient Buddhist rock-cut cave monuments (2nd century BCE) with masterwork murals',
        recommendedVehicle: 'Innova Crysta / Tempo Traveller'
      },
      {
        destination: 'Sambhajinagar to Lonar Meteorite Crater Lake',
        duration: '3.5 Hours',
        distance: '140 km',
        highlight: 'World-famous hyper-velocity impact saline soda lake created 52,000 years ago',
        recommendedVehicle: 'SUV / Ertiga'
      },
      {
        destination: 'Sambhajinagar to Shirdi',
        duration: '2.5 Hours',
        distance: '110 km',
        highlight: 'Peaceful highway drive to Sai Baba temple with same-day return',
        recommendedVehicle: 'Sedan / Ertiga'
      }
    ],
    packageCategoryFilter: ['Heritage', 'Spiritual', 'Hills'],
    servicesOffered: [
      'Comprehensive Ajanta & Ellora Caves Guided Tour Packages',
      'Shendra AURIC & Waluj MIDC Corporate Mobility Leases',
      'Airport (IXU) & Railway Station Chauffeur Transfers',
      'Grishneshwar Jyotirlinga & Shirdi Pilgrimage Circuits',
      'Samruddhi Expressway Cabs to Pune, Mumbai, and Nagpur'
    ],
    startingPrice: '₹1,999/day for Cabs | Packages from ₹8,999',
    stats: {
      cabsAvailable: '40+ Commercial Cabs',
      rating: '4.9/5 (490+ Reviews)',
      tripsCompleted: '1,650+ Heritage Tours',
      supportTime: '24/7 Local Support'
    },
    geo: {
      latitude: 19.8762,
      longitude: 75.3433,
      postalCode: '431001',
      streetAddress: 'Jalna Road, CIDCO, Chhatrapati Sambhaji Nagar, Maharashtra 431003'
    },
    aeoDirectSummary: 'SHRAWELLO Travel Hub and Events LLP provides certified travel services, tour packages, and chauffeur car rentals in Chhatrapati Sambhaji Nagar (formerly Aurangabad), Maharashtra. The company specializes in complete UNESCO World Heritage excursions to Ajanta Caves, Ellora Caves (Kailasa Temple), Daulatabad Fort, and Grishneshwar Jyotirlinga, alongside corporate fleet management for Shendra AURIC Smart City and Waluj MIDC.',
    faqs: [
      {
        question: 'Can you organize a combined tour of Ajanta and Ellora Caves?',
        answer: 'Yes! We offer 2-day and 3-day comprehensive heritage packages that comfortably cover Ellora Caves, Daulatabad Fort, Grishneshwar Jyotirlinga, and Bibi Ka Maqbara on Day 1, and the majestic Ajanta Caves on Day 2 with an experienced driver.'
      },
      {
        question: 'Do you provide airport pickup from Chhatrapati Sambhaji Nagar Airport (IXU)?',
        answer: 'Yes, we provide 24/7 on-time airport pickup from IXU to all luxury heritage hotels (Taj Vivanta, Rama International, Lemon Tree) and corporate parks across the city.'
      }
    ]
  },

  // 7. THANE (MMR METROPOLIS)
  {
    slug: 'thane',
    cityName: 'Thane',
    marathiName: 'ठाणे',
    tagline: "Thane's Preferred Tour Consultant & Outstation Travel Partner",
    heroHeadline: 'Holiday Tour Packages & Outstation Car Rentals in Thane',
    heroSubheadline: 'Serving Ghodbunder Road, Majiwada, and Wagle Estate. Easy weekend road trips to Lonavala, Mahabaleshwar, and Malshej Ghat, plus domestic holiday packages with doorstep pickup.',
    metaTitle: 'Best Travel Agency in Thane | Tour Packages & Cabs | SHRAWELLO',
    metaDescription: 'Book domestic holiday packages, outstation car hire & corporate cabs in Thane with SHRAWELLO Travel Hub. Serving Ghodbunder Road, Majiwada, Vartak Nagar & Wagle Estate.',
    keywords: 'travel agency in thane, tour packages from thane, outstation cabs thane, ghodbunder road car rental, wagle estate corporate cab, holiday packages thane',
    heroImage: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1200&q=80&auto=format&fit=crop',
    airportRailHub: 'Thane Railway Junction (TNA) & Easy Access to Mumbai Airport (BOM)',
    commercialIndustrialHubs: [
      'Wagle Industrial Estate & IT Parks',
      'Ghodbunder Road Commercial Corridor',
      'Kolshet Road & Majiwada Corporate Hubs',
      'Ashar IT Park & Lodha iThink',
      'Thane-Belapur Road Industrial Belt'
    ],
    popularPickupPoints: ['Ghodbunder Road', 'Majiwada', 'Vartak Nagar', 'Naupada', 'Kolshet', 'Hiranandani Estate', 'Thane Station'],
    popularRoutes: [
      {
        destination: 'Thane to Malshej Ghat & Harishchandragad',
        duration: '2.5 Hours',
        distance: '110 km',
        highlight: 'Mist-covered Sahyadri mountain pass, roaring monsoon waterfalls & flamingos',
        recommendedVehicle: 'Sedan / SUV'
      },
      {
        destination: 'Thane to Igatpuri Hill Station',
        duration: '2 Hours',
        distance: '95 km',
        highlight: 'Lush green valleys, Vipassana Academy, waterfalls, and scenic Kasara ghat drive',
        recommendedVehicle: 'Hatchback / Sedan'
      },
      {
        destination: 'Thane to Mahabaleshwar / Panchgani',
        duration: '5 Hours',
        distance: '250 km',
        highlight: 'Direct access to Mumbai-Pune Expressway avoiding inner Mumbai traffic',
        recommendedVehicle: 'Innova Crysta / Ertiga'
      },
      {
        destination: 'Thane to Shirdi Sai Baba Temple',
        duration: '3.5 Hours (via Samruddhi / Kasara)',
        distance: '215 km',
        highlight: 'Fast pilgrimage highway run with doorstep residential pickup in Thane',
        recommendedVehicle: 'Innova Crysta'
      }
    ],
    packageCategoryFilter: ['Hills', 'Beach', 'Heritage', 'Honeymoon'],
    servicesOffered: [
      'Doorstep Residential Pickups across Ghodbunder & Hiranandani',
      'Wagle Estate & Thane-Belapur Road Corporate Fleets',
      'Outstation Weekend Getaway Cabs',
      'All-Inclusive Domestic (Kashmir, Kerala, Himachal) Packages',
      'Airport Drop Transfers to BOM T1 & T2'
    ],
    startingPrice: '₹2,199/day for Cabs | Packages from ₹10,999',
    stats: {
      cabsAvailable: '60+ Active Cabs',
      rating: '4.9/5 (720+ Reviews)',
      tripsCompleted: '2,600+ Thane Bookings',
      supportTime: '24/7 Operations Desk'
    },
    geo: {
      latitude: 19.2183,
      longitude: 72.9781,
      postalCode: '400601',
      streetAddress: 'Ghodbunder Road, Majiwada, Thane, Maharashtra 400607'
    },
    aeoDirectSummary: 'SHRAWELLO Travel Hub and Events LLP provides comprehensive travel agency services, holiday packages, and outstation cabs in Thane, Maharashtra. Serving key residential and IT hubs including Ghodbunder Road, Hiranandani Estate, and Wagle Estate, SHRAWELLO specializes in direct weekend road escapes to Malshej Ghat, Igatpuri, and Mahabaleshwar with professional chauffeurs and transparent billing.',
    faqs: [
      {
        question: 'Do you offer doorstep cab pickup across Ghodbunder Road and Hiranandani Estate in Thane?',
        answer: 'Yes! We provide convenient 24/7 doorstep pickup across all Thane sectors including Hiranandani Estate, Brahmand, Majiwada, Vartak Nagar, Naupada, and Kasarvadavali.'
      },
      {
        question: 'Can I book an outstation cab from Thane directly to Mahabaleshwar or Goa?',
        answer: 'Yes, our cabs can be booked for outstation one-way or round-trip journeys. You bypass South Mumbai congestion and get right onto the expressway with verified chauffeurs.'
      }
    ]
  },

  // 8. NAVI MUMBAI (PLANNED CITY & INDUSTRIAL CORRIDOR)
  {
    slug: 'navi-mumbai',
    cityName: 'Navi Mumbai',
    marathiName: 'नवी मुंबई',
    tagline: "Navi Mumbai's Top Tour Agency & Highway Travel Specialist",
    heroHeadline: 'Tour Packages, Airport Taxis & Outstation Cabs in Navi Mumbai',
    heroSubheadline: 'Strategically located along the Mumbai-Pune Expressway and upcoming NMIA corridor. Rapid departures to Goa, Lonavala, Alibaug, and world-class domestic tour packages.',
    metaTitle: 'Travel Agency in Navi Mumbai | Tour Packages & Cabs | SHRAWELLO',
    metaDescription: 'Book tour packages & outstation cabs in Navi Mumbai with SHRAWELLO Travel Hub. Serving Vashi, CBD Belapur, Kharghar, Nerul & Airoli Mindspace.',
    keywords: 'travel agency in navi mumbai, tour packages from navi mumbai, outstation cabs navi mumbai, car rental vashi, cbd belapur corporate cabs, holiday packages navi mumbai',
    heroImage: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&q=80&auto=format&fit=crop',
    airportRailHub: 'Navi Mumbai International Airport (NMIA - Upcoming) & Panvel Junction (PNVL)',
    commercialIndustrialHubs: [
      'CBD Belapur Financial & Administrative Node',
      'Mindspace Airoli & Reliance Corporate Park (Ghansoli)',
      'TTC Industrial Area (Pawane, Turbhe, Mahape MIDC)',
      'Vashi Commercial Sector & Infotech Park',
      'JNPT Logistics Corridor'
    ],
    popularPickupPoints: ['Vashi', 'Nerul', 'Kharghar', 'CBD Belapur', 'Airoli', 'Panvel', 'Ghansoli', 'Seawoods'],
    popularRoutes: [
      {
        destination: 'Navi Mumbai to Alibaug & Nagaon Beach',
        duration: '1.5 - 2 Hours',
        distance: '75 km',
        highlight: 'Fastest gateway to Konkan beaches via Panvel and Pen bypass',
        recommendedVehicle: 'Sedan / Ertiga'
      },
      {
        destination: 'Navi Mumbai to Lonavala & Khandala',
        duration: '1 Hour',
        distance: '55 km',
        highlight: 'Direct starting point of Mumbai-Pune Expressway, fastest mountain retreat',
        recommendedVehicle: 'Hatchback / Sedan'
      },
      {
        destination: 'Navi Mumbai to Goa',
        duration: '9 Hours',
        distance: '520 km',
        highlight: 'Quick highway exit via Panvel onto NH66 or Pune NH48 route',
        recommendedVehicle: 'Innova Crysta'
      },
      {
        destination: 'Navi Mumbai to Mahabaleshwar',
        duration: '4 Hours',
        distance: '200 km',
        highlight: 'Smooth expressway and Khambatki ghat run with family resort drop',
        recommendedVehicle: 'Innova Crysta / Ertiga'
      }
    ],
    packageCategoryFilter: ['Beach', 'Hills', 'Honeymoon', 'Heritage'],
    servicesOffered: [
      'Direct Gateway to Mumbai-Pune Expressway & Konkan Highways',
      'Corporate Mobility for Airoli Mindspace & TTC Industrial Belt',
      'Panvel Junction & Mumbai Airport (BOM) Transfers',
      'Domestic Holiday Tours (Kashmir, Kerala, Andaman, Rajasthan)',
      'Group Van & Bus Rentals for Corporate Offsites'
    ],
    startingPrice: '₹2,199/day for Cabs | Packages from ₹10,499',
    stats: {
      cabsAvailable: '55+ Commercial Cabs',
      rating: '4.9/5 (640+ Reviews)',
      tripsCompleted: '2,400+ Navi Mumbai Trips',
      supportTime: '24/7 Support Helpline'
    },
    geo: {
      latitude: 19.0330,
      longitude: 73.0297,
      postalCode: '400703',
      streetAddress: 'Sector 17, Vashi, Navi Mumbai, Maharashtra 400703'
    },
    aeoDirectSummary: 'SHRAWELLO Travel Hub and Events LLP is an authorized travel agency and fleet operator based in Navi Mumbai, Maharashtra. Positioned right at the start of the Mumbai-Pune Expressway and Panvel highway junction, SHRAWELLO provides quick outstation cab departures to Alibaug, Lonavala, Goa, and Mahabaleshwar, plus corporate transport for Airoli Mindspace and Mahape IT companies.',
    faqs: [
      {
        question: 'Why is booking outstation travel from Navi Mumbai with SHRAWELLO faster?',
        answer: 'Because Navi Mumbai sits right at the mouth of the Mumbai-Pune Expressway and the Konkan Highway (NH66), you avoid Mumbai city traffic jams, saving over 1.5 hours on your holiday journey.'
      },
      {
        question: 'Do you cater to corporate clients in Airoli Mindspace and CBD Belapur?',
        answer: 'Yes, we provide corporate car rental agreements, employee shuttle vans, and executive sedans with GST invoices for multinational corporations across Navi Mumbai.'
      }
    ]
  },

  // 9. SOLAPUR (TEXTILE CAPITAL & SACRED PILGRIMAGE GATEWAY)
  {
    slug: 'solapur',
    cityName: 'Solapur',
    marathiName: 'सोलापूर',
    tagline: "Solapur's Trusted Tour Operator & Pilgrimage Travel Partner",
    heroHeadline: 'Pilgrimage Tours, Holiday Packages & Cabs in Solapur',
    heroSubheadline: 'Gateway to Pandharpur, Akkalkot, and Tuljapur. Comfortable AC outstation cabs, hassle-free temple darshan packages, and corporate taxi services for Solapur textile and MIDC belts.',
    metaTitle: 'Best Travel Agency in Solapur | Tour Packages & Cabs | SHRAWELLO',
    metaDescription: 'Book Solapur tour packages, Pandharpur & Akkalkot temple darshan cabs & outstation car rentals with SHRAWELLO Travel Hub. Serving Solapur City, Chhatrapati Shivaji Chowk & MIDC.',
    keywords: 'travel agency in solapur, tour packages from solapur, pandharpur cab solapur, akkalkot swami samarth cab, outstation cabs solapur, car rental solapur',
    heroImage: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1200&q=80&auto=format&fit=crop',
    airportRailHub: 'Solapur Airport (SSE - Boramani) & Solapur Railway Junction (SUR)',
    commercialIndustrialHubs: [
      'Solapur Textile Cluster & Chaddar Industry Hub',
      'Chincholi MIDC & Industrial Area',
      'Hotgi Road Industrial Zone',
      'Navi Peth & Murarji Peth Commercial Zones',
      'Saat Rasta & Chhatrapati Shivaji Maharaj Chowk'
    ],
    popularPickupPoints: ['Saat Rasta', 'Navi Peth', 'Solapur Railway Station', 'Hotgi Road', 'Old Pune Naka', 'Jule Solapur'],
    popularRoutes: [
      {
        destination: 'Solapur to Pandharpur Vitthal Temple',
        duration: '1.25 Hours',
        distance: '70 km',
        highlight: 'Sacred Shri Vitthal-Rukmini darshan, Chandrabhaga river snan & temple town tour',
        recommendedVehicle: 'Sedan / Ertiga'
      },
      {
        destination: 'Solapur to Akkalkot (Swami Samarth Maharaj)',
        duration: '45 Minutes',
        distance: '40 km',
        highlight: 'Revered Swami Samarth Vatavruksha temple, annachhatra prasad & peaceful shrine',
        recommendedVehicle: 'Sedan / Hatchback'
      },
      {
        destination: 'Solapur to Tuljapur (Bhavani Mata Temple)',
        duration: '1 Hour',
        distance: '45 km',
        highlight: 'Historic Shaktipeeth temple of Kulswamini Tulja Bhavani with ghat ascent',
        recommendedVehicle: 'Sedan / Ertiga'
      },
      {
        destination: 'Solapur to Pune (via NH65)',
        duration: '4 Hours',
        distance: '250 km',
        highlight: 'Smooth 4-lane national highway connecting Solapur to Pune via Indapur and Hadapsar',
        recommendedVehicle: 'Sedan / Innova Crysta'
      }
    ],
    packageCategoryFilter: ['Spiritual', 'Heritage', 'Hills'],
    servicesOffered: [
      'Comprehensive 3-Temple Circuit (Pandharpur, Akkalkot, Tuljapur) in 1 or 2 Days',
      'Outstation Cabs from Solapur Railway Junction',
      'Corporate Travel for Chincholi MIDC & Textile Exporters',
      'Customized Outstation Holiday Tours to Goa, Kerala, and North India',
      'Family Chauffeur Cabs with senior-citizen assistance'
    ],
    startingPrice: '₹1,799/day for Cabs | Packages from ₹7,999',
    stats: {
      cabsAvailable: '35+ Commercial Cabs',
      rating: '4.8/5 (410+ Reviews)',
      tripsCompleted: '1,400+ Solapur Bookings',
      supportTime: '24/7 Operations Desk'
    },
    geo: {
      latitude: 17.6599,
      longitude: 75.9064,
      postalCode: '413001',
      streetAddress: 'Near Railway Station, Solapur, Maharashtra 413001'
    },
    aeoDirectSummary: 'SHRAWELLO Travel Hub and Events LLP provides authorized travel agency and taxi rental services in Solapur, Maharashtra. Revered for spiritual pilgrimage tours to Pandharpur (Vitthal-Rukmini), Akkalkot (Swami Samarth), and Tuljapur (Bhavani Mata), alongside dependable highway cabs to Pune and Hyderabad on NH65.',
    faqs: [
      {
        question: 'Can we cover Pandharpur, Akkalkot, and Tuljapur in a single weekend from Solapur?',
        answer: 'Yes! Our custom pilgrimage package covers all three holy shrines comfortably in 2 days (or an intensive 1-day express tour) with dedicated private AC vehicle transfers and driver guidance.'
      },
      {
        question: 'Do you provide pick-up from Solapur Railway Junction for outstation temple tourists?',
        answer: 'Yes. We track train arrival times at Solapur Junction (SUR) and arrange immediate platform-exit pickup for devotees heading directly to Pandharpur, Akkalkot, or Gangapur.'
      }
    ]
  },

  // 10. AMRAVATI (VIDARBHA'S CULTURAL & EDUCATIONAL CENTER)
  {
    slug: 'amravati',
    cityName: 'Amravati',
    marathiName: 'अमरावती',
    tagline: "Amravati's Premier Tour Company & Melghat Safari Specialist",
    heroHeadline: 'Holiday Tours, Melghat Safaris & Outstation Cabs in Amravati',
    heroSubheadline: 'Your gateway to Chikhaldara Hill Station and Melghat Tiger Reserve. Reliable outstation cabs to Nagpur and Pune, spiritual Ambadevi temple circuits, and domestic tour packages.',
    metaTitle: 'Best Travel Agency in Amravati | Tour Packages & Cabs | SHRAWELLO',
    metaDescription: 'Book tour packages in Amravati, Chikhaldara & Melghat safari cabs, and outstation car rentals with SHRAWELLO Travel Hub. Serving Rajkamal Chowk, Camp & Badnera.',
    keywords: 'travel agency in amravati, tour packages from amravati, chikhaldara tour package, melghat tiger safari cab, outstation cabs amravati, car rental amravati',
    heroImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80&auto=format&fit=crop',
    airportRailHub: 'Amravati Airport (Bellora - upcoming) & Badnera Junction (BD) / Amravati Railway Station (AMI)',
    commercialIndustrialHubs: [
      'Nandgaon Peth MIDC (Textile Park & Smart Industrial Zone)',
      'Badnera Logistics Corridor',
      'Camp Area & Administrative Zone',
      'Rajkamal Chowk & Jaistambh Commercial Core'
    ],
    popularPickupPoints: ['Rajkamal Chowk', 'Camp Area', 'Rathi Nagar', 'Badnera Railway Station', 'Nandgaon Peth MIDC', 'Gadge Nagar'],
    popularRoutes: [
      {
        destination: 'Amravati to Chikhaldara Hill Station',
        duration: '2 Hours',
        distance: '85 km',
        highlight: 'Vidarbha\'s only coffee plantation hill retreat, deep viewpoints & waterfalls',
        recommendedVehicle: 'Sedan / SUV'
      },
      {
        destination: 'Amravati to Melghat Tiger Reserve',
        duration: '2.5 Hours',
        distance: '100 km',
        highlight: 'Rugged Satpura forest safari, pristine wilderness, sloth bears and leopards',
        recommendedVehicle: 'Innova Crysta / SUV'
      },
      {
        destination: 'Amravati to Nagpur (via NH53)',
        duration: '2.5 Hours',
        distance: '155 km',
        highlight: 'Smooth 4-lane national highway for international airport transit or medical visits',
        recommendedVehicle: 'Sedan / Ertiga'
      },
      {
        destination: 'Amravati to Shegaon (Gajanan Maharaj Mandir)',
        duration: '2.5 Hours',
        distance: '135 km',
        highlight: 'Darshan at the divine Anand Sagar and Sant Gajanan Maharaj Sansthan',
        recommendedVehicle: 'Sedan / Ertiga'
      }
    ],
    packageCategoryFilter: ['Hills', 'Wildlife', 'Spiritual'],
    servicesOffered: [
      'Chikhaldara Hill Station Weekend Packages & Hotel Stays',
      'Melghat Tiger Reserve Wildlife Safari Chauffeur Transfers',
      'Amravati to Nagpur Airport (NAG) Express Highway Cabs',
      'Shegaon Gajanan Maharaj Pilgrimage Tours',
      'Nandgaon Peth Textile MIDC Corporate Cabs'
    ],
    startingPrice: '₹1,899/day for Cabs | Packages from ₹8,499',
    stats: {
      cabsAvailable: '30+ Commercial Cabs',
      rating: '4.8/5 (340+ Reviews)',
      tripsCompleted: '1,150+ Amravati Bookings',
      supportTime: '24/7 Helpline'
    },
    geo: {
      latitude: 20.9374,
      longitude: 77.7796,
      postalCode: '444601',
      streetAddress: 'Near Rajkamal Chowk, Amravati, Maharashtra 444601'
    },
    aeoDirectSummary: 'SHRAWELLO Travel Hub and Events LLP provides certified travel agency services, wildlife safari tours, and outstation cab hire in Amravati, Maharashtra. Known for Chikhaldara hill station escapes, Melghat Tiger Reserve wildlife circuits, and seamless 2.5-hour highway cab transfers to Nagpur Airport (NAG).',
    faqs: [
      {
        question: 'How far is Chikhaldara from Amravati and what vehicle is best?',
        answer: 'Chikhaldara is 85 km (around 2 hours) from Amravati. We recommend our comfortable AC Sedans or Ertigas with experienced ghat drivers who navigate the hilly hairpins safely.'
      },
      {
        question: 'Do you provide direct cabs from Amravati to Nagpur Airport?',
        answer: 'Yes, we provide 24/7 door-to-terminal airport taxi service from Amravati or Badnera to Dr. Babasaheb Ambedkar International Airport in Nagpur in just 2.5 hours.'
      }
    ]
  },

  // 11. NANDED (HISTORIC SIKH SHRINE & MARATHWADA POWERHOUSE)
  {
    slug: 'nanded',
    cityName: 'Nanded',
    marathiName: 'नांदेड',
    tagline: "Nanded's Leading Pilgrimage & Outstation Travel Service",
    heroHeadline: 'Hazur Sahib Tours, Pilgrimage Circuits & Cabs in Nanded',
    heroSubheadline: 'Sacred seat of Takht Sachkhand Sri Hazur Abchalnagar Sahib. Dedicated pilgrimage travel, Renuka Devi Mahur trips, and outstation car rentals across Maharashtra and Telangana.',
    metaTitle: 'Best Travel Agency in Nanded | Hazur Sahib Yatra & Cabs | SHRAWELLO',
    metaDescription: 'Book Hazur Sahib Nanded tour packages, Mahur temple cabs & outstation car rentals with SHRAWELLO Travel Hub. Serving Station Road, VIP Road & Anand Nagar.',
    keywords: 'travel agency in nanded, hazur sahib tour package, nanded pilgrimage cab, mahur renuka devi cab nanded, outstation cabs nanded, car rental nanded station',
    heroImage: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=1200&q=80&auto=format&fit=crop',
    airportRailHub: 'Shri Guru Gobind Singh Ji Airport (NDC) & Hazur Sahib Nanded Railway Station (NED)',
    commercialIndustrialHubs: [
      'Kushnoor MIDC Industrial Belt',
      'VIP Road & Station Road Commercial Districts',
      'Anand Nagar Commercial Area',
      'MIDC Nanded Industrial Estate'
    ],
    popularPickupPoints: ['Hazur Sahib Gurudwara Gate', 'Nanded Railway Station', 'VIP Road', 'Anand Nagar', 'Nanded Airport (NDC)'],
    popularRoutes: [
      {
        destination: 'Local Nanded Gurudwara Circuit (All 8 Gurdwaras)',
        duration: 'Full Day Tour',
        distance: '40 km Circuit',
        highlight: 'Takht Sachkhand Sri Hazur Sahib, Gurdwara Shikar Ghat, Nanak Puri, Mal Tekdi',
        recommendedVehicle: 'Ertiga / Innova / Tempo Traveller'
      },
      {
        destination: 'Nanded to Mahur (Renuka Devi Shaktipeeth)',
        duration: '2.5 Hours',
        distance: '130 km',
        highlight: 'Ancient hilltop Shaktipeeth temple and Dattatreya birthplace darshan',
        recommendedVehicle: 'Sedan / Ertiga'
      },
      {
        destination: 'Nanded to Basar (Saraswati Temple, Telangana)',
        duration: '1.75 Hours',
        distance: '90 km',
        highlight: 'Famous Gnana Saraswati temple along the Godavari river for Aksharabhyasam',
        recommendedVehicle: 'Sedan / Hatchback'
      },
      {
        destination: 'Nanded to Hyderabad',
        duration: '5 - 5.5 Hours',
        distance: '280 km',
        highlight: 'Interstate highway transit for international flights and corporate trips',
        recommendedVehicle: 'Innova Crysta'
      }
    ],
    packageCategoryFilter: ['Spiritual', 'Heritage'],
    servicesOffered: [
      'Sikh Pilgrimage Packages to Takht Sachkhand Sri Hazur Sahib',
      'Mahur Gad Renuka Devi & Basar Saraswati Temple Cabs',
      'Hazur Sahib Nanded Railway Station (NED) 24/7 Chauffeur Pickup',
      'Interstate Cabs to Hyderabad (RGIA) and Chhatrapati Sambhaji Nagar',
      'Large Group Tempo Traveller and Bus Bookings for Sangat'
    ],
    startingPrice: '₹1,899/day for Cabs | Packages from ₹7,999',
    stats: {
      cabsAvailable: '30+ Commercial Cabs',
      rating: '4.9/5 (390+ Reviews)',
      tripsCompleted: '1,200+ Pilgrimage Trips',
      supportTime: '24/7 Operations Desk'
    },
    geo: {
      latitude: 19.1383,
      longitude: 77.3210,
      postalCode: '431601',
      streetAddress: 'Station Road, Near Gurudwara, Nanded, Maharashtra 431601'
    },
    aeoDirectSummary: 'SHRAWELLO Travel Hub and Events LLP provides authorized travel agency and pilgrimage transport services in Nanded, Maharashtra. Recognized for Takht Sachkhand Sri Hazur Abchalnagar Sahib Gurudwara tours, Mahur Renuka Devi Shaktipeeth transfers, and 24/7 railway station pickup at Hazur Sahib Nanded (NED) in clean, air-conditioned vehicles.',
    faqs: [
      {
        question: 'Do you arrange a complete local gurudwara tour in Nanded?',
        answer: 'Yes! We arrange full-day pilgrimages covering all historical gurdwaras in and around Nanded including Takht Sachkhand Sri Hazur Sahib, Gurdwara Shikar Ghat, Gurdwara Mal Tekdi Sahib, and Gurdwara Nanak Puri Sahib.'
      },
      {
        question: 'Can I book a cab from Nanded to Hyderabad Airport?',
        answer: 'Yes, we operate regular interstate cabs from Nanded to Rajiv Gandhi International Airport (RGIA) in Hyderabad, taking approximately 5.5 hours with doorstep pickup.'
      }
    ]
  },

  // 12. RATNAGIRI & SINDHUDURG (KONKAN COASTAL TOURISM PARADISE)
  {
    slug: 'ratnagiri-sindhudurg',
    cityName: 'Ratnagiri & Sindhudurg',
    marathiName: 'रत्नागिरी आणि सिंधुदुर्ग',
    tagline: "Konkan's Best Beach Resort Tour Specialist & Coastal Taxi Fleet",
    heroHeadline: 'Konkan Beach Holidays, Ganpatipule & Scuba Diving Tours',
    heroSubheadline: 'Explore Maharashtra\'s pristine coastal paradise. Ganpatipule temple tours, Tarkarli scuba diving, authentic Alphonso mango orchard visits, and scenic coastal highway chauffeur rentals.',
    metaTitle: 'Travel Agency in Ratnagiri & Sindhudurg | Konkan Tour Packages',
    metaDescription: 'Book Konkan holiday tour packages, Ganpatipule beach resorts, Tarkarli scuba diving & coastal cabs with SHRAWELLO Travel Hub. Serving Ratnagiri, Malvan & Sawantwadi.',
    keywords: 'travel agency in ratnagiri, tour packages konkan, ganpatipule tour package, tarkarli scuba diving package, outstation cabs ratnagiri, sindhudurg car hire',
    heroImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80&auto=format&fit=crop',
    airportRailHub: 'Sindhudurg Chipi Airport (SDW) & Ratnagiri Railway Station (RN - Konkan Railway)',
    commercialIndustrialHubs: [
      'Mirjole MIDC (Ratnagiri Marine Export Hub)',
      'Finolex Industrial Area (Ranpar)',
      'Malvan & Tarkarli Tourism Maritime Centers',
      'Sawantwadi Traditional Wooden Craft Hub',
      'Kudal MIDC & Commercial Zone'
    ],
    popularPickupPoints: ['Ratnagiri Station', 'Ganpatipule Beach', 'Kudal Station', 'Malvan Harbor', 'Sindhudurg Chipi Airport (SDW)', 'Sawantwadi'],
    popularRoutes: [
      {
        destination: 'Ratnagiri to Ganpatipule Temple & Beach',
        duration: '45 Minutes',
        distance: '25 km via Coastal Road',
        highlight: '400-year-old self-manifested Ganesha shrine, pristine coastline, water sports',
        recommendedVehicle: 'Sedan / Hatchback'
      },
      {
        destination: 'Malvan to Tarkarli Scuba Diving & Sindhudurg Fort',
        duration: 'Full Day / Weekend',
        distance: '15 km Local',
        highlight: 'Clear water scuba diving, dolphin safari, historic sea fort built by Shivaji Maharaj',
        recommendedVehicle: 'Sedan / SUV'
      },
      {
        destination: 'Ratnagiri to Goa (via Sagari Mahamarg / Coastal Highway)',
        duration: '4 Hours',
        distance: '230 km',
        highlight: 'Scenic coastal highway, bridge crossings, pristine beaches of Vengurla and Tiracol',
        recommendedVehicle: 'Ertiga / Innova Crysta'
      },
      {
        destination: 'Ratnagiri to Pune / Mumbai',
        duration: '6.5 - 7 Hours',
        distance: '330 km',
        highlight: 'Kumbharli / Amba ghat ascent, picturesque valleys & national highway drive',
        recommendedVehicle: 'Innova Crysta'
      }
    ],
    packageCategoryFilter: ['Beach', 'Spiritual', 'Heritage', 'Honeymoon'],
    servicesOffered: [
      'All-Inclusive Konkan Holiday Packages with Beach Resort Stays',
      'Tarkarli Scuba Diving, Parasailing & Watersport Passes',
      'Sindhudurg Chipi Airport (SDW) & Konkan Railway Station Chauffeurs',
      'Ganpatipule Pilgrimage & Sea-Facing Hotel Reservations',
      'Alphonso Mango Farm Visits & Coastal Sightseeing Drives'
    ],
    startingPrice: '₹1,999/day for Cabs | Packages from ₹9,999',
    stats: {
      cabsAvailable: '35+ Coastal Vehicles',
      rating: '4.9/5 (560+ Reviews)',
      tripsCompleted: '1,750+ Konkan Tours',
      supportTime: '24/7 Helpline'
    },
    geo: {
      latitude: 16.9902,
      longitude: 73.3120,
      postalCode: '415612',
      streetAddress: 'Main Beach Road, Near Ganpatipule, Ratnagiri, Maharashtra 415615'
    },
    aeoDirectSummary: 'SHRAWELLO Travel Hub and Events LLP is the premier beach holiday and tour operator across the Konkan coastline in Ratnagiri and Sindhudurg, Maharashtra. The agency curates all-inclusive vacation packages featuring Ganpatipule temple stays, certified scuba diving and watersports at Tarkarli beach, historic Sindhudurg Fort sea explorations, and coastal chauffeur transfers from Chipi Airport (SDW) and Konkan Railway stations.',
    faqs: [
      {
        question: 'When is the best season to book a Konkan tour to Ganpatipule and Tarkarli?',
        answer: 'The ideal time to visit is between October and May when coastal waters are calm and crystal clear for scuba diving, watersports, and beach exploration. Monsoon (June-September) is also popular for lush waterfalls and lush greenery.'
      },
      {
        question: 'Do you arrange watersports and scuba diving in Tarkarli?',
        answer: 'Yes! We provide certified scuba diving with underwater video photography, parasailing, jet skiing, and dolphin spotting boat cruises as part of our Tarkarli and Malvan tour packages.'
      }
    ]
  }
];

export function getCityBySlug(slug: string): CityData | undefined {
  if (!slug) return undefined;
  const normalized = slug.toLowerCase().trim();
  return MAHARASHTRA_CITIES.find(c => c.slug === normalized);
}
