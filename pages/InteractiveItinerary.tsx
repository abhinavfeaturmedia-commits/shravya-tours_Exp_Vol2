import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { api } from '../src/lib/api';
import {
    MapPin, Calendar, Users, Moon, Sun, Clock, Check, X,
    ShieldCheck, Ticket, Printer, MessageSquare, CheckCircle2,
    AlertTriangle, ArrowRight, Phone
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPrice, getLocationName } from '../utils/packageUtils';
import { PaymentLogos } from '../components/ui/PaymentLogos';

// ─── Print Styles (injected once) ────────────────────────────────────────────
const PRINT_STYLES = `
@media print {
    html, body { font-size: 12px; }
    .no-print { display: none !important; }
    .print-full { grid-column: 1 / -1 !important; }
    .page-break-before { page-break-before: always; }
    header, footer, nav { display: none !important; }
    .sticky { position: static !important; }
    a[href]:after { content: none !important; }
    .hero-cover { height: 220px !important; min-height: unset !important; }
    @page { margin: 15mm; }
}
`;

// ─── Proposal Status Badge ────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
    'Draft':             { label: 'Draft',            bg: 'bg-stone-100',   text: 'text-stone-600', icon: null },
    'Sent':              { label: 'Sent',              bg: 'bg-sky-100',     text: 'text-sky-700',   icon: null },
    'Viewed':            { label: 'Viewed',            bg: 'bg-amber-100',   text: 'text-amber-700', icon: null },
    'Approved':          { label: '✅ Approved',       bg: 'bg-emerald-100', text: 'text-emerald-700', icon: null },
    'Changes Requested': { label: '💬 Changes Req.',  bg: 'bg-rose-100',    text: 'text-rose-700',  icon: null },
};

// ─── Feedback Modal ───────────────────────────────────────────────────────────
const FeedbackModal: React.FC<{
    onSubmit: (text: string) => void;
    onClose: () => void;
}> = ({ onSubmit, onClose }) => {
    const [text, setText] = useState('');
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm no-print px-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative animate-in fade-in slide-in-from-bottom-4 duration-300">
                <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full hover:bg-stone-100">
                    <X size={18} className="text-stone-500" />
                </button>
                <div className="flex items-center gap-3 mb-6">
                    <div className="size-10 rounded-xl bg-amber-100 flex items-center justify-center">
                        <MessageSquare size={20} className="text-amber-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-stone-900">Request Changes</h2>
                        <p className="text-xs text-stone-400">Tell us what you'd like adjusted</p>
                    </div>
                </div>
                <textarea
                    autoFocus
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="e.g. I'd like a different hotel in Day 2, and can we extend the trip by 1 night?"
                    className="w-full h-32 bg-stone-50 border border-stone-200 rounded-2xl p-4 text-sm font-medium text-stone-800 placeholder:text-stone-400 focus:ring-2 focus:ring-amber-400 outline-none resize-none"
                />
                <div className="flex gap-3 mt-4">
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-stone-200 text-sm font-bold text-stone-600 hover:bg-stone-50 transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={() => { if (text.trim()) { onSubmit(text); } else { toast.error('Please describe the changes needed.'); } }}
                        className="flex-1 py-3 rounded-xl bg-stone-900 text-white text-sm font-black hover:bg-stone-800 transition-colors"
                    >
                        Send Feedback
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Success Screen ───────────────────────────────────────────────────────────
const ApprovedBanner: React.FC = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white no-print px-4">
        <div className="text-center max-w-sm">
            <div className="size-28 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6 animate-bounce">
                <CheckCircle2 size={56} className="text-emerald-500" />
            </div>
            <h1 className="text-3xl font-black text-stone-900 mb-3">Proposal Accepted! 🎉</h1>
            <p className="text-stone-500 text-base leading-relaxed mb-6">
                Your approval has been recorded. Our team will get in touch with you shortly to confirm the booking and payment details.
            </p>
            <div className="flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-3 text-sm font-bold text-emerald-700">
                <Phone size={16} /> We'll call you within 2 business hours.
            </div>
        </div>
    </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
export const InteractiveItinerary: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { packages, updatePackage, masterLocations, coupons } = useData();

    const [showSuccess, setShowSuccess] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);

    const rawPkg = packages.find(p => p.id === id);

    // Lazy-load the full package record (with builderData) since the global list
    // intentionally omits builder_data to reduce payload size.
    const [fullPkg, setFullPkg] = useState<typeof rawPkg>(undefined);
    useEffect(() => {
        if (!id) return;
        // Always fetch the full record for this page so builderData is available
        api.getPackageById(id).then(full => {
            if (full) setFullPkg(full);
        }).catch(console.warn);
    }, [id]);

    // Merge: use fullPkg's builderData if available, otherwise use the list-level rawPkg
    const effectivePkg = fullPkg ? { ...(rawPkg || fullPkg), builderData: fullPkg.builderData } : rawPkg;

    // Inject print styles once
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = PRINT_STYLES;
        document.head.appendChild(style);
        return () => { document.head.removeChild(style); };
    }, []);

    // Document title + view tracking
    useEffect(() => {
        if (rawPkg) {
            document.title = `${rawPkg.title} | Trip Proposal`;
            if (
                rawPkg.proposalStatus !== 'Viewed' &&
                rawPkg.proposalStatus !== 'Approved' &&
                rawPkg.proposalStatus !== 'Changes Requested'
            ) {
                updatePackage(rawPkg.id, { proposalStatus: 'Viewed' });
            }
        }
        window.scrollTo(0, 0);
    }, [rawPkg?.id]); // only run when ID changes, not on every re-render

    const handleAccept = useCallback(() => {
        if (!rawPkg) return;
        updatePackage(rawPkg.id, { proposalStatus: 'Approved' });
        setShowSuccess(true);
        toast.success('Proposal accepted! Our team will contact you soon.');
    }, [rawPkg, updatePackage]);

    const handleFeedbackSubmit = useCallback((text: string) => {
        if (!rawPkg) return;
        updatePackage(rawPkg.id, { proposalStatus: 'Changes Requested' });
        setShowFeedbackModal(false);
        toast.success('Feedback sent! Our team will review your request.');
    }, [rawPkg, updatePackage]);

    if (!effectivePkg) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-stone-50">
                <div className="text-center">
                    <AlertTriangle size={48} className="text-amber-400 mx-auto mb-4" />
                    <h1 className="text-3xl font-black text-stone-900 mb-2">Proposal Not Found</h1>
                    <p className="text-stone-500 mb-6">The link you followed may be invalid or expired.</p>
                    <Link to="/" className="text-amber-600 font-bold hover:underline">Return to Home</Link>
                </div>
            </div>
        );
    }

    if (showSuccess) return <ApprovedBanner />;

    // Extract builder data
    const { tripDetails, items, dayMeta, currency } = effectivePkg.builderData || {};
    const hasBuilderData = !!tripDetails && !!items;

    // Computed
    const guestCount = tripDetails
        ? (tripDetails.adults || 0) + (tripDetails.children || 0)
        : parseInt(effectivePkg.groupSize || '2');
    const finalPrice = Math.round(effectivePkg.price);
    const currencySymbol = currency === 'USD' ? '$' : '₹';

    const status = effectivePkg.proposalStatus;
    const isApproved = status === 'Approved';
    const isChangesRequested = status === 'Changes Requested';

    // Alias effectivePkg as pkg for JSX — all template references remain unchanged
    const pkg = effectivePkg;

    // Filter active coupons from data context
    const activeCoupons = useMemo(() => {
        return (coupons || []).filter(c => c.status === 'Active');
    }, [coupons]);

    // Ensure we always have high-quality coupons shown
    const displayedCoupons = useMemo(() => {
        const list = [...activeCoupons];
        // Add fallbacks if they are not already present (by coupon code match)
        const fallbacks = [
            {
                id: 'fallback-tours',
                code: 'TOUR15',
                type: 'ToursOnly' as const,
                discountType: 'Percentage' as const,
                discountValue: 15,
                validTo: '2026-12-31',
                status: 'Active' as const,
                isUsed: false,
                useCount: 0
            },
            {
                id: 'fallback-multi',
                code: 'SHRAVELLO015',
                type: 'MultiCategory' as const,
                discountType: 'Percentage' as const,
                discountValue: 15,
                validTo: '2026-12-31',
                status: 'Active' as const,
                isUsed: false,
                useCount: 0
            }
        ];
        fallbacks.forEach(fb => {
            if (!list.some(c => c.code.toLowerCase() === fb.code.toLowerCase())) {
                list.push(fb);
            }
        });
        return list.slice(0, 3); // show up to 3 coupons in the sidebar
    }, [activeCoupons]);

    const handleCopyCoupon = useCallback((code: string) => {
        navigator.clipboard.writeText(code)
            .then(() => {
                toast.success(`Coupon "${code}" copied to clipboard!`);
            })
            .catch(() => {
                toast.error('Failed to copy coupon code.');
            });
    }, []);

    return (
        <div className="min-h-screen bg-stone-50 selection:bg-amber-200">

            {/* Feedback Modal */}
            {showFeedbackModal && (
                <FeedbackModal
                    onSubmit={handleFeedbackSubmit}
                    onClose={() => setShowFeedbackModal(false)}
                />
            )}

            {/* Hero Cover */}
            <div className="relative h-[55vh] min-h-[380px] w-full isolate hero-cover">
                <img
                    src={pkg.image || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop'}
                    alt="Destination"
                    className="absolute inset-0 w-full h-full object-cover -z-10 brightness-50"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/40 to-transparent -z-10" />

                {/* Top bar */}
                <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-5 no-print">
                    <span className="text-white/60 text-xs font-bold uppercase tracking-widest">SHRAWELLO Travel Hub</span>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md border border-white/20 rounded-xl text-white text-xs font-bold hover:bg-white/30 transition-colors"
                    >
                        <Printer size={14} /> Download PDF
                    </button>
                </div>

                <div className="h-full flex flex-col justify-end max-w-5xl mx-auto px-6 pb-12">
                    {/* Status badge */}
                    {status && statusConfig[status] && (
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-3 w-fit no-print ${statusConfig[status].bg} ${statusConfig[status].text}`}>
                            {statusConfig[status].label}
                        </span>
                    )}
                    <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-black uppercase tracking-widest rounded mb-3 w-fit">
                        Exclusive Proposal
                    </span>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-4">{pkg.title}</h1>
                    <div className="flex flex-wrap items-center gap-4 text-white/90 text-sm font-medium">
                        <span className="flex items-center gap-1.5"><MapPin size={15} /> {getLocationName(pkg.location, masterLocations)}</span>
                        {tripDetails?.startDate && (
                            <span className="flex items-center gap-1.5">
                                <Calendar size={15} />
                                {new Date(tripDetails.startDate).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
                            </span>
                        )}
                        <span className="flex items-center gap-1.5"><Users size={15} /> {guestCount} Guests</span>
                        <span className="flex items-center gap-1.5"><Moon size={15} /> {pkg.days - 1} Nights</span>
                        <span className="flex items-center gap-1.5"><Sun size={15} /> {pkg.days} Days</span>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start relative">

                {/* ── Left: Itinerary Content ─────────────────────────────── */}
                <div className="lg:col-span-8 space-y-12 print-full">

                    {/* Trip Overview */}
                    {(pkg.description || pkg.overview) && (
                        <section>
                            <h2 className="text-xl font-black text-stone-900 mb-3">Trip Overview</h2>
                            <p className="text-stone-600 leading-relaxed text-sm">{pkg.description || pkg.overview}</p>
                        </section>
                    )}

                    {/* Timeline */}
                    <section>
                        <h2 className="text-xl font-black text-stone-900 mb-6">Your Itinerary</h2>

                        {hasBuilderData ? (
                            <div className="space-y-10">
                                {Array.from({ length: tripDetails.days }).map((_, dIdx) => {
                                    const day = dIdx + 1;
                                    const dayItems = items
                                        .filter((i: any) => i.day === day)
                                        .sort((a: any, b: any) => (a.time || '').localeCompare(b.time || ''));
                                    const meta = dayMeta?.[day];

                                    return (
                                        <div key={day} className={dIdx > 0 ? 'page-break-before' : ''}>
                                            {/* Day header */}
                                            <div className="flex items-center gap-4 mb-5">
                                                <div className="size-11 rounded-2xl bg-stone-900 text-white flex flex-col items-center justify-center shrink-0 shadow-md">
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-stone-400">Day</span>
                                                    <span className="text-base font-black leading-none">{day}</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-stone-900">
                                                        {meta?.title || dayItems.find((i: any) => i.type === 'activity')?.title || (day === 1 ? 'Arrival & Check-in' : `Day ${day} Exploration`)}
                                                    </h3>
                                                    {dayItems.length > 0 && (
                                                        <p className="text-stone-400 text-xs mt-0.5">{dayItems.length} activit{dayItems.length === 1 ? 'y' : 'ies'} planned</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Day Banner */}
                                            {meta?.image && (
                                                <div className="w-full h-44 rounded-2xl overflow-hidden mb-5 ml-0">
                                                    <img src={meta.image} alt={`Day ${day}`} className="w-full h-full object-cover" />
                                                </div>
                                            )}

                                            {/* Activity Cards */}
                                            <div className="pl-3 border-l-2 border-stone-200 space-y-3">
                                                {dayItems.map((item: any) => {
                                                    const isHotel = item.type === 'hotel';
                                                    const isFlight = item.type === 'flight';
                                                    const cardStyle = isHotel
                                                        ? 'bg-rose-50 border-rose-100'
                                                        : isFlight
                                                            ? 'bg-sky-50 border-sky-100'
                                                            : 'bg-white border-stone-200';
                                                    const accentStyle = isHotel ? 'bg-rose-500' : isFlight ? 'bg-sky-500' : 'bg-amber-400';
                                                    const typeStyle = isHotel
                                                        ? 'text-rose-600 bg-rose-100'
                                                        : isFlight
                                                            ? 'text-sky-600 bg-sky-100'
                                                            : 'text-stone-600 bg-stone-100';

                                                    return (
                                                        <div key={item.id} className={`p-4 rounded-2xl border relative overflow-hidden shadow-sm ${cardStyle}`}>
                                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentStyle}`} />
                                                            <div className="flex items-start gap-3 pl-2">
                                                                <div className="flex-1">
                                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${typeStyle}`}>
                                                                            {item.type}
                                                                        </span>
                                                                        {item.time && (
                                                                            <span className="flex items-center gap-1 text-xs text-stone-400 font-semibold">
                                                                                <Clock size={11} /> {item.time}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <h4 className="font-bold text-stone-900 text-sm mb-0.5">{item.title}</h4>
                                                                    {item.description && (
                                                                        <p className="text-xs text-stone-500 leading-relaxed">{item.description}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {dayItems.length === 0 && (
                                                    <div className="py-4 px-5 rounded-2xl border border-dashed border-stone-200 bg-stone-50 text-stone-400 text-xs font-bold text-center">
                                                        Free day at leisure
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {pkg.itinerary?.map((day: any, i: number) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="w-10 shrink-0 text-center font-black text-amber-600 text-lg pt-0.5">{day.day}</div>
                                        <div>
                                            <h3 className="font-bold text-base text-stone-900 mb-1">{day.title}</h3>
                                            <p className="text-stone-500 text-sm whitespace-pre-wrap">{day.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Inclusions / Exclusions */}
                    <section>
                        <h2 className="text-xl font-black text-stone-900 mb-5">What's Included?</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5">
                                <h3 className="text-emerald-800 font-black flex items-center gap-2 mb-3 text-sm"><ShieldCheck size={16} /> Included</h3>
                                <ul className="space-y-2 text-emerald-900/80 text-xs font-medium">
                                    {(pkg.included || []).map((inc, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <Check size={12} className="mt-0.5 shrink-0 text-emerald-600" /> {inc}
                                        </li>
                                    ))}
                                    {(!pkg.included || pkg.included.length === 0) && <li className="text-emerald-600/60 italic">No specific inclusions listed.</li>}
                                </ul>
                            </div>
                            <div className="bg-rose-50 border border-rose-100 rounded-3xl p-5">
                                <h3 className="text-rose-800 font-black flex items-center gap-2 mb-3 text-sm"><X size={14} /> Not Included</h3>
                                <ul className="space-y-2 text-rose-900/80 text-xs font-medium">
                                    {(pkg.notIncluded || []).map((exc, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="mt-0.5 shrink-0 text-rose-500 font-black text-xs">×</span> {exc}
                                        </li>
                                    ))}
                                    {(!pkg.notIncluded || pkg.notIncluded.length === 0) && <li className="text-rose-600/60 italic">No specific exclusions listed.</li>}
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Terms note */}
                    <section className="bg-stone-100 rounded-2xl px-5 py-4">
                        <p className="text-stone-500 text-xs leading-relaxed">
                            <span className="font-black text-stone-700">Terms & Validity: </span>
                            This proposal is valid for 7 days from the date of sharing. Prices are subject to availability at the time of booking. By accepting this proposal, you agree to our standard booking and cancellation policy.
                        </p>
                    </section>
                </div>

                {/* ── Right: Sticky Sidebar ────────────────────────────────── */}
                <div className="lg:col-span-4 relative z-10 no-print">
                    <div className="sticky top-6 bg-white rounded-3xl shadow-2xl border border-stone-100 p-7 space-y-6">

                        {/* Price */}
                        <div className="text-center pb-5 border-b border-stone-100">
                            <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-2">Total Package Cost</p>
                            <div className="text-4xl font-black text-stone-900 flex items-center justify-center">
                                {currencySymbol === '₹' ? formatPrice(finalPrice) : `${currencySymbol}${finalPrice.toLocaleString('en-US')}`}
                            </div>
                            <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 inline-block px-2 py-0.5 rounded border border-emerald-100 mt-2">
                                All inclusive
                            </p>
                        </div>

                        {/* Snapshot */}
                        <div className="space-y-2">
                            <h4 className="text-[9px] font-black uppercase tracking-widest text-stone-500">Snapshot</h4>
                            {[
                                { label: 'Duration', value: `${pkg.days} Days / ${pkg.days - 1} Nights` },
                                { label: 'Guests', value: `${guestCount} person${guestCount > 1 ? 's' : ''}` },
                                { label: 'Destinations', value: `${tripDetails?.destinations?.length || 1} location${(tripDetails?.destinations?.length || 1) > 1 ? 's' : ''}` },
                            ].map(row => (
                                <div key={row.label} className="flex items-center justify-between text-xs text-stone-500 py-1 border-b border-stone-50">
                                    <span>{row.label}</span>
                                    <span className="font-bold text-stone-800">{row.value}</span>
                                </div>
                            ))}
                        </div>

                        {/* CTA Buttons */}
                        {isApproved ? (
                            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center">
                                <CheckCircle2 size={28} className="text-emerald-500 mx-auto mb-2" />
                                <p className="text-emerald-800 font-black text-sm">Proposal Accepted</p>
                                <p className="text-emerald-600 text-xs mt-1">Our team will be in touch shortly.</p>
                            </div>
                        ) : isChangesRequested ? (
                            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-center">
                                <MessageSquare size={28} className="text-amber-500 mx-auto mb-2" />
                                <p className="text-amber-800 font-black text-sm">Changes Requested</p>
                                <p className="text-amber-600 text-xs mt-1">We've received your feedback and will revise the proposal.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <button
                                    onClick={handleAccept}
                                    className="w-full bg-stone-900 hover:bg-stone-800 text-white font-black text-sm py-4 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Ticket size={17} /> Accept & Proceed
                                </button>
                                <button
                                    onClick={() => setShowFeedbackModal(true)}
                                    className="w-full bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 font-bold text-sm py-3.5 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <MessageSquare size={15} /> Request Changes
                                </button>
                            </div>
                        )}

                        {/* Active Promotional Deals */}
                        {displayedCoupons.length > 0 && (
                            <div className="space-y-3 pt-4 border-t border-stone-100">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-500 flex items-center gap-1.5">
                                    <Ticket size={12} className="text-[#FF6A00]" /> Active Promotional Deals
                                </h4>
                                <div className="space-y-3">
                                    {displayedCoupons.map((coupon) => (
                                        <div
                                            key={coupon.id}
                                            className="relative w-full h-[100px] flex rounded-2xl overflow-hidden border border-stone-200/80 shadow-md bg-stone-50 font-sans cursor-pointer group hover:shadow-lg transition-all"
                                            onClick={() => handleCopyCoupon(coupon.code)}
                                        >
                                            {/* Circle tear-off notches */}
                                            <div className="absolute -top-[8px] left-[70%] w-[16px] h-[16px] rounded-full bg-white border-b border-stone-200/80 z-20" />
                                            <div className="absolute -bottom-[8px] left-[70%] w-[16px] h-[16px] rounded-full bg-white border-t border-stone-200/80 z-20" />

                                            {/* Dotted separator line */}
                                            <div className="absolute top-0 bottom-0 left-[70%] flex flex-col justify-between py-2 pointer-events-none z-20 -translate-x-0.5">
                                                {Array.from({ length: 7 }).map((_, i) => (
                                                    <div key={i} className="w-1 h-1 rounded-full bg-stone-300" />
                                                ))}
                                            </div>

                                            {/* Left Side: Details & Title */}
                                            <div className="w-[70%] h-full p-3 flex flex-col justify-between relative overflow-hidden select-none">
                                                {coupon.type === 'ToursOnly' ? (
                                                    <>
                                                        <div className="absolute inset-0 bg-gradient-to-r from-teal-50/70 to-emerald-50/30 -z-10" />
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[9px] font-black text-teal-700 tracking-wider uppercase bg-teal-100/60 px-1.5 py-0.5 rounded">Tours Pass</span>
                                                            </div>
                                                            <p className="text-[11px] font-bold text-stone-700 mt-1.5 leading-tight">
                                                                Exclusive discount on standard tour packages
                                                            </p>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="absolute inset-0 bg-gradient-to-r from-amber-50/70 to-orange-50/30 -z-10" />
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[9px] font-black text-amber-700 tracking-wider uppercase bg-amber-100/60 px-1.5 py-0.5 rounded">Multi-Category</span>
                                                            </div>
                                                            <p className="text-[11px] font-bold text-stone-700 mt-1.5 leading-tight">
                                                                Save on taxi, trains, flights & packages
                                                            </p>
                                                        </div>
                                                    </>
                                                )}

                                                <div className="flex items-center gap-1 text-[8.5px] font-semibold text-stone-400">
                                                    <Clock size={10} />
                                                    <span>Ends: {coupon.validTo ? new Date(coupon.validTo).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '31 Dec 2026'}</span>
                                                </div>
                                            </div>

                                            {/* Right Side: Promo Code & Discount */}
                                            <div className="w-[30%] h-full bg-[#03231D] relative p-2.5 flex flex-col justify-between items-center text-center text-white">
                                                {/* Micro Dots overlay */}
                                                <div className="absolute inset-0 bg-[radial-gradient(#ffffff_0.5px,transparent_0.5px)] [background-size:6px_6px] opacity-5 pointer-events-none" />
                                                
                                                <div className="flex flex-col items-center">
                                                    <div className="flex items-baseline leading-none select-none">
                                                        <span className="text-xl font-black text-white">{coupon.discountValue}</span>
                                                        <span className="text-[10px] font-black text-orange-400 ml-0.5">{coupon.discountType === 'Percentage' ? '%' : '₹'}</span>
                                                    </div>
                                                    <span className="text-[7px] font-black text-white/60 tracking-wider uppercase mt-0.5">OFF</span>
                                                </div>

                                                {/* Promo Code Box */}
                                                <div className="w-full bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg py-1 px-0.5 transition-all duration-200 relative flex items-center justify-center">
                                                    <span className="font-mono text-[9px] font-black text-amber-300 tracking-wider uppercase truncate">
                                                        {coupon.code}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Print button */}
                        <button
                            onClick={() => window.print()}
                            className="w-full flex items-center justify-center gap-2 text-xs font-bold text-stone-400 hover:text-stone-600 transition-colors py-1 pt-2 border-t border-stone-100"
                        >
                            <Printer size={13} /> Download as PDF
                        </button>
                    </div>
                </div>

            </div>

            {/* Secured Payments */}
            <div className="max-w-5xl mx-auto px-6 pt-6 pb-2 border-t border-stone-200 mt-8">
                <PaymentLogos />
            </div>

            {/* Footer */}
            <footer className="max-w-5xl mx-auto px-6 pb-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-400 font-medium border-t border-stone-200 pt-8 mt-4">
                <span>© {new Date().getFullYear()} SHRAWELLO Travel Hub. All rights reserved.</span>
                <span className="text-center">This is an exclusive proposal. Not for public distribution.</span>
            </footer>
        </div>
    );
};
