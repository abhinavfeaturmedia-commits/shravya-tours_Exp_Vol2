import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useData } from '../../context/DataContext';
import { Coupon } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { downloadCouponAsImage, downloadCouponAsPDF } from '../../utils/couponDownloader';

export const CouponManager: React.FC = () => {
  const { coupons, bookings, addCoupon, updateCoupon, deleteCoupon, applyCoupon } = useData();

  // Form State
  const [form, setForm] = useState<Partial<Coupon>>({
    code: '',
    type: 'ToursOnly',
    discountType: 'Percentage',
    discountValue: 10,
    minBookingAmount: 0,
    validFrom: new Date().toISOString().split('T')[0],
    validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'Active',
    isUsed: false,
    useCount: 0
  });

  // Editor and Modals state
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Apply Coupon Modal State
  const [selectedCouponToApply, setSelectedCouponToApply] = useState<Coupon | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [isSubmittingApply, setIsSubmittingApply] = useState(false);
  const [applySearchQuery, setApplySearchQuery] = useState('');

  // Download state
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null); // ref attached to the live preview card

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'ToursOnly' | 'MultiCategory'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive' | 'Expired'>('All');
  const [usageFilter, setUsageFilter] = useState<'All' | 'Used' | 'Unused'>('All');

  // --- KPI Computations ---
  const kpis = useMemo(() => {
    const total = coupons.length;
    const active = coupons.filter(c => c.status === 'Active').length;
    const used = coupons.filter(c => c.isUsed).length;
    const toursCount = coupons.filter(c => c.type === 'ToursOnly').length;
    const multiCount = coupons.filter(c => c.type === 'MultiCategory').length;
    return { total, active, used, toursCount, multiCount };
  }, [coupons]);

  // --- Alphanumeric Unique Code Generator ---
  const generateUniqueCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codeLength = 4;
    let generatedCode = '';
    const prefix = form.type === 'ToursOnly' ? 'SHRAW-TOUR-' : 'SHRAW-PASS-';
    
    // Safety check loop to ensure no local replica
    let attempts = 0;
    while (attempts < 100) {
      let suffix = '';
      for (let i = 0; i < codeLength; i++) {
        suffix += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      generatedCode = `${prefix}${suffix}`;
      
      // Check for uniqueness in existing state
      const isDuplicate = coupons.some(c => c.code.toLowerCase() === generatedCode.toLowerCase());
      if (!isDuplicate) {
        break;
      }
      attempts++;
    }

    setForm(prev => ({ ...prev, code: generatedCode }));
    toast.success(`Unique Code Generated: ${generatedCode}`);
  };

  // --- Filter Logic ---
  const filteredCoupons = useMemo(() => {
    return coupons.filter(c => {
      const matchSearch = c.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = typeFilter === 'All' || c.type === typeFilter;
      const matchStatus = statusFilter === 'All' || c.status === statusFilter;
      
      let matchUsage = true;
      if (usageFilter === 'Used') matchUsage = c.isUsed;
      else if (usageFilter === 'Unused') matchUsage = !c.isUsed;

      return matchSearch && matchType && matchStatus && matchUsage;
    });
  }, [coupons, searchQuery, typeFilter, statusFilter, usageFilter]);

  // --- Handlers ---
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.code || !form.code.trim()) {
      toast.error('Coupon code is required');
      return;
    }
    if (Number(form.discountValue) <= 0) {
      toast.error('Discount value must be greater than 0');
      return;
    }

    // Check duplicate manually for inserts
    if (!isEditing) {
      const isDuplicate = coupons.some(c => c.code.toLowerCase() === form.code?.toLowerCase());
      if (isDuplicate) {
        toast.error(`Coupon code ${form.code} already exists! Use the generate button for unique codes.`);
        return;
      }
    }

    try {
      if (isEditing && editingId) {
        await updateCoupon(editingId, {
          code: form.code,
          type: form.type,
          discountType: form.discountType,
          discountValue: Number(form.discountValue),
          minBookingAmount: Number(form.minBookingAmount || 0),
          validFrom: form.validFrom,
          validTo: form.validTo,
          status: form.status,
          isUsed: form.isUsed,
          useCount: form.useCount
        });
        toast.success(`Coupon ${form.code} updated successfully`);
        resetForm();
      } else {
        const newCoupon: Coupon = {
          id: uuidv4(),
          code: form.code.trim().toUpperCase(),
          type: form.type || 'ToursOnly',
          discountType: form.discountType || 'Percentage',
          discountValue: Number(form.discountValue),
          minBookingAmount: Number(form.minBookingAmount || 0),
          validFrom: form.validFrom,
          validTo: form.validTo,
          status: form.status || 'Active',
          isUsed: form.isUsed || false,
          useCount: 0
        };
        await addCoupon(newCoupon);
        resetForm();
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleEditClick = (c: Coupon) => {
    setForm({
      code: c.code,
      type: c.type,
      discountType: c.discountType,
      discountValue: c.discountValue,
      minBookingAmount: c.minBookingAmount,
      validFrom: c.validFrom,
      validTo: c.validTo,
      status: c.status,
      isUsed: c.isUsed,
      useCount: c.useCount
    });
    setEditingId(c.id);
    setIsEditing(true);
    toast.info(`Editing Coupon: ${c.code}`);
  };

  const handleDeleteClick = async (c: Coupon) => {
    if (window.confirm(`Are you sure you want to permanently delete coupon ${c.code}?`)) {
      try {
        await deleteCoupon(c.id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleToggleUsed = async (c: Coupon) => {
    try {
      const newUsedStatus = !c.isUsed;
      const newUseCount = newUsedStatus ? c.useCount + 1 : Math.max(0, c.useCount - 1);
      
      await updateCoupon(c.id, { 
        isUsed: newUsedStatus,
        useCount: newUseCount
      });
      
      toast.success(`Coupon ${c.code} marked as ${newUsedStatus ? 'USED' : 'UNUSED'}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update coupon usage');
    }
  };

  const resetForm = () => {
    setForm({
      code: '',
      type: 'ToursOnly',
      discountType: 'Percentage',
      discountValue: 10,
      minBookingAmount: 0,
      validFrom: new Date().toISOString().split('T')[0],
      validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Active',
      isUsed: false,
      useCount: 0
    });
    setIsEditing(false);
    setEditingId(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied to clipboard: ${text}`);
  };

  // ─── Download Handlers ────────────────────────────────────────────────────
  // PNG download: always uses clean off-screen render (null forces getCouponHtml path, avoids scale artifacts)
  const handleDownloadPreviewImage = useCallback(async () => {
    const fakeCoupon: Coupon = {
      id: editingId || 'preview',
      code: form.code || 'PREVIEW',
      type: form.type || 'ToursOnly',
      discountType: form.discountType || 'Percentage',
      discountValue: Number(form.discountValue) || 10,
      minBookingAmount: Number(form.minBookingAmount) || 0,
      validFrom: form.validFrom,
      validTo: form.validTo,
      status: form.status || 'Active',
      isUsed: form.isUsed || false,
      useCount: form.useCount || 0,
      downloadCount: 0,
    };
    setDownloadingId('preview');
    try {
      await downloadCouponAsImage(fakeCoupon, null); // null = use clean off-screen 880×375 renderer
      toast.success(`Coupon image saved as PNG!`);
    } catch (e) {
      toast.error('Image download failed. Try PDF instead.');
    } finally {
      setDownloadingId(null);
    }
  }, [form, editingId]);

  // PDF download from preview panel (uses current form state)
  const handleDownloadPreviewPDF = useCallback(async () => {
    const fakeCoupon: Coupon = {
      id: editingId || 'preview',
      code: form.code || 'PREVIEW',
      type: form.type || 'ToursOnly',
      discountType: form.discountType || 'Percentage',
      discountValue: Number(form.discountValue) || 10,
      minBookingAmount: Number(form.minBookingAmount) || 0,
      validFrom: form.validFrom,
      validTo: form.validTo,
      status: form.status || 'Active',
      isUsed: form.isUsed || false,
      useCount: form.useCount || 0,
      downloadCount: 0,
    };
    setDownloadingId('preview-pdf');
    try {
      await downloadCouponAsPDF(fakeCoupon);
      toast.success(`Coupon PDF downloaded!`);
    } catch (e) {
      toast.error('PDF generation failed.');
    } finally {
      setDownloadingId(null);
    }
  }, [form, editingId]);

  // PDF download from table row (uses saved coupon data)
  const handleRowDownloadPDF = useCallback(async (c: Coupon) => {
    setDownloadingId(c.id + '-pdf');
    try {
      await downloadCouponAsPDF(c);
      // Optimistically update downloadCount in local state
      await updateCoupon(c.id, { downloadCount: (c.downloadCount || 0) + 1 });
      toast.success(`PDF for ${c.code} downloaded!`);
    } catch (e) {
      toast.error('PDF download failed.');
    } finally {
      setDownloadingId(null);
    }
  }, [updateCoupon]);

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-[32px] text-primary">local_offer</span>
            <span className="font-display">Coupon Manager</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Design, generate and track promotional discounts and transport vouchers.</p>
        </div>
      </div>

      {/* KPI Stats Board */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-[#151d29] p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 group hover:shadow-md transition-shadow">
          <div className="size-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
            <span className="material-symbols-outlined">confirmation_number</span>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider">Total Coupons</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{kpis.total}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#151d29] p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 group hover:shadow-md transition-shadow">
          <div className="size-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md">
            <span className="material-symbols-outlined">verified</span>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider">Active Promo</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{kpis.active}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#151d29] p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 group hover:shadow-md transition-shadow">
          <div className="size-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md">
            <span className="material-symbols-outlined">payments</span>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider">Used Coupons</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{kpis.used}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#151d29] p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 group hover:shadow-md transition-shadow">
          <div className="size-12 rounded-xl bg-gradient-to-br from-[#1E3E3F] to-[#2D5A5B] flex items-center justify-center text-white shadow-md">
            <span className="material-symbols-outlined">tour</span>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider">Tours Only</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{kpis.toursCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#151d29] p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 group hover:shadow-md transition-shadow">
          <div className="size-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-md">
            <span className="material-symbols-outlined">flight_takeoff</span>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider">Multi-Category</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{kpis.multiCount}</p>
          </div>
        </div>
      </div>

      {/* Split Layout: Creator Form & Live Interactive Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Side: Coupon Form Editor (7 cols) */}
        <div className="xl:col-span-7 bg-white dark:bg-[#151d29] rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 md:p-8 flex flex-col justify-between shadow-sm">
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">edit_square</span>
                {isEditing ? 'Edit Coupon Settings' : 'Create New Promotion'}
              </h2>
              {isEditing && (
                <button onClick={resetForm} className="text-xs font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                  <span className="material-symbols-outlined text-sm">cancel</span>
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSaveCoupon} className="space-y-6">
              
              {/* Category selector */}
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Coupon Design & Category Type</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, type: 'ToursOnly', code: p.code?.startsWith('SHRAW-PASS-') ? 'SHRAW-TOUR-' : p.code }))}
                    className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${
                      form.type === 'ToursOnly'
                        ? 'border-teal-500 bg-teal-50/20 dark:bg-teal-900/10 shadow-sm'
                        : 'border-slate-150 dark:border-slate-800 bg-slate-50/50 hover:bg-slate-50 dark:bg-transparent'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-2xl ${form.type === 'ToursOnly' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`}>tour</span>
                    <div>
                      <span className="block font-bold text-sm text-slate-900 dark:text-white">Tours Exclusive Voucher</span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Classic ticket stub, Tours Only</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, type: 'MultiCategory', code: p.code?.startsWith('SHRAW-TOUR-') ? 'SHRAW-PASS-' : p.code }))}
                    className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${
                      form.type === 'MultiCategory'
                        ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-900/10 shadow-sm'
                        : 'border-slate-150 dark:border-slate-800 bg-slate-50/50 hover:bg-slate-50 dark:bg-transparent'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-2xl ${form.type === 'MultiCategory' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>flight_takeoff</span>
                    <div>
                      <span className="block font-bold text-sm text-slate-900 dark:text-white">Multi-Category Pass</span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Neon transit pass, Cab/Train/Flight/Tours</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Code input with Generator */}
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Coupon Code</label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined">password</span>
                    <input
                      type="text"
                      placeholder="e.g. SAVE20, SHRAW-TOUR-XYZ"
                      className="w-full h-12 pl-12 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-150 dark:border-slate-800 focus:ring-2 focus:ring-primary/20 text-sm font-bold uppercase tracking-widest text-slate-900 dark:text-white outline-none"
                      value={form.code || ''}
                      onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase().replace(/\s+/g, '') }))}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={generateUniqueCode}
                    className="h-12 px-5 bg-slate-900 dark:bg-slate-800 text-white rounded-xl font-bold text-xs hover:bg-slate-800 dark:hover:bg-slate-700 transition-all flex items-center gap-2 border border-slate-700 active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-[18px] text-purple-400 animate-pulse">lock_reset</span>
                    Generate Unique
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1.5 ml-1">Every generated code is cryptographically unique and replication-safe.</p>
              </div>

              {/* Pricing details and discount type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Discount type toggle */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Discount Unit</label>
                  <div className="flex bg-slate-100 dark:bg-slate-850 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setForm(p => ({ ...p, discountType: 'Percentage', discountValue: Math.min(100, p.discountValue || 10) }))}
                      className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
                        form.discountType === 'Percentage'
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-extrabold'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      Percentage (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(p => ({ ...p, discountType: 'Price' }))}
                      className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
                        form.discountType === 'Price'
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-extrabold'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      Flat Price (₹)
                    </button>
                  </div>
                </div>

                {/* Discount value input */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Discount Value</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      {form.discountType === 'Percentage' ? '%' : '₹'}
                    </span>
                    <input
                      type="number"
                      min="1"
                      max={form.discountType === 'Percentage' ? '100' : undefined}
                      className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-150 dark:border-slate-800 focus:ring-2 focus:ring-primary/20 text-sm font-bold text-slate-900 dark:text-white outline-none"
                      value={form.discountValue || ''}
                      onChange={e => {
                        let val = Number(e.target.value);
                        if (form.discountType === 'Percentage') val = Math.min(100, Math.max(0, val));
                        setForm(p => ({ ...p, discountValue: val }));
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Minimum criteria & validity range */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Min booking amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Min Booking Required (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 5000"
                    className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-150 dark:border-slate-800 focus:ring-2 focus:ring-primary/20 text-sm font-semibold text-slate-900 dark:text-white outline-none"
                    value={form.minBookingAmount || ''}
                    onChange={e => setForm(p => ({ ...p, minBookingAmount: Number(e.target.value) }))}
                  />
                </div>

                {/* Valid From */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Valid From</label>
                  <input
                    type="date"
                    className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-150 dark:border-slate-800 focus:ring-2 focus:ring-primary/20 text-sm font-semibold text-slate-900 dark:text-white outline-none"
                    value={form.validFrom || ''}
                    onChange={e => setForm(p => ({ ...p, validFrom: e.target.value }))}
                  />
                </div>

                {/* Valid To */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Valid Until</label>
                  <input
                    type="date"
                    className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-150 dark:border-slate-800 focus:ring-2 focus:ring-primary/20 text-sm font-semibold text-slate-900 dark:text-white outline-none"
                    value={form.validTo || ''}
                    onChange={e => setForm(p => ({ ...p, validTo: e.target.value }))}
                  />
                </div>
              </div>

              {/* Status and Usage flags */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Status</label>
                  <select
                    className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-150 dark:border-slate-800 focus:ring-2 focus:ring-primary/20 text-sm font-bold text-slate-900 dark:text-white outline-none"
                    value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))}
                  >
                    <option value="Active">Active (Publish)</option>
                    <option value="Inactive">Inactive (Draft)</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>

                {/* Used toggle indicator (for edit options or default settings) */}
                <div className="md:col-span-2 flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-850/50 border border-slate-150 dark:border-slate-800/60 mt-1">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Coupon Usage Lock</span>
                    <span className="text-[10px] text-slate-400">Lock coupon instantly as used (stops applications)</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={!!form.isUsed}
                      onChange={e => setForm(p => ({ ...p, isUsed: e.target.checked }))}
                    />
                    <div className="w-11 h-6 bg-slate-300 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500" />
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="submit"
                  className="flex-1 h-12 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  <span className="material-symbols-outlined text-[20px]">{isEditing ? 'save' : 'add_circle'}</span>
                  {isEditing ? 'Save Changes' : 'Create & Save Promo'}
                </button>
                {isEditing && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 h-12 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-[0.99]"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Right Side: Live Interactive Ticket Preview (5 cols) */}
        <div className="xl:col-span-5 flex flex-col gap-6 justify-start items-center">
          <div className="w-full text-center xl:text-left">
            <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Live Voucher Render Preview</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">This demonstrates how the coupon behaves when generated or printed.</p>
          </div>

          {/* Interactive Card Rendering — ref attached for html2canvas capture */}
          <div className="w-full flex justify-center items-center overflow-hidden py-4 select-none">
            <div className="origin-center scale-[0.45] sm:scale-[0.55] md:scale-[0.65] lg:scale-[0.75] xl:scale-[0.52] 2xl:scale-[0.68] my-[-100px] sm:my-[-80px] md:my-[-60px] xl:my-[-90px] 2xl:my-[-60px] shrink-0">
              <div ref={previewRef} className="w-[880px] h-[375px] shrink-0 relative flex rounded-[32px] overflow-hidden shadow-2xl bg-white border border-slate-200 font-sans">
                
                {/* Notch cutouts — centered exactly on the 598px boundary (left: 582px, width: 32px) */}
                <div style={{ position: 'absolute', top: '-16px', left: '582px', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', zIndex: 30, boxSizing: 'border-box' }} />
                <div style={{ position: 'absolute', bottom: '-16px', left: '582px', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', zIndex: 30, boxSizing: 'border-box' }} />

                {/* Perforated dashed separator — centered at 598px boundary */}
                <div style={{ position: 'absolute', top: '16px', bottom: '16px', left: '597px', width: '2px', borderLeft: '2px dashed rgba(0,0,0,0.12)', zIndex: 30, pointerEvents: 'none' }} />

                                {form.type === 'ToursOnly' ? (
                  /* ─── TOURS EXCLUSIVE PREMIUM VOUCHER ─── */
                  <>
                    {/* Left Section */}
                    <div style={{ width: '598px', height: '375px', backgroundColor: '#ffffff', position: 'relative', boxSizing: 'border-box', overflow: 'hidden' }}>

                      {/* Dotted Flight Path SVG */}
                      <div style={{ position: 'absolute', top: '35px', right: '25px', pointerEvents: 'none', zIndex: 10 }}>
                        <svg width="192px" height="48px" viewBox="0 0 200 50" style={{ opacity: 0.8 }}>
                          <path d="M10 40 C 60 20, 110 5, 170 25" fill="none" stroke="#024430" strokeWidth={1.8} strokeDasharray="4,4" />
                          <g transform="translate(170, 25) rotate(15) scale(0.9)">
                            <path d="M12,0 L-4,-12 L-2,-3 L-14,0 L-2,3 L-4,12 Z" fill="#024430" />
                          </g>
                        </svg>
                      </div>

                      {/* Header Branding — flex row, no absolute text stacking */}
                      <div style={{ position: 'absolute', left: '32px', top: '32px', height: '48px', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
                        <img src="/logo.png" style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '12px', marginRight: '12px', flexShrink: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <span style={{ fontSize: '20px', fontWeight: 800, color: '#024430', lineHeight: 1.1, letterSpacing: '0.02em', display: 'block' }}>SHRAWELLO</span>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#E65F2B', lineHeight: 1.1, marginTop: '1px', display: 'block' }}>TravelHub</span>
                          <span style={{ fontSize: '7.5px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.15em', textTransform: 'uppercase', lineHeight: 1.1, marginTop: '2px', display: 'block' }}>CORPORATE TRAVEL AND EVENTS —</span>
                        </div>
                      </div>

                      {/* Slogan — flex-column stack, no absolute overlapping */}
                      <div style={{ position: 'absolute', left: '40px', top: '105px', width: '518px', display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '34px', fontWeight: 800, color: '#024430', lineHeight: 1.1, letterSpacing: '-0.01em' }}>EXPLORE MORE.</span>
                        <span style={{ fontSize: '34px', fontWeight: 800, color: '#E65F2B', lineHeight: 1.1, letterSpacing: '-0.01em', marginTop: '1px' }}>PAY LESS.</span>
                        <div style={{ width: '48px', height: '3px', backgroundColor: '#E65F2B', marginTop: '8px' }}></div>
                        <span style={{ fontSize: '15px', fontWeight: 600, color: '#64748b', fontStyle: 'italic', lineHeight: 1.2, marginTop: '6px' }}>Create Memories That Last Forever</span>
                      </div>

                      {/* Category Badges — flex row, space-between */}
                      <div style={{ position: 'absolute', left: '40px', top: '220px', width: '518px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        {[
                          { label: 'Customized Tours', color: '#024430', icon: <svg width="24" height="24" fill="none" stroke="#ffffff" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg> },
                          { label: 'Family Packages', color: '#E65F2B', icon: <svg width="22" height="22" fill="none" stroke="#ffffff" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
                          { label: 'Honeymoon Packages', color: '#024430', icon: <svg width="20" height="20" fill="#ffffff" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg> },
                          { label: 'Group Tours', color: '#E65F2B', icon: <svg width="22" height="22" fill="#ffffff" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg> },
                        ].map((cat, i) => (
                          <div key={i} style={{ width: '110px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                            <div style={{ width: '50px', height: '50px', borderRadius: '25px', backgroundColor: cat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '6px', flexShrink: 0 }}>
                              {cat.icon}
                            </div>
                            <span style={{ fontSize: '9px', fontWeight: 700, color: '#1e293b', lineHeight: 1.1, letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>{cat.label}</span>
                          </div>
                        ))}
                      </div>

                      {/* Bottom Feature Pill Bar — flex space-between */}
                      <div style={{ position: 'absolute', left: '40px', top: '302px', width: '518px', height: '48px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg width="16" height="16" fill="none" stroke="#024430" strokeWidth={2} viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>Best Prices</span>
                            <span style={{ fontSize: '8px', fontWeight: 600, color: '#94a3b8', whiteSpace: 'nowrap', marginTop: '1px' }}>Guaranteed</span>
                          </div>
                        </div>
                        <div style={{ width: '1px', height: '16px', backgroundColor: '#e2e8f0', flexShrink: 0 }}></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg width="16" height="16" fill="none" stroke="#E65F2B" strokeWidth={2} viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18h2a2 2 0 002-2v-3a2 2 0 00-2-2h-2m-12 7h-2a2 2 0 01-2-2v-3a2 2 0 012-2h2m12 5V9a6 6 0 00-12 0v8" /></svg>
                          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>24/7 Support</span>
                            <span style={{ fontSize: '8px', fontWeight: 600, color: '#94a3b8', whiteSpace: 'nowrap', marginTop: '1px' }}>We're Always Here</span>
                          </div>
                        </div>
                        <div style={{ width: '1px', height: '16px', backgroundColor: '#e2e8f0', flexShrink: 0 }}></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg width="16" height="16" fill="none" stroke="#024430" strokeWidth={2} viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM9 7V4a2 2 0 012-2h2a2 2 0 012 2v3" /></svg>
                          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>Hassle Free</span>
                            <span style={{ fontSize: '8px', fontWeight: 600, color: '#94a3b8', whiteSpace: 'nowrap', marginTop: '1px' }}>Travel Experience</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Section - Ticket Stub */}
                    <div style={{ width: '282px', height: '375px', backgroundColor: '#024430', position: 'relative', boxSizing: 'border-box', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '12px 12px', pointerEvents: 'none', zIndex: 1 }} />

                      <div style={{ position: 'absolute', top: '24px', left: 0, width: '282px', textAlign: 'center', zIndex: 5 }}>
                        <span style={{ color: '#fb923c', fontWeight: 800, fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>— SPECIAL OFFER —</span>
                      </div>

                      {/* Discount Number + Symbol — flex centered row */}
                      <div style={{ position: 'absolute', top: '52px', left: 0, width: '282px', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '72px' }}>
                          <span style={{ fontSize: '64px', fontWeight: 800, color: '#ffffff', lineHeight: 1, letterSpacing: '-0.04em', marginRight: '6px' }}>{form.discountValue}</span>
                          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', lineHeight: 1.1 }}>
                            <span style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff' }}>{form.discountType === 'Percentage' ? '%' : '₹'}</span>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#fb923c', textTransform: 'uppercase', marginTop: '1px' }}>{form.discountType === 'Percentage' ? 'OFF' : 'FLAT'}</span>
                          </div>
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '6px', textAlign: 'center', lineHeight: 1.2, whiteSpace: 'nowrap' }}>ON ALL TOUR PACKAGES</span>
                        <div style={{ marginTop: '8px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="16" height="16" fill="#fb923c" viewBox="0 0 24 24"><path d="M12 3c.5 3 2.5 5 5.5 5.5-3 .5-5 2.5-5.5 5.5-.5-3-2.5-5-5.5-5.5 3-.5 5-2.5 5.5-5.5z" /></svg>
                        </div>
                      </div>

                      {/* Coupon Code */}
                      <div style={{ position: 'absolute', top: '198px', left: '24px', width: '234px', height: '54px', zIndex: 5 }}>
                        <div style={{ position: 'absolute', top: '-10px', left: '57px', width: '120px', height: '20px', background: 'linear-gradient(to right, #f97316, #E65F2B)', color: '#ffffff', fontWeight: 700, fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', whiteSpace: 'nowrap', zIndex: 15 }}>COUPON CODE</div>
                        <div style={{ position: 'absolute', left: 0, top: 0, width: '234px', height: '54px', backgroundColor: '#ffffff', borderRadius: '16px', padding: '4px', border: '2px solid #E65F2B', boxSizing: 'border-box' }}>
                          <div style={{ border: '1px dashed #cbd5e1', borderRadius: '12px', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: form.code && form.code.length > 10 ? '13px' : '16px', fontWeight: 700, color: '#024430', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{form.code || 'TOUR15'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Airplane Divider */}
                      <div style={{ position: 'absolute', top: '268px', left: '24px', width: '234px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
                        <div style={{ height: '1px', backgroundColor: 'rgba(249, 115, 22, 0.2)', flex: 1 }}></div>
                        <svg width="14" height="14" fill="#fb923c" viewBox="0 0 24 24" style={{ transform: 'rotate(90deg)', margin: '0 8px', flexShrink: 0 }}><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L14 19v-5.5L21 16z" /></svg>
                        <div style={{ height: '1px', backgroundColor: 'rgba(249, 115, 22, 0.2)', flex: 1 }}></div>
                      </div>

                      {/* Expiry */}
                      <div style={{ position: 'absolute', bottom: '24px', left: 0, width: '282px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fb923c', fontWeight: 800, fontSize: '11px', letterSpacing: '0.05em', zIndex: 5 }}>
                        <svg width="14" height="14" fill="none" stroke="#fb923c" strokeWidth="2.5" viewBox="0 0 24 24" style={{ marginRight: '6px', flexShrink: 0 }}>
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <span style={{ whiteSpace: 'nowrap', lineHeight: 1 }}>VALID TILL: {form.validTo ? format(new Date(form.validTo), 'dd MMM yyyy').toUpperCase() : '31 DEC 2026'}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  /* ─── MULTI-CATEGORY PREMIUM PASS ─── */
                  <>
                    {/* Left Section */}
                    <div style={{ width: '598px', height: '375px', backgroundColor: '#ffffff', position: 'relative', boxSizing: 'border-box', overflow: 'hidden' }}>

                      {/* Dotted Flight Path SVG */}
                      <div style={{ position: 'absolute', top: '35px', right: '25px', pointerEvents: 'none', zIndex: 10 }}>
                        <svg width="192px" height="48px" viewBox="0 0 200 50" style={{ opacity: 0.8 }}>
                          <path d="M10 40 C 60 20, 110 5, 170 25" fill="none" stroke="#024430" strokeWidth={1.8} strokeDasharray="4,4" />
                          <g transform="translate(170, 25) rotate(15) scale(0.9)">
                            <path d="M12,0 L-4,-12 L-2,-3 L-14,0 L-2,3 L-4,12 Z" fill="#024430" />
                          </g>
                        </svg>
                      </div>

                      {/* Header Logo — flex row */}
                      <div style={{ position: 'absolute', left: '32px', top: '32px', height: '48px', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
                        <img src="/logo.png" style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '12px', marginRight: '12px', flexShrink: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <span style={{ fontSize: '20px', fontWeight: 800, color: '#024430', lineHeight: 1.1, letterSpacing: '0.02em', display: 'block' }}>SHRAWELLO</span>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#E65F2B', lineHeight: 1.1, marginTop: '1px', display: 'block' }}>TravelHub</span>
                          <span style={{ fontSize: '7.5px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.15em', textTransform: 'uppercase', lineHeight: 1.1, marginTop: '2px', display: 'block' }}>CORPORATE TRAVEL AND EVENTS —</span>
                        </div>
                      </div>

                      {/* Slogan — flex-column stack */}
                      <div style={{ position: 'absolute', left: '40px', top: '105px', width: '518px', display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '30px', fontWeight: 800, color: '#024430', lineHeight: 1.1, letterSpacing: '-0.01em' }}>ONE PLATFORM.</span>
                        <span style={{ fontSize: '30px', fontWeight: 800, color: '#E65F2B', lineHeight: 1.1, letterSpacing: '-0.01em', marginTop: '1px' }}>ALL YOUR JOURNEYS.</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', lineHeight: 1.2, marginTop: '6px' }}>Smart bookings. Best prices. Hassle free travel.</span>
                      </div>

                      {/* 4 Categories — flex space-between */}
                      <div style={{ position: 'absolute', left: '40px', top: '205px', width: '518px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        {[
                          { title: 'CAB BOOKING', sub1: 'Local • Outstation', sub2: 'Airport Transfers', icon: <svg width="20" height="20" fill="none" stroke="#E65F2B" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 17h2a1 1 0 001-1v-3a1 1 0 00-1-1h-2.28a2 2 0 01-1.68-.9l-.96-1.44A2 2 0 0014.4 9H9.6a2 2 0 00-1.68.9l-.96 1.44a2 2 0 01-1.68.9H3a1 1 0 00-1 1v3a1 1 0 001 1h2" /><path d="M5 18h14M5 18v3h2v-3h10v3h2v-3M5 11h14v7H5v-7" strokeLinecap="round" strokeLinejoin="round" /></svg> },
                          { title: 'TRAIN BOOKING', sub1: 'All Classes', sub2: 'Tatkal Booking', icon: <svg width="20" height="20" fill="none" stroke="#008060" strokeWidth={2} viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="15" rx="3" /><rect x="7" y="5" width="10" height="5" rx="1" /><circle cx="9" cy="14" r="1.5" fill="#008060" /><circle cx="15" cy="14" r="1.5" fill="#008060" /><path d="M7 21l2-3m6 3l-2-3" strokeLinecap="round" /></svg> },
                          { title: 'FLIGHT BOOKING', sub1: 'Domestic • Intl', sub2: 'Best Fares', icon: <svg width="20" height="20" fill="none" stroke="#2563eb" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-16-9 16 9-2zm0 0v-8" /></svg> },
                          { title: 'TOUR PACKAGES', sub1: 'Honeymoon • Family', sub2: 'Group Tours', icon: <svg width="20" height="20" fill="none" stroke="#7c3aed" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 22a10 10 0 006-7c0-2-1.5-4-3.5-4.5.5-1.5 0-3-1.5-4C12 5.5 10.5 6 9.5 7.5 9 6.5 8 6 7 6.5c-1.5.5-2 2-1.5 3.5C3.5 10.5 2.5 12 3 14c1.5 3.5 5 6 9 8zM12 12v10" /></svg> },
                        ].map((cat, i) => (
                          <div key={i} style={{ width: '110px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', marginBottom: '6px', flexShrink: 0 }}>
                              {cat.icon}
                            </div>
                            <span style={{ fontSize: '9px', fontWeight: 800, color: '#1e293b', letterSpacing: '0.01em', display: 'block', lineHeight: 1.1, whiteSpace: 'nowrap' }}>{cat.title}</span>
                            <span style={{ fontSize: '7.5px', color: '#94a3b8', fontWeight: 700, display: 'block', lineHeight: 1.2, marginTop: '3px', whiteSpace: 'nowrap' }}>{cat.sub1}</span>
                            <span style={{ fontSize: '7.5px', color: '#94a3b8', fontWeight: 700, display: 'block', lineHeight: 1.2, whiteSpace: 'nowrap' }}>{cat.sub2}</span>
                          </div>
                        ))}
                      </div>

                      {/* Bottom Feature Bar — flex space-between */}
                      <div style={{ position: 'absolute', left: '40px', top: '302px', width: '518px', height: '48px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="14" height="14" fill="none" stroke="#008060" strokeWidth={2.5} viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                            <span style={{ color: '#334155', fontWeight: 800, fontSize: '8.5px', whiteSpace: 'nowrap' }}>TRUSTED & SAFE</span>
                            <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: '7.5px', whiteSpace: 'nowrap', marginTop: '1px' }}>Verified Partners</span>
                          </div>
                        </div>
                        <div style={{ width: '1px', height: '16px', backgroundColor: '#e2e8f0', flexShrink: 0 }}></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="14" height="14" fill="none" stroke="#E65F2B" strokeWidth={2.5} viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                            <span style={{ color: '#334155', fontWeight: 800, fontSize: '8.5px', whiteSpace: 'nowrap' }}>BEST PRICES</span>
                            <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: '7.5px', whiteSpace: 'nowrap', marginTop: '1px' }}>Guaranteed</span>
                          </div>
                        </div>
                        <div style={{ width: '1px', height: '16px', backgroundColor: '#e2e8f0', flexShrink: 0 }}></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="14" height="14" fill="none" stroke="#008060" strokeWidth={2.5} viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18h2a2 2 0 002-2v-3a2 2 0 00-2-2h-2m-12 7h-2a2 2 0 01-2-2v-3a2 2 0 012-2h2m12 5V9a6 6 0 00-12 0v8" /></svg>
                          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                            <span style={{ color: '#334155', fontWeight: 800, fontSize: '8.5px', whiteSpace: 'nowrap' }}>24/7 SUPPORT</span>
                            <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: '7.5px', whiteSpace: 'nowrap', marginTop: '1px' }}>Always Here</span>
                          </div>
                        </div>
                        <div style={{ width: '1px', height: '16px', backgroundColor: '#e2e8f0', flexShrink: 0 }}></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="14" height="14" fill="none" stroke="#E65F2B" strokeWidth={2.5} viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r={9} /></svg>
                          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                            <span style={{ color: '#334155', fontWeight: 800, fontSize: '8.5px', whiteSpace: 'nowrap' }}>EASY BOOKING</span>
                            <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: '7.5px', whiteSpace: 'nowrap', marginTop: '1px' }}>Quick & Free</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Section - Coupon Stub */}
                    <div style={{ width: '282px', height: '375px', backgroundColor: '#024430', position: 'relative', boxSizing: 'border-box', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '12px 12px', pointerEvents: 'none', zIndex: 1 }} />

                      <div style={{ position: 'absolute', top: '24px', left: 0, width: '282px', textAlign: 'center', zIndex: 5 }}>
                        <span style={{ color: '#fb923c', fontWeight: 800, fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>★ EXCLUSIVE OFFER ★</span>
                      </div>

                      {/* Discount Number + Symbol */}
                      <div style={{ position: 'absolute', top: '52px', left: 0, width: '282px', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '72px' }}>
                          <span style={{ fontSize: '64px', fontWeight: 800, color: '#ffffff', lineHeight: 1, letterSpacing: '-0.04em', marginRight: '6px' }}>{form.discountValue}</span>
                          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', lineHeight: 1.1 }}>
                            <span style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff' }}>{form.discountType === 'Percentage' ? '%' : '₹'}</span>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#fb923c', textTransform: 'uppercase', marginTop: '1px' }}>{form.discountType === 'Percentage' ? 'OFF' : 'FLAT'}</span>
                          </div>
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.95)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '6px', textAlign: 'center', lineHeight: 1.2, whiteSpace: 'nowrap' }}>ON ALL BOOKINGS</span>
                        <span style={{ fontSize: '8px', fontWeight: 800, color: '#5eead4', letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '3px', textAlign: 'center', lineHeight: 1.2, whiteSpace: 'nowrap' }}>CAB | TRAIN | FLIGHTS | TOURS</span>
                      </div>

                      {/* Coupon Code */}
                      <div style={{ position: 'absolute', top: '198px', left: '24px', width: '234px', height: '54px', zIndex: 5 }}>
                        <div style={{ position: 'absolute', top: '-10px', left: '57px', width: '120px', height: '20px', background: 'linear-gradient(to right, #f97316, #E65F2B)', color: '#ffffff', fontWeight: 700, fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', whiteSpace: 'nowrap', zIndex: 15 }}>COUPON CODE</div>
                        <div style={{ position: 'absolute', left: 0, top: 0, width: '234px', height: '54px', backgroundColor: '#ffffff', borderRadius: '16px', padding: '4px', border: '2px solid #E65F2B', boxSizing: 'border-box' }}>
                          <div style={{ border: '1px dashed #cbd5e1', borderRadius: '12px', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: form.code && form.code.length > 10 ? '13px' : '16px', fontWeight: 700, color: '#024430', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{form.code || 'SHRAWELLO15'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Airplane Divider */}
                      <div style={{ position: 'absolute', top: '268px', left: '24px', width: '234px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
                        <div style={{ height: '1px', backgroundColor: 'rgba(249, 115, 22, 0.2)', flex: 1 }}></div>
                        <svg width="14" height="14" fill="#fb923c" viewBox="0 0 24 24" style={{ transform: 'rotate(90deg)', margin: '0 8px', flexShrink: 0 }}><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L14 19v-5.5L21 16z" /></svg>
                        <div style={{ height: '1px', backgroundColor: 'rgba(249, 115, 22, 0.2)', flex: 1 }}></div>
                      </div>

                      {/* Expiry */}
                      <div style={{ position: 'absolute', bottom: '24px', left: 0, width: '282px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fb923c', fontWeight: 800, fontSize: '11px', letterSpacing: '0.05em', zIndex: 5 }}>
                        <svg width="14" height="14" fill="none" stroke="#fb923c" strokeWidth="2.5" viewBox="0 0 24 24" style={{ marginRight: '6px', flexShrink: 0 }}>
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <span style={{ whiteSpace: 'nowrap', lineHeight: 1 }}>VALID TILL: {form.validTo ? format(new Date(form.validTo), 'dd MMM yyyy').toUpperCase() : '31 DEC 2026'}</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Expired / Used glassmorphic live watermark overlay */}
                {(form.isUsed || (form.validTo && new Date(form.validTo) < new Date())) && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center pointer-events-none select-none">
                    <div className={`border-4 border-dashed px-8 py-3 rounded-2xl transform -rotate-12 bg-black/35 shadow-2xl animate-pulse ${form.isUsed ? 'border-amber-500/40' : 'border-red-500/40'}`}>
                      <span className="text-4xl font-black tracking-widest uppercase text-center block">
                        {form.isUsed ? (
                          <span className="text-amber-500 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[36px]">lock</span>
                            LOCKED / USED
                          </span>
                        ) : (
                          <span className="text-red-500 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[36px]">event_busy</span>
                            EXPIRED
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* ─── Download Action Buttons — below preview card ─── */}
          <div className="w-full max-w-[400px] flex flex-col gap-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Export This Coupon</p>
            <div className="flex gap-2">
              {/* PNG Image Download */}
              <button
                type="button"
                onClick={handleDownloadPreviewImage}
                disabled={downloadingId === 'preview'}
                className="flex-1 h-10 flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-black text-xs rounded-xl transition-all shadow-md shadow-teal-500/20 active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait"
              >
                {downloadingId === 'preview' ? (
                  <span className="animate-spin material-symbols-outlined text-[16px]">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[16px]">image</span>
                )}
                Download PNG
              </button>

              {/* PDF Download */}
              <button
                type="button"
                onClick={handleDownloadPreviewPDF}
                disabled={downloadingId === 'preview-pdf'}
                className="flex-1 h-10 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black text-xs rounded-xl transition-all shadow-md shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait"
              >
                {downloadingId === 'preview-pdf' ? (
                  <span className="animate-spin material-symbols-outlined text-[16px]">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                )}
                Download PDF
              </button>
            </div>
            <p className="text-[9px] text-slate-500 text-center font-medium">PNG captures the card above · PDF is a branded print-ready version</p>
          </div>

          {/* Expiry / Warn helper inside preview */}
          {form.validTo && new Date(form.validTo) < new Date() && (
            <div className="w-full max-w-[400px] p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-2.5 text-red-400 text-xs font-bold animate-pulse">
              <span className="material-symbols-outlined">warning</span>
              Warning: Expiry date is set in the past. This coupon will render as Expired!
            </div>
          )}
        </div>
      </div>

      {/* Database Listing & Usage Board */}
      <div className="bg-white dark:bg-[#151d29] rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 md:p-8 space-y-6 shadow-sm">
        
        {/* Search, filters, titles */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">analytics</span>
              Active Promotion Coupons Ledger
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Filter, monitor usage, mark status, and execute CRUD operations instantly.</p>
          </div>

          <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-initial sm:w-64">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[18px]">search</span>
              <input
                type="text"
                placeholder="Search code..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-150 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white"
              />
            </div>

            {/* Filter by Category */}
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
              className="h-9 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-150 dark:border-slate-800 text-xs font-bold outline-none text-slate-900 dark:text-white"
            >
              <option value="All">All Categories</option>
              <option value="ToursOnly">Tours Only</option>
              <option value="MultiCategory">Multi-Category</option>
            </select>

            {/* Filter by Status */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="h-9 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-150 dark:border-slate-800 text-xs font-bold outline-none text-slate-900 dark:text-white"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Expired">Expired</option>
            </select>

            {/* Filter by Usage */}
            <select
              value={usageFilter}
              onChange={e => setUsageFilter(e.target.value as any)}
              className="h-9 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-150 dark:border-slate-800 text-xs font-bold outline-none text-slate-900 dark:text-white"
            >
              <option value="All">All Usages</option>
              <option value="Used">Marked Used</option>
              <option value="Unused">Unused (Available)</option>
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-150 dark:border-slate-800">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="p-4 pl-6">Coupon Code</th>
                <th className="p-4">Type</th>
                <th className="p-4">Savings Benefit</th>
                <th className="p-4">Criteria</th>
                <th className="p-4">Validity Period</th>
                <th className="p-4">Used Status?</th>
                <th className="p-4">Publish</th>
                <th className="p-4 text-center">Downloads</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-sm font-semibold">
              {filteredCoupons.map(c => {
                // Calculate if expired dynamically based on validTo
                const isPastExp = c.validTo ? new Date(c.validTo) < new Date() : false;
                const activeStatus = isPastExp ? 'Expired' : c.status;

                return (
                  <tr key={c.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-all group">
                    
                    {/* Monospace Code & Copy block */}
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[20px] text-slate-400 block group-hover:scale-110 transition-transform">confirmation_number</span>
                        <div className="flex flex-col">
                          <span onClick={() => copyToClipboard(c.code)} className="font-mono text-sm font-black text-slate-900 dark:text-white hover:text-indigo-400 cursor-pointer transition-colors select-all uppercase">
                            {c.code}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium">Click to Copy</span>
                          {/* List linked bookings */}
                          {(() => {
                            const applied = bookings.filter(b => b.appliedCouponCode?.toUpperCase() === c.code.toUpperCase());
                            if (applied.length > 0) {
                              return (
                                <div className="mt-2 space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-1.5 max-w-[200px]">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Linked Bookings:</span>
                                  {applied.map(b => (
                                    <div key={b.id} className="flex items-center gap-1 text-[11px] text-indigo-500 dark:text-indigo-400 font-black hover:underline leading-none">
                                      <span className="material-symbols-outlined text-[12px] font-black">book</span>
                                      <Link to={`/admin/bookings?search=${b.bookingNumber ? `BK-${String(b.bookingNumber).padStart(4, '0')}` : b.id}`} className="truncate block max-w-[170px]">
                                        {b.bookingNumber ? `BK-${String(b.bookingNumber).padStart(4, '0')}` : 'View Booking'} ({b.customer})
                                      </Link>
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </td>

                    {/* Category Type */}
                    <td className="p-4">
                      {c.type === 'ToursOnly' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                          <span className="material-symbols-outlined text-[12px] font-black">tour</span>
                          Tours Exclusive
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          <span className="material-symbols-outlined text-[12px] font-black">flight_takeoff</span>
                          Multi-Category
                        </span>
                      )}
                    </td>

                    {/* Savings Value */}
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {c.discountType === 'Percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue.toLocaleString()} Flat`}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Applied on subtotal</span>
                      </div>
                    </td>

                    {/* Criteria: Min Booking */}
                    <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">
                      {c.minBookingAmount && c.minBookingAmount > 0 
                        ? `Min. Spend: ₹${c.minBookingAmount.toLocaleString()}` 
                        : 'No minimum'
                      }
                    </td>

                    {/* Validity dates */}
                    <td className="p-4 text-slate-600 dark:text-slate-300 font-semibold text-xs">
                      <div className="flex flex-col gap-0.5 leading-none">
                        <span>From: {c.validFrom ? format(new Date(c.validFrom), 'MMM dd, yyyy') : 'No Limit'}</span>
                        <span className="text-slate-400 text-[10px] mt-0.5">Until: {c.validTo ? format(new Date(c.validTo), 'MMM dd, yyyy') : 'No Limit'}</span>
                      </div>
                    </td>

                    {/* Used Status Toggle */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {/* Status chip and toggle button */}
                        <button
                          type="button"
                          onClick={() => handleToggleUsed(c)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all select-none border ${
                            c.isUsed
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30'
                          }`}
                        >
                          <span className={`size-1.5 rounded-full ${c.isUsed ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />
                          {c.isUsed ? 'Used' : 'Available'}
                        </button>
                        <span className="text-[10px] text-slate-400 font-bold block">({c.useCount} times)</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        activeStatus === 'Active'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : activeStatus === 'Inactive'
                          ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                          : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                      }`}>
                        {activeStatus}
                      </span>
                    </td>

                    {/* Downloads Count */}
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-sm font-black text-slate-700 dark:text-slate-300">{c.downloadCount || 0}</span>
                        <span className="text-[9px] text-slate-400 font-medium">times</span>
                      </div>
                    </td>

                    {/* Action buttons */}
                    <td className="p-4 pr-6 text-right">
                      <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        
                        {/* Apply Coupon button */}
                        <button
                          onClick={() => {
                            setSelectedCouponToApply(c);
                            setIsApplyModalOpen(true);
                            setSelectedBookingId('');
                            setApplySearchQuery('');
                          }}
                          className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-500 rounded-xl transition-all"
                          title="Apply Coupon to Booking"
                        >
                          <span className="material-symbols-outlined text-[18px]">local_offer</span>
                        </button>

                        {/* Toggle used option shortcut */}
                        <button
                          onClick={() => handleToggleUsed(c)}
                          className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-amber-500 rounded-xl transition-all"
                          title={c.isUsed ? 'Mark as Unused' : 'Mark as Used'}
                        >
                          <span className="material-symbols-outlined text-[18px]">rule</span>
                        </button>

                        <button
                          onClick={() => handleEditClick(c)}
                          className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary rounded-xl transition-all"
                          title="Edit Settings"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>

                        {/* PDF Download from table row */}
                        <button
                          onClick={() => handleRowDownloadPDF(c)}
                          disabled={downloadingId === c.id + '-pdf'}
                          className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-500 rounded-xl transition-all disabled:opacity-50"
                          title="Download as PDF"
                        >
                          {downloadingId === c.id + '-pdf' ? (
                            <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                          ) : (
                            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                          )}
                        </button>

                        <button
                          onClick={() => handleDeleteClick(c)}
                          className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-xl transition-all"
                          title="Delete Coupon"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredCoupons.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-4xl opacity-50 block">search_off</span>
                      <p className="font-bold text-slate-650 mt-2">No promotional coupons found matching filters.</p>
                      <p className="text-xs">Create one using the form editor on the left side pane!</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Coupon Modal */}
      {isApplyModalOpen && selectedCouponToApply && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setIsApplyModalOpen(false)}>
          <div className="bg-white dark:bg-[#151d29] w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 max-h-[85vh] border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/40">
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">local_offer</span>
                <span className="font-display">Apply Coupon: {selectedCouponToApply.code}</span>
              </h2>
              <button onClick={() => setIsApplyModalOpen(false)} className="text-slate-400 hover:text-slate-655 dark:hover:text-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="p-4 bg-slate-50 dark:bg-slate-850/50 border border-slate-150 dark:border-slate-800/60 rounded-2xl space-y-2 text-xs font-bold text-slate-500">
                <div className="flex justify-between items-center">
                  <span>DISCOUNT VALUE:</span>
                  <span className="text-slate-900 dark:text-white font-extrabold">
                    {selectedCouponToApply.discountType === 'Percentage' ? `${selectedCouponToApply.discountValue}%` : `₹${selectedCouponToApply.discountValue}`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>CATEGORY TYPE:</span>
                  <span className="text-slate-900 dark:text-white font-extrabold">
                    {selectedCouponToApply.type === 'ToursOnly' ? 'Tours Exclusive' : 'Multi-Category'}
                  </span>
                </div>
                {selectedCouponToApply.minBookingAmount && selectedCouponToApply.minBookingAmount > 0 ? (
                  <div className="flex justify-between items-center">
                    <span>MINIMUM SPEND:</span>
                    <span className="text-slate-900 dark:text-white font-extrabold">₹{selectedCouponToApply.minBookingAmount.toLocaleString()}</span>
                  </div>
                ) : null}
              </div>

              {/* Search Booking */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Select Active Booking</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-450 material-symbols-outlined text-[18px]">search</span>
                  <input
                    type="text"
                    placeholder="Search by Booking Number, Customer Name, or Email..."
                    value={applySearchQuery}
                    onChange={e => setApplySearchQuery(e.target.value)}
                    className="w-full h-10 pl-9 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-150 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Bookings List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 border border-slate-150 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800/40">
                {(() => {
                  const filtered = bookings.filter(b => {
                    const bNum = b.bookingNumber ? `BK-${String(b.bookingNumber).padStart(4, '0')}` : b.id;
                    const query = applySearchQuery.toLowerCase();
                    const matchesSearch = bNum.toLowerCase().includes(query) ||
                      b.customer.toLowerCase().includes(query) ||
                      b.email.toLowerCase().includes(query) ||
                      b.title.toLowerCase().includes(query);

                    const isNotCancelled = b.status !== 'Cancelled';
                    
                    return matchesSearch && isNotCancelled;
                  });

                  if (filtered.length === 0) {
                    return (
                      <p className="p-8 text-center text-xs text-slate-405 font-bold italic">No active bookings found matching search.</p>
                    );
                  }

                  return filtered.map(b => {
                    const pricingForCheck = b.originalPrice || b.amount;
                    const isAmountEligible = !selectedCouponToApply.minBookingAmount || pricingForCheck >= selectedCouponToApply.minBookingAmount;
                    const isCategoryEligible = selectedCouponToApply.type !== 'ToursOnly' || b.type === 'Tour';

                    const isEligible = isAmountEligible && isCategoryEligible;

                    let previewDiscount = 0;
                    if (selectedCouponToApply.discountType === 'Percentage') {
                      previewDiscount = Math.round(pricingForCheck * (selectedCouponToApply.discountValue / 100));
                    } else {
                      previewDiscount = selectedCouponToApply.discountValue;
                    }
                    previewDiscount = Math.min(previewDiscount, pricingForCheck);
                    const discountedTotal = Math.max(0, pricingForCheck - previewDiscount);

                    const isSelected = selectedBookingId === b.id;

                    return (
                      <div
                        key={b.id}
                        onClick={() => isEligible && setSelectedBookingId(b.id)}
                        className={`p-3 transition-all flex items-center justify-between text-left ${
                          isEligible ? 'cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/30' : 'opacity-40 cursor-not-allowed'
                        } ${isSelected ? 'bg-indigo-500/5 dark:bg-indigo-500/10 border-l-4 border-indigo-500 pl-2' : ''}`}
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-slate-900 dark:text-white">
                              {b.bookingNumber ? `BK-${String(b.bookingNumber).padStart(4, '0')}` : b.id.substring(0, 8)}
                            </span>
                            <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded uppercase border border-slate-200/50 dark:border-slate-700/50">
                              {b.type}
                            </span>
                            {b.appliedCouponCode && (
                              <span className="text-[9px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-amber-500/10">
                                <span className="material-symbols-outlined text-[10px] font-black">local_offer</span>
                                {b.appliedCouponCode}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-800 dark:text-slate-250 font-bold mt-1 truncate">{b.customer} ({b.email})</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{b.title} · Date: {b.date}</p>
                          
                          {!isEligible && (
                            <div className="mt-1 flex flex-col gap-0.5">
                              {!isAmountEligible && (
                                <span className="text-[9px] font-bold text-red-500 dark:text-red-400 flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[10px] font-black">warning</span>
                                  Booking Value (₹{pricingForCheck.toLocaleString()}) below Min Spend ₹{selectedCouponToApply.minBookingAmount?.toLocaleString()}
                                </span>
                              )}
                              {!isCategoryEligible && (
                                <span className="text-[9px] font-bold text-red-500 dark:text-red-400 flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[10px] font-black">warning</span>
                                  ToursOnly coupon cannot apply to {b.type} booking
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Price Preview */}
                        <div className="text-right shrink-0 flex flex-col items-end">
                          {isEligible ? (
                            <>
                              <div className="text-xs font-black text-slate-900 dark:text-white">
                                ₹{discountedTotal.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-green-650 dark:text-green-400 font-black flex items-center gap-0.5">
                                <span>-₹{previewDiscount.toLocaleString()}</span>
                              </div>
                              <div className="text-[9px] text-slate-400 font-semibold line-through">
                                ₹{pricingForCheck.toLocaleString()}
                              </div>
                            </>
                          ) : (
                            <div className="text-xs font-bold text-slate-450 dark:text-slate-500">
                              ₹{pricingForCheck.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex gap-3">
              <button
                type="button"
                onClick={() => setIsApplyModalOpen(false)}
                className="flex-1 h-11 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-[0.99]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedBookingId || isSubmittingApply}
                onClick={async () => {
                  if (!selectedBookingId || !selectedCouponToApply) return;
                  setIsSubmittingApply(true);
                  try {
                    await applyCoupon(selectedCouponToApply.code, selectedBookingId);
                    setIsApplyModalOpen(false);
                    setSelectedBookingId('');
                    setSelectedCouponToApply(null);
                  } catch (err) {
                    // Handled in context
                  } finally {
                    setIsSubmittingApply(false);
                  }
                }}
                className="flex-1 h-11 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-xs shadow-md shadow-primary/10 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingApply ? (
                  <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                )}
                Confirm Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
