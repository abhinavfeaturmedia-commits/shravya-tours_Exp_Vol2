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
        headerPanoramaBase64,
        bankQrBase64,
        fontRegularBase64,
        fontBoldBase64,
        fontMediumBase64
    ] = await Promise.all([
        loadImageBase64('/pdf_assets/shrawello_logo.jpg').catch(() => null),
        loadImageBase64('/pdf_assets/header_panorama.jpg').catch(() => null),
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

    // Text sanitizer for crisp ASCII compatibility
    const cleanText = (str: string): string => {
        if (!str) return '';
        return str
            .replace(/₹/g, 'Rs. ')
            .replace(/[✓✔]/g, '')
            .replace(/[✗✘]/g, '')
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2013\u2014]/g, '-')
            .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, '')
            .replace(/[^\x20-\x7E\t\n\r]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    };

    // Distinct destination names resolver
    const destinationNames: string[] = (tripDetails.destinations && tripDetails.destinations.length > 0)
        ? tripDetails.destinations
            .map((d: any) => masterLocations?.find(l => String(l.id) === String(d.locationId))?.name || d.locationId)
            .filter(Boolean)
        : [destinationName].filter(Boolean);

    const routeString = destinationNames.length > 0
        ? destinationNames.join(' - ')
        : (tripDetails.title || 'Maharashtra Sacred Circuit');

    const roomsCount = tripDetails.roomsCount || Math.max(1, Math.ceil((tripDetails.adults || 2) / 2));

    // Detect circuit category
    const isMaharashtra = destinationNames.some(d => /shirdi|bhimashankar|trimbak|grishneshwar|ellora|ajanta|mumbai|pune|nashik|aurangabad/i.test(d))
        || /maharashtra|jyotirlinga/i.test(tripDetails.title || '');
    const isVaranasi = destinationNames.some(d => /varanasi|kashi|prayagraj|chitrakoot|ayodhya/i.test(d))
        || /varanasi|kashi|ayodhya/i.test(tripDetails.title || '');

    // Resolve transportation fleet
    const transportList = items.filter(i => i.type === 'transport' || i.type === 'flight');
    const firstTrans = transportList[0] || null;
    const uniqueVehicleTitles = Array.from(new Set(transportList.map(t => cleanText(t.title)).filter(Boolean)));
    const vehicleSummary = uniqueVehicleTitles.length > 0
        ? uniqueVehicleTitles.join(' / ')
        : (firstTrans ? cleanText(firstTrans.title) : 'Dedicated Private AC Vehicle');

    // Header & Base Footer Decorator (Page numbers stamped in final 2-pass loop)
    const drawPageDecorations = (docInstance: jsPDF) => {
        // Header (15mm top bar)
        if (logoBase64) {
            try {
                docInstance.addImage(logoBase64, 'JPEG', margin, 4, 34, 9, undefined, 'FAST');
            } catch {
                docInstance.setFont(activeFont, 'bold');
                docInstance.setFontSize(10.5);
                docInstance.setTextColor(15, 23, 42);
                docInstance.text("SHRAWELLO TravelHub", margin, 9);
                docInstance.setFontSize(5.5);
                docInstance.setTextColor(100, 116, 139);
                docInstance.text("- CORPORATE TRAVEL AND EVENTS -", margin, 12);
            }
        } else {
            docInstance.setFont(activeFont, 'bold');
            docInstance.setFontSize(10.5);
            docInstance.setTextColor(15, 23, 42);
            docInstance.text("SHRAWELLO TravelHub", margin, 9);
            docInstance.setFontSize(5.5);
            docInstance.setTextColor(100, 116, 139);
            docInstance.text("- CORPORATE TRAVEL AND EVENTS -", margin, 12);
        }

        if (headerPanoramaBase64) {
            try {
                docInstance.addImage(headerPanoramaBase64, 'JPEG', pageW - margin - 60, 4, 60, 9, undefined, 'FAST');
            } catch {}
        }

        // Top hairline divider
        docInstance.setDrawColor(226, 232, 240);
        docInstance.setLineWidth(0.3);
        docInstance.line(margin, 14.5, pageW - margin, 14.5);

        // Footer hairline divider
        docInstance.line(margin, pageH - 11, pageW - margin, pageH - 11);

        // Footer running contact line
        docInstance.setFont(activeFont, 'normal');
        docInstance.setFontSize(6.8);
        docInstance.setTextColor(100, 116, 139);
        docInstance.text("Web: https://shrawello.com  |  Email: hello@shrawello.com  |  Customer Care: 9423415764", margin, pageH - 7.5);

        // Copyright line
        docInstance.setFontSize(5.6);
        docInstance.setTextColor(148, 163, 184);
        docInstance.text("(c) 2026 Shrawello Travel Hub & Events LLP. All rights reserved. Terms & conditions apply.", margin, pageH - 4.5);
    };

    // =========================================================================
    // PAGE 1: EXECUTIVE BRIEFING, DYNAMIC HERO, BENTO SNAPSHOT, HOTELS & FLEET
    // =========================================================================
    drawPageDecorations(doc);
    let y = 18;

    // Prepared Exclusively for Client
    doc.setFont(activeFont, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(14, 116, 144);
    doc.text("PREPARED EXCLUSIVELY FOR:", margin, y);

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(cleanText(tripDetails.clientName || 'Valued Client'), margin, y + 4.5);

    // Welcome Text
    doc.setFont(activeFont, 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    const welcomeText = `Thank you for choosing SHRAWELLO Travel Hub & Events LLP as your bespoke travel partner for "${cleanText(tripDetails.title || 'Tour')}". We are delighted to share the customized quotation and detailed day-wise itinerary below.`;
    const wrappedWelcome = doc.splitTextToSize(welcomeText, contentW);
    doc.text(wrappedWelcome, margin, y + 9);

    y += 10 + (wrappedWelcome.length * 3.1);

    // Sacred Circuit Hero Banner Card
    const cardH = 20;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentW, cardH, 1.5, 1.5, 'FD');

    // Left Gold Accent Strip
    doc.setFillColor(217, 119, 6);
    doc.rect(margin, y, 2.5, cardH, 'F');

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(7);
    doc.setTextColor(217, 119, 6);
    doc.text("A JOURNEY OF FAITH, CULTURE & MEMORABLE EXPERIENCES", margin + 5, y + 5);

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(cleanText(routeString).toUpperCase(), margin + 5, y + 10.5);

    doc.setFont(activeFont, 'normal');
    doc.setFontSize(6.6);
    doc.setTextColor(71, 85, 105);
    doc.text(`Comfortable Stays  •  Dedicated Private Fleet  •  ${getMealPlanShortName(tripDetails.mealPlanCode)}  •  ${guestCount} Guests  •  ${tripDetails.nights} Nights / ${tripDetails.days} Days`, margin + 5, y + 16);

    y += cardH + 4;

    // --- BENTO GRID: 4-POINT EXECUTIVE SNAPSHOT CARDS ---
    const bentoW = (contentW - 6) / 4;
    const bentoH = 17;

    const bentoMetrics = [
        { label: 'DURATION', val: `${tripDetails.nights}N / ${tripDetails.days}D`, sub: `${tripDetails.days} Days Total`, col: [14, 116, 144] as [number, number, number] },
        { label: 'TRAVEL PARTY', val: `${guestCount} Guests`, sub: `${tripDetails.adults || 2} Adults${tripDetails.children ? `, ${tripDetails.children} Kids` : ''}`, col: [79, 70, 229] as [number, number, number] },
        { label: 'MEAL PLAN', val: tripDetails.mealPlanCode || 'CP Plan', sub: getMealPlanShortName(tripDetails.mealPlanCode), col: [16, 185, 129] as [number, number, number] },
        { label: 'INVESTMENT', val: `Rs. ${Math.round(finalPrice).toLocaleString('en-IN')}`, sub: `Rs. ${pricePerPax.toLocaleString('en-IN')} / guest`, col: [217, 119, 6] as [number, number, number] },
    ];

    bentoMetrics.forEach((m, idx) => {
        const bx = margin + (idx * (bentoW + 2));
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(bx, y, bentoW, bentoH, 1.2, 1.2, 'FD');

        doc.setFillColor(m.col[0], m.col[1], m.col[2]);
        doc.rect(bx, y, bentoW, 1.2, 'F');

        doc.setFont(activeFont, 'bold');
        doc.setFontSize(5.8);
        doc.setTextColor(100, 116, 139);
        doc.text(m.label, bx + 3, y + 4.8);

        doc.setFont(activeFont, 'bold');
        doc.setFontSize(8.2);
        doc.setTextColor(m.col[0], m.col[1], m.col[2]);
        doc.text(m.val, bx + 3, y + 10);

        doc.setFont(activeFont, 'normal');
        doc.setFontSize(5.6);
        doc.setTextColor(100, 116, 139);
        doc.text(m.sub, bx + 3, y + 14.2);
    });

    y += bentoH + 5;

    // --- TABLE 1: ACCOMMODATION PLAN ---
    doc.setFont(activeFont, 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(15, 23, 42);
    doc.text("Curated Accommodation Plan:", margin, y);
    y += 2.8;

    const hotelRows: string[][] = [];
    if (tripDetails.destinations && tripDetails.destinations.length > 0) {
        let currentDayCounter = 1;
        tripDetails.destinations.forEach((leg: any, legIdx: number) => {
            const locName = masterLocations?.find(l => String(l.id) === String(leg.locationId))?.name || leg.locationId;
            const legHotel = accommodations.find(i => i.day === currentDayCounter)
                || accommodations.find(i => cleanText(i.title).toLowerCase().includes(cleanText(locName).toLowerCase()))
                || accommodations[legIdx]
                || null;
            const hotelTitle = legHotel ? `${cleanText(legHotel.title)} / Similar` : `3-Star Deluxe Hotel / Similar`;
            const roomTypeDesc = legHotel?.roomTypeId ? getRoomTypeName(legHotel.roomTypeId) : 'Deluxe Rooms';
            hotelRows.push([
                cleanText(locName),
                `${leg.nights} Night${leg.nights > 1 ? 's' : ''}`,
                hotelTitle,
                `${roomsCount} ${roomTypeDesc} (${tripDetails.roomSharing || 'Quad'} Sharing)`
            ]);
            currentDayCounter += leg.nights || 1;
        });
    } else if (accommodations.length > 0) {
        accommodations.forEach(acc => {
            hotelRows.push([
                cleanText(destinationName),
                `${tripDetails.nights} Nights`,
                `${cleanText(acc.title)} / Similar`,
                `${roomsCount} Deluxe Rooms (${tripDetails.roomSharing || 'Double'} Sharing)`
            ]);
        });
    } else {
        hotelRows.push([
            cleanText(destinationName),
            `${tripDetails.nights} Nights`,
            `Standard Premium Hotel / Similar`,
            `${roomsCount} Deluxe Rooms (${tripDetails.roomSharing || 'Double'} Sharing)`
        ]);
    }

    autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        theme: 'grid',
        pageBreak: 'avoid',
        head: [['Sacred Destination / City', 'Duration', 'Hotel & Category', 'Rooms Allocated']],
        body: hotelRows,
        styles: { fontSize: 6.8, font: activeFont, textColor: [30, 41, 59], cellPadding: 2.8, lineColor: [203, 213, 225], lineWidth: 0.2 },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], font: activeFont, fontStyle: 'bold', fontSize: 7.0, cellPadding: 2.6 },
        columnStyles: {
            0: { cellWidth: 40, font: activeFont, fontStyle: 'bold', textColor: [14, 116, 144] },
            1: { cellWidth: 24, halign: 'center' },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 52, halign: 'center' }
        }
    });

    y = (doc as any).lastAutoTable.finalY + 5;

    // --- TABLE 2: DEDICATED PRIVATE FLEET & MOBILITY ---
    doc.setFont(activeFont, 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(15, 23, 42);
    doc.text("Dedicated Private Fleet & Mobility:", margin, y);
    y += 2.8;

    const vehicleRows: string[][] = [];
    if (uniqueVehicleTitles.length > 0) {
        uniqueVehicleTitles.forEach((vTitle, idx) => {
            const daysUsed = transportList.filter(t => cleanText(t.title) === vTitle).length;
            const daysStr = daysUsed > 1 ? `${daysUsed} Days` : `${tripDetails.days} Days`;
            const matchItem = transportList.find(t => cleanText(t.title) === vTitle);
            const descExtra = matchItem?.description ? ` (${cleanText(matchItem.description)})` : '';
            vehicleRows.push([
                String(idx + 1),
                `${vTitle}${descExtra}`,
                daysStr,
                `${cleanText(routeString)} - Complete transfers, sightseeing, tolls, parking & driver allowance.`
            ]);
        });
    } else {
        vehicleRows.push([
            '1',
            'Dedicated Private AC Vehicle',
            `${tripDetails.days} Days`,
            `${cleanText(routeString)} - Complete transfers, sightseeing, tolls, parking & driver allowance.`
        ]);
    }

    autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        theme: 'grid',
        pageBreak: 'avoid',
        head: [['Sr.', 'Vehicle Type & Capacity', 'Duration', 'Inclusions & Circuit Route']],
        body: vehicleRows,
        styles: { fontSize: 6.8, font: activeFont, textColor: [30, 41, 59], cellPadding: 2.6, lineColor: [203, 213, 225], lineWidth: 0.2 },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], font: activeFont, fontStyle: 'bold', fontSize: 7.0, cellPadding: 2.5 },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center', font: activeFont, fontStyle: 'bold' },
            1: { cellWidth: 58, font: activeFont, fontStyle: 'bold', textColor: [14, 116, 144] },
            2: { cellWidth: 22, halign: 'center' },
            3: { cellWidth: 'auto' }
        }
    });

    y = (doc as any).lastAutoTable.finalY + 3.5;

    // Vehicle capacity advisory if party > 6
    if (guestCount > 6) {
        doc.setFont(activeFont, 'italic');
        doc.setFontSize(6.2);
        doc.setTextColor(180, 83, 9);
        doc.text(`*Note: For your group of ${guestCount} guests, dedicated fleet coordination / luggage vehicle assistance is managed by Shrawello.`, margin, y);
        y += 4;
    }

    // --- BALANCED PAGE 1 ACCENT: KEY TOUR HIGHLIGHTS & QUALITY PILLARS CARD ---
    const highlightBoxH = 24;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentW, highlightBoxH, 1.2, 1.2, 'FD');

    doc.setFillColor(14, 116, 144);
    doc.rect(margin, y, 2.5, highlightBoxH, 'F');

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(14, 116, 144);
    doc.text("EXECUTIVE TOUR HIGHLIGHTS & QUALITY ASSURANCE PILLARS:", margin + 5, y + 4.5);

    const pillars = [
        { title: "Handpicked Stays", desc: `Verified 3/4-star properties with hygienic sanitization & daily ${getMealPlanShortName(tripDetails.mealPlanCode)}.` },
        { title: "Private Dedicated Fleet", desc: "Commercial permit AC vehicle, seasoned circuit chauffeur, 100% tolls, parking & fuel included." },
        { title: "Optimized Circuit Flow", desc: "Paced for spiritual relaxation, minimizing highway fatigue with strategic stops & temple timings." },
        { title: "24x7 Dedicated Concierge", desc: "Real-time on-ground coordination and direct phone support from your personal Shrawello specialist." }
    ];

    const pilW = (contentW - 14) / 2;
    pillars.forEach((p, pIdx) => {
        const row = Math.floor(pIdx / 2);
        const col = pIdx % 2;
        const px = margin + 5 + (col * (pilW + 4));
        const py = y + 8.5 + (row * 7.2);

        doc.setFont(activeFont, 'bold');
        doc.setFontSize(6.2);
        doc.setTextColor(15, 23, 42);
        doc.text(`* ${p.title}:`, px, py);

        doc.setFont(activeFont, 'normal');
        doc.setFontSize(5.8);
        doc.setTextColor(71, 85, 105);
        const descWrapped = doc.splitTextToSize(p.desc, pilW - 24);
        doc.text(descWrapped, px + 24, py);
    });

    y += highlightBoxH + 3.5;

    // Transition Note
    doc.setFont(activeFont, 'italic');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text("*Please turn to the following pages for the day-wise itinerary storybook, destination guide, and package policies.", margin, y);

    // =========================================================================
    // DAY-WISE RENDERING HELPER (Clean Typography, Collision-Free Heights)
    // =========================================================================
    function renderDayCard(dayObj: { day: number; title: string; desc: string; items: any[] }) {
        // Filter out transports from activity items
        const activityItems = (dayObj.items || []).filter(i =>
            i.type !== 'transport' &&
            i.type !== 'flight' &&
            !uniqueVehicleTitles.some(vt => cleanText(i.title || '').toLowerCase().includes(vt.toLowerCase()))
        );

        const dayHotel = (dayObj.items || []).find(i => i.type === 'hotel');
        const stayCity = dayHotel ? cleanText(dayHotel.title) : cleanText(destinationNames[Math.min(dayObj.day - 1, destinationNames.length - 1)] || destinationName);

        // Collect full text to extract insider tips and timeline items
        const fullText = (dayObj.desc || '') + '\n' + activityItems.map(a => `${a.title || ''}\n${a.description || ''}`).join('\n');

        // Bounded Insider Tip Extraction
        let insiderTip = '';
        const tipMatch = fullText.match(/(?:SHRAWELLO\s*View|Why\s*this\s*works\s*as\s*per\s*SHRAWELLO|Why\s*this\s*works|Important\s*plan\s*by\s*SHRAWELLO|Curator(?:'s)?\s*Note)[:\s]+([^\r\n]+(?:\r?\n(?![0-9]{1,2}:[0-9]{2}|DAY\s*\d|Overnight|Places\s*Covered|Hotel|[-•*])[^\r\n]+)*)/i);
        if (tipMatch) {
            let rawTip = tipMatch[1].trim();
            rawTip = rawTip.split(/(?:\bOvernight\b|\bPlaces covered\b|\bDAY\s*\d\b|\bHotel\b)/i)[0].trim();
            insiderTip = cleanText(rawTip).replace(/\s+/g, ' ');
            if (insiderTip.length > 280) {
                insiderTip = insiderTip.substring(0, 277) + '...';
            }
        }

        // Clean day title (strip redundant "DAY 1 - Sunday... : DAY 1...")
        let cleanTitle = cleanText(dayObj.title);
        cleanTitle = cleanTitle.replace(/^DAY\s*0?\d+\s*[-–:]*\s*/i, '').trim();

        // 1. Day Header Banner Pill
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.25);
        doc.roundedRect(margin, y, contentW, 6.8, 1, 1, 'FD');

        doc.setFillColor(217, 119, 6); // Amber bar
        doc.rect(margin, y, 2.5, 6.8, 'F');

        doc.setFont(activeFont, 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(15, 23, 42);
        doc.text(`DAY ${String(dayObj.day).padStart(2, '0')}  |  ${cleanTitle.toUpperCase()}`, margin + 5, y + 4.6);
        y += 8.5;

        // 2. Parse Timeline Entries (Strictly filtering out vehicles and redundant headings)
        const lines = fullText
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(l => l.length > 0);

        const timelineEntries: { time: string; text: string }[] = [];
        const seenTexts = new Set<string>();

        lines.forEach(rawLine => {
            let line = cleanText(rawLine);
            if (!line) return;

            // Skip transport/vehicle mentions in daily schedule
            if (uniqueVehicleTitles.some(vt => line.toLowerCase().includes(vt.toLowerCase())) ||
                /kia\s*carens|innova|ertiga|tempo\s*traveller|sedan|suv\s*\(capacity/i.test(line)) {
                return;
            }

            // Skip repeated Day titles or dates
            if (/^DAY\s*0?\d+/i.test(line)) return;
            if (/^(Overnight\s*Stay|Places\s*Covered|SHRAWELLO\s*View|Why\s*this\s*works|Important\s*plan|Maharashtra\s*is\s*blessed|Return\s*home)/i.test(line)) return;
            if (insiderTip && line.length > 20 && insiderTip.includes(line)) return;

            // Match time like "07:00 AM - Arrive..." or "07:00 AM - 08:30 AM: ..."
            const timeMatch = line.match(/^(\d{1,2}:\d{2}\s*(?:AM|PM)?(?:\s*[-–]\s*\d{1,2}:\d{2}\s*(?:AM|PM)?)?)\s*[-–:]*\s*(.*)$/i);
            let time = '';
            let text = line;
            if (timeMatch) {
                time = timeMatch[1].trim();
                text = timeMatch[2].trim();
            }

            // Remove leading hyphens or bullets
            text = text.replace(/^[-•*–\s]+/, '').trim();
            if (!text) return;

            // Skip duplicate entries
            const key = (time + text).toLowerCase();
            if (seenTexts.has(key)) return;
            seenTexts.add(key);

            timelineEntries.push({ time, text });
        });

        // Render Timeline Nodes (Expanded to 8 items so afternoon sights aren't dropped)
        const maxEntriesToRender = Math.min(timelineEntries.length, 8);
        for (let eIdx = 0; eIdx < maxEntriesToRender; eIdx++) {
            const entry = timelineEntries[eIdx];

            // Draw milestone circle
            doc.setFillColor(14, 116, 144);
            doc.circle(margin + 4, y - 0.6, 0.9, 'F');

            if (entry.time) {
                doc.setFont(activeFont, 'bold');
                doc.setFontSize(6.4);
                doc.setTextColor(14, 116, 144);
                doc.text(entry.time, margin + 7.5, y);

                doc.setFont(activeFont, 'normal');
                doc.setFontSize(6.3);
                doc.setTextColor(51, 65, 85);
                const wrapped = doc.splitTextToSize(entry.text, contentW - 38);
                doc.text(wrapped, margin + 34, y);
                y += (wrapped.length * 2.8) + 0.8;
            } else {
                doc.setFont(activeFont, 'normal');
                doc.setFontSize(6.3);
                doc.setTextColor(51, 65, 85);
                const wrapped = doc.splitTextToSize(entry.text, contentW - 12);
                doc.text(wrapped, margin + 7.5, y);
                y += (wrapped.length * 2.8) + 0.8;
            }
        }

        if (timelineEntries.length === 0) {
            doc.setFont(activeFont, 'normal');
            doc.setFontSize(6.3);
            doc.setTextColor(51, 65, 85);
            doc.text("Arrival, check-in at hotel, freshen up and relax. Later proceed for local sightseeing and evening Aarti.", margin + 7.5, y);
            y += 3.5;
        }

        // 3. Render Curator's Note Card (DYNAMIC HEIGHT PREVENTS ANY TEXT OVERLAP)
        if (insiderTip) {
            const wrappedTip = doc.splitTextToSize(insiderTip, contentW - 16);
            const dynamicTipH = Math.max(9, (wrappedTip.length * 2.7) + 6.2);

            doc.setFillColor(255, 251, 235); // Amber-50
            doc.setDrawColor(253, 230, 138); // Amber-200
            doc.setLineWidth(0.2);
            doc.roundedRect(margin + 4, y, contentW - 8, dynamicTipH, 1, 1, 'FD');

            doc.setFillColor(217, 119, 6);
            doc.rect(margin + 4, y, 1.5, dynamicTipH, 'F');

            doc.setFont(activeFont, 'bold');
            doc.setFontSize(5.8);
            doc.setTextColor(180, 83, 9);
            doc.text("SHRAWELLO CURATOR'S NOTE", margin + 8, y + 3.4);

            doc.setFont(activeFont, 'italic');
            doc.setFontSize(5.8);
            doc.setTextColor(71, 85, 105);
            doc.text(wrappedTip, margin + 8, y + 6.8);

            y += dynamicTipH + 2.5; // Advances y past the FULL dynamic box height!
        }

        // 4. Overnight Stay Pill
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin + 4, y, contentW - 8, 4.8, 0.8, 0.8, 'FD');

        doc.setFont(activeFont, 'bold');
        doc.setFontSize(5.8);
        doc.setTextColor(14, 116, 144);
        doc.text(`🏨 Overnight Stay: ${stayCity}`, margin + 7, y + 3.3);

        y += 7.5;
    }

    // Split Days evenly: Page 2 (Days 1 to splitDay) and Page 3 (Days splitDay+1 to end)
    const splitDay = Math.ceil(itineraryList.length / 2);
    const page2Days = itineraryList.slice(0, splitDay);
    const page3Days = itineraryList.slice(splitDay);

    // =========================================================================
    // PAGE 2: DAY-WISE ITINERARY (FIRST HALF)
    // =========================================================================
    doc.addPage();
    drawPageDecorations(doc);
    y = 19;

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("Day-Wise Experience Storybook (Part I)", margin, y);
    y += 4.5;

    page2Days.forEach(dayObj => {
        renderDayCard(dayObj);
    });

    // =========================================================================
    // PAGE 3: DAY-WISE ITINERARY (SECOND HALF) & TRAVEL GUIDE
    // =========================================================================
    doc.addPage();
    drawPageDecorations(doc);
    y = 19;

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("Day-Wise Experience Storybook (Part II)", margin, y);
    y += 4.5;

    page3Days.forEach(dayObj => {
        renderDayCard(dayObj);
    });

    // Short Local Travel Guide (Distance & Transit Matrix)
    doc.setFont(activeFont, 'bold');
    doc.setFontSize(8.0);
    doc.setTextColor(15, 23, 42);
    doc.text("Short Local Travel Guide (Distance & Transit Matrix):", margin, y);
    y += 2.5;

    let travelGuideRows: string[][] = [];

    if (isMaharashtra) {
        travelGuideRows = [
            ['Day 1', 'Pune -> Bhimashankar Hotel -> Darshan & Gupt Bhimashankar', '~115-130 Km', '3-4 Hrs driving + Local sightseeing'],
            ['Day 2', 'Bhimashankar -> Ellora Caves & Kailasa Temple -> Grishneshwar', '~240-265 Km', '5-6 Hrs driving + Ellora sightseeing'],
            ['Day 3', 'Grishneshwar Darshan -> Ajanta Caves (Optional) -> Shirdi', '~220-250 Km', '5-6 Hrs driving + Sightseeing'],
            ['Day 4', 'Shirdi Sai Baba Darshan -> Nashik Sightseeing -> Trimbakeshwar', '~115-135 Km', '3-4 Hrs driving + Temple darshan'],
            ['Day 5', 'Trimbakeshwar Darshan -> Mumbai Hotel -> City Sightseeing', '~175-195 Km', '4-5 Hrs driving + City leisure'],
            ['Day 6', 'Mumbai Hotel -> Siddhivinayak Darshan -> Railway Station Drop', '~35-50 Km', 'Local transfer + Departure buffer'],
            ['Total', 'Complete Maharashtra Jyotirlinga & Heritage Circuit', '~900-1025 Km', `${tripDetails.days} Days / ${tripDetails.nights} Nights`]
        ];
    } else if (isVaranasi) {
        travelGuideRows = [
            ['Day 1', `${destinationNames[0] || 'Varanasi'} Airport -> Hotel -> Local Darshan & Sightseeing`, '~40-50 Km', 'Local sightseeing / 3-4 Hrs excluding darshan'],
            ['Day 2', `${destinationNames[0] || 'Varanasi'} Local Sightseeing -> Sarnath -> Hotel`, '~55-70 Km', 'Full Day Local Sightseeing'],
            ['Day 3', `${destinationNames[0] || 'Varanasi'} -> ${destinationNames[1] || 'Prayagraj'} Local Sightseeing & Sangam`, '~145-165 Km', '4-5 Hrs driving excluding sightseeing/darshan'],
            ['Day 4', `${destinationNames[1] || 'Prayagraj'} -> Chitrakoot Sightseeing -> ${destinationNames[2] || 'Ayodhya'}`, '~410-440 Km', '9-11 Hrs driving excluding sightseeing'],
            ['Day 5', `${destinationNames[2] || 'Ayodhya'} -> Mandir Darshan -> Airport Transfer`, '~225-245 Km', '5-6 Hrs driving excluding darshan'],
            ['Total', 'Complete Tour including local sightseeing', '~875-970 Km', `${tripDetails.days} Days / ${tripDetails.nights} Nights`]
        ];
    } else {
        travelGuideRows = itineraryList.slice(0, 5).map((d, i) => {
            const fromCity = destinationNames[i] || destinationNames[0] || 'Origin';
            const toCity = destinationNames[i + 1] || destinationNames[i] || 'Destination';
            return [
                `Day ${d.day}`,
                `${fromCity} -> ${toCity} Sightseeing & Local Transfers`,
                '~60-120 Km',
                'Driving & Sightseeing'
            ];
        });
        travelGuideRows.push([
            'Total',
            'Complete Circuit including all transfers & sightseeing',
            '~600-850 Km',
            `${tripDetails.days} Days / ${tripDetails.nights} Nights`
        ]);
    }

    autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        theme: 'grid',
        pageBreak: 'avoid',
        head: [['Day', 'Route / Sacred Circuit', 'Approx. Distance', 'Estimated Travel Time']],
        body: travelGuideRows,
        styles: { fontSize: 6.4, font: activeFont, textColor: [30, 41, 59], cellPadding: 2.2, lineColor: [203, 213, 225], lineWidth: 0.2 },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], font: activeFont, fontStyle: 'bold', fontSize: 6.8, cellPadding: 2.2 },
        columnStyles: {
            0: { cellWidth: 16, halign: 'center', font: activeFont, fontStyle: 'bold', textColor: [14, 116, 144] },
            1: { cellWidth: 80, fontStyle: 'normal' },
            2: { cellWidth: 30, halign: 'center' },
            3: { cellWidth: 'auto' }
        }
    });

    // --- BALANCED PAGE 3 ACCENT: CIRCUIT DRIVING ADVISORY & TRANSIT BUFFERS CARD ---
    const guideEndY = (doc as any).lastAutoTable.finalY + 3.5;
    const drivingBoxH = 22;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.roundedRect(margin, guideEndY, contentW, drivingBoxH, 1, 1, 'FD');

    doc.setFillColor(14, 116, 144);
    doc.rect(margin, guideEndY, 2, drivingBoxH, 'F');

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(14, 116, 144);
    doc.text("CIRCUIT DRIVING PROTOCOL & RECOMMENDED TIMING BUFFERS:", margin + 5, guideEndY + 4.5);

    const driveTips = [
        "• Early Morning Temple Hours: We strongly recommend 05:30 AM - 07:00 AM starts to minimize queue waiting times.",
        "• Highway & Ghat Safety: Driving times account for ghat hairpin speed limits and recommended refreshment stops.",
        "• Return Departure Punctuality: Departure transfer to Mumbai/Pune includes an essential 2-hour peak-traffic safety buffer."
    ];

    driveTips.forEach((dt, dtIdx) => {
        doc.setFont(activeFont, 'normal');
        doc.setFontSize(6.0);
        doc.setTextColor(71, 85, 105);
        doc.text(dt, margin + 5, guideEndY + 9.5 + (dtIdx * 4.4));
    });

    // =========================================================================
    // PAGE 4: PACKAGE DELIVERABLES, DESTINATION ADVISORY & OPTIONAL SERVICES
    // =========================================================================
    doc.addPage();
    drawPageDecorations(doc);
    y = 19;

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("Package Deliverables & Destination Advisory", margin, y);
    y += 4.5;

    // DUAL-COLUMN BENTO: INCLUSIONS VS EXCLUSIONS (Clean 50mm height hugs list tightly)
    const colW = (contentW - 4) / 2;
    const incExcH = 50;

    // Left: Inclusions Card
    doc.setFillColor(240, 253, 244); // Emerald-50
    doc.setDrawColor(187, 247, 208); // Emerald-200
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, colW, incExcH, 1.2, 1.2, 'FD');

    doc.setFillColor(5, 150, 105); // Emerald-600 header
    doc.roundedRect(margin, y, colW, 6, 1.2, 1.2, 'F');
    doc.rect(margin, y + 4.5, colW, 1.5, 'F');

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text("[+] WHAT IS INCLUDED IN YOUR PACKAGE", margin + 4, y + 4.2);

    let incY = y + 9.2;
    const baseInclusions = [
        `${String(tripDetails.nights).padStart(2, '0')} Nights stay in verified 3/4-Star category hotels.`,
        `${String(roomsCount).padStart(2, '0')} Deluxe Rooms on ${tripDetails.roomSharing || 'Quad'} Sharing for ${guestCount} guests.`,
        `Daily ${getMealPlanShortName(tripDetails.mealPlanCode)} (${tripDetails.mealPlanCode || 'CP'}) as per hotel plan.`,
        `Dedicated Private ${cleanText(vehicleSummary)} for all 6 days.`,
        `Pune Station pickup and Mumbai Station drop included.`,
        `Intercity transfers and all confirmed temple sightseeing.`,
        `Driver allowance, fuel charges, intercity tolls & parking.`,
        `All interstate road taxes and hotel taxes included.`
    ];

    const activeInclusions = (tripDetails.included && tripDetails.included.length > 0)
        ? Array.from(new Set([...baseInclusions, ...tripDetails.included.map(cleanText)]))
        : baseInclusions;

    activeInclusions.slice(0, 8).forEach(incItem => {
        doc.setFont(activeFont, 'bold');
        doc.setFontSize(6.4);
        doc.setTextColor(5, 150, 105);
        doc.text("*", margin + 3.5, incY);

        doc.setFont(activeFont, 'normal');
        doc.setFontSize(6.0);
        doc.setTextColor(30, 41, 59);
        const wrapped = doc.splitTextToSize(incItem, colW - 9);
        doc.text(wrapped, margin + 7, incY);
        incY += (wrapped.length * 2.8) + 1.2;
    });

    // Right: Exclusions Card
    const excX = margin + colW + 4;
    doc.setFillColor(254, 242, 242); // Rose-50
    doc.setDrawColor(254, 202, 202); // Rose-200
    doc.setLineWidth(0.3);
    doc.roundedRect(excX, y, colW, incExcH, 1.2, 1.2, 'FD');

    doc.setFillColor(71, 85, 105); // Slate-600 header
    doc.roundedRect(excX, y, colW, 6, 1.2, 1.2, 'F');
    doc.rect(excX, y + 4.5, colW, 1.5, 'F');

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text("[-] WHAT IS EXCLUDED FROM YOUR PACKAGE", excX + 4, y + 4.2);

    let excY = y + 9.2;
    const baseExclusions = [
        `5% GST as per Government of India regulations.`,
        `Temple VIP Sugam Darshan tickets & special Pooja fees.`,
        `Flight tickets and Train reservations unless requested.`,
        `Camera / videography fees and monument entry fees.`,
        `Personal expenses (laundry, room service, tips, minibar).`,
        `Any adventure sports or activities not listed in itinerary.`,
        `Extra running of vehicle outside confirmed tour circuit.`,
        `Medical insurance or unexpected emergency expenses.`
    ];

    const activeExclusions = (tripDetails.notIncluded && tripDetails.notIncluded.length > 0)
        ? Array.from(new Set([...baseExclusions, ...tripDetails.notIncluded.map(cleanText)]))
        : baseExclusions;

    activeExclusions.slice(0, 8).forEach(excItem => {
        doc.setFont(activeFont, 'bold');
        doc.setFontSize(6.4);
        doc.setTextColor(220, 38, 38);
        doc.text("x", excX + 3.5, excY);

        doc.setFont(activeFont, 'normal');
        doc.setFontSize(6.0);
        doc.setTextColor(51, 65, 85);
        const wrapped = doc.splitTextToSize(excItem, colW - 9);
        doc.text(wrapped, excX + 7, excY);
        excY += (wrapped.length * 2.8) + 1.2;
    });

    y += incExcH + 5;

    // Sacred Destination Timings (2x2 Grid with rich dress code guidance)
    doc.setFont(activeFont, 'bold');
    doc.setFontSize(8.0);
    doc.setTextColor(15, 23, 42);
    doc.text("Sacred Destination Timings & Temple Decorum:", margin, y);
    y += 3;

    const templeCardW = (contentW - 3) / 2;
    const templeCardH = 22;

    const templeCards = [
        {
            title: 'Shri Saibaba Sansthan (Shirdi)',
            timings: 'Darshan: 06:00 AM - 10:00 PM | Kakad Aarti: 04:30 AM',
            note: 'Sugam Darshan passes bookable online. Mobile phones deposited outside.'
        },
        {
            title: 'Bhimashankar Jyotirlinga (Pune Hills)',
            timings: 'Darshan: 04:30 AM - 12:00 PM & 04:00 PM - 09:30 PM',
            note: 'Morning Aarti: 04:30 AM. Modest traditional attire recommended for inner sanctum.'
        },
        {
            title: 'Trimbakeshwar Jyotirlinga (Nashik)',
            timings: 'Darshan: 05:30 AM - 09:00 PM | Special Pooja assistance available',
            note: 'Men enter Garbhagriha in Dhoti/Sovale. Unique three-faced Linga & Godavari origin.'
        },
        {
            title: 'Grishneshwar & Ellora Caves',
            timings: 'Grishneshwar: 05:30 AM - 09:30 PM | Ellora: 06:00 AM - 06:00 PM',
            note: 'Men enter inner sanctum bare-chested/dhoti. Note: Ellora is closed on Tuesdays.'
        }
    ];

    templeCards.forEach((tc, tIdx) => {
        const row = Math.floor(tIdx / 2);
        const col = tIdx % 2;
        const tx = margin + (col * (templeCardW + 3));
        const ty = y + (row * (templeCardH + 2.5));

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.25);
        doc.roundedRect(tx, ty, templeCardW, templeCardH, 1, 1, 'FD');

        doc.setFillColor(14, 116, 144);
        doc.rect(tx, ty, 2, templeCardH, 'F');

        doc.setFont(activeFont, 'bold');
        doc.setFontSize(6.6);
        doc.setTextColor(15, 23, 42);
        doc.text(tc.title, tx + 4.5, ty + 4.8);

        doc.setFont(activeFont, 'normal');
        doc.setFontSize(5.8);
        doc.setTextColor(71, 85, 105);
        doc.text(tc.timings, tx + 4.5, ty + 10.2);

        doc.setFont(activeFont, 'italic');
        doc.setFontSize(5.6);
        doc.setTextColor(180, 83, 9);
        const wrappedNote = doc.splitTextToSize(tc.note, templeCardW - 7);
        doc.text(wrappedNote, tx + 4.5, ty + 15.5);
    });

    y += (2 * (templeCardH + 2.5)) + 4;

    // Optional Concierge Upgrades Table
    doc.setFont(activeFont, 'bold');
    doc.setFontSize(8.0);
    doc.setTextColor(15, 23, 42);
    doc.text("Optional Concierge & Destination Services:", margin, y);
    y += 2.5;

    const optServices = [
        ['Shirdi Sai Baba VIP / Sugam Darshan Assistance', 'Rs. 500 / Person'],
        ['Trimbakeshwar Special Pooja / Abhishek Assistance', 'Rs. 1,500 / Person'],
        ['Government Authorized Guide for Ellora Caves & Kailasa Temple (Half Day)', 'Rs. 1,800 / Group'],
        ['Mumbai Gateway of India Harbour Boat Ride (Private Boat)', 'Rs. 2,500 / Boat']
    ];

    autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        theme: 'grid',
        pageBreak: 'avoid',
        head: [['Curated Optional Service', 'Investment / Rate']],
        body: optServices,
        styles: { fontSize: 6.4, font: activeFont, textColor: [30, 41, 59], cellPadding: 2.0, lineColor: [203, 213, 225], lineWidth: 0.2 },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], font: activeFont, fontStyle: 'bold', fontSize: 6.8, cellPadding: 2.0 },
        columnStyles: {
            0: { cellWidth: 'auto', fontStyle: 'normal' },
            1: { cellWidth: 50, halign: 'center', font: activeFont, fontStyle: 'bold', textColor: [180, 83, 9] }
        }
    });

    // --- BALANCED PAGE 4 ACCENT: 24X7 VIP SUPPORT & GUEST ASSURANCE CARD ---
    const optEndY = (doc as any).lastAutoTable.finalY + 4;
    const supportCardH = 21;

    doc.setFillColor(240, 253, 250); // Cyan-50
    doc.setDrawColor(204, 251, 241); // Cyan-200
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, optEndY, contentW, supportCardH, 1.2, 1.2, 'FD');

    doc.setFillColor(14, 116, 144);
    doc.rect(margin, optEndY, 2.5, supportCardH, 'F');

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(14, 116, 144);
    doc.text("SHRAWELLO 24X7 ON-GROUND VIP ASSURANCE & SAFETY PROTOCOL:", margin + 5, optEndY + 4.5);

    doc.setFont(activeFont, 'normal');
    doc.setFontSize(5.9);
    doc.setTextColor(51, 65, 85);
    doc.text("• Driver Briefing: Experienced circuit chauffeur assigned with route clearance and GPS telemetry.", margin + 5, optEndY + 9.5);
    doc.text("• Transparent Fixed Pricing: Zero hidden charges. All vehicle fuel, intercity permits, parking & night stay included.", margin + 5, optEndY + 14.0);
    doc.text("• Emergency Helpline: 24/7 dedicated escalation desk active throughout your journey (Direct: +91 94234 15764).", margin + 5, optEndY + 18.5);

    // =========================================================================
    // PAGE 5: COMMERCIALS, PAYMENT HUB, POLICIES & FORMAL CONFIRMATION
    // =========================================================================
    doc.addPage();
    drawPageDecorations(doc);
    y = 19;

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("Commercials, Payment Policies & Official Authorisation", margin, y);
    y += 4.5;

    // 1. Executive Investment Card
    const investH = 18;
    doc.setFillColor(15, 23, 42); // Slate-900
    doc.roundedRect(margin, y, contentW, investH, 1.2, 1.2, 'F');

    doc.setFillColor(217, 119, 6);
    doc.rect(margin, y, 2.5, investH, 'F');

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(245, 158, 11); // Amber-400
    doc.text("TOTAL PACKAGE INVESTMENT", margin + 6, y + 5.5);

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(`Rs. ${Math.round(finalPrice).toLocaleString('en-IN')}/-`, margin + 6, y + 12);

    doc.setFont(activeFont, 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(203, 213, 225);
    doc.text(`All-inclusive tour quotation for ${guestCount} Guests (${tripDetails.nights} Nights / ${tripDetails.days} Days)  •  Rs. ${pricePerPax.toLocaleString('en-IN')} per Guest`, margin + 55, y + 12);

    doc.setFont(activeFont, 'italic');
    doc.setFontSize(5.8);
    doc.setTextColor(148, 163, 184);
    doc.text("Quotation valid for 3 days from date of issue. Subject to room & vehicle availability at time of booking.", margin + 6, y + 16);

    y += investH + 4.5;

    // 2. Official Bank Details & UPI QR Card
    const bankCardH = 28;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentW, bankCardH, 1.2, 1.2, 'FD');

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(14, 116, 144);
    doc.text("Official Bank Transfer & UPI Payment Hub:", margin + 5, y + 5.5);

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(6.6);
    doc.setTextColor(15, 23, 42);
    doc.text("Bank Name:", margin + 5, y + 11.5);
    doc.setFont(activeFont, 'normal');
    doc.text("KOTAK MAHINDRA BANK", margin + 35, y + 11.5);

    doc.setFont(activeFont, 'bold');
    doc.text("Beneficiary:", margin + 5, y + 16.5);
    doc.setFont(activeFont, 'normal');
    doc.text("SHRAWELLO TRAVEL HUB AND EVENTS LLP", margin + 35, y + 16.5);

    doc.setFont(activeFont, 'bold');
    doc.text("Account No:", margin + 5, y + 21.5);
    doc.setFont(activeFont, 'bold');
    doc.setTextColor(14, 116, 144);
    doc.text("4054789256", margin + 35, y + 21.5);

    doc.setFont(activeFont, 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text("IFSC Code:", margin + 5, y + 26.5);
    doc.setFont(activeFont, 'bold');
    doc.setTextColor(14, 116, 144);
    doc.text("KKBK0002119", margin + 35, y + 26.5);

    // Draw QR Code on right if present
    if (bankQrBase64) {
        try {
            doc.addImage(bankQrBase64, 'JPEG', margin + contentW - 26, y + 3, 22, 22, undefined, 'FAST');
        } catch {}
    }

    y += bankCardH + 4.5;

    // 3. Payment Milestones & Cancellation Timeline
    doc.setFont(activeFont, 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(15, 23, 42);
    doc.text("Payment Schedule & Cancellation Terms:", margin, y);
    y += 3;

    const cancelW = (contentW - 6) / 4;
    const cancelH = 15;
    const cancelTiers = [
        { days: '30+ Days Before', fee: '10% Fee', sub: 'Standard service fee', col: [16, 185, 129] as [number, number, number] },
        { days: '15 - 29 Days', fee: '25% Cancellation', sub: 'Of total package value', col: [217, 119, 6] as [number, number, number] },
        { days: '7 - 14 Days', fee: '50% Cancellation', sub: 'Of total package value', col: [234, 88, 12] as [number, number, number] },
        { days: 'Under 7 Days', fee: '100% Non-refundable', sub: 'Or No-show', col: [220, 38, 38] as [number, number, number] },
    ];

    cancelTiers.forEach((ct, cIdx) => {
        const cx = margin + (cIdx * (cancelW + 2));
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.25);
        doc.roundedRect(cx, y, cancelW, cancelH, 1, 1, 'FD');

        doc.setFillColor(ct.col[0], ct.col[1], ct.col[2]);
        doc.rect(cx, y, cancelW, 1.2, 'F');

        doc.setFont(activeFont, 'bold');
        doc.setFontSize(5.8);
        doc.setTextColor(71, 85, 105);
        doc.text(ct.days, cx + (cancelW / 2), y + 4.8, { align: 'center' });

        doc.setFont(activeFont, 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(ct.col[0], ct.col[1], ct.col[2]);
        doc.text(ct.fee, cx + (cancelW / 2), y + 9.5, { align: 'center' });

        doc.setFont(activeFont, 'normal');
        doc.setFontSize(5.2);
        doc.setTextColor(100, 116, 139);
        doc.text(ct.sub, cx + (cancelW / 2), y + 13, { align: 'center' });
    });

    y += cancelH + 4.5;

    // 4. Essential Tour Guidelines (Clean Bullets)
    doc.setFont(activeFont, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text("Essential Tour Guidelines:", margin, y);
    y += 3;

    const guidelines = [
        "* Government IDs: Original Aadhaar Card / Passport required for all travelers at hotel check-in.",
        "* Luggage Capacity: Request travelers to maintain comfortable luggage as per vehicle luggage boot space.",
        "* Hill & Ghat Section: AC will not be operational in steep uphill sections for engine performance & safety.",
        "* Meal Plans: Meals operate on fixed menus (Buffet or Room Service) as per hotelier scheduled dining hours."
    ];

    guidelines.forEach(gl => {
        doc.setFont(activeFont, 'normal');
        doc.setFontSize(6.2);
        doc.setTextColor(51, 65, 85);
        doc.text(gl, margin + 2, y);
        y += 3.2;
    });

    y += 4;

    // 5. Dual Sign-off & Confirmation Block
    const signBoxW = (contentW - 4) / 2;
    const signBoxH = 26;

    // Left: Agency Sign-off
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, signBoxW, signBoxH, 1, 1, 'FD');

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(14, 116, 144);
    doc.text("PREPARED BY TRAVEL SPECIALIST", margin + 4, y + 4.8);

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(15, 23, 42);
    doc.text("Manali Sankpal", margin + 4, y + 10.5);

    doc.setFont(activeFont, 'normal');
    doc.setFontSize(6.0);
    doc.setTextColor(71, 85, 105);
    doc.text("Senior Travel Specialist • Shrawello Tours", margin + 4, y + 15);
    doc.text("Direct Contact: +91 80109 55675  |  hello@shrawello.com", margin + 4, y + 19.5);
    doc.text("Shrawello Travel Hub & Events LLP", margin + 4, y + 23.5);

    // Right: Client Acceptance Box
    const clientSignX = margin + signBoxW + 4;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(clientSignX, y, signBoxW, signBoxH, 1, 1, 'FD');

    doc.setFont(activeFont, 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text("CLIENT ACCEPTANCE & APPROVAL", clientSignX + 4, y + 4.8);

    doc.setFont(activeFont, 'normal');
    doc.setFontSize(6.0);
    doc.setTextColor(71, 85, 105);
    doc.text(`Guest: ${cleanText(tripDetails.clientName || 'Valued Client')}`, clientSignX + 4, y + 10.5);
    doc.text("Signature: ____________________________________", clientSignX + 4, y + 17);
    doc.text("Date: _________________________________________", clientSignX + 4, y + 22.5);

    // =========================================================================
    // TWO-PASS PAGE NUMBERING (Guarantees Page 1 of 5 without placeholder bug)
    // =========================================================================
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont(activeFont, 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(15, 23, 42);
        doc.text(`Page ${p} of ${totalPages}`, pageW - margin, pageH - 7.5, { align: 'right' });
    }

    // Save PDF
    const filename = `Itinerary_${(tripDetails.title || 'Trip').replace(/\s+/g, '_')}_${tripDetails.startDate || 'draft'}.pdf`;
    doc.save(filename);
};
