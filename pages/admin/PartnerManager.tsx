import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

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
  openDetails: (id: string) => void;
}> = ({ partners, search, statusFilter, setSearch, setStatusFilter, statusBadge, handleApprove, handleBlock, handleDelete, openEdit, openDetails }) => {
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
                <div className="flex items-center gap-3 cursor-pointer group/item shrink-0" onClick={() => openDetails(p.id)}>
                  <div className={`size-10 rounded-xl bg-gradient-to-br ${getAvatarColor(p.id)} flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md transition-transform group-hover/item:scale-110 duration-200`}>{getInitials(p.name)}</div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight hover:text-violet-600 dark:hover:text-violet-400 transition-colors">{p.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{p.email}</p>
                    {p.company_name && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{p.company_name}{p.location ? ` · ${p.location}` : ''}</p>}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-black text-violet-600 dark:text-violet-400">Base: {p.commission_type === 'Percentage' ? `${p.commission_value}%` : `₹${p.commission_value}`}</p>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">Cab: {p.cab_commission_type === 'Percentage' ? `${p.cab_commission_value}%` : `₹${p.cab_commission_value || 300}`}</p>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Bus: {p.bus_commission_type === 'Percentage' ? `${p.bus_commission_value}%` : `₹${p.bus_commission_value || 150}`}</p>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Train: {p.train_commission_type === 'Percentage' ? `${p.train_commission_value}%` : `₹${p.train_commission_value || 100}`}</p>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Flight: {p.flight_commission_type === 'Percentage' ? `${p.flight_commission_value}%` : `₹${p.flight_commission_value || 200}`}</p>
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
  const location = useLocation();
  const [partners, setPartners] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [tab, setTab] = useState<'partners' | 'payouts'>('partners');
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    commissionType: 'Percentage', commissionValue: 5,
    cabCommissionType: 'Flat_Amount', cabCommissionValue: 300,
    busCommissionType: 'Flat_Amount', busCommissionValue: 150,
    trainCommissionType: 'Flat_Amount', trainCommissionValue: 100,
    flightCommissionType: 'Flat_Amount', flightCommissionValue: 200,
    status: 'Active', notes: '',
    bankName: '', accountHolderName: '', accountNumber: '', ifscCode: '', branchName: ''
  });
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '', email: '', password: '', phone: '', companyName: '', location: '',
    commissionType: 'Percentage', commissionValue: 5,
    cabCommissionType: 'Flat_Amount', cabCommissionValue: 300,
    busCommissionType: 'Flat_Amount', busCommissionValue: 150,
    trainCommissionType: 'Flat_Amount', trainCommissionValue: 100,
    flightCommissionType: 'Flat_Amount', flightCommissionValue: 200,
    status: 'Active',
    bankName: '', accountHolderName: '', accountNumber: '', ifscCode: '', branchName: ''
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Commission Override State
  const [selectedCommission, setSelectedCommission] = useState<any>(null);
  const [editCommModal, setEditCommModal] = useState(false);
  const [editCommForm, setEditCommForm] = useState({ commissionType: 'Percentage', commissionRate: 0, commissionAmount: 0, notes: '' });

  // Details Drawer State
  const [detailPartnerId, setDetailPartnerId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'leads' | 'ledger' | 'bank' | 'notes'>('leads');
  const [leadsSearch, setLeadsSearch] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const loadPartnerDetails = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await adminFetch(`/api/admin/partners/${id}/details`);
      setDetailData(res.data);
    } catch (e) {
      console.error('Failed to load partner details:', e);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (detailPartnerId) {
      loadPartnerDetails(detailPartnerId);
    } else {
      setDetailData(null);
    }
  }, [detailPartnerId, loadPartnerDetails]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

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

  // Handle deep linking for specific partner detail drawer
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const idParam = searchParams.get('id');
    if (idParam && partners.length > 0) {
      const foundPartner = partners.find(p => String(p.id) === String(idParam));
      if (foundPartner) {
        setDetailPartnerId(foundPartner.id);
      }
    }
  }, [location.search, partners]);

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
    const bd = p.bank_details || {};
    setEditForm({
      commissionType: p.commission_type,
      commissionValue: p.commission_value,
      cabCommissionType: p.cab_commission_type || 'Flat_Amount',
      cabCommissionValue: p.cab_commission_value !== undefined && p.cab_commission_value !== null ? Number(p.cab_commission_value) : 300,
      busCommissionType: p.bus_commission_type || 'Flat_Amount',
      busCommissionValue: p.bus_commission_value !== undefined && p.bus_commission_value !== null ? Number(p.bus_commission_value) : 150,
      trainCommissionType: p.train_commission_type || 'Flat_Amount',
      trainCommissionValue: p.train_commission_value !== undefined && p.train_commission_value !== null ? Number(p.train_commission_value) : 100,
      flightCommissionType: p.flight_commission_type || 'Flat_Amount',
      flightCommissionValue: p.flight_commission_value !== undefined && p.flight_commission_value !== null ? Number(p.flight_commission_value) : 200,
      status: p.status,
      notes: p.notes || '',
      bankName: bd.bankName || '',
      accountHolderName: bd.accountHolderName || '',
      accountNumber: bd.accountNumber || '',
      ifscCode: bd.ifscCode || '',
      branchName: bd.branchName || ''
    });
    setEditModal(true);
  };
  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = {
        ...editForm,
        bankDetails: {
          bankName: editForm.bankName,
          accountHolderName: editForm.accountHolderName,
          accountNumber: editForm.accountNumber,
          ifscCode: editForm.ifscCode,
          branchName: editForm.branchName
        }
      };
      await adminFetch(`/api/admin/partners/${selectedPartner.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      setEditModal(false); showMsg('Partner updated'); load();
      if (detailPartnerId === selectedPartner.id) {
        loadPartnerDetails(selectedPartner.id);
      }
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const saveAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = {
        ...addForm,
        bankDetails: {
          bankName: addForm.bankName,
          accountHolderName: addForm.accountHolderName,
          accountNumber: addForm.accountNumber,
          ifscCode: addForm.ifscCode,
          branchName: addForm.branchName
        }
      };
      await adminFetch('/api/admin/partners', { method: 'POST', body: JSON.stringify(payload) });
      setAddModal(false); showMsg('Partner added successfully'); load();
      setAddForm({ name: '', email: '', password: '', phone: '', companyName: '', location: '', commissionType: 'Percentage', commissionValue: 5, cabCommissionType: 'Flat_Amount', cabCommissionValue: 300, busCommissionType: 'Flat_Amount', busCommissionValue: 150, trainCommissionType: 'Flat_Amount', trainCommissionValue: 100, flightCommissionType: 'Flat_Amount', flightCommissionValue: 200, status: 'Active', bankName: '', accountHolderName: '', accountNumber: '', ifscCode: '', branchName: '' });
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleCommission = async (id: string, action: 'approve' | 'pay' | 'reject') => {
    await adminFetch(`/api/admin/partner-commissions/${id}/${action}`, { method: 'PATCH' });
    showMsg(`Commission ${action === 'pay' ? 'marked as paid' : action + 'd'}`); load();
  };

  const openEditCommission = (c: any) => {
    setSelectedCommission(c);
    setEditCommForm({
      commissionType: c.commission_type || 'Percentage',
      commissionRate: c.commission_rate !== undefined && c.commission_rate !== null ? Number(c.commission_rate) : 0,
      commissionAmount: c.commission_amount !== undefined && c.commission_amount !== null ? Number(c.commission_amount) : 0,
      notes: c.notes || ''
    });
    setEditCommModal(true);
  };

  const saveEditCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminFetch(`/api/crud/partner_commissions/${selectedCommission.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          commission_type: editCommForm.commissionType,
          commission_rate: editCommForm.commissionRate,
          commission_amount: editCommForm.commissionAmount,
          notes: editCommForm.notes || null
        })
      });
      setEditCommModal(false);
      showMsg('Commission updated successfully');
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
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
          openDetails={setDetailPartnerId}
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
                    {(c.status === 'Pending' || c.status === 'Approved') && (
                      <button onClick={() => openEditCommission(c)} className="px-2.5 py-1.5 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded-lg text-xs font-bold transition-all active:scale-95">Edit</button>
                    )}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">Cab Commission Type</label>
                  <select value={editForm.cabCommissionType} onChange={e => setEditForm(p => ({ ...p, cabCommissionType: e.target.value }))} className={inputClass}>
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Flat_Amount">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">
                    Cab Value ({editForm.cabCommissionType === 'Percentage' ? '%' : '₹'})
                  </label>
                  <input type="number" step="0.01" value={editForm.cabCommissionValue}
                    onChange={e => setEditForm(p => ({ ...p, cabCommissionValue: Number(e.target.value) }))} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">Bus Commission Type</label>
                  <select value={editForm.busCommissionType} onChange={e => setEditForm(p => ({ ...p, busCommissionType: e.target.value }))} className={inputClass}>
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Flat_Amount">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">
                    Bus Value ({editForm.busCommissionType === 'Percentage' ? '%' : '₹'})
                  </label>
                  <input type="number" step="0.01" value={editForm.busCommissionValue}
                    onChange={e => setEditForm(p => ({ ...p, busCommissionValue: Number(e.target.value) }))} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">Train Commission Type</label>
                  <select value={editForm.trainCommissionType} onChange={e => setEditForm(p => ({ ...p, trainCommissionType: e.target.value }))} className={inputClass}>
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Flat_Amount">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">
                    Train Value ({editForm.trainCommissionType === 'Percentage' ? '%' : '₹'})
                  </label>
                  <input type="number" step="0.01" value={editForm.trainCommissionValue}
                    onChange={e => setEditForm(p => ({ ...p, trainCommissionValue: Number(e.target.value) }))} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">Flight Commission Type</label>
                  <select value={editForm.flightCommissionType} onChange={e => setEditForm(p => ({ ...p, flightCommissionType: e.target.value }))} className={inputClass}>
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Flat_Amount">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">
                    Flight Value ({editForm.flightCommissionType === 'Percentage' ? '%' : '₹'})
                  </label>
                  <input type="number" step="0.01" value={editForm.flightCommissionValue}
                    onChange={e => setEditForm(p => ({ ...p, flightCommissionValue: Number(e.target.value) }))} className={inputClass} />
                </div>
              </div>
              <hr className="border-slate-200 dark:border-white/10 my-3" />
              <h4 className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-2">Bank & Payout Account</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Bank Name</label>
                  <input type="text" value={editForm.bankName} onChange={e => setEditForm(p => ({ ...p, bankName: e.target.value }))} className={inputClass} placeholder="e.g. HDFC Bank" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Beneficiary Name</label>
                  <input type="text" value={editForm.accountHolderName} onChange={e => setEditForm(p => ({ ...p, accountHolderName: e.target.value }))} className={inputClass} placeholder="Account Holder Name" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Account Number</label>
                  <input type="text" value={editForm.accountNumber} onChange={e => setEditForm(p => ({ ...p, accountNumber: e.target.value }))} className={inputClass} placeholder="A/C Number" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">IFSC Code</label>
                  <input type="text" value={editForm.ifscCode} onChange={e => setEditForm(p => ({ ...p, ifscCode: e.target.value }))} className={inputClass} placeholder="e.g. HDFC0001234" />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Branch Name</label>
                <input type="text" value={editForm.branchName} onChange={e => setEditForm(p => ({ ...p, branchName: e.target.value }))} className={inputClass} placeholder="Branch Office Location" />
              </div>
              <hr className="border-slate-200 dark:border-white/10 my-3" />
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">Cab Commission Type</label>
                  <select value={addForm.cabCommissionType} onChange={e => setAddForm(p => ({ ...p, cabCommissionType: e.target.value }))} className={inputClass}>
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Flat_Amount">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">
                    Cab Value ({addForm.cabCommissionType === 'Percentage' ? '%' : '₹'})
                  </label>
                  <input type="number" step="0.01" required value={addForm.cabCommissionValue}
                    onChange={e => setAddForm(p => ({ ...p, cabCommissionValue: Number(e.target.value) }))} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">Bus Commission Type</label>
                  <select value={addForm.busCommissionType} onChange={e => setAddForm(p => ({ ...p, busCommissionType: e.target.value }))} className={inputClass}>
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Flat_Amount">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">
                    Bus Value ({addForm.busCommissionType === 'Percentage' ? '%' : '₹'})
                  </label>
                  <input type="number" step="0.01" required value={addForm.busCommissionValue}
                    onChange={e => setAddForm(p => ({ ...p, busCommissionValue: Number(e.target.value) }))} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">Train Commission Type</label>
                  <select value={addForm.trainCommissionType} onChange={e => setAddForm(p => ({ ...p, trainCommissionType: e.target.value }))} className={inputClass}>
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Flat_Amount">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">
                    Train Value ({addForm.trainCommissionType === 'Percentage' ? '%' : '₹'})
                  </label>
                  <input type="number" step="0.01" required value={addForm.trainCommissionValue}
                    onChange={e => setAddForm(p => ({ ...p, trainCommissionValue: Number(e.target.value) }))} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">Flight Commission Type</label>
                  <select value={addForm.flightCommissionType} onChange={e => setAddForm(p => ({ ...p, flightCommissionType: e.target.value }))} className={inputClass}>
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Flat_Amount">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">
                    Flight Value ({addForm.flightCommissionType === 'Percentage' ? '%' : '₹'})
                  </label>
                  <input type="number" step="0.01" required value={addForm.flightCommissionValue}
                    onChange={e => setAddForm(p => ({ ...p, flightCommissionValue: Number(e.target.value) }))} className={inputClass} />
                </div>
              </div>
              
              <hr className="border-slate-200 dark:border-white/10 my-3" />
              <h4 className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-2">Bank & Payout Account</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Bank Name</label>
                  <input type="text" value={addForm.bankName} onChange={e => setAddForm(p => ({ ...p, bankName: e.target.value }))} className={inputClass} placeholder="e.g. HDFC Bank" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Beneficiary Name</label>
                  <input type="text" value={addForm.accountHolderName} onChange={e => setAddForm(p => ({ ...p, accountHolderName: e.target.value }))} className={inputClass} placeholder="Account Holder Name" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Account Number</label>
                  <input type="text" value={addForm.accountNumber} onChange={e => setAddForm(p => ({ ...p, accountNumber: e.target.value }))} className={inputClass} placeholder="A/C Number" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">IFSC Code</label>
                  <input type="text" value={addForm.ifscCode} onChange={e => setAddForm(p => ({ ...p, ifscCode: e.target.value }))} className={inputClass} placeholder="e.g. HDFC0001234" />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Branch Name</label>
                <input type="text" value={addForm.branchName} onChange={e => setAddForm(p => ({ ...p, branchName: e.target.value }))} className={inputClass} placeholder="Branch Office Location" />
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

      {/* Edit Commission Modal */}
      {editCommModal && selectedCommission && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setEditCommModal(false)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-violet-600/10 to-purple-600/10 dark:from-violet-500/20 dark:to-purple-500/10 border-b border-slate-100 dark:border-white/10 p-6 flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-violet-500/30">
                <span className="material-symbols-outlined text-[24px]">payments</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-black text-slate-900 dark:text-white truncate">Edit Commission</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">For: {selectedCommission.booking_title || 'Booking'}</p>
              </div>
              <button onClick={() => setEditCommModal(false)} className="size-8 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <form onSubmit={saveEditCommission} className="p-6 space-y-4">
              {/* Read-Only Info */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800/60">
                <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Partner:</span>
                  <span className="text-slate-800 dark:text-slate-200">{selectedCommission.partner_name}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Booking Value:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold">₹{Number(selectedCommission.booking_amount).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Commission Type and Rate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">Type</label>
                  <select value={editCommForm.commissionType} onChange={e => {
                    const newType = e.target.value;
                    const bookingAmt = Number(selectedCommission.booking_amount) || 0;
                    const rate = editCommForm.commissionRate;
                    const newAmount = newType === 'Percentage' ? (bookingAmt * rate) / 100 : rate;
                    setEditCommForm(prev => ({
                      ...prev,
                      commissionType: newType,
                      commissionAmount: Number(newAmount.toFixed(2))
                    }));
                  }} className={inputClass}>
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Flat_Amount">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">
                    Rate ({editCommForm.commissionType === 'Percentage' ? '%' : '₹'})
                  </label>
                  <input type="number" step="0.01" value={editCommForm.commissionRate}
                    onChange={e => {
                      const rate = Number(e.target.value) || 0;
                      const bookingAmt = Number(selectedCommission.booking_amount) || 0;
                      const newAmount = editCommForm.commissionType === 'Percentage' ? (bookingAmt * rate) / 100 : rate;
                      setEditCommForm(prev => ({
                        ...prev,
                        commissionRate: rate,
                        commissionAmount: Number(newAmount.toFixed(2))
                      }));
                    }} className={inputClass} />
                </div>
              </div>

              {/* Override Amount field */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">
                  Total Commission Amount (₹ Override)
                </label>
                <input type="number" step="0.01" value={editCommForm.commissionAmount}
                  onChange={e => {
                    const amt = Number(e.target.value) || 0;
                    setEditCommForm(prev => ({ ...prev, commissionAmount: amt }));
                  }} className={inputClass} />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">Internal Notes / Reason</label>
                <textarea value={editCommForm.notes} onChange={e => setEditCommForm(p => ({ ...p, notes: e.target.value }))} className={`${inputClass} h-16 py-2 resize-none`} placeholder="Describe why this commission was custom priced..." />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditCommModal(false)} className="flex-1 h-11 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-white rounded-xl font-bold text-sm transition-all">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 h-11 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/25 disabled:opacity-60 active:scale-[0.98]">
                  {saving ? <><div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</> : <><span className="material-symbols-outlined text-[18px]">save</span>Save Commission</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Details Side-Sheet Drawer */}
      {detailPartnerId && (
        <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            {/* Backdrop overlay with blur */}
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out" 
                 onClick={() => setDetailPartnerId(null)} />

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
              {/* Drawer Content Card */}
              <div className="pointer-events-auto w-screen max-w-2xl transform bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-white/10 flex flex-col transition-transform duration-300 ease-in-out animate-in slide-in-from-right">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-violet-600/10 to-purple-600/10 dark:from-violet-500/20 dark:to-purple-500/10 border-b border-slate-100 dark:border-white/10 p-6">
                  <div className="flex items-start justify-between">
                    {detailData ? (
                      <div className="flex items-center gap-4">
                        <div className={`size-14 rounded-2xl bg-gradient-to-br ${getAvatarColor(detailData.partner.id)} flex items-center justify-center text-white font-black text-xl shadow-lg`}>
                          {getInitials(detailData.partner.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight truncate">{detailData.partner.name}</h2>
                            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold border ${statusBadge[detailData.partner.status] || 'bg-slate-100'}`}>
                              <span className={`size-1.5 rounded-full ${detailData.partner.status === 'Active' ? 'bg-emerald-400' : detailData.partner.status === 'Blocked' ? 'bg-red-400' : 'bg-amber-400'} animate-pulse`} />
                              {detailData.partner.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{detailData.partner.email} · {detailData.partner.phone || 'No phone'}</p>
                          {detailData.partner.company_name && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium">{detailData.partner.company_name} · {detailData.partner.location || 'No location'}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 animate-pulse">
                        <div className="size-14 rounded-2xl bg-slate-200 dark:bg-slate-700 shrink-0" />
                        <div className="space-y-2">
                          <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
                          <div className="h-3.5 w-64 bg-slate-200 dark:bg-slate-700 rounded" />
                        </div>
                      </div>
                    )}
                    <button onClick={() => setDetailPartnerId(null)} className="size-8 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all">
                      <span className="material-symbols-outlined text-[22px]">close</span>
                    </button>
                  </div>

                  {/* Actions Ribbon */}
                  {detailData && (
                    <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex-wrap">
                      <button onClick={() => { setDetailPartnerId(null); openEdit(detailData.partner); }} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded-lg text-xs font-bold transition-all active:scale-95">
                        <span className="material-symbols-outlined text-[14px]">edit</span>Edit Profile
                      </button>
                      {detailData.partner.status === 'Pending Approval' && (
                        <button onClick={async () => { await handleApprove(detailData.partner.id); loadPartnerDetails(detailData.partner.id); }} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all active:scale-95">
                          <span className="material-symbols-outlined text-[14px]">check</span>Approve Partner
                        </button>
                      )}
                      {detailData.partner.status === 'Active' && (
                        <button onClick={async () => { await handleBlock(detailData.partner.id); loadPartnerDetails(detailData.partner.id); }} className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs font-bold transition-all active:scale-95">
                          <span className="material-symbols-outlined text-[14px]">block</span>Block Partner
                        </button>
                      )}
                      <button onClick={async () => { if (window.confirm('Delete this partner permanently?')) { await handleDelete(detailData.partner.id); setDetailPartnerId(null); } }} className="flex items-center gap-1 px-3 py-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg text-xs font-bold transition-all active:scale-95 ml-auto">
                        <span className="material-symbols-outlined text-[14px]">delete</span>Delete Account
                      </button>
                    </div>
                  )}
                </div>

                {/* Main Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {detailLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                      <div className="size-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Fetching partner transaction ledger...</p>
                    </div>
                  ) : detailData ? (
                    <>
                      {/* Financial KPI stats grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-xl p-3.5">
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Total Earnings</p>
                          <p className="text-lg font-black text-slate-900 dark:text-white mt-1">₹{Number(detailData.stats.totalEarnings).toLocaleString('en-IN')}</p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">All booking payouts</p>
                        </div>
                        <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5">
                          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Amount Paid</p>
                          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">₹{Number(detailData.stats.amountPaid).toLocaleString('en-IN')}</p>
                          <p className="text-[9px] text-emerald-500/80 mt-0.5">Transferred to bank</p>
                        </div>
                        <div className="bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-xl p-3.5">
                          <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Approved Payout</p>
                          <p className="text-lg font-black text-blue-600 dark:text-blue-400 mt-1">₹{Number(detailData.stats.amountApproved).toLocaleString('en-IN')}</p>
                          <p className="text-[9px] text-blue-500/80 mt-0.5">Ready to process</p>
                        </div>
                        <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5">
                          <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Pending Approval</p>
                          <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-1">₹{Number(detailData.stats.amountPending).toLocaleString('en-IN')}</p>
                          <p className="text-[9px] text-amber-500/80 mt-0.5">Awaiting validation</p>
                        </div>
                      </div>

                      {/* Leads / Conversion Ring */}
                      <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Leads & Converted Bookings</h4>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {detailData.stats.bookingsConverted} confirmed bookings from {detailData.stats.totalLeads} leads
                          </p>
                          <div className="w-48 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-2">
                            <div className="bg-gradient-to-r from-violet-500 to-purple-600 h-full rounded-full" 
                                 style={{ width: `${detailData.stats.conversionRate}%` }} />
                          </div>
                        </div>
                        <div className="flex flex-col items-center shrink-0">
                          <span className="text-xl font-black text-violet-600 dark:text-violet-400">{detailData.stats.conversionRate}%</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Conversion</span>
                        </div>
                      </div>

                      {/* Tab Selection */}
                      <div>
                        <div className="flex border-b border-slate-100 dark:border-white/5">
                          {([
                            { id: 'leads', label: `Submitted Leads (${detailData.leads.length})`, icon: 'folder_shared' },
                            { id: 'ledger', label: `Commissions Ledger (${detailData.commissions.length})`, icon: 'payments' },
                            { id: 'bank', label: 'Bank Info & Rules', icon: 'account_balance' },
                          ] as const).map(t => (
                            <button key={t.id} onClick={() => setDrawerTab(t.id)}
                                    className={`flex items-center gap-1.5 pb-3 px-4 text-xs font-bold border-b-2 transition-all capitalize -mb-[2px] ${
                                      drawerTab === t.id 
                                        ? 'border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400' 
                                        : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}>
                              <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
                              {t.label}
                            </button>
                          ))}
                        </div>

                        {/* Drawer Tabs Content */}
                        <div className="pt-4">
                          {drawerTab === 'leads' && (
                            <div className="space-y-3">
                              {/* Search */}
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[18px]">search</span>
                                <input value={leadsSearch} onChange={e => setLeadsSearch(e.target.value)} placeholder="Filter submitted leads…"
                                       className="w-full h-9 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 rounded-xl pl-9 pr-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                              </div>

                              {/* Leads List */}
                              {detailData.leads.length === 0 ? (
                                <div className="text-center py-10 bg-slate-50/50 dark:bg-white/[0.01] border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
                                  <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-white/10 block mb-2">folder_shared</span>
                                  <p className="text-xs font-semibold text-slate-400">No leads submitted yet by this partner.</p>
                                </div>
                              ) : (
                                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                                  {detailData.leads
                                    .filter((l: any) => !leadsSearch || l.name?.toLowerCase().includes(leadsSearch.toLowerCase()) || l.destination?.toLowerCase().includes(leadsSearch.toLowerCase()))
                                    .map((l: any) => (
                                      <div key={l.id} className="flex justify-between items-center bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 p-3 rounded-xl hover:bg-slate-100/60 dark:hover:bg-white/[0.02] transition-all">
                                        <div>
                                          <p className="text-xs font-bold text-slate-955 dark:text-white leading-tight">{l.name}</p>
                                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                                            Dest: <span className="font-semibold text-slate-600 dark:text-slate-400">{l.destination || 'Unspecified'}</span> · Budget: {l.budget || '—'}
                                          </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${
                                            l.status === 'CONVERTED' || l.status === 'Converted'
                                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                              : l.status === 'LOST' || l.status === 'Lost'
                                              ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                              : 'bg-violet-500/10 text-violet-500 border border-violet-500/20'
                                          }`}>
                                            {l.status}
                                          </span>
                                          <p className="text-[9px] text-slate-400 mt-1">{new Date(l.created_at).toLocaleDateString('en-IN')}</p>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          )}

                          {drawerTab === 'ledger' && (
                            <div className="space-y-3">
                              {/* Search */}
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[18px]">search</span>
                                <input value={ledgerSearch} onChange={e => setLedgerSearch(e.target.value)} placeholder="Search booking ledger…"
                                       className="w-full h-9 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 rounded-xl pl-9 pr-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                              </div>

                              {/* Ledger List */}
                              {detailData.commissions.length === 0 ? (
                                <div className="text-center py-10 bg-slate-50/50 dark:bg-white/[0.01] border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
                                  <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-white/10 block mb-2">receipt_long</span>
                                  <p className="text-xs font-semibold text-slate-400">No commissions or bookings found in ledger.</p>
                                </div>
                              ) : (
                                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                                  {detailData.commissions
                                    .filter((c: any) => !ledgerSearch || c.booking_title?.toLowerCase().includes(ledgerSearch.toLowerCase()) || c.customer_name?.toLowerCase().includes(ledgerSearch.toLowerCase()))
                                    .map((c: any) => (
                                      <div key={c.id} className="bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 p-3 rounded-xl hover:bg-slate-100/60 dark:hover:bg-white/[0.02] transition-all space-y-2">
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <p className="text-xs font-bold text-slate-950 dark:text-white leading-tight">{c.booking_title || 'Travel Booking'}</p>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                              Client: <span className="font-semibold text-slate-700 dark:text-slate-300">{c.customer_name || '—'}</span> · Value: ₹{Number(c.booking_amount).toLocaleString('en-IN')}
                                            </p>
                                          </div>
                                          <div className="text-right shrink-0">
                                            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">₹{Number(c.commission_amount).toLocaleString('en-IN')}</p>
                                            <p className="text-[9px] text-slate-400">{c.commission_type === 'Percentage' ? `${c.commission_rate}% rate` : 'Flat Fee'}</p>
                                          </div>
                                        </div>
                                        
                                        {/* Status & inline payout actions */}
                                        <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-white/5 flex-wrap gap-2">
                                          <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${commStatusBadge[c.status] || 'bg-slate-100'}`}>
                                            <span className={`size-1.5 rounded-full ${c.status === 'Paid' ? 'bg-emerald-400' : c.status === 'Approved' ? 'bg-blue-400' : c.status === 'Rejected' ? 'bg-red-400' : 'bg-amber-400'}`} />
                                            {c.status}
                                          </span>
                                          
                                          {/* Direct ledger transition tools */}
                                          <div className="flex gap-1">
                                            {(c.status === 'Pending' || c.status === 'Approved') && (
                                              <button onClick={() => { setDetailPartnerId(null); openEditCommission(c); }} className="px-2 py-1 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-[10px] font-bold rounded">Edit</button>
                                            )}
                                            {c.status === 'Pending' && (
                                              <button onClick={async () => { await handleCommission(c.id, 'approve'); loadPartnerDetails(detailPartnerId); }} className="px-2 py-1 bg-blue-600 text-white hover:bg-blue-500 text-[10px] font-bold rounded">Approve</button>
                                            )}
                                            {c.status === 'Approved' && (
                                              <button onClick={async () => { await handleCommission(c.id, 'pay'); loadPartnerDetails(detailPartnerId); }} className="px-2 py-1 bg-emerald-600 text-white hover:bg-emerald-500 text-[10px] font-bold rounded flex items-center gap-0.5">
                                                <span className="material-symbols-outlined text-[11px]">payments</span>Pay
                                              </button>
                                            )}
                                            {(c.status === 'Pending' || c.status === 'Approved') && (
                                              <button onClick={async () => { if (window.confirm('Reject this commission?')) { await handleCommission(c.id, 'reject'); loadPartnerDetails(detailPartnerId); } }} className="px-2 py-1 bg-red-500/10 text-red-500 hover:bg-red-500/20 text-[10px] font-bold rounded">Reject</button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          )}

                          {drawerTab === 'bank' && (
                            <div className="space-y-4">
                              {/* Bank account details card */}
                              <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl p-4 space-y-3.5">
                                <h4 className="text-xs font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest">Bank Account Payout Details</h4>
                                {detailData.partner.bank_details ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {[
                                      { label: 'Bank Name', val: detailData.partner.bank_details.bankName },
                                      { label: 'Beneficiary Name', val: detailData.partner.bank_details.accountHolderName },
                                      { label: 'Account Number', val: detailData.partner.bank_details.accountNumber },
                                      { label: 'IFSC Code', val: detailData.partner.bank_details.ifscCode },
                                      { label: 'Branch Name', val: detailData.partner.bank_details.branchName },
                                    ].map(item => (
                                      <div key={item.label} className="flex justify-between items-start p-2 hover:bg-slate-100/50 dark:hover:bg-white/[0.02] rounded-lg group">
                                        <div>
                                          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">{item.label}</span>
                                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 block">{item.val || '—'}</span>
                                        </div>
                                        {item.val && (
                                          <button onClick={() => handleCopy(item.val, item.label)} 
                                                  className="size-7 flex items-center justify-center text-slate-400 hover:text-violet-500 dark:hover:text-violet-400 hover:bg-slate-100 dark:hover:bg-white/10 rounded-md transition-all shrink-0">
                                            <span className="material-symbols-outlined text-[15px]">
                                              {copiedField === item.label ? 'check_circle' : 'content_copy'}
                                            </span>
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-6">
                                    <span className="material-symbols-outlined text-3xl text-slate-300 dark:text-white/10 block mb-2">account_balance_wallet</span>
                                    <p className="text-xs font-semibold text-slate-400">No bank details supplied for this partner.</p>
                                    <button onClick={() => { setDetailPartnerId(null); openEdit(detailData.partner); }} className="mt-3 px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded text-xs font-bold">Add Bank Account</button>
                                  </div>
                                )}
                              </div>

                              {/* Rates Card */}
                              <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl p-4 space-y-3">
                                <h4 className="text-xs font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest">Active Partner Rules</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                                  {[
                                    { name: 'Base', val: detailData.partner.commission_type === 'Percentage' ? `${detailData.partner.commission_value}%` : `₹${detailData.partner.commission_value}` },
                                    { name: 'Cab', val: detailData.partner.cab_commission_type === 'Percentage' ? `${detailData.partner.cab_commission_value}%` : `₹${detailData.partner.cab_commission_value || 300}` },
                                    { name: 'Bus', val: detailData.partner.bus_commission_type === 'Percentage' ? `${detailData.partner.bus_commission_value}%` : `₹${detailData.partner.bus_commission_value || 150}` },
                                    { name: 'Train', val: detailData.partner.train_commission_type === 'Percentage' ? `${detailData.partner.train_commission_value}%` : `₹${detailData.partner.train_commission_value || 100}` },
                                    { name: 'Flight', val: detailData.partner.flight_commission_type === 'Percentage' ? `${detailData.partner.flight_commission_value}%` : `₹${detailData.partner.flight_commission_value || 200}` },
                                  ].map(rate => (
                                    <div key={rate.name} className="p-2.5 bg-slate-100/50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-xl">
                                      <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{rate.name}</p>
                                      <p className="text-xs font-black text-violet-600 dark:text-violet-400 mt-1">{rate.val}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
