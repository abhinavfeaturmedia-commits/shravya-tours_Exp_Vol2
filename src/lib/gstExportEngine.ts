import * as XLSX from 'xlsx-js-style';

export interface GstInvoiceRecord {
    id?: string;
    invoice_no?: string;
    sequence_number?: number;
    issue_date?: string | Date;
    invoice_date?: string | Date;
    date?: string | Date;
    created_at?: string | Date;
    client_name?: string;
    customer_name?: string;
    customer?: string;
    client_gst?: string;
    customer_gst?: string;
    gstin?: string;
    place_of_supply?: string;
    place_of_supply_code?: string;
    subtotal?: number | string;
    taxable_amount?: number | string;
    tax_total?: number | string;
    tax_amount?: number | string;
    total_amount?: number | string;
    grand_total?: number | string;
    gst_type?: 'CGST_SGST' | 'IGST' | string;
    document_type?: string;
    status?: string;
    reference?: string;
    pdf_filename?: string;
    amount_paid?: number | string;
    balance_due?: number | string;
    payment_status?: string;
    items?: Array<{
        id?: string;
        description?: string;
        quantity?: number;
        unit_price?: number;
        tax_rate?: number;
        tax_amount?: number;
        total?: number;
        hsn_sac?: string;
    }>;
    [key: string]: any;
}

export interface GstExportOptions {
    filename?: string;
    financialYear?: string;
    periodLabel?: string;
}

/**
 * Format a date object/string to "DD MMM YYYY" (e.g. "25 Aug 2026")
 */
export function formatGstDate(rawDate?: string | Date): string {
    if (!rawDate) return '';
    try {
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return String(rawDate);
        const day = d.getDate();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        return `${day < 10 ? '0' + day : day} ${month} ${year}`;
    } catch {
        return String(rawDate || '');
    }
}

/**
 * Format date for GSTR-1 portal (DD-MM-YYYY)
 */
export function formatGstr1PortalDate(rawDate?: string | Date): string {
    if (!rawDate) return '';
    try {
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return String(rawDate);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    } catch {
        return String(rawDate || '');
    }
}

/**
 * Helper to round currency to 2 decimal places
 */
const toCurr = (val: number | string | undefined | null): number => {
    const num = Number(val || 0);
    return Math.round(num * 100) / 100;
};

/**
 * Clean strings to construct consistent reference filenames for Sheet 2
 */
function generateReferenceFilename(inv: GstInvoiceRecord, index: number): string {
    if (inv.reference) return inv.reference;
    if (inv.pdf_filename) return inv.pdf_filename;

    const rawName = inv.client_name || inv.customer_name || inv.customer || 'Customer';
    const rawNo = inv.invoice_no || inv.id || `INV-${index}`;

    const cleanName = rawName
        .trim()
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

    const cleanNo = rawNo
        .trim()
        .replace(/\//g, '-')
        .replace(/[^a-zA-Z0-9\-_]+/g, '');

    return `Invoice_${cleanName}_${cleanNo}.pdf`;
}

// ─── STYLES ───
const numFormat = '#,##0.00';

const headerStyleNavy = {
    fill: { fgColor: { rgb: '1E3A8A' }, patternType: 'solid' },
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
    alignment: { vertical: 'center', horizontal: 'center', wrapText: false },
    border: {
        top: { style: 'thin', color: { rgb: 'CCCCCC' } },
        bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
        left: { style: 'thin', color: { rgb: 'CCCCCC' } },
        right: { style: 'thin', color: { rgb: 'CCCCCC' } }
    }
};

const headerStyleLightBlue = {
    fill: { fgColor: { rgb: 'A4C2F4' }, patternType: 'solid' },
    font: { bold: true, color: { rgb: '000000' }, sz: 10 },
    alignment: { vertical: 'center', horizontal: 'center', wrapText: false },
    border: {
        top: { style: 'thin', color: { rgb: 'CCCCCC' } },
        bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
        left: { style: 'thin', color: { rgb: 'CCCCCC' } },
        right: { style: 'thin', color: { rgb: 'CCCCCC' } }
    }
};

const totalRowStyle = {
    fill: { fgColor: { rgb: 'F1F5F9' }, patternType: 'solid' },
    font: { bold: true, color: { rgb: '0F172A' }, sz: 10 },
    alignment: { vertical: 'center' },
    border: {
        top: { style: 'thin', color: { rgb: '94A3B8' } },
        bottom: { style: 'double', color: { rgb: '0F172A' } }
    }
};

function applyStylesToRange(ws: any, startRow: number, endRow: number, startCol: number, endCol: number, style: any) {
    for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
            const cellRef = XLSX.utils.encode_cell({ r, c });
            if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
            ws[cellRef].s = { ...(ws[cellRef].s || {}), ...style };
        }
    }
}

/**
 * Check if invoice is inter-state (IGST)
 */
function isInterStateSupply(inv: GstInvoiceRecord): boolean {
    const rawGst = (inv.client_gst || inv.customer_gst || inv.gstin || '').trim();
    const posCode = String(inv.place_of_supply_code || '').trim();
    const pos = String(inv.place_of_supply || '').trim().toLowerCase();
    const gstStateCode = rawGst && /^[0-9]{2}/.test(rawGst) ? rawGst.substring(0, 2) : '';
    const explicitIgst = inv.gst_type === 'IGST';
    return Boolean(explicitIgst || (posCode && posCode !== '27') || (gstStateCode && gstStateCode !== '27') || (pos && !pos.includes('maharashtra') && pos !== 'mh' && pos !== '27'));
}

// ─────────────────────────────────────────────────────────────
// 1. CONSOLIDATED GST REGISTER (Official CA Format)
// ─────────────────────────────────────────────────────────────
export function buildConsolidatedGstSheets(invoices: GstInvoiceRecord[]) {
    const headers = [
        'Source',
        'Invoice No',
        'Date',
        'Customer Name',
        'Customer GSTIN',
        'Taxable Value',
        'CGST',
        'SGST',
        'IGST',
        'Total Amount'
    ];

    const ws1Data: any[][] = [headers];
    let runningTaxable = 0;
    let runningCgst = 0;
    let runningSgst = 0;
    let runningIgst = 0;
    let runningTotal = 0;

    const sourceRefs: { index: string; reference: string }[] = [];

    invoices.forEach((inv, idx) => {
        const sourceIndex = String(idx + 1);
        const rowNumber = idx + 2;

        const invoiceNo = inv.invoice_no || (inv.id ? `INV-${String(inv.id).substring(0, 8).toUpperCase()}` : `INV-${sourceIndex}`);
        const dateStr = formatGstDate(inv.issue_date || inv.invoice_date || inv.date || inv.created_at);
        const customerName = (inv.client_name || inv.customer_name || inv.customer || 'Walk-in Customer').trim();
        const rawGst = (inv.client_gst || inv.customer_gst || inv.gstin || '').trim();
        const customerGstin = rawGst && rawGst.length >= 10 ? rawGst.toUpperCase() : 'Not in source';

        let taxable = Number(inv.subtotal ?? inv.taxable_amount ?? 0);
        let totalAmt = Number(inv.total_amount ?? inv.grand_total ?? 0);
        let taxTotal = Number(inv.tax_total ?? inv.tax_amount ?? 0);

        if (!taxable && totalAmt > 0) {
            taxable = taxTotal > 0 ? totalAmt - taxTotal : totalAmt / 1.05;
        }
        if (!taxTotal && totalAmt > 0 && taxable > 0) {
            taxTotal = totalAmt - taxable;
        }

        taxable = toCurr(taxable);
        runningTaxable = toCurr(runningTaxable + taxable);

        const isInterState = isInterStateSupply(inv);

        let cgstCell: any = null;
        let sgstCell: any = null;
        let igstCell: any = null;

        if (isInterState) {
            cgstCell = { t: 's', v: 'Not in source', z: numFormat };
            sgstCell = { t: 's', v: 'Not in source', z: numFormat };
            const igstVal = toCurr(taxTotal > 0 ? taxTotal : taxable * 0.05);
            igstCell = { t: 'n', v: igstVal, z: numFormat };
            runningIgst = toCurr(runningIgst + igstVal);
        } else {
            const halfTax = toCurr((taxTotal > 0 ? taxTotal : taxable * 0.05) / 2);
            cgstCell = { t: 'n', v: halfTax, z: numFormat };
            sgstCell = { t: 'n', v: halfTax, z: numFormat };
            igstCell = null;
            runningCgst = toCurr(runningCgst + halfTax);
            runningSgst = toCurr(runningSgst + halfTax);
        }

        const calculatedRowTotal = toCurr(taxable + (isInterState ? (igstCell?.v || 0) : ((cgstCell?.v || 0) + (sgstCell?.v || 0))));
        runningTotal = toCurr(runningTotal + calculatedRowTotal);

        const totalCell = {
            t: 'n',
            v: calculatedRowTotal,
            f: `SUM(F${rowNumber}:I${rowNumber})`,
            z: numFormat
        };

        ws1Data.push([
            sourceIndex,
            invoiceNo,
            dateStr,
            customerName,
            customerGstin,
            { t: 'n', v: taxable, z: numFormat },
            cgstCell,
            sgstCell,
            igstCell,
            totalCell
        ]);

        sourceRefs.push({
            index: sourceIndex,
            reference: generateReferenceFilename(inv, idx + 1)
        });
    });

    const lastDataRow = invoices.length + 1;
    const totalRowIndex = invoices.length + 2;

    const totalRow = [
        'Total: ',
        null,
        null,
        null,
        null,
        { t: 'n', v: runningTaxable, f: invoices.length > 0 ? `SUM(F2:F${lastDataRow})` : 0, z: numFormat },
        { t: 'n', v: runningCgst, f: invoices.length > 0 ? `SUM(G2:G${lastDataRow})` : 0, z: numFormat },
        { t: 'n', v: runningSgst, f: invoices.length > 0 ? `SUM(H2:H${lastDataRow})` : 0, z: numFormat },
        { t: 'n', v: runningIgst, f: invoices.length > 0 ? `SUM(I2:I${lastDataRow})` : 0, z: numFormat },
        { t: 'n', v: runningTotal, f: invoices.length > 0 ? `SUM(J2:J${lastDataRow})` : 0, z: numFormat }
    ];
    ws1Data.push(totalRow);

    const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);

    const colLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    colLetters.forEach((col) => {
        const cellAddr = `${col}1`;
        if (ws1[cellAddr]) ws1[cellAddr].s = headerStyleLightBlue;
    });

    if (ws1Data.length > 1) {
        ws1['!merges'] = [{ s: { r: totalRowIndex - 1, c: 0 }, e: { r: totalRowIndex - 1, c: 4 } }];
        applyStylesToRange(ws1, totalRowIndex - 1, totalRowIndex - 1, 0, 9, totalRowStyle);
    }

    ws1['!cols'] = [
        { wch: 8 },   // Source
        { wch: 18 },  // Invoice No
        { wch: 14 },  // Date
        { wch: 36 },  // Customer Name
        { wch: 20 },  // Customer GSTIN
        { wch: 16 },  // Taxable Value
        { wch: 14 },  // CGST
        { wch: 14 },  // SGST
        { wch: 14 },  // IGST
        { wch: 16 }   // Total Amount
    ];

    const ws2Data: any[][] = [['Index', 'Reference']];
    sourceRefs.forEach(sr => ws2Data.push([sr.index, sr.reference]));
    const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
    ws2['!cols'] = [{ wch: 10 }, { wch: 80 }];
    if (ws2['A1']) ws2['A1'].s = headerStyleLightBlue;
    if (ws2['B1']) ws2['B1'].s = headerStyleLightBlue;

    return { ws1, ws2 };
}

export function exportConsolidatedGstWorkbook(
    invoices: GstInvoiceRecord[],
    options: GstExportOptions = {}
): void {
    const wb = XLSX.utils.book_new();
    const { ws1, ws2 } = buildConsolidatedGstSheets(invoices);
    XLSX.utils.book_append_sheet(wb, ws1, 'Table 1');
    XLSX.utils.book_append_sheet(wb, ws2, 'Source References');

    const filename = options.filename || 'Consolidated GST Details for SHRAWELLO Travel Hub Invoices.xlsx';
    const finalFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    XLSX.writeFile(wb, finalFilename);
}

// ─────────────────────────────────────────────────────────────
// 2. GSTR-1 MULTI-SHEET PACKAGE (Portal Compliant Return)
// ─────────────────────────────────────────────────────────────
export function buildGstr1Sheets(invoices: GstInvoiceRecord[]) {
    // 4A - B2B
    const b2bHeaders = [
        'GSTIN/UIN of Recipient',
        'Receiver Name',
        'Invoice Number',
        'Invoice date',
        'Invoice Value',
        'Place Of Supply',
        'Reverse Charge',
        'Applicable % of Tax Rate',
        'Invoice Type',
        'E-Commerce GSTIN',
        'Rate',
        'Taxable Value',
        'Cess Amount'
    ];

    // 5A - B2C Large
    const b2clHeaders = [
        'Invoice Number',
        'Invoice date',
        'Invoice Value',
        'Place Of Supply',
        'Applicable % of Tax Rate',
        'Rate',
        'Taxable Value',
        'Cess Amount',
        'E-Commerce GSTIN'
    ];

    // 7 - B2C Small
    const b2csHeaders = [
        'Type',
        'Place Of Supply',
        'Applicable % of Tax Rate',
        'Rate',
        'Taxable Value',
        'Cess Amount',
        'E-Commerce GSTIN'
    ];

    // 9B - Credit Notes
    const cdnrHeaders = [
        'GSTIN/UIN of Recipient',
        'Receiver Name',
        'Note Number',
        'Note Date',
        'Note Type',
        'Place Of Supply',
        'Reverse Charge',
        'Note Value',
        'Applicable % of Tax Rate',
        'Rate',
        'Taxable Value',
        'Cess Amount'
    ];

    // Table 13 - Docs Summary
    const docsHeaders = [
        'Nature of Document',
        'Sr. No. From',
        'Sr. No. To',
        'Total Number',
        'Cancelled',
        'Net Issued'
    ];

    const b2bRows: any[][] = [b2bHeaders];
    const b2clRows: any[][] = [b2clHeaders];
    const b2csMap: Record<string, { pos: string; rate: number; taxable: number }> = {};
    const cdnrRows: any[][] = [cdnrHeaders];

    invoices.forEach(inv => {
        if (inv.status === 'Void') return;

        const isCreditNote = (inv.document_type || '').toLowerCase() === 'creditnote';
        const rawGst = (inv.client_gst || inv.customer_gst || inv.gstin || '').trim();
        const hasGstin = rawGst.length >= 15;
        const invNo = inv.invoice_no || inv.id || '';
        const invDate = formatGstr1PortalDate(inv.issue_date || inv.date || inv.created_at);
        const invValue = toCurr(inv.total_amount ?? inv.grand_total ?? 0);
        const taxable = toCurr(inv.subtotal ?? (invValue / 1.05));
        const posCode = inv.place_of_supply_code || '27';
        const posName = inv.place_of_supply || 'Maharashtra';
        const posFormatted = `${posCode}-${posName}`;
        const isInterState = isInterStateSupply(inv);
        const taxRate = 5; // Standard travel composite rate

        if (isCreditNote) {
            cdnrRows.push([
                rawGst || 'URP',
                inv.client_name || 'Customer',
                invNo,
                invDate,
                'C', // Credit
                posFormatted,
                inv.reverse_charge === 'Y' ? 'Y' : 'N',
                invValue,
                '',
                taxRate,
                taxable,
                0
            ]);
            return;
        }

        if (hasGstin) {
            // B2B
            b2bRows.push([
                rawGst.toUpperCase(),
                inv.client_name || 'Customer',
                invNo,
                invDate,
                invValue,
                posFormatted,
                inv.reverse_charge === 'Y' ? 'Y' : 'N',
                '',
                'Regular',
                '',
                taxRate,
                taxable,
                0
            ]);
        } else {
            // B2C: Large if inter-state and total > 2,50,000
            if (isInterState && invValue > 250000) {
                b2clRows.push([
                    invNo,
                    invDate,
                    invValue,
                    posFormatted,
                    '',
                    taxRate,
                    taxable,
                    0,
                    ''
                ]);
            } else {
                // B2C Small: Aggregate by POS + Rate
                const key = `${posFormatted}_${taxRate}`;
                if (!b2csMap[key]) {
                    b2csMap[key] = { pos: posFormatted, rate: taxRate, taxable: 0 };
                }
                b2csMap[key].taxable = toCurr(b2csMap[key].taxable + taxable);
            }
        }
    });

    const b2csRows: any[][] = [b2csHeaders];
    Object.values(b2csMap).forEach(b => {
        b2csRows.push([
            'OE', // Other than E-commerce
            b.pos,
            '',
            b.rate,
            b.taxable,
            0,
            ''
        ]);
    });

    // Table 13 Document Summary
    const docTypes = [
        { key: 'Invoice', label: '1. Invoices for outward supply' },
        { key: 'Quotation', label: '2. Quotations / Estimates' },
        { key: 'Proforma', label: '3. Proforma Invoices' },
        { key: 'CreditNote', label: '4. Credit Notes (Rule 53)' }
    ];

    const docsRows: any[][] = [docsHeaders];
    docTypes.forEach(dt => {
        const matches = invoices.filter(r => (r.document_type || 'Invoice').toLowerCase() === dt.key.toLowerCase());
        const withNo = matches.filter(r => r.invoice_no);
        const cancelled = matches.filter(r => r.status === 'Void').length;
        const total = matches.length;
        const netIssued = total - cancelled;
        const fromSerial = withNo.length > 0 ? withNo[0].invoice_no : (total > 0 ? `#${matches[0].id?.substring(0, 6).toUpperCase()}` : '—');
        const toSerial = withNo.length > 0 ? withNo[withNo.length - 1].invoice_no : (total > 0 ? `#${matches[matches.length - 1].id?.substring(0, 6).toUpperCase()}` : '—');

        docsRows.push([
            dt.label,
            fromSerial,
            toSerial,
            total,
            cancelled,
            netIssued
        ]);
    });

    // Convert to sheets and style
    const wsB2b = XLSX.utils.aoa_to_sheet(b2bRows);
    const wsB2cl = XLSX.utils.aoa_to_sheet(b2clRows);
    const wsB2cs = XLSX.utils.aoa_to_sheet(b2csRows);
    const wsCdnr = XLSX.utils.aoa_to_sheet(cdnrRows);
    const wsDocs = XLSX.utils.aoa_to_sheet(docsRows);

    [wsB2b, wsB2cl, wsB2cs, wsCdnr, wsDocs].forEach(ws => {
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const address = XLSX.utils.encode_cell({ r: 0, c: C });
            if (ws[address]) ws[address].s = headerStyleNavy;
        }
    });

    wsB2b['!cols'] = [{ wch: 18 }, { wch: 28 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 8 }, { wch: 14 }, { wch: 10 }];
    wsB2cl['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 22 }, { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 10 }, { wch: 16 }];
    wsB2cs['!cols'] = [{ wch: 10 }, { wch: 22 }, { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 10 }, { wch: 16 }];
    wsCdnr['!cols'] = [{ wch: 18 }, { wch: 28 }, { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 10 }];
    wsDocs['!cols'] = [{ wch: 34 }, { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];

    return { wsB2b, wsB2cl, wsB2cs, wsCdnr, wsDocs };
}

export function exportGstr1MultiSheetWorkbook(
    invoices: GstInvoiceRecord[],
    options: GstExportOptions = {}
): void {
    const wb = XLSX.utils.book_new();
    const { wsB2b, wsB2cl, wsB2cs, wsCdnr, wsDocs } = buildGstr1Sheets(invoices);

    XLSX.utils.book_append_sheet(wb, wsB2b, 'b2b');
    XLSX.utils.book_append_sheet(wb, wsB2cl, 'b2cl');
    XLSX.utils.book_append_sheet(wb, wsB2cs, 'b2cs');
    XLSX.utils.book_append_sheet(wb, wsCdnr, 'cdnr');
    XLSX.utils.book_append_sheet(wb, wsDocs, 'docs');

    const periodStr = options.periodLabel ? `_${options.periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_')}` : '';
    const filename = options.filename || `GSTR1_Government_Return_Package${periodStr}.xlsx`;
    XLSX.writeFile(wb, filename);
}

// ─────────────────────────────────────────────────────────────
// 3. HSN / SAC WISE SUMMARY (Table 12)
// ─────────────────────────────────────────────────────────────
export function buildHsnSacSheet(invoices: GstInvoiceRecord[]) {
    const headers = [
        'HSN/SAC Code',
        'Description of Services / Goods',
        'UQC',
        'Total Quantity',
        'Total Value',
        'Taxable Value',
        'Integrated Tax Amount',
        'Central Tax Amount',
        'State/UT Tax Amount',
        'Cess Amount'
    ];

    const sacMap: Record<string, {
        code: string;
        desc: string;
        uqc: string;
        qty: number;
        total: number;
        taxable: number;
        igst: number;
        cgst: number;
        sgst: number;
    }> = {};

    invoices.forEach(inv => {
        if (inv.status === 'Void') return;
        const isInterState = isInterStateSupply(inv);

        // If line items exist with SAC codes
        if (inv.items && inv.items.length > 0) {
            inv.items.forEach(item => {
                const sac = (item.hsn_sac || '996601').trim();
                let desc = item.description || 'Passenger Vehicle Rental / Travel Services';
                if (sac === '996601') desc = 'Rental of Passenger Vehicles with Operators (Cab/Taxi)';
                else if (sac === '998555') desc = 'Tour Operator Services (Holiday Package)';
                else if (sac === '998551') desc = 'Travel Agency Services for Passenger Transport';
                else if (sac === '996311') desc = 'Room / Hotel Accommodation Services';

                if (!sacMap[sac]) {
                    sacMap[sac] = { code: sac, desc, uqc: 'NOS', qty: 0, total: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0 };
                }

                const lineTotal = toCurr(item.total || 0);
                const lineTax = toCurr(item.tax_amount || 0);
                const lineTaxable = toCurr(lineTotal - lineTax);
                const qty = Number(item.quantity || 1);

                sacMap[sac].qty += qty;
                sacMap[sac].total = toCurr(sacMap[sac].total + lineTotal);
                sacMap[sac].taxable = toCurr(sacMap[sac].taxable + lineTaxable);

                if (isInterState) {
                    sacMap[sac].igst = toCurr(sacMap[sac].igst + lineTax);
                } else {
                    sacMap[sac].cgst = toCurr(sacMap[sac].cgst + lineTax / 2);
                    sacMap[sac].sgst = toCurr(sacMap[sac].sgst + lineTax / 2);
                }
            });
        } else {
            // Default to 996601 (Passenger Transport / Rental)
            const sac = '996601';
            const desc = 'Rental of Passenger Vehicles with Operators (Cab/Taxi bookings)';
            if (!sacMap[sac]) {
                sacMap[sac] = { code: sac, desc, uqc: 'NOS', qty: 0, total: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0 };
            }

            const total = toCurr(inv.total_amount ?? 0);
            const tax = toCurr(inv.tax_total ?? 0);
            const taxable = toCurr(inv.subtotal ?? (total - tax));

            sacMap[sac].qty += 1;
            sacMap[sac].total = toCurr(sacMap[sac].total + total);
            sacMap[sac].taxable = toCurr(sacMap[sac].taxable + taxable);

            if (isInterState) {
                sacMap[sac].igst = toCurr(sacMap[sac].igst + tax);
            } else {
                sacMap[sac].cgst = toCurr(sacMap[sac].cgst + tax / 2);
                sacMap[sac].sgst = toCurr(sacMap[sac].sgst + tax / 2);
            }
        }
    });

    const rows: any[][] = [headers];
    let sumTotal = 0;
    let sumTaxable = 0;
    let sumIgst = 0;
    let sumCgst = 0;
    let sumSgst = 0;

    Object.values(sacMap).forEach(s => {
        sumTotal = toCurr(sumTotal + s.total);
        sumTaxable = toCurr(sumTaxable + s.taxable);
        sumIgst = toCurr(sumIgst + s.igst);
        sumCgst = toCurr(sumCgst + s.cgst);
        sumSgst = toCurr(sumSgst + s.sgst);

        rows.push([
            s.code,
            s.desc,
            s.uqc,
            s.qty,
            { t: 'n', v: s.total, z: numFormat },
            { t: 'n', v: s.taxable, z: numFormat },
            { t: 'n', v: s.igst, z: numFormat },
            { t: 'n', v: s.cgst, z: numFormat },
            { t: 'n', v: s.sgst, z: numFormat },
            { t: 'n', v: 0, z: numFormat }
        ]);
    });

    // Total Row
    const totalRow = [
        'Total: ',
        null,
        null,
        null,
        { t: 'n', v: sumTotal, z: numFormat },
        { t: 'n', v: sumTaxable, z: numFormat },
        { t: 'n', v: sumIgst, z: numFormat },
        { t: 'n', v: sumCgst, z: numFormat },
        { t: 'n', v: sumSgst, z: numFormat },
        { t: 'n', v: 0, z: numFormat }
    ];
    rows.push(totalRow);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: 0, c: C });
        if (ws[address]) ws[address].s = headerStyleNavy;
    }

    if (rows.length > 2) {
        const lastR = rows.length - 1;
        ws['!merges'] = [{ s: { r: lastR, c: 0 }, e: { r: lastR, c: 3 } }];
        applyStylesToRange(ws, lastR, lastR, 0, 9, totalRowStyle);
    }

    ws['!cols'] = [
        { wch: 14 },  // SAC Code
        { wch: 45 },  // Description
        { wch: 8 },   // UQC
        { wch: 14 },  // Quantity
        { wch: 16 },  // Total Value
        { wch: 16 },  // Taxable Value
        { wch: 16 },  // IGST
        { wch: 14 },  // CGST
        { wch: 14 },  // SGST
        { wch: 12 }   // Cess
    ];

    return ws;
}

export function exportHsnSacSummaryWorkbook(
    invoices: GstInvoiceRecord[],
    options: GstExportOptions = {}
): void {
    const wb = XLSX.utils.book_new();
    const ws = buildHsnSacSheet(invoices);
    XLSX.utils.book_append_sheet(wb, ws, 'HSN_SAC_Table_12');

    const periodStr = options.periodLabel ? `_${options.periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_')}` : '';
    const filename = options.filename || `GSTR1_Table12_HSN_SAC_Summary${periodStr}.xlsx`;
    XLSX.writeFile(wb, filename);
}

// ─────────────────────────────────────────────────────────────
// 4. CLIENT / PARTY-WISE GST LEDGER
// ─────────────────────────────────────────────────────────────
export function buildClientGstLedgerSheet(invoices: GstInvoiceRecord[]) {
    const headers = [
        'Client / Business Name',
        'GSTIN',
        'State / Place of Supply',
        'Invoices Count',
        'Taxable Turnover',
        'CGST',
        'SGST',
        'IGST',
        'Total Tax',
        'Total Invoiced',
        'Amount Paid',
        'Balance Due'
    ];

    const partyMap: Record<string, {
        name: string;
        gst: string;
        pos: string;
        count: number;
        taxable: number;
        cgst: number;
        sgst: number;
        igst: number;
        totalTax: number;
        totalAmount: number;
        paid: number;
        balance: number;
    }> = {};

    invoices.forEach(inv => {
        if (inv.status === 'Void') return;
        const name = (inv.client_name || inv.customer_name || 'Retail Client').trim();
        const gst = (inv.client_gst || inv.customer_gst || '').trim();
        const key = gst ? `${gst}_${name}` : name;
        const pos = inv.place_of_supply || 'Maharashtra';
        const isInterState = isInterStateSupply(inv);

        const total = toCurr(inv.total_amount ?? 0);
        const tax = toCurr(inv.tax_total ?? 0);
        const taxable = toCurr(inv.subtotal ?? (total - tax));
        const paid = toCurr(inv.amount_paid ?? 0);
        const balance = toCurr(inv.balance_due ?? (total - paid));

        if (!partyMap[key]) {
            partyMap[key] = {
                name,
                gst: gst || 'Unregistered',
                pos,
                count: 0,
                taxable: 0,
                cgst: 0,
                sgst: 0,
                igst: 0,
                totalTax: 0,
                totalAmount: 0,
                paid: 0,
                balance: 0
            };
        }

        partyMap[key].count += 1;
        partyMap[key].taxable = toCurr(partyMap[key].taxable + taxable);
        partyMap[key].totalTax = toCurr(partyMap[key].totalTax + tax);
        partyMap[key].totalAmount = toCurr(partyMap[key].totalAmount + total);
        partyMap[key].paid = toCurr(partyMap[key].paid + paid);
        partyMap[key].balance = toCurr(partyMap[key].balance + balance);

        if (isInterState) {
            partyMap[key].igst = toCurr(partyMap[key].igst + tax);
        } else {
            partyMap[key].cgst = toCurr(partyMap[key].cgst + tax / 2);
            partyMap[key].sgst = toCurr(partyMap[key].sgst + tax / 2);
        }
    });

    const rows: any[][] = [headers];
    let sumTaxable = 0;
    let sumCgst = 0;
    let sumSgst = 0;
    let sumIgst = 0;
    let sumTax = 0;
    let sumTotal = 0;
    let sumPaid = 0;
    let sumBalance = 0;

    Object.values(partyMap).forEach(p => {
        sumTaxable = toCurr(sumTaxable + p.taxable);
        sumCgst = toCurr(sumCgst + p.cgst);
        sumSgst = toCurr(sumSgst + p.sgst);
        sumIgst = toCurr(sumIgst + p.igst);
        sumTax = toCurr(sumTax + p.totalTax);
        sumTotal = toCurr(sumTotal + p.totalAmount);
        sumPaid = toCurr(sumPaid + p.paid);
        sumBalance = toCurr(sumBalance + p.balance);

        rows.push([
            p.name,
            p.gst,
            p.pos,
            p.count,
            { t: 'n', v: p.taxable, z: numFormat },
            { t: 'n', v: p.cgst, z: numFormat },
            { t: 'n', v: p.sgst, z: numFormat },
            { t: 'n', v: p.igst, z: numFormat },
            { t: 'n', v: p.totalTax, z: numFormat },
            { t: 'n', v: p.totalAmount, z: numFormat },
            { t: 'n', v: p.paid, z: numFormat },
            { t: 'n', v: p.balance, z: numFormat }
        ]);
    });

    // Total row
    const totalRow = [
        'Total: ',
        null,
        null,
        null,
        { t: 'n', v: sumTaxable, z: numFormat },
        { t: 'n', v: sumCgst, z: numFormat },
        { t: 'n', v: sumSgst, z: numFormat },
        { t: 'n', v: sumIgst, z: numFormat },
        { t: 'n', v: sumTax, z: numFormat },
        { t: 'n', v: sumTotal, z: numFormat },
        { t: 'n', v: sumPaid, z: numFormat },
        { t: 'n', v: sumBalance, z: numFormat }
    ];
    rows.push(totalRow);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: 0, c: C });
        if (ws[address]) ws[address].s = headerStyleNavy;
    }

    if (rows.length > 2) {
        const lastR = rows.length - 1;
        ws['!merges'] = [{ s: { r: lastR, c: 0 }, e: { r: lastR, c: 3 } }];
        applyStylesToRange(ws, lastR, lastR, 0, 11, totalRowStyle);
    }

    ws['!cols'] = [
        { wch: 32 },  // Client Name
        { wch: 20 },  // GSTIN
        { wch: 20 },  // State
        { wch: 14 },  // Count
        { wch: 16 },  // Taxable
        { wch: 12 },  // CGST
        { wch: 12 },  // SGST
        { wch: 12 },  // IGST
        { wch: 14 },  // Total Tax
        { wch: 16 },  // Total Invoiced
        { wch: 14 },  // Paid
        { wch: 14 }   // Balance
    ];

    return ws;
}

export function exportClientGstLedgerWorkbook(
    invoices: GstInvoiceRecord[],
    options: GstExportOptions = {}
): void {
    const wb = XLSX.utils.book_new();
    const ws = buildClientGstLedgerSheet(invoices);
    XLSX.utils.book_append_sheet(wb, ws, 'Party_GST_Ledger');

    const periodStr = options.periodLabel ? `_${options.periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_')}` : '';
    const filename = options.filename || `Party_GST_Ledger_Report${periodStr}.xlsx`;
    XLSX.writeFile(wb, filename);
}

// ─────────────────────────────────────────────────────────────
// 5. MASTER ALL-IN-ONE WORKBOOK (All Sheets Combined)
// ─────────────────────────────────────────────────────────────
export function exportMasterGstWorkbook(
    invoices: GstInvoiceRecord[],
    options: GstExportOptions = {}
): void {
    const wb = XLSX.utils.book_new();

    // 1. Consolidated CA Register
    const { ws1, ws2 } = buildConsolidatedGstSheets(invoices);
    XLSX.utils.book_append_sheet(wb, ws1, 'CA Sales Register');

    // 2. GSTR-1 Sheets
    const { wsB2b, wsB2cl, wsB2cs, wsCdnr, wsDocs } = buildGstr1Sheets(invoices);
    XLSX.utils.book_append_sheet(wb, wsB2b, 'GSTR1-B2B');
    XLSX.utils.book_append_sheet(wb, wsB2cl, 'GSTR1-B2C-Large');
    XLSX.utils.book_append_sheet(wb, wsB2cs, 'GSTR1-B2C-Small');
    XLSX.utils.book_append_sheet(wb, wsCdnr, 'GSTR1-Credit-Notes');
    XLSX.utils.book_append_sheet(wb, wsDocs, 'GSTR1-Docs-Summary');

    // 3. HSN / SAC Summary
    const wsHsn = buildHsnSacSheet(invoices);
    XLSX.utils.book_append_sheet(wb, wsHsn, 'HSN-SAC Table 12');

    // 4. Party-wise Ledger
    const wsLedger = buildClientGstLedgerSheet(invoices);
    XLSX.utils.book_append_sheet(wb, wsLedger, 'Party Ledger');

    // 5. PDF References
    XLSX.utils.book_append_sheet(wb, ws2, 'Source References');

    const periodStr = options.periodLabel ? `_${options.periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_')}` : '';
    const filename = options.filename || `Master_All_In_One_GST_Workbook${periodStr}.xlsx`;
    XLSX.writeFile(wb, filename);
}

// ─────────────────────────────────────────────────────────────
// 6. DETAILED CSV EXPORT
// ─────────────────────────────────────────────────────────────
export function exportDetailedCsvRegister(
    invoices: GstInvoiceRecord[],
    options: GstExportOptions = {}
): void {
    const headers = [
        'Document #',
        'Doc Type',
        'Date',
        'Client Name',
        'Client GSTIN',
        'Place of Supply',
        'State Code',
        'GST Type',
        'Taxable Value',
        'CGST',
        'SGST',
        'IGST',
        'Tax Total',
        'Total Amount',
        'Amount Paid',
        'Balance Due',
        'Payment Status',
        'Status'
    ];

    const lines = [
        headers.join(','),
        ...invoices.map(r => {
            const isInterState = isInterStateSupply(r);
            const total = toCurr(r.total_amount ?? 0);
            const tax = toCurr(r.tax_total ?? 0);
            const taxable = toCurr(r.subtotal ?? (total - tax));
            const cgst = isInterState ? '0.00' : (tax / 2).toFixed(2);
            const sgst = isInterState ? '0.00' : (tax / 2).toFixed(2);
            const igst = isInterState ? tax.toFixed(2) : '0.00';

            return [
                `"${r.invoice_no || r.id || ''}"`,
                `"${r.document_type || 'Invoice'}"`,
                `"${r.issue_date ? new Date(r.issue_date).toLocaleDateString('en-IN') : ''}"`,
                `"${(r.client_name || '').replace(/"/g, '""')}"`,
                `"${r.client_gst || ''}"`,
                `"${r.place_of_supply || 'Maharashtra'}"`,
                `"${r.place_of_supply_code || '27'}"`,
                `"${r.gst_type || (isInterState ? 'IGST' : 'CGST_SGST')}"`,
                taxable.toFixed(2),
                cgst,
                sgst,
                igst,
                tax.toFixed(2),
                total.toFixed(2),
                Number(r.amount_paid || 0).toFixed(2),
                Number(r.balance_due || (total - Number(r.amount_paid || 0))).toFixed(2),
                `"${r.payment_status || ''}"`,
                `"${r.status || ''}"`
            ].join(',');
        })
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const periodStr = options.periodLabel ? `_${options.periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_')}` : '';
    a.download = options.filename || `GST_Detailed_Sales_Register${periodStr}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
}
