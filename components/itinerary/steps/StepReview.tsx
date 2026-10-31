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

import { generateLuxuryItineraryPDF } from '../../../utils/itineraryPdfGenerator';
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

    const { addPackage, updatePackage, masterLocations, masterMealPlans, masterRoomTypes } = useData();
    const navigate = useNavigate();
    const [isSaving, setIsSaving] = useState(false);

    const getMealPlanLabel = (codeOrId?: string) => {
        if (!codeOrId) return 'CP (Continental Plan)';
        const plan = masterMealPlans?.find(p => p.id === codeOrId || p.code === codeOrId);
        if (plan) return `${plan.code} (${plan.name})`;
        if (codeOrId === 'EP') return 'EP (European Plan - Room Only)';
        if (codeOrId === 'CP') return 'CP (Continental Plan - Breakfast)';
        if (codeOrId === 'MAP') return 'MAP (Modified American Plan - Breakfast & Dinner)';
        if (codeOrId === 'AP') return 'AP (American Plan - All Meals)';
        if (codeOrId === 'AI') return 'AI (All Inclusive)';
        return codeOrId;
    };

    const getMealPlanShortName = (codeOrId?: string) => {
        if (!codeOrId) return 'Breakfast Included';
        const plan = masterMealPlans?.find(p => p.id === codeOrId || p.code === codeOrId);
        if (plan) return plan.name;
        if (codeOrId === 'EP') return 'Room Only';
        if (codeOrId === 'CP') return 'Breakfast Included';
        if (codeOrId === 'MAP') return 'Breakfast & Dinner';
        if (codeOrId === 'AP') return 'All Meals';
        if (codeOrId === 'AI') return 'All Inclusive';
        return codeOrId;
    };

    const getRoomTypeName = (roomTypeId?: string) => {
        if (!roomTypeId) return 'Deluxe / Standard Room';
        const rt = masterRoomTypes?.find(r => r.id === roomTypeId);
        return rt ? rt.name : roomTypeId;
    };

    const guestCount = (Number(tripDetails.adults) || 0) + (Number(tripDetails.children) || 0);
    const finalPrice = Number(grandTotal) || 0;

    // Per-pax breakdown (Guarded against NaN)
    const pricePerAdult = (Number(tripDetails.adults) || 0) > 0 ? Math.round(finalPrice / (Number(tripDetails.adults) || 1)) : 0;
    const pricePerPax = guestCount > 0 ? Math.round(finalPrice / guestCount) : finalPrice;

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
        const toastId = toast.loading('Generating executive 5-page luxury proposal PDF... Please wait.');
        try {
            await generateLuxuryItineraryPDF({
                tripDetails,
                items,
                grandTotal,
                finalPrice,
                guestCount,
                pricePerPax,
                accommodations,
                transports,
                destinationName,
                masterLocations,
                masterMealPlans,
                masterRoomTypes,
                getMealPlanShortName,
                getRoomTypeName,
                itineraryList: generatePackageItinerary()
            });
            toast.dismiss(toastId);
            toast.success('Executive 5-Page Luxury Proposal PDF Generated & Downloaded!');
        } catch (err: any) {
            console.error('PDF Error:', err);
            toast.dismiss();
            toast.error('PDF generation failed: ' + (err?.message || 'Unknown error'));
        }
    };

    const handleShareWhatsApp = () => {
        const text = `Here is the itinerary for *${tripDetails.title}* \n📅 Start Date: ${tripDetails.startDate}\n\nPlease check the attached PDF for full details.`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const itineraryList = generatePackageItinerary();

    return (
        <div className="min-h-full flex flex-col lg:flex-row pb-20 lg:pb-0">

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
                            <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-stone-100">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold">
                                    👥 {tripDetails.roomSharing || 'Double'} Sharing Room
                                    {tripDetails.roomSharing === 'Triple' && (
                                        <span className="text-[9px] bg-amber-200 text-amber-950 px-1 rounded font-extrabold">+ Extra Bed Included</span>
                                    )}
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-bold">
                                    🍽️ Meal Plan: {getMealPlanLabel(tripDetails.mealPlanId || tripDetails.mealPlanCode)}
                                </span>
                                {tripDetails.roomsCount && tripDetails.roomsCount > 0 && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-bold">
                                        🛏️ {tripDetails.roomsCount} {tripDetails.roomsCount === 1 ? 'Room' : 'Rooms'}
                                    </span>
                                )}
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
                                    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-xs">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-stone-50 text-stone-600 border-b border-stone-200 font-bold">
                                                <tr>
                                                    <th className="px-4 py-3 w-16">Day</th>
                                                    <th className="px-4 py-3">Property</th>
                                                    <th className="px-4 py-3">Room Category</th>
                                                    <th className="px-4 py-3">Sharing & Occupancy</th>
                                                    <th className="px-4 py-3">Meal Plan</th>
                                                    <th className="px-4 py-3">Notes</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-stone-100">
                                                {accommodations.map(acc => {
                                                    const sharing = acc.roomSharing || tripDetails.roomSharing || 'Double';
                                                    const mealCode = acc.mealPlanCode || tripDetails.mealPlanCode || 'CP';
                                                    const isTriple = sharing === 'Triple';
                                                    return (
                                                        <tr key={acc.id} className="hover:bg-stone-50/50 transition-colors">
                                                            <td className="px-4 py-3 font-bold text-stone-900">Day {acc.day}</td>
                                                            <td className="px-4 py-3 font-bold text-stone-900">
                                                                {acc.title}
                                                                {acc.quantity && acc.quantity > 1 && (
                                                                    <span className="ml-2 text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                                                        {acc.quantity} Rooms
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-stone-700 font-medium">
                                                                {getRoomTypeName(acc.roomTypeId)}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                                                                    isTriple
                                                                        ? 'bg-amber-50 text-amber-900 border-amber-300'
                                                                        : sharing === 'Single'
                                                                            ? 'bg-slate-50 text-slate-800 border-slate-200'
                                                                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                                }`}>
                                                                    👥 {sharing} Sharing
                                                                    {isTriple && (
                                                                        <span className="text-[9px] bg-amber-200 text-amber-950 px-1 rounded font-extrabold">+ Extra Bed</span>
                                                                    )}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                                                    🍽️ {mealCode} ({getMealPlanShortName(acc.mealPlanId || mealCode)})
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-stone-500 text-[11px]">{acc.description || '-'}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                        {(tripDetails.roomSharing === 'Triple' || accommodations.some(a => a.roomSharing === 'Triple')) && (
                                            <div className="bg-amber-50/80 border-t border-amber-200/60 px-4 py-2.5 text-[11px] text-amber-900 flex items-center gap-2">
                                                <span className="font-bold text-amber-800">💡 Triple Sharing Notice:</span>
                                                <span>Room configuration includes 1 Double Bed + 1 Rollaway or Foldable Extra Bed with mattress as per standard hotel policy.</span>
                                            </div>
                                        )}
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
            <div className="w-full lg:w-80 bg-white border-t lg:border-t-0 lg:border-l border-stone-200 flex flex-col shadow-2xl z-20 print:hidden shrink-0">
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

            {/* Mobile Fixed Quick Actions Bar */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200 p-3 px-4 flex items-center justify-between gap-3 z-50 print:hidden shadow-xl">
                <div>
                    <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Total Investment</div>
                    <div className="text-base font-black text-stone-900">{formatCurrency(finalPrice)}</div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownloadPDF}
                        className="px-3.5 py-2 bg-stone-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                        <Download size={14} /> PDF
                    </button>
                    <button
                        onClick={handleShareWhatsApp}
                        className="px-3.5 py-2 bg-[#25D366] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                        <Share2 size={14} /> Share
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-60"
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                    </button>
                </div>
            </div>
        </div>
    );
};