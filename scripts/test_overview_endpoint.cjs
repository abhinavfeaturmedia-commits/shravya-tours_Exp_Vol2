const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config({ path: './backend/.env' });

async function testOverview(monthYear) {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 5
    });

    try {
        console.log(`\n--- TESTING OVERVIEW FOR monthYear = '${monthYear}' ---`);
        let runFilter = '';
        const runParams = [];
        const isSpecificMonth = monthYear && monthYear !== 'all';
        if (isSpecificMonth) {
            runFilter += ' AND r.month_year = ?';
            runParams.push(monthYear);
        }

        const [runs] = await pool.query(`
            SELECT 
                COALESCE(SUM(total_booking_value), 0) as eligibleBookingValue,
                COALESCE(SUM(total_gross_profit), 0) as grossProfit,
                COALESCE(SUM(total_incentive), 0) as totalIncentiveCalculated,
                COALESCE(SUM(maximum_capacity), 0) as maximumCapacity,
                COALESCE(SUM(gp_protection_limit), 0) as gpProtectionLimit
            FROM incentive_runs r
            WHERE r.status != 'REJECTED' ${runFilter}
        `, runParams);

        let eligibleValue = parseFloat(runs[0]?.eligibleBookingValue || 0);
        let grossProfit = parseFloat(runs[0]?.grossProfit || 0);
        let totalIncentive = parseFloat(runs[0]?.totalIncentiveCalculated || 0);
        let maximumCapacity = parseFloat(runs[0]?.maximumCapacity || 0);
        let isLiveProjection = false;
        let liveBookingCount = 0;

        if (isSpecificMonth && eligibleValue === 0) {
            const [liveBookings] = await pool.query(`
                SELECT id, total_price, status, payment_status, assigned_to, assigned_staff_ids 
                FROM bookings 
                WHERE DATE_FORMAT(booking_date, '%Y-%m') = ?
            `, [monthYear]);

            if (liveBookings.length > 0) {
                let liveEligibleVal = 0;
                let liveTotalCost = 0;
                let liveCount = 0;

                for (const b of liveBookings) {
                    const bStatus = (b.status || '').toLowerCase().trim();
                    const pStatus = (b.payment_status || '').toLowerCase().trim();
                    if (bStatus !== 'completed' || pStatus !== 'paid') continue;

                    const [suppliers] = await pool.query(`
                        SELECT cost, paid_amount FROM supplier_bookings WHERE booking_id = ?
                    `, [b.id]);

                    let cost = 0;
                    let unsettled = false;
                    for (const s of suppliers) {
                        const sc = parseFloat(s.cost || 0);
                        const sp = parseFloat(s.paid_amount || 0);
                        cost += sc;
                        if (sc > 0 && sc > sp) unsettled = true;
                    }
                    if (unsettled) continue;

                    liveCount++;
                    const price = parseFloat(b.total_price || 0);
                    liveEligibleVal += price;
                    liveTotalCost += cost;
                }

                if (liveCount > 0) {
                    eligibleValue = liveEligibleVal;
                    grossProfit = Math.max(0, liveEligibleVal - liveTotalCost);
                    totalIncentive = (eligibleValue * 2.0) / 100;
                    const maxCapBooking = (eligibleValue * 7.0) / 100;
                    const gpLimit = (grossProfit * 40.0) / 100;
                    maximumCapacity = Math.min(maxCapBooking, gpLimit);
                    isLiveProjection = true;
                    liveBookingCount = liveCount;
                }
            }
        }

        console.log({
            eligibleValue,
            grossProfit,
            totalIncentive,
            maximumCapacity,
            isLiveProjection,
            liveBookingCount
        });

    } finally {
        await pool.end();
    }
}

async function run() {
    await testOverview('2026-10');
    await testOverview('all');
    await testOverview('2026-06');
}
run();

