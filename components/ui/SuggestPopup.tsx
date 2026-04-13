import React, { useState, useEffect, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SuggestAction {
  label: string;
  onClick: () => void;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface SuggestPopupProps {
  /** Unique ID used to persist dismiss/snooze state in localStorage */
  id: string;
  /** Display style */
  variant: 'float' | 'banner' | 'modal';
  /** material-symbols icon name */
  icon: string;
  /** Tailwind color for icon bg, e.g. 'indigo' | 'amber' | 'emerald' | 'red' */
  color?: 'indigo' | 'amber' | 'emerald' | 'red' | 'blue' | 'purple' | 'rose';
  title: string;
  description: string | React.ReactNode;
  primaryAction?: SuggestAction;
  secondaryAction?: SuggestAction;
  /** If set, shows a "Remind me in Xm" snooze button */
  snoozeMinutes?: number;
  /** Auto-dismiss this many ms after showing (for float/banner) */
  autoDismissMs?: number;
  /** Extra classes for the outer wrapper */
  className?: string;
  /** Called when fully dismissed (not snoozed) */
  onDismiss?: () => void;
  /** Override: directly control visibility from parent */
  visible?: boolean;
}

// ─── Utility helpers ─────────────────────────────────────────────────────────

const DISMISS_PREFIX = 'suggest_dismissed_';
const SNOOZE_PREFIX  = 'suggest_snoozed_until_';

export function isDismissed(id: string): boolean {
  return !!localStorage.getItem(DISMISS_PREFIX + id);
}

export function isSnoozed(id: string): boolean {
  const until = localStorage.getItem(SNOOZE_PREFIX + id);
  if (!until) return false;
  return Date.now() < Number(until);
}

export function dismissSuggestion(id: string) {
  localStorage.setItem(DISMISS_PREFIX + id, '1');
}

export function snoozeSuggestion(id: string, minutes: number) {
  const until = Date.now() + minutes * 60_000;
  localStorage.setItem(SNOOZE_PREFIX + id, String(until));
}

export function clearDismiss(id: string) {
  localStorage.removeItem(DISMISS_PREFIX + id);
  localStorage.removeItem(SNOOZE_PREFIX + id);
}

// ─── Color palette mapper ─────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { icon: string; badge: string; glow: string }> = {
  indigo: {
    icon: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
    badge: 'from-indigo-500 to-purple-600',
    glow: 'shadow-indigo-500/20',
  },
  amber: {
    icon: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    badge: 'from-amber-500 to-orange-500',
    glow: 'shadow-amber-500/20',
  },
  emerald: {
    icon: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    badge: 'from-emerald-500 to-teal-500',
    glow: 'shadow-emerald-500/20',
  },
  red: {
    icon: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    badge: 'from-red-500 to-rose-600',
    glow: 'shadow-red-500/20',
  },
  blue: {
    icon: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    badge: 'from-blue-500 to-cyan-500',
    glow: 'shadow-blue-500/20',
  },
  purple: {
    icon: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    badge: 'from-purple-500 to-pink-600',
    glow: 'shadow-purple-500/20',
  },
  rose: {
    icon: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
    badge: 'from-rose-500 to-pink-500',
    glow: 'shadow-rose-500/20',
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export const SuggestPopup: React.FC<SuggestPopupProps> = ({
  id,
  variant,
  icon,
  color = 'indigo',
  title,
  description,
  primaryAction,
  secondaryAction,
  snoozeMinutes,
  autoDismissMs,
  className = '',
  onDismiss,
  visible: visibleProp,
}) => {
  const [visible, setVisible] = useState<boolean>(false);

  // Determine initial visibility
  useEffect(() => {
    if (visibleProp !== undefined) {
      setVisible(visibleProp && !isDismissed(id) && !isSnoozed(id));
    } else {
      setVisible(!isDismissed(id) && !isSnoozed(id));
    }
  }, [id, visibleProp]);

  // Auto-dismiss timer
  useEffect(() => {
    if (!visible || !autoDismissMs) return;
    const t = setTimeout(() => setVisible(false), autoDismissMs);
    return () => clearTimeout(t);
  }, [visible, autoDismissMs]);

  const handleDismiss = useCallback(() => {
    dismissSuggestion(id);
    setVisible(false);
    onDismiss?.();
  }, [id, onDismiss]);

  const handleSnooze = useCallback(() => {
    if (!snoozeMinutes) return;
    snoozeSuggestion(id, snoozeMinutes);
    setVisible(false);
  }, [id, snoozeMinutes]);

  if (!visible) return null;

  const palette = COLOR_MAP[color] ?? COLOR_MAP.indigo;

  // ── BANNER variant ──────────────────────────────────────────────────────
  if (variant === 'banner') {
    return (
      <div
        className={`w-full flex items-center gap-3 px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm animate-in slide-in-from-top-2 duration-300 ${className}`}
      >
        {/* Icon */}
        <div className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${palette.icon}`}>
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{title}</p>
          {typeof description === 'string' ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{description}</p>
          ) : (
            description
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {secondaryAction.label}
            </button>
          )}
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className={`text-xs font-bold text-white px-4 py-1.5 rounded-lg bg-gradient-to-r ${palette.badge} shadow-sm hover:opacity-90 transition-opacity flex items-center gap-1.5`}
            >
              {primaryAction.icon && (
                <span className="material-symbols-outlined text-[13px]">{primaryAction.icon}</span>
              )}
              {primaryAction.label}
            </button>
          )}
          {snoozeMinutes && (
            <button
              onClick={handleSnooze}
              title={`Remind me in ${snoozeMinutes} minutes`}
              className="size-7 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">schedule</span>
            </button>
          )}
          <button
            onClick={handleDismiss}
            title="Dismiss"
            className="size-7 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      </div>
    );
  }

  // ── FLOAT variant ───────────────────────────────────────────────────────
  if (variant === 'float') {
    return (
      <div
        className={`fixed bottom-24 right-6 z-[99] w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl ${palette.glow} border border-slate-100 dark:border-slate-700 animate-in slide-in-from-bottom-4 duration-500 ${className}`}
      >
        {/* Pill header */}
        <div className={`h-1.5 w-full rounded-t-2xl bg-gradient-to-r ${palette.badge}`} />

        <div className="p-4">
          <div className="flex gap-3 items-start">
            {/* Icon */}
            <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${palette.icon}`}>
              <span className="material-symbols-outlined text-[20px]">{icon}</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{title}</p>
              {typeof description === 'string' ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{description}</p>
              ) : (
                description
              )}
            </div>

            {/* Close */}
            <button
              onClick={handleDismiss}
              className="size-6 rounded-full text-slate-300 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors shrink-0 mt-0.5"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          </div>

          {/* Actions */}
          {(primaryAction || secondaryAction || snoozeMinutes) && (
            <div className="flex items-center gap-2 mt-3">
              {primaryAction && (
                <button
                  onClick={primaryAction.onClick}
                  className={`flex-1 py-2 text-xs font-bold text-white rounded-xl bg-gradient-to-r ${palette.badge} shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5`}
                >
                  {primaryAction.icon && (
                    <span className="material-symbols-outlined text-[13px]">{primaryAction.icon}</span>
                  )}
                  {primaryAction.label}
                </button>
              )}
              {secondaryAction && (
                <button
                  onClick={secondaryAction.onClick}
                  className="flex-1 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {secondaryAction.label}
                </button>
              )}
              {snoozeMinutes && !secondaryAction && (
                <button
                  onClick={handleSnooze}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[13px]">schedule</span>
                  Later
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── MODAL variant ───────────────────────────────────────────────────────
  return (
    <div className={`fixed inset-0 z-[210] flex items-center justify-center p-4 ${className}`}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={handleDismiss}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Gradient header bar */}
        <div className={`h-2 w-full bg-gradient-to-r ${palette.badge}`} />

        <div className="p-6">
          {/* Icon + close row */}
          <div className="flex items-start justify-between mb-4">
            <div className={`size-14 rounded-2xl flex items-center justify-center ${palette.icon} shadow-sm`}>
              <span className="material-symbols-outlined text-[28px]">{icon}</span>
            </div>
            <button
              onClick={handleDismiss}
              className="size-8 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Text */}
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 leading-snug">{title}</h3>
          <div className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {description}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2.5 mt-6">
            {primaryAction && (
              <button
                onClick={primaryAction.onClick}
                className={`w-full py-3.5 text-sm font-bold text-white rounded-2xl bg-gradient-to-r ${palette.badge} shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2`}
              >
                {primaryAction.icon && (
                  <span className="material-symbols-outlined text-[16px]">{primaryAction.icon}</span>
                )}
                {primaryAction.label}
              </button>
            )}
            {secondaryAction && (
              <button
                onClick={secondaryAction.onClick}
                className="w-full py-3 text-sm font-bold text-slate-600 dark:text-slate-300 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {secondaryAction.label}
              </button>
            )}
            {snoozeMinutes && (
              <button
                onClick={handleSnooze}
                className="w-full py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                Remind me in {snoozeMinutes} {snoozeMinutes === 1 ? 'minute' : 'minutes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
