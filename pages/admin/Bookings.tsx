
import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useBookings } from '../../src/hooks/useBookings';
import { BookingStatus, Booking, BookingType } from '../../types';
import { SupplierManagementModal } from '../../components/admin/SupplierManagementModal';
import { LedgerManagementModal } from '../../components/admin/LedgerManagementModal';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Pagination, usePagination } from '../../components/ui/Pagination';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const Bookings: React.FC = () => {
    const { packages, customers } = useData();
    const { bookings, addBooking, updateBooking, deleteBooking, isLoading } = useBookings();
    const { currentUser, hasPermission } = useAuth();
    const location = useLocation();
    const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
    const [activeTab, setActiveTab] = useState('All');
    const [search, setSearch] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedBookingForSuppliers, setSelectedBookingForSuppliers] = useState<Booking | null>(null);
    const [bookingForLedger, setBookingForLedger] = useState<Booking | null>(null);

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
        details: ''
    });

    // Guest State
    const [guestCounts, setGuestCounts] = useState({ adults: 2, children: 0 });

    // Sync guestCounts to formData.guests
    useEffect(() => {
        const guestsStr = `${guestCounts.adults} Adults, ${guestCounts.children} Children`;
        setFormData(prev => ({ ...prev, guests: guestsStr }));
    }, [guestCounts]);

    // Sync formData.guests to guestCounts (when editing)
    useEffect(() => {
        if (isEditMode && formData.guests) {
            const parts = formData.guests.split(',');
            let a = 2, c = 0;
            parts.forEach(p => {
                if (p.toLowerCase().includes('adult')) a = parseInt(p) || 2;
                if (p.toLowerCase().includes('child')) c = parseInt(p) || 0;
            });
            setGuestCounts({ adults: a, children: c });
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
    }, [location.search]);

    // --- Handlers ---

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
            details: ''
        });
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
            details: booking.details || ''
        });
        setIsModalOpen(true);
    };

    const handlePackageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const pkgId = e.target.value;
        const selectedPkg = packages.find(p => p.id === pkgId);
        setFormData(prev => ({
            ...prev,
            packageId: pkgId,
            title: selectedPkg ? selectedPkg.title : '',
            amount: selectedPkg ? selectedPkg.price : prev.amount
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
            amount: Number(formData.amount) || 0,
            status: formData.status,
            payment: formData.payment as any,
            guests: formData.guests,
            details: formData.details
        };

        if (isEditMode && formData.id) {
            updateBooking(formData.id, bookingData);
        } else {
            const newBooking: Booking = {
                id: `BK-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                assignedTo: currentUser?.id,
                ...bookingData as any // safely cast for new object
            };
            addBooking(newBooking);
        }

        setIsModalOpen(false);
    };

    const handleExport = () => {
        // Escape csv fields
        const escapeCsv = (str: string | number | undefined) => {
            if (str === undefined || str === null) return '';
            const stringValue = String(str);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };

        const csvHeader = "ID,Customer,Email,Type,Title,Date,Amount,Status,Payment\n";
        const csvRows = filteredBookings.map(b =>
            `${escapeCsv(b.id)},${escapeCsv(b.customer)},${escapeCsv(b.email)},${escapeCsv(b.type)},${escapeCsv(b.title)},${escapeCsv(b.date)},${escapeCsv(b.amount)},${escapeCsv(b.status)},${escapeCsv(b.payment)}`
        ).join("\n");

        const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvHeader + csvRows);

        const link = document.createElement("a");
        link.setAttribute("href", csvContent);
        link.setAttribute("download", `bookings_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
        const isPaid = booking.payment === 'Paid';
        // Use actual deposit amount if tracked, otherwise estimate at 30%
        const amountPaid = isPaid ? booking.amount : (booking.payment === 'Deposit' ? ((booking as any).depositAmount || booking.amount * 0.3) : 0);
        const balanceDue = booking.amount - amountPaid;
        const invoiceDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const dueDate = new Date(booking.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(55, 65, 81);
        doc.text('SHRAVYA TOURS', 14, 25);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.text('Your Dream Destination', 14, 31);

        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(17, 24, 39);
        doc.text('INVOICE', 196, 25, { align: 'right' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`Invoice No:`, 140, 33);
        doc.setFont('helvetica', 'normal');
        doc.text(`${booking.invoiceNo || booking.id.replace('#', '')}`, 165, 33);

        doc.setFont('helvetica', 'bold');
        doc.text(`Invoice Date:`, 140, 39);
        doc.setFont('helvetica', 'normal');
        doc.text(`${invoiceDate}`, 165, 39);

        doc.setFont('helvetica', 'bold');
        doc.text(`Due Date:`, 140, 45);
        doc.setFont('helvetica', 'normal');
        doc.text(`${dueDate}`, 165, 45);

        // Separator line
        doc.setDrawColor(229, 231, 235);
        doc.line(14, 50, 196, 50);

        // Addresses
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(17, 24, 39);
        doc.text('BILLED FROM', 14, 60);
        doc.text('BILLED TO', 110, 60);

        doc.setFontSize(12);
        doc.text('Shravya Tours', 14, 66);
        doc.text(`${booking.customer}`, 110, 66);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(55, 65, 81);
        doc.text('A508, Wisteria, Patil Nagar', 14, 72);
        doc.text('Pune, Maharashtra - 411062', 14, 77);
        doc.text('shravyatours23@gmail.com', 14, 85);
        doc.text('+91 80109 55675', 14, 90);

        doc.text(`${booking.email}`, 110, 72);
        doc.text(`${booking.phone || ''}`, 110, 77);

        // Service Summary Table
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(55, 65, 81);
        doc.text('SERVICE SUMMARY', 14, 105);

        autoTable(doc, {
            startY: 110,
            head: [['Item Description', 'Duration', 'Service Dates', 'Rate', 'Amount']],
            body: [
                [`${booking.title}\n(${booking.type} Package)`, 'As per itinerary', dueDate, `Rs. ${booking.amount.toLocaleString()}.00`, `Rs. ${booking.amount.toLocaleString()}.00`]
            ],
            theme: 'grid',
            headStyles: { fillColor: [229, 231, 235], textColor: [17, 24, 39] },
            columnStyles: {
                3: { halign: 'right' },
                4: { halign: 'right', fontStyle: 'bold' }
            }
        });

        const finalY = (doc as any).lastAutoTable.finalY || 135;

        // Financial Breakdown
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(55, 65, 81);
        doc.text('FINANCIAL BREAKDOWN', 100, finalY + 15);

        autoTable(doc, {
            startY: finalY + 20,
            margin: { left: 100 },
            body: [
                ['Gross Total', `Rs. ${booking.amount.toLocaleString()}.00`],
                ['(-) Advance Received', `(Rs. ${amountPaid.toLocaleString()}.00)`],
                ['TOTAL DUE (INR)', `Rs. ${balanceDue.toLocaleString()}.00`]
            ],
            theme: 'plain',
            styles: { fontSize: 10 },
            columnStyles: {
                1: { halign: 'right', fontStyle: 'bold' }
            },
            didParseCell: function (data) {
                if (data.row.index === 2) {
                    data.cell.styles.textColor = [255, 255, 255];
                    data.cell.styles.fillColor = [75, 85, 99];
                }
            }
        });

        // Payment Details
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(55, 65, 81);
        doc.text('PAYMENT DETAILS', 14, finalY + 15);

        doc.setFontSize(9);
        doc.text('Bank Transfer', 14, finalY + 22);
        doc.setFont('helvetica', 'normal');
        doc.text('Bank: Federal Bank\nAccount Name: Shravya Tours and Travels\nAccount Type: Current\nAccount No: 14960200014487\nIFSC: FDRL0001496', 14, finalY + 28);

        doc.setFont('helvetica', 'bold');
        doc.text('UPI Payment', 14, finalY + 54);
        doc.setFont('helvetica', 'normal');
        doc.text('UPI ID: shravyatours23@okicici', 14, finalY + 60);

        // Footer terms
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text('This is a system-generated invoice. Thank you for choosing Shravya Tours!', 105, 280, { align: 'center' });

        doc.save(`Invoice_${booking.invoiceNo || booking.id.replace('#', '')}.pdf`);
    };

    // --- Filters ---

    const filteredBookings = bookings.filter(b => {
        const matchesTab = activeTab === 'All' || b.status === activeTab;
        const matchesSearch = b.customer.toLowerCase().includes(search.toLowerCase()) ||
            b.id.toLowerCase().includes(search.toLowerCase()) ||
            b.title.toLowerCase().includes(search.toLowerCase());

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
            default: return 'confirmation_number';
        }
    };

    return (
        <div className="flex flex-col h-full admin-page-bg relative">

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A2633] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{isEditMode ? 'Edit Booking' : 'Create New Booking'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
                            {/* Customer Details */}
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Customer Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1 md:col-span-2">
                                        <label className="text-xs font-bold text-slate-500">Select Customer (Optional)</label>
                                        <select
                                            value={formData.customerId}
                                            onChange={handleCustomerSelect}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                                        >
                                            <option value="">-- New / Manual Entry --</option>
                                            {customers.map(c => (
                                                <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500">Full Name</label>
                                        <input required value={formData.customer} onChange={e => setFormData({ ...formData, customer: e.target.value })} type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500">Email Address</label>
                                        <input required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} type="email" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500">Phone</label>
                                        <input required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} type="tel" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500">Guests</label>
                                        <div className="grid grid-cols-2 gap-2">
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
                                        </div>
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
                                        <label className="text-xs font-bold text-slate-500">Travel Date</label>
                                        <input type="date" min={today} value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
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
                            <span className="material-symbols-outlined text-[18px]">download</span> Export CSV
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
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
                        {['All', BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED].map((tab) => (
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
                            <div className="overflow-x-auto">
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
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {paginatedBookings.length > 0 ? (
                                            paginatedBookings.map((booking) => (
                                                <tr key={booking.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold font-mono text-primary">{booking.id}</span>
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
                                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{booking.customer}</p>
                                                                <p className="text-xs text-slate-500">{booking.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 max-w-[180px] truncate">{booking.title}</p>
                                                        <p className="text-xs text-slate-500">{booking.guests}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">{booking.date}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-sm kpi-number text-slate-900 dark:text-white">₹{booking.amount.toLocaleString()}</span>
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded w-fit font-bold uppercase ${booking.payment === 'Paid' ? 'bg-green-100 text-green-700' : booking.payment === 'Deposit' ? 'bg-blue-100 text-blue-700' : booking.payment === 'Refunded' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                                                                {booking.payment}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(booking.status)}`}>
                                                            <span className="size-1.5 rounded-full bg-current"></span>
                                                            {booking.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => handleGenerateInvoice(booking)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Invoice">
                                                                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                                                            </button>
                                                            <button onClick={() => setBookingForLedger(booking)} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors" title="Billing Ledger">
                                                                <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                                                            </button>
                                                            <button onClick={() => setSelectedBookingForSuppliers(booking)} className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors" title="Manage Suppliers">
                                                                <span className="material-symbols-outlined text-[18px]">inventory</span>
                                                            </button>
                                                            {hasPermission('bookings', 'manage') && (
                                                                <button onClick={() => openEditModal(booking)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Edit">
                                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                                </button>
                                                            )}

                                                            {/* Logic for Refund Button */}
                                                            {hasPermission('bookings', 'manage') && booking.status === BookingStatus.CANCELLED && (booking.payment === 'Paid' || booking.payment === 'Deposit') && (
                                                                <button onClick={() => handleProcessRefund(booking.id)} className="p-2 text-purple-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors" title="Refund">
                                                                    <span className="material-symbols-outlined text-[18px]">currency_exchange</span>
                                                                </button>
                                                            )}

                                                            {/* Logic for Cancel Button */}
                                                            {hasPermission('bookings', 'manage') && (booking.status === BookingStatus.PENDING || booking.status === BookingStatus.CONFIRMED) && (
                                                                <button onClick={() => handleCancelBooking(booking.id)} className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors" title="Cancel Booking">
                                                                    <span className="material-symbols-outlined text-[18px]">cancel</span>
                                                                </button>
                                                            )}

                                                            {hasPermission('bookings', 'manage') && (
                                                                <button onClick={() => {
                                                                    if (confirm("Are you sure you want to permanently delete this booking? This action cannot be undone.")) {
                                                                        deleteBooking(booking.id);
                                                                    }
                                                                }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
                                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                                </button>
                                                            )}
                                                        </div>
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
                                                    className="bg-white dark:bg-[#1A2633] p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group"
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[10px] font-mono font-bold text-slate-400">{booking.id}</span>
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

            {/* Supplier Management Modal */}
            {
                selectedBookingForSuppliers && (
                    <SupplierManagementModal
                        isOpen={!!selectedBookingForSuppliers}
                        onClose={() => setSelectedBookingForSuppliers(null)}
                        booking={selectedBookingForSuppliers}
                    />
                )}

            {/* Ledger Management Modal */}
            {bookingForLedger && (
                <LedgerManagementModal
                    isOpen={!!bookingForLedger}
                    onClose={() => setBookingForLedger(null)}
                    booking={bookingForLedger}
                />
            )}
        </div >
    );
};
