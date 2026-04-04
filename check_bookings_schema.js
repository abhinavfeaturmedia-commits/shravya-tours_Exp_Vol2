import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: './backend/.env' });

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

async function test() {
    try {
        const [rows] = await pool.query('DESCRIBE bookings');
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error('MySQL Error:', e.message);
    }
    process.exit(0);
}
test();
