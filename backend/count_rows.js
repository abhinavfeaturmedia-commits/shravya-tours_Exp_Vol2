import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: './.env' });

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

async function count() {
    try {
        const tables = ['leads', 'lead_logs', 'bookings', 'booking_transactions', 'supplier_bookings', 'follow_ups', 'customers', 'audit_logs'];
        console.log("Row counts in tables:");
        for (const t of tables) {
            const [rows] = await pool.query(`SELECT COUNT(*) as cnt FROM \`${t}\``);
            console.log(`${t}: ${rows[0].cnt} rows`);
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
count();
