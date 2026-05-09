import React, { useState, useMemo, useEffect } from 'react';
import { useAuth, DEFAULT_PERMISSIONS } from '../../context/AuthContext';
import { toast } from '../../components/ui/Toast';
import { StaffMember, StaffPermissions } from '../../types';
import { api } from '../../src/lib/api';

// Module descriptions for the permissions table
const PERMISSION_DESCRIPTIONS: Record<string, string> = {
    dashboard: 'View analytics overview and KPI summaries',
    leads: 'Access and manage lead records and pipeline',
    bookings: 'View and manage booking records',
    customers: 'Access customer profiles and history',
    packages: 'View and edit travel packages catalog',
    vendors: 'Manage vendor profiles and contracts',
    accounts: 'Access financial accounts and transactions',
    expenses: 'View and record business expenses',
    productivity: 'Access productivity tracker and time logs',
    teamPerformance: 'View team performance reports',
    marketing: 'Manage campaigns and marketing content',
    masters: 'Edit master data (locations, hotels, etc.)',
    cms: 'Manage website content (banners, gallery, posts)',
    audit: 'Access audit logs and activity history',
    operations: 'Access live operations and booking execution',
    invoices: 'Create and manage invoices and documents',
    proposals: 'Build and send client proposals',
    settings: 'Access admin settings and integrations',
};

// Format last_active ISO timestamp into human-readable relative time
const formatLastActive = (value: string | null | undefined): string => {
    if (!value || value === 'Never') return 'Never';
    try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return 'Never';
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        if (diffMins < 2) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: diffDays > 365 ? 'numeric' : undefined });
    } catch {
        return 'Never';
    }
};

export const StaffManagement: React.FC = () => {
    const { staff, addStaff, updateStaff, deleteStaff, currentUser, masqueradeAs, refreshStaff } = useAuth();
    const [search, setSearch] = useState('');
    const [selectedStaffId, setSelectedStaffId] = useState<number | string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('All');
    const [sortBy, setSortBy] = useState<'name' | 'role' | 'department' | 'joined'>('name');

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    // Fix #1: Reset password in edit mode
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [resetPassword, setResetPassword] = useState('');
    const [resetConfirmPassword, setResetConfirmPassword] = useState('');
    const [isResettingPassword, setIsResettingPassword] = useState(false);

    const [formData, setFormData] = useState<{
        name: string;
        email: string;
        phone: string;
        role: string;
        userType: 'Staff' | 'Admin';
        department: string;
        status: string;
        queryScope: 'Show Assigned Query Only' | 'Show All Queries';
        whatsappScope: 'Assigned Queries Messages' | 'All Messages';
        permissions: StaffPermissions;
    }>({
        name: '',
        email: '',
        phone: '',
        role: 'Editor',
        userType: 'Staff',
        department: 'Operations',
        status: 'Active',
        queryScope: 'Show Assigned Query Only',
        whatsappScope: 'Assigned Queries Messages',
        permissions: JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS))
    });

    const selectedMember = staff.find(s => String(s.id) === String(selectedStaffId));

    // Refresh staff list on page mount so last_active values are always current from DB
    useEffect(() => {
        refreshStaff();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Stats
    const activeStaff = staff.filter(s => s.status === 'Active').length;
    const uniqueDepartments = Array.from(new Set(staff.map(s => s.department))).length;
    // Fix #6: New Joiners This Month — use created_at from DB
    const newJoinersThisMonth = useMemo(() => {
        const now = new Date();
        return staff.filter(s => {
            const joined = s.joinedDate || (s as any).createdAt || (s as any).created_at;
            if (!joined || joined === 'Never') return false;
            const d = new Date(joined);
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        }).length;
    }, [staff]);

    // Fix #7: Dynamic department tabs from actual staff
    const departmentTabs = useMemo(() => {
        const depts = Array.from(new Set(staff.map(s => s.department).filter(Boolean)));
        return ['All', ...depts.sort()];
    }, [staff]);

    const handleOpenAdd = () => {
        setIsEditing(false);
        setEditingId(null);
        setFormData({
            name: '',
            email: '',
            phone: '',
            role: 'Editor',
            userType: 'Staff',
            department: 'Operations',
            status: 'Active',
            queryScope: 'Show Assigned Query Only',
            whatsappScope: 'Assigned Queries Messages',
            permissions: JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS))
        });
        setPassword('');
        setConfirmPassword('');
        setShowPassword(false);
        setShowConfirmPassword(false);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (member: StaffMember) => {
        setIsEditing(true);
        setEditingId(member.id);
        setFormData({
            name: member.name,
            email: member.email,
            phone: member.phone || '',
            role: member.role,
            userType: member.userType || 'Staff',
            department: member.department,
            status: member.status,
            queryScope: member.queryScope || 'Show Assigned Query Only',
            whatsappScope: member.whatsappScope || 'Assigned Queries Messages',
            permissions: member.permissions ? JSON.parse(JSON.stringify(member.permissions)) : JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS))
        });
        // Reset password section state when opening edit modal
        setShowResetPassword(false);
        setResetPassword('');
        setResetConfirmPassword('');
        setIsModalOpen(true);
    };

    // Fix #11: manage implies view; unchecking view also unchecks manage
    const handlePermissionChange = (module: keyof StaffPermissions, type: 'view' | 'manage', checked: boolean) => {
        setFormData(prev => {
            const current = prev.permissions[module];
            let updated = { ...current, [type]: checked };
            if (type === 'manage' && checked) updated.view = true;  // manage requires view
            if (type === 'view' && !checked) updated.manage = false; // revoking view also revokes manage
            return {
                ...prev,
                permissions: { ...prev.permissions, [module]: updated }
            };
        });
    };

    const toggleAllPermissions = (type: 'view' | 'manage', checked: boolean) => {
        setFormData(prev => {
            const newPermissions: any = { ...prev.permissions };
            Object.keys(newPermissions).forEach(key => {
                newPermissions[key] = {
                    ...newPermissions[key],
                    [type]: checked,
                    // Fix #11: toggling manage on also enables view
                    ...(type === 'manage' && checked ? { view: true } : {}),
                    // Fix #11: toggling view off also disables manage
                    ...(type === 'view' && !checked ? { manage: false } : {}),
                };
            });
            return { ...prev, permissions: newPermissions };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check for duplicate email (exclude self if editing)
        const trimmedEmail = formData.email.trim();
        if (staff.some(s => s.email.toLowerCase() === trimmedEmail.toLowerCase() && s.id !== editingId)) {
            toast.error('A staff member with this email already exists.');
            return;
        }

        if (!isEditing && password) {
            if (password.length < 6) {
                toast.error('Password must be at least 6 characters');
                return;
            }
            if (password !== confirmPassword) {
                toast.error('Passwords do not match');
                return;
            }
        }

        const initials = formData.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        const colorMap: Record<string, string> = {
            // ─── Ownership / Admin Tier ───
            'Owner': 'violet',
            'Co-Owner': 'violet',
            'Super Admin': 'purple',
            'Administrator': 'purple',
            // ─── Leadership Tier ───
            'Branch Head': 'indigo',
            'Operations Head': 'indigo',
            'Sales Head': 'indigo',
            'Finance Head': 'indigo',
            // ─── Manager Tier ───
            'Manager': 'blue',
            'Sales Manager': 'blue',
            'Operations Manager': 'blue',
            'Marketing Manager': 'blue',
            'Account Manager': 'blue',
            'Product Manager': 'blue',
            // ─── Specialist / Senior Tier ───
            'Senior Tour Consultant': 'sky',
            'Tour Consultant': 'sky',
            'Tour Coordinator': 'sky',
            'Visa Executive': 'teal',
            'Visa Consultant': 'teal',
            'Senior Agent': 'cyan',
            // ─── Agent / Executive Tier ───
            'Agent': 'cyan',
            'Travel Agent': 'cyan',
            'Sales Executive': 'cyan',
            'Booking Executive': 'cyan',
            'Field Agent': 'emerald',
            // ─── Support / Content Tier ───
            'Editor': 'green',
            'Content Writer': 'green',
            'Support': 'orange',
            'Customer Support': 'orange',
            'Finance Executive': 'amber',
            'Accountant': 'amber',
            'Intern': 'slate',
        };

        // Logic: specific roles enforce specific userTypes (admin-tier roles auto-become Admin)
        const ADMIN_ROLES = new Set(['Owner', 'Co-Owner', 'Super Admin', 'Administrator']);
        const derivedUserType = ADMIN_ROLES.has(formData.role) ? 'Admin' : formData.userType;

        // Logic: If Admin, FORCE all permissions to true
        let finalPermissions = formData.permissions;
        if (derivedUserType === 'Admin') {
            // Create a deep copy of DEFAULT_PERMISSIONS and set all to true
            const allTrue = JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS));
            Object.keys(allTrue).forEach(k => {
                allTrue[k as keyof StaffPermissions] = { view: true, manage: true };
            });
            finalPermissions = allTrue;
        }

        const staffData = {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            role: formData.role,
            userType: derivedUserType,
            department: formData.department as any,
            status: formData.status as any,
            queryScope: derivedUserType === 'Admin' ? 'Show All Queries' : formData.queryScope, // Admins see all
            whatsappScope: derivedUserType === 'Admin' ? 'All Messages' : formData.whatsappScope, // Admins see all
            permissions: finalPermissions,
            initials,
            color: colorMap[formData.role] || 'slate'
        };

        try {
            if (isEditing && editingId) {
                await updateStaff(editingId, staffData);
                toast.success('Staff member updated successfully');
            } else {
                const newMember = {
                    ...staffData,
                    lastActive: 'Never',
                };
                await addStaff(newMember as any, password);
                toast.success('New staff member added');
            }
            setIsModalOpen(false);
        } catch (error: any) {
            toast.error(error.message || 'Failed to save staff member');
        }
    };

    const handleDelete = async (id: number) => {
        // Logic: Prevent deleting Yourself
        if (currentUser?.id === id) {
            toast.error("You cannot delete your own account.");
            return;
        }
        // Logic: Prevent deleting the LAST Admin
        const member = staff.find(s => s.id === id);
        if (member?.userType === 'Admin') {
            const adminCount = staff.filter(s => s.userType === 'Admin').length;
            if (adminCount <= 1) {
                toast.error("Cannot delete the only Administrator.");
                return;
            }
        }
        // Fix #15: Offboarding warning — warn about orphaned leads
        const warningMsg = `Remove ${member?.name}? This will permanently delete their login and staff profile. Their assigned leads and follow-ups will become unassigned.`;
        if (confirm(warningMsg)) {
            try {
                await deleteStaff(id);
                if (String(selectedStaffId) === String(id)) setSelectedStaffId(null);
                toast.success('Staff member and login account removed');
            } catch (err: any) {
                toast.error(err.message || 'Failed to delete staff member');
            }
        }
    };

    const toggleStatus = (id: number) => {
        if (currentUser?.id === id) {
            toast.error("You cannot deactivate your own account.");
            return;
        }
        const member = staff.find(s => s.id === id);
        if (member) {
            // Basic protection for the hardcoded super admin email
            if (member.email === 'toursshravya@gmail.com') {
                toast.error("Cannot deactivate the primary System Owner.");
                return;
            }
            updateStaff(id, { status: member.status === 'Active' ? 'Inactive' : 'Active' });
            toast.success(`User ${member.status === 'Active' ? 'deactivated' : 'activated'}`);
        }
    };

    // Fix #19: Sort logic
    const filteredStaff = useMemo(() => {
        const filtered = staff.filter(s => {
            const matchesSearch = (s.name || '').toLowerCase().includes(search.toLowerCase()) || (s.email || '').toLowerCase().includes(search.toLowerCase());
            const matchesTab = activeTab === 'All' || s.department === activeTab;
            return matchesSearch && matchesTab;
        });
        return [...filtered].sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'role') return a.role.localeCompare(b.role);
            if (sortBy === 'department') return a.department.localeCompare(b.department);
            if (sortBy === 'joined') {
                const dateA = new Date((a as any).createdAt || (a as any).joinedDate || 0).getTime();
                const dateB = new Date((b as any).createdAt || (b as any).joinedDate || 0).getTime();
                return dateB - dateA; // newest first
            }
            return 0;
        });
    }, [staff, search, activeTab, sortBy]);

    const getRoleBadge = (role: string) => {
        if (role === 'Owner' || role === 'Co-Owner') return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400';
        if (role === 'Super Admin' || role === 'Administrator') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
        if (role.includes('Head') || role.includes('Admin')) return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
        if (role.includes('Manager')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        if (role.includes('Consultant') || role.includes('Coordinator')) return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400';
        if (role.includes('Visa')) return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400';
        if (role === 'Agent' || role === 'Travel Agent' || role === 'Senior Agent') return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400';
        if (role.includes('Executive') || role.includes('Field')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
        if (role.includes('Support') || role.includes('Customer')) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
        if (role === 'Accountant' || role.includes('Finance')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
        if (role === 'Editor' || role.includes('Content')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        if (role === 'Intern') return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    };

    return (
        <div className="flex flex-col h-full admin-page-bg relative">

            {/* ADD/EDIT STAFF MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A2633] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{isEditing ? 'Edit Staff Member' : 'Add New Member'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><span className="material-symbols-outlined">close</span></button>
                        </div>

                        <div className="overflow-y-auto p-6">
                            <form id="staffForm" onSubmit={handleSubmit} className="flex flex-col gap-6">
                                {/* Basic Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase text-slate-500 mb-1.5 block">Full Name</label>
                                        <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="John Doe" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase text-slate-500 mb-1.5 block">Department</label>
                                        <select value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none">
                                            <option>Executive</option>
                                            <option>Sales</option>
                                            <option>Operations</option>
                                            <option>Marketing</option>
                                            <option>Finance</option>
                                            <option>Customer Support</option>
                                            <option>Visa & Documentation</option>
                                            <option>Technology</option>
                                            <option>Human Resources</option>
                                            <option>Content & Design</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase text-slate-500 mb-1.5 block">Primary Email</label>
                                        <input required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} type="email" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="john@shravya.com" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase text-slate-500 mb-1.5 block">Mobile (WhatsApp)</label>
                                        <input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} type="tel" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="+91 98765 43210" />
                                    </div>
                                </div>

                                {!isEditing && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold uppercase text-slate-500 mb-1.5 block">Password</label>
                                            <div className="relative">
                                                <input required value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? "text" : "password"} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="******" />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none flex items-center justify-center transition-colors">
                                                    <span className="material-symbols-outlined text-[18px]">
                                                        {showPassword ? 'visibility_off' : 'visibility'}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold uppercase text-slate-500 mb-1.5 block">Confirm Password</label>
                                            <div className="relative">
                                                <input required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type={showConfirmPassword ? "text" : "password"} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="******" />
                                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none flex items-center justify-center transition-colors">
                                                    <span className="material-symbols-outlined text-[18px]">
                                                        {showConfirmPassword ? 'visibility_off' : 'visibility'}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase text-slate-500 mb-1.5 block">Role Title</label>
                                        <input
                                            list="roles"
                                            value={formData.role}
                                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none"
                                            placeholder="e.g. Senior Tour Manager"
                                        />
                                        <datalist id="roles">
                                            {/* ─── Ownership / Admin Tier ─── */}
                                            <option value="Owner" />
                                            <option value="Co-Owner" />
                                            <option value="Super Admin" />
                                            <option value="Administrator" />
                                            {/* ─── Leadership Tier ─── */}
                                            <option value="Branch Head" />
                                            <option value="Operations Head" />
                                            <option value="Sales Head" />
                                            <option value="Finance Head" />
                                            {/* ─── Manager Tier ─── */}
                                            <option value="Manager" />
                                            <option value="Sales Manager" />
                                            <option value="Operations Manager" />
                                            <option value="Marketing Manager" />
                                            <option value="Account Manager" />
                                            <option value="Product Manager" />
                                            {/* ─── Specialist Tier ─── */}
                                            <option value="Senior Tour Consultant" />
                                            <option value="Tour Consultant" />
                                            <option value="Tour Coordinator" />
                                            <option value="Visa Executive" />
                                            <option value="Visa Consultant" />
                                            <option value="Senior Agent" />
                                            {/* ─── Agent / Executive Tier ─── */}
                                            <option value="Agent" />
                                            <option value="Travel Agent" />
                                            <option value="Sales Executive" />
                                            <option value="Booking Executive" />
                                            <option value="Field Agent" />
                                            {/* ─── Support / Back-office Tier ─── */}
                                            <option value="Editor" />
                                            <option value="Content Writer" />
                                            <option value="Support" />
                                            <option value="Customer Support" />
                                            <option value="Finance Executive" />
                                            <option value="Accountant" />
                                            <option value="Intern" />
                                        </datalist>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase text-slate-500 mb-1.5 block">User Type</label>
                                        <select value={formData.userType} onChange={e => setFormData({ ...formData, userType: e.target.value as any })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none">
                                            <option value="Staff">Staff</option>
                                            <option value="Admin">Admin</option>
                                        </select>
                                    </div>
                                </div>

                                <hr className="border-slate-100 dark:border-slate-800" />

                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Permissions & Scope</h3>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div>
                                            <label className="text-xs font-bold uppercase text-slate-500 mb-1.5 block">Query Scope</label>
                                            <select value={formData.queryScope} onChange={e => setFormData({ ...formData, queryScope: e.target.value as any })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none">
                                                <option>Show Assigned Query Only</option>
                                                <option>Show All Queries</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold uppercase text-slate-500 mb-1.5 block">WhatsApp Scope</label>
                                            <select value={formData.whatsappScope} onChange={e => setFormData({ ...formData, whatsappScope: e.target.value as any })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none">
                                                <option>Assigned Queries Messages</option>
                                                <option>All Messages</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 dark:bg-slate-800 text-left">
                                                <tr>
                                                    <th className="px-4 py-3 font-bold text-slate-500">Module</th>
                                                    <th className="px-4 py-3 font-bold text-slate-500 text-center w-24">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span>View</span>
                                                            <div className="flex items-center gap-1">
                                                                <input
                                                                    type="checkbox"
                                                                    className="size-3 rounded border-gray-300"
                                                                    checked={Object.values(formData.permissions).every((p: any) => p.view)}
                                                                    onChange={e => toggleAllPermissions('view', e.target.checked)}
                                                                    title="Select/Unselect All View Permissions"
                                                                />
                                                                <span className="text-[9px] uppercase tracking-wider">All</span>
                                                            </div>
                                                        </div>
                                                    </th>
                                                    <th className="px-4 py-3 font-bold text-slate-500 text-center w-24">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span>Manage</span>
                                                            <div className="flex items-center gap-1">
                                                                <input
                                                                    type="checkbox"
                                                                    className="size-3 rounded border-gray-300"
                                                                    checked={Object.values(formData.permissions).every((p: any) => p.manage)}
                                                                    onChange={e => toggleAllPermissions('manage', e.target.checked)}
                                                                    title="Select/Unselect All Manage Permissions"
                                                                />
                                                                <span className="text-[9px] uppercase tracking-wider">All</span>
                                                            </div>
                                                        </div>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {Object.entries(formData.permissions).map(([key, value]) => {
                                                    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                                    const typedKey = key as keyof StaffPermissions;
                                                    const desc = PERMISSION_DESCRIPTIONS[key] || '';
                                                    return (
                                                        <tr key={key} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                            {/* Fix #16: Permission description */}
                                                            <td className="px-4 py-3">
                                                                <p className="text-slate-700 dark:text-slate-300 font-medium text-sm">{label}</p>
                                                                {desc && <p className="text-[10px] text-slate-400 mt-0.5">{desc}</p>}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formData.permissions[typedKey].view}
                                                                    onChange={e => handlePermissionChange(typedKey, 'view', e.target.checked)}
                                                                    className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formData.permissions[typedKey].manage}
                                                                    onChange={e => handlePermissionChange(typedKey, 'manage', e.target.checked)}
                                                                    className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Fix #1: Reset Password in Edit Mode */}
                                {isEditing && editingId && (
                                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setShowResetPassword(p => !p)}
                                            className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                        >
                                            <span className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[18px] text-amber-500">lock_reset</span>
                                                Reset Login Password
                                            </span>
                                            <span className="material-symbols-outlined text-[18px] text-slate-400">{showResetPassword ? 'expand_less' : 'expand_more'}</span>
                                        </button>
                                        {showResetPassword && (
                                            <div className="px-4 pb-4 pt-2 space-y-3 border-t border-slate-100 dark:border-slate-700 bg-amber-50/30 dark:bg-amber-900/10">
                                                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">This will immediately update the login password for this staff member.</p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">New Password</label>
                                                        <input
                                                            type="password"
                                                            value={resetPassword}
                                                            onChange={e => setResetPassword(e.target.value)}
                                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                                                            placeholder="Min 6 chars"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Confirm</label>
                                                        <input
                                                            type="password"
                                                            value={resetConfirmPassword}
                                                            onChange={e => setResetConfirmPassword(e.target.value)}
                                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                                                            placeholder="Repeat password"
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={isResettingPassword}
                                                    onClick={async () => {
                                                        if (resetPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
                                                        if (resetPassword !== resetConfirmPassword) { toast.error('Passwords do not match'); return; }
                                                        setIsResettingPassword(true);
                                                        try {
                                                            await api.resetStaffPassword(editingId, resetPassword);
                                                            toast.success('Password updated successfully');
                                                            setShowResetPassword(false);
                                                            setResetPassword('');
                                                            setResetConfirmPassword('');
                                                        } catch (err: any) {
                                                            toast.error(err.message || 'Failed to reset password');
                                                        } finally {
                                                            setIsResettingPassword(false);
                                                        }
                                                    }}
                                                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-60"
                                                >
                                                    {isResettingPassword ? 'Updating...' : 'Update Password'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex items-center gap-2 mt-2">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={formData.status === 'Active'}
                                        onChange={e => setFormData({ ...formData, status: e.target.checked ? 'Active' : 'Inactive' })}
                                        className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <label htmlFor="isActive" className="text-sm font-medium text-slate-700 dark:text-slate-300">Active Account</label>
                                </div>

                            </form>
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                            {/* Fix #17: Warn about active session changes */}
                            <p className="text-[10px] text-slate-400 italic self-center max-w-[200px]">Permission changes apply on the staff member's next login.</p>
                            <div className="flex gap-3">
                                {currentUser?.userType === 'Admin' && !isEditing && (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                const res = await api.syncStaffAuth();
                                                // Fix #13: Show per-user temp passwords
                                                if (res.created && res.created.length > 0) {
                                                    const list = res.created.map((c: any) => `${c.name}: ${c.tempPassword}`).join('\n');
                                                    alert(`Sync complete! New accounts created:\n\n${list}\n\nPlease share these passwords securely.`);
                                                } else {
                                                    toast.success(res.message || 'All accounts already synced');
                                                }
                                            } catch (err: any) {
                                                toast.error(err.message || 'Sync failed');
                                            }
                                        }}
                                        className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
                                        title="Ensure all staff have login accounts"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">sync</span>
                                        Sync Accounts
                                    </button>
                                )}
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
                                <button type="submit" form="staffForm" className="px-6 py-2 bg-primary text-white font-bold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary-dark transition-colors">{isEditing ? 'Save Changes' : 'Add Member'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-6 md:p-8 space-y-8">
                    {/* Header Section */}
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight"><span className="font-display text-4xl">Staff Management</span></h1>
                                <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage your team, roles, and department access.</p>
                            </div>
                            {/* Fix #18: Only Admins can add staff */}
                            {currentUser?.userType === 'Admin' && (
                                <button
                                    onClick={handleOpenAdd}
                                    className="flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-xl font-bold shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                                >
                                    <span className="material-symbols-outlined text-[20px]">person_add</span>
                                    Add Member
                                </button>
                            )}
                        </div>

                        {/* Quick Stats Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white dark:bg-[#1A2633] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Total Staff</p>
                                <div className="flex items-baseline gap-1">
                                    <p className="text-3xl font-black text-slate-900 dark:text-white">{staff.length}</p>
                                    <span className="text-xs font-bold text-slate-400">members</span>
                                </div>
                            </div>
                            {/* Fix #8: Renamed to Active Accounts, removed misleading pulsing dot */}
                            <div className="bg-white dark:bg-[#1A2633] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Active Accounts</p>
                                <div className="flex items-baseline gap-1">
                                    <p className="text-3xl font-black text-slate-900 dark:text-white">{activeStaff}</p>
                                    <span className="text-xs font-bold text-slate-400">of {staff.length}</span>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-[#1A2633] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Departments</p>
                                <div className="flex items-baseline gap-1">
                                    <p className="text-3xl font-black text-slate-900 dark:text-white">{uniqueDepartments}</p>
                                    <span className="text-xs font-bold text-slate-400">active</span>
                                </div>
                            </div>
                            {/* Fix #6: Real new joiners this month */}
                            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-5 rounded-2xl shadow-lg shadow-indigo-500/20 text-white relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                    <span className="material-symbols-outlined text-6xl">trending_up</span>
                                </div>
                                <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest mb-2">New Joiners</p>
                                <p className="text-3xl font-black relative z-10">{newJoinersThisMonth}</p>
                                <p className="text-[10px] text-indigo-200 font-bold mt-1">This Month</p>
                            </div>
                        </div>

                        {/* Controls Toolbar */}
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center bg-white dark:bg-[#1A2633] p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            {/* Fix #7: Dynamic department tabs */}
                            <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
                                {departmentTabs.map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all duration-200 ${activeTab === tab ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                {/* Fix #19: Sort dropdown */}
                                <select
                                    value={sortBy}
                                    onChange={e => setSortBy(e.target.value as any)}
                                    className="bg-slate-50 dark:bg-slate-900 border-none rounded-xl px-3 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-primary/20 outline-none"
                                >
                                    <option value="name">Sort: Name A–Z</option>
                                    <option value="role">Sort: Role</option>
                                    <option value="department">Sort: Department</option>
                                    <option value="joined">Sort: Newest First</option>
                                </select>
                                <div className="relative w-full md:w-60">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">search</span>
                                    <input
                                        className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl pl-12 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-slate-400"
                                        placeholder="Search by name or email..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Split Content Area (Grid Layout instead of Flex to allow full page scroll) */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">


                        {/* Staff List (Left/Main Column) */}
                        <div className="lg:col-span-2 space-y-4">
                            {filteredStaff.length > 0 ? (
                                <div className="bg-white dark:bg-[#1A2633] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                    <div className="hidden md:flex items-center px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <div className="w-1/3">Employee</div>
                                        <div className="w-1/6">Role</div>
                                        <div className="w-1/6">Department</div>
                                        <div className="w-1/6">Status</div>
                                        <div className="w-1/6 text-right">Last Active</div>
                                    </div>

                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {filteredStaff.map(member => (
                                            <div
                                                key={member.id}
                                                onClick={() => setSelectedStaffId(member.id)}
                                                className={`group flex items-center p-4 md:px-6 cursor-pointer transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800 ${String(selectedStaffId) === String(member.id) ? 'bg-indigo-50 dark:bg-indigo-900/10' : ''}`}
                                            >
                                                <div className="flex items-center gap-4 flex-1 md:w-1/3">
                                                    <div className={`size-10 rounded-xl flex items-center justify-center font-black text-xs bg-${member.color}-100 dark:bg-${member.color}-900/30 text-${member.color}-600 shadow-sm group-hover:scale-105 transition-transform`}>
                                                        {member.initials}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className={`font-bold text-sm ${String(selectedStaffId) === String(member.id) ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-900 dark:text-white'} truncate`}>{member.name}</p>
                                                        <p className="text-xs text-slate-500 truncate">{member.email}</p>
                                                    </div>
                                                </div>

                                                <div className="hidden md:block w-1/6">
                                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${getRoleBadge(member.role)}`}>{member.role}</span>
                                                </div>

                                                <div className="hidden md:block w-1/6 text-sm text-slate-600 dark:text-slate-400 font-medium">
                                                    {member.department}
                                                </div>

                                                <div className="hidden md:block w-1/6">
                                                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${member.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500'}`}>
                                                        <span className={`size-1.5 rounded-full ${member.status === 'Active' ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                                                        {member.status}
                                                    </span>
                                                </div>

                                                <div className="hidden md:block w-1/6 text-right">
                                                    <span className={`text-xs font-medium ${
                                                        !member.lastActive || member.lastActive === 'Never'
                                                            ? 'text-slate-300 dark:text-slate-600'
                                                            : 'text-slate-500 dark:text-slate-400'
                                                    }`}>
                                                        {formatLastActive(member.lastActive)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-[#1A2633] rounded-2xl border border-slate-200 dark:border-slate-800">
                                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-full mb-4">
                                        <span className="material-symbols-outlined text-4xl text-slate-400">person_off</span>
                                    </div>
                                    <h3 className="text-slate-900 dark:text-white font-bold mb-1">No staff members found</h3>
                                    <p className="text-sm text-slate-500">Try adjusting your search or filters.</p>
                                </div>
                            )}
                        </div>

                        {/* Details Panel (Right/Sticky Column) */}
                        <div className={`lg:col-span-1 ${selectedStaffId ? 'fixed inset-0 z-[60] lg:static lg:z-auto' : 'hidden lg:block'}`}>
                            {selectedMember ? (
                                <div className="bg-white dark:bg-[#1A2633] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-full md:h-auto overflow-hidden animate-in fade-in slide-in-from-right-4">
                                    {/* Header */}
                                    <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-800/20">
                                        <div className="flex items-center gap-4">
                                            <button onClick={() => setSelectedStaffId(null)} className="lg:hidden text-slate-500 -ml-2 p-2 hover:bg-slate-200 rounded-full transition-colors"><span className="material-symbols-outlined">arrow_back</span></button>
                                            <div className={`size-14 rounded-2xl flex items-center justify-center font-black text-xl bg-${selectedMember.color}-100 dark:bg-${selectedMember.color}-900/30 text-${selectedMember.color}-600 shadow-inner`}>
                                                {selectedMember.initials}
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight">{selectedMember.name}</h2>
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">{selectedMember.role}</p>
                                            </div>
                                            {/* Login as User */}
                                            {currentUser?.userType === 'Admin' && currentUser.id !== selectedMember.id && (
                                                <button
                                                    onClick={() => masqueradeAs(selectedMember.id)}
                                                    className="ml-auto flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">visibility</span> View As
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex gap-1">
                                            <button onClick={() => handleOpenEdit(selectedMember)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors" title="Edit Profile"><span className="material-symbols-outlined text-[20px]">edit</span></button>
                                            <button onClick={() => handleDelete(selectedMember.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Remove User"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-6 space-y-8">

                                        {/* Status Toggle */}
                                        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">Account Status</p>
                                                <p className="text-xs text-slate-500">{selectedMember.status === 'Active' ? 'User can access the system' : 'User access is suspended'}</p>
                                            </div>
                                            <button
                                                onClick={() => toggleStatus(selectedMember.id)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${selectedMember.status === 'Active' ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${selectedMember.status === 'Active' ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>

                                        {/* Contact Info */}
                                        <div>
                                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[14px]">id_card</span> Contact Details
                                            </h3>
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3 p-3 bg-white dark:bg-[#1A2633] border border-slate-100 dark:border-slate-800 rounded-xl">
                                                    <div className="size-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">mail</span></div>
                                                    <div>
                                                        <p className="text-[10px] uppercase text-slate-400 font-bold">Email Address</p>
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedMember.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 p-3 bg-white dark:bg-[#1A2633] border border-slate-100 dark:border-slate-800 rounded-xl">
                                                    <div className="size-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">call</span></div>
                                                    <div>
                                                        <p className="text-[10px] uppercase text-slate-400 font-bold">Phone Number</p>
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedMember.phone || 'N/A'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 p-3 bg-white dark:bg-[#1A2633] border border-slate-100 dark:border-slate-800 rounded-xl">
                                                    <div className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">schedule</span></div>
                                                    <div>
                                                        <p className="text-[10px] uppercase text-slate-400 font-bold">Last Active</p>
                                                        <p className={`text-sm font-bold ${!selectedMember.lastActive || selectedMember.lastActive === 'Never' ? 'text-slate-400 dark:text-slate-600' : 'text-slate-900 dark:text-white'}`}>
                                                            {formatLastActive(selectedMember.lastActive)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Permissions Summary (Dynamic) */}
                                        <div>
                                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[14px]">lock_person</span> Access Rights
                                            </h3>
                                            {/* Fix #20: Admin users get Full Access badge instead of empty state */}
                                            {selectedMember.userType === 'Admin' ? (
                                                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200 dark:border-violet-800 rounded-xl">
                                                    <span className="material-symbols-outlined text-violet-600 text-[22px]">verified_user</span>
                                                    <div>
                                                        <p className="text-sm font-black text-violet-800 dark:text-violet-300">Full System Access</p>
                                                        <p className="text-[10px] text-violet-600 dark:text-violet-400">Admins have unrestricted access to all modules.</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedMember.permissions && Object.entries(selectedMember.permissions).map(([key, value]) => {
                                                        const val = value as { manage: boolean; view: boolean };
                                                        if (val.manage || val.view) {
                                                            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                                            return (
                                                                <span key={key} className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border flex items-center gap-1.5 ${val.manage ? 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300' : 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}>
                                                                    {val.manage ? <span className="material-symbols-outlined text-[14px] text-purple-500">edit_square</span> : <span className="material-symbols-outlined text-[14px] text-slate-400">visibility</span>}
                                                                    {label}
                                                                </span>
                                                            );
                                                        }
                                                        return null;
                                                    })}
                                                    {(!selectedMember.permissions || !Object.values(selectedMember.permissions).some((p: any) => p.view || p.manage)) && (
                                                        <div className="w-full text-center py-4 border border-dashed border-slate-200 rounded-xl">
                                                            <p className="text-xs text-slate-400 italic">No permissions assigned yet. Edit profile to configure.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="hidden lg:flex flex-col items-center justify-center text-center p-8 h-full min-h-[400px] bg-white dark:bg-[#1A2633] rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-full mb-4">
                                        <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">badge</span>
                                    </div>
                                    <p className="text-lg font-black text-slate-900 dark:text-white">View Staff Details</p>
                                    <p className="text-sm text-slate-500 max-w-[200px]">Select a team member from the list to view their profile, permissions, and status.</p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div >
    );
};