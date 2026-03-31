
import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useLeads } from '../../src/hooks/useLeads';
import { useAuth } from '../../context/AuthContext';
import { Lead, BookingStatus, FollowUpType, Customer } from '../../types'; // Removed unused imports
import { toast } from 'sonner'; // Use sonner for consistency if available, or keep existing toast
import { useNavigate } from 'react-router-dom';
import {
    Phone, Mail, MapPin, Calendar, Users, Clock, X, Plus, Search,
    ChevronRight, Sparkles, Edit2, Trash2, ArrowRight, MessageCircle,
    FileText, Bell, CheckCircle2, MoreHorizontal, Filter, Save, CalendarDays
} from 'lucide-react';
import { TravelerSelector } from '../../components/ui/TravelerSelector';
import { exportToExcel, ExportColumn } from '../../src/lib/exportUtils';
import { DataImportModal, ColumnMapping } from '../../src/components/admin/DataImportModal';
// import { BulkImportLeadsModal } from '../../components/admin/BulkImportLeadsModal'; // Commented out unused

// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        'New': 'bg-blue-100 text-blue-700',
        'Warm': 'bg-amber-100 text-amber-700',
        'Hot': 'bg-red-100 text-red-700',
        'Offer Sent': 'bg-purple-100 text-purple-700',
        'Converted': 'bg-emerald-100 text-emerald-700',
        'Cold': 'bg-slate-100 text-slate-600'
    };
    return (
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${styles[status] || styles['New']}`}>
            {status}
        </span>
    );
};

export const Leads: React.FC = () => {
    const { addLeadLog, addFollowUp, addBooking, followUps, customers, addCustomer } = useData();
    const { leads, addLead, updateLead, deleteLead, isLoading } = useLeads();
    const { currentUser, staff } = useAuth();
    const navigate = useNavigate();

    // UI State
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'All' | 'New' | 'Warm' | 'Hot' | 'Offer Sent' | 'Converted' | 'Cold'>('All');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Forms
    const [noteContent, setNoteContent] = useState('');
    const [isReminderSet, setIsReminderSet] = useState(false);
    const [reminderDate, setReminderDate] = useState('');
    const [leadForm, setLeadForm] = useState<Partial<Lead>>({
        status: 'New', travelers: '2 Adults', source: 'Manual Entry'
    });
    const [followUpType, setFollowUpType] = useState<FollowUpType>('Call');
    const [followUpPriority, setFollowUpPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');

    const selectedLead = leads.find(l => l.id === selectedLeadId);

    // Stats calculation
    const tasksDueToday = followUps.filter(f => {
        if (f.status !== 'Pending' || !f.scheduledAt) return false;
        const taskDate = new Date(f.scheduledAt);
        const today = new Date();
        taskDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        return taskDate.getTime() <= today.getTime();
    }).length;

    const stats = {
        pending: leads.filter(l => l.status === 'New').length,
        value: leads.reduce((acc, l) => acc + (l.potentialValue || 0), 0),
        tasks: tasksDueToday
    };

    const filteredLeads = leads.filter(l =>
        (l.name.toLowerCase().includes(search.toLowerCase()) ||
            l.destination.toLowerCase().includes(search.toLowerCase())) &&
        (activeTab === 'All' || l.status === activeTab)
    );

    const handleSaveLog = () => {
        if (!selectedLeadId || !noteContent.trim()) return;

        const logId = `lg-${Date.now()}`;
        addLeadLog(selectedLeadId, {
            id: logId,
            type: 'Note',
            content: noteContent,
            timestamp: new Date().toISOString()
        });

        if (isReminderSet && reminderDate) {
            addFollowUp({
                id: `FU-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                leadId: selectedLeadId,
                leadName: selectedLead?.name || 'Unknown',
                scheduledAt: reminderDate,
                type: followUpType, // Use the selected type
                status: 'Pending',
                description: `Reminder: ${noteContent}`,
                reminderEnabled: true,
                createdAt: new Date().toISOString(),
                priority: followUpPriority
            });
            toast.success('Log saved & Follow-up scheduled');
        } else {
            toast.success('Log saved');
        }

        setNoteContent('');
        setIsReminderSet(false);
        setReminderDate('');
        setFollowUpPriority('Medium');
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Date Validation
        if (leadForm.startDate && leadForm.endDate) {
            if (new Date(leadForm.endDate) < new Date(leadForm.startDate)) {
                toast.error('End date cannot be before start date');
                return;
            }
        }

        // 2. Duplicate Detection (Only for new leads)
        if (modalMode === 'add') {
            const isDuplicate = leads.some(l =>
                (leadForm.email && l.email?.toLowerCase() === leadForm.email.toLowerCase()) ||
                (leadForm.phone && l.phone === leadForm.phone)
            );
            if (isDuplicate) {
                if (!confirm('A lead with this email or phone already exists. Do you want to create a duplicate?')) {
                    return;
                }
            }
        }

        const now = new Date().toISOString();
        if (modalMode === 'add') {
            const newLead: Lead = {
                id: `LD-${Date.now()}`, // More robust ID matching other components
                addedOn: now,
                logs: [],
                avatarColor: 'bg-slate-100 text-slate-600',
                name: leadForm.name || '',
                email: leadForm.email || '',
                phone: leadForm.phone || '',
                destination: leadForm.destination || '',
                travelers: leadForm.travelers || '',
                budget: leadForm.budget || '',
                status: leadForm.status || 'New',
                type: leadForm.type || 'Custom Package',
                priority: 'Medium',
                source: leadForm.source || 'Manual Entry',
                potentialValue: Number(leadForm.budget) || 0,
                ...leadForm
            };
            addLead(newLead);
            toast.success('Lead added successfully');
        } else {
            updateLead(leadForm.id!, {
                ...leadForm,
                potentialValue: Number(leadForm.budget) || 0
            });
            toast.success('Lead updated successfully');
        }
        setIsModalOpen(false);
    };

    const handleDeleteLead = () => {
        if (selectedLeadId && confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
            deleteLead(selectedLeadId);
            setSelectedLeadId(null);
            toast.success('Lead deleted');
        }
    };

    const handleConvertToBooking = () => {
        if (!selectedLead) return;

        // Validation: require budget and start date
        if (!selectedLead.potentialValue || selectedLead.potentialValue <= 0) {
            toast.error('Please set a budget before converting this lead to a booking.');
            return;
        }
        if (!selectedLead.startDate) {
            toast.error('Please set a start date before converting this lead.');
            return;
        }
        if (new Date(selectedLead.startDate) < new Date(new Date().toDateString())) {
            toast.error('Start date is in the past. Please update it before converting.');
            return;
        }

        // 1. Deep Logic: Check for existing Customer
        let targetCustomerId: string | undefined;
        const existingCustomer = customers?.find((c: Customer) =>
            (c.email?.toLowerCase() === selectedLead.email?.toLowerCase()) ||
            (c.phone === selectedLead.phone)
        );

        if (existingCustomer) {
            targetCustomerId = existingCustomer.id;
        } else {
            // Create new customer
                const newCustomerId = `CU-${Date.now()}`;
                const newCustomer: Customer = {
                    id: newCustomerId,
                    name: selectedLead.name,
                    email: selectedLead.email,
                    phone: selectedLead.phone || '',
                    type: 'New',
                    status: 'Active',
                    joinedDate: new Date().toISOString(),
                    bookingsCount: 0,
                    totalSpent: 0
                };
                addCustomer?.(newCustomer);
                targetCustomerId = newCustomerId;
            }

            addBooking({
                id: `BK-${Date.now()}`,
                type: 'Tour',
                customer: selectedLead.name,
                customerId: targetCustomerId, // Linked Customer
                email: selectedLead.email,
                phone: selectedLead.phone,
                title: `Trip to ${selectedLead.destination}`,
                date: selectedLead.startDate || new Date().toISOString().split('T')[0],
                amount: selectedLead.potentialValue || 0,
                status: BookingStatus.CONFIRMED,
                payment: 'Unpaid',
                guests: selectedLead.travelers
            });

            updateLead(selectedLead.id, { status: 'Converted' });
            addLeadLog(selectedLead.id, {
                id: `lg-conv-${Date.now()}`,
                type: 'System',
                content: `Lead converted to Booking. Customer profile ${existingCustomer ? 'linked' : 'created'}.`,
                timestamp: new Date().toISOString()
            });
            toast.success('Lead converted to Booking!');
    };

    const openAddModal = () => {
        setModalMode('add');
        setLeadForm({ status: 'New', travelers: '2 Adults', source: 'Manual Entry' });
        setIsModalOpen(true);
    };

    const handleExport = () => {
        const columns: ExportColumn<Lead>[] = [
            { header: 'ID', key: 'id', width: 25 },
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Email', key: 'email', width: 35 },
            { header: 'Phone', key: 'phone', width: 20 },
            { header: 'Destination', key: 'destination', width: 25 },
            { header: 'Travelers', key: 'travelers', width: 15 },
            { header: 'Type', key: 'type', width: 20 },
            { header: 'Budget (INR)', key: 'potentialValue', width: 20 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Source', key: 'source', width: 20 },
            { header: 'Added On', key: l => new Date(l.addedOn).toLocaleDateString(), width: 15 }
        ];

        exportToExcel(filteredLeads, columns, {
            filename: `Leads_Export_${new Date().toISOString().split('T')[0]}`,
            sheetName: 'Leads',
            title: 'Shravya Tours - Leads Report',
            subtitle: `Generated on: ${new Date().toLocaleDateString('en-IN')}`
        });
        toast.success('Leads exported successfully!');
    };

    const openEditModal = () => {
        if (!selectedLead) return;
        setModalMode('edit');
        setLeadForm({ ...selectedLead, budget: String(selectedLead.potentialValue) });
        setIsModalOpen(true);
    };

    return (
        <div className="flex h-full admin-page-bg">

            {/* MAIN CONTENT AREA */}
            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${selectedLeadId ? 'hidden lg:flex' : ''}`}>

                {/* Header Section */}
                <div className="px-8 py-6 max-w-[1600px] mx-auto w-full">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-1"><span className="font-display text-4xl">Lead Tracking</span></h1>
                    <p className="text-slate-500 mb-8">
                        You have <span className="text-primary font-bold">{stats.tasks}</span> follow-up(s) due today.
                    </p>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 stagger-cards">
                        <div className="bg-white dark:bg-[#1A2633] p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Pending Leads</p>
                            <div className="flex items-center gap-3">
                                <span className="text-4xl kpi-number text-slate-900 dark:text-white">{stats.pending}</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[#1A2633] p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Pipeline Value</p>
                            <div className="flex items-center gap-3">
                                <span className="text-4xl kpi-number text-slate-900 dark:text-white">₹{(stats.value / 1000).toFixed(0)}k</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[#1A2633] p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Tasks Due Today</p>
                            <div className="flex items-center gap-3">
                                <span className="text-4xl kpi-number text-slate-900 dark:text-white">{stats.tasks}</span>
                            </div>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex flex-wrap p-1 bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-xl w-full mb-6">
                        {(['All', 'New', 'Warm', 'Hot', 'Offer Sent', 'Converted', 'Cold'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all flex-1 sm:flex-none text-center ${activeTab === tab ? 'bg-slate-100 dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white border-b-2 border-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                {tab === 'All' ? 'All Leads' : tab}
                            </button>
                        ))}
                    </div>

                    {/* Search & Actions */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                            <input
                                type="text"
                                placeholder="Search leads by name, email, or destination..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary shadow-sm"
                            />
                        </div>
                        <button onClick={() => setIsImportModalOpen(true)} className="px-6 py-3 bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold shadow-sm flex items-center gap-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
                            <span className="material-symbols-outlined text-[20px]">upload_file</span> Import
                        </button>
                        <button onClick={handleExport} className="px-6 py-3 bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold shadow-sm flex items-center gap-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
                            <span className="material-symbols-outlined text-[20px]">download</span> Export
                        </button>
                        <button onClick={openAddModal} className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center gap-2 transition-transform active:scale-95 whitespace-nowrap btn-glow">
                            <Plus size={20} /> Add Lead
                        </button>
                    </div>

                    {/* Leads List */}
                    <div className="bg-white dark:bg-[#1A2633] border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                        {/* Table Header */}
                        <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <div className="col-span-3">Lead Name</div>
                            <div className="col-span-3">Destination</div>
                            <div className="col-span-2">Value</div>
                            <div className="col-span-2">Assigned To</div>
                            <div className="col-span-2 text-right">Status</div>
                        </div>
                        {/* Mobile Header */}
                        <div className="flex sm:hidden items-center gap-4 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <div className="flex-1">Lead Name</div>
                            <div className="w-20 text-right">Value</div>
                            <div className="w-20 text-right">Status</div>
                        </div>

                        {/* List Items */}
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredLeads.map(lead => (
                                <div
                                    key={lead.id}
                                    onClick={() => setSelectedLeadId(lead.id)}
                                    className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${selectedLeadId === lead.id ? 'bg-primary/5' : ''}`}
                                >
                                    {/* Desktop Row */}
                                    <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-4 items-center">
                                        <div className="col-span-3 flex items-center gap-4 overflow-hidden pr-4">
                                            <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${lead.avatarColor || 'bg-slate-100 text-slate-600'}`}>
                                                {lead.name.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-slate-900 dark:text-white truncate">{lead.name}</h3>
                                                <p className="text-xs text-slate-500 truncate">Added {new Date(lead.addedOn).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="col-span-3 overflow-hidden pr-4">
                                            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-medium text-sm truncate">
                                                <MapPin size={14} className="text-slate-400 shrink-0" />
                                                <span className="truncate">{lead.destination}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 ml-6 truncate">{lead.type}</p>
                                        </div>
                                        <div className="col-span-2 font-bold text-slate-900 dark:text-white truncate">
                                            ₹{(lead.potentialValue || 0).toLocaleString()}
                                        </div>
                                        <div className="col-span-2 text-xs font-medium text-slate-600 dark:text-slate-400 truncate">
                                            {lead.assignedTo ? staff.find(s => s.id === lead.assignedTo)?.name || 'Unknown' : 'Unassigned'}
                                        </div>
                                        <div className="col-span-2 text-right">
                                            <StatusBadge status={lead.status} />
                                        </div>
                                    </div>
                                    {/* Mobile Row */}
                                    <div className="flex sm:hidden items-center gap-3 px-4 py-3">
                                        <div className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${lead.avatarColor || 'bg-slate-100 text-slate-600'}`}>
                                            {lead.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">{lead.name}</h3>
                                            <p className="text-xs text-slate-500 truncate">{lead.destination}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-xs font-bold text-slate-900 dark:text-white">₹{((lead.potentialValue || 0) / 1000).toFixed(0)}k</p>
                                            <div className="mt-1">
                                                <StatusBadge status={lead.status} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 font-medium">
                            Showing {filteredLeads.length} of {leads.length} results
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT DETAIL PANEL (Fixed Sidebar) */}
            {selectedLead ? (
                <div className="w-full lg:w-[450px] bg-white dark:bg-[#1A2633] border-l border-slate-200 dark:border-slate-800 flex flex-col h-full fixed lg:static inset-0 z-50 overflow-y-auto animate-in slide-in-from-right-10 duration-200 shadow-2xl lg:shadow-none">

                    {/* Panel Header */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-4">
                                <div className={`h-12 w-12 rounded-full flex items-center justify-center font-black text-lg ${selectedLead.avatarColor || 'bg-blue-100 text-blue-600'}`}>
                                    {selectedLead.name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight">{selectedLead.name}</h2>
                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                        <MapPin size={12} /> {selectedLead.destination}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={openEditModal} className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                    <Edit2 size={18} />
                                </button>
                                <button onClick={handleDeleteLead} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors">
                                    <Trash2 size={18} />
                                </button>
                                <button onClick={() => setSelectedLeadId(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <StatusBadge status={selectedLead.status} />
                            {selectedLead.status === 'Offer Sent' && (
                                <span className="px-2 py-1 bg-purple-50 text-purple-700 text-[10px] font-bold uppercase rounded-md tracking-wide">Quote Sent</span>
                            )}
                        </div>
                    </div>

                    {/* Content Body */}
                    <div className="p-6 flex-1 overflow-y-auto">

                        {/* Trip Details Grid */}
                        <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider flex items-center gap-2 section-heading-accent">
                                <FileText size={14} /> Trip Details
                            </h3>
                            <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Dates</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Calendar size={14} className="text-primary" />
                                        {selectedLead.startDate ? `${new Date(selectedLead.startDate).toLocaleDateString()} - ${selectedLead.endDate ? new Date(selectedLead.endDate).toLocaleDateString() : ''}` : 'Not set'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Travelers</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Users size={14} className="text-primary" />
                                        {selectedLead.travelers}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Budget</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white text-green-600">₹{(selectedLead.potentialValue || 0).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Source</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.source}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Assigned To</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                        {selectedLead.assignedTo ? staff.find(s => s.id === selectedLead.assignedTo)?.name || 'Unknown' : 'Unassigned'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="mb-8">
                            <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider section-heading-accent">Communication</h3>
                            <div className="grid grid-cols-3 gap-3 mb-3">
                                <a href={`tel:${selectedLead.phone}`} className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:bg-primary/5 transition-all text-slate-600 dark:text-slate-300 hover:text-primary gap-2">
                                    <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><Phone size={16} /></div>
                                    <span className="text-xs font-bold">Call</span>
                                </a>
                                <a href={`mailto:${selectedLead.email}`} className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-purple-500/50 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all text-slate-600 dark:text-slate-300 hover:text-purple-600 gap-2">
                                    <div className="h-8 w-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center"><Mail size={16} /></div>
                                    <span className="text-xs font-bold">Email</span>
                                </a>
                                <a href={`https://wa.me/${selectedLead.phone?.replace(/\D/g, '')}`} target="_blank" className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-green-500/50 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all text-slate-600 dark:text-slate-300 hover:text-green-600 gap-2">
                                    <div className="h-8 w-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center"><MessageCircle size={16} /></div>
                                    <span className="text-xs font-bold">WhatsApp</span>
                                </a>
                            </div>
                            <button
                                onClick={handleConvertToBooking}
                                className="w-full py-3 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-sm hover:opacity-90 flex items-center justify-center gap-2 transition-all shadow-lg btn-glow"
                            >
                                <CheckCircle2 size={16} /> Convert to Booking
                            </button>
                        </div>

                        {/* Follow Up Log */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider">Activity Log</h3>
                            <div className="mb-6 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                <textarea
                                    value={noteContent}
                                    onChange={(e) => setNoteContent(e.target.value)}
                                    placeholder="Log call notes, internal comments, or meeting outcomes..."
                                    className="w-full bg-transparent text-sm outline-none resize-none h-20 placeholder:text-slate-400 text-slate-900 dark:text-white"
                                />
                                <div className="flex flex-col gap-3 mt-3 border-t border-slate-100 dark:border-slate-700 pt-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="set-reminder"
                                                checked={isReminderSet}
                                                onChange={(e) => setIsReminderSet(e.target.checked)}
                                                className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                                            />
                                            <label htmlFor="set-reminder" className="text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                                                Schedule Next Follow-up
                                            </label>
                                        </div>
                                        {isReminderSet && (
                                            <select
                                                value={followUpType}
                                                onChange={(e) => setFollowUpType(e.target.value as FollowUpType)}
                                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 outline-none"
                                            >
                                                {['Call', 'Email', 'WhatsApp', 'Meeting'].map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        )}
                                    </div>
                                    {isReminderSet && (
                                        <div className="flex gap-2 w-full">
                                            <input
                                                type="datetime-local"
                                                value={reminderDate}
                                                onChange={(e) => setReminderDate(e.target.value)}
                                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none flex-1"
                                            />
                                            <select
                                                value={followUpPriority}
                                                onChange={(e) => setFollowUpPriority(e.target.value as any)}
                                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none w-28"
                                            >
                                                <option value="High">High Priority</option>
                                                <option value="Medium">Med Priority</option>
                                                <option value="Low">Low Priority</option>
                                            </select>
                                        </div>
                                    )}
                                    <div className="flex justify-end">
                                        <button
                                            onClick={handleSaveLog}
                                            className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md hover:bg-primary-dark transition-colors flex items-center gap-2"
                                        >
                                            <Save size={14} /> Save Log
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Timeline Activity */}
                            <div className="space-y-6 pl-2 border-l-2 border-slate-100 dark:border-slate-800 ml-2 pb-10">
                                {selectedLead.logs && selectedLead.logs.length > 0 ? (
                                    [...selectedLead.logs].reverse().map((log) => (
                                        <div key={log.id} className="relative pl-6 group">
                                            <div className="absolute -left-[5px] top-1 h-3 w-3 rounded-full border-2 border-white bg-slate-300 ring-4 ring-white dark:ring-[#1A2633] group-hover:bg-primary transition-colors"></div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                                                {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white capitalize">{log.type}</p>
                                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{log.content}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="pl-6 text-xs text-slate-400 italic">No activity logs recorded yet.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="w-full lg:w-[380px] bg-slate-50 dark:bg-[#0B1116] border-l border-slate-200 dark:border-slate-800 hidden lg:flex flex-col h-full">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1A2633] sticky top-0 z-10">
                        <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <CalendarDays size={20} className="text-primary" /> Today's Agenda
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">Pending follow-ups & tasks</p>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto space-y-4">
                        {(() => {
                            const now = new Date();
                            const pendingTasks = followUps.filter(f => f.status === 'Pending' && f.scheduledAt && new Date(f.scheduledAt).getTime() <= now.setHours(23, 59, 59, 999))
                                .sort((a, b) => {
                                    // Sort by Priority (High > Medium > Low) then Date
                                    const priorityVal: Record<string, number> = { 'High': 3, 'Medium': 2, 'Low': 1 };
                                    const pDiff = (priorityVal[b.priority || 'Medium'] as number) - (priorityVal[a.priority || 'Medium'] as number);
                                    if (pDiff !== 0) return pDiff;
                                    return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
                                });

                            if (pendingTasks.length === 0) {
                                return (
                                    <div className="text-center p-8 mt-10">
                                        <div className="size-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                                            <Sparkles className="text-slate-400" size={20} />
                                        </div>
                                        <p className="text-sm font-bold text-slate-600 dark:text-slate-400">All caught up!</p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">No pending tasks for today.</p>
                                    </div>
                                )
                            }

                            return pendingTasks.map(task => {
                                const scheduledDate = new Date(task.scheduledAt);
                                // Overdue if scheduled day is in past, or today but time has passed
                                const isOverdue = scheduledDate.getTime() < new Date().getTime();
                                const isToday = scheduledDate.toDateString() === new Date().toDateString();

                                const priorityColors: Record<string, string> = {
                                    'High': 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50',
                                    'Medium': 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50',
                                    'Low': 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50'
                                };
                                const pStyle = priorityColors[task.priority || 'Medium'];

                                return (
                                    <div key={task.id} className={`p-4 rounded-xl border bg-white dark:bg-[#1A2633] shadow-sm relative overflow-hidden transition-all hover:shadow-md ${isOverdue ? 'border-red-300 dark:border-red-800' : 'border-slate-200 dark:border-slate-700'}`}>
                                        {isOverdue && <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>}
                                        <div className="flex justify-between items-start mb-2 pl-1">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${pStyle}`}>
                                                {task.priority || 'Medium'}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-sm text-slate-900 dark:text-white pl-1 leading-tight mb-1 truncate cursor-pointer hover:text-primary transition-colors flex items-center gap-1"
                                            onClick={() => setSelectedLeadId(task.leadId)}>
                                            {task.leadName} <ArrowRight size={14} className="text-slate-400" />
                                        </h4>
                                        <p className="text-xs text-slate-500 line-clamp-2 pl-1 mb-3 leading-relaxed">{task.description}</p>
                                        <div className="flex items-center justify-between pl-1">
                                            <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                <Clock size={12} />
                                                <span>{isToday ? 'TODAY' : scheduledDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} at {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                {isOverdue && <span className="ml-1 bg-red-100 text-red-700 px-1.5 py-0.5 rounded">OVERDUE</span>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>
            )}

            {/* Modals area */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A2633] rounded-2xl w-full max-w-lg shadow-2xl p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">{modalMode === 'edit' ? 'Edit Lead Details' : 'Add New Lead'}</h3>
                            <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Full Name</label>
                                <input required placeholder="Client Name" value={leadForm.name || ''} onChange={e => setLeadForm({ ...leadForm, name: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Phone</label>
                                    <input required placeholder="Phone Number" value={leadForm.phone || ''} onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Email</label>
                                    <input required type="email" placeholder="Email Address" value={leadForm.email || ''} onChange={e => setLeadForm({ ...leadForm, email: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Destination</label>
                                    <input required placeholder="e.g. Kyoto, Japan" value={leadForm.destination || ''} onChange={e => setLeadForm({ ...leadForm, destination: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Budget (₹)</label>
                                    <input type="number" placeholder="0" value={leadForm.budget || ''} onChange={e => setLeadForm({ ...leadForm, budget: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Status</label>
                                    <select value={leadForm.status} onChange={e => setLeadForm({ ...leadForm, status: e.target.value as any })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary">
                                        {['New', 'Warm', 'Hot', 'Cold', 'Offer Sent', 'Converted'].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Assigned To</label>
                                    <select value={leadForm.assignedTo || ''} onChange={e => setLeadForm({ ...leadForm, assignedTo: e.target.value ? Number(e.target.value) : undefined })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary">
                                        <option value="">Unassigned</option>
                                        {staff.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Travelers</label>
                                <TravelerSelector
                                    value={leadForm.travelers || '2 Adults'}
                                    onChange={(val) => setLeadForm({ ...leadForm, travelers: val })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Start Date</label>
                                    <input type="date" value={leadForm.startDate || ''} onChange={e => setLeadForm({ ...leadForm, startDate: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">End Date</label>
                                    <input type="date" value={leadForm.endDate || ''} onChange={e => setLeadForm({ ...leadForm, endDate: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all mt-2">
                                {modalMode === 'edit' ? 'Update Lead' : 'Save Lead'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            <DataImportModal<Partial<Lead>>
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                entityName="Leads"
                columns={[
                    { header: 'Full Name', key: 'name', required: true },
                    { header: 'Email', key: 'email', required: false },
                    { header: 'Phone', key: 'phone', required: false },
                    { header: 'Destination', key: 'destination', required: true },
                    { header: 'Budget', key: 'budget', required: false },
                ]}
                onImport={(data) => {
                    data.forEach((d, index) => {
                        addLead({
                            id: `IMP-LD-${Date.now()}-${index}`,
                            name: d.name || 'Unknown',
                            email: d.email || '',
                            phone: d.phone || '',
                            destination: d.destination || 'Unknown',
                            budget: String(d.budget || ''),
                            potentialValue: Number(d.budget) || 0,
                            status: 'New',
                            type: 'Custom Package',
                            travelers: '2 Adults',
                            source: 'Bulk Import',
                            addedOn: new Date().toISOString(),
                            priority: 'Medium',
                            logs: [],
                            avatarColor: 'bg-slate-100 text-slate-600'
                        });
                    });
                    setIsImportModalOpen(false);
                    toast.success(`${data.length} leads imported successfully!`);
                }}
            />
        </div>
    );
};
