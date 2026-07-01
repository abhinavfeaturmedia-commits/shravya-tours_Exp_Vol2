import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../src/lib/api';
import { toast } from 'sonner';
import { StaffMember } from '../../types';

interface TransferRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    itemType: 'Lead' | 'Booking';
    itemId: string;
    itemName: string;
    staffList: StaffMember[];
    currentAssigneeId?: number;
    onSuccess?: () => void;
}

export const TransferRequestModal: React.FC<TransferRequestModalProps> = ({
    isOpen,
    onClose,
    itemType,
    itemId,
    itemName,
    staffList,
    currentAssigneeId,
    onSuccess
}) => {
    const [targetStaffId, setTargetStaffId] = useState<string>('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    // Filter out current owner & inactive staff
    const eligibleStaff = staffList.filter(s => 
        s.status === 'Active' && 
        String(s.id) !== String(currentAssigneeId)
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetStaffId) {
            toast.error("Please select a recipient staff member");
            return;
        }
        if (!reason.trim()) {
            toast.error("Please provide a reason for the transfer");
            return;
        }

        setIsSubmitting(true);
        try {
            await api.requestTransfer(itemType, itemId, Number(targetStaffId), reason);
            toast.success("Transfer request submitted to Admin");
            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || "Failed to submit transfer request");
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">move_item</span>
                        Request Ownership Transfer
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                        Transfer ownership of <strong>{itemName}</strong>. This request requires admin verification before taking effect.
                    </p>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                            Transfer To <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={targetStaffId}
                            onChange={(e) => setTargetStaffId(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-medium text-sm"
                            required
                        >
                            <option value="">Select recipient staff...</option>
                            {eligibleStaff.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                            Reason for Transfer <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Bob is handling this region / I am on leave next week..."
                            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none h-24 text-sm"
                            required
                        />
                    </div>
                    
                    <div className="flex justify-end gap-3 mt-6 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors font-medium text-sm"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl transition-colors font-bold text-sm flex items-center gap-2 shadow-md"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                            ) : (
                                <span className="material-symbols-outlined text-[20px]">send</span>
                            )}
                            Submit Request
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};
