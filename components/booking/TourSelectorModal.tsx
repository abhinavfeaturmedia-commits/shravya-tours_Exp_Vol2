import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { TourCategoryType, getTourCatalogFromPackages } from '../../constants/tourCatalog';
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
  const titleId = useId();
  const searchId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedOutsideRef = useRef(false);

  const { packages: realPackages, masterLocations } = useData();
  const [activeTab, setActiveTab] = useState<TourCategoryType | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const { categories: TOUR_CATEGORIES, packages: TOUR_PACKAGES } = useMemo(
    () => getTourCatalogFromPackages(realPackages, masterLocations),
    [realPackages, masterLocations]
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      setActiveTab(selectedCategory || 'All');
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen, selectedCategory]);

  // Light-dismiss fallback when <dialog closedby="any"> is not natively supported
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || 'closedBy' in HTMLDialogElement.prototype) return;

    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };

    const onPointerDown = (e: PointerEvent) => {
      pressedOutsideRef.current = isOutside(e);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutsideRef.current && isOutside(e)) {
        dialog.close();
      }
      pressedOutsideRef.current = false;
    };

    dialog.addEventListener('pointerdown', onPointerDown);
    dialog.addEventListener('pointerup', onPointerUp);
    return () => {
      dialog.removeEventListener('pointerdown', onPointerDown);
      dialog.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  const filteredPackages = TOUR_PACKAGES.filter((pkg) => {
    const matchesTab = activeTab === 'All' || pkg.categoryId === activeTab;
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      pkg.name.toLowerCase().includes(q) ||
      pkg.destination.toLowerCase().includes(q) ||
      pkg.categoryId.toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={() => {
        if (dialogRef.current) dialogRef.current.returnValue = '';
        onClose();
      }}
      {...({ closedby: 'any' } as any)}
      className="selector-dialog w-[calc(100%-1.5rem)] max-w-5xl max-h-[90vh] p-0 m-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
    >
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-slate-950 text-white flex items-center justify-between gap-4 border-b border-slate-800">
          <div>
            <h1 id={titleId} className="text-lg sm:text-xl font-black tracking-tight text-white">
              Browse Tour Packages
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Compare itineraries, inclusions, and starting prices per person.
            </p>
          </div>

          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 flex items-center justify-center transition-colors shrink-0"
            aria-label="Close tour catalog"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        {/* Filters & Search */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-3 justify-between items-center">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setActiveTab('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                activeTab === 'All'
                  ? 'bg-[#C9732A] text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All ({TOUR_PACKAGES.length})
            </button>

            {TOUR_CATEGORIES.map((cat) => {
              const isActive = activeTab === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveTab(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                    isActive
                      ? 'bg-[#C9732A] text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">
                    {cat.icon}
                  </span>
                  {cat.name}
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-64">
            <label htmlFor={searchId} className="visually-hidden">
              Search tour packages
            </label>
            <span
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none"
              aria-hidden="true"
            >
              search
            </span>
            <input
              id={searchId}
              type="search"
              autoFocus
              placeholder="Search destination or tour..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#C9732A] text-slate-900 dark:text-white font-medium"
            />
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-slate-100/50 dark:bg-slate-950/40">
          {filteredPackages.length === 0 ? (
            <div className="text-center py-14">
              <span className="material-symbols-outlined text-4xl text-slate-400 mb-2" aria-hidden="true">
                search_off
              </span>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No tour packages match your filter
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('All');
                  setSearchTerm('');
                }}
                className="mt-3 px-4 py-2 bg-[#C9732A] text-white font-bold text-xs rounded-xl"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPackages.map((pkg) => {
                const isSelected = selectedPackageId === pkg.id;

                return (
                  <div
                    key={pkg.id}
                    className={`bg-white dark:bg-slate-800/90 rounded-2xl border transition-all flex flex-col overflow-hidden ${
                      isSelected
                        ? 'border-[#C9732A] ring-2 ring-[#C9732A]/40 shadow-md'
                        : 'border-slate-200/80 dark:border-slate-700/70 hover:border-amber-400/60'
                    }`}
                  >
                    <div className="relative h-40 w-full overflow-hidden bg-slate-900">
                      <OptimizedImage
                        src={pkg.image}
                        fallbackSrc={pkg.fallbackImage}
                        alt={pkg.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                      <span className="absolute top-2.5 right-2.5 bg-black/65 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                        {pkg.duration}
                      </span>
                      <span className="absolute bottom-2.5 left-3 right-3 text-xs font-bold text-amber-200 flex items-center gap-1 truncate">
                        <span className="material-symbols-outlined text-sm" aria-hidden="true">
                          location_on
                        </span>
                        {pkg.destination}
                      </span>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-extrabold text-slate-900 dark:text-white line-clamp-1">
                          {pkg.name}
                        </h2>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {pkg.inclusions.slice(0, 3).map((inc, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 text-[10px] font-medium"
                            >
                              ✓ {inc}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">
                            From
                          </span>
                          <span className="text-base font-black text-[#C9732A] dark:text-amber-400">
                            ₹{pkg.startingPrice.toLocaleString('en-IN')}
                            <span className="text-[11px] text-slate-400 font-normal"> /person</span>
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            onSelectPackage(pkg.categoryId, pkg.id, pkg.name);
                            dialogRef.current?.close();
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#C9732A] hover:bg-[#b56320] text-white'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Showing <strong className="text-slate-800 dark:text-slate-200">{filteredPackages.length}</strong> packages
          </span>
          <div className="flex items-center gap-2">
            <Link
              to="/packages"
              onClick={() => dialogRef.current?.close()}
              className="px-4 py-2 text-xs font-bold text-[#C9732A] dark:text-amber-400 hover:underline"
            >
              Open Full Packages Page
            </Link>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
};
