import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react';
import { BrandSelect } from './BrandSelect';

export type BrandDateMode = 'date' | 'datetime-local' | 'time' | 'month';

export interface BrandDatePickerProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> {
  type?: BrandDateMode;
  labelText?: string;
  containerClassName?: string;
  hideIcon?: boolean;
  tone?: 'auto' | 'dark';
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const TIME_PRESETS = ['06:00', '08:00', '09:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseValueParts(val: string, mode: BrandDateMode): { datePart: string; timePart: string } {
  if (!val) return { datePart: '', timePart: '09:00' };
  if (mode === 'time') return { datePart: '', timePart: val.slice(0, 5) || '09:00' };
  if (mode === 'month') return { datePart: `${val.slice(0, 7)}-01`, timePart: '09:00' };
  if (mode === 'datetime-local') {
    const [d, t] = val.split('T');
    return { datePart: d ? d.slice(0, 10) : '', timePart: t ? t.slice(0, 5) : '09:00' };
  }
  return { datePart: val.slice(0, 10), timePart: '09:00' };
}

function formatDisplay(val: string, mode: BrandDateMode, placeholder: string): string {
  if (!val) return placeholder;
  if (mode === 'time') {
    const [hhStr, mmStr] = val.split(':');
    const hh = Number(hhStr);
    const mm = Number(mmStr);
    if (isNaN(hh) || isNaN(mm)) return val;
    const period = hh >= 12 ? 'PM' : 'AM';
    const h12 = hh % 12 === 0 ? 12 : hh % 12;
    return `${h12}:${pad2(mm)} ${period}`;
  }
  if (mode === 'month') {
    const [yStr, mStr] = val.split('-');
    const m = Number(mStr) - 1;
    if (m >= 0 && m < 12 && yStr) return `${MONTHS_SHORT[m]} ${yStr}`;
    return val;
  }
  const { datePart, timePart } = parseValueParts(val, mode);
  if (!datePart) return placeholder;
  const parts = datePart.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return val;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  if (isNaN(d.getTime())) return val;
  const formattedDate = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  if (mode === 'datetime-local') {
    return `${formattedDate} · ${formatDisplay(timePart, 'time', timePart)}`;
  }
  return formattedDate;
}

export const BrandDatePicker = React.forwardRef<HTMLInputElement, BrandDatePickerProps>(
  (
    {
      type = 'date',
      value,
      defaultValue,
      onChange,
      onBlur,
      min,
      max,
      name,
      id,
      disabled,
      required,
      className = '',
      style,
      placeholder,
      labelText,
      containerClassName = '',
      hideIcon = false,
      tone = 'auto',
      ...rest
    },
    forwardedRef
  ) => {
    const autoId = useId();
    const dialogId = `brand-datepicker-${autoId}`;
    const hiddenInputRef = useRef<HTMLInputElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);

    const isControlled = value !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = useState<string>(() =>
      defaultValue !== undefined ? String(defaultValue) : ''
    );

    useEffect(() => {
      if (!isControlled && hiddenInputRef.current) {
        const domVal = hiddenInputRef.current.value;
        if (domVal !== uncontrolledValue) {
          setUncontrolledValue(domVal);
        }
      }
    });

    const currentValue = isControlled ? String(value ?? '') : uncontrolledValue;
    const { datePart, timePart } = useMemo(() => parseValueParts(currentValue, type as BrandDateMode), [currentValue, type]);

    const today = useMemo(() => new Date(), []);
    const todayStr = useMemo(() => toIsoDate(today), [today]);

    const minDateStr = useMemo(() => (min ? String(min).slice(0, 10) : ''), [min]);
    const maxDateStr = useMemo(() => (max ? String(max).slice(0, 10) : ''), [max]);

    const initialView = useMemo(() => {
      const refStr = datePart || (minDateStr && minDateStr > todayStr ? minDateStr : todayStr);
      const [y, m] = refStr.split('-').map(Number);
      if (y && m) return { year: y, month: m - 1 };
      return { year: today.getFullYear(), month: today.getMonth() };
    }, [datePart, minDateStr, todayStr, today]);

    const [viewYear, setViewYear] = useState(initialView.year);
    const [viewMonth, setViewMonth] = useState(initialView.month);
    const [draftTime, setDraftTime] = useState(timePart || '09:00');
    const [isOpen, setIsOpen] = useState(false);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean }>({
      top: 0,
      left: 0,
      placeAbove: false,
    });

    useEffect(() => {
      if (isOpen) {
        setViewYear(initialView.year);
        setViewMonth(initialView.month);
        setDraftTime(timePart || '09:00');
      }
    }, [isOpen, initialView.year, initialView.month, timePart]);

    const setRefs = useCallback(
      (node: HTMLInputElement | null) => {
        hiddenInputRef.current = node;
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef && typeof forwardedRef === 'object') {
          (forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
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
      const panelWidth = type === 'time' ? 280 : 320;
      const approxHeight = type === 'datetime-local' ? 430 : type === 'time' ? 260 : 360;
      const spaceBelow = viewportH - rect.bottom - 12;
      const spaceAbove = rect.top - 12;
      const placeAbove = spaceBelow < approxHeight && spaceAbove > spaceBelow;
      const left = Math.max(8, Math.min(rect.left, viewportW - panelWidth - 8));
      const top = placeAbove ? rect.top - 6 : rect.bottom + 6;
      setCoords({ top, left, placeAbove });
    }, [type]);

    const closePicker = useCallback((restoreFocus = false) => {
      setIsOpen(false);
      if (restoreFocus) {
        requestAnimationFrame(() => triggerRef.current?.focus());
      }
    }, []);

    useEffect(() => {
      if (!isOpen) return;
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      const onDocMouseDown = (e: MouseEvent) => {
        const t = e.target as Node;
        if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
        // Ignore clicks inside portal BrandSelect dropdowns spawned by month/year selectors
        const el = t as HTMLElement;
        if (el.closest?.('[role="listbox"]')) return;
        closePicker(false);
      };
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          closePicker(true);
        }
      };
      document.addEventListener('mousedown', onDocMouseDown);
      document.addEventListener('keydown', onKeyDown, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
        document.removeEventListener('mousedown', onDocMouseDown);
        document.removeEventListener('keydown', onKeyDown, true);
      };
    }, [isOpen, updatePosition, closePicker]);

    const commitValue = useCallback(
      (nextVal: string, keepOpen = false) => {
        if (!isControlled) {
          setUncontrolledValue(nextVal);
        }
        const inputEl = hiddenInputRef.current;
        if (inputEl) {
          inputEl.value = nextVal;
          const evt = new Event('change', { bubbles: true });
          Object.defineProperty(evt, 'target', { writable: false, value: inputEl });
          Object.defineProperty(evt, 'currentTarget', { writable: false, value: inputEl });
          onChange?.(evt as unknown as React.ChangeEvent<HTMLInputElement>);
          onBlur?.({ target: inputEl, currentTarget: inputEl } as unknown as React.FocusEvent<HTMLInputElement>);
        }
        if (!keepOpen) closePicker(true);
      },
      [isControlled, onChange, onBlur, closePicker]
    );

    const isDisabledDate = useCallback(
      (iso: string) => {
        if (minDateStr && iso < minDateStr) return true;
        if (maxDateStr && iso > maxDateStr) return true;
        return false;
      },
      [minDateStr, maxDateStr]
    );

    const calendarCells = useMemo(() => {
      const firstOfMonth = new Date(viewYear, viewMonth, 1);
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      // Monday = 0 .. Sunday = 6
      const startOffset = (firstOfMonth.getDay() + 6) % 7;
      const cells: Array<{ day: number; iso: string; inMonth: boolean }> = [];

      const prevDays = new Date(viewYear, viewMonth, 0).getDate();
      for (let i = startOffset - 1; i >= 0; i--) {
        const d = new Date(viewYear, viewMonth - 1, prevDays - i);
        cells.push({ day: d.getDate(), iso: toIsoDate(d), inMonth: false });
      }
      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(viewYear, viewMonth, day);
        cells.push({ day, iso: toIsoDate(d), inMonth: true });
      }
      while (cells.length < 42) {
        const nextDay = cells.length - (startOffset + daysInMonth) + 1;
        const d = new Date(viewYear, viewMonth + 1, nextDay);
        cells.push({ day: d.getDate(), iso: toIsoDate(d), inMonth: false });
      }
      return cells;
    }, [viewYear, viewMonth]);

    const yearOptions = useMemo(() => {
      const currentY = today.getFullYear();
      const opts: Array<{ value: string; label: string }> = [];
      for (let y = currentY - 85; y <= currentY + 15; y++) {
        opts.push({ value: String(y), label: String(y) });
      }
      return opts;
    }, [today]);

    const monthOptions = useMemo(
      () => MONTHS_SHORT.map((m, idx) => ({ value: String(idx), label: m })),
      []
    );

    const shiftMonth = (delta: number) => {
      const d = new Date(viewYear, viewMonth + delta, 1);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    };

    const handleSelectDate = (iso: string) => {
      if (isDisabledDate(iso)) return;
      if (type === 'datetime-local') {
        commitValue(`${iso}T${draftTime || '09:00'}`, true);
      } else {
        commitValue(iso, false);
      }
    };

    const handleSelectTime = (hhmm: string, closeAfter = false) => {
      setDraftTime(hhmm);
      if (type === 'time') {
        commitValue(hhmm, !closeAfter);
      } else if (type === 'datetime-local') {
        const activeDate = datePart || (minDateStr && minDateStr > todayStr ? minDateStr : todayStr);
        commitValue(`${activeDate}T${hhmm}`, !closeAfter);
      }
    };

    const defaultPlaceholder =
      placeholder ||
      (type === 'time' ? 'Select time' : type === 'month' ? 'Select month' : 'Select date');

    const displayLabel = formatDisplay(currentValue, type as BrandDateMode, defaultPlaceholder);

    const timeHourOptions = useMemo(
      () => Array.from({ length: 24 }, (_, h) => ({ value: pad2(h), label: `${h % 12 === 0 ? 12 : h % 12} ${h >= 12 ? 'PM' : 'AM'}` })),
      []
    );
    const timeMinuteOptions = useMemo(
      () => ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((m) => ({ value: m, label: m })),
      []
    );

    const [curH, curM] = (draftTime || '09:00').split(':');

    const calendarContent = (
      <div className="space-y-3">
        {type === 'month' ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setViewYear((y) => y - 1)}
                aria-label="Previous year"
                className="size-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/10 hover:text-[#C9732A] flex items-center justify-center transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-black text-slate-900 dark:text-white">{viewYear}</span>
              <button
                type="button"
                onClick={() => setViewYear((y) => y + 1)}
                aria-label="Next year"
                className="size-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/10 hover:text-[#C9732A] flex items-center justify-center transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS_SHORT.map((mName, idx) => {
                const isoMonth = `${viewYear}-${pad2(idx + 1)}`;
                const isSelected = currentValue.slice(0, 7) === isoMonth;
                return (
                  <button
                    key={mName}
                    type="button"
                    onClick={() => commitValue(isoMonth, false)}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-gradient-to-br from-[#C9732A] to-amber-600 text-white shadow-md shadow-amber-500/25'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-[#C9732A]'
                    }`}
                  >
                    {mName}
                  </button>
                );
              })}
            </div>
          </>
        ) : type === 'time' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Hour</span>
                <BrandSelect
                  value={curH || '09'}
                  onChange={(e) => handleSelectTime(`${e.target.value}:${curM || '00'}`, false)}
                  options={timeHourOptions}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Minute</span>
                <BrandSelect
                  value={curM || '00'}
                  onChange={(e) => handleSelectTime(`${curH || '09'}:${e.target.value}`, false)}
                  options={timeMinuteOptions}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Quick Times</span>
              <div className="grid grid-cols-2 gap-1.5">
                {TIME_PRESETS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleSelectTime(t, true)}
                    className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all ${
                      draftTime === t
                        ? 'bg-[#C9732A] text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-[#C9732A]'
                    }`}
                  >
                    {formatDisplay(t, 'time', t)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Month / Year Navigation Header */}
            <div className="flex items-center justify-between gap-1.5">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label="Previous month"
                className="size-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/10 hover:text-[#C9732A] text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors shrink-0"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-1.5 flex-1 justify-center">
                <BrandSelect
                  value={String(viewMonth)}
                  onChange={(e) => setViewMonth(Number(e.target.value))}
                  options={monthOptions}
                  searchable={false}
                  aria-label="Select month"
                  className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-black text-slate-900 dark:text-white"
                />
                <BrandSelect
                  value={String(viewYear)}
                  onChange={(e) => setViewYear(Number(e.target.value))}
                  options={yearOptions}
                  searchable={false}
                  aria-label="Select year"
                  className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-black text-slate-900 dark:text-white"
                />
              </div>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label="Next month"
                className="size-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/10 hover:text-[#C9732A] text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors shrink-0"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Weekday Header */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((wd) => (
                <div key={wd} className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 py-1">
                  {wd}
                </div>
              ))}
            </div>

            {/* Day Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((cell) => {
                const isDisabled = isDisabledDate(cell.iso);
                const isSelected = datePart === cell.iso;
                const isToday = todayStr === cell.iso;
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleSelectDate(cell.iso)}
                    className={`h-8 sm:h-8 rounded-xl text-xs font-bold flex items-center justify-center transition-all ${
                      isDisabled
                        ? 'opacity-25 cursor-not-allowed text-slate-400 line-through'
                        : isSelected
                        ? 'bg-gradient-to-br from-[#C9732A] to-amber-600 text-white shadow-md shadow-amber-500/30 font-black scale-[1.03]'
                        : isToday
                        ? 'ring-1 ring-[#C9732A]/70 text-[#C9732A] dark:text-amber-400 font-black hover:bg-amber-500/10'
                        : cell.inMonth
                        ? 'text-slate-800 dark:text-slate-100 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-[#C9732A]'
                        : 'text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            {type === 'datetime-local' && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <Clock size={14} className="text-[#C9732A] shrink-0" />
                <div className="grid grid-cols-2 gap-1.5 flex-1">
                  <BrandSelect
                    value={curH || '09'}
                    onChange={(e) => handleSelectTime(`${e.target.value}:${curM || '00'}`, false)}
                    options={timeHourOptions}
                    searchable={false}
                    aria-label="Select hour"
                    className="w-full px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  />
                  <BrandSelect
                    value={curM || '00'}
                    onChange={(e) => handleSelectTime(`${curH || '09'}:${e.target.value}`, false)}
                    options={timeMinuteOptions}
                    searchable={false}
                    aria-label="Select minute"
                    className="w-full px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* Quick Presets Footer */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5 flex-wrap">
              <div className="flex items-center gap-1.5">
                {(() => {
                  const tomorrow = new Date(today);
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  const tomorrowStr = toIsoDate(tomorrow);
                  return (
                    <>
                      {!isDisabledDate(todayStr) && (
                        <button
                          type="button"
                          onClick={() => handleSelectDate(todayStr)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[#C9732A]/15 hover:text-[#C9732A] text-[11px] font-bold text-slate-600 dark:text-slate-300 transition-colors"
                        >
                          Today
                        </button>
                      )}
                      {!isDisabledDate(tomorrowStr) && (
                        <button
                          type="button"
                          onClick={() => handleSelectDate(tomorrowStr)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[#C9732A]/15 hover:text-[#C9732A] text-[11px] font-bold text-slate-600 dark:text-slate-300 transition-colors"
                        >
                          Tomorrow
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
              <div className="flex items-center gap-1.5 ml-auto">
                {!required && currentValue && (
                  <button
                    type="button"
                    onClick={() => commitValue('', false)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors"
                  >
                    Clear
                  </button>
                )}
                {type === 'datetime-local' && (
                  <button
                    type="button"
                    onClick={() => closePicker(true)}
                    className="px-3 py-1 rounded-lg bg-[#C9732A] text-white text-[11px] font-bold hover:opacity-90 transition-opacity"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );

    const pickerPortal =
      isOpen && typeof document !== 'undefined'
        ? createPortal(
            isMobileViewport ? (
              <div
                className="fixed inset-0 z-[500] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
                onClick={() => closePicker(true)}
              >
                <div
                  ref={panelRef}
                  id={dialogId}
                  role="dialog"
                  aria-modal="true"
                  aria-label={labelText || rest['aria-label'] || defaultPlaceholder}
                  onClick={(e) => e.stopPropagation()}
                  className={`w-full max-w-md border-t rounded-t-3xl shadow-2xl p-4 pb-6 animate-in slide-in-from-bottom-6 duration-200 ${
                    tone === 'dark'
                      ? 'bg-[#0F172A] border-slate-800 text-white'
                      : 'bg-[#FBF9F5] dark:bg-[#0F172A] border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3" />
                  <div className={`flex items-center justify-between gap-2 pb-2.5 mb-3 border-b ${tone === 'dark' ? 'border-slate-800' : 'border-slate-200/70 dark:border-slate-800'}`}>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {labelText || rest['aria-label'] || defaultPlaceholder}
                    </span>
                    <button
                      type="button"
                      onClick={() => closePicker(true)}
                      aria-label="Close calendar"
                      className={`size-8 rounded-full flex items-center justify-center ${tone === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {calendarContent}
                </div>
              </div>
            ) : (
              <div
                ref={panelRef}
                id={dialogId}
                role="dialog"
                aria-modal="false"
                aria-label={labelText || rest['aria-label'] || defaultPlaceholder}
                style={{
                  position: 'fixed',
                  left: `${coords.left}px`,
                  width: type === 'time' ? '280px' : '320px',
                  top: coords.placeAbove ? undefined : `${coords.top}px`,
                  bottom: coords.placeAbove ? `${window.innerHeight - coords.top}px` : undefined,
                }}
                className={`z-[500] border rounded-2xl shadow-2xl p-3.5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 ${
                  tone === 'dark'
                    ? 'bg-[#0F172A] border-slate-700/80 shadow-black/60 text-white'
                    : 'bg-white dark:bg-[#0F172A] border-slate-200/90 dark:border-slate-700/80 shadow-slate-900/15 dark:shadow-black/60'
                }`}
              >
                {calendarContent}
              </div>
            ),
            document.body
          )
        : null;

    return (
      <div className={`relative ${containerClassName || ''}`}>
        {/* Hidden input preserves form data, validation, and react-hook-form bindings */}
        <input
          ref={setRefs}
          type={type}
          name={name}
          min={min}
          max={max}
          value={currentValue}
          onChange={onChange || (() => {})}
          disabled={disabled}
          required={required}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only pointer-events-none"
          {...rest}
        />

        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={isOpen ? dialogId : undefined}
          aria-label={rest['aria-label'] || labelText}
          onClick={() => (isOpen ? closePicker(true) : setIsOpen(true))}
          style={style}
          className={`flex items-center justify-between gap-2 text-left cursor-pointer select-none ${
            disabled ? 'opacity-60 cursor-not-allowed' : ''
          } ${className}`}
        >
          <span className={`truncate ${!currentValue ? 'text-slate-400 font-medium' : ''}`}>{displayLabel}</span>
          {!hideIcon &&
            (type === 'time' ? (
              <Clock
                size={15}
                className={`shrink-0 transition-colors ${isOpen ? 'text-[#C9732A]' : 'text-slate-400'}`}
              />
            ) : (
              <Calendar
                size={15}
                className={`shrink-0 transition-colors ${isOpen ? 'text-[#C9732A]' : 'text-slate-400'}`}
              />
            ))}
        </button>

        {pickerPortal}
      </div>
    );
  }
);

BrandDatePicker.displayName = 'BrandDatePicker';
export default BrandDatePicker;
