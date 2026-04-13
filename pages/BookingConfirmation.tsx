import React, { useState, useEffect } from 'react';
import { Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { SEO } from '../components/ui/SEO';
import { SuggestPopup, isDismissed, isSnoozed } from '../components/ui/SuggestPopup';

interface BookingConfirmationState {
    referenceId: string;
    customerName: string;
    packageTitle: string;
    date: string;
    guests: string;
    email: string;
    phone: string;
    estimatedTotal: number;
}

export const BookingConfirmation: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state as BookingConfirmationState | null;

    // Cross-sell popup: show after 4 seconds
    const [showCrossSell, setShowCrossSell] = useState(false);
    useEffect(() => {
        if (!state) return;
        const t = setTimeout(() => setShowCrossSell(true), 4000);
        return () => clearTimeout(t);
    }, []);

    // If user navigates directly without booking, redirect to home
    if (!state) {
        return <Navigate to="/" replace />;
    }

    const { referenceId, customerName, packageTitle, date, guests, email, phone, estimatedTotal } = state;

    return (
        <>
            <SEO
                title="Booking Confirmed"
                description="Your travel inquiry has been successfully submitted"
            />

            <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 pt-20 pb-12 px-4">
                <div className="max-w-2xl mx-auto">

                    {/* Success Animation */}
                    <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-2xl shadow-green-500/30 mb-6 animate-bounce">
                            <span className="material-symbols-outlined text-5xl text-white">check</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-3">
                            Inquiry Submitted! 🎉
                        </h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                            Thank you, <strong className="text-slate-900 dark:text-white">{customerName.split(' ')[0]}</strong>! Our travel expert will contact you within 24 hours.
                        </p>
                    </div>

                    {/* Reference Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">

                        {/* Reference Header */}
                        <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1">Reference Number</p>
                                    <p className="text-2xl font-black text-white tracking-wide">{referenceId}</p>
                                </div>
                                <div className="bg-white/20 backdrop-blur-md rounded-xl p-3">
                                    <span className="material-symbols-outlined text-white text-3xl">confirmation_number</span>
                                </div>
                            </div>
                        </div>

                        {/* Booking Details */}
                        <div className="p-6 space-y-4">
                            <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
                                <div className="size-12 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-white">luggage</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Package</p>
                                    <p className="font-bold text-slate-900 dark:text-white text-lg truncate">{packageTitle}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">calendar_today</span> Travel Date
                                    </p>
                                    <p className="font-bold text-slate-900 dark:text-white">
                                        {new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">group</span> Travelers
                                    </p>
                                    <p className="font-bold text-slate-900 dark:text-white">{guests}</p>
                                </div>
                            </div>

                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl">
                                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-1">Estimated Quote</p>
                                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                                    ₹{estimatedTotal.toLocaleString('en-IN')}
                                </p>
                                <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">*Final pricing will be confirmed by our expert</p>
                            </div>
                        </div>

                        {/* Contact Details */}
                        <div className="px-6 pb-6">
                            <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">We'll Contact You At</p>
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-slate-400">mail</span>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{email}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-slate-400">phone</span>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{phone}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* What's Next */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">timeline</span>
                            What Happens Next?
                        </h3>
                        <div className="space-y-4">
                            {[
                                { icon: 'call', title: 'Expert Call', desc: 'Our travel advisor will call you within 24 hours to discuss your trip.' },
                                { icon: 'description', title: 'Custom Itinerary', desc: 'We\'ll create a personalized itinerary based on your preferences.' },
                                { icon: 'published_with_changes', title: 'Confirm & Pay', desc: 'Once approved, make a secure payment to confirm your booking.' }
                            ].map((step, i) => (
                                <div key={i} className="flex items-start gap-4">
                                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <span className="text-primary font-black text-sm">{i + 1}</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white text-sm">{step.title}</p>
                                        <p className="text-sm text-slate-500">{step.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500">
                        <Link
                            to="/"
                            className="flex-1 flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
                        >
                            <span className="material-symbols-outlined">home</span>
                            Back to Home
                        </Link>
                        <Link
                            to="/packages"
                            className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-700 font-bold py-4 px-6 rounded-2xl hover:border-primary hover:text-primary transition-all active:scale-[0.98]"
                        >
                            <span className="material-symbols-outlined">explore</span>
                            Explore More Packages
                        </Link>
                    </div>

                    {/* Help Note */}
                    <p className="text-center text-sm text-slate-500 mt-8">
                        Have questions? Call us at <a href="tel:+919876543210" className="font-bold text-primary hover:underline">+91 98765 43210</a> or email <a href="mailto:info@shravyatours.com" className="font-bold text-primary hover:underline">info@shravyatours.com</a>
                    </p>

                </div>
            </div>

            {/* ── Cross-Sell Float ── */}
            {showCrossSell && (
                <SuggestPopup
                    id={`post-booking-crosssell-${referenceId}`}
                    variant="float"
                    icon="travel_explore"
                    color="purple"
                    title="While you wait — explore more destinations!"
                    description="Customers who booked this trip also loved our Coorg and Ooty packages."
                    primaryAction={{
                        label: 'Explore Packages',
                        icon: 'map',
                        onClick: () => navigate('/packages')
                    }}
                    secondaryAction={{
                        label: 'No thanks',
                        onClick: () => setShowCrossSell(false)
                    }}
                    onDismiss={() => setShowCrossSell(false)}
                />
            )}
        </>
    );
};

