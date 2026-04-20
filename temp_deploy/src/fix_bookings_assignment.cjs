const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function fixBookingsAssignment() {
    let pool;
    try {
        console.log("Connecting to remote DB...");
        pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            connectTimeout: 20000
        });

        console.log("Fetching bookings with NULL assigned_to...");
        const [bookings] = await pool.query('SELECT id, customer_email, customer_phone, customer_name FROM bookings WHERE assigned_to IS NULL OR assigned_to = ""');
        console.log(`Found ${bookings.length} unassigned bookings.`);

        let updatedCount = 0;

        for (const booking of bookings) {
            // Find a matching lead that was converted
            let query = 'SELECT id, assigned_to FROM leads WHERE assigned_to IS NOT NULL AND status = "CONVERTED" AND (';
            let params = [];
            let conditions = [];

            if (booking.customer_email && booking.customer_email.trim() !== '') {
                conditions.push('email = ?');
                params.push(booking.customer_email.trim());
            }
            if (booking.customer_phone && booking.customer_phone.trim() !== '') {
                conditions.push('phone = ?');
                params.push(booking.customer_phone.trim());
            }
            if (booking.customer_name && booking.customer_name.trim() !== '') {
                conditions.push('name = ?');
                params.push(booking.customer_name.trim());
            }

            if (conditions.length === 0) continue; // nothing to match on

            query += conditions.join(' OR ') + ') ORDER BY updated_at DESC LIMIT 1';

            const [leads] = await pool.query(query, params);

            if (leads.length > 0) {
                const assignedTo = leads[0].assigned_to;
                console.log(`Booking ${booking.id} (${booking.customer_name}) matches Lead ${leads[0].id}. Assigning to ${assignedTo}.`);
                
                await pool.query('UPDATE bookings SET assigned_to = ? WHERE id = ?', [assignedTo, booking.id]);
                updatedCount++;
            } else {
                console.log(`No converted lead found for Booking ${booking.id} (${booking.customer_name}).`);
            }
        }

        console.log(`\nDone! Successfully assigned ${updatedCount} bookings from past leads.`);
    } catch (e) {
        console.error("Failed:", e);
    } finally {
        if (pool) {
            await pool.end();
        }
    }
}

fixBookingsAssignment();
