const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const pathsToTry = [
    path.join(__dirname, '.env'),
    path.join(__dirname, '..', '.env.local'),
    path.join(__dirname, '..', '.env')
];

for (const envPath of pathsToTry) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        console.log(`Loaded environment from: ${envPath}`);
        break;
    }
}

function parseDateStr(val) {
    if (!val) return null;
    if (val instanceof Date) {
        const iso = val.toISOString().split('T')[0];
        if (iso.startsWith('1899') || iso.startsWith('0000') || iso.startsWith('1970-01-01')) return null;
        return iso;
    }
    const s = String(val).trim();
    if (s.startsWith('1899') || s.startsWith('0000') || s.startsWith('1970-01-01')) return null;
    if (s.includes('T')) return s.split('T')[0];

    // YYYY-MM-DD
    const iso = s.match(/\b\d{4}-\d{2}-\d{2}\b/);
    if (iso) return iso[0];

    // DD-MM-YYYY or DD/MM/YYYY
    const dmy = s.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/);
    if (dmy) {
        const [, d, m, y] = dmy;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    return null;
}

function parseRangeStr(rangeStr) {
    if (!rangeStr) return { from: null, to: null };
    const s = String(rangeStr).trim();
    if (s.startsWith('1899') || s.startsWith('0000')) return { from: null, to: null };

    const parts = s.split(/\s+to\s+|\s*-\s*|\s*–\s*|\s*,\s*/i);
    const from = parseDateStr(parts[0]);
    const to = parts.length > 1 ? parseDateStr(parts[1]) : null;
    return { from, to };
}

async function runBackfill() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 5,
        connectTimeout: 30000
    });

    try {
        console.log("=== Backfilling and Repairing Invoice Travel Dates ===");
        const [invoices] = await pool.query(`
            SELECT id, invoice_no, travel_dates, travel_date_from, travel_date_to, booking_id, lead_id 
            FROM invoices 
            ORDER BY created_at DESC
        `);

        console.log(`Inspecting ${invoices.length} invoices...`);
        let fixedCount = 0;

        for (const inv of invoices) {
            let from = parseDateStr(inv.travel_date_from);
            let to = parseDateStr(inv.travel_date_to);
            let needsUpdate = false;

            // Check if existing travel_date_from was 1899 or 0000 or null
            const rawFromStr = String(inv.travel_date_from || '');
            const rawToStr = String(inv.travel_date_to || '');
            if (rawFromStr.startsWith('1899') || rawFromStr.startsWith('0000')) {
                from = null;
                needsUpdate = true;
            }
            if (rawToStr.startsWith('1899') || rawToStr.startsWith('0000')) {
                to = null;
                needsUpdate = true;
            }

            // Tier 2: Check travel_dates string
            if (!from && inv.travel_dates) {
                const parsed = parseRangeStr(inv.travel_dates);
                if (parsed.from) {
                    from = parsed.from;
                    if (!to && parsed.to) to = parsed.to;
                    needsUpdate = true;
                }
            }

            // Tier 3: Check linked booking
            if ((!from || !to) && inv.booking_id) {
                const [bRows] = await pool.query(
                    'SELECT booking_date, end_date FROM bookings WHERE id = ?', 
                    [inv.booking_id]
                );
                if (bRows.length > 0) {
                    const b = bRows[0];
                    const bStart = parseDateStr(b.booking_date);
                    const bEnd = parseDateStr(b.end_date);
                    if (!from && bStart) {
                        from = bStart;
                        needsUpdate = true;
                    }
                    if (!to && bEnd) {
                        to = bEnd;
                        needsUpdate = true;
                    }
                }
            }

            // Tier 3b: Check linked lead
            if ((!from || !to) && inv.lead_id) {
                const [lRows] = await pool.query(
                    'SELECT start_date, end_date FROM leads WHERE id = ?', 
                    [inv.lead_id]
                );
                if (lRows.length > 0) {
                    const l = lRows[0];
                    const lStart = parseDateStr(l.start_date);
                    const lEnd = parseDateStr(l.end_date);
                    if (!from && lStart) {
                        from = lStart;
                        needsUpdate = true;
                    }
                    if (!to && lEnd) {
                        to = lEnd;
                        needsUpdate = true;
                    }
                }
            }

            // Tier 4: Check invoice_items
            if (!from || !to) {
                const [itRows] = await pool.query(
                    'SELECT date_from, date_to FROM invoice_items WHERE invoice_id = ? AND (date_from IS NOT NULL OR date_to IS NOT NULL)', 
                    [inv.id]
                );
                for (const it of itRows) {
                    const itFrom = parseDateStr(it.date_from);
                    const itTo = parseDateStr(it.date_to);
                    if (!from && itFrom) { from = itFrom; needsUpdate = true; }
                    if (!to && itTo) { to = itTo; needsUpdate = true; }
                }
            }

            // If to is null but from exists, default to from if single day
            if (from && !to) {
                to = from;
                needsUpdate = true;
            }

            if (needsUpdate) {
                const syncedTravelDates = from ? `${from}${to && to !== from ? ' to ' + to : ''}` : inv.travel_dates;
                await pool.query(
                    'UPDATE invoices SET travel_date_from = ?, travel_date_to = ?, travel_dates = ? WHERE id = ?',
                    [from, to, syncedTravelDates, inv.id]
                );
                console.log(`[Repaired] Invoice ${inv.invoice_no || inv.id}: from=${from}, to=${to}, travel_dates="${syncedTravelDates}"`);
                fixedCount++;
            }
        }

        console.log(`\nSuccessfully backfilled and verified ${fixedCount} invoice records!`);
        process.exit(0);
    } catch (err) {
        console.error("Backfill failed:", err);
        process.exit(1);
    }
}

runBackfill();
