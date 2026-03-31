import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback } from 'react';
import { MasterHotel, MasterActivity, MasterTransport, CurrencyCode, TaxConfig, DEFAULT_TAX_CONFIG } from '../../types';

// --- Types ---

export type ServiceType = 'flight' | 'hotel' | 'activity' | 'transport' | 'note' | 'visa' | 'guide' | 'other';

export interface ItineraryItem {
    id: string;
    type: ServiceType;
    day: number;
    title: string;
    description?: string;

    // Pricing fields
    netCost: number;
    baseMarkupPercent: number;
    extraMarkupFlat: number;
    sellPrice: number; // Computed: netCost * (1 + baseMarkupPercent/100) + extraMarkupFlat
    quantity: number;

    // Specifics
    time?: string;
    duration?: string;

    // Master Data Link
    masterId?: string;
    masterData?: MasterHotel | MasterActivity | MasterTransport | any;
    roomTypeId?: string;
    mealPlanId?: string;
    order?: number; // For manual sorting
}

export interface DayMeta {
    image?: string;
    notes?: string;
}

// Helper to calculate sell price
export const calculateSellPrice = (netCost: number, baseMarkupPercent: number, extraMarkupFlat: number, quantity: number = 1): number => {
    const markedUp = netCost * (1 + baseMarkupPercent / 100) + extraMarkupFlat;
    return Math.round(markedUp * quantity * 100) / 100;
};

interface TripDetails {
    title: string;
    startDate: string;
    days: number;
    nights: number;
    destination: string;
    coverImage: string;
    adults: number;
    children: number;
    included: string[];
    notIncluded: string[];
}

// Currency exchange rates (base: INR)
export const CURRENCY_RATES: Record<CurrencyCode, number> = {
    INR: 1,
    USD: 0.012,
    AED: 0.044,
    EUR: 0.011,
    GBP: 0.0095
};

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
    INR: '₹',
    USD: '$',
    AED: 'د.إ',
    EUR: '€',
    GBP: '£'
};

interface ItineraryContextType {
    // State
    step: number;
    tripDetails: TripDetails;
    items: ItineraryItem[];
    currency: CurrencyCode;
    taxConfig: TaxConfig;
    packageMarkupPercent: number;
    packageMarkupFlat: number;
    dayMeta: Record<number, DayMeta>;

    // Computed
    subtotal: number;
    packageMarkupAmount: number;
    taxAmount: number;
    grandTotal: number;

    // Derived
    editPackageId?: string;

    // Actions
    setStep: (step: number) => void;
    updateTripDetails: (details: Partial<TripDetails>) => void;
    addItem: (item: Omit<ItineraryItem, 'sellPrice'>) => void;
    updateItem: (id: string, updates: Partial<Omit<ItineraryItem, 'sellPrice'>>) => void;
    removeItem: (id: string) => void;
    replaceAllItems: (items: Omit<ItineraryItem, 'sellPrice'>[]) => void;
    reorderItems: (destDay: number, newOrder: ItineraryItem[]) => void;
    setCurrency: (currency: CurrencyCode) => void;
    updateTaxConfig: (config: Partial<TaxConfig>) => void;
    setPackageMarkup: (percent: number, flat: number) => void;
    loadPackage: (pkg: any) => void; // any = Package type

    // Helpers
    getItemsForDay: (day: number) => ItineraryItem[];
    getDayMeta: (day: number) => DayMeta;
    updateDayMeta: (day: number, meta: DayMeta) => void;
    moveItem: (id: string, direction: 'up' | 'down') => void;
    formatCurrency: (amount: number) => string;
    convertCurrency: (amountInINR: number) => number;
}

// --- Context ---

const ItineraryContext = createContext<ItineraryContextType | undefined>(undefined);

export const useItinerary = () => {
    const context = useContext(ItineraryContext);
    if (!context) {
        throw new Error('useItinerary must be used within an ItineraryProvider');
    }
    return context;
};

// --- Provider ---

export const ItineraryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [step, setStep] = useState(1);
    const [items, setItems] = useState<ItineraryItem[]>([]);
    const [dayMeta, setDayMeta] = useState<Record<number, DayMeta>>({});
    const [currency, setCurrency] = useState<CurrencyCode>('INR');
    const [taxConfig, setTaxConfig] = useState<TaxConfig>(DEFAULT_TAX_CONFIG);
    const [packageMarkupPercent, setPackageMarkupPercent] = useState<number>(0);
    const [packageMarkupFlat, setPackageMarkupFlat] = useState<number>(0);
    const [editPackageId, setEditPackageId] = useState<string | undefined>(undefined);

    const [tripDetails, setTripDetails] = useState<TripDetails>({
        title: '',
        startDate: new Date().toISOString().split('T')[0],
        days: 4,
        nights: 3,
        destination: '',
        coverImage: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop',
        adults: 2,
        children: 0,
        included: ['Premium accommodation', 'Daily breakfast & dinner', 'Private transfers', 'Entry tickets', 'Expert guide'],
        notIncluded: ['Airfare (International)', 'Personal expenses', 'Camera fees', 'Optional activities', 'Insurance']
    });

    // Currency helpers
    const convertCurrency = useCallback((amountInINR: number): number => {
        return Math.round(amountInINR * CURRENCY_RATES[currency] * 100) / 100;
    }, [currency]);

    const formatCurrency = useCallback((amount: number): string => {
        const converted = convertCurrency(amount);
        return `${CURRENCY_SYMBOLS[currency]}${converted.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }, [currency, convertCurrency]);

    // Calculate totals
    const subtotal = useMemo(() => {
        return items.filter(i => i.type !== 'note' && i.type !== 'other').reduce((sum, item) => sum + (item.sellPrice || 0), 0);
    }, [items]);

    // Package-level markup: applied on top of item subtotal, before tax
    const packageMarkupAmount = useMemo(() => {
        return Math.round(subtotal * (packageMarkupPercent / 100)) + packageMarkupFlat;
    }, [subtotal, packageMarkupPercent, packageMarkupFlat]);

    const preTaxTotal = useMemo(() => subtotal + packageMarkupAmount, [subtotal, packageMarkupAmount]);

    const taxAmount = useMemo(() => {
        const { cgstPercent, sgstPercent, igstPercent, tcsPercent, gstOnTotal } = taxConfig;
        const taxableAmount = gstOnTotal ? preTaxTotal : items.filter(i => i.type !== 'note' && i.type !== 'other').reduce((sum, item) => {
            const markup = item.sellPrice - (item.netCost * item.quantity);
            return sum + markup;
        }, 0) + packageMarkupAmount;

        const cgst = taxableAmount * (cgstPercent / 100);
        const sgst = taxableAmount * (sgstPercent / 100);
        const igst = taxableAmount * (igstPercent / 100);
        const tcs = preTaxTotal * (tcsPercent / 100);

        return Math.round((cgst + sgst + igst + tcs) * 100) / 100;
    }, [preTaxTotal, taxConfig, items, packageMarkupAmount]);

    const grandTotal = useMemo(() => preTaxTotal + taxAmount, [preTaxTotal, taxAmount]);

    const setPackageMarkup = useCallback((percent: number, flat: number) => {
        setPackageMarkupPercent(percent);
        setPackageMarkupFlat(flat);
    }, []);

    const updateTripDetails = useCallback((details: Partial<TripDetails>) => {
        setTripDetails(prev => ({ ...prev, ...details }));
    }, []);

    const addItem = useCallback((item: Omit<ItineraryItem, 'sellPrice'>) => {
        const sellPrice = calculateSellPrice(item.netCost, item.baseMarkupPercent, item.extraMarkupFlat, item.quantity);
        setItems(prev => {
            // Assign explicit order based on how many items already exist in this day
            const dayItemCount = prev.filter(i => i.day === item.day).length;
            return [...prev, { ...item, sellPrice, order: item.order ?? dayItemCount }];
        });
    }, []);

    const updateItem = useCallback((id: string, updates: Partial<Omit<ItineraryItem, 'sellPrice'>>) => {
        setItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, ...updates };
            updated.sellPrice = calculateSellPrice(updated.netCost, updated.baseMarkupPercent, updated.extraMarkupFlat, updated.quantity);
            return updated;
        }));
    }, []);

    const removeItem = useCallback((id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    }, []);

    const replaceAllItems = useCallback((newItems: Omit<ItineraryItem, 'sellPrice'>[]) => {
        setItems(newItems.map(item => ({
            ...item,
            sellPrice: calculateSellPrice(item.netCost, item.baseMarkupPercent, item.extraMarkupFlat, item.quantity)
        })));
    }, []);

    const reorderItems = useCallback((destDay: number, _newOrder: ItineraryItem[]) => {
        console.log("Reorder requested for day", destDay);
    }, []);

    const getItemsForDay = useCallback((day: number) => {
        return items.filter(i => i.day === day).sort((a, b) => (a.order || 0) - (b.order || 0));
    }, [items]);

    const getDayMeta = useCallback((day: number) => dayMeta[day] || {}, [dayMeta]);

    const updateDayMeta = useCallback((day: number, meta: DayMeta) => {
        setDayMeta(prev => ({ ...prev, [day]: { ...prev[day], ...meta } }));
    }, []);

    const moveItem = useCallback((id: string, direction: 'up' | 'down') => {
        setItems(prev => {
            const targetItem = prev.find(i => i.id === id);
            if (!targetItem) return prev;

            // Get all items for this day, sorted by current order
            const dayItems = prev.filter(i => i.day === targetItem.day)
                .sort((a, b) => (a.order || 0) - (b.order || 0));

            const index = dayItems.findIndex(i => i.id === id);
            if (index === -1) return prev;

            // Calculate new orders if strictly needed, but let's just swap orders
            const newItems = [...prev];

            if (direction === 'up' && index > 0) {
                const itemA = dayItems[index];
                const itemB = dayItems[index - 1];

                // Swap their order values
                // If orders are undefined or same, we need to re-index everything first
                const orderA = itemA.order ?? index;
                const orderB = itemB.order ?? (index - 1);

                // If they are equal (collisions), rely on index
                const newOrderA = orderB;
                const newOrderB = orderA;

                // But simpler: just re-assign order based on swapped index
                // Let's re-normalize all orders for the day to be safe 0, 1, 2...
                const reorderedDayItems = [...dayItems];
                [reorderedDayItems[index], reorderedDayItems[index - 1]] = [reorderedDayItems[index - 1], reorderedDayItems[index]];

                return prev.map(p => {
                    const foundIndex = reorderedDayItems.findIndex(r => r.id === p.id);
                    if (foundIndex !== -1) return { ...p, order: foundIndex };
                    return p;
                });
            } else if (direction === 'down' && index < dayItems.length - 1) {
                const reorderedDayItems = [...dayItems];
                [reorderedDayItems[index], reorderedDayItems[index + 1]] = [reorderedDayItems[index + 1], reorderedDayItems[index]];

                return prev.map(p => {
                    const foundIndex = reorderedDayItems.findIndex(r => r.id === p.id);
                    if (foundIndex !== -1) return { ...p, order: foundIndex };
                    return p;
                });
            }

            return prev;
        });
    }, []);

    const updateTaxConfig = useCallback((config: Partial<TaxConfig>) => {
        setTaxConfig(prev => ({ ...prev, ...config }));
    }, []);

    const loadPackage = useCallback((pkg: any) => {
        setEditPackageId(pkg.id);
        if (pkg.builderData) {
            // Restore exact state if available
            setTripDetails(pkg.builderData.tripDetails);
            setItems(pkg.builderData.items || []);
            setDayMeta(pkg.builderData.dayMeta || {});
            setCurrency(pkg.builderData.currency);
            setTaxConfig(pkg.builderData.taxConfig);
            setPackageMarkupPercent(pkg.builderData.packageMarkupPercent);
            setPackageMarkupFlat(pkg.builderData.packageMarkupFlat);
        } else {
            // Best effort migration
            const guestsMatch = pkg.groupSize.match(/(\d+)/);
            const guests = guestsMatch ? parseInt(guestsMatch[1]) : 2;

            setTripDetails({
                title: pkg.title,
                startDate: new Date().toISOString().split('T')[0],
                days: pkg.days,
                nights: Math.max(0, pkg.days - 1),
                destination: pkg.location,
                coverImage: pkg.image || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop',
                adults: guests,
                children: 0,
                included: pkg.included || ['Premium accommodation', 'Daily breakfast & dinner', 'Private transfers', 'Entry tickets', 'Expert guide'],
                notIncluded: pkg.notIncluded || ['Airfare (International)', 'Personal expenses', 'Camera fees', 'Optional activities', 'Insurance']
            });

            // Map basic itinerary items
            const newItems: ItineraryItem[] = [];
            pkg.itinerary?.forEach((dayObj: any) => {
                newItems.push({
                    id: `mig-${Date.now()}-${dayObj.day}`,
                    type: 'activity',
                    day: dayObj.day,
                    title: dayObj.title,
                    description: dayObj.desc,
                    netCost: 0,
                    baseMarkupPercent: 0,
                    extraMarkupFlat: 0,
                    sellPrice: 0, // Needs re-calculation
                    quantity: guests,
                    order: 0
                });
            });
            setItems(newItems);

            // Set a flat markup to roughly match the desired price
            // This is a naive heuristic since we don't know the net costs of legacy packages
            setPackageMarkupFlat(pkg.price);
        }
    }, []);

    const value = useMemo(() => ({
        step,
        setStep,
        tripDetails,
        items,
        currency,
        taxConfig,
        packageMarkupPercent,
        packageMarkupFlat,
        subtotal,
        packageMarkupAmount,
        taxAmount,
        grandTotal,
        editPackageId,
        updateTripDetails,
        addItem,
        updateItem,
        removeItem,
        replaceAllItems,
        reorderItems,
        getItemsForDay,
        getDayMeta,
        updateDayMeta,
        moveItem,
        setCurrency,
        updateTaxConfig,
        setPackageMarkup,
        loadPackage,
        formatCurrency,
        convertCurrency,
        dayMeta
    }), [step, tripDetails, items, currency, taxConfig, packageMarkupPercent, packageMarkupFlat,
        subtotal, packageMarkupAmount, taxAmount, grandTotal, editPackageId,
        updateTripDetails, addItem, updateItem, removeItem, replaceAllItems, reorderItems,
        getItemsForDay, updateTaxConfig, setPackageMarkup, loadPackage, formatCurrency, convertCurrency, dayMeta]);

    return (
        <ItineraryContext.Provider value={value}>
            {children}
        </ItineraryContext.Provider>
    );
};
