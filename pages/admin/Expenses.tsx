import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useExpenses } from '../../src/hooks/useExpenses';
import { toast } from 'sonner';
import {
    Wallet, TrendingDown, Calendar, Plus, Filter,
    FileText, CheckCircle, AlertCircle, Trash2, Pencil, Loader2
} from 'lucide-react';
import { Expense } from '../../types';

export const Expenses: React.FC = () => {
    const { expenses, isLoading, addExpense, updateExpense, deleteExpense } = useExpenses();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filterCategory, setFilterCategory] = useState<string>('All');
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [newExpense, setNewExpense] = useState<Partial<Expense>>({
        category: 'Other', paymentMethod: 'UPI', status: 'Paid', date: new Date().toISOString().split('T')[0]
    });

    const categories = ['Rent', 'Salaries', 'Software', 'Marketing', 'Office Supplies', 'Utilities', 'Other'];

    const filteredExpenses = useMemo(() => {
        return expenses.filter(e => filterCategory === 'All' || e.category === filterCategory);
    }, [expenses, filterCategory]);

    const stats = useMemo(() => {
        const total = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
        const paid = filteredExpenses.filter(e => e.status === 'Paid').reduce((sum, e) => sum + Number(e.amount || 0), 0);
        const pending = filteredExpenses.filter(e => e.status === 'Pending').reduce((sum, e) => sum + Number(e.amount || 0), 0);
        return { total, paid, pending };
    }, [filteredExpenses]);

    const handleOpenModal = (expense?: Expense) => {
        if (expense) {
            setEditingExpense(expense);
            setNewExpense({ ...expense });
        } else {
            setEditingExpense(null);
            setNewExpense({ category: 'Other', paymentMethod: 'UPI', status: 'Paid', date: new Date().toISOString().split('T')[0] });
        }
        setIsModalOpen(true);
    };

    const handleSaveExpense = async (e: React.FormEvent) => {
        e.preventDefault();

        if (editingExpense) {
            // Update existing
            await updateExpense(editingExpense.id, newExpense);
        } else {
            // Create new
            const expense: Expense = {
                id: `EXP-${Date.now()}`,
                title: newExpense.title!,
                amount: Number(newExpense.amount),
                category: newExpense.category as any,
                date: newExpense.date!,
                paymentMethod: newExpense.paymentMethod as any,
                status: newExpense.status as any,
                notes: newExpense.notes
            };
            await addExpense(expense);
        }
        setIsModalOpen(false);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Delete this expense record?")) {
            await deleteExpense(id);
        }
    };

    const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

    return (
        <div className="flex flex-col h-full admin-page-bg">
            {/* Header */}
            <div className="bg-white dark:bg-[#1A2633] border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Wallet className="text-red-500" /> <span className="font-display text-3xl">Expense Management</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Track monthly operational costs (Rent, Salaries, etc.)</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm px-5 py-2.5 shadow-lg shadow-red-600/20 active:scale-95 transition-all btn-glow"
                >
                    <Plus size={18} /> Record Expense
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-cards">
                    <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600">
                                <TrendingDown size={24} />
                            </div>
                            <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-500">This Month</span>
                        </div>
                        <p className="text-sm font-medium text-slate-500">Total Expenses</p>
                        <h3 className="text-4xl kpi-number text-slate-900 dark:text-white mt-1">{fmt(stats.total)}</h3>
                    </div>
                    <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600">
                                <CheckCircle size={24} />
                            </div>
                        </div>
                        <p className="text-sm font-medium text-slate-500">Paid Amount</p>
                        <h3 className="text-4xl kpi-number text-slate-900 dark:text-white mt-1">{fmt(stats.paid)}</h3>
                    </div>
                    <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-orange-600">
                                <AlertCircle size={24} />
                            </div>
                        </div>
                        <p className="text-sm font-medium text-slate-500">Pending Payables</p>
                        <h3 className="text-4xl kpi-number text-slate-900 dark:text-white mt-1">{fmt(stats.pending)}</h3>
                    </div>
                </div>

                {/* Filters & List */}
                <div className="bg-white dark:bg-[#1A2633] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex gap-2 overflow-x-auto">
                        <button
                            onClick={() => setFilterCategory('All')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap border ${filterCategory === 'All' ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}
                        >
                            All Expenses
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setFilterCategory(cat)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap border ${filterCategory === cat ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs">Title</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs">Date</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs">Category</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs">Status</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs text-right">Amount</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredExpenses.length > 0 ? (
                                    filteredExpenses.map(expense => (
                                        <tr key={expense.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900 dark:text-white">{expense.title}</div>
                                                <div className="text-xs text-slate-400 flex items-center gap-1">
                                                    <span>{expense.paymentMethod}</span>
                                                    {expense.notes && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="truncate max-w-[150px]" title={expense.notes}>{expense.notes}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                                                {new Date(expense.date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-bold text-slate-600 dark:text-slate-300">
                                                    {expense.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${expense.status === 'Paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700'}`}>
                                                    {expense.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white">
                                                {fmt(expense.amount)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => handleOpenModal(expense)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary rounded-lg transition-colors">
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button onClick={() => handleDelete(expense.id)} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                                            No expenses found for this category.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A2633] w-full max-w-lg rounded-2xl shadow-2xl animate-in zoom-in-95">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white">
                                {editingExpense ? 'Edit Expense' : 'Record New Expense'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)}><span className="material-symbols-outlined text-slate-400">close</span></button>
                        </div>
                        <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Expense Title</label>
                                <input required className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl w-full font-bold outline-none focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-white"
                                    placeholder="e.g. November Rent"
                                    value={newExpense.title || ''}
                                    onChange={e => setNewExpense({ ...newExpense, title: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Amount (₹)</label>
                                    <input required type="number" className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl w-full font-black outline-none focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-white"
                                        value={newExpense.amount || ''}
                                        onChange={e => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Date</label>
                                    <input required type="date" className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl w-full font-bold outline-none focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-white"
                                        value={newExpense.date}
                                        onChange={e => setNewExpense({ ...newExpense, date: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Category</label>
                                    <select className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl w-full font-bold outline-none focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-white"
                                        value={newExpense.category}
                                        onChange={e => setNewExpense({ ...newExpense, category: e.target.value as any })}
                                    >
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Status</label>
                                    <select className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl w-full font-bold outline-none focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-white"
                                        value={newExpense.status}
                                        onChange={e => setNewExpense({ ...newExpense, status: e.target.value as any })}
                                    >
                                        <option value="Paid">Paid</option>
                                        <option value="Pending">Pending</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Payment Method</label>
                                <select className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl w-full font-bold outline-none focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-white"
                                    value={newExpense.paymentMethod}
                                    onChange={e => setNewExpense({ ...newExpense, paymentMethod: e.target.value as any })}
                                >
                                    <option value="UPI">UPI</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Credit Card">Credit Card</option>
                                    <option value="Cash">Cash</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Payment Confirmation Note</label>
                                <input className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl w-full font-bold outline-none focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-white"
                                    placeholder="e.g. Transaction ID, Check #, or brief note"
                                    value={newExpense.notes || ''}
                                    onChange={e => setNewExpense({ ...newExpense, notes: e.target.value })}
                                />
                            </div>

                            <button type="submit" className="w-full py-4 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all mt-4">
                                {editingExpense ? 'Update Expense' : 'Record Expense'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
