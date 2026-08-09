const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    const cleanStr = String(dateStr).split('T')[0].trim();
    const parts = cleanStr.split(/[-/]/);
    if (parts.length >= 3) {
        let year = parseInt(parts[0], 10);
        let month = parseInt(parts[1], 10) - 1;
        let day = parseInt(parts[2], 10);
        if (parts[0].length <= 2 && parts[2].length === 4) {
            day = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            year = parseInt(parts[2], 10);
        }
        if (!isNaN(year) && !isNaN(month) && !isNaN(day) && year > 1900 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
            const d = new Date(year, month, day);
            d.setHours(0, 0, 0, 0);
            return d;
        }
    }
    const fallback = new Date(dateStr);
    if (!isNaN(fallback.getTime())) {
        fallback.setHours(0, 0, 0, 0);
        return fallback;
    }
    return null;
};

const toLocalISO = (d) => {
    if (!d) return '';
    const dateObj = new Date(d);
    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
};

async function run() {
    console.log('=== VERIFYING OPERATIONS LIVE TOUR CLASSIFICATION ON AUG 9TH ===');
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    const [rows] = await pool.query("SELECT * FROM bookings WHERE id = 'BK-0090' OR booking_number = 90");
    const b = rows[0];

    const formattedDate = toLocalISO(b.booking_date);
    const formattedEndDate = toLocalISO(b.end_date);

    const bookingObj = {
        id: b.id,
        title: b.title,
        customer: b.customer_name,
        date: formattedDate,
        endDate: formattedEndDate,
        durationDays: b.duration_days,
        status: b.status
    };

    const start = parseLocalDate(bookingObj.date);
    let duration = 1;
    if (bookingObj.endDate) {
        const startD = parseLocalDate(bookingObj.date);
        const endD = parseLocalDate(bookingObj.endDate);
        if (startD && endD && endD >= startD) {
            const calcSpan = Math.round((endD.getTime() - startD.getTime()) / 86400000) + 1;
            duration = Math.max(calcSpan, bookingObj.durationDays || 1);
        }
    }

    const end = new Date(start);
    end.setDate(start.getDate() + (duration - 1));
    end.setHours(23, 59, 59, 999);

    const todayAug9 = new Date(2026, 7, 9); // August 9, 2026 local time
    todayAug9.setHours(0, 0, 0, 0);

    const isLiveOnAug9 = start <= todayAug9 && end >= todayAug9;

    console.log(`Booking ID: BK-0090`);
    console.log(`Customer: ${bookingObj.customer}`);
    console.log(`Start Date: ${bookingObj.date} (${start.toDateString()})`);
    console.log(`End Date: ${bookingObj.endDate} (${end.toDateString()})`);
    console.log(`Calculated Duration: ${duration} Days`);
    console.log(`Is Active Live Tour on August 9th, 2026? -> ${isLiveOnAug9 ? '✅ YES (ACTIVE LIVE TOUR)' : '❌ NO'}`);

    await pool.end();
}

run();
