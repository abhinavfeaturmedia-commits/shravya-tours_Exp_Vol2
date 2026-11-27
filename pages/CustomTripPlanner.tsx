import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { SEO } from '../components/ui/SEO';
import { BrandDatePicker } from '../components/ui/BrandDatePicker';
import { BrandSelect } from '../components/ui/BrandSelect';
import { useData } from '../context/DataContext';
import { Lead } from '../types';
import { COMPANY_WHATSAPP, COMPANY_PHONE_DISPLAY } from '../src/lib/constants';
import { CURATED_DESTINATION_TILES, normalizeCategorySlug } from '../src/data/megaMenuCatalog';

const TRIP_CATEGORIES = [
  { id: 'domestic', label: 'Domestic Tour', icon: 'public', desc: 'India mountains, beaches & heritage' },
  { id: 'international', label: 'International', icon: 'flight_takeoff', desc: 'Visa, flights & curated overseas stays' },
  { id: 'honeymoon', label: 'Honeymoon', icon: 'favorite', desc: 'Romantic resorts, villas & candlelights' },
  { id: 'group', label: 'Group / Friends', icon: 'groups', desc: 'Backpacking, treks & group departures' },
  { id: 'family', label: 'Family Vacation', icon: 'family_restroom', desc: 'Comfort-first sightseeing & private cabs' },
];

const DURATION_OPTIONS = [
  '2 Nights / 3 Days',
  '3 Nights / 4 Days',
  '4 Nights / 5 Days',
  '5 Nights / 6 Days',
  '6 Nights / 7 Days',
  '7 Nights / 8 Days',
  '10+ Days Custom',
];

const HOTEL_TIERS = [
  { id: '3-Star Comfort', label: '3★ Comfort', sub: 'Clean, verified boutique stays' },
  { id: '4-Star Premium', label: '4★ Premium', sub: 'Top-rated resorts & breakfast' },
  { id: '5-Star Luxury', label: '5★ Luxury', sub: 'Signature hospitality & spas' },
  { id: 'Private Pool Villa', label: 'Private Villa', sub: 'Honeymoon suites & houseboats' },
];

const BUDGET_RANGES = [
  { label: '₹10,000 – ₹20,000 / person', value: 15000 },
  { label: '₹20,000 – ₹40,000 / person', value: 30000 },
  { label: '₹40,000 – ₹75,000 / person', value: 55000 },
  { label: '₹75,000+ Luxury Custom', value: 90000 },
];

const ADDON_EXPERIENCES = [
  'Private AC Cab & Chauffeur',
  'Flight / Train Tickets',
  'Candlelight Dinner & Decor',
  'Adventure Sports / Trekking',
  'Visa & Travel Insurance',
  'Pure Veg / Jain Meal Plan',
];

export const CustomTripPlanner: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { addLead } = useData();

  const initialCatParam = normalizeCategorySlug(searchParams.get('category'));
  const initialDestParam = searchParams.get('destination') || searchParams.get('search') || '';
  const initialPerkParam = searchParams.get('perk') || '';

  const [category, setCategory] = useState<string>(
    initialCatParam !== 'all' ? initialCatParam : 'domestic'
  );
  const [destination, setDestination] = useState(initialDestParam);
  const [departureCity, setDepartureCity] = useState('Pune / Mumbai');
  const [travelDate, setTravelDate] = useState('');
  const [duration, setDuration] = useState('5 Nights / 6 Days');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [hotelTier, setHotelTier] = useState('4-Star Premium');
  const [budgetIdx, setBudgetIdx] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<string[]>(['Private AC Cab & Chauffeur']);

  // Traveler Contact
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState(() =>
    initialPerkParam ? `Festive Perk Claimed: ${initialPerkParam}` : ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (initialDestParam) setDestination(initialDestParam);
    if (initialCatParam !== 'all') setCategory(initialCatParam);
    if (initialPerkParam) {
      setNotes((prev) => prev || `Festive Perk Claimed: ${initialPerkParam}`);
    }
  }, [initialDestParam, initialCatParam, initialPerkParam]);

  const suggestedDestinations = useMemo(() => {
    const filtered = CURATED_DESTINATION_TILES.filter((d) =>
      category === 'international'
        ? d.categories.includes('international')
        : category === 'honeymoon'
        ? d.categories.includes('honeymoon')
        : d.categories.includes('domestic')
    );
    return filtered.slice(0, 8);
  }, [category]);

  const toggleAddon = (addon: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addon) ? prev.filter((a) => a !== addon) : [...prev, addon]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) {
      toast.error('Please enter or select your dream destination');
      return;
    }
    if (!fullName.trim() || !phone.trim()) {
      toast.error('Please provide your name and phone number so our expert can send your itinerary');
      return;
    }

    setSubmitting(true);
    try {
      const budgetObj = BUDGET_RANGES[budgetIdx] || BUDGET_RANGES[1];
      const totalPax = adults + children;
      const estimatedValue = budgetObj.value * Math.max(1, totalPax);
      const refCode = `CUST-${Date.now().toString().slice(-6)}`;

      const summaryNote = [
        `Category: ${category.toUpperCase()}`,
        `From: ${departureCity}`,
        `Duration: ${duration}`,
        `Hotel: ${hotelTier}`,
        `Add-ons: ${selectedAddons.join(', ') || 'Standard'}`,
        notes.trim() ? `Special Requests: ${notes.trim()}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      const newLead: Lead = {
        id: refCode,
        name: fullName.trim(),
        email: email.trim() || 'custom-inquiry@shrawellotravels.com',
        phone: phone.trim(),
        whatsapp: phone.trim(),
        isWhatsappSame: true,
        location: departureCity,
        destination: destination.trim(),
        startDate: travelDate || undefined,
        travelers: `${adults} Adult(s)${children > 0 ? `, ${children} Child(ren)` : ''}`,
        paxAdult: adults,
        paxChild: children,
        budget: budgetObj.label,
        type: 'Custom Tour',
        status: 'New',
        priority: 'High',
        potentialValue: estimatedValue,
        addedOn: new Date().toISOString(),
        source: 'Custom Trip Planner',
        preferences: summaryNote,
        notes: summaryNote,
        logs: [],
      };

      await addLead(newLead);
      setSubmittedRef(refCode);
      toast.success('Custom trip request received! Our specialist will reach out shortly.');
    } catch (err: any) {
      toast.error(err?.message || 'Could not submit custom request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const whatsappShareUrl = useMemo(() => {
    const budgetObj = BUDGET_RANGES[budgetIdx] || BUDGET_RANGES[1];
    const msg = encodeURIComponent(
      `Hi SHRAWELLO Team! I want a Custom Tour Quote:\n` +
        `• Destination: ${destination || 'Open to suggestions'}\n` +
        `• Category: ${category}\n` +
        `• Departure: ${departureCity}\n` +
        `• Date: ${travelDate || 'Flexible'} (${duration})\n` +
        `• Travelers: ${adults} Adults, ${children} Children\n` +
        `• Stay: ${hotelTier} | Budget: ${budgetObj.label}\n` +
        `• Preferences: ${selectedAddons.join(', ') || 'None'}\n` +
        (fullName ? `• Name: ${fullName} (${phone})` : '')
    );
    return `https://wa.me/${COMPANY_WHATSAPP}?text=${msg}`;
  }, [destination, category, departureCity, travelDate, duration, adults, children, hotelTier, budgetIdx, selectedAddons, fullName, phone]);

  return (
    <>
      <SEO
        title="Custom Trip Planner | Tailor-Made Domestic & International Tours"
        description="Design your own personalized holiday itinerary with SHRAWELLO Travel Hub. Choose your destination, hotel tier, private cab, and budget for a free custom quote."
        canonical="https://shrawellotravels.com/customize"
      />

      <div className="min-h-screen bg-[#FBF7F0] dark:bg-[#0B1116] pt-24 md:pt-32 pb-20">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-10 md:mb-14">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-[0.2em] mb-4">
              <span className="material-symbols-outlined text-[15px]" aria-hidden="true">auto_awesome</span>
              100% Tailor-Made Itineraries
            </span>
            <h1 className="font-display text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.1] mb-3">
              Design Your <span className="text-primary italic">Customized</span> Dream Trip
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Tell us where you want to go and how you like to travel. Our destination specialists will craft a day-by-day proposal with transparent pricing.
            </p>
          </div>

          {submittedRef ? (
            <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 border border-slate-200 dark:border-slate-800 shadow-2xl text-center">
              <div className="size-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-4xl">check_circle</span>
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-primary mb-2">
                Reference #{submittedRef}
              </p>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-3">
                Your Custom Trip Brief is With Our Experts!
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base mb-8">
                We have saved your personalized requirements for <strong>{destination}</strong> ({duration}). Expect a detailed proposal on WhatsApp/Email shortly, or connect immediately below.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm shadow-lg transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                  <span>Fast-Track on WhatsApp</span>
                </a>
                <Link
                  to="/packages"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm hover:opacity-90 transition-all"
                >
                  <span>Browse Ready Packages</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setSubmittedRef(null)}
                  className="px-5 py-3.5 text-xs font-bold text-primary hover:underline"
                >
                  Plan Another Trip
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left 8 Columns: Interactive Trip Configurator */}
              <div className="lg:col-span-8 space-y-6">
                {/* Step 1: Category */}
                <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                  <h2 className="text-base font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="size-7 rounded-full bg-primary text-white text-xs flex items-center justify-center">1</span>
                    <span>Choose Travel Style</span>
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {TRIP_CATEGORIES.map((cat) => {
                      const active = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                            active
                              ? 'bg-primary/10 border-primary text-primary shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-primary/40'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
                            {cat.icon}
                          </span>
                          <span className="text-xs font-bold leading-tight">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Step 2: Destination & Dates */}
                <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
                  <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="size-7 rounded-full bg-primary text-white text-xs flex items-center justify-center">2</span>
                    <span>Destination, Dates & Travelers</span>
                  </h2>

                  {/* Quick Destination Picks */}
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-2">Popular picks (tap to select):</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedDestinations.map((tile) => {
                        const selected = destination.toLowerCase() === tile.name.toLowerCase();
                        return (
                          <button
                            key={tile.id}
                            type="button"
                            onClick={() => setDestination(tile.name)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                              selected
                                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-primary'
                            }`}
                          >
                            <span>{tile.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                        Destination(s) *
                      </label>
                      <input
                        type="text"
                        required
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="e.g. Kashmir, Bali, Kerala & Kanyakumari"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                        Departure City
                      </label>
                      <input
                        type="text"
                        value={departureCity}
                        onChange={(e) => setDepartureCity(e.target.value)}
                        placeholder="e.g. Pune, Mumbai, Delhi"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                        Preferred Travel Date
                      </label>
                      <BrandDatePicker
                        value={travelDate}
                        onChange={(e) => setTravelDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        placeholder="Select start date"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                        Trip Duration
                      </label>
                      <BrandSelect
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        labelText="Trip Duration"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm font-medium"
                      >
                        {DURATION_OPTIONS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </BrandSelect>
                    </div>
                  </div>

                  {/* Adults & Children Steppers */}
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700">
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-white">Adults</p>
                        <p className="text-[11px] text-slate-400">Age 12+ yrs</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAdults((v) => Math.max(1, v - 1))}
                          className="size-7 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-sm font-black">{adults}</span>
                        <button
                          type="button"
                          onClick={() => setAdults((v) => v + 1)}
                          className="size-7 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700">
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-white">Children</p>
                        <p className="text-[11px] text-slate-400">Below 12 yrs</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setChildren((v) => Math.max(0, v - 1))}
                          className="size-7 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-sm font-black">{children}</span>
                        <button
                          type="button"
                          onClick={() => setChildren((v) => v + 1)}
                          className="size-7 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Step 3: Hotel, Budget & Add-ons */}
                <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
                  <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="size-7 rounded-full bg-primary text-white text-xs flex items-center justify-center">3</span>
                    <span>Comfort Level, Budget & Add-ons</span>
                  </h2>

                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-2">Hotel & Stay Preference</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {HOTEL_TIERS.map((tier) => (
                        <button
                          key={tier.id}
                          type="button"
                          onClick={() => setHotelTier(tier.id)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            hotelTier === tier.id
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <p className="text-xs font-black">{tier.label}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{tier.sub}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-2">Target Per-Person Budget</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {BUDGET_RANGES.map((b, idx) => (
                        <button
                          key={b.label}
                          type="button"
                          onClick={() => setBudgetIdx(idx)}
                          className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                            budgetIdx === idx
                              ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-2">Include in Your Itinerary</p>
                    <div className="flex flex-wrap gap-2">
                      {ADDON_EXPERIENCES.map((addon) => {
                        const active = selectedAddons.includes(addon);
                        return (
                          <button
                            key={addon}
                            type="button"
                            onClick={() => toggleAddon(addon)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                              active
                                ? 'bg-accent text-white border-accent'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                              {active ? 'check' : 'add'}
                            </span>
                            <span>{addon}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>
              </div>

              {/* Right 4 Columns: Sticky Contact & Summary Card */}
              <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-5">
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-xl space-y-4">
                  <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                      Step 4 · Get Your Free Quote
                    </p>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                      Where should we send your plan?
                    </h3>
                  </div>

                  {/* Live Summary Pill */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Destination:</span>
                      <span className="font-bold text-slate-900 dark:text-white truncate max-w-[170px]">
                        {destination || 'Not selected yet'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Duration:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{duration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Travelers:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {adults} Adult{adults > 1 ? 's' : ''}{children > 0 ? `, ${children} Child` : ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Hotel Tier:</span>
                      <span className="font-bold text-primary">{hotelTier}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your name"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Phone / WhatsApp Number *
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
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Special Requests (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Anniversary surprise, specific sightseeing, flight timings..."
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 rounded-full bg-gradient-to-r from-primary to-orange-600 hover:from-primary-dark hover:to-orange-700 text-white font-black text-sm shadow-lg shadow-primary/25 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      send
                    </span>
                    <span>{submitting ? 'Submitting Request...' : 'Get Custom Itinerary'}</span>
                  </button>

                  <a
                    href={whatsappShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px] text-emerald-600" aria-hidden="true">
                      chat
                    </span>
                    <span>Or Share Brief on WhatsApp ({COMPANY_PHONE_DISPLAY})</span>
                  </a>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
};
