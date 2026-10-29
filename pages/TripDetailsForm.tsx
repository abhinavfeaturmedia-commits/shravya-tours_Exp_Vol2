import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../src/lib/api';
import { COMPANY_PHONE_DISPLAY, COMPANY_WHATSAPP, COMPANY_EMAIL } from '../src/lib/constants';
import { toast } from 'sonner';
import {
    CheckCircle2, AlertCircle, Send, Users, Calendar, MapPin, 
    BedDouble, Car, Utensils, Compass, Plane, Train, Sparkles, 
    Tag, Clock, Phone, MessageCircle, ShieldCheck, HeartHandshake,
    Plus, Trash2, ArrowRight, ArrowLeft, Check, Printer, FileText, ChevronDown, 
    Info, Building, Award, Star, CheckSquare, Edit3, Luggage, Coffee,
    Heart, Baby, Accessibility, Eye, HelpCircle
} from 'lucide-react';

interface PassengerItem {
    name: string;
    dob_or_age: string;
    gender: string;
    aadhar_no: string;
    mobile: string;
    relation: string;
}

export const TripDetailsForm: React.FC = () => {
    const { token } = useParams<{ token: string }>();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

    // Step state: 1 to 5
    const [currentStep, setCurrentStep] = useState<number>(1);

    // Dynamic data from API
    const [coupons, setCoupons] = useState<any[]>([]);
    const [agency, setAgency] = useState<any>(null);

    // ─── Step 1: Primary Contact Details ───
    const [salutation, setSalutation] = useState('Mr.');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [isWhatsappSame, setIsWhatsappSame] = useState(true);
    const [customerEmail, setCustomerEmail] = useState('');
    const [dob, setDob] = useState('');
    const [residentialAddress, setResidentialAddress] = useState('');
    const [officeAddress, setOfficeAddress] = useState('');
    const [showAddressFields, setShowAddressFields] = useState(false);

    // ─── Step 2: Destinations & Travel Dates ───
    const [destination, setDestination] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [paxAdult, setPaxAdult] = useState(2);
    const [paxChild, setPaxChild] = useState(0);
    const [paxInfant, setPaxInfant] = useState(0);
    const [childrenAges, setChildrenAges] = useState('');
    const [roomsCount, setRoomsCount] = useState(1);
    const [roomTypePreference, setRoomTypePreference] = useState('Double Bed');
    const [pickupDropLocation, setPickupDropLocation] = useState('');

    // ─── Step 3: Trip Preferences & Comfort ───
    const [vehiclePreference, setVehiclePreference] = useState('SUV (Innova / Ertiga)');
    const [hotelPreference, setHotelPreference] = useState('3 Star');
    const [mealPlanPreference, setMealPlanPreference] = useState('MAP (Breakfast + Dinner)');
    const [foodPreference, setFoodPreference] = useState('Vegetarian');
    const [sightseeingPace, setSightseeingPace] = useState('Moderate');
    const [transportationMode, setTransportationMode] = useState('Shrawello to recommend best route');
    const [travelBudget, setTravelBudget] = useState('As per standard itinerary');
    const [flightTrainDetails, setFlightTrainDetails] = useState('');

    // ─── Step 4: Co-Travelers & Passenger Details ───
    const [passengers, setPassengers] = useState<PassengerItem[]>([
        { name: '', dob_or_age: '', gender: 'Male', aadhar_no: '', mobile: '', relation: 'Self / Primary' }
    ]);

    // ─── Step 5: Special Requests & Perks ───
    const [specialRequirements, setSpecialRequirements] = useState('');
    const [additionalNotes, setAdditionalNotes] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);

    // Scroll to top of form when step changes
    const stepTopRef = useRef<HTMLDivElement>(null);
    const scrollToStepTop = () => {
        if (stepTopRef.current) {
            stepTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            window.scrollTo({ top: 120, behavior: 'smooth' });
        }
    };

    // Load initial form data via token
    useEffect(() => {
        if (!token) {
            setLoadError('Missing or invalid link. Please contact Shrawello Travel Hub for a valid link.');
            setLoading(false);
            return;
        }

        api.getPublicTripDetailsForm(token)
            .then(res => {
                if (!res || !res.form) {
                    setLoadError('Trip form not found or link has expired.');
                    return;
                }
                const f = res.form;
                setAgency(res.agency);
                setCoupons(res.coupons || []);

                // Pre-populate fields
                if (f.salutation) setSalutation(f.salutation);
                if (f.customer_name) setCustomerName(f.customer_name);
                if (f.customer_phone) setCustomerPhone(f.customer_phone);
                if (f.whatsapp_number) setWhatsappNumber(f.whatsapp_number);
                if (f.is_whatsapp_same !== undefined) setIsWhatsappSame(Boolean(f.is_whatsapp_same));
                if (f.customer_email) setCustomerEmail(f.customer_email);
                if (f.dob) setDob(f.dob);
                if (f.residential_address) {
                    setResidentialAddress(f.residential_address);
                    setShowAddressFields(true);
                }
                if (f.office_address) {
                    setOfficeAddress(f.office_address);
                    setShowAddressFields(true);
                }

                if (f.destination) setDestination(f.destination);
                if (f.start_date) setStartDate(f.start_date.split('T')[0]);
                if (f.end_date) setEndDate(f.end_date.split('T')[0]);
                if (f.pax_adult) setPaxAdult(f.pax_adult);
                if (f.pax_child !== undefined) setPaxChild(f.pax_child);
                if (f.pax_infant !== undefined) setPaxInfant(f.pax_infant);
                if (f.children_ages) setChildrenAges(f.children_ages);
                if (f.rooms_count) setRoomsCount(f.rooms_count);
                if (f.room_type_preference) setRoomTypePreference(f.room_type_preference);

                if (f.pickup_drop_location) setPickupDropLocation(f.pickup_drop_location);
                if (f.travel_budget) setTravelBudget(f.travel_budget);
                if (f.vehicle_preference) setVehiclePreference(f.vehicle_preference);
                if (f.hotel_preference) setHotelPreference(f.hotel_preference);
                if (f.meal_plan_preference) setMealPlanPreference(f.meal_plan_preference);
                if (f.food_preference) setFoodPreference(f.food_preference);
                if (f.special_requirements) setSpecialRequirements(f.special_requirements);
                if (f.sightseeing_pace) setSightseeingPace(f.sightseeing_pace);
                if (f.transportation_mode) setTransportationMode(f.transportation_mode);
                if (f.flight_train_details) setFlightTrainDetails(f.flight_train_details);
                if (f.additional_notes) setAdditionalNotes(f.additional_notes);

                if (f.passengers && Array.isArray(f.passengers) && f.passengers.length > 0) {
                    setPassengers(f.passengers);
                } else if (f.customer_name) {
                    setPassengers([{
                        name: f.customer_name,
                        dob_or_age: f.dob || '',
                        gender: 'Male',
                        aadhar_no: '',
                        mobile: f.customer_phone || '',
                        relation: 'Self / Primary'
                    }]);
                }

                if (f.applied_coupon_code) {
                    setAppliedCoupon({
                        code: f.applied_coupon_code,
                        discount_value: f.coupon_discount_amount || 0
                    });
                }

                if (f.status === 'Submitted') {
                    setSubmitted(true);
                }
            })
            .catch(err => {
                setLoadError(err.message || 'Unable to load trip requirements form.');
            })
            .finally(() => setLoading(false));
    }, [token]);

    // Keep primary passenger synced with Primary Contact name
    useEffect(() => {
        if (customerName && passengers.length > 0 && (!passengers[0].name || passengers[0].relation === 'Self / Primary' || passengers[0].relation === 'Primary')) {
            setPassengers(prev => {
                const next = [...prev];
                next[0] = {
                    ...next[0],
                    name: customerName,
                    mobile: customerPhone || next[0].mobile,
                    relation: 'Self / Primary'
                };
                return next;
            });
        }
    }, [customerName, customerPhone]);

    // Calculate nights & days
    const tripDuration = useMemo(() => {
        if (!startDate || !endDate) return null;
        const s = new Date(startDate);
        const e = new Date(endDate);
        const diffMs = e.getTime() - s.getTime();
        if (diffMs < 0) return null;
        const nights = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        return { nights, days: nights + 1 };
    }, [startDate, endDate]);

    // Personalization helpers
    const firstName = useMemo(() => {
        if (!customerName || !customerName.trim()) return 'Traveler';
        const parts = customerName.trim().split(' ');
        return parts[0];
    }, [customerName]);

    const fullNameGreeting = useMemo(() => {
        if (!customerName || !customerName.trim()) return 'Valued Traveler';
        return `${salutation} ${customerName.trim()}`;
    }, [salutation, customerName]);

    const initials = useMemo(() => {
        if (!customerName || !customerName.trim()) return 'ST';
        const parts = customerName.trim().split(' ').filter(Boolean);
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }, [customerName]);

    // Passenger roster management
    const totalPaxTarget = useMemo(() => {
        return Math.max(1, (Number(paxAdult) || 0) + (Number(paxChild) || 0));
    }, [paxAdult, paxChild]);

    const handleAutoSyncPassengers = () => {
        const targetCount = totalPaxTarget;
        setPassengers(prev => {
            const next = [...prev];
            while (next.length < targetCount) {
                next.push({
                    name: '',
                    dob_or_age: '',
                    gender: 'Male',
                    aadhar_no: '',
                    mobile: '',
                    relation: `Traveler ${next.length + 1}`
                });
            }
            return next;
        });
        toast.success(`Prepared ${targetCount} traveler slots matching your guest count!`);
    };

    const handleAddPassenger = () => {
        setPassengers(prev => [
            ...prev,
            { name: '', dob_or_age: '', gender: 'Male', aadhar_no: '', mobile: '', relation: 'Co-Traveler' }
        ]);
    };

    const handleRemovePassenger = (index: number) => {
        if (passengers.length <= 1) {
            toast.error('At least one traveler (primary guest) is required.');
            return;
        }
        setPassengers(prev => prev.filter((_, i) => i !== index));
    };

    const handlePassengerChange = (index: number, field: keyof PassengerItem, value: string) => {
        setPassengers(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    // Step navigation with validation
    const handleNextStep = () => {
        setFormError(null);

        // Validation for Step 1
        if (currentStep === 1) {
            if (!customerName.trim()) {
                setFormError('Please enter your full name so we can personalize your booking.');
                return;
            }
            if (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 8) {
                setFormError('Please provide a valid contact mobile number for booking confirmations.');
                return;
            }
        }

        // Validation for Step 2
        if (currentStep === 2) {
            if (!destination.trim()) {
                setFormError('Please enter the destination(s) you wish to visit.');
                return;
            }
        }

        if (currentStep < 5) {
            setCurrentStep(prev => prev + 1);
            scrollToStepTop();
        }
    };

    const handlePrevStep = () => {
        setFormError(null);
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
            scrollToStepTop();
        }
    };

    const handleJumpToStep = (targetStep: number) => {
        if (targetStep < currentStep) {
            setCurrentStep(targetStep);
            scrollToStepTop();
            return;
        }
        // If jumping ahead, validate step 1 first
        if (currentStep === 1 && (!customerName.trim() || !customerPhone.trim())) {
            setFormError('Please complete your name and phone number first.');
            return;
        }
        setCurrentStep(targetStep);
        scrollToStepTop();
    };

    // Quick tag toggles for special requirements
    const QUICK_TAGS = [
        { label: 'Wheelchair Assistance', icon: Accessibility },
        { label: 'Infant Car Seat', icon: Baby },
        { label: 'Anniversary / Birthday Cake', icon: Sparkles },
        { label: 'Honeymoon Room Setup', icon: Heart },
        { label: 'Senior Citizen Ground Floor Room', icon: BedDouble },
        { label: 'Non-Smoking Room', icon: CheckSquare },
        { label: 'Scenic View Room (Valley / Pool)', icon: Eye }
    ];

    const toggleQuickTag = (tag: string) => {
        const next = selectedTags.includes(tag)
            ? selectedTags.filter(t => t !== tag)
            : [...selectedTags, tag];
        setSelectedTags(next);
        
        // Append to special requirements text box
        const base = specialRequirements.trim();
        const tagText = next.join(', ');
        if (!base) {
            setSpecialRequirements(tagText);
        } else {
            // Update or append
            const parts = base.split('\n').filter(p => !p.startsWith('Preferences:'));
            setSpecialRequirements([...parts, `Preferences: ${tagText}`].join('\n'));
        }
    };

    // Apply / remove coupon
    const handleApplyCoupon = (c: any) => {
        if (appliedCoupon?.code === c.code) {
            setAppliedCoupon(null);
            toast.info(`Removed offer ${c.code}`);
        } else {
            setAppliedCoupon(c);
            toast.success(`Applied ${c.code} (${c.title || 'Special Perk'})!`);
        }
    };

    // Form submission
    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setFormError(null);

        if (!customerName.trim()) {
            setFormError('Please enter primary contact name.');
            setCurrentStep(1);
            scrollToStepTop();
            return;
        }

        if (!customerPhone.trim()) {
            setFormError('Please enter a valid mobile number.');
            setCurrentStep(1);
            scrollToStepTop();
            return;
        }

        setSubmitting(true);

        const payload = {
            salutation,
            customer_name: customerName,
            customer_phone: customerPhone,
            whatsapp_number: isWhatsappSame ? customerPhone : whatsappNumber,
            is_whatsapp_same: isWhatsappSame,
            customer_email: customerEmail,
            dob,
            residential_address: residentialAddress,
            office_address: officeAddress,
            destination,
            start_date: startDate || null,
            end_date: endDate || null,
            pax_adult: paxAdult,
            pax_child: paxChild,
            pax_infant: paxInfant,
            children_ages: childrenAges,
            rooms_count: roomsCount,
            room_type_preference: roomTypePreference,
            pickup_drop_location: pickupDropLocation,
            travel_budget: travelBudget,
            vehicle_preference: vehiclePreference,
            hotel_preference: hotelPreference,
            meal_plan_preference: mealPlanPreference,
            food_preference: foodPreference,
            special_requirements: specialRequirements,
            sightseeing_pace: sightseeingPace,
            transportation_mode: transportationMode,
            flight_train_details: flightTrainDetails,
            additional_notes: additionalNotes,
            passengers: passengers.filter(p => p.name.trim() !== ''),
            applied_coupon_code: appliedCoupon?.code || null,
            coupon_discount_amount: appliedCoupon?.discount_value || 0
        };

        try {
            await api.submitPublicTripDetailsForm(token!, payload);
            setSubmitted(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: any) {
            setFormError(err.message || 'Failed to submit form. Please check your connection and try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // ────────────────────────────────────────────────────────────
    // STEP METADATA DEFINITIONS
    // ────────────────────────────────────────────────────────────
    const STEPS_NAV = [
        { num: 1, label: 'Personal Info', sub: 'Contact details' },
        { num: 2, label: 'Dates & Guests', sub: 'Travel timing' },
        { num: 3, label: 'Preferences', sub: 'Hotels & vehicles' },
        { num: 4, label: 'Co-Travelers', sub: 'Passenger roster' },
        { num: 5, label: 'Review & Submit', sub: 'Perks & review' }
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 font-sans">
                <div className="w-14 h-14 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-4" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Loading Your Travel Portal...</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Connecting securely to Shrawello Travel Hub</p>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center font-sans">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 flex items-center justify-center mb-4">
                    <AlertCircle size={32} />
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Invalid or Expired Link</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-6">{loadError}</p>
                <a
                    href={`https://wa.me/${COMPANY_WHATSAPP}?text=Hello%20Shrawello%20Travel%20Hub,%20my%20trip%20form%20link%20seems%20invalid.%20Can%20you%20help%20me?`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-md hover:bg-emerald-700 transition-colors"
                >
                    <MessageCircle size={18} />
                    Contact Support on WhatsApp
                </a>
            </div>
        );
    }

    // ────────────────────────────────────────────────────────────
    // POST-SUBMISSION SUCCESS SCREEN
    // ────────────────────────────────────────────────────────────
    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-10 px-4 sm:px-6 font-sans">
                <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-6 sm:p-10 text-center animate-in fade-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <CheckCircle2 size={44} className="stroke-[2.5]" />
                    </div>

                    <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-black uppercase tracking-wider mb-2">
                        Submission Confirmed
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-3">
                        Trip Details Received Successfully!
                    </h1>
                    <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed max-w-lg mx-auto mb-8">
                        Thank you, <strong className="text-slate-900 dark:text-white">{fullNameGreeting}</strong>! Our senior travel planning experts at <strong>Shrawello Travel Hub</strong> have received your requirements and are designing your personalized itinerary.
                    </p>

                    {/* Summary Quick Card */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-5 text-left border border-slate-200/70 dark:border-slate-700/60 mb-8 space-y-3">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Your Trip Snapshot</h4>
                        <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                            <div>
                                <span className="text-slate-400 block text-[11px]">Primary Contact</span>
                                <strong className="text-slate-800 dark:text-slate-200">{fullNameGreeting}</strong>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Destination</span>
                                <strong className="text-slate-800 dark:text-slate-200">{destination || 'Customized Tour'}</strong>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Travel Dates</span>
                                <strong className="text-slate-800 dark:text-slate-200">
                                    {startDate ? new Date(startDate).toLocaleDateString('en-IN') : 'Flexible'}
                                    {endDate ? ` to ${new Date(endDate).toLocaleDateString('en-IN')}` : ''}
                                </strong>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Travelers</span>
                                <strong className="text-slate-800 dark:text-slate-200">
                                    {paxAdult} Adult{paxAdult > 1 ? 's' : ''}
                                    {paxChild > 0 ? `, ${paxChild} Child` : ''}
                                </strong>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Hotel Choice</span>
                                <strong className="text-slate-800 dark:text-slate-200">{hotelPreference}</strong>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Vehicle Type</span>
                                <strong className="text-slate-800 dark:text-slate-200">{vehiclePreference}</strong>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <a
                            href={`https://wa.me/${COMPANY_WHATSAPP}?text=${encodeURIComponent(
                                `Hello Shrawello Travel Hub, I just submitted my trip details for "${destination || 'my upcoming tour'}". My name is ${customerName}. Looking forward to my customized itinerary!`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all hover:scale-[1.02]"
                        >
                            <MessageCircle size={18} />
                            Chat with Travel Concierge on WhatsApp
                        </a>
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm transition-colors"
                        >
                            <Printer size={16} />
                            Print Summary
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ────────────────────────────────────────────────────────────
    // MAIN ONBOARDING WIZARD VIEW
    // ────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans pb-28">
            {/* Top Navigation Branding Header */}
            <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 font-black text-xl flex items-center justify-center shadow-xs">
                            S
                        </div>
                        <div>
                            <span className="text-sm font-black text-slate-900 dark:text-white tracking-wide uppercase flex items-center gap-1.5">
                                Shrawello Travel Hub
                                <CheckCircle2 size={13} className="text-emerald-500 inline" />
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium block">
                                Sacred Pilgrimages • Custom Holidays • Luxury Fleet
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <a
                            href={`https://wa.me/${COMPANY_WHATSAPP}?text=Hello%20Shrawello%20Concierge,%20I%20am%20filling%20out%20my%20trip%20onboarding%20form%20and%20need%20assistance.`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
                        >
                            <MessageCircle size={14} className="text-emerald-600" />
                            <span className="hidden sm:inline">Concierge Support</span>
                        </a>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8" ref={stepTopRef}>
                {/* ─── Hero Section with Deep Personalization ─── */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/90 p-6 sm:p-8 text-white shadow-xl mb-6 border border-slate-800">
                    <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-black uppercase tracking-wider">
                                <Sparkles size={12} className="text-amber-400" />
                                <span>Tailored Traveler Onboarding</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                                Welcome, {fullNameGreeting}! 👋
                            </h1>
                            <p className="text-slate-300 text-xs sm:text-sm max-w-xl leading-relaxed">
                                {destination ? (
                                    <>We are tailoring your personalized journey to <strong className="text-amber-300 font-extrabold">{destination}</strong>. Please confirm your preferences below step by step.</>
                                ) : (
                                    <>We are crafting your custom itinerary. Share your travel timing, preferences, and guests in a few simple steps.</>
                                )}
                            </p>
                        </div>

                        {/* Customer Badge */}
                        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15 self-start sm:self-center shrink-0">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 font-black text-base flex items-center justify-center shadow-md">
                                {initials}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-white flex items-center gap-1">
                                    {customerName || 'Guest Traveler'}
                                    <CheckCircle2 size={12} className="text-emerald-400" />
                                </p>
                                <p className="text-[11px] text-amber-200/90 font-mono">
                                    {customerPhone || 'Direct Inquiry'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── Interactive Multi-Step Progress Bar ─── */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs mb-6">
                    {/* Mobile Progress Summary */}
                    <div className="flex sm:hidden items-center justify-between mb-2 px-1">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="size-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                                {currentStep}
                            </span>
                            {STEPS_NAV[currentStep - 1].label}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">
                            Step {currentStep} of 5 ({currentStep * 20}%)
                        </span>
                    </div>

                    {/* Progress Track Line */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mb-2 sm:mb-4">
                        <div 
                            className="bg-gradient-to-r from-amber-500 to-amber-400 h-full transition-all duration-300 rounded-full"
                            style={{ width: `${(currentStep / 5) * 100}%` }}
                        />
                    </div>

                    {/* Desktop Step Tabs */}
                    <div className="hidden sm:grid grid-cols-5 gap-2">
                        {STEPS_NAV.map((s) => {
                            const isDone = s.num < currentStep;
                            const isCurrent = s.num === currentStep;
                            return (
                                <button
                                    key={s.num}
                                    type="button"
                                    onClick={() => handleJumpToStep(s.num)}
                                    className={`text-left p-2 rounded-xl transition-all border ${
                                        isCurrent
                                            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                                            : isDone
                                                ? 'bg-slate-50 dark:bg-slate-850 border-slate-200/60 dark:border-slate-800 hover:bg-slate-100'
                                                : 'border-transparent opacity-60'
                                    }`}
                                >
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className={`size-5 rounded-full text-[10px] font-black flex items-center justify-center ${
                                            isDone 
                                                ? 'bg-emerald-500 text-white' 
                                                : isCurrent 
                                                    ? 'bg-amber-500 text-white' 
                                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                        }`}>
                                            {isDone ? <Check size={11} className="stroke-[3]" /> : s.num}
                                        </span>
                                        <span className={`text-xs font-black truncate ${isCurrent ? 'text-amber-900 dark:text-amber-200' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {s.label}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 truncate pl-6">
                                        {s.sub}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Form Error Banner */}
                {formError && (
                    <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start gap-3 animate-in fade-in text-rose-800 dark:text-rose-200">
                        <AlertCircle size={18} className="shrink-0 text-rose-600 mt-0.5" />
                        <div className="text-xs font-semibold leading-relaxed">
                            {formError}
                        </div>
                    </div>
                )}

                {/* ─── STEP 1: PRIMARY INFORMATION DETAILS ─── */}
                {currentStep === 1 && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 animate-in fade-in duration-200">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                            <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider block mb-1">
                                Step 1 of 5 • Onboarding Information
                            </span>
                            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                Primary Contact & Booking Confirmation
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Hello {firstName}! Please confirm your contact information for itinerary delivery, hotel check-ins, and ticket confirmations.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div className="sm:col-span-1">
                                <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1.5">
                                    Salutation
                                </label>
                                <select
                                    value={salutation}
                                    onChange={e => setSalutation(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-amber-500"
                                >
                                    <option value="Mr.">Mr.</option>
                                    <option value="Mrs.">Mrs.</option>
                                    <option value="Ms.">Ms.</option>
                                    <option value="Dr.">Dr.</option>
                                    <option value="Prof.">Prof.</option>
                                </select>
                            </div>

                            <div className="sm:col-span-3">
                                <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1.5">
                                    Full Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                    placeholder="Enter your complete legal name"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-amber-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1.5">
                                    Primary Mobile Number <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <Phone size={15} className="absolute left-3.5 top-3 text-slate-400" />
                                    <input
                                        type="tel"
                                        required
                                        value={customerPhone}
                                        onChange={e => setCustomerPhone(e.target.value)}
                                        placeholder="e.g. 9822360000"
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-amber-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1.5">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={customerEmail}
                                    onChange={e => setCustomerEmail(e.target.value)}
                                    placeholder="e.g. name@example.com"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-amber-500"
                                />
                            </div>
                        </div>

                        {/* WhatsApp Number with toggle */}
                        <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={isWhatsappSame}
                                    onChange={e => setIsWhatsappSame(e.target.checked)}
                                    className="size-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                />
                                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                                    WhatsApp number is the same as my primary phone
                                </span>
                            </label>

                            {!isWhatsappSame && (
                                <div className="mt-3 pt-3 border-t border-emerald-100 dark:border-emerald-900/40">
                                    <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
                                        WhatsApp Number
                                    </label>
                                    <div className="relative">
                                        <MessageCircle size={15} className="absolute left-3.5 top-3 text-emerald-600" />
                                        <input
                                            type="tel"
                                            value={whatsappNumber}
                                            onChange={e => setWhatsappNumber(e.target.value)}
                                            placeholder="e.g. 9822360000"
                                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 text-xs font-semibold"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Date of Birth & Address toggle */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1.5">
                                    Date of Birth (Optional)
                                </label>
                                <input
                                    type="date"
                                    value={dob}
                                    onChange={e => setDob(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-amber-500"
                                />
                            </div>

                            <div className="flex items-end">
                                <button
                                    type="button"
                                    onClick={() => setShowAddressFields(!showAddressFields)}
                                    className="w-full py-2.5 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Building size={14} className="text-amber-500" />
                                    <span>{showAddressFields ? 'Hide Address Details' : '+ Add Residential / Office Address'}</span>
                                </button>
                            </div>
                        </div>

                        {showAddressFields && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in">
                                <div>
                                    <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1.5">
                                        Residential Address
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={residentialAddress}
                                        onChange={e => setResidentialAddress(e.target.value)}
                                        placeholder="House / Flat No., Society, City, Pincode"
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-hidden"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1.5">
                                        Office / Company Address
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={officeAddress}
                                        onChange={e => setOfficeAddress(e.target.value)}
                                        placeholder="Company name, office location (optional)"
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-hidden"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── STEP 2: DESTINATIONS & TRAVEL DATES ─── */}
                {currentStep === 2 && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 animate-in fade-in duration-200">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                            <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider block mb-1">
                                Step 2 of 5 • Destinations & Timing
                            </span>
                            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                Where & When Would You Like to Go?
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Tell us about your desired travel locations and schedule so we can optimize sightseeing routes.
                            </p>
                        </div>

                        {/* Preferred Destination */}
                        <div>
                            <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1.5">
                                Preferred Destination(s) <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                                <MapPin size={16} className="absolute left-3.5 top-3 text-amber-500" />
                                <input
                                    type="text"
                                    required
                                    value={destination}
                                    onChange={e => setDestination(e.target.value)}
                                    placeholder="e.g. Kerala (Munnar, Thekkady, Alleppey) OR Varanasi, Ayodhya, Prayagraj"
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-amber-500"
                                />
                            </div>
                            {/* Quick recommendation chips */}
                            <div className="flex items-center gap-1.5 flex-wrap mt-2">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Popular:</span>
                                {['Varanasi, Ayodhya & Prayagraj', 'Kerala Backwaters', 'Himachal & Manali', 'Rajasthan Royal Circuit', 'Goa Beach Holiday'].map(d => (
                                    <button
                                        key={d}
                                        type="button"
                                        onClick={() => setDestination(d)}
                                        className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-amber-100 hover:text-amber-800 transition-colors"
                                    >
                                        + {d}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Travel Dates */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1.5">
                                    Departure Date (Start of Trip)
                                </label>
                                <div className="relative">
                                    <Calendar size={15} className="absolute left-3.5 top-3 text-slate-400" />
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white outline-hidden"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1.5">
                                    Return Date (End of Trip)
                                </label>
                                <div className="relative">
                                    <Calendar size={15} className="absolute left-3.5 top-3 text-slate-400" />
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white outline-hidden"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Live Duration Badge */}
                        {tripDuration && (
                            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-300 animate-in fade-in">
                                <span className="flex items-center gap-2">
                                    <Clock size={16} className="text-amber-600" />
                                    <span>Calculated Duration:</span>
                                </span>
                                <span className="px-3 py-1 rounded-full bg-amber-200/60 dark:bg-amber-800/50 font-black text-amber-950 dark:text-amber-100">
                                    {tripDuration.nights} Nights & {tripDuration.days} Days
                                </span>
                            </div>
                        )}

                        {/* Number of Travellers Counters */}
                        <div>
                            <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-2">
                                Number of Travellers
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {/* Adults */}
                                <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-black text-slate-900 dark:text-white">Adults</p>
                                        <p className="text-[10px] text-slate-400">Age 12+ years</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setPaxAdult(Math.max(1, paxAdult - 1))}
                                            className="size-7 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                                        >
                                            -
                                        </button>
                                        <span className="font-black text-sm text-slate-900 dark:text-white min-w-5 text-center">{paxAdult}</span>
                                        <button
                                            type="button"
                                            onClick={() => setPaxAdult(paxAdult + 1)}
                                            className="size-7 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                {/* Children */}
                                <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-black text-slate-900 dark:text-white">Children</p>
                                        <p className="text-[10px] text-slate-400">Age 5 - 11 years</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setPaxChild(Math.max(0, paxChild - 1))}
                                            className="size-7 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                                        >
                                            -
                                        </button>
                                        <span className="font-black text-sm text-slate-900 dark:text-white min-w-5 text-center">{paxChild}</span>
                                        <button
                                            type="button"
                                            onClick={() => setPaxChild(paxChild + 1)}
                                            className="size-7 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                {/* Infants */}
                                <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-black text-slate-900 dark:text-white">Infants</p>
                                        <p className="text-[10px] text-slate-400">Below 5 years</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setPaxInfant(Math.max(0, paxInfant - 1))}
                                            className="size-7 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                                        >
                                            -
                                        </button>
                                        <span className="font-black text-sm text-slate-900 dark:text-white min-w-5 text-center">{paxInfant}</span>
                                        <button
                                            type="button"
                                            onClick={() => setPaxInfant(paxInfant + 1)}
                                            className="size-7 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {paxChild > 0 && (
                                <div className="mt-3">
                                    <label className="text-[11px] font-bold text-slate-500 block mb-1">
                                        Children Ages (comma separated, e.g. 6, 9)
                                    </label>
                                    <input
                                        type="text"
                                        value={childrenAges}
                                        onChange={e => setChildrenAges(e.target.value)}
                                        placeholder="e.g. 6, 9"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Room & Pickup / Drop */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1.5">
                                    Number of Rooms Required
                                </label>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setRoomsCount(Math.max(1, roomsCount - 1))}
                                        className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-slate-700 dark:text-slate-200"
                                    >
                                        -
                                    </button>
                                    <span className="font-black text-base text-slate-900 dark:text-white min-w-10 text-center">
                                        {roomsCount} {roomsCount === 1 ? 'Room' : 'Rooms'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setRoomsCount(roomsCount + 1)}
                                        className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-slate-700 dark:text-slate-200"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1.5">
                                    Pickup & Drop Location
                                </label>
                                <input
                                    type="text"
                                    value={pickupDropLocation}
                                    onChange={e => setPickupDropLocation(e.target.value)}
                                    placeholder="e.g. Flight from Pune / Mumbai Airport OR Railway Station"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white outline-hidden"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── STEP 3: TRIP PREFERENCES & COMFORT ─── */}
                {currentStep === 3 && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 animate-in fade-in duration-200">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                            <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider block mb-1">
                                Step 3 of 5 • Comfort & Experience
                            </span>
                            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                Hotels, Vehicles & Dining Style
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Customize your stay category, vehicle comfort, and meal options to match your lifestyle.
                            </p>
                        </div>

                        {/* Hotel Preference Visual Selector */}
                        <div>
                            <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-2">
                                Hotel Category Preference
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                {[
                                    { id: '3 Star', label: '3★ Standard', desc: 'Clean, comfortable, prime location' },
                                    { id: '4 Star', label: '4★ Deluxe', desc: 'Premium amenities & fine dining' },
                                    { id: '5 Star', label: '5★ Luxury', desc: 'Top luxury resorts & 5★ hospitality' },
                                    { id: 'Resort / Heritage', label: 'Heritage / Resort', desc: 'Palaces, havelis & boutique stays' }
                                ].map(h => (
                                    <button
                                        key={h.id}
                                        type="button"
                                        onClick={() => setHotelPreference(h.id)}
                                        className={`p-3 rounded-2xl text-left border transition-all ${
                                            hotelPreference === h.id
                                                ? 'bg-amber-500 text-white border-amber-500 shadow-md scale-[1.02]'
                                                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100'
                                        }`}
                                    >
                                        <p className="font-black text-xs">{h.label}</p>
                                        <p className={`text-[10px] mt-0.5 line-clamp-2 ${hotelPreference === h.id ? 'text-amber-100' : 'text-slate-400'}`}>
                                            {h.desc}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Vehicle Preference Visual Selector */}
                        <div>
                            <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-2">
                                Preferred Vehicle Type
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                {[
                                    { id: 'Sedan (Dzire / Etios)', label: 'Sedan', sub: '1-4 Pax', desc: 'Compact & economical' },
                                    { id: 'SUV (Innova / Ertiga)', label: 'SUV (Innova / Ertiga)', sub: '4-6 Pax', desc: 'Spacious & comfortable' },
                                    { id: 'Force Urbania (10/13/17)', label: 'Force Urbania', sub: '8-15 Pax', desc: 'Executive luxury van' },
                                    { id: 'Tempo Traveller (12/17/20)', label: 'Tempo Traveller', sub: '10-20 Pax', desc: 'Group & family touring' },
                                    { id: 'Luxury Coach Bus', label: 'Luxury Coach Bus', sub: '25+ Pax', desc: 'Large group expeditions' },
                                    { id: 'Shrawello to Recommend', label: 'Agency Choice', sub: 'Optimal', desc: 'Best fit for party & route' }
                                ].map(v => (
                                    <button
                                        key={v.id}
                                        type="button"
                                        onClick={() => setVehiclePreference(v.id)}
                                        className={`p-3 rounded-2xl text-left border transition-all ${
                                            vehiclePreference === v.id
                                                ? 'bg-slate-900 text-white border-slate-900 dark:bg-amber-500 dark:border-amber-500 shadow-md'
                                                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="font-black text-xs">{v.label}</span>
                                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200/60 dark:bg-slate-700 text-current">
                                                {v.sub}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 line-clamp-1">{v.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Meal Plan & Food Preference */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1.5">
                                    Meal Plan Preference
                                </label>
                                <select
                                    value={mealPlanPreference}
                                    onChange={e => setMealPlanPreference(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-hidden"
                                >
                                    <option value="CP (Breakfast Only)">CP (Only Breakfast)</option>
                                    <option value="MAP (Breakfast + Dinner)">MAP (Breakfast + Dinner - Recommended)</option>
                                    <option value="AP (All Meals - B/L/D)">AP (All Meals - Breakfast + Lunch + Dinner)</option>
                                    <option value="EP (Room Only - No Meals)">EP (Room Only - No Meals)</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1.5">
                                    Food Dietary Preference
                                </label>
                                <select
                                    value={foodPreference}
                                    onChange={e => setFoodPreference(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-hidden"
                                >
                                    <option value="Vegetarian">Pure Vegetarian</option>
                                    <option value="Jain (No Onion / Garlic)">Pure Jain (No onion / garlic / tubers)</option>
                                    <option value="Non-Vegetarian">Non-Vegetarian</option>
                                    <option value="Halal">Halal</option>
                                    <option value="Vegan">Vegan</option>
                                    <option value="Special Dietary Requirements">Special Dietary Requirements</option>
                                </select>
                            </div>
                        </div>

                        {/* Sightseeing Pace & Budget */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1.5">
                                    Preferred Sightseeing Pace
                                </label>
                                <select
                                    value={sightseeingPace}
                                    onChange={e => setSightseeingPace(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-hidden"
                                >
                                    <option value="Leisure">Leisure (Relaxed, easy mornings, free time)</option>
                                    <option value="Moderate">Moderate (Balanced sightseeing & relaxation)</option>
                                    <option value="Fast">Fast-Paced (Cover maximum temples & attractions)</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1.5">
                                    Travel Budget Range
                                </label>
                                <input
                                    type="text"
                                    value={travelBudget}
                                    onChange={e => setTravelBudget(e.target.value)}
                                    placeholder="e.g. As per best itinerary OR ₹30,000 per person"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white outline-hidden"
                                />
                            </div>
                        </div>

                        {/* Flight / Train details */}
                        <div>
                            <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1.5">
                                Flight / Train Details (if already booked)
                            </label>
                            <input
                                type="text"
                                value={flightTrainDetails}
                                onChange={e => setFlightTrainDetails(e.target.value)}
                                placeholder="e.g. Flight 6E-204 arriving Varanasi at 11:30 AM OR 'Shrawello to book tickets'"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-hidden"
                            />
                        </div>
                    </div>
                )}

                {/* ─── STEP 4: CO-TRAVELERS & PASSENGER DETAILS ─── */}
                {currentStep === 4 && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 animate-in fade-in duration-200">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider block mb-1">
                                    Step 4 of 5 • Co-Traveler Roster
                                </span>
                                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                    Who is Traveling with You, {firstName}?
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Add traveler names, ages, and Aadhaar numbers for hotel room allocations and permits.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleAutoSyncPassengers}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 transition-colors shrink-0"
                            >
                                <Sparkles size={13} className="text-amber-600" />
                                <span>Auto-create {totalPaxTarget} traveler slots</span>
                            </button>
                        </div>

                        {/* Passenger Cards */}
                        <div className="space-y-4">
                            {passengers.map((p, idx) => (
                                <div 
                                    key={idx}
                                    className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 relative text-left"
                                >
                                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60 dark:border-slate-700/60">
                                        <div className="flex items-center gap-2">
                                            <span className="size-6 rounded-lg bg-amber-500 text-white font-black text-xs flex items-center justify-center">
                                                {idx + 1}
                                            </span>
                                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                                                {idx === 0 ? 'Primary Traveler (Self)' : `Co-Traveler #${idx + 1}`}
                                            </span>
                                        </div>

                                        {passengers.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemovePassenger(idx)}
                                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                                title="Remove this passenger"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="sm:col-span-2">
                                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                                                Full Name
                                            </label>
                                            <input
                                                type="text"
                                                value={p.name}
                                                onChange={e => handlePassengerChange(idx, 'name', e.target.value)}
                                                placeholder="Traveler full legal name"
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                                                Age or Date of Birth
                                            </label>
                                            <input
                                                type="text"
                                                value={p.dob_or_age}
                                                onChange={e => handlePassengerChange(idx, 'dob_or_age', e.target.value)}
                                                placeholder="e.g. 34 yrs or 15-Oct-1990"
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                                        <div>
                                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                                                Gender
                                            </label>
                                            <select
                                                value={p.gender}
                                                onChange={e => handlePassengerChange(idx, 'gender', e.target.value)}
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                                            >
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Child">Child</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                                                Aadhaar Card No.
                                            </label>
                                            <input
                                                type="text"
                                                value={p.aadhar_no}
                                                onChange={e => handlePassengerChange(idx, 'aadhar_no', e.target.value)}
                                                placeholder="XXXX-XXXX-XXXX"
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                                                Relationship
                                            </label>
                                            <select
                                                value={p.relation}
                                                onChange={e => handlePassengerChange(idx, 'relation', e.target.value)}
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                                            >
                                                <option value="Self / Primary">Self / Primary</option>
                                                <option value="Spouse">Spouse</option>
                                                <option value="Child">Child</option>
                                                <option value="Parent">Parent</option>
                                                <option value="Friend">Friend</option>
                                                <option value="Relative">Relative</option>
                                                <option value="Colleague">Colleague</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={handleAddPassenger}
                            className="w-full py-3 rounded-2xl border-2 border-dashed border-amber-300 dark:border-amber-700/60 text-amber-700 dark:text-amber-400 font-bold text-xs flex items-center justify-center gap-2 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
                        >
                            <Plus size={15} />
                            <span>+ Add Another Passenger</span>
                        </button>
                    </div>
                )}

                {/* ─── STEP 5: SPECIAL REQUESTS, EXCLUSIVE PERKS & REVIEW ─── */}
                {currentStep === 5 && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6 animate-in fade-in duration-200">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                            <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider block mb-1">
                                Step 5 of 5 • Special Requests & Review
                            </span>
                            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                Exclusive Perks & Final Review
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Add any special celebrations or accessibility needs, pick exciting promotional perks, and submit your preferences!
                            </p>
                        </div>

                        {/* Special Requirements 1-Tap Tag Chips */}
                        <div>
                            <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-2">
                                Quick Special Requirements
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {QUICK_TAGS.map(t => {
                                    const active = selectedTags.includes(t.label);
                                    const Icon = t.icon;
                                    return (
                                        <button
                                            key={t.label}
                                            type="button"
                                            onClick={() => toggleQuickTag(t.label)}
                                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                                                active
                                                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                            }`}
                                        >
                                            <Icon size={14} />
                                            <span>{t.label}</span>
                                            {active && <Check size={12} className="stroke-[3]" />}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-3">
                                <textarea
                                    rows={3}
                                    value={specialRequirements}
                                    onChange={e => setSpecialRequirements(e.target.value)}
                                    placeholder="e.g. Need ground floor room for elderly parents, early morning 4 AM temple darshan assistance, vegetarian food without garlic..."
                                    className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-hidden"
                                />
                            </div>
                        </div>

                        {/* Exclusive Promotional Perks & Coupons */}
                        {coupons && coupons.length > 0 && (
                            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50/60 to-emerald-50/40 dark:from-slate-800 dark:to-slate-850 border border-amber-200/60 dark:border-slate-700">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Tag size={16} className="text-amber-600" />
                                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                            Exclusive Seasonal Perks For You
                                        </h4>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-bold">Tap to apply to quote</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    {coupons.map((c: any) => {
                                        const isApplied = appliedCoupon?.code === c.code;
                                        return (
                                            <button
                                                key={c.code}
                                                type="button"
                                                onClick={() => handleApplyCoupon(c)}
                                                className={`p-3 rounded-xl text-left border transition-all ${
                                                    isApplied
                                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-[1.02]'
                                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                        isApplied ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                                    }`}>
                                                        {c.code}
                                                    </span>
                                                    {isApplied && <CheckCircle2 size={14} className="text-white" />}
                                                </div>
                                                <p className="font-extrabold text-xs">{c.title || c.code}</p>
                                                <p className={`text-[10px] mt-0.5 ${isApplied ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400 font-bold'}`}>
                                                    {c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `₹${c.discount_value?.toLocaleString('en-IN')} Value`}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Complete Trip Summary Card */}
                        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700 pb-3">
                                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                    <FileText size={15} className="text-amber-500" />
                                    <span>Summary of Your Preferences</span>
                                </h4>
                                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                                    {passengers.filter(p => p.name.trim()).length} Traveler(s) Added
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Guest & Contact</span>
                                    <p className="font-black text-slate-900 dark:text-white mt-0.5">{fullNameGreeting}</p>
                                    <p className="text-slate-500 text-[11px]">{customerPhone}</p>
                                </div>

                                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Destination</span>
                                    <p className="font-black text-slate-900 dark:text-white mt-0.5">{destination || 'Custom Tour'}</p>
                                    <p className="text-slate-500 text-[11px]">
                                        {startDate ? `${startDate} to ${endDate || 'Flexible'}` : 'Flexible Dates'}
                                    </p>
                                </div>

                                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Stay & Fleet</span>
                                    <p className="font-black text-slate-900 dark:text-white mt-0.5">{hotelPreference} Hotel</p>
                                    <p className="text-slate-500 text-[11px]">{vehiclePreference}</p>
                                </div>

                                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Dining & Food</span>
                                    <p className="font-black text-slate-900 dark:text-white mt-0.5">{foodPreference}</p>
                                    <p className="text-slate-500 text-[11px]">{mealPlanPreference}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* ─── STICKY BOTTOM NAVIGATION BAR ─── */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 shadow-2xl">
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
                    {/* Back Button */}
                    {currentStep > 1 ? (
                        <button
                            type="button"
                            onClick={handlePrevStep}
                            className="inline-flex items-center gap-1.5 px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs"
                        >
                            <ArrowLeft size={16} />
                            <span>Back</span>
                        </button>
                    ) : (
                        <div className="text-[11px] text-slate-400 font-bold hidden sm:block">
                            Step 1 of 5
                        </div>
                    )}

                    {/* Step Indicators */}
                    <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map(step => (
                            <span
                                key={step}
                                className={`size-2.5 rounded-full transition-all ${
                                    step === currentStep
                                        ? 'bg-amber-500 w-6'
                                        : step < currentStep
                                            ? 'bg-emerald-500'
                                            : 'bg-slate-200 dark:bg-slate-700'
                                }`}
                            />
                        ))}
                    </div>

                    {/* Forward / Submit Button */}
                    {currentStep < 5 ? (
                        <button
                            type="button"
                            onClick={handleNextStep}
                            className="inline-flex items-center gap-2 px-5 sm:px-8 py-2.5 sm:py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all hover:scale-[1.02]"
                        >
                            <span>
                                {currentStep === 1 && 'Next: Dates & Travel →'}
                                {currentStep === 2 && 'Next: Preferences →'}
                                {currentStep === 3 && 'Next: Co-Travelers →'}
                                {currentStep === 4 && 'Next: Review & Perks →'}
                            </span>
                            <ArrowRight size={16} />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => handleSubmit()}
                            disabled={submitting}
                            className="inline-flex items-center gap-2 px-6 sm:px-9 py-2.5 sm:py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-lg transition-all hover:scale-[1.02]"
                        >
                            {submitting ? (
                                <>
                                    <div className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    <span>Submitting Details...</span>
                                </>
                            ) : (
                                <>
                                    <Send size={16} />
                                    <span>Submit Trip Details 🚀</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
