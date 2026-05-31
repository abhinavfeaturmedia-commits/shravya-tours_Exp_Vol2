import React, { useState } from 'react';
import { useItinerary } from '../ItineraryContext';
import { useData } from '../../../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { Package } from '../../../types';
import { Save, ArrowLeft, MapPin, Calendar, Users, Printer, Share2, Check, DollarSign, ArrowRight, Loader2, Hotel, Car, FileText, Receipt, Tag, Clock, Download } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
    onBack?: () => void;
    onSaved?: () => void;
}

export const StepReview: React.FC<Props> = ({ onBack, onSaved }) => {
    const {
        tripDetails, items, grandTotal,
        packageMarkupPercent, packageMarkupFlat, packageMarkupAmount,
        setPackageMarkup, formatCurrency,
        editPackageId, setEditPackageId, currency, taxConfig, dayMeta, subtotal
    } = useItinerary();

    const { addPackage, updatePackage, masterLocations } = useData();
    const navigate = useNavigate();
    const [isSaving, setIsSaving] = useState(false);

    const guestCount = (tripDetails.adults || 0) + (tripDetails.children || 0);
    const finalPrice = grandTotal;

    // Per-pax breakdown (Fix #8)
    const pricePerAdult = tripDetails.adults > 0 ? Math.round(finalPrice / tripDetails.adults) : 0;
    const pricePerPax = guestCount > 0 ? Math.round(finalPrice / guestCount) : 0;

    // Valid until calculation (Fix #15)
    const validityDays = tripDetails.validityDays ?? 7;
    const validUntilDate = validityDays > 0 && tripDetails.startDate
        ? (() => {
            const d = new Date();
            d.setDate(d.getDate() + validityDays);
            return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        })()
        : null;

    const accommodations = items.filter(i => i.type === 'hotel').sort((a, b) => a.day - b.day);
    const transports = items.filter(i => i.type === 'transport' || i.type === 'flight').sort((a, b) => a.day - b.day);

    // Resolve destination ID → human-readable name
    const destinationName = masterLocations?.find(l => String(l.id) === String(tripDetails.destination))?.name
        || tripDetails.destination
        || 'Paradise';

    const generatePackageItinerary = () => {
        const days = Array.from({ length: tripDetails.days }, (_, i) => i + 1);
        return days.map(day => {
            const dayItems = items.filter(i => i.day === day);
            const desc = dayItems.length === 0
                ? 'Leisure day for personal exploration.'
                : dayItems
                    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                    .map(item => `• ${item.time ? item.time + ': ' : ''}${item.title}${item.description ? ' - ' + item.description : ''}`)
                    .join('\n');
            // Fix 2.3b: use editable dayMeta.theme if set, else use first activity title as label
            const dayTheme = (dayMeta[day] as any)?.theme
                || dayItems.find(i => i.type === 'activity')?.title
                || (day === 1 ? 'Arrival' : `Day ${day} Itinerary`);
            return { day, title: dayTheme, desc, items: dayItems };
        });
    };

    const handleSave = async () => {
        if (isSaving) return;
        if (!tripDetails.title) { toast.error('Trip title is missing!'); return; }
        if (!tripDetails.startDate) { toast.error('Start Date is missing!'); return; }
        if (items.length === 0) { toast.error('Your itinerary has no items!'); return; }
        setIsSaving(true);

        try {
            const dayImages = Object.values(dayMeta || {}).map((m: any) => m.image).filter(Boolean);
            const gallery = [tripDetails.coverImage, ...(tripDetails.gallery || []), ...dayImages]
                .filter((url, i, s) => url && s.indexOf(url) === i);

            const packageData: Partial<Package> = {
                title: tripDetails.title,
                days: tripDetails.days,
                groupSize: String(guestCount),
                location: destinationName,
                description: `Custom itinerary for ${tripDetails.clientName || guestCount + ' Guests'}.`,
                price: finalPrice,
                image: tripDetails.coverImage,
                theme: 'Custom',
                overview: `A ${tripDetails.nights} Nights / ${tripDetails.days} Days journey to ${destinationName}.`,
                highlights: items.slice(0, 4).map(i => ({ icon: 'star', label: i.title })),
                itinerary: generatePackageItinerary(),
                gallery,
                status: 'Active',
                included: tripDetails.included || [],
                notIncluded: tripDetails.notIncluded || [],
                // V2 columns — persisted directly to DB
                itinerary_status: tripDetails.itineraryStatus || 'Draft',
                client_name: tripDetails.clientName || null,
                client_id: tripDetails.clientId || null,
                validity_date: validityDays > 0
                    ? (() => { const d = new Date(); d.setDate(d.getDate() + validityDays); return d.toISOString().split('T')[0]; })()
                    : null,
                terms_and_conditions: tripDetails.termsAndConditions || null,
                builderData: { tripDetails, items, dayMeta, currency, taxConfig, packageMarkupPercent, packageMarkupFlat },
            } as any;

            if (editPackageId) {
                await updatePackage(editPackageId, packageData);
            } else {
                const created = await addPackage(packageData as Package);
                if (created?.id) {
                    setEditPackageId(created.id);
                }
            }

            toast.success(editPackageId ? 'Itinerary updated!' : 'Itinerary saved as package!');
            onSaved?.();
        } catch (err: any) {
            toast.error(`Save failed: ${err?.message || 'Unknown error. Please try again.'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleConvertToBooking = () => {
        if (!editPackageId) {
            toast.error('Save the package first, then convert to booking.');
            return;
        }
        sessionStorage.setItem('booking_quick_create', JSON.stringify({
            title: tripDetails.title,
            amount: finalPrice,
            guests: `${(tripDetails.adults || 0) + (tripDetails.children || 0)} Guests`,
            date: tripDetails.startDate,
            packageId: editPackageId,
            type: 'Tour',
            clientName: tripDetails.clientName || ''
        }));
        navigate('/admin/bookings');
        toast.success('Opening bookings — package details pre-filled.');
    };

    // Fix #11 — Generate Invoice from itinerary
    const handleGenerateInvoice = () => {
        if (!editPackageId) {
            toast.error('Save the itinerary first, then generate an invoice.');
            return;
        }
        sessionStorage.setItem('invoice_quick_create', JSON.stringify({
            title: tripDetails.title,
            clientName: tripDetails.clientName || '',
            amount: finalPrice,
            description: `Travel Itinerary: ${tripDetails.title} — ${tripDetails.nights}N/${tripDetails.days}D to ${destinationName}`,
            packageId: editPackageId,
            adults: tripDetails.adults,
            children: tripDetails.children,
            startDate: tripDetails.startDate,
        }));
        navigate('/admin/invoices/new');
        toast.success('Opening Invoice Editor — details pre-filled from itinerary.');
    };

    const handleDownloadPDF = async () => {
        const toastId = toast.loading('Generating premium PDF... Please wait.');
        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            const margin = 15;
            
            // Dynamic Page X of Y total page placeholder
            const totalPagesExp = "{total_pages_count_string}";

            // Asynchronous dynamic image loader helper to bypass CORS / local fetch hurdles
            const loadImageBase64 = (url: string): Promise<string> => {
                return new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.onload = function () {
                        const reader = new FileReader();
                        reader.onloadend = function () {
                            resolve(reader.result as string);
                        };
                        reader.readAsDataURL(xhr.response);
                    };
                    xhr.onerror = function (e) {
                        reject(e);
                    };
                    xhr.open('GET', url);
                    xhr.responseType = 'blob';
                    xhr.send();
                });
            };

            let coverImgBase64: string | null = null;
            if (tripDetails.coverImage) {
                try {
                    coverImgBase64 = await loadImageBase64(tripDetails.coverImage);
                } catch (e) {
                    console.error("Cover image load failed, using dynamic vector fallback:", e);
                }
            }

            // Brand Colors
            const brandColor: [number, number, number] = [15, 23, 42]; // Slate-900 (ultra premium dark slate)
            const accentColor: [number, number, number] = [180, 83, 9]; // Gold/Amber-700
            const textDark: [number, number, number] = [30, 41, 59]; // Slate-800
            const textLight: [number, number, number] = [100, 116, 139]; // Slate-500
            const borderLight = [226, 232, 240]; // Slate-200

            // Text sanitizer
            const cleanText = (str: string): string => {
                if (!str) return '';
                return str
                    .replace(/₹/g, 'Rs. ')
                    .replace(/•/g, '-')
                    .replace(/[✓✓]/g, '')
                    .replace(/[✗✗]/g, '')
                    .replace(/[\u2018\u2019]/g, "'")
                    .replace(/[\u201C\u201D]/g, '"')
                    .replace(/[\u2013\u2014]/g, '-')
                    .replace(/[^\x00-\x7F]/g, '');
            };

            const cleanCurrency = (val: string) => {
                return val.replace(/₹/g, 'Rs. ').replace(/[^\x00-\x7F]/g, '');
            };

            const cleanItemText = (txt: string): string => {
                if (!txt) return '';
                return txt.replace(/^[\s•\-\*✓✗\u2022]+/, '').trim();
            };

            // Custom Drawing Icon Helpers (Sharp, scalable vectors)
            const drawSuitcaseIcon = (docInstance: jsPDF, dx: number, dy: number) => {
                docInstance.setFillColor(180, 83, 9); // gold/amber
                docInstance.roundedRect(dx, dy, 7, 9, 1, 1, 'F');
                
                docInstance.setDrawColor(180, 83, 9);
                docInstance.setLineWidth(0.4);
                docInstance.line(dx + 2, dy, dx + 2, dy - 2);
                docInstance.line(dx + 5, dy, dx + 5, dy - 2);
                docInstance.line(dx + 2, dy - 2, dx + 5, dy - 2);
                
                docInstance.setFillColor(255, 255, 255);
                docInstance.circle(dx + 3.5, dy + 4.5, 0.8, 'F');
            };

            const drawCalendarIcon = (docInstance: jsPDF, dx: number, dy: number, strokeColor: [number, number, number] = [30, 41, 59]) => {
                docInstance.setDrawColor(strokeColor[0], strokeColor[1], strokeColor[2]);
                docInstance.setLineWidth(0.3);
                docInstance.rect(dx, dy, 4.5, 4);
                docInstance.setFillColor(strokeColor[0], strokeColor[1], strokeColor[2]);
                docInstance.rect(dx, dy, 4.5, 1, 'F');
                docInstance.line(dx + 1.2, dy - 0.5, dx + 1.2, dy + 0.5);
                docInstance.line(dx + 3.3, dy - 0.5, dx + 3.3, dy + 0.5);
            };

            const drawUsersIcon = (docInstance: jsPDF, dx: number, dy: number) => {
                docInstance.setFillColor(30, 41, 59);
                docInstance.circle(dx + 2.2, dy + 1.5, 1.2, 'F'); // head
                docInstance.roundedRect(dx, dy + 3, 4.4, 2, 0.6, 0.6, 'F'); // body
            };

            const drawVehicleIcon = (docInstance: jsPDF, dx: number, dy: number) => {
                docInstance.setDrawColor(30, 41, 59);
                docInstance.setLineWidth(0.3);
                docInstance.rect(dx, dy + 1.5, 5, 2.5); // body
                docInstance.rect(dx + 0.6, dy, 3.8, 1.5); // windshield
                docInstance.setFillColor(30, 41, 59);
                docInstance.circle(dx + 1.2, dy + 4, 0.6, 'F');
                docInstance.circle(dx + 3.8, dy + 4, 0.6, 'F');
            };

            const drawMealIcon = (docInstance: jsPDF, dx: number, dy: number) => {
                docInstance.setDrawColor(30, 41, 59);
                docInstance.setLineWidth(0.3);
                docInstance.circle(dx + 2.5, dy + 2.2, 1.8, 'D'); // plate
                docInstance.line(dx + 0.2, dy + 0.5, dx + 0.2, dy + 4); // fork
                docInstance.line(dx + 0.2, dy + 0.5, dx - 0.2, dy + 1.5);
                docInstance.line(dx + 0.2, dy + 0.5, dx + 0.6, dy + 1.5);
                docInstance.line(dx + 4.8, dy + 0.5, dx + 4.8, dy + 4); // knife
            };

            const drawBedIcon = (docInstance: jsPDF, dx: number, dy: number, color = [15, 23, 42]) => {
                docInstance.setDrawColor(color[0], color[1], color[2]);
                docInstance.setLineWidth(0.35);
                docInstance.line(dx, dy + 4, dx, dy); // headboard
                docInstance.line(dx + 5, dy + 4, dx + 5, dy + 2); // footboard
                docInstance.line(dx, dy + 2.5, dx + 5, dy + 2.5); // base mattress
                docInstance.setFillColor(color[0], color[1], color[2]);
                docInstance.rect(dx + 0.5, dy + 1.5, 1.5, 0.8, 'F'); // pillow
            };

            const drawMapPinIcon = (docInstance: jsPDF, dx: number, dy: number, color = [15, 23, 42]) => {
                docInstance.setFillColor(color[0], color[1], color[2]);
                docInstance.circle(dx + 2, dy + 1.8, 1.8, 'F');
                docInstance.triangle(dx + 0.4, dy + 2.5, dx + 3.6, dy + 2.5, dx + 2, dy + 4.5, 'F');
                docInstance.setFillColor(255, 255, 255);
                docInstance.circle(dx + 2, dy + 1.8, 0.6, 'F'); // inner dot
            };

            const drawCheckCircle = (docInstance: jsPDF, dx: number, dy: number) => {
                docInstance.setFillColor(16, 185, 129); // emerald-500
                docInstance.circle(dx + 2.5, dy + 2.5, 2.5, 'F');
                docInstance.setDrawColor(255, 255, 255);
                docInstance.setLineWidth(0.4);
                docInstance.line(dx + 1.5, dy + 2.5, dx + 2.2, dy + 3.3);
                docInstance.line(dx + 2.2, dy + 3.3, dx + 3.5, dy + 1.5);
            };

            const drawCrossCircle = (docInstance: jsPDF, dx: number, dy: number) => {
                docInstance.setFillColor(239, 68, 68); // rose-500
                docInstance.circle(dx + 2.5, dy + 2.5, 2.5, 'F');
                docInstance.setDrawColor(255, 255, 255);
                docInstance.setLineWidth(0.4);
                docInstance.line(dx + 1.5, dy + 1.5, dx + 3.5, dy + 3.5);
                docInstance.line(dx + 3.5, dy + 1.5, dx + 1.5, dy + 3.5);
            };

            const drawCardIcon = (docInstance: jsPDF, dx: number, dy: number) => {
                docInstance.setDrawColor(180, 83, 9);
                docInstance.setLineWidth(0.3);
                docInstance.rect(dx, dy + 0.5, 5, 3.5);
                docInstance.setFillColor(180, 83, 9);
                docInstance.rect(dx, dy + 1, 5, 0.8, 'F');
            };

            const drawInfoCircle = (docInstance: jsPDF, dx: number, dy: number) => {
                docInstance.setFillColor(59, 130, 246); // blue-500
                docInstance.circle(dx + 2.5, dy + 2.5, 2.5, 'F');
                docInstance.setFillColor(255, 255, 255);
                docInstance.circle(dx + 2.5, dy + 1.5, 0.4, 'F'); // dot of 'i'
                docInstance.setDrawColor(255, 255, 255);
                docInstance.setLineWidth(0.4);
                docInstance.line(dx + 2.5, dy + 2.3, dx + 2.5, dy + 4.0); // body of 'i'
            };

            const drawCheckmarkBadge = (docInstance: jsPDF, dx: number, dy: number) => {
                docInstance.setFillColor(209, 250, 229); // emerald-100
                docInstance.circle(dx + 2, dy - 1.2, 2, 'F');
                docInstance.setDrawColor(16, 185, 129); // emerald-500
                docInstance.setLineWidth(0.4);
                docInstance.line(dx + 1.2, dy - 1.2, dx + 1.8, dy - 0.6);
                docInstance.line(dx + 1.8, dy - 0.6, dx + 2.8, dy - 2);
            };

            const drawCrossmarkBadge = (docInstance: jsPDF, dx: number, dy: number) => {
                docInstance.setFillColor(254, 226, 226); // rose-100
                docInstance.circle(dx + 2, dy - 1.2, 2, 'F');
                docInstance.setDrawColor(239, 68, 68); // rose-500
                docInstance.setLineWidth(0.4);
                docInstance.line(dx + 1.2, dy - 2, dx + 2.8, dy - 0.4);
                docInstance.line(dx + 2.8, dy - 2, dx + 1.2, dy - 0.4);
            };

            const drawDashedLine = (docInstance: jsPDF, x1: number, y1: number, x2: number, y2: number) => {
                docInstance.setDrawColor(203, 213, 225); // slate-300
                docInstance.setLineWidth(0.35);
                docInstance.setLineDashPattern([1.5, 1.5], 0);
                docInstance.line(x1, y1, x2, y2);
                docInstance.setLineDashPattern([], 0); // reset
            };

            // Page Decoration Helper (Slim header: just gold line + validity + page)
            const drawPageDecorations = (docInstance: jsPDF, pageNum: number) => {
                // Draw warm paper background tint across the entire page
                docInstance.setFillColor(254, 253, 250); // Alabaster/Cream tint
                docInstance.rect(0, 0, pageW, pageH, 'F');

                // Draw fine gold corner framing lines (watermark accents)
                docInstance.setDrawColor(180, 83, 9);
                docInstance.setLineWidth(0.12);
                
                // Top-Left Corner Accents
                docInstance.line(8, 8, 13, 8);
                docInstance.line(8, 8, 8, 13);
                
                // Bottom-Right Corner Accents
                docInstance.line(pageW - 8, pageH - 8, pageW - 13, pageH - 8);
                docInstance.line(pageW - 8, pageH - 8, pageW - 8, pageH - 13);

                // Thin gold divider line as header
                docInstance.setDrawColor(180, 83, 9); // Gold/Amber
                docInstance.setLineWidth(0.5);
                docInstance.line(15, 18, pageW - 15, 18);

                // Validity block aligned top right
                docInstance.setFont('helvetica', 'normal');
                docInstance.setFontSize(6.5);
                docInstance.setTextColor(100, 116, 139);
                docInstance.text("QUOTE VALID UNTIL", pageW - 15, 10, { align: 'right' });
                
                docInstance.setFont('helvetica', 'bold');
                docInstance.setFontSize(8.5);
                docInstance.setTextColor(180, 83, 9);
                drawCalendarIcon(docInstance, pageW - 44, 11.5, [180, 83, 9]);
                docInstance.text(cleanText(validUntilDate || '7 Days'), pageW - 15, 15.5, { align: 'right' });

                // Footer separator and page number only (using Page X of Y alias)
                docInstance.setDrawColor(226, 232, 240);
                docInstance.setLineWidth(0.3);
                docInstance.line(15, pageH - 12, pageW - 15, pageH - 12);

                docInstance.setFont('helvetica', 'normal');
                docInstance.setFontSize(7);
                docInstance.setTextColor(180, 140, 80); // muted gold
                docInstance.text(`Page ${pageNum} of ${totalPagesExp}`, pageW - 15, pageH - 8, { align: 'right' });
            };

            const inc = tripDetails.included || [];
            const exc = tripDetails.notIncluded || [];
            const itineraryList = generatePackageItinerary();
            const totalDays = itineraryList.length;

            let currentPageNum = 1;
            drawPageDecorations(doc, currentPageNum);

            // --- PAGE 1: TITLE BLOCK, PRICING CARD, KEY STATS, WELCOME NOTE ---
            
            // A. Title Column (left side, max 115mm to avoid price card overlap)
            const titleW = pageW - 75 - 15 - 5; // ~115mm available
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(20);
            doc.setTextColor(15, 23, 42);
            const wrappedTitleText = doc.splitTextToSize(cleanText(tripDetails.title) || "Exclusive Tour Package", titleW);
            
            let currentTitleY = 26;
            doc.text(wrappedTitleText, 15, currentTitleY);
            
            const titleLines = wrappedTitleText.length;
            const subtitleY = currentTitleY + (titleLines * 7);

            // Cursive gold subtitle (wrapped to support long client names)
            doc.setFont('times', 'italic');
            doc.setFontSize(13);
            doc.setTextColor(180, 83, 9);
            const subtitleText = cleanText(tripDetails.clientName ? `${tripDetails.clientName} Custom Tour` : 'Custom Family Tour');
            const wrappedSubtitleText = doc.splitTextToSize(subtitleText, titleW);
            doc.text(wrappedSubtitleText, 15, subtitleY);
            
            const subtitleLines = wrappedSubtitleText.length;
            const pillY = subtitleY + (subtitleLines * 4.5);

            // Nights/Days pill badge (positioned dynamically below subtitle)
            doc.setFillColor(250, 249, 246);
            doc.setDrawColor(180, 83, 9);
            doc.setLineWidth(0.25);
            doc.roundedRect(15, pillY + 3, 50, 7, 1, 1, 'FD');
            drawCalendarIcon(doc, 18, pillY + 4.5, [180, 83, 9]);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(30, 41, 59);
            doc.text(`${tripDetails.nights} NIGHTS / ${tripDetails.days} DAYS`, 25, pillY + 8.5);

            // B. Total Investment Price Card (right-aligned, starts at y=22)
            const priceCardTop = 22;
            const priceCardH = 40;
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.roundedRect(pageW - 72, priceCardTop, 57, priceCardH, 2, 2, 'FD');

            // Gold accent bottom bar
            doc.setDrawColor(180, 83, 9);
            doc.setLineWidth(0.8);
            doc.line(pageW - 72, priceCardTop + priceCardH, pageW - 15, priceCardTop + priceCardH);

            // Dark header tab
            doc.setFillColor(15, 23, 42);
            doc.roundedRect(pageW - 62, priceCardTop - 2.5, 40, 5, 1, 1, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(255, 255, 255);
            doc.text("TOTAL INVESTMENT", pageW - 42, priceCardTop + 1, { align: 'center' });

            // Package price
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.setTextColor(15, 23, 42);
            doc.text(cleanCurrency(formatCurrency(finalPrice)), pageW - 43.5, priceCardTop + 13, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(148, 163, 184);
            doc.text("TOTAL PACKAGE COST", pageW - 43.5, priceCardTop + 17, { align: 'center' });

            // Dotted divider
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.25);
            for (let dX = pageW - 68; dX < pageW - 18; dX += 2) {
                doc.line(dX, priceCardTop + 21, dX + 1, priceCardTop + 21);
            }

            // Per pax price
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(180, 83, 9);
            doc.text(cleanCurrency(formatCurrency(pricePerPax)), pageW - 43.5, priceCardTop + 29, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(148, 163, 184);
            doc.text("PER PERSON", pageW - 43.5, priceCardTop + 33, { align: 'center' });

            // C. Stats Bar — positioned below both title/subtitle block AND pricing card to prevent overlaps
            const statsBarTop = Math.max(pillY + 13, priceCardTop + priceCardH + 4);
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.roundedRect(15, statsBarTop, pageW - 30, 13, 1.5, 1.5, 'FD');

            // Col 1: Guests
            drawUsersIcon(doc, 15 + 6, statsBarTop + 4);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(15, 23, 42);
            doc.text(`${guestCount}`, 15 + 12, statsBarTop + 7);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(100, 116, 139);
            doc.text("Guests", 15 + 12, statsBarTop + 10.5);

            doc.setDrawColor(226, 232, 240);
            doc.line(15 + 42, statsBarTop + 2, 15 + 42, statsBarTop + 11);

            // Col 2: Start Date
            drawCalendarIcon(doc, 15 + 42 + 6, statsBarTop + 4, [15, 23, 42]);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(15, 23, 42);
            doc.text(cleanText(tripDetails.startDate), 15 + 42 + 12, statsBarTop + 7);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(100, 116, 139);
            doc.text("Start Date", 15 + 42 + 12, statsBarTop + 10.5);

            doc.setDrawColor(226, 232, 240);
            doc.line(15 + 90, statsBarTop + 2, 15 + 90, statsBarTop + 11);

            // Col 3: Vehicle
            const firstTransport = items.find(itm => itm.day === 1 && (itm.type === 'transport' || itm.type === 'flight')) 
                || items.find(itm => itm.type === 'transport' || itm.type === 'flight');
            const vehicleName = firstTransport ? cleanText(firstTransport.title) : 'Tempo Traveller (AC)';
            drawVehicleIcon(doc, 15 + 90 + 6, statsBarTop + 4);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(15, 23, 42);
            const wrappedVehicle = doc.splitTextToSize(vehicleName, 35);
            doc.text(wrappedVehicle[0], 15 + 90 + 12, statsBarTop + 7);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(100, 116, 139);
            doc.text("Vehicle", 15 + 90 + 12, statsBarTop + 10.5);

            doc.setDrawColor(226, 232, 240);
            doc.line(15 + 138, statsBarTop + 2, 15 + 138, statsBarTop + 11);

            // Col 4: Meals
            drawMealIcon(doc, 15 + 138 + 6, statsBarTop + 4);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(15, 23, 42);
            doc.text("Breakfast", 15 + 138 + 12, statsBarTop + 7);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(100, 116, 139);
            doc.text("Included", 15 + 138 + 12, statsBarTop + 10.5);

            // Cinematic Cover Photo banner (only if a cover image is uploaded, collapsible space)
            let coverImgH = 0;
            const coverW = pageW - 30; // 180mm
            const coverTop = statsBarTop + 17;

            if (coverImgBase64) {
                try {
                    coverImgH = 26;
                    doc.addImage(coverImgBase64, 'JPEG', 15, coverTop, coverW, coverImgH, undefined, 'FAST');
                    doc.setDrawColor(180, 83, 9);
                    doc.setLineWidth(0.4);
                    doc.roundedRect(15, coverTop, coverW, coverImgH, 2, 2, 'D'); // elegant gold frame on image
                } catch (e) {
                    console.error("Failed to render cover photo inside PDF, collapsing space:", e);
                    coverImgH = 0;
                }
            }

            // E. Section Title: YOUR JOURNEY (positioned dynamically right below Cover Image or Stats Bar)
            const journeyHeaderTop = coverImgH > 0 ? (coverTop + coverImgH + 6) : (statsBarTop + 13 + 6);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(15, 23, 42);
            doc.text("YOUR JOURNEY", 15, journeyHeaderTop);
            doc.setDrawColor(180, 83, 9);
            doc.setLineWidth(0.4);
            doc.line(15, journeyHeaderTop + 2, 40, journeyHeaderTop + 2);
            doc.setDrawColor(226, 232, 240);
            doc.line(40, journeyHeaderTop + 2, pageW - 15, journeyHeaderTop + 2);

            // --- 2. VERTICAL TIMELINE GRID LOOP ---
            let y = journeyHeaderTop + 8; // start just below the section header line
            let lastCircleY: number | null = null;

            // Right badge area starts at 120mm from left — reserve 75mm for badges
            const titleMaxW = 88; // max width for day title text to avoid badge overlap

            itineraryList.forEach((d, _idx) => {
                // Dynamic description splitting — constrained to content area (circle=32mm left, 4mm right padding)
                const descW = pageW - 15 - 32 - 8; // ~150mm
                const wrappedDesc = doc.splitTextToSize(cleanText(d.desc), descW);
                const descLines = wrappedDesc.length;
                const lineH = 3.5; // 3.5mm per line at 8pt
                let descBoxH = descLines * lineH + 8; // base description box height (8mm padding)

                // Retrieve day specific notes from metadata
                const dayNotesRaw = (dayMeta[d.day] as any)?.notes || '';
                const dayNotesText = dayNotesRaw ? cleanText(dayNotesRaw).trim() : '';
                let wrappedNotes: string[] = [];
                let notesH = 0;
                if (dayNotesText) {
                    wrappedNotes = doc.splitTextToSize(`Note: ${dayNotesText}`, descW - 6);
                    notesH = wrappedNotes.length * 3.2 + 5; // notes lines + 5mm banner padding
                    descBoxH += notesH + 2.5; // add notes height + 2.5mm spacing
                }

                // Determine dynamic header layout heights before pagination check to avoid overlaps
                const titleText = doc.splitTextToSize(cleanText(d.title), titleMaxW);
                const titleLines = titleText.length;
                const titleBlockH = titleLines * 4.2;

                const dayTrans = items.find(itm => itm.day === d.day && (itm.type === 'transport' || itm.type === 'flight'));
                const transInfo = dayTrans ? cleanText(dayTrans.title) : '';
                const wrappedTrans = transInfo ? doc.splitTextToSize(transInfo, titleMaxW) : [];
                const transLines = wrappedTrans.length;
                const transBlockH = transLines > 0 ? (transLines * 3.2) + 1.5 : 0;

                const dayHotel = items.find(itm => itm.day === d.day && itm.type === 'hotel');
                const badgeMaxW = 62;
                const hotelWrapped = dayHotel ? doc.splitTextToSize(cleanText(dayHotel.title), badgeMaxW - 14) : [];
                const badgeLines = hotelWrapped.length || 1;

                const estLeftBottomY = y + 5.5 + titleBlockH + transBlockH;
                const estRightBottomY = y + 5.5 + (badgeLines * 3.5) + 0.5;
                const estCardTop = Math.max(estLeftBottomY, estRightBottomY, y + 13.5) + 1.5;
                const totalDayHeight = (estCardTop - y) + descBoxH + 5;

                // Smart Pagination boundary check
                if (y + totalDayHeight > pageH - 20) {
                    if (lastCircleY !== null) {
                        drawDashedLine(doc, 22.5, lastCircleY + 6.5, 22.5, pageH - 16);
                    }
                    doc.addPage();
                    currentPageNum++;
                    drawPageDecorations(doc, currentPageNum);

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(9);
                    doc.setTextColor(15, 23, 42);
                    doc.text(`YOUR JOURNEY (FROM DAY ${d.day})`, 15, 28);
                    doc.setDrawColor(180, 83, 9);
                    doc.setLineWidth(0.4);
                    doc.line(15, 30, 50, 30);
                    doc.setDrawColor(226, 232, 240);
                    doc.line(50, 30, pageW - 15, 30);

                    y = 38;
                    lastCircleY = null;
                }

                // A. Dashed Connector Line
                const currentCircleCenterY = y + 7;
                if (lastCircleY !== null) {
                    drawDashedLine(doc, 22.5, lastCircleY + 6.5, 22.5, y + 0.5);
                }
                lastCircleY = currentCircleCenterY;

                // B. Circle Day Badge
                doc.setDrawColor(203, 213, 225);
                doc.setLineWidth(0.35);
                doc.setFillColor(255, 255, 255);
                doc.circle(22.5, currentCircleCenterY, 6.5, 'FD');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(5.5);
                doc.setTextColor(100, 116, 139);
                doc.text("DAY", 22.5, y + 5.2, { align: 'center' });
                doc.setFontSize(10);
                doc.setTextColor(15, 23, 42);
                doc.text(String(d.day), 22.5, y + 9.8, { align: 'center' });

                // C. Day Title — wrapped to support arbitrary length
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9.5);
                doc.setTextColor(15, 23, 42);
                doc.text(titleText, 32, y + 5.5, { lineHeightFactor: 1.2 });

                // D. Transport subtitle
                const transY = y + 5.5 + titleBlockH;
                if (transLines > 0) {
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(7);
                    doc.setTextColor(148, 163, 184);
                    doc.text(wrappedTrans, 32, transY, { lineHeightFactor: 1.25 });
                }

                // E. Right-Aligned Stay / Return Badge (right-aligned)
                const badgeRightX = pageW - 15;
                const badgeLabelY = y + 5.5;

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.5);

                if (dayHotel) {
                    const labelW = doc.getTextWidth('Stay: ');
                    hotelWrapped.forEach((line, lineIdx) => {
                        const lineY = badgeLabelY + (lineIdx * 3.5);
                        const lineText = lineIdx === 0 ? 'Stay: ' + line : line;
                        const lineW = doc.getTextWidth(lineText);
                        const badgeStartX = badgeRightX - lineW;
                        
                        if (lineIdx === 0) {
                            drawBedIcon(doc, badgeStartX - 7, lineY - 3.5, [180, 83, 9]);
                            doc.setTextColor(180, 83, 9);
                            doc.text('Stay: ', badgeStartX, lineY);
                            doc.setTextColor(15, 23, 42);
                            doc.text(line, badgeStartX + labelW, lineY);
                        } else {
                            doc.setTextColor(15, 23, 42);
                            doc.text(line, badgeStartX, lineY);
                        }
                    });
                } else if (d.day === totalDays) {
                    const returnLabel = 'Return: ';
                    const returnVal = 'Beautiful Memories';
                    const labelW = doc.getTextWidth(returnLabel);
                    const nameW = doc.getTextWidth(returnVal);
                    const badgeStartX = badgeRightX - labelW - nameW;

                    drawMapPinIcon(doc, badgeStartX - 7, badgeLabelY - 3.8, [16, 185, 129]);
                    doc.setTextColor(100, 116, 139);
                    doc.text(returnLabel, badgeStartX, badgeLabelY);
                    doc.setTextColor(16, 185, 129);
                    doc.text(returnVal, badgeStartX + labelW, badgeLabelY);
                }

                // F. Description Box Card
                const actualLeftBottomY = y + 5.5 + titleBlockH + transBlockH;
                const actualRightBottomY = y + 5.5 + (badgeLines * 3.5) + 0.5;
                const cardTop = Math.max(actualLeftBottomY, actualRightBottomY, y + 13.5) + 1.5;

                doc.setFillColor(252, 252, 252);
                doc.setDrawColor(226, 232, 240);
                doc.setLineWidth(0.3);
                doc.roundedRect(32, cardTop, pageW - 15 - 32, descBoxH, 1.5, 1.5, 'FD');

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(71, 85, 105);
                doc.text(wrappedDesc, 36, cardTop + 4.5, { lineHeightFactor: 1.35 });

                // Render Integrated Notes callout banner inside description box card
                if (dayNotesText) {
                    const notesTop = cardTop + descLines * lineH + 6.5;
                    doc.setFillColor(254, 243, 199); // amber-100/50
                    doc.setDrawColor(251, 191, 36); // amber-400
                    doc.setLineWidth(0.2);
                    doc.roundedRect(35, notesTop, pageW - 15 - 32 - 6, notesH, 1, 1, 'FD');

                    // Small vertical gold border accent line on notes
                    doc.setDrawColor(180, 83, 9);
                    doc.setLineWidth(0.5);
                    doc.line(35.1, notesTop + 0.2, 35.1, notesTop + notesH - 0.2);

                    doc.setFont('helvetica', 'italic');
                    doc.setFontSize(6.5);
                    doc.setTextColor(180, 83, 9);
                    doc.text(wrappedNotes, 38, notesTop + 3.5, { lineHeightFactor: 1.25 });
                }

                // Update y using the actual dynamic card top offset
                y += (cardTop - y) + descBoxH + 5;
            });
            // --- ACCOMMODATION & TRANSPORT SUMMARY TABLES (Dynamic via autoTable) ---
            if (accommodations.length > 0) {
                // Safe padding check: if header + some rows don't fit, push to new page
                if (y + 25 > pageH - 16) {
                    doc.addPage();
                    currentPageNum++;
                    drawPageDecorations(doc, currentPageNum);
                    y = 28;
                }
                
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(15, 23, 42);
                doc.text("HOTELS & ACCOMMODATIONS", 15, y);
                doc.setDrawColor(180, 83, 9);
                doc.setLineWidth(0.4);
                doc.line(15, y + 1.5, 45, y + 1.5);
                doc.setDrawColor(226, 232, 240);
                doc.line(45, y + 1.5, pageW - 15, y + 1.5);
                
                y += 5;
                
                const tableBody = accommodations.map(acc => [
                    `Day ${acc.day}`,
                    cleanText(acc.title),
                    cleanText(acc.description || '-')
                ]);
                
                autoTable(doc, {
                    startY: y,
                    margin: { left: 15, right: 15 },
                    theme: 'striped',
                    head: [['Day', 'Property', 'Details / Room Type']],
                    body: tableBody,
                    styles: { fontSize: 7, font: 'helvetica', textColor: [71, 85, 105], cellPadding: 2.2 },
                    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
                    columnStyles: {
                        0: { cellWidth: 20, fontStyle: 'bold', textColor: [15, 23, 42] },
                        1: { cellWidth: 50, fontStyle: 'bold', textColor: [15, 23, 42] },
                        2: { cellWidth: 'auto' }
                    },
                    alternateRowStyles: { fillColor: [250, 249, 246] },
                    didDrawPage: (data) => {
                        if (data.pageNumber > currentPageNum) {
                            currentPageNum = data.pageNumber;
                            drawPageDecorations(doc, currentPageNum);
                        }
                    }
                });
                
                y = (doc as any).lastAutoTable.finalY + 8;
            }

            if (transports.length > 0) {
                if (y + 25 > pageH - 16) {
                    doc.addPage();
                    currentPageNum++;
                    drawPageDecorations(doc, currentPageNum);
                    y = 28;
                }
                
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(15, 23, 42);
                doc.text("TRANSPORT & SERVICE SUMMARY", 15, y);
                doc.setDrawColor(180, 83, 9);
                doc.setLineWidth(0.4);
                doc.line(15, y + 1.5, 45, y + 1.5);
                doc.setDrawColor(226, 232, 240);
                doc.line(45, y + 1.5, pageW - 15, y + 1.5);
                
                y += 5;
                
                const tableBody = transports.map(trans => [
                    `Day ${trans.day}`,
                    cleanText(trans.title),
                    cleanText(trans.description || '-')
                ]);
                
                autoTable(doc, {
                    startY: y,
                    margin: { left: 15, right: 15 },
                    theme: 'striped',
                    head: [['Day', 'Vehicle / Service', 'Details']],
                    body: tableBody,
                    styles: { fontSize: 7, font: 'helvetica', textColor: [71, 85, 105], cellPadding: 2.2 },
                    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
                    columnStyles: {
                        0: { cellWidth: 20, fontStyle: 'bold', textColor: [15, 23, 42] },
                        1: { cellWidth: 50, fontStyle: 'bold', textColor: [15, 23, 42] },
                        2: { cellWidth: 'auto' }
                    },
                    alternateRowStyles: { fillColor: [250, 249, 246] },
                    didDrawPage: (data) => {
                        if (data.pageNumber > currentPageNum) {
                            currentPageNum = data.pageNumber;
                            drawPageDecorations(doc, currentPageNum);
                        }
                    }
                });
                
                y = (doc as any).lastAutoTable.finalY + 8;
            }

            // --- 3. THREE-COLUMN SUMMARY FOOTER (dynamic card heights, NOTES removed) ---
            // Pre-calculate all card heights to determine tallest
            const gap = 1.5; // 1.5mm elegant gap between cards
            const cardW = (pageW - 30 - (2 * gap)) / 3; // exactly 59.0mm per card to fit A4 perfectly
            const innerW = cardW - 8; // text width inside card

            doc.setFontSize(7);
            const finalInclusions = inc.map(cleanItemText).filter(Boolean);
            const finalExclusions = exc.map(cleanItemText).filter(Boolean);

            // Calculate inc card height dynamically matching exact rendering width
            let incCalcH = 16; // header + divider
            finalInclusions.forEach(item => {
                const lines = doc.splitTextToSize(item, innerW - 4).length;
                incCalcH += Math.max(8, lines * 3.5 + 2);
            });
            incCalcH += 4; // bottom padding

            // Calculate exc card height dynamically matching exact rendering width
            let excCalcH = 16;
            finalExclusions.forEach(item => {
                const lines = doc.splitTextToSize(item, innerW - 4).length;
                excCalcH += Math.max(8, lines * 3.5 + 2);
            });
            excCalcH += 4;

            const paymentCardH = 58; // fixed
            const maxCardH = Math.max(incCalcH, excCalcH, paymentCardH);

            // Check boundary: if footer + signature doesn't fit, push to next page
            if (y + maxCardH + 22 > pageH - 16) {
                doc.addPage();
                currentPageNum++;
                drawPageDecorations(doc, currentPageNum);
                y = 30;
            }

            const startFooterY = y + 8;
            
            // Card x-positions (3 perfectly spaced columns aligning perfectly to margins)
            const c1x = 15;
            const c2x = 15 + cardW + gap;
            const c3x = 15 + (cardW + gap) * 2;

            // A. Card Column 1: INCLUSIONS (dynamic height)
            doc.setFillColor(252, 252, 252);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.roundedRect(c1x, startFooterY, cardW, maxCardH, 2, 2, 'FD');

            drawCheckCircle(doc, c1x + 3, startFooterY + 3.5);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(15, 23, 42);
            doc.text("INCLUSIONS", c1x + 10, startFooterY + 7);
            doc.setDrawColor(16, 185, 129);
            doc.setLineWidth(0.4);
            doc.line(c1x + 3, startFooterY + 10, c1x + cardW - 3, startFooterY + 10);

            let incY = startFooterY + 13;
            finalInclusions.forEach((item) => {
                drawCheckmarkBadge(doc, c1x + 3, incY + 1.2);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(6.5);
                doc.setTextColor(71, 85, 105);
                const wrapped = doc.splitTextToSize(item, innerW - 4);
                doc.text(wrapped, c1x + 8, incY + 1.8);
                const h = Math.max(7.5, wrapped.length * 3.5 + 1.5);
                incY += h;
            });

            // B. Card Column 2: EXCLUSIONS (dynamic height)
            doc.setFillColor(252, 252, 252);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.roundedRect(c2x, startFooterY, cardW, maxCardH, 2, 2, 'FD');

            drawCrossCircle(doc, c2x + 3, startFooterY + 3.5);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(15, 23, 42);
            doc.text("EXCLUSIONS", c2x + 10, startFooterY + 7);
            doc.setDrawColor(239, 68, 68);
            doc.setLineWidth(0.4);
            doc.line(c2x + 3, startFooterY + 10, c2x + cardW - 3, startFooterY + 10);

            let excY = startFooterY + 13;
            finalExclusions.forEach((item) => {
                drawCrossmarkBadge(doc, c2x + 3, excY + 1.2);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(6.5);
                doc.setTextColor(71, 85, 105);
                const wrapped = doc.splitTextToSize(item, innerW - 4);
                doc.text(wrapped, c2x + 8, excY + 1.8);
                const h = Math.max(7.5, wrapped.length * 3.5 + 1.5);
                excY += h;
            });

            // C. Card Column 3: PAYMENT TERMS
            doc.setFillColor(252, 252, 252);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.roundedRect(c3x, startFooterY, cardW, maxCardH, 2, 2, 'FD');

            drawCardIcon(doc, c3x + 3, startFooterY + 3);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(15, 23, 42);
            doc.text("PAYMENT TERMS", c3x + 10, startFooterY + 7);
            doc.setDrawColor(180, 83, 9);
            doc.setLineWidth(0.4);
            doc.line(c3x + 3, startFooterY + 10, c3x + cardW - 3, startFooterY + 10);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.setTextColor(180, 83, 9);
            doc.text("50%", c3x + 4, startFooterY + 22);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(100, 116, 139);
            doc.text("Advance at booking", c3x + 4, startFooterY + 26.5);

            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.25);
            for (let dX = c3x + 3; dX < c3x + cardW - 3; dX += 2) {
                doc.line(dX, startFooterY + 31, dX + 1, startFooterY + 31);
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.setTextColor(180, 83, 9);
            doc.text("100%", c3x + 4, startFooterY + 43);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(100, 116, 139);
            doc.text("Balance prior 7 days", c3x + 4, startFooterY + 47.5);

            // --- 4. TERMS & CONDITIONS AND CLOSING SIGNATURE ---
            const footerBottomY = startFooterY + maxCardH;
            let sigY = footerBottomY + 8;

            const rawTermsText = tripDetails.termsAndConditions || '';
            const cleanTermsStr = cleanText(rawTermsText).trim();

            if (cleanTermsStr) {
                // Split by newline to preserve paragraph formatting
                const rawParagraphs = cleanTermsStr.split('\n').map(p => p.trim()).filter(Boolean);
                
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(6.5);
                
                let termsContentH = 0;
                const termsItemGap = 1.5;
                const innerTermsW = pageW - 30 - 8; // Card padding (4mm left, 4mm right)
                
                const processedParas = rawParagraphs.map(p => {
                    const wrapped = doc.splitTextToSize(p, innerTermsW);
                    termsContentH += wrapped.length * 3.5 + termsItemGap;
                    return wrapped;
                });
                
                // Card height: padding top/bottom + header + divider + text content
                const termsCardH = termsContentH - termsItemGap + 14; 
                let termsStartY = footerBottomY + 6;

                // Smart Pagination boundary check: if T&C + signature doesn't fit on this page, push to a new page
                if (termsStartY + termsCardH + 22 > pageH - 12) {
                    doc.addPage();
                    currentPageNum++;
                    drawPageDecorations(doc, currentPageNum);
                    termsStartY = 26; // reset just below the header decorative line
                }

                // Render T&C Card Box
                doc.setFillColor(252, 252, 252);
                doc.setDrawColor(226, 232, 240);
                doc.setLineWidth(0.3);
                doc.roundedRect(15, termsStartY, pageW - 30, termsCardH, 2, 2, 'FD');

                // Gold Accent Left Border Line
                doc.setDrawColor(180, 83, 9);
                doc.setLineWidth(0.8);
                doc.line(15.2, termsStartY + 0.2, 15.2, termsStartY + termsCardH - 0.2);

                // Gold Bullet next to header
                doc.setFillColor(180, 83, 9);
                doc.circle(19.5, termsStartY + 5.5, 0.8, 'F');

                // Header Text
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.5);
                doc.setTextColor(15, 23, 42);
                doc.text("TERMS & CONDITIONS", 23, termsStartY + 6.5);

                // Thin horizontal divider line under header inside card
                doc.setDrawColor(241, 245, 249);
                doc.setLineWidth(0.25);
                doc.line(19, termsStartY + 9, pageW - 19, termsStartY + 9);

                // Render paragraph lines
                let currentParaY = termsStartY + 13;
                processedParas.forEach(wrapped => {
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(6.5);
                    doc.setTextColor(71, 85, 105); // Slate-600
                    doc.text(wrapped, 19, currentParaY, { lineHeightFactor: 1.3 });
                    currentParaY += wrapped.length * 3.5 + termsItemGap;
                });

                // Signature position comes after the T&C card
                sigY = termsStartY + termsCardH + 6;
            } else {
                // If T&C is empty, do a page check for signature block only
                if (sigY + 22 > pageH - 12) {
                    doc.addPage();
                    currentPageNum++;
                    drawPageDecorations(doc, currentPageNum);
                    sigY = 26;
                }
            }

            // Thin divider before closing
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(15, sigY, pageW - 15, sigY);

            // Cursive thank you
            doc.setFont('times', 'italic');
            doc.setFontSize(11);
            doc.setTextColor(100, 116, 139);
            doc.text("Thank you for your trust.", pageW / 2, sigY + 7, { align: 'center' });

            // Slim pill
            doc.setFillColor(15, 23, 42);
            doc.roundedRect(pageW / 2 - 32, sigY + 10, 64, 6, 1, 1, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(255, 255, 255);
            doc.text("We look forward to serving you!", pageW / 2, sigY + 14, { align: 'center' });

            // Interactive Click-to-WhatsApp hyperlink over the serving pill
            try {
                const whatsappMsg = `Hi, I would like to inquire about the itinerary: ${tripDetails.title || 'Trip'}`;
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`;
                doc.link(pageW / 2 - 32, sigY + 10, 64, 6, { url: whatsappUrl });
            } catch (linkErr) {
                console.error("Failed to generate PDF interactive hyperlink:", linkErr);
            }

            // Replace page count placeholders across all footers
            if (typeof doc.putTotalPages === 'function') {
                doc.putTotalPages(totalPagesExp);
            }

            // File saving
            const filename = `Itinerary_${(tripDetails.title || 'Trip').replace(/\s+/g, '_')}_${tripDetails.startDate || 'draft'}.pdf`;
            doc.save(filename);
            toast.dismiss(toastId);
            toast.success('Premium PDF Downloaded!');
        } catch (err: any) {
            console.error('PDF Error:', err);
            toast.dismiss();
            toast.error('PDF generation failed: ' + err.message);
        }
    };

    const handleShareWhatsApp = () => {
        const text = `Here is the itinerary for *${tripDetails.title}* \n📅 Start Date: ${tripDetails.startDate}\n\nPlease check the attached PDF for full details.`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const itineraryList = generatePackageItinerary();

    return (
        <div className="min-h-full flex flex-col md:flex-row">

            {/* ── LEFT: Document Preview ───────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-6 md:p-12 print:p-0">
                <div className="mb-6 flex items-center gap-3">
                    {onBack && (
                        <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors">
                            <ArrowLeft size={14} /> Back to Pricing
                        </button>
                    )}
                    <div className="ml-auto">
                        <p className="text-xs font-black text-amber-600 uppercase tracking-widest">Step 4 of 4</p>
                    </div>
                </div>

                {/* Document */}
                <div className="max-w-3xl mx-auto bg-white min-h-[800px] shadow-2xl rounded-sm p-8 md:p-12 relative print:shadow-none print:p-0">

                    {/* Header */}
                    <div className="border-b-2 border-stone-900 pb-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-stone-900 uppercase tracking-tight mb-2">
                                {tripDetails.title || 'Untitled Itinerary'}
                            </h1>
                            {tripDetails.clientName && (
                                <p className="text-xs font-bold text-indigo-600 mb-1.5">👤 Prepared for: {tripDetails.clientName}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-stone-500">
                                <span className="flex items-center gap-1"><MapPin size={12} /> {destinationName}</span>
                                <span className="flex items-center gap-1"><Calendar size={12} /> {tripDetails.startDate}</span>
                                <span className="flex items-center gap-1"><Users size={12} /> {guestCount} Guests</span>
                                <span>🌙 {tripDetails.nights}N / ☀️ {tripDetails.days}D</span>
                            </div>
                            {validUntilDate && (
                                <p className="text-[10px] font-bold text-amber-600 mt-1.5 flex items-center gap-1">
                                    <Clock size={10} /> Quote valid until: {validUntilDate}
                                </p>
                            )}
                        </div>
                        <div className="text-left md:text-right">
                            <div className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-0.5">Total Cost</div>
                            <div className="text-xl md:text-2xl font-black text-amber-600">{formatCurrency(finalPrice)}</div>
                            {/* Per-pax pricing — Fix #8 */}
                            {pricePerPax > 0 && (
                                <div className="text-[10px] text-stone-400 mt-1 space-y-0.5">
                                    <div>Per Person: <span className="font-bold text-stone-600">{formatCurrency(pricePerPax)}</span></div>
                                    {tripDetails.children > 0 && (
                                        <div>Per Adult: <span className="font-bold text-stone-600">{formatCurrency(pricePerAdult)}</span></div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Inclusions / Exclusions */}
                    {((tripDetails.included || []).length > 0 || (tripDetails.notIncluded || []).length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-sm">
                            {(tripDetails.included || []).length > 0 && (
                                <div>
                                    <h4 className="font-black text-emerald-700 uppercase text-[10px] tracking-widest mb-2">✓ Included</h4>
                                    <ul className="space-y-1">
                                        {(tripDetails.included || []).map((item, i) => (
                                            <li key={i} className="flex items-start gap-2 text-xs text-stone-600">
                                                <Check size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {(tripDetails.notIncluded || []).length > 0 && (
                                <div>
                                    <h4 className="font-black text-rose-600 uppercase text-[10px] tracking-widest mb-2">✗ Not Included</h4>
                                    <ul className="space-y-1">
                                        {(tripDetails.notIncluded || []).map((item, i) => (
                                            <li key={i} className="flex items-start gap-2 text-xs text-stone-600">
                                                <span className="text-rose-400 mt-0.5 shrink-0">✗</span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Itinerary Timeline */}
                    <div className="space-y-8 relative">
                        <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-stone-100" />

                        {itineraryList.map(day => (
                            <div key={day.day} className="relative pl-10">
                                <div className="absolute left-0 top-0 size-8 bg-stone-900 text-white rounded-full flex items-center justify-center font-black text-sm z-10">
                                    {day.day}
                                </div>
                                <h3 className="text-base font-black text-stone-900 mb-2">{day.title}</h3>
                                {dayMeta[day.day]?.image && (
                                    <div className="mb-4 rounded-xl overflow-hidden shadow-sm border border-stone-200">
                                        <img src={dayMeta[day.day].image} alt={`Day ${day.day} Cover`} className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500" />
                                    </div>
                                )}
                                <div className="text-stone-500 text-xs leading-relaxed whitespace-pre-line bg-stone-50 p-4 rounded-xl border border-stone-100">
                                    {day.desc}
                                </div>
                                {/* Day Notes — Fix #6 */}
                                {dayMeta[day.day]?.notes && (
                                    <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">
                                        📝 <span className="font-bold">Note:</span> {dayMeta[day.day].notes}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Accommodations & Transportation Summary */}
                    {(accommodations.length > 0 || transports.length > 0) && (
                        <div className="mt-12 pt-8 border-t border-stone-200">
                            <h3 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-6">Accommodation & Transport Summary</h3>
                            
                            {accommodations.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="text-xs font-bold text-stone-500 mb-3 flex items-center gap-2"><Hotel size={14}/> Hotels / Villas</h4>
                                    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-stone-50 text-stone-500 border-b border-stone-200">
                                                <tr>
                                                    <th className="px-4 py-3 font-bold w-20">Day</th>
                                                    <th className="px-4 py-3 font-bold">Property</th>
                                                    <th className="px-4 py-3 font-bold">Details / Room Type</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-stone-100">
                                                {accommodations.map(acc => (
                                                    <tr key={acc.id}>
                                                        <td className="px-4 py-3 font-bold text-stone-900">Day {acc.day}</td>
                                                        <td className="px-4 py-3 font-bold text-stone-900">{acc.title}</td>
                                                        <td className="px-4 py-3 text-stone-500">{acc.description || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {transports.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold text-stone-500 mb-3 flex items-center gap-2"><Car size={14}/> Transportation</h4>
                                    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-stone-50 text-stone-500 border-b border-stone-200">
                                                <tr>
                                                    <th className="px-4 py-3 font-bold w-20">Day</th>
                                                    <th className="px-4 py-3 font-bold">Vehicle / Service</th>
                                                    <th className="px-4 py-3 font-bold">Details</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-stone-100">
                                                {transports.map(trans => (
                                                    <tr key={trans.id}>
                                                        <td className="px-4 py-3 font-bold text-stone-900">Day {trans.day}</td>
                                                        <td className="px-4 py-3 font-bold text-stone-900">{trans.title}</td>
                                                        <td className="px-4 py-3 text-stone-500">{trans.description || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Terms & Conditions — Fix #14 */}
                    {tripDetails.termsAndConditions && (
                        <div className="mt-10 pt-8 border-t border-stone-200">
                            <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                <FileText size={11} /> Terms & Conditions
                            </h3>
                            <p className="text-[11px] text-stone-500 leading-relaxed whitespace-pre-line">
                                {tripDetails.termsAndConditions}
                            </p>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="mt-16 pt-8 border-t border-stone-200 flex justify-between items-center text-stone-400 text-[10px] uppercase tracking-widest font-bold">
                        <span>Generated by SHRAWELLO Travel Hub</span>
                        <span>Page 1 of 1</span>
                    </div>
                </div>
            </div>

            {/* ── RIGHT: Action Panel ──────────────────────────────────── */}
            <div className="w-full md:w-80 bg-white border-l border-stone-200 flex flex-col shadow-2xl z-20 print:hidden shrink-0">
                <div className="p-5 border-b border-stone-100">
                    <h3 className="font-black text-base text-stone-900 flex items-center gap-2">
                        <DollarSign size={18} className="text-emerald-500" /> Costing & Margins
                    </h3>
                </div>

                <div className="flex-1 p-5 space-y-6 overflow-y-auto">
                    {/* Status badge */}
                    {tripDetails.itineraryStatus && (
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Status</span>
                            <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                                tripDetails.itineraryStatus === 'Confirmed' ? 'bg-emerald-100 text-emerald-700' :
                                tripDetails.itineraryStatus === 'Sent' ? 'bg-blue-100 text-blue-700' :
                                tripDetails.itineraryStatus === 'Cancelled' ? 'bg-rose-100 text-rose-700' :
                                'bg-stone-100 text-stone-500'
                            }`}>
                                {tripDetails.itineraryStatus}
                            </span>
                        </div>
                    )}

                    {/* Item Subtotal */}
                    <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                        <div className="text-[10px] font-black uppercase text-stone-400 mb-0.5 tracking-wider">Item Subtotal</div>
                        <div className="text-lg font-black text-stone-900">{formatCurrency(subtotal)}</div>
                    </div>

                    {/* Markup controls */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-black text-stone-700">Package Markup</label>
                            {packageMarkupAmount > 0 && (
                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                                    + {formatCurrency(packageMarkupAmount)}
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black text-indigo-500 uppercase mb-1 block tracking-wider">Markup %</label>
                                <div className="relative">
                                    <input
                                        type="number" min="0" step="0.5"
                                        value={packageMarkupPercent}
                                        onChange={e => setPackageMarkup(parseFloat(e.target.value) || 0, packageMarkupFlat)}
                                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 font-black text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-indigo-400 pointer-events-none text-xs">%</div>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-violet-500 uppercase mb-1 block tracking-wider">Extra ₹</label>
                                <div className="relative">
                                    <input
                                        type="number" min="0"
                                        value={packageMarkupFlat}
                                        onChange={e => setPackageMarkup(packageMarkupPercent, parseFloat(e.target.value) || 0)}
                                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 font-black text-sm focus:ring-2 focus:ring-violet-400 outline-none"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-violet-400 pointer-events-none text-xs">₹</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-stone-100" />

                    {/* Grand Total */}
                    <div>
                        <label className="text-[10px] font-black uppercase text-stone-500 tracking-widest">Grand Total (incl. markup + tax)</label>
                        <div className="text-2xl md:text-3xl font-black text-stone-900 mt-1">{formatCurrency(finalPrice)}</div>
                    </div>
                </div>

                {/* CTAs */}
                <div className="p-5 border-t border-stone-100 space-y-3 bg-stone-50/50">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 active:scale-95 text-sm"
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {isSaving ? 'Saving…' : (editPackageId ? 'Update Package' : 'Save Package')}
                    </button>
                    <button
                        onClick={handleConvertToBooking}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 text-xs"
                        title={!editPackageId ? 'Save package first' : 'Create a booking from this itinerary'}
                    >
                        <ArrowRight size={14} /> Convert to Booking
                    </button>
                    {/* Generate Invoice — Fix #11 */}
                    <button
                        onClick={handleGenerateInvoice}
                        className={`w-full py-2.5 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-xs shadow-lg ${
                            editPackageId
                                ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-600/20'
                                : 'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200 shadow-none'
                        }`}
                        title={!editPackageId ? 'Save itinerary first' : 'Create invoice from this itinerary'}
                    >
                        <Receipt size={14} /> Generate Invoice
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                        {onBack && (
                            <button onClick={onBack} className="w-full py-2.5 bg-white border border-stone-200 text-stone-500 font-bold rounded-xl hover:bg-stone-50 transition-all flex items-center justify-center gap-2 text-xs">
                                <ArrowLeft size={14} /> Edit
                            </button>
                        )}
                        {/* Download PDF — Fix #1 */}
                        <button onClick={handleDownloadPDF} className="w-full py-2.5 bg-white border border-stone-200 text-stone-500 font-bold rounded-xl hover:bg-stone-50 transition-all flex items-center justify-center gap-2 text-xs">
                            <Download size={14} /> Download PDF
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                const text = `🏝️ *Trip to ${destinationName}*\n📅 ${tripDetails.nights}N/${tripDetails.days}D | ${guestCount} Guests\n💰 ₹${finalPrice.toLocaleString()}\n\n*Itinerary:*\n${items.map(item => `Day ${item.day}: ${item.title}`).join('\n')}\n\nBook now with SHRAWELLO Travel Hub! 🚀`;
                                navigator.clipboard.writeText(text);
                                toast.success('Itinerary copied to clipboard!');
                            }}
                            className="w-full py-2.5 bg-stone-900 text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 text-xs"
                        >
                            <span className="material-symbols-outlined text-sm">content_copy</span> Copy Text
                        </button>
                        <button
                            onClick={handleShareWhatsApp}
                            className="w-full py-2.5 bg-[#25D366] text-white font-bold rounded-xl hover:bg-[#128C7E] transition-all flex items-center justify-center gap-2 text-xs shadow-lg shadow-green-500/20"
                        >
                            <Share2 size={14} /> WhatsApp
                        </button>
                    </div>
                    <button
                        onClick={() => {
                            if (!editPackageId) {
                                toast.error('Please Save the Package first to generate a Web Link');
                                return;
                            }
                            const url = `${window.location.origin}${window.location.pathname}#/itinerary/${editPackageId}`;
                            navigator.clipboard.writeText(url);
                            toast.success('Web Link copied to clipboard!');
                        }}
                        className={`w-full py-2.5 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-xs shadow-lg ${
                            editPackageId ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20' : 'bg-stone-100 text-stone-400 cursor-not-allowed shadow-none border border-stone-200'
                        }`}
                        title={!editPackageId ? 'Save package first' : 'Copy Interactive Web Link'}
                    >
                        <span className="material-symbols-outlined text-sm">link</span> Copy Web Link
                    </button>
                </div>
            </div>
        </div>
    );
};
