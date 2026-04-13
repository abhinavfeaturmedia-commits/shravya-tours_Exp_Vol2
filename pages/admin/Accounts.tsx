
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { Account, AccountTransaction } from '../../types';
import { toast } from 'sonner';
import { parseInvoice } from '../../src/lib/gemini';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ActionMenu } from '../../components/ui/ActionMenu';

export const Accounts: React.FC = () => {
    const { accounts, addAccount, updateAccount, deleteAccount, addAccountTransaction, updateAccountTxStatus, bookings } = useData();
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'Overview' | 'Transactions' | 'Settings'>('Overview');
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('All');

    // AI State
    const [isScanning, setIsScanning] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [transactionType, setTransactionType] = useState<'Credit' | 'Debit'>('Credit');

    // Forms
    const [newAcc, setNewAcc] = useState<Partial<Account>>({
        name: '', companyName: '', type: 'Agent', email: '', phone: ''
    });
    const [paymentForm, setPaymentForm] = useState({ amount: '', reference: '', description: '' });

    const selectedAccount = accounts.find(a => a.id === selectedAccountId);

    // Derived Stats
    const accountStats = useMemo(() => {
        if (!selectedAccount) return { tour: 0, car: 0, bus: 0, total: 0 };
        const accountBookings = bookings.filter(b =>
            b.customer.toLowerCase().includes(selectedAccount.companyName.toLowerCase()) ||
            b.customer.toLowerCase().includes(selectedAccount.name.toLowerCase())
        );

        return {
            tour: accountBookings.filter(b => b.type === 'Tour').length,
            car: accountBookings.filter(b => b.type === 'Car').length,
            bus: accountBookings.filter(b => b.type === 'Bus').length,
            total: accountBookings.length
        };
    }, [selectedAccount, bookings]);

    // Default selection
    useEffect(() => {
        if (window.innerWidth >= 1024 && !selectedAccountId && accounts.length > 0) {
            setSelectedAccountId(accounts[0].id);
        }
    }, [accounts]);

    const filteredAccounts = accounts.filter(acc => {
        const matchesSearch = acc.companyName.toLowerCase().includes(search.toLowerCase()) || acc.name.toLowerCase().includes(search.toLowerCase());
        const matchesType = filterType === 'All' || acc.type === filterType;
        return matchesSearch && matchesType;
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        addAccount({
            id: `ACC-${Date.now()}`,
            name: newAcc.name!,
            companyName: newAcc.companyName!,
            type: newAcc.type as any,
            email: newAcc.email!,
            phone: newAcc.phone!,
            location: 'Unknown',
            currentBalance: 0,
            status: 'Active',
            logo: `https://placehold.co/100x100/purple/white?text=${newAcc.name?.charAt(0)}`,
            transactions: []
        });
        setIsCreateModalOpen(false);
        setNewAcc({ name: '', companyName: '', type: 'Agent', email: '', phone: '' });
    };

    const handleRecordPayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAccount) return;

        const tx: AccountTransaction = {
            id: `TX-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            type: transactionType,
            amount: Number(paymentForm.amount),
            description: paymentForm.description || (transactionType === 'Credit' ? 'Wallet Top-up' : 'Manual Debit'),
            reference: paymentForm.reference
        };

        addAccountTransaction(selectedAccount.id, tx);
        setIsPaymentModalOpen(false);
        setPaymentForm({ amount: '', reference: '', description: '' });
    };

    const handleToggleStatus = () => {
        if (!selectedAccount) return;
        const newStatus = selectedAccount.status === 'Active' ? 'Blocked' : 'Active';
        updateAccount(selectedAccount.id, { status: newStatus });
    };

    const handleGenerateStatement = () => {
        if (!selectedAccount) return;

        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.setTextColor(59, 130, 246); // Blue
        doc.text('Shravya Tours', 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('123 Adventure Avenue, Mumbai, India', 14, 28);

        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text('LEDGER STATEMENT', 140, 22);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 28);

        // Account Details
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`Account: ${selectedAccount.companyName}`, 14, 45);
        doc.setFontSize(10);
        doc.text(`Contact: ${selectedAccount.name} (${selectedAccount.phone})`, 14, 51);
        doc.text(`Type: ${selectedAccount.type} Partner`, 14, 57);

        // Table
        const tableData = selectedAccount.transactions.map(tx => [
            tx.date,
            tx.description,
            tx.reference || '-',
            `${tx.type === 'Credit' ? '+' : '-'} Rs. ${tx.amount.toLocaleString()}`
        ]);

        autoTable(doc, {
            startY: 65,
            head: [['Date', 'Description', 'Reference', 'Amount']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0] },
            columnStyles: {
                3: { halign: 'right' }
            }
        });

        const finalY = (doc as any).lastAutoTable.finalY || 65;

        // Balance
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Net Balance: Rs. ${selectedAccount.currentBalance.toLocaleString()}`, 140, finalY + 15);

        // Footer
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150);
        doc.text('Generated by Shravya Tours Admin System.', 105, 280, { align: 'center' });

        doc.save(`Ledger_${selectedAccount.companyName}_${new Date().getTime()}.pdf`);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        const toastId = toast.loading("Scanning Invoice...");

        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                try {
                    const data = await parseInvoice(base64String);

                    setTransactionType('Debit');
                    setPaymentForm({
                        amount: data.amount?.toString() || '',
                        reference: data.reference || data.invoice_number || '',
                        description: data.description || `Payment to ${data.vendor || 'Vendor'}`
                    });

                    setIsPaymentModalOpen(true);
                    toast.success("Invoice Scanned Successfully!");
                } catch (err) {
                    console.error(err);
                    toast.error("Failed to read invoice. Try a clearer image.");
                } finally {
                    setIsScanning(false);
                    toast.dismiss(toastId);
                }
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error(error);
            setIsScanning(false);
            toast.dismiss(toastId);
        }

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="flex h-full flex-col admin-page-bg relative">

            {/* Header */}
            <div className="px-6 py-4 flex-shrink-0 bg-white dark:bg-[#1A2633] border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shadow-sm z-20">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight"><span className="font-display text-3xl">Accounts & Agents</span></h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Manage B2B partners and track their booking performance.</p>
                </div>
                <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all btn-glow">
                    <span className="material-symbols-outlined text-[20px]">person_add</span> <span className="hidden md:inline text-sm">Add Account</span>
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden">

                {/* LEFT SIDEBAR: LIST */}
                <div className={`w-full lg:w-[400px] flex flex-col bg-white dark:bg-[#1A2633] border-r border-slate-200 dark:border-slate-800 shrink-0 z-10 ${selectedAccountId ? 'hidden lg:flex' : 'flex'}`}>
                    {/* Search & Filters */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-900/20">
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">search</span>
                            <input
                                placeholder="Search companies..."
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            {['All', 'Agent', 'Corporate'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => setFilterType(type)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-colors border ${filterType === type ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {filteredAccounts.map(acc => (
                            <div
                                key={acc.id}
                                onClick={() => setSelectedAccountId(acc.id)}
                                className={`p-4 cursor-pointer rounded-xl transition-all border ${selectedAccountId === acc.id ? 'bg-primary/5 border-primary shadow-sm' : 'bg-white dark:bg-[#1A2633] border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`size-10 rounded-full flex items-center justify-center font-black text-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700`}>
                                            {acc.companyName.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className={`text-sm font-bold ${selectedAccountId === acc.id ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>{acc.companyName}</h3>
                                            <p className="text-xs text-slate-500 font-medium truncate max-w-[120px]">{acc.name}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wide ${acc.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                        {acc.status}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between pl-[52px]">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">Balance</span>
                                        <span className={`text-sm font-black ${acc.currentBalance < 0 ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>₹{(acc.currentBalance / 1000).toFixed(1)}k</span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">Type</span>
                                        <span className="text-sm font-medium text-slate-900 dark:text-white">{acc.type}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT CONTENT: DETAIL VIEW */}
                <div className={`flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900 overflow-hidden ${selectedAccountId ? 'fixed inset-0 z-50 lg:static' : 'hidden lg:flex'}`}>
                    {selectedAccount ? (
                        <>
                            {/* Header */}
                            <div className="bg-white dark:bg-[#1A2633] border-b border-slate-200 dark:border-slate-800 px-6 py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm z-10">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setSelectedAccountId(null)} className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full"><span className="material-symbols-outlined">arrow_back</span></button>
                                    <div className="size-16 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center font-black text-2xl text-slate-500 dark:text-slate-300 shadow-inner">
                                        {selectedAccount.companyName.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-none">{selectedAccount.companyName}</h2>
                                        <div className="flex items-center gap-3 mt-1.5 text-sm font-medium text-slate-500">
                                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">person</span> {selectedAccount.name}</span>
                                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">location_on</span> {selectedAccount.location}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                    {['Overview', 'Transactions', 'Settings'].map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab as any)}
                                            className={`px-6 py-2 rounded-md text-xs font-bold transition-all ${activeTab === tab ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                                {activeTab === 'Overview' && (
                                    <div className="max-w-4xl mx-auto space-y-6">
                                        {/* Statistics Card */}
                                        <div className="bg-white dark:bg-[#1A2633] p-8 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800">
                                            <div className="flex justify-between items-center mb-8">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Account Volume</p>
                                                    <h3 className="text-5xl kpi-number text-slate-900 dark:text-white">{accountStats.total} <span className="text-lg text-slate-400 font-medium">Bookings</span></h3>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Wallet Balance</p>
                                                    <p className={`text-2xl font-black ${selectedAccount.currentBalance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                        ₹{selectedAccount.currentBalance.toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Breakdown */}
                                            <div className="grid grid-cols-3 gap-4 mb-8">
                                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                                                    <span className="material-symbols-outlined text-blue-500 mb-2">luggage</span>
                                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{accountStats.tour}</p>
                                                    <p className="text-[10px] uppercase font-bold text-slate-400">Tours</p>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                                                    <span className="material-symbols-outlined text-orange-500 mb-2">directions_car</span>
                                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{accountStats.car}</p>
                                                    <p className="text-[10px] uppercase font-bold text-slate-400">Cars</p>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                                                    <span className="material-symbols-outlined text-purple-500 mb-2">directions_bus</span>
                                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{accountStats.bus}</p>
                                                    <p className="text-[10px] uppercase font-bold text-slate-400">Buses</p>
                                                </div>
                                            </div>

                                            <div className="flex gap-4">
                                                <button onClick={() => { setActiveTab('Transactions'); setTransactionType('Credit'); setIsPaymentModalOpen(true); }} className="flex-1 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 btn-glow">
                                                    <span className="material-symbols-outlined text-sm">add_card</span> Add Funds
                                                </button>
                                                <button onClick={handleGenerateStatement} className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
                                                    <span className="material-symbols-outlined text-sm">description</span> Ledger Statement
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4">Contact Info</h4>
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"><span className="material-symbols-outlined text-[18px]">email</span></div>
                                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{selectedAccount.email}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"><span className="material-symbols-outlined text-[18px]">call</span></div>
                                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{selectedAccount.phone}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"><span className="material-symbols-outlined text-[18px]">business</span></div>
                                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{selectedAccount.type} Partner</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2">Account Status</h4>
                                                    <p className="text-sm text-slate-500 mb-4">
                                                        Current status is <span className={`font-bold ${selectedAccount.status === 'Active' ? 'text-green-600' : 'text-red-500'}`}>{selectedAccount.status}</span>.
                                                        {selectedAccount.status === 'Blocked' && ' Booking privileges are revoked.'}
                                                    </p>
                                                </div>
                                                {selectedAccount.status === 'Active' ? (
                                                    <button onClick={handleToggleStatus} className="w-full py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold uppercase hover:bg-red-100 transition-colors">
                                                        Block Account
                                                    </button>
                                                ) : (
                                                    <button onClick={handleToggleStatus} className="w-full py-2 bg-green-50 text-green-600 border border-green-200 rounded-lg text-xs font-bold uppercase hover:bg-green-100 transition-colors">
                                                        Activate Account
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'Transactions' && (
                                    <div className="max-w-5xl mx-auto space-y-6">
                                        <div className="flex justify-between items-center">
                                            <h3 className="font-black text-xl text-slate-900 dark:text-white">Transaction History</h3>
                                            <div className="flex gap-2">
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={handleFileUpload}
                                                />
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={isScanning}
                                                    className="px-4 py-2 bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold shadow-sm hover:bg-purple-200 flex items-center gap-1 transition-colors"
                                                >
                                                    <span className={`material-symbols-outlined text-sm ${isScanning ? 'animate-spin' : ''}`}>
                                                        {isScanning ? 'sync' : 'document_scanner'}
                                                    </span>
                                                    {isScanning ? 'Scanning...' : 'AI Scan Invoice'}
                                                </button>
                                                <button onClick={() => { setTransactionType('Debit'); setPaymentForm({ amount: '', reference: '', description: 'Correction Debit' }); setIsPaymentModalOpen(true); }} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">remove</span> Debit
                                                </button>
                                                <button onClick={() => { setTransactionType('Credit'); setPaymentForm({ amount: '', reference: '', description: '' }); setIsPaymentModalOpen(true); }} className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold shadow-sm hover:bg-primary-dark flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">add</span> Add Funds
                                                </button>
                                            </div>
                                        </div>

                                        <div className="bg-white dark:bg-[#1A2633] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs font-black uppercase text-slate-400 tracking-wider">
                                                    <tr>
                                                        <th className="px-6 py-4">Date</th>
                                                        <th className="px-6 py-4">Description</th>
                                                        <th className="px-6 py-4">Status</th>
                                                        <th className="px-6 py-4">Reference</th>
                                                        <th className="px-6 py-4 text-right">Amount</th>
                                                        <th className="px-6 py-4 text-center">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {selectedAccount.transactions && selectedAccount.transactions.length > 0 ? (
                                                        selectedAccount.transactions.map(tx => (
                                                            <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                                <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-400">{tx.date}</td>
                                                                <td className="px-6 py-4">
                                                                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${tx.type === 'Credit' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{tx.description}</span>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${tx.status === 'Confirmed' ? 'bg-green-100 text-green-700' : tx.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                                                        {tx.status || 'Pending'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-xs font-mono text-slate-500">{tx.reference || '-'}</td>
                                                                <td className={`px-6 py-4 text-right font-black text-sm ${tx.type === 'Credit' ? 'text-green-600' : 'text-red-500'}`}>
                                                                    {tx.type === 'Credit' ? '+' : '-'} ₹{tx.amount.toLocaleString()}
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    {(tx.status === 'Pending' || !tx.status) && (
                                                                        <div className="flex items-center justify-center gap-2">
                                                                            <button onClick={() => updateAccountTxStatus(selectedAccount.id, tx.id, 'Confirmed')} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Confirm">
                                                                                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                                                            </button>
                                                                            <button onClick={() => updateAccountTxStatus(selectedAccount.id, tx.id, 'Rejected')} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Reject">
                                                                                <span className="material-symbols-outlined text-[18px]">cancel</span>
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">No transactions found.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'Settings' && (
                                    <div className="max-w-2xl mx-auto space-y-8 pt-8">
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-black text-red-600 uppercase tracking-wider border-b border-red-100 dark:border-red-900/30 pb-2">Danger Zone</h3>
                                            <button onClick={() => { if (confirm('Delete this account?')) { deleteAccount(selectedAccount.id); setSelectedAccountId(null); } }} className="w-full py-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 font-bold rounded-xl text-sm hover:bg-red-100 transition-colors">
                                                Delete Account Permanently
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="size-32 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-sm animate-in zoom-in duration-500 border border-slate-100 dark:border-slate-700">
                                <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600">account_balance</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Select an account</h3>
                            <p className="text-slate-500 max-w-xs">View booking history, wallet balance, and manage B2B partners.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* CREATE MODAL */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A2633] w-full max-w-lg p-8 rounded-3xl shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Onboard New Account</h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Company Name</label>
                                    <input required className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl w-full text-sm font-bold focus:ring-2 focus:ring-primary outline-none" value={newAcc.companyName} onChange={e => setNewAcc({ ...newAcc, companyName: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Contact Person</label>
                                    <input required className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl w-full text-sm font-bold focus:ring-2 focus:ring-primary outline-none" value={newAcc.name} onChange={e => setNewAcc({ ...newAcc, name: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Email</label>
                                    <input required className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl w-full text-sm font-bold focus:ring-2 focus:ring-primary outline-none" value={newAcc.email} onChange={e => setNewAcc({ ...newAcc, email: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Phone</label>
                                    <input required className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl w-full text-sm font-bold focus:ring-2 focus:ring-primary outline-none" value={newAcc.phone} onChange={e => setNewAcc({ ...newAcc, phone: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Account Type</label>
                                <select className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl w-full text-sm font-bold focus:ring-2 focus:ring-primary outline-none" value={newAcc.type} onChange={e => setNewAcc({ ...newAcc, type: e.target.value as any })}>
                                    <option>Agent</option>
                                    <option>Corporate</option>
                                </select>
                            </div>

                            <button type="submit" className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary-dark transition-all mt-2">Create Account</button>
                        </form>
                    </div>
                </div>
            )}

            {/* PAYMENT MODAL */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A2633] w-full max-w-sm p-8 rounded-3xl shadow-2xl animate-in zoom-in-95 text-center">
                        <div className={`size-16 rounded-full flex items-center justify-center mx-auto mb-4 ${transactionType === 'Credit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            <span className="material-symbols-outlined text-3xl">{transactionType === 'Credit' ? 'add_card' : 'remove_circle'}</span>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">{transactionType === 'Credit' ? 'Add Funds' : 'Record Debit'}</h3>
                        <p className="text-sm text-slate-500 mb-6">{transactionType === 'Credit' ? 'Top up wallet for' : 'Deduct amount from'} {selectedAccount?.companyName}</p>

                        <form onSubmit={handleRecordPayment} className="text-left space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Amount (₹)</label>
                                <input autoFocus required type="number" className={`bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl w-full text-lg font-black focus:ring-2 outline-none ${transactionType === 'Credit' ? 'focus:ring-green-500' : 'focus:ring-red-500'}`} value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Reference</label>
                                <input required className={`bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl w-full text-sm font-bold focus:ring-2 outline-none ${transactionType === 'Credit' ? 'focus:ring-green-500' : 'focus:ring-red-500'}`} value={paymentForm.reference} onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })} placeholder="e.g. UTR-12345678" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Description</label>
                                <input className={`bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl w-full text-sm font-bold focus:ring-2 outline-none ${transactionType === 'Credit' ? 'focus:ring-green-500' : 'focus:ring-red-500'}`} value={paymentForm.description} onChange={e => setPaymentForm({ ...paymentForm, description: e.target.value })} placeholder="Optional note" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">Cancel</button>
                                <button type="submit" className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg ${transactionType === 'Credit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>Confirm</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};
