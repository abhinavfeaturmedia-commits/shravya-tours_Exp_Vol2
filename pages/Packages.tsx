import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { SEO } from '../components/ui/SEO';
import { OptimizedImage } from '../components/ui/OptimizedImage';
import { MasterLocation } from '../types';

// Helper to resolve location ID to name
const getLocationName = (locationValue: string, masterLocations: MasterLocation[]): string => {
  if (locationValue && locationValue.includes('-') && locationValue.length > 20) {
    const found = masterLocations.find(l => l.id === locationValue);
    return found ? found.name : locationValue;
  }
  return locationValue || '';
};

export const Packages: React.FC = () => {
  const { packages, masterLocations } = useData();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [priceRange, setPriceRange] = useState(200000);
  const [duration, setDuration] = useState(15);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState('Recommended');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

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
    setDuration(15);
    setSelectedThemes([]);
    setSortOption('Recommended');
    setSearchQuery('');
    setDebouncedSearch('');
  };

  // Filter + sort — memoized so they only recompute when inputs actually change
  const filteredPackages = useMemo(() => packages.filter(pkg => {
    if (pkg.status && pkg.status !== 'Active') return false;

    const matchesPrice = pkg.price <= priceRange;
    const matchesDuration = pkg.days <= duration;
    const matchesTheme = selectedThemes.length === 0 || (pkg.theme && selectedThemes.includes(pkg.theme));

    const terms = debouncedSearch.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const matchesSearch = terms.length === 0 || terms.every(term => {
      const searchableContent = [
        pkg.title,
        pkg.location,
        pkg.description,
        pkg.theme,
        pkg.tag,
        pkg.overview,
        ...pkg.highlights.map(h => h.label)
      ].join(' ').toLowerCase();
      return searchableContent.includes(term);
    });

    return matchesPrice && matchesDuration && matchesTheme && matchesSearch;
  }), [packages, priceRange, duration, selectedThemes, debouncedSearch]);

  const sortedPackages = useMemo(() => [...filteredPackages].sort((a, b) => {
    if (sortOption === 'Price: Low to High') return a.price - b.price;
    if (sortOption === 'Price: High to Low') return b.price - a.price;
    if (sortOption === 'Duration') return a.days - b.days;
    return 0;
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
                      <span className="text-sm font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">₹{(priceRange / 1000).toFixed(0)}k</span>
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
                      <span className="text-sm font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Up to {duration} Days</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="15"
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>

                  {/* Themes */}
                  <div className="space-y-4">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Experience Type</p>
                    <div className="flex flex-wrap gap-2">
                      {['Adventure', 'Honeymoon', 'Family', 'Pilgrim Yatra', 'Religious', 'Wildlife', 'Luxury'].map((theme) => (
                        <button
                          key={theme}
                          onClick={() => toggleTheme(theme)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${selectedThemes.includes(theme) ? 'bg-primary text-white border-primary shadow-md shadow-primary/30' : 'bg-white dark:bg-[#1A2633] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-primary/50'}`}
                        >
                          {theme}
                        </button>
                      ))}
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
                {sortedPackages.length > 0 ? (
                  sortedPackages.map((pkg, pkgIdx) => (
                    <div key={pkg.id}>
                      <Link to={`/packages/${pkg.id}`} className={`group flex flex-col bg-white dark:bg-card-dark rounded-[2rem] overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-black/50 transition-all duration-300 transform hover:-translate-y-1 relative`}>
                        {/* Image Container */}
                        <div className="relative h-72 w-full overflow-hidden">
                          {pkg.tag && (
                            <div className={`absolute top-4 left-4 z-20 ${pkg.tagColor || 'bg-white/90 text-slate-900'} backdrop-blur-md text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-lg`}>
                              {pkg.tag}
                            </div>
                          )}

                          {/* Wishlist Button */}
                          <button className="absolute top-4 right-4 z-20 size-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-red-500 transition-all shadow-sm">
                            <span className="material-symbols-outlined text-[20px]">favorite</span>
                          </button>

                          {/* Urgency Badge (Seats) */}
                          {pkg.remainingSeats && pkg.remainingSeats < 10 && (
                            <div className="absolute top-4 left-4 z-20 bg-red-600/90 backdrop-blur text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-lg animate-pulse flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">local_fire_department</span>
                              Only {pkg.remainingSeats} Left
                            </div>
                          )}

                          {/* Special Offer Badge */}
                          {pkg.offerEndTime && (
                            <div className={`absolute ${pkg.remainingSeats && pkg.remainingSeats < 10 ? 'top-14' : 'top-4'} left-4 z-20 bg-primary/90 backdrop-blur text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1`}>
                              <span className="material-symbols-outlined text-[14px]">timer</span>
                              Offer Ends Soon
                            </div>
                          )}

                          <OptimizedImage
                            src={pkg.image}
                            alt={pkg.title}
                            className="h-full w-full group-hover:scale-110 transition-transform duration-500 ease-out"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 transition-opacity"></div>

                          <div className="absolute bottom-0 left-0 right-0 p-6 text-white translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                            <div className="flex items-center gap-2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                              <span className="flex items-center gap-1 text-xs font-bold bg-white/20 backdrop-blur-md px-2 py-1 rounded-md"><span className="material-symbols-outlined text-[14px]">schedule</span> {pkg.days} Days</span>
                            </div>
                            <h3 className="font-black text-2xl leading-tight shadow-black drop-shadow-md mb-1">{pkg.title}</h3>
                            <p className="text-white/80 text-sm font-medium flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">location_on</span> {getLocationName(pkg.location, masterLocations)}</p>
                          </div>
                        </div>

                        {/* Content Body */}
                        <div className="flex flex-col p-6 pt-4 flex-1">
                          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-6 leading-relaxed font-medium">{pkg.description}</p>

                          <div className="mt-auto flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Starting from</span>
                              <span className="text-xl font-black text-slate-900 dark:text-white">₹{pkg.price.toLocaleString()}</span>
                              <span className="text-[9px] text-green-600 dark:text-green-400 font-bold">all taxes included</span>
                            </div>
                            <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors shadow-sm">
                              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                            </div>
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