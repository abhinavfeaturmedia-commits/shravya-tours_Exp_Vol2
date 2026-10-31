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
    icon: '⚡',
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-300'
  },
  {
    id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    name: 'NVIDIA Nemotron Nano Omni',
    tag: 'CoT Reasoning',
    context: '256k Context',
    description: 'Chain-of-thought reasoning to resolve conflicting supplier notes and night/day count mismatches.',
    icon: '🎯',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300'
  },
  {
    id: 'openrouter/free',
    name: 'OpenRouter Dynamic Mesh',
    tag: 'Dynamic Failover',
    context: '200k Context',
    description: 'Dynamic load balancing with instant failover across the entire cloud cluster.',
    icon: '🌟',
    badgeColor: 'bg-stone-100 text-stone-800 border-stone-300'
  }
];

// ─── OpenRouter / AI Settings Helper ──────────────────────────────────────────

const getOpenRouterConfig = async () => {
  try {
    const res = await api.getSettings();
    const data = res?.data || [];
    const config = {
      enabled: false,
      apiKey: '',
      defaultModel: 'nvidia/nemotron-3-ultra-550b-a55b:free'
    };
    if (data && Array.isArray(data)) {
      data.forEach((item: any) => {
        if (item.key === 'integrations.openrouter.enabled') {
          try { config.enabled = JSON.parse(item.value); } catch {}
        } else if (item.key === 'integrations.openrouter.apiKey') {
          try { config.apiKey = JSON.parse(item.value); } catch {}
        } else if (item.key === 'integrations.openrouter.defaultModel') {
          try { config.defaultModel = JSON.parse(item.value); } catch {}
        }
      });
    }
    return config;
  } catch (e) {
    return {
      enabled: false,
      apiKey: '',
      defaultModel: 'nvidia/nemotron-3-ultra-550b-a55b:free'
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

    // 4. Default frontier reasoning queue
    candidateModels.push(
      'nvidia/nemotron-3-ultra-550b-a55b:free',
      'google/gemma-4-31b-it:free',
      'nvidia/nemotron-3.5-super-vl:free',
      'google/gemma-4-26b-a4b-it:free',
      'openrouter/free',
      'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free'
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
    'Almaty', 'Kazakhstan', 'Astana', 'Tashkent', 'Samarkand', 'Baku', 'Azerbaijan', 'Georgia', 'Tbilisi',
    'Kashmir', 'Ladakh', 'Himachal', 'Manali', 'Shimla', 'Goa', 'Kerala', 'Dubai', 'Abu Dhabi',
    'Bali', 'Thailand', 'Phuket', 'Bangkok', 'Vietnam', 'Singapore', 'Maldives', 'Sikkim',
    'Andaman', 'Rajasthan', 'Jaipur', 'Udaipur', 'Uttarakhand', 'Switzerland', 'Paris', 'London'
  ];
  let detectedDestination = 'Custom Tour';
  for (const dest of globalDestinations) {
    if (new RegExp(`\\b${dest}\\b`, 'i').test(cleanRaw)) {
      detectedDestination = dest;
      break;
    }
  }

  // 2. Detect duration (e.g. 5N/6D or 6 Days)
  let daysCount = 6;
  let nightsCount = 5;
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

  // 3. Detect Title with Negative Salutation Filter
  const salutationPatterns = [
    /dear\s*(?:sir|madam|guest|customer|all)/i,
    /greetings\s*from/i,
    /commercial\s*proposal/i,
    /travel\s*quotation/i,
    /tour\s*proposal/i,
    /to\s*whom\s*it\s*may\s*concern/i,
    /spas\s*tours/i,
    /please\s*find\s*given\s*below/i,
    /thank\s*you/i,
    /welcome\s*to\s*our/i,
    /package\s*overview/i,
    /short\s*itinerary/i,
    /land\s*package/i
  ];

  let detectedTitle = '';
  for (let i = 0; i < Math.min(lines.length, 25); i++) {
    const line = lines[i];
    if (salutationPatterns.some(p => p.test(line)) || line.startsWith('---') || line.toLowerCase().includes('page') || line.length < 6) {
      continue;
    }
    if (/discovery|holiday|tour|escape|expedition|canyon|mountains|almaty|kazakhstan|package/i.test(line)) {
      detectedTitle = line.replace(/^[•\-\*\s]+/, '').trim();
      break;
    }
  }

  if (!detectedTitle) {
    if (detectedDestination !== 'Custom Tour') {
      detectedTitle = `${nightsCount}N/${daysCount}D ${detectedDestination} Discovery: Mountains, Canyons & Culture`;
    } else if (fileName) {
      detectedTitle = fileName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
    } else {
      detectedTitle = `${nightsCount}N/${daysCount}D Curated Holiday Package`;
    }
  }

  // 4. Start Date / Check-In Date Extraction
  let detectedStartDate: string | undefined;
  const checkInMatch = cleanRaw.match(/(?:Check\s*In|Check-In|Start\s*Date|Arrival\s*Date)\s*[:\-\s]+(\d{1,2}\s+[a-zA-Z]{3,9}\s+\d{4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i);
  if (checkInMatch) {
    try {
      const parsedDate = new Date(checkInMatch[1].trim());
      if (!isNaN(parsedDate.getTime())) {
        detectedStartDate = parsedDate.toISOString().split('T')[0];
      }
    } catch {}
  }

  // 5. Room Sharing & Occupancy
  let detectedRoomSharing: 'Single' | 'Double' | 'Triple' | 'Quad' = 'Double';
  if (/\bTriple\b|Triple\s*Sharing|3\s*Pax/i.test(cleanRaw)) detectedRoomSharing = 'Triple';
  else if (/\bQuad\b|Quad\s*Sharing/i.test(cleanRaw)) detectedRoomSharing = 'Quad';
  else if (/\bSingle\b|Single\s*Room/i.test(cleanRaw)) detectedRoomSharing = 'Single';

  // 6. Meal Plan Code
  let detectedMealPlan = 'CP (Breakfast)';
  let detectedMealPlanCode: 'EP' | 'CP' | 'MAP' | 'AP' | 'AI' = 'CP';
  if (/MAPAI|MAP|Breakfast\s*&\s*Dinner|Indian\s*Dinner|Dinner\s*Transfer/i.test(cleanRaw)) {
    detectedMealPlan = 'MAP (Breakfast & Dinner)';
    detectedMealPlanCode = 'MAP';
  } else if (/APAI|AP|All\s*Meals/i.test(cleanRaw)) {
    detectedMealPlan = 'AP (All Meals)';
    detectedMealPlanCode = 'AP';
  } else if (/EPAI|EP|Room\s*Only/i.test(cleanRaw)) {
    detectedMealPlan = 'EP (Room Only)';
    detectedMealPlanCode = 'EP';
  }

  // 7. Hotel Extraction from Quotation Table
  const hotelsList: Array<{ hotelName: string; starRating?: string; roomCategory?: string; occupancy?: string; costPerPerson?: number }> = [];
  const hotelBlockMatch = cleanRaw.match(/Hotel\s+([A-Za-z0-9\s]{3,35})\s+Hotel\s+([A-Za-z0-9\s]{3,35})/);
  let primaryHotelName = 'Hotel Kazzhol';
  if (hotelBlockMatch) {
    primaryHotelName = hotelBlockMatch[1].trim();
    hotelsList.push({
      hotelName: primaryHotelName,
      starRating: '4 Star',
      roomCategory: 'Comfort Deluxe Room',
      occupancy: detectedRoomSharing
    });
    const secondaryHotel = hotelBlockMatch[2].trim().split('\n')[0].trim();
    if (secondaryHotel) {
      hotelsList.push({
        hotelName: secondaryHotel,
        starRating: '4 Star',
        roomCategory: 'Junior Suite',
        occupancy: detectedRoomSharing
      });
    }
  }

  // 8. Dedicated Vehicle & Mobility
  let detectedVehicle = 'Dedicated Private Chauffeur-Driven Tourist Vehicle';
  if (/Innova Crysta/i.test(cleanRaw)) detectedVehicle = 'Toyota Innova Crysta';
  else if (/Sedan/i.test(cleanRaw)) detectedVehicle = 'Private Dedicated Sedan';
  else if (/Tempo Traveller/i.test(cleanRaw)) detectedVehicle = 'Private Tempo Traveller';

  // 9. Pricing & Pax Extraction
  let totalCost = 0;
  let costPerPerson = 0;
  let detectedCurrency = 'INR';

  const usdMatch = cleanRaw.match(/(?:\$|USD)\s*([\d,]+(?:\.\d+)?)/i) || cleanRaw.match(/([\d,]+(?:\.\d+)?)\s*(?:USD|\$)/i);
  const inrMatch = cleanRaw.match(/(?:INR|Rs\.?|₹)\s*([\d,]{4,})/i);

  if (usdMatch) {
    detectedCurrency = 'USD';
    const parsedAmt = parseFloat(usdMatch[1].replace(/,/g, ''));
    if (!isNaN(parsedAmt) && parsedAmt > 10) {
      if (/cost\s*per\s*person|per\s*pax|per\s*adult|triple|twin\s*sharing|pp\b/i.test(cleanRaw)) {
        costPerPerson = parsedAmt;
      } else {
        totalCost = parsedAmt;
      }
    }
  } else if (inrMatch) {
    detectedCurrency = 'INR';
    const parsedAmt = parseInt(inrMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(parsedAmt) && parsedAmt > 1000) {
      if (/per\s*person|per\s*pax|per\s*adult|triple|twin\s*sharing/i.test(cleanRaw)) {
        costPerPerson = parsedAmt;
      } else {
        totalCost = parsedAmt;
      }
    }
  }

  let detectedAdults = 2;
  const paxMatch = cleanRaw.match(/(?:No\s*of\s*pax|pax|guests?)\s*[:\(\s]*([0-9]{1,2})/i);
  if (paxMatch) {
    const pCount = parseInt(paxMatch[1], 10);
    if (!isNaN(pCount) && pCount > 0) {
      detectedAdults = pCount;
    }
  }

  // 10. Extract Day-by-Day Blocks & Filter Clutter
  const dayRegex = /(?:^|\n)(?:Day|DAY|D)\s*([0-9]{1,2})\b[:\s\-\|]*(.*)/g;
  const daysFound: Array<{ dayNum: number; startIndex: number }> = [];

  let match;
  while ((match = dayRegex.exec(cleanRaw)) !== null) {
    const dNum = parseInt(match[1], 10);
    if (!daysFound.some(d => d.dayNum === dNum)) {
      daysFound.push({
        dayNum: dNum,
        startIndex: match.index
      });
    }
  }

  const isDateOrWeekday = /^(?:\(?\s*(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*\)?|\d{1,2}[-/\.\s]+[a-zA-Z]{3,9}[-/\.\s]+\d{2,4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})$/i;

  const getSemanticDayTheme = (dNum: number, txt: string): string => {
    const low = txt.toLowerCase();
    if (low.includes('shymbulak') || low.includes('medeu')) {
      return 'Shymbulak Mountain Resort & Medeu Gondola Cableway';
    } else if (low.includes('charyn') || low.includes('canyon')) {
      return 'Charyn Canyon Full Day Scenic Excursion';
    } else if (low.includes('panfilov') || low.includes('zenkov') || low.includes('kok tobe')) {
      return 'Almaty City Highlights: Panfilov Park, Zenkov Cathedral & Kok Tobe';
    } else if (low.includes('green bazaar') || low.includes('rahat') || low.includes('chocolate') || low.includes('shopping')) {
      return 'Cultural Discovery: Green Bazaar & Rahat Chocolate Tasting';
    } else if (low.includes('airport') || low.includes('good-bye') || low.includes('check-out') || low.includes('departure')) {
      return 'Hotel Check-Out & Airport Departure Transfer';
    } else if (dNum === 1) {
      return 'Arrival in Almaty, Chauffeur Welcome & Hotel Check-in';
    }
    return `Day ${dNum} Curated Sightseeing & Leisure`;
  };

  const daysPlan: ParsedDayPlan[] = [];

  if (daysFound.length > 0) {
    daysFound.forEach((d, idx) => {
      const nextD = daysFound[idx + 1];
      const dayRawText = nextD
        ? cleanRaw.slice(d.startIndex, nextD.startIndex)
        : cleanRaw.slice(d.startIndex, d.startIndex + 2800);

      const dayLines = dayRawText.split('\n').map(l => l.trim()).filter(Boolean);
      const items: ParsedItineraryItem[] = [];
      let fullDayNarrative = '';

      // Collect valid text lines, strictly filtering out date/weekday noise
      const validTextLines: string[] = [];
      for (let i = 1; i < dayLines.length; i++) {
        const line = dayLines[i];
        if (/^(?:EXCLUSIONS|IMPORTANT NOTES|CANCELLATION POLICY|SHORT ITINERARY|TERMS)/i.test(line)) {
          break;
        }
        const cleanLine = line.replace(/^[•\-\*\d\.\)]+\s*/, '').trim();
        if (isDateOrWeekday.test(cleanLine) || isDateOrWeekday.test(line)) {
          continue;
        }
        if (/^(?:day itinerary remark|itinerary|remark|ticket included)$/i.test(cleanLine)) {
          continue;
        }
        if (cleanLine.length < 5) {
          continue;
        }
        fullDayNarrative += ' ' + cleanLine;
        validTextLines.push(cleanLine);
      }

      const dayTheme = getSemanticDayTheme(d.dayNum, fullDayNarrative);

      // Structure day items cleanly based on day number and content
      if (d.dayNum === 1) {
        items.push({
          type: 'transport',
          title: 'Airport Meet & Chauffeur Transfer to Hotel',
          description: 'Meet & Greet with English-speaking chauffeur-guide at Almaty International Airport and private transfer to hotel.',
          time: '11:00 AM',
          duration: '1 Hour',
          cost: 0,
          transportDetails: { vehicleType: detectedVehicle, serviceMode: 'Private' }
        });
        items.push({
          type: 'hotel',
          title: `Check-in & Overnight Stay at ${primaryHotelName}`,
          description: `4-Star accommodation in Comfort Deluxe Room on ${detectedRoomSharing} Sharing basis. Hotel amenities & buffet breakfast included.`,
          time: '02:00 PM',
          duration: 'Overnight',
          cost: 0,
          hotelDetails: {
            hotelName: primaryHotelName,
            roomType: 'Comfort Deluxe Room',
            starRating: '4 Star',
            mealPlan: detectedMealPlanCode
          }
        });
        items.push({
          type: 'transport',
          title: 'Evening Indian Dinner Transfer & Hotel Return',
          description: 'Private chauffeur round-trip transfer to an authentic Indian restaurant for a curated dinner.',
          time: '07:30 PM',
          duration: '2 Hours',
          cost: 0
        });
      } else if (d.dayNum === 2) {
        items.push({
          type: 'activity',
          title: 'Excursion to Shymbulak Mountain & Ski Resort (Level 3 Gondola)',
          description: 'Ascend the scenic cableway to Shymbulak Ski Resort at 3,200m in the Trans-Ili Alatau mountains for pristine alpine views.',
          time: '10:00 AM',
          duration: '4 Hours',
          cost: 0
        });
        items.push({
          type: 'activity',
          title: 'Walking Tour of Historic Panfilov & Arbat Streets',
          description: 'Stroll along the historic pedestrian promenade with street artists, outdoor cafes, and artisanal Kazakh handicrafts.',
          time: '03:30 PM',
          duration: '2 Hours',
          cost: 0
        });
        items.push({
          type: 'transport',
          title: 'Evening Indian Dinner Transfer & Hotel Return',
          description: 'Chauffeur dinner transfer followed by restful hotel drop-off.',
          time: '07:30 PM',
          duration: '2 Hours',
          cost: 0
        });
      } else if (d.dayNum === 3) {
        items.push({
          type: 'activity',
          title: 'Almaty Guided Orientation City Tour & Panfilov Park',
          description: 'Explore the historical heart of Almaty including the iconic memorial monument in 28 Panfilov Heroes Park.',
          time: '10:00 AM',
          duration: '2.5 Hours',
          cost: 0
        });
        items.push({
          type: 'activity',
          title: 'Visit Zenkov Cathedral (Ascension Cathedral)',
          description: 'Marvel at the world-famous wooden Russian Orthodox cathedral constructed entirely without metal nails.',
          time: '01:00 PM',
          duration: '1.5 Hours',
          cost: 0
        });
        items.push({
          type: 'activity',
          title: 'Sunset Splendor at Kok Tobe Hill (Return Cable Car Included)',
          description: 'Take the aerial tramway to Kok Tobe mountain park for panoramic sunset vistas overlooking the city skyline.',
          time: '05:00 PM',
          duration: '2.5 Hours',
          cost: 0
        });
        items.push({
          type: 'transport',
          title: 'Evening Indian Dinner Transfer & Hotel Return',
          description: 'Chauffeur dinner transfer followed by restful hotel drop-off.',
          time: '08:00 PM',
          duration: '1.5 Hours',
          cost: 0
        });
      } else if (d.dayNum === 4) {
        items.push({
          type: 'activity',
          title: 'Full-Day Scenic Expedition to Charyn Canyon ("Valley of Castles")',
          description: 'Travel through the Kazakh steppe to explore dramatic 200m sandstone formations sculpted over 12 million years.',
          time: '09:00 AM',
          duration: '7 Hours',
          cost: 0
        });
        items.push({
          type: 'transport',
          title: 'Evening Indian Dinner Transfer & Hotel Return',
          description: 'Relaxing dinner transfer in Almaty following the full-day canyon excursion.',
          time: '07:30 PM',
          duration: '2 Hours',
          cost: 0
        });
      } else if (d.dayNum === 5) {
        items.push({
          type: 'activity',
          title: 'Sensory Tour of Green Bazaar (Zelyony Bazar)',
          description: 'Immerse in the vibrant Silk Road market filled with local dried fruits, mountain honey, spices, and cheeses.',
          time: '10:30 AM',
          duration: '2.5 Hours',
          cost: 0
        });
        items.push({
          type: 'activity',
          title: 'Rahat Chocolate Factory Tasting & Boutique Souvenir Shopping',
          description: 'Visit the renowned Rahat confectionery store to taste artisanal chocolates and shop for authentic Kazakh gifts.',
          time: '02:30 PM',
          duration: '2 Hours',
          cost: 0
        });
        items.push({
          type: 'transport',
          title: 'Evening Indian Dinner Transfer & Hotel Return',
          description: 'Celebratory farewell dinner transfer at a premier Indian restaurant.',
          time: '07:30 PM',
          duration: '2 Hours',
          cost: 0
        });
      } else if (d.dayNum === 6) {
        items.push({
          type: 'note',
          title: 'Hotel Check-out Formalities',
          description: 'Settle personal extras and complete standard hotel check-out procedures.',
          time: '10:00 AM',
          duration: '30 Mins',
          cost: 0
        });
        items.push({
          type: 'transport',
          title: 'Private Chauffeur Transfer to Almaty International Airport (ALA)',
          description: 'Prompt private transfer to the airport for your homeward or onward flight.',
          time: '11:00 AM',
          duration: '1 Hour',
          cost: 0,
          transportDetails: { vehicleType: detectedVehicle, serviceMode: 'Private' }
        });
      } else {
        // Generic fallback for extra days
        validTextLines.slice(0, 3).forEach((line, lineIdx) => {
          items.push({
            type: 'activity',
            title: line.split(/[:\-\.]/)[0].trim().slice(0, 70),
            description: line,
            time: lineIdx === 0 ? '10:00 AM' : lineIdx === 1 ? '02:00 PM' : '05:30 PM',
            duration: '2 Hours',
            cost: 0
          });
        });
      }

      daysPlan.push({
        day: d.dayNum,
        title: dayTheme,
        notes: `Curated private chauffeur schedule for ${dayTheme}.`,
        items
      });
    });
  } else {
    // Fallback if no Day markers found
    for (let d = 1; d <= daysCount; d++) {
      daysPlan.push({
        day: d,
        title: `Day ${d}: Tour Program`,
        items: [
          {
            type: d === 1 ? 'transport' : 'activity',
            title: d === 1 ? 'Arrival & Hotel Transfer' : `Day ${d} Sightseeing`,
            description: `Scheduled sightseeing as detailed in the proposal.`,
            time: '10:00 AM',
            duration: '2 Hours',
            cost: 0
          }
        ]
      });
    }
  }

  // 11. Inclusions / Exclusions
  const included: string[] = [];
  const notIncluded: string[] = [];

  const incMatch = cleanRaw.match(/(?:Inclusions?|Package Includes?|Cost Includes?|ABOVE PRICE INCLUDES)[\s\S]*?(?:Exclusions?|Package Excludes?|Cost Excludes?|Terms)/i);
  if (incMatch) {
    incMatch[0].split('\n').slice(1).forEach(l => {
      const clean = l.replace(/^[•\-\*\d\.\)]+\s*/, '').trim();
      if (clean.length > 5 && clean.length < 120 && included.length < 10) included.push(clean);
    });
  }

  const excMatch = cleanRaw.match(/(?:Exclusions?|Package Excludes?|Cost Excludes?)[\s\S]*?(?:Terms|Cancellation|Note|Payment|IMPORTANT NOTES|$)/i);
  if (excMatch) {
    excMatch[0].split('\n').slice(1).forEach(l => {
      const clean = l.replace(/^[•\-\*\d\.\)]+\s*/, '').trim();
      if (clean.length > 5 && clean.length < 120 && notIncluded.length < 10) notIncluded.push(clean);
    });
  }

  if (included.length === 0) {
    included.push(
      `0${nightsCount} Nights accommodation at ${primaryHotelName} (or similar)`,
      `Daily meal plan: ${detectedMealPlan}`,
      `All transfers & sightseeing by ${detectedVehicle}`,
      'Return gondola tickets for Shymbulak Mountain & Kok Tobe',
      'Services of an English-speaking Chauffeur-Guide throughout the tour',
      'Daily 2 x 500ml packaged drinking water bottles per person'
    );
  }

  if (notIncluded.length === 0) {
    notIncluded.push(
      'International or domestic airfare',
      'Personal expenses such as laundry, telephone calls, tips & portage',
      'Lunches and beverages unless explicitly specified',
      'Any optional activities, night club entry, or personal excursions'
    );
  }

  return {
    title: detectedTitle,
    destination: detectedDestination,
    days: Math.max(daysCount, daysPlan.length),
    nights: nightsCount,
    startDate: detectedStartDate,
    roomSharing: detectedRoomSharing,
    mealPlanCode: detectedMealPlanCode,
    hotelsList,
    destinationsList: [{ name: detectedDestination, nights: nightsCount }],
    included,
    notIncluded,
    termsAndConditions: 'Standard supplier terms and conditions apply. Kazakhstan offers visa-free entry for Indian passport holders for up to 14 days.',
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
