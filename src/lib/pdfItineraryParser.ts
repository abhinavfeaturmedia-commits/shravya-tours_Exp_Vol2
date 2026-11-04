/**
 * DMC PDF & WhatsApp Itinerary Parser Engine
 * Combines high-speed browser PDF text extraction & canvas-based vision OCR fallback
 * with OpenRouter Frontier AI (NVIDIA Nemotron 3 Ultra 550B, Nemotron 3.5 Super VL, Gemma 4)
 * and a deterministic heuristic regex fallback engine.
 */

import { extractTextFromPdf, ExtractedPdfData, fileToBase64, renderPdfPagesToImages } from './pdfExtractor';
import { robustParseJson } from './gemini';
import { api } from './api';

export interface ParsedItineraryItem {
  type: 'hotel' | 'activity' | 'transport' | 'flight' | 'guide' | 'note' | 'visa';
  title: string;
  description?: string;
  time?: string;
  duration?: string;
  cost?: number;
  hotelDetails?: {
    hotelName?: string;
    roomType?: string;
    mealPlan?: string;
    starRating?: string;
  };
  transportDetails?: {
    vehicleType?: string;
    serviceMode?: 'Private' | 'SIC' | 'Self-Drive';
  };
}

export interface ParsedDayPlan {
  day: number;
  title: string;
  overnightCity?: string;
  notes?: string;
  items: ParsedItineraryItem[];
}

export interface ParsedDmcPackage {
  title: string;
  destination: string;
  days: number;
  nights: number;
  startDate?: string;
  roomSharing?: 'Single' | 'Double' | 'Triple' | 'Quad';
  roomsCount?: number;
  mealPlanCode?: 'EP' | 'CP' | 'MAP' | 'AP' | 'AI';
  hotelsList?: Array<{
    hotelName: string;
    starRating?: string;
    roomCategory?: string;
    occupancy?: string;
    costPerPerson?: number;
  }>;
  destinationsList?: Array<{ name: string; nights: number }>;
  included: string[];
  notIncluded: string[];
  termsAndConditions?: string;
  faqs?: Array<{ q: string; a: string }>;
  daysPlan: ParsedDayPlan[];
  pricing?: {
    totalPackageCost?: number;
    costPerPerson?: number;
    currency?: string;
    pricingBasis?: string;
    vehicleCost?: number;
    hotelCostTotal?: number;
  };
  paxDetails?: {
    adults?: number;
    children?: number;
  };
  source: 'ai' | 'heuristic';
  modelUsed?: string;
  rawTextPreview?: string;
}

// ─── Available Models for Dropdown / Execution ───────────────────────────

export interface DmcAiModelOption {
  id: string;
  name: string;
  tag: string;
  context: string;
  description: string;
  icon: string;
  badgeColor: string;
}

export const DMC_AI_MODELS: DmcAiModelOption[] = [
  {
    id: 'auto',
    name: 'Auto Smart Router',
    tag: 'Recommended',
    context: 'Auto Load-Balance',
    description: 'Automatically routes to the fastest, healthiest AI engine in the cluster.',
    icon: '✨',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300'
  },
  {
    id: 'openrouter/free',
    name: 'OpenRouter Free Mesh',
    tag: 'Fast & Dynamic',
    context: '200k Context',
    description: 'High-speed cluster with instant load balancing across available free AI models.',
    icon: '⚡',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300'
  },
  {
    id: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    name: 'NVIDIA Nemotron 3 Ultra 550B',
    tag: 'Best Reasoning',
    context: '1M Context',
    description: 'Massive 550B MoE model. Unmatched comprehension of long supplier contracts & complex tours.',
    icon: '🧠',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300'
  },
  {
    id: 'nvidia/nemotron-3.5-super-vl:free',
    name: 'NVIDIA Nemotron 3.5 Super VL',
    tag: 'Vision OCR',
    context: '1M Context',
    description: 'Vision-Language model optimized for multi-column tables, scanned quotes & graphic flyers.',
    icon: '👁️',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300'
  },
  {
    id: 'google/gemma-4-31b-it:free',
    name: 'Google Gemma 4 31B',
    tag: 'High Precision',
    context: '262k Context',
    description: 'DeepMind dense model. Strict JSON schema with rich Indian & global travel circuit expertise.',
    icon: '🌟',
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-300'
  }
];

// Helper to safely parse database settings values whether string, JSON, or boolean
const safeParseSetting = (val: any): any => {
  if (val === undefined || val === null) return '';
  if (typeof val === 'boolean' || typeof val === 'number') return val;
  if (typeof val !== 'string') return val;
  const trimmed = val.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  return trimmed;
};

// ─── OpenRouter / AI Settings Helper ──────────────────────────────────────────

const getOpenRouterConfig = async () => {
  try {
    const res = await api.getSettings();
    const data = res?.data || [];
    const config = {
      enabled: false,
      apiKey: '',
      defaultModel: 'openrouter/free'
    };
    if (data && Array.isArray(data)) {
      data.forEach((item: any) => {
        if (item.key === 'integrations.openrouter.enabled') {
          config.enabled = Boolean(safeParseSetting(item.value));
        } else if (item.key === 'integrations.openrouter.apiKey') {
          config.apiKey = String(safeParseSetting(item.value) || '').trim();
        } else if (item.key === 'integrations.openrouter.defaultModel') {
          config.defaultModel = String(safeParseSetting(item.value) || '').trim() || 'openrouter/free';
        }
      });
    }
    return config;
  } catch (e) {
    return {
      enabled: false,
      apiKey: '',
      defaultModel: 'openrouter/free'
    };
  }
};

// ─── AI Extraction Prompt ─────────────────────────────────────────────────────

const buildPdfPrompt = (rawContent: string) => `
You are an Elite Senior Destination Management Company (DMC) Tour Operations Specialist & Travel Pricing Analyst for SHRAWELLO Travel Hub.
Analyze the following supplier travel quotation / itinerary proposal (PDF content or WhatsApp message) and extract a complete, highly structured holiday package blueprint.

============================================================
RAW SUPPLIER QUOTATION CONTENT:
============================================================
${rawContent.slice(0, 120000)}
============================================================

TASK & EXTRACTION RULES:
1. PACKAGE OVERVIEW:
   - "title": Extract or craft an evocative, clear package title (e.g. "5N/6D Almaty Discovery: Mountains, Canyons & Culture" or "7N/8D Dubai Luxury Discovery"). CRITICAL MANDATE: NEVER use email greetings (e.g. "Dear Sir/Madam"), supplier pleasantries ("Greetings from Spas Tours"), or generic quotation labels as the title.
   - "destination": Primary state/region/country (e.g. "Almaty", "Kazakhstan", "Kashmir", "Himachal", "Dubai", "Kerala", "Bali", "Thailand", "Goa", "Rajasthan", "Sikkim", "Baku", "Georgia", "Vietnam").
   - "startDate": Check-in date or tour start date in YYYY-MM-DD format if mentioned (e.g. "Check In: 11 Nov 2026" -> "2026-11-11").
   - "days": Total duration in days (integer). If only nights are specified (e.g. 5 Nights), days = nights + 1.
   - "nights": Total overnight stays count (integer).
   - "roomSharing": Tour room occupancy ("Single" | "Double" | "Triple" | "Quad") if mentioned.
   - "mealPlanCode": Dining plan ("EP" | "CP" | "MAP" | "AP" | "AI"). If Indian Dinners + Breakfasts are included, use "MAP".
   - "destinationsList": Array of { "name": string, "nights": number } for all distinct stopover cities.

2. SUPPLIER PRICING & QUOTATION DETAILS:
   - "pricing": Extract exact pricing mentioned by the supplier:
     * "totalPackageCost": Total package amount (number, or 0 if not mentioned).
     * "costPerPerson": Net cost per person / per adult (number, or 0 if not stated).
     * "currency": Currency code (e.g. "INR", "USD", "AED", "EUR", "THB"). Default to "INR" for Indian destinations.
     * "pricingBasis": Pricing conditions (e.g. "Twin Sharing / 2 Pax", "Per Adult Net", "Total for 4 Pax").
     * "vehicleCost": Dedicated transport cost if quoted separately (or 0).
     * "hotelCostTotal": Total hotel accommodation cost if quoted separately (or 0).
   - "paxDetails": { "adults": number, "children": number } if mentioned.

3. DAY-BY-DAY ITINERARY ("daysPlan"):
   - For every scheduled day (Day 1, Day 2, etc.):
     * "day": Integer (1, 2, 3...)
     * "title": Clear theme/title for the day (e.g. "Arrival in Srinagar & Dal Lake Shikara Ride")
     * "overnightCity": The city where the traveler sleeps tonight (e.g. "Srinagar", "Gulmarg", "Pahalgam")
     * "notes": Essential notes, distance, altitude advice, or timing tips for this day.
     * "items": Break down the day's itinerary into discrete service items. Categorize each item strictly into:
       - "transport": Airport pickups, inter-city drives, scenic transfers, railway transfers.
       - "hotel": Hotel check-in, resort stay, houseboat stay, overnight rest. CRITICAL MANDATE: NEVER categorize "Breakfast at hotel", "Dinner transfer", or "Check-out" as "hotel". Meals are "activity", transfers are "transport".
       - "activity": Sightseeing, monuments, shikara ride, gondola ride, safaris, temple visits, adventure sports.
       - "flight": Flights, domestic air transfers.
       - "guide": Monument escort, local heritage guide, trekking guide.
       - "note": Important tips, weather warnings, dress codes, permit advice.
     * In each item, provide:
       - "title": Clear, concise name of the service (e.g. "Scenic Drive from Srinagar to Gulmarg via Tangmarg")
       - "description": 1-3 sentences describing the experience, route, viewpoints, or hotel details.
       - "time": Sensible time tag (e.g. "09:30 AM", "02:00 PM", "06:00 PM") matching the natural schedule sequence.
       - "duration": Realistic duration (e.g. "2.5 Hours", "45 Mins", "Full Day").
       - "cost": Item net cost if specified in supplier quotation, or 0.
       - "hotelDetails": For "hotel" items: { "hotelName": "...", "roomType": "Deluxe Room", "mealPlan": "MAP / CP / AP / EP", "starRating": "3 Star / 4 Star" }.
       - "transportDetails": For "transport" items: { "vehicleType": "Innova Crysta / Sedan / Tempo Traveller", "serviceMode": "Private" | "SIC" }.

4. INCLUSIONS & EXCLUSIONS:
   - "included": Extract every inclusion mentioned in the document as clear bullet points (hotels, meal plan, cab type, toll/parking, driver allowance, entry passes, shikara ride).
   - "notIncluded": Extract all exclusions (airfare, personal expenses, lunch, optional activities, camera fees, GST).
   - "termsAndConditions": Summary of any cancellation policy, payment terms, or remarks in the PDF.

OUTPUT FORMAT:
Return ONLY a valid raw JSON object matching this exact schema (no markdown formatting, no code fences, no leading text):
{
  "title": "5N/6D Enchanting Kashmir Holiday",
  "destination": "Kashmir",
  "days": 6,
  "nights": 5,
  "roomSharing": "Double",
  "roomsCount": 1,
  "mealPlanCode": "MAP",
  "destinationsList": [
    { "name": "Srinagar", "nights": 3 },
    { "name": "Gulmarg", "nights": 1 },
    { "name": "Pahalgam", "nights": 1 }
  ],
  "pricing": {
    "totalPackageCost": 38500,
    "costPerPerson": 19250,
    "currency": "INR",
    "pricingBasis": "Per Person on Twin Sharing Basis",
    "vehicleCost": 12000,
    "hotelCostTotal": 24000
  },
  "paxDetails": {
    "adults": 2,
    "children": 0
  },
  "included": [
    "05 Nights accommodation in selected hotels",
    "Daily breakfast and dinner (MAP)",
    "Private vehicle for all transfers and sightseeing"
  ],
  "notIncluded": [
    "Airfare / Train tickets",
    "Gondola tickets in Gulmarg",
    "Personal expenses"
  ],
  "termsAndConditions": "Standard DMC cancellation policy applies.",
  "daysPlan": [
    {
      "day": 1,
      "title": "Arrival in Srinagar & Dal Lake Shikara",
      "overnightCity": "Srinagar",
      "notes": "Acclimatize upon arrival. Relax along Dal Lake boulevard.",
      "items": [
        {
          "type": "transport",
          "title": "Airport Pickup & Transfer to Srinagar Hotel",
          "description": "Meet representative at Srinagar Airport and transfer ~14 km to hotel.",
          "time": "11:00 AM",
          "duration": "45 Mins",
          "cost": 0,
          "transportDetails": {
            "vehicleType": "Innova Crysta",
            "serviceMode": "Private"
          }
        },
        {
          "type": "hotel",
          "title": "Check-in at Hotel Heevan Srinagar",
          "description": "Check in to Deluxe Room with breakfast & dinner included.",
          "time": "01:00 PM",
          "duration": "Overnight",
          "cost": 0,
          "hotelDetails": {
            "hotelName": "Hotel Heevan",
            "roomType": "Deluxe Room",
            "mealPlan": "MAP",
            "starRating": "4 Star"
          }
        },
        {
          "type": "activity",
          "title": "Sunset Shikara Cruise on Dal Lake",
          "description": "Glide through floating gardens and Char Chinar island.",
          "time": "05:00 PM",
          "duration": "1.5 Hours",
          "cost": 0
        }
      ]
    }
  ]
}
`;

// ─── AI Call Executor with Multi-Model Fallbacks ──────────────────────────────

async function callAiWithPrompt(
  prompt: string,
  options?: {
    pdfBase64?: string;
    pdfImages?: string[];
    forcedModel?: string;
  }
): Promise<{ text: string; modelUsed: string }> {
  const config = await getOpenRouterConfig();
  const hasImages = !!(options?.pdfImages && options.pdfImages.length > 0);

  if (config.enabled && config.apiKey) {
    const candidateModels: string[] = [];

    // 1. If user picked a model explicitly
    if (options?.forcedModel && options.forcedModel !== 'auto') {
      candidateModels.push(options.forcedModel.replace(/^["']|["']$/g, '').trim());
    }

    // 2. If images are provided (scanned brochure), prioritize vision model
    if (hasImages) {
      candidateModels.push('nvidia/nemotron-3.5-super-vl:free');
    }

    // 3. User configured default model
    if (config.defaultModel && (!options?.forcedModel || options.forcedModel === 'auto')) {
      candidateModels.push(config.defaultModel.replace(/^["']|["']$/g, '').trim());
    }

    // 4. Default frontier reasoning queue (prioritize fast, healthy free models)
    candidateModels.push(
      'openrouter/free',
      'nvidia/nemotron-3-ultra-550b-a55b:free',
      'nvidia/nemotron-3.5-super-vl:free',
      'google/gemma-4-31b-it:free'
    );

    const uniqueModels = Array.from(new Set(candidateModels.filter(Boolean)));

    for (const model of uniqueModels) {
      try {
        console.log(`[DMC PDF Parser] Trying OpenRouter model: ${model}`);

        let messagesContent: any = prompt;
        if (hasImages) {
          messagesContent = [
            { type: 'text', text: prompt },
            ...options!.pdfImages!.slice(0, 4).map(img => ({
              type: 'image_url',
              image_url: { url: img }
            }))
          ];
        }

        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Shrawello Travel Hub'
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: messagesContent }]
          })
        });

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`[DMC PDF Parser] Model ${model} returned ${res.status}: ${errText}`);
          continue;
        }

        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content) {
          return { text: content, modelUsed: `OpenRouter (${model})` };
        }
      } catch (err) {
        console.warn(`[DMC PDF Parser] Model ${model} failed, trying next:`, err);
      }
    }
  }

  // Direct Gemini fallback if VITE_GEMINI_API_KEY is present
  const geminiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (geminiKey) {
    try {
      console.log('[DMC PDF Parser] Calling direct Google Gemini 1.5 Flash...');
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      let result;
      if (hasImages && options?.pdfImages) {
        const parts: any[] = [prompt];
        options.pdfImages.slice(0, 4).forEach(img => {
          const base64Data = img.split(',')[1] || img;
          parts.push({
            inlineData: {
              data: base64Data,
              mimeType: 'image/jpeg'
            }
          });
        });
        result = await model.generateContent(parts);
      } else if (options?.pdfBase64) {
        const base64Data = options.pdfBase64.split(',')[1] || options.pdfBase64;
        result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Data,
              mimeType: 'application/pdf'
            }
          }
        ]);
      } else {
        result = await model.generateContent(prompt);
      }

      return { text: result.response.text(), modelUsed: 'Google Gemini 1.5 Flash' };
    } catch (geminiErr) {
      console.warn('[DMC PDF Parser] Direct Gemini fallback failed:', geminiErr);
    }
  }

  throw new Error('AI parsing service unavailable. Please check your OpenRouter API key in Settings.');
}

// ─── Deterministic Heuristic Regex Parser (Offline Fallback) ──────────────────

export function parseDmcItineraryFallback(rawText: string, fileName?: string): ParsedDmcPackage {
  const cleanRaw = rawText.replace(/\uf0b7/g, '•').replace(/\u2022/g, '•');
  const lines = cleanRaw.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Detect Destination & Country
  const globalDestinations = [
    // Himachal & Hill Stations
    'Manali', 'Shimla', 'Dharamshala', 'Dalhousie', 'Spiti', 'Kasol', 'Kullu', 'Kaza', 'Jibhi', 'Bir Billing',
    // Kashmir & Ladakh
    'Kashmir', 'Srinagar', 'Gulmarg', 'Pahalgam', 'Sonmarg', 'Ladakh', 'Leh', 'Nubra', 'Pangong',
    // North & West
    'Goa', 'Jaipur', 'Udaipur', 'Jodhpur', 'Jaisalmer', 'Pushkar', 'Ranthambore', 'Rajasthan', 'Agra', 'Delhi',
    'Varanasi', 'Prayagraj', 'Ayodhya', 'Chitrakoot', 'Rishikesh', 'Haridwar', 'Uttarakhand', 'Nainital', 'Mussoorie', 'Jim Corbett',
    // South India
    'Kerala', 'Munnar', 'Alleppey', 'Thekkady', 'Kochi', 'Wayanad', 'Kovalam', 'Ooty', 'Kodaikanal', 'Coorg',
    'Mysore', 'Bangalore', 'Hampi', 'Rameshwaram', 'Kanyakumari',
    // East & North East
    'Sikkim', 'Gangtok', 'Darjeeling', 'Meghalaya', 'Shillong', 'Cherrapunji', 'Kaziranga', 'Assam', 'Arunachal', 'Tawang',
    'Andaman', 'Port Blair', 'Havelock',
    // International
    'Almaty', 'Kazakhstan', 'Astana', 'Tashkent', 'Samarkand', 'Uzbekistan', 'Baku', 'Azerbaijan', 'Georgia', 'Tbilisi',
    'Dubai', 'Abu Dhabi', 'Sharjah', 'UAE', 'Bali', 'Indonesia', 'Thailand', 'Phuket', 'Bangkok', 'Krabi', 'Pattaya',
    'Vietnam', 'Hanoi', 'Da Nang', 'Ho Chi Minh', 'Singapore', 'Malaysia', 'Kuala Lumpur', 'Maldives', 'Sri Lanka',
    'Mauritius', 'Seychelles', 'Switzerland', 'Paris', 'London', 'Europe', 'Turkey', 'Istanbul', 'Egypt', 'Nepal', 'Bhutan'
  ];

  let detectedDestination = 'Custom Tour';
  const destExplicitMatch = cleanRaw.match(/(?:Destination|Sector|Circuit|Location|Region)\s*[:\-\|]\s*([A-Za-z0-9\s,•\-\|]+)/i);
  if (destExplicitMatch) {
    const rawDest = destExplicitMatch[1].split(/\n/)[0].replace(/^[:\-\|\s]+|[:\-\|\s]+$/g, '').trim();
    if (rawDest && rawDest.length > 2 && rawDest.length < 80) {
      detectedDestination = rawDest;
    }
  }

  if (detectedDestination === 'Custom Tour') {
    for (const dest of globalDestinations) {
      if (new RegExp(`\\b${dest}\\b`, 'i').test(cleanRaw)) {
        detectedDestination = dest;
        break;
      }
    }
  }

  // 2. Detect duration (e.g. 5N/6D or 6 Days)
  let daysCount = 5;
  let nightsCount = 4;
  const durationMatch = cleanRaw.match(/(\d+)\s*(?:Nights?|N)\s*[\/&\-]\s*(\d+)\s*(?:Days?|D)/i) ||
                       cleanRaw.match(/(\d+)\s*(?:Days?|D)\s*[\/&\-]\s*(\d+)\s*(?:Nights?|N)/i);

  if (durationMatch) {
    nightsCount = parseInt(durationMatch[1], 10);
    daysCount = parseInt(durationMatch[2], 10);
    if (daysCount < nightsCount) {
      const temp = daysCount;
      daysCount = nightsCount;
      nightsCount = temp;
    }
  } else {
    const singleDayMatch = cleanRaw.match(/(\d+)\s*(?:Days?|D)/i);
    if (singleDayMatch) {
      daysCount = parseInt(singleDayMatch[1], 10);
      nightsCount = Math.max(1, daysCount - 1);
    }
  }

  // 3. Detect Title with Strong Negative Filter for Proposal Salutations & Greetings
  const salutationIntroPatterns = [
    /we\s*are\s*pleased/i,
    /kindly\s*review/i,
    /dear\s*(?:sir|madam|guest|customer|all|traveler)/i,
    /greetings\s*(?:from|to)/i,
    /commercial\s*proposal/i,
    /travel\s*quotation/i,
    /tour\s*proposal/i,
    /to\s*whom\s*it\s*may\s*concern/i,
    /spas\s*tours/i,
    /please\s*find\s*(?:given|attached|below)/i,
    /thank\s*you/i,
    /welcome\s*to\s*(?:our|shravya|shrawello)/i,
    /package\s*overview/i,
    /short\s*itinerary/i,
    /land\s*package/i,
    /as\s*discussed/i,
    /with\s*reference\s*to/i,
    /quotation\s*for/i,
    /hope\s*this\s*email/i,
    /details\s*mentioned\s*below/i,
    /confirm\s*the\s*details/i
  ];

  let detectedTitle = '';

  // First check explicit title patterns like "*KASHMIR DELIGHT 5N / 6D PACKAGE*" or "PACKAGE NAME: ..."
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const line = lines[i].trim();
    if (!line || line.length < 5) continue;

    const labelMatch = line.match(/(?:Tour\s*Title|Package\s*Name|Itinerary\s*Name|Tour\s*Name)\s*[:\-\|]\s*(.+)/i);
    if (labelMatch && labelMatch[1].trim().length > 4) {
      detectedTitle = labelMatch[1].trim().replace(/^[\*\#\-\s]+|[\*\#\-\s]+$/g, '');
      break;
    }

    const headingMatch = line.match(/^[\*\#\-\s]*(.+?\b(?:package|tour|holiday|trip|itinerary|delight|expedition|getaway|circuit|vacation)\b.*?)[\*\#\-\s]*$/i);
    if (headingMatch) {
      const candidate = headingMatch[1].trim();
      const isIntro = salutationIntroPatterns.some(p => p.test(candidate));
      if (!isIntro && candidate.length > 5 && candidate.length < 90) {
        detectedTitle = candidate;
        break;
      }
    }
  }

  // Second pass: general title heuristic
  if (!detectedTitle) {
    for (let i = 0; i < Math.min(lines.length, 25); i++) {
      const line = lines[i].trim();
      if (salutationIntroPatterns.some(p => p.test(line)) || line.startsWith('---') || line.toLowerCase().includes('page') || line.length < 6 || line.length > 85) {
        continue;
      }
      if (/discovery|holiday|tour|escape|expedition|canyon|mountains|package|delight|circuit|getaway/i.test(line)) {
        detectedTitle = line.replace(/^[•\-\*s]+/, '').replace(/[\*\#\-\s]+$/, '').trim();
        break;
      }
    }
  }

  if (!detectedTitle) {
    if (detectedDestination !== 'Custom Tour') {
      detectedTitle = `${nightsCount}N/${daysCount}D ${detectedDestination} Tour Package`;
    } else if (fileName) {
      detectedTitle = fileName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
    } else {
      detectedTitle = `${nightsCount}N/${daysCount}D Curated Holiday Package`;
    }
  }

  // 4. Start Date Extraction
  let detectedStartDate: string | undefined;
  const checkInMatch = cleanRaw.match(/(?:Check\s*In|Check-In|Start\s*Date|Arrival\s*Date|Travel\s*Date)\s*[:\-\s]+(\d{1,2}\s+[a-zA-Z]{3,9}\s+\d{4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i);
  if (checkInMatch) {
    try {
      const parsedDate = new Date(checkInMatch[1].trim());
      if (!isNaN(parsedDate.getTime())) {
        detectedStartDate = parsedDate.toISOString().split('T')[0];
      }
    } catch {}
  }

  // 5. Room Sharing, Rooms Count & Meal Plan
  let detectedRoomSharing: 'Single' | 'Double' | 'Triple' | 'Quad' = 'Double';
  if (/Double\s*Sharing|Twin\s*Sharing|\bDouble\b|\bTwin\b/i.test(cleanRaw)) detectedRoomSharing = 'Double';
  else if (/Triple\s*Sharing|\bTriple\b/i.test(cleanRaw)) detectedRoomSharing = 'Triple';
  else if (/Quad\s*Sharing|\bQuad\b/i.test(cleanRaw)) detectedRoomSharing = 'Quad';
  else if (/Single\s*Room|Single\s*Sharing|\bSingle\b/i.test(cleanRaw)) detectedRoomSharing = 'Single';

  let detectedRoomsCount = 1;
  const roomsExplicitMatch = cleanRaw.match(/(\d+)\s*(?:Super\s*Deluxe|Deluxe|Standard|Executive|Luxury|Comfort)?\s*Rooms?/i);
  if (roomsExplicitMatch) {
    const rCount = parseInt(roomsExplicitMatch[1], 10);
    if (!isNaN(rCount) && rCount > 0) detectedRoomsCount = rCount;
  }

  let detectedMealPlan = 'CP (Breakfast)';
  let detectedMealPlanCode: 'EP' | 'CP' | 'MAP' | 'AP' | 'AI' = 'CP';
  if (/MAPAI|\bMAP\b|Breakfast\s*[\+&]\s*Dinner|Breakfast\s+and\s+Dinner|Indian\s*Dinner|Dinner\s*Transfer/i.test(cleanRaw)) {
    detectedMealPlan = 'MAP (Breakfast & Dinner)';
    detectedMealPlanCode = 'MAP';
  } else if (/APAI|\bAP\b|All\s*Meals/i.test(cleanRaw)) {
    detectedMealPlan = 'AP (All Meals)';
    detectedMealPlanCode = 'AP';
  } else if (/EPAI|\bEP\b|Room\s*Only/i.test(cleanRaw)) {
    detectedMealPlan = 'EP (Room Only)';
    detectedMealPlanCode = 'EP';
  }

  // 6. Dynamic Hotel Extraction
  const hotelsList: Array<{ hotelName: string; starRating?: string; roomCategory?: string; occupancy?: string; costPerPerson?: number }> = [];
  let primaryHotelName = '';

  // A. Check dedicated hotel section
  const hotelSectionMatch = cleanRaw.match(/(?:HOTELS?|ACCOMMODATION|STAY DETAILS?|PROPOSED HOTELS?)[\s\S]*?(?=(?:TRANSPORT|VEHICLE|CAB|INCLUSIONS|EXCLUSIONS|NET|PRICE|TOTAL|TERMS|$))/i);
  if (hotelSectionMatch) {
    const rawLines = hotelSectionMatch[0].split('\n');
    const hotelLines: string[] = [];
    rawLines.forEach((l, idx) => {
      const trimmed = l.trim();
      if (!trimmed) return;
      if (idx === 0) {
        const afterColon = trimmed.replace(/^(?:HOTELS?|ACCOMMODATION|STAY DETAILS?|PROPOSED HOTELS?)\s*[:\-\|]?\s*/i, '').trim();
        if (afterColon.length > 3) hotelLines.push(afterColon);
      } else {
        hotelLines.push(trimmed);
      }
    });

    for (const hLine of hotelLines) {
      const cleanH = hLine.replace(/^[•\-\*d\.\)]+\s*/, '').trim();
      if (!cleanH || cleanH.length < 4 || /^(?:inclusions|exclusions|rate|cost|vehicle|transport|cab|meal|plan|breakfast|dinner)/i.test(cleanH)) continue;
      
      const parts = cleanH.split(/[:\-]/);
      let candidateName = parts.length > 1 ? parts[1].trim() : parts[0].trim();
      candidateName = candidateName.split(/[\(\/]/)[0].trim();

      if (candidateName && candidateName.length > 3 && !/check-in|check-out|transfer|vehicle|transport|driver|meal|breakfast|dinner|lunch|plan/i.test(candidateName)) {
        if (!primaryHotelName) primaryHotelName = candidateName;
        hotelsList.push({
          hotelName: candidateName,
          starRating: /5\s*Star/i.test(cleanH) ? '5 Star' : /3\s*Star/i.test(cleanH) ? '3 Star' : '4 Star',
          roomCategory: /suite/i.test(cleanH) ? 'Suite' : /super deluxe/i.test(cleanH) ? 'Super Deluxe' : 'Deluxe Room',
          occupancy: detectedRoomSharing
        });
      }
    }
  }

  // B. Fallback regex search for Hotel names in document
  if (!primaryHotelName) {
    const hotelRegex = /(?:Hotel|Resort|Palace|Suites?|Inn|Retreat|Houseboat|Lodge|Camp)\s+([A-Za-z0-9&'\-\s]{3,30})/gi;
    let hMatch;
    while ((hMatch = hotelRegex.exec(cleanRaw)) !== null) {
      const fullName = `${hMatch[0].trim()}`;
      if (!/hotel\s+(?:check|transfer|booking|reservation|stay|pickup|drop|return)/i.test(fullName)) {
        primaryHotelName = fullName;
        hotelsList.push({
          hotelName: primaryHotelName,
          starRating: '4 Star',
          roomCategory: 'Deluxe Room',
          occupancy: detectedRoomSharing
        });
        break;
      }
    }
  }

  if (!primaryHotelName) {
    primaryHotelName = `Selected Hotel in ${detectedDestination}`;
    hotelsList.push({
      hotelName: primaryHotelName,
      starRating: '4 Star',
      roomCategory: 'Deluxe Room',
      occupancy: detectedRoomSharing
    });
  }

  // 7. Dynamic Vehicle Extraction
  let detectedVehicle = 'Dedicated Private Chauffeur Vehicle';
  if (/Innova Crysta/i.test(cleanRaw)) detectedVehicle = 'Toyota Innova Crysta';
  else if (/Innova/i.test(cleanRaw)) detectedVehicle = 'Toyota Innova';
  else if (/Swift Dzire|Dzire|Etios/i.test(cleanRaw)) detectedVehicle = 'Private Sedan (Swift Dzire / Etios)';
  else if (/Sedan/i.test(cleanRaw)) detectedVehicle = 'Private Dedicated Sedan';
  else if (/Tempo Traveller/i.test(cleanRaw)) detectedVehicle = 'Private Dedicated Tempo Traveller';
  else if (/Ertiga|Scorpio|SUV/i.test(cleanRaw)) detectedVehicle = 'Private SUV (Ertiga / Scorpio)';

  // 8. Pricing & Pax Extraction
  let detectedAdults = 2;
  const adultsPrefixMatch = cleanRaw.match(/([0-9]{1,2})\s*(?:Adults?|Guests?|Pax)\b/i);
  const paxLabelMatch = cleanRaw.match(/(?:No\.?\s*of\s*pax|pax|guests?|adults?)\s*[:\-\|\s]+([0-9]{1,2})\s*(?:Adults?|Guests?|Pax)?\b/i);

  if (adultsPrefixMatch) {
    const p = parseInt(adultsPrefixMatch[1], 10);
    if (!isNaN(p) && p > 0) detectedAdults = p;
  } else if (paxLabelMatch) {
    const p = parseInt(paxLabelMatch[1], 10);
    if (!isNaN(p) && p > 0) detectedAdults = p;
  }

  // If rooms count wasn't explicitly stated, derive from adults & room sharing
  if (!roomsExplicitMatch && detectedAdults > 0) {
    detectedRoomsCount = Math.max(1, Math.ceil(detectedAdults / (detectedRoomSharing === 'Triple' ? 3 : detectedRoomSharing === 'Quad' ? 4 : detectedRoomSharing === 'Single' ? 1 : 2)));
  }

  let totalCost = 0;
  let costPerPerson = 0;
  let detectedCurrency = 'INR';

  // Specific check for total package value / cost in document
  const inrTotalMatch = cleanRaw.match(/(?:TOTAL\s*PACKAGE\s*(?:VALUE|COST|PRICE|RATE)|PACKAGE\s*(?:VALUE|COST|PRICE|RATE)|TOTAL\s*(?:NET\s*)?(?:COST|VALUE|PRICE|AMOUNT)|NET\s*PACKAGE\s*(?:COST|VALUE))[\s\S]{0,35}?(?:INR|Rs\.?|₹)\s*([\d,]+)/i);
  const inrPerPersonMatch = cleanRaw.match(/(?:(?:INR|Rs\.?|₹)\s*([\d,]+)[\s\S]{0,25}?(?:per\s*(?:person|pax|adult)|pp\b)|(?:per\s*(?:person|pax|adult)|cost\s*per\s*pax)[\s\S]{0,25}?(?:INR|Rs\.?|₹)\s*([\d,]+))/i);
  const inrGeneralMatch = cleanRaw.match(/(?:TOTAL\s*PACKAGE\s*COST|TOTAL\s*NET\s*COST|PACKAGE\s*COST|NET\s*COST|RATE|PRICE|TOTAL)[\s\S]{0,30}?(?:INR|Rs\.?|₹)\s*([\d,]{4,})/i) ||
                          cleanRaw.match(/(?:INR|Rs\.?|₹)\s*([\d,]{4,})/i);

  const usdTotalMatch = cleanRaw.match(/(?:TOTAL\s*PACKAGE\s*(?:VALUE|COST|PRICE|RATE)|PACKAGE\s*(?:VALUE|COST|PRICE|RATE)|TOTAL\s*(?:NET\s*)?(?:COST|VALUE|PRICE|AMOUNT))[\s\S]{0,35}?(?:\$|USD)\s*([\d,]+(?:\.\d+)?)/i);
  const usdPerPersonMatch = cleanRaw.match(/(?:\$|USD)\s*([\d,]+(?:\.\d+)?)\s*(?:per\s*(?:person|pax|adult)|pp\b)/i) ||
                            cleanRaw.match(/(?:per\s*(?:person|pax|adult)|cost\s*per\s*pax)[\s\S]{0,25}?(?:\$|USD)\s*([\d,]+(?:\.\d+)?)/i);
  const usdGeneralMatch = cleanRaw.match(/(?:\$|USD)\s*([\d,]+(?:\.\d+)?)/i) || cleanRaw.match(/([\d,]+(?:\.\d+)?)\s*(?:USD|\$)/i);

  if (usdTotalMatch || usdPerPersonMatch || (cleanRaw.includes('$') || /USD\b/i.test(cleanRaw))) {
    detectedCurrency = 'USD';
    if (usdTotalMatch) {
      totalCost = parseFloat(usdTotalMatch[1].replace(/,/g, ''));
    } else if (usdPerPersonMatch) {
      costPerPerson = parseFloat((usdPerPersonMatch[1] || usdPerPersonMatch[2]).replace(/,/g, ''));
    } else if (usdGeneralMatch) {
      const amt = parseFloat(usdGeneralMatch[1].replace(/,/g, ''));
      if (amt > 10) totalCost = amt;
    }
  } else if (inrTotalMatch || inrPerPersonMatch || inrGeneralMatch) {
    detectedCurrency = 'INR';
    if (inrTotalMatch) {
      totalCost = parseInt(inrTotalMatch[1].replace(/,/g, ''), 10);
    } else if (inrPerPersonMatch) {
      costPerPerson = parseInt((inrPerPersonMatch[1] || inrPerPersonMatch[2]).replace(/,/g, ''), 10);
    } else if (inrGeneralMatch) {
      const amt = parseInt(inrGeneralMatch[1].replace(/,/g, ''), 10);
      if (amt > 1000) totalCost = amt;
    }
  }

  // Cross-calibrate totalCost and costPerPerson so both are accurately known
  if (totalCost > 0 && !costPerPerson && detectedAdults > 0) {
    costPerPerson = Math.round(totalCost / detectedAdults);
  } else if (costPerPerson > 0 && !totalCost && detectedAdults > 0) {
    totalCost = Math.round(costPerPerson * detectedAdults);
  }

  // 9. Day-by-Day Dynamic Extraction (Accurate & Precision per Uploaded Package)
  const dayRegex = /(?:^|\n)(?:Day|DAY|D)\s*([0-9]{1,2})\b[:\s\-\|]*(.*)/g;
  const daysFound: Array<{ dayNum: number; rawHeader: string; startIndex: number }> = [];
  let match;

  while ((match = dayRegex.exec(cleanRaw)) !== null) {
    const dNum = parseInt(match[1], 10);
    if (!daysFound.some(d => d.dayNum === dNum)) {
      daysFound.push({
        dayNum: dNum,
        rawHeader: (match[2] || '').trim(),
        startIndex: match.index
      });
    }
  }

  // Sort by day number
  daysFound.sort((a, b) => a.dayNum - b.dayNum);
  const actualDaysCount = Math.max(daysCount, daysFound.length > 0 ? daysFound[daysFound.length - 1].dayNum : 5);
  nightsCount = Math.max(1, actualDaysCount - 1);

  const isDateOrWeekday = /^(?:\(?\s*(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*\)?|\d{1,2}(?:st|nd|rd|th)?[-/\.\s]+[a-zA-Z]{3,9}[-/\.\s]*\d{0,4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})$/i;

  const daysPlan: ParsedDayPlan[] = [];

  if (daysFound.length > 0) {
    daysFound.forEach((d, idx) => {
      const nextD = daysFound[idx + 1];
      const dayRawText = nextD
        ? cleanRaw.slice(d.startIndex, nextD.startIndex)
        : cleanRaw.slice(d.startIndex, d.startIndex + 3500);

      const rawDayLines = dayRawText.split('\n').map(l => l.trim()).filter(Boolean);
      
      // Determine Day Title directly from document header
      let dayTitle = '';
      let cleanHeader = d.rawHeader.replace(/^[•\-\*s]+/, '').replace(/[\*\#\-\s]+$/, '').trim();
      
      // Strip dates or weekdays in header
      cleanHeader = cleanHeader.replace(/\(?\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b\)?/gi, '').trim();
      cleanHeader = cleanHeader.replace(/\b\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,9}\s+\d{2,4}\b/gi, '').trim();
      cleanHeader = cleanHeader.replace(/^[:\-\|\s]+|[:\-\|\s]+$/g, '').trim();

      // Collect descriptive narrative lines for this day
      const validTextLines: string[] = [];

      // If header contains multiple sentences (e.g. "Day 1: Srinagar Airport Pick-up & Shikara Cruise. Overnight stay at Srinagar.")
      if (cleanHeader && cleanHeader.includes('. ')) {
        const headerParts = cleanHeader.split(/(?<=[.?!])\s+/);
        cleanHeader = headerParts[0].replace(/[.?!]+$/, '').trim();
        for (let i = 0; i < headerParts.length; i++) {
          if (headerParts[i].trim().length > 4) validTextLines.push(headerParts[i].trim());
        }
      } else if (cleanHeader && cleanHeader.length > 5) {
        validTextLines.push(cleanHeader);
      }

      if (cleanHeader && cleanHeader.length >= 4 && !isDateOrWeekday.test(cleanHeader)) {
        dayTitle = cleanHeader;
      }

      for (let i = 1; i < rawDayLines.length; i++) {
        const line = rawDayLines[i];
        const cleanForHeaderCheck = line.replace(/^[•\-\*#\s]+/, '');
        if (/^(?:EXCLUSIONS|INCLUSIONS|HOTELS?|STAY|ACCOMMODATION|IMPORTANT NOTES|CANCELLATION|SHORT ITINERARY|TERMS|COST|TOTAL|PRICE|TRANSPORT|VEHICLE|NET|RATE)/i.test(cleanForHeaderCheck)) {
          break;
        }
        const cleanLine = line.replace(/^[•\-\*d\.\)]+\s*/, '').trim();
        if (isDateOrWeekday.test(cleanLine) || isDateOrWeekday.test(line)) continue;
        if (/^(?:day itinerary remark|itinerary|remark|ticket included|sightseeing|leisure)$/i.test(cleanLine)) continue;
        if (cleanLine.length < 5) continue;
        validTextLines.push(cleanLine);
      }

      // If no title from header line, pick from first meaningful descriptive line
      if (!dayTitle && validTextLines.length > 0) {
        const firstLine = validTextLines[0];
        if (firstLine.length < 65 && !firstLine.includes('.')) {
          dayTitle = firstLine;
          validTextLines.shift();
        }
      }

      // Default semantic title if still empty
      if (!dayTitle) {
        if (d.dayNum === 1) {
          dayTitle = `Arrival in ${detectedDestination} & Hotel Check-in`;
        } else if (d.dayNum === actualDaysCount) {
          dayTitle = `Hotel Check-Out & Departure from ${detectedDestination}`;
        } else {
          dayTitle = `Day ${d.dayNum}: ${detectedDestination} Sightseeing & Excursion`;
        }
      }

      // Build Day Items dynamically based on actual text
      const items: ParsedItineraryItem[] = [];
      const combinedNarrative = validTextLines.join(' ');

      // Split into distinct points if bullet points exist, or split into sentences
      let sentencePoints: string[] = [];
      if (validTextLines.length > 1) {
        sentencePoints = validTextLines;
      } else if (combinedNarrative.length > 0) {
        sentencePoints = combinedNarrative.split(/(?<=[.?!])\s+/).filter(s => s.trim().length > 10);
      }

      if (sentencePoints.length > 0) {
        sentencePoints.slice(0, 5).forEach((point, pIdx) => {
          const low = point.toLowerCase();
          let itemType: 'hotel' | 'activity' | 'transport' | 'flight' | 'guide' | 'note' | 'visa' = 'activity';
          let time = pIdx === 0 ? '10:00 AM' : pIdx === 1 ? '01:30 PM' : pIdx === 2 ? '05:00 PM' : '07:30 PM';
          let duration = '2 Hours';

          if (/transfer|pickup|pick-up|drop|drive|travel to|proceed to|depart|arrival|board/i.test(low)) {
            itemType = 'transport';
            duration = '2-3 Hours';
          } else if (/check-in|check in|checkin|overnight stay|hotel stay|stay at|sleep at/i.test(low)) {
            itemType = 'hotel';
            time = d.dayNum === 1 ? '02:00 PM' : '08:00 PM';
            duration = 'Overnight';
          } else if (/check-out|check out|checkout|departure transfer/i.test(low)) {
            itemType = d.dayNum === actualDaysCount ? 'transport' : 'note';
            time = '10:00 AM';
            duration = '1 Hour';
          } else if (/flight|fly to|airport drop/i.test(low)) {
            itemType = 'transport';
          } else if (/dinner|lunch|breakfast|meal/i.test(low)) {
            itemType = 'activity';
            time = /dinner/i.test(low) ? '08:00 PM' : /lunch/i.test(low) ? '01:00 PM' : '08:30 AM';
            duration = '1.5 Hours';
          }

          // Clean item title
          let itemTitle = point.split(/[:\-\.]/)[0].trim();
          if (itemTitle.length > 65) {
            itemTitle = itemTitle.slice(0, 60).replace(/\s+\S*$/, '') + '...';
          }
          if (itemTitle.length < 5) itemTitle = `${dayTitle} - Segment ${pIdx + 1}`;

          items.push({
            type: itemType,
            title: itemTitle,
            description: point,
            time,
            duration,
            cost: 0,
            ...(itemType === 'hotel' ? {
              hotelDetails: {
                hotelName: primaryHotelName,
                roomType: 'Deluxe Room',
                mealPlan: detectedMealPlanCode,
                starRating: '4 Star'
              }
            } : {}),
            ...(itemType === 'transport' ? {
              transportDetails: {
                vehicleType: detectedVehicle,
                serviceMode: 'Private'
              }
            } : {})
          });
        });
      }

      // If Day 1 had no explicit items, ensure standard structured arrival
      if (items.length === 0) {
        if (d.dayNum === 1) {
          items.push({
            type: 'transport',
            title: `Arrival Transfer to ${detectedDestination}`,
            description: `Meet chauffeur and transfer to hotel in ${detectedDestination}.`,
            time: '11:00 AM',
            duration: '2 Hours',
            cost: 0,
            transportDetails: { vehicleType: detectedVehicle, serviceMode: 'Private' }
          });
          items.push({
            type: 'hotel',
            title: `Check-in & Overnight Stay at ${primaryHotelName}`,
            description: `Check-in to accommodation on ${detectedRoomSharing} sharing basis. ${detectedMealPlan} plan included.`,
            time: '02:00 PM',
            duration: 'Overnight',
            cost: 0,
            hotelDetails: {
              hotelName: primaryHotelName,
              roomType: 'Deluxe Room',
              mealPlan: detectedMealPlanCode,
              starRating: '4 Star'
            }
          });
          items.push({
            type: 'activity',
            title: `Evening Leisure in ${detectedDestination}`,
            description: `Relax and explore nearby surroundings at your leisure.`,
            time: '06:30 PM',
            duration: '2 Hours',
            cost: 0
          });
        } else if (d.dayNum === actualDaysCount) {
          items.push({
            type: 'note',
            title: 'Hotel Check-out Formalities',
            description: 'Check out from hotel after breakfast and settle any personal incidentals.',
            time: '10:00 AM',
            duration: '30 Mins',
            cost: 0
          });
          items.push({
            type: 'transport',
            title: `Departure Transfer from ${detectedDestination}`,
            description: `Private chauffeur transfer for your onward journey or flight back home.`,
            time: '11:00 AM',
            duration: '2 Hours',
            cost: 0,
            transportDetails: { vehicleType: detectedVehicle, serviceMode: 'Private' }
          });
        } else {
          items.push({
            type: 'activity',
            title: dayTitle,
            description: combinedNarrative || `Curated sightseeing and excursions in ${detectedDestination}.`,
            time: '10:00 AM',
            duration: '4 Hours',
            cost: 0
          });
        }
      }

      daysPlan.push({
        day: d.dayNum,
        title: dayTitle,
        notes: `Curated itinerary schedule for ${dayTitle}.`,
        items
      });
    });
  }

  // 10. Dynamic Inclusions & Exclusions from Document
  const included: string[] = [];
  const notIncluded: string[] = [];

  const incMatch = cleanRaw.match(/(?:Inclusions?|Package Includes?|Cost Includes?|Price Includes?|Above Price Includes?)[\s\S]*?(?=(?:Exclusions?|Package Excludes?|Cost Excludes?|Terms|Cancellation|Note|Payment|PRICE|TOTAL|$))/i);
  if (incMatch) {
    incMatch[0].split('\n').slice(1).forEach(l => {
      const clean = l.replace(/^[•\-\*d\.\)]+\s*/, '').trim();
      if (clean.length > 5 && clean.length < 140 && included.length < 12 && !/^(?:exclusions|package excludes|terms)/i.test(clean)) {
        included.push(clean);
      }
    });
  }

  const excMatch = cleanRaw.match(/(?:Exclusions?|Package Excludes?|Cost Excludes?|Price Excludes?)[\s\S]*?(?=(?:Terms|Cancellation|Note|Payment|Important Notes|TOTAL|PACKAGE COST|RATE|PRICE|$))/i);
  if (excMatch) {
    excMatch[0].split('\n').slice(1).forEach(l => {
      const clean = l.replace(/^[•\-\*d\.\)]+\s*/, '').trim();
      if (clean.length > 5 && clean.length < 140 && notIncluded.length < 12 && !/^(?:terms|cancellation|note|payment)/i.test(clean)) {
        notIncluded.push(clean);
      }
    });
  }

  // Default clean inclusions if document had none
  if (included.length === 0) {
    included.push(
      `0${nightsCount} Nights accommodation at ${primaryHotelName} (or similar)`,
      `Daily meal plan: ${detectedMealPlan}`,
      `All transfers & sightseeing by ${detectedVehicle}`,
      'All toll taxes, parking fees, fuel charges, and driver allowances'
    );
  }

  if (notIncluded.length === 0) {
    notIncluded.push(
      'Airfare or train tickets',
      'Personal expenses such as laundry, telephone calls, tips & portage',
      'Monument entrance passes, camera fees, or optional adventure activities',
      'Any meals or services not explicitly mentioned in inclusions'
    );
  }

  const termsAndConditions = `Standard supplier terms and conditions apply. Rates are subject to availability at the time of booking.`;

  return {
    title: detectedTitle,
    destination: detectedDestination,
    days: Math.max(daysCount, daysPlan.length),
    nights: nightsCount,
    startDate: detectedStartDate,
    roomSharing: detectedRoomSharing,
    roomsCount: detectedRoomsCount,
    mealPlanCode: detectedMealPlanCode,
    hotelsList,
    destinationsList: [{ name: detectedDestination, nights: nightsCount }],
    included,
    notIncluded,
    termsAndConditions,
    pricing: (totalCost > 0 || costPerPerson > 0) ? {
      totalPackageCost: totalCost,
      costPerPerson: costPerPerson,
      currency: detectedCurrency,
      pricingBasis: costPerPerson > 0 ? `Per Person on ${detectedRoomSharing} Sharing (${detectedCurrency})` : `Total Package Cost (${detectedCurrency})`
    } : undefined,
    paxDetails: {
      adults: detectedAdults,
      children: 0
    },
    daysPlan,
    source: 'heuristic',
    modelUsed: 'Deterministic Heuristic Fallback Engine',
    rawTextPreview: cleanRaw.slice(0, 1000)
  };
}

// ─── Main Public Ingestion Function ───────────────────────────────────────────

export async function parseDmcItinerary(
  input: File | string,
  onProgress?: (status: string) => void,
  forcedModel?: string
): Promise<ParsedDmcPackage> {
  let rawText = '';
  let fileName = typeof input === 'string' ? 'Supplier WhatsApp Quotation' : input.name;
  let pdfBase64: string | undefined;
  let pdfImages: string[] | undefined;

  if (typeof input === 'string') {
    onProgress?.('Reading supplier quote text...');
    rawText = input.trim();
  } else {
    onProgress?.('Extracting text and structure from PDF document...');
    try {
      const extractedData = await extractTextFromPdf(input);
      rawText = extractedData.text || '';
      console.log(`[DMC PDF Parser] Extracted ${extractedData.pageCount} pages, total chars: ${rawText.length}`);
    } catch (extractErr) {
      console.warn('[DMC PDF Parser] Text extraction error:', extractErr);
    }

    // If PDF is scanned or graphical brochure (< 50 characters extracted), render canvas images for OCR Vision AI
    if (!rawText || rawText.trim().length < 50) {
      onProgress?.('Scanned/graphical brochure detected. Rendering visual pages for Vision AI...');
      try {
        pdfImages = await renderPdfPagesToImages(input, 4);
        console.log(`[DMC PDF Parser] Rendered ${pdfImages.length} visual page images for OCR.`);
      } catch (renderErr) {
        console.warn('[DMC PDF Parser] Could not render page images:', renderErr);
      }
    }

    if (input.size < 4 * 1024 * 1024) {
      try {
        pdfBase64 = await fileToBase64(input);
      } catch {}
    }
  }

  if ((!rawText || rawText.trim().length < 20) && (!pdfImages || pdfImages.length === 0)) {
    throw new Error('Could not extract text or images from this document. Please verify the file.');
  }

  onProgress?.('Analyzing itinerary with Frontier AI...');

  // 2. Try AI parsing with multi-model fallback queue
  try {
    const prompt = buildPdfPrompt(rawText || 'Please read the attached DMC supplier PDF page images.');
    const { text: aiResponseText, modelUsed } = await callAiWithPrompt(prompt, {
      pdfBase64,
      pdfImages,
      forcedModel
    });

    onProgress?.('Structuring days, hotels, activities & pricing...');
    const parsedJson = robustParseJson(aiResponseText);

    if (parsedJson && parsedJson.daysPlan && Array.isArray(parsedJson.daysPlan) && parsedJson.daysPlan.length > 0) {
      return {
        title: parsedJson.title || fileName.replace(/\.pdf$/i, ''),
        destination: parsedJson.destination || 'Custom Tour',
        days: Number(parsedJson.days) || parsedJson.daysPlan.length,
        nights: Number(parsedJson.nights) || Math.max(1, (Number(parsedJson.days) || parsedJson.daysPlan.length) - 1),
        roomSharing: parsedJson.roomSharing || 'Double',
        mealPlanCode: parsedJson.mealPlanCode || 'MAP',
        roomsCount: parsedJson.roomsCount || (parsedJson.paxDetails?.adults ? Math.max(1, Math.ceil(parsedJson.paxDetails.adults / (parsedJson.roomSharing === 'Triple' ? 3 : parsedJson.roomSharing === 'Quad' ? 4 : parsedJson.roomSharing === 'Single' ? 1 : 2))) : 1),
        destinationsList: Array.isArray(parsedJson.destinationsList) ? parsedJson.destinationsList : undefined,
        included: Array.isArray(parsedJson.included) ? parsedJson.included : [],
        notIncluded: Array.isArray(parsedJson.notIncluded) ? parsedJson.notIncluded : [],
        termsAndConditions: parsedJson.termsAndConditions || '',
        faqs: Array.isArray(parsedJson.faqs) ? parsedJson.faqs : undefined,
        daysPlan: parsedJson.daysPlan,
        pricing: parsedJson.pricing,
        paxDetails: parsedJson.paxDetails,
        source: 'ai',
        modelUsed,
        rawTextPreview: (rawText || '').slice(0, 1500)
      };
    }

    console.warn('[DMC PDF Parser] AI returned non-standard JSON schema, trying fallback parser...');
  } catch (aiErr: any) {
    console.warn('[DMC PDF Parser] AI parsing error:', aiErr?.message || aiErr);
  }

  // 3. Fallback to deterministic heuristic parser if AI fails or returned invalid structure
  onProgress?.('Applying smart deterministic heuristic extractor...');
  return parseDmcItineraryFallback(rawText, fileName);
}
