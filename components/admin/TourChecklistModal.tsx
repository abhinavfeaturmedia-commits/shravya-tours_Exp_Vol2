import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Booking, TourChecklistItem, TourChecklistStatus, TourChecklistCategory } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useBookings } from '../../src/hooks/useBookings';
import { toast } from 'sonner';
import {
    CheckCircle2, Clock, AlertCircle, Plus, Trash2,
    MessageCircle, Calendar, CheckSquare, Sparkles, RefreshCw, X, CalendarClock,
    ChevronDown, ShieldCheck, MapPin
} from 'lucide-react';
import { suggestDueDate, getItemDueState, parseDay, daysBetween, startOfToday } from '../../utils/tourReadiness';
import {
    CHECKLIST_TEMPLATES,
    ChecklistTemplateId,
    detectBookingChecklistType,
    getChecklistTemplateForBooking,
    detectChecklistMismatch,
    ChecklistTemplate,
    normalizeBrandText,
    COMPANY_BRAND_NAME
} from '../../utils/tourChecklistTemplates';

// Exported for backward compatibility with external references
export const DEFAULT_PRE_TOUR_CHECKLIST: Omit<TourChecklistItem, 'id' | 'bookingId'>[] =
    CHECKLIST_TEMPLATES.international_tour.items.map(tpl => ({
        taskNumber: tpl.taskNumber,
        title: tpl.title,
        category: tpl.category,
        status: 'Not Updated' as TourChecklistStatus,
        notes: tpl.notes,
    }));

interface TourChecklistModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: Booking;
    onSaved?: (updatedItems: TourChecklistItem[]) => void;
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
    Hotel: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    Transport: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    Activities: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    Vouchers: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    Briefing: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    Other: 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
};

export const TourChecklistModal: React.FC<TourChecklistModalProps> = ({ isOpen, onClose, booking, onSaved }) => {
    const { staff, currentUser } = useAuth();
    const { packages, masterLocations } = useData();
    const { updateBooking } = useBookings();

    const [items, setItems] = useState<TourChecklistItem[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<ChecklistTemplateId>('domestic_tour');
    const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
    const [filterCategory, setFilterCategory] = useState<'All' | TourChecklistStatus>('All');
    const [isSaving, setIsSaving] = useState(false);
    const [showAddCustom, setShowAddCustom] = useState(false);
    const [customTitle, setCustomTitle] = useState('');
    const [customCategory, setCustomCategory] = useState<TourChecklistCategory>('Other');
    const [customNotes, setCustomNotes] = useState('');

    const templateMenuRef = useRef<HTMLDivElement>(null);

    // Resolve linked package if booking has packageId
    const linkedPackage = useMemo(() => {
        if (!booking?.packageId || !packages) return null;
        return packages.find(p => p.id === booking.packageId) || null;
    }, [booking?.packageId, packages]);

    // Detect ideal template for this booking
    const autoDetectedTemplateId = useMemo(() => {
        if (!booking) return 'domestic_tour';
        return detectBookingChecklistType(booking, linkedPackage, masterLocations || []);
    }, [booking, linkedPackage, masterLocations]);

    // Check for checklist mismatch (e.g. Domestic Tour holding Visa tasks)
    const mismatchInfo = useMemo(() => {
        if (!booking) return { hasMismatch: false, detectedTemplate: CHECKLIST_TEMPLATES.domestic_tour };
        return detectChecklistMismatch(items, booking, linkedPackage, masterLocations || []);
    }, [items, booking, linkedPackage, masterLocations]);

    // Close template menu on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (templateMenuRef.current && !templateMenuRef.current.contains(e.target as Node)) {
                setIsTemplateMenuOpen(false);
            }
        };
        if (isTemplateMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isTemplateMenuOpen]);

    // Helper: Build 10 items from a given template
    const buildItemsFromTemplate = (templateId: ChecklistTemplateId): TourChecklistItem[] => {
        const template = CHECKLIST_TEMPLATES[templateId] || CHECKLIST_TEMPLATES.domestic_tour;
        return template.items.map((tpl, idx) => ({
            id: `chk-${booking.id}-${tpl.taskNumber || idx + 1}-${Date.now().toString(36)}`,
            bookingId: booking.id,
            taskNumber: tpl.taskNumber || idx + 1,
            title: tpl.title,
            category: tpl.category,
            status: 'Not Updated',
            notes: tpl.notes,
            dueDate: suggestDueDate(booking.date, tpl.category),
            assignedStaffId: booking.assignedTo || currentUser?.id,
            assignedStaffName: staff?.find(s => s.id === (booking.assignedTo || currentUser?.id))?.name,
            updatedAt: new Date().toISOString(),
        }));
    };

    // Initialize items from booking or auto-detect from package/tour type
    useEffect(() => {
        if (!isOpen || !booking) return;

        setSelectedTemplateId(autoDetectedTemplateId);

        if (booking.checklist && Array.isArray(booking.checklist) && booking.checklist.length > 0) {
            setItems(booking.checklist);
        } else {
            // Seed 10 items matching the exact booking/package type
            const initialItems = buildItemsFromTemplate(autoDetectedTemplateId);
            setItems(initialItems);
        }
    }, [isOpen, booking, autoDetectedTemplateId]);

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

    // Fills ONLY the empty due dates
    const handleSuggestDueDates = () => {
        if (!parseDay(booking.date)) {
            toast.error('This booking has no departure date, so due dates cannot be suggested.');
            return;
        }
        setItems(prev => prev.map(item => {
            if (item.dueDate) return item;
            return { ...item, dueDate: suggestDueDate(booking.date, item.category), updatedAt: new Date().toISOString() };
        }));
        toast.success('Due dates suggested from the departure date.');
    };

    const handleSave = async (itemsToSave = items) => {
        setIsSaving(true);
        try {
            await updateBooking(booking.id, {
                checklist: itemsToSave,
            }, true);
            toast.success('Pre-Tour Checklist saved successfully!');
            onSaved?.(itemsToSave);
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

    // Apply or switch to a specific template
    const handleApplyTemplate = (templateId: ChecklistTemplateId) => {
        const targetTemplate = CHECKLIST_TEMPLATES[templateId];
        if (!targetTemplate) return;

        const newItems = buildItemsFromTemplate(templateId);
        setItems(newItems);
        setSelectedTemplateId(templateId);
        setIsTemplateMenuOpen(false);
        toast.success(`Applied 10-Point Checklist: ${targetTemplate.name}`);
    };

    const handleResetToActiveTemplate = () => {
        const activeTpl = CHECKLIST_TEMPLATES[selectedTemplateId] || CHECKLIST_TEMPLATES.domestic_tour;
        if (!window.confirm(`Reset checklist back to the 10 standard items for "${activeTpl.name}"? Any custom items will be replaced.`)) return;
        const resetItems = buildItemsFromTemplate(selectedTemplateId);
        setItems(resetItems);
        toast.info(`Checklist reset to standard 10 items for ${activeTpl.name}`);
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

        // Look for matching template message template
        let message = '';
        const activeTemplate = CHECKLIST_TEMPLATES[selectedTemplateId];
        const matchingTplItem = activeTemplate?.items.find(i => i.taskNumber === item.taskNumber || i.title.toLowerCase() === item.title.toLowerCase());

        if (matchingTplItem?.whatsappMessageTemplate) {
            message = matchingTplItem.whatsappMessageTemplate
                .replace(/{clientName}/g, clientName)
                .replace(/{bRef}/g, bRef)
                .replace(/{tourTitle}/g, tourTitle)
                .replace(/{title}/g, item.title)
                .replace(/{status}/g, item.status);
        } else {
            // Category-based fallback
            switch (item.category) {
                case 'Visa':
                    message = `Namaste ${clientName}! Greetings from ${COMPANY_BRAND_NAME}.\n\nRegarding your booking ${bRef} (${tourTitle}):\nPlease share your original passport copies and documents for *${item.title}* at your earliest convenience.\n\nFeel free to message here for any assistance!`;
                    break;
                case 'Tickets':
                    message = `Namaste ${clientName}!\n\nThis is an update regarding your travel tickets for ${tourTitle} (${bRef}).\nStatus: *${item.title}* is currently ${item.status}.\n\nOur team is ensuring all transit details are verified for your seamless journey.`;
                    break;
                case 'Hotel':
                    message = `Namaste ${clientName}!\n\nGood news! Your hotel reservations for ${tourTitle} (${bRef}) are confirmed. All property vouchers and room allocations are being prepared by our reservations desk.`;
                    break;
                case 'Transport':
                    message = `Namaste ${clientName}!\n\nRegarding your local transport for ${tourTitle} (${bRef}):\nYour vehicle and driver details will be shared right before departure. Pickup time and coordinator numbers are active.`;
                    break;
                case 'Vouchers':
                    message = `Namaste ${clientName}!\n\nYour complete service vouchers and detailed tour docket for ${tourTitle} (${bRef}) are ready. Please review the attached docket for all check-in details.`;
                    break;
                case 'Briefing':
                    message = `Namaste ${clientName}!\n\nWe are excited to welcome you on tour ${tourTitle} (${bRef})!\nYour 24/7 ${COMPANY_BRAND_NAME} on-ground helpline is active. Please let us know if you need any assistance before departure. Have a wonderful trip!`;
                    break;
                default:
                    message = `Namaste ${clientName}!\n\nUpdate from ${COMPANY_BRAND_NAME} for booking ${bRef} (${tourTitle}):\n*${item.title}*: ${item.notes || 'In progress'}.\n\nThank you for choosing ${COMPANY_BRAND_NAME}!`;
            }
        }

        // Runtime brand sanitizer safeguard (ensures any legacy persisted checklist text is cleaned)
        const sanitizedMessage = normalizeBrandText(message);
        const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(sanitizedMessage)}`;
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

    const activeTemplate = CHECKLIST_TEMPLATES[selectedTemplateId] || CHECKLIST_TEMPLATES.domestic_tour;

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
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2.5 py-0.5 rounded-md font-mono text-xs font-black tracking-wide bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                    {formatBookingBadge(booking)}
                                </span>

                                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span>10-Point Pre-Tour Checklist</span>
                                </h2>

                                {/* Active Template Indicator Badge */}
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${activeTemplate.badgeColor}`}>
                                    <span>{activeTemplate.icon}</span>
                                    <span>{activeTemplate.badgeLabel}</span>
                                </span>
                            </div>

                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="font-semibold text-slate-900 dark:text-white">{booking.customer}</span>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                    {booking.title}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    {booking.date} {booking.endDate ? `to ${booking.endDate}` : ''}
                                </span>
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Template Switcher Dropdown */}
                            <div className="relative" ref={templateMenuRef}>
                                <button
                                    onClick={() => setIsTemplateMenuOpen(!isTemplateMenuOpen)}
                                    title="Switch Checklist Template"
                                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-all shadow-xs"
                                >
                                    <span>{activeTemplate.icon}</span>
                                    <span className="hidden sm:inline">Template: {activeTemplate.name}</span>
                                    <span className="sm:hidden">{activeTemplate.badgeLabel}</span>
                                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isTemplateMenuOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isTemplateMenuOpen && (
                                    <div className="absolute right-0 top-full mt-1.5 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95">
                                        <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700/60">
                                            Select 10-Point Template
                                        </div>
                                        <div className="max-h-72 overflow-y-auto p-1 space-y-0.5">
                                            {Object.values(CHECKLIST_TEMPLATES).map(tpl => {
                                                const isSelected = selectedTemplateId === tpl.id;
                                                const isAuto = autoDetectedTemplateId === tpl.id;
                                                return (
                                                    <button
                                                        key={tpl.id}
                                                        type="button"
                                                        onClick={() => handleApplyTemplate(tpl.id)}
                                                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold flex items-center justify-between gap-2 transition-colors ${
                                                            isSelected
                                                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black'
                                                                : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2 truncate">
                                                            <span className="text-sm shrink-0">{tpl.icon}</span>
                                                            <div className="truncate">
                                                                <div className="truncate">{tpl.name}</div>
                                                                <div className="text-[10px] text-slate-400 font-normal truncate">{tpl.description}</div>
                                                            </div>
                                                        </div>
                                                        {isAuto && (
                                                            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-black bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shrink-0">
                                                                Auto
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Reset Button */}
                            <button
                                onClick={handleResetToActiveTemplate}
                                title={`Reset checklist to standard 10 items for ${activeTemplate.name}`}
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

                    {/* ─── Template Mismatch Warning Banner ─── */}
                    {mismatchInfo.hasMismatch && (
                        <div className="mt-3.5 p-3 rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50/90 dark:bg-amber-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                            <div className="flex items-start sm:items-center gap-2.5">
                                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                                <div>
                                    <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                                        Checklist Mismatch Notice
                                    </p>
                                    <p className="text-[11px] text-amber-700 dark:text-amber-300">
                                        {mismatchInfo.reason}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => handleApplyTemplate(mismatchInfo.detectedTemplate.id)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm transition-all flex items-center gap-1.5"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Apply {mismatchInfo.detectedTemplate.name} (10 Points)</span>
                                </button>
                            </div>
                        </div>
                    )}

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
                                    title="Auto-fill missing due dates from travel departure date"
                                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 transition-colors flex items-center gap-1.5"
                                >
                                    <CalendarClock className="w-3.5 h-3.5" />
                                    <span>Suggest Due Dates ({stats.missingDueDates})</span>
                                </button>
                            )}

                            {/* Quick template toggle for tours: Domestic vs International */}
                            {selectedTemplateId === 'domestic_tour' ? (
                                <button
                                    onClick={() => handleApplyTemplate('international_tour')}
                                    title="Switch to International Tour (adds Visa steps)"
                                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center gap-1.5"
                                >
                                    <span>🌍</span>
                                    <span>Switch to Intl Tour</span>
                                </button>
                            ) : selectedTemplateId === 'international_tour' ? (
                                <button
                                    onClick={() => handleApplyTemplate('domestic_tour')}
                                    title="Switch to Domestic Tour (replaces Visa with Domestic ID & permits)"
                                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center gap-1.5"
                                >
                                    <span>🇮🇳</span>
                                    <span>Switch to Domestic Tour</span>
                                </button>
                            ) : null}

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
                                                title={`Send tailored WhatsApp prompt for ${item.title}`}
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
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Changes are saved directly to booking record.</span>
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
