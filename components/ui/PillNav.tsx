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
        <ul className="hidden md:flex items-center gap-1 mx-2">
          {items.map((item) => {
            const isActive = activeHref === item.href;
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={`
                    relative px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300
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
        <div className="hidden md:block">
           <Link to="/contact" className="h-11 px-5 flex items-center justify-center rounded-full bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all hover:-translate-y-0.5 active:translate-y-0">
              Get Quote
           </Link>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      <div 
        className={`
          md:hidden overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] w-[95%] max-w-sm
          ${isMobileMenuOpen ? 'max-h-[400px] opacity-100 mt-2 translate-y-0' : 'max-h-0 opacity-0 mt-0 -translate-y-4'}
        `}
      >
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/20 dark:border-slate-800 rounded-[2rem] p-2 shadow-2xl ring-1 ring-black/5">
          <ul className="flex flex-col gap-1">
            {items.map((item) => {
              const isActive = activeHref === item.href;
              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    className={`
                      flex items-center justify-between px-6 py-4 rounded-2xl text-sm font-bold transition-all
                      ${isActive 
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md' 
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }
                    `}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                    {isActive && <span className="material-symbols-outlined text-[18px]">arrow_right_alt</span>}
                  </Link>
                </li>
              );
            })}
            <li className="mt-1 pt-1 border-t border-slate-100/50 dark:border-slate-800/50">
              <Link
                to="/contact"
                className="w-full flex items-center justify-center px-6 py-3.5 rounded-xl bg-primary text-white font-bold transition-all active:scale-95 shadow-lg shadow-primary/20"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Get Quote
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};