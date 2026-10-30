import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Archive, Calendar, CalendarRange, CheckSquare, X,
    Loader2, AlertCircle, Check, Filter, Layers, FolderTree,
    ChevronDown, FileText, CheckCircle2, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { getIndianFinancialYear } from '../../utils/gstUtils';
import { downloadInvoicesAsZip, InvoiceCopyType, BatchProgress } from '../../utils/batchInvoiceDownloader';

interface BatchInvoicesDownloadModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedInvoices: any[];
    onClearSelection: () => void;
    companySettings: any;
    financeSettings: any;
    getToken: () => string | null;
    onStartDownload: (progress: BatchProgress) => void;
    onFinishDownload: () => void;
}

type TabMode = 'selected' | 'months' | 'range';

interface MonthOption {
    name: string;
    shortName: string;
    monthIndex: number; // 0-based: 0 = Jan, 11 = Dec
    year: number;
    key: string; // e.g. "2026-04"
}

function formatDateInput(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export const BatchInvoicesDownloadModal: React.FC<BatchInvoicesDownloadModalProps> = ({
    isOpen,
    onClose,
    selectedInvoices,
    onClearSelection,
    companySettings,
    financeSettings,
    getToken,
    onStartDownload,
    onFinishDownload
}) => {
    const now = useMemo(() => new Date(), []);
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentFy = useMemo(() => getIndianFinancialYear(now), [now]);

    // Mode: 'selected' | 'months' | 'range'
    const [tabMode, setTabMode] = useState<TabMode>(selectedInvoices.length > 0 ? 'selected' : 'months');

    // Financial Year for Month selection
    const [selectedFy, setSelectedFy] = useState<string>(currentFy);

    // Multi-month selection (keys: "YYYY-MM")
    const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const [selectedMonthKeys, setSelectedMonthKeys] = useState<Set<string>>(new Set([currentMonthKey]));

    // Custom Date Range
    const [startDate, setStartDate] = useState<string>(
        formatDateInput(new Date(currentYear, currentMonth, 1))
    );
    const [endDate, setEndDate] = useState<string>(formatDateInput(now));

    // Refinement Filters
    const [docTypeFilter, setDocTypeFilter] = useState<string>('All');
    const [statusFilter, setStatusFilter] = useState<string>('Active');

    // Output Configuration
    const [copyType, setCopyType] = useState<InvoiceCopyType>('ORIGINAL');
    const [groupByMonth, setGroupByMonth] = useState<boolean>(true);

    // Live preview & summary
    const [loadingSummary, setLoadingSummary] = useState<boolean>(false);
    const [summary, setSummary] = useState<{
        total_count: number;
        total_taxable: number;
        total_tax: number;
        total_amount: number;
        b2b_count: number;
        b2c_count: number;
    } | null>(null);

    // If user opens modal with selected rows, default to 'selected' tab
    useEffect(() => {
        if (selectedInvoices.length > 0 && tabMode === 'selected') {
            // Already on selected
        } else if (selectedInvoices.length === 0 && tabMode === 'selected') {
            setTabMode('months');
        }
    }, [selectedInvoices.length]);

    // Build the 12 months for the selected Indian Financial Year (Apr to Mar)
    const fyMonths = useMemo<MonthOption[]>(() => {
        const parts = selectedFy.split('-');
        const sYr = 2000 + parseInt(parts[0], 10);
        const eYr = 2000 + parseInt(parts[1], 10);

        const list: { name: string; shortName: string; monthIndex: number; year: number }[] = [
            { name: 'April',     shortName: 'Apr', monthIndex: 3,  year: sYr },
            { name: 'May',       shortName: 'May', monthIndex: 4,  year: sYr },
            { name: 'June',      shortName: 'Jun', monthIndex: 5,  year: sYr },
            { name: 'July',      shortName: 'Jul', monthIndex: 6,  year: sYr },
            { name: 'August',    shortName: 'Aug', monthIndex: 7,  year: sYr },
            { name: 'September', shortName: 'Sep', monthIndex: 8,  year: sYr },
            { name: 'October',   shortName: 'Oct', monthIndex: 9,  year: sYr },
            { name: 'November',  shortName: 'Nov', monthIndex: 10, year: sYr },
            { name: 'December',  shortName: 'Dec', monthIndex: 11, year: sYr },
            { name: 'January',   shortName: 'Jan', monthIndex: 0,  year: eYr },
            { name: 'February',  shortName: 'Feb', monthIndex: 1,  year: eYr },
            { name: 'March',     shortName: 'Mar', monthIndex: 2,  year: eYr },
        ];

        return list.map(m => ({
            ...m,
            key: `${m.year}-${String(m.monthIndex + 1).padStart(2, '0')}`
        }));
    }, [selectedFy]);

    // Effective date boundaries for the query
    const effectiveDates = useMemo<{ start: string; end: string; label: string }>(() => {
        if (tabMode === 'months') {
            if (selectedMonthKeys.size === 0) {
                return { start: `${currentYear}-01-01`, end: formatDateInput(now), label: 'None' };
            }

            // Find all matching month options
            const sortedKeys = Array.from(selectedMonthKeys).sort();
            const firstKey = sortedKeys[0];
            const lastKey = sortedKeys[sortedKeys.length - 1];

            const [firstYr, firstMo] = firstKey.split('-').map(Number);
            const [lastYr, lastMo] = lastKey.split('-').map(Number);

            const startD = new Date(firstYr, firstMo - 1, 1);
            const endD = new Date(lastYr, lastMo, 0); // last day of that month

            let label = '';
            if (selectedMonthKeys.size === 1) {
                label = `${startD.toLocaleString('en-IN', { month: 'long' })} ${firstYr}`;
            } else if (selectedMonthKeys.size === 12) {
                label = `FY ${selectedFy} (Full Year)`;
            } else {
                label = `${startD.toLocaleString('en-IN', { month: 'short' })} ${firstYr} - ${endD.toLocaleString('en-IN', { month: 'short' })} ${lastYr} (${selectedMonthKeys.size} Months)`;
            }

            return {
                start: formatDateInput(startD),
                end: formatDateInput(endD),
                label
            };
        }

        // Custom Date Range
        return {
            start: startDate || '2024-01-01',
            end: endDate || formatDateInput(now),
            label: `${startDate} to ${endDate}`
        };
    }, [tabMode, selectedMonthKeys, selectedFy, startDate, endDate, now, currentYear]);

    // Live preview fetch for months/range modes
    const fetchSummary = useCallback(async () => {
        if (tabMode === 'selected') return;
        setLoadingSummary(true);
        try {
            let url = `/api/invoices/export-query?summary_only=true&start_date=${effectiveDates.start}&end_date=${effectiveDates.end}`;
            if (docTypeFilter !== 'All') url += `&doc_type=${encodeURIComponent(docTypeFilter)}`;
            if (statusFilter !== 'All') url += `&status=${encodeURIComponent(statusFilter)}`;

            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (res.ok) {
                const d = await res.json();
                if (d.summary) {
                    setSummary({
                        total_count: Number(d.summary.total_count || 0),
                        total_taxable: Number(d.summary.total_taxable || 0),
                        total_tax: Number(d.summary.total_tax || 0),
                        total_amount: Number(d.summary.total_amount || 0),
                        b2b_count: Number(d.summary.b2b_count || 0),
                        b2c_count: Number(d.summary.b2c_count || 0)
                    });
                }
            }
        } catch (e) {
            console.error('Failed to fetch invoice summary', e);
        } finally {
            setLoadingSummary(false);
        }
    }, [tabMode, effectiveDates.start, effectiveDates.end, docTypeFilter, statusFilter, getToken]);

    useEffect(() => {
        if (isOpen && tabMode !== 'selected') {
            fetchSummary();
        }
    }, [isOpen, tabMode, fetchSummary]);

    // Month toggling logic
    const handleToggleMonth = (key: string) => {
        setSelectedMonthKeys(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                if (next.size > 1) next.delete(key);
                else toast.info('At least one month must remain selected');
            } else {
                next.add(key);
            }
            return next;
        });
    };

    // Quick Month Presets
    const handleSelectQuarter = (q: 1 | 2 | 3 | 4) => {
        const quarterMonths = q === 1 ? fyMonths.slice(0, 3) :
                              q === 2 ? fyMonths.slice(3, 6) :
                              q === 3 ? fyMonths.slice(6, 9) :
                              fyMonths.slice(9, 12);
        setSelectedMonthKeys(new Set(quarterMonths.map(m => m.key)));
    };

    const handleSelectH1 = () => {
        setSelectedMonthKeys(new Set(fyMonths.slice(0, 6).map(m => m.key)));
    };

    const handleSelectFullFy = () => {
        setSelectedMonthKeys(new Set(fyMonths.map(m => m.key)));
    };

    const handleSelectThisMonth = () => {
        setSelectedMonthKeys(new Set([currentMonthKey]));
    };

    const handleSelectLastMonth = () => {
        const lastMoD = new Date(currentYear, currentMonth - 1, 1);
        const lastKey = `${lastMoD.getFullYear()}-${String(lastMoD.getMonth() + 1).padStart(2, '0')}`;
        setSelectedMonthKeys(new Set([lastKey]));
    };

    // Date Range Presets
    const applyDatePreset = (preset: string) => {
        if (preset === 'today') {
            const t = formatDateInput(now);
            setStartDate(t);
            setEndDate(t);
        } else if (preset === 'last7') {
            const s = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            setStartDate(formatDateInput(s));
            setEndDate(formatDateInput(now));
        } else if (preset === 'this_month') {
            const s = new Date(currentYear, currentMonth, 1);
            const e = new Date(currentYear, currentMonth + 1, 0);
            setStartDate(formatDateInput(s));
            setEndDate(formatDateInput(e));
        } else if (preset === 'last_month') {
            const s = new Date(currentYear, currentMonth - 1, 1);
            const e = new Date(currentYear, currentMonth, 0);
            setStartDate(formatDateInput(s));
            setEndDate(formatDateInput(e));
        } else if (preset === 'this_quarter') {
            const q = currentMonth >= 3 && currentMonth <= 5 ? 1 :
                      currentMonth >= 6 && currentMonth <= 8 ? 2 :
                      currentMonth >= 9 && currentMonth <= 11 ? 3 : 4;
            const fyYr = currentMonth >= 3 ? currentYear : currentYear - 1;
            if (q === 1) { setStartDate(`${fyYr}-04-01`); setEndDate(`${fyYr}-06-30`); }
            else if (q === 2) { setStartDate(`${fyYr}-07-01`); setEndDate(`${fyYr}-09-30`); }
            else if (q === 3) { setStartDate(`${fyYr}-10-01`); setEndDate(`${fyYr}-12-31`); }
            else { setStartDate(`${fyYr + 1}-01-01`); setEndDate(`${fyYr + 1}-03-31`); }
        } else if (preset === 'this_fy') {
            const parts = currentFy.split('-');
            const sYr = 2000 + parseInt(parts[0], 10);
            const eYr = 2000 + parseInt(parts[1], 10);
            setStartDate(`${sYr}-04-01`);
            setEndDate(`${eYr}-03-31`);
        }
    };

    // Execute Download
    const handleDownload = async () => {
        if (tabMode === 'selected') {
            if (selectedInvoices.length === 0) {
                toast.error('No invoices selected');
                return;
            }

            onClose();
            onStartDownload({
                current: 0,
                total: selectedInvoices.length,
                message: 'Preparing selected invoices...',
                percent: 0
            });

            try {
                const res = await downloadInvoicesAsZip({
                    invoices: selectedInvoices,
                    companySettings,
                    financeSettings,
                    copyType,
                    groupByMonth,
                    customZipName: `Invoices_Selected_${selectedInvoices.length}_${formatDateInput(new Date())}`,
                    onProgress: (prog) => onStartDownload(prog),
                    getToken
                });

                if (res.success) {
                    toast.success(`Successfully downloaded ${res.count} invoices in ZIP!`);
                    onClearSelection();
                }
            } catch (err: any) {
                toast.error(err?.message || 'Download failed');
            } finally {
                onFinishDownload();
            }
            return;
        }

        // Mode: Months or Date Range
        const count = summary?.total_count || 0;
        if (count === 0) {
            toast.error('No matching invoices found to download');
            return;
        }

        onClose();
        onStartDownload({
            current: 0,
            total: count,
            message: `Fetching ${count} invoice records from server...`,
            percent: 5
        });

        try {
            let url = `/api/invoices/export-query?start_date=${effectiveDates.start}&end_date=${effectiveDates.end}&include_items=true`;
            if (docTypeFilter !== 'All') url += `&doc_type=${encodeURIComponent(docTypeFilter)}`;
            if (statusFilter !== 'All') url += `&status=${encodeURIComponent(statusFilter)}`;

            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (!response.ok) throw new Error('Failed to fetch invoice details from server');

            const data = await response.json();
            let invoicesToProcess: any[] = data.invoices || [];

            // If in multi-month mode, filter precisely by selectedMonthKeys
            if (tabMode === 'months' && selectedMonthKeys.size > 0 && selectedMonthKeys.size < 12) {
                invoicesToProcess = invoicesToProcess.filter(inv => {
                    const d = new Date(inv.issue_date || inv.created_at);
                    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    return selectedMonthKeys.has(k);
                });
            }

            if (invoicesToProcess.length === 0) {
                toast.info('No documents found for selected month(s)');
                onFinishDownload();
                return;
            }

            const cleanLabel = effectiveDates.label.replace(/[^a-zA-Z0-9_-]/g, '_');
            const customZipName = `Invoices_${cleanLabel}_${copyType.toLowerCase()}`;

            const res = await downloadInvoicesAsZip({
                invoices: invoicesToProcess,
                companySettings,
                financeSettings,
                copyType,
                groupByMonth,
                customZipName,
                onProgress: (prog) => onStartDownload(prog),
                getToken
            });

            if (res.success) {
                if (res.failedCount > 0) {
                    toast.warning(`Downloaded ${res.count} invoices. ${res.failedCount} failed (see report in ZIP).`);
                } else {
                    toast.success(`Successfully downloaded ${res.count} invoices in ZIP!`);
                }
            }
        } catch (err: any) {
            console.error('Batch download error:', err);
            toast.error(err?.message || 'Failed to download batch ZIP');
        } finally {
            onFinishDownload();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 sm:p-7 space-y-6 animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 shadow-inner">
                            <Archive size={22} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">Download Multiple Invoices (ZIP)</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Export invoices by single month, multiple months, custom date range, or table selection.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                    <button
                        type="button"
                        onClick={() => setTabMode('months')}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                            tabMode === 'months'
                                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <Calendar size={15} />
                        <span>By Month(s)</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setTabMode('range')}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                            tabMode === 'range'
                                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <CalendarRange size={15} />
                        <span>Date Range</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setTabMode('selected')}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                            tabMode === 'selected'
                                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <CheckSquare size={15} />
                        <span>Selected ({selectedInvoices.length})</span>
                    </button>
                </div>

                {/* TAB 1: BY MONTH(S) */}
                {tabMode === 'months' && (
                    <div className="space-y-4">
                        {/* FY Header & Quick Selectors */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Financial Year:</span>
                                <select
                                    value={selectedFy}
                                    onChange={e => setSelectedFy(e.target.value)}
                                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white cursor-pointer outline-none focus:ring-2 focus:ring-amber-500"
                                >
                                    <option value="26-27">FY 2026-27</option>
                                    <option value="25-26">FY 2025-26</option>
                                    <option value="24-25">FY 2024-25</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                                <button type="button" onClick={handleSelectThisMonth} className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    This Month
                                </button>
                                <button type="button" onClick={handleSelectLastMonth} className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    Last Month
                                </button>
                                <button type="button" onClick={() => handleSelectQuarter(1)} className="px-2 py-1 text-[11px] font-bold rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                                    Q1
                                </button>
                                <button type="button" onClick={() => handleSelectQuarter(2)} className="px-2 py-1 text-[11px] font-bold rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                                    Q2
                                </button>
                                <button type="button" onClick={() => handleSelectQuarter(3)} className="px-2 py-1 text-[11px] font-bold rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                                    Q3
                                </button>
                                <button type="button" onClick={() => handleSelectQuarter(4)} className="px-2 py-1 text-[11px] font-bold rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                                    Q4
                                </button>
                                <button type="button" onClick={handleSelectFullFy} className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-900 text-amber-400 dark:bg-black">
                                    Full FY
                                </button>
                            </div>
                        </div>

                        {/* Interactive 12 Months Grid */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Select Month(s) <span className="normal-case font-normal text-slate-500">(Click to toggle multi-month selection)</span>
                                </label>
                                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                                    {selectedMonthKeys.size} {selectedMonthKeys.size === 1 ? 'Month' : 'Months'} Selected
                                </span>
                            </div>

                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                {fyMonths.map(m => {
                                    const isSelected = selectedMonthKeys.has(m.key);
                                    return (
                                        <button
                                            key={m.key}
                                            type="button"
                                            onClick={() => handleToggleMonth(m.key)}
                                            className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                                                isSelected
                                                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm font-black ring-2 ring-amber-500/20'
                                                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold'
                                            }`}
                                        >
                                            <p className="text-xs">{m.shortName}</p>
                                            <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-amber-100' : 'text-slate-400'}`}>
                                                {m.year}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: DATE RANGE */}
                {tabMode === 'range' && (
                    <div className="space-y-4">
                        {/* Quick Presets */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Presets:</span>
                            {[
                                { id: 'today', label: 'Today' },
                                { id: 'last7', label: 'Last 7 Days' },
                                { id: 'this_month', label: 'This Month' },
                                { id: 'last_month', label: 'Last Month' },
                                { id: 'this_quarter', label: 'This Quarter' },
                                { id: 'this_fy', label: 'This FY' }
                            ].map(p => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => applyDatePreset(p.id)}
                                    className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        {/* Date Inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                                    Start Date (From)
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                                    End Date (To)
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: SELECTED ROW COUNT */}
                {tabMode === 'selected' && (
                    <div className="p-4 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <CheckSquare className="text-amber-600 dark:text-amber-400" size={20} />
                            <div>
                                <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                                    {selectedInvoices.length} Documents Selected from Table
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                                    Downloads exactly the invoices you checked on the dashboard.
                                </p>
                            </div>
                        </div>
                        {selectedInvoices.length > 0 && (
                            <button
                                type="button"
                                onClick={onClearSelection}
                                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
                            >
                                Clear selection
                            </button>
                        )}
                    </div>
                )}

                {/* Refinement Filters (for Month and Date Range) */}
                {tabMode !== 'selected' && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <Filter size={14} /> Refine Records
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-[11px] font-bold text-slate-400 block mb-1">Document Type</label>
                                <select
                                    value={docTypeFilter}
                                    onChange={e => setDocTypeFilter(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-white cursor-pointer outline-none"
                                >
                                    <option value="All">All Documents (Invoices + Quotes + Notes)</option>
                                    <option value="Invoice">Tax Invoices Only</option>
                                    <option value="Quotation">Quotations Only</option>
                                    <option value="Proforma">Proformas Only</option>
                                    <option value="CreditNote">Credit Notes Only</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-slate-400 block mb-1">Status Filter</label>
                                <select
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-white cursor-pointer outline-none"
                                >
                                    <option value="Active">Active Invoices (Excludes Void)</option>
                                    <option value="Paid">Paid Invoices Only</option>
                                    <option value="Sent">Sent / Pending Only</option>
                                    <option value="All">All Statuses (Including Void)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Live Document Count & Total Value Preview */}
                {tabMode !== 'selected' && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/30 flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                                {loadingSummary ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Matching Invoices Found
                                </p>
                                <p className="text-lg font-black text-slate-900 dark:text-white">
                                    {summary?.total_count || 0} Documents
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-2">
                                        ({effectiveDates.label})
                                    </span>
                                </p>
                            </div>
                        </div>

                        <div className="text-right">
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Total Invoice Value
                            </p>
                            <p className="text-lg font-black text-amber-600 dark:text-amber-400">
                                ₹{Math.round(summary?.total_amount || 0).toLocaleString('en-IN')}
                            </p>
                            <p className="text-[10px] text-slate-400">
                                B2B: {summary?.b2b_count || 0} · B2C: {summary?.b2c_count || 0}
                            </p>
                        </div>
                    </div>
                )}

                {/* Configuration: Copy Type & Subfolders */}
                <div className="space-y-4 pt-2">
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                            Select Invoice Copy Type
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {[
                                { type: 'ORIGINAL' as InvoiceCopyType, title: 'Original Copy', desc: 'Recipient copy' },
                                { type: 'DUPLICATE' as InvoiceCopyType, title: 'Duplicate Copy', desc: 'Supplier audit copy' },
                                { type: 'BOTH' as InvoiceCopyType, title: 'Both Copies', desc: 'Original + Duplicate' },
                            ].map(opt => (
                                <label
                                    key={opt.type}
                                    className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                                        copyType === opt.type
                                            ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-slate-900 dark:text-white ring-2 ring-amber-500/20 font-bold'
                                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold">{opt.title}</span>
                                        <input
                                            type="radio"
                                            name="modalCopyType"
                                            value={opt.type}
                                            checked={copyType === opt.type}
                                            onChange={() => setCopyType(opt.type)}
                                            className="text-amber-500 focus:ring-amber-500 size-3.5"
                                        />
                                    </div>
                                    <span className="text-[11px] text-slate-400 font-normal">{opt.desc}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Organize into Monthly Folders Toggle */}
                    <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors">
                        <input
                            type="checkbox"
                            checked={groupByMonth}
                            onChange={e => setGroupByMonth(e.target.checked)}
                            className="mt-0.5 rounded text-amber-500 focus:ring-amber-500/20 size-4"
                        />
                        <div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-white">
                                <FolderTree size={14} className="text-amber-500" />
                                <span>Organize into monthly subfolders inside ZIP</span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                E.g., files will be placed into <code className="text-amber-600 dark:text-amber-400 font-mono text-[10px]">2026-10_October/</code> folders inside the ZIP archive.
                            </p>
                        </div>
                    </label>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleDownload}
                        disabled={tabMode === 'selected' ? selectedInvoices.length === 0 : (summary?.total_count === 0 || loadingSummary)}
                        className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-xl shadow-lg shadow-amber-500/25 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                    >
                        <Archive size={16} />
                        <span>
                            Download Combined ZIP
                            {tabMode === 'selected'
                                ? ` (${selectedInvoices.length} Invoices)`
                                : summary?.total_count ? ` (${summary.total_count} Invoices)` : ''}
                        </span>
                    </button>
                </div>

            </div>
        </div>
    );
};

