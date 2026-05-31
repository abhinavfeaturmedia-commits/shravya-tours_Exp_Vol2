import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: './backend/.env' });

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

async function main() {
    try {
        const [rows] = await pool.query('DESCRIBE leads');
        console.log("leads schema:");
        console.table(rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
main();
