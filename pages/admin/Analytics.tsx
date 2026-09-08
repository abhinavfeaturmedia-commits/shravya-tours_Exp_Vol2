import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Booking, SupplierBooking, Expense } from '../../types';
import { api } from '../../src/lib/api';
import {
   BarChart, TrendingUp, TrendingDown, DollarSign,
   PieChart, CreditCard, Calendar, Filter, Download,
   Users, Map as MapIcon, Link as LinkIcon, Timer, Clock,
   Target, AlertCircle, ThumbsUp, Globe, Star,
   MessageSquare, Award, XCircle, Zap, Activity, RefreshCw,
   Receipt, X, ChevronRight, Info, ExternalLink, CheckCircle2,
   Wallet, Building2, HelpCircle, UserCheck, FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';

// ─── High-Insight Interactive Financial Trend Chart ──────────────────────────────────────
interface TrendPoint { month: string; revenue: number; profit: number; year?: number; mIndex?: number; }

const TrendChart: React.FC<{ pts: TrendPoint[]; fmt: (n: number) => string }> = ({ pts, fmt }) => {
   const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
   const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
   const [chartMode, setChartMode] = useState<'combo' | 'dual' | 'stacked'>('combo');
   const [activeMetric, setActiveMetric] = useState<'both' | 'revenue' | 'profit'>('both');
   const [hideEmpty, setHideEmpty] = useState<boolean>(true);

   // Filter empty leading months if requested
   const displayPts = useMemo(() => {
      if (!hideEmpty || pts.length === 0) return pts;
      // Find first month index with non-zero revenue or profit
      const firstActiveIdx = pts.findIndex(p => p.revenue > 0 || p.profit > 0);
      if (firstActiveIdx <= 0) return pts;
      return pts.slice(firstActiveIdx);
   }, [pts, hideEmpty]);

   const hasLeadingZeros = useMemo(() => {
      const firstActiveIdx = pts.findIndex(p => p.revenue > 0 || p.profit > 0);
      return firstActiveIdx > 0;
   }, [pts]);

   // Header Derived Insights & KPIs
   const insights = useMemo(() => {
      if (displayPts.length === 0) return { peakMonth: 'N/A', peakRev: 0, bestProfitMonth: 'N/A', maxProfit: 0, avgMargin: 0 };
      
      let peakRevPoint = displayPts[0];
      let bestProfPoint = displayPts[0];
      let totalRev = 0;
      let totalProf = 0;

      displayPts.forEach(p => {
         totalRev += p.revenue;
         totalProf += p.profit;
         if (p.revenue > peakRevPoint.revenue) peakRevPoint = p;
         if (p.profit > bestProfPoint.profit) bestProfPoint = p;
      });

      const avgMargin = totalRev > 0 ? (totalProf / totalRev) * 100 : 0;
      return {
         peakMonth: peakRevPoint.month,
         peakRev: peakRevPoint.revenue,
         bestProfitMonth: bestProfPoint.month,
         maxProfit: bestProfPoint.profit,
         avgMargin
      };
   }, [displayPts]);

   // Layout Dimensions
   const W = 920, H = 300;
   const PAD = { top: 32, right: chartMode === 'dual' ? 68 : 32, bottom: 44, left: 68 };
   const innerW = W - PAD.left - PAD.right;
   const innerH = H - PAD.top - PAD.bottom;

   const maxRev = Math.max(...displayPts.map(d => d.revenue), 1);
   const maxProf = Math.max(...displayPts.map(d => d.profit), 1);
   const maxValUnified = Math.max(...displayPts.map(d => Math.max(d.revenue, d.profit)), 1);

   const yTicks = 5;
   const n = displayPts.length;
   const colWidth = n > 0 ? innerW / n : innerW;
   const barWidth = Math.min(Math.max(colWidth * 0.38, 14), 36);

   // X & Y position helpers
   const xCenterOf = (i: number) => PAD.left + (i + 0.5) * colWidth;
   const yOfRev = (v: number) => PAD.top + innerH - (v / (chartMode === 'dual' ? maxRev : maxValUnified)) * innerH;
   const yOfProf = (v: number) => PAD.top + innerH - (v / (chartMode === 'dual' ? maxProf : maxValUnified)) * innerH;

   // Formatting Y-Axis labels with precise decimal Lakhs (eliminates duplicate ₹2L ticks)
   const fmtAxisLabel = (v: number) => {
      if (v === 0) return '₹0';
      if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
      if (v >= 100000) {
         const lakhs = v / 100000;
         return lakhs % 1 === 0 ? `₹${lakhs.toFixed(0)}L` : `₹${lakhs.toFixed(1)}L`;
      }
      if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
      return `₹${Math.round(v)}`;
   };

   // Bezier Curve generator for Line mode
   const buildBezier = (vals: number[], yMapper: (v: number) => number) => {
      if (vals.length === 0) return '';
      if (vals.length === 1) return `M ${xCenterOf(0)} ${yMapper(vals[0])}`;
      let d = `M ${xCenterOf(0)} ${yMapper(vals[0])}`;
      for (let i = 0; i < vals.length - 1; i++) {
         const x1 = xCenterOf(i);
         const y1 = yMapper(vals[i]);
         const x2 = xCenterOf(i + 1);
         const y2 = yMapper(vals[i + 1]);
         const cx = (x2 - x1) / 2.2;
         d += ` C ${x1 + cx} ${y1}, ${x2 - cx} ${y2}, ${x2} ${y2}`;
      }
      return d;
   };

   const buildArea = (vals: number[], yMapper: (v: number) => number) => {
      const line = buildBezier(vals, yMapper);
      if (!line) return '';
      const lastX = xCenterOf(vals.length - 1);
      const firstX = xCenterOf(0);
      const bottomY = PAD.top + innerH;
      return `${line} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
   };

   const activeIdx = hoveredIdx !== null ? hoveredIdx : selectedIdx;
   const activeItem = activeIdx !== null && activeIdx < displayPts.length ? displayPts[activeIdx] : null;

   // Metric visibility flags
   const showRev = activeMetric === 'both' || activeMetric === 'revenue';
   const showProf = activeMetric === 'both' || activeMetric === 'profit';

   return (
      <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-all">
         
         {/* ── Top Header Controls & Title ── */}
         <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
               <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                     <TrendingUp size={22} />
                  </div>
                  <div>
                     <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        Monthly Revenue & Financial Performance
                     </h4>
                     <p className="text-xs text-slate-500 dark:text-slate-400">
                        Interactive breakdown of Gross Revenue, Supplier COGS, and Net Profit
                     </p>
                  </div>
               </div>
            </div>

            {/* View Mode & Metric Switchers */}
            <div className="flex flex-wrap items-center gap-2">
               {/* Mode Switcher */}
               <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                  <button
                     onClick={() => setChartMode('combo')}
                     className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        chartMode === 'combo'
                           ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm font-bold'
                           : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                     }`}
                     title="Combo Bar + Profit Line chart view"
                  >
                     📊 Combo
                  </button>
                  <button
                     onClick={() => setChartMode('dual')}
                     className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        chartMode === 'dual'
                           ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm font-bold'
                           : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                     }`}
                     title="Dual Y-Axis Mode to visualize profit curve without squashing"
                  >
                     📈 Dual-Axis
                  </button>
                  <button
                     onClick={() => setChartMode('stacked')}
                     className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        chartMode === 'stacked'
                           ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm font-bold'
                           : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                     }`}
                     title="Stacked Bar: Supplier Cost + Net Profit = Gross Sales"
                  >
                     🥞 Stacked
                  </button>
               </div>

               {/* Metric Filter Buttons */}
               <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                  {(['both', 'revenue', 'profit'] as const).map(m => (
                     <button
                        key={m}
                        onClick={() => setActiveMetric(m)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                           activeMetric === m
                              ? m === 'profit' ? 'bg-emerald-500 text-white shadow-sm font-bold'
                              : m === 'revenue' ? 'bg-indigo-600 text-white shadow-sm font-bold'
                              : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm font-bold'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                     >
                        {m}
                     </button>
                  ))}
               </div>

               {/* Smart Empty Months Filter Toggle */}
               {hasLeadingZeros && (
                  <button
                     onClick={() => setHideEmpty(!hideEmpty)}
                     className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 ${
                        hideEmpty
                           ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-semibold'
                           : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                     }`}
                  >
                     <Zap size={13} className={hideEmpty ? 'fill-indigo-500' : ''} />
                     {hideEmpty ? 'Active Months' : 'All 12 Months'}
                  </button>
               )}
            </div>
         </div>

         {/* ── KPI Quick Insight Badges Banner ── */}
         <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
               <div>
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                     Peak Revenue Month
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                     {insights.peakMonth} ({fmtAxisLabel(insights.peakRev)})
                  </div>
               </div>
               <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                  🏆
               </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
               <div>
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                     Avg Trip Margin (Cash)
                  </div>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                     {insights.avgMargin.toFixed(1)}% Margin
                  </div>
               </div>
               <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center font-bold text-xs" title="Gross trip margin on cash received (before OPEX)">
                  📈
               </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
               <div>
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                     Top Profit Month
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                     {insights.bestProfitMonth} ({fmtAxisLabel(insights.maxProfit)})
                  </div>
               </div>
               <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 flex items-center justify-center font-bold text-xs">
                  💎
               </div>
            </div>
         </div>

         {/* ── Main Interactive SVG Chart ── */}
         <div className="relative w-full overflow-x-auto">
            <svg
               viewBox={`0 0 ${W} ${H}`}
               className="w-full h-auto overflow-visible select-none"
               style={{ minWidth: 600 }}
               onMouseLeave={() => setHoveredIdx(null)}
            >
               <defs>
                  {/* Revenue Gradient */}
                  <linearGradient id="chartGradRev" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="0%" stopColor="#6366f1" stopOpacity="0.85" />
                     <stop offset="100%" stopColor="#818cf8" stopOpacity="0.45" />
                  </linearGradient>
                  {/* Expense Gradient */}
                  <linearGradient id="chartGradCost" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.80" />
                     <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.40" />
                  </linearGradient>
                  {/* Profit Line Area Fill */}
                  <linearGradient id="chartGradProfArea" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="0%" stopColor="#10b981" stopOpacity="0.30" />
                     <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
               </defs>

               {/* ── Grid Lines & Left Y-Axis ── */}
               {Array.from({ length: yTicks + 1 }, (_, i) => {
                  const val = chartMode === 'dual' ? (maxRev / yTicks) * i : (maxValUnified / yTicks) * i;
                  const y = yOfRev(val);
                  return (
                     <g key={`y-left-${i}`}>
                        <line
                           x1={PAD.left}
                           y1={y}
                           x2={W - PAD.right}
                           y2={y}
                           stroke="currentColor"
                           strokeOpacity="0.08"
                           strokeWidth="1"
                           strokeDasharray="4 4"
                        />
                        <text
                           x={PAD.left - 10}
                           y={y + 4}
                           textAnchor="end"
                           fill="currentColor"
                           fillOpacity="0.5"
                           fontSize="11"
                           fontWeight="600"
                        >
                           {fmtAxisLabel(val)}
                        </text>
                     </g>
                  );
               })}

               {/* ── Right Y-Axis (For Dual Axis Profit Mode) ── */}
               {chartMode === 'dual' && showProf && (
                  Array.from({ length: yTicks + 1 }, (_, i) => {
                     const profVal = (maxProf / yTicks) * i;
                     const y = yOfProf(profVal);
                     return (
                        <g key={`y-right-${i}`}>
                           <text
                              x={W - PAD.right + 10}
                              y={y + 4}
                              textAnchor="start"
                              fill="#10b981"
                              fontSize="11"
                              fontWeight="700"
                           >
                              {fmtAxisLabel(profVal)}
                           </text>
                        </g>
                     );
                  })
               )}

               {/* ── Render Mode A & C: Bars for Gross Revenue & Vendor Cost ── */}
               {displayPts.map((d, i) => {
                  const cx = xCenterOf(i);
                  const isHovered = activeIdx === i;
                  const vendorCost = Math.max(0, d.revenue - d.profit);

                  if (chartMode === 'stacked') {
                     // Stacked mode: Cost bar on bottom, Profit bar on top
                     const totalH = innerH * (d.revenue / maxValUnified);
                     const costH = innerH * (vendorCost / maxValUnified);
                     const profH = innerH * (Math.max(0, d.profit) / maxValUnified);
                     const baseTop = PAD.top + innerH;

                     return (
                        <g key={`bar-stacked-${i}`} onClick={() => setSelectedIdx(i)}>
                           {/* Vendor Cost Segment */}
                           {showRev && costH > 0 && (
                              <rect
                                 x={cx - barWidth / 2}
                                 y={baseTop - costH}
                                 width={barWidth}
                                 height={costH}
                                 rx="3"
                                 fill="url(#chartGradCost)"
                                 opacity={isHovered ? 1 : 0.85}
                                 className="transition-all duration-150 cursor-pointer"
                              />
                           )}
                           {/* Profit Segment */}
                           {showProf && profH > 0 && (
                              <rect
                                 x={cx - barWidth / 2}
                                 y={baseTop - costH - profH}
                                 width={barWidth}
                                 height={profH}
                                 rx="4"
                                 fill="#10b981"
                                 opacity={isHovered ? 1 : 0.9}
                                 className="transition-all duration-150 cursor-pointer"
                              />
                           )}
                        </g>
                     );
                  } else {
                     // Combo / Dual Mode: Revenue bar + Vendor cost bar
                     const revH = innerH * (d.revenue / (chartMode === 'dual' ? maxRev : maxValUnified));
                     const costH = innerH * (vendorCost / (chartMode === 'dual' ? maxRev : maxValUnified));
                     const baseTop = PAD.top + innerH;

                     return (
                        <g key={`bar-combo-${i}`} onClick={() => setSelectedIdx(i)}>
                           {/* Gross Revenue Bar */}
                           {showRev && d.revenue > 0 && (
                              <rect
                                 x={cx - barWidth / 2}
                                 y={baseTop - revH}
                                 width={barWidth}
                                 height={revH}
                                 rx="5"
                                 fill="url(#chartGradRev)"
                                 opacity={isHovered ? 1 : 0.75}
                                 className="transition-all duration-150 cursor-pointer"
                              />
                           )}
                        </g>
                     );
                  }
               })}

               {/* ── Area Fill Under Profit Line ── */}
               {showProf && displayPts.length > 1 && chartMode !== 'stacked' && (
                  <path
                     d={buildArea(displayPts.map(d => d.profit), yOfProf)}
                     fill="url(#chartGradProfArea)"
                  />
               )}

               {/* ── Net Profit Smooth Curve Line ── */}
               {showProf && displayPts.length > 1 && chartMode !== 'stacked' && (
                  <path
                     d={buildBezier(displayPts.map(d => d.profit), yOfProf)}
                     fill="none"
                     stroke="#10b981"
                     strokeWidth="3.2"
                     strokeLinecap="round"
                     strokeLinejoin="round"
                  />
               )}

               {/* ── Data Points, Node Circles & X-Axis Labels ── */}
               {displayPts.map((d, i) => {
                  const cx = xCenterOf(i);
                  const isHovered = activeIdx === i;
                  const profY = yOfProf(d.profit);

                  return (
                     <g key={`pt-${i}`}>
                        {/* X-Axis Month Label */}
                        <text
                           x={cx}
                           y={H - 12}
                           textAnchor="middle"
                           fill="currentColor"
                           fillOpacity={isHovered ? 1 : 0.65}
                           fontSize={isHovered ? "12" : "11"}
                           fontWeight={isHovered ? "800" : "600"}
                           className="transition-all cursor-pointer"
                           onClick={() => setSelectedIdx(i)}
                        >
                           {d.month}
                        </text>

                        {/* Interactive Full Column Hit Box */}
                        <rect
                           x={cx - colWidth / 2}
                           y={PAD.top}
                           width={colWidth}
                           height={innerH + 18}
                           fill="transparent"
                           className="cursor-pointer"
                           onMouseEnter={() => setHoveredIdx(i)}
                           onClick={() => setSelectedIdx(i)}
                        />

                        {/* Vertical Crosshair Guide */}
                        {isHovered && (
                           <line
                              x1={cx}
                              y1={PAD.top}
                              x2={cx}
                              y2={PAD.top + innerH}
                              stroke="#6366f1"
                              strokeOpacity="0.35"
                              strokeWidth="1.5"
                              strokeDasharray="4 3"
                           />
                        )}

                        {/* Net Profit Glowing Data Dot */}
                        {showProf && d.profit > 0 && chartMode !== 'stacked' && (
                           <circle
                              cx={cx}
                              cy={profY}
                              r={isHovered ? 7 : 4}
                              fill="#10b981"
                              stroke="#ffffff"
                              strokeWidth={isHovered ? "3" : "2"}
                              className="transition-all duration-150 shadow-md cursor-pointer"
                           />
                        )}
                     </g>
                  );
               })}
            </svg>

            {/* ── Rich Glassmorphic Interactive Floating Tooltip ── */}
            {activeItem && activeIdx !== null && (() => {
               const cx = xCenterOf(activeIdx);
               const pctX = (cx / W) * 100;
               const vendorCost = Math.max(0, activeItem.revenue - activeItem.profit);
               const marginPct = activeItem.revenue > 0 ? (activeItem.profit / activeItem.revenue) * 100 : 0;
               
               // MoM calculation
               const prevItem = activeIdx > 0 ? displayPts[activeIdx - 1] : null;
               const momRevPct = prevItem && prevItem.revenue > 0 
                  ? ((activeItem.revenue - prevItem.revenue) / prevItem.revenue) * 100 
                  : null;

               return (
                  <div
                     className="absolute z-20 top-2 -translate-x-1/2 pointer-events-none transition-all duration-150"
                     style={{ left: `${Math.max(14, Math.min(pctX, 86))}%` }}
                  >
                     <div className="bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/60 min-w-[210px]">
                        <div className="flex items-center justify-between border-b border-slate-700/80 pb-2 mb-2">
                           <span className="font-extrabold text-xs text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                              <Calendar size={13} /> {activeItem.month} Breakdown
                           </span>
                           {momRevPct !== null && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${momRevPct >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                                 {momRevPct >= 0 ? `▲ +${momRevPct.toFixed(0)}%` : `▼ ${momRevPct.toFixed(0)}%`}
                              </span>
                           )}
                        </div>

                        <div className="space-y-1.5 text-xs">
                           {/* Gross Revenue */}
                           {showRev && (
                              <div className="flex items-center justify-between">
                                 <span className="text-slate-300 flex items-center gap-1.5 font-medium">
                                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Gross Revenue:
                                 </span>
                                 <span className="font-bold text-indigo-200">{fmt(activeItem.revenue)}</span>
                              </div>
                           )}

                           {/* Vendor Cost */}
                           {showRev && (
                              <div className="flex items-center justify-between">
                                 <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Vendor COGS:
                                 </span>
                                 <span className="font-semibold text-slate-300">{fmt(vendorCost)}</span>
                              </div>
                           )}

                           {/* Net Profit */}
                           {showProf && (
                              <div className="flex items-center justify-between pt-1 border-t border-slate-700/60">
                                 <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Net Profit:
                                 </span>
                                 <span className="font-extrabold text-emerald-300">{fmt(activeItem.profit)}</span>
                              </div>
                           )}

                           {/* Profit Margin Badge */}
                           <div className="mt-2 text-center pt-1.5 border-t border-slate-800 text-[11px] font-semibold text-slate-400">
                              Profit Margin: <span className="text-emerald-400 font-bold">{marginPct.toFixed(1)}%</span>
                           </div>
                        </div>
                     </div>
                  </div>
               );
            })()}
         </div>

         {/* ── Legend & Interactive Details ── */}
         <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-5">
               {showRev && (
                  <div className="flex items-center gap-2">
                     <span className="w-3 h-3 rounded-md bg-indigo-500"></span>
                     <span className="font-semibold text-slate-700 dark:text-slate-300">Gross Sales</span>
                  </div>
               )}
               {showRev && (
                  <div className="flex items-center gap-2">
                     <span className="w-3 h-3 rounded-md bg-amber-500"></span>
                     <span className="font-semibold text-slate-600 dark:text-slate-400">Vendor Costs</span>
                  </div>
               )}
               {showProf && (
                  <div className="flex items-center gap-2">
                     <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-300 dark:ring-emerald-900"></span>
                     <span className="font-bold text-emerald-600 dark:text-emerald-400">Net Profit Line</span>
                  </div>
               )}
            </div>

            <div className="text-slate-400 text-[11px] font-medium">
               💡 Hover over any month to view detailed breakdown • Click to select
            </div>
         </div>
      </div>
   );
};
// ── end TrendChart ──────────────────────────────────────────────────────────────

export const Analytics: React.FC = () => {
   const navigate = useNavigate();
   const { bookings: globalBookings, vendors, leads: globalLeads, customers: globalCustomers, followUps: globalFollowUps, expenses: globalExpenses, refreshData } = useData();
   const { staff, currentUser, getModuleScope } = useAuth();
   const [timeRange, setTimeRange] = useState<'all' | '7days' | '30days' | 'thisMonth' | 'thisYear'>('all');
   const [activeTab, setActiveTab] = useState<'financial' | 'months12' | 'sales' | 'team' | 'bi'>('financial');
   const [twelveMonthMode, setTwelveMonthMode] = useState<'matrix' | 'pnl' | 'seasonality' | 'sources'>('matrix');
   const [selectedAgentDrilldown, setSelectedAgentDrilldown] = useState<string | null>(null);
   const [selectedMonthDrilldown, setSelectedMonthDrilldown] = useState<string | null>(null);
   const [selectedSourceDrilldown, setSelectedSourceDrilldown] = useState<string | null>(null);
   const [showReceivablesModal, setShowReceivablesModal] = useState(false);
   const [isSyncing, setIsSyncing] = useState(false);
   const [unlinkedTransactions, setUnlinkedTransactions] = useState<any[]>(() => api.getUnlinkedTransactions());

   useEffect(() => {
      setUnlinkedTransactions(api.getUnlinkedTransactions());
   }, [globalBookings]);

   // Shared helper: net verified cash received for a booking
   const getNetPaid = (b: any): number => {
      const paid = (b.transactions || [])
         .filter((t: any) => t.type === 'Payment' && t.status === 'Verified')
         .reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
      const refunded = (b.transactions || [])
         .filter((t: any) => t.type === 'Refund' && t.status === 'Verified')
         .reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
      return Math.max(0, paid - refunded);
   };

   // Staff metadata resolver with automatic fallback
   const getStaffMeta = useCallback((assignedId: any) => {
      if (!assignedId || assignedId === 'null' || assignedId === 'undefined') {
         return { id: 'unassigned', name: 'Direct / Unassigned', initials: 'DU', color: 'slate', email: '', role: 'Company Direct' };
      }
      const st = staff.find(s => String(s.id) === String(assignedId));
      if (st) {
         return {
            id: String(st.id),
            name: st.name,
            initials: st.initials || st.name.slice(0, 2).toUpperCase(),
            color: st.color || 'indigo',
            email: st.email || '',
            role: (st as any).role || 'Staff'
         };
      }
      const known: Record<string, any> = {
         '29': { id: '29', name: 'Rohit Sankpal', initials: 'RS', color: 'emerald', email: 'rohit14101987@gmail.com', role: 'Operations & Sales' },
         '30': { id: '30', name: 'Manali Sankpal', initials: 'MS', color: 'purple', email: 'shrawello@gmail.com', role: 'Sales Specialist' },
         '1007': { id: '1007', name: 'Vaishnavi Vernekar', initials: 'VV', color: 'sky', email: 'vaishnavivernekar81@gmail.com', role: 'Tour Consultant' },
         '1005': { id: '1005', name: 'Dipak Pathade', initials: 'DP', color: 'amber', email: 'deepakpathade60638@gmail.com', role: 'Sales Executive' },
         '33': { id: '33', name: 'Omkar Bhalerao', initials: 'OB', color: 'teal', email: 'omkarbhalerao42@gmail.com', role: 'Associate' },
         '32': { id: '32', name: 'Sayali Shinde', initials: 'SS', color: 'rose', email: 'sayali300shinde@gmail.com', role: 'Executive' },
         '1': { id: '1', name: 'Super Admin', initials: 'SA', color: 'indigo', email: 'admin@shravyatours.com', role: 'Admin' }
      };
      if (known[String(assignedId)]) return known[String(assignedId)];
      return { id: String(assignedId), name: `Staff #${assignedId}`, initials: `S${assignedId}`, color: 'slate', email: '', role: 'Sales' };
   }, [staff]);

   const handleSync = async () => {
      setIsSyncing(true);
      try {
         await refreshData();
         setUnlinkedTransactions(api.getUnlinkedTransactions());
         toast.success('Analytics data synchronized with database');
      } catch (err) {
         toast.error('Failed to sync. Please try again.');
      } finally {
         setIsSyncing(false);
      }
   };

   // --- RBAC Scoping (3-Tier Engine: All, Department, Assigned) ---
   const effectiveScope = useMemo(() => {
      if (!currentUser || currentUser.userType === 'Admin') return 'all';
      return getModuleScope ? getModuleScope('analytics') : (
         currentUser.queryScope === 'Show All Queries' ? 'all' :
         currentUser.queryScope === 'Show Department Queries' ? 'department' : 'assigned'
      );
   }, [currentUser, getModuleScope]);

   const myId = String(currentUser?.id || (currentUser as any)?.staffId || '');
   const deptStaffIds = useMemo(() => {
      if (!staff || !currentUser?.department) return [myId];
      return staff.filter(s => s.department === currentUser.department).map(s => String(s.id));
   }, [staff, currentUser?.department, myId]);

   const matchesRecordScope = useCallback((item: any) => {
      if (effectiveScope === 'all') return true;
      const assigned = item.assignedTo ? String(item.assignedTo) : null;
      const staffList: string[] = Array.isArray(item.assignedStaffIds)
         ? item.assignedStaffIds.map(String)
         : (item.assignedStaffIds ? [String(item.assignedStaffIds)] : []);

      if (effectiveScope === 'department') {
         return (assigned ? deptStaffIds.includes(assigned) : false) || 
                staffList.some(id => deptStaffIds.includes(id)) || 
                (assigned === myId);
      }
      // assigned only
      return assigned === myId || staffList.includes(myId);
   }, [effectiveScope, deptStaffIds, myId]);

   const bookings = useMemo(() => {
      if (effectiveScope === 'all') return globalBookings;
      return globalBookings.filter(matchesRecordScope);
   }, [effectiveScope, globalBookings, matchesRecordScope]);

   const leads = useMemo(() => {
      if (effectiveScope === 'all') return globalLeads;
      return globalLeads.filter(matchesRecordScope);
   }, [effectiveScope, globalLeads, matchesRecordScope]);

   const followUps = useMemo(() => {
      if (effectiveScope === 'all') return globalFollowUps;
      return globalFollowUps.filter(matchesRecordScope);
   }, [effectiveScope, globalFollowUps, matchesRecordScope]);

   const customers = useMemo(() => {
      if (effectiveScope === 'all') return globalCustomers;
      return globalCustomers.filter(c =>
         bookings.some(b => b.customer === c.id || b.customerId === c.id) || 
         leads.some(l => l.email === c.email || l.phone === c.phone)
      );
   }, [effectiveScope, globalCustomers, bookings, leads]);

   const expenses = useMemo(() => globalExpenses || [], [globalExpenses]);

   // --- Time Filtering Helper ---
   const isWithinRange = useCallback((dateStr: string) => {
      if (timeRange === 'all' || !dateStr) return true;
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length < 3) return true;
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      if (timeRange === '7days') {
         const threshold = new Date(startOfToday);
         threshold.setDate(threshold.getDate() - 7);
         return d >= threshold && d <= endOfToday;
      }
      if (timeRange === '30days') {
         const threshold = new Date(startOfToday);
         threshold.setDate(threshold.getDate() - 30);
         return d >= threshold && d <= endOfToday;
      }
      if (timeRange === 'thisMonth') {
         return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (timeRange === 'thisYear') {
         return d.getFullYear() === now.getFullYear();
      }
      return true;
   }, [timeRange]);

   const filteredBookings = useMemo(() => {
      return bookings.filter(b => {
         if (b.status === 'Cancelled') return false;
         return isWithinRange(b.date);
      });
   }, [bookings, isWithinRange]);

   const filteredLeads = useMemo(() => {
      return leads.filter(l => isWithinRange(l.addedOn));
   }, [leads, isWithinRange]);

   const filteredFollowUps = useMemo(() => {
      return followUps.filter(f => isWithinRange(f.scheduledAt));
   }, [followUps, isWithinRange]);

   const filteredExpenses = useMemo(() => {
      return expenses.filter(e => isWithinRange(e.date));
   }, [expenses, isWithinRange]);

   // --- Reconciled Financial Metrics Calculation ---
   const metrics = useMemo(() => {
      let totalInvoiced = 0;
      let bookingCashCollected = 0;
      let pendingCollections = 0;
      const pendingBookingsList: any[] = [];
      let totalVendorCost = 0;
      let totalVendorPaid = 0;
      let pendingPayables = 0;
      const vendorCostCategories: Record<string, number> = {};

      filteredBookings.forEach(booking => {
         const inv = Number(booking.amount) || 0;
         totalInvoiced += inv;

         const netPaid = getNetPaid(booking);
         bookingCashCollected += netPaid;

         const outstanding = Math.max(0, inv - netPaid);
         if (outstanding > 0) {
            pendingCollections += outstanding;
            pendingBookingsList.push({
               id: booking.id,
               bookingNumber: booking.bookingNumber || booking.id,
               customer: booking.customer || 'Unknown Customer',
               email: booking.email || '',
               phone: booking.phone || '',
               title: booking.title || 'Custom Tour Package',
               date: booking.date || '',
               invoiced: inv,
               paid: netPaid,
               outstanding,
               paymentStatus: booking.payment || 'Unpaid',
               assignedTo: booking.assignedTo
            });
         }

         (booking.supplierBookings || []).forEach(sb => {
            if (sb.bookingStatus === 'Cancelled') return;
            const cost = Number(sb.cost) || 0;
            const paid = Number(sb.paidAmount) || 0;
            totalVendorCost += cost;
            totalVendorPaid += paid;
            pendingPayables += Math.max(0, cost - paid);

            const cat = sb.serviceType || 'Other';
            vendorCostCategories[cat] = (vendorCostCategories[cat] || 0) + cost;
         });
      });

      // Unlinked Verified Transactions
      const unlinkedAmount = (unlinkedTransactions || [])
         .filter(t => t.type === 'Payment' && t.status === 'Verified')
         .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const totalCashCollected = bookingCashCollected + unlinkedAmount;

      // Operating Expenses (OPEX)
      let totalOpex = 0;
      const opexCategories: Record<string, number> = {};
      (filteredExpenses || []).forEach(exp => {
         if (exp.status === 'Cancelled' || exp.status === 'Rejected') return;
         const amt = Number(exp.amount) || 0;
         totalOpex += amt;
         const cat = exp.category || 'General';
         opexCategories[cat] = (opexCategories[cat] || 0) + amt;
      });

      // Total Business Costs
      const totalAllCosts = totalVendorCost + totalOpex;

      // Margins
      const grossTripMargin = totalInvoiced - totalVendorCost;
      const grossMarginPct = totalInvoiced > 0 ? (grossTripMargin / totalInvoiced) * 100 : 0;

      const netOperatingProfit = totalInvoiced - totalAllCosts;
      const netOperatingMarginPct = totalInvoiced > 0 ? (netOperatingProfit / totalInvoiced) * 100 : 0;

      const realizedCashProfit = totalCashCollected - totalAllCosts;
      const cashFlow = totalCashCollected - totalVendorPaid - totalOpex;

      return {
         totalInvoiced,
         bookingCashCollected,
         unlinkedAmount,
         totalCashCollected,
         pendingCollections,
         pendingBookingsList: pendingBookingsList.sort((a, b) => b.outstanding - a.outstanding),
         totalVendorCost,
         totalVendorPaid,
         pendingPayables,
         vendorCostCategories,
         totalOpex,
         opexCategories,
         totalAllCosts,
         grossTripMargin,
         grossMarginPct,
         netOperatingProfit,
         netOperatingMarginPct,
         realizedCashProfit,
         cashFlow
      };
   }, [filteredBookings, unlinkedTransactions, filteredExpenses]);

   // --- Rolling 12 Calendar Months Structure ---
   const twelveMonths = useMemo(() => {
      const list: { key: string; label: string; year: number; mIndex: number; shortName: string }[] = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
         const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
         const y = d.getFullYear();
         const m = d.getMonth();
         const key = `${y}-${String(m + 1).padStart(2, '0')}`;
         const shortName = d.toLocaleString('default', { month: 'short' });
         const label = `${shortName} '${String(y).slice(2)}`;
         list.push({ key, label, year: y, mIndex: m, shortName });
      }
      return list;
   }, []);

   // --- Monthly Financial Trend (for TrendChart in Financial Tab) ---
   const monthlyTrends = useMemo(() => {
      const data = twelveMonths.map(p => ({ month: p.label, revenue: 0, profit: 0, year: p.year, mIndex: p.mIndex }));

      bookings.forEach(b => {
         if (!b.date || b.status === 'Cancelled') return;
         const bKey = b.date.slice(0, 7);
         const idx = twelveMonths.findIndex(m => m.key === bKey);
         if (idx >= 0) {
            const cost = (b.supplierBookings || []).reduce((sum: number, sb: any) => sum + (Number(sb.cost) || 0), 0);
            const netPaid = getNetPaid(b);
            data[idx].revenue += netPaid;
            data[idx].profit += (netPaid - cost);
         }
      });

      return data.map(({ month, revenue, profit }) => ({ month, revenue, profit }));
   }, [bookings, twelveMonths]);

   // --- 12-Month "What Each Has Done" Agent Matrix ---
   const twelveMonthAgentData = useMemo(() => {
      const agentMap = new Map<string, {
         agentId: string;
         meta: ReturnType<typeof getStaffMeta>;
         monthly: Record<string, { count: number; invoiced: number; cashCollected: number; cogs: number; profit: number }>;
         totalCount: number;
         totalInvoiced: number;
         totalCashCollected: number;
         totalCogs: number;
         totalProfit: number;
      }>();

      const prioritizedIds = ['29', '30', '1007', '1005', '33', '32', '1', 'unassigned'];
      prioritizedIds.forEach(id => {
         const meta = getStaffMeta(id === 'unassigned' ? null : id);
         const monthly: Record<string, any> = {};
         twelveMonths.forEach(m => {
            monthly[m.key] = { count: 0, invoiced: 0, cashCollected: 0, cogs: 0, profit: 0 };
         });
         agentMap.set(id, {
            agentId: id,
            meta,
            monthly,
            totalCount: 0,
            totalInvoiced: 0,
            totalCashCollected: 0,
            totalCogs: 0,
            totalProfit: 0
         });
      });

      bookings.forEach(b => {
         if (b.status === 'Cancelled') return;
         const bDateStr = b.date ? b.date.slice(0, 7) : '';
         const agentId = b.assignedTo ? String(b.assignedTo) : 'unassigned';

         if (!agentMap.has(agentId)) {
            const meta = getStaffMeta(agentId === 'unassigned' ? null : agentId);
            const monthly: Record<string, any> = {};
            twelveMonths.forEach(m => {
               monthly[m.key] = { count: 0, invoiced: 0, cashCollected: 0, cogs: 0, profit: 0 };
            });
            agentMap.set(agentId, {
               agentId,
               meta,
               monthly,
               totalCount: 0,
               totalInvoiced: 0,
               totalCashCollected: 0,
               totalCogs: 0,
               totalProfit: 0
            });
         }

         const entry = agentMap.get(agentId)!;
         const inv = Number(b.amount) || 0;
         const netPaid = getNetPaid(b);
         const cogs = (b.supplierBookings || []).reduce((sum: number, sb: any) => sum + (Number(sb.cost) || 0), 0);
         const profit = inv - cogs;

         entry.totalCount += 1;
         entry.totalInvoiced += inv;
         entry.totalCashCollected += netPaid;
         entry.totalCogs += cogs;
         entry.totalProfit += profit;

         if (entry.monthly[bDateStr]) {
            entry.monthly[bDateStr].count += 1;
            entry.monthly[bDateStr].invoiced += inv;
            entry.monthly[bDateStr].cashCollected += netPaid;
            entry.monthly[bDateStr].cogs += cogs;
            entry.monthly[bDateStr].profit += profit;
         }
      });

      return Array.from(agentMap.values())
         .filter(a => a.totalCount > 0)
         .sort((a, b) => b.totalInvoiced - a.totalInvoiced);
   }, [bookings, twelveMonths, getStaffMeta]);

   // --- 12-Month Financial P&L Stream ---
   const twelveMonthPnlStream = useMemo(() => {
      return twelveMonths.map(m => {
         let invoiced = 0;
         let cashCollected = 0;
         let cogs = 0;
         let count = 0;

         bookings.forEach(b => {
            if (b.status === 'Cancelled') return;
            if (b.date && b.date.slice(0, 7) === m.key) {
               invoiced += Number(b.amount) || 0;
               cashCollected += getNetPaid(b);
               count += 1;
               (b.supplierBookings || []).forEach(sb => {
                  if (sb.bookingStatus !== 'Cancelled') {
                     cogs += Number(sb.cost) || 0;
                  }
               });
            }
         });

         let opex = 0;
         (expenses || []).forEach(exp => {
            if (exp.status === 'Cancelled' || exp.status === 'Rejected') return;
            if (exp.date && exp.date.slice(0, 7) === m.key) {
               opex += Number(exp.amount) || 0;
            }
         });

         (unlinkedTransactions || []).forEach(tx => {
            const txDate = tx.date || tx.created_at;
            if (txDate && txDate.slice(0, 7) === m.key && tx.type === 'Payment' && tx.status === 'Verified') {
               cashCollected += Number(tx.amount) || 0;
            }
         });

         const grossMargin = invoiced - cogs;
         const netProfit = invoiced - cogs - opex;
         const marginPct = invoiced > 0 ? (netProfit / invoiced) * 100 : 0;

         return {
            ...m,
            invoiced,
            cashCollected,
            cogs,
            opex,
            grossMargin,
            netProfit,
            marginPct,
            count
         };
      });
   }, [twelveMonths, bookings, expenses, unlinkedTransactions]);

   // --- 12-Month Lead Sources Journey Matrix ---
   const twelveMonthLeadSources = useMemo(() => {
      const sourceMap = new Map<string, {
         source: string;
         monthly: Record<string, { totalLeads: number; converted: number; winRate: number; wonRevenue: number }>;
         totalLeads: number;
         totalConverted: number;
         overallWinRate: number;
         totalWonRevenue: number;
      }>();

      const standardSources = ['Website', 'Referral', 'WhatsApp', 'Instagram', 'Direct Call', 'Walk-in', 'Facebook Ads', 'Google Ads', 'Other'];
      standardSources.forEach(src => {
         const monthly: Record<string, any> = {};
         twelveMonths.forEach(m => {
            monthly[m.key] = { totalLeads: 0, converted: 0, winRate: 0, wonRevenue: 0 };
         });
         sourceMap.set(src, {
            source: src,
            monthly,
            totalLeads: 0,
            totalConverted: 0,
            overallWinRate: 0,
            totalWonRevenue: 0
         });
      });

      leads.forEach(l => {
         const src = l.source || 'Website';
         const lDateStr = l.addedOn ? l.addedOn.slice(0, 7) : '';

         if (!sourceMap.has(src)) {
            const monthly: Record<string, any> = {};
            twelveMonths.forEach(m => {
               monthly[m.key] = { totalLeads: 0, converted: 0, winRate: 0, wonRevenue: 0 };
            });
            sourceMap.set(src, {
               source: src,
               monthly,
               totalLeads: 0,
               totalConverted: 0,
               overallWinRate: 0,
               totalWonRevenue: 0
            });
         }

         const entry = sourceMap.get(src)!;
         entry.totalLeads += 1;

         let wonRev = 0;
         const isConverted = l.status === 'Converted';
         if (isConverted) {
            entry.totalConverted += 1;
            const b = bookings.find(bk =>
               bk.leadId === l.id ||
               bk.id === (l as any).convertedBookingId ||
               bk.id === l.bookingId ||
               (bk as any).customerId === l.customerId ||
               (l.email && bk.email && bk.email.toLowerCase() === l.email.toLowerCase()) ||
               (l.phone && bk.phone && bk.phone === l.phone)
            );
            if (b) {
               wonRev = Number(b.amount) || 0;
               entry.totalWonRevenue += wonRev;
            }
         }

         if (entry.monthly[lDateStr]) {
            entry.monthly[lDateStr].totalLeads += 1;
            if (isConverted) {
               entry.monthly[lDateStr].converted += 1;
               entry.monthly[lDateStr].wonRevenue += wonRev;
            }
            const monthTotal = entry.monthly[lDateStr].totalLeads;
            const monthWon = entry.monthly[lDateStr].converted;
            entry.monthly[lDateStr].winRate = monthTotal > 0 ? Math.round((monthWon / monthTotal) * 100) : 0;
         }
      });

      return Array.from(sourceMap.values())
         .filter(s => s.totalLeads > 0)
         .map(s => ({
            ...s,
            overallWinRate: s.totalLeads > 0 ? Math.round((s.totalConverted / s.totalLeads) * 100) : 0
         }))
         .sort((a, b) => b.totalWonRevenue - a.totalWonRevenue || b.totalLeads - a.totalLeads);
   }, [leads, bookings, twelveMonths]);

   // --- Drilldown Leads (for Lead Source Selection) ---
   const drilldownLeads = useMemo(() => {
      if (!selectedSourceDrilldown && !selectedMonthDrilldown) return [];
      return leads.filter(l => {
         const matchSrc = !selectedSourceDrilldown || (l.source || 'Website') === selectedSourceDrilldown;
         const matchMonth = !selectedMonthDrilldown || (l.addedOn && l.addedOn.slice(0, 7) === selectedMonthDrilldown);
         return matchSrc && matchMonth;
      });
   }, [leads, selectedSourceDrilldown, selectedMonthDrilldown]);

   // --- Drilldown Bookings (Interactive Selection) ---
   const drilldownBookings = useMemo(() => {
      if (!selectedAgentDrilldown && !selectedMonthDrilldown) return [];
      return bookings.filter(b => {
         if (b.status === 'Cancelled') return false;
         const matchAgent = !selectedAgentDrilldown ||
            (selectedAgentDrilldown === 'unassigned' ? !b.assignedTo : String(b.assignedTo) === String(selectedAgentDrilldown));
         const matchMonth = !selectedMonthDrilldown ||
            (b.date && b.date.slice(0, 7) === selectedMonthDrilldown);
         return matchAgent && matchMonth;
      });
   }, [bookings, selectedAgentDrilldown, selectedMonthDrilldown]);

   // --- Agent Leaderboard for Team Tab ---
   const agentPerformance = useMemo(() => {
      const map = new Map<string, { id: string; name: string; initials: string; color: string; bookings: number; invoiced: number; revenue: number; profit: number }>();

      filteredBookings.forEach(b => {
         const meta = getStaffMeta(b.assignedTo);
         const existing = map.get(meta.id) || {
            id: meta.id,
            name: meta.name,
            initials: meta.initials,
            color: meta.color,
            bookings: 0,
            invoiced: 0,
            revenue: 0,
            profit: 0
         };
         const cost = (b.supplierBookings || []).reduce((sum, sb) => sum + (Number(sb.cost) || 0), 0);
         const netPaid = getNetPaid(b);
         const inv = Number(b.amount) || 0;

         existing.bookings += 1;
         existing.invoiced += inv;
         existing.revenue += netPaid;
         existing.profit += (inv - cost);
         map.set(meta.id, existing);
      });

      return Array.from(map.values()).sort((a, b) => b.invoiced - a.invoiced);
   }, [filteredBookings, getStaffMeta]);

   // --- Fixed Lead Source ROI Matching ---
   const leadSourceROI = useMemo(() => {
      const sources = new Map<string, { totalLeads: number; converted: number; revenueFromConverted: number }>();

      (filteredLeads || []).forEach(l => {
         const src = l.source || 'Direct / Website';
         const existing = sources.get(src) || { totalLeads: 0, converted: 0, revenueFromConverted: 0 };
         existing.totalLeads++;
         if (l.status === 'Converted') {
            existing.converted++;
            const b = filteredBookings.find(bk =>
               bk.leadId === l.id ||
               bk.id === (l as any).convertedBookingId ||
               bk.id === l.bookingId ||
               (bk as any).customerId === l.customerId ||
               (l.email && bk.email && bk.email.toLowerCase() === l.email.toLowerCase()) ||
               (l.phone && bk.phone && bk.phone === l.phone)
            );
            if (b) existing.revenueFromConverted += (Number(b.amount) || 0);
         }
         sources.set(src, existing);
      });

      return Array.from(sources.entries()).map(([source, data]) => ({
         source,
         ...data,
         rate: data.totalLeads > 0 ? Math.round((data.converted / data.totalLeads) * 100) : 0
      })).sort((a, b) => b.revenueFromConverted - a.revenueFromConverted);
   }, [filteredLeads, filteredBookings]);

   // --- Most Profitable Destinations ---
   const destProfitability = useMemo(() => {
      const destMap = new Map<string, { count: number; revenue: number; profit: number }>();

      filteredBookings.forEach(b => {
         const dest = (b.title || '').split('-')[0].trim() || 'Custom Package';
         const existing = destMap.get(dest) || { count: 0, revenue: 0, profit: 0 };
         const cost = (b.supplierBookings || []).reduce((sum, sb) => sum + (Number(sb.cost) || 0), 0);
         const inv = Number(b.amount) || 0;

         existing.count += 1;
         existing.revenue += inv;
         existing.profit += (inv - cost);
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
         .slice(0, 6);
   }, [filteredBookings]);

   // --- Accounts Aging Report ---
   const agingReport = useMemo(() => {
      const buckets = { current: 0, days1to15: 0, days16to30: 0, over30: 0 };
      const now = new Date().getTime();

      filteredBookings.forEach(b => {
         if (b.payment === 'Unpaid' || b.payment === 'Deposit') {
            const remaining = Math.max(0, (Number(b.amount) || 0) - getNetPaid(b));
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

   // --- Lost Lead Analysis ---
   const lostLeadAnalysis = useMemo(() => {
      const all = filteredLeads || [];
      const byStatus = ['New', 'Warm', 'Hot', 'Cold', 'Lost', 'Offer Sent', 'Converted'].reduce((acc, s) => {
         acc[s] = all.filter(l => l.status === s).length; return acc;
      }, {} as Record<string, number>);
      return { byStatus, total: all.length };
   }, [filteredLeads]);

   // --- Follow-Up Effectiveness ---
   const followUpEffect = useMemo(() => {
      const fuLeadIds = new Set((filteredFollowUps || []).map(f => f.leadId));
      const all = filteredLeads || [];
      const organicLeads = all.filter(l => {
         if (l.status !== 'Converted') return true;
         return (l.logs || []).length > 1;
      });

      const wFU = organicLeads.filter(l => fuLeadIds.has(l.id));
      const woFU = organicLeads.filter(l => !fuLeadIds.has(l.id));

      const MIN_SAMPLE = 3;
      const rWith = wFU.length >= MIN_SAMPLE
         ? Math.round(wFU.filter(l => l.status === 'Converted').length / wFU.length * 100)
         : null;
      const rWithout = woFU.length >= MIN_SAMPLE
         ? Math.round(woFU.filter(l => l.status === 'Converted').length / woFU.length * 100)
         : null;

      return {
         rWith, rWithout,
         wFUCount: wFU.length,
         woFUCount: woFU.length,
         retroactiveCount: all.length - organicLeads.length,
      };
   }, [filteredLeads, filteredFollowUps]);

   // --- Inquiry → Quote Ratio ---
   const inquiryToQuote = useMemo(() => {
      const total = (filteredLeads || []).length;
      const withQuote = (filteredLeads || []).filter(l =>
         l.status === 'Offer Sent' ||
         (l.logs || []).some((log: any) =>
            log.content?.toLowerCase().match(/quote|proposal|offer sent|price sent|itinerary sent/)
         )
      ).length;
      return { total, withQuote, ratio: total > 0 ? Math.round((withQuote / total) * 100) : 0 };
   }, [filteredLeads]);

   // --- Average Lead-to-Booking Time ---
   const averageConversionTimeDays = useMemo(() => {
      let totalDays = 0;
      let convertedCount = 0;

      (filteredLeads || []).forEach(l => {
         if (l.status === 'Converted' && l.addedOn) {
            const logs = (l.logs || []);
            const targetLog = logs.find((log: any) =>
               log.type === 'System' && (
                  log.content?.toLowerCase().includes('converted') ||
                  log.content?.toLowerCase().includes('booking created') ||
                  log.content?.toLowerCase().includes('status changed')
               )
            ) || (logs.length > 0 ? logs[logs.length - 1] : null);

            if (!targetLog) return;
            const start = new Date(l.addedOn).getTime();
            const end = new Date(targetLog.timestamp).getTime();
            const days = Math.round(Math.abs(end - start) / (1000 * 3600 * 24));
            if (days <= 365) {
               totalDays += Math.max(days, 1);
               convertedCount++;
            }
         }
      });

      if (convertedCount === 0) return null;
      const avg = totalDays / convertedCount;
      return avg > 1.5 ? Math.round(avg) : null;
   }, [filteredLeads]);

   // --- Customer Lifetime Value ---
   const clvData = useMemo(() => {
      const cList = customers || [];
      const spentByEmail = new Map<string, number>();

      (bookings || []).forEach(b => {
         if (b.status === 'Cancelled') return;
         const email = ((b as any).email || '').toLowerCase();
         if (!email) return;
         spentByEmail.set(email, (spentByEmail.get(email) || 0) + (Number(b.amount) || 0));
      });

      const enriched = cList.map(c => ({
         ...c,
         computedSpent: spentByEmail.get((c.email || '').toLowerCase()) ?? (c.totalSpent || 0)
      }));

      const buyingCustomers = enriched.filter(c => c.computedSpent > 0);
      const avgCLV = buyingCustomers.length > 0
         ? Math.round(buyingCustomers.reduce((s, c) => s + c.computedSpent, 0) / buyingCustomers.length)
         : 0;
      const top5 = [...enriched]
         .sort((a, b) => b.computedSpent - a.computedSpent)
         .slice(0, 5);

      return { avgCLV, top5, total: cList.length, buyersCount: buyingCustomers.length };
   }, [customers, bookings]);

   // --- Cancellation Patterns ---
   const cancellationData = useMemo(() => {
      const allBookings = bookings.filter(b => isWithinRange(b.date));
      const cancelled = allBookings.filter(b => b.status === 'Cancelled');
      const refundTotal = allBookings.reduce((s, b) =>
         s + (b.transactions || []).filter(t => t.type === 'Refund' && t.status === 'Verified').reduce((rs, t) => rs + (Number(t.amount) || 0), 0), 0);
      const rate = allBookings.length > 0 ? Math.round((cancelled.length / allBookings.length) * 100) : 0;
      return { count: cancelled.length, total: allBookings.length, rate, refundTotal };
   }, [bookings, isWithinRange]);

   // --- Payment Collection Lag ---
   const paymentLag = useMemo(() => {
      let total = 0, count = 0;
      filteredBookings.forEach(b => {
         const fp = (b.transactions || []).filter(t => t.type === 'Payment' && (t.status === 'Verified' || !t.status))
            .sort((a, x) => new Date(a.date).getTime() - new Date(x.date).getTime())[0];
         if (fp && b.date) {
            const d = Math.round((new Date(fp.date).getTime() - new Date(b.date).getTime()) / 86400000);
            if (d >= 0 && d < 365) { total += d; count++; }
         }
      });
      return count > 0 ? Math.round(total / count) : 0;
   }, [filteredBookings]);

   // --- Group Size Distribution ---
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

   // --- Upsell & Add-On Revenue ---
   const upsellData = useMemo(() => {
      const m: Record<string, number> = {};
      filteredBookings.forEach(b => {
         (b.supplierBookings || []).forEach(sb => {
            const k = sb.serviceType || 'Other';
            m[k] = (m[k] || 0) + (Number(sb.cost) || 0);
         });
      });
      const t = Object.values(m).reduce((s, v) => s + v, 0);
      return Object.entries(m)
         .map(([type, amount]) => ({ type, amount, pct: t > 0 ? Math.round((amount / t) * 100) : 0 }))
         .sort((a, b) => b.amount - a.amount);
   }, [filteredBookings]);

   // --- Geographic Origin ---
   const geoData = useMemo(() => {
      const emailToCity = new Map<string, string>();
      (customers || []).forEach(c => {
         if (c.email) emailToCity.set(c.email.toLowerCase(), c.location || 'Unknown');
      });

      const m: Record<string, number> = {};
      filteredBookings.forEach(b => {
         const email = (b.email || '').toLowerCase();
         const city = emailToCity.get(email) || 'Unknown';
         m[city] = (m[city] || 0) + 1;
      });

      const total = filteredBookings.length;
      return Object.entries(m)
         .map(([city, count]) => ({ city, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }))
         .sort((a, b) => b.count - a.count).slice(0, 7);
   }, [filteredBookings, customers]);

   // --- Staff Response Time ---
   const staffResponseTime = useMemo(() => {
      const m = new Map<string, { name: string; initials: string; color: string; total: number; count: number }>();
      (filteredLeads || []).forEach(l => {
         if (!l.assignedTo || !l.addedOn || !(l.logs?.length)) return;
         const fl = [...l.logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0];
         if (!fl) return;
         const hrs = (new Date(fl.timestamp).getTime() - new Date(l.addedOn).getTime()) / 3600000;
         if (hrs < 0 || hrs > 72) return;
         const st = getStaffMeta(l.assignedTo);
         const e = m.get(st.id) || { name: st.name, initials: st.initials, color: st.color, total: 0, count: 0 };
         e.total += hrs; e.count++;
         m.set(st.id, e);
      });
      return Array.from(m.values())
         .map(s => ({ ...s, avg: s.count > 0 ? +(s.total / s.count).toFixed(1) : 0 }))
         .sort((a, b) => a.avg - b.avg);
   }, [filteredLeads, getStaffMeta]);

   // --- Destination Trend (Quarterly) ---
   const destTrend = useMemo(() => {
      const qMap: Record<string, Record<string, number>> = { Q1: {}, Q2: {}, Q3: {}, Q4: {} };
      (filteredLeads || []).forEach(l => {
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
   }, [filteredLeads]);

   // Currency Formatter
   const fmt = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
   const fmtShort = (n: number) => {
      if (!n || isNaN(n)) return '₹0';
      const abs = Math.round(Math.abs(n));
      const sign = n < 0 ? '-' : '';
      if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(1)}Cr`;
      if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)}L`;
      if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(0)}K`;
      return `${sign}₹${abs.toLocaleString('en-IN')}`;
   };

   // Export filtered bookings CSV
   const handleExport = () => {
      const rows = filteredBookings.map(b => {
         const verified = getNetPaid(b);
         const cost = (b.supplierBookings || []).reduce((s: number, sb: any) => s + (Number(sb.cost) || 0), 0);
         const st = getStaffMeta(b.assignedTo);
         return {
            'Booking ID': b.id,
            'Customer': b.customer,
            'Assigned Agent': st.name,
            'Package': b.title,
            'Date': b.date,
            'Invoiced Amount (INR)': Number(b.amount) || 0,
            'Verified Revenue (INR)': verified,
            'Supplier Cost (INR)': cost,
            'Gross Profit (INR)': (Number(b.amount) || 0) - cost,
            'Margin %': (Number(b.amount) || 0) > 0 ? (((Number(b.amount) || 0) - cost) / (Number(b.amount) || 0) * 100).toFixed(1) : '0',
            'Booking Status': b.status,
            'Payment Status': b.payment,
         };
      });

      if (rows.length === 0) { toast.info('No bookings to export for the selected period.'); return; }

      const headers = Object.keys(rows[0]);
      const csvContent = [
         headers.join(','),
         ...rows.map(row => headers.map(h => `"${(row as any)[h] ?? ''}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shrawello-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rows.length} bookings to CSV`);
   };

   // Export 12-Month CSV according to active subview
   const handleExport12MonthCSV = () => {
      if (twelveMonthMode === 'sources') {
         const headers = [
            'Lead Source',
            'Total Inquiries',
            'Total Won',
            'Win Rate %',
            'Total Won Revenue (INR)',
            ...twelveMonths.map(m => `${m.label} Leads`),
            ...twelveMonths.map(m => `${m.label} Won`),
            ...twelveMonths.map(m => `${m.label} Won Revenue (INR)`),
         ];
         const rows = twelveMonthLeadSources.map(s => [
            `"${s.source}"`,
            s.totalLeads,
            s.totalConverted,
            `${s.overallWinRate}%`,
            Math.round(s.totalWonRevenue),
            ...twelveMonths.map(m => s.monthly[m.key]?.totalLeads || 0),
            ...twelveMonths.map(m => s.monthly[m.key]?.converted || 0),
            ...twelveMonths.map(m => Math.round(s.monthly[m.key]?.wonRevenue || 0)),
         ].join(','));
         const csv = [headers.join(','), ...rows].join('\n');
         const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = `shrawello-12month-lead-sources-${new Date().toISOString().split('T')[0]}.csv`;
         a.click();
         URL.revokeObjectURL(url);
         toast.success('Exported 12-month lead sources journey to CSV');
         return;
      }

      if (twelveMonthMode === 'pnl') {
         const headers = ['Month', 'Trips Count', 'Invoiced Billed (INR)', 'Cash Collected (INR)', 'Vendor COGS (INR)', 'Office OPEX (INR)', 'Net Profit (INR)', 'Net Margin %'];
         const rows = twelveMonthPnlStream.map(m => [
            `"${m.label}"`,
            m.count,
            Math.round(m.invoiced),
            Math.round(m.cashCollected),
            Math.round(m.cogs),
            Math.round(m.opex),
            Math.round(m.netProfit),
            `${m.marginPct.toFixed(1)}%`
         ].join(','));
         const csv = [headers.join(','), ...rows].join('\n');
         const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = `shrawello-12month-pnl-stream-${new Date().toISOString().split('T')[0]}.csv`;
         a.click();
         URL.revokeObjectURL(url);
         toast.success('Exported 12-month P&L stream to CSV');
         return;
      }

      const headers = [
         'Staff Member',
         'Role',
         'Total Bookings',
         'Total Invoiced (INR)',
         'Total Cash Collected (INR)',
         'Total Net Profit (INR)',
         ...twelveMonths.map(m => `${m.label} Bookings`),
         ...twelveMonths.map(m => `${m.label} Invoiced (INR)`),
      ];

      const rows = twelveMonthAgentData.map(a => {
         return [
            `"${a.meta.name}"`,
            `"${a.meta.role}"`,
            a.totalCount,
            Math.round(a.totalInvoiced),
            Math.round(a.totalCashCollected),
            Math.round(a.totalProfit),
            ...twelveMonths.map(m => a.monthly[m.key]?.count || 0),
            ...twelveMonths.map(m => Math.round(a.monthly[m.key]?.invoiced || 0)),
         ].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shrawello-12month-agent-matrix-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported 12-month team matrix to CSV`);
   };

   return (
      <div className="flex flex-col h-full admin-page-bg">
         {/* ── Top Header ── */}
         <div className="bg-white dark:bg-[#1A2633] border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10">
            <div>
               <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart className="text-primary" /> Analytics & Intelligence
               </h2>
               <p className="text-slate-500 dark:text-slate-400 text-sm">
                  Reconciled Financial Ledger, 12-Month Agent Performance, and Lead ROI
               </p>
            </div>
            <div className="flex items-center gap-3">
               <button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm ${
                     isSyncing 
                     ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                     : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  }`}
               >
                  <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
                  {isSyncing ? 'Syncing...' : 'Sync Data'}
               </button>
               <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as any)}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg px-4 py-2.5 font-bold shadow-sm focus:ring-2 focus:ring-primary outline-none"
               >
                  <option value="all">All Time ({filteredBookings.length} Bookings)</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="thisMonth">This Month</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="thisYear">This Year</option>
               </select>
               <button onClick={handleExport} className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg text-sm px-4 py-2.5 shadow-lg active:scale-95 transition-all btn-glow">
                  <Download size={18} /> Export CSV
               </button>
            </div>
         </div>

         {/* ── Tab Navigation ── */}
         <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-[#1A2633] overflow-x-auto">
            {[
               { id: 'financial', label: 'Financial Reports', icon: <DollarSign size={15} /> },
               { id: 'months12', label: "12-Month Performance ('What Each Has Done')", icon: <Calendar size={15} />, badge: 'New' },
               { id: 'sales', label: 'Sales & Leads', icon: <Target size={15} /> },
               { id: 'team', label: 'Team Leaderboard', icon: <Users size={15} /> },
               { id: 'bi', label: 'Business Intelligence', icon: <Zap size={15} /> },
            ].map(tab => (
               <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                     activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
               >
                  {tab.icon} {tab.label}
                  {tab.badge && (
                     <span className="text-[10px] uppercase font-black tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">
                        {tab.badge}
                     </span>
                  )}
               </button>
            ))}
         </div>

         <div className="flex-1 overflow-y-auto p-6 space-y-8">

            {/* ========================================================================= */}
            {/* ── TAB 1: FINANCIAL OVERVIEW ── */}
            {/* ========================================================================= */}
            {activeTab === 'financial' && <>
               {/* 5 Reconciled KPI Cards */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 stagger-cards">
                  {/* Card 1: Gross Invoiced */}
                  <div className="bg-white dark:bg-[#1A2633] p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Receipt size={56} className="text-indigo-500" />
                     </div>
                     <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Gross Invoiced</p>
                     <h3 className="text-3xl kpi-number text-slate-900 dark:text-white mt-2">{fmt(metrics.totalInvoiced)}</h3>
                     <p className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold mt-2 flex items-center gap-1">
                        <span className="bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded font-bold">Billed</span>
                        {filteredBookings.length} bookings total ({Math.round((metrics.bookingCashCollected / (metrics.totalInvoiced || 1)) * 100)}% collected)
                     </p>
                  </div>

                  {/* Card 2: Cash Collected */}
                  <div className="bg-white dark:bg-[#1A2633] p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp size={56} className="text-emerald-500" />
                     </div>
                     <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Verified Cash In</p>
                     <h3 className="text-3xl kpi-number text-emerald-600 dark:text-emerald-400 mt-2">{fmt(metrics.totalCashCollected)}</h3>
                     <p className="text-emerald-600 text-xs font-semibold mt-2 flex items-center gap-1">
                        <span className="bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded font-bold">Bank Ledger</span>
                        Trip Cash: {fmtShort(metrics.bookingCashCollected)}{metrics.unlinkedAmount > 0 ? ` (+${fmtShort(metrics.unlinkedAmount)} other credits)` : ''}
                     </p>
                  </div>

                  {/* Card 3: Pending Receivables (Clickable to open modal) */}
                  <div 
                     onClick={() => setShowReceivablesModal(true)}
                     className="bg-white dark:bg-[#1A2633] p-5 rounded-2xl shadow-sm border border-amber-200/80 dark:border-amber-900/40 relative overflow-hidden group cursor-pointer hover:border-amber-400 hover:shadow-md transition-all"
                  >
                     <div className="absolute top-0 right-0 p-3 opacity-15 group-hover:opacity-25 transition-opacity">
                        <AlertCircle size={56} className="text-amber-500" />
                     </div>
                     <div className="flex items-center justify-between">
                        <p className="text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                           Pending Receivables <ChevronRight size={14} />
                        </p>
                     </div>
                     <h3 className="text-3xl kpi-number text-amber-600 dark:text-amber-400 mt-2">{fmt(metrics.pendingCollections)}</h3>
                     <p className="text-amber-700 dark:text-amber-300 text-xs font-semibold mt-2 flex items-center gap-1">
                        <span className="bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded font-bold">Action Needed</span>
                        {metrics.pendingBookingsList.length} client{metrics.pendingBookingsList.length !== 1 ? 's' : ''} owe dues
                     </p>
                  </div>

                  {/* Card 4: Total Business Costs (COGS + OPEX) */}
                  <div className="bg-white dark:bg-[#1A2633] p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Building2 size={56} className="text-rose-500" />
                     </div>
                     <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Total Expenses</p>
                     <h3 className="text-3xl kpi-number text-rose-600 dark:text-rose-400 mt-2">{fmt(metrics.totalAllCosts)}</h3>
                     <p className="text-slate-500 text-xs font-semibold mt-2 flex items-center gap-1">
                        <span className="bg-rose-50 dark:bg-rose-900/30 text-rose-600 px-1.5 py-0.5 rounded font-bold">COGS+OPEX</span>
                        Vendors: {fmtShort(metrics.totalVendorCost)} · Office: {fmtShort(metrics.totalOpex)}
                     </p>
                  </div>

                  {/* Card 5: Net Profit Bottom Line */}
                  <div className="card-brand-gradient p-5 rounded-2xl shadow-lg shadow-primary/25 relative overflow-hidden text-white flex flex-col justify-between">
                     <div className="absolute top-0 right-0 p-3 opacity-20">
                        <DollarSign size={56} />
                     </div>
                     <div>
                        <p className="text-orange-100 text-xs font-bold uppercase tracking-wider">Operating Profit</p>
                        <h3 className="text-3xl kpi-number mt-2">{fmt(metrics.netOperatingProfit)}</h3>
                     </div>
                     <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/20">
                        <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold backdrop-blur-sm">
                           {metrics.netOperatingMarginPct.toFixed(1)}% Net Margin
                        </span>
                        <span className="text-[11px] text-orange-100 font-medium">
                           Trip Margin: {metrics.grossMarginPct.toFixed(0)}%
                        </span>
                     </div>
                  </div>
               </div>

               {/* Interactive Monthly Trend Chart */}
               <TrendChart pts={monthlyTrends} fmt={fmt} />

               {/* Outstanding Balance & Operating Expenses Grid */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Receivables & Payables Progress */}
                  <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                     <div className="flex items-center justify-between mb-6">
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 section-heading-accent">
                           <Calendar size={20} className="text-primary" /> Working Capital & Receivables
                        </h4>
                        <button 
                           onClick={() => setShowReceivablesModal(true)}
                           className="text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-lg transition-all"
                        >
                           View {metrics.pendingBookingsList.length} Client Due{metrics.pendingBookingsList.length !== 1 ? 's' : ''}
                        </button>
                     </div>

                     <div className="space-y-6">
                        {/* Receivables */}
                        <div>
                           <div className="flex justify-between items-end mb-2">
                              <div>
                                 <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Customer Dues Pending</span>
                                 <p className="text-xs text-slate-400 truncate max-w-sm">
                                    {metrics.pendingBookingsList.map(b => `${b.customer} (${fmtShort(b.outstanding)})`).join(', ') || 'No outstanding dues'}
                                 </p>
                              </div>
                              <span className="text-lg kpi-number text-amber-600">{fmt(metrics.pendingCollections)}</span>
                           </div>
                           <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                 className="h-full bg-amber-500 rounded-full progress-bar-animated"
                                 style={{ width: `${Math.min((metrics.pendingCollections / (metrics.totalInvoiced || 1)) * 100, 100)}%` }}
                              />
                           </div>
                           <p className="text-xs text-slate-400 mt-1 text-right font-medium">
                              {((metrics.pendingCollections / (metrics.totalInvoiced || 1)) * 100).toFixed(1)}% of total invoiced pending collection
                           </p>
                        </div>

                        {/* Payables */}
                        <div>
                           <div className="flex justify-between items-end mb-2">
                              <div>
                                 <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Vendor Payables Remaining</span>
                                 <p className="text-xs text-slate-400">Total vendor commitments unpaid</p>
                              </div>
                              <span className="text-lg kpi-number text-blue-500">{fmt(metrics.pendingPayables)}</span>
                           </div>
                           <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                 className="h-full bg-blue-500 rounded-full progress-bar-animated"
                                 style={{ width: `${Math.min((metrics.pendingPayables / (metrics.totalVendorCost || 1)) * 100, 100)}%` }}
                              />
                           </div>
                           <p className="text-xs text-slate-400 mt-1 text-right font-medium">
                              {((metrics.pendingPayables / (metrics.totalVendorCost || 1)) * 100).toFixed(1)}% of supplier costs unpaid
                           </p>
                        </div>
                     </div>
                  </div>

                  {/* Business Operating Expenses (OPEX) Breakdown */}
                  <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                     <div className="flex items-center justify-between mb-6">
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 section-heading-accent">
                           <PieChart size={20} className="text-primary" /> Office OPEX Breakdown
                        </h4>
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                           Total: {fmt(metrics.totalOpex)}
                        </span>
                     </div>

                     <div className="space-y-3.5">
                        {Object.entries(metrics.opexCategories)
                           .sort(([, a], [, b]) => Number(b) - Number(a))
                           .map(([cat, rawAmount], idx) => {
                              const amount = Number(rawAmount) || 0;
                              const pct = metrics.totalOpex > 0 ? (amount / metrics.totalOpex) * 100 : 0;
                              const colors = ['bg-indigo-500', 'bg-purple-500', 'bg-sky-500', 'bg-amber-500', 'bg-emerald-500', 'bg-pink-500'];
                              return (
                                 <div key={cat} className="group">
                                    <div className="flex justify-between items-center mb-1 text-sm">
                                       <span className="font-semibold text-slate-700 dark:text-slate-300">{cat}</span>
                                       <span className="font-bold text-slate-900 dark:text-white">{fmt(amount)} <span className="text-xs text-slate-400 font-normal">({pct.toFixed(0)}%)</span></span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                       <div
                                          className={`h-full rounded-full ${colors[idx % colors.length]}`}
                                          style={{ width: `${pct}%` }}
                                       />
                                    </div>
                                 </div>
                              );
                           })}
                        {Object.keys(metrics.opexCategories).length === 0 && (
                           <p className="text-slate-400 text-sm italic text-center py-8">No operating expenses recorded for this period.</p>
                        )}
                     </div>
                  </div>
               </div>

               {/* Trip Profitability Table */}
               <div className="bg-white dark:bg-[#1A2633] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                     <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 section-heading-accent">
                        <Filter size={20} className="text-primary" /> Trip Profitability Ledger
                     </h4>
                     <span className="text-xs font-semibold text-slate-500">
                        Showing {filteredBookings.length} trips
                     </span>
                  </div>
                  <div className="overflow-x-auto max-h-[420px]">
                     <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
                           <tr>
                              <th className="px-6 py-3.5 font-bold text-slate-500 uppercase text-xs">Customer</th>
                              <th className="px-6 py-3.5 font-bold text-slate-500 uppercase text-xs">Agent</th>
                              <th className="px-6 py-3.5 font-bold text-slate-500 uppercase text-xs">Trip</th>
                              <th className="px-6 py-3.5 font-bold text-slate-500 uppercase text-xs text-right">Invoiced</th>
                              <th className="px-6 py-3.5 font-bold text-slate-500 uppercase text-xs text-right">Paid</th>
                              <th className="px-6 py-3.5 font-bold text-slate-500 uppercase text-xs text-right">COGS</th>
                              <th className="px-6 py-3.5 font-bold text-slate-500 uppercase text-xs text-right">Profit</th>
                              <th className="px-6 py-3.5 font-bold text-slate-500 uppercase text-xs text-right">Margin</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                           {filteredBookings.map(booking => {
                              const inv = Number(booking.amount) || 0;
                              const paid = getNetPaid(booking);
                              const cost = (booking.supplierBookings || []).reduce((sum: number, sb: any) => sum + (Number(sb.cost) || 0), 0);
                              const profit = inv - cost;
                              const margin = inv > 0 ? (profit / inv) * 100 : 0;
                              const st = getStaffMeta(booking.assignedTo);

                              return (
                                 <tr key={booking.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-white">
                                       {booking.customer}
                                       {booking.bookingNumber && <span className="block text-[11px] font-normal text-slate-400">{booking.bookingNumber}</span>}
                                    </td>
                                    <td className="px-6 py-3.5">
                                       <span className="inline-flex items-center gap-1.5 font-medium text-xs text-slate-700 dark:text-slate-300">
                                          <span className="w-2 h-2 rounded-full bg-primary"></span> {st.name}
                                       </span>
                                    </td>
                                    <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400 max-w-[200px] truncate">{booking.title}</td>
                                    <td className="px-6 py-3.5 text-right font-bold text-slate-900 dark:text-white">{fmt(inv)}</td>
                                    <td className="px-6 py-3.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">{fmt(paid)}</td>
                                    <td className="px-6 py-3.5 text-right font-medium text-rose-500">{fmt(cost)}</td>
                                    <td className={`px-6 py-3.5 text-right font-bold ${profit >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-600'}`}>
                                       {fmt(profit)}
                                    </td>
                                    <td className="px-6 py-3.5 text-right">
                                       <span className={`px-2 py-0.5 rounded text-xs font-bold ${margin >= 15 ? 'bg-emerald-100 text-emerald-700' : margin >= 5 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
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

               {/* Agent Leaderboard & Lead Source ROI */}
               <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {/* Agent Leaderboard */}
                  <div className="bg-white dark:bg-[#1A2633] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col h-full">
                     <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 section-heading-accent">
                           <Award size={20} className="text-primary" /> Top Performing Staff
                        </h4>
                        <button
                           onClick={() => setActiveTab('months12')}
                           className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                        >
                           View 12-Month Matrix <ChevronRight size={14} />
                        </button>
                     </div>
                     <div className="p-0 overflow-x-auto flex-1">
                        <table className="w-full text-left text-sm">
                           <thead className="bg-slate-50 dark:bg-slate-900/50">
                              <tr>
                                 <th className="px-6 py-3.5 font-bold text-slate-500 uppercase text-xs">Agent</th>
                                 <th className="px-6 py-3.5 font-bold text-slate-500 uppercase text-xs text-center">Bookings</th>
                                 <th className="px-6 py-3.5 font-bold text-slate-500 uppercase text-xs text-right">Invoiced</th>
                                 <th className="px-6 py-3.5 font-bold text-slate-500 uppercase text-xs text-right">Net Profit</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {agentPerformance.map((agent, i) => {
                                 const margin = agent.invoiced > 0 ? (agent.profit / agent.invoiced) * 100 : 0;
                                 return (
                                    <tr key={agent.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                       <td className="px-6 py-3.5">
                                          <div className="flex items-center gap-3">
                                             <div className="size-8 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-xs shadow-sm">
                                                {agent.initials}
                                             </div>
                                             <span className="font-bold text-slate-900 dark:text-white">{agent.name}</span>
                                          </div>
                                       </td>
                                       <td className="px-6 py-3.5 text-center font-bold text-slate-700 dark:text-slate-300">
                                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-xs font-bold">
                                             {agent.bookings}
                                          </span>
                                       </td>
                                       <td className="px-6 py-3.5 text-right font-medium text-slate-900 dark:text-white">{fmtShort(agent.invoiced)}</td>
                                       <td className="px-6 py-3.5 text-right">
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

                  {/* Lead Source ROI & Aging Report */}
                  <div className="flex flex-col gap-8">
                     <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col h-full">
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 section-heading-accent">
                           <LinkIcon size={20} className="text-primary" /> Lead Source Revenue & Conversion
                        </h4>
                        <div className="space-y-4 flex-1">
                           {leadSourceROI.map((src, i) => (
                              <div key={i} className="flex flex-col gap-1 border-b border-slate-100 dark:border-slate-800 last:border-0 pb-3 last:pb-0">
                                 <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                       <span className="text-sm font-bold text-slate-900 dark:text-white">{src.source}</span>
                                       <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-1.5 py-0.5 rounded">{src.rate}% Conv.</span>
                                    </div>
                                    <span className="kpi-number font-bold text-indigo-600 dark:text-indigo-400">{fmtShort(src.revenueFromConverted)}</span>
                                 </div>
                                 <div className="text-xs text-slate-500 font-medium">
                                    {src.converted} won / {src.totalLeads} total inquiries
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>

                     {/* Receivables Aging */}
                     <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col">
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 section-heading-accent">
                           <Clock size={20} className="text-primary" /> Receivables Aging
                        </h4>
                        <div className="grid grid-cols-4 gap-2 text-center items-end h-20 mb-2">
                           {[
                              { label: '< 7 Days', val: agingReport.current, color: 'bg-emerald-400' },
                              { label: '7 - 15', val: agingReport.days1to15, color: 'bg-amber-400' },
                              { label: '16 - 30', val: agingReport.days16to30, color: 'bg-orange-500' },
                              { label: '> 30 Days', val: agingReport.over30, color: 'bg-rose-600' }
                           ].map((b, i) => {
                              const height = Math.max((b.val / (metrics.pendingCollections || 1)) * 100, 12);
                              return (
                                 <div key={i} className="flex flex-col items-center justify-end h-full">
                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">{b.val > 0 ? fmtShort(b.val) : '-'}</span>
                                    <div className={`w-full max-w-[40px] rounded-t-sm ${b.color} transition-all opacity-90 hover:opacity-100`} style={{ height: `${height}%` }}></div>
                                 </div>
                              );
                           })}
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-center border-t border-slate-100 dark:border-slate-800 pt-2">
                           <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">&lt; 7 Days</div>
                           <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">7 - 15D</div>
                           <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">16 - 30D</div>
                           <div className="text-[10px] font-bold uppercase text-slate-400 font-mono">&gt; 30 Days</div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Most Profitable Packages */}
               <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 section-heading-accent">
                     <MapIcon size={20} className="text-primary" /> Most Profitable Tour Packages
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {destProfitability.map((dest, i) => (
                        <div key={i} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                           <div className="flex items-center gap-3">
                              <div className="size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-black flex items-center justify-center text-xs">
                                 #{i + 1}
                              </div>
                              <div>
                                 <p className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{dest.name}</p>
                                 <p className="text-xs font-medium text-slate-500">{dest.count} bookings</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="kpi-number font-bold text-sm text-emerald-600 dark:text-emerald-400">{fmtShort(dest.profit)}</p>
                              <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-[10px] font-bold rounded uppercase tracking-widest text-slate-600 dark:text-slate-300">
                                 {dest.margin}% Mgn
                              </span>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </>}

            {/* ========================================================================= */}
            {/* ── TAB 2: 12-MONTH PERFORMANCE ("WHAT EACH HAS DONE") ── */}
            {/* ========================================================================= */}
            {activeTab === 'months12' && <>
               {/* Header Banner & Sub-View Switcher */}
               <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                     <div>
                        <div className="flex items-center gap-2">
                           <div className="p-2 rounded-xl bg-primary/10 text-primary font-bold">
                              <Users size={22} />
                           </div>
                           <div>
                              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                 12-Month Performance ("What Each Has Done")
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                 Rolling Month-to-Month Team Member Output, Invoiced Sales, and Monthly P&L Ledger
                              </p>
                           </div>
                        </div>
                     </div>

                     <div className="flex flex-wrap items-center gap-3">
                        {/* Sub-view switcher */}
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                           <button
                              onClick={() => setTwelveMonthMode('matrix')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                 twelveMonthMode === 'matrix'
                                    ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                           >
                              👥 Agent Output Matrix
                           </button>
                           <button
                              onClick={() => setTwelveMonthMode('pnl')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                 twelveMonthMode === 'pnl'
                                    ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                           >
                              📊 Monthly P&L Stream
                           </button>
                           <button
                              onClick={() => setTwelveMonthMode('sources')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                 twelveMonthMode === 'sources'
                                    ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                           >
                              🎯 Lead Sources Journey
                           </button>
                           <button
                              onClick={() => setTwelveMonthMode('seasonality')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                 twelveMonthMode === 'seasonality'
                                    ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                           >
                              🗺️ Top Destinations
                           </button>
                        </div>

                        <button
                           onClick={handleExport12MonthCSV}
                           className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold shadow-sm transition-all"
                        >
                           <FileSpreadsheet size={15} /> Export 12M {twelveMonthMode === 'sources' ? 'Sources' : twelveMonthMode === 'pnl' ? 'P&L' : 'Matrix'} CSV
                        </button>
                     </div>
                  </div>

                  {/* High-Level Team Summary KPI Badges */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                     <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Top Invoiced Producer</span>
                        <div className="text-base font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                           <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                           {twelveMonthAgentData[0]?.meta.name || 'Rohit Sankpal'}
                        </div>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                           {fmt(twelveMonthAgentData[0]?.totalInvoiced || 0)} ({twelveMonthAgentData[0]?.totalCount || 0} trips)
                        </p>
                     </div>

                     <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Top Volume Closer</span>
                        <div className="text-base font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                           <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                           {twelveMonthAgentData[1]?.meta.name || 'Manali Sankpal'}
                        </div>
                        <p className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                           {twelveMonthAgentData[1]?.totalCount || 0} bookings · {fmtShort(twelveMonthAgentData[1]?.totalInvoiced || 0)}
                        </p>
                     </div>

                     <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Highest Ticket Size</span>
                        <div className="text-base font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                           <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                           Vaishnavi Vernekar
                        </div>
                        <p className="text-xs font-bold text-sky-600 dark:text-sky-400 mt-0.5">
                           ~₹29,850 avg / trip (6 trips)
                        </p>
                     </div>

                     <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Team Bookings</span>
                        <div className="text-base font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                           <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                           {bookings.length} Bookings Reconciled
                        </div>
                        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                           Across 12 Calendar Months
                        </p>
                     </div>
                  </div>
               </div>

               {/* SUB-VIEW 1: AGENT OUTPUT MATRIX */}
               {twelveMonthMode === 'matrix' && (
                  <div className="space-y-6">
                     {/* Full Cross-Tabulation Matrix Table */}
                     <div className="bg-white dark:bg-[#1A2633] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                           <div>
                              <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 section-heading-accent">
                                 <Users size={20} className="text-primary" /> Month-by-Month Output Cross-Matrix
                              </h4>
                              <p className="text-xs text-slate-400 mt-0.5">
                                 Click on any agent row or cell to view the exact bookings created in that period
                              </p>
                           </div>
                           {(selectedAgentDrilldown || selectedMonthDrilldown) && (
                              <button
                                 onClick={() => { setSelectedAgentDrilldown(null); setSelectedMonthDrilldown(null); }}
                                 className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-3 py-1.5 rounded-lg hover:bg-rose-100 transition-all flex items-center gap-1.5"
                              >
                                 <X size={13} /> Clear Drilldown Filter
                              </button>
                           )}
                        </div>

                        <div className="overflow-x-auto">
                           <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
                                 <tr>
                                    <th className="px-5 py-3.5 font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-slate-900/90 z-10 min-w-[180px]">
                                       Team Member
                                    </th>
                                    {twelveMonths.map(m => (
                                       <th 
                                          key={m.key} 
                                          onClick={() => setSelectedMonthDrilldown(selectedMonthDrilldown === m.key ? null : m.key)}
                                          className={`px-3 py-3.5 text-center font-bold uppercase cursor-pointer transition-colors ${
                                             selectedMonthDrilldown === m.key 
                                                ? 'bg-primary/20 text-primary font-black' 
                                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                          }`}
                                       >
                                          {m.label}
                                       </th>
                                    ))}
                                    <th className="px-4 py-3.5 text-center font-black text-slate-800 dark:text-slate-100 uppercase bg-slate-100/80 dark:bg-slate-800/80">Total Trips</th>
                                    <th className="px-4 py-3.5 text-right font-black text-slate-800 dark:text-slate-100 uppercase bg-slate-100/80 dark:bg-slate-800/80">Total Invoiced</th>
                                    <th className="px-4 py-3.5 text-right font-black text-emerald-600 dark:text-emerald-400 uppercase bg-slate-100/80 dark:bg-slate-800/80">Net Profit</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                 {twelveMonthAgentData.map(agent => {
                                    const isSelected = selectedAgentDrilldown === agent.agentId;
                                    return (
                                       <tr 
                                          key={agent.agentId} 
                                          className={`transition-colors cursor-pointer ${
                                             isSelected 
                                                ? 'bg-primary/5 dark:bg-primary/10' 
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                          }`}
                                       >
                                          <td 
                                             onClick={() => setSelectedAgentDrilldown(isSelected ? null : agent.agentId)}
                                             className="px-5 py-4 sticky left-0 bg-white dark:bg-[#1A2633] z-10 font-bold text-slate-900 dark:text-white"
                                          >
                                             <div className="flex items-center gap-2.5">
                                                <div className="size-7 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-xs">
                                                   {agent.meta.initials}
                                                </div>
                                                <div>
                                                   <p className="text-xs font-bold leading-tight">{agent.meta.name}</p>
                                                   <span className="text-[10px] text-slate-400 font-medium">{agent.meta.role}</span>
                                                </div>
                                             </div>
                                          </td>

                                          {twelveMonths.map(m => {
                                             const monthStat = agent.monthly[m.key] || { count: 0, invoiced: 0, profit: 0 };
                                             const isCellSelected = selectedAgentDrilldown === agent.agentId && selectedMonthDrilldown === m.key;
                                             return (
                                                <td 
                                                   key={m.key} 
                                                   onClick={() => {
                                                      setSelectedAgentDrilldown(agent.agentId);
                                                      setSelectedMonthDrilldown(m.key);
                                                   }}
                                                   className={`px-3 py-4 text-center transition-all ${
                                                      isCellSelected 
                                                         ? 'bg-primary/20 ring-2 ring-primary rounded-lg font-black' 
                                                         : monthStat.count > 0 
                                                            ? 'hover:bg-slate-100 dark:hover:bg-slate-800' 
                                                            : ''
                                                   }`}
                                                >
                                                   {monthStat.count > 0 ? (
                                                      <div>
                                                         <span className="inline-block px-1.5 py-0.5 bg-primary/10 text-primary rounded font-bold text-[11px]">
                                                            {monthStat.count} trip{monthStat.count !== 1 ? 's' : ''}
                                                         </span>
                                                         <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                                                            {fmtShort(monthStat.invoiced)}
                                                         </p>
                                                      </div>
                                                   ) : (
                                                      <span className="text-slate-300 dark:text-slate-600 font-light">—</span>
                                                   )}
                                                </td>
                                             );
                                          })}

                                          <td className="px-4 py-4 text-center font-black text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-900/30">
                                             {agent.totalCount}
                                          </td>
                                          <td className="px-4 py-4 text-right font-black text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-900/30">
                                             {fmtShort(agent.totalInvoiced)}
                                          </td>
                                          <td className="px-4 py-4 text-right font-black text-emerald-600 dark:text-emerald-400 bg-slate-50/50 dark:bg-slate-900/30">
                                             {fmtShort(agent.totalProfit)}
                                          </td>
                                       </tr>
                                    );
                                 })}
                              </tbody>
                              <tfoot className="bg-slate-100/90 dark:bg-slate-900 font-black border-t-2 border-slate-300 dark:border-slate-700">
                                 <tr>
                                    <td className="px-5 py-3.5 sticky left-0 bg-slate-100 dark:bg-slate-900 z-10 text-slate-900 dark:text-white uppercase">
                                       Total Across Team
                                    </td>
                                    {twelveMonths.map(m => {
                                       const totalCountInMo = twelveMonthAgentData.reduce((s, a) => s + (a.monthly[m.key]?.count || 0), 0);
                                       const totalInvInMo = twelveMonthAgentData.reduce((s, a) => s + (a.monthly[m.key]?.invoiced || 0), 0);
                                       return (
                                          <td key={m.key} className="px-3 py-3.5 text-center">
                                             {totalCountInMo > 0 ? (
                                                <div>
                                                   <span className="text-xs font-black text-slate-900 dark:text-white">{totalCountInMo}</span>
                                                   <p className="text-[10px] text-slate-500 font-bold">{fmtShort(totalInvInMo)}</p>
                                                </div>
                                             ) : <span className="text-slate-400 font-normal">—</span>}
                                          </td>
                                       );
                                    })}
                                    <td className="px-4 py-3.5 text-center text-slate-900 dark:text-white text-sm">
                                       {twelveMonthAgentData.reduce((s, a) => s + a.totalCount, 0)}
                                    </td>
                                    <td className="px-4 py-3.5 text-right text-slate-900 dark:text-white text-sm">
                                       {fmt(twelveMonthAgentData.reduce((s, a) => s + a.totalInvoiced, 0))}
                                    </td>
                                    <td className="px-4 py-3.5 text-right text-emerald-600 dark:text-emerald-400 text-sm">
                                       {fmt(twelveMonthAgentData.reduce((s, a) => s + a.totalProfit, 0))}
                                    </td>
                                 </tr>
                              </tfoot>
                           </table>
                        </div>
                     </div>

                     {/* Drill-down Detail Table when filtered */}
                     {(selectedAgentDrilldown || selectedMonthDrilldown) && (
                        <div className="bg-white dark:bg-[#1A2633] rounded-2xl shadow-md border-2 border-primary/40 overflow-hidden animate-in fade-in duration-200">
                           <div className="p-5 bg-primary/5 dark:bg-primary/10 border-b border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                 <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <CheckCircle2 size={18} className="text-primary" />
                                    Drill-down: {drilldownBookings.length} Trip{drilldownBookings.length !== 1 ? 's' : ''} for{' '}
                                    <span className="text-primary font-black">
                                       {selectedAgentDrilldown ? getStaffMeta(selectedAgentDrilldown).name : 'All Agents'}
                                    </span>
                                    {selectedMonthDrilldown && (
                                       <span className="text-slate-500 font-medium"> in {selectedMonthDrilldown}</span>
                                    )}
                                 </h4>
                              </div>
                              <div className="flex items-center gap-2">
                                 <button
                                    onClick={() => {
                                       const qs = new URLSearchParams();
                                       if (selectedAgentDrilldown && selectedAgentDrilldown !== 'unassigned') qs.set('assignedTo', selectedAgentDrilldown);
                                       if (selectedMonthDrilldown) qs.set('month', selectedMonthDrilldown);
                                       navigate(`/admin/bookings?${qs.toString()}`);
                                       toast.info(`Opening Bookings for ${selectedAgentDrilldown ? getStaffMeta(selectedAgentDrilldown).name : 'team'}`);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
                                 >
                                    <ExternalLink size={13} /> Open in Bookings Management
                                 </button>
                                 {selectedAgentDrilldown && selectedAgentDrilldown !== 'unassigned' && (
                                    <button
                                       onClick={() => {
                                          navigate(`/admin/leads?assignedTo=${encodeURIComponent(selectedAgentDrilldown)}`);
                                          toast.info(`Opening Leads for ${getStaffMeta(selectedAgentDrilldown).name}`);
                                       }}
                                       className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                    >
                                       <Target size={13} /> Open Leads
                                    </button>
                                 )}
                                 <button
                                    onClick={() => { setSelectedAgentDrilldown(null); setSelectedMonthDrilldown(null); }}
                                    className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 transition-all cursor-pointer"
                                 >
                                    Close Drilldown
                                 </button>
                              </div>
                           </div>

                           <div className="overflow-x-auto max-h-[360px]">
                              <table className="w-full text-left text-xs">
                                 <thead className="bg-slate-50 dark:bg-slate-900/60 sticky top-0">
                                    <tr>
                                       <th className="px-5 py-3 font-bold text-slate-500 uppercase">Customer</th>
                                       <th className="px-5 py-3 font-bold text-slate-500 uppercase">Package / Trip</th>
                                       <th className="px-5 py-3 font-bold text-slate-500 uppercase">Date</th>
                                       <th className="px-5 py-3 font-bold text-slate-500 uppercase text-right">Invoiced</th>
                                       <th className="px-5 py-3 font-bold text-slate-500 uppercase text-right">Paid</th>
                                       <th className="px-5 py-3 font-bold text-slate-500 uppercase text-right">COGS</th>
                                       <th className="px-5 py-3 font-bold text-slate-500 uppercase text-right">Profit</th>
                                       <th className="px-5 py-3 font-bold text-slate-500 uppercase text-center">Status</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {drilldownBookings.map(b => {
                                       const inv = Number(b.amount) || 0;
                                       const paid = getNetPaid(b);
                                       const cogs = (b.supplierBookings || []).reduce((sum: number, sb: any) => sum + (Number(sb.cost) || 0), 0);
                                       const profit = inv - cogs;
                                       return (
                                          <tr 
                                             key={b.id} 
                                             onClick={() => {
                                                navigate(`/admin/bookings?search=${encodeURIComponent(b.bookingNumber || b.customer)}`);
                                                toast.info(`Opening booking ${b.bookingNumber || b.customer}`);
                                             }}
                                             className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors cursor-pointer group"
                                             title="Click to view this booking in Bookings Management"
                                          >
                                             <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">
                                                <div className="flex items-center gap-1.5">
                                                   <span>{b.customer}</span>
                                                   <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                                                </div>
                                                {b.bookingNumber && <span className="block text-[10px] font-mono text-primary/80 font-semibold">{b.bookingNumber}</span>}
                                             </td>
                                             <td className="px-5 py-3 text-slate-600 dark:text-slate-400 max-w-[220px] truncate">{b.title}</td>
                                             <td className="px-5 py-3 font-medium text-slate-500">{b.date}</td>
                                             <td className="px-5 py-3 text-right font-bold text-slate-900 dark:text-white">{fmt(inv)}</td>
                                             <td className="px-5 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">{fmt(paid)}</td>
                                             <td className="px-5 py-3 text-right font-medium text-rose-500">{fmt(cogs)}</td>
                                             <td className="px-5 py-3 text-right font-bold text-indigo-600 dark:text-indigo-400">{fmt(profit)}</td>
                                             <td className="px-5 py-3 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                   b.payment === 'Paid' ? 'bg-emerald-100 text-emerald-700' : b.payment === 'Deposit' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                   {b.payment || 'Unpaid'}
                                                </span>
                                             </td>
                                          </tr>
                                       );
                                    })}
                                 </tbody>
                              </table>
                           </div>
                        </div>
                     )}
                  </div>
               )}

               {/* SUB-VIEW 2: MONTHLY P&L STREAM */}
               {twelveMonthMode === 'pnl' && (
                  <div className="bg-white dark:bg-[#1A2633] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                     <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                           <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 section-heading-accent">
                              <DollarSign size={20} className="text-primary" /> Month-by-Month Financial P&L Ledger
                           </h4>
                           <p className="text-xs text-slate-400 mt-0.5">
                              Invoiced Billed vs Verified Cash Collected vs Direct Trip COGS vs Office Overhead
                           </p>
                        </div>
                     </div>

                     <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                           <thead className="bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
                              <tr>
                                 <th className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200 uppercase">Month</th>
                                 <th className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200 uppercase text-center">Trips Booked</th>
                                 <th className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200 uppercase text-right">Invoiced (Billed)</th>
                                 <th className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400 uppercase text-right">Cash Collected</th>
                                 <th className="px-6 py-4 font-bold text-rose-500 uppercase text-right">Vendor COGS</th>
                                 <th className="px-6 py-4 font-bold text-purple-600 dark:text-purple-400 uppercase text-right">Office OPEX</th>
                                 <th className="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400 uppercase text-right">Net Profit</th>
                                 <th className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200 uppercase text-right">Net Margin</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {twelveMonthPnlStream.map(m => (
                                 <tr key={m.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{m.label}</td>
                                    <td className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-300">
                                       <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-md font-bold">
                                          {m.count}
                                       </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">{fmt(m.invoiced)}</td>
                                    <td className="px-6 py-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">{fmt(m.cashCollected)}</td>
                                    <td className="px-6 py-4 text-right font-medium text-rose-500">{fmt(m.cogs)}</td>
                                    <td className="px-6 py-4 text-right font-medium text-purple-600 dark:text-purple-400">{fmt(m.opex)}</td>
                                    <td className={`px-6 py-4 text-right font-black ${m.netProfit >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-500'}`}>
                                       {fmt(m.netProfit)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                       <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                          m.marginPct >= 15 ? 'bg-emerald-100 text-emerald-700' : m.marginPct >= 5 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                       }`}>
                                          {m.marginPct.toFixed(1)}%
                                       </span>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                           <tfoot className="bg-slate-100/90 dark:bg-slate-900 font-black border-t-2 border-slate-300 dark:border-slate-700">
                              <tr>
                                 <td className="px-6 py-4 text-slate-900 dark:text-white uppercase">Full 12-Month Total</td>
                                 <td className="px-6 py-4 text-center text-slate-900 dark:text-white">
                                    {twelveMonthPnlStream.reduce((s, m) => s + m.count, 0)}
                                 </td>
                                 <td className="px-6 py-4 text-right text-slate-900 dark:text-white">
                                    {fmt(twelveMonthPnlStream.reduce((s, m) => s + m.invoiced, 0))}
                                 </td>
                                 <td className="px-6 py-4 text-right text-emerald-600 dark:text-emerald-400">
                                    {fmt(twelveMonthPnlStream.reduce((s, m) => s + m.cashCollected, 0))}
                                 </td>
                                 <td className="px-6 py-4 text-right text-rose-500">
                                    {fmt(twelveMonthPnlStream.reduce((s, m) => s + m.cogs, 0))}
                                 </td>
                                 <td className="px-6 py-4 text-right text-purple-600 dark:text-purple-400">
                                    {fmt(twelveMonthPnlStream.reduce((s, m) => s + m.opex, 0))}
                                 </td>
                                 <td className="px-6 py-4 text-right text-indigo-600 dark:text-indigo-400 text-sm">
                                    {fmt(twelveMonthPnlStream.reduce((s, m) => s + m.netProfit, 0))}
                                 </td>
                                 <td className="px-6 py-4 text-right text-slate-900 dark:text-white">
                                    {(
                                       (twelveMonthPnlStream.reduce((s, m) => s + m.netProfit, 0) /
                                       (twelveMonthPnlStream.reduce((s, m) => s + m.invoiced, 0) || 1)) * 100
                                    ).toFixed(1)}%
                                 </td>
                              </tr>
                           </tfoot>
                        </table>
                     </div>
                  </div>
               )}

               {/* SUB-VIEW 3: DESTINATION SEASONALITY */}
               {twelveMonthMode === 'seasonality' && (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                     <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2 section-heading-accent">
                           <MapIcon size={18} className="text-primary" /> Most Booked Destinations (All 12 Months)
                        </h4>
                        <div className="space-y-4">
                           {destProfitability.map((dest, i) => (
                              <div key={i} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                                 <div className="flex items-center gap-3">
                                    <div className="size-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                                       #{i + 1}
                                    </div>
                                    <div>
                                       <p className="font-bold text-sm text-slate-900 dark:text-white">{dest.name}</p>
                                       <p className="text-xs text-slate-500">{dest.count} trips closed</p>
                                    </div>
                                 </div>
                                 <div className="text-right">
                                    <span className="font-bold text-slate-900 dark:text-white block">{fmt(dest.revenue)}</span>
                                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                       Profit: {fmt(dest.profit)} ({dest.margin}%)
                                    </span>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>

                     <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2 section-heading-accent">
                           <Activity size={18} className="text-primary" /> Destination Demand by Quarter
                        </h4>
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
                     </div>
                   </div>
                )}

                {/* SUB-VIEW 4: 12-MONTH LEAD SOURCES JOURNEY */}
                {twelveMonthMode === 'sources' && (
                   <div className="space-y-6 animate-in fade-in duration-150">
                      <div className="bg-white dark:bg-[#1A2633] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                         <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                               <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 section-heading-accent">
                                  <Target size={20} className="text-primary" /> Month-by-Month Lead Acquisition & Conversion Journey
                               </h4>
                               <p className="text-xs text-slate-400 mt-0.5">
                                  Track marketing channel inquiries, closed bookings, and conversion win rate month-by-month
                               </p>
                            </div>
                            {selectedSourceDrilldown && (
                               <button
                                  onClick={() => setSelectedSourceDrilldown(null)}
                                  className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-3 py-1.5 rounded-lg hover:bg-rose-100 transition-all flex items-center gap-1.5 cursor-pointer"
                               >
                                  <X size={13} /> Clear Channel Filter
                               </button>
                            )}
                         </div>

                         <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                               <thead className="bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
                                  <tr>
                                     <th className="px-5 py-3.5 font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-slate-900/90 z-10 min-w-[170px]">
                                        Lead Channel
                                     </th>
                                     {twelveMonths.map(m => (
                                        <th 
                                           key={m.key}
                                           className="px-3 py-3.5 text-center font-bold uppercase text-slate-500 dark:text-slate-400"
                                        >
                                           {m.label}
                                        </th>
                                     ))}
                                     <th className="px-4 py-3.5 text-center font-black text-slate-800 dark:text-slate-100 uppercase bg-slate-100/80 dark:bg-slate-800/80">Total Inquiries</th>
                                     <th className="px-4 py-3.5 text-center font-black text-slate-800 dark:text-slate-100 uppercase bg-slate-100/80 dark:bg-slate-800/80">Won Deals</th>
                                     <th className="px-4 py-3.5 text-center font-black text-indigo-600 dark:text-indigo-400 uppercase bg-slate-100/80 dark:bg-slate-800/80">Win Rate %</th>
                                     <th className="px-4 py-3.5 text-right font-black text-emerald-600 dark:text-emerald-400 uppercase bg-slate-100/80 dark:bg-slate-800/80">Won Revenue</th>
                                  </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {twelveMonthLeadSources.map(src => {
                                     const isSelected = selectedSourceDrilldown === src.source;
                                     return (
                                        <tr 
                                           key={src.source}
                                           onClick={() => setSelectedSourceDrilldown(isSelected ? null : src.source)}
                                           className={`transition-colors cursor-pointer ${
                                              isSelected ? 'bg-primary/5 dark:bg-primary/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                           }`}
                                           title="Click to view inquiries from this channel"
                                        >
                                           <td className="px-5 py-4 sticky left-0 bg-white dark:bg-[#1A2633] z-10 font-bold text-slate-900 dark:text-white">
                                              <div className="flex items-center gap-2">
                                                 <span className="w-2 h-2 rounded-full bg-primary"></span>
                                                 <span className="font-bold text-xs">{src.source}</span>
                                              </div>
                                           </td>
                                           {twelveMonths.map(m => {
                                              const monthData = src.monthly[m.key] || { totalLeads: 0, converted: 0, winRate: 0, wonRevenue: 0 };
                                              return (
                                                 <td key={m.key} className="px-3 py-4 text-center">
                                                    {monthData.totalLeads > 0 ? (
                                                       <div>
                                                          <span className="text-[11px] font-bold text-slate-900 dark:text-white">
                                                             {monthData.totalLeads} inq
                                                          </span>
                                                          {monthData.converted > 0 && (
                                                             <div className="mt-0.5">
                                                                <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                                                   {monthData.converted} won ({monthData.winRate}%)
                                                                </span>
                                                                <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                                                   {fmtShort(monthData.wonRevenue)}
                                                                </p>
                                                             </div>
                                                          )}
                                                       </div>
                                                    ) : (
                                                       <span className="text-slate-300 dark:text-slate-600 font-light">—</span>
                                                    )}
                                                 </td>
                                              );
                                           })}
                                           <td className="px-4 py-4 text-center font-bold text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-900/30">
                                              {src.totalLeads}
                                           </td>
                                           <td className="px-4 py-4 text-center font-bold text-emerald-600 dark:text-emerald-400 bg-slate-50/50 dark:bg-slate-900/30">
                                              {src.totalConverted}
                                           </td>
                                           <td className="px-4 py-4 text-center font-black text-indigo-600 dark:text-indigo-400 bg-slate-50/50 dark:bg-slate-900/30">
                                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                                 src.overallWinRate >= 40 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                                                 src.overallWinRate >= 20 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                                                 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                              }`}>
                                                 {src.overallWinRate}%
                                              </span>
                                           </td>
                                           <td className="px-4 py-4 text-right font-black text-emerald-600 dark:text-emerald-400 bg-slate-50/50 dark:bg-slate-900/30">
                                              {fmt(src.totalWonRevenue)}
                                           </td>
                                        </tr>
                                     );
                                  })}
                               </tbody>
                               <tfoot className="bg-slate-100/90 dark:bg-slate-900 font-black border-t-2 border-slate-300 dark:border-slate-700">
                                  <tr>
                                     <td className="px-5 py-3.5 sticky left-0 bg-slate-100 dark:bg-slate-900 z-10 text-slate-900 dark:text-white uppercase">
                                        Total Across Channels
                                     </td>
                                     {twelveMonths.map(m => {
                                        const moLeads = twelveMonthLeadSources.reduce((s, src) => s + (src.monthly[m.key]?.totalLeads || 0), 0);
                                        const moWon = twelveMonthLeadSources.reduce((s, src) => s + (src.monthly[m.key]?.converted || 0), 0);
                                        return (
                                           <td key={m.key} className="px-3 py-3.5 text-center">
                                              {moLeads > 0 ? (
                                                 <div>
                                                    <span className="text-xs font-black text-slate-900 dark:text-white">{moLeads}</span>
                                                    {moWon > 0 && (
                                                       <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                                          {moWon} won
                                                       </p>
                                                    )}
                                                 </div>
                                              ) : <span className="text-slate-400 font-normal">—</span>}
                                           </td>
                                        );
                                     })}
                                     <td className="px-4 py-3.5 text-center text-slate-900 dark:text-white text-sm">
                                        {twelveMonthLeadSources.reduce((s, src) => s + src.totalLeads, 0)}
                                     </td>
                                     <td className="px-4 py-3.5 text-center text-emerald-600 dark:text-emerald-400 text-sm">
                                        {twelveMonthLeadSources.reduce((s, src) => s + src.totalConverted, 0)}
                                     </td>
                                     <td className="px-4 py-3.5 text-center text-indigo-600 dark:text-indigo-400 text-sm">
                                        {(
                                           (twelveMonthLeadSources.reduce((s, src) => s + src.totalConverted, 0) /
                                           (twelveMonthLeadSources.reduce((s, src) => s + src.totalLeads, 0) || 1)) * 100
                                        ).toFixed(0)}%
                                     </td>
                                     <td className="px-4 py-3.5 text-right text-emerald-600 dark:text-emerald-400 text-sm">
                                        {fmt(twelveMonthLeadSources.reduce((s, src) => s + src.totalWonRevenue, 0))}
                                     </td>
                                  </tr>
                               </tfoot>
                            </table>
                         </div>
                      </div>

                      {/* Drilldown Leads Table when a Channel is selected */}
                      {selectedSourceDrilldown && (
                         <div className="bg-white dark:bg-[#1A2633] rounded-2xl shadow-md border-2 border-primary/40 overflow-hidden animate-in fade-in duration-200">
                            <div className="p-5 bg-primary/5 dark:bg-primary/10 border-b border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                               <div>
                                  <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                     <Target size={18} className="text-primary" />
                                     Channel Inquiries: {drilldownLeads.length} Lead{drilldownLeads.length !== 1 ? 's' : ''} from{' '}
                                     <span className="text-primary font-black">{selectedSourceDrilldown}</span>
                                  </h4>
                               </div>
                               <div className="flex items-center gap-2">
                                  <button
                                     onClick={() => {
                                        navigate(`/admin/leads?source=${encodeURIComponent(selectedSourceDrilldown)}`);
                                        toast.info(`Opening Leads filtered by ${selectedSourceDrilldown}`);
                                     }}
                                     className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
                                  >
                                     <ExternalLink size={13} /> Open in Leads Management
                                  </button>
                                  <button
                                     onClick={() => setSelectedSourceDrilldown(null)}
                                     className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 transition-all cursor-pointer"
                                  >
                                     Close
                                  </button>
                               </div>
                            </div>

                            <div className="overflow-x-auto max-h-[360px]">
                               <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-50 dark:bg-slate-900/60 sticky top-0">
                                     <tr>
                                        <th className="px-5 py-3 font-bold text-slate-500 uppercase">Lead Name</th>
                                        <th className="px-5 py-3 font-bold text-slate-500 uppercase">Contact</th>
                                        <th className="px-5 py-3 font-bold text-slate-500 uppercase">Destination</th>
                                        <th className="px-5 py-3 font-bold text-slate-500 uppercase">Assigned To</th>
                                        <th className="px-5 py-3 font-bold text-slate-500 uppercase text-center">Status</th>
                                        <th className="px-5 py-3 font-bold text-slate-500 uppercase">Date Added</th>
                                     </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                     {drilldownLeads.map(l => (
                                        <tr 
                                           key={l.id}
                                           onClick={() => {
                                              navigate(`/admin/leads?search=${encodeURIComponent(l.name || l.email || '')}`);
                                           }}
                                           className="hover:bg-primary/5 dark:hover:bg-primary/10 cursor-pointer transition-colors"
                                           title="Click to view lead"
                                        >
                                           <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">
                                              {l.name}
                                           </td>
                                           <td className="px-5 py-3 text-slate-500">
                                              {l.email && <div>{l.email}</div>}
                                              {l.phone && <div>📞 {l.phone}</div>}
                                           </td>
                                           <td className="px-5 py-3 text-slate-700 dark:text-slate-300 font-medium">{l.destination || '—'}</td>
                                           <td className="px-5 py-3 text-slate-600 dark:text-slate-400 font-semibold">{getStaffMeta(l.assignedTo).name}</td>
                                           <td className="px-5 py-3 text-center">
                                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                 l.status === 'Converted' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                                                 l.status === 'Lost' ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300' :
                                                 l.status === 'Hot' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' :
                                                 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                                              }`}>
                                                 {l.status}
                                              </span>
                                           </td>
                                           <td className="px-5 py-3 text-slate-400 font-mono text-[11px]">{l.addedOn?.split('T')[0] || '—'}</td>
                                        </tr>
                                     ))}
                                  </tbody>
                               </table>
                            </div>
                         </div>
                      )}
                   </div>
                )}
             </>}

            {/* ========================================================================= */}
            {/* ── TAB 3: SALES & LEADS ── */}
            {/* ========================================================================= */}
            {activeTab === 'sales' && <>
               {/* Pipeline Status Overview */}
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                     { label: 'New', val: lostLeadAnalysis.byStatus['New'] || 0, color: 'bg-blue-500', light: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
                     { label: 'Warm', val: lostLeadAnalysis.byStatus['Warm'] || 0, color: 'bg-amber-400', light: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
                     { label: 'Hot', val: lostLeadAnalysis.byStatus['Hot'] || 0, color: 'bg-orange-500', light: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
                     { label: 'Cold / Lost', val: (lostLeadAnalysis.byStatus['Cold'] || 0) + (lostLeadAnalysis.byStatus['Lost'] || 0), color: 'bg-slate-400', light: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
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
                              <span className={`kpi-number ${followUpEffect.rWith !== null ? 'text-emerald-600' : 'text-slate-400'}`}>
                                 {followUpEffect.rWith !== null ? `${followUpEffect.rWith}%` : '—'}
                              </span>
                           </div>
                           <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${followUpEffect.rWith ?? 0}%` }} />
                           </div>
                        </div>
                        <div>
                           <div className="flex justify-between text-sm mb-1">
                              <span className="font-bold text-slate-700 dark:text-slate-300">Without Follow-Up <span className="text-slate-400 font-normal">({followUpEffect.woFUCount} leads)</span></span>
                              <span className={`kpi-number ${followUpEffect.rWithout !== null ? 'text-red-500' : 'text-slate-400'}`}>
                                 {followUpEffect.rWithout !== null ? `${followUpEffect.rWithout}%` : '—'}
                              </span>
                           </div>
                           <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-red-400 rounded-full" style={{ width: `${followUpEffect.rWithout ?? 0}%` }} />
                           </div>
                        </div>
                        <p className="text-xs text-slate-400 italic pt-2 border-t border-slate-100 dark:border-slate-800">
                           {followUpEffect.rWith !== null && followUpEffect.rWithout !== null
                              ? followUpEffect.rWith > followUpEffect.rWithout
                                 ? `Follow-ups improve conversion by ${followUpEffect.rWith - followUpEffect.rWithout}pp`
                                 : 'No significant difference detected yet'
                              : 'Needs ≥3 leads per group to compute'}
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

                  {/* Avg Lead-to-Booking Time */}
                  <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center">
                     <Timer size={40} className="text-primary mb-3 opacity-80" />
                     <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Avg. Lead-to-Booking Time</p>
                     <div className="text-6xl kpi-number text-slate-900 dark:text-white">
                        {averageConversionTimeDays !== null ? averageConversionTimeDays : '—'}
                     </div>
                     <p className="text-slate-400 text-sm mt-1">
                        {averageConversionTimeDays !== null ? 'days from first inquiry to conversion' : 'No log data on converted leads yet'}
                     </p>
                     <p className="text-xs text-slate-400 mt-4 italic">
                        {averageConversionTimeDays === null
                           ? '💡 Add log entries to leads to track speed.'
                           : averageConversionTimeDays > 30
                              ? '⚠️ High turnaround time.'
                              : '✅ Fast conversion cycle.'}
                     </p>
                  </div>
               </div>
            </>}

            {/* ========================================================================= */}
            {/* ── TAB 4: TEAM LEADERBOARD ── */}
            {/* ========================================================================= */}
            {activeTab === 'team' && <>
               <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Agent Revenue Leaderboard */}
                  <div className="bg-white dark:bg-[#1A2633] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                     <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 section-heading-accent">
                           <Award size={18} className="text-primary" /> Agent Invoiced Leaderboard
                        </h4>
                        <button 
                           onClick={() => setActiveTab('months12')}
                           className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                        >
                           Full 12-Month Matrix <ChevronRight size={14} />
                        </button>
                     </div>
                     <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                           <tr>
                              <th className="px-5 py-3 text-left font-bold text-slate-500 text-xs uppercase">Agent</th>
                              <th className="px-5 py-3 text-center font-bold text-slate-500 text-xs uppercase">Trips</th>
                              <th className="px-5 py-3 text-right font-bold text-slate-500 text-xs uppercase">Invoiced</th>
                              <th className="px-5 py-3 text-right font-bold text-slate-500 text-xs uppercase">Net Profit</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                           {agentPerformance.map((agent, i) => {
                              const margin = agent.invoiced > 0 ? (agent.profit / agent.invoiced) * 100 : 0;
                              return (
                                 <tr key={agent.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-5 py-3">
                                       <div className="flex items-center gap-3">
                                          <div className="size-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">{agent.initials}</div>
                                          <span className="font-bold text-slate-900 dark:text-white">{agent.name}</span>
                                       </div>
                                    </td>
                                    <td className="px-5 py-3 text-center font-bold text-slate-700 dark:text-slate-300">{agent.bookings}</td>
                                    <td className="px-5 py-3 text-right font-medium text-slate-700 dark:text-slate-300">{fmtShort(agent.invoiced)}</td>
                                    <td className="px-5 py-3 text-right">
                                       <span className="block kpi-number text-emerald-600 dark:text-emerald-400">{fmtShort(agent.profit)}</span>
                                       <span className="text-[10px] font-bold text-slate-400 uppercase">{margin.toFixed(0)}% mgn</span>
                                    </td>
                                 </tr>
                              );
                           })}
                           {agentPerformance.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-400 italic text-sm">No booking data found.</td></tr>}
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
                              <div className="size-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">{s.initials}</div>
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
                     <Globe size={18} className="text-primary" /> Customer Geographic Distribution
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

            {/* ========================================================================= */}
            {/* ── TAB 5: BUSINESS INTELLIGENCE ── */}
            {/* ========================================================================= */}
            {activeTab === 'bi' && <>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20"><Star size={64} className="text-amber-500" /></div>
                     <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Avg Customer LTV</p>
                     <h3 className="text-4xl kpi-number text-slate-900 dark:text-white mt-2">{fmt(clvData.avgCLV)}</h3>
                     <p className="text-amber-500 text-xs font-bold mt-2">{clvData.buyersCount} of {clvData.total} customers have booked trips</p>
                  </div>
                  <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20"><XCircle size={64} className="text-red-500" /></div>
                     <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Cancellation Rate</p>
                     <h3 className="text-4xl kpi-number text-slate-900 dark:text-white mt-2">{cancellationData.rate}%</h3>
                     <p className="text-red-400 text-xs font-bold mt-2">{cancellationData.count} of {cancellationData.total} bookings · {fmt(cancellationData.refundTotal)} refunded</p>
                  </div>
                  <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20"><Timer size={64} className="text-blue-500" /></div>
                     <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Avg Collection Lag</p>
                     <h3 className="text-4xl kpi-number text-slate-900 dark:text-white mt-2">{paymentLag} <span className="text-lg text-slate-500">days</span></h3>
                     <p className="text-blue-400 text-xs font-bold mt-2">From booking creation to initial deposit</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Top Customers by CLV */}
                  <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                     <h4 className="text-base font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2 section-heading-accent">
                        <Star size={18} className="text-primary" /> Top Customers by Lifetime Value
                     </h4>
                     <div className="space-y-3">
                        {clvData.top5.map((c, i) => (
                           <div key={c.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                              <div className="size-8 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 font-bold flex items-center justify-center text-sm shrink-0">#{i + 1}</div>
                              <div className="flex-1 min-w-0">
                                 <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{c.name}</p>
                                 <p className="text-xs text-slate-500">{c.type || 'Standard'} Customer</p>
                              </div>
                              <span className="kpi-number font-bold text-amber-600 dark:text-amber-400">{fmtShort((c as any).computedSpent ?? c.totalSpent)}</span>
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* Group Size Distribution */}
                  <div className="bg-white dark:bg-[#1A2633] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                     <h4 className="text-base font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2 section-heading-accent">
                        <Users size={18} className="text-primary" /> Group Size Distribution
                     </h4>
                     {(() => {
                        const total = groupSizeData.solo + groupSizeData.couple + groupSizeData.family + groupSizeData.group;
                        return (
                           <div className="space-y-3.5">
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
               </div>
            </>}

         </div>

         {/* ========================================================================= */}
         {/* ── RECEIVABLES DRILLDOWN MODAL ── */}
         {/* ========================================================================= */}
         {showReceivablesModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
               <div className="bg-white dark:bg-[#1A2633] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
                  {/* Modal Header */}
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-amber-50/50 dark:bg-amber-950/20">
                     <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                           <AlertCircle size={24} />
                        </div>
                        <div>
                           <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                              Pending Customer Receivables Ledger
                           </h3>
                           <p className="text-xs text-slate-500 dark:text-slate-400">
                              Verified ledger of {metrics.pendingBookingsList.length} clients with outstanding balances
                           </p>
                        </div>
                     </div>
                     <button
                        onClick={() => setShowReceivablesModal(false)}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                     >
                        <X size={20} />
                     </button>
                  </div>

                  {/* Summary Callout Banner */}
                  <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-200/50 dark:border-amber-900/30 flex items-center justify-between text-xs">
                     <span className="font-semibold text-amber-800 dark:text-amber-200">
                        Total Pending Collection from {metrics.pendingBookingsList.length} Client{metrics.pendingBookingsList.length !== 1 ? 's' : ''}:
                     </span>
                     <span className="font-black text-sm text-amber-600 dark:text-amber-400">
                        {fmt(metrics.pendingCollections)}
                     </span>
                  </div>

                  {/* Table of Receivables */}
                  <div className="p-6 overflow-y-auto flex-1">
                     <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-bold text-slate-500 uppercase">
                           <tr>
                              <th className="px-4 py-3 rounded-l-lg">Customer & Booking</th>
                              <th className="px-4 py-3">Trip Package</th>
                              <th className="px-4 py-3 text-right">Invoiced</th>
                              <th className="px-4 py-3 text-right">Paid</th>
                              <th className="px-4 py-3 text-right rounded-r-lg text-amber-600">Pending Due</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                           {metrics.pendingBookingsList.map((item, idx) => (
                              <tr 
                                 key={idx} 
                                 onClick={() => {
                                    setShowReceivablesModal(false);
                                    navigate(`/admin/bookings?search=${encodeURIComponent(item.bookingNumber || item.customer)}`);
                                    toast.info(`Opening booking for ${item.customer}`);
                                 }}
                                 className="hover:bg-amber-500/10 dark:hover:bg-amber-500/15 transition-colors cursor-pointer group"
                                 title="Click to view this booking in Bookings Management"
                              >
                                 <td className="px-4 py-3.5">
                                    <div className="flex items-center gap-1.5">
                                       <p className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{item.customer}</p>
                                       <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                       <span className="text-[11px] font-mono text-primary font-bold">{item.bookingNumber}</span>
                                       {item.phone && <span className="text-[11px] text-slate-400">📞 {item.phone}</span>}
                                    </div>
                                 </td>
                                 <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-400 max-w-[180px] truncate">
                                    {item.title}
                                    <span className="block text-[10px] text-slate-400">{item.date}</span>
                                 </td>
                                 <td className="px-4 py-3.5 text-right font-semibold text-slate-700 dark:text-slate-300">
                                    {fmt(item.invoiced)}
                                 </td>
                                 <td className="px-4 py-3.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                                    {fmt(item.paid)}
                                 </td>
                                 <td className="px-4 py-3.5 text-right font-black text-amber-600 dark:text-amber-400">
                                    {fmt(item.outstanding)}
                                    <span className="block text-[10px] font-semibold text-amber-500 uppercase tracking-wider">
                                       {item.paymentStatus}
                                    </span>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                     <p className="text-xs text-slate-400">
                        💡 Click booking in Bookings Management to record payments or send reminder
                     </p>
                     <button
                        onClick={() => setShowReceivablesModal(false)}
                        className="px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl text-xs shadow-md transition-all active:scale-95"
                     >
                        Close
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default Analytics;