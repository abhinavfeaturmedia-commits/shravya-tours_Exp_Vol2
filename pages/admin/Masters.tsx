import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { useNavigate } from 'react-router-dom';
import {
    MasterLocation,
    MasterHotel,
    MasterActivity,
    MasterTransport,
    MasterPlan,
    MasterLocationType,
    MasterTransportType,
    MasterRoomType,
    MasterMealPlan,
    MasterLeadSource,
    MasterTermsTemplate,
    MEAL_PLAN_DESCRIPTIONS
} from '../../types';
import {
    MapPin, Building2, Bike, Car, Calendar, Search, Plus, Filter,
    Download, Upload, Trash2, Edit2, Copy, MoreVertical, X,
    Check, ChevronDown, LayoutGrid, List, BedDouble, Utensils,
    Users, FileText, Globe, ExternalLink, AlertTriangle, ShieldAlert,
    Sparkles, Star, Phone, Mail, DollarSign, Percent, Layers, Eye,
    RefreshCw, SlidersHorizontal, CheckCircle2, XCircle, Compass,
    Clock, Luggage, ShieldCheck, FileSpreadsheet, ArrowUpDown, ChevronRight,
    TrendingUp, Info, HelpCircle, CheckCheck
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { ImageUpload } from '../../components/ui/ImageUpload';
import { ActionMenu } from '../../components/ui/ActionMenu';

type MasterTab = 'analytics' | 'locations' | 'hotels' | 'activities' | 'transports' | 'plans' | 'room-types' | 'meal-plans' | 'lead-sources' | 'terms';
type ViewMode = 'grid' | 'list';
type SortDirection = 'asc' | 'desc';

// Safe UUID generator
const generateId = (prefix: string) => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `${prefix}_${'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    })}`;
};

// --- Pre-built Policy Presets for Terms & Conditions ---
const TERMS_PRESETS = [
    {
        label: '100% Standard Refund Policy',
        title: 'Standard Cancellation & Refund Policy',
        category: 'Cancellation Policy' as const,
        content: `## Cancellation & Refund Policy
• 100% refund for cancellations made 30+ days prior to scheduled departure.
• 50% refund for cancellations made between 15 to 29 days prior to departure.
• 25% refund for cancellations made between 7 to 14 days prior to departure.
• Non-refundable for cancellations made less than 7 days prior to departure or in case of no-show.
• Any non-refundable airline or hotel charges will be deducted from the eligible refund amount.`,
    },
    {
        label: 'Peak Season Strict Policy',
        title: 'Peak Season / Holiday Strict Policy',
        category: 'Cancellation Policy' as const,
        content: `## Peak Season / Holiday Policy
• High-season bookings (Dec 15 - Jan 15, Diwali, Long Weekends) are 100% non-refundable once confirmed.
• Date modifications are subject to supplier availability and will incur airline/hotel rebooking surcharges.
• Force Majeure: In case of natural calamities or flight groundings, credits for future travel will be issued where suppliers permit.`,
    },
    {
        label: 'Standard Payment Terms',
        title: 'Standard Payment Terms & Schedule',
        category: 'Booking & Payment' as const,
        content: `## Payment & Booking Confirmation
• 25% advance token payment is required at the time of initial booking confirmation.
• 50% milestone payment is due 30 days prior to departure or before flight/train ticketing.
• Remaining 25% balance must be settled 7 days prior to departure date.
• Payments can be made via UPI, Bank NEFT/RTGS, or Major Credit Cards.`,
    },
    {
        label: 'Travel Insurance Terms',
        title: 'Comprehensive Travel Insurance Terms',
        category: 'Travel Insurance' as const,
        content: `## Travel Insurance & Medical Protection
• Basic emergency medical and baggage insurance is included in all premium tour packages.
• Pre-existing medical conditions are excluded unless explicitly declared and endorsed.
• Luggage loss, trip delays (> 6 hours), and accidental hospitalizations are covered under the policy underwriters.
• Policy documents will be dispatched along with travel vouchers 48 hours prior to departure.`,
    },
    {
        label: 'Standard Package Inclusions',
        title: 'Standard Package Inclusions & Exclusions',
        category: 'Pricing & Inclusions' as const,
        content: `## Package Inclusions
• Daily buffet breakfast at all confirmed hotels (CP Plan).
• Dedicated AC transport for all transfers and specified sightseeing tours as per itinerary.
• Toll taxes, interstate permits, driver allowances, and airport parking fees.

## Package Exclusions
• Any airfare/train fare not explicitly mentioned in the inclusions.
• Personal expenses such as laundry, room service, telephone calls, and mini-bar.
• Entry tickets to monuments, safari permits, and adventure activity fees unless specified.
• 5% GST and applicable TCS (for international tours).`,
    },
];

// Quick suggestions for amenity tags
const POPULAR_AMENITIES = [
    'Free WiFi', 'Swimming Pool', 'Spa & Wellness', 'Fitness Center / Gym',
    'Multi-Cuisine Restaurant', 'Beachfront / Private Beach', 'Bar & Lounge',
    'Mountain View', 'Air Conditioning', 'Valet Parking', 'Airport Shuttle',
    '24/7 Room Service', 'Pet Friendly', 'Kids Play Area', 'Conference Room'
];

// Quick suggestions for activity tags
const POPULAR_ACTIVITY_TAGS = [
    'Certified Guide Included', 'Safety Gear Provided', 'Entry Ticket Included',
    'Hotel Pick & Drop', 'Refreshments / Water', 'Equipment Rental', 'Photo & Video Package',
    'Family Friendly', 'Beginner Friendly'
];

// --- Dependency Detection Engine ---
interface MasterDependency {
    total: number;
    packages: { id: string; title: string; location?: string }[];
    bookings: { id: string; title: string; customerName?: string; status: string }[];
    leads: { id: string; name: string; destination: string }[];
    plans: { id: string; title: string }[];
    details: string;
}

const calculateMasterDependencies = (
    item: any,
    tab: MasterTab,
    data: {
        packages: any[];
        bookings: any[];
        leads: any[];
        masterHotels: MasterHotel[];
        masterActivities: MasterActivity[];
        masterPlans: MasterPlan[];
        masterLocations: MasterLocation[];
    }
): MasterDependency => {
    if (!item) {
        return { total: 0, packages: [], bookings: [], leads: [], plans: [], details: 'No active dependencies' };
    }

    const id = String(item.id || '');
    const name = String(item.name || item.title || '').toLowerCase().trim();

    const matchedPackages: { id: string; title: string; location?: string }[] = [];
    const matchedBookings: { id: string; title: string; customerName?: string; status: string }[] = [];
    const matchedLeads: { id: string; name: string; destination: string }[] = [];
    const matchedPlans: { id: string; title: string }[] = [];

    const safePackages = Array.isArray(data.packages) ? data.packages : [];
    const safeBookings = Array.isArray(data.bookings) ? data.bookings : [];
    const safeLeads = Array.isArray(data.leads) ? data.leads : [];
    const safePlans = Array.isArray(data.masterPlans) ? data.masterPlans : [];

    if (tab === 'locations') {
        // Match packages by location id or name
        safePackages.forEach(p => {
            if (p && (String(p.location || '') === id || (name && String(p.location || '').toLowerCase().trim() === name))) {
                matchedPackages.push({ id: String(p.id), title: p.title || 'Tour Package', location: p.location });
            }
        });
        // Match bookings
        safeBookings.forEach(b => {
            if (b && (name && (String(b.destination || '').toLowerCase().trim() === name || String(b.location || '') === id))) {
                matchedBookings.push({ id: String(b.id), title: b.tripTitle || b.packageName || 'Trip', customerName: b.customerName, status: b.status || 'Confirmed' });
            }
        });
        // Match leads
        safeLeads.forEach(l => {
            if (l && (name && (String(l.destination || '').toLowerCase().trim() === name || String(l.location || '') === id))) {
                matchedLeads.push({ id: String(l.id), name: l.name || 'Lead', destination: l.destination || '' });
            }
        });
        // Match plan templates
        safePlans.forEach(p => {
            if (p && String(p.locationId || '') === id) {
                matchedPlans.push({ id: String(p.id), title: p.title || 'Plan Template' });
            }
        });
    } else if (tab === 'hotels') {
        // Check plans
        safePlans.forEach(p => {
            const days = Array.isArray(p?.days) ? p.days : [];
            if (days.some(d => d && String(d.hotelId || '') === id)) {
                matchedPlans.push({ id: String(p.id), title: p.title || 'Plan Template' });
            }
        });
        // Check packages
        safePackages.forEach(p => {
            if (!p) return;
            const builderDays = Array.isArray(p.builderData?.days) ? p.builderData.days : [];
            const packageDays = Array.isArray(p.days) ? p.days : [];
            const isUsedInBuilder = builderDays.some((d: any) => d && (String(d.hotelId || '') === id || (name && String(d.hotelName || '').toLowerCase().trim() === name)));
            const isUsedInDays = packageDays.some((d: any) => d && typeof d === 'object' && (String(d.hotelId || '') === id || (name && String(d.hotelName || '').toLowerCase().trim() === name)));

            if (String(p.hotelId || '') === id || isUsedInBuilder || isUsedInDays) {
                matchedPackages.push({ id: String(p.id), title: p.title || 'Tour Package' });
            }
        });
        // Check bookings
        safeBookings.forEach(b => {
            if (b && name && String(b.hotel || '').toLowerCase().includes(name)) {
                matchedBookings.push({ id: String(b.id), title: b.tripTitle || 'Trip', customerName: b.customerName, status: b.status || 'Confirmed' });
            }
        });
    } else if (tab === 'activities') {
        safePlans.forEach(p => {
            const days = Array.isArray(p?.days) ? p.days : [];
            if (days.some(d => Array.isArray(d?.activities) && d.activities.some((actId: any) => String(actId || '') === id))) {
                matchedPlans.push({ id: String(p.id), title: p.title || 'Plan Template' });
            }
        });
        safePackages.forEach(p => {
            if (!p) return;
            const actArray = Array.isArray(p.activities) ? p.activities : [];
            const builderDays = Array.isArray(p.builderData?.days) ? p.builderData.days : [];
            const isUsedInBuilder = builderDays.some((d: any) => Array.isArray(d?.activities) && d.activities.some((a: any) => String(a?.id || a || '') === id));

            if (actArray.some((a: any) => String(a || '') === id) || isUsedInBuilder) {
                matchedPackages.push({ id: String(p.id), title: p.title || 'Tour Package' });
            }
        });
    } else if (tab === 'transports') {
        safePlans.forEach(p => {
            const days = Array.isArray(p?.days) ? p.days : [];
            if (days.some(d => d && String(d.transportId || '') === id)) {
                matchedPlans.push({ id: String(p.id), title: p.title || 'Plan Template' });
            }
        });
        safePackages.forEach(p => {
            if (!p) return;
            const builderDays = Array.isArray(p.builderData?.days) ? p.builderData.days : [];
            const isUsedInBuilder = builderDays.some((d: any) => d && String(d.transportId || '') === id);
            if (String(p.transportId || '') === id || isUsedInBuilder) {
                matchedPackages.push({ id: String(p.id), title: p.title || 'Tour Package' });
            }
        });
        safeBookings.forEach(b => {
            if (b && name && String(b.transport || '').toLowerCase().includes(name)) {
                matchedBookings.push({ id: String(b.id), title: b.tripTitle || 'Trip', customerName: b.customerName, status: b.status || 'Confirmed' });
            }
        });
    } else if (tab === 'terms') {
        safePackages.forEach(p => {
            if (p && (String(p.termsTemplateId || '') === id || (name && String(p.termsAndConditions || '').toLowerCase().includes(name)))) {
                matchedPackages.push({ id: String(p.id), title: p.title || 'Tour Package' });
            }
        });
    } else if (tab === 'lead-sources') {
        safeLeads.forEach(l => {
            if (l && name && String(l.source || '').toLowerCase().trim() === name) {
                matchedLeads.push({ id: String(l.id), name: l.name || 'Lead', destination: l.destination || '' });
            }
        });
    }

    const total = matchedPackages.length + matchedBookings.length + matchedLeads.length + matchedPlans.length;
    const parts: string[] = [];
    if (matchedPackages.length > 0) parts.push(`${matchedPackages.length} Packages`);
    if (matchedBookings.length > 0) parts.push(`${matchedBookings.length} Bookings`);
    if (matchedLeads.length > 0) parts.push(`${matchedLeads.length} Leads`);
    if (matchedPlans.length > 0) parts.push(`${matchedPlans.length} Plans`);

    return {
        total,
        packages: matchedPackages,
        bookings: matchedBookings,
        leads: matchedLeads,
        plans: matchedPlans,
        details: parts.length > 0 ? parts.join(', ') : 'No active dependencies'
    };
};

// --- Master Modal Component (Full Rich Form) ---
const MasterModal: React.FC<{
    activeTab: MasterTab;
    editingItem: any;
    onClose: () => void;
}> = ({ activeTab, editingItem, onClose }) => {
    const {
        addMasterLocation, updateMasterLocation,
        addMasterHotel, updateMasterHotel,
        addMasterActivity, updateMasterActivity,
        addMasterTransport, updateMasterTransport,
        addMasterPlan, updateMasterPlan,
        addMasterRoomType, updateMasterRoomType,
        addMasterMealPlan, updateMasterMealPlan,
        addMasterLeadSource, updateMasterLeadSource,
        addMasterTermsTemplate, updateMasterTermsTemplate,
        masterLocations, masterRoomTypes, masterMealPlans
    } = useData();

    // Initialize form state with full defaults
    const [form, setForm] = useState<any>(editingItem ? { ...editingItem } : {
        status: 'Active',
        rating: 4.5,
        type: activeTab === 'locations' ? 'City' : activeTab === 'transports' ? 'Sedan' : undefined,
        category: activeTab === 'activities' ? 'Leisure' : activeTab === 'lead-sources' ? 'Organic' : activeTab === 'terms' ? 'Cancellation Policy' : undefined,
        code: activeTab === 'meal-plans' ? 'CP' : undefined,
        amenities: [],
        tags: []
    });

    const [amenityInput, setAmenityInput] = useState('');

    const addAmenityTag = (amenity: string) => {
        const trimmed = amenity.trim();
        if (!trimmed) return;
        const current = Array.isArray(form.amenities) ? form.amenities : [];
        if (!current.includes(trimmed)) {
            setForm({ ...form, amenities: [...current, trimmed] });
        }
        setAmenityInput('');
    };

    const removeAmenityTag = (index: number) => {
        const current = Array.isArray(form.amenities) ? [...form.amenities] : [];
        current.splice(index, 1);
        setForm({ ...form, amenities: current });
    };

    const handleSave = () => {
        // Validation for required fields
        if (['locations', 'hotels', 'activities', 'transports', 'room-types', 'lead-sources'].includes(activeTab) && !form.name?.trim()) {
            return toast.error('Name is required');
        }
        if (['plans', 'terms'].includes(activeTab) && !form.title?.trim() && !form.name?.trim()) {
            return toast.error('Title is required');
        }
        if (activeTab === 'meal-plans' && (!form.name?.trim() || !form.code?.trim())) {
            return toast.error('Name and Code are required');
        }

        const prefix = activeTab === 'locations' ? 'LOC' :
            activeTab === 'hotels' ? 'HTL' :
                activeTab === 'activities' ? 'ACT' :
                    activeTab === 'transports' ? 'TRN' :
                        activeTab === 'plans' ? 'PLN' :
                            activeTab === 'room-types' ? 'RT' :
                                activeTab === 'meal-plans' ? 'MP' :
                                    activeTab === 'lead-sources' ? 'LS' : 'TT';

        const id = editingItem ? editingItem.id : generateId(prefix);
        const data = { ...form, id };

        // Normalize naming
        if (activeTab === 'plans' || activeTab === 'terms') {
            data.title = form.title || form.name || 'Untitled';
            delete data.name;
        }

        // Apply defaults
        if (activeTab === 'locations' && !data.type) data.type = 'City';
        if (activeTab === 'activities' && !data.category) data.category = 'Leisure';
        if (activeTab === 'transports' && !data.type) data.type = 'Sedan';
        if (activeTab === 'meal-plans' && !data.code) data.code = 'CP';
        if (activeTab === 'lead-sources' && !data.category) data.category = 'Organic';
        if (activeTab === 'terms' && !data.category) data.category = 'Other';

        // Sanitize numeric inputs
        if (data.pricePerNight !== undefined) data.pricePerNight = Number(data.pricePerNight) || 0;
        if (data.rating !== undefined) data.rating = Number(data.rating) || 5;
        if (data.cost !== undefined) data.cost = Number(data.cost) || 0;
        if (data.capacity !== undefined) data.capacity = Number(data.capacity) || 4;
        if (data.baseRate !== undefined) data.baseRate = Number(data.baseRate) || 0;
        if (data.estimatedCost !== undefined) data.estimatedCost = Number(data.estimatedCost) || 0;
        if (data.duration !== undefined && !isNaN(Number(data.duration))) data.duration = Number(data.duration);

        // Sanitize Amenities
        if (typeof data.amenities === 'string') {
            data.amenities = data.amenities.split(',').map((s: string) => s.trim()).filter(Boolean);
        }

        if (editingItem) {
            if (activeTab === 'locations') updateMasterLocation(id, data);
            else if (activeTab === 'hotels') updateMasterHotel(id, data);
            else if (activeTab === 'activities') updateMasterActivity(id, data);
            else if (activeTab === 'transports') updateMasterTransport(id, data);
            else if (activeTab === 'plans') updateMasterPlan(id, data);
            else if (activeTab === 'room-types') updateMasterRoomType(id, data);
            else if (activeTab === 'meal-plans') updateMasterMealPlan(id, data);
            else if (activeTab === 'lead-sources') updateMasterLeadSource(id, data);
            else if (activeTab === 'terms') updateMasterTermsTemplate(id, data);
            toast.success('Updated successfully');
        } else {
            if (activeTab === 'locations') addMasterLocation(data);
            else if (activeTab === 'hotels') addMasterHotel(data);
            else if (activeTab === 'activities') addMasterActivity(data);
            else if (activeTab === 'transports') addMasterTransport(data);
            else if (activeTab === 'plans') addMasterPlan({ ...data, days: [] });
            else if (activeTab === 'room-types') addMasterRoomType(data);
            else if (activeTab === 'meal-plans') addMasterMealPlan(data);
            else if (activeTab === 'lead-sources') addMasterLeadSource(data);
            else if (activeTab === 'terms') addMasterTermsTemplate(data);
            toast.success('Created successfully');
        }
        onClose();
    };

    return (
        <div className="space-y-5">
            {/* Cover Image Upload */}
            {['locations', 'hotels', 'activities', 'transports', 'room-types', 'meal-plans'].includes(activeTab) && (
                <div className="flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                    <ImageUpload
                        label="Cover Image"
                        value={form.image}
                        onChange={(url) => setForm({ ...form, image: url })}
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Recommended: 1200x800px landscape photo for best display.</p>
                </div>
            )}

            {/* Name / Title */}
            {activeTab !== 'plans' && activeTab !== 'terms' ? (
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                        Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        value={form.name || ''}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium transition-all"
                        placeholder={`e.g., ${activeTab === 'hotels' ? 'Taj Lake Palace' : activeTab === 'locations' ? 'Jaipur' : activeTab === 'activities' ? 'Desert Dune Bashing' : 'Enter name'}`}
                        autoFocus
                    />
                </div>
            ) : null}

            {/* Location Fields */}
            {activeTab === 'locations' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Location Type</label>
                        <select
                            value={form.type || 'City'}
                            onChange={e => setForm({ ...form, type: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-medium"
                        >
                            <option value="City">🏙️ City</option>
                            <option value="State">🗺️ State</option>
                            <option value="Country">🌐 Country</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Region / State</label>
                        <input
                            value={form.region || ''}
                            onChange={e => setForm({ ...form, region: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-medium"
                            placeholder="e.g. Rajasthan, North India"
                        />
                    </div>
                </div>
            )}

            {/* Hotel Specifics */}
            {activeTab === 'hotels' && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                                Destination Location <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.locationId || ''}
                                onChange={e => setForm({ ...form, locationId: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-medium"
                            >
                                <option value="">Select Location</option>
                                {masterLocations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.region || l.type})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Star Rating</label>
                            <div className="flex items-center gap-2">
                                <select
                                    value={form.rating || 4.5}
                                    onChange={e => setForm({ ...form, rating: Number(e.target.value) })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-medium"
                                >
                                    <option value="5">⭐⭐⭐⭐⭐ 5 Star Luxury</option>
                                    <option value="4.5">⭐⭐⭐⭐½ 4.5 Star Premium</option>
                                    <option value="4">⭐⭐⭐⭐ 4 Star Standard</option>
                                    <option value="3.5">⭐⭐⭐½ 3.5 Star Comfort</option>
                                    <option value="3">⭐⭐⭐ 3 Star Budget</option>
                                    <option value="2">⭐⭐ 2 Star Basic</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Base Price (₹/Night)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                <input
                                    type="number"
                                    value={form.pricePerNight || ''}
                                    onChange={e => setForm({ ...form, pricePerNight: e.target.value })}
                                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-medium"
                                    placeholder="e.g. 7500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Full Address / Area</label>
                            <input
                                value={form.address || ''}
                                onChange={e => setForm({ ...form, address: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-medium"
                                placeholder="e.g. Lake Pichola, Old City"
                            />
                        </div>
                    </div>

                    {/* Amenities Tagging */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Amenities & Facilities</label>
                        <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[44px]">
                            {Array.isArray(form.amenities) && form.amenities.map((a: string, i: number) => (
                                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                                    {a}
                                    <button type="button" onClick={() => removeAmenityTag(i)} className="hover:text-red-500">
                                        <X size={13} />
                                    </button>
                                </span>
                            ))}
                            <div className="flex-1 min-w-[140px] flex items-center gap-1">
                                <input
                                    value={amenityInput}
                                    onChange={e => setAmenityInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addAmenityTag(amenityInput);
                                        }
                                    }}
                                    placeholder="Type amenity & press Enter..."
                                    className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-200 outline-none px-1"
                                />
                            </div>
                        </div>
                        {/* Quick Suggestion Pills */}
                        <div className="flex flex-wrap gap-1 mt-2">
                            <span className="text-[11px] text-slate-400 font-medium mr-1 py-0.5">Quick Add:</span>
                            {POPULAR_AMENITIES.slice(0, 8).map(amenity => (
                                <button
                                    key={amenity}
                                    type="button"
                                    onClick={() => addAmenityTag(amenity)}
                                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:text-indigo-600 transition-colors"
                                >
                                    + {amenity}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Activity Specifics */}
            {activeTab === 'activities' && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                                Location <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.locationId || ''}
                                onChange={e => setForm({ ...form, locationId: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-medium"
                            >
                                <option value="">Select Location</option>
                                {masterLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Category</label>
                            <select
                                value={form.category || 'Leisure'}
                                onChange={e => setForm({ ...form, category: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-medium"
                            >
                                <option value="Sightseeing">📸 Sightseeing & Landmarks</option>
                                <option value="Adventure">🧗 Adventure & Trekking</option>
                                <option value="Cultural">🏛️ Cultural & Heritage</option>
                                <option value="Leisure">🏖️ Leisure & Wellness</option>
                                <option value="Food">🍲 Food & Nightlife</option>
                                <option value="Other">✨ Other</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Cost per Person (₹)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                <input
                                    type="number"
                                    value={form.cost || ''}
                                    onChange={e => setForm({ ...form, cost: e.target.value })}
                                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-medium"
                                    placeholder="e.g. 1500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Duration</label>
                            <input
                                value={form.duration || ''}
                                onChange={e => setForm({ ...form, duration: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-medium"
                                placeholder="e.g. 3 Hours / Full Day"
                            />
                        </div>
                    </div>
                </>
            )}

            {/* Transport Specifics */}
            {activeTab === 'transports' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Vehicle Type</label>
                            <select
                                value={form.type || 'Sedan'}
                                onChange={e => setForm({ ...form, type: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-medium"
                            >
                                <option value="Sedan">🚗 Sedan (Dzire / Etios)</option>
                                <option value="SUV">🚙 Premium SUV (Innova / Crysta)</option>
                                <option value="Tempo Traveller">🚐 Tempo Traveller (12-26 Seater)</option>
                                <option value="Bus">🚌 Luxury Coach / Bus</option>
                                <option value="Flight">✈️ Scheduled Flight</option>
                                <option value="Train">🚆 Railway / Train</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Passenger Capacity (Seats)</label>
                            <input
                                type="number"
                                value={form.capacity || ''}
                                onChange={e => setForm({ ...form, capacity: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-medium"
                                placeholder="e.g. 4"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Base Rate per Day (₹)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                            <input
                                type="number"
                                value={form.baseRate || ''}
                                onChange={e => setForm({ ...form, baseRate: e.target.value })}
                                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-medium"
                                placeholder="e.g. 3500"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Plan Templates Specifics */}
            {activeTab === 'plans' && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                            Plan Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            value={form.title || form.name || ''}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-medium"
                            placeholder="e.g. 5D/4N Royal Rajasthan Heritage Tour"
                            autoFocus
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Primary Location</label>
                            <select
                                value={form.locationId || ''}
                                onChange={e => setForm({ ...form, locationId: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-medium"
                            >
                                <option value="">Select Location</option>
                                {masterLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Duration (Days)</label>
                            <input
                                type="number"
                                value={form.duration || ''}
                                onChange={e => setForm({ ...form, duration: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-medium"
                                placeholder="e.g. 5"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Estimated Cost (₹)</label>
                            <input
                                type="number"
                                value={form.estimatedCost || ''}
                                onChange={e => setForm({ ...form, estimatedCost: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-medium"
                                placeholder="e.g. 24000"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Room Types */}
            {activeTab === 'room-types' && (
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Description</label>
                    <textarea
                        value={form.description || ''}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-medium h-24"
                        placeholder="e.g. King-sized bed, lake-facing balcony, luxury bathroom with bathtub"
                    />
                </div>
            )}

            {/* Meal Plans */}
            {activeTab === 'meal-plans' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Code *</label>
                            <select
                                value={form.code || 'CP'}
                                onChange={e => {
                                    const c = e.target.value;
                                    setForm({ ...form, code: c, description: MEAL_PLAN_DESCRIPTIONS[c as any] || form.description });
                                }}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-bold"
                            >
                                {Object.keys(MEAL_PLAN_DESCRIPTIONS).map(code => (
                                    <option key={code} value={code}>{code}</option>
                                ))}
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Description</label>
                            <input
                                value={form.description || MEAL_PLAN_DESCRIPTIONS[form.code as keyof typeof MEAL_PLAN_DESCRIPTIONS] || ''}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-medium"
                                placeholder="e.g. Breakfast included"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Lead Sources */}
            {activeTab === 'lead-sources' && (
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Source Category</label>
                    <select
                        value={form.category || 'Organic'}
                        onChange={e => setForm({ ...form, category: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-medium"
                    >
                        <option value="Organic">🌱 Organic / Search</option>
                        <option value="Paid">🎯 Paid Ads (Meta / Google)</option>
                        <option value="Referral">🤝 Referral / Word of Mouth</option>
                        <option value="Direct">⚡ Direct Walk-in / Call</option>
                    </select>
                </div>
            )}

            {/* Terms & Conditions Template */}
            {activeTab === 'terms' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                                Policy Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                value={form.title || form.name || ''}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-medium"
                                placeholder="e.g. Standard Cancellation Policy"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Category</label>
                            <select
                                value={form.category || 'Cancellation Policy'}
                                onChange={e => setForm({ ...form, category: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-medium"
                            >
                                <option value="Booking & Payment">Booking & Payment</option>
                                <option value="Cancellation Policy">Cancellation Policy</option>
                                <option value="Travel Insurance">Travel Insurance</option>
                                <option value="Pricing & Inclusions">Pricing & Inclusions</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    {/* Pre-built policy presets */}
                    <div>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1.5 flex items-center gap-1.5">
                            <Sparkles size={13} className="text-amber-500" /> Apply Pre-Built Policy Preset:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                            {TERMS_PRESETS.map((preset, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => {
                                        setForm({
                                            ...form,
                                            title: preset.title,
                                            category: preset.category,
                                            content: preset.content
                                        });
                                        toast.success(`Applied ${preset.label}`);
                                    }}
                                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors border border-indigo-200 dark:border-indigo-800/40"
                                >
                                    + {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Policy Content</label>
                            <span className="text-[11px] text-slate-400">Use ## for headings, • for bullets</span>
                        </div>
                        <textarea
                            value={form.content || ''}
                            onChange={e => setForm({ ...form, content: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono text-xs leading-relaxed h-48 focus:ring-2 focus:ring-indigo-500/20"
                            placeholder="## Cancellation Policy&#10;• 100% refund 30+ days prior&#10;• 50% refund 15-29 days prior"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={form.isDefault || false}
                            onChange={e => setForm({ ...form, isDefault: e.target.checked })}
                            id="isDefaultTemplate"
                            className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <label htmlFor="isDefaultTemplate" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                            Set as Default Template for this category (used automatically in new proposals & quotes)
                        </label>
                    </div>
                </div>
            )}

            {/* Status Selector */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Active Status</span>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setForm({ ...form, status: 'Active' })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${form.status === 'Active' ? 'bg-green-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                    >
                        Active
                    </button>
                    <button
                        type="button"
                        onClick={() => setForm({ ...form, status: 'Inactive' })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${form.status === 'Inactive' ? 'bg-red-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                    >
                        Inactive
                    </button>
                </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
                <button
                    type="button"
                    onClick={handleSave}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
                >
                    {editingItem ? 'Save Changes' : 'Create Master Item'}
                </button>
            </div>
        </div>
    );
};

// --- Cascade Protection & Safe Delete Modal ---
const SafeDeleteModal: React.FC<{
    item: any;
    tab: MasterTab;
    dependency: MasterDependency;
    onClose: () => void;
    onDeactivate: () => void;
    onForceDelete: () => void;
}> = ({ item, tab, dependency, onClose, onDeactivate, onForceDelete }) => {
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[250] p-4 animate-in fade-in">
            <div className="bg-white dark:bg-[#1a2332] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in-95">
                <div className="p-6 bg-red-50 dark:bg-red-950/40 border-b border-red-100 dark:border-red-900/30 flex items-start gap-4">
                    <div className="size-12 rounded-2xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-red-500/30">
                        <ShieldAlert size={26} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-red-900 dark:text-red-200">
                            {dependency.total > 0 ? 'Active Dependencies Detected' : 'Confirm Deletion'}
                        </h3>
                        <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                            {item.name || item.title} ({tab.toUpperCase()})
                        </p>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    {dependency.total > 0 ? (
                        <>
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                This master record cannot be safely deleted because it is currently linked to <strong className="text-slate-900 dark:text-white font-bold">{dependency.total} live records</strong> in your system. Deleting it may cause missing data in day planners and quotes.
                            </p>

                            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 max-h-48 overflow-y-auto">
                                {dependency.packages.length > 0 && (
                                    <div>
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                            📦 Packages ({dependency.packages.length}):
                                        </span>
                                        <ul className="text-xs space-y-1">
                                            {dependency.packages.slice(0, 5).map(p => (
                                                <li key={p.id} className="text-slate-700 dark:text-slate-300 font-medium truncate">• {p.title}</li>
                                            ))}
                                            {dependency.packages.length > 5 && (
                                                <li className="text-slate-400 text-[11px] font-bold">+ {dependency.packages.length - 5} more packages</li>
                                            )}
                                        </ul>
                                    </div>
                                )}
                                {dependency.bookings.length > 0 && (
                                    <div>
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                            📑 Bookings ({dependency.bookings.length}):
                                        </span>
                                        <ul className="text-xs space-y-1">
                                            {dependency.bookings.slice(0, 5).map(b => (
                                                <li key={b.id} className="text-slate-700 dark:text-slate-300 font-medium truncate">• {b.title} ({b.customerName || b.status})</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/30 flex items-start gap-2">
                                <Info size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-800 dark:text-amber-300">
                                    <strong>Recommendation:</strong> Click <strong>Deactivate Instead</strong>. This hides the item from new package dropdowns while keeping existing tour records and historical bookings intact.
                                </p>
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Are you sure you want to permanently delete <strong className="text-slate-900 dark:text-white font-bold">{item.name || item.title}</strong>? This action cannot be undone.
                        </p>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        {dependency.total > 0 ? (
                            <>
                                <button
                                    onClick={onDeactivate}
                                    className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
                                >
                                    <CheckCircle2 size={16} /> Deactivate Instead (Safe)
                                </button>
                                <button
                                    onClick={onForceDelete}
                                    className="py-2.5 px-4 bg-red-600/10 hover:bg-red-600 text-red-600 hover:text-white font-bold text-xs rounded-xl transition-all border border-red-300 dark:border-red-800"
                                >
                                    Force Delete
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={onForceDelete}
                                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-1.5"
                            >
                                <Trash2 size={16} /> Permanently Delete
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 360° Slide-Over Detail Drawer ---
const MasterDetailDrawer: React.FC<{
    item: any;
    tab: MasterTab;
    dependency: MasterDependency;
    onClose: () => void;
    onEdit: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
}> = ({ item, tab, dependency, onClose, onEdit, onDuplicate, onDelete }) => {
    const navigate = useNavigate();

    const title = item.name || item.title || 'Untitled Master';
    const status = item.status || 'Active';

    return (
        <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white dark:bg-[#121926] shadow-2xl border-l border-slate-200 dark:border-slate-800 z-[200] flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                    <div className="size-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        {tab === 'locations' && <MapPin size={24} />}
                        {tab === 'hotels' && <Building2 size={24} />}
                        {tab === 'activities' && <Bike size={24} />}
                        {tab === 'transports' && <Car size={24} />}
                        {tab === 'plans' && <Calendar size={24} />}
                        {tab === 'room-types' && <BedDouble size={24} />}
                        {tab === 'meal-plans' && <Utensils size={24} />}
                        {tab === 'lead-sources' && <Globe size={24} />}
                        {tab === 'terms' && <FileText size={24} />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                                {tab.replace('-', ' ')}
                            </span>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                {status}
                            </span>
                        </div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1 leading-tight">{title}</h2>
                    </div>
                </div>
                <button onClick={onClose} className="size-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center transition-colors text-slate-500">
                    <X size={18} />
                </button>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Cover Image if available */}
                {item.image && (
                    <div className="h-48 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative">
                        <img src={item.image} alt={title} className="w-full h-full object-cover" />
                    </div>
                )}

                {/* Core Specifications */}
                <div className="grid grid-cols-2 gap-3">
                    {tab === 'locations' && (
                        <>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                                <span className="text-[11px] font-bold text-slate-400 uppercase">Type</span>
                                <p className="text-sm font-black text-slate-800 dark:text-slate-200 mt-0.5">{item.type || 'City'}</p>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                                <span className="text-[11px] font-bold text-slate-400 uppercase">Region</span>
                                <p className="text-sm font-black text-slate-800 dark:text-slate-200 mt-0.5">{item.region || '-'}</p>
                            </div>
                        </>
                    )}

                    {tab === 'hotels' && (
                        <>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                                <span className="text-[11px] font-bold text-slate-400 uppercase">Star Rating</span>
                                <p className="text-sm font-black text-amber-500 mt-0.5 flex items-center gap-1">
                                    <Star size={15} fill="currentColor" /> {item.rating || 5} Stars
                                </p>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                                <span className="text-[11px] font-bold text-slate-400 uppercase">Price per Night</span>
                                <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                                    ₹{Number(item.pricePerNight || 0).toLocaleString()}
                                </p>
                            </div>
                        </>
                    )}

                    {tab === 'activities' && (
                        <>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                                <span className="text-[11px] font-bold text-slate-400 uppercase">Category</span>
                                <p className="text-sm font-black text-slate-800 dark:text-slate-200 mt-0.5">{item.category || 'Leisure'}</p>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                                <span className="text-[11px] font-bold text-slate-400 uppercase">Cost per Pax</span>
                                <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                                    ₹{Number(item.cost || 0).toLocaleString()}
                                </p>
                            </div>
                        </>
                    )}

                    {tab === 'transports' && (
                        <>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                                <span className="text-[11px] font-bold text-slate-400 uppercase">Fleet Type</span>
                                <p className="text-sm font-black text-slate-800 dark:text-slate-200 mt-0.5">{item.type || 'Sedan'}</p>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                                <span className="text-[11px] font-bold text-slate-400 uppercase">Seating Capacity</span>
                                <p className="text-sm font-black text-slate-800 dark:text-slate-200 mt-0.5">{item.capacity || 4} Seats</p>
                            </div>
                        </>
                    )}
                </div>

                {/* Hotel Address & Amenities */}
                {tab === 'hotels' && (
                    <div className="space-y-4">
                        {item.address && (
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Address</span>
                                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium flex items-start gap-1.5">
                                    <MapPin size={15} className="text-indigo-500 shrink-0 mt-0.5" />
                                    {item.address}
                                </p>
                            </div>
                        )}
                        {Array.isArray(item.amenities) && item.amenities.length > 0 && (
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Amenities</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {item.amenities.map((a: string, i: number) => (
                                        <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700">
                                            {a}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Terms & Conditions Live Rich Preview */}
                {tab === 'terms' && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Document Preview</span>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(item.content || '');
                                    toast.success('Policy text copied to clipboard');
                                }}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                            >
                                <Copy size={13} /> Copy Text
                            </button>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-sans leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                            {item.content || 'No content provided.'}
                        </div>
                    </div>
                )}

                {/* Plan Template Interactive Visualizer */}
                {tab === 'plans' && (
                    <div className="space-y-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Itinerary Highlights</span>
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                            <div className="flex justify-between text-xs font-bold">
                                <span className="text-slate-500">Duration:</span>
                                <span className="text-slate-900 dark:text-white">{item.duration || 1} Days</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold">
                                <span className="text-slate-500">Est. Cost:</span>
                                <span className="text-indigo-600 dark:text-indigo-400">₹{Number(item.estimatedCost || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Cross-Module Linked Usages */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers size={14} className="text-indigo-500" /> Linked Usages ({dependency.total})
                        </span>
                        {dependency.total > 0 && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                                Active In System
                            </span>
                        )}
                    </div>

                    {dependency.total > 0 ? (
                        <div className="space-y-2">
                            {dependency.packages.map(p => (
                                <div key={p.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-indigo-600">PKG</span>
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[240px]">{p.title}</span>
                                    </div>
                                    <button
                                        onClick={() => navigate('/admin/packages')}
                                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                    >
                                        View <ChevronRight size={13} />
                                    </button>
                                </div>
                            ))}
                            {dependency.bookings.map(b => (
                                <div key={b.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-emerald-600">BK</span>
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[240px]">{b.title}</span>
                                    </div>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                        {b.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-400 italic">No packages or active bookings are currently referencing this master item.</p>
                    )}
                </div>
            </div>

            {/* Drawer Bottom Actions */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121926] flex items-center gap-2">
                <button
                    onClick={onEdit}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                    <Edit2 size={14} /> Edit Record
                </button>
                <button
                    onClick={onDuplicate}
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                    title="Duplicate as Copy"
                >
                    <Copy size={16} />
                </button>
                <button
                    onClick={onDelete}
                    className="p-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title="Delete / Deactivate"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
};

// --- Bulk Location Reassign Modal ---
const BulkReassignLocationModal: React.FC<{
    selectedCount: number;
    locations: MasterLocation[];
    onClose: () => void;
    onReassign: (targetLocationId: string) => void;
}> = ({ selectedCount, locations, onClose, onReassign }) => {
    const [targetLocationId, setTargetLocationId] = useState('');

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[250] p-4 animate-in fade-in">
            <div className="bg-white dark:bg-[#1a2332] rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                    <MapPin className="text-indigo-600" size={20} /> Reassign Location for {selectedCount} Items
                </h3>
                <p className="text-xs text-slate-500 mb-4">Choose the new target destination to associate with all selected records.</p>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Target Location</label>
                        <select
                            value={targetLocationId}
                            onChange={e => setTargetLocationId(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-medium"
                        >
                            <option value="">Select Destination</option>
                            {locations.map(l => (
                                <option key={l.id} value={l.id}>{l.name} ({l.region || l.type})</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={() => {
                                if (!targetLocationId) return toast.error('Please select a destination');
                                onReassign(targetLocationId);
                            }}
                            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
                        >
                            Apply Reassignment
                        </button>
                        <button onClick={onClose} className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Bulk Price Adjuster Modal ---
const BulkPriceAdjustModal: React.FC<{
    selectedCount: number;
    onClose: () => void;
    onApply: (type: 'percent' | 'flat', value: number, isIncrease: boolean) => void;
}> = ({ selectedCount, onClose, onApply }) => {
    const [mode, setMode] = useState<'percent' | 'flat'>('percent');
    const [isIncrease, setIsIncrease] = useState(true);
    const [amount, setAmount] = useState<number>(10);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[250] p-4 animate-in fade-in">
            <div className="bg-white dark:bg-[#1a2332] rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                    <Percent className="text-emerald-600" size={20} /> Bulk Price Adjustment
                </h3>
                <p className="text-xs text-slate-500 mb-4">Adjust pricing simultaneously across {selectedCount} selected items.</p>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setIsIncrease(true)}
                            className={`py-2 rounded-xl text-xs font-bold transition-all ${isIncrease ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                        >
                            + Price Hike / Markup
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsIncrease(false)}
                            className={`py-2 rounded-xl text-xs font-bold transition-all ${!isIncrease ? 'bg-red-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                        >
                            - Seasonal Discount
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setMode('percent')}
                            className={`py-2 rounded-xl text-xs font-bold transition-all ${mode === 'percent' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                        >
                            Percentage (%)
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('flat')}
                            className={`py-2 rounded-xl text-xs font-bold transition-all ${mode === 'flat' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                        >
                            Flat Amount (₹)
                        </button>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                            {mode === 'percent' ? 'Percentage Value (%)' : 'Amount in Rupees (₹)'}
                        </label>
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(Number(e.target.value))}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-bold text-lg"
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={() => {
                                if (amount <= 0) return toast.error('Please enter a valid amount');
                                onApply(mode, amount, isIncrease);
                            }}
                            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
                        >
                            Apply to {selectedCount} Items
                        </button>
                        <button onClick={onClose} className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const Masters: React.FC = () => {
    const {
        masterLocations, masterHotels, masterActivities, masterTransports, masterPlans,
        masterRoomTypes, masterMealPlans, masterLeadSources, masterTermsTemplates,
        packages, bookings, leads,
        addMasterLocation, updateMasterLocation, deleteMasterLocation,
        addMasterHotel, updateMasterHotel, deleteMasterHotel,
        addMasterActivity, updateMasterActivity, deleteMasterActivity,
        addMasterTransport, updateMasterTransport, deleteMasterTransport,
        addMasterPlan, updateMasterPlan, deleteMasterPlan,
        addMasterRoomType, updateMasterRoomType, deleteMasterRoomType,
        addMasterMealPlan, updateMasterMealPlan, deleteMasterMealPlan,
        addMasterLeadSource, updateMasterLeadSource, deleteMasterLeadSource,
        addMasterTermsTemplate, updateMasterTermsTemplate, deleteMasterTermsTemplate,
    } = useData();

    const navigate = useNavigate();

    // --- State ---
    const [activeTab, setActiveTab] = useState<MasterTab>('locations');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [subFilter, setSubFilter] = useState<string>('all');
    const [locationFilter, setLocationFilter] = useState<string>('all');

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 250);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [inspectingItem, setInspectingItem] = useState<any>(null);
    const [deleteTargetItem, setDeleteTargetItem] = useState<any>(null);
    const [showReassignModal, setShowReassignModal] = useState(false);
    const [showPriceAdjustModal, setShowPriceAdjustModal] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filters & Sorting
    const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Inactive'>('All');
    const [sortBy, setSortBy] = useState<string>('name');
    const [sortDir, setSortDir] = useState<SortDirection>('asc');

    // Reset selection and subfilters on tab change
    useEffect(() => {
        setSelectedItems(new Set());
        setFilterStatus('All');
        setSearchQuery('');
        setSubFilter('all');
        setLocationFilter('all');
        setSortBy(activeTab === 'plans' || activeTab === 'terms' ? 'title' : activeTab === 'meal-plans' ? 'code' : 'name');
        setSortDir('asc');
        setInspectingItem(null);
    }, [activeTab]);

    const tabs: { id: MasterTab; label: string; icon: React.ReactNode; count?: number }[] = [
        { id: 'analytics', label: 'Analytics', icon: <span className="material-symbols-outlined">monitoring</span> },
        { id: 'locations', label: 'Locations', icon: <MapPin size={16} />, count: masterLocations.length },
        { id: 'hotels', label: 'Hotels', icon: <Building2 size={16} />, count: masterHotels.length },
        { id: 'room-types', label: 'Room Types', icon: <BedDouble size={16} />, count: masterRoomTypes.length },
        { id: 'meal-plans', label: 'Meal Plans', icon: <Utensils size={16} />, count: masterMealPlans.length },
        { id: 'activities', label: 'Activities', icon: <Bike size={16} />, count: masterActivities.length },
        { id: 'transports', label: 'Transports', icon: <Car size={16} />, count: masterTransports.length },
        { id: 'lead-sources', label: 'Lead Sources', icon: <Globe size={16} />, count: masterLeadSources.length },
        { id: 'terms', label: 'Terms & Conditions', icon: <FileText size={16} />, count: masterTermsTemplates.length },
        { id: 'plans', label: 'Plan Templates', icon: <Calendar size={16} />, count: masterPlans.length },
    ];

    const getLocationNameById = (id: string) => masterLocations.find(l => l.id === id)?.name || 'Unknown';

    // Helper for dependency check
    const getDependency = (item: any) => {
        return calculateMasterDependencies(item, activeTab, {
            packages,
            bookings,
            leads,
            masterHotels,
            masterActivities,
            masterPlans,
            masterLocations
        });
    };

    const handleSelectAll = (items: any[]) => {
        if (selectedItems.size === items.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(items.map(i => i.id)));
        }
    };

    const handleSelectOne = (id: string) => {
        const newSet = new Set(selectedItems);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedItems(newSet);
    };

    const handleDuplicate = (item: any) => {
        const prefix = activeTab === 'locations' ? 'LOC' : activeTab === 'hotels' ? 'HTL' : activeTab === 'activities' ? 'ACT' : activeTab === 'transports' ? 'TRN' : activeTab === 'plans' ? 'PLN' : activeTab === 'room-types' ? 'RT' : activeTab === 'meal-plans' ? 'MP' : activeTab === 'lead-sources' ? 'LS' : 'TT';
        const newItem = { ...item, id: generateId(prefix) };
        if (newItem.name) newItem.name += ' (Copy)';
        else if (newItem.title) newItem.title += ' (Copy)';

        if (activeTab === 'locations') addMasterLocation(newItem);
        else if (activeTab === 'hotels') addMasterHotel(newItem);
        else if (activeTab === 'activities') addMasterActivity(newItem);
        else if (activeTab === 'transports') addMasterTransport(newItem);
        else if (activeTab === 'plans') addMasterPlan({ ...newItem, days: [] });
        else if (activeTab === 'room-types') addMasterRoomType(newItem);
        else if (activeTab === 'meal-plans') addMasterMealPlan(newItem);
        else if (activeTab === 'lead-sources') addMasterLeadSource(newItem);
        else if (activeTab === 'terms') addMasterTermsTemplate(newItem);

        toast.success('Duplicated successfully!');
    };

    const handleDeleteClick = (item: any) => {
        setDeleteTargetItem(item);
    };

    const handleConfirmDeactivate = () => {
        if (!deleteTargetItem) return;
        const updateFuncs: Record<string, (id: string, data: any) => void> = {
            locations: updateMasterLocation,
            hotels: updateMasterHotel,
            activities: updateMasterActivity,
            transports: updateMasterTransport,
            plans: updateMasterPlan,
            'room-types': updateMasterRoomType,
            'meal-plans': updateMasterMealPlan,
            'lead-sources': updateMasterLeadSource,
            'terms': updateMasterTermsTemplate,
        };
        if (updateFuncs[activeTab]) {
            updateFuncs[activeTab](deleteTargetItem.id, { status: 'Inactive' });
            toast.success(`Deactivated ${deleteTargetItem.name || deleteTargetItem.title}`);
        }
        setDeleteTargetItem(null);
        if (inspectingItem?.id === deleteTargetItem.id) setInspectingItem(null);
    };

    const handleConfirmForceDelete = () => {
        if (!deleteTargetItem) return;
        const deleteFuncs: Record<string, (id: string) => void> = {
            locations: deleteMasterLocation,
            hotels: deleteMasterHotel,
            activities: deleteMasterActivity,
            transports: deleteMasterTransport,
            plans: deleteMasterPlan,
            'room-types': deleteMasterRoomType,
            'meal-plans': deleteMasterMealPlan,
            'lead-sources': deleteMasterLeadSource,
            'terms': deleteMasterTermsTemplate,
        };
        if (deleteFuncs[activeTab]) {
            deleteFuncs[activeTab](deleteTargetItem.id);
            toast.success(`Deleted successfully`);
        }
        setDeleteTargetItem(null);
        if (inspectingItem?.id === deleteTargetItem.id) setInspectingItem(null);
    };

    // Bulk status update
    const bulkUpdateStatus = (status: 'Active' | 'Inactive') => {
        const updateFuncs: Record<string, (id: string, data: any) => void> = {
            locations: updateMasterLocation,
            hotels: updateMasterHotel,
            activities: updateMasterActivity,
            transports: updateMasterTransport,
            plans: updateMasterPlan,
            'room-types': updateMasterRoomType,
            'meal-plans': updateMasterMealPlan,
            'lead-sources': updateMasterLeadSource,
            'terms': updateMasterTermsTemplate,
        };

        if (updateFuncs[activeTab]) {
            selectedItems.forEach(id => updateFuncs[activeTab](id, { status }));
            setSelectedItems(new Set());
            toast.success(`${selectedItems.size} items updated to ${status}`);
        }
    };

    // Bulk Location Reassignment
    const handleBulkReassignLocation = (targetLocationId: string) => {
        if (activeTab === 'hotels') {
            selectedItems.forEach(id => updateMasterHotel(id, { locationId: targetLocationId }));
        } else if (activeTab === 'activities') {
            selectedItems.forEach(id => updateMasterActivity(id, { locationId: targetLocationId }));
        } else if (activeTab === 'plans') {
            selectedItems.forEach(id => updateMasterPlan(id, { locationId: targetLocationId }));
        }
        toast.success(`Reassigned ${selectedItems.size} items to ${getLocationNameById(targetLocationId)}`);
        setSelectedItems(new Set());
        setShowReassignModal(false);
    };

    // Bulk Price Adjustment
    const handleBulkPriceAdjust = (type: 'percent' | 'flat', value: number, isIncrease: boolean) => {
        const factor = isIncrease ? 1 : -1;

        if (activeTab === 'hotels') {
            masterHotels.filter(h => selectedItems.has(h.id)).forEach(h => {
                const currentPrice = Number(h.pricePerNight) || 0;
                const change = type === 'percent' ? Math.round(currentPrice * (value / 100)) : value;
                const newPrice = Math.max(0, currentPrice + (factor * change));
                updateMasterHotel(h.id, { pricePerNight: newPrice });
            });
        } else if (activeTab === 'activities') {
            masterActivities.filter(a => selectedItems.has(a.id)).forEach(a => {
                const currentPrice = Number(a.cost) || 0;
                const change = type === 'percent' ? Math.round(currentPrice * (value / 100)) : value;
                const newPrice = Math.max(0, currentPrice + (factor * change));
                updateMasterActivity(a.id, { cost: newPrice });
            });
        } else if (activeTab === 'transports') {
            masterTransports.filter(t => selectedItems.has(t.id)).forEach(t => {
                const currentPrice = Number(t.baseRate) || 0;
                const change = type === 'percent' ? Math.round(currentPrice * (value / 100)) : value;
                const newPrice = Math.max(0, currentPrice + (factor * change));
                updateMasterTransport(t.id, { baseRate: newPrice });
            });
        }

        toast.success(`Updated pricing for ${selectedItems.size} items`);
        setSelectedItems(new Set());
        setShowPriceAdjustModal(false);
    };

    // --- Sample Excel Template Downloader ---
    const downloadSampleTemplate = () => {
        if (activeTab === 'analytics') return toast.error('Select a master data tab');

        let headers: any[] = [];
        let filename = `Shrawello_${activeTab}_Template.xlsx`;

        switch (activeTab) {
            case 'locations':
                headers = [
                    { 'Name*': 'Jaipur', 'Type (City/State/Country)': 'City', 'Region': 'Rajasthan', 'Status': 'Active' },
                    { 'Name*': 'Goa', 'Type (City/State/Country)': 'State', 'Region': 'West India', 'Status': 'Active' }
                ];
                break;
            case 'hotels':
                headers = [
                    { 'Name*': 'The Grand Palace', 'Location Name*': 'Jaipur', 'Rating (1-5)': 5, 'Price Per Night (₹)': 8500, 'Address': 'Civil Lines, Jaipur', 'Amenities': 'Free WiFi, Swimming Pool, Spa, Gym', 'Status': 'Active' },
                    { 'Name*': 'Seaside Beach Resort', 'Location Name*': 'Goa', 'Rating (1-5)': 4, 'Price Per Night (₹)': 4500, 'Address': 'Calangute, Goa', 'Amenities': 'Free WiFi, Pool, Beachfront', 'Status': 'Active' }
                ];
                break;
            case 'activities':
                headers = [
                    { 'Name*': 'Hot Air Balloon Safari', 'Location Name*': 'Jaipur', 'Category (Sightseeing/Adventure/Cultural/Leisure)': 'Adventure', 'Cost (₹)': 3500, 'Duration': '2 Hours', 'Status': 'Active' },
                    { 'Name*': 'Amber Fort Heritage Walk', 'Location Name*': 'Jaipur', 'Category (Sightseeing/Adventure/Cultural/Leisure)': 'Cultural', 'Cost (₹)': 800, 'Duration': '3 Hours', 'Status': 'Active' }
                ];
                break;
            case 'transports':
                headers = [
                    { 'Name*': 'Innova Crysta AC', 'Type (Sedan/SUV/Tempo Traveller/Bus/Flight/Train)': 'SUV', 'Capacity (Seats)': 6, 'Base Rate (₹)': 3500, 'Status': 'Active' },
                    { 'Name*': 'Dzire / Etios AC', 'Type (Sedan/SUV/Tempo Traveller/Bus/Flight/Train)': 'Sedan', 'Capacity (Seats)': 4, 'Base Rate (₹)': 2200, 'Status': 'Active' }
                ];
                break;
            case 'room-types':
                headers = [
                    { 'Name*': 'Deluxe Pool View', 'Description': 'Spacious room with private balcony facing the pool', 'Status': 'Active' },
                    { 'Name*': 'Executive Suite', 'Description': 'Luxury suite with living room and king size bed', 'Status': 'Active' }
                ];
                break;
            case 'meal-plans':
                headers = [
                    { 'Code* (EP/CP/MAP/AP/AI)': 'CP', 'Name*': 'Continental Plan', 'Description': 'Room with daily buffet breakfast included', 'Status': 'Active' },
                    { 'Code* (EP/CP/MAP/AP/AI)': 'MAP', 'Name*': 'Modified American Plan', 'Description': 'Room with breakfast and dinner included', 'Status': 'Active' }
                ];
                break;
            case 'lead-sources':
                headers = [
                    { 'Name*': 'Google Search Ads', 'Category (Organic/Paid/Referral/Direct)': 'Paid', 'Status': 'Active' },
                    { 'Name*': 'Instagram Organic', 'Category (Organic/Paid/Referral/Direct)': 'Organic', 'Status': 'Active' }
                ];
                break;
            case 'terms':
                headers = [
                    { 'Title*': 'Standard Cancellation Policy', 'Category': 'Cancellation Policy', 'Content': '100% refund 30+ days prior to travel', 'Is Default (TRUE/FALSE)': 'TRUE', 'Status': 'Active' }
                ];
                break;
            case 'plans':
                headers = [
                    { 'Title*': 'Golden Triangle 4N/5D', 'Location Name*': 'Jaipur', 'Duration (Days)': 5, 'Estimated Cost (₹)': 22000, 'Status': 'Active' }
                ];
                break;
        }

        const ws = XLSX.utils.json_to_sheet(headers);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sample Template');
        XLSX.writeFile(wb, filename);
        toast.success(`Downloaded sample template for ${activeTab}`);
    };

    // --- Import / Export ---
    const handleExport = (exportOnlySelected = false) => {
        if (activeTab === 'analytics') return toast.error('Please select a data tab to export.');

        let dataToExport = exportOnlySelected
            ? processedData.filter(item => selectedItems.has(item.id))
            : processedData;

        if (dataToExport.length === 0) return toast.error('No items to export');

        const cleanData = dataToExport.map(item => {
            const row: any = { ...item };
            if (Array.isArray(row.amenities)) row.amenities = row.amenities.join(', ');
            if (row.locationId) row.locationName = getLocationNameById(row.locationId);
            return row;
        });

        const ws = XLSX.utils.json_to_sheet(cleanData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, activeTab);
        XLSX.writeFile(wb, `Shrawello_${activeTab}_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success(`Exported ${dataToExport.length} items to Excel`);
    };

    const handleImportClick = () => {
        if (activeTab === 'analytics') return toast.error('Please select a data tab to import into.');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

                if (!Array.isArray(rows) || rows.length === 0) {
                    return toast.error('The uploaded file is empty or formatted incorrectly.');
                }

                let count = 0;
                rows.forEach(row => {
                    const name = row['Name*'] || row['Name'] || row['Title*'] || row['Title'] || row['name'] || row['title'];
                    if (!name) return;

                    const prefix = activeTab === 'locations' ? 'LOC' : activeTab === 'hotels' ? 'HTL' : activeTab === 'activities' ? 'ACT' : activeTab === 'transports' ? 'TRN' : activeTab === 'plans' ? 'PLN' : activeTab === 'room-types' ? 'RT' : activeTab === 'meal-plans' ? 'MP' : activeTab === 'lead-sources' ? 'LS' : 'TT';

                    const newItem: any = {
                        id: generateId(prefix),
                        name: name,
                        title: name,
                        status: row['Status'] || 'Active',
                    };

                    // Map location by name if provided
                    const locName = row['Location Name*'] || row['Location Name'] || row['Location'] || row['locationName'];
                    if (locName) {
                        const foundLoc = masterLocations.find(l => l.name.toLowerCase().trim() === String(locName).toLowerCase().trim());
                        if (foundLoc) newItem.locationId = foundLoc.id;
                    }

                    if (activeTab === 'locations') {
                        newItem.type = row['Type (City/State/Country)'] || row['Type'] || 'City';
                        newItem.region = row['Region'] || '';
                        addMasterLocation(newItem);
                    } else if (activeTab === 'hotels') {
                        newItem.rating = Number(row['Rating (1-5)'] || row['Rating']) || 4;
                        newItem.pricePerNight = Number(row['Price Per Night (₹)'] || row['Price']) || 0;
                        newItem.address = row['Address'] || '';
                        const amenitiesStr = row['Amenities'] || '';
                        newItem.amenities = typeof amenitiesStr === 'string' ? amenitiesStr.split(',').map(s => s.trim()).filter(Boolean) : [];
                        addMasterHotel(newItem);
                    } else if (activeTab === 'activities') {
                        newItem.category = row['Category (Sightseeing/Adventure/Cultural/Leisure)'] || row['Category'] || 'Leisure';
                        newItem.cost = Number(row['Cost (₹)'] || row['Cost']) || 0;
                        newItem.duration = row['Duration'] || '';
                        addMasterActivity(newItem);
                    } else if (activeTab === 'transports') {
                        newItem.type = row['Type (Sedan/SUV/Tempo Traveller/Bus/Flight/Train)'] || row['Type'] || 'Sedan';
                        newItem.capacity = Number(row['Capacity (Seats)'] || row['Capacity']) || 4;
                        newItem.baseRate = Number(row['Base Rate (₹)'] || row['Base Rate']) || 0;
                        addMasterTransport(newItem);
                    } else if (activeTab === 'room-types') {
                        newItem.description = row['Description'] || '';
                        addMasterRoomType(newItem);
                    } else if (activeTab === 'meal-plans') {
                        newItem.code = row['Code* (EP/CP/MAP/AP/AI)'] || row['Code'] || 'CP';
                        newItem.description = row['Description'] || '';
                        addMasterMealPlan(newItem);
                    } else if (activeTab === 'lead-sources') {
                        newItem.category = row['Category (Organic/Paid/Referral/Direct)'] || row['Category'] || 'Organic';
                        addMasterLeadSource(newItem);
                    } else if (activeTab === 'terms') {
                        newItem.category = row['Category'] || 'Other';
                        newItem.content = row['Content'] || '';
                        newItem.isDefault = String(row['Is Default (TRUE/FALSE)']).toUpperCase() === 'TRUE';
                        addMasterTermsTemplate(newItem);
                    } else if (activeTab === 'plans') {
                        newItem.duration = Number(row['Duration (Days)'] || row['Duration']) || 1;
                        newItem.estimatedCost = Number(row['Estimated Cost (₹)'] || row['Estimated Cost']) || 0;
                        newItem.days = [];
                        addMasterPlan(newItem);
                    }
                    count++;
                });

                toast.success(`Successfully imported ${count} items into ${activeTab}!`);
            } catch (err: any) {
                toast.error(`Import failed: ${err.message}`);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    // --- Data Processing & Filtering ---
    const getProcessedData = () => {
        let data: any[] = [];
        switch (activeTab) {
            case 'locations': data = masterLocations; break;
            case 'hotels': data = masterHotels; break;
            case 'activities': data = masterActivities; break;
            case 'transports': data = masterTransports; break;
            case 'plans': data = masterPlans; break;
            case 'room-types': data = masterRoomTypes; break;
            case 'meal-plans': data = masterMealPlans; break;
            case 'lead-sources': data = masterLeadSources; break;
            case 'terms': data = masterTermsTemplates; break;
            default: return [];
        }

        // Subfilter logic
        if (subFilter !== 'all') {
            if (activeTab === 'locations') {
                if (subFilter === 'cities') data = data.filter(d => d.type === 'City');
                else if (subFilter === 'states') data = data.filter(d => d.type === 'State');
                else if (subFilter === 'countries') data = data.filter(d => d.type === 'Country');
            } else if (activeTab === 'hotels') {
                if (subFilter === '5star') data = data.filter(d => d.rating >= 5);
                else if (subFilter === '4star') data = data.filter(d => d.rating >= 4 && d.rating < 5);
                else if (subFilter === '3star') data = data.filter(d => d.rating < 4);
                else if (subFilter === 'budget') data = data.filter(d => d.pricePerNight < 5000);
                else if (subFilter === 'mid') data = data.filter(d => d.pricePerNight >= 5000 && d.pricePerNight <= 10000);
                else if (subFilter === 'luxury') data = data.filter(d => d.pricePerNight > 10000);
            } else if (activeTab === 'activities') {
                data = data.filter(d => (d.category || '').toLowerCase() === subFilter.toLowerCase());
            } else if (activeTab === 'transports') {
                data = data.filter(d => (d.type || '').toLowerCase() === subFilter.toLowerCase());
            } else if (activeTab === 'terms') {
                if (subFilter === 'default') data = data.filter(d => d.isDefault);
                else data = data.filter(d => (d.category || '').toLowerCase() === subFilter.toLowerCase());
            } else if (activeTab === 'lead-sources') {
                data = data.filter(d => (d.category || '').toLowerCase() === subFilter.toLowerCase());
            }
        }

        // Location dropdown filter
        if (locationFilter !== 'all' && (activeTab === 'hotels' || activeTab === 'activities' || activeTab === 'plans')) {
            data = data.filter(d => d.locationId === locationFilter);
        }

        // Search & Status filter
        data = data.filter(item => {
            const searchable = [
                item.name, item.title, item.region, item.type, item.category, item.code, item.description, item.address
            ].filter(Boolean).map(String).join(' ').toLowerCase();

            const matchesSearch = !debouncedSearchQuery || searchable.includes(debouncedSearchQuery.toLowerCase());
            const matchesStatus = filterStatus === 'All' || item.status === filterStatus;
            return matchesSearch && matchesStatus;
        });

        // Sorting
        data.sort((a, b) => {
            const valA = a[sortBy] ?? a.title ?? a.name ?? a.code ?? '';
            const valB = b[sortBy] ?? b.title ?? b.name ?? b.code ?? '';

            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortDir === 'asc' ? valA - valB : valB - valA;
            }
            return 0;
        });

        return data;
    };

    const processedData = getProcessedData();

    // --- Tab Contextual KPI Metrics Calculation ---
    const tabKPIs = useMemo(() => {
        switch (activeTab) {
            case 'locations': {
                const total = masterLocations.length;
                const active = masterLocations.filter(l => l.status === 'Active').length;
                const cities = masterLocations.filter(l => l.type === 'City').length;
                const states = masterLocations.filter(l => l.type === 'State').length;
                const countries = masterLocations.filter(l => l.type === 'Country').length;
                return [
                    { label: 'Total Destinations', value: total, sub: `${active} Active • ${total - active} Inactive`, icon: 'public', color: 'from-blue-500 to-indigo-600' },
                    { label: 'Cities Catalog', value: cities, sub: 'Urban destinations', icon: 'location_city', color: 'from-emerald-500 to-teal-600' },
                    { label: 'States / Regions', value: states, sub: 'Regional territories', icon: 'map', color: 'from-amber-500 to-orange-600' },
                    { label: 'Countries Available', value: countries, sub: 'International coverage', icon: 'flag', color: 'from-purple-500 to-pink-600' },
                ];
            }
            case 'hotels': {
                const total = masterHotels.length;
                const luxury = masterHotels.filter(h => h.rating >= 5).length;
                const premium = masterHotels.filter(h => h.rating >= 4 && h.rating < 5).length;
                const avgPrice = total > 0 ? Math.round(masterHotels.reduce((acc, h) => acc + (Number(h.pricePerNight) || 0), 0) / total) : 0;
                return [
                    { label: 'Hotel Partners', value: total, sub: 'Registered properties', icon: 'hotel', color: 'from-indigo-500 to-blue-600' },
                    { label: 'Avg Rate / Night', value: `₹${avgPrice.toLocaleString()}`, sub: 'Across all room categories', icon: 'payments', color: 'from-emerald-500 to-teal-600' },
                    { label: '5-Star Luxury', value: luxury, sub: 'Elite accommodation', icon: 'star', color: 'from-amber-500 to-yellow-600' },
                    { label: '4-Star Premium', value: premium, sub: 'Executive comfort', icon: 'award_star', color: 'from-purple-500 to-pink-600' },
                ];
            }
            case 'activities': {
                const total = masterActivities.length;
                const adventure = masterActivities.filter(a => a.category === 'Adventure').length;
                const sightseeing = masterActivities.filter(a => a.category === 'Sightseeing').length;
                const avgCost = total > 0 ? Math.round(masterActivities.reduce((acc, a) => acc + (Number(a.cost) || 0), 0) / total) : 0;
                return [
                    { label: 'Experiences Catalog', value: total, sub: 'Tours & excursions', icon: 'attractions', color: 'from-pink-500 to-rose-600' },
                    { label: 'Avg Cost / Pax', value: `₹${avgCost.toLocaleString()}`, sub: 'Per person rate', icon: 'sell', color: 'from-emerald-500 to-teal-600' },
                    { label: 'Adventure Treks', value: adventure, sub: 'Outdoor activities', icon: 'hiking', color: 'from-amber-500 to-orange-600' },
                    { label: 'Sightseeing & Heritage', value: sightseeing, sub: 'Monuments & city tours', icon: 'temple_hindu', color: 'from-blue-500 to-indigo-600' },
                ];
            }
            case 'transports': {
                const total = masterTransports.length;
                const sedans = masterTransports.filter(t => t.type === 'Sedan').length;
                const suvs = masterTransports.filter(t => t.type === 'SUV').length;
                const tempos = masterTransports.filter(t => t.type === 'Tempo Traveller').length;
                return [
                    { label: 'Fleet Configurations', value: total, sub: 'Vehicle types available', icon: 'directions_car', color: 'from-blue-500 to-indigo-600' },
                    { label: 'Sedans', value: sedans, sub: '4 Passenger capacity', icon: 'minor_crash', color: 'from-emerald-500 to-teal-600' },
                    { label: 'SUVs (Innova)', value: suvs, sub: '6-7 Passenger capacity', icon: 'airport_shuttle', color: 'from-amber-500 to-orange-600' },
                    { label: 'Group Tempo Travellers', value: tempos, sub: '12-26 Passenger capacity', icon: 'directions_bus', color: 'from-purple-500 to-pink-600' },
                ];
            }
            case 'terms': {
                const total = masterTermsTemplates.length;
                const defaults = masterTermsTemplates.filter(t => t.isDefault).length;
                const cancellation = masterTermsTemplates.filter(t => t.category === 'Cancellation Policy').length;
                return [
                    { label: 'Policy Templates', value: total, sub: 'Standardized clauses', icon: 'gavel', color: 'from-indigo-500 to-blue-600' },
                    { label: 'Active Defaults', value: defaults, sub: 'Auto-applied on new quotes', icon: 'verified', color: 'from-emerald-500 to-teal-600' },
                    { label: 'Cancellation Rules', value: cancellation, sub: 'Refund schedules', icon: 'cancel', color: 'from-rose-500 to-red-600' },
                    { label: 'Other Guidelines', value: total - cancellation, sub: 'Payment & Insurance', icon: 'description', color: 'from-purple-500 to-pink-600' },
                ];
            }
            default:
                return [];
        }
    }, [activeTab, masterLocations, masterHotels, masterActivities, masterTransports, masterTermsTemplates]);

    // --- Actionable Bulk Operations Toolbar ---
    const BulkActionBar = () => {
        if (selectedItems.size === 0) return null;
        return (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3.5 rounded-2xl shadow-2xl flex flex-wrap items-center gap-4 z-50 animate-in slide-in-from-bottom-4 border border-slate-700 dark:border-slate-200">
                <span className="font-bold flex items-center gap-2">
                    <span className="bg-indigo-500 text-white text-xs px-2.5 py-0.5 rounded-full font-mono">{selectedItems.size}</span>
                    <span className="text-xs uppercase tracking-wider font-bold">Selected</span>
                </span>
                <div className="h-4 w-px bg-white/20 dark:bg-black/10"></div>

                <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                        onClick={() => bulkUpdateStatus('Active')}
                        className="px-3 py-1.5 rounded-xl hover:bg-white/10 dark:hover:bg-black/5 text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                        <CheckCircle2 size={15} className="text-green-400" /> Activate
                    </button>
                    <button
                        onClick={() => bulkUpdateStatus('Inactive')}
                        className="px-3 py-1.5 rounded-xl hover:bg-white/10 dark:hover:bg-black/5 text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                        <XCircle size={15} className="text-slate-400" /> Deactivate
                    </button>

                    {(activeTab === 'hotels' || activeTab === 'activities' || activeTab === 'transports') && (
                        <button
                            onClick={() => setShowPriceAdjustModal(true)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600/30 dark:bg-indigo-600/10 text-indigo-300 dark:text-indigo-600 hover:bg-indigo-600 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                            <Percent size={14} /> Adjust Prices
                        </button>
                    )}

                    {(activeTab === 'hotels' || activeTab === 'activities' || activeTab === 'plans') && (
                        <button
                            onClick={() => setShowReassignModal(true)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 dark:bg-slate-100 hover:bg-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                            <MapPin size={14} /> Reassign Location
                        </button>
                    )}

                    <button
                        onClick={() => handleExport(true)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-400 dark:text-emerald-700 hover:bg-emerald-600 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                        <Download size={14} /> Export Selected
                    </button>

                    <button
                        onClick={() => {
                            if (confirm(`Are you sure you want to delete ${selectedItems.size} items?`)) {
                                const deleteFuncs: Record<string, (id: string) => void> = {
                                    locations: deleteMasterLocation,
                                    hotels: deleteMasterHotel,
                                    activities: deleteMasterActivity,
                                    transports: deleteMasterTransport,
                                    plans: deleteMasterPlan,
                                    'room-types': deleteMasterRoomType,
                                    'meal-plans': deleteMasterMealPlan,
                                    'lead-sources': deleteMasterLeadSource,
                                    'terms': deleteMasterTermsTemplate,
                                };
                                if (deleteFuncs[activeTab]) {
                                    selectedItems.forEach(id => deleteFuncs[activeTab](id));
                                    setSelectedItems(new Set());
                                    toast.success(`${selectedItems.size} items deleted`);
                                }
                            }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md shadow-red-500/20"
                    >
                        <Trash2 size={14} /> Delete
                    </button>
                </div>

                <button onClick={() => setSelectedItems(new Set())} className="hover:bg-white/10 p-1.5 rounded-full text-slate-400 hover:text-white">
                    <X size={15} />
                </button>
            </div>
        );
    };

    // --- Analytics View (Health & Coverage Intelligence) ---
    const AnalyticsView = () => {
        const totalItems = masterLocations.length + masterHotels.length + masterActivities.length + masterTransports.length + masterPlans.length + masterRoomTypes.length + masterMealPlans.length + masterLeadSources.length + masterTermsTemplates.length;

        // Data completeness audits
        const hotelsWithoutImages = masterHotels.filter(h => !h.image).length;
        const activitiesWithoutCost = masterActivities.filter(a => !a.cost).length;
        const locationsWithoutRegion = masterLocations.filter(l => !l.region).length;

        const completenessScore = Math.max(0, Math.min(100, Math.round(
            100 - (((hotelsWithoutImages + activitiesWithoutCost + locationsWithoutRegion) / (totalItems || 1)) * 100)
        )));

        // Location coverage breakdown
        const locationHotelCounts: Record<string, number> = {};
        masterHotels.forEach(h => {
            const locName = getLocationNameById(h.locationId);
            locationHotelCounts[locName] = (locationHotelCounts[locName] || 0) + 1;
        });

        return (
            <div className="space-y-8 animate-in fade-in duration-300">
                {/* Audit Health Banner */}
                <div className="p-6 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl border border-indigo-500/20 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-6">
                    <div className="space-y-1 text-center lg:text-left">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold">
                            <Sparkles size={13} /> Master Data Health & Inventory Audit
                        </div>
                        <h2 className="text-2xl font-black">Central Catalog Intelligence</h2>
                        <p className="text-xs text-indigo-200/70 max-w-xl">
                            Real-time diagnostic metrics across all 9 master tables powering Tour Packages, Itinerary Day Planners, and Customer Quotes.
                        </p>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <span className="text-3xl font-black text-emerald-400">{completenessScore}%</span>
                            <span className="text-[10px] uppercase tracking-wider font-bold block text-slate-400">Data Completeness</span>
                        </div>
                        <div className="h-10 w-px bg-white/10"></div>
                        <div className="text-center">
                            <span className="text-3xl font-black text-white">{totalItems}</span>
                            <span className="text-[10px] uppercase tracking-wider font-bold block text-slate-400">Total Entities</span>
                        </div>
                    </div>
                </div>

                {/* Top Level Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {[
                        { label: 'Active Destinations', value: masterLocations.filter(l => l.status === 'Active').length, sub: `Out of ${masterLocations.length} total`, icon: 'location_on', color: 'from-emerald-500 to-teal-600' },
                        { label: 'Hotel Partners', value: masterHotels.length, sub: `${masterHotels.filter(h => h.rating >= 5).length} 5-Star Properties`, icon: 'hotel', color: 'from-indigo-500 to-blue-600' },
                        { label: 'Activities & Tours', value: masterActivities.length, sub: 'Excursions catalog', icon: 'attractions', color: 'from-amber-500 to-orange-600' },
                        { label: 'Vehicle Fleets', value: masterTransports.length, sub: 'Transit configurations', icon: 'directions_car', color: 'from-purple-500 to-pink-600' },
                    ].map((kpi, i) => (
                        <div key={i} className="bg-white dark:bg-[#151d29] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all">
                            <div className="flex justify-between items-start mb-3">
                                <div className={`size-11 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center text-white shadow-md`}>
                                    <span className="material-symbols-outlined text-[22px]">{kpi.icon}</span>
                                </div>
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white font-mono">{kpi.value}</h3>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-1">{kpi.label}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{kpi.sub}</p>
                        </div>
                    ))}
                </div>

                {/* Destination Inventory Heatmap */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-[#151d29] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <MapPin size={18} className="text-indigo-500" /> Destination Inventory Density (Hotels per City)
                        </h3>
                        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-2">
                            {Object.entries(locationHotelCounts).slice(0, 8).map(([loc, count], i) => (
                                <div key={i} className="space-y-1">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-slate-700 dark:text-slate-300">{loc}</span>
                                        <span className="text-indigo-600 dark:text-indigo-400 font-mono">{count} hotels</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            style={{ width: `${Math.min(100, (count / Math.max(...Object.values(locationHotelCounts), 1)) * 100)}%` }}
                                            className="h-full bg-indigo-500 rounded-full"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Data Audit Warnings */}
                    <div className="bg-white dark:bg-[#151d29] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <AlertTriangle size={18} className="text-amber-500" /> Master Data Completeness Audit
                        </h3>
                        <div className="space-y-3">
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/30 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Building2 size={16} className="text-amber-600" />
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Hotels missing cover photos</span>
                                </div>
                                <span className="text-xs font-black px-2 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 font-mono">
                                    {hotelsWithoutImages} items
                                </span>
                            </div>

                            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/30 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <MapPin size={16} className="text-blue-600" />
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Locations missing region field</span>
                                </div>
                                <span className="text-xs font-black px-2 py-0.5 rounded bg-blue-200/60 dark:bg-blue-900/50 text-blue-900 dark:text-blue-200 font-mono">
                                    {locationsWithoutRegion} items
                                </span>
                            </div>

                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/30 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={16} className="text-emerald-600" />
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Default Terms & Policies Configured</span>
                                </div>
                                <span className="text-xs font-black px-2 py-0.5 rounded bg-emerald-200/60 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 font-mono">
                                    {masterTermsTemplates.filter(t => t.isDefault).length} default
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- Sub-Filter Pills Generator ---
    const renderSubFilterPills = () => {
        if (activeTab === 'locations') {
            return (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {[
                        { id: 'all', label: `All (${masterLocations.length})` },
                        { id: 'cities', label: `🏙️ Cities (${masterLocations.filter(l => l.type === 'City').length})` },
                        { id: 'states', label: `🗺️ States (${masterLocations.filter(l => l.type === 'State').length})` },
                        { id: 'countries', label: `🌐 Countries (${masterLocations.filter(l => l.type === 'Country').length})` },
                    ].map(pill => (
                        <button
                            key={pill.id}
                            onClick={() => setSubFilter(pill.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${subFilter === pill.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}`}
                        >
                            {pill.label}
                        </button>
                    ))}
                </div>
            );
        }

        if (activeTab === 'hotels') {
            return (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {[
                        { id: 'all', label: `All (${masterHotels.length})` },
                        { id: '5star', label: '⭐ 5-Star Luxury' },
                        { id: '4star', label: '⭐ 4-Star Premium' },
                        { id: '3star', label: '⭐ 3-Star Standard' },
                        { id: 'budget', label: '₹ Budget (< 5k)' },
                        { id: 'mid', label: '₹ Mid-Range (5k-10k)' },
                        { id: 'luxury', label: '₹ Luxury (> 10k)' },
                    ].map(pill => (
                        <button
                            key={pill.id}
                            onClick={() => setSubFilter(pill.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${subFilter === pill.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}`}
                        >
                            {pill.label}
                        </button>
                    ))}
                </div>
            );
        }

        if (activeTab === 'activities') {
            return (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {[
                        { id: 'all', label: `All (${masterActivities.length})` },
                        { id: 'sightseeing', label: '📸 Sightseeing' },
                        { id: 'adventure', label: '🧗 Adventure' },
                        { id: 'cultural', label: '🏛️ Cultural' },
                        { id: 'leisure', label: '🏖️ Leisure' },
                    ].map(pill => (
                        <button
                            key={pill.id}
                            onClick={() => setSubFilter(pill.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${subFilter === pill.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}`}
                        >
                            {pill.label}
                        </button>
                    ))}
                </div>
            );
        }

        if (activeTab === 'transports') {
            return (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {[
                        { id: 'all', label: `All (${masterTransports.length})` },
                        { id: 'sedan', label: '🚗 Sedan' },
                        { id: 'suv', label: '🚙 SUV' },
                        { id: 'tempo traveller', label: '🚐 Tempo Traveller' },
                        { id: 'bus', label: '🚌 Coach / Bus' },
                    ].map(pill => (
                        <button
                            key={pill.id}
                            onClick={() => setSubFilter(pill.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${subFilter === pill.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}`}
                        >
                            {pill.label}
                        </button>
                    ))}
                </div>
            );
        }

        if (activeTab === 'terms') {
            return (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {[
                        { id: 'all', label: `All (${masterTermsTemplates.length})` },
                        { id: 'cancellation policy', label: '❌ Cancellation Policy' },
                        { id: 'booking & payment', label: '💳 Payment Terms' },
                        { id: 'travel insurance', label: '🛡️ Insurance' },
                        { id: 'pricing & inclusions', label: '📌 Inclusions' },
                        { id: 'default', label: '⭐ Defaults Only' },
                    ].map(pill => (
                        <button
                            key={pill.id}
                            onClick={() => setSubFilter(pill.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${subFilter === pill.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}`}
                        >
                            {pill.label}
                        </button>
                    ))}
                </div>
            );
        }

        return null;
    };

    // --- Card View Renderer ---
    const renderCard = (item: any) => {
        const isSelected = selectedItems.has(item.id);
        const dependency = getDependency(item);
        const title = item.name || item.title || 'Untitled';
        const status = item.status || 'Active';

        let subtitle = '';
        let detail = '';
        let priceTag = '';

        if (activeTab === 'locations') {
            subtitle = item.region || item.type;
            detail = `${item.type || 'City'}`;
        } else if (activeTab === 'hotels') {
            subtitle = getLocationNameById(item.locationId);
            detail = `${item.rating || 5}★ Rating`;
            priceTag = `₹${Number(item.pricePerNight || 0).toLocaleString()}/n`;
        } else if (activeTab === 'activities') {
            subtitle = getLocationNameById(item.locationId);
            detail = `${item.category || 'Leisure'} • ${item.duration || ''}`;
            priceTag = `₹${Number(item.cost || 0).toLocaleString()}`;
        } else if (activeTab === 'transports') {
            subtitle = `${item.capacity || 4} Passengers`;
            detail = item.type;
            priceTag = `₹${Number(item.baseRate || 0).toLocaleString()}/d`;
        } else if (activeTab === 'plans') {
            subtitle = getLocationNameById(item.locationId);
            detail = `${item.duration || 1} Days`;
            priceTag = `₹${Number(item.estimatedCost || 0).toLocaleString()}`;
        } else if (activeTab === 'room-types') {
            subtitle = item.description;
        } else if (activeTab === 'meal-plans') {
            subtitle = item.description;
            detail = item.code;
        } else if (activeTab === 'terms') {
            subtitle = item.category;
            detail = item.isDefault ? 'Default Policy' : '';
        } else if (activeTab === 'lead-sources') {
            subtitle = item.category;
        }

        return (
            <div
                key={item.id}
                onClick={() => setInspectingItem(item)}
                className={`
                    relative group bg-white dark:bg-[#151d29] rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer flex flex-col justify-between
                    ${isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-xl'
                        : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-lg'
                    }
                `}
            >
                {/* Card Top Action Bar */}
                <div className="p-5 pb-0 flex items-start justify-between">
                    <div
                        onClick={(e) => { e.stopPropagation(); handleSelectOne(item.id); }}
                        className={`size-6 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-indigo-400'}`}
                    >
                        {isSelected && <Check size={14} className="text-white" />}
                    </div>

                    <div className="flex items-center gap-1.5">
                        {/* Status Toggle Quick Button */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                const newStatus = status === 'Active' ? 'Inactive' : 'Active';
                                const updateFuncs: Record<string, (id: string, data: any) => void> = {
                                    locations: updateMasterLocation,
                                    hotels: updateMasterHotel,
                                    activities: updateMasterActivity,
                                    transports: updateMasterTransport,
                                    plans: updateMasterPlan,
                                    'room-types': updateMasterRoomType,
                                    'meal-plans': updateMasterMealPlan,
                                    'lead-sources': updateMasterLeadSource,
                                    'terms': updateMasterTermsTemplate,
                                };
                                if (updateFuncs[activeTab]) {
                                    updateFuncs[activeTab](item.id, { status: newStatus });
                                    toast.success(`${title} marked as ${newStatus}`);
                                }
                            }}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase transition-all ${status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300 hover:bg-green-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'}`}
                        >
                            {status}
                        </button>
                    </div>
                </div>

                {/* Card Middle Info */}
                <div className="p-5 pt-3 space-y-2 flex-1">
                    {/* Thumbnail if present */}
                    {item.image && (
                        <div className="h-28 rounded-xl overflow-hidden mb-2 bg-slate-100 dark:bg-slate-800">
                            <img src={item.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                    )}

                    <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug line-clamp-1">{title}</h3>
                        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{subtitle}</p>}
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs">
                        {detail && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                                {detail}
                            </span>
                        )}
                        {priceTag && (
                            <span className="font-black text-slate-900 dark:text-white font-mono text-sm">{priceTag}</span>
                        )}
                    </div>

                    {/* Dependencies Chip */}
                    {dependency.total > 0 && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold" title={dependency.details}>
                            <Layers size={13} /> {dependency.total} linked in system
                        </div>
                    )}
                </div>

                {/* Card Bottom Action Hover Overlay */}
                <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setEditingItem(item);
                            setShowModal(true);
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1"
                    >
                        <Edit2 size={13} /> Edit
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(item);
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition-colors"
                        title="Duplicate"
                    >
                        <Copy size={14} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(item);
                        }}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Delete"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        );
    };

    // --- Table List View Renderer ---
    const renderListView = () => (
        <div className="bg-white dark:bg-[#151d29] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm animate-in fade-in">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[720px]">
                    <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                            <th className="px-6 py-4 w-12">
                                <input
                                    type="checkbox"
                                    checked={processedData.length > 0 && selectedItems.size === processedData.length}
                                    onChange={() => handleSelectAll(processedData)}
                                    className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                            </th>
                            <th className="px-4 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs w-16">Preview</th>
                            <th className="px-4 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Name / Title</th>
                            <th className="px-4 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Details & Attributes</th>
                            <th className="px-4 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Dependencies</th>
                            <th className="px-4 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Status</th>
                            <th className="px-4 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {processedData.length > 0 ? processedData.map((item) => {
                            const isSelected = selectedItems.has(item.id);
                            const dependency = getDependency(item);
                            const title = item.name || item.title || 'Untitled';
                            const status = item.status || 'Active';

                            return (
                                <tr
                                    key={item.id}
                                    onClick={() => setInspectingItem(item)}
                                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/60 dark:bg-indigo-950/20' : ''}`}
                                >
                                    <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleSelectOne(item.id)}
                                            className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        />
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400">
                                            {item.image ? (
                                                <img src={item.image} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="material-symbols-outlined text-[20px]">
                                                    {activeTab === 'locations' ? 'location_on' : activeTab === 'hotels' ? 'hotel' : activeTab === 'activities' ? 'attractions' : 'inventory_2'}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <p className="font-bold text-slate-900 dark:text-white leading-tight">{title}</p>
                                        <p className="text-xs text-slate-400 font-mono mt-0.5">{item.id.slice(0, 16)}</p>
                                    </td>
                                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300 text-xs">
                                        {activeTab === 'locations' && <span>{item.type} • {item.region || 'No region'}</span>}
                                        {activeTab === 'hotels' && (
                                            <div>
                                                <span className="font-bold text-amber-500">{item.rating}★</span> • {getLocationNameById(item.locationId)} • <strong className="text-slate-900 dark:text-white font-mono">₹{Number(item.pricePerNight || 0).toLocaleString()}</strong>
                                            </div>
                                        )}
                                        {activeTab === 'activities' && (
                                            <div>
                                                <span>{item.category || 'Leisure'}</span> • <strong className="text-slate-900 dark:text-white font-mono">₹{Number(item.cost || 0).toLocaleString()}</strong>
                                            </div>
                                        )}
                                        {activeTab === 'transports' && (
                                            <div>
                                                <span>{item.type}</span> • {item.capacity} Seats • <strong className="text-slate-900 dark:text-white font-mono">₹{Number(item.baseRate || 0).toLocaleString()}</strong>
                                            </div>
                                        )}
                                        {activeTab === 'terms' && (
                                            <div>
                                                <span>{item.category}</span> {item.isDefault && <span className="ml-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">Default</span>}
                                            </div>
                                        )}
                                        {activeTab === 'meal-plans' && (
                                            <div>
                                                <span className="font-mono font-bold text-indigo-600">{item.code}</span> - {item.description}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-4">
                                        {dependency.total > 0 ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold" title={dependency.details}>
                                                <Layers size={13} /> {dependency.total} linked
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const newStatus = status === 'Active' ? 'Inactive' : 'Active';
                                                const updateFuncs: Record<string, (id: string, data: any) => void> = {
                                                    locations: updateMasterLocation,
                                                    hotels: updateMasterHotel,
                                                    activities: updateMasterActivity,
                                                    transports: updateMasterTransport,
                                                    plans: updateMasterPlan,
                                                    'room-types': updateMasterRoomType,
                                                    'meal-plans': updateMasterMealPlan,
                                                    'lead-sources': updateMasterLeadSource,
                                                    'terms': updateMasterTermsTemplate,
                                                };
                                                if (updateFuncs[activeTab]) {
                                                    updateFuncs[activeTab](item.id, { status: newStatus });
                                                    toast.success(`Status updated to ${newStatus}`);
                                                }
                                            }}
                                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase transition-all ${status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 text-slate-400'}`}
                                        >
                                            {status}
                                        </button>
                                    </td>
                                    <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                onClick={() => {
                                                    setEditingItem(item);
                                                    setShowModal(true);
                                                }}
                                                className="p-1.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors text-slate-500"
                                                title="Edit"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDuplicate(item)}
                                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500"
                                                title="Duplicate"
                                            >
                                                <Copy size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(item)}
                                                className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors text-slate-500"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <Search size={32} className="opacity-20" />
                                        <p className="font-bold text-slate-700 dark:text-slate-300">No master items found matching current filters</p>
                                        <p className="text-xs text-slate-400">Try adjusting your search query or reset filter sub-categories.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="admin-page-bg min-h-screen pb-24">
            <div className="p-6 lg:p-10 max-w-[1800px] mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white">
                            <span className="font-display text-4xl">Master Data Manager</span>
                        </h1>
                        <p className="text-slate-500 mt-1 font-medium">
                            Centralized control for all travel components, destination catalogs, and itinerary assets
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {activeTab !== 'analytics' && (
                            <button
                                onClick={downloadSampleTemplate}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                                title="Download pre-formatted Excel template"
                            >
                                <FileSpreadsheet size={16} className="text-emerald-600" />
                                <span>Sample Excel</span>
                            </button>
                        )}
                        <button
                            onClick={() => {
                                setEditingItem(null);
                                setShowModal(true);
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95 btn-glow"
                        >
                            <Plus size={18} />
                            <span>Add New {tabs.find(t => t.id === activeTab)?.label.replace(' Templates', '').replace('s', '') || 'Item'}</span>
                        </button>
                    </div>
                </div>

                {/* Primary Category Navigation Bar */}
                <div className="flex flex-wrap gap-2 p-2 bg-white dark:bg-[#151d29] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs transition-all flex-1 md:flex-none justify-center ${activeTab === tab.id
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg'
                                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            {typeof tab.icon === 'string' ? <span className="material-symbols-outlined text-[18px]">{tab.icon}</span> : tab.icon}
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono ${activeTab === tab.id ? 'bg-white/20 text-white dark:bg-slate-900/10 dark:text-slate-900 font-bold' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Contextual KPI Metrics */}
                {activeTab !== 'analytics' && tabKPIs.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in">
                        {tabKPIs.map((kpi, i) => (
                            <div key={i} className="p-4 rounded-2xl bg-white dark:bg-[#151d29] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                                <div>
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{kpi.label}</span>
                                    <span className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5 block">{kpi.value}</span>
                                    <span className="text-[11px] text-slate-500 font-medium">{kpi.sub}</span>
                                </div>
                                <div className={`size-11 rounded-xl bg-gradient-to-br ${kpi.color} text-white flex items-center justify-center shadow-md`}>
                                    <span className="material-symbols-outlined text-[20px]">{kpi.icon}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Controls & Sub-Filters */}
                {activeTab === 'analytics' ? (
                    <AnalyticsView />
                ) : (
                    <div className="space-y-4">
                        {/* Sub Filter Category Pills */}
                        {renderSubFilterPills()}

                        {/* Search & Tooling Toolbar */}
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-[#151d29] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in slide-in-from-top-2">
                            <div className="flex flex-1 items-center gap-3 w-full md:w-auto flex-wrap">
                                {/* Search */}
                                <div className="relative flex-1 md:max-w-xs min-w-[220px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder={`Search in ${activeTab}...`}
                                        className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>

                                {/* Location Dropdown Filter if applicable */}
                                {(activeTab === 'hotels' || activeTab === 'activities' || activeTab === 'plans') && (
                                    <select
                                        value={locationFilter}
                                        onChange={e => setLocationFilter(e.target.value)}
                                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold outline-none"
                                    >
                                        <option value="all">All Locations ({masterLocations.length})</option>
                                        {masterLocations.map(l => (
                                            <option key={l.id} value={l.id}>{l.name}</option>
                                        ))}
                                    </select>
                                )}

                                {/* Status Filter */}
                                <select
                                    value={filterStatus}
                                    onChange={e => setFilterStatus(e.target.value as any)}
                                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold outline-none"
                                >
                                    <option value="All">All Status</option>
                                    <option value="Active">Active Only</option>
                                    <option value="Inactive">Inactive Only</option>
                                </select>

                                {/* Grid vs List switcher */}
                                <div className="hidden md:flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-3">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}
                                        title="Grid View"
                                    >
                                        <LayoutGrid size={17} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}
                                        title="List View"
                                    >
                                        <List size={17} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
                                {/* Import / Export File Inputs */}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept=".xlsx,.xls,.csv"
                                    className="hidden"
                                />
                                <button
                                    onClick={handleImportClick}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-colors border border-dashed border-slate-300 dark:border-slate-600"
                                >
                                    <Upload size={14} /> Import
                                </button>
                                <button
                                    onClick={() => handleExport(false)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-colors border border-slate-200 dark:border-slate-700"
                                >
                                    <Download size={14} /> Export All
                                </button>

                                {/* Sorting */}
                                <div className="flex items-center gap-1 text-xs font-medium text-slate-500 border-l border-slate-200 dark:border-slate-700 pl-3">
                                    <span>Sort:</span>
                                    <select
                                        value={sortBy}
                                        onChange={e => setSortBy(e.target.value)}
                                        className="bg-transparent font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer hover:underline"
                                    >
                                        <option value={activeTab === 'plans' || activeTab === 'terms' ? 'title' : activeTab === 'meal-plans' ? 'code' : 'name'}>Name</option>
                                        {(activeTab === 'hotels' || activeTab === 'activities' || activeTab === 'transports') && <option value={activeTab === 'hotels' ? 'pricePerNight' : activeTab === 'transports' ? 'baseRate' : 'cost'}>Price</option>}
                                        <option value="status">Status</option>
                                        {activeTab === 'hotels' && <option value="rating">Rating</option>}
                                        {activeTab === 'activities' && <option value="category">Category</option>}
                                        {activeTab === 'transports' && <option value="capacity">Capacity</option>}
                                    </select>
                                    <button
                                        onClick={() => setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')}
                                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
                                        title={`Sort ${sortDir === 'asc' ? 'Descending' : 'Ascending'}`}
                                    >
                                        <ArrowUpDown size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Content Area (Grid or List) */}
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                {processedData.length > 0 ? (
                                    processedData.map((item) => renderCard(item))
                                ) : (
                                    <div className="col-span-full py-16 text-center bg-white dark:bg-[#151d29] rounded-3xl border border-slate-200 dark:border-slate-800">
                                        <Search size={36} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white">No items found</h3>
                                        <p className="text-xs text-slate-400 mt-1">Try resetting search filters or add a new record.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            renderListView()
                        )}
                    </div>
                )}

                {/* Floating Bulk Action Bar */}
                {activeTab !== 'analytics' && <BulkActionBar />}

                {/* Add / Edit Master Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in" onClick={() => setShowModal(false)}>
                        <div className="bg-white dark:bg-[#1a2332] rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto relative border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 sticky top-0 backdrop-blur-md z-10">
                                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                                    {editingItem ? 'Edit' : 'Add New'} {tabs.find(t => t.id === activeTab)?.label.replace(' Templates', '').replace('s', '') || 'Item'}
                                </h2>
                                <button onClick={() => setShowModal(false)} className="size-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors text-slate-500">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-6">
                                <MasterModal activeTab={activeTab} editingItem={editingItem} onClose={() => setShowModal(false)} />
                            </div>
                        </div>
                    </div>
                )}

                {/* 360° Slide-Over Detail Drawer */}
                {inspectingItem && (
                    <MasterDetailDrawer
                        item={inspectingItem}
                        tab={activeTab}
                        dependency={getDependency(inspectingItem)}
                        onClose={() => setInspectingItem(null)}
                        onEdit={() => {
                            setEditingItem(inspectingItem);
                            setInspectingItem(null);
                            setShowModal(true);
                        }}
                        onDuplicate={() => {
                            handleDuplicate(inspectingItem);
                        }}
                        onDelete={() => {
                            handleDeleteClick(inspectingItem);
                        }}
                    />
                )}

                {/* Safe Delete & Cascade Protection Modal */}
                {deleteTargetItem && (
                    <SafeDeleteModal
                        item={deleteTargetItem}
                        tab={activeTab}
                        dependency={getDependency(deleteTargetItem)}
                        onClose={() => setDeleteTargetItem(null)}
                        onDeactivate={handleConfirmDeactivate}
                        onForceDelete={handleConfirmForceDelete}
                    />
                )}

                {/* Bulk Location Reassign Modal */}
                {showReassignModal && (
                    <BulkReassignLocationModal
                        selectedCount={selectedItems.size}
                        locations={masterLocations}
                        onClose={() => setShowReassignModal(false)}
                        onReassign={handleBulkReassignLocation}
                    />
                )}

                {/* Bulk Price Adjust Modal */}
                {showPriceAdjustModal && (
                    <BulkPriceAdjustModal
                        selectedCount={selectedItems.size}
                        onClose={() => setShowPriceAdjustModal(false)}
                        onApply={handleBulkPriceAdjust}
                    />
                )}
            </div>
        </div>
    );
};
