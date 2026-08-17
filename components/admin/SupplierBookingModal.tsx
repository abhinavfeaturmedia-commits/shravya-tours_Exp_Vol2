import React, { useState, useEffect } from 'react';
import { SupplierBooking, SupplierBookingStatus, Vendor } from '../../types';
import { useData } from '../../context/DataContext';
import { VendorSearchSelect } from './VendorSearchSelect';

interface SupplierBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookingId: string;
    existingBooking?: SupplierBooking | null;
}

export const SupplierBookingModal: React.FC<SupplierBookingModalProps> = ({ isOpen, onClose, bookingId, existingBooking }) => {
    const { vendors, addSupplierBooking, updateSupplierBooking } = useData();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<Partial<SupplierBooking>>({
        vendorId: '',
        serviceType: 'Hotel',
        confirmationNumber: '',
        cost: 0,
        paidAmount: 0,
        paymentStatus: 'Unpaid',
        bookingStatus: 'Pending',
        paymentDueDate: '',
        notes: ''
    });

    useEffect(() => {
        if (existingBooking) {
            setFormData(existingBooking);
        } else {
            setFormData({
                vendorId: '',
                serviceType: 'Hotel',
                confirmationNumber: '',
                cost: 0,
                paidAmount: 0,
                paymentStatus: 'Unpaid',
                bookingStatus: 'Pending',
                paymentDueDate: '',
                notes: ''
            });
        }
    }, [existingBooking, isOpen]);

    const handleVendorSelect = (vendor: Vendor | null) => {
        if (!vendor) {
            setFormData(prev => ({ ...prev, vendorId: '' }));
            return;
        }

        // Smart Category Sync: Auto-align serviceType with vendor category
        let inferredServiceType: SupplierBooking['serviceType'] = formData.serviceType || 'Hotel';
        if (vendor.category === 'Hotel') {
            inferredServiceType = 'Hotel';
        } else if (vendor.category === 'Transport') {
            if (vendor.subCategory === 'Flight' || vendor.name.toLowerCase().includes('flight')) {
                inferredServiceType = 'Flight';
            } else {
                inferredServiceType = 'Transport';
            }
        } else if (vendor.category === 'Activity' || vendor.category === 'Guide') {
            inferredServiceType = 'Activity';
        } else if (vendor.category === 'DMC') {
            inferredServiceType = formData.serviceType || 'Other';
        }

        setFormData(prev => ({
            ...prev,
            vendorId: vendor.id,
            serviceType: inferredServiceType
        }));
    };

    const calculatePaymentStatus = (cost: number, paid: number): 'Unpaid' | 'Partially Paid' | 'Paid' | 'Refunded' => {
        const numCost = Number(cost) || 0;
        const numPaid = Number(paid) || 0;

        if (numCost <= 0) {
            return numPaid > 0 ? 'Paid' : 'Unpaid';
        }
        if (numPaid <= 0) {
            return 'Unpaid';
        }
        if (numPaid >= numCost) {
            return 'Paid';
        }
        return 'Partially Paid';
    };

    const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = Number(e.target.value);
        const newCost = isNaN(val) ? 0 : val;
        const currentPaid = Number(formData.paidAmount) || 0;
        const autoStatus = formData.paymentStatus === 'Refunded' ? 'Refunded' : calculatePaymentStatus(newCost, currentPaid);
        setFormData(prev => ({
            ...prev,
            cost: newCost,
            paymentStatus: autoStatus
        }));
    };

    const handlePaidAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = Number(e.target.value);
        const newPaid = isNaN(val) ? 0 : val;
        const currentCost = Number(formData.cost) || 0;
        const autoStatus = formData.paymentStatus === 'Refunded' ? 'Refunded' : calculatePaymentStatus(currentCost, newPaid);
        setFormData(prev => ({
            ...prev,
            paidAmount: newPaid,
            paymentStatus: autoStatus
        }));
    };

    const totalCost = Number(formData.cost) || 0;
    const paidAmt = Number(formData.paidAmount) || 0;
    const balanceDue = totalCost - paidAmt;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        if (!formData.vendorId) {
            alert('Please select a vendor.');
            return;
        }

        setIsSubmitting(true);
        const autoPaymentStatus = formData.paymentStatus === 'Refunded' ? 'Refunded' : calculatePaymentStatus(Number(formData.cost), Number(formData.paidAmount));

        const newBooking: SupplierBooking = {
            id: existingBooking?.id || `SB-${Date.now()}`,
            bookingId,
            vendorId: formData.vendorId!,
            serviceType: formData.serviceType as any,
            confirmationNumber: formData.confirmationNumber,
            cost: Number(formData.cost),
            paidAmount: Number(formData.paidAmount),
            paymentStatus: (formData.paymentStatus || autoPaymentStatus) as any,
            bookingStatus: formData.bookingStatus as any,
            paymentDueDate: formData.paymentDueDate,
            notes: formData.notes
        };

        try {
            if (existingBooking) {
                await updateSupplierBooking(bookingId, existingBooking.id, newBooking);
            } else {
                await addSupplierBooking(bookingId, newBooking);
            }
            onClose();
        } catch (error) {
            console.error('Failed to save supplier booking:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
            <div className="bg-white dark:bg-[#1A2633] w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 my-auto">
                {/* Fixed Header */}
                <div className="px-5 py-4 sm:px-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 shrink-0">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        {existingBooking ? 'Edit Supplier Booking' : 'Add Supplier Booking'}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                {/* Form with Scrollable Content and Sticky Action Footer */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                    {/* Scrollable Form Body */}
                    <div className="p-5 sm:p-6 space-y-4 flex-1 overflow-y-auto scrollbar-thin">
                        {/* Vendor Selection with Search & Categories */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 flex items-center justify-between">
                                <span>Select Vendor <span className="text-red-500">*</span></span>
                                <span className="text-[10px] text-slate-400 font-medium">Search by name, category, city</span>
                            </label>
                            <VendorSearchSelect
                                vendors={vendors}
                                selectedVendorId={formData.vendorId}
                                onSelect={handleVendorSelect}
                                activeServiceType={formData.serviceType}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">Service Type</label>
                                <select
                                    value={formData.serviceType}
                                    onChange={e => setFormData({ ...formData, serviceType: e.target.value as any })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="Hotel">Hotel</option>
                                    <option value="Transport">Transport</option>
                                    <option value="Flight">Flight</option>
                                    <option value="Activity">Activity</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">Confirmation #</label>
                                <input
                                    type="text"
                                    value={formData.confirmationNumber}
                                    onChange={e => setFormData({ ...formData, confirmationNumber: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="e.g. H-12345"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">Total Cost (₹)</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={formData.cost}
                                    onChange={handleCostChange}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">Paid Amount (₹)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.paidAmount}
                                    onChange={handlePaidAmountChange}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-500">Payment Status</label>
                                    {totalCost > 0 && (
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                            formData.paymentStatus === 'Paid'
                                                ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                : formData.paymentStatus === 'Partially Paid'
                                                    ? 'text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400'
                                                    : 'text-rose-700 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400'
                                        }`}>
                                            {formData.paymentStatus === 'Paid'
                                                ? '✓ Fully Settled'
                                                : `Due: ₹${Math.max(0, balanceDue).toLocaleString()}`}
                                        </span>
                                    )}
                                </div>
                                <select
                                    value={formData.paymentStatus}
                                    onChange={e => setFormData({ ...formData, paymentStatus: e.target.value as any })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary font-medium"
                                >
                                    <option value="Unpaid">Unpaid</option>
                                    <option value="Partially Paid">Partially Paid</option>
                                    <option value="Paid">Paid</option>
                                    <option value="Refunded">Refunded</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">Booking Status</label>
                                <select
                                    value={formData.bookingStatus}
                                    onChange={e => setFormData({ ...formData, bookingStatus: e.target.value as any })}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="Confirmed">Confirmed</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500">Payment Due Date</label>
                            <input
                                type="date"
                                value={formData.paymentDueDate}
                                onChange={e => setFormData({ ...formData, paymentDueDate: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500">Notes</label>
                            <textarea
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary h-20 resize-none"
                                placeholder="Internal notes..."
                            />
                        </div>
                    </div>

                    {/* Fixed Action Footer */}
                    <div className="p-4 sm:px-6 sm:py-3.5 border-t border-slate-100 dark:border-slate-700/80 bg-slate-50/90 dark:bg-slate-800/60 flex justify-end items-center gap-3 shrink-0">
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={onClose}
                            className="px-5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-5 py-2 rounded-xl bg-primary text-white font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20 disabled:opacity-60 flex items-center gap-2 text-sm"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    Saving...
                                </>
                            ) : (
                                'Save Supplier Booking'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

