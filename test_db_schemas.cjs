const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config({ path: './backend/.env' });

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

async function run() {
    try {
        for (const table of ['leads', 'bookings', 'tasks', 'follow_ups']) {
            const [rows] = await pool.query(`DESCRIBE \`${table}\``);
            console.log(`\n================ SCHEMA FOR ${table.toUpperCase()} ================`);
            console.table(rows);
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
