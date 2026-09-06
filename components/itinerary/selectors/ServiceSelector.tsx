import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../../../context/DataContext';
import { useItinerary, ItineraryItem, ServiceType } from '../ItineraryContext';
import { MasterHotel, MasterActivity, MasterTransport, MasterTransportType } from '../../../types';
import { 
    X, Search, Hotel, Bike, Car, Plane, StickyNote, Plus, MapPin, Star, 
    Clock, Users, ArrowRight, Shield, UserCheck, Globe, Save, CheckCircle2, 
    Sparkles, Building2, Layers, Check, Compass
} from 'lucide-react';

interface ServiceSelectorProps {
    day: number;
    onClose: () => void;
    initialTab?: ServiceType;
}

export const ServiceSelector: React.FC<ServiceSelectorProps> = ({ day, onClose, initialTab = 'hotel' }) => {
    const { addItem, tripDetails, items } = useItinerary();
    const {
        masterHotels, masterActivities, masterTransports, masterLocations,
        addMasterHotel, addMasterActivity, addMasterTransport
    } = useData();

    const [activeTab, setActiveTab] = useState<ServiceType>(initialTab);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAll, setShowAll] = useState(false);

    // Filter Chips state
    const [hotelRatingFilter, setHotelRatingFilter] = useState<'all' | '5' | '4' | '3'>('all');
    const [transTypeFilter, setTransTypeFilter] = useState<'all' | MasterTransportType>('all');
    const [actCategoryFilter, setActCategoryFilter] = useState<'all' | 'Sightseeing' | 'Adventure' | 'Cultural' | 'Leisure'>('all');

    // Recently added items tracking for inline feedback
    const [recentlyAddedIds, setRecentlyAddedIds] = useState<string[]>([]);
    const [lastAddedTitle, setLastAddedTitle] = useState<string | null>(null);

    // Modal state for inline Master creation
    const [showMasterCreateModal, setShowMasterCreateModal] = useState<ServiceType | null>(null);

    // Form state for creating Master Hotel
    const [newHotelName, setNewHotelName] = useState('');
    const [newHotelLocation, setNewHotelLocation] = useState('');
    const [newHotelRating, setNewHotelRating] = useState('5');
    const [newHotelPrice, setNewHotelPrice] = useState('');
    const [newHotelAddress, setNewHotelAddress] = useState('');
    const [newHotelAmenities, setNewHotelAmenities] = useState('Pool, Wifi, Breakfast');

    // Form state for creating Master Activity/Service
    const [newActName, setNewActName] = useState('');
    const [newActLocation, setNewActLocation] = useState('');
    const [newActCost, setNewActCost] = useState('');
    const [newActDuration, setNewActDuration] = useState('2 Hours');
    const [newActCategory, setNewActCategory] = useState<'Sightseeing' | 'Adventure' | 'Cultural' | 'Leisure' | 'Other'>('Sightseeing');

    // Form state for creating Master Transport/Vehicle
    const [newTransName, setNewTransName] = useState('');
    const [newTransType, setNewTransType] = useState<MasterTransportType>('SUV');
    const [newTransCapacity, setNewTransCapacity] = useState('6');
    const [newTransBaseRate, setNewTransBaseRate] = useState('');

    // Form state for Flight details
    const [flightTitle, setFlightTitle] = useState('Flight: Departure to Destination');
    const [flightAirline, setFlightAirline] = useState('IndiGo');
    const [flightNo, setFlightNo] = useState('6E-512');
    const [flightDepTime, setFlightDepTime] = useState('10:30');
    const [flightDuration, setFlightDuration] = useState('2h 15m');
    const [flightCost, setFlightCost] = useState('4500');

    // Custom-entry form state for visa/guide
    const [customTitle, setCustomTitle] = useState('');
    const [customCost, setCustomCost] = useState('');
    const [saveToMaster, setSaveToMaster] = useState(false);

    // Day Items Overview
    const dayItems = useMemo(() => (items || []).filter(i => i.day === day), [items, day]);
    const dayHotelsCount = useMemo(() => dayItems.filter(i => i.type === 'hotel').length, [dayItems]);
    const dayTransportsCount = useMemo(() => dayItems.filter(i => i.type === 'transport').length, [dayItems]);
    const dayActivitiesCount = useMemo(() => dayItems.filter(i => i.type === 'activity').length, [dayItems]);
    const dayTotalNetCost = useMemo(() => dayItems.reduce((sum, item) => sum + (item.netCost || 0) * (item.quantity || 1), 0), [dayItems]);

    // Collect all destination location IDs and names for this trip bidirectionally
    const { tripLocationSet, dayLocationName } = useMemo(() => {
        const set = new Set<string>();
        let dayLocName = '';

        const addLocationValue = (val?: string) => {
            if (!val || typeof val !== 'string') return;
            const trimmed = val.trim();
            if (!trimmed) return;
            set.add(trimmed);
            set.add(trimmed.toLowerCase());

            (masterLocations || []).forEach(loc => {
                if (!loc) return;
                const locIdStr = loc.id ? String(loc.id) : '';
                const locNameStr = loc.name ? String(loc.name) : '';
                const idMatch = locIdStr && locIdStr.toLowerCase() === trimmed.toLowerCase();
                const nameMatch = locNameStr && locNameStr.toLowerCase() === trimmed.toLowerCase();
                if (idMatch || nameMatch) {
                    if (locIdStr) { set.add(locIdStr); set.add(locIdStr.toLowerCase()); }
                    if (locNameStr) { set.add(locNameStr); set.add(locNameStr.toLowerCase()); }
                    if (loc.region) { const regStr = String(loc.region); set.add(regStr); set.add(regStr.toLowerCase()); }
                }
            });
        };

        addLocationValue(tripDetails?.destination);
        const legs = tripDetails?.destinations || [];
        legs.forEach(d => addLocationValue(d?.locationId));

        let accumulatedDays = 0;
        for (const leg of legs) {
            if (!leg) continue;
            accumulatedDays += (leg.nights || 1);
            if (day <= accumulatedDays + 1) {
                const legLocId = leg.locationId ? String(leg.locationId).toLowerCase() : '';
                const locObj = (masterLocations || []).find(l => l && (String(l.id || '') === leg.locationId || (l.name && String(l.name).toLowerCase() === legLocId)));
                dayLocName = locObj?.name || leg.locationId || '';
                break;
            }
        }

        if (!dayLocName && tripDetails?.destination) {
            const destStr = String(tripDetails.destination).toLowerCase();
            const primaryLoc = (masterLocations || []).find(l => l && (String(l.id || '') === tripDetails.destination || (l.name && String(l.name).toLowerCase() === destStr)));
            dayLocName = primaryLoc?.name || tripDetails.destination || '';
        }

        return { tripLocationSet: set, dayLocationName: dayLocName };
    }, [tripDetails?.destination, tripDetails?.destinations, masterLocations, day]);

    const getLocName = (locId?: string) => {
        if (!locId) return '—';
        const target = String(locId).toLowerCase();
        return masterLocations?.find(l => l && (String(l.id || '') === locId || (l.name && String(l.name).toLowerCase() === target)))?.name || locId || '—';
    };

    const matchesLocation = (itemLocId?: string) => {
        if (!itemLocId) return true;
        const trimmed = String(itemLocId).trim();
        if (tripLocationSet.size === 0) return true;
        return tripLocationSet.has(trimmed) || tripLocationSet.has(trimmed.toLowerCase());
    };

    // Filtered lists
    const filteredHotels = useMemo(() => {
        const query = (searchTerm || '').toLowerCase();
        let active = (masterHotels ?? []).filter(h => h && h.status === 'Active' && (h.name || '').toLowerCase().includes(query));
        if (!showAll && tripLocationSet.size > 0) {
            active = active.filter(h => matchesLocation(h.locationId));
        }
        if (hotelRatingFilter !== 'all') {
            const rNum = parseInt(hotelRatingFilter, 10);
            active = active.filter(h => Math.floor(h.rating) === rNum);
        }
        return active;
    }, [masterHotels, searchTerm, showAll, tripLocationSet, hotelRatingFilter]);

    const filteredActivities = useMemo(() => {
        const query = (searchTerm || '').toLowerCase();
        let active = (masterActivities ?? []).filter(a => a && a.status === 'Active' && (a.name || '').toLowerCase().includes(query));
        if (!showAll && tripLocationSet.size > 0) {
            active = active.filter(a => matchesLocation(a.locationId));
        }
        if (actCategoryFilter !== 'all') {
            active = active.filter(a => a.category === actCategoryFilter);
        }
        return active;
    }, [masterActivities, searchTerm, showAll, tripLocationSet, actCategoryFilter]);

    const filteredTransports = useMemo(() => {
        const query = (searchTerm || '').toLowerCase();
        let active = (masterTransports ?? []).filter(t => t && t.status === 'Active' && (t.name || '').toLowerCase().includes(query));
        if (transTypeFilter !== 'all') {
            active = active.filter(t => t.type === transTypeFilter);
        }
        return active;
    }, [masterTransports, searchTerm, transTypeFilter]);

    // Continuous Add Handler
    const handleAdd = (item: Omit<ItineraryItem, 'sellPrice'>, masterKeyId?: string) => {
        addItem(item);
        if (masterKeyId) {
            setRecentlyAddedIds(prev => [masterKeyId, ...prev]);
        }
        setLastAddedTitle(item.title);
    };

    const createHotelItem = (hotel: MasterHotel): Omit<ItineraryItem, 'sellPrice'> => ({
        id: `hotel-${Date.now()}`,
        type: 'hotel',
        day,
        title: hotel.name,
        description: `${hotel.rating}★ Hotel · ${getLocName(hotel.locationId)}`,
        netCost: hotel.pricePerNight,
        baseMarkupPercent: 15,
        extraMarkupFlat: 0,
        quantity: 1,
        masterId: hotel.id,
        time: '14:00'
    });

    const createActivityItem = (activity: MasterActivity): Omit<ItineraryItem, 'sellPrice'> => ({
        id: `act-${Date.now()}`,
        type: 'activity',
        day,
        title: activity.name,
        description: `${activity.category} · ${activity.duration} · ${getLocName(activity.locationId)}`,
        netCost: activity.cost,
        baseMarkupPercent: 15,
        extraMarkupFlat: 0,
        quantity: 1,
        duration: activity.duration,
        masterId: activity.id,
        time: '10:00'
    });

    const createTransportItem = (transport: MasterTransport): Omit<ItineraryItem, 'sellPrice'> => {
        const isPerKm = (transport.baseRate || 0) < 100;
        const calculatedNetCost = isPerKm 
            ? Math.max(2200, (transport.baseRate || 15) * 80) 
            : (transport.baseRate || 3500);

        const desc = isPerKm 
            ? `${transport.type} (${transport.capacity} Seats) · ₹${transport.baseRate}/km (Std 80km Day Package)`
            : `${transport.type} (Capacity: ${transport.capacity} Seats)`;

        return {
            id: `trans-${Date.now()}`,
            type: 'transport',
            day,
            title: transport.name,
            description: desc,
            netCost: calculatedNetCost,
            baseMarkupPercent: 15,
            extraMarkupFlat: 0,
            quantity: 1,
            masterId: transport.id,
            time: '09:00'
        };
    };

    const createFlightItem = (): Omit<ItineraryItem, 'sellPrice'> => ({
        id: `flight-${Date.now()}`,
        type: 'flight',
        day,
        title: flightTitle || `${flightAirline} ${flightNo}`,
        description: `${flightAirline} (${flightNo}) · ${flightDuration}`,
        netCost: parseFloat(flightCost) || 0,
        baseMarkupPercent: 10,
        extraMarkupFlat: 0,
        quantity: 1,
        time: flightDepTime || '10:00',
        duration: flightDuration || '2h'
    });

    const createNoteItem = (customText?: string, titleText?: string): Omit<ItineraryItem, 'sellPrice'> => ({
        id: `note-${Date.now()}`,
        type: 'note',
        day,
        title: titleText || 'Travel Note',
        description: customText || 'Add details here...',
        netCost: 0,
        baseMarkupPercent: 0,
        extraMarkupFlat: 0,
        quantity: 1
    });

    // Master Creation Submission Handlers
    const resetMasterForms = () => {
        setNewHotelName('');
        setNewHotelLocation('');
        setNewHotelRating('5');
        setNewHotelPrice('');
        setNewHotelAddress('');
        setNewHotelAmenities('Pool, Wifi, Breakfast');
        setNewActName('');
        setNewActLocation('');
        setNewActCost('');
        setNewActDuration('2 Hours');
        setNewActCategory('Sightseeing');
        setNewTransName('');
        setNewTransType('SUV');
        setNewTransCapacity('6');
        setNewTransBaseRate('');
    };

    const handleCreateMasterHotel = async () => {
        if (!newHotelName.trim()) return;
        const locId = newHotelLocation || tripDetails.destination || (masterLocations?.[0]?.id ?? '');
        const hotelObj: MasterHotel = {
            id: `HTL-${Date.now()}`,
            name: newHotelName.trim(),
            locationId: locId,
            rating: parseFloat(newHotelRating) || 5,
            pricePerNight: parseFloat(newHotelPrice) || 0,
            amenities: newHotelAmenities.split(',').map(s => s.trim()).filter(Boolean),
            address: newHotelAddress.trim(),
            status: 'Active'
        };
        await addMasterHotel(hotelObj);
        handleAdd(createHotelItem(hotelObj), hotelObj.id);
        setShowMasterCreateModal(null);
        resetMasterForms();
    };

    const handleCreateMasterActivity = async () => {
        if (!newActName.trim()) return;
        const locId = newActLocation || tripDetails.destination || (masterLocations?.[0]?.id ?? '');
        const actObj: MasterActivity = {
            id: `ACT-${Date.now()}`,
            name: newActName.trim(),
            locationId: locId,
            duration: newActDuration.trim() || '2 Hours',
            cost: parseFloat(newActCost) || 0,
            category: newActCategory,
            status: 'Active'
        };
        await addMasterActivity(actObj);
        handleAdd(createActivityItem(actObj), actObj.id);
        setShowMasterCreateModal(null);
        resetMasterForms();
    };

    const handleCreateMasterTransport = async () => {
        if (!newTransName.trim()) return;
        const transObj: MasterTransport = {
            id: `TRN-${Date.now()}`,
            name: newTransName.trim(),
            type: newTransType,
            capacity: parseInt(newTransCapacity) || 4,
            baseRate: parseFloat(newTransBaseRate) || 0,
            status: 'Active'
        };
        await addMasterTransport(transObj);
        handleAdd(createTransportItem(transObj), transObj.id);
        setShowMasterCreateModal(null);
        resetMasterForms();
    };

    const handleAddCustom = async (type: 'visa' | 'guide') => {
        if (!customTitle.trim()) return;
        const costVal = parseFloat(customCost) || 0;

        if (saveToMaster) {
            const locId = tripDetails.destination || (masterLocations?.[0]?.id ?? '');
            const actObj: MasterActivity = {
                id: `ACT-${Date.now()}`,
                name: customTitle.trim(),
                locationId: locId,
                duration: type === 'visa' ? 'Instant' : 'Full Day',
                cost: costVal,
                category: type === 'visa' ? 'Other' : 'Leisure',
                status: 'Active'
            };
            await addMasterActivity(actObj);
        }

        handleAdd({
            id: `${type}-${Date.now()}`,
            type,
            day,
            title: customTitle.trim(),
            description: type === 'visa' ? 'Visa / Entry Fee' : 'Local Guide & Assistance',
            netCost: costVal,
            baseMarkupPercent: 10,
            extraMarkupFlat: 0,
            quantity: 1,
            time: '09:00'
        });
        setCustomTitle('');
        setCustomCost('');
    };

    const tabs: { id: ServiceType; label: string; count?: number; icon: React.ReactNode }[] = [
        { id: 'hotel', label: 'Hotels', count: filteredHotels.length, icon: <Hotel size={14} /> },
        { id: 'transport', label: 'Transport', count: filteredTransports.length, icon: <Car size={14} /> },
        { id: 'activity', label: 'Activities', count: filteredActivities.length, icon: <Bike size={14} /> },
        { id: 'flight', label: 'Flight', icon: <Plane size={14} /> },
        { id: 'visa', label: 'Visa / Fees', icon: <Shield size={14} /> },
        { id: 'guide', label: 'Guide', icon: <UserCheck size={14} /> },
        { id: 'note', label: 'Notes & Tips', icon: <StickyNote size={14} /> },
    ];

    const notePresets = [
        { title: 'Hotel Check-in Policy', desc: 'Standard check-in time is 14:00. Early check-in subject to room availability.' },
        { title: 'Airport Placard Pick-up', desc: 'Uniformed driver will wait at arrival exit gate holding client name placard.' },
        { title: 'Monument Dress Code & IDs', desc: 'Carry original ID/Passport for all check-ins. Modest attire advised for shrines.' },
        { title: 'Baggage Transfer Notice', desc: 'Luggage will be transported directly from hotel to onward vehicle.' },
        { title: 'Evening Free for Shopping', desc: 'Explore local traditional bazaars and handicraft emporiums at leisure.' },
        { title: 'Checkout & Airport Drop', desc: 'Complete checkout by 11:00 AM before departure airport transfer.' }
    ];

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const showSearch = ['hotel', 'activity', 'transport'].includes(activeTab);
    const showDestFilter = ['hotel', 'activity'].includes(activeTab);
    const hasDestFilter = showDestFilter && tripLocationSet.size > 0;
    const isFiltered = hasDestFilter && !showAll;

    const content = (
        <div className="fixed inset-0 z-[9995] flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
            {/* Sized appropriately: max-w-3xl, max-h-[80vh] so it never exceeds screen and leaves comfortable margins */}
            <div className="bg-white dark:bg-[#121B22] w-full max-w-2xl sm:max-w-3xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800">

                {/* ── TOP HEADER BAR ── */}
                <div className="px-4 py-2.5 sm:px-5 sm:py-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-[#16222C] shrink-0">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="px-2 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold text-[10px] uppercase tracking-wide border border-amber-200 dark:border-amber-800">
                                Day {day} Itinerary
                            </span>
                            {dayLocationName && (
                                <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
                                    <MapPin size={11} className="text-amber-500 shrink-0" /> {dayLocationName}
                                </span>
                            )}
                        </div>
                        <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                            Add Services to Day {day}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                            Currently: <span className="font-bold text-slate-700 dark:text-slate-300">{dayItems.length} service{dayItems.length !== 1 ? 's' : ''}</span>
                            {dayHotelsCount > 0 && ` (${dayHotelsCount} Hotel)`}
                            {dayTransportsCount > 0 && ` (${dayTransportsCount} Cab)`}
                            {dayActivitiesCount > 0 && ` (${dayActivitiesCount} Activity)`}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {recentlyAddedIds.length > 0 && (
                            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold animate-in fade-in">
                                <Check size={12} className="stroke-[3]" />
                                <span>{recentlyAddedIds.length} Added</span>
                            </div>
                        )}
                        <button 
                            onClick={onClose} 
                            className="size-8 sm:size-9 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors text-slate-500 dark:text-slate-300 shadow-xs"
                            title="Close"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* ── CATEGORY PILL NAVIGATION TABS ── */}
                <div className="bg-white dark:bg-[#121B22] border-b border-slate-200 dark:border-slate-800 px-3 sm:px-5 py-1.5 overflow-x-auto no-scrollbar shrink-0">
                    <div className="flex items-center gap-1 min-w-max">
                        {tabs.map(tab => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id);
                                        setSearchTerm('');
                                        setShowAll(false);
                                        setCustomTitle('');
                                        setCustomCost('');
                                        setShowMasterCreateModal(null);
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                        isActive
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                    }`}
                                >
                                    {tab.icon}
                                    <span>{tab.label}</span>
                                    {tab.count !== undefined && (
                                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                                            isActive 
                                                ? 'bg-white/25 text-white' 
                                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                        }`}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── TOOLBAR: SEARCH & SUB-FILTERS ── */}
                <div className="px-4 py-2 sm:px-5 sm:py-2.5 bg-slate-50/50 dark:bg-[#101820] border-b border-slate-200 dark:border-slate-800 shrink-0 space-y-2">
                    {showSearch && (
                        <div className="flex flex-col sm:flex-row gap-2">
                            {/* Search bar */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                <input
                                    placeholder={`Search ${activeTab === 'transport' ? 'vehicles (Sedan, Innova)...' : activeTab === 'hotel' ? 'hotels by name...' : 'activities...'}`}
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full bg-white dark:bg-[#18232D] border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-8 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                                    autoFocus
                                />
                                {searchTerm && (
                                    <button 
                                        onClick={() => setSearchTerm('')} 
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X size={13} />
                                    </button>
                                )}
                            </div>

                            {/* Add to Master DB Button */}
                            <button
                                onClick={() => setShowMasterCreateModal(activeTab)}
                                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shrink-0 transition-all shadow-xs"
                                title={`Add new ${activeTab} to system masters`}
                            >
                                <Plus size={14} className="stroke-[3]" />
                                <span>New {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} to Master</span>
                            </button>
                        </div>
                    )}

                    {/* SUB-FILTER CHIPS */}
                    {activeTab === 'hotel' && (
                        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
                            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Star:</span>
                                {[
                                    { id: 'all', label: 'All' },
                                    { id: '5', label: '⭐ 5 Star' },
                                    { id: '4', label: '⭐ 4 Star' },
                                    { id: '3', label: '⭐ 3 Star' },
                                ].map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => setHotelRatingFilter(f.id as any)}
                                        className={`px-2 py-0.5 text-[11px] font-bold rounded-md border transition-all ${
                                            hotelRatingFilter === f.id
                                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                        }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>

                            {hasDestFilter && (
                                <button
                                    onClick={() => setShowAll(v => !v)}
                                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 shrink-0"
                                >
                                    <Globe size={11} />
                                    {isFiltered ? `${dayLocationName || 'City'} Only (Show All)` : 'All Masters'}
                                </button>
                            )}
                        </div>
                    )}

                    {activeTab === 'transport' && (
                        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Category:</span>
                            {['all', 'Sedan', 'SUV', 'Tempo Traveller', 'Bus'].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setTransTypeFilter(cat as any)}
                                    className={`px-2 py-0.5 text-[11px] font-bold rounded-md border transition-all ${
                                        transTypeFilter === cat
                                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                    }`}
                                >
                                    {cat === 'all' ? 'All Vehicles' : cat}
                                </button>
                            ))}
                        </div>
                    )}

                    {activeTab === 'activity' && (
                        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
                            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Type:</span>
                                {['all', 'Sightseeing', 'Adventure', 'Cultural', 'Leisure'].map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setActCategoryFilter(cat as any)}
                                        className={`px-2 py-0.5 text-[11px] font-bold rounded-md border transition-all ${
                                            actCategoryFilter === cat
                                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                        }`}
                                    >
                                        {cat === 'all' ? 'All Types' : cat}
                                    </button>
                                ))}
                            </div>

                            {hasDestFilter && (
                                <button
                                    onClick={() => setShowAll(v => !v)}
                                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 shrink-0"
                                >
                                    <Globe size={11} />
                                    {isFiltered ? `${dayLocationName || 'City'} Only (Show All)` : 'All Masters'}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* ── MAIN CONTENT AREA (SLIM LIST VIEW - NO OVERFLOW OR DISTORTION) ── */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 bg-slate-100/50 dark:bg-[#0E151B]">

                    {/* 1. HOTELS LIST VIEW */}
                    {activeTab === 'hotel' && (
                        <div className="flex flex-col gap-2">
                            {filteredHotels.map(hotel => {
                                const isAdded = recentlyAddedIds.includes(hotel.id);
                                return (
                                    <div 
                                        key={hotel.id} 
                                        className={`bg-white dark:bg-[#18232D] px-3.5 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 group shadow-xs hover:shadow-sm ${
                                            isAdded 
                                                ? 'border-emerald-400 ring-1 ring-emerald-400/30 bg-emerald-50/20 dark:bg-emerald-950/10' 
                                                : 'border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/50'
                                        }`}
                                    >
                                        {/* Left: Fixed-dimension Thumbnail + Hotel Info */}
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            {/* Thumbnail - FIXED 64px x 56px so it can NEVER distort */}
                                            <div className="w-16 h-14 min-w-[64px] min-h-[56px] max-w-[64px] max-h-[56px] rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden border border-slate-200/60 dark:border-slate-700 relative">
                                                {hotel.image ? (
                                                    <img src={hotel.image} className="w-full h-full object-cover block rounded-lg" alt={hotel.name} />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                        <Hotel size={18} />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                                                        {hotel.name}
                                                    </h4>
                                                    <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-[10px] font-black flex items-center gap-0.5 shrink-0">
                                                        <Star size={9} className="fill-amber-400 text-amber-400" /> {hotel.rating}
                                                    </span>
                                                    {hotel.locationId && (
                                                        <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-0.5 truncate">
                                                            <MapPin size={10} className="text-amber-500 shrink-0" /> {getLocName(hotel.locationId)}
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {/* Amenities Chips inline */}
                                                <div className="flex items-center gap-1 mt-1 overflow-hidden max-h-5 flex-wrap">
                                                    {(hotel.amenities || ['Breakfast Included']).slice(0, 3).map((a, i) => (
                                                        <span key={i} className="text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60 truncate">
                                                            {a}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Price & Add Button */}
                                        <div className="flex items-center gap-3 shrink-0 pl-1">
                                            <div className="text-right">
                                                <div className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                                                    ₹{Math.round(hotel.pricePerNight || 0).toLocaleString('en-IN')}
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-400 block">per night</span>
                                            </div>

                                            <button 
                                                onClick={() => handleAdd(createHotelItem(hotel), hotel.id)}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 shadow-xs active:scale-95 whitespace-nowrap ${
                                                    isAdded
                                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                                }`}
                                            >
                                                {isAdded ? (
                                                    <>
                                                        <Check size={12} className="stroke-[3]" /> Added
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus size={12} className="stroke-[3]" /> Add
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {activeTab === 'hotel' && filteredHotels.length === 0 && (
                        <EmptyState
                            label={isFiltered ? `No hotels cataloged for ${dayLocationName || 'this destination'}` : 'No hotels found'}
                            sub={isFiltered ? 'Switch to "Show All" or create a new hotel in Masters' : 'Add hotel directly to Master database'}
                            onCreate={() => setShowMasterCreateModal('hotel')}
                            buttonLabel="Add New Hotel to Master"
                        />
                    )}

                    {/* 2. TRANSPORT LIST VIEW */}
                    {activeTab === 'transport' && (
                        <div className="flex flex-col gap-2">
                            {filteredTransports.map(trans => {
                                const isAdded = recentlyAddedIds.includes(trans.id);
                                const isPerKm = (trans.baseRate || 0) < 100;
                                const estPackage = isPerKm 
                                    ? Math.max(2200, (trans.baseRate || 15) * 80) 
                                    : (trans.baseRate || 3500);

                                return (
                                    <div 
                                        key={trans.id} 
                                        className={`bg-white dark:bg-[#18232D] px-3.5 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 group shadow-xs hover:shadow-sm ${
                                            isAdded 
                                                ? 'border-emerald-400 ring-1 ring-emerald-400/30 bg-emerald-50/20 dark:bg-emerald-950/10' 
                                                : 'border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/50'
                                        }`}
                                    >
                                        {/* Left: Vehicle Icon + Details */}
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className="w-14 h-12 min-w-[56px] min-h-[48px] max-w-[56px] max-h-[48px] rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/20 border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                                                <Car size={20} />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                                                        {trans.name}
                                                    </h4>
                                                    <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold uppercase shrink-0">
                                                        {trans.type}
                                                    </span>
                                                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0">
                                                        <Users size={10} /> {trans.capacity} Seats
                                                    </span>
                                                </div>

                                                <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1.5 truncate">
                                                    <span>Air Conditioned</span>
                                                    <span>•</span>
                                                    <span>Chauffeur Included</span>
                                                </p>
                                            </div>
                                        </div>

                                        {/* Right: Rate & Add Button */}
                                        <div className="flex items-center gap-3 shrink-0 pl-1">
                                            <div className="text-right">
                                                {isPerKm ? (
                                                    <>
                                                        <div className="flex items-baseline justify-end gap-1 font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                                                            <span>₹{trans.baseRate}</span>
                                                            <span className="text-[9px] font-bold text-slate-400">/ km</span>
                                                        </div>
                                                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 block">
                                                            Est. 80km: ₹{estPackage.toLocaleString('en-IN')}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                                                            ₹{Math.round(trans.baseRate || 0).toLocaleString('en-IN')}
                                                        </div>
                                                        <span className="text-[9px] font-bold text-slate-400 block">per day</span>
                                                    </>
                                                )}
                                            </div>

                                            <button 
                                                onClick={() => handleAdd(createTransportItem(trans), trans.id)}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 shadow-xs active:scale-95 whitespace-nowrap ${
                                                    isAdded
                                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                }`}
                                            >
                                                {isAdded ? (
                                                    <>
                                                        <Check size={12} className="stroke-[3]" /> Added
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus size={12} className="stroke-[3]" /> Add
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {activeTab === 'transport' && filteredTransports.length === 0 && (
                        <EmptyState
                            label="No vehicles found matching filter"
                            sub="Add custom cabs, SUVs, or Tempo Travellers to Master database"
                            onCreate={() => setShowMasterCreateModal('transport')}
                            buttonLabel="Add New Vehicle to Master"
                        />
                    )}

                    {/* 3. ACTIVITIES LIST VIEW */}
                    {activeTab === 'activity' && (
                        <div className="flex flex-col gap-2">
                            {filteredActivities.map(act => {
                                const isAdded = recentlyAddedIds.includes(act.id);
                                return (
                                    <div 
                                        key={act.id} 
                                        className={`bg-white dark:bg-[#18232D] px-3.5 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 group shadow-xs hover:shadow-sm ${
                                            isAdded 
                                                ? 'border-emerald-400 ring-1 ring-emerald-400/30 bg-emerald-50/20 dark:bg-emerald-950/10' 
                                                : 'border-slate-200/80 dark:border-slate-800 hover:border-orange-500/50'
                                        }`}
                                    >
                                        {/* Left: Fixed Thumbnail + Info */}
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className="w-16 h-14 min-w-[64px] min-h-[56px] max-w-[64px] max-h-[56px] rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-800/40 shrink-0 overflow-hidden flex items-center justify-center text-orange-500">
                                                {act.image ? (
                                                    <img src={act.image} className="w-full h-full object-cover block rounded-lg" alt={act.name} />
                                                ) : (
                                                    <Bike size={18} />
                                                )}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors truncate">
                                                        {act.name}
                                                    </h4>
                                                    <span className="px-1.5 py-0.2 rounded bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 text-[10px] font-extrabold uppercase shrink-0">
                                                        {act.category}
                                                    </span>
                                                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0">
                                                        <Clock size={10} /> {act.duration}
                                                    </span>
                                                </div>

                                                <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                                                    <MapPin size={10} className="text-amber-500 shrink-0" /> {getLocName(act.locationId)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Right: Cost & Add Button */}
                                        <div className="flex items-center gap-3 shrink-0 pl-1">
                                            <div className="text-right">
                                                <div className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                                                    ₹{Math.round(act.cost || 0).toLocaleString('en-IN')}
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-400 block">per person</span>
                                            </div>

                                            <button 
                                                onClick={() => handleAdd(createActivityItem(act), act.id)}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 shadow-xs active:scale-95 whitespace-nowrap ${
                                                    isAdded
                                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                        : 'bg-orange-600 hover:bg-orange-700 text-white'
                                                }`}
                                            >
                                                {isAdded ? (
                                                    <>
                                                        <Check size={12} className="stroke-[3]" /> Added
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus size={12} className="stroke-[3]" /> Add
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {activeTab === 'activity' && filteredActivities.length === 0 && (
                        <EmptyState
                            label={isFiltered ? `No activities found in ${dayLocationName || 'this destination'}` : 'No activities found'}
                            sub={isFiltered ? 'Switch to "Show All" or create a new activity in Masters' : 'Add activity directly to Master database'}
                            onCreate={() => setShowMasterCreateModal('activity')}
                            buttonLabel="Add New Activity to Master"
                        />
                    )}

                    {/* 4. FLIGHT TAB */}
                    {activeTab === 'flight' && (
                        <div className="max-w-lg mx-auto py-3">
                            <div className="bg-white dark:bg-[#18232D] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <div className="flex items-center gap-2.5 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                                    <div className="size-10 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center border border-blue-200 dark:border-blue-800">
                                        <Plane size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-sm text-slate-900 dark:text-white">Schedule Flight for Day {day}</h4>
                                        <p className="text-[11px] text-slate-400">Configure departure, flight number, and net ticket cost.</p>
                                    </div>
                                </div>

                                <div className="space-y-2.5">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Flight Route / Label</label>
                                        <input
                                            type="text"
                                            value={flightTitle}
                                            onChange={e => setFlightTitle(e.target.value)}
                                            placeholder="e.g. Flight: Delhi (DEL) to Jaipur (JAI)"
                                            className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Airline</label>
                                            <input
                                                type="text"
                                                value={flightAirline}
                                                onChange={e => setFlightAirline(e.target.value)}
                                                placeholder="e.g. IndiGo"
                                                className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Flight Number</label>
                                            <input
                                                type="text"
                                                value={flightNo}
                                                onChange={e => setFlightNo(e.target.value)}
                                                placeholder="e.g. 6E-512"
                                                className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dep Time</label>
                                            <input
                                                type="text"
                                                value={flightDepTime}
                                                onChange={e => setFlightDepTime(e.target.value)}
                                                placeholder="10:30"
                                                className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Duration</label>
                                            <input
                                                type="text"
                                                value={flightDuration}
                                                onChange={e => setFlightDuration(e.target.value)}
                                                placeholder="2h 15m"
                                                className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cost (₹)</label>
                                            <input
                                                type="number"
                                                value={flightCost}
                                                onChange={e => setFlightCost(e.target.value)}
                                                placeholder="4500"
                                                className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleAdd(createFlightItem())}
                                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 mt-2"
                                    >
                                        <Plus size={14} strokeWidth={3} />
                                        <span>Add Flight to Day {day}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 5. VISA TAB */}
                    {activeTab === 'visa' && (
                        <CustomEntryForm
                            icon={<Shield size={24} />}
                            color="purple"
                            title="Add Visa / Border Permit Fee"
                            description="Add visa processing, border clearance, or monument entry permits."
                            valueName={customTitle}
                            valueCost={customCost}
                            onChangeName={setCustomTitle}
                            onChangeCost={setCustomCost}
                            saveToMaster={saveToMaster}
                            onToggleSaveToMaster={setSaveToMaster}
                            onAdd={() => handleAddCustom('visa')}
                            placeholder="e.g. Tourist E-Visa (Single Entry)"
                            day={day}
                        />
                    )}

                    {/* 6. GUIDE TAB */}
                    {activeTab === 'guide' && (
                        <CustomEntryForm
                            icon={<UserCheck size={24} />}
                            color="teal"
                            title="Add Local Guide / Escort"
                            description="Add a government-approved local escort or language interpreter."
                            valueName={customTitle}
                            valueCost={customCost}
                            onChangeName={setCustomTitle}
                            onChangeCost={setCustomCost}
                            saveToMaster={saveToMaster}
                            onToggleSaveToMaster={setSaveToMaster}
                            onAdd={() => handleAddCustom('guide')}
                            placeholder="e.g. Full Day English Speaking Escort"
                            day={day}
                        />
                    )}

                    {/* 7. NOTES & LOGISTICS TAB */}
                    {activeTab === 'note' && (
                        <div className="py-1 space-y-2">
                            <div className="text-center max-w-md mx-auto mb-1">
                                <h3 className="text-sm font-black text-slate-900 dark:text-white">Preset Travel Tips & Logistics</h3>
                                <p className="text-slate-400 text-[11px]">Click any preset row below to instantly add it to Day {day}.</p>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                {notePresets.map((preset, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => handleAdd(createNoteItem(preset.desc, preset.title))}
                                        className="bg-white dark:bg-[#18232D] px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-amber-400 hover:shadow-xs transition-all cursor-pointer group flex items-center justify-between gap-3"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <h5 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                                                <Sparkles size={12} className="text-amber-500 shrink-0" />
                                                {preset.title}
                                            </h5>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{preset.desc}</p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 group-hover:underline flex items-center gap-0.5">
                                                <Plus size={12} className="stroke-[3]" /> Add
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── STICKY BOTTOM ACTION DOCK ── */}
                <div className="px-4 py-2.5 sm:px-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#16222C] flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 min-w-0">
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                        <span className="truncate">
                            Day {day} Total: <span className="font-bold text-slate-900 dark:text-white">{dayItems.length} service{dayItems.length !== 1 ? 's' : ''}</span>
                            {' • '}
                            <span className="font-bold text-slate-900 dark:text-white">₹{dayTotalNetCost.toLocaleString('en-IN')}</span> Net
                        </span>
                        {lastAddedTitle && (
                            <span className="hidden md:inline text-emerald-600 dark:text-emerald-400 text-[10px] font-bold ml-1 truncate">
                                (Added: {lastAddedTitle})
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600 text-white dark:text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
                        >
                            <Check size={13} className="stroke-[3]" />
                            <span>Done & Return to Day {day}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ── INLINE MASTER CREATION SUB-MODAL ── */}
            {showMasterCreateModal && (
                <div className="fixed inset-0 z-[9998] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1A2633] w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
                        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#0B1116]">
                            <div className="flex items-center gap-2">
                                <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600">
                                    <Building2 size={16} />
                                </span>
                                <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                                    Add New {showMasterCreateModal.charAt(0).toUpperCase() + showMasterCreateModal.slice(1)} to Master DB
                                </h4>
                            </div>
                            <button
                                onClick={() => setShowMasterCreateModal(null)}
                                className="size-7 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        <div className="p-3.5 space-y-2.5 overflow-y-auto">
                            {/* HOTEL FORM */}
                            {showMasterCreateModal === 'hotel' && (
                                <>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hotel Name *</label>
                                        <input
                                            type="text"
                                            value={newHotelName}
                                            onChange={e => setNewHotelName(e.target.value)}
                                            placeholder="e.g. Taj Lake Palace"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Location</label>
                                        <select
                                            value={newHotelLocation}
                                            onChange={e => setNewHotelLocation(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none text-slate-900 dark:text-white"
                                        >
                                            <option value="">Select Location</option>
                                            {masterLocations.map(loc => (
                                                <option key={loc.id} value={loc.id}>{loc.name} ({loc.region})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rating (Stars)</label>
                                            <select
                                                value={newHotelRating}
                                                onChange={e => setNewHotelRating(e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none text-slate-900 dark:text-white"
                                            >
                                                <option value="5">5 Star</option>
                                                <option value="4">4 Star</option>
                                                <option value="3">3 Star</option>
                                                <option value="2">2 Star</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Price / Night (₹)</label>
                                            <input
                                                type="number"
                                                value={newHotelPrice}
                                                onChange={e => setNewHotelPrice(e.target.value)}
                                                placeholder="e.g. 12000"
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none text-slate-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Address / Area</label>
                                        <input
                                            type="text"
                                            value={newHotelAddress}
                                            onChange={e => setNewHotelAddress(e.target.value)}
                                            placeholder="e.g. Pichola Lake, Udaipur"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none text-slate-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Amenities</label>
                                        <input
                                            type="text"
                                            value={newHotelAmenities}
                                            onChange={e => setNewHotelAmenities(e.target.value)}
                                            placeholder="Pool, Wifi, Spa"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none text-slate-900 dark:text-white"
                                        />
                                    </div>
                                    <button
                                        onClick={handleCreateMasterHotel}
                                        disabled={!newHotelName.trim()}
                                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 mt-2"
                                    >
                                        <Save size={13} /> Save to Master & Add to Day {day}
                                    </button>
                                </>
                            )}

                            {/* ACTIVITY FORM */}
                            {showMasterCreateModal === 'activity' && (
                                <>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Activity Name *</label>
                                        <input
                                            type="text"
                                            value={newActName}
                                            onChange={e => setNewActName(e.target.value)}
                                            placeholder="e.g. Desert Safari & Cultural Night"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Location</label>
                                        <select
                                            value={newActLocation}
                                            onChange={e => setNewActLocation(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none text-slate-900 dark:text-white"
                                        >
                                            <option value="">Select Location</option>
                                            {masterLocations.map(loc => (
                                                <option key={loc.id} value={loc.id}>{loc.name} ({loc.region})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cost (₹)</label>
                                            <input
                                                type="number"
                                                value={newActCost}
                                                onChange={e => setNewActCost(e.target.value)}
                                                placeholder="e.g. 2500"
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none text-slate-900 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Duration</label>
                                            <input
                                                type="text"
                                                value={newActDuration}
                                                onChange={e => setNewActDuration(e.target.value)}
                                                placeholder="e.g. 3 Hours"
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none text-slate-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category</label>
                                        <select
                                            value={newActCategory}
                                            onChange={e => setNewActCategory(e.target.value as any)}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none text-slate-900 dark:text-white"
                                        >
                                            <option value="Sightseeing">Sightseeing</option>
                                            <option value="Adventure">Adventure</option>
                                            <option value="Cultural">Cultural</option>
                                            <option value="Leisure">Leisure</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <button
                                        onClick={handleCreateMasterActivity}
                                        disabled={!newActName.trim()}
                                        className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 mt-2"
                                    >
                                        <Save size={13} /> Save to Master & Add to Day {day}
                                    </button>
                                </>
                            )}

                            {/* TRANSPORT FORM */}
                            {showMasterCreateModal === 'transport' && (
                                <>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Vehicle Name *</label>
                                        <input
                                            type="text"
                                            value={newTransName}
                                            onChange={e => setNewTransName(e.target.value)}
                                            placeholder="e.g. Innova Crysta / Urbania"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Vehicle Type</label>
                                            <select
                                                value={newTransType}
                                                onChange={e => setNewTransType(e.target.value as any)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none text-slate-900 dark:text-white"
                                            >
                                                <option value="SUV">SUV</option>
                                                <option value="Sedan">Sedan</option>
                                                <option value="Tempo Traveller">Tempo Traveller</option>
                                                <option value="Bus">Bus</option>
                                                <option value="Hatchback">Hatchback</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Capacity (Seats)</label>
                                            <input
                                                type="number"
                                                value={newTransCapacity}
                                                onChange={e => setNewTransCapacity(e.target.value)}
                                                placeholder="e.g. 6"
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none text-slate-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rate per Day / Base Rate (₹)</label>
                                        <input
                                            type="number"
                                            value={newTransBaseRate}
                                            onChange={e => setNewTransBaseRate(e.target.value)}
                                            placeholder="e.g. 3500"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none text-slate-900 dark:text-white"
                                        />
                                    </div>
                                    <button
                                        onClick={handleCreateMasterTransport}
                                        disabled={!newTransName.trim()}
                                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 mt-2"
                                    >
                                        <Save size={13} /> Save to Master & Add to Day {day}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    if (!mounted) return null;
    return createPortal(content, document.body);
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EmptyState: React.FC<{
    label: string;
    sub: string;
    onCreate?: () => void;
    buttonLabel?: string;
}> = ({ label, sub, onCreate, buttonLabel }) => (
    <div className="text-center py-10 px-4">
        <div className="size-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
            <Compass size={24} />
        </div>
        <p className="font-bold text-slate-700 dark:text-slate-300 text-xs sm:text-sm">{label}</p>
        <p className="text-[11px] text-slate-400 mt-0.5 mb-3 max-w-xs mx-auto">{sub}</p>
        {onCreate && (
            <button
                onClick={onCreate}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all inline-flex items-center gap-1 active:scale-95"
            >
                <Plus size={13} strokeWidth={3} />
                {buttonLabel || 'Add to Master Database'}
            </button>
        )}
    </div>
);

const CustomEntryForm: React.FC<{
    icon: React.ReactNode;
    color: 'purple' | 'teal';
    title: string;
    description: string;
    placeholder: string;
    valueName: string;
    valueCost: string;
    day: number;
    saveToMaster?: boolean;
    onToggleSaveToMaster?: (v: boolean) => void;
    onChangeName: (v: string) => void;
    onChangeCost: (v: string) => void;
    onAdd: () => void;
}> = ({ icon, color, title, description, placeholder, valueName, valueCost, day, saveToMaster, onToggleSaveToMaster, onChangeName, onChangeCost, onAdd }) => {
    const colorMap = {
        purple: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
        teal: 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800',
    };
    const btnMap = {
        purple: 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20',
        teal: 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/20',
    };

    return (
        <div className="max-w-md mx-auto py-3">
            <div className="bg-white dark:bg-[#18232D] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-2.5 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className={`size-10 rounded-xl flex items-center justify-center border ${colorMap[color]}`}>
                        {icon}
                    </div>
                    <div>
                        <h4 className="font-black text-sm text-slate-900 dark:text-white">{title}</h4>
                        <p className="text-[11px] text-slate-400">{description}</p>
                    </div>
                </div>

                <div className="space-y-2.5">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Service Description</label>
                        <input
                            type="text"
                            placeholder={placeholder}
                            value={valueName}
                            onChange={e => onChangeName(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-bold text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            autoFocus
                        />
                    </div>
                    
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Net Cost (₹)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                            <input
                                type="number"
                                placeholder="0 if included/free"
                                value={valueCost}
                                onChange={e => onChangeCost(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg pl-7 pr-3 py-1.5 font-bold text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    {onToggleSaveToMaster && (
                        <label className="flex items-center gap-2 pt-0.5 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={saveToMaster || false}
                                onChange={e => onToggleSaveToMaster(e.target.checked)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 size-3.5"
                            />
                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Save to Master DB for future proposals</span>
                        </label>
                    )}

                    <button
                        onClick={onAdd}
                        disabled={!valueName.trim()}
                        className={`w-full py-2.5 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 mt-1.5 ${btnMap[color]}`}
                    >
                        <Plus size={14} className="stroke-[3]" /> Add to Day {day}
                    </button>
                </div>
            </div>
        </div>
    );
};
