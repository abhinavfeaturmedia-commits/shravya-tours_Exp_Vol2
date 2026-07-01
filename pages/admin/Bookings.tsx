import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useBookings } from '../../src/hooks/useBookings';
import { BookingStatus, Booking, BookingType, BookingNote, Task } from '../../types';
import { api } from '../../src/lib/api';
import { generateReceiptPDF } from '../../utils/pdfGenerator';
import { SupplierManagementModal } from '../../components/admin/SupplierManagementModal';
import { LedgerManagementModal } from '../../components/admin/LedgerManagementModal';

import { ActionMenu } from '../../components/ui/ActionMenu';
import { SuggestPopup, isDismissed, isSnoozed } from '../../components/ui/SuggestPopup';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { toast } from 'sonner';
import { useTransfers } from '../../src/hooks/useTransfers';
import { TransferRequestModal } from '../../components/ui/TransferRequestModal';
import { Pagination, usePagination } from '../../components/ui/Pagination';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportToExcel, ExportColumn } from '../../src/lib/exportUtils';
import { formatPrice } from '../../utils/packageUtils';
import { Plus, X, Edit2, Trash2 } from 'lucide-react';

export const Bookings: React.FC = () => {
    const { packages, customers, leads, refreshData, coupons, applyCoupon, detachCoupon, tasks, updateTask, addTask, deleteTask } = useData();
    const { bookings, addBooking, updateBooking, deleteBooking, isLoading } = useBookings();
    const { transfers, refetchTransfers } = useTransfers();
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const { currentUser, hasPermission, staff } = useAuth();
    const { settings } = useSettings();
    const fi = settings.finance;
    const location = useLocation();
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
    const [activeTab, setActiveTab] = useState('All');
    const [search, setSearch] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedBookingForSuppliersId, setSelectedBookingForSuppliersId] = useState<string | null>(null);
    const [bookingForLedgerId, setBookingForLedgerId] = useState<string | null>(null);
    const [viewingBookingId, setViewingBookingId] = useState<string | null>(null);
    const [printingTxId, setPrintingTxId] = useState<string | null>(null);

    const handlePrintReceiptInBookings = async (tx: any, booking: Booking) => {
        setPrintingTxId(tx.id);
        const toastId = toast.loading('Generating transaction receipt...');
        try {
            const customerDetails = customers?.find((c: any) => c.id === booking.customerId || c.email === booking.email) || null;
            
            const transportBooking = booking.supplierBookings?.find((sb: any) => sb.serviceType === 'Transport');
            const vehicleDetails = transportBooking 
                ? `${transportBooking.notes || 'AC Transport'} ${transportBooking.vehicleNumber ? `(Vehicle: ${transportBooking.vehicleNumber})` : ''}`.trim()
                : '13 + 1 Seater AC Tempo Traveller';
                
            const linkedPkg = packages?.find((p: any) => p.id === booking.packageId);
            const routeDetails = linkedPkg 
                ? linkedPkg.location 
                : (booking.title || 'Tour Route');

            await generateReceiptPDF(booking, tx, customerDetails, vehicleDetails, routeDetails, fi);
            toast.dismiss(toastId);
            toast.success('Receipt downloaded successfully');
        } catch (err: any) {
            toast.dismiss(toastId);
            toast.error(`Receipt generation failed: ${err.message || 'Unknown error'}`);
            console.error('[Receipt Error]', err);
        } finally {
            setPrintingTxId(null);
        }
    };

    // Always derive from live bookings array so modals auto-refresh after mutations
    const bookingForLedger = bookingForLedgerId ? bookings.find(b => b.id === bookingForLedgerId) ?? null : null;
    const viewingBooking = viewingBookingId ? bookings.find(b => b.id === viewingBookingId) ?? null : null;
    const selectedBookingForSuppliers = selectedBookingForSuppliersId ? bookings.find(b => b.id === selectedBookingForSuppliersId) ?? null : null;

    const [noteText, setNoteText] = useState('');
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [editNoteText, setEditNoteText] = useState('');

    const [bookingModalTab, setBookingModalTab] = useState<'info' | 'checklist' | 'chat'>('info');
    const [chatInput, setChatInput] = useState('');

    const [manualTaskTitle, setManualTaskTitle] = useState('');
    const [manualTaskDueDate, setManualTaskDueDate] = useState('');
    const [manualTaskPriority, setManualTaskPriority] = useState<'Low'|'Medium'|'High'|'Urgent'>('Medium'); // Fix #13
    const [manualTaskAssignee, setManualTaskAssignee] = useState<string>('');                               // Fix #13
    const [showManualTaskForm, setShowManualTaskForm] = useState(false);                                    // Fix #29
    const [selectedPredefinedPlaybookType, setSelectedPredefinedPlaybookType] = useState<string>('');
    const [taskFilter, setTaskFilter] = useState<'all'|'pending'|'inprogress'|'completed'|'overdue'>('all'); // Fix #15
    const [showOnlyMine, setShowOnlyMine] = useState(false);                                               // Fix #18
    const [completionNoteTask, setCompletionNoteTask] = useState<Task|null>(null);                          // Fix #14
    const [completionNoteText, setCompletionNoteText] = useState('');                                       // Fix #14
    const [showPlaybookConfirm, setShowPlaybookConfirm] = useState(false);                                  // Fix #4
    const [reassigningTaskId, setReassigningTaskId] = useState<string|null>(null);                          // Fix #12
    const [editingTaskId, setEditingTaskId] = useState<string|null>(null);                                  // Fix #8
    const [editingTaskTitle, setEditingTaskTitle] = useState('');                                           // Fix #8
    const [playbookKeys, setPlaybookKeys] = useState<{leadStages:string[], bookingTypes:string[]}>({       // Fix #24
        leadStages: ['New','Warm','Hot','Offer Sent','Converted','Cold'],
        bookingTypes: ['Tour','Hotel','Car','Bus','Train','Flight']
    });

    useEffect(() => {
        setBookingModalTab('info');
        setTaskFilter('all');
        setShowOnlyMine(false);
        setShowManualTaskForm(false);
        if (viewingBooking) {
            setSelectedPredefinedPlaybookType(viewingBooking.type);
            setManualTaskAssignee(String(viewingBooking.assignedTo || currentUser?.id || ''));
        }
    }, [viewingBookingId, viewingBooking]);

    // Fix #24: Load dynamic playbook keys from backend on mount
    useEffect(() => {
        api.getPlaybookKeys().then(keys => setPlaybookKeys(keys)).catch(() => {});
    }, []);

    const handleAddManualBookingTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!viewingBooking || !manualTaskTitle.trim()) return;

        // Fix #2: No hardcoded id — let backend generate UUID
        // Fix #13: Include priority and assignee from form
        const newTask: Partial<Task> = {
            title: manualTaskTitle.trim(),
            description: '',
            status: 'Pending',
            priority: manualTaskPriority,
            dueDate: manualTaskDueDate || new Date().toISOString().split('T')[0],
            category: 'checklist',
            source: 'manual',   // Fix #1: tag as manual so playbook reload won't delete it
            relatedBookingId: viewingBooking.id,
            assignedTo: manualTaskAssignee || viewingBooking.assignedTo || currentUser?.id || staff?.[0]?.id || 'System',
            assignedBy: currentUser?.id || staff?.[0]?.id || 'System',
            createdAt: new Date().toISOString()
        };

        try {
            await addTask(newTask as Task);
            setManualTaskTitle('');
            setManualTaskDueDate('');
            setManualTaskPriority('Medium');
            setShowManualTaskForm(false); // Fix #29: collapse form after submit
            window.dispatchEvent(new CustomEvent('tasks-changed'));
            toast.success('Custom task added');
        } catch (err) {
            console.error('Failed to add manual task:', err);
            toast.error('Failed to add task');
        }
    };

    // Fix #4: Guard generate playbook with confirm modal
    const handleGenerateBookingPlaybook = async () => {
        if (!viewingBooking) return;
        setShowPlaybookConfirm(true);
    };
    const confirmGeneratePlaybook = async () => {
        if (!viewingBooking) return;
        setShowPlaybookConfirm(false);
        const typeToUse = selectedPredefinedPlaybookType || viewingBooking.type;
        try {
            await api.generateBookingPlaybook(viewingBooking.id, typeToUse);
            window.dispatchEvent(new CustomEvent('tasks-changed'));
            toast.success(`${typeToUse} playbook loaded`);
        } catch (err) {
            console.error('Failed to generate playbook:', err);
            toast.error('Failed to load playbook checklist');
        }
    };

    // Fix #9: 3-state toggle Pending → In Progress → Completed
    // Fix #14: Intercept before Completed to show note popup
    const handleToggleTask = async (task: Task) => {
        const cycle: Record<string, string> = { 'Pending': 'In Progress', 'In Progress': 'Completed', 'Completed': 'Pending', 'Overdue': 'In Progress' };
        const newStatus = cycle[task.status] || 'Pending';
        if (newStatus === 'Completed') {
            // Fix #14: show note modal before saving completion
            setCompletionNoteTask(task);
            setCompletionNoteText('');
            return;
        }
        try {
            await updateTask(task.id, { status: newStatus as any });
            window.dispatchEvent(new CustomEvent('tasks-changed'));
            toast.success(`Task marked as ${newStatus}`);
        } catch (e) {
            console.error('Failed to toggle task:', e);
            toast.error('Failed to update task status');
        }
    };

    // Fix #14: Confirm completion with optional note
    // Fix #11: Record who completed it + Fix #23: Log to booking timeline (if we had logs on bookings, but we don't, so just update task)
    const handleConfirmCompletion = async () => {
        if (!completionNoteTask || !viewingBooking) return;
        const now = new Date().toISOString();
        const completedByName = currentUser?.name || staff.find(s => String(s.id) === String(currentUser?.id))?.name || 'Staff';
        try {
            await updateTask(completionNoteTask.id, {
                status: 'Completed',
                completedAt: now,
                completedBy: completedByName,  // Fix #11
                completionNote: completionNoteText.trim() || undefined,  // Fix #14
            });
            window.dispatchEvent(new CustomEvent('tasks-changed'));
            toast.success('Task marked complete');
        } catch (e) {
            toast.error('Failed to complete task');
        } finally {
            setCompletionNoteTask(null);
            setCompletionNoteText('');
        }
    };

    // Fix #7: Delete task
    const handleDeleteBookingTask = async (taskId: string) => {
        if (!confirm('Delete this task? This cannot be undone.')) return;
        try {
            await deleteTask(taskId);
            window.dispatchEvent(new CustomEvent('tasks-changed'));
            toast.success('Task deleted');
        } catch (e) { toast.error('Failed to delete task'); }
    };

    // Fix #8: Save inline task title edit
    const handleSaveTaskEdit = async (task: Task) => {
        if (!editingTaskTitle.trim()) return;
        try {
            await updateTask(task.id, { title: editingTaskTitle.trim() });
            setEditingTaskId(null);
            window.dispatchEvent(new CustomEvent('tasks-changed'));
            toast.success('Task updated');
        } catch (e) { toast.error('Failed to update task'); }
    };

    // Fix #12: Reassign task to different staff
    const handleReassignTask = async (taskId: string, newAssigneeId: string) => {
        try {
            await updateTask(taskId, { assignedTo: newAssigneeId });
            setReassigningTaskId(null);
            window.dispatchEvent(new CustomEvent('tasks-changed'));
            toast.success('Task reassigned');
        } catch (e) { toast.error('Failed to reassign task'); }
    };

    // Fix #16: Bulk mark all pending tasks as complete
    const handleMarkAllComplete = async () => {
        if (!viewingBooking) return;
        const bookingChecklist = tasks?.filter(t => t.relatedBookingId === viewingBooking.id) || [];
        const pending = bookingChecklist.filter(t => t.status !== 'Completed');
        if (!pending.length) return;
        const completedByName = currentUser?.name || 'Staff';
        const now = new Date().toISOString();
        for (const task of pending) {
            try { await updateTask(task.id, { status: 'Completed', completedAt: now, completedBy: completedByName }); } catch {}
        }
        window.dispatchEvent(new CustomEvent('tasks-changed'));
        toast.success(`${pending.length} tasks marked complete`);
    };

    // Fix #16: Clear all completed tasks
    const handleClearCompleted = async () => {
        const bookingChecklist = tasks?.filter(t => t.relatedBookingId === viewingBooking.id) || [];
        const completed = bookingChecklist.filter(t => t.status === 'Completed');
        if (!completed.length) return;
        if (!confirm(`Delete ${completed.length} completed task(s)?`)) return;
        for (const task of completed) {
            try { await deleteTask(task.id); } catch {}
        }
        window.dispatchEvent(new CustomEvent('tasks-changed'));
        toast.success('Completed tasks cleared');
    };

    const handleSendStaffMessageFromBooking = async (e: React.FormEvent, leadId: string) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const messageText = chatInput.trim();
        setChatInput('');

        try {
            await api.sendStaffLeadMessage(leadId, messageText);
            await refreshData();
            toast.success('Message sent to partner');
        } catch (err: any) {
            toast.error(err.message || 'Failed to send message');
        }
    };

    const today = new Date().toISOString().split('T')[0];

    // Form State
    const [formData, setFormData] = useState({
        id: '',
        customerId: '',
        customer: '',
        email: '',
        phone: '',
        type: 'Tour' as BookingType,
        title: '',
        date: today,
        amount: '' as string | number,
        status: BookingStatus.PENDING,
        payment: 'Unpaid',
        packageId: '',
        guests: '2 Adults, 0 Children',
        endDate: today,
        details: '',
        whatsapp: '',
        isWhatsappSame: true,
        altPhone: '',
        paxAdult: 2,
        paxInfant: 0,
        serviceType: 'Full package',
        residentialAddress: '',
        officeAddress: ''
    });

    // Guest State
    const [guestCounts, setGuestCounts] = useState({ adults: 2, children: 0, infants: 0 });

    // Sync guestCounts to formData.guests
    useEffect(() => {
        const guestsStr = `${guestCounts.adults} Adults, ${guestCounts.children} Children${guestCounts.infants > 0 ? `, ${guestCounts.infants} Infants` : ''}`;
        setFormData(prev => {
            let updatedAmount = prev.amount;
            if (prev.packageId && !isEditMode) {
                const selectedPkg = packages.find(p => p.id === prev.packageId);
                if (selectedPkg) {
                    const isGroup = (selectedPkg.pricingMode || 'group') === 'group';
                    const adults = guestCounts.adults;
                    const children = guestCounts.children;
                    if (isGroup) {
                        const rooms = Math.ceil(adults / 2);
                        const adultCost = rooms * selectedPkg.price;
                        const childCost = children * Math.round((selectedPkg.price / 2) * 0.85);
                        updatedAmount = Math.round(adultCost + childCost);
                    } else {
                        const adultCost = adults * selectedPkg.price;
                        const childCost = children * Math.round(selectedPkg.price * 0.85);
                        updatedAmount = Math.round(adultCost + childCost);
                    }
                }
            }
            return { 
                ...prev, 
                guests: guestsStr,
                paxAdult: guestCounts.adults,
                paxInfant: guestCounts.infants,
                amount: (prev.packageId && !isEditMode) ? updatedAmount : prev.amount
            };
        });
    }, [guestCounts, packages, isEditMode]);

    // Sync formData.guests to guestCounts (when editing)
    useEffect(() => {
        if (isEditMode && formData.guests) {
            const parts = formData.guests.split(',');
            let a = 2, c = 0, inf = 0;
            parts.forEach(p => {
                if (p.toLowerCase().includes('adult')) a = parseInt(p) || 2;
                if (p.toLowerCase().includes('child')) c = parseInt(p) || 0;
                if (p.toLowerCase().includes('infant')) inf = parseInt(p) || 0;
            });
            setGuestCounts({ adults: a, children: c, infants: inf });
        }
    }, [isEditMode, formData.guests]);



    // Check for navigation state from Leads page
    useEffect(() => {
        if (location.state && location.state.prefill && !isModalOpen) {
            const prefill = location.state.prefill;
            setFormData(prev => ({
                ...prev,
                id: '', // Reset ID for new booking
                customerId: '', // Lead might not match a customer yet
                customer: prefill.customer || '',
                email: prefill.email || '',
                phone: prefill.phone || '',
                amount: prefill.amount || '',
                details: prefill.details || '',
                guests: prefill.guests || '2 Adults',
                type: 'Tour', // Defaulting to Tour for converted leads
                title: `Booking for ${prefill.customer}`,
                status: BookingStatus.PENDING
            }));
            setIsEditMode(false);
            setIsModalOpen(true);
            // Clean up location state to prevent re-triggering (optional but good practice)
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Check for query params (e.g. from Dashboard)
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const statusParam = searchParams.get('status');
        if (statusParam) {
            // Find matching status enum logic - simple string match for now
            // Assuming statusParam matches the enum values (Pending, Confirmed, etc.)
            setActiveTab(statusParam);
        }
        const filterParam = searchParams.get('filter');
        if (filterParam === 'unpaid') {
            setSearch('unpaid');
        }
        const searchParam = searchParams.get('search');
        if (searchParam) {
            setSearch(searchParam);
        }
    }, [location.search]);

    // Handle deep linking for specific booking detail modal
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const idParam = searchParams.get('id');
        if (idParam && bookings.length > 0) {
            const foundBooking = bookings.find(b => String(b.id) === String(idParam) || String(b.bookingNumber) === String(idParam));
            if (foundBooking) {
                setViewingBookingId(foundBooking.id);
            }
        }
    }, [location.search, bookings]);

    // --- Handlers ---

    const handleAddNote = (e: React.FormEvent, bookingId: string) => {
        e.preventDefault();
        if (!noteText.trim()) return;
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking) return;

        const newNote: BookingNote = {
            id: `NOTE-${Date.now()}`,
            text: noteText,
            date: new Date().toISOString(),
            author: currentUser?.name || 'System'
        };
        const existingNotes = booking.notes || [];
        updateBooking(bookingId, { notes: [newNote, ...existingNotes] }, true);
        setNoteText('');
        toast.success('Note added');
    };

    const handleDeleteNote = (bookingId: string, noteId: string) => {
        if (!confirm('Delete this note?')) return;
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking) return;

        const updatedNotes = (booking.notes || []).filter(n => n.id !== noteId);
        updateBooking(bookingId, { notes: updatedNotes }, true);
        toast.success('Note deleted');
    };

    const handleUpdateNote = (bookingId: string, noteId: string) => {
        if (!editNoteText.trim()) return;
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking) return;

        const updatedNotes = (booking.notes || []).map(n =>
            n.id === noteId ? { ...n, text: editNoteText } : n
        );
        updateBooking(bookingId, { notes: updatedNotes }, true);
        setEditingNoteId(null);
        setEditNoteText('');
        toast.success('Note updated');
    };

    const openCreateModal = () => {
        setIsEditMode(false);
        setFormData({
            id: '',
            customerId: '',
            customer: '',
            email: '',
            phone: '',
            type: 'Tour',
            title: '',
            date: today,
            amount: '',
            status: BookingStatus.PENDING,
            payment: 'Unpaid',
            packageId: '',
            guests: '2 Adults',
            endDate: today,
            details: '',
            whatsapp: '',
            isWhatsappSame: true,
            altPhone: '',
            paxAdult: 2,
            paxInfant: 0,
            serviceType: 'Full package',
            residentialAddress: '',
            officeAddress: ''
        });
        setGuestCounts({ adults: 2, children: 0, infants: 0 });
        setIsModalOpen(true);
    };

    const openEditModal = (booking: Booking) => {
        setIsEditMode(true);
        setFormData({
            id: booking.id,
            customerId: booking.customerId || '',
            customer: booking.customer,
            email: booking.email,
            phone: booking.phone || '',
            type: booking.type,
            title: booking.title,
            date: booking.date,
            amount: booking.amount,
            status: booking.status,
            payment: booking.payment as string,
            packageId: booking.packageId || '',
            guests: booking.guests || '2 Adults',
            endDate: booking.endDate || booking.date,
            details: booking.details || '',
            whatsapp: booking.whatsapp || '',
            isWhatsappSame: booking.isWhatsappSame !== undefined ? booking.isWhatsappSame : true,
            altPhone: booking.altPhone || '',
            paxAdult: booking.paxAdult || 2,
            paxInfant: booking.paxInfant || 0,
            serviceType: booking.serviceType || 'Full package',
            residentialAddress: booking.residentialAddress || '',
            officeAddress: booking.officeAddress || ''
        });

        const parts = (booking.guests || '2 Adults').split(',');
        let a = 2, c = 0, inf = 0;
        parts.forEach(p => {
            if (p.toLowerCase().includes('adult')) a = parseInt(p) || 2;
            if (p.toLowerCase().includes('child')) c = parseInt(p) || 0;
            if (p.toLowerCase().includes('infant')) inf = parseInt(p) || 0;
        });
        setGuestCounts({ adults: a, children: c, infants: inf });

        setIsModalOpen(true);
    };

    const handlePackageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const pkgId = e.target.value;
        const selectedPkg = packages.find(p => p.id === pkgId);
        
        let calculatedEndDate = formData.date;
        if (selectedPkg && selectedPkg.days) {
            const startDate = new Date(formData.date);
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + (selectedPkg.days - 1));
            calculatedEndDate = endDate.toISOString().split('T')[0];
        }

        let calculatedAmount = formData.amount;
        if (selectedPkg) {
            const isGroup = (selectedPkg.pricingMode || 'group') === 'group';
            const adults = guestCounts.adults || 2;
            const children = guestCounts.children || 0;
            if (isGroup) {
                // assume double sharing (capacity = 2) for group default
                const rooms = Math.ceil(adults / 2);
                const adultCost = rooms * selectedPkg.price;
                const childCost = children * Math.round((selectedPkg.price / 2) * 0.85);
                calculatedAmount = Math.round(adultCost + childCost);
            } else {
                const adultCost = adults * selectedPkg.price;
                const childCost = children * Math.round(selectedPkg.price * 0.85);
                calculatedAmount = Math.round(adultCost + childCost);
            }
        }

        setFormData(prev => ({
            ...prev,
            packageId: pkgId,
            title: selectedPkg ? selectedPkg.title : '',
            amount: selectedPkg ? calculatedAmount : prev.amount,
            endDate: calculatedEndDate
        }));
    };

    const handleCustomerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const custId = e.target.value;
        const cust = customers.find(c => c.id === custId);
        if (cust) {
            setFormData(prev => ({
                ...prev,
                customerId: cust.id,
                customer: cust.name,
                email: cust.email,
                phone: cust.phone
            }));
        } else {
            // Reset if cleared? Or just allow manual?
            // If manual entry handling is needed, we need a way to switch or use a combobox.
            // For now, let's keep it simple: Select OR Type (if we add a toggle, but user asked for search dropdown).
            // Given limitations, maybe just a select for existing customers and "New Customer" option?
            // Let's stick to Select for now as requested.
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (Number(formData.amount) <= 0) {
            toast.error("Amount must be greater than zero");
            return;
        }

        if (!formData.customer || !formData.date) {
            toast.error("Customer Name and Date are required");
            return;
        }

        const bookingData: Partial<Booking> = {
            type: formData.type,
            customerId: formData.customerId,
            customer: formData.customer,
            email: formData.email,
            phone: formData.phone,
            packageId: formData.packageId,
            title: formData.title || `${formData.type} Booking`,
            date: formData.date,
            endDate: formData.endDate,
            amount: Number(formData.amount) || 0,
            status: formData.status,
            payment: formData.payment as any,
            guests: formData.guests,
            details: formData.details,
            whatsapp: formData.isWhatsappSame ? formData.phone : formData.whatsapp,
            isWhatsappSame: formData.isWhatsappSame,
            altPhone: formData.altPhone,
            paxAdult: Number(formData.paxAdult) || guestCounts.adults,
            paxInfant: Number(formData.paxInfant) || guestCounts.infants,
            serviceType: formData.serviceType,
            residentialAddress: formData.residentialAddress,
            officeAddress: formData.officeAddress
        };

        if (isEditMode && formData.id) {
            updateBooking(formData.id, bookingData);
        } else {
            const newBooking: Booking = {
                id: '', // Will be set by DB (UUID auto-generated)
                assignedTo: currentUser?.id,
                ...bookingData as any // safely cast for new object
            };
            addBooking(newBooking);
        }

        setIsModalOpen(false);
    };

    const handleExport = () => {
        const columns: ExportColumn<Booking>[] = [
            { header: 'ID', key: 'id', width: 25 },
            { header: 'Customer', key: 'customer', width: 30 },
            { header: 'Email', key: 'email', width: 35 },
            { header: 'Phone', key: 'phone', width: 20 },
            { header: 'Type', key: 'type', width: 15 },
            { header: 'Title', key: 'title', width: 40 },
            { header: 'Start Date', key: 'date', width: 15 },
            { header: 'End Date', key: 'endDate', width: 15 },
            { header: 'Amount (INR)', key: 'amount', width: 20 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Payment', key: 'payment', width: 15 }
        ];

        exportToExcel(filteredBookings, columns, {
            filename: `Bookings_Export_${today}`,
            sheetName: 'Bookings',
            title: 'SHRAWELLO Travel Hub - Bookings Report',
            subtitle: `Generated on: ${new Date().toLocaleDateString('en-IN')}`
        });
    };

    // --- Actions Logic ---

    const handleCancelBooking = (id: string) => {
        if (confirm("Are you sure you want to cancel this booking? This action will set the status to 'Cancelled'.")) {
            updateBooking(id, { status: BookingStatus.CANCELLED });
        }
    };

    const handleProcessRefund = (id: string) => {
        if (confirm("Process refund for this booking? This will mark the payment as 'Refunded'.")) {
            updateBooking(id, { payment: 'Refunded' });
            setIsModalOpen(false); // Close modal if open
        }
    };

    const handleGenerateInvoice = (booking: Booking) => {
        navigate(`/admin/invoices/new?booking_id=${booking.id}&type=Invoice`);
    };

    // --- Filters ---

    const filteredBookings = bookings.filter(b => {
        const isOngoing = b.status === BookingStatus.CONFIRMED && today >= b.date && today <= (b.endDate || b.date);
        
        const matchesTab = activeTab === 'All' || 
                         (activeTab === 'Ongoing' ? isOngoing : b.status === activeTab);
                         
        const matchesSearch = b.customer.toLowerCase().includes(search.toLowerCase()) ||
            b.id.toLowerCase().includes(search.toLowerCase()) ||
            (b.bookingNumber ? `BK-${String(b.bookingNumber).padStart(4, '0')}`.toLowerCase().includes(search.toLowerCase()) : false) ||
            b.title.toLowerCase().includes(search.toLowerCase()) ||
            (b.payment && b.payment.toLowerCase() === search.toLowerCase());

        // Permission Filter
        const isRestricted = currentUser?.queryScope === 'Show Assigned Query Only';
        const matchesAssignment = !isRestricted || b.assignedTo === currentUser?.id;

        return matchesTab && matchesSearch && matchesAssignment;
    });

    // Pagination for bookings list
    const { currentPage, setCurrentPage, itemsPerPage, setItemsPerPage, paginateData } = usePagination(filteredBookings.length, 15);
    const paginatedBookings = paginateData<Booking>(filteredBookings);

    // --- Helpers ---

    const getStatusColor = (status: string) => {
        switch (status) {
            case BookingStatus.CONFIRMED: return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
            case BookingStatus.PENDING: return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
            case BookingStatus.CANCELLED: return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
            case BookingStatus.COMPLETED: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'Car': return 'directions_car';
            case 'Bus': return 'directions_bus';
            case 'Hotel': return 'hotel';
            case 'Tour': return 'travel_explore';
            case 'Train': return 'train';
            case 'Flight': return 'flight_takeoff';
            default: return 'confirmation_number';
        }
    };
    // All tasks for progress calculation
    const allBookingTasks = useMemo(() => {
        if (!viewingBooking) return [];
        let items = (tasks || []).filter(t => t.relatedBookingId === viewingBooking.id && t.category === 'checklist');
        const todayStr = new Date().toISOString().split('T')[0];
        return items.map(t => {
            if (t.status !== 'Completed' && t.dueDate && t.dueDate < todayStr) {
                return { ...t, status: 'Overdue' as any };
            }
            return t;
        });
    }, [tasks, viewingBooking]);

    const bookingChecklist = useMemo(() => {
        let items = [...allBookingTasks];

        // Filter by owner
        if (showOnlyMine && currentUser) {
            items = items.filter(t => String(t.assignedTo) === String(currentUser.id));
        }

        // Filter by state
        if (taskFilter === 'pending') {
            items = items.filter(t => t.status === 'Pending');
        } else if (taskFilter === 'inprogress') {
            items = items.filter(t => t.status === 'In Progress');
        } else if (taskFilter === 'completed') {
            items = items.filter(t => t.status === 'Completed');
        } else if (taskFilter === 'overdue') {
            items = items.filter(t => t.status === 'Overdue');
        }

        return items;
    }, [allBookingTasks, taskFilter, showOnlyMine, currentUser]);

    const completedBookingCount = allBookingTasks.filter(t => t.status === 'Completed').length;
    const bookingChecklistProgress = allBookingTasks.length > 0 ? Math.round((completedBookingCount / allBookingTasks.length) * 100) : 0;

    // Toggle handler removed - using handleToggleTask instead

    return (
        <div className="flex flex-col h-full admin-page-bg relative">

            {/* ── Smart Suggestion Banners for Bookings ── */}
            {(() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const tomorrowStr = tomorrow.toISOString().split('T')[0];
                const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString().split('T')[0];

                // #1: Bookings with no supplier attached
                const noSupplierBookings = bookings.filter(b =>
                    b.status !== 'Cancelled' && b.status !== 'Completed' &&
                    (!(b as any).supplierBookings || (b as any).supplierBookings?.length === 0)
                );
                // #2: Bookings departing tomorrow
                const tomorrowDepartures = bookings.filter(b => b.date === tomorrowStr && b.status === 'Confirmed');
                // #3: Bookings stuck in Pending for 3+ days
                const stuckPending = bookings.filter(b => b.status === 'Pending' && b.date <= threeDaysAgo);
                // #4: Confirmed bookings with no notes
                const noItinerary = bookings.filter(b => b.status === 'Confirmed' && !b.details);

                return (
                    <div className="px-6 pt-3 space-y-2">
                        {noSupplierBookings.length > 0 && !isDismissed('bookings-no-supplier') && !isSnoozed('bookings-no-supplier') && (
                            <SuggestPopup
                                id="bookings-no-supplier"
                                variant="banner"
                                icon="inventory"
                                color="amber"
                                title={`${noSupplierBookings.length} booking${noSupplierBookings.length > 1 ? 's' : ''} have no supplier attached!`}
                                description="Missing suppliers means hotel & transport are unconfirmed. Add supplier details to avoid last-minute issues."
                                primaryAction={{ label: 'Manage Suppliers', icon: 'add_business', onClick: () => navigate('/admin/vendors') }}
                                snoozeMinutes={60 * 6}
                            />
                        )}
                        {tomorrowDepartures.length > 0 && !isDismissed(`bookings-tomorrow-${tomorrowStr}`) && !isSnoozed(`bookings-tomorrow-${tomorrowStr}`) && (
                            <SuggestPopup
                                id={`bookings-tomorrow-${tomorrowStr}`}
                                variant="banner"
                                icon="flight_takeoff"
                                color="blue"
                                title={`${tomorrowDepartures.length} booking${tomorrowDepartures.length > 1 ? 's' : ''} depart${tomorrowDepartures.length === 1 ? 's' : ''} tomorrow!`}
                                description={`Confirm vehicle, driver, and hotel are ready. Ensure itineraries are shared with customers.`}
                                primaryAction={{ label: 'Review Bookings', icon: 'checklist', onClick: () => navigate('/admin/bookings') }}
                                snoozeMinutes={60 * 2}
                            />
                        )}
                        {stuckPending.length >= 5 && !isDismissed('bookings-stuck-pending') && !isSnoozed('bookings-stuck-pending') && (
                            <SuggestPopup
                                id="bookings-stuck-pending"
                                variant="banner"
                                icon="pending_actions"
                                color="red"
                                title={`${stuckPending.length} bookings stuck in Pending for 3+ days!`}
                                description="Review and advance these bookings — customers may be waiting for confirmation."
                                primaryAction={{ label: 'Filter Pending', icon: 'filter_list', onClick: () => navigate('/admin/bookings?status=Pending') }}
                                snoozeMinutes={60 * 24}
                            />
                        )}
                        {noItinerary.length > 0 && !isDismissed('bookings-no-itinerary') && !isSnoozed('bookings-no-itinerary') && (
                            <SuggestPopup
                                id="bookings-no-itinerary"
                                variant="banner"
                                icon="map"
                                color="indigo"
                                title={`${noItinerary.length} confirmed booking${noItinerary.length > 1 ? 's' : ''} have no itinerary notes!`}
                                description="Add notes and itinerary details so customers and drivers know the plan."
                                primaryAction={{ label: 'Itinerary Builder', icon: 'edit_road', onClick: () => navigate('/admin/itinerary-builder') }}
                                snoozeMinutes={60 * 8}
                            />
                        )}
                    </div>
                );
            })()}

            {/* Booking Detail View Modal */}
            {viewingBooking && (() => {
                const startD = viewingBooking.date ? new Date(viewingBooking.date) : null;
                const endD = viewingBooking.endDate ? new Date(viewingBooking.endDate) : startD;
                const durationDays = startD && endD ? Math.max(1, Math.round((endD.getTime() - startD.getTime()) / 86400000) + 1) : null;
                // Derive payment totals from actual transaction records — Verified txs only
                // (same logic as LedgerManagementModal and api.getBookings dynamicPayment)
                const viewTxs = viewingBooking.transactions || [];
                const viewVerifiedPayments = viewTxs.filter(t => t.type === 'Payment' && t.status === 'Verified');
                const viewVerifiedRefunds  = viewTxs.filter(t => t.type === 'Refund'  && t.status === 'Verified');
                const viewPendingPayments  = viewTxs.filter(t => t.type === 'Payment' && t.status === 'Pending');
                const amountPaid      = viewVerifiedPayments.reduce((s, t) => s + t.amount, 0) - viewVerifiedRefunds.reduce((s, t) => s + t.amount, 0);
                const pendingAmount   = viewPendingPayments.reduce((s, t) => s + t.amount, 0);
                const balanceDue      = viewingBooking.amount - amountPaid;
                // Derive live payment status from verified amounts (don't trust stale DB value)
                const livePaymentStatus =
                    viewingBooking.amount > 0 && amountPaid >= viewingBooking.amount ? 'Paid'
                    : amountPaid > 0 ? 'Deposit'
                    : amountPaid < 0 ? 'Refunded'
                    : 'Unpaid';
                const linkedPkg = packages.find(p => p.id === viewingBooking.packageId);
                return (
                <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setViewingBookingId(null)}>
                    <div className="bg-white dark:bg-[#1A2633] w-full max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 h-[95vh] sm:h-auto sm:max-h-[92vh]" onClick={e => e.stopPropagation()}>

                        {/* ── Header ── */}
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/60 dark:to-[#1A2633]">
                            <div className="flex items-start gap-3">
                                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="material-symbols-outlined text-primary text-[22px]">confirmation_number</span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">{viewingBooking.bookingNumber ? `BK-${String(viewingBooking.bookingNumber).padStart(4, '0')}` : viewingBooking.id.substring(0, 12)}</p>
                                        {viewingBooking.invoiceNo && (
                                            <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded">INV# {viewingBooking.invoiceNo}</span>
                                        )}
                                    </div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-snug mt-0.5">{viewingBooking.title || 'Booking Details'}</h2>
                                    {viewingBooking.partnerId && (
                                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                            <span className="inline-flex items-center text-[9px] font-black px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border border-violet-200/50 uppercase tracking-wider">Partner Referral</span>
                                            <span className="text-xs text-slate-500 font-medium">
                                                by {viewingBooking.partnerName || 'Independent'} {viewingBooking.partnerCompanyName ? `(${viewingBooking.partnerCompanyName})` : ''}
                                            </span>
                                        </div>
                                    )}
                                    {linkedPkg && (
                                        <p className="text-xs text-primary font-semibold mt-0.5 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[13px]">book_online</span>
                                            {linkedPkg.title}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(viewingBooking.status)}`}>
                                    <span className="size-1.5 rounded-full bg-current"></span>
                                    {viewingBooking.status}
                                </span>
                                <button onClick={() => setViewingBookingId(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-4 px-6 mt-1 border-b border-slate-100 dark:border-slate-850 pb-2">
                            <button
                                onClick={() => setBookingModalTab('info')}
                                className={`text-xs font-bold pb-1 transition-all ${
                                    bookingModalTab === 'info'
                                        ? 'text-primary border-b-2 border-primary'
                                        : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                Details & Logs
                            </button>
                            <button
                                onClick={() => setBookingModalTab('checklist')}
                                className={`text-xs font-bold pb-1 transition-all flex items-center gap-1.5 ${
                                    bookingModalTab === 'checklist'
                                        ? 'text-primary border-b-2 border-primary'
                                        : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[16px]">playlist_add_check</span>
                                Operations Checklist
                            </button>
                            {viewingBooking.partnerId && (
                                <button
                                    onClick={() => setBookingModalTab('chat')}
                                    className={`text-xs font-bold pb-1 transition-all flex items-center gap-1.5 ${
                                        bookingModalTab === 'chat'
                                            ? 'text-primary border-b-2 border-primary'
                                            : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[16px]">forum</span>
                                    Partner Chat
                                </button>
                            )}
                        </div>

                        {/* ── Quick Stats Bar ── */}
                        <div className="grid grid-cols-4 divide-x divide-slate-100 dark:divide-slate-700 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20">
                            <div className="px-4 py-3 text-center">
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Type</p>
                                <div className="flex items-center justify-center gap-1">
                                    <span className="material-symbols-outlined text-[14px] text-primary">{getTypeIcon(viewingBooking.type)}</span>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{viewingBooking.type}</p>
                                </div>
                            </div>
                            <div className="px-4 py-3 text-center">
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Guests</p>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{viewingBooking.guests || '—'}</p>
                            </div>
                            <div className="px-4 py-3 text-center">
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Duration</p>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{durationDays ? `${durationDays}N` : '—'}</p>
                            </div>
                            <div className="px-4 py-3 text-center">
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Amount</p>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatPrice(Number(viewingBooking.amount))}</p>
                            </div>
                        </div>

                        {/* ── Scrollable Body ── */}
                        <div className={`p-6 ${bookingModalTab === 'chat' ? 'flex flex-col h-[55vh]' : 'overflow-y-auto space-y-5'}`}>
                            {bookingModalTab === 'chat' ? (
                                (() => {
                                    const relatedLead = leads.find(l => 
                                        l.partnerId === viewingBooking.partnerId && 
                                        l.email?.toLowerCase() === viewingBooking.email?.toLowerCase()
                                    );
                                    if (!relatedLead) {
                                        return (
                                            <div className="flex-grow flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-3 py-12 text-center">
                                                <span className="material-symbols-outlined text-4xl text-slate-350 dark:text-slate-600">info</span>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Associated Lead Found</p>
                                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm px-6">
                                                        We couldn't locate a partner referral lead matching this customer's email (<strong>{viewingBooking.email}</strong>). Please verify the customer details or partner assignment.
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="flex flex-col h-full justify-between gap-4">
                                            {/* Chat History Container */}
                                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                                                {relatedLead.logs && relatedLead.logs.filter(log => log.type === 'Chat').length > 0 ? (
                                                    [...relatedLead.logs]
                                                        .filter(log => log.type === 'Chat')
                                                        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                                                        .map(log => {
                                                            const isStaff = log.sender === 'Admin' || staff.some(s => s.name === log.sender) || log.sender === currentUser?.email;
                                                            return (
                                                                <div key={log.id} className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}>
                                                                    <div className="flex items-center gap-1.5 mb-1 px-1">
                                                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                                                                            {log.sender || 'System'}
                                                                        </span>
                                                                        <span className="text-[9px] text-slate-400 dark:text-slate-500">
                                                                            • {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                    </div>
                                                                    <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm ${
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
                                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2 py-12">
                                                        <span className="material-symbols-outlined text-4xl text-slate-350 dark:text-slate-600">forum</span>
                                                        <p className="text-xs italic font-medium">No messages exchanged yet. Start chatting with the partner.</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Chat Input Bar */}
                                            <form onSubmit={(e) => handleSendStaffMessageFromBooking(e, relatedLead.id)} className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={chatInput}
                                                    onChange={e => setChatInput(e.target.value)}
                                                    placeholder="Type a message to the partner..."
                                                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={!chatInput.trim()}
                                                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-md shadow-primary/10 disabled:opacity-50"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">send</span>
                                                    Send
                                                </button>
                                            </form>
                                        </div>
                                    );
                                })()
                            ) : bookingModalTab === 'checklist' ? (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 pb-6">
                                    {/* Playbook Progress Card */}
                                    <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/60 dark:to-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                    Operations playbook
                                                </span>
                                                <span className="text-xs text-slate-400 font-bold">•</span>
                                                <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                    {viewingBooking.type} Booking
                                                </span>
                                            </div>
                                            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                                                Checklist Tasks Playbook
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="text-right">
                                                <p className="text-[9px] text-slate-405 dark:text-slate-500 font-black uppercase tracking-wider">Completion</p>
                                                <p className="text-xs font-black text-slate-800 dark:text-white">
                                                    {completedBookingCount}/{allBookingTasks.length} ({bookingChecklistProgress}%)
                                                </p>
                                            </div>
                                            <div className="w-24 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                                <div
                                                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${bookingChecklistProgress}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Predefined Playbook Template Loader */}
                                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="size-9 rounded-lg bg-emerald-550/10 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-500 shrink-0">
                                                <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-105">Load Template Checklist</p>
                                                <p className="text-[10px] text-slate-400">Add predefined checklists based on Service Types or Stages</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <select
                                                value={selectedPredefinedPlaybookType}
                                                onChange={e => setSelectedPredefinedPlaybookType(e.target.value)}
                                                className="flex-1 sm:flex-none bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-700 dark:text-slate-355 outline-none w-full sm:w-44 focus:ring-2 focus:ring-primary/20"
                                            >
                                                <optgroup label="Service Types">
                                                    {playbookKeys.bookingTypes.map(t => (
                                                        <option key={t} value={t}>{t === 'Car' ? 'Cab (Car)' : t} Playbook</option>
                                                    ))}
                                                </optgroup>
                                                <optgroup label="Lead Stages">
                                                    {playbookKeys.leadStages.map(s => (
                                                        <option key={s} value={s}>{s} Playbook</option>
                                                    ))}
                                                </optgroup>
                                            </select>
                                            <button
                                                type="button"
                                                onClick={handleGenerateBookingPlaybook}
                                                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-700 dark:hover:bg-slate-650 rounded-xl text-xs font-black shadow-sm transition-all"
                                            >
                                                Load
                                            </button>
                                        </div>
                                    </div>

                                    {/* Task Filtering, Toggle Custom Form, and Bulk Action Controls */}
                                    <div className="flex flex-col gap-3 bg-slate-50/50 dark:bg-slate-900/20 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            {/* Filters */}
                                            <div className="flex flex-wrap items-center gap-1">
                                                {(['all', 'pending', 'inprogress', 'completed', 'overdue'] as const).map((filter) => {
                                                    const count = filter === 'all' ? allBookingTasks.length
                                                        : filter === 'pending' ? allBookingTasks.filter(t => t.status === 'Pending').length
                                                        : filter === 'inprogress' ? allBookingTasks.filter(t => t.status === 'In Progress').length
                                                        : filter === 'completed' ? allBookingTasks.filter(t => t.status === 'Completed').length
                                                        : allBookingTasks.filter(t => t.status === 'Overdue').length;

                                                    return (
                                                        <button
                                                            key={filter}
                                                            type="button"
                                                            onClick={() => setTaskFilter(filter)}
                                                            className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                                                taskFilter === filter
                                                                    ? 'bg-primary text-white shadow-sm'
                                                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-305 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                            }`}
                                                        >
                                                            {filter === 'all' ? 'All' : filter === 'inprogress' ? 'In Progress' : filter}
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${taskFilter === filter ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                                                                {count}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Action Toggles */}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowOnlyMine(prev => !prev)}
                                                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 ${
                                                        showOnlyMine
                                                            ? 'bg-violet-500/10 text-violet-600 border-violet-250 dark:text-violet-400 dark:border-violet-850'
                                                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">person</span>
                                                    Assigned to me
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setShowManualTaskForm(p => !p)}
                                                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 ${
                                                        showManualTaskForm
                                                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-55'
                                                    }`}
                                                >
                                                    <Plus size={13} />
                                                    Add Task
                                                </button>
                                            </div>
                                        </div>

                                        {/* Bulk Actions */}
                                        <div className="flex items-center justify-between border-t border-slate-200/50 dark:border-slate-800 pt-2.5 mt-0.5 text-xs text-slate-500">
                                            <span>Actions:</span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleMarkAllComplete}
                                                    className="text-[10px] font-black text-slate-600 dark:text-slate-355 hover:text-emerald-500 uppercase tracking-widest flex items-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-[13px]">done_all</span> Mark All Complete
                                                </button>
                                                <span className="text-slate-300 dark:text-slate-700">|</span>
                                                <button
                                                    type="button"
                                                    onClick={handleClearCompleted}
                                                    className="text-[10px] font-black text-slate-600 dark:text-slate-355 hover:text-red-500 uppercase tracking-widest flex items-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-[13px]">delete_sweep</span> Clear Completed
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Collapsible Add Custom Checklist Task Form */}
                                    {showManualTaskForm && (
                                        <form onSubmit={handleAddManualBookingTask} className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-4 shadow-md animate-in slide-in-from-top-3 duration-250">
                                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                                                <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-primary text-[16px]">edit_note</span>
                                                    Add Custom Checklist Task
                                                </h4>
                                                <button type="button" onClick={() => setShowManualTaskForm(false)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                                <div className="md:col-span-2">
                                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Task Title</label>
                                                    <input
                                                        type="text"
                                                        value={manualTaskTitle}
                                                        onChange={e => setManualTaskTitle(e.target.value)}
                                                        placeholder="e.g. Call customer for flight preference..."
                                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20"
                                                        required
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Due Date</label>
                                                    <input
                                                        type="date"
                                                        value={manualTaskDueDate}
                                                        onChange={e => setManualTaskDueDate(e.target.value)}
                                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-705 dark:text-slate-350 outline-none focus:ring-2 focus:ring-primary/20"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Priority</label>
                                                    <select
                                                        value={manualTaskPriority}
                                                        onChange={e => setManualTaskPriority(e.target.value as any)}
                                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-extrabold text-slate-705 dark:text-slate-355 outline-none focus:ring-2 focus:ring-primary/20"
                                                    >
                                                        <option value="Low">Low</option>
                                                        <option value="Medium">Medium</option>
                                                        <option value="High">High</option>
                                                        <option value="Urgent">Urgent</option>
                                                    </select>
                                                </div>

                                                <div className="md:col-span-2">
                                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Assign To Staff</label>
                                                    <select
                                                        value={manualTaskAssignee}
                                                        onChange={e => setManualTaskAssignee(e.target.value)}
                                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-extrabold text-slate-705 dark:text-slate-355 outline-none focus:ring-2 focus:ring-primary/20"
                                                    >
                                                        <option value="">Select Assignee (Default: Booking Owner)</option>
                                                        {staff.map(s => (
                                                            <option key={s.id} value={s.id}>{s.name} ({s.role || 'Staff'})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowManualTaskForm(false)}
                                                    className="px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-505 hover:bg-slate-100 rounded-xl transition-all"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-[15px]">add</span> Add Checklist Task
                                                </button>
                                            </div>
                                        </form>
                                    )}

                                    {/* Operations Checklist Items List */}
                                    <div className="space-y-3">
                                        {bookingChecklist.length > 0 ? (
                                            bookingChecklist.map((task) => {
                                                const isCompleted = task.status === 'Completed';
                                                const isOverdue = task.status === 'Overdue';
                                                const isInProgress = task.status === 'In Progress';

                                                // Color schema based on priority
                                                const priorityColors = {
                                                    Urgent: 'bg-red-500 text-white dark:bg-red-950 dark:text-red-300 border-red-400/20',
                                                    High: 'bg-orange-500 text-white dark:bg-orange-950 dark:text-orange-300 border-orange-400/20',
                                                    Medium: 'bg-blue-500 text-white dark:bg-blue-950 dark:text-blue-300 border-blue-400/20',
                                                    Low: 'bg-slate-500 text-white dark:bg-slate-900 dark:text-slate-400 border-slate-700/20'
                                                }[task.priority || 'Medium'];

                                                const isEditing = editingTaskId === task.id;

                                                return (
                                                    <div
                                                        key={task.id}
                                                        className={`group p-4 rounded-2xl border transition-all duration-200 flex flex-col gap-3 relative select-none ${
                                                            isCompleted
                                                                ? 'bg-slate-50/40 dark:bg-slate-900/10 border-slate-150 dark:border-slate-850 opacity-70'
                                                                : isInProgress
                                                                ? 'bg-amber-50/30 dark:bg-amber-955/5 border-amber-250 dark:border-amber-900/30'
                                                                : isOverdue
                                                                ? 'bg-red-50/30 dark:bg-red-955/5 border-red-200 dark:border-red-950/30'
                                                                : 'bg-white dark:bg-[#1E293B] border-slate-205 dark:border-slate-800 hover:border-primary/40 hover:shadow-sm'
                                                        }`}
                                                    >
                                                        {/* Top Row: Checkbox, Title, and Badges */}
                                                        <div className="flex items-start gap-3.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleTask(task)}
                                                                className="mt-0.5 shrink-0"
                                                                title={`Click to cycle status. Current: ${task.status}`}
                                                            >
                                                                <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                                                                    isCompleted
                                                                        ? 'bg-emerald-500 border-emerald-550 text-white'
                                                                        : isInProgress
                                                                        ? 'bg-amber-500 border-amber-550 text-white'
                                                                        : isOverdue
                                                                        ? 'bg-red-500 border-red-550 text-white'
                                                                        : 'border-slate-300 dark:border-slate-600 hover:border-primary'
                                                                }`}>
                                                                    {isCompleted && (
                                                                        <span className="material-symbols-outlined text-[15px] font-black">check</span>
                                                                    )}
                                                                    {isInProgress && (
                                                                        <span className="material-symbols-outlined text-[13px] font-black animate-spin duration-3000">hourglass_empty</span>
                                                                    )}
                                                                    {isOverdue && (
                                                                        <span className="material-symbols-outlined text-[13px] font-black">priority_high</span>
                                                                    )}
                                                                </div>
                                                            </button>

                                                            <div className="flex-1 min-w-0">
                                                                {isEditing ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <input
                                                                            type="text"
                                                                            value={editingTaskTitle}
                                                                            onChange={e => setEditingTaskTitle(e.target.value)}
                                                                            className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSaveTaskEdit(task)}
                                                                            className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                                                                        >
                                                                            <span className="material-symbols-outlined text-[16px]">save</span>
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setEditingTaskId(null)}
                                                                            className="p-1.5 bg-slate-105 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg hover:bg-slate-200 transition-colors"
                                                                        >
                                                                            <span className="material-symbols-outlined text-[16px]">close</span>
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <p className={`text-xs font-bold leading-snug transition-all flex items-center gap-1.5 flex-wrap ${
                                                                        isCompleted
                                                                            ? 'text-slate-400 dark:text-slate-500 line-through'
                                                                            : isOverdue
                                                                            ? 'text-red-650 dark:text-red-400'
                                                                            : 'text-slate-850 dark:text-slate-200'
                                                                    }`}>
                                                                        {task.title}
                                                                        {task.source === 'manual' && (
                                                                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-purple-500/10 text-purple-600 border border-purple-500/20 uppercase tracking-widest shrink-0">Custom</span>
                                                                        )}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            <div className="shrink-0 flex items-center gap-1.5">
                                                                <span className={`px-2 py-0.5 rounded-lg border text-[9px] font-extrabold uppercase tracking-wide shrink-0 ${priorityColors}`}>
                                                                    {task.priority || 'Medium'}
                                                                </span>

                                                                {/* Hover Actions Menu */}
                                                                {!isEditing && (
                                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 pl-2 rounded-l-lg border-l border-slate-100 dark:border-slate-800">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => { setEditingTaskId(task.id); setEditingTaskTitle(task.title); }}
                                                                            className="p-1.5 text-slate-400 hover:text-primary dark:hover:text-primary-dark hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-all"
                                                                            title="Edit Task Title"
                                                                        >
                                                                            <Edit2 size={13} />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDeleteBookingTask(task.id)}
                                                                            className="p-1.5 text-slate-405 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                                            title="Delete Task"
                                                                        >
                                                                            <Trash2 size={13} />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Task Details Row (Completion Logs, Notes, Reassignment, Due Dates) */}
                                                        <div className="flex flex-wrap items-center justify-between gap-y-2 border-t border-slate-100 dark:border-slate-800/60 pt-2.5 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                                                            {/* Due Date Info */}
                                                            <div className="flex items-center gap-1 flex-wrap">
                                                                <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                                                                <span>Due:</span>
                                                                {task.dueDate ? (
                                                                    <span className={`font-mono font-bold ${isOverdue ? 'text-red-550 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                                        {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                        {isOverdue && ' (Overdue)'}
                                                                    </span>
                                                                ) : (
                                                                    <span className="italic">No due date</span>
                                                                )}
                                                            </div>

                                                            {/* Assignee / Reassign Control */}
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="material-symbols-outlined text-[13px]">assignment_ind</span>
                                                                <span>Assigned to:</span>
                                                                {reassigningTaskId === task.id ? (
                                                                    <select
                                                                        value={task.assignedTo || ''}
                                                                        onChange={(e) => handleReassignTask(task.id, e.target.value)}
                                                                        onBlur={() => setReassigningTaskId(null)}
                                                                        autoFocus
                                                                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 text-[10px] font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-primary/20"
                                                                    >
                                                                        <option value="">Unassigned</option>
                                                                        {staff.map(s => (
                                                                            <option key={s.id} value={s.id}>{s.name}</option>
                                                                        ))}
                                                                    </select>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setReassigningTaskId(task.id)}
                                                                        className="font-bold text-slate-700 dark:text-slate-300 hover:text-primary hover:underline flex items-center gap-0.5"
                                                                        title="Click to reassign task"
                                                                    >
                                                                        {staff.find(s => String(s.id) === String(task.assignedTo))?.name || 'Unassigned'}
                                                                        <span className="material-symbols-outlined text-[10px]">edit</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Task Description if set */}
                                                        {task.description && (
                                                            <p className="text-[10px] text-slate-400 dark:text-slate-550 leading-relaxed pl-8">
                                                                {task.description}
                                                            </p>
                                                        )}

                                                        {/* Completion Note & Audit Details if complete */}
                                                        {isCompleted && (task.completedBy || task.completionNote) && (
                                                            <div className="mt-1.5 pl-8 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850 space-y-1">
                                                                <div className="flex items-center gap-1.5 text-[9.5px] font-black uppercase text-emerald-600 dark:text-emerald-450 tracking-wider">
                                                                    <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                                                    Completed
                                                                    {task.completedBy && ` by ${task.completedBy}`}
                                                                    {task.completedAt && ` on ${new Date(task.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                                                                </div>
                                                                {task.completionNote && (
                                                                    <p className="text-[10.5px] italic text-slate-650 dark:text-slate-355 font-medium">
                                                                        Note: &ldquo;{task.completionNote}&rdquo;
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="p-10 text-center border-2 border-dashed border-slate-150 dark:border-slate-850 rounded-3xl animate-in fade-in">
                                                <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700 mb-2">assignment_late</span>
                                                <p className="text-xs font-bold text-slate-550 dark:text-slate-400">No matching checklist tasks</p>
                                                <p className="text-[10px] text-slate-405 mt-1 max-w-sm mx-auto">
                                                    There are no tasks matching the selected filter. Try changing the filter or load predefined checklist templates.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Booking Ownership / Assignee */}
                                    <div className="mb-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Booking Ownership</p>
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col gap-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-primary text-[18px]">assignment_ind</span>
                                                    <span className="text-xs font-bold text-slate-400">Assigned To:</span>
                                                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                        {viewingBooking.assignedTo ? staff.find(s => s.id === viewingBooking.assignedTo)?.name || 'Unknown' : 'Unassigned'}
                                                    </span>
                                                </div>
                                                {hasPermission('bookings', 'manage') && viewingBooking.assignedTo && (
                                                    <button
                                                        onClick={() => setIsTransferModalOpen(true)}
                                                        className="px-2 py-1 text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary rounded-lg border border-primary/20 hover:bg-primary/20 transition-all flex items-center gap-1"
                                                        title="Request Ownership Transfer"
                                                    >
                                                        <span className="material-symbols-outlined text-[12px]">move_item</span>
                                                        Transfer
                                                    </button>
                                                )}
                                            </div>
                                            {(() => {
                                                const pending = transfers.find(tr => tr.item_type === 'Booking' && tr.item_id === viewingBooking.id && tr.status === 'Pending');
                                                return pending ? (
                                                    <div className="p-2 rounded bg-amber-50 dark:bg-amber-955/20 border border-amber-250 dark:border-amber-900/50 text-[10px] text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1.5 mt-1 animate-pulse">
                                                        <span className="material-symbols-outlined text-[13px] animate-spin">sync</span>
                                                        Pending Admin approval for transfer to {pending.to_staff_name}
                                                    </div>
                                                ) : null;
                                            })()}
                                        </div>
                                    </div>

                                    {/* Customer Info */}
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Customer Information</p>
                                        <div className="flex flex-col gap-3.5 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center gap-4">
                                                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-lg shrink-0">
                                                    {viewingBooking.customer?.charAt(0)?.toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-base font-bold text-slate-900 dark:text-white">{viewingBooking.customer}</p>
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                                        <a href={`mailto:${viewingBooking.email}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[13px]">mail</span>{viewingBooking.email}
                                                        </a>
                                                        {viewingBooking.phone && (
                                                            <a href={`tel:${viewingBooking.phone}`} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-[13px]">call</span>{viewingBooking.phone}
                                                            </a>
                                                        )}
                                                        {viewingBooking.altPhone && (
                                                            <a href={`tel:${viewingBooking.altPhone}`} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-[13px]">phone_iphone</span>Alt: {viewingBooking.altPhone}
                                                            </a>
                                                        )}
                                                        {viewingBooking.whatsapp && (
                                                            <a href={`https://wa.me/${viewingBooking.whatsapp.replace(/\D/g, '')}`} target="_blank" className="text-xs text-green-600 dark:text-green-500 hover:underline flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-[13px]">chat</span>WA: {viewingBooking.whatsapp}
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                                {viewingBooking.customerId && (
                                                    <span className="text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-1 rounded-lg shrink-0">Linked Customer</span>
                                                )}
                                            </div>

                                            {(viewingBooking.residentialAddress || viewingBooking.officeAddress) && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                                    {viewingBooking.residentialAddress && (
                                                        <div className="flex items-start gap-2">
                                                            <span className="material-symbols-outlined text-primary text-[16px] mt-0.5">home</span>
                                                            <div className="min-w-0">
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase">Home Address</p>
                                                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug break-words">{viewingBooking.residentialAddress}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {viewingBooking.officeAddress && (
                                                        <div className="flex items-start gap-2">
                                                            <span className="material-symbols-outlined text-primary text-[16px] mt-0.5">business</span>
                                                            <div className="min-w-0">
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase">Work Address</p>
                                                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug break-words">{viewingBooking.officeAddress}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Trip Dates & Service Type */}
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Trip Details</p>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">flight_takeoff</span>Start Date</p>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{viewingBooking.date}</p>
                                            </div>
                                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">flight_land</span>End Date</p>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{viewingBooking.endDate || viewingBooking.date}</p>
                                            </div>
                                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">schedule</span>Duration</p>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{durationDays ? `${durationDays} Night${durationDays > 1 ? 's' : ''}` : '—'}</p>
                                            </div>
                                        </div>
                                        {viewingBooking.serviceType && (
                                            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-between animate-in fade-in duration-300">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px] text-primary">category</span>
                                                    Service Category
                                                </p>
                                                <span className="px-2.5 py-1 text-xs font-black bg-primary/10 text-primary rounded-lg uppercase tracking-wider">{viewingBooking.serviceType}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Coupon Promotion Card */}
                                    <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3.5">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 leading-none">
                                            <span className="material-symbols-outlined text-[15px] text-primary">local_offer</span>
                                            Promotion & Coupons
                                        </p>

                                        {viewingBooking.appliedCouponCode ? (
                                            <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl animate-in fade-in">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-650 dark:text-emerald-450">
                                                        <span className="material-symbols-outlined text-[20px]">verified</span>
                                                    </div>
                                                    <div>
                                                         <div className="flex items-center gap-1.5 flex-wrap">
                                                             <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{viewingBooking.appliedCouponCode}</span>
                                                             <span className="text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded uppercase">Applied</span>
                                                         </div>
                                                         <p className="text-[10px] text-slate-500 mt-0.5">Discount: <span className="font-extrabold text-slate-900 dark:text-white">₹{viewingBooking.couponDiscountAmount?.toLocaleString() || '0'}</span></p>
                                                         {viewingBooking.originalPrice && (
                                                             <p className="text-[9.5px] text-slate-400">Original price was ₹{viewingBooking.originalPrice.toLocaleString()}</p>
                                                         )}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        if (confirm(`Remove promotion code ${viewingBooking.appliedCouponCode} from this booking?`)) {
                                                            try {
                                                                await detachCoupon(viewingBooking.id);
                                                            } catch (err) {
                                                                // Handled in context
                                                            }
                                                        }
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Remove Coupon"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[18px]">password</span>
                                                        <input
                                                            type="text"
                                                            id="retro-coupon-input"
                                                            placeholder="Enter coupon code..."
                                                            className="w-full h-10 pl-9 pr-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            const input = document.getElementById('retro-coupon-input') as HTMLInputElement;
                                                            const code = input?.value?.trim()?.toUpperCase();
                                                            if (!code) {
                                                                toast.error('Please enter a coupon code');
                                                                return;
                                                            }
                                                            try {
                                                                await applyCoupon(code, viewingBooking.id);
                                                                if (input) input.value = '';
                                                            } catch (err) {
                                                                // Handled in context
                                                            }
                                                        }}
                                                        className="h-10 px-4 bg-slate-900 dark:bg-slate-800 text-white border border-slate-700 dark:border-slate-700 rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                                        Apply
                                                     </button>
                                                </div>
                                                <p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold pl-1">Apply promo code retrospectively to recalculate totals and update accounts.</p>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Financial Breakdown</p>
                                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50">
                                                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">Total Package Amount</p>
                                                <p className="text-sm font-bold text-slate-800 dark:text-white">{formatPrice(Number(viewingBooking.amount))}</p>
                                            </div>
                                            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700">
                                                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">Verified Received</p>
                                                <p className="text-sm font-bold text-green-600">{formatPrice(amountPaid)}</p>
                                            </div>
                                            {pendingAmount > 0 && (
                                                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700 bg-amber-50 dark:bg-amber-900/10">
                                                    <p className="text-sm text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[14px]">pending_actions</span>
                                                        Pending Approval
                                                    </p>
                                                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{formatPrice(pendingAmount)}</p>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-900 dark:bg-slate-950">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm text-white font-bold">Balance Due</p>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${livePaymentStatus === 'Paid' ? 'bg-green-500/20 text-green-400' : livePaymentStatus === 'Deposit' ? 'bg-yellow-500/20 text-yellow-400' : livePaymentStatus === 'Refunded' ? 'bg-purple-500/20 text-purple-300' : 'bg-red-500/20 text-red-400'}`}>{livePaymentStatus}</span>
                                                </div>
                                                <p className={`text-sm font-black ${balanceDue <= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatPrice(Math.abs(balanceDue))}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detailed Payment Transactions */}
                                    {viewTxs.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">payments</span>Payment Transactions</p>
                                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700 bg-slate-50/20 dark:bg-slate-800/10">
                                                {viewTxs.map((t: any) => (
                                                    <div key={t.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                        <div>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${t.type === 'Payment' ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'}`}>
                                                                    {t.type}
                                                                </span>
                                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{t.method}</span>
                                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${t.status === 'Verified' ? 'bg-green-50 text-green-600 dark:bg-green-900/10' : t.status === 'Pending' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/10' : 'bg-red-50 text-red-600 dark:bg-red-900/10'}`}>
                                                                    {t.status || 'Verified'}
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 font-medium mt-1">
                                                                {new Date(t.date).toLocaleDateString()} {t.reference ? `· Ref: ${t.reference}` : ''}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-3 shrink-0">
                                                            <span className={`text-xs font-black ${t.type === 'Payment' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                                                {t.type === 'Refund' ? '-' : '+'} {formatPrice(t.amount)}
                                                            </span>
                                                            {t.status !== 'Rejected' && (
                                                                <button
                                                                    onClick={() => handlePrintReceiptInBookings(t, viewingBooking)}
                                                                    disabled={printingTxId === t.id}
                                                                    title="Download Receipt"
                                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all active:scale-95 disabled:opacity-50"
                                                                >
                                                                    {printingTxId === t.id ? (
                                                                        <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                                                                    ) : (
                                                                        <span className="material-symbols-outlined text-[16px]">receipt</span>
                                                                    )}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Supplier & Transaction Summary */}
                                    {((viewingBooking.supplierBookings && viewingBooking.supplierBookings.length > 0) || (viewingBooking.transactions && viewingBooking.transactions.length > 0)) && (
                                        <div className="grid grid-cols-2 gap-3">
                                            {viewingBooking.supplierBookings && viewingBooking.supplierBookings.length > 0 && (
                                                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">inventory</span>Supplier Bookings</p>
                                                    <p className="text-lg font-black text-slate-800 dark:text-white">{viewingBooking.supplierBookings.length}</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">Linked services</p>
                                                </div>
                                            )}
                                            {viewingBooking.transactions && viewingBooking.transactions.length > 0 && (
                                                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">receipt</span>Transactions</p>
                                                    <p className="text-lg font-black text-slate-800 dark:text-white">{viewingBooking.transactions.length}</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">Payment records</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Internal Notes */}
                                    <div>
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-[14px]">sticky_note_2</span>
                                            Internal Notes
                                        </h3>

                                        <form onSubmit={(e) => handleAddNote(e, viewingBooking.id)} className="mb-4">
                                            <textarea
                                                value={noteText}
                                                onChange={e => setNoteText(e.target.value)}
                                                placeholder="Type a new internal note..."
                                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none h-20 resize-none mb-2"
                                            />
                                            <div className="flex justify-end">
                                                <button type="submit" disabled={!noteText.trim()} className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50">
                                                    Add Note
                                                </button>
                                            </div>
                                        </form>

                                        <div className="space-y-3">
                                            {/* Legacy Details string compatibility */}
                                            {viewingBooking.details && (viewingBooking.notes || []).length === 0 && (
                                                <div className="text-sm text-slate-700 dark:text-slate-300 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 leading-relaxed whitespace-pre-wrap">
                                                    {viewingBooking.details}
                                                </div>
                                            )}

                                            {!(viewingBooking.details && (viewingBooking.notes || []).length === 0) && (viewingBooking.notes || []).length === 0 && (
                                                <div className="text-sm text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center">
                                                    No notes added for this booking.
                                                </div>
                                            )}

                                            {(viewingBooking.notes || []).map(n => (
                                                <div key={n.id} className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700 rounded-xl p-4">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-900 dark:text-white">{n.author}</p>
                                                            <p className="text-[10px] text-slate-400">{new Date(n.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <button onClick={() => { setEditingNoteId(n.id); setEditNoteText(n.text); }} className="text-[10px] bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-bold transition-colors">Edit</button>
                                                            <button onClick={() => handleDeleteNote(viewingBooking.id, n.id)} className="text-[10px] bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-800/40 text-red-600 dark:text-red-400 px-2 py-0.5 rounded font-bold transition-colors">Delete</button>
                                                        </div>
                                                    </div>
                                                    {editingNoteId === n.id ? (
                                                        <div className="mt-2">
                                                            <textarea
                                                                value={editNoteText}
                                                                onChange={e => setEditNoteText(e.target.value)}
                                                                className="w-full bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none h-16 resize-none mb-2"
                                                            />
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={() => { setEditingNoteId(null); setEditNoteText(''); }} className="text-xs px-3 py-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
                                                                <button onClick={() => handleUpdateNote(viewingBooking.id, n.id)} disabled={!editNoteText.trim()} className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50">Save</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{n.text}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* ── Footer Actions ── */}
                        <div className="px-4 sm:px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-3">
                            <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-1 sm:pb-0">
                                <button
                                    onClick={() => { handleGenerateInvoice(viewingBooking); }}
                                    className="flex whitespace-nowrap items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[17px]">add</span> New Invoice
                                </button>
                                <button
                                    onClick={() => { navigate(`/admin/invoices?booking_id=${viewingBooking.id}`); }}
                                    className="flex whitespace-nowrap items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[17px]">receipt_long</span> Invoices
                                </button>
                                <button
                                    onClick={() => { setViewingBookingId(null); setBookingForLedgerId(viewingBooking?.id ?? null); }}
                                    className="flex whitespace-nowrap items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[17px]">account_balance_wallet</span> Ledger
                                </button>
                            </div>
                            {hasPermission('bookings', 'manage') && (
                                <button
                                    onClick={() => { setViewingBookingId(null); openEditModal(viewingBooking!); }}
                                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-colors w-full sm:w-auto"
                                >
                                    <span className="material-symbols-outlined text-[18px]">edit</span> Edit Booking
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                );
            })()}

            {/* Playbook Generate Confirmation Modal */}
            {showPlaybookConfirm && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A2633] w-full max-w-sm rounded-2xl shadow-2xl p-6 border border-slate-100 dark:border-slate-800 space-y-4">
                        <div className="size-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                            <span className="material-symbols-outlined text-2xl">auto_awesome</span>
                        </div>
                        <div className="text-center">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Load Predefined Playbook?</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                                Loading a template checklist will add new operational tasks for <strong className="text-slate-700 dark:text-slate-205">{selectedPredefinedPlaybookType}</strong>. Custom tasks will NOT be deleted.
                            </p>
                        </div>
                        <div className="flex gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowPlaybookConfirm(false)}
                                className="flex-1 py-2 px-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase text-slate-550 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmGeneratePlaybook}
                                className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-650 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all"
                            >
                                Load Playbook
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Task Completion Note Modal */}
            {completionNoteTask && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A2633] w-full max-w-md rounded-2xl shadow-2xl p-6 border border-slate-100 dark:border-slate-800 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-emerald-500 text-[18px]">verified</span>
                                Complete Task
                            </h3>
                            <button type="button" onClick={() => setCompletionNoteTask(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {completionNoteTask.title}
                            </p>
                            <p className="text-[10px] text-slate-405 mt-1">Add an optional completion note/remark for the team log.</p>
                        </div>
                        <div>
                            <textarea
                                value={completionNoteText}
                                onChange={e => setCompletionNoteText(e.target.value)}
                                placeholder="e.g. Booking confirmed with supplier, voucher sent to customer..."
                                className="w-full min-h-[80px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                                maxLength={250}
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setCompletionNoteTask(null)}
                                className="px-4 py-2 text-xs font-black uppercase text-slate-550 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmCompletion}
                                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-660 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-[15px]">check_circle</span>
                                Mark Complete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A2633] w-full max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 h-[95vh] sm:h-auto sm:max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{isEditMode ? 'Edit Booking' : 'Create New Booking'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
                            {/* Customer Details */}
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Customer Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500">Full Name</label>
                                        <input required value={formData.customer} onChange={e => setFormData({ ...formData, customer: e.target.value })} type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none font-bold" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500">Email Address</label>
                                        <input required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} type="email" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none font-bold" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500">Phone</label>
                                        <input required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value, whatsapp: formData.isWhatsappSame ? e.target.value : formData.whatsapp })} type="tel" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none font-bold" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500">Alternate Phone</label>
                                        <input placeholder="Alternate Number" value={formData.altPhone} onChange={e => setFormData({ ...formData, altPhone: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none font-bold" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-500">WhatsApp Number</label>
                                            <div className="flex items-center gap-1.5">
                                                <input type="checkbox" id="booking-is-whatsapp-same" checked={formData.isWhatsappSame} onChange={e => {
                                                    const checked = e.target.checked;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        isWhatsappSame: checked,
                                                        whatsapp: checked ? prev.phone : ''
                                                    }));
                                                }} className="rounded border-slate-300 text-primary focus:ring-primary h-3.5 w-3.5" />
                                                <label htmlFor="booking-is-whatsapp-same" className="text-[10px] font-bold text-slate-400 cursor-pointer select-none">Same as Phone</label>
                                            </div>
                                        </div>
                                        <input placeholder="WhatsApp Number" disabled={formData.isWhatsappSame} value={formData.isWhatsappSame ? formData.phone : formData.whatsapp} onChange={e => setFormData({ ...formData, whatsapp: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none font-bold disabled:opacity-55 disabled:cursor-not-allowed" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500">Guests</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <label className="text-[10px] uppercase font-bold text-slate-400">Adults</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={guestCounts.adults}
                                                    onChange={e => setGuestCounts({ ...guestCounts, adults: parseInt(e.target.value) || 1 })}
                                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase font-bold text-slate-400">Children</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={guestCounts.children}
                                                    onChange={e => setGuestCounts({ ...guestCounts, children: parseInt(e.target.value) || 0 })}
                                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase font-bold text-slate-400">Infants</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={guestCounts.infants}
                                                    onChange={e => setGuestCounts({ ...guestCounts, infants: parseInt(e.target.value) || 0 })}
                                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500">Residential Address</label>
                                        <input placeholder="Home Address" value={formData.residentialAddress} onChange={e => setFormData({ ...formData, residentialAddress: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none font-bold" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500">Office Address</label>
                                        <input placeholder="Work Address" value={formData.officeAddress} onChange={e => setFormData({ ...formData, officeAddress: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none font-bold" />
                                    </div>
                                </div>
                            </div>

                            {/* Service Details */}
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Service Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500">Booking Type</label>
                                        <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as BookingType, packageId: '', title: '' })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
                                            <option value="Tour">Tour Package</option>
                                            <option value="Hotel">Hotel Stay</option>
                                            <option value="Car">Car Rental</option>
                                            <option value="Bus">Bus Ticket</option>
                                            <option value="Train">Train Ticket</option>
                                            <option value="Flight">Flight Ticket</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500">{formData.type === 'Tour' ? 'Select Package' : 'Service Title'}</label>
                                        {formData.type === 'Tour' ? (
                                            <select value={formData.packageId} onChange={handlePackageChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
                                                <option value="" disabled>Select a package</option>
                                                {packages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                            </select>
                                        ) : (
                                            <input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. Innova Rental" />
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500">Start Date</label>
                                        <input type="date" value={formData.date} onChange={e => {
                                            const newStartDate = e.target.value;
                                            // Try to keep the duration same if existing end date
                                            setFormData(prev => {
                                                const updates: any = { ...prev, date: newStartDate };
                                                if (prev.endDate && prev.date) {
                                                    const start = new Date(prev.date);
                                                    const end = new Date(prev.endDate);
                                                    const duration = end.getTime() - start.getTime();
                                                    const newEnd = new Date(new Date(newStartDate).getTime() + duration);
                                                    updates.endDate = newEnd.toISOString().split('T')[0];
                                                }
                                                return updates;
                                            });
                                        }} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500">End Date</label>
                                        <input type="date" min={formData.date} value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500">Total Amount (₹)</label>
                                        <input
                                            type="number"
                                            value={formData.amount}
                                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                            className={`w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none ${isEditMode && currentUser?.userType !== 'Admin' ? 'opacity-60 cursor-not-allowed' : ''}`}
                                            disabled={isEditMode && currentUser?.userType !== 'Admin'}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500">Service Category</label>
                                        <select value={formData.serviceType} onChange={e => setFormData({ ...formData, serviceType: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none font-bold">
                                            {['Full package', 'Hotel + Flight', 'Hotel + Transport', 'Hotel only', 'Flight only', 'Transport only', 'Activities only', 'Visa only'].map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Status & Payment */}
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Status & Payment</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500">Booking Status</label>
                                        <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as BookingStatus })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
                                            <option value={BookingStatus.PENDING}>Pending</option>
                                            <option value={BookingStatus.CONFIRMED}>Confirmed</option>
                                            <option value={BookingStatus.COMPLETED}>Completed</option>
                                            <option value={BookingStatus.CANCELLED}>Cancelled</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500">Payment Status</label>
                                        <select value={formData.payment} onChange={e => setFormData({ ...formData, payment: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
                                            <option value="Unpaid">Unpaid</option>
                                            <option value="Deposit">Deposit Paid</option>
                                            <option value="Paid">Fully Paid</option>
                                            <option value="Refunded">Refunded</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="mt-4 space-y-1">
                                    <label className="text-xs font-bold text-slate-500">Internal Notes</label>
                                    <textarea value={formData.details} onChange={e => setFormData({ ...formData, details: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none h-20 resize-none" placeholder="Add specific requirements or notes..." />
                                </div>
                            </div>

                            <div className="flex justify-between pt-4">
                                {/* New Refund Button in Modal */}
                                {currentUser?.userType === 'Admin' && formData.status === BookingStatus.CANCELLED && (formData.payment === 'Paid' || formData.payment === 'Deposit') ? (
                                    <button type="button" onClick={() => handleProcessRefund(formData.id)} className="px-6 py-2.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 font-bold hover:bg-purple-100 transition-colors flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">currency_exchange</span> Process Refund
                                    </button>
                                ) : <div></div>}

                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                                    {hasPermission('bookings', 'manage') && (
                                        <button type="submit" className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-colors">{isEditMode ? 'Save Changes' : 'Create Booking'}</button>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Main Header */}
            <div className="px-4 md:px-8 py-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A2633]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight"><span className="font-display text-3xl">Booking Management</span></h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Track reservations, manage payments, and assign services.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleExport} className="hidden sm:flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors dark:text-white">
                            <span className="material-symbols-outlined text-[18px]">download</span> Export Excel
                        </button>
                        {hasPermission('bookings', 'manage') && (
                            <button onClick={openCreateModal} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 btn-glow">
                                <span className="material-symbols-outlined text-[20px]">add</span> New Booking
                            </button>
                        )}
                    </div>
                </div>

                {/* Toolbar */}
                <div className="mt-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto overflow-x-auto hide-scrollbar">
                        {['All', 'Ongoing', BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap ${activeTab === tab
                                    ? 'bg-white dark:bg-[#1A2633] text-primary shadow-sm'
                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                            >
                                {tab === 'All' ? 'All Bookings' : tab}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <div className="relative flex-1 lg:w-64">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                            <input
                                type="text"
                                placeholder="Search by ID, Name or Title..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 pr-4 py-2.5 bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-700 rounded-xl text-sm w-full focus:ring-2 focus:ring-primary/50 dark:text-white placeholder:text-slate-400 outline-none"
                            />
                        </div>
                        <div className="flex bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-700 rounded-xl p-1 shrink-0">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-slate-100 dark:bg-slate-700 text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <span className="material-symbols-outlined text-[20px]">table_rows</span>
                            </button>
                            <button
                                onClick={() => setViewMode('board')}
                                className={`p-2 rounded-lg transition-colors ${viewMode === 'board' ? 'bg-slate-100 dark:bg-slate-700 text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <span className="material-symbols-outlined text-[20px]">view_kanban</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">

                {/* LIST VIEW */}
                {viewMode === 'list' && (
                    <div className="h-full overflow-y-auto p-4 md:p-8">
                        <div className="bg-white dark:bg-[#1A2633] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto hidden md:block">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">ID & Type</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Customer</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Details</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Payment</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700 cursor-pointer">
                                        {paginatedBookings.length > 0 ? (
                                            paginatedBookings.map((booking) => (
                                                <tr 
                                                    key={booking.id} 
                                                    onClick={() => setViewingBookingId(booking.id)} 
                                                    className={`group transition-colors cursor-pointer ${
                                                        booking.partnerId 
                                                            ? 'bg-violet-500/5 dark:bg-violet-500/10 hover:bg-violet-500/10 dark:hover:bg-violet-500/20' 
                                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                                    }`}
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold font-mono text-primary">{booking.bookingNumber ? `BK-${String(booking.bookingNumber).padStart(4, '0')}` : booking.id.substring(0, 8)}</span>
                                                            <div className="flex items-center gap-1 text-slate-500 mt-1">
                                                                 <span className="material-symbols-outlined text-[14px]">{getTypeIcon(booking.type)}</span>
                                                                 <span className="text-[10px] font-bold uppercase">{booking.type}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-300">
                                                                {booking.customer.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                                    {booking.customer}
                                                                    {booking.partnerId && (
                                                                        <span className="inline-flex items-center text-[9px] font-black px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border border-violet-200/50 uppercase tracking-wider">Partner</span>
                                                                    )}
                                                                </p>
                                                                <p className="text-xs text-slate-500">{booking.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 max-w-[180px] truncate">{booking.title}</p>
                                                        <p className="text-xs text-slate-500">{booking.guests}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">{booking.date}</span>
                                                            {booking.endDate && booking.endDate !== booking.date && (
                                                                <span className="text-[10px] text-slate-400 font-medium">to {booking.endDate}</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-sm kpi-number text-slate-900 dark:text-white">{formatPrice(booking.amount)}</span>
                                                            {(() => {
                                                                // Compute live payment status from Verified transactions only
                                                                const bTxs = booking.transactions || [];
                                                                const vPaid = bTxs.filter(t => t.type === 'Payment' && t.status === 'Verified').reduce((s, t) => s + t.amount, 0);
                                                                const vRefunded = bTxs.filter(t => t.type === 'Refund' && t.status === 'Verified').reduce((s, t) => s + t.amount, 0);
                                                                const hasPending = bTxs.some(t => t.status === 'Pending');
                                                                const net = vPaid - vRefunded;
                                                                const liveP = booking.amount > 0 && net >= booking.amount ? 'Paid' : net > 0 ? 'Deposit' : net < 0 ? 'Refunded' : 'Unpaid';
                                                                return (
                                                                    <div className="flex items-center gap-1">
                                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded w-fit font-bold uppercase ${liveP === 'Paid' ? 'bg-green-100 text-green-700' : liveP === 'Deposit' ? 'bg-blue-100 text-blue-700' : liveP === 'Refunded' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                                                                            {liveP}
                                                                        </span>
                                                                        {hasPending && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-600 font-bold uppercase" title="Has pending payment(s) awaiting approval">⏳</span>}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(booking.status)}`}>
                                                            <span className="size-1.5 rounded-full bg-current"></span>
                                                            {booking.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                                        <ActionMenu>
                                                            <button onClick={() => handleGenerateInvoice(booking)} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors">
                                                                <span className="material-symbols-outlined text-[18px] text-blue-500">receipt_long</span> Invoice
                                                            </button>
                                                            <button onClick={() => setBookingForLedgerId(booking.id)} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors">
                                                                <span className="material-symbols-outlined text-[18px] text-indigo-500">account_balance_wallet</span> Billing Ledger
                                                            </button>
                                                            <button onClick={() => setSelectedBookingForSuppliersId(booking.id)} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors">
                                                                <span className="material-symbols-outlined text-[18px] text-emerald-500">inventory</span> Manage Suppliers
                                                            </button>
                                                            {hasPermission('bookings', 'manage') && (
                                                                <button onClick={() => openEditModal(booking)} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors">
                                                                    <span className="material-symbols-outlined text-[18px] text-primary">edit</span> Edit
                                                                </button>
                                                            )}

                                                            {/* Logic for Refund Button */}
                                                            {hasPermission('bookings', 'manage') && booking.status === BookingStatus.CANCELLED && (booking.payment === 'Paid' || booking.payment === 'Deposit') && (
                                                                <button onClick={() => handleProcessRefund(booking.id)} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors">
                                                                    <span className="material-symbols-outlined text-[18px] text-purple-500">currency_exchange</span> Refund
                                                                </button>
                                                            )}

                                                            {/* Logic for Cancel Button */}
                                                            {hasPermission('bookings', 'manage') && (booking.status === BookingStatus.PENDING || booking.status === BookingStatus.CONFIRMED) && (
                                                                <button onClick={() => handleCancelBooking(booking.id)} className="w-full text-left px-4 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center gap-2 transition-colors border-t border-slate-100 dark:border-slate-800">
                                                                    <span className="material-symbols-outlined text-[18px]">cancel</span> Cancel Booking
                                                                </button>
                                                            )}

                                                            {hasPermission('bookings', 'manage') && (
                                                                <button onClick={() => {
                                                                    if (confirm("Are you sure you want to permanently delete this booking? This action cannot be undone.")) {
                                                                        const toastId = toast.loading('Deleting booking...');
                                                                        deleteBooking(booking.id)
                                                                            .then(() => {
                                                                                toast.dismiss(toastId);
                                                                                toast.success('Booking deleted successfully');
                                                                            })
                                                                            .catch((err: any) => {
                                                                                toast.dismiss(toastId);
                                                                                toast.error(`Delete failed: ${err?.message || 'Unknown error'}`);
                                                                                console.error('[Delete Booking Error]', err);
                                                                            });
                                                                    }
                                                                }} className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors border-t border-slate-100 dark:border-slate-800">
                                                                    <span className="material-symbols-outlined text-[18px]">delete</span> Delete
                                                                </button>
                                                            )}
                                                        </ActionMenu>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                                    <span className="material-symbols-outlined text-4xl opacity-20 mb-2">search_off</span>
                                                    <p>No bookings found matching your criteria.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards View */}
                            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
                                {paginatedBookings.length > 0 ? (
                                    paginatedBookings.map((booking) => {
                                        const bTxs = booking.transactions || [];
                                        const vPaid = bTxs.filter(t => t.type === 'Payment' && t.status === 'Verified').reduce((s, t) => s + t.amount, 0);
                                        const vRefunded = bTxs.filter(t => t.type === 'Refund' && t.status === 'Verified').reduce((s, t) => s + t.amount, 0);
                                        const hasPending = bTxs.some(t => t.status === 'Pending');
                                        const net = vPaid - vRefunded;
                                        const liveP = booking.amount > 0 && net >= booking.amount ? 'Paid' : net > 0 ? 'Deposit' : net < 0 ? 'Refunded' : 'Unpaid';
                                        
                                        return (
                                            <div 
                                                key={booking.id} 
                                                onClick={() => setViewingBookingId(booking.id)} 
                                                className={`p-4 cursor-pointer transition-colors border-l-4 ${
                                                    booking.partnerId 
                                                        ? 'bg-violet-500/5 dark:bg-violet-500/10 border-violet-500 hover:bg-violet-500/10 dark:hover:bg-violet-500/20' 
                                                        : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-100 dark:active:bg-slate-800'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                            <span className="text-xs font-bold font-mono text-primary">{booking.bookingNumber ? `BK-${String(booking.bookingNumber).padStart(4, '0')}` : booking.id.substring(0, 8)}</span>
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${getStatusColor(booking.status)}`}>
                                                                {booking.status}
                                                            </span>
                                                            {booking.partnerId && (
                                                                <span className="inline-flex items-center text-[9px] font-black px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border border-violet-200/50 uppercase tracking-wider">Partner</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-slate-500">
                                                            <span className="material-symbols-outlined text-[14px]">{getTypeIcon(booking.type)}</span>
                                                            <span className="text-[10px] font-bold uppercase tracking-wider">{booking.type}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex flex-col items-end gap-1">
                                                        <span className="text-sm font-bold text-slate-900 dark:text-white">{formatPrice(booking.amount)}</span>
                                                        <div className="flex items-center gap-1">
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded w-fit font-bold uppercase ${liveP === 'Paid' ? 'bg-green-100 text-green-700' : liveP === 'Deposit' ? 'bg-blue-100 text-blue-700' : liveP === 'Refunded' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                                                                {liveP}
                                                            </span>
                                                            {hasPending && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-600 font-bold uppercase">⏳</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-3 mb-3 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs text-primary shrink-0">
                                                        {booking.customer.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{booking.customer}</p>
                                                        <p className="text-xs text-slate-500 truncate">{booking.title}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                                        <span>{new Date(booking.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                    </div>
                                                    <ActionMenu>
                                                        <button onClick={(e) => { e.stopPropagation(); handleGenerateInvoice(booking); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-[18px] text-blue-500">receipt_long</span> Invoice
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); setBookingForLedgerId(booking.id); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-[18px] text-indigo-500">account_balance_wallet</span> Billing Ledger
                                                        </button>
                                                        {hasPermission('bookings', 'manage') && (
                                                            <button onClick={(e) => { e.stopPropagation(); openEditModal(booking); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                                <span className="material-symbols-outlined text-[18px] text-primary">edit</span> Edit
                                                            </button>
                                                        )}
                                                    </ActionMenu>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="p-12 text-center text-slate-500">
                                        <span className="material-symbols-outlined text-4xl opacity-20 mb-2">search_off</span>
                                        <p className="text-sm">No bookings found.</p>
                                    </div>
                                )}
                            </div>

                            {/* Pagination */}
                            {filteredBookings.length > 0 && (
                                <Pagination
                                    currentPage={currentPage}
                                    totalItems={filteredBookings.length}
                                    itemsPerPage={itemsPerPage}
                                    onPageChange={setCurrentPage}
                                    onItemsPerPageChange={setItemsPerPage}
                                    itemsPerPageOptions={[10, 15, 25, 50]}
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* KANBAN BOARD VIEW */}
                {viewMode === 'board' && (
                    <div className="h-full overflow-x-auto overflow-y-hidden p-4 md:p-8">
                        <div className="flex h-full gap-6 min-w-[1000px]">
                            {[BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED].map(status => {
                                const statusBookings = filteredBookings.filter(b => b.status === status);
                                const columnColor = status === BookingStatus.CONFIRMED ? 'border-green-500' : status === BookingStatus.PENDING ? 'border-yellow-500' : status === BookingStatus.CANCELLED ? 'border-red-500' : 'border-blue-500';

                                return (
                                    <div key={status} className="flex-1 flex flex-col min-w-[280px] h-full bg-slate-100/50 dark:bg-slate-800/20 rounded-2xl border border-slate-200 dark:border-slate-800">
                                        <div className={`p-4 border-t-4 rounded-t-2xl ${columnColor} bg-white dark:bg-[#1A2633] border-b border-slate-200 dark:border-slate-800`}>
                                            <div className="flex justify-between items-center">
                                                <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-sm">{status}</h3>
                                                <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-500">{statusBookings.length}</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                            {statusBookings.map(booking => (
                                                <div
                                                    key={booking.id}
                                                    onClick={() => openEditModal(booking)}
                                                    className={`p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer group border border-l-4 ${
                                                        booking.partnerId 
                                                            ? 'bg-violet-500/5 dark:bg-violet-500/10 border-slate-200 dark:border-slate-700 border-l-violet-500 hover:border-l-violet-600' 
                                                            : 'bg-white dark:bg-[#1A2633] border-slate-200 dark:border-slate-700 border-l-transparent hover:border-primary/50'
                                                    }`}
                                                >
                                                    <div className="flex justify-between items-start mb-2 gap-2 flex-wrap">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[10px] font-mono font-bold text-slate-400">{booking.bookingNumber ? `BK-${String(booking.bookingNumber).padStart(4, '0')}` : booking.id.substring(0, 8)}</span>
                                                            {booking.partnerId && (
                                                                <span className="inline-flex items-center text-[8px] font-black px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border border-violet-200/50 uppercase tracking-wider">Partner</span>
                                                            )}
                                                        </div>
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${booking.payment === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{booking.payment}</span>
                                                    </div>
                                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">{booking.customer}</h4>
                                                    <p className="text-xs text-slate-500 line-clamp-1 mb-3">{booking.title}</p>
                                                    <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800">
                                                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">calendar_today</span> {new Date(booking.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                        <span className="kpi-number text-slate-900 dark:text-white">₹{(booking.amount / 1000).toFixed(1)}k</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {statusBookings.length === 0 && (
                                                <div className="text-center py-10 text-slate-400 text-xs italic">No bookings</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

            </div>

            {/* Supplier Management Modal — booking derived live from bookings[] so it auto-refreshes */}
            {
                selectedBookingForSuppliers && (
                    <SupplierManagementModal
                        isOpen={!!selectedBookingForSuppliers}
                        onClose={() => setSelectedBookingForSuppliersId(null)}
                        booking={selectedBookingForSuppliers}
                    />
                )}

            {/* Ledger Management Modal — booking derived live from bookings[] so it auto-refreshes */}
            {bookingForLedger && (
                <LedgerManagementModal
                    isOpen={!!bookingForLedger}
                    onClose={() => setBookingForLedgerId(null)}
                    booking={bookingForLedger}
                />
            )}

            {viewingBooking && (
                <TransferRequestModal
                    isOpen={isTransferModalOpen}
                    onClose={() => setIsTransferModalOpen(false)}
                    itemType="Booking"
                    itemId={viewingBooking.id}
                    itemName={`BK-${String(viewingBooking.bookingNumber || '').padStart(4, '0')} | ${viewingBooking.customer}`}
                    staffList={staff}
                    currentAssigneeId={viewingBooking.assignedTo}
                    onSuccess={() => {
                        refetchTransfers();
                        refreshData();
                    }}
                />
            )}
        </div >
    );
};
