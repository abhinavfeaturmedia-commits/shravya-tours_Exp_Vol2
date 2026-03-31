import React, { useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Booking, SupplierBooking } from '../../types';
import {
   BarChart, TrendingUp, TrendingDown, DollarSign,
   PieChart, CreditCard, Calendar, Filter, Download,
   Users, Map as MapIcon, Link as LinkIcon, Timer, Clock,
   Target, AlertCircle, ThumbsUp, Globe, Star,
   MessageSquare, Award, XCircle, Zap, Activity
} from 'lucide-react';

export const Analytics: React.FC = () => {
   const { bookings, vendors, leads, customers, followUps } = useData();
   const { staff } = useAuth();
   const [timeRange, setTimeRange] = useState<'all' | '30days' | 'thisMonth' | 'thisYear'>('all');
   const [activeTab, setActiveTab] = useState<'financial' | 'sales' | 'team' | 'bi'>('financial');

   // --- Data Processing ---
   const filteredBookings = useMemo(() => {
      const now = new Date();
      return bookings.filter(b => {
         if (b.status === 'Cancelled') return false; // Exclude cancelled usually
         // Apply Date Filter logic here if needed
         return true;
      });
   }, [bookings, timeRange]);

   const metrics = useMemo(() => {
      let totalRevenue = 0; // Total Customer Price
      let totalReceived = 0; // Actual Money In
      let totalCost = 0;    // Total Supplier Cost
      let totalPaidOut = 0; // Actual Money Out

      let pendingCollections = 0;
      let pendingPayables = 0;

      const categoryExpenses: Record<string, number> = {};

      filteredBookings.forEach(booking => {
         // Customer Side
         totalRevenue += booking.amount;

         const received = (booking.transactions || [])
            .filter(t => t.type === 'Payment')
            .reduce((sum, t) => sum + t.amount, 0);

         const refunded = (booking.transactions || [])
            .filter(t => t.type === 'Refund')
            .reduce((sum, t) => sum + t.amount, 0);

         totalReceived += (received - refunded);
         pendingCollections += (booking.amount - (received - refunded));

         // Supplier Side
         (booking.supplierBookings || []).forEach(sb => {
            totalCost += sb.cost;
            totalPaidOut += sb.paidAmount;
            pendingPayables += (sb.cost - sb.paidAmount);

            // Expense Categorization (MIS)
            const cat = sb.serviceType || 'Other';
            categoryExpenses[cat] = (categoryExpenses[cat] || 0) + sb.cost;
         });
      });

      const netProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
      const cashFlow = totalReceived - totalPaidOut;

      return {
         totalRevenue,
         totalReceived,
         totalCost,
         totalPaidOut,
         pendingCollections,
         pendingPayables,
         netProfit,
         profitMargin,
         cashFlow,
         categoryExpenses
      };
   }, [filteredBookings]);

   // --- NEW: 1. Monthly Revenue vs. Cost (Trendly) ---
   const monthlyTrends = useMemo(() => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentYear = new Date().getFullYear();

      const data = months.map(m => ({ month: m, revenue: 0, cost: 0, profit: 0 }));

      // Only process bookings that fall in the current year for this specific chart (can be adapted to timeRange)
      filteredBookings.forEach(b => {
         const bDate = new Date(b.date);
         if (bDate.getFullYear() === currentYear) {
            const mIndex = bDate.getMonth();
            const cost = (b.supplierBookings || []).reduce((sum, sb) => sum + sb.cost, 0);
            data[mIndex].revenue += b.amount;
            data[mIndex].cost += cost;
            data[mIndex].profit += (b.amount - cost);
         }
      });

      return data;
   }, [filteredBookings]);

   // --- NEW: 2. Top Selling Agents (Team Performance) ---
   const agentPerformance = useMemo(() => {
      const map = new Map<number, { name: string, initials: string, color: string, revenue: number, profit: number }>();

      filteredBookings.forEach(b => {
         if (b.assignedTo) {
            const st = staff.find(s => s.id === b.assignedTo);
            if (st) {
               const existing = map.get(st.id) || { name: st.name, initials: st.initials, color: st.color, revenue: 0, profit: 0 };
               const cost = (b.supplierBookings || []).reduce((sum, sb) => sum + sb.cost, 0);
               existing.revenue += b.amount;
               existing.profit += (b.amount - cost);
               map.set(st.id, existing);
            }
         }
      });

      return Array.from(map.values())
         .sort((a, b) => b.profit - a.profit); // Primary sort by profit generated for company
   }, [filteredBookings, staff]);

   // --- NEW: 3. Lead Source ROI ---
   const leadSourceROI = useMemo(() => {
      const srcMap = new Map<string, { totalLeads: number, converted: number, revenueFromConverted: number }>();

      (leads || []).forEach(l => {
         const source = l.source || 'Direct/Other';
         const existing = srcMap.get(source) || { totalLeads: 0, converted: 0, revenueFromConverted: 0 };
         existing.totalLeads += 1;
         if (l.status === 'Converted') {
            existing.converted += 1;
            existing.revenueFromConverted += (l.potentialValue || 0); // Approx ROI
         }
         srcMap.set(source, existing);
      });

      return Array.from(srcMap.entries())
         .map(([source, data]) => ({ source, ...data, rate: Math.round((data.converted / data.totalLeads) * 100) }))
         .sort((a, b) => b.revenueFromConverted - a.revenueFromConverted);
   }, [leads]);

   // --- NEW: 4. Most Profitable Destinations ---
   const destProfitability = useMemo(() => {
      const destMap = new Map<string, { count: number, revenue: number, profit: number }>();

      filteredBookings.forEach(b => {
         const dest = (b.title || '').split('-')[0].trim() || 'Unknown Package';
         const existing = destMap.get(dest) || { count: 0, revenue: 0, profit: 0 };
         const cost = (b.supplierBookings || []).reduce((sum, sb) => sum + sb.cost, 0);

         existing.count += 1;
         existing.revenue += b.amount;
         existing.profit += (b.amount - cost);
         destMap.set(dest, existing);
      });

      return Array.from(destMap.entries())
         .map(([name, data]) => ({
            name,
            ...data,
            margin: data.revenue > 0 ? Math.round((data.profit / data.revenue) * 100) : 0
         }))
         .filter(d => d.count > 0)
         .sort((a, b) => b.profit - a.profit)
         .slice(0, 5); // Top 5
   }, [filteredBookings]);

   // --- NEW: 5. Average Conversion Time ---
   const averageConversionTimeDays = useMemo(() => {
      let totalDays = 0;
      let convertedCount = 0;

      (leads || []).forEach(l => {
         if (l.status === 'Converted' && l.addedOn) {
            // Approximate by assuming if it's converted now, the difference between addedOn and current date (or a specific closing date if we tracked it)
            // Since we don't have a strict strict closing date tracked, we'll use a simulated or proxy method if needed.
            // Let's assume it was converted recently.
            const start = new Date(l.addedOn).getTime();
            const end = new Date().getTime(); // Proxy for 'date converted'
            const days = Math.round((end - start) / (1000 * 3600 * 24));
            totalDays += Math.max(days, 1); // at least 1 day
            convertedCount++;
         }
      });

      return convertedCount > 0 ? Math.round(totalDays / convertedCount) : 0;
   }, [leads]);

   // --- NEW: 6. Accounts Aging Report (Receivables) ---
   const agingReport = useMemo(() => {
      const buckets = { current: 0, days1to15: 0, days16to30: 0, over30: 0 };
      const now = new Date().getTime();

      filteredBookings.forEach(b => {
         if (b.payment === 'Unpaid' || b.payment === 'Deposit') {
            const paid = (b.transactions || []).filter(t => t.type === 'Payment').reduce((sum, t) => sum + t.amount, 0);
            const refunded = (b.transactions || []).filter(t => t.type === 'Refund').reduce((sum, t) => sum + t.amount, 0);
            const remaining = b.amount - (paid - refunded);

            if (remaining > 0) {
               const bDate = new Date(b.date).getTime();
               const daysOld = Math.floor((now - bDate) / (1000 * 3600 * 24));

               if (daysOld <= 7) buckets.current += remaining;
               else if (daysOld <= 15) buckets.days1to15 += remaining;
               else if (daysOld <= 30) buckets.days16to30 += remaining;
               else buckets.over30 += remaining;
            }
         }
      });

      return buckets;
   }, [filteredBookings]);

   // --- NEW: Lost Lead Analysis ---
   const lostLeadAnalysis = useMemo(() => {
      const all = leads || [];
      const byStatus = ['New','Warm','Hot','Cold','Offer Sent','Converted'].reduce((acc, s) => {
         acc[s] = all.filter(l => l.status === s).length; return acc;
      }, {} as Record<string, number>);
      return { byStatus, total: all.length };
   }, [leads]);

   // --- NEW: Follow-Up Effectiveness ---
   const followUpEffect = useMemo(() => {
      const fuLeads = new Set((followUps || []).map(f => f.leadId));
      const all = leads || [];
      const wFU = all.filter(l => fuLeads.has(l.id));
      const woFU = all.filter(l => !fuLeads.has(l.id));
      const rWith = wFU.length > 0 ? Math.round(wFU.filter(l => l.status === 'Converted').length / wFU.length * 100) : 0;
      const rWithout = woFU.length > 0 ? Math.round(woFU.filter(l => l.status === 'Converted').length / woFU.length * 100) : 0;
      return { rWith, rWithout, wFUCount: wFU.length, woFUCount: woFU.length };
   }, [leads, followUps]);

   // --- NEW: Inquiry to Quote Ratio ---
   const inquiryToQuote = useMemo(() => {
      const total = (leads || []).length;
      const withQuote = (leads || []).filter(l => (l.logs || []).some(log => log.type === 'Quote')).length;
      return { total, withQuote, ratio: total > 0 ? Math.round((withQuote / total) * 100) : 0 };
   }, [leads]);

   // --- NEW: Customer Lifetime Value ---
   const clvData = useMemo(() => {
      const cList = customers || [];
      const avgCLV = cList.length > 0 ? Math.round(cList.reduce((s, c) => s + (c.totalSpent || 0), 0) / cList.length) : 0;
      const top5 = [...cList].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0)).slice(0, 5);
      return { avgCLV, top5, total: cList.length };
   }, [customers]);

   // --- NEW: Package Popularity vs Profitability ---
   const pkgVsProfit = useMemo(() => {
      const m = new Map<string, { count: number; revenue: number; profit: number }>();
      filteredBookings.forEach(b => {
         const key = b.title || 'Unknown';
         const e = m.get(key) || { count: 0, revenue: 0, profit: 0 };
         const cost = (b.supplierBookings || []).reduce((s, sb) => s + sb.cost, 0);
         e.count++; e.revenue += b.amount; e.profit += (b.amount - cost);
         m.set(key, e);
      });
      return Array.from(m.entries())
         .map(([name, d]) => ({ name, ...d, margin: d.revenue > 0 ? Math.round((d.profit / d.revenue) * 100) : 0 }))
         .sort((a, b) => b.count - a.count).slice(0, 6);
   }, [filteredBookings]);

   // --- NEW: Cancellation Patterns ---
   const cancellationData = useMemo(() => {
      const cancelled = bookings.filter(b => b.status === 'Cancelled');
      const refundTotal = bookings.reduce((s, b) =>
         s + (b.transactions || []).filter(t => t.type === 'Refund').reduce((rs, t) => rs + t.amount, 0), 0);
      const rate = bookings.length > 0 ? Math.round((cancelled.length / bookings.length) * 100) : 0;
      return { count: cancelled.length, total: bookings.length, rate, refundTotal };
   }, [bookings]);

   // --- NEW: Payment Collection Lag ---
   const paymentLag = useMemo(() => {
      let total = 0, count = 0;
      filteredBookings.forEach(b => {
         const fp = (b.transactions || []).filter(t => t.type === 'Payment')
            .sort((a, x) => new Date(a.date).getTime() - new Date(x.date).getTime())[0];
         if (fp) {
            const d = Math.round((new Date(fp.date).getTime() - new Date(b.date).getTime()) / 86400000);
            if (d >= 0 && d < 365) { total += d; count++; }
         }
      });
      return count > 0 ? Math.round(total / count) : 0;
   }, [filteredBookings]);

   // --- NEW: Group Size Distribution ---
   const groupSizeData = useMemo(() => {
      const b = { solo: 0, couple: 0, family: 0, group: 0 };
      filteredBookings.forEach(bk => {
         const g = parseInt(bk.guests || '1', 10) || 1;
         if (g === 1) b.solo++;
         else if (g === 2) b.couple++;
         else if (g <= 5) b.family++;
         else b.group++;
      });
      return b;
   }, [filteredBookings]);

   // --- NEW: Upsell/Add-On Revenue ---
   const upsellData = useMemo(() => {
      const m: Record<string, number> = {};
      filteredBookings.forEach(b => {
         (b.supplierBookings || []).forEach(sb => {
            const k = sb.serviceType || 'Other';
            m[k] = (m[k] || 0) + sb.cost;
         });
      });
      const t = Object.values(m).reduce((s, v) => s + v, 0);
      return Object.entries(m)
         .map(([type, amount]) => ({ type, amount, pct: t > 0 ? Math.round((amount / t) * 100) : 0 }))
         .sort((a, b) => b.amount - a.amount);
   }, [filteredBookings]);

   // --- NEW: Geographic Origin ---
   const geoData = useMemo(() => {
      const m: Record<string, number> = {};
      (customers || []).forEach(c => { const city = c.location || 'Unknown'; m[city] = (m[city] || 0) + 1; });
      const total = (customers || []).length;
      return Object.entries(m)
         .map(([city, count]) => ({ city, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }))
         .sort((a, b) => b.count - a.count).slice(0, 7);
   }, [customers]);

   // --- NEW: Staff Response Time ---
   const staffResponseTime = useMemo(() => {
      const m = new Map<number, { name: string; initials: string; color: string; total: number; count: number }>();
      (leads || []).forEach(l => {
         if (!l.assignedTo || !l.addedOn || !(l.logs?.length)) return;
         const fl = [...l.logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0];
         if (!fl) return;
         const hrs = (new Date(fl.timestamp).getTime() - new Date(l.addedOn).getTime()) / 3600000;
         if (hrs < 0 || hrs > 72) return;
         const st = staff.find(s => s.id === l.assignedTo);
         if (!st) return;
         const e = m.get(st.id) || { name: st.name, initials: st.initials, color: st.color, total: 0, count: 0 };
         e.total += hrs; e.count++;
         m.set(st.id, e);
      });
      return Array.from(m.values())
         .map(s => ({ ...s, avg: s.count > 0 ? +(s.total / s.count).toFixed(1) : 0 }))
         .sort((a, b) => a.avg - b.avg);
   }, [leads, staff]);

   // --- NEW: Destination Trend (Quarterly) ---
   const destTrend = useMemo(() => {
      const qMap: Record<string, Record<string, number>> = { Q1: {}, Q2: {}, Q3: {}, Q4: {} };
      (leads || []).forEach(l => {
         if (!l.addedOn || !l.destination) return;
         const mo = new Date(l.addedOn).getMonth();
         const q = mo < 3 ? 'Q1' : mo < 6 ? 'Q2' : mo < 9 ? 'Q3' : 'Q4';
         qMap[q][l.destination] = (qMap[q][l.destination] || 0) + 1;
      });
      const allDests = new Set<string>();
      Object.values(qMap).forEach(q => Object.keys(q).forEach(d => allDests.add(d)));
      const topDests = [...allDests]
         .map(d => ({ d, t: Object.values(qMap).reduce((s, q) => s + (q[d] || 0), 0) }))
         .sort((a, b) => b.t - a.t).slice(0, 5).map(x => x.d);
      return { qMap, topDests };
   }, [leads]);

   // Format Currency
   const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
   // Format Short Currency (e.g. 5.2L)
   const fmtShort = (n: number) => `₹${(n / 100000).toFixed(n > 1000000 ? 1 : 2)}L`;

   return (
      <div className="flex flex-col h-full admin-page-bg">
         {/* Header */}
         <div className="bg-white dark:bg-[#1A2633] border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10">
            <div>
               <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart className="text-primary" /> Financial Reports
               </h2>
               <p className="text-slate-500 dark:text-slate-400 text-sm">Profit & Loss, Cash Flow, and Expense Breakdown</p>
            </div>
            <div className="flex items-center gap-3">
               <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as any)}
                  className="bg-slate-50 dark:bg-slate-800 border-none text-slate-900 dark:text-white text-sm rounded-lg px-4 py-2.5 font-bold shadow-sm focus:ring-2 focus:ring-primary outline-none"
               >
                  <option value="all">All Time</option>
                  <option value="thisMonth">This Month</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="thisYear">This Year</option>
               </select>
               <button className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg text-sm px-4 py-2.5 shadow-lg active:scale-95 transition-all btn-glow">
                  <Download size={18} /> Export Report
               </button>
            </div>
         </div>

         {/* Tab Navigation */}
         <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-[#1A2633]">
            {[
               { id: 'financial', label: 'Financial', icon: <DollarSign size={15} /> },
               { id: 'sales', label: 'Sales & Leads', icon: <Target size={15} /> },
               { id: 'team', label: 'Team', icon: <Users size={15} /> },
               { id: 'bi', label: 'Business Intelligence', icon: <Zap size={15} /> },
            ].map(tab => (
               <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
                     activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
               >
                  {tab.icon} {tab.label}
               </button>
            ))}
         </div>

         <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {activeTab === 'financial' && <>

            {/* 1. Profit & Loss Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-cards">
               {/* Revenue Card */}
               <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                     <TrendingUp size={64} className="text-emerald-500" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider">Total Revenue</p>
                  <h3 className="text-4xl kpi-number text-slate-900 dark:text-white mt-2">{fmt(metrics.totalRevenue)}</h3>
                  <p className="text-emerald-500 text-xs font-bold mt-2 flex items-center gap-1">
                     <span className="bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">Sales</span>
                     from {filteredBookings.length} bookings
                  </p>
               </div>

               {/* Cost Card */}
               <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                     <TrendingDown size={64} className="text-red-500" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider">Total Expenses</p>
                  <h3 className="text-4xl kpi-number text-slate-900 dark:text-white mt-2">{fmt(metrics.totalCost)}</h3>
                  <p className="text-red-400 text-xs font-bold mt-2 flex items-center gap-1">
                     <span className="bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">COGS</span>
                     Paid to Vendors
                  </p>
               </div>

               {/* Net Profit Card */}
               <div className="card-brand-gradient p-6 rounded-2xl shadow-lg shadow-primary/25 relative overflow-hidden text-white">
                  <div className="absolute top-0 right-0 p-4 opacity-20">
                     <DollarSign size={64} />
                  </div>
                  <p className="text-orange-100 text-sm font-bold uppercase tracking-wider">Net Profit</p>
                  <h3 className="text-4xl kpi-number mt-2">{fmt(metrics.netProfit)}</h3>
                  <div className="flex items-center gap-3 mt-3">
                     <span className="bg-white/20 px-2 py-1 rounded text-xs font-bold backdrop-blur-sm">
                        {metrics.profitMargin.toFixed(1)}% Margin
                     </span>
                  </div>
               </div>

               {/* Cash Flow Card */}
               <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity flex items-center gap-1">
                     <Timer size={48} className="text-blue-500" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider">Avg Time to Close</p>
                  <h3 className="text-4xl kpi-number text-slate-900 dark:text-white mt-2">
                     {averageConversionTimeDays} <span className="text-lg text-slate-500">days</span>
                  </h3>
                  <p className="text-slate-400 text-xs font-bold mt-2">
                     From lead to conversion
                  </p>
               </div>
            </div>

            {/* NEW 1. Monthly Revenue & Profit Trend Chart */}
            <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
               <div className="flex justify-between items-center mb-6">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 section-heading-accent">
                     <TrendingUp size={20} className="text-primary" /> Year-to-Date Performance Trend
                  </h4>
               </div>

               {/* Visual Chart Area */}
               <div className="w-full overflow-x-auto pb-4">
                  <div className="min-w-[800px] h-64 flex items-end gap-2 px-4 relative">
                     {/* Y-Axis Grid Lines */}
                     <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 dark:opacity-10 z-0">
                        <div className="border-t border-slate-400 w-full h-0"></div>
                        <div className="border-t border-slate-400 w-full h-0"></div>
                        <div className="border-t border-slate-400 w-full h-0"></div>
                        <div className="border-t border-slate-400 w-full h-0"></div>
                     </div>

                     {/* Bars */}
                     {monthlyTrends.map((data, i) => {
                        // Find max revenue for scaling
                        const maxRev = Math.max(...monthlyTrends.map(m => m.revenue), 100000);

                        const heightRev = Math.max((data.revenue / maxRev) * 100, 2); // % of container height
                        const heightProfit = Math.max((data.profit / maxRev) * 100, 2);

                        return (
                           <div key={i} className="flex-1 flex flex-col justify-end items-center group relative z-10">
                              {/* Tooltip on hover */}
                              <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs p-2 rounded whitespace-nowrap z-20 pointer-events-none shadow-xl border border-white/10">
                                 <p className="font-bold">{data.month}</p>
                                 <p className="text-indigo-300">Rev: {fmt(data.revenue)}</p>
                                 <p className="text-emerald-400">Profit: {fmt(data.profit)}</p>
                              </div>

                              {/* Double Bar Construction */}
                              <div className="flex items-end gap-1 w-full max-w-[40px] h-[200px]">
                                 <div
                                    className="w-1/2 bg-indigo-500 dark:bg-indigo-600 rounded-t-sm opacity-90 group-hover:opacity-100 transition-all"
                                    style={{ height: `${heightRev}%` }}
                                 />
                                 <div
                                    className="w-1/2 bg-emerald-400 dark:bg-emerald-500 rounded-t-sm opacity-90 group-hover:opacity-100 transition-all"
                                    style={{ height: `${heightProfit}%` }}
                                 />
                              </div>
                              <span className="text-[11px] font-bold text-slate-500 mt-3 uppercase">{data.month}</span>
                           </div>
                        );
                     })}
                  </div>
                  {/* Chart Legend */}
                  <div className="flex justify-center gap-6 mt-2 pb-2">
                     <div className="flex items-center gap-2"><div className="size-3 rounded-full bg-indigo-500"></div><span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Gross Revenue</span></div>
                     <div className="flex items-center gap-2"><div className="size-3 rounded-full bg-emerald-400"></div><span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Net Profit</span></div>
                  </div>
               </div>
            </div>

            {/* 2. Outstanding Balance Report */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 section-heading-accent">
                     <Calendar size={20} className="text-primary" /> Receivables & Payables
                  </h4>

                  <div className="space-y-6">
                     {/* Receivables */}
                     <div>
                        <div className="flex justify-between items-end mb-2">
                           <span className="text-sm font-bold text-slate-500">Pending from Customers</span>
                           <span className="text-lg kpi-number text-orange-500">{fmt(metrics.pendingCollections)}</span>
                        </div>
                        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                           <div
                              className="h-full bg-orange-400 rounded-full progress-bar-animated"
                              style={{ width: `${Math.min((metrics.pendingCollections / metrics.totalRevenue) * 100, 100)}%` }}
                           />
                        </div>
                        <p className="text-xs text-slate-400 mt-1 text-right">{((metrics.pendingCollections / metrics.totalRevenue) * 100 || 0).toFixed(1)}% of Revenue uncollected</p>
                     </div>

                     {/* Payables */}
                     <div>
                        <div className="flex justify-between items-end mb-2">
                           <span className="text-sm font-bold text-slate-500">Pending to Vendors</span>
                           <span className="text-lg kpi-number text-blue-500">{fmt(metrics.pendingPayables)}</span>
                        </div>
                        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                           <div
                              className="h-full bg-blue-400 rounded-full progress-bar-animated"
                              style={{ width: `${Math.min((metrics.pendingPayables / metrics.totalCost) * 100, 100)}%` }}
                           />
                        </div>
                        <p className="text-xs text-slate-400 mt-1 text-right">{((metrics.pendingPayables / metrics.totalCost) * 100 || 0).toFixed(1)}% of Cost unpaid</p>
                     </div>
                  </div>
               </div>

               {/* Expense Breakdown (MIS) */}
               <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 section-heading-accent">
                     <PieChart size={20} className="text-primary" /> Expense Breakdown (MIS)
                  </h4>

                  <div className="space-y-4">
                     {Object.entries(metrics.categoryExpenses as Record<string, number>)
                        .sort(([, a], [, b]) => b - a)
                        .map(([cat, amount], idx) => (
                           <div key={cat} className="group">
                              <div className="flex justify-between items-center mb-1 text-sm">
                                 <span className="font-bold text-slate-700 dark:text-slate-300">{cat}</span>
                                 <span className="kpi-number text-slate-900 dark:text-white">{fmt(amount)}</span>
                              </div>
                              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                 <div
                                    className={`h-full rounded-full ${['bg-purple-500', 'bg-sky-500', 'bg-pink-500', 'bg-amber-500'][idx % 4]}`}
                                    style={{ width: `${(amount / metrics.totalCost) * 100}%` }}
                                 />
                              </div>
                           </div>
                        ))}
                     {Object.keys(metrics.categoryExpenses).length === 0 && (
                        <p className="text-slate-400 text-sm italic text-center py-10">No expense data available yet.</p>
                     )}
                  </div>
               </div>
            </div>

            {/* 3. Trip Profitability Table */}
            <div className="bg-white dark:bg-[#1A2633] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
               <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 section-heading-accent">
                     <Filter size={20} className="text-primary" /> Trip Profitability
                  </h4>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                     <thead className="bg-slate-50 dark:bg-slate-900/50">
                        <tr>
                           <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs">Customer</th>
                           <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs">Trip</th>
                           <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs text-right">Revenue</th>
                           <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs text-right">Cost</th>
                           <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs text-right">Profit</th>
                           <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs text-right">Margin</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredBookings.map(booking => {
                           const revenue = booking.amount;
                           const cost = (booking.supplierBookings || []).reduce((sum, sb) => sum + sb.cost, 0);
                           const profit = revenue - cost;
                           const margin = revenue ? (profit / revenue) * 100 : 0;

                           return (
                              <tr key={booking.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                 <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{booking.customer}</td>
                                 <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{booking.title}</td>
                                 <td className="px-6 py-4 text-right kpi-number text-emerald-600">{fmt(revenue)}</td>
                                 <td className="px-6 py-4 text-right kpi-number text-red-500">{fmt(cost)}</td>
                                 <td className={`px-6 py-4 text-right kpi-number ${profit >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                                    {fmt(profit)}
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${margin >= 15 ? 'bg-green-100 text-green-700' : margin >= 5 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                       {margin.toFixed(1)}%
                                    </span>
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>
            </div>

            {/* NEW Grid: Agent Perf & Lead Source ROI */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

               {/* 2. Agent Leaderboard */}
               <div className="bg-white dark:bg-[#1A2633] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col h-full">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                     <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 section-heading-accent">
                        <Users size={20} className="text-primary" /> Top Performing Agents
                     </h4>
                  </div>
                  <div className="p-0 overflow-x-auto flex-1">
                     <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                           <tr>
                              <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs">Agent</th>
                              <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs text-right">Revenue</th>
                              <th className="px-6 py-4 font-bold text-slate-500 uppercase text-xs text-right">Net Profit</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                           {agentPerformance.map((agent, i) => {
                              const margin = agent.revenue > 0 ? (agent.profit / agent.revenue) * 100 : 0;
                              return (
                                 <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                       <div className="flex items-center gap-3">
                                          <div className={`size-8 rounded-full bg-${agent.color}-100 dark:bg-${agent.color}-900/40 text-${agent.color}-600 dark:text-${agent.color}-400 font-bold flex items-center justify-center text-xs shadow-sm`}>
                                             {agent.initials}
                                          </div>
                                          <span className="font-bold text-slate-900 dark:text-white">{agent.name}</span>
                                       </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-slate-700 dark:text-slate-300">{fmtShort(agent.revenue)}</td>
                                    <td className="px-6 py-4 text-right">
                                       <span className="block kpi-number text-emerald-600 dark:text-emerald-400">{fmtShort(agent.profit)}</span>
                                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{margin.toFixed(0)}% mgn</span>
                                    </td>
                                 </tr>
                              );
                           })}
                        </tbody>
                     </table>
                  </div>
               </div>

               {/* 3. Lead Source ROI & Aging Report */}
               <div className="flex flex-col gap-8">
                  {/* Lead Source ROI */}
                  <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col h-full">
                     <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 section-heading-accent">
                        <LinkIcon size={20} className="text-primary" /> Lead Source ROI (Potential)
                     </h4>
                     <div className="space-y-4 flex-1">
                        {leadSourceROI.map((src, i) => (
                           <div key={i} className="flex flex-col gap-1 border-b border-slate-100 dark:border-slate-800 last:border-0 pb-3 last:pb-0">
                              <div className="flex justify-between items-center">
                                 <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{src.source}</span>
                                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">{src.rate}% Conv.</span>
                                 </div>
                                 <span className="kpi-number text-indigo-600 dark:text-indigo-400">{fmtShort(src.revenueFromConverted)}</span>
                              </div>
                              <div className="text-xs text-slate-500 font-medium">
                                 {src.converted} won / {src.totalLeads} total leads
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* 6. Accounts Aging Report */}
                  <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col">
                     <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 section-heading-accent">
                        <Clock size={20} className="text-primary" /> Receivables Aging
                     </h4>
                     <div className="grid grid-cols-4 gap-2 text-center items-end h-24 mb-2">
                        {[
                           { label: '< 7 Days', val: agingReport.current, color: 'bg-emerald-400' },
                           { label: '7 - 15', val: agingReport.days1to15, color: 'bg-amber-400' },
                           { label: '16 - 30', val: agingReport.days16to30, color: 'bg-orange-500' },
                           { label: '> 30 Days', val: agingReport.over30, color: 'bg-rose-600' }
                        ].map((b, i) => {
                           const height = Math.max((b.val / (metrics.pendingCollections || 1)) * 100, 10);
                           return (
                              <div key={i} className="flex flex-col items-center justify-end h-full">
                                 <span className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 leading-tight">{b.val > 0 ? fmtShort(b.val) : '-'}</span>
                                 <div className={`w-full max-w-[40px] rounded-t-sm ${b.color} transition-all opacity-90 hover:opacity-100`} style={{ height: `${height}%` }}></div>
                              </div>
                           )
                        })}
                     </div>
                     <div className="grid grid-cols-4 gap-2 text-center border-t border-slate-100 dark:border-slate-800 pt-2">
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">&lt; 7 Days</div>
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">7 - 15D</div>
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">16 - 30D</div>
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">&gt; 30 Days</div>
                     </div>
                  </div>
               </div>
            </div>

            {/* 4. Most Profitable Packages (Grid bottom) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
               <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col xl:col-span-1">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 section-heading-accent">
                     <MapIcon size={20} className="text-primary" /> Most Profitable Packages
                  </h4>
                  <div className="space-y-4 flex-1">
                     {destProfitability.map((dest, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                           <div className="flex items-center gap-3">
                              <div className="size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-sm">
                                 #{i + 1}
                              </div>
                              <div>
                                 <p className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{dest.name}</p>
                                 <p className="text-xs font-medium text-slate-500">{dest.count} trips booked</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="kpi-number text-sm text-emerald-600 dark:text-emerald-400">{fmtShort(dest.profit)}</p>
                              <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-[10px] font-bold rounded uppercase tracking-widest text-slate-600 dark:text-slate-300">
                                 {dest.margin}% Mgn
                              </span>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            </>}

            {/* ===== SALES & LEADS TAB ===== */}
            {activeTab === 'sales' && <>

               {/* Lead Pipeline Status Overview */}
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                     { label: 'New', val: lostLeadAnalysis.byStatus['New'] || 0, color: 'bg-blue-500', light: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
                     { label: 'Warm', val: lostLeadAnalysis.byStatus['Warm'] || 0, color: 'bg-amber-400', light: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
                     { label: 'Hot', val: lostLeadAnalysis.byStatus['Hot'] || 0, color: 'bg-orange-500', light: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
                     { label: 'Cold / Lost', val: lostLeadAnalysis.byStatus['Cold'] || 0, color: 'bg-slate-400', light: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
                     { label: 'Offer Sent', val: lostLeadAnalysis.byStatus['Offer Sent'] || 0, color: 'bg-violet-500', light: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
                     { label: 'Converted', val: lostLeadAnalysis.byStatus['Converted'] || 0, color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
                  ].map(s => (
                     <div key={s.label} className="bg-white dark:bg-[#1A2633] p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 text-center">
                        <div className={`text-3xl kpi-number mb-1 ${s.light.split(' ')[1]}`}>{s.val}</div>
                        <div className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${s.light}`}>{s.label}</div>
                        <div className="mt-2 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                           <div className={`h-full ${s.color} rounded-full`} style={{ width: `${lostLeadAnalysis.total > 0 ? (s.val / lostLeadAnalysis.total) * 100 : 0}%` }} />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">{lostLeadAnalysis.total > 0 ? Math.round((s.val / lostLeadAnalysis.total) * 100) : 0}% of total</p>
                     </div>
                  ))}
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Follow-Up Effectiveness */}
                  <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                     <h4 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 section-heading-accent">
                        <ThumbsUp size={18} className="text-primary" /> Follow-Up Effectiveness
                     </h4>
                     <p className="text-xs text-slate-500 mb-4">Conversion rate: leads WITH vs WITHOUT follow-ups</p>
                     <div className="space-y-4">
                        <div>
                           <div className="flex justify-between text-sm mb-1">
                              <span className="font-bold text-slate-700 dark:text-slate-300">With Follow-Up <span className="text-slate-400 font-normal">({followUpEffect.wFUCount} leads)</span></span>
                              <span className="kpi-number text-emerald-600">{followUpEffect.rWith}%</span>
                           </div>
                           <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${followUpEffect.rWith}%` }} />
                           </div>
                        </div>
                        <div>
                           <div className="flex justify-between text-sm mb-1">
                              <span className="font-bold text-slate-700 dark:text-slate-300">Without Follow-Up <span className="text-slate-400 font-normal">({followUpEffect.woFUCount} leads)</span></span>
                              <span className="kpi-number text-red-500">{followUpEffect.rWithout}%</span>
                           </div>
                           <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-red-400 rounded-full" style={{ width: `${followUpEffect.rWithout}%` }} />
                           </div>
                        </div>
                        <p className="text-xs text-slate-400 italic pt-2 border-t border-slate-100 dark:border-slate-800">
                           {followUpEffect.rWith > followUpEffect.rWithout
                              ? `Follow-ups improve conversion by ${followUpEffect.rWith - followUpEffect.rWithout}pp`
                              : 'No significant difference detected yet'}
                        </p>
                     </div>
                  </div>

                  {/* Inquiry → Quote Ratio */}
                  <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                     <h4 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 section-heading-accent">
                        <MessageSquare size={18} className="text-primary" /> Inquiry → Quote Ratio
                     </h4>
                     <p className="text-xs text-slate-500 mb-6">What % of inquiries received a formal quote?</p>
                     <div className="text-center mb-4">
                        <div className="text-6xl kpi-number text-primary">{inquiryToQuote.ratio}%</div>
                        <p className="text-sm text-slate-500 mt-2">{inquiryToQuote.withQuote} of {inquiryToQuote.total} leads</p>
                     </div>
                     <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${inquiryToQuote.ratio}%` }} />
                     </div>
                     <p className="text-xs text-slate-400 mt-3 italic">{inquiryToQuote.ratio < 50 ? '⚠️ Low ratio — staff may be slow to send quotes.' : '✅ Healthy quote pipeline.'}</p>
                  </div>

                  {/* Avg Lead-to-Booking Time (existing) */}
                  <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center">
                     <Timer size={40} className="text-primary mb-3 opacity-80" />
                     <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Avg. Lead-to-Booking Time</p>
                     <div className="text-6xl kpi-number text-slate-900 dark:text-white">{averageConversionTimeDays}</div>
                     <p className="text-slate-400 text-sm mt-1">days from first inquiry to conversion</p>
                     <p className="text-xs text-slate-400 mt-4 italic">{averageConversionTimeDays > 30 ? '⚠️ High — consider faster quote turnaround.' : averageConversionTimeDays === 0 ? 'No data yet.' : '✅ Good pace.'}</p>
                  </div>
               </div>

               {/* Lead Source ROI — existing widget recycled here */}
               <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                     <h4 className="text-base font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2 section-heading-accent">
                        <LinkIcon size={18} className="text-primary" /> Lead Source ROI
                     </h4>
                     <div className="space-y-4">
                        {leadSourceROI.map((src, i) => (
                           <div key={i} className="flex flex-col gap-1 border-b border-slate-100 dark:border-slate-800 last:border-0 pb-3 last:pb-0">
                              <div className="flex justify-between items-center">
                                 <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{src.source}</span>
                                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">{src.rate}% Conv.</span>
                                 </div>
                                 <span className="kpi-number text-indigo-600 dark:text-indigo-400">{fmtShort(src.revenueFromConverted)}</span>
                              </div>
                              <div className="text-xs text-slate-500">{src.converted} won / {src.totalLeads} total leads</div>
                           </div>
                        ))}
                        {leadSourceROI.length === 0 && <p className="text-slate-400 text-sm text-center py-8 italic">No lead source data yet.</p>}
                     </div>
                  </div>

                  {/* Destination Trend (Quarterly) */}
                  <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                     <h4 className="text-base font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2 section-heading-accent">
                        <Activity size={18} className="text-primary" /> Destination Trend by Quarter
                     </h4>
                     {destTrend.topDests.length > 0 ? (
                        <div className="overflow-x-auto">
                           <table className="w-full text-sm">
                              <thead>
                                 <tr className="border-b border-slate-100 dark:border-slate-800">
                                    <th className="pb-2 text-left font-bold text-slate-500 text-xs uppercase">Destination</th>
                                    {['Q1','Q2','Q3','Q4'].map(q => <th key={q} className="pb-2 text-center font-bold text-slate-500 text-xs uppercase">{q}</th>)}
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                 {destTrend.topDests.map(dest => (
                                    <tr key={dest}>
                                       <td className="py-2.5 font-bold text-slate-900 dark:text-white">{dest}</td>
                                       {['Q1','Q2','Q3','Q4'].map(q => (
                                          <td key={q} className="py-2.5 text-center">
                                             <span className={`px-2 py-0.5 rounded text-xs font-bold ${destTrend.qMap[q][dest] ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'text-slate-300'}`}>
                                                {destTrend.qMap[q][dest] || '—'}
                                             </span>
                                          </td>
                                       ))}
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     ) : <p className="text-slate-400 text-sm text-center py-8 italic">Add lead destination data to see trends.</p>}
                  </div>
               </div>

            </>}

            {/* ===== TEAM TAB ===== */}
            {activeTab === 'team' && <>

               {/* Agent Leaderboard */}
               <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-[#1A2633] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                     <div className="p-5 border-b border-slate-200 dark:border-slate-800">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 section-heading-accent">
                           <Award size={18} className="text-primary" /> Agent Revenue Leaderboard
                        </h4>
                     </div>
                     <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                           <tr>
                              <th className="px-5 py-3 text-left font-bold text-slate-500 text-xs uppercase">Agent</th>
                              <th className="px-5 py-3 text-right font-bold text-slate-500 text-xs uppercase">Revenue</th>
                              <th className="px-5 py-3 text-right font-bold text-slate-500 text-xs uppercase">Net Profit</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                           {agentPerformance.map((agent, i) => {
                              const margin = agent.revenue > 0 ? (agent.profit / agent.revenue) * 100 : 0;
                              return (
                                 <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-5 py-3">
                                       <div className="flex items-center gap-3">
                                          <div className={`size-8 rounded-full bg-${agent.color}-100 dark:bg-${agent.color}-900/40 text-${agent.color}-600 dark:text-${agent.color}-400 font-bold flex items-center justify-center text-xs`}>{agent.initials}</div>
                                          <span className="font-bold text-slate-900 dark:text-white">{agent.name}</span>
                                       </div>
                                    </td>
                                    <td className="px-5 py-3 text-right font-medium text-slate-700 dark:text-slate-300">{fmtShort(agent.revenue)}</td>
                                    <td className="px-5 py-3 text-right">
                                       <span className="block kpi-number text-emerald-600 dark:text-emerald-400">{fmtShort(agent.profit)}</span>
                                       <span className="text-[10px] font-bold text-slate-400 uppercase">{margin.toFixed(0)}% mgn</span>
                                    </td>
                                 </tr>
                              );
                           })}
                           {agentPerformance.length === 0 && <tr><td colSpan={3} className="px-5 py-10 text-center text-slate-400 italic text-sm">No booking data yet.</td></tr>}
                        </tbody>
                     </table>
                  </div>

                  {/* Staff Response Time */}
                  <div className="bg-white dark:bg-[#1A2633] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                     <div className="p-5 border-b border-slate-200 dark:border-slate-800">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 section-heading-accent">
                           <Clock size={18} className="text-primary" /> Staff Response Time
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">Avg hours from lead received to first log entry (max 72h)</p>
                     </div>
                     <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {staffResponseTime.map((s, i) => (
                           <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                              <div className={`size-8 rounded-full bg-${s.color}-100 dark:bg-${s.color}-900/40 text-${s.color}-600 font-bold flex items-center justify-center text-xs shrink-0`}>{s.initials}</div>
                              <div className="flex-1 min-w-0">
                                 <p className="font-bold text-slate-900 dark:text-white text-sm">{s.name}</p>
                                 <div className="mt-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${s.avg < 2 ? 'bg-emerald-400' : s.avg < 8 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${Math.min((s.avg / 24) * 100, 100)}%` }} />
                                 </div>
                              </div>
                              <div className="text-right shrink-0">
                                 <span className={`text-sm kpi-number ${s.avg < 2 ? 'text-emerald-600' : s.avg < 8 ? 'text-amber-600' : 'text-red-500'}`}>{s.avg}h</span>
                                 <p className="text-[10px] text-slate-400">{s.count} leads</p>
                              </div>
                           </div>
                        ))}
                        {staffResponseTime.length === 0 && <p className="text-center text-slate-400 italic text-sm py-10">Log entries needed to calculate response times.</p>}
                     </div>
                  </div>
               </div>

               {/* Geographic Origin */}
               <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2 section-heading-accent">
                     <Globe size={18} className="text-primary" /> Customer Geographic Origin
                  </h4>
                  <div className="space-y-3">
                     {geoData.map((g, i) => (
                        <div key={i} className="flex items-center gap-3">
                           <span className="w-24 text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{g.city}</span>
                           <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${['bg-indigo-500','bg-emerald-400','bg-amber-400','bg-pink-500','bg-violet-500','bg-sky-400','bg-orange-400'][i % 7]}`} style={{ width: `${g.pct}%` }} />
                           </div>
                           <span className="w-20 text-right text-sm font-bold text-slate-900 dark:text-white">{g.count} <span className="text-slate-400 font-normal">({g.pct}%)</span></span>
                        </div>
                     ))}
                     {geoData.length === 0 && <p className="text-center text-slate-400 italic text-sm py-6">Add customer location data to see origin insights.</p>}
                  </div>
               </div>

            </>}

            {/* ===== BUSINESS INTELLIGENCE TAB ===== */}
            {activeTab === 'bi' && <>

               {/* CLV + Cancellations + Payment Lag KPIs */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20"><Star size={64} className="text-amber-500" /></div>
                     <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Avg Customer LTV</p>
                     <h3 className="text-4xl kpi-number text-slate-900 dark:text-white mt-2">{fmt(clvData.avgCLV)}</h3>
                     <p className="text-amber-500 text-xs font-bold mt-2">Across {clvData.total} customers</p>
                  </div>
                  <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20"><XCircle size={64} className="text-red-500" /></div>
                     <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Cancellation Rate</p>
                     <h3 className="text-4xl kpi-number text-slate-900 dark:text-white mt-2">{cancellationData.rate}%</h3>
                     <p className="text-red-400 text-xs font-bold mt-2">{cancellationData.count} of {cancellationData.total} bookings · {fmt(cancellationData.refundTotal)} refunded</p>
                  </div>
                  <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20"><Timer size={64} className="text-blue-500" /></div>
                     <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Avg Payment Collection Lag</p>
                     <h3 className="text-4xl kpi-number text-slate-900 dark:text-white mt-2">{paymentLag} <span className="text-lg text-slate-500">days</span></h3>
                     <p className="text-blue-400 text-xs font-bold mt-2">From booking date to first payment</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Top Customers by CLV */}
                  <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                     <h4 className="text-base font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2 section-heading-accent">
                        <Star size={18} className="text-primary" /> Top 5 Customers by Lifetime Value
                     </h4>
                     <div className="space-y-3">
                        {clvData.top5.map((c, i) => (
                           <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                              <div className="size-8 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 font-bold flex items-center justify-center text-sm shrink-0">#{i + 1}</div>
                              <div className="flex-1 min-w-0">
                                 <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{c.name}</p>
                                 <p className="text-xs text-slate-500">{c.bookingsCount} booking{c.bookingsCount !== 1 ? 's' : ''} · {c.type}</p>
                              </div>
                              <span className="kpi-number text-amber-600 dark:text-amber-400">{fmtShort(c.totalSpent)}</span>
                           </div>
                        ))}
                        {clvData.top5.length === 0 && <p className="text-center text-slate-400 italic text-sm py-6">No customer data yet.</p>}
                     </div>
                  </div>

                  {/* Package Popularity vs Profitability */}
                  <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                     <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2 section-heading-accent">
                        <AlertCircle size={18} className="text-primary" /> Package Popularity vs Profit
                     </h4>
                     <p className="text-xs text-slate-500 mb-4">Popular isn't always profitable — compare both</p>
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                           <thead>
                              <tr className="border-b border-slate-100 dark:border-slate-800">
                                 <th className="pb-2 text-left font-bold text-slate-500 text-xs uppercase">Package</th>
                                 <th className="pb-2 text-center font-bold text-slate-500 text-xs uppercase">Bookings</th>
                                 <th className="pb-2 text-right font-bold text-slate-500 text-xs uppercase">Profit</th>
                                 <th className="pb-2 text-right font-bold text-slate-500 text-xs uppercase">Margin</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {pkgVsProfit.map((p, i) => (
                                 <tr key={i}>
                                    <td className="py-2.5 font-bold text-slate-900 dark:text-white text-xs max-w-[140px] truncate">{p.name}</td>
                                    <td className="py-2.5 text-center"><span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded">{p.count}x</span></td>
                                    <td className="py-2.5 text-right kpi-number text-xs text-emerald-600">{fmtShort(p.profit)}</td>
                                    <td className="py-2.5 text-right"><span className={`text-xs font-bold ${p.margin >= 15 ? 'text-emerald-600' : p.margin >= 5 ? 'text-amber-600' : 'text-red-500'}`}>{p.margin}%</span></td>
                                 </tr>
                              ))}
                              {pkgVsProfit.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-slate-400 italic text-sm">No booking data yet.</td></tr>}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Group Size Distribution */}
                  <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                     <h4 className="text-base font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2 section-heading-accent">
                        <Users size={18} className="text-primary" /> Group Size Distribution
                     </h4>
                     {(() => {
                        const total = groupSizeData.solo + groupSizeData.couple + groupSizeData.family + groupSizeData.group;
                        return (
                           <div className="space-y-3">
                              {[
                                 { label: 'Solo (1 pax)', val: groupSizeData.solo, color: 'bg-violet-400', emoji: '🧍' },
                                 { label: 'Couple (2 pax)', val: groupSizeData.couple, color: 'bg-pink-400', emoji: '💑' },
                                 { label: 'Family (3-5 pax)', val: groupSizeData.family, color: 'bg-amber-400', emoji: '👨‍👩‍👧' },
                                 { label: 'Group (6+ pax)', val: groupSizeData.group, color: 'bg-emerald-500', emoji: '👥' },
                              ].map(g => (
                                 <div key={g.label}>
                                    <div className="flex justify-between text-sm mb-1">
                                       <span className="font-bold text-slate-700 dark:text-slate-300">{g.emoji} {g.label}</span>
                                       <span className="text-slate-500">{g.val} bookings ({total > 0 ? Math.round((g.val / total) * 100) : 0}%)</span>
                                    </div>
                                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                       <div className={`h-full ${g.color} rounded-full`} style={{ width: `${total > 0 ? (g.val / total) * 100 : 0}%` }} />
                                    </div>
                                 </div>
                              ))}
                           </div>
                        );
                     })()}
                  </div>

                  {/* Upsell / Add-On Revenue Breakdown */}
                  <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                     <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2 section-heading-accent">
                        <Award size={18} className="text-primary" /> Upsell & Add-On Revenue
                     </h4>
                     <p className="text-xs text-slate-500 mb-5">Supplier cost breakdown by service type</p>
                     <div className="space-y-3">
                        {upsellData.map((u, i) => (
                           <div key={i}>
                              <div className="flex justify-between text-sm mb-1">
                                 <span className="font-bold text-slate-700 dark:text-slate-300">{u.type}</span>
                                 <span className="text-slate-900 dark:text-white font-medium">{fmt(u.amount)} <span className="text-slate-400 text-xs">({u.pct}%)</span></span>
                              </div>
                              <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                 <div className={`h-full rounded-full ${['bg-indigo-500','bg-emerald-400','bg-amber-400','bg-pink-500','bg-violet-500'][i % 5]}`} style={{ width: `${u.pct}%` }} />
                              </div>
                           </div>
                        ))}
                        {upsellData.length === 0 && <p className="text-center text-slate-400 italic text-sm py-6">No supplier booking data yet.</p>}
                     </div>
                  </div>
               </div>

            </>}

         </div>
      </div>
   );
};