import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Lead } from '../../types';
import { useData } from '../../context/DataContext';
import { toast } from '../ui/Toast';
import { COMPANY_WHATSAPP } from '../../src/lib/constants';

const whatsappSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().optional(),
});

type WhatsAppFormData = z.infer<typeof whatsappSchema>;

interface WhatsAppModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ isOpen, onClose }) => {
    const { addLead } = useData();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<WhatsAppFormData>({
        resolver: zodResolver(whatsappSchema),
    });

    const onSubmit = async (data: WhatsAppFormData) => {
        setIsSubmitting(true);

        const newLead: Lead = {
            id: `LD-WA-${Date.now()}`,
            name: data.name,
            email: 'N/A', // Not required for WhatsApp quick chat
            phone: data.phone || 'N/A',
            whatsapp: data.phone || 'N/A', // Assume same if provided
            isWhatsappSame: true,
            destination: 'General Inquiry',
            type: 'WhatsApp',
            status: 'New',
            priority: 'Medium',
            potentialValue: 0,
            addedOn: new Date().toISOString(),
            travelers: 'N/A',
            budget: 'TBD',
            source: 'Direct WhatsApp Enquiry',
            preferences: 'Started WhatsApp Chat',
            avatarColor: 'bg-green-100 text-green-600',
            logs: [
                {
                    id: `log-${Date.now()}`,
                    type: 'WhatsApp',
                    content: 'User started a WhatsApp chat from the website.',
                    timestamp: new Date().toISOString(),
                },
            ],
        };

        addLead(newLead);
        toast.success('Redirecting to WhatsApp...');

        // Small delay to allow toast to show and state to update
        setTimeout(() => {
            window.open(`https://wa.me/${COMPANY_WHATSAPP}?text=Hi, I am interested in SHRAWELLO Travel Hub services. My name is ${data.name}.`, '_blank');
            onClose();
            setIsSubmitting(false);
        }, 1500);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white dark:bg-[#1A2633] w-full max-w-sm rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 ring-1 ring-white/10">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="size-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                            <span className="material-symbols-outlined text-xl">chat</span> {/* Using generic chat icon or explicit whatsapp icon if available in font */}
                        </div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Chat on WhatsApp</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">
                    Please enter your name to start the chat. Our Travel Expert will assist you shortly.
                </p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-1">
                        <label className="block text-xs font-bold uppercase text-slate-500 ml-1">Your Name <span className="text-red-500">*</span></label>
                        <input
                            {...register('name')}
                            className={`w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all font-medium ${errors.name ? 'border-red-300 bg-red-50' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                                }`}
                            placeholder="John Doe"
                        />
                        {errors.name && <p className="text-xs text-red-500 mt-1 ml-1">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-1">
                        <label className="block text-xs font-bold uppercase text-slate-500 ml-1">Phone Number <span className="text-xs normal-case font-normal opacity-70">(Optional)</span></label>
                        <input
                            {...register('phone')}
                            type="tel"
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all font-medium"
                            placeholder="+91"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-[#25D366] text-white font-bold rounded-xl shadow-xl shadow-green-500/20 mt-2 hover:bg-[#20bd5a] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? 'Starting Chat...' : 'Start Chat'}
                        <span className="material-symbols-outlined text-lg">open_in_new</span>
                    </button>
                </form>
            </div>
        </div>
    );
};
