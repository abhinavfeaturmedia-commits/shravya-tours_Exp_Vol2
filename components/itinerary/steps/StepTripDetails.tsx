import React, { useEffect, useRef, useState } from 'react';
import { useItinerary } from '../ItineraryContext';
import { useData } from '../../../context/DataContext';
import { MapPin, Calendar, Users, Globe, Plus, X, ArrowRight, Check, Image, Upload, Sparkles, ChevronDown, Search, Loader2, Compass, CheckCircle2, Sun, Moon } from 'lucide-react';
import { MasterLocation, MasterLocationType } from '../../../types';
import { ImageUpload } from '../../ui/ImageUpload';
import { api } from '../../../src/lib/api';
import { generateInclusionsExclusions } from '../../../src/lib/gemini';
import { toast } from 'sonner';

interface Props {
    onDone?: () => void;
}

export const StepTripDetails: React.FC<Props> = ({ onDone }) => {
    const { tripDetails, updateTripDetails, items } = useItinerary();
    const { masterLocations, addMasterLocation } = useData();
    const [isGeneratingIncExc, setIsGeneratingIncExc] = useState(false);
    const [showQuickAddModal, setShowQuickAddModal] = useState(false);

    const handleQuickAddLocation = async (name: string, type: MasterLocationType = 'City', region: string = 'India'): Promise<string | null> => {
        if (!name.trim()) return null;
        const id = `LOC-${Date.now()}`;
        const newLoc: MasterLocation = {
            id,
            name: name.trim(),
            type,
            region: region.trim() || 'India',
            status: 'Active'
        };
        try {
            await addMasterLocation(newLoc);
            return id;
        } catch (e: any) {
            toast.error(e.message || 'Failed to create location');
            return null;
        }
    };

    const handleGenerateIncExc = async () => {
        let destName = '';
        if (tripDetails.destinations && tripDetails.destinations.length > 0) {
            destName = tripDetails.destinations
                .map(d => masterLocations?.find(l => String(l.id) === String(d.locationId))?.name || d.locationId)
                .filter(Boolean)
                .join(' - ');
        }
        if (!destName) {
            destName = masterLocations?.find(l => String(l.id) === String(tripDetails.destination))?.name || tripDetails.destination;
        }
        if (!destName) {
            toast.error('Please choose a destination first.');
            return;
        }
        setIsGeneratingIncExc(true);
        const toastId = toast.loading('Generating tailored Inclusions & Exclusions with AI...');
        try {
            const res = await generateInclusionsExclusions(destName, tripDetails.days, items);
            if (res) {
                if (res.included && Array.isArray(res.included)) {
                    updateTripDetails({ included: res.included });
                }
                if (res.notIncluded && Array.isArray(res.notIncluded)) {
                    updateTripDetails({ notIncluded: res.notIncluded });
                }
                toast.success('Inclusions & Exclusions generated successfully!', { id: toastId });
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to generate terms', { id: toastId });
        } finally {
            setIsGeneratingIncExc(false);
        }
    };

    const handleNext = () => {
        if (!tripDetails.title?.trim()) {
            toast.error('Please enter a Trip Title.'); return;
        }
        const legs = tripDetails.destinations || [];
        const hasDestination = legs.some(d => d.locationId) || tripDetails.destination;
        if (!hasDestination) {
            toast.error('Please select at least one destination.'); return;
        }
        const emptyLeg = legs.some(d => !d.locationId);
        if (emptyLeg) {
            toast.error('All destination legs must have a location selected.'); return;
        }
        if (!tripDetails.startDate) {
            toast.error('Please select a start date.'); return;
        }
        if ((tripDetails.adults || 0) < 1) {
            toast.error('At least 1 adult is required.'); return;
        }
        onDone?.();
    };

    const hasTitle = Boolean(tripDetails.title && tripDetails.title.trim().length > 0);
    const hasDestinations = Boolean(
        (tripDetails.destinations && tripDetails.destinations.length > 0 && tripDetails.destinations.some(d => d.locationId)) ||
        tripDetails.destination
    );
    const hasDates = Boolean(tripDetails.startDate);

    const destinationNames = (tripDetails.destinations && tripDetails.destinations.length > 0)
        ? tripDetails.destinations
            .map(d => masterLocations?.find(l => String(l.id) === String(d.locationId))?.name || d.locationId)
            .filter(Boolean)
        : [masterLocations?.find(l => String(l.id) === String(tripDetails.destination))?.name || tripDetails.destination].filter(Boolean);

    const routeString = destinationNames.length > 0 ? destinationNames.join(' → ') : 'No destinations selected';

    const getFormattedDateRange = () => {
        if (!tripDetails.startDate) return null;
        try {
            const start = new Date(tripDetails.startDate);
            const end = new Date(start);
            end.setDate(end.getDate() + Math.max(1, (tripDetails.days || 1)) - 1);
            const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            if (tripDetails.days === 1 || tripDetails.nights === 0) {
                return `${fmt(start)} (1-Day Tour)`;
            }
            return `${fmt(start)} – ${fmt(end)}`;
        } catch {
            return tripDetails.startDate;
        }
    };

    const getTierBadge = () => {
        const days = tripDetails.days || 1;
        if (days >= 7) return { label: 'EXPEDITION TIER', cls: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300' };
        if (days >= 4) return { label: 'SIGNATURE TIER', cls: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300' };
        return { label: 'BUDGET TIER', cls: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300' };
    };

    const tierBadge = getTierBadge();

    return (
        <div className="min-h-full p-4 sm:p-6 md:p-8 flex flex-col max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest bg-amber-100 text-amber-900 uppercase">
                        Step 1 of 4 · Trip Basics
                    </span>
                    <span className="text-xs font-semibold text-stone-400">
                        Itinerary Configuration
                    </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-stone-900 leading-tight">
                    Define Itinerary Foundation & Route
                </h2>
                <p className="text-xs sm:text-sm text-stone-500 mt-1">
                    Configure destination route stays, travel party, visuals, and package terms before scheduling daily services.
                </p>
            </div>

            {/* Main Balanced 12-Column Grid */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">

                {/* ── LEFT COLUMN: Structured Configuration Sections (7-8 cols) ──── */}
                <div className="lg:col-span-7 xl:col-span-8 space-y-5">

                    {/* CARD 1: Trip Identity & Route */}
                    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-5">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-3.5">
                            <div className="flex items-center gap-2.5">
                                <div className="size-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60">
                                    <Compass size={17} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-stone-900">Trip Identity & Route</h3>
                                    <p className="text-[11px] text-stone-400">Name your tour package and define destination stays.</p>
                                </div>
                            </div>
                        </div>

                        {/* Title Input */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                                <Globe size={12} className="text-amber-500" /> Itinerary Title *
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Sikkim Himalayan Discovery - Gangtok & Pelling"
                                value={tripDetails.title}
                                onChange={e => updateTripDetails({ title: e.target.value })}
                                className="w-full bg-stone-50/70 border border-stone-200 rounded-xl px-3.5 py-2.5 font-bold text-sm text-stone-900 focus:bg-white focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition-all placeholder:font-normal placeholder:text-stone-400"
                            />
                        </div>

                        {/* Tour Type Selector: 1-Day Excursion vs Multi-Day Tour */}
                        <div className="space-y-1.5 pt-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-stone-500">
                                Tour Duration Type
                            </label>
                            <div className="flex items-center gap-2 p-1 bg-stone-100/90 rounded-xl border border-stone-200/80">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const currentDests = tripDetails.destinations && tripDetails.destinations.length > 0
                                            ? tripDetails.destinations
                                            : [{ locationId: tripDetails.destination || '', nights: 0, order: 0 }];
                                        const updatedDests = currentDests.map((d, i) => ({
                                            ...d,
                                            nights: 0
                                        }));
                                        updateTripDetails({
                                            destinations: updatedDests,
                                            nights: 0,
                                            days: 1
                                        });
                                    }}
                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                                        tripDetails.nights === 0
                                            ? 'bg-amber-500 text-white shadow-xs'
                                            : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                                    }`}
                                >
                                    <Sun size={13} className={tripDetails.nights === 0 ? 'text-amber-100' : 'text-amber-500'} />
                                    <span>☀️ 1-Day Excursion (0 Nights)</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const currentDests = tripDetails.destinations && tripDetails.destinations.length > 0
                                            ? tripDetails.destinations
                                            : [{ locationId: tripDetails.destination || '', nights: 1, order: 0 }];
                                        const updatedDests = currentDests.map((d, i) => ({
                                            ...d,
                                            nights: i === 0 && d.nights === 0 ? 1 : Math.max(1, d.nights || 1)
                                        }));
                                        const totalNights = updatedDests.reduce((acc, d) => acc + (d.nights || 0), 0) || 1;
                                        updateTripDetails({
                                            destinations: updatedDests,
                                            nights: totalNights,
                                            days: totalNights + 1
                                        });
                                    }}
                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                                        tripDetails.nights > 0
                                            ? 'bg-stone-900 text-white shadow-xs'
                                            : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                                    }`}
                                >
                                    <Moon size={13} className={tripDetails.nights > 0 ? 'text-amber-400' : 'text-stone-400'} />
                                    <span>🌙 Multi-Day Tour</span>
                                </button>
                            </div>
                        </div>

                        {/* Destination Legs Builder */}
                        <div className="space-y-3 pt-1">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                                    <MapPin size={12} className="text-rose-500" /> Destination Legs & Stays *
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowQuickAddModal(true)}
                                    className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 hover:underline"
                                >
                                    <Plus size={13} strokeWidth={2.5} /> New Location to Masters
                                </button>
                            </div>

                            {/* Legs List */}
                            <div className="space-y-2.5">
                                {(tripDetails.destinations || []).map((dest, idx) => (
                                    <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-stone-50/80 border border-stone-200/80 group hover:border-amber-300 transition-all">
                                        <span className="size-6 rounded-full bg-white border border-stone-200 flex items-center justify-center font-black text-[10px] text-stone-500 shrink-0">
                                            {idx + 1}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <LocationCombobox
                                                value={dest.locationId}
                                                locations={masterLocations || []}
                                                placeholder="Select destination city/region..."
                                                onQuickAdd={handleQuickAddLocation}
                                                onChange={locId => {
                                                    const newDests = [...(tripDetails.destinations || [])];
                                                    newDests[idx].locationId = locId;
                                                    const updates: any = { destinations: newDests };
                                                    if (idx === 0) updates.destination = locId;
                                                    updateTripDetails(updates);
                                                }}
                                            />
                                        </div>
                                        {/* Nights Stepper */}
                                        <div className="flex items-center bg-white border border-stone-200 rounded-lg overflow-hidden h-9 shrink-0 shadow-2xs">
                                            <button
                                                type="button"
                                                disabled={dest.nights <= 0}
                                                onClick={() => {
                                                    const newDests = [...(tripDetails.destinations || [])];
                                                    newDests[idx].nights = Math.max(0, (newDests[idx].nights || 0) - 1);
                                                    const totalNights = newDests.reduce((acc, d) => acc + (d.nights || 0), 0);
                                                    updateTripDetails({
                                                        destinations: newDests,
                                                        nights: totalNights,
                                                        days: totalNights === 0 ? 1 : totalNights + 1
                                                    });
                                                }}
                                                className="px-2.5 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed text-stone-600 font-bold text-sm transition-colors"
                                                title="Decrease nights"
                                            >
                                                -
                                            </button>
                                            <span className={`w-16 text-center font-black text-xs py-1 transition-colors ${
                                                dest.nights === 0 ? 'text-amber-600 bg-amber-50/70 font-black' : 'text-stone-900 bg-stone-50/50'
                                            }`}>
                                                {dest.nights === 0 ? '0N (Day)' : `${dest.nights} N`}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newDests = [...(tripDetails.destinations || [])];
                                                    newDests[idx].nights = (newDests[idx].nights || 0) + 1;
                                                    const totalNights = newDests.reduce((acc, d) => acc + (d.nights || 0), 0);
                                                    updateTripDetails({
                                                        destinations: newDests,
                                                        nights: totalNights,
                                                        days: totalNights === 0 ? 1 : totalNights + 1
                                                    });
                                                }}
                                                className="px-2.5 hover:bg-stone-100 text-stone-600 font-bold text-sm transition-colors"
                                                title="Increase nights"
                                            >
                                                +
                                            </button>
                                        </div>

                                        {/* Delete Leg */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newDests = (tripDetails.destinations || []).filter((_, i) => i !== idx);
                                                const totalNights = newDests.reduce((acc, d) => acc + (d.nights || 0), 0);
                                                const updates: any = {
                                                    destinations: newDests,
                                                    nights: totalNights,
                                                    days: totalNights === 0 ? 1 : totalNights + 1
                                                };
                                                if (idx === 0 && newDests.length > 0) updates.destination = newDests[0].locationId;
                                                updateTripDetails(updates);
                                            }}
                                            className="size-8 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors shrink-0"
                                            title="Remove destination leg"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={() => {
                                        const newDests = [...(tripDetails.destinations || []), { locationId: '', nights: tripDetails.nights === 0 ? 0 : 1, order: (tripDetails.destinations || []).length }];
                                        const totalNights = newDests.reduce((acc, d) => acc + (d.nights || 0), 0);
                                        updateTripDetails({ destinations: newDests, nights: totalNights, days: totalNights === 0 ? 1 : totalNights + 1 });
                                    }}
                                    className="w-full py-2.5 border border-dashed border-stone-300 hover:border-amber-400 hover:bg-amber-50/40 rounded-xl text-stone-600 hover:text-amber-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                                >
                                    <Plus size={13} /> Add Destination Leg
                                </button>
                            </div>

                            {/* Clean Calculated Duration Summary */}
                            <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl">
                                <div className="flex items-center gap-2">
                                    {tripDetails.nights === 0 ? (
                                        <>
                                            <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-white font-black text-xs shadow-2xs flex items-center gap-1.5">
                                                <Sun size={13} className="text-amber-100" /> 1-Day Excursion
                                            </span>
                                            <span className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-950 font-black text-xs shadow-2xs flex items-center gap-1">
                                                🌙 0 Nights (Same-Day)
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-950 font-black text-xs shadow-2xs">
                                                🌙 {tripDetails.nights} Nights Stay
                                            </span>
                                            <span className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-950 font-black text-xs shadow-2xs">
                                                ☀️ {tripDetails.days} Days Total
                                            </span>
                                        </>
                                    )}
                                </div>
                                <span className="text-[11px] text-amber-800 font-medium">
                                    {tripDetails.nights === 0 ? 'Same-day tour (No hotel overnight)' : 'Auto-calculated from destination legs'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* CARD 2: Schedule & Travel Party */}
                    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-3.5">
                            <div className="flex items-center gap-2.5">
                                <div className="size-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200/60">
                                    <Calendar size={17} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-stone-900">Schedule & Travel Party</h3>
                                    <p className="text-[11px] text-stone-400">Departure date and party size of adults and children.</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                                    <Calendar size={12} className="text-indigo-500" /> Start Date *
                                </label>
                                <input
                                    type="date"
                                    value={tripDetails.startDate || ''}
                                    onChange={e => updateTripDetails({ startDate: e.target.value })}
                                    className="w-full bg-stone-50/70 border border-stone-200 text-stone-900 rounded-xl px-3.5 py-2.5 font-bold text-sm focus:bg-white focus:ring-2 focus:ring-amber-400 outline-none transition-all shadow-2xs"
                                />
                                {tripDetails.startDate && (
                                    <p className="text-[11px] text-stone-400 font-medium pl-1">
                                        {tripDetails.nights === 0 || tripDetails.days === 1
                                            ? `Single-day tour on ${new Date(tripDetails.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                            : `Concludes on ${new Date(new Date(tripDetails.startDate).setDate(new Date(tripDetails.startDate).getDate() + Math.max(1, (tripDetails.days || 1)) - 1)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                                    </p>
                                )}
                            </div>

                            <div>
                                <GuestSelector
                                    adults={tripDetails.adults || 2}
                                    childrenCount={tripDetails.children || 0}
                                    onChange={(a, c) => updateTripDetails({ adults: a, children: c })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* CARD 3: Visual Presentation & Media */}
                    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-3.5">
                            <div className="flex items-center gap-2.5">
                                <div className="size-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200/60">
                                    <Image size={17} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-stone-900">Visual Presentation & Media</h3>
                                    <p className="text-[11px] text-stone-400">Select an eye-catching cover photo and multi-image tour gallery.</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Field label="Cover Photo" icon={<span className="text-[12px]">🖼</span>}>
                                <ImageUpload
                                    label="Cover Image"
                                    value={tripDetails.coverImage}
                                    onChange={val => updateTripDetails({ coverImage: val })}
                                />
                            </Field>

                            <Field label="Photo Gallery Strip" icon={<Image size={13} />}>
                                <GalleryUploader
                                    images={tripDetails.gallery || []}
                                    onChange={gallery => updateTripDetails({ gallery })}
                                />
                            </Field>
                        </div>
                    </div>

                    {/* CARD 4: Inclusions & Terms */}
                    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3.5">
                            <div className="flex items-center gap-2.5">
                                <div className="size-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60">
                                    <CheckCircle2 size={17} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-stone-900">Package Inclusions & Exclusions</h3>
                                    <p className="text-[11px] text-stone-400">Specify package deliverables for quotation accuracy.</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleGenerateIncExc}
                                disabled={isGeneratingIncExc}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 active:scale-95 self-start sm:self-auto"
                            >
                                <Sparkles size={12} className={isGeneratingIncExc ? 'animate-spin' : ''} />
                                {isGeneratingIncExc ? 'Generating Terms…' : 'AI Auto-Suggest Terms'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ListEditor
                                title="What's Included"
                                items={tripDetails.included || []}
                                onChange={items => updateTripDetails({ included: items })}
                                placeholder="e.g. Daily Breakfast, Private Innova, Airport Pickup..."
                                color="emerald"
                            />
                            <ListEditor
                                title="What's Excluded"
                                items={tripDetails.notIncluded || []}
                                onChange={items => updateTripDetails({ notIncluded: items })}
                                placeholder="e.g. Airfare, Personal Expenses, Monument Entry Fees..."
                                color="rose"
                            />
                        </div>
                    </div>

                    {/* Mobile CTA */}
                    <div className="lg:hidden pt-2">
                        <button
                            onClick={handleNext}
                            className="w-full py-3.5 bg-stone-900 hover:bg-stone-800 active:scale-95 text-white font-black text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                        >
                            <span>Continue to Day Planner</span>
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>

                {/* ── RIGHT COLUMN: Sticky Live Tour Summary Card (4-5 cols) ──────── */}
                <div className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-6 space-y-4">
                    <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden flex flex-col">
                        {/* Compact 16:9 Cover Banner */}
                        <div className="h-44 w-full relative overflow-hidden bg-stone-900 group">
                            <img
                                src={tripDetails.coverImage || 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?q=80&w=1000&auto=format&fit=crop'}
                                alt="Tour cover preview"
                                className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500 ease-out"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/30 to-transparent p-4 flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider text-white border border-white/20 flex items-center gap-1.5">
                                        <Sparkles size={11} className="text-amber-300" /> Live Preview
                                    </span>
                                    <span className="px-2.5 py-1 bg-stone-900/80 backdrop-blur-md rounded-full text-[10px] font-black text-amber-400 border border-stone-700">
                                        {tripDetails.nights === 0 ? '1 Day Excursion' : `${tripDetails.nights}N / ${tripDetails.days}D`}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-white leading-snug line-clamp-2 drop-shadow-sm">
                                        {tripDetails.title || 'Untitled Itinerary'}
                                    </h3>
                                </div>
                            </div>
                        </div>

                        {/* Card Details Body */}
                        <div className="p-5 space-y-4 flex-1">
                            {/* Route */}
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-wider text-stone-400">Planned Route</p>
                                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 flex-wrap">
                                    <MapPin size={13} className="text-rose-500 shrink-0" />
                                    <span className="truncate">{routeString}</span>
                                </div>
                            </div>

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-100">
                                <div className="bg-stone-50 rounded-xl p-2.5 border border-stone-100">
                                    <span className="text-[9px] font-black uppercase text-stone-400 block">Dates</span>
                                    <span className="text-xs font-bold text-stone-800 truncate block">
                                        {tripDetails.startDate ? getFormattedDateRange() : 'Date not set'}
                                    </span>
                                </div>
                                <div className="bg-stone-50 rounded-xl p-2.5 border border-stone-100">
                                    <span className="text-[9px] font-black uppercase text-stone-400 block">Travelers</span>
                                    <span className="text-xs font-bold text-stone-800 block">
                                        {(tripDetails.adults || 0) + (tripDetails.children || 0)} Guests
                                    </span>
                                </div>
                            </div>

                            {/* Checklist */}
                            <div className="space-y-2 pt-2 border-t border-stone-100">
                                <p className="text-[10px] font-black uppercase tracking-wider text-stone-400">Trip Setup Checklist</p>
                                <div className="space-y-1.5 text-xs font-semibold">
                                    <div className="flex items-center gap-2">
                                        {hasTitle ? (
                                            <Check size={14} className="text-emerald-600 stroke-[3]" />
                                        ) : (
                                            <span className="size-3.5 rounded-full border border-stone-300 inline-block" />
                                        )}
                                        <span className={hasTitle ? 'text-stone-700 font-bold' : 'text-stone-400'}>Itinerary Title Defined</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {hasDestinations ? (
                                            <Check size={14} className="text-emerald-600 stroke-[3]" />
                                        ) : (
                                            <span className="size-3.5 rounded-full border border-stone-300 inline-block" />
                                        )}
                                        <span className={hasDestinations ? 'text-stone-700 font-bold' : 'text-stone-400'}>Destinations Selected</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {hasDates ? (
                                            <Check size={14} className="text-emerald-600 stroke-[3]" />
                                        ) : (
                                            <span className="size-3.5 rounded-full border border-stone-300 inline-block" />
                                        )}
                                        <span className={hasDates ? 'text-stone-700 font-bold' : 'text-stone-400'}>Start Date Picked</span>
                                    </div>
                                </div>
                            </div>

                            {/* Launch Action */}
                            <div className="pt-2">
                                <button
                                    onClick={handleNext}
                                    className="w-full py-3.5 bg-stone-900 hover:bg-stone-800 active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                                >
                                    <span>Continue to Day Planner</span>
                                    <ArrowRight size={15} />
                                </button>
                                <p className="text-[10px] text-stone-400 text-center mt-2 font-medium">
                                    Step 2: Add hotels, cabs & activities day-by-day
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Add Location Modal */}
            <QuickAddLocationModal
                isOpen={showQuickAddModal}
                onClose={() => setShowQuickAddModal(false)}
                onAdd={handleQuickAddLocation}
                onSuccessSelect={(newId) => {
                    const legs = tripDetails.destinations || [];
                    const emptyIdx = legs.findIndex(l => !l.locationId);
                    if (emptyIdx !== -1) {
                        const newDests = [...legs];
                        newDests[emptyIdx].locationId = newId;
                        updateTripDetails({ destinations: newDests, destination: emptyIdx === 0 ? newId : tripDetails.destination });
                    } else if (legs.length === 0) {
                        const dNights = tripDetails.nights === 0 ? 0 : 1;
                        updateTripDetails({
                            destinations: [{ locationId: newId, nights: dNights, order: 0 }],
                            destination: newId,
                            nights: dNights,
                            days: dNights === 0 ? 1 : dNights + 1
                        });
                    } else {
                        const newDests = [...legs, { locationId: newId, nights: tripDetails.nights === 0 ? 0 : 1, order: legs.length }];
                        const totalNights = newDests.reduce((acc, d) => acc + (d.nights || 0), 0);
                        updateTripDetails({ destinations: newDests, nights: totalNights, days: totalNights === 0 ? 1 : totalNights + 1 });
                    }
                }}
            />
        </div>
    );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

// ─── Location Combobox ────────────────────────────────────────────────────────
const LocationCombobox: React.FC<{
    value: string;
    locations: MasterLocation[];
    placeholder?: string;
    onQuickAdd: (name: string) => Promise<string | null>;
    onChange: (locationId: string) => void;
}> = ({ value, locations, placeholder = "Select or type destination...", onQuickAdd, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedLoc = locations.find(l => l.id === value || l.name?.toLowerCase() === value?.toLowerCase());

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filtered = locations.filter(l => 
        l.name?.toLowerCase().includes(search.toLowerCase()) || 
        l.region?.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (locId: string) => {
        onChange(locId);
        setIsOpen(false);
        setSearch('');
    };

    const handleCreateNew = async (name: string) => {
        if (!name.trim()) return;
        setIsCreating(true);
        try {
            const newId = await onQuickAdd(name.trim());
            if (newId) {
                onChange(newId);
                setIsOpen(false);
                setSearch('');
            }
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <div 
                onClick={() => setIsOpen(v => !v)}
                className={`w-full bg-white border ${isOpen ? 'border-amber-400 ring-2 ring-amber-100' : 'border-stone-200 hover:border-amber-300'} text-stone-900 rounded-lg px-3 py-2 font-bold text-sm flex items-center justify-between cursor-pointer shadow-sm transition-all`}
            >
                <div className="flex items-center gap-2 truncate">
                    <MapPin size={14} className={selectedLoc ? 'text-amber-600 shrink-0' : 'text-stone-400 shrink-0'} />
                    <span className={selectedLoc ? 'text-stone-900 truncate' : 'text-stone-400 font-normal truncate'}>
                        {selectedLoc ? (
                            <>
                                <span>{selectedLoc.name}</span>
                                {selectedLoc.region && <span className="text-stone-400 font-normal text-xs ml-1.5">({selectedLoc.region})</span>}
                            </>
                        ) : (value || placeholder)}
                    </span>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                    {value && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange('');
                            }}
                            className="size-4 rounded hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-600"
                        >
                            <X size={11} />
                        </button>
                    )}
                    <ChevronDown size={14} className={`text-stone-400 transition-transform ${isOpen ? 'rotate-180 text-amber-500' : ''}`} />
                </div>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-stone-200 p-2 z-50 animate-in fade-in slide-in-from-top-1">
                    <div className="relative mb-2">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                            type="text"
                            autoFocus
                            placeholder="Type to search or add..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && search.trim()) {
                                    e.preventDefault();
                                    const exactMatch = locations.find(l => l.name.toLowerCase() === search.trim().toLowerCase());
                                    if (exactMatch) {
                                        handleSelect(exactMatch.id);
                                    } else {
                                        handleCreateNew(search.trim());
                                    }
                                }
                            }}
                            className="w-full bg-stone-50 border border-stone-200 rounded-lg pl-8 pr-3 py-1.5 text-xs font-bold text-stone-800 placeholder:font-normal placeholder:text-stone-400 outline-none focus:border-amber-400 focus:bg-white transition-all"
                        />
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar">
                        {filtered.map(loc => (
                            <div
                                key={loc.id}
                                onClick={() => handleSelect(loc.id)}
                                className={`px-2.5 py-2 rounded-lg text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                                    loc.id === value ? 'bg-amber-50 text-amber-900 font-black' : 'hover:bg-stone-50 text-stone-700'
                                }`}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <MapPin size={12} className={loc.id === value ? 'text-amber-600' : 'text-stone-400'} />
                                    <span className="truncate">{loc.name}</span>
                                    {loc.region && (
                                        <span className="text-[10px] text-stone-400 font-normal">· {loc.region}</span>
                                    )}
                                </div>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 font-bold uppercase tracking-wider">
                                    {loc.type || 'City'}
                                </span>
                            </div>
                        ))}

                        {search.trim() && !locations.some(l => l.name.toLowerCase() === search.trim().toLowerCase()) && (
                            <button
                                type="button"
                                disabled={isCreating}
                                onClick={() => handleCreateNew(search.trim())}
                                className="w-full mt-1 p-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                            >
                                <Plus size={13} strokeWidth={3} />
                                {isCreating ? 'Adding...' : `Add "${search.trim()}" as New Location`}
                            </button>
                        )}

                        {filtered.length === 0 && !search.trim() && (
                            <div className="p-3 text-center text-xs text-stone-400">
                                <p>No locations available yet.</p>
                                <p className="text-[10px] mt-0.5 text-stone-500">Type a location name above to create it instantly!</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Quick Add Location Modal ──────────────────────────────────────────────────
const QuickAddLocationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onAdd: (name: string, type: MasterLocationType, region: string) => Promise<string | null>;
    onSuccessSelect?: (locId: string) => void;
}> = ({ isOpen, onClose, onAdd, onSuccessSelect }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<MasterLocationType>('City');
    const [region, setRegion] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Please enter a location name');
            return;
        }
        setIsSubmitting(true);
        try {
            const newId = await onAdd(name.trim(), type, region.trim() || 'India');
            if (newId) {
                onSuccessSelect?.(newId);
                onClose();
                setName('');
                setRegion('');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                            <MapPin size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-stone-900">Add Destination Location</h3>
                            <p className="text-xs text-stone-500">Create a new location for your itineraries</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-600"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">Location Name *</label>
                        <input
                            type="text"
                            autoFocus
                            placeholder="e.g. Delhi, Kashmir, Amalfi Coast"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-stone-900 focus:ring-2 focus:ring-amber-400 focus:bg-white outline-none"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-stone-700 mb-1">Type</label>
                            <select
                                value={type}
                                onChange={e => setType(e.target.value as MasterLocationType)}
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-900 focus:ring-2 focus:ring-amber-400 outline-none"
                            >
                                <option value="City">City</option>
                                <option value="State">State</option>
                                <option value="Country">Country</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-700 mb-1">Region / State</label>
                            <input
                                type="text"
                                placeholder="e.g. North India, Italy"
                                value={region}
                                onChange={e => setRegion(e.target.value)}
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-900 focus:ring-2 focus:ring-amber-400 focus:bg-white outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !name.trim()}
                            className="px-5 py-2 text-xs font-black bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl shadow transition-all flex items-center gap-1.5"
                        >
                            {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} strokeWidth={3} />}
                            {isSubmitting ? 'Adding...' : 'Add Location'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Field: React.FC<{ label: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ label, icon, children }) => (
    <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-stone-400">
            {icon} {label}
        </label>
        {children}
    </div>
);

const Counter: React.FC<{ label: string; icon: string; value: number; onChange: (v: number) => void; min?: number }> = ({ label, icon, value, onChange, min = 0 }) => (
    <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-stone-400">
            <span>{icon}</span> {label}
        </label>
        <div className="flex items-center bg-stone-50 border border-stone-200 rounded-xl px-2 py-1.5">
            <button onClick={() => onChange(Math.max(min, value - 1))} className="size-8 flex items-center justify-center hover:bg-stone-200 rounded-lg transition-colors text-stone-500 font-bold text-lg">-</button>
            <span className="flex-1 text-center font-black text-base text-stone-900">{value}</span>
            <button onClick={() => onChange(value + 1)} className="size-8 flex items-center justify-center hover:bg-stone-200 rounded-lg transition-colors text-stone-500 font-bold text-lg">+</button>
        </div>
    </div>
);

const GuestSelector: React.FC<{ adults: number; childrenCount: number; onChange: (a: number, c: number) => void }> = ({ adults, childrenCount, onChange }) => {
    const [open, setOpen] = React.useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);


    const summary = `${adults} Adult${adults !== 1 ? 's' : ''}${childrenCount > 0 ? `, ${childrenCount} Child${childrenCount !== 1 ? 'ren' : ''}` : ''}`;

    return (
        <div className="space-y-1.5 relative" ref={ref}>
            <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-stone-400">
                <Users size={13} /> Guests
            </label>
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-sm text-left text-stone-900 focus:ring-2 focus:ring-amber-400 outline-none transition-all flex justify-between items-center"
            >
                <span>{summary}</span>
                <ArrowRight size={14} className={`rotate-90 text-stone-400 transition-transform ${open ? 'rotate-[-90deg]' : ''}`} />
            </button>
            {open && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-stone-100 p-4 z-50">
                    {[{label: 'Adults', sub: 'Age 13+', val: adults, min: 1, setter: (v: number) => onChange(v, childrenCount)},
                      {label: 'Children', sub: 'Age 2–12', val: childrenCount, min: 0, setter: (v: number) => onChange(adults, v)}
                    ].map(row => (
                        <div key={row.label} className="flex justify-between items-center py-3 border-b border-stone-50 last:border-none">
                            <div>
                                <p className="text-sm font-bold text-stone-900">{row.label}</p>
                                <p className="text-[10px] text-stone-400">{row.sub}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => row.setter(Math.max(row.min, row.val - 1))} className="size-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 font-bold transition-colors">-</button>
                                <span className="w-4 text-center font-black text-stone-900">{row.val}</span>
                                <button onClick={() => row.setter(row.val + 1)} className="size-8 rounded-full bg-amber-100 hover:bg-amber-200 flex items-center justify-center text-amber-700 font-bold transition-colors">+</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const ListEditor: React.FC<{ title: string; items: string[]; onChange: (i: string[]) => void; placeholder?: string; color: 'emerald' | 'rose' }> = ({ title, items, onChange, placeholder, color }) => {
    const [val, setVal] = React.useState('');
    const add = () => { if (val.trim()) { onChange([...items, val.trim()]); setVal(''); } };
    const cls = color === 'emerald'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
        : 'bg-rose-50 text-rose-700 border-rose-100';

    return (
        <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-stone-400">{title}</label>
            <div className="flex bg-stone-50 border border-stone-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-amber-400 transition-all">
                <input
                    value={val}
                    onChange={e => setVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent px-3 py-2 text-xs outline-none"
                />
                <button type="button" onClick={add} className="px-3 bg-stone-100 hover:bg-stone-200 text-stone-500 transition-colors">
                    <Plus size={14} />
                </button>
            </div>
            {items.length > 0 && (
                <ul className="space-y-1">
                    {items.map((item, i) => (
                        <li key={i} className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border ${cls}`}>
                            <span className="flex items-center gap-1.5"><Check size={10} /> {item}</span>
                            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="opacity-50 hover:opacity-100 transition-opacity">
                                <X size={12} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

// ─── Gallery Uploader ──────────────────────────────────────────────────────────
const GalleryUploader: React.FC<{
    images: string[];
    onChange: (images: string[]) => void;
}> = ({ images, onChange }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadCount, setUploadCount] = useState(0);

    const handleFiles = async (files: FileList) => {
        const valid = Array.from(files).filter(f => {
            if (f.size > 8 * 1024 * 1024) { toast.error(`${f.name} exceeds 8MB limit`); return false; }
            return true;
        });
        if (!valid.length) return;

        setUploading(true);
        setUploadCount(valid.length);
        const toastId = toast.loading(`Uploading ${valid.length} photo${valid.length > 1 ? 's' : ''}…`);
        const uploaded: string[] = [];

        for (const file of valid) {
            try {
                const url = await api.uploadFile(file, 'documents');
                uploaded.push(url);
            } catch (e: any) {
                toast.error(`Failed: ${file.name}`);
            }
        }

        onChange([...images, ...uploaded]);
        setUploading(false);
        setUploadCount(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
        toast.dismiss(toastId);
        if (uploaded.length) toast.success(`${uploaded.length} photo${uploaded.length > 1 ? 's' : ''} added to gallery`);
    };

    const remove = (idx: number) => {
        onChange(images.filter((_, i) => i !== idx));
    };

    return (
        <div className="space-y-3">
            {/* Thumbnail Grid */}
            {images.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {images.map((img, i) => (
                        <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
                            <img src={img} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                    type="button"
                                    onClick={() => remove(i)}
                                    className="size-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow"
                                    title="Remove photo"
                                >
                                    <X size={13} />
                                </button>
                            </div>
                            <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[9px] font-bold px-1 rounded">
                                {i + 1}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload trigger */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => e.target.files && handleFiles(e.target.files)}
            />
            <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-stone-300 hover:border-amber-400 hover:bg-amber-50 rounded-xl text-stone-500 hover:text-amber-600 transition-all text-xs font-bold group disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {uploading ? (
                    <>
                        <Upload size={14} className="animate-bounce" />
                        Uploading {uploadCount} photo{uploadCount > 1 ? 's' : ''}…
                    </>
                ) : (
                    <>
                        <Upload size={14} />
                        {images.length > 0 ? `Add More Photos (${images.length} added)` : 'Upload Gallery Photos'}
                    </>
                )}
            </button>
            <p className="text-[10px] text-stone-400 text-center">
                Select multiple photos at once · Max 8MB each · JPG, PNG, WEBP
            </p>
        </div>
    );
};

