import React, { useState, useEffect, useMemo } from 'react';
import { Booking, SupplierBooking, Vendor } from '../../types';
import { useData } from '../../context/DataContext';

interface SupplierPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: Booking;
    supplierBooking: SupplierBooking | null;
    vendor?: Vendor;
}

export const SupplierPaymentModal: React.FC<SupplierPaymentModalProps> = ({
    isOpen,
    onClose,
    booking,
    supplierBooking,
    vendor
}) => {
    const { recordSupplierPayment } = useData();

    const [amount, setAmount] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<string>('UPI');
    const [paymentDate, setPaymentDate] = useState<string>('');
    const [reference, setReference] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const cost = Number(supplierBooking?.cost) || 0;
    const paidAmount = Number(supplierBooking?.paidAmount) || 0;
    const balanceDue = Math.max(0, cost - paidAmount);

    useEffect(() => {
        if (isOpen && supplierBooking) {
            setAmount(balanceDue > 0 ? String(balanceDue) : '0');
            setPaymentMethod('UPI');
            setPaymentDate(new Date().toISOString().split('T')[0]);
            setReference('');
            setNotes('');
            setIsSubmitting(false);
        }
    }, [isOpen, supplierBooking, balanceDue]);

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(label);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supplierBooking || isSubmitting) return;

        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            alert('Please enter a valid payment amount greater than ₹0.');
            return;
        }

        if (numAmount > balanceDue) {
            const confirmed = window.confirm(
                `The amount entered (₹${numAmount.toLocaleString()}) is higher than the remaining balance (₹${balanceDue.toLocaleString()}). Do you wish to proceed?`
            );
            if (!confirmed) return;
        }

        setIsSubmitting(true);
        try {
            await recordSupplierPayment(booking.id, supplierBooking.id, {
                amount: numAmount,
                paymentMethod,
                paymentDate,
                reference: reference.trim(),
                notes: notes.trim()
            });
            onClose();
        } catch (error) {
            console.error('Failed to submit supplier payment:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !supplierBooking) return null;

    const numAmt = Number(amount) || 0;
    const projectedRemaining = Math.max(0, balanceDue - numAmt);

    return (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-in fade-in overflow-y-auto">
            <div className="bg-white dark:bg-[#1A2633] w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 my-auto">
                {/* Header */}
                <div className="px-5 py-4 sm:px-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[20px]">payments</span>
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                                Pay Supplier / Vendor
                            </h2>
                            <p className="text-[11px] text-slate-400 font-medium truncate max-w-[280px] sm:max-w-md">
                                Booking: {booking.id} • {booking.title}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                    <div className="p-5 sm:p-6 space-y-4 flex-1 overflow-y-auto scrollbar-thin">
                        {/* Vendor & Service Info Card */}
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                        {vendor?.name || 'Vendor'}
                                    </span>
                                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
                                        {supplierBooking.serviceType}
                                    </span>
                                </div>
                                {supplierBooking.confirmationNumber && (
                                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                        Ref / Conf: #{supplierBooking.confirmationNumber}
                                    </p>
                                )}
                            </div>

                            {vendor?.contactPhone && (
                                <a
                                    href={`tel:${vendor.contactPhone}`}
                                    className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center gap-1 shrink-0"
                                >
                                    <span className="material-symbols-outlined text-[14px]">call</span>
                                    <span>{vendor.contactPhone}</span>
                                </a>
                            )}
                        </div>

                        {/* Bank / UPI Quick Copy Info (if available on vendor) */}
                        {vendor?.bankDetails && (vendor.bankDetails.upiId || vendor.bankDetails.accountNumber) && (
                            <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs space-y-1.5">
                                <p className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">account_balance</span>
                                    Vendor Payout Details
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                                    {vendor.bankDetails.upiId && (
                                        <div className="flex items-center justify-between bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-blue-200/60 dark:border-blue-800/40">
                                            <span className="text-slate-500 truncate">UPI: <strong className="text-slate-800 dark:text-slate-200 font-mono">{vendor.bankDetails.upiId}</strong></span>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(vendor.bankDetails?.upiId || '', 'upi')}
                                                className="text-[10px] text-primary font-bold hover:underline shrink-0 ml-1"
                                            >
                                                {copiedField === 'upi' ? 'Copied!' : 'Copy'}
                                            </button>
                                        </div>
                                    )}
                                    {vendor.bankDetails.accountNumber && (
                                        <div className="flex items-center justify-between bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-blue-200/60 dark:border-blue-800/40">
                                            <span className="text-slate-500 truncate">A/C: <strong className="text-slate-800 dark:text-slate-200 font-mono">{vendor.bankDetails.accountNumber}</strong></span>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(vendor.bankDetails?.accountNumber || '', 'ac')}
                                                className="text-[10px] text-primary font-bold hover:underline shrink-0 ml-1"
                                            >
                                                {copiedField === 'ac' ? 'Copied!' : 'Copy'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Balance Summary Grid */}
                        <div className="grid grid-cols-3 gap-2.5 text-center">
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Total Cost</p>
                                <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">₹{cost.toLocaleString()}</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40">
                                <p className="text-[10px] font-bold text-emerald-600 uppercase">Already Paid</p>
                                <p className="text-sm font-black text-emerald-600 mt-0.5">₹{paidAmount.toLocaleString()}</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
                                <p className="text-[10px] font-bold text-amber-600 uppercase">Remaining Due</p>
                                <p className="text-sm font-black text-amber-600 mt-0.5">₹{balanceDue.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Amount to Pay */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                    Payment Amount (₹) <span className="text-red-500">*</span>
                                </label>
                                {balanceDue > 0 && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setAmount(String(balanceDue))}
                                            className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors"
                                        >
                                            Pay Full Balance (₹{balanceDue.toLocaleString()})
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                                    ₹
                                </span>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="Enter amount..."
                                    className="w-full pl-8 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                            {numAmt > 0 && (
                                <p className="text-[11px] text-slate-400">
                                    Remaining after this payment:{' '}
                                    <strong className={projectedRemaining === 0 ? 'text-emerald-600' : 'text-amber-600'}>
                                        ₹{projectedRemaining.toLocaleString()} {projectedRemaining === 0 ? '(Fully Paid)' : ''}
                                    </strong>
                                </p>
                            )}
                        </div>

                        {/* Payment Method & Date */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Payment Mode</label>
                                <select
                                    value={paymentMethod}
                                    onChange={e => setPaymentMethod(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary font-medium"
                                >
                                    <option value="UPI">UPI / QR Code</option>
                                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                                    <option value="Cash">Cash</option>
                                    <option value="Cheque">Cheque</option>
                                    <option value="Credit Card">Credit Card</option>
                                    <option value="Net Banking">Net Banking</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Payment Date</label>
                                <input
                                    type="date"
                                    required
                                    value={paymentDate}
                                    onChange={e => setPaymentDate(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                        </div>

                        {/* Transaction Reference / UTR # */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                Transaction Reference / UTR #
                            </label>
                            <input
                                type="text"
                                value={reference}
                                onChange={e => setReference(e.target.value)}
                                placeholder="e.g. UPI/123456789 or Cheque #001234"
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary font-mono text-xs"
                            />
                        </div>

                        {/* Notes */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Payment Remarks / Notes</label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Internal remarks regarding this payment..."
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary h-16 resize-none"
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
                            disabled={isSubmitting || numAmt <= 0}
                            className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-60 flex items-center gap-2 text-sm"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                    <span>Confirm Payment (₹{numAmt.toLocaleString()})</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
