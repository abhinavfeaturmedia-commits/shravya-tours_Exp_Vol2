const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config({ path: './backend/.env' });

async function check() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 5
    });

    try {
        console.log('--- PLANS ---');
        const [plans] = await pool.query('SELECT * FROM incentive_plans');
        console.log(JSON.stringify(plans, null, 2));

        console.log('--- RULES ---');
        const [rules] = await pool.query('SELECT * FROM incentive_rules');
        console.log(JSON.stringify(rules, null, 2));

        console.log('--- RUNS ---');
        const [runs] = await pool.query('SELECT * FROM incentive_runs');
        console.log(JSON.stringify(runs, null, 2));

        console.log('--- SUMMARIES ---');
        const [sums] = await pool.query('SELECT * FROM incentive_employee_summaries');
        console.log(JSON.stringify(sums, null, 2));

        console.log('--- BOOKINGS SUMMARY ---');
        const [bSummary] = await pool.query(`
            SELECT status, payment_status, COUNT(*) as cnt, MIN(booking_date) as min_date, MAX(booking_date) as max_date 
            FROM bookings 
            GROUP BY status, payment_status
        `);
        console.log(JSON.stringify(bSummary, null, 2));

        console.log('--- RECENT BOOKINGS (last 10) ---');
        const [recentB] = await pool.query(`
            SELECT id, booking_number, customer_name, total_price, status, payment_status, assigned_to, assigned_staff_ids, booking_date 
            FROM bookings 
            ORDER BY booking_date DESC 
            LIMIT 10
        `);
        console.log(JSON.stringify(recentB, null, 2));

        console.log('--- SUPPLIER BOOKINGS SAMPLE ---');
        const [sup] = await pool.query(`
            SELECT id, booking_id, cost, paid_amount, payment_status, booking_status 
            FROM supplier_bookings 
            LIMIT 10
        `);
        console.log(JSON.stringify(sup, null, 2));

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await pool.end();
    }
}

check();

