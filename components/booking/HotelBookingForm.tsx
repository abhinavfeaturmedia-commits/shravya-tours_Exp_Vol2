import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

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
    const [showGuestMenu, setShowGuestMenu] = useState(false);
    const [guests, setGuests] = useState({ adults: 2, children: 0, rooms: 1 });
    const guestMenuRef = useRef<HTMLDivElement>(null);

    const { register, handleSubmit, formState: { errors }, watch } = useForm<HotelFormData>({
        resolver: zodResolver(hotelBookingSchema),
        defaultValues: { destination: '', checkIn: '', checkOut: '' }
    });

    const checkIn = watch('checkIn');

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (guestMenuRef.current && !guestMenuRef.current.contains(event.target as Node)) {
                setShowGuestMenu(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const updateGuest = (type: 'adults' | 'children' | 'rooms', operation: 'inc' | 'dec') => {
        setGuests(prev => {
            const newVal = operation === 'inc' ? prev[type] + 1 : prev[type] - 1;
            if (type === 'adults' && newVal < 1) return prev;
            if (type === 'rooms' && newVal < 1) return prev;
            if (newVal < 0) return prev;
            return { ...prev, [type]: newVal };
        });
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
                        <input
                            {...register('checkIn')}
                            className={`w-full px-3 py-3 bg-slate-100 dark:bg-slate-800 border-2 rounded-xl focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-bold text-sm transition-all ${errors.checkIn ? 'border-red-400' : 'border-transparent'}`}
                            type="date"
                            min={today}
                        />
                        {errors.checkIn && <p className="text-red-500 text-[10px] mt-1 pl-1">{errors.checkIn.message}</p>}
                    </div>
                    <div className="relative group">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block pl-1">Check-out</label>
                        <input
                            {...register('checkOut')}
                            className={`w-full px-3 py-3 bg-slate-100 dark:bg-slate-800 border-2 rounded-xl focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-bold text-sm transition-all ${errors.checkOut ? 'border-red-400' : 'border-transparent'}`}
                            type="date"
                            min={checkIn || today}
                        />
                        {errors.checkOut && <p className="text-red-500 text-[10px] mt-1 pl-1">{errors.checkOut.message}</p>}
                    </div>
                </div>

                <div className="sm:col-span-1 md:col-span-2 relative" ref={guestMenuRef}>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block pl-1">Guests</label>
                    <button
                        type="button"
                        onClick={() => setShowGuestMenu(!showGuestMenu)}
                        className="w-full text-left pl-3 pr-8 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-bold text-sm h-[52px] flex items-center justify-between transition-all"
                    >
                        <span className="truncate text-sm">{getGuestString()}</span>
                        <span className="material-symbols-outlined text-slate-400 absolute right-3">expand_more</span>
                    </button>

                    {showGuestMenu && (
                        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                            {(['adults', 'children', 'rooms'] as const).map((type) => (
                                <div key={type} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
                                    <div className="capitalize font-bold text-slate-700 dark:text-slate-200 text-sm">{type}</div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => updateGuest(type, 'dec')}
                                            className="size-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-400 disabled:opacity-50 transition-colors"
                                            disabled={(type === 'adults' && guests.adults <= 1) || (type === 'rooms' && guests.rooms <= 1) || (type === 'children' && guests.children <= 0)}
                                        >
                                            <span className="material-symbols-outlined text-sm">remove</span>
                                        </button>
                                        <span className="w-6 text-center font-bold text-slate-900 dark:text-white">{guests[type]}</span>
                                        <button
                                            type="button"
                                            onClick={() => updateGuest(type, 'inc')}
                                            className="size-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-400 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-sm">add</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => setShowGuestMenu(false)}
                                className="w-full mt-3 py-3 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary/20 transition-colors text-sm"
                            >
                                Done
                            </button>
                        </div>
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
