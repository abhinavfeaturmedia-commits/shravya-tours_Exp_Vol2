const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function check() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    console.log('DB Config:', {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        db: process.env.DB_NAME
    });

    // Try actually deleting a booking with the cascading logic
    const [bookings] = await pool.query('SELECT id FROM bookings LIMIT 1');
    if (!bookings.length) {
        console.log('No bookings found in DB');
        process.exit(0);
    }

    const testId = bookings[0].id;
    console.log(`Testing delete flow for booking: ${testId}`);

    // Simulate what the backend does
    const [txBefore] = await pool.query('SELECT COUNT(*) as cnt FROM booking_transactions WHERE booking_id = ?', [testId]);
    const [sbBefore] = await pool.query('SELECT COUNT(*) as cnt FROM supplier_bookings WHERE booking_id = ?', [testId]);
    console.log(`  transactions: ${txBefore[0].cnt}, supplier_bookings: ${sbBefore[0].cnt}`);

    // Check if there are FK constraints
    const [fks] = await pool.query(`
        SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE REFERENCED_TABLE_NAME = 'bookings' AND TABLE_SCHEMA = ?
    `, [process.env.DB_NAME]);
    
    console.log('Foreign Keys referencing bookings:', fks);

    process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
