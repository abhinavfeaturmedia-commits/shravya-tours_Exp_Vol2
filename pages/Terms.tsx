import React, { useEffect } from 'react';

export const Terms: React.FC = () => {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 md:p-12 border border-slate-100 dark:border-slate-800">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Website Terms and Conditions
          </h1>
          <p className="text-xl text-primary font-semibold">
            SHRAWELLO Travel Hub
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-slate-600 dark:text-slate-300 leading-relaxed">
          
          <div className="p-6 bg-primary/5 rounded-xl border border-primary/10">
            <p className="font-medium text-slate-700 dark:text-slate-200">
              By accessing or using this website, you agree to comply with and be bound by the following Terms and Conditions. If you do not agree with any part of these terms, please refrain from using our website and services.
            </p>
          </div>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-3">
              <span className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
              Introduction
            </h2>
            <p>
              SHRAWELLO Travel Hub (“Company”, “We”, “Us”, “Our”) provides travel-related services including airline ticket booking, hotel reservations, taxi/cab services, and domestic and international tour packages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-3">
              <span className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
              Use of Website
            </h2>
            <ul className="list-disc pl-14 space-y-2 marker:text-primary">
              <li>The content on this website is for general information purposes only.</li>
              <li>Unauthorized use of this website may result in legal action.</li>
              <li>Users must not misuse, interfere with, or attempt to damage the website.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-3">
              <span className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
              Services
            </h2>
            <ul className="list-disc pl-14 space-y-2 marker:text-primary">
              <li>We act as a facilitator between customers and third-party service providers such as airlines, hotels, transport operators, and tour organizers.</li>
              <li>All services are subject to availability and the terms of respective service providers.</li>
              <li>We are not responsible for any changes, delays, or cancellations by third parties.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-3">
              <span className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">4</span>
              Bookings & Payments
            </h2>
            <ul className="list-disc pl-14 space-y-2 marker:text-primary">
              <li>Bookings are confirmed only after receipt of required payment.</li>
              <li>Prices may change due to availability, taxes, or supplier policies.</li>
              <li>Payment once made is subject to cancellation and refund policies applicable at the time of booking.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-3">
              <span className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">5</span>
              Cancellations & Refunds
            </h2>
            <ul className="list-disc pl-14 space-y-2 marker:text-primary">
              <li>Cancellation and refund rules vary depending on the service provider.</li>
              <li>Service fees, convenience charges, or taxes may be non-refundable.</li>
              <li>Refund timelines depend on third-party processing and banking channels.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-3">
              <span className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">6</span>
              Customer Responsibilities
            </h2>
            <ul className="list-disc pl-14 space-y-2 marker:text-primary">
              <li>Customers must provide accurate personal and travel details.</li>
              <li>Valid travel documents such as ID proof, passport, visa, and permits are the customer’s responsibility.</li>
              <li>The Company shall not be liable for losses caused due to incorrect information provided by the customer.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-3">
              <span className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">7</span>
              Limitation of Liability
            </h2>
            <p className="mb-2 pl-11">SHRAWELLO Travel Hub shall not be responsible for:</p>
            <ul className="list-disc pl-14 space-y-2 marker:text-primary">
              <li>Loss, injury, delay, or inconvenience caused by third-party service providers.</li>
              <li>Natural calamities, government restrictions, strikes, or unforeseen events.</li>
              <li>Loss of personal belongings, baggage, or travel documents.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-3">
              <span className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">8</span>
              Intellectual Property
            </h2>
            <p className="pl-11">
              All content, text, logos, graphics, and materials on this website are the property of SHRAWELLO Travel Hub and may not be used without prior written permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-3">
              <span className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">9</span>
              Privacy Policy
            </h2>
            <p className="pl-11">
              Use of this website is also governed by our Privacy Policy regarding the collection and use of personal information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-3">
              <span className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">10</span>
              Force Majeure
            </h2>
            <p className="pl-11">
              The Company shall not be liable for failure to perform obligations due to events beyond its control, including natural disasters, pandemics, technical issues, or government actions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-3">
              <span className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">11</span>
              Governing Law & Jurisdiction
            </h2>
            <p className="pl-11">
              These Terms and Conditions shall be governed by and interpreted in accordance with the laws of India. Any disputes shall be subject to the jurisdiction of Indian courts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-3">
              <span className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">12</span>
              Contact Information
            </h2>
            <p className="pl-11">
              For any queries related to these Terms and Conditions, please contact SHRAWELLO Travel Hub through the details provided on the website.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
};
