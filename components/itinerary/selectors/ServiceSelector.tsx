import React, { useState, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { useItinerary, ItineraryItem, ServiceType } from '../ItineraryContext';
import { MasterHotel, MasterActivity, MasterTransport } from '../../../types';
import { X, Search, Hotel, Bike, Car, Plane, StickyNote, Plus, MapPin, Star, Clock, Users, ArrowRight } from 'lucide-react';

interface ServiceSelectorProps {
    day: number;
    onClose: () => void;
}

export const ServiceSelector: React.FC<ServiceSelectorProps> = ({ day, onClose }) => {
    const { addItem, tripDetails } = useItinerary();
    const { masterHotels, masterActivities, masterTransports } = useData();

    const [activeTab, setActiveTab] = useState<ServiceType>('hotel');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredHotels = useMemo(() =>
        (masterHotels ?? []).filter(h => h.status === 'Active' && h.name.toLowerCase().includes(searchTerm.toLowerCase())),
        [masterHotels, searchTerm]);

    const filteredActivities = useMemo(() =>
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
        masterData: hotel,
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
        masterData: activity,
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
        masterData: transport,
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
        { id: 'hotel', label: 'Hotels', icon: <Hotel size={18} /> },
        { id: 'activity', label: 'Activities', icon: <Bike size={18} /> },
        { id: 'transport', label: 'Transport', icon: <Car size={18} /> },
        { id: 'flight', label: 'Flight', icon: <Plane size={18} /> },
        { id: 'note', label: 'Note', icon: <StickyNote size={18} /> },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 md:p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1A2633] w-full max-w-3xl max-h-[90vh] md:max-h-[85vh] rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-20 duration-300">

                {/* Header */}
                <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#1A2633]">
                    <div>
                        <h3 className="font-black text-lg md:text-xl text-slate-900 dark:text-white">Add to Day {day}</h3>
                        <p className="text-[10px] md:text-xs text-slate-500 font-medium">Select a service to add.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="size-8 md:size-10 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors text-slate-500"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-50 dark:bg-[#0B1116] border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 pt-2 gap-2 overflow-x-auto no-scrollbar">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold border-b-[3px] transition-all whitespace-nowrap
                                ${activeTab === tab.id
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 rounded-t-lg'}
                            `}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* Search & Content */}
                <div className="p-4 md:p-6 flex-1 overflow-hidden flex flex-col bg-slate-50 dark:bg-[#0B1116]">

                    {['hotel', 'activity', 'transport'].includes(activeTab) && (
                        <div className="mb-6 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                placeholder={`Search ${activeTab}s...`}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-4 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                                autoFocus
                            />
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto pr-2 space-y-4">

                        {/* HOTELS */}
                        {activeTab === 'hotel' && filteredHotels.map(hotel => (
                            <div key={hotel.id} className="bg-white dark:bg-[#1A2633] p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 hover:shadow-lg transition-all flex gap-4 group cursor-pointer" onClick={() => handleAdd(createHotelItem(hotel))}>
                                <div className="size-20 rounded-lg bg-slate-200 shrink-0 overflow-hidden relative">
                                    {hotel.image ? <img src={hotel.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><Hotel size={24} /></div>}
                                </div>
                                <div className="flex-1 py-1">
                                    <h4 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{hotel.name}</h4>
                                    <div className="flex items-center gap-4 text-xs font-bold text-slate-500 mt-2 mb-3">
                                        <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded"><Star size={12} className="text-orange-500 fill-orange-500" /> {hotel.rating}</span>
                                        <span className="flex items-center gap-1"><MapPin size={12} /> {hotel.locationId}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {hotel.amenities.slice(0, 3).map(a => (
                                            <span key={a} className="text-[10px] uppercase font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-md">{a}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="text-right flex flex-col justify-between py-1">
                                    <div>
                                        <span className="block font-black text-lg text-slate-900 dark:text-white">₹{hotel.pricePerNight.toLocaleString()}</span>
                                        <span className="text-[10px] text-slate-400 font-bold">per night</span>
                                    </div>
                                    <button className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all flex items-center justify-center gap-1">
                                        Add <Plus size={14} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* ACTIVITIES */}
                        {activeTab === 'activity' && filteredActivities.map(activity => (
                            <div key={activity.id} className="bg-white dark:bg-[#1A2633] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-orange-500/50 hover:shadow-lg transition-all flex gap-5 group cursor-pointer" onClick={() => handleAdd(createActivityItem(activity))}>
                                <div className="size-20 rounded-xl bg-orange-50 dark:bg-orange-900/10 shrink-0 overflow-hidden flex items-center justify-center text-orange-500">
                                    <Bike size={32} />
                                </div>
                                <div className="flex-1 py-1">
                                    <h4 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-orange-500 transition-colors">{activity.name}</h4>
                                    <div className="flex items-center gap-4 text-xs font-bold text-slate-500 mt-1">
                                        <span className="flex items-center gap-1 text-slate-400 uppercase tracking-wider">{activity.category}</span>
                                        <span className="flex items-center gap-1"><Clock size={12} /> {activity.duration}</span>
                                    </div>
                                    <p className="text-sm text-slate-500 mt-2 line-clamp-1">{activity.description}</p>
                                </div>
                                <div className="text-right flex flex-col justify-between py-1">
                                    <span className="block font-black text-xl text-slate-900 dark:text-white">₹{activity.cost.toLocaleString()}</span>
                                    <button className="px-4 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-xs font-bold rounded-lg group-hover:bg-orange-500 group-hover:text-white transition-all flex items-center justify-center gap-1">
                                        Add <Plus size={14} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* TRANSPORT */}
                        {activeTab === 'transport' && filteredTransports.map(trans => (
                            <div key={trans.id} className="bg-white dark:bg-[#1A2633] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 hover:shadow-lg transition-all flex gap-5 group cursor-pointer" onClick={() => handleAdd(createTransportItem(trans))}>
                                <div className="size-20 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 shrink-0 overflow-hidden flex items-center justify-center text-emerald-500">
                                    <Car size={32} />
                                </div>
                                <div className="flex-1 py-1">
                                    <h4 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">{trans.name}</h4>
                                    <div className="flex items-center gap-4 text-xs font-bold text-slate-500 mt-1">
                                        <span className="flex items-center gap-1 text-slate-400 uppercase tracking-wider">{trans.type}</span>
                                        <span className="flex items-center gap-1"><Users size={12} /> Capacity: {trans.capacity}</span>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col justify-between py-1">
                                    <span className="block font-black text-xl text-slate-900 dark:text-white">₹{trans.baseRate.toLocaleString()}</span>
                                    <button className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-all flex items-center justify-center gap-1">
                                        Add <Plus size={14} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* FLIGHT (Custom) */}
                        {activeTab === 'flight' && (
                            <div className="text-center py-16">
                                <div className="size-24 bg-blue-50 dark:bg-blue-900/10 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500">
                                    <Plane size={48} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Add Flight Placeholder</h3>
                                <p className="text-slate-400 mb-8 max-w-sm mx-auto">Create a generic flight block. You can edit specific flight details like Airline and Time directly in the timeline.</p>
                                <button onClick={() => handleAdd(createFlightItem())} className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 mx-auto">
                                    Add Flight Block <ArrowRight size={18} />
                                </button>
                            </div>
                        )}

                        {/* NOTE (Custom) */}
                        {activeTab === 'note' && (
                            <div className="text-center py-16">
                                <div className="size-24 bg-yellow-50 dark:bg-yellow-900/10 rounded-full flex items-center justify-center mx-auto mb-6 text-yellow-500">
                                    <StickyNote size={48} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Add Custom Note</h3>
                                <p className="text-slate-400 mb-8 max-w-sm mx-auto">Add a text block for recommendations, reminders, free time, or any other custom details.</p>
                                <button onClick={() => handleAdd(createNoteItem())} className="px-8 py-4 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-xl shadow-lg shadow-yellow-500/20 transition-all flex items-center gap-2 mx-auto">
                                    Add Note <ArrowRight size={18} />
                                </button>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};
