/**
 * DMC PDF Itinerary Parser Engine
 * Combines high-speed browser PDF text extraction with OpenRouter Free AI / Gemini parsing,
 * and a deterministic heuristic regex fallback engine.
 */

import { extractTextFromPdf, ExtractedPdfData, fileToBase64 } from './pdfExtractor';
import { robustParseJson } from './gemini';
import { api } from './api';

export interface ParsedItineraryItem {
  type: 'hotel' | 'activity' | 'transport' | 'flight' | 'guide' | 'note' | 'visa';
  title: string;
  description?: string;
  time?: string;
  duration?: string;
  cost?: number;
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
  destinationsList?: Array<{ name: string; nights: number }>;
  included: string[];
  notIncluded: string[];
  termsAndConditions?: string;
  faqs?: Array<{ q: string; a: string }>;
  daysPlan: ParsedDayPlan[];
  source: 'ai' | 'heuristic';
  modelUsed?: string;
  rawTextPreview?: string;
}

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
      defaultModel: 'openrouter/free'
    };
  }
};

// ─── AI Extraction Prompt ─────────────────────────────────────────────────────

const buildPdfPrompt = (pdfText: string) => `
You are a World-Class Senior Destination Management Company (DMC) Tour Operations Specialist for SHRAWELLO Travel Hub.
Analyze the following raw text extracted from a DMC / supplier travel itinerary PDF quotation and extract the full structured holiday package blueprint.

============================================================
RAW EXTRACTED PDF TEXT:
============================================================
${pdfText.slice(0, 32000)}
============================================================

TASK & EXTRACTION RULES:
1. PACKAGE OVERVIEW:
   - "title": Extract or craft an evocative, clear package title (e.g. "5N/6D Enchanting Kashmir Holiday" or "7N/8D Dubai Luxury Discovery").
   - "destination": Identify the primary state/region/country (e.g. "Kashmir", "Himachal", "Dubai", "Kerala", "Bali").
   - "days": Total duration in days (integer). If only nights are specified (e.g. 5 Nights), days = nights + 1.
   - "nights": Total overnight stays count (integer).
   - "destinationsList": Array of { "name": string, "nights": number } for all distinct stopover cities.

2. DAY-BY-DAY ITINERARY ("daysPlan"):
   - For every scheduled day (Day 1, Day 2, etc.):
     * "day": Integer (1, 2, 3...)
     * "title": Clear theme/title for the day (e.g. "Arrival in Srinagar & Dal Lake Shikara Ride")
     * "overnightCity": The city where the traveler sleeps tonight (e.g. "Srinagar", "Gulmarg", "Pahalgam")
     * "notes": Essential notes, distance, altitude advice, or timing tips for this day.
     * "items": Break down the day's itinerary into discrete service items. Categorize each item strictly into:
       - "transport": Airport pickups, inter-city drives, scenic road transfers, railway transfers.
       - "hotel": Hotel check-in, resort stay, houseboat stay, overnight rest.
       - "activity": Sightseeing, monuments, shikara ride, gondola ride, safaris, temple visits, adventure sports.
       - "guide": Monument escort, local heritage guide, trekking guide.
       - "note": Important tips, weather warnings, dress codes, permit advice.
     * In each item, provide:
       - "title": Clear, concise name of the service (e.g. "Scenic Drive from Srinagar to Gulmarg via Tangmarg")
       - "description": 1-3 sentences describing the experience, route, viewpoints, or hotel details.
       - "time": Sensible time tag (e.g. "09:30 AM", "02:00 PM", "06:00 PM") matching the sequence.
       - "duration": Realistic duration (e.g. "2.5 Hours", "45 Mins", "Full Day").
       - "cost": 0 (pricing will be decided later by the travel agent).

3. INCLUSIONS & EXCLUSIONS:
   - "included": Extract every inclusion mentioned in the document as clear bullet points (hotels, meal plan, cab type, toll/parking, driver allowance, entry passes).
   - "notIncluded": Extract all exclusions (airfare, personal expenses, lunch, optional activities, camera fees, GST).
   - "termsAndConditions": Summary of any cancellation policy, payment terms, or remarks in the PDF.

OUTPUT FORMAT:
Return ONLY a valid raw JSON object matching this exact schema (no markdown formatting, no code fences, no leading text):
{
  "title": "...",
  "destination": "...",
  "days": 6,
  "nights": 5,
  "destinationsList": [
    { "name": "Srinagar", "nights": 3 },
    { "name": "Gulmarg", "nights": 1 },
    { "name": "Pahalgam", "nights": 1 }
  ],
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
  "termsAndConditions": "...",
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
          "cost": 0
        },
        {
          "type": "hotel",
          "title": "Hotel Check-In & Freshen Up (Srinagar)",
          "description": "Check in to deluxe room. Rest and unwind.",
          "time": "01:00 PM",
          "duration": "2 Hours",
          "cost": 0
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

async function callAiWithPrompt(prompt: string, pdfBase64?: string): Promise<{ text: string; modelUsed: string }> {
  const config = await getOpenRouterConfig();

  if (config.enabled && config.apiKey) {
    const candidateModels = [
      (config.defaultModel || 'openrouter/free').replace(/^["']|["']$/g, '').trim(),
      'openrouter/free',
      'google/gemma-4-31b-it:free',
      'google/gemma-4-26b-a4b-it:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'qwen/qwen-2.5-72b-instruct:free',
      'nvidia/nemotron-3-super-120b-a12b:free',
      'deepseek/deepseek-r1:free',
      'mistralai/mistral-small-24b-instruct-2501:free'
    ];
    const uniqueModels = Array.from(new Set(candidateModels.filter(Boolean)));

    for (const model of uniqueModels) {
      try {
        console.log(`[DMC PDF Parser] Trying OpenRouter model: ${model}`);
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
            messages: [{ role: 'user', content: prompt }]
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
      if (pdfBase64) {
        const base64Data = pdfBase64.split(',')[1] || pdfBase64;
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

  throw new Error('AI parsing service unavailable. No working OpenRouter or Gemini credentials found.');
}

// ─── Deterministic Heuristic Regex Parser (Offline Fallback) ──────────────────

export function parseDmcItineraryFallback(rawText: string, fileName?: string): ParsedDmcPackage {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Detect title
  let detectedTitle = fileName ? fileName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ') : 'Imported DMC Package';
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i];
    if (line.length > 5 && line.length < 80 && !line.startsWith('---') && !line.toLowerCase().includes('page')) {
      detectedTitle = line;
      break;
    }
  }

  // 2. Detect duration (e.g. 5N/6D or 6 Days)
  let daysCount = 4;
  let nightsCount = 3;
  const durationMatch = rawText.match(/(\d+)\s*(?:Nights?|N)\s*[\/&\-]\s*(\d+)\s*(?:Days?|D)/i) ||
                       rawText.match(/(\d+)\s*(?:Days?|D)\s*[\/&\-]\s*(\d+)\s*(?:Nights?|N)/i);

  if (durationMatch) {
    nightsCount = parseInt(durationMatch[1], 10);
    daysCount = parseInt(durationMatch[2], 10);
    if (daysCount < nightsCount) {
      const temp = daysCount;
      daysCount = nightsCount;
      nightsCount = temp;
    }
  } else {
    const singleDayMatch = rawText.match(/(\d+)\s*(?:Days?|D)/i);
    if (singleDayMatch) {
      daysCount = parseInt(singleDayMatch[1], 10);
      nightsCount = Math.max(1, daysCount - 1);
    }
  }

  // 3. Detect Destination
  const commonDestinations = ['Kashmir', 'Ladakh', 'Himachal', 'Goa', 'Kerala', 'Dubai', 'Bali', 'Thailand', 'Vietnam', 'Singapore', 'Maldives', 'Sikkim', 'Andaman', 'Rajasthan', 'Uttarakhand'];
  let detectedDestination = 'Custom Tour';
  for (const dest of commonDestinations) {
    if (new RegExp(`\\b${dest}\\b`, 'i').test(rawText)) {
      detectedDestination = dest;
      break;
    }
  }

  // 4. Extract Day-by-Day blocks
  const dayRegex = /(?:^|\n)(?:Day|DAY|D)\s*([0-9]{1,2})[:\s\-\|]+(.*)/g;
  const daysFound: Array<{ dayNum: number; title: string; startIndex: number }> = [];

  let match;
  while ((match = dayRegex.exec(rawText)) !== null) {
    daysFound.push({
      dayNum: parseInt(match[1], 10),
      title: match[2]?.trim() || `Day ${match[1]} Itinerary`,
      startIndex: match.index
    });
  }

  const daysPlan: ParsedDayPlan[] = [];

  if (daysFound.length > 0) {
    daysFound.forEach((d, idx) => {
      const nextD = daysFound[idx + 1];
      const dayRawText = nextD
        ? rawText.slice(d.startIndex, nextD.startIndex)
        : rawText.slice(d.startIndex, d.startIndex + 3000);

      const dayLines = dayRawText.split('\n').map(l => l.trim()).filter(l => l.length > 4);
      const items: ParsedItineraryItem[] = [];

      // Categorize lines into items
      dayLines.slice(1).forEach((line, lineIdx) => {
        const lower = line.toLowerCase();
        let type: ParsedItineraryItem['type'] = 'activity';

        if (lower.includes('hotel') || lower.includes('check-in') || lower.includes('overnight') || lower.includes('stay at') || lower.includes('resort')) {
          type = 'hotel';
        } else if (lower.includes('drive') || lower.includes('transfer') || lower.includes('airport') || lower.includes('pickup') || lower.includes('drop') || lower.includes('railway')) {
          type = 'transport';
        } else if (lower.includes('guide') || lower.includes('escort')) {
          type = 'guide';
        } else if (lower.includes('note:') || lower.includes('tip:') || lower.includes('important:')) {
          type = 'note';
        }

        // Only add substantial lines
        if (line.length > 15 && items.length < 5) {
          items.push({
            type,
            title: line.split(/[:\-\.]/)[0].trim().slice(0, 70),
            description: line,
            time: lineIdx === 0 ? '10:00 AM' : lineIdx === 1 ? '02:00 PM' : '05:30 PM',
            duration: type === 'transport' ? '1.5 Hours' : '2 Hours',
            cost: 0
          });
        }
      });

      // Ensure at least 1 item per day
      if (items.length === 0) {
        items.push({
          type: 'activity',
          title: d.title || `Day ${d.dayNum} Sightseeing`,
          description: `Full day itinerary as outlined in the package proposal for ${d.title}.`,
          time: '10:00 AM',
          duration: '3 Hours',
          cost: 0
        });
      }

      daysPlan.push({
        day: d.dayNum,
        title: d.title,
        notes: `Itinerary as per supplier plan.`,
        items
      });
    });
  } else {
    // Fallback if no "Day X" markers were found
    for (let d = 1; d <= daysCount; d++) {
      daysPlan.push({
        day: d,
        title: `Day ${d}: Tour Program`,
        items: [
          {
            type: d === 1 ? 'transport' : 'activity',
            title: d === 1 ? 'Arrival & Hotel Transfer' : `Day ${d} Sightseeing`,
            description: `Scheduled sightseeing and tour activities as detailed in the uploaded DMC quotation.`,
            time: '10:00 AM',
            duration: '2 Hours',
            cost: 0
          }
        ]
      });
    }
  }

  // 5. Inclusions / Exclusions parsing
  const included: string[] = [];
  const notIncluded: string[] = [];

  const incMatch = rawText.match(/(?:Inclusions?|Package Includes?|Cost Includes?)[\s\S]*?(?:Exclusions?|Package Excludes?|Cost Excludes?|Terms)/i);
  if (incMatch) {
    incMatch[0].split('\n').slice(1).forEach(l => {
      const clean = l.replace(/^[-•*•\d\.\)]\s*/, '').trim();
      if (clean.length > 5 && clean.length < 120 && included.length < 8) included.push(clean);
    });
  }

  const excMatch = rawText.match(/(?:Exclusions?|Package Excludes?|Cost Excludes?)[\s\S]*?(?:Terms|Cancellation|Note|Payment|$)/i);
  if (excMatch) {
    excMatch[0].split('\n').slice(1).forEach(l => {
      const clean = l.replace(/^[-•*•\d\.\)]\s*/, '').trim();
      if (clean.length > 5 && clean.length < 120 && notIncluded.length < 8) notIncluded.push(clean);
    });
  }

  // Defaults if empty
  if (included.length === 0) {
    included.push(
      `0${nightsCount} Nights accommodation as per itinerary`,
      'Daily breakfast & dinner at hotels',
      'Private AC vehicle for transfers and sightseeing',
      'Toll tax, parking, driver allowance and fuel'
    );
  }

  if (notIncluded.length === 0) {
    notIncluded.push(
      'Airfare / Train tickets',
      'Lunches and personal dining',
      'Monument entry tickets, pony rides and camera fees',
      'Any personal expenses, tips or laundry'
    );
  }

  return {
    title: detectedTitle,
    destination: detectedDestination,
    days: Math.max(daysCount, daysPlan.length),
    nights: nightsCount,
    included,
    notIncluded,
    termsAndConditions: 'Standard supplier terms and conditions apply.',
    daysPlan,
    source: 'heuristic',
    modelUsed: 'Deterministic Heuristic Fallback Engine',
    rawTextPreview: rawText.slice(0, 1000)
  };
}

// ─── Main Public Ingestion Function ───────────────────────────────────────────

export async function parseDmcItinerary(
  file: File,
  onProgress?: (status: string) => void
): Promise<ParsedDmcPackage> {
  onProgress?.('Extracting text and structure from PDF document...');

  // 1. Extract plain text directly in the browser
  const extractedData = await extractTextFromPdf(file);
  console.log(`[DMC PDF Parser] Extracted ${extractedData.pageCount} pages, total chars: ${extractedData.text.length}`);

  if (!extractedData.text || extractedData.text.trim().length < 30) {
    throw new Error('Could not extract readable text from this PDF. It may be a scanned image-only PDF.');
  }

  onProgress?.('Analyzing itinerary structure with AI...');

  // 2. Try AI parsing with multi-model fallback queue
  try {
    const prompt = buildPdfPrompt(extractedData.text);
    let pdfBase64: string | undefined;

    // Optional base64 for small files (under 4MB) for Gemini multimodal fallback
    if (file.size < 4 * 1024 * 1024) {
      try {
        pdfBase64 = await fileToBase64(file);
      } catch {}
    }

    const { text: aiResponseText, modelUsed } = await callAiWithPrompt(prompt, pdfBase64);
    onProgress?.('Structuring days, hotels, activities & inclusions...');

    const parsedJson = robustParseJson(aiResponseText);

    if (parsedJson && parsedJson.daysPlan && Array.isArray(parsedJson.daysPlan) && parsedJson.daysPlan.length > 0) {
      return {
        title: parsedJson.title || file.name.replace(/\.pdf$/i, ''),
        destination: parsedJson.destination || 'Custom Tour',
        days: Number(parsedJson.days) || parsedJson.daysPlan.length,
        nights: Number(parsedJson.nights) || Math.max(1, (Number(parsedJson.days) || parsedJson.daysPlan.length) - 1),
        destinationsList: Array.isArray(parsedJson.destinationsList) ? parsedJson.destinationsList : undefined,
        included: Array.isArray(parsedJson.included) ? parsedJson.included : [],
        notIncluded: Array.isArray(parsedJson.notIncluded) ? parsedJson.notIncluded : [],
        termsAndConditions: parsedJson.termsAndConditions || '',
        faqs: Array.isArray(parsedJson.faqs) ? parsedJson.faqs : undefined,
        daysPlan: parsedJson.daysPlan,
        source: 'ai',
        modelUsed,
        rawTextPreview: extractedData.text.slice(0, 1500)
      };
    }

    console.warn('[DMC PDF Parser] AI returned non-standard JSON schema, trying fallback parser...');
  } catch (aiErr: any) {
    console.warn('[DMC PDF Parser] AI parsing error:', aiErr?.message || aiErr);
  }

  // 3. Fallback to deterministic heuristic parser if AI fails or returned invalid structure
  onProgress?.('Applying smart deterministic heuristic extractor...');
  return parseDmcItineraryFallback(extractedData.text, file.name);
}
