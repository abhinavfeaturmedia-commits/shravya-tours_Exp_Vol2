
import { GoogleGenerativeAI } from "@google/generative-ai";
import { api } from "./api";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;
if (API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
} else {
    console.error("Gemini API Key is missing in .env.local");
}

// Cache for dynamic OpenRouter free models
let cachedFreeModels: string[] | null = null;
let lastModelsFetchTime = 0;

const getActiveFreeOpenRouterModels = async (): Promise<string[]> => {
    const now = Date.now();
    if (cachedFreeModels && (now - lastModelsFetchTime < 1000 * 60 * 15)) {
        return cachedFreeModels;
    }
    try {
        const res = await fetch("https://openrouter.ai/api/v1/models");
        if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.data)) {
                const liveFree = data.data
                    .filter((m: any) => m.id && (m.id.endsWith(':free') || m.id === 'openrouter/free' || m.pricing?.prompt === '0'))
                    .map((m: any) => m.id);
                if (liveFree.length > 0) {
                    cachedFreeModels = ['openrouter/free', ...liveFree];
                    lastModelsFetchTime = now;
                    return cachedFreeModels;
                }
            }
        }
    } catch (e) {
        console.warn("[OpenRouter] Could not fetch live models list:", e);
    }
    return [
        'openrouter/free',
        'google/gemma-4-31b-it:free',
        'google/gemma-4-26b-a4b-it:free',
        'openai/gpt-oss-20b:free',
        'nvidia/nemotron-3-super-120b-a12b:free',
        'nvidia/nemotron-3-ultra-550b-a55b:free',
        'nvidia/nemotron-3.5-lightning:free',
        'meta-llama/llama-3.3-70b-instruct:free',
        'deepseek/deepseek-r1:free',
        'qwen/qwen-2.5-72b-instruct:free',
        'mistralai/mistral-small-24b-instruct-2501:free'
    ];
};

// Helper to fetch OpenRouter settings from DB
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
        console.warn("[OpenRouter Config] Failed to load settings from DB, using fallback:", e);
        return {
            enabled: false,
            apiKey: '',
            defaultModel: 'openrouter/free'
        };
    }
};

// Generic helper to get completion from OpenRouter or direct Gemini fallback
const getAIResponse = async (prompt: string, imageBase64?: string) => {
    const config = await getOpenRouterConfig();

    if (config.enabled && config.apiKey) {
        const configModel = (config.defaultModel || 'openrouter/free')
            .replace(/^["']|["']$/g, '')
            .trim();

        const liveFreeModels = await getActiveFreeOpenRouterModels();

        const modelsToTry: string[] = [];

        // If user configured a specific model, try it first
        if (configModel) {
            modelsToTry.push(configModel);
            // If the model name doesn't end with :free and isn't openrouter/free, also try its :free version
            if (!configModel.endsWith(':free') && configModel !== 'openrouter/free') {
                const freeVariant = `${configModel}:free`;
                if (liveFreeModels.includes(freeVariant)) {
                    modelsToTry.push(freeVariant);
                }
            }
        }

        // Always include openrouter/free (OpenRouter's official dynamic free router)
        modelsToTry.push('openrouter/free');

        // Add all live free models discovered dynamically
        modelsToTry.push(...liveFreeModels);

        // Add hardcoded high-quality free fallbacks
        modelsToTry.push(
            'google/gemma-4-31b-it:free',
            'google/gemma-4-26b-a4b-it:free',
            'openai/gpt-oss-20b:free',
            'nvidia/nemotron-3-super-120b-a12b:free',
            'nvidia/nemotron-3-ultra-550b-a55b:free',
            'nvidia/nemotron-3.5-lightning:free',
            'meta-llama/llama-3.3-70b-instruct:free',
            'deepseek/deepseek-r1:free',
            'qwen/qwen-2.5-72b-instruct:free',
            'mistralai/mistral-small-24b-instruct-2501:free'
        );

        // Deduplicate while maintaining priority
        const uniqueModels = Array.from(new Set(modelsToTry.filter(Boolean)));

        const callOpenRouter = async (model: string): Promise<string> => {
            let bodyPayload: any;
            if (imageBase64) {
                const base64Data = imageBase64.split(',')[1] || imageBase64;
                const mimeType = imageBase64.match(/data:([^;]+);/)?.[1] || "image/jpeg";
                bodyPayload = {
                    model,
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: prompt },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: `data:${mimeType};base64,${base64Data}`
                                    }
                                }
                            ]
                        }
                    ]
                };
            } else {
                bodyPayload = {
                    model,
                    messages: [
                        { role: "user", content: prompt }
                    ]
                };
            }

            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${config.apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": window.location.origin,
                    "X-Title": "Shrawello Travel Hub"
                },
                body: JSON.stringify(bodyPayload)
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`OpenRouter Error (${res.status}): ${errText}`);
            }

            const data = await res.json();
            if (!data.choices || data.choices.length === 0) {
                throw new Error("OpenRouter returned an empty response.");
            }
            return data.choices[0].message.content;
        };

        let lastError: any = null;
        for (const model of uniqueModels) {
            try {
                console.log(`[AI] Attempting OpenRouter call with model: ${model}`);
                return await callOpenRouter(model);
            } catch (err: any) {
                console.warn(`[AI] OpenRouter model ${model} failed (${err?.message || err}). Trying next free model in queue...`);
                lastError = err;
            }
        }

        // If OpenRouter calls all failed, try direct Gemini API as ultimate safety net
        if (genAI) {
            console.warn("[AI] All OpenRouter models exhausted. Falling back to direct Google Gemini API...");
            try {
                const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                if (imageBase64) {
                    const base64Data = imageBase64.split(',')[1] || imageBase64;
                    const mimeType = imageBase64.match(/data:([^;]+);/)?.[1] || "image/jpeg";
                    const imagePart = {
                        inlineData: {
                            data: base64Data,
                            mimeType: mimeType
                        }
                    };
                    const result = await model.generateContent([prompt, imagePart]);
                    return result.response.text();
                } else {
                    const result = await model.generateContent(prompt);
                    return result.response.text();
                }
            } catch (geminiErr) {
                console.error("[AI] Direct Gemini fallback also failed:", geminiErr);
            }
        }

        throw lastError || new Error("AI service temporarily unavailable. Please check your OpenRouter API key in Settings.");
    } else {
        console.log("[AI] Using direct Gemini API fallback");
        if (!genAI) {
            throw new Error("Gemini API Key is missing. Please add VITE_GEMINI_API_KEY to your .env file or enable OpenRouter AI in Settings.");
        }
        // Normalize model name for direct Gemini
        let modelName = 'gemini-1.5-flash';
        if (config.defaultModel) {
            const cleanModel = config.defaultModel.replace(/^["']|["']$/g, '').toLowerCase();
            if (cleanModel.includes('pro')) {
                modelName = 'gemini-1.5-pro';
            }
        }
        const model = genAI.getGenerativeModel({ model: modelName });
        if (imageBase64) {
            const base64Data = imageBase64.split(',')[1] || imageBase64;
            const mimeType = imageBase64.match(/data:([^;]+);/)?.[1] || "image/jpeg";
            const imagePart = {
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType
                }
            };
            const result = await model.generateContent([prompt, imagePart]);
            return result.response.text();
        } else {
            const result = await model.generateContent(prompt);
            return result.response.text();
        }
    }
};


export const robustParseJson = (text: string): any => {
    if (!text) return null;
    
    // 1. Strip DeepSeek R1 reasoning tags <think>...</think>
    let clean = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // 2. Remove markdown code fences if present
    clean = clean.replace(/```json/gi, '').replace(/```/g, '').trim();

    // 3. Find the first occurrence of '{' or '[' and the last occurrence of '}' or ']'
    const firstBrace = clean.indexOf('{');
    const firstBracket = clean.indexOf('[');

    let start = -1;
    let end = -1;

    if (firstBrace !== -1 && firstBracket !== -1) {
        if (firstBrace < firstBracket) {
            start = firstBrace;
            end = clean.lastIndexOf('}');
        } else {
            start = firstBracket;
            end = clean.lastIndexOf(']');
        }
    } else if (firstBrace !== -1) {
        start = firstBrace;
        end = clean.lastIndexOf('}');
    } else if (firstBracket !== -1) {
        start = firstBracket;
        end = clean.lastIndexOf(']');
    }

    if (start !== -1 && end !== -1 && end > start) {
        clean = clean.substring(start, end + 1);
    }

    // 4. Remove any illegal trailing commas before closing braces/brackets
    clean = clean.replace(/,\s*([}\]])/g, '$1');

    try {
        return JSON.parse(clean);
    } catch (err) {
        // As fallback, try secondary regex-based extraction
        const match = clean.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (match) {
            return JSON.parse(match[0].replace(/,\s*([}\]])/g, '$1'));
        }
        throw err;
    }
};

export interface GenerateItineraryOptions {
    destination: string;
    destinationsList?: Array<{ name: string; nights: number; order: number }>;
    days: number;
    travelers: string;
    startDate: string;
    tripStyle?: string; // 'Honeymoon' | 'Family' | 'Adventure' | 'Cultural' | 'Luxury' | 'Leisure' | 'Budget'
    pace?: 'Relaxed' | 'Balanced' | 'Explorer';
    interests?: string[];
    specialRequests?: string;
    masterContext?: {
        hotels?: Array<{ id: string; name: string; stars?: number; area?: string; price?: number }>;
        activities?: Array<{ id: string; name: string; category?: string; cost?: number; duration?: string }>;
        transports?: Array<{ id: string; name: string; type?: string; cost?: number; capacity?: number }>;
    };
}

export const generateItinerary = async (
    destinationOrOptions: string | GenerateItineraryOptions,
    daysArg?: number,
    travelersArg?: string,
    startDateArg?: string,
    extraOptions?: Partial<GenerateItineraryOptions>
) => {
    // Normalize arguments for backward compatibility
    let opts: GenerateItineraryOptions;
    if (typeof destinationOrOptions === 'object') {
        opts = destinationOrOptions;
    } else {
        opts = {
            destination: destinationOrOptions,
            days: daysArg || 3,
            travelers: travelersArg || '2 Adults',
            startDate: startDateArg || 'Upcoming',
            ...extraOptions
        };
    }

    const {
        destination,
        destinationsList,
        days,
        travelers,
        startDate,
        tripStyle = 'Balanced Vacation',
        pace = 'Balanced',
        interests = [],
        specialRequests = '',
        masterContext
    } = opts;

    // Build Master Inventory Context if available
    let catalogSnippet = '';
    if (masterContext) {
        const hList = (masterContext.hotels || []).slice(0, 8).map(h => `- Hotel: "${h.name}" (ID: ${h.id}, ${h.stars || 4}★, ₹${h.price || 0}/night, Area: ${h.area || destination})`).join('\n');
        const aList = (masterContext.activities || []).slice(0, 12).map(a => `- Activity: "${a.name}" (ID: ${a.id}, ₹${a.cost || 0}, ${a.duration || '2h'}, Category: ${a.category || 'Sightseeing'})`).join('\n');
        const tList = (masterContext.transports || []).slice(0, 4).map(t => `- Vehicle: "${t.name}" (ID: ${t.id}, ₹${t.cost || 0}/day, ${t.type || 'SUV'})`).join('\n');

        catalogSnippet = `
AVAILABLE AGENCY MASTER DATABASE INVENTORY (Use matching ID and names where appropriate):
${hList ? `[Hotels]\n${hList}\n` : ''}
${aList ? `[Activities]\n${aList}\n` : ''}
${tList ? `[Transports]\n${tList}\n` : ''}
If an item from the master inventory fits the itinerary, use its exact name, "masterId", and estimated cost. Otherwise, you may suggest premier local activities.
`;
    }

    let multiLegText = '';
    if (destinationsList && destinationsList.length > 1) {
        multiLegText = `
MULTI-DESTINATION ITINERARY ROUTE:
${destinationsList.map((d, i) => `Leg ${i + 1}: ${d.name} (${d.nights} Nights)`).join(' -> ')}
Please ensure that inter-destination travel, hotel check-outs, and scenic transfers are scheduled realistically on transit days.
`;
    }

    const prompt = `
You are a World-Class Destination Management Company (DMC) Senior Tour Designer for SHRAWELLO Travel Hub.
Design an experiential, seamless, and premium ${days}-day itinerary for ${destination}.

TRIP PARAMETERS:
- Travelers: ${travelers}
- Trip Dates: Starts on ${startDate} (${days} Days)
- Trip Style & Vibe: ${tripStyle}
- Travel Pace: ${pace} (e.g. Relaxed: 1-2 curated highlights per day; Balanced: 2-4 items; Explorer: 4-5 items)
- Specific Interests: ${interests.length > 0 ? interests.join(', ') : 'Iconic sights, authentic culinary gems, scenic photography & local culture'}
${specialRequests ? `- Special Notes/Requests: "${specialRequests}"` : ''}
${multiLegText}
${catalogSnippet}

EXPERT TOUR DESIGN PRINCIPLES:
1. GEOGRAPHIC PROXIMITY: Group morning, afternoon, and evening sights in the same sector/neighborhood to minimize transit.
2. SENSORY & IMMERSIVE DESCRIPTIONS: Avoid plain 1-line text. Write vivid, engaging descriptions with highlights, atmosphere, and practical tips.
3. MULTI-SERVICE GRANULARITY: Categorize each line item strictly into:
   - "transport": Airport pickups, inter-city drives, scenic transfers, private cabs.
   - "hotel": Check-in and property relaxation on Day 1 or inter-city hotel switches.
   - "activity": Guided monuments, nature treks, boat cruises, heritage walks, culinary tours.
   - "guide": Monument escort or private local heritage guides.
   - "note": Essential local tips (e.g., dress codes for temples, altitude acclimation, best photo angles).
4. REALISTIC COSTS: Provide realistic estimated Net Costs in INR (₹) for private tours, entry fees, and transfers (do NOT just return 0 unless genuinely free).
5. INCLUSIONS & EXCLUSIONS: Generate 4-6 specific inclusions and 4-6 specific exclusions tailored to this exact trip.

OUTPUT FORMAT:
Return ONLY a valid JSON object matching this exact structure (no markdown fences, no leading/trailing commentary):
{
  "title": "A catchy, evocative luxury package title (e.g. 'Enchanting Kashmir: Houseboats, Glaciers & Mughal Splendor')",
  "highlights": ["3-4 bullet point key highlights of this holiday"],
  "included": ["Daily buffet breakfast at hotels", "Private AC vehicle for all transfers and sightseeing", "Sightseeing entry tickets & shikara ride"],
  "notIncluded": ["Personal expenses & tips", "Airfare unless specified", "Optional adventure water sports"],
  "days": [
    {
      "day": 1,
      "title": "Evocative Theme (e.g. 'Arrival in Paradise & Sunset Shikara on Dal Lake')",
      "notes": "Acclimatize at ease today. Keep warm shawl handy for the evening breeze.",
      "items": [
        {
          "time": "10:30 AM",
          "type": "transport",
          "title": "Private Airport Welcome & Hotel Transfer",
          "description": "Meet your private chauffeur at the arrivals terminal with a warm welcome. Enjoy a scenic drive to your resort with refreshing welcome drinks.",
          "cost": 1500,
          "duration": "45 Mins",
          "masterId": ""
        },
        {
          "time": "01:00 PM",
          "type": "hotel",
          "title": "Resort Check-In & Leisure Lunch",
          "description": "Check in to your deluxe lakefront room. Freshen up and savor traditional Kashmiri Wazwan or continental delicacies at the garden cafe.",
          "cost": 6500,
          "duration": "2 Hours",
          "masterId": ""
        },
        {
          "time": "05:00 PM",
          "type": "activity",
          "title": "Romantic Sunset Shikara Cruise on Dal Lake",
          "description": "Glide over tranquil waters through floating lotus gardens and the historic Char Chinar island as the sun casts a golden glow over Zabarwan hills.",
          "cost": 1200,
          "duration": "1.5 Hours",
          "masterId": ""
        }
      ]
    }
  ]
}
`;

    try {
        const text = await getAIResponse(prompt);
        return robustParseJson(text);
    } catch (error) {
        console.error("Itinerary Generation Error:", error);
        throw error;
    }
};

// ─── Micro-AI Helpers ─────────────────────────────────────────────────────────

/**
 * Regenerates a single day with custom instructions (e.g. "Add water sports" or "Make it more romantic")
 */
export const regenerateSingleDay = async (params: {
    dayNumber: number;
    destination: string;
    currentItems: any[];
    promptInstruction: string;
    travelers?: string;
    tripStyle?: string;
}) => {
    const { dayNumber, destination, currentItems, promptInstruction, travelers = '2 Guests', tripStyle = 'Curated' } = params;

    const prompt = `
You are an expert travel designer for SHRAWELLO Travel Hub.
Redesign Day ${dayNumber} of an itinerary in ${destination} for ${travelers} (${tripStyle} style).

USER SPECIFIC REQUEST / MODIFICATION:
"${promptInstruction}"

CURRENT ITEMS ON THIS DAY (FOR REFERENCE):
${JSON.stringify(currentItems.map(i => ({ title: i.title, type: i.type, time: i.time })))}

Create a refreshed, high-quality, geographically logical plan for Day ${dayNumber}.
Return ONLY a valid JSON object matching this structure:
{
  "day": ${dayNumber},
  "title": "New theme/title for this day",
  "notes": "Practical tip or reminder for this day",
  "items": [
    {
      "time": "09:30 AM",
      "type": "activity",
      "title": "Clear descriptive title",
      "description": "Vivid 2-sentence description with highlights and tips",
      "cost": 1500,
      "duration": "2.5 Hours"
    }
  ]
}
`;

    const text = await getAIResponse(prompt);
    return robustParseJson(text);
};

/**
 * Elevates dry, basic text into luxury brochure-grade travel copy
 */
export const polishItineraryCopy = async (itemTitle: string, itemDescription: string, type: string, destination?: string) => {
    const prompt = `
You are a senior luxury travel copywriter. Polish and elevate this travel itinerary item into an evocative, irresistible brochure description.

Destination: ${destination || 'Destination'}
Item Type: ${type}
Current Title: "${itemTitle}"
Current Description: "${itemDescription || 'Standard sightseeing'}"

Requirements:
- Keep the title clear, premium, and concise.
- Write a vivid, sensory 2-3 sentence description highlighting the unique experience, atmosphere, and what makes it unmissable.
- Return ONLY a JSON object:
{
  "title": "Polished Catchy Title",
  "description": "Evocative, descriptive copy..."
}
`;

    const text = await getAIResponse(prompt);
    return robustParseJson(text);
};

/**
 * Generates tailored Inclusions and Exclusions based on trip details and items
 */
export const generateInclusionsExclusions = async (destination: string, days: number, items: any[], tripStyle?: string) => {
    const itemsSummary = (items || []).slice(0, 20).map(i => `${i.type.toUpperCase()}: ${i.title}`).join(', ');

    const prompt = `
You are a travel contracting specialist for SHRAWELLO Travel Hub.
Generate a comprehensive list of "Included" and "Not Included" package terms for a ${days}-day trip to ${destination} (${tripStyle || 'Custom Tour'}).

PLANNED ITINERARY ITEMS:
${itemsSummary || 'Standard private holiday package'}

Return ONLY a valid JSON object:
{
  "included": [
    "0${days - 1} Nights accommodation in verified deluxe properties",
    "Daily buffet breakfast at all hotels",
    "All inter-city transfers and local sightseeing in private AC vehicle",
    "Driver allowances, toll taxes, state permits and fuel charges",
    "Entry tickets & experiences as outlined in the day-by-day plan"
  ],
  "notIncluded": [
    "Airfare / Train tickets unless explicitly mentioned",
    "Meals other than specified (Lunch & Personal dinners)",
    "Monument camera fees & personal guide services where optional",
    "Early check-in and late check-out charges",
    "Personal expenses such as laundry, room service, telephone calls & tips",
    "Any cost arising due to unforeseen weather disruptions or flight delays"
  ]
}
`;

    const text = await getAIResponse(prompt);
    return robustParseJson(text);
};

/**
 * Generates 4-5 destination-tailored FAQs
 */
export const generateDestinationFAQs = async (destination: string, days: number, highlights?: string[]) => {
    const prompt = `
You are a local tour guide and destination specialist for ${destination}.
Create 4 to 5 essential, practical FAQs that travelers ask when planning a ${days}-day trip to ${destination}.

Consider destination-specific topics such as:
1. Best season / weather conditions
2. Local permit requirements / ID proofs / Border passes
3. Recommended clothing / dress codes for temples or mountains
4. Health / altitude sickness precautions or packing advice
5. Local currency / SIM card / connectivity tips

Return ONLY a valid JSON array of FAQ objects:
[
  {
    "q": "What is the best time to visit ${destination}?",
    "a": "Detailed, accurate answer..."
  },
  {
    "q": "Are special permits or IDs required for sightseeing?",
    "a": "Detailed, accurate answer..."
  }
]
`;

    const text = await getAIResponse(prompt);
    return robustParseJson(text);
};


export const analyzeLead = async (lead: any) => {
    const prompt = `
    Analyze this travel lead for SHRAWELLO Travel Hub and provide a "Conversion Score" (0-100) and a "Strategic Summary".
    
    Lead Details:
    Name: ${lead.name}
    Destination: ${lead.destination}
    Budget: ${lead.budget}
    Status: ${lead.status}
    Notes: ${lead.preferences}
    Interactions: ${JSON.stringify(lead.logs.map((l: any) => l.content).join(' | '))}

    Return ONLY JSON:
    {
      "score": 85,
      "summary": "High value lead looking for...",
      "tips": "Suggest X hotel..."
    }
  `;

    try {
        const text = await getAIResponse(prompt);
        return robustParseJson(text);
    } catch (e) {
        console.error("Lead Analysis Failed", e);
        throw e;
    }
};

export const generateMarketingContent = async (topic: string, platform: 'Email' | 'WhatsApp' | 'Instagram', tone: string) => {
    const prompt = `
    You are a professional digital marketer for a travel agency.
    Write creative content for a ${platform} campaign.
    
    Topic: ${topic}
    Tone: ${tone}

    Return ONLY JSON:
    {
        "subject": "Catchy Subject Line (if Email)",
        "content": "The main message body...",
        "hashtags": "#travel #deals (if social)"
    }
    `;

    try {
        const text = await getAIResponse(prompt);
        return robustParseJson(text);
    } catch (e) {
        console.error("Marketing Gen Failed", e);
        throw e;
    }
};

export const parseInvoice = async (imageBase64: string) => {
    const prompt = `
    Analyze this invoice/receipt image and extract the following details:
    1. Total Amount (numeric only)
    2. Vendor/Company Name
    3. Invoice Number / Reference ID (if any)
    4. Description of service (short summary)

    Return ONLY a JSON object:
    {
        "amount": 10500,
        "vendor": "Taj Hotels",
        "reference": "INV-998877",
        "description": "Hotel Booking for Goa Group"
    }
    `;

    try {
        const text = await getAIResponse(prompt, imageBase64);
        return robustParseJson(text);
    } catch (e) {
        console.error("Invoice Parsing Failed", e);
        throw e;
    }
};
 
export const generateWeeklyStandupSummary = async (logs: any[], staffNamesMap: Record<number, string>) => {
    // Map staffIds to names for better readability in summary
    const mappedLogs = logs.map(l => ({
        ...l,
        staffName: staffNamesMap[l.staffId] || `Staff #${l.staffId}`
    }));

    const prompt = `
    You are a professional marketing coordinator for SHRAWELLO Travel Hub.
    Below is a JSON list of marketing logs submitted by the team for the past week:
    
    ${JSON.stringify(mappedLogs)}
    
    Summarize these logs into a clean, professional, and inspiring weekly standup update.
    The update should be formatted in Markdown (using bullet points and bold highlights).
    Structure the update into these sections:
    1. 📈 **Overall Performance & Momentum**: Briefly highlight total outreach (emails, DMs, calls), total spend, total leads generated, average CPL (Cost per Lead), and revenue generated.
    2. 📢 **Marketing Activities (Paid & Organic)**: Bullet points summarizing outreach, nurturing, and Meta Ads tests/creative updates from different staff members.
    3. 💡 **Key Learnings & Experiment Insights**: What worked, what failed, and key lessons logged.
    4. 🎯 **Next Steps**: Based on the logs, recommend next steps (e.g. scale what works, fix high CPL ads).

    Ensure it's concise, professional, and ready to share on Slack/WhatsApp. Do not output JSON, return the raw markdown string directly.
    `;

    try {
        return await getAIResponse(prompt);
    } catch (e) {
        console.error("Weekly Standup Summary Failed", e);
        throw e;
    }
};

// List of available free OpenRouter models & Smart Engine
export const OPENROUTER_FREE_MODELS = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Meta LLaMA 3.3 70B (Free AI)', provider: 'OpenRouter' },
  { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Free Reasoning)', provider: 'OpenRouter' },
  { id: 'google/gemini-2.5-flash:free', name: 'Gemini 2.5 Flash (Free AI)', provider: 'OpenRouter' },
  { id: 'qwen/qwen-2.5-coder-32b-instruct:free', name: 'Qwen 2.5 Coder 32B (Free AI)', provider: 'OpenRouter' },
  { id: 'smart-logic-engine', name: 'Instant Smart Reasoning Engine', provider: 'Deterministic AI' }
];

// Offline / Fallback Smart Reasoning & Logic Engine
export const generatePackingChecklistSmartLogic = (
  destination: string,
  days: number,
  weather: string,
  activityLevel: string,
  category: string
) => {
  const destLower = (destination || '').toLowerCase();
  const weatherLower = (weather || '').toLowerCase();
  const activityLower = (activityLevel || '').toLowerCase();

  const isCold = destLower.includes('kashmir') || destLower.includes('himachal') || destLower.includes('swiss') || weatherLower.includes('cold') || weatherLower.includes('chilly') || weatherLower.includes('rain');
  const isBeach = destLower.includes('bali') || destLower.includes('goa') || destLower.includes('kerala') || destLower.includes('maldives') || destLower.includes('beach') || weatherLower.includes('sunny') || weatherLower.includes('warm');
  const isTrekking = activityLower.includes('trek') || activityLower.includes('intense') || activityLower.includes('hiking') || activityLower.includes('adventure');

  // Logic calculation for clothes quantities based on days
  const shirtQty = Math.min(days, 7);
  const pantsQty = Math.max(2, Math.min(Math.ceil(days / 2), 4));
  const socksQty = Math.min(days + 1, 8);

  const clothingItems: Array<{ name: string; qty: string; checked: boolean }> = [
    { name: isBeach ? "Breathable linen shirts / tees" : "Comfortable t-shirts", qty: String(shirtQty), checked: false },
    { name: isCold ? "Warm trousers / fleece-lined pants" : "Comfortable trousers / shorts", qty: String(pantsQty), checked: false },
    { name: "Underwear & socks", qty: String(socksQty), checked: false },
    { name: "Sleepwear / Loungewear", qty: "2", checked: false },
  ];

  if (isCold) {
    clothingItems.push(
      { name: "Heavy Fleece / Down Jacket", qty: "1", checked: false },
      { name: "Thermal Innerwear Sets", qty: "2", checked: false },
      { name: "Woolen Beanie & Gloves", qty: "1 set", checked: false }
    );
  }

  if (isBeach) {
    clothingItems.push(
      { name: "Quick-dry Swimwear & Beach Coverups", qty: "2 sets", checked: false },
      { name: "UV Protection Sunglasses", qty: "1 pair", checked: false },
      { name: "Sun Hat / Visor", qty: "1", checked: false }
    );
  }

  const toiletryItems = [
    { name: "Travel Toothbrush & Paste", qty: "1 set", checked: false },
    { name: "Shampoo & Body Wash Sachet", qty: "1 bottle", checked: false },
    { name: "Deodorant / Perfume Spray", qty: "1", checked: false },
    { name: isBeach ? "Sunscreen Broad Spectrum SPF50+" : "Moisturizer / Lip Balm", qty: "1 bottle", checked: false },
  ];

  const docItems = [
    { name: "Passport / Government ID original & copies", qty: "1 set", checked: false },
    { name: "Flight Tickets & Hotel Vouchers (Printed/PDF)", qty: "1 file", checked: false },
    { name: "Credit/Debit Cards & Local Cash", qty: "As needed", checked: false },
    { name: "Travel Insurance Card / Policy copy", qty: "1", checked: false },
  ];

  const electronicsItems = [
    { name: "Smartphone & Fast Charger", qty: "1 set", checked: false },
    { name: "Power Bank (10,000mAh+)", qty: "1", checked: false },
    { name: "Universal Travel Plug Adapter", qty: "1", checked: false },
  ];

  const specialtyItems = [];
  if (isTrekking) {
    specialtyItems.push(
      { name: "Ankle-Support Trekking Boots", qty: "1 pair", checked: false },
      { name: "Hydration Flask / Insulated Bottle", qty: "1 L", checked: false },
      { name: "First Aid & Bandage Kit", qty: "1 pouch", checked: false },
      { name: "Electrolyte Packets & Energy Bars", qty: "5 packs", checked: false }
    );
  } else {
    specialtyItems.push(
      { name: "Comfortable Walking Sneakers / Sandals", qty: "1 pair", checked: false },
      { name: "Compact Daypack Backpack", qty: "1", checked: false }
    );
  }

  const reasoningText = `Reasoning Logic (${days} Days in ${destination}): Calculated ${shirtQty} tops and ${pantsQty} pants based on a ${days}-day duration rule. ${
    isCold 
      ? 'Detected cold/chilly alpine climate — added thermal innerwear, down jacket, and woolen gear.' 
      : isBeach 
      ? 'Detected tropical/coastal climate — prioritized UV SPF50+, quick-dry swimwear, and breathable fabrics.' 
      : 'Selected versatile smart casual wardrobe for mild climate.'
  } ${isTrekking ? 'Included trekking boots, hydration flask, and emergency first aid for active terrain.' : ''}`;

  return {
    reasoning: reasoningText,
    modelUsed: 'Smart Reasoning Logic Engine',
    items: [
      { category: "Clothing", items: clothingItems },
      { category: "Toiletries", items: toiletryItems },
      { category: "Documents & Money", items: docItems },
      { category: "Electronics", items: electronicsItems },
      { category: isTrekking ? "Outdoor & Trekking Gear" : "Essentials & Meds", items: specialtyItems }
    ]
  };
};

export const generatePackingChecklist = async (
  destination: string,
  days: number,
  weather: string,
  activityLevel: string,
  category: string,
  selectedModel: string = 'meta-llama/llama-3.3-70b-instruct:free'
) => {
  if (selectedModel === 'smart-logic-engine') {
    return generatePackingChecklistSmartLogic(destination, days, weather, activityLevel, category);
  }

  const prompt = `
  You are an expert travel assistant for SHRAWELLO Travel Hub.
  Generate a detailed packing checklist for a trip to "${destination}" for ${days} days.
  The weather will be: ${weather}.
  The planned activity level is: ${activityLevel}.
  The trip/itinerary category is: ${category}.

  Analyze the trip duration (${days} days), destination climate (${weather}), and activity profile (${activityLevel}) with careful reasoning.

  Return ONLY a valid raw JSON object formatted exactly as below (no markdown formatting, no code fences, no leading text):
  {
    "reasoning": "A concise 2-sentence logical explanation detailing why these specific clothing quantities, weather protection gear, and activity items were selected for this ${days}-day trip to ${destination}.",
    "items": [
      {
        "category": "Clothing",
        "items": [
          { "name": "Light t-shirts", "qty": "5", "checked": false },
          { "name": "Comfortable jeans", "qty": "2", "checked": false }
        ]
      },
      {
        "category": "Toiletries",
        "items": [
          { "name": "Toothbrush & Paste", "qty": "1 set", "checked": false }
        ]
      },
      {
        "category": "Documents & Money",
        "items": [
          { "name": "Passport & Visas", "qty": "1 set", "checked": false }
        ]
      },
      {
        "category": "Electronics",
        "items": [
          { "name": "Power Bank 10000mAh", "qty": "1", "checked": false }
        ]
      }
    ]
  }
  `;

  try {
    const config = await getOpenRouterConfig();
    let text = '';

    if (config.enabled && config.apiKey) {
      // Call OpenRouter with selected free model or fallback queue
      const callOpenRouterDirect = async (model: string): Promise<string> => {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": window.location.origin,
            "X-Title": "Shrawello Travel Hub"
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }]
          })
        });

        if (!res.ok) {
          throw new Error(`OpenRouter (${res.status}): ${await res.text()}`);
        }
        const data = await res.json();
        return data.choices?.[0]?.message?.content || '';
      };

      try {
        text = await callOpenRouterDirect(selectedModel);
      } catch (err) {
        console.warn(`[AI] Selected model ${selectedModel} failed, trying LLaMA 3.3 70B free fallback:`, err);
        text = await callOpenRouterDirect('meta-llama/llama-3.3-70b-instruct:free');
      }
    } else {
      // Direct call fallback
      text = await getAIResponse(prompt);
    }

    const parsed = robustParseJson(text);
    if (parsed && Array.isArray(parsed)) {
      return {
        reasoning: `AI Reasoning (${days} Days in ${destination}): Curated ${days}-day packing checklist for ${weather} weather and ${activityLevel} activities.`,
        modelUsed: selectedModel,
        items: parsed
      };
    } else if (parsed && parsed.items && Array.isArray(parsed.items)) {
      return {
        reasoning: parsed.reasoning || `AI Reasoning (${days} Days in ${destination}): Customized items for ${weather} and ${activityLevel}.`,
        modelUsed: selectedModel,
        items: parsed.items
      };
    }

    // Fallback to Smart Reasoning Engine if JSON parsing didn't return standard format
    return generatePackingChecklistSmartLogic(destination, days, weather, activityLevel, category);
  } catch (error) {
    console.warn("OpenRouter Free AI call failed, falling back to Smart Reasoning Engine:", error);
    return generatePackingChecklistSmartLogic(destination, days, weather, activityLevel, category);
  }
};



