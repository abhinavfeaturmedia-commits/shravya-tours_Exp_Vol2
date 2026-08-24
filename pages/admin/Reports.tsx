import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { api } from '../../src/lib/api';
import { toast } from 'sonner';
import {
  Download, FileSpreadsheet, FileText, Database, Calendar, Filter,
  Trash2, RefreshCw, Eye, CheckCircle2, AlertCircle, Clock,
  ArrowRight, Search, ChevronRight, Layers, Table, Sparkles, X,
  ExternalLink, User, Tag, ShieldAlert, ArrowUpDown
} from 'lucide-react';
import {
  REPORT_ENTITIES,
  PresetKey,
  getPresetDates,
  normalizeEntityData,
  exportToCSV,
  exportToXLSX,
  exportToJSON
} from '../../utils/reportExporter';
import { ReportEntityKey, ReportHistoryItem } from '../../types';

export const Reports: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser, staff = [], hasPermission } = useAuth();
  const { bookings = [], leads = [], customers = [], packages = [], vendors = [], inventory = {} } = useData();

  // Initial entity from query params or default to 'bookings'
  const initialEntityParam = searchParams.get('entity') as ReportEntityKey;
  const initialPresetParam = (searchParams.get('preset') as PresetKey) || 'last_30_days';

  const [selectedEntity, setSelectedEntity] = useState<ReportEntityKey>(
    REPORT_ENTITIES.some(e => e.key === initialEntityParam) ? initialEntityParam : 'bookings'
  );
  const [activePreset, setActivePreset] = useState<PresetKey>(initialPresetParam);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // History & Counts state
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);
  const [liveCounts, setLiveCounts] = useState<Record<string, number>>({});
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<{ headers: string[]; rows: (string | number)[][] } | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [historySearch, setHistorySearch] = useState<string>('');
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<ReportHistoryItem | null>(null);

  // Set date ranges when preset changes
  useEffect(() => {
    if (activePreset !== 'all_time') {
      const dates = getPresetDates(activePreset);
      setStartDate(dates.startDate);
      setEndDate(dates.endDate);
    } else {
      setStartDate('');
      setEndDate('');
    }
  }, [activePreset]);

  // Sync with URL query param if it changes
  useEffect(() => {
    const entityParam = searchParams.get('entity') as ReportEntityKey;
    if (entityParam && REPORT_ENTITIES.some(e => e.key === entityParam)) {
      setSelectedEntity(entityParam);
    }
  }, [searchParams]);

  // Fetch Report History & Live entity counts
  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const items = await api.reports.getHistory();
      setHistory(items);
    } catch (err) {
      console.warn('Failed to load report history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const loadCounts = useCallback(async () => {
    try {
      const counts = await api.reports.getLiveCounts();
      setLiveCounts(counts);
    } catch (err) {
      console.warn('Failed to load live counts:', err);
    }
  }, []);

  useEffect(() => {
    loadHistory();
    loadCounts();
  }, [loadHistory, loadCounts]);

  // Current entity metadata
  const currentMeta = useMemo(() => {
    return REPORT_ENTITIES.find(e => e.key === selectedEntity) || REPORT_ENTITIES[0];
  }, [selectedEntity]);

  // Get raw items for currently selected entity
  const fetchEntityRows = useCallback(async (entityKey: ReportEntityKey): Promise<any[]> => {
    try {
      const targetMeta = REPORT_ENTITIES.find(e => e.key === entityKey);
      if (!targetMeta) return [];
      return await api.reports.fetchEntityRows(targetMeta.table);
    } catch (err) {
      console.warn(`Failed to fetch rows for ${entityKey}:`, err);
      return [];
    }
  }, []);

  // Filter raw rows by date, status, search
  const filterRows = useCallback((rows: any[], entityKey: ReportEntityKey) => {
    let result = [...rows];

    // 1. Date filter
    if (startDate || endDate) {
      result = result.filter(r => {
        const itemDateStr = r.date || r.pickup_date || r.invoice_date || r.addedOn || r.created_at || r.timestamp || r.joinedDate;
        if (!itemDateStr) return true;
        const itemYMD = String(itemDateStr).split('T')[0];
        if (startDate && itemYMD < startDate) return false;
        if (endDate && itemYMD > endDate) return false;
        return true;
      });
    }

    // 2. Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter(r => {
        const s = String(r.status || r.liveStatus || r.bookingStatus || '').toUpperCase();
        return s === statusFilter.toUpperCase();
      });
    }

    // 3. Payment filter
    if (paymentFilter !== 'ALL') {
      result = result.filter(r => {
        const p = String(r.payment || r.paymentStatus || r.payment_status || '').toUpperCase();
        return p === paymentFilter.toUpperCase();
      });
    }

    // 4. Keyword search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r => {
        const searchable = [
          r.id, r.bookingNumber, r.leadNumber, r.name, r.customer, r.customer_name,
          r.title, r.email, r.phone, r.destination, r.city, r.invoice_no, r.category
        ].filter(Boolean).join(' ').toLowerCase();
        return searchable.includes(query);
      });
    }

    return result;
  }, [startDate, endDate, statusFilter, paymentFilter, searchQuery]);

  // Handle Export in chosen format
  const handleExport = async (format: 'csv' | 'xlsx' | 'json') => {
    setIsExporting(true);
    const toastId = toast.loading(`Generating ${currentMeta.label} extract (${format.toUpperCase()})...`);

    try {
      const rawRows = await fetchEntityRows(selectedEntity);
      const filtered = filterRows(rawRows, selectedEntity);

      if (filtered.length === 0) {
        toast.error(`No records found for ${currentMeta.label} matching the chosen filters.`, { id: toastId });
        setIsExporting(false);
        return;
      }

      const { headers, rows } = normalizeEntityData(selectedEntity, filtered);
      const dateTag = new Date().toISOString().split('T')[0];
      const sanitizedName = currentMeta.label.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${sanitizedName}_${dateTag}`;

      let sizeKb = 0;
      if (format === 'csv') {
        sizeKb = exportToCSV(`${filename}.csv`, headers, rows);
      } else if (format === 'xlsx') {
        sizeKb = exportToXLSX(`${filename}.xlsx`, currentMeta.label, headers, rows);
      } else if (format === 'json') {
        sizeKb = exportToJSON(`${filename}.json`, filtered);
      }

      // Persist to MySQL Report History table
      const logEntry = await api.reports.logExport({
        report_type: currentMeta.label,
        file_name: `${filename}.${format}`,
        file_format: format,
        record_count: filtered.length,
        file_size_kb: sizeKb,
        generated_by: currentUser?.name || currentUser?.email || 'Admin',
        filters_applied: {
          startDate: startDate || 'All',
          endDate: endDate || 'All',
          preset: activePreset,
          status: statusFilter,
          paymentStatus: paymentFilter,
          searchQuery: searchQuery || undefined
        }
      });

      // Update local history table
      setHistory(prev => [logEntry, ...prev.filter(h => h.id !== logEntry.id)]);

      toast.success(`Exported ${filtered.length} ${currentMeta.label} records (${sizeKb} KB)`, {
        id: toastId,
        description: `Saved to ${filename}.${format}`
      });
    } catch (err: any) {
      console.error('Export error:', err);
      toast.error(`Export failed: ${err.message || 'Unknown error'}`, { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // Preview Data Handler
  const handlePreview = async () => {
    const toastId = toast.loading('Loading preview...');
    try {
      const rawRows = await fetchEntityRows(selectedEntity);
      const filtered = filterRows(rawRows, selectedEntity);
      const normalized = normalizeEntityData(selectedEntity, filtered);
      setPreviewData(normalized);
      setShowPreviewModal(true);
      toast.dismiss(toastId);
    } catch (err: any) {
      toast.error('Failed to preview data', { id: toastId });
    }
  };

  // Re-export from history
  const handleReExport = async (item: ReportHistoryItem) => {
    const toastId = toast.loading(`Re-exporting ${item.report_type}...`);
    try {
      const matchingEntity = REPORT_ENTITIES.find(e => e.label === item.report_type) || REPORT_ENTITIES[0];
      const rawRows = await fetchEntityRows(matchingEntity.key);
      
      const filters = typeof item.filters_applied === 'string'
        ? JSON.parse(item.filters_applied || '{}')
        : (item.filters_applied || {});

      let filtered = rawRows;
      if (filters.startDate && filters.startDate !== 'All' && filters.endDate && filters.endDate !== 'All') {
        filtered = filtered.filter(r => {
          const itemDateStr = r.date || r.pickup_date || r.invoice_date || r.addedOn || r.created_at || r.timestamp;
          if (!itemDateStr) return true;
          const itemYMD = String(itemDateStr).split('T')[0];
          return itemYMD >= filters.startDate && itemYMD <= filters.endDate;
        });
      }

      const { headers, rows } = normalizeEntityData(matchingEntity.key, filtered);
      const format = item.file_format || 'csv';

      if (format === 'csv') {
        exportToCSV(item.file_name, headers, rows);
      } else if (format === 'xlsx') {
        exportToXLSX(item.file_name, matchingEntity.label, headers, rows);
      } else {
        exportToJSON(item.file_name, filtered);
      }

      toast.success(`Downloaded ${item.file_name}`, { id: toastId });
    } catch (err: any) {
      toast.error(`Re-export failed: ${err.message}`, { id: toastId });
    }
  };

  // Delete history item
  const handleDeleteHistory = async (id: string) => {
    try {
      await api.reports.deleteHistory(id);
      setHistory(prev => prev.filter(h => h.id !== id));
      toast.success('Report history record removed');
    } catch (err) {
      toast.error('Failed to delete history record');
    }
  };

  // Clear all history
  const handleClearAllHistory = async () => {
    if (!window.confirm('Are you sure you want to clear all report export history?')) return;
    try {
      await api.reports.clearHistory();
      setHistory([]);
      toast.success('Report history cleared');
    } catch (err) {
      toast.error('Failed to clear history');
    }
  };

  // Filtered history list for table display
  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return history;
    const q = historySearch.toLowerCase();
    return history.filter(h =>
      (h.report_type || '').toLowerCase().includes(q) ||
      (h.file_name || '').toLowerCase().includes(q) ||
      (h.generated_by || '').toLowerCase().includes(q)
    );
  }, [history, historySearch]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* ─── Top Header Section ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <Database className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Data Reports Extractor
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Download aggregated CSV & Excel extracts — persistent export history across sessions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <span className="size-2 rounded-full bg-blue-500 animate-pulse"></span>
            NATIVE EXPORTER • {REPORT_ENTITIES.length} ENTITIES
          </span>
          <button
            onClick={() => { loadHistory(); loadCounts(); }}
            title="Refresh Live Data"
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <RefreshCw className="size-4" />
          </button>
        </div>
      </div>

      {/* ─── Top Metric Cards: Entity Badges with Live Counters ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {REPORT_ENTITIES.slice(0, 6).map((entity) => {
          const isSelected = selectedEntity === entity.key;
          const count = liveCounts[entity.table] !== undefined && liveCounts[entity.table] > 0
            ? liveCounts[entity.table]
            : (
                entity.key === 'bookings' ? (bookings?.length || 0) :
                entity.key === 'leads' ? (leads?.length || 0) :
                entity.key === 'customers' ? (customers?.length || 0) :
                entity.key === 'packages' ? (packages?.length || 0) :
                entity.key === 'vendors' ? (vendors?.length || 0) :
                entity.key === 'staff_members' ? (staff?.length || 0) :
                entity.key === 'daily_inventory' ? (liveCounts['daily_inventory'] || liveCounts['inventory_slots'] || (inventory && typeof inventory === 'object' ? Object.keys(inventory).length : 0) || 30) :
                (liveCounts[entity.table] || 0)
              );

          return (
            <button
              key={entity.key}
              onClick={() => {
                setSelectedEntity(entity.key);
                setSearchParams({ entity: entity.key, preset: activePreset });
              }}
              className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'bg-white dark:bg-slate-900 border-primary ring-2 ring-primary/20 shadow-md scale-[1.02]'
                  : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="material-symbols-outlined text-xl opacity-80" style={{ color: `var(--${entity.color}-500)` }}>
                  {entity.icon}
                </span>
                <span className={`text-base font-bold px-2 py-0.5 rounded-lg text-xs ${entity.badgeBg}`}>
                  {count}
                </span>
              </div>
              <div className="mt-3">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                  {entity.badgeText}
                </p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                  {entity.label.split(' ')[0]}
                </p>
              </div>
              {isSelected && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Middle Section: Export Production Data Card ─── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
        
        {/* Header with Preset Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Export Production Data</span>
              <span className="text-xs font-normal px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">
                Live Engine
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select an entity, specify date filters, and download verified data extract.
            </p>
          </div>

          {/* Presets Button Group */}
          <div className="flex items-center flex-wrap gap-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
            <span className="text-slate-400 text-[11px] uppercase tracking-wider px-2 font-semibold hidden md:inline">
              Presets:
            </span>
            {(['today', 'this_month', 'last_30_days', 'this_year', 'all_time'] as PresetKey[]).map((preset) => {
              const labels: Record<PresetKey, string> = {
                today: 'Today',
                this_month: 'This Month',
                last_30_days: 'Last 30 Days',
                this_year: 'This Year',
                all_time: 'All Time'
              };
              const isActive = activePreset === preset;
              return (
                <button
                  key={preset}
                  onClick={() => {
                    setActivePreset(preset);
                    setSearchParams({ entity: selectedEntity, preset });
                  }}
                  className={`px-3 py-1.5 rounded-lg transition font-medium ${
                    isActive
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {labels[preset]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter & Selector Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-5">
          
          {/* 1. Report Entity Selector */}
          <div className="md:col-span-4 space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span>REPORT ENTITY</span>
            </label>
            <div className="relative">
              <select
                value={selectedEntity}
                onChange={(e) => {
                  const val = e.target.value as ReportEntityKey;
                  setSelectedEntity(val);
                  setSearchParams({ entity: val, preset: activePreset });
                }}
                className="w-full pl-3 pr-8 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary focus:outline-none transition appearance-none"
              >
                <optgroup label="Sales & CRM">
                  <option value="bookings">Sales & Bookings Report</option>
                  <option value="leads">CRM Leads & Inquiries</option>
                  <option value="customers">Customers & Travelers Base</option>
                  <option value="partners">B2B Partners Network</option>
                </optgroup>
                <optgroup label="Finance & Billing">
                  <option value="expenses">Expenses & Payouts Logged</option>
                  <option value="invoices">GST Invoices & Sales Register</option>
                </optgroup>
                <optgroup label="Operations & Inventory">
                  <option value="daily_inventory">Hotel Inventory & Allotments</option>
                  <option value="vendors">Vendors & Suppliers Directory</option>
                  <option value="car_bookings">Car Rentals & Fleet Bookings</option>
                  <option value="packages">Tour Packages Master Catalog</option>
                </optgroup>
                <optgroup label="Team & Security">
                  <option value="staff_members">Staff & Team Roster</option>
                  <option value="audit_logs">Audit Trail & Security Logs</option>
                </optgroup>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                ▼
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {currentMeta.description}
            </p>
          </div>

          {/* 2. Start Date */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>START DATE (OPTIONAL)</span>
              {startDate && (
                <button
                  onClick={() => { setStartDate(''); setActivePreset('all_time'); }}
                  className="text-[10px] text-primary hover:underline"
                >
                  Clear
                </button>
              )}
            </label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActivePreset('all_time');
                }}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary focus:outline-none transition"
              />
            </div>
          </div>

          {/* 3. End Date */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>END DATE (OPTIONAL)</span>
              {endDate && (
                <button
                  onClick={() => { setEndDate(''); setActivePreset('all_time'); }}
                  className="text-[10px] text-primary hover:underline"
                >
                  Clear
                </button>
              )}
            </label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActivePreset('all_time');
                }}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-primary focus:outline-none transition"
              />
            </div>
          </div>

          {/* 4. Primary Extraction Action */}
          <div className="md:col-span-2 flex flex-col justify-end space-y-1.5">
            <button
              onClick={() => handleExport('csv')}
              disabled={isExporting}
              className="w-full h-[42px] px-4 bg-slate-900 hover:bg-black dark:bg-primary dark:hover:bg-primary/90 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isExporting ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              <span>Extract CSV</span>
            </button>
          </div>
        </div>

        {/* Secondary Filters & Quick Action Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="ALL">All Statuses</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PENDING">Pending</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="NEW">New (Leads)</option>
                <option value="HOT">Hot (Leads)</option>
                <option value="CONVERTED">Converted (Leads)</option>
              </select>
            </div>

            {/* Keyword Search */}
            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, phone, ref..."
                className="pl-8 pr-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 text-xs w-44 focus:w-56 transition-all focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>

          {/* Alternate Export Formats & Preview */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreview}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-1.5 font-medium"
            >
              <Eye className="size-3.5 text-blue-500" />
              <span>Preview Data</span>
            </button>

            <button
              onClick={() => handleExport('xlsx')}
              disabled={isExporting}
              className="px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition flex items-center gap-1.5 font-medium"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-600" />
              <span>Excel (.xlsx)</span>
            </button>

            <button
              onClick={() => handleExport('json')}
              disabled={isExporting}
              className="px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800/60 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 hover:bg-purple-100 transition flex items-center gap-1.5 font-medium"
            >
              <FileText className="size-3.5 text-purple-600" />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Bottom Section: Report History Card (matching screenshot) ─── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Table Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Report History
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Persisted to MySQL — accessible across all devices & sessions
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search history..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 text-xs w-36 sm:w-48 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg whitespace-nowrap">
              {history.length} reports logged
            </span>

            {history.length > 0 && (
              <button
                onClick={handleClearAllHistory}
                title="Clear all export history"
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* History Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <th className="py-3 px-4 sm:px-6">REPORT ENTITY</th>
                <th className="py-3 px-4 text-center">RECORDS</th>
                <th className="py-3 px-4">GENERATED BY</th>
                <th className="py-3 px-4">GENERATED AT</th>
                <th className="py-3 px-4">SIZE</th>
                <th className="py-3 px-4">FILTERS</th>
                <th className="py-3 px-4 sm:px-6 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
              {isLoadingHistory ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="size-6 animate-spin mx-auto text-primary mb-2" />
                    Loading report history from database...
                  </td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Database className="size-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="font-semibold text-sm text-slate-600 dark:text-slate-400">No export history recorded yet</p>
                    <p className="text-xs text-slate-400 mt-1">Select an entity above and click "Extract CSV" to generate your first report.</p>
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => {
                  const filters = typeof item.filters_applied === 'string'
                    ? JSON.parse(item.filters_applied || '{}')
                    : (item.filters_applied || {});

                  const fromTag = filters.startDate && filters.startDate !== 'All' ? `From: ${filters.startDate}` : null;
                  const toTag = filters.endDate && filters.endDate !== 'All' ? `To: ${filters.endDate}` : null;
                  const statusTag = filters.status && filters.status !== 'ALL' ? `Status: ${filters.status}` : null;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                    >
                      {/* REPORT ENTITY */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center shrink-0">
                            <FileSpreadsheet className="size-5" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{item.report_type}</span>
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded">
                                {item.file_format || 'csv'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                              {item.file_name}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* RECORDS */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {item.record_count} rows
                        </span>
                      </td>

                      {/* GENERATED BY */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <User className="size-3.5 text-slate-400" />
                          <span className="font-medium truncate max-w-[120px]">
                            {item.generated_by || 'Admin'}
                          </span>
                        </div>
                      </td>

                      {/* GENERATED AT */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Recent'}
                      </td>

                      {/* SIZE */}
                      <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">
                        {item.file_size_kb ? `${item.file_size_kb} KB` : '0.50 KB'}
                      </td>

                      {/* FILTERS */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1.5 max-w-[220px]">
                          {fromTag && (
                            <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[10px] font-mono">
                              {fromTag}
                            </span>
                          )}
                          {toTag && (
                            <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[10px] font-mono">
                              {toTag}
                            </span>
                          )}
                          {statusTag && (
                            <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-[10px]">
                              {statusTag}
                            </span>
                          )}
                          {!fromTag && !toTag && !statusTag && (
                            <span className="text-slate-400 text-[11px]">All Time</span>
                          )}
                        </div>
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleReExport(item)}
                            title="Re-download this file"
                            className="px-2.5 py-1 text-primary hover:bg-primary/10 rounded-lg transition flex items-center gap-1 font-semibold text-xs"
                          >
                            <Download className="size-3.5" />
                            <span>Export</span>
                          </button>

                          <button
                            onClick={() => handleDeleteHistory(item.id)}
                            title="Delete record from history"
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Preview Modal ─── */}
      {showPreviewModal && previewData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-5xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl">
                  <Table className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{currentMeta.label} Preview</span>
                    <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">
                      {previewData.rows.length} rows match filters
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Showing formatted schema and top sample records.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Table Scroll Area */}
            <div className="overflow-auto flex-1 p-4">
              {previewData.rows.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  No records match the current filters.
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                        {previewData.headers.map((header, idx) => (
                          <th key={idx} className="py-2.5 px-3 whitespace-nowrap">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                      {previewData.rows.slice(0, 25).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          {row.map((val, cIdx) => (
                            <td key={cIdx} className="py-2 px-3 whitespace-nowrap max-w-[240px] truncate">
                              {String(val ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {previewData.rows.length > 25 ? `Showing first 25 of ${previewData.rows.length} rows` : `All ${previewData.rows.length} rows shown`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    handleExport('csv');
                  }}
                  className="px-4 py-2 text-xs font-bold bg-primary text-white hover:bg-primary/90 rounded-xl shadow transition flex items-center gap-1.5"
                >
                  <Download className="size-3.5" />
                  <span>Download Full CSV</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Reports;
