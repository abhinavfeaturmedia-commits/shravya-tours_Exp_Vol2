import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Booking, TourChecklistItem, TourChecklistStatus, TourChecklistCategory } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useBookings } from '../../src/hooks/useBookings';
import { toast } from 'sonner';
import {
    CheckCircle2, Clock, AlertCircle, MinusCircle, Plus, Trash2,
    MessageCircle, Calendar, CheckSquare, Sparkles, User, RefreshCw, X, CalendarClock
} from 'lucide-react';
import { suggestDueDate, getItemDueState, parseDay, daysBetween, startOfToday } from '../../utils/tourReadiness';

export const DEFAULT_PRE_TOUR_CHECKLIST: Omit<TourChecklistItem, 'id' | 'bookingId'>[] = [
    {
        taskNumber: 1,
        title: 'Visa Document Collection',
        category: 'Visa',
        status: 'Not Updated',
        notes: 'Collect passport copies (minimum 6 months validity), passport photos, and financial proofs.',
    },
    {
        taskNumber: 2,
        title: 'Visa Processing & Submission',
        category: 'Visa',
        status: 'Not Updated',
        notes: 'Submit visa paperwork to embassy/VFS/consulate portal and obtain submission tracking code.',
    },
    {
        taskNumber: 3,
        title: 'Visa Approval & Verification',
        category: 'Visa',
        status: 'Not Updated',
        notes: 'Verify stamped/eVisa validity dates against itinerary travel dates and verify traveler names.',
    },
    {
        taskNumber: 4,
        title: 'Flight / Train Ticket Booking',
        category: 'Tickets',
        status: 'Not Updated',
        notes: 'Confirm transit tickets, seat assignments, baggage allowance and verify PNR status.',
    },
    {
        taskNumber: 5,
        title: 'Hotel Confirmation & Vouchers',
        category: 'Hotel',
        status: 'Not Updated',
        notes: 'Reconfirm reservations directly with properties, verify room types & obtain hotel voucher codes.',
    },
    {
        taskNumber: 6,
        title: 'Activity & Sightseeing Tickets',
        category: 'Activities',
        status: 'Not Updated',
        notes: 'Pre-book slot permits, ferry passes (e.g. Havelock/Neil), monument entries, and guided tours.',
    },
    {
        taskNumber: 7,
        title: 'Cab / Transport & Driver Allocation',
        category: 'Transport',
        status: 'Not Updated',
        notes: 'Confirm vehicle type (Innova/Crysta/Tempo), assign driver name, phone number & vehicle registration number.',
    },
    {
        taskNumber: 8,
        title: 'Service Vouchers Handover to Guest',
        category: 'Vouchers',
        status: 'Not Updated',
        notes: 'Compile & dispatch hotel vouchers, driver details, and activity vouchers to guest.',
    },
    {
        taskNumber: 9,
        title: 'Travel Tickets Handover to Guest',
        category: 'Tickets',
        status: 'Not Updated',
        notes: 'Deliver confirmed flight/train/ferry tickets with baggage guidelines and web check-in advisories.',
    },
    {
        taskNumber: 10,
        title: 'Emergency Briefing & Final Payment Check',
        category: 'Briefing',
        status: 'Not Updated',
        notes: 'Ensure 100% final balance is collected, share 24/7 emergency coordinator hotline and final briefing note.',
    },
];

interface TourChecklistModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: Booking;
}

const CATEGORY_ICONS: Record<string, string> = {
    Visa: '🛂',
    Tickets: '✈️',
    Hotel: '🏨',
    Transport: '🚗',
    Activities: '🎟️',
    Vouchers: '📄',
    Briefing: '📞',
    Other: '⚙️',
};

const CATEGORY_COLORS: Record<string, string> = {
    Visa: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    Tickets: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    Hotel: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    Transport: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    Activities: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    Vouchers: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    Briefing: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    Other: 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
};

export const TourChecklistModal: React.FC<TourChecklistModalProps> = ({ isOpen, onClose, booking }) => {
    const { staff, currentUser } = useAuth();
    const { updateBooking } = useBookings();
    const [items, setItems] = useState<TourChecklistItem[]>([]);
    const [filterCategory, setFilterCategory] = useState<'All' | TourChecklistStatus>('All');
    const [isSaving, setIsSaving] = useState(false);
    const [showAddCustom, setShowAddCustom] = useState(false);
    const [customTitle, setCustomTitle] = useState('');
    const [customCategory, setCustomCategory] = useState<TourChecklistCategory>('Other');
    const [customNotes, setCustomNotes] = useState('');

    // Initialize items from booking or default template
    useEffect(() => {
        if (!isOpen || !booking) return;

        if (booking.checklist && Array.isArray(booking.checklist) && booking.checklist.length > 0) {
            setItems(booking.checklist);
        } else {
            // Seed default 10 items
            const initialItems: TourChecklistItem[] = DEFAULT_PRE_TOUR_CHECKLIST.map((tpl, idx) => ({
                id: `chk-${booking.id}-${idx + 1}-${Date.now().toString(36)}`,
                bookingId: booking.id,
                ...tpl,
                dueDate: suggestDueDate(booking.date, tpl.category),
                assignedStaffId: booking.assignedTo || currentUser?.id,
                assignedStaffName: staff?.find(s => s.id === (booking.assignedTo || currentUser?.id))?.name,
                updatedAt: new Date().toISOString(),
            }));
            setItems(initialItems);
        }
    }, [isOpen, booking, staff, currentUser]);

    // Progress metrics
    const stats = useMemo(() => {
        const total = items.length;
        const completed = items.filter(i => i.status === 'Completed').length;
        const inProgress = items.filter(i => i.status === 'In Progress').length;
        const notUpdated = items.filter(i => i.status === 'Not Updated').length;
        const notApplicable = items.filter(i => i.status === 'Not Applicable').length;
        const actionable = total - notApplicable;
        const percent = actionable > 0 ? Math.round((completed / actionable) * 100) : 100;
        const today = startOfToday();
        const overdue = items.filter(i => getItemDueState(i, today) === 'overdue').length;
        const missingDueDates = items.filter(i => !i.dueDate && i.status !== 'Completed' && i.status !== 'Not Applicable').length;
        return { total, completed, inProgress, notUpdated, notApplicable, actionable, percent, overdue, missingDueDates };
    }, [items]);

    // Lock background scroll + close on Escape while the modal is open
    useEffect(() => {
        if (!isOpen) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', onKey);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleUpdateStatus = (itemId: string, newStatus: TourChecklistStatus) => {
        setItems(prev => prev.map(item => {
            if (item.id === itemId) {
                return {
                    ...item,
                    status: newStatus,
                    completedAt: newStatus === 'Completed' ? new Date().toISOString() : undefined,
                    updatedAt: new Date().toISOString(),
                };
            }
            return item;
        }));
    };

    const handleUpdateStaff = (itemId: string, staffId: number) => {
        const staffMember = staff?.find(s => s.id === staffId);
        setItems(prev => prev.map(item => {
            if (item.id === itemId) {
                return {
                    ...item,
                    assignedStaffId: staffId,
                    assignedStaffName: staffMember?.name || '',
                    updatedAt: new Date().toISOString(),
                };
            }
            return item;
        }));
    };

    const handleUpdateNotes = (itemId: string, notes: string) => {
        setItems(prev => prev.map(item => {
            if (item.id === itemId) {
                return { ...item, notes, updatedAt: new Date().toISOString() };
            }
            return item;
        }));
    };

    const handleUpdateDueDate = (itemId: string, dueDate: string) => {
        setItems(prev => prev.map(item => {
            if (item.id === itemId) {
                return { ...item, dueDate: dueDate || undefined, updatedAt: new Date().toISOString() };
            }
            return item;
        }));
    };

    // Fills ONLY the empty due dates (never overwrites a date someone typed in).
    const handleSuggestDueDates = () => {
        if (!parseDay(booking.date)) {
            toast.error('This booking has no departure date, so due dates cannot be suggested.');
            return;
        }
        setItems(prev => prev.map(item => {
            if (item.dueDate) return item;
            return { ...item, dueDate: suggestDueDate(booking.date, item.category), updatedAt: new Date().toISOString() };
        }));
        toast.success('Due dates suggested from the departure date. Adjust any of them if needed.');
    };

    const handleSave = async (itemsToSave = items) => {
        setIsSaving(true);
        try {
            await updateBooking(booking.id, {
                checklist: itemsToSave,
            });
            toast.success('Pre-Tour Checklist saved successfully!');
            onClose();
        } catch (err: any) {
            console.error('Failed to save checklist:', err);
            toast.error(`Failed to save checklist: ${err?.message || 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleMarkAllCompleted = () => {
        const updated = items.map(item => (
            item.status !== 'Not Applicable'
                ? { ...item, status: 'Completed' as TourChecklistStatus, completedAt: new Date().toISOString() }
                : item
        ));
        setItems(updated);
        toast.info('Marked all applicable items as Completed');
    };

    const handleSetDomesticDefaults = () => {
        // Domestic tour doesn't require Visa (tasks 1, 2, 3)
        const updated = items.map(item => {
            if (item.category === 'Visa') {
                return { ...item, status: 'Not Applicable' as TourChecklistStatus, notes: 'Domestic tour — visa not required' };
            }
            return item;
        });
        setItems(updated);
        toast.success('Visa tasks marked as Not Applicable for Domestic tour');
    };

    const handleResetToDefault = () => {
        if (!window.confirm('Reset checklist back to the standard 10 template items? Any custom items will be removed.')) return;
        const reset: TourChecklistItem[] = DEFAULT_PRE_TOUR_CHECKLIST.map((tpl, idx) => ({
            id: `chk-${booking.id}-${idx + 1}-${Date.now().toString(36)}`,
            bookingId: booking.id,
            ...tpl,
            dueDate: suggestDueDate(booking.date, tpl.category),
            assignedStaffId: booking.assignedTo || currentUser?.id,
            assignedStaffName: staff?.find(s => s.id === (booking.assignedTo || currentUser?.id))?.name,
            updatedAt: new Date().toISOString(),
        }));
        setItems(reset);
        toast.info('Checklist reset to standard 10 items');
    };

    const handleAddCustomItem = () => {
        if (!customTitle.trim()) {
            toast.error('Please enter a task title');
            return;
        }
        const newItem: TourChecklistItem = {
            id: `chk-custom-${Date.now().toString(36)}`,
            bookingId: booking.id,
            taskNumber: items.length + 1,
            title: customTitle.trim(),
            category: customCategory,
            status: 'Not Updated',
            dueDate: suggestDueDate(booking.date, customCategory),
            notes: customNotes.trim() || undefined,
            assignedStaffId: booking.assignedTo || currentUser?.id,
            assignedStaffName: staff?.find(s => s.id === (booking.assignedTo || currentUser?.id))?.name,
            updatedAt: new Date().toISOString(),
        };
        setItems(prev => [...prev, newItem]);
        setCustomTitle('');
        setCustomNotes('');
        setShowAddCustom(false);
        toast.success('Custom task added to checklist');
    };

    const handleDeleteItem = (itemId: string) => {
        setItems(prev => prev.filter(i => i.id !== itemId));
    };

    const handleSendWhatsAppPrompt = (item: TourChecklistItem) => {
        const phone = booking.whatsapp || booking.phone;
        if (!phone) {
            toast.error('No customer phone or WhatsApp number found for this booking');
            return;
        }
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const clientName = booking.customer || 'Guest';
        const tourTitle = booking.title || 'your upcoming tour';
        const bRef = booking.bookingNumber ? `BK-${String(booking.bookingNumber).padStart(4, '0')}` : `#${booking.id.slice(0, 8)}`;

        let message = '';
        switch (item.category) {
            case 'Visa':
                message = `Namaste ${clientName}! Greetings from Shravya Tours.\n\nRegarding your booking ${bRef} (${tourTitle}):\nPlease share your original passport copies and documents for *${item.title}* at your earliest convenience.\n\nFeel free to message here for any visa assistance!`;
                break;
            case 'Tickets':
                message = `Namaste ${clientName}!\n\nThis is an update regarding your travel tickets for ${tourTitle} (${bRef}).\nStatus: *${item.title}* is currently ${item.status}.\n\nOur team is ensuring all PNRs and transit details are verified for your seamless journey.`;
                break;
            case 'Hotel':
                message = `Namaste ${clientName}!\n\nGood news! Your hotel reservations for ${tourTitle} (${bRef}) are confirmed. All property vouchers and room allocations are being prepared by our reservations desk.`;
                break;
            case 'Transport':
                message = `Namaste ${clientName}!\n\nRegarding your local transport for ${tourTitle} (${bRef}):\nYour vehicle and driver details will be shared right before departure. Pickup time and coordinator numbers are active.`;
                break;
            case 'Vouchers':
                message = `Namaste ${clientName}!\n\nYour complete service vouchers and detailed tour docket for ${tourTitle} (${bRef}) are ready. Please review the attached docket for all property check-in details.`;
                break;
            case 'Briefing':
                message = `Namaste ${clientName}!\n\nWe are excited to welcome you on tour ${tourTitle} (${bRef})!\nYour 24/7 Shravya Tours on-ground helpline is active. Please let us know if you need any last-minute assistance before departure. Have a wonderful trip!`;
                break;
            default:
                message = `Namaste ${clientName}!\n\nUpdate from Shravya Tours for booking ${bRef} (${tourTitle}):\n*${item.title}*: ${item.notes || 'In progress'}.\n\nThank you for choosing Shravya Tours!`;
        }

        const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const filteredItems = items.filter(item => {
        if (filterCategory === 'All') return true;
        return item.status === filterCategory;
    });

    const formatBookingBadge = (b: Booking): string => {
        if (b.bookingNumber) return `BK-${String(b.bookingNumber).padStart(4, '0')}`;
        if (b.invoiceNo && b.invoiceNo.length <= 16) return `#${b.invoiceNo}`;
        return `#BK-${b.id.slice(0, 8).toUpperCase()}`;
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
            role="dialog"
            aria-modal="true"
            aria-label="Pre-tour checklist"
        >
            <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] overflow-hidden">
                
                {/* ─── Header ─── */}
                <div className="shrink-0 p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-md font-mono text-xs font-black tracking-wide bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                    {formatBookingBadge(booking)}
                                </span>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span>10-Point Pre-Tour Checklist</span>
                                </h2>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="font-semibold text-slate-900 dark:text-white">{booking.customer}</span>
                                <span>•</span>
                                <span>{booking.title}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    {booking.date} {booking.endDate ? `to ${booking.endDate}` : ''}
                                </span>
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleResetToDefault}
                                title="Reset checklist to standard 10 items"
                                className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Reset</span>
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* ─── Metric Bar & Action Ribbon ─── */}
                    <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 flex-1">
                            {/* Circular / percentage metric */}
                            <div className="flex items-center gap-3">
                                <div className="relative w-12 h-12 flex items-center justify-center">
                                    <svg className="w-12 h-12 -rotate-90">
                                        <circle
                                            cx="24"
                                            cy="24"
                                            r="19"
                                            stroke="currentColor"
                                            strokeWidth="3.5"
                                            className="text-slate-200 dark:text-slate-800"
                                            fill="transparent"
                                        />
                                        <circle
                                            cx="24"
                                            cy="24"
                                            r="19"
                                            stroke="currentColor"
                                            strokeWidth="3.5"
                                            strokeDasharray={119.4}
                                            strokeDashoffset={119.4 - (119.4 * stats.percent) / 100}
                                            strokeLinecap="round"
                                            className={stats.percent === 100 ? 'text-emerald-500' : 'text-amber-500'}
                                            fill="transparent"
                                        />
                                    </svg>
                                    <span className="absolute font-black text-xs text-slate-900 dark:text-white">
                                        {stats.percent}%
                                    </span>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Tour Readiness
                                    </div>
                                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                                        {stats.completed} of {stats.actionable} Ready
                                        {stats.notApplicable > 0 && (
                                            <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">
                                                ({stats.notApplicable} N/A)
                                            </span>
                                        )}
                                        {stats.overdue > 0 && (
                                            <span className="ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800">
                                                {stats.overdue} overdue
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Quick status chips */}
                            <div className="flex flex-wrap items-center gap-2 lg:pl-4 lg:border-l border-slate-200 dark:border-slate-800 text-xs">
                                <button
                                    onClick={() => setFilterCategory('All')}
                                    className={`px-2.5 py-1 rounded-full font-semibold transition-all ${
                                        filterCategory === 'All'
                                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                    }`}
                                >
                                    All ({stats.total})
                                </button>
                                <button
                                    onClick={() => setFilterCategory('Not Updated')}
                                    className={`px-2.5 py-1 rounded-full font-semibold transition-all ${
                                        filterCategory === 'Not Updated'
                                            ? 'bg-slate-700 text-white shadow-sm'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                    }`}
                                >
                                    Pending ({stats.notUpdated})
                                </button>
                                <button
                                    onClick={() => setFilterCategory('In Progress')}
                                    className={`px-2.5 py-1 rounded-full font-semibold transition-all ${
                                        filterCategory === 'In Progress'
                                            ? 'bg-amber-600 text-white shadow-sm'
                                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                                    }`}
                                >
                                    In Progress ({stats.inProgress})
                                </button>
                                <button
                                    onClick={() => setFilterCategory('Completed')}
                                    className={`px-2.5 py-1 rounded-full font-semibold transition-all ${
                                        filterCategory === 'Completed'
                                            ? 'bg-emerald-600 text-white shadow-sm'
                                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                                    }`}
                                >
                                    Completed ({stats.completed})
                                </button>
                            </div>
                        </div>

                        {/* Quick action buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {stats.missingDueDates > 0 && (
                                <button
                                    onClick={handleSuggestDueDates}
                                    title="Fill empty due dates based on the departure date (Visa 30d, Tickets 14d, Hotel 10d, Activities 7d, Transport/Vouchers 3d, Briefing 1d before)"
                                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 transition-colors flex items-center gap-1.5"
                                >
                                    <CalendarClock className="w-3.5 h-3.5" />
                                    <span>Suggest Due Dates ({stats.missingDueDates})</span>
                                </button>
                            )}
                            <button
                                onClick={handleSetDomesticDefaults}
                                title="Sets Visa steps as Not Applicable (Domestic Tour)"
                                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center gap-1.5"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Domestic Trip (Exempt Visa)</span>
                            </button>
                            <button
                                onClick={handleMarkAllCompleted}
                                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center gap-1.5"
                            >
                                <CheckSquare className="w-3.5 h-3.5" />
                                <span>Mark All Done</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ─── Checklist Items Body ─── */}
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-5 space-y-2.5">
                    {filteredItems.length === 0 ? (
                        <div className="py-12 text-center text-slate-500">
                            <CheckCircle2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                            <p className="text-sm font-semibold">No checklist items match the selected filter</p>
                            <button
                                onClick={() => setFilterCategory('All')}
                                className="mt-2 text-xs text-amber-600 hover:underline"
                            >
                                Show all items
                            </button>
                        </div>
                    ) : (
                        filteredItems.map((item, idx) => {
                            const isDone = item.status === 'Completed';
                            const isNA = item.status === 'Not Applicable';
                            const inProg = item.status === 'In Progress';
                            const categoryColor = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Other;
                            const categoryIcon = CATEGORY_ICONS[item.category] || '⚙️';
                            const dueState = getItemDueState(item);
                            const dueDiff = item.dueDate && parseDay(item.dueDate) ? daysBetween(startOfToday(), parseDay(item.dueDate)!) : null;

                            return (
                                <div
                                    key={item.id}
                                    className={`group rounded-xl border p-3.5 transition-all ${
                                        dueState === 'overdue'
                                            ? 'bg-rose-50/40 dark:bg-rose-950/10 border-rose-300 dark:border-rose-800/60'
                                        : isDone
                                            ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200/80 dark:border-emerald-800/40'
                                            : isNA
                                            ? 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/50 opacity-60'
                                            : inProg
                                            ? 'bg-amber-50/30 dark:bg-amber-950/10 border-amber-200/80 dark:border-amber-800/40'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                    }`}
                                >
                                    <div className="flex flex-col gap-3">
                                        
                                        {/* Left: Task number, category badge, and title */}
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs shrink-0 mt-0.5">
                                                {item.taskNumber || idx + 1}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${categoryColor}`}>
                                                        <span>{categoryIcon}</span>
                                                        <span>{item.category}</span>
                                                    </span>
                                                    <h4 className={`text-sm font-bold text-slate-900 dark:text-white ${isDone ? 'line-through text-slate-500 dark:text-slate-400' : ''}`}>
                                                        {item.title}
                                                    </h4>
                                                </div>

                                                {/* Notes / description field */}
                                                <div className="mt-1.5">
                                                    <textarea
                                                        rows={2}
                                                        value={item.notes || ''}
                                                        onChange={(e) => handleUpdateNotes(item.id, e.target.value)}
                                                        placeholder="Add specific details, PNR, voucher numbers, or reminders..."
                                                        className="w-full resize-none text-xs leading-relaxed bg-slate-50/70 dark:bg-slate-800/40 border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-amber-500 rounded-lg px-2 py-1.5 focus:outline-none text-slate-600 dark:text-slate-400 placeholder:text-slate-400"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Controls (Status, Staff Assignee, WhatsApp trigger, Delete) */}
                                        <div className="flex items-start gap-2 flex-wrap md:pl-10">

                                            {/* Due Date */}
                                            {!isNA && (
                                                <div className="flex flex-col items-start min-w-[8.5rem]">
                                                    <input
                                                        type="date"
                                                        value={item.dueDate ? item.dueDate.split('T')[0] : ''}
                                                        onChange={(e) => handleUpdateDueDate(item.id, e.target.value)}
                                                        title="Due date for this task"
                                                        className={`text-xs rounded-lg px-2 py-1.5 border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                                                            dueState === 'overdue'
                                                                ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-300'
                                                                : dueState === 'due-soon'
                                                                ? 'bg-amber-50 border-amber-300 text-amber-700 font-bold dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-300'
                                                                : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                                        }`}
                                                    />
                                                    {dueState === 'overdue' && dueDiff !== null && (
                                                        <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 mt-0.5">
                                                            {Math.abs(dueDiff)}d overdue
                                                        </span>
                                                    )}
                                                    {dueState === 'due-soon' && dueDiff !== null && (
                                                        <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 mt-0.5">
                                                            {dueDiff === 0 ? 'due today' : `due in ${dueDiff}d`}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Staff Assignee Dropdown */}
                                            <div className="relative flex items-center">
                                                <select
                                                    value={item.assignedStaffId || ''}
                                                    onChange={(e) => handleUpdateStaff(item.id, Number(e.target.value))}
                                                    className="text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500 w-36 truncate"
                                                >
                                                    <option value="">Unassigned</option>
                                                    {staff?.map(member => (
                                                        <option key={member.id} value={member.id}>
                                                            {member.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Status Selector */}
                                            <select
                                                value={item.status}
                                                onChange={(e) => handleUpdateStatus(item.id, e.target.value as TourChecklistStatus)}
                                                className={`text-xs font-bold rounded-lg px-2.5 py-1.5 w-32 border transition-all focus:outline-none ${
                                                    item.status === 'Completed'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700'
                                                        : item.status === 'In Progress'
                                                        ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700'
                                                        : item.status === 'Not Applicable'
                                                        ? 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                                        : 'bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                                }`}
                                            >
                                                <option value="Not Updated">Not Updated</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="Completed">Completed</option>
                                                <option value="Not Applicable">Not Applicable</option>
                                            </select>

                                            {/* WhatsApp Prompt Button */}
                                            <button
                                                onClick={() => handleSendWhatsAppPrompt(item)}
                                                title={`Send WhatsApp prompt for ${item.title}`}
                                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 transition-colors"
                                            >
                                                <MessageCircle className="w-4 h-4" />
                                            </button>

                                            {/* Delete custom item */}
                                            {item.id.includes('custom') && (
                                                <button
                                                    onClick={() => handleDeleteItem(item.id)}
                                                    title="Remove custom task"
                                                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>

                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* Add Custom Task Expansion */}
                    {showAddCustom ? (
                        <div className="p-4 rounded-xl border border-dashed border-amber-300 dark:border-amber-700/60 bg-amber-50/20 dark:bg-amber-950/20 mt-3 space-y-3">
                            <div className="flex items-center justify-between">
                                <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                    Add Custom Deliverable Task
                                </h5>
                                <button
                                    onClick={() => setShowAddCustom(false)}
                                    className="text-xs text-slate-400 hover:text-slate-600"
                                >
                                    Cancel
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2">
                                    <input
                                        type="text"
                                        placeholder="Task title (e.g. Scuba Medical Form, Snow Chains Allocation)"
                                        value={customTitle}
                                        onChange={(e) => setCustomTitle(e.target.value)}
                                        className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>
                                <div>
                                    <select
                                        value={customCategory}
                                        onChange={(e) => setCustomCategory(e.target.value as TourChecklistCategory)}
                                        className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    >
                                        <option value="Visa">Visa</option>
                                        <option value="Tickets">Tickets</option>
                                        <option value="Hotel">Hotel</option>
                                        <option value="Transport">Transport</option>
                                        <option value="Activities">Activities</option>
                                        <option value="Vouchers">Vouchers</option>
                                        <option value="Briefing">Briefing</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <input
                                    type="text"
                                    placeholder="Optional notes or details..."
                                    value={customNotes}
                                    onChange={(e) => setCustomNotes(e.target.value)}
                                    className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                            </div>
                            <div className="flex justify-end">
                                <button
                                    onClick={handleAddCustomItem}
                                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors"
                                >
                                    Add Task
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowAddCustom(true)}
                            className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-500 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-amber-600 transition-colors flex items-center justify-center gap-1.5"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Custom Pre-Tour Checklist Task</span>
                        </button>
                    )}
                </div>

                {/* ─── Footer ─── */}
                <div className="shrink-0 p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-3">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        Changes are saved directly to booking record.
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                        >
                            Close
                        </button>
                        <button
                            onClick={() => handleSave()}
                            disabled={isSaving}
                            className="px-5 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
                        >
                            {isSaving ? (
                                <>
                                    <Clock className="w-3.5 h-3.5 animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Save Checklist</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>,
        document.body
    );
};
