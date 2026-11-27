import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export interface BrandSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}

export interface BrandSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options?: BrandSelectOption[];
  children?: React.ReactNode;
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  hideChevron?: boolean;
  labelText?: string;
  containerClassName?: string;
  tone?: 'auto' | 'dark';
}

function extractText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return extractText(node.props.children);
  }
  return '';
}

function parseOptionsFromChildren(children: React.ReactNode, groupLabel?: string): BrandSelectOption[] {
  const result: BrandSelectOption[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement<any>(child)) return;
    if (child.type === React.Fragment) {
      result.push(...parseOptionsFromChildren(child.props.children, groupLabel));
      return;
    }
    if (child.type === 'optgroup') {
      const lbl = child.props.label || groupLabel;
      result.push(...parseOptionsFromChildren(child.props.children, lbl));
      return;
    }
    if (child.type === 'option') {
      const label = extractText(child.props.children).trim();
      const val = child.props.value !== undefined ? String(child.props.value) : label;
      result.push({
        value: val,
        label: label || val,
        disabled: Boolean(child.props.disabled),
        group: groupLabel,
      });
    }
  });
  return result;
}

export const BrandSelect = React.forwardRef<HTMLSelectElement, BrandSelectProps>(
  (
    {
      options: optionsProp,
      children,
      value,
      defaultValue,
      onChange,
      onBlur,
      name,
      id,
      disabled,
      required,
      className = '',
      style,
      placeholder = 'Select an option',
      searchable,
      searchPlaceholder = 'Search options...',
      hideChevron = false,
      labelText,
      containerClassName = '',
      tone = 'auto',
      ...rest
    },
    forwardedRef
  ) => {
    const autoId = useId();
    const listboxId = `brand-select-listbox-${autoId}`;
    const hiddenSelectRef = useRef<HTMLSelectElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const searchInputRef = useRef<HTMLInputElement | null>(null);

    const parsedOptions = useMemo(() => {
      if (optionsProp && optionsProp.length > 0) return optionsProp;
      return parseOptionsFromChildren(children);
    }, [optionsProp, children]);

    const isControlled = value !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = useState<string>(() => {
      if (defaultValue !== undefined) return String(defaultValue);
      return parsedOptions[0]?.value ?? '';
    });

    // Keep uncontrolled / RHF-reset values synced with the underlying <select>
    useEffect(() => {
      if (!isControlled && hiddenSelectRef.current) {
        const domVal = hiddenSelectRef.current.value;
        if (domVal !== uncontrolledValue) {
          setUncontrolledValue(domVal);
        }
      }
    });

    const currentValue = isControlled ? String(value ?? '') : uncontrolledValue;

    const selectedOption = useMemo(
      () => parsedOptions.find((o) => o.value === currentValue) || parsedOptions[0],
      [parsedOptions, currentValue]
    );

    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left: number; width: number; maxHeight: number; placeAbove: boolean }>({
      top: 0,
      left: 0,
      width: 240,
      maxHeight: 280,
      placeAbove: false,
    });

    const showSearch = searchable ?? parsedOptions.length >= 9;

    const filteredOptions = useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) return parsedOptions;
      return parsedOptions.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
    }, [parsedOptions, query]);

    const setRefs = useCallback(
      (node: HTMLSelectElement | null) => {
        hiddenSelectRef.current = node;
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef && typeof forwardedRef === 'object') {
          (forwardedRef as React.MutableRefObject<HTMLSelectElement | null>).current = node;
        }
      },
      [forwardedRef]
    );

    const updatePosition = useCallback(() => {
      if (!triggerRef.current || typeof window === 'undefined') return;
      const mobile = window.innerWidth < 640;
      setIsMobileViewport(mobile);
      if (mobile) return;

      const rect = triggerRef.current.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const viewportW = window.innerWidth;
      const spaceBelow = viewportH - rect.bottom - 12;
      const spaceAbove = rect.top - 12;
      const placeAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(160, Math.min(320, placeAbove ? spaceAbove - 6 : spaceBelow - 6));
      const desiredWidth = Math.max(rect.width, 210);
      const clampedWidth = Math.min(desiredWidth, viewportW - 16);
      const left = Math.max(8, Math.min(rect.left, viewportW - clampedWidth - 8));
      const top = placeAbove ? rect.top - 6 : rect.bottom + 6;

      setCoords({ top, left, width: clampedWidth, maxHeight, placeAbove });
    }, []);

    const closeMenu = useCallback(
      (restoreFocus = false) => {
        setIsOpen(false);
        setQuery('');
        if (restoreFocus) {
          requestAnimationFrame(() => triggerRef.current?.focus());
        }
      },
      []
    );

    const openMenu = useCallback(() => {
      if (disabled) return;
      updatePosition();
      const currentIdx = Math.max(0, parsedOptions.findIndex((o) => o.value === currentValue));
      setActiveIndex(currentIdx);
      setIsOpen(true);
    }, [disabled, updatePosition, parsedOptions, currentValue]);

    useEffect(() => {
      if (!isOpen) return;
      updatePosition();
      const onResizeOrScroll = () => updatePosition();
      window.addEventListener('resize', onResizeOrScroll);
      window.addEventListener('scroll', onResizeOrScroll, true);
      return () => {
        window.removeEventListener('resize', onResizeOrScroll);
        window.removeEventListener('scroll', onResizeOrScroll, true);
      };
    }, [isOpen, updatePosition]);

    useEffect(() => {
      if (!isOpen) return;
      const timer = window.setTimeout(() => {
        if (showSearch && !isMobileViewport) {
          searchInputRef.current?.focus();
        }
      }, 20);
      const onDocMouseDown = (e: MouseEvent) => {
        const t = e.target as Node;
        if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
        closeMenu(false);
      };
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          closeMenu(true);
        }
      };
      document.addEventListener('mousedown', onDocMouseDown);
      document.addEventListener('keydown', onKeyDown, true);
      return () => {
        window.clearTimeout(timer);
        document.removeEventListener('mousedown', onDocMouseDown);
        document.removeEventListener('keydown', onKeyDown, true);
      };
    }, [isOpen, showSearch, isMobileViewport, closeMenu]);

    const commitValue = useCallback(
      (nextVal: string) => {
        if (!isControlled) {
          setUncontrolledValue(nextVal);
        }
        const selectEl = hiddenSelectRef.current;
        if (selectEl) {
          selectEl.value = nextVal;
          // Dispatch native event or synthetic event compatible with React & react-hook-form
          const nativeEvt = new Event('change', { bubbles: true });
          Object.defineProperty(nativeEvt, 'target', { writable: false, value: selectEl });
          Object.defineProperty(nativeEvt, 'currentTarget', { writable: false, value: selectEl });
          onChange?.(nativeEvt as unknown as React.ChangeEvent<HTMLSelectElement>);
          onBlur?.({
            target: selectEl,
            currentTarget: selectEl,
          } as unknown as React.FocusEvent<HTMLSelectElement>);
        }
        closeMenu(true);
      },
      [isControlled, onChange, onBlur, closeMenu]
    );

    const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen) {
          openMenu();
        } else if (e.key === 'ArrowDown') {
          setActiveIndex((i) => Math.min(filteredOptions.length - 1, i + 1));
        } else if (e.key === 'ArrowUp') {
          setActiveIndex((i) => Math.max(0, i - 1));
        }
      }
    };

    const handlePanelKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (filteredOptions.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => {
          let next = i + 1;
          while (next < filteredOptions.length && filteredOptions[next].disabled) next++;
          return next < filteredOptions.length ? next : i;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => {
          let prev = i - 1;
          while (prev >= 0 && filteredOptions[prev].disabled) prev--;
          return prev >= 0 ? prev : i;
        });
      } else if (e.key === 'Home') {
        e.preventDefault();
        setActiveIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setActiveIndex(filteredOptions.length - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = filteredOptions[activeIndex];
        if (item && !item.disabled) commitValue(item.value);
      }
    };

    // Strip any raw custom select positioning classes that only applied to <select> arrow styling cleanly
    const triggerClasses = [
      'flex items-center justify-between gap-2 text-left cursor-pointer select-none',
      disabled ? 'opacity-60 cursor-not-allowed' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const optionListBody = (
      <div
        className="overflow-y-auto overscroll-contain custom-scrollbar divide-y divide-slate-100/70 dark:divide-slate-800/70 sm:divide-y-0 sm:space-y-0.5"
        style={!isMobileViewport ? { maxHeight: `${coords.maxHeight - (showSearch ? 52 : 0)}px` } : { maxHeight: '55vh' }}
      >
        {filteredOptions.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs font-semibold text-slate-400">No matching options</div>
        ) : (
          filteredOptions.map((opt, idx) => {
            const isSelected = opt.value === currentValue;
            const isActive = idx === activeIndex;
            const prevGroup = idx > 0 ? filteredOptions[idx - 1].group : undefined;
            const showGroupHeader = opt.group && opt.group !== prevGroup;

            return (
              <React.Fragment key={`${opt.value}-${idx}`}>
                {showGroupHeader && (
                  <div className="px-3 pt-2.5 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {opt.group}
                  </div>
                )}
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={opt.disabled}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => !opt.disabled && commitValue(opt.value)}
                  className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 sm:py-2 rounded-xl text-left text-sm sm:text-xs font-semibold transition-all ${
                    opt.disabled
                      ? 'opacity-40 cursor-not-allowed text-slate-400'
                      : isSelected
                      ? tone === 'dark'
                        ? 'bg-amber-500/20 text-amber-300 font-bold'
                        : 'bg-[#C9732A]/12 text-[#C9732A] dark:bg-amber-500/15 dark:text-amber-400 font-bold'
                      : isActive
                      ? tone === 'dark'
                        ? 'bg-white/10 text-white'
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-white'
                      : tone === 'dark'
                      ? 'text-slate-200 hover:bg-white/10'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  <span
                    className={`shrink-0 size-4 rounded-full flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'border-[#C9732A] bg-[#C9732A] text-white dark:border-amber-500 dark:bg-amber-500'
                        : tone === 'dark'
                        ? 'border-white/25 sm:border-transparent sm:bg-transparent'
                        : 'border-slate-300 dark:border-slate-600 sm:border-transparent sm:bg-transparent'
                    }`}
                  >
                    {isSelected && <Check size={11} strokeWidth={3} />}
                  </span>
                </button>
              </React.Fragment>
            );
          })
        )}
      </div>
    );

    const dropdownPanel =
      isOpen && typeof document !== 'undefined'
        ? createPortal(
            isMobileViewport ? (
              <div
                className="fixed inset-0 z-[500] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
                onClick={() => closeMenu(true)}
              >
                <div
                  ref={panelRef}
                  role="listbox"
                  id={listboxId}
                  aria-label={labelText || rest['aria-label'] || placeholder}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={handlePanelKeyDown}
                  className={`w-full rounded-t-3xl shadow-2xl p-4 pb-6 animate-in slide-in-from-bottom-6 duration-200 border-t ${
                    tone === 'dark'
                      ? 'bg-[#0F172A] border-slate-800 text-white'
                      : 'bg-[#FBF9F5] dark:bg-[#0F172A] border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3" />
                  <div className={`flex items-center justify-between gap-2 pb-3 mb-2 border-b ${tone === 'dark' ? 'border-slate-800' : 'border-slate-200/70 dark:border-slate-800'}`}>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {labelText || rest['aria-label'] || placeholder}
                    </span>
                    <button
                      type="button"
                      onClick={() => closeMenu(true)}
                      aria-label="Close options"
                      className={`size-8 rounded-full flex items-center justify-center ${tone === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {showSearch && (
                    <div className="relative mb-2.5">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={query}
                        onChange={(e) => {
                          setQuery(e.target.value);
                          setActiveIndex(0);
                        }}
                        placeholder={searchPlaceholder}
                        className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-[#C9732A]/40 border ${
                          tone === 'dark'
                            ? 'bg-slate-800/90 border-slate-700 text-white'
                            : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                        }`}
                      />
                    </div>
                  )}
                  {optionListBody}
                </div>
              </div>
            ) : (
              <div
                ref={panelRef}
                role="listbox"
                id={listboxId}
                aria-label={labelText || rest['aria-label'] || placeholder}
                onKeyDown={handlePanelKeyDown}
                style={{
                  position: 'fixed',
                  left: `${coords.left}px`,
                  width: `${coords.width}px`,
                  top: coords.placeAbove ? undefined : `${coords.top}px`,
                  bottom: coords.placeAbove ? `${window.innerHeight - coords.top}px` : undefined,
                }}
                className={`z-[500] border rounded-2xl shadow-2xl p-1.5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 ${
                  tone === 'dark'
                    ? 'bg-[#0F172A] border-slate-700/80 shadow-black/60 text-white'
                    : 'bg-white dark:bg-[#0F172A] border-slate-200/90 dark:border-slate-700/80 shadow-slate-900/15 dark:shadow-black/60'
                }`}
              >
                {showSearch && (
                  <div className="relative p-1 mb-1">
                    <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setActiveIndex(0);
                      }}
                      placeholder={searchPlaceholder}
                      className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#C9732A]/40 border ${
                        tone === 'dark'
                          ? 'bg-slate-800/90 border-slate-700 text-white'
                          : 'bg-slate-50 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                      }`}
                    />
                  </div>
                )}
                {optionListBody}
              </div>
            ),
            document.body
          )
        : null;

    return (
      <div className={`relative ${containerClassName || ''}`}>
        {/* Visually hidden native select for form serialization, validation & react-hook-form compatibility */}
        <select
          ref={setRefs}
          name={name}
          value={currentValue}
          onChange={onChange || (() => {})}
          disabled={disabled}
          required={required}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only pointer-events-none"
          {...rest}
        >
          {children
            ? children
            : parsedOptions.map((opt, idx) => (
                <option key={`${opt.value}-${idx}`} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))}
        </select>

        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={disabled}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listboxId : undefined}
          aria-label={rest['aria-label'] || labelText}
          onClick={() => (isOpen ? closeMenu(true) : openMenu())}
          onKeyDown={handleTriggerKeyDown}
          style={style}
          className={triggerClasses}
        >
          <span className={`truncate ${!selectedOption ? 'text-slate-400' : ''}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {!hideChevron && (
            <ChevronDown
              size={16}
              className={`shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#C9732A]' : ''}`}
            />
          )}
        </button>

        {dropdownPanel}
      </div>
    );
  }
);

BrandSelect.displayName = 'BrandSelect';
export default BrandSelect;
