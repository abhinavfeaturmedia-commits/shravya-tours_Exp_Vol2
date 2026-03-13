import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: './backend/.env' });

const pool = mysql.createPool({
    host: '127.0.0.1',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

async function test() {
    try {
        const [rows] = await pool.query('SELECT * FROM staff_members LIMIT 1');
        console.log('Success:', rows);
    } catch (e) {
        console.error('MySQL Error:', e.message);
    }
    process.exit(0);
}
test();
