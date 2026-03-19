import React, { useState } from 'react';
import { useAuth, DEFAULT_PERMISSIONS } from '../../context/AuthContext';
import { toast } from '../../components/ui/Toast';
import { StaffMember, StaffPermissions } from '../../types';
import { api } from '../../src/lib/api';

export const StaffManagement: React.FC = () => {
    const { staff, addStaff, updateStaff, deleteStaff, currentUser, masqueradeAs } = useAuth();
    const [search, setSearch] = useState('');
    const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('All');

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    const selectedMember = staff.find(s => s.id === selectedStaffId);

    // Stats
    const activeStaff = staff.filter(s => s.status === 'Active').length;
    // Calculate unique departments from actual staff list
    const uniqueDepartments = Array.from(new Set(staff.map(s => s.department))).length;

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
        setIsModalOpen(true);
    };

    const handlePermissionChange = (module: keyof StaffPermissions, type: 'view' | 'manage', checked: boolean) => {
        setFormData(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [module]: {
                    ...prev.permissions[module],
                    [type]: checked
                }
            }
        }));
    };

    const toggleAllPermissions = (type: 'view' | 'manage', checked: boolean) => {
        setFormData(prev => {
            const newPermissions: any = { ...prev.permissions };
            Object.keys(newPermissions).forEach(key => {
                newPermissions[key] = {
                    ...newPermissions[key],
                    [type]: checked
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
            'Super Admin': 'purple',
            'Owner': 'violet',
            'Administrator': 'purple',
            'Branch Head': 'indigo',
            'Manager': 'blue',
            'Agent': 'cyan',
            'Editor': 'green',
            'Support': 'orange'
        };

        // Logic: specific roles enforce specific userTypes
        const derivedUserType = (formData.role === 'Administrator' || formData.role === 'Owner' || formData.role === 'Super Admin') ? 'Admin' : formData.userType;

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

    const handleDelete = (id: number) => {
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

        if (confirm('Are you sure you want to remove this staff member? This will revoke their access immediately.')) {
            deleteStaff(id);
            if (selectedStaffId === id) setSelectedStaffId(null);
            toast.success('Staff member removed');
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

    const filteredStaff = staff.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
        const matchesTab = activeTab === 'All' || s.department === activeTab;
        return matchesSearch && matchesTab;
    });

    const getRoleBadge = (role: string) => {
        if (role === 'Owner' || role === 'Super Admin') return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400';
        if (role.includes('Admin') || role === 'Administrator') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
        if (role === 'Branch Head') return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
        if (role.includes('Manager')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        if (role === 'Agent') return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400';
        if (role.includes('Support')) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
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
                                            <option>Support</option>
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
                                            <option value="Owner" />
                                            <option value="Branch Head" />
                                            <option value="Administrator" />
                                            <option value="Manager" />
                                            <option value="Agent" />
                                            <option value="Editor" />
                                            <option value="Support" />
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
                                                    // Format camelCase to Title Case
                                                    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                                    const typedKey = key as keyof StaffPermissions;

                                                    return (
                                                        <tr key={key} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">{label}</td>
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
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="sendMail" className="size-4 rounded border-gray-300" />
                                <label htmlFor="sendMail" className="text-xs text-slate-500">Reset and send temporary password to mail</label>
                            </div>
                            <div className="flex gap-3">
                                {currentUser?.userType === 'Admin' && (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                const res = await api.syncStaffAuth();
                                                toast.success(res.message || 'Sync successful');
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
                                <button type="submit" form="staffForm" className="px-6 py-2 bg-primary text-white font-bold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary-dark transition-colors">{isEditing ? 'Save' : 'Save'}</button>
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
                            <button
                                onClick={handleOpenAdd}
                                className="flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-xl font-bold shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                            >
                                <span className="material-symbols-outlined text-[20px]">person_add</span>
                                Add Member
                            </button>
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
                            <div className="bg-white dark:bg-[#1A2633] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Active Now</p>
                                <div className="flex items-center gap-3">
                                    <div className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                    </div>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white">{activeStaff}</p>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-[#1A2633] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Departments</p>
                                <div className="flex items-baseline gap-1">
                                    <p className="text-3xl font-black text-slate-900 dark:text-white">{uniqueDepartments}</p>
                                    <span className="text-xs font-bold text-slate-400">active</span>
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-5 rounded-2xl shadow-lg shadow-indigo-500/20 text-white relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                    <span className="material-symbols-outlined text-6xl">trending_up</span>
                                </div>
                                <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest mb-2">New Joiners</p>
                                <p className="text-3xl font-black relative z-10">0</p>
                                <p className="text-[10px] text-indigo-200 font-bold mt-1">This Month</p>
                            </div>
                        </div>

                        {/* Controls Toolbar */}
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center bg-white dark:bg-[#1A2633] p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
                                {['All', 'Executive', 'Sales', 'Operations', 'Marketing', 'Support'].map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all duration-200 ${activeTab === tab ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                            <div className="relative w-full md:w-72">
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
                                                className={`group flex items-center p-4 md:px-6 cursor-pointer transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800 ${selectedStaffId === member.id ? 'bg-indigo-50 dark:bg-indigo-900/10' : ''}`}
                                            >
                                                <div className="flex items-center gap-4 flex-1 md:w-1/3">
                                                    <div className={`size-10 rounded-xl flex items-center justify-center font-black text-xs bg-${member.color}-100 dark:bg-${member.color}-900/30 text-${member.color}-600 shadow-sm group-hover:scale-105 transition-transform`}>
                                                        {member.initials}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className={`font-bold text-sm ${selectedStaffId === member.id ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-900 dark:text-white'} truncate`}>{member.name}</p>
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

                                                <div className="hidden md:block w-1/6 text-right text-xs text-slate-500 font-medium">
                                                    {member.lastActive}
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
                                            </div>
                                        </div>

                                        {/* Permissions Summary (Dynamic) */}
                                        <div>
                                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[14px]">lock_person</span> Access Rights
                                            </h3>
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
                                                        <p className="text-xs text-slate-400 italic">No specific permissions assigned.</p>
                                                    </div>
                                                )}
                                            </div>
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