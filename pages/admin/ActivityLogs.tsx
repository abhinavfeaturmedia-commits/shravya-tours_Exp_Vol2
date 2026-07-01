import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
    Search, Filter, ChevronLeft, ChevronRight,
    Clock, User, ShieldAlert, ArrowRight, Activity,
    Calendar, CheckCircle, Database, Layout, RefreshCw,
    Plane, UserPlus, Hotel, Briefcase, Store, Users, Key, Tag, Trash2
} from 'lucide-react';
import { AuditLog } from '../../types';

export const ActivityLogs: React.FC = () => {
    const navigate = useNavigate();
    const {
        auditLogs, bookings, leads, packages, vendors, customers,
        masterHotels, masterLocations, tasks, followUps
    } = useData();
    const { staff } = useAuth();

    // UI Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStaff, setSelectedStaff] = useState('All');
    const [selectedModule, setSelectedModule] = useState('All');
    const [selectedAction, setSelectedAction] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    // 1. Resolve Creator Details (email -> staff name, initials, color)
    const getStaffDetails = (email: string) => {
        if (!email || email.toLowerCase() === 'system') {
            return { name: 'System', initials: 'SYS', color: 'slate' };
        }
        const found = staff.find(s => s.email.toLowerCase() === email.toLowerCase());
        if (found) {
            return {
                name: found.name,
                initials: found.initials || found.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
                color: found.color || 'indigo'
            };
        }
        // Fallback for custom or missing staff profile
        const username = email.split('@')[0];
        const initials = username.substring(0, 2).toUpperCase();
        return { name: username, initials, color: 'sky' };
    };

    // Helper to extract ID for deep linking
    const extractRecordId = (details: string) => {
        const match = details.match(/(?:Created|Updated|Deleted|Approved deletion of) record ([a-zA-Z0-9-]+)/i);
        if (match) return match[1];
        
        // Secondary pattern matching: "Updated record UUID" or "Deleted booking UUID"
        const matchAlt = details.match(/(?:record|booking|lead|customer|vendor|package|hotel|location|staff|commission|coupon) ([a-zA-Z0-9-]+)/i);
        return matchAlt ? matchAlt[1] : null;
    };

    // Helper to format updated database columns to user-friendly business names
    const formatFieldNames = (colsString: string) => {
        if (!colsString) return '';
        const fields = colsString.split(',').map(f => f.trim()).filter(f => f.length > 0);
        if (fields.length === 0) return '';

        const mapping: Record<string, string> = {
            'title': 'Title',
            'description': 'Description',
            'assigned_to': 'Assigned Staff',
            'assigned_by': 'Assigned By',
            'status': 'Status',
            'priority': 'Priority',
            'due_date': 'Due Date',
            'date': 'Start Date',
            'endDate': 'End Date',
            'amount': 'Amount/Price',
            'payment': 'Payment Status',
            'details': 'Details',
            'destination': 'Destination',
            'name': 'Name',
            'email': 'Email Address',
            'phone': 'Phone Number',
            'whatsapp': 'WhatsApp Number',
            'budget': 'Budget',
            'travelers': 'Travelers Count',
            'paxAdult': 'Adults Count',
            'paxChild': 'Children Count',
            'paxInfant': 'Infants Count',
            'serviceType': 'Service Type',
            'residentialAddress': 'Residential Address',
            'officeAddress': 'Office Address',
            'gstin': 'GST Number',
            'billingAddress': 'Billing Address'
        };

        const resolved = fields.map(f => mapping[f] || f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
        return `Changed: ${resolved.join(', ')}`;
    };

    // 2. Resolve specific activity details dynamically (Title, Subtitle, Icon, Color)
    const resolveActivityDetails = (log: AuditLog) => {
        const recordId = extractRecordId(log.details);
        const mod = log.module.toLowerCase();
        const action = log.action;
        
        let title = `${action} in ${log.module}`;
        let subtitle = log.details;
        let iconComponent = Activity;
        let color = 'text-slate-500';

        // Extract list of changed fields if this is an Update log
        const fieldsPart = log.details.includes(':') ? log.details.split(':')[1]?.trim() : '';
        const formattedFields = formatFieldNames(fieldsPart);

        // Module checks
        if (mod === 'bookings') {
            iconComponent = Plane;
            color = 'text-green-500';
            if (recordId) {
                const booking = bookings.find(b => String(b.id) === String(recordId) || String(b.bookingNumber) === String(recordId));
                if (booking) {
                    title = `Booking: ${booking.customer}`;
                    subtitle = `${formattedFields ? formattedFields + ' • ' : ''}${booking.title} - ₹${booking.amount.toLocaleString()}`;
                } else {
                    title = `${action} Booking`;
                    subtitle = formattedFields ? `${formattedFields} (ID: ${recordId.substring(0, 8)}...)` : log.details;
                }
            }
        } else if (mod === 'leads') {
            iconComponent = UserPlus;
            color = 'text-purple-500';
            if (recordId) {
                const lead = leads.find(l => String(l.id) === String(recordId) || String(l.leadNumber) === String(recordId));
                if (lead) {
                    title = `Lead: ${lead.name}`;
                    subtitle = `${formattedFields ? formattedFields + ' • ' : ''}${lead.destination} (${lead.status})`;
                } else {
                    title = `${action} Lead`;
                    subtitle = formattedFields ? `${formattedFields} (ID: ${recordId.substring(0, 8)}...)` : log.details;
                }
            }
        } else if (mod === 'tasks') {
            iconComponent = CheckCircle;
            color = 'text-indigo-500';
            if (recordId) {
                const task = tasks.find(t => String(t.id) === String(recordId));
                if (task) {
                    let relationInfo = '';
                    if (task.relatedBookingId) {
                        const booking = bookings.find(b => String(b.id) === String(task.relatedBookingId) || String(b.bookingNumber) === String(task.relatedBookingId));
                        if (booking) relationInfo = ` (Booking: ${booking.customer})`;
                    } else if (task.relatedLeadId) {
                        const lead = leads.find(l => String(l.id) === String(task.relatedLeadId) || String(l.leadNumber) === String(task.relatedLeadId));
                        if (lead) relationInfo = ` (Lead: ${lead.name})`;
                    }
                    title = `Task: ${task.title}${relationInfo}`;
                    subtitle = formattedFields || task.description || 'Updated task details.';
                } else {
                    title = `${action} Task`;
                    subtitle = formattedFields ? `${formattedFields} (ID: ${recordId.substring(0, 8)}...)` : log.details;
                }
            }
        } else if (mod === 'follow_ups' || mod === 'follow-ups') {
            iconComponent = Calendar;
            color = 'text-rose-500';
            if (recordId) {
                const followUp = followUps.find(f => String(f.id) === String(recordId));
                if (followUp) {
                    title = `Follow-Up: ${followUp.leadName || 'Lead Inquiry'}`;
                    subtitle = `${formattedFields ? formattedFields + ' • ' : ''}${followUp.description || 'Scheduled follow-up contact'}`;
                } else {
                    title = `${action} Follow-Up`;
                    subtitle = formattedFields ? `${formattedFields} (ID: ${recordId.substring(0, 8)}...)` : log.details;
                }
            }
        } else if (mod === 'master_hotels') {
            iconComponent = Hotel;
            color = 'text-amber-500';
            if (recordId) {
                const hotel = masterHotels.find(h => String(h.id) === String(recordId));
                if (hotel) {
                    title = `Hotel: ${hotel.name}`;
                    subtitle = `Location: ${hotel.location || 'N/A'} • ${hotel.rating || 'N/A'} Star`;
                } else {
                    title = `${action} Hotel`;
                    subtitle = formattedFields ? `${formattedFields} (ID: ${recordId.substring(0, 8)}...)` : log.details;
                }
            }
        } else if (mod === 'packages' || mod === 'inventory') {
            iconComponent = Briefcase;
            color = 'text-blue-500';
            if (recordId) {
                const pkg = packages.find(p => String(p.id) === String(recordId));
                if (pkg) {
                    title = `Package: ${pkg.title}`;
                    subtitle = `${pkg.durationDays || 'N/A'} Days • Base Price: ₹${pkg.price?.toLocaleString() || '0'}`;
                } else {
                    title = `${action} Package`;
                    subtitle = formattedFields ? `${formattedFields} (ID: ${recordId.substring(0, 8)}...)` : log.details;
                }
            }
        } else if (mod === 'vendors') {
            iconComponent = Store;
            color = 'text-rose-500';
            if (recordId) {
                const vendor = vendors.find(v => String(v.id) === String(recordId));
                if (vendor) {
                    title = `Vendor: ${vendor.name}`;
                    subtitle = `Contact: ${vendor.phone || 'N/A'} • Service: ${vendor.serviceType || 'General'}`;
                } else {
                    title = `${action} Vendor`;
                    subtitle = formattedFields ? `${formattedFields} (ID: ${recordId.substring(0, 8)}...)` : log.details;
                }
            }
        } else if (mod === 'customers') {
            iconComponent = Users;
            color = 'text-sky-500';
            if (recordId) {
                const customer = customers.find(c => String(c.id) === String(recordId));
                if (customer) {
                    title = `Customer: ${customer.name}`;
                    subtitle = `Joined: ${new Date(customer.joinedDate).toLocaleDateString()} • Level: ${customer.type}`;
                } else {
                    title = `${action} Customer`;
                    subtitle = formattedFields ? `${formattedFields} (ID: ${recordId.substring(0, 8)}...)` : log.details;
                }
            }
        } else if (mod === 'partners') {
            iconComponent = Users;
            color = 'text-orange-500';
            title = 'Partner Activity';
            if (action === 'PartnerRegister') {
                title = 'Partner Registered';
            } else if (action === 'AdminPartnerAdd') {
                title = 'Partner Added By Admin';
            } else if (action === 'PartnerApprove') {
                title = 'Partner Approved';
            } else if (action === 'PartnerBlock') {
                title = 'Partner Blocked';
            } else if (action === 'PartnerUpdate') {
                title = 'Partner Profile Updated';
            } else if (action.startsWith('Commission')) {
                title = `Commission ${action.replace('Commission', '')}`;
            }
            subtitle = log.details;
        } else if (mod === 'staff_members') {
            iconComponent = ShieldAlert;
            color = 'text-amber-500';
            title = `Staff ${action}`;
            if (action === 'PasswordReset') {
                title = 'Staff Password Reset';
            } else if (action === 'Delete') {
                title = 'Staff Member Deleted';
            }
            subtitle = log.details;
        }
        
        // Custom formatters for technical system descriptions
        if (log.details.startsWith('Synced customers from bookings:')) {
            iconComponent = RefreshCw;
            color = 'text-teal-500';
            title = 'Customer Sync';
            
            const match = log.details.match(/created=(\d+),\s*updated=(\d+)/);
            if (match) {
                subtitle = `Synchronized profiles from bookings: Created ${match[1]} new profile(s), Updated ${match[2]} profile(s).`;
            }
        } else if (log.action === 'Login') {
            iconComponent = Key;
            color = 'text-violet-500';
            title = 'Staff Login';
            subtitle = `Successfully logged into system dashboard.`;
        } else if (log.action === 'Export') {
            iconComponent = Database;
            color = 'text-amber-600';
            title = 'Excel Export';
            subtitle = log.details;
        } else if (log.action === 'Sync') {
            iconComponent = RefreshCw;
            color = 'text-teal-500';
            title = 'Database Sync';
            subtitle = log.details;
        }

        // Check for specific coupon actions or deletion approvals
        if (action === 'Apply Coupon' || action === 'Detach Coupon') {
            iconComponent = Tag;
            color = action === 'Apply Coupon' ? 'text-emerald-500' : 'text-rose-500';
            title = action === 'Apply Coupon' ? 'Coupon Applied' : 'Coupon Removed';
            subtitle = log.details;
        } else if (action === 'Delete Approved') {
            iconComponent = Trash2;
            color = 'text-red-500';
            title = 'Deletion Approved';
            subtitle = log.details;
        }

        return { title, subtitle, iconComponent, color };
    };

    // 3. Resolve Navigation Link
    const getTargetLink = (log: AuditLog) => {
        const recordId = extractRecordId(log.details);
        const mod = log.module.toLowerCase();

        if (mod === 'bookings') {
            return recordId ? `/admin/bookings?id=${recordId}` : '/admin/bookings';
        }
        
        if (mod === 'leads') {
            return recordId ? `/admin/leads?id=${recordId}` : '/admin/leads';
        }

        if (mod === 'customers') return recordId ? `/admin/customers?id=${recordId}` : '/admin/customers';
        if (mod === 'vendors') return recordId ? `/admin/vendors?id=${recordId}` : '/admin/vendors';
        if (mod === 'packages' || mod === 'inventory') return recordId ? `/admin/packages?id=${recordId}` : '/admin/packages';

        if (mod === 'tasks') {
            if (recordId) {
                const task = tasks.find(t => String(t.id) === String(recordId));
                if (task) {
                    if (task.relatedBookingId) {
                        return `/admin/bookings?id=${task.relatedBookingId}`;
                    } else if (task.relatedLeadId) {
                        return `/admin/leads?id=${task.relatedLeadId}`;
                    }
                }
            }
        }
        
        if (mod === 'follow_ups' || mod === 'follow-ups') {
            if (recordId) {
                const followUp = followUps.find(f => String(f.id) === String(recordId));
                if (followUp && followUp.leadId) {
                    return `/admin/leads?id=${followUp.leadId}`;
                }
            }
        }

        return null;
    };

    // 4. Derive Filtering Lists
    const uniqueStaffEmails = useMemo(() => {
        const emails = new Set(auditLogs.map(log => log.performedBy || 'System'));
        return ['All', ...Array.from(emails)];
    }, [auditLogs]);

    const uniqueModules = useMemo(() => {
        const modules = new Set(auditLogs.map(log => log.module));
        return ['All', ...Array.from(modules)];
    }, [auditLogs]);

    const uniqueActions = ['All', 'Create', 'Update', 'Delete', 'Login', 'Export', 'Other'];

    // 5. Apply Filters
    const filteredLogs = useMemo(() => {
        return auditLogs.filter(log => {
            // Filter out technical Customer Sync logs
            if (log.details?.startsWith('Synced customers from bookings:') || 
                log.details?.startsWith('Recomputed customer stats') ||
                log.action === 'Sync') {
                return false;
            }

            const staffDetails = getStaffDetails(log.performedBy);
            const resolved = resolveActivityDetails(log);
            const matchesSearch =
                log.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.performedBy?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                staffDetails.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                resolved.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                resolved.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.module?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.action?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStaff = selectedStaff === 'All' || (log.performedBy || 'System').toLowerCase() === selectedStaff.toLowerCase();
            const matchesModule = selectedModule === 'All' || log.module === selectedModule;
            
            let matchesAction = true;
            if (selectedAction !== 'All') {
                if (selectedAction === 'Other') {
                    matchesAction = !['Create', 'Update', 'Delete', 'Login', 'Export'].includes(log.action);
                } else {
                    matchesAction = log.action === selectedAction;
                }
            }

            return matchesSearch && matchesStaff && matchesModule && matchesAction;
        }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [auditLogs, searchQuery, selectedStaff, selectedModule, selectedAction, staff, bookings, leads, packages, vendors, masterHotels, tasks, followUps]);

    // 6. Analytics Metrics (Cards at the top)
    const metrics = useMemo(() => {
        const total = filteredLogs.length;
        
        // Find most active staff
        const counts: Record<string, number> = {};
        let maxCount = 0;
        let mostActive = 'System';
        
        filteredLogs.forEach(l => {
            const email = l.performedBy || 'System';
            counts[email] = (counts[email] || 0) + 1;
            if (counts[email] > maxCount) {
                maxCount = counts[email];
                mostActive = email;
            }
        });

        const bookingsHandled = filteredLogs.filter(l => l.module.toLowerCase() === 'bookings').length;
        const leadsHandled = filteredLogs.filter(l => l.module.toLowerCase() === 'leads').length;

        return {
            total,
            mostActive: getStaffDetails(mostActive).name,
            bookingsHandled,
            leadsHandled
        };
    }, [filteredLogs, staff]);

    // 7. Pagination
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Color mapper for module badges
    const getModuleColor = (mod: string) => {
        const styles: Record<string, string> = {
            'bookings': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30',
            'leads': 'bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30',
            'customers': 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30',
            'packages': 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30',
            'vendors': 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30',
            'finance': 'bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30',
            'tasks': 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30',
            'follow_ups': 'bg-pink-50 text-pink-700 dark:bg-pink-950/20 dark:text-pink-400 border border-pink-100 dark:border-pink-900/30',
        };
        return styles[mod.toLowerCase()] || 'bg-slate-50 text-slate-700 dark:bg-slate-800/40 dark:text-slate-400 border border-slate-100 dark:border-slate-800/50';
    };

    // Helper for relative time formatting
    const getRelativeTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50 dark:bg-[#0A0F1D] p-6 lg:p-10 space-y-8 font-sans">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <span className="material-symbols-outlined text-[36px] text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl p-2">pending_actions</span>
                        Activity Feed
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
                        Real-time feed of all staff interactions, bookings, and lead conversions.
                    </p>
                </div>
            </div>

            {/* Top KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Card 1: Total Activities */}
                <div className="bg-white dark:bg-[#111A2E] rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-50 to-purple-600 opacity-5 rounded-full -translate-y-1/3 translate-x-1/3" />
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 dark:text-indigo-400 flex items-center justify-center">
                            <Activity size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Actions</p>
                            <h3 className="text-3xl font-black text-slate-950 dark:text-white mt-1">{metrics.total}</h3>
                        </div>
                    </div>
                </div>

                {/* Card 2: Most Active Staff */}
                <div className="bg-white dark:bg-[#111A2E] rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-5 rounded-full -translate-y-1/3 translate-x-1/3" />
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 dark:text-emerald-400 flex items-center justify-center">
                            <User size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Most Active</p>
                            <h3 className="text-xl font-black text-slate-950 dark:text-white mt-2 truncate max-w-[170px]" title={metrics.mostActive}>{metrics.mostActive}</h3>
                        </div>
                    </div>
                </div>

                {/* Card 3: Bookings Logged */}
                <div className="bg-white dark:bg-[#111A2E] rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500 to-orange-600 opacity-5 rounded-full -translate-y-1/3 translate-x-1/3" />
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-500 dark:text-amber-400 flex items-center justify-center">
                            <CheckCircle size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bookings Logged</p>
                            <h3 className="text-3xl font-black text-slate-950 dark:text-white mt-1">{metrics.bookingsHandled}</h3>
                        </div>
                    </div>
                </div>

                {/* Card 4: Leads Logged */}
                <div className="bg-white dark:bg-[#111A2E] rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500 to-rose-600 opacity-5 rounded-full -translate-y-1/3 translate-x-1/3" />
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-purple-50 dark:bg-purple-950/30 text-purple-500 dark:text-purple-400 flex items-center justify-center">
                            <Database size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Leads Logged</p>
                            <h3 className="text-3xl font-black text-slate-950 dark:text-white mt-1">{metrics.leadsHandled}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters Toolbar */}
            <div className="bg-white dark:bg-[#111A2E] p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search activity by keyword, user, details..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900 dark:text-white transition-all font-medium"
                        />
                    </div>

                    {/* Filter Selects */}
                    <div className="flex flex-wrap sm:flex-nowrap gap-3">
                        {/* Staff */}
                        <div className="relative flex-1 sm:flex-initial min-w-[150px]">
                            <select
                                value={selectedStaff}
                                onChange={(e) => { setSelectedStaff(e.target.value); setCurrentPage(1); }}
                                className="w-full appearance-none bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 py-3 pl-4 pr-10 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                            >
                                <option value="All">All Creators</option>
                                {uniqueStaffEmails.filter(e => e !== 'All').map(email => (
                                    <option key={email} value={email}>
                                        {getStaffDetails(email).name}
                                    </option>
                                ))}
                            </select>
                            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>

                        {/* Module */}
                        <div className="relative flex-1 sm:flex-initial min-w-[150px]">
                            <select
                                value={selectedModule}
                                onChange={(e) => { setSelectedModule(e.target.value); setCurrentPage(1); }}
                                className="w-full appearance-none bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 py-3 pl-4 pr-10 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                            >
                                <option value="All">All Modules</option>
                                {uniqueModules.filter(m => m !== 'All').map(mod => (
                                    <option key={mod} value={mod}>{mod}</option>
                                ))}
                            </select>
                            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>

                        {/* Action */}
                        <div className="relative flex-1 sm:flex-initial min-w-[150px]">
                            <select
                                value={selectedAction}
                                onChange={(e) => { setSelectedAction(e.target.value); setCurrentPage(1); }}
                                className="w-full appearance-none bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 py-3 pl-4 pr-10 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                            >
                                {uniqueActions.map(act => (
                                    <option key={act} value={act}>{act} Actions</option>
                                ))}
                            </select>
                            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Activity List Timeline */}
            <div className="flex-1 bg-white dark:bg-[#111A2E] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 lg:p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-6">
                    {paginatedLogs.length > 0 ? (
                        paginatedLogs.map((log) => {
                            const staffInfo = getStaffDetails(log.performedBy);
                            const resolved = resolveActivityDetails(log);
                            const navLink = getTargetLink(log);
                            
                            return (
                                <div key={log.id} className="group relative flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl bg-slate-50/50 dark:bg-[#0D1525]/30 border border-slate-100/50 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-[#0D1525]/60 hover:shadow-md hover:shadow-slate-100/10 transition-all duration-300 gap-4">
                                    {/* Left: Avatar + User details */}
                                    <div className="flex items-start gap-4">
                                        {/* Colored Avatar with overlapping module icon */}
                                        <div className={`size-11 shrink-0 rounded-2xl bg-gradient-to-br from-${staffInfo.color}-400 to-${staffInfo.color}-600 dark:from-${staffInfo.color}-500 dark:to-${staffInfo.color}-700 text-white font-bold text-sm shadow-md flex items-center justify-center uppercase relative`}>
                                            {staffInfo.initials}
                                            <div className="absolute -bottom-1.5 -right-1.5 size-5 rounded-full bg-white dark:bg-[#111A2E] shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-800">
                                                <resolved.iconComponent size={11} className={resolved.color} />
                                            </div>
                                        </div>

                                        {/* User activity line */}
                                        <div className="space-y-1">
                                            <p className="text-sm text-slate-900 dark:text-white font-black leading-normal flex items-center flex-wrap gap-x-2">
                                                {resolved.title}
                                                <span className="text-slate-400 dark:text-slate-500 text-xs font-semibold">
                                                    by {staffInfo.name}
                                                </span>
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                {resolved.subtitle}
                                            </p>
                                            
                                            {/* Subtitle: Date & relative time */}
                                            <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500 font-semibold pt-1">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {getRelativeTime(log.timestamp)}
                                                </span>
                                                <span>•</span>
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-black tracking-wider ${getModuleColor(log.module)}`}>
                                                    {log.module}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Navigate action link */}
                                    {navLink && (
                                        <button
                                            onClick={() => navigate(navLink)}
                                            className="shrink-0 flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 dark:text-indigo-400 px-4 py-2.5 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 transition-all cursor-pointer group btn-press"
                                        >
                                            View Record
                                            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <span className="material-symbols-outlined text-[64px] opacity-25 mb-4 animate-pulse">playlist_remove</span>
                            <p className="font-bold text-slate-500">No activity logs match your filters.</p>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            Showing {Math.min(filteredLogs.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredLogs.length, currentPage * itemsPerPage)} of {filteredLogs.length} logs
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
