import React, { useState, useEffect, useRef } from 'react';
import { useItinerary, ItineraryItem, ServiceType } from '../ItineraryContext';
import { useData } from '../../../context/DataContext';
import { ServiceSelector } from '../selectors/ServiceSelector';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Plus, Hotel, Bike, Car, Plane, StickyNote, Trash2, Clock, IndianRupee, MapPin, Sparkles, ChevronUp, ChevronDown, Image as ImageIcon } from 'lucide-react';
import { generateItinerary } from '../../../src/lib/gemini';
import { toast } from 'sonner';
import { ImageUpload } from '../../../components/ui/ImageUpload';

export const StepDayPlanner: React.FC = () => {
    const { tripDetails, getItemsForDay, setStep, removeItem, updateItem, replaceAllItems, getDayMeta, updateDayMeta } = useItinerary();
    const [addingToDay, setAddingToDay] = useState<number | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Register GSAP plugin safely at runtime (not module scope, to avoid build crashes)
    useEffect(() => { gsap.registerPlugin(ScrollTrigger); }, []);

    const days = Array.from({ length: tripDetails.days }, (_, i) => i + 1);

    const handleNext = () => {
        setStep(3);
    };

    const handleAutoGenerate = async () => {
        if (!tripDetails.destination) {
            toast.error("Please select a destination in Step 1 first.");
            return;
        }

        setIsGenerating(true);
        const toastId = toast.loading("Consulting our AI Travel Expert...");

        try {
            // Construct a guest string from the new counts
            const guestStr = `${tripDetails.adults} Adults, ${tripDetails.children} Children`;

            const result = await generateItinerary(
                tripDetails.destination,
                tripDetails.days,
                guestStr,
                tripDetails.startDate
            );

            // Convert the AI response (simplified structure) to our ItineraryItem[]
            const newItems: Omit<ItineraryItem, 'sellPrice'>[] = [];

            result.days.forEach((day: any) => {
                day.activities.forEach((act: any) => {
                    newItems.push({
                        id: `AI-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        type: 'activity',
                        day: day.day,
                        title: act.description.split(':')[0] || "Activity",
                        description: act.description,
                        netCost: act.cost || 0,
                        baseMarkupPercent: 15,
                        extraMarkupFlat: 0,
                        quantity: 1,
                        time: act.time,
                        duration: '2 Hours'
                    });
                });
            });

            replaceAllItems(newItems);
            toast.dismiss(toastId);
            toast.success("Itinerary generated successfully!");

        } catch (error: any) {
            console.error("Gemini Generation Error:", error);
            console.error("Error Details:", JSON.stringify(error, null, 2));
            toast.dismiss(toastId);

            let errorMessage = error.message || error.toString();
            if (errorMessage.includes("400")) errorMessage = "Bad Request (400). Invalid Prompt or Params.";
            if (errorMessage.includes("403")) errorMessage = "Access Denied (403). API Key invalid or restricted.";
            if (errorMessage.includes("Failed to fetch")) errorMessage = "Network Error. Check internet or ad-blockers.";

            toast.error(errorMessage, { duration: 10000 }); // Show for 10 seconds
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div ref={containerRef} className="h-full flex flex-col bg-slate-50 dark:bg-[#0B1116] relative">

            <div className="bg-white dark:bg-[#1A2633] px-4 py-3 md:px-6 md:py-3 border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between z-10 shadow-sm gap-2">
                <div className="min-w-0">
                    <h2 className="text-sm md:text-base font-black text-slate-900 dark:text-white truncate">{tripDetails.title}</h2>
                    <p className="text-[10px] md:text-xs font-medium text-slate-500 truncate">{tripDetails.nights}N/{tripDetails.days}D • {tripDetails.adults} Adults, {tripDetails.children} Kids</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleAutoGenerate}
                        disabled={isGenerating}
                        className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-[10px] md:text-xs font-bold px-3 py-2 md:px-4 md:py-2.5 rounded-lg transition-all shadow-lg shadow-purple-600/20 active:scale-95 flex items-center gap-1 md:gap-2 shrink-0 border border-purple-500/50"
                    >
                        <Sparkles size={14} className={isGenerating ? "animate-spin" : ""} />
                        <span className="hidden md:inline">{isGenerating ? 'Generating...' : 'Auto-Plan AI'}</span>
                    </button>
                    <button
                        onClick={handleNext}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] md:text-xs font-bold px-3 py-2 md:px-4 md:py-2.5 rounded-lg transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center gap-1 md:gap-2 shrink-0"
                    >
                        Review <span className="hidden md:inline">Itinerary</span> <span className="material-symbols-outlined text-xs">arrow_forward</span>
                    </button>
                </div>
            </div>

            {/* Scrollable Timeline Canvas */}
            <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-12 scroll-smooth pb-40">
                {days.map((day, index) => (
                    <DayContainer
                        key={day}
                        day={day}
                        items={getItemsForDay(day)}
                        onAdd={() => setAddingToDay(day)}
                        onRemove={removeItem}
                        onUpdate={updateItem}
                        isLast={index === days.length - 1}
                        meta={getDayMeta(day)}
                        onUpdateMeta={(meta) => updateDayMeta(day, meta)}
                    />
                ))}
            </div>

            {/* Modal */}
            {addingToDay && (
                <ServiceSelector day={addingToDay} onClose={() => setAddingToDay(null)} />
            )}
        </div>
    );
};

// --- Sub Component: Day Container ---

const DayContainer: React.FC<{
    day: number;
    items: ItineraryItem[];
    onAdd: () => void;
    onRemove: (id: string) => void;
    onUpdate: (id: string, updates: Partial<ItineraryItem>) => void;
    isLast: boolean;
    meta: any;
    onUpdateMeta: (meta: any) => void;
}> = ({ day, items, onAdd, onRemove, onUpdate, isLast, meta, onUpdateMeta }) => {

    return (
        <div className="max-w-5xl mx-auto flex gap-3 md:gap-10 group relative isolate">

            {/* Timeline Line */}
            {!isLast && (
                <div className="absolute left-[14px] md:left-[19px] top-10 bottom-[-32px] md:bottom-[-48px] w-0.5 bg-slate-200 dark:bg-slate-800 -z-10 group-hover:bg-indigo-100 dark:group-hover:bg-slate-700 transition-colors" />
            )}

            {/* Day Marker */}
            <div className="flex flex-col items-center pt-2 shrink-0">
                <div className="size-7 md:size-8 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black flex items-center justify-center shadow-xl z-10 text-xs md:text-sm border-2 md:border-2 border-slate-50 dark:border-[#0B1116]">
                    {day}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-3 min-w-0">
                <div className="flex items-center justify-between sticky top-0 bg-slate-50/95 dark:bg-[#0B1116]/95 backdrop-blur-sm py-2 z-10 rounded-lg">
                    <h3 className="text-sm md:text-base font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        Day {day}
                    </h3>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onAdd}
                            className="text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold transition-all flex items-center gap-1 md:gap-1.5 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800"
                        >
                            <Plus size={12} strokeWidth={3} /> Add <span className="hidden md:inline">Service</span>
                        </button>
                    </div>
                </div>

                {/* Day Meta (Image) */}
                <div className="mb-4">
                    <ImageUpload
                        label="Day Cover Image"
                        value={meta?.image}
                        onChange={(url) => onUpdateMeta({ image: url })}
                    />
                </div>

                <div className={`
                    min-h-[80px] md:min-h-[120px] rounded-2xl p-2 space-y-3 md:space-y-4 transition-all
                    ${items.length === 0 ? 'border-2 border-dashed border-slate-300 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/30' : ''}
                `}>
                    {items.length === 0 ? (
                        <div
                            onClick={onAdd}
                            className="h-full flex flex-col items-center justify-center text-slate-400 py-6 md:py-10 cursor-pointer hover:text-indigo-500 transition-colors group/empty"
                        >
                            <div className="size-10 md:size-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-2 md:mb-4 group-hover/empty:scale-110 transition-transform">
                                <Plus size={24} className="opacity-50 md:hidden" />
                                <Plus size={32} className="opacity-50 hidden md:block" />
                            </div>
                            <span className="text-[10px] md:text-sm font-bold uppercase tracking-wide">Empty Day • Click to Plan</span>
                        </div>
                    ) : (
                        items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((item, idx) => (
                            <ServiceCard key={item.id} item={item} onRemove={() => onRemove(item.id)} onUpdate={onUpdate} index={idx} isFirst={idx === 0} isLast={idx === items.length - 1} />
                        ))
                    )}
                </div>
            </div>
        </div >
    );
};

// --- Sub Component: Service Card ---

const ServiceCard: React.FC<{ item: ItineraryItem; onRemove: () => void; onUpdate: (id: string, u: any) => void; index: number; isFirst: boolean; isLast: boolean }> = ({ item, onRemove, onUpdate, index, isFirst, isLast }) => {
    const { masterRoomTypes, masterMealPlans } = useData();
    const { moveItem } = useItinerary();

    const getStyles = (type: ServiceType) => {
        switch (type) {
            case 'hotel': return { icon: <Hotel size={20} />, bg: 'bg-white dark:bg-[#1A2633]', border: 'border-rose-200 dark:border-rose-900/30', accent: 'text-rose-500', decoration: 'bg-rose-500' };
            case 'activity': return { icon: <Bike size={20} />, bg: 'bg-white dark:bg-[#1A2633]', border: 'border-orange-200 dark:border-orange-900/30', accent: 'text-orange-500', decoration: 'bg-orange-500' };
            case 'transport': return { icon: <Car size={20} />, bg: 'bg-white dark:bg-[#1A2633]', border: 'border-emerald-200 dark:border-emerald-900/30', accent: 'text-emerald-500', decoration: 'bg-emerald-500' };
            case 'flight': return { icon: <Plane size={20} />, bg: 'bg-white dark:bg-[#1A2633]', border: 'border-blue-200 dark:border-blue-900/30', accent: 'text-blue-500', decoration: 'bg-blue-500' };
            case 'note': return { icon: <StickyNote size={20} />, bg: 'bg-yellow-50 dark:bg-yellow-900/10', border: 'border-yellow-200 dark:border-yellow-900/30', accent: 'text-yellow-600 dark:text-yellow-400', decoration: 'bg-yellow-500' };
            default: return { icon: <Plus size={20} />, bg: 'bg-slate-50', border: 'border-slate-200', accent: 'text-slate-500', decoration: 'bg-slate-500' };
        }
    };

    const style = getStyles(item.type);

    return (
        <div className={`
             relative rounded-xl p-3 md:p-4 shadow-sm hover:shadow-xl transition-all duration-300 group
             border ${style.border} ${style.bg}
             animate-in fade-in slide-in-from-bottom-4
        `}
            style={{ animationDelay: `${index * 50}ms` }}
        >
            {/* Left Decor Line */}
            <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${style.decoration}`} />

            <div className="flex gap-3 items-start pl-2 md:pl-3">
                {/* Icon Box */}
                {/* Icon Box or Master Image */}
                <div className={`
                    size-12 md:size-16 rounded-lg flex items-center justify-center shrink-0 shadow-sm overflow-hidden relative group/image
                    ${style.accent} bg-slate-50 dark:bg-slate-800
                `}>
                    {item.masterData?.image ? (
                        <img src={item.masterData.image} alt={item.title} className="w-full h-full object-cover transition-transform group-hover/image:scale-110" />
                    ) : (
                        React.cloneElement(style.icon as any, { size: 24 })
                    )}
                </div>

                <div className="flex-1 min-w-0 space-y-1.5 md:space-y-2">
                    {/* Top Row: Title & Price */}
                    <div className="flex flex-col md:flex-row md:items-start gap-1 md:justify-between">
                        <input
                            value={item.title}
                            onChange={e => onUpdate(item.id, { title: e.target.value })}
                            className="font-black text-sm md:text-base text-slate-900 dark:text-white bg-transparent border-none p-0 focus:ring-0 w-full truncate placeholder:text-slate-300"
                            placeholder="Service Name"
                        />
                        <div className="flex w-fit items-center gap-1 text-slate-900 dark:text-white font-black bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[10px] md:text-xs">
                            <IndianRupee size={10} className="text-slate-400" />
                            {item.netCost?.toLocaleString('en-IN') ?? 0}
                        </div>
                    </div>

                    {/* Metadata Row */}
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wide">
                        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-md">
                            <Clock size={12} className={style.accent} />
                            <input
                                value={item.time || ''}
                                onChange={e => onUpdate(item.id, { time: e.target.value })}
                                placeholder="00:00"
                                className="bg-transparent border-none p-0 w-12 focus:ring-0 text-slate-500 dark:text-slate-400"
                            />
                        </div>
                        {item.duration && (
                            <span className="flex items-center gap-1"><Clock size={12} /> {item.duration}</span>
                        )}
                        {item.masterData?.locationId && (
                            <span className="flex items-center gap-1"><MapPin size={12} /> {item.masterData.locationId}</span>
                        )}
                    </div>

                    {/* Hotel Specific Selectors */}
                    {item.type === 'hotel' && (
                        <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1">
                            {/* Room Type */}
                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-1 pr-2 py-1">
                                {item.roomTypeId && masterRoomTypes.find(r => r.id === item.roomTypeId)?.image && (
                                    <div className="size-6 rounded overflow-hidden">
                                        <img src={masterRoomTypes.find(r => r.id === item.roomTypeId)?.image} className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <select
                                    value={item.roomTypeId || ''}
                                    onChange={e => onUpdate(item.id, { roomTypeId: e.target.value })}
                                    className="bg-transparent text-[10px] md:text-xs font-bold text-slate-600 dark:text-slate-300 outline-none w-24 md:w-32"
                                >
                                    <option value="">Select Room</option>
                                    {masterRoomTypes.filter(rt => rt.status === 'Active').map(rt => (
                                        <option key={rt.id} value={rt.id}>{rt.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Meal Plan */}
                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-1 pr-2 py-1">
                                {item.mealPlanId && masterMealPlans.find(mp => mp.id === item.mealPlanId)?.image && (
                                    <div className="size-6 rounded overflow-hidden">
                                        <img src={masterMealPlans.find(mp => mp.id === item.mealPlanId)?.image} className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <select
                                    value={item.mealPlanId || ''}
                                    onChange={e => onUpdate(item.id, { mealPlanId: e.target.value })}
                                    className="bg-transparent text-[10px] md:text-xs font-bold text-slate-600 dark:text-slate-300 outline-none w-24 md:w-32"
                                >
                                    <option value="">Select Meal Plan</option>
                                    {masterMealPlans.filter(mp => mp.status === 'Active').map(mp => (
                                        <option key={mp.id} value={mp.id}>{mp.code} - {mp.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    <input
                        value={item.description || ''}
                        onChange={e => onUpdate(item.id, { description: e.target.value })}
                        placeholder="Add notes or description..."
                        className="w-full text-xs md:text-sm font-medium text-slate-400 bg-transparent border-none p-0 focus:ring-0 placeholder:text-slate-300"
                    />
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 md:opacity-0 md:group-hover:opacity-100 transition-all md:transform md:translate-x-2 md:group-hover:translate-x-0">
                    <button
                        onClick={onRemove}
                        className="size-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Remove"
                    >
                        <Trash2 size={16} />
                    </button>

                    <button
                        onClick={() => moveItem(item.id, 'up')}
                        disabled={isFirst}
                        className="size-8 flex items-center justify-center text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move Up"
                    >
                        <ChevronUp size={16} />
                    </button>

                    <button
                        onClick={() => moveItem(item.id, 'down')}
                        disabled={isLast}
                        className="size-8 flex items-center justify-center text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move Down"
                    >
                        <ChevronDown size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};
