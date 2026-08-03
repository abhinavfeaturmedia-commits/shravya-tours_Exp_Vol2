import React, { useState, useEffect } from 'react';
import { usePartnerAuth } from '../../context/PartnerAuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

const statusBadge: Record<string, string> = {
  Pending: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  Approved: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  Paid: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  Rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
};

export const PartnerEarnings: React.FC = () => {
  const { partner, refreshPartner } = usePartnerAuth();
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    refreshPartner();
    fetchCommissions();
  }, []);

  const fetchCommissions = async () => {
    try {
      const token = localStorage.getItem('shrawello_partner_jwt');
      const res = await fetch(`${API_BASE}/api/partner/commissions`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setCommissions(data.data || []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  if (!partner) return null;

  const filtered = filter === 'all' ? commissions : commissions.filter(c => c.status === filter);
  const totalPaid = commissions.filter(c => c.status === 'Paid').reduce((s, c) => s + Number(c.commission_amount), 0);
  const totalApproved = commissions.filter(c => c.status === 'Approved').reduce((s, c) => s + Number(c.commission_amount), 0);
  const totalPending = commissions.filter(c => c.status === 'Pending').reduce((s, c) => s + Number(c.commission_amount), 0);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-white">My Earnings</h1>
        <p className="text-white/50 text-sm mt-1">Commission history and payout status</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-900/30 via-teal-900/20 to-slate-900/40 border border-emerald-500/30 backdrop-blur-xl rounded-2xl p-5 shadow-xl relative overflow-hidden group">
          <div className="size-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mb-3 shadow-md shadow-emerald-950/40 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-white text-[20px]">check_circle</span>
          </div>
          <p className="text-white/50 text-[11px] font-bold uppercase tracking-widest">Total Paid Out</p>
          <p className="text-2xl lg:text-3xl font-black text-white mt-1">₹{totalPaid.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-900/30 via-indigo-900/20 to-slate-900/40 border border-blue-500/30 backdrop-blur-xl rounded-2xl p-5 shadow-xl relative overflow-hidden group">
          <div className="size-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-3 shadow-md shadow-blue-950/40 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-white text-[20px]">hourglass_top</span>
          </div>
          <p className="text-white/50 text-[11px] font-bold uppercase tracking-widest">Approved (Awaiting Payment)</p>
          <p className="text-2xl lg:text-3xl font-black text-white mt-1">₹{totalApproved.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-900/30 via-orange-900/20 to-slate-900/40 border border-amber-500/30 backdrop-blur-xl rounded-2xl p-5 shadow-xl relative overflow-hidden group">
          <div className="size-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center mb-3 shadow-md shadow-amber-950/40 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-white text-[20px]">pending</span>
          </div>
          <p className="text-white/50 text-[11px] font-bold uppercase tracking-widest">Pending Review</p>
          <p className="text-2xl lg:text-3xl font-black text-white mt-1">₹{totalPending.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Commission Rate Info */}
      <div className="flex items-center gap-3.5 bg-violet-600/10 border border-violet-500/25 rounded-2xl p-4 backdrop-blur-md">
        <span className="material-symbols-outlined text-violet-400 text-[22px] shrink-0">info</span>
        <p className="text-sm text-white/70 leading-relaxed">
          Your active commission rate: <strong className="text-violet-300">
            {partner.commissionType === 'Percentage' ? `${partner.commissionValue}% of total booking amount` : `₹${partner.commissionValue} flat per booking`}
          </strong>. Commissions generate automatically upon booking conversion and payout releases follow admin verification.
        </p>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {['all', 'Pending', 'Approved', 'Paid', 'Rejected'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
              filter === f
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 border-violet-500 text-white shadow-md shadow-violet-500/20'
                : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10'
            }`}>
            {f === 'all' ? 'All Payouts' : f}
          </button>
        ))}
      </div>

      {/* Commission Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="size-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-4xl text-white/20 block mb-3">payments</span>
            <p className="text-white/40 font-semibold text-sm">No commissions yet</p>
            <p className="text-white/25 text-xs mt-1">Commissions appear here when your referred leads convert to bookings</p>
          </div>
        ) : (
          <>
            <div className="hidden sm:grid grid-cols-[1fr_1fr_120px_120px_100px] gap-4 px-5 py-3 border-b border-white/10 text-xs font-bold text-white/40 uppercase tracking-wide">
              <span>Booking</span><span>Customer</span><span>Booking Amount</span><span>Commission</span><span>Status</span>
            </div>
            <div className="divide-y divide-white/5">
              {filtered.map(c => (
                <div key={c.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_120px_120px_100px] gap-3 px-5 py-4 hover:bg-white/5 transition-colors">
                  <div>
                    <p className="text-sm font-bold text-white">{c.booking_title || 'Booking'}</p>
                    <p className="text-xs text-white/40">{new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm text-white/80">{c.customer_name || '—'}</p>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-semibold text-white">₹{Number(c.booking_amount).toLocaleString('en-IN')}</p>
                    <p className="text-xs text-white/40">
                      {c.commission_type === 'Percentage' ? `${c.commission_rate}% rate` : 'Flat rate'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-black text-emerald-300">₹{Number(c.commission_amount).toLocaleString('en-IN')}</p>
                    {c.paid_at && <p className="text-xs text-white/30">Paid: {new Date(c.paid_at).toLocaleDateString('en-IN')}</p>}
                  </div>
                  <div>
                    <span className={`inline-flex items-center text-[11px] px-2.5 py-1 rounded-full font-bold border ${statusBadge[c.status] || 'bg-white/10 text-white/50 border-white/20'}`}>
                      {c.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
