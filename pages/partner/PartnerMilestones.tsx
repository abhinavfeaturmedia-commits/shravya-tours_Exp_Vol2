import React, { useEffect, useState } from 'react';
import { usePartnerAuth } from '../../context/PartnerAuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '';
const TIER_ICONS: Record<string, string> = { Bronze: '🥉', Silver: '🥈', Gold: '🥇', Platinum: '💎' };
const TIER_COLORS: Record<string, string> = {
  Bronze: 'from-orange-900/30 to-amber-900/20 border-orange-500/20',
  Silver: 'from-slate-700/30 to-slate-600/20 border-slate-400/20',
  Gold: 'from-amber-900/30 to-yellow-900/20 border-amber-500/20',
  Platinum: 'from-purple-900/30 to-violet-900/20 border-purple-500/20',
};
const TIER_ACCENT: Record<string, string> = {
  Bronze: 'bg-orange-500', Silver: 'bg-slate-400', Gold: 'bg-amber-400', Platinum: 'bg-purple-400',
};
const TIER_TEXT: Record<string, string> = {
  Bronze: 'text-orange-300', Silver: 'text-slate-300', Gold: 'text-amber-300', Platinum: 'text-purple-300',
};
const THRESHOLDS: Record<string, number> = { Bronze: 0, Silver: 10, Gold: 25, Platinum: 50 };
const BONUSES: Record<string, string> = { Bronze: '0%', Silver: '+0.5%', Gold: '+1%', Platinum: '+2%' };
const TIER_LIST = ['Bronze', 'Silver', 'Gold', 'Platinum'];

export const PartnerMilestones: React.FC = () => {
  const { partner } = usePartnerAuth() as any;
  const [milestones, setMilestones] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('shrawello_partner_jwt');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mRes, pRes] = await Promise.all([
        fetch(`${API_BASE}/api/partner/milestones`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/partner/membership-plans`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [mData, pData] = await Promise.all([mRes.json(), pRes.json()]);
      setMilestones(mData);
      setPlans(pData.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="size-10 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  const currentTier = milestones?.tier || partner?.loyalty_tier || 'Bronze';
  const converted = milestones?.converted || partner?.total_bookings_converted || 0;
  const nextTier = TIER_LIST[TIER_LIST.indexOf(currentTier) + 1];
  const nextThreshold = nextTier ? THRESHOLDS[nextTier] : null;
  const progressPct = nextThreshold ? Math.min(100, Math.round((converted / nextThreshold) * 100)) : 100;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Hero Tier Card */}
      <div className={`bg-gradient-to-br ${TIER_COLORS[currentTier]} border rounded-3xl p-8 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/3 -translate-y-10 translate-x-10 pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-white/50 text-sm font-semibold uppercase tracking-widest mb-2">Your Loyalty Tier</p>
            <div className="flex items-center gap-3">
              <span className="text-5xl">{TIER_ICONS[currentTier]}</span>
              <div>
                <h1 className={`text-4xl font-black ${TIER_TEXT[currentTier]}`}>{currentTier}</h1>
                <p className="text-white/60 text-sm mt-0.5">{BONUSES[currentTier]} commission bonus on every booking</p>
              </div>
            </div>
            <p className="text-white/50 text-sm mt-3"><span className="text-white font-bold">{converted}</span> bookings converted lifetime</p>
          </div>
          {nextTier && (
            <div className="shrink-0 min-w-[180px]">
              <p className="text-white/60 text-xs mb-2">Next: {nextTier} {TIER_ICONS[nextTier]}</p>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full ${TIER_ACCENT[nextTier]} rounded-full transition-all duration-1000`} style={{ width: `${progressPct}%` }} />
              </div>
              <div className="flex justify-between mt-1">
                <p className="text-white/40 text-xs">{converted} bookings</p>
                <p className="text-white/40 text-xs">{nextThreshold} needed</p>
              </div>
              <p className={`text-xs font-bold mt-2 ${TIER_TEXT[nextTier]}`}>{nextThreshold! - converted} more bookings to {nextTier}!</p>
            </div>
          )}
          {!nextTier && (
            <div className="shrink-0 bg-purple-500/20 border border-purple-400/30 rounded-2xl p-4 text-center">
              <span className="text-3xl">💎</span>
              <p className="text-purple-300 font-black text-sm mt-1">MAXIMUM TIER</p>
              <p className="text-white/40 text-xs">You're at the top!</p>
            </div>
          )}
        </div>
      </div>

      {/* Tier Roadmap */}
      <div>
        <h2 className="text-white font-bold text-lg mb-5">Tier Roadmap</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {TIER_LIST.map((tier) => {
            const isActive = tier === currentTier;
            const isAchieved = THRESHOLDS[tier] <= converted;
            return (
              <div key={tier} className={`relative rounded-2xl p-5 border transition-all ${isActive ? `bg-gradient-to-br ${TIER_COLORS[tier]} border-opacity-60 shadow-lg scale-[1.02]` : isAchieved ? 'bg-white/5 border-white/15 opacity-80' : 'bg-white/3 border-white/8 opacity-40'}`}>
                {isActive && (
                  <div className="absolute -top-2 -right-2 bg-violet-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Current</div>
                )}
                {isAchieved && !isActive && (
                  <div className="absolute -top-2 -right-2 bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full">✓</div>
                )}
                <div className="text-3xl mb-3">{TIER_ICONS[tier]}</div>
                <h3 className={`font-black text-lg ${isActive ? TIER_TEXT[tier] : 'text-white'}`}>{tier}</h3>
                <p className="text-white/50 text-xs mt-1">{THRESHOLDS[tier]} bookings</p>
                <div className={`mt-3 px-2 py-1 rounded-lg text-xs font-bold text-center ${isAchieved ? `${TIER_ACCENT[tier].replace('bg-', 'bg-')}/20 ${TIER_TEXT[tier]}` : 'bg-white/5 text-white/30'}`}>
                  {BONUSES[tier]} Bonus
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-white font-bold text-lg mb-4">How the Loyalty Program Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: 'person_add', title: 'Submit Leads', desc: 'Refer customers who are interested in travel packages, flights, cabs, hotels, and more.' },
            { icon: 'airplane_ticket', title: 'Get Bookings Converted', desc: 'When a customer you referred completes their booking and payment, it counts toward your tier.' },
            { icon: 'trending_up', title: 'Unlock Higher Tiers', desc: 'More conversions = higher tier = better commission bonus on top of your existing rate.' },
          ].map(item => (
            <div key={item.icon} className="flex gap-3">
              <div className="size-10 shrink-0 bg-violet-500/20 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-violet-400 text-[20px]">{item.icon}</span>
              </div>
              <div>
                <p className="text-white font-bold text-sm">{item.title}</p>
                <p className="text-white/50 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Membership Plans */}
      {plans.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-white font-bold text-lg">Membership Plans</h2>
              <p className="text-white/50 text-sm mt-0.5">Earn <span className="text-emerald-400 font-bold">5%</span> commission for every membership plan you help sell</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map(plan => (
              <div key={plan.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-violet-500/30 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white font-bold">{plan.name}</h3>
                    {plan.tier && <span className="text-xs text-violet-300 bg-violet-500/15 px-2 py-0.5 rounded-md">{plan.tier}</span>}
                  </div>
                  <div className="text-right">
                    <p className="text-white font-black text-xl">₹{Number(plan.price).toLocaleString('en-IN')}</p>
                    <p className="text-white/40 text-xs">{plan.billing_cycle || 'per year'}</p>
                  </div>
                </div>
                {plan.description && <p className="text-white/50 text-xs mb-3 leading-relaxed">{plan.description}</p>}
                {plan.features?.length > 0 && (
                  <ul className="space-y-1 mb-4">
                    {plan.features.slice(0, 4).map((f: string, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-white/60">
                        <span className="text-emerald-400 text-base leading-none">✓</span>{f}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between mt-auto">
                  <p className="text-emerald-300 text-xs font-semibold">Your earning per sale:</p>
                  <p className="text-emerald-400 font-black text-base">₹{Number(plan.partner_earning).toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-white/30 text-xs text-center mt-3">*Membership commissions are subject to successful payment and admin approval</p>
        </div>
      )}
    </div>
  );
};
