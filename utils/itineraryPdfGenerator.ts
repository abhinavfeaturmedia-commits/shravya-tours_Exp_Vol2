import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MasterLocation, MasterMealPlan, MasterRoomType } from '../types';

export interface ItineraryPdfParams {
    tripDetails: any;
    items: any[];
    grandTotal: number;
    finalPrice: number;
    guestCount: number;
    pricePerPax: number;
    accommodations: any[];
    transports: any[];
    destinationName: string;
    masterLocations?: MasterLocation[];
    masterMealPlans?: MasterMealPlan[];
    masterRoomTypes?: MasterRoomType[];
    getMealPlanShortName?: (code?: string) => string;
    getRoomTypeName?: (id?: string) => string;
    itineraryList: { day: number; title: string; desc: string; items: any[] }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// LUXURY DESIGN SYSTEM TOKENS (ABERCROMBIE & KENT / BELMOND INSPIRED)
// ─────────────────────────────────────────────────────────────────────────────
const THEME = {
    obsidian: [15, 23, 42] as [number, number, number],        // Deep Slate-900
    slateDark: [30, 41, 59] as [number, number, number],       // Slate-800
    slateMedium: [71, 85, 105] as [number, number, number],    // Slate-600
    slateLight: [148, 163, 184] as [number, number, number],   // Slate-400
    borderLight: [226, 232, 240] as [number, number, number],  // Slate-200
    cardBg: [248, 250, 252] as [number, number, number],       // Off-White / Slate-50
    gold: [197, 160, 89] as [number, number, number],          // Champagne Gold (#C5A059)
    goldDark: [161, 124, 46] as [number, number, number],      // Deep Ochre (#A17C2E)
    goldBg: [253, 250, 243] as [number, number, number],       // Warm Champagne Tint (#FDFBF3)
    goldBorder: [238, 224, 196] as [number, number, number],   // Delicate Gold Border
    emerald: [16, 149, 106] as [number, number, number],       // Emerald Green (#10956A)
    emeraldBg: [240, 253, 244] as [number, number, number],    // Emerald-50
    rose: [225, 29, 72] as [number, number, number],           // Rose Red (#E11D48)
    roseBg: [255, 241, 242] as [number, number, number],       // Rose-50
};

export const generateLuxuryItineraryPDF = async ({
    tripDetails,
    items,
    finalPrice,
    guestCount,
    pricePerPax,
    accommodations,
    transports,
    destinationName,
    masterLocations,
    getMealPlanShortName = (c) => c || 'Breakfast Included',
    getRoomTypeName = (id) => id || 'Deluxe Room',
    itineraryList
}: ItineraryPdfParams) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentW = pageW - (margin * 2); // 182mm

    // Helper to asynchronously load image as Base64 data URL with HTTP & MIME validation
    const loadImageBase64 = (url: string): Promise<string | null> => {
        return new Promise((resolve) => {
            if (!url) { resolve(null); return; }
            const xhr = new XMLHttpRequest();
            xhr.onload = function () {
                if (xhr.status >= 200 && xhr.status < 300 && xhr.response && xhr.response.size > 200) {
                    const reader = new FileReader();
                    reader.onloadend = function () {
                        const res = reader.result as string;
                        if (res && !res.startsWith('data:text/html')) {
                            resolve(res);
                        } else {
                            resolve(null);
                        }
                    };
                    reader.readAsDataURL(xhr.response);
                } else {
                    resolve(null);
                }
            };
            xhr.onerror = function () {
                resolve(null);
            };
            xhr.open('GET', url);
            xhr.responseType = 'blob';
            xhr.send();
        });
    };

    // Helper to convert ArrayBuffer to Base64 in fast 8KB chunks
    const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        const chunkSize = 8192;
        for (let i = 0; i < len; i += chunkSize) {
            const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
            binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
        }
        return window.btoa(binary);
    };

    const loadBinaryBase64 = async (url: string): Promise<string | null> => {
        try {
            const res = await fetch(url);
            if (!res.ok) return null;
            const buf = await res.arrayBuffer();
            return arrayBufferToBase64(buf);
        } catch {
            return null;
        }
    };

    // Load official PDF assets & Google Sans fonts in parallel
    const [
        logoBase64,
        circuitBannerBase64,
        bankQrBase64,
        fontRegularBase64,
        fontBoldBase64,
        fontMediumBase64
    ] = await Promise.all([
        loadImageBase64('/pdf_assets/shrawello_logo.jpg').catch(() => null),
        loadImageBase64('/pdf_assets/circuit_banner.jpg').catch(() => null),
        loadImageBase64('/pdf_assets/bank_qr.jpg').catch(() => null),
        loadBinaryBase64('/fonts/GoogleSans-Regular.ttf').catch(() => null),
        loadBinaryBase64('/fonts/GoogleSans-Bold.ttf').catch(() => null),
        loadBinaryBase64('/fonts/GoogleSans-Medium.ttf').catch(() => null),
    ]);

    // Register Google Sans TTF fonts in jsPDF Virtual File System (VFS)
    if (fontRegularBase64) {
        try {
            doc.addFileToVFS('GoogleSans-Regular.ttf', fontRegularBase64);
            doc.addFont('GoogleSans-Regular.ttf', 'GoogleSans', 'normal');
        } catch (e) {
            console.warn('Failed to register GoogleSans-Regular:', e);
        }
    }
    if (fontBoldBase64) {
        try {
            doc.addFileToVFS('GoogleSans-Bold.ttf', fontBoldBase64);
            doc.addFont('GoogleSans-Bold.ttf', 'GoogleSans', 'bold');
        } catch (e) {
            console.warn('Failed to register GoogleSans-Bold:', e);
        }
    }
    if (fontMediumBase64) {
        try {
            doc.addFileToVFS('GoogleSans-Medium.ttf', fontMediumBase64);
            doc.addFont('GoogleSans-Medium.ttf', 'GoogleSans', 'medium');
        } catch (e) {
            console.warn('Failed to register GoogleSans-Medium:', e);
        }
    }

    const activeFont = (fontRegularBase64 || fontBoldBase64) ? 'GoogleSans' : 'helvetica';

    // ─────────────────────────────────────────────────────────────────────────
    // ADVANCED TEXT SANITIZER & NORMALIZER
    // ─────────────────────────────────────────────────────────────────────────
    const cleanText = (str: string): string => {
        if (!str) return '';
        return str
            .replace(/₹/g, 'Rs. ')
            .replace(/[✓✔]/g, '')
            .replace(/[✗✘]/g, '')
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2013\u2014]/g, '-')
            .replace(/[^\x20-\x7E\t\n\r]/g, '')
            // Fix double or nested parentheses e.g. ((Capacity: 6 Seats)) -> (6-Seater AC SUV)
            .replace(/\(\s*SUV\s*\(\s*Capacity:\s*([0-9]+)\s*Seats?\s*\)\s*\)/i, '($1-Seater AC SUV)')
            .replace(/\(\s*Capacity:\s*([0-9]+)\s*Seats?\s*\)/i, '($1-Seater AC Vehicle)')
            .replace(/\(\s*\((.*?)\)\s*\)/g, '($1)')
            .replace(/\(\s*\(/g, '(')
            .replace(/\)\s*\)/g, ')')
            // Fix common typos in destination names
            .replace(/\bTrambakeshwar\b/gi, 'Trimbakeshwar')
            .replace(/\bBhimashanker\b/gi, 'Bhimashankar')
            .replace(/\bGrishneshwar\b/gi, 'Grishneshwar')
            .replace(/\s+/g, ' ')
            .trim();
    };

    // Clean proposal / trip title (strips database suffixes like _5N-6D, 5N-6D, 5N/6D, etc.)
    const cleanTitle = (str: string): string => {
        if (!str) return '';
        return cleanText(str)
            .replace(/[_\s]*[0-9]+[ND][\s/-]*[0-9]+[ND]/gi, '')
            .replace(/_[0-9]+[A-Za-z0-9_-]*/g, '')
            .replace(/_/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    };

    // Pricing calculation & psychology metrics
    const perPaxAmount = pricePerPax || Math.round(finalPrice / Math.max(1, guestCount));
    const perDayAmount = Math.round(perPaxAmount / Math.max(1, tripDetails.days || 1));

    // Distinct destination names resolver
    const destinationNames: string[] = (tripDetails.destinations && tripDetails.destinations.length > 0)
        ? tripDetails.destinations
            .map((d: any) => masterLocations?.find(l => String(l.id) === String(d.locationId))?.name || d.locationId)
            .filter(Boolean)
        : [destinationName].filter(Boolean);

    const routeString = destinationNames.length > 0
        ? destinationNames.map(cleanText).join(' - ')
        : cleanTitle(tripDetails.title || 'Curated Holiday Circuit');

    const roomsCount = tripDetails.roomsCount || Math.max(1, Math.ceil((tripDetails.adults || 2) / 2));

    // Comprehensive contextual circuit category detection
    const fullSearchText = `${tripDetails.title || ''} ${destinationName || ''} ${destinationNames.join(' ')} ${tripDetails.destination || ''}`.toLowerCase();

    const isInternational = /kazakhstan|almaty|astana|dubai|uae|thailand|bangkok|phuket|bali|indonesia|singapore|malaysia|vietnam|baku|azerbaijan|georgia|tbilisi|turkey|istanbul|europe|paris|switzerland|london|maldives|sri lanka|mauritius/i.test(fullSearchText);

    const isPilgrimage = !isInternational && (
        destinationNames.some(d => /shirdi|bhimashankar|trimbak|grishneshwar|ellora|varanasi|kashi|prayagraj|chitrakoot|ayodhya|tirupati|rameshwaram|madurai|puri|jagannath|haridwar|rishikesh|kedarnath|badrinath|char dham|dwarka|somnath|amritsar|golden temple|vaishno devi|ujjain|mahakaleshwar|omkareshwar/i.test(d))
        || /jyotirlinga|darshan|temple|pilgrimage|sacred|divine|dham|yatra/i.test(tripDetails.title || '')
    );

    const isMaharashtra = isPilgrimage && (
        destinationNames.some(d => /shirdi|bhimashankar|trimbak|grishneshwar|ellora|ajanta|mumbai|pune|nashik|aurangabad/i.test(d))
        || /maharashtra|jyotirlinga/i.test(tripDetails.title || '')
    );

    const isVaranasi = isPilgrimage && (
        destinationNames.some(d => /varanasi|kashi|prayagraj|chitrakoot|ayodhya/i.test(d))
        || /varanasi|kashi|ayodhya/i.test(tripDetails.title || '')
    );

    // Resolve transportation fleet intelligently (separate true vehicles from transfer activities)
    const transportList = items.filter(i => i.type === 'transport' || i.type === 'flight');
    const isTransferActivity = (str: string) => /transfer|pickup|drop|drive to|return drive|lunch break|lunch stop|excursion to|walking tour/i.test(str);
    
    // Check if any item specifies vehicle in transportDetails
    const explicitVehicles = transportList
        .map(t => t.transportDetails?.vehicleType)
        .filter(Boolean)
        .map(cleanText);

    // Or search titles for actual vehicle brand / category names
    const vehicleMatches = transportList
        .map(t => {
            const m = (t.title || '').match(/\b(sedan|suv|innova\s*crysta|innova|ertiga|tempo\s*traveller|coach|mini\s*bus|swift\s*dzire|etios|hycross|luxury\s*van|private\s*ac\s*vehicle)\b/i);
            return m ? cleanText(m[0]) : null;
        })
        .filter(Boolean) as string[];

    let primaryFleetTitle = 'Dedicated Private AC Vehicle';
    if (explicitVehicles.length > 0) {
        primaryFleetTitle = explicitVehicles[0];
    } else if (vehicleMatches.length > 0) {
        const vName = vehicleMatches[0].toLowerCase();
        primaryFleetTitle = `Dedicated Private AC ${vName.charAt(0).toUpperCase() + vName.slice(1)}`;
    } else {
        const nonTransferVehicles = Array.from(new Set(transportList.map(t => cleanText(t.title)).filter(t => !isTransferActivity(t))));
        if (nonTransferVehicles.length > 0) {
            primaryFleetTitle = nonTransferVehicles[0];
        } else if (guestCount <= 3) {
            primaryFleetTitle = 'Dedicated Private AC Sedan (Comfort 4-Seater)';
        } else if (guestCount <= 6) {
            primaryFleetTitle = 'Dedicated Private AC SUV / Innova Crysta (6-7 Seater)';
        } else {
            primaryFleetTitle = 'Dedicated Private AC Tempo Traveller / Luxury Coach';
        }
    }

    const vehicleSummary = primaryFleetTitle;

    // ─────────────────────────────────────────────────────────────────────────
    // EXECUTIVE LUXURY HEADER & FOOTER DECORATOR
    // Replaces irrelevant stock world panorama with high-prestige reference bar
    // ─────────────────────────────────────────────────────────────────────────
    const drawPageDecorations = (docInstance: jsPDF) => {
        // Left: Official Logo
        if (logoBase64) {
            try {
                docInstance.addImage(logoBase64, 'JPEG', margin, 4, 34, 9, undefined, 'FAST');
            } catch {
                docInstance.setFont(activeFont, 'bold');
                docInstance.setFontSize(10.5);
                docInstance.setTextColor(...THEME.obsidian);
                docInstance.text("SHRAWELLO TravelHub", margin, 9);
                docInstance.setFontSize(5.5);
                docInstance.setTextColor(...THEME.slateMedium);
                docInstance.text("- BESPOKE HOLIDAYS & CURATED EXPERIENCES -", margin, 12);
            }
        } else {
            docInstance.setFont(activeFont, 'bold');
            docInstance.setFontSize(10.5);
            docInstance.setTextColor(...THEME.obsidian);
            docInstance.text("SHRAWELLO TravelHub", margin, 9);
            docInstance.setFontSize(5.5);
            docInstance.setTextColor(...THEME.slateMedium);
            docInstance.text("- BESPOKE HOLIDAYS & CURATED EXPERIENCES -", margin, 12);
        }

        // Top-Right: Executive Reference Bar (Luxury Brand Typography)
        docInstance.setFont(activeFont, 'bold');
        docInstance.setFontSize(6.8);
        docInstance.setTextColor(...THEME.goldDark);
        docInstance.text("BESPOKE LUXURY ITINERARY PORTFOLIO", pageW - margin, 7.5, { align: 'right' });

        docInstance.setFont(activeFont, 'normal');
        docInstance.setFontSize(5.8);
        docInstance.setTextColor(...THEME.slateMedium);
        const refCode = tripDetails.id ? `REF: #SHR-${String(tripDetails.id).slice(-6).toUpperCase()}` : `DATE: ${new Date().toLocaleDateString('en-GB')}`;
        docInstance.text(`${refCode}  |  OFFICIAL CONFIDENTIAL PROPOSAL`, pageW - margin, 11.5, { align: 'right' });

        // Dual Accent Hairline Divider: Gold strip + hairline slate
        docInstance.setFillColor(...THEME.gold);
        docInstance.rect(margin, 14.0, 38, 0.6, 'F');

        docInstance.setDrawColor(...THEME.borderLight);
        docInstance.setLineWidth(0.2);
        docInstance.line(margin + 38, 14.3, pageW - margin, 14.3);

        // Footer hairline divider
        docInstance.setDrawColor(...THEME.borderLight);
        docInstance.setLineWidth(0.2);
        docInstance.line(margin, pageH - 11, pageW - margin, pageH - 11);

        // Footer running contact line
        docInstance.setFont(activeFont, 'normal');
        docInstance.setFontSize(6.5);
        docInstance.setTextColor(...THEME.slateMedium);
        docInstance.text("Shrawello Travel Hub & Events LLP  |  hello@shrawello.com  |  Customer Care: +91 94234 15764  |  shrawello.com", margin, pageH - 7.5);

        // Copyright & confidentiality line
        docInstance.setFontSize(5.4);
        docInstance.setTextColor(...THEME.slateLight);
        docInstance.text("(c) 2026 Shrawello Travel Hub & Events LLP. Confidential bespoke document prepared exclusively for client.", margin, pageH - 4.5);
    };

    // =========================================================================
    // PAGE 1: EXECUTIVE BRIEFING, DYNAMIC HERO, BENTO SNAPSHOT, HOTELS & FLEET
    // =========================================================================
    drawPageDecorations(doc);
    let y = 18.5;

    // Prepared Exclusively for Client
    doc.setFont(activeFont, 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(...THEME.goldDark);
    doc.text("PREPARED EXCLUSIVELY FOR:", margin, y);

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...THEME.obsidian);
    doc.text(cleanText(tripDetails.clientName || 'Valued Client'), margin, y + 4.8);

    // Personalized Welcome Statement (Cleaned of any trailing 5N-6D database suffixes)
    doc.setFont(activeFont, 'normal');
    doc.setFontSize(6.7);
    doc.setTextColor(...THEME.slateDark);
    const cleanProposalTitle = cleanTitle(tripDetails.title || 'Tour');
    const welcomeText = `Thank you for choosing Shrawello Travel Hub & Events LLP as your bespoke travel partner for "${cleanProposalTitle}". We are delighted to share your tailored itinerary quotation, curated stays, private dedicated mobility, and day-wise experience storybook below.`;
    const wrappedWelcome = doc.splitTextToSize(welcomeText, contentW);
    doc.text(wrappedWelcome, margin, y + 9.5);

    y += 10.5 + (wrappedWelcome.length * 3.1);

    // ── EXECUTIVE HERO BANNER CARD (Deep Obsidian & Champagne Gold) ──
    const cardH = 22;
    doc.setFillColor(...THEME.obsidian);
    doc.roundedRect(margin, y, contentW, cardH, 1.5, 1.5, 'F');

    // Left Pure Gold Accent Bar
    doc.setFillColor(...THEME.gold);
    doc.rect(margin, y, 2.5, cardH, 'F');

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...THEME.gold);
    const heroTagline = isPilgrimage
        ? "✦ SACRED PILGRIMAGE, HERITAGE & SPIRITUAL AWAKENING"
        : isInternational
            ? "✦ BESPOKE INTERNATIONAL EXPEDITION & SIGNATURE DISCOVERY"
            : "✦ CURATED LUXURY ESCAPE & BESPOKE TRAVEL STORYBOOK";
    doc.text(heroTagline, margin + 6, y + 5.2);

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(9.6);
    doc.setTextColor(255, 255, 255);
    doc.text(cleanTitle(routeString).toUpperCase(), margin + 6, y + 11.2);

    doc.setFont(activeFont, 'normal');
    doc.setFontSize(6.4);
    doc.setTextColor(203, 213, 225); // Slate-300
    doc.text(`Handpicked Stays  •  Dedicated Private Fleet  •  ${getMealPlanShortName(tripDetails.mealPlanCode)}  •  ${guestCount} Guests  •  ${tripDetails.nights} Nights / ${tripDetails.days} Days`, margin + 6, y + 17);

    y += cardH + 4.5;

    // ── BENTO GRID: 4-POINT EXECUTIVE SNAPSHOT CARDS (HIGHLIGHTS PER-PERSON VALUE) ──
    const bentoW = (contentW - 6) / 4;
    const bentoH = 18.0;

    const bentoMetrics = [
        { label: 'DURATION', val: `${tripDetails.nights}N / ${tripDetails.days}D`, sub: `${tripDetails.days} Days Total`, col: THEME.obsidian },
        { label: 'TRAVEL PARTY', val: `${guestCount} Guests`, sub: `${tripDetails.adults || 2} Adults${tripDetails.children ? `, ${tripDetails.children} Kids` : ''}`, col: THEME.obsidian },
        { label: 'MEAL PLAN', val: tripDetails.mealPlanCode || 'CP Plan', sub: getMealPlanShortName(tripDetails.mealPlanCode), col: THEME.obsidian },
        // HIGHLIGHT PER-PERSON PRICE AS HERO (USER MANDATE)
        { label: 'PER GUEST INVESTMENT', val: `Rs. ${perPaxAmount.toLocaleString('en-IN')}`, sub: `Total: Rs. ${Math.round(finalPrice).toLocaleString('en-IN')} (${guestCount}G)`, col: THEME.goldDark },
    ];

    bentoMetrics.forEach((m, idx) => {
        const bx = margin + (idx * (bentoW + 2));
        doc.setFillColor(...THEME.cardBg);
        doc.setDrawColor(...THEME.borderLight);
        doc.setLineWidth(0.3);
        doc.roundedRect(bx, y, bentoW, bentoH, 1.2, 1.2, 'FD');

        // Champagne Gold Top Accent Strip for all cards
        doc.setFillColor(...THEME.gold);
        doc.rect(bx, y, bentoW, 1.2, 'F');

        doc.setFont(activeFont, 'bold');
        doc.setFontSize(5.6);
        doc.setTextColor(...THEME.slateLight);
        doc.text(m.label, bx + 3.2, y + 4.8);

        doc.setFont(activeFont, 'bold');
        doc.setFontSize(8.4);
        doc.setTextColor(m.col[0], m.col[1], m.col[2]);
        doc.text(m.val, bx + 3.2, y + 10.4);

        doc.setFont(activeFont, 'normal');
        doc.setFontSize(5.4);
        doc.setTextColor(...THEME.slateMedium);
        doc.text(m.sub, bx + 3.2, y + 14.8);
    });

    y += bentoH + 5;

    // ── TABLE 1: CURATED ACCOMMODATION PLAN ──
    doc.setFont(activeFont, 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(...THEME.obsidian);
    doc.text("Curated Accommodation Plan:", margin, y);
    y += 2.8;

    const validHotels = accommodations.filter(a => {
        const title = (a.title || '').toLowerCase();
        return !/^(breakfast|lunch|dinner|meal|check-out|early breakfast)/i.test(title) && !title.includes('drop-off');
    });

    const hotelRows: string[][] = [];
    if (tripDetails.destinations && tripDetails.destinations.length > 0) {
        let currentDayCounter = 1;
        tripDetails.destinations.forEach((leg: any, legIdx: number) => {
            const locName = masterLocations?.find(l => String(l.id) === String(leg.locationId))?.name || leg.locationId;
            const legHotel = validHotels.find(i => i.day === currentDayCounter)
                || validHotels.find(i => cleanText(i.title).toLowerCase().includes(cleanText(locName).toLowerCase()))
                || validHotels[legIdx]
                || null;
            const hotelTitle = legHotel ? `${cleanText(legHotel.title).replace(/^Check-in\s*(?:at|to)\s*/i, '')} / Similar` : `3/4-Star Deluxe Hotel / Similar`;
            const roomTypeDesc = legHotel?.roomTypeId ? getRoomTypeName(legHotel.roomTypeId) : 'Deluxe Rooms';
            hotelRows.push([
                cleanText(locName),
                `${leg.nights} Night${leg.nights > 1 ? 's' : ''}`,
                hotelTitle,
                `${roomsCount} ${roomTypeDesc} (${tripDetails.roomSharing || 'Double'} Sharing)`
            ]);
            currentDayCounter += leg.nights || 1;
        });
    } else if (validHotels.length > 0) {
        const uniqueHotels = Array.from(new Set(validHotels.map(h => cleanText(h.title).replace(/^Check-in\s*(?:at|to)\s*/i, ''))));
        uniqueHotels.forEach(hTitle => {
            hotelRows.push([
                cleanText(destinationName),
                `${tripDetails.nights} Nights`,
                `${hTitle} / Similar`,
                `${roomsCount} Deluxe Rooms (${tripDetails.roomSharing || 'Double'} Sharing)`
            ]);
        });
    } else {
        hotelRows.push([
            cleanText(destinationName),
            `${tripDetails.nights} Nights`,
            `Handpicked 3/4-Star Hotel / Similar`,
            `${roomsCount} Deluxe Rooms (${tripDetails.roomSharing || 'Double'} Sharing)`
        ]);
    }

    autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        theme: 'grid',
        pageBreak: 'avoid',
        head: [['Destination / City', 'Duration', 'Curated Hotel / Property', 'Rooms Allocated']],
        body: hotelRows,
        styles: { fontSize: 6.8, font: activeFont, textColor: [30, 41, 59], cellPadding: 2.8, lineColor: [226, 232, 240], lineWidth: 0.2 },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], font: activeFont, fontStyle: 'bold', fontSize: 7.0, cellPadding: 2.8 },
        columnStyles: {
            0: { cellWidth: 42, font: activeFont, fontStyle: 'bold', textColor: [15, 23, 42] },
            1: { cellWidth: 22, halign: 'center' },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 52, halign: 'center' }
        }
    });

    y = (doc as any).lastAutoTable.finalY + 5;

    // ── TABLE 2: DEDICATED PRIVATE FLEET & MOBILITY (ATOMIC BUDGET CHECK PREVENTS ORPHAN HEADERS) ──
    const vehicleRows: string[][] = [
        [
            '1',
            `${primaryFleetTitle} (${guestCount <= 3 ? 'Max 3-4 Pax + Luggage' : guestCount <= 6 ? 'Max 6 Pax + Luggage' : 'Group Coach'})`,
            `${tripDetails.days} Days`,
            `${cleanTitle(routeString)} - Complete airport pickups, drops, excursion transfers, highway tolls, parking & chauffeur allowance included.`
        ]
    ];

    const hasLuggageVan = transportList.some(t => /luggage/i.test(t.title || ''));
    if (hasLuggageVan) {
        vehicleRows.push([
            '2',
            'Dedicated Luggage Support Vehicle',
            'As Scheduled',
            'Baggage transfer between airport, hotel & sightseeing points for unencumbered cabin transit.'
        ]);
    }

    const estimatedFleetH = 12 + (vehicleRows.length * 8);
    if (y + estimatedFleetH > pageH - 42) {
        doc.addPage();
        drawPageDecorations(doc);
        y = 19;
    }

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(...THEME.obsidian);
    doc.text("Dedicated Private Fleet & Mobility:", margin, y);
    y += 2.8;

    autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        theme: 'grid',
        pageBreak: 'avoid',
        head: [['Sr.', 'Vehicle Type & Capacity', 'Duration', 'Inclusions & Circuit Route']],
        body: vehicleRows,
        styles: { fontSize: 6.8, font: activeFont, textColor: [30, 41, 59], cellPadding: 2.6, lineColor: [226, 232, 240], lineWidth: 0.2 },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], font: activeFont, fontStyle: 'bold', fontSize: 7.0, cellPadding: 2.6 },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center', font: activeFont, fontStyle: 'bold' },
            1: { cellWidth: 56, font: activeFont, fontStyle: 'bold', textColor: [15, 23, 42] },
            2: { cellWidth: 22, halign: 'center' },
            3: { cellWidth: 'auto' }
        }
    });

    y = (doc as any).lastAutoTable.finalY + 3.5;

    // Vehicle capacity advisory if party > 6
    if (guestCount > 6) {
        doc.setFont(activeFont, 'italic');
        doc.setFontSize(6.2);
        doc.setTextColor(...THEME.goldDark);
        doc.text(`*Note: For your group of ${guestCount} guests, dedicated fleet coordination & luggage escort assistance is managed by Shrawello.`, margin, y);
        y += 4.5;
    }

    // ── EXECUTIVE TOUR HIGHLIGHTS & QUALITY ASSURANCE PILLARS ──
    const highlightBoxH = 32;
    doc.setFillColor(...THEME.cardBg);
    doc.setDrawColor(...THEME.borderLight);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentW, highlightBoxH, 1.2, 1.2, 'FD');

    // Left Pure Gold Accent Bar
    doc.setFillColor(...THEME.gold);
    doc.rect(margin, y, 2.5, highlightBoxH, 'F');

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(...THEME.obsidian);
    doc.text("✦ EXECUTIVE TOUR HIGHLIGHTS & QUALITY ASSURANCE PILLARS:", margin + 6, y + 5.2);

    const pillars = [
        { title: "Handpicked 3/4-Star Stays", desc: `Verified properties with hygienic sanitization & daily ${getMealPlanShortName(tripDetails.mealPlanCode)}.` },
        { title: "Private Dedicated Fleet", desc: "Commercial permit AC vehicle, seasoned circuit chauffeur, 100% tolls, parking & fuel included." },
        {
            title: "Optimized Circuit Flow",
            desc: isPilgrimage
                ? "Paced for spiritual comfort, minimizing highway fatigue with strategic refreshment & queue buffers."
                : "Paced for relaxed discovery, scenic photo stops, comfortable refreshment halts & smooth transitions."
        },
        { title: "24x7 Dedicated Concierge", desc: "Real-time on-ground coordination and direct phone support from your personal Shrawello specialist." }
    ];

    const pilW = (contentW - 16) / 2;
    const pilCardH = 10.5;

    pillars.forEach((p, pIdx) => {
        const row = Math.floor(pIdx / 2);
        const col = pIdx % 2;
        const px = margin + 6 + (col * (pilW + 4));
        const py = y + 8.2 + (row * (pilCardH + 1.8));

        // Sub-card background for visual polish
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...THEME.borderLight);
        doc.setLineWidth(0.2);
        doc.roundedRect(px, py, pilW, pilCardH, 0.8, 0.8, 'FD');

        // Line 1: Bold Title with gold dot
        doc.setFont(activeFont, 'bold');
        doc.setFontSize(6.2);
        doc.setTextColor(...THEME.obsidian);
        doc.text(`• ${p.title}:`, px + 2.5, py + 3.6);

        // Line 2: Indented crisp description wrapped neatly across column width (ZERO COLLISION)
        doc.setFont(activeFont, 'normal');
        doc.setFontSize(5.6);
        doc.setTextColor(...THEME.slateMedium);
        const descWrapped = doc.splitTextToSize(p.desc, pilW - 5);
        doc.text(descWrapped, px + 2.5, py + 7.0);
    });

    y += highlightBoxH + 4.0;

    // Transition Note
    doc.setFont(activeFont, 'italic');
    doc.setFontSize(6.2);
    doc.setTextColor(...THEME.slateLight);
    doc.text("*Please turn to the following pages for the day-wise itinerary storybook, destination guide, and package policies.", margin, y);

    // =========================================================================
    // DAY-WISE RENDERING HELPER (Clean Typography, Collision-Free Heights)
    // =========================================================================
    function renderDayCard(dayObj: { day: number; title: string; desc: string; items: any[] }) {
        // Resolve verified hotel stay for this day (strictly ignoring breakfasts / dining / checkout)
        const dayHotel = (dayObj.items || []).find(i => i.type === 'hotel' && !/breakfast|lunch|dinner|meal|check-out/i.test(i.title || ''));
        const stayCity = dayHotel
            ? cleanText(dayHotel.title).replace(/^Check-in\s*(?:at|to)\s*/i, '').replace(/\s*\/\s*Similar$/i, '')
            : cleanText(destinationNames[Math.min(dayObj.day - 1, destinationNames.length - 1)] || destinationName);

        // Clean day title (strip redundant "DAY 1 - Sunday... : DAY 1...")
        let cleanDayTitle = cleanText(dayObj.title);
        cleanDayTitle = cleanDayTitle.replace(/^DAY\s*0?\d+\s*[-–:]*\s*/i, '').trim();

        // 1. Day Header Banner Pill (Obsidian Slate with Gold Accent)
        doc.setFillColor(...THEME.obsidian);
        doc.roundedRect(margin, y, contentW, 6.8, 1, 1, 'F');

        doc.setFillColor(...THEME.gold);
        doc.rect(margin, y, 2.5, 6.8, 'F');

        doc.setFont(activeFont, 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(255, 255, 255);
        doc.text(`DAY ${String(dayObj.day).padStart(2, '0')}  |  ${cleanDayTitle.toUpperCase()}`, margin + 6, y + 4.7);
        y += 8.8;

        // 2. Parse Timeline Entries directly from structured items (ZERO DUPLICATION)
        const timelineEntries: { time: string; text: string }[] = [];
        const seenTexts = new Set<string>();

        const isRedundantLine = (str: string): boolean => {
            const s = str.toLowerCase().replace(/[-–•*|\s]/g, ' ').trim();
            if (!s || s.length < 3) return true;
            if (/^day\s*0?\d+/i.test(s) || /\bday\s*0?\d+\s*[-–:]+/i.test(s)) return true;
            if (cleanDayTitle && cleanDayTitle.toLowerCase().includes(s)) return true;
            if (/^(overnight\s*stay|places\s*covered|shrawello\s*view|why\s*this\s*works|important\s*plan)/i.test(s)) return true;
            return false;
        };

        if (dayObj.items && dayObj.items.length > 0) {
            dayObj.items.forEach(item => {
                const rawTitle = cleanText(item.title);
                const rawDesc = cleanText(item.description);
                // Skip overnight stays from timeline nodes as they are anchored by the dedicated badge below
                if (item.type === 'hotel' && /overnight|restful night|check-in to/i.test(rawTitle)) return;

                const time = item.time ? cleanText(item.time) : '';
                let displayText = rawTitle;
                if (rawDesc && rawDesc !== rawTitle && !rawDesc.toLowerCase().includes(rawTitle.toLowerCase())) {
                    displayText = `${rawTitle} — ${rawDesc}`;
                } else if (rawDesc && rawDesc.length > rawTitle.length) {
                    displayText = rawDesc;
                }

                if (isRedundantLine(displayText)) return;
                const key = displayText.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (seenTexts.has(key)) return;
                seenTexts.add(key);

                timelineEntries.push({ time, text: displayText });
            });
        }

        // Fallback: If no structured items exist, parse legacy raw description lines
        if (timelineEntries.length === 0 && dayObj.desc) {
            const lines = cleanText(dayObj.desc).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            lines.forEach(rawLine => {
                let line = rawLine.replace(/^[-•*–\s]+/, '').trim();
                const timeMatch = line.match(/^(\d{1,2}:\d{2}\s*(?:AM|PM)?(?:\s*[-–]\s*\d{1,2}:\d{2}\s*(?:AM|PM)?)?)\s*[-–:]*\s*(.*)$/i);
                let time = '';
                let text = line;
                if (timeMatch) {
                    time = timeMatch[1].trim();
                    text = timeMatch[2].trim();
                }
                if (!text || isRedundantLine(text)) return;
                const key = text.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (seenTexts.has(key)) return;
                seenTexts.add(key);
                timelineEntries.push({ time, text });
            });
        }

        // Render Timeline Nodes
        const maxEntriesToRender = Math.min(timelineEntries.length, 6);
        for (let eIdx = 0; eIdx < maxEntriesToRender; eIdx++) {
            const entry = timelineEntries[eIdx];

            // Gold bullet milestone
            doc.setFillColor(...THEME.gold);
            doc.circle(margin + 4.5, y - 0.6, 0.9, 'F');

            if (entry.time) {
                doc.setFont(activeFont, 'bold');
                doc.setFontSize(6.4);
                doc.setTextColor(...THEME.obsidian);
                doc.text(entry.time, margin + 8, y);

                doc.setFont(activeFont, 'normal');
                doc.setFontSize(6.3);
                doc.setTextColor(...THEME.slateDark);
                const wrapped = doc.splitTextToSize(entry.text, contentW - 38);
                doc.text(wrapped, margin + 35, y);
                y += (wrapped.length * 2.8) + 0.8;
            } else {
                doc.setFont(activeFont, 'normal');
                doc.setFontSize(6.3);
                doc.setTextColor(...THEME.slateDark);
                const wrapped = doc.splitTextToSize(entry.text, contentW - 14);
                doc.text(wrapped, margin + 8, y);
                y += (wrapped.length * 2.8) + 0.8;
            }
        }

        if (timelineEntries.length === 0) {
            doc.setFont(activeFont, 'normal');
            doc.setFontSize(6.3);
            doc.setTextColor(...THEME.slateDark);
            doc.text("Arrival, check-in, freshen up and relax. Later proceed for confirmed sightseeing & scheduled activities.", margin + 8, y);
            y += 3.5;
        }

        // 3. Overnight Stay Pill
        doc.setFillColor(...THEME.cardBg);
        doc.setDrawColor(...THEME.borderLight);
        doc.roundedRect(margin + 4, y, contentW - 8, 4.8, 0.8, 0.8, 'FD');

        doc.setFont(activeFont, 'bold');
        doc.setFontSize(5.8);
        doc.setTextColor(...THEME.obsidian);
        doc.text(`🏨 Overnight Stay: ${stayCity}`, margin + 7.5, y + 3.3);

        y += 7.5;
    }

    // Split Days evenly: Page 2 (Days 1 to splitDay) and Page 3 (Days splitDay+1 to end)
    const splitDay = Math.ceil(itineraryList.length / 2);
    const page2Days = itineraryList.slice(0, splitDay);
    const page3Days = itineraryList.slice(splitDay);

    // =========================================================================
    // PAGE 2: DAY-WISE ITINERARY (FIRST HALF) & DESTINATION HIGHLIGHTS
    // =========================================================================
    doc.addPage();
    drawPageDecorations(doc);
    y = 19;

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...THEME.obsidian);
    doc.text("Day-Wise Experience Storybook (Part I)", margin, y);
    y += 4.5;

    page2Days.forEach(dayObj => {
        renderDayCard(dayObj);
    });

    // ── DESTINATION HIGHLIGHTS CARD (DYNAMICALLY ADAPTED) ──
    const heritageH = 32;
    const heritageY = Math.max(y + 3, pageH - 46);

    doc.setFillColor(...THEME.cardBg);
    doc.setDrawColor(...THEME.borderLight);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, heritageY, contentW, heritageH, 1.2, 1.2, 'FD');

    // Left Pure Gold Accent Bar
    doc.setFillColor(...THEME.gold);
    doc.rect(margin, heritageY, 2.5, heritageH, 'F');

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(7.0);
    doc.setTextColor(...THEME.goldDark);

    const highlightsTag = isPilgrimage
        ? "✦ SACRED PILGRIMAGE HIGHLIGHTS & ARCHITECTURAL EXPERIENCES (DAYS 1 - 3):"
        : isInternational
            ? "✦ INTERNATIONAL EXPEDITION HIGHLIGHTS & SIGNATURE EXPERIENCES (DAYS 1 - 3):"
            : "✦ EXECUTIVE LEISURE HIGHLIGHTS & REGIONAL EXPLORATION (DAYS 1 - 3):";
    doc.text(highlightsTag, margin + 6, heritageY + 5.2);

    const heritageHighlights = isMaharashtra ? [
        {
            title: "Bhimashankar Jyotirlinga",
            note: "Nestled in Sahyadri sanctuary. Ancient Nagara architecture, Garbhagriha Swayambhu Linga, and origin of holy river Bhima."
        },
        {
            title: "Ellora Kailasa Temple (Cave 16)",
            note: "World's largest monolithic rock excavation, carved top-down from single basalt rock. UNESCO World Heritage architectural marvel."
        },
        {
            title: "Grishneshwar Jyotirlinga",
            note: "Revered 12th Jyotirlinga restored by Queen Ahilyabai Holkar in red stone with 5-tier Shikhara and intricate temple carvings."
        }
    ] : isInternational ? [
        {
            title: "Alpine & Canyon Landscapes",
            note: "Scenic mountain passes, dramatic river canyons, alpine cable car ascents, and authentic regional cultural bazaars."
        },
        {
            title: "Dedicated Chauffeur & English Guide",
            note: "Sanitized private transport with licensed bilingual driver cum guide ensuring smooth navigation and hassle-free transit."
        },
        {
            title: "Curated Activity Access",
            note: "Pre-arranged cable car / activity entry ticketing and structured scheduling to maximize discovery without queues."
        }
    ] : [
        {
            title: "Curated Regional Heritage",
            note: "Immersive exploration of celebrated landmarks, architectural marvels, and authentic local cultural experiences."
        },
        {
            title: "Dedicated Local Mobility",
            note: "Private sanitized vehicle with seasoned circuit chauffeur for comfortable transit and scenic road journeys."
        },
        {
            title: "Seamless Sightseeing Buffers",
            note: "Relaxed itinerary pacing with built-in refreshment halts and photo stops for a restorative holiday experience."
        }
    ];

    const hColW = (contentW - 18) / 3;
    heritageHighlights.forEach((hh, hhIdx) => {
        const hx = margin + 6 + (hhIdx * (hColW + 4));
        const hy = heritageY + 9.5;

        doc.setFont(activeFont, 'bold');
        doc.setFontSize(6.3);
        doc.setTextColor(...THEME.obsidian);
        doc.text(`• ${hh.title}`, hx, hy);

        doc.setFont(activeFont, 'normal');
        doc.setFontSize(5.6);
        doc.setTextColor(...THEME.slateMedium);
        const wrappedHH = doc.splitTextToSize(hh.note, hColW);
        doc.text(wrappedHH, hx, hy + 3.6);
    });

    // =========================================================================
    // PAGE 3: DAY-WISE ITINERARY (SECOND HALF) & TRAVEL GUIDE
    // =========================================================================
    doc.addPage();
    drawPageDecorations(doc);
    y = 19;

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...THEME.obsidian);
    doc.text("Day-Wise Experience Storybook (Part II)", margin, y);
    y += 4.5;

    page3Days.forEach(dayObj => {
        // Refine day title if it contains all-caps shouting advisories
        let modifiedDay = { ...dayObj };
        if (dayObj.title && /\(THIS DAY NEEDS STRICT TIME MANAGEMENT\.?\)/i.test(dayObj.title)) {
            modifiedDay.title = dayObj.title.replace(/\(THIS DAY NEEDS STRICT TIME MANAGEMENT\.?\)/gi, '').trim();
            if (!modifiedDay.desc) modifiedDay.desc = '';
            modifiedDay.desc += '\nCurator\'s Note: Chauffeur Advisory — Timed departure scheduled with built-in peak-hour traffic safety buffers.';
        }
        renderDayCard(modifiedDay);
    });

    // Short Local Travel Guide (Distance & Transit Matrix)
    doc.setFont(activeFont, 'bold');
    doc.setFontSize(8.0);
    doc.setTextColor(...THEME.obsidian);
    doc.text("Short Local Travel Guide (Distance & Transit Matrix):", margin, y);
    y += 2.5;

    let travelGuideRows: string[][] = [];

    if (isMaharashtra) {
        travelGuideRows = [
            ['Day 1', 'Pune  ->  Bhimashankar Hotel  ->  Darshan & Gupt Bhimashankar', '~115-130 Km', '3-4 Hrs driving + Local sightseeing'],
            ['Day 2', 'Bhimashankar  ->  Ellora Caves & Kailasa Temple  ->  Grishneshwar', '~240-265 Km', '5-6 Hrs driving + Ellora sightseeing'],
            ['Day 3', 'Grishneshwar Darshan  ->  Ajanta Caves (Optional)  ->  Shirdi', '~220-250 Km', '5-6 Hrs driving + Sightseeing'],
            ['Day 4', 'Shirdi Sai Baba Darshan  ->  Nashik Sightseeing  ->  Trimbakeshwar', '~115-135 Km', '3-4 Hrs driving + Temple darshan'],
            ['Day 5', 'Trimbakeshwar Darshan  ->  Mumbai Hotel  ->  City Sightseeing', '~175-195 Km', '4-5 Hrs driving + City leisure'],
            ['Day 6', 'Mumbai Hotel  ->  Siddhivinayak Darshan  ->  Railway Station / Airport Drop', '~35-50 Km', 'Local transfer + Departure buffer'],
            ['Total', 'Complete Maharashtra Jyotirlinga & Heritage Circuit', '~900-1025 Km', `${tripDetails.days} Days / ${tripDetails.nights} Nights`]
        ];
    } else if (isVaranasi) {
        travelGuideRows = [
            ['Day 1', `${destinationNames[0] || 'Varanasi'} Airport  ->  Hotel  ->  Local Darshan & Sightseeing`, '~40-50 Km', 'Local sightseeing / 3-4 Hrs excluding darshan'],
            ['Day 2', `${destinationNames[0] || 'Varanasi'} Local Sightseeing  ->  Sarnath  ->  Hotel`, '~55-70 Km', 'Full Day Local Sightseeing'],
            ['Day 3', `${destinationNames[0] || 'Varanasi'}  ->  ${destinationNames[1] || 'Prayagraj'} Local Sightseeing & Sangam`, '~145-165 Km', '4-5 Hrs driving excluding sightseeing/darshan'],
            ['Day 4', `${destinationNames[1] || 'Prayagraj'}  ->  Chitrakoot Sightseeing  ->  ${destinationNames[2] || 'Ayodhya'}`, '~410-440 Km', '9-11 Hrs driving excluding sightseeing'],
            ['Day 5', `${destinationNames[2] || 'Ayodhya'}  ->  Mandir Darshan  ->  Airport Transfer`, '~225-245 Km', '5-6 Hrs driving excluding darshan'],
            ['Total', 'Complete Tour including all local transfers & sightseeing', '~875-970 Km', `${tripDetails.days} Days / ${tripDetails.nights} Nights`]
        ];
    } else {
        // Map all days comprehensively (no artificial cutoff)
        travelGuideRows = itineraryList.map(d => {
            const dayTitle = cleanTitle(d.title || `${destinationName} Sightseeing`);
            return [
                `Day ${d.day}`,
                `${cleanText(destinationName)}: ${dayTitle}`,
                '~45-90 Km',
                'Excursion & Dedicated Mobility'
            ];
        });
        travelGuideRows.push([
            'Total',
            `Complete ${cleanTitle(routeString)} Circuit Transfers & Sightseeing`,
            `~${tripDetails.days * 60}-${tripDetails.days * 110} Km`,
            `${tripDetails.days} Days / ${tripDetails.nights} Nights`
        ]);
    }

    autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        theme: 'grid',
        pageBreak: 'avoid',
        head: [['Day', isPilgrimage ? 'Route / Sacred Circuit' : 'Route / Excursion Schedule', 'Approx. Distance', 'Estimated Travel Time']],
        body: travelGuideRows,
        styles: { fontSize: 6.4, font: activeFont, textColor: [30, 41, 59], cellPadding: 2.2, lineColor: [226, 232, 240], lineWidth: 0.2 },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], font: activeFont, fontStyle: 'bold', fontSize: 6.8, cellPadding: 2.2 },
        columnStyles: {
            0: { cellWidth: 16, halign: 'center', font: activeFont, fontStyle: 'bold', textColor: [15, 23, 42] },
            1: { cellWidth: 80, fontStyle: 'normal' },
            2: { cellWidth: 30, halign: 'center' },
            3: { cellWidth: 'auto' }
        }
    });

    // ── CIRCUIT DRIVING PROTOCOL & RECOMMENDED TIMING BUFFERS CARD ──
    const guideEndY = (doc as any).lastAutoTable.finalY + 3.5;
    const drivingBoxH = 22;

    doc.setFillColor(...THEME.cardBg);
    doc.setDrawColor(...THEME.borderLight);
    doc.setLineWidth(0.25);
    doc.roundedRect(margin, guideEndY, contentW, drivingBoxH, 1, 1, 'FD');

    doc.setFillColor(...THEME.gold);
    doc.rect(margin, guideEndY, 2, drivingBoxH, 'F');

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...THEME.obsidian);

    const protocolTitle = isPilgrimage
        ? "CIRCUIT DRIVING PROTOCOL & RECOMMENDED TIMING BUFFERS:"
        : isInternational
            ? "INTERNATIONAL CHAUFFEUR PROTOCOL & TIMING GUIDELINES:"
            : "CIRCUIT DRIVING PROTOCOL & RECOMMENDED TRAVEL BUFFERS:";
    doc.text(protocolTitle, margin + 5, guideEndY + 4.5);

    const driveTips = isPilgrimage ? [
        "• Early Morning Temple Hours: We strongly recommend 05:30 AM - 07:00 AM starts to minimize queue waiting times.",
        "• Highway & Ghat Safety: Driving times account for ghat hairpin speed limits and recommended refreshment stops.",
        "• Return Departure Punctuality: Departure transfer to station/airport includes an essential 2-hour peak-traffic safety buffer."
    ] : isInternational ? [
        "• Chauffeur Meeting Point: Driver cum guide meets party at airport arrival hall / hotel lobby 15 mins prior to schedule.",
        "• Mountain & Excursion Safety: Travel times account for scenic photo stops, weather conditions & comfort breaks.",
        "• International Flight Punctuality: Airport return transfer scheduled 3 hours prior to international flight departure."
    ] : [
        "• Scenic Highway Pacing: Driving times include scenic viewpoint stops, comfort refreshments & photography breaks.",
        "• Punctual Sightseeing Starts: Recommended 09:00 AM departure to maximize daylight hours at key attractions.",
        "• Departure Transit Buffer: Drop transfer to airport/station includes a 2-hour traffic safety buffer."
    ];

    driveTips.forEach((dt, dtIdx) => {
        doc.setFont(activeFont, 'normal');
        doc.setFontSize(6.0);
        doc.setTextColor(...THEME.slateMedium);
        doc.text(dt, margin + 5, guideEndY + 9.5 + (dtIdx * 4.4));
    });

    // =========================================================================
    // PAGE 4: PACKAGE DELIVERABLES, DESTINATION ADVISORY & ESSENTIAL GUIDELINES
    // =========================================================================
    doc.addPage();
    drawPageDecorations(doc);
    y = 19;

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...THEME.obsidian);
    const deliverablesHeading = isPilgrimage
        ? "Package Deliverables & Sacred Destination Advisory"
        : isInternational
            ? "Package Deliverables & International Travel Advisory"
            : "Package Deliverables & Regional Travel Advisory";
    doc.text(deliverablesHeading, margin, y);
    y += 4.5;

    // ── DUAL-COLUMN BENTO: BESPOKE INCLUSIONS VS EXCLUSIONS ──
    const colW = (contentW - 4) / 2;
    const incExcH = 58;

    // Left: Inclusions Card
    doc.setFillColor(...THEME.cardBg);
    doc.setDrawColor(187, 247, 208); // Emerald-200
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, colW, incExcH, 1.2, 1.2, 'FD');

    doc.setFillColor(...THEME.emerald);
    doc.roundedRect(margin, y, colW, 6.2, 1.2, 1.2, 'F');
    doc.rect(margin, y + 4.5, colW, 1.7, 'F');

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(6.6);
    doc.setTextColor(255, 255, 255);
    doc.text("✦ BESPOKE PACKAGE INCLUSIONS", margin + 4.5, y + 4.3);

    let incY = y + 9.8;
    const baseInclusions = [
        `${String(tripDetails.nights).padStart(2, '0')} Nights stay in verified 3/4-Star category hotels.`,
        `${String(roomsCount).padStart(2, '0')} Deluxe Rooms on ${tripDetails.roomSharing || 'Double'} Sharing for ${guestCount} guests.`,
        `Daily ${getMealPlanShortName(tripDetails.mealPlanCode)} (${tripDetails.mealPlanCode || 'CP'}) as per hotel plan.`,
        `Dedicated Private ${cleanText(vehicleSummary)} for all confirmed days.`,
        `Station / Airport pickup and return departure transfers included.`,
        `Intercity highway transfers and all scheduled sightseeing as per itinerary.`,
        `Driver allowance, vehicle fuel, intercity tolls & commercial parking.`,
        `All applicable commercial transport permits and hotel taxes included.`
    ];

    const activeInclusions = (tripDetails.included && tripDetails.included.length > 0)
        ? Array.from(new Set([...baseInclusions, ...tripDetails.included.map(cleanText)]))
        : baseInclusions;

    activeInclusions.slice(0, 8).forEach(incItem => {
        doc.setFont(activeFont, 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(...THEME.emerald);
        doc.text("•", margin + 4, incY);

        doc.setFont(activeFont, 'normal');
        doc.setFontSize(6.1);
        doc.setTextColor(...THEME.obsidian);
        const wrapped = doc.splitTextToSize(incItem, colW - 10);
        doc.text(wrapped, margin + 7.5, incY);
        incY += (wrapped.length * 2.8) + 1.2;
    });

    // Right: Exclusions Card
    const excX = margin + colW + 4;
    doc.setFillColor(...THEME.cardBg);
    doc.setDrawColor(...THEME.borderLight);
    doc.setLineWidth(0.3);
    doc.roundedRect(excX, y, colW, incExcH, 1.2, 1.2, 'FD');

    doc.setFillColor(...THEME.slateDark);
    doc.roundedRect(excX, y, colW, 6.2, 1.2, 1.2, 'F');
    doc.rect(excX, y + 4.5, colW, 1.7, 'F');

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(6.6);
    doc.setTextColor(255, 255, 255);
    doc.text("✦ PACKAGE EXCLUSIONS", excX + 4.5, y + 4.3);

    let excY = y + 9.8;
    const baseExclusions = [
        `5% GST / statutory taxes as per prevailing government regulations.`,
        isPilgrimage ? `Temple VIP Sugam Darshan tickets & special Pooja fees.` : `Entry tickets to monuments, activities & cable cars unless explicitly listed.`,
        `Flight tickets and train reservations unless explicitly requested.`,
        `Camera / videography fees and personal guide tips.`,
        `Personal expenses (laundry, room service, telephone, minibar).`,
        `Any adventure activities or optional excursions not listed in itinerary.`,
        `Extra vehicle running outside confirmed route circuit.`,
        `Personal travel / medical insurance or unforeseen emergency expenses.`
    ];

    const activeExclusions = (tripDetails.notIncluded && tripDetails.notIncluded.length > 0)
        ? Array.from(new Set([...baseExclusions, ...tripDetails.notIncluded.map(cleanText)]))
        : baseExclusions;

    activeExclusions.slice(0, 8).forEach(excItem => {
        doc.setFont(activeFont, 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(...THEME.slateLight);
        doc.text("–", excX + 4, excY);

        doc.setFont(activeFont, 'normal');
        doc.setFontSize(6.1);
        doc.setTextColor(...THEME.slateMedium);
        const wrapped = doc.splitTextToSize(excItem, colW - 10);
        doc.text(wrapped, excX + 7.5, excY);
        excY += (wrapped.length * 2.8) + 1.2;
    });

    y += incExcH + 5.5;

    // ── DESTINATION ADVISORY & ESSENTIAL GUIDELINES (2x2 GRID) ──
    doc.setFont(activeFont, 'bold');
    doc.setFontSize(8.0);
    doc.setTextColor(...THEME.obsidian);
    
    const advisoryTitle = isPilgrimage
        ? "Sacred Destination Timings & Temple Decorum:"
        : isInternational
            ? "International Travel Essentials & Guest Advisory:"
            : "Regional Destination Advisory & Travel Essentials:";
    doc.text(advisoryTitle, margin, y);
    y += 3.0;

    const templeCardW = (contentW - 3) / 2;
    const templeCardH = 22;

    const templeCards = isPilgrimage ? [
        {
            title: 'Shri Saibaba Sansthan (Shirdi)',
            timings: 'Darshan: 06:00 AM - 10:00 PM | Kakad Aarti: 04:30 AM',
            note: 'Sugam Darshan passes bookable online. Mobile phones deposited at outside counters.'
        },
        {
            title: 'Bhimashankar Jyotirlinga (Pune Hills)',
            timings: 'Darshan: 04:30 AM - 12:00 PM & 04:00 PM - 09:30 PM',
            note: 'Morning Aarti: 04:30 AM. Modest traditional attire recommended for inner sanctum.'
        },
        {
            title: 'Trimbakeshwar Jyotirlinga (Nashik)',
            timings: 'Darshan: 05:30 AM - 09:00 PM | Special Pooja assistance available',
            note: 'Men enter Garbhagriha in Dhoti/Sovale. Unique three-faced Linga & sacred Godavari origin.'
        },
        {
            title: 'Grishneshwar & Ellora Caves',
            timings: 'Grishneshwar: 05:30 AM - 09:30 PM | Ellora: 06:00 AM - 06:00 PM',
            note: 'Men enter inner sanctum bare-chested/dhoti. Note: Ellora Caves are closed on Tuesdays.'
        }
    ] : isInternational ? [
        {
            title: 'Visa & Passport Regulations',
            timings: '14-Day Visa-Free Entry for Indian Citizens',
            note: 'Passport must have min. 6 months validity & 2 blank pages. Keep return flight tickets handy.'
        },
        {
            title: 'Currency & Forex Guidelines',
            timings: 'Local Currency (KZT / Tenge) & USD Accepted',
            note: 'International Visa/Mastercard active for overseas POS. Currency exchange available at airport/city.'
        },
        {
            title: 'Alpine Climate & Packing Advisory',
            timings: 'Mountain Temperatures Vary (Shymbulak 3,200m)',
            note: 'Layered thermal innerwear, windbreaker jacket, sunscreen, and sturdy walking shoes recommended.'
        },
        {
            title: '24x7 Dedicated Overseas Support',
            timings: 'Helpline: +91 94234 15764 (Direct Call / WhatsApp)',
            note: 'On-ground English-speaking liaison active throughout. Indian Embassy consular coordination available.'
        }
    ] : [
        {
            title: 'Government Identity Protocol',
            timings: 'Original Photo IDs Mandatory at Check-in',
            note: 'Original Aadhaar card or Passport required for all adult guests as per hotelier hospitality regulations.'
        },
        {
            title: 'Luggage Boot Management',
            timings: 'Comfortable Cabin & Trunk Space Distribution',
            note: 'Guests are kindly advised to travel with standard suitcases to ensure comfortable vehicle legroom.'
        },
        {
            title: 'Scenic Hill & Mountain Driving',
            timings: 'Chauffeur Regulates AC on Steep Ghat Incline',
            note: 'AC switched off momentarily on steep uphill bends to prioritize engine torque and mountain road safety.'
        },
        {
            title: 'Hotel Dining & Meal Schedules',
            timings: 'Fixed Buffet Hours as per Property Policy',
            note: 'Buffet breakfast served 07:30 AM - 10:00 AM. Early packed breakfast available upon front-desk notice.'
        }
    ];

    templeCards.forEach((tc, tIdx) => {
        const row = Math.floor(tIdx / 2);
        const col = tIdx % 2;
        const tx = margin + (col * (templeCardW + 3));
        const ty = y + (row * (templeCardH + 2.5));

        doc.setFillColor(...THEME.cardBg);
        doc.setDrawColor(...THEME.borderLight);
        doc.setLineWidth(0.25);
        doc.roundedRect(tx, ty, templeCardW, templeCardH, 1, 1, 'FD');

        doc.setFillColor(...THEME.gold);
        doc.rect(tx, ty, 2, templeCardH, 'F');

        doc.setFont(activeFont, 'bold');
        doc.setFontSize(6.6);
        doc.setTextColor(...THEME.obsidian);
        doc.text(tc.title, tx + 4.5, ty + 4.6);

        doc.setFont(activeFont, 'normal');
        doc.setFontSize(5.8);
        doc.setTextColor(...THEME.slateDark);
        doc.text(tc.timings, tx + 4.5, ty + 10.0);

        doc.setFont(activeFont, 'italic');
        doc.setFontSize(5.6);
        doc.setTextColor(...THEME.goldDark);
        const wrappedNote = doc.splitTextToSize(tc.note, templeCardW - 7);
        doc.text(wrappedNote, tx + 4.5, ty + 15.2);
    });

    y += (2 * (templeCardH + 2.5)) + 4.5;

    // ── SHRAWELLO 24X7 ON-GROUND VIP ASSURANCE & SAFETY PROTOCOL ──
    const supportCardH = 20;

    doc.setFillColor(...THEME.cardBg);
    doc.setDrawColor(...THEME.borderLight);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentW, supportCardH, 1.2, 1.2, 'FD');

    doc.setFillColor(...THEME.obsidian);
    doc.rect(margin, y, 2.5, supportCardH, 'F');

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...THEME.obsidian);
    doc.text("✦ SHRAWELLO 24X7 ON-GROUND VIP ASSURANCE & SAFETY PROTOCOL:", margin + 6, y + 4.6);

    doc.setFont(activeFont, 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(...THEME.slateDark);
    doc.text("• Chauffeur Briefing: Seasoned circuit chauffeur assigned with route clearance and real-time navigation tracking.", margin + 6, y + 9.2);
    doc.text("• Transparent Fixed Pricing: Zero hidden charges. All vehicle fuel, intercity permits, parking & night stay included.", margin + 6, y + 13.5);
    doc.text("• Emergency Helpline: 24/7 dedicated escalation desk active throughout your journey (Direct: +91 94234 15764).", margin + 6, y + 17.8);

    y += supportCardH + 4.5;

    // ── ESSENTIAL TOUR GUIDELINES & GUEST ETIQUETTE (PERFECTLY FILLS THE PREVIOUS 70mm VOID) ──
    const guidelinesH = 34;

    doc.setFillColor(...THEME.cardBg);
    doc.setDrawColor(...THEME.borderLight);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentW, guidelinesH, 1.2, 1.2, 'FD');

    // Left Pure Gold Accent Bar
    doc.setFillColor(...THEME.gold);
    doc.rect(margin, y, 2.5, guidelinesH, 'F');

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(7.0);
    doc.setTextColor(...THEME.goldDark);
    doc.text("✦ ESSENTIAL TOUR GUIDELINES & GUEST ETIQUETTE:", margin + 6, y + 5.0);

    const tourGuidelines = [
        {
            title: "Government Photo IDs",
            desc: "Original Aadhaar Card or Passport required for all travelers at hotel check-in as per government hotelier mandate."
        },
        {
            title: "Luggage Boot Space Management",
            desc: "Guests are kindly requested to maintain comfortable luggage size matching vehicle trunk space for maximum legroom comfort."
        },
        {
            title: "Scenic Hill & Ghat AC Protocol",
            desc: "Chauffeur regulates vehicle AC on steep uphill hairpins to prioritize engine cooling, torque, and passenger mountain safety."
        },
        {
            title: "Hotel Dining & Meal Timing Plans",
            desc: "Meals operate on hotel fixed buffet or room-service schedules. Early packed breakfast available upon prior front-desk notice."
        }
    ];

    const guideColW = (contentW - 16) / 2;
    const guideCardH = 11.0;

    tourGuidelines.forEach((gl, glIdx) => {
        const row = Math.floor(glIdx / 2);
        const col = glIdx % 2;
        const gx = margin + 6 + (col * (guideColW + 4));
        const gy = y + 8.2 + (row * (guideCardH + 2.0));

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...THEME.borderLight);
        doc.setLineWidth(0.2);
        doc.roundedRect(gx, gy, guideColW, guideCardH, 0.8, 0.8, 'FD');

        doc.setFont(activeFont, 'bold');
        doc.setFontSize(6.2);
        doc.setTextColor(...THEME.obsidian);
        doc.text(`• ${gl.title}:`, gx + 2.5, gy + 3.8);

        doc.setFont(activeFont, 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(...THEME.slateMedium);
        const descWrapped = doc.splitTextToSize(gl.desc, guideColW - 5);
        doc.text(descWrapped, gx + 2.5, gy + 7.2);
    });

    // =========================================================================
    // PAGE 5: COMMERCIALS, PAYMENT HUB, POLICIES & FORMAL CONFIRMATION
    // Features Per-Person Price Primacy & Effortless 3-Step Booking Journey
    // =========================================================================
    doc.addPage();
    drawPageDecorations(doc);
    y = 19;

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...THEME.obsidian);
    doc.text("Commercials, Payment Policies & Official Authorisation", margin, y);
    y += 4.5;

    // 1. EXECUTIVE INVESTMENT CARD (HIGHLIGHTS PER-PERSON VALUE AS HERO)
    const investH = 25;
    doc.setFillColor(...THEME.obsidian);
    doc.roundedRect(margin, y, contentW, investH, 1.2, 1.2, 'F');

    // Left Pure Gold Accent Bar
    doc.setFillColor(...THEME.gold);
    doc.rect(margin, y, 2.5, investH, 'F');

    // Top Tagline in Gold
    doc.setFont(activeFont, 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...THEME.gold);
    doc.text("✦ BESPOKE TOUR INVESTMENT PER GUEST", margin + 6, y + 5.5);

    // HERO FIGURE: PER GUEST PRICE (DOMINANT HEADLINE)
    doc.setFont(activeFont, 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(`Rs. ${perPaxAmount.toLocaleString('en-IN')}/-`, margin + 6, y + 13.5);

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...THEME.gold);
    doc.text("PER GUEST (ALL-INCLUSIVE)", margin + 46, y + 13.0);

    // SUPPORTING BREAKDOWN: TOTAL PACKAGE FOR PARTY
    doc.setFont(activeFont, 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(226, 232, 240); // Slate-200
    doc.text(`Total All-Inclusive Investment: Rs. ${Math.round(finalPrice).toLocaleString('en-IN')} for ${guestCount} Guests (${tripDetails.nights} Nights / ${tripDetails.days} Days)`, margin + 6, y + 18.5);

    // Micro-Value Callout & Validity
    doc.setFont(activeFont, 'italic');
    doc.setFontSize(5.8);
    doc.setTextColor(...THEME.slateLight);
    doc.text(`Value Rate: ~Rs. ${perDayAmount.toLocaleString('en-IN')} / day per guest  •  Quotation valid for 3 days from date of issue  •  Subject to availability`, margin + 6, y + 22.5);

    y += investH + 4.5;

    // 2. Curated Optional Concierge & Upgrades Table (DYNAMICALLY ADAPTED)
    doc.setFont(activeFont, 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(...THEME.obsidian);
    doc.text("Curated Optional Concierge & Destination Services:", margin, y);
    y += 2.5;

    let optServices: string[][] = [];
    if (isPilgrimage) {
        optServices = [
            ['Sacred Shrine VIP / Sugam Darshan Fast-Track Pass', 'Rs. 500 / Person'],
            ['Special Vedic Pooja & Abhishek Priest Assistance', 'Rs. 1,500 / Family'],
            ['Authorized Heritage Guide for Monument / Cave Complex', 'Rs. 1,800 / Group'],
            ['Chauffeur Waiting & Night Halts Assistance', 'Included in Package']
        ];
    } else if (isInternational) {
        optServices = [
            ['Alpine Cable Car / Gondola Fast-Track VIP Upgrade', 'Rs. 1,800 / Person'],
            ['Scenic Canyon / Mountain 4x4 Off-Road Guided Excursion', 'Rs. 3,500 / Group'],
            ['Traditional Cultural Dining Experience & Folk Performance', 'Rs. 2,200 / Person'],
            ['Dedicated English-Speaking Licensed Destination Guide', 'Rs. 2,800 / Day']
        ];
    } else {
        optServices = [
            ['Private Professional Vacation Photographer (Half Day)', 'Rs. 4,500 / Session'],
            ['Special Candlelight Dinner & Gourmet Culinary Setup', 'Rs. 3,500 / Couple'],
            ['Local Certified Heritage Guide for Full Day Sightseeing', 'Rs. 2,500 / Day'],
            ['Vehicle Segment Upgrade (Sedan to Innova Crysta / SUV)', 'On Request']
        ];
    }

    autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        theme: 'grid',
        pageBreak: 'avoid',
        head: [['Curated Optional Service', 'Investment / Rate']],
        body: optServices,
        styles: { fontSize: 6.4, font: activeFont, textColor: [30, 41, 59], cellPadding: 2.0, lineColor: [226, 232, 240], lineWidth: 0.2 },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], font: activeFont, fontStyle: 'bold', fontSize: 6.8, cellPadding: 2.0 },
        columnStyles: {
            0: { cellWidth: 'auto', fontStyle: 'normal' },
            1: { cellWidth: 50, halign: 'center', font: activeFont, fontStyle: 'bold', textColor: [161, 124, 46] }
        }
    });

    y = (doc as any).lastAutoTable.finalY + 4.5;

    // 3. Official Bank Details & UPI Payment Hub
    const bankCardH = 28;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...THEME.borderLight);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentW, bankCardH, 1.2, 1.2, 'FD');

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...THEME.obsidian);
    doc.text("✦ Official Bank Transfer & UPI Payment Hub:", margin + 5, y + 5.5);

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(6.6);
    doc.setTextColor(...THEME.slateMedium);
    doc.text("Bank Name:", margin + 5, y + 11.5);
    doc.setFont(activeFont, 'bold');
    doc.setTextColor(...THEME.obsidian);
    doc.text("KOTAK MAHINDRA BANK", margin + 35, y + 11.5);

    doc.setFont(activeFont, 'bold');
    doc.setTextColor(...THEME.slateMedium);
    doc.text("Beneficiary:", margin + 5, y + 16.5);
    doc.setFont(activeFont, 'normal');
    doc.setTextColor(...THEME.obsidian);
    doc.text("SHRAWELLO TRAVEL HUB AND EVENTS LLP", margin + 35, y + 16.5);

    doc.setFont(activeFont, 'bold');
    doc.setTextColor(...THEME.slateMedium);
    doc.text("Account No:", margin + 5, y + 21.5);
    doc.setFont(activeFont, 'bold');
    doc.setTextColor(...THEME.goldDark);
    doc.text("4054789256", margin + 35, y + 21.5);

    doc.setFont(activeFont, 'bold');
    doc.setTextColor(...THEME.slateMedium);
    doc.text("IFSC Code:", margin + 5, y + 26.5);
    doc.setFont(activeFont, 'bold');
    doc.setTextColor(...THEME.goldDark);
    doc.text("KKBK0002119", margin + 35, y + 26.5);

    // Draw QR Code on right if present with clean styling
    if (bankQrBase64) {
        try {
            doc.addImage(bankQrBase64, 'JPEG', margin + contentW - 27, y + 3, 22, 22, undefined, 'FAST');
            doc.setFont(activeFont, 'normal');
            doc.setFontSize(5.0);
            doc.setTextColor(...THEME.slateLight);
            doc.text("Scan via UPI App", margin + contentW - 16, y + 26.5, { align: 'center' });
        } catch {}
    }

    y += bankCardH + 4.5;

    // 4. Payment Milestones & Cancellation Timeline
    doc.setFont(activeFont, 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(...THEME.obsidian);
    doc.text("Payment Schedule & Cancellation Terms:", margin, y);
    y += 2.8;

    const cancelW = (contentW - 6) / 4;
    const cancelH = 15;
    const cancelTiers = [
        { days: '30+ Days Before', fee: '10% Fee', sub: 'Standard service fee', col: THEME.emerald },
        { days: '15 - 29 Days', fee: '25% Cancellation', sub: 'Of total package value', col: THEME.goldDark },
        { days: '7 - 14 Days', fee: '50% Cancellation', sub: 'Of total package value', col: [234, 88, 12] as [number, number, number] },
        { days: 'Under 7 Days', fee: '100% Non-refundable', sub: 'Or No-show', col: THEME.rose },
    ];

    cancelTiers.forEach((ct, cIdx) => {
        const cx = margin + (cIdx * (cancelW + 2));
        doc.setFillColor(...THEME.cardBg);
        doc.setDrawColor(...THEME.borderLight);
        doc.setLineWidth(0.25);
        doc.roundedRect(cx, y, cancelW, cancelH, 1, 1, 'FD');

        doc.setFillColor(ct.col[0], ct.col[1], ct.col[2]);
        doc.rect(cx, y, cancelW, 1.2, 'F');

        doc.setFont(activeFont, 'bold');
        doc.setFontSize(5.8);
        doc.setTextColor(...THEME.slateMedium);
        doc.text(ct.days, cx + (cancelW / 2), y + 4.8, { align: 'center' });

        doc.setFont(activeFont, 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(ct.col[0], ct.col[1], ct.col[2]);
        doc.text(ct.fee, cx + (cancelW / 2), y + 9.5, { align: 'center' });

        doc.setFont(activeFont, 'normal');
        doc.setFontSize(5.2);
        doc.setTextColor(...THEME.slateLight);
        doc.text(ct.sub, cx + (cancelW / 2), y + 13, { align: 'center' });
    });

    y += cancelH + 4.5;

    // 5. Effortless 3-Step Booking Journey (NEW - FILLS PAGE 5 BEAUTIFULLY)
    doc.setFont(activeFont, 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(...THEME.obsidian);
    doc.text("✦ Effortless 3-Step Booking Confirmation Journey:", margin, y);
    y += 2.8;

    const stepW = (contentW - 4) / 3;
    const stepH = 14;
    const bookingSteps = [
        { num: "01", title: "Advance Deposit", desc: "25% token payment locks hotel allocations & dedicated private vehicle." },
        { num: "02", title: "Official Vouchers", desc: "Hotel confirmation vouchers & digital itinerary dispatched within 24 hours." },
        { num: "03", title: "Chauffeur & Concierge", desc: "Chauffeur contact & 24/7 dedicated trip manager assigned 24h prior to travel." }
    ];

    bookingSteps.forEach((st, sIdx) => {
        const sx = margin + (sIdx * (stepW + 2));
        doc.setFillColor(...THEME.cardBg);
        doc.setDrawColor(...THEME.borderLight);
        doc.setLineWidth(0.25);
        doc.roundedRect(sx, y, stepW, stepH, 1, 1, 'FD');

        // Gold top accent
        doc.setFillColor(...THEME.gold);
        doc.rect(sx, y, stepW, 0.8, 'F');

        doc.setFont(activeFont, 'bold');
        doc.setFontSize(6.2);
        doc.setTextColor(...THEME.goldDark);
        doc.text(`STEP ${st.num}: ${st.title}`, sx + 3.5, y + 4.5);

        doc.setFont(activeFont, 'normal');
        doc.setFontSize(5.4);
        doc.setTextColor(...THEME.slateMedium);
        const wrappedStep = doc.splitTextToSize(st.desc, stepW - 7);
        doc.text(wrappedStep, sx + 3.5, y + 8.5);
    });

    y += stepH + 4.5;

    // 6. Dual Sign-off & Confirmation Block
    const signBoxW = (contentW - 4) / 2;
    const signBoxH = 26;

    // Left: Agency Sign-off
    doc.setFillColor(...THEME.cardBg);
    doc.setDrawColor(...THEME.borderLight);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, signBoxW, signBoxH, 1, 1, 'FD');

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...THEME.goldDark);
    doc.text("PREPARED BY TRAVEL SPECIALIST", margin + 4.5, y + 4.8);

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(8.4);
    doc.setTextColor(...THEME.obsidian);
    doc.text("Manali Sankpal", margin + 4.5, y + 10.5);

    doc.setFont(activeFont, 'normal');
    doc.setFontSize(6.0);
    doc.setTextColor(...THEME.slateMedium);
    doc.text("Senior Travel Specialist • Shrawello Tours", margin + 4.5, y + 15);
    doc.text("Direct Contact: +91 80109 55675  |  hello@shrawello.com", margin + 4.5, y + 19.5);
    doc.text("Shrawello Travel Hub & Events LLP", margin + 4.5, y + 23.5);

    // Right: Client Acceptance Box
    const clientSignX = margin + signBoxW + 4;
    doc.setFillColor(...THEME.cardBg);
    doc.setDrawColor(...THEME.borderLight);
    doc.roundedRect(clientSignX, y, signBoxW, signBoxH, 1, 1, 'FD');

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...THEME.obsidian);
    doc.text("CLIENT ACCEPTANCE & CONFIRMATION", clientSignX + 4.5, y + 4.8);

    doc.setFont(activeFont, 'normal');
    doc.setFontSize(6.0);
    doc.setTextColor(...THEME.slateMedium);
    doc.text(`Guest Name: ${cleanText(tripDetails.clientName || 'Valued Client')}`, clientSignX + 4.5, y + 10.5);
    doc.text("Authorized Signature: _________________________________", clientSignX + 4.5, y + 17);
    doc.text("Date of Acceptance: __________________________________", clientSignX + 4.5, y + 22.5);

    // =========================================================================
    // TWO-PASS PAGE NUMBERING (Guarantees Page X of 5 without placeholder bug)
    // =========================================================================
    const totalPages = typeof (doc as any).getNumberOfPages === 'function'
        ? (doc as any).getNumberOfPages()
        : ((doc as any).internal?.getNumberOfPages ? (doc as any).internal.getNumberOfPages() : (doc.internal.pages.length - 1));
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont(activeFont, 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(...THEME.obsidian);
        doc.text(`Page ${p} of ${totalPages}`, pageW - margin, pageH - 7.5, { align: 'right' });
    }

    // Save PDF
    const filename = `Itinerary_${(tripDetails.title || 'Trip').replace(/\s+/g, '_')}_${tripDetails.startDate || 'draft'}.pdf`;
    doc.save(filename);
};
