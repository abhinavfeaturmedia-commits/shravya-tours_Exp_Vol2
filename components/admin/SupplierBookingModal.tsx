import React, { useState, useEffect } from 'react';
import { SupplierBooking, SupplierBookingStatus, Vendor } from '../../types';
import { useData } from '../../context/DataContext';

interface SupplierBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookingId: string;
    existingBooking?: SupplierBooking | null;
}

export const SupplierBookingModal: React.FC<SupplierBookingModalProps> = ({ isOpen, onClose, bookingId, existingBooking }) => {
    const { vendors, addSupplierBooking, updateSupplierBooking } = useData();

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const newBooking: SupplierBooking = {
            id: existingBooking?.id || `SB-${Date.now()}`,
            bookingId,
            vendorId: formData.vendorId!,
            serviceType: formData.serviceType as any,
            confirmationNumber: formData.confirmationNumber,
            cost: Number(formData.cost),
            paidAmount: Number(formData.paidAmount),
            paymentStatus: formData.paymentStatus as any,
            bookingStatus: formData.bookingStatus as any,
            paymentDueDate: formData.paymentDueDate,
            notes: formData.notes
        };

        if (existingBooking) {
            updateSupplierBooking(bookingId, existingBooking.id, newBooking);
        } else {
            addSupplierBooking(bookingId, newBooking);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-[#1A2633] w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{existingBooking ? 'Edit Supplier Booking' : 'Add Supplier Booking'}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Vendor Selection */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Select Vendor</label>
                        <select
                            required
                            value={formData.vendorId}
                            onChange={e => setFormData({ ...formData, vendorId: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="">Select a Vendor...</option>
                            {vendors.map(v => (
                                <option key={v.id} value={v.id}>{v.name} ({v.category})</option>
                            ))}
                        </select>
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
                                value={formData.cost}
                                onChange={e => setFormData({ ...formData, cost: Number(e.target.value) })}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500">Paid Amount (₹)</label>
                            <input
                                type="number"
                                value={formData.paidAmount}
                                onChange={e => setFormData({ ...formData, paidAmount: Number(e.target.value) })}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500">Payment Status</label>
                            <select
                                value={formData.paymentStatus}
                                onChange={e => setFormData({ ...formData, paymentStatus: e.target.value as any })}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
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

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 transition-colors">Cancel</button>
                        <button type="submit" className="px-5 py-2 rounded-xl bg-primary text-white font-bold hover:bg-primary-dark transition-colors">Save Supplier Booking</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
