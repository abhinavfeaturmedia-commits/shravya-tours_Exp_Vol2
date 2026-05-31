import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    FileText, Plus, Search, MoreHorizontal,
    Edit, Trash2, Download, CheckCircle2,
    AlertCircle, Clock, Wallet, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '../../context/SettingsContext';
import { generateTrueInvoicePDF } from '../../utils/pdfGenerator';

export const InvoicesDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const bookingIdParam = searchParams.get('booking_id');
    const { settings } = useSettings();
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const handleDownloadPDF = async (inv: any) => {
        if (downloadingId) return;
        setDownloadingId(inv.id);
        const toastId = toast.loading(`Preparing PDF for Invoice #${inv.id.substring(0, 8).toUpperCase()}...`);
        try {
            const token = (localStorage.getItem('shravya_jwt') || localStorage.getItem('token'));
            const res = await fetch(`/api/crud/invoice_items?eq_invoice_id=${inv.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const itemsData = await res.json();
                const items = itemsData.data || [];
                
                // Fetch full invoice record to ensure we have driver allowance and other new fields
                const invRes = await fetch(`/api/crud/invoices/${inv.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const fullInv = invRes.ok ? (await invRes.json()).data : inv;

                // Fetch custom fields for this invoice
                const cfRes = await fetch(`/api/crud/invoice_custom_fields?eq_invoice_id=${inv.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const cfList = cfRes.ok ? ((await cfRes.json()).data || []) : [];
                const cfMapped = cfList.map((cf: any) => ({
                    label: cf.label || '',
                    amount: Number(cf.amount || 0),
                    is_deduction: Boolean(cf.is_deduction)
                }));

                // Parse custom field labels for fixed rows
                let parsedFieldLabels: Record<string, string> = {};
                if (fullInv.field_labels) {
                    try { parsedFieldLabels = JSON.parse(fullInv.field_labels); } catch {}
                }

                generateTrueInvoicePDF(
                    fullInv, 
                    items, 
                    settings.company, 
                    settings.finance,
                    cfMapped,
                    parsedFieldLabels
                );
                toast.success('PDF downloaded successfully!', { id: toastId });
            } else {
                toast.error('Failed to fetch invoice items.', { id: toastId });
            }
        } catch (err) {
            console.error('Failed to download PDF:', err);
            toast.error('An error occurred while generating PDF.', { id: toastId });
        } finally {
            setDownloadingId(null);
        }
    };

    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [stats, setStats] = useState<any>({
        totalRevenue: 0,
        pendingAmount: 0,
        overdueAmount: 0,
        paidThisMonthCount: 0
    });
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const limit = 25;

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        fetchInvoices(page);
    }, [page, filterStatus]);

    const fetchStats = async () => {
        try {
            const token = (localStorage.getItem('shravya_jwt') || localStorage.getItem('token'));
            const res = await fetch('/api/invoices/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStats({
                    totalRevenue: Number(data.data.totalRevenue || 0),
                    pendingAmount: Number(data.data.pendingAmount || 0),
                    overdueAmount: Number(data.data.overdueAmount || 0),
                    paidThisMonthCount: Number(data.data.paidThisMonthCount || 0)
                });
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const fetchInvoices = async (pageNum = 1) => {
        setLoading(true);
        try {
            const token = (localStorage.getItem('shravya_jwt') || localStorage.getItem('token'));
            let url = `/api/crud/invoices?order=created_at&asc=false&limit=${limit}&page=${pageNum}`;
            if (filterStatus !== 'All') {
                url += `&eq_status=${filterStatus}`;
            }
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (pageNum === 1) {
                    setInvoices(data.data || []);
                } else {
                    setInvoices(prev => [...prev, ...(data.data || [])]);
                }
                setHasMore((data.data || []).length === limit);
            }
        } catch (error) {
            console.error('Failed to fetch invoices:', error);
            toast.error('Failed to load invoices');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this document?')) return;
        try {
            const token = (localStorage.getItem('shravya_jwt') || localStorage.getItem('token'));
            const res = await fetch(`/api/crud/invoices/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success('Document deleted successfully');
                fetchStats();
                fetchInvoices(1);
                setPage(1);
            } else {
                toast.error('Failed to delete document');
            }
        } catch (error) {
            console.error('Failed to delete:', error);
            toast.error('An error occurred while deleting');
        }
    };

    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch = (inv.client_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (inv.id || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'All' || inv.status === filterStatus;
        const matchesBooking = !bookingIdParam || inv.booking_id === bookingIdParam;
        return matchesSearch && matchesStatus && matchesBooking;
    });

    // Calculate stats using backend fetched stats
    const totalRevenue = stats.totalRevenue;
    const pendingAmount = stats.pendingAmount;
    const overdueAmount = stats.overdueAmount;
    const paidThisMonthCount = stats.paidThisMonthCount;
    // We can show dynamic counts or just hide them for now if backend doesn't provide them.
    const pendingCount = 'Some';
    const overdueCount = 'Some';

    return (
        <div className="flex flex-col h-full bg-[#f8f9fa] dark:bg-[#1A2633] admin-page-bg">
            {/* Header */}
            <div className="px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-bold text-slate-900 dark:text-white font-display tracking-tight">
                        Invoices
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your billing and financial documents.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700 rounded-xl text-sm px-5 py-2.5 shadow-sm hover:bg-slate-50 transition-all"
                    >
                        <Download size={18} /> Export
                    </button>
                    <button
                        onClick={() => navigate('/admin/invoices/new')}
                        className="flex items-center gap-2 bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold rounded-xl text-sm px-5 py-2.5 shadow-lg shadow-[#F59E0B]/20 active:scale-95 transition-all"
                    >
                        <Plus size={18} /> New Document
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 pb-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Revenue</h3>
                            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                                <Wallet size={16} />
                            </div>
                        </div>
                        <p className="text-3xl font-black text-slate-900 dark:text-white mb-1">₹{totalRevenue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                        <p className="text-sm font-medium text-green-600 flex items-center gap-1">
                            <span className="font-bold">+12%</span> vs last month
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending</h3>
                            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                <Clock size={16} />
                            </div>
                        </div>
                        <p className="text-3xl font-black text-slate-900 dark:text-white mb-1">₹{pendingAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                        <p className="text-sm font-medium text-slate-500">{pendingCount} invoices awaiting payment</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overdue</h3>
                            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                                <AlertCircle size={16} />
                            </div>
                        </div>
                        <p className="text-3xl font-black text-red-600 mb-1">₹{overdueAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                        <p className="text-sm font-medium text-red-500/80">{overdueCount} invoices require attention</p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Paid (This Month)</h3>
                            <div className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                                <CheckCircle2 size={16} />
                            </div>
                        </div>
                        <p className="text-3xl font-black text-slate-900 dark:text-white mb-1">₹{totalRevenue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                        <p className="text-sm font-medium text-slate-500">{paidThisMonthCount} invoices settled</p>
                    </div>
                </div>

                {/* Table Container */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
                    
                    {/* Filters & Search */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between gap-4">
                        <div className="flex space-x-1">
                            {['All', 'Draft', 'Sent', 'Paid', 'Overdue'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => {
                                        setFilterStatus(status);
                                        setPage(1);
                                    }}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterStatus === status 
                                        ? 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400' 
                                        : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search client or ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-orange-500/50 outline-none w-64"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Client</th>
                                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Due Date</th>
                                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInvoices.map((inv) => (
                                    <tr key={inv.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors group">
                                        <td className="py-4 px-6 font-semibold text-slate-900 dark:text-slate-300">#{inv.id.substring(0, 8).toUpperCase()}</td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs">
                                                    {inv.client_name?.substring(0, 2).toUpperCase() || 'NA'}
                                                </div>
                                                <span className="font-medium text-slate-700 dark:text-slate-300">{inv.client_name || 'Unnamed Client'}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-slate-500 text-sm">{inv.document_type || 'Invoice'}</td>
                                        <td className="py-4 px-6 text-slate-500 text-sm">{new Date(inv.issue_date || inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                                        <td className="py-4 px-6 text-sm">
                                            {inv.due_date ? (
                                                <span className={new Date(inv.due_date) < new Date() && inv.status !== 'Paid' ? 'text-red-600 font-bold' : 'text-slate-500'}>
                                                    {new Date(inv.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 italic">Not set</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">₹{Number(inv.total_amount).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                        <td className="py-4 px-6">
                                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                                                inv.status === 'Paid' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' :
                                                inv.status === 'Sent' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' :
                                                inv.status === 'Overdue' ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' :
                                                'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                            }`}>
                                                {inv.status || 'Draft'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className={`flex justify-end gap-2 transition-opacity ${downloadingId === inv.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                <button
                                                    disabled={downloadingId === inv.id}
                                                    onClick={() => handleDownloadPDF(inv)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Download PDF"
                                                >
                                                    {downloadingId === inv.id ? (
                                                        <Loader2 size={16} className="animate-spin text-blue-600" />
                                                    ) : (
                                                        <Download size={16} />
                                                    )}
                                                </button>
                                                <button onClick={() => navigate(`/admin/invoices/edit/${inv.id}`)} className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(inv.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredInvoices.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-slate-500">
                                            No documents found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination */}
                    <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-sm text-slate-500">
                        <span>Showing {invoices.length} entries</span>
                        <div className="flex gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50" disabled={page === 1}>
                                <ChevronLeft size={16} />
                            </button>
                            <button onClick={() => setPage(p => p + 1)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50" disabled={!hasMore}>
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
