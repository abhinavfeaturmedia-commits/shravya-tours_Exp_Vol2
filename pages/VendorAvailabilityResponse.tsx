import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../src/lib/api';
import { PublicAvailabilityRfq, RfqPriceBasis } from '../types';
import { 
    CheckCircle2, XCircle, AlertCircle, Send, Clock, Loader2, 
    Building2, Calendar, Users, Bed, Utensils, ShieldCheck, 
    Pencil, Copy, Check, MessageCircle, Phone, Mail, 
    Sparkles, Car, MapPin, Tag, ChevronDown, CheckCheck
} from 'lucide-react';

const BASES: { key: RfqPriceBasis; label: string; desc: string }[] = [
    { key: 'Total', label: 'Total Stay / Booking', desc: 'Lump-sum for entire requirement' },
    { key: 'Per Night', label: 'Per Night', desc: 'Room rate per night' },
    { key: 'Per Day', label: 'Per Day', desc: 'Vehicle / service per day' },
    { key: 'Per Person', label: 'Per Person', desc: 'Rate per head' }
];

export const VendorAvailabilityResponse: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [rfq, setRfq] = useState<PublicAvailabilityRfq | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [choice, setChoice] = useState<'Available' | 'Not Available' | null>(null);
    const [price, setPrice] = useState('');
    const [basis, setBasis] = useState<RfqPriceBasis>('Total');
    const [remark, setRemark] = useState('');
    const [name, setName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [formError, setFormError] = useState('');
    const [copiedRef, setCopiedRef] = useState(false);

    useEffect(() => {
        if (!token) { 
            setError('Invalid access link. No token provided.'); 
            setLoading(false); 
            return; 
        }
        api.getPublicAvailabilityRfq(token)
            .then(d => {
                setRfq(d);
                if (d.status === 'Available' || d.status === 'Not Available') {
                    setChoice(d.status);
                    if (d.quotedPrice) setPrice(String(d.quotedPrice));
                    setBasis(d.priceBasis || 'Total');
                    setRemark(d.vendorRemark || '');
                    setSubmitted(true);
                }
            })
            .catch(e => setError(e.message || 'This verification link is invalid or has expired.'))
            .finally(() => setLoading(false));
    }, [token]);

    const locked = !!rfq && (rfq.closed || rfq.expired);

    // Calculate nights if check-in and check-out exist
    const { checkInVal, checkOutVal, nightsCount } = useMemo(() => {
        if (!rfq?.summaryLines) return { checkInVal: null, checkOutVal: null, nightsCount: null };
        const ci = rfq.summaryLines.find(l => /check-?in|from/i.test(l.label))?.value;
        const co = rfq.summaryLines.find(l => /check-?out|to/i.test(l.label))?.value;
        let nights: number | null = null;
        if (ci && co) {
            const d1 = new Date(ci);
            const d2 = new Date(co);
            if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
                const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
                if (diff > 0) nights = diff;
            }
        }
        return { checkInVal: ci, checkOutVal: co, nightsCount: nights };
    }, [rfq]);

    const copyRef = () => {
        if (!rfq?.bookingRef) return;
        navigator.clipboard.writeText(rfq.bookingRef);
        setCopiedRef(true);
        setTimeout(() => setCopiedRef(false), 2000);
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !choice) return;
        setFormError('');

        if (choice === 'Available') {
            const num = Number(price);
            if (!num || num <= 0 || isNaN(num)) {
                setFormError('Please enter a valid quoted rate.');
                return;
            }
        }

        setSubmitting(true);
        try {
            await api.respondToAvailabilityRfq(token, {
                status: choice,
                quotedPrice: choice === 'Available' ? Number(price) : undefined,
                priceBasis: basis,
                remark: remark.trim() || undefined,
                respondedBy: name.trim() || undefined
            });
            setSubmitted(true);
        } catch (err: any) {
            setFormError(err.message || 'Failed to submit response. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // Service icon resolver
    const serviceBadge = useMemo(() => {
        const type = (rfq?.serviceType || 'Service').toLowerCase();
        if (type.includes('hotel')) return { icon: <Building2 size={15} />, label: 'Hotel Accommodation', color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-300' };
        if (type.includes('transport')) return { icon: <Car size={15} />, label: 'Transport & Cab Transfer', color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-300' };
        if (type.includes('activity')) return { icon: <Sparkles size={15} />, label: 'Sightseeing & Activity', color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-300' };
        return { icon: <MapPin size={15} />, label: `${rfq?.serviceType || 'Tour'} Service`, color: 'from-purple-500/20 to-indigo-500/20 border-purple-500/30 text-purple-300' };
    }, [rfq?.serviceType]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center justify-center p-4">
                <div className="text-center space-y-4">
                    <div className="relative inline-block">
                        <div className="w-16 h-16 rounded-2xl bg-white p-2 shadow-2xl flex items-center justify-center mx-auto ring-4 ring-orange-500/20">
                            <img src="/logo.png" alt="SHRAWELLO" className="w-full h-full object-contain animate-pulse" />
                        </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-slate-300 font-semibold text-sm">
                        <Loader2 className="animate-spin text-orange-500" size={18} />
                        <span>Loading RFQ Procurement Brief...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !rfq) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 text-center backdrop-blur-xl shadow-2xl">
                    <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4 text-rose-400">
                        <AlertCircle size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Request Link Unavailable</h2>
                    <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                        {error || 'This inquiry link is either invalid, expired, or has already been completed.'}
                    </p>
                    <div className="pt-4 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-center gap-1.5">
                        <Phone size={13} /> Questions? Contact operations at <a href="tel:+918010955675" className="text-orange-400 underline font-semibold">+91 80109 55675</a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col justify-between antialiased selection:bg-orange-500 selection:text-white">
            
            {/* Top Navigation Bar with Official Shrawello Logo */}
            <header className="w-full border-b border-white/10 bg-slate-950/70 backdrop-blur-md sticky top-0 z-30">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white p-1.5 shadow-md flex items-center justify-center shrink-0 border border-white/30">
                            <img src="/logo.png" alt="SHRAWELLO Travel Hub" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="font-extrabold tracking-wider text-base text-white">SHRAWELLO</span>
                                <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm">
                                    B2B Portal
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">Travel Hub &amp; Events &bull; Vendor Procurement</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="text-right">
                            <button 
                                onClick={copyRef} 
                                title="Click to copy booking reference"
                                className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-slate-300 hover:bg-white/10 transition-colors">
                                <span>{rfq.bookingRef}</span>
                                {copiedRef ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-slate-400 group-hover:text-white" />}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6">
                
                {/* Partner Welcome & Service Pill */}
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-gradient-to-r shadow-sm uppercase tracking-wide">
                        <span className={`inline-flex items-center gap-1.5 ${serviceBadge.color}`}>
                            {serviceBadge.icon}
                            {serviceBadge.label}
                        </span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                        Hello, {rfq.vendorName}
                    </h1>
                    <p className="text-sm text-slate-300 leading-relaxed">
                        SHRAWELLO has an active customer requirement matching your inventory for reference <strong className="text-orange-300 font-mono">{rfq.bookingRef}</strong>. Please review below and confirm if you can accommodate this tour.
                    </p>
                </div>

                {/* Specification Ticket Voucher */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-white/15 rounded-3xl overflow-hidden shadow-2xl relative">
                    
                    {/* Voucher Top Header */}
                    <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 px-5 sm:px-6 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                            <ShieldCheck size={16} className="text-emerald-400" />
                            Official Procurement Voucher
                        </div>
                        {nightsCount && (
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                                {nightsCount} Night{nightsCount > 1 ? 's' : ''} Stay
                            </span>
                        )}
                    </div>

                    {/* Requirements Breakdown */}
                    <div className="p-5 sm:p-6 space-y-4">
                        
                        {/* Summary Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {rfq.summaryLines.map((line, idx) => {
                                const isDates = /date|check-?in|check-?out|from|to/i.test(line.label);
                                const isGuests = /guest|pax|adult|child/i.test(line.label);
                                const isRooms = /room/i.test(line.label);
                                const isMeal = /meal/i.test(line.label);
                                
                                return (
                                    <div 
                                        key={idx} 
                                        className={`rounded-2xl p-3.5 border transition-all ${
                                            isDates ? 'bg-indigo-950/40 border-indigo-500/30' :
                                            isMeal ? 'bg-amber-950/20 border-amber-500/20' :
                                            'bg-white/[0.03] border-white/10'
                                        }`}>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                                            {isDates && <Calendar size={13} className="text-indigo-400" />}
                                            {isGuests && <Users size={13} className="text-sky-400" />}
                                            {isRooms && <Bed size={13} className="text-amber-400" />}
                                            {isMeal && <Utensils size={13} className="text-orange-400" />}
                                            <span>{line.label}</span>
                                        </div>
                                        <div className="text-sm font-bold text-white tracking-wide">
                                            {line.value}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Special Instructions / Notes */}
                        {rfq.notes && (
                            <div className="bg-amber-950/30 border-l-4 border-amber-500 rounded-r-2xl p-4 text-xs sm:text-sm text-amber-200/90 leading-relaxed">
                                <p className="font-extrabold text-[11px] uppercase tracking-wider text-amber-400 mb-1 flex items-center gap-1.5">
                                    <Sparkles size={13} /> Specific Client Requests / Inclusions:
                                </p>
                                <p className="whitespace-pre-wrap">{rfq.notes}</p>
                            </div>
                        )}

                        {/* Expiry Pill */}
                        {rfq.expiresAt && !locked && (
                            <div className="flex items-center gap-1.5 text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl">
                                <Clock size={14} className="shrink-0 text-amber-400" />
                                <span>Please submit your quote before <strong>{new Date(rfq.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Interactive Decision Form */}
                {locked ? (
                    <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-8 text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                            <Clock size={24} />
                        </div>
                        <h2 className="text-lg font-bold text-white">{rfq.closed ? 'Procurement Closed' : 'Inquiry Expired'}</h2>
                        <p className="text-sm text-slate-400 max-w-md mx-auto">
                            This quote request has concluded. If you have questions or late availability, please contact our vendor operations team directly.
                        </p>
                    </div>
                ) : submitted ? (
                    <div className="rounded-3xl bg-gradient-to-b from-slate-900 to-indigo-950/80 border border-emerald-500/30 p-8 text-center space-y-4 shadow-2xl relative overflow-hidden">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/20">
                            <CheckCheck size={36} />
                        </div>
                        
                        <div>
                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                Response Verified
                            </span>
                            <h2 className="text-2xl font-black text-white mt-2">Thank you, {rfq.vendorName}!</h2>
                            <p className="text-sm text-slate-300 mt-1">
                                Your response has been transmitted to our reservations desk for booking reference <strong>{rfq.bookingRef}</strong>.
                            </p>
                        </div>

                        {/* Submitted Summary Pill */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 max-w-sm mx-auto text-sm space-y-1">
                            <div className="flex justify-between text-slate-400 text-xs">
                                <span>Availability Status</span>
                                <span className={choice === 'Available' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{choice}</span>
                            </div>
                            {choice === 'Available' && (
                                <div className="flex justify-between text-xs pt-1 border-t border-white/5">
                                    <span className="text-slate-400">Quoted Rate</span>
                                    <span className="text-white font-extrabold text-base">₹{Number(price).toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-400">({basis})</span></span>
                                </div>
                            )}
                            {remark && (
                                <div className="text-left pt-2 text-xs text-slate-300 italic border-t border-white/5">
                                    &ldquo;{remark}&rdquo;
                                </div>
                            )}
                        </div>

                        <div className="pt-2">
                            <button 
                                onClick={() => setSubmitted(false)} 
                                className="inline-flex items-center gap-2 text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors py-2 px-4 rounded-xl hover:bg-white/5">
                                <Pencil size={14} /> Need to edit or adjust your quote? Click here
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={submit} className="bg-slate-900/80 backdrop-blur-xl border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5">
                        
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                Step 1: Select Your Availability Status *
                            </label>
                            
                            {/* Two Large Tactile Buttons */}
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <button 
                                    type="button" 
                                    onClick={() => setChoice('Available')}
                                    className={`relative rounded-2xl p-4 sm:p-5 font-bold flex flex-col items-center justify-center gap-2 border-2 transition-all duration-200 active:scale-[0.98] ${
                                        choice === 'Available' 
                                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400/20' 
                                            : 'bg-white/[0.02] border-white/10 text-slate-300 hover:bg-white/[0.05] hover:border-white/20'
                                    }`}>
                                    <CheckCircle2 size={28} className={choice === 'Available' ? 'text-emerald-400' : 'text-slate-400'} />
                                    <span className="text-base sm:text-lg tracking-tight">Yes, Available</span>
                                    <span className="text-[11px] font-normal text-slate-400 hidden sm:block">Inventory ready to reserve</span>
                                </button>

                                <button 
                                    type="button" 
                                    onClick={() => setChoice('Not Available')}
                                    className={`relative rounded-2xl p-4 sm:p-5 font-bold flex flex-col items-center justify-center gap-2 border-2 transition-all duration-200 active:scale-[0.98] ${
                                        choice === 'Not Available' 
                                            ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-lg shadow-rose-500/20 ring-2 ring-rose-400/20' 
                                            : 'bg-white/[0.02] border-white/10 text-slate-300 hover:bg-white/[0.05] hover:border-white/20'
                                    }`}>
                                    <XCircle size={28} className={choice === 'Not Available' ? 'text-rose-400' : 'text-slate-400'} />
                                    <span className="text-base sm:text-lg tracking-tight">Not Available</span>
                                    <span className="text-[11px] font-normal text-slate-400 hidden sm:block">Sold out or unavailable</span>
                                </button>
                            </div>
                        </div>

                        {/* Available Details Drawer */}
                        {choice === 'Available' && (
                            <div className="space-y-4 pt-2 border-t border-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-bold uppercase tracking-wider text-orange-300 flex items-center gap-1.5">
                                            <Tag size={13} /> Your Quoted Rate (INR ₹) *
                                        </label>
                                        <span className="text-[11px] text-slate-400">Best competitive partner rate</span>
                                    </div>
                                    
                                    <div className="flex flex-col sm:flex-row gap-2.5">
                                        <div className="relative flex-1">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg select-none">₹</span>
                                            <input 
                                                type="number" 
                                                inputMode="decimal"
                                                min="1" 
                                                value={price} 
                                                onChange={e => setPrice(e.target.value)} 
                                                placeholder="e.g. 24000"
                                                className="w-full rounded-2xl bg-white/10 border border-white/15 pl-8 pr-3 py-3 text-lg font-bold text-white outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all placeholder:text-slate-500" 
                                                autoFocus
                                            />
                                        </div>

                                        {/* Price Basis Select */}
                                        <div className="relative sm:w-48">
                                            <select 
                                                value={basis} 
                                                onChange={e => setBasis(e.target.value as RfqPriceBasis)}
                                                className="w-full h-full rounded-2xl bg-slate-800 border border-white/15 px-3 py-3 text-sm font-semibold text-white outline-none focus:border-orange-400 appearance-none pr-8 cursor-pointer">
                                                {BASES.map(b => (
                                                    <option key={b.key} value={b.key} className="bg-slate-900 text-white">
                                                        {b.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Basis: <strong>{BASES.find(b => b.key === basis)?.desc}</strong>
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Optional Remarks and Responder Info */}
                        {choice && (
                            <div className="space-y-3.5 pt-2 border-t border-white/10 animate-in fade-in duration-200">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                                        Remarks / Inclusions / Conditions (Optional)
                                    </label>
                                    <textarea 
                                        value={remark} 
                                        onChange={e => setRemark(e.target.value)} 
                                        rows={2} 
                                        maxLength={1000}
                                        placeholder={choice === 'Available' ? 'e.g. GST 12% included, CP meal plan, deluxe category with balcony...' : 'e.g. Sold out for 18-20 Oct, but available starting 21 Oct...'}
                                        className="w-full rounded-2xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-white outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 resize-none transition-all placeholder:text-slate-500" 
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                                        Your Name &amp; Designation (Optional)
                                    </label>
                                    <input 
                                        value={name} 
                                        onChange={e => setName(e.target.value)}
                                        placeholder="e.g. Rajesh Sharma - Reservations Manager"
                                        className="w-full rounded-2xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-white outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all placeholder:text-slate-500" 
                                    />
                                </div>
                            </div>
                        )}

                        {formError && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                                <AlertCircle size={15} className="shrink-0" />
                                <span>{formError}</span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="pt-2">
                            <button 
                                type="submit" 
                                disabled={!choice || submitting}
                                className={`w-full rounded-2xl py-3.5 sm:py-4 font-bold text-base flex items-center justify-center gap-2 transition-all shadow-xl active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed ${
                                    choice === 'Available' 
                                        ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:brightness-110 text-white shadow-orange-500/30' 
                                        : choice === 'Not Available'
                                        ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:brightness-110 text-white shadow-rose-600/30'
                                        : 'bg-white/10 text-slate-400 border border-white/10'
                                }`}>
                                {submitting ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span>Transmitting Response...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send size={18} />
                                        <span>
                                            {choice === 'Available' ? 'Submit Quote & Confirm Availability' : choice === 'Not Available' ? 'Submit As Not Available' : 'Select Availability Above'}
                                        </span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </main>

            {/* Official Footer */}
            <footer className="w-full border-t border-white/10 bg-slate-950/80 py-6 text-center text-xs text-slate-400 space-y-2">
                <div className="max-w-2xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-slate-300 font-semibold">
                        <img src="/logo.png" alt="Shrawello" className="h-5 w-auto" />
                        <span>SHRAWELLO Travel Hub &amp; Events LLP</span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-slate-400">
                        <a href="tel:+918010955675" className="hover:text-orange-400 transition-colors flex items-center gap-1">
                            <Phone size={12} /> +91 80109 55675
                        </a>
                        <a href="mailto:hello@shrawello.com" className="hover:text-orange-400 transition-colors flex items-center gap-1">
                            <Mail size={12} /> hello@shrawello.com
                        </a>
                    </div>
                </div>
                <p className="text-[10px] text-slate-400">
                    This is an automated procurement portal link. No login required. Retain for partner operations.
                </p>
            </footer>
        </div>
    );
};

export default VendorAvailabilityResponse;
