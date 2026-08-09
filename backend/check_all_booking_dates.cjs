const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const toLocalISO = (d) => {
    if (!d) return '';
    const dateObj = new Date(d);
    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
};

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    const [rows] = await pool.query("SELECT id, booking_number, customer_name, title, booking_date, end_date, duration_days, status, live_status FROM bookings ORDER BY created_at DESC");
    
    console.log('=== ALL BOOKINGS IN MYSQL DB ===');
    rows.forEach(r => {
        const start = toLocalISO(r.booking_date);
        const end = toLocalISO(r.end_date);
        let calcDays = 1;
        if (start && end) {
            const sD = new Date(start);
            const eD = new Date(end);
            calcDays = Math.max(1, Math.round((eD.getTime() - sD.getTime()) / 86400000) + 1);
        }
        console.log(`[BK-${String(r.booking_number || '').padStart(4, '0')}] ${r.customer_name} | Start: ${start} | End: ${end} | DB duration_days: ${r.duration_days} | Calc Days: ${calcDays} | Status: ${r.status}`);
    });

    await pool.end();
}

run();
