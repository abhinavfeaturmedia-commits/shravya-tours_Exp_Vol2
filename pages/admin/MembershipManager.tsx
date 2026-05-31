import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { MembershipPlan, CustomerMembership } from '../../types';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

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

  // Computed data
  const filteredMembers = useMemo(() => {
    return customerMemberships.filter(m => {
      const matchSearch = m.customerName.toLowerCase().includes(memberSearch.toLowerCase()) || 
                          m.customerEmail.toLowerCase().includes(memberSearch.toLowerCase());
      const matchTier = tierFilter === 'All' || m.tier === tierFilter;
      const matchStatus = statusFilter === 'All' || m.status === statusFilter;
      return matchSearch && matchTier && matchStatus;
    });
  }, [customerMemberships, memberSearch, tierFilter, statusFilter]);

  const activeMemberCount = customerMemberships.filter(m => m.status === 'Active').length;
  const expiringSoonCount = customerMemberships.filter(m => {
    if (m.status !== 'Active') return false;
    const daysLeft = Math.ceil((new Date(m.expiresOn).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    return daysLeft <= 30 && daysLeft >= 0;
  }).length;

  // Handlers
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
          isActive: true
        } as MembershipPlan);
      }
      setIsPlanModalOpen(false);
    } catch (e) {
      console.error(e);
    }
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

    if (cycle === 'Monthly') {
      expDate.setMonth(expDate.getMonth() + 1);
      pricePaid = plan.pricePerMonth;
    } else if (cycle === 'Quarterly') {
      expDate.setMonth(expDate.getMonth() + 3);
      pricePaid = plan.pricePerQuarter;
    } else if (cycle === '6 Months') {
      expDate.setMonth(expDate.getMonth() + 6);
      pricePaid = plan.pricePerHalfYear;
    } else {
      expDate.setFullYear(expDate.getFullYear() + 1);
    }

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
        pricePaid: pricePaid,
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
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Membership Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage VIP tiers, perks, and enrolled customers.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => { setEditingPlan({}); setIsPlanModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            New Plan
          </button>
          <button 
            onClick={() => { setEnrollForm({}); setIsEnrollModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            Enroll Customer
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'members', label: 'Members', icon: 'groups' },
          { id: 'plans', label: 'Plans & Tiers', icon: 'workspace_premium' },
          { id: 'analytics', label: 'Analytics', icon: 'insights' }
        ].map(tab => (
          <button 
            key={tab.id}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold text-sm transition-all ${
              activeTab === tab.id 
                ? 'border-primary text-primary bg-primary/5 dark:bg-primary/10 rounded-t-xl' 
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-t-xl'
            }`}
            onClick={() => setActiveTab(tab.id as any)}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="space-y-6 animate-in slide-in-from-right-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-4 group hover:shadow-md transition-shadow">
               <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl">verified_user</span>
               </div>
               <div>
                 <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Active Members</p>
                 <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{activeMemberCount}</p>
               </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-amber-100 dark:border-amber-900/30 flex items-center gap-4 group hover:shadow-md transition-shadow">
               <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl">update</span>
               </div>
               <div>
                 <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Expiring (&lt;30d)</p>
                 <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{expiringSoonCount}</p>
               </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap gap-4">
            <div className="flex-1 min-w-[250px] relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input 
                type="text" 
                placeholder="Search members by name or email..." 
                className="w-full h-11 pl-12 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-4">
              <select 
                className="h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold min-w-[150px]"
                value={tierFilter} 
                onChange={e => setTierFilter(e.target.value)}
              >
                <option value="All">All Tiers</option>
                <option value="Bronze">Bronze</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
              </select>
              <select 
                className="h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold min-w-[150px]"
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

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">
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
                     return (
                    <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors group">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                            {m.customerName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{m.customerName}</div>
                            <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{m.customerEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold" 
                                  style={{ backgroundColor: `${planDef?.color}20`, color: planDef?.color || '#CD7F32' }}>
                              <span className="material-symbols-outlined text-[12px]">workspace_premium</span>
                              {m.tier}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {m.billingCycle || 'Yearly'}
                            </span>
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold">{m.planName}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Paid: ₹{m.pricePaid?.toLocaleString() || planDef?.pricePerYear?.toLocaleString()}</div>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">{format(new Date(m.enrolledOn), 'MMM dd, yyyy')}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">{format(new Date(m.expiresOn), 'MMM dd, yyyy')}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                          m.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                          m.status === 'Suspended' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 
                          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          {m.status}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right">
                         <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                             onClick={() => updateMembership(m.id, { status: m.status === 'Active' ? 'Suspended' : 'Active' })} 
                             className="p-2 text-slate-400 hover:text-amber-600 bg-slate-50 hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-amber-900/30 rounded-xl transition-colors tooltip-trigger"
                             title={m.status === 'Active' ? 'Suspend' : 'Activate'}
                           >
                              <span className="material-symbols-outlined text-[18px]">
                                {m.status === 'Active' ? 'pause_circle' : 'play_circle'}
                              </span>
                           </button>
                           <button 
                             onClick={() => {
                               if(window.confirm('Are you sure you want to delete this membership?')) {
                                 deleteMembership(m.id);
                               }
                             }} 
                             className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-900/30 rounded-xl transition-colors tooltip-trigger"
                             title="Delete"
                           >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                           </button>
                         </div>
                      </td>
                    </tr>
                  )})}
                  {filteredMembers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <span className="material-symbols-outlined text-4xl mb-3 opacity-50">search_off</span>
                          <p className="font-medium text-slate-500">No members found matching the criteria.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-right-4">
          {membershipPlans.map(plan => (
            <div key={plan.id} className={`bg-white dark:bg-slate-900 rounded-3xl border-2 shadow-lg flex flex-col overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl ${!plan.isActive ? 'opacity-60 grayscale' : ''}`} style={{ borderColor: plan.color }}>
               <div className="p-8 border-b relative overflow-hidden" style={{ backgroundColor: `${plan.color}08`, borderColor: `${plan.color}20` }}>
                 <div className="absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-1/2 translate-x-1/2 opacity-20" style={{ backgroundColor: plan.color }}></div>
                 
                 <div className="relative z-10">
                   <div className="flex justify-between items-start mb-4">
                     <h3 className="text-2xl font-black text-slate-900 dark:text-white" style={{ color: plan.color }}>{plan.name}</h3>
                     <span className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm" style={{ backgroundColor: plan.color, color: '#fff' }}>
                       {plan.tier}
                     </span>
                   </div>
                   <div className="flex items-baseline gap-1">
                     <span className="text-3xl font-black text-slate-900 dark:text-white">₹{plan.pricePerYear.toLocaleString()}</span>
                     <span className="text-sm font-bold text-slate-500 dark:text-slate-400">/year</span>
                   </div>
                 </div>
               </div>
               
               <div className="p-8 flex-1 flex flex-col gap-6">
                 {/* Billing Options Grid */}
                 <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
                   <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Billing Options</p>
                   <div className="grid grid-cols-2 gap-3">
                     <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/50 shadow-sm border border-slate-100 dark:border-white/5 flex flex-col">
                       <span className="text-[10px] font-bold text-slate-400 block">Monthly</span>
                       <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">₹{plan.pricePerMonth?.toLocaleString() || '0'}</span>
                     </div>
                     <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/50 shadow-sm border border-slate-100 dark:border-white/5 flex flex-col">
                       <span className="text-[10px] font-bold text-slate-400 block">Quarterly</span>
                       <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">₹{plan.pricePerQuarter?.toLocaleString() || '0'}</span>
                     </div>
                     <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/50 shadow-sm border border-slate-100 dark:border-white/5 flex flex-col">
                       <span className="text-[10px] font-bold text-slate-400 block">6 Months</span>
                       <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">₹{plan.pricePerHalfYear?.toLocaleString() || '0'}</span>
                     </div>
                     <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/50 shadow-sm border border-slate-100 dark:border-white/5 flex flex-col">
                       <span className="text-[10px] font-bold text-slate-400 block">Yearly</span>
                       <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">₹{plan.pricePerYear?.toLocaleString() || '0'}</span>
                     </div>
                   </div>
                 </div>
                 <div>
                    <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Core Benefits</p>
                    <ul className="space-y-3">
                      <li className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Global Flat Discount</span> 
                        <span className="text-lg font-black" style={{ color: plan.color }}>
                          {plan.discountType === 'Flat_Amount' ? `₹${plan.discountFlat?.toLocaleString()}` : `${plan.discountPercent}%`}
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Category Boosts</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
                        <span className="material-symbols-outlined text-slate-400 block mb-1 text-[20px]">hotel</span>
                        <span className="text-[10px] font-bold text-slate-500 block mb-1">Hotels</span>
                        <span className="text-sm font-black" style={{ color: plan.color }}>+{plan.hotelDiscount}%</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
                        <span className="material-symbols-outlined text-slate-400 block mb-1 text-[20px]">flight</span>
                        <span className="text-[10px] font-bold text-slate-500 block mb-1">Flights</span>
                        <span className="text-sm font-black" style={{ color: plan.color }}>+{plan.flightDiscount}%</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
                        <span className="material-symbols-outlined text-slate-400 block mb-1 text-[20px]">tour</span>
                        <span className="text-[10px] font-bold text-slate-500 block mb-1">Tours</span>
                        <span className="text-sm font-black" style={{ color: plan.color }}>+{plan.tourDiscount}%</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
                        <span className="material-symbols-outlined text-slate-400 block mb-1 text-[20px]">local_taxi</span>
                        <span className="text-[10px] font-bold text-slate-500 block mb-1">Cabs</span>
                        <span className="text-sm font-black" style={{ color: plan.color }}>+{plan.cabDiscount}%</span>
                      </div>
                    </div>
                  </div>
                 
                 <div>
                   <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Included Perks</p>
                   <ul className="space-y-3">
                     {plan.perks?.map((perk, i) => (
                       <li key={i} className="flex gap-3 items-start">
                         <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5" style={{ backgroundColor: `${plan.color}20`, color: plan.color }}>
                           <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                         </div>
                         <span className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">{perk}</span>
                       </li>
                     ))}
                     {(!plan.perks || plan.perks.length === 0) && (
                       <li className="text-sm text-slate-400 italic">No special perks defined.</li>
                     )}
                   </ul>
                 </div>
                 
                 <div className="mt-auto pt-6 flex gap-3 border-t border-slate-100 dark:border-slate-800">
                   <button 
                     onClick={() => { setEditingPlan(plan); setIsPlanModalOpen(true); }}
                     className="flex-1 px-4 py-3 rounded-xl font-bold text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                   >
                     Edit Details
                   </button>
                   <button 
                     onClick={() => updateMembershipPlan(plan.id, { isActive: !plan.isActive })}
                     className={`px-4 py-3 rounded-xl font-bold text-sm transition-colors border ${
                       plan.isActive 
                         ? 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50' 
                         : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400'
                     }`}
                     title={plan.isActive ? 'Deactivate Plan' : 'Activate Plan'}
                   >
                     {plan.isActive ? 'Deactivate' : 'Activate'}
                   </button>
                 </div>
               </div>
            </div>
          ))}
          {membershipPlans.length === 0 && (
            <div className="col-span-1 lg:col-span-3 p-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-500">
              <span className="material-symbols-outlined text-6xl text-slate-300 mb-4 block">card_membership</span>
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">No Plans Available</h3>
              <p className="mb-6 max-w-md mx-auto">You haven't created any membership plans yet. Create plans to offer your customers exclusive discounts and perks.</p>
              <button 
                onClick={() => { setEditingPlan({}); setIsPlanModalOpen(true); }}
                className="btn-primary inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined">add</span>
                Create First Plan
              </button>
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-right-4">
          <div className="col-span-1 lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">donut_large</span>
              Member Distribution
            </h3>
            <div className="space-y-6">
              {['Bronze', 'Silver', 'Gold'].map(tier => {
                const count = customerMemberships.filter(m => m.tier === tier && m.status === 'Active').length;
                const total = activeMemberCount || 1; // avoid /0
                const pct = (count / total) * 100;
                const color = tier === 'Bronze' ? '#CD7F32' : tier === 'Silver' ? '#9E9E9E' : '#FFD700';
                return (
                  <div key={tier} className="group">
                    <div className="flex justify-between items-end mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-md" style={{ backgroundColor: color }}>
                          <span className="material-symbols-outlined text-[16px]">workspace_premium</span>
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{tier} Tier</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-black text-slate-900 dark:text-white">{count}</span>
                        <span className="text-sm font-medium text-slate-500 ml-2">({pct.toFixed(0)}%)</span>
                      </div>
                    </div>
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%`, backgroundColor: color }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="col-span-1 bg-gradient-to-br from-slate-900 to-indigo-900 p-8 rounded-3xl shadow-xl flex flex-col justify-center text-center relative overflow-hidden">
             {/* Decorative abstract elements */}
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
             <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
             
             <div className="relative z-10">
               <div className="w-20 h-20 bg-white/10 backdrop-blur-md text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl border border-white/20">
                 <span className="material-symbols-outlined text-4xl">account_balance</span>
               </div>
               <h3 className="text-indigo-200 font-bold tracking-wider uppercase text-sm mb-2">Annual Recurring Revenue</h3>
               <p className="text-5xl font-black text-white mb-4">
                 ₹{customerMemberships.filter(m => m.status === 'Active').reduce((sum, m) => {
                   const cycle = m.billingCycle || 'Yearly';
                   const price = m.pricePaid || 0;
                   let multiplier = 1;
                   if (cycle === 'Monthly') multiplier = 12;
                   else if (cycle === 'Quarterly') multiplier = 4;
                   else if (cycle === '6 Months') multiplier = 2;
                   return sum + (price * multiplier);
                 }, 0).toLocaleString()}
               </p>
               <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold border border-emerald-500/30">
                 <span className="material-symbols-outlined text-[14px]">trending_up</span>
                 Based on Active Plans
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Modals */}
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
                  <input 
                    type="text" 
                    placeholder="e.g. Explorer Pass"
                    className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary/50 transition-all font-semibold"
                    value={editingPlan?.name || ''} 
                    onChange={e => setEditingPlan(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Tier Level <span className="text-rose-500">*</span></label>
                  <div className="grid grid-cols-3 gap-4">
                    {(['Bronze', 'Silver', 'Gold'] as const).map(t => {
                      const isSelected = (editingPlan?.tier || 'Bronze') === t;
                      const color = t === 'Bronze' ? '#CD7F32' : t === 'Silver' ? '#9E9E9E' : '#FFD700';
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setEditingPlan(p => ({ ...p, tier: t, color: p?.color || color }));
                          }}
                          className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
                            isSelected 
                              ? 'bg-slate-50 dark:bg-slate-800/80 shadow-md scale-[1.02]' 
                              : 'bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                          }`}
                          style={{ 
                            borderColor: isSelected ? color : 'transparent',
                            boxShadow: isSelected ? `0 4px 20px ${color}15` : 'none'
                          }}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider text-white" style={{ backgroundColor: color }}>
                              {t}
                            </span>
                            {isSelected && (
                              <span className="material-symbols-outlined text-[18px] font-bold animate-in zoom-in-50" style={{ color }}>
                                check_circle
                              </span>
                            )}
                          </div>
                          <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2">
                            {t === 'Bronze' ? 'Essential benefits' : t === 'Silver' ? 'Enhanced perks' : 'Ultimate experience'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/60 space-y-4">
                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">payments</span>
                  Plan Pricing
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Price per Month (₹)</label>
                    <input 
                      type="number" 
                      className="w-full h-11 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 font-bold" 
                      value={editingPlan?.pricePerMonth || 0} 
                      onChange={e => setEditingPlan(p => ({ ...p, pricePerMonth: Number(e.target.value) }))} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Price per Quarter (₹)</label>
                    <input 
                      type="number" 
                      className="w-full h-11 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 font-bold" 
                      value={editingPlan?.pricePerQuarter || 0} 
                      onChange={e => setEditingPlan(p => ({ ...p, pricePerQuarter: Number(e.target.value) }))} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Price per 6 Months (₹)</label>
                    <input 
                      type="number" 
                      className="w-full h-11 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 font-bold" 
                      value={editingPlan?.pricePerHalfYear || 0} 
                      onChange={e => setEditingPlan(p => ({ ...p, pricePerHalfYear: Number(e.target.value) }))} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Price per Year (₹) <span className="text-rose-500">*</span></label>
                    <input 
                      type="number" 
                      className="w-full h-11 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 font-bold" 
                      value={editingPlan?.pricePerYear || 0} 
                      onChange={e => setEditingPlan(p => ({ ...p, pricePerYear: Number(e.target.value) }))} 
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Brand Color Hex</label>
                <div className="flex gap-3">
                  <input type="color" className="h-12 w-16 p-1 rounded-xl bg-slate-50 dark:bg-slate-800 border-none cursor-pointer" value={editingPlan?.color || '#CD7F32'} onChange={e => setEditingPlan(p => ({ ...p, color: e.target.value }))} />
                  <input type="text" className="flex-1 h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 transition-all font-mono font-bold uppercase" value={editingPlan?.color || '#CD7F32'} onChange={e => setEditingPlan(p => ({ ...p, color: e.target.value }))} />
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-inner space-y-6">
                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500">local_offer</span>
                  Discount & Benefit Configuration
                </h4>
                
                {/* Discount Type Toggle */}
                <div className="flex bg-slate-250 dark:bg-slate-850 p-1 rounded-xl max-w-md">
                  <button
                    type="button"
                    onClick={() => setEditingPlan(p => ({ ...p, discountType: 'Percentage' }))}
                    className={`flex-1 py-2 text-center text-xs font-black rounded-lg transition-all ${
                      (editingPlan?.discountType || 'Percentage') === 'Percentage'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    Percentage (%) Discount
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingPlan(p => ({ ...p, discountType: 'Flat_Amount' }))}
                    className={`flex-1 py-2 text-center text-xs font-black rounded-lg transition-all ${
                      (editingPlan?.discountType || 'Percentage') === 'Flat_Amount'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    Flat Amount (Fixed ₹)
                  </button>
                </div>

                {/* Global Discount Input */}
                <div className="max-w-xs">
                  {(editingPlan?.discountType || 'Percentage') === 'Percentage' ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Global Flat Discount (%)</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          className="w-full h-11 pl-3 pr-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 font-bold" 
                          value={editingPlan?.discountPercent || 0} 
                          onChange={e => setEditingPlan(p => ({ ...p, discountPercent: Number(e.target.value) }))} 
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">%</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Global Flat Discount (Fixed ₹)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                        <input 
                          type="number" 
                          className="w-full h-11 pl-8 pr-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 font-bold" 
                          value={editingPlan?.discountFlat || 0} 
                          onChange={e => setEditingPlan(p => ({ ...p, discountFlat: Number(e.target.value) }))} 
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Category Boost Grid */}
                <div className="border-t border-slate-200 dark:border-slate-700/50 pt-4">
                  <h5 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Category Boosts</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Hotels */}
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 shadow-sm flex flex-col items-center text-center">
                      <span className="material-symbols-outlined text-primary text-xl mb-1">hotel</span>
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">Hotel Extra</span>
                      <div className="relative w-full">
                        <input 
                          type="number" 
                          className="w-full h-9 pl-2 pr-6 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 text-center font-bold text-xs" 
                          value={editingPlan?.hotelDiscount || 0} 
                          onChange={e => setEditingPlan(p => ({ ...p, hotelDiscount: Number(e.target.value) }))} 
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">%</span>
                      </div>
                    </div>
                    
                    {/* Flights */}
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 shadow-sm flex flex-col items-center text-center">
                      <span className="material-symbols-outlined text-primary text-xl mb-1">flight</span>
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">Flight Extra</span>
                      <div className="relative w-full">
                        <input 
                          type="number" 
                          className="w-full h-9 pl-2 pr-6 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 text-center font-bold text-xs" 
                          value={editingPlan?.flightDiscount || 0} 
                          onChange={e => setEditingPlan(p => ({ ...p, flightDiscount: Number(e.target.value) }))} 
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">%</span>
                      </div>
                    </div>

                    {/* Tours */}
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 shadow-sm flex flex-col items-center text-center">
                      <span className="material-symbols-outlined text-primary text-xl mb-1">tour</span>
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">Tour Extra</span>
                      <div className="relative w-full">
                        <input 
                          type="number" 
                          className="w-full h-9 pl-2 pr-6 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 text-center font-bold text-xs" 
                          value={editingPlan?.tourDiscount || 0} 
                          onChange={e => setEditingPlan(p => ({ ...p, tourDiscount: Number(e.target.value) }))} 
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">%</span>
                      </div>
                    </div>

                    {/* Cabs/Taxis */}
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 shadow-sm flex flex-col items-center text-center">
                      <span className="material-symbols-outlined text-primary text-xl mb-1">local_taxi</span>
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">Cab/Taxi Extra</span>
                      <div className="relative w-full">
                        <input 
                          type="number" 
                          className="w-full h-9 pl-2 pr-6 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 text-center font-bold text-xs" 
                          value={editingPlan?.cabDiscount || 0} 
                          onChange={e => setEditingPlan(p => ({ ...p, cabDiscount: Number(e.target.value) }))} 
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-500">stars</span>
                    Included Perks
                  </h4>
                  <button 
                    onClick={() => setEditingPlan(p => ({ ...p, perks: [...(p?.perks || []), ''] }))}
                    className="text-sm text-primary font-bold flex items-center gap-1 hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_circle</span> Add Perk
                  </button>
                </div>
                <div className="space-y-3">
                  {editingPlan?.perks?.map((perk, i) => (
                    <div key={i} className="flex gap-3 items-center bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      </div>
                      <input 
                        type="text" 
                        placeholder="e.g. Free airport lounge access"
                        className="w-full bg-transparent border-none focus:ring-0 font-medium text-sm" 
                        value={perk}
                        onChange={e => {
                          const newPerks = [...(editingPlan.perks || [])];
                          newPerks[i] = e.target.value;
                          setEditingPlan(p => ({ ...p, perks: newPerks }));
                        }}
                      />
                      <button 
                        onClick={() => {
                          const newPerks = [...(editingPlan.perks || [])];
                          newPerks.splice(i, 1);
                          setEditingPlan(p => ({ ...p, perks: newPerks }));
                        }}
                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 flex items-center justify-center shrink-0 transition-colors"
                      >
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
                <span className="material-symbols-outlined text-[20px]">save</span>
                Save Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
             <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-primary to-indigo-600 text-white">
              <h2 className="text-xl font-black flex items-center gap-2">
                <span className="material-symbols-outlined">person_add</span>
                Enroll Customer
              </h2>
              <button onClick={() => setIsEnrollModalOpen(false)} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Customer <span className="text-rose-500">*</span></label>
                <select 
                  className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                  value={enrollForm.customerId || ''}
                  onChange={e => setEnrollForm(f => ({ ...f, customerId: e.target.value }))}
                >
                  <option value="">Select a Customer...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Membership Plan <span className="text-rose-500">*</span></label>
                <select 
                  className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                  value={enrollForm.planId || ''}
                  onChange={e => {
                    const plan = membershipPlans.find(p => p.id === e.target.value);
                    setEnrollForm(f => ({ 
                      ...f, 
                      planId: e.target.value,
                      billingCycle: 'Yearly',
                      pricePaid: plan?.pricePerYear || 0
                    }));
                  }}
                >
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

                const formattedExp = format(expDate, 'MMM dd, yyyy');

                return (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Billing Cycle <span className="text-rose-500">*</span></label>
                      <select 
                        className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                        value={cycle}
                        onChange={e => setEnrollForm(f => ({ ...f, billingCycle: e.target.value as any, pricePaid: e.target.value === 'Monthly' ? plan.pricePerMonth : e.target.value === 'Quarterly' ? plan.pricePerQuarter : e.target.value === '6 Months' ? plan.pricePerHalfYear : plan.pricePerYear }))}
                      >
                        <option value="Monthly">Monthly — ₹{plan.pricePerMonth}/mo</option>
                        <option value="Quarterly">Quarterly — ₹{plan.pricePerQuarter}/quarter</option>
                        <option value="6 Months">6 Months — ₹{plan.pricePerHalfYear}/6mo</option>
                        <option value="Yearly">Yearly — ₹{plan.pricePerYear}/yr</option>
                      </select>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs font-semibold space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Price to Pay:</span>
                        <span className="text-slate-900 dark:text-white font-black text-sm">₹{price.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Active Until:</span>
                        <span className="text-primary font-bold">{formattedExp}</span>
                      </div>
                      <div className="border-t border-slate-200 dark:border-slate-700/50 my-2 pt-2 space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Membership Discount:</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            {plan.discountType === 'Flat_Amount' ? `₹${plan.discountFlat?.toLocaleString()} Flat Off` : `${plan.discountPercent}% Flat Off`}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400">
                          <span>Category Boosts:</span>
                          <span className="text-right">
                            +{plan.hotelDiscount}% H · +{plan.flightDiscount}% F · +{plan.tourDiscount}% T · +{plan.cabDiscount}% C
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Start Date</label>
                <input 
                  type="date" 
                  className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                  value={enrollForm.enrolledOn || new Date().toISOString().split('T')[0]}
                  onChange={e => setEnrollForm(f => ({ ...f, enrolledOn: e.target.value }))}
                />
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">info</span>
                  Membership duration is based on the selected billing cycle.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Admin Notes (Optional)</label>
                <textarea 
                  className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 transition-all font-medium resize-none"
                  rows={3}
                  placeholder="Any special remarks..."
                  value={enrollForm.notes || ''}
                  onChange={e => setEnrollForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button onClick={() => setIsEnrollModalOpen(false)} className="px-6 py-3 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">Cancel</button>
              <button 
                onClick={handleEnrollCustomer} 
                disabled={!enrollForm.customerId || !enrollForm.planId}
                className="px-6 py-3 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-primary/30 transition-all"
              >
                Confirm Enrollment
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
