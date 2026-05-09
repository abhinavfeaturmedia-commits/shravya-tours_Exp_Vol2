import React, { useState } from 'react';
import { useItinerary, CURRENCY_SYMBOLS, ItineraryItem } from '../ItineraryContext';
import { CurrencyCode } from '../../../types';
import { Calculator, Percent, Settings, ArrowLeft, FileCheck, IndianRupee, Receipt, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

interface Props {
    onBack?: () => void;
    onDone?: () => void;
}

const CURRENCIES: CurrencyCode[] = ['INR', 'USD', 'AED', 'EUR', 'GBP'];

export const StepPricing: React.FC<Props> = ({ onBack, onDone }) => {
    const {
        items, updateItem, currency, setCurrency,
        taxConfig, updateTaxConfig,
        subtotal, packageMarkupAmount, taxAmount, grandTotal,
        formatCurrency, tripDetails,
        packageMarkupPercent, packageMarkupFlat, setPackageMarkup,
    } = useItinerary();

    const [showTaxPanel, setShowTaxPanel] = useState(false);

    const categoryGroups: Record<string, ItineraryItem[]> = items
        .filter(i => i.type !== 'note' && i.type !== 'other')
        .reduce((g, item) => {
            const cat = item.type.charAt(0).toUpperCase() + item.type.slice(1);
            if (!g[cat]) g[cat] = [];
            g[cat].push(item);
            return g;
        }, {} as Record<string, ItineraryItem[]>);

    const totalNetCost = items.filter(i => i.type !== 'note' && i.type !== 'other').reduce((sum, item) => sum + (item.netCost * item.quantity), 0);
    const totalGrossRevenue = subtotal + packageMarkupAmount;
    const absoluteProfit = totalGrossRevenue - totalNetCost;
    const profitMarginPercent = totalGrossRevenue > 0 ? (absoluteProfit / totalGrossRevenue) * 100 : 0;
    const isLowMargin = totalGrossRevenue > 0 && profitMarginPercent < 10;

    return (
        <div className="min-h-full flex flex-col">
            {/* Panel header */}
            <div className="shrink-0 bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between shadow-sm">
                <div>
                    <p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-0.5">Step 3 of 4</p>
                    <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
                        <Calculator size={20} className="text-emerald-500" />
                        Pricing & Costing
                    </h2>
                    <p className="text-xs text-stone-400 mt-0.5">
                        Set markups, taxes & currency for: <span className="font-bold text-stone-600">{tripDetails.title || 'Untitled'}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Currency selector */}
                    <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-1">
                        {CURRENCIES.map(c => (
                            <button
                                key={c}
                                onClick={() => setCurrency(c)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    currency === c
                                        ? 'bg-white text-emerald-600 shadow-sm'
                                        : 'text-stone-500 hover:text-stone-700'
                                }`}
                            >
                                {CURRENCY_SYMBOLS[c]} {c}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setShowTaxPanel(v => !v)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${showTaxPanel ? 'bg-amber-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                    >
                        <Settings size={14} /> Tax Settings
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-5xl mx-auto space-y-6">

                    {/* Tax settings panel */}
                    {showTaxPanel && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 animate-in fade-in slide-in-from-top-2">
                            <h3 className="font-black text-amber-800 mb-4 flex items-center gap-2 text-sm">
                                <Receipt size={16} /> Tax Configuration (GST & TCS)
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                {[
                                    { key: 'cgstPercent', label: 'CGST %' },
                                    { key: 'sgstPercent', label: 'SGST %' },
                                    { key: 'igstPercent', label: 'IGST %' },
                                    { key: 'tcsPercent',  label: 'TCS %'  },
                                ].map(({ key, label }) => (
                                    <div key={key}>
                                        <label className="text-[10px] font-black text-amber-700 uppercase tracking-wider">{label}</label>
                                        <input
                                            type="number" step="0.1"
                                            value={(taxConfig as any)[key]}
                                            onChange={e => updateTaxConfig({ [key]: parseFloat(e.target.value) || 0 })}
                                            className="w-full mt-1 bg-white border border-amber-300 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400"
                                        />
                                    </div>
                                ))}
                                <div className="flex items-end">
                                    <label className="flex items-center gap-2 text-xs font-bold text-amber-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={taxConfig.gstOnTotal}
                                            onChange={e => updateTaxConfig({ gstOnTotal: e.target.checked })}
                                            className="size-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                                        />
                                        GST on Total
                                    </label>
                                    <p className="text-[9px] text-amber-600 mt-1">Uncheck to remove all tax</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Margin & Profit Dashboard */}
                    {items.length > 0 && (
                        <div className={`rounded-2xl border p-5 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative shadow-sm ${isLowMargin ? 'bg-red-50 border-red-200' : 'bg-gradient-to-r from-stone-900 to-stone-800 border-stone-800'}`}>
                            {/* Decorative background element */}
                            {!isLowMargin && <div className="absolute right-0 top-0 w-64 h-full bg-emerald-500/10 blur-3xl rounded-full translate-x-1/2" />}
                            
                            <div className="flex items-center gap-4 relative z-10 w-full md:w-auto">
                                <div className={`p-3 rounded-xl ${isLowMargin ? 'bg-red-100 text-red-600' : 'bg-stone-800 text-stone-300'}`}>
                                    <TrendingUp size={24} />
                                </div>
                                <div>
                                    <h3 className={`text-sm font-black ${isLowMargin ? 'text-red-900' : 'text-white'}`}>Profit Margin Dashboard</h3>
                                    <p className={`text-xs mt-0.5 ${isLowMargin ? 'text-red-700 font-bold' : 'text-stone-400'}`}>
                                        {isLowMargin ? 'Warning: Low margin (<10%)' : 'Business performance estimate'}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 w-full md:w-auto gap-px bg-stone-200/20 rounded-xl overflow-hidden relative z-10">
                                <div className={`p-4 ${isLowMargin ? 'bg-red-50' : 'bg-stone-900/50'}`}>
                                    <div className={`text-[10px] font-black uppercase tracking-wider mb-1 ${isLowMargin ? 'text-red-800' : 'text-stone-400'}`}>Total Net Cost</div>
                                    <div className={`font-bold ${isLowMargin ? 'text-red-900' : 'text-stone-200'}`}>{formatCurrency(totalNetCost)}</div>
                                </div>
                                <div className={`p-4 ${isLowMargin ? 'bg-red-50' : 'bg-stone-900/50'}`}>
                                    <div className={`text-[10px] font-black uppercase tracking-wider mb-1 ${isLowMargin ? 'text-red-800' : 'text-stone-400'}`}>Gross Revenue</div>
                                    <div className={`font-bold ${isLowMargin ? 'text-red-900' : 'text-stone-200'}`}>{formatCurrency(totalGrossRevenue)}</div>
                                </div>
                                <div className={`p-4 ${isLowMargin ? 'bg-red-50' : 'bg-stone-900/50'}`}>
                                    <div className={`text-[10px] font-black uppercase tracking-wider mb-1 ${isLowMargin ? 'text-red-800' : 'text-stone-400'}`}>Est. Profit</div>
                                    <div className={`font-bold ${isLowMargin ? 'text-red-600' : 'text-emerald-400'}`}>+ {formatCurrency(absoluteProfit)}</div>
                                </div>
                                <div className={`p-4 ${isLowMargin ? 'bg-red-50' : 'bg-stone-900/40 relative overflow-hidden'}`}>
                                    <div className={`text-[10px] font-black uppercase tracking-wider mb-1 ${isLowMargin ? 'text-red-800' : 'text-stone-400'}`}>Margin</div>
                                    <div className={`font-black flex items-center gap-1 ${isLowMargin ? 'text-red-600' : 'text-emerald-400'}`}>
                                        {isLowMargin && <AlertTriangle size={14} />}
                                        {profitMarginPercent.toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Per-item pricing table */}
                    {Object.entries(categoryGroups).map(([cat, catItems]) => (
                        <div key={cat} className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                            <div className="bg-stone-50 px-5 py-3 border-b border-stone-200">
                                <h3 className="font-black text-stone-700 uppercase text-xs tracking-widest">{cat}s ({catItems.length})</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-stone-100/50">
                                        <tr>
                                            <th className="text-left px-5 py-3 font-black text-stone-400 uppercase text-[10px] tracking-wider">Item</th>
                                            <th className="text-center px-4 py-3 font-black text-stone-400 uppercase text-[10px] tracking-wider">Qty</th>
                                            <th className="text-right px-4 py-3 font-black text-stone-400 uppercase text-[10px] tracking-wider">Net Cost</th>
                                            <th className="text-center px-4 py-3 font-black text-stone-400 uppercase text-[10px] tracking-wider">
                                                <span className="flex items-center justify-center gap-1"><Percent size={10} /> Markup</span>
                                            </th>
                                            <th className="text-right px-4 py-3 font-black text-stone-400 uppercase text-[10px] tracking-wider">
                                                <span className="flex items-center justify-end gap-1"><IndianRupee size={10} /> Extra</span>
                                            </th>
                                            <th className="text-right px-5 py-3 font-black text-emerald-600 uppercase text-[10px] tracking-wider">Sell Price</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100">
                                        {catItems.map(item => (
                                            <tr key={item.id} className="hover:bg-stone-50 transition-colors">
                                                <td className="px-5 py-3">
                                                    <div className="font-bold text-stone-800">{item.title}</div>
                                                    <div className="text-[10px] text-stone-400 font-medium">Day {item.day}</div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="number" min="1"
                                                        value={item.quantity}
                                                        onChange={e => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                                                        className="w-14 text-center bg-stone-100 border border-stone-200 rounded-lg px-2 py-1 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <input
                                                        type="number" min="0"
                                                        value={item.netCost}
                                                        onChange={e => updateItem(item.id, { netCost: parseFloat(e.target.value) || 0 })}
                                                        className="w-28 text-right bg-stone-100 border border-stone-200 rounded-lg px-3 py-1 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <input
                                                            type="number" min="0" step="0.5"
                                                            value={item.baseMarkupPercent}
                                                            onChange={e => updateItem(item.id, { baseMarkupPercent: parseFloat(e.target.value) || 0 })}
                                                            className="w-16 text-center bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 text-sm font-bold text-blue-700 outline-none focus:ring-2 focus:ring-blue-400"
                                                        />
                                                        <span className="text-blue-500 font-black">%</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <span className="text-stone-400">₹</span>
                                                        <input
                                                            type="number" min="0"
                                                            value={item.extraMarkupFlat}
                                                            onChange={e => updateItem(item.id, { extraMarkupFlat: parseFloat(e.target.value) || 0 })}
                                                            className="w-20 text-right bg-violet-50 border border-violet-200 rounded-lg px-2 py-1 text-sm font-bold text-violet-700 outline-none focus:ring-2 focus:ring-violet-400"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <span className="font-black text-emerald-600 text-base">{formatCurrency(item.sellPrice)}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}

                    {/* Empty state */}
                    {items.length === 0 && (
                        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-stone-300">
                            <DollarSign size={48} className="mx-auto text-stone-300 mb-4" />
                            <h3 className="text-base font-bold text-stone-500">No items to price yet</h3>
                            <p className="text-xs text-stone-400 mt-1">Go back to the Board and add Hotels, Activities, or Transports</p>
                        </div>
                    )}

                    {/* Package-level markup */}
                    {items.length > 0 && (
                        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-indigo-100">
                                <h3 className="font-black text-indigo-800 flex items-center gap-2 text-sm">
                                    <Percent size={16} /> Package-Level Markup
                                </h3>
                                <p className="text-[11px] text-indigo-500 mt-0.5">Applied on top of individual item markups</p>
                            </div>
                            <div className="px-6 py-5">
                                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-indigo-700 uppercase tracking-wider mb-1.5 block">Markup %</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number" min="0" step="0.5"
                                                value={packageMarkupPercent}
                                                onChange={e => setPackageMarkup(parseFloat(e.target.value) || 0, packageMarkupFlat)}
                                                className="w-28 bg-white border border-indigo-300 rounded-xl px-3 py-2.5 text-sm font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-400"
                                            />
                                            <span className="text-indigo-500 font-black text-lg">%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-violet-700 uppercase tracking-wider mb-1.5 block">Extra Amount</label>
                                        <div className="flex items-center gap-2">
                                            <span className="text-violet-400 font-bold">₹</span>
                                            <input
                                                type="number" min="0"
                                                value={packageMarkupFlat}
                                                onChange={e => setPackageMarkup(packageMarkupPercent, parseFloat(e.target.value) || 0)}
                                                className="w-28 bg-white border border-violet-300 rounded-xl px-3 py-2.5 text-sm font-bold text-violet-700 outline-none focus:ring-2 focus:ring-violet-400"
                                            />
                                        </div>
                                    </div>
                                    <div className="sm:ml-auto text-right">
                                        <div className="text-[10px] font-bold text-stone-500 uppercase mb-1">Total Package Markup</div>
                                        <div className="text-xl font-black text-indigo-600">+ {formatCurrency(packageMarkupAmount)}</div>
                                        <div className="text-[10px] text-stone-400 mt-0.5">On subtotal of {formatCurrency(subtotal)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Grand total + nav */}
                    {items.length > 0 && (
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between gap-16 text-sm">
                                        <span className="text-stone-600">Item Subtotal</span>
                                        <span className="font-bold text-stone-800">{formatCurrency(subtotal)}</span>
                                    </div>
                                    {packageMarkupAmount > 0 && (
                                        <div className="flex justify-between gap-16 text-sm">
                                            <span className="text-indigo-600">
                                                Package Markup {packageMarkupPercent > 0 ? `(${packageMarkupPercent}%)` : ''}{packageMarkupFlat > 0 ? ` + ₹${packageMarkupFlat.toLocaleString()}` : ''}
                                            </span>
                                            <span className="font-bold text-indigo-600">+ {formatCurrency(packageMarkupAmount)}</span>
                                        </div>
                                    )}
                                    {taxAmount > 0 && (
                                        <div className="flex justify-between gap-16 text-sm">
                                            <span className="text-stone-600">
                                                Tax ({taxConfig.cgstPercent + taxConfig.sgstPercent + taxConfig.igstPercent + taxConfig.tcsPercent}%)
                                            </span>
                                            <span className="font-bold text-amber-600">{formatCurrency(taxAmount)}</span>
                                        </div>
                                    )}
                                    <div className="h-px bg-emerald-200 my-2" />
                                    <div className="flex justify-between gap-16">
                                        <span className="font-black text-emerald-700 text-lg">Grand Total</span>
                                        <span className="font-black text-2xl text-emerald-600">{formatCurrency(grandTotal)}</span>
                                    </div>
                                </div>
                                <div className="flex gap-3 w-full md:w-auto">
                                    {onBack && (
                                        <button onClick={onBack} className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-stone-300 text-stone-600 font-bold hover:border-stone-400 transition-all text-sm">
                                            <ArrowLeft size={16} /> Back
                                        </button>
                                    )}
                                    {onDone && (
                                        <button onClick={onDone} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-500/30 transition-all active:scale-95 text-sm">
                                            <FileCheck size={16} /> Finalize & Review
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
