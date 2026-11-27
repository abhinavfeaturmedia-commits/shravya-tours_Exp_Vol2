import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { SEO } from '../components/ui/SEO';
import { BrandSelect } from '../components/ui/BrandSelect';
import { useData } from '../context/DataContext';
import { Lead } from '../types';
import { COMPANY_PHONE, COMPANY_PHONE_DISPLAY, COMPANY_WHATSAPP } from '../src/lib/constants';

const CORPORATE_PILLARS = [
  {
    icon: 'groups_3',
    title: 'Corporate Offsites & MICE',
    desc: 'End-to-end planning for annual conferences, leadership retreats, dealer meets, and team-building offsites across India & abroad.',
  },
  {
    icon: 'directions_car',
    title: '100+ Fleet & Airport Transfers',
    desc: 'Verified commercial Sedans, SUVs, Innova Crystas, and Luxury Tempo Travellers across Pune, Mumbai, Nagpur & statewide Maharashtra.',
  },
  {
    icon: 'flight_class',
    title: 'Executive Air & Hotel Desk',
    desc: '24/7 priority ticketing, corporate negotiated hotel rates, and instant itinerary modifications for business travelers.',
  },
  {
    icon: 'receipt_long',
    title: '100% GST-Compliant Billing',
    desc: 'Clean GST tax invoices, consolidated monthly corporate statements, and a dedicated account manager for your finance team.',
  },
];

const HUB_LINKS = [
  { city: 'Pune (HQ)', slug: 'pune', highlight: 'Hinjewadi, Magarpatta & Chakan IT Corridors' },
  { city: 'Mumbai', slug: 'mumbai', highlight: 'BKC, Lower Parel & Airport Executive Fleet' },
  { city: 'Nagpur', slug: 'nagpur', highlight: 'MIHAN & Central India Corporate Hub' },
  { city: 'Nashik', slug: 'nashik', highlight: 'MIDC & Vineyard Offsite Retreats' },
];

export const CorporateTravel: React.FC = () => {
  const { addLead } = useData();
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [requirementType, setRequirementType] = useState('Corporate Offsite / MICE');
  const [teamSize, setTeamSize] = useState('25 - 50 Employees');
  const [destination, setDestination] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !contactName.trim() || !phone.trim()) {
      toast.error('Please enter company name, contact person, and phone number');
      return;
    }

    setSubmitting(true);
    try {
      const refId = `CORP-${Date.now().toString().slice(-6)}`;
      const details = `[Corporate RFP] Company: ${companyName} | Service: ${requirementType} | Team Size: ${teamSize} | Notes: ${notes || 'N/A'}`;
      const newLead: Lead = {
        id: refId,
        name: `${contactName.trim()} (${companyName.trim()})`,
        email: email.trim() || 'corporate@shrawellotravels.com',
        phone: phone.trim(),
        whatsapp: phone.trim(),
        isWhatsappSame: true,
        destination: destination.trim() || 'Corporate / MICE Inquiry',
        travelers: teamSize,
        budget: 'Corporate Quote',
        type: 'Corporate Travel',
        status: 'New',
        priority: 'High',
        potentialValue: 150000,
        addedOn: new Date().toISOString(),
        source: 'Corporate Travel Page',
        preferences: details,
        notes: details,
        logs: [],
      };
      await addLead(newLead);
      setSubmitted(true);
      toast.success('Corporate inquiry submitted! Our B2B desk will contact you within 2 hours.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit corporate inquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SEO
        title="Corporate Travel, MICE Events & Executive Fleet"
        description="SHRAWELLO Travel Hub offers GST-compliant corporate travel, team offsites, MICE events, and 100+ commercial cabs across Pune, Mumbai & India."
        canonical="https://shrawellotravels.com/corporate"
      />

      <div className="min-h-screen bg-[#FBF7F0] dark:bg-[#0B1116] pt-24 md:pt-32 pb-20">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl space-y-16">
          {/* Hero */}
          <section className="relative rounded-[2.5rem] overflow-hidden bg-slate-900 text-white p-8 sm:p-12 md:p-16 shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1511578314322-379afb476865?w=1400&q=80&auto=format&fit=crop"
              alt="Corporate conference and MICE retreat"
              className="absolute inset-0 w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/80 to-slate-900/40" />

            <div className="relative z-10 max-w-3xl space-y-5">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 border border-primary/40 text-amber-300 text-xs font-black uppercase tracking-[0.2em]">
                <span className="material-symbols-outlined text-[15px]" aria-hidden="true">business_center</span>
                SHRAWELLO Corporate & MICE Desk
              </span>
              <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-black leading-[1.08] tracking-tight">
                Seamless Business Travel, <span className="text-[#F4A261] italic">Offsites</span> & Fleet.
              </h1>
              <p className="text-slate-200 text-sm sm:text-lg max-w-2xl leading-relaxed">
                From executive airport transfers and 100+ verified commercial cabs across Maharashtra to 200-guest annual offsites — managed by one dedicated B2B desk with full GST invoicing.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <a
                  href="#corporate-rfp"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-lg shadow-primary/30 transition-all"
                >
                  <span>Request Corporate Proposal</span>
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_downward</span>
                </a>
                <a
                  href={`tel:+91${COMPANY_PHONE}`}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 text-white font-bold text-sm backdrop-blur-md transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">call</span>
                  <span>B2B Desk: +91 {COMPANY_PHONE_DISPLAY}</span>
                </a>
              </div>
            </div>
          </section>

          {/* 4 Corporate Service Pillars */}
          <section>
            <div className="text-center max-w-2xl mx-auto mb-10">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-primary mb-2">
                Why Enterprises Choose Us
              </p>
              <h2 className="font-display text-2xl sm:text-4xl font-black text-slate-900 dark:text-white">
                Built for HR, Admin & Procurement Teams
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {CORPORATE_PILLARS.map((pillar) => (
                <div
                  key={pillar.title}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all"
                >
                  <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-[26px]" aria-hidden="true">
                      {pillar.icon}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mb-2">
                    {pillar.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Maharashtra Fleet Hubs */}
          <section className="bg-white dark:bg-slate-900 rounded-3xl p-7 sm:p-10 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-accent mb-1">
                  Regional Fleet Coverage
                </p>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  Maharashtra Corporate Hubs & Cabs
                </h2>
              </div>
              <Link
                to="/packages?category=corporate"
                className="text-sm font-bold text-primary hover:underline inline-flex items-center gap-1"
              >
                <span>Explore Corporate Packages</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {HUB_LINKS.map((hub) => (
                <Link
                  key={hub.slug}
                  to={`/travel-agency/${hub.slug}`}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 hover:border-primary transition-all group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-black text-slate-900 dark:text-white group-hover:text-primary">
                      {hub.city}
                    </span>
                    <span className="material-symbols-outlined text-[18px] text-slate-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all">
                      arrow_forward
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{hub.highlight}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* Corporate RFP / Proposal Form */}
          <section id="corporate-rfp" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-5">
              <span className="inline-block px-3.5 py-1 rounded-full bg-accent/10 text-accent text-xs font-black uppercase tracking-widest">
                Fast B2B Turnaround
              </span>
              <h2 className="font-display text-3xl font-black text-slate-900 dark:text-white leading-tight">
                Request a Corporate Quote or Fleet Rate Card
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Share your upcoming offsite destination, monthly cab needs, or MICE event dates. Our corporate team sends custom multi-option proposals within 2 business hours.
              </p>
              <div className="space-y-3 pt-2">
                {[
                  'Dedicated B2B Relationship Manager',
                  'Flexible corporate credit & GST invoices',
                  'GPS-tracked fleet & verified chauffeurs',
                ].map((point) => (
                  <div key={point} className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <span className="material-symbols-outlined text-accent text-[18px]" aria-hidden="true">
                      verified
                    </span>
                    <span>{point}</span>
                  </div>
                ))}
              </div>
              <a
                href={`https://wa.me/${COMPANY_WHATSAPP}?text=${encodeURIComponent('Hello SHRAWELLO Corporate Desk, we would like to discuss a corporate travel / MICE requirement.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#25D366] text-white font-bold text-xs shadow-md hover:opacity-95 transition-opacity"
              >
                <span className="material-symbols-outlined text-[16px]">chat</span>
                <span>Chat with Corporate Desk on WhatsApp</span>
              </a>
            </div>

            <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl">
              {submitted ? (
                <div className="text-center py-12 space-y-4">
                  <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-3xl">check</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">Proposal Request Received!</h3>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">
                    Our corporate travel specialist will reach out to <strong>{contactName}</strong> ({companyName}) shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="px-6 py-2.5 rounded-full bg-primary text-white text-xs font-bold"
                  >
                    Submit Another Request
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Acme Tech Pvt Ltd"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Contact Person *
                      </label>
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Phone / WhatsApp *
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Work Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="hr@company.com"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Service Required
                      </label>
                      <BrandSelect
                        value={requirementType}
                        onChange={(e) => setRequirementType(e.target.value)}
                        labelText="Service Required"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm"
                      >
                        <option>Corporate Offsite / MICE</option>
                        <option>Monthly Employee Cab Fleet</option>
                        <option>Executive Flight & Hotel Desk</option>
                        <option>Dealer / Channel Partner Tour</option>
                      </BrandSelect>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Estimated Group / Fleet Size
                      </label>
                      <BrandSelect
                        value={teamSize}
                        onChange={(e) => setTeamSize(e.target.value)}
                        labelText="Team Size"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm"
                      >
                        <option>10 - 25 Employees</option>
                        <option>25 - 50 Employees</option>
                        <option>50 - 150 Employees</option>
                        <option>150+ Enterprise Event</option>
                      </BrandSelect>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Preferred Destination / City
                    </label>
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="e.g. Goa, Lonavala, Dubai, Pune Airport Fleet"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Brief Requirements
                    </label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Conference hall setup, twin-sharing rooms, dates, pickup cities..."
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 rounded-full bg-gradient-to-r from-primary to-orange-600 hover:from-primary-dark hover:to-orange-700 text-white font-black text-sm shadow-lg shadow-primary/25 transition-all disabled:opacity-60"
                  >
                    {submitting ? 'Sending Corporate Request...' : 'Request Corporate Proposal'}
                  </button>
                </form>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
};
