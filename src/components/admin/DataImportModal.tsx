import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

export interface ColumnMapping<T> {
    header: string;
    key: keyof T;
    required?: boolean;
    transform?: (value: string) => any;
}

export interface DataImportModalProps<T> {
    isOpen: boolean;
    onClose: () => void;
    onImport: (data: T[]) => void;
    columns: ColumnMapping<T>[];
    entityName?: string;
}

export const DataImportModal = <T extends Record<string, any>>({
    isOpen,
    onClose,
    onImport,
    columns,
    entityName = 'Data'
}: DataImportModalProps<T>) => {
    const [previewData, setPreviewData] = useState<T[]>([]);
    const [errors, setErrors] = useState<Record<number, string[]>>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const parseHeadersMap = (fileHeaders: string[]) => {
        // Map file headers to keys based on lowercased match or exact mapping
        const headerMap: Record<number, ColumnMapping<T>> = {};
        fileHeaders.forEach((fh, idx) => {
            const mappedCol = columns.find(c =>
                c.header.toLowerCase() === fh.toLowerCase().trim() ||
                c.key === fh.toLowerCase().trim()
            );
            if (mappedCol) {
                headerMap[idx] = mappedCol;
            }
        });
        return headerMap;
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

            // Convert sheet to array of arrays
            const rows: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

            if (rows.length < 2) {
                toast.error('File contains no data rows.');
                setIsProcessing(false);
                return;
            }

            const fileHeaders = rows[0].map(h => String(h || ''));
            const headerMap = parseHeadersMap(fileHeaders);

            const parsedData: T[] = [];
            const newErrors: Record<number, string[]> = {};

            // Process data rows
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                // skip empty rows completely
                if (row.every(cell => !cell)) continue;

                const item: any = {};
                const rowErrors: string[] = [];

                // Fill with mapped columns
                Object.keys(headerMap).forEach(idxStr => {
                    const idx = Number(idxStr);
                    const col = headerMap[idx];
                    let val = String(row[idx] || '').trim();

                    if (col.transform && val) {
                        try {
                            val = col.transform(val);
                        } catch(e) { /* ignore */ }
                    }
                    item[col.key] = val;
                });

                // Validation
                columns.forEach(col => {
                    const val = item[col.key];
                    if (col.required && (!val || val === '')) {
                        rowErrors.push(`${col.header} is required`);
                    }
                });

                if (rowErrors.length > 0) {
                    newErrors[parsedData.length] = rowErrors;
                }
                
                parsedData.push(item as T);
            }

            setPreviewData(parsedData);
            setErrors(newErrors);

            if (Object.keys(newErrors).length > 0) {
                toast.error(`Found errors in ${Object.keys(newErrors).length} rows. See red highlights.`);
            } else {
                toast.success(`Successfully parsed ${parsedData.length} valid rows.`);
            }
        } catch (error) {
            console.error('Import error:', error);
            toast.error('Failed to parse the file. Please ensure it is a valid Excel or CSV file.');
        } finally {
            setIsProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleConfirmImport = () => {
        if (Object.keys(errors).length > 0) {
            toast.error('Please fix highlighted errors before importing, or upload a corrected file.');
            return;
        }
        onImport(previewData);
        setPreviewData([]);
        setErrors({});
    };

    const reset = () => {
        setPreviewData([]);
        setErrors({});
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white dark:bg-[#1A2633] w-full max-w-5xl rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Bulk Import {entityName}</h2>
                        <p className="text-sm text-slate-500 mt-1">Upload an Excel (.xlsx) or CSV file containing your {entityName.toLowerCase()} data.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <span className="material-symbols-outlined text-slate-400">close</span>
                    </button>
                </div>

                {previewData.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-10 py-20 text-center relative hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            onChange={handleFileUpload}
                            ref={fileInputRef}
                        />
                        <div className="size-16 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-3xl">upload_file</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Click or Drag File Here</h3>
                        <p className="text-sm text-slate-500 max-w-sm mb-6">Supports .xlsx and .csv files. Ensure your columns include: {columns.map(c => c.header).join(', ')}</p>
                        
                        <a href={`data:text/csv;charset=utf-8,${columns.map(c => c.header).join(',')}\n`} download={`${entityName}_Template.csv`} className="z-20 relative px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors shadow-sm">
                            Download Template CSV
                        </a>
                    </div>
                ) : (
                    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="flex justify-between items-center mb-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                            <div>
                                <span className="text-sm font-bold text-slate-900 dark:text-white mr-4">{previewData.length} Rows Parsed</span>
                                {Object.keys(errors).length > 0 ? (
                                    <span className="text-sm font-bold bg-red-100 text-red-600 px-3 py-1 rounded-full">{Object.keys(errors).length} Errors Detected</span>
                                ) : (
                                    <span className="text-sm font-bold bg-green-100 text-green-600 px-3 py-1 rounded-full">All Rows Valid</span>
                                )}
                            </div>
                            <button onClick={reset} className="text-sm font-bold text-primary hover:text-primary-dark transition-colors">Upload Different File</button>
                        </div>

                        <div className="flex-1 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10 shadow-sm border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        {columns.map(col => (
                                            <th key={String(col.key)} className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                {col.header}
                                                {col.required && <span className="text-red-500 ml-1">*</span>}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {previewData.slice(0, 100).map((row, idx) => {
                                        const hasError = !!errors[idx];
                                        return (
                                            <tr key={idx} className={hasError ? 'bg-red-50 dark:bg-red-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors'}>
                                                {columns.map(col => {
                                                    const val = row[col.key];
                                                    const valStr = val === undefined || val === null ? '' : String(val);
                                                    const isMissingRequired = col.required && !valStr;
                                                    
                                                    return (
                                                        <td key={String(col.key)} className={`px-4 py-3 ${isMissingRequired ? 'border border-red-300 bg-red-100 dark:bg-red-900/40' : ''}`}>
                                                            {isMissingRequired ? <span className="text-red-600 text-[10px] font-bold">REQUIRED</span> : <span className="text-slate-900 dark:text-slate-300">{valStr}</span>}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {previewData.length > 100 && (
                                <div className="text-center p-4 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50">
                                    Showing first 100 rows. {previewData.length - 100} more rows are ready to import.
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                            <button
                                onClick={handleConfirmImport}
                                disabled={Object.keys(errors).length > 0 || previewData.length === 0}
                                className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirm Import ({previewData.length})
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
