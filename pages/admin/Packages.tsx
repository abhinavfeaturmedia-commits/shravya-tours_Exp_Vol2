import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Package, CommissionType } from '../../types';
import { ImageUpload } from '../../components/ui/ImageUpload';
import { SuggestPopup, isDismissed, isSnoozed } from '../../components/ui/SuggestPopup';
import { useBookings } from '../../src/hooks/useBookings';
import { ActionMenu } from '../../components/ui/ActionMenu';
import { getLocationName } from '../../utils/packageUtils';
import { copyToClipboard } from '../../utils/clipboard';
import { toast } from '../../components/ui/Toast';

// Extracted Component with React.memo to prevent unnecessary re-renders of the entire list when Edit Modal opens
const PackageCard = React.memo(({
    pkg,
    onEdit,
    onToggleStatus,
    onClone,
    onDelete,
    onPreview,
    onCopyLink,
    masterLocations,
    bookingCount,
    revenue
}: {
    pkg: Package,
    onEdit: (pkg: Package) => void,
    onToggleStatus: (pkg: Package) => void,
    onClone: (pkg: Package) => void,
    onDelete: (id: string) => void,
    onPreview: (id: string) => void,
    onCopyLink: (id: string) => void,
    masterLocations: any[],
    bookingCount: number,
    revenue: number
}) => {
    return (
        <div className="group bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center gap-6 hover:shadow-lg transition-all hover:border-primary/30">
            {/* Image */}
            <div className="size-24 md:size-20 rounded-xl bg-slate-200 overflow-hidden shrink-0 relative">
                <img src={pkg.image} alt={pkg.title} className="w-full h-full object-cover" />
                {pkg.status === 'Inactive' && (
                    <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                        <span className="material-symbols-outlined text-white/90 text-xl">visibility_off</span>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg truncate">{pkg.title}</h3>
                    {pkg.status === 'Inactive' && (
                        <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 select-none">
                            <span className="material-symbols-outlined text-[13px]">visibility_off</span>
                            Hidden
                        </span>
                    )}
                    {pkg.videos && pkg.videos.length > 0 && (
                        <span className="bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 select-none">
                            <span className="material-symbols-outlined text-[14px]">videocam</span>
                            {pkg.videos.length} Video{pkg.videos.length > 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">location_on</span> {getLocationName(pkg.location, masterLocations)}</span>
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">schedule</span> {pkg.days} Days</span>
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">group</span> {pkg.groupSize}</span>
                </div>
                {/* Proposal Status Badge */}
                {pkg.proposalStatus && (() => {
                    const statusStyles: Record<string, string> = {
                        'Draft':             'bg-slate-100 text-slate-500',
                        'Sent':              'bg-sky-100 text-sky-700',
                        'Viewed':            'bg-amber-100 text-amber-700',
                        'Approved':          'bg-emerald-100 text-emerald-700',
                        'Changes Requested': 'bg-rose-100 text-rose-700',
                    };
                    const statusIcons: Record<string, string> = {
                        'Draft': '📝', 'Sent': '📤', 'Viewed': '👁️', 'Approved': '✅', 'Changes Requested': '💬',
                    };
                    return (
                        <span className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider w-fit ${statusStyles[pkg.proposalStatus] || 'bg-slate-100 text-slate-500'}`}>
                            {statusIcons[pkg.proposalStatus]} Proposal: {pkg.proposalStatus}
                        </span>
                    );
                })()}
            </div>

            {/* Metrics */}
            <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-6 md:pr-4 md:border-r border-slate-100 dark:border-slate-700">
                <div className="text-center md:text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase">Price</p>
                    <p className="font-black text-slate-900 dark:text-white">₹{(pkg.price / 1000).toFixed(0)}k</p>
                </div>
                <div className="text-center md:text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase">Bookings</p>
                    <p className="font-black text-slate-900 dark:text-white">{bookingCount}</p>
                </div>
                <div className="text-center md:text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase">Revenue</p>
                    <p className="font-black text-emerald-600 dark:text-emerald-400">₹{(revenue / 1000).toFixed(0)}k</p>
                </div>
                {pkg.remainingSeats !== undefined && pkg.remainingSeats < 10 && (
                    <div className="text-center md:text-right">
                        <p className="text-xs font-bold text-red-400 uppercase">Seats Left</p>
                        <p className="font-black text-red-600 dark:text-red-400">{pkg.remainingSeats}</p>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="w-full md:w-auto flex items-center justify-end gap-3">
                <button
                    onClick={() => onPreview(pkg.id)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                    Preview
                </button>
                {pkg.status === 'Active' ? (
                    <button
                        onClick={() => onToggleStatus(pkg)}
                        className="px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 flex items-center gap-1.5"
                        title="Active package. Click to hide from website."
                    >
                        <span className="material-symbols-outlined text-[15px]">check_circle</span>
                        Active
                    </button>
                ) : (
                    <button
                        onClick={() => onToggleStatus(pkg)}
                        className="px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 flex items-center gap-1.5"
                        title="Hidden package. Click to make Active."
                    >
                        <span className="material-symbols-outlined text-[15px]">visibility_off</span>
                        Hidden
                    </button>
                )}
                <ActionMenu>
                    <button onClick={() => onEdit(pkg)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors w-full text-left">
                        <span className="material-symbols-outlined text-[18px] text-primary">edit</span> Quick Edit
                    </button>
                    <button onClick={() => onClone(pkg)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors w-full text-left font-medium">
                        <span className="material-symbols-outlined text-[18px]">content_copy</span> Clone Package
                    </button>
                    <button onClick={() => onCopyLink(pkg.id)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors w-full text-left">
                        <span className="material-symbols-outlined text-[18px]">link</span> Copy Web Link
                    </button>
                    <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                    <button onClick={() => onToggleStatus(pkg)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors w-full text-left">
                        <span className="material-symbols-outlined text-[18px]">{pkg.status === 'Inactive' ? 'visibility' : 'visibility_off'}</span>
                        {pkg.status === 'Inactive' ? 'Unhide (Make Active)' : 'Hide from Website'}
                    </button>
                    <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                    <button onClick={() => onDelete(pkg.id)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors w-full text-left">
                        <span className="material-symbols-outlined text-[18px]">delete</span> Delete
                    </button>
                </ActionMenu>
            </div>
        </div>
    );
});

export const AdminPackages: React.FC = () => {
    const { packages, addPackage, updatePackage, deletePackage, cmsGallery, masterLocations } = useData();
    const { bookings } = useBookings();
    const navigate = useNavigate();
    const location = useLocation();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');

    // Clone Package Modal State
    const [packageToClone, setPackageToClone] = useState<Package | null>(null);
    const [cloneTitle, setCloneTitle] = useState<string>('');
    const [clonePrice, setClonePrice] = useState<number | string>(0);
    const [cloneStatus, setCloneStatus] = useState<'Inactive' | 'Active'>('Inactive');
    const [postCloneAction, setPostCloneAction] = useState<'builder' | 'edit' | 'stay'>('builder');
    const [isCloning, setIsCloning] = useState<boolean>(false);

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const filterParam = searchParams.get('filter');
        const statusParam = searchParams.get('status');
        if (filterParam === 'no-bookings') {
            setSearch('no-bookings');
        } else if (statusParam === 'Inactive') {
            setStatusFilter('Inactive');
        } else if (statusParam === 'Active') {
            setStatusFilter('Active');
        }
    }, [location.search]);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingPackageId, setEditingPackageId] = useState<string | null>(null);

    // Comprehensive Edit Form State
    const [editForm, setEditForm] = useState({
        title: '',
        location: '',
        price: 0,
        pricingMode: 'group' as 'group' | 'per_person',
        days: 0,
        description: '',
        overview: '',
        image: '',
        tag: '',
        tagColor: 'bg-blue-500 text-white',
        theme: '',
        groupSize: '',
        status: 'Active' as 'Active' | 'Inactive',
        remainingSeats: '' as string | number,
        offerEndTime: '',
        addons: [] as { id: string; label: string; price: number }[],
        partnerCommissionType: 'Percentage' as CommissionType,
        partnerCommissionValue: '' as string | number
    });

    // Derived Stats (Memoized to prevent recalculation on every render)
    const { totalPackages, activePackages, inactivePackages } = useMemo(() => {
        const total = packages.length;
        const active = packages.filter(p => p.status === 'Active').length;
        const inactive = packages.filter(p => p.status === 'Inactive').length;
        return {
            totalPackages: total,
            activePackages: active,
            inactivePackages: inactive
        };
    }, [packages]);

    const handleEditClick = useCallback((pkg: Package) => {
        setEditingPackageId(pkg.id);
        setEditForm({
            title: pkg.title,
            location: pkg.location,
            price: pkg.price,
            pricingMode: pkg.pricingMode || 'group',
            days: pkg.days,
            description: pkg.description,
            overview: pkg.overview,
            image: pkg.image,
            tag: pkg.tag || '',
            tagColor: pkg.tagColor || 'bg-blue-500 text-white',
            theme: pkg.theme,
            groupSize: pkg.groupSize,
            status: (pkg.status || 'Active') as 'Active' | 'Inactive',
            remainingSeats: pkg.remainingSeats ?? '',
            offerEndTime: pkg.offerEndTime || '',
            addons: pkg.addons || [],
            partnerCommissionType: pkg.partnerCommissionType || 'Percentage',
            partnerCommissionValue: pkg.partnerCommissionValue !== undefined && pkg.partnerCommissionValue !== null ? pkg.partnerCommissionValue : ''
        });
        setIsEditModalOpen(true);
    }, []);

    // Handle deep linking for specific package edit modal
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const idParam = searchParams.get('id');
        if (idParam && packages.length > 0) {
            const pkg = packages.find(p => String(p.id) === String(idParam));
            if (pkg) {
                handleEditClick(pkg);
            }
        }
    }, [location.search, packages, handleEditClick]);

    const handleSaveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingPackageId) {
            updatePackage(editingPackageId, {
                ...editForm,
                remainingSeats: editForm.remainingSeats === '' ? undefined : Number(editForm.remainingSeats),
                offerEndTime: editForm.offerEndTime || undefined,
                addons: editForm.addons.length > 0 ? editForm.addons : undefined,
                partnerCommissionType: editForm.partnerCommissionValue === '' ? null : editForm.partnerCommissionType,
                partnerCommissionValue: editForm.partnerCommissionValue === '' ? null : Number(editForm.partnerCommissionValue)
            });
            setIsEditModalOpen(false);
            setEditingPackageId(null);
            toast.success('Package updated successfully');
        }
    };

    const handleOpenCloneModal = useCallback((pkg: Package) => {
        setPackageToClone(pkg);
        setCloneTitle(`${pkg.title} (Copy)`);
        setClonePrice(pkg.price || 0);
        setCloneStatus('Inactive'); // Default to Inactive/Draft so admin can customize before publishing
        setPostCloneAction('builder'); // Itinerary Builder is the primary destination
    }, []);

    const handleConfirmClone = useCallback(async () => {
        if (!packageToClone) return;
        setIsCloning(true);
        try {
            const finalTitle = cloneTitle.trim() || `${packageToClone.title} (Copy)`;
            const finalPrice = typeof clonePrice === 'string' ? (parseFloat(clonePrice) || 0) : Number(clonePrice);

            // Deep copy all data structures to prevent shared reference mutations
            const newPackageData: Package = {
                id: undefined as any, // backend generates a new unique UUID
                title: finalTitle,
                description: packageToClone.description || '',
                overview: packageToClone.overview || packageToClone.description || '',
                price: !isNaN(finalPrice) && finalPrice >= 0 ? finalPrice : packageToClone.price,
                originalPrice: packageToClone.originalPrice,
                pricingMode: packageToClone.pricingMode || 'group',
                location: packageToClone.location || '',
                days: packageToClone.days || 1,
                image: packageToClone.image || '',
                tag: packageToClone.tag,
                tagColor: packageToClone.tagColor,
                theme: packageToClone.theme || 'Tour',
                groupSize: packageToClone.groupSize || 'Family',
                status: cloneStatus,
                remainingSeats: packageToClone.remainingSeats,
                offerEndTime: packageToClone.offerEndTime,
                // Highlights: deep copy { icon, label }
                highlights: packageToClone.highlights ? packageToClone.highlights.map(h => ({ ...h })) : [],
                // Itinerary: deep copy { day, title, desc }
                itinerary: packageToClone.itinerary ? packageToClone.itinerary.map(item => ({ ...item })) : [],
                // Inclusions / Exclusions: deep copy string arrays
                included: packageToClone.included ? [...packageToClone.included] : [],
                notIncluded: packageToClone.notIncluded ? [...packageToClone.notIncluded] : [],
                // Gallery & Media: deep copy string arrays
                gallery: packageToClone.gallery ? [...packageToClone.gallery] : [],
                videos: packageToClone.videos ? [...packageToClone.videos] : [],
                // Add-ons: deep copy with new unique IDs
                addons: packageToClone.addons ? packageToClone.addons.map((a, idx) => ({
                    ...a,
                    id: `addon-${Date.now()}-${idx}`
                })) : [],
                // Builder Data: deep copy complete builder JSON
                builderData: packageToClone.builderData ? JSON.parse(JSON.stringify(packageToClone.builderData)) : null,
                // B2B Partner Commission
                partnerCommissionType: packageToClone.partnerCommissionType,
                partnerCommissionValue: packageToClone.partnerCommissionValue,
            };

            const created = await addPackage(newPackageData);
            setPackageToClone(null);

            if (postCloneAction === 'builder' && created?.id) {
                navigate(`/admin/itinerary-builder?edit=${created.id}`);
            } else if (postCloneAction === 'edit' && created) {
                handleEditClick(created);
            }
        } catch (error) {
            console.error('Failed to clone package:', error);
            toast.error('Failed to clone package. Please try again.');
        } finally {
            setIsCloning(false);
        }
    }, [packageToClone, cloneTitle, clonePrice, cloneStatus, postCloneAction, addPackage, navigate, handleEditClick]);

    const handleToggleStatus = useCallback((pkg: Package) => {
        const newStatus = pkg.status === 'Active' ? 'Inactive' : 'Active';
        updatePackage(pkg.id, { status: newStatus });
        toast.success(`Package marked as ${newStatus === 'Active' ? 'Active' : 'Hidden'}`);
    }, [updatePackage]);

    const handleDelete = useCallback((id: string) => {
        if (confirm('Are you sure you want to delete this package? Associated bookings will remain but linkage might break.')) {
            deletePackage(id);
            toast.success('Package deleted');
        }
    }, [deletePackage]);

    const handlePreview = useCallback((id: string) => {
        navigate(`/packages/${id}`);
    }, [navigate]);

    const handleCopyLink = useCallback((id: string) => {
        const url = `${window.location.origin}/#/packages/${id}`;
        copyToClipboard(url).then(success => {
            if (success) {
                toast.success('Web Link copied to clipboard!');
            } else {
                toast.error('Failed to copy link to clipboard');
            }
        });
    }, []);

    const filteredPackages = useMemo(() => {
        let list = packages;

        // Apply status filter
        if (statusFilter !== 'all') {
            list = list.filter(p => p.status === statusFilter);
        }

        if (search === 'no-bookings') {
            const packageBookingCounts = packages.reduce((acc, pkg) => {
                acc[pkg.id] = bookings.filter(b => b.packageId === pkg.id).length;
                return acc;
            }, {} as Record<string, number>);
            return list.filter(p => p.status === 'Active' && (packageBookingCounts[p.id] || 0) === 0);
        } else if (search === 'Hidden') {
            return list.filter(p => p.status === 'Inactive');
        }

        const q = (search || '').toLowerCase().trim();
        if (!q) return list;

        return list.filter(p =>
            p && (
                (p.title || '').toLowerCase().includes(q) ||
                getLocationName(p.location || '', masterLocations).toLowerCase().includes(q) ||
                (p.location || '').toLowerCase().includes(q)
            )
        );
    }, [packages, search, statusFilter, bookings, masterLocations]);

    // Per-package booking stats
    const pkgStats = useMemo(() => {
        const map: Record<string, { count: number; revenue: number }> = {};
        for (const pkg of packages) {
            const pkgBookings = bookings.filter(b => b.packageId === pkg.id);
            map[pkg.id] = {
                count: pkgBookings.length,
                revenue: pkgBookings.reduce((s, b) => s + (b.amount || 0), 0)
            };
        }
        return map;
    }, [packages, bookings]);

    return (
        <div className="flex flex-col h-full admin-page-bg">

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A2633] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Package Details</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><span className="material-symbols-outlined">close</span></button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-6 space-y-6">

                            {/* Section: Basic Info */}
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">General Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1 block">Package Title</label>
                                        <input required value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1 block">Location</label>
                                        <select required value={editForm.location} onChange={e => setEditForm({ ...editForm, location: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none">
                                            <option value="">Select a Location</option>
                                            {masterLocations.map(loc => (
                                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1 block">Price (₹)</label>
                                        <input required value={editForm.price} onChange={e => setEditForm({ ...editForm, price: parseInt(e.target.value) || 0 })} type="number" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1 block">Pricing Mode</label>
                                        <select required value={editForm.pricingMode} onChange={e => setEditForm({ ...editForm, pricingMode: e.target.value as any })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none">
                                            <option value="group">Group/Package Price</option>
                                            <option value="per_person">Per Person Price</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 mb-1 block">Duration (Days)</label>
                                            <input required value={editForm.days} onChange={e => setEditForm({ ...editForm, days: parseInt(e.target.value) || 0 })} type="number" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 mb-1 block">Group Size</label>
                                            <input value={editForm.groupSize} onChange={e => setEditForm({ ...editForm, groupSize: e.target.value })} type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. Max 10" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Marketing */}
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">Marketing & Display</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1 block">Badge Tag</label>
                                        <input value={editForm.tag} onChange={e => setEditForm({ ...editForm, tag: e.target.value })} type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="e.g. Best Seller" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1 block">Theme (Collection)</label>
                                        <select value={editForm.theme} onChange={e => setEditForm({ ...editForm, theme: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none">
                                            <option value="">Select a Collection</option>
                                            {cmsGallery.map(item => (
                                                <option key={item.id} value={item.title}>{item.title}</option>
                                            ))}
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1 block">Badge Color Class</label>
                                        <select value={editForm.tagColor} onChange={e => setEditForm({ ...editForm, tagColor: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none">
                                            <option value="bg-blue-500 text-white">Blue</option>
                                            <option value="bg-green-500 text-white">Green</option>
                                            <option value="bg-red-500 text-white">Red</option>
                                            <option value="bg-yellow-400 text-yellow-900">Yellow</option>
                                            <option value="bg-purple-500 text-white">Purple</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1 block">Status</label>
                                        <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value as any })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none">
                                            <option value="Active">Active (Visible on Website)</option>
                                            <option value="Inactive">Inactive (Hidden from Website)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Content */}
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">Content</h3>
                                <div className="space-y-4">
                                    <div>
                                        <ImageUpload
                                            label="Cover Image"
                                            value={editForm.image}
                                            onChange={(val) => setEditForm({ ...editForm, image: val })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1 block">Short Description</label>
                                        <input value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1 block">Full Overview</label>
                                        <textarea value={editForm.overview} onChange={e => setEditForm({ ...editForm, overview: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none h-24 resize-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Inventory & Offer */}
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">Inventory &amp; Offer</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1 block">Remaining Seats (blank = unlimited)</label>
                                        <input value={editForm.remainingSeats} onChange={e => setEditForm({ ...editForm, remainingSeats: e.target.value })} type="number" min="0" placeholder="e.g. 15" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1 block">Offer End Date &amp; Time</label>
                                        <input value={editForm.offerEndTime} onChange={e => setEditForm({ ...editForm, offerEndTime: e.target.value })} type="datetime-local" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Section: B2B Partner Commission Override */}
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">B2B Partner Commission Settings</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1 block">Override Type</label>
                                        <select value={editForm.partnerCommissionType} onChange={e => setEditForm({ ...editForm, partnerCommissionType: e.target.value as any })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none">
                                            <option value="Percentage">Percentage (%)</option>
                                            <option value="Flat_Amount">Flat Amount (₹)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1 block">Override Value (leave blank for partner default)</label>
                                        <input value={editForm.partnerCommissionValue} onChange={e => setEditForm({ ...editForm, partnerCommissionValue: e.target.value })} type="number" min="0" placeholder="e.g. 10 or 1500" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Add-ons */}
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">Package Add-ons</h3>
                                <div className="space-y-2">
                                    {editForm.addons.map((addon, idx) => (
                                        <div key={addon.id} className="flex items-center gap-2">
                                            <input value={addon.label} onChange={e => { const u = [...editForm.addons]; u[idx] = { ...addon, label: e.target.value }; setEditForm({ ...editForm, addons: u }); }} placeholder="Add-on name" className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
                                            <input value={addon.price} onChange={e => { const u = [...editForm.addons]; u[idx] = { ...addon, price: parseInt(e.target.value) || 0 }; setEditForm({ ...editForm, addons: u }); }} type="number" placeholder="Price" className="w-28 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
                                            <button type="button" onClick={() => setEditForm({ ...editForm, addons: editForm.addons.filter((_, i) => i !== idx) })} className="text-red-400 hover:text-red-600 p-1"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => setEditForm({ ...editForm, addons: [...editForm.addons, { id: `addon-${Date.now()}`, label: '', price: 0 }] })} className="text-xs font-bold text-primary flex items-center gap-1 mt-1">
                                        <span className="material-symbols-outlined text-[16px]">add_circle</span> Add Add-on
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-between gap-3 sticky bottom-0 bg-white dark:bg-[#1A2633] border-t border-slate-100 dark:border-slate-800 mt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditModalOpen(false);
                                        navigate(`/admin/itinerary-builder?edit=${editingPackageId}`);
                                    }}
                                    className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">edit_road</span>
                                    Edit in Itinerary Builder
                                </button>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
                                    <button type="submit" className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark shadow-lg shadow-primary/20 transition-colors">Save Quick Edits</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Header & Stats */}
            <div className="p-6 md:p-8 flex flex-col gap-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A2633] shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight"><span className="font-display text-4xl">Package Manager</span></h1>
                        <p className="text-slate-500 mt-1">Create, edit, and manage your travel products.</p>
                    </div>
                    <button
                        onClick={() => navigate('/admin/itinerary-builder')}
                        className="bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-primary-dark"
                    >
                        <span className="material-symbols-outlined text-[20px]">add_circle</span>
                        Create New Package
                    </button>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div 
                        onClick={() => setStatusFilter('all')}
                        className={`cursor-pointer p-4 rounded-2xl border transition-all flex items-center gap-3.5 ${
                            statusFilter === 'all'
                                ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20'
                                : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:border-slate-300'
                        }`}
                        title="Click to view all packages"
                    >
                        <div className="size-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                            <span className="material-symbols-outlined text-[22px]">inventory_2</span>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{totalPackages}</p>
                        </div>
                    </div>
                    <div 
                        onClick={() => setStatusFilter('Active')}
                        className={`cursor-pointer p-4 rounded-2xl border transition-all flex items-center gap-3.5 ${
                            statusFilter === 'Active'
                                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 shadow-sm ring-1 ring-emerald-500/20'
                                : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:border-emerald-200'
                        }`}
                        title="Click to filter Active packages"
                    >
                        <div className="size-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <span className="material-symbols-outlined text-[22px]">check_circle</span>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-emerald-600/80 uppercase tracking-wider">Active</p>
                            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-tight">{activePackages}</p>
                        </div>
                    </div>
                    <div 
                        onClick={() => setStatusFilter('Inactive')}
                        className={`cursor-pointer p-4 rounded-2xl border transition-all flex items-center gap-3.5 ${
                            statusFilter === 'Inactive'
                                ? 'bg-slate-200/60 dark:bg-slate-700/40 border-slate-400 shadow-sm ring-1 ring-slate-400/20'
                                : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:border-slate-300'
                        }`}
                        title="Click to filter Hidden packages"
                    >
                        <div className="size-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                            <span className="material-symbols-outlined text-[22px]">visibility_off</span>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hidden</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{inactivePackages}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search Bar & Filter Tabs */}
            <div className="px-6 md:px-8 py-4 bg-slate-50 dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative max-w-md w-full">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined">search</span>
                    <input
                        className="w-full bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-xl pl-12 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary outline-none shadow-sm transition-shadow"
                        placeholder="Search packages by title or location..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <span className="material-symbols-outlined text-[18px]">cancel</span>
                        </button>
                    )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                    {[
                        { id: 'all', label: 'All Packages', count: totalPackages },
                        { id: 'Active', label: 'Active', count: activePackages },
                        { id: 'Inactive', label: 'Hidden', count: inactivePackages },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setStatusFilter(tab.id as any)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                                statusFilter === tab.id
                                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                                statusFilter === tab.id
                                    ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                            }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Smart Suggestions for Packages (#13, #14) */}
            {(() => {
                // #13: Active packages with zero bookings
                const packageBookingCounts = packages.reduce((acc, pkg) => {
                    acc[pkg.id] = bookings.filter(b => b.packageId === pkg.id).length;
                    return acc;
                }, {} as Record<string, number>);
                const activeNoBookings = packages.filter(p => p.status === 'Active' && (packageBookingCounts[p.id] || 0) === 0);
                // #14: More than 50% packages are hidden/inactive
                const inactiveCount = packages.filter(p => p.status === 'Inactive').length;
                const inactivePct = packages.length > 0 ? Math.round((inactiveCount / packages.length) * 100) : 0;
                return (
                    <div className="px-6 md:px-8 pt-2 space-y-2">
                        {activeNoBookings.length > 0 && !isDismissed('packages-no-bookings') && !isSnoozed('packages-no-bookings') && (
                            <SuggestPopup
                                id="packages-no-bookings"
                                variant="banner"
                                icon="package_2"
                                color="amber"
                                title={`${activeNoBookings.length} active package${activeNoBookings.length > 1 ? 's have' : ' has'} never been booked!`}
                                description="These packages are live but getting no traction. Consider updating the description, price, or promoting them to warm leads."
                                primaryAction={{ label: 'Review Packages', icon: 'edit', onClick: () => navigate('/admin/packages?filter=no-bookings') }}
                                snoozeMinutes={60 * 24 * 7}
                            />
                        )}
                        {packages.length >= 4 && inactivePct >= 50 && !isDismissed('packages-too-many-hidden') && !isSnoozed('packages-too-many-hidden') && (
                            <SuggestPopup
                                id="packages-too-many-hidden"
                                variant="banner"
                                icon="visibility_off"
                                color="red"
                                title={`${inactivePct}% of your packages are hidden from customers!`}
                                description="Over half your catalogue is invisible. Activate or remove outdated packages to give customers a better selection."
                                primaryAction={{ label: 'Review Packages', icon: 'inventory_2', onClick: () => navigate('/admin/packages?status=Inactive') }}
                                snoozeMinutes={60 * 24 * 3}
                            />
                        )}
                    </div>
                );
            })()}

            {/* Package List */}
            <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-10">
                <div className="space-y-4">
                    {filteredPackages.length > 0 ? (
                        filteredPackages.map((pkg) => (
                            <PackageCard
                                key={pkg.id}
                                pkg={pkg}
                                onEdit={handleEditClick}
                                onToggleStatus={handleToggleStatus}
                                onClone={handleOpenCloneModal}
                                onDelete={handleDelete}
                                onPreview={handlePreview}
                                onCopyLink={handleCopyLink}
                                masterLocations={masterLocations}
                                bookingCount={pkgStats[pkg.id]?.count ?? 0}
                                revenue={pkgStats[pkg.id]?.revenue ?? 0}
                            />
                        ))
                    ) : (
                        <div className="text-center py-20 text-slate-400">
                            <span className="material-symbols-outlined text-5xl mb-2 opacity-30">inventory_2</span>
                            <p className="font-semibold">No packages found.</p>
                            {statusFilter !== 'all' && (
                                <button
                                    onClick={() => setStatusFilter('all')}
                                    className="mt-3 text-xs text-primary font-bold hover:underline"
                                >
                                    Clear filter to see all {totalPackages} packages
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Clone Package Modal */}
            {packageToClone && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A2633] w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 border border-slate-200 dark:border-slate-800">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-950/20">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-2xl">content_copy</span>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Clone Tour Package</h2>
                                    <p className="text-xs text-slate-500">Duplicate this package with full itinerary &amp; highlights</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setPackageToClone(null)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                            {/* Source Package Summary */}
                            <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                                <img src={packageToClone.image} alt={packageToClone.title} className="size-14 rounded-lg object-cover shrink-0 bg-slate-200" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-0.5">
                                        <span className="material-symbols-outlined text-[13px]">history_edu</span>
                                        Original Source Package
                                    </div>
                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{packageToClone.title}</h4>
                                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                        <span>{packageToClone.days} Days</span>
                                        <span>•</span>
                                        <span>{getLocationName(packageToClone.location, masterLocations)}</span>
                                        <span>•</span>
                                        <span className="font-bold text-slate-900 dark:text-white">₹{packageToClone.price.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* New Package Title */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                                    New Package Title <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={cloneTitle}
                                    onChange={(e) => setCloneTitle(e.target.value)}
                                    placeholder="e.g. Goa Beach Party - Summer Special"
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">Provide a distinct name so customers and staff can identify this duplicate.</p>
                            </div>

                            {/* Price */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                                    Price (₹) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={clonePrice}
                                    onChange={(e) => setClonePrice(e.target.value)}
                                    placeholder="Enter price"
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                                />
                            </div>

                            {/* Initial Status */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block uppercase tracking-wider">
                                    Initial Status
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setCloneStatus('Inactive')}
                                        className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                                            cloneStatus === 'Inactive'
                                                ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-400 text-indigo-700 dark:text-indigo-300 shadow-xs ring-1 ring-indigo-400/20'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                                        }`}
                                    >
                                        <span className={`material-symbols-outlined text-[20px] shrink-0 mt-0.5 ${cloneStatus === 'Inactive' ? 'text-indigo-600' : 'text-slate-400'}`}>
                                            visibility_off
                                        </span>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-xs font-bold">Draft / Hidden</p>
                                                <span className="text-[9px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 px-1.5 py-0.2 rounded font-black">
                                                    RECOMMENDED
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-0.5">Stay hidden so you can review details before publishing.</p>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setCloneStatus('Active')}
                                        className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                                            cloneStatus === 'Active'
                                                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400 text-emerald-700 dark:text-emerald-300 shadow-xs ring-1 ring-emerald-400/20'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                                        }`}
                                    >
                                        <span className={`material-symbols-outlined text-[20px] shrink-0 mt-0.5 ${cloneStatus === 'Active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            check_circle
                                        </span>
                                        <div>
                                            <p className="text-xs font-bold">Publish (Active)</p>
                                            <p className="text-[11px] text-slate-400 mt-0.5">Make immediately live and visible on your public website.</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* What to do next */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block uppercase tracking-wider">
                                    After Cloning
                                </label>
                                <div className="space-y-2">
                                    {[
                                        { id: 'builder', icon: 'edit_road', label: 'Open in Itinerary Builder', desc: 'Jump directly to Day-by-Day route, hotels, and activities customization' },
                                        { id: 'edit', icon: 'edit_note', label: 'Open in Quick Edit', desc: 'Tweak pricing modes, seats, tags, and addons' },
                                        { id: 'stay', icon: 'inventory_2', label: 'Stay on Package Manager', desc: 'Add to the list and continue managing packages' },
                                    ].map((opt) => (
                                        <label
                                            key={opt.id}
                                            className={`p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                                                postCloneAction === opt.id
                                                    ? 'bg-slate-100/90 dark:bg-slate-800 border-slate-400 text-slate-900 dark:text-white ring-1 ring-slate-400/20'
                                                    : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="postCloneAction"
                                                value={opt.id}
                                                checked={postCloneAction === opt.id}
                                                onChange={() => setPostCloneAction(opt.id as any)}
                                                className="text-primary focus:ring-primary h-4 w-4"
                                            />
                                            <span className="material-symbols-outlined text-[20px] text-slate-500">{opt.icon}</span>
                                            <div className="flex-1">
                                                <p className="text-xs font-bold text-slate-900 dark:text-white">{opt.label}</p>
                                                <p className="text-[10px] text-slate-400">{opt.desc}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Safety & Isolation Banner */}
                            <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 text-xs text-blue-900 dark:text-blue-200 leading-relaxed flex items-start gap-2.5">
                                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[18px] shrink-0 mt-0.5">verified_user</span>
                                <div>
                                    <p className="font-bold text-[11px] mb-0.5">Independent Product Guarantee</p>
                                    <p className="text-[11px] text-blue-800 dark:text-blue-300">
                                        The cloned package receives its own unique ID and starts with <strong>0 bookings</strong> and <strong>₹0 revenue</strong>. Existing customer bookings and accounting records will remain completely unaffected.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 px-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setPackageToClone(null)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmClone}
                                disabled={isCloning || !cloneTitle.trim()}
                                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined text-[16px]">content_copy</span>
                                {isCloning ? 'Cloning Package...' : 'Clone Package'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};