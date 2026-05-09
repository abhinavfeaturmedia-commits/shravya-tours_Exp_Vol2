import React, { useEffect } from 'react';

export const Privacy: React.FC = () => {
    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const sections = [
        {
            title: "Information We Collect",
            content: (
                <>
                    <p className="mb-2">We may collect the following types of information:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-2">
                        <li>
                            <strong>Personal Information:</strong> Name, Contact details (mobile number, email address), Address, Identity details (as required for bookings), Travel preferences and booking details
                        </li>
                        <li>
                            <strong>Non-Personal Information:</strong> Browser type, IP address, Device information, Website usage data (pages visited, time spent)
                        </li>
                    </ul>
                </>
            )
        },
        {
            title: "How We Use Your Information",
            content: (
                <>
                    <p>We use collected information to:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Process bookings and travel services</li>
                        <li>Respond to enquiries and customer support requests</li>
                        <li>Communicate booking confirmations, updates, or offers</li>
                        <li>Improve website functionality and service quality</li>
                        <li>Comply with legal or regulatory requirements</li>
                    </ul>
                </>
            )
        },
        {
            title: "Information Sharing",
            content: (
                <>
                    <p className="mb-2">We may share your information only when necessary:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>With airlines, hotels, transport operators, and tour partners for booking fulfillment</li>
                        <li>With payment gateways for secure transactions</li>
                        <li>When required by law or government authorities</li>
                    </ul>
                    <p className="mt-2">We do not sell, rent, or trade personal information to third parties for marketing purposes.</p>
                </>
            )
        },
        {
            title: "Data Security",
            content: "We take reasonable measures to protect your personal information from unauthorized access, misuse, or disclosure. However, no internet transmission is completely secure, and we cannot guarantee absolute security."
        },
        {
            title: "Cookies",
            content: "Our website may use cookies to enhance user experience, analyze traffic, and improve services. You may choose to disable cookies through your browser settings."
        },
        {
            title: "Third-Party Links",
            content: "Our website may contain links to third-party websites. We are not responsible for the privacy practices or content of such external sites."
        },
        {
            title: "User Responsibilities",
            content: "Users are responsible for maintaining the confidentiality of their personal information and ensuring that the details provided are accurate and up to date."
        },
        {
            title: "Children’s Privacy",
            content: "Our services are not directed toward individuals under the age of 18. We do not knowingly collect personal information from minors."
        },
        {
            title: "Changes to This Policy",
            content: "SHRAWELLO Travel Hub reserves the right to update or modify this Privacy Policy at any time without prior notice. Changes will be effective upon posting on the website."
        },
        {
            title: "Governing Law",
            content: "This Privacy Policy shall be governed by and interpreted in accordance with the laws of India."
        },
        {
            title: "Contact Us",
            content: "For any questions or concerns regarding this Privacy Policy, please contact SHRAWELLO Travel Hub using the contact details available on our website."
        }
    ];

    return (
        <div className="bg-slate-50 dark:bg-slate-950 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 md:p-12 border border-slate-100 dark:border-slate-800">

                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                        Privacy Policy
                    </h1>
                    <p className="text-xl text-primary font-semibold">
                        SHRAWELLO Travel Hub
                    </p>
                </div>

                {/* Introduction */}
                <div className="mb-10 text-slate-600 dark:text-slate-300 leading-relaxed">
                    <div className="p-6 bg-primary/5 rounded-xl border border-primary/10">
                        <p className="font-medium text-slate-700 dark:text-slate-200">
                            SHRAWELLO Travel Hub (“We”, “Us”, “Our”) is committed to protecting the privacy of users who access our website and use our services. This Privacy Policy explains how we collect, use, disclose, and safeguard your information. By using our website and services, you agree to the terms of this Privacy Policy.
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
