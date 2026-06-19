
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useLeads } from '../../src/hooks/useLeads';
import { useBookings } from '../../src/hooks/useBookings';
import { useAuth } from '../../context/AuthContext';
import { Lead, BookingStatus, FollowUpType, Customer, BookingType, Task } from '../../types'; // Removed unused imports
import { api } from '../../src/lib/api';
import { toast } from 'sonner'; // Use sonner for consistency if available, or keep existing toast
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Phone, Mail, MapPin, Calendar, Users, Clock, X, Plus, Search,
    ChevronRight, Sparkles, Edit2, Trash2, ArrowRight, MessageCircle,
    FileText, Bell, CheckCircle2, MoreHorizontal, Filter, Save, CalendarDays,
    ChevronDown, ChevronUp
} from 'lucide-react';
import { TravelerSelector } from '../../components/ui/TravelerSelector';
import { formatPrice, formatPriceCompact } from '../../utils/packageUtils';
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
    const { addFollowUp, followUps, customers, addCustomer, tasks, updateTask, addTask, updateFollowUp } = useData();
    const { leads, addLead, updateLead, deleteLead, addLeadLog, updateLeadLog, deleteLeadLog, isLoading, refetchLeads } = useLeads();
    const { addBooking } = useBookings();
    const { currentUser, staff, hasPermission } = useAuth();
    const navigate = useNavigate();

    // UI State
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'All' | 'New' | 'Warm' | 'Hot' | 'Offer Sent' | 'Converted' | 'Cold'>('All');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isAgendaExpanded, setIsAgendaExpanded] = useState(false);

    const location = useLocation();
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const filterParam = searchParams.get('filter');
        if (filterParam === 'overdue') {
            setIsAgendaExpanded(true);
        }

        // Handle navigation from Customer Details Drawer -> New Inquiry
        if (location.state?.fromCustomer) {
            const customer = location.state.fromCustomer;
            setLeadForm(prev => ({
                ...prev,
                customerId: customer.id, // Ensure we store customerId reference
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                location: customer.location,
                source: 'Existing Customer'
            }));
            setModalMode('add');
            setIsModalOpen(true);
            
            // Clear the state so refresh doesn't reopen modal
            window.history.replaceState({}, document.title);
        }
    }, [location.search, location.state]);

    // Forms
    const [noteContent, setNoteContent] = useState('');
    const [editingLogId, setEditingLogId] = useState<string | null>(null);
    const [editLogContent, setEditLogContent] = useState('');
    const [isReminderSet, setIsReminderSet] = useState(false);
    const [reminderDate, setReminderDate] = useState('');
    const [leadForm, setLeadForm] = useState<Partial<Lead>>({
        status: 'New', travelers: '2 Adults', source: 'Manual Entry'
    });
    const [followUpType, setFollowUpType] = useState<FollowUpType>('Call');
    const [followUpPriority, setFollowUpPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');

    const selectedLead = leads.find(l => l.id === selectedLeadId);

    const [leadModalTab, setLeadModalTab] = useState<'info' | 'tasks' | 'chat'>('info');
    const [chatInput, setChatInput] = useState('');

    const [manualTaskTitle, setManualTaskTitle] = useState('');
    const [manualTaskDueDate, setManualTaskDueDate] = useState('');
    const [selectedPredefinedPlaybookStatus, setSelectedPredefinedPlaybookStatus] = useState<string>('');

    useEffect(() => {
        setLeadModalTab('info');
        if (selectedLead) {
            setSelectedPredefinedPlaybookStatus(selectedLead.status);
        }
    }, [selectedLeadId, selectedLead]);

    const handleAddManualTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLead || !manualTaskTitle.trim()) return;

        const newTask: Partial<Task> = {
            id: `TSK-${Date.now()}`,
            title: manualTaskTitle.trim(),
            description: 'Manually added checklist task',
            status: 'Pending',
            priority: 'Medium',
            dueDate: manualTaskDueDate || new Date().toISOString().split('T')[0],
            category: 'checklist',
            relatedLeadId: selectedLead.id,
            assignedTo: selectedLead.assignedTo || currentUser?.id || staff?.[0]?.id || 'System',
            assignedBy: currentUser?.id || staff?.[0]?.id || 'System',
            createdAt: new Date().toISOString()
        };

        try {
            await addTask(newTask as Task);
            setManualTaskTitle('');
            setManualTaskDueDate('');
            window.dispatchEvent(new CustomEvent('tasks-changed'));
            toast.success('Manual task added successfully');
        } catch (err) {
            console.error('Failed to add manual task:', err);
            toast.error('Failed to add task');
        }
    };

    const handleGeneratePlaybook = async () => {
        if (!selectedLead) return;
        const statusToUse = selectedPredefinedPlaybookStatus || selectedLead.status;
        try {
            await api.generateLeadPlaybook(selectedLead.id, statusToUse);
            window.dispatchEvent(new CustomEvent('tasks-changed'));
            toast.success(`Checklist loaded successfully`);
        } catch (err) {
            console.error('Failed to generate playbook:', err);
            toast.error('Failed to load playbook checklist');
        }
    };

    const handleSendStaffMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLead || !chatInput.trim()) return;
        
        const messageText = chatInput.trim();
        setChatInput('');
        
        try {
            await api.sendStaffLeadMessage(selectedLead.id, messageText);
            refetchLeads();
            toast.success('Message sent to partner');
        } catch (err: any) {
            toast.error(err.message || 'Failed to send message');
        }
    };

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

    const handleUpdateLog = (logId: string) => {
        if (!selectedLeadId || !editLogContent.trim()) return;
        updateLeadLog(logId, editLogContent);
        setEditingLogId(null);
        setEditLogContent('');
        toast.success('Log updated successfully');
    };

    const handleDeleteLog = (logId: string) => {
        if (!selectedLeadId) return;
        if (confirm('Are you sure you want to delete this log?')) {
            deleteLeadLog(logId);
            toast.success('Log deleted');
        }
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
            const isIntentionalNewInquiry = location.state?.fromCustomer?.id === leadForm.customerId;
            const duplicateLead = !isIntentionalNewInquiry && leads.find(l => 
                (leadForm.email && l.email?.toLowerCase() === leadForm.email.toLowerCase()) || 
                (leadForm.phone && l.phone === leadForm.phone)
            );

            if (duplicateLead) {
                const leadRef = duplicateLead.leadNumber 
                    ? "LD-" + String(duplicateLead.leadNumber).padStart(4, '0') 
                    : duplicateLead.name;
                
                const relatedCustomer = customers?.find((c: Customer) => 
                    c.email?.toLowerCase() === duplicateLead.email?.toLowerCase() || 
                    c.phone === duplicateLead.phone
                );

                const tip = relatedCustomer 
                    ? "\n\n💡 Tip: Open \"" + relatedCustomer.name + "\" in the Customers tab and use \"New Inquiry\" to keep their full history linked."
                    : '';

                if (!confirm("⚠️ A lead already exists for this contact (" + leadRef + ").\nStatus: " + duplicateLead.status + tip + "\n\nCreate a separate lead anyway?")) {
                    return;
                }
            }
        }

        const now = new Date().toISOString();
        if (modalMode === 'add') {
            const newLead: Lead = {
                id: '', // Will be set by DB (UUID auto-generated + lead_number)
                addedOn: now,
                logs: [],
                avatarColor: 'bg-slate-100 text-slate-600',
                name: leadForm.name || '',
                email: leadForm.email || '',
                phone: leadForm.phone || '',
                destination: leadForm.destination || '',
                travelers: leadForm.travelers || '',
                budget: leadForm.budget || 'Flexible',
                status: leadForm.status || 'New',
                type: leadForm.type || 'Tour',
                priority: 'Medium',
                source: leadForm.source || 'Manual Entry',
                potentialValue: Number(leadForm.potentialValue) || 0,
                ...leadForm
            };
            addLead(newLead);
            toast.success('Lead added successfully');
        } else {
            updateLead(leadForm.id!, {
                ...leadForm,
                potentialValue: Number(leadForm.potentialValue) || 0
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

    const handleConvertToBooking = async () => {
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

        // 1. Deep Logic: Check for existing Customer
        let targetCustomerId: string | undefined;
        const existingCustomer = customers?.find((c: Customer) =>
            (c.email?.toLowerCase() === selectedLead.email?.toLowerCase()) ||
            (c.phone === selectedLead.phone)
        );

        if (existingCustomer) {
            targetCustomerId = existingCustomer.id;
            
            // Proactively backfill missing customer fields if they are available in the lead
            try {
                const updates: Partial<Customer> = {};
                if (!existingCustomer.address && selectedLead.residentialAddress) updates.address = selectedLead.residentialAddress;
                if (!existingCustomer.officeAddress && selectedLead.officeAddress) updates.officeAddress = selectedLead.officeAddress;
                if (!existingCustomer.altPhone && selectedLead.altPhone) updates.altPhone = selectedLead.altPhone;
                if (!existingCustomer.whatsapp && selectedLead.whatsapp) updates.whatsapp = selectedLead.whatsapp;
                if (Object.keys(updates).length > 0) {
                    await api.updateCustomer(existingCustomer.id, updates);
                }
            } catch (err) {
                console.warn('Customer backfill failed:', err);
            }
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
                    totalSpent: 0,
                    // Carry forward lead CRM details to Customer CRM
                    address: selectedLead.residentialAddress || '',
                    officeAddress: selectedLead.officeAddress || '',
                    altPhone: selectedLead.altPhone || '',
                    whatsapp: selectedLead.whatsapp || '',
                    isWhatsappSame: selectedLead.isWhatsappSame !== undefined ? selectedLead.isWhatsappSame : true
                };
                addCustomer?.(newCustomer);
                targetCustomerId = newCustomerId;
            }

        try {
            await addBooking({
                id: '', // Will be set by DB (UUID auto-generated)
                type: (selectedLead.type && ['Tour', 'Hotel', 'Car', 'Bus', 'Train', 'Flight'].includes(selectedLead.type) ? selectedLead.type : 'Tour') as BookingType,
                customer: selectedLead.name,
                customerId: targetCustomerId, // Linked Customer
                email: selectedLead.email,
                phone: selectedLead.phone,
                title: `Trip to ${selectedLead.destination}`,
                date: selectedLead.startDate || new Date().toISOString().split('T')[0],
                endDate: selectedLead.endDate || undefined,
                amount: selectedLead.potentialValue || 0,
                status: BookingStatus.PENDING,
                payment: 'Unpaid',
                guests: selectedLead.travelers,
                details: `Converted from Lead. Destination: ${selectedLead.destination}. Budget: ${formatPrice(selectedLead.potentialValue || 0)}.`,
                assignedTo: selectedLead.assignedTo || staff?.id || currentUser?.id,
                partnerId: selectedLead.partnerId,
                leadId: selectedLead.id,
                
                // Carry forward lead CRM details to Booking
                whatsapp: selectedLead.whatsapp,
                isWhatsappSame: selectedLead.isWhatsappSame,
                altPhone: selectedLead.altPhone,
                paxAdult: selectedLead.paxAdult,
                paxChild: selectedLead.paxChild,
                paxInfant: selectedLead.paxInfant,
                serviceType: selectedLead.serviceType,
                residentialAddress: selectedLead.residentialAddress,
                officeAddress: selectedLead.officeAddress
            });

            // Only mark lead as converted AFTER booking is saved successfully
            updateLead(selectedLead.id, { status: 'Converted' });
            addLeadLog(selectedLead.id, {
                id: `lg-conv-${Date.now()}`,
                type: 'System',
                content: `Lead converted to Booking. Customer profile ${existingCustomer ? 'linked and synced' : 'created and synced'}.`,
                timestamp: new Date().toISOString()
            });
            toast.success('Lead converted to Booking! Now visible in Pending bookings.');
        } catch (err: any) {
            toast.error(err.message || 'Failed to convert lead to booking.');
        }
    };

    const handleCreateQuotation = () => {
        if (!selectedLead) return;
        navigate(`/admin/invoices/new?lead_id=${selectedLead.id}&type=Quotation`);
    };

    const openAddModal = () => {
        setModalMode('add');
        setLeadForm({ 
            status: 'New', 
            travelers: '2 Adults', 
            source: 'Manual Entry',
            altPhone: '',
            whatsapp: '',
            isWhatsappSame: true,
            residentialAddress: '',
            officeAddress: '',
            paxAdult: 2,
            paxChild: 0,
            paxInfant: 0
        });
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
            title: 'SHRAWELLO Travel Hub - Leads Report',
            subtitle: `Generated on: ${new Date().toLocaleDateString('en-IN')}`
        });
        toast.success('Leads exported successfully!');
    };

    const openEditModal = () => {
        if (!selectedLead) return;
        
        // Helper to format date safely into local YYYY-MM-DD for date inputs
        const formatLocalIso = (dateStr?: string) => {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return '';
            // Guard against 1899-11-30 ghost dates from MySQL 0000-00-00
            if (d.getFullYear() <= 1900) return '';
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };

        setModalMode('edit');
        setLeadForm({ 
            ...selectedLead, 
            budget: selectedLead.budget || '',
            potentialValue: selectedLead.potentialValue || 0,
            startDate: formatLocalIso(selectedLead.startDate),
            endDate: formatLocalIso(selectedLead.endDate),
            altPhone: selectedLead.altPhone || '',
            whatsapp: selectedLead.whatsapp || '',
            isWhatsappSame: selectedLead.isWhatsappSame !== undefined ? selectedLead.isWhatsappSame : true
        });
        setIsModalOpen(true);
    };

    // Compute agenda items once for use in both the strip and badge
    const agendaItems = (() => {
        const now = new Date();
        return followUps
            .filter(f => f.status === 'Pending' && f.scheduledAt && new Date(f.scheduledAt).getTime() <= now.setHours(23, 59, 59, 999))
            .sort((a, b) => {
                const priorityVal: Record<string, number> = { 'High': 3, 'Medium': 2, 'Low': 1 };
                const pDiff = (priorityVal[b.priority || 'Medium'] as number) - (priorityVal[a.priority || 'Medium'] as number);
                if (pDiff !== 0) return pDiff;
                return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
            });
    })();
    const leadChecklist = useMemo(() => {
        if (!selectedLead) return [];
        return (tasks || []).filter(t => t.relatedLeadId === selectedLead.id && t.category === 'checklist');
    }, [tasks, selectedLead]);

    const completedLeadCount = leadChecklist.filter(t => t.status === 'Completed').length;
    const leadChecklistProgress = leadChecklist.length > 0 ? Math.round((completedLeadCount / leadChecklist.length) * 100) : 0;

    const handleToggleTask = async (task: Task) => {
        const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
        const completedAt = newStatus === 'Completed' ? new Date().toISOString() : undefined;
        try {
            await updateTask(task.id, {
                status: newStatus,
                completedAt
            });
            window.dispatchEvent(new CustomEvent('tasks-changed'));
            toast.success(`Task marked as ${newStatus.toLowerCase()}`);
        } catch (e) {
            console.error('Failed to toggle task:', e);
            toast.error('Failed to update task status');
        }
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

                    {/* Smart Suggestions for Leads */}
                    {(() => {
                        const unassigned = leads.filter(l => !l.assignedTo && l.status !== 'Converted' && l.status !== 'Cold');
                        const coldLeads = leads.filter(l => l.status === 'Cold');
                        const highBudgetNoAction = leads.filter(l =>
                            (l.potentialValue || 0) >= 50000 &&
                            l.status !== 'Converted' && l.status !== 'Cold' &&
                            followUps.filter(f => f.leadId === l.id && f.status === 'Pending').length === 0
                        );
                        if (unassigned.length === 0 && coldLeads.length < 3 && highBudgetNoAction.length === 0) return null;
                        return (
                            <div className="mb-6 space-y-2">
                                {unassigned.length > 0 && (
                                    <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl text-sm">
                                        <span className="material-symbols-outlined text-amber-600 text-[20px]">person_off</span>
                                        <p className="font-bold text-amber-800 dark:text-amber-300">{unassigned.length} lead{unassigned.length > 1 ? 's' : ''} not assigned to any staff — assign them to prevent going cold.</p>
                                    </div>
                                )}
                                {coldLeads.length >= 3 && (
                                    <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800/30 rounded-xl text-sm">
                                        <span className="material-symbols-outlined text-indigo-600 text-[20px]">ac_unit</span>
                                        <p className="font-bold text-indigo-800 dark:text-indigo-300">{coldLeads.length} cold leads — consider re-engaging with a seasonal offer.</p>
                                    </div>
                                )}
                                {highBudgetNoAction.length > 0 && (
                                    <div className="flex items-center gap-3 px-4 py-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/30 rounded-xl text-sm">
                                        <span className="material-symbols-outlined text-purple-600 text-[20px]">diamond</span>
                                        <p className="font-bold text-purple-800 dark:text-purple-300">{highBudgetNoAction.length} high-value lead{highBudgetNoAction.length > 1 ? 's' : ''} (₹50k+) with no follow-up scheduled.</p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Stats Cards */}
                    <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-4 pb-2 md:grid md:grid-cols-3 mb-8 stagger-cards -mx-8 px-8 md:mx-0 md:px-0">
                        <div className="min-w-[80vw] sm:min-w-[40vw] md:min-w-0 shrink-0 snap-center bg-white dark:bg-[#1A2633] p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Pending Leads</p>
                            <div className="flex items-center gap-3">
                                <span className="text-4xl kpi-number text-slate-900 dark:text-white">{stats.pending}</span>
                            </div>
                        </div>
                        <div className="min-w-[80vw] sm:min-w-[40vw] md:min-w-0 shrink-0 snap-center bg-white dark:bg-[#1A2633] p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Pipeline Value</p>
                            <div className="flex items-center gap-3">
                                <span className="text-4xl kpi-number text-slate-900 dark:text-white">{formatPriceCompact(stats.value)}</span>
                            </div>
                        </div>
                        <div className="min-w-[80vw] sm:min-w-[40vw] md:min-w-0 shrink-0 snap-center bg-white dark:bg-[#1A2633] p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Tasks Due Today</p>
                            <div className="flex items-center gap-3">
                                <span className="text-4xl kpi-number text-slate-900 dark:text-white">{stats.tasks}</span>
                            </div>
                        </div>
                    </div>

                    {/* ── TODAY'S AGENDA STRIP ── */}
                    <div className="mb-6">
                        {/* Collapsed toggle bar */}
                        <button
                            onClick={() => setIsAgendaExpanded(v => !v)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group"
                        >
                            <CalendarDays size={16} className="text-primary shrink-0" />
                            <span className="text-sm font-black text-slate-800 dark:text-white">Today's Agenda</span>
                            {agendaItems.length > 0 ? (
                                <>
                                    <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-primary/10 text-primary">
                                        {agendaItems.length} task{agendaItems.length > 1 ? 's' : ''}
                                    </span>
                                    {agendaItems.some(t => new Date(t.scheduledAt).getTime() < new Date().getTime()) && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-600">Overdue</span>
                                    )}
                                </>
                            ) : (
                                <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-600">All clear ✓</span>
                            )}
                            <span className="ml-auto text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                                {isAgendaExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </span>
                        </button>

                        {/* Expanded content: horizontal scroll row of task chips */}
                        {isAgendaExpanded && (
                            <div className="mt-2 animate-in slide-in-from-top-2 duration-200">
                                {agendaItems.length === 0 ? (
                                    <div className="flex items-center gap-3 px-4 py-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                                        <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                            <Sparkles size={14} className="text-emerald-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">All caught up!</p>
                                            <p className="text-xs text-slate-400">No pending follow-ups for today.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                        {agendaItems.map(task => {
                                            const scheduledDate = new Date(task.scheduledAt);
                                            const isOverdue = scheduledDate.getTime() < new Date().getTime();
                                            const isToday = scheduledDate.toDateString() === new Date().toDateString();
                                            const priorityConfig: Record<string, { bar: string; badge: string }> = {
                                                'High':   { bar: 'bg-red-500',    badge: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
                                                'Medium': { bar: 'bg-amber-400',  badge: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
                                                'Low':    { bar: 'bg-emerald-400',badge: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
                                            };
                                            const pc = priorityConfig[task.priority || 'Medium'];
                                            return (
                                                <div
                                                    key={task.id}
                                                    className={`shrink-0 w-56 bg-white dark:bg-[#1A2633] rounded-xl border shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all cursor-pointer ${
                                                        isOverdue ? 'border-red-300 dark:border-red-800' : 'border-slate-200 dark:border-slate-700'
                                                    }`}
                                                    onClick={() => { 
                                                        const targetLead = leads.find(l => l.id === task.leadId);
                                                        if (targetLead) {
                                                            setSelectedLeadId(task.leadId); 
                                                            setIsAgendaExpanded(false); 
                                                        } else {
                                                            toast.error("Lead not found or has been deleted.");
                                                        }
                                                    }}
                                                >
                                                    {/* Priority colour bar */}
                                                    <div className={`h-1 w-full ${pc.bar}`} />
                                                    <div className="p-3 flex flex-col gap-1.5">
                                                        <div className="flex items-center justify-between">
                                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide ${pc.badge}`}>
                                                                {task.priority || 'Medium'}
                                                            </span>
                                                            {isOverdue && (
                                                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-100 text-red-700">OVERDUE</span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs font-black text-slate-900 dark:text-white truncate flex items-center gap-1">
                                                            {task.leadName} <ArrowRight size={11} className="text-slate-400 shrink-0" />
                                                        </p>
                                                        <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{task.description || "No detailed notes provided."}</p>
                                                        <div className="flex items-center justify-between mt-auto pt-1.5 border-t border-slate-100 dark:border-slate-700/60">
                                                            <div className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider ${
                                                                isOverdue ? 'text-red-500' : 'text-slate-400'
                                                            }`}>
                                                                <Clock size={10} />
                                                                <span>{isToday ? 'Today' : scheduledDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} · {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        if (confirm(`Mark follow-up for ${task.leadName || 'Unknown'} as Done?`)) {
                                                                            try {
                                                                                await updateFollowUp(task.id, { 
                                                                                    status: 'Done', 
                                                                                    completedAt: new Date().toISOString() 
                                                                                });
                                                                                await addLeadLog(task.leadId, {
                                                                                    id: `lg-fu-done-${Date.now()}`,
                                                                                    type: 'Activity',
                                                                                    content: `Follow-up marked as Completed: ${task.description || 'No details'}`,
                                                                                    timestamp: new Date().toISOString()
                                                                                });
                                                                                toast.success("Follow-up marked as completed");
                                                                            } catch (err) {
                                                                                console.error(err);
                                                                                toast.error("Failed to complete follow-up");
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="p-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                                                    title="Mark as Done"
                                                                >
                                                                    <CheckCircle2 size={12} />
                                                                </button>
                                                                <button
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        if (confirm(`Cancel follow-up for ${task.leadName || 'Unknown'}?`)) {
                                                                            try {
                                                                                await updateFollowUp(task.id, { status: 'Cancelled' });
                                                                                await addLeadLog(task.leadId, {
                                                                                    id: `lg-fu-cancel-${Date.now()}`,
                                                                                    type: 'Activity',
                                                                                    content: `Follow-up Cancelled: ${task.description || 'No details'}`,
                                                                                    timestamp: new Date().toISOString()
                                                                                });
                                                                                toast.success("Follow-up cancelled");
                                                                            } catch (err) {
                                                                                console.error(err);
                                                                                toast.error("Failed to cancel follow-up");
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                                                                    title="Cancel Follow-up"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    {/* ── END AGENDA STRIP ── */}

                    {/* Filter Tabs */}
                    <div className="flex overflow-x-auto hide-scrollbar p-1 bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-xl w-full mb-6">
                        {(['All', 'New', 'Warm', 'Hot', 'Offer Sent', 'Converted', 'Cold'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all shrink-0 text-center ${activeTab === tab ? 'bg-slate-100 dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white border-b-2 border-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                {tab === 'All' ? 'All Leads' : tab}
                            </button>
                        ))}
                    </div>

                    {/* Search & Actions */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 mb-6">
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
                        <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-2 md:pb-0">
                            {hasPermission('leads', 'manage') && (
                                <button onClick={() => setIsImportModalOpen(true)} className="flex-1 md:flex-none justify-center px-4 md:px-6 py-3 bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold shadow-sm flex items-center gap-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap">
                                    <span className="material-symbols-outlined text-[20px]">upload_file</span> <span className="hidden sm:inline">Import</span>
                                </button>
                            )}
                            <button onClick={handleExport} className="flex-1 md:flex-none justify-center px-4 md:px-6 py-3 bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold shadow-sm flex items-center gap-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap">
                                <span className="material-symbols-outlined text-[20px]">download</span> <span className="hidden sm:inline">Export</span>
                            </button>
                            {hasPermission('leads', 'manage') && (
                                <button onClick={openAddModal} className="flex-[2] md:flex-none justify-center bg-primary hover:bg-primary-dark text-white px-4 md:px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center gap-2 transition-transform active:scale-95 whitespace-nowrap btn-glow">
                                    <Plus size={20} /> Add Lead
                                </button>
                            )}
                        </div>
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
                            {filteredLeads.map(lead => {
                                const isPartner = !!lead.partnerId || lead.source === 'Partner Referral';
                                return (
                                    <div
                                        key={lead.id}
                                        onClick={() => setSelectedLeadId(lead.id)}
                                        className={`cursor-pointer border-l-4 transition-colors ${
                                            isPartner 
                                                ? 'bg-violet-500/5 dark:bg-violet-500/10 border-violet-500 hover:bg-violet-500/10 dark:hover:bg-violet-500/20' 
                                                : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
                                        } ${selectedLeadId === lead.id ? 'bg-primary/5' : ''}`}
                                    >
                                        {/* Desktop Row */}
                                        <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-4 items-center">
                                            <div className="col-span-3 flex items-center gap-4 overflow-hidden pr-4">
                                                <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${lead.avatarColor || 'bg-slate-100 text-slate-600'}`}>
                                                    {lead.name.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                                                        {lead.name}
                                                        {isPartner && (
                                                            <span className="inline-flex items-center text-[9px] font-black px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border border-violet-200/50 uppercase tracking-wider">Partner</span>
                                                        )}
                                                    </h3>
                                                    <p className="text-xs text-slate-500 truncate">
                                                        {lead.leadNumber ? <span className="font-mono font-bold text-primary mr-1">LD-{String(lead.leadNumber).padStart(4, '0')}</span> : null}
                                                        Added {new Date(lead.addedOn).toLocaleDateString()}
                                                    </p>
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
                                                {formatPrice(lead.potentialValue || 0)}
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
                                                <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate flex items-center gap-1.5">
                                                    {lead.name}
                                                    {isPartner && (
                                                        <span className="inline-flex items-center text-[9px] font-black px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border border-violet-200/50 uppercase tracking-wider">Partner</span>
                                                    )}
                                                </h3>
                                                <p className="text-xs text-slate-500 truncate">{lead.destination}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-xs font-bold text-slate-900 dark:text-white">{formatPriceCompact(lead.potentialValue || 0)}</p>
                                                <div className="mt-1">
                                                    <StatusBadge status={lead.status} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 font-medium">
                            Showing {filteredLeads.length} of {leads.length} results
                        </div>
                    </div>
                </div>
            </div>

            {/* LEAD DETAILS (Modal) */}
            {selectedLead && (
                <div className="fixed inset-0 z-[200] bg-black/50 flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A2633] rounded-t-3xl sm:rounded-2xl w-full h-[95vh] sm:h-auto max-w-4xl shadow-2xl flex flex-col sm:max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95">

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
                                        {selectedLead.leadNumber && (
                                            <span className="font-mono font-bold text-primary">LD-{String(selectedLead.leadNumber).padStart(4, '0')}</span>
                                        )}
                                        <MapPin size={12} /> {selectedLead.destination}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {hasPermission('leads', 'manage') && (
                                    <button onClick={openEditModal} className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                        <Edit2 size={18} />
                                    </button>
                                )}
                                {hasPermission('leads', 'manage') && (
                                    <button onClick={handleDeleteLead} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                )}
                                <button onClick={() => setSelectedLeadId(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                            <div className="flex gap-2">
                                <StatusBadge status={selectedLead.status} />
                                {selectedLead.status === 'Offer Sent' && (
                                    <span className="px-2 py-1 bg-purple-50 text-purple-700 text-[10px] font-bold uppercase rounded-md tracking-wide">Quote Sent</span>
                                )}
                            </div>
                            {selectedLead.partnerId && (
                                <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-800/40 px-2.5 py-1 rounded-md">
                                    Referral: {selectedLead.partnerName || selectedLead.partnerId} {selectedLead.partnerCompanyName ? `(${selectedLead.partnerCompanyName})` : ''}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-4 mt-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                            <button
                                onClick={() => setLeadModalTab('info')}
                                className={`text-xs font-bold pb-1 transition-all ${
                                    leadModalTab === 'info'
                                        ? 'text-primary border-b-2 border-primary'
                                        : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                Details & Timeline
                            </button>
                            <button
                                onClick={() => setLeadModalTab('tasks')}
                                className={`text-xs font-bold pb-1 transition-all flex items-center gap-1.5 ${
                                    leadModalTab === 'tasks'
                                        ? 'text-primary border-b-2 border-primary'
                                        : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[16px]">playlist_add_check</span>
                                Tasks & Playbook
                            </button>
                            {selectedLead.partnerId && (
                                <button
                                    onClick={() => setLeadModalTab('chat')}
                                    className={`text-xs font-bold pb-1 transition-all flex items-center gap-1.5 ${
                                        leadModalTab === 'chat'
                                            ? 'text-primary border-b-2 border-primary'
                                            : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    <MessageCircle size={14} />
                                    Partner Chat
                                    {selectedLead.logs?.some(l => l.type === 'Chat' && l.sender !== 'Admin' && !staff.some(s => s.name === l.sender)) && (
                                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Content Body */}
                    <div className="p-6 flex-1 overflow-y-auto">
                        {leadModalTab === 'chat' ? (
                            <div className="flex flex-col h-[55vh] justify-between">
                                {/* Chat Messages */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    {selectedLead.logs && selectedLead.logs.filter(log => log.type === 'Chat').length > 0 ? (
                                        [...selectedLead.logs]
                                            .filter(log => log.type === 'Chat')
                                            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                                            .map(log => {
                                                const isStaff = log.sender === 'Admin' || staff.some(s => s.name === log.sender) || log.sender === currentUser?.email;
                                                return (
                                                    <div key={log.id} className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}>
                                                        <div className="flex items-center gap-1.5 mb-1 px-1">
                                                            <span className="text-[10px] font-bold text-slate-400">
                                                                {log.sender || 'System'}
                                                            </span>
                                                            <span className="text-[9px] text-slate-400">
                                                                • {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs font-medium shadow-sm leading-relaxed ${
                                                            isStaff 
                                                                ? 'bg-primary text-white rounded-tr-none' 
                                                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-tl-none'
                                                        }`}>
                                                            {log.content}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                                            <MessageCircle size={32} className="text-slate-300" />
                                            <p className="text-xs italic">No messages exchanged yet. Start chatting with the partner.</p>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Input form */}
                                <form onSubmit={handleSendStaffMessage} className="mt-4 flex gap-2">
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        placeholder="Type a message to send to partner..."
                                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary shadow-sm"
                                    />
                                    <button
                                        type="submit"
                                        className="bg-primary hover:bg-primary-dark text-white px-5 rounded-xl font-bold text-xs flex items-center justify-center shadow-md active:scale-95 transition-all"
                                    >
                                        Send
                                    </button>
                                </form>
                            </div>
                        ) : leadModalTab === 'tasks' ? (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                {/* Playbook Header Card */}
                                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
                                                Active Playbook
                                            </span>
                                            <span className="text-xs text-slate-400">•</span>
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                                {selectedLead.status} Stage
                                            </span>
                                        </div>
                                        <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                                            {selectedLead.status} Playbook Action Plan
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="text-right">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">Progress</p>
                                            <p className="text-sm font-black text-slate-800 dark:text-white">
                                                {completedLeadCount}/{leadChecklist.length} ({leadChecklistProgress}%)
                                            </p>
                                        </div>
                                        <div className="w-20 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                            <div
                                                className="bg-primary h-full rounded-full transition-all duration-500"
                                                style={{ width: `${leadChecklistProgress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Predefined Playbook Loader */}
                                <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[20px] text-primary">auto_awesome</span>
                                        <div>
                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Load Predefined Checklist Template</p>
                                            <p className="text-[10px] text-slate-400">Initialize tasks for any Lead Stage or Booking Type</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <select
                                            value={selectedPredefinedPlaybookStatus}
                                            onChange={e => setSelectedPredefinedPlaybookStatus(e.target.value)}
                                            className="flex-1 sm:flex-none bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-350 outline-none w-full sm:w-44"
                                        >
                                            <optgroup label="Lead Stages">
                                                {['New', 'Warm', 'Hot', 'Offer Sent', 'Converted', 'Cold'].map(s => (
                                                    <option key={s} value={s}>{s} Playbook</option>
                                                ))}
                                            </optgroup>
                                            <optgroup label="Service Types">
                                                {['Tour', 'Hotel', 'Car', 'Bus', 'Train', 'Flight'].map(t => (
                                                    <option key={t} value={t}>{t === 'Car' ? 'Cab (Car)' : t} Playbook</option>
                                                ))}
                                            </optgroup>
                                        </select>
                                        <button
                                            onClick={handleGeneratePlaybook}
                                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-xs font-bold shadow-sm transition-all"
                                        >
                                            Load
                                        </button>
                                    </div>
                                </div>

                                {/* Task Checklist Items */}
                                <div className="space-y-3">
                                    {leadChecklist.length > 0 ? (
                                        leadChecklist.map((task) => {
                                            const isCompleted = task.status === 'Completed';
                                            return (
                                                <div
                                                    key={task.id}
                                                    onClick={() => handleToggleTask(task)}
                                                    className={`group p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-start gap-4 select-none ${
                                                        isCompleted
                                                            ? 'bg-slate-50/50 dark:bg-slate-900/20 border-slate-100 dark:border-slate-800/80 opacity-70'
                                                            : 'bg-white dark:bg-[#1E293B] border-slate-100 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:shadow-sm'
                                                    }`}
                                                >
                                                    <div className="mt-0.5 shrink-0">
                                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                                            isCompleted
                                                                ? 'bg-primary border-primary text-white'
                                                                : 'border-slate-300 dark:border-slate-600 group-hover:border-primary'
                                                        }`}>
                                                            {isCompleted && (
                                                                <span className="material-symbols-outlined text-[16px] font-black">check</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-xs font-bold leading-snug transition-all ${
                                                            isCompleted
                                                                ? 'text-slate-400 dark:text-slate-500 line-through'
                                                                : 'text-slate-800 dark:text-slate-200'
                                                        }`}>
                                                            {task.title}
                                                        </p>
                                                        {task.description && (
                                                            <p className={`text-[10px] mt-1 leading-relaxed ${
                                                                isCompleted
                                                                    ? 'text-slate-400 dark:text-slate-600'
                                                                    : 'text-slate-500 dark:text-slate-400'
                                                            }`}>
                                                                {task.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {task.assignedTo && (
                                                        <div className="shrink-0 flex flex-col items-end gap-1.5">
                                                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-bold">
                                                                Owner: {staff.find(s => String(s.id) === String(task.assignedTo))?.name || 'System'}
                                                            </span>
                                                            {task.dueDate && (
                                                                <span className="text-[8px] text-slate-400 dark:text-slate-500 font-mono">
                                                                    Due: {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="p-8 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                                            <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700 mb-2">assignment_late</span>
                                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">No Playbook checklist tasks</p>
                                            <p className="text-[10px] text-slate-400 mt-1 max-w-sm mx-auto">
                                                Checklist playbooks are automatically generated when a lead enters a stage (e.g. Warm, Hot, Offer Sent). Change the lead status to initialize tasks.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Add Manual Task Form */}
                                <form onSubmit={handleAddManualTask} className="mt-4 flex flex-col sm:flex-row gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                                    <input
                                        type="text"
                                        value={manualTaskTitle}
                                        onChange={e => setManualTaskTitle(e.target.value)}
                                        placeholder="Add a custom checklist task..."
                                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20"
                                        required
                                    />
                                    <input
                                        type="date"
                                        value={manualTaskDueDate}
                                        onChange={e => setManualTaskDueDate(e.target.value)}
                                        className="bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-350 outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-36"
                                    />
                                    <button
                                        type="submit"
                                        className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all shrink-0"
                                    >
                                        <Plus size={14} /> Add Task
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <>

                        {/* Contact Information */}
                        <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider flex items-center gap-2 section-heading-accent">
                                <span className="material-symbols-outlined text-[16px] text-primary">contact_page</span> Contact Information
                            </h3>
                            <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Primary Phone</p>
                                    <a href={`tel:${selectedLead.phone}`} className="text-sm font-bold text-slate-900 dark:text-white hover:underline hover:text-primary flex items-center gap-1.5">
                                        <Phone size={14} className="text-primary" />
                                        {selectedLead.phone}
                                    </a>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Email Address</p>
                                    <a href={`mailto:${selectedLead.email}`} className="text-sm font-bold text-slate-900 dark:text-white hover:underline hover:text-primary flex items-center gap-1.5 truncate">
                                        <Mail size={14} className="text-primary" />
                                        {selectedLead.email}
                                    </a>
                                </div>
                                {selectedLead.altPhone && (
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Alternate Phone</p>
                                        <a href={`tel:${selectedLead.altPhone}`} className="text-sm font-bold text-slate-900 dark:text-white hover:underline hover:text-primary flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-primary text-[14px]">phone_iphone</span>
                                            {selectedLead.altPhone}
                                        </a>
                                    </div>
                                )}
                                {selectedLead.whatsapp && (
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">WhatsApp Number</p>
                                        <a href={`https://wa.me/${selectedLead.whatsapp.replace(/\D/g, '')}`} target="_blank" className="text-sm font-bold text-green-600 dark:text-green-400 hover:underline flex items-center gap-1.5">
                                            <MessageCircle size={14} className="text-green-500" />
                                            {selectedLead.whatsapp}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>

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
                                        {(() => {
                                            const safeDate = (ds?: string) => {
                                                if (!ds) return null;
                                                const d = new Date(ds);
                                                if (isNaN(d.getTime()) || d.getFullYear() <= 1900) return null;
                                                return d.toLocaleDateString('en-IN');
                                            };
                                            const s = safeDate(selectedLead.startDate);
                                            const e = safeDate(selectedLead.endDate);
                                            if (!s) return 'Not set';
                                            return e && e !== s ? `${s} — ${e}` : s;
                                        })()}
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
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Estimated Value</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white text-green-600">{formatPrice(selectedLead.potentialValue || 0)}</p>
                                </div>
                                {selectedLead.budget && (
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Target Budget Range</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.budget}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Trip Type</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedLead.type || 'Custom Package'}</p>
                                </div>
                                {selectedLead.location && (
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Customer Home Location</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                            <MapPin size={14} className="text-primary" />
                                            {selectedLead.location}
                                        </p>
                                    </div>
                                )}
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

                        {/* Special Preferences / Notes (if present) */}
                        {selectedLead.preferences && (
                            <div className="mb-8 p-4 bg-violet-50 dark:bg-violet-950/15 rounded-2xl border border-violet-100 dark:border-violet-900/30">
                                <h3 className="text-xs font-bold text-violet-700 dark:text-violet-400 uppercase mb-4 tracking-wider flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">favorite</span> Special Preferences & Notes
                                </h3>
                                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{selectedLead.preferences}</p>
                            </div>
                        )}

                        {/* Addresses Grid (if present) */}
                        {(selectedLead.residentialAddress || selectedLead.officeAddress) && (
                            <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider flex items-center gap-2 section-heading-accent">
                                    <MapPin size={14} /> Addresses
                                </h3>
                                <div className="space-y-4">
                                    {selectedLead.residentialAddress && (
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Residential Address</p>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">{selectedLead.residentialAddress}</p>
                                        </div>
                                    )}
                                    {selectedLead.officeAddress && (
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Office Address</p>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">{selectedLead.officeAddress}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

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
                            {hasPermission('leads', 'manage') && (
                                <>
                                    <button
                                        onClick={handleConvertToBooking}
                                        className="w-full py-3 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-sm hover:opacity-90 flex items-center justify-center gap-2 transition-all shadow-lg btn-glow"
                                    >
                                        <CheckCircle2 size={16} /> Convert to Booking
                                    </button>
                                    <button onClick={handleCreateQuotation} className="w-full py-3 mt-3 rounded-xl bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-2 transition-all border border-slate-200 dark:border-slate-700"><FileText size={16} /> Create Quotation</button>
                                </>
                            )}</div>

                        {/* Follow Up Log */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider">Activity Log</h3>
                            {hasPermission('leads', 'manage') && (
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
                            )}

                            {/* Timeline Activity */}
                            <div className="space-y-6 pl-2 border-l-2 border-slate-100 dark:border-slate-800 ml-2 pb-10">
                                {selectedLead.logs && selectedLead.logs.length > 0 ? (
                                    [...selectedLead.logs].reverse().map((log) => (
                                        <div key={log.id} className="relative pl-6 group">
                                            <div className="absolute -left-[5px] top-1 h-3 w-3 rounded-full border-2 border-white bg-slate-300 ring-4 ring-white dark:ring-[#1A2633] group-hover:bg-primary transition-colors"></div>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                                                        {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white capitalize flex items-center gap-2">
                                                        {log.type}
                                                        {log.type === 'Note' && hasPermission('leads', 'manage') && (
                                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                                                <button onClick={() => { setEditingLogId(log.id); setEditLogContent(log.content); }} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-primary transition-colors">
                                                                    <span className="material-symbols-outlined text-[14px]">edit</span>
                                                                </button>
                                                                <button onClick={() => handleDeleteLog(log.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-slate-400 hover:text-red-500 transition-colors">
                                                                    <span className="material-symbols-outlined text-[14px]">delete</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            {editingLogId === log.id ? (
                                                <div className="mt-2">
                                                    <textarea
                                                        value={editLogContent}
                                                        onChange={(e) => setEditLogContent(e.target.value)}
                                                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                                                        rows={3}
                                                    />
                                                    <div className="flex justify-end gap-2 mt-2">
                                                        <button onClick={() => setEditingLogId(null)} className="px-3 py-1 text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
                                                        <button onClick={() => handleUpdateLog(log.id)} disabled={!editLogContent.trim()} className="px-3 py-1 text-xs font-bold bg-primary text-white hover:bg-primary-dark rounded-lg disabled:opacity-50">Save</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed whitespace-pre-wrap">{log.content}</p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="pl-6 text-xs text-slate-400 italic">No activity logs recorded yet.</div>
                                )}
                            </div>
                        </div>
                        </>
                    )}
                    </div>
                </div>
                </div>
            )}

            {/* Modals area */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] bg-black/50 flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A2633] rounded-t-3xl sm:rounded-2xl w-full max-w-lg shadow-2xl p-6 animate-in slide-in-from-bottom-4 sm:zoom-in-95 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">{modalMode === 'edit' ? 'Edit Lead Details' : 'Add New Lead'}</h3>
                            <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-slate-400" /></button>
                        </div>
                        {leadForm.customerId && (
                            <div className="mb-6 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/30 rounded-xl flex items-start gap-3">
                                <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-[20px] mt-0.5">link</span>
                                <div>
                                    <p className="text-sm font-bold text-indigo-900 dark:text-indigo-300">Linked to Customer Profile</p>
                                    <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-0.5">This inquiry is attached to an existing customer. Their history will be kept together.</p>
                                </div>
                            </div>
                        )}
                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Full Name</label>
                                <input required placeholder="Client Name" value={leadForm.name || ''} onChange={e => setLeadForm({ ...leadForm, name: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Phone</label>
                                    <input required placeholder="Phone Number" value={leadForm.phone || ''} onChange={e => setLeadForm({ ...leadForm, phone: e.target.value, whatsapp: leadForm.isWhatsappSame ? e.target.value : leadForm.whatsapp })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Email</label>
                                    <input required type="email" placeholder="Email Address" value={leadForm.email || ''} onChange={e => setLeadForm({ ...leadForm, email: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Alternate Phone</label>
                                    <input placeholder="Alternate Number" value={leadForm.altPhone || ''} onChange={e => setLeadForm({ ...leadForm, altPhone: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase block">WhatsApp Number</label>
                                        <div className="flex items-center gap-1.5">
                                            <input type="checkbox" id="lead-is-whatsapp-same" checked={leadForm.isWhatsappSame} onChange={e => {
                                                const checked = e.target.checked;
                                                setLeadForm({ 
                                                    ...leadForm, 
                                                    isWhatsappSame: checked, 
                                                    whatsapp: checked ? (leadForm.phone || '') : '' 
                                                });
                                            }} className="rounded border-slate-300 text-primary focus:ring-primary h-3.5 w-3.5" />
                                            <label htmlFor="lead-is-whatsapp-same" className="text-[10px] font-bold text-slate-400 cursor-pointer select-none">Same as Phone</label>
                                        </div>
                                    </div>
                                    <input placeholder="WhatsApp Number" disabled={leadForm.isWhatsappSame} value={leadForm.isWhatsappSame ? (leadForm.phone || '') : (leadForm.whatsapp || '')} onChange={e => setLeadForm({ ...leadForm, whatsapp: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary disabled:opacity-55 disabled:cursor-not-allowed" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Residential Address</label>
                                    <input placeholder="Home Address" value={leadForm.residentialAddress || ''} onChange={e => setLeadForm({ ...leadForm, residentialAddress: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Office Address</label>
                                    <input placeholder="Work Address" value={leadForm.officeAddress || ''} onChange={e => setLeadForm({ ...leadForm, officeAddress: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Destination</label>
                                    <input required placeholder="e.g. Kyoto, Japan" value={leadForm.destination || ''} onChange={e => setLeadForm({ ...leadForm, destination: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Customer Home Location</label>
                                    <input placeholder="e.g. Mumbai, IN" value={leadForm.location || ''} onChange={e => setLeadForm({ ...leadForm, location: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Estimated Value (₹)</label>
                                    <input type="number" placeholder="0" value={leadForm.potentialValue !== undefined ? leadForm.potentialValue : ''} onChange={e => setLeadForm({ ...leadForm, potentialValue: Number(e.target.value) || 0 })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Target Budget Range (₹)</label>
                                    <input placeholder="e.g. 50,000 – 80,000" value={leadForm.budget || ''} onChange={e => setLeadForm({ ...leadForm, budget: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Trip Type</label>
                                    <select value={leadForm.type || 'Tour'} onChange={e => setLeadForm({ ...leadForm, type: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary">
                                        {['Tour', 'Hotel', 'Car', 'Bus', 'Train', 'Flight', 'Custom Package'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Status</label>
                                    <select value={leadForm.status} onChange={e => setLeadForm({ ...leadForm, status: e.target.value as any })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary">
                                        {['New', 'Warm', 'Hot', 'Cold', 'Offer Sent', 'Converted'].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Assigned To</label>
                                    <select value={leadForm.assignedTo || ''} onChange={e => setLeadForm({ ...leadForm, assignedTo: e.target.value ? Number(e.target.value) : undefined })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary">
                                        <option value="">Unassigned</option>
                                        {staff.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Special Preferences / Notes</label>
                                <textarea placeholder="Accommodation preferences, dietary requirements, special requests..." value={leadForm.preferences || ''} onChange={e => setLeadForm({ ...leadForm, preferences: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary h-20 resize-none" />
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


