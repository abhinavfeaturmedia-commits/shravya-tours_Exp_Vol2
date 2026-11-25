import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, X } from 'lucide-react';

export interface BrandComboSuggestion {
  value: string;
  label?: string;
  description?: string;
}

export interface BrandComboInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'list'> {
  suggestions: Array<BrandComboSuggestion | string>;
  tone?: 'auto' | 'dark';
  labelText?: string;
  containerClassName?: string;
  hideChevron?: boolean;
}

function normalizeSuggestions(
  items: Array<BrandComboSuggestion | string>
): BrandComboSuggestion[] {
  return items.map((item) =>
    typeof item === 'string' ? { value: item, label: item } : item
  );
}

/**
 * BrandComboInput — Branded free-text + searchable autocomplete suggestion picker
 * replacing browser-native `<input list="...">` + `<datalist>` dropdowns.
 * Supports free typing, filtered desktop floating listbox, and mobile bottom sheet.
 */
export const BrandComboInput = React.forwardRef<HTMLInputElement, BrandComboInputProps>(
  function BrandComboInput(
    {
      suggestions,
      tone = 'auto',
      labelText,
      containerClassName = '',
      className = '',
      style,
      value,
      defaultValue,
      onChange,
      onFocus,
      onBlur,
      onKeyDown,
      disabled = false,
      placeholder,
      hideChevron = false,
      ...rest
    },
    ref
  ) {
    const listboxId = useId();
    const internalRef = useRef<HTMLInputElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const setRefs = useCallback(
      (node: HTMLInputElement | null) => {
        (internalRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
      },
      [ref]
    );

    const isControlled = value !== undefined;
    const [uncontrolledVal, setUncontrolledVal] = useState<string>(() =>
      defaultValue != null ? String(defaultValue) : ''
    );
    const currentValue = isControlled ? String(value ?? '') : uncontrolledVal;

    const [open, setOpen] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const [activeIdx, setActiveIdx] = useState(-1);
    const [isMobile, setIsMobile] = useState(() =>
      typeof window !== 'undefined' ? window.innerWidth < 640 : false
    );
    const [menuPos, setMenuPos] = useState<{
      top?: number;
      bottom?: number;
      left: number;
      width: number;
      maxHeight: number;
      openUp: boolean;
    }>({ left: 0, width: 240, maxHeight: 260, openUp: false });

    const normalized = useMemo(() => normalizeSuggestions(suggestions), [suggestions]);

    const filtered = useMemo(() => {
      if (showAll) return normalized;
      const q = currentValue.trim().toLowerCase();
      if (!q) return normalized;
      const matches = normalized.filter(
        (s) =>
          s.value.toLowerCase().includes(q) ||
          (s.label && s.label.toLowerCase().includes(q)) ||
          (s.description && s.description.toLowerCase().includes(q))
      );
      return matches.length > 0 ? matches : normalized;
    }, [normalized, currentValue, showAll]);

    const resolvedDark = useMemo(() => {
      if (tone === 'dark') return true;
      if (typeof document !== 'undefined') {
        return document.documentElement.classList.contains('dark');
      }
      return false;
    }, [tone, open]);

    useEffect(() => {
      const handleResize = () => setIsMobile(window.innerWidth < 640);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    const updatePosition = useCallback(() => {
      const el = wrapperRef.current;
      if (!el || typeof window === 'undefined') return;
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const width = Math.min(Math.max(rect.width, 230), vw - 24);
      const left = Math.max(12, Math.min(rect.left, vw - width - 12));
      const spaceBelow = vh - rect.bottom - 12;
      const spaceAbove = rect.top - 12;
      const openUp = spaceBelow < 210 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(160, Math.min(280, openUp ? spaceAbove : spaceBelow));
      setMenuPos({
        left,
        width,
        maxHeight,
        openUp,
        top: openUp ? undefined : rect.bottom + 6,
        bottom: openUp ? vh - rect.top + 6 : undefined,
      });
    }, []);

    useEffect(() => {
      if (!open || isMobile) return;
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }, [open, isMobile, updatePosition]);

    useEffect(() => {
      if (!open) return;
      const onPointerDown = (e: MouseEvent | TouchEvent) => {
        const target = e.target as Node;
        if (wrapperRef.current?.contains(target) || menuRef.current?.contains(target)) return;
        setOpen(false);
        setShowAll(false);
      };
      document.addEventListener('mousedown', onPointerDown);
      document.addEventListener('touchstart', onPointerDown);
      return () => {
        document.removeEventListener('mousedown', onPointerDown);
        document.removeEventListener('touchstart', onPointerDown);
      };
    }, [open]);

    const commitValue = useCallback(
      (nextVal: string) => {
        if (!isControlled) setUncontrolledVal(nextVal);
        const inputEl = internalRef.current;
        if (inputEl) {
          const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
          proto?.set?.call(inputEl, nextVal);
          const ev = new Event('input', { bubbles: true });
          inputEl.dispatchEvent(ev);
          const changeEv = new Event('change', { bubbles: true });
          inputEl.dispatchEvent(changeEv);
        }
        onChange?.({
          target: { value: nextVal, name: rest.name || '' } as any,
          currentTarget: { value: nextVal, name: rest.name || '' } as any,
        } as React.ChangeEvent<HTMLInputElement>);
        setOpen(false);
        setShowAll(false);
        setActiveIdx(-1);
      },
      [isControlled, onChange, rest.name]
    );

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!open) setOpen(true);
        setActiveIdx((prev) => (prev + 1 < filtered.length ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!open) setOpen(true);
        setActiveIdx((prev) => (prev - 1 >= 0 ? prev - 1 : filtered.length - 1));
      } else if (e.key === 'Enter' && open && activeIdx >= 0 && filtered[activeIdx]) {
        e.preventDefault();
        commitValue(filtered[activeIdx].value);
      } else if (e.key === 'Escape' && open) {
        e.stopPropagation();
        setOpen(false);
        setShowAll(false);
      }
    };

    const listBody = (
      <div className="p-1.5 space-y-0.5">
        {filtered.map((item, idx) => {
          const isSelected = currentValue === item.value;
          const isActive = activeIdx === idx;
          return (
            <button
              key={`${item.value}-${idx}`}
              type="button"
              role="option"
              aria-selected={isSelected}
              onMouseDown={(e) => {
                e.preventDefault();
                commitValue(item.value);
              }}
              onMouseEnter={() => setActiveIdx(idx)}
              className={`w-full flex items-center justify-between gap-2.5 text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                isSelected
                  ? resolvedDark
                    ? 'bg-[#C9732A]/20 text-amber-300'
                    : 'bg-[#C9732A]/12 text-[#A5581A]'
                  : isActive
                    ? resolvedDark
                      ? 'bg-slate-800 text-white'
                      : 'bg-stone-100 text-stone-900'
                    : resolvedDark
                      ? 'text-slate-200 hover:bg-slate-800/80'
                      : 'text-stone-700 hover:bg-stone-100/80'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate">{item.label || item.value}</div>
                {item.description && (
                  <div className={`text-[10px] truncate ${resolvedDark ? 'text-slate-400' : 'text-stone-400'}`}>
                    {item.description}
                  </div>
                )}
              </div>
              {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-[#C9732A]" />}
            </button>
          );
        })}
      </div>
    );

    const hasWidthFull = !containerClassName && /\bw-full\b/.test(className);

    return (
      <div
        ref={wrapperRef}
        className={`relative ${hasWidthFull ? 'w-full' : 'inline-block'} ${containerClassName}`}
      >
        <input
          {...rest}
          ref={setRefs}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          disabled={disabled}
          placeholder={placeholder}
          value={isControlled ? value : currentValue}
          onChange={(e) => {
            if (!isControlled) setUncontrolledVal(e.target.value);
            setShowAll(false);
            setOpen(true);
            onChange?.(e);
          }}
          onFocus={(e) => {
            setOpen(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            onBlur?.(e);
          }}
          onKeyDown={handleInputKeyDown}
          style={style}
          className={`${className} ${!hideChevron ? 'pr-9' : ''}`}
        />
        {!hideChevron && !disabled && (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Toggle suggestions"
            onMouseDown={(e) => {
              e.preventDefault();
              if (open) {
                setOpen(false);
                setShowAll(false);
              } else {
                setShowAll(true);
                setOpen(true);
                internalRef.current?.focus();
              }
            }}
            className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded transition-transform ${
              open ? 'rotate-180 text-[#C9732A]' : 'text-slate-400 hover:text-[#C9732A]'
            }`}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        )}

        {open &&
          normalized.length > 0 &&
          typeof document !== 'undefined' &&
          createPortal(
            isMobile ? (
              <div
                ref={menuRef}
                className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/50 backdrop-blur-[2px]"
                onMouseDown={(e) => {
                  if (e.target === menuRef.current) {
                    setOpen(false);
                    setShowAll(false);
                  }
                }}
              >
                <div
                  id={listboxId}
                  role="listbox"
                  className={`w-full max-h-[65vh] rounded-t-3xl shadow-2xl border-t flex flex-col overflow-hidden ${
                    resolvedDark
                      ? 'bg-[#0F172A] border-slate-700/80 text-white'
                      : 'bg-[#FBF9F5] border-stone-200 text-stone-900'
                  }`}
                >
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/5 dark:border-white/10">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#C9732A]">
                      {labelText || placeholder || 'Suggestions'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        setShowAll(false);
                      }}
                      className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="overflow-y-auto px-2 pb-6 pt-1">{listBody}</div>
                </div>
              </div>
            ) : (
              <div
                ref={menuRef}
                id={listboxId}
                role="listbox"
                style={{
                  position: 'fixed',
                  left: menuPos.left,
                  width: menuPos.width,
                  top: menuPos.top,
                  bottom: menuPos.bottom,
                  zIndex: 2000,
                }}
                className={`rounded-2xl border shadow-2xl overflow-hidden ${
                  resolvedDark
                    ? 'bg-[#0F172A] border-slate-700/80 text-white shadow-black/50'
                    : 'bg-[#FBF9F5] border-stone-200/90 text-stone-900 shadow-stone-900/10'
                }`}
              >
                <div className="overflow-y-auto" style={{ maxHeight: menuPos.maxHeight }}>
                  {listBody}
                </div>
              </div>
            ),
            document.body
          )}
      </div>
    );
  }
);

export default BrandComboInput;
