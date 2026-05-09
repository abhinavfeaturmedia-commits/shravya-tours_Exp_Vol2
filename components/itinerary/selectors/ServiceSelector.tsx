import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../../../context/DataContext';
import { useItinerary, ItineraryItem, ServiceType } from '../ItineraryContext';
import { MasterHotel, MasterActivity, MasterTransport } from '../../../types';
import { X, Search, Hotel, Bike, Car, Plane, StickyNote, Plus, MapPin, Star, Clock, Users, ArrowRight, Shield, UserCheck, Globe } from 'lucide-react';

interface ServiceSelectorProps {
    day: number;
    onClose: () => void;
}

export const ServiceSelector: React.FC<ServiceSelectorProps> = ({ day, onClose }) => {
    const { addItem, tripDetails } = useItinerary();
    const { masterHotels, masterActivities, masterTransports, masterLocations } = useData();

    const [activeTab, setActiveTab] = useState<ServiceType>('hotel');
    const [searchTerm, setSearchTerm] = useState('');
    const [showAll, setShowAll] = useState(false);

    // Collect all destination location IDs for this trip
    const tripLocationIds = useMemo(() => {
        const ids = new Set<string>();
        if (tripDetails.destination) ids.add(tripDetails.destination);
        (tripDetails.destinations || []).forEach(d => { if (d.locationId) ids.add(d.locationId); });
        return ids;
    }, [tripDetails.destination, tripDetails.destinations]);

    const getLocName = (locId: string) =>
        masterLocations?.find(l => l.id === locId)?.name || locId || '—';

    // Filtered lists: by destination first, then by search
    const filterByDest = <T extends { locationId?: string }>(list: T[]) => {
        if (showAll || tripLocationIds.size === 0) return list;
        return list.filter(item => item.locationId && tripLocationIds.has(item.locationId));
    };

    const filteredHotels = useMemo(() => {
        const active = (masterHotels ?? []).filter(h => h.status === 'Active' && h.name.toLowerCase().includes(searchTerm.toLowerCase()));
        if (showAll || tripLocationIds.size === 0) return active;
        return active.filter(h => h.locationId && tripLocationIds.has(h.locationId));
    }, [masterHotels, searchTerm, showAll, tripLocationIds]);

    const allActiveHotels = useMemo(() =>
        (masterHotels ?? []).filter(h => h.status === 'Active' && h.name.toLowerCase().includes(searchTerm.toLowerCase())),
        [masterHotels, searchTerm]);

    const filteredActivities = useMemo(() => {
        const active = (masterActivities ?? []).filter(a => a.status === 'Active' && a.name.toLowerCase().includes(searchTerm.toLowerCase()));
        if (showAll || tripLocationIds.size === 0) return active;
        return active.filter(a => a.locationId && tripLocationIds.has(a.locationId));
    }, [masterActivities, searchTerm, showAll, tripLocationIds]);

    const allActiveActivities = useMemo(() =>
        (masterActivities ?? []).filter(a => a.status === 'Active' && a.name.toLowerCase().includes(searchTerm.toLowerCase())),
        [masterActivities, searchTerm]);

    const filteredTransports = useMemo(() =>
        (masterTransports ?? []).filter(t => t.status === 'Active' && t.name.toLowerCase().includes(searchTerm.toLowerCase())),
        [masterTransports, searchTerm]);

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
        title: 'New Flight',
        description: 'Flight Details',
        netCost: 0,
        baseMarkupPercent: 10,
        extraMarkupFlat: 0,
        quantity: 1,
        time: '10:00',
        duration: '2h'
    });

    const createNoteItem = (): Omit<ItineraryItem, 'sellPrice'> => ({
        id: `note-${Date.now()}`,
        type: 'note',
        day,
        title: 'Note',
        description: 'Add details here...',
        netCost: 0,
        baseMarkupPercent: 0,
        extraMarkupFlat: 0,
        quantity: 1
    });

    const tabs: { id: ServiceType; label: string; icon: React.ReactNode }[] = [
        { id: 'hotel', label: 'Hotels', icon: <Hotel size={16} /> },
        { id: 'activity', label: 'Activities', icon: <Bike size={16} /> },
        { id: 'transport', label: 'Transport', icon: <Car size={16} /> },
        { id: 'flight', label: 'Flight', icon: <Plane size={16} /> },
        { id: 'visa', label: 'Visa', icon: <Shield size={16} /> },
        { id: 'guide', label: 'Guide', icon: <UserCheck size={16} /> },
        { id: 'note', label: 'Note', icon: <StickyNote size={16} /> },
    ];

    // Custom-entry form state for visa/guide
    const [customTitle, setCustomTitle] = useState('');
    const [customCost, setCustomCost] = useState('');

    const handleAddCustom = (type: 'visa' | 'guide') => {
        if (!customTitle.trim()) return;
        handleAdd({
            id: `${type}-${Date.now()}`,
            type,
            day,
            title: customTitle.trim(),
            description: type === 'visa' ? 'Visa fee' : 'Guide service',
            netCost: parseFloat(customCost) || 0,
            baseMarkupPercent: 10,
            extraMarkupFlat: 0,
            quantity: 1,
            time: '09:00'
        });
    };

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const showSearch = ['hotel', 'activity', 'transport'].includes(activeTab);
    const showDestFilter = ['hotel', 'activity'].includes(activeTab);
    const filteredCount = activeTab === 'hotel' ? filteredHotels.length : filteredActivities.length;
    const totalCount = activeTab === 'hotel' ? allActiveHotels.length : allActiveActivities.length;
    const hasDestFilter = showDestFilter && tripLocationIds.size > 0;
    const isFiltered = hasDestFilter && !showAll;

    const content = (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 md:p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1A2633] w-full max-w-3xl max-h-[90vh] md:max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-20 duration-300 rounded-2xl shadow-2xl">

                {/* Header */}
                <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#1A2633] shrink-0">
                    <div>
                        <h3 className="font-black text-lg md:text-xl text-slate-900 dark:text-white">Add to Day {day}</h3>
                        <p className="text-[10px] md:text-xs text-slate-500 font-medium">Select a service to add to the itinerary.</p>
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
                            onClick={() => { setActiveTab(tab.id); setSearchTerm(''); setShowAll(false); setCustomTitle(''); setCustomCost(''); }}
                            className={`flex items-center gap-1.5 px-3 md:px-4 py-3 text-xs font-bold border-b-[3px] transition-all whitespace-nowrap
                                ${activeTab === tab.id
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 rounded-t-lg'}`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* Search + Destination filter banner */}
                <div className="p-4 md:p-6 flex-1 overflow-hidden flex flex-col bg-slate-50 dark:bg-[#0B1116]">

                    {showSearch && (
                        <div className="mb-3 relative shrink-0">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                placeholder={`Search ${activeTab}s…`}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-4 py-3 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-stone-700 text-sm"
                                autoFocus
                            />
                        </div>
                    )}

                    {/* Destination filter notice */}
                    {hasDestFilter && (
                        <div className="mb-3 shrink-0 flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                            <p className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                                <Globe size={12} />
                                {isFiltered
                                    ? `Showing ${filteredCount} of ${totalCount} — filtered to your trip destinations`
                                    : `Showing all ${totalCount} results`}
                            </p>
                            <button
                                onClick={() => setShowAll(v => !v)}
                                className="text-[10px] font-black text-indigo-600 bg-indigo-100 hover:bg-indigo-200 px-2 py-1 rounded transition-colors"
                            >
                                {isFiltered ? 'Show All' : 'Filter by Destination'}
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
                                        {hotel.amenities.slice(0, 3).map(a => (
                                            <span key={a} className="text-[9px] uppercase font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded">{a}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="text-right flex flex-col justify-between shrink-0">
                                    <div>
                                        <span className="block font-black text-slate-900 dark:text-white">₹{hotel.pricePerNight.toLocaleString('en-IN')}</span>
                                        <span className="text-[10px] text-slate-400 font-bold">per night</span>
                                    </div>
                                    <button className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 text-xs font-bold rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all flex items-center gap-1">
                                        Add <Plus size={12} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {activeTab === 'hotel' && filteredHotels.length === 0 && (
                            <EmptyState label={isFiltered ? 'No hotels in your destinations' : 'No hotels found'} sub={isFiltered ? 'Click "Show All" to see every hotel' : 'Add hotels in the Masters module'} />
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
                                    <span className="block font-black text-slate-900 dark:text-white">₹{activity.cost.toLocaleString('en-IN')}</span>
                                    <button className="px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 text-xs font-bold rounded-lg group-hover:bg-orange-500 group-hover:text-white transition-all flex items-center gap-1">
                                        Add <Plus size={12} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {activeTab === 'activity' && filteredActivities.length === 0 && (
                            <EmptyState label={isFiltered ? 'No activities in your destinations' : 'No activities found'} sub={isFiltered ? 'Click "Show All" to see all' : 'Add activities in the Masters module'} />
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
                                        <span className="flex items-center gap-1"><Users size={10} /> {trans.capacity}</span>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col justify-between shrink-0">
                                    <span className="block font-black text-slate-900 dark:text-white">₹{trans.baseRate.toLocaleString('en-IN')}</span>
                                    <button className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 text-xs font-bold rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-all flex items-center gap-1">
                                        Add <Plus size={12} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {activeTab === 'transport' && filteredTransports.length === 0 && (
                            <EmptyState label="No transport found" sub="Add vehicles in the Masters module" />
                        )}

                        {/* FLIGHT */}
                        {activeTab === 'flight' && (
                            <div className="text-center py-12">
                                <div className="size-20 bg-blue-50 dark:bg-blue-900/10 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500"><Plane size={40} /></div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">Add Flight Block</h3>
                                <p className="text-slate-400 mb-6 max-w-sm mx-auto text-sm">Creates a generic flight card. Edit airline, flight no, and route directly on the card.</p>
                                <button onClick={() => handleAdd(createFlightItem())} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 mx-auto">
                                    Add Flight Block <ArrowRight size={16} />
                                </button>
                            </div>
                        )}

                        {/* VISA */}
                        {activeTab === 'visa' && (
                            <CustomEntryForm
                                icon={<Shield size={40} />}
                                color="purple"
                                title="Add Visa / Entry Fee"
                                description="Add a visa fee or border entry cost for this day."
                                valueName={customTitle}
                                valueCost={customCost}
                                onChangeName={setCustomTitle}
                                onChangeCost={setCustomCost}
                                onAdd={() => handleAddCustom('visa')}
                                placeholder="e.g. UAE Tourist Visa"
                            />
                        )}

                        {/* GUIDE */}
                        {activeTab === 'guide' && (
                            <CustomEntryForm
                                icon={<UserCheck size={40} />}
                                color="teal"
                                title="Add Guide Service"
                                description="Add a local guide, escort, or assistance service."
                                valueName={customTitle}
                                valueCost={customCost}
                                onChangeName={setCustomTitle}
                                onChangeCost={setCustomCost}
                                onAdd={() => handleAddCustom('guide')}
                                placeholder="e.g. Local Guide – Full Day"
                            />
                        )}

                        {/* NOTE */}
                        {activeTab === 'note' && (
                            <div className="text-center py-12">
                                <div className="size-20 bg-yellow-50 dark:bg-yellow-900/10 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-500"><StickyNote size={40} /></div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">Add Custom Note</h3>
                                <p className="text-slate-400 mb-6 max-w-sm mx-auto text-sm">Free text block: reminders, recommendations, free time, meal breaks, etc.</p>
                                <button onClick={() => handleAdd(createNoteItem())} className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-xl shadow-lg shadow-yellow-500/20 transition-all flex items-center gap-2 mx-auto">
                                    Add Note <ArrowRight size={16} />
                                </button>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );

    if (!mounted) return null;
    return createPortal(content, document.body);
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ label: string; sub: string }> = ({ label, sub }) => (
    <div className="text-center py-12">
        <p className="font-bold text-slate-500">{label}</p>
        <p className="text-xs text-slate-400 mt-1">{sub}</p>
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
    onChangeName: (v: string) => void;
    onChangeCost: (v: string) => void;
    onAdd: () => void;
}> = ({ icon, color, title, description, placeholder, valueName, valueCost, onChangeName, onChangeCost, onAdd }) => {
    const colorMap = {
        purple: 'bg-purple-50 text-purple-500 border-purple-200',
        teal: 'bg-teal-50 text-teal-500 border-teal-200',
    };
    const btnMap = {
        purple: 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20',
        teal: 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/20',
    };

    return (
        <div className="max-w-md mx-auto py-8">
            <div className={`size-20 rounded-full flex items-center justify-center mx-auto mb-4 border ${colorMap[color]}`}>{icon}</div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white text-center mb-1">{title}</h3>
            <p className="text-slate-400 text-center mb-6 text-sm">{description}</p>
            <div className="space-y-3">
                <input
                    type="text"
                    placeholder={placeholder}
                    value={valueName}
                    onChange={e => onChangeName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    autoFocus
                />
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                    <input
                        type="number"
                        placeholder="Cost (0 if free)"
                        value={valueCost}
                        onChange={e => onChangeCost(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-7 pr-4 py-3 font-bold text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
                <button
                    onClick={onAdd}
                    disabled={!valueName.trim()}
                    className={`w-full py-3 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 ${btnMap[color]}`}
                >
                    Add to Day <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
};
