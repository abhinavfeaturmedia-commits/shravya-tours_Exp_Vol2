import React, { useEffect, useRef, useState } from 'react';
import { useItinerary } from '../ItineraryContext';
import { useData } from '../../../context/DataContext';
import { MapPin, Calendar, Users, Globe, Plus, X, ArrowRight, Check, Image, Upload, FileText, Tag, Clock } from 'lucide-react';
import { ImageUpload } from '../../ui/ImageUpload';
import { api } from '../../../src/lib/api';
import { toast } from 'sonner';

interface Props {
    onDone?: () => void;
}

export const StepTripDetails: React.FC<Props> = ({ onDone }) => {
    const { tripDetails, updateTripDetails } = useItinerary();
    const { masterLocations } = useData();

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

    return (
        <div className="min-h-full p-6 md:p-10 flex flex-col">
            {/* Page title */}
            <div className="mb-8">
                <p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-1">Step 1 of 4</p>
                <h2 className="text-2xl font-black text-stone-900 leading-tight">Trip Basics</h2>
                <p className="text-sm text-stone-500 mt-1">Define the core details of this journey.</p>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start max-w-5xl w-full mx-auto">

                {/* ── Form ─────────────────────────────────────────── */}
                <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-6">

                    {/* Title */}
                    <Field label="Itinerary Title" icon={<Globe size={13} />}>
                        <input
                            type="text"
                            placeholder="e.g. Amalfi Coast Expedition"
                            value={tripDetails.title}
                            onChange={e => updateTripDetails({ title: e.target.value })}
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-sm text-stone-900 focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition-all placeholder:font-normal placeholder:text-stone-400"
                        />
                    </Field>

                    {/* Destinations ────────────────────────────────────────────── */}
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
                        <label className="flex items-center gap-2 text-[10px] font-black text-stone-500 uppercase tracking-widest mb-3">
                            <MapPin size={13} /> Destination Legs
                        </label>
                        <div className="space-y-3">
                            {(tripDetails.destinations || []).map((dest, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <div className="flex-1 relative">
                                        <select
                                            value={dest.locationId}
                                            onChange={e => {
                                                const newDests = [...(tripDetails.destinations || [])];
                                                newDests[idx].locationId = e.target.value;
                                                // Sync legacy destination for fallback if it's the first leg
                                                const updates: any = { destinations: newDests };
                                                if (idx === 0) updates.destination = e.target.value;
                                                updateTripDetails(updates);
                                            }}
                                            className="w-full appearance-none bg-white border border-stone-200 text-stone-900 rounded-lg pl-3 pr-8 py-2 font-bold text-sm focus:ring-2 focus:ring-amber-400 outline-none transition-all"
                                        >
                                            <option value="">Select Location</option>
                                            {masterLocations?.map(loc => (
                                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                                            ))}
                                        </select>
                                        <ArrowRight size={12} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-stone-400 pointer-events-none" />
                                    </div>
                                    <div className="w-24 shrink-0 flex items-center bg-white border border-stone-200 rounded-lg overflow-hidden h-9">
                                        <button onClick={() => {
                                                const newDests = [...(tripDetails.destinations || [])];
                                                newDests[idx].nights = Math.max(1, newDests[idx].nights - 1);
                                                const totalNights = newDests.reduce((acc, d) => acc + d.nights, 0);
                                                updateTripDetails({ destinations: newDests, nights: totalNights, days: totalNights + 1 });
                                            }} className="px-2 hover:bg-stone-100 text-stone-500">-</button>
                                        <div className="flex-1 text-center font-bold text-sm">{dest.nights}N</div>
                                        <button onClick={() => {
                                                const newDests = [...(tripDetails.destinations || [])];
                                                newDests[idx].nights++;
                                                const totalNights = newDests.reduce((acc, d) => acc + d.nights, 0);
                                                updateTripDetails({ destinations: newDests, nights: totalNights, days: totalNights + 1 });
                                            }} className="px-2 hover:bg-stone-100 text-stone-500">+</button>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            const newDests = (tripDetails.destinations || []).filter((_, i) => i !== idx);
                                            const totalNights = newDests.reduce((acc, d) => acc + d.nights, 0);
                                            const updates: any = { destinations: newDests, nights: totalNights, days: totalNights + 1 };
                                            if (idx === 0 && newDests.length > 0) updates.destination = newDests[0].locationId;
                                            updateTripDetails(updates);
                                        }}
                                        className="p-1.5 text-rose-400 hover:bg-rose-50 rounded"
                                    ><X size={16} /></button>
                                </div>
                            ))}
                            <button
                                onClick={() => {
                                    const newDests = [...(tripDetails.destinations || []), { locationId: '', nights: 1, order: (tripDetails.destinations || []).length }];
                                    const totalNights = newDests.reduce((acc, d) => acc + d.nights, 0);
                                    updateTripDetails({ destinations: newDests, nights: totalNights, days: totalNights + 1 });
                                }}
                                className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                            >
                                <Plus size={14} /> Add Leg
                            </button>
                        </div>
                    </div>
                        <Field label="Start Date" icon={<Calendar size={13} />}>
                            <input
                                type="date"
                                value={tripDetails.startDate || ''}
                                onChange={e => updateTripDetails({ startDate: e.target.value })}
                                className="w-full bg-stone-50 border border-stone-200 text-stone-900 rounded-xl px-4 py-3 font-bold text-sm focus:ring-2 focus:ring-amber-400 outline-none transition-all"
                            />
                        </Field>

                    {/* Days / Nights / Guests */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex-1 opacity-50 relative pointer-events-none grayscale">
                            <Counter
                                label="Nights (Auto)" icon="🌙"
                                value={tripDetails.nights}
                                onChange={()=>{}}
                                min={0}
                            />
                            <div className="absolute inset-0 z-10" />
                        </div>
                        <div className="flex-1 opacity-50 relative pointer-events-none grayscale">
                            <Counter
                                label="Days (Auto)" icon="☀️"
                                value={tripDetails.days}
                                onChange={()=>{}}
                                min={1}
                            />
                            <div className="absolute inset-0 z-10" />
                        </div>
                        <div className="col-span-2">
                            <GuestSelector
                                adults={tripDetails.adults || 2}
                                childrenCount={tripDetails.children || 0}
                                onChange={(a, c) => updateTripDetails({ adults: a, children: c })}
                            />
                        </div>
                    </div>

                    {/* Cover Image */}
                    <Field label="Cover Image" icon={<span className="text-[12px]">🖼</span>}>
                        <ImageUpload
                            label="Cover Image"
                            value={tripDetails.coverImage}
                            onChange={val => updateTripDetails({ coverImage: val })}
                        />
                    </Field>

                    {/* Gallery Images */}
                    <Field label="Photo Gallery" icon={<Image size={13} />}>
                        <GalleryUploader
                            images={tripDetails.gallery || []}
                            onChange={gallery => updateTripDetails({ gallery })}
                        />
                    </Field>

                    {/* Inclusions / Exclusions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ListEditor
                            title="Included"
                            items={tripDetails.included || []}
                            onChange={items => updateTripDetails({ included: items })}
                            placeholder="Add inclusion…"
                            color="emerald"
                        />
                        <ListEditor
                            title="Not Included"
                            items={tripDetails.notIncluded || []}
                            onChange={items => updateTripDetails({ notIncluded: items })}
                            placeholder="Add exclusion…"
                            color="rose"
                        />
                    </div>

                    {/* Client & Itinerary Meta */}
                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-4">
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Itinerary Settings</p>

                        {/* Client Name */}
                        <Field label="Client Name" icon={<Users size={13} />}>
                            <input
                                type="text"
                                placeholder="e.g. Sharma Family, Mr. Ramesh"
                                value={tripDetails.clientName || ''}
                                onChange={e => updateTripDetails({ clientName: e.target.value })}
                                className="w-full bg-white border border-blue-100 rounded-xl px-4 py-2.5 font-bold text-sm text-stone-900 focus:ring-2 focus:ring-blue-300 focus:border-transparent outline-none transition-all placeholder:font-normal placeholder:text-stone-400"
                            />
                        </Field>

                        {/* Status + Validity row */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-stone-400">
                                    <Tag size={11} /> Status
                                </label>
                                <select
                                    value={tripDetails.itineraryStatus || 'Draft'}
                                    onChange={e => updateTripDetails({ itineraryStatus: e.target.value })}
                                    className="w-full bg-white border border-blue-100 rounded-xl px-3 py-2.5 font-bold text-sm text-stone-900 focus:ring-2 focus:ring-blue-300 outline-none transition-all"
                                >
                                    <option value="Draft">📝 Draft</option>
                                    <option value="Sent">📤 Sent</option>
                                    <option value="Confirmed">✅ Confirmed</option>
                                    <option value="Cancelled">❌ Cancelled</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-stone-400">
                                    <Clock size={11} /> Valid For (Days)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="7"
                                    value={tripDetails.validityDays ?? 7}
                                    onChange={e => updateTripDetails({ validityDays: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-white border border-blue-100 rounded-xl px-3 py-2.5 font-bold text-sm text-stone-900 focus:ring-2 focus:ring-blue-300 outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Terms & Conditions */}
                        <Field label="Terms & Conditions" icon={<FileText size={13} />}>
                            <textarea
                                rows={4}
                                placeholder="e.g. 30% advance required. No refund within 7 days. Prices valid for Indian nationals only..."
                                value={tripDetails.termsAndConditions || ''}
                                onChange={e => updateTripDetails({ termsAndConditions: e.target.value })}
                                className="w-full bg-white border border-blue-100 rounded-xl px-4 py-3 font-medium text-sm text-stone-900 focus:ring-2 focus:ring-blue-300 focus:border-transparent outline-none transition-all placeholder:font-normal placeholder:text-stone-400 resize-none leading-relaxed"
                            />
                        </Field>
                    </div>

                    {/* CTA */}
                    <button
                        onClick={handleNext}
                        className="w-full py-3 bg-stone-900 hover:bg-stone-700 text-white font-black rounded-xl shadow transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
                    >
                        Go to Day Planner <ArrowRight size={16} />
                    </button>
                </div>

                {/* ── Preview ───────────────────────────────────────── */}
                <div className="hidden lg:block">
                    <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl relative bg-stone-900 group">
                        <img
                            src={tripDetails.coverImage || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop'}
                            alt="Cover preview"
                            className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700 ease-out"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/90 via-stone-900/30 to-transparent p-10 flex flex-col justify-end">
                            <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-xs font-bold text-white mb-3 border border-white/10 w-fit">
                                Preview
                            </span>
                            <h1 className="text-3xl font-black text-white leading-tight mb-2">
                                {tripDetails.title || 'Your Amazing Trip'}
                            </h1>
                            <p className="text-white/80 font-medium flex items-center gap-2 text-sm">
                                <MapPin size={14} />
                                {tripDetails.destinations && tripDetails.destinations.length > 0
                                    ? tripDetails.destinations.map(d => masterLocations?.find(l => l.id === d.locationId)?.name || 'Unknown').join(' → ')
                                    : (masterLocations?.find(l => l.id === tripDetails.destination)?.name || 'Select Destination')}
                            </p>
                            {tripDetails.startDate && (
                                <p className="text-white/60 text-xs mt-1 font-medium">
                                    {tripDetails.nights}N / {tripDetails.days}D · {(tripDetails.adults || 0) + (tripDetails.children || 0)} Guests
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Gallery Strip Preview */}
                    {(tripDetails.gallery || []).length > 0 && (
                        <div className="mt-3 grid grid-cols-4 gap-2">
                            {(tripDetails.gallery || []).slice(0, 4).map((img, i) => (
                                <div key={i} className="aspect-square rounded-xl overflow-hidden border border-stone-200 relative">
                                    <img src={img} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                                    {i === 3 && (tripDetails.gallery || []).length > 4 && (
                                        <div className="absolute inset-0 bg-stone-900/60 flex items-center justify-center">
                                            <span className="text-white font-black text-sm">+{(tripDetails.gallery || []).length - 4}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

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
