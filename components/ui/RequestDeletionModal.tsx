import React, { useState } from 'react';
import { api } from "../../src/lib/api";
import { toast } from 'sonner';

interface RequestDeletionModalProps {
    isOpen: boolean;
    onClose: () => void;
    tableName: string;
    recordId: string;
    recordName: string;
}

export const RequestDeletionModal: React.FC<RequestDeletionModalProps> = ({
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
            toast.error('Please provide a reason for deletion');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.requestDeletion(tableName, recordId, recordName, reason);
            toast.success('Deletion request submitted to Administrator');
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to submit request');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-[#1A2633] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-orange-50/50 dark:bg-orange-900/10 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                        <span className="material-symbols-outlined text-[20px]">warning</span>
                        <h2 className="text-lg font-bold">Request Deletion</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        You are requesting to delete <span className="font-bold text-slate-900 dark:text-white">"{recordName}"</span>. 
                        This action requires Administrator approval.
                    </p>

                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Reason for Deletion</label>
                        <textarea
                            autoFocus
                            required
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Please explain why this record should be permanently deleted..."
                            className="w-full h-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                        ></textarea>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70 pointer-events-none' : ''}`}
                        >
                            {isSubmitting ? (
                                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                            ) : (
                                <span className="material-symbols-outlined text-[18px]">send</span>
                            )}
                            Submit Request
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
