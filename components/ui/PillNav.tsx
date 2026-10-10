import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

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
  items: PillNavItem[];
  activeHref?: string;
  className?: string;
  // Props kept for compatibility
  baseColor?: string;
  pillColor?: string;
  hoveredPillTextColor?: string;
  pillTextColor?: string;
}

const getItemIcon = (label: string) => {
  const l = label.toLowerCase();
  if (l.includes('home')) return 'home';
  if (l.includes('destination') || l.includes('package') || l.includes('tour')) return 'travel_explore';
  if (l.includes('blog')) return 'article';
  if (l.includes('about')) return 'info';
  if (l.includes('contact')) return 'support_agent';
  if (l.includes('account') || l.includes('profile') || l.includes('customer')) return 'account_circle';
  if (l.includes('partner') || l.includes('associate')) return 'handshake';
  if (l.includes('staff') || l.includes('admin') || l.includes('login')) return 'badge';
  if (l.includes('portal')) return 'grid_view';
  return 'explore';
};

export const PillNav: React.FC<PillNavProps> = ({
  logo,
  logoAlt = 'Logo',
  items,
  activeHref,
  className = '',
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileExpandedSection, setMobileExpandedSection] = useState<string | null>('Portals');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navRef = useRef<HTMLElement>(null);

  // Optimized Scroll Handler
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrolled]);

  // Close menus on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setOpenDropdown(null);
  }, [location]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMouseEnter = (label: string) => {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    setOpenDropdown(label);
  };

  const handleMouseLeave = () => {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    dropdownTimeoutRef.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 200);
  };

  const renderLogo = () => {
    if (typeof logo === 'string') {
      return <img src={logo} alt={logoAlt} className="w-6 h-6 object-contain" />;
    }
    return logo;
  };

  return (
    <div className={`relative z-[1000] w-full flex flex-col items-center px-2 sm:px-4 ${className}`}>
      
      {/* Main Dynamic Dock Container */}
      <nav 
        ref={navRef}
        className={`
          transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)
          flex items-center justify-between gap-1 sm:gap-2
          w-fit max-w-[calc(100vw-1.5rem)] mx-auto
          bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/60 dark:border-white/10
          shadow-xl shadow-black/5 dark:shadow-black/25 ring-1 ring-black/5 dark:ring-white/5
          ${isMobileMenuOpen ? 'rounded-[2rem]' : 'rounded-full'}
          ${scrolled ? 'py-1 px-1.5 sm:px-2 shadow-2xl scale-[0.98]' : 'py-1.5 px-2 sm:px-2.5'}
        `}
      >
        {/* Logo Section */}
        <Link 
          to="/" 
          className="flex items-center justify-center size-9 sm:size-10 rounded-full bg-slate-50 dark:bg-slate-800 text-primary shrink-0 hover:scale-105 transition-transform border border-slate-100 dark:border-slate-700/80 p-1"
          aria-label="Home"
        >
          {renderLogo()}
        </Link>

        {/* Desktop Links */}
        <ul className="hidden md:flex flex-nowrap items-center gap-0.5 lg:gap-1 mx-1 shrink-0">
          {items.map((item) => {
            const hasChildren = Boolean(item.children && item.children.length > 0);
            const isChildActive = hasChildren && item.children?.some(c => c.href && (activeHref === c.href || (c.href !== '/' && activeHref?.startsWith(c.href))));
            const isActive = activeHref === item.href || isChildActive;
            const isDropdownOpen = openDropdown === item.label;

            if (hasChildren) {
              return (
                <li 
                  key={item.label} 
                  className="relative shrink-0"
                  onMouseEnter={() => handleMouseEnter(item.label)}
                  onMouseLeave={handleMouseLeave}
                >
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(isDropdownOpen ? null : item.label)}
                    aria-expanded={isDropdownOpen}
                    className={`
                      relative inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-1.5 lg:px-3.5 lg:py-2 rounded-full text-xs lg:text-[13px] font-semibold tracking-tight transition-all duration-200
                      ${isActive 
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm' 
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }
                    `}
                  >
                    <span>{item.label}</span>
                    <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div 
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 p-1.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150 z-50"
                      onMouseEnter={() => handleMouseEnter(item.label)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <div className="space-y-0.5">
                        {item.children?.map((child) => {
                          const isCurrent = activeHref === child.href;
                          const icon = child.icon || getItemIcon(child.label);
                          return (
                            <Link
                              key={child.href}
                              to={child.href || '#'}
                              onClick={() => setOpenDropdown(null)}
                              className={`
                                flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all
                                ${isCurrent 
                                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-xs' 
                                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                }
                              `}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`material-symbols-outlined text-[18px] shrink-0 ${isCurrent ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}>
                                  {icon}
                                </span>
                                <span className="truncate">{child.label}</span>
                              </div>
                              {child.badge && (
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  {child.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </li>
              );
            }

            return (
              <li key={item.href || item.label} className="shrink-0">
                <Link
                  to={item.href || '#'}
                  className={`
                    relative inline-flex items-center justify-center whitespace-nowrap px-2.5 py-1.5 lg:px-3.5 lg:py-2 rounded-full text-xs lg:text-[13px] font-semibold tracking-tight transition-all duration-200
                    ${isActive 
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm' 
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }
                  `}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Mobile Toggle Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden flex items-center justify-center size-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white transition-transform active:scale-95 border border-slate-200 dark:border-slate-700"
          aria-label="Toggle Menu"
        >
          <span className="material-symbols-outlined text-[20px]">
            {isMobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>

        {/* CTA Button (Desktop) - Safely Nestled Inside Curved Cap */}
        <div className="hidden md:block shrink-0 mr-0.5 sm:mr-1">
           <Link 
             to="/contact" 
             className="h-8 lg:h-9 px-3.5 lg:px-4.5 flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r from-primary to-orange-600 hover:from-primary-dark hover:to-orange-700 text-white font-bold text-xs lg:text-[13px] shadow-md shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
           >
              <span>Get Quote</span>
              <span className="material-symbols-outlined text-[15px] opacity-90">arrow_forward</span>
           </Link>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      <div 
        className={`
          md:hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] w-[95%] max-w-sm
          ${isMobileMenuOpen 
            ? 'max-h-[calc(100vh-100px)] opacity-100 mt-2 translate-y-0 overflow-y-auto' 
            : 'max-h-0 opacity-0 mt-0 -translate-y-4 overflow-hidden'
          }
        `}
      >
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 rounded-[2rem] p-3 shadow-2xl ring-1 ring-black/5">
          <ul className="flex flex-col gap-1">
            {items.map((item) => {
              if (item.children && item.children.length > 0) {
                const isExpanded = mobileExpandedSection === item.label;
                return (
                  <li key={item.label} className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => setMobileExpandedSection(isExpanded ? null : item.label)}
                      className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[20px] text-primary">
                          {getItemIcon(item.label)}
                        </span>
                        <span>{item.label}</span>
                      </div>
                      <span className={`material-symbols-outlined text-[18px] text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="pl-6 pr-2 py-1 space-y-1 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl my-1 border border-slate-100 dark:border-slate-800/80">
                        {item.children.map((child) => {
                          const isChildActive = activeHref === child.href;
                          return (
                            <Link
                              key={child.href}
                              to={child.href || '#'}
                              className={`
                                flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all
                                ${isChildActive 
                                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold' 
                                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }
                              `}
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className={`material-symbols-outlined text-[18px] ${isChildActive ? 'text-primary' : 'text-slate-400'}`}>
                                  {child.icon || getItemIcon(child.label)}
                                </span>
                                <span>{child.label}</span>
                              </div>
                              {child.badge && (
                                <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                  {child.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              }

              const isActive = activeHref === item.href;
              const iconName = item.icon || getItemIcon(item.label);
              return (
                <li key={item.href || item.label}>
                  <Link
                    to={item.href || '#'}
                    className={`
                      flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all
                      ${isActive 
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md scale-[1.01]' 
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                      }
                    `}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}>
                        {iconName}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {isActive ? (
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    ) : (
                      <span className="material-symbols-outlined text-[16px] text-slate-300 dark:text-slate-600">chevron_right</span>
                    )}
                  </Link>
                </li>
              );
            })}
            <li className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Link
                to="/contact"
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-primary to-orange-600 text-white font-extrabold text-sm shadow-lg shadow-primary/25 hover:brightness-110 active:scale-[0.98] transition-all"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="material-symbols-outlined text-[18px]">request_quote</span>
                Get Quote
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};