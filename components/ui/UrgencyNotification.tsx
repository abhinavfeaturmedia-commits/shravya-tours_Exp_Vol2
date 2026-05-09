import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../../context/DataContext';

// Curated realistic names (Indian travelers) — not random, cycles deterministically
const TRAVELER_NAMES = [
  { name: 'Rahul S.', city: 'Mumbai' },
  { name: 'Priya M.', city: 'Pune' },
  { name: 'Amit K.', city: 'Delhi' },
  { name: 'Sneha R.', city: 'Bangalore' },
  { name: 'Vikram J.', city: 'Ahmedabad' },
  { name: 'Ananya P.', city: 'Hyderabad' },
  { name: 'Rohan D.', city: 'Chennai' },
  { name: 'Kavita N.', city: 'Kolkata' },
];

const ACTIONS = [
  { verb: 'just booked', icon: 'check_circle', color: 'text-emerald-600' },
  { verb: 'is enquiring about', icon: 'help_outline', color: 'text-sky-600' },
  { verb: 'viewed details of', icon: 'visibility', color: 'text-amber-600' },
];

// Random interval between 2–3 minutes (in ms)
const getRandomInterval = () =>
  Math.floor(Math.random() * (3 * 60 * 1000 - 2 * 60 * 1000) + 2 * 60 * 1000);

export const UrgencyNotification: React.FC = () => {
  const { packages } = useData();
  const [visible, setVisible] = useState(false);
  const [notification, setNotification] = useState<{
    traveler: typeof TRAVELER_NAMES[0];
    action: typeof ACTIONS[0];
    pkgName: string;
  } | null>(null);

  const indexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildNotification = () => {
    // Get active packages; fall back to nothing if no packages loaded yet
    const activePackages = packages.filter((p) => p.isActive !== false);
    if (activePackages.length === 0) return null;

    const traveler = TRAVELER_NAMES[indexRef.current % TRAVELER_NAMES.length];
    const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    const pkg = activePackages[Math.floor(Math.random() * activePackages.length)];
    indexRef.current += 1;

    return { traveler, action, pkgName: pkg.title };
  };

  const showNext = () => {
    const notif = buildNotification();
    if (!notif) return;
    setNotification(notif);
    setVisible(true);

    // Auto-hide after 8 seconds
    setTimeout(() => setVisible(false), 8000);

    // Schedule next
    const delay = getRandomInterval();
    intervalRef.current = setTimeout(showNext, delay);
  };

  useEffect(() => {
    if (packages.length === 0) return; // Wait until packages are loaded

    // Initial delay: 30 seconds before first popup
    const initialDelay = setTimeout(() => {
      showNext();
    }, 30_000);

    return () => {
      clearTimeout(initialDelay);
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packages.length]);

  if (!visible || !notification) return null;

  const { traveler, action, pkgName } = notification;

  return (
    <div
      className="fixed bottom-5 left-5 z-[90] flex items-start gap-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg px-4 py-3 max-w-[280px] animate-in slide-in-from-bottom-3 fade-in duration-300"
      role="status"
      aria-live="polite"
    >
      {/* Icon */}
      <div className="shrink-0 mt-0.5 size-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <span className={`material-symbols-outlined text-base ${action.color}`}>
          {action.icon}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mb-0.5 uppercase tracking-wide">
          Just now · {traveler.city}
        </p>
        <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-snug">
          <span className="font-semibold text-slate-900 dark:text-white">{traveler.name}</span>{' '}
          {action.verb}{' '}
          <span className="font-medium text-primary">{pkgName}</span>
        </p>
      </div>

      {/* Dismiss */}
      <button
        onClick={() => setVisible(false)}
        className="shrink-0 -mt-1 -mr-1 size-5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center justify-center"
        aria-label="Dismiss"
      >
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  );
};
