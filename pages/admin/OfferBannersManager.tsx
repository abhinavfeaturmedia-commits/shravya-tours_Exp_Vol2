import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { OfferBanner } from '../../types';
import { api } from '../../src/lib/api';
import { toast } from 'sonner';

const EMPTY_FORM: Partial<OfferBanner> = {
  title: '',
  subtitle: '',
  imageUrl: '',
  linkUrl: '/packages',
  badgeText: 'BUCKET LIST SALE',
  tagList: 'BALI | THAILAND | VIETNAM | SINGAPORE | MALAYSIA | MALDIVES',
  sortOrder: 1,
  isActive: true,
};

export const OfferBannersManager: React.FC = () => {
  const { offerBanners, addOfferBanner, updateOfferBanner, deleteOfferBanner, refreshData } = useData();

  const [adminBanners, setAdminBanners] = useState<OfferBanner[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Partial<OfferBanner>>({ ...EMPTY_FORM });
  const [editId, setEditId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchAdminBanners = async () => {
    setLoading(true);
    try {
      const data = await api.getOfferBannersAdmin();
      setAdminBanners(data || []);
    } catch {
      setAdminBanners(offerBanners);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminBanners();
  }, [offerBanners]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const url = await api.uploadFile(file, 'banners');
      setForm(prev => ({ ...prev, imageUrl: url }));
      toast.success('Image uploaded successfully');
    } catch (err: any) {
      toast.error(err.message || 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (banner: OfferBanner) => {
    setForm({ ...banner });
    setEditId(banner.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setForm({ ...EMPTY_FORM });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title?.trim()) {
      toast.error('Please enter a banner title');
      return;
    }
    if (!form.imageUrl?.trim()) {
      toast.error('Please provide a banner image URL');
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        await updateOfferBanner(editId, form);
      } else {
        await addOfferBanner(form);
      }
      handleReset();
      await fetchAdminBanners();
      await refreshData();
    } catch (err: any) {
      // Toast handles error in DataContext
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this offer banner?')) return;
    try {
      await deleteOfferBanner(id);
      await fetchAdminBanners();
      await refreshData();
    } catch (err: any) {
      // Toast handles error in DataContext
    }
  };

  const handleToggleActive = async (banner: OfferBanner) => {
    try {
      await updateOfferBanner(banner.id, { isActive: !banner.isActive });
      await fetchAdminBanners();
      await refreshData();
    } catch (err: any) {
      // Toast handles error in DataContext
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C9732A]/10 text-[#C9732A] dark:bg-white/10 dark:text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
            <span className="material-symbols-outlined text-[14px]">local_offer</span>
            HOMEPAGE CMS MANAGER
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Promotional Offer Banners
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-light">
            Manage promotional sale banners, discounts, and destination tags rendered on the homepage carousel.
          </p>
        </div>

        <button
          onClick={() => {
            if (showForm) {
              handleReset();
            } else {
              setShowForm(true);
            }
          }}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#C9732A] text-white font-bold text-sm shadow-md hover:bg-[#b06120] transition-all shrink-0 active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">
            {showForm ? 'close' : 'add'}
          </span>
          {showForm ? 'Cancel' : 'Add New Offer Banner'}
        </button>
      </div>

      {/* Form Drawer / Container */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl space-y-6 animate-in slide-in-from-top duration-300">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {editId ? 'Edit Offer Banner' : 'Create New Offer Banner'}
            </h2>
            <span className="text-xs text-slate-400">MySQL Table: offer_banners</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Banner Title *
              </label>
              <input
                type="text"
                value={form.title || ''}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. INTERNATIONAL TOUR PACKAGES"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-[#C9732A]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Sale Badge Tag
              </label>
              <input
                type="text"
                value={form.badgeText || ''}
                onChange={e => setForm({ ...form, badgeText: e.target.value })}
                placeholder="e.g. BUCKET LIST SALE or FLAT 30% OFF"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-[#C9732A]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Subtitle / Offer Highlights
              </label>
              <input
                type="text"
                value={form.subtitle || ''}
                onChange={e => setForm({ ...form, subtitle: e.target.value })}
                placeholder="e.g. Value Add-ons Up to ₹5000* | Visa & Flight Assistance, Complimentary Upgrades"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-[#C9732A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Banner Image URL *
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={form.imageUrl || ''}
                  onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/... or /uploads/..."
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-[#C9732A]"
                  required
                />
                <label className="px-4 py-3 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 shrink-0 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                  {uploading ? 'Uploading...' : 'Upload'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Target Link URL
              </label>
              <input
                type="text"
                value={form.linkUrl || ''}
                onChange={e => setForm({ ...form, linkUrl: e.target.value })}
                placeholder="/packages?category=International"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-[#C9732A]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Destination Tags List (separated by |)
              </label>
              <input
                type="text"
                value={form.tagList || ''}
                onChange={e => setForm({ ...form, tagList: e.target.value })}
                placeholder="BALI | THAILAND | VIETNAM | SINGAPORE | MALAYSIA | MALDIVES"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-[#C9732A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Sort Order
              </label>
              <input
                type="number"
                value={form.sortOrder || 1}
                onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-[#C9732A]"
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive !== false}
                  onChange={e => setForm({ ...form, isActive: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C9732A]"></div>
              </label>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {form.isActive !== false ? 'Active (Displayed on Homepage)' : 'Inactive (Hidden)'}
              </span>
            </div>
          </div>

          {/* Banner Live Preview */}
          {form.imageUrl && (
            <div className="mt-4 p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Live Banner Preview</p>
              <div className="relative rounded-xl overflow-hidden shadow-lg h-44 sm:h-52 bg-slate-900">
                <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent p-6 flex flex-col justify-between text-white">
                  <div>
                    {form.badgeText && (
                      <span className="inline-block px-3 py-1 rounded-md bg-[#C9732A] text-[10px] font-black uppercase tracking-widest mb-2 shadow">
                        {form.badgeText}
                      </span>
                    )}
                    <h3 className="text-xl font-black">{form.title}</h3>
                    {form.subtitle && <p className="text-xs text-slate-200 mt-1">{form.subtitle}</p>}
                  </div>
                  {form.tagList && (
                    <p className="text-[10px] font-bold text-amber-300 tracking-wider uppercase truncate">
                      {form.tagList}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-3 rounded-xl border border-slate-300 dark:border-white/20 text-slate-700 dark:text-white font-bold text-sm hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 rounded-xl bg-[#C9732A] text-white font-bold text-sm shadow-lg hover:bg-[#b06120] transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : editId ? 'Update Banner' : 'Create Banner'}
            </button>
          </div>
        </form>
      )}

      {/* Banners List Table / Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            All Offer Banners ({adminBanners.length})
          </h3>
          <button
            onClick={fetchAdminBanners}
            className="text-xs font-bold text-[#C9732A] hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Refresh List
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading offer banners...</div>
        ) : adminBanners.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No offer banners created yet. Click "Add New Offer Banner" to create one.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {adminBanners.map((banner) => (
              <div key={banner.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-4 flex-1">
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    className="w-24 h-16 rounded-lg object-cover border border-slate-200 dark:border-white/10 shadow-sm shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        banner.isActive !== false ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {banner.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                      {banner.badgeText && (
                        <span className="px-2 py-0.5 rounded bg-[#C9732A]/15 text-[#C9732A] text-[10px] font-bold uppercase">
                          {banner.badgeText}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">Sort: {banner.sortOrder || 0}</span>
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-base mt-1">
                      {banner.title}
                    </h4>
                    {banner.subtitle && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-light truncate max-w-lg">
                        {banner.subtitle}
                      </p>
                    )}
                    {banner.tagList && (
                      <p className="text-[10px] font-mono text-amber-600 dark:text-amber-400 mt-1">
                        {banner.tagList}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                  <button
                    onClick={() => handleToggleActive(banner)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                      banner.isActive !== false
                        ? 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30'
                        : 'border-slate-300 text-slate-600 bg-slate-100 dark:bg-white/5'
                    }`}
                  >
                    {banner.isActive !== false ? 'Deactivate' : 'Activate'}
                  </button>

                  <button
                    onClick={() => handleEdit(banner)}
                    className="p-2 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                    title="Edit Banner"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>

                  <button
                    onClick={() => handleDelete(banner.id)}
                    className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title="Delete Banner"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
