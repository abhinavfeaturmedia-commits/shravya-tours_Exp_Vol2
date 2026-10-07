import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../src/lib/api';
import { HotelAvailabilityRequest, HotelAvailabilityStatus } from '../types';
import { 
    Building2, Calendar, Bed, Utensils, Users, CheckCircle2, 
    XCircle, AlertCircle, Send, Check, ShieldCheck, MapPin, 
    Info, Phone, Mail, Clock
} from 'lucide-react';

export const HotelAvailabilityResponse: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [request, setRequest] = useState<HotelAvailabilityRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Form inputs
    const [selectedStatus, setSelectedStatus] = useState<HotelAvailabilityStatus>('Available');
    const [respondedBy, setRespondedBy] = useState('');
    const [hotelNotes, setHotelNotes] = useState('');
    const [offeredAlternative, setOfferedAlternative] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        if (!token) {
            setError("Invalid verification link. No token provided.");
            setLoading(false);
            return;
        }

        const fetchDetails = async () => {
            try {
                setLoading(true);
                const data = await api.getPublicHotelAvailability(token);
                if (data) {
                    setRequest(data);
                    if (data.status && data.status !== 'Pending') {
                        setSelectedStatus(data.status);
                    }
                    if (data.respondedBy) setRespondedBy(data.respondedBy);
                    if (data.hotelNotes) setHotelNotes(data.hotelNotes);
                    if (data.offeredAlternative) setOfferedAlternative(data.offeredAlternative);
                } else {
                    setError("Availability request details could not be found.");
                }
            } catch (err: any) {
                console.error("Failed to load request:", err);
                setError(err.message || "Unable to fetch availability request. The link may have expired.");
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        if (!respondedBy.trim()) {
            alert("Please enter your name or reservation desk name.");
            return;
        }

        setSubmitting(true);
        try {
            await api.respondToHotelAvailability(token, {
                status: selectedStatus,
                hotelNotes: hotelNotes.trim(),
                offeredAlternative: offeredAlternative.trim(),
                respondedBy: respondedBy.trim()
            });
            setSubmitted(true);
        } catch (err: any) {
            alert(err.message || "Failed to submit response. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const calculateNights = (inDate?: string, outDate?: string) => {
        if (!inDate || !outDate) return 1;
        const diff = new Date(outDate).getTime() - new Date(inDate).getTime();
        const nights = Math.ceil(diff / (1000 * 3600 * 24));
        return nights > 0 ? nights : 1;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-300 font-medium tracking-wide">Loading reservation request details...</p>
            </div>
        );
    }

    if (error || !request) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
                <div className="bg-slate-800/90 border border-slate-700 max-w-md w-full p-8 rounded-2xl text-center shadow-2xl">
                    <div className="w-14 h-14 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
                        <AlertCircle size={30} />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Notice</h2>
                    <p className="text-slate-300 text-sm mb-6 leading-relaxed">{error || "This availability verification link is invalid or has expired."}</p>
                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-400">
                        For questions, please contact Shrawello Travel Hub Operations at <strong className="text-indigo-400">+91 80109 55675</strong> or email <strong className="text-indigo-400">shrawello@gmail.com</strong>.
                    </div>
                </div>
            </div>
        );
    }

    const nights = calculateNights(request.checkInDate, request.checkOutDate);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 py-10 px-4 sm:px-6">
            <div className="max-w-3xl mx-auto space-y-6">
                
                {/* Header Branding */}
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 text-center sm:text-left">
                        <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white font-black text-2xl">
                            ST
                        </div>
                        <div>
                            <div className="flex items-center gap-2 justify-center sm:justify-start">
                                <span className="text-xs uppercase tracking-widest font-black text-indigo-400 bg-indigo-950/60 border border-indigo-800/50 px-2 py-0.5 rounded-full">
                                    Supplier Availability Portal
                                </span>
                            </div>
                            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
                                Shrawello Travel Hub & Events LLP
                            </h1>
                            <p className="text-xs text-slate-400">
                                B2B Partner Room Availability Verification
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-semibold">
                        <ShieldCheck size={16} />
                        <span>Direct Supplier Link</span>
                    </div>
                </div>

                {/* Submitted Success Confirmation */}
                {submitted ? (
                    <div className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-8 sm:p-10 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                            <CheckCircle2 size={36} />
                        </div>
                        <h2 className="text-2xl font-black text-white">Thank You! Response Recorded</h2>
                        <p className="text-slate-300 max-w-lg mx-auto text-sm leading-relaxed">
                            Your availability status for <strong className="text-white">{request.hotelName}</strong> has been updated to{' '}
                            <span className={`font-bold px-2 py-0.5 rounded ${
                                selectedStatus === 'Available' ? 'bg-emerald-500/20 text-emerald-400' :
                                selectedStatus === 'Sold Out' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                            }`}>
                                {selectedStatus}
                            </span>.
                        </p>
                        <p className="text-xs text-slate-400">
                            Our reservations and itinerary team has been instantly notified in the CRM.
                        </p>
                        <div className="pt-4">
                            <button
                                onClick={() => setSubmitted(false)}
                                className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium cursor-pointer"
                            >
                                Need to modify your response? Click here to edit.
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Request Details Card */}
                        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
                            
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800 gap-3">
                                <div>
                                    <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
                                        <Building2 size={16} />
                                        <span>Target Property</span>
                                    </div>
                                    <h2 className="text-2xl font-black text-white">{request.hotelName}</h2>
                                    {request.destination && (
                                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                            <MapPin size={12} className="text-slate-500" />
                                            {request.destination}
                                        </p>
                                    )}
                                </div>

                                <div className="text-left sm:text-right bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                                    <span className="text-[11px] text-slate-400 block font-medium">Current Status</span>
                                    <span className={`inline-flex items-center gap-1.5 text-xs font-black uppercase px-2.5 py-1 rounded-full mt-1 ${
                                        request.status === 'Available' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                        request.status === 'Sold Out' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                                        request.status === 'Alternative Offered' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                        'bg-slate-700/50 text-slate-300 border border-slate-600/40'
                                    }`}>
                                        {request.status === 'Available' && <CheckCircle2 size={12} />}
                                        {request.status === 'Sold Out' && <XCircle size={12} />}
                                        {request.status === 'Alternative Offered' && <AlertCircle size={12} />}
                                        {request.status === 'Pending' && <Clock size={12} />}
                                        {request.status || 'Pending Verification'}
                                    </span>
                                </div>
                            </div>

                            {/* Booking Specs Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                                        <Calendar size={14} className="text-indigo-400" />
                                        <span>Check-in Date</span>
                                    </div>
                                    <p className="text-base font-bold text-white">
                                        {request.checkInDate ? new Date(request.checkInDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Flexible'}
                                    </p>
                                </div>

                                <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                                        <Calendar size={14} className="text-indigo-400" />
                                        <span>Check-out Date</span>
                                    </div>
                                    <p className="text-base font-bold text-white">
                                        {request.checkOutDate ? new Date(request.checkOutDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Flexible'}
                                    </p>
                                    <span className="text-[10px] text-indigo-400 font-semibold block mt-0.5">
                                        {nights} {nights === 1 ? 'Night' : 'Nights'}
                                    </span>
                                </div>

                                <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                                        <Bed size={14} className="text-indigo-400" />
                                        <span>Rooms & Category</span>
                                    </div>
                                    <p className="text-base font-bold text-white">
                                        {request.roomCount} × {request.roomCategory || 'Standard Room'}
                                    </p>
                                </div>

                                <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                                        <Utensils size={14} className="text-indigo-400" />
                                        <span>Meal Plan</span>
                                    </div>
                                    <p className="text-base font-bold text-white">
                                        {request.mealPlan || 'CP (Breakfast Included)'}
                                    </p>
                                </div>

                                <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                                        <Users size={14} className="text-indigo-400" />
                                        <span>Occupancy</span>
                                    </div>
                                    <p className="text-base font-bold text-white">
                                        {request.adults} {request.adults === 1 ? 'Adult' : 'Adults'}
                                        {request.children > 0 && ` + ${request.children} Child`}
                                    </p>
                                </div>

                                <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
                                    <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                                        <Info size={14} className="text-indigo-400" />
                                        <span>Guest Ref</span>
                                    </div>
                                    <p className="text-base font-bold text-white truncate">
                                        {request.guestName || 'Confidential Travel Group'}
                                    </p>
                                </div>
                            </div>

                            {/* Agent Notes if any */}
                            {request.agentNotes && (
                                <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-xl p-4 flex items-start gap-3">
                                    <Info size={18} className="text-indigo-400 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-0.5">
                                            Special Request / Note from Travel Agent
                                        </h4>
                                        <p className="text-sm text-slate-300 leading-relaxed">
                                            "{request.agentNotes}"
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Verification Form */}
                            <form onSubmit={handleSubmit} className="pt-6 border-t border-slate-800 space-y-6">
                                <div>
                                    <label className="block text-sm font-black text-white uppercase tracking-wider mb-3">
                                        Step 1: Select Room Availability Status
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        
                                        {/* Available */}
                                        <button
                                            type="button"
                                            onClick={() => setSelectedStatus('Available')}
                                            className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                                                selectedStatus === 'Available'
                                                    ? 'bg-emerald-950/60 border-emerald-500 shadow-lg shadow-emerald-500/10'
                                                    : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                                    <CheckCircle2 size={18} />
                                                </div>
                                                {selectedStatus === 'Available' && (
                                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-500/20" />
                                                )}
                                            </div>
                                            <div className="font-black text-white text-base">Rooms Available</div>
                                            <div className="text-xs text-slate-400 mt-0.5">Rooms confirmed for requested dates</div>
                                        </button>

                                        {/* Sold Out */}
                                        <button
                                            type="button"
                                            onClick={() => setSelectedStatus('Sold Out')}
                                            className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                                                selectedStatus === 'Sold Out'
                                                    ? 'bg-rose-950/60 border-rose-500 shadow-lg shadow-rose-500/10'
                                                    : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                                                    <XCircle size={18} />
                                                </div>
                                                {selectedStatus === 'Sold Out' && (
                                                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400 ring-4 ring-rose-500/20" />
                                                )}
                                            </div>
                                            <div className="font-black text-white text-base">Sold Out</div>
                                            <div className="text-xs text-slate-400 mt-0.5">No rooms available for dates</div>
                                        </button>

                                        {/* Alternative Offered */}
                                        <button
                                            type="button"
                                            onClick={() => setSelectedStatus('Alternative Offered')}
                                            className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                                                selectedStatus === 'Alternative Offered'
                                                    ? 'bg-amber-950/60 border-amber-500 shadow-lg shadow-amber-500/10'
                                                    : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                                                    <AlertCircle size={18} />
                                                </div>
                                                {selectedStatus === 'Alternative Offered' && (
                                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-4 ring-amber-500/20" />
                                                )}
                                            </div>
                                            <div className="font-black text-white text-base">Alternative Option</div>
                                            <div className="text-xs text-slate-400 mt-0.5">Different category or dates available</div>
                                        </button>
                                    </div>
                                </div>

                                {/* Alternative description if chosen */}
                                {selectedStatus === 'Alternative Offered' && (
                                    <div className="space-y-1.5 animate-in fade-in duration-200">
                                        <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider">
                                            Alternative Category or Conditions Offered
                                        </label>
                                        <input
                                            type="text"
                                            value={offeredAlternative}
                                            onChange={(e) => setOfferedAlternative(e.target.value)}
                                            placeholder="e.g. Standard room sold out, but 2 × Premium Suite available at +₹1,200/night"
                                            className="w-full bg-slate-800 border border-amber-500/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        />
                                    </div>
                                )}

                                {/* Hotelier remarks and staff name */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                                            Responded By (Staff Name / Reservation Desk) <span className="text-rose-400">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={respondedBy}
                                            onChange={(e) => setRespondedBy(e.target.value)}
                                            placeholder="e.g. Rahul Sharma (Front Desk)"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                                            Hotel Remarks / Special Notes / Policy
                                        </label>
                                        <input
                                            type="text"
                                            value={hotelNotes}
                                            onChange={(e) => setHotelNotes(e.target.value)}
                                            placeholder="e.g. Free cancellation till 48 hrs before arrival"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>

                                {/* Submit button */}
                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-base"
                                    >
                                        {submitting ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                <span>Submitting Response...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Send size={18} />
                                                <span>Confirm & Update Tour Operations</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Footer support strip */}
                        <div className="text-center text-xs text-slate-500 space-y-1 py-4">
                            <p>Shrawello Travel Hub and Events LLP • Registered Travel Operator</p>
                            <p className="flex items-center justify-center gap-4">
                                <span className="flex items-center gap-1"><Phone size={12} /> +91 80109 55675</span>
                                <span className="flex items-center gap-1"><Mail size={12} /> shrawello@gmail.com</span>
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
