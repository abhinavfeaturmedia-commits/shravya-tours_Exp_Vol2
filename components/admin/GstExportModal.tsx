import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    FileSpreadsheet, Download, Calendar, Layers, Filter, CheckCircle2,
    AlertCircle, FileText, X, Loader2, Sparkles, Users, Hash, Check,
    Clock, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import {
    exportConsolidatedGstWorkbook,
    exportGstr1MultiSheetWorkbook,
    exportHsnSacSummaryWorkbook,
    exportClientGstLedgerWorkbook,
    exportMasterGstWorkbook,
    exportDetailedCsvRegister,
    GstInvoiceRecord
} from '../../src/lib/gstExportEngine';
import { getIndianFinancialYear } from '../../utils/gstUtils';

interface GstExportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type PeriodMode = 'preset' | 'month' | 'quarter' | 'fy' | 'year' | 'custom';
type ReportType = 'master' | 'ca_consolidated' | 'gstr1' | 'hsn_sac' | 'party_ledger' | 'detailed_csv';

function formatDateInput(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export const GstExportModal: React.FC<GstExportModalProps> = ({ isOpen, onClose }) => {
    // Current date helpers
    const now = useMemo(() => new Date(), []);
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-based
    const currentFy = useMemo(() => getIndianFinancialYear(now), [now]);
    const currentFyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;

    // Period selection states
    const [periodMode, setPeriodMode] = useState<PeriodMode>('preset');
    const [selectedPreset, setSelectedPreset] = useState<string>('this_month');
    const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
    const [selectedMonthYear, setSelectedMonthYear] = useState<number>(currentYear);
    const [selectedFy, setSelectedFy] = useState<string>(currentFy);
    const [selectedQuarter, setSelectedQuarter] = useState<1 | 2 | 3 | 4>(
        currentMonth >= 3 && currentMonth <= 5 ? 1 :
        currentMonth >= 6 && currentMonth <= 8 ? 2 :
        currentMonth >= 9 && currentMonth <= 11 ? 3 : 4
    );
    const [selectedQuarterFy, setSelectedQuarterFy] = useState<string>(currentFy);
    const [selectedCalYear, setSelectedCalYear] = useState<number>(currentYear);
    const [customStartDate, setCustomStartDate] = useState<string>(
        formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1))
    );
    const [customEndDate, setCustomEndDate] = useState<string>(formatDateInput(now));

    // Refinement Filters
    const [docTypeFilter, setDocTypeFilter] = useState<string>('All');
    const [statusFilter, setStatusFilter] = useState<string>('Active');
    const [gstTypeFilter, setGstTypeFilter] = useState<string>('All');

    // Report Type
    const [reportType, setReportType] = useState<ReportType>('master');

    // Live preview & downloading states
    const [loadingSummary, setLoadingSummary] = useState<boolean>(false);
    const [downloading, setDownloading] = useState<boolean>(false);
    const [summary, setSummary] = useState<{
        total_count: number;
        total_taxable: number;
        total_tax: number;
        total_amount: number;
        b2b_count: number;
        b2c_count: number;
    } | null>(null);

    const getToken = () => localStorage.getItem('shravya_jwt') || localStorage.getItem('token');

    // Calculate effective date range and readable period label
    const { startDate, endDate, periodLabel } = useMemo(() => {
        if (periodMode === 'preset') {
            if (selectedPreset === 'this_month') {
                const s = new Date(currentYear, currentMonth, 1);
                const e = new Date(currentYear, currentMonth + 1, 0);
                return {
                    startDate: formatDateInput(s),
                    endDate: formatDateInput(e),
                    periodLabel: `${s.toLocaleString('en-IN', { month: 'short' })} ${currentYear}`
                };
            }
            if (selectedPreset === 'last_month') {
                const s = new Date(currentYear, currentMonth - 1, 1);
                const e = new Date(currentYear, currentMonth, 0);
                return {
                    startDate: formatDateInput(s),
                    endDate: formatDateInput(e),
                    periodLabel: `${s.toLocaleString('en-IN', { month: 'short' })} ${s.getFullYear()}`
                };
            }
            if (selectedPreset === 'this_quarter') {
                const q = currentMonth >= 3 && currentMonth <= 5 ? 1 :
                          currentMonth >= 6 && currentMonth <= 8 ? 2 :
                          currentMonth >= 9 && currentMonth <= 11 ? 3 : 4;
                const fyYr = currentMonth >= 3 ? currentYear : currentYear - 1;
                if (q === 1) return { startDate: `${fyYr}-04-01`, endDate: `${fyYr}-06-30`, periodLabel: `Q1 FY ${currentFy}` };
                if (q === 2) return { startDate: `${fyYr}-07-01`, endDate: `${fyYr}-09-30`, periodLabel: `Q2 FY ${currentFy}` };
                if (q === 3) return { startDate: `${fyYr}-10-01`, endDate: `${fyYr}-12-31`, periodLabel: `Q3 FY ${currentFy}` };
                return { startDate: `${fyYr + 1}-01-01`, endDate: `${fyYr + 1}-03-31`, periodLabel: `Q4 FY ${currentFy}` };
            }
            if (selectedPreset === 'this_fy') {
                const parts = currentFy.split('-');
                const sYr = 2000 + parseInt(parts[0], 10);
                const eYr = 2000 + parseInt(parts[1], 10);
                return {
                    startDate: `${sYr}-04-01`,
                    endDate: `${eYr}-03-31`,
                    periodLabel: `FY ${currentFy}`
                };
            }
            if (selectedPreset === 'prev_fy') {
                const parts = currentFy.split('-');
                const sYr = 2000 + parseInt(parts[0], 10) - 1;
                const eYr = 2000 + parseInt(parts[1], 10) - 1;
                const prevFyLabel = `${String(sYr).slice(-2)}-${String(eYr).slice(-2)}`;
                return {
                    startDate: `${sYr}-04-01`,
                    endDate: `${eYr}-03-31`,
                    periodLabel: `FY ${prevFyLabel}`
                };
            }
            // All Time
            return {
                startDate: '2023-01-01',
                endDate: formatDateInput(now),
                periodLabel: 'All Time'
            };
        }

        if (periodMode === 'month') {
            const s = new Date(selectedMonthYear, selectedMonth, 1);
            const e = new Date(selectedMonthYear, selectedMonth + 1, 0);
            return {
                startDate: formatDateInput(s),
                endDate: formatDateInput(e),
                periodLabel: `${s.toLocaleString('en-IN', { month: 'short' })} ${selectedMonthYear}`
            };
        }

        if (periodMode === 'quarter') {
            const parts = selectedQuarterFy.split('-');
            const sYr = 2000 + parseInt(parts[0], 10);
            if (selectedQuarter === 1) return { startDate: `${sYr}-04-01`, endDate: `${sYr}-06-30`, periodLabel: `Q1 FY ${selectedQuarterFy}` };
            if (selectedQuarter === 2) return { startDate: `${sYr}-07-01`, endDate: `${sYr}-09-30`, periodLabel: `Q2 FY ${selectedQuarterFy}` };
            if (selectedQuarter === 3) return { startDate: `${sYr}-10-01`, endDate: `${sYr}-12-31`, periodLabel: `Q3 FY ${selectedQuarterFy}` };
            return { startDate: `${sYr + 1}-01-01`, endDate: `${sYr + 1}-03-31`, periodLabel: `Q4 FY ${selectedQuarterFy}` };
        }

        if (periodMode === 'fy') {
            const parts = selectedFy.split('-');
            const sYr = 2000 + parseInt(parts[0], 10);
            const eYr = 2000 + parseInt(parts[1], 10);
            return {
                startDate: `${sYr}-04-01`,
                endDate: `${eYr}-03-31`,
                periodLabel: `FY ${selectedFy}`
            };
        }

        if (periodMode === 'year') {
            return {
                startDate: `${selectedCalYear}-01-01`,
                endDate: `${selectedCalYear}-12-31`,
                periodLabel: `CY ${selectedCalYear}`
            };
        }

        // Custom
        return {
            startDate: customStartDate || '2024-01-01',
            endDate: customEndDate || formatDateInput(now),
            periodLabel: `${customStartDate} to ${customEndDate}`
        };
    }, [
        periodMode, selectedPreset, selectedMonth, selectedMonthYear,
        selectedQuarter, selectedQuarterFy, selectedFy, selectedCalYear,
        customStartDate, customEndDate, currentMonth, currentYear, currentFy, now
    ]);

    // Fetch Live Summary
    const fetchLiveSummary = useCallback(async () => {
        setLoadingSummary(true);
        try {
            let url = `/api/invoices/export-query?summary_only=true&start_date=${startDate}&end_date=${endDate}`;
            if (docTypeFilter !== 'All') url += `&doc_type=${encodeURIComponent(docTypeFilter)}`;
            if (statusFilter !== 'All') url += `&status=${encodeURIComponent(statusFilter)}`;
            if (gstTypeFilter !== 'All') url += `&gst_type=${encodeURIComponent(gstTypeFilter)}`;

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
            console.error('Failed to load export summary', e);
        } finally {
            setLoadingSummary(false);
        }
    }, [startDate, endDate, docTypeFilter, statusFilter, gstTypeFilter]);

    useEffect(() => {
        if (isOpen) {
            fetchLiveSummary();
        }
    }, [isOpen, fetchLiveSummary]);

    // Handle Download Action
    const handleDownload = async () => {
        if (downloading) return;
        setDownloading(true);
        const tid = toast.loading(`Generating ${getReportTitle(reportType)}...`);

        try {
            const needItems = reportType === 'hsn_sac' || reportType === 'master';
            let url = `/api/invoices/export-query?start_date=${startDate}&end_date=${endDate}&include_items=${needItems ? 'true' : 'false'}`;
            if (docTypeFilter !== 'All') url += `&doc_type=${encodeURIComponent(docTypeFilter)}`;
            if (statusFilter !== 'All') url += `&status=${encodeURIComponent(statusFilter)}`;
            if (gstTypeFilter !== 'All') url += `&gst_type=${encodeURIComponent(gstTypeFilter)}`;

            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (!res.ok) throw new Error('Failed to fetch invoice records');

            const d = await res.json();
            const invoices: GstInvoiceRecord[] = d.invoices || [];

            if (invoices.length === 0) {
                toast.info('No documents found matching these dates and filters.', { id: tid });
                setDownloading(false);
                return;
            }

            const cleanPeriodLabel = periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_');

            if (reportType === 'master') {
                exportMasterGstWorkbook(invoices, {
                    filename: `SHRAWELLO_Master_GST_Workbook_${cleanPeriodLabel}.xlsx`,
                    periodLabel
                });
                toast.success(`Exported Master GST Workbook (${invoices.length} docs)!`, { id: tid });
            } else if (reportType === 'ca_consolidated') {
                exportConsolidatedGstWorkbook(invoices, {
                    filename: `Consolidated_GST_Details_SHRAWELLO_${cleanPeriodLabel}.xlsx`,
                    periodLabel
                });
                toast.success(`Exported Consolidated CA Register (${invoices.length} docs)!`, { id: tid });
            } else if (reportType === 'gstr1') {
                exportGstr1MultiSheetWorkbook(invoices, {
                    filename: `GSTR1_Government_Return_${cleanPeriodLabel}.xlsx`,
                    periodLabel
                });
                toast.success(`Exported GSTR-1 Portal Package (${invoices.length} docs)!`, { id: tid });
            } else if (reportType === 'hsn_sac') {
                exportHsnSacSummaryWorkbook(invoices, {
                    filename: `GSTR1_Table12_HSN_SAC_Summary_${cleanPeriodLabel}.xlsx`,
                    periodLabel
                });
                toast.success(`Exported SAC/HSN Wise Summary!`, { id: tid });
            } else if (reportType === 'party_ledger') {
                exportClientGstLedgerWorkbook(invoices, {
                    filename: `Party_GST_Ledger_Summary_${cleanPeriodLabel}.xlsx`,
                    periodLabel
                });
                toast.success(`Exported Party GST Ledger!`, { id: tid });
            } else if (reportType === 'detailed_csv') {
                exportDetailedCsvRegister(invoices, {
                    filename: `SHRAWELLO_Detailed_GST_Register_${cleanPeriodLabel}.csv`,
                    periodLabel
                });
                toast.success(`Exported Detailed CSV Register!`, { id: tid });
            }

            onClose();
        } catch (e: any) {
            console.error('Export error', e);
            toast.error(e.message || 'Export generation failed', { id: tid });
        } finally {
            setDownloading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div
                className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
                onClick={e => e.stopPropagation()}
            >
                {/* Top Header */}
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-850">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
                            <FileSpreadsheet size={22} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold font-display text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                GST & Tax Reports Export Hub
                                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    CA & Portal Ready
                                </span>
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Select your accounting period, report structure, and tax filters for instant compliance download.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Step 1: Period Selection */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Calendar size={14} className="text-amber-500" />
                                1. Choose Reporting Period
                            </label>
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono">
                                📅 {periodLabel} ({startDate} to {endDate})
                            </span>
                        </div>

                        {/* Period Type Navigation Tabs */}
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-semibold">
                            {[
                                { id: 'preset', label: '⚡ Presets' },
                                { id: 'month', label: '📅 By Month' },
                                { id: 'quarter', label: '📊 Quarterly' },
                                { id: 'fy', label: '🏛️ Financial Year' },
                                { id: 'year', label: '📆 Calendar Year' },
                                { id: 'custom', label: '✏️ Custom Range' },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setPeriodMode(tab.id as PeriodMode)}
                                    className={`py-2 px-2.5 rounded-lg transition-all text-center ${
                                        periodMode === tab.id
                                            ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm font-bold'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Period Control Sub-Panels */}
                        <div className="mt-3 p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200/70 dark:border-slate-800">
                            {/* Mode: Presets */}
                            {periodMode === 'preset' && (
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { id: 'this_month', label: 'This Month' },
                                        { id: 'last_month', label: 'Last Month' },
                                        { id: 'this_quarter', label: `This Quarter` },
                                        { id: 'this_fy', label: `This FY (${currentFy})` },
                                        { id: 'prev_fy', label: `Previous FY` },
                                        { id: 'all_time', label: 'All Time' },
                                    ].map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => setSelectedPreset(p.id)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                                selectedPreset === p.id
                                                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/20'
                                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-300'
                                            }`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Mode: By Month */}
                            {periodMode === 'month' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 mb-1 block">Month</label>
                                        <select
                                            value={selectedMonth}
                                            onChange={e => setSelectedMonth(Number(e.target.value))}
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/40"
                                        >
                                            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
                                                <option key={m} value={idx}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 mb-1 block">Year</label>
                                        <select
                                            value={selectedMonthYear}
                                            onChange={e => setSelectedMonthYear(Number(e.target.value))}
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/40"
                                        >
                                            {[2024, 2025, 2026, 2027, 2028].map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Mode: Quarterly */}
                            {periodMode === 'quarter' && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Financial Year:</span>
                                        <select
                                            value={selectedQuarterFy}
                                            onChange={e => setSelectedQuarterFy(e.target.value)}
                                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-white outline-none"
                                        >
                                            <option value="26-27">FY 2026-27</option>
                                            <option value="25-26">FY 2025-26</option>
                                            <option value="24-25">FY 2024-25</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {[
                                            { q: 1, label: 'Q1: Apr – Jun', desc: 'First Quarter' },
                                            { q: 2, label: 'Q2: Jul – Sep', desc: 'Second Quarter' },
                                            { q: 3, label: 'Q3: Oct – Dec', desc: 'Third Quarter' },
                                            { q: 4, label: 'Q4: Jan – Mar', desc: 'Fourth Quarter' },
                                        ].map(item => (
                                            <button
                                                key={item.q}
                                                onClick={() => setSelectedQuarter(item.q as any)}
                                                className={`p-2.5 rounded-xl border text-left transition-all ${
                                                    selectedQuarter === item.q
                                                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-300'
                                                }`}
                                            >
                                                <p className="text-xs font-bold">{item.label}</p>
                                                <p className={`text-[10px] mt-0.5 ${selectedQuarter === item.q ? 'text-amber-100' : 'text-slate-400'}`}>
                                                    {item.desc}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Mode: Financial Year */}
                            {periodMode === 'fy' && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    {[
                                        { fy: '26-27', label: 'FY 2026-27', dates: '1 Apr 2026 – 31 Mar 2027', current: true },
                                        { fy: '25-26', label: 'FY 2025-26', dates: '1 Apr 2025 – 31 Mar 2026' },
                                        { fy: '24-25', label: 'FY 2024-25', dates: '1 Apr 2024 – 31 Mar 2025' },
                                    ].map(item => (
                                        <button
                                            key={item.fy}
                                            onClick={() => setSelectedFy(item.fy)}
                                            className={`p-3 rounded-xl border text-left transition-all ${
                                                selectedFy === item.fy
                                                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-bold">{item.label}</p>
                                                {item.current && (
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                                        selectedFy === item.fy ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                                                    }`}>
                                                        Current
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`text-[10px] mt-1 ${selectedFy === item.fy ? 'text-amber-100' : 'text-slate-400'}`}>
                                                {item.dates}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Mode: Calendar Year */}
                            {periodMode === 'year' && (
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Calendar Year:</span>
                                    <div className="flex gap-2">
                                        {[2024, 2025, 2026, 2027].map(yr => (
                                            <button
                                                key={yr}
                                                onClick={() => setSelectedCalYear(yr)}
                                                className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                                    selectedCalYear === yr
                                                        ? 'bg-amber-500 text-white border-amber-500'
                                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                {yr}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Mode: Custom Range */}
                            {periodMode === 'custom' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 mb-1 block">From Date</label>
                                        <input
                                            type="date"
                                            value={customStartDate}
                                            onChange={e => setCustomStartDate(e.target.value)}
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/40"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 mb-1 block">To Date</label>
                                        <input
                                            type="date"
                                            value={customEndDate}
                                            onChange={e => setCustomEndDate(e.target.value)}
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/40"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Step 2: Report Type Selection */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Layers size={14} className="text-amber-500" />
                                2. Select Report Format
                            </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {REPORT_OPTIONS.map(opt => {
                                const active = reportType === opt.id;
                                return (
                                    <div
                                        key={opt.id}
                                        onClick={() => setReportType(opt.id as ReportType)}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all relative flex flex-col justify-between ${
                                            active
                                                ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/80 hover:border-amber-300 dark:hover:border-slate-600'
                                        }`}
                                    >
                                        {opt.badge && (
                                            <span className={`absolute top-2.5 right-2.5 text-[9px] font-black px-2 py-0.5 rounded-full ${
                                                active ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                                            }`}>
                                                {opt.badge}
                                            </span>
                                        )}
                                        <div>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${
                                                    active ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                                }`}>
                                                    {opt.icon}
                                                </div>
                                                <h4 className="text-xs font-bold text-slate-900 dark:text-white">{opt.title}</h4>
                                            </div>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pr-10">
                                                {opt.description}
                                            </p>
                                        </div>
                                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                            <span>Format: {opt.format}</span>
                                            {active && <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1"><Check size={12}/> Selected</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Step 3: Refinement Filters */}
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-2.5">
                            <Filter size={14} className="text-amber-500" />
                            3. Scope & Refinement Filters
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200/70 dark:border-slate-800 text-xs">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Document Series</label>
                                <select
                                    value={docTypeFilter}
                                    onChange={e => setDocTypeFilter(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none"
                                >
                                    <option value="All">All Documents (Tax + PI + Quotes)</option>
                                    <option value="Invoice">Tax Invoices Only</option>
                                    <option value="Quotation">Quotations Only</option>
                                    <option value="Proforma">Proforma Invoices Only</option>
                                    <option value="CreditNote">Credit Notes Only</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Invoice Status</label>
                                <select
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none"
                                >
                                    <option value="Active">Active & Settled (Exclude Void)</option>
                                    <option value="Paid">Paid Invoices Only</option>
                                    <option value="All">All Statuses (Include Void)</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">GST & Supply Type</label>
                                <select
                                    value={gstTypeFilter}
                                    onChange={e => setGstTypeFilter(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none"
                                >
                                    <option value="All">All Supplies (Intra + Inter)</option>
                                    <option value="CGST_SGST">Intra-State (CGST + SGST MH)</option>
                                    <option value="IGST">Inter-State (IGST)</option>
                                    <option value="B2B">B2B Only (With Client GSTIN)</option>
                                    <option value="B2C">B2C Only (Retail / Walk-in)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Step 4: Real-time Live Preview Badge */}
                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-4 shadow-sm border border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                                {loadingSummary ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="text-xs font-bold text-slate-200">Live Period Preview</p>
                                    <span className="text-[10px] font-semibold text-amber-300">({periodLabel})</span>
                                </div>
                                {loadingSummary ? (
                                    <p className="text-xs text-slate-400 mt-0.5 animate-pulse">Calculating metrics for selected dates...</p>
                                ) : summary ? (
                                    <p className="text-xs text-slate-300 mt-0.5">
                                        Found <strong className="text-white">{summary.total_count} documents</strong> ({summary.b2b_count} B2B · {summary.b2c_count} B2C)
                                    </p>
                                ) : (
                                    <p className="text-xs text-slate-400 mt-0.5">Ready to query</p>
                                )}
                            </div>
                        </div>

                        {summary && !loadingSummary && (
                            <div className="flex items-center gap-3 text-right">
                                <div className="px-3 py-1.5 bg-slate-800/80 rounded-lg border border-slate-700">
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Taxable</p>
                                    <p className="text-xs font-bold text-slate-100 font-mono">
                                        ₹{Math.round(summary.total_taxable).toLocaleString('en-IN')}
                                    </p>
                                </div>
                                <div className="px-3 py-1.5 bg-slate-800/80 rounded-lg border border-slate-700">
                                    <p className="text-[10px] uppercase font-bold text-amber-400">Tax Total</p>
                                    <p className="text-xs font-bold text-amber-300 font-mono">
                                        ₹{Math.round(summary.total_tax).toLocaleString('en-IN')}
                                    </p>
                                </div>
                                <div className="px-3 py-1.5 bg-emerald-950/60 rounded-lg border border-emerald-800/80">
                                    <p className="text-[10px] uppercase font-bold text-emerald-400">Grand Total</p>
                                    <p className="text-xs font-black text-emerald-300 font-mono">
                                        ₹{Math.round(summary.total_amount).toLocaleString('en-IN')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {summary && summary.total_count === 0 && !loadingSummary && (
                        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                            <AlertCircle size={16} className="flex-shrink-0 text-amber-500" />
                            <span>No invoices found for the selected period ({periodLabel}). You can still export an empty template or choose another range like <strong>This FY ({currentFy})</strong> or <strong>All Time</strong>.</span>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-all"
                    >
                        Cancel
                    </button>

                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={handleDownload}
                            disabled={downloading}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
                        >
                            {downloading ? (
                                <>
                                    <Loader2 size={15} className="animate-spin" />
                                    <span>Generating Report...</span>
                                </>
                            ) : (
                                <>
                                    <Download size={15} />
                                    <span>Download {getReportButtonLabel(reportType)}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

function getReportTitle(type: ReportType): string {
    switch (type) {
        case 'master': return 'Master All-in-One GST Workbook';
        case 'ca_consolidated': return 'Consolidated GST Details Register';
        case 'gstr1': return 'GSTR-1 Multi-Sheet Package';
        case 'hsn_sac': return 'HSN/SAC Table 12 Summary';
        case 'party_ledger': return 'Party-wise GST Ledger Summary';
        case 'detailed_csv': return 'Detailed Invoices CSV Register';
    }
}

function getReportButtonLabel(type: ReportType): string {
    switch (type) {
        case 'master': return 'Master Excel (.xlsx)';
        case 'ca_consolidated': return 'Consolidated CA Excel';
        case 'gstr1': return 'GSTR-1 Package (.xlsx)';
        case 'hsn_sac': return 'SAC Summary (.xlsx)';
        case 'party_ledger': return 'Party Ledger (.xlsx)';
        case 'detailed_csv': return 'CSV Register (.csv)';
    }
}

const REPORT_OPTIONS = [
    {
        id: 'master',
        title: 'Master All-in-One GST Workbook',
        badge: 'Recommended',
        icon: <Sparkles size={14} />,
        description: 'Bundles CA sales register, GSTR-1 tables (B2B, B2C, Credit Notes), Table 12 SAC summary, and party ledger in one complete file.',
        format: 'Multi-Tab Excel (.xlsx)'
    },
    {
        id: 'ca_consolidated',
        title: 'Consolidated CA Register',
        badge: 'Auditing Standard',
        icon: <FileSpreadsheet size={14} />,
        description: 'Standard 10-column audited format with CGST, SGST, IGST, Excel SUM formulas, and Source PDF Reference sheet.',
        format: 'Excel (.xlsx)'
    },
    {
        id: 'gstr1',
        title: 'GSTR-1 Government Return',
        badge: 'Portal Ready',
        icon: <Layers size={14} />,
        description: 'Formatted for direct GST portal filing: 4A B2B, 5A B2C Large, 7 B2C Small, 9B Credit Notes, and Table 13 Document Summary.',
        format: 'Multi-Sheet Excel (.xlsx)'
    },
    {
        id: 'hsn_sac',
        title: 'SAC / HSN Wise Summary',
        badge: 'Table 12',
        icon: <Hash size={14} />,
        description: 'Turnover and tax output aggregated by Service Accounting Code (996601 Cab Rental, 998555 Tour Packages, etc.).',
        format: 'Excel (.xlsx)'
    },
    {
        id: 'party_ledger',
        title: 'Client / Party GST Ledger',
        badge: 'Party-wise',
        icon: <Users size={14} />,
        description: 'Detailed client-by-client and GSTIN-by-GSTIN aggregation of turnover, taxes collected, and outstanding balance.',
        format: 'Excel (.xlsx)'
    },
    {
        id: 'detailed_csv',
        title: 'Detailed Invoices Register',
        badge: 'Tally / ERP',
        icon: <FileText size={14} />,
        description: 'Complete flat CSV register with all columns (invoice #, date, client, GSTIN, taxable, taxes, totals, balance) for accounting software.',
        format: 'CSV (.csv)'
    }
];

