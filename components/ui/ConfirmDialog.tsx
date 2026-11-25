import React, { useEffect, useId, useRef, useState } from 'react';

export type ConfirmTone = 'danger' | 'warning' | 'primary';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
}

type ConfirmHandler = (options: ConfirmOptions) => Promise<boolean>;

let globalConfirmHandler: ConfirmHandler | null = null;

/**
 * Imperative confirmation dialog helper replacing window.confirm().
 * Falls back gracefully to native confirm() only if ConfirmProvider is not mounted.
 */
export function confirmAction(options: ConfirmOptions | string): Promise<boolean> {
  const normalized: ConfirmOptions =
    typeof options === 'string'
      ? { title: 'Confirm Action', message: options, confirmLabel: 'Confirm', cancelLabel: 'Cancel', tone: 'danger' }
      : options;

  if (globalConfirmHandler) {
    return globalConfirmHandler(normalized);
  }
  return Promise.resolve(window.confirm(normalized.message));
}

let cachedSupportsDisplayTransition: boolean | undefined;

function canTransitionDisplay(): boolean {
  if (cachedSupportsDisplayTransition !== undefined) return cachedSupportsDisplayTransition;
  if (typeof window === 'undefined' || !window.CSS?.supports?.('transition-behavior', 'allow-discrete') || !document.body) {
    return false;
  }
  const probe = document.createElement('div');
  probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = 'none';
  cachedSupportsDisplayTransition = getComputedStyle(probe).display === 'block';
  probe.remove();
  return cachedSupportsDisplayTransition;
}

function supportsTopLayerExit(): boolean {
  return typeof window !== 'undefined' && Boolean(window.CSS?.supports?.('overlay', 'auto')) && canTransitionDisplay();
}

async function closeTopLayerDialog(el: HTMLDialogElement) {
  if (!el.open) return;
  if (!supportsTopLayerExit()) {
    el.setAttribute('data-closing', '');
    const animations = el.getAnimations({ subtree: true });
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map(a => a.finished)),
        new Promise(r => setTimeout(r, 300)),
      ]);
    }
    if (!el.hasAttribute('data-closing')) return;
    el.removeAttribute('data-closing');
  }
  el.close();
}

const TONE_STYLES: Record<ConfirmTone, { iconBg: string; icon: string; btn: string }> = {
  danger: {
    iconBg: 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400',
    icon: 'warning',
    btn: 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20',
  },
  warning: {
    iconBg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
    icon: 'help',
    btn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20',
  },
  primary: {
    iconBg: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400',
    icon: 'info',
    btn: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20',
  },
};

export const ConfirmProvider: React.FC = () => {
  const [request, setRequest] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();
  const resolvedRef = useRef(false);

  useEffect(() => {
    globalConfirmHandler = (options: ConfirmOptions) => {
      return new Promise<boolean>(resolve => {
        resolvedRef.current = false;
        setRequest({ options, resolve });
      });
    };
    return () => {
      globalConfirmHandler = null;
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!request || !dialog) return;
    if (!dialog.open) {
      dialog.removeAttribute('data-closing');
      dialog.showModal();
    }
  }, [request]);

  const finish = async (result: boolean) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    const dialog = dialogRef.current;
    if (dialog) {
      await closeTopLayerDialog(dialog);
    }
    const pending = request;
    setRequest(null);
    pending?.resolve(result);
  };

  const tone = request?.options.tone || 'danger';
  const style = TONE_STYLES[tone];

  return (
    <dialog
      ref={dialogRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      onCancel={e => {
        e.preventDefault();
        finish(false);
      }}
      onClick={e => {
        if (e.target === dialogRef.current) {
          finish(false);
        }
      }}
      className="confirm-dialog m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0 text-slate-900 dark:text-white shadow-2xl overflow-hidden"
    >
      {request && (
        <div className="p-6">
          <div className="flex items-start gap-3.5">
            <div className={`size-11 rounded-2xl flex items-center justify-center shrink-0 ${style.iconBg}`}>
              <span className="material-symbols-outlined text-[22px]">{style.icon}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-base font-black text-slate-900 dark:text-white leading-snug">
                {request.options.title}
              </h2>
              <p id={descId} className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {request.options.message}
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => finish(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {request.options.cancelLabel || 'Cancel'}
            </button>
            <button
              type="button"
              autoFocus
              onClick={() => finish(true)}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 ${style.btn}`}
            >
              {request.options.confirmLabel || 'Confirm'}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
};
