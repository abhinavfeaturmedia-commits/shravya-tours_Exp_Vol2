import JSZip from 'jszip';
import { generateTrueInvoicePDF } from './pdfGenerator';

export type InvoiceCopyType = 'ORIGINAL' | 'DUPLICATE' | 'BOTH';

export interface BatchProgress {
    current: number;
    total: number;
    message: string;
    percent: number;
}

export interface BatchDownloadOptions {
    invoices: any[];
    companySettings: any;
    financeSettings: any;
    copyType?: InvoiceCopyType;
    groupByMonth?: boolean;
    customZipName?: string;
    onProgress?: (progress: BatchProgress) => void;
    getToken: () => string | null;
}

/**
 * Downloads multiple invoices compiled into a single ZIP archive.
 * Supports date range batches, monthly/multi-month grouping, and copy types.
 */
export async function downloadInvoicesAsZip({
    invoices,
    companySettings,
    financeSettings,
    copyType = 'ORIGINAL',
    groupByMonth = false,
    customZipName,
    onProgress,
    getToken
}: BatchDownloadOptions): Promise<{ success: boolean; count: number; failedCount: number }> {
    if (!invoices || invoices.length === 0) {
        throw new Error('No invoices selected for download');
    }

    const zip = new JSZip();
    const token = getToken();
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    const total = invoices.length;
    let completed = 0;
    let failedCount = 0;
    const failures: { id: string; invoiceNo: string; error: string }[] = [];

    // Helper for updating progress
    const reportProgress = (current: number, message: string, customPercent?: number) => {
        if (!onProgress) return;
        const percent = customPercent !== undefined ? customPercent : Math.round((current / total) * 85);
        onProgress({
            current,
            total,
            message,
            percent: Math.min(100, Math.max(0, percent))
        });
    };

    reportProgress(0, `Starting preparation for ${total} documents...`, 5);

    // Process invoices in concurrent batches of 3 to balance speed and browser stability
    const batchSize = 3;
    for (let i = 0; i < total; i += batchSize) {
        const batch = invoices.slice(i, i + batchSize);

        await Promise.all(
            batch.map(async (inv) => {
                const docLabel = inv.invoice_no || `Draft #${String(inv.id).substring(0, 6).toUpperCase()}`;
                try {
                    reportProgress(completed, `Generating PDF for ${docLabel}...`);

                    let items = inv.items;
                    let fullInv = inv;
                    let cfMapped: any[] = [];

                    // If invoice items are already loaded (e.g. from /api/invoices/export-query?include_items=true)
                    const hasPreloadedItems = Array.isArray(items);

                    if (hasPreloadedItems) {
                        // Items already present! Only fetch custom fields if missing
                        try {
                            const r3 = await fetch(`/api/crud/invoice_custom_fields?eq_invoice_id=${inv.id}`, { headers });
                            if (r3.ok) {
                                const d3 = await r3.json();
                                cfMapped = (d3.data || []).map((cf: any) => ({
                                    label: cf.label || '',
                                    amount: Number(cf.amount || 0),
                                    is_deduction: Boolean(cf.is_deduction)
                                }));
                            }
                        } catch {}
                    } else {
                        // Fetch line items, full invoice, and custom fields
                        const [r1, r2, r3] = await Promise.all([
                            fetch(`/api/crud/invoice_items?eq_invoice_id=${inv.id}`, { headers }),
                            fetch(`/api/crud/invoices/${inv.id}`, { headers }),
                            fetch(`/api/crud/invoice_custom_fields?eq_invoice_id=${inv.id}`, { headers })
                        ]);

                        const [d1, d2, d3] = await Promise.all([
                            r1.ok ? r1.json() : { data: [] },
                            r2.ok ? r2.json() : { data: inv },
                            r3.ok ? r3.json() : { data: [] }
                        ]);

                        items = d1.data || [];
                        fullInv = d2.data || inv;
                        cfMapped = (d3.data || []).map((cf: any) => ({
                            label: cf.label || '',
                            amount: Number(cf.amount || 0),
                            is_deduction: Boolean(cf.is_deduction)
                        }));
                    }

                    let fieldLabels: Record<string, string> = {};
                    if (fullInv.field_labels) {
                        try {
                            fieldLabels = typeof fullInv.field_labels === 'string'
                                ? JSON.parse(fullInv.field_labels)
                                : fullInv.field_labels;
                        } catch {}
                    }

                    // Compute monthly subfolder if requested
                    let monthFolderName = '';
                    if (groupByMonth) {
                        const dateVal = fullInv.issue_date || fullInv.created_at || new Date().toISOString();
                        const d = new Date(dateVal);
                        const yr = d.getFullYear();
                        const mo = String(d.getMonth() + 1).padStart(2, '0');
                        const monthName = d.toLocaleString('en-IN', { month: 'long' });
                        monthFolderName = `${yr}-${mo}_${monthName}`;
                    }

                    // 2. Generate PDF blobs according to chosen copy type
                    if (copyType === 'ORIGINAL' || copyType === 'BOTH') {
                        const originalRes = await generateTrueInvoicePDF(
                            { ...fullInv, copy_type: 'ORIGINAL FOR RECIPIENT' },
                            items,
                            companySettings,
                            financeSettings,
                            cfMapped,
                            fieldLabels,
                            { returnBlob: true }
                        );

                        if (copyType === 'BOTH') {
                            if (groupByMonth) {
                                zip.folder(monthFolderName)?.folder('Original_Copies')?.file(originalRes.fileName, originalRes.blob);
                            } else {
                                zip.folder('Original_Copies')?.file(originalRes.fileName, originalRes.blob);
                            }
                        } else {
                            if (groupByMonth) {
                                zip.folder(monthFolderName)?.file(originalRes.fileName, originalRes.blob);
                            } else {
                                zip.file(originalRes.fileName, originalRes.blob);
                            }
                        }
                    }

                    if (copyType === 'DUPLICATE' || copyType === 'BOTH') {
                        const duplicateRes = await generateTrueInvoicePDF(
                            { ...fullInv, copy_type: 'DUPLICATE FOR SUPPLIER' },
                            items,
                            companySettings,
                            financeSettings,
                            cfMapped,
                            fieldLabels,
                            { returnBlob: true }
                        );

                        const dupFileName = duplicateRes.fileName.replace('.pdf', '_DUPLICATE.pdf');
                        if (copyType === 'BOTH') {
                            if (groupByMonth) {
                                zip.folder(monthFolderName)?.folder('Duplicate_Copies')?.file(dupFileName, duplicateRes.blob);
                            } else {
                                zip.folder('Duplicate_Copies')?.file(dupFileName, duplicateRes.blob);
                            }
                        } else {
                            if (groupByMonth) {
                                zip.folder(monthFolderName)?.file(dupFileName, duplicateRes.blob);
                            } else {
                                zip.file(dupFileName, duplicateRes.blob);
                            }
                        }
                    }

                    completed++;
                    reportProgress(completed, `Completed ${completed} of ${total} documents`);
                } catch (err: any) {
                    console.error(`Failed to process invoice ${inv.id}:`, err);
                    failedCount++;
                    completed++;
                    failures.push({
                        id: inv.id,
                        invoiceNo: inv.invoice_no || inv.id,
                        error: err?.message || 'Unknown error'
                    });
                }
            })
        );
    }

    // If there were any failures, write a log inside the zip
    if (failures.length > 0) {
        const errorLog = [
            `Batch Download Report - ${new Date().toLocaleString('en-IN')}`,
            `Total Selected: ${total}`,
            `Successfully Included: ${total - failedCount}`,
            `Failed: ${failedCount}`,
            '',
            'Failed Documents:',
            ...failures.map(f => `- Document ${f.invoiceNo} (ID: ${f.id}): ${f.error}`)
        ].join('\n');
        zip.file('_failed_documents_report.txt', errorLog);
    }

    // 3. Compress ZIP
    reportProgress(total, 'Compressing ZIP archive...', 90);

    const zipBlob = await zip.generateAsync(
        {
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        },
        (metadata) => {
            reportProgress(
                total,
                `Compressing ZIP: ${Math.round(metadata.percent)}%`,
                90 + Math.round(metadata.percent * 0.09)
            );
        }
    );

    // 4. Trigger download in browser
    reportProgress(total, 'Saving ZIP file...', 100);

    const dateStr = new Date().toISOString().split('T')[0];
    let zipName = customZipName;
    if (!zipName) {
        zipName = `Invoices_Batch_${copyType.toLowerCase()}_${dateStr}.zip`;
    }
    if (!zipName.endsWith('.zip')) {
        zipName += '.zip';
    }

    const downloadUrl = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = zipName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up object URL after brief delay
    setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
    }, 10000);

    return {
        success: true,
        count: total - failedCount,
        failedCount
    };
}
