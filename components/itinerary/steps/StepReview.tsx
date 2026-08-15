import React, { useState } from 'react';
import { useItinerary } from '../ItineraryContext';
import { useData } from '../../../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { Package } from '../../../types';
import { Save, ArrowLeft, MapPin, Calendar, Users, Printer, Share2, Check, DollarSign, ArrowRight, Loader2, Hotel, Car, FileText, Receipt, Tag, Clock, Download } from 'lucide-react';
import { toast } from 'sonner';
import { copyToClipboard } from '../../../utils/clipboard';
import { formatTripDuration } from '../../../utils/packageUtils';
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
        editPackageId, setEditPackageId, currency, taxConfig, dayMeta, subtotal, faqs
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

    const parseTimeToMinutes = (timeStr?: string): number => {
        if (!timeStr) return 9999;
        const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (!match) return 9999;
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const meridiem = (match[3] || '').toUpperCase();
        if (meridiem === 'PM' && hours < 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
    };

    const generatePackageItinerary = () => {
        const days = Array.from({ length: tripDetails.days }, (_, i) => i + 1);
        return days.map(day => {
            const dayItems = items
                .filter(i => i.day === day)
                .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
            const desc = dayItems.length === 0
                ? 'Leisure day for personal exploration.'
                : dayItems
                    .map(item => `• ${item.time ? item.time + ': ' : ''}${item.title}${item.description ? ' - ' + item.description : ''}`)
                    .join('\n');
            // Fix 2.3b: use editable dayMeta.theme if set, else use first activity title as label
            const dayTheme = (dayMeta[day] as any)?.theme
                || dayItems.find(i => i.type === 'activity')?.title
                || (day === 1 ? 'Arrival & Welcome' : `Day ${day} Itinerary`);
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
                overview: `A ${formatTripDuration({ nights: tripDetails.nights, days: tripDetails.days })} journey to ${destinationName}.`,
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
                builderData: { tripDetails, items, dayMeta, currency, taxConfig, packageMarkupPercent, packageMarkupFlat, faqs },
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
            description: `Travel Itinerary: ${tripDetails.title} — ${formatTripDuration({ nights: tripDetails.nights, days: tripDetails.days })} to ${destinationName}`,
            packageId: editPackageId,
            adults: tripDetails.adults,
            children: tripDetails.children,
            startDate: tripDetails.startDate,
        }));
        navigate('/admin/invoices/new');
        toast.success('Opening Invoice Editor — details pre-filled from itinerary.');
    };

    const handleDownloadPDF = async () => {
        const toastId = toast.loading('Generating luxury branded PDF... Please wait.');
        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            const margin = 15;
            const contentW = pageW - (margin * 2); // 180mm
            
            // Dynamic Page X of Y total page placeholder
            const totalPagesExp = "{total_pages_count_string}";

            // Asynchronous image loader helper
            const loadImageBase64 = (url: string): Promise<string | null> => {
                return new Promise((resolve) => {
                    if (!url) { resolve(null); return; }
                    const xhr = new XMLHttpRequest();
                    xhr.onload = function () {
                        const reader = new FileReader();
                        reader.onloadend = function () {
                            resolve(reader.result as string);
                        };
                        reader.readAsDataURL(xhr.response);
                    };
                    xhr.onerror = function () {
                        resolve(null);
                    };
                    xhr.open('GET', url);
                    xhr.responseType = 'blob';
                    xhr.send();
                });
            };

            // Load official company logo and cover image
            const [logoBase64, coverImgBase64] = await Promise.all([
                loadImageBase64('/logo.png'),
                tripDetails.coverImage ? loadImageBase64(tripDetails.coverImage) : Promise.resolve(null)
            ]);

            // Brand Colors Palette (Luxury Shrawello Palette)
            const brandNavy: [number, number, number] = [15, 23, 42]; // Slate-900
            const brandGold: [number, number, number] = [217, 119, 6]; // Amber-600
            const brandGoldDark: [number, number, number] = [180, 83, 9]; // Amber-700
            const textDark: [number, number, number] = [15, 23, 42];
            const textMuted: [number, number, number] = [100, 116, 139]; // Slate-500
            const textBody: [number, number, number] = [51, 65, 85]; // Slate-700
            const borderLight: [number, number, number] = [226, 232, 240]; // Slate-200
            const emeraldCol: [number, number, number] = [5, 150, 105]; // Emerald-600
            const roseCol: [number, number, number] = [220, 38, 38]; // Rose-600

            // Text sanitizer - Removes all raw emojis and non-ASCII glyphs that break standard jsPDF fonts
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
                    // Strip all unicode emojis and symbols that render as garbage characters
                    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, '')
                    .replace(/[^\x20-\x7E\t\n\r]/g, '')
                    .trim();
            };

            const cleanCurrency = (val: string) => {
                return val.replace(/₹/g, 'Rs. ').replace(/[^\x00-\x7F]/g, '');
            };

            const cleanItemText = (txt: string): string => {
                if (!txt) return '';
                return cleanText(txt).replace(/^[\s•\-\*✓✗\u2022]+/, '').trim();
            };

            // Custom Drawing Icon Helpers
            const drawCalendarIcon = (docInstance: jsPDF, dx: number, dy: number, strokeColor: [number, number, number] = [180, 83, 9]) => {
                docInstance.setDrawColor(strokeColor[0], strokeColor[1], strokeColor[2]);
                docInstance.setLineWidth(0.3);
                docInstance.rect(dx, dy, 4.5, 4);
                docInstance.setFillColor(strokeColor[0], strokeColor[1], strokeColor[2]);
                docInstance.rect(dx, dy, 4.5, 1, 'F');
                docInstance.line(dx + 1.2, dy - 0.5, dx + 1.2, dy + 0.5);
                docInstance.line(dx + 3.3, dy - 0.5, dx + 3.3, dy + 0.5);
            };

            const drawUsersIcon = (docInstance: jsPDF, dx: number, dy: number) => {
                docInstance.setFillColor(15, 23, 42);
                docInstance.circle(dx + 2.2, dy + 1.5, 1.2, 'F');
                docInstance.roundedRect(dx, dy + 3, 4.4, 2, 0.6, 0.6, 'F');
            };

            const drawVehicleIcon = (docInstance: jsPDF, dx: number, dy: number) => {
                docInstance.setDrawColor(15, 23, 42);
                docInstance.setLineWidth(0.3);
                docInstance.rect(dx, dy + 1.5, 5, 2.5);
                docInstance.rect(dx + 0.6, dy, 3.8, 1.5);
                docInstance.setFillColor(15, 23, 42);
                docInstance.circle(dx + 1.2, dy + 4, 0.6, 'F');
                docInstance.circle(dx + 3.8, dy + 4, 0.6, 'F');
            };

            const drawMealIcon = (docInstance: jsPDF, dx: number, dy: number) => {
                docInstance.setDrawColor(15, 23, 42);
                docInstance.setLineWidth(0.3);
                docInstance.circle(dx + 2.5, dy + 2.2, 1.8, 'D');
                docInstance.line(dx + 0.2, dy + 0.5, dx + 0.2, dy + 4);
                docInstance.line(dx + 0.2, dy + 0.5, dx - 0.2, dy + 1.5);
                docInstance.line(dx + 0.2, dy + 0.5, dx + 0.6, dy + 1.5);
                docInstance.line(dx + 4.8, dy + 0.5, dx + 4.8, dy + 4);
            };

            const drawCheckCircle = (docInstance: jsPDF, dx: number, dy: number) => {
                docInstance.setFillColor(5, 150, 105);
                docInstance.circle(dx + 2.5, dy + 2.5, 2.5, 'F');
                docInstance.setDrawColor(255, 255, 255);
                docInstance.setLineWidth(0.4);
                docInstance.line(dx + 1.5, dy + 2.5, dx + 2.2, dy + 3.3);
                docInstance.line(dx + 2.2, dy + 3.3, dx + 3.5, dy + 1.5);
            };

            const drawCrossCircle = (docInstance: jsPDF, dx: number, dy: number) => {
                docInstance.setFillColor(220, 38, 38);
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

            const drawCheckmarkBadge = (docInstance: jsPDF, dx: number, dy: number) => {
                docInstance.setFillColor(209, 250, 229);
                docInstance.circle(dx + 2, dy - 1.2, 2, 'F');
                docInstance.setDrawColor(5, 150, 105);
                docInstance.setLineWidth(0.4);
                docInstance.line(dx + 1.2, dy - 1.2, dx + 1.8, dy - 0.6);
                docInstance.line(dx + 1.8, dy - 0.6, dx + 2.8, dy - 2);
            };

            const drawCrossmarkBadge = (docInstance: jsPDF, dx: number, dy: number) => {
                docInstance.setFillColor(254, 226, 226);
                docInstance.circle(dx + 2, dy - 1.2, 2, 'F');
                docInstance.setDrawColor(220, 38, 38);
                docInstance.setLineWidth(0.4);
                docInstance.line(dx + 1.2, dy - 2, dx + 2.8, dy - 0.4);
                docInstance.line(dx + 2.8, dy - 2, dx + 1.2, dy - 0.4);
            };

            const drawWhatsAppIcon = (docInstance: jsPDF, dx: number, dy: number) => {
                docInstance.setFillColor(37, 211, 102); // #25D366
                docInstance.circle(dx + 2.5, dy + 2.5, 2.5, 'F');
                docInstance.setDrawColor(255, 255, 255);
                docInstance.setLineWidth(0.4);
                docInstance.line(dx + 1.6, dy + 1.8, dx + 2.2, dy + 3.2);
                docInstance.line(dx + 2.2, dy + 3.2, dx + 3.4, dy + 2.0);
            };

            // Page Decoration Helper (Branded Header & Persistent Footer)
            const drawPageDecorations = (docInstance: jsPDF, pageNum: number) => {
                // Alabaster Cream Paper background
                docInstance.setFillColor(253, 251, 247);
                docInstance.rect(0, 0, pageW, pageH, 'F');

                // Top Header Bar (16mm)
                docInstance.setFillColor(15, 23, 42); // Deep Slate
                docInstance.rect(0, 0, pageW, 16, 'F');

                // Gold Accent Baseline under Header
                docInstance.setFillColor(217, 119, 6);
                docInstance.rect(0, 16, pageW, 1, 'F');

                // Brand Logo & Title in Header
                if (logoBase64) {
                    try {
                        docInstance.setFillColor(255, 255, 255);
                        docInstance.roundedRect(12, 2, 12, 12, 1.5, 1.5, 'F');
                        docInstance.addImage(logoBase64, "PNG", 12.5, 2.5, 11, 11);
                    } catch {}
                    docInstance.setFont('helvetica', 'bold');
                    docInstance.setFontSize(9.5);
                    docInstance.setTextColor(255, 255, 255);
                    docInstance.text("SHRAWELLO", 27, 7.5);

                    docInstance.setFont('helvetica', 'bold');
                    docInstance.setFontSize(7);
                    docInstance.setTextColor(245, 158, 11);
                    docInstance.text("TRAVEL HUB", 54, 7.5);

                    docInstance.setFont('helvetica', 'normal');
                    docInstance.setFontSize(5.5);
                    docInstance.setTextColor(203, 213, 225);
                    docInstance.text("Making Dreams Come True | Luxury Custom Tours", 27, 12);
                } else {
                    docInstance.setFont('helvetica', 'bold');
                    docInstance.setFontSize(10);
                    docInstance.setTextColor(255, 255, 255);
                    docInstance.text("SHRAWELLO TRAVEL HUB", 15, 8);

                    docInstance.setFont('helvetica', 'normal');
                    docInstance.setFontSize(5.5);
                    docInstance.setTextColor(203, 213, 225);
                    docInstance.text("Making Dreams Come True | Luxury Custom Tours", 15, 12.5);
                }

                // Right Header Metadata
                const quoteRef = tripDetails.clientName ? `QUOTE #${new Date().getFullYear()}-${String(tripDetails.days || 3).padStart(2, '0')}` : 'PROPOSAL QUOTE';
                docInstance.setFont('helvetica', 'bold');
                docInstance.setFontSize(7);
                docInstance.setTextColor(255, 255, 255);
                docInstance.text(quoteRef, pageW - 15, 7.5, { align: 'right' });

                docInstance.setFont('helvetica', 'normal');
                docInstance.setFontSize(5.8);
                docInstance.setTextColor(245, 158, 11);
                docInstance.text(`Quote Valid: ${cleanText(validUntilDate || '7 Days')}`, pageW - 15, 12, { align: 'right' });

                // Footer separator & contact line with executive pipes
                docInstance.setDrawColor(226, 232, 240);
                docInstance.setLineWidth(0.3);
                docInstance.line(15, pageH - 11, pageW - 15, pageH - 11);

                docInstance.setFont('helvetica', 'normal');
                docInstance.setFontSize(5.8);
                docInstance.setTextColor(100, 116, 139);
                docInstance.text("SHRAWELLO Travel Hub and Events LLP | +91 80109 55675 | hello@shrawello.com | shrawello.com", 15, pageH - 6.5);

                docInstance.setFont('helvetica', 'bold');
                docInstance.setFontSize(6.5);
                docInstance.setTextColor(180, 83, 9);
                docInstance.text(`Page ${pageNum} of ${totalPagesExp}`, pageW - 15, pageH - 6.5, { align: 'right' });
            };

            const inc = tripDetails.included || [];
            const exc = tripDetails.notIncluded || [];
            const itineraryList = generatePackageItinerary();
            const totalDays = itineraryList.length;

            let currentPageNum = 1;
            drawPageDecorations(doc, currentPageNum);

            // ─── PAGE 1: HERO, PRICING & HIGHLIGHTS ──────────────────────────────────
            let y = 22;

            // A. Title Block (Left Column, max 115mm)
            const titleColW = contentW - 65; // ~115mm
            
            // Bespoke Tag (Dynamic width & centered text)
            const tagText = "BESPOKE LUXURY ITINERARY";
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.2);
            const tagTextW = doc.getTextWidth(tagText);
            const tagW = tagTextW + 7;
            const tagH = 5.2;

            doc.setFillColor(254, 243, 199);
            doc.roundedRect(15, y, tagW, tagH, 1, 1, 'F');
            doc.setTextColor(180, 83, 9);
            doc.text(tagText, 15 + (tagW / 2), y + 3.7, { align: 'center' });

            // Title with clean vertical clearance (below the pill)
            const titleStartY = y + tagH + 7;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.setTextColor(15, 23, 42);
            const wrappedTitle = doc.splitTextToSize(cleanText(tripDetails.title) || "Exclusive Tour Package", titleColW);
            doc.text(wrappedTitle, 15, titleStartY);
            const titleH = wrappedTitle.length * 6.5;

            // Subtitle / Prepared For
            const subY = titleStartY + 4.5;
            doc.setFont('times', 'italic');
            doc.setFontSize(10.5);
            doc.setTextColor(180, 83, 9);
            const clientSubtitle = cleanText(tripDetails.clientName ? `Prepared exclusively for: ${tripDetails.clientName}` : 'Curated Custom Vacation');
            doc.text(clientSubtitle, 15, subY);

            // Duration Pill (Dynamic width)
            const durationY = subY + 4.2;
            const durText = `${formatTripDuration({ nights: tripDetails.nights, days: tripDetails.days }).toUpperCase()} | ${cleanText(destinationName)}`;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            const durTextW = doc.getTextWidth(durText);
            const durW = durTextW + 11;

            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(180, 83, 9);
            doc.setLineWidth(0.25);
            doc.roundedRect(15, durationY, durW, 5.5, 1, 1, 'FD');
            drawCalendarIcon(doc, 17, durationY + 0.9, [180, 83, 9]);
            doc.setTextColor(15, 23, 42);
            doc.text(durText, 23.5, durationY + 3.9);

            // B. Price Card (Right Column) - Highlighting Per Person in Big Text
            const priceCardW = 58;
            const priceCardX = pageW - 15 - priceCardW;
            const priceCardY = 22;
            const priceCardH = 38;

            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.roundedRect(priceCardX, priceCardY, priceCardW, priceCardH, 2, 2, 'FD');

            // Top Tab Header
            doc.setFillColor(15, 23, 42);
            doc.roundedRect(priceCardX + 5, priceCardY - 2.5, priceCardW - 10, 5, 1, 1, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.2);
            doc.setTextColor(255, 255, 255);
            doc.text("STARTING PER PERSON", priceCardX + (priceCardW / 2), priceCardY + 1, { align: 'center' });

            // HERO: Per Person Price (BIG Highlight)
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.setTextColor(180, 83, 9);
            doc.text(cleanCurrency(formatCurrency(pricePerPax)), priceCardX + (priceCardW / 2), priceCardY + 12.5, { align: 'center' });
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.2);
            doc.setTextColor(15, 23, 42);
            doc.text("PER PERSON", priceCardX + (priceCardW / 2), priceCardY + 16.5, { align: 'center' });

            // Dotted separator
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.25);
            for (let dX = priceCardX + 5; dX < priceCardX + priceCardW - 5; dX += 2) {
                doc.line(dX, priceCardY + 20.5, dX + 1, priceCardY + 20.5);
            }

            // Total Package Cost (Small Text)
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(15, 23, 42);
            doc.text(cleanCurrency(formatCurrency(finalPrice)), priceCardX + (priceCardW / 2), priceCardY + 28, { align: 'center' });
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5.8);
            doc.setTextColor(100, 116, 139);
            doc.text(`TOTAL FOR ${guestCount} GUESTS`, priceCardX + (priceCardW / 2), priceCardY + 32, { align: 'center' });

            // Gold bottom accent line on card
            doc.setFillColor(180, 83, 9);
            doc.rect(priceCardX, priceCardY + priceCardH - 0.8, priceCardW, 0.8, 'F');

            // C. 4-Column Trip Highlights Bar
            const statsBarY = Math.max(durationY + 9, priceCardY + priceCardH + 4);
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.roundedRect(15, statsBarY, contentW, 12, 1.5, 1.5, 'FD');

            const colW = contentW / 4;

            // Col 1: Guests
            drawUsersIcon(doc, 15 + 4, statsBarY + 3.5);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(15, 23, 42);
            doc.text(`${guestCount} Guests`, 15 + 11, statsBarY + 6.5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5.5);
            doc.setTextColor(100, 116, 139);
            doc.text("Travelers", 15 + 11, statsBarY + 9.5);

            doc.setDrawColor(226, 232, 240);
            doc.line(15 + colW, statsBarY + 2, 15 + colW, statsBarY + 10);

            // Col 2: Start Date
            drawCalendarIcon(doc, 15 + colW + 4, statsBarY + 3.5, [15, 23, 42]);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(15, 23, 42);
            doc.text(cleanText(tripDetails.startDate || 'Upcoming'), 15 + colW + 11, statsBarY + 6.5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5.5);
            doc.setTextColor(100, 116, 139);
            doc.text("Start Date", 15 + colW + 11, statsBarY + 9.5);

            doc.line(15 + (colW * 2), statsBarY + 2, 15 + (colW * 2), statsBarY + 10);

            // Col 3: Vehicle
            const firstTrans = items.find(i => i.type === 'transport' || i.type === 'flight');
            const vehName = firstTrans ? cleanText(firstTrans.title) : 'Private AC Vehicle';
            drawVehicleIcon(doc, 15 + (colW * 2) + 4, statsBarY + 3.5);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(15, 23, 42);
            const vehLines = doc.splitTextToSize(vehName, colW - 14);
            doc.text(vehLines[0], 15 + (colW * 2) + 11, statsBarY + 6.5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5.5);
            doc.setTextColor(100, 116, 139);
            doc.text("Transfers & Cab", 15 + (colW * 2) + 11, statsBarY + 9.5);

            doc.line(15 + (colW * 3), statsBarY + 2, 15 + (colW * 3), statsBarY + 10);

            // Col 4: Meals
            drawMealIcon(doc, 15 + (colW * 3) + 4, statsBarY + 3.5);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(15, 23, 42);
            doc.text("Breakfast", 15 + (colW * 3) + 11, statsBarY + 6.5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5.5);
            doc.setTextColor(100, 116, 139);
            doc.text("Meal Plan Included", 15 + (colW * 3) + 11, statsBarY + 9.5);

            // D. Cover Photo Banner (30mm cinematic height)
            let coverImgH = 0;
            const coverTop = statsBarY + 15;
            if (coverImgBase64) {
                try {
                    coverImgH = 30;
                    doc.addImage(coverImgBase64, 'JPEG', 15, coverTop, contentW, coverImgH, undefined, 'FAST');
                    doc.setDrawColor(180, 83, 9);
                    doc.setLineWidth(0.4);
                    doc.roundedRect(15, coverTop, contentW, coverImgH, 1.5, 1.5, 'D');
                } catch {
                    coverImgH = 0;
                }
            }

            // E. Section Header: CURATED ITINERARY SCHEDULE
            y = coverImgH > 0 ? (coverTop + coverImgH + 6) : (statsBarY + 16);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(15, 23, 42);
            doc.text("CURATED DAY-BY-DAY ITINERARY", 15, y);
            doc.setDrawColor(180, 83, 9);
            doc.setLineWidth(0.4);
            doc.line(15, y + 1.5, 60, y + 1.5);
            doc.setDrawColor(226, 232, 240);
            doc.line(60, y + 1.5, pageW - 15, y + 1.5);

            y += 6;

            // ─── DAY-BY-DAY TIMELINE CARDS ──────────────────────────────────────────
            itineraryList.forEach((dayData) => {
                const dayItems = items
                    .filter(i => i.day === dayData.day)
                    .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

                // Retrieve day notes
                const dayNotes = cleanText((dayMeta[dayData.day] as any)?.notes || '').trim();

                // Calculate estimated day card height
                let estDayH = 14; // Day header bar
                if (dayItems.length === 0) {
                    estDayH += 10;
                } else {
                    dayItems.forEach(item => {
                        const desc = cleanText(item.description || '');
                        const descLines = desc ? doc.splitTextToSize(desc, contentW - 45).length : 0;
                        estDayH += Math.max(10, 5 + (descLines * 3.2) + 2);
                    });
                }
                if (dayNotes) {
                    const noteLines = doc.splitTextToSize(`DMC INSIDER TIP: ${dayNotes}`, contentW - 24).length;
                    estDayH += (noteLines * 3.2) + 6;
                }
                estDayH += 4; // margin

                // Smart Pagination boundary check
                if (y + estDayH > pageH - 18) {
                    doc.addPage();
                    currentPageNum++;
                    drawPageDecorations(doc, currentPageNum);
                    y = 24;

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(9);
                    doc.setTextColor(15, 23, 42);
                    doc.text(`CURATED ITINERARY (CONTINUED - DAY ${dayData.day})`, 15, y);
                    doc.setDrawColor(180, 83, 9);
                    doc.setLineWidth(0.4);
                    doc.line(15, y + 1.5, 65, y + 1.5);
                    doc.setDrawColor(226, 232, 240);
                    doc.line(65, y + 1.5, pageW - 15, y + 1.5);
                    y += 6;
                }

                const dayCardStartY = y;

                // Day Outer Card Container
                const dayHotel = items.find(i => i.day === dayData.day && i.type === 'hotel');
                const stayName = dayHotel ? cleanText(dayHotel.title) : '';

                // Render Day Header Bar
                doc.setFillColor(15, 23, 42);
                doc.roundedRect(15, y, contentW, 9, 1.5, 1.5, 'F');

                // Day Number Pill
                doc.setFillColor(217, 119, 6);
                doc.roundedRect(17, y + 1.5, 14, 6, 1, 1, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6.5);
                doc.setTextColor(255, 255, 255);
                doc.text(`DAY ${String(dayData.day).padStart(2, '0')}`, 24, y + 5.5, { align: 'center' });

                // Day Theme Title
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.setTextColor(255, 255, 255);
                const titleMaxW = stayName ? contentW - 85 : contentW - 38;
                const wrappedDayTitle = doc.splitTextToSize(cleanText(dayData.title), titleMaxW);
                doc.text(wrappedDayTitle[0], 34, y + 5.8);

                // Right Stay Badge (Clean subtle pill layout without hand-drawn line glitches)
                if (stayName) {
                    const cleanStay = cleanText(stayName);
                    const stayBadgeText = `Stay: ${cleanStay}`;
                    const stayLines = doc.splitTextToSize(stayBadgeText, 55);
                    const textW = doc.getTextWidth(stayLines[0]);
                    const badgeW = textW + 6;
                    const badgeX = pageW - 17 - badgeW;

                    // Clean dark pill background
                    doc.setFillColor(30, 41, 59);
                    doc.roundedRect(badgeX, y + 1.5, badgeW, 6, 1, 1, 'F');

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(6.2);
                    doc.setTextColor(253, 230, 138); // Amber light
                    doc.text("Stay: ", badgeX + 3, y + 5.5);

                    const labelW = doc.getTextWidth("Stay: ");
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(255, 255, 255);
                    doc.text(stayLines[0].replace(/^Stay:\s*/i, ''), badgeX + 3 + labelW, y + 5.5);
                }

                let currentItemY = y + 12;

                // Day Items Timeline Entries
                if (dayItems.length === 0) {
                    doc.setFont('helvetica', 'italic');
                    doc.setFontSize(7.5);
                    doc.setTextColor(100, 116, 139);
                    doc.text("Leisure day for relaxation and personal exploration.", 22, currentItemY + 3);
                    currentItemY += 8;
                } else {
                    dayItems.forEach((item, itemIdx) => {
                        // Category Badge
                        let badgeBg: [number, number, number] = [241, 245, 249];
                        let badgeTextCol: [number, number, number] = [71, 85, 105];
                        let badgeIcon = 'ACTIVITY';

                        if (item.type === 'transport' || item.type === 'flight') {
                            badgeBg = [238, 242, 255]; // Indigo-50
                            badgeTextCol = [67, 56, 202]; // Indigo-700
                            badgeIcon = 'TRANSFER';
                        } else if (item.type === 'hotel') {
                            badgeBg = [254, 243, 199]; // Amber-50
                            badgeTextCol = [180, 83, 9]; // Amber-700
                            badgeIcon = 'HOTEL';
                        } else if (item.type === 'activity') {
                            badgeBg = [236, 253, 245]; // Emerald-50
                            badgeTextCol = [4, 120, 87]; // Emerald-700
                            badgeIcon = 'ACTIVITY';
                        } else if (item.type === 'guide') {
                            badgeBg = [240, 249, 255]; // Sky-50
                            badgeTextCol = [3, 105, 161]; // Sky-700
                            badgeIcon = 'GUIDE';
                        }

                        // Time pill
                        const timeStr = cleanText(item.time || 'Schedule');
                        doc.setFillColor(248, 250, 252);
                        doc.setDrawColor(226, 232, 240);
                        doc.setLineWidth(0.2);
                        doc.roundedRect(18, currentItemY, 17, 4.5, 0.8, 0.8, 'FD');
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(5.5);
                        doc.setTextColor(15, 23, 42);
                        doc.text(timeStr, 26.5, currentItemY + 3.2, { align: 'center' });

                        // Type Pill
                        doc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2]);
                        doc.roundedRect(37, currentItemY, 16, 4.5, 0.8, 0.8, 'F');
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(5);
                        doc.setTextColor(badgeTextCol[0], badgeTextCol[1], badgeTextCol[2]);
                        doc.text(badgeIcon, 45, currentItemY + 3.2, { align: 'center' });

                        // Item Title
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(7.5);
                        doc.setTextColor(15, 23, 42);
                        doc.text(cleanText(item.title), 56, currentItemY + 3.3);

                        // Item Description
                        const desc = cleanText(item.description || '');
                        if (desc) {
                            doc.setFont('helvetica', 'normal');
                            doc.setFontSize(6.8);
                            doc.setTextColor(71, 85, 105);
                            const descLines = doc.splitTextToSize(desc, contentW - 42);
                            doc.text(descLines, 56, currentItemY + 7.5, { lineHeightFactor: 1.25 });
                            currentItemY += 7.5 + (descLines.length * 3.1) + 2.5;
                        } else {
                            currentItemY += 7;
                        }

                        // Light dotted divider between items
                        if (itemIdx < dayItems.length - 1) {
                            doc.setDrawColor(241, 245, 249);
                            doc.setLineWidth(0.2);
                            doc.line(22, currentItemY - 1, pageW - 22, currentItemY - 1);
                            currentItemY += 1.5;
                        }
                    });
                }

                // Day Notes Banner (Clean vector callout with proper margins)
                if (dayNotes) {
                    const noteWrapped = doc.splitTextToSize(`DMC INSIDER TIP: ${dayNotes}`, contentW - 24);
                    const noteH = (noteWrapped.length * 3.2) + 4.5;
                    doc.setFillColor(254, 243, 199);
                    doc.setDrawColor(251, 191, 36);
                    doc.setLineWidth(0.2);
                    doc.roundedRect(18, currentItemY, contentW - 6, noteH, 1, 1, 'FD');

                    doc.setDrawColor(180, 83, 9);
                    doc.setLineWidth(0.6);
                    doc.line(18.1, currentItemY + 0.2, 18.1, currentItemY + noteH - 0.2);

                    doc.setFont('helvetica', 'bolditalic');
                    doc.setFontSize(6.2);
                    doc.setTextColor(180, 83, 9);
                    doc.text(noteWrapped, 22, currentItemY + 3.2, { lineHeightFactor: 1.25 });
                    currentItemY += noteH + 2;
                }

                // Finalize Card Container Border
                const actualCardH = currentItemY - dayCardStartY + 2;
                doc.setDrawColor(226, 232, 240);
                doc.setLineWidth(0.3);
                doc.roundedRect(15, dayCardStartY, contentW, actualCardH, 1.5, 1.5, 'D');

                y = currentItemY + 5;
            });

            // ─── DEDICATED CLOSING SUMMARY PAGE ─────────────────────────────────────
            // If the summary tables + inclusions don't fit comfortably on the current page, create a dedicated closing page
            const summaryTablesEstimatedH = (accommodations.length > 0 ? 25 : 0) + (transports.length > 0 ? 25 : 0) + 95;
            if (y + summaryTablesEstimatedH > pageH - 18 || y > pageH - 95) {
                doc.addPage();
                currentPageNum++;
                drawPageDecorations(doc, currentPageNum);
                y = 24;
            }

            // Summary Section Title
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(15, 23, 42);
            doc.text("SERVICES & SUMMARY MATRIX", 15, y);
            doc.setDrawColor(180, 83, 9);
            doc.setLineWidth(0.4);
            doc.line(15, y + 1.5, 62, y + 1.5);
            doc.setDrawColor(226, 232, 240);
            doc.line(62, y + 1.5, pageW - 15, y + 1.5);
            y += 5;

            // Summary Table 1: Accommodations (concise facts, no harsh ellipsis)
            if (accommodations.length > 0) {
                const accBody = accommodations.map(acc => {
                    const rawDesc = cleanText(acc.description || '');
                    let details = 'Deluxe Room | Daily Breakfast Included';
                    if (rawDesc) {
                        if (rawDesc.length <= 65) {
                            details = rawDesc;
                        } else {
                            const firstSentence = rawDesc.split(/[.!?]/)[0];
                            details = (firstSentence.length >= 10 && firstSentence.length <= 65) 
                                ? firstSentence 
                                : 'Deluxe Boutique Room | Daily Breakfast Included';
                        }
                    }
                    return [
                        `Day ${acc.day}`,
                        cleanText(acc.title),
                        cleanText(destinationName),
                        details
                    ];
                });

                autoTable(doc, {
                    startY: y,
                    margin: { left: 15, right: 15 },
                    theme: 'striped',
                    head: [['Day', 'Property Name', 'Location', 'Room Details & Meal Plan']],
                    body: accBody,
                    styles: { fontSize: 6.8, font: 'helvetica', textColor: [51, 65, 85], cellPadding: 2 },
                    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
                    columnStyles: {
                        0: { cellWidth: 16, fontStyle: 'bold', textColor: [15, 23, 42] },
                        1: { cellWidth: 45, fontStyle: 'bold', textColor: [15, 23, 42] },
                        2: { cellWidth: 32 },
                        3: { cellWidth: 'auto' }
                    },
                    alternateRowStyles: { fillColor: [250, 249, 246] },
                    didDrawPage: (data) => {
                        if (data.pageNumber > currentPageNum) {
                            currentPageNum = data.pageNumber;
                            drawPageDecorations(doc, currentPageNum);
                        }
                    }
                });

                y = (doc as any).lastAutoTable.finalY + 5;
            }

            // Summary Table 2: Transports (concise facts, no harsh ellipsis)
            if (transports.length > 0) {
                const transBody = transports.map(trans => {
                    const rawDesc = cleanText(trans.description || '');
                    let scope = 'Private AC Chauffeur Vehicle | Fuel & Tolls Included';
                    if (rawDesc) {
                        if (rawDesc.length <= 65) {
                            scope = rawDesc;
                        } else {
                            const firstSentence = rawDesc.split(/[.!?]/)[0];
                            scope = (firstSentence.length >= 10 && firstSentence.length <= 65)
                                ? firstSentence
                                : 'Private AC Chauffeur Vehicle | Dedicated Transfers';
                        }
                    }
                    return [
                        `Day ${trans.day}`,
                        cleanText(trans.title),
                        scope
                    ];
                });

                autoTable(doc, {
                    startY: y,
                    margin: { left: 15, right: 15 },
                    theme: 'striped',
                    head: [['Day', 'Service & Route', 'Fleet & Scope Details']],
                    body: transBody,
                    styles: { fontSize: 6.8, font: 'helvetica', textColor: [51, 65, 85], cellPadding: 2 },
                    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
                    columnStyles: {
                        0: { cellWidth: 16, fontStyle: 'bold', textColor: [15, 23, 42] },
                        1: { cellWidth: 55, fontStyle: 'bold', textColor: [15, 23, 42] },
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

                y = (doc as any).lastAutoTable.finalY + 6;
            }

            // ─── INCLUSIONS, EXCLUSIONS & PAYMENT TERMS ────────────────────────────
            const gap = 2;
            const cardW = (contentW - (2 * gap)) / 3; // 58.6mm per card
            const innerW = cardW - 8;

            const finalInclusions = inc.map(cleanItemText).filter(Boolean);
            const finalExclusions = exc.map(cleanItemText).filter(Boolean);

            let incH = 14;
            finalInclusions.forEach(item => {
                const lines = doc.splitTextToSize(item, innerW - 4).length;
                incH += Math.max(6, lines * 3.1 + 1.2);
            });

            let excH = 14;
            finalExclusions.forEach(item => {
                const lines = doc.splitTextToSize(item, innerW - 4).length;
                excH += Math.max(6, lines * 3.1 + 1.2);
            });

            const paymentCardH = 46;
            const maxCardH = Math.max(incH, excH, paymentCardH);

            if (y + maxCardH + 36 > pageH - 18) {
                doc.addPage();
                currentPageNum++;
                drawPageDecorations(doc, currentPageNum);
                y = 24;
            }

            const c1x = 15;
            const c2x = 15 + cardW + gap;
            const c3x = 15 + (cardW + gap) * 2;

            // Card 1: Inclusions
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.roundedRect(c1x, y, cardW, maxCardH, 1.5, 1.5, 'FD');

            drawCheckCircle(doc, c1x + 3, y + 2.5);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(15, 23, 42);
            doc.text("INCLUSIONS", c1x + 9.5, y + 6);
            doc.setDrawColor(5, 150, 105);
            doc.setLineWidth(0.4);
            doc.line(c1x + 3, y + 8.5, c1x + cardW - 3, y + 8.5);

            let incY = y + 11;
            finalInclusions.forEach((item) => {
                drawCheckmarkBadge(doc, c1x + 3, incY + 1.2);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(6.2);
                doc.setTextColor(51, 65, 85);
                const wrapped = doc.splitTextToSize(item, innerW - 4);
                doc.text(wrapped, c1x + 8, incY + 1.8);
                incY += Math.max(5.8, wrapped.length * 3.1 + 1);
            });

            // Card 2: Exclusions
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.roundedRect(c2x, y, cardW, maxCardH, 1.5, 1.5, 'FD');

            drawCrossCircle(doc, c2x + 3, y + 2.5);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(15, 23, 42);
            doc.text("EXCLUSIONS", c2x + 9.5, y + 6);
            doc.setDrawColor(220, 38, 38);
            doc.setLineWidth(0.4);
            doc.line(c2x + 3, y + 8.5, c2x + cardW - 3, y + 8.5);

            let excY = y + 11;
            finalExclusions.forEach((item) => {
                drawCrossmarkBadge(doc, c2x + 3, excY + 1.2);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(6.2);
                doc.setTextColor(51, 65, 85);
                const wrapped = doc.splitTextToSize(item, innerW - 4);
                doc.text(wrapped, c2x + 8, excY + 1.8);
                excY += Math.max(5.8, wrapped.length * 3.1 + 1);
            });

            // Card 3: Payment Terms
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.roundedRect(c3x, y, cardW, maxCardH, 1.5, 1.5, 'FD');

            drawCardIcon(doc, c3x + 3, y + 2);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(15, 23, 42);
            doc.text("PAYMENT TERMS", c3x + 9.5, y + 6);
            doc.setDrawColor(180, 83, 9);
            doc.setLineWidth(0.4);
            doc.line(c3x + 3, y + 8.5, c3x + cardW - 3, y + 8.5);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.setTextColor(180, 83, 9);
            doc.text("50%", c3x + 4, y + 18);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5.8);
            doc.setTextColor(100, 116, 139);
            doc.text("Advance upon booking confirmation", c3x + 4, y + 22.5);

            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.25);
            for (let dX = c3x + 3; dX < c3x + cardW - 3; dX += 2) {
                doc.line(dX, y + 26.5, dX + 1, y + 26.5);
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.setTextColor(180, 83, 9);
            doc.text("100%", c3x + 4, y + 35.5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5.8);
            doc.setTextColor(100, 116, 139);
            doc.text("Balance payment 7 days prior to travel", c3x + 4, y + 40);

            y += maxCardH + 5;

            // ─── SHRAWELLO LUXURY PROMISE & ASSURANCE BLOCK ─────────────────────────
            const promiseH = 25;
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.roundedRect(15, y, contentW, promiseH, 1.5, 1.5, 'FD');

            // Gold accent left line
            doc.setDrawColor(180, 83, 9);
            doc.setLineWidth(0.6);
            doc.line(15.2, y + 0.2, 15.2, y + promiseH - 0.2);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.2);
            doc.setTextColor(15, 23, 42);
            doc.text("SHRAWELLO LUXURY PROMISE & TRIP GUIDELINES", 20, y + 5);

            doc.setDrawColor(241, 245, 249);
            doc.setLineWidth(0.25);
            doc.line(20, y + 7, pageW - 19, y + 7);

            const pColW = (contentW - 14) / 2;

            // Guarantee 1
            drawCheckmarkBadge(doc, 20, y + 11.5);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.2);
            doc.setTextColor(5, 150, 105);
            doc.text("24/7 Dedicated Concierge", 26, y + 11.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text("Personal tour manager assigned throughout your stay.", 26, y + 15);

            // Guarantee 2
            drawCheckmarkBadge(doc, 20, y + 19.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(5, 150, 105);
            doc.text("Verified Chauffeurs & Fleets", 26, y + 19.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text("Licensed, punctual & courteous English/Hindi drivers.", 26, y + 23);

            // Guarantee 3
            drawCheckmarkBadge(doc, 20 + pColW, y + 11.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(5, 150, 105);
            doc.text("Hand-Picked Boutique Stays", 26 + pColW, y + 11.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text("Inspected for superior hygiene, amenities & comfort.", 26 + pColW, y + 15);

            // Guarantee 4
            drawCheckmarkBadge(doc, 20 + pColW, y + 19.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(5, 150, 105);
            doc.text("100% Transparent Pricing", 26 + pColW, y + 19.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text("No hidden taxes, extra tolls, or surprise charges.", 26 + pColW, y + 23);

            y += promiseH + 5;

            // Terms & Conditions (if present)
            const rawTerms = tripDetails.termsAndConditions || '';
            const cleanTerms = cleanText(rawTerms).trim();
            if (cleanTerms) {
                const termsParas = cleanTerms.split('\n').map(p => p.trim()).filter(Boolean);
                const termsWrapped = termsParas.map(p => doc.splitTextToSize(p, contentW - 12));
                const termsH = termsWrapped.reduce((acc, lines) => acc + (lines.length * 3.2) + 1.5, 0) + 12;

                if (y + termsH > pageH - 18) {
                    doc.addPage();
                    currentPageNum++;
                    drawPageDecorations(doc, currentPageNum);
                    y = 24;
                }

                doc.setFillColor(255, 255, 255);
                doc.setDrawColor(226, 232, 240);
                doc.setLineWidth(0.3);
                doc.roundedRect(15, y, contentW, termsH, 1.5, 1.5, 'FD');

                doc.setDrawColor(180, 83, 9);
                doc.setLineWidth(0.6);
                doc.line(15.2, y + 0.2, 15.2, y + termsH - 0.2);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.5);
                doc.setTextColor(15, 23, 42);
                doc.text("TERMS & CONDITIONS", 20, y + 5.5);
                doc.setDrawColor(241, 245, 249);
                doc.setLineWidth(0.25);
                doc.line(20, y + 7.5, pageW - 19, y + 7.5);

                let tY = y + 11;
                termsWrapped.forEach(lines => {
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(6.2);
                    doc.setTextColor(71, 85, 105);
                    doc.text(lines, 20, tY, { lineHeightFactor: 1.25 });
                    tY += (lines.length * 3.2) + 1.5;
                });

                y += termsH + 5;
            }

            // ─── OFFICIAL SIGNATURE & WHATSAPP FOOTER ────────────────────────────────
            if (y + 20 > pageH - 18) {
                doc.addPage();
                currentPageNum++;
                drawPageDecorations(doc, currentPageNum);
                y = 24;
            }

            // Separator
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(15, y, pageW - 15, y);

            y += 4;

            // Cursive Thanks
            doc.setFont('times', 'italic');
            doc.setFontSize(10.5);
            doc.setTextColor(180, 83, 9);
            doc.text("Thank you for trusting SHRAWELLO Travel Hub.", pageW / 2, y, { align: 'center' });

            // Interactive WhatsApp Inquiry Pill Button (Expanded width & vector icon)
            y += 3.5;
            const btnW = 100;
            const btnH = 8;
            const btnX = (pageW - btnW) / 2;

            doc.setFillColor(15, 23, 42);
            doc.roundedRect(btnX, y, btnW, btnH, 1.5, 1.5, 'F');
            
            drawWhatsAppIcon(doc, btnX + 4, y + 1.5);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.2);
            doc.setTextColor(255, 255, 255);
            doc.text("Chat with Travel Specialist (+91 80109 55675)", btnX + 13, y + 5.2);

            try {
                const whatsappMsg = `Hi SHRAWELLO Team, I would like to confirm/inquire about the itinerary: ${tripDetails.title || 'Tour'}`;
                const whatsappUrl = `https://wa.me/918010955675?text=${encodeURIComponent(whatsappMsg)}`;
                doc.link(btnX, y, btnW, btnH, { url: whatsappUrl });
            } catch {}

            // Replace total pages count string across all pages
            if (typeof doc.putTotalPages === 'function') {
                doc.putTotalPages(totalPagesExp);
            }

            // Save PDF
            const filename = `Itinerary_${(tripDetails.title || 'Trip').replace(/\s+/g, '_')}_${tripDetails.startDate || 'draft'}.pdf`;
            doc.save(filename);
            toast.dismiss(toastId);
            toast.success('Luxury Itinerary PDF Downloaded Successfully!');
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
                                <span>🗓️ {formatTripDuration({ nights: tripDetails.nights, days: tripDetails.days })}</span>
                            </div>
                            {validUntilDate && (
                                <p className="text-[10px] font-bold text-amber-600 mt-1.5 flex items-center gap-1">
                                    <Clock size={10} /> Quote valid until: {validUntilDate}
                                </p>
                            )}
                        </div>
                        <div className="text-left md:text-right">
                            <div className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-0.5">Starting Per Person</div>
                            <div className="text-xl md:text-2xl font-black text-amber-600">
                                {formatCurrency(pricePerPax > 0 ? pricePerPax : Math.round(finalPrice / (guestCount > 0 ? guestCount : 1)))}
                                <span className="text-xs font-bold text-stone-500 ml-1">/ person</span>
                            </div>
                            <div className="text-[10px] font-bold text-stone-500 mt-1 bg-stone-100 px-2.5 py-1 rounded-lg inline-block">
                                Total Investment: <span className="font-bold text-stone-800">{formatCurrency(finalPrice)}</span> ({guestCount} Guests)
                            </div>
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
                                {day.items && day.items.length > 0 ? (
                                    <div className="space-y-2.5 bg-stone-50/80 p-4 rounded-xl border border-stone-100">
                                        {day.items.map((item, idx) => (
                                            <div key={item.id || idx} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-stone-100 shadow-xs">
                                                <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                                                    <span className="text-[10px] font-black text-stone-700 bg-stone-100 px-2 py-0.5 rounded font-mono">
                                                        {item.time || 'Schedule'}
                                                    </span>
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                                        item.type === 'hotel' ? 'bg-amber-50 text-amber-700' :
                                                        item.type === 'transport' || item.type === 'flight' ? 'bg-indigo-50 text-indigo-700' :
                                                        item.type === 'activity' ? 'bg-emerald-50 text-emerald-700' :
                                                        'bg-slate-100 text-slate-700'
                                                    }`}>
                                                        {item.type || 'activity'}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-xs font-bold text-stone-900 leading-snug">{item.title}</h4>
                                                    {item.description && (
                                                        <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">{item.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-stone-500 text-xs leading-relaxed whitespace-pre-line bg-stone-50 p-4 rounded-xl border border-stone-100">
                                        {day.desc}
                                    </div>
                                )}
                                {/* Day Notes */}
                                {dayMeta[day.day]?.notes && (
                                    <div className="mt-2.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 rounded-lg px-3.5 py-2.5 leading-relaxed flex items-start gap-2 shadow-xs">
                                        <span className="shrink-0 text-amber-600 font-bold">💡 Tip:</span>
                                        <span>{dayMeta[day.day].notes}</span>
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
                                const text = `🏝️ *Trip to ${destinationName}*\n📅 ${formatTripDuration({ nights: tripDetails.nights, days: tripDetails.days })} | ${guestCount} Guests\n💰 ₹${finalPrice.toLocaleString()}\n\n*Itinerary:*\n${items.map(item => `Day ${item.day}: ${item.title}`).join('\n')}\n\nBook now with SHRAWELLO Travel Hub! 🚀`;
                                copyToClipboard(text).then(success => {
                                    if (success) {
                                        toast.success('Itinerary copied to clipboard!');
                                    } else {
                                        toast.error('Failed to copy itinerary');
                                    }
                                });
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
                            copyToClipboard(url).then(success => {
                                if (success) {
                                    toast.success('Web Link copied to clipboard!');
                                } else {
                                    toast.error('Failed to copy Web Link');
                                }
                            });
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
