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
        const [rows] = await pool.query(`
            SELECT t.*, b.customer_name as customer, b.customer_email as email, b.customer_phone as phone, b.tour_id as packageId
            FROM booking_transactions t
            LEFT JOIN bookings b ON t.booking_id = b.id
            ORDER BY t.created_at DESC
        `);
        console.log('SUCCESS - rows returned:', rows.length);
        rows.forEach(r => console.log(`  ID:${r.id} | Customer:${r.customer || 'NULL'} | Amount:${r.amount} | Status:${r.status}`));
    } catch (e) {
        console.error('FAILED:', e.message);
    } finally {
        pool.end();
    }
}
test();
