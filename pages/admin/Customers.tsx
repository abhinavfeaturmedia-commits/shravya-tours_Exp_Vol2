import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Customer, Booking, Lead, CustomerNote } from '../../types';
import { toast } from 'sonner';
import { Pagination, usePagination } from '../../components/ui/Pagination';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { exportToExcel, ExportColumn } from '../../src/lib/exportUtils';
import { DataImportModal } from '../../src/components/admin/DataImportModal';
import { ActionMenu } from '../../components/ui/ActionMenu';
import { useNavigate, useLocation } from 'react-router-dom';
import { normalisePhone } from '../../utils/phoneUtils';

// ─── Booking Match Helper ─────────────────────────────────────────────────────
// Matches bookings to a customer using: DB foreign-key (strict) → email → phone.
const getCustomerBookings = (customer: Customer, bookings: Booking[], includesCancelled = false) => {
    const custNormPhone = normalisePhone(customer.phone);
    const hasCustEmail = !!(customer.email && customer.email.trim() !== '');

    return bookings.filter(b => {
        if (!includesCancelled && b.status === 'Cancelled') return false;

        // 1. Direct Foreign Key Linkage
        if (b.customerId) {
            return b.customerId === customer.id;
        }

        // 2. Unlinked/Legacy: Match by email if provided on both sides
        const hasBookingEmail = !!(b.email && b.email.trim() !== '');
        if (hasBookingEmail && hasCustEmail) {
            return b.email!.trim().toLowerCase() === customer.email!.trim().toLowerCase();
        }

        // 3. Match by phone only if neither side has a conflicting email
        const bNormPhone = normalisePhone(b.phone);
        if (bNormPhone && custNormPhone && (bNormPhone === custNormPhone || (custNormPhone.length >= 10 && bNormPhone.length >= 10 && bNormPhone.slice(-10) === custNormPhone.slice(-10)))) {
            if (hasBookingEmail && hasCustEmail && b.email!.trim().toLowerCase() !== customer.email!.trim().toLowerCase()) {
                return false;
            }
            return true;
        }

        return false;
    });
};

// ─── Lead Match Helper ────────────────────────────────────────────────────────
const getCustomerLeads = (customer: Customer, leads: Lead[]) => {
    const custNormPhone = normalisePhone(customer.phone);
    const hasCustEmail = !!(customer.email && customer.email.trim() !== '');

    return leads.filter(l => {
        if (l.customerId) {
            return l.customerId === customer.id;
        }
        const hasLeadEmail = !!(l.email && l.email.trim() !== '');
        if (hasLeadEmail && hasCustEmail) {
            return l.email!.trim().toLowerCase() === customer.email!.trim().toLowerCase();
        }
        const lNormPhone = normalisePhone(l.phone);
        if (lNormPhone && custNormPhone && (lNormPhone === custNormPhone || (custNormPhone.length >= 10 && lNormPhone.length >= 10 && lNormPhone.slice(-10) === custNormPhone.slice(-10)))) {
            if (hasLeadEmail && hasCustEmail && l.email!.trim().toLowerCase() !== customer.email!.trim().toLowerCase()) {
                return false;
            }
            return true;
        }
        return false;
    });
};

const generateCustomerId = () => {
    if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
        return window.crypto.randomUUID();
    }
    return `CUST-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
};

// --- Sort & Filter Types ---
type SortField = 'name' | 'totalSpent' | 'bookingsCount' | 'joinedDate' | 'lastActive';
type SortOrder = 'asc' | 'desc';
type SegmentTab = 'All' | 'VIP' | 'Repeat' | 'New' | 'HighValue' | 'Corporate';

export const Customers: React.FC = () => {
    const { customers, bookings, leads, addCustomer, updateCustomer, deleteCustomer, importCustomers, getActiveMembershipForCustomer, membershipPlans } = useData();
    const { hasPermission } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // Server-computed or local live booking stats map
    const liveBookingStats = useMemo(() => {
        const stats: Record<string, { count: number; spent: number }> = {};
        customers.forEach(c => {
            const customerBookings = getCustomerBookings(c, bookings);
            const bookingSpent = customerBookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
            stats[c.id] = {
                count: Math.max(c.bookingsCount ?? 0, customerBookings.length),
                spent: Math.max(c.totalSpent ?? 0, bookingSpent)
            };
        });
        return stats;
    }, [customers, bookings]);

    // Handle deep linking for specific customer details drawer
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const idParam = searchParams.get('id');
        if (idParam && customers.length > 0) {
            const customer = customers.find(c => String(c.id) === String(idParam));
            if (customer) {
                setSelectedCustomer(customer);
            }
        }
    }, [location.search, customers]);

    // --- State Variables ---
    const [search, setSearch] = useState('');
    const [activeSegment, setActiveSegment] = useState<SegmentTab>('All');
    const [locationFilter, setLocationFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
    const [dateFilter, setDateFilter] = useState<'All' | 'Month' | '90Days' | 'Year'>('All');
    const [sortField, setSortField] = useState<SortField>('lastActive');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    // UI & Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);
    const [bulkTagInput, setBulkTagInput] = useState('');
    const [isBulkWAModalOpen, setIsBulkWAModalOpen] = useState(false);
    const [bulkWAMessage, setBulkWAMessage] = useState('Greetings from SHRAWELLO Travel Hub! We have exciting new holiday packages crafted just for you.');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // --- Dynamic KPI Metrics ---
    const metrics = useMemo(() => {
        const total = customers.length;
        const active = customers.filter(c => c.status !== 'Inactive').length;
        const inactive = total - active;
        let totalLTV = 0;
        let repeatCount = 0;
        let vipCount = 0;

        customers.forEach(c => {
            const stats = liveBookingStats[c.id] || { count: 0, spent: 0 };
            const spent = stats.spent;
            const count = stats.count;
            totalLTV += spent;
            if (count >= 2) repeatCount++;
            const activeMem = getActiveMembershipForCustomer(c.id);
            if (c.type === 'VIP' || spent >= 500000 || activeMem) vipCount++;
        });

        const avgSpend = total > 0 ? Math.round(totalLTV / total) : 0;
        const repeatRate = total > 0 ? Math.round((repeatCount / total) * 100) : 0;

        return {
            total,
            active,
            inactive,
            totalLTV,
            avgSpend,
            vipCount,
            repeatCount,
            repeatRate
        };
    }, [customers, liveBookingStats, getActiveMembershipForCustomer]);

    // --- Dynamic Unique Locations for Filter Dropdown ---
    const uniqueLocations = useMemo(() => {
        const locs = new Set<string>();
        customers.forEach(c => {
            if (c.location && c.location.trim()) {
                locs.add(c.location.trim());
            }
        });
        return Array.from(locs).sort();
    }, [customers]);

    // --- Data Processing, Filtering & Sorting ---
    const processedCustomers = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

        let result = customers.filter(c => {
            const q = search.trim().toLowerCase();
            const matchSearch = !q ||
                (c.name || '').toLowerCase().includes(q) ||
                (c.email || '').toLowerCase().includes(q) ||
                (c.phone || '').includes(q) ||
                (c.altPhone || '').includes(q) ||
                (c.location || '').toLowerCase().includes(q) ||
                (c.gstin || '').toLowerCase().includes(q) ||
                (Array.isArray(c.tags) && c.tags.some(t => t.toLowerCase().includes(q)));

            if (!matchSearch) return false;

            // Location Filter
            if (locationFilter !== 'All' && (c.location || '').trim().toLowerCase() !== locationFilter.toLowerCase()) {
                return false;
            }

            // Status Filter
            if (statusFilter !== 'All' && c.status !== statusFilter) {
                return false;
            }

            // Date Filter
            if (dateFilter !== 'All') {
                const checkDate = c.lastActive ? new Date(c.lastActive) : new Date(c.joinedDate);
                if (dateFilter === 'Month' && checkDate < startOfMonth) return false;
                if (dateFilter === '90Days' && checkDate < ninetyDaysAgo) return false;
                if (dateFilter === 'Year' && checkDate < startOfYear) return false;
            }

            // Segment Filter
            const stats = liveBookingStats[c.id] || { count: 0, spent: 0 };
            const isVIP = c.type === 'VIP' || stats.spent >= 500000 || !!getActiveMembershipForCustomer(c.id);
            const isRepeat = stats.count >= 2;
            const isNew = stats.count <= 1 || c.type === 'New';
            const isHighValue = stats.spent >= 100000;
            const isCorporate = Boolean(c.gstin && c.gstin.trim() !== '') || Boolean(c.billingAddress && c.billingAddress.trim() !== '');

            if (activeSegment === 'VIP') return isVIP;
            if (activeSegment === 'Repeat') return isRepeat;
            if (activeSegment === 'New') return isNew;
            if (activeSegment === 'HighValue') return isHighValue;
            if (activeSegment === 'Corporate') return isCorporate;

            return true;
        });

        return result.sort((a, b) => {
            let valA: string | number;
            let valB: string | number;

            if (sortField === 'totalSpent') {
                valA = liveBookingStats[a.id]?.spent ?? 0;
                valB = liveBookingStats[b.id]?.spent ?? 0;
            } else if (sortField === 'bookingsCount') {
                valA = liveBookingStats[a.id]?.count ?? 0;
                valB = liveBookingStats[b.id]?.count ?? 0;
            } else if (sortField === 'lastActive') {
                valA = a.lastActive ? new Date(a.lastActive).getTime() : (a.joinedDate ? new Date(a.joinedDate).getTime() : 0);
                valB = b.lastActive ? new Date(b.lastActive).getTime() : (b.joinedDate ? new Date(b.joinedDate).getTime() : 0);
            } else if (sortField === 'joinedDate') {
                valA = a.joinedDate ? new Date(a.joinedDate).getTime() : 0;
                valB = b.joinedDate ? new Date(b.joinedDate).getTime() : 0;
            } else {
                valA = (a[sortField] as string | number) ?? '';
                valB = (b[sortField] as string | number) ?? '';
            }

            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortOrder === 'asc' ? valA - valB : valB - valA;
            }
            return 0;
        });
    }, [customers, search, locationFilter, statusFilter, dateFilter, activeSegment, sortField, sortOrder, liveBookingStats, getActiveMembershipForCustomer]);

    // Pagination
    const { currentPage, setCurrentPage, itemsPerPage, setItemsPerPage, paginateData } = usePagination(processedCustomers.length, 10);
    const paginatedCustomers = paginateData<Customer>(processedCustomers);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    // Bulk-select handlers
    const handleSelectAll = (checked: boolean) => {
        setSelectedIds(checked ? new Set(paginatedCustomers.map(c => c.id)) : new Set());
    };
    const handleSelectOne = (id: string, checked: boolean) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (checked) next.add(id); else next.delete(id);
            return next;
        });
    };

    // Copy to clipboard helper
    const handleCopy = (text: string, label: string, id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success(`${label} copied to clipboard!`);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Direct WhatsApp Launcher
    const handleOpenWhatsApp = (phone: string, name: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const norm = normalisePhone(phone);
        if (!norm) {
            toast.error('No valid phone number for WhatsApp');
            return;
        }
        const text = encodeURIComponent(`Hello ${name}, greetings from SHRAWELLO Travel Hub! How may we assist with your travel plans today?`);
        window.open(`https://wa.me/${norm}?text=${text}`, '_blank');
    };

    // Direct Call Launcher
    const handleCall = (phone: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!phone) return;
        window.location.href = `tel:${phone}`;
    };

    // Direct Email Launcher
    const handleEmail = (email: string, name: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!email) return;
        window.location.href = `mailto:${email}?subject=${encodeURIComponent('Special Travel Update - SHRAWELLO Travel Hub')}`;
    };

    // Quick New Inquiry Navigation
    const handleQuickInquiry = (c: Customer, e: React.MouseEvent) => {
        e.stopPropagation();
        navigate('/admin/leads', {
            state: {
                fromCustomer: {
                    id: c.id,
                    name: c.name,
                    email: c.email,
                    phone: c.phone,
                    altPhone: c.altPhone || '',
                    whatsapp: c.whatsapp || '',
                    isWhatsappSame: c.isWhatsappSame !== undefined ? c.isWhatsappSame : true,
                    location: c.location || '',
                    address: c.address || '',
                    officeAddress: c.officeAddress || '',
                }
            }
        });
    };

    // Quick Invoice Navigation
    const handleQuickInvoice = (c: Customer, e: React.MouseEvent) => {
        e.stopPropagation();
        navigate('/admin/invoices/new', {
            state: {
                customer_id: c.id,
                type: 'Invoice',
                customerName: c.name,
                customerEmail: c.email,
                customerPhone: c.phone
            }
        });
    };

    // Export Excel (Full or Selected)
    const handleExport = (onlySelected = false) => {
        const targetList = onlySelected
            ? processedCustomers.filter(c => selectedIds.has(c.id))
            : processedCustomers;

        if (targetList.length === 0) {
            toast.error('No customers to export.');
            return;
        }

        const columns: ExportColumn<Customer>[] = [
            { header: 'ID', key: 'id', width: 25 },
            { header: 'Prefix', key: c => c.prefix || '', width: 10 },
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Email', key: 'email', width: 35 },
            { header: 'Phone', key: 'phone', width: 20 },
            { header: 'WhatsApp', key: c => c.whatsapp || c.phone || '', width: 20 },
            { header: 'Location / City', key: 'location', width: 20 },
            { header: 'Type', key: 'type', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'GSTIN', key: c => c.gstin || '', width: 20 },
            { header: 'Total Spent (INR)', key: c => liveBookingStats[c.id]?.spent ?? c.totalSpent ?? 0, width: 20 },
            { header: 'Bookings Count', key: c => liveBookingStats[c.id]?.count ?? c.bookingsCount ?? 0, width: 15 },
            { header: 'Joined Date', key: 'joinedDate', width: 15 },
            { header: 'Last Active', key: c => c.lastActive || c.joinedDate || '', width: 15 },
            { header: 'Tags', key: c => (Array.isArray(c.tags) ? c.tags.join('; ') : String(c.tags || '')), width: 30 }
        ];

        exportToExcel(targetList, columns, {
            filename: `Customers_Report_${new Date().toISOString().split('T')[0]}`,
            sheetName: 'Customers',
            title: 'SHRAWELLO Travel Hub - Customers Directory',
            subtitle: `Generated on: ${new Date().toLocaleDateString('en-IN')} | Total Records: ${targetList.length}`
        });
        toast.success(`${targetList.length} customers exported successfully!`);
    };

    // Bulk Tag Update
    const handleApplyBulkTags = async () => {
        if (!bulkTagInput.trim()) return;
        const newTags = bulkTagInput.split(',').map(t => t.trim()).filter(Boolean);
        const toastId = toast.loading('Applying tags to selected customers...');
        try {
            const targets = customers.filter(c => selectedIds.has(c.id));
            for (const c of targets) {
                const existingTags = Array.isArray(c.tags) ? c.tags : [];
                const mergedTags = Array.from(new Set([...existingTags, ...newTags]));
                await updateCustomer(c.id, { tags: mergedTags });
            }
            toast.dismiss(toastId);
            toast.success(`Tags applied to ${targets.length} customers!`);
            setIsBulkTagModalOpen(false);
            setBulkTagInput('');
            setSelectedIds(new Set());
        } catch (err: any) {
            toast.dismiss(toastId);
            toast.error(`Failed to update tags: ${err?.message || 'Error'}`);
        }
    };

    // Bulk Status Toggle
    const handleBulkStatus = async (newStatus: 'Active' | 'Inactive') => {
        const toastId = toast.loading(`Setting ${selectedIds.size} customers to ${newStatus}...`);
        try {
            const targets = customers.filter(c => selectedIds.has(c.id));
            for (const c of targets) {
                await updateCustomer(c.id, { status: newStatus });
            }
            toast.dismiss(toastId);
            toast.success(`Updated ${targets.length} customers to ${newStatus}`);
            setSelectedIds(new Set());
        } catch (err: any) {
            toast.dismiss(toastId);
            toast.error(`Bulk status update failed: ${err?.message || 'Error'}`);
        }
    };

    // Bulk Delete
    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to permanently delete ${selectedIds.size} selected customer(s)? This cannot be undone.`)) return;
        const toastId = toast.loading('Deleting selected customers...');
        try {
            const idsToDelete = Array.from(selectedIds);
            for (const id of idsToDelete) {
                await deleteCustomer(id);
            }
            toast.dismiss(toastId);
            toast.success(`${idsToDelete.length} customers deleted.`);
            setSelectedIds(new Set());
        } catch (err: any) {
            toast.dismiss(toastId);
            toast.error(`Delete failed: ${err?.message || 'Error'}`);
        }
    };

    return (
        <div className="admin-page-bg min-h-screen">
            <div className="p-6 md:p-8 pb-32 max-w-[1600px] mx-auto space-y-6">
                
                {/* ─── Header ─────────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            <span className="font-display text-4xl">Customers</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                            Enterprise 360° CRM: Manage client relationships, track lifetime value, and run marketing campaigns.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <span className="material-symbols-outlined text-[20px] text-slate-500">upload_file</span>
                            Import
                        </button>
                        <button
                            onClick={() => handleExport(false)}
                            className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <span className="material-symbols-outlined text-[20px] text-slate-500">download</span>
                            Export
                        </button>
                        <button
                            onClick={() => { setEditingCustomer(null); setIsAddModalOpen(true); }}
                            className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all flex items-center gap-2 group active:scale-95 btn-glow"
                        >
                            <span className="material-symbols-outlined group-hover:rotate-90 transition-transform text-[20px]">add</span>
                            Add Customer
                        </button>
                    </div>
                </div>

                {/* ─── Top KPI Metric Cards ────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 1. Total Customers */}
                    <div className="bg-white dark:bg-[#151d29] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-primary/40 transition-all">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Customer Base</p>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{metrics.total.toLocaleString()}</h3>
                            </div>
                            <div className="size-11 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[22px]">group</span>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">
                                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                {metrics.active} Active
                            </span>
                            <span>• {metrics.inactive} Inactive</span>
                        </div>
                    </div>

                    {/* 2. Customer Lifetime Value (LTV) */}
                    <div className="bg-white dark:bg-[#151d29] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Customer Lifetime Value</p>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">₹{metrics.totalLTV.toLocaleString()}</h3>
                            </div>
                            <div className="size-11 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[22px]">payments</span>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Avg. Spend:</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{metrics.avgSpend.toLocaleString()} / client</span>
                        </div>
                    </div>

                    {/* 3. VIP & Tiered Members */}
                    <div className="bg-white dark:bg-[#151d29] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-amber-500/40 transition-all">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">VIP & Tiered Members</p>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{metrics.vipCount}</h3>
                            </div>
                            <div className="size-11 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[22px]">workspace_premium</span>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-semibold text-amber-600 dark:text-amber-400">Elite Tier Accounts</span>
                            <span>(Spent &gt; ₹5L or Active Plan)</span>
                        </div>
                    </div>

                    {/* 4. Repeat Retention Rate */}
                    <div className="bg-white dark:bg-[#151d29] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-purple-500/40 transition-all">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Repeat Retention Rate</p>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{metrics.repeatRate}%</h3>
                            </div>
                            <div className="size-11 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[22px]">repeat</span>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-bold text-purple-600 dark:text-purple-400">{metrics.repeatCount} Repeat Clients</span>
                            <span>with 2+ Booked Trips</span>
                        </div>
                    </div>
                </div>

                {/* ─── Main Content Card ───────────────────────────────── */}
                <div className="bg-white dark:bg-[#151d29] rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col min-h-[600px]">

                    {/* Segment Tabs Header */}
                    <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/10">
                        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                            {(['All', 'VIP', 'Repeat', 'New', 'HighValue', 'Corporate'] as const).map(tab => {
                                const labels: Record<SegmentTab, string> = {
                                    All: 'All Customers',
                                    VIP: 'VIP & Members',
                                    Repeat: 'Repeat Clients',
                                    New: 'New Customers',
                                    HighValue: 'High Spenders (> ₹1L)',
                                    Corporate: 'Corporate (GST)'
                                };
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => { setActiveSegment(tab); setCurrentPage(1); setSelectedIds(new Set()); }}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                            activeSegment === tab
                                                ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                    >
                                        {labels[tab]}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Search Input with Clear Button */}
                        <div className="relative w-full md:w-80 group">
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-[18px]">search</span>
                            <input
                                type="text"
                                placeholder="Search name, phone, email, GST, city..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-10 pr-9 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    <span className="material-symbols-outlined text-[16px]">cancel</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Secondary Filter & Sort Toolbar */}
                    <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs bg-white dark:bg-[#151d29]">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 text-[11px]">
                                <span className="material-symbols-outlined text-[14px]">tune</span> Filters:
                            </span>

                            {/* Location Filter */}
                            <select
                                value={locationFilter}
                                onChange={e => { setLocationFilter(e.target.value); setCurrentPage(1); }}
                                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="All">All Locations</option>
                                {uniqueLocations.map(loc => (
                                    <option key={loc} value={loc}>{loc}</option>
                                ))}
                            </select>

                            {/* Status Filter */}
                            <select
                                value={statusFilter}
                                onChange={e => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
                                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="All">All Status</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>

                            {/* Date Filter */}
                            <select
                                value={dateFilter}
                                onChange={e => { setDateFilter(e.target.value as any); setCurrentPage(1); }}
                                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="All">All Time</option>
                                <option value="Month">Joined This Month</option>
                                <option value="90Days">Active in Last 90 Days</option>
                                <option value="Year">Joined This Year</option>
                            </select>

                            {/* Reset Filters */}
                            {(locationFilter !== 'All' || statusFilter !== 'All' || dateFilter !== 'All' || search) && (
                                <button
                                    onClick={() => {
                                        setLocationFilter('All');
                                        setStatusFilter('All');
                                        setDateFilter('All');
                                        setSearch('');
                                    }}
                                    className="text-primary hover:underline font-bold flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-[14px]">restart_alt</span>
                                    Reset Filters
                                </button>
                            )}
                        </div>

                        <div className="text-slate-400 font-medium">
                            Showing <span className="font-bold text-slate-700 dark:text-slate-200">{processedCustomers.length}</span> matching customer{processedCustomers.length === 1 ? '' : 's'}
                        </div>
                    </div>

                    {/* Actionable Bulk Actions Banner */}
                    {selectedIds.size > 0 && (
                        <div className="px-6 py-3 bg-primary/10 border-b border-primary/20 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-black text-primary flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[18px]">check_box</span>
                                    {selectedIds.size} customer{selectedIds.size > 1 ? 's' : ''} selected
                                </span>
                                <button
                                    onClick={() => setSelectedIds(new Set())}
                                    className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold transition-colors underline"
                                >
                                    Clear selection
                                </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    onClick={() => handleExport(true)}
                                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-sm"
                                >
                                    <span className="material-symbols-outlined text-[16px]">download</span>
                                    Export Selected
                                </button>
                                <button
                                    onClick={() => setIsBulkTagModalOpen(true)}
                                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-sm"
                                >
                                    <span className="material-symbols-outlined text-[16px]">label</span>
                                    Add Tags
                                </button>
                                <button
                                    onClick={() => setIsBulkWAModalOpen(true)}
                                    className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm"
                                >
                                    <span className="material-symbols-outlined text-[16px]">send</span>
                                    WhatsApp Broadcast
                                </button>
                                <button
                                    onClick={() => handleBulkStatus('Active')}
                                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Mark Active
                                </button>
                                <button
                                    onClick={() => handleBulkStatus('Inactive')}
                                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Mark Inactive
                                </button>
                                {hasPermission('customers', 'manage') && (
                                    <button
                                        onClick={handleBulkDelete}
                                        className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs font-bold rounded-lg hover:bg-red-100 dark:hover:bg-red-800/40 transition-colors flex items-center gap-1.5"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-slate-800/20 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-extrabold border-b border-slate-100 dark:border-slate-800">
                                    <th className="p-4 w-12 text-center">
                                        <input
                                            type="checkbox"
                                            checked={paginatedCustomers.length > 0 && paginatedCustomers.every(c => selectedIds.has(c.id))}
                                            onChange={e => handleSelectAll(e.target.checked)}
                                            className="rounded text-primary focus:ring-primary cursor-pointer size-4"
                                        />
                                    </th>
                                    <th onClick={() => handleSort('name')} className="p-4 cursor-pointer hover:text-primary transition-colors select-none">
                                        <div className="flex items-center gap-1">
                                            Customer Details
                                            {sortField === 'name' && (
                                                <span className="material-symbols-outlined text-[16px] text-primary">
                                                    {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th className="p-4">Contact & Location</th>
                                    <th onClick={() => handleSort('bookingsCount')} className="p-4 cursor-pointer hover:text-primary transition-colors select-none">
                                        <div className="flex items-center gap-1">
                                            Total Bookings
                                            {sortField === 'bookingsCount' && (
                                                <span className="material-symbols-outlined text-[16px] text-primary">
                                                    {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('totalSpent')} className="p-4 cursor-pointer hover:text-primary transition-colors select-none">
                                        <div className="flex items-center gap-1">
                                            Total Spent
                                            {sortField === 'totalSpent' && (
                                                <span className="material-symbols-outlined text-[16px] text-primary">
                                                    {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('lastActive')} className="p-4 cursor-pointer hover:text-primary transition-colors select-none">
                                        <div className="flex items-center gap-1">
                                            Last Active
                                            {sortField === 'lastActive' && (
                                                <span className="material-symbols-outlined text-[16px] text-primary">
                                                    {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {paginatedCustomers.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-12 text-center">
                                            <div className="max-w-sm mx-auto space-y-3">
                                                <div className="size-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                                                    <span className="material-symbols-outlined text-3xl">person_search</span>
                                                </div>
                                                <h4 className="font-bold text-slate-800 dark:text-slate-200">No customers found</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    {search || locationFilter !== 'All' || statusFilter !== 'All'
                                                        ? 'Try clearing your search query or reset filters to see all contacts.'
                                                        : 'Start building your CRM directory by adding your first customer.'}
                                                </p>
                                                <button
                                                    onClick={() => {
                                                        setSearch('');
                                                        setLocationFilter('All');
                                                        setStatusFilter('All');
                                                        setDateFilter('All');
                                                        setActiveSegment('All');
                                                    }}
                                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                                                >
                                                    Reset All Filters
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedCustomers.map(customer => {
                                        const stats = liveBookingStats[customer.id] || { count: 0, spent: 0 };
                                        const isReturning = stats.count > 1;
                                        const totalSpent = stats.spent;
                                        const isVIP = customer.type === 'VIP' || totalSpent >= 500000;
                                        const activeMembership = getActiveMembershipForCustomer(customer.id);
                                        const planDef = activeMembership ? membershipPlans.find(p => p.id === activeMembership.planId) : null;
                                        const isSelected = selectedIds.has(customer.id);

                                        return (
                                            <tr
                                                key={customer.id}
                                                onClick={() => setSelectedCustomer(customer)}
                                                className={`group hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition-all cursor-pointer ${
                                                    isSelected ? 'bg-primary/5 dark:bg-primary/10' : ''
                                                }`}
                                            >
                                                {/* Checkbox */}
                                                <td className="p-4 w-12 text-center" onClick={e => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={e => handleSelectOne(customer.id, e.target.checked)}
                                                        className={`rounded text-primary focus:ring-primary cursor-pointer size-4 transition-opacity ${
                                                            isSelected ? 'opacity-100' : 'opacity-30 group-hover:opacity-100'
                                                        }`}
                                                    />
                                                </td>

                                                {/* Customer Details */}
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`size-10 rounded-full flex items-center justify-center font-black text-sm text-white shadow-sm flex-shrink-0 relative ${
                                                            activeMembership ? 'ring-2 ring-amber-400' : ''
                                                        } ${
                                                            isVIP
                                                                ? 'bg-gradient-to-br from-amber-400 to-orange-600'
                                                                : isReturning
                                                                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                                                    : 'bg-gradient-to-br from-slate-400 to-slate-600'
                                                        }`}>
                                                            {customer.name.charAt(0).toUpperCase()}
                                                            {activeMembership && (
                                                                <span className="absolute -top-1 -right-1 size-4 bg-amber-400 rounded-full flex items-center justify-center text-[10px] text-white">★</span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-primary transition-colors flex items-center gap-1.5">
                                                                {customer.prefix ? `${customer.prefix} ` : ''}{customer.name}
                                                                {customer.status === 'Inactive' && (
                                                                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.2 rounded font-bold">Inactive</span>
                                                                )}
                                                            </p>
                                                            <div className="flex gap-1 mt-1 flex-wrap items-center">
                                                                {isVIP && (
                                                                    <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/40">
                                                                        VIP Member
                                                                    </span>
                                                                )}
                                                                {activeMembership && (
                                                                    <span
                                                                        className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 border"
                                                                        style={{
                                                                            backgroundColor: `${planDef?.color || '#CD7F32'}15`,
                                                                            borderColor: `${planDef?.color || '#CD7F32'}40`,
                                                                            color: planDef?.color || '#CD7F32'
                                                                        }}
                                                                    >
                                                                        <span className="material-symbols-outlined text-[11px]">workspace_premium</span>
                                                                        {activeMembership.tier}
                                                                    </span>
                                                                )}
                                                                {!isVIP && isReturning && (
                                                                    <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-800/40">
                                                                        Repeat Client
                                                                    </span>
                                                                )}
                                                                {!isVIP && !isReturning && customer.type === 'New' && (
                                                                    <span className="text-[10px] uppercase font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded border border-green-100 dark:border-green-800/40">
                                                                        New
                                                                    </span>
                                                                )}
                                                                {customer.gstin && (
                                                                    <span className="text-[10px] uppercase font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-1.5 py-0.5 rounded border border-purple-100 dark:border-purple-800/40">
                                                                        GST Registered
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Contact & Location */}
                                                <td className="p-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-semibold text-slate-900 dark:text-white">{customer.email || '—'}</span>
                                                            {customer.email && (
                                                                <button
                                                                    onClick={(e) => handleCopy(customer.email, 'Email', `email-${customer.id}`, e)}
                                                                    className="opacity-0 group-hover:opacity-100 hover:text-primary transition-opacity text-slate-400 p-0.5"
                                                                    title="Copy email"
                                                                >
                                                                    <span className="material-symbols-outlined text-[13px]">
                                                                        {copiedId === `email-${customer.id}` ? 'done' : 'content_copy'}
                                                                    </span>
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                                            <span>{customer.phone || '—'}</span>
                                                            {customer.phone && (
                                                                <button
                                                                    onClick={(e) => handleCopy(customer.phone, 'Phone', `phone-${customer.id}`, e)}
                                                                    className="opacity-0 group-hover:opacity-100 hover:text-primary transition-opacity text-slate-400 p-0.5"
                                                                    title="Copy phone"
                                                                >
                                                                    <span className="material-symbols-outlined text-[13px]">
                                                                        {copiedId === `phone-${customer.id}` ? 'done' : 'content_copy'}
                                                                    </span>
                                                                </button>
                                                            )}
                                                        </div>
                                                        {customer.location && (
                                                            <span className="text-[11px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                                                                <span className="material-symbols-outlined text-[12px]">location_on</span>
                                                                {customer.location}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Total Bookings (Grammar Fix: 1 trip vs 2 trips) */}
                                                <td className="p-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                                        <span className="material-symbols-outlined text-[15px] text-primary">flight_takeoff</span>
                                                        {stats.count} {stats.count === 1 ? 'trip' : 'trips'}
                                                    </span>
                                                </td>

                                                {/* Total Spent */}
                                                <td className="p-4 text-sm font-black text-slate-900 dark:text-white">
                                                    ₹{totalSpent.toLocaleString()}
                                                </td>

                                                {/* Last Active */}
                                                <td className="p-4 text-xs text-slate-500">
                                                    <div className="flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px] text-slate-400">calendar_today</span>
                                                        {customer.lastActive
                                                            ? new Date(customer.lastActive).toLocaleDateString('en-IN')
                                                            : (customer.joinedDate ? new Date(customer.joinedDate).toLocaleDateString('en-IN') : '—')}
                                                    </div>
                                                </td>

                                                {/* Row Actions & Quick Action Bar */}
                                                <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1">
                                                        {/* Quick WhatsApp Action */}
                                                        {customer.phone && (
                                                            <button
                                                                onClick={(e) => handleOpenWhatsApp(customer.whatsapp || customer.phone, customer.name, e)}
                                                                className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-sm"
                                                                title="Chat on WhatsApp"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]">chat</span>
                                                            </button>
                                                        )}

                                                        {/* Quick Call Action */}
                                                        {customer.phone && (
                                                            <button
                                                                onClick={(e) => handleCall(customer.phone, e)}
                                                                className="size-8 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-sm"
                                                                title="Call Customer"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]">call</span>
                                                            </button>
                                                        )}

                                                        {/* Quick Email Action */}
                                                        {customer.email && (
                                                            <button
                                                                onClick={(e) => handleEmail(customer.email, customer.name, e)}
                                                                className="size-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-sm"
                                                                title="Send Email"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]">mail</span>
                                                            </button>
                                                        )}

                                                        {/* Quick New Inquiry Action */}
                                                        <button
                                                            onClick={(e) => handleQuickInquiry(customer, e)}
                                                            className="size-8 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-sm"
                                                            title="New Lead / Inquiry"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">add_circle</span>
                                                        </button>

                                                        {/* Action Dropdown Menu */}
                                                        <ActionMenu>
                                                            <button
                                                                onClick={() => setSelectedCustomer(customer)}
                                                                className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2 transition-colors"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px] text-slate-400">visibility</span> View 360° Profile
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleQuickInquiry(customer, e)}
                                                                className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2 transition-colors"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px] text-primary">add_task</span> New Inquiry
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleQuickInvoice(customer, e)}
                                                                className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2 transition-colors"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px] text-amber-500">receipt_long</span> Create Invoice
                                                            </button>
                                                            <button
                                                                onClick={() => { setEditingCustomer(customer); setIsAddModalOpen(true); }}
                                                                className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2 transition-colors"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px] text-slate-400">edit</span> Edit Profile
                                                            </button>
                                                            {hasPermission('customers', 'manage') && (
                                                                <button
                                                                    onClick={() => {
                                                                        if (confirm(`Are you sure you want to permanently delete ${customer.name}? This cannot be undone.`)) {
                                                                            const toastId = toast.loading('Deleting customer...');
                                                                            deleteCustomer(customer.id)
                                                                                .then(() => {
                                                                                    toast.dismiss(toastId);
                                                                                    toast.success(`${customer.name} deleted.`);
                                                                                    if (selectedCustomer?.id === customer.id) setSelectedCustomer(null);
                                                                                })
                                                                                .catch((err) => {
                                                                                    toast.dismiss(toastId);
                                                                                    toast.error(`Delete failed: ${err?.message || 'Unknown error'}`);
                                                                                });
                                                                        }
                                                                    }}
                                                                    className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors border-t border-slate-100 dark:border-slate-800"
                                                                >
                                                                    <span className="material-symbols-outlined text-[16px]">delete</span> Delete Customer
                                                                </button>
                                                            )}
                                                        </ActionMenu>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/10">
                        <Pagination
                            currentPage={currentPage}
                            totalItems={processedCustomers.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={setItemsPerPage}
                            itemsPerPageOptions={[10, 20, 50, 100]}
                        />
                    </div>
                </div>

                {/* ─── 360° Slide-over Details Drawer ─────────────────── */}
                <CustomerDetailsDrawer
                    isOpen={!!selectedCustomer}
                    onClose={() => setSelectedCustomer(null)}
                    customer={selectedCustomer}
                    bookings={bookings}
                    leads={leads}
                    updateCustomer={updateCustomer}
                    onEdit={() => { setEditingCustomer(selectedCustomer); setIsAddModalOpen(true); }}
                />

                {/* ─── Add / Edit Modal ────────────────────────────────── */}
                <AddEditCustomerModal
                    isOpen={isAddModalOpen}
                    onClose={() => { setIsAddModalOpen(false); setEditingCustomer(null); }}
                    customer={editingCustomer}
                    onSubmit={async (data) => {
                        try {
                            if (editingCustomer) {
                                await updateCustomer(editingCustomer.id, data);
                                if (selectedCustomer?.id === editingCustomer.id) {
                                    setSelectedCustomer(prev => prev ? { ...prev, ...data } : null);
                                }
                            } else {
                                const newId = generateCustomerId();
                                await addCustomer({
                                    id: newId,
                                    ...data,
                                    totalSpent: 0,
                                    bookingsCount: 0,
                                    joinedDate: new Date().toISOString().split('T')[0],
                                    status: 'Active',
                                    preferences: { dietary: [], flight: [], accommodation: [] },
                                    notes: []
                                });
                            }
                            setIsAddModalOpen(false);
                            setEditingCustomer(null);
                        } catch (err: any) {
                            console.error('Failed to save customer:', err);
                        }
                    }}
                />

                {/* ─── Bulk Add Tag Modal ──────────────────────────────── */}
                {isBulkTagModalOpen && (
                    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-[#1A2633] w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Bulk Add Tags</h3>
                            <p className="text-xs text-slate-500 mb-4">Add tags to {selectedIds.size} selected customer(s).</p>
                            <input
                                type="text"
                                placeholder="e.g. Summer Campaign 2026, VIP Club, Corporate"
                                value={bulkTagInput}
                                onChange={e => setBulkTagInput(e.target.value)}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary outline-none mb-4"
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => { setIsBulkTagModalOpen(false); setBulkTagInput(''); }}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleApplyBulkTags}
                                    disabled={!bulkTagInput.trim()}
                                    className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-dark transition-all disabled:opacity-50"
                                >
                                    Apply Tags
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Bulk WhatsApp Broadcast Modal ──────────────────── */}
                {isBulkWAModalOpen && (
                    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-[#1A2633] w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="size-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-2xl">chat</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">WhatsApp Broadcast</h3>
                                    <p className="text-xs text-slate-500">{selectedIds.size} recipient(s) selected</p>
                                </div>
                            </div>

                            <label className="text-xs font-bold uppercase text-slate-400 block mb-1.5">Broadcast Message Template</label>
                            <textarea
                                value={bulkWAMessage}
                                onChange={e => setBulkWAMessage(e.target.value)}
                                rows={4}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none mb-4 resize-none"
                            />

                            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 mb-4 max-h-32 overflow-y-auto">
                                <p className="text-[11px] font-bold text-slate-500 mb-1">Selected Contacts:</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {customers.filter(c => selectedIds.has(c.id)).map(c => (
                                        <span key={c.id} className="px-2 py-0.5 bg-white dark:bg-slate-800 rounded text-[10px] font-semibold border border-slate-200 dark:border-slate-700">
                                            {c.name} ({c.whatsapp || c.phone || 'No phone'})
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-between items-center">
                                <button
                                    onClick={() => {
                                        const phoneList = customers
                                            .filter(c => selectedIds.has(c.id) && (c.whatsapp || c.phone))
                                            .map(c => normalisePhone(c.whatsapp || c.phone))
                                            .join(', ');
                                        navigator.clipboard.writeText(phoneList);
                                        toast.success('Phone numbers copied to clipboard!');
                                    }}
                                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                    Copy Numbers List
                                </button>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsBulkWAModalOpen(false)}
                                        className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                                    >
                                        Close
                                    </button>
                                    <button
                                        onClick={() => {
                                            const targets = customers.filter(c => selectedIds.has(c.id) && (c.whatsapp || c.phone));
                                            if (targets.length > 0) {
                                                const first = targets[0];
                                                const phone = normalisePhone(first.whatsapp || first.phone);
                                                const encoded = encodeURIComponent(bulkWAMessage);
                                                window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
                                                toast.success(`Opening WhatsApp for ${first.name}...`);
                                            } else {
                                                toast.error('No selected contacts have valid phone numbers.');
                                            }
                                        }}
                                        className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-1.5"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">send</span>
                                        Open Chat
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Import Modal ───────────────────────────────────── */}
                <DataImportModal<Partial<Customer>>
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    entityName="Customers"
                    columns={[
                        { header: 'Name', key: 'name', required: true },
                        { header: 'Email', key: 'email', required: true },
                        { header: 'Phone', key: 'phone', required: true },
                        { header: 'Location', key: 'location', required: false }
                    ]}
                    onImport={(data) => {
                        const fullCustomers: Customer[] = data.map((d, index) => ({
                            id: `IMP-CUST-${Date.now()}-${index}`,
                            name: d.name || 'Unknown',
                            email: d.email || '',
                            phone: d.phone || '',
                            location: d.location || '',
                            type: 'New',
                            status: 'Active',
                            bookingsCount: 0,
                            totalSpent: 0,
                            joinedDate: new Date().toISOString().split('T')[0],
                            tags: [],
                            preferences: { dietary: [], flight: [], accommodation: [] },
                            notes: []
                        }));
                        importCustomers(fullCustomers);
                        setIsImportModalOpen(false);
                        toast.success(`${data.length} customers imported!`);
                    }}
                />
            </div>
        </div>
    );
};

// ─── 360° Slide-over Customer Details Drawer ─────────────────────────────────
const CustomerDetailsDrawer: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    customer: Customer | null;
    bookings: Booking[];
    leads: Lead[];
    updateCustomer: (id: string, data: Partial<Customer>) => void;
    onEdit: () => void;
}> = ({ isOpen, onClose, customer, bookings, leads, updateCustomer, onEdit }) => {
    const { getActiveMembershipForCustomer, membershipPlans } = useData();
    const { user } = useAuth();
    const navigate = useNavigate();

    // Drawer Tabs
    const [drawerTab, setDrawerTab] = useState<'overview' | 'preferences' | 'purchases' | 'timeline' | 'notes'>('overview');
    const [note, setNote] = useState('');
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [editNoteText, setEditNoteText] = useState('');
    const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);

    // Fetch invoices for this customer
    useEffect(() => {
        if (!customer) {
            setCustomerInvoices([]);
            return;
        }
        let isMounted = true;
        const fetchInvoices = async () => {
            setLoadingInvoices(true);
            try {
                const token = localStorage.getItem('shravya_jwt');
                const searchParam = encodeURIComponent(customer.email || customer.phone || customer.name);
                const res = await fetch(`/api/crud/invoices?search=${searchParam}&limit=50`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });
                if (res.ok) {
                    const d = await res.json();
                    if (isMounted) setCustomerInvoices(d.data || []);
                }
            } catch (err) {
                console.error('Failed to load customer invoices:', err);
            } finally {
                if (isMounted) setLoadingInvoices(false);
            }
        };
        fetchInvoices();
        return () => { isMounted = false; };
    }, [customer]);

    // Outstanding invoices balance calculation
    const outstandingBalance = useMemo(() => {
        return customerInvoices
            .filter(inv => inv.status !== 'Paid' && inv.status !== 'Void')
            .reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
    }, [customerInvoices]);

    const handleNewInquiry = () => {
        if (!customer) return;
        navigate('/admin/leads', {
            state: {
                fromCustomer: {
                    id: customer.id,
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone,
                    altPhone: customer.altPhone || '',
                    whatsapp: customer.whatsapp || '',
                    isWhatsappSame: customer.isWhatsappSame !== undefined ? customer.isWhatsappSame : true,
                    location: customer.location || '',
                    address: customer.address || '',
                    officeAddress: customer.officeAddress || '',
                }
            }
        });
        onClose();
    };

    const handleCreateInvoice = () => {
        if (!customer) return;
        navigate('/admin/invoices/new', {
            state: {
                customer_id: customer.id,
                type: 'Invoice',
                customerName: customer.name,
                customerEmail: customer.email,
                customerPhone: customer.phone
            }
        });
        onClose();
    };

    const copyToClipboard = (text: string, label: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard!`);
    };

    if (!customer) return null;

    const activeMembership = getActiveMembershipForCustomer(customer.id);
    const plan = activeMembership ? membershipPlans.find(p => p.id === activeMembership.planId) : null;
    const customerBookings = getCustomerBookings(customer, bookings, true);
    const bookingBasedSpent = customerBookings.filter(b => b.status !== 'Cancelled').reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    const totalSpent = Math.max(customer.totalSpent ?? 0, bookingBasedSpent);

    const handleAddNote = (e: React.FormEvent) => {
        e.preventDefault();
        if (!note.trim()) return;
        const newNote: CustomerNote = {
            id: `NOTE-${Date.now()}`,
            text: note,
            author: user?.name || 'Admin',
            date: new Date().toISOString()
        };
        const existingNotes = customer.notes || [];
        updateCustomer(customer.id, { notes: [newNote, ...existingNotes] });
        setNote('');
        toast.success('Note added');
    };

    const handleDeleteNote = (noteId: string) => {
        if (!confirm('Delete this note?')) return;
        const updatedNotes = (customer.notes || []).filter(n => n.id !== noteId);
        updateCustomer(customer.id, { notes: updatedNotes });
        toast.success('Note deleted');
    };

    const handleUpdateNote = (noteId: string) => {
        if (!editNoteText.trim()) return;
        const updatedNotes = (customer.notes || []).map(n =>
            n.id === noteId ? { ...n, text: editNoteText } : n
        );
        updateCustomer(customer.id, { notes: updatedNotes });
        setEditingNoteId(null);
        setEditNoteText('');
        toast.success('Note updated');
    };

    return (
        <>
            {isOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[150] transition-opacity" onClick={onClose} />}
            <div className={`fixed inset-y-0 right-0 w-full max-w-2xl bg-white dark:bg-[#0B1116] shadow-2xl z-[160] transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
                
                {/* ─── Drawer Header ─────────────────────────────────────── */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#0B1116] z-10">
                    <div className="flex items-center gap-4">
                        <div className={`size-14 rounded-full flex items-center justify-center font-black text-xl text-white shadow-md flex-shrink-0 ${
                            customer.type === 'VIP' ? 'bg-gradient-to-br from-amber-400 to-orange-600' : 'bg-gradient-to-br from-slate-500 to-slate-700'
                        }`}>
                            {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                {customer.prefix ? `${customer.prefix} ` : ''}{customer.name}
                                {customer.type === 'VIP' && (
                                    <span className="text-[10px] uppercase bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold">
                                        VIP Client
                                    </span>
                                )}
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                ID: #{customer.id.includes('-') ? customer.id.split('-')[1] : customer.id.slice(-6)} • {customer.location || 'Location Not Set'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {customer.phone && (
                            <button
                                onClick={() => {
                                    const cleanPhone = normalisePhone(customer.whatsapp || customer.phone);
                                    window.open(`https://wa.me/${cleanPhone}`, '_blank');
                                }}
                                className="size-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-colors"
                                title="Chat on WhatsApp"
                            >
                                <span className="material-symbols-outlined text-[18px]">chat</span>
                            </button>
                        )}
                        {customer.phone && (
                            <button
                                onClick={() => { window.location.href = `tel:${customer.phone}`; }}
                                className="size-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors"
                                title="Call"
                            >
                                <span className="material-symbols-outlined text-[18px]">call</span>
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="size-9 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 flex items-center justify-center"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                {/* ─── Drawer Tabs ───────────────────────────────────────── */}
                <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 bg-slate-50/50 dark:bg-slate-900/30 gap-6 text-xs font-bold overflow-x-auto">
                    {[
                        { id: 'overview', label: 'Overview', icon: 'person' },
                        { id: 'preferences', label: 'Preferences', icon: 'flight' },
                        { id: 'purchases', label: 'Bookings & Invoices', icon: 'receipt_long' },
                        { id: 'timeline', label: 'Timeline', icon: 'history' },
                        { id: 'notes', label: 'Notes', icon: 'note_alt' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setDrawerTab(tab.id as any)}
                            className={`py-3.5 flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
                                drawerTab === tab.id
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ─── Drawer Scrollable Body ────────────────────────────── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 dark:bg-black/20">
                    
                    {/* Top Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Membership</div>
                            <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1" style={{ color: plan?.color }}>
                                <span className="material-symbols-outlined text-[14px]">workspace_premium</span>
                                {activeMembership ? `${activeMembership.tier}` : 'Standard'}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Customer Since</div>
                            <div className="text-sm font-black text-slate-900 dark:text-white">
                                {new Date(customer.joinedDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Spent</div>
                            <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                ₹{totalSpent.toLocaleString()}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Outstanding</div>
                            <div className={`text-sm font-black ${outstandingBalance > 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                                ₹{outstandingBalance.toLocaleString()}
                            </div>
                        </div>
                    </div>

                    {/* TAB 1: OVERVIEW */}
                    {drawerTab === 'overview' && (
                        <div className="space-y-6 animate-in fade-in">
                            {/* Contact Details */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px] text-primary">contacts</span>
                                    Contact & Profile Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Full Name</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.prefix ? `${customer.prefix} ` : ''}{customer.name}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Date of Birth</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.dob ? new Date(customer.dob).toLocaleDateString('en-IN') : 'Not set'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Primary Email</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.email || '—'}</span>
                                            {customer.email && (
                                                <button onClick={() => copyToClipboard(customer.email, 'Email')} className="text-slate-400 hover:text-primary">
                                                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Primary Phone</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.phone || '—'}</span>
                                            {customer.phone && (
                                                <button onClick={() => copyToClipboard(customer.phone, 'Phone')} className="text-slate-400 hover:text-primary">
                                                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Alternate Phone</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.altPhone || 'Not set'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">WhatsApp Number</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                            {customer.whatsapp || customer.phone || 'Not set'}
                                            {customer.isWhatsappSame && <span className="text-[10px] bg-primary/10 text-primary px-1 rounded font-bold">Same</span>}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Addresses & GSTIN */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px] text-primary">home_pin</span>
                                    Addresses & Tax Details
                                </h3>
                                <div className="space-y-4 text-xs">
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Residential Address</span>
                                            {customer.address && (
                                                <button onClick={() => copyToClipboard(customer.address!, 'Residential Address')} className="text-primary hover:underline text-[10px] font-bold flex items-center gap-0.5">
                                                    <span className="material-symbols-outlined text-[12px]">content_copy</span> Copy
                                                </button>
                                            )}
                                        </div>
                                        <p className="font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 whitespace-pre-wrap">
                                            {customer.address || <span className="text-slate-400 italic">No residential address stored.</span>}
                                        </p>
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Billing Address</span>
                                            {customer.billingAddress && (
                                                <button onClick={() => copyToClipboard(customer.billingAddress!, 'Billing Address')} className="text-primary hover:underline text-[10px] font-bold flex items-center gap-0.5">
                                                    <span className="material-symbols-outlined text-[12px]">content_copy</span> Copy
                                                </button>
                                            )}
                                        </div>
                                        <p className="font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 whitespace-pre-wrap">
                                            {customer.billingAddress || <span className="text-slate-400 italic">No billing address stored.</span>}
                                        </p>
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">GSTIN Number</span>
                                            {customer.gstin && (
                                                <button onClick={() => copyToClipboard(customer.gstin!, 'GSTIN')} className="text-primary hover:underline text-[10px] font-bold flex items-center gap-0.5">
                                                    <span className="material-symbols-outlined text-[12px]">content_copy</span> Copy
                                                </button>
                                            )}
                                        </div>
                                        <p className="font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                            {customer.gstin || <span className="text-slate-400 font-normal italic">No GSTIN registered.</span>}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: PREFERENCES */}
                    {drawerTab === 'preferences' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px] text-primary">restaurant</span>
                                    Dietary Preferences
                                </h3>
                                <div className="flex gap-2 flex-wrap">
                                    {(customer.preferences?.dietary || ['None specified']).map(tag => (
                                        <span key={tag} className="px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs font-bold rounded-lg border border-green-100 dark:border-green-800">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px] text-primary">flight_class</span>
                                    Flight & Seating Preferences
                                </h3>
                                <div className="flex gap-2 flex-wrap">
                                    {(customer.preferences?.flight || ['Standard']).map(tag => (
                                        <span key={tag} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-lg border border-blue-100 dark:border-blue-800">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px] text-primary">hotel</span>
                                    Accommodation & Room Preferences
                                </h3>
                                <div className="flex gap-2 flex-wrap">
                                    {(customer.preferences?.accommodation || ['Non-Smoking', 'High Floor']).map(tag => (
                                        <span key={tag} className="px-3 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-lg border border-purple-100 dark:border-purple-800">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: PURCHASES & INVOICES */}
                    {drawerTab === 'purchases' && (
                        <div className="space-y-6 animate-in fade-in">
                            {/* Bookings Table */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[16px] text-primary">flight_takeoff</span>
                                        Tour Bookings ({customerBookings.length})
                                    </h3>
                                    <button
                                        onClick={handleNewInquiry}
                                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">add</span> New Booking
                                    </button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                                <th className="p-2.5">Booking No</th>
                                                <th className="p-2.5">Trip / Destination</th>
                                                <th className="p-2.5">Date</th>
                                                <th className="p-2.5">Amount</th>
                                                <th className="p-2.5">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {customerBookings.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="p-6 text-center text-slate-400 italic">No bookings recorded yet.</td>
                                                </tr>
                                            ) : (
                                                customerBookings.map(b => (
                                                    <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                                                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">{b.bookingNumber ? `BK-${b.bookingNumber.toString().padStart(4, '0')}` : b.invoiceNo || 'N/A'}</td>
                                                        <td className="p-2.5 font-medium text-slate-700 dark:text-slate-300">{b.title || 'Custom Holiday'}</td>
                                                        <td className="p-2.5 text-slate-500">{new Date(b.date).toLocaleDateString('en-IN')}</td>
                                                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">₹{Number(b.amount).toLocaleString()}</td>
                                                        <td className="p-2.5">
                                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                                                b.status === 'Confirmed' ? 'bg-green-50 text-green-600 dark:bg-green-900/20' :
                                                                b.status === 'Pending' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20' :
                                                                'bg-red-50 text-red-600 dark:bg-red-900/20'
                                                            }`}>
                                                                {b.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Invoices Table */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[16px] text-amber-500">receipt</span>
                                        GST Invoices & Statements ({customerInvoices.length})
                                    </h3>
                                    <button
                                        onClick={handleCreateInvoice}
                                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">add</span> Create Invoice
                                    </button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                                <th className="p-2.5">Invoice No</th>
                                                <th className="p-2.5">Date</th>
                                                <th className="p-2.5">Amount</th>
                                                <th className="p-2.5">Status</th>
                                                <th className="p-2.5 text-right">Link</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {loadingInvoices ? (
                                                <tr><td colSpan={5} className="p-4 text-center text-slate-400">Loading invoices...</td></tr>
                                            ) : customerInvoices.length === 0 ? (
                                                <tr><td colSpan={5} className="p-4 text-center text-slate-400 italic">No invoices linked.</td></tr>
                                            ) : (
                                                customerInvoices.map((inv: any) => (
                                                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                                                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">{inv.invoice_number || inv.id}</td>
                                                        <td className="p-2.5 text-slate-500">{new Date(inv.invoice_date || inv.created_at).toLocaleDateString('en-IN')}</td>
                                                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">₹{Number(inv.total_amount || 0).toLocaleString()}</td>
                                                        <td className="p-2.5">
                                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                                                inv.status === 'Paid' ? 'bg-green-50 text-green-600 dark:bg-green-900/20' :
                                                                inv.status === 'Sent' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' :
                                                                'bg-amber-50 text-amber-600 dark:bg-amber-900/20'
                                                            }`}>
                                                                {inv.status || 'Draft'}
                                                            </span>
                                                        </td>
                                                        <td className="p-2.5 text-right">
                                                            <button
                                                                onClick={() => { navigate(`/admin/invoices`); onClose(); }}
                                                                className="text-primary font-bold hover:underline"
                                                            >
                                                                View →
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: TIMELINE */}
                    {drawerTab === 'timeline' && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm animate-in fade-in">
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-6">Activity Timeline</h3>
                            <div className="space-y-6 pl-4 border-l border-slate-200 dark:border-slate-700">
                                {(() => {
                                    const relatedLeads = getCustomerLeads(customer, leads);
                                    const timelineItems = [
                                        ...customerBookings.map(b => ({
                                            type: 'Booking',
                                            date: b.date,
                                            title: b.title || 'Trip booked',
                                            amount: b.amount,
                                            status: b.status,
                                            id: b.id
                                        })),
                                        ...relatedLeads.map(l => ({
                                            type: 'Enquiry',
                                            date: l.addedOn,
                                            title: `Enquiry for ${l.destination || 'Custom Tour'}`,
                                            amount: undefined,
                                            status: l.status,
                                            id: l.id
                                        }))
                                    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                    if (timelineItems.length === 0) {
                                        return <p className="text-xs text-slate-400 italic">No activity recorded.</p>;
                                    }

                                    return timelineItems.map((item, idx) => (
                                        <div key={item.id + idx} className="relative group">
                                            <div className={`absolute -left-[21px] top-1 size-2.5 rounded-full border-2 border-white dark:border-slate-800 ${
                                                item.type === 'Booking' ? 'bg-primary' : 'bg-amber-400'
                                            }`} />
                                            <div className="flex justify-between items-start mb-1 flex-wrap gap-1">
                                                <div>
                                                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                        {item.type === 'Booking' ? (
                                                            <span className="material-symbols-outlined text-[14px] text-primary">flight_takeoff</span>
                                                        ) : (
                                                            <span className="material-symbols-outlined text-[14px] text-amber-500">contact_support</span>
                                                        )}
                                                        {item.type}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 ml-2">{new Date(item.date).toLocaleDateString('en-IN')}</span>
                                                </div>
                                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                                    {item.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                                {item.title} {item.amount ? `• ₹${Number(item.amount).toLocaleString()}` : ''}
                                            </p>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    )}

                    {/* TAB 5: NOTES */}
                    {drawerTab === 'notes' && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm animate-in fade-in">
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4">Internal CRM Notes</h3>
                            <form onSubmit={handleAddNote} className="mb-6">
                                <textarea
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                    placeholder="Type an internal note about client preferences, special requests, or call summaries..."
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-primary outline-none resize-none h-24 mb-2"
                                />
                                <button
                                    type="submit"
                                    disabled={!note.trim()}
                                    className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 float-right"
                                >
                                    Add Note
                                </button>
                                <div className="clear-both" />
                            </form>

                            <div className="space-y-4 pl-4 border-l border-slate-200 dark:border-slate-700">
                                {(customer.notes || []).length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">No notes recorded yet.</p>
                                ) : (
                                    (customer.notes || []).map(n => (
                                        <div key={n.id} className="relative group">
                                            <div className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-slate-300 dark:bg-slate-600 border-2 border-white dark:border-slate-800 group-hover:bg-primary transition-colors" />
                                            <div className="flex justify-between items-start mb-1 flex-wrap gap-1">
                                                <div>
                                                    <span className="text-xs font-bold text-slate-900 dark:text-white">{n.author}</span>
                                                    <span className="text-[10px] text-slate-400 ml-2">{new Date(n.date).toLocaleDateString('en-IN')}</span>
                                                </div>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5">
                                                    <button
                                                        onClick={() => { setEditingNoteId(n.id); setEditNoteText(n.text); }}
                                                        className="text-[10px] bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-bold"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteNote(n.id)}
                                                        className="text-[10px] bg-red-50 dark:bg-red-900/20 text-red-600 px-2 py-0.5 rounded font-bold"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>

                                            {editingNoteId === n.id ? (
                                                <div className="mt-2">
                                                    <textarea
                                                        value={editNoteText}
                                                        onChange={e => setEditNoteText(e.target.value)}
                                                        className="w-full p-2 bg-white dark:bg-slate-800 border border-primary rounded-lg text-xs outline-none resize-none h-20 mb-2"
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => { setEditingNoteId(null); setEditNoteText(''); }} className="text-xs px-3 py-1 text-slate-500">Cancel</button>
                                                        <button onClick={() => handleUpdateNote(n.id)} className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-lg">Save</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{n.text}</p>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ─── Drawer Sticky Footer ──────────────────────────────── */}
                <div className="p-4 bg-white dark:bg-[#0B1116] border-t border-slate-100 dark:border-slate-800 sticky bottom-0 space-y-2">
                    <button
                        onClick={handleNewInquiry}
                        className="w-full py-3 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 btn-glow"
                    >
                        <span className="material-symbols-outlined text-[18px]">add_circle</span>
                        New Inquiry / Trip Request for this Customer
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={onEdit}
                            className="py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            Edit Profile
                        </button>
                        <button
                            onClick={handleCreateInvoice}
                            className="py-2.5 bg-slate-900 text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl font-bold text-xs hover:bg-slate-800 transition-colors shadow-sm"
                        >
                            Create Invoice
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

// ─── Add / Edit Customer Modal ──────────────────────────────────────────────
const customerSchema = z.object({
    name: z.string().trim().min(2, 'Name is required'),
    email: z.string().trim().email('Invalid email').or(z.literal('')).optional(),
    phone: z.string().trim().min(7, 'Invalid phone number').or(z.literal('')).optional(),
    location: z.string().optional(),
    type: z.enum(['New', 'Returning', 'VIP']),
    status: z.enum(['Active', 'Inactive']).optional(),
    tags: z.string().optional(),
    prefix: z.string().optional(),
    dob: z.string().optional(),
    altPhone: z.string().optional(),
    whatsapp: z.string().optional(),
    isWhatsappSame: z.boolean().optional(),
    address: z.string().optional(),
    officeAddress: z.string().optional(),
    billingAddress: z.string().optional(),
    gstin: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

const AddEditCustomerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    customer: Customer | null;
    onSubmit: (data: CustomerFormData & { tags: string[] }) => Promise<void> | void;
}> = ({ isOpen, onClose, customer, onSubmit }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<CustomerFormData>({
        resolver: zodResolver(customerSchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            location: '',
            type: 'New',
            status: 'Active',
            tags: '',
            prefix: '',
            dob: '',
            altPhone: '',
            whatsapp: '',
            isWhatsappSame: false,
            address: '',
            officeAddress: '',
            billingAddress: '',
            gstin: ''
        }
    });

    const isWhatsappSame = watch('isWhatsappSame');
    const phone = watch('phone');

    useEffect(() => {
        if (isWhatsappSame) {
            setValue('whatsapp', phone || '');
        }
    }, [isWhatsappSame, phone, setValue]);

    useEffect(() => {
        if (customer) {
            reset({
                name: customer.name || '',
                email: customer.email || '',
                phone: customer.phone || '',
                location: customer.location || '',
                type: customer.type || 'New',
                status: customer.status || 'Active',
                tags: Array.isArray(customer.tags) ? customer.tags.join(', ') : (customer.tags || ''),
                prefix: customer.prefix || '',
                dob: customer.dob || '',
                altPhone: customer.altPhone || '',
                whatsapp: customer.whatsapp || '',
                isWhatsappSame: !!customer.isWhatsappSame,
                address: customer.address || '',
                officeAddress: customer.officeAddress || '',
                billingAddress: customer.billingAddress || '',
                gstin: customer.gstin || ''
            });
        } else {
            reset({
                name: '',
                email: '',
                phone: '',
                location: '',
                type: 'New',
                status: 'Active',
                tags: '',
                prefix: '',
                dob: '',
                altPhone: '',
                whatsapp: '',
                isWhatsappSame: false,
                address: '',
                officeAddress: '',
                billingAddress: '',
                gstin: ''
            });
        }
    }, [customer, reset, isOpen]);

    const handleFormSubmit = async (data: CustomerFormData) => {
        const tagsArray = data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
        setIsSubmitting(true);
        try {
            await onSubmit({ ...data, tags: tagsArray });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white dark:bg-[#1A2633] w-full max-w-2xl rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 ring-1 ring-white/10 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            {customer ? 'Edit Customer Profile' : 'New Customer Profile'}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">Manage customer credentials, addresses, and GST numbers.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <span className="material-symbols-outlined text-slate-400">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 text-xs">
                    {/* Prefix and Name */}
                    <div className="grid grid-cols-4 gap-3">
                        <div className="col-span-1">
                            <label className="font-bold uppercase text-slate-500 block mb-1">Prefix</label>
                            <select {...register('prefix')} className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 font-bold outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white">
                                <option value="">None</option>
                                <option value="Mr.">Mr.</option>
                                <option value="Ms.">Ms.</option>
                                <option value="Mrs.">Mrs.</option>
                                <option value="Dr.">Dr.</option>
                                <option value="Prof.">Prof.</option>
                            </select>
                        </div>
                        <div className="col-span-3">
                            <label className="font-bold uppercase text-slate-500 block mb-1">Full Name *</label>
                            <input {...register('name')} placeholder="e.g. Rohit Jadhav" className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 font-bold outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white" />
                            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                        </div>
                    </div>

                    {/* Email and DOB */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="font-bold uppercase text-slate-500 block mb-1">Email Address</label>
                            <input {...register('email')} placeholder="name@domain.com" className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 font-bold outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white" />
                            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                        </div>
                        <div>
                            <label className="font-bold uppercase text-slate-500 block mb-1">Date of Birth</label>
                            <input type="date" {...register('dob')} className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 font-bold outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white" />
                        </div>
                    </div>

                    {/* Phone & Alt Phone */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="font-bold uppercase text-slate-500 block mb-1">Main Phone Number</label>
                            <input {...register('phone')} placeholder="e.g. 9876543210" className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 font-bold outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white" />
                            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
                        </div>
                        <div>
                            <label className="font-bold uppercase text-slate-500 block mb-1">Alternate Phone</label>
                            <input {...register('altPhone')} placeholder="Alt phone number" className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 font-bold outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white" />
                        </div>
                    </div>

                    {/* WhatsApp */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="font-bold uppercase text-slate-500 block">WhatsApp Number</label>
                            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-primary hover:underline select-none">
                                <input type="checkbox" {...register('isWhatsappSame')} className="rounded text-primary focus:ring-primary size-3.5" />
                                Same as Main Phone
                            </label>
                        </div>
                        <input
                            {...register('whatsapp')}
                            readOnly={isWhatsappSame}
                            placeholder="WhatsApp Number"
                            className={`w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 font-bold outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white ${
                                isWhatsappSame ? 'bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed opacity-80' : 'bg-slate-50 dark:bg-slate-800'
                            }`}
                        />
                    </div>

                    {/* Location, Type & Status */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="font-bold uppercase text-slate-500 block mb-1">Location / City</label>
                            <input {...register('location')} placeholder="e.g. Mumbai" className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 font-bold outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="font-bold uppercase text-slate-500 block mb-1">Type</label>
                            <select {...register('type')} className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 font-bold outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white">
                                <option value="New">New</option>
                                <option value="Returning">Returning</option>
                                <option value="VIP">VIP</option>
                            </select>
                        </div>
                        <div>
                            <label className="font-bold uppercase text-slate-500 block mb-1">Status</label>
                            <select {...register('status')} className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 font-bold outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white">
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    {/* Residential & Office Address */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="font-bold uppercase text-slate-500 block mb-1">Residential Address</label>
                            <textarea {...register('address')} placeholder="Residential address" className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 font-medium outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white resize-none h-16" />
                        </div>
                        <div>
                            <label className="font-bold uppercase text-slate-500 block mb-1">Office Address</label>
                            <textarea {...register('officeAddress')} placeholder="Office address" className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 font-medium outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white resize-none h-16" />
                        </div>
                    </div>

                    {/* Billing Address & GSTIN */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="font-bold uppercase text-slate-500 block mb-1">Billing Address</label>
                            <textarea {...register('billingAddress')} placeholder="Billing address for GST invoices" className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 font-medium outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white resize-none h-16" />
                        </div>
                        <div>
                            <label className="font-bold uppercase text-slate-500 block mb-1">GSTIN Number</label>
                            <input {...register('gstin')} placeholder="e.g. 27AAAAA0000A1Z0" className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 font-bold outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white" />
                        </div>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="font-bold uppercase text-slate-500 block mb-1">Tags (comma separated)</label>
                        <input {...register('tags')} placeholder="e.g. High Value, Family Traveler, Honeymoon, Luxury" className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 font-bold outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white" />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all mt-4 disabled:opacity-60 flex items-center justify-center gap-2 text-sm btn-glow"
                    >
                        {isSubmitting && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
                        {isSubmitting ? 'Saving Profile...' : 'Save Customer Profile'}
                    </button>
                </form>
            </div>
        </div>
    );
};
