import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

const statusColor: Record<string, string> = {
  New: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  Warm: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  Hot: 'bg-red-500/20 text-red-300 border-red-500/30',
  Cold: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  'Offer Sent': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  Converted: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

export const PartnerLeads: React.FC = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchLeads(); }, []);

  const fetchLeads = async () => {
    try {
      const token = localStorage.getItem('shrawello_partner_jwt');
      const res = await fetch(`${API_BASE}/api/partner/leads`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setLeads(data.data || []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  const filtered = filter === 'all' ? leads : filter === 'converted' ? leads.filter(l => l.booking_id) : leads.filter(l => l.status === filter);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">My Leads</h1>
          <p className="text-white/50 text-sm mt-1">Track all customer referrals you've submitted</p>
        </div>
        <Link to="/partner/leads/new" className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-violet-500/25 shrink-0">
          <span className="material-symbols-outlined text-[18px]">add</span> Submit New Lead
        </Link>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: leads.length, filter: 'all', color: 'violet' },
          { label: 'New', value: leads.filter(l => l.status === 'New').length, filter: 'New', color: 'blue' },
          { label: 'Hot', value: leads.filter(l => l.status === 'Hot' || l.status === 'Warm').length, filter: 'Hot', color: 'red' },
          { label: 'Converted', value: leads.filter(l => l.booking_id).length, filter: 'converted', color: 'emerald' },
        ].map(s => (
          <button key={s.filter} onClick={() => setFilter(s.filter)}
            className={`p-3 rounded-xl border text-left transition-all ${filter === s.filter ? `bg-${s.color}-600/20 border-${s.color}-500/40` : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
            <p className="text-2xl font-black text-white">{s.value}</p>
            <p className="text-xs text-white/50 font-semibold">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {['all', 'New', 'Warm', 'Hot', 'Cold', 'Offer Sent', 'Converted', 'converted'].map(f => (
          f !== 'converted' && (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${filter === f ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:text-white'}`}>
              {f === 'all' ? 'All Leads' : f}
            </button>
          )
        ))}
      </div>

      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="size-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <span className="material-symbols-outlined text-4xl text-white/20 block mb-3">groups</span>
            <p className="text-white/40 font-semibold">No leads found</p>
            <p className="text-white/25 text-xs mt-1">Submit your first lead to get started</p>
            <Link to="/partner/leads/new" className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-500 transition-colors">
              <span className="material-symbols-outlined text-[16px]">add</span>Submit Lead
            </Link>
          </div>
        ) : (
          <>
            {/* Header row */}
            <div className="hidden sm:grid grid-cols-[1fr_1fr_120px_120px_100px] gap-4 px-5 py-3 border-b border-white/10 text-xs font-bold text-white/40 uppercase tracking-wide">
              <span>Customer</span><span>Destination</span><span>Travel Date</span><span>Value</span><span>Status</span>
            </div>
            <div className="divide-y divide-white/5">
              {filtered.map(lead => (
                <div key={lead.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_120px_120px_100px] gap-4 px-5 py-4 hover:bg-white/5 transition-colors">
                  <div>
                    <p className="text-sm font-bold text-white">{lead.name}</p>
                    <p className="text-xs text-white/40">{lead.email}</p>
                    <p className="text-xs text-white/40 sm:hidden mt-1">{lead.destination}</p>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm text-white/80 font-semibold">{lead.destination || '—'}</p>
                    <p className="text-xs text-white/40">{lead.travelers || '—'}</p>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm text-white/70">{lead.start_date || '—'}</p>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-bold text-white">
                      {lead.potential_value ? `₹${Number(lead.potential_value).toLocaleString('en-IN')}` : '—'}
                    </p>
                    {lead.booking_id && <p className="text-[11px] text-emerald-400 font-bold">Converted ✓</p>}
                  </div>
                  <div>
                    <span className={`inline-flex items-center text-[11px] px-2.5 py-1 rounded-full font-bold border ${statusColor[lead.status] || 'bg-white/10 text-white/50 border-white/20'}`}>
                      {lead.status}
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
