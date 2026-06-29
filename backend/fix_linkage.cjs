const mysql = require('mysql2/promise');
require('dotenv').config();

async function backfill() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'shravya_tours',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        console.log('Ensuring customer_id exists on bookings...');
        try {
            await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_id VARCHAR(255) DEFAULT NULL");
        } catch (e) {
            console.log("Migration skipped/failed:", e.message);
        }

        console.log('Fetching customers...');
        const [customers] = await pool.query('SELECT id, email, phone FROM customers');
        
        const emailToId = new Map();
        const phoneToId = new Map();
        
        customers.forEach(c => {
            if (c.email && c.email.trim() !== '') {
                emailToId.set(c.email.trim().toLowerCase(), c.id);
            }
            if (c.phone && c.phone.trim() !== '') {
                phoneToId.set(c.phone.trim(), c.id);
            }
        });

        console.log('Fetching bookings without customer_id...');
        const [bookings] = await pool.query('SELECT id, customer_email, customer_phone FROM bookings WHERE customer_id IS NULL OR customer_id = ""');
        
        let backfilled = 0;
        for (const b of bookings) {
            const bEmail = (b.customer_email || '').trim().toLowerCase();
            const bPhone = (b.customer_phone || '').trim();
            const cid = bEmail ? emailToId.get(bEmail) : (bPhone ? phoneToId.get(bPhone) : null);
            if (cid) {
                await pool.query(
                    'UPDATE bookings SET customer_id = ? WHERE id = ?',
                    [cid, b.id]
                );
                backfilled++;
            }
        }
        console.log(`Successfully backfilled ${backfilled} bookings with customer_id.`);
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await pool.end();
    }
}

backfill();
