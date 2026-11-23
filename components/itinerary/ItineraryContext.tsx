import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { MasterHotel, MasterActivity, MasterTransport, CurrencyCode, TaxConfig, DEFAULT_TAX_CONFIG, RoomSharingType, MealPlanCode } from '../../types';

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
    roomSharing?: RoomSharingType;
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
    roomSharing?: RoomSharingType; // Tour package default room sharing (e.g. 'Triple')
    mealPlanId?: string;          // Tour package default meal plan ID
    mealPlanCode?: MealPlanCode;  // Tour package default meal plan code (e.g. 'MAP', 'CP')
    roomsCount?: number;          // Calculated or custom room count
    extraBedNotes?: string;       // Extra mattress/bed arrangement notes
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
    extraBuilderData: Record<string, any>;

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
    addDay: () => void;
    removeDay: (dayToRemove: number) => void;
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

// Helper to read ?edit=<id> from browser URL (supports BrowserRouter & HashRouter)
const getUrlEditId = (): string | null => {
    try {
        const searchParams = new URLSearchParams(window.location.search);
        const fromSearch = searchParams.get('edit');
        if (fromSearch) return fromSearch;
        const hash = window.location.hash || '';
        const qIdx = hash.indexOf('?');
        if (qIdx !== -1) {
            return new URLSearchParams(hash.slice(qIdx + 1)).get('edit');
        }
    } catch {
        // Ignore URL parsing errors
    }
    return null;
};

export const ItineraryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const savedDraft = useMemo(() => {
        try {
            const draft = localStorage.getItem('itinerary_draft');
            if (!draft) return null;
            const parsed = JSON.parse(draft);
            const urlEditId = getUrlEditId();
            // Never hydrate a stale draft belonging to a different package when ?edit=<id> is in the URL
            if (urlEditId && String(parsed?.editPackageId || '') !== String(urlEditId)) {
                return null;
            }
            return parsed;
        } catch {
            return null;
        }
    }, []);

    const [step, setStep] = useState(savedDraft?.step || 1);
    const [items, setItems] = useState<ItineraryItem[]>(savedDraft?.items || []);
    const [dayMeta, setDayMeta] = useState<Record<number, DayMeta>>(savedDraft?.dayMeta || {});
    const [currency, setCurrency] = useState<CurrencyCode>(savedDraft?.currency || 'INR');
    const [taxConfig, setTaxConfig] = useState<TaxConfig>(savedDraft?.taxConfig || DEFAULT_TAX_CONFIG);
    const [packageMarkupPercent, setPackageMarkupPercent] = useState<number>(Number(savedDraft?.packageMarkupPercent) || 0);
    const [packageMarkupFlat, setPackageMarkupFlat] = useState<number>(Number(savedDraft?.packageMarkupFlat) || 0);
    const [editPackageId, setEditPackageId] = useState<string | undefined>(savedDraft?.editPackageId || undefined);
    const [faqs, setFaqs] = useState<FAQItem[]>(savedDraft?.faqs || []);
    const [extraBuilderData, setExtraBuilderData] = useState<Record<string, any>>(savedDraft?.extraBuilderData || {});

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
        roomSharing: 'Double',
        mealPlanCode: 'CP',
        roomsCount: 1,
        extraBedNotes: '',
    });

    // Auto-save to localStorage (skip writing mismatched draft while ?edit=<id> is loading)
    useEffect(() => {
        const urlEditId = getUrlEditId();
        if (urlEditId && String(editPackageId || '') !== String(urlEditId)) {
            return;
        }
        const draft = {
            step, items, dayMeta, currency, taxConfig, packageMarkupPercent, packageMarkupFlat, editPackageId, tripDetails, faqs, extraBuilderData
        };
        localStorage.setItem('itinerary_draft', JSON.stringify(draft));
    }, [step, items, dayMeta, currency, taxConfig, packageMarkupPercent, packageMarkupFlat, editPackageId, tripDetails, faqs, extraBuilderData]);

    // Currency helpers (strict number coercion to banish NaN)
    const convertCurrency = useCallback((amountInINR: number | string): number => {
        const num = Number(amountInINR);
        const safeAmount = isNaN(num) ? 0 : num;
        const rate = CURRENCY_RATES[currency] || 1;
        return Math.round(safeAmount * rate);
    }, [currency]);

    const formatCurrency = useCallback((amount: number | string): string => {
        const num = Number(amount);
        const safeAmount = isNaN(num) ? 0 : num;
        const converted = Math.round(convertCurrency(safeAmount));
        const symbol = CURRENCY_SYMBOLS[currency] || '₹';
        return `${symbol}${converted.toLocaleString('en-IN')}`;
    }, [currency, convertCurrency]);

    // Calculate totals
    const subtotal = useMemo(() => {
        return items
            .filter(i => i.type !== 'note' && i.type !== 'other')
            .reduce((sum, item) => sum + (Number(item.sellPrice) || 0), 0);
    }, [items]);

    // Package-level markup: applied on top of item subtotal, before tax
    const packageMarkupAmount = useMemo(() => {
        const safeSubtotal = Number(subtotal) || 0;
        const safePercent = Number(packageMarkupPercent) || 0;
        const safeFlat = Number(packageMarkupFlat) || 0;
        return Math.round(safeSubtotal * (safePercent / 100)) + safeFlat;
    }, [subtotal, packageMarkupPercent, packageMarkupFlat]);

    const preTaxTotal = useMemo(() => {
        return (Number(subtotal) || 0) + (Number(packageMarkupAmount) || 0);
    }, [subtotal, packageMarkupAmount]);

    const taxAmount = useMemo(() => {
        const { cgstPercent, sgstPercent, igstPercent, tcsPercent, gstOnTotal } = taxConfig || {};

        // When the "Apply GST" checkbox is off, no tax applies at all
        if (!gstOnTotal) return 0;

        const taxableBase = Number(preTaxTotal) || 0; // GST on the full pre-tax total
        const cgst = taxableBase * ((Number(cgstPercent) || 0) / 100);
        const sgst = taxableBase * ((Number(sgstPercent) || 0) / 100);
        const igst = taxableBase * ((Number(igstPercent) || 0) / 100);
        const tcs  = taxableBase * ((Number(tcsPercent)  || 0) / 100);

        return Math.round((cgst + sgst + igst + tcs) * 100) / 100;
    }, [preTaxTotal, taxConfig]);

    const grandTotal = useMemo(() => {
        const safePreTax = Number(preTaxTotal) || 0;
        const safeTax = Number(taxAmount) || 0;
        return Math.round((safePreTax + safeTax) * 100) / 100;
    }, [preTaxTotal, taxAmount]);

    const setPackageMarkup = useCallback((percent: number | string, flat: number | string) => {
        setPackageMarkupPercent(Number(percent) || 0);
        setPackageMarkupFlat(Number(flat) || 0);
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

    // Safely add 1 day (+1 night) while keeping existing destination legs and scheduled items intact
    const addDay = useCallback(() => {
        setTripDetails(prev => {
            const currentDays = Math.max(1, Number(prev.days) || 1);
            const currentNights = prev.nights !== undefined ? Math.max(0, Number(prev.nights)) : Math.max(0, currentDays - 1);
            const nextNights = currentNights + 1;
            const nextDays = nextNights + 1;

            const currentDests = Array.isArray(prev.destinations) ? prev.destinations : [];
            let nextDests: TripDestination[];
            if (currentDests.length > 0) {
                nextDests = currentDests.map((d, idx) =>
                    idx === currentDests.length - 1
                        ? { ...d, nights: Math.max(0, Number(d.nights) || 0) + 1 }
                        : d
                );
            } else {
                nextDests = [{
                    locationId: prev.destination || '',
                    nights: nextNights,
                    order: 0
                }];
            }

            return {
                ...prev,
                destinations: nextDests,
                nights: nextNights,
                days: nextDays,
            };
        });
    }, []);

    // Safely remove a specific day: drops items/meta for that day, shifts later days down by 1, and syncs destination leg nights
    const removeDay = useCallback((dayToRemove: number) => {
        setTripDetails(prev => {
            const currentDays = Math.max(1, Number(prev.days) || 1);
            if (currentDays <= 1) return prev;

            const currentNights = prev.nights !== undefined ? Math.max(0, Number(prev.nights)) : Math.max(0, currentDays - 1);
            const currentDests = Array.isArray(prev.destinations) ? [...prev.destinations] : [];

            let nextDests = currentDests;
            let nextNights = Math.max(0, currentNights - 1);
            let nextDestination = prev.destination;

            if (currentDests.length > 0) {
                // Locate which destination leg owns dayToRemove
                let cursorDay = 1;
                let targetLegIdx = -1;
                for (let i = 0; i < currentDests.length; i++) {
                    const legNights = Math.max(0, Number(currentDests[i].nights) || 0);
                    const legSpan = legNights === 0 ? 1 : legNights;
                    if (dayToRemove >= cursorDay && dayToRemove < cursorDay + legSpan) {
                        targetLegIdx = i;
                        break;
                    }
                    cursorDay += legSpan;
                }
                if (targetLegIdx === -1) {
                    // Departure day (after all night spans): reduce the last leg with nights > 0
                    for (let i = currentDests.length - 1; i >= 0; i--) {
                        if ((Number(currentDests[i].nights) || 0) > 0) {
                            targetLegIdx = i;
                            break;
                        }
                    }
                    if (targetLegIdx === -1) targetLegIdx = currentDests.length - 1;
                }

                const targetLeg = currentDests[targetLegIdx];
                const targetNights = Math.max(0, Number(targetLeg.nights) || 0);

                if (targetNights > 1) {
                    nextDests = currentDests.map((d, idx) =>
                        idx === targetLegIdx ? { ...d, nights: targetNights - 1 } : d
                    );
                } else if (currentDests.length > 1) {
                    // Remove exhausted 1N / 0N leg in a multi-leg itinerary and re-index order
                    nextDests = currentDests
                        .filter((_, idx) => idx !== targetLegIdx)
                        .map((d, idx) => ({ ...d, order: idx }));
                    if (targetLegIdx === 0 && nextDests.length > 0) {
                        nextDestination = nextDests[0].locationId;
                    }
                } else {
                    // Single remaining leg going from 1N -> 0N (1-Day Excursion)
                    nextDests = [{ ...targetLeg, nights: 0 }];
                }

                nextNights = nextDests.reduce((acc, d) => acc + Math.max(0, Number(d.nights) || 0), 0);
            }

            const nextDays = nextNights === 0 ? 1 : nextNights + 1;

            return {
                ...prev,
                destination: nextDestination,
                destinations: nextDests,
                nights: nextNights,
                days: nextDays,
            };
        });

        setItems(prev =>
            prev
                .filter(item => item.day !== dayToRemove)
                .map(item => (item.day > dayToRemove ? { ...item, day: item.day - 1 } : item))
        );

        setDayMeta(prev => {
            const next: Record<number, DayMeta> = {};
            Object.entries(prev).forEach(([k, val]) => {
                const d = Number(k);
                if (d < dayToRemove) next[d] = val;
                else if (d > dayToRemove) next[d - 1] = val;
            });
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

        const resolveLocId = (val?: string) => {
            if (!val) return '';
            const found = masterLocations?.find(
                (l: any) => String(l.id) === String(val) || (l.name && l.name.toLowerCase() === String(val).toLowerCase())
            );
            return found?.id ? String(found.id) : String(val);
        };

        if (pkg.builderData) {
            const td = pkg.builderData.tripDetails || {};
            const safeDays = Math.max(1, Number(td.days) || Number(pkg.days) || 1);
            const safeNights = td.nights !== undefined
                ? Math.max(0, Number(td.nights))
                : Math.max(0, safeDays - 1);
            const resolvedPrimaryDest = resolveLocId(td.destination || pkg.location);

            let normalizedDestinations: TripDestination[] = Array.isArray(td.destinations)
                ? td.destinations.map((d: any, idx: number) => ({
                    locationId: resolveLocId(d.locationId),
                    nights: Math.max(0, Number(d.nights) ?? 0),
                    order: d.order ?? idx,
                }))
                : [];

            // Defensive recovery: ensure destination legs are populated if missing/empty
            if (normalizedDestinations.length === 0 && (resolvedPrimaryDest || safeNights > 0)) {
                normalizedDestinations = [{
                    locationId: resolvedPrimaryDest,
                    nights: safeNights,
                    order: 0,
                }];
            }

            // Fix 1.4: ensure gallery is always an array
            setTripDetails({
                ...td,
                title: td.title || pkg.title || '',
                startDate: td.startDate || new Date().toISOString().split('T')[0],
                days: safeDays,
                nights: safeNights,
                destination: resolvedPrimaryDest || normalizedDestinations[0]?.locationId || '',
                destinations: normalizedDestinations,
                termsAndConditions: td.termsAndConditions || pkg.terms_and_conditions || '',
                gallery: td.gallery ?? [],
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
            setPackageMarkupPercent(Number(pkg.builderData.packageMarkupPercent) || 0);
            setPackageMarkupFlat(Number(pkg.builderData.packageMarkupFlat) || 0);
            setFaqs(pkg.builderData.faqs || []);

            // Preserve any extra builderData keys (e.g. ageLimits, cancellationPolicy, paymentPolicy)
            const {
                tripDetails: _td,
                items: _it,
                dayMeta: _dm,
                currency: _cur,
                taxConfig: _tc,
                packageMarkupPercent: _pmp,
                packageMarkupFlat: _pmf,
                faqs: _f,
                ...restBuilderData
            } = pkg.builderData;
            setExtraBuilderData(restBuilderData || {});
        } else {
            // Legacy / fallback migration — best effort (also recovers previously-cloned packages missing builderData)
            const resolvedDestId = resolveLocId(pkg.location);
            const guestsMatch = pkg.groupSize?.match(/(\d+)/);
            const guests = guestsMatch ? parseInt(guestsMatch[1]) : 2;
            const safeDays = Math.max(
                1,
                Number(pkg.days) || (Array.isArray(pkg.itinerary) && pkg.itinerary.length > 0 ? pkg.itinerary.length : 1)
            );
            const safeNights = Math.max(0, safeDays - 1);

            const fallbackDestinations: TripDestination[] = (resolvedDestId || safeNights > 0)
                ? [{ locationId: resolvedDestId, nights: safeNights, order: 0 }]
                : [];

            setTripDetails({
                title: pkg.title || '',
                startDate: new Date().toISOString().split('T')[0],
                days: safeDays,
                nights: safeNights,
                destination: resolvedDestId,
                destinations: fallbackDestinations,
                coverImage: pkg.image || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop',
                gallery: Array.isArray(pkg.gallery) ? pkg.gallery.filter((u: string) => u && u !== pkg.image) : [],
                adults: guests,
                children: 0,
                included: pkg.included || ['Premium accommodation', 'Daily breakfast & dinner', 'Private transfers', 'Entry tickets', 'Expert guide'],
                notIncluded: pkg.notIncluded || ['Airfare (International)', 'Personal expenses', 'Camera fees', 'Optional activities', 'Insurance'],
                termsAndConditions: pkg.terms_and_conditions || '',
                roomSharing: 'Double',
                mealPlanCode: 'CP',
                roomsCount: Math.max(1, Math.ceil(guests / 2)),
            });

            const restoredDayMeta: Record<number, any> = {};
            const newItems: ItineraryItem[] = [];
            (pkg.itinerary || []).forEach((dayObj: any, idx: number) => {
                const dayNum = Number(dayObj.day) || (idx + 1);
                if (dayObj.title) {
                    restoredDayMeta[dayNum] = { theme: dayObj.title };
                }
                if (Array.isArray(dayObj.items) && dayObj.items.length > 0) {
                    dayObj.items.forEach((rawItem: any, itemIdx: number) => {
                        const { masterData, ...safeItem } = rawItem || {};
                        const netCost = Number(safeItem.netCost) || 0;
                        const baseMarkupPercent = Number(safeItem.baseMarkupPercent) || 0;
                        const extraMarkupFlat = Number(safeItem.extraMarkupFlat) || 0;
                        const quantity = Number(safeItem.quantity) || 1;
                        newItems.push({
                            ...safeItem,
                            id: safeItem.id || `mig-${Date.now()}-${dayNum}-${itemIdx}-${Math.random().toString(36).slice(2, 5)}`,
                            day: dayNum,
                            netCost,
                            baseMarkupPercent,
                            extraMarkupFlat,
                            quantity,
                            sellPrice: calculateSellPrice(netCost, baseMarkupPercent, extraMarkupFlat, quantity),
                            order: safeItem.order ?? itemIdx,
                        });
                    });
                } else {
                    newItems.push({
                        id: `mig-${Date.now()}-${dayNum}-${Math.random().toString(36).slice(2, 5)}`,
                        type: 'activity',
                        day: dayNum,
                        title: dayObj.title || `Day ${dayNum}`,
                        description: dayObj.desc,
                        netCost: 0,
                        baseMarkupPercent: 0,
                        extraMarkupFlat: 0,
                        sellPrice: 0,
                        quantity: guests,
                        order: 0
                    });
                }
            });

            const restoredSubtotal = newItems
                .filter(i => i.type !== 'note' && i.type !== 'other')
                .reduce((sum, i) => sum + (Number(i.sellPrice) || 0), 0);

            setItems(newItems);
            setDayMeta(restoredDayMeta);
            setCurrency('INR');
            setTaxConfig(DEFAULT_TAX_CONFIG);
            setPackageMarkupFlat(restoredSubtotal > 0 ? Math.max(0, (Number(pkg.price) || 0) - restoredSubtotal) : (Number(pkg.price) || 0));
            setPackageMarkupPercent(0);
            setFaqs([]);
            setExtraBuilderData({});
        }
    }, []);

    const clearDraft = useCallback(() => {
        localStorage.removeItem('itinerary_draft');
        setStep(1);
        setItems([]);
        setDayMeta({});
        setEditPackageId(undefined);
        setFaqs([]);
        setExtraBuilderData({});
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
            roomSharing: 'Double',
            mealPlanCode: 'CP',
            roomsCount: 1,
            extraBedNotes: '',
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
        addDay,
        removeDay,
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
        setFaqs,
        extraBuilderData
    }), [step, tripDetails, items, currency, taxConfig, packageMarkupPercent, packageMarkupFlat,
        subtotal, packageMarkupAmount, taxAmount, grandTotal, editPackageId,
        updateTripDetails, addDay, removeDay, addItem, updateItem, removeItem, replaceAllItems, reorderItems, duplicateDay,
        getItemsForDay, updateTaxConfig, setPackageMarkup, loadPackage, clearDraft, formatCurrency, convertCurrency, dayMeta, setEditPackageId, faqs, extraBuilderData]);

    return (
        <ItineraryContext.Provider value={value}>
            {children}
        </ItineraryContext.Provider>
    );
};
