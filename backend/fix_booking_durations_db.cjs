const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const toLocalISO = (d) => {
    if (!d) return '';
    const dateObj = new Date(d);
    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
};

async function run() {
    console.log('=== SYNCING MYSQL BOOKING DURATION_DAYS ===');
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        const [rows] = await pool.query("SELECT id, booking_number, customer_name, booking_date, end_date, duration_days FROM bookings");
        let updatedCount = 0;

        for (const r of rows) {
            const start = toLocalISO(r.booking_date);
            const end = toLocalISO(r.end_date);
            if (start && end) {
                const [sy, sm, sd] = start.split('-').map(Number);
                const [ey, em, ed] = end.split('-').map(Number);
                const calcDays = Math.max(1, Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(sy, sm - 1, sd)) / 86400000) + 1);
                
                if (r.duration_days !== calcDays) {
                    await pool.query("UPDATE bookings SET duration_days = ? WHERE id = ?", [calcDays, r.id]);
                    console.log(`✓ Updated [BK-${String(r.booking_number || '').padStart(4, '0')}] ${r.customer_name}: duration_days set to ${calcDays} (was ${r.duration_days})`);
                    updatedCount++;
                }
            }
        }

        console.log(`\n=== SUCCESS: Updated ${updatedCount} booking duration_days in MySQL DB ===`);
    } catch (e) {
        console.error('Failed to update booking durations:', e);
    } finally {
        await pool.end();
    }
}

run();
