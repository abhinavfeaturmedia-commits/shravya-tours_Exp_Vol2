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
        const [cols] = await pool.query('SHOW COLUMNS FROM bookings');
        console.log('Bookings columns:', cols.map(c => c.Field));
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        pool.end();
    }
}
test();
