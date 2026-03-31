import React, { useEffect, useRef } from 'react';
import { useItinerary } from '../ItineraryContext';
import { useData } from '../../../context/DataContext';
import { gsap } from 'gsap';
import { MapPin, Calendar, Users, Image as ImageIcon, ArrowRight, Globe, Plus, X } from 'lucide-react';
import { ImageUpload } from '../../ui/ImageUpload';

export const StepTripDetails: React.FC = () => {
    const { tripDetails, updateTripDetails, setStep } = useItinerary();
    const { masterLocations } = useData();
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo(".animate-item",
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, stagger: 0.1, duration: 0.5, ease: "power2.out" }
            );
        }, containerRef);
        return () => ctx.revert();
    }, []);

    const handleNext = () => {
        if (!tripDetails.title || !tripDetails.destination) {
            // Ideally use a toast here
            alert("Please fill in the required fields.");
            return;
        }
        setStep(2);
    };

    return (
        <div ref={containerRef} className="h-full overflow-y-auto p-4 md:p-8 flex items-start justify-center">
            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-start pb-20 md:pb-0">

                {/* Form Section */}
                <div className="bg-white dark:bg-[#1A2633] rounded-xl md:rounded-2xl p-4 md:p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 md:space-y-6 animate-item">
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mb-1">Trip Basics</h2>
                        <p className="text-xs md:text-sm text-slate-500">Let's define the core details of this new journey.</p>
                    </div>

                    <div className="space-y-4 md:space-y-5">
                        {/* Title Input */}
                        <div className="space-y-1.5 animate-item">
                            <label className="text-[10px] md:text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                                <Globe size={12} /> Itinerary Title
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Summer Escape to Bali"
                                value={tripDetails.title}
                                onChange={(e) => updateTripDetails({ title: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 md:px-4 md:py-3 font-bold text-sm md:text-base focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:font-normal"
                            />
                        </div>

                        {/* Destination & Date */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 animate-item relative z-30">
                            <div className="space-y-1.5">
                                <label className="text-[10px] md:text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                                    <MapPin size={12} /> Destination
                                </label>
                                <div className="relative">
                                    <select
                                        value={tripDetails.destination || ""}
                                        onChange={(e) => updateTripDetails({ destination: e.target.value })}
                                        className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2.5 md:px-4 md:py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-xs md:text-sm"
                                    >
                                        <option value="">Select Location</option>
                                        {masterLocations?.map(loc => (
                                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <ArrowRight size={14} className="rotate-90" />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] md:text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                                    <Calendar size={12} /> Start Date
                                </label>
                                <input
                                    type="date"
                                    value={tripDetails.startDate || ""}
                                    onChange={(e) => updateTripDetails({ startDate: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2.5 md:px-4 md:py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-xs md:text-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 md:gap-5 animate-item z-20 relative">
                            <Counter
                                label="Nights"
                                icon={<span style={{fontSize:12}}>🌙</span>}
                                value={tripDetails.nights}
                                onChange={(v) => updateTripDetails({ nights: v, days: v + 1 })}
                                min={0}
                            />
                            <Counter
                                label="Days"
                                icon={<span style={{fontSize:12}}>☀️</span>}
                                value={tripDetails.days}
                                onChange={(v) => updateTripDetails({ days: Math.max(1, v), nights: Math.max(0, v - 1) })}
                                min={1}
                            />
                            {/* Guest Selector */}
                            <div className="col-span-2">
                            <GuestSelector
                                adults={tripDetails.adults || 2}
                                childrenCount={tripDetails.children || 0}
                                onChange={(a, c) => updateTripDetails({ adults: a, children: c })}
                            />
                            </div>
                        </div>

                        {/* Image URL */}
                        <div className="space-y-1.5 animate-item">
                            <label className="text-[10px] md:text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                                <ImageIcon size={12} /> Cover Image
                            </label>
                            <ImageUpload
                                label="Cover Image"
                                value={tripDetails.coverImage}
                                onChange={(val) => updateTripDetails({ coverImage: val })}
                            />
                        </div>

                        {/* Inclusions & Exclusions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 animate-item">
                            <ListEditor
                                title="Included"
                                items={tripDetails.included || []}
                                onChange={(items) => updateTripDetails({ included: items })}
                                placeholder="Add inclusion..."
                                badgeColor="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            />
                            <ListEditor
                                title="Not Included"
                                items={tripDetails.notIncluded || []}
                                onChange={(items) => updateTripDetails({ notIncluded: items })}
                                placeholder="Add exclusion..."
                                badgeColor="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            />
                        </div>

                        <div className="pt-2 animate-item">
                            <button
                                onClick={handleNext}
                                className="w-full group py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition-all text-sm md:text-base flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                Start Itinerary <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Preview Section - Hide on mobile, Show on lg */}
                <div className="hidden lg:block relative group animate-item">
                    <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl relative bg-slate-900">
                        <img
                            src={tripDetails.coverImage || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop'}
                            alt="Cover"
                            className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700 ease-out"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent p-10 flex flex-col justify-end">
                            <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-xs font-bold text-white mb-4 border border-white/10">
                                    Preview
                                </span>
                                <h1 className="text-3xl font-black text-white leading-tight mb-2">
                                    {tripDetails.title || "Your Amazing Trip"}
                                </h1>
                                <p className="text-white/80 font-medium flex items-center gap-2 text-sm">
                                    <MapPin size={14} /> {tripDetails.destination
                                        ? masterLocations?.find(l => l.id === tripDetails.destination)?.name
                                        : "Select Destination"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Start Subcomponents
const Counter: React.FC<{ label: string; icon: React.ReactNode; value: number; onChange: (val: number) => void; min?: number }> = ({ label, icon, value, onChange, min = 0 }) => {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] md:text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5 truncate">
                {icon} {label}
            </label>
            <div className="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5">
                <button
                    onClick={() => onChange(Math.max(min, value - 1))}
                    className="size-7 md:size-8 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors text-slate-500"
                >
                    -
                </button>
                <span className="flex-1 text-center font-bold text-sm md:text-base text-slate-900 dark:text-white">{value}</span>
                <button
                    onClick={() => onChange(value + 1)}
                    className="size-7 md:size-8 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors text-slate-500"
                >
                    +
                </button>
            </div>
        </div>
    );
};

const GuestSelector: React.FC<{
    adults: number;
    childrenCount: number;
    onChange: (adults: number, children: number) => void
}> = ({ adults, childrenCount, onChange }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const total = adults + childrenCount;
    // Basic summary logic to show like "2 Adults, 1 Child"
    const summary = `${adults} Adult${adults !== 1 ? 's' : ''}${childrenCount > 0 ? `, ${childrenCount} Child${childrenCount !== 1 ? 'ren' : ''}` : ''}`;

    return (
        <div className="space-y-1.5 relative" ref={popoverRef}>
            <label className="text-[10px] md:text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5 truncate">
                <Users size={12} /> Guests
            </label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 md:px-4 md:py-[13px] font-bold text-left text-sm md:text-base focus:ring-2 focus:ring-indigo-500 outline-none transition-all flex justify-between items-center text-slate-900 dark:text-white"
            >
                <span>{summary}</span>
                <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
            </button>

            {/* Popover */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 p-4 z-50 animate-in fade-in zoom-in-95">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">Adults</p>
                                <p className="text-[10px] text-slate-500">Age 13+</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => onChange(Math.max(1, adults - 1), childrenCount)}
                                    className="size-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                >-</button>
                                <span className="w-4 text-center font-bold text-slate-900 dark:text-white">{adults}</span>
                                <button
                                    onClick={() => onChange(adults + 1, childrenCount)}
                                    className="size-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                                >+</button>
                            </div>
                        </div>
                        <div className="h-px bg-slate-100 dark:bg-slate-700"></div>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">Children</p>
                                <p className="text-[10px] text-slate-500">Age 2-12</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => onChange(adults, Math.max(0, childrenCount - 1))}
                                    className="size-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                >-</button>
                                <span className="w-4 text-center font-bold text-slate-900 dark:text-white">{childrenCount}</span>
                                <button
                                    onClick={() => onChange(adults, childrenCount + 1)}
                                    className="size-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                                >+</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ListEditor: React.FC<{
    title: string;
    items: string[];
    onChange: (items: string[]) => void;
    placeholder?: string;
    badgeColor?: string;
}> = ({ title, items, onChange, placeholder, badgeColor }) => {
    const [inputValue, setInputValue] = React.useState('');

    const handleAdd = () => {
        if (inputValue.trim()) {
            onChange([...items, inputValue.trim()]);
            setInputValue('');
        }
    };

    const handleRemove = (index: number) => {
        onChange(items.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-2">
            <label className="text-[10px] md:text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                {title}
            </label>
            <div className="flex bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
                />
                <button
                    type="button"
                    onClick={handleAdd}
                    className="px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                >
                    <Plus size={16} />
                </button>
            </div>
            {items.length > 0 && (
                <ul className="space-y-1.5 mt-2">
                    {items.map((item, index) => (
                        <li key={index} className={`flex items-start justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-transparent ${badgeColor}`}>
                            <span className="flex-1 leading-snug break-words">{item}</span>
                            <button
                                type="button"
                                onClick={() => handleRemove(index)}
                                className="opacity-60 hover:opacity-100 transition-opacity shrink-0"
                            >
                                <X size={14} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
