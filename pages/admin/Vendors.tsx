
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Vendor, VendorService, VendorDocument } from '../../types';
import { ImageUpload } from '../../components/ui/ImageUpload';
import { useNavigate, useLocation } from 'react-router-dom';
import { VendorBulkEmailModal } from '../../components/admin/VendorBulkEmailModal';
import { SuggestPopup, isDismissed, isSnoozed } from '../../components/ui/SuggestPopup';
import { ActionMenu } from '../../components/ui/ActionMenu';

// Internal Toast Component
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => (
    <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border animate-in slide-in-from-right-10 fade-in duration-300 ${type === 'success' ? 'bg-white dark:bg-slate-800 border-green-500/50 text-green-700 dark:text-green-400' : 'bg-white dark:bg-slate-800 border-red-500/50 text-red-700 dark:text-red-400'}`}>
        <span className="material-symbols-outlined text-2xl">{type === 'success' ? 'check_circle' : 'error'}</span>
        <div>
            <h4 className="font-bold text-sm">{type === 'success' ? 'Success' : 'Error'}</h4>
            <p className="text-xs opacity-90">{message}</p>
        </div>
        <button onClick={onClose} className="ml-4 hover:bg-slate-100 dark:hover:bg-slate-700 p-1 rounded-full transition-colors">
            <span className="material-symbols-outlined text-lg">close</span>
        </button>
    </div>
);

import { useBookings } from '../../src/hooks/useBookings';

export const Vendors: React.FC = () => {
    const { vendors, addVendor, updateVendor, deleteVendor, processVendorPayment, addVendorDocument, deleteVendorDocument, addVendorNote, packages } = useData();
    const { bookings } = useBookings();
    const navigate = useNavigate();
    const location = useLocation();

    // Notification State
    const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

    // Filter & Search State
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const filterParam = searchParams.get('filter');
        if (filterParam === 'unused') {
            setSearch('unused');
        }
    }, [location.search]);

    // UI State
    const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'Overview' | 'Services' | 'Financials' | 'Documents' | 'Settings'>('Overview');

    // Modals State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'Create' | 'Edit'>('Create');
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);
    const [isBulkEmailModalOpen, setIsBulkEmailModalOpen] = useState(false);

    // Bulk Selection & Sorting State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [sortConfig, setSortConfig] = useState<{ key: keyof Vendor | 'balanceDue' | 'rating' | 'totalSales', direction: 'asc' | 'desc' }>({ key: 'totalSales', direction: 'desc' });

    // Forms State
    const [vendorForm, setVendorForm] = useState<Partial<Vendor>>({
        name: '',
        category: 'Hotel',
        location: '',
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        contractStatus: 'Active',
        bankDetails: { accountName: '', accountNumber: '', bankName: '', ifsc: '', upiId: '', upiNumber: '' }
    });

    const [serviceForm, setServiceForm] = useState<Partial<VendorService>>({
        name: '', unit: 'Per Night', baseCost: 0, markupType: 'Percentage', markupValue: 15
    });

    // Inline edit state for existing services
    const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
    const [editServiceForm, setEditServiceForm] = useState<Partial<VendorService>>({});

    // Bulk Adjustment State
    const [bulkAdjustPercent, setBulkAdjustPercent] = useState<number>(0);

    const [paymentForm, setPaymentForm] = useState({ amount: '', reference: '' });
    const [noteText, setNoteText] = useState('');
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [editNoteText, setEditNoteText] = useState('');
    const [docForm, setDocForm] = useState({ type: 'Contract', expiry: '', name: '', url: '' });

    const selectedVendor = vendors.find(v => v.id === selectedVendorId);

    // Auto-dismiss toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
    };

    // Filter and Sort
    const filteredVendors = useMemo(() => {
        return vendors.filter(v => {
            if (search === 'unused') {
                const usedVendorIds = new Set(
                    bookings.flatMap(b => ((b as any).supplierBookings || []).map((sb: any) => sb.vendorId))
                );
                if (usedVendorIds.has(v.id)) return false;
            } else {
                const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase()) ||
                    v.location.toLowerCase().includes(search.toLowerCase()) ||
                    v.contactName.toLowerCase().includes(search.toLowerCase());
                if (!matchesSearch) return false;
            }

            let matchesCategory = true;
            if (categoryFilter !== 'All') {
                matchesCategory = v.category === categoryFilter;
            }

            return matchesCategory;
        }).sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            if (aValue === undefined || bValue === undefined) return 0;

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [vendors, search, categoryFilter, sortConfig, bookings]);

    // Dashboard Stats
    const stats = useMemo(() => {
        const totalVendors = vendors.length;
        const totalSales = vendors.reduce((acc, v) => acc + (v.totalSales || 0), 0);
        const totalCommission = vendors.reduce((acc, v) => acc + (v.totalCommission || 0), 0);
        const totalPayables = vendors.reduce((acc, v) => acc + (v.balanceDue || 0), 0);
        const avgMargin = totalSales > 0 ? (totalCommission / totalSales) * 100 : 0;

        return { totalVendors, totalSales, totalCommission, totalPayables, avgMargin };
    }, [vendors]);

    // Linked Data for Drawer
    const linkedPackages = useMemo(() => {
        if (!selectedVendor) return [];
        return packages.filter(p => p.location.includes(selectedVendor.location));
    }, [selectedVendor, packages]);

    const linkedBookings = useMemo(() => {
        if (!selectedVendor) return [];
        return bookings.filter(b => b.title.includes(selectedVendor.location) || b.details?.includes(selectedVendor.name)).slice(0, 5);
    }, [selectedVendor, bookings]);

    // --- Actions ---

    const handleSort = (key: keyof Vendor | 'balanceDue' | 'rating' | 'totalSales') => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleAllSelection = () => {
        if (selectedIds.size === filteredVendors.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredVendors.map(v => v.id)));
        }
    };

    const handleBulkAction = (action: 'export' | 'delete' | 'deactivate' | 'email') => {
        if (selectedIds.size === 0) return;

        if (action === 'email') {
            setIsBulkEmailModalOpen(true);
            return;
        }

        if (action === 'delete') {
            if (confirm(`Are you sure you want to permanently delete ${selectedIds.size} vendors?`)) {
                selectedIds.forEach(id => deleteVendor(id));
                setSelectedIds(new Set());
                showToast(`${selectedIds.size} vendors deleted.`);
            }
        } else if (action === 'deactivate') {
            if (confirm(`Mark ${selectedIds.size} vendors as Inactive?`)) {
                selectedIds.forEach(id => updateVendor(id, { contractStatus: 'Blacklisted' }));
                setSelectedIds(new Set());
                showToast(`${selectedIds.size} vendors deactivated.`);
            }
        } else {
            // Mock Export
            const csvContent = "data:text/csv;charset=utf-8," +
                ["ID,Name,Category,Balance"].join(",") + "\n" +
                vendors.filter(v => selectedIds.has(v.id)).map(v => `${v.id},${v.name},${v.category},${v.balanceDue}`).join("\n");
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "vendors_export.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast("Export download started.");
        }
    };

    const handleSendBulkEmail = (subject: string, message: string) => {
        // Here you would integrate with a backend service to send emails
        console.log('Sending bulk email:', {
            recipients: Array.from(selectedIds),
            subject,
            message
        });
        setSelectedIds(new Set());
    };

    const calculatePrice = (base: number, type: 'Percentage' | 'Fixed', val: number) => {
        if (type === 'Percentage') return base + (base * (val / 100));
        return base + val;
    };

    const handleOpenCreate = () => {
        setModalMode('Create');
        setVendorForm({ name: '', category: 'Hotel', location: '', contactName: '', contactPhone: '', contactEmail: '', contractStatus: 'Active', logo: '', bankDetails: { accountName: '', accountNumber: '', bankName: '', ifsc: '', upiId: '', upiNumber: '' } });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (vendor: Vendor) => {
        setModalMode('Edit');
        setVendorForm({ ...vendor, bankDetails: vendor.bankDetails || { accountName: '', accountNumber: '', bankName: '', ifsc: '', upiId: '', upiNumber: '' } });
        setIsModalOpen(true);
    };

    const handleVendorSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (modalMode === 'Create') {
            const newVendor: Vendor = {
                id: `VND-${Date.now()}`,
                name: vendorForm.name || 'New Vendor',
                category: (vendorForm.category as any) || 'Hotel',
                subCategory: vendorForm.subCategory as any,
                location: vendorForm.location || '',
                contactName: vendorForm.contactName || '',
                contactPhone: vendorForm.contactPhone || '',
                contactEmail: vendorForm.contactEmail || '',
                rating: 0,
                contractStatus: 'Active',
                logo: vendorForm.logo || `https://placehold.co/100x100/random/ffffff?text=${(vendorForm.name || 'N').charAt(0)}`,
                totalSales: 0,
                totalCommission: 0,
                balanceDue: 0,
                bankDetails: vendorForm.bankDetails as any,
                services: [],
                documents: [],
                transactions: [],
                notes: []
            };
            addVendor(newVendor);
            setCategoryFilter('All');
            setSearch('');
            setSelectedVendorId(newVendor.id);
            showToast('Vendor onboarded successfully!');
        } else if (vendorForm.id) {
            updateVendor(vendorForm.id, { ...vendorForm });
            showToast('Vendor profile updated.');
        }
        setIsModalOpen(false);
    };

    // Service Handlers
    const handleAddService = () => {
        if (!selectedVendor || !serviceForm.name || !serviceForm.baseCost) return;
        const sellingPrice = calculatePrice(serviceForm.baseCost, serviceForm.markupType as any, serviceForm.markupValue || 0);
        const newService: VendorService = {
            id: `S-${Date.now()}`,
            name: serviceForm.name,
            unit: serviceForm.unit || 'Per Unit',
            baseCost: Number(serviceForm.baseCost),
            markupType: (serviceForm.markupType as any) || 'Percentage',
            markupValue: Number(serviceForm.markupValue) || 0,
            sellingPrice: sellingPrice,
            status: 'Active'
        };
        updateVendor(selectedVendor.id, { services: [...selectedVendor.services, newService] });
        setServiceForm({ name: '', unit: 'Per Night', baseCost: 0, markupType: 'Percentage', markupValue: 15 });
        showToast('Service added to catalog.');
    };

    const toggleServiceStatus = (serviceId: string) => {
        if (!selectedVendor) return;
        const updatedServices = selectedVendor.services.map(s => s.id === serviceId ? { ...s, status: (s.status === 'Active' ? 'Inactive' : 'Active') as 'Active' | 'Inactive' } : s);
        updateVendor(selectedVendor.id, { services: updatedServices as VendorService[] });
    };

    const handleDeleteService = (serviceId: string) => {
        if (!selectedVendor) return;
        if (confirm('Remove this service?')) {
            const updatedServices = selectedVendor.services.filter(s => s.id !== serviceId);
            updateVendor(selectedVendor.id, { services: updatedServices });
            showToast('Service removed.');
        }
    };

    const handleStartEditService = (service: VendorService) => {
        setEditingServiceId(service.id);
        setEditServiceForm({ ...service });
    };

    const handleSaveService = () => {
        if (!selectedVendor || !editingServiceId) return;
        const sellingPrice = calculatePrice(
            Number(editServiceForm.baseCost) || 0,
            (editServiceForm.markupType as any) || 'Percentage',
            Number(editServiceForm.markupValue) || 0
        );
        const updatedServices = selectedVendor.services.map(s =>
            s.id === editingServiceId
                ? { ...s, ...editServiceForm, baseCost: Number(editServiceForm.baseCost), markupValue: Number(editServiceForm.markupValue), sellingPrice }
                : s
        );
        updateVendor(selectedVendor.id, { services: updatedServices as VendorService[] });
        setEditingServiceId(null);
        setEditServiceForm({});
        showToast('Service updated.');
    };

    const handleBulkPriceUpdate = () => {
        if (!selectedVendor || bulkAdjustPercent === 0) return;

        const updatedServices = selectedVendor.services.map(s => {
            // Increase base cost by percent
            const newBaseCost = s.baseCost * (1 + bulkAdjustPercent / 100);
            // Recalculate selling price based on existing markup rule
            const newSellingPrice = calculatePrice(newBaseCost, s.markupType, s.markupValue);
            return {
                ...s,
                baseCost: Math.round(newBaseCost),
                sellingPrice: Math.round(newSellingPrice)
            };
        });

        updateVendor(selectedVendor.id, { services: updatedServices });
        showToast(`Bulk updated ${updatedServices.length} services by ${bulkAdjustPercent}%`);
        setBulkAdjustPercent(0);
    };

    const handlePaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedVendor || !paymentForm.amount) return;
        processVendorPayment(selectedVendor.id, Number(paymentForm.amount), paymentForm.reference);
        setIsPaymentModalOpen(false);
        setPaymentForm({ amount: '', reference: '' });
        showToast('Payment recorded successfully.');
    };

    const handleAddDocument = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedVendor) return;
        if (!docForm.url) {
            showToast('Please select a file to upload.', 'error');
            return;
        }
        addVendorDocument(selectedVendor.id, {
            id: `DOC-${Date.now()}`,
            name: docForm.name || `${docForm.type} - ${new Date().getFullYear()}`,
            type: docForm.type as any,
            status: 'Valid',
            uploadDate: new Date().toISOString().split('T')[0],
            url: docForm.url,
            expiryDate: docForm.expiry || undefined
        });
        setIsDocModalOpen(false);
        setDocForm({ type: 'Contract', expiry: '', name: '', url: '' });
        showToast('Document uploaded successfully.');
    };

    const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // Auto-fill name from filename if empty
        if (!docForm.name) {
            setDocForm(prev => ({ ...prev, name: file.name.replace(/\.[^.]+$/, '') }));
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            setDocForm(prev => ({ ...prev, url: dataUrl }));
        };
        reader.readAsDataURL(file);
    };

    const handleAddNote = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedVendor || !noteText.trim()) return;
        
        const newNote = {
            id: `N-${Date.now()}`,
            text: noteText,
            date: new Date().toISOString().split('T')[0],
            author: 'You'
        };
        
        const updatedNotes = [newNote, ...(selectedVendor.notes || [])];
        updateVendor(selectedVendor.id, { notes: updatedNotes });
        setNoteText('');
        showToast('Note added');
    };

    const handleUpdateNote = (noteId: string) => {
        if (!selectedVendor || !editNoteText.trim()) return;
        const updatedNotes = (selectedVendor.notes || []).map(note => 
            note.id === noteId ? { ...note, text: editNoteText } : note
        );
        updateVendor(selectedVendor.id, { notes: updatedNotes });
        setEditingNoteId(null);
        setEditNoteText('');
        showToast('Note updated');
    };

    const handleDeleteNote = (noteId: string) => {
        if (!selectedVendor) return;
        if (!confirm('Are you sure you want to delete this note?')) return;
        const updatedNotes = (selectedVendor.notes || []).filter(note => note.id !== noteId);
        updateVendor(selectedVendor.id, { notes: updatedNotes });
        showToast('Note deleted');
    };

    const handleRenewContract = () => {
        if (!selectedVendor) return;
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);

        updateVendor(selectedVendor.id, {
            contractStatus: 'Active',
            contractExpiryDate: nextYear.toISOString().split('T')[0]
        });
        showToast('Contract renewed for 1 year.');
    };

    // Helpers
    const currentProfit = serviceForm.baseCost ? calculatePrice(serviceForm.baseCost, serviceForm.markupType as any, serviceForm.markupValue || 0) - serviceForm.baseCost : 0;
    const currentSellingPrice = serviceForm.baseCost ? calculatePrice(serviceForm.baseCost, serviceForm.markupType as any, serviceForm.markupValue || 0) : 0;

    // Unit suffix helper
    const getUnitSuffix = (unit: string) => {
        switch (unit) {
            case 'Per KM': return '/km';
            case 'Per Night': return '/night';
            case 'Per Trip': return '/trip';
            case 'Per Guest': return '/guest';
            default: return '';
        }
    };

    const getCostPlaceholder = (unit: string) => {
        switch (unit) {
            case 'Per KM': return 'Rate per KM';
            case 'Per Night': return 'Cost per Night';
            case 'Per Trip': return 'Cost per Trip';
            case 'Per Guest': return 'Cost per Guest';
            default: return 'Cost';
        }
    };

    const getDocIcon = (type: string) => {
        switch (type) {
            case 'Contract': return 'description';
            case 'License': return 'verified';
            case 'ID': return 'badge';
            case 'Insurance': return 'health_and_safety';
            default: return 'folder';
        }
    };

    const getCategoryMeta = (category: string, subCategory?: string) => {
        if (category === 'Transport' && subCategory) {
            switch (subCategory) {
                case 'Flight': return { icon: 'flight', color: 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400', badge: 'bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800' };
                case 'Bus': return { icon: 'directions_bus', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400', badge: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' };
                case 'Taxi/Cab': return { icon: 'local_taxi', color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400', badge: 'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800' };
                default: return { icon: 'commute', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', badge: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' };
            }
        }
        switch (category) {
            case 'Hotel': return { icon: 'hotel', color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400', badge: 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800' };
            case 'Transport': return { icon: 'directions_car', color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400', badge: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' };
            case 'Guide': return { icon: 'person_pin', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400', badge: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' };
            case 'Activity': return { icon: 'kayaking', color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400', badge: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800' };
            case 'DMC': return { icon: 'public', color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400', badge: 'bg-teal-50 text-teal-600 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800' };
            default: return { icon: 'storefront', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', badge: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' };
        }
    };

    const updateBankDetails = (field: string, value: string) => {
        setVendorForm(prev => ({ ...prev, bankDetails: { ...(prev.bankDetails as any), [field]: value } }));
    };

    const navigateToBookings = () => {
        if (!selectedVendor) return;
        navigate('/admin/bookings', { state: { search: selectedVendor.name } });
    };

    return (
        <div className="flex flex-col bg-slate-50 dark:bg-slate-900 relative min-h-full">

            {/* Toast Notification */}
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

            {/* Smart Suggestions for Vendors (#11, #12) */}
            {(() => {
                const usedVendorIds = new Set(
                    bookings.flatMap(b => ((b as any).supplierBookings || []).map((sb: any) => sb.vendorId))
                );
                const unusedVendors = vendors.filter(v => !usedVendorIds.has(v.id));
                const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
                const newUnusedVendors = vendors.filter(v =>
                    v.createdAt && v.createdAt >= fourteenDaysAgo && !usedVendorIds.has(v.id)
                );
                return (
                    <div className="px-6 pt-4 space-y-2">                    
                        {unusedVendors.length >= 5 && !isDismissed('vendors-unused') && !isSnoozed('vendors-unused') && (
                            <SuggestPopup
                                id="vendors-unused"
                                variant="banner"
                                icon="storefront"
                                color="amber"
                                title={unusedVendors.length + ' vendor' + (unusedVendors.length > 1 ? 's have' : ' has') + ' never been used in a booking!'}
                                description="Review and deactivate vendors you no longer work with to keep your supplier list clean."
                                primaryAction={{ label: 'Review Vendors', icon: 'manage_search', onClick: () => navigate('/admin/vendors?filter=unused') }}
                                snoozeMinutes={10080}
                            />
                        )}
                        {newUnusedVendors.length > 0 && !isDismissed('vendors-new-unused') && !isSnoozed('vendors-new-unused') && (
                            <SuggestPopup
                                id="vendors-new-unused"
                                variant="banner"
                                icon="fiber_new"
                                color="indigo"
                                title={newUnusedVendors.length + ' new vendor' + (newUnusedVendors.length > 1 ? 's' : '') + ' added but not yet used in any booking!'}
                                description="You recently added new suppliers. Assign them to upcoming bookings to put them to work."
                                primaryAction={{ label: 'View Bookings', icon: 'airplane_ticket', onClick: () => navigate('/admin/bookings') }}
                                snoozeMinutes={2880}
                            />
                        )}
                    </div>
                );
            })()}

            {/* BULK ACTIONS TOOLBAR (Floating) */}
            <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] transition-all duration-300 transform ${selectedIds.size > 0 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
                <div className="bg-slate-900/90 text-white rounded-full shadow-2xl px-6 py-3 flex items-center gap-6 border border-slate-700/50 backdrop-blur-xl">
                    <span className="font-bold text-sm">{selectedIds.size} Selected</span>
                    <div className="h-4 w-px bg-slate-700"></div>
                    <div className="flex gap-2">
                        <button onClick={() => handleBulkAction('export')} className="p-2 hover:bg-slate-800 rounded-full transition-colors tooltip" title="Export Selected"><span className="material-symbols-outlined text-[20px]">download</span></button>
                        <button onClick={() => handleBulkAction('email')} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-sky-400" title="Email Selected"><span className="material-symbols-outlined text-[20px]">mail</span></button>
                        <button onClick={() => handleBulkAction('deactivate')} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-orange-400" title="Deactivate"><span className="material-symbols-outlined text-[20px]">block</span></button>
                        <button onClick={() => handleBulkAction('delete')} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-red-400" title="Delete"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                    </div>
                    <button onClick={() => setSelectedIds(new Set())} className="ml-2 text-xs font-bold text-slate-400 hover:text-white uppercase tracking-wider">Cancel</button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col w-full admin-page-bg">

                {/* Compact Sticky Header */}
                <div className="px-6 py-5 md:px-8 bg-white dark:bg-[#1A2633] border-b border-slate-200 dark:border-slate-800 shrink-0 shadow-sm transition-all duration-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight"><span className="font-display text-3xl">Vendor Management</span></h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Audit performance, manage pricing models, and handle payouts.</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => handleBulkAction('export')} className="hidden md:flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm">
                                <span className="material-symbols-outlined text-[18px]">download</span> Export List
                            </button>
                            <button onClick={handleOpenCreate} className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 rounded-xl font-bold shadow-lg hover:opacity-90 transition-all active:scale-95 text-sm btn-glow">
                                <span className="material-symbols-outlined text-[18px]">add_business</span> New Vendor
                            </button>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content Body */}
                <div className="p-6 md:p-8 space-y-8 bg-slate-50 dark:bg-slate-900">

                    {/* Financial KPIs (Now Scrollable) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-cards">
                        {/* Net Commission */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-5 text-white shadow-lg">
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 opacity-80 mb-1">
                                    <span className="material-symbols-outlined text-sm">payments</span>
                                    <span className="text-xs font-bold uppercase tracking-wider">Net Commission</span>
                                </div>
                                <p className="text-4xl kpi-number">₹{(stats.totalCommission / 100000).toFixed(2)}L</p>
                                <div className="mt-2 flex items-center gap-1 text-xs font-medium bg-white/20 w-fit px-2 py-0.5 rounded-full border border-white/10">
                                    <span className="material-symbols-outlined text-[14px]">trending_up</span> +12.5% Profit
                                </div>
                            </div>
                            <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-9xl opacity-10 rotate-12">payments</span>
                        </div>

                        {/* Margin */}
                        <div className="bg-white dark:bg-[#1A2633] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg. Profit Margin</span>
                                    <div className="p-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg"><span className="material-symbols-outlined text-lg">pie_chart</span></div>
                                </div>
                                <p className="text-3xl kpi-number text-slate-900 dark:text-white">{stats.avgMargin.toFixed(1)}%</p>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div className="bg-green-500 h-full rounded-full transition-all duration-1000" style={{ width: `${stats.avgMargin}%` }}></div>
                            </div>
                        </div>

                        {/* Payouts */}
                        <div className="bg-white dark:bg-[#1A2633] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Payouts</span>
                                <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-lg"><span className="material-symbols-outlined text-lg">pending_actions</span></div>
                            </div>
                            <p className="text-3xl kpi-number text-slate-900 dark:text-white">₹{(stats.totalPayables / 1000).toFixed(1)}k</p>
                            <p className="text-xs text-orange-600 font-bold mt-1 tracking-tight">Requires settlement</p>
                        </div>

                        {/* Compliance */}
                        <div className="bg-white dark:bg-[#1A2633] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-primary/50 transition-colors shadow-sm" onClick={() => setSearch('Expiring')}>
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Compliance</span>
                                <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg"><span className="material-symbols-outlined text-lg">handshake</span></div>
                            </div>
                            <div className="flex items-end gap-2">
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalVendors}</p>
                                <p className="text-sm font-medium text-slate-500 mb-1">Partners</p>
                            </div>
                            <div className="flex gap-2 mt-3">
                                <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 px-2 py-0.5 rounded font-bold uppercase">2 Expiring</span>
                            </div>
                        </div>
                    </div>

                    {/* Vendors List Section */}
                    <div>
                        {/* Filters */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="relative flex-1 max-w-md">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">search</span>
                                <input className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A2633] outline-none focus:ring-2 focus:ring-primary shadow-sm transition-shadow text-sm" placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)} />
                            </div>
                            <div className="flex bg-white dark:bg-[#1A2633] rounded-xl p-1 shadow-sm border border-slate-200 dark:border-slate-700 overflow-x-auto no-scrollbar">
                                {['All', 'Hotel', 'Transport', 'DMC', 'Guide', 'Activity'].map(cat => (
                                    <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${categoryFilter === cat ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>{cat}</button>
                                ))}
                            </div>
                        </div>

                        {/* Mobile Cards Layout */}
                        <div className="grid grid-cols-1 gap-4 md:hidden">
                            {filteredVendors.length > 0 ? (
                                filteredVendors.map(vendor => {
                                    return (
                                        <div key={vendor.id} onClick={() => setSelectedVendorId(vendor.id)} className="bg-white dark:bg-[#1A2633] p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 active:scale-[0.98] transition-transform">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`size-12 rounded-lg flex items-center justify-center ${getCategoryMeta(vendor.category, vendor.subCategory).color}`}>
                                                        <span className="material-symbols-outlined text-2xl">{getCategoryMeta(vendor.category, vendor.subCategory).icon}</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 dark:text-white">{vendor.name}</h3>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getCategoryMeta(vendor.category, vendor.subCategory).badge}`}>
                                                                {vendor.category}
                                                                {vendor.subCategory && <span className="opacity-70 font-normal ml-1">• {vendor.subCategory}</span>}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${vendor.contractStatus === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-orange-100 text-orange-700'}`}>
                                                    {vendor.contractStatus}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Balance</span>
                                                    <span className="font-bold text-slate-900 dark:text-white">₹{(vendor.balanceDue / 1000).toFixed(1)}k</span>
                                                </div>
                                                <div className="flex flex-col text-right">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Rating</span>
                                                    <div className="flex items-center gap-1 font-bold text-slate-900 dark:text-white">
                                                        <span className="material-symbols-outlined text-sm text-yellow-500 fill">star</span> {vendor.rating}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-10 text-slate-500">No vendors found.</div>
                            )}
                        </div>

                        {/* Desktop Table Layout */}
                        <div className="hidden md:block bg-white dark:bg-[#1A2633] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden overflow-x-auto">
                            <table className="w-full text-left min-w-[900px]">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-bold uppercase text-slate-500 tracking-wider">
                                    <tr>
                                        <th className="px-4 py-4 w-12 text-center">
                                            <input type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === filteredVendors.length} onChange={toggleAllSelection} className="rounded text-primary focus:ring-primary/20 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 cursor-pointer size-4" />
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors" onClick={() => handleSort('name')}>
                                            <div className="flex items-center gap-1">Vendor {sortConfig.key === 'name' && <span className="material-symbols-outlined text-sm">{sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}</div>
                                        </th>
                                        <th className="px-6 py-4">Contract</th>
                                        <th className="px-6 py-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors" onClick={() => handleSort('balanceDue')}>
                                            <div className="flex items-center gap-1">Balance Payable {sortConfig.key === 'balanceDue' && <span className="material-symbols-outlined text-sm">{sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}</div>
                                        </th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredVendors.length > 0 ? (
                                        filteredVendors.map(vendor => {
                                            return (
                                                <tr key={vendor.id} className={`group hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${selectedVendorId === vendor.id ? 'bg-slate-50 dark:bg-slate-800/80' : ''}`}>
                                                    <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                        <input type="checkbox" checked={selectedIds.has(vendor.id)} onChange={() => toggleSelection(vendor.id)} className="rounded text-primary focus:ring-primary/20 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 cursor-pointer size-4" />
                                                    </td>
                                                    <td className="px-6 py-4" onClick={() => setSelectedVendorId(vendor.id)}>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`size-10 rounded-lg flex items-center justify-center ${getCategoryMeta(vendor.category, vendor.subCategory).color}`}>
                                                                <span className="material-symbols-outlined text-xl">{getCategoryMeta(vendor.category, vendor.subCategory).icon}</span>
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-900 dark:text-white text-sm">{vendor.name}</p>
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getCategoryMeta(vendor.category, vendor.subCategory).badge}`}>
                                                                        {vendor.category}
                                                                        {vendor.subCategory && <span className="opacity-70 font-normal ml-1">• {vendor.subCategory}</span>}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400">•</span>
                                                                    <p className="text-[11px] text-slate-500 flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">location_on</span>{vendor.location}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4" onClick={() => setSelectedVendorId(vendor.id)}>
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${vendor.contractStatus === 'Active' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-800'}`}>
                                                            {vendor.contractStatus}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white" onClick={() => setSelectedVendorId(vendor.id)}>₹{(vendor.balanceDue / 1000).toFixed(1)}k</td>
                                                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button onClick={(e) => { e.stopPropagation(); setSelectedVendorId(vendor.id); }} className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                                                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                                                            </button>
                                                            <ActionMenu>
                                                                {vendor.contactPhone && (
                                                                    <a href={`tel:${vendor.contactPhone}`} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors w-full text-left">
                                                                        <span className="material-symbols-outlined text-[18px] text-blue-500">call</span> Call Vendor
                                                                    </a>
                                                                )}
                                                                {vendor.contactPhone && (
                                                                    <a href={`https://wa.me/${vendor.contactPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors w-full text-left">
                                                                        <span className="material-symbols-outlined text-[18px] text-emerald-500">forum</span> WhatsApp
                                                                    </a>
                                                                )}
                                                                {vendor.contactEmail && (
                                                                    <a href={`mailto:${vendor.contactEmail}`} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors w-full text-left">
                                                                        <span className="material-symbols-outlined text-[18px] text-rose-500">mail</span> Send Email
                                                                    </a>
                                                                )}
                                                                <button onClick={() => { setSelectedVendorId(vendor.id); setActiveTab('Financials'); setIsPaymentModalOpen(true); }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors w-full text-left">
                                                                    <span className="material-symbols-outlined text-[18px] text-green-500">payments</span> Record Payment
                                                                </button>
                                                                <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                                                                <button onClick={() => handleOpenEdit(vendor)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors w-full text-left">
                                                                    <span className="material-symbols-outlined text-[18px] text-primary">edit</span> Edit Vendor
                                                                </button>
                                                                <button onClick={() => { if (confirm(`Delete ${vendor.name}?`)) { deleteVendor(vendor.id); setSelectedVendorId(null); } }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors w-full text-left">
                                                                    <span className="material-symbols-outlined text-[18px]">delete</span> Delete
                                                                </button>
                                                            </ActionMenu>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center justify-center opacity-50">
                                                    <span className="material-symbols-outlined text-4xl mb-2">store_off</span>
                                                    <p className="text-sm font-bold">No vendors found matching your filters.</p>
                                                    <button onClick={() => { setSearch(''); setCategoryFilter('All') }} className="mt-2 text-xs text-primary font-bold hover:underline">Reset Filters</button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* SLIDE-OVER DRAWER (Detailed View) */}
            <div className={`fixed inset-0 z-[100] transition-opacity duration-300 ${selectedVendorId ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedVendorId(null)}></div>
                <div className={`absolute inset-y-0 right-0 w-full md:w-[650px] bg-white dark:bg-[#1A2633] shadow-2xl transform transition-transform duration-300 flex flex-col ${selectedVendorId ? 'translate-x-0' : 'translate-x-full'}`}>
                    {selectedVendor && (
                        <>
                            {/* Hero Drawer Header */}
                            <div className="relative h-48 flex-shrink-0 bg-slate-900 overflow-hidden">
                                {/* Background Blur */}
                                <div className={`absolute inset-0 opacity-20 blur-xl ${getCategoryMeta(selectedVendor.category, selectedVendor.subCategory).color}`}>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-[#1A2633] via-[#1A2633]/50 to-transparent"></div>

                                {/* Header Content */}
                                <div className="absolute bottom-0 left-0 right-0 p-6 z-10 flex items-end justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`size-20 rounded-2xl flex items-center justify-center shadow-2xl rotate-3 border-4 border-[#1A2633] ${getCategoryMeta(selectedVendor.category, selectedVendor.subCategory).color}`}>
                                            <span className="material-symbols-outlined text-4xl">{getCategoryMeta(selectedVendor.category, selectedVendor.subCategory).icon}</span>
                                        </div>
                                        <div className="mb-1">
                                            <h2 className="text-3xl font-black text-white tracking-tight shadow-black drop-shadow-md">{selectedVendor.name}</h2>
                                            <div className="flex items-center gap-3 text-white/80 text-sm font-medium">
                                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">location_on</span> {selectedVendor.location}</span>
                                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px] text-yellow-400 fill">star</span> {selectedVendor.rating}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedVendorId(null)} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors mb-4"><span className="material-symbols-outlined text-[24px]">close</span></button>
                                </div>
                            </div>

                            {/* Sticky Tabs */}
                            <div className="flex-shrink-0 bg-white dark:bg-[#1A2633] border-b border-slate-200 dark:border-slate-800 z-20 px-6 pt-2 pb-0">
                                <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
                                    {['Overview', 'Services', 'Financials', 'Documents', 'Settings'].map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab as any)}
                                            className={`py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Scrollable Drawer Content */}
                            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-[#0B1116] relative">

                                {/* OVERVIEW TAB */}
                                {activeTab === 'Overview' && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">

                                        {/* Performance Scorecard */}
                                        <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl text-white shadow-lg border border-slate-700 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl"></div>
                                            <div className="flex justify-between items-start mb-6 relative z-10">
                                                <div>
                                                    <h4 className="text-lg font-black tracking-tight">Vendor Health Score</h4>
                                                    <p className="text-xs text-slate-400 opacity-80 mt-1">Calculated based on feedback & fulfillment.</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-4xl font-black text-green-400 tracking-tighter">{(selectedVendor.rating * 20).toFixed(0)}</span>
                                                    <span className="text-sm text-white/50 font-bold block -mt-1">/100</span>
                                                </div>
                                            </div>
                                            <div className="space-y-4 relative z-10">
                                                {[
                                                    { label: 'Quality', val: selectedVendor.rating * 20, color: 'bg-blue-500' },
                                                    { label: 'Timeliness', val: 92, color: 'bg-purple-500' },
                                                    { label: 'Value', val: 85, color: 'bg-orange-500' }
                                                ].map((metric, i) => (
                                                    <div key={i}>
                                                        <div className="flex justify-between text-xs font-bold mb-1.5 opacity-90 uppercase tracking-wider">
                                                            <span>{metric.label}</span>
                                                            <span>{metric.val}%</span>
                                                        </div>
                                                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full ${metric.color} transition-all duration-1000`} style={{ width: `${metric.val}%` }}></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1A2633] shadow-sm">
                                                <div className="size-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center mb-3"><span className="material-symbols-outlined text-[18px]">person</span></div>
                                                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Point of Contact</p>
                                                <p className="font-bold text-slate-900 dark:text-white text-sm">{selectedVendor.contactName}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{selectedVendor.contactPhone}</p>
                                            </div>
                                            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1A2633] shadow-sm">
                                                <div className="size-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center mb-3"><span className="material-symbols-outlined text-[18px]">mail</span></div>
                                                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Corporate Email</p>
                                                <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{selectedVendor.contactEmail}</p>
                                                <a href={`mailto:${selectedVendor.contactEmail}`} className="text-[10px] text-primary font-black hover:underline mt-1 block uppercase tracking-wider">Direct Message</a>
                                            </div>
                                        </div>

                                        {/* Internal Notes System */}
                                        <div className="p-5 bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-sm">chat</span> Internal Notes</h4>

                                            <div className="max-h-[200px] overflow-y-auto space-y-3 mb-4 pr-2 scrollbar-thin">
                                                {selectedVendor.notes && selectedVendor.notes.length > 0 ? (
                                                    selectedVendor.notes.map((note, i) => (
                                                        <div key={i} className="flex gap-3 relative group">
                                                            <div className="size-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 shrink-0 mt-2">
                                                                {note.author.charAt(0)}
                                                            </div>
                                                            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-r-xl rounded-bl-xl text-sm border border-slate-100 dark:border-slate-700 flex-1">
                                                                <div className="flex justify-between items-start">
                                                                    <p className="text-xs text-slate-400 mb-1">{note.date} • {note.author}</p>
                                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                                                        <button onClick={() => { setEditingNoteId(note.id); setEditNoteText(note.text); }} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-primary transition-colors">
                                                                            <span className="material-symbols-outlined text-[14px]">edit</span>
                                                                        </button>
                                                                        <button onClick={() => handleDeleteNote(note.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-slate-400 hover:text-red-500 transition-colors">
                                                                            <span className="material-symbols-outlined text-[14px]">delete</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                
                                                                {editingNoteId === note.id ? (
                                                                    <div className="mt-2">
                                                                        <textarea
                                                                            value={editNoteText}
                                                                            onChange={(e) => setEditNoteText(e.target.value)}
                                                                            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                                                                            rows={3}
                                                                        />
                                                                        <div className="flex justify-end gap-2 mt-2">
                                                                            <button onClick={() => setEditingNoteId(null)} className="px-3 py-1 text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
                                                                            <button onClick={() => handleUpdateNote(note.id)} disabled={!editNoteText.trim()} className="px-3 py-1 text-xs font-bold bg-primary text-white hover:bg-primary-dark rounded-lg disabled:opacity-50">Save</button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-slate-700 dark:text-slate-300 leading-snug">{note.text}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-xs text-slate-400 italic text-center py-4">No notes added yet.</p>
                                                )}
                                            </div>

                                            <form onSubmit={handleAddNote} className="relative">
                                                <input
                                                    value={noteText}
                                                    onChange={(e) => setNoteText(e.target.value)}
                                                    placeholder="Add a private note..."
                                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-4 pr-12 text-sm focus:ring-1 focus:ring-primary outline-none"
                                                />
                                                <button type="submit" disabled={!noteText.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50">
                                                    <span className="material-symbols-outlined text-[20px]">send</span>
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                )}

                                {/* SERVICES TAB */}
                                {activeTab === 'Services' && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                        {/* Bulk Pricing */}
                                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/20 flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Bulk Price Adjustment</h4>
                                                <p className="text-xs text-slate-500">Apply inflation or seasonal markup to all services.</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={bulkAdjustPercent}
                                                    onChange={e => setBulkAdjustPercent(Number(e.target.value))}
                                                    className="w-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm font-bold text-center"
                                                    placeholder="%"
                                                />
                                                <button onClick={handleBulkPriceUpdate} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors">Apply %</button>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Live Catalog</h4>
                                                <button onClick={() => setServiceForm({ name: '', unit: 'Per Night', baseCost: 0, markupType: 'Percentage', markupValue: 15 })} className="text-xs font-bold text-primary hover:underline flex items-center gap-1"><span className="material-symbols-outlined text-sm">add</span> Add New</button>
                                            </div>

                                            {selectedVendor.services.length > 0 ? selectedVendor.services.map(service => {
                                                const isEditing = editingServiceId === service.id;
                                                const unitProfit = service.sellingPrice - service.baseCost;
                                                const isInactive = service.status === 'Inactive';

                                                if (isEditing) return (
                                                    <div key={service.id} className="bg-primary/5 border-2 border-primary/30 rounded-2xl p-5 space-y-3 animate-in fade-in duration-200">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Editing Service</span>
                                                            <div className="flex gap-2">
                                                                <button onClick={handleSaveService} className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors">Save</button>
                                                                <button onClick={() => setEditingServiceId(null)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <input
                                                                placeholder="Service Name"
                                                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold focus:ring-1 focus:ring-primary outline-none"
                                                                value={editServiceForm.name || ''}
                                                                onChange={e => setEditServiceForm({ ...editServiceForm, name: e.target.value })}
                                                            />
                                                            <select
                                                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none"
                                                                value={editServiceForm.unit || 'Per Night'}
                                                                onChange={e => setEditServiceForm({ ...editServiceForm, unit: e.target.value })}
                                                            >
                                                                <option>Per Night</option><option>Per Trip</option><option>Per Guest</option><option>Per KM</option>
                                                            </select>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-3">
                                                            <div>
                                                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Base Cost ₹</label>
                                                                <input type="number" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm font-black focus:ring-1 focus:ring-primary outline-none" value={editServiceForm.baseCost ?? ''} onChange={e => setEditServiceForm({ ...editServiceForm, baseCost: parseFloat(e.target.value) || 0 })} />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Markup Type</label>
                                                                <select className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none" value={editServiceForm.markupType || 'Percentage'} onChange={e => setEditServiceForm({ ...editServiceForm, markupType: e.target.value as any })}>
                                                                    <option value="Percentage">% Markup</option><option value="Fixed">₹ Markup</option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Markup Value</label>
                                                                <input type="number" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm font-black focus:ring-1 focus:ring-primary outline-none" value={editServiceForm.markupValue ?? ''} onChange={e => setEditServiceForm({ ...editServiceForm, markupValue: parseFloat(e.target.value) || 0 })} />
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-end gap-1 text-xs text-slate-500 pt-1">
                                                            <span>Selling Price Preview:</span>
                                                            <span className="font-black text-slate-900 dark:text-white">
                                                                ₹{calculatePrice(Number(editServiceForm.baseCost) || 0, (editServiceForm.markupType as any) || 'Percentage', Number(editServiceForm.markupValue) || 0).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );

                                                return (
                                                    <div key={service.id} className={`group flex items-center justify-between p-5 rounded-2xl border transition-all ${isInactive ? 'bg-slate-50 dark:bg-slate-900 border-dashed border-slate-200 dark:border-slate-800 opacity-60' : 'bg-white dark:bg-[#1A2633] border-slate-200 dark:border-slate-800 hover:shadow-md'}`}>
                                                        <div className="flex items-center gap-4">
                                                            <div className={`size-10 rounded-xl flex items-center justify-center ${selectedVendor.category === 'Hotel' ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'}`}>
                                                                <span className="material-symbols-outlined text-xl">{selectedVendor.category === 'Hotel' ? 'bed' : 'directions_car'}</span>
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-bold text-slate-900 dark:text-white text-sm">{service.name}</p>
                                                                    {isInactive && <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-500 rounded">Inactive</span>}
                                                                </div>
                                                                <p className="text-[11px] text-slate-500 font-medium">{service.unit} • ₹{service.baseCost.toLocaleString()}{getUnitSuffix(service.unit)}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-6">
                                                            <div className="text-right hidden sm:block">
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Net Profit</p>
                                                                <p className="font-black text-green-600 text-xs">+₹{unitProfit.toLocaleString()}</p>
                                                            </div>
                                                            <div className="text-right pl-6 border-l border-slate-100 dark:border-slate-800">
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Selling Price</p>
                                                                <p className="font-black text-slate-900 dark:text-white">₹{service.sellingPrice.toLocaleString()}<span className="text-[10px] font-medium text-slate-400">{getUnitSuffix(service.unit)}</span></p>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() => toggleServiceStatus(service.id)}
                                                                    className={`p-2 rounded-lg transition-colors ${isInactive ? 'text-slate-400 hover:text-green-600 hover:bg-green-50' : 'text-green-600 hover:text-slate-400 hover:bg-slate-100'}`}
                                                                    title={isInactive ? 'Activate Service' : 'Deactivate Service'}
                                                                >
                                                                    <span className="material-symbols-outlined text-[20px]">{isInactive ? 'toggle_off' : 'toggle_on'}</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleStartEditService(service)}
                                                                    className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                                                    title="Edit Service"
                                                                >
                                                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                                                </button>
                                                                <button onClick={() => handleDeleteService(service.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors" title="Delete Service"><span className="material-symbols-outlined text-[20px]">delete</span></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }) : (
                                                <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-transparent">
                                                    <span className="material-symbols-outlined text-4xl text-slate-200 mb-2">inventory_2</span>
                                                    <p className="text-slate-400 text-sm font-medium italic">No services listed yet.</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Pricing Engine */}
                                        <div className="bg-slate-900 dark:bg-black p-6 rounded-[2rem] shadow-2xl relative overflow-hidden border border-white/5">
                                            <div className="relative z-10">
                                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-sm">add_circle</span> Add New Service
                                                </h3>
                                                <div className="grid grid-cols-2 gap-4 mb-4">
                                                    <input placeholder="Service Name" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-slate-600 focus:ring-1 focus:ring-primary outline-none" value={serviceForm.name} onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })} />
                                                    <select className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:ring-1 focus:ring-primary outline-none appearance-none" value={serviceForm.unit} onChange={e => setServiceForm({ ...serviceForm, unit: e.target.value })}>
                                                        <option className="bg-slate-900">Per Night</option><option className="bg-slate-900">Per Trip</option><option className="bg-slate-900">Per Guest</option><option className="bg-slate-900">Per KM</option>
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4 mb-6">
                                                    <input type="number" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-black text-white" value={serviceForm.baseCost || ''} onChange={e => setServiceForm({ ...serviceForm, baseCost: parseFloat(e.target.value) || 0 })} placeholder={getCostPlaceholder(serviceForm.unit || 'Per Night')} />
                                                    <select className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white" value={serviceForm.markupType} onChange={e => setServiceForm({ ...serviceForm, markupType: e.target.value as any })}>
                                                        <option value="Percentage" className="bg-slate-900">% Markup</option><option value="Fixed" className="bg-slate-900">₹ Markup</option>
                                                    </select>
                                                    <input type="number" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-black text-white" value={serviceForm.markupValue} onChange={e => setServiceForm({ ...serviceForm, markupValue: parseFloat(e.target.value) || 0 })} />
                                                </div>

                                                {/* Per KM Estimated Distance Calculator */}
                                                {serviceForm.unit === 'Per KM' && currentSellingPrice > 0 && (
                                                    <div className="mb-4 p-4 bg-white/5 border border-white/10 rounded-xl">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-sm">straighten</span> Distance Estimator
                                                        </p>
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="number"
                                                                className="w-28 bg-white/5 border border-white/10 rounded-lg p-2 text-sm font-bold text-white text-center"
                                                                placeholder="KMs"
                                                                id="estimatedKm"
                                                                onChange={(e) => {
                                                                    const km = parseFloat(e.target.value) || 0;
                                                                    const el = document.getElementById('estimatedTotal');
                                                                    if (el) el.textContent = `₹${(km * currentSellingPrice).toLocaleString()}`;
                                                                }}
                                                            />
                                                            <span className="text-slate-500 text-xs">×</span>
                                                            <span className="text-white text-sm font-bold">₹{currentSellingPrice.toLocaleString()}/km</span>
                                                            <span className="text-slate-500 text-xs">=</span>
                                                            <span id="estimatedTotal" className="text-lg font-black text-green-400">₹0</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Pricing Preview */}
                                                {serviceForm.baseCost ? (
                                                    <div className="mb-4 flex items-center justify-between px-1 text-xs">
                                                        <span className="text-slate-500">Selling: <span className="text-white font-black">₹{currentSellingPrice.toLocaleString()}{getUnitSuffix(serviceForm.unit || '')}</span></span>
                                                        <span className="text-green-400 font-bold">Profit: +₹{currentProfit.toLocaleString()}{getUnitSuffix(serviceForm.unit || '')}</span>
                                                    </div>
                                                ) : null}

                                                <button onClick={handleAddService} className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all">Add to Catalog</button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* FINANCIALS TAB */}
                                {activeTab === 'Financials' && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8 rounded-[2rem] shadow-2xl relative overflow-hidden flex flex-col justify-between h-56 border border-white/5">
                                            <div className="relative z-10 flex justify-between items-start">
                                                <div>
                                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Total Outstanding Balance</p>
                                                    <h3 className="text-5xl font-black tracking-tighter">₹{selectedVendor.balanceDue.toLocaleString()}</h3>
                                                </div>
                                                <div className="size-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/10">
                                                    <span className="material-symbols-outlined">account_balance_wallet</span>
                                                </div>
                                            </div>
                                            <div className="relative z-10">
                                                <button
                                                    onClick={() => setIsPaymentModalOpen(true)}
                                                    disabled={selectedVendor.balanceDue <= 0}
                                                    className="w-full py-4 bg-white text-slate-900 text-xs font-black uppercase tracking-[0.2em] rounded-xl shadow-lg hover:bg-slate-50 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Process Payout
                                                </button>
                                            </div>
                                        </div>

                                        {selectedVendor.bankDetails && (
                                            <div className="p-6 bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                                                <div className="flex justify-between items-center mb-5">
                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2"><span className="material-symbols-outlined text-sm">account_balance</span> Settlement Destination</h4>
                                                    <button onClick={() => handleOpenEdit(selectedVendor)} className="text-[10px] font-black text-primary hover:underline">Manage Accounts</button>
                                                </div>
                                                <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Bank Account</p>
                                                        <p className="text-sm font-mono font-bold text-slate-900 dark:text-white">{selectedVendor.bankDetails.accountNumber || '---'}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Bank Name</p>
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedVendor.bankDetails.bankName || '---'}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">IFSC Routing</p>
                                                        <p className="text-sm font-mono font-bold text-slate-900 dark:text-white">{selectedVendor.bankDetails.ifsc || '---'}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Beneficiary</p>
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedVendor.bankDetails.accountName || '---'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 ml-1">Ledger Timeline</h3>
                                            <div className="space-y-4">
                                                {selectedVendor.transactions && selectedVendor.transactions.length > 0 ? selectedVendor.transactions.map((tx) => (
                                                    <div key={tx.id} className="group bg-white dark:bg-[#1A2633] p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`size-10 rounded-full flex items-center justify-center ${tx.type === 'Credit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                                <span className="material-symbols-outlined text-lg">{tx.type === 'Credit' ? 'south_west' : 'north_east'}</span>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{tx.description}</p>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{tx.date}</span>
                                                                    {tx.reference && <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{tx.reference}</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <span className={`text-sm font-black ${tx.type === 'Credit' ? 'text-green-600' : 'text-red-500'}`}>
                                                            {tx.type === 'Credit' ? '+' : '-'} ₹{tx.amount.toLocaleString()}
                                                        </span>
                                                    </div>
                                                )) : (
                                                    <div className="text-center py-8 opacity-30 italic text-sm">No transaction records found.</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* DOCUMENTS TAB */}
                                {activeTab === 'Documents' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Vault & Compliance</h3>
                                            <button onClick={() => setIsDocModalOpen(true)} className="text-[10px] font-black uppercase tracking-[0.2em] text-white bg-slate-900 dark:bg-white dark:text-slate-900 px-4 py-2 rounded-full hover:opacity-90 shadow-lg">
                                                New Document
                                            </button>
                                        </div>

                                        {selectedVendor.documents.length > 0 ? (
                                            <div className="grid grid-cols-2 gap-4">
                                                {selectedVendor.documents.map(doc => (
                                                    <div key={doc.id} className="group relative p-5 bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-2xl hover:shadow-xl transition-all flex flex-col gap-4">
                                                        <div className="flex justify-between items-start">
                                                            <div className={`size-12 rounded-xl flex items-center justify-center ${doc.status === 'Valid' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' : 'bg-red-50 text-red-600 dark:bg-red-900/20'}`}>
                                                                <span className="material-symbols-outlined text-2xl">{getDocIcon(doc.type)}</span>
                                                            </div>
                                                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${doc.status === 'Valid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                {doc.status}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">{doc.name}</p>
                                                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Exp: {doc.expiryDate || 'N/A'}</p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <a href={doc.url !== '#' ? doc.url : undefined} target="_blank" rel="noopener noreferrer" download={doc.url.startsWith('data:') ? doc.name : undefined} className={`flex-1 py-2 text-center text-[10px] font-black uppercase rounded-lg transition-colors ${doc.url && doc.url !== '#' ? 'bg-slate-50 dark:bg-slate-800 hover:bg-primary hover:text-white cursor-pointer' : 'bg-slate-50 dark:bg-slate-800 text-slate-300 cursor-not-allowed'}`}>View</a>
                                                            <button onClick={() => {
                                                                if (confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
                                                                    deleteVendorDocument(selectedVendor.id, doc.id);
                                                                }
                                                            }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] bg-white dark:bg-transparent">
                                                <span className="material-symbols-outlined text-5xl text-slate-200 mb-3">folder_open</span>
                                                <p className="text-slate-400 text-sm font-medium italic">Document vault is empty.</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* SETTINGS TAB */}
                                {activeTab === 'Settings' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1A2633] shadow-sm flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white text-sm">Contract Management</p>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Status: <span className={`font-bold ${selectedVendor.contractStatus === 'Active' ? 'text-green-600' : 'text-orange-500'}`}>{selectedVendor.contractStatus}</span> •
                                                    Expires: {selectedVendor.contractExpiryDate || 'N/A'}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={handleRenewContract} className="px-5 py-2 bg-green-50 text-green-700 border border-green-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-100 transition-all flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">autorenew</span> Renew
                                                </button>
                                                <button onClick={() => handleOpenEdit(selectedVendor)} className="px-5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all">Edit Profile</button>
                                            </div>
                                        </div>
                                        <div className="p-8 rounded-[2rem] border border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/10">
                                            <h4 className="text-sm font-black text-red-700 dark:text-red-400 mb-2 uppercase tracking-widest">Danger Zone</h4>
                                            <p className="text-xs text-slate-500 mb-6 leading-relaxed">Deleting this vendor will permanently erase all history, services, and outstanding balances. Ensure all payouts are settled first.</p>
                                            <button onClick={() => { if (confirm('Are you absolutely sure? This cannot be undone.')) { deleteVendor(selectedVendor.id); setSelectedVendorId(null); showToast('Vendor deleted.'); } }} className="w-full py-4 bg-red-600 text-white text-xs font-black uppercase tracking-[0.2em] rounded-xl hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 active:scale-[0.98]">Revoke Onboarding</button>
                                        </div>
                                    </div>
                                )}

                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Modal Components */}
            {/* Create / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A2633] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 max-h-[90vh] overflow-hidden">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{modalMode} Vendor</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <form onSubmit={handleVendorSubmit} className="p-6 space-y-6 overflow-y-auto">
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Basic Information</h3>
                                <div className="flex justify-center mb-4">
                                    <div className={`size-16 rounded-2xl flex items-center justify-center shadow-md ${getCategoryMeta(vendorForm.category || 'Hotel', vendorForm.subCategory).color}`}>
                                        <span className="material-symbols-outlined text-4xl">{getCategoryMeta(vendorForm.category || 'Hotel', vendorForm.subCategory).icon}</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Vendor Name</label>
                                        <input required placeholder="Vendor Name" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-primary" value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Category</label>
                                        <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-primary" value={vendorForm.category} onChange={e => setVendorForm({ ...vendorForm, category: e.target.value as any, subCategory: undefined })}>
                                            <option>Hotel</option><option>Transport</option><option>DMC</option><option>Guide</option><option>Activity</option>
                                        </select>
                                    </div>
                                </div>
                                {vendorForm.category === 'Transport' && (
                                    <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Transport Type</label>
                                        <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-primary" value={vendorForm.subCategory || ''} onChange={e => setVendorForm({ ...vendorForm, subCategory: e.target.value as any })}>
                                            <option value="" disabled>Select Type</option>
                                            <option>Flight</option><option>Bus</option><option>Taxi/Cab</option><option>Other</option>
                                        </select>
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Location</label>
                                    <input required placeholder="Location" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-primary" value={vendorForm.location} onChange={e => setVendorForm({ ...vendorForm, location: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Contact Person</label>
                                        <input required placeholder="Contact Person" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-primary" value={vendorForm.contactName} onChange={e => setVendorForm({ ...vendorForm, contactName: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Phone</label>
                                        <input required placeholder="Phone" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-primary" value={vendorForm.contactPhone} onChange={e => setVendorForm({ ...vendorForm, contactPhone: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Work Email</label>
                                    <input required placeholder="Email" type="email" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-primary" value={vendorForm.contactEmail} onChange={e => setVendorForm({ ...vendorForm, contactEmail: e.target.value })} />
                                </div>
                            </div>

                            {/* Bank Details Section */}
                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Settlement & Banking</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Account Holder Name</label>
                                        <input required placeholder="e.g. Acme Hospitality Pvt Ltd" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-primary" value={vendorForm.bankDetails?.accountName} onChange={e => updateBankDetails('accountName', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Account Number</label>
                                        <input required placeholder="Enter A/C Number" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-primary font-mono" value={vendorForm.bankDetails?.accountNumber} onChange={e => updateBankDetails('accountNumber', e.target.value)} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Bank Name</label>
                                        <input required placeholder="e.g. HDFC Bank" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-primary" value={vendorForm.bankDetails?.bankName} onChange={e => updateBankDetails('bankName', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">IFSC Code</label>
                                        <input required placeholder="HDFC0001234" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-primary font-mono uppercase" value={vendorForm.bankDetails?.ifsc} onChange={e => updateBankDetails('ifsc', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary-dark transition-all active:scale-[0.98]">
                                {modalMode === 'Create' ? 'Complete Onboarding' : 'Save Profile Changes'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {isPaymentModalOpen && selectedVendor && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A2633] w-full max-w-sm rounded-2xl shadow-2xl animate-in zoom-in-95">
                        <div className="p-6 text-center">
                            <div className="size-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-3xl">payments</span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Record Payout</h3>
                            <p className="text-sm text-slate-500 mb-6">Recording payment for {selectedVendor.name}</p>
                            <form onSubmit={handlePaymentSubmit} className="space-y-4 text-left">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Amount (₹)</label>
                                    <input autoFocus type="number" required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 font-bold focus:ring-2 focus:ring-primary outline-none" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} max={selectedVendor.balanceDue} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Reference / UTR</label>
                                    <input type="text" required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-primary outline-none" value={paymentForm.reference} onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })} placeholder="e.g. UTR-123456" />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700">Cancel</button>
                                    <button type="submit" className="flex-1 py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-lg shadow-green-600/20">Confirm</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Document Upload Modal */}
            {isDocModalOpen && selectedVendor && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A2633] w-full max-w-sm rounded-2xl shadow-2xl animate-in zoom-in-95">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Upload Document</h3>
                            <p className="text-xs text-slate-400 mb-4">Attaching to <span className="font-bold text-slate-600 dark:text-slate-300">{selectedVendor.name}</span></p>
                            <form onSubmit={handleAddDocument} className="space-y-4">
                                {/* File Picker */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Select File *</label>
                                    <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${docForm.url
                                        ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                                        : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 hover:border-primary hover:bg-primary/5'
                                        }`}>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
                                            onChange={handleDocFileChange}
                                        />
                                        {docForm.url ? (
                                            <>
                                                <span className="material-symbols-outlined text-3xl text-green-500 mb-1">check_circle</span>
                                                <span className="text-xs font-bold text-green-600 dark:text-green-400">File attached — click to change</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-3xl text-slate-400 mb-1">upload_file</span>
                                                <span className="text-xs text-slate-500">Click to browse</span>
                                                <span className="text-[10px] text-slate-400 mt-0.5">PDF, DOC, JPG, PNG, XLS</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Document Type</label>
                                    <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm outline-none" value={docForm.type} onChange={e => setDocForm({ ...docForm, type: e.target.value })}>
                                        <option>Contract</option>
                                        <option>License</option>
                                        <option>ID</option>
                                        <option>Insurance</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Document Name</label>
                                        <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm outline-none" placeholder="Auto-filled from file" value={docForm.name} onChange={e => setDocForm({ ...docForm, name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Expiry Date</label>
                                        <input type="date" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm outline-none" value={docForm.expiry} onChange={e => setDocForm({ ...docForm, expiry: e.target.value })} />
                                    </div>
                                </div>
                                <div className="pt-2 flex justify-end gap-2">
                                    <button type="button" onClick={() => { setIsDocModalOpen(false); setDocForm({ type: 'Contract', expiry: '', name: '', url: '' }); }} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
                                    <button type="submit" disabled={!docForm.url} className="px-5 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all">Upload</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Email Modal */}
            <VendorBulkEmailModal
                isOpen={isBulkEmailModalOpen}
                onClose={() => setIsBulkEmailModalOpen(false)}
                selectedVendorCount={selectedIds.size}
                onSend={handleSendBulkEmail}
            />
        </div>
    );
};
