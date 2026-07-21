import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Cohesive Toast Component
interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => (
  <div className={`fixed bottom-6 right-6 z-[250] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border animate-in slide-in-from-right-10 fade-in duration-300 ${
    type === 'success' 
      ? 'bg-white dark:bg-slate-800 border-green-500/50 text-green-700 dark:text-green-400' 
      : 'bg-white dark:bg-slate-800 border-red-500/50 text-red-700 dark:text-red-400'
  }`}>
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

// HSL Tailored Theme-Friendly Badges Config
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  Pending:   { label: 'Pending',   color: 'text-slate-600 dark:text-slate-300',  bg: 'bg-slate-100 dark:bg-slate-800/50',  border: 'border-slate-200 dark:border-slate-700/50', icon: 'hourglass_empty' },
  Submitted: { label: 'Submitted', color: 'text-amber-700 dark:text-amber-300',  bg: 'bg-amber-50 dark:bg-amber-950/20',  border: 'border-amber-250/50 dark:border-amber-900/30', icon: 'pending' },
  Verified:  { label: 'Verified',  color: 'text-emerald-700 dark:text-emerald-300',bg: 'bg-emerald-50 dark:bg-emerald-950/20',border: 'border-emerald-250/50 dark:border-emerald-900/30', icon: 'verified_user' },
  Rejected:  { label: 'Rejected',  color: 'text-rose-700 dark:text-rose-300',    bg: 'bg-rose-50 dark:bg-rose-950/20',    border: 'border-rose-250/50 dark:border-rose-900/30', icon: 'cancel' },
};

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-sky-600'
];

export const AdminKYCManager: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [allRecords, setAllRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'submitted' | 'company'>('submitted');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const token = localStorage.getItem('shravya_jwt');

  const fetchKYC = async () => {
    setLoading(true);
    try {
      // Fetch all submissions so we can calculate count cards dynamically
      const url = `${API_BASE}/api/admin/kyc`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setAllRecords(data.data || []);
    } catch (err: any) {
      setToast({ msg: 'Failed to fetch KYC records', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKYC();
  }, []);

  // Handle deep linking for pre-selecting a partner on load or records update
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const partnerIdParam = searchParams.get('partnerId');
    const searchParam = searchParams.get('search');
    
    if (partnerIdParam && allRecords.length > 0) {
      const found = allRecords.find(r => String(r.id) === String(partnerIdParam));
      if (found) {
        setSelected(found);
        setFilter('All');
      }
    } else if (searchParam) {
      setSearch(searchParam);
      setFilter('All');
    }
  }, [location.search, allRecords]);

  // Client-side filtering & sorting
  const filteredRecords = useMemo(() => {
    return allRecords.filter(r => {
      const matchStatus = filter === 'All' || r.kyc_status === filter;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        r.name?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        (r.company_name || '').toLowerCase().includes(q);
      return matchStatus && matchSearch;
    }).sort((a, b) => {
      if (sortKey === 'name') {
        return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      if (sortKey === 'submitted') {
        const da = a.kyc_submitted_at ? new Date(a.kyc_submitted_at).getTime() : 0;
        const db = b.kyc_submitted_at ? new Date(b.kyc_submitted_at).getTime() : 0;
        return sortOrder === 'asc' ? da - db : db - da;
      }
      if (sortKey === 'company') {
        const ca = a.company_name || '';
        const cb = b.company_name || '';
        return sortOrder === 'asc' ? ca.localeCompare(cb) : cb.localeCompare(ca);
      }
      return 0;
    });
  }, [allRecords, filter, search, sortKey, sortOrder]);

  const handleAction = async (partnerId: string, action: 'verify' | 'reject' | 'revoke') => {
    if (action === 'reject' && !rejectReason.trim()) {
      setToast({ msg: 'Please provide a reason for rejection.', type: 'error' });
      return;
    }
    if (action === 'revoke' && !revokeReason.trim()) {
      setToast({ msg: 'Please provide a reason for revoking KYC.', type: 'error' });
      return;
    }
    // I3: Guard — verify only on Submitted
    if (action === 'verify' && selected?.kyc_status !== 'Submitted') {
      setToast({ msg: `Cannot verify: partner KYC status is '${selected?.kyc_status}'. Only Submitted documents can be verified.`, type: 'error' });
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/partners/${partnerId}/kyc`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, reason: action === 'reject' ? rejectReason : action === 'revoke' ? revokeReason : undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ msg: action === 'verify' ? 'KYC verified successfully.' : action === 'reject' ? 'KYC submission rejected.' : 'KYC revoked and reset to Pending.', type: 'success' });
        setSelected(null);
        setRejectReason('');
        setRevokeReason('');
        fetchKYC();
      } else {
        throw new Error(data.error || 'Action failed');
      }
    } catch (err: any) {
      setToast({ msg: err.message || 'Failed to complete action.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const getInitials = (name: string) => name ? name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() : '?';
  const getAvatarColor = (id: string) => AVATAR_COLORS[id.charCodeAt(id.length - 1) % AVATAR_COLORS.length];

  const handleCopyToClipboard = (val: string, label: string) => {
    navigator.clipboard.writeText(val);
    setToast({ msg: `${label} copied to clipboard!`, type: 'success' });
  };

  const FILTERS = ['All', 'Submitted', 'Pending', 'Verified', 'Rejected'];

  const DocImage: React.FC<{ url?: string | null; label: string }> = ({ url, label }) => {
    if (!url) return (
      <div className="flex flex-col items-center gap-1.5 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/50 dark:border-slate-800 border-dashed text-center min-h-[100px] justify-center">
        <span className="material-symbols-outlined text-slate-400 dark:text-slate-600 text-2xl">hide_image</span>
        <p className="text-slate-400 dark:text-slate-550 text-xs font-medium">{label} — Not uploaded</p>
      </div>
    );
    const isPdf = url.endsWith('.pdf');
    return (
      <div className="flex flex-col gap-1.5 w-full">
        <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">{label}</p>
        {isPdf ? (
          <a href={url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-all text-violet-600 dark:text-violet-400 text-xs font-bold">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
              Open PDF Document
            </span>
            <span className="material-symbols-outlined text-sm">open_in_new</span>
          </a>
        ) : (
          <div className="relative group overflow-hidden rounded-xl border border-slate-200 dark:border-slate-850 h-28 w-full bg-slate-100 dark:bg-slate-900 cursor-zoom-in" onClick={() => setLightbox(url)}>
            <img src={url} alt={label} className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
              <span className="material-symbols-outlined text-white text-lg">zoom_in</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col bg-slate-50 dark:bg-slate-900 min-h-full relative transition-colors duration-200">
      {/* Toast */}
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[250] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 p-2 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <img src={lightbox} alt="Document preview" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
            <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 size-10 bg-black/60 hover:bg-black text-white rounded-full flex items-center justify-center transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Sticky Top Header */}
      <div className="px-6 py-5 md:px-8 bg-white dark:bg-[#1A2633] border-b border-slate-200 dark:border-slate-800 shrink-0 shadow-sm transition-all duration-200">
        <div className="flex items-center gap-3 mb-1">
          {/* U6: Back navigation to Partner Manager */}
          <button
            onClick={() => navigate('/admin/partners')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Partner Manager
          </button>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">KYC Management</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">KYC Management</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Review, verify, and manage partner onboarding documents.</p>
      </div>

      {/* Main Body Content */}
      <div className="p-6 md:p-8 space-y-6 flex-1">

        {/* Global Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[
            { key: 'Submitted', label: 'Submitted (Awaiting)', color: 'amber', icon: 'pending' },
            { key: 'Pending', label: 'Draft / Pending Upload', color: 'slate', icon: 'hourglass_empty' },
            { key: 'Verified', label: 'Verified', color: 'emerald', icon: 'verified_user' },
            { key: 'Rejected', label: 'Rejected', color: 'rose', icon: 'cancel' }
          ].map(s => {
            const cnt = allRecords.filter(r => r.kyc_status === s.key).length;
            const active = filter === s.key;
            
            let colorStyles = '';
            if (s.color === 'amber') colorStyles = active ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1A2633]';
            if (s.color === 'slate') colorStyles = active ? 'border-slate-500 bg-slate-50 dark:bg-slate-800/20' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1A2633]';
            if (s.color === 'emerald') colorStyles = active ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1A2633]';
            if (s.color === 'rose') colorStyles = active ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1A2633]';

            return (
              <div 
                key={s.key} 
                className={`border rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all active:scale-[0.99] flex items-center justify-between ${colorStyles}`}
                onClick={() => setFilter(s.key)}
              >
                <div>
                  <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{cnt}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">{s.label}</p>
                </div>
                <div className={`size-10 rounded-xl flex items-center justify-center ${
                  s.color === 'amber' ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400' :
                  s.color === 'slate' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' :
                  s.color === 'emerald' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' :
                  'bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400'
                }`}>
                  <span className="material-symbols-outlined text-xl">{s.icon}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filter and Search Toolbar */}
        <div className="bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
          {/* Tabs Filter */}
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/30 overflow-x-auto custom-scrollbar">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider shrink-0 ${
                  filter === f
                    ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-300 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-250'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Search & Sort Panel */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64 min-w-[200px]">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 dark:text-slate-550 text-sm">search</span>
              <input
                type="text"
                placeholder="Search partner or company..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-violet-500/20 text-slate-900 dark:text-white placeholder:text-slate-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <span className="material-symbols-outlined text-sm">cancel</span>
                </button>
              )}
            </div>

            {/* Sort Panel */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold uppercase shrink-0">Sort</span>
              <select
                value={sortKey}
                onChange={e => setSortKey(e.target.value as any)}
                className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="submitted">Date Submitted</option>
                <option value="name">Name</option>
                <option value="company">Company</option>
              </select>
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <span className="material-symbols-outlined text-base leading-none">
                  {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="size-9 border-2 border-violet-500/20 border-t-violet-600 rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Loading submissions...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-5xl mb-3">verified_user</span>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">No KYC submissions found</p>
              <p className="text-slate-400 dark:text-slate-550 text-xs mt-1">Try resetting search query or tab filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    <th className="px-6 py-4 text-left">Partner Details</th>
                    <th className="px-6 py-4 text-left">KYC Status</th>
                    <th className="px-6 py-4 text-left">PAN Number</th>
                    <th className="px-6 py-4 text-left">Bank Status</th>
                    <th className="px-6 py-4 text-left">Submitted On</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredRecords.map(r => {
                    const cfg = STATUS_CONFIG[r.kyc_status] || STATUS_CONFIG.Pending;
                    const bd = r.bank_details || {};
                    const bankComplete = !!(bd.accountName && bd.accountNumber && bd.bankName && bd.ifsc);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`size-10 rounded-xl bg-gradient-to-br ${getAvatarColor(r.id)} flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm`}>
                              {getInitials(r.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white leading-snug">{r.name}</p>
                              <p className="text-slate-400 dark:text-slate-500 text-xs">{r.email}</p>
                              {r.company_name && (
                                <p className="text-violet-550 dark:text-violet-400 text-[10px] font-bold mt-0.5 uppercase tracking-wide">
                                  {r.company_name}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                            <span className="material-symbols-outlined text-[15px]">{cfg.icon}</span>
                            {cfg.label}
                          </span>
                          {r.kyc_status === 'Rejected' && r.kyc_rejection_reason && (
                            <p className="text-rose-500/80 text-[10px] font-semibold mt-1 max-w-[160px] truncate" title={r.kyc_rejection_reason}>
                              Reason: {r.kyc_rejection_reason}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                            {r.kyc_pan_number || '—'}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {r.kyc_pan_front_url ? 'Files uploaded' : 'No document file'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            bankComplete 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' 
                              : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30'
                          }`}>
                            {bankComplete ? '✓ COMPLETE' : '✗ INCOMPLETE'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">
                          {r.kyc_submitted_at ? new Date(r.kyc_submitted_at).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          }) : '—'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => setSelected(r)}
                            className="px-3.5 py-2 bg-violet-50 hover:bg-violet-100 dark:bg-violet-955/30 dark:hover:bg-violet-950/60 border border-violet-200 dark:border-violet-850 text-violet-600 dark:text-violet-400 text-xs font-bold rounded-xl transition-all"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Document Review Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-in fade-in"
            onClick={() => { setSelected(null); setRejectReason(''); }}
          />
          {/* Slide Drawer Content */}
          <div className="relative w-full max-w-xl bg-white dark:bg-[#1A2633] border-l border-slate-200 dark:border-slate-800 shadow-2xl h-full flex flex-col z-10 animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="sticky top-0 bg-white/95 dark:bg-[#1A2633]/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 p-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className={`size-10 rounded-xl bg-gradient-to-br ${getAvatarColor(selected.id)} flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm`}>
                  {getInitials(selected.name)}
                </div>
                <div>
                  <h2 className="text-slate-900 dark:text-white font-black text-base">{selected.name}</h2>
                  <p className="text-slate-550 dark:text-slate-400 text-xs">{selected.email} {selected.phone ? `· ${selected.phone}` : ''}</p>
                </div>
              </div>
              <button 
                onClick={() => { setSelected(null); setRejectReason(''); }}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
              {/* Current Status Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-550 font-extrabold uppercase tracking-wider">KYC Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    {(() => {
                      const cfg = STATUS_CONFIG[selected.kyc_status] || STATUS_CONFIG.Pending;
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black ${cfg.bg} ${cfg.color} ${cfg.border} border`}>
                          {cfg.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                {selected.kyc_submitted_at && (
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] text-slate-400 dark:text-slate-550 font-extrabold uppercase tracking-wider">Submitted At</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-350 mt-1">
                      {new Date(selected.kyc_submitted_at).toLocaleString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
              </div>

              {/* Bank Details */}
              <div className="space-y-3">
                <h3 className="text-slate-900 dark:text-white font-black text-sm flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="material-symbols-outlined text-violet-500 text-lg">account_balance</span>
                  Bank Details
                </h3>
                {selected.bank_details ? (
                  <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-850 p-4 space-y-2 text-xs">
                    {[
                      { label: 'Holder Name', val: selected.bank_details.accountName },
                      { label: 'Account Number', val: selected.bank_details.accountNumber, isMono: true },
                      { label: 'Bank Name', val: selected.bank_details.bankName },
                      { label: 'IFSC Code', val: selected.bank_details.ifsc, isMono: true },
                      { label: 'UPI ID', val: selected.bank_details.upi || '—', isMono: !!selected.bank_details.upi }
                    ].map(f => (
                      <div key={f.label} className="flex items-center justify-between py-1 group/field">
                        <span className="text-slate-400 dark:text-slate-500 font-semibold">{f.label}:</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold text-slate-850 dark:text-slate-200 ${f.isMono ? 'font-mono tracking-wide' : ''}`}>
                            {f.val}
                          </span>
                          {f.val && f.val !== '—' && (
                            <button 
                              onClick={() => handleCopyToClipboard(f.val, f.label)}
                              className="text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 p-0.5 rounded opacity-0 group-hover/field:opacity-100 transition-all"
                              title="Copy Field"
                            >
                              <span className="material-symbols-outlined text-xs">content_copy</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-rose-50 text-rose-700 border border-rose-200/50 dark:bg-rose-955/25 dark:text-rose-400 dark:border-rose-900/30 rounded-2xl p-4 flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-lg">warning</span>
                    <p className="text-xs font-semibold leading-normal">
                      Bank account details have not been submitted by the partner yet.
                    </p>
                  </div>
                )}
              </div>

              {/* PAN Card Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h3 className="text-slate-900 dark:text-white font-black text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-500 text-lg">credit_card</span>
                    PAN Card Details
                  </h3>
                  {selected.kyc_pan_number && (
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs font-extrabold text-slate-800 dark:text-slate-200 bg-slate-150 dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
                        {selected.kyc_pan_number}
                      </span>
                      <button 
                        onClick={() => handleCopyToClipboard(selected.kyc_pan_number, 'PAN Number')}
                        className="text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 p-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">content_copy</span>
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <DocImage url={selected.kyc_pan_front_url} label="PAN Front Side" />
                  <DocImage url={selected.kyc_pan_back_url} label="PAN Back Side" />
                </div>
              </div>

              {/* Aadhaar Card Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h3 className="text-slate-900 dark:text-white font-black text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-500 text-lg">badge</span>
                    Aadhaar Card Details
                  </h3>
                  {selected.kyc_aadhaar_number && (
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs font-extrabold text-slate-800 dark:text-slate-200 bg-slate-150 dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
                        {selected.kyc_aadhaar_number}
                      </span>
                      <button 
                        onClick={() => handleCopyToClipboard(selected.kyc_aadhaar_number, 'Aadhaar Number')}
                        className="text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 p-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">content_copy</span>
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <DocImage url={selected.kyc_aadhaar_front_url} label="Aadhaar Front Side" />
                  <DocImage url={selected.kyc_aadhaar_back_url} label="Aadhaar Back Side" />
                </div>
              </div>

              {/* Optional / Additional Docs */}
              {(selected.kyc_passport_url || selected.kyc_dl_url) && (
                <div className="space-y-3">
                  <h3 className="text-slate-900 dark:text-white font-black text-sm flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="material-symbols-outlined text-purple-500 text-lg">folder</span>
                    Additional Documents
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selected.kyc_passport_url && <DocImage url={selected.kyc_passport_url} label="Passport" />}
                    {selected.kyc_dl_url && <DocImage url={selected.kyc_dl_url} label="Driving Licence" />}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Actions Footer */}
            <div className="sticky bottom-0 bg-slate-50 dark:bg-[#151F2A] border-t border-slate-200 dark:border-slate-800 p-5 shrink-0 z-10">
              {selected.kyc_status === 'Submitted' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest block mb-1.5 ml-1">
                      Rejection Reason (Required for Reject only)
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="Specify the reason why these documents are being rejected..."
                      rows={3}
                      className="w-full px-4 py-3 bg-white dark:bg-[#1A2633] border border-slate-250 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-rose-500/20 resize-none transition-all"
                    />
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleAction(selected.id, 'reject')}
                      disabled={actionLoading || !rejectReason.trim()}
                      className="flex-1 h-11 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-400 font-bold rounded-xl transition-all disabled:opacity-45 flex items-center justify-center gap-1.5 uppercase text-xs tracking-wider"
                    >
                      {actionLoading ? <div className="size-4 border-2 border-rose-500/30 border-t-rose-600 rounded-full animate-spin" /> : <>✕ Reject KYC</>}
                    </button>
                    <button
                      onClick={() => handleAction(selected.id, 'verify')}
                      disabled={actionLoading}
                      className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/10 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5 uppercase text-xs tracking-wider"
                    >
                      {actionLoading ? <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>✓ Verify KYC</>}
                    </button>
                  </div>
                </div>
              )}
              {/* I5: Revoke action for Verified partners */}
              {selected.kyc_status === 'Verified' && (
                <div className="space-y-3">
                  <div className="bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl p-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-2xl">check_circle</span>
                    <div className="text-left flex-1">
                      <p className="text-emerald-800 dark:text-emerald-400 font-black text-sm">KYC Documents Verified</p>
                      <p className="text-slate-450 dark:text-slate-505 text-[10px] font-semibold mt-0.5">
                        Approved by {selected.kyc_verified_by || 'Admin'} on {selected.kyc_verified_at ? new Date(selected.kyc_verified_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        }) : '—'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Revoke Reason (Required)</label>
                    <textarea
                      value={revokeReason}
                      onChange={e => setRevokeReason(e.target.value)}
                      placeholder="Reason for revoking KYC verification (e.g. fraud, document mismatch)..."
                      rows={2}
                      className="w-full px-4 py-3 bg-white dark:bg-[#1A2633] border border-slate-250 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-amber-500/20 resize-none transition-all"
                    />
                  </div>
                  <button
                    onClick={() => handleAction(selected.id, 'revoke')}
                    disabled={actionLoading || !revokeReason.trim()}
                    className="w-full h-10 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 font-bold rounded-xl text-xs tracking-wider uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {actionLoading ? <div className="size-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /> : <>⚠ Revoke KYC Verification</>}
                  </button>
                </div>
              )}
              {/* Pending / Rejected — no actions available */}
              {(selected.kyc_status === 'Pending' || selected.kyc_status === 'Rejected') && (
                <div className="bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-center">
                  <span className="material-symbols-outlined text-slate-400 text-2xl mb-2 block">
                    {selected.kyc_status === 'Pending' ? 'hourglass_empty' : 'cancel'}
                  </span>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">
                    {selected.kyc_status === 'Pending'
                      ? 'Partner has not yet submitted documents.'
                      : `KYC Rejected — Reason: ${selected.kyc_rejection_reason || '—'}`
                    }
                  </p>
                  {selected.kyc_resubmission_count > 0 && (
                    <p className="text-amber-500 text-xs mt-1 font-bold">🔄 {selected.kyc_resubmission_count} resubmission(s)</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
