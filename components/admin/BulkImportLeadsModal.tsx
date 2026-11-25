import React, { useState } from 'react';
import { toast } from 'sonner';
import { useData } from '../../context/DataContext';
import { Lead } from '../../types';
import { BrandSelect } from '../ui/BrandSelect';

interface BulkImportLeadsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const BulkImportLeadsModal: React.FC<BulkImportLeadsModalProps> = ({ isOpen, onClose }) => {
    const { addLead } = useData();
    const [textData, setTextData] = useState('');
    const [separator, setSeparator] = useState('Tab'); // Tab or Comma
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [step, setStep] = useState(1); // 1: Paste, 2: Preview

    const handleParse = () => {
        if (!textData.trim()) return;

        const sep = separator === 'Tab' ? '\t' : ',';
        const lines = textData.trim().split('\n');

        // Simple parsing assuming header in first row for checking, or just map by index
        // Let's assume user pastes raw data and we map columns
        // Actually, to be safe, let's ask for specific column order or auto-detect header
        // For simplicity: Assume Header is: Name, Phone, Email, Source, Status (optional)

        const data = lines.map((line, i) => {
            const cols = line.split(sep).map(c => c.trim());
            return {
                id: i,
                name: cols[0] || '',
                phone: cols[1] || '',
                email: cols[2] || '',
                source: cols[3] || 'Direct',
                status: cols[4] || 'New'
            };
        });

        setParsedData(data);
        setStep(2);
    };

    const handleImport = () => {
        let successCount = 0;
        parsedData.forEach(row => {
            if (row.name && (row.phone || row.email)) {
                const newLead: Lead = {
                    id: `L-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    name: row.name,
                    phone: row.phone,
                    email: row.email,
                    source: row.source || 'Imported',
                    status: row.status as any || 'New',
                    type: 'Family Trip',
                    addedOn: new Date().toISOString(),
                    assignedTo: 0,
                    preferences: 'Imported via Bulk Tool',
                    destination: 'TBD',
                    travelers: '2 Adults',
                    budget: 'Standard',
                    priority: 'Medium',
                    potentialValue: 0,
                    logs: []
                };
                addLead(newLead);
                successCount++;
            }
        });
        toast.success(`Successfully imported ${successCount} leads`);
        onClose();
        setTextData('');
        setParsedData([]);
        setStep(1);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-[#1A2633] w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 h-[80vh]">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Bulk Import Leads</h2>
                        <p className="text-xs text-slate-500 font-bold uppercase mt-1">Copy & Paste from Excel / Sheets</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {step === 1 ? (
                        <div className="space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 text-sm text-blue-800 dark:text-blue-300">
                                <p className="font-bold flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">info</span> Instructions:</p>
                                <ul className="list-disc list-inside mt-2 space-y-1 opacity-90 ml-1">
                                    <li>Copy data from your spreadsheet (Ctrl+C).</li>
                                    <li>Ensure columns are in order: <strong>Name, Phone, Email, Source, Status</strong>.</li>
                                    <li>Paste below (Ctrl+V).</li>
                                    <li>Phone or Email is required for import.</li>
                                </ul>
                            </div>

                            <div className="flex items-center gap-4 mb-2">
                                <label className="text-sm font-bold text-slate-500">Separator:</label>
                                <BrandSelect value={separator} labelText="Separator" onChange={e => setSeparator(e.target.value)} className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-3 py-1.5 text-sm font-bold shadow-sm min-w-[170px] text-slate-900 dark:text-white">
                                    <option value="Tab">Tab (Excel/Sheets)</option>
                                    <option value="Comma">Comma (CSV)</option>
                                </BrandSelect>
                            </div>

                            <textarea
                                value={textData}
                                onChange={e => setTextData(e.target.value)}
                                className="w-full h-80 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 font-mono text-sm outline-none focus:ring-2 focus:ring-primary toggle-scroll"
                                placeholder={`Name\tPhone\tEmail\tSource\tStatus\nJohn Doe\t9998887776\tjohn@example.com\tFacebook\tNew`}
                            />
                        </div>
                    ) : (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg">Preview Data ({parsedData.length} rows)</h3>
                                <button onClick={() => setStep(1)} className="text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white underline">Edit Data</button>
                            </div>

                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800">
                                        <tr>
                                            <th className="px-4 py-3 font-bold text-slate-500 uppercase text-xs">Name</th>
                                            <th className="px-4 py-3 font-bold text-slate-500 uppercase text-xs">Phone</th>
                                            <th className="px-4 py-3 font-bold text-slate-500 uppercase text-xs">Email</th>
                                            <th className="px-4 py-3 font-bold text-slate-500 uppercase text-xs">Source</th>
                                            <th className="px-4 py-3 font-bold text-slate-500 uppercase text-xs">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {parsedData.slice(0, 10).map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="px-4 py-3">{row.name || <span className="text-red-400 italic">Missing</span>}</td>
                                                <td className="px-4 py-3">{row.phone}</td>
                                                <td className="px-4 py-3">{row.email}</td>
                                                <td className="px-4 py-3">{row.source}</td>
                                                <td className="px-4 py-3">{row.status}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {parsedData.length > 10 && (
                                    <div className="p-3 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                                        ...and {parsedData.length - 10} more rows
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                    {step === 1 ? (
                        <button onClick={handleParse} disabled={!textData.trim()} className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50 disabled:shadow-none">
                            Preview Data
                        </button>
                    ) : (
                        <button onClick={handleImport} className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center gap-2">
                            <span className="material-symbols-outlined text-[20px]">file_upload</span> Import {parsedData.length} Leads
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
