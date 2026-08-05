import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export type PillNavItem = {
  label: string;
  href: string;
  ariaLabel?: string;
};

export interface PillNavProps {
  logo: React.ReactNode | string;
  logoAlt?: string;
  items: PillNavItem[];
  activeHref?: string;
  className?: string;
  // Props kept for compatibility but might not be used in new design
  baseColor?: string;
  pillColor?: string;
  hoveredPillTextColor?: string;
  pillTextColor?: string;
}

const getItemIcon = (label: string) => {
  const l = label.toLowerCase();
  if (l.includes('home')) return 'home';
  if (l.includes('destination') || l.includes('package') || l.includes('tour')) return 'travel_explore';
  if (l.includes('about')) return 'info';
  if (l.includes('contact')) return 'support_agent';
  if (l.includes('account') || l.includes('profile')) return 'account_circle';
  if (l.includes('partner')) return 'handshake';
  if (l.includes('staff') || l.includes('login')) return 'badge';
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
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  // Optimized Scroll Handler
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };
    
    // Passive listener for performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrolled]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const renderLogo = () => {
    if (typeof logo === 'string') {
      return <img src={logo} alt={logoAlt} className="w-6 h-6 object-contain" />;
    }
    return logo;
  };

  return (
    <div className={`relative z-[1000] w-full flex flex-col items-center ${className}`}>
      
      {/* Main Dock Container */}
      <nav 
        className={`
          transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)
          flex items-center justify-between p-1.5
          bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/20 dark:border-white/10
          shadow-xl shadow-black/5 dark:shadow-black/20 ring-1 ring-black/5 dark:ring-white/5
          ${isMobileMenuOpen ? 'rounded-[2rem]' : 'rounded-full'}
          ${scrolled ? 'py-1.5 px-2 w-[90%] max-w-4xl' : 'py-2 px-3 w-[95%] max-w-5xl'}
        `}
      >
        {/* Logo Section */}
        <Link 
          to="/" 
          className="flex items-center justify-center size-10 md:size-11 rounded-full bg-slate-50 dark:bg-slate-800 text-primary shrink-0 hover:scale-105 transition-transform border border-slate-100 dark:border-slate-700"
          aria-label="Home"
        >
          {renderLogo()}
        </Link>

        {/* Desktop Links */}
        <ul className="hidden md:flex flex-nowrap items-center gap-0.5 lg:gap-1 mx-1 lg:mx-2 shrink-0">
          {items.map((item) => {
            const isActive = activeHref === item.href;
            return (
              <li key={item.href} className="shrink-0">
                <Link
                  to={item.href}
                  className={`
                    relative inline-flex items-center justify-center whitespace-nowrap px-3 py-2 lg:px-4 lg:py-2.5 rounded-full text-xs lg:text-sm font-bold tracking-tight transition-all duration-300
                    ${isActive 
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md transform scale-105' 
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
          className="md:hidden flex items-center justify-center size-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white transition-transform active:scale-95 border border-slate-200 dark:border-slate-700"
          aria-label="Toggle Menu"
        >
          <span className="material-symbols-outlined text-[20px]">
            {isMobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>

        {/* CTA Button (Desktop) */}
        <div className="hidden md:block shrink-0">
           <Link to="/contact" className="h-9 lg:h-11 px-3.5 lg:px-5 flex items-center justify-center whitespace-nowrap rounded-full bg-primary text-white font-bold text-xs lg:text-sm shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all hover:-translate-y-0.5 active:translate-y-0">
              Get Quote
           </Link>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      <div 
        className={`
          md:hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] w-[95%] max-w-sm
          ${isMobileMenuOpen 
            ? 'max-h-[calc(100vh-100px)] opacity-100 mt-2 translate-y-0 overflow-y-auto' 
            : 'max-h-0 opacity-0 mt-0 -translate-y-4 overflow-hidden'
          }
        `}
      >
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 rounded-[2rem] p-3 shadow-2xl ring-1 ring-black/5">
          <ul className="flex flex-col gap-1">
            {items.map((item) => {
              const isActive = activeHref === item.href;
              const iconName = getItemIcon(item.label);
              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
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