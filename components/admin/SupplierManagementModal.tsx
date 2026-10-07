import React, { useState, useEffect } from 'react';
import { Booking, SupplierBooking, SupplierPayment } from '../../types';
import { useData } from '../../context/DataContext';
import { SupplierBookingModal } from './SupplierBookingModal';
import { SupplierPaymentModal } from './SupplierPaymentModal';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

interface SupplierManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: Booking;
    initialSupplierBookingId?: string;
}

export const SupplierManagementModal: React.FC<SupplierManagementModalProps> = ({ isOpen, onClose, booking, initialSupplierBookingId }) => {
    const { vendors, deleteSupplierBooking, deleteSupplierPayment } = useData();
    const { hasPermission } = useAuth();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingSupplierBooking, setEditingSupplierBooking] = useState<SupplierBooking | null>(null);
    const [payingSupplierBooking, setPayingSupplierBooking] = useState<SupplierBooking | null>(null);
    const [expandedSbId, setExpandedSbId] = useState<string | null>(initialSupplierBookingId || null);
    const [copiedRefId, setCopiedRefId] = useState<string | null>(null);

    useEffect(() => {
        if (initialSupplierBookingId) {
            setExpandedSbId(initialSupplierBookingId);
        }
    }, [initialSupplierBookingId]);

    const supplierBookings = booking.supplierBookings || [];

    const totalCost = supplierBookings.reduce((acc, sb) => acc + (Number(sb.cost) || 0), 0);
    const totalPaid = supplierBookings.reduce((acc, sb) => acc + (Number(sb.paidAmount) || 0), 0);
    const balanceDue = Math.max(0, totalCost - totalPaid);

    const handleEdit = (sb: SupplierBooking) => {
        setEditingSupplierBooking(sb);
        setIsFormOpen(true);
    };

    const handleDelete = (sbId: string) => {
        if (window.confirm('Are you sure you want to delete this supplier booking?')) {
            deleteSupplierBooking(booking.id, sbId);
            if (expandedSbId === sbId) setExpandedSbId(null);
        }
    };

    const toggleExpand = (sbId: string) => {
        setExpandedSbId(prev => (prev === sbId ? null : sbId));
    };

    // Helper to get structured payments with fallback for legacy single paidAmount
    const getSbPayments = (sb: SupplierBooking): SupplierPayment[] => {
        if (Array.isArray(sb.payments) && sb.payments.length > 0) {
            return sb.payments;
        }
        if (Number(sb.paidAmount) > 0) {
            return [{
                id: `legacy-${sb.id}`,
                amount: Number(sb.paidAmount),
                paymentDate: sb.paymentDueDate || '-',
                paymentMethod: 'Recorded Payment',
                reference: sb.confirmationNumber || undefined,
                notes: sb.notes || 'Initial recorded installment',
                recordedBy: 'Accounts',
                createdAt: ''
            }];
        }
        return [];
    };

    const handleCopyText = (text: string, id: string, label: string = 'Copied') => {
        navigator.clipboard.writeText(text);
        setCopiedRefId(id);
        toast.success(label);
        setTimeout(() => setCopiedRefId(null), 2000);
    };

    const handleDeletePayment = async (sb: SupplierBooking, payment: SupplierPayment) => {
        if (window.confirm(`Are you sure you want to delete this payment of ₹${payment.amount.toLocaleString()}? The remaining balance will automatically increase.`)) {
            try {
                await deleteSupplierPayment(booking.id, sb.id, payment.id);
            } catch (err: any) {
                console.error('Delete payment error:', err);
            }
        }
    };

    const handleCopyPaymentSlip = (sb: SupplierBooking, vendorName: string) => {
        const payments = getSbPayments(sb);
        const cost = Number(sb.cost) || 0;
        const paid = Number(sb.paidAmount) || 0;
        const remaining = Math.max(0, cost - paid);

        let slip = `*SHRAWEYLLO TOURS - VENDOR PAYMENT SUMMARY*\n`;
        slip += `Booking Ref: ${booking.id} (${booking.title})\n`;
        slip += `Vendor: ${vendorName} | Service: ${sb.serviceType}\n`;
        if (sb.confirmationNumber) slip += `Confirmation #: ${sb.confirmationNumber}\n`;
        slip += `------------------------------------\n`;
        slip += `Total Cost: ₹${cost.toLocaleString()}\n`;
        slip += `Total Paid: ₹${paid.toLocaleString()}\n`;
        slip += `Balance Due: ₹${remaining.toLocaleString()}\n`;
        slip += `------------------------------------\n`;
        slip += `*Installments Made (${payments.length}):*\n`;

        payments.forEach((p, idx) => {
            slip += `${idx + 1}. ₹${p.amount.toLocaleString()} on ${p.paymentDate} via ${p.paymentMethod}`;
            if (p.reference) slip += ` (Ref: ${p.reference})`;
            if (p.notes) slip += ` [${p.notes}]`;
            slip += `\n`;
        });

        slip += `------------------------------------\n`;
        slip += `Status: ${sb.paymentStatus}`;

        handleCopyText(slip, `slip-${sb.id}`, 'Payment summary copied for WhatsApp / sharing!');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-[#1A2633] w-full max-w-5xl rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 h-[95vh] sm:h-[85vh]">
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>Supplier Management</span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                                {supplierBookings.length} Supplier{supplierBookings.length === 1 ? '' : 's'}
                            </span>
                        </h2>
                        <p className="text-xs text-slate-500 font-bold uppercase mt-1">
                            Booking: {booking.id} - {booking.title}
                        </p>
                    </div>
                    <div className="flex gap-2 sm:gap-3">
                        {hasPermission('bookings', 'manage') && (
                            <button
                                onClick={() => { setEditingSupplierBooking(null); setIsFormOpen(true); }}
                                className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/30 hover:bg-primary-dark transition-colors flex items-center gap-1.5 active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[20px]">add</span>
                                <span>Add Supplier</span>
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-slate-500 uppercase">Total Agreed Cost</p>
                                <span className="material-symbols-outlined text-slate-400 text-[20px]">receipt</span>
                            </div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">₹{totalCost.toLocaleString()}</p>
                            <p className="text-[11px] text-slate-400 mt-1">Total across all vendors</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase">Total Paid So Far</p>
                                <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span>
                            </div>
                            <p className="text-2xl font-black text-emerald-600 mt-1">₹{totalPaid.toLocaleString()}</p>
                            <p className="text-[11px] text-emerald-600/80 mt-1 font-semibold">
                                {totalCost > 0 ? `${Math.round((totalPaid / totalCost) * 100)}% of total paid` : 'No cost assigned'}
                            </p>
                        </div>
                        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase">Remaining Balance Due</p>
                                <span className="material-symbols-outlined text-amber-600 text-[20px]">pending_actions</span>
                            </div>
                            <p className="text-2xl font-black text-amber-600 mt-1">₹{balanceDue.toLocaleString()}</p>
                            <p className="text-[11px] text-amber-600/80 mt-1 font-semibold">
                                {balanceDue === 0 ? '✓ All suppliers fully settled' : 'Pending payouts'}
                            </p>
                        </div>
                    </div>

                    {/* Suppliers & Installments Table */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Vendors & Installment Breakdown</h3>
                                <p className="text-xs text-slate-400">Click on any supplier or "Parts" to view the full list of payments made</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto hide-scrollbar">
                            <table className="w-full text-left text-sm min-w-[760px]">
                                <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] uppercase text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-5 py-3.5">Service</th>
                                        <th className="px-5 py-3.5">Vendor</th>
                                        <th className="px-5 py-3.5 text-right">Cost</th>
                                        <th className="px-5 py-3.5 text-right">Paid</th>
                                        <th className="px-5 py-3.5 text-center">Status</th>
                                        <th className="px-5 py-3.5 text-center">Due Date</th>
                                        <th className="px-5 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {supplierBookings.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-12 text-center text-slate-400 italic">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">storefront</span>
                                                    <p className="font-semibold text-slate-500">No suppliers added for this booking yet.</p>
                                                    <p className="text-xs text-slate-400">Click "+ Add Supplier" above to attach Hotels, Transport, or DMCs.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        supplierBookings.map(sb => {
                                            const vendor = vendors.find(v => v.id === sb.vendorId);
                                            const payments = getSbPayments(sb);
                                            const cost = Number(sb.cost) || 0;
                                            const paid = Number(sb.paidAmount) || 0;
                                            const remaining = Math.max(0, cost - paid);
                                            const isPayable = remaining > 0 && sb.bookingStatus !== 'Cancelled';
                                            const isExpanded = expandedSbId === sb.id;
                                            const percentPaid = cost > 0 ? Math.min(100, Math.round((paid / cost) * 100)) : (paid > 0 ? 100 : 0);

                                            return (
                                                <React.Fragment key={sb.id}>
                                                    <tr className={`transition-colors ${isExpanded ? 'bg-primary/5 dark:bg-primary/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                                                        {/* Service */}
                                                        <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`material-symbols-outlined text-[20px] 
                                                                    ${sb.serviceType?.includes('+') || vendor?.category === 'DMC' ? 'text-emerald-500' :
                                                                        sb.serviceType === 'Flight' ? 'text-blue-500' :
                                                                        sb.serviceType === 'Hotel' ? 'text-purple-500' :
                                                                        sb.serviceType === 'Transport' ? 'text-cyan-500' :
                                                                        sb.serviceType === 'Guide' ? 'text-rose-500' :
                                                                        'text-orange-500'}`}>
                                                                    {sb.serviceType?.includes('+') || vendor?.category === 'DMC' ? 'hub' :
                                                                        sb.serviceType === 'Flight' ? 'flight' :
                                                                        sb.serviceType === 'Hotel' ? 'hotel' :
                                                                        sb.serviceType === 'Transport' ? 'directions_car' :
                                                                        sb.serviceType === 'Guide' ? 'person_pin' :
                                                                        'local_activity'}
                                                                </span>
                                                                <div>
                                                                    <span className="font-bold text-slate-800 dark:text-slate-100">{sb.serviceType}</span>
                                                                    {sb.confirmationNumber && (
                                                                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">#{sb.confirmationNumber}</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Vendor */}
                                                        <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-slate-900 dark:text-white">{vendor?.name || 'Unknown Vendor'}</span>
                                                                    {vendor?.category && (
                                                                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 border border-slate-200 dark:border-slate-600">
                                                                            {vendor.category}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {vendor?.contactPhone && (
                                                                    <span className="text-xs text-slate-400 mt-0.5">{vendor.contactPhone}</span>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Cost */}
                                                        <td className="px-5 py-4 text-right font-bold text-slate-900 dark:text-white">
                                                            ₹{cost.toLocaleString()}
                                                        </td>

                                                        {/* Paid with Installment indicator */}
                                                        <td className="px-5 py-4 text-right">
                                                            <div className="flex flex-col items-end">
                                                                <span className="font-extrabold text-emerald-600">
                                                                    ₹{paid.toLocaleString()}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleExpand(sb.id)}
                                                                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5 mt-0.5 transition-colors"
                                                                    title="Click to view payment breakdown"
                                                                >
                                                                    <span className="material-symbols-outlined text-[13px]">receipt_long</span>
                                                                    <span>{payments.length} {payments.length === 1 ? 'part' : 'parts'}</span>
                                                                    <span className={`material-symbols-outlined text-[14px] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                                                        expand_more
                                                                    </span>
                                                                </button>
                                                            </div>
                                                        </td>

                                                        {/* Status */}
                                                        <td className="px-5 py-4 text-center">
                                                            <div className="flex flex-col items-center gap-1">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase
                                                                    ${sb.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                                        sb.paymentStatus === 'Partially Paid' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                                    {sb.paymentStatus}
                                                                </span>
                                                                {remaining > 0 && (
                                                                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                                                                        Due: ₹{remaining.toLocaleString()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Due Date */}
                                                        <td className="px-5 py-4 text-center text-slate-500 text-xs font-medium">
                                                            {sb.paymentDueDate ? new Date(sb.paymentDueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                                        </td>

                                                        {/* Actions */}
                                                        <td className="px-5 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                {/* Toggle installments ledger */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleExpand(sb.id)}
                                                                    className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all ${
                                                                        isExpanded
                                                                            ? 'bg-primary text-white border-primary shadow-sm'
                                                                            : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600'
                                                                    }`}
                                                                    title="View Payments Breakdown"
                                                                >
                                                                    <span className="material-symbols-outlined text-[15px]">history</span>
                                                                    <span>Parts ({payments.length})</span>
                                                                </button>

                                                                {/* Pay button */}
                                                                {hasPermission('bookings', 'manage') && isPayable && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPayingSupplierBooking(sb)}
                                                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all active:scale-95"
                                                                        title={`Record payment towards remaining balance of ₹${remaining.toLocaleString()}`}
                                                                    >
                                                                        <span className="material-symbols-outlined text-[15px]">payments</span>
                                                                        <span>Pay ₹{remaining.toLocaleString()}</span>
                                                                    </button>
                                                                )}

                                                                {hasPermission('bookings', 'manage') && (
                                                                    <>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleEdit(sb)}
                                                                            className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                                            title="Edit Booking"
                                                                        >
                                                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDelete(sb.id)}
                                                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                            title="Delete"
                                                                        >
                                                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {/* EXPANDABLE INSTALLMENTS LEDGER ROW */}
                                                    {isExpanded && (
                                                        <tr className="bg-slate-50/80 dark:bg-slate-900/70 border-y-2 border-primary/20">
                                                            <td colSpan={7} className="p-4 sm:p-5">
                                                                <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-md space-y-4 animate-in fade-in zoom-in-95 duration-150">
                                                                    {/* Expanded Header */}
                                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/80">
                                                                        <div className="flex items-center gap-2.5">
                                                                            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                                                                <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
                                                                            </div>
                                                                            <div>
                                                                                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                                                    <span>Payment Installment History</span>
                                                                                    <span className="text-xs font-semibold text-slate-400">
                                                                                        • {vendor?.name || 'Vendor'} ({sb.serviceType})
                                                                                    </span>
                                                                                </h4>
                                                                                <p className="text-[11px] text-slate-400">
                                                                                    Track all partial payments made, running balance, and payment mode
                                                                                </p>
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            {/* Share / Copy Summary Slip */}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleCopyPaymentSlip(sb, vendor?.name || 'Vendor')}
                                                                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                                                                                title="Copy formatted summary to send on WhatsApp"
                                                                            >
                                                                                <span className="material-symbols-outlined text-[16px]">content_copy</span>
                                                                                <span>{copiedRefId === `slip-${sb.id}` ? 'Copied Slip!' : 'Copy Summary Slip'}</span>
                                                                            </button>

                                                                            {/* Add Payment Button */}
                                                                            {hasPermission('bookings', 'manage') && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setPayingSupplierBooking(sb)}
                                                                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors active:scale-95"
                                                                                >
                                                                                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                                                                                    <span>+ Record New Payment</span>
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Progress & Milestone Bar */}
                                                                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                                                                        <div className="flex items-center justify-between text-xs font-bold">
                                                                            <span className="text-slate-600 dark:text-slate-300">
                                                                                Payment Progress: <strong className="text-emerald-600">{percentPaid}% Settled</strong>
                                                                            </span>
                                                                            <div className="flex items-center gap-3 text-[11px]">
                                                                                <span>Total: <strong className="text-slate-900 dark:text-white">₹{cost.toLocaleString()}</strong></span>
                                                                                <span>Paid: <strong className="text-emerald-600">₹{paid.toLocaleString()}</strong></span>
                                                                                <span>Due: <strong className={remaining > 0 ? 'text-amber-600' : 'text-slate-400'}>₹{remaining.toLocaleString()}</strong></span>
                                                                            </div>
                                                                        </div>
                                                                        {/* Progress bar track */}
                                                                        <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                            <div
                                                                                className={`h-full transition-all duration-300 ${
                                                                                    percentPaid >= 100
                                                                                        ? 'bg-emerald-500'
                                                                                        : percentPaid > 0
                                                                                            ? 'bg-gradient-to-r from-emerald-500 to-amber-500'
                                                                                            : 'bg-transparent'
                                                                                }`}
                                                                                style={{ width: `${percentPaid}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    {/* Installments Breakdown Table */}
                                                                    {payments.length === 0 ? (
                                                                        <div className="py-8 text-center text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                                                            <span className="material-symbols-outlined text-3xl text-slate-300 dark:text-slate-600 mb-1">payments</span>
                                                                            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No payments recorded yet</p>
                                                                            <p className="text-[11px] text-slate-400 mt-0.5">Click "+ Record New Payment" above to log an advance or partial installment.</p>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                                                                            <table className="w-full text-left text-xs min-w-[650px]">
                                                                                <thead className="bg-slate-100/80 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                                                                                    <tr>
                                                                                        <th className="px-3.5 py-2.5">#</th>
                                                                                        <th className="px-3.5 py-2.5">Date</th>
                                                                                        <th className="px-3.5 py-2.5 text-right">Amount Paid</th>
                                                                                        <th className="px-3.5 py-2.5">Payment Mode</th>
                                                                                        <th className="px-3.5 py-2.5">Transaction Ref / UTR</th>
                                                                                        <th className="px-3.5 py-2.5">Remarks / Notes</th>
                                                                                        <th className="px-3.5 py-2.5">Recorded By</th>
                                                                                        <th className="px-3.5 py-2.5 text-right">Balance After</th>
                                                                                        {hasPermission('bookings', 'manage') && (
                                                                                            <th className="px-3.5 py-2.5 text-center">Action</th>
                                                                                        )}
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 bg-white dark:bg-slate-800/40">
                                                                                    {(() => {
                                                                                        let runningPaid = 0;
                                                                                        return payments.map((p, idx) => {
                                                                                            runningPaid += Number(p.amount) || 0;
                                                                                            const runningBalance = Math.max(0, cost - runningPaid);
                                                                                            const isLegacy = p.id.startsWith('legacy-');

                                                                                            return (
                                                                                                <tr key={p.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                                                                                                    <td className="px-3.5 py-2.5 font-bold text-slate-700 dark:text-slate-300">
                                                                                                        Part {idx + 1}
                                                                                                    </td>
                                                                                                    <td className="px-3.5 py-2.5 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                                                                                                        {p.paymentDate && p.paymentDate !== '-'
                                                                                                            ? new Date(p.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                                                                                            : '-'}
                                                                                                    </td>
                                                                                                    <td className="px-3.5 py-2.5 text-right font-black text-emerald-600 whitespace-nowrap text-sm">
                                                                                                        ₹{Number(p.amount || 0).toLocaleString()}
                                                                                                    </td>
                                                                                                    <td className="px-3.5 py-2.5">
                                                                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                                                                                            p.paymentMethod === 'UPI' ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300' :
                                                                                                            p.paymentMethod === 'Bank Transfer' ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300' :
                                                                                                            p.paymentMethod === 'Cash' ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300' :
                                                                                                            'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-700 dark:text-slate-300'
                                                                                                        }`}>
                                                                                                            {p.paymentMethod || 'Other'}
                                                                                                        </span>
                                                                                                    </td>
                                                                                                    <td className="px-3.5 py-2.5">
                                                                                                        {p.reference ? (
                                                                                                            <div className="flex items-center gap-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                                                                                                                <span>{p.reference}</span>
                                                                                                                <button
                                                                                                                    type="button"
                                                                                                                    onClick={() => handleCopyText(p.reference || '', `ref-${p.id}`, 'UTR / Ref copied')}
                                                                                                                    className="p-0.5 text-slate-400 hover:text-primary transition-colors"
                                                                                                                    title="Copy Reference"
                                                                                                                >
                                                                                                                    <span className="material-symbols-outlined text-[13px]">
                                                                                                                        {copiedRefId === `ref-${p.id}` ? 'check' : 'content_copy'}
                                                                                                                    </span>
                                                                                                                </button>
                                                                                                            </div>
                                                                                                        ) : (
                                                                                                            <span className="text-slate-400 italic text-[11px]">N/A</span>
                                                                                                        )}
                                                                                                    </td>
                                                                                                    <td className="px-3.5 py-2.5 max-w-[200px] truncate text-slate-600 dark:text-slate-300" title={p.notes || ''}>
                                                                                                        {p.notes || '-'}
                                                                                                    </td>
                                                                                                    <td className="px-3.5 py-2.5 text-slate-500 text-[11px]">
                                                                                                        {p.recordedBy || 'Staff'}
                                                                                                    </td>
                                                                                                    <td className="px-3.5 py-2.5 text-right font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                                                                        ₹{runningBalance.toLocaleString()}
                                                                                                    </td>
                                                                                                    {hasPermission('bookings', 'manage') && (
                                                                                                        <td className="px-3.5 py-2.5 text-center">
                                                                                                            {!isLegacy && (
                                                                                                                <button
                                                                                                                    type="button"
                                                                                                                    onClick={() => handleDeletePayment(sb, p)}
                                                                                                                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                                                                                    title="Remove this installment"
                                                                                                                >
                                                                                                                    <span className="material-symbols-outlined text-[15px]">delete</span>
                                                                                                                </button>
                                                                                                            )}
                                                                                                        </td>
                                                                                                    )}
                                                                                                </tr>
                                                                                            );
                                                                                        });
                                                                                    })()}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <SupplierBookingModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                bookingId={booking.id}
                existingBooking={editingSupplierBooking}
            />

            <SupplierPaymentModal
                isOpen={!!payingSupplierBooking}
                onClose={() => setPayingSupplierBooking(null)}
                booking={booking}
                supplierBooking={payingSupplierBooking}
                vendor={vendors.find(v => v.id === payingSupplierBooking?.vendorId)}
            />
        </div>
    );
};

