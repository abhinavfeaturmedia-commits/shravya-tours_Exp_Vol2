import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { TOUR_CATEGORIES as FALLBACK_CATEGORIES, TOUR_PACKAGES as FALLBACK_PACKAGES, TourCategoryType, TourPackage, getTourCatalogFromPackages } from '../../constants/tourCatalog';
import { OptimizedImage } from '../ui/OptimizedImage';
import { useData } from '../../context/DataContext';

interface TourSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: TourCategoryType;
  selectedPackageId?: string;
  onSelectPackage: (category: TourCategoryType, packageId: string, packageName: string) => void;
}

export const TourSelectorModal: React.FC<TourSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedCategory,
  selectedPackageId,
  onSelectPackage,
}) => {
  const { packages: realPackages } = useData();
  const [activeTab, setActiveTab] = useState<TourCategoryType | 'All'>(selectedCategory || 'All');
  const [searchTerm, setSearchTerm] = useState('');

  // Dynamically compute categories and packages from real database packages
  const { categories: TOUR_CATEGORIES, packages: TOUR_PACKAGES } = useMemo(() => {
    return getTourCatalogFromPackages(realPackages);
  }, [realPackages]);

  // Lock body scroll when modal is open to prevent background scrolling & overlapping ads
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredPackages = TOUR_PACKAGES.filter((pkg) => {
    const matchesTab = activeTab === 'All' || pkg.categoryId === activeTab;
    const matchesSearch =
      pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.categoryId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 md:p-10 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-6xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30">
                ✦ Curated Tour Catalog & Itineraries
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Explore Handcrafted Tour Packages
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Filter by themes, browse full day-wise inclusions, starting prices, and select your ideal vacation.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Modal Controls: Search & Category Filter Tabs */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setActiveTab('All')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'All'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-base">apps</span>
              All Themes ({TOUR_PACKAGES.length})
            </button>

            {TOUR_CATEGORIES.map((cat) => {
              const isActive = activeTab === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">{cat.icon}</span>
                  {cat.displayName}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              type="text"
              placeholder="Search destination or tour..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Modal Body / Cards Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/50 dark:bg-slate-950/40 space-y-6">
          {filteredPackages.length === 0 ? (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-5xl text-slate-400 mb-2">search_off</span>
              <p className="text-base font-bold text-slate-700 dark:text-slate-300">No tour packages match your search</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Try resetting filters or searching for another destination.</p>
              <button
                onClick={() => { setActiveTab('All'); setSearchTerm(''); }}
                className="mt-4 px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow hover:bg-amber-400"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPackages.map((pkg) => {
                const isSelected = selectedPackageId === pkg.id;
                const catObj = TOUR_CATEGORIES.find(c => c.id === pkg.categoryId);

                return (
                  <div
                    key={pkg.id}
                    className={`bg-white dark:bg-slate-800/90 rounded-2xl border transition-all duration-300 flex flex-col overflow-hidden group hover:shadow-xl ${
                      isSelected
                        ? 'border-amber-500 ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/10'
                        : 'border-slate-200/80 dark:border-slate-700/70 hover:border-amber-400/50'
                    }`}
                  >
                    {/* Image Header */}
                    <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                      <OptimizedImage
                        src={pkg.image}
                        fallbackSrc={pkg.fallbackImage}
                        alt={pkg.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />
                      
                      {/* Badge Top Left */}
                      {pkg.badge && (
                        <span className="absolute top-3 left-3 bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-md">
                          {pkg.badge}
                        </span>
                      )}

                      {/* Duration Tag Top Right */}
                      <span className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full border border-white/20 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px] text-amber-300">schedule</span>
                        {pkg.duration}
                      </span>

                      {/* Destination Label Bottom Left */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                        <span className="text-xs font-bold flex items-center gap-1 text-amber-200">
                          <span className="material-symbols-outlined text-sm">location_on</span>
                          {pkg.destination}
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Category Tag */}
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
                          <span className="material-symbols-outlined text-xs">{catObj?.icon || 'luggage'}</span>
                          {catObj?.displayName}
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white line-clamp-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {pkg.name}
                        </h3>

                        {/* Inclusions Pills */}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {pkg.inclusions.slice(0, 3).map((inc, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 text-[10px] font-semibold flex items-center gap-1"
                            >
                              <span className="text-emerald-500 font-bold">✓</span>
                              {inc}
                            </span>
                          ))}
                          {pkg.inclusions.length > 3 && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 text-[10px]">
                              +{pkg.inclusions.length - 3} more
                            </span>
                          )}
                        </div>

                        {/* Highlights Bullet List */}
                        <div className="mt-3 space-y-1">
                          {pkg.highlights.slice(0, 2).map((hl, idx) => (
                            <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                              <span className="text-amber-500 font-bold text-[12px]">•</span>
                              <span className="line-clamp-1">{hl}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Footer: Price & Select Button */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Starting From</span>
                          <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                            ₹{pkg.startingPrice.toLocaleString('en-IN')}
                            <span className="text-[11px] text-slate-400 font-medium font-normal"> / person</span>
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            onSelectPackage(pkg.categoryId, pkg.id, pkg.name);
                            onClose();
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow ${
                            isSelected
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 hover:scale-105 active:scale-95'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <span className="material-symbols-outlined text-sm">check_circle</span>
                              Selected
                            </>
                          ) : (
                            <>
                              Select Package
                              <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Showing <strong className="text-slate-800 dark:text-slate-200">{filteredPackages.length}</strong> available packages
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-all"
          >
            Close Catalog
          </button>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
