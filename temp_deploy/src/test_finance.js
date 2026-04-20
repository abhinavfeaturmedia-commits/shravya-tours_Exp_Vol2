import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        const [txRows] = await pool.query(`
            SELECT 
                t.id, t.date, t.amount, t.type, t.method, t.reference, t.notes, t.status, t.receipt_url,
                t.booking_id as bookingId, t.created_at,
                b.customer_name as customer, b.customer_email as email, b.customer_phone as phone, b.tour_id as packageId,
                'booking_payment' as source
            FROM booking_transactions t
            LEFT JOIN bookings b ON t.booking_id = b.id
        `);

        const [expRows] = await pool.query(`
            SELECT 
                id, date, amount, 'Expense' as type, paymentMethod as method, notes as reference, notes, status, receiptUrl as receipt_url,
                NULL as bookingId, created_at,
                title as customer, NULL as email, NULL as phone, category as packageId,
                'expense' as source
            FROM expenses
        `);

        const combined = [...txRows, ...expRows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        console.log('Combined rows:', combined.length);
        combined.forEach(r => console.log(`  [${r.source}] ${r.customer} | ${r.amount} | ${r.status}`));
    } catch (e) {
        console.error('FAILED:', e.message);
    } finally {
        pool.end();
    }
}
test();
