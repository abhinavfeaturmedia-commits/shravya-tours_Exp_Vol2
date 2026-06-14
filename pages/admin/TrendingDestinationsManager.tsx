import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { TrendingDestination } from '../../types';
import { api } from '../../src/lib/api';
import { toast } from 'sonner';

const BADGE_PRESETS = [
  { label: 'Hot', color: '#ef4444' },
  { label: 'Trending', color: '#8b5cf6' },
  { label: 'Most Popular', color: '#f59e0b' },
  { label: 'Top Rated', color: '#10b981' },
  { label: 'International', color: '#3b82f6' },
  { label: 'Adventure', color: '#06b6d4' },
  { label: 'Luxury', color: '#f59e0b' },
  { label: 'Cultural', color: '#ec4899' },
  { label: 'New', color: '#22c55e' },
];

const EMPTY_FORM: Partial<TrendingDestination> = {
  name: '',
  country: '',
  region: '',
  imageUrl: '',
  badge: '',
  badgeColor: '#ef4444',
  statLabel: '',
  packageCount: 0,
  sortOrder: 0,
  isActive: true,
};

export const TrendingDestinationsManager: React.FC = () => {
  const { trendingDestinations, addTrendingDestination, updateTrendingDestination, deleteTrendingDestination, refreshData } = useData();

  const [form, setForm] = useState<Partial<TrendingDestination>>({ ...EMPTY_FORM });
  const [editId, setEditId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Load all (including inactive) from admin endpoint
  const [adminDests, setAdminDests] = useState<TrendingDestination[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);

  React.useEffect(() => {
    setLoadingAll(true);
    api.getTrendingDestinationsAdmin()
      .then(data => setAdminDests(data || []))
      .catch(() => setAdminDests(trendingDestinations))
      .finally(() => setLoadingAll(false));
  }, [trendingDestinations]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const url = await api.uploadFile(file, 'trending');
      setForm(prev => ({ ...prev, imageUrl: url }));
      toast.success('Image uploaded');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (dest: TrendingDestination) => {
    setForm({ ...dest });
    setEditId(dest.id);
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
    if (!form.name || !form.imageUrl) {
      toast.error('Name and image are required');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await updateTrendingDestination(editId, form);
      } else {
        const newDest: TrendingDestination = {
          id: `TD-${Date.now()}`,
          name: form.name!,
          country: form.country,
          region: form.region,
          imageUrl: form.imageUrl!,
          badge: form.badge,
          badgeColor: form.badgeColor,
          statLabel: form.statLabel,
          packageCount: form.packageCount,
          sortOrder: form.sortOrder,
          isActive: form.isActive !== false,
        };
        await addTrendingDestination(newDest);
      }
      // Refresh admin list
      const updated = await api.getTrendingDestinationsAdmin();
      setAdminDests(updated);
      handleReset();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await deleteTrendingDestination(id);
    setAdminDests(prev => prev.filter(d => d.id !== id));
  };

  const handleToggleActive = async (dest: TrendingDestination) => {
    await updateTrendingDestination(dest.id, { isActive: !dest.isActive });
    setAdminDests(prev => prev.map(d => d.id === dest.id ? { ...d, isActive: !d.isActive } : d));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Trending Destinations</h1>
          <p className="text-slate-500 text-sm mt-1">Manage destinations shown on the Home page fan carousel.</p>
        </div>
        <button
          onClick={() => { handleReset(); setShowForm(true); }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Destination
        </button>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
            {editId ? 'Edit Destination' : 'New Destination'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Destination Name *
              </label>
              <input
                type="text"
                value={form.name || ''}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Goa"
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Country</label>
              <input
                type="text"
                value={form.country || ''}
                onChange={e => setForm(prev => ({ ...prev, country: e.target.value }))}
                placeholder="e.g. India"
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Region */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Region / State</label>
              <input
                type="text"
                value={form.region || ''}
                onChange={e => setForm(prev => ({ ...prev, region: e.target.value }))}
                placeholder="e.g. South India"
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Stat Label */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Stat Label</label>
              <input
                type="text"
                value={form.statLabel || ''}
                onChange={e => setForm(prev => ({ ...prev, statLabel: e.target.value }))}
                placeholder="e.g. 8,200+ travelers visited"
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Package Count */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Package Count</label>
              <input
                type="number"
                value={form.packageCount || 0}
                onChange={e => setForm(prev => ({ ...prev, packageCount: Number(e.target.value) }))}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Sort Order</label>
              <input
                type="number"
                value={form.sortOrder || 0}
                onChange={e => setForm(prev => ({ ...prev, sortOrder: Number(e.target.value) }))}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Badge */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Badge Text</label>
              <div className="flex gap-2 flex-wrap mb-2">
                {BADGE_PRESETS.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, badge: p.label, badgeColor: p.color }))}
                    className="px-2.5 py-1 rounded-full text-white text-xs font-bold transition-all hover:scale-105"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={form.badge || ''}
                onChange={e => setForm(prev => ({ ...prev, badge: e.target.value }))}
                placeholder="or type custom badge"
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Badge Color */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Badge Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.badgeColor || '#ef4444'}
                  onChange={e => setForm(prev => ({ ...prev, badgeColor: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={form.badgeColor || '#ef4444'}
                  onChange={e => setForm(prev => ({ ...prev, badgeColor: e.target.value }))}
                  className="flex-1 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="#ef4444"
                />
              </div>
            </div>
          </div>

          {/* Image Upload */}
          <div className="mt-5">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Destination Image * <span className="font-normal text-slate-400">(Upload or paste URL)</span>
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={form.imageUrl || ''}
                onChange={e => setForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                placeholder="https://... or upload a file"
                className="flex-1 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <label className="cursor-pointer flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors border border-slate-300 dark:border-slate-600">
                {uploading ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : <span className="material-symbols-outlined text-[18px]">upload</span>}
                Upload
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
            {form.imageUrl && (
              <div className="mt-3 relative w-32 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600">
                <img src={form.imageUrl} alt="preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Active toggle */}
          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, isActive: !prev.isActive }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {form.isActive ? 'Active (visible on Home)' : 'Inactive (hidden)'}
            </span>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {saving ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : <span className="material-symbols-outlined text-[18px]">save</span>}
              {editId ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={handleReset} className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Destinations Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h2 className="font-bold text-slate-900 dark:text-white">All Destinations ({adminDests.length})</h2>
          <button onClick={() => { setLoadingAll(true); api.getTrendingDestinationsAdmin().then(setAdminDests).finally(() => setLoadingAll(false)); }} className="text-slate-400 hover:text-primary transition-colors" title="Refresh">
            <span className={`material-symbols-outlined ${loadingAll ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 w-16">Image</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Region</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Badge</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Sort</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {adminDests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    {loadingAll ? 'Loading...' : 'No destinations yet. Click "Add Destination" to get started.'}
                  </td>
                </tr>
              ) : adminDests.map(dest => (
                <tr key={dest.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="w-12 h-9 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700">
                      <img src={dest.imageUrl} alt={dest.name} className="w-full h-full object-cover" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900 dark:text-white">{dest.name}</div>
                    <div className="text-xs text-slate-400">{dest.country}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{dest.region || '—'}</td>
                  <td className="px-4 py-3">
                    {dest.badge ? (
                      <span className="px-2 py-0.5 rounded-full text-white text-[10px] font-bold" style={{ backgroundColor: dest.badgeColor || '#ef4444' }}>
                        {dest.badge}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{dest.sortOrder ?? 0}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(dest)}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${dest.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}
                    >
                      {dest.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(dest)} className="text-primary hover:text-primary/80 transition-colors" title="Edit">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button onClick={() => handleDelete(dest.id, dest.name)} className="text-red-400 hover:text-red-600 transition-colors" title="Delete">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-4 text-center">
        Changes are saved to MySQL and reflected live on the Home page after the next data refresh (~1.5s delay).
      </p>
    </div>
  );
};
