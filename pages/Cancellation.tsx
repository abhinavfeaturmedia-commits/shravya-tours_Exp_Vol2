import React, { useEffect } from 'react';

export const Cancellation: React.FC = () => {
    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const sections = [
        {
            title: "General Cancellation Policy",
            content: (
                <ul className="list-disc pl-5 space-y-2">
                    <li>All cancellations must be requested in writing via email, WhatsApp, or through the booking channel used.</li>
                    <li>Cancellation requests will be processed only during business hours.</li>
                    <li>Cancellation charges, if any, are applicable as per supplier/partner policies.</li>
                </ul>
            )
        },
        {
            title: "Airline Tickets",
            content: (
                <ul className="list-disc pl-5 space-y-2">
                    <li>Airline ticket cancellations are governed by the respective airline’s fare rules.</li>
                    <li>Some tickets may be non-refundable or partially refundable.</li>
                    <li>Airline penalties, service charges, and government taxes (if applicable) will be deducted.</li>
                    <li>Refunds are processed within 7 days after receipt from the airline.</li>
                </ul>
            )
        },
        {
            title: "Hotel Bookings",
            content: (
                <ul className="list-disc pl-5 space-y-2">
                    <li>Hotel cancellation policies vary based on the hotel and rate plan.</li>
                    <li>Some bookings may be non-refundable.</li>
                    <li>Free cancellation (if applicable) is allowed only within the specified cancellation window.</li>
                    <li>No-show may attract 100% cancellation charges.</li>
                </ul>
            )
        },
        {
            title: "Tour Packages (Domestic & International)",
            content: (
                <>
                    <p className="mb-2">Cancellation charges for tour packages are as follows (unless otherwise mentioned):</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>More than 30 days before departure: Minimum 15% of total tour cost</li>
                        <li>15–30 days before departure: 30% of total tour cost</li>
                        <li>7–14 days before departure: 60% of total tour cost</li>
                        <li>Less than 7 days / No show: 100% of total tour cost</li>
                    </ul>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 italic">Note: Actual charges may vary depending on hotels, transport, airlines, and destination.</p>
                </>
            )
        },
        {
            title: "Cab / Taxi Services",
            content: (
                <ul className="list-disc pl-5 space-y-2">
                    <li>Local cab cancellations made less than 24 hours before pickup may attract 100% cancellation charges.</li>
                    <li>Airport transfers or outstation bookings cancelled on the same day may attract full or partial charges.</li>
                    <li>No-show or driver arrival without passenger confirmation may be treated as a cancellation.</li>
                </ul>
            )
        },
        {
            title: "Refund Policy",
            content: (
                <ul className="list-disc pl-5 space-y-2">
                    <li>If any refund approved by the company according to policies mentioned it will be credited to your account within 7 working days</li>
                </ul>
            )
        },
        {
            title: "Amendment Charges",
            content: (
                <ul className="list-disc pl-5 space-y-2">
                    <li>Changes to bookings (date, time, name, etc.) may attract amendment charges.</li>
                    <li>Amendments are subject to availability and supplier approval.</li>
                </ul>
            )
        },
        {
            title: "Force Majeure",
            content: "In case of events beyond control (natural calamities, government restrictions, strikes, pandemics, etc.), cancellation and refund policies will be subject to supplier rules, and SHRAWELLO Travel Hub shall not be held liable for additional compensation."
        },
        {
            title: "Company Rights",
            content: "SHRAWELLO Travel Hub reserve the right to modify or update this Cancellation Policy at any time without prior notice."
        }
    ];

    return (
        <div className="bg-slate-50 dark:bg-slate-950 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 md:p-12 border border-slate-100 dark:border-slate-800">

                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                        Cancellation Policy
                    </h1>
                    <p className="text-xl text-primary font-semibold">
                        SHRAWELLO Travel Hub
                    </p>
                </div>

                {/* Introduction */}
                <div className="mb-10 text-slate-600 dark:text-slate-300 leading-relaxed">
                    <div className="p-6 bg-primary/5 rounded-xl border border-primary/10">
                        <p className="font-medium text-slate-700 dark:text-slate-200">
                            At SHRAWELLO Travel Hub, we aim to provide transparent and fair cancellation terms. Cancellation charges vary depending on the type of service booked and the policies of third-party service providers.
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-8 text-slate-600 dark:text-slate-300 leading-relaxed">
                    {sections.map((section, index) => (
                        <section key={index} className="scroll-mt-20">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-3">
                                <span className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                                    {index + 1}
                                </span>
                                {section.title}
                            </h2>
                            <div className="pl-11">
                                {typeof section.content === 'string' ? (
                                    <p>{section.content}</p>
                                ) : (
                                    section.content
                                )}
                            </div>
                        </section>
                    ))}
                </div>

            </div>
        </div>
    );
};
