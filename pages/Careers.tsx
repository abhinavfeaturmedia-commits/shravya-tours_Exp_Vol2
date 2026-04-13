import React, { useEffect } from 'react';
import { SEO } from '../components/ui/SEO';

export const Careers: React.FC = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <>
            <SEO title="Careers | Shravya Tours & Travels" description="Join our team at Shravya Tours & Travels and help us deliver unforgettable travel experiences." />
            <div className="bg-slate-50 dark:bg-slate-900 min-h-screen py-24">
                <div className="container mx-auto px-6 max-w-4xl">
                    <div className="text-center mb-16 animate-in slide-in-from-bottom-5">
                        <span className="inline-block py-1 px-3 rounded-full bg-primary/10 text-primary font-bold text-sm tracking-wide uppercase mb-4">Join Us</span>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-6">Build the Future of Travel</h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400">At Shravya Tours & Travels, we are always looking for passionate individuals to join our team.</p>
                    </div>

                    {/* Open Positions */}
                    <div className="mb-20 animate-in slide-in-from-bottom-5 delay-100">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-4 mb-8">Open Positions</h2>
                        <div className="space-y-6">
                            {[
                                { title: 'Sales Executive', dept: 'Sales', type: 'Full-time', location: 'Pune HQ / Hybrid' },
                                { title: 'Tour Operator', dept: 'Operations', type: 'Full-time', location: 'Pune HQ' },
                                { title: 'Customer Support Rep', dept: 'Support', type: 'Full-time', location: 'Remote / Pune' }
                            ].map((job, i) => (
                                <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:shadow-md transition-all">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{job.title}</h3>
                                        <div className="flex flex-wrap gap-3 text-sm text-slate-500 font-medium">
                                            <span className="bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">{job.dept}</span>
                                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">schedule</span> {job.type}</span>
                                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">location_on</span> {job.location}</span>
                                        </div>
                                    </div>
                                    <a href={`mailto:toursshravya@gmail.com?subject=Application%20for%20${encodeURIComponent(job.title)}%20Role`} className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors whitespace-nowrap">Apply Now</a>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* General Application CTA */}
                    <div className="bg-gradient-to-br from-primary/90 to-primary p-10 rounded-3xl text-center text-white shadow-xl relative overflow-hidden animate-in slide-in-from-bottom-5 delay-200">
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 bg-white/10 w-64 h-64 rounded-full blur-3xl"></div>
                        <h2 className="text-3xl font-black mb-4 relative z-10">Don't see a perfect fit?</h2>
                        <p className="text-lg text-white/90 mb-8 relative z-10">We are always eager to meet talented professionals. Send us your resume and tell us how you can contribute to Shravya Tours.</p>
                        <a href="mailto:toursshravya@gmail.com?subject=General%20Application" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary font-black shadow-lg rounded-xl hover:bg-slate-50 hover:-translate-y-1 transition-all relative z-10">
                            <span className="material-symbols-outlined">mail</span> Send Open Application
                        </a>
                    </div>
                </div>
            </div>
        </>
    );
};
