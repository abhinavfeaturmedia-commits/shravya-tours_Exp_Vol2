import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { MasterLocation, MasterHotel, MasterActivity, MasterTransport, MasterPlan } from '../types';

const STORAGE_KEY = 'shravya_master_data';

const loadFromStorage = <T,>(key: string, fallback: T): T => {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : fallback;
    } catch {
        return fallback;
    }
};

const saveToStorage = <T,>(key: string, data: T) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.warn('Failed to save to localStorage:', e);
    }
};

// Initial Data
const INITIAL_LOCATIONS: MasterLocation[] = [
    { id: 'LOC-001', name: 'Mumbai', type: 'City', region: 'Maharashtra', status: 'Active' },
    { id: 'LOC-002', name: 'Goa', type: 'State', region: 'India', status: 'Active' },
    { id: 'LOC-003', name: 'Kerala', type: 'State', region: 'India', status: 'Active' },
    { id: 'LOC-004', name: 'Manali', type: 'City', region: 'Himachal Pradesh', status: 'Active' },
    { id: 'LOC-005', name: 'Jaipur', type: 'City', region: 'Rajasthan', status: 'Active' },
    { id: 'LOC-006', name: 'Udaipur', type: 'City', region: 'Rajasthan', status: 'Active' },
];

const INITIAL_HOTELS: MasterHotel[] = [
    { id: 'HTL-001', name: 'Taj Palace Goa', locationId: 'LOC-002', rating: 5, amenities: ['Pool', 'Spa', 'Gym', 'Restaurant'], pricePerNight: 12000, status: 'Active' },
    { id: 'HTL-002', name: 'Kumarakom Lake Resort', locationId: 'LOC-003', rating: 5, amenities: ['Pool', 'Spa', 'Ayurveda', 'Restaurant'], pricePerNight: 15000, status: 'Active' },
    { id: 'HTL-003', name: 'Snow Valley Resort', locationId: 'LOC-004', rating: 4, amenities: ['Restaurant', 'Bonfire', 'Parking'], pricePerNight: 5500, status: 'Active' },
    { id: 'HTL-004', name: 'Oberoi Udaivilas', locationId: 'LOC-006', rating: 5, amenities: ['Pool', 'Spa', 'Lake View', 'Restaurant'], pricePerNight: 25000, status: 'Active' },
];

const INITIAL_ACTIVITIES: MasterActivity[] = [
    { id: 'ACT-001', name: 'Backwater Cruise', locationId: 'LOC-003', duration: '4 hours', cost: 3500, category: 'Leisure', status: 'Active' },
    { id: 'ACT-002', name: 'Paragliding at Solang Valley', locationId: 'LOC-004', duration: '1 hour', cost: 2500, category: 'Adventure', status: 'Active' },
    { id: 'ACT-003', name: 'Dudhsagar Falls Trek', locationId: 'LOC-002', duration: '6 hours', cost: 1800, category: 'Adventure', status: 'Active' },
    { id: 'ACT-004', name: 'Amer Fort Visit', locationId: 'LOC-005', duration: '2 hours', cost: 500, category: 'Sightseeing', status: 'Active' },
    { id: 'ACT-005', name: 'Lake Pichola Boat Ride', locationId: 'LOC-006', duration: '1 hour', cost: 800, category: 'Leisure', status: 'Active' },
];

const INITIAL_TRANSPORTS: MasterTransport[] = [
    { id: 'TRN-001', name: 'Innova Crysta', type: 'SUV', capacity: 6, baseRate: 4500, status: 'Active' },
    { id: 'TRN-002', name: 'Swift Dzire', type: 'Sedan', capacity: 4, baseRate: 2500, status: 'Active' },
    { id: 'TRN-003', name: 'Tempo Traveller (12 Seater)', type: 'Tempo Traveller', capacity: 12, baseRate: 8000, status: 'Active' },
    { id: 'TRN-004', name: 'Volvo Bus AC', type: 'Bus', capacity: 45, baseRate: 20000, status: 'Active' },
];

const INITIAL_MASTER_PLANS: MasterPlan[] = [
    {
        id: 'PLN-001',
        title: 'Romantic Udaipur Getaway',
        duration: 3,
        locationId: 'LOC-006',
        estimatedCost: 45000,
        status: 'Active',
        days: [
            { day: 1, title: 'Arrival & Lakeside Evening', activities: ['ACT-005'], hotelId: 'HTL-004' },
            { day: 2, title: 'City Palace & Local Culture', activities: [], hotelId: 'HTL-004' },
            { day: 3, title: 'Departure', activities: [] },
        ],
    },
    {
        id: 'PLN-002',
        title: 'Kerala Backwaters Explorer',
        duration: 4,
        locationId: 'LOC-003',
        estimatedCost: 55000,
        status: 'Active',
        days: [
            { day: 1, title: 'Arrive in Kochi', activities: [], hotelId: 'HTL-002' },
            { day: 2, title: 'Backwater Cruise Day', activities: ['ACT-001'], hotelId: 'HTL-002' },
            { day: 3, title: 'Kumarakom Exploration', activities: [], hotelId: 'HTL-002' },
            { day: 4, title: 'Departure', activities: [] },
        ],
    },
];

interface MasterDataContextType {
    locations: MasterLocation[];
    hotels: MasterHotel[];
    activities: MasterActivity[];
    transports: MasterTransport[];
    plans: MasterPlan[];
    // Locations
    addLocation: (loc: MasterLocation) => void;
    updateLocation: (id: string, loc: Partial<MasterLocation>) => void;
    deleteLocation: (id: string) => void;
    // Hotels
    addHotel: (hotel: MasterHotel) => void;
    updateHotel: (id: string, hotel: Partial<MasterHotel>) => void;
    deleteHotel: (id: string) => void;
    // Activities
    addActivity: (activity: MasterActivity) => void;
    updateActivity: (id: string, activity: Partial<MasterActivity>) => void;
    deleteActivity: (id: string) => void;
    // Transports
    addTransport: (transport: MasterTransport) => void;
    updateTransport: (id: string, transport: Partial<MasterTransport>) => void;
    deleteTransport: (id: string) => void;
    // Plans
    addPlan: (plan: MasterPlan) => void;
    updatePlan: (id: string, plan: Partial<MasterPlan>) => void;
    deletePlan: (id: string) => void;
    // Helpers
    getLocationById: (id: string) => MasterLocation | undefined;
    getHotelById: (id: string) => MasterHotel | undefined;
}

const MasterDataContext = (globalThis as any).__SHRAWELLO_MASTER_DATA_CONTEXT__ ?? ((globalThis as any).__SHRAWELLO_MASTER_DATA_CONTEXT__ = createContext<MasterDataContextType | undefined>(undefined));

export const MasterDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [locations, setLocations] = useState<MasterLocation[]>(() =>
        loadFromStorage(`${STORAGE_KEY}_locations`, INITIAL_LOCATIONS)
    );
    const [hotels, setHotels] = useState<MasterHotel[]>(() =>
        loadFromStorage(`${STORAGE_KEY}_hotels`, INITIAL_HOTELS)
    );
    const [activities, setActivities] = useState<MasterActivity[]>(() =>
        loadFromStorage(`${STORAGE_KEY}_activities`, INITIAL_ACTIVITIES)
    );
    const [transports, setTransports] = useState<MasterTransport[]>(() =>
        loadFromStorage(`${STORAGE_KEY}_transports`, INITIAL_TRANSPORTS)
    );
    const [plans, setPlans] = useState<MasterPlan[]>(() =>
        loadFromStorage(`${STORAGE_KEY}_plans`, INITIAL_MASTER_PLANS)
    );

    // Persist to localStorage
    useEffect(() => { saveToStorage(`${STORAGE_KEY}_locations`, locations); }, [locations]);
    useEffect(() => { saveToStorage(`${STORAGE_KEY}_hotels`, hotels); }, [hotels]);
    useEffect(() => { saveToStorage(`${STORAGE_KEY}_activities`, activities); }, [activities]);
    useEffect(() => { saveToStorage(`${STORAGE_KEY}_transports`, transports); }, [transports]);
    useEffect(() => { saveToStorage(`${STORAGE_KEY}_plans`, plans); }, [plans]);

    // Location CRUD
    const addLocation = useCallback((loc: MasterLocation) => setLocations((prev) => [...prev, loc]), []);
    const updateLocation = useCallback((id: string, updated: Partial<MasterLocation>) => {
        setLocations((prev) => prev.map((l) => (l.id === id ? { ...l, ...updated } : l)));
    }, []);
    const deleteLocation = useCallback((id: string) => setLocations((prev) => prev.filter((l) => l.id !== id)), []);

    // Hotel CRUD
    const addHotel = useCallback((hotel: MasterHotel) => setHotels((prev) => [...prev, hotel]), []);
    const updateHotel = useCallback((id: string, updated: Partial<MasterHotel>) => {
        setHotels((prev) => prev.map((h) => (h.id === id ? { ...h, ...updated } : h)));
    }, []);
    const deleteHotel = useCallback((id: string) => setHotels((prev) => prev.filter((h) => h.id !== id)), []);

    // Activity CRUD
    const addActivity = useCallback((activity: MasterActivity) => setActivities((prev) => [...prev, activity]), []);
    const updateActivity = useCallback((id: string, updated: Partial<MasterActivity>) => {
        setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)));
    }, []);
    const deleteActivity = useCallback((id: string) => setActivities((prev) => prev.filter((a) => a.id !== id)), []);

    // Transport CRUD
    const addTransport = useCallback((transport: MasterTransport) => setTransports((prev) => [...prev, transport]), []);
    const updateTransport = useCallback((id: string, updated: Partial<MasterTransport>) => {
        setTransports((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
    }, []);
    const deleteTransport = useCallback((id: string) => setTransports((prev) => prev.filter((t) => t.id !== id)), []);

    // Plan CRUD
    const addPlan = useCallback((plan: MasterPlan) => setPlans((prev) => [...prev, plan]), []);
    const updatePlan = useCallback((id: string, updated: Partial<MasterPlan>) => {
        setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
    }, []);
    const deletePlan = useCallback((id: string) => setPlans((prev) => prev.filter((p) => p.id !== id)), []);

    // Helpers
    const getLocationById = useCallback((id: string) => locations.find((l) => l.id === id), [locations]);
    const getHotelById = useCallback((id: string) => hotels.find((h) => h.id === id), [hotels]);

    const value = useMemo(
        () => ({
            locations,
            hotels,
            activities,
            transports,
            plans,
            addLocation,
            updateLocation,
            deleteLocation,
            addHotel,
            updateHotel,
            deleteHotel,
            addActivity,
            updateActivity,
            deleteActivity,
            addTransport,
            updateTransport,
            deleteTransport,
            addPlan,
            updatePlan,
            deletePlan,
            getLocationById,
            getHotelById,
        }),
        [
            locations, hotels, activities, transports, plans,
            addLocation, updateLocation, deleteLocation,
            addHotel, updateHotel, deleteHotel,
            addActivity, updateActivity, deleteActivity,
            addTransport, updateTransport, deleteTransport,
            addPlan, updatePlan, deletePlan,
            getLocationById, getHotelById,
        ]
    );

    return <MasterDataContext.Provider value={value}>{children}</MasterDataContext.Provider>;
};

export const useMasterData = () => {
    const context = useContext(MasterDataContext);
    if (!context) throw new Error('useMasterData must be used within a MasterDataProvider');
    return context;
};
