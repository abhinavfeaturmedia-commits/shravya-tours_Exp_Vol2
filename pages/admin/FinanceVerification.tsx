import React, { useState, useMemo } from 'react';
import { useFinance, FinanceTransaction } from '../../src/hooks/useFinance';
import { useAuth } from '../../context/AuthContext';
import { Pagination, usePagination } from '../../components/ui/Pagination';

export const FinanceVerification: React.FC = () => {
    const { transactions, isLoading, updateTransactionStatus } = useFinance();
    const { hasPermission } = useAuth();
    
    const [activeTab, setActiveTab] = useState<'Pending' | 'Verified' | 'Rejected'>('Pending');
    const [search, setSearch] = useState('');

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const matchesTab = tx.status === activeTab;
            const matchesSearch = 
                tx.id.toLowerCase().includes(search.toLowerCase()) || 
                (tx.customer && tx.customer.toLowerCase().includes(search.toLowerCase())) ||
                (tx.bookingId && tx.bookingId.toLowerCase().includes(search.toLowerCase())) ||
                (tx.reference && tx.reference.toLowerCase().includes(search.toLowerCase()));
            return matchesTab && matchesSearch;
        });
    }, [transactions, activeTab, search]);

    const { currentPage, setCurrentPage, itemsPerPage, setItemsPerPage, paginateData } = usePagination(filteredTransactions.length, 15);
    const paginatedTransactions = paginateData<FinanceTransaction>(filteredTransactions);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Verified': return 'bg-green-100 text-green-700 border-green-200';
            case 'Pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <div className="size-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-slate-400 text-sm font-medium animate-pulse">Loading Payments...</p>
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
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight"><span className="font-display text-3xl">Payment Approvals</span></h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Verify or reject client payments submitted for bookings.</p>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="mt-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
                        {(['Pending', 'Verified', 'Rejected'] as const).map((tab) => {
                            const count = transactions.filter(t => t.status === tab).length;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
                                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === tab
                                        ? 'bg-white dark:bg-[#1A2633] text-primary shadow-sm'
                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                >
                                    {tab} 
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === tab ? 'bg-primary/10 text-primary' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <div className="relative flex-1 lg:w-64">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                            <input
                                type="text"
                                placeholder="Search by ID, Customer..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
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
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Transaction ID</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Customer</th>
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
                                        <tr key={tx.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold font-mono text-primary">{tx.id}</span>
                                                    <span className="text-xs text-slate-500 mt-1">{new Date(tx.date).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-300">
                                                        {(tx.customer || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{tx.customer || 'Unknown Client'}</p>
                                                        <p className="text-xs text-slate-500">{tx.email || 'No email'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs font-mono text-slate-600 dark:text-slate-400 break-all">
                                                    {tx.source === 'expense' ? `Category: ${tx.packageId || 'None'}` : tx.bookingId}
                                                </p>
                                                <span className={`text-sm kpi-number font-bold mt-1 block ${tx.type === 'Refund' || tx.source === 'expense' ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
                                                    {tx.type === 'Refund' || tx.source === 'expense' ? '-' : ''}₹{tx.amount.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded w-fit uppercase tracking-wider">
                                                        {tx.method}
                                                    </span>
                                                    {tx.reference && <span className="text-[10px] text-slate-500 font-mono">Ref: {tx.reference}</span>}
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded w-fit uppercase ${tx.source === 'expense' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                        {tx.source === 'expense' ? 'EXPENSE' : tx.type}
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
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {hasPermission('finance', 'manage') && tx.status === 'Pending' && (
                                                        <>
                                                            <button 
                                                                onClick={() => {
                                                                    if(confirm('Are you sure you want to verify this payment? It will be permanently recorded towards the booking.')) {
                                                                        updateTransactionStatus(tx.id, 'Verified');
                                                                    }
                                                                }}
                                                                className="px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-green-200 dark:border-green-800/50"
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
                                                                className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-red-200 dark:border-red-800/50"
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
                                                </div>
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
                    </div>
                     {/* Pagination */}
                     {filteredTransactions.length > 0 && (
                        <div className="mt-auto border-t border-slate-100 dark:border-slate-800">
                            <Pagination
                                currentPage={currentPage}
                                totalItems={filteredTransactions.length}
                                itemsPerPage={itemsPerPage}
                                onPageChange={setCurrentPage}
                                onItemsPerPageChange={setItemsPerPage}
                                showGoTo={true}
                                itemName="transactions"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
