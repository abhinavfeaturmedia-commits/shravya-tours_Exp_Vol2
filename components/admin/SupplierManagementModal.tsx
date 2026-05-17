import React, { useState } from 'react';
import { Booking, SupplierBooking } from '../../types';
import { useData } from '../../context/DataContext';
import { SupplierBookingModal } from './SupplierBookingModal';
import { useAuth } from '../../context/AuthContext';

interface SupplierManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: Booking;
}

export const SupplierManagementModal: React.FC<SupplierManagementModalProps> = ({ isOpen, onClose, booking }) => {
    const { vendors, deleteSupplierBooking } = useData();
    const { hasPermission } = useAuth();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingSupplierBooking, setEditingSupplierBooking] = useState<SupplierBooking | null>(null);

    const supplierBookings = booking.supplierBookings || [];

    const totalCost = supplierBookings.reduce((acc, sb) => acc + sb.cost, 0);
    const totalPaid = supplierBookings.reduce((acc, sb) => acc + sb.paidAmount, 0);
    const balanceDue = totalCost - totalPaid;

    const handleEdit = (sb: SupplierBooking) => {
        setEditingSupplierBooking(sb);
        setIsFormOpen(true);
    };

    const handleDelete = (sbId: string) => {
        if (window.confirm('Are you sure you want to delete this supplier booking?')) {
            deleteSupplierBooking(booking.id, sbId);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-[#1A2633] w-full max-w-4xl rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 h-[95vh] sm:h-[80vh]">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Supplier Management</h2>
                        <p className="text-xs text-slate-500 font-bold uppercase mt-1">Booking: {booking.id} - {booking.title}</p>
                    </div>
                    <div className="flex gap-3">
                        {hasPermission('bookings', 'manage') && (
                            <button
                                onClick={() => { setEditingSupplierBooking(null); setIsFormOpen(true); }}
                                className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/30 hover:bg-primary-dark transition-colors flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[20px]">add</span> Add Supplier
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                            <p className="text-xs font-bold text-slate-500 uppercase">Total Cost</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">₹{totalCost.toLocaleString()}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30">
                            <p className="text-xs font-bold text-emerald-600 uppercase">Total Paid</p>
                            <p className="text-2xl font-black text-emerald-600 mt-1">₹{totalPaid.toLocaleString()}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30">
                            <p className="text-xs font-bold text-amber-600 uppercase">Balance Due</p>
                            <p className="text-2xl font-black text-amber-600 mt-1">₹{balanceDue.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-x-auto hide-scrollbar">
                        <table className="w-full text-left text-sm min-w-[700px]">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-5 py-4">Service</th>
                                    <th className="px-5 py-4">Vendor</th>
                                    <th className="px-5 py-4 text-right">Cost</th>
                                    <th className="px-5 py-4 text-right">Paid</th>
                                    <th className="px-5 py-4 text-center">Status</th>
                                    <th className="px-5 py-4 text-center">Due Date</th>
                                    <th className="px-5 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {supplierBookings.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-8 text-center text-slate-400 italic">No suppliers added yet.</td>
                                    </tr>
                                ) : (
                                    supplierBookings.map(sb => {
                                        const vendor = vendors.find(v => v.id === sb.vendorId);
                                        return (
                                            <tr key={sb.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`material-symbols-outlined text-[18px] 
                                                            ${sb.serviceType === 'Flight' ? 'text-blue-500' :
                                                                sb.serviceType === 'Hotel' ? 'text-purple-500' :
                                                                    'text-orange-500'}`}>
                                                            {sb.serviceType === 'Flight' ? 'flight' : sb.serviceType === 'Hotel' ? 'hotel' : 'local_activity'}
                                                        </span>
                                                        {sb.serviceType}
                                                    </div>
                                                    {sb.confirmationNumber && <div className="text-xs text-slate-500 mt-0.5 font-mono">#{sb.confirmationNumber}</div>}
                                                </td>
                                                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                                                    {vendor?.name || 'Unknown Vendor'}
                                                </td>
                                                <td className="px-5 py-4 text-right font-bold text-slate-900 dark:text-white">₹{sb.cost.toLocaleString()}</td>
                                                <td className="px-5 py-4 text-right font-medium text-emerald-600">₹{sb.paidAmount.toLocaleString()}</td>
                                                <td className="px-5 py-4 text-center">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase
                                                        ${sb.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                            sb.paymentStatus === 'Partially Paid' ? 'bg-amber-100 text-amber-700' :
                                                                'bg-red-100 text-red-700'}`}>
                                                        {sb.paymentStatus}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-center text-slate-500 text-sm">
                                                    {sb.paymentDueDate ? new Date(sb.paymentDueDate).toLocaleDateString() : '-'}
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        {hasPermission('bookings', 'manage') && (
                                                            <>
                                                                <button onClick={() => handleEdit(sb)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                                </button>
                                                                <button onClick={() => handleDelete(sb.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <SupplierBookingModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                bookingId={booking.id}
                existingBooking={editingSupplierBooking}
            />
        </div>
    );
};
