
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;
if (API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
} else {
    console.error("Gemini API Key is missing in .env.local");
}

export const generateItinerary = async (destination: string, days: number, travelers: string, startDate: string) => {
    if (!genAI) {
        throw new Error("Gemini API Key is missing. Please add VITE_GEMINI_API_KEY to your .env file.");
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Using latest 2.5 flash model

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
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up potential markdown code blocks if the model puts them
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(cleanJson);
    } catch (error) {
        console.error("Gemini Generation Error:", error);
        throw error;
    }
};

export const analyzeLead = async (lead: any) => {
    if (!genAI) throw new Error("API Key Missing");

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error("Lead Analysis Failed", e);
        throw e;
    }
};

export const generateMarketingContent = async (topic: string, platform: 'Email' | 'WhatsApp' | 'Instagram', tone: string) => {
    if (!genAI) throw new Error("API Key Missing");

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error("Marketing Gen Failed", e);
        throw e;
    }
};
export const parseInvoice = async (imageBase64: string) => {
    if (!genAI) throw new Error("API Key Missing");

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
        // Handle base64 string (strip header if present)
        const base64Data = imageBase64.split(',')[1] || imageBase64;

        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: "image/jpeg"
            }
        };

        const result = await model.generateContent([prompt, imagePart]);
        const text = result.response.text();
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error("Invoice Parsing Failed", e);
        throw e;
    }
 };
 
export const generateWeeklyStandupSummary = async (logs: any[], staffNamesMap: Record<number, string>) => {
    if (!genAI) throw new Error("API Key Missing");

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (e) {
        console.error("Weekly Standup Summary Generation Failed", e);
        throw e;
    }
};

