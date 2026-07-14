import React, { useState, useMemo } from 'react';
import { useFinance, FinanceTransaction } from '../../src/hooks/useFinance';
import { useAuth } from '../../context/AuthContext';
import { useTransfers, TransferRequest } from '../../src/hooks/useTransfers';
import { Pagination, usePagination } from '../../components/ui/Pagination';
import { ActionMenu } from '../../components/ui/ActionMenu';
import { formatPrice } from '../../utils/packageUtils';

export const FinanceVerification: React.FC = () => {
    const { transactions, isLoading: isPaymentsLoading, updateTransactionStatus } = useFinance();
    const { transfers, approveTransfer, rejectTransfer, isLoading: isTransfersLoading, refetchTransfers } = useTransfers();
    const { hasPermission } = useAuth();
    
    const [viewMode, setViewMode] = useState<'payments' | 'transfers'>('payments');
    
    // Payment Tab States
    const [paymentTab, setPaymentTab] = useState<'Pending' | 'Verified' | 'Rejected'>('Pending');
    // Transfer Tab States
    const [transferTab, setTransferTab] = useState<'Pending' | 'Approved' | 'Rejected'>('Pending');
    
    const [search, setSearch] = useState('');
    const [sourceFilter, setSourceFilter] = useState<'All' | 'booking_payment' | 'expense' | 'vendor_payout' | 'partner_payout'>('All');

    // --- PAYMENTS FILTERING ---
    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const matchesTab = tx.status === paymentTab;
            const matchesSource = sourceFilter === 'All' || tx.source === sourceFilter;
            const matchesSearch = 
                tx.id.toLowerCase().includes(search.toLowerCase()) || 
                (tx.customer && tx.customer.toLowerCase().includes(search.toLowerCase())) ||
                (tx.bookingId && tx.bookingId.toLowerCase().includes(search.toLowerCase())) ||
                (tx.reference && tx.reference.toLowerCase().includes(search.toLowerCase()));
            return matchesTab && matchesSource && matchesSearch;
        });
    }, [transactions, paymentTab, sourceFilter, search]);

    // --- TRANSFERS FILTERING ---
    const filteredTransfers = useMemo(() => {
        return transfers.filter(tr => {
            const matchesTab = tr.status === transferTab;
            const matchesSearch = 
                tr.id.toLowerCase().includes(search.toLowerCase()) ||
                (tr.item_name && tr.item_name.toLowerCase().includes(search.toLowerCase())) ||
                (tr.from_staff_name && tr.from_staff_name.toLowerCase().includes(search.toLowerCase())) ||
                (tr.to_staff_name && tr.to_staff_name.toLowerCase().includes(search.toLowerCase())) ||
                (tr.requested_by_name && tr.requested_by_name.toLowerCase().includes(search.toLowerCase()));
            return matchesTab && matchesSearch;
        });
    }, [transfers, transferTab, search]);

    // --- PAGINATION ---
    const paymentPagination = usePagination(filteredTransactions.length, 15);
    const paginatedTransactions = paymentPagination.paginateData<FinanceTransaction>(filteredTransactions);

    const transferPagination = usePagination(filteredTransfers.length, 15);
    const paginatedTransfers = transferPagination.paginateData<TransferRequest>(filteredTransfers);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Verified':
            case 'Approved': 
                return 'bg-green-100 text-green-700 border-green-200';
            case 'Pending': 
                return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'Rejected': 
                return 'bg-red-100 text-red-700 border-red-200';
            default: 
                return 'bg-slate-100 text-slate-700';
        }
    };

    const handleRejectTransfer = async (id: string) => {
        const reason = prompt("Please enter the reason for rejecting this transfer:");
        if (reason === null) return; // User cancelled
        if (!reason.trim()) {
            alert("A rejection reason is required.");
            return;
        }
        await rejectTransfer(id, reason);
    };

    const isLoading = viewMode === 'payments' ? isPaymentsLoading : isTransfersLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <div className="size-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-slate-400 text-sm font-medium animate-pulse">Loading Queue...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full admin-page-bg relative">
            {/* Header */}
            <div className="px-4 md:px-8 py-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A2633]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            <span className="font-display text-3xl">Admin Approvals</span>
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                            Verify and approve payment submissions or lead/booking transfers.
                        </p>
                    </div>

                    {/* Unified View Mode Switcher */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit border border-slate-200/50 dark:border-slate-700">
                        <button
                            onClick={() => { setViewMode('payments'); setSearch(''); }}
                            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 ${
                                viewMode === 'payments'
                                    ? 'bg-white dark:bg-[#1A2633] text-primary shadow-sm'
                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[16px]">payments</span>
                            Payments Queue
                        </button>
                        <button
                            onClick={() => { setViewMode('transfers'); setSearch(''); }}
                            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 ${
                                viewMode === 'transfers'
                                    ? 'bg-white dark:bg-[#1A2633] text-primary shadow-sm'
                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                            Ownership Transfers
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="mt-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    {/* Status Tabs */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
                        {viewMode === 'payments' ? (
                            (['Pending', 'Verified', 'Rejected'] as const).map((tab) => {
                                const count = transactions.filter(t => t.status === tab).length;
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => { setPaymentTab(tab); paymentPagination.setCurrentPage(1); }}
                                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap flex items-center gap-2 ${paymentTab === tab
                                            ? 'bg-white dark:bg-[#1A2633] text-primary shadow-sm'
                                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                            }`}
                                    >
                                        {tab} 
                                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${paymentTab === tab ? 'bg-primary/10 text-primary' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })
                        ) : (
                            (['Pending', 'Approved', 'Rejected'] as const).map((tab) => {
                                const count = transfers.filter(t => t.status === tab).length;
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => { setTransferTab(tab); transferPagination.setCurrentPage(1); }}
                                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap flex items-center gap-2 ${transferTab === tab
                                            ? 'bg-white dark:bg-[#1A2633] text-primary shadow-sm'
                                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                            }`}
                                    >
                                        {tab} 
                                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${transferTab === tab ? 'bg-primary/10 text-primary' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap">
                        {viewMode === 'payments' && (
                            <select
                                value={sourceFilter}
                                onChange={(e) => {
                                    setSourceFilter(e.target.value as any);
                                    paymentPagination.setCurrentPage(1);
                                }}
                                className="px-3 py-2.5 bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary/50 dark:text-white outline-none font-bold"
                            >
                                <option value="All">All Types</option>
                                <option value="booking_payment">Booking Payments</option>
                                <option value="expense">Corporate Expenses</option>
                                <option value="vendor_payout">Vendor Payouts</option>
                                <option value="partner_payout">Partner Payouts</option>
                            </select>
                        )}
                        <div className="relative flex-1 lg:w-64 min-w-[200px]">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                            <input
                                type="text"
                                placeholder={viewMode === 'payments' ? "Search by ID, Customer..." : "Search by ID, Item, Staff..."}
                                value={search}
                                onChange={(e) => { 
                                    setSearch(e.target.value); 
                                    if (viewMode === 'payments') {
                                        paymentPagination.setCurrentPage(1);
                                    } else {
                                        transferPagination.setCurrentPage(1);
                                    }
                                }}
                                className="pl-10 pr-4 py-2.5 bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-700 rounded-xl text-sm w-full focus:ring-2 focus:ring-primary/50 dark:text-white placeholder:text-slate-400 outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden p-4 md:p-8">
                <div className="bg-white dark:bg-[#1A2633] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-full flex flex-col">
                    <div className="overflow-x-auto flex-1">
                        {viewMode === 'payments' ? (
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Transaction ID</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Beneficiary / Customer</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Context / Amount</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Meta</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Receipt</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                                      {paginatedTransactions.length > 0 ? (
                                        paginatedTransactions.map((tx) => (
                                            <tr 
                                                key={tx.id} 
                                                className={`group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all border-l-4 ${
                                                    tx.source === 'booking_payment' ? 'border-l-emerald-500' :
                                                    tx.source === 'expense' ? 'border-l-amber-500' :
                                                    tx.source === 'vendor_payout' ? 'border-l-rose-500' :
                                                    tx.source === 'partner_payout' ? 'border-l-indigo-500' :
                                                    'border-l-transparent'
                                                }`}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold font-mono text-primary">{tx.id}</span>
                                                        <span className="text-xs text-slate-500 mt-1">{new Date(tx.date).toLocaleDateString()}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        {tx.source === 'expense' ? (
                                                            <div className="size-8 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold">
                                                                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                                                            </div>
                                                        ) : tx.source === 'vendor_payout' ? (
                                                            <div className="size-8 rounded-full bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold">
                                                                <span className="material-symbols-outlined text-[18px]">storefront</span>
                                                            </div>
                                                        ) : tx.source === 'partner_payout' ? (
                                                            <div className="size-8 rounded-full bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                                                                <span className="material-symbols-outlined text-[18px]">handshake</span>
                                                            </div>
                                                        ) : (
                                                            <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                                                {(tx.customer || 'U').charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900 dark:text-white">{tx.customer || 'Unknown Recipient'}</p>
                                                            <p className="text-xs text-slate-500">
                                                                {tx.source === 'expense' ? 'Operational Expense' :
                                                                 tx.source === 'vendor_payout' ? 'Vendor Payout' :
                                                                 tx.source === 'partner_payout' ? (tx.email || 'B2B Partner') :
                                                                 (tx.email || 'No email')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                                                        {tx.source === 'expense' ? `Category: ${tx.packageId || 'None'}` : 
                                                         tx.source === 'vendor_payout' ? `Vendor Payout` :
                                                         tx.source === 'partner_payout' ? `Partner Commission` :
                                                         (tx.bookingName || 'Unknown Booking')}
                                                    </p>
                                                    {(tx.source === 'booking_payment' || tx.source === 'partner_payout') && tx.bookingId && (
                                                        <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 break-all">
                                                            Booking: {tx.bookingId}
                                                        </p>
                                                    )}
                                                    {tx.source === 'vendor_payout' && tx.packageId && (
                                                        <p className="text-[10px] text-slate-450 mt-0.5 font-medium">
                                                            Category: {tx.packageId}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center gap-2 mt-2">
                                                        {tx.type === 'Refund' || tx.source === 'expense' || tx.source === 'vendor_payout' || tx.source === 'partner_payout' ? (
                                                            <span className="material-symbols-outlined text-red-650 text-[14px]">north_east</span>
                                                        ) : (
                                                            <span className="material-symbols-outlined text-green-655 text-[14px]">south_east</span>
                                                        )}
                                                        <span className={`text-sm kpi-number font-bold ${tx.type === 'Refund' || tx.source === 'expense' || tx.source === 'vendor_payout' || tx.source === 'partner_payout' ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
                                                            {tx.type === 'Refund' || tx.source === 'expense' || tx.source === 'vendor_payout' || tx.source === 'partner_payout' ? '-' : ''}₹{tx.amount.toLocaleString()}
                                                        </span>
                                                        {tx.recordedBy && (
                                                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                                                                by {tx.recordedBy}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded w-fit uppercase tracking-wider">
                                                            {tx.method}
                                                        </span>
                                                        {tx.reference && <span className="text-[10px] text-slate-505 font-mono">Ref: {tx.reference}</span>}
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded w-fit uppercase ${
                                                            tx.source === 'expense' ? 'bg-amber-100 text-amber-700' :
                                                            tx.source === 'vendor_payout' ? 'bg-rose-100 text-rose-700' :
                                                            tx.source === 'partner_payout' ? 'bg-indigo-100 text-indigo-700' :
                                                            'bg-emerald-100 text-emerald-700'
                                                        }`}>
                                                            {tx.source === 'expense' ? 'EXPENSE' :
                                                             tx.source === 'vendor_payout' ? 'VENDOR PAYOUT' :
                                                             tx.source === 'partner_payout' ? 'PARTNER PAYOUT' :
                                                             tx.type}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {tx.receiptUrl ? (
                                                        <a href={tx.receiptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
                                                            <span className="material-symbols-outlined text-[24px]">image</span>
                                                            <span className="text-[10px] font-bold">View</span>
                                                        </a>
                                                    ) : (
                                                        <span className="text-slate-300 dark:text-slate-600 text-xs">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(tx.status!)}`}>
                                                        <span className="size-1.5 rounded-full bg-current"></span>
                                                        {tx.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <ActionMenu>
                                                        {hasPermission('finance', 'manage') && tx.status === 'Pending' && (
                                                            <>
                                                                <button 
                                                                    onClick={() => {
                                                                        const entityName = 
                                                                            tx.source === 'expense' ? 'expense' :
                                                                            tx.source === 'vendor_payout' ? 'vendor payout' :
                                                                            tx.source === 'partner_payout' ? 'partner commission payout' :
                                                                            'booking payment';
                                                                        if(confirm(`Are you sure you want to verify this ${entityName}? This will perform account balance adjustments and ledger updates.`)) {
                                                                            updateTransactionStatus(tx.id, 'Verified');
                                                                        }
                                                                    }}
                                                                    className="px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-green-200 dark:border-green-800/50 w-full justify-start"
                                                                    title="Verify Payment"
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                                                    Verify
                                                                </button>
                                                                <button 
                                                                    onClick={() => {
                                                                        if(confirm('Reject this payment transaction? This will mark it as invalid.')) {
                                                                            updateTransactionStatus(tx.id, 'Rejected');
                                                                        }
                                                                    }}
                                                                    className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-red-200 dark:border-red-800/50 w-full justify-start"
                                                                    title="Reject Payment"
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px]">cancel</span>
                                                                    Reject
                                                                </button>
                                                            </>
                                                        )}
                                                        {hasPermission('finance', 'manage') && tx.status !== 'Pending' && (
                                                            <span className="text-xs text-slate-400 px-3">Processed</span>
                                                        )}
                                                    </ActionMenu>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                                <span className="material-symbols-outlined text-4xl opacity-20 mb-2">fact_check</span>
                                                <p>No transactions found in this state.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        ) : (
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Request Details</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Transfer Item</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Ownership Swap</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Reason / Requested By</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {paginatedTransfers.length > 0 ? (
                                        paginatedTransfers.map((tr) => (
                                            <tr key={tr.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold font-mono text-primary">{tr.id.substring(0, 8)}...</span>
                                                        <span className="text-xs text-slate-500 mt-1">{new Date(tr.created_at).toLocaleDateString()}</span>
                                                        <span className="text-[10px] font-extrabold uppercase mt-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 w-fit">
                                                            {tr.item_type}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <a 
                                                            href={`/admin/${tr.item_type === 'Lead' ? 'leads' : 'bookings'}`}
                                                            className="text-sm font-bold text-primary hover:underline flex items-center gap-1"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">
                                                                {tr.item_type === 'Lead' ? 'leaderboard' : 'book_online'}
                                                            </span>
                                                            {tr.item_name || `${tr.item_type} (${tr.item_id.substring(0, 8)})`}
                                                        </a>
                                                        <span className="block text-[10px] text-slate-400 font-mono mt-0.5">ID: {tr.item_id}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-bold uppercase text-slate-400">From</span>
                                                            <span className="font-bold text-slate-800 dark:text-slate-200">{tr.from_staff_name || 'Unknown'}</span>
                                                        </div>
                                                        <span className="material-symbols-outlined text-slate-400">arrow_right_alt</span>
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-bold uppercase text-slate-400">To</span>
                                                            <span className="font-bold text-primary">{tr.to_staff_name || 'Unknown'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="max-w-xs">
                                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 italic">
                                                            "{tr.reason || 'No reason provided'}"
                                                        </p>
                                                        <span className="block text-[10px] text-slate-500 mt-1">
                                                            Requested by: <strong className="font-bold text-slate-700 dark:text-slate-300">{tr.requested_by_name || 'System'}</strong>
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(tr.status)}`}>
                                                        <span className="size-1.5 rounded-full bg-current"></span>
                                                        {tr.status}
                                                    </span>
                                                    {tr.status === 'Rejected' && tr.rejection_reason && (
                                                        <span className="block text-[9.5px] text-red-500 font-medium italic mt-1 max-w-[150px] truncate" title={tr.rejection_reason}>
                                                            "{tr.rejection_reason}"
                                                        </span>
                                                    )}
                                                    {tr.status !== 'Pending' && tr.actioned_by_name && (
                                                        <span className="block text-[9px] text-slate-400 mt-1">
                                                            by {tr.actioned_by_name}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <ActionMenu>
                                                        {tr.status === 'Pending' ? (
                                                            <>
                                                                <button 
                                                                    onClick={() => {
                                                                        if(confirm('Are you sure you want to approve this ownership transfer? Ownership will swap immediately.')) {
                                                                            approveTransfer(tr.id);
                                                                        }
                                                                    }}
                                                                    className="px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-green-200 dark:border-green-800/50 w-full justify-start"
                                                                    title="Approve Transfer"
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                                                    Approve
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleRejectTransfer(tr.id)}
                                                                    className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-red-200 dark:border-red-800/50 w-full justify-start mt-1"
                                                                    title="Reject Transfer"
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px]">cancel</span>
                                                                    Reject
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <span className="text-xs text-slate-400 px-3">Processed</span>
                                                        )}
                                                    </ActionMenu>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                                <span className="material-symbols-outlined text-4xl opacity-20 mb-2">swap_horiz</span>
                                                <p>No transfer requests found in this state.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                    {/* Pagination */}
                    {viewMode === 'payments' ? (
                        filteredTransactions.length > 0 && (
                            <div className="mt-auto border-t border-slate-100 dark:border-slate-800">
                                <Pagination
                                    currentPage={paymentPagination.currentPage}
                                    totalItems={filteredTransactions.length}
                                    itemsPerPage={paymentPagination.itemsPerPage}
                                    onPageChange={paymentPagination.setCurrentPage}
                                    onItemsPerPageChange={paymentPagination.setItemsPerPage}
                                    showGoTo={true}
                                    itemName="transactions"
                                />
                            </div>
                        )
                    ) : (
                        filteredTransfers.length > 0 && (
                            <div className="mt-auto border-t border-slate-100 dark:border-slate-800">
                                <Pagination
                                    currentPage={transferPagination.currentPage}
                                    totalItems={filteredTransfers.length}
                                    itemsPerPage={transferPagination.itemsPerPage}
                                    onPageChange={transferPagination.setCurrentPage}
                                    onItemsPerPageChange={transferPagination.setItemsPerPage}
                                    showGoTo={true}
                                    itemName="transfers"
                                />
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};
