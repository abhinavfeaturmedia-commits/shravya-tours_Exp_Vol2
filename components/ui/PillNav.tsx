import React, { useState, useEffect, useRef, useMemo, useId } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MasterLocation, Package, TrendingDestination } from '../../types';
import { COMPANY_PHONE, COMPANY_PHONE_DISPLAY } from '../../src/lib/constants';
import {
  CURATED_DESTINATION_TILES,
  GROUP_TRIP_LINKS,
  MEGA_CATEGORIES,
  MegaCategoryId,
  enrichDestinationTiles,
  getMegaMenuBestSellingList,
  getMegaMenuTrendingList,
  getSeasonalMenuPill,
} from '../../src/data/megaMenuCatalog';
import { formatPrice } from '../../utils/packageUtils';
import { GlobalSearchDialog } from './GlobalSearchDialog';

export type PillNavItem = {
  label: string;
  href?: string;
  ariaLabel?: string;
  icon?: string;
  badge?: string;
  children?: PillNavItem[];
};

export interface PillNavProps {
  logo: React.ReactNode | string;
  logoAlt?: string;
  items?: PillNavItem[];
  activeHref?: string;
  className?: string;
  packages?: Package[];
  masterLocations?: MasterLocation[];
  trendingDestinations?: TrendingDestination[];
  isCustomerAuthenticated?: boolean;
  // Props kept for compatibility
  baseColor?: string;
  pillColor?: string;
  hoveredPillTextColor?: string;
  pillTextColor?: string;
}

type DesktopMenuKey = 'group' | 'customized' | 'trending' | 'more' | 'account' | null;

export const PillNav: React.FC<PillNavProps> = ({
  logo,
  logoAlt = 'SHRAWELLO Travel Hub',
  activeHref,
  className = '',
  packages = [],
  masterLocations = [],
  trendingDestinations = [],
  isCustomerAuthenticated = false,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileExpandedSection, setMobileExpandedSection] = useState<string | null>('customized');
  const [openMenu, setOpenMenu] = useState<DesktopMenuKey>(null);
  const [pinnedMenu, setPinnedMenu] = useState<DesktopMenuKey>(null);
  const [activeMegaCategory, setActiveMegaCategory] = useState<MegaCategoryId>('domestic');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const navId = useId();

  const seasonalPill = useMemo(() => getSeasonalMenuPill(), []);

  // Compute live enriched mega-menu data
  const activeCategoryConfig = useMemo(
    () => MEGA_CATEGORIES.find((c) => c.id === activeMegaCategory) || MEGA_CATEGORIES[0],
    [activeMegaCategory]
  );

  const categoryTiles = useMemo(
    () =>
      enrichDestinationTiles(
        CURATED_DESTINATION_TILES,
        packages,
        masterLocations,
        trendingDestinations,
        activeMegaCategory
      ),
    [packages, masterLocations, trendingDestinations, activeMegaCategory]
  );

  const categoryMinPrices = useMemo(() => {
    const result: Record<MegaCategoryId, number> = {
      domestic: 12999,
      international: 34999,
      honeymoon: 22999,
    };
    (['domestic', 'international', 'honeymoon'] as MegaCategoryId[]).forEach((catId) => {
      const tiles = enrichDestinationTiles(
        CURATED_DESTINATION_TILES,
        packages,
        masterLocations,
        trendingDestinations,
        catId
      );
      if (tiles.length > 0) {
        result[catId] = Math.min(...tiles.map((t) => t.startingPrice));
      }
    });
    return result;
  }, [packages, masterLocations, trendingDestinations]);

  const trendingList = useMemo(
    () => getMegaMenuTrendingList(packages, masterLocations, trendingDestinations),
    [packages, masterLocations, trendingDestinations]
  );

  const bestSellingList = useMemo(
    () => getMegaMenuBestSellingList(packages, masterLocations, activeMegaCategory),
    [packages, masterLocations, activeMegaCategory]
  );

  // Scroll state for compact dock styling
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      setScrolled((prev) => (prev !== isScrolled ? isScrolled : prev));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setOpenMenu(null);
    setPinnedMenu(null);
  }, [location.pathname, location.search]);

  // Outside click & Escape handler
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (navContainerRef.current && !navContainerRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
        setPinnedMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openMenu) {
        const trigger = triggerRefs.current[openMenu];
        setOpenMenu(null);
        setPinnedMenu(null);
        trigger?.focus();
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenu]);

  // Keyboard shortcut Ctrl/Cmd + K to open instant search
  useEffect(() => {
    const onShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    document.addEventListener('keydown', onShortcut);
    return () => document.removeEventListener('keydown', onShortcut);
  }, []);

  const canHover = () =>
    typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

  const handlePointerEnterMenu = (key: DesktopMenuKey, e: React.PointerEvent) => {
    if (!canHover() || e.pointerType === 'touch') return;
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setOpenMenu(key);
  };

  const handlePointerLeaveMenu = (e: React.PointerEvent) => {
    if (!canHover() || e.pointerType === 'touch') return;
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setOpenMenu((current) => (pinnedMenu === current ? current : null));
    }, 180);
  };

  const handleToggleClick = (key: DesktopMenuKey) => {
    if (openMenu === key && pinnedMenu === key) {
      setOpenMenu(null);
      setPinnedMenu(null);
    } else {
      setOpenMenu(key);
      setPinnedMenu(key);
    }
  };

  const handleFocusOutMenu = (e: React.FocusEvent<HTMLDivElement>) => {
    if (
      e.relatedTarget &&
      navContainerRef.current &&
      !navContainerRef.current.contains(e.relatedTarget as Node)
    ) {
      setOpenMenu(null);
      setPinnedMenu(null);
    }
  };

  const closeAllMenus = () => {
    setOpenMenu(null);
    setPinnedMenu(null);
    setIsMobileMenuOpen(false);
  };

  const handleNavigate = (href: string) => {
    closeAllMenus();
    navigate(href);
  };

  const renderLogo = () => {
    if (typeof logo === 'string') {
      return <img src={logo} alt={logoAlt} className="h-7 w-auto object-contain" />;
    }
    return logo;
  };

  const isPackagesActive = activeHref?.startsWith('/packages');
  const isCorporateActive = activeHref?.startsWith('/corporate');
  const isSeasonalActive =
    isPackagesActive && location.search.toLowerCase().includes('category=seasonal');
  const isGroupActive =
    isPackagesActive && location.search.toLowerCase().includes('category=group');
  const isCustomizedActive =
    activeHref?.startsWith('/customize') ||
    (isPackagesActive && !isSeasonalActive && !isGroupActive);

  return (
    <>
      <header
        ref={navContainerRef}
        onBlur={handleFocusOutMenu}
        className={`relative z-[1000] w-full flex flex-col items-center px-2 sm:px-4 ${className}`}
      >
        {/* Main Top Navigation Dock */}
        <nav
          aria-label="Primary"
          className={`
            relative transition-all duration-300 ease-out
            flex items-center justify-between gap-2 lg:gap-3
            w-full max-w-[1280px] mx-auto
            bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl
            border border-slate-200/80 dark:border-white/10
            shadow-xl shadow-black/5 dark:shadow-black/30 ring-1 ring-black/5 dark:ring-white/5
            ${isMobileMenuOpen ? 'rounded-3xl' : 'rounded-full'}
            ${scrolled ? 'py-1.5 px-2.5 sm:px-4 shadow-2xl' : 'py-2 px-3 sm:px-5'}
          `}
        >
          {/* Left: Brand Logo */}
          <Link
            to="/"
            aria-current={activeHref === '/' ? 'page' : undefined}
            className="flex items-center gap-2 shrink-0 group rounded-full pr-2 py-0.5 transition-transform hover:scale-[1.02]"
          >
            <span className="flex items-center justify-center size-9 sm:size-10 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 p-1 shrink-0">
              {renderLogo()}
            </span>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="font-display font-black text-sm lg:text-[15px] tracking-tight text-slate-900 dark:text-white">
                SHRAWELLO
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-primary">
                Travel Hub
              </span>
            </div>
          </Link>

          {/* Center: Desktop Primary Navigation */}
          <ul className="hidden lg:flex items-center gap-1 xl:gap-1.5 shrink-0">
            {/* 1. Group Trips Dropdown */}
            <li
              className="relative"
              onPointerEnter={(e) => handlePointerEnterMenu('group', e)}
              onPointerLeave={handlePointerLeaveMenu}
            >
              <button
                ref={(el) => { triggerRefs.current.group = el; }}
                type="button"
                aria-expanded={openMenu === 'group'}
                aria-controls={`${navId}-group-panel`}
                onClick={() => handleToggleClick('group')}
                className={`inline-flex items-center gap-1 whitespace-nowrap px-3 py-2 rounded-full text-[13px] font-semibold transition-all ${
                  openMenu === 'group' || isGroupActive
                    ? 'bg-primary/10 text-primary dark:bg-primary/20'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>Group Trips</span>
                <span
                  aria-hidden="true"
                  className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${
                    openMenu === 'group' ? 'rotate-180 text-primary' : 'text-slate-400'
                  }`}
                >
                  expand_more
                </span>
              </button>

              {openMenu === 'group' && (
                <div
                  id={`${navId}-group-panel`}
                  className="mega-menu-panel absolute top-full left-0 mt-3 w-[340px] p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700/80 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
                  onPointerEnter={(e) => handlePointerEnterMenu('group', e)}
                  onPointerLeave={handlePointerLeaveMenu}
                >
                  <div className="px-2.5 py-1.5 mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Curated Group Departures
                    </span>
                    <Link
                      to="/packages?category=group"
                      onClick={closeAllMenus}
                      className="text-[11px] font-bold text-primary hover:underline"
                    >
                      View All
                    </Link>
                  </div>
                  <div className="space-y-1">
                    {GROUP_TRIP_LINKS.map((item) => (
                      <Link
                        key={item.title}
                        to={item.href}
                        onClick={closeAllMenus}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors group"
                      >
                        <span className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                            {item.icon}
                          </span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-primary truncate">
                              {item.title}
                            </span>
                            {item.badge && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {item.subtitle}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </li>

            {/* 2. Customized Mega-Menu Trigger */}
            <li
              className="static"
              onPointerEnter={(e) => handlePointerEnterMenu('customized', e)}
              onPointerLeave={handlePointerLeaveMenu}
            >
              <button
                ref={(el) => { triggerRefs.current.customized = el; }}
                type="button"
                aria-expanded={openMenu === 'customized'}
                aria-controls={`${navId}-customized-mega`}
                onClick={() => handleToggleClick('customized')}
                className={`relative inline-flex items-center gap-1 whitespace-nowrap px-3.5 py-2 rounded-full text-[13px] font-bold transition-all ${
                  openMenu === 'customized'
                    ? 'bg-primary/12 text-primary ring-1 ring-primary/30'
                    : isCustomizedActive
                    ? 'text-primary bg-primary/8'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>Customized</span>
                <span
                  aria-hidden="true"
                  className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${
                    openMenu === 'customized' ? 'rotate-180 text-primary' : 'text-slate-400'
                  }`}
                >
                  expand_more
                </span>
              </button>
            </li>

            {/* 3. Seasonal Highlighted Pill (Xmas & New Year / Monsoon Specials) */}
            <li>
              <Link
                to={seasonalPill.href}
                aria-current={isSeasonalActive ? 'page' : undefined}
                onClick={closeAllMenus}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3.5 py-1.5 rounded-full text-[12.5px] font-bold border transition-all ${
                  isSeasonalActive
                    ? 'bg-accent text-white border-accent shadow-md shadow-accent/20'
                    : 'border-accent/60 text-accent dark:text-emerald-400 dark:border-emerald-500/50 bg-accent/5 hover:bg-accent hover:text-white hover:border-accent'
                }`}
              >
                <span className="size-1.5 rounded-full bg-current animate-pulse" aria-hidden="true" />
                <span>{seasonalPill.label}</span>
              </Link>
            </li>

            {/* 4. Trending Mega-Dropdown */}
            <li
              className="relative"
              onPointerEnter={(e) => handlePointerEnterMenu('trending', e)}
              onPointerLeave={handlePointerLeaveMenu}
            >
              <button
                ref={(el) => { triggerRefs.current.trending = el; }}
                type="button"
                aria-expanded={openMenu === 'trending'}
                aria-controls={`${navId}-trending-panel`}
                onClick={() => handleToggleClick('trending')}
                className={`inline-flex items-center gap-1 whitespace-nowrap px-3 py-2 rounded-full text-[13px] font-semibold transition-all ${
                  openMenu === 'trending'
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>Trending</span>
                <span
                  aria-hidden="true"
                  className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${
                    openMenu === 'trending' ? 'rotate-180 text-primary' : 'text-slate-400'
                  }`}
                >
                  expand_more
                </span>
              </button>

              {openMenu === 'trending' && (
                <div
                  id={`${navId}-trending-panel`}
                  className="mega-menu-panel absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[440px] p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700/80 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
                  onPointerEnter={(e) => handlePointerEnterMenu('trending', e)}
                  onPointerLeave={handlePointerLeaveMenu}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                        Trending Right Now
                      </p>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Most Booked Destinations
                      </h3>
                    </div>
                    <Link
                      to="/packages?category=trending"
                      onClick={closeAllMenus}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5"
                    >
                      <span>Explore all</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
                    {trendingList.slice(0, 8).map((td) => (
                      <Link
                        key={td.id}
                        to={td.href}
                        onClick={closeAllMenus}
                        className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-primary/40 hover:bg-primary/5 transition-all group min-w-0"
                      >
                        {td.imageUrl && (
                          <img
                            src={td.imageUrl}
                            alt={td.name}
                            className="size-11 rounded-lg object-cover shrink-0"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="block text-xs font-bold text-slate-900 dark:text-white group-hover:text-primary leading-snug truncate">
                            {td.name}
                          </span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {td.sublabel}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </li>

            {/* 5. Corporate Direct Link */}
            <li>
              <Link
                to="/corporate"
                aria-current={isCorporateActive ? 'page' : undefined}
                onClick={closeAllMenus}
                className={`inline-flex items-center whitespace-nowrap px-3 py-2 rounded-full text-[13px] font-semibold transition-all ${
                  isCorporateActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Corporate
              </Link>
            </li>

            {/* 6. More Dropdown */}
            <li
              className="relative"
              onPointerEnter={(e) => handlePointerEnterMenu('more', e)}
              onPointerLeave={handlePointerLeaveMenu}
            >
              <button
                ref={(el) => { triggerRefs.current.more = el; }}
                type="button"
                aria-expanded={openMenu === 'more'}
                aria-controls={`${navId}-more-panel`}
                onClick={() => handleToggleClick('more')}
                className={`inline-flex items-center gap-1 whitespace-nowrap px-3 py-2 rounded-full text-[13px] font-semibold transition-all ${
                  openMenu === 'more'
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>More</span>
                <span
                  aria-hidden="true"
                  className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${
                    openMenu === 'more' ? 'rotate-180 text-primary' : 'text-slate-400'
                  }`}
                >
                  expand_more
                </span>
              </button>

              {openMenu === 'more' && (
                <div
                  id={`${navId}-more-panel`}
                  className="mega-menu-panel absolute top-full right-0 mt-3 w-64 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700/80 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
                  onPointerEnter={(e) => handlePointerEnterMenu('more', e)}
                  onPointerLeave={handlePointerLeaveMenu}
                >
                  {[
                    { label: 'Custom Trip Planner', href: '/customize', icon: 'auto_awesome', badge: 'Free Quote' },
                    { label: 'Travel Guides & Blogs', href: '/blog', icon: 'article' },
                    { label: 'Maharashtra Cab Hubs', href: '/travel-agency/pune', icon: 'location_city' },
                    { label: 'About Us', href: '/about', icon: 'info' },
                    { label: 'Careers', href: '/careers', icon: 'work' },
                    { label: 'Contact & Help Desk', href: '/contact', icon: 'support_agent' },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      aria-current={activeHref === item.href ? 'page' : undefined}
                      onClick={closeAllMenus}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                        activeHref === item.href
                          ? 'bg-primary/10 text-primary font-bold'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </span>
                      {item.badge && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </li>
          </ul>

          {/* Right Utility Cluster */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Call Us (Desktop) */}
            <a
              href={`tel:+91${COMPANY_PHONE}`}
              className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
              title={`Call Us +91 ${COMPANY_PHONE_DISPLAY}`}
            >
              <span className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
                  call
                </span>
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Call Us
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                  +91 {COMPANY_PHONE_DISPLAY}
                </span>
              </span>
            </a>

            {/* Compact Phone Button (Tablet/Mobile) */}
            <a
              href={`tel:+91${COMPANY_PHONE}`}
              aria-label={`Call +91 ${COMPANY_PHONE_DISPLAY}`}
              className="xl:hidden flex items-center justify-center size-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                call
              </span>
            </a>

            {/* Search Icon Button */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search destinations and packages"
              title="Search (Ctrl+K)"
              className="flex items-center justify-center size-9 rounded-full bg-primary text-white hover:bg-primary-dark shadow-md shadow-primary/20 transition-all hover:scale-105 active:scale-95"
            >
              <span className="material-symbols-outlined text-[19px]" aria-hidden="true">
                search
              </span>
            </button>

            {/* Account / Portals Dropdown */}
            <div
              className="relative hidden sm:block"
              onPointerEnter={(e) => handlePointerEnterMenu('account', e)}
              onPointerLeave={handlePointerLeaveMenu}
            >
              <button
                ref={(el) => { triggerRefs.current.account = el; }}
                type="button"
                aria-label="Account and Portals"
                aria-expanded={openMenu === 'account'}
                aria-controls={`${navId}-account-panel`}
                onClick={() => handleToggleClick('account')}
                className={`flex items-center justify-center size-9 rounded-full border transition-all ${
                  isCustomerAuthenticated
                    ? 'bg-accent text-white border-accent'
                    : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent hover:opacity-90'
                }`}
              >
                <span className="material-symbols-outlined text-[19px]" aria-hidden="true">
                  person
                </span>
              </button>

              {openMenu === 'account' && (
                <div
                  id={`${navId}-account-panel`}
                  className="mega-menu-panel absolute top-full right-0 mt-3 w-56 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700/80 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
                  onPointerEnter={(e) => handlePointerEnterMenu('account', e)}
                  onPointerLeave={handlePointerLeaveMenu}
                >
                  <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Portals & Login
                  </p>
                  <Link
                    to={isCustomerAuthenticated ? '/my-account' : '/customer/login'}
                    onClick={closeAllMenus}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">
                        account_circle
                      </span>
                      <span>{isCustomerAuthenticated ? 'My Account' : 'Customer Login'}</span>
                    </span>
                    {isCustomerAuthenticated && (
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        Active
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/partner/login"
                    onClick={closeAllMenus}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">
                      handshake
                    </span>
                    <span>Associate Portal</span>
                  </Link>
                  <Link
                    to="/login"
                    onClick={closeAllMenus}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">
                      badge
                    </span>
                    <span>Staff Portal</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Primary CTA Button (Desktop) */}
            <Link
              to="/customize"
              onClick={closeAllMenus}
              className="hidden md:inline-flex h-9 px-4 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r from-primary to-orange-600 hover:from-primary-dark hover:to-orange-700 text-white font-bold text-xs lg:text-[13px] shadow-md shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Plan Trip</span>
              <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                arrow_forward
              </span>
            </Link>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              aria-expanded={isMobileMenuOpen}
              aria-controls={`${navId}-mobile-drawer`}
              aria-label="Toggle Menu"
              className="lg:hidden flex items-center justify-center size-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 transition-transform active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                {isMobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>

          {/* ── 4-COLUMN CUSTOMIZED MEGA-MENU PANEL (Desktop) ── */}
          {openMenu === 'customized' && (
            <div
              id={`${navId}-customized-mega`}
              onPointerEnter={(e) => handlePointerEnterMenu('customized', e)}
              onPointerLeave={handlePointerLeaveMenu}
              className="mega-menu-panel hidden lg:block absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[min(96vw,1160px)] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700/80 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.28)] ring-1 ring-black/5 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="grid grid-cols-[240px_minmax(0,1fr)_225px_205px] divide-x divide-slate-100 dark:divide-slate-800">
                {/* COLUMN 1: CATEGORY SWITCHER */}
                <div className="p-5 bg-slate-50/60 dark:bg-slate-900/60 flex flex-col justify-between min-w-0">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 mb-3 px-1">
                      Category
                    </p>
                    <div className="space-y-2">
                      {MEGA_CATEGORIES.map((cat) => {
                        const isActiveCat = activeMegaCategory === cat.id;
                        const dynamicSubtitle =
                          cat.id === 'honeymoon'
                            ? cat.subtitle
                            : `Starting From ${formatPrice(categoryMinPrices[cat.id])}`;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onMouseEnter={() => setActiveMegaCategory(cat.id)}
                            onFocus={() => setActiveMegaCategory(cat.id)}
                            onClick={() => handleNavigate(cat.href)}
                            className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                              isActiveCat
                                ? 'bg-primary/10 dark:bg-primary/15 border-primary/30 shadow-sm'
                                : 'bg-white/70 dark:bg-slate-800/50 border-transparent hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                            }`}
                          >
                            <span
                              className={`size-10 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
                                isActiveCat
                                  ? 'bg-white dark:bg-slate-900 text-primary border-primary/30 shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200/70 dark:border-slate-700'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                                {cat.icon}
                              </span>
                            </span>
                            <div className="min-w-0">
                              <p
                                className={`text-sm font-bold leading-tight ${
                                  isActiveCat
                                    ? 'text-primary'
                                    : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                {cat.label}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                {dynamicSubtitle}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick Customizer Promo Box */}
                  <div className="mt-5 p-3.5 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      100% Tailor-Made Trips
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                      Pick your dates, hotels & pace. Free quote in 15 mins.
                    </p>
                    <Link
                      to={`/customize?category=${activeMegaCategory}`}
                      onClick={closeAllMenus}
                      className="mt-2.5 inline-flex items-center gap-1 text-xs font-black text-primary hover:underline"
                    >
                      <span>Build Custom Trip</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </Link>
                  </div>
                </div>

                {/* COLUMN 2: DESTINATION PHOTO GRID */}
                <div className="p-5 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                        {activeCategoryConfig.gridHeading}
                      </p>
                      <Link
                        to={activeCategoryConfig.href}
                        onClick={closeAllMenus}
                        className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        <span>View All</span>
                        <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                      </Link>
                    </div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                      {activeCategoryConfig.regionSubheading}
                    </p>

                    <div className="grid grid-cols-4 gap-2.5">
                      {categoryTiles.slice(0, 16).map((tile) => (
                        <Link
                          key={tile.id}
                          to={tile.href}
                          onClick={closeAllMenus}
                          title={`${tile.name} — Starting From ${formatPrice(tile.startingPrice)}`}
                          className="group relative aspect-[16/11] rounded-xl overflow-hidden bg-slate-900 border border-slate-200/50 dark:border-slate-700/60 shadow-xs hover:shadow-md transition-all"
                        >
                          <img
                            src={tile.imageUrl}
                            alt={tile.name}
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                          <span className="absolute bottom-1.5 inset-x-1.5 text-center text-[11px] font-bold text-white leading-tight drop-shadow truncate group-hover:text-amber-300 transition-colors">
                            {tile.name}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Strip */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      Looking for a specific route or group size?
                    </span>
                    <Link
                      to={`/customize?category=${activeMegaCategory}`}
                      onClick={closeAllMenus}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-[11px] hover:bg-primary dark:hover:bg-primary dark:hover:text-white transition-colors shrink-0"
                    >
                      <span>Customize Itinerary</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </Link>
                  </div>
                </div>

                {/* COLUMN 3: TRENDING DESTINATIONS (Scrollable) */}
                <div className="p-5 flex flex-col min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 mb-3">
                    Trending Destinations
                  </p>
                  <div className="space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar max-h-[340px] pr-1.5">
                    {trendingList.map((item) => (
                      <Link
                        key={item.id}
                        to={item.href}
                        onClick={closeAllMenus}
                        className="block py-2 px-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors group"
                      >
                        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors leading-snug">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                          {item.sublabel}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* COLUMN 4: BEST SELLING DESTINATIONS */}
                <div className="p-5 flex flex-col min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 mb-3">
                    Best Selling
                  </p>
                  <div className="space-y-1 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar max-h-[300px] pr-1">
                    {bestSellingList.map((item) => (
                      <Link
                        key={item.id}
                        to={item.href}
                        onClick={closeAllMenus}
                        className="block py-2 px-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors group"
                      >
                        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors leading-snug">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                          {item.sublabel}
                        </p>
                      </Link>
                    ))}
                  </div>
                  <Link
                    to="/packages"
                    onClick={closeAllMenus}
                    className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    <span>All Packages</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Mobile / Tablet Navigation Drawer */}
        <div
          id={`${navId}-mobile-drawer`}
          className={`
            lg:hidden transition-all duration-300 ease-out w-full max-w-md
            ${
              isMobileMenuOpen
                ? 'max-h-[calc(100dvh-96px)] opacity-100 mt-2 translate-y-0 overflow-y-auto'
                : 'max-h-0 opacity-0 mt-0 -translate-y-3 overflow-hidden pointer-events-none'
            }
          `}
        >
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-2xl space-y-2">
            {/* Customized Section (Expanded by default for fast discovery) */}
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <button
                type="button"
                aria-expanded={mobileExpandedSection === 'customized'}
                onClick={() =>
                  setMobileExpandedSection(
                    mobileExpandedSection === 'customized' ? null : 'customized'
                  )
                }
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-slate-900 dark:text-white bg-slate-50/70 dark:bg-slate-800/60"
              >
                <span className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">
                    travel_explore
                  </span>
                  <span>Customized Tours</span>
                </span>
                <span
                  aria-hidden="true"
                  className={`material-symbols-outlined text-[18px] transition-transform ${
                    mobileExpandedSection === 'customized' ? 'rotate-180' : ''
                  }`}
                >
                  expand_more
                </span>
              </button>

              {mobileExpandedSection === 'customized' && (
                <div className="p-3 space-y-3">
                  {/* Category Switcher Pills */}
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {MEGA_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveMegaCategory(cat.id)}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all ${
                          activeMegaCategory === cat.id
                            ? 'bg-white dark:bg-slate-900 text-primary shadow-xs'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {cat.id === 'domestic'
                          ? 'Domestic'
                          : cat.id === 'international'
                          ? 'International'
                          : 'Honeymoon'}
                      </button>
                    ))}
                  </div>

                  {/* Destination Chips Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {categoryTiles.slice(0, 9).map((tile) => (
                      <Link
                        key={tile.id}
                        to={tile.href}
                        onClick={closeAllMenus}
                        className="relative aspect-[16/11] rounded-xl overflow-hidden bg-slate-900"
                      >
                        <img
                          src={tile.imageUrl}
                          alt={tile.name}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                        <span className="absolute bottom-1 inset-x-1 text-center text-[10px] font-bold text-white truncate">
                          {tile.name}
                        </span>
                      </Link>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Link
                      to={activeCategoryConfig.href}
                      onClick={closeAllMenus}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      View all {activeCategoryConfig.label} →
                    </Link>
                    <Link
                      to={`/customize?category=${activeMegaCategory}`}
                      onClick={closeAllMenus}
                      className="text-xs font-bold text-slate-700 dark:text-slate-200 underline"
                    >
                      Custom Builder
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Group Trips Accordion */}
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <button
                type="button"
                aria-expanded={mobileExpandedSection === 'group'}
                onClick={() =>
                  setMobileExpandedSection(mobileExpandedSection === 'group' ? null : 'group')
                }
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <span className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">
                    groups
                  </span>
                  <span>Group Trips</span>
                </span>
                <span
                  aria-hidden="true"
                  className={`material-symbols-outlined text-[18px] transition-transform ${
                    mobileExpandedSection === 'group' ? 'rotate-180' : ''
                  }`}
                >
                  expand_more
                </span>
              </button>
              {mobileExpandedSection === 'group' && (
                <div className="px-3 pb-3 space-y-1">
                  {GROUP_TRIP_LINKS.map((item) => (
                    <Link
                      key={item.title}
                      to={item.href}
                      onClick={closeAllMenus}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <span className="material-symbols-outlined text-[17px] text-primary" aria-hidden="true">
                        {item.icon}
                      </span>
                      <span>{item.title}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Direct Quick Links */}
            <div className="grid grid-cols-2 gap-2">
              <Link
                to={seasonalPill.href}
                onClick={closeAllMenus}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-accent/50 bg-accent/5 text-accent dark:text-emerald-400 font-bold text-xs"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  celebration
                </span>
                <span>{seasonalPill.label}</span>
              </Link>
              <Link
                to="/corporate"
                onClick={closeAllMenus}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white font-bold text-xs"
              >
                <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">
                  business_center
                </span>
                <span>Corporate & MICE</span>
              </Link>
            </div>

            {/* Trending + More Links */}
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {[
                { label: 'Trending', href: '/packages?category=trending', icon: 'trending_up' },
                { label: 'Travel Blogs', href: '/blog', icon: 'article' },
                { label: 'About Us', href: '/about', icon: 'info' },
                { label: 'Contact', href: '/contact', icon: 'support_agent' },
              ].map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={closeAllMenus}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="material-symbols-outlined text-[17px] text-slate-400" aria-hidden="true">
                    {link.icon}
                  </span>
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>

            {/* Portals */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
              <Link
                to={isCustomerAuthenticated ? '/my-account' : '/customer/login'}
                onClick={closeAllMenus}
                className="flex-1 text-center py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200"
              >
                {isCustomerAuthenticated ? 'My Account' : 'Customer Login'}
              </Link>
              <Link
                to="/partner/login"
                onClick={closeAllMenus}
                className="flex-1 text-center py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200"
              >
                Partner
              </Link>
              <Link
                to="/login"
                onClick={closeAllMenus}
                className="flex-1 text-center py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200"
              >
                Staff
              </Link>
            </div>

            {/* Primary Mobile CTA */}
            <Link
              to="/customize"
              onClick={closeAllMenus}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-primary to-orange-600 text-white font-extrabold text-sm shadow-lg shadow-primary/25"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                auto_awesome
              </span>
              <span>Plan Custom Trip / Get Quote</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Instant Travel Search Modal (<dialog>) */}
      <GlobalSearchDialog
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        packages={packages}
        masterLocations={masterLocations}
        trendingDestinations={trendingDestinations}
      />
    </>
  );
};
