import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Customer, Booking, Lead, CustomerNote } from '../../types';
import { toast } from 'sonner';
import { Pagination, usePagination } from '../../components/ui/Pagination';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { exportToExcel, ExportColumn } from '../../src/lib/exportUtils';
import { DataImportModal, ColumnMapping } from '../../src/components/admin/DataImportModal';
import { ActionMenu } from '../../components/ui/ActionMenu';
import { useNavigate } from 'react-router-dom';

// --- Sort & Filter Types ---
type SortField = 'name' | 'totalSpent' | 'bookingsCount' | 'joinedDate' | 'lastActive';
type SortOrder = 'asc' | 'desc';

export const Customers: React.FC = () => {
    const { customers, bookings, leads, addCustomer, updateCustomer, deleteCustomer, importCustomers, getActiveMembershipForCustomer, membershipPlans } = useData();
    const { hasPermission } = useAuth();

    // Compute live booking stats (count and spent) from actual bookings
    // MATCH RULES (strict priority — avoids double-counting):
    //   1. customerId  — direct DB foreign key, most reliable
    //   2. email       — fallback, only when both sides are non-empty
    //   3. phone       — fallback, only when both sides are non-empty and non-blank
    const liveBookingStats = useMemo(() => {
        const stats: Record<string, { count: number; spent: number }> = {};
        bookings.forEach(b => {
            // Skip cancelled — they should not count as trips or spend
            if (b.status === 'Cancelled') return;

            let matchedCustomer: typeof customers[0] | undefined;

            // Priority 1: Direct DB customer ID link
            if (b.customerId) {
                matchedCustomer = customers.find(c => c.id === b.customerId);
            }

            // Priority 2: Email match — only when both sides are non-empty
            if (!matchedCustomer && b.email && b.email.trim() !== '') {
                matchedCustomer = customers.find(
                    c => c.email && c.email.trim() !== '' &&
                    b.email!.toLowerCase() === c.email.toLowerCase()
                );
            }

            // Priority 3: Phone match — only when both sides are non-empty
            if (!matchedCustomer && b.phone && b.phone.trim() !== '') {
                matchedCustomer = customers.find(
                    c => c.phone && c.phone.trim() !== '' &&
                    b.phone.trim() === c.phone.trim()
                );
            }

            if (matchedCustomer) {
                if (!stats[matchedCustomer.id]) {
                    stats[matchedCustomer.id] = { count: 0, spent: 0 };
                }
                stats[matchedCustomer.id].count += 1;
                stats[matchedCustomer.id].spent += (Number(b.amount) || 0);
            }
        });
        return stats;
    }, [bookings, customers]);


    const [search, setSearch] = useState('');
    const [sortField, setSortField] = useState<SortField>('lastActive');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [activeTab, setActiveTab] = useState<'All' | 'VIP' | 'New'>('All');

    // UI State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null); // For Details Drawer
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null); // For Edit Modal

    // Data Processing
    const processedCustomers = useMemo(() => {
        let result = customers.filter(c =>
            (c.name.toLowerCase().includes(search.toLowerCase()) ||
                c.email.toLowerCase().includes(search.toLowerCase()) ||
                c.phone.includes(search)) &&
            (activeTab === 'All' || c.type === (activeTab === 'New' ? 'New' : 'VIP'))
        );

        return result.sort((a, b) => {
            const valA = a[sortField];
            const valB = b[sortField];

            if (valA === undefined || valB === undefined) return 0;

            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortOrder === 'asc' ? valA - valB : valB - valA;
            }
            return 0;
        });
    }, [customers, search, activeTab, sortField, sortOrder]);

    // Pagination
    const { currentPage, setCurrentPage, itemsPerPage, setItemsPerPage, paginateData } = usePagination(processedCustomers.length, 10);
    const paginatedCustomers = paginateData<Customer>(processedCustomers);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    // Export Excel
    const handleExport = () => {
        const columns: ExportColumn<Customer>[] = [
            { header: 'ID', key: 'id', width: 25 },
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Email', key: 'email', width: 35 },
            { header: 'Phone', key: 'phone', width: 20 },
            { header: 'Location', key: 'location', width: 20 },
            { header: 'Type', key: 'type', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Total Spent (INR)', key: 'totalSpent', width: 20 },
            { header: 'Bookings', key: 'bookingsCount', width: 15 },
            { header: 'Joined Date', key: 'joinedDate', width: 15 },
            { header: 'Tags', key: c => c.tags?.join('; ') || '', width: 30 }
        ];

        exportToExcel(processedCustomers, columns, {
            filename: `Customers_Export_${new Date().toISOString().split('T')[0]}`,
            sheetName: 'Customers',
            title: 'SHRAWELLO Travel Hub - Customers Report',
            subtitle: `Generated on: ${new Date().toLocaleDateString('en-IN')}`
        });
        toast.success('Customers exported successfully!');
    };

    return (
        <div className="admin-page-bg min-h-screen">
            <div className="p-6 md:p-8 pb-32 max-w-[1600px] mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight"><span className="font-display text-4xl">Customers</span></h1>
                        <p className="text-slate-500 font-medium mt-1">Manage relationships and track preferences.</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsImportModalOpen(true)} className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
                            <span className="material-symbols-outlined text-[20px]">upload_file</span>
                            Import
                        </button>
                        <button onClick={handleExport} className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
                            <span className="material-symbols-outlined text-[20px]">download</span>
                            Export
                        </button>
                        <button onClick={() => { setEditingCustomer(null); setIsAddModalOpen(true); }} className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all flex items-center gap-2 group active:scale-95 btn-glow">
                            <span className="material-symbols-outlined group-hover:rotate-90 transition-transform">add</span>
                            Add Customer
                        </button>
                    </div>
                </div>

                {/* Main Content Card */}
                <div className="bg-white dark:bg-[#151d29] rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col min-h-[600px]">

                    {/* Tabs & Search Header */}
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/10">
                        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full md:w-auto">
                            {(['All', 'VIP', 'New'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                    {tab === 'All' ? 'All Customers' : tab === 'VIP' ? 'VIP Members' : 'New Customers'}
                                </button>
                            ))}
                        </div>

                        <div className="relative w-full md:max-w-sm group mr-4">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
                            <input
                                type="text"
                                placeholder="Search by name, email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-slate-800/20 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-extrabold border-b border-slate-100 dark:border-slate-800">
                                    <th className="p-4 w-12 text-center"><input type="checkbox" className="rounded text-primary focus:ring-primary" /></th>
                                    <th onClick={() => handleSort('name')} className="p-4 cursor-pointer hover:text-primary transition-colors select-none">Customer Name</th>
                                    <th className="p-4">Email / Contact</th>
                                    <th onClick={() => handleSort('bookingsCount')} className="p-4 cursor-pointer hover:text-primary transition-colors select-none">Total Bookings</th>
                                    <th onClick={() => handleSort('totalSpent')} className="p-4 cursor-pointer hover:text-primary transition-colors select-none">Total Spent</th>
                                    <th onClick={() => handleSort('lastActive')} className="p-4 cursor-pointer hover:text-primary transition-colors select-none">Last Active</th>
                                    <th className="p-4 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {paginatedCustomers.map(customer => (
                                    <tr key={customer.id} onClick={() => setSelectedCustomer(customer)} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all cursor-pointer">
                                        <td className="p-4 w-12 text-center" onClick={e => e.stopPropagation()}>
                                            <input type="checkbox" className="rounded text-primary focus:ring-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`size-10 rounded-full flex items-center justify-center font-black text-sm text-white shadow-sm ${customer.type === 'VIP' ? 'bg-gradient-to-br from-amber-400 to-orange-600' :
                                                    customer.type === 'Returning' ? 'bg-gradient-to-br from-blue-400 to-indigo-600' :
                                                        'bg-gradient-to-br from-slate-400 to-slate-600'
                                                    }`}>
                                                    {customer.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-primary transition-colors">{customer.prefix ? `${customer.prefix} ` : ''}{customer.name}</p>
                                                    {(() => {
                                                        const stats = liveBookingStats[customer.id];
                                                        const isReturning = stats && stats.count > 1;
                                                        const totalSpent = stats?.spent ?? 0;
                                                        const isVIP = customer.type === 'VIP' || totalSpent >= 500000;
                                                        const activeMembership = getActiveMembershipForCustomer(customer.id);
                                                        const planDef = activeMembership ? membershipPlans.find(p => p.id === activeMembership.planId) : null;
                                                        return (
                                                            <div className="flex gap-1 mt-1 flex-wrap">
                                                                {isVIP && <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">VIP Member</span>}
                                                                {activeMembership && (
                                                                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded flex items-center gap-1"
                                                                          style={{ backgroundColor: `${planDef?.color || '#CD7F32'}20`, color: planDef?.color || '#CD7F32' }}>
                                                                        <span className="material-symbols-outlined text-[10px]">workspace_premium</span>
                                                                        {activeMembership.tier}
                                                                    </span>
                                                                )}
                                                                {!isVIP && isReturning && <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-800">Repeat Client</span>}
                                                                {!isVIP && !isReturning && customer.type === 'New' && <span className="text-[10px] uppercase font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded">New</span>}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-900 dark:text-white hover:underline">{customer.email}</span>
                                                <span className="text-xs opacity-70">{customer.phone}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm font-bold text-slate-600 dark:text-slate-400">
                                            <span className="flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-[16px] text-slate-300">flight</span>
                                                {liveBookingStats[customer.id]?.count ?? 0} trips
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm font-bold text-slate-900 dark:text-white">
                                            ₹{(liveBookingStats[customer.id]?.spent ?? 0).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-sm text-slate-500">
                                            {customer.lastActive ? new Date(customer.lastActive).toLocaleDateString() : new Date(customer.joinedDate).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <ActionMenu>
                                                <button
                                                    onClick={() => setSelectedCustomer(customer)}
                                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[18px] text-slate-400">visibility</span> View Details
                                                </button>
                                                <button
                                                    onClick={() => { setEditingCustomer(customer); setIsAddModalOpen(true); }}
                                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[18px] text-slate-400">edit</span> Edit Profile
                                                </button>
                                                {hasPermission('customers', 'manage') && (
                                                    <button
                                                        onClick={() => {
                                                            if (confirm(`Are you sure you want to permanently delete ${customer.name}? This cannot be undone.`)) {
                                                                const toastId = toast.loading('Deleting customer...');
                                                                deleteCustomer(customer.id)
                                                                    .then(() => {
                                                                        toast.dismiss(toastId);
                                                                        toast.success(`${customer.name} deleted.`);
                                                                        if (selectedCustomer?.id === customer.id) setSelectedCustomer(null);
                                                                    })
                                                                    .catch((err) => {
                                                                        toast.dismiss(toastId);
                                                                        toast.error(`Delete failed: ${err?.message || 'Unknown error'}`);
                                                                    });
                                                            }
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors border-t border-slate-100 dark:border-slate-800"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">delete</span> Delete
                                                    </button>
                                                )}
                                            </ActionMenu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800">
                        <Pagination
                            currentPage={currentPage}
                            totalItems={processedCustomers.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={setItemsPerPage}
                            itemsPerPageOptions={[10, 20, 50]}
                        />
                    </div>
                </div>

                {/* Slide-over Details Drawer */}
                <CustomerDetailsDrawer
                    isOpen={!!selectedCustomer}
                    onClose={() => setSelectedCustomer(null)}
                    customer={selectedCustomer}
                    bookings={bookings}
                    leads={leads}
                    updateCustomer={updateCustomer}
                    onEdit={() => { setEditingCustomer(selectedCustomer); setIsAddModalOpen(true); }}
                />

                {/* Add/Edit Modal */}
                <AddEditCustomerModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    customer={editingCustomer}
                    onSubmit={(data) => {
                        if (editingCustomer) {
                            updateCustomer(editingCustomer.id, data);
                            toast.success('Customer updated');
                            if (selectedCustomer?.id === editingCustomer.id) {
                                setSelectedCustomer(prev => prev ? { ...prev, ...data } : null);
                            }
                        } else {
                            addCustomer({
                                id: `CUST-${Date.now()}`,
                                ...data,
                                totalSpent: 0,
                                bookingsCount: 0,
                                joinedDate: new Date().toISOString().split('T')[0],
                                status: 'Active',
                                preferences: { dietary: [], flight: [], accommodation: [] },
                                notes: []
                            });
                            toast.success('Customer added');
                        }
                        setIsAddModalOpen(false);
                    }}
                />

                {/* Import Modal */}
                <DataImportModal<Partial<Customer>>
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    entityName="Customers"
                    columns={[
                        { header: 'Name', key: 'name', required: true },
                        { header: 'Email', key: 'email', required: true },
                        { header: 'Phone', key: 'phone', required: true },
                        { header: 'Location', key: 'location', required: false }
                    ]}
                    onImport={(data) => {
                        const fullCustomers: Customer[] = data.map((d, index) => ({
                            id: `IMP-CUST-${Date.now()}-${index}`,
                            name: d.name || 'Unknown',
                            email: d.email || '',
                            phone: d.phone || '',
                            location: d.location || '',
                            type: 'New',
                            status: 'Active',
                            bookingsCount: 0,
                            totalSpent: 0,
                            joinedDate: new Date().toISOString().split('T')[0],
                            tags: [],
                            preferences: { dietary: [], flight: [], accommodation: [] },
                            notes: []
                        }));
                        importCustomers(fullCustomers);
                        setIsImportModalOpen(false);
                        toast.success(`${data.length} customers imported!`);
                    }}
                />
            </div>
        </div>
    );
};

// --- Drawer Component ---
const CustomerDetailsDrawer: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    customer: Customer | null;
    bookings: Booking[];
    leads: Lead[];
    updateCustomer: (id: string, data: Partial<Customer>) => void;
    onEdit: () => void;
}> = ({ isOpen, onClose, customer, bookings, leads, updateCustomer, onEdit }) => {
    const { getActiveMembershipForCustomer, membershipPlans } = useData();
    const [note, setNote] = useState('');
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [editNoteText, setEditNoteText] = useState('');
    const navigate = useNavigate();

    const handleNewInquiry = () => {
        navigate('/admin/leads', {
            state: {
                fromCustomer: {
                    id: customer!.id,
                    name: customer!.name,
                    email: customer!.email,
                    phone: customer!.phone,
                    location: customer!.location
                }
            }
        });
        onClose();
    };

    const history = useMemo(() => {
        if (!customer) return [];
        const relatedBookings = bookings.filter(b => {
            if (b.status === 'Cancelled') return false;
            if (b.customerId && b.customerId === customer.id) return true;
            if (b.email && b.email.trim() !== '' && customer.email && customer.email.trim() !== '' &&
                b.email.toLowerCase() === customer.email.toLowerCase()) return true;
            if (b.phone && b.phone.trim() !== '' && customer.phone && customer.phone.trim() !== '' && 
                b.phone.trim() === customer.phone.trim()) return true;
            return false;
        });
        const relatedLeads = leads.filter(l =>
            (l.email && customer.email && l.email.toLowerCase() === customer.email.toLowerCase()) ||
            (l.phone && customer.phone && l.phone.trim() !== '' && customer.phone.trim() !== '' && l.phone.trim() === customer.phone.trim())
        );
        return [
            ...relatedBookings.map(b => ({ type: 'Booking', date: b.date, title: b.title, details: `₹${b.amount} • ${b.status}`, id: b.id })),
            ...relatedLeads.map(l => ({ type: 'Lead', date: l.addedOn, title: l.destination, details: l.status, id: l.id }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [customer, bookings, leads]);


    if (!customer) return null;

    const handleAddNote = (e: React.FormEvent) => {
        e.preventDefault();
        if (!note.trim()) return;
        const newNote: CustomerNote = {
            id: `NOTE-${Date.now()}`,
            text: note,
            author: 'You',
            date: new Date().toISOString()
        };
        const existingNotes = customer.notes || [];
        updateCustomer(customer.id, { notes: [newNote, ...existingNotes] });
        setNote('');
        toast.success('Note added');
    };

    const handleDeleteNote = (noteId: string) => {
        if (!customer) return;
        if (!confirm('Delete this note?')) return;
        const updatedNotes = (customer.notes || []).filter(n => n.id !== noteId);
        updateCustomer(customer.id, { notes: updatedNotes });
        toast.success('Note deleted');
    };

    const handleUpdateNote = (noteId: string) => {
        if (!customer || !editNoteText.trim()) return;
        const updatedNotes = (customer.notes || []).map(n =>
            n.id === noteId ? { ...n, text: editNoteText } : n
        );
        updateCustomer(customer.id, { notes: updatedNotes });
        setEditingNoteId(null);
        setEditNoteText('');
        toast.success('Note updated');
    };

    return (
        <>
            {isOpen && <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[150] transition-opacity" onClick={onClose} />}
            <div className={`fixed inset-y-0 right-0 w-full max-w-2xl bg-white dark:bg-[#0B1116] shadow-2xl z-[160] transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#0B1116] z-10">
                    <div className="flex items-center gap-4">
                        <div className={`size-12 rounded-full flex items-center justify-center font-black text-lg text-white shadow-md ${customer.type === 'VIP' ? 'bg-gradient-to-br from-amber-400 to-orange-600' : 'bg-gradient-to-br from-slate-400 to-slate-600'}`}>
                            {customer.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                {customer.prefix ? `${customer.prefix} ` : ''}{customer.name}
                                {customer.type === 'VIP' && <span className="text-[10px] uppercase bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">VIP CLIENT</span>}
                            </h2>
                            <p className="text-sm text-slate-500">Frequent Flyer | ID: #{customer.id.split('-')[1]}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50 dark:bg-black/20">
                    <div className="flex gap-4">
                        <div className="flex-1 bg-white dark:bg-slate-800 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 shadow-sm">
                            <div className="text-xs font-bold text-amber-500 uppercase flex items-center gap-1 mb-1">Gold Member</div>
                            <div className="text-xl font-black text-slate-900 dark:text-white">Tier 2</div>
                        </div>
                        <div className="flex-1 bg-white dark:bg-slate-800 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 shadow-sm">
                            <div className="text-xs font-bold text-blue-500 uppercase flex items-center gap-1 mb-1">Local Time</div>
                            <div className="text-xl font-black text-slate-900 dark:text-white">UTC +05:30</div>
                        </div>
                        <div className="flex-1 bg-white dark:bg-slate-800 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                            <div className="text-xs font-bold text-emerald-500 uppercase flex items-center gap-1 mb-1">Total Spent</div>
                            <div className="text-xl font-black text-slate-900 dark:text-white">₹{((bookings.filter(b => {
                                if (b.status === 'Cancelled') return false;
                                if (b.customerId && b.customerId === customer.id) return true;
                                if (b.email && b.email.trim() !== '' && customer.email && customer.email.trim() !== '' &&
                                    b.email.toLowerCase() === customer.email.toLowerCase()) return true;
                                if (b.phone && b.phone.trim() !== '' && customer.phone && customer.phone.trim() !== '' && 
                                    b.phone.trim() === customer.phone.trim()) return true;
                                return false;
                            }).reduce((sum, b) => sum + (Number(b.amount) || 0), 0)) / 1000).toFixed(1)}k</div>
                        </div>
                    </div>

                    {/* Contact & Profile Details Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4">Contact & Profile Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Prefix & Name</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.prefix ? `${customer.prefix} ` : ''}{customer.name}</span>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Date of Birth</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {customer.dob ? new Date(customer.dob).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : <span className="text-slate-400 dark:text-slate-500 italic">Not set</span>}
                                </span>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Main Phone</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.phone}</span>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Alternate Phone</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.altPhone || <span className="text-slate-400 dark:text-slate-500 italic">Not set</span>}</span>
                            </div>
                            <div className="md:col-span-2">
                                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">WhatsApp Number</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                    {customer.whatsapp || <span className="text-slate-400 dark:text-slate-500 italic">Not set</span>}
                                    {customer.isWhatsappSame && (
                                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">Same as Main</span>
                                    )}
                                </span>
                            </div>
                            <div className="md:col-span-2">
                                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Residential Address</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 block bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 min-h-[50px] whitespace-pre-wrap">
                                    {customer.address || <span className="text-slate-400 dark:text-slate-500 italic">No residential address stored.</span>}
                                </span>
                            </div>
                            <div className="md:col-span-2">
                                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Office Address</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 block bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 min-h-[50px] whitespace-pre-wrap">
                                    {customer.officeAddress || <span className="text-slate-400 dark:text-slate-500 italic">No office address stored.</span>}
                                </span>
                            </div>
                            <div className="md:col-span-2">
                                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Billing Address</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 block bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 min-h-[50px] whitespace-pre-wrap">
                                    {customer.billingAddress || <span className="text-slate-400 dark:text-slate-500 italic">No billing address stored.</span>}
                                </span>
                            </div>
                            <div className="md:col-span-2">
                                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">GSTIN Number</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 block bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 min-h-[40px] whitespace-pre-wrap">
                                    {customer.gstin || <span className="text-slate-400 dark:text-slate-500 italic">No GSTIN stored.</span>}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4">Travel Preferences</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs font-bold text-slate-400 mb-2">DIETARY REQUIREMENTS</p>
                                <div className="flex gap-2 flex-wrap">
                                    {(customer.preferences?.dietary || ['None']).map(tag => (
                                        <span key={tag} className="px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs font-bold rounded-lg border border-green-100 dark:border-green-800">{tag}</span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 mb-2">FLIGHT & SEATING</p>
                                <div className="flex gap-2 flex-wrap">
                                    {(customer.preferences?.flight || ['Standard']).map(tag => (
                                        <span key={tag} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-lg border border-blue-100 dark:border-blue-800">{tag}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                                                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4">Purchases & Bookings</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-extrabold border-b border-slate-100 dark:border-slate-800">
                                        <th className="p-3">Booking ID</th>
                                        <th className="p-3">Trip / Package</th>
                                        <th className="p-3">Date</th>
                                        <th className="p-3">Amount</th>
                                        <th className="p-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                    {(() => {
                                        const customerBookings = bookings.filter(b => {
                                            if (b.status === 'Cancelled') return false;
                                            if (b.customerId && b.customerId === customer.id) return true;
                                            if (b.email && b.email.trim() !== '' && customer.email && customer.email.trim() !== '' &&
                                                b.email.toLowerCase() === customer.email.toLowerCase()) return true;
                                            if (b.phone && b.phone.trim() !== '' && customer.phone && customer.phone.trim() !== '' && 
                                                b.phone.trim() === customer.phone.trim()) return true;
                                            return false;
                                        })
                                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                                            
                                        if (customerBookings.length === 0) {
                                            return <tr><td colSpan={5} className="p-4 text-center text-sm text-slate-400 italic">No purchases found.</td></tr>;
                                        }
                                        
                                        return customerBookings.map(b => (
                                            <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="p-3 text-sm font-bold text-slate-900 dark:text-white">{b.bookingNumber ? `BK-${b.bookingNumber.toString().padStart(4, '0')}` : b.invoiceNo || 'N/A'}</td>
                                                <td className="p-3 text-sm text-slate-600 dark:text-slate-300 font-medium">{b.title || 'Custom Trip'}</td>
                                                <td className="p-3 text-sm text-slate-500">{new Date(b.date).toLocaleDateString()}</td>
                                                <td className="p-3 text-sm font-bold text-slate-900 dark:text-white">₹{b.amount.toLocaleString()}</td>
                                                <td className="p-3">
                                                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${
                                                        b.status === 'Confirmed' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 
                                                        b.status === 'Pending' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' : 
                                                        'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                                                    }`}>
                                                        {b.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ));
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Active Membership Card */}
                    {(() => {
                        const m = getActiveMembershipForCustomer(customer.id);
                        if (!m) return null;
                        const plan = membershipPlans.find(p => p.id === m.planId);
                        const daysLeft = Math.ceil((new Date(m.expiresOn).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                        return (
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex justify-between items-center">
                                    Active Membership
                                    <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full">{daysLeft} days left</span>
                                </h3>
                                <div className="p-4 rounded-xl border flex justify-between items-center" style={{ borderColor: plan?.color || '#CD7F32', backgroundColor: `${plan?.color || '#CD7F32'}08` }}>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="material-symbols-outlined text-lg" style={{ color: plan?.color || '#CD7F32' }}>workspace_premium</span>
                                            <span className="font-bold text-lg" style={{ color: plan?.color || '#CD7F32' }}>{m.tier} Tier</span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">{m.planName}</p>
                                        <p className="text-xs text-slate-500 mt-1">Expires {new Date(m.expiresOn).toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                            {m.discountType === 'Flat_Amount' ? `₹${m.discountFlat?.toLocaleString()} Flat Off` : `${m.discountPercent}% Flat Off`}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            +{m.hotelDiscount}% Hotel · +{m.flightDiscount}% Flight · +{m.tourDiscount}% Tour · +{m.cabDiscount}% Cab
                                        </p>
                                        <button onClick={() => window.location.href = '/admin/memberships'} className="text-xs text-primary font-medium hover:underline mt-2 block">Manage →</button>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

<div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4">Activity Timeline</h3>
                        <div className="space-y-6 pl-4 border-l border-slate-100 dark:border-slate-700">
                            {(() => {
                                const customerBookings = bookings.filter(b => {
                                    if (b.customerId && b.customerId === customer.id) return true;
                                    if (b.email && b.email.trim() !== '' && customer.email && customer.email.trim() !== '' &&
                                        b.email.toLowerCase() === customer.email.toLowerCase()) return true;
                                    if (b.phone && b.phone.trim() !== '' && customer.phone && customer.phone.trim() !== '' && 
                                        b.phone.trim() === customer.phone.trim()) return true;
                                    return false;
                                });
                                // @ts-ignore
                                const customerLeads = leads.filter(l => (l.customerId && l.customerId === customer.id) || (l.email && customer.email && l.email.toLowerCase() === customer.email.toLowerCase()));
                                
                                const timelineItems = [
                                    ...customerBookings.map(b => ({ type: 'Booking', date: b.date, title: b.title || 'Trip booked', amount: b.amount, status: b.status, id: b.id })),
                                    ...customerLeads.map(l => ({ type: 'Enquiry', date: l.addedOn, title: `Enquiry for ${l.destination}`, status: l.status, id: l.id }))
                                ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                if (timelineItems.length === 0) {
                                    return <p className="text-sm text-slate-400 italic">No activity yet.</p>;
                                }

                                return timelineItems.map((item, idx) => (
                                    <div key={item.id + idx} className="relative group">
                                        <div className={`absolute -left-[21px] top-1 size-2.5 rounded-full border-2 border-white dark:border-slate-800 ${item.type === 'Booking' ? 'bg-primary' : 'bg-amber-400'}`}></div>
                                        <div className="flex justify-between items-start mb-1 flex-wrap gap-1">
                                            <div>
                                                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                    {item.type === 'Booking' ? <span className="material-symbols-outlined text-[14px] text-primary">flight_takeoff</span> : <span className="material-symbols-outlined text-[14px] text-amber-500">contact_support</span>}
                                                    {item.type}
                                                </span>
                                                <span className="text-[10px] text-slate-400 ml-2">{new Date(item.date).toLocaleDateString()}</span>
                                            </div>
                                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${item.type === 'Booking' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'}`}>
                                                {item.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{item.title} {item.amount ? `• ₹${item.amount.toLocaleString()}` : ''}</p>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>

<div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4">Internal Notes</h3>
                        <form onSubmit={handleAddNote} className="mb-6">
                            <textarea
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder="Type a new internal note..."
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none resize-none h-24 mb-2"
                            />
                            <button type="submit" disabled={!note.trim()} className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 float-right">Add Note</button>
                            <div className="clear-both"></div>
                        </form>
                        <div className="space-y-6 pl-4 border-l border-slate-100 dark:border-slate-700">
                            {(customer.notes || []).length === 0 && (
                                <p className="text-sm text-slate-400 italic">No notes yet.</p>
                            )}
                            {(customer.notes || []).map(n => (
                                <div key={n.id} className="relative group">
                                    <div className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-slate-300 dark:bg-slate-600 border-2 border-white dark:border-slate-800 group-hover:bg-primary transition-colors"></div>
                                    <div className="flex justify-between items-start mb-1 flex-wrap gap-1">
                                        <div>
                                            <span className="text-xs font-bold text-slate-900 dark:text-white">{n.author}</span>
                                            <span className="text-[10px] text-slate-400 ml-2">{new Date(n.date).toLocaleDateString()}</span>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5">
                                            <button onClick={() => { setEditingNoteId(n.id); setEditNoteText(n.text); }} className="text-[10px] bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-bold transition-colors">Edit</button>
                                            <button onClick={() => handleDeleteNote(n.id)} className="text-[10px] bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-800/40 text-red-600 dark:text-red-400 px-2 py-0.5 rounded font-bold transition-colors">Delete</button>
                                        </div>
                                    </div>
                                    {editingNoteId === n.id ? (
                                        <div className="mt-2">
                                            <textarea
                                                value={editNoteText}
                                                onChange={e => setEditNoteText(e.target.value)}
                                                className="w-full p-2 bg-white dark:bg-slate-800 border border-primary/40 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none resize-none h-20 mb-2"
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => { setEditingNoteId(null); setEditNoteText(''); }} className="text-xs px-3 py-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
                                                <button onClick={() => handleUpdateNote(n.id)} disabled={!editNoteText.trim()} className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50">Save</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{n.text}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-white dark:bg-[#0B1116] border-t border-slate-100 dark:border-slate-800 sticky bottom-0 space-y-2">
                    <button
                        onClick={handleNewInquiry}
                        className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 btn-glow"
                    >
                        <span className="material-symbols-outlined text-[18px]">add_circle</span>
                        New Inquiry for this Customer
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={onEdit} className="py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Edit Profile</button>
                        <button onClick={() => window.location.href = `/admin/invoices/new?customer_id=${customer.id}&type=Invoice`} className="py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-lg">Create Invoice</button>
                    </div>
                </div>
            </div>
        </>
    );
};

// --- Add/Edit Modal ---
const customerSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Invalid email'),
    phone: z.string().min(10, 'Invalid phone number'),
    location: z.string().optional(),
    type: z.enum(['New', 'Returning', 'VIP']),
    tags: z.string().optional(),
    prefix: z.string().optional(),
    dob: z.string().optional(),
    altPhone: z.string().optional(),
    whatsapp: z.string().optional(),
    isWhatsappSame: z.boolean().optional(),
    address: z.string().optional(),
    officeAddress: z.string().optional(),
    billingAddress: z.string().optional(),
    gstin: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

const AddEditCustomerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    customer: Customer | null;
    onSubmit: (data: any) => void;
}> = ({ isOpen, onClose, customer, onSubmit }) => {
    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<CustomerFormData>({
        resolver: zodResolver(customerSchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            location: '',
            type: 'New',
            tags: '',
            prefix: '',
            dob: '',
            altPhone: '',
            whatsapp: '',
            isWhatsappSame: false,
            address: '',
            officeAddress: '',
            billingAddress: '',
            gstin: ''
        }
    });

    const isWhatsappSame = watch('isWhatsappSame');
    const phone = watch('phone');

    // Dynamically copy main phone to whatsapp when "Same as Main Phone" is checked
    useEffect(() => {
        if (isWhatsappSame) {
            setValue('whatsapp', phone || '');
        }
    }, [isWhatsappSame, phone, setValue]);

    useEffect(() => {
        if (customer) {
            reset({
                name: customer.name || '',
                email: customer.email || '',
                phone: customer.phone || '',
                location: customer.location || '',
                type: customer.type || 'New',
                tags: customer.tags?.join(', ') || '',
                prefix: customer.prefix || '',
                dob: customer.dob || '',
                altPhone: customer.altPhone || '',
                whatsapp: customer.whatsapp || '',
                isWhatsappSame: !!customer.isWhatsappSame,
                address: customer.address || '',
                officeAddress: customer.officeAddress || '',
                billingAddress: customer.billingAddress || '',
                gstin: customer.gstin || ''
            });
        } else {
            reset({
                name: '',
                email: '',
                phone: '',
                location: '',
                type: 'New',
                tags: '',
                prefix: '',
                dob: '',
                altPhone: '',
                whatsapp: '',
                isWhatsappSame: false,
                address: '',
                officeAddress: '',
                billingAddress: '',
                gstin: ''
            });
        }
    }, [customer, reset, isOpen]);

    const handleFormSubmit = (data: CustomerFormData) => {
        const tagsArray = data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
        onSubmit({ ...data, tags: tagsArray });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white dark:bg-[#1A2633] w-full max-w-2xl rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 ring-1 ring-white/10 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{customer ? 'Edit Profile' : 'New Customer'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><span className="material-symbols-outlined text-slate-400">close</span></button>
                </div>
                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                    {/* Prefix and Name */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-1">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1 mb-1 block">Prefix</label>
                            <select {...register('prefix')} className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border-none p-3 font-bold outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white">
                                <option value="">None</option>
                                <option value="Mr.">Mr.</option>
                                <option value="Ms.">Ms.</option>
                                <option value="Mrs.">Mrs.</option>
                                <option value="Dr.">Dr.</option>
                                <option value="Prof.">Prof.</option>
                            </select>
                        </div>
                        <div className="col-span-3">
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1 mb-1 block">Full Name</label>
                            <input {...register('name')} className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border-none p-3 font-bold outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white" />
                            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                        </div>
                    </div>

                    {/* Email and DOB */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1 mb-1 block">Email</label>
                            <input {...register('email')} className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border-none p-3 font-bold outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white" />
                            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1 mb-1 block">Date of Birth</label>
                            <input type="date" {...register('dob')} className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border-none p-3 font-bold outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white" />
                        </div>
                    </div>

                    {/* Main Phone and Alt Phone */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1 mb-1 block">Phone</label>
                            <input {...register('phone')} className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border-none p-3 font-bold outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white" />
                            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1 mb-1 block">Alternate Phone</label>
                            <input {...register('altPhone')} className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border-none p-3 font-bold outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white" placeholder="Alt phone number" />
                        </div>
                    </div>

                    {/* WhatsApp */}
                    <div>
                        <div className="flex justify-between items-center ml-1 mb-1">
                            <label className="text-xs font-bold uppercase text-slate-500 block">WhatsApp Number</label>
                            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-primary hover:text-primary-dark select-none">
                                <input type="checkbox" {...register('isWhatsappSame')} className="rounded text-primary focus:ring-primary border-slate-300 size-3.5" />
                                Same as Main Phone
                            </label>
                        </div>
                        <input 
                            {...register('whatsapp')} 
                            readOnly={isWhatsappSame}
                            className={`w-full rounded-xl border-none p-3 font-bold outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white ${isWhatsappSame ? 'bg-slate-100 dark:bg-slate-700/50 cursor-not-allowed opacity-80' : 'bg-slate-50 dark:bg-slate-800'}`}
                            placeholder="WhatsApp number"
                        />
                    </div>

                    {/* Location and Type */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1 mb-1 block">Location</label>
                            <input {...register('location')} className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border-none p-3 font-bold outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1 mb-1 block">Type</label>
                            <select {...register('type')} className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border-none p-3 font-bold outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white">
                                <option value="New">New</option>
                                <option value="Returning">Returning</option>
                                <option value="VIP">VIP</option>
                            </select>
                        </div>
                    </div>

                    {/* Residential Address and Office Address */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1 mb-1 block">Residential Address</label>
                            <textarea {...register('address')} className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border-none p-3 font-bold outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white resize-none h-20" placeholder="Residential Address" />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1 mb-1 block">Office Address</label>
                            <textarea {...register('officeAddress')} className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border-none p-3 font-bold outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white resize-none h-20" placeholder="Office Address" />
                        </div>
                    </div>

                    {/* Billing Address and GSTIN */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1 mb-1 block">Billing Address</label>
                            <textarea {...register('billingAddress')} className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border-none p-3 font-bold outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white resize-none h-20" placeholder="Billing Address" />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1 mb-1 block">GSTIN Number</label>
                            <input {...register('gstin')} className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border-none p-3 font-bold outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white" placeholder="GSTIN (e.g. 27AAAAA0000A1Z0)" />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500 ml-1 mb-1 block">Tags (comma separated)</label>
                        <input {...register('tags')} className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border-none p-3 font-bold outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white" placeholder="e.g. High Value, Family..." />
                    </div>

                    <button type="submit" className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all mt-4">Save Profile</button>
                </form>
            </div>
        </div>
    );
};

// --- Import Modal Removed ---
// (Replaced by generic DataImportModal)
