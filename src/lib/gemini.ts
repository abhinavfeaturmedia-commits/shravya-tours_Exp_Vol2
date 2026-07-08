
import { GoogleGenerativeAI } from "@google/generative-ai";
import { api } from "./api";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;
if (API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
} else {
    console.error("Gemini API Key is missing in .env.local");
}

// Helper to fetch OpenRouter settings from DB
const getOpenRouterConfig = async () => {
    try {
        const res = await api.getSettings();
        const data = res?.data || [];
        const config = {
            enabled: false,
            apiKey: '',
            defaultModel: 'google/gemini-2.5-flash'
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
            defaultModel: 'google/gemini-2.5-flash'
        };
    }
};

// Generic helper to get completion from OpenRouter or direct Gemini fallback
const getAIResponse = async (prompt: string, imageBase64?: string) => {
    const config = await getOpenRouterConfig();

    if (config.enabled && config.apiKey) {
        // Strip quotes around model name if present
        let configModel = (config.defaultModel || 'meta-llama/llama-3.3-70b-instruct:free')
            .replace(/^["']|["']$/g, '');

        if (configModel === 'openrouter/free') {
            configModel = 'meta-llama/llama-3.3-70b-instruct:free';
        }

        // prioritized list of free fallback models
        const modelsToTry = [
            configModel,
            'meta-llama/llama-3.3-70b-instruct:free',
            'meta-llama/llama-3.2-3b-instruct:free',
            'nvidia/nemotron-nano-9b-v2:free'
        ];

        // Deduplicate while maintaining prioritization order
        const uniqueModels = Array.from(new Set(modelsToTry));

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
            } catch (err) {
                console.warn(`[AI] OpenRouter call failed with model ${model}:`, err);
                lastError = err;
            }
        }
        throw lastError || new Error("All OpenRouter models in the fallback queue failed.");
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

const robustParseJson = (text: string): any => {
    // Remove markdown code fences if present
    let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();

    // Find the first occurrence of '{' or '[' and the last occurrence of '}' or ']'
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

    return JSON.parse(clean);
};

export const generateItinerary = async (destination: string, days: number, travelers: string, startDate: string) => {
    const prompt = `
    You are an expert travel planner for SHRAWELLO Travel Hub.
    Create a detailed ${days}-day itinerary for a trip to ${destination} for ${travelers}.
    The trip starts on ${startDate}.

    Return ONLY a JSON object with the following structure (no markdown, no extra text):
    {
      "title": "A catchy title for the trip",
      "days": [
        {
          "day": 1,
          "title": "Short title for the day (e.g. Arrival & Relax)",
          "activities": [
             {
               "time": "10:00 AM",
               "description": "Activity detail...",
               "cost": 0,
               "type": "activity" 
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


