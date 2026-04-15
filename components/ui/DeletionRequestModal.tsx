import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../src/lib/api';
import { toast } from 'sonner';

interface DeletionRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    tableName: string;
    recordId: string;
    recordName: string;
}

export const DeletionRequestModal: React.FC<DeletionRequestModalProps> = ({
    isOpen,
    onClose,
    tableName,
    recordId,
    recordName
}) => {
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) {
            toast.error("Please provide a reason for deletion");
            return;
        }

        setIsSubmitting(true);
        try {
            await api.requestDeletion(tableName, recordId, recordName, reason);
            toast.success("Deletion request submitted to Admin");
            onClose();
        } catch (error: any) {
            toast.error(error.message || "Failed to submit deletion request");
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-orange-500">warning</span>
                        Deletion Request
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                        As a staff member, you need admin approval to delete records.
                        Please provide a reason for deleting <strong>{recordName}</strong>.
                    </p>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Reason for Deletion <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Why does this record need to be deleted?"
                            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none h-24"
                            required
                        />
                    </div>
                    
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors font-medium"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors font-medium flex items-center gap-2"
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
