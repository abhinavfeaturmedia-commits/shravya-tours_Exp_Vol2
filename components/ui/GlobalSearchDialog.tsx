import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MasterLocation, Package, TrendingDestination } from '../../types';
import { CURATED_DESTINATION_TILES } from '../../src/data/megaMenuCatalog';
import { MAHARASHTRA_CITIES } from '../../src/data/maharashtraCities';
import { getLocationName, getPackagePricingInfo, formatNightsDaysCode } from '../../utils/packageUtils';

interface GlobalSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  packages: Package[];
  masterLocations: MasterLocation[];
  trendingDestinations: TrendingDestination[];
}

export const GlobalSearchDialog: React.FC<GlobalSearchDialogProps> = ({
  isOpen,
  onClose,
  packages,
  masterLocations,
  trendingDestinations,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  // Sync native <dialog> modal open/close state
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Listen to native close event (Esc, form method="dialog", or backdrop click)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      onClose();
    };
    dialog.addEventListener('close', handleClose);

    // Fallback light-dismiss for browsers without closedby="any" (e.g., Safari)
    let cleanupFallback: (() => void) | undefined;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      let pressedOutside = false;
      const isOutside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      const onPointerDown = (e: PointerEvent) => {
        pressedOutside = isOutside(e);
      };
      const onPointerUp = (e: PointerEvent) => {
        if (pressedOutside && isOutside(e)) {
          dialog.close();
        }
        pressedOutside = false;
      };
      dialog.addEventListener('pointerdown', onPointerDown);
      dialog.addEventListener('pointerup', onPointerUp);
      cleanupFallback = () => {
        dialog.removeEventListener('pointerdown', onPointerDown);
        dialog.removeEventListener('pointerup', onPointerUp);
      };
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      cleanupFallback?.();
    };
  }, [onClose]);

  const activePackages = useMemo(
    () => packages.filter((p) => !p.status || p.status === 'Active'),
    [packages]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    const matchedPackages = activePackages
      .filter((pkg) => {
        if (!q) return true;
        const loc = getLocationName(pkg.location, masterLocations).toLowerCase();
        return (
          (pkg.title || '').toLowerCase().includes(q) ||
          loc.includes(q) ||
          (pkg.theme || '').toLowerCase().includes(q) ||
          (pkg.tag || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 5);

    const matchedDestinations = CURATED_DESTINATION_TILES.filter((d) =>
      !q
        ? d.isTrending || d.isBestSeller
        : d.name.toLowerCase().includes(q) || (d.subtitle || '').toLowerCase().includes(q)
    ).slice(0, 6);

    const matchedTrending = trendingDestinations
      .filter(
        (td) =>
          td.isActive !== false &&
          (!q || td.name.toLowerCase().includes(q) || (td.country || '').toLowerCase().includes(q))
      )
      .slice(0, 4);

    const matchedHubs = q
      ? MAHARASHTRA_CITIES.filter(
          (c) =>
            c.cityName.toLowerCase().includes(q) ||
            c.slug.toLowerCase().includes(q)
        ).slice(0, 3)
      : [];

    return { matchedPackages, matchedDestinations, matchedTrending, matchedHubs };
  }, [query, activePackages, masterLocations, trendingDestinations]);

  const handleGo = (href: string) => {
    onClose();
    setQuery('');
    navigate(href);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      handleGo(`/packages?search=${encodeURIComponent(trimmed)}`);
    } else {
      handleGo('/packages');
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="global-search-title"
      {...({ closedby: 'any' } as any)}
      className="search-dialog w-[min(94vw,680px)] max-h-[85dvh] p-0 m-auto rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 shadow-2xl overflow-hidden backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col max-h-[85dvh]">
        {/* Header / Search Input */}
        <form onSubmit={handleFormSubmit} className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <span className="material-symbols-outlined text-primary text-[22px] shrink-0" aria-hidden="true">
            search
          </span>
          <div className="flex-1 min-w-0">
            <h2 id="global-search-title" className="visually-hidden">
              Search destinations, tour packages, and travel hubs
            </h2>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Kashmir, Bali, Honeymoon, Ladakh, Pune..."
              aria-label="Search destinations or packages"
              className="w-full bg-transparent border-0 text-sm sm:text-base font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-0"
            />
          </div>
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </form>

        {/* Quick Category Pills */}
        <div className="flex items-center gap-2 px-5 py-3 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">Quick Browse:</span>
          {[
            { label: 'Domestic', href: '/packages?category=domestic' },
            { label: 'International', href: '/packages?category=international' },
            { label: 'Honeymoon', href: '/packages?category=honeymoon' },
            { label: 'Group Trips', href: '/packages?category=group' },
            { label: 'Custom Trip', href: '/customize' },
            { label: 'Corporate', href: '/corporate' },
          ].map((pill) => (
            <button
              key={pill.label}
              type="button"
              onClick={() => handleGo(pill.href)}
              className="px-3 py-1 rounded-full text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-primary hover:text-primary transition-colors shrink-0"
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Results Body */}
        <div className="overflow-y-auto custom-scrollbar p-5 space-y-6">
          {/* Matching Destinations */}
          {results.matchedDestinations.length > 0 && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">
                {query ? 'Matching Destinations' : 'Popular Destinations'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {results.matchedDestinations.map((dest) => (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() =>
                      handleGo(
                        `/packages?category=${dest.categories[0]}&search=${encodeURIComponent(dest.searchTerm)}`
                      )
                    }
                    className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                  >
                    <img
                      src={dest.imageUrl}
                      alt={dest.name}
                      className="size-10 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-primary truncate">
                        {dest.name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {dest.regionLabel}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live Matching Packages */}
          {results.matchedPackages.length > 0 && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">
                {query ? 'Matching Tour Packages' : 'Featured Itineraries'}
              </p>
              <div className="space-y-2">
                {results.matchedPackages.map((pkg) => {
                  const pricing = getPackagePricingInfo(pkg);
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => handleGo(`/packages/${pkg.id}`)}
                      className="w-full flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={pkg.image}
                          alt={pkg.title}
                          className="size-12 rounded-xl object-cover shrink-0 bg-slate-100"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-primary truncate">
                            {pkg.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {getLocationName(pkg.location, masterLocations)} • {formatNightsDaysCode(pkg.days)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-primary">{pricing.perPersonFormatted}</p>
                        <p className="text-[10px] text-slate-400">per person</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Trending Collections */}
          {results.matchedTrending.length > 0 && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2.5">
                Trending Collections
              </p>
              <div className="flex flex-wrap gap-2">
                {results.matchedTrending.map((td) => (
                  <button
                    key={td.id}
                    type="button"
                    onClick={() => handleGo(`/packages?destinationId=${encodeURIComponent(td.id)}`)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-primary hover:text-white text-xs font-semibold transition-colors"
                  >
                    <span>{td.name}</span>
                    {td.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/80 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 font-bold">
                        {td.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Maharashtra City Hubs */}
          {results.matchedHubs.length > 0 && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2.5">
                Maharashtra Travel & Cab Hubs
              </p>
              <div className="flex flex-wrap gap-2">
                {results.matchedHubs.map((city) => (
                  <button
                    key={city.slug}
                    type="button"
                    onClick={() => handleGo(`/travel-agency/${city.slug}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary text-xs font-semibold transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px] text-primary">location_city</span>
                    <span>{city.cityName} Tours & Cabs</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty state / Custom Trip Fallback */}
          {query.trim() &&
            results.matchedDestinations.length === 0 &&
            results.matchedPackages.length === 0 &&
            results.matchedTrending.length === 0 &&
            results.matchedHubs.length === 0 && (
              <div className="text-center py-6">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                  No exact packages found for "{query.trim()}"
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  Our travel experts can craft a tailor-made itinerary for any destination worldwide.
                </p>
                <button
                  type="button"
                  onClick={() => handleGo(`/customize?destination=${encodeURIComponent(query.trim())}`)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-white text-xs font-bold shadow-md hover:bg-primary-dark transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                  Build Custom Trip for "{query.trim()}"
                </button>
              </div>
            )}
        </div>

        {/* Footer Action */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 flex items-center justify-between text-xs text-slate-500">
          <span className="hidden sm:inline">Press <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">Esc</kbd> to close</span>
          <button
            type="button"
            onClick={() => handleGo(query.trim() ? `/packages?search=${encodeURIComponent(query.trim())}` : '/packages')}
            className="ml-auto font-bold text-primary hover:underline inline-flex items-center gap-1"
          >
            <span>View all matching packages</span>
            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </dialog>
  );
};
