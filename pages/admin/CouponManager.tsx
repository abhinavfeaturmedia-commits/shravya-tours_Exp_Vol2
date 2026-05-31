import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useData } from '../../context/DataContext';
import { Coupon } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { downloadCouponAsImage, downloadCouponAsPDF } from '../../utils/couponDownloader';

export const CouponManager: React.FC = () => {
  const { coupons, addCoupon, updateCoupon, deleteCoupon } = useData();

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
  // PNG download: captures the live preview card DOM node via html2canvas
  const handleDownloadPreviewImage = useCallback(async () => {
    if (!previewRef.current) {
      toast.error('Preview not ready. Please wait.');
      return;
    }
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
      await downloadCouponAsImage(fakeCoupon, previewRef.current);
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
          {/* Interactive Card Rendering — ref attached for html2canvas capture */}
          <div className="w-full flex justify-center items-center overflow-hidden py-4 select-none">
            <div className="origin-center scale-[0.45] sm:scale-[0.55] md:scale-[0.65] lg:scale-[0.75] xl:scale-[0.52] 2xl:scale-[0.68] my-[-100px] sm:my-[-80px] md:my-[-60px] xl:my-[-90px] 2xl:my-[-60px] shrink-0">
              <div ref={previewRef} className="w-[880px] h-[375px] shrink-0 relative flex rounded-[32px] overflow-hidden shadow-2xl bg-[#0B1116] border border-slate-800/80 font-sans">
                
                {/* Custom circular notch cutouts at the tear-off boundary */}
                <div className="absolute -top-[16px] left-[68%] w-[32px] h-[32px] rounded-full bg-[#151d29] border-b border-slate-800/85 z-30" />
                <div className="absolute -bottom-[16px] left-[68%] w-[32px] h-[32px] rounded-full bg-[#151d29] border-t border-slate-800/85 z-30" />
                
                {/* White Perforated Dotted Separator Line */}
                <div className="absolute top-0 bottom-0 left-[68%] flex flex-col justify-between py-6 pointer-events-none z-30 -translate-x-0.5">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/90 shadow-sm" />
                  ))}
                </div>

                {form.type === 'ToursOnly' ? (
                  /* ─── TOURS EXCLUSIVE PREMIUM VOUCHER (Image 2) ─── */
                  <>
                    {/* Left Section - Full-bleed Tropical Scenery */}
                    <div className="w-[68%] h-full relative p-8 flex flex-col justify-between overflow-hidden text-white">
                      
                      {/* Premium Scenic Background */}
                      <div className="absolute inset-0 -z-10 bg-[url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1000')] bg-cover bg-center brightness-[0.85] saturate-[1.1]" />
                      {/* Deep Emerald-Teal Vignette and Overlay to ensure absolute readability */}
                      <div className="absolute inset-0 bg-gradient-to-r from-[#012521]/95 via-[#012521]/60 to-transparent -z-10" />

                      {/* Header Logo */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg border border-amber-300/30">
                            <span className="material-symbols-outlined text-[24px]">beach_access</span>
                          </div>
                          <div>
                            <div className="flex items-baseline gap-1 leading-none">
                              <span className="text-lg font-black tracking-tight text-orange-400 font-display">SHRAWELLO</span>
                              <span className="text-sm font-bold tracking-tight text-white font-display">TravelHub</span>
                            </div>
                            <span className="text-[7.5px] font-black text-white/50 tracking-[0.25em] uppercase block mt-1 leading-none">— CORPORATE TRAVEL AND EVENTS —</span>
                          </div>
                        </div>

                        {/* Top Cursive Text + Dotted Flight Path */}
                        <div className="relative pr-6 pt-1 select-none">
                          <span className="text-amber-300 font-semibold text-xs tracking-wider font-serif italic block" style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive" }}>
                            Explore the World. Create Memories.
                          </span>
                          <svg className="absolute top-2.5 right-[-10px] w-48 h-8 opacity-40 pointer-events-none" viewBox="0 0 200 40">
                            <path d="M10 30 C 50 10, 100 0, 180 20" fill="none" stroke="#ffffff" strokeWidth="1" strokeDasharray="3,3" />
                            <path d="M180 20 L174 15 L178 19 Z" fill="#ffffff" />
                          </svg>
                        </div>
                      </div>

                      {/* Middle Slogan */}
                      <div className="my-auto pt-4 pl-2 space-y-1">
                        <h2 className="text-4xl font-extrabold tracking-tight leading-none">
                          <span className="block text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">EXPLORE MORE.</span>
                          <span className="block text-orange-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] mt-1">PAY LESS.</span>
                        </h2>
                        <p className="text-amber-200 font-bold text-xs tracking-wider pl-0.5 pt-1.5" style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive, serif" }}>
                          Create Memories That Last Forever
                        </p>
                      </div>

                      {/* Category Circular Badges & Bottom bar */}
                      <div className="space-y-4">
                        <div className="flex gap-5 pl-2 select-none">
                          {[
                            { label: 'Customized Tours', icon: 'map' },
                            { label: 'Family Packages', icon: 'family_restroom' },
                            { label: 'Honeymoon Packages', icon: 'favorite' },
                            { label: 'Group Tours', icon: 'groups' }
                          ].map((cat, i) => (
                            <div key={i} className="flex flex-col items-center gap-1.5">
                              <div className="w-[50px] h-[50px] rounded-full bg-[#012521]/70 backdrop-blur-sm border border-orange-400/50 flex items-center justify-center text-orange-400 shadow-md">
                                <span className="material-symbols-outlined text-[22px]">{cat.icon}</span>
                              </div>
                              <span className="text-[9px] font-black text-white/90 text-center tracking-wide block leading-tight">{cat.label}</span>
                            </div>
                          ))}
                        </div>

                        {/* Bottom Feature Pill Bar */}
                        <div className="bg-[#002622]/80 backdrop-blur-sm border border-emerald-800/40 rounded-2xl h-11 px-6 flex items-center justify-between text-white text-[10px] font-black tracking-wider shadow-lg">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-orange-400 text-sm">percent</span>
                            <span>BEST PRICES <span className="text-orange-400 font-medium">Guaranteed</span></span>
                          </div>
                          <div className="w-px h-4 bg-emerald-800/40" />
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-orange-400 text-sm">verified_user</span>
                            <span>TRUSTED & SAFE <span className="text-orange-400 font-medium">Our Priority</span></span>
                          </div>
                          <div className="w-px h-4 bg-emerald-800/40" />
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-orange-400 text-sm">headset_mic</span>
                            <span>24/7 SUPPORT <span className="text-orange-400 font-medium">We're Always Here</span></span>
                          </div>
                          <div className="w-px h-4 bg-emerald-800/40" />
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-orange-400 text-sm">luggage</span>
                            <span>HASSLE FREE <span className="text-orange-400 font-medium">Travel Experience</span></span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Section - Ticket Stub (Deep Pine Green) */}
                    <div className="w-[32%] h-full bg-[#03231D] relative p-6 flex flex-col justify-between items-center text-center overflow-hidden">
                      
                      {/* Background Micro Dots pattern overlay */}
                      <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px] opacity-5 pointer-events-none" />

                      {/* Header script banner */}
                      <div className="pt-2">
                        <span className="text-amber-300 font-bold text-xs block tracking-wider" style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive" }}>
                          ★ Special Offer ★
                        </span>
                      </div>

                      {/* Giant Savings Benefit */}
                      <div className="my-auto pt-2 flex flex-col items-center">
                        <div className="flex items-baseline justify-center select-none">
                          <span className="text-7xl font-black text-white tracking-tighter leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)]">
                            {form.discountValue}
                          </span>
                          <div className="flex flex-col items-start ml-1 leading-none">
                            <span className="text-3xl font-black text-white">%</span>
                            <span className="text-xl font-black text-orange-500 tracking-wider">OFF</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-white/80 tracking-widest uppercase block mt-1">ON ALL TOUR PACKAGES</span>
                      </div>

                      {/* Coupon Code Section */}
                      <div className="w-full relative px-2 my-auto">
                        {/* Orange Floating badge */}
                        <div className="absolute top-[-9px] left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-[7.5px] uppercase tracking-widest px-3 py-0.5 rounded-full z-15 shadow">
                          COUPON CODE
                        </div>

                        {/* White Coupon Box */}
                        <div className="w-full bg-white rounded-2xl p-2.5 border-[3px] border-double border-orange-400 shadow-xl flex items-center justify-center relative overflow-hidden">
                          {/* Dotted inner line and scissor icon */}
                          <div className="absolute inset-0.5 border border-dashed border-slate-300 rounded-xl pointer-events-none" />
                          <span className="font-mono text-base font-extrabold text-[#03231D] tracking-widest select-all uppercase block z-10">
                            {form.code || 'TOUR15'}
                          </span>
                        </div>
                      </div>

                      {/* Valid Expiry Banner */}
                      <div className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-[10.5px] tracking-wider py-2 px-3 rounded-xl shadow flex items-center justify-center gap-2 select-none">
                        <span className="material-symbols-outlined text-[15px] font-black">calendar_today</span>
                        <span>VALID TILL: {form.validTo ? format(new Date(form.validTo), 'dd MMM yyyy').toUpperCase() : '31 DEC 2026'}</span>
                      </div>

                      {/* Premium Luggage SVGs illustration absolute in background */}
                      <svg className="absolute bottom-[44px] right-[-10px] w-[140px] h-[95px] opacity-90 pointer-events-none z-10" viewBox="0 0 140 95" fill="none">
                        {/* Boarding Pass */}
                        <g transform="rotate(-15, 60, 45)">
                          <rect x="35" y="10" width="70" height="40" rx="3" fill="#ffffff" />
                          <rect x="35" y="10" width="70" height="10" fill="#005B5C" rx="1.5" />
                          <circle cx="45" cy="15" r="2" fill="#ffffff" />
                          <path d="M43 15h15" stroke="#ffffff" strokeWidth="1" />
                          <rect x="40" y="24" width="30" height="3" rx="1" fill="#e2e8f0" />
                          <rect x="40" y="30" width="20" height="3" rx="1" fill="#e2e8f0" />
                          <line x1="88" y1="20" x2="88" y2="45" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="1.5,1.5" />
                          <rect x="92" y="22" width="2" height="18" fill="#1e293b" />
                          <rect x="96" y="22" width="1" height="18" fill="#1e293b" />
                          <rect x="99" y="22" width="3" height="18" fill="#1e293b" />
                          <rect x="103" y="22" width="1" height="18" fill="#1e293b" />
                        </g>
                        {/* Passport */}
                        <g transform="rotate(8, 85, 55)">
                          <rect x="70" y="25" width="45" height="60" rx="4" fill="#0E3E2B" stroke="#B08D3E" strokeWidth="1.5" />
                          <text x="92.5" y="38" fill="#B08D3E" fontSize="5" fontWeight="bold" fontFamily="serif" textAnchor="middle" letterSpacing="1">PASSPORT</text>
                          <circle cx="92.5" cy="55" r="9" stroke="#B08D3E" strokeWidth="1" fill="none" />
                          <circle cx="92.5" cy="55" r="6" stroke="#B08D3E" strokeWidth="0.7" fill="none" strokeDasharray="1,1" />
                          <ellipse cx="92.5" cy="55" rx="3" ry="9" stroke="#B08D3E" strokeWidth="0.7" fill="none" />
                          <ellipse cx="92.5" cy="55" rx="9" ry="3" stroke="#B08D3E" strokeWidth="0.7" fill="none" />
                        </g>
                        {/* Green/Teal Suitcase */}
                        <g transform="translate(10, 30)">
                          <rect x="10" y="15" width="70" height="48" rx="10" fill="#1E3E3F" stroke="#122728" strokeWidth="2" />
                          <rect x="14" y="19" width="62" height="40" rx="7" stroke="#2a5354" strokeWidth="1.5" fill="none" />
                          <path d="M10 25c0-5 5-10 10-10" stroke="#0f1f20" strokeWidth="3" fill="none" />
                          <path d="M80 25c0-5-5-10-10-10" stroke="#0f1f20" strokeWidth="3" fill="none" />
                          <path d="M10 53c0 5 5 10 10 10" stroke="#0f1f20" strokeWidth="3" fill="none" />
                          <path d="M80 53c0 5-5 10-10 10" stroke="#0f1f20" strokeWidth="3" fill="none" />
                          <path d="M35 15V8c0-2.2 1.8-4 4-4h12c2.2 0 4 1.8 4 4v7" stroke="#0f1f20" strokeWidth="4.5" fill="none" />
                          <rect x="33" y="12" width="6" height="4" rx="1" fill="#B08D3E" />
                          <rect x="51" y="12" width="6" height="4" rx="1" fill="#B08D3E" />
                          <rect x="24" y="15" width="6" height="48" fill="#122728" />
                          <rect x="60" y="15" width="6" height="48" fill="#122728" />
                          <rect x="23" y="30" width="8" height="6" fill="#B08D3E" rx="1" />
                          <rect x="59" y="30" width="8" height="6" fill="#B08D3E" rx="1" />
                          <rect x="36" y="28" width="18" height="18" rx="3" fill="#ffffff" />
                          <circle cx="45" cy="37" r="6" fill="#f97316" />
                          <path d="M42 35l6 4M42 39l6-4" stroke="#ffffff" strokeWidth="1.5" />
                          <circle cx="20" cy="50" r="4" fill="#E11D48" />
                          <rect x="54" y="48" width="10" height="6" rx="1" fill="#2563EB" transform="rotate(-10, 59, 51)" />
                        </g>
                      </svg>
                    </div>
                  </>
                ) : (
                  /* ─── MULTI-CATEGORY PREMIUM PASS (Image 1) ─── */
                  <>
                    {/* Left Section - Branded Cream & Slanted Category Tiles */}
                    <div className="w-[68%] h-full bg-gradient-to-br from-[#FCFBF9] to-[#F3EFE9] text-slate-800 relative p-8 flex flex-col justify-between overflow-hidden">
                      
                      {/* Background route mapping design */}
                      <svg className="absolute inset-0 w-full h-full opacity-[0.12] pointer-events-none" viewBox="0 0 600 375">
                        <path d="M30 60 Q 150 140, 220 70 T 400 120" fill="none" stroke="#FF6A00" strokeWidth="2.5" strokeDasharray="5,5" />
                        <circle cx="30" cy="60" r="5" fill="#FF6A00" />
                        <circle cx="220" cy="70" r="5" fill="#008060" />
                        <circle cx="400" cy="120" r="5" fill="#0066CC" />
                      </svg>

                      {/* Header Logo */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg border border-amber-300/30">
                            <span className="material-symbols-outlined text-[24px]">beach_access</span>
                          </div>
                          <div>
                            <div className="flex items-baseline gap-1 leading-none">
                              <span className="text-lg font-black tracking-tight text-[#FF6A00] font-display">SHRAWELLO</span>
                              <span className="text-sm font-bold tracking-tight text-[#008060] font-display">TravelHub</span>
                            </div>
                            <span className="text-[7.5px] font-black text-slate-400 tracking-[0.25em] uppercase block mt-1 leading-none">— CORPORATE TRAVEL AND EVENTS —</span>
                          </div>
                        </div>
                      </div>

                      {/* Middle Area: Slogan Left, Slanted Tiles Right */}
                      <div className="flex justify-between items-center my-auto pt-2 pl-1 select-none">
                        
                        {/* Vertical Slogans & Features */}
                        <div className="space-y-4 max-w-[280px]">
                          <div>
                            <h2 className="text-[28px] font-black tracking-tight leading-none text-[#003632]">ONE DESTINATION.</h2>
                            <h2 className="text-[28px] font-black tracking-tight leading-none text-[#FF6A00] mt-1.5">ENDLESS JOURNEYS.</h2>
                            <p className="text-xs text-slate-500 font-bold mt-2.5">
                              Travel <span className="text-emerald-600">Smart</span>. Book <span className="text-[#003632]">Easy</span>. Save <span className="text-orange-500">More</span>.
                            </p>
                          </div>

                          {/* Features Checklist */}
                          <div className="space-y-1.5">
                            {['Easy Bookings', 'Best Prices', 'Verified Partners', '24/7 Support'].map((feat, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-[10.5px] font-extrabold text-slate-700">
                                <span className="w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center text-white">
                                  <span className="material-symbols-outlined text-[11px] font-black">check</span>
                                </span>
                                <span>{feat}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Slanted category cards */}
                        <div className="flex gap-2.5 h-[165px] pl-6 pr-2">
                          {[
                            { title: 'CAB BOOKING', text: 'Safe. Reliable. Comfortable Rides.', icon: 'local_taxi', color: 'bg-orange-500', img: 'https://images.unsplash.com/photo-1549880181-56a44cf8a4a1?auto=format&fit=crop&q=80&w=300' },
                            { title: 'TRAIN BOOKING', text: 'Comfortable Journeys. Connect Beyond.', icon: 'train', color: 'bg-emerald-600', img: 'https://images.unsplash.com/photo-1532103054090-334e6e60ab29?auto=format&fit=crop&q=80&w=300' },
                            { title: 'FLIGHT BOOKING', text: 'Best Fares. Fly to Your Dreams.', icon: 'flight', color: 'bg-blue-600', img: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=300' },
                            { title: 'TOUR PACKAGES', text: 'Explore More. Create Memories.', icon: 'beach_access', color: 'bg-purple-600', img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=300' }
                          ].map((col, idx) => (
                            <div key={idx} className="w-[66px] h-[155px] -skew-x-12 overflow-hidden rounded-xl border border-white shadow-md relative group/item transition-all duration-300 hover:w-[110px]">
                              
                              {/* Background card image & dark overlay */}
                              <div className="absolute inset-0 -skew-x-12">
                                <img src={col.img} className="absolute inset-0 w-full h-full object-cover brightness-[0.8]" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />
                              </div>

                              {/* Un-skewed inner content wrapper */}
                              <div className="skew-x-12 w-[110px] h-[155px] absolute left-[-22px] top-0 flex flex-col justify-between p-2.5">
                                {/* Top Badge & Icon */}
                                <div className="flex flex-col items-center select-none pt-1">
                                  <div className={`w-6 h-6 rounded-full ${col.color} flex items-center justify-center text-white shadow-sm`}>
                                    <span className="material-symbols-outlined text-[14px]">{col.icon}</span>
                                  </div>
                                  <span className="text-[7.5px] font-black text-white text-center tracking-wider block mt-1">{col.title}</span>
                                </div>
                                {/* Bottom slogan label */}
                                <div className={`${col.color} text-white text-[7px] font-black leading-tight py-1 px-1 rounded text-center shadow-md select-none`}>
                                  {col.text}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bottom Feature Rounded Bar */}
                      <div className="bg-white/90 border border-slate-200/50 rounded-2xl h-11 px-6 flex items-center justify-between text-slate-700 text-[10px] font-black tracking-wider shadow-md select-none">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#008060] text-sm">verified</span>
                          <span>BEST PRICES <span className="text-slate-400 font-medium">Guaranteed</span></span>
                        </div>
                        <div className="w-px h-4 bg-slate-200" />
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#008060] text-sm">security</span>
                          <span>TRUSTED & SAFE <span className="text-slate-400 font-medium">Our Priority</span></span>
                        </div>
                        <div className="w-px h-4 bg-slate-200" />
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#008060] text-sm">support_agent</span>
                          <span>24/7 SUPPORT <span className="text-slate-400 font-medium">Always Here</span></span>
                        </div>
                        <div className="w-px h-4 bg-slate-200" />
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#008060] text-sm">local_offer</span>
                          <span>EXCLUSIVE OFFERS <span className="text-slate-400 font-medium">More Savings</span></span>
                        </div>
                      </div>
                    </div>

                    {/* Right Section - Ticket Stub (Deep Pine Green) */}
                    <div className="w-[32%] h-full bg-[#03231D] relative p-6 flex flex-col justify-between items-center text-center overflow-hidden">
                      
                      {/* Micro Dot pattern overlay */}
                      <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px] opacity-5 pointer-events-none" />

                      {/* Header script banner */}
                      <div className="pt-2 select-none">
                        <span className="text-amber-300 font-black text-[10px] block tracking-[0.2em] uppercase leading-none">
                          ★ SPECIAL DISCOUNT ★
                        </span>
                      </div>

                      {/* Giant Savings Benefit */}
                      <div className="my-auto pt-2 flex flex-col items-center">
                        <div className="flex items-baseline justify-center select-none">
                          <span className="text-7xl font-black text-white tracking-tighter leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)]">
                            {form.discountValue}
                          </span>
                          <div className="flex flex-col items-start ml-1 leading-none">
                            <span className="text-3xl font-black text-white">%</span>
                            <span className="text-xl font-black text-orange-500 tracking-wider">OFF</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-white/95 tracking-[0.15em] uppercase block mt-1">ON ALL BOOKINGS</span>
                        <span className="text-[8px] font-bold text-orange-400/80 tracking-widest block mt-0.5">CAB | TRAIN | FLIGHTS | TOURS</span>
                      </div>

                      {/* Coupon Code Section */}
                      <div className="w-full relative px-2 my-auto">
                        {/* Orange Floating badge */}
                        <div className="absolute top-[-9px] left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-[7.5px] uppercase tracking-widest px-3 py-0.5 rounded-full z-15 shadow">
                          COUPON CODE
                        </div>

                        {/* White Coupon Box */}
                        <div className="w-full bg-white rounded-2xl p-2.5 border-[3px] border-double border-orange-400 shadow-xl flex items-center justify-center relative overflow-hidden">
                          {/* Dotted inner line */}
                          <div className="absolute inset-0.5 border border-dashed border-slate-300 rounded-xl pointer-events-none" />
                          <span className="font-mono text-base font-extrabold text-[#03231D] tracking-widest select-all uppercase block z-10">
                            {form.code || 'SHRAVELLO015'}
                          </span>
                        </div>
                      </div>

                      {/* Yellow Category Icon Bar */}
                      <div className="flex justify-around items-center w-full px-2 py-1 bg-[#011B16] rounded-xl border border-white/5 shadow-inner select-none my-auto">
                        <span className="material-symbols-outlined text-orange-400 text-base font-bold">local_taxi</span>
                        <div className="w-px h-3 bg-white/10" />
                        <span className="material-symbols-outlined text-orange-400 text-base font-bold">train</span>
                        <div className="w-px h-3 bg-white/10" />
                        <span className="material-symbols-outlined text-orange-400 text-base font-bold">flight</span>
                        <div className="w-px h-3 bg-white/10" />
                        <span className="material-symbols-outlined text-orange-400 text-base font-bold">luggage</span>
                      </div>

                      {/* Valid Expiry Banner */}
                      <div className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-[10.5px] tracking-wider py-2 px-3 rounded-xl shadow flex items-center justify-center gap-2 select-none">
                        <span className="material-symbols-outlined text-[15px] font-black">calendar_today</span>
                        <span>VALID TILL: {form.validTo ? format(new Date(form.validTo), 'dd MMM yyyy').toUpperCase() : '31 DEC 2026'}</span>
                      </div>

                      {/* Premium Luggage SVGs illustration absolute in background */}
                      <svg className="absolute bottom-[44px] right-[-10px] w-[140px] h-[95px] opacity-90 pointer-events-none z-10" viewBox="0 0 140 95" fill="none">
                        {/* Boarding Pass */}
                        <g transform="rotate(-15, 60, 45)">
                          <rect x="35" y="10" width="70" height="40" rx="3" fill="#ffffff" />
                          <rect x="35" y="10" width="70" height="10" fill="#005B5C" rx="1.5" />
                          <circle cx="45" cy="15" r="2" fill="#ffffff" />
                          <path d="M43 15h15" stroke="#ffffff" strokeWidth="1" />
                          <rect x="40" y="24" width="30" height="3" rx="1" fill="#e2e8f0" />
                          <rect x="40" y="30" width="20" height="3" rx="1" fill="#e2e8f0" />
                          <line x1="88" y1="20" x2="88" y2="45" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="1.5,1.5" />
                          <rect x="92" y="22" width="2" height="18" fill="#1e293b" />
                          <rect x="96" y="22" width="1" height="18" fill="#1e293b" />
                          <rect x="99" y="22" width="3" height="18" fill="#1e293b" />
                          <rect x="103" y="22" width="1" height="18" fill="#1e293b" />
                        </g>
                        {/* Passport */}
                        <g transform="rotate(8, 85, 55)">
                          <rect x="70" y="25" width="45" height="60" rx="4" fill="#0E3E2B" stroke="#B08D3E" strokeWidth="1.5" />
                          <text x="92.5" y="38" fill="#B08D3E" fontSize="5" fontWeight="bold" fontFamily="serif" textAnchor="middle" letterSpacing="1">PASSPORT</text>
                          <circle cx="92.5" cy="55" r="9" stroke="#B08D3E" strokeWidth="1" fill="none" />
                          <circle cx="92.5" cy="55" r="6" stroke="#B08D3E" strokeWidth="0.7" fill="none" strokeDasharray="1,1" />
                          <ellipse cx="92.5" cy="55" rx="3" ry="9" stroke="#B08D3E" strokeWidth="0.7" fill="none" />
                          <ellipse cx="92.5" cy="55" rx="9" ry="3" stroke="#B08D3E" strokeWidth="0.7" fill="none" />
                        </g>
                        {/* Green/Teal Suitcase */}
                        <g transform="translate(10, 30)">
                          <rect x="10" y="15" width="70" height="48" rx="10" fill="#1E3E3F" stroke="#122728" strokeWidth="2" />
                          <rect x="14" y="19" width="62" height="40" rx="7" stroke="#2a5354" strokeWidth="1.5" fill="none" />
                          <path d="M10 25c0-5 5-10 10-10" stroke="#0f1f20" strokeWidth="3" fill="none" />
                          <path d="M80 25c0-5-5-10-10-10" stroke="#0f1f20" strokeWidth="3" fill="none" />
                          <path d="M10 53c0 5 5 10 10 10" stroke="#0f1f20" strokeWidth="3" fill="none" />
                          <path d="M80 53c0 5-5 10-10 10" stroke="#0f1f20" strokeWidth="3" fill="none" />
                          <path d="M35 15V8c0-2.2 1.8-4 4-4h12c2.2 0 4 1.8 4 4v7" stroke="#0f1f20" strokeWidth="4.5" fill="none" />
                          <rect x="33" y="12" width="6" height="4" rx="1" fill="#B08D3E" />
                          <rect x="51" y="12" width="6" height="4" rx="1" fill="#B08D3E" />
                          <rect x="24" y="15" width="6" height="48" fill="#122728" />
                          <rect x="60" y="15" width="6" height="48" fill="#122728" />
                          <rect x="23" y="30" width="8" height="6" fill="#B08D3E" rx="1" />
                          <rect x="59" y="30" width="8" height="6" fill="#B08D3E" rx="1" />
                          <rect x="36" y="28" width="18" height="18" rx="3" fill="#ffffff" />
                          <circle cx="45" cy="37" r="6" fill="#f97316" />
                          <path d="M42 35l6 4M42 39l6-4" stroke="#ffffff" strokeWidth="1.5" />
                          <circle cx="20" cy="50" r="4" fill="#E11D48" />
                          <rect x="54" y="48" width="10" height="6" rx="1" fill="#2563EB" transform="rotate(-10, 59, 51)" />
                        </g>
                      </svg>
                    </div>
                  </>
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
    </div>
  );
};
