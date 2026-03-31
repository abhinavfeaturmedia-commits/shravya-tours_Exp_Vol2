import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Customer, Booking, Lead, CustomerNote } from '../../types';
import { toast } from 'sonner';
import { Pagination, usePagination } from '../../components/ui/Pagination';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { exportToExcel, ExportColumn } from '../../src/lib/exportUtils';
import { DataImportModal, ColumnMapping } from '../../src/components/admin/DataImportModal';

// --- Sort & Filter Types ---
type SortField = 'name' | 'totalSpent' | 'bookingsCount' | 'joinedDate' | 'lastActive';
type SortOrder = 'asc' | 'desc';

export const Customers: React.FC = () => {
    const { customers, bookings, leads, addCustomer, updateCustomer, importCustomers } = useData();
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
            title: 'Shravya Tours - Customers Report',
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
                                                    <p className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-primary transition-colors">{customer.name}</p>
                                                    {customer.type === 'VIP' && <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">VIP Member</span>}
                                                    {customer.type === 'New' && <span className="text-[10px] uppercase font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded">New</span>}
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
                                                {customer.bookingsCount} trips
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm font-bold text-slate-900 dark:text-white">
                                            ₹{customer.totalSpent.toLocaleString()}
                                        </td>
                                        <td className="p-4 text-sm text-slate-500">
                                            {customer.lastActive ? new Date(customer.lastActive).toLocaleDateString() : new Date(customer.joinedDate).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <button className="p-2 text-slate-300 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                                <span className="material-symbols-outlined">more_horiz</span>
                                            </button>
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
    const [note, setNote] = useState('');

    const history = useMemo(() => {
        if (!customer) return [];
        const relatedBookings = bookings.filter(b => b.email === customer.email || b.phone === customer.phone || b.customer === customer.id || b.customerId === customer.id);
        const relatedLeads = leads.filter(l => l.email === customer.email || l.phone === customer.phone);
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
                                {customer.name}
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
                            <div className="text-xl font-black text-slate-900 dark:text-white">₹{(customer.totalSpent / 1000).toFixed(1)}k</div>
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
                            {(customer.notes || []).map(n => (
                                <div key={n.id} className="relative group">
                                    <div className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-slate-300 dark:bg-slate-600 border-2 border-white dark:border-slate-800 group-hover:bg-primary transition-colors"></div>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold text-slate-900 dark:text-white">{n.author}</span>
                                        <span className="text-[10px] text-slate-400">{new Date(n.date).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{n.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-white dark:bg-[#0B1116] border-t border-slate-100 dark:border-slate-800 flex gap-4 sticky bottom-0">
                    <button className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Log Call</button>
                    <button onClick={onEdit} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20">Edit Profile</button>
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
});

type CustomerFormData = z.infer<typeof customerSchema>;

const AddEditCustomerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    customer: Customer | null;
    onSubmit: (data: any) => void;
}> = ({ isOpen, onClose, customer, onSubmit }) => {
    const { register, handleSubmit, reset, formState: { errors } } = useForm<CustomerFormData>({
        resolver: zodResolver(customerSchema),
        defaultValues: { name: '', email: '', phone: '', location: '', type: 'New', tags: '' }
    });

    useEffect(() => {
        if (customer) {
            reset({ ...customer, tags: customer.tags?.join(', ') || '' });
        } else {
            reset({ name: '', email: '', phone: '', location: '', type: 'New', tags: '' });
        }
    }, [customer, reset, isOpen]);

    const handleFormSubmit = (data: CustomerFormData) => {
        const tagsArray = data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
        onSubmit({ ...data, tags: tagsArray });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white dark:bg-[#1A2633] w-full max-w-lg rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 ring-1 ring-white/10">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{customer ? 'Edit Profile' : 'New Customer'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><span className="material-symbols-outlined text-slate-400">close</span></button>
                </div>
                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1 mb-1 block">Full Name</label>
                            <input {...register('name')} className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border-none p-3 font-bold outline-none focus:ring-2 focus:ring-primary/50" />
                            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1 mb-1 block">Location</label>
                            <input {...register('location')} className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border-none p-3 font-bold outline-none focus:ring-2 focus:ring-primary/50" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500 ml-1 mb-1 block">Email</label>
                        <input {...register('email')} className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border-none p-3 font-bold outline-none focus:ring-2 focus:ring-primary/50" />
                        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1 mb-1 block">Phone</label>
                            <input {...register('phone')} className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border-none p-3 font-bold outline-none focus:ring-2 focus:ring-primary/50" />
                            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 ml-1 mb-1 block">Type</label>
                            <select {...register('type')} className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border-none p-3 font-bold outline-none focus:ring-2 focus:ring-primary/50">
                                <option value="New">New</option>
                                <option value="Returning">Returning</option>
                                <option value="VIP">VIP</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500 ml-1 mb-1 block">Tags (comma separated)</label>
                        <input {...register('tags')} className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border-none p-3 font-bold outline-none focus:ring-2 focus:ring-primary/50" placeholder="e.g. High Value, Family..." />
                    </div>
                    <button type="submit" className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all mt-2">Save Profile</button>
                </form>
            </div>
        </div>
    );
};

// --- Import Modal Removed ---
// (Replaced by generic DataImportModal)
