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
        const [txs] = await pool.query('SELECT * FROM booking_transactions ORDER BY created_at DESC LIMIT 5');
        console.log('Booking Transactions:', txs);

        const [exps] = await pool.query('SELECT * FROM expenses ORDER BY created_at DESC LIMIT 5');
        console.log('Expenses:', exps);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        pool.end();
    }
}
test();
