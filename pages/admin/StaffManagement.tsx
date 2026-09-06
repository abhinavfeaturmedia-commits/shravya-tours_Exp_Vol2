import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, DEFAULT_PERMISSIONS } from '../../context/AuthContext';
import { toast } from '../../components/ui/Toast';
import { StaffMember, StaffPermissions } from '../../types';
import { api } from '../../src/lib/api';
import {
    PERMISSION_CATEGORIES,
    ALL_MODULE_DEFINITIONS,
    MODULES_BY_KEY,
    ROLE_PRESETS,
    DataScopeLevel,
    buildDefaultPermissions,
    buildAdminPermissions
} from '../../src/config/permissionsConfig';

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

    // Permissions & Sub-Features State
    const [permCategoryTab, setPermCategoryTab] = useState<'all' | 'overview' | 'crm' | 'operations' | 'finance' | 'system'>('all');
    const [permSearch, setPermSearch] = useState('');
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
    const [selectedPresetId, setSelectedPresetId] = useState<string>('');

    const [formData, setFormData] = useState<{
        name: string;
        email: string;
        phone: string;
        role: string;
        userType: 'Staff' | 'Admin';
        department: string;
        status: string;
        queryScope: 'Show Assigned Query Only' | 'Show Department Queries' | 'Show All Queries';
        whatsappScope: 'Assigned Queries Messages' | 'Department Messages' | 'All Messages';
        permissions: Record<string, any>;
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
        permissions: buildDefaultPermissions()
    });

    const selectedMember = staff.find(s => String(s.id) === String(selectedStaffId));

    // Refresh staff list on page mount so last_active values are always current from DB
    useEffect(() => {
        refreshStaff();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-select self or first staff member when list loads
    useEffect(() => {
        if (!selectedStaffId && staff.length > 0) {
            const self = staff.find(s => String(s.id) === String(currentUser?.id) || (s.email && currentUser?.email && s.email.toLowerCase() === currentUser.email.toLowerCase()));
            setSelectedStaffId(self ? self.id : staff[0].id);
        }
    }, [staff, currentUser, selectedStaffId]);

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
        setSelectedPresetId('');
        setExpandedModules(new Set());
        setPermSearch('');
        setPermCategoryTab('all');
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
            permissions: buildDefaultPermissions()
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
        setSelectedPresetId('');
        setExpandedModules(new Set());
        setPermSearch('');
        setPermCategoryTab('all');
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
            permissions: member.permissions ? JSON.parse(JSON.stringify(member.permissions)) : buildDefaultPermissions()
        });
        // Reset password section state when opening edit modal
        setShowResetPassword(false);
        setResetPassword('');
        setResetConfirmPassword('');
        setIsModalOpen(true);
    };

    const handlePermissionChange = (moduleKey: string, type: 'view' | 'manage', checked: boolean) => {
        setFormData(prev => {
            const current = prev.permissions[moduleKey] || { view: false, manage: false, scope: 'assigned', features: {} };
            let updated = { ...current, [type]: checked };
            if (type === 'manage' && checked) updated.view = true;  // manage requires view
            if (type === 'view' && !checked) updated.manage = false; // revoking view also revokes manage
            return {
                ...prev,
                permissions: { ...prev.permissions, [moduleKey]: updated }
            };
        });
    };

    const handleSubFeatureChange = (moduleKey: string, featureKey: string, checked: boolean) => {
        setFormData(prev => {
            const current = prev.permissions[moduleKey] || { view: true, manage: false, scope: 'assigned', features: {} };
            const features = { ...(current.features || {}), [featureKey]: checked };
            const updated = {
                ...current,
                view: checked ? true : current.view,
                features
            };
            return {
                ...prev,
                permissions: { ...prev.permissions, [moduleKey]: updated }
            };
        });
    };

    const handleModuleScopeChange = (moduleKey: string, scope: DataScopeLevel) => {
        setFormData(prev => {
            const current = prev.permissions[moduleKey] || { view: true, manage: false, scope: 'assigned', features: {} };
            return {
                ...prev,
                permissions: {
                    ...prev.permissions,
                    [moduleKey]: { ...current, scope }
                }
            };
        });
    };

    const toggleExpandModule = (moduleKey: string) => {
        setExpandedModules(prev => {
            const next = new Set(prev);
            if (next.has(moduleKey)) next.delete(moduleKey);
            else next.add(moduleKey);
            return next;
        });
    };

    const handleApplyPreset = (presetId: string) => {
        setSelectedPresetId(presetId);
        const preset = ROLE_PRESETS.find(p => p.id === presetId);
        if (!preset) return;
        const newPerms = preset.apply(formData.permissions);
        setFormData(prev => ({
            ...prev,
            userType: preset.userType,
            queryScope: preset.queryScope,
            whatsappScope: preset.whatsappScope,
            permissions: newPerms,
        }));
        toast.success(`Applied ${preset.name} preset!`);
    };

    const toggleAllPermissions = (type: 'view' | 'manage', checked: boolean) => {
        setFormData(prev => {
            const newPermissions: any = { ...prev.permissions };
            ALL_MODULE_DEFINITIONS.forEach(mod => {
                const current = newPermissions[mod.key] || { view: false, manage: false, scope: mod.defaultScope || 'assigned', features: {} };
                newPermissions[mod.key] = {
                    ...current,
                    [type]: checked,
                    ...(type === 'manage' && checked ? { view: true } : {}),
                    ...(type === 'view' && !checked ? { manage: false } : {}),
                };
            });
            return { ...prev, permissions: newPermissions };
        });
    };

    const filteredModules = useMemo(() => {
        let list = ALL_MODULE_DEFINITIONS;
        if (permCategoryTab !== 'all') {
            list = list.filter(m => m.category === permCategoryTab);
        }
        if (permSearch.trim()) {
            const q = permSearch.toLowerCase();
            list = list.filter(m =>
                m.name.toLowerCase().includes(q) ||
                m.description.toLowerCase().includes(q) ||
                m.path.toLowerCase().includes(q) ||
                m.subFeatures.some(f => f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q))
            );
        }
        return list;
    }, [permCategoryTab, permSearch]);

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
            finalPermissions = buildAdminPermissions();
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
            if (member.email === 'shrawello@gmail.com') {
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
        if (role === 'Owner' || role === 'Co-Owner') return 'bg-violet-100 text-violet-700 border border-violet-200/80 dark:bg-violet-900/30 dark:border-violet-800 dark:text-violet-300';
        if (role === 'Super Admin' || role === 'Administrator') return 'bg-purple-100 text-purple-700 border border-purple-200/80 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-300';
        if (role.includes('Head') || role.includes('Admin')) return 'bg-indigo-100 text-indigo-700 border border-indigo-200/80 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300';
        if (role.includes('Manager')) return 'bg-blue-100 text-blue-700 border border-blue-200/80 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300';
        if (role.includes('Consultant') || role.includes('Coordinator')) return 'bg-sky-100 text-sky-700 border border-sky-200/80 dark:bg-sky-900/30 dark:border-sky-800 dark:text-sky-300';
        if (role.includes('Visa')) return 'bg-teal-100 text-teal-700 border border-teal-200/80 dark:bg-teal-900/30 dark:border-teal-800 dark:text-teal-300';
        if (role === 'Agent' || role === 'Travel Agent' || role === 'Senior Agent') return 'bg-cyan-100 text-cyan-700 border border-cyan-200/80 dark:bg-cyan-900/30 dark:border-cyan-800 dark:text-cyan-300';
        if (role.includes('Executive') || role.includes('Field')) return 'bg-emerald-100 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300';
        if (role.includes('Support') || role.includes('Customer')) return 'bg-orange-100 text-orange-700 border border-orange-200/80 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-300';
        if (role === 'Accountant' || role.includes('Finance')) return 'bg-amber-100 text-amber-700 border border-amber-200/80 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300';
        if (role === 'Editor' || role.includes('Content')) return 'bg-green-100 text-green-700 border border-green-200/80 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300';
        if (role === 'Intern') return 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400';
        return 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300';
    };

    const getAvatarStyle = (role: string) => {
        if (role === 'Owner' || role === 'Co-Owner') return 'bg-gradient-to-tr from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/20';
        if (role === 'Super Admin' || role === 'Administrator') return 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20';
        if (role.includes('Head') || role.includes('Admin')) return 'bg-gradient-to-tr from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20';
        if (role.includes('Manager')) return 'bg-gradient-to-tr from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/20';
        if (role.includes('Consultant') || role.includes('Coordinator')) return 'bg-gradient-to-tr from-sky-600 to-teal-600 text-white shadow-md shadow-sky-500/20';
        if (role.includes('Executive') || role.includes('Sales')) return 'bg-gradient-to-tr from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-500/20';
        if (role.includes('Finance') || role === 'Accountant') return 'bg-gradient-to-tr from-amber-600 to-orange-600 text-white shadow-md shadow-amber-500/20';
        if (role.includes('Marketing') || role.includes('Editor')) return 'bg-gradient-to-tr from-pink-600 to-rose-600 text-white shadow-md shadow-pink-500/20';
        return 'bg-gradient-to-tr from-slate-700 to-slate-900 text-white shadow-md shadow-slate-500/20';
    };

    const isStaffOnlineNow = (lastActive?: string) => {
        if (!lastActive) return false;
        const lower = lastActive.toLowerCase();
        return lower.includes('just now') || lower.includes('sec') || lower.includes('min');
    };

    const handleCopyText = (text: string, label: string) => {
        if (!text || text === 'N/A') return;
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard!`);
    };

    const deptCounts = useMemo(() => {
        const counts: Record<string, number> = { All: staff.length };
        staff.forEach(s => {
            if (s.department) {
                counts[s.department] = (counts[s.department] || 0) + 1;
            }
        });
        return counts;
    }, [staff]);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const searchInputRef = React.useRef<HTMLInputElement>(null);

    // Keyboard shortcut: Press '/' to focus search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await refreshStaff();
            toast.success('Staff directory refreshed');
        } catch {
            toast.error('Failed to refresh staff records');
        } finally {
            setTimeout(() => setIsRefreshing(false), 500);
        }
    };

    return (
        <div className="flex flex-col h-full admin-page-bg relative">

            {/* ADD/EDIT STAFF MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A2633] w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
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
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                                        <div>
                                            <h3 className="text-base font-black text-slate-900 dark:text-white">Permissions, Features & Scopes</h3>
                                            <p className="text-xs text-slate-500">Control page access, data visibility scopes, and specific action capabilities.</p>
                                        </div>
                                    </div>

                                    {/* Quick Role Presets Bar */}
                                    <div className="bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-blue-50/90 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-blue-950/40 border border-indigo-100 dark:border-indigo-800/60 rounded-xl p-4 mb-5 shadow-xs">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="size-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                                                    <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                                                        One-Click Role Presets
                                                    </h4>
                                                    <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
                                                        Instantly populate recommended page access, sub-feature actions, and data scopes.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={selectedPresetId}
                                                    onChange={e => handleApplyPreset(e.target.value)}
                                                    className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer"
                                                >
                                                    <option value="">Choose a Role Preset...</option>
                                                    {ROLE_PRESETS.map(preset => (
                                                        <option key={preset.id} value={preset.id}>
                                                            {preset.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Global Scopes */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                        <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                            <label className="text-xs font-bold uppercase text-slate-500 mb-1.5 flex items-center justify-between">
                                                <span>Default Query / CRM Scope</span>
                                                <span className="material-symbols-outlined text-[16px] text-slate-400">filter_alt</span>
                                            </label>
                                            <select
                                                value={formData.queryScope}
                                                onChange={e => setFormData({ ...formData, queryScope: e.target.value as any })}
                                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-primary outline-none"
                                            >
                                                <option value="Show Assigned Query Only">Show Assigned Query Only (Own records only)</option>
                                                <option value="Show Department Queries">Show Department Queries (All {formData.department || 'Department'} records)</option>
                                                <option value="Show All Queries">Show All Queries (Full organization visibility)</option>
                                            </select>
                                            <p className="text-[10px] text-slate-400 mt-1">Controls which leads, bookings, and tasks this user can view.</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                            <label className="text-xs font-bold uppercase text-slate-500 mb-1.5 flex items-center justify-between">
                                                <span>WhatsApp & Communication Scope</span>
                                                <span className="material-symbols-outlined text-[16px] text-slate-400">chat</span>
                                            </label>
                                            <select
                                                value={formData.whatsappScope}
                                                onChange={e => setFormData({ ...formData, whatsappScope: e.target.value as any })}
                                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-primary outline-none"
                                            >
                                                <option value="Assigned Queries Messages">Assigned Queries Messages (Only chat with own clients)</option>
                                                <option value="Department Messages">Department Messages (All {formData.department || 'Department'} team chats)</option>
                                                <option value="All Messages">All Messages (Global channel access)</option>
                                            </select>
                                            <p className="text-[10px] text-slate-400 mt-1">Controls which client chat streams are visible in inbox.</p>
                                        </div>
                                    </div>

                                    {/* Category Filter Pills & Search */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                                            <button
                                                type="button"
                                                onClick={() => setPermCategoryTab('all')}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${permCategoryTab === 'all' ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}`}
                                            >
                                                All Modules ({ALL_MODULE_DEFINITIONS.length})
                                            </button>
                                            {PERMISSION_CATEGORIES.map(cat => (
                                                <button
                                                    key={cat.key}
                                                    type="button"
                                                    onClick={() => setPermCategoryTab(cat.key)}
                                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${permCategoryTab === cat.key ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}`}
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">{cat.icon}</span>
                                                    {cat.name.split(' ')[0]}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="relative min-w-[220px]">
                                            <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-[16px]">search</span>
                                            <input
                                                type="text"
                                                value={permSearch}
                                                onChange={e => setPermSearch(e.target.value)}
                                                placeholder="Search module or action..."
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-7 py-1.5 text-xs focus:ring-2 focus:ring-primary outline-none"
                                            />
                                            {permSearch && (
                                                <button type="button" onClick={() => setPermSearch('')} className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600">
                                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Quick Bulk Toggle Bar */}
                                    <div className="flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-800/60 rounded-lg text-xs font-bold text-slate-500 mb-3">
                                        <span>Showing {filteredModules.length} of {ALL_MODULE_DEFINITIONS.length} Modules</span>
                                        <div className="flex items-center gap-4">
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="size-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                                                    checked={ALL_MODULE_DEFINITIONS.every(m => formData.permissions[m.key]?.view)}
                                                    onChange={e => toggleAllPermissions('view', e.target.checked)}
                                                />
                                                <span className="text-[11px] uppercase tracking-wide">Toggle All View</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="size-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                                                    checked={ALL_MODULE_DEFINITIONS.every(m => formData.permissions[m.key]?.manage)}
                                                    onChange={e => toggleAllPermissions('manage', e.target.checked)}
                                                />
                                                <span className="text-[11px] uppercase tracking-wide">Toggle All Manage</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Module List with Accordion Sub-Features */}
                                    <div className="space-y-3">
                                        {filteredModules.map(mod => {
                                            const modPerm = formData.permissions[mod.key] || { view: false, manage: false, scope: mod.defaultScope || 'assigned', features: {} };
                                            const isExpanded = expandedModules.has(mod.key) || (permSearch.trim() !== '' && mod.subFeatures.some(f => f.name.toLowerCase().includes(permSearch.toLowerCase()) || f.description.toLowerCase().includes(permSearch.toLowerCase())));
                                            const activeSubCount = Object.values(modPerm.features || {}).filter(Boolean).length;

                                            return (
                                                <div
                                                    key={mod.key}
                                                    className={`border rounded-xl transition-all duration-200 ${modPerm.view ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 shadow-xs' : 'border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/10 opacity-70'}`}
                                                >
                                                    {/* Module Row Header */}
                                                    <div className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                                            <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${modPerm.view ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                                                <span className="material-symbols-outlined text-[18px]">{mod.icon}</span>
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="text-xs font-bold text-slate-900 dark:text-white leading-snug">{mod.name}</span>
                                                                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">{mod.path}</span>
                                                                </div>
                                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{mod.description}</p>
                                                            </div>
                                                        </div>

                                                        {/* Controls */}
                                                        <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-end">
                                                            {/* Scope selector if supported */}
                                                            {mod.hasScope && modPerm.view && (
                                                                <select
                                                                    value={modPerm.scope || 'assigned'}
                                                                    onChange={e => handleModuleScopeChange(mod.key, e.target.value as any)}
                                                                    className="text-[11px] font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
                                                                    title="Module-specific data scope"
                                                                >
                                                                    <option value="assigned">Assigned Only</option>
                                                                    <option value="department">Department</option>
                                                                    <option value="all">All Organization</option>
                                                                </select>
                                                            )}

                                                            {/* View Checkbox */}
                                                            <label className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${modPerm.view ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={!!modPerm.view}
                                                                    onChange={e => handlePermissionChange(mod.key, 'view', e.target.checked)}
                                                                    className="size-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                                />
                                                                <span>View</span>
                                                            </label>

                                                            {/* Manage Checkbox */}
                                                            <label className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${modPerm.manage ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={!!modPerm.manage}
                                                                    onChange={e => handlePermissionChange(mod.key, 'manage', e.target.checked)}
                                                                    className="size-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                                />
                                                                <span>Manage</span>
                                                            </label>

                                                            {/* Sub-Features Accordion Button */}
                                                            {mod.subFeatures.length > 0 && modPerm.view && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleExpandModule(mod.key)}
                                                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${isExpanded ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
                                                                >
                                                                    <span className="text-[11px]">{activeSubCount}/{mod.subFeatures.length} Actions</span>
                                                                    <span className="material-symbols-outlined text-[16px]">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Sub-Features Expanded Drawer */}
                                                    {mod.subFeatures.length > 0 && modPerm.view && isExpanded && (
                                                        <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-3.5 rounded-b-xl animate-in slide-in-from-top-1 duration-150">
                                                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-[13px]">tune</span>
                                                                Sub-Features & Action Level Controls for {mod.name}
                                                            </p>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                                {mod.subFeatures.map(feat => {
                                                                    const isEnabled = modPerm.features?.[feat.key] ?? (modPerm.manage || feat.defaultStaff);
                                                                    return (
                                                                        <div
                                                                            key={feat.key}
                                                                            className={`flex items-start justify-between gap-3 p-2.5 rounded-lg border transition-colors ${isEnabled ? 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 shadow-2xs' : 'bg-slate-100/50 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800/50 opacity-60'}`}
                                                                        >
                                                                            <div className="min-w-0 pr-1">
                                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{feat.name}</span>
                                                                                    {feat.risk === 'critical' && (
                                                                                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 flex items-center gap-0.5">
                                                                                            <span className="material-symbols-outlined text-[10px]">lock</span> Sensitive
                                                                                        </span>
                                                                                    )}
                                                                                    {feat.risk === 'high' && (
                                                                                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                                                                                            ⚠️ High Risk
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">{feat.description}</p>
                                                                            </div>
                                                                            <label className="relative inline-flex items-center cursor-pointer shrink-0 pt-0.5">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={!!isEnabled}
                                                                                    onChange={e => handleSubFeatureChange(mod.key, feat.key, e.target.checked)}
                                                                                    className="sr-only peer"
                                                                                />
                                                                                <div className="w-8 h-4.5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-primary"></div>
                                                                            </label>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
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
                                <button type="submit" form="staffForm" className="px-6 py-2 bg-primary text-white font-bold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary-dark transition-colors">{isEditing ? 'Save Changes' : 'Add Member'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-6 md:p-8 pb-28 lg:pb-16 space-y-8 max-w-[1700px] mx-auto">
                    {/* Header Section */}
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight font-sans">
                                        Staff Management
                                    </h1>
                                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 shadow-2xs">
                                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span>{activeStaff} of {staff.length} Active Accounts</span>
                                    </span>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 mt-1.5 font-medium text-xs sm:text-sm max-w-2xl">
                                    Central team governance: employee directory, role permissions, sub-feature scopes, and login security.
                                </p>
                            </div>

                            <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
                                <button
                                    onClick={handleRefresh}
                                    disabled={isRefreshing}
                                    className={`p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#1A2633] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 transition-all shadow-sm cursor-pointer ${isRefreshing ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    title="Refresh staff records from database"
                                >
                                    <span className={`material-symbols-outlined text-[20px] block ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`}>refresh</span>
                                </button>
                                {currentUser?.userType === 'Admin' && (
                                    <button
                                        onClick={handleOpenAdd}
                                        className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 px-5 py-2.5 rounded-xl font-bold text-sm shadow-xl shadow-slate-900/10 hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer group"
                                    >
                                        <span className="material-symbols-outlined text-[18px] group-hover:scale-110 transition-transform">person_add</span>
                                        <span>Add Member</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Executive Bento Grid Quick Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Card 1: Total Staff */}
                            <div className="bg-white dark:bg-[#1A2633] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all flex flex-col justify-between group">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider">Total Workforce</p>
                                        <div className="flex items-baseline gap-1.5 mt-1">
                                            <p className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">{staff.length}</p>
                                            <span className="text-xs font-bold text-slate-400">employees</span>
                                        </div>
                                    </div>
                                    <div className="size-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined text-[20px]">groups</span>
                                    </div>
                                </div>

                                {/* Avatar Stack of key team members */}
                                <div className="flex items-center justify-between mt-3 py-1">
                                    <div className="flex items-center -space-x-2 overflow-hidden">
                                        {staff.slice(0, 4).map((s, idx) => (
                                            <div
                                                key={s.id || idx}
                                                className={`size-7 rounded-lg border-2 border-white dark:border-[#1A2633] flex items-center justify-center text-[10px] font-black ${getAvatarStyle(s.role)} shadow-xs`}
                                                title={`${s.name} (${s.role})`}
                                            >
                                                {s.initials}
                                            </div>
                                        ))}
                                        {staff.length > 4 && (
                                            <div className="size-7 rounded-lg border-2 border-white dark:border-[#1A2633] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center shadow-xs">
                                                +{staff.length - 4}
                                            </div>
                                        )}
                                    </div>
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md text-[10px]">
                                        {uniqueDepartments} Teams
                                    </span>
                                </div>

                                <div className="mt-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
                                    <span className="text-slate-500 font-medium">Directory coverage</span>
                                    <span className="text-slate-400 font-semibold text-[10px]">100% Synced</span>
                                </div>
                            </div>

                            {/* Card 2: Active Accounts */}
                            <div className="bg-white dark:bg-[#1A2633] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-900/50 transition-all flex flex-col justify-between group">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider">Active Accounts</p>
                                        <div className="flex items-baseline gap-1.5 mt-1">
                                            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">{activeStaff}</p>
                                            <span className="text-xs font-bold text-slate-400">of {staff.length}</span>
                                        </div>
                                    </div>
                                    <div className="size-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined text-[20px]">verified_user</span>
                                    </div>
                                </div>

                                {/* Active Readiness Progress Bar */}
                                <div className="mt-3">
                                    <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                                        <span className="text-slate-500">Access Readiness</span>
                                        <span className="text-emerald-600 dark:text-emerald-400">{Math.round((activeStaff / (staff.length || 1)) * 100)}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                            style={{ width: `${Math.round((activeStaff / (staff.length || 1)) * 100)}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="mt-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
                                    <div className="flex items-center gap-1.5">
                                        <span className="relative flex size-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
                                        </span>
                                        <span className="text-slate-500 font-medium">Ready credentials</span>
                                    </div>
                                    <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md text-[10px]">
                                        0 Suspended
                                    </span>
                                </div>
                            </div>

                            {/* Card 3: Departments */}
                            <div className="bg-white dark:bg-[#1A2633] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-amber-200 dark:hover:border-amber-900/50 transition-all flex flex-col justify-between group">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider">Departments</p>
                                        <div className="flex items-baseline gap-1.5 mt-1">
                                            <p className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">{uniqueDepartments}</p>
                                            <span className="text-xs font-bold text-slate-400">active teams</span>
                                        </div>
                                    </div>
                                    <div className="size-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined text-[20px]">corporate_fare</span>
                                    </div>
                                </div>

                                {/* Top department pills */}
                                <div className="flex items-center gap-1.5 flex-wrap mt-3 py-0.5">
                                    {Object.entries(deptCounts).filter(([k]) => k !== 'All').slice(0, 3).map(([dept, count]) => (
                                        <span key={dept} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                            {dept}: {count}
                                        </span>
                                    ))}
                                </div>

                                <div className="mt-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
                                    <span className="text-slate-500 font-medium">RBAC Scopes</span>
                                    <span className="font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-md text-[10px]">Segmented</span>
                                </div>
                            </div>

                            {/* Card 4: New Joiners */}
                            <div className="bg-slate-900 dark:bg-[#111822] p-5 rounded-2xl border border-indigo-500/30 shadow-md text-white relative overflow-hidden group flex flex-col justify-between">
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                                    <span className="material-symbols-outlined text-6xl text-indigo-300">person_add</span>
                                </div>
                                <div className="flex items-start justify-between relative z-10">
                                    <div>
                                        <p className="text-indigo-200/80 text-[10px] font-black uppercase tracking-wider">New Onboardings</p>
                                        <div className="flex items-baseline gap-1.5 mt-1">
                                            <p className="text-3xl font-black text-white font-mono tracking-tight">{newJoinersThisMonth}</p>
                                            <span className="text-xs font-bold text-indigo-300">this month</span>
                                        </div>
                                    </div>
                                    <div className="size-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shadow-inner">
                                        <span className="material-symbols-outlined text-[20px]">trending_up</span>
                                    </div>
                                </div>

                                <div className="mt-3 relative z-10">
                                    <p className="text-[11px] text-indigo-200/70 font-medium">
                                        {newJoinersThisMonth > 0 ? `${newJoinersThisMonth} new team members added this calendar month.` : 'No new members onboarded this month.'}
                                    </p>
                                </div>

                                <div className="mt-2 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] relative z-10">
                                    <span className="text-indigo-200/70 font-medium">Onboarding cycle</span>
                                    <span className="font-bold text-indigo-200 bg-indigo-500/30 px-2 py-0.5 rounded-md text-[10px]">30-Day Window</span>
                                </div>
                            </div>
                        </div>

                        {/* Controls Toolbar */}
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-white dark:bg-[#1A2633] p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                            {/* Dynamic department tabs */}
                            <div
                                data-no-scrollbar="true"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar scrollbar-none"
                            >
                                {departmentTabs.map(tab => {
                                    const isSelected = activeTab === tab;
                                    const count = deptCounts[tab] || 0;
                                    return (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                                                isSelected
                                                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm shadow-slate-900/20'
                                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
                                            }`}
                                        >
                                            <span>{tab}</span>
                                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                                isSelected
                                                    ? 'bg-white/20 dark:bg-black/20 text-white dark:text-slate-900'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                            }`}>
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
                                {/* Sort dropdown */}
                                <div className="relative">
                                    <select
                                        value={sortBy}
                                        onChange={e => setSortBy(e.target.value as any)}
                                        className="appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/70 rounded-xl pl-8 pr-8 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none cursor-pointer transition-all"
                                    >
                                        <option value="name">Sort: Name A–Z</option>
                                        <option value="role">Sort: Role</option>
                                        <option value="department">Sort: Department</option>
                                        <option value="joined">Sort: Newest First</option>
                                    </select>
                                    <span className="material-symbols-outlined text-[16px] text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">swap_vert</span>
                                    <span className="material-symbols-outlined text-[16px] text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
                                </div>

                                {/* Search bar */}
                                <div className="relative flex-1 md:w-64">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[18px]">search</span>
                                    <input
                                        ref={searchInputRef}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/70 rounded-xl pl-10 pr-8 py-2.5 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                        placeholder="Search name, email, or role..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                    {search ? (
                                        <button
                                            onClick={() => setSearch('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 size-5 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">close</span>
                                        </button>
                                    ) : (
                                        <kbd className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                            /
                                        </kbd>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Split Content Area */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {/* Staff List (Left Column) */}
                        <div className="lg:col-span-2 space-y-4">
                            {filteredStaff.length > 0 ? (
                                <div className="bg-white dark:bg-[#1A2633] rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
                                    <div className="hidden md:flex items-center px-6 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                        <div className="w-5/12">Employee & Account</div>
                                        <div className="w-2/12">Role & Title</div>
                                        <div className="w-2/12">Department</div>
                                        <div className="w-1.5/12">Status</div>
                                        <div className="w-1.5/12 text-right">Last Active</div>
                                    </div>

                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {filteredStaff.map(member => {
                                            const isSelected = String(selectedStaffId) === String(member.id);
                                            const isOnline = isStaffOnlineNow(member.lastActive);
                                            const isAdminUser = member.userType === 'Admin';
                                            const isCurrentUser = currentUser?.id === member.id || (currentUser?.email && member.email.toLowerCase() === currentUser.email.toLowerCase());

                                            return (
                                                <div
                                                    key={member.id}
                                                    onClick={() => setSelectedStaffId(member.id)}
                                                    className={`group flex items-center p-4 md:px-6 cursor-pointer transition-all duration-200 border-l-4 relative ${
                                                        isSelected
                                                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-600 dark:border-indigo-500 shadow-sm'
                                                            : 'border-transparent hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                                                    }`}
                                                >
                                                    {/* Employee Avatar & Details */}
                                                    <div className="flex items-center gap-3.5 flex-1 md:w-5/12 min-w-0 pr-2">
                                                        <div className="relative shrink-0">
                                                            <div className={`size-10 rounded-xl flex items-center justify-center font-black text-xs ${getAvatarStyle(member.role)} group-hover:scale-105 transition-transform`}>
                                                                {member.initials}
                                                            </div>
                                                            {isOnline && (
                                                                <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-green-500 border-2 border-white dark:border-slate-900" title="Active now in system" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <p className={`font-bold text-sm truncate ${
                                                                    isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-white'
                                                                }`}>
                                                                    {member.name}
                                                                </p>
                                                                {isAdminUser && (
                                                                    <span className="material-symbols-outlined text-[14px] text-amber-500 shrink-0" title="System Administrator">verified</span>
                                                                )}
                                                                {isCurrentUser && (
                                                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">You</span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{member.email}</p>
                                                        </div>
                                                    </div>

                                                    {/* Role */}
                                                    <div className="hidden md:block w-2/12 pr-2">
                                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg inline-block truncate max-w-full ${getRoleBadge(member.role)}`}>
                                                            {member.role}
                                                        </span>
                                                    </div>

                                                    {/* Department */}
                                                    <div className="hidden md:block w-2/12 pr-2 text-xs font-bold text-slate-600 dark:text-slate-300 truncate">
                                                        {member.department}
                                                    </div>

                                                    {/* Status */}
                                                    <div className="hidden md:block w-1.5/12 pr-2">
                                                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                                                            member.status === 'Active'
                                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                                                                : 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                                                        }`}>
                                                            <span className={`size-1.5 rounded-full ${member.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                                                            {member.status}
                                                        </span>
                                                    </div>

                                                    {/* Last Active + Hover Quick Actions */}
                                                    <div className="hidden md:flex items-center justify-end w-1.5/12 text-right relative">
                                                        {/* Static timestamp view */}
                                                        <div className="group-hover:opacity-0 transition-opacity">
                                                            {isOnline ? (
                                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                                                    <span className="size-1.5 rounded-full bg-emerald-500"></span>
                                                                    Just now
                                                                </span>
                                                            ) : (
                                                                <span className={`text-xs font-medium ${
                                                                    !member.lastActive || member.lastActive === 'Never'
                                                                        ? 'text-slate-300 dark:text-slate-600'
                                                                        : 'text-slate-500 dark:text-slate-400'
                                                                }`}>
                                                                    {formatLastActive(member.lastActive)}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Quick Hover Actions */}
                                                        <div className="absolute right-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/90 dark:bg-[#1A2633]/90 backdrop-blur-sm pl-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCopyText(member.email, 'Email');
                                                                }}
                                                                className="size-7 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                                                                title="Copy Email"
                                                            >
                                                                <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                                            </button>
                                                            <Link
                                                                to={`/admin/attendance?staffId=${member.id}`}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="size-7 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                                                                title="Attendance Roster"
                                                            >
                                                                <span className="material-symbols-outlined text-[14px]">fingerprint</span>
                                                            </Link>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleOpenEdit(member);
                                                                }}
                                                                className="size-7 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                                                                title="Edit Profile"
                                                            >
                                                                <span className="material-symbols-outlined text-[14px]">edit</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-[#1A2633] rounded-2xl border border-slate-200 dark:border-slate-800">
                                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-full mb-4">
                                        <span className="material-symbols-outlined text-4xl text-slate-400">person_off</span>
                                    </div>
                                    <h3 className="text-slate-900 dark:text-white font-bold mb-1">No staff members found</h3>
                                    <p className="text-sm text-slate-500 max-w-sm">
                                        {currentUser?.userType !== 'Admin' ? 'Your account has limited view access for staff management. Ask your admin to enable full staff view permissions.' : 'Try adjusting your search or filters.'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Details Panel (Right/Sticky Column) */}
                        <div className={`lg:col-span-1 lg:sticky lg:top-6 self-start ${selectedStaffId ? 'fixed inset-0 z-[60] lg:static lg:z-auto' : 'hidden lg:block'}`}>
                            {selectedMember ? (
                                <div className="bg-white dark:bg-[#1A2633] rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 flex flex-col h-full md:h-auto overflow-hidden animate-in fade-in slide-in-from-right-4">
                                    {/* Cover Header Banner */}
                                    <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white">
                                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                            <span className="material-symbols-outlined text-7xl text-indigo-400">shield_person</span>
                                        </div>

                                        <div className="relative z-10 flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <button onClick={() => setSelectedStaffId(null)} className="lg:hidden text-slate-300 -ml-1 p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer">
                                                    <span className="material-symbols-outlined">arrow_back</span>
                                                </button>
                                                <div className={`size-12 rounded-xl flex items-center justify-center font-black text-lg shadow-lg shrink-0 ${getAvatarStyle(selectedMember.role)}`}>
                                                    {selectedMember.initials}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <h2 className="text-base font-black text-white leading-tight truncate">{selectedMember.name}</h2>
                                                        {selectedMember.userType === 'Admin' && (
                                                            <span className="material-symbols-outlined text-[16px] text-amber-400 shrink-0" title="Administrator">verified</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-white/15 px-2 py-0.5 rounded text-indigo-200 truncate">
                                                            {selectedMember.role}
                                                        </span>
                                                        <span className="text-[10px] text-slate-300 font-medium truncate">
                                                            {selectedMember.department}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Bar */}
                                            <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md p-1 rounded-xl border border-white/10 shrink-0">
                                                <Link
                                                    to={`/admin/attendance?staffId=${selectedMember.id}`}
                                                    className="p-1.5 text-slate-300 hover:text-white hover:bg-white/15 rounded-lg transition-colors flex items-center justify-center"
                                                    title="View Attendance & Roster"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">fingerprint</span>
                                                </Link>
                                                <button
                                                    onClick={() => handleOpenEdit(selectedMember)}
                                                    className="p-1.5 text-slate-300 hover:text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
                                                    title="Edit Profile & Permissions"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                </button>
                                                {currentUser?.userType === 'Admin' && currentUser.id !== selectedMember.id && (
                                                    <button
                                                        onClick={() => masqueradeAs(selectedMember.id)}
                                                        className="p-1.5 text-indigo-300 hover:text-white hover:bg-indigo-500/30 rounded-lg transition-colors cursor-pointer"
                                                        title="Masquerade / View As"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(selectedMember.id)}
                                                    className="p-1.5 text-rose-300 hover:text-rose-100 hover:bg-rose-500/30 rounded-lg transition-colors cursor-pointer"
                                                    title="Remove Account"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Panel Body with safe bottom padding so FAB button never collides */}
                                    <div className="p-5 pb-24 space-y-6 overflow-y-auto max-h-[calc(100vh-260px)] scrollbar-thin">
                                        {/* Status Switcher Card */}
                                        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                                            <div>
                                                <p className="text-xs font-bold text-slate-900 dark:text-white">Account Access</p>
                                                <p className="text-[11px] text-slate-500 mt-0.5">
                                                    {selectedMember.status === 'Active' ? 'Active system credentials enabled' : 'Account is currently suspended'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => toggleStatus(selectedMember.id)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer ${
                                                    selectedMember.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                                                }`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    selectedMember.status === 'Active' ? 'translate-x-6' : 'translate-x-1'
                                                }`} />
                                            </button>
                                        </div>

                                        {/* Contact & Presence Information */}
                                        <div>
                                            <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-[14px]">id_card</span> Contact & Presence
                                            </h3>
                                            <div className="space-y-2">
                                                {/* Email Item */}
                                                <div className="flex items-center justify-between p-3 bg-white dark:bg-[#1A2633] border border-slate-200/70 dark:border-slate-800 rounded-xl group hover:border-slate-300 transition-colors">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="size-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center shrink-0">
                                                            <span className="material-symbols-outlined text-[16px]">mail</span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] uppercase text-slate-400 font-bold">Email Address</p>
                                                            <a href={`mailto:${selectedMember.email}`} className="text-xs font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 truncate block">
                                                                {selectedMember.email}
                                                            </a>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleCopyText(selectedMember.email, 'Email')}
                                                            className="size-7 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                                                            title="Copy Email"
                                                        >
                                                            <span className="material-symbols-outlined text-[15px]">content_copy</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Phone & WhatsApp Item */}
                                                <div className="flex items-center justify-between p-3 bg-white dark:bg-[#1A2633] border border-slate-200/70 dark:border-slate-800 rounded-xl group hover:border-slate-300 transition-colors">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center shrink-0">
                                                            <span className="material-symbols-outlined text-[16px]">call</span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] uppercase text-slate-400 font-bold">Mobile Phone</p>
                                                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{selectedMember.phone || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                    {selectedMember.phone && (
                                                        <div className="flex items-center gap-1">
                                                            <a
                                                                href={`https://wa.me/${selectedMember.phone.replace(/[^0-9]/g, '')}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="size-7 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                                                                title="Chat on WhatsApp"
                                                            >
                                                                <span className="material-symbols-outlined text-[15px]">chat</span>
                                                            </a>
                                                            <button
                                                                onClick={() => handleCopyText(selectedMember.phone || '', 'Phone')}
                                                                className="size-7 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                                                                title="Copy Phone"
                                                            >
                                                                <span className="material-symbols-outlined text-[15px]">content_copy</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Last Active Timestamp */}
                                                <div className="flex items-center gap-3 p-3 bg-white dark:bg-[#1A2633] border border-slate-200/70 dark:border-slate-800 rounded-xl">
                                                    <div className="size-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 flex items-center justify-center shrink-0">
                                                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] uppercase text-slate-400 font-bold">Last Activity</p>
                                                        <p className={`text-xs font-bold ${isStaffOnlineNow(selectedMember.lastActive) ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                                            {isStaffOnlineNow(selectedMember.lastActive) ? '● Active in system now' : formatLastActive(selectedMember.lastActive)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Security & Access Rights */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-[14px]">lock_person</span> Access Rights & Scopes
                                                </h3>
                                                {selectedMember.userType !== 'Admin' && (
                                                    <button
                                                        onClick={() => handleOpenEdit(selectedMember)}
                                                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
                                                    >
                                                        Configure Scopes
                                                    </button>
                                                )}
                                            </div>

                                            {selectedMember.userType === 'Admin' ? (
                                                <div className="p-4 bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 dark:from-violet-950/30 dark:via-purple-950/20 dark:to-indigo-950/30 border border-violet-200/80 dark:border-violet-800/70 rounded-2xl space-y-1.5">
                                                    <div className="flex items-center gap-2 text-violet-800 dark:text-violet-300 font-bold text-xs">
                                                        <span className="material-symbols-outlined text-violet-600 dark:text-violet-400 text-[18px]">verified_user</span>
                                                        Full System Administrator
                                                    </div>
                                                    <p className="text-[11px] text-violet-700 dark:text-violet-400/90 leading-relaxed">
                                                        Unrestricted view and manage rights across all 39 system modules with global scope and master authority.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {/* Data Scopes Grid */}
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-800">
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Data Scope</p>
                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                <span className="material-symbols-outlined text-[14px] text-indigo-500">
                                                                    {selectedMember.queryScope === 'Show All Queries' ? 'public' : selectedMember.queryScope === 'Show Department Queries' ? 'corporate_fare' : 'person'}
                                                                </span>
                                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                                                    {selectedMember.queryScope === 'Show All Queries' ? 'All Records' : selectedMember.queryScope === 'Show Department Queries' ? 'Department' : 'Assigned Only'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-800">
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">WhatsApp Scope</p>
                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                <span className="material-symbols-outlined text-[14px] text-emerald-500">chat</span>
                                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                                                    {selectedMember.whatsappScope || 'Assigned Only'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Critical Security Posture Badges */}
                                                    {(() => {
                                                        const p = selectedMember.permissions as Record<string, any> | undefined;
                                                        const leadsMasked = p?.leads?.features?.mask_contacts !== false;
                                                        const marginsVisible = p?.bookings?.features?.view_cost_margins === true || p?.leads?.features?.view_profit_margin === true;
                                                        const canApproveFinance = p?.inbox?.features?.approve_payments === true;
                                                        const canDeleteRecords = p?.leads?.features?.delete_lead === true || p?.bookings?.features?.cancel_booking === true;

                                                        return (
                                                            <div className="flex flex-wrap gap-1.5">
                                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold ${leadsMasked ? 'bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300'}`}>
                                                                    <span className="material-symbols-outlined text-[12px]">{leadsMasked ? 'phone_locked' : 'phone_enabled'}</span>
                                                                    {leadsMasked ? 'Contacts Masked' : 'Contacts Visible'}
                                                                </span>
                                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold ${marginsVisible ? 'bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300' : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}>
                                                                    <span className="material-symbols-outlined text-[12px]">{marginsVisible ? 'monitoring' : 'visibility_off'}</span>
                                                                    {marginsVisible ? 'Margins Visible' : 'Margins Hidden'}
                                                                </span>
                                                                {canApproveFinance && (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/80 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300">
                                                                        <span className="material-symbols-outlined text-[12px]">payments</span>
                                                                        Payment Approver
                                                                    </span>
                                                                )}
                                                                {canDeleteRecords && (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300">
                                                                        <span className="material-symbols-outlined text-[12px]">delete_forever</span>
                                                                        Can Delete/Cancel
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* Accessible Modules List */}
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                                Enabled Modules ({Object.entries(selectedMember.permissions || {}).filter(([_, v]: any) => v?.view || v?.manage).length} of {ALL_MODULE_DEFINITIONS.length})
                                                            </p>
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                                                            {selectedMember.permissions && Object.entries(selectedMember.permissions).map(([key, value]) => {
                                                                const val = value as any;
                                                                if (!val || (!val.manage && !val.view)) return null;
                                                                const modDef = MODULES_BY_KEY[key];
                                                                const label = modDef?.name || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                                                const icon = modDef?.icon || (val.manage ? 'edit_square' : 'visibility');

                                                                return (
                                                                    <span
                                                                        key={key}
                                                                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border flex items-center gap-1.5 ${val.manage ? 'bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-300' : 'bg-slate-50 text-slate-600 border-slate-200/70 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}
                                                                        title={val.manage ? `${label} (Full Manage Access)` : `${label} (View Only Access)`}
                                                                    >
                                                                        <span className="material-symbols-outlined text-[13px]">{icon}</span>
                                                                        <span className="truncate max-w-[130px]">{label}</span>
                                                                        <span className={`text-[9px] px-1 py-0.2 rounded font-black ${val.manage ? 'bg-indigo-200 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-200' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                                                            {val.manage ? 'MANAGE' : 'VIEW'}
                                                                        </span>
                                                                    </span>
                                                                );
                                                            })}
                                                            {(!selectedMember.permissions || !Object.values(selectedMember.permissions).some((p: any) => p?.view || p?.manage)) && (
                                                                <div className="w-full text-center py-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                                                    <p className="text-xs text-slate-400 italic">No permissions assigned yet. Edit profile to configure.</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
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
                                    <p className="text-sm text-slate-500 max-w-[200px] mt-1">Select a team member from the list to view their profile, permissions, and security posture.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};