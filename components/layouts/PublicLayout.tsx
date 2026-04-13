import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { PillNav, PillNavItem } from '../ui/PillNav';
import { UrgencyNotification } from '../ui/UrgencyNotification';
import { COMPANY_EMAIL, COMPANY_PHONE, COMPANY_PHONE_DISPLAY, COMPANY_ADDRESS } from '../../src/lib/constants';
import { WhatsAppModal } from '../booking/WhatsAppModal';
import { SuggestPopup, isDismissed, isSnoozed, dismissSuggestion, snoozeSuggestion } from '../ui/SuggestPopup';

export const PublicLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);

  // Smart popup state
  const [showExitIntent, setShowExitIntent] = useState(false);
  const [showIdleNudge, setShowIdleNudge] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Seasonal offer — months 5 – 9 (Jun–Sep) = monsoon, rest = general
  const currentMonth = new Date().getMonth();
  const isMonsoon = currentMonth >= 5 && currentMonth <= 9;
  const seasonalId = isMonsoon ? 'seasonal-monsoon-offer' : 'seasonal-winter-offer';
  const seasonalTitle = isMonsoon ? '🌧️ Monsoon Magic Deals!' : '☀️ Peak Season Packages!';
  const seasonalDesc = isMonsoon ? 'Get up to 25% off on select hill station and waterfall packages this monsoon.' : 'Rajasthan, Kerala & Goa packages with exclusive winter pricing. Limited seats!';

  // Exit-intent detector (desktop: mouse leaves viewport top)
  useEffect(() => {
    const EI_ID = 'exit-intent-quote';
    if (isDismissed(EI_ID) || isSnoozed(EI_ID)) return;
    let triggered = false;
    const handleMouseLeave = (e: MouseEvent) => {
      if (triggered) return;
      if (e.clientY > 50) return; // only triggers when cursor moves to top bar area
      triggered = true;
      setShowExitIntent(true);
    };
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [location.pathname]);

  // Idle nudge: after 45s of no interaction, fire once per page
  useEffect(() => {
    const IDLE_ID = 'idle-nudge';
    if (isDismissed(IDLE_ID) || isSnoozed(IDLE_ID)) return;
    const resetTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => setShowIdleNudge(true), 45_000);
    };
    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    events.forEach(e => document.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      events.forEach(e => document.removeEventListener(e, resetTimer));
    };
  }, []);

  const navItems: PillNavItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Destinations', href: '/packages' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'Staff', href: '/admin' },
  ];

  const handlePlaceholder = (e: React.MouseEvent, label: string) => {
    e.preventDefault();
    alert(`${label} page is coming soon!`);
  };

  const handleSocialClick = (platform: string) => {
    alert(`Redirecting to ${platform} profile...`);
  };

  return (
    <div className="flex flex-col min-h-screen font-sans bg-background-light dark:bg-slate-950 selection:bg-primary/30 text-slate-900 dark:text-slate-100">
      <UrgencyNotification />

      <WhatsAppModal isOpen={isWhatsAppOpen} onClose={() => setIsWhatsAppOpen(false)} />

      {/* Floating Navigation */}
      <div className="fixed top-6 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto w-full flex justify-center">
          <PillNav
            logo={<img src="/logo.png" alt="Shravya Tours Logo" className="h-[24px] w-auto object-contain" />}
            logoAlt="Shravya Tours"
            items={navItems}
            activeHref={location.pathname}
          />
        </div>
      </div>

      {/* Floating WhatsApp Button */}
      <button
        onClick={() => setIsWhatsAppOpen(true)}
        className="fixed bottom-6 right-6 z-[100] bg-[#25D366] text-white p-4 rounded-full shadow-2xl shadow-green-500/40 hover:scale-110 active:scale-95 transition-all duration-300 group flex items-center justify-center"
        aria-label="Chat on WhatsApp"
      >
        {/* Using a font icon, assuming material symbols has something similar or sticking to 'chat' */}
        <span className="material-symbols-outlined text-3xl">chat</span>
        <span className="absolute right-full mr-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold px-3 py-2 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Chat with us
        </span>
      </button>

      {/* Main Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* ── Exit-Intent Popup ── */}
      {showExitIntent && (
        <SuggestPopup
          id="exit-intent-quote"
          variant="modal"
          icon="travel_explore"
          color="indigo"
          title="Wait! Get a free custom quote before you go"
          description="Tell us your dream destination and travel dates. Our expert will craft a personalised itinerary — completely free, no obligation."
          primaryAction={{
            label: 'Get My Free Quote',
            icon: 'description',
            onClick: () => { setShowExitIntent(false); navigate('/contact'); }
          }}
          secondaryAction={{
            label: 'Continue browsing',
            onClick: () => setShowExitIntent(false)
          }}
          snoozeMinutes={30}
          onDismiss={() => setShowExitIntent(false)}
        />
      )}

      {/* ── Idle-Time Nudge Float ── */}
      {showIdleNudge && (
        <SuggestPopup
          id="idle-nudge"
          variant="float"
          icon="explore"
          color="blue"
          title="Not sure where to start?"
          description="Browse our most-loved packages or chat with a travel expert for free."
          primaryAction={{
            label: 'Browse Packages',
            icon: 'map',
            onClick: () => { setShowIdleNudge(false); navigate('/packages'); }
          }}
          secondaryAction={{
            label: 'Chat with us',
            onClick: () => { setShowIdleNudge(false); setIsWhatsAppOpen(true); }
          }}
          snoozeMinutes={60}
          autoDismissMs={30_000}
          onDismiss={() => setShowIdleNudge(false)}
        />
      )}

      {/* ── Seasonal Offer Float (bottom-right above WhatsApp) ── */}
      {!isDismissed(seasonalId) && !isSnoozed(seasonalId) && (
        <div className="fixed bottom-24 right-6 z-[90]">
          <SuggestPopup
            id={seasonalId}
            variant="float"
            icon="local_offer"
            color="rose"
            title={seasonalTitle}
            description={seasonalDesc}
            primaryAction={{
              label: 'View Deals',
              icon: 'arrow_forward',
              onClick: () => navigate('/packages')
            }}
            snoozeMinutes={60 * 24 * 3} // 3 days
            autoDismissMs={20_000}
          />
        </div>
      )}
      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 pt-20 border-t border-slate-100 dark:border-slate-800">
        <div className="container mx-auto px-6 lg:px-10 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-1">
              <Link to="/" className="flex items-center gap-2 mb-6 group">
                <img src="/logo.png" alt="Shravya Tours Logo" className="h-10 w-auto object-contain transition-transform duration-500 group-hover:scale-105" />
                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Shravya Tours &amp; Travels</span>
              </Link>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-8 text-sm">
                Your journey begins with a single click. Trusted by 4,500+ travelers for safe, comfortable, and unforgettable journeys.
              </p>
              <div className="flex gap-3">
                {['facebook', 'instagram', 'twitter'].map(social => (
                  <button
                    key={social}
                    onClick={() => handleSocialClick(social)}
                    className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-primary hover:text-white dark:hover:bg-primary dark:hover:text-white transition-all transform hover:scale-110"
                  >
                    <span className="material-symbols-outlined text-[18px]">public</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-6 uppercase text-xs tracking-[0.2em]">Company</h4>
              <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400 font-medium">
                <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
                <li><Link to="/careers" className="hover:text-primary transition-colors">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-6 uppercase text-xs tracking-[0.2em]">Support</h4>
              <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400 font-medium">
                <li><Link to="/contact" className="hover:text-primary transition-colors">Help Center</Link></li>
                <li><Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link to="/cancellation" className="hover:text-primary transition-colors">Cancellation Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-6 uppercase text-xs tracking-[0.2em]">Contact</h4>
              <div className="space-y-4 text-slate-500 dark:text-slate-400 text-sm font-medium">
                <a href={`mailto:${COMPANY_EMAIL}`} className="flex items-center gap-3 hover:text-primary transition-colors"><span className="material-symbols-outlined text-primary text-[20px]">mail</span> {COMPANY_EMAIL}</a>
                {/* Clicking phone number also opens WhatsApp Modal for better lead capture? Or just calls? Keeping as call for now as standard behavior */}
                <a href={`tel:${COMPANY_PHONE}`} className="flex items-center gap-3 hover:text-primary transition-colors"><span className="material-symbols-outlined text-primary text-[20px]">call</span> {COMPANY_PHONE_DISPLAY}</a>
                <p className="flex items-center gap-3"><span className="material-symbols-outlined text-primary text-[20px]">location_on</span> {COMPANY_ADDRESS}</p>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 dark:border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-400">
            <p>© 2025 Shravya Tours Pvt Ltd. All rights reserved.</p>
            <div className="flex gap-6">
              <Link to="/admin" className="hover:text-slate-900 dark:hover:text-white transition-colors">Staff Portal</Link>
              <button onClick={(e) => handlePlaceholder(e, 'Sitemap')} className="hover:text-slate-900 dark:hover:text-white transition-colors">Sitemap</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};