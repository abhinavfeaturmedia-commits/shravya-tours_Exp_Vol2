import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Lead } from '../../types';
import { useData } from '../../context/DataContext';
import { toast } from '../ui/Toast';
import { TravelerSelector } from '../ui/TravelerSelector';

const bookingSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email'),
    phone: z.string().min(10, 'Please enter a valid phone number'),
    isWhatsappSame: z.boolean(),
    whatsapp: z.string().optional(),
    travelers: z.string(),
    date: z.string().min(1, 'Please select a travel date'),
}).refine((data) => {
    if (!data.isWhatsappSame && (!data.whatsapp || data.whatsapp.length < 10)) {
        return false;
    }
    return true;
}, {
    message: "WhatsApp number is required when it's different from phone number",
    path: ["whatsapp"],
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface QuickBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookingType: 'Car' | 'Bus' | 'Hotel' | 'Tour' | 'Train' | 'Flight';
    bookingDetails: string;
    origin?: string;
    destination?: string;
    defaultDate?: string;
    defaultTravelers?: string;
}

export const QuickBookingModal: React.FC<QuickBookingModalProps> = ({
    isOpen,
    onClose,
    bookingType,
    bookingDetails,
    origin = '',
    destination = '',
    defaultDate = '',
    defaultTravelers = '2 Adults',
}) => {
    const { addLead } = useData();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const today = new Date().toISOString().split('T')[0];

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm<BookingFormData>({
        resolver: zodResolver(bookingSchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            isWhatsappSame: true,
            whatsapp: '',
            travelers: defaultTravelers || '2 Adults',
            date: defaultDate || ''
        }
    });

    const isWhatsappSame = watch('isWhatsappSame');

    useEffect(() => {
        if (isOpen) {
            reset({
                name: '',
                email: '',
                phone: '',
                isWhatsappSame: true,
                whatsapp: '',
                travelers: defaultTravelers || '2 Adults',
                date: defaultDate || ''
            });
        }
    }, [isOpen, defaultDate, defaultTravelers, reset]);

    const onSubmit = async (data: BookingFormData) => {
        setIsSubmitting(true);

        // Parse passenger counts
        const adultsMatch = data.travelers.match(/(\d+)\s*Adults?/i);
        const childrenMatch = data.travelers.match(/(\d+)\s*Child(ren)?/i);
        const infantsMatch = data.travelers.match(/(\d+)\s*Infants?/i);

        const paxAdult = adultsMatch ? parseInt(adultsMatch[1]) : 2;
        const paxChild = childrenMatch ? parseInt(childrenMatch[1]) : 0;
        const paxInfant = infantsMatch ? parseInt(infantsMatch[1]) : 0;

        // Scale potential value by passenger counts (excluding infants)
        const totalPax = paxAdult + paxChild;
        const baseRate = bookingType === 'Car' ? 3500 : bookingType === 'Bus' ? 1200 : bookingType === 'Train' ? 2500 : bookingType === 'Flight' ? 15000 : 8000;
        const potentialValue = baseRate * (totalPax > 0 ? totalPax : 1);

        const newLead: Lead = {
            id: `LD-${Date.now()}`,
            name: data.name,
            email: data.email,
            phone: data.phone,
            whatsapp: data.isWhatsappSame ? data.phone : data.whatsapp,
            isWhatsappSame: data.isWhatsappSame,
            location: origin || '',
            destination: destination || bookingDetails,
            type: bookingType,
            status: 'New',
            priority: 'Medium',
            potentialValue,
            addedOn: new Date().toISOString(),
            travelers: data.travelers,
            paxAdult,
            paxChild,
            paxInfant,
            budget: 'TBD',
            source: 'Website',
            preferences: `Request for ${bookingType}. Date: ${data.date}. Details: ${bookingDetails}`,
            avatarColor: 'bg-slate-100 text-slate-600',
            logs: [
                {
                    id: `log-${Date.now()}`,
                    type: 'System',
                    content: 'Inquiry submitted from Home Page',
                    timestamp: new Date().toISOString(),
                },
            ],
            partnerId: sessionStorage.getItem('shravya_partner_ref') || localStorage.getItem('shravya_ref_partner') || undefined,
        };

        addLead(newLead);
        toast.success('Request submitted! Our agent will contact you shortly.');
        reset();
        onClose();
        setIsSubmitting(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white dark:bg-[#1A2633] w-full max-w-md rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 ring-1 ring-white/10">
                {/* Fixed Header */}
                <div className="flex justify-between items-center px-6 py-5 md:px-8 md:py-6 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/20">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Request Quote</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1">Details</span>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {bookingType}: {bookingDetails}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <div className="space-y-1">
                            <label className="block text-xs font-bold uppercase text-slate-500 ml-1">Your Name</label>
                            <input
                                {...register('name')}
                                className={`w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium ${errors.name ? 'border-red-300 bg-red-50' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                                    }`}
                                placeholder="John Doe"
                            />
                            {errors.name && <p className="text-xs text-red-500 mt-1 ml-1">{errors.name.message}</p>}
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-bold uppercase text-slate-500 ml-1">Email Address</label>
                            <input
                                {...register('email')}
                                type="email"
                                className={`w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium ${errors.email ? 'border-red-300 bg-red-50' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                                    }`}
                                placeholder="john@example.com"
                            />
                            {errors.email && <p className="text-xs text-red-500 mt-1 ml-1">{errors.email.message}</p>}
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-bold uppercase text-slate-500 ml-1">Phone Number</label>
                            <input
                                {...register('phone')}
                                type="tel"
                                className={`w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium ${errors.phone ? 'border-red-300 bg-red-50' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                                    }`}
                                placeholder="+91 80109 55675"
                            />
                            {errors.phone && <p className="text-xs text-red-500 mt-1 ml-1">{errors.phone.message}</p>}
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-2 ml-1">
                                <input
                                    type="checkbox"
                                    id="isWhatsappSameBooking"
                                    {...register('isWhatsappSame')}
                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <label htmlFor="isWhatsappSameBooking" className="text-xs font-bold uppercase text-slate-500 cursor-pointer select-none">
                                    Same as WhatsApp Number
                                </label>
                            </div>
                        </div>

                        {!isWhatsappSame && (
                            <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
                                <label className="block text-xs font-bold uppercase text-slate-500 ml-1">WhatsApp Number</label>
                                <input
                                    {...register('whatsapp')}
                                    type="tel"
                                    className={`w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium ${errors.whatsapp ? 'border-red-300 bg-red-50' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                                        }`}
                                    placeholder="WhatsApp Number"
                                />
                                {errors.whatsapp && <p className="text-xs text-red-500 mt-1 ml-1">{errors.whatsapp.message}</p>}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="block text-xs font-bold uppercase text-slate-500 ml-1">Travelers</label>
                            <TravelerSelector
                                value={watch('travelers')}
                                onChange={(val) => setValue('travelers', val)}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-bold uppercase text-slate-500 ml-1">Travel Date</label>
                            <input
                                {...register('date')}
                                type="date"
                                min={today}
                                className={`w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium ${errors.date ? 'border-red-300 bg-red-50' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                                    }`}
                            />
                            {errors.date && <p className="text-xs text-red-500 mt-1 ml-1">{errors.date.message}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-xl shadow-primary/20 mt-4 hover:bg-primary-dark transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default QuickBookingModal;
