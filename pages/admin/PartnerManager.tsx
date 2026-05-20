import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function adminFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('shravya_jwt');
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as any || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

const statusBadge: Record<string, string> = {
  'Pending Approval': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  Active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  Blocked: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const AVATAR_COLORS = ['from-violet-500 to-purple-600','from-blue-500 to-indigo-600','from-emerald-500 to-teal-600','from-amber-500 to-orange-600','from-rose-500 to-pink-600','from-cyan-500 to-sky-600'];
const getInitials = (name: string) => name ? name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() : '?';
const getAvatarColor = (id: string) => AVATAR_COLORS[id.charCodeAt(id.length - 1) % AVATAR_COLORS.length];

const PartnerTable: React.FC<{
  partners: any[]; search: string; statusFilter: string;
  setSearch: (v: string) => void; setStatusFilter: (v: string) => void;
  statusBadge: Record<string, string>;
  handleApprove: (id: string) => void; handleBlock: (id: string) => void;
  handleDelete: (id: string) => void; openEdit: (p: any) => void;
}> = ({ partners, search, statusFilter, setSearch, setStatusFilter, statusBadge, handleApprove, handleBlock, handleDelete, openEdit }) => {
  const filtered = partners.filter(p => {
    const q = search.toLowerCase();
    const matchQ = !q || p.name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q) || (p.company_name || '').toLowerCase().includes(q);
    const matchS = statusFilter === 'All' || p.status === statusFilter;
    return matchQ && matchS;
  });
  return (
    <div className="bg-white dark:bg-[#1A2633]/80 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
      <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_120px_170px] gap-4 px-6 py-3 bg-slate-50 dark:bg-white/[0.03] border-b border-slate-100 dark:border-white/5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
        <span>Partner</span><span>Commission</span><span>Activity</span><span>Earnings</span><span>Status</span><span className="text-right">Actions</span>
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <span className="material-symbols-outlined text-5xl text-slate-200 dark:text-white/10 block mb-3">{partners.length === 0 ? 'handshake' : 'search_off'}</span>
          <p className="text-slate-500 dark:text-slate-400 font-semibold">{partners.length === 0 ? 'No partners registered yet' : 'No partners match your search'}</p>
          {partners.length > 0 && <button onClick={() => { setSearch(''); setStatusFilter('All'); }} className="mt-3 text-violet-500 text-sm hover:underline">Clear filters</button>}
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {filtered.map((p: any) => {
            const convPct = p.total_leads_submitted > 0 ? Math.round((p.total_bookings_converted / p.total_leads_submitted) * 100) : 0;
            return (
              <div key={p.id} className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_1fr_120px_170px] gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors items-center">
                <div className="flex items-center gap-3">
                  <div className={`size-10 rounded-xl bg-gradient-to-br ${getAvatarColor(p.id)} flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md`}>{getInitials(p.name)}</div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{p.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{p.email}</p>
                    {p.company_name && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{p.company_name}{p.location ? ` · ${p.location}` : ''}</p>}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-black text-violet-600 dark:text-violet-400">{p.commission_type === 'Percentage' ? `${p.commission_value}%` : `₹${p.commission_value}`}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">{p.commission_type}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{p.total_leads_submitted} leads · {p.total_bookings_converted} booked</p>
                  <div className="mt-1.5 h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden w-24">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full" style={{ width: `${convPct}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{convPct}% conversion</p>
                </div>
                <div>
                  <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">₹{Number(p.total_earnings).toLocaleString('en-IN')}</p>
                  {Number(p.pending_payout) > 0 && <p className="text-[11px] text-amber-500">₹{Number(p.pending_payout).toLocaleString('en-IN')} pending</p>}
                </div>
                <div>
                  <span className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-bold border ${statusBadge[p.status] || 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-white/10 dark:text-white/50 dark:border-white/10'}`}>
                    <span className={`size-1.5 rounded-full ${p.status === 'Active' ? 'bg-emerald-400' : p.status === 'Blocked' ? 'bg-red-400' : 'bg-amber-400'} animate-pulse`} />
                    {p.status}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {p.status === 'Pending Approval' && (
                    <button onClick={() => handleApprove(p.id)} className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all hover:shadow-lg hover:shadow-emerald-500/25 active:scale-95">
                      <span className="material-symbols-outlined text-[14px]">check</span>Approve
                    </button>
                  )}
                  <button onClick={() => openEdit(p)} className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded-lg text-xs font-bold transition-all active:scale-95">
                    <span className="material-symbols-outlined text-[14px]">edit</span>Edit
                  </button>
                  {p.status === 'Active' && (
                    <button onClick={() => handleBlock(p.id)} className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs font-bold transition-all active:scale-95">
                      <span className="material-symbols-outlined text-[14px]">block</span>Block
                    </button>
                  )}
                  <button onClick={() => handleDelete(p.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all active:scale-95">
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </div>
        </div>
    </div>
  );
};

export const PartnerManager: React.FC = () => {
  const [partners, setPartners] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [tab, setTab] = useState<'partners' | 'payouts'>('partners');
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ commissionType: 'Percentage', commissionValue: 5, status: 'Active', notes: '' });
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', phone: '', companyName: '', location: '', commissionType: 'Percentage', commissionValue: 5, status: 'Active' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [partData, commData] = await Promise.all([
        adminFetch('/api/admin/partners'),
        adminFetch('/api/admin/partner-commissions'),
      ]);
      setPartners(partData.data || []);
      setCommissions(commData.data || []);
    } catch (e: any) {
      console.error(e);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500); };

  const handleApprove = async (id: string) => {
    await adminFetch(`/api/admin/partners/${id}/approve`, { method: 'PATCH' });
    showMsg('Partner approved successfully'); load();
  };
  const handleBlock = async (id: string) => {
    if (!window.confirm('Block this partner?')) return;
    await adminFetch(`/api/admin/partners/${id}/block`, { method: 'PATCH' });
    showMsg('Partner blocked'); load();
  };
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this partner permanently?')) return;
    await adminFetch(`/api/admin/partners/${id}`, { method: 'DELETE' });
    showMsg('Partner deleted'); load();
  };
  const openEdit = (p: any) => {
    setSelectedPartner(p);
    setEditForm({ commissionType: p.commission_type, commissionValue: p.commission_value, status: p.status, notes: p.notes || '' });
    setEditModal(true);
  };
  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await adminFetch(`/api/admin/partners/${selectedPartner.id}`, { method: 'PUT', body: JSON.stringify(editForm) });
      setEditModal(false); showMsg('Partner updated'); load();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const saveAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await adminFetch('/api/admin/partners', { method: 'POST', body: JSON.stringify(addForm) });
      setAddModal(false); showMsg('Partner added successfully'); load();
      setAddForm({ name: '', email: '', password: '', phone: '', companyName: '', location: '', commissionType: 'Percentage', commissionValue: 5, status: 'Active' });
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleCommission = async (id: string, action: 'approve' | 'pay' | 'reject') => {
    await adminFetch(`/api/admin/partner-commissions/${id}/${action}`, { method: 'PATCH' });
    showMsg(`Commission ${action === 'pay' ? 'marked as paid' : action + 'd'}`); load();
  };

  const pendingCount = partners.filter(p => p.status === 'Pending Approval').length;
  const pendingPayoutTotal = commissions.filter(c => c.status === 'Approved').reduce((s: number, c: any) => s + Number(c.commission_amount), 0);

  const commStatusBadge: Record<string, string> = {
    Pending: 'bg-amber-500/20 text-amber-300',
    Approved: 'bg-blue-500/20 text-blue-300',
    Paid: 'bg-emerald-500/20 text-emerald-300',
    Rejected: 'bg-red-500/20 text-red-300',
  };

  const inputClass = "w-full h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all";

  return (
    <div className="px-6 lg:px-8 py-6 max-w-[1600px] mx-auto w-full space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Partner Management</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage B2B partners, commissions &amp; payouts</p>
        </div>
        <div className="flex gap-3 items-center">
          <button onClick={() => setAddModal(true)} className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-violet-500/25 transition-all active:scale-[0.98]">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Partner
          </button>
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold px-3 py-2 rounded-xl">
              <span className="material-symbols-outlined text-[16px]">pending</span>
              {pendingCount} pending approval
            </div>
          )}
          {pendingPayoutTotal > 0 && (
            <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-bold px-3 py-2 rounded-xl">
              <span className="material-symbols-outlined text-[16px]">payments</span>
              ₹{pendingPayoutTotal.toLocaleString('en-IN')} to pay
            </div>
          )}
        </div>
      </div>

      {msg && <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm px-4 py-3 rounded-xl"><span className="material-symbols-outlined text-[18px]">check_circle</span>{msg}</div>}

      {/* Stats */}
      {(() => {
        const totalPayout = commissions.reduce((s: number, c: any) => s + Number(c.commission_amount), 0);
        const convRate = partners.length > 0 ? Math.round((partners.filter((p:any) => p.status === 'Active').length / partners.length) * 100) : 0;
        const stats = [
          { label: 'Total Partners', value: partners.length, sub: `${convRate}% active rate`, icon: 'handshake', color: 'from-violet-500 to-purple-600', bg: 'from-violet-500/10 to-purple-500/5', border: 'border-violet-500/20' },
          { label: 'Active Partners', value: partners.filter((p:any) => p.status === 'Active').length, sub: 'Approved & earning', icon: 'verified', color: 'from-emerald-500 to-teal-600', bg: 'from-emerald-500/10 to-teal-500/5', border: 'border-emerald-500/20' },
          { label: 'Pending Approval', value: pendingCount, sub: pendingCount > 0 ? 'Action required' : 'All reviewed', icon: 'pending_actions', color: 'from-amber-500 to-orange-600', bg: 'from-amber-500/10 to-orange-500/5', border: 'border-amber-500/20' },
          { label: 'Total Payout Pool', value: `₹${totalPayout.toLocaleString('en-IN')}`, sub: `${commissions.length} commissions`, icon: 'account_balance_wallet', color: 'from-blue-500 to-indigo-600', bg: 'from-blue-500/10 to-indigo-500/5', border: 'border-blue-500/20' },
        ];
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map(s => (
              <div key={s.label} className={`bg-gradient-to-br ${s.bg} border ${s.border} rounded-2xl p-5 relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
                <div className={`size-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3 shadow-lg`}>
                  <span className="material-symbols-outlined text-white text-[20px]">{s.icon}</span>
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{s.value}</p>
                <p className="text-slate-700 dark:text-slate-300 text-xs font-semibold mt-0.5">{s.label}</p>
                <p className="text-slate-500 dark:text-slate-500 text-[10px] mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-slate-100 dark:bg-[#1A2633] border border-slate-200 dark:border-white/10 rounded-xl p-1">
          {(['partners', 'payouts'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                tab === t ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}>
              {t === 'payouts' ? 'Commission Payouts' : `Partners ${partners.length > 0 ? `(${partners.length})` : ''}`}
            </button>
          ))}
        </div>
        {tab === 'partners' && (
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[18px]">search</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search partners…"
                className="w-full h-9 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="h-9 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all">
              <option>All</option><option>Active</option><option>Pending Approval</option><option>Blocked</option>
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="size-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : tab === 'partners' ? (
        <PartnerTable
          partners={partners}
          search={search}
          statusFilter={statusFilter}
          setSearch={setSearch}
          setStatusFilter={setStatusFilter}
          statusBadge={statusBadge}
          handleApprove={handleApprove}
          handleBlock={handleBlock}
          handleDelete={handleDelete}
          openEdit={openEdit}
        />
      ) : (
        /* Payouts Tab */
        <div className="bg-white dark:bg-[#1A2633]/80 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
          <div className="hidden lg:grid grid-cols-[2fr_1.2fr_1fr_110px_130px_180px] gap-4 px-6 py-3 bg-slate-50 dark:bg-white/[0.03] border-b border-slate-100 dark:border-white/5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            <span>Partner</span><span>Booking</span><span>Customer</span><span>Commission</span><span>Status</span><span className="text-right">Actions</span>
          </div>
          {commissions.length === 0 ? (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-5xl text-slate-200 dark:text-white/10 block mb-3">receipt_long</span>
              <p className="text-slate-500 dark:text-slate-400 font-semibold">No commissions generated yet</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Commissions appear automatically when bookings are confirmed</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {commissions.map((c: any) => (
                <div key={c.id} className="grid grid-cols-1 lg:grid-cols-[2fr_1.2fr_1fr_110px_130px_180px] gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors items-center">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">{c.partner_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{c.partner_email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{c.booking_title || 'Booking'}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">₹{Number(c.booking_amount).toLocaleString('en-IN')} booking value</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{c.customer_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">₹{Number(c.commission_amount).toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-slate-400">{c.commission_type === 'Percentage' ? `${c.commission_rate}% rate` : 'Flat rate'}</p>
                  </div>
                  <div>
                    <span className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-bold ${commStatusBadge[c.status] || 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-white/50'}`}>
                      <span className={`size-1.5 rounded-full ${c.status === 'Paid' ? 'bg-emerald-400' : c.status === 'Approved' ? 'bg-blue-400' : c.status === 'Rejected' ? 'bg-red-400' : 'bg-amber-400'}`} />
                      {c.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {c.status === 'Pending' && (
                      <button onClick={() => handleCommission(c.id, 'approve')} className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all active:scale-95 hover:shadow-lg hover:shadow-blue-500/25">Approve</button>
                    )}
                    {c.status === 'Approved' && (
                      <button onClick={() => handleCommission(c.id, 'pay')} className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all active:scale-95 hover:shadow-lg hover:shadow-emerald-500/25">
                        <span className="material-symbols-outlined text-[13px]">payments</span>Mark Paid
                      </button>
                    )}
                    {(c.status === 'Pending' || c.status === 'Approved') && (
                      <button onClick={() => handleCommission(c.id, 'reject')} className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs font-bold transition-all active:scale-95">Reject</button>
                    )}
                  </div>
                </div>
              ))}
              </div>
            )}
            </div>
            </div>
          </div>

      )}

      {/* Edit Modal */}
      {editModal && selectedPartner && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setEditModal(false)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-violet-600/10 to-purple-600/10 dark:from-violet-500/20 dark:to-purple-500/10 border-b border-slate-100 dark:border-white/10 p-6 flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-violet-500/30">
                {selectedPartner.name ? selectedPartner.name.split(' ').map((w:string)=>w[0]).slice(0,2).join('').toUpperCase() : '?'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-black text-slate-900 dark:text-white truncate">{selectedPartner.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{selectedPartner.email}</p>
              </div>
              <button onClick={() => setEditModal(false)} className="size-8 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={saveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">Partner Status</label>
                <select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))} className={inputClass}>
                  <option>Pending Approval</option><option>Active</option><option>Blocked</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">Commission Type</label>
                  <select value={editForm.commissionType} onChange={e => setEditForm(p => ({ ...p, commissionType: e.target.value }))} className={inputClass}>
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Flat_Amount">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">
                    Value ({editForm.commissionType === 'Percentage' ? '%' : '₹'})
                  </label>
                  <input type="number" step="0.01" value={editForm.commissionValue}
                    onChange={e => setEditForm(p => ({ ...p, commissionValue: Number(e.target.value) }))} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">Internal Notes</label>
                <input type="text" value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} className={inputClass} placeholder="Notes visible only to admin..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditModal(false)} className="flex-1 h-11 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-white rounded-xl font-bold text-sm transition-all">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 h-11 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/25 disabled:opacity-60 active:scale-[0.98]">
                  {saving ? <><div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</> : <><span className="material-symbols-outlined text-[18px]">save</span>Save Changes</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Add Modal */}
      {addModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={e => e.target === e.currentTarget && setAddModal(false)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-8">
            <div className="bg-gradient-to-r from-violet-600/10 to-purple-600/10 dark:from-violet-500/20 dark:to-purple-500/10 border-b border-slate-100 dark:border-white/10 p-6 flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-violet-500/30">
                <span className="material-symbols-outlined text-[24px]">person_add</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-slate-900 dark:text-white truncate">Add New Partner</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Create a new B2B partner account</p>
              </div>
              <button onClick={() => setAddModal(false)} className="size-8 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={saveAdd} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">Full Name *</label>
                  <input required type="text" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} className={inputClass} placeholder="Partner Name" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">Email Address *</label>
                  <input required type="email" value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} className={inputClass} placeholder="partner@example.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">Password *</label>
                  <input required type="password" value={addForm.password} onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))} className={inputClass} placeholder="Set initial password" minLength={6} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">Phone Number</label>
                  <input type="text" value={addForm.phone} onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))} className={inputClass} placeholder="+91 9876543210" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">Company Name</label>
                  <input type="text" value={addForm.companyName} onChange={e => setAddForm(p => ({ ...p, companyName: e.target.value }))} className={inputClass} placeholder="Travel Agency Name" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">Location / City</label>
                  <input type="text" value={addForm.location} onChange={e => setAddForm(p => ({ ...p, location: e.target.value }))} className={inputClass} placeholder="e.g. Mumbai, IN" />
                </div>
              </div>
              
              <hr className="border-slate-200 dark:border-white/10 my-4" />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">Initial Status</label>
                  <select value={addForm.status} onChange={e => setAddForm(p => ({ ...p, status: e.target.value }))} className={inputClass}>
                    <option>Active</option>
                    <option>Pending Approval</option>
                    <option>Blocked</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">Commission Type</label>
                  <select value={addForm.commissionType} onChange={e => setAddForm(p => ({ ...p, commissionType: e.target.value }))} className={inputClass}>
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Flat_Amount">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">
                    Value ({addForm.commissionType === 'Percentage' ? '%' : '₹'})
                  </label>
                  <input type="number" step="0.01" required value={addForm.commissionValue}
                    onChange={e => setAddForm(p => ({ ...p, commissionValue: Number(e.target.value) }))} className={inputClass} />
                </div>
              </div>
              
              <div className="flex gap-3 pt-4 sticky bottom-0 bg-white dark:bg-slate-900 pb-2">
                <button type="button" onClick={() => setAddModal(false)} className="flex-1 h-11 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-white rounded-xl font-bold text-sm transition-all">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 h-11 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/25 disabled:opacity-60 active:scale-[0.98]">
                  {saving ? <><div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</> : <><span className="material-symbols-outlined text-[18px]">person_add</span>Create Partner</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
