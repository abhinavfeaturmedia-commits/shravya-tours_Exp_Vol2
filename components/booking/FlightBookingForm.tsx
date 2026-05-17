import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Validation schema
const flightBookingSchema = z.object({
    from: z.string().min(2, 'Departure airport is required'),
    to: z.string().min(2, 'Destination airport is required'),
    date: z.string().min(1, 'Travel date is required'),
    passengers: z.number().min(1, 'At least 1 passenger required').max(10, 'Maximum 10 passengers per booking'),
    classType: z.string().min(1, 'Class type is required'),
}).refine(data => data.from.toLowerCase() !== data.to.toLowerCase(), {
    message: 'Departure and destination must be different',
    path: ['to']
});

type FlightFormData = z.infer<typeof flightBookingSchema>;

interface FlightBookingFormProps {
    onSubmit: (data: FlightBookingData) => void;
}

export interface FlightBookingData {
    from: string;
    to: string;
    date: string;
    passengers: number;
    classType: string;
}

export const FlightBookingForm: React.FC<FlightBookingFormProps> = ({ onSubmit }) => {
    const today = new Date().toISOString().split('T')[0];

    const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FlightFormData>({
        resolver: zodResolver(flightBookingSchema),
        defaultValues: { from: '', to: '', date: '', passengers: 1, classType: 'Economy' }
    });

    const passengers = watch('passengers');

    const updatePassengers = (delta: number) => {
        const newVal = Math.max(1, Math.min(10, passengers + delta));
        setValue('passengers', newVal);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 md:gap-4 items-end animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* From */}
                <div className="sm:col-span-1 lg:col-span-2 relative group">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block pl-1">From</label>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-lg">flight_takeoff</span>
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
                <div className="sm:col-span-1 lg:col-span-2 relative group">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block pl-1">To</label>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-lg">flight_land</span>
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
                <div className="sm:col-span-1 lg:col-span-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block pl-1">Date</label>
                    <input
                        {...register('date')}
                        className={`w-full px-3 py-3 bg-slate-100 dark:bg-slate-800 border-2 rounded-xl focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-bold text-sm transition-all ${errors.date ? 'border-red-400' : 'border-transparent'}`}
                        type="date"
                        min={today}
                    />
                    {errors.date && <p className="text-red-500 text-[10px] mt-1 pl-1">{errors.date.message}</p>}
                </div>

                {/* Passengers */}
                <div className="sm:col-span-1 lg:col-span-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block pl-1">Passengers</label>
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1.5 h-[52px]">
                        <button
                            type="button"
                            onClick={() => updatePassengers(-1)}
                            disabled={passengers <= 1}
                            className="size-9 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">remove</span>
                        </button>
                        <input
                            type="hidden"
                            {...register('passengers', { valueAsNumber: true })}
                        />
                        <span className="flex-1 text-center font-bold text-base text-slate-900 dark:text-white">{passengers}</span>
                        <button
                            type="button"
                            onClick={() => updatePassengers(1)}
                            disabled={passengers >= 10}
                            className="size-9 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">add</span>
                        </button>
                    </div>
                    {errors.passengers && <p className="text-red-500 text-[10px] mt-1 pl-1">{errors.passengers.message}</p>}
                </div>

                {/* Class Type */}
                <div className="sm:col-span-1 lg:col-span-2 relative group">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block pl-1">Class</label>
                    <div className="relative">
                        <select
                            {...register('classType')}
                            className={`w-full px-3 py-3 h-[52px] bg-slate-100 dark:bg-slate-800 border-2 rounded-xl focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-bold text-sm transition-all appearance-none cursor-pointer ${errors.classType ? 'border-red-400' : 'border-transparent'}`}
                        >
                            <option value="Economy">Economy</option>
                            <option value="Premium Economy">Premium Economy</option>
                            <option value="Business">Business</option>
                            <option value="First Class">First Class</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                    </div>
                    {errors.classType && <p className="text-red-500 text-[10px] mt-1 pl-1">{errors.classType.message}</p>}
                </div>

                {/* Submit */}
                <div className="sm:col-span-2 lg:col-span-2">
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

export default FlightBookingForm;
