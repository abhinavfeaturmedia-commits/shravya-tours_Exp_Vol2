import React, { useState, useEffect } from 'react';
import { useItinerary, ItineraryItem, ServiceType } from '../ItineraryContext';
import { useData } from '../../../context/DataContext';
import { ServiceSelector } from '../selectors/ServiceSelector';
import {
    Plus, Hotel, Bike, Car, Plane, StickyNote, Trash2, Clock,
    ChevronUp, ChevronDown, Sparkles, MoreHorizontal, IndianRupee, MapPin, RefreshCw,
    Shield, UserCheck, AlertTriangle
} from 'lucide-react';
import { generateItinerary } from '../../../src/lib/gemini';
import { toast } from 'sonner';
import { api } from '../../../src/lib/api';
import { Image } from 'lucide-react';

interface Props {
    onOpenPricing?: () => void;
    onOpenTripDetails?: () => void;
}

// ─── Colour mapping per service type ─────────────────────────────────────────
const SERVICE_STYLE: Record<ServiceType | 'other', { accent: string; border: string; bg: string; badgeBg: string; badgeText: string; Icon: any }> = {
    hotel:     { accent: 'bg-rose-500',    border: 'border-rose-200',    bg: 'bg-white',     badgeBg: 'bg-rose-100',    badgeText: 'text-rose-600',    Icon: Hotel     },
    activity:  { accent: 'bg-orange-400',  border: 'border-orange-200',  bg: 'bg-white',     badgeBg: 'bg-orange-100',  badgeText: 'text-orange-600',  Icon: Bike      },
    transport: { accent: 'bg-emerald-500', border: 'border-emerald-200', bg: 'bg-white',     badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-600', Icon: Car       },
    flight:    { accent: 'bg-blue-500',    border: 'border-blue-200',    bg: 'bg-white',     badgeBg: 'bg-blue-100',    badgeText: 'text-blue-600',    Icon: Plane     },
    note:      { accent: 'bg-yellow-400',  border: 'border-yellow-200',  bg: 'bg-yellow-50', badgeBg: 'bg-yellow-100', badgeText: 'text-yellow-700', Icon: StickyNote },
    guide:     { accent: 'bg-purple-500',  border: 'border-purple-200',  bg: 'bg-white',     badgeBg: 'bg-purple-100',  badgeText: 'text-purple-600',  Icon: UserCheck },
    visa:      { accent: 'bg-teal-500',    border: 'border-teal-200',    bg: 'bg-white',     badgeBg: 'bg-teal-100',   badgeText: 'text-teal-600',    Icon: Shield    },
    other:     { accent: 'bg-slate-400',   border: 'border-slate-200',   bg: 'bg-white',     badgeBg: 'bg-slate-100',   badgeText: 'text-slate-600',   Icon: Plus      },
};

// ─── Day theme names (auto-generated) ────────────────────────────────────────
const DAY_THEMES = [
    'Arrival & Vibe', 'Azure Horizons', 'Heritage & Lemons', 'Mountain Mystique',
    'Coastal Embrace', 'Cultural Dive', 'Leisure & Spa', 'Farewell Glow',
    'Island Hop', 'Sunset Voyage', 'Festival Spirit', 'Wilderness Call',
];

// ─── Main Board ───────────────────────────────────────────────────────────────
export const StepDayPlanner: React.FC<Props> = ({ onOpenPricing, onOpenTripDetails }) => {
    const { tripDetails, getItemsForDay, removeItem, updateItem, replaceAllItems, getDayMeta, updateDayMeta } = useItinerary();
    const [addingToDay, setAddingToDay] = useState<number | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const days = Array.from({ length: tripDetails.days }, (_, i) => i + 1);

    const handleAutoGenerate = async () => {
        if (!tripDetails.destination) {
            toast.error('Please select a destination in Trip Details first.');
            return;
        }
        setIsGenerating(true);
        const toastId = toast.loading('Consulting our AI Travel Expert...');
        try {
            const guestStr = `${tripDetails.adults} Adults, ${tripDetails.children} Children`;
            const result = await generateItinerary(tripDetails.destination, tripDetails.days, guestStr, tripDetails.startDate);
            const newItems: Omit<ItineraryItem, 'sellPrice'>[] = [];
            result.days.forEach((day: any) => {
                day.activities.forEach((act: any) => {
                    newItems.push({
                        id: `AI-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        type: 'activity',
                        day: day.day,
                        title: act.description.split(':')[0] || 'Activity',
                        description: act.description,
                        netCost: act.cost || 0,
                        baseMarkupPercent: 15,
                        extraMarkupFlat: 0,
                        quantity: 1,
                        time: act.time,
                        duration: '2 Hours',
                    });
                });
            });
            replaceAllItems(newItems);
            toast.dismiss(toastId);
            toast.success('Itinerary generated successfully!');
        } catch (error: any) {
            toast.dismiss(toastId);
            let msg = error.message || error.toString();
            if (msg.includes('400')) msg = 'Bad Request (400). Invalid Prompt or Params.';
            if (msg.includes('403')) msg = 'Access Denied (403). API Key invalid or restricted.';
            if (msg.includes('Failed to fetch')) msg = 'Network Error. Check internet or ad-blockers.';
            toast.error(msg, { duration: 10000 });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#F5F0E8]">
            {/* Sub-header toolbar */}
            <div className="shrink-0 flex items-center justify-between px-6 py-2.5 bg-white/70 border-b border-stone-200 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                        {tripDetails.nights}N / {tripDetails.days}D &nbsp;·&nbsp;
                        {(tripDetails.adults || 0) + (tripDetails.children || 0)} Guests
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* AI Generate */}
                    <button
                        onClick={handleAutoGenerate}
                        disabled={isGenerating}
                        className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white shadow transition-all active:scale-95"
                    >
                        <Sparkles size={13} className={isGenerating ? 'animate-spin' : ''} />
                        {isGenerating ? 'Generating…' : 'AI Auto-Plan'}
                    </button>
                    {onOpenPricing && (
                        <button
                            onClick={onOpenPricing}
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-stone-900 hover:bg-stone-700 text-white shadow transition-all active:scale-95"
                        >
                            <IndianRupee size={13} />
                            Set Pricing
                        </button>
                    )}
                </div>
            </div>

            {/* Horizontal Kanban Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden">
                <div className="flex h-full gap-4 p-6 w-max min-w-full">
                    {days.map((day, idx) => {
                        // Compute location for this day
                        let locationId = tripDetails.destination;
                        if (tripDetails.destinations && tripDetails.destinations.length > 0) {
                            let currentDay = 1;
                            for (const dest of tripDetails.destinations) {
                                if (day >= currentDay && day <= currentDay + dest.nights - 1) {
                                    locationId = dest.locationId;
                                    break;
                                }
                                currentDay += dest.nights;
                            }
                            if (day >= currentDay && tripDetails.destinations.length > 0) {
                                locationId = tripDetails.destinations[tripDetails.destinations.length - 1].locationId;
                            }
                        }

                        return (
                            <DayColumn
                                key={day}
                                day={day}
                                theme={DAY_THEMES[(day - 1) % DAY_THEMES.length]}
                                locationId={locationId}
                                items={getItemsForDay(day)}
                                meta={getDayMeta(day)}
                                onAdd={() => setAddingToDay(day)}
                                onRemove={removeItem}
                                onUpdate={updateItem}
                                onUpdateMeta={meta => updateDayMeta(day, meta)}
                                onClearDay={() => getItemsForDay(day).forEach(i => removeItem(i.id))}
                            />
                        );
                    })}

                    {/* Ghost "Add Day" column — clickable to go to Trip Details */}
                    <div
                        className="w-64 shrink-0 rounded-2xl border-2 border-dashed border-stone-300 flex flex-col items-center justify-center gap-2 text-stone-400 hover:border-amber-400 hover:text-amber-500 transition-colors cursor-pointer"
                        onClick={onOpenTripDetails}
                        title="Click to add more days in Trip Details"
                    >
                        <Plus size={20} className="opacity-50" />
                        <p className="text-xs font-bold uppercase tracking-widest text-center px-4">Add more days<br/>in Trip Details</p>
                    </div>
                </div>
            </div>

            {/* Service Selector Modal */}
            {addingToDay !== null && (
                <ServiceSelector day={addingToDay} onClose={() => setAddingToDay(null)} />
            )}
        </div>
    );
};

// ─── Day Column ───────────────────────────────────────────────────────────────
const DayColumn: React.FC<{
    day: number;
    theme: string;
    locationId: string;
    items: ItineraryItem[];
    meta: any;
    onAdd: () => void;
    onRemove: (id: string) => void;
    onUpdate: (id: string, u: any) => void;
    onUpdateMeta: (m: any) => void;
    onClearDay: () => void;
}> = ({ day, theme, locationId, items, meta, onAdd, onRemove, onUpdate, onUpdateMeta, onClearDay }) => {
    const { reorderItems } = useItinerary();
    const { masterLocations } = useData();
    const [showMenu, setShowMenu] = useState(false);
    
    // UX Features: Analytics & Validation
    const hasHotel = items.some(i => i.type === 'hotel');
    const dayTotal = items.reduce((sum, item) => sum + (Number(item.netCost) || 0), 0);
    const hasItems = items.length > 0;
    
    // Type Breakdown count
    const typeCount = items.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const breakdownRules = Object.entries(typeCount)
        .map(([type, count]) => `${count} ${type.charAt(0).toUpperCase() + type.slice(1)}${(count as number) > 1 ? 's' : ''}`)
        .join(' • ');

    return (
        <div 
            className="w-[320px] shrink-0 flex flex-col h-full rounded-2xl bg-white/60 shadow-sm border border-stone-200/80 overflow-hidden transition-colors"
            onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => {
                e.preventDefault();
                const sourceId = e.dataTransfer.getData('text/plain');
                if (sourceId) {
                    reorderItems(day, sourceId, items.length);
                }
            }}
        >
            {/* Column header */}
            <div className="shrink-0 px-4 pt-4 pb-3 border-b border-stone-100 bg-white relative">
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-[11px] font-black text-amber-600 uppercase tracking-widest">Day {day}</p>
                            <span className="text-[9px] font-bold text-stone-400 border border-stone-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <MapPin size={8} />
                                {masterLocations?.find(l => l.id === locationId)?.name || 'Multi-City'}
                            </span>
                        </div>
                        {/* Fix 2.3: editable theme stored in dayMeta.theme */}
                        <input
                            type="text"
                            value={meta.theme ?? theme}
                            onChange={e => onUpdateMeta({ ...meta, theme: e.target.value })}
                            placeholder={theme}
                            className="text-sm font-black text-stone-800 bg-transparent border-none outline-none w-full focus:border-b-2 focus:border-amber-300 leading-tight placeholder:text-stone-300 transition-all"
                            title="Click to rename this day"
                        />
                        {/* Fix 3.4: DayMeta image thumbnail */}
                        {meta.image && (
                            <div className="mt-1.5 h-10 w-full rounded-lg overflow-hidden border border-stone-100">
                                <img src={meta.image} alt="Day cover" className="w-full h-full object-cover" />
                            </div>
                        )}
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(v => !v)}
                            className="size-7 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-400 transition-colors"
                        >
                            <MoreHorizontal size={14} />
                        </button>
                        {showMenu && (
                            <div className="absolute right-0 top-8 bg-white shadow-xl rounded-xl border border-stone-100 py-1 z-30 w-44 text-xs font-bold text-stone-600">
                                <button onClick={() => { onAdd(); setShowMenu(false); }} className="w-full px-4 py-2 text-left hover:bg-stone-50 flex items-center gap-2">
                                    <Plus size={12} /> Add Service
                                </button>
                                <label className="w-full px-4 py-2 text-left hover:bg-stone-50 flex items-center gap-2 cursor-pointer">
                                    <Image size={12} /> {meta.image ? 'Change Cover' : 'Add Cover Image'}
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*" 
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            if (file.size > 8 * 1024 * 1024) { toast.error("File is too large. Max 8MB"); return; }
                                            
                                            setShowMenu(false);
                                            const toastId = toast.loading('Uploading day image...');
                                            try {
                                                const url = await api.uploadFile(file, 'documents');
                                                onUpdateMeta({ ...meta, image: url });
                                                toast.success('Image uploaded', { id: toastId });
                                            } catch (error: any) {
                                                toast.error(error.message || 'Failed to upload image', { id: toastId });
                                            }
                                        }} 
                                    />
                                </label>
                                {meta.image && (
                                    <button 
                                        onClick={() => { onUpdateMeta({ ...meta, image: undefined }); setShowMenu(false); }} 
                                        className="w-full px-4 py-2 text-left hover:bg-stone-50 text-rose-500 flex items-center gap-2"
                                    >
                                        <Trash2 size={12} /> Remove Cover
                                    </button>
                                )}
                                {items.length > 0 && (
                                    <button
                                        onClick={() => { if (window.confirm(`Clear all ${items.length} items from Day ${day}?`)) onClearDay(); setShowMenu(false); }}
                                        className="w-full px-4 py-2 text-left hover:bg-rose-50 text-rose-500 flex items-center gap-2"
                                    >
                                        <Trash2 size={12} /> Clear Day
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Item count & Cost badge */}
                {hasItems && (
                     <div className="mt-2.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide">
                        <span className="text-stone-400 truncate pr-2 max-w-[180px]" title={breakdownRules}>
                            {breakdownRules} 
                        </span>
                        {dayTotal > 0 && (
                            <span className="text-emerald-600 flex items-center gap-0.5 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                <IndianRupee size={9} />
                                {dayTotal.toLocaleString('en-IN')}
                            </span>
                        )}
                    </div>
                )}
                
                {/* Warning: Missing Hotel */}
                {hasItems && !hasHotel && (
                    <div className="mt-2 text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded border border-amber-200 border-dashed flex items-center gap-1.5">
                        <span className="relative flex size-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full size-2 bg-amber-500"></span>
                        </span>
                        Missing accommodation
                    </div>
                )}
            </div>

            {/* Scrollable card list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 relative">
                 {/* Visual timeline line */}
                 {items.length > 1 && (
                     <div className="absolute left-8 top-6 bottom-6 w-0.5 border-l-2 border-dashed border-stone-200 -z-10" />
                 )}

                {items
                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                    .map((item, idx) => (
                        <ActivityCard
                            key={item.id}
                            item={item}
                            index={idx}
                            isFirst={idx === 0}
                            isLast={idx === items.length - 1}
                            onRemove={() => onRemove(item.id)}
                            onUpdate={onUpdate}
                        />
                    ))}
                    
                {/* Smart Empty State */}
                {!hasItems && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <div className="size-12 rounded-full bg-stone-100 mb-3 flex items-center justify-center border border-stone-200">
                            <MapPin size={20} className="text-stone-400" />
                        </div>
                        <p className="text-xs font-bold text-stone-600 mb-1">No plans yet</p>
                        <p className="text-[10px] text-stone-400 mb-4 px-2">Build a memorable day by adding hotels, activities, and transport.</p>
                        <div className="space-y-2 w-full px-2">
                            <button onClick={onAdd} className="w-full py-2 bg-white border border-stone-200 hover:border-amber-300 hover:text-amber-600 text-stone-500 text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                                <Plus size={12}/> Explore Services
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Drop zone / Add button */}
            {hasItems && (
                <div
                    onClick={onAdd}
                    className="shrink-0 m-3 mt-0 rounded-xl border-2 border-dashed border-stone-300 hover:border-amber-400 bg-stone-50 hover:bg-amber-50 text-stone-400 hover:text-amber-500 flex items-center justify-center gap-2 py-3 cursor-pointer transition-all group shadow-sm"
                >
                    <Plus size={14} strokeWidth={3} />
                    <span className="text-[11px] font-black uppercase tracking-wider">Add Service</span>
                </div>
            )}
        </div>
    );
};

// ─── Activity Card ────────────────────────────────────────────────────────────
const ActivityCard: React.FC<{
    item: ItineraryItem;
    index: number;
    isFirst: boolean;
    isLast: boolean;
    onRemove: () => void;
    onUpdate: (id: string, u: any) => void;
}> = ({ item, index, isFirst, isLast, onRemove, onUpdate }) => {
    const { moveItem, reorderItems } = useItinerary();
    const { masterRoomTypes, masterMealPlans, masterHotels, masterActivities, masterTransports } = useData();
    const [expanded, setExpanded] = useState(false);

    const style = SERVICE_STYLE[item.type] ?? SERVICE_STYLE.other;
    const Icon = style.Icon;

    // Live Price Validation
    const getLiveMasterPrice = () => {
        if (!item.masterId) return null;
        if (item.type === 'hotel') {
            const m = masterHotels.find(h => h.id === item.masterId);
            return m ? m.pricePerNight : null;
        }
        if (item.type === 'activity') {
            const m = masterActivities.find(a => a.id === item.masterId);
            return m ? m.cost : null;
        }
        if (item.type === 'transport') {
            const m = masterTransports.find(t => t.id === item.masterId);
            return m ? m.baseRate : null;
        }
        return null;
    };
    
    const livePrice = getLiveMasterPrice();
    const isPriceChanged = livePrice !== null && livePrice !== Number(item.netCost);

    const syncLivePrice = () => {
        if (livePrice !== null) {
            onUpdate(item.id, { netCost: livePrice });
        }
    };

    return (
        <div 
            className="flex gap-2 isolate relative min-w-0"
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', item.id);
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(() => { e.currentTarget.classList.add('opacity-50') }, 0);
            }}
            onDragEnd={(e) => {
                e.currentTarget.classList.remove('opacity-50');
            }}
            onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';
                
                // Add a visual indicator
                e.currentTarget.classList.add('border-t-2', 'border-t-indigo-500');
            }}
            onDragLeave={(e) => {
                e.currentTarget.classList.remove('border-t-2', 'border-t-indigo-500');
            }}
            onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.remove('border-t-2', 'border-t-indigo-500');
                const sourceId = e.dataTransfer.getData('text/plain');
                if (sourceId && sourceId !== item.id) {
                    reorderItems(item.day, sourceId, index);
                }
            }}
        >
            {/* Timeline Connector Dot */}
            <div className="w-6 flex shrink-0 justify-center pt-2.5">
                <div className={`size-3 shrink-0 rounded-full border-2 border-white shadow-sm ring-1 ring-stone-200 z-10 ${style.accent}`} />
            </div>

            {/* Card Content */}
            <div
                className={`
                    relative rounded-xl border ${style.border} ${style.bg} shadow-sm
                    hover:shadow-md transition-all duration-200 group overflow-hidden
                    animate-in fade-in slide-in-from-bottom-2 flex-1
                `}
                style={{ animationDelay: `${index * 40}ms` }}
            >
                {/* Left accent bar inside the card */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.accent} opacity-50`} />

                <div className="pl-4 pr-3 pt-3 pb-2">
                    {/* Top row: type badge + time + actions */}
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md flex items-center gap-1 ${style.badgeBg} ${style.badgeText}`}>
                                <Icon size={10} />
                                {item.type}
                            </span>
                            {/* Fix 2.2: quantity badge */}
                            {item.quantity > 1 && (
                                <span className="text-[10px] font-black text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded-md border border-stone-200">
                                    ×{item.quantity}
                                </span>
                            )}
                            {/* Fix 2.4: AI-generated item warning */}
                            {item.id.startsWith('AI-') && !item.masterId && (
                                <span className="text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                    <AlertTriangle size={8} /> Not in catalog
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => moveItem(item.id, 'up')}
                                disabled={isFirst}
                                className="size-5 flex items-center justify-center text-stone-300 hover:text-indigo-500 disabled:opacity-20 transition-colors"
                            >
                                <ChevronUp size={12} strokeWidth={3} />
                            </button>
                            <button
                                onClick={() => moveItem(item.id, 'down')}
                                disabled={isLast}
                                className="size-5 flex items-center justify-center text-stone-300 hover:text-indigo-500 disabled:opacity-20 transition-colors"
                            >
                                <ChevronDown size={12} strokeWidth={3} />
                            </button>
                            <button
                                onClick={onRemove}
                                className="size-5 flex items-center justify-center text-stone-300 hover:text-red-500 transition-colors"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    </div>

                    {/* Title (editable) */}
                    <input
                        value={item.title}
                        onChange={e => onUpdate(item.id, { title: e.target.value })}
                        placeholder="Service Name"
                        className="w-full font-black text-sm text-stone-800 bg-transparent border-none p-0 focus:ring-0 outline-none placeholder:text-stone-300 mb-1"
                    />

                    {/* Time + cost row */}
                    <div className="flex items-center flex-wrap gap-1.5 text-[11px] font-bold text-stone-400 mt-1 min-w-0">
                        <div className="flex items-center gap-1 bg-white/50 border border-stone-200/60 rounded px-1.5 py-0.5 focus-within:border-amber-300 transition-colors shrink-0">
                            <Clock size={10} className={style.badgeText} />
                            <input
                                type="time"
                                value={item.time || ''}
                                onChange={e => onUpdate(item.id, { time: e.target.value })}
                                className="bg-transparent border-none p-0 focus:ring-0 outline-none text-stone-500 appearance-none text-[10px] [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                            />
                        </div>

                        {/* Inline editable price — always visible */}
                        <div className="flex gap-1 ml-auto shrink-0 items-center">
                            {isPriceChanged && (
                                <button
                                    onClick={syncLivePrice}
                                    title={`Sync to master price: ₹${livePrice?.toLocaleString('en-IN')}`}
                                    className="flex items-center gap-0.5 text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 hover:bg-amber-100 transition-colors"
                                >
                                    <RefreshCw size={8} /> Sync
                                </button>
                            )}
                            <div className={`flex items-center gap-0.5 rounded border transition-colors focus-within:border-emerald-400 focus-within:bg-white ${isPriceChanged ? 'bg-amber-50/50 border-amber-200/50' : 'bg-emerald-50 border-emerald-100/50'}`}>
                                <IndianRupee size={9} className={`ml-1 shrink-0 ${isPriceChanged ? 'text-amber-500' : 'text-emerald-500'}`} />
                                <input
                                    type="number"
                                    min="0"
                                    step="50"
                                    value={Number(item.netCost) || ''}
                                    placeholder="0"
                                    onChange={e => onUpdate(item.id, { netCost: parseFloat(e.target.value) || 0 })}
                                    onFocus={e => e.target.select()}
                                    className={`w-16 text-right bg-transparent border-none p-0 pr-1.5 py-0.5 focus:ring-0 outline-none text-[10px] font-black appearance-none [&::-webkit-outer-spin-button]:opacity-0 [&::-webkit-inner-spin-button]:opacity-0 ${isPriceChanged ? 'text-amber-600' : 'text-emerald-600'}`}
                                />
                            </div>
                        </div>
                    </div>


                    {/* Description */}
                    {item.type === 'note' ? (
                        // Fix 4.5: note type always shows textarea directly
                        <textarea
                            value={item.description || ''}
                            onChange={e => {
                                onUpdate(item.id, { description: e.target.value });
                                e.target.style.height = 'auto';
                                e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            onFocus={e => { e.target.style.height = 'auto'; e.target.style.height = `${e.target.scrollHeight}px`; }}
                            placeholder="Write your note here…"
                            rows={2}
                            className="w-full mt-2 text-[11px] font-medium text-stone-500 bg-stone-50/50 rounded-lg border border-stone-100 p-2 focus:ring-1 focus:ring-amber-300 outline-none resize-none overflow-hidden leading-relaxed"
                        />
                    ) : (
                        <>
                            {item.description && (
                                <button
                                    onClick={() => setExpanded(v => !v)}
                                    className="text-[10px] text-stone-400 hover:text-stone-600 font-medium mt-2 text-left transition-colors flex items-center gap-1"
                                >
                                    {expanded ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}
                                    {expanded ? 'Hide details' : 'Show details'}
                                </button>
                            )}
                            {expanded && (
                                <textarea
                                    value={item.description || ''}
                                    onChange={e => {
                                        onUpdate(item.id, { description: e.target.value });
                                        e.target.style.height = 'auto';
                                        e.target.style.height = `${e.target.scrollHeight}px`;
                                    }}
                                    onFocus={e => { e.target.style.height = 'auto'; e.target.style.height = `${e.target.scrollHeight}px`; }}
                                    placeholder="Add notes or description…"
                                    rows={2}
                                    className="w-full mt-2 text-[11px] font-medium text-stone-500 bg-stone-50/50 rounded-lg border border-stone-100 p-2 focus:ring-1 focus:ring-amber-300 outline-none resize-none overflow-hidden leading-relaxed"
                                />
                            )}
                        </>
                    )}

                    {/* Hotel-specific: room type + meal plan */}
                    {item.type === 'hotel' && (
                        <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-stone-100">
                            <select
                                value={item.roomTypeId || ''}
                                onChange={e => onUpdate(item.id, { roomTypeId: e.target.value })}
                                className="text-[10px] font-bold bg-stone-100 border-none rounded-md px-2 py-1 text-stone-600 outline-none hover:bg-stone-200 transition-colors"
                            >
                                <option value="">Select Room Type</option>
                                {masterRoomTypes.filter(r => r.status === 'Active').map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                            <select
                                value={item.mealPlanId || ''}
                                onChange={e => onUpdate(item.id, { mealPlanId: e.target.value })}
                                className="text-[10px] font-bold bg-stone-100 border-none rounded-md px-2 py-1 text-stone-600 outline-none hover:bg-stone-200 transition-colors"
                            >
                                <option value="">Select Meal Plan</option>
                                {masterMealPlans.filter(mp => mp.status === 'Active').map(mp => (
                                    <option key={mp.id} value={mp.id}>{mp.code} - {mp.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Fix 4.6: Flight-specific from/to/airline fields */}
                    {item.type === 'flight' && (
                        <div className="grid grid-cols-2 gap-1.5 mt-2 pt-2 border-t border-stone-100">
                            <input
                                type="text"
                                placeholder="From (e.g. DEL)"
                                value={(item as any).fromLocation || ''}
                                onChange={e => onUpdate(item.id, { fromLocation: e.target.value })}
                                className="text-[10px] font-bold bg-stone-100 border-none rounded-md px-2 py-1 text-stone-600 outline-none placeholder:text-stone-300"
                            />
                            <input
                                type="text"
                                placeholder="To (e.g. BOM)"
                                value={(item as any).toLocation || ''}
                                onChange={e => onUpdate(item.id, { toLocation: e.target.value })}
                                className="text-[10px] font-bold bg-stone-100 border-none rounded-md px-2 py-1 text-stone-600 outline-none placeholder:text-stone-300"
                            />
                            <input
                                type="text"
                                placeholder="Airline"
                                value={(item as any).airline || ''}
                                onChange={e => onUpdate(item.id, { airline: e.target.value })}
                                className="text-[10px] font-bold bg-stone-100 border-none rounded-md px-2 py-1 text-stone-600 outline-none placeholder:text-stone-300"
                            />
                            <input
                                type="text"
                                placeholder="Flight No."
                                value={(item as any).flightNumber || ''}
                                onChange={e => onUpdate(item.id, { flightNumber: e.target.value })}
                                className="text-[10px] font-bold bg-stone-100 border-none rounded-md px-2 py-1 text-stone-600 outline-none placeholder:text-stone-300"
                            />
                        </div>
                    )}
                </div>

                {/* Master image thumbnail (if linked) */}
                {item.masterData?.image && (
                    <div className="mx-3 mb-3 h-20 rounded-lg overflow-hidden border border-stone-100">
                        <img src={item.masterData.image} alt={item.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                    </div>
                )}
            </div>
        </div>
    );
};
