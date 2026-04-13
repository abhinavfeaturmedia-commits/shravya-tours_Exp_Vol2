import React, { useEffect } from 'react';
import { SEO } from '../components/ui/SEO';
import { OptimizedImage } from '../components/ui/OptimizedImage';

export const About: React.FC = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const goals = [
        {
            title: "Customer Satisfaction",
            icon: "sentiment_satisfied",
            description: "Deliver exceptional travel experiences that exceed customer expectations, ensuring repeat business, long-term relationships, and positive referrals."
        },
        {
            title: "Innovative Travel Solutions",
            icon: "lightbulb",
            description: "Leverage technology to enhance the customer experience through streamlined bookings, personalized itineraries, and unique, value-driven travel offerings."
        },
        {
            title: "Brand Recognition",
            icon: "verified",
            description: "Establish Shravya Tours & Travels as a trusted and preferred travel brand, recognized for quality, reliability, and customer-centric services."
        },
        {
            title: "Partnership Development",
            icon: "handshake",
            description: "Build strong and lasting relationships with hotels, corporate companies, destination management companies, and local authorities to create mutually beneficial travel solutions."
        }
    ];

    return (
        <>
            <SEO
                title="About Us | Shravya Tours & Travels"
                description="Shravya Tours & Travels is a trusted travel company dedicated to creating memorable and personalized travel experiences."
            />

            <div className="bg-slate-50 dark:bg-slate-900 min-h-screen pb-20">
                {/* Hero */}
                <div className="relative h-[400px] flex items-center justify-center text-center px-4">
                    <div className="absolute inset-0 bg-slate-900">
                        <OptimizedImage
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuARvjLJnqBIV09joV5MO4NCFRzmlZ-bbKPc1eoo9A-7TudM37NfT7pwyGWL8SKJsQz3haG3HdOgcYWr0HVXVNhbu-XiaBbvV4rMCx3NcCaiO_eQ9LFJTA69YLnPbsJXp1whEaBMmP7FgfhDhOwfAv7ROqrGj1TfqED1pPb7-eTzxh__HuN-lLTZS3TO3mcaIG5lzHVZPM1aXZvTKyaczGqk0y5JxmYFFC_g3Cd0BZqrPEKe1q-DM-6kkxWzTfUU1rbC62qVacapPJrT"
                            alt="About Shravya Tours"
                            className="w-full h-full opacity-40 object-cover"
                        />
                    </div>
                    <div className="relative z-10 max-w-4xl">
                        <h1 className="text-4xl md:text-6xl font-black text-white mb-6">About Shravya Tours & Travels</h1>
                        <p className="text-lg md:text-xl text-slate-200">Creating memorable and personalized travel experiences since 2023.</p>
                    </div>
                </div>

                <div className="container mx-auto px-6 -mt-20 relative z-20">

                    {/* Introduction Card */}
                    <div className="bg-white dark:bg-slate-800 p-8 md:p-12 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 mb-20">
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-6">Who We Are</h2>
                        <div className="space-y-6 text-slate-600 dark:text-slate-300 leading-relaxed text-lg">
                            <p>
                                Shravya Tours & Travels is a trusted travel company dedicated to creating memorable and personalized travel experiences. With a strong focus on comfort, safety, and customer satisfaction, we deliver seamless travel solutions tailored to every journey.
                            </p>
                            <p>
                                We offer Airline ticketing, Hotel bookings, Taxi/Cab services, and customized Tour Packages through our website, ensuring a smooth, reliable, and hassle-free booking experience for our customers.
                            </p>
                            <p>
                                Established in 2023, Shravya Tours & Travels has quickly earned a reputation for providing best-in-class travel and tour services, backed by professional standards and dependable operations.
                            </p>
                            <div className="bg-primary/5 p-6 rounded-xl border-l-4 border-primary mt-8">
                                <p className="font-medium text-slate-800 dark:text-slate-200">
                                    We are proudly associated with <strong>100+ taxi operators</strong>, <strong>20+ DMCs</strong>, and reliable flight & hotel booking APIs across India. Currently, we serve customers extensively in the Maharashtra region, offering domestic and international tour packages along with complete travel solutions.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Goals Section */}
                    <div className="mb-20">
                        <div className="text-center mb-12">
                            <span className="inline-block py-1 px-3 rounded-full bg-primary/10 text-primary font-bold text-sm tracking-wide uppercase mb-4">Our Focus</span>
                            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">Our Goals</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {goals.map((goal, i) => (
                                <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 hover:-translate-y-1 transition-transform duration-300">
                                    <div className="size-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                                        <span className="material-symbols-outlined">{goal.icon}</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{goal.title}</h3>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{goal.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Mission & Vision */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                        {/* Mission */}
                        <div className="bg-gradient-to-br from-primary/90 to-primary p-8 md:p-10 rounded-3xl shadow-xl text-white relative overflow-hidden group">
                            <div className="absolute top-0 right-0 -mr-16 -mt-16 bg-white/10 w-64 h-64 rounded-full blur-3xl group-hover:bg-white/20 transition-colors duration-500"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-6">
                                    <span className="material-symbols-outlined text-4xl bg-white/20 p-3 rounded-full">flag</span>
                                    <h2 className="text-3xl font-black">Our Mission</h2>
                                </div>
                                <p className="text-white/90 text-lg leading-relaxed font-medium">
                                    To provide reliable, safe, and high-quality travel services by offering personalized solutions, seamless travel arrangements, and responsible tourism practices, ensuring customer satisfaction and long-term relationships.
                                </p>
                            </div>
                        </div>

                        {/* Vision */}
                        <div className="bg-white dark:bg-slate-800 p-8 md:p-10 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
                            <div className="absolute bottom-0 right-0 -mr-16 -mb-16 bg-primary/5 w-64 h-64 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-500"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-6">
                                    <span className="material-symbols-outlined text-4xl text-primary bg-primary/10 p-3 rounded-full">visibility</span>
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white">Our Vision</h2>
                                </div>
                                <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed font-medium">
                                    To emerge as a leading and trusted travel service provider in India, recognized for professionalism, innovation, and customer-centric travel solutions, while promoting sustainable and responsible tourism.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Team Section */}
                    <div className="mt-24 mb-10">
                        <div className="text-center mb-12">
                            <span className="inline-block py-1 px-3 rounded-full bg-primary/10 text-primary font-bold text-sm tracking-wide uppercase mb-4">Our People</span>
                            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">Meet Our Team</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {[
                                { role: 'Founder Director', name: 'Manali', icon: 'stars' },
                                { role: 'Managing Director', name: 'Rohit', icon: 'manage_accounts' },
                                { role: 'Finance Head', name: 'Akshay', icon: 'account_balance' },
                                { role: 'Sales Head', name: 'Sayali', icon: 'point_of_sale' },
                                { role: 'Operations Head', name: 'Ajinkya', icon: 'engineering' },
                                { role: 'Customer Care Head', name: 'Manali', icon: 'support_agent' },
                                { role: 'IT & Marketing Head', name: 'Abhinav', icon: 'campaign' },
                                { role: 'Fleet Manager', name: 'Dipak', icon: 'directions_car' },
                                { role: 'Sales Executive', name: 'Vacant', icon: 'person_add' },
                            ].map((member, i) => (
                                <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center hover:shadow-md transition-shadow">
                                    <div className="size-16 mx-auto bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-400 mb-4 border border-slate-100 dark:border-slate-800">
                                        <span className="material-symbols-outlined text-2xl">{member.icon}</span>
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">{member.name}</h3>
                                    <p className="text-sm font-bold tracking-wide text-primary uppercase">{member.role}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
};