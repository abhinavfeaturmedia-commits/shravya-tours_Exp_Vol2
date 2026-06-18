import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../src/lib/api';
import { LeadLog } from '../../types';
import { usePartnerAuth } from '../../context/PartnerAuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

const statusColor: Record<string, string> = {
  New: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  Warm: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  Hot: 'bg-red-500/20 text-red-300 border-red-500/30',
  Cold: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  'Offer Sent': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  Converted: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

// Safe date formatter — guards against MySQL 0000-00-00 → 1899-11-30 ghost dates
const formatDateSafe = (dateStr?: string | null, fallback = 'Flexible'): string => {
  if (!dateStr) return fallback;
  const d = new Date(dateStr);
  if (isNaN(d.getTime()) || d.getFullYear() <= 1900) return fallback;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const PartnerLeads: React.FC = () => {
  const { partner } = usePartnerAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [leadLogs, setLeadLogs] = useState<LeadLog[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [fetchingLogs, setFetchingLogs] = useState(false);

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

  const fetchLogs = async (leadId: string) => {
    setFetchingLogs(true);
    try {
      const logs = await api.fetchPartnerLeadLogs(leadId);
      setLeadLogs(logs);
    } catch { /* silent */ } finally {
      setFetchingLogs(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !chatInput.trim()) return;

    const messageText = chatInput.trim();
    setChatInput('');

    try {
      await api.sendPartnerLeadMessage(selectedLead.id, messageText);
      fetchLogs(selectedLead.id);
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
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
                <div key={lead.id}
                  onClick={() => {
                    setSelectedLead(lead);
                    fetchLogs(lead.id);
                  }}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_120px_120px_100px] gap-4 px-5 py-4 hover:bg-white/5 transition-colors cursor-pointer"
                >
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
                     <p className="text-sm text-white/70">{formatDateSafe(lead.start_date, '—')}</p>
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

      {/* Sliding Drawer */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-lg transform bg-slate-950 border-l border-white/10 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
              
              {/* Drawer Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-white">{selectedLead.name}</h2>
                  <p className="text-xs text-white/50">{selectedLead.destination} • Referral ID: {selectedLead.id}</p>
                </div>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[18px] block">close</span>
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Details Card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-white/40 uppercase tracking-wide">Lead Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-white/40 mb-0.5">Travel Dates</p>
                      <p className="font-bold text-white/95">{formatDateSafe(selectedLead.start_date, 'Flexible')}</p>
                    </div>
                    <div>
                      <p className="text-white/40 mb-0.5">Budget</p>
                      <p className="font-bold text-emerald-400">
                        {selectedLead.potential_value ? `₹${Number(selectedLead.potential_value).toLocaleString('en-IN')}` : 'Flexible'}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/40 mb-0.5">Travelers</p>
                      <p className="font-bold text-white/95">{selectedLead.travelers || '—'}</p>
                    </div>
                    <div>
                      <p className="text-white/40 mb-0.5">Current Status</p>
                      <div>
                        <span className={`inline-flex items-center text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${statusColor[selectedLead.status] || 'bg-white/10 text-white/50 border-white/20'}`}>
                          {selectedLead.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline and Live Chat Tab Switch */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-wide">Live Chat & Timeline</h3>
                    {fetchingLogs && (
                      <span className="text-[10px] text-white/40 animate-pulse">Refreshing...</span>
                    )}
                  </div>

                  <div className="h-[45vh] flex flex-col justify-between">
                    {/* Chat history */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/5 border border-white/10 rounded-2xl">
                      {leadLogs.length > 0 ? (
                        [...leadLogs]
                          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                          .map(log => {
                            if (log.type === 'Chat') {
                              const isOutbound = log.sender === partner?.companyName || log.sender === partner?.name || log.sender === 'Partner';
                              
                              return (
                                <div key={log.id} className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}>
                                  <div className="flex items-center gap-1.5 mb-1 px-1">
                                    <span className="text-[10px] font-semibold text-white/40">
                                      {log.sender || 'System'}
                                    </span>
                                    <span className="text-[9px] text-white/30">
                                      • {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <div className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-xs font-semibold leading-relaxed ${
                                    isOutbound
                                      ? 'bg-violet-600 text-white rounded-tr-none'
                                      : 'bg-white/5 border border-white/10 text-white/90 rounded-tl-none'
                                  }`}>
                                    {log.content}
                                  </div>
                                </div>
                              );
                            } else {
                              return (
                                <div key={log.id} className="flex items-start gap-2 py-1.5 px-2 bg-white/2 border border-white/5 rounded-xl text-[11px] text-white/50">
                                  <span className="material-symbols-outlined text-[14px] text-white/30 mt-0.5">info</span>
                                  <div>
                                    <p className="font-semibold text-white/60">{log.content}</p>
                                    <p className="text-[9px] text-white/30 mt-0.5">
                                      {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                </div>
                              );
                            }
                          })
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-white/30 gap-2">
                          <span className="material-symbols-outlined text-3xl">chat</span>
                          <p className="text-xs italic">No updates or messages yet.</p>
                        </div>
                      )}
                    </div>

                    {/* Chat input box */}
                    <form onSubmit={handleSendMessage} className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        placeholder="Type a message to our team..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-semibold text-white placeholder-white/30 outline-none focus:border-violet-500/50"
                      />
                      <button
                        type="submit"
                        disabled={!chatInput.trim()}
                        className="px-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-xs rounded-xl flex items-center justify-center hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all shadow-md"
                      >
                        Send
                      </button>
                    </form>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
