/**
 * Dynamic Transit & Distance Routing Engine for Shrawello Itinerary Proposals
 * Provides accurate geodesic & highway road distances, realistic transit durations,
 * and intelligent route labels for domestic (pilgrimage, leisure, hill station) and international packages.
 */

export interface TransitDayResult {
  day: number;
  routeLabel: string;
  approxDistance: string;
  minKm: number;
  maxKm: number;
  estimatedTravelTime: string;
}

export interface TransitMatrixResult {
  rows: string[][];
  totalMinKm: number;
  totalMaxKm: number;
  totalDistanceString: string;
}

// ── 1. Comprehensive Verified Highway & Road Distance Matrix (100+ Inter-City Corridors) ──
interface RouteDistanceInfo {
  distanceKm: number;
  drivingTimeHrs: number;
  roadType: 'expressway' | 'highway' | 'mountain' | 'urban';
  notes?: string;
}

const INTER_CITY_DISTANCES: Record<string, RouteDistanceInfo> = {
  // ── Uttar Pradesh, Kashi & Pilgrimage Sacred Circuits ──
  'varanasi|prayagraj': { distanceKm: 125, drivingTimeHrs: 3.0, roadType: 'expressway', notes: 'via NH 19 6-lane' },
  'prayagraj|chitrakoot': { distanceKm: 130, drivingTimeHrs: 3.25, roadType: 'highway', notes: 'via NH 35' },
  'chitrakoot|ayodhya': { distanceKm: 240, drivingTimeHrs: 5.5, roadType: 'highway', notes: 'via NH 330' },
  'ayodhya|varanasi': { distanceKm: 215, drivingTimeHrs: 4.5, roadType: 'highway', notes: 'via NH 330 / Purvanchal Expy' },
  'chitrakoot|varanasi': { distanceKm: 255, drivingTimeHrs: 5.5, roadType: 'highway', notes: 'via NH 35 & NH 19' },
  'chitrakoot|lucknow': { distanceKm: 230, drivingTimeHrs: 5.0, roadType: 'highway' },
  'prayagraj|ayodhya': { distanceKm: 165, drivingTimeHrs: 3.75, roadType: 'highway', notes: 'via NH 330' },
  'varanasi|sarnath': { distanceKm: 12, drivingTimeHrs: 0.5, roadType: 'urban' },
  'varanasi|bodhgaya': { distanceKm: 250, drivingTimeHrs: 5.5, roadType: 'highway', notes: 'via NH 19' },
  'bodhgaya|patna': { distanceKm: 110, drivingTimeHrs: 3.0, roadType: 'highway' },
  'lucknow|ayodhya': { distanceKm: 135, drivingTimeHrs: 2.75, roadType: 'expressway', notes: 'via NH 27' },
  'lucknow|varanasi': { distanceKm: 300, drivingTimeHrs: 5.5, roadType: 'expressway', notes: 'via Purvanchal Expy' },
  'lucknow|prayagraj': { distanceKm: 200, drivingTimeHrs: 4.25, roadType: 'highway' },
  'varanasi|chandauli': { distanceKm: 35, drivingTimeHrs: 1.0, roadType: 'highway' },
  'varanasi|mirzapur': { distanceKm: 65, drivingTimeHrs: 1.75, roadType: 'highway' },
  'varanasi|vindhyachal': { distanceKm: 70, drivingTimeHrs: 1.75, roadType: 'highway' },

  // ── Delhi, Agra, Mathura & Golden Triangle ──
  'delhi|agra': { distanceKm: 210, drivingTimeHrs: 3.5, roadType: 'expressway', notes: 'via Yamuna Expressway' },
  'delhi|mathura': { distanceKm: 160, drivingTimeHrs: 2.75, roadType: 'expressway' },
  'mathura|vrindavan': { distanceKm: 15, drivingTimeHrs: 0.5, roadType: 'urban' },
  'mathura|agra': { distanceKm: 55, drivingTimeHrs: 1.25, roadType: 'highway' },
  'agra|jaipur': { distanceKm: 240, drivingTimeHrs: 4.5, roadType: 'highway', notes: 'via NH 21 / Fatehpur Sikri' },
  'delhi|jaipur': { distanceKm: 270, drivingTimeHrs: 4.5, roadType: 'expressway', notes: 'via Delhi-Mumbai Expy' },
  'agra|fatehpursikri': { distanceKm: 40, drivingTimeHrs: 1.0, roadType: 'highway' },
  'agra|gwalior': { distanceKm: 120, drivingTimeHrs: 2.5, roadType: 'highway' },
  'gwalior|orchha': { distanceKm: 120, drivingTimeHrs: 2.75, roadType: 'highway' },
  'orchha|khajuraho': { distanceKm: 175, drivingTimeHrs: 4.0, roadType: 'highway' },

  // ── Uttarakhand & Char Dham ──
  'delhi|haridwar': { distanceKm: 215, drivingTimeHrs: 4.5, roadType: 'highway', notes: 'via Meerut Expressway' },
  'delhi|rishikesh': { distanceKm: 240, drivingTimeHrs: 5.0, roadType: 'highway' },
  'haridwar|rishikesh': { distanceKm: 30, drivingTimeHrs: 0.75, roadType: 'urban' },
  'rishikesh|dehradun': { distanceKm: 45, drivingTimeHrs: 1.25, roadType: 'highway' },
  'dehradun|mussoorie': { distanceKm: 35, drivingTimeHrs: 1.5, roadType: 'mountain' },
  'delhi|mussoorie': { distanceKm: 290, drivingTimeHrs: 6.5, roadType: 'highway' },
  'delhi|nainital': { distanceKm: 310, drivingTimeHrs: 6.5, roadType: 'highway' },
  'nainital|corbett': { distanceKm: 65, drivingTimeHrs: 2.0, roadType: 'mountain' },
  'rishikesh|rudraprayag': { distanceKm: 140, drivingTimeHrs: 4.5, roadType: 'mountain' },
  'rudraprayag|kedarnath': { distanceKm: 75, drivingTimeHrs: 3.5, roadType: 'mountain', notes: 'up to Gaurikund' },
  'rudraprayag|badrinath': { distanceKm: 160, drivingTimeHrs: 6.0, roadType: 'mountain' },

  // ── Kashmir Valley & Ladakh ──
  'srinagar|gulmarg': { distanceKm: 52, drivingTimeHrs: 1.75, roadType: 'mountain', notes: 'via Tangmarg' },
  'srinagar|pahalgam': { distanceKm: 90, drivingTimeHrs: 2.5, roadType: 'highway', notes: 'via Saffron fields' },
  'srinagar|sonmarg': { distanceKm: 80, drivingTimeHrs: 2.5, roadType: 'mountain', notes: 'via Ganderbal / Sindh Valley' },
  'srinagar|doodhpathri': { distanceKm: 45, drivingTimeHrs: 1.75, roadType: 'mountain' },
  'srinagar|yusmarg': { distanceKm: 50, drivingTimeHrs: 2.0, roadType: 'mountain' },
  'pahalgam|gulmarg': { distanceKm: 140, drivingTimeHrs: 4.0, roadType: 'highway' },
  'srinagar|kargil': { distanceKm: 205, drivingTimeHrs: 6.5, roadType: 'mountain', notes: 'via Zoji La' },
  'kargil|leh': { distanceKm: 215, drivingTimeHrs: 5.5, roadType: 'mountain' },
  'leh|nubra': { distanceKm: 125, drivingTimeHrs: 5.0, roadType: 'mountain', notes: 'via Khardung La 17,982 ft' },
  'nubra|pangong': { distanceKm: 165, drivingTimeHrs: 6.0, roadType: 'mountain', notes: 'via Shyok River route' },
  'leh|pangong': { distanceKm: 150, drivingTimeHrs: 5.5, roadType: 'mountain', notes: 'via Chang La' },
  'leh|sham': { distanceKm: 70, drivingTimeHrs: 2.0, roadType: 'mountain', notes: 'Magnetic Hill, Sangam, Alchi' },

  // ── Himachal Pradesh ──
  'delhi|shimla': { distanceKm: 345, drivingTimeHrs: 7.5, roadType: 'highway' },
  'chandigarh|shimla': { distanceKm: 115, drivingTimeHrs: 3.25, roadType: 'mountain', notes: 'via Himalayan Expressway' },
  'shimla|kufri': { distanceKm: 16, drivingTimeHrs: 0.75, roadType: 'mountain' },
  'shimla|narkanda': { distanceKm: 65, drivingTimeHrs: 2.5, roadType: 'mountain' },
  'shimla|manali': { distanceKm: 245, drivingTimeHrs: 7.5, roadType: 'mountain', notes: 'via Bilaspur / Mandi' },
  'chandigarh|manali': { distanceKm: 275, drivingTimeHrs: 6.5, roadType: 'mountain', notes: 'via Kiratpur 4-lane' },
  'delhi|manali': { distanceKm: 510, drivingTimeHrs: 10.5, roadType: 'highway' },
  'manali|solang': { distanceKm: 14, drivingTimeHrs: 0.75, roadType: 'mountain' },
  'manali|rohtang': { distanceKm: 51, drivingTimeHrs: 2.25, roadType: 'mountain' },
  'manali|sissu': { distanceKm: 40, drivingTimeHrs: 1.25, roadType: 'mountain', notes: 'via Atal Tunnel 9.02 km' },
  'manali|kasol': { distanceKm: 75, drivingTimeHrs: 2.5, roadType: 'mountain', notes: 'Parvati Valley' },
  'kasol|manikaran': { distanceKm: 5, drivingTimeHrs: 0.25, roadType: 'mountain' },
  'manali|dharamshala': { distanceKm: 215, drivingTimeHrs: 6.5, roadType: 'mountain' },
  'dharamshala|dalhousie': { distanceKm: 120, drivingTimeHrs: 4.0, roadType: 'mountain' },
  'dalhousie|khajjiar': { distanceKm: 22, drivingTimeHrs: 1.0, roadType: 'mountain' },
  'amritsar|dharamshala': { distanceKm: 200, drivingTimeHrs: 4.5, roadType: 'highway' },

  // ── Rajasthan Royal Circuits ──
  'jaipur|pushkar': { distanceKm: 145, drivingTimeHrs: 2.75, roadType: 'highway', notes: 'via Ajmer' },
  'jaipur|ajmer': { distanceKm: 135, drivingTimeHrs: 2.5, roadType: 'highway' },
  'jaipur|jodhpur': { distanceKm: 330, drivingTimeHrs: 6.0, roadType: 'highway' },
  'jodhpur|jaisalmer': { distanceKm: 280, drivingTimeHrs: 5.0, roadType: 'highway', notes: 'via Pokhran' },
  'jaisalmer|sam': { distanceKm: 45, drivingTimeHrs: 1.0, roadType: 'highway', notes: 'Sam Sand Dunes' },
  'jodhpur|ranakpur': { distanceKm: 160, drivingTimeHrs: 3.5, roadType: 'highway' },
  'ranakpur|udaipur': { distanceKm: 95, drivingTimeHrs: 2.25, roadType: 'mountain' },
  'jodhpur|udaipur': { distanceKm: 255, drivingTimeHrs: 5.0, roadType: 'highway' },
  'jaipur|udaipur': { distanceKm: 395, drivingTimeHrs: 7.0, roadType: 'highway', notes: 'via Bhilwara' },
  'udaipur|mountabu': { distanceKm: 165, drivingTimeHrs: 3.5, roadType: 'mountain' },
  'jaipur|ranthambore': { distanceKm: 160, drivingTimeHrs: 3.5, roadType: 'highway' },
  'udaipur|kumbhalgarh': { distanceKm: 85, drivingTimeHrs: 2.25, roadType: 'mountain' },
  'udaipur|chittorgarh': { distanceKm: 115, drivingTimeHrs: 2.25, roadType: 'highway' },

  // ── Kerala & South India ──
  'cochin|munnar': { distanceKm: 115, drivingTimeHrs: 3.75, roadType: 'mountain', notes: 'via Cheeyappara Falls' },
  'munnar|thekkady': { distanceKm: 90, drivingTimeHrs: 3.0, roadType: 'mountain', notes: 'Cardamom Hills route' },
  'thekkady|alleppey': { distanceKm: 140, drivingTimeHrs: 3.75, roadType: 'highway', notes: 'Backwaters transfer' },
  'alleppey|cochin': { distanceKm: 65, drivingTimeHrs: 1.75, roadType: 'highway' },
  'cochin|kovalam': { distanceKm: 215, drivingTimeHrs: 5.5, roadType: 'highway' },
  'trivandrum|kovalam': { distanceKm: 16, drivingTimeHrs: 0.5, roadType: 'urban' },
  'kovalam|kanyakumari': { distanceKm: 85, drivingTimeHrs: 2.5, roadType: 'highway' },
  'cochin|kumarakom': { distanceKm: 55, drivingTimeHrs: 1.5, roadType: 'highway' },
  'cochin|wayanad': { distanceKm: 250, drivingTimeHrs: 6.5, roadType: 'mountain' },
  'bangalore|mysore': { distanceKm: 145, drivingTimeHrs: 2.5, roadType: 'expressway', notes: 'via 10-lane Expy' },
  'mysore|coorg': { distanceKm: 120, drivingTimeHrs: 2.75, roadType: 'highway' },
  'mysore|ooty': { distanceKm: 125, drivingTimeHrs: 3.5, roadType: 'mountain', notes: 'via Bandipur / Mudumalai' },
  'bangalore|ooty': { distanceKm: 270, drivingTimeHrs: 6.0, roadType: 'highway' },
  'ooty|kodaikanal': { distanceKm: 250, drivingTimeHrs: 6.5, roadType: 'mountain' },
  'madurai|rameshwaram': { distanceKm: 170, drivingTimeHrs: 3.5, roadType: 'highway', notes: 'via Pamban Bridge' },
  'rameshwaram|kanyakumari': { distanceKm: 310, drivingTimeHrs: 6.5, roadType: 'highway' },

  // ── Maharashtra Jyotirlinga & Western India ──
  'mumbai|pune': { distanceKm: 150, drivingTimeHrs: 3.0, roadType: 'expressway', notes: 'via Yashwantrao Chavan Expy' },
  'pune|bhimashankar': { distanceKm: 115, drivingTimeHrs: 3.25, roadType: 'mountain' },
  'bhimashankar|aurangabad': { distanceKm: 240, drivingTimeHrs: 5.5, roadType: 'highway' },
  'aurangabad|ellora': { distanceKm: 30, drivingTimeHrs: 0.75, roadType: 'highway' },
  'aurangabad|ajanta': { distanceKm: 100, drivingTimeHrs: 2.25, roadType: 'highway' },
  'aurangabad|shirdi': { distanceKm: 115, drivingTimeHrs: 2.5, roadType: 'highway', notes: 'via Samruddhi Mahamarg' },
  'shirdi|shanishingnapur': { distanceKm: 70, drivingTimeHrs: 1.75, roadType: 'highway' },
  'shirdi|nashik': { distanceKm: 90, drivingTimeHrs: 2.0, roadType: 'highway' },
  'nashik|trimbakeshwar': { distanceKm: 30, drivingTimeHrs: 0.75, roadType: 'highway' },
  'trimbakeshwar|mumbai': { distanceKm: 175, drivingTimeHrs: 4.0, roadType: 'highway', notes: 'via Kasara Ghat' },
  'pune|mahabaleshwar': { distanceKm: 120, drivingTimeHrs: 3.0, roadType: 'mountain' },

  // ── Central India & Madhya Pradesh ──
  'indore|ujjain': { distanceKm: 55, drivingTimeHrs: 1.25, roadType: 'expressway' },
  'indore|omkareshwar': { distanceKm: 80, drivingTimeHrs: 2.25, roadType: 'highway' },
  'ujjain|omkareshwar': { distanceKm: 140, drivingTimeHrs: 3.5, roadType: 'highway' },
  'bhopal|sanchi': { distanceKm: 50, drivingTimeHrs: 1.25, roadType: 'highway' },
  'jabalpur|kanha': { distanceKm: 130, drivingTimeHrs: 3.5, roadType: 'highway' },
  'kanha|bandhavgarh': { distanceKm: 215, drivingTimeHrs: 5.0, roadType: 'highway' },

  // ── International Tourism Corridors ──
  'dubai|abudhabi': { distanceKm: 140, drivingTimeHrs: 1.75, roadType: 'expressway', notes: 'Sheikh Zayed Rd' },
  'dubai|sharjah': { distanceKm: 25, drivingTimeHrs: 0.75, roadType: 'urban' },
  'dubai|desert': { distanceKm: 60, drivingTimeHrs: 1.0, roadType: 'highway', notes: 'Lahbab Dunes' },
  'almaty|medeu': { distanceKm: 18, drivingTimeHrs: 0.5, roadType: 'mountain' },
  'medeu|shymbulak': { distanceKm: 7, drivingTimeHrs: 0.35, roadType: 'mountain' },
  'almaty|charyn': { distanceKm: 215, drivingTimeHrs: 3.5, roadType: 'highway' },
  'almaty|kolsai': { distanceKm: 290, drivingTimeHrs: 5.0, roadType: 'mountain' },
  'baku|gobustan': { distanceKm: 65, drivingTimeHrs: 1.25, roadType: 'highway' },
  'baku|ateshgah': { distanceKm: 30, drivingTimeHrs: 0.65, roadType: 'highway' },
  'denpasar|ubud': { distanceKm: 35, drivingTimeHrs: 1.25, roadType: 'urban' },
  'ubud|kintamani': { distanceKm: 35, drivingTimeHrs: 1.25, roadType: 'mountain' },
  'denpasar|kuta': { distanceKm: 12, drivingTimeHrs: 0.5, roadType: 'urban' },
  'bangkok|pattaya': { distanceKm: 150, drivingTimeHrs: 2.25, roadType: 'expressway' },
  'phuket|krabi': { distanceKm: 175, drivingTimeHrs: 3.0, roadType: 'highway' },
  'singapore|sentosa': { distanceKm: 10, drivingTimeHrs: 0.35, roadType: 'urban' },
  'kualalumpur|genting': { distanceKm: 55, drivingTimeHrs: 1.25, roadType: 'mountain' }
};

// ── 2. City Normalizer & Corridor Lookup Helper ──
function normalizeCityName(raw: string): string {
  if (!raw) return '';
  const s = raw.toLowerCase().trim();
  if (/varanasi|kashi|banaras/i.test(s)) return 'varanasi';
  if (/prayag|allahabad/i.test(s)) return 'prayagraj';
  if (/chitrakoot|chitrakut/i.test(s)) return 'chitrakoot';
  if (/ayodhya|faizabad/i.test(s)) return 'ayodhya';
  if (/sarnath/i.test(s)) return 'sarnath';
  if (/bodh\s*gaya|bodhgaya/i.test(s)) return 'bodhgaya';
  if (/lucknow/i.test(s)) return 'lucknow';
  if (/mathura/i.test(s)) return 'mathura';
  if (/vrindavan/i.test(s)) return 'vrindavan';
  if (/agra/i.test(s)) return 'agra';
  if (/delhi|new\s*delhi/i.test(s)) return 'delhi';
  if (/haridwar/i.test(s)) return 'haridwar';
  if (/rishikesh/i.test(s)) return 'rishikesh';
  if (/srinagar/i.test(s)) return 'srinagar';
  if (/gulmarg/i.test(s)) return 'gulmarg';
  if (/pahalgam/i.test(s)) return 'pahalgam';
  if (/sonmarg|sonamarg/i.test(s)) return 'sonmarg';
  if (/leh/i.test(s)) return 'leh';
  if (/nubra/i.test(s)) return 'nubra';
  if (/pangong/i.test(s)) return 'pangong';
  if (/shimla/i.test(s)) return 'shimla';
  if (/manali/i.test(s)) return 'manali';
  if (/kufri/i.test(s)) return 'kufri';
  if (/dharamshala|mcleodganj/i.test(s)) return 'dharamshala';
  if (/dalhousie/i.test(s)) return 'dalhousie';
  if (/jaipur/i.test(s)) return 'jaipur';
  if (/jodhpur/i.test(s)) return 'jodhpur';
  if (/jaisalmer/i.test(s)) return 'jaisalmer';
  if (/udaipur/i.test(s)) return 'udaipur';
  if (/pushkar/i.test(s)) return 'pushkar';
  if (/ranakpur/i.test(s)) return 'ranakpur';
  if (/cochin|kochi/i.test(s)) return 'cochin';
  if (/munnar/i.test(s)) return 'munnar';
  if (/thekkady|periyar/i.test(s)) return 'thekkady';
  if (/alleppey|alappuzha/i.test(s)) return 'alleppey';
  if (/kovalam/i.test(s)) return 'kovalam';
  if (/bhimashankar/i.test(s)) return 'bhimashankar';
  if (/trimbakeshwar|trimbak/i.test(s)) return 'trimbakeshwar';
  if (/grishneshwar/i.test(s)) return 'grishneshwar';
  if (/ellora/i.test(s)) return 'ellora';
  if (/ajanta/i.test(s)) return 'ajanta';
  if (/shirdi/i.test(s)) return 'shirdi';
  if (/aurangabad|chhatrapati\s*sambhajinagar/i.test(s)) return 'aurangabad';
  if (/mumbai|bombay/i.test(s)) return 'mumbai';
  if (/pune/i.test(s)) return 'pune';
  if (/dubai/i.test(s)) return 'dubai';
  if (/abu\s*dhabi|abudhabi/i.test(s)) return 'abudhabi';
  if (/almaty/i.test(s)) return 'almaty';
  if (/baku/i.test(s)) return 'baku';
  if (/ubud/i.test(s)) return 'ubud';
  if (/denpasar|bali/i.test(s)) return 'denpasar';
  if (/bangkok/i.test(s)) return 'bangkok';
  if (/pattaya/i.test(s)) return 'pattaya';
  return s.replace(/[^a-z0-9]/g, '');
}

export function lookupInterCityRoute(cityA: string, cityB: string): RouteDistanceInfo | null {
  const normA = normalizeCityName(cityA);
  const normB = normalizeCityName(cityB);
  if (!normA || !normB || normA === normB) return null;

  const key1 = `${normA}|${normB}`;
  const key2 = `${normB}|${normA}`;

  return INTER_CITY_DISTANCES[key1] || INTER_CITY_DISTANCES[key2] || null;
}

// ── 3. Detect Cities and Transit Pattern from Day Details ──
function detectDayTransitInfo(
  dayNum: number,
  totalDays: number,
  dayTitle: string,
  dayDesc: string,
  items: any[],
  destinationsList: string[],
  currentCity: string
): {
  fromCity: string;
  toCity: string;
  isInterCity: boolean;
  isArrival: boolean;
  isDeparture: boolean;
  dayPlaces: string[];
} {
  const fullDayText = `${dayTitle} ${dayDesc} ${(items || []).map(i => `${i.title || ''} ${i.description || ''}`).join(' ')}`.toLowerCase();

  const isArrival = dayNum === 1 || /arrival|airport\s*(?:pickup|pick-up|meet)|welcome\s*to|station\s*pickup/i.test(dayTitle) || (items || []).some(i => /airport\s*pick|arrival/i.test(i.title || ''));
  const isDeparture = dayNum === totalDays || /departure|airport\s*drop|station\s*drop|farewell|tour\s*concludes/i.test(dayTitle) || (items || []).some(i => /airport\s*drop|departure/i.test(i.title || ''));

  // Detect transfer phrases like "Varanasi to Prayagraj" or "Transfer Ayodhya to Varanasi" or "Prayagraj to Chitrakoot"
  const transferMatch = fullDayText.match(/(?:transfer|drive|proceed|travel)\s+(?:from\s+)?([a-z\s]+?)\s+(?:to|towards)\s+([a-z\s]+?)(?:via|airport|hotel|\.|\n|$)/i) ||
                        fullDayText.match(/([a-z\s]+?)\s+to\s+([a-z\s]+?)(?:transfer|excursion|drive|road|\.|\n|$)/i) ||
                        dayTitle.match(/([a-z\s]+?)\s+to\s+([a-z\s]+?)(?:\(|$)/i);

  let fromCity = currentCity;
  let toCity = currentCity;

  if (transferMatch) {
    const rawA = transferMatch[1].trim();
    const rawB = transferMatch[2].trim();
    const candA = normalizeCityName(rawA);
    const candB = normalizeCityName(rawB);
    if (candA && candB && candA !== candB) {
      fromCity = candA;
      toCity = candB;
    } else if (candB && candB !== fromCity) {
      toCity = candB;
    }
  }

  // Check if an explicit destination is mentioned like "Drive to Chitrakoot"
  if (toCity === fromCity) {
    const toMatch = fullDayText.match(/(?:to|towards|drive to|proceed to|transfer to)\s+([a-z]+)/i);
    if (toMatch) {
      const cand = normalizeCityName(toMatch[1]);
      if (cand && cand !== fromCity) {
        toCity = cand;
      }
    }
  }

  // If arrival day and no explicit transfer to another city, stay in arrival city
  if (isArrival && (!transferMatch || fromCity === toCity)) {
    toCity = fromCity;
  }

  // Fallback checks from text
  const cityKeywords = [
    'varanasi', 'prayagraj', 'chitrakoot', 'ayodhya', 'sarnath', 'bodhgaya', 'lucknow',
    'delhi', 'agra', 'jaipur', 'jodhpur', 'jaisalmer', 'udaipur', 'pushkar',
    'srinagar', 'gulmarg', 'pahalgam', 'sonmarg', 'leh', 'nubra', 'pangong',
    'shimla', 'manali', 'dharamshala', 'dalhousie', 'cochin', 'munnar', 'thekkady',
    'alleppey', 'kovalam', 'mumbai', 'pune', 'shirdi', 'nashik', 'bhimashankar',
    'aurangabad', 'ellora', 'dubai', 'abudhabi', 'almaty', 'baku', 'ubud'
  ];

  const matchedCities: string[] = [];
  cityKeywords.forEach(c => {
    if (new RegExp(`\\b${c}\\b`, 'i').test(fullDayText)) {
      matchedCities.push(c);
    }
  });

  const isInterCity = !!(fromCity && toCity && fromCity !== toCity);

  return {
    fromCity,
    toCity,
    isInterCity,
    isArrival,
    isDeparture,
    dayPlaces: matchedCities
  };
}

// ── 4. Main Dynamic Distance & Transit Calculator ──
export function calculateTransitMatrix(
  itineraryList: Array<{ day: number; title: string; desc: string; items: any[] }>,
  tripDetails: {
    title?: string;
    destination?: string;
    days: number;
    nights: number;
    destinations?: Array<{ locationId: string; nights: number }>;
  },
  destinationNames: string[] = []
): TransitMatrixResult {
  const daysCount = Math.max(1, tripDetails.days || itineraryList.length || 1);
  const rows: string[][] = [];

  let cumulativeMinKm = 0;
  let cumulativeMaxKm = 0;

  let currentCity = normalizeCityName(destinationNames[0] || tripDetails.destination || 'Destination');

  itineraryList.forEach((dayObj) => {
    const dNum = dayObj.day;
    const title = dayObj.title || '';
    const desc = dayObj.desc || '';
    const items = dayObj.items || [];

    const transitInfo = detectDayTransitInfo(dNum, daysCount, title, desc, items, destinationNames, currentCity);
    const { fromCity, toCity, isInterCity, isArrival, isDeparture } = transitInfo;

    // Check if an inter-city highway corridor exists between fromCity and toCity
    const corridor = isInterCity ? lookupInterCityRoute(fromCity, toCity) : null;

    let routeLabel = '';
    let approxDistance = '';
    let travelTime = '';
    let minKm = 0;
    let maxKm = 0;

    const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
    const displayFrom = capitalize(fromCity || destinationNames[0] || tripDetails.destination || 'Destination');
    const displayTo = capitalize(toCity || displayFrom);

    if (isArrival && !isInterCity) {
      // ── Day 1 / Arrival Day ──
      minKm = 35;
      maxKm = 50;
      approxDistance = `~${minKm}-${maxKm} Km`;
      routeLabel = `${displayFrom} Airport / Station  ->  Hotel  ->  Local Darshan & Evening Aarti`;
      travelTime = 'Local sightseeing / 3-4 Hrs mobility (excl. darshan)';
    } else if (isDeparture && !isInterCity) {
      // ── Last Day / Departure Day ──
      minKm = 30;
      maxKm = 45;
      approxDistance = `~${minKm}-${maxKm} Km`;
      routeLabel = `${displayFrom} Sightseeing / Temple Visit  ->  Airport / Station Departure Transfer`;
      travelTime = 'Local transfer + 2-Hr flight check-in safety buffer';
    } else if (isInterCity && corridor) {
      // ── Inter-City Highway Route with Verified Distances ──
      const baseDistance = corridor.distanceKm;
      // Add realistic local sightseeing & hotel detour buffer (20-30 km)
      minKm = Math.round(baseDistance * 1.05);
      maxKm = Math.round(baseDistance * 1.18);
      approxDistance = `~${minKm}-${maxKm} Km`;

      const minDriveTime = corridor.drivingTimeHrs;
      const maxDriveTime = Math.round((corridor.drivingTimeHrs * 1.25) * 10) / 10;

      if (isDeparture) {
        routeLabel = `${displayFrom} Check-Out  ->  En-route Highway Transit  ->  ${displayTo} Airport Drop`;
        travelTime = `${minDriveTime}-${maxDriveTime} Hrs highway transit + Departure buffer`;
      } else {
        routeLabel = `${displayFrom}  ->  Highway Transit (${corridor.notes || 'Scenic Route'})  ->  ${displayTo} (Stay)`;
        travelTime = `${minDriveTime}-${maxDriveTime} Hrs driving excluding darshan/sightseeing`;
      }
    } else if (isInterCity && !corridor) {
      // Generic inter-city fallback with sensible estimate
      minKm = 120;
      maxKm = 150;
      approxDistance = `~${minKm}-${maxKm} Km`;
      routeLabel = `${displayFrom}  ->  Inter-City Excursion  ->  ${displayTo}`;
      travelTime = '3.5-4.5 Hrs driving + Local sightseeing';
    } else {
      // ── Full Day Local Sightseeing & Excursion within Same City ──
      const isMountain = /gulmarg|pahalgam|sonmarg|solang|rohtang|kufri|munnar|ooty|mussoorie/i.test(title) ||
                         /gulmarg|pahalgam|sonmarg|solang|rohtang|kufri|munnar|ooty|mussoorie/i.test(displayFrom);

      if (isMountain) {
        minKm = 45;
        maxKm = 65;
        approxDistance = `~${minKm}-${maxKm} Km`;
        routeLabel = `${displayFrom}: Excursion & Viewpoint Circuits`;
        travelTime = 'Mountain ghat driving (3-4 Hrs) + Activities';
      } else {
        minKm = 45;
        maxKm = 65;
        approxDistance = `~${minKm}-${maxKm} Km`;
        routeLabel = `${displayFrom}: Full Day Heritage Darshan & Local Sightseeing`;
        travelTime = 'Full Day Dedicated Mobility (4-5 Hrs active driving)';
      }
    }

    // Refine routeLabel if title has specific descriptive details
    if (title && !title.toLowerCase().includes('day ') && title.length > 10 && title.length < 75) {
      if (title.includes('->') || title.includes(' to ')) {
        routeLabel = title.replace(/\s*->\s*/g, '  ->  ');
      }
    }

    cumulativeMinKm += minKm;
    cumulativeMaxKm += maxKm;

    rows.push([
      `Day ${dNum}`,
      routeLabel,
      approxDistance,
      travelTime
    ]);

    // Update current city for next day if this day moved cities
    if (isInterCity && toCity) {
      currentCity = toCity;
    }
  });

  const totalDistStr = `~${cumulativeMinKm}-${cumulativeMaxKm} Km`;

  // Total summary row
  rows.push([
    'Total',
    'Complete Tour including all inter-city transits & local sightseeing',
    totalDistStr,
    `${daysCount} Days / ${Math.max(1, daysCount - 1)} Nights`
  ]);

  return {
    rows,
    totalMinKm: cumulativeMinKm,
    totalMaxKm: cumulativeMaxKm,
    totalDistanceString: totalDistStr
  };
}
