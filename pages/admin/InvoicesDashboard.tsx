import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    FileText, Plus, Search,
    Edit, Trash2, Download, CheckCircle2,
    AlertCircle, Clock, Wallet, ChevronLeft, ChevronRight, Loader2, X
} from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '../../context/SettingsContext';
import { generateTrueInvoicePDF } from '../../utils/pdfGenerator';
import { ActionMenu } from '../../components/ui/ActionMenu';

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
    const [stats, setStats] = useState<any>({ totalRevenue:0, pendingAmount:0, pendingCount:0, overdueAmount:0, overdueCount:0, paidThisMonthCount:0, paidThisMonthAmount:0, totalCount:0 });
    const [page, setPage] = useState(1);
    const [totalRows, setTotalRows] = useState(0);
    const limit = 25;
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [statusChangingId, setStatusChangingId] = useState<string | null>(null);
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

    const fetchInvoices = useCallback(async (p = 1, search = searchTerm, status = filterStatus) => {
        setLoading(true);
        try {
            let url = `/api/crud/invoices?order=created_at&asc=false&limit=${limit}&page=${p}`;
            if (status !== 'All') url += `&eq_status=${encodeURIComponent(status)}`;
            if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
            if (bookingIdParam) url += `&eq_booking_id=${bookingIdParam}`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${getToken()}` } });
            if (res.ok) {
                const d = await res.json();
                const rows = d.data || [];
                setInvoices(rows);
                if (p === 1 && !search && status === 'All' && !bookingIdParam) {
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
    }, [searchTerm, filterStatus, bookingIdParam, stats.totalCount]);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    useEffect(() => {
        fetchInvoices(page, searchTerm, filterStatus);
        tableRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [page, filterStatus]);

    const handleSearchChange = (val: string) => {
        setSearchTerm(val);
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            setPage(1);
            fetchInvoices(1, val, filterStatus);
        }, 350);
    };

    const handleDownloadPDF = async (inv: any) => {
        if (downloadingId) return;
        setDownloadingId(inv.id);
        const tid = toast.loading(`Preparing PDF for #${inv.id.substring(0, 8).toUpperCase()}...`);
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
            generateTrueInvoicePDF(fullInv, items, settings.company, settings.finance, cfMapped, fieldLabels);
            toast.success('PDF downloaded!', { id: tid });
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
                fetchInvoices(1, searchTerm, filterStatus);
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
            if (searchTerm.trim()) url += `&search=${encodeURIComponent(searchTerm.trim())}`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${getToken()}` } });
            const rows: any[] = (await res.json()).data || [];
            if (!rows.length) { toast.info('Nothing to export', { id: tid }); return; }
            const headers = ['Invoice ID','Client Name','Type','Status','Issue Date','Due Date','Total Amount','Amount Paid','Balance Due','Payment Status'];
            const lines = [headers.join(','), ...rows.map(r => [
                `"${r.id}"`, `"${(r.client_name||'').replace(/"/g,'""')}"`, `"${r.document_type||'Invoice'}"`,
                `"${r.status||''}"`,
                `"${r.issue_date ? new Date(r.issue_date).toLocaleDateString('en-IN') : ''}"`,
                `"${r.due_date  ? new Date(r.due_date ).toLocaleDateString('en-IN') : ''}"`,
                Number(r.total_amount||0).toFixed(2), Number(r.amount_paid||0).toFixed(2), Number(r.balance_due||0).toFixed(2),
                `"${r.payment_status||''}"`
            ].join(','))];
            const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`;
            a.click(); URL.revokeObjectURL(a.href);
            toast.success(`Exported ${rows.length} invoices`, { id: tid });
        } catch { toast.error('Export failed', { id: tid }); }
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
                message="This will permanently delete the invoice and all its line items. This cannot be undone."
                confirmLabel={deleting ? 'Deleting…' : 'Delete'}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />

            {/* Header */}
            <div className="px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-bold text-slate-900 dark:text-white font-display tracking-tight">Invoices</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your billing and financial documents.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleExport} className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700 rounded-xl text-sm px-5 py-2.5 shadow-sm hover:bg-slate-50 transition-all">
                        <Download size={18} /> Export CSV
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
                            <p className={`text-3xl font-black mb-1 ${valColor || 'text-slate-900 dark:text-white'}`}>₹{value.toLocaleString('en-IN',{minimumFractionDigits:2})}</p>
                            <p className="text-sm font-medium text-slate-500">{sub}</p>
                        </div>
                    ))}
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
                    {/* Filters */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between gap-4">
                        <div className="flex space-x-1 flex-wrap gap-y-1">
                            {['All','Draft','Sent','Paid','Overdue','Void'].map(s => (
                                <button key={s} onClick={() => { setFilterStatus(s); setPage(1); fetchInvoices(1, searchTerm, s); }}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterStatus===s ? 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                                    {s}
                                </button>
                            ))}
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input type="text" placeholder="Search client, email or ID…" value={searchTerm}
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
                                    {['ID','Client','Type','Date','Due Date','Amount','Status','Actions'].map((h,i) => (
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
                                            {(searchTerm || filterStatus !== 'All') && <p className="text-xs">Try clearing your filters</p>}
                                        </div>
                                    </td></tr>
                                ) : invoices.map(inv => (
                                    <tr key={inv.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors group">
                                        <td className="py-4 px-6 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">#{inv.id.substring(0,8).toUpperCase()}</td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs">
                                                    {(inv.client_name||'NA').substring(0,2).toUpperCase()}
                                                </div>
                                                <span className="font-medium text-slate-700 dark:text-slate-300">{inv.client_name||'Unnamed Client'}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-slate-500 text-sm">{inv.document_type||'Invoice'}</td>
                                        <td className="py-4 px-6 text-slate-500 text-sm">{new Date(inv.issue_date||inv.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</td>
                                        <td className="py-4 px-6 text-sm">
                                            {inv.due_date ? (
                                                <span className={new Date(inv.due_date)<new Date()&&inv.status!=='Paid'?'text-red-600 font-bold':'text-slate-500'}>
                                                    {new Date(inv.due_date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                                                </span>
                                            ) : <span className="text-slate-400 italic">Not set</span>}
                                        </td>
                                        <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">₹{Number(inv.total_amount).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
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
                                                    <button disabled={downloadingId===inv.id} onClick={() => handleDownloadPDF(inv)}
                                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2 transition-colors disabled:opacity-50">
                                                        {downloadingId===inv.id ? <Loader2 size={16} className="animate-spin text-blue-600"/> : <Download size={16} className="text-slate-400"/>}
                                                        <span>Download PDF</span>
                                                    </button>
                                                    <button onClick={() => navigate(`/admin/invoices/edit/${inv.id}`)}
                                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2 transition-colors">
                                                        <Edit size={16} className="text-slate-400"/><span>Edit Invoice</span>
                                                    </button>
                                                    <button onClick={() => setDeleteTarget(inv.id)}
                                                        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors border-t border-slate-100 dark:border-slate-800">
                                                        <Trash2 size={16} className="text-slate-400"/><span>Delete</span>
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
        </div>
    );
};
