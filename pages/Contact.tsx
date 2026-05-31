import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useData } from '../context/DataContext';
import { Lead } from '../types';
import { SEO } from '../components/ui/SEO';
import { toast } from '../components/ui/Toast';
import { COMPANY_EMAIL, COMPANY_PHONE_DISPLAY, COMPANY_ADDRESS } from '../src/lib/constants';

// Validation schema
const contactSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    phone: z.string().min(10, 'Phone must be at least 10 digits'),
    isWhatsappSame: z.boolean(),
    whatsapp: z.string().optional(),
    message: z.string().min(10, 'Message must be at least 10 characters'),
}).refine((data) => {
    if (!data.isWhatsappSame && (!data.whatsapp || data.whatsapp.length < 10)) {
        return false;
    }
    return true;
}, {
    message: "WhatsApp number is required when it's different from phone number",
    path: ["whatsapp"],
});

type ContactFormData = z.infer<typeof contactSchema>;

export const Contact: React.FC = () => {
    const { addLead } = useData();
    const [isSubmitted, setIsSubmitted] = useState(false);

    const { register, handleSubmit, watch, formState: { errors }, reset } = useForm<ContactFormData>({
        resolver: zodResolver(contactSchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            isWhatsappSame: true,
            whatsapp: '',
            message: ''
        }
    });

    const isWhatsappSame = watch('isWhatsappSame');

    const onSubmit = (data: ContactFormData) => {
        const newLead: Lead = {
            id: `CNT-${Date.now()}`,
            name: data.name,
            email: data.email,
            phone: data.phone,
            whatsapp: data.isWhatsappSame ? data.phone : data.whatsapp,
            isWhatsappSame: data.isWhatsappSame,
            destination: 'General Inquiry',
            type: 'Contact Form',
            status: 'New',
            priority: 'Medium',
            potentialValue: 0,
            addedOn: new Date().toISOString(),
            travelers: 'N/A',
            budget: 'N/A',
            source: 'Contact Page',
            preferences: data.message,
            avatarColor: 'bg-slate-100 text-slate-600',
            logs: []
        };
        addLead(newLead);
        setIsSubmitted(true);
        toast.success('Message sent successfully! We\'ll get back to you within 24 hours.');
    };

    const handleReset = () => {
        setIsSubmitted(false);
        reset();
    };

    return (
        <>
            <SEO
                title="Contact Us"
                description="Get in touch with SHRAWELLO Travel Hub and Events LLP. Whether you have a specific destination in mind or need inspiration, our travel experts are here to help plan your dream getaway."
            />

            <div className="bg-slate-50 dark:bg-[#0B1116] min-h-screen pt-24 md:pt-32 pb-20 relative overflow-hidden">

                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-400/5 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>

                <div className="container mx-auto px-6 max-w-7xl relative z-10">
                    <div className="text-center mb-16 md:mb-24 animate-in slide-in-from-bottom-10 duration-700">
                        <h1 className="text-4xl md:text-7xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">Let's Plan Your <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Dream Getaway.</span></h1>
                        <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">Whether you have a specific destination in mind or need inspiration, our experts are here to craft the perfect itinerary for you.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-start">
                        {/* Contact Info */}
                        <div className="space-y-10 animate-in slide-in-from-left-10 duration-700 delay-100">

                            <div className="space-y-8">
                                {[
                                    { icon: 'location_on', title: 'Headquarters', text: COMPANY_ADDRESS, color: 'blue' },
                                    { icon: 'call', title: 'Phone Support', text: COMPANY_PHONE_DISPLAY, color: 'green' },
                                    { icon: 'mail', title: 'Email Us', text: COMPANY_EMAIL, color: 'purple' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-start gap-6 group">
                                        <div className={`size-16 rounded-2xl bg-${item.color}-50 dark:bg-${item.color}-900/10 flex items-center justify-center text-${item.color}-600 dark:text-${item.color}-400 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                                            <span className="material-symbols-outlined text-3xl">{item.icon}</span>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                                            <p className="text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-line">{item.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-8 bg-white dark:bg-[#151d29] rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
                                <h4 className="font-bold text-slate-900 dark:text-white mb-4">Follow our journey</h4>
                                <div className="flex gap-4">
                                    {['public', 'photo_camera', 'play_circle'].map((icon, i) => (
                                        <button key={i} className="size-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-primary hover:text-white dark:hover:bg-primary dark:hover:text-white transition-all transform hover:-translate-y-1">
                                            <span className="material-symbols-outlined text-xl">{icon}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="relative animate-in slide-in-from-right-10 duration-700 delay-200">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-[2.5rem] rotate-3 opacity-20 blur-xl"></div>
                            <div className="relative bg-white/80 dark:bg-[#151d29]/80 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-slate-700/50">
                                {isSubmitted ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center py-20">
                                        <div className="size-24 bg-green-100 dark:bg-green-900/20 text-green-600 rounded-full flex items-center justify-center mb-8 animate-in zoom-in duration-500">
                                            <span className="material-symbols-outlined text-5xl">check</span>
                                        </div>
                                        <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Message Sent!</h3>
                                        <p className="text-slate-500 text-lg mb-8 max-w-xs mx-auto">Thank you for reaching out. Our team will get back to you within 24 hours.</p>
                                        <button onClick={handleReset} className="text-primary font-bold hover:underline flex items-center gap-2">
                                            <span className="material-symbols-outlined">refresh</span> Send another message
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Send a Message</h3>
                                        </div>
                                        <div className="space-y-6">
                                            <div className="relative group">
                                                <input
                                                    {...register('name')}
                                                    type="text"
                                                    className={`peer w-full bg-transparent border-b-2 ${errors.name ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} py-3 text-lg font-medium text-slate-900 dark:text-white focus:border-primary focus:outline-none transition-colors placeholder-transparent`}
                                                    placeholder="Name"
                                                    id="name"
                                                />
                                                <label htmlFor="name" className="absolute left-0 -top-3.5 text-xs font-bold text-slate-400 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-400 peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-xs peer-focus:text-primary">Your Name</label>
                                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                                            </div>
                                            <div className="relative group">
                                                <input
                                                    {...register('email')}
                                                    type="email"
                                                    className={`peer w-full bg-transparent border-b-2 ${errors.email ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} py-3 text-lg font-medium text-slate-900 dark:text-white focus:border-primary focus:outline-none transition-colors placeholder-transparent`}
                                                    placeholder="Email"
                                                    id="email"
                                                />
                                                <label htmlFor="email" className="absolute left-0 -top-3.5 text-xs font-bold text-slate-400 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-400 peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-xs peer-focus:text-primary">Email Address</label>
                                                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                                            </div>
                                            <div className="relative group">
                                                <input
                                                    {...register('phone')}
                                                    type="tel"
                                                    className={`peer w-full bg-transparent border-b-2 ${errors.phone ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} py-3 text-lg font-medium text-slate-900 dark:text-white focus:border-primary focus:outline-none transition-colors placeholder-transparent`}
                                                    placeholder="Phone"
                                                    id="phone"
                                                />
                                                <label htmlFor="phone" className="absolute left-0 -top-3.5 text-xs font-bold text-slate-400 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-400 peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-xs peer-focus:text-primary">Phone Number</label>
                                                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    id="isWhatsappSame"
                                                    {...register('isWhatsappSame')}
                                                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                                                />
                                                <label htmlFor="isWhatsappSame" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                                                    My WhatsApp number is the same as my phone number
                                                </label>
                                            </div>

                                            {!isWhatsappSame && (
                                                <div className="relative group animate-in fade-in slide-in-from-top-2">
                                                    <input
                                                        {...register('whatsapp')}
                                                        type="tel"
                                                        className={`peer w-full bg-transparent border-b-2 ${errors.whatsapp ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} py-3 text-lg font-medium text-slate-900 dark:text-white focus:border-primary focus:outline-none transition-colors placeholder-transparent`}
                                                        placeholder="WhatsApp"
                                                        id="whatsapp"
                                                    />
                                                    <label htmlFor="whatsapp" className="absolute left-0 -top-3.5 text-xs font-bold text-slate-400 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-400 peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-xs peer-focus:text-primary">WhatsApp Number</label>
                                                    {errors.whatsapp && <p className="text-red-500 text-xs mt-1">{errors.whatsapp.message}</p>}
                                                </div>
                                            )}

                                            <div className="relative group">
                                                <textarea
                                                    {...register('message')}
                                                    className={`peer w-full bg-transparent border-b-2 ${errors.message ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} py-3 text-lg font-medium text-slate-900 dark:text-white focus:border-primary focus:outline-none transition-colors placeholder-transparent resize-none h-32`}
                                                    placeholder="Message"
                                                    id="message"
                                                />
                                                <label htmlFor="message" className="absolute left-0 -top-3.5 text-xs font-bold text-slate-400 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-400 peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-xs peer-focus:text-primary">How can we help?</label>
                                                {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>}
                                            </div>
                                        </div>
                                        <button type="submit" className="w-full py-5 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/30 hover:bg-primary-dark transition-all transform hover:-translate-y-1 active:scale-95 text-lg">Send Message</button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};