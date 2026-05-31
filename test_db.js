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
        for (const table of ['lead_logs', 'leads', 'partners', 'partner_commissions']) {
            const [rows] = await pool.query(`DESCRIBE \`${table}\``);
            console.log(`Schema for ${table}:`);
            console.table(rows);
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
test();
