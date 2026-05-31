import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: './backend/.env' });

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

async function run() {
    try {
        console.log("DB Host:", process.env.DB_HOST);
        console.log("DB Name:", process.env.DB_NAME);

        const email = 'abhinavgaikwad063@gmail.com';
        console.log(`\n🔍 Searching for: ${email}`);

        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        console.log("\n--- Users Record ---");
        console.table(users);

        const [staff] = await pool.query('SELECT * FROM staff_members WHERE email = ?', [email]);
        console.log("\n--- Staff Members Record ---");
        console.table(staff);

        const [partners] = await pool.query('SELECT * FROM partners WHERE email = ?', [email]);
        console.log("\n--- Partners Record ---");
        console.table(partners);

        process.exit(0);
    } catch (err) {
        console.error("Database error:", err);
        process.exit(1);
    }
}
run();
