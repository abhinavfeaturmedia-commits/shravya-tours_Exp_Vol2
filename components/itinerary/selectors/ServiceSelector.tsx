import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../../../context/DataContext';
import { useItinerary, ItineraryItem, ServiceType } from '../ItineraryContext';
import { MasterHotel, MasterActivity, MasterTransport, MasterTransportType } from '../../../types';
import { X, Search, Hotel, Bike, Car, Plane, StickyNote, Plus, MapPin, Star, Clock, Users, ArrowRight, Shield, UserCheck, Globe, Save, CheckCircle2, Sparkles, Building2, Layers } from 'lucide-react';

interface ServiceSelectorProps {
    day: number;
    onClose: () => void;
}

export const ServiceSelector: React.FC<ServiceSelectorProps> = ({ day, onClose }) => {
    const { addItem, tripDetails } = useItinerary();
    const {
        masterHotels, masterActivities, masterTransports, masterLocations,
        addMasterHotel, addMasterActivity, addMasterTransport
    } = useData();

    const [activeTab, setActiveTab] = useState<ServiceType>('hotel');
    const [searchTerm, setSearchTerm] = useState('');
    const [showAll, setShowAll] = useState(false);

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

            // Cross-map with masterLocations (resolve ID -> Name/Region and Name -> ID/Region)
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

        // Determine specific destination leg for this day (e.g. Day 1 -> Leg 1)
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
        if (!itemLocId) return true; // Unassigned location items act as global masters
        const trimmed = String(itemLocId).trim();
        if (tripLocationSet.size === 0) return true;
        return tripLocationSet.has(trimmed) || tripLocationSet.has(trimmed.toLowerCase());
    };

    // Filtered lists
    const filteredHotels = useMemo(() => {
        const query = (searchTerm || '').toLowerCase();
        const active = (masterHotels ?? []).filter(h => h && h.status === 'Active' && (h.name || '').toLowerCase().includes(query));
        if (showAll || tripLocationSet.size === 0) return active;
        return active.filter(h => matchesLocation(h.locationId));
    }, [masterHotels, searchTerm, showAll, tripLocationSet]);

    const allActiveHotels = useMemo(() => {
        const query = (searchTerm || '').toLowerCase();
        return (masterHotels ?? []).filter(h => h && h.status === 'Active' && (h.name || '').toLowerCase().includes(query));
    }, [masterHotels, searchTerm]);

    const filteredActivities = useMemo(() => {
        const query = (searchTerm || '').toLowerCase();
        const active = (masterActivities ?? []).filter(a => a && a.status === 'Active' && (a.name || '').toLowerCase().includes(query));
        if (showAll || tripLocationSet.size === 0) return active;
        return active.filter(a => matchesLocation(a.locationId));
    }, [masterActivities, searchTerm, showAll, tripLocationSet]);

    const allActiveActivities = useMemo(() => {
        const query = (searchTerm || '').toLowerCase();
        return (masterActivities ?? []).filter(a => a && a.status === 'Active' && (a.name || '').toLowerCase().includes(query));
    }, [masterActivities, searchTerm]);

    const filteredTransports = useMemo(() => {
        const query = (searchTerm || '').toLowerCase();
        const active = (masterTransports ?? []).filter(t => t && t.status === 'Active' && (t.name || '').toLowerCase().includes(query));
        return active;
    }, [masterTransports, searchTerm]);

    const handleAdd = (item: Omit<ItineraryItem, 'sellPrice'>) => {
        addItem(item);
        onClose();
    };

    const createHotelItem = (hotel: MasterHotel): Omit<ItineraryItem, 'sellPrice'> => ({
        id: `hotel-${Date.now()}`,
        type: 'hotel',
        day,
        title: hotel.name,
        description: `${hotel.rating}★ Hotel`,
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
        description: activity.category,
        netCost: activity.cost,
        baseMarkupPercent: 15,
        extraMarkupFlat: 0,
        quantity: 1,
        duration: activity.duration,
        masterId: activity.id,
        time: '10:00'
    });

    const createTransportItem = (transport: MasterTransport): Omit<ItineraryItem, 'sellPrice'> => ({
        id: `trans-${Date.now()}`,
        type: 'transport',
        day,
        title: transport.name,
        description: `${transport.type} (Capacity: ${transport.capacity})`,
        netCost: transport.baseRate,
        baseMarkupPercent: 15,
        extraMarkupFlat: 0,
        quantity: 1,
        masterId: transport.id,
        time: '09:00'
    });

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
        title: titleText || 'Note',
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
        handleAdd(createHotelItem(hotelObj));
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
        handleAdd(createActivityItem(actObj));
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
        handleAdd(createTransportItem(transObj));
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
    };

    const tabs: { id: ServiceType; label: string; icon: React.ReactNode }[] = [
        { id: 'hotel', label: 'Hotels', icon: <Hotel size={16} /> },
        { id: 'activity', label: 'Activities', icon: <Bike size={16} /> },
        { id: 'transport', label: 'Transport', icon: <Car size={16} /> },
        { id: 'flight', label: 'Flight', icon: <Plane size={16} /> },
        { id: 'visa', label: 'Visa', icon: <Shield size={16} /> },
        { id: 'guide', label: 'Guide', icon: <UserCheck size={16} /> },
        { id: 'note', label: 'Note', icon: <StickyNote size={16} /> },
    ];

    const notePresets = [
        { title: 'Hotel Check-in', desc: 'Standard check-in time is 14:00. Early check-in subject to room availability.' },
        { title: 'Airport Pick-up', desc: 'Representative will wait at arrival gate with guest name placard.' },
        { title: 'Leisure & Shopping', desc: 'Free time for local markets, souvenir shopping, and street food.' },
        { title: 'Important Instructions', desc: 'Carry original ID cards & voucher copies for all monument check-ins.' },
        { title: 'Checkout & Departure', desc: 'Complete checkout by 11:00 AM before departure transfer.' }
    ];

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const showSearch = ['hotel', 'activity', 'transport'].includes(activeTab);
    const showDestFilter = ['hotel', 'activity'].includes(activeTab);
    const filteredCount = activeTab === 'hotel' ? filteredHotels.length : filteredActivities.length;
    const totalCount = activeTab === 'hotel' ? allActiveHotels.length : allActiveActivities.length;
    const hasDestFilter = showDestFilter && tripLocationSet.size > 0;
    const isFiltered = hasDestFilter && !showAll;

    const content = (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 md:p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1A2633] w-full max-w-3xl max-h-[90vh] md:max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-20 duration-300 rounded-2xl shadow-2xl">

                {/* Header */}
                <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#1A2633] shrink-0">
                    <div>
                        <h3 className="font-black text-lg md:text-xl text-slate-900 dark:text-white">Add to Day {day}</h3>
                        <p className="text-[10px] md:text-xs text-slate-500 font-medium">Select or create a master service to add to the itinerary.</p>
                    </div>
                    <button onClick={onClose} className="size-8 md:size-10 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-50 dark:bg-[#0B1116] border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 pt-2 gap-1 overflow-x-auto no-scrollbar shrink-0">
                    {tabs.map(tab => (
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
                            className={`flex items-center gap-1.5 px-3 md:px-4 py-3 text-xs font-bold border-b-[3px] transition-all whitespace-nowrap
                                ${activeTab === tab.id
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 rounded-t-lg'}`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* Search + Destination filter + Create Master Button Bar */}
                <div className="p-4 md:p-6 flex-1 overflow-hidden flex flex-col bg-slate-50 dark:bg-[#0B1116]">

                    {showSearch && (
                        <div className="mb-3 flex gap-2 shrink-0">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    placeholder={`Search ${activeTab}s…`}
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-4 py-3 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-stone-700 text-sm"
                                    autoFocus
                                />
                            </div>
                            <button
                                onClick={() => setShowMasterCreateModal(activeTab)}
                                className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow font-xs flex items-center gap-1.5 shrink-0 transition-all active:scale-95"
                                title={`Add new ${activeTab} to Masters DB`}
                            >
                                <Plus size={16} strokeWidth={3} />
                                <span className="hidden sm:inline">Add {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} to Master</span>
                                <span className="sm:hidden">+ Master</span>
                            </button>
                        </div>
                    )}

                    {/* Destination filter notice */}
                    {hasDestFilter && (
                        <div className="mb-3 shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800 rounded-xl px-3.5 py-2.5 gap-2">
                            <p className="text-xs font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                                <Globe size={14} className="text-indigo-500 shrink-0" />
                                {isFiltered
                                    ? `Showing ${filteredCount} of ${totalCount} ${activeTab}s for ${dayLocationName ? `Day ${day} (${dayLocationName})` : 'your trip destinations'}`
                                    : `Showing all ${totalCount} ${activeTab}s across System Masters`}
                            </p>
                            <button
                                onClick={() => setShowAll(v => !v)}
                                className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 px-3 py-1 rounded-lg transition-all shadow-sm shrink-0"
                            >
                                {isFiltered ? 'Show All System Masters' : 'Filter by Trip Destinations'}
                            </button>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto pr-1 space-y-3">

                        {/* HOTELS */}
                        {activeTab === 'hotel' && filteredHotels.map(hotel => (
                            <div key={hotel.id} className="bg-white dark:bg-[#1A2633] p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 hover:shadow-lg transition-all flex gap-4 group cursor-pointer" onClick={() => handleAdd(createHotelItem(hotel))}>
                                <div className="size-16 rounded-lg bg-slate-200 shrink-0 overflow-hidden">
                                    {hotel.image ? <img src={hotel.image} className="w-full h-full object-cover" alt={hotel.name} /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><Hotel size={20} /></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors truncate">{hotel.name}</h4>
                                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500 mt-1">
                                        <span className="flex items-center gap-1"><Star size={10} className="text-orange-500 fill-orange-500" /> {hotel.rating}</span>
                                        <span className="flex items-center gap-1 truncate"><MapPin size={10} /> {getLocName(hotel.locationId)}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                        {(hotel.amenities || []).slice(0, 3).map(a => (
                                            <span key={a} className="text-[9px] uppercase font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded">{a}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="text-right flex flex-col justify-between shrink-0">
                                    <div>
                                        <span className="block font-black text-slate-900 dark:text-white">₹{(hotel.pricePerNight || 0).toLocaleString('en-IN')}</span>
                                        <span className="text-[10px] text-slate-400 font-bold">per night</span>
                                    </div>
                                    <button className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 text-xs font-bold rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all flex items-center gap-1">
                                        Add <Plus size={12} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {activeTab === 'hotel' && filteredHotels.length === 0 && (
                            <EmptyState
                                label={isFiltered ? 'No hotels in your destinations' : 'No hotels found'}
                                sub={isFiltered ? 'Click "Show All" or create a new hotel in Masters' : 'Add hotel directly to Master database'}
                                onCreate={() => setShowMasterCreateModal('hotel')}
                                buttonLabel="+ Add New Hotel to Master"
                            />
                        )}

                        {/* ACTIVITIES */}
                        {activeTab === 'activity' && filteredActivities.map(activity => (
                            <div key={activity.id} className="bg-white dark:bg-[#1A2633] p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-orange-500/50 hover:shadow-lg transition-all flex gap-4 group cursor-pointer" onClick={() => handleAdd(createActivityItem(activity))}>
                                <div className="size-16 rounded-xl bg-orange-50 dark:bg-orange-900/10 shrink-0 overflow-hidden flex items-center justify-center text-orange-400">
                                    {activity.image ? <img src={activity.image} className="w-full h-full object-cover" alt={activity.name} /> : <Bike size={24} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-orange-500 transition-colors truncate">{activity.name}</h4>
                                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500 mt-1">
                                        <span className="uppercase tracking-wider text-slate-400">{activity.category}</span>
                                        <span className="flex items-center gap-1"><Clock size={10} /> {activity.duration}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1"><MapPin size={9} /> {getLocName(activity.locationId)}</span>
                                </div>
                                <div className="text-right flex flex-col justify-between shrink-0">
                                    <span className="block font-black text-slate-900 dark:text-white">₹{(activity.cost || 0).toLocaleString('en-IN')}</span>
                                    <button className="px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 text-xs font-bold rounded-lg group-hover:bg-orange-500 group-hover:text-white transition-all flex items-center gap-1">
                                        Add <Plus size={12} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {activeTab === 'activity' && filteredActivities.length === 0 && (
                            <EmptyState
                                label={isFiltered ? 'No activities in your destinations' : 'No activities found'}
                                sub={isFiltered ? 'Click "Show All" or create a new service in Masters' : 'Add activity directly to Master database'}
                                onCreate={() => setShowMasterCreateModal('activity')}
                                buttonLabel="+ Add New Activity to Master"
                            />
                        )}

                        {/* TRANSPORT */}
                        {activeTab === 'transport' && filteredTransports.map(trans => (
                            <div key={trans.id} className="bg-white dark:bg-[#1A2633] p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 hover:shadow-lg transition-all flex gap-4 group cursor-pointer" onClick={() => handleAdd(createTransportItem(trans))}>
                                <div className="size-16 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 shrink-0 flex items-center justify-center text-emerald-500">
                                    <Car size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">{trans.name}</h4>
                                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500 mt-1">
                                        <span className="uppercase tracking-wider">{trans.type}</span>
                                        <span className="flex items-center gap-1"><Users size={10} /> {trans.capacity} Seats</span>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col justify-between shrink-0">
                                    <span className="block font-black text-slate-900 dark:text-white">₹{(trans.baseRate || 0).toLocaleString('en-IN')}</span>
                                    <button className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 text-xs font-bold rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-all flex items-center gap-1">
                                        Add <Plus size={12} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {activeTab === 'transport' && filteredTransports.length === 0 && (
                            <EmptyState
                                label="No transport found"
                                sub="Add vehicles directly to Master database"
                                onCreate={() => setShowMasterCreateModal('transport')}
                                buttonLabel="+ Add New Vehicle to Master"
                            />
                        )}

                        {/* FLIGHT */}
                        {activeTab === 'flight' && (
                            <div className="max-w-md mx-auto py-6">
                                <div className="size-16 bg-blue-50 dark:bg-blue-900/10 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-500">
                                    <Plane size={32} />
                                </div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white text-center mb-1">Add Flight Details</h3>
                                <p className="text-slate-400 text-center mb-5 text-xs">Specify flight information and net cost for Day {day}.</p>
                                
                                <div className="space-y-3 bg-white dark:bg-[#1A2633] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Route / Title</label>
                                        <input
                                            type="text"
                                            value={flightTitle}
                                            onChange={e => setFlightTitle(e.target.value)}
                                            placeholder="e.g. Flight: Mumbai to Goa"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Airline</label>
                                            <input
                                                type="text"
                                                value={flightAirline}
                                                onChange={e => setFlightAirline(e.target.value)}
                                                placeholder="e.g. IndiGo"
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Flight No.</label>
                                            <input
                                                type="text"
                                                value={flightNo}
                                                onChange={e => setFlightNo(e.target.value)}
                                                placeholder="e.g. 6E-512"
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Dep Time</label>
                                            <input
                                                type="text"
                                                value={flightDepTime}
                                                onChange={e => setFlightDepTime(e.target.value)}
                                                placeholder="10:30"
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Duration</label>
                                            <input
                                                type="text"
                                                value={flightDuration}
                                                onChange={e => setFlightDuration(e.target.value)}
                                                placeholder="2h 15m"
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Cost (₹)</label>
                                            <input
                                                type="number"
                                                value={flightCost}
                                                onChange={e => setFlightCost(e.target.value)}
                                                placeholder="4500"
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleAdd(createFlightItem())}
                                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 mt-2"
                                    >
                                        Add Flight Block to Day {day} <ArrowRight size={14} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* VISA */}
                        {activeTab === 'visa' && (
                            <CustomEntryForm
                                icon={<Shield size={36} />}
                                color="purple"
                                title="Add Visa / Border Fee"
                                description="Add visa processing, border tax, or entry pass fees."
                                valueName={customTitle}
                                valueCost={customCost}
                                onChangeName={setCustomTitle}
                                onChangeCost={setCustomCost}
                                saveToMaster={saveToMaster}
                                onToggleSaveToMaster={setSaveToMaster}
                                onAdd={() => handleAddCustom('visa')}
                                placeholder="e.g. UAE Tourist Visa 30 Days"
                            />
                        )}

                        {/* GUIDE */}
                        {activeTab === 'guide' && (
                            <CustomEntryForm
                                icon={<UserCheck size={36} />}
                                color="teal"
                                title="Add Guide Service"
                                description="Add a local guide, monument escort, or interpreter service."
                                valueName={customTitle}
                                valueCost={customCost}
                                onChangeName={setCustomTitle}
                                onChangeCost={setCustomCost}
                                saveToMaster={saveToMaster}
                                onToggleSaveToMaster={setSaveToMaster}
                                onAdd={() => handleAddCustom('guide')}
                                placeholder="e.g. Full Day Local English Escort"
                            />
                        )}

                        {/* NOTE */}
                        {activeTab === 'note' && (
                            <div className="py-4 space-y-4">
                                <div className="text-center">
                                    <div className="size-16 bg-yellow-50 dark:bg-yellow-900/10 rounded-full flex items-center justify-center mx-auto mb-2 text-yellow-500">
                                        <StickyNote size={32} />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">Add Note / Instructions</h3>
                                    <p className="text-slate-400 max-w-sm mx-auto text-xs">Choose a preset template or add custom text.</p>
                                </div>

                                {/* Preset Templates */}
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Preset Master Templates</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {notePresets.map((preset, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => handleAdd(createNoteItem(preset.desc, preset.title))}
                                                className="bg-white dark:bg-[#1A2633] p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-yellow-400 hover:shadow transition-all cursor-pointer group"
                                            >
                                                <h5 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-yellow-600 transition-colors flex items-center gap-1.5">
                                                    <Sparkles size={12} className="text-yellow-500" />
                                                    {preset.title}
                                                </h5>
                                                <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{preset.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Blank Note */}
                                <div className="text-center pt-2">
                                    <button
                                        onClick={() => handleAdd(createNoteItem())}
                                        className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white font-bold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-2"
                                    >
                                        Add Custom Note Block <ArrowRight size={14} />
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* Quick Master Creation Sub-modal */}
            {showMasterCreateModal && (
                <div className="fixed inset-0 z-[120] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1A2633] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#0B1116]">
                            <div className="flex items-center gap-2">
                                <span className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600">
                                    <Building2 size={18} />
                                </span>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                    Add New {showMasterCreateModal.charAt(0).toUpperCase() + showMasterCreateModal.slice(1)} to Master DB
                                </h4>
                            </div>
                            <button
                                onClick={() => setShowMasterCreateModal(null)}
                                className="size-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-4 space-y-3">
                            {/* HOTEL FORM */}
                            {showMasterCreateModal === 'hotel' && (
                                <>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Hotel Name *</label>
                                        <input
                                            type="text"
                                            value={newHotelName}
                                            onChange={e => setNewHotelName(e.target.value)}
                                            placeholder="e.g. Taj Lake Palace"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Location</label>
                                        <select
                                            value={newHotelLocation}
                                            onChange={e => setNewHotelLocation(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-slate-900 dark:text-white"
                                        >
                                            <option value="">Select Location</option>
                                            {masterLocations.map(loc => (
                                                <option key={loc.id} value={loc.id}>{loc.name} ({loc.region})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Rating (Stars)</label>
                                            <select
                                                value={newHotelRating}
                                                onChange={e => setNewHotelRating(e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-slate-900 dark:text-white"
                                            >
                                                <option value="5">5 Star</option>
                                                <option value="4">4 Star</option>
                                                <option value="3">3 Star</option>
                                                <option value="2">2 Star</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Price / Night (₹)</label>
                                            <input
                                                type="number"
                                                value={newHotelPrice}
                                                onChange={e => setNewHotelPrice(e.target.value)}
                                                placeholder="e.g. 12000"
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-slate-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Address / Area</label>
                                        <input
                                            type="text"
                                            value={newHotelAddress}
                                            onChange={e => setNewHotelAddress(e.target.value)}
                                            placeholder="e.g. Pichola Lake, Udaipur"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-slate-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Amenities</label>
                                        <input
                                            type="text"
                                            value={newHotelAmenities}
                                            onChange={e => setNewHotelAmenities(e.target.value)}
                                            placeholder="Pool, Wifi, Spa"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-slate-900 dark:text-white"
                                        />
                                    </div>
                                    <button
                                        onClick={handleCreateMasterHotel}
                                        disabled={!newHotelName.trim()}
                                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-3"
                                    >
                                        <Save size={14} /> Save to Master & Add to Day {day}
                                    </button>
                                </>
                            )}

                            {/* ACTIVITY FORM */}
                            {showMasterCreateModal === 'activity' && (
                                <>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Activity Name *</label>
                                        <input
                                            type="text"
                                            value={newActName}
                                            onChange={e => setNewActName(e.target.value)}
                                            placeholder="e.g. Desert Safari & Cultural Night"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Location</label>
                                        <select
                                            value={newActLocation}
                                            onChange={e => setNewActLocation(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-slate-900 dark:text-white"
                                        >
                                            <option value="">Select Location</option>
                                            {masterLocations.map(loc => (
                                                <option key={loc.id} value={loc.id}>{loc.name} ({loc.region})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Cost (₹)</label>
                                            <input
                                                type="number"
                                                value={newActCost}
                                                onChange={e => setNewActCost(e.target.value)}
                                                placeholder="e.g. 2500"
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-slate-900 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Duration</label>
                                            <input
                                                type="text"
                                                value={newActDuration}
                                                onChange={e => setNewActDuration(e.target.value)}
                                                placeholder="e.g. 3 Hours"
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-slate-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Category</label>
                                        <select
                                            value={newActCategory}
                                            onChange={e => setNewActCategory(e.target.value as any)}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-slate-900 dark:text-white"
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
                                        className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-3"
                                    >
                                        <Save size={14} /> Save to Master & Add to Day {day}
                                    </button>
                                </>
                            )}

                            {/* TRANSPORT FORM */}
                            {showMasterCreateModal === 'transport' && (
                                <>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Vehicle Name *</label>
                                        <input
                                            type="text"
                                            value={newTransName}
                                            onChange={e => setNewTransName(e.target.value)}
                                            placeholder="e.g. Innova Crysta / Urbania"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Vehicle Type</label>
                                            <select
                                                value={newTransType}
                                                onChange={e => setNewTransType(e.target.value as any)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-slate-900 dark:text-white"
                                            >
                                                <option value="SUV">SUV</option>
                                                <option value="Sedan">Sedan</option>
                                                <option value="Tempo Traveller">Tempo Traveller</option>
                                                <option value="Bus">Bus</option>
                                                <option value="Hatchback">Hatchback</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Capacity (Seats)</label>
                                            <input
                                                type="number"
                                                value={newTransCapacity}
                                                onChange={e => setNewTransCapacity(e.target.value)}
                                                placeholder="e.g. 6"
                                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-slate-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Base Rate per Day (₹)</label>
                                        <input
                                            type="number"
                                            value={newTransBaseRate}
                                            onChange={e => setNewTransBaseRate(e.target.value)}
                                            placeholder="e.g. 4500"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-slate-900 dark:text-white"
                                        />
                                    </div>
                                    <button
                                        onClick={handleCreateMasterTransport}
                                        disabled={!newTransName.trim()}
                                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-3"
                                    >
                                        <Save size={14} /> Save to Master & Add to Day {day}
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
    <div className="text-center py-12">
        <p className="font-bold text-slate-500">{label}</p>
        <p className="text-xs text-slate-400 mt-1 mb-4">{sub}</p>
        {onCreate && (
            <button
                onClick={onCreate}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all inline-flex items-center gap-1.5 active:scale-95"
            >
                <Plus size={14} strokeWidth={3} />
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
    saveToMaster?: boolean;
    onToggleSaveToMaster?: (v: boolean) => void;
    onChangeName: (v: string) => void;
    onChangeCost: (v: string) => void;
    onAdd: () => void;
}> = ({ icon, color, title, description, placeholder, valueName, valueCost, saveToMaster, onToggleSaveToMaster, onChangeName, onChangeCost, onAdd }) => {
    const colorMap = {
        purple: 'bg-purple-50 text-purple-500 border-purple-200',
        teal: 'bg-teal-50 text-teal-500 border-teal-200',
    };
    const btnMap = {
        purple: 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20',
        teal: 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/20',
    };

    return (
        <div className="max-w-md mx-auto py-6">
            <div className={`size-16 rounded-full flex items-center justify-center mx-auto mb-3 border ${colorMap[color]}`}>{icon}</div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white text-center mb-1">{title}</h3>
            <p className="text-slate-400 text-center mb-5 text-xs">{description}</p>
            <div className="space-y-3 bg-white dark:bg-[#1A2633] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <input
                    type="text"
                    placeholder={placeholder}
                    value={valueName}
                    onChange={e => onChangeName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    autoFocus
                />
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                    <input
                        type="number"
                        placeholder="Cost (0 if free)"
                        value={valueCost}
                        onChange={e => onChangeCost(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-7 pr-4 py-3 font-bold text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
                {onToggleSaveToMaster && (
                    <label className="flex items-center gap-2 pt-1 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={saveToMaster || false}
                            onChange={e => onToggleSaveToMaster(e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 size-4"
                        />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Also save to Master Database for future proposals</span>
                    </label>
                )}
                <button
                    onClick={onAdd}
                    disabled={!valueName.trim()}
                    className={`w-full py-3 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 ${btnMap[color]}`}
                >
                    Add to Day <ArrowRight size={14} />
                </button>
            </div>
        </div>
    );
};
