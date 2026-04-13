import React, { useState } from 'react';
import { Booking, BookingTransaction } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

interface LedgerManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: Booking;
}

export const LedgerManagementModal: React.FC<LedgerManagementModalProps> = ({ isOpen, onClose, booking }) => {
    const { addBookingTransaction, deleteBookingTransaction } = useData();
    const { currentUser, hasPermission } = useAuth();

    // Derived Totals
    const transactions = booking.transactions || [];
    // Verified/Rejected separated so summary is financially accurate
    const verifiedPayments = transactions.filter(t => t.type === 'Payment' && t.status !== 'Rejected' && t.status !== 'Pending');
    const pendingPayments = transactions.filter(t => t.type === 'Payment' && t.status === 'Pending');
    const totalPaid = verifiedPayments.reduce((sum, t) => sum + t.amount, 0);
    const pendingAmount = pendingPayments.reduce((sum, t) => sum + t.amount, 0);
    const totalRefunded = transactions.filter(t => t.type === 'Refund' && t.status !== 'Rejected').reduce((sum, t) => sum + t.amount, 0);
    const netReceived = totalPaid - totalRefunded;
    const balanceDue = booking.amount - netReceived;

    // Form State
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [formData, setFormData] = useState<Partial<BookingTransaction>>({
        amount: '' as any,
        date: new Date().toISOString().split('T')[0],
        type: 'Payment',
        method: 'Bank Transfer',
        reference: '',
        notes: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newTx: BookingTransaction = {
            id: `TX-${Date.now()}`,
            bookingId: booking.id,
            amount: Number(formData.amount),
            date: formData.date!,
            type: formData.type as any,
            method: formData.method as any,
            reference: formData.reference,
            notes: formData.notes,
            recordedBy: currentUser?.name
        };
        addBookingTransaction(booking.id, newTx);
        toast.success(`${newTx.type} recorded successfully`);
        setIsFormVisible(false);
        setFormData({
            amount: '' as any,
            date: new Date().toISOString().split('T')[0],
            type: 'Payment',
            method: 'Bank Transfer',
            reference: '',
            notes: ''
        });
    };

    const handleDelete = (txId: string) => {
        if (window.confirm('Are you sure you want to delete this transaction?')) {
            deleteBookingTransaction(booking.id, txId);
            toast.success('Transaction deleted');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-[#1A2633] w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 h-[80vh]">
                <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start gap-3 bg-slate-50 dark:bg-slate-800/50">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Billing Ledger</h2>
                        <p className="text-xs text-slate-500 font-bold uppercase mt-1 break-all">Client: {booking.customer} | Booking: {booking.id}</p>
                    </div>
                    <div className="flex gap-3">
                        {hasPermission('finance', 'manage') && (
                            <button
                                onClick={() => setIsFormVisible(true)}
                                className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition-colors flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[20px]">add_card</span> Record Payment
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                            <p className="text-xs font-bold text-slate-500 uppercase">Booking Value</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">₹{booking.amount.toLocaleString()}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30">
                            <p className="text-xs font-bold text-emerald-600 uppercase">Verified Received</p>
                            <p className="text-2xl font-black text-emerald-600 mt-1">₹{totalPaid.toLocaleString()}</p>
                        </div>
                        {pendingAmount > 0 && (
                            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
                                <p className="text-xs font-bold text-amber-600 uppercase flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">pending</span>
                                    Pending Verify
                                </p>
                                <p className="text-2xl font-black text-amber-600 mt-1">₹{pendingAmount.toLocaleString()}</p>
                            </div>
                        )}
                        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/30">
                            <p className="text-xs font-bold text-rose-600 uppercase">Refunded</p>
                            <p className="text-2xl font-black text-rose-600 mt-1">₹{totalRefunded.toLocaleString()}</p>
                        </div>
                        <div className={`p-4 rounded-xl border ${balanceDue > 0 ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/30' : 'bg-slate-100 dark:bg-slate-800 border-slate-200'}`}>
                            <p className={`text-xs font-bold uppercase ${balanceDue > 0 ? 'text-amber-600' : 'text-slate-500'}`}>Balance Due</p>
                            <p className={`text-2xl font-black mt-1 ${balanceDue > 0 ? 'text-amber-600' : 'text-slate-500'}`}>₹{balanceDue > 0 ? balanceDue.toLocaleString() : 0}</p>
                        </div>
                    </div>

                    {/* Add Transaction Form */}
                    {isFormVisible && (
                        <div className="mb-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-4">
                            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Record New Transaction</h3>
                            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500">Date</label>
                                    <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500">Type</label>
                                    <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary">
                                        <option value="Payment">Payment Received</option>
                                        <option value="Refund">Refund Given</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500">Amount (₹)</label>
                                    <input type="number" required value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value as any })} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500">Mode</label>
                                    <select value={formData.method} onChange={e => setFormData({ ...formData, method: e.target.value as any })} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary">
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="UPI">UPI</option>
                                        <option value="Credit Card">Credit Card</option>
                                        <option value="Cash">Cash</option>
                                        <option value="Cheque">Cheque</option>
                                    </select>
                                </div>
                                <div className="space-y-1 lg:col-span-2">
                                    <label className="text-xs font-bold text-slate-500">Reference / Notes</label>
                                    <input type="text" value={formData.reference} onChange={e => setFormData({ ...formData, reference: e.target.value })} placeholder="Txn ID, Cheque No, etc." className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                <div className="lg:col-span-3 flex justify-end gap-3 pt-2">
                                    <button type="button" onClick={() => setIsFormVisible(false)} className="px-5 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100 transition-colors">Cancel</button>
                                    <button type="submit" className="px-6 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20">Save Transaction</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Transactions Table */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[640px]">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-5 py-4">Date</th>
                                    <th className="px-5 py-4">Type</th>
                                    <th className="px-5 py-4">Method</th>
                                    <th className="px-5 py-4">Details</th>
                                    <th className="px-5 py-4 text-right">Amount</th>
                                    <th className="px-5 py-4 text-center">Status</th>
                                    <th className="px-5 py-4 text-center">Recorded By</th>
                                    <th className="px-5 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-8 text-center text-slate-400 italic">No transactions recorded yet.</td>
                                    </tr>
                                ) : (
                                    transactions.map(tx => (
                                        <tr key={tx.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${tx.status === 'Rejected' ? 'opacity-50' : ''}`}>
                                            <td className="px-5 py-4 text-slate-600 dark:text-slate-300 font-mono">
                                                {new Date(tx.date).toLocaleDateString()}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${tx.type === 'Payment' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                    {tx.type}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-slate-700 dark:text-slate-300">{tx.method}</td>
                                            <td className="px-5 py-4 text-slate-500 text-xs">
                                                {tx.reference && <div className="font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded w-fit mb-0.5">{tx.reference}</div>}
                                                {tx.notes}
                                            </td>
                                            <td className={`px-5 py-4 text-right font-bold ${tx.type === 'Payment' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {tx.type === 'Refund' ? '-' : '+'}₹{tx.amount.toLocaleString()}
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                {tx.status === 'Verified' && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Verified</span>}
                                                {tx.status === 'Pending' && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">⏳ Pending</span>}
                                                {tx.status === 'Rejected' && <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">✕ Rejected</span>}
                                                {!tx.status && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Verified</span>}
                                            </td>
                                            <td className="px-5 py-4 text-center text-xs text-slate-400">
                                                {tx.recordedBy || 'System'}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                {hasPermission('finance', 'manage') && (
                                                    <button onClick={() => handleDelete(tx.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
