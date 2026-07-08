import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { MembershipPlan, CustomerMembership } from '../../types';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

// ─── Helpers ────────────────────────────────────────────────────────────────

const getDaysLeft = (expiresOn: string): number =>
  Math.ceil((new Date(expiresOn).getTime() - Date.now()) / 86_400_000);

const getExpiryPill = (expiresOn: string, status: string) => {
  if (status !== 'Active') return null;
  const d = getDaysLeft(expiresOn);
  if (d < 0) return { label: 'Expired', cls: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' };
  if (d <= 30) return { label: `${d}d left`, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
  if (d <= 90) return { label: `${d}d left`, cls: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' };
  return { label: `${d}d left`, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
};

const calcARR = (memberships: CustomerMembership[]) =>
  memberships
    .filter(m => m.status === 'Active')
    .reduce((sum, m) => {
      const mult = m.billingCycle === 'Monthly' ? 12 : m.billingCycle === 'Quarterly' ? 4 : m.billingCycle === '6 Months' ? 2 : 1;
      return sum + (m.pricePaid || 0) * mult;
    }, 0);

const calcMRR = (memberships: CustomerMembership[]) =>
  memberships
    .filter(m => m.status === 'Active')
    .reduce((sum, m) => {
      const mult = m.billingCycle === 'Monthly' ? 1 : m.billingCycle === 'Quarterly' ? 1 / 3 : m.billingCycle === '6 Months' ? 1 / 6 : 1 / 12;
      return sum + (m.pricePaid || 0) * mult;
    }, 0);

// ─── Component ───────────────────────────────────────────────────────────────

export const MembershipManager: React.FC = () => {
  const {
    membershipPlans, customerMemberships, customers,
    addMembershipPlan, updateMembershipPlan, deleteMembershipPlan,
    enrollCustomer, updateMembership, deleteMembership
  } = useData();

  const [activeTab, setActiveTab] = useState<'members' | 'plans' | 'analytics'>('members');

  // Modals
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<MembershipPlan> | null>(null);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollForm, setEnrollForm] = useState<Partial<CustomerMembership>>({});

  // Members Tab State
  const [memberSearch, setMemberSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Plan card collapsed state (id → expanded sections)
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const toggleCard = (id: string) => setExpandedCards(p => ({ ...p, [id]: !p[id] }));

  // ── Derived tier list from actual plans ──
  const activeTiers = useMemo(() =>
    [...new Set(membershipPlans.map(p => p.tier))],
    [membershipPlans]
  );

  // ── Computed Stats ──
  const activeMemberCount = customerMemberships.filter(m => m.status === 'Active').length;
  const expiringSoonCount = customerMemberships.filter(m => {
    if (m.status !== 'Active') return false;
    const d = getDaysLeft(m.expiresOn);
    return d <= 30 && d >= 0;
  }).length;
  const churnCount = customerMemberships.filter(m => m.status === 'Expired').length;
  const activePlanCount = membershipPlans.filter(p => p.isActive).length;
  const arr = calcARR(customerMemberships);
  const mrr = calcMRR(customerMemberships);

  const filteredMembers = useMemo(() =>
    customerMemberships.filter(m => {
      const matchSearch = m.customerName.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.customerEmail.toLowerCase().includes(memberSearch.toLowerCase());
      const matchTier = tierFilter === 'All' || m.tier === tierFilter;
      const matchStatus = statusFilter === 'All' || m.status === statusFilter;
      return matchSearch && matchTier && matchStatus;
    }),
    [customerMemberships, memberSearch, tierFilter, statusFilter]
  );

  // ── Handlers ──
  const handleSavePlan = async () => {
    if (!editingPlan?.name || !editingPlan?.tier) return;
    try {
      if (editingPlan.id) {
        await updateMembershipPlan(editingPlan.id, editingPlan);
      } else {
        await addMembershipPlan({
          ...editingPlan,
          id: uuidv4(),
          pricePerMonth: editingPlan.pricePerMonth || 0,
          pricePerQuarter: editingPlan.pricePerQuarter || 0,
          pricePerHalfYear: editingPlan.pricePerHalfYear || 0,
          pricePerYear: editingPlan.pricePerYear || 0,
          discountType: editingPlan.discountType || 'Percentage',
          discountPercent: editingPlan.discountPercent || 0,
          discountFlat: editingPlan.discountFlat || 0,
          hotelDiscount: editingPlan.hotelDiscount || 0,
          tourDiscount: editingPlan.tourDiscount || 0,
          flightDiscount: editingPlan.flightDiscount || 0,
          cabDiscount: editingPlan.cabDiscount || 0,
          perks: editingPlan.perks || [],
          color: editingPlan.color || '#CD7F32',
          isActive: true,
          showOnHomepage: false,
        } as MembershipPlan);
      }
      setIsPlanModalOpen(false);
    } catch (e) { console.error(e); }
  };

  const handleEnrollCustomer = async () => {
    if (!enrollForm.customerId || !enrollForm.planId) return;
    const customer = customers.find(c => c.id === enrollForm.customerId);
    const plan = membershipPlans.find(p => p.id === enrollForm.planId);
    if (!customer || !plan) return;

    const startDate = enrollForm.enrolledOn || new Date().toISOString().split('T')[0];
    const expDate = new Date(startDate);
    const cycle = enrollForm.billingCycle || 'Yearly';
    let pricePaid = plan.pricePerYear;

    if (cycle === 'Monthly') { expDate.setMonth(expDate.getMonth() + 1); pricePaid = plan.pricePerMonth; }
    else if (cycle === 'Quarterly') { expDate.setMonth(expDate.getMonth() + 3); pricePaid = plan.pricePerQuarter; }
    else if (cycle === '6 Months') { expDate.setMonth(expDate.getMonth() + 6); pricePaid = plan.pricePerHalfYear; }
    else expDate.setFullYear(expDate.getFullYear() + 1);

    try {
      await enrollCustomer({
        id: uuidv4(),
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        planId: plan.id,
        planName: plan.name,
        tier: plan.tier,
        status: 'Active',
        billingCycle: cycle,
        pricePaid,
        enrolledOn: startDate,
        expiresOn: expDate.toISOString().split('T')[0],
        discountType: plan.discountType || 'Percentage',
        discountPercent: plan.discountPercent || 0,
        discountFlat: plan.discountFlat || 0,
        hotelDiscount: plan.hotelDiscount || 0,
        tourDiscount: plan.tourDiscount || 0,
        flightDiscount: plan.flightDiscount || 0,
        cabDiscount: plan.cabDiscount || 0,
        notes: enrollForm.notes || ''
      });
      setIsEnrollModalOpen(false);
      setEnrollForm({});
    } catch (e) { console.error(e); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-7 animate-in fade-in">

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200 dark:shadow-amber-900/30">
            <span className="material-symbols-outlined text-white text-2xl">workspace_premium</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Membership Hub</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage VIP tiers, perks, and enrolled customers</p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => { setEditingPlan({}); setIsPlanModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm border border-slate-200 dark:border-slate-700"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Plan
          </button>
          <button
            onClick={() => { setEnrollForm({}); setIsEnrollModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-indigo-600 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/25"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Enroll Customer
          </button>
        </div>
      </div>

      {/* ── 4-Stat Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Active Members', value: activeMemberCount, icon: 'verified_user',
            iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', iconColor: 'text-emerald-600 dark:text-emerald-400',
            border: 'border-emerald-100 dark:border-emerald-900/30',
            sub: `${churnCount} expired`,
          },
          {
            label: 'Expiring Soon', value: expiringSoonCount, icon: 'update',
            iconBg: 'bg-amber-100 dark:bg-amber-900/40', iconColor: 'text-amber-600 dark:text-amber-400',
            border: 'border-amber-100 dark:border-amber-900/30',
            sub: 'within 30 days',
          },
          {
            label: 'Monthly Revenue', value: `₹${Math.round(mrr).toLocaleString()}`, icon: 'payments',
            iconBg: 'bg-blue-100 dark:bg-blue-900/40', iconColor: 'text-blue-600 dark:text-blue-400',
            border: 'border-blue-100 dark:border-blue-900/30',
            sub: `₹${Math.round(arr).toLocaleString()} ARR`,
          },
          {
            label: 'Active Plans', value: activePlanCount, icon: 'style',
            iconBg: 'bg-violet-100 dark:bg-violet-900/40', iconColor: 'text-violet-600 dark:text-violet-400',
            border: 'border-violet-100 dark:border-violet-900/30',
            sub: `${membershipPlans.filter(p => p.showOnHomepage && p.isActive).length} on homepage`,
          },
        ].map(stat => (
          <div key={stat.label} className={`bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border ${stat.border} flex items-center gap-4 group hover:shadow-md transition-all`}>
            <div className={`w-12 h-12 rounded-2xl ${stat.iconBg} flex items-center justify-center ${stat.iconColor} group-hover:scale-110 transition-transform flex-shrink-0`}>
              <span className="material-symbols-outlined text-xl">{stat.icon}</span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider truncate">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 leading-none">{stat.value}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-1">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'members', label: 'Members', icon: 'groups', count: activeMemberCount },
          { id: 'plans', label: 'Plans & Tiers', icon: 'workspace_premium', count: membershipPlans.length },
          { id: 'analytics', label: 'Analytics', icon: 'insights', count: null },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold text-sm transition-all rounded-t-xl ${
              activeTab === tab.id
                ? 'border-primary text-primary bg-primary/5 dark:bg-primary/10'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">{tab.icon}</span>
            {tab.label}
            {tab.count !== null && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                activeTab === tab.id ? 'bg-primary/15 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* MEMBERS TAB                                           */}
      {/* ══════════════════════════════════════════════════════ */}
      {activeTab === 'members' && (
        <div className="space-y-5 animate-in slide-in-from-right-4">
          {/* Search + Filters */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
              <input
                type="text"
                placeholder="Search by name or email..."
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold text-sm"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2.5">
              <select
                className="h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary/20 font-semibold text-sm min-w-[130px]"
                value={tierFilter}
                onChange={e => setTierFilter(e.target.value)}
              >
                <option value="All">All Tiers</option>
                {activeTiers.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select
                className="h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary/20 font-semibold text-sm min-w-[130px]"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest font-black">
                    <th className="p-4 pl-6">Customer</th>
                    <th className="p-4">Tier & Plan</th>
                    <th className="p-4">Enrolled</th>
                    <th className="p-4">Expires</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
                  {filteredMembers.map(m => {
                    const planDef = membershipPlans.find(p => p.id === m.planId);
                    const tierColor = planDef?.color || '#CD7F32';
                    const expiryPill = getExpiryPill(m.expiresOn, m.status);
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        {/* Customer */}
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            {/* Tier-colored avatar */}
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-sm flex-shrink-0 shadow-sm"
                              style={{ background: `linear-gradient(135deg, ${tierColor}cc, ${tierColor})` }}
                            >
                              {m.customerName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white leading-tight">{m.customerName}</div>
                              <div className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">{m.customerEmail}</div>
                            </div>
                          </div>
                        </td>
                        {/* Tier & Plan */}
                        <td className="p-4">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black"
                                style={{ backgroundColor: `${tierColor}18`, color: tierColor }}
                              >
                                <span className="material-symbols-outlined text-[11px]">workspace_premium</span>
                                {m.tier}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                {m.billingCycle || 'Yearly'}
                              </span>
                            </div>
                            <div className="text-slate-600 dark:text-slate-300 text-xs font-semibold">{m.planName}</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">Paid: ₹{m.pricePaid?.toLocaleString()}</div>
                          </div>
                        </td>
                        {/* Enrolled */}
                        <td className="p-4 text-slate-600 dark:text-slate-300 font-medium text-sm">
                          {format(new Date(m.enrolledOn), 'MMM dd, yyyy')}
                        </td>
                        {/* Expires + Countdown */}
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-600 dark:text-slate-300 font-medium text-sm">
                              {format(new Date(m.expiresOn), 'MMM dd, yyyy')}
                            </span>
                            {expiryPill && (
                              <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full w-fit ${expiryPill.cls}`}>
                                <span className="material-symbols-outlined text-[10px]">schedule</span>
                                {expiryPill.label}
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Status */}
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wide inline-flex items-center gap-1 ${
                            m.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            m.status === 'Suspended' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {m.status}
                          </span>
                        </td>
                        {/* Actions — always visible */}
                        <td className="p-4 pr-6">
                          <div className="flex justify-end gap-1.5">
                            {/* Renew */}
                            <button
                              onClick={() => {
                                const plan = membershipPlans.find(p => p.id === m.planId);
                                if (!plan) return;
                                const newExp = new Date(m.expiresOn > new Date().toISOString().split('T')[0] ? m.expiresOn : new Date().toISOString().split('T')[0]);
                                const cycle = m.billingCycle || 'Yearly';
                                if (cycle === 'Monthly') newExp.setMonth(newExp.getMonth() + 1);
                                else if (cycle === 'Quarterly') newExp.setMonth(newExp.getMonth() + 3);
                                else if (cycle === '6 Months') newExp.setMonth(newExp.getMonth() + 6);
                                else newExp.setFullYear(newExp.getFullYear() + 1);
                                updateMembership(m.id, { expiresOn: newExp.toISOString().split('T')[0], status: 'Active' });
                              }}
                              className="p-2 text-slate-400 hover:text-emerald-600 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 hover:border-emerald-200"
                              title="Renew Membership"
                            >
                              <span className="material-symbols-outlined text-[16px]">autorenew</span>
                            </button>
                            {/* Suspend / Activate */}
                            <button
                              onClick={() => updateMembership(m.id, { status: m.status === 'Active' ? 'Suspended' : 'Active' })}
                              className="p-2 text-slate-400 hover:text-amber-600 bg-slate-50 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 hover:border-amber-200"
                              title={m.status === 'Active' ? 'Suspend' : 'Activate'}
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {m.status === 'Active' ? 'pause_circle' : 'play_circle'}
                              </span>
                            </button>
                            {/* Delete */}
                            <button
                              onClick={() => { if (window.confirm('Delete this membership record permanently?')) deleteMembership(m.id); }}
                              className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 hover:border-rose-200"
                              title="Delete"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredMembers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                          <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">card_membership</span>
                          </div>
                          <p className="font-black text-slate-600 dark:text-slate-300 text-base">
                            {memberSearch || tierFilter !== 'All' || statusFilter !== 'All' ? 'No members match your filters' : 'No members enrolled yet'}
                          </p>
                          <p className="text-sm max-w-xs">
                            {memberSearch || tierFilter !== 'All' || statusFilter !== 'All'
                              ? 'Try adjusting your search or filters.'
                              : 'Click "Enroll Customer" to add your first member.'
                            }
                          </p>
                          {!(memberSearch || tierFilter !== 'All' || statusFilter !== 'All') && (
                            <button
                              onClick={() => { setEnrollForm({}); setIsEnrollModalOpen(true); }}
                              className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25"
                            >
                              <span className="material-symbols-outlined text-[18px]">person_add</span>
                              Enroll First Customer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredMembers.length > 0 && (
              <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                <p className="text-xs text-slate-400 font-medium">
                  Showing <span className="font-bold text-slate-600 dark:text-slate-300">{filteredMembers.length}</span> of <span className="font-bold">{customerMemberships.length}</span> memberships
                </p>
                <p className="text-xs text-slate-400">
                  Total collected: <span className="font-black text-slate-700 dark:text-slate-200">₹{customerMemberships.reduce((s, m) => s + (m.pricePaid || 0), 0).toLocaleString()}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* PLANS TAB                                             */}
      {/* ══════════════════════════════════════════════════════ */}
      {activeTab === 'plans' && (
        <div className="space-y-5 animate-in slide-in-from-right-4">
          {/* Homepage Visibility Banner */}
          <div className={`flex items-center gap-4 p-4 rounded-2xl border ${
            membershipPlans.filter(p => p.showOnHomepage && p.isActive).length > 0
              ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/50'
              : 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40'
          }`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              membershipPlans.filter(p => p.showOnHomepage && p.isActive).length > 0
                ? 'bg-indigo-100 dark:bg-indigo-900/50'
                : 'bg-amber-100 dark:bg-amber-900/40'
            }`}>
              <span className={`material-symbols-outlined text-[20px] ${
                membershipPlans.filter(p => p.showOnHomepage && p.isActive).length > 0
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}>public</span>
            </div>
            <div className="flex-1">
              {membershipPlans.filter(p => p.showOnHomepage && p.isActive).length > 0 ? (
                <>
                  <p className="text-sm font-bold text-indigo-900 dark:text-indigo-200">
                    <span className="text-indigo-600 dark:text-indigo-400 font-black">{membershipPlans.filter(p => p.showOnHomepage && p.isActive).length} plan{membershipPlans.filter(p => p.showOnHomepage && p.isActive).length !== 1 ? 's' : ''}</span> currently visible on the homepage
                  </p>
                  <p className="text-xs text-indigo-500/80 dark:text-indigo-400/70 mt-0.5">Use the <strong>Show on Homepage</strong> toggle on each plan card to control public visibility.</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Membership section is hidden from the homepage</p>
                  <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">Enable at least one active plan's <strong>Show on Homepage</strong> toggle to display the section.</p>
                </>
              )}
            </div>
            <span className={`text-xs font-black px-3 py-1.5 rounded-full flex-shrink-0 ${
              membershipPlans.filter(p => p.showOnHomepage && p.isActive).length > 0
                ? 'bg-indigo-500 text-white'
                : 'bg-amber-200 dark:bg-amber-800/50 text-amber-800 dark:text-amber-300'
            }`}>
              {membershipPlans.filter(p => p.showOnHomepage && p.isActive).length > 0 ? '● LIVE' : '○ HIDDEN'}
            </span>
          </div>

          {/* Plan Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {membershipPlans.map(plan => {
              const isExpanded = expandedCards[plan.id];
              const enrolledCount = customerMemberships.filter(m => m.planId === plan.id && m.status === 'Active').length;
              return (
                <div
                  key={plan.id}
                  className={`bg-white dark:bg-slate-900 rounded-3xl border-2 shadow-lg flex flex-col overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl ${!plan.isActive ? 'opacity-55 grayscale' : ''}`}
                  style={{ borderColor: plan.color }}
                >
                  {/* Card Header */}
                  <div className="p-6 border-b relative overflow-hidden" style={{ backgroundColor: `${plan.color}08`, borderColor: `${plan.color}20` }}>
                    <div className="absolute top-0 right-0 w-28 h-28 rounded-full -translate-y-1/2 translate-x-1/2 opacity-15" style={{ backgroundColor: plan.color }} />
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider text-white shadow-sm" style={{ backgroundColor: plan.color }}>
                            {plan.tier}
                          </span>
                          {plan.showOnHomepage && plan.isActive && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[10px]">public</span>
                              Live
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">group</span>
                          {enrolledCount} enrolled
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2" style={{ color: plan.color }}>{plan.name}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-slate-900 dark:text-white">₹{plan.pricePerYear.toLocaleString()}</span>
                        <span className="text-sm font-bold text-slate-400">/year</span>
                      </div>
                      {plan.pricePerMonth > 0 && (
                        <p className="text-[11px] text-slate-400 mt-0.5">or ₹{plan.pricePerMonth.toLocaleString()}/mo</p>
                      )}
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col gap-4">
                    {/* Core Discount — always visible */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Global Discount</span>
                      <span className="text-lg font-black" style={{ color: plan.color }}>
                        {plan.discountType === 'Flat_Amount' ? `₹${plan.discountFlat?.toLocaleString()}` : `${plan.discountPercent}%`}
                      </span>
                    </div>

                    {/* Perks preview — first 3 always visible */}
                    {plan.perks?.length > 0 && (
                      <ul className="space-y-2">
                        {plan.perks.slice(0, 3).map((perk, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5" style={{ backgroundColor: `${plan.color}20`, color: plan.color }}>
                              <span className="material-symbols-outlined text-[12px]">check</span>
                            </div>
                            <span className="text-sm text-slate-600 dark:text-slate-300 leading-snug">{perk}</span>
                          </li>
                        ))}
                        {plan.perks.length > 3 && !isExpanded && (
                          <li className="text-xs text-slate-400 pl-7">+{plan.perks.length - 3} more perks</li>
                        )}
                      </ul>
                    )}

                    {/* Expandable Details */}
                    {isExpanded && (
                      <div className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                        {/* Remaining perks */}
                        {plan.perks?.length > 3 && (
                          <ul className="space-y-2">
                            {plan.perks.slice(3).map((perk, i) => (
                              <li key={i} className="flex items-start gap-2.5">
                                <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5" style={{ backgroundColor: `${plan.color}20`, color: plan.color }}>
                                  <span className="material-symbols-outlined text-[12px]">check</span>
                                </div>
                                <span className="text-sm text-slate-600 dark:text-slate-300 leading-snug">{perk}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Billing Grid */}
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Billing Options</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              ['Monthly', plan.pricePerMonth],
                              ['Quarterly', plan.pricePerQuarter],
                              ['6 Months', plan.pricePerHalfYear],
                              ['Yearly', plan.pricePerYear],
                            ].map(([label, price]) => (
                              <div key={label as string} className="p-2 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-white/5">
                                <span className="text-[9px] font-bold text-slate-400 block">{label}</span>
                                <span className="text-sm font-extrabold text-slate-900 dark:text-white">₹{(price as number)?.toLocaleString() || '0'}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Category Boosts */}
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Category Boosts</p>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { icon: 'hotel', label: 'Hotel', val: plan.hotelDiscount },
                              { icon: 'flight', label: 'Flight', val: plan.flightDiscount },
                              { icon: 'tour', label: 'Tour', val: plan.tourDiscount },
                              { icon: 'local_taxi', label: 'Cab', val: plan.cabDiscount },
                            ].map(b => (
                              <div key={b.label} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
                                <span className="material-symbols-outlined text-slate-400 text-[16px] block mb-0.5">{b.icon}</span>
                                <span className="text-[9px] font-bold text-slate-500 block">{b.label}</span>
                                <span className="text-xs font-black" style={{ color: plan.color }}>+{b.val}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Expand/Collapse toggle */}
                    <button
                      onClick={() => toggleCard(plan.id)}
                      className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors py-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                      {isExpanded ? 'Show Less' : `Show Details`}
                    </button>

                    {/* Homepage Toggle — prominent */}
                    <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/20 border border-indigo-100 dark:border-indigo-900/50">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="material-symbols-outlined text-indigo-500 dark:text-indigo-400 text-[18px] flex-shrink-0">public</span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Show on Homepage</p>
                          <p className="text-[11px] text-indigo-600/70 dark:text-indigo-400/70 truncate">
                            {plan.showOnHomepage && plan.isActive ? '● Visible to visitors' : '○ Hidden from homepage'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => updateMembershipPlan(plan.id, { showOnHomepage: !plan.showOnHomepage })}
                        disabled={!plan.isActive}
                        title={!plan.isActive ? 'Activate plan first' : plan.showOnHomepage ? 'Hide from homepage' : 'Show on homepage'}
                        className={`relative inline-flex items-center flex-shrink-0 h-7 w-14 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                          plan.showOnHomepage && plan.isActive
                            ? 'bg-indigo-500 shadow-md shadow-indigo-200 dark:shadow-indigo-900/30'
                            : 'bg-slate-200 dark:bg-slate-700'
                        } ${!plan.isActive ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}`}
                      >
                        <span className={`inline-block w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${plan.showOnHomepage && plan.isActive ? 'translate-x-8' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-1 mt-auto">
                      <button
                        onClick={() => { setEditingPlan(plan); setIsPlanModalOpen(true); }}
                        className="flex-1 px-3 py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                        Edit
                      </button>
                      <button
                        onClick={() => updateMembershipPlan(plan.id, { isActive: !plan.isActive })}
                        className={`px-3 py-2.5 rounded-xl font-bold text-xs transition-colors border flex items-center gap-1.5 ${
                          plan.isActive
                            ? 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">{plan.isActive ? 'pause' : 'play_arrow'}</span>
                        {plan.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => { if (window.confirm(`Permanently delete "${plan.name}"? This cannot be undone.`)) deleteMembershipPlan(plan.id); }}
                        className="px-3 py-2.5 rounded-xl font-bold text-xs transition-colors border border-rose-200 dark:border-rose-900/50 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-700 flex items-center gap-1"
                        title="Delete Plan"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {membershipPlans.length === 0 && (
              <div className="col-span-3 py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-5">
                  <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">card_membership</span>
                </div>
                <h3 className="text-xl font-black text-slate-700 dark:text-slate-300 mb-2">No Plans Yet</h3>
                <p className="text-slate-400 mb-6 max-w-sm mx-auto text-sm">Create membership plans to offer your customers exclusive travel discounts and perks.</p>
                <button
                  onClick={() => { setEditingPlan({}); setIsPlanModalOpen(true); }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Create First Plan
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* ANALYTICS TAB                                         */}
      {/* ══════════════════════════════════════════════════════ */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-in slide-in-from-right-4">
          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Monthly Revenue', value: `₹${Math.round(mrr).toLocaleString()}`, sub: 'MRR', icon: 'payments', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
              { label: 'Annual Revenue', value: `₹${Math.round(arr).toLocaleString()}`, sub: 'ARR (projected)', icon: 'account_balance', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
              { label: 'Avg. Revenue / Member', value: activeMemberCount > 0 ? `₹${Math.round(mrr / activeMemberCount).toLocaleString()}` : '—', sub: 'per member/mo', icon: 'person', color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20' },
              { label: 'Churn Rate', value: customerMemberships.length > 0 ? `${((churnCount / customerMemberships.length) * 100).toFixed(0)}%` : '0%', sub: `${churnCount} expired`, icon: 'trending_down', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center ${kpi.color}`}>
                  <span className="material-symbols-outlined text-[18px]">{kpi.icon}</span>
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{kpi.value}</p>
                <div>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-wide">{kpi.label}</p>
                  <p className="text-[11px] text-slate-400">{kpi.sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tier Distribution */}
            <div className="col-span-1 lg:col-span-2 bg-white dark:bg-slate-900 p-7 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">donut_large</span>
                Member Distribution by Tier
              </h3>
              <div className="space-y-5">
                {(['Bronze', 'Silver', 'Gold'] as const).map(tier => {
                  const planForTier = membershipPlans.find(p => p.tier === tier);
                  const color = planForTier?.color || (tier === 'Bronze' ? '#CD7F32' : tier === 'Silver' ? '#9E9E9E' : '#FFD700');
                  const count = customerMemberships.filter(m => m.tier === tier && m.status === 'Active').length;
                  const total = activeMemberCount || 1;
                  const pct = (count / total) * 100;
                  const tierRevenue = customerMemberships.filter(m => m.tier === tier && m.status === 'Active').reduce((s, m) => s + (m.pricePaid || 0), 0);
                  return (
                    <div key={tier}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: color }}>
                            <span className="material-symbols-outlined text-white text-[15px]">workspace_premium</span>
                          </div>
                          <div>
                            <span className="font-black text-slate-700 dark:text-slate-200 text-sm">{tier} Tier</span>
                            {tierRevenue > 0 && <span className="text-[11px] text-slate-400 ml-2">₹{tierRevenue.toLocaleString()} collected</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-black text-slate-900 dark:text-white">{count}</span>
                          <span className="text-sm font-medium text-slate-400 ml-1.5">({pct.toFixed(0)}%)</span>
                        </div>
                      </div>
                      <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Billing Cycle Breakdown */}
              <div className="mt-7 pt-6 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Billing Cycle Split</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(['Monthly', 'Quarterly', '6 Months', 'Yearly'] as const).map(cycle => {
                    const cnt = customerMemberships.filter(m => m.status === 'Active' && m.billingCycle === cycle).length;
                    return (
                      <div key={cycle} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
                        <p className="text-xl font-black text-slate-900 dark:text-white">{cnt}</p>
                        <p className="text-[10px] font-bold text-slate-500 mt-1">{cycle}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ARR Card */}
            <div className="col-span-1 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-7 rounded-3xl shadow-xl flex flex-col justify-between text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-violet-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
              <div className="relative z-10 space-y-6">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto border border-white/15 shadow-2xl">
                  <span className="material-symbols-outlined text-white text-3xl">account_balance</span>
                </div>
                <div>
                  <p className="text-indigo-300 font-black uppercase tracking-widest text-[10px] mb-1">Annual Recurring Revenue</p>
                  <p className="text-5xl font-black text-white">₹{Math.round(arr).toLocaleString()}</p>
                  <p className="text-indigo-400 text-xs mt-2 font-medium">₹{Math.round(mrr).toLocaleString()} / month</p>
                </div>
                <div className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500/15 text-emerald-300 rounded-xl border border-emerald-500/25">
                  <span className="material-symbols-outlined text-[14px]">trending_up</span>
                  <span className="text-xs font-bold">Based on {activeMemberCount} active plans</span>
                </div>

                {/* Status Breakdown */}
                <div className="space-y-2 text-left">
                  {[
                    { label: 'Active', count: activeMemberCount, color: 'text-emerald-400' },
                    { label: 'Suspended', count: customerMemberships.filter(m => m.status === 'Suspended').length, color: 'text-amber-400' },
                    { label: 'Expired', count: churnCount, color: 'text-rose-400' },
                  ].map(s => (
                    <div key={s.label} className="flex items-center justify-between text-sm">
                      <span className="text-white/50 font-medium">{s.label}</span>
                      <span className={`font-black ${s.color}`}>{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* MODALS                                                */}
      {/* ══════════════════════════════════════════════════════ */}

      {/* Plan Create/Edit Modal */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">edit_square</span>
                {editingPlan?.id ? 'Edit Membership Plan' : 'Create New Plan'}
              </h2>
              <button onClick={() => setIsPlanModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-8 overflow-y-auto flex-1 space-y-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Plan Name <span className="text-rose-500">*</span></label>
                  <input type="text" placeholder="e.g. Explorer Pass" className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary/50 transition-all font-semibold" value={editingPlan?.name || ''} onChange={e => setEditingPlan(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Tier Level <span className="text-rose-500">*</span></label>
                  <div className="grid grid-cols-3 gap-4">
                    {(['Bronze', 'Silver', 'Gold'] as const).map(t => {
                      const isSelected = (editingPlan?.tier || 'Bronze') === t;
                      const color = t === 'Bronze' ? '#CD7F32' : t === 'Silver' ? '#9E9E9E' : '#FFD700';
                      return (
                        <button key={t} type="button" onClick={() => setEditingPlan(p => ({ ...p, tier: t, color: p?.color || color }))}
                          className={`relative p-4 rounded-2xl border-2 text-left transition-all ${isSelected ? 'bg-slate-50 dark:bg-slate-800/80 shadow-md scale-[1.02]' : 'bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
                          style={{ borderColor: isSelected ? color : 'transparent', boxShadow: isSelected ? `0 4px 20px ${color}15` : 'none' }}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider text-white" style={{ backgroundColor: color }}>{t}</span>
                            {isSelected && <span className="material-symbols-outlined text-[18px] font-bold animate-in zoom-in-50" style={{ color }}>check_circle</span>}
                          </div>
                          <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2">{t === 'Bronze' ? 'Essential benefits' : t === 'Silver' ? 'Enhanced perks' : 'Ultimate experience'}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/60 space-y-4">
                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">payments</span>Plan Pricing
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Monthly (₹)', key: 'pricePerMonth' },
                    { label: 'Quarterly (₹)', key: 'pricePerQuarter' },
                    { label: '6 Months (₹)', key: 'pricePerHalfYear' },
                    { label: 'Yearly (₹) *', key: 'pricePerYear' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">{f.label}</label>
                      <input type="number" className="w-full h-11 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 font-bold"
                        value={(editingPlan as any)?.[f.key] || 0}
                        onChange={e => setEditingPlan(p => ({ ...p, [f.key]: Number(e.target.value) }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Brand Color</label>
                <div className="flex gap-3">
                  <input type="color" className="h-12 w-16 p-1 rounded-xl bg-slate-50 dark:bg-slate-800 border-none cursor-pointer" value={editingPlan?.color || '#CD7F32'} onChange={e => setEditingPlan(p => ({ ...p, color: e.target.value }))} />
                  <input type="text" className="flex-1 h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 transition-all font-mono font-bold uppercase" value={editingPlan?.color || '#CD7F32'} onChange={e => setEditingPlan(p => ({ ...p, color: e.target.value }))} />
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/60 space-y-6">
                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500">local_offer</span>Discount & Benefits
                </h4>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl max-w-md">
                  {[{ val: 'Percentage', label: 'Percentage (%)' }, { val: 'Flat_Amount', label: 'Flat Amount (₹)' }].map(opt => (
                    <button key={opt.val} type="button" onClick={() => setEditingPlan(p => ({ ...p, discountType: opt.val as any }))}
                      className={`flex-1 py-2 text-center text-xs font-black rounded-lg transition-all ${(editingPlan?.discountType || 'Percentage') === opt.val ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >{opt.label}</button>
                  ))}
                </div>
                <div className="max-w-xs">
                  {(editingPlan?.discountType || 'Percentage') === 'Percentage' ? (
                    <div className="relative">
                      <label className="block text-xs font-bold text-slate-500 mb-2">Global Discount (%)</label>
                      <input type="number" className="w-full h-11 pl-3 pr-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 font-bold" value={editingPlan?.discountPercent || 0} onChange={e => setEditingPlan(p => ({ ...p, discountPercent: Number(e.target.value) }))} />
                      <span className="absolute right-3 top-[38px] text-slate-400 font-bold text-sm">%</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <label className="block text-xs font-bold text-slate-500 mb-2">Global Flat Discount (₹)</label>
                      <span className="absolute left-3 top-[38px] text-slate-400 font-bold text-sm">₹</span>
                      <input type="number" className="w-full h-11 pl-8 pr-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 font-bold" value={editingPlan?.discountFlat || 0} onChange={e => setEditingPlan(p => ({ ...p, discountFlat: Number(e.target.value) }))} />
                    </div>
                  )}
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700/50 pt-4">
                  <h5 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Category Boosts</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { icon: 'hotel', label: 'Hotel Extra', key: 'hotelDiscount' },
                      { icon: 'flight', label: 'Flight Extra', key: 'flightDiscount' },
                      { icon: 'tour', label: 'Tour Extra', key: 'tourDiscount' },
                      { icon: 'local_taxi', label: 'Cab Extra', key: 'cabDiscount' },
                    ].map(b => (
                      <div key={b.key} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 shadow-sm flex flex-col items-center text-center">
                        <span className="material-symbols-outlined text-primary text-xl mb-1">{b.icon}</span>
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">{b.label}</span>
                        <div className="relative w-full">
                          <input type="number" className="w-full h-9 pl-2 pr-5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center font-bold text-xs focus:ring-2 focus:ring-primary/50"
                            value={(editingPlan as any)?.[b.key] || 0}
                            onChange={e => setEditingPlan(p => ({ ...p, [b.key]: Number(e.target.value) }))}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-500">stars</span>Included Perks
                  </h4>
                  <button onClick={() => setEditingPlan(p => ({ ...p, perks: [...(p?.perks || []), ''] }))} className="text-sm text-primary font-bold flex items-center gap-1 hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-[18px]">add_circle</span> Add Perk
                  </button>
                </div>
                <div className="space-y-3">
                  {editingPlan?.perks?.map((perk, i) => (
                    <div key={i} className="flex gap-3 items-center bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      </div>
                      <input type="text" placeholder="e.g. Free airport lounge access" className="w-full bg-transparent border-none focus:ring-0 font-medium text-sm" value={perk}
                        onChange={e => { const np = [...(editingPlan.perks || [])]; np[i] = e.target.value; setEditingPlan(p => ({ ...p, perks: np })); }}
                      />
                      <button onClick={() => { const np = [...(editingPlan.perks || [])]; np.splice(i, 1); setEditingPlan(p => ({ ...p, perks: np })); }} className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 flex items-center justify-center shrink-0 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  ))}
                  {(!editingPlan?.perks || editingPlan.perks.length === 0) && (
                    <p className="text-sm text-slate-400 italic p-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">No perks added yet.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button onClick={() => setIsPlanModalOpen(false)} className="px-6 py-3 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleSavePlan} className="px-8 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg shadow-primary/30 transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">save</span>Save Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enroll Customer Modal */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-primary to-indigo-600 text-white">
              <h2 className="text-xl font-black flex items-center gap-2">
                <span className="material-symbols-outlined">person_add</span>Enroll Customer
              </h2>
              <button onClick={() => setIsEnrollModalOpen(false)} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Customer <span className="text-rose-500">*</span></label>
                <select className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 font-medium" value={enrollForm.customerId || ''} onChange={e => setEnrollForm(f => ({ ...f, customerId: e.target.value }))}>
                  <option value="">Select a Customer...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Membership Plan <span className="text-rose-500">*</span></label>
                <select className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 font-medium" value={enrollForm.planId || ''} onChange={e => { const plan = membershipPlans.find(p => p.id === e.target.value); setEnrollForm(f => ({ ...f, planId: e.target.value, billingCycle: 'Yearly', pricePaid: plan?.pricePerYear || 0 })); }}>
                  <option value="">Select a Plan...</option>
                  {membershipPlans.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.name} (Tier: {p.tier})</option>)}
                </select>
              </div>
              {enrollForm.planId && (() => {
                const plan = membershipPlans.find(p => p.id === enrollForm.planId);
                if (!plan) return null;
                const cycle = enrollForm.billingCycle || 'Yearly';
                let price = plan.pricePerYear;
                if (cycle === 'Monthly') price = plan.pricePerMonth;
                else if (cycle === 'Quarterly') price = plan.pricePerQuarter;
                else if (cycle === '6 Months') price = plan.pricePerHalfYear;
                const startDate = enrollForm.enrolledOn || new Date().toISOString().split('T')[0];
                const expDate = new Date(startDate);
                if (cycle === 'Monthly') expDate.setMonth(expDate.getMonth() + 1);
                else if (cycle === 'Quarterly') expDate.setMonth(expDate.getMonth() + 3);
                else if (cycle === '6 Months') expDate.setMonth(expDate.getMonth() + 6);
                else expDate.setFullYear(expDate.getFullYear() + 1);
                return (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Billing Cycle <span className="text-rose-500">*</span></label>
                      <select className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 font-medium" value={cycle} onChange={e => setEnrollForm(f => ({ ...f, billingCycle: e.target.value as any, pricePaid: e.target.value === 'Monthly' ? plan.pricePerMonth : e.target.value === 'Quarterly' ? plan.pricePerQuarter : e.target.value === '6 Months' ? plan.pricePerHalfYear : plan.pricePerYear }))}>
                        <option value="Monthly">Monthly — ₹{plan.pricePerMonth}/mo</option>
                        <option value="Quarterly">Quarterly — ₹{plan.pricePerQuarter}/quarter</option>
                        <option value="6 Months">6 Months — ₹{plan.pricePerHalfYear}/6mo</option>
                        <option value="Yearly">Yearly — ₹{plan.pricePerYear}/yr</option>
                      </select>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs font-semibold space-y-2">
                      <div className="flex justify-between"><span className="text-slate-500">Price to Pay:</span><span className="text-slate-900 dark:text-white font-black text-sm">₹{price.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Active Until:</span><span className="text-primary font-bold">{format(expDate, 'MMM dd, yyyy')}</span></div>
                      <div className="border-t border-slate-200 dark:border-slate-700/50 pt-2 flex justify-between">
                        <span className="text-slate-500">Membership Discount:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{plan.discountType === 'Flat_Amount' ? `₹${plan.discountFlat?.toLocaleString()} Flat Off` : `${plan.discountPercent}% Flat Off`}</span>
                      </div>
                    </div>
                  </>
                );
              })()}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Start Date</label>
                <input type="date" className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 font-medium" value={enrollForm.enrolledOn || new Date().toISOString().split('T')[0]} onChange={e => setEnrollForm(f => ({ ...f, enrolledOn: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Admin Notes (Optional)</label>
                <textarea className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 font-medium resize-none" rows={2} placeholder="Any special remarks..." value={enrollForm.notes || ''} onChange={e => setEnrollForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button onClick={() => setIsEnrollModalOpen(false)} className="px-6 py-3 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleEnrollCustomer} disabled={!enrollForm.customerId || !enrollForm.planId} className="px-6 py-3 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-primary/30 transition-all">
                Confirm Enrollment
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
