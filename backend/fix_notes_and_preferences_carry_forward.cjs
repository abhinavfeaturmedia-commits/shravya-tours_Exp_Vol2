const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

function normalisePhone(phone) {
    if (!phone) return '';
    let cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
        cleaned = cleaned.slice(2);
    } else if (cleaned.length > 10 && cleaned.startsWith('0')) {
        cleaned = cleaned.replace(/^0+/, '');
    }
    return cleaned;
}

async function run() {
    console.log('=== STARTING NOTES & PREFERENCES CARRY-FORWARD REPAIR ===');
    const pool = mysql.createPool({ 
        host: process.env.DB_HOST, 
        user: process.env.DB_USER, 
        password: process.env.DB_PASSWORD, 
        database: process.env.DB_NAME
    });

    try {
        // 1. Backfill booking_notes from lead_logs for all converted leads
        console.log('1. Backfilling booking_notes from lead_logs...');
        const [convertedLeads] = await pool.query(`
            SELECT l.id as lead_id, l.converted_booking_id, l.destination, l.budget, l.travelers, l.preferences, l.email, l.phone
            FROM leads l
            WHERE l.status = 'Converted' OR l.converted_booking_id IS NOT NULL
        `);

        let updatedBookingsCount = 0;
        let updatedCustomersCount = 0;

        for (const lead of convertedLeads) {
            // Fetch lead logs
            const [logs] = await pool.query('SELECT * FROM lead_logs WHERE lead_id = ? ORDER BY timestamp ASC', [lead.lead_id]);
            
            if (logs.length > 0) {
                const inheritedBookingNotes = logs.map(l => ({
                    id: `NOTE-LD-${l.id}`,
                    text: `[Lead Log - ${l.type}]: ${l.content}`,
                    author: l.sender || 'System',
                    date: l.timestamp ? new Date(l.timestamp).toISOString() : new Date().toISOString()
                }));

                // Find matching booking
                let bookingId = lead.converted_booking_id;
                if (!bookingId) {
                    const [bRows] = await pool.query('SELECT id FROM bookings WHERE lead_id = ? LIMIT 1', [lead.lead_id]);
                    if (bRows.length > 0) bookingId = bRows[0].id;
                }

                if (bookingId) {
                    // Fetch current booking_notes
                    const [[bRow]] = await pool.query('SELECT booking_notes FROM bookings WHERE id = ?', [bookingId]);
                    if (bRow) {
                        let existingNotes = [];
                        try {
                            if (typeof bRow.booking_notes === 'string') existingNotes = JSON.parse(bRow.booking_notes);
                            else if (Array.isArray(bRow.booking_notes)) existingNotes = bRow.booking_notes;
                        } catch { existingNotes = []; }

                        const existingIds = new Set(existingNotes.map(n => n.id));
                        const newNotes = inheritedBookingNotes.filter(n => !existingIds.has(n.id));

                        if (newNotes.length > 0) {
                            const mergedNotes = [...existingNotes, ...newNotes];
                            await pool.query('UPDATE bookings SET booking_notes = ? WHERE id = ?', [JSON.stringify(mergedNotes), bookingId]);
                            updatedBookingsCount++;
                        }
                    }
                }
            }

            // 2. Backfill Customer notes and preferences from lead
            const cleanEmail = (lead.email || '').trim().toLowerCase();
            const cleanPhone = normalisePhone(lead.phone);
            
            let custId = null;
            if (cleanEmail) {
                const [cRows] = await pool.query('SELECT id, notes, preferences FROM customers WHERE LOWER(email) = ? LIMIT 1', [cleanEmail]);
                if (cRows.length > 0) custId = cRows[0];
            }
            if (!custId && cleanPhone && cleanPhone.length >= 10) {
                const last10 = cleanPhone.slice(-10);
                const [cRows] = await pool.query(`SELECT id, notes, preferences FROM customers WHERE REPLACE(phone, ' ', '') LIKE CONCAT('%', ?, '%') LIMIT 1`, [last10]);
                if (cRows.length > 0) custId = cRows[0];
            }

            if (custId) {
                let custNotes = [];
                try {
                    if (typeof custId.notes === 'string') custNotes = JSON.parse(custId.notes);
                    else if (Array.isArray(custId.notes)) custNotes = custId.notes;
                } catch { custNotes = []; }

                const inheritedCustNotes = logs.map(l => ({
                    id: `NOTE-CUST-LD-${l.id}`,
                    text: `[From Lead]: ${l.content}`,
                    author: l.sender || 'System',
                    date: l.timestamp ? new Date(l.timestamp).toISOString() : new Date().toISOString()
                }));

                const custNoteIds = new Set(custNotes.map(n => n.id));
                const newCustNotes = inheritedCustNotes.filter(n => !custNoteIds.has(n.id));

                let parsedPrefs = {};
                if (typeof lead.preferences === 'string' && lead.preferences.trim() !== '') {
                    try { parsedPrefs = JSON.parse(lead.preferences); } catch {
                        parsedPrefs = { note: lead.preferences };
                    }
                } else if (typeof lead.preferences === 'object' && lead.preferences !== null) {
                    parsedPrefs = lead.preferences;
                }

                let custPrefs = {};
                try {
                    if (typeof custId.preferences === 'string') custPrefs = JSON.parse(custId.preferences);
                    else if (typeof custId.preferences === 'object' && custId.preferences !== null) custPrefs = custId.preferences;
                } catch { custPrefs = {}; }

                const mergedCustPrefs = { ...custPrefs, ...parsedPrefs };

                if (newCustNotes.length > 0 || Object.keys(parsedPrefs).length > 0) {
                    const finalNotes = [...custNotes, ...newCustNotes];
                    await pool.query(
                        'UPDATE customers SET notes = ?, preferences = ? WHERE id = ?',
                        [JSON.stringify(finalNotes), JSON.stringify(mergedCustPrefs), custId.id]
                    );
                    updatedCustomersCount++;
                }
            }
        }

        console.log(`- Updated booking notes on ${updatedBookingsCount} booking(s)`);
        console.log(`- Updated customer notes & preferences on ${updatedCustomersCount} customer profile(s)`);
        console.log('✅ NOTES & PREFERENCES REPAIR COMPLETE');
    } catch (e) {
        console.error('❌ REPAIR ERROR:', e);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

run();
