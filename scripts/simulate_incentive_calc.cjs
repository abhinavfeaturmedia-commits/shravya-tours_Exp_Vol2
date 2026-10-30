const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config({ path: './backend/.env' });

async function simulateCalculation(monthYear, periodStart, periodEnd) {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 5
    });

    const conn = await pool.getConnection();
    try {
        console.log(`\n================ SIMULATING FOR ${monthYear} (${periodStart} to ${periodEnd}) ================`);

        // Fetch bookings
        const [bookings] = await conn.query(`
            SELECT 
                id, booking_number, customer_name, total_price, status, payment_status,
                assigned_to, assigned_staff_ids, booking_date, lead_id
            FROM bookings
            WHERE booking_date >= ? AND booking_date <= ?
        `, [periodStart, periodEnd]);

        console.log(`Total Bookings in range: ${bookings.length}`);

        for (const b of bookings) {
            console.log(`Booking #${b.booking_number} | Price: ${b.total_price} | Status: ${b.status} | PayStatus: ${b.payment_status} | Assigned: ${b.assigned_to} / ${b.assigned_staff_ids}`);
            
            // Check eligibility logic
            const issues = [];
            const bStatus = (b.status || '').toLowerCase().trim();
            if (bStatus !== 'completed') issues.push(`Booking status is '${b.status}', must be 'completed'`);
            const pStatus = (b.payment_status || '').toLowerCase().trim();
            if (pStatus !== 'paid') issues.push(`Customer payment status is '${b.payment_status}', must be 'paid'`);
            
            const [suppliers] = await conn.query(`
                SELECT cost, paid_amount, payment_status, booking_status 
                FROM supplier_bookings 
                WHERE booking_id = ?
            `, [b.id]);

            let totalSupplierCost = 0;
            let totalSupplierPaid = 0;
            let unsettledSuppliers = 0;

            for (const sup of suppliers) {
                const cost = parseFloat(sup.cost || 0);
                const paid = parseFloat(sup.paid_amount || 0);
                totalSupplierCost += cost;
                totalSupplierPaid += paid;
                const supPayStatus = (sup.payment_status || '').toLowerCase();
                if (cost > 0 && (cost > paid || (supPayStatus !== 'paid' && supPayStatus !== 'partially paid'))) {
                    unsettledSuppliers++;
                }
            }

            if (unsettledSuppliers > 0) issues.push(`${unsettledSuppliers} supplier booking(s) have pending payments`);

            const [refunds] = await conn.query(`
                SELECT id FROM booking_transactions 
                WHERE booking_id = ? AND type = 'Refund' AND status = 'Pending'
            `, [b.id]);
            if (refunds.length > 0) issues.push('Pending customer refund exists');

            const [overrides] = await conn.query(`
                SELECT id, reason, override_by FROM incentive_booking_overrides WHERE booking_id = ?
            `, [b.id]);

            const hasOverride = overrides.length > 0;
            const isEligible = issues.length === 0 || hasOverride;

            console.log(`  -> Eligible? ${isEligible} | Issues: ${issues.join('; ') || 'None'}`);
        }

    } catch (e) {
        console.error('Simulation error:', e);
    } finally {
        conn.release();
        await pool.end();
    }
}

async function run() {
    await simulateCalculation('2026-10', '2026-10-01', '2026-10-31');
    await simulateCalculation('2026-06', '2026-06-01', '2026-06-30');
}

run();

