export type VehicleCategoryType = 'Hatchback' | 'Sedan' | 'SUV' | 'MPV' | 'Van' | 'Bus';

export interface VehicleModel {
  id: string;
  name: string;
  brand: string;
  category: VehicleCategoryType;
  seating: string; // e.g. "4 + 1 Seats"
  maxPax: number;
  luggage: string; // e.g. "2 Suitcases"
  fuelType: string; // e.g. "Petrol / CNG / Diesel"
  ac: boolean;
  image: string;
  fallbackImage: string;
  badge?: string;
  features: string[];
  description: string;
  idealFor: string;
}

export interface VehicleCategory {
  id: VehicleCategoryType;
  name: string;
  displayName: string;
  tagline: string;
  icon: string;
  defaultSeating: string;
  defaultLuggage: string;
  topModels: string[];
  image: string;
  color: string;
}

export const VEHICLE_CATEGORIES: VehicleCategory[] = [
  {
    id: 'Hatchback',
    name: 'Hatchback',
    displayName: 'Hatchback / Compact',
    tagline: 'Economical & nimble for small families and city travel',
    icon: 'directions_car',
    defaultSeating: '4 + 1 Passengers',
    defaultLuggage: '2 Medium Bags',
    topModels: ['Maruti Swift', 'Maruti Baleno', 'Hyundai i20', 'WagonR'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/2018_Suzuki_Swift_SZ5_Boosterjet_1.0_Front.jpg/800px-2018_Suzuki_Swift_SZ5_Boosterjet_1.0_Front.jpg',
    color: 'from-emerald-500 to-teal-700'
  },
  {
    id: 'Sedan',
    name: 'Sedan',
    displayName: 'Sedan (Car)',
    tagline: 'Comfortable, stylish & spacious for outstation and business trips',
    icon: 'minor_crash',
    defaultSeating: '4 + 1 Passengers',
    defaultLuggage: '2 Large Suitcases',
    topModels: ['Maruti Dzire', 'Honda City', 'Hyundai Aura'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/2020_Maruti_Suzuki_Dzire_VXi_%28India%29_front_view.jpg/800px-2020_Maruti_Suzuki_Dzire_VXi_%28India%29_front_view.jpg',
    color: 'from-blue-600 to-indigo-800'
  },
  {
    id: 'SUV',
    name: 'SUV',
    displayName: 'SUV / Crossover',
    tagline: 'Powerful performance & high ground clearance for all terrains',
    icon: 'car_tag',
    defaultSeating: '5 + 1 Passengers',
    defaultLuggage: '3 Large Suitcases',
    topModels: ['Hyundai Creta', 'Kia Seltos', 'Mahindra XUV300'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/2020_Hyundai_Creta_SX_%28India%29_front_view.jpg/800px-2020_Hyundai_Creta_SX_%28India%29_front_view.jpg',
    color: 'from-amber-500 to-orange-700'
  },
  {
    id: 'MPV',
    name: 'MPV',
    displayName: 'MPV (Multi-Purpose)',
    tagline: 'Extra seating capacity & premium legroom for family tours',
    icon: 'airport_shuttle',
    defaultSeating: '6 + 1 / 7 + 1 Passengers',
    defaultLuggage: '4 Large Bags',
    topModels: ['Maruti Ertiga', 'Kia Carens', 'Toyota Innova', 'Toyota Crysta'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/2017_Toyota_Innova_Crysta_2.4_ZX_%28India%29_front_view.jpg/800px-2017_Toyota_Innova_Crysta_2.4_ZX_%28India%29_front_view.jpg',
    color: 'from-purple-600 to-indigo-900'
  },
  {
    id: 'Van',
    name: 'Van',
    displayName: 'Van / Tempo Traveller',
    tagline: 'Luxury group travel with recliner seats & dedicated luggage space',
    icon: 'departure_board',
    defaultSeating: '12 to 26 Passengers',
    defaultLuggage: 'Dedicated Overhead & Rear Luggage',
    topModels: ['Force Traveller', 'Force Urbania', 'Tata Winger'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Force_Traveller_in_India.jpg/800px-Force_Traveller_in_India.jpg',
    color: 'from-rose-600 to-red-800'
  },
  {
    id: 'Bus',
    name: 'Bus',
    displayName: 'Bus / Luxury Coach',
    tagline: 'Spacious 32-50 seater coaches for corporate outings & grand group tours',
    icon: 'directions_bus',
    defaultSeating: '32 to 50 Passengers',
    defaultLuggage: 'Under-deck Large Cargo Bay',
    topModels: ['Tata Starbus', 'Ashok Leyland Oyster', 'Eicher Skyline'],
    image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80',
    color: 'from-cyan-600 to-blue-900'
  }
];

export const VEHICLE_MODELS: VehicleModel[] = [
  // SEDAN
  {
    id: 'maruti-dzire',
    name: 'Maruti Dzire',
    brand: 'Maruti Suzuki',
    category: 'Sedan',
    seating: '4 + 1 Passengers',
    maxPax: 4,
    luggage: '2 Large Suitcases',
    fuelType: 'Petrol / CNG',
    ac: true,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/2020_Maruti_Suzuki_Dzire_VXi_%28India%29_front_view.jpg/800px-2020_Maruti_Suzuki_Dzire_VXi_%28India%29_front_view.jpg',
    fallbackImage: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80',
    badge: 'Most Popular',
    features: ['Air Conditioning', 'Push Button Start', 'Bluetooth Audio', 'Rear AC Vents', 'Generous Boot Space'],
    description: 'India\'s favorite sedan offering exceptional comfort, smooth highway rides, and efficient luggage capacity.',
    idealFor: 'City drop, local sightseeing & budget outstation trips'
  },
  {
    id: 'honda-city',
    name: 'Honda City',
    brand: 'Honda',
    category: 'Sedan',
    seating: '4 + 1 Passengers',
    maxPax: 4,
    luggage: '3 Suitcases',
    fuelType: 'Petrol',
    ac: true,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/2020_Honda_City_1.0_TURBO_SV_Front.jpg/800px-2020_Honda_City_1.0_TURBO_SV_Front.jpg',
    fallbackImage: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80',
    badge: 'Executive Choice',
    features: ['Premium Leather Seats', 'Sunroof', 'Touchscreen Infotainment', 'Cruise Control', 'Extra Rear Legroom'],
    description: 'Executive sedan known for luxury, refined ride quality, and plush rear passenger seats.',
    idealFor: 'Business travel, corporate trips & premium family tours'
  },
  {
    id: 'hyundai-aura',
    name: 'Hyundai Aura',
    brand: 'Hyundai',
    category: 'Sedan',
    seating: '4 + 1 Passengers',
    maxPax: 4,
    luggage: '2 Suitcases',
    fuelType: 'Petrol / CNG',
    ac: true,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/2020_Hyundai_Aura_SX%2B_%28India%29_front_view.jpg/800px-2020_Hyundai_Aura_SX%2B_%28India%29_front_view.jpg',
    fallbackImage: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80',
    badge: 'Best Value',
    features: ['Quiet Cabin', 'Wireless Phone Charger', 'Rear AC Vents', 'ABS with EBD'],
    description: 'Modern styling combined with high fuel efficiency and comfortable seating for outstation travel.',
    idealFor: 'Outstation trips, airport transfers & daily rentals'
  },

  // HATCHBACK
  {
    id: 'maruti-swift',
    name: 'Maruti Swift',
    brand: 'Maruti Suzuki',
    category: 'Hatchback',
    seating: '4 + 1 Passengers',
    maxPax: 4,
    luggage: '2 Medium Bags',
    fuelType: 'Petrol',
    ac: true,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/2018_Suzuki_Swift_SZ5_Boosterjet_1.0_Front.jpg/800px-2018_Suzuki_Swift_SZ5_Boosterjet_1.0_Front.jpg',
    fallbackImage: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
    badge: 'Best Seller',
    features: ['Compact & Agile', 'Air Conditioning', 'Power Windows', 'USB Charging'],
    description: 'Iconic compact car perfect for navigating city traffic and quick weekend staycations.',
    idealFor: 'Couples, 2-3 passengers & short distance travel'
  },
  {
    id: 'maruti-baleno',
    name: 'Maruti Baleno',
    brand: 'Maruti Suzuki',
    category: 'Hatchback',
    seating: '4 + 1 Passengers',
    maxPax: 4,
    luggage: '2 Large Bags',
    fuelType: 'Petrol',
    ac: true,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/2022_Maruti_Suzuki_Baleno_Alpha_%28India%29_front_view.jpg/800px-2022_Maruti_Suzuki_Baleno_Alpha_%28India%29_front_view.jpg',
    fallbackImage: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=800&q=80',
    badge: 'Spacious Hatch',
    features: ['Wide Rear Bench', 'Head-Up Display', 'Auto Climate Control', 'Silent Cabin'],
    description: 'Premium hatchback offering sedan-level rear seat room and smooth suspension.',
    idealFor: 'Small families, airport transfers & day trips'
  },
  {
    id: 'hyundai-i20',
    name: 'Hyundai i20',
    brand: 'Hyundai',
    category: 'Hatchback',
    seating: '4 + 1 Passengers',
    maxPax: 4,
    luggage: '2 Suitcases',
    fuelType: 'Petrol',
    ac: true,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/2021_Hyundai_i20_N_Line_1.0_Front.jpg/800px-2021_Hyundai_i20_N_Line_1.0_Front.jpg',
    fallbackImage: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=800&q=80',
    badge: 'Premium Styling',
    features: ['Bose Audio', 'Ambient Lighting', 'Rear AC Vents', 'Fast USB Ports'],
    description: 'High-end hatchback with futuristic styling and ultra-comfortable cabin seating.',
    idealFor: 'City rides, highway cruises & corporate cabs'
  },
  {
    id: 'wagon-r',
    name: 'WagonR',
    brand: 'Maruti Suzuki',
    category: 'Hatchback',
    seating: '4 + 1 Passengers',
    maxPax: 4,
    luggage: '2 Bags',
    fuelType: 'Petrol / CNG',
    ac: true,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/2019_Maruti_Suzuki_Wagon_R_VXi_%28India%29_front_view.jpg/800px-2019_Maruti_Suzuki_Wagon_R_VXi_%28India%29_front_view.jpg',
    fallbackImage: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80',
    badge: 'Economy Choice',
    features: ['Tall Boy Design', 'Easy Ingress/Egress', 'Great Headroom', 'CNG Option'],
    description: 'High headroom design that makes entry and exit effortless for senior travelers.',
    idealFor: 'Budget city runs, local shopping tours & short hops'
  },

  // SUV
  {
    id: 'hyundai-creta',
    name: 'Hyundai Creta',
    brand: 'Hyundai',
    category: 'SUV',
    seating: '5 + 1 Passengers',
    maxPax: 5,
    luggage: '3 Suitcases',
    fuelType: 'Diesel / Petrol',
    ac: true,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/2020_Hyundai_Creta_SX_%28India%29_front_view.jpg/800px-2020_Hyundai_Creta_SX_%28India%29_front_view.jpg',
    fallbackImage: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
    badge: 'Top SUV Pick',
    features: ['Panoramic Sunroof', 'Ventilated Seats', 'All-Wheel Disc Brakes', 'Bose Sound', 'High Clearance'],
    description: 'India\'s #1 compact SUV with plush interiors, high seating stance, and effortless highway cruising.',
    idealFor: 'Hilly destinations, long highway road trips & families'
  },
  {
    id: 'kia-seltos',
    name: 'Kia Seltos',
    brand: 'Kia',
    category: 'SUV',
    seating: '5 + 1 Passengers',
    maxPax: 5,
    luggage: '3 Suitcases',
    fuelType: 'Diesel / Petrol',
    ac: true,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/2021_Kia_Seltos_HTX_%28India%29_front_view.jpg/800px-2021_Kia_Seltos_HTX_%28India%29_front_view.jpg',
    fallbackImage: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80',
    badge: 'Sporty Luxury',
    features: ['Head-Up Display', 'Air Purifier', 'LED Mood Lighting', 'Leatherette Seats'],
    description: 'Sporty design merged with luxury comforts and smooth drive dynamics.',
    idealFor: 'Long outstation trips, coastal drives & hill station visits'
  },
  {
    id: 'mahindra-xuv300',
    name: 'Mahindra XUV300',
    brand: 'Mahindra',
    category: 'SUV',
    seating: '5 + 1 Passengers',
    maxPax: 5,
    luggage: '2 Large Suitcases',
    fuelType: 'Diesel / Petrol',
    ac: true,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/2019_Mahindra_XUV300_W8_%28India%29_front_view.jpg/800px-2019_Mahindra_XUV300_W8_%28India%29_front_view.jpg',
    fallbackImage: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
    badge: '5-Star Safety',
    features: ['5-Star Safety Rating', 'Dual-Zone AC', 'Sunroof', 'Class-Leading Torque'],
    description: 'Robust built compact SUV offering top-tier safety and mountain climbing power.',
    idealFor: 'Adventure trips, rugged terrain & safety-conscious travelers'
  },

  // MPV
  {
    id: 'maruti-ertiga',
    name: 'Maruti Ertiga',
    brand: 'Maruti Suzuki',
    category: 'MPV',
    seating: '6 + 1 Passengers',
    maxPax: 6,
    luggage: '3 Bags',
    fuelType: 'Petrol / CNG',
    ac: true,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/2019_Maruti_Suzuki_Ertiga_ZXi_%28India%29_front_view.jpg/800px-2019_Maruti_Suzuki_Ertiga_ZXi_%28India%29_front_view.jpg',
    fallbackImage: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
    badge: 'Family Favorite',
    features: ['7-Seater Layout', 'Reclining 2nd & 3rd Rows', 'Roof-Mounted AC', 'Flexible Boot'],
    description: 'Smart 7-seater MPV offering great fuel efficiency and comfortable seating for medium-sized groups.',
    idealFor: 'Family vacations, pilgrimage tours & group outstation'
  },
  {
    id: 'kia-carens',
    name: 'Kia Carens',
    brand: 'Kia',
    category: 'MPV',
    seating: '6 + 1 / 7 + 1 Passengers',
    maxPax: 7,
    luggage: '3 Large Bags',
    fuelType: 'Diesel / Petrol',
    ac: true,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/2022_Kia_Carens_Prestige_%28India%29_front_view.jpg/800px-2022_Kia_Carens_Prestige_%28India%29_front_view.jpg',
    fallbackImage: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80',
    badge: 'Modern RV',
    features: ['One-Touch Tumble Seats', 'Air Purifier', 'Retractable Tray Tables', '10.25" Display'],
    description: 'Reinvented family mover with captain seat options, ambient lighting, and luxury ride quality.',
    idealFor: 'Luxury family travel, multi-day tours & intercity trips'
  },
  {
    id: 'toyota-innova',
    name: 'Toyota Innova',
    brand: 'Toyota',
    category: 'MPV',
    seating: '7 + 1 Passengers',
    maxPax: 7,
    luggage: '4 Bags',
    fuelType: 'Diesel',
    ac: true,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/2012_Toyota_Innova_2.5_G_%28KUN40R%29.jpg/800px-2012_Toyota_Innova_2.5_G_%28KUN40R%29.jpg',
    fallbackImage: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
    badge: 'Gold Standard',
    features: ['Unmatched Reliability', 'Captain Seats', 'Dual AC Units', 'Heavy Luggage Deck'],
    description: 'The undisputed benchmark of Indian travel comfort, unmatched for long outstation journeys.',
    idealFor: 'Outstation tours, VIP movement & long distance journeys'
  },
  {
    id: 'toyota-crysta',
    name: 'Toyota Innova Crysta',
    brand: 'Toyota',
    category: 'MPV',
    seating: '7 + 1 Passengers',
    maxPax: 7,
    luggage: '4 Large Suitcases',
    fuelType: 'Diesel',
    ac: true,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/2017_Toyota_Innova_Crysta_2.4_ZX_%28India%29_front_view.jpg/800px-2017_Toyota_Innova_Crysta_2.4_ZX_%28India%29_front_view.jpg',
    fallbackImage: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
    badge: 'VIP & Ultra Comfort',
    features: ['Plush Leather Captain Seats', 'Ambient Roof Illumination', 'Powerful 2.4L Engine', 'Superior Suspension'],
    description: 'Flagship luxury MPV providing supreme road comfort, ultra-quiet cabin, and status styling.',
    idealFor: 'Luxury outstation travel, weddings, VIP delegates & long tours'
  },

  // VAN
  {
    id: 'force-traveller',
    name: 'Force Traveller',
    brand: 'Force Motors',
    category: 'Van',
    seating: '12 / 17 / 26 Passengers',
    maxPax: 26,
    luggage: 'Roof Carrier & Rear Boot',
    fuelType: 'Diesel',
    ac: true,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Force_Traveller_in_India.jpg/800px-Force_Traveller_in_India.jpg',
    fallbackImage: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
    badge: 'Group Tour Choice',
    features: ['Pushback Recliner Seats', 'Dual AC Blowers', 'Music System with Mic', 'Overhead Luggage Racks'],
    description: 'India\'s premier Tempo Traveller for large group tours, pilgrimage trips, and corporate outings.',
    idealFor: '12-26 person groups, pilgrimage packages, wedding guests'
  },
  {
    id: 'force-urbania',
    name: 'Force Urbania',
    brand: 'Force Motors',
    category: 'Van',
    seating: '13 / 17 Passengers',
    maxPax: 17,
    luggage: 'Underfloor & Rear Boot',
    fuelType: 'Diesel',
    ac: true,
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80',
    badge: 'Next-Gen Luxury Van',
    features: ['Individual AC Vents & USB Ports', 'Individual Recliner Bucket Seats', 'Panoramic Windows', 'Air Suspension Comfort'],
    description: 'Ultra-modern luxury van inspired by European design, offering international luxury standards for groups.',
    idealFor: 'VIP corporate trips, luxury group tours & international guests'
  },
  {
    id: 'tata-winger',
    name: 'Tata Winger',
    brand: 'Tata Motors',
    category: 'Van',
    seating: '12 / 15 Passengers',
    maxPax: 15,
    luggage: 'Rear Cargo Compartment',
    fuelType: 'Diesel',
    ac: true,
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
    badge: 'Smooth Monocoque',
    features: ['Low Step Entry', 'Monocoque Body Ride Quality', 'Individual Armrests', 'High Ceiling'],
    description: 'Monocoque bus platform providing car-like ride comfort and easy step-in for elderly passengers.',
    idealFor: 'Family reunions, corporate teams & outstation excursions'
  },

  // BUS
  {
    id: 'tata-starbus',
    name: 'Tata Starbus',
    brand: 'Tata Motors',
    category: 'Bus',
    seating: '32 / 40 / 50 Passengers',
    maxPax: 50,
    luggage: 'Under-deck Belly Luggage Bay',
    fuelType: 'Diesel',
    ac: true,
    image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
    badge: 'Grand Tour Coach',
    features: ['32 to 50 Pushback Seats', 'Centralized Air Conditioning', 'PA System & TV Screens', 'Large Under-deck Bay'],
    description: 'Heavy duty luxury coach built for comfort on long national highways and large event movements.',
    idealFor: 'Corporate retreats, school/college trips & wedding guest transit'
  },
  {
    id: 'ashok-leyland-oyster',
    name: 'Ashok Leyland Oyster',
    brand: 'Ashok Leyland',
    category: 'Bus',
    seating: '33 / 41 Passengers',
    maxPax: 41,
    luggage: 'Belly Luggage Compartments',
    fuelType: 'Diesel',
    ac: true,
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80',
    badge: 'Heavy Duty Comfort',
    features: ['Wide Aisle Space', 'Ergonomic High-Back Seats', 'High Capacity Air Conditioning', 'ABS Brakes'],
    description: 'Modern midi-bus offering robust engineering, smooth power delivery, and high seating capacity.',
    idealFor: 'Inter-city charters, tour groups & large family events'
  },
  {
    id: 'eicher-skyline',
    name: 'Eicher Skyline',
    brand: 'Eicher',
    category: 'Bus',
    seating: '32 / 45 Passengers',
    maxPax: 45,
    luggage: 'Side Under-deck Storage',
    fuelType: 'Diesel',
    ac: true,
    image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80',
    fallbackImage: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
    badge: 'Executive Coach',
    features: ['Air Suspension', 'Comfort Recliners', 'Night Ambient Lights', 'Surround Speakers'],
    description: 'Premium executive coach designed for maximum passenger relaxation over multi-day itineraries.',
    idealFor: 'Multi-state tours, corporate conventions & pilgrimage packages'
  }
];
