import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../../src/lib/api';
import { HotelAvailabilityRequest, HotelAvailabilityStatus } from '../../types';
import { useData } from '../../context/DataContext';
import { toast } from 'sonner';
import {
    Building2, Calendar, Bed, Utensils, Users, CheckCircle2,
    XCircle, AlertCircle, Clock, Copy, MessageCircle, Mail,
    Send, RefreshCw, X, Plus, ShieldCheck, ChevronRight, ExternalLink,
    Sparkles, Check, Phone, MapPin, Search
} from 'lucide-react';

interface HotelAvailabilityModalProps {
    isOpen: boolean;
    onClose: () => void;
    hotelId?: string;
    hotelName?: string;
    proposalId?: string;
    leadId?: string;
    guestName?: string;
    destination?: string;
    initialCheckIn?: string;
    initialCheckOut?: string;
    initialRoomCategory?: string;
    initialMealPlan?: string;
    initialAdults?: number;
    initialChildren?: number;
    onRequestUpdated?: (request: HotelAvailabilityRequest) => void;
}

const QUICK_ROOM_CATEGORIES = [
    'Deluxe Room',
    'Super Deluxe',
    'Executive Suite',
    'Standard Room',
    'Luxury Villa',
    'Family Suite'
];

const MEAL_PLANS = [
    { value: 'CP (Breakfast)', label: 'CP (Breakfast Included)' },
    { value: 'MAP (Breakfast + Dinner)', label: 'MAP (Breakfast + Dinner)' },
    { value: 'AP (All Meals)', label: 'AP (All Meals Included)' },
    { value: 'EP (Room Only)', label: 'EP (Room Only)' }
];

export const HotelAvailabilityModal: React.FC<HotelAvailabilityModalProps> = ({
    isOpen,
    onClose,
    hotelId,
    hotelName = '',
    proposalId,
    leadId,
    guestName = '',
    destination = '',
    initialCheckIn,
    initialCheckOut,
    initialRoomCategory = 'Deluxe Room',
    initialMealPlan = 'CP (Breakfast)',
    initialAdults = 2,
    initialChildren = 0,
    onRequestUpdated
}) => {
    const { vendors } = useData();
    const [requests, setRequests] = useState<HotelAvailabilityRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
    const [historySearch, setHistorySearch] = useState('');

    // Form fields
    const [propHotelName, setPropHotelName] = useState(hotelName);
    const [selectedHotelId, setSelectedHotelId] = useState<string | undefined>(hotelId);
    const [hotelEmail, setHotelEmail] = useState('');
    const [hotelPhone, setHotelPhone] = useState('');
    const [clientGuestName, setClientGuestName] = useState(guestName);
    const [checkInDate, setCheckInDate] = useState(initialCheckIn || '');
    const [checkOutDate, setCheckOutDate] = useState(initialCheckOut || '');
    const [roomCategory, setRoomCategory] = useState(initialRoomCategory);
    const [roomCount, setRoomCount] = useState(1);
    const [mealPlan, setMealPlan] = useState(initialMealPlan);
    const [adults, setAdults] = useState(initialAdults);
    const [children, setChildren] = useState(initialChildren);
    const [agentNotes, setAgentNotes] = useState('');

    // Vendor Autocomplete Popover
    const [showHotelDropdown, setShowHotelDropdown] = useState(false);
    const hotelDropdownRef = useRef<HTMLDivElement>(null);

    // Filter registered Hotel vendors
    const hotelVendors = useMemo(() => {
        return (vendors || []).filter(v => v.category === 'Hotel');
    }, [vendors]);

    // Matching suggestions for autocomplete
    const hotelSuggestions = useMemo(() => {
        const query = (propHotelName || '').trim().toLowerCase();
        if (!query) return hotelVendors.slice(0, 5);
        return hotelVendors.filter(v =>
            (v.name || '').toLowerCase().includes(query) ||
            (v.location || '').toLowerCase().includes(query)
        ).slice(0, 6);
    }, [hotelVendors, propHotelName]);

    // Calculate stay duration in nights
    const nightsCount = useMemo(() => {
        if (!checkInDate || !checkOutDate) return null;
        const d1 = new Date(checkInDate);
        const d2 = new Date(checkOutDate);
        const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
        return diff > 0 ? diff : null;
    }, [checkInDate, checkOutDate]);

    // Handle outside click for hotel autocomplete
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (hotelDropdownRef.current && !hotelDropdownRef.current.contains(e.target as Node)) {
                setShowHotelDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setPropHotelName(hotelName || '');
            setSelectedHotelId(hotelId);
            setClientGuestName(guestName || '');
            if (initialCheckIn) setCheckInDate(initialCheckIn);
            if (initialCheckOut) setCheckOutDate(initialCheckOut);
            if (initialRoomCategory) setRoomCategory(initialRoomCategory);
            if (initialMealPlan) setMealPlan(initialMealPlan);
            if (initialAdults) setAdults(initialAdults);
            if (initialChildren !== undefined) setChildren(initialChildren);

            // If a hotel name was provided, try auto-finding vendor info
            if (hotelName) {
                const matched = hotelVendors.find(v => v.name.toLowerCase() === hotelName.toLowerCase());
                if (matched) {
                    if (matched.contactPhone) setHotelPhone(matched.contactPhone);
                    if (matched.contactEmail) setHotelEmail(matched.contactEmail);
                    setSelectedHotelId(matched.id);
                }
            }

            loadRequests();
        }
    }, [isOpen, hotelName, hotelId, proposalId]);

    const loadRequests = async () => {
        try {
            setLoading(true);
            const filters: any = {};
            if (proposalId) filters.proposalId = proposalId;
            if (hotelId) filters.hotelId = hotelId;
            const res = await api.getHotelAvailabilityRequests(filters);
            setRequests(res || []);
            if (res && res.length > 0) {
                const hasPendingOrAvailable = res.some(r => r.hotelName === hotelName);
                if (hasPendingOrAvailable) {
                    setActiveTab('history');
                }
            }
        } catch (err) {
            console.error('Failed to load availability requests:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectHotelVendor = (v: any) => {
        setPropHotelName(v.name);
        setSelectedHotelId(v.id);
        if (v.contactPhone) setHotelPhone(v.contactPhone);
        if (v.contactEmail) setHotelEmail(v.contactEmail);
        setShowHotelDropdown(false);
        toast.info(`Selected ${v.name} (auto-filled contact info)`);
    };

    const getVerificationUrl = (token: string) => {
        const origin = window.location.origin;
        return `${origin}/hotel-check/${token}`;
    };

    const handleCreateRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!propHotelName.trim()) {
            toast.error('Please enter the hotel name');
            return;
        }

        setSubmitting(true);
        try {
            const newRequest = await api.createHotelAvailabilityRequest({
                hotelId: selectedHotelId || hotelId || undefined,
                hotelName: propHotelName.trim(),
                hotelEmail: hotelEmail.trim() || undefined,
                hotelPhone: hotelPhone.trim() || undefined,
                proposalId: proposalId || undefined,
                leadId: leadId || undefined,
                guestName: clientGuestName.trim() || undefined,
                destination: destination || undefined,
                checkInDate: checkInDate || undefined,
                checkOutDate: checkOutDate || undefined,
                roomCategory: roomCategory || 'Standard Room',
                roomCount: Number(roomCount) || 1,
                mealPlan: mealPlan || 'CP (Breakfast)',
                adults: Number(adults) || 2,
                children: Number(children) || 0,
                status: 'Pending',
                agentNotes: agentNotes.trim() || undefined
            });

            toast.success('Availability verification request created!');
            setRequests(prev => [newRequest, ...prev]);
            setActiveTab('history');
            if (onRequestUpdated) onRequestUpdated(newRequest);
        } catch (err: any) {
            toast.error(err.message || 'Failed to create availability request');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCopyLink = (req: HotelAvailabilityRequest) => {
        const url = getVerificationUrl(req.token);
        navigator.clipboard.writeText(url);
        toast.success('Direct verification link copied to clipboard!');
    };

    const handleWhatsAppShare = (req: HotelAvailabilityRequest) => {
        const url = getVerificationUrl(req.token);
        const nights = req.checkInDate && req.checkOutDate
            ? Math.ceil((new Date(req.checkOutDate).getTime() - new Date(req.checkInDate).getTime()) / (1000 * 3600 * 24))
            : 1;

        const message =
            `🏨 *ROOM AVAILABILITY INQUIRY*\n` +
            `*Property:* ${req.hotelName}\n` +
            `*Guest Ref:* ${req.guestName || 'Valued Guest'}\n` +
            `*Dates:* ${req.checkInDate || 'Flexible'} to ${req.checkOutDate || 'Flexible'} (${nights} ${nights === 1 ? 'Night' : 'Nights'})\n` +
            `*Requirement:* ${req.roomCount} × ${req.roomCategory || 'Room'} (${req.mealPlan})\n` +
            `*Occupancy:* ${req.adults} Adults${req.children > 0 ? ` + ${req.children} Kids` : ''}\n` +
            (req.agentNotes ? `*Note:* ${req.agentNotes}\n` : '') +
            `\nKindly confirm availability with 1 click using this secure link:\n` +
            `👉 ${url}\n\n` +
            `Thank you,\n*Shrawello Travel Hub & Events LLP*`;

        const phoneClean = (req.hotelPhone || '').replace(/\D/g, '');
        const waUrl = phoneClean
            ? `https://wa.me/${phoneClean.startsWith('91') ? phoneClean : '91' + phoneClean}?text=${encodeURIComponent(message)}`
            : `https://wa.me/?text=${encodeURIComponent(message)}`;

        window.open(waUrl, '_blank');
        toast.success('Opening WhatsApp with pre-filled message...');
    };

    const handleEmailShare = (req: HotelAvailabilityRequest) => {
        const url = getVerificationUrl(req.token);
        const subject = encodeURIComponent(`Room Availability Inquiry: ${req.hotelName} (${req.checkInDate} to ${req.checkOutDate})`);
        const body = encodeURIComponent(
            `Dear Reservations Team at ${req.hotelName},\n\n` +
            `Greetings from Shrawello Travel Hub and Events LLP.\n\n` +
            `We have an upcoming booking requirement for our client:\n` +
            `- Guest: ${req.guestName || 'Valued Client'}\n` +
            `- Check-in: ${req.checkInDate}\n` +
            `- Check-out: ${req.checkOutDate}\n` +
            `- Requirement: ${req.roomCount} × ${req.roomCategory} (${req.mealPlan})\n` +
            `- Pax: ${req.adults} Adults, ${req.children} Children\n\n` +
            `Please confirm room availability and applicable rates via our 1-click confirmation link:\n` +
            `${url}\n\n` +
            `Best regards,\nOperations Team\nShrawello Travel Hub and Events LLP\nPhone: +91 80109 55675`
        );

        window.open(`mailto:${req.hotelEmail || ''}?subject=${subject}&body=${body}`, '_blank');
    };

    const handleQuickStatusUpdate = async (req: HotelAvailabilityRequest, newStatus: HotelAvailabilityStatus) => {
        try {
            await api.updateHotelAvailabilityRequest(req.id, {
                status: newStatus,
                respondedBy: 'Manual Agent Confirmation',
                respondedAt: new Date().toISOString()
            });

            const updated = {
                ...req,
                status: newStatus,
                respondedBy: 'Manual Agent Confirmation',
                respondedAt: new Date().toISOString()
            };

            setRequests(prev => prev.map(r => r.id === req.id ? updated : r));
            toast.success(`Updated status to "${newStatus}"!`);
            if (onRequestUpdated) onRequestUpdated(updated);
        } catch (err: any) {
            toast.error(err.message || 'Failed to update status');
        }
    };

    const filteredRequests = useMemo(() => {
        if (!historySearch.trim()) return requests;
        const q = historySearch.toLowerCase();
        return requests.filter(r =>
            r.hotelName.toLowerCase().includes(q) ||
            (r.guestName && r.guestName.toLowerCase().includes(q)) ||
            r.status.toLowerCase().includes(q) ||
            (r.roomCategory && r.roomCategory.toLowerCase().includes(q))
        );
    }, [requests, historySearch]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#101720] border border-slate-200/90 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-150">

                {/* Header */}
                <div className="py-3 px-5 sm:px-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 dark:from-slate-900/60 dark:via-[#101720] dark:to-slate-900/60 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="size-9 sm:size-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                            <Building2 size={18} />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                                    Hotel Availability Verification
                                </h3>
                                <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20 inline-flex items-center gap-1">
                                    <Sparkles size={10} /> 1-Click Automation
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Generate secure 1-click verification links for hotel reservation desks via WhatsApp or Email.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                        title="Close Modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center border-b border-slate-100 dark:border-slate-800 px-5 sm:px-6 bg-slate-50/40 dark:bg-slate-900/30 shrink-0">
                    <button
                        type="button"
                        onClick={() => setActiveTab('create')}
                        className={`py-2 px-3.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                            activeTab === 'create'
                                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-black'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                        }`}
                    >
                        <span className="flex items-center gap-1.5">
                            <Plus size={13} /> New Availability Check
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('history')}
                        className={`py-2 px-3.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                            activeTab === 'history'
                                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-black'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                        }`}
                    >
                        <span className="flex items-center gap-1.5">
                            <Clock size={13} /> Requests History ({requests.length})
                        </span>
                    </button>
                </div>

                {/* Form or History View */}
                {activeTab === 'create' ? (
                    <form
                        id="hotel-availability-form"
                        onSubmit={handleCreateRequest}
                        className="p-4 sm:p-5 overflow-y-auto flex-1 custom-scrollbar space-y-3.5"
                    >
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

                            {/* Column 1: Property & Stay Duration */}
                            <div className="bg-slate-50/70 dark:bg-slate-900/40 p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 space-y-3">
                                <div className="flex items-center gap-2 pb-1 border-b border-slate-200/50 dark:border-slate-800">
                                    <Building2 size={15} className="text-indigo-500" />
                                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                        Property & Stay Details
                                    </h4>
                                </div>

                                {/* Hotel / Property Name with Vendor Autocomplete */}
                                <div className="space-y-1 relative" ref={hotelDropdownRef}>
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                            Hotel / Property Name <span className="text-rose-500">*</span>
                                        </label>
                                        {selectedHotelId && (
                                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40 inline-flex items-center gap-1">
                                                <Check size={10} /> Linked Vendor
                                            </span>
                                        )}
                                    </div>

                                    <div className="relative">
                                        <input
                                            type="text"
                                            required
                                            value={propHotelName}
                                            onChange={(e) => {
                                                setPropHotelName(e.target.value);
                                                setShowHotelDropdown(true);
                                                setSelectedHotelId(undefined);
                                            }}
                                            onFocus={() => setShowHotelDropdown(true)}
                                            placeholder="e.g. Barefoot at Havelock Resort"
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium shadow-xs"
                                        />
                                        {hotelVendors.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setShowHotelDropdown(!showHotelDropdown)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md hover:bg-indigo-100 transition-colors cursor-pointer"
                                            >
                                                Browse ({hotelVendors.length})
                                            </button>
                                        )}
                                    </div>

                                    {/* Dropdown Suggestions */}
                                    {showHotelDropdown && hotelSuggestions.length > 0 && (
                                        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30 overflow-hidden max-h-52 overflow-y-auto custom-scrollbar animate-in fade-in">
                                            <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                                Registered Hotel Vendors
                                            </div>
                                            {hotelSuggestions.map((v) => (
                                                <button
                                                    key={v.id}
                                                    type="button"
                                                    onClick={() => handleSelectHotelVendor(v)}
                                                    className="w-full text-left px-3.5 py-2 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 border-b border-slate-100 dark:border-slate-800/50 last:border-none flex items-center justify-between transition-colors cursor-pointer"
                                                >
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{v.name}</p>
                                                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                                            <MapPin size={10} /> {v.location || 'Location Not Specified'}
                                                        </p>
                                                    </div>
                                                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                                                        Select →
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Dates & Nights Stay */}
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                            Stay Dates
                                        </label>
                                        {nightsCount !== null && (
                                            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800 inline-flex items-center gap-1">
                                                <Calendar size={10} /> {nightsCount} {nightsCount === 1 ? 'Night' : 'Nights'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-semibold text-slate-400 mb-0.5 block">Check-in</label>
                                            <input
                                                type="date"
                                                value={checkInDate}
                                                onChange={(e) => setCheckInDate(e.target.value)}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-semibold text-slate-400 mb-0.5 block">Check-out</label>
                                            <input
                                                type="date"
                                                min={checkInDate || undefined}
                                                value={checkOutDate}
                                                onChange={(e) => setCheckOutDate(e.target.value)}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Guest Reference / Client Name */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Guest Reference / Client Name
                                    </label>
                                    <input
                                        type="text"
                                        value={clientGuestName}
                                        onChange={(e) => setClientGuestName(e.target.value)}
                                        placeholder="e.g. John Doe / Family Group"
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                    />
                                </div>

                                {/* Room Category with Quick Preset Pills */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Room Category
                                    </label>
                                    <input
                                        type="text"
                                        value={roomCategory}
                                        onChange={(e) => setRoomCategory(e.target.value)}
                                        placeholder="e.g. Deluxe Sea Facing Cottage"
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                    />
                                    <div className="flex flex-wrap gap-1 pt-0.5">
                                        {QUICK_ROOM_CATEGORIES.map(cat => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => setRoomCategory(cat)}
                                                className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-md border transition-all cursor-pointer ${
                                                    roomCategory === cat
                                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                                                }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Column 2: Specs, Contacts & Dispatch */}
                            <div className="bg-slate-50/70 dark:bg-slate-900/40 p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 space-y-3">
                                <div className="flex items-center gap-2 pb-1 border-b border-slate-200/50 dark:border-slate-800">
                                    <Bed size={15} className="text-indigo-500" />
                                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                        Requirements & Hotel Contact
                                    </h4>
                                </div>

                                {/* Meal Plan */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                        <Utensils size={12} className="text-slate-400" /> Meal Plan
                                    </label>
                                    <select
                                        value={mealPlan}
                                        onChange={(e) => setMealPlan(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
                                    >
                                        {MEAL_PLANS.map(mp => (
                                            <option key={mp.value} value={mp.value}>{mp.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Room Count & Occupancy (3 Columns) */}
                                <div className="grid grid-cols-3 gap-2.5">
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                            Rooms Count
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="50"
                                            value={roomCount}
                                            onChange={(e) => setRoomCount(parseInt(e.target.value) || 1)}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-center"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                            Adults
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={adults}
                                            onChange={(e) => setAdults(parseInt(e.target.value) || 1)}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-center"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                            Children
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="50"
                                            value={children}
                                            onChange={(e) => setChildren(parseInt(e.target.value) || 0)}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-center"
                                        />
                                    </div>
                                </div>

                                {/* Hotel WhatsApp / Phone & Reservations Email */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                            <MessageCircle size={12} className="text-emerald-500" /> Hotel WhatsApp
                                        </label>
                                        <input
                                            type="text"
                                            value={hotelPhone}
                                            onChange={(e) => setHotelPhone(e.target.value)}
                                            placeholder="e.g. 9876543210"
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                            <Mail size={12} className="text-indigo-500" /> Hotel Email
                                        </label>
                                        <input
                                            type="email"
                                            value={hotelEmail}
                                            onChange={(e) => setHotelEmail(e.target.value)}
                                            placeholder="reservations@hotel.com"
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                        />
                                    </div>
                                </div>

                                {/* Agent Special Notes */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Special Instructions / Notes for Property
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={agentNotes}
                                        onChange={(e) => setAgentNotes(e.target.value)}
                                        placeholder="e.g. Honeymoon couple, extra flower bed decor required, quiet floor preferred."
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium resize-none"
                                    />
                                </div>
                            </div>

                        </div>
                    </form>
                ) : (
                    /* History View */
                    <div className="p-5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4">
                        {/* Search and refresh header */}
                        <div className="flex items-center justify-between gap-3">
                            <div className="relative flex-1 max-w-sm">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={historySearch}
                                    onChange={(e) => setHistorySearch(e.target.value)}
                                    placeholder="Filter by hotel, guest or status..."
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={loadRequests}
                                disabled={loading}
                                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                                Refresh
                            </button>
                        </div>

                        {filteredRequests.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                <Building2 size={36} className="mx-auto mb-2 opacity-30 text-indigo-500" />
                                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                                    {historySearch ? 'No matching requests found.' : 'No availability verification requests created yet.'}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('create')}
                                    className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                                >
                                    + Create First Request
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredRequests.map(req => (
                                    <div
                                        key={req.id}
                                        className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4.5 space-y-3 transition-all hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                                        {req.hotelName}
                                                    </h4>
                                                    {req.guestName && (
                                                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                                            {req.guestName}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                                                    {req.roomCount} × {req.roomCategory} • {req.mealPlan}
                                                </p>
                                                <p className="text-[11px] text-slate-400 mt-0.5">
                                                    {req.checkInDate} → {req.checkOutDate} • {req.adults} Adults{req.children > 0 ? `, ${req.children} Kids` : ''}
                                                </p>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span className={`inline-flex items-center gap-1 text-[11px] font-black uppercase px-2.5 py-1 rounded-full ${
                                                    req.status === 'Available' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/60' :
                                                    req.status === 'Sold Out' ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800/60' :
                                                    req.status === 'Alternative Offered' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800/60' :
                                                    'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                                }`}>
                                                    {req.status === 'Available' && <CheckCircle2 size={12} />}
                                                    {req.status === 'Sold Out' && <XCircle size={12} />}
                                                    {req.status === 'Alternative Offered' && <AlertCircle size={12} />}
                                                    {req.status === 'Pending' && <Clock size={12} />}
                                                    {req.status}
                                                </span>
                                                {req.respondedBy && (
                                                    <span className="block text-[10px] text-slate-400 mt-1">
                                                        by {req.respondedBy}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Hotel Response Remarks */}
                                        {req.hotelNotes && (
                                            <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
                                                <strong className="text-slate-900 dark:text-white">Hotel Response:</strong> {req.hotelNotes}
                                            </div>
                                        )}

                                        {req.offeredAlternative && (
                                            <div className="bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300">
                                                <strong>Alternative Offered:</strong> {req.offeredAlternative}
                                            </div>
                                        )}

                                        {/* Action Bar */}
                                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                                            {/* Share Buttons */}
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleWhatsAppShare(req)}
                                                    className="p-1.5 px-2.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800/40 transition-all cursor-pointer"
                                                    title="Send WhatsApp message"
                                                >
                                                    <MessageCircle size={13} />
                                                    <span>WhatsApp</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleEmailShare(req)}
                                                    className="p-1.5 px-2.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-400 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800/40 transition-all cursor-pointer"
                                                    title="Send Email"
                                                >
                                                    <Mail size={13} />
                                                    <span>Email</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyLink(req)}
                                                    className="p-1.5 px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                                                    title="Copy link"
                                                >
                                                    <Copy size={13} />
                                                    <span>Copy Link</span>
                                                </button>

                                                <a
                                                    href={getVerificationUrl(req.token)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-all"
                                                    title="Preview verification page"
                                                >
                                                    <ExternalLink size={14} />
                                                </a>
                                            </div>

                                            {/* Manual Quick Status Override */}
                                            <div className="flex items-center gap-1">
                                                {req.status !== 'Available' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleQuickStatusUpdate(req, 'Available')}
                                                        className="text-[11px] font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 px-2 py-1 rounded cursor-pointer"
                                                    >
                                                        Mark Available
                                                    </button>
                                                )}
                                                {req.status !== 'Sold Out' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleQuickStatusUpdate(req, 'Sold Out')}
                                                        className="text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 py-1 rounded cursor-pointer"
                                                    >
                                                        Mark Sold Out
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Sticky Footer: Permanently visible without scrolling */}
                <div className="py-2.5 px-5 sm:px-6 border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-2.5 shrink-0">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <ShieldCheck size={15} className="text-emerald-500 shrink-0" />
                        <span className="font-medium text-[11px] hidden sm:inline">Zero login required for hotel desks • 1-click tokenized access</span>
                        <span className="font-medium text-[11px] sm:hidden">Zero login required</span>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
                        >
                            Close
                        </button>

                        {activeTab === 'create' && (
                            <button
                                type="submit"
                                form="hotel-availability-form"
                                disabled={submitting}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-4 rounded-xl shadow-md shadow-indigo-600/25 hover:shadow-indigo-600/35 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-xs active:scale-95"
                            >
                                {submitting ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Generating Link...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send size={14} />
                                        <span>Generate 1-Click Verification Link</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
