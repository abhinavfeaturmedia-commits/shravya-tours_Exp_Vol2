import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePartnerAuth } from '../../context/PartnerAuthContext';
import { api } from '../../src/lib/api';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';

const StatCard: React.FC<{ icon: string; label: string; value: string; sub?: string; gradient: string; iconColor: string }> = ({ icon, label, value, sub, gradient, iconColor }) => (
  <div className={`bg-gradient-to-br ${gradient} backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:border-white/20 relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20`}>
    <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/5 -translate-y-8 translate-x-8 group-hover:scale-110 transition-transform duration-500" />
    <div className={`size-10 rounded-xl ${iconColor} flex items-center justify-center mb-3 shadow-lg`}>
      <span className="material-symbols-outlined text-white text-[20px]">{icon}</span>
    </div>
    <p className="text-white/60 text-xs font-bold uppercase tracking-wider">{label}</p>
    <p className="text-2xl font-black text-white mt-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/70 transition-all">{value}</p>
    {sub && <p className="text-white/40 text-xs mt-1">{sub}</p>}
  </div>
);

export const PartnerDashboard: React.FC = () => {
  const { partner, refreshPartner } = usePartnerAuth() as any;
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<{ earnings: any[]; funnel: any[]; destinations: any[] } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    refreshPartner();
    fetchRecentLeads();
    fetchAnalytics();
  }, []);


  const fetchAnalytics = async () => {
    try {
      const data = await api.fetchPartnerAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching partner analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchRecentLeads = async () => {
    try {
      const token = localStorage.getItem('shrawello_partner_jwt');
      const API_BASE = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_BASE}/api/partner/leads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setRecentLeads((data.data || []).slice(0, 5));
    } catch { /* silent */ } finally {
      setLeadsLoading(false);
    }
  };

  if (!partner) return null;

  const kycStatus = (partner as any).kyc_status || 'Pending';
  const bankComplete = (partner as any).bank_complete || false;
  const loyaltyTier = (partner as any).loyalty_tier || 'Bronze';
  const loyaltyProgress = (partner as any).loyalty_progress_pct || 0;
  const nextTier = (partner as any).next_loyalty_tier;
  const nextThreshold = (partner as any).loyalty_next_threshold;
  const converted = (partner as any).total_bookings_converted || 0;

  const TIER_ICONS: Record<string, string> = { Bronze: '🥉', Silver: '🥈', Gold: '🥇', Platinum: '💎' };
  const TIER_ACCENT: Record<string, string> = {
    Bronze: 'bg-orange-500', Silver: 'bg-slate-400', Gold: 'bg-amber-400', Platinum: 'bg-purple-500'
  };
  const TIER_TEXT: Record<string, string> = {
    Bronze: 'text-orange-300', Silver: 'text-slate-300', Gold: 'text-amber-300', Platinum: 'text-purple-300'
  };

  const statusColor: Record<string, string> = {
    New: 'bg-blue-500/20 text-blue-300',
    Warm: 'bg-amber-500/20 text-amber-300',
    Hot: 'bg-red-500/20 text-red-300',
    Cold: 'bg-slate-500/20 text-slate-300',
    'Offer Sent': 'bg-purple-500/20 text-purple-300',
    Converted: 'bg-emerald-500/20 text-emerald-300',
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* KYC Status Banners (informational, non-blocking — modal handled sitewide in PartnerLayout) */}
      {kycStatus === 'Submitted' && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-3">
          <span className="material-symbols-outlined text-amber-400 text-xl shrink-0">hourglass_top</span>
          <p className="text-amber-200 text-sm"><strong>KYC Under Review</strong> — Our team will verify your documents within 1–2 business days. You'll be notified by email.</p>
        </div>
      )}
      {kycStatus === 'Verified' && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-5 py-3">
          <span className="material-symbols-outlined text-emerald-400 text-xl shrink-0">verified_user</span>
          <p className="text-emerald-200 text-sm"><strong>KYC Verified</strong> — Your account is fully verified and active.</p>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-violet-600/25 via-purple-600/15 to-indigo-600/25 border border-violet-500/25 rounded-3xl p-6 lg:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-violet-400 text-[20px]">waving_hand</span>
            <p className="text-white/60 text-sm font-semibold">Welcome back,</p>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-white">{partner.name}</h1>
          <p className="text-white/50 text-sm mt-1">{partner.companyName || 'Independent Travel Associate'} · {partner.location || 'Location not set'}</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
            partner.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${partner.status === 'Active' ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
            {partner.status}
          </div>
          <p className="text-white/40 text-xs">
            {partner.commissionType === 'Percentage'
              ? `${partner.commissionValue}% commission per booking`
              : `₹${partner.commissionValue} flat per booking`}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="groups" label="Leads Submitted" value={String(partner.totalLeadsSubmitted ?? (partner as any).total_leads_submitted ?? 0)}
          sub="Total referrals sent"
          gradient="from-blue-900/30 to-indigo-900/20"
          iconColor="bg-gradient-to-br from-blue-500 to-indigo-600"
        />
        <StatCard
          icon="airplane_ticket" label="Bookings Converted" value={String(converted)}
          sub="Leads turned to bookings"
          gradient="from-emerald-900/30 to-teal-900/20"
          iconColor="bg-gradient-to-br from-emerald-500 to-teal-600"
        />
        <StatCard
          icon="payments" label="Total Earnings" value={`₹${Number(partner.totalEarnings ?? (partner as any).total_earnings ?? 0).toLocaleString('en-IN')}`}
          sub="Lifetime commissions earned"
          gradient="from-amber-900/30 to-orange-900/20"
          iconColor="bg-gradient-to-br from-amber-500 to-orange-600"
        />
        <StatCard
          icon="account_balance_wallet" label="Pending Payout" value={`₹${Number(partner.pendingPayout ?? (partner as any).pending_payout ?? 0).toLocaleString('en-IN')}`}
          sub="Approved, awaiting payment"
          gradient="from-violet-900/30 to-purple-900/20"
          iconColor="bg-gradient-to-br from-violet-500 to-purple-600"
        />
      </div>

      {/* Loyalty Tier Widget */}
      <Link to="/partner/milestones" className="block">
        <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/30 border border-white/10 hover:border-violet-500/40 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all group">
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-3xl">{TIER_ICONS[loyaltyTier]}</span>
            <div>
              <p className="text-white/50 text-xs uppercase tracking-widest font-semibold">Loyalty Tier</p>
              <p className={`text-xl font-black ${TIER_TEXT[loyaltyTier]}`}>{loyaltyTier}</p>
            </div>
          </div>
          <div className="flex-1 w-full sm:w-auto">
            {nextTier ? (
              <>
                <div className="flex justify-between mb-1">
                  <p className="text-white/50 text-xs">{converted} / {nextThreshold} bookings to {nextTier}</p>
                  <p className="text-white/50 text-xs">{loyaltyProgress}%</p>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full ${TIER_ACCENT[nextTier]} rounded-full transition-all duration-700`} style={{ width: `${loyaltyProgress}%` }} />
                </div>
              </>
            ) : (
              <p className="text-purple-300 font-semibold text-sm">💎 Maximum Tier Achieved! You're a Platinum Travel Associate.</p>
            )}
          </div>
          <span className="material-symbols-outlined text-white/20 group-hover:text-violet-400 transition-colors text-xl shrink-0">arrow_forward</span>
        </div>
      </Link>

      {/* Performance & Insights Charts */}
      <div>
        <h2 className="text-white font-bold text-lg mb-4">Performance & Insights</h2>
        {analyticsLoading ? (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-12 flex items-center justify-center">
            <div className="size-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Earnings Trend Chart */}
            <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur-md flex flex-col h-[350px]">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white">Monthly Commission Earnings</h3>
                <p className="text-xs text-white/55">Commission payout trends over time</p>
              </div>
              <div className="flex-1 w-full min-h-0">
                {analytics?.earnings && analytics.earnings.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={analytics.earnings}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis
                        dataKey="month"
                        stroke="rgba(255,255,255,0.3)"
                        fontSize={11}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="rgba(255,255,255,0.3)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `₹${val}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px'
                        }}
                        formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Earnings']}
                      />
                      <Area
                        type="monotone"
                        dataKey="amount"
                        stroke="#8b5cf6"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorEarnings)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-white/30 text-xs italic">No earnings history found</div>
                )}
              </div>
            </div>

            {/* Lead Funnel Pie Chart */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur-md flex flex-col h-[350px]">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white">Lead Conversion Funnel</h3>
                <p className="text-xs text-white/55">Distribution of referred lead statuses</p>
              </div>
              <div className="flex-1 w-full min-h-0 relative flex items-center justify-center">
                {analytics?.funnel && analytics.funnel.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.funnel}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="count"
                        nameKey="status"
                      >
                        {analytics.funnel.map((entry: any, index: number) => {
                          const COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#64748b', '#a855f7', '#10b981'];
                          const statusColors: Record<string, string> = {
                            New: '#3b82f6',
                            Warm: '#f59e0b',
                            Hot: '#ef4444',
                            Cold: '#64748b',
                            'Offer Sent': '#a855f7',
                            Converted: '#10b981'
                          };
                          const fill = statusColors[entry.status] || COLORS[index % COLORS.length];
                          return <Cell key={`cell-${index}`} fill={fill} />;
                        })}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px'
                        }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-white/30 text-xs italic">No funnel data available</div>
                )}
              </div>
            </div>

            {/* Top Destinations Bar Chart */}
            <div className="lg:col-span-3 bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur-md flex flex-col h-[300px]">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white">Top Referral Destinations</h3>
                <p className="text-xs text-white/55">Most booked destinations by lead count</p>
              </div>
              <div className="flex-1 w-full min-h-0">
                {analytics?.destinations && analytics.destinations.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analytics.destinations}
                      margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis
                        dataKey="destination"
                        stroke="rgba(255,255,255,0.3)"
                        fontSize={11}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="rgba(255,255,255,0.3)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px'
                        }}
                        formatter={(val: any) => [val, 'Leads']}
                      />
                      <Bar
                        dataKey="count"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={45}
                      >
                        {analytics.destinations.map((entry: any, index: number) => {
                          const COLORS = ['#8b5cf6', '#6366f1', '#3b82f6', '#10b981', '#f59e0b'];
                          return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-white/30 text-xs italic py-16">No destination data available</div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-white font-bold text-lg mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link to="/partner/leads/new" className="group flex items-center gap-4 bg-white/5 hover:bg-violet-600/20 border border-white/10 hover:border-violet-500/40 rounded-2xl p-5 transition-all">
            <div className="size-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-white text-[22px]">person_add</span>
            </div>
            <div>
              <p className="font-bold text-white text-sm">Submit New Lead</p>
              <p className="text-white/40 text-xs">Refer a customer to earn</p>
            </div>
          </Link>
          <Link to="/partner/leads" className="group flex items-center gap-4 bg-white/5 hover:bg-blue-600/20 border border-white/10 hover:border-blue-500/40 rounded-2xl p-5 transition-all">
            <div className="size-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-white text-[22px]">groups</span>
            </div>
            <div>
              <p className="font-bold text-white text-sm">Track My Leads</p>
              <p className="text-white/40 text-xs">Monitor conversion progress</p>
            </div>
          </Link>
          <Link to="/partner/earnings" className="group flex items-center gap-4 bg-white/5 hover:bg-emerald-600/20 border border-white/10 hover:border-emerald-500/40 rounded-2xl p-5 transition-all">
            <div className="size-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-white text-[22px]">payments</span>
            </div>
            <div>
              <p className="font-bold text-white text-sm">View Earnings</p>
              <p className="text-white/40 text-xs">Commission history & payouts</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Leads */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-lg">Recent Leads</h2>
          <Link to="/partner/leads" className="text-violet-400 hover:text-violet-300 text-sm font-semibold transition-colors flex items-center gap-1">
            View All <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {leadsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="size-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            </div>
          ) : recentLeads.length === 0 ? (
            <div className="text-center py-12 px-4">
              <span className="material-symbols-outlined text-4xl text-white/20 block mb-3">groups</span>
              <p className="text-white/40 font-semibold text-sm">No leads submitted yet</p>
              <p className="text-white/25 text-xs mt-1">Submit your first lead to start earning commissions</p>
              <Link to="/partner/leads/new" className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-500 transition-colors">
                <span className="material-symbols-outlined text-[16px]">add</span>Submit Lead
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {recentLeads.map(lead => (
                <div key={lead.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors">
                  <div className="size-9 rounded-full bg-gradient-to-br from-violet-500/30 to-purple-500/30 border border-violet-500/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-violet-400 text-[16px]">person</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{lead.name}</p>
                    <p className="text-xs text-white/40 truncate">{lead.destination} · {lead.travelers || '—'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {lead.booking_id && (
                      <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">CONVERTED</span>
                    )}
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${statusColor[lead.status] || 'bg-white/10 text-white/50'}`}>
                      {lead.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* How it Works */}
      <div className="bg-gradient-to-r from-violet-600/10 to-purple-600/10 border border-violet-500/20 rounded-2xl p-6">
        <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-violet-400 text-[18px]">help_outline</span>
          How Commissions Work
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: '1', icon: 'person_add', title: 'Submit a Lead', desc: 'Enter your customer\'s travel details through the partner portal' },
            { step: '2', icon: 'support_agent', title: 'We Close the Deal', desc: 'Our team contacts the customer and converts them to a booking' },
            { step: '3', icon: 'payments', title: 'You Earn', desc: `You earn ${partner.commissionType === 'Percentage' ? `${partner.commissionValue}%` : `₹${partner.commissionValue}`} when the booking is marked complete` },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-3">
              <div className="size-8 rounded-full bg-violet-600 flex items-center justify-center text-white font-black text-xs shrink-0 mt-0.5">{s.step}</div>
              <div>
                <p className="text-white font-bold text-sm">{s.title}</p>
                <p className="text-white/50 text-xs mt-0.5 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
