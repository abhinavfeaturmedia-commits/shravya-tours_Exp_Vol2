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
    console.log('=== STARTING DATA LINKAGE & ASSIGNMENT REPAIR ===');
    const pool = mysql.createPool({ 
        host: process.env.DB_HOST, 
        user: process.env.DB_USER, 
        password: process.env.DB_PASSWORD, 
        database: process.env.DB_NAME
    });

    try {
        // 1. Backfill lead_id on bookings
        console.log('1. Backfilling lead_id on bookings...');
        const [leadIdRes] = await pool.query(`
            UPDATE bookings b 
            JOIN leads l ON (b.customer_email = l.email AND b.customer_email != '') 
                         OR (b.customer_phone = l.phone AND b.customer_phone != '') 
            SET b.lead_id = l.id 
            WHERE l.status = 'Converted' AND (b.lead_id IS NULL OR b.lead_id = '')
        `);
        console.log(`   - Affected bookings: ${leadIdRes.affectedRows}`);

        // 2. Backfill converted_booking_id on leads
        console.log('2. Backfilling converted_booking_id on leads...');
        const [convBookingRes] = await pool.query(`
            UPDATE leads l
            JOIN bookings b ON b.lead_id = l.id
            SET l.converted_booking_id = b.id
            WHERE l.status = 'Converted' AND (l.converted_booking_id IS NULL OR l.converted_booking_id = '')
        `);
        console.log(`   - Affected leads: ${convBookingRes.affectedRows}`);

        // 3. Backfill customer_id on bookings & leads
        console.log('3. Backfilling customer_id on bookings and leads...');
        const [customers] = await pool.query('SELECT id, email, phone FROM customers');
        let backfilledBookings = 0;
        let backfilledLeads = 0;

        for (const c of customers) {
            const cleanEmail = (c.email || '').trim().toLowerCase();
            const cleanPhone = normalisePhone(c.phone);

            if (cleanEmail) {
                const [bRes] = await pool.query(
                    'UPDATE bookings SET customer_id = ? WHERE (customer_id IS NULL OR customer_id = "") AND LOWER(customer_email) = ?',
                    [c.id, cleanEmail]
                );
                backfilledBookings += bRes.affectedRows;

                const [lRes] = await pool.query(
                    'UPDATE leads SET customer_id = ?, is_returning_customer = 1 WHERE (customer_id IS NULL OR customer_id = "") AND LOWER(email) = ?',
                    [c.id, cleanEmail]
                );
                backfilledLeads += lRes.affectedRows;
            }

            if (cleanPhone && cleanPhone.length >= 10) {
                const last10 = cleanPhone.slice(-10);
                const [bRes] = await pool.query(
                    `UPDATE bookings SET customer_id = ? WHERE (customer_id IS NULL OR customer_id = "") AND REPLACE(customer_phone, ' ', '') LIKE CONCAT('%', ?, '%')`,
                    [c.id, last10]
                );
                backfilledBookings += bRes.affectedRows;

                const [lRes] = await pool.query(
                    `UPDATE leads SET customer_id = ?, is_returning_customer = 1 WHERE (customer_id IS NULL OR customer_id = "") AND REPLACE(phone, ' ', '') LIKE CONCAT('%', ?, '%')`,
                    [c.id, last10]
                );
                backfilledLeads += lRes.affectedRows;
            }
        }
        console.log(`   - Backfilled customer_id on ${backfilledBookings} booking(s) and ${backfilledLeads} lead(s).`);

        // 4. Synchronize assigned_to on all converted bookings to match source lead
        console.log('4. Synchronizing assigned_to between converted leads and bookings...');
        const [syncRes1] = await pool.query(`
            UPDATE bookings b
            JOIN leads l ON (b.lead_id = l.id OR l.converted_booking_id = b.id)
            SET b.assigned_to = l.assigned_to
            WHERE l.assigned_to IS NOT NULL 
              AND (b.assigned_to IS NULL OR b.assigned_to != l.assigned_to)
        `);
        console.log(`   - Direct match assignee sync affected rows: ${syncRes1.affectedRows}`);

        console.log('✅ REPAIR COMPLETE SUCCESSFULLY');
    } catch (e) {
        console.error('❌ REPAIR ERROR:', e);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

run();
