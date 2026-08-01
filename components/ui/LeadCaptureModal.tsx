import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { toast } from 'sonner';

interface LeadCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: string;
  defaultLocation?: string;
}

const CATEGORY_OPTIONS = [
  'Group Trips',
  'Customized Tour',
  'Honeymoon Special',
  'Trekking & Adventure',
  'International Gateway',
  'Domestic Holiday',
  'Corporate Travel',
  'Weekend Getaway',
];

const LOCATION_OPTIONS = [
  'Bali, Indonesia',
  'Himachal Pradesh',
  'Kashmir Valley',
  'Kerala Backwaters',
  'Leh Ladakh',
  'Spiti Valley',
  'Thailand',
  'Vietnam',
  'Singapore & Malaysia',
  'Maldives',
  'Meghalaya & North East',
  'Goa Beach Holiday',
  'Uttarakhand & Char Dham',
  'Andaman Islands',
  'Dubai, UAE',
  'Bhutan Kingdom',
];

export const LeadCaptureModal: React.FC<LeadCaptureModalProps> = ({
  isOpen,
  onClose,
  defaultCategory = '',
  defaultLocation = '',
}) => {
  const { addLead } = useData();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState(defaultCategory);
  const [location, setLocation] = useState(defaultLocation);
  const [whatsappConsent, setWhatsappConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      toast.error('Please enter your first name');
      return;
    }
    if (!phone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }
    if (!category) {
      toast.error('Please select what kind of trip you prefer');
      return;
    }

    setSubmitting(true);
    try {
      const fullPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

      const leadPayload = {
        name: fullName,
        email: email.trim() || undefined,
        phone: fullPhone,
        source: 'Bucket List Sale Popup',
        status: 'New',
        priority: 'High',
        location: location || 'Not Specified',
        notes: `[Bucket List Sale Popup] Trip Preference: ${category} | Destination: ${location || 'Any'} | WhatsApp Consent: ${whatsappConsent ? 'Yes' : 'No'}`,
      };

      await addLead(leadPayload as any);
      setSubmitted(true);
      toast.success('Thank you! Our travel expert will contact you shortly.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit inquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300">
      {/* Dark Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={handleResetAndClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[2.2rem] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.5)] border border-slate-200/80 dark:border-white/10 overflow-hidden flex flex-col md:flex-row my-auto">
        
        {/* Close Button (X) */}
        <button
          onClick={handleResetAndClose}
          className="absolute top-4 right-4 z-30 size-9 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-600 dark:text-white flex items-center justify-center transition-colors shadow-sm"
          aria-label="Close modal"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {/* Left Half: Custom Graphic Image Banner */}
        <div className="w-full md:w-[48%] relative bg-slate-950 flex items-center justify-center overflow-hidden min-h-[220px] md:min-h-[520px]">
          <img
            src="/bucket-list-sale-popup.jpg"
            alt="The Bucket List Sale - SHRAWELLO TravelHub"
            className="w-full h-full object-cover object-center"
          />
          {/* Subtle Ambient Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none md:hidden" />
        </div>

        {/* Right Half: Form Container */}
        <div className="w-full md:w-[52%] p-6 sm:p-8 flex flex-col justify-between bg-white dark:bg-slate-900">
          {submitted ? (
            <div className="py-12 px-4 text-center space-y-5 my-auto animate-in zoom-in-95 duration-300">
              <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                <span className="material-symbols-outlined text-[36px]">verified</span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Inquiry Received!
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-light max-w-xs mx-auto">
                  Our travel specialist will call or WhatsApp you in the next 15 minutes with customized trip quotes & exclusive discounts.
                </p>
              </div>
              <button
                onClick={handleResetAndClose}
                className="px-8 py-3 rounded-xl bg-[#C9732A] text-white font-bold text-sm shadow-lg hover:bg-[#b06120] transition-all"
              >
                Explore Destinations
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Plan Your Next Trip
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-light">
                  Get personalized itineraries & unlock up to ₹5000* off instantly.
                </p>
              </div>

              {/* First Name & Last Name Row */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="e.g. Rahul"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#C9732A]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="e.g. Sharma"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#C9732A]"
                  />
                </div>
              </div>

              {/* Email & Phone Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="rahul@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#C9732A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 overflow-hidden focus-within:border-[#C9732A]">
                    <span className="px-2.5 py-2.5 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-white/10 border-r border-slate-200 dark:border-white/10 flex items-center shrink-0">
                      🇮🇳 +91
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full px-3 py-2.5 bg-transparent text-slate-900 dark:text-white text-xs focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Trip Category Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  What kind of trip do you prefer? <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#C9732A]"
                  required
                >
                  <option value="" className="text-slate-400">Select a category</option>
                  {CATEGORY_OPTIONS.map(opt => (
                    <option key={opt} value={opt} className="text-slate-900 bg-white dark:bg-slate-900">
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Location Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Where do you want to go?
                </label>
                <select
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#C9732A]"
                >
                  <option value="" className="text-slate-400">Select A Location</option>
                  {LOCATION_OPTIONS.map(loc => (
                    <option key={loc} value={loc} className="text-slate-900 bg-white dark:bg-slate-900">
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              {/* WhatsApp Consent Checkbox */}
              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="whatsappConsent"
                  checked={whatsappConsent}
                  onChange={e => setWhatsappConsent(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-[#C9732A] focus:ring-[#C9732A]"
                />
                <label htmlFor="whatsappConsent" className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug cursor-pointer">
                  Keep me updated with offers, trips, and travel inspiration via email, SMS, and WhatsApp.
                </label>
              </div>

              {/* Action Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-[#C9732A] hover:bg-[#b06120] text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-[#C9732A]/30 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 mt-2"
              >
                {submitting ? (
                  <>
                    <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Let's Plan My Trip
                    <span className="material-symbols-outlined text-[18px]">send</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
