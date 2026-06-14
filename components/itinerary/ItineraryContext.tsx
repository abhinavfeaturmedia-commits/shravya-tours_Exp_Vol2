import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { MasterHotel, MasterActivity, MasterTransport, CurrencyCode, TaxConfig, DEFAULT_TAX_CONFIG } from '../../types';

// --- Types ---

export interface FAQItem {
    q: string;
    a: string;
}

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

    // Master Data Link (masterData NOT persisted — re-fetched at runtime)
    masterId?: string;
    masterData?: MasterHotel | MasterActivity | MasterTransport | any;
    roomTypeId?: string;
    mealPlanId?: string;
    order?: number;

    // Flight specifics
    fromLocation?: string;
    toLocation?: string;
    airline?: string;
    flightNumber?: string;
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

export interface TripDestination {
    locationId: string;
    nights: number;
    order: number;
}

export interface TripDetails {
    title: string;
    startDate: string;
    days: number;
    nights: number;
    destination: string; // Legacy fallback / Primary destination
    destinations?: TripDestination[]; // New Multi-Destination array
    coverImage: string;
    gallery: string[];   // Additional package-level photo gallery
    adults: number;
    children: number;
    included: string[];
    notIncluded: string[];
    // Itinerary V2 fields
    clientName?: string;          // Client this itinerary is built for
    clientId?: string;            // Linked lead/booking ID
    itineraryStatus?: string;     // Draft | Sent | Confirmed
    validityDays?: number;        // Quote validity in days (0 = no expiry)
    termsAndConditions?: string;  // Per-itinerary T&C text
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
    faqs: FAQItem[];

    // Computed
    subtotal: number;
    packageMarkupAmount: number;
    taxAmount: number;
    grandTotal: number;

    // Derived
    editPackageId?: string;
    setEditPackageId: (id: string) => void;

    // Actions
    setStep: (step: number) => void;
    updateTripDetails: (details: Partial<TripDetails>) => void;
    addItem: (item: Omit<ItineraryItem, 'sellPrice'>) => void;
    updateItem: (id: string, updates: Partial<Omit<ItineraryItem, 'sellPrice'>>) => void;
    removeItem: (id: string) => void;
    replaceAllItems: (items: Omit<ItineraryItem, 'sellPrice'>[]) => void;
    reorderItems: (destDay: number, sourceId: string, destIndex: number) => void;
    duplicateDay: (sourceDay: number, targetDay: number) => void;
    setCurrency: (currency: CurrencyCode) => void;
    updateTaxConfig: (config: Partial<TaxConfig>) => void;
    setPackageMarkup: (percent: number, flat: number) => void;
    loadPackage: (pkg: any, masterLocations?: any[]) => void;
    clearDraft: () => void;
    setFaqs: React.Dispatch<React.SetStateAction<FAQItem[]>>;

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
    const savedDraft = useMemo(() => {
        try {
            const draft = localStorage.getItem('itinerary_draft');
            return draft ? JSON.parse(draft) : null;
        } catch {
            return null;
        }
    }, []);

    const [step, setStep] = useState(savedDraft?.step || 1);
    const [items, setItems] = useState<ItineraryItem[]>(savedDraft?.items || []);
    const [dayMeta, setDayMeta] = useState<Record<number, DayMeta>>(savedDraft?.dayMeta || {});
    const [currency, setCurrency] = useState<CurrencyCode>(savedDraft?.currency || 'INR');
    const [taxConfig, setTaxConfig] = useState<TaxConfig>(savedDraft?.taxConfig || DEFAULT_TAX_CONFIG);
    const [packageMarkupPercent, setPackageMarkupPercent] = useState<number>(savedDraft?.packageMarkupPercent || 0);
    const [packageMarkupFlat, setPackageMarkupFlat] = useState<number>(savedDraft?.packageMarkupFlat || 0);
    const [editPackageId, setEditPackageId] = useState<string | undefined>(savedDraft?.editPackageId || undefined);
    const [faqs, setFaqs] = useState<FAQItem[]>(savedDraft?.faqs || []);

    const [tripDetails, setTripDetails] = useState<TripDetails>(savedDraft?.tripDetails || {
        title: '',
        startDate: new Date().toISOString().split('T')[0],
        days: 4,
        nights: 3,
        destination: '',
        coverImage: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop',
        gallery: [],
        adults: 2,
        children: 0,
        included: ['Premium accommodation', 'Daily breakfast & dinner', 'Private transfers', 'Entry tickets', 'Expert guide'],
        notIncluded: ['Airfare (International)', 'Personal expenses', 'Camera fees', 'Optional activities', 'Insurance'],
        clientName: '',
        clientId: '',
        itineraryStatus: 'Draft',
        validityDays: 7,
        termsAndConditions: '',
    });

    // Auto-save to localStorage
    useEffect(() => {
        const draft = {
            step, items, dayMeta, currency, taxConfig, packageMarkupPercent, packageMarkupFlat, editPackageId, tripDetails, faqs
        };
        localStorage.setItem('itinerary_draft', JSON.stringify(draft));
    }, [step, items, dayMeta, currency, taxConfig, packageMarkupPercent, packageMarkupFlat, editPackageId, tripDetails, faqs]);

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

        // When the "Apply GST" checkbox is off, no tax applies at all
        if (!gstOnTotal) return 0;

        const taxableBase = preTaxTotal; // GST on the full pre-tax total
        const cgst = taxableBase * (cgstPercent / 100);
        const sgst = taxableBase * (sgstPercent / 100);
        const igst = taxableBase * (igstPercent / 100);
        const tcs  = taxableBase * (tcsPercent  / 100);

        return Math.round((cgst + sgst + igst + tcs) * 100) / 100;
    }, [preTaxTotal, taxConfig]);

    const grandTotal = useMemo(() => preTaxTotal + taxAmount, [preTaxTotal, taxAmount]);

    const setPackageMarkup = useCallback((percent: number, flat: number) => {
        setPackageMarkupPercent(percent);
        setPackageMarkupFlat(flat);
    }, []);

    const updateTripDetails = useCallback((details: Partial<TripDetails>) => {
        setTripDetails(prev => {
            const next = { ...prev, ...details };
            // Auto-derive nights from days and vice versa (Fix 1.3)
            if (details.days !== undefined && details.nights === undefined) next.nights = Math.max(0, next.days - 1);
            if (details.nights !== undefined && details.days === undefined) next.days = next.nights + 1;
            return next;
        });
    }, []);

    const addItem = useCallback((item: Omit<ItineraryItem, 'sellPrice'>) => {
        const netCost = Number(item.netCost) || 0;
        const quantity = Number(item.quantity) || 1;
        const baseMarkupPercent = Number(item.baseMarkupPercent) || 0;
        const extraMarkupFlat = Number(item.extraMarkupFlat) || 0;
        
        const sellPrice = calculateSellPrice(netCost, baseMarkupPercent, extraMarkupFlat, quantity);
        // Strip masterData from stored item to prevent JSON bloat (Fix 3.3)
        const { masterData, ...safeItem } = item as any;
        safeItem.netCost = netCost;
        safeItem.quantity = quantity;
        safeItem.baseMarkupPercent = baseMarkupPercent;
        safeItem.extraMarkupFlat = extraMarkupFlat;

        setItems(prev => {
            const dayItemCount = prev.filter(i => i.day === item.day).length;
            return [...prev, { ...safeItem, sellPrice, order: item.order ?? dayItemCount }];
        });
    }, []);

    const updateItem = useCallback((id: string, updates: Partial<Omit<ItineraryItem, 'sellPrice'>>) => {
        setItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, ...updates };
            updated.netCost = Number(updated.netCost) || 0;
            updated.quantity = Number(updated.quantity) || 1;
            updated.baseMarkupPercent = Number(updated.baseMarkupPercent) || 0;
            updated.extraMarkupFlat = Number(updated.extraMarkupFlat) || 0;
            updated.sellPrice = calculateSellPrice(updated.netCost, updated.baseMarkupPercent, updated.extraMarkupFlat, updated.quantity);
            return updated;
        }));
    }, []);

    const removeItem = useCallback((id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    }, []);

    const replaceAllItems = useCallback((newItems: Omit<ItineraryItem, 'sellPrice'>[]) => {
        setItems(newItems.map(item => {
            // Strip masterData to keep builderData JSON lean (Fix 3.3)
            const { masterData, ...safeItem } = item as any;
            return {
                ...safeItem,
                sellPrice: calculateSellPrice(item.netCost, item.baseMarkupPercent, item.extraMarkupFlat, item.quantity)
            };
        }));
    }, []);

    // Duplicate all items from sourceDay into targetDay with new IDs
    const duplicateDay = useCallback((sourceDay: number, targetDay: number) => {
        setItems(prev => {
            const sourceDayItems = prev.filter(i => i.day === sourceDay).sort((a, b) => (a.order || 0) - (b.order || 0));
            if (sourceDayItems.length === 0) return prev;
            const existingCount = prev.filter(i => i.day === targetDay).length;
            const duplicates: ItineraryItem[] = sourceDayItems.map((item, idx) => ({
                ...item,
                id: `dup-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                day: targetDay,
                order: existingCount + idx,
            }));
            return [...prev, ...duplicates];
        });
    }, []);

    const reorderItems = useCallback((destDay: number, sourceId: string, destIndex: number) => {
        setItems(prev => {
            const newItems = [...prev];
            const sourceIndex = newItems.findIndex(i => i.id === sourceId);
            if (sourceIndex === -1) return prev;

            const [movedItem] = newItems.splice(sourceIndex, 1);
            const sourceDay = movedItem.day; // Fix 1.2: save BEFORE reassigning
            movedItem.day = destDay;

            const destDayItems = newItems.filter(i => i.day === destDay).sort((a, b) => (a.order || 0) - (b.order || 0));
            destDayItems.splice(destIndex, 0, movedItem);
            destDayItems.forEach((item, idx) => { item.order = idx; });

            // Re-normalize source day only if it was different (Fix 1.2: was always false before)
            if (sourceDay !== destDay) {
                const sourceDayItems = newItems.filter(i => i.day === sourceDay).sort((a, b) => (a.order || 0) - (b.order || 0));
                sourceDayItems.forEach((item, idx) => { item.order = idx; });
            }

            return newItems;
        });
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

    const loadPackage = useCallback((pkg: any, masterLocations?: any[]) => {
        setEditPackageId(pkg.id);
        if (pkg.builderData) {
            // Fix 1.4: ensure gallery is always an array
            setTripDetails({
                ...pkg.builderData.tripDetails,
                gallery: pkg.builderData.tripDetails?.gallery ?? [],
            });
            // Fix 1.1: recalculate sellPrice — master prices may have changed since last save
            setItems((pkg.builderData.items || []).map((item: any) => ({
                ...item,
                sellPrice: calculateSellPrice(
                    Number(item.netCost) || 0,
                    Number(item.baseMarkupPercent) || 0,
                    Number(item.extraMarkupFlat) || 0,
                    Number(item.quantity) || 1
                )
            })));
            setDayMeta(pkg.builderData.dayMeta || {});
            setCurrency(pkg.builderData.currency || 'INR');
            setTaxConfig(pkg.builderData.taxConfig || DEFAULT_TAX_CONFIG);
            setPackageMarkupPercent(pkg.builderData.packageMarkupPercent || 0);
            setPackageMarkupFlat(pkg.builderData.packageMarkupFlat || 0);
            setFaqs(pkg.builderData.faqs || []);
        } else {
            // Legacy migration — best effort
            // Fix 2.5: resolve location name → ID (pkg.location is a name string in legacy packages)
            const resolvedDestId = masterLocations?.find(
                (l: any) => l.name === pkg.location
            )?.id || pkg.location || '';

            const guestsMatch = pkg.groupSize?.match(/(\d+)/);
            const guests = guestsMatch ? parseInt(guestsMatch[1]) : 2;

            setTripDetails({
                title: pkg.title,
                startDate: new Date().toISOString().split('T')[0],
                days: pkg.days,
                nights: Math.max(0, pkg.days - 1),
                destination: resolvedDestId,
                coverImage: pkg.image || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop',
                gallery: Array.isArray(pkg.gallery) ? pkg.gallery.filter((u: string) => u && u !== pkg.image) : [],
                adults: guests,
                children: 0,
                included: pkg.included || ['Premium accommodation', 'Daily breakfast & dinner', 'Private transfers', 'Entry tickets', 'Expert guide'],
                notIncluded: pkg.notIncluded || ['Airfare (International)', 'Personal expenses', 'Camera fees', 'Optional activities', 'Insurance']
            });

            const newItems: ItineraryItem[] = (pkg.itinerary || []).map((dayObj: any) => ({
                id: `mig-${Date.now()}-${dayObj.day}-${Math.random().toString(36).slice(2,5)}`,
                type: 'activity',
                day: dayObj.day,
                title: dayObj.title || `Day ${dayObj.day}`,
                description: dayObj.desc,
                netCost: 0,
                baseMarkupPercent: 0,
                extraMarkupFlat: 0,
                sellPrice: 0,
                quantity: guests,
                order: 0
            }));
            setItems(newItems);
            setPackageMarkupFlat(pkg.price || 0);
            setFaqs([]);
        }
    }, []);

    const clearDraft = useCallback(() => {
        localStorage.removeItem('itinerary_draft');
        setStep(1);
        setItems([]);
        setDayMeta({});
        setEditPackageId(undefined);
        setFaqs([]);
        setTripDetails({
            title: '',
            startDate: new Date().toISOString().split('T')[0],
            days: 4,
            nights: 3,
            destination: '',
            coverImage: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop',
            gallery: [],
            adults: 2,
            children: 0,
            included: ['Premium accommodation', 'Daily breakfast & dinner', 'Private transfers', 'Entry tickets', 'Expert guide'],
            notIncluded: ['Airfare (International)', 'Personal expenses', 'Camera fees', 'Optional activities', 'Insurance'],
            clientName: '',
            clientId: '',
            itineraryStatus: 'Draft',
            validityDays: 7,
            termsAndConditions: '',
        });
    }, []);

    const value = useMemo(() => ({
        step,
        setStep,
        setEditPackageId,
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
        duplicateDay,
        getItemsForDay,
        getDayMeta,
        updateDayMeta,
        moveItem,
        setCurrency,
        updateTaxConfig,
        setPackageMarkup,
        loadPackage,
        clearDraft,
        formatCurrency,
        convertCurrency,
        dayMeta,
        faqs,
        setFaqs
    }), [step, tripDetails, items, currency, taxConfig, packageMarkupPercent, packageMarkupFlat,
        subtotal, packageMarkupAmount, taxAmount, grandTotal, editPackageId,
        updateTripDetails, addItem, updateItem, removeItem, replaceAllItems, reorderItems, duplicateDay,
        getItemsForDay, updateTaxConfig, setPackageMarkup, loadPackage, clearDraft, formatCurrency, convertCurrency, dayMeta, setEditPackageId, faqs]);

    return (
        <ItineraryContext.Provider value={value}>
            {children}
        </ItineraryContext.Provider>
    );
};
