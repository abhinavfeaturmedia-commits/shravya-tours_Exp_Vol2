import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    FileText, Plus, Search,
    Edit, Trash2, Download, CheckCircle2,
    AlertCircle, Clock, Wallet, ChevronLeft, ChevronRight, Loader2, X, Mail,
    FileSpreadsheet, ArrowRight, Copy, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '../../context/SettingsContext';
import { generateTrueInvoicePDF } from '../../utils/pdfGenerator';
import { ActionMenu } from '../../components/ui/ActionMenu';
import { SendEmailModal } from '../../components/admin/SendEmailModal';
import { getIndianFinancialYear } from '../../utils/gstUtils';

const ConfirmModal: React.FC<{
    open: boolean; title: string; message: string;
    confirmLabel?: string; danger?: boolean;
    onConfirm: () => void; onCancel: () => void;
}> = ({ open, title, message, confirmLabel = 'Delete', danger = true, onConfirm, onCancel }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onCancel}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-start gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                        <AlertCircle size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm">{title}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{message}</p>
                    </div>
                </div>
                <div className="flex gap-2 justify-end">
                    <button onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">Cancel</button>
                    <button onClick={onConfirm} className={`px-4 py-2 text-sm font-bold text-white rounded-xl transition-all ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'}`}>{confirmLabel}</button>
                </div>
            </div>
        </div>
    );
};

const STATUS_COLORS: Record<string, string> = {
    Paid:    'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
    Sent:    'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
    Overdue: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
    Draft:   'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    Void:    'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
};
const STATUS_OPTIONS = ['Draft', 'Sent', 'Paid', 'Overdue', 'Void'];

export const InvoicesDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const bookingIdParam = searchParams.get('booking_id');
    const { settings } = useSettings();
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterDocType, setFilterDocType] = useState('All');
    const [stats, setStats] = useState<any>({ totalRevenue:0, pendingAmount:0, pendingCount:0, overdueAmount:0, overdueCount:0, paidThisMonthCount:0, paidThisMonthAmount:0, totalCount:0 });
    const [page, setPage] = useState(1);
    const [totalRows, setTotalRows] = useState(0);
    const limit = 25;
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [statusChangingId, setStatusChangingId] = useState<string | null>(null);
    const [emailModalInvoice, setEmailModalInvoice] = useState<any | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // GSTR-1 CA Summary modal
    const [showGstr1Modal, setShowGstr1Modal] = useState(false);
    const [gstr1Fy, setGstr1Fy] = useState(getIndianFinancialYear());
    const [gstr1Loading, setGstr1Loading] = useState(false);
    const [gstr1Data, setGstr1Data] = useState<any>(null);

    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tableRef = useRef<HTMLDivElement>(null);

    const getToken = () => localStorage.getItem('shravya_jwt') || localStorage.getItem('token');

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch('/api/invoices/stats', { headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (res.ok) {
                const d = (await res.json()).data || {};
                setStats({
                    totalRevenue:        Number(d.totalRevenue        || 0),
                    pendingAmount:       Number(d.pendingAmount       || 0),
                    pendingCount:        Number(d.pendingCount        || 0),
                    overdueAmount:       Number(d.overdueAmount       || 0),
                    overdueCount:        Number(d.overdueCount        || 0),
                    paidThisMonthCount:  Number(d.paidThisMonthCount  || 0),
                    paidThisMonthAmount: Number(d.paidThisMonthAmount || 0),
                    totalCount:          Number(d.totalCount          || 0),
                });
            }
        } catch (e) { console.error('stats fetch failed', e); }
    }, []);

    const fetchInvoices = useCallback(async (p = 1, search = searchTerm, status = filterStatus, docType = filterDocType) => {
        setLoading(true);
        try {
            let url = `/api/crud/invoices?order=created_at&asc=false&limit=${limit}&page=${p}`;
            if (status !== 'All') url += `&eq_status=${encodeURIComponent(status)}`;
            if (docType !== 'All') url += `&eq_document_type=${encodeURIComponent(docType)}`;
            if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
            if (bookingIdParam) url += `&eq_booking_id=${bookingIdParam}`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (res.ok) {
                const d = await res.json();
                const rows = d.data || [];
                setInvoices(rows);
                if (p === 1 && !search && status === 'All' && docType === 'All' && !bookingIdParam) {
                    setTotalRows(stats.totalCount || rows.length);
                } else {
                    setTotalRows(rows.length === limit ? p * limit + 1 : (p - 1) * limit + rows.length);
                }
            }
        } catch (e) {
            toast.error('Failed to load invoices');
        } finally {
            setLoading(false);
        }
    }, [searchTerm, filterStatus, filterDocType, bookingIdParam, stats.totalCount]);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    useEffect(() => {
        fetchInvoices(page, searchTerm, filterStatus, filterDocType);
        tableRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [page, filterStatus, filterDocType]);

    const fetchGstr1Summary = async (fy = gstr1Fy) => {
        setGstr1Loading(true);
        try {
            const res = await fetch(`/api/invoices/gstr1-summary?financial_year=${encodeURIComponent(fy)}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (res.ok) {
                const d = await res.json();
                setGstr1Data(d.data || d);
            } else {
                toast.error('Failed to fetch GSTR-1 summary');
            }
        } catch (e) {
            toast.error('Failed to fetch GSTR-1 summary');
        } finally {
            setGstr1Loading(false);
        }
    };

    const handleSearchChange = (val: string) => {
        setSearchTerm(val);
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            setPage(1);
            fetchInvoices(1, val, filterStatus);
        }, 350);
    };

    const handleDownloadPDF = async (inv: any, copyType = 'ORIGINAL FOR RECIPIENT') => {
        if (downloadingId) return;
        setDownloadingId(inv.id);
        const docLabel = inv.invoice_no || `#${inv.id.substring(0, 8).toUpperCase()}`;
        const tid = toast.loading(`Preparing PDF for ${docLabel} (${copyType})...`);
        try {
            const [r1, r2, r3] = await Promise.all([
                fetch(`/api/crud/invoice_items?eq_invoice_id=${inv.id}`, { headers: { 'Authorization': `Bearer ${getToken()}` } }),
                fetch(`/api/crud/invoices/${inv.id}`, { headers: { 'Authorization': `Bearer ${getToken()}` } }),
                fetch(`/api/crud/invoice_custom_fields?eq_invoice_id=${inv.id}`, { headers: { 'Authorization': `Bearer ${getToken()}` } }),
            ]);
            const [d1, d2, d3] = await Promise.all([r1.json(), r2.json(), r3.json()]);
            const items = d1.data || [];
            const fullInv = r2.ok ? d2.data : inv;
            const cfMapped = (d3.data || []).map((cf: any) => ({ label: cf.label || '', amount: Number(cf.amount || 0), is_deduction: Boolean(cf.is_deduction) }));
            let fieldLabels: Record<string,string> = {};
            if (fullInv.field_labels) { try { fieldLabels = JSON.parse(fullInv.field_labels); } catch {} }
            generateTrueInvoicePDF({ ...fullInv, copy_type: copyType }, items, settings.company, settings.finance, cfMapped, fieldLabels);
            toast.success(`PDF (${copyType}) downloaded!`, { id: tid });
        } catch (e) {
            toast.error('Failed to generate PDF', { id: tid });
        } finally { setDownloadingId(null); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/crud/invoices/${deleteTarget}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (res.ok) {
                toast.success('Document deleted');
                setDeleteTarget(null);
                fetchStats();
                setPage(1);
                fetchInvoices(1, searchTerm, filterStatus, filterDocType);
            } else { toast.error('Failed to delete'); }
        } catch { toast.error('Delete failed'); }
        finally { setDeleting(false); }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        setStatusChangingId(id);
        try {
            const res = await fetch(`/api/crud/invoices/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: newStatus } : inv));
                toast.success(`Status → ${newStatus}`);
                fetchStats();
            } else { toast.error('Status update failed'); }
        } catch { toast.error('Status update failed'); }
        finally { setStatusChangingId(null); }
    };

    const handleExport = async () => {
        const tid = toast.loading('Preparing export…');
        try {
            let url = `/api/crud/invoices?order=created_at&asc=false&limit=2000`;
            if (filterStatus !== 'All') url += `&eq_status=${encodeURIComponent(filterStatus)}`;
            if (filterDocType !== 'All') url += `&eq_document_type=${encodeURIComponent(filterDocType)}`;
            if (searchTerm.trim()) url += `&search=${encodeURIComponent(searchTerm.trim())}`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${getToken()}` } });
            const rows: any[] = (await res.json()).data || [];
            if (!rows.length) { toast.info('Nothing to export', { id: tid }); return; }
            const headers = ['Official Invoice No','Doc Type','Client Name','Client GSTIN','Place of Supply','Status','Issue Date','Taxable Value','Tax Total','Total Amount','Amount Paid','Balance Due','Payment Status'];
            const lines = [headers.join(','), ...rows.map(r => [
                `"${r.invoice_no || r.id}"`,
                `"${r.document_type || 'Invoice'}"`,
                `"${(r.client_name||'').replace(/"/g,'""')}"`,
                `"${r.client_gst || ''}"`,
                `"${r.place_of_supply || 'Maharashtra'} (${r.place_of_supply_code || '27'})"`,
                `"${r.status||''}"`,
                `"${r.issue_date ? new Date(r.issue_date).toLocaleDateString('en-IN') : ''}"`,
                Number(r.subtotal||0).toFixed(2),
                Number(r.tax_total||0).toFixed(2),
                Number(r.total_amount||0).toFixed(2),
                Number(r.amount_paid||0).toFixed(2),
                Number(r.balance_due||0).toFixed(2),
                `"${r.payment_status||''}"`
            ].join(','))];
            const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `gst-invoices-${new Date().toISOString().split('T')[0]}.csv`;
            a.click(); URL.revokeObjectURL(a.href);
            toast.success(`Exported ${rows.length} invoices`, { id: tid });
        } catch { toast.error('Export failed', { id: tid }); }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success(`Copied ${text}`);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const hasMore = invoices.length === limit;

    const SkeletonRow = () => (
        <tr className="border-b border-slate-50 dark:border-slate-700/50 animate-pulse">
            {[48,96,56,72,72,64,56,40].map((w, i) => (
                <td key={i} className="py-4 px-6"><div className="h-4 bg-slate-100 dark:bg-slate-700/40 rounded" style={{width:`${w}px`}} /></td>
            ))}
        </tr>
    );

    return (
        <div className="flex flex-col h-full bg-[#f8f9fa] dark:bg-[#1A2633] admin-page-bg">
            <ConfirmModal
                open={!!deleteTarget}
                title="Delete Document"
                message="This will permanently delete the document and all its line items. This cannot be undone."
                confirmLabel={deleting ? 'Deleting…' : 'Delete'}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />

            {/* Header */}
            <div className="px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-bold text-slate-900 dark:text-white font-display tracking-tight">Invoices & GST Billing</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Rule 46 compliant sequential invoicing, quotations, and GSTR-1 filings.</p>
                </div>
                <div className="flex gap-2.5 flex-wrap">
                    <button
                        onClick={() => {
                            setShowGstr1Modal(true);
                            fetchGstr1Summary(gstr1Fy);
                        }}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-black text-amber-400 font-bold rounded-xl text-sm px-4 py-2.5 shadow-sm transition-all border border-slate-800"
                    >
                        <FileSpreadsheet size={16} /> GSTR-1 CA Summary
                    </button>
                    <button onClick={handleExport} className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700 rounded-xl text-sm px-4 py-2.5 shadow-sm hover:bg-slate-50 transition-all">
                        <Download size={16} /> Export CSV
                    </button>
                    <button onClick={() => navigate('/admin/invoices/new')} className="flex items-center gap-2 bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold rounded-xl text-sm px-5 py-2.5 shadow-lg shadow-[#F59E0B]/20 active:scale-95 transition-all">
                        <Plus size={18} /> New Document
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 pb-8" ref={tableRef}>
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[
                        { label:'Total Invoiced',    value: stats.totalRevenue,        sub: `${stats.totalCount} documents total`,                                   icon:<Wallet size={16}/>,       color:'orange' },
                        { label:'Pending',           value: stats.pendingAmount,       sub: `${stats.pendingCount} invoice${stats.pendingCount!==1?'s':''} awaiting`, icon:<Clock size={16}/>,        color:'blue'   },
                        { label:'Overdue',           value: stats.overdueAmount,       sub: `${stats.overdueCount} require attention`,                               icon:<AlertCircle size={16}/>,  color:'red', valColor:'text-red-600' },
                        { label:'Paid (This Month)', value: stats.paidThisMonthAmount, sub: `${stats.paidThisMonthCount} invoice${stats.paidThisMonthCount!==1?'s':''} settled`, icon:<CheckCircle2 size={16}/>, color:'green' },
                    ].map(({ label, value, sub, icon, color, valColor }) => (
                        <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</h3>
                                <div className={`w-8 h-8 rounded-lg bg-${color}-100 text-${color}-600 flex items-center justify-center`}>{icon}</div>
                            </div>
                            <p className={`text-3xl font-black mb-1 ${valColor || 'text-slate-900 dark:text-white'}`}>₹{Math.round(value).toLocaleString('en-IN')}</p>
                            <p className="text-sm font-medium text-slate-500">{sub}</p>
                        </div>
                    ))}
                </div>

                {/* Table & Document Type Tabs */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
                    
                    {/* Document Series Tabs */}
                    <div className="px-4 pt-3 pb-0 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2 overflow-x-auto">
                        {[
                            { id: 'All', label: 'All Documents' },
                            { id: 'Invoice', label: 'Tax Invoices' },
                            { id: 'Quotation', label: 'Quotations' },
                            { id: 'Proforma', label: 'Proformas' },
                            { id: 'CreditNote', label: 'Credit Notes' },
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => {
                                    setFilterDocType(t.id);
                                    setPage(1);
                                    fetchInvoices(1, searchTerm, filterStatus, t.id);
                                }}
                                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                                    filterDocType === t.id
                                        ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Status & Search Filters */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between gap-4">
                        <div className="flex space-x-1 flex-wrap gap-y-1">
                            {['All','Draft','Sent','Paid','Overdue','Void'].map(s => (
                                <button key={s} onClick={() => { setFilterStatus(s); setPage(1); fetchInvoices(1, searchTerm, s, filterDocType); }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus===s ? 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                                    {s}
                                </button>
                            ))}
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input type="text" placeholder="Search invoice no, client, GSTIN…" value={searchTerm}
                                onChange={e => handleSearchChange(e.target.value)}
                                className="pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-orange-500/50 outline-none w-64" />
                            {searchTerm && (
                                <button onClick={() => handleSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                                    {['Document #','Client','Type','Date','Due Date','Amount','Status','Actions'].map((h,i) => (
                                        <th key={h} className={`py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider ${i===7?'text-right':''}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? Array.from({length:5}).map((_,i) => <SkeletonRow key={i}/>) :
                                invoices.length === 0 ? (
                                    <tr><td colSpan={8} className="py-16 text-center">
                                        <div className="flex flex-col items-center gap-3 text-slate-400">
                                            <FileText size={36} strokeWidth={1.5}/>
                                            <p className="font-semibold text-sm">No documents found</p>
                                            {(searchTerm || filterStatus !== 'All' || filterDocType !== 'All') && <p className="text-xs">Try clearing your filters</p>}
                                        </div>
                                    </td></tr>
                                ) : invoices.map(inv => (
                                    <tr key={inv.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors group">
                                        <td className="py-4 px-6 font-mono text-xs font-bold">
                                            {inv.invoice_no ? (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-slate-900 dark:text-white">{inv.invoice_no}</span>
                                                    <button
                                                        onClick={() => copyToClipboard(inv.invoice_no, inv.id)}
                                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                        title="Copy Invoice No"
                                                    >
                                                        {copiedId === inv.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic">Draft (#{inv.id.substring(0,6)})</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs">
                                                    {(inv.client_name||'NA').substring(0,2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <span className="font-medium text-slate-700 dark:text-slate-300 block">{inv.client_name||'Unnamed Client'}</span>
                                                    {inv.client_gst && (
                                                        <span className="text-[10px] text-slate-400 font-mono">GST: {inv.client_gst}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-slate-500 text-sm">
                                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                                inv.document_type === 'CreditNote'
                                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                                    : inv.document_type === 'Quotation'
                                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400'
                                                    : inv.document_type === 'Proforma'
                                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                            }`}>
                                                {inv.document_type === 'CreditNote' ? 'Credit Note' : (inv.document_type || 'Invoice')}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-slate-500 text-sm">{new Date(inv.issue_date||inv.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
                                        <td className="py-4 px-6 text-sm">
                                            {inv.due_date ? (
                                                <span className={new Date(inv.due_date)<new Date()&&inv.status!=='Paid'?'text-red-600 font-bold':'text-slate-500'}>
                                                    {new Date(inv.due_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                                                </span>
                                            ) : <span className="text-slate-400 italic">—</span>}
                                        </td>
                                        <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">₹{Math.round(Number(inv.total_amount)).toLocaleString('en-IN')}</td>
                                        <td className="py-4 px-6" onClick={e => e.stopPropagation()}>
                                            {statusChangingId === inv.id ? <Loader2 size={14} className="animate-spin text-orange-500"/> : (
                                                <select value={inv.status||'Draft'} onChange={e => handleStatusChange(inv.id, e.target.value)}
                                                    className={`text-xs font-bold px-2.5 py-1 rounded-md border-0 outline-none cursor-pointer ${STATUS_COLORS[inv.status]||STATUS_COLORS.Draft}`}>
                                                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-right" onClick={e => e.stopPropagation()}>
                                            <div className="flex justify-end">
                                                <ActionMenu>
                                                    <button disabled={downloadingId===inv.id} onClick={() => handleDownloadPDF(inv, 'ORIGINAL FOR RECIPIENT')}
                                                        className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2 transition-colors disabled:opacity-50">
                                                        <Download size={14} className="text-slate-400"/>
                                                        <span>Download Original PDF</span>
                                                    </button>
                                                    <button disabled={downloadingId===inv.id} onClick={() => handleDownloadPDF(inv, 'DUPLICATE FOR SUPPLIER')}
                                                        className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2 transition-colors disabled:opacity-50">
                                                        <Download size={14} className="text-slate-400"/>
                                                        <span>Download Duplicate Copy</span>
                                                    </button>

                                                    {inv.document_type === 'Invoice' && inv.invoice_no && (
                                                        <button onClick={() => navigate(`/admin/invoices/new?type=CreditNote&original_id=${inv.id}&original_no=${inv.invoice_no}`)}
                                                            className="w-full text-left px-4 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2 transition-colors font-semibold">
                                                            <FileText size={14} className="text-rose-500"/><span>Create Credit Note</span>
                                                        </button>
                                                    )}

                                                    {inv.document_type === 'Quotation' && (
                                                        <button onClick={() => navigate(`/admin/invoices/edit/${inv.id}?type=Invoice`)}
                                                            className="w-full text-left px-4 py-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 flex items-center gap-2 transition-colors font-semibold">
                                                            <ArrowRight size={14} className="text-emerald-500"/><span>Convert to Tax Invoice</span>
                                                        </button>
                                                    )}

                                                    <button onClick={() => setEmailModalInvoice(inv)}
                                                        className="w-full text-left px-4 py-2 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-2 transition-colors">
                                                        <Mail size={14} className="text-indigo-500"/><span>Email Invoice</span>
                                                    </button>
                                                    <button onClick={() => navigate(`/admin/invoices/edit/${inv.id}`)}
                                                        className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2 transition-colors">
                                                        <Edit size={14} className="text-slate-400"/><span>Edit Details</span>
                                                    </button>
                                                    <button onClick={() => setDeleteTarget(inv.id)}
                                                        className="w-full text-left px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors border-t border-slate-100 dark:border-slate-800">
                                                        <Trash2 size={14} className="text-slate-400"/><span>Delete</span>
                                                    </button>
                                                </ActionMenu>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-sm text-slate-500">
                        <span>Page {page} · Showing {invoices.length}{totalRows > 0 ? ` of ${totalRows}` : ''} entries</span>
                        <div className="flex gap-2">
                            <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-all">
                                <ChevronLeft size={16}/>
                            </button>
                            <button onClick={() => setPage(p => p+1)} disabled={!hasMore}
                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-all">
                                <ChevronRight size={16}/>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* GSTR-1 CA Summary Modal */}
            {showGstr1Modal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowGstr1Modal(false)}>
                    <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-6" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <FileSpreadsheet className="text-amber-500" size={20} />
                                    GSTR-1 Document & Tax Summary
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Compliant Table 13 Document Summary & Output Tax breakdown for CA/GST filing</p>
                            </div>
                            <button onClick={() => setShowGstr1Modal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        {/* FY Filter & Quick Export Row */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Financial Year:</span>
                                <select
                                    value={gstr1Fy}
                                    onChange={e => {
                                        setGstr1Fy(e.target.value);
                                        fetchGstr1Summary(e.target.value);
                                    }}
                                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-white cursor-pointer"
                                >
                                    <option value="26-27">FY 2026-27</option>
                                    <option value="25-26">FY 2025-26</option>
                                    <option value="24-25">FY 2024-25</option>
                                </select>
                                {gstr1Loading && <Loader2 size={16} className="animate-spin text-orange-500" />}
                            </div>

                            {gstr1Data && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            if (!gstr1Data?.table13_document_summary) return;
                                            const headers = ['Nature of Document', 'Sr. No. From', 'Sr. No. To', 'Total Issued', 'Cancelled', 'Net Issued'];
                                            const lines = [
                                                headers.join(','),
                                                ...gstr1Data.table13_document_summary.map((r: any) => [
                                                    `"${r.nature_of_document}"`,
                                                    `"${r.from_serial_no}"`,
                                                    `"${r.to_serial_no}"`,
                                                    r.total_number,
                                                    r.cancelled_number,
                                                    r.net_issued_number
                                                ].join(','))
                                            ];
                                            const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
                                            const a = document.createElement('a');
                                            a.href = URL.createObjectURL(blob);
                                            a.download = `GSTR1-Table13-Summary-FY${gstr1Fy}.csv`;
                                            a.click();
                                            URL.revokeObjectURL(a.href);
                                            toast.success('Table 13 CSV exported');
                                        }}
                                        className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                                    >
                                        <Download size={13} /> Table 13 CSV
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!gstr1Data?.invoices) return;
                                            const headers = ['Invoice No', 'Doc Type', 'Date', 'Client Name', 'Client GSTIN', 'Place of Supply', 'Taxable Value', 'Tax Total', 'Total Amount', 'GST Type', 'Status'];
                                            const lines = [
                                                headers.join(','),
                                                ...gstr1Data.invoices.map((r: any) => [
                                                    `"${r.invoice_no || '#' + (r.id||'').substring(0,6)}"`,
                                                    `"${r.document_type || 'Invoice'}"`,
                                                    `"${r.issue_date ? new Date(r.issue_date).toLocaleDateString('en-IN') : ''}"`,
                                                    `"${(r.client_name || '').replace(/"/g, '""')}"`,
                                                    `"${r.client_gst || ''}"`,
                                                    `"${r.place_of_supply || 'Maharashtra'} (${r.place_of_supply_code || '27'})"`,
                                                    Number(r.subtotal || 0).toFixed(2),
                                                    Number(r.tax_total || 0).toFixed(2),
                                                    Number(r.total_amount || 0).toFixed(2),
                                                    `"${r.gst_type || 'CGST_SGST'}"`,
                                                    `"${r.status || ''}"`
                                                ].join(','))
                                            ];
                                            const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
                                            const a = document.createElement('a');
                                            a.href = URL.createObjectURL(blob);
                                            a.download = `GSTR1-Sales-Register-FY${gstr1Fy}.csv`;
                                            a.click();
                                            URL.revokeObjectURL(a.href);
                                            toast.success('Full Sales Register CSV exported');
                                        }}
                                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-amber-500/20"
                                    >
                                        <Download size={13} /> Full CA CSV
                                    </button>
                                </div>
                            )}
                        </div>

                        {gstr1Data ? (
                            <div className="space-y-6">
                                {/* Outward Supplies Tax Summary Cards */}
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
                                        Outward Supplies Tax Summary (FY {gstr1Fy})
                                    </h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Taxable Turnover</p>
                                            <p className="text-base font-black text-slate-900 dark:text-white mt-1">
                                                ₹{Math.round(gstr1Data.sales_summary?.total_taxable_value || 0).toLocaleString('en-IN')}
                                            </p>
                                            <span className="text-[10px] text-slate-400 block mt-0.5">{gstr1Data.sales_summary?.total_count || 0} active documents</span>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Integrated GST (IGST)</p>
                                            <p className="text-base font-black text-blue-600 dark:text-blue-400 mt-1">
                                                ₹{Math.round(gstr1Data.sales_summary?.total_igst || 0).toLocaleString('en-IN')}
                                            </p>
                                            <span className="text-[10px] text-slate-400 block mt-0.5">Inter-state supplies</span>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">CGST + SGST</p>
                                            <p className="text-base font-black text-purple-600 dark:text-purple-400 mt-1">
                                                ₹{Math.round((gstr1Data.sales_summary?.total_cgst || 0) + (gstr1Data.sales_summary?.total_sgst || 0)).toLocaleString('en-IN')}
                                            </p>
                                            <span className="text-[10px] text-slate-400 block mt-0.5">Intra-state supplies</span>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Total GST Output</p>
                                            <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1">
                                                ₹{Math.round(gstr1Data.sales_summary?.total_tax || 0).toLocaleString('en-IN')}
                                            </p>
                                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">B2B: {gstr1Data.sales_summary?.b2b_count || 0} · B2C: {gstr1Data.sales_summary?.b2c_count || 0}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Table 13: Document Summary */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            Table 13: Summary of Documents Issued (Rule 46 / 48)
                                        </h4>
                                    </div>
                                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                                                <tr>
                                                    <th className="p-2.5">Nature of Document</th>
                                                    <th className="p-2.5">Sr. No. From</th>
                                                    <th className="p-2.5">Sr. No. To</th>
                                                    <th className="p-2.5 text-center">Total Issued</th>
                                                    <th className="p-2.5 text-center">Cancelled</th>
                                                    <th className="p-2.5 text-center">Net Issued</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {gstr1Data.table13_document_summary?.map((row: any, idx: number) => (
                                                    <tr key={idx} className="font-mono hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                        <td className="p-2.5 font-sans font-semibold text-slate-800 dark:text-slate-200">{row.nature_of_document}</td>
                                                        <td className="p-2.5 text-slate-700 dark:text-slate-300 font-semibold">{row.from_serial_no}</td>
                                                        <td className="p-2.5 text-slate-700 dark:text-slate-300 font-semibold">{row.to_serial_no}</td>
                                                        <td className="p-2.5 text-center font-bold text-slate-900 dark:text-white">{row.total_number}</td>
                                                        <td className="p-2.5 text-center text-rose-500 font-bold">{row.cancelled_number}</td>
                                                        <td className="p-2.5 text-center text-emerald-600 dark:text-emerald-400 font-bold">{row.net_issued_number}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Outward Supplies List preview */}
                                {gstr1Data.invoices && gstr1Data.invoices.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                            Document Register ({gstr1Data.invoices.length} entries for FY {gstr1Fy})
                                        </h4>
                                        <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold sticky top-0">
                                                    <tr>
                                                        <th className="p-2">Document No</th>
                                                        <th className="p-2">Client</th>
                                                        <th className="p-2">Date</th>
                                                        <th className="p-2">GSTIN</th>
                                                        <th className="p-2 text-right">Taxable</th>
                                                        <th className="p-2 text-right">Tax</th>
                                                        <th className="p-2 text-right">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {gstr1Data.invoices.map((inv: any) => (
                                                        <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                                            <td className="p-2 font-mono font-bold text-slate-800 dark:text-slate-200">
                                                                {inv.invoice_no || `#${inv.id.substring(0,6).toUpperCase()}`}
                                                            </td>
                                                            <td className="p-2 text-slate-700 dark:text-slate-300 font-medium">{inv.client_name}</td>
                                                            <td className="p-2 text-slate-500">{new Date(inv.issue_date).toLocaleDateString('en-IN', {day:'2-digit', month:'short'})}</td>
                                                            <td className="p-2 font-mono text-[11px] text-slate-500">{inv.client_gst || 'B2C (Retail)'}</td>
                                                            <td className="p-2 text-right font-mono">₹{Math.round(Number(inv.subtotal || 0)).toLocaleString('en-IN')}</td>
                                                            <td className="p-2 text-right font-mono text-amber-600 dark:text-amber-400">₹{Math.round(Number(inv.tax_total || 0)).toLocaleString('en-IN')}</td>
                                                            <td className="p-2 text-right font-mono font-bold text-slate-900 dark:text-white">₹{Math.round(Number(inv.total_amount || 0)).toLocaleString('en-IN')}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="py-12 text-center text-slate-400">Loading GSTR-1 summary for FY {gstr1Fy}...</div>
                        )}

                        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                                onClick={() => setShowGstr1Modal(false)}
                                className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {emailModalInvoice && (
                <SendEmailModal
                    isOpen={!!emailModalInvoice}
                    onClose={() => setEmailModalInvoice(null)}
                    defaultEmail={emailModalInvoice.email || emailModalInvoice.client_email || ''}
                    refId={emailModalInvoice.booking_id || emailModalInvoice.id}
                    templateType="invoice"
                    title={`Email Invoice: ${emailModalInvoice.invoice_no || '#' + (emailModalInvoice.id || '').substring(0, 8).toUpperCase()}`}
                    details={{
                        clientName: emailModalInvoice.client_name,
                        documentNo: emailModalInvoice.invoice_no || '#' + (emailModalInvoice.id || '').substring(0, 8).toUpperCase(),
                        documentType: emailModalInvoice.document_type || 'Invoice',
                        travelDates: emailModalInvoice.travel_dates || (emailModalInvoice.travel_date_from ? new Date(emailModalInvoice.travel_date_from).toLocaleDateString('en-IN') : undefined),
                        totalAmount: emailModalInvoice.total_amount,
                        amountPaid: emailModalInvoice.amount_paid,
                        balanceDue: emailModalInvoice.balance_due,
                        paymentStatus: emailModalInvoice.payment_status || emailModalInvoice.status || 'Unpaid'
                    }}
                />
            )}
        </div>
    );
};
