import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Validation schema
const carBookingSchema = z.object({
    pickupLocation: z.string().min(2, 'Pickup location is required'),
    dropoffLocation: z.string().optional(),
    pickupDate: z.string().min(1, 'Pickup date is required'),
    pickupTime: z.string().min(1, 'Pickup time is required'),
    vehicleType: z.string().min(1, 'Please select a vehicle type'),
});

type CarFormData = z.infer<typeof carBookingSchema>;

interface CarBookingFormProps {
    onSubmit: (data: CarBookingData) => void;
}

export interface CarBookingData {
    pickupLocation: string;
    dropoffLocation: string;
    pickupDate: string;
    pickupTime: string;
    vehicleType: string;
    sameDropOff: boolean;
}

const carTypes = ['Hatchback', 'Sedan', 'SUV', 'Innova', 'Tempo Traveller', 'Luxury'];

export const CarBookingForm: React.FC<CarBookingFormProps> = ({ onSubmit }) => {
    const today = new Date().toISOString().split('T')[0];
    const [sameDropOff, setSameDropOff] = useState(true);

    const { register, handleSubmit, formState: { errors }, watch } = useForm<CarFormData>({
        resolver: zodResolver(carBookingSchema),
        defaultValues: {
            pickupLocation: '',
            dropoffLocation: '',
            pickupDate: '',
            pickupTime: '',
            vehicleType: 'Sedan'
        }
    });

    const onFormSubmit = (data: CarFormData) => {
        // If Drop-off is provided, use it.
        // If NOT provided AND it's a Round Trip (sameDropOff), default to Pickup.
        // If NOT provided AND One Way, it's technically optional by schema but usually implies Destination? 
        // Schema says optional. If one-way and empty, let's also default to pickup or keep empty? 
        // User likely wont leave it empty for One Way.
        // For Round Trip, empty means "Same as Pickup".

        const finalDropOff = data.dropoffLocation
            ? data.dropoffLocation
            : (sameDropOff ? data.pickupLocation : '');

        onSubmit({
            ...data,
            dropoffLocation: finalDropOff,
            sameDropOff
        });
    };

    return (
        <form onSubmit={handleSubmit(onFormSubmit)}>
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Same drop-off toggle */}
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setSameDropOff(true)}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${sameDropOff ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                    >
                        Round Trip
                    </button>
                    <button
                        type="button"
                        onClick={() => setSameDropOff(false)}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${!sameDropOff ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                    >
                        One Way
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 md:gap-4 items-end">
                    {/* Pickup Location */}
                    <div className="sm:col-span-1 lg:col-span-3 relative group">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block pl-1">Pickup Location</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-lg">my_location</span>
                            <input
                                {...register('pickupLocation')}
                                className={`w-full pl-10 pr-3 py-3 bg-slate-100 dark:bg-slate-800 border-2 rounded-xl focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-bold text-sm placeholder:text-slate-400/80 transition-all ${errors.pickupLocation ? 'border-red-400' : 'border-transparent'}`}
                                placeholder="City or Airport"
                                type="text"
                            />
                        </div>
                        {errors.pickupLocation && <p className="text-red-500 text-[10px] mt-1 pl-1">{errors.pickupLocation.message}</p>}
                    </div>

                    {/* Drop-off Location */}
                    <div className="sm:col-span-1 lg:col-span-3 relative group">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block pl-1">Drop-off Location</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-lg">location_on</span>
                            <input
                                {...register('dropoffLocation')}
                                className="w-full pl-10 pr-3 py-3 bg-slate-100 dark:bg-slate-800 border-2 border-transparent rounded-xl focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-bold text-sm placeholder:text-slate-400/80 transition-all"
                                placeholder={sameDropOff ? "Same as Pickup (Optional)" : "Destination"}
                                type="text"
                            />
                        </div>
                    </div>

                    {/* Date & Time */}
                    <div className="sm:col-span-1 lg:col-span-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block pl-1">Date</label>
                        <input
                            {...register('pickupDate')}
                            className={`w-full px-3 py-3 bg-slate-100 dark:bg-slate-800 border-2 rounded-xl focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-bold text-sm transition-all ${errors.pickupDate ? 'border-red-400' : 'border-transparent'}`}
                            type="date"
                            min={today}
                        />
                        {errors.pickupDate && <p className="text-red-500 text-[10px] mt-1 pl-1">{errors.pickupDate.message}</p>}
                    </div>

                    <div className="sm:col-span-1 lg:col-span-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block pl-1">Time</label>
                        <input
                            {...register('pickupTime')}
                            className={`w-full px-3 py-3 bg-slate-100 dark:bg-slate-800 border-2 rounded-xl focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-bold text-sm transition-all ${errors.pickupTime ? 'border-red-400' : 'border-transparent'}`}
                            type="time"
                        />
                        {errors.pickupTime && <p className="text-red-500 text-[10px] mt-1 pl-1">{errors.pickupTime.message}</p>}
                    </div>

                    {/* Vehicle Type */}
                    <div className="sm:col-span-1 lg:col-span-2 relative group">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block pl-1">Vehicle</label>
                        <div className="relative">
                            <select
                                {...register('vehicleType')}
                                className="w-full px-3 py-3 h-[52px] bg-slate-100 dark:bg-slate-800 border-2 border-transparent rounded-xl focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white font-bold text-sm transition-all appearance-none cursor-pointer"
                            >
                                {carTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="sm:col-span-1 lg:col-span-12 mt-2">
                        <button
                            type="submit"
                            className="w-full md:w-auto md:min-w-[200px] h-[52px] bg-primary hover:bg-blue-600 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 active:scale-95 ml-auto"
                        >
                            Get Quote
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
};

export default CarBookingForm;
