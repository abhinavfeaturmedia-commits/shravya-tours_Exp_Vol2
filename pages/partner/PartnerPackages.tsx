import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartnerAuth } from '../../context/PartnerAuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const PartnerPackages: React.FC = () => {
  const navigate = useNavigate();
  const { partner } = usePartnerAuth();

  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filters state
  const [search, setSearch] = useState('');
  const [maxPrice, setMaxPrice] = useState(250000);
  const [duration, setDuration] = useState<number | null>(null);
  const [selectedTheme, setSelectedTheme] = useState('All');
  
  // Quick View Drawer state
  const [activePkg, setActivePkg] = useState<any | null>(null);
  const [copiedPkgId, setCopiedPkgId] = useState<string | null>(null);

  useEffect(() => {
    fetchActivePackages();
  }, []);

  const fetchActivePackages = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/crud/packages?eq_status=Active`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch packages');
      setPackages(data.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  // Derive dynamic list of themes from fetched packages
  const themes = useMemo(() => {
    const list = new Set<string>();
    packages.forEach(p => { if (p.theme) list.add(p.theme); });
    return ['All', ...Array.from(list)].sort();
  }, [packages]);

  // Max duration in active packages
  const maxDuration = useMemo(() => {
    if (packages.length === 0) return 15;
    return Math.max(15, ...packages.map(p => p.days || 0));
  }, [packages]);

  // Calculate commission for a package based on B2B rules (with overrides check)
  const calculateCommission = (pkg: any) => {
    if (!partner) return { amount: 0, type: 'Percentage', value: 0 };
    
    // Check for package-specific overrides
    const hasOverride = pkg.partner_commission_value !== null && pkg.partner_commission_value !== undefined;
    const commType = hasOverride ? pkg.partner_commission_type : partner.commissionType;
    const commValue = hasOverride ? Number(pkg.partner_commission_value) : Number(partner.commissionValue);

    let amount = 0;
    if (commType === 'Percentage') {
      amount = (Number(pkg.price) * commValue) / 100;
    } else {
      amount = commValue;
    }

    return {
      amount,
      type: commType,
      value: commValue,
      isOverride: hasOverride
    };
  };

  // Filter packages
  const filteredPackages = useMemo(() => {
    return packages.filter(pkg => {
      const matchesSearch = pkg.title.toLowerCase().includes(search.toLowerCase()) ||
                            (pkg.location || '').toLowerCase().includes(search.toLowerCase()) ||
                            (pkg.theme || '').toLowerCase().includes(search.toLowerCase());
      
      const priceVal = Number(pkg.price) || 0;
      const matchesPrice = maxPrice >= 250000 || priceVal <= maxPrice;

      const durationVal = Number(pkg.days) || 0;
      const matchesDuration = !duration || durationVal <= duration;

      const matchesTheme = selectedTheme === 'All' || pkg.theme === selectedTheme;

      return matchesSearch && matchesPrice && matchesDuration && matchesTheme;
    });
  }, [packages, search, maxPrice, duration, selectedTheme]);

  // Copy referral link with affiliate query tracking
  const copyReferralLink = (pkg: any) => {
    if (!partner) return;
    const referralUrl = `${window.location.origin}${window.location.pathname}#/packages/${pkg.id}?ref=${partner.id}`;
    navigator.clipboard.writeText(referralUrl);
    setCopiedPkgId(pkg.id);
    setTimeout(() => setCopiedPkgId(null), 2000);
  };

  // Navigate to Submit Lead page with pre-populated package values
  const referClient = (pkg: any) => {
    const commInfo = calculateCommission(pkg);
    const notes = `Referred by B2B Partner Portal for tour package: "${pkg.title}" (${pkg.days} Days).\nExpected Partner Commission: ${
      commInfo.type === 'Percentage' ? `${commInfo.value}% (Est. ₹${commInfo.amount.toLocaleString('en-IN')})` : `₹${commInfo.value} Flat`
    }`;

    const params = new URLSearchParams({
      packageId: pkg.id,
      destination: pkg.location || pkg.title,
      potentialValue: String(pkg.price),
      type: 'Tour',
      notes: notes
    });

    navigate(`/partner/leads/new?${params.toString()}`);
  };

  if (!partner) return null;

  return (
    <div className="space-y-8 max-w-6xl mx-auto relative min-h-[60vh]">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-violet-600/20 via-purple-600/10 to-indigo-600/20 border border-violet-500/20 rounded-3xl p-6 lg:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-violet-400 text-[28px]">travel_explore</span>
            Available Tour Packages
          </h1>
          <p className="text-white/50 text-sm mt-1">Browse standard itineraries, check your earnings, and refer clients to start earning commissions</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex flex-col items-end">
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Your Base Commission</span>
          <span className="text-lg font-black text-emerald-400 mt-0.5">
            {partner.commissionType === 'Percentage' ? `${partner.commissionValue}%` : `₹${partner.commissionValue} Flat`}
          </span>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Filters Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6 backdrop-blur-md h-fit">
          <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-violet-400 text-[18px]">tune</span> Filters
          </h3>

          {/* Search */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-white/50 uppercase">Search</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-[16px]">search</span>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tour, city..."
                className="w-full h-10 bg-white/10 border border-white/10 rounded-xl pl-9 pr-3 text-white placeholder:text-white/30 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* Theme Type */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-white/50 uppercase">Category</label>
            <select
              value={selectedTheme}
              onChange={e => setSelectedTheme(e.target.value)}
              className="w-full h-10 bg-slate-900 border border-white/10 rounded-xl px-3 text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              {themes.map(t => <option key={t} value={t}>{t === 'All' ? 'All Experiences' : t}</option>)}
            </select>
          </div>

          {/* Price Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-white/50 uppercase">Max Cost</label>
              <span className="font-black text-violet-400 bg-white/5 px-2 py-0.5 rounded">
                {maxPrice >= 250000 ? 'Any Price' : `₹${maxPrice.toLocaleString('en-IN')}`}
              </span>
            </div>
            <input
              type="range"
              min="10000"
              max="250000"
              step="10000"
              value={maxPrice}
              onChange={e => setMaxPrice(Number(e.target.value))}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-violet-500"
            />
          </div>

          {/* Duration Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-white/50 uppercase">Duration</label>
              <span className="font-black text-violet-400 bg-white/5 px-2 py-0.5 rounded">
                {!duration ? 'All Durations' : `Up to ${duration} Days`}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max={maxDuration}
              value={duration || maxDuration}
              onChange={e => {
                const val = Number(e.target.value);
                setDuration(val >= maxDuration ? null : val);
              }}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-violet-500"
            />
          </div>

          <button
            onClick={() => { setSearch(''); setMaxPrice(250000); setDuration(null); setSelectedTheme('All'); }}
            className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl text-xs font-bold border border-white/10 transition-colors"
          >
            Clear Filters
          </button>
        </aside>

        {/* Packages Grid */}
        <main className="flex-grow">
          {loading ? (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-16 flex flex-col items-center justify-center gap-3">
              <div className="size-10 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
              <p className="text-white/40 text-xs font-semibold">Loading Packages Catalog...</p>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-6 rounded-3xl flex items-center gap-3">
              <span className="material-symbols-outlined text-[24px]">error</span>
              <p className="text-sm font-semibold">{error}</p>
            </div>
          ) : filteredPackages.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-3xl py-20 text-center">
              <span className="material-symbols-outlined text-4xl text-white/20 block mb-3">travel_explore</span>
              <p className="text-white/40 font-bold text-base">No Packages Found</p>
              <p className="text-white/25 text-xs mt-1">Try resetting or loosening your search filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredPackages.map(pkg => {
                const comm = calculateCommission(pkg);
                return (
                  <div
                    key={pkg.id}
                    className="bg-white/5 border border-white/10 rounded-[2.2rem] overflow-hidden backdrop-blur-md hover:border-white/20 transition-all duration-300 flex flex-col group hover:-translate-y-1 hover:shadow-xl hover:shadow-black/25 relative"
                  >
                    {/* Image Header */}
                    <div className="relative h-56 w-full overflow-hidden shrink-0">
                      {/* Top Badges */}
                      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
                        {pkg.tag && (
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg shadow ${pkg.tagColor || 'bg-white/95 text-slate-900'}`}>
                            {pkg.tag}
                          </span>
                        )}
                        {pkg.remainingSeats && pkg.remainingSeats <= 8 && (
                          <span className="bg-red-500/90 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg shadow flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px] animate-pulse">local_fire_department</span>
                            {pkg.remainingSeats} Seats Left
                          </span>
                        )}
                      </div>

                      {/* Right Duration Badge */}
                      <span className="absolute top-4 right-4 z-10 bg-black/40 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-full border border-white/10">
                        {pkg.days} Days / {pkg.days - 1} Nights
                      </span>

                      {/* Dynamic Commission Earning Ribbon */}
                      <div className="absolute bottom-4 left-4 z-10 bg-emerald-500/90 backdrop-blur text-white px-3 py-1.5 rounded-xl border border-emerald-400/30 flex items-center gap-1.5 shadow-lg shadow-emerald-950/20">
                        <span className="material-symbols-outlined text-[16px]">payments</span>
                        <span className="text-[11px] font-bold tracking-tight uppercase">Earnings:</span>
                        <span className="text-xs font-black">
                          + ₹{comm.amount.toLocaleString('en-IN')}
                        </span>
                        {comm.isOverride && (
                          <span className="text-[8px] bg-white/25 px-1 py-0.5 rounded font-black tracking-wider uppercase ml-1 animate-pulse">OVERRIDE</span>
                        )}
                      </div>

                      <img
                        src={pkg.image || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800'}
                        alt={pkg.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out grayscale-[10%]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    </div>

                    {/* Content Section */}
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest block">{pkg.theme || 'Standard Tour'}</span>
                        <h3 className="text-lg font-black text-white leading-snug truncate">{pkg.title}</h3>
                        <p className="text-white/60 text-xs line-clamp-2 leading-relaxed font-medium">{pkg.description}</p>
                      </div>

                      {/* Pricing Footer */}
                      <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-4">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-white/40 uppercase tracking-wider block font-bold">Standard Cost</span>
                          <span className="text-base font-black text-white">
                            ₹{Number(pkg.price).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {/* Copy Link Button */}
                          <button
                            onClick={() => copyReferralLink(pkg)}
                            className="h-9 px-3 bg-white/5 hover:bg-white/10 text-white rounded-xl flex items-center justify-center border border-white/10 transition-all hover:scale-105 active:scale-95"
                            title="Copy shareable affiliate link"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {copiedPkgId === pkg.id ? 'check_circle' : 'link'}
                            </span>
                            {copiedPkgId === pkg.id && (
                              <span className="text-[10px] font-bold ml-1 text-emerald-400">Copied</span>
                            )}
                          </button>

                          {/* Quick View */}
                          <button
                            onClick={() => setActivePkg(pkg)}
                            className="h-9 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold border border-white/10 transition-all"
                          >
                            Quick View
                          </button>

                          {/* Refer Client */}
                          <button
                            onClick={() => referClient(pkg)}
                            className="h-9 px-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow shadow-violet-600/25 transition-all hover:scale-105 active:scale-95"
                          >
                            Refer Client
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Flyout Drawer for Itinerary / Quick View (Right Side Panel) */}
      {activePkg && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          {/* Drawer Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
            onClick={() => setActivePkg(null)}
          />

          {/* Drawer Card */}
          <div className="relative w-full max-w-xl bg-slate-900 border-l border-white/15 h-full flex flex-col z-10 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-slate-950/40">
              <div>
                <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest block">{activePkg.theme}</span>
                <h2 className="text-xl font-black text-white leading-tight">{activePkg.title}</h2>
              </div>
              <button
                onClick={() => setActivePkg(null)}
                className="size-9 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center border border-white/10 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Cover Image */}
              <div className="h-56 rounded-2xl overflow-hidden relative shrink-0 border border-white/10">
                <img
                  src={activePkg.image || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800'}
                  alt={activePkg.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                <div className="absolute bottom-4 left-4 flex gap-4 text-xs font-bold text-white">
                  <span className="bg-black/30 backdrop-blur-md px-3 py-1 rounded-lg flex items-center gap-1 border border-white/10">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    {activePkg.days} Days / {activePkg.days - 1} Nights
                  </span>
                  <span className="bg-black/30 backdrop-blur-md px-3 py-1 rounded-lg flex items-center gap-1 border border-white/10">
                    <span className="material-symbols-outlined text-[14px]">payments</span>
                    ₹{Number(activePkg.price).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Commission Earnings Details */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <span className="material-symbols-outlined">payments</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Your Referral Earnings</h4>
                    <p className="text-white/40 text-[11px]">Dynamic calculation based on package override rules</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-emerald-400">
                    + ₹{calculateCommission(activePkg).amount.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-white/30">
                    {calculateCommission(activePkg).isOverride ? 'Special override rate' : 'Standard flat/percentage'}
                  </p>
                </div>
              </div>

              {/* Overview */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest">Overview</h4>
                <p className="text-white/70 text-sm leading-relaxed">{activePkg.overview || activePkg.description}</p>
              </div>

              {/* Highlights (if any) */}
              {activePkg.highlights && activePkg.highlights.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest">Tour Highlights</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activePkg.highlights.map((h: any, i: number) => (
                      <div key={i} className="flex items-center gap-2.5 bg-white/5 border border-white/5 p-3 rounded-xl">
                        <span className="material-symbols-outlined text-violet-400 text-[18px]">
                          {h.icon || 'star'}
                        </span>
                        <span className="text-white/80 text-xs font-semibold">{h.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Day-by-Day Itinerary */}
              {activePkg.itinerary && activePkg.itinerary.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest">Itinerary Details</h4>
                  <div className="relative border-l border-white/10 pl-5 ml-2.5 space-y-6">
                    {activePkg.itinerary.map((day: any) => (
                      <div key={day.day} className="relative">
                        {/* Day Bullet Icon */}
                        <div className="absolute -left-[30px] top-0 size-5 rounded-full bg-violet-600 border-4 border-slate-900 flex items-center justify-center text-[8px] font-black text-white shadow-lg" />
                        
                        <div className="space-y-1">
                          <h5 className="font-black text-white text-sm">
                            Day {day.day}: {day.title}
                          </h5>
                          <p className="text-white/60 text-xs leading-relaxed font-medium">
                            {day.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inclusions & Exclusions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {activePkg.included && activePkg.included.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span> Inclusions
                    </h4>
                    <ul className="space-y-1.5">
                      {activePkg.included.map((item: string, i: number) => (
                        <li key={i} className="text-white/70 text-xs font-medium flex items-start gap-1.5 leading-snug">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {activePkg.notIncluded && activePkg.notIncluded.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">cancel</span> Exclusions
                    </h4>
                    <ul className="space-y-1.5">
                      {activePkg.notIncluded.map((item: string, i: number) => (
                        <li key={i} className="text-white/70 text-xs font-medium flex items-start gap-1.5 leading-snug">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Terms and Conditions */}
              {activePkg.terms_and_conditions && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest">Custom Terms & Conditions</h4>
                  <p className="text-white/50 text-xs leading-relaxed italic">{activePkg.terms_and_conditions}</p>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="p-6 border-t border-white/10 bg-slate-950/40 shrink-0 flex items-center gap-3">
              <button
                onClick={() => { const p = activePkg; setActivePkg(null); referClient(p); }}
                className="flex-1 h-11 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                Refer Client & Earn
              </button>
              <button
                onClick={() => copyReferralLink(activePkg)}
                className="h-11 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 flex items-center justify-center gap-1.5 text-xs font-bold transition-all"
              >
                <span className="material-symbols-outlined">
                  {copiedPkgId === activePkg.id ? 'check_circle' : 'link'}
                </span>
                {copiedPkgId === activePkg.id ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
