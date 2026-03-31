import React from 'react';
import { useItinerary } from '../ItineraryContext';
import { useData } from '../../../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { Package } from '../../../types';
import { DollarSign, Save, ArrowLeft, MapPin, Calendar, Users, Printer, Share2 } from 'lucide-react';
import { toast } from 'sonner';

export const StepReview: React.FC = () => {
    const { 
        tripDetails, 
        items, 
        grandTotal, 
        setStep, 
        packageMarkupPercent, 
        packageMarkupFlat, 
        packageMarkupAmount, 
        setPackageMarkup, 
        formatCurrency, 
        editPackageId, 
        currency, 
        taxConfig,
        dayMeta,
        subtotal
    } = useItinerary();
    
    const { addPackage, updatePackage } = useData();
    const navigate = useNavigate();

    // Guest count helper
    const guestCount = (tripDetails.adults || 0) + (tripDetails.children || 0);

    // The finalPrice now comes from context grandTotal which already includes package markup + tax
    const finalPrice = grandTotal;

    // Helper to format itinerary for the Package object
    const generatePackageItinerary = () => {
        const days = Array.from({ length: tripDetails.days }, (_, i) => i + 1);

        return days.map(day => {
            const dayItems = items.filter(i => i.day === day);

            // Build a description from the items
            let desc = dayItems.length === 0
                ? "Leisure day for personal exploration."
                : dayItems.sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                    .map(item => `• ${item.time ? item.time + ': ' : ''}${item.title}${item.description ? ' - ' + item.description : ''}`)
                    .join('\n');

            return {
                day: day,
                title: dayItems.find(i => i.type === 'activity')?.title || (day === 1 ? 'Arrival' : `Day ${day} Itinerary`),
                desc: desc,
                items: dayItems // Keep ref for custom rendering if needed
            };
        });
    };

    const handleSave = () => {
        if (!tripDetails.title) {
            toast.error("Title is missing!");
            return;
        }

        // 1. Collect all images for the gallery
        const dayImages = Object.values(dayMeta || {}).map((m: any) => m.image).filter(Boolean);
        const fullGallery = [tripDetails.coverImage, ...dayImages].filter((url, index, self) => url && self.indexOf(url) === index);

        const packageData: Partial<Package> = {
            title: tripDetails.title,
            days: tripDetails.days,
            groupSize: String(guestCount),
            location: tripDetails.destination || 'Custom',
            description: `Custom itinerary created for ${guestCount || 'Valued Guests'}.`,
            price: finalPrice,
            image: tripDetails.coverImage,
            theme: 'Custom',
            overview: `A ${tripDetails.nights} Nights / ${tripDetails.days} Days journey to ${tripDetails.destination || 'Paradise'}.`,
            highlights: items.slice(0, 4).map(i => ({ icon: 'star', label: i.title })),
            itinerary: generatePackageItinerary(),
            gallery: fullGallery,
            status: 'Active',
            included: tripDetails.included || [],
            notIncluded: tripDetails.notIncluded || [],
            builderData: {
                tripDetails,
                items,
                dayMeta,
                currency,
                taxConfig,
                packageMarkupPercent,
                packageMarkupFlat
            }
        };

        if (editPackageId) {
            updatePackage(editPackageId, packageData);
            toast.success("Package updated successfully!");
        } else {
            const newPackage: Package = {
                id: `pkg-${Date.now()}`,
                ...packageData
            } as Package;
            addPackage(newPackage);
            toast.success("Package created successfully!");
        }

        navigate('/admin/packages');
    };

    const handlePrint = () => {
        window.print();
    };

    const handleShareWhatsApp = () => {
        const text = `Here is the itinerary for *${tripDetails.title}* (%0AStart Date: ${tripDetails.startDate}%0A%0APlease check the attached PDF for full details.`;
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    const itineraryList = generatePackageItinerary();

    return (
        <div className="h-full flex flex-col md:flex-row bg-slate-50 dark:bg-[#0B1116] overflow-hidden">

            {/* LEFT: Document Preview */}
            <div className="flex-1 overflow-y-auto p-4 md:p-12 print:p-0 print:overflow-visible">
                <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 min-h-[800px] shadow-2xl rounded-sm p-6 md:p-12 relative animate-in zoom-in-95 duration-500 print:shadow-none print:m-0 print:w-full print:max-w-none">

                    {/* Document Header */}
                    <div className="border-b-2 border-slate-900 dark:border-white pb-6 md:pb-6 mb-6 md:mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">{tripDetails.title}</h1>
                            <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs font-bold text-slate-500">
                                <span className="flex items-center gap-1"><MapPin size={12} /> {tripDetails.destination}</span>
                                <span className="flex items-center gap-1"><Calendar size={12} /> {tripDetails.startDate}</span>
                                <span className="flex items-center gap-1"><Users size={12} /> {guestCount} Guests</span>
                                <span className="flex items-center gap-1">🌙 {tripDetails.nights}N / ☀️ {tripDetails.days}D</span>
                            </div>
                        </div>
                        <div className="text-left md:text-right">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Total Cost</div>
                            <div className="text-xl md:text-2xl font-black text-indigo-600">₹{finalPrice.toLocaleString()}</div>
                        </div>
                    </div>

                    {/* Itinerary Timeline */}
                    <div className="space-y-8 relative">
                        <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-100 dark:bg-slate-800" />

                        {itineraryList.map((day) => (
                            <div key={day.day} className="relative pl-10">
                                <div className="absolute left-0 top-0 size-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full flex items-center justify-center font-bold text-sm z-10">
                                    {day.day}
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{day.title}</h3>
                                <div className="text-slate-500 text-sm leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                    {day.desc}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="mt-16 pt-8 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-slate-400 text-xs uppercase tracking-widest font-bold">
                        <span>Generated by Shravya Tours</span>
                        <span>Page 1 of 1</span>
                    </div>

                </div>
            </div>

            {/* RIGHT: Costing Panel */}
            <div className="w-full md:w-96 bg-white dark:bg-[#1A2633] border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl z-20 print:hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                        <DollarSign size={20} className="text-green-500" /> Costing & Margins
                    </h3>
                </div>

                <div className="flex-1 p-6 space-y-8 overflow-y-auto">

                    {/* Net Cost Display */}
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Item Subtotal</div>
                        <div className="text-lg md:text-xl font-black text-slate-900 dark:text-white">{formatCurrency(subtotal)}</div>
                    </div>

                    {/* Package Markup Controls */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Package Markup</label>
                            {packageMarkupAmount > 0 && (
                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded">
                                    + {formatCurrency(packageMarkupAmount)}
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-indigo-500 uppercase mb-1 block">Markup %</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={packageMarkupPercent}
                                        onChange={(e) => setPackageMarkup(parseFloat(e.target.value) || 0, packageMarkupFlat)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 font-black text-base focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-indigo-400 pointer-events-none">%</div>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-purple-500 uppercase mb-1 block">Extra ₹</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        value={packageMarkupFlat}
                                        onChange={(e) => setPackageMarkup(packageMarkupPercent, parseFloat(e.target.value) || 0)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 font-black text-base focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-purple-400 pointer-events-none">₹</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-200 dark:border-slate-800 my-4" />

                    {/* Final Price */}
                    <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Grand Total (incl. markup + tax)</label>
                        <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">{formatCurrency(finalPrice)}</div>
                    </div>

                </div>

                <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-3">
                    <button
                        onClick={handleSave}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 active:scale-95 group"
                    >
                        <Save size={20} /> Save Package
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setStep(2)}
                            className="w-full py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                        >
                            <ArrowLeft size={16} /> Edit
                        </button>
                        <button onClick={handlePrint} className="w-full py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                            <Printer size={16} /> Print PDF
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => {
                            const text = `🏝️ *Trip to ${tripDetails.destination || 'Paradise'}*\n📅 ${tripDetails.nights}N/${tripDetails.days}D | ${guestCount} Guests\n💰 ₹${finalPrice.toLocaleString()}\n\n*Itinerary:*\n${items.map((item, i) => `Day ${i + 1}: ${item.title}`).join('\n')}\n\nBook now with Shravya Tours! 🚀`;
                            navigator.clipboard.writeText(text);
                            toast.success("Itinerary copied to clipboard!");
                        }} className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-sm">content_copy</span> Copy Text
                        </button>
                        <button onClick={handleShareWhatsApp} className="w-full py-3 bg-[#25D366] text-white font-bold rounded-xl shadow-lg shadow-green-500/20 hover:bg-[#128C7E] transition-all flex items-center justify-center gap-2">
                            <Share2 size={18} /> WhatsApp
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
};
