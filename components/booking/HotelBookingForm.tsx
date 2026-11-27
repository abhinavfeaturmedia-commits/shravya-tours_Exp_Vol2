import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, X } from 'lucide-react';
import { BrandDatePicker } from '../ui/BrandDatePicker';

// Validation schema
const hotelBookingSchema = z.object({
    destination: z.string().min(2, 'Please enter a destination'),
    checkIn: z.string().min(1, 'Check-in date is required'),
    checkOut: z.string().min(1, 'Check-out date is required'),
}).refine(data => {
    if (data.checkIn && data.checkOut) {
        return new Date(data.checkOut) > new Date(data.checkIn);
    }
    return true;
}, { message: 'Check-out must be after check-in', path: ['checkOut'] });

type HotelFormData = z.infer<typeof hotelBookingSchema>;

interface HotelBookingFormProps {
    onSubmit: (data: HotelBookingData) => void;
}

export interface HotelBookingData {
    destination: string;
    checkIn: string;
    checkOut: string;
    guests: { adults: number; children: number; rooms: number };
}

export const HotelBookingForm: React.FC<HotelBookingFormProps> = ({ onSubmit }) => {
    const today = new Date().toISOString().split('T')[0];
    const autoId = useId();
    const guestDialogId = `hotel-guests-popover-${autoId}`;
    const [showGuestMenu, setShowGuestMenu] = useState(false);
    const [guests, setGuests] = useState({ adults: 2, children: 0, rooms: 1 });
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean }>({
        top: 0,
        left: 0,
        placeAbove: false,
    });
    const guestMenuRef = useRef<HTMLDivElement>(null);
    const guestTriggerRef = useRef<HTMLButtonElement>(null);
    const guestPanelRef = useRef<HTMLDivElement>(null);

    const { register, handleSubmit, formState: { errors }, watch } = useForm<HotelFormData>({
        resolver: zodResolver(hotelBookingSchema),
        defaultValues: { destination: '', checkIn: '', checkOut: '' }
    });

    const checkIn = watch('checkIn');

    const updateMenuPosition = useCallback(() => {
        if (!guestTriggerRef.current || typeof window === 'undefined') return;
        const mobile = window.innerWidth < 640;
        setIsMobileViewport(mobile);
        if (mobile) return;

        const rect = guestTriggerRef.current.getBoundingClientRect();
        const viewportH = window.innerHeight;
        const viewportW = window.innerWidth;
        const panelWidth = 300;
        const approxHeight = 270;
        const spaceBelow = viewportH - rect.bottom - 12;
        const spaceAbove = rect.top - 12;
        const placeAbove = spaceBelow < approxHeight && spaceAbove > spaceBelow;
        const left = Math.max(8, Math.min(rect.right - panelWidth, viewportW - panelWidth - 8));
        const top = placeAbove ? rect.top - 8 : rect.bottom + 8;
        setCoords({ top, left, placeAbove });
    }, []);

    const closeGuestMenu = useCallback((restoreFocus = false) => {
        setShowGuestMenu(false);
        if (restoreFocus) {
            requestAnimationFrame(() => guestTriggerRef.current?.focus());
        }
    }, []);

    useEffect(() => {
        if (!showGuestMenu) return;
        updateMenuPosition();
        window.addEventListener('resize', updateMenuPosition);
        window.addEventListener('scroll', updateMenuPosition, true);

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                guestTriggerRef.current?.contains(target) ||
                guestPanelRef.current?.contains(target)
            ) {
                return;
            }
            closeGuestMenu(false);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                closeGuestMenu(true);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown, true);
        return () => {
            window.removeEventListener('resize', updateMenuPosition);
            window.removeEventListener('scroll', updateMenuPosition, true);
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [showGuestMenu, updateMenuPosition, closeGuestMenu]);

    const updateGuest = (type: 'adults' | 'children' | 'rooms', operation: 'inc' | 'dec') => {
        setGuests(prev => {
            const newVal = operation === 'inc' ? prev[type] + 1 : prev[type] - 1;
            const minVal = (type === 'adults' || type === 'rooms') ? 1 : 0;
            if (newVal < minVal || newVal > 500) return prev;
            return { ...prev, [type]: newVal };
        });
    };

    const handleInputChange = (type: 'adults' | 'children' | 'rooms', value: number) => {
        const minVal = (type === 'adults' || type === 'rooms') ? 1 : 0;
        const clampedVal = Math.max(minVal, Math.min(500, value));
        setGuests(prev => ({ ...prev, [type]: clampedVal }));
    };

    const getGuestString = () => {
        return `${guests.adults} Adult${guests.adults > 1 ? 's' : ''}, ${guests.children} Child${guests.children !== 1 ? 'ren' : ''}, ${guests.rooms} Room${guests.rooms > 1 ? 's' : ''}`;
    };

    const onFormSubmit = (data: HotelFormData) => {
        onSubmit({ ...data, guests });
    };

    return (
        <form onSubmit={handleSubmit(onFormSubmit)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 md:gap-4 items-end animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="sm:col-span-2 md:col-span-4 relative group">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block pl-1">Where to?</label>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-lg">search</span>
                        <input
                            {...register('destination')}
                            className={`w-full pl-10 pr-3 py-3 bg-slate-100 dark:bg-slate-800 border-2 rounded-xl focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-bold text-sm placeholder:text-slate-400/80 transition-all ${errors.destination ? 'border-red-400' : 'border-transparent'}`}
                            placeholder="City, Hotel, or Landmark"
                            type="text"
                        />
                    </div>
                    {errors.destination && <p className="text-red-500 text-[10px] mt-1 pl-1">{errors.destination.message}</p>}
                </div>

                <div className="sm:col-span-2 md:col-span-4 grid grid-cols-2 gap-3">
                    <div className="relative group">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block pl-1">Check-in</label>
                        <BrandDatePicker
                            {...register('checkIn')}
                            labelText="Check-in Date"
                            placeholder="Check-in"
                            className={`w-full px-3 py-3 h-[52px] bg-slate-100 dark:bg-slate-800 border-2 rounded-xl focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-bold text-sm transition-all ${errors.checkIn ? 'border-red-400' : 'border-transparent'}`}
                            min={today}
                        />
                        {errors.checkIn && <p className="text-red-500 text-[10px] mt-1 pl-1">{errors.checkIn.message}</p>}
                    </div>
                    <div className="relative group">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block pl-1">Check-out</label>
                        <BrandDatePicker
                            {...register('checkOut')}
                            labelText="Check-out Date"
                            placeholder="Check-out"
                            className={`w-full px-3 py-3 h-[52px] bg-slate-100 dark:bg-slate-800 border-2 rounded-xl focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-bold text-sm transition-all ${errors.checkOut ? 'border-red-400' : 'border-transparent'}`}
                            min={checkIn || today}
                        />
                        {errors.checkOut && <p className="text-red-500 text-[10px] mt-1 pl-1">{errors.checkOut.message}</p>}
                    </div>
                </div>

                <div className="sm:col-span-1 md:col-span-2 relative" ref={guestMenuRef}>
                    <label htmlFor={`${autoId}-guests-btn`} className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block pl-1">Guests</label>
                    <button
                        ref={guestTriggerRef}
                        id={`${autoId}-guests-btn`}
                        type="button"
                        aria-expanded={showGuestMenu}
                        aria-controls={showGuestMenu ? guestDialogId : undefined}
                        onClick={() => (showGuestMenu ? closeGuestMenu(false) : setShowGuestMenu(true))}
                        className="w-full text-left pl-3 pr-9 py-3 bg-slate-100 dark:bg-slate-800 border-2 border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-bold text-sm h-[52px] flex items-center justify-between transition-all cursor-pointer select-none relative"
                    >
                        <span className="truncate text-sm">{getGuestString()}</span>
                        <ChevronDown
                            size={16}
                            aria-hidden="true"
                            className={`shrink-0 absolute right-3 transition-transform duration-200 ${showGuestMenu ? 'rotate-180 text-[#C9732A]' : 'text-slate-400'}`}
                        />
                    </button>

                    {showGuestMenu && typeof document !== 'undefined' && createPortal(
                        (() => {
                            const guestRows = [
                                { key: 'adults' as const, label: 'Adults', subtitle: 'Ages 12+', min: 1 },
                                { key: 'children' as const, label: 'Children', subtitle: 'Ages 0–11', min: 0 },
                                { key: 'rooms' as const, label: 'Rooms', subtitle: 'Hotel stays', min: 1 },
                            ];

                            const guestControls = (
                                <>
                                    <div className="space-y-1">
                                        {guestRows.map(({ key, label, subtitle, min }) => (
                                            <div key={key} className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                                <div>
                                                    <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">{label}</div>
                                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</div>
                                                </div>
                                                <div className="flex items-center gap-2.5">
                                                    <button
                                                        type="button"
                                                        aria-label={`Decrease ${label.toLowerCase()}`}
                                                        onClick={() => updateGuest(key, 'dec')}
                                                        className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
                                                        disabled={guests[key] <= min}
                                                    >
                                                        <span className="material-symbols-outlined text-sm" aria-hidden="true">remove</span>
                                                    </button>
                                                    <input
                                                        type="number"
                                                        inputMode="numeric"
                                                        aria-label={`${label} count`}
                                                        value={guests[key]}
                                                        onFocus={(e) => e.currentTarget.select()}
                                                        onChange={(e) => handleInputChange(key, parseInt(e.target.value, 10) || min)}
                                                        min={min}
                                                        max={500}
                                                        className="w-14 text-center font-bold text-sm text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 focus:outline-none focus:ring-2 focus:ring-[#C9732A]/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        aria-label={`Increase ${label.toLowerCase()}`}
                                                        onClick={() => updateGuest(key, 'inc')}
                                                        className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-40 cursor-pointer"
                                                        disabled={guests[key] >= 500}
                                                    >
                                                        <span className="material-symbols-outlined text-sm" aria-hidden="true">add</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => closeGuestMenu(true)}
                                        className="w-full mt-3 py-2.5 bg-[#C9732A] hover:bg-[#b56320] text-white font-bold rounded-xl transition-colors text-sm cursor-pointer shadow-sm"
                                    >
                                        Done
                                    </button>
                                </>
                            );

                            if (isMobileViewport) {
                                return (
                                    <div
                                        className="fixed inset-0 z-[500] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
                                        onClick={() => closeGuestMenu(true)}
                                    >
                                        <div
                                            ref={guestPanelRef}
                                            id={guestDialogId}
                                            role="dialog"
                                            aria-modal="true"
                                            aria-label="Guests and Rooms"
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full max-w-md bg-[#FBF9F5] dark:bg-[#0F172A] border-t border-slate-200 dark:border-slate-800 rounded-t-3xl shadow-2xl p-4 pb-6 animate-in slide-in-from-bottom-6 duration-200"
                                        >
                                            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3" />
                                            <div className="flex items-center justify-between gap-2 pb-2.5 mb-2 border-b border-slate-200/70 dark:border-slate-800">
                                                <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                    Guests &amp; Rooms
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => closeGuestMenu(true)}
                                                    aria-label="Close guests selector"
                                                    className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center"
                                                >
                                                    <X size={16} aria-hidden="true" />
                                                </button>
                                            </div>
                                            {guestControls}
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div
                                    ref={guestPanelRef}
                                    id={guestDialogId}
                                    role="dialog"
                                    aria-modal="false"
                                    aria-label="Guests and Rooms"
                                    style={{
                                        position: 'fixed',
                                        left: `${coords.left}px`,
                                        width: '300px',
                                        top: coords.placeAbove ? undefined : `${coords.top}px`,
                                        bottom: coords.placeAbove ? `${window.innerHeight - coords.top}px` : undefined,
                                    }}
                                    className="z-[400] bg-white dark:bg-[#0F172A] rounded-2xl shadow-2xl shadow-slate-900/15 dark:shadow-black/60 border border-slate-200/90 dark:border-slate-700/80 p-4 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
                                >
                                    {guestControls}
                                </div>
                            );
                        })(),
                        document.body
                    )}
                </div>

                <div className="sm:col-span-1 md:col-span-2">
                    <button
                        type="submit"
                        className="w-full h-[52px] bg-primary hover:bg-blue-600 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 active:scale-95"
                    >
                        Search
                    </button>
                </div>
            </div>
        </form>
    );
};

export default HotelBookingForm;
