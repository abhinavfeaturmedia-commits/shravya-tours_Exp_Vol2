import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Validation schema
const busBookingSchema = z.object({
    from: z.string().min(2, 'Departure city is required'),
    to: z.string().min(2, 'Destination city is required'),
    date: z.string().min(1, 'Travel date is required'),
    seats: z.number().min(1, 'At least 1 seat required').max(500, 'Maximum 500 seats per booking'),
    acType: z.string().min(1, 'AC type required'),
    busType: z.string().min(1, 'Bus type required'),
}).refine(data => data.from.toLowerCase() !== data.to.toLowerCase(), {
    message: 'Departure and destination must be different',
    path: ['to']
});

type BusFormData = z.infer<typeof busBookingSchema>;

interface BusBookingFormProps {
    onSubmit: (data: BusBookingData) => void;
}

export interface BusBookingData {
    from: string;
    to: string;
    date: string;
    seats: number;
    acType: string;
    busType: string;
}

export const BusBookingForm: React.FC<BusBookingFormProps> = ({ onSubmit }) => {
    const today = new Date().toISOString().split('T')[0];

    const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<BusFormData>({
        resolver: zodResolver(busBookingSchema),
        defaultValues: { from: '', to: '', date: '', seats: 1, acType: 'AC', busType: 'Sleeper' }
    });

    const seats = watch('seats');

    const updateSeats = (delta: number) => {
        const newVal = Math.max(1, Math.min(500, seats + delta));
        setValue('seats', newVal);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 md:gap-4 items-end animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* From */}
                <div className="sm:col-span-2 md:col-span-4 relative group">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block pl-1">From</label>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-lg">trip_origin</span>
                        <input
                            {...register('from')}
                            className={`w-full pl-10 pr-3 py-3 bg-slate-100 dark:bg-slate-800 border-2 rounded-xl focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-bold text-sm placeholder:text-slate-400/80 transition-all ${errors.from ? 'border-red-400' : 'border-transparent'}`}
                            placeholder="Departure"
                            type="text"
                        />
                    </div>
                    {errors.from && <p className="text-red-500 text-[10px] mt-1 pl-1">{errors.from.message}</p>}
                </div>

                {/* To */}
                <div className="sm:col-span-2 md:col-span-4 relative group">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block pl-1">To</label>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-lg">location_on</span>
                        <input
                            {...register('to')}
                            className={`w-full pl-10 pr-3 py-3 bg-slate-100 dark:bg-slate-800 border-2 rounded-xl focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-bold text-sm placeholder:text-slate-400/80 transition-all ${errors.to ? 'border-red-400' : 'border-transparent'}`}
                            placeholder="Destination"
                            type="text"
                        />
                    </div>
                    {errors.to && <p className="text-red-500 text-[10px] mt-1 pl-1">{errors.to.message}</p>}
                </div>

                {/* Date */}
                <div className="sm:col-span-2 md:col-span-4">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block pl-1">Date</label>
                    <input
                        {...register('date')}
                        className={`w-full px-3 py-3 bg-slate-100 dark:bg-slate-800 border-2 rounded-xl focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-bold text-sm transition-all ${errors.date ? 'border-red-400' : 'border-transparent'}`}
                        type="date"
                        min={today}
                    />
                    {errors.date && <p className="text-red-500 text-[10px] mt-1 pl-1">{errors.date.message}</p>}
                </div>

                {/* AC Type */}
                <div className="sm:col-span-1 md:col-span-3 relative group">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block pl-1">AC Type</label>
                    <div className="relative">
                        <select
                            {...register('acType')}
                            className={`w-full px-3 py-3 h-[52px] bg-slate-100 dark:bg-slate-800 border-2 rounded-xl focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-bold text-sm transition-all outline-none appearance-none cursor-pointer ${errors.acType ? 'border-red-400' : 'border-transparent'}`}
                        >
                            <option value="AC">AC</option>
                            <option value="Non-AC">Non-AC</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                    </div>
                </div>

                {/* Bus Type */}
                <div className="sm:col-span-1 md:col-span-3 relative group">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block pl-1">Seat Type</label>
                    <div className="relative">
                        <select
                            {...register('busType')}
                            className={`w-full px-3 py-3 h-[52px] bg-slate-100 dark:bg-slate-800 border-2 rounded-xl focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-bold text-sm transition-all outline-none appearance-none cursor-pointer ${errors.busType ? 'border-red-400' : 'border-transparent'}`}
                        >
                            <option value="Seater">Seater</option>
                            <option value="Semi Seater">Semi Seater</option>
                            <option value="Sleeper">Sleeper</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                    </div>
                </div>

                {/* Seats */}
                <div className="sm:col-span-1 md:col-span-3">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block pl-1">Seats</label>
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1.5 h-[52px]">
                        <button
                            type="button"
                            onClick={() => updateSeats(-1)}
                            disabled={seats <= 1}
                            className="size-9 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">remove</span>
                        </button>
                        <input
                            type="number"
                            {...register('seats', { valueAsNumber: true })}
                            min={1}
                            max={500}
                            className="flex-1 w-16 bg-transparent text-center font-bold text-base text-slate-900 dark:text-white border-0 focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                            type="button"
                            onClick={() => updateSeats(1)}
                            disabled={seats >= 500}
                            className="size-9 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">add</span>
                        </button>
                    </div>
                    {errors.seats && <p className="text-red-500 text-[10px] mt-1 pl-1">{errors.seats.message}</p>}
                </div>

                {/* Submit */}
                <div className="sm:col-span-1 md:col-span-3">
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

export default BusBookingForm;
