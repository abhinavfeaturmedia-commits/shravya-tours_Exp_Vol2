import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SupplierBooking, SupplierBookingStatus, Vendor } from '../../types';
import { useData } from '../../context/DataContext';
import { VendorSearchSelect } from './VendorSearchSelect';

interface SupplierBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookingId: string;
    existingBooking?: SupplierBooking | null;
}

const SERVICE_OPTIONS = [
    { id: 'Hotel', label: 'Hotel', icon: 'hotel', color: 'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800' },
    { id: 'Transport', label: 'Transport', icon: 'directions_car', color: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800' },
    { id: 'Flight', label: 'Flight', icon: 'flight', color: 'text-sky-600 bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800' },
    { id: 'Activity', label: 'Activity', icon: 'local_activity', color: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' },
    { id: 'Guide', label: 'Guide', icon: 'person_pin', color: 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800' },
    { id: 'Other', label: 'Other', icon: 'category', color: 'text-slate-600 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' }
] as const;

const parseServices = (val?: string): { services: string[]; customOther: string } => {
    if (!val) return { services: [], customOther: '' };
    const parts = val.split(/\s*\+\s*|\s*,\s*/).map(s => s.trim()).filter(Boolean);
    let customOther = '';
    const standardKeys = ['Hotel', 'Transport', 'Flight', 'Activity', 'Guide'];
    const services: string[] = [];

    parts.forEach(part => {
        if (standardKeys.includes(part)) {
            services.push(part);
        } else if (part.startsWith('Other') || part.includes('Other (')) {
            services.push('Other');
            const match = part.match(/Other\s*\((.*?)\)/i) || part.match(/Other:\s*(.*)/i);
            if (match && match[1]) {
                customOther = match[1].trim();
            }
        } else if (part === 'Other') {
            services.push('Other');
        } else {
            services.push(part);
        }
    });

    return { services, customOther };
};

const formatServices = (services: string[], customOther?: string): string => {
    return services.map(s => {
        if (s === 'Other' && customOther && customOther.trim()) {
            return `Other (${customOther.trim()})`;
        }
        return s;
    }).join(' + ');
};

export const SupplierBookingModal: React.FC<SupplierBookingModalProps> = ({ isOpen, onClose, bookingId, existingBooking }) => {
    const { vendors, addSupplierBooking, updateSupplierBooking } = useData();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
    const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
    const [customOtherText, setCustomOtherText] = useState('');
    const serviceDropdownRef = useRef<HTMLDivElement>(null);

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

    const selectedVendor = useMemo(() => {
        return vendors.find(v => v.id === formData.vendorId) || null;
    }, [vendors, formData.vendorId]);

    const isDmcVendor = selectedVendor?.category === 'DMC';
    const isMultiMode = isDmcVendor || isMultiSelectMode || (formData.serviceType?.includes('+') ?? false);

    const { services: selectedServices } = useMemo(() => {
        return parseServices(formData.serviceType);
    }, [formData.serviceType]);

    // Handle outside click for service dropdown popover
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(e.target as Node)) {
                setServiceDropdownOpen(false);
            }
        };
        if (serviceDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [serviceDropdownOpen]);

    useEffect(() => {
        if (existingBooking) {
            setFormData(existingBooking);
            const { services, customOther } = parseServices(existingBooking.serviceType);
            setCustomOtherText(customOther);
            const v = vendors.find(x => x.id === existingBooking.vendorId);
            if (v?.category === 'DMC' || existingBooking.serviceType?.includes('+') || services.length > 1) {
                setIsMultiSelectMode(true);
            } else {
                setIsMultiSelectMode(false);
            }
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
            setIsMultiSelectMode(false);
            setCustomOtherText('');
        }
        setServiceDropdownOpen(false);
    }, [existingBooking, isOpen, vendors]);

    const handleVendorSelect = (vendor: Vendor | null) => {
        if (!vendor) {
            setFormData(prev => ({ ...prev, vendorId: '' }));
            return;
        }

        // Smart Category Sync: Auto-align serviceType with vendor category
        let inferredServiceType: string = formData.serviceType || 'Hotel';
        if (vendor.category === 'Hotel') {
            inferredServiceType = 'Hotel';
            setIsMultiSelectMode(false);
        } else if (vendor.category === 'Transport') {
            if (vendor.subCategory === 'Flight' || vendor.name.toLowerCase().includes('flight')) {
                inferredServiceType = 'Flight';
            } else {
                inferredServiceType = 'Transport';
            }
            setIsMultiSelectMode(false);
        } else if (vendor.category === 'Activity' || vendor.category === 'Guide') {
            inferredServiceType = 'Activity';
            setIsMultiSelectMode(false);
        } else if (vendor.category === 'DMC') {
            setIsMultiSelectMode(true);
            const { services } = parseServices(formData.serviceType);
            if (services.length > 1) {
                inferredServiceType = formData.serviceType!;
            } else if (formData.serviceType && formData.serviceType !== 'Hotel') {
                inferredServiceType = `${formData.serviceType} + Transport`;
            } else {
                // Primary DMC default bundle: Hotel + Transport + Flight
                inferredServiceType = 'Hotel + Transport + Flight';
            }
        }

        setFormData(prev => ({
            ...prev,
            vendorId: vendor.id,
            serviceType: inferredServiceType
        }));
    };

    const toggleService = (serviceId: string) => {
        let next: string[];
        if (selectedServices.includes(serviceId)) {
            next = selectedServices.filter(s => s !== serviceId);
        } else {
            const canonicalOrder = ['Hotel', 'Transport', 'Flight', 'Activity', 'Guide', 'Other'];
            const set = new Set([...selectedServices, serviceId]);
            next = canonicalOrder.filter(s => set.has(s));
            selectedServices.forEach(s => {
                if (!canonicalOrder.includes(s) && !next.includes(s)) next.push(s);
            });
        }
        const formatted = formatServices(next, customOtherText);
        setFormData(prev => ({
            ...prev,
            serviceType: formatted
        }));
    };

    const applyPreset = (services: string[]) => {
        const formatted = formatServices(services, customOtherText);
        setFormData(prev => ({
            ...prev,
            serviceType: formatted
        }));
    };

    const handleCustomOtherChange = (customVal: string) => {
        setCustomOtherText(customVal);
        if (selectedServices.includes('Other')) {
            const formatted = formatServices(selectedServices, customVal);
            setFormData(prev => ({ ...prev, serviceType: formatted }));
        }
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

        if (!formData.serviceType || formData.serviceType.trim() === '') {
            alert('Please select at least one service type.');
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                                        <span>Service Type</span>
                                        {isDmcVendor ? (
                                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-0.5">
                                                <span className="material-symbols-outlined text-[12px]">hub</span>
                                                DMC Multi-Service
                                            </span>
                                        ) : isMultiMode ? (
                                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                Multi-Service
                                            </span>
                                        ) : null}
                                    </label>
                                    {!isDmcVendor && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!isMultiMode) {
                                                    setIsMultiSelectMode(true);
                                                    if (!formData.serviceType?.includes('+')) {
                                                        setFormData(prev => ({ ...prev, serviceType: `${prev.serviceType || 'Hotel'} + Transport` }));
                                                    }
                                                } else {
                                                    setIsMultiSelectMode(false);
                                                    const first = selectedServices[0] || 'Hotel';
                                                    setFormData(prev => ({ ...prev, serviceType: first }));
                                                }
                                            }}
                                            className="text-[10px] text-primary font-bold hover:underline"
                                        >
                                            {isMultiMode ? 'Single Select' : '+ Multi-Select'}
                                        </button>
                                    )}
                                </div>

                                {isMultiMode ? (
                                    <div className="space-y-2">
                                        {/* Custom Multi-Select Dropdown Trigger */}
                                        <div className="relative" ref={serviceDropdownRef}>
                                            <div
                                                onClick={() => setServiceDropdownOpen(!serviceDropdownOpen)}
                                                className={`w-full min-h-[42px] bg-slate-50 dark:bg-slate-900 border rounded-xl px-3 py-2 flex items-center justify-between gap-2 cursor-pointer transition-all ${
                                                    serviceDropdownOpen
                                                        ? 'border-primary ring-2 ring-primary/20 shadow-sm bg-white dark:bg-slate-800'
                                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                                }`}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    {selectedServices.length === 0 ? (
                                                        <span className="text-xs text-slate-400">Select services...</span>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                                {formData.serviceType}
                                                            </span>
                                                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-primary/10 text-primary shrink-0">
                                                                {selectedServices.length}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <span className={`material-symbols-outlined text-[18px] text-slate-400 transition-transform ${serviceDropdownOpen ? 'rotate-180 text-primary' : ''}`}>
                                                    expand_more
                                                </span>
                                            </div>

                                            {/* Popover Menu with Checkboxes */}
                                            {serviceDropdownOpen && (
                                                <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-100">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center justify-between">
                                                        <span>Select Services for {isDmcVendor ? 'DMC' : 'Supplier'}:</span>
                                                        <span className="text-primary font-bold">{selectedServices.length} active</span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        {SERVICE_OPTIONS.map(opt => {
                                                            const isChecked = selectedServices.includes(opt.id);
                                                            return (
                                                                <div
                                                                    key={opt.id}
                                                                    onClick={() => toggleService(opt.id)}
                                                                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                                                                        isChecked
                                                                            ? 'bg-primary/10 text-primary font-bold'
                                                                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`size-4 rounded flex items-center justify-center border transition-colors ${
                                                                            isChecked
                                                                                ? 'bg-primary border-primary text-white'
                                                                                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                                                                        }`}>
                                                                            {isChecked && <span className="material-symbols-outlined text-[13px] stroke-[2]">check</span>}
                                                                        </div>
                                                                        <span className="material-symbols-outlined text-[16px] text-slate-400">{opt.icon}</span>
                                                                        <span className="text-xs">{opt.label}</span>
                                                                    </div>
                                                                    {isChecked && (
                                                                        <span className="text-[10px] font-bold text-primary">Selected</span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* If 'Other' is checked, allow specifying custom text */}
                                                    {selectedServices.includes('Other') && (
                                                        <div className="pt-1 px-1">
                                                            <input
                                                                type="text"
                                                                value={customOtherText}
                                                                onChange={e => handleCustomOtherChange(e.target.value)}
                                                                placeholder="Specify other (e.g. Visa, Sightseeing)"
                                                                className="w-full text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary text-slate-800 dark:text-white"
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Quick Presets */}
                                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] flex-wrap gap-1">
                                                        <div className="flex items-center gap-1 flex-wrap">
                                                            <button
                                                                type="button"
                                                                onClick={() => applyPreset(['Hotel', 'Transport', 'Flight'])}
                                                                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary font-semibold text-[10px]"
                                                            >
                                                                Hotel+Transport+Flight
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => applyPreset(['Hotel', 'Transport'])}
                                                                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary font-semibold text-[10px]"
                                                            >
                                                                Hotel+Transport
                                                            </button>
                                                        </div>
                                                        {selectedServices.length > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => applyPreset([])}
                                                                className="text-red-500 hover:underline font-bold text-[10px] ml-auto"
                                                            >
                                                                Clear
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* 1-Click Interactive Toggle Pills */}
                                        <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                            {SERVICE_OPTIONS.map(opt => {
                                                const isChecked = selectedServices.includes(opt.id);
                                                return (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        onClick={() => toggleService(opt.id)}
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border transition-all ${
                                                            isChecked
                                                                ? 'bg-primary text-white border-primary shadow-xs'
                                                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                                        }`}
                                                    >
                                                        <span className="material-symbols-outlined text-[13px]">
                                                            {isChecked ? 'check' : opt.icon}
                                                        </span>
                                                        <span>{opt.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <select
                                        value={formData.serviceType}
                                        onChange={e => setFormData({ ...formData, serviceType: e.target.value as any })}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="Hotel">Hotel</option>
                                        <option value="Transport">Transport</option>
                                        <option value="Flight">Flight</option>
                                        <option value="Activity">Activity</option>
                                        <option value="Guide">Guide</option>
                                        <option value="Other">Other</option>
                                    </select>
                                )}
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

