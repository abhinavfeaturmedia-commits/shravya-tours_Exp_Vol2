import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { SEO } from '../components/ui/SEO';
import { OptimizedImage } from '../components/ui/OptimizedImage';
import { getLocationName, formatPriceCompact } from '../utils/packageUtils';
import { useCustomerAuth, CUSTOMER_JWT_KEY } from '../context/CustomerAuthContext';

export const Packages: React.FC = () => {
  const { packages, masterLocations, trendingDestinations } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const destinationId = searchParams.get('destinationId') || '';

  const { isAuthenticated } = useCustomerAuth();
  const navigate = useNavigate();
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  
  useEffect(() => {
    const fetchWishlistIds = async () => {
      if (!isAuthenticated) return;
      try {
        const token = localStorage.getItem(CUSTOMER_JWT_KEY);
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/customer/wishlist`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setWishlistIds(data.map((p: any) => p.id));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchWishlistIds();
  }, [isAuthenticated]);

  const handleToggleWishlist = async (e: React.MouseEvent, pkgId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/customer/login');
      return;
    }
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/customer/wishlist/toggle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ packageId: pkgId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.added) {
          setWishlistIds([...wishlistIds, pkgId]);
        } else {
          setWishlistIds(wishlistIds.filter(id => id !== pkgId));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Derive max duration dynamically from actual package data
  const maxDuration = useMemo(() => {
    if (packages.length === 0) return 15;
    return Math.max(15, ...packages.map(p => p.days || 0));
  }, [packages]);

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [priceRange, setPriceRange] = useState(200000);
  const [duration, setDuration] = useState<number | null>(null); // null = all
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState('Recommended');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Derive themes dynamically from live package data
  const availableThemes = useMemo(() =>
    [...new Set(packages.map(p => p.theme).filter((t): t is string => !!t))].sort()
  , [packages]);

  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
    setDebouncedSearch(searchParams.get('search') || '');
  }, [searchParams]);

  // Debounce search input so heavy filter runs only 250ms after user stops typing
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(value), 250);
  };

  const toggleTheme = (theme: string) => {
    if (selectedThemes.includes(theme)) {
      setSelectedThemes(selectedThemes.filter(t => t !== theme));
    } else {
      setSelectedThemes([...selectedThemes, theme]);
    }
  };

  const handleReset = () => {
    setPriceRange(200000);
    setDuration(null);
    setSelectedThemes([]);
    setSortOption('Recommended');
    setSearchQuery('');
    setDebouncedSearch('');
    setSearchParams({}); // clear URL ?search= param
  };

  // Filter + sort — memoized so they only recompute when inputs actually change
  const filteredPackages = useMemo(() => packages.filter(pkg => {
    if (pkg.status && pkg.status !== 'Active') return false;

    // Filter by destinationId
    if (destinationId) {
      const dest = trendingDestinations.find(d => d.id === destinationId);
      if (dest) {
        if (dest.packageIds && dest.packageIds.length > 0) {
          if (!dest.packageIds.includes(pkg.id)) return false;
        } else {
          // Fallback to location matching
          const resolvedLocation = getLocationName(pkg.location, masterLocations);
          const searchableContent = [
            pkg.title,
            resolvedLocation,
            pkg.location
          ].join(' ').toLowerCase();
          
          if (!searchableContent.includes(dest.name.toLowerCase())) return false;
        }
      }
    }

    // Price: bypass filter entirely when slider is at max
    const matchesPrice = priceRange >= 200000 || pkg.price <= priceRange;
    // Duration: bypass when slider is at max (or null = all)
    const effectiveDuration = duration ?? maxDuration;
    const matchesDuration = effectiveDuration >= maxDuration || pkg.days <= effectiveDuration;
    const matchesTheme = selectedThemes.length === 0 || (pkg.theme && selectedThemes.includes(pkg.theme));

    const terms = debouncedSearch.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const matchesSearch = terms.length === 0 || terms.every(term => {
      const resolvedLocation = getLocationName(pkg.location, masterLocations);
      const searchableContent = [
        pkg.title,
        resolvedLocation,
        pkg.location, // keep raw too for fallback
        pkg.description,
        pkg.theme,
        pkg.tag,
        pkg.overview,
        ...(pkg.highlights?.map(h => h.label) ?? [])
      ].join(' ').toLowerCase();
      return searchableContent.includes(term);
    });

    return matchesPrice && matchesDuration && matchesTheme && matchesSearch;
  }), [packages, priceRange, duration, maxDuration, selectedThemes, debouncedSearch, masterLocations, destinationId, trendingDestinations]);

  const sortedPackages = useMemo(() => [...filteredPackages].sort((a, b) => {
    if (sortOption === 'Price: Low to High') return a.price - b.price;
    if (sortOption === 'Price: High to Low') return b.price - a.price;
    if (sortOption === 'Duration') return a.days - b.days;
    // Recommended: prefer Active status, then sort by remainingSeats desc (scarcity)
    const activeA = a.status === 'Active' ? 0 : 1;
    const activeB = b.status === 'Active' ? 0 : 1;
    if (activeA !== activeB) return activeA - activeB;
    return (b.remainingSeats ?? 999) - (a.remainingSeats ?? 999);
  }), [filteredPackages, sortOption]);

  return (
    <>
      <SEO
        title="Tour Packages"
        description="Explore curated tour packages for the modern traveler. Find adventures, honeymoons, family trips, and more."
      />

      <div className="bg-slate-50 dark:bg-[#0B1116] min-h-screen pt-24 md:pt-28 pb-32 md:pb-20">

        <div className="container mx-auto px-4 md:px-8 relative">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 md:mb-16 animate-in slide-in-from-bottom-5 duration-700">
            <div className="max-w-2xl">
              <h1 className="font-display text-5xl md:text-7xl font-bold text-slate-900 dark:text-white tracking-tight leading-[1.05] mb-4 italic">
                Explore the <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Unseen World.</span>
              </h1>
              <p className="text-lg text-slate-500 dark:text-slate-400 font-light">Curated itineraries for the modern traveler. Find your next adventure below.</p>
            </div>

            {/* Desktop Sort */}
            <div className="hidden lg:flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Sort By</span>
              <div className="relative group">
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="appearance-none bg-white dark:bg-[#151d29] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm font-bold rounded-full pl-5 pr-10 py-3 focus:ring-2 focus:ring-primary/50 outline-none cursor-pointer shadow-sm hover:shadow-md transition-all"
                >
                  <option>Recommended</option>
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                  <option>Duration</option>
                </select>
                <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 material-symbols-outlined text-[18px] group-hover:text-primary transition-colors">sort</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

            {/* Mobile Filter & Sort Bar */}
            <div className="lg:hidden sticky top-[80px] z-30 -mx-4 px-4 py-3 bg-white/80 dark:bg-[#0B1116]/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 flex gap-3 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setIsFilterOpen(true)}
                className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-slate-900/10 active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-[18px]">tune</span> Filters
              </button>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-bold rounded-full px-5 py-2.5 focus:ring-0 outline-none shadow-sm"
              >
                <option>Recommended</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Duration</option>
              </select>
            </div>

            {/* Sidebar Filters (Desktop & Mobile Slide-over) */}
            <aside className={`
              fixed inset-0 z-[150] lg:static lg:z-auto lg:w-1/4
              transition-all duration-500 lg:transition-none
              ${isFilterOpen ? 'visible' : 'invisible lg:visible'}
            `}>
              {/* Backdrop */}
              <div
                className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500 lg:hidden ${isFilterOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={() => setIsFilterOpen(false)}
              />

              <div className={`
                  absolute inset-y-0 left-0 w-[85%] max-w-[320px] bg-white dark:bg-[#151d29] p-6 lg:p-0 lg:bg-transparent lg:static lg:w-full lg:max-w-none
                  transform transition-transform duration-500 lg:transform-none lg:transition-none flex flex-col h-full
                  ${isFilterOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
               `}>
                <div className="flex items-center justify-between mb-8 lg:hidden">
                  <h3 className="font-black text-2xl text-slate-900 dark:text-white tracking-tight">Filters</h3>
                  <button onClick={() => setIsFilterOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500"><span className="material-symbols-outlined">close</span></button>
                </div>

                <div className="lg:sticky lg:top-32 space-y-10 overflow-y-auto lg:overflow-visible flex-1 lg:h-auto pb-20 lg:pb-0 scrollbar-hide">
                  {/* Search Input */}
                  <div className="space-y-3">
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px] group-focus-within:text-primary transition-colors">search</span>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Search destinations..."
                        className="w-full bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/50 focus:border-transparent outline-none shadow-sm transition-all"
                      />
                    </div>
                  </div>

                  {/* Price Range */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Max Budget</label>
                      <span className="text-sm font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{formatPriceCompact(priceRange)}</span>
                    </div>
                    <input
                      type="range"
                      min="10000"
                      max="200000"
                      step="5000"
                      value={priceRange}
                      onChange={(e) => setPriceRange(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                      <span>₹10k</span>
                      <span>₹200k+</span>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Duration</label>
                      <span className="text-sm font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                        {duration === null || duration >= maxDuration ? 'All Durations' : `Up to ${duration} Days`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max={maxDuration}
                      value={duration ?? maxDuration}
                      onChange={(e) => {
                        const v = parseInt(e.target.value);
                        setDuration(v >= maxDuration ? null : v);
                      }}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>

                  {/* Themes — dynamically derived from live package data */}
                  <div className="space-y-4">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Experience Type</p>
                    <div className="flex flex-wrap gap-2">
                      {availableThemes.map((theme) => (
                        <button
                          key={theme}
                          onClick={() => toggleTheme(theme)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${selectedThemes.includes(theme) ? 'bg-primary text-white border-primary shadow-md shadow-primary/30' : 'bg-white dark:bg-[#1A2633] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-primary/50'}`}
                        >
                          {theme}
                        </button>
                      ))}
                      {availableThemes.length === 0 && (
                        <p className="text-xs text-slate-400">No themes available yet.</p>
                      )}
                    </div>
                  </div>

                  <button onClick={handleReset} className="w-full py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    Reset All Filters
                  </button>

                  <div className="lg:hidden pt-4">
                    <button onClick={() => setIsFilterOpen(false)} className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/30">
                      View {filteredPackages.length} Results
                    </button>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Grid */}
            <main className="w-full lg:w-3/4">
              {destinationId && (() => {
                const dest = trendingDestinations.find(d => d.id === destinationId);
                if (!dest) return null;
                return (
                  <div className="mb-6 p-4 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold">
                        <span className="material-symbols-outlined">explore</span>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Viewing Collection</p>
                        <h3 className="text-sm font-black text-slate-800 dark:text-white leading-tight">{dest.name}</h3>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        searchParams.delete('destinationId');
                        setSearchParams(searchParams);
                      }}
                      className="px-4 py-2 bg-white dark:bg-[#1A2633] hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all"
                    >
                      Show All Packages
                    </button>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
                {sortedPackages.length > 0 ? (
                  sortedPackages.map((pkg, pkgIdx) => (
                    <div key={pkg.id} className="animate-in fade-in slide-in-from-bottom-3 duration-500" style={{ animationDelay: `${pkgIdx * 60}ms`, animationFillMode: 'both' }}>
                      <Link
                        to={`/packages/${pkg.id}`}
                        className="group relative flex flex-col rounded-[2rem] overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-[1.015] cursor-pointer"
                      >
                        {/* ── FULL-BLEED IMAGE HERO ── */}
                        <div className="relative h-[340px] w-full overflow-hidden">

                          {/* Background image */}
                          <OptimizedImage
                            src={pkg.image}
                            alt={pkg.title}
                            className="absolute inset-0 h-full w-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                          />

                          {/* Dark gradient overlay — covers bottom 60% */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

                          {/* ── TOP ROW: Single unified flex bar — left badge + right controls ── */}
                          {/* Both sides share one absolute row so they can NEVER overlap.        */}
                          {/* Left side (min-w-0 flex-1) yields space; right side (shrink-0) never compresses. */}
                          <div className="absolute top-0 left-0 right-0 z-30 px-3 pt-3 flex items-start justify-between gap-2">

                            {/* LEFT: tag/theme badge + optional scarcity stacked below */}
                            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                              {pkg.tag ? (
                                <div className={`${pkg.tagColor || 'bg-white/95 text-slate-900'} backdrop-blur-xl text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-1.5 w-fit max-w-full`}>
                                  <span className="text-amber-500 shrink-0">★</span>
                                  <span className="truncate">{pkg.tag}</span>
                                </div>
                              ) : (
                                pkg.theme && (
                                  <div className="bg-white/90 backdrop-blur-xl text-slate-900 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-1.5 w-fit max-w-full">
                                    <span className="text-primary shrink-0">★</span>
                                    <span className="truncate">{pkg.theme}</span>
                                  </div>
                                )
                              )}
                              {pkg.remainingSeats && pkg.remainingSeats < 10 && (
                                <div className="bg-red-600/90 backdrop-blur-xl text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-1.5 w-fit">
                                  <span className="material-symbols-outlined text-[12px] shrink-0">local_fire_department</span>
                                  <span>Only {pkg.remainingSeats} Left</span>
                                </div>
                              )}
                            </div>

                            {/* RIGHT: Wishlist heart + Duration pill — shrink-0 so they're always fully visible */}
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={(e) => handleToggleWishlist(e, pkg.id)}
                                className="size-8 rounded-full bg-white/85 backdrop-blur-xl flex items-center justify-center shadow-lg hover:scale-110 hover:bg-white active:scale-95 transition-all text-red-500"
                              >
                                <span
                                  className="material-symbols-outlined text-[18px]"
                                  style={{ fontVariationSettings: wishlistIds.includes(pkg.id) ? "'FILL' 1" : "'FILL' 0" }}
                                >
                                  favorite
                                </span>
                              </button>
                              <div className="bg-white/85 backdrop-blur-xl text-slate-900 text-[10px] font-bold px-2.5 py-1.5 rounded-full shadow-lg flex items-center gap-1 shrink-0">
                                <span className="material-symbols-outlined text-[13px] text-slate-600">schedule</span>
                                {pkg.days}D / {pkg.days - 1}N
                              </div>
                            </div>
                          </div>

                          {/* ── BOTTOM OVERLAY: Price + Title + Meta ── */}
                          <div className="absolute bottom-0 left-0 right-0 z-10 px-5 pt-8 pb-4">

                            {/* Large price — mirrors "List: $250,000" */}
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className="text-2xl font-black text-white tracking-tight drop-shadow-lg">
                                {formatPriceCompact(pkg.price)}
                              </span>
                              {pkg.originalPrice && pkg.originalPrice > pkg.price && (
                                <span className="text-sm text-white/50 line-through font-medium">
                                  {formatPriceCompact(pkg.originalPrice)}
                                </span>
                              )}
                              <span className="text-xs text-white/60 font-medium ml-auto">per person</span>
                            </div>

                            {/* Package title */}
                            <h3 className="text-sm font-semibold text-white/90 leading-snug line-clamp-1 mb-3 drop-shadow">
                              {pkg.title}
                            </h3>

                            {/* Meta chips row — mirrors "29m² Living | 2 Rooms" */}
                            <div className="flex items-center gap-0 text-white/70 text-[11px] font-medium">
                              <span className="material-symbols-outlined text-[13px] text-white/60 mr-1">location_on</span>
                              <span className="truncate max-w-[110px]">{getLocationName(pkg.location, masterLocations)}</span>
                              <span className="mx-2.5 text-white/30">|</span>
                              <span className="material-symbols-outlined text-[13px] text-white/60 mr-1">group</span>
                              <span>{pkg.groupSize || 'Private'}</span>
                              {pkg.days > 0 && (
                                <>
                                  <span className="mx-2.5 text-white/30">|</span>
                                  <span className="material-symbols-outlined text-[13px] text-white/60 mr-1">calendar_month</span>
                                  <span>{pkg.days} Days</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* ── CARD FOOTER: Divider + Avatars + CTA ── */}
                        <div className="bg-white dark:bg-[#151d29] px-5 py-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60">
                          {/* Left: Avatar stack + traveler count */}
                          <div className="flex items-center gap-2.5">
                            <div className="flex -space-x-2">
                              {[1, 2, 3].map(i => (
                                <div key={i} className="size-7 rounded-full border-2 border-white dark:border-[#151d29] bg-slate-200 dark:bg-slate-700 overflow-hidden shadow-sm">
                                  <img
                                    src={`https://i.pravatar.cc/100?u=${pkg.id}${i}`}
                                    alt="traveler"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                              • <span className="text-slate-600 dark:text-slate-300 font-bold">12+</span> travelers
                            </span>
                          </div>

                          {/* Right: View Details CTA */}
                          <div className="flex items-center gap-1 text-primary font-black text-[12px] tracking-wide group-hover:gap-2 transition-all duration-300">
                            View Details
                            <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform duration-300">
                              arrow_forward
                            </span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-32 text-center">
                    <div className="size-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                      <span className="material-symbols-outlined text-5xl text-slate-400">travel_explore</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">No journeys found</h3>
                    <p className="text-slate-500 max-w-xs mx-auto mb-8">We couldn't find any packages matching your filters. Try adjusting your search.</p>
                    <button onClick={handleReset} className="px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20">Clear All Filters</button>
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
};