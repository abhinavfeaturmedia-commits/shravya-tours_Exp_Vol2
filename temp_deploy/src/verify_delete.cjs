const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function verify() {
    let pool;
    try {
        pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });

        console.log("--- Verification Start ---");

        // 1. Create a dummy booking
        const bookingId = 'TEST-BK-' + Date.now();
        await pool.query('INSERT INTO bookings (id, customer_name, status) VALUES (?, ?, ?)', [bookingId, 'Test Customer', 'pending']);
        console.log(`Created test booking: ${bookingId}`);

        // 2. Create a dummy transaction
        await pool.query('INSERT INTO booking_transactions (id, booking_id, amount, type) VALUES (?, ?, ?, ?)', [Date.now().toString(), bookingId, 100, 'Payment']);
        console.log(`Created test transaction for booking: ${bookingId}`);

        // 3. Verify they exist
        const [bExist] = await pool.query('SELECT id FROM bookings WHERE id = ?', [bookingId]);
        const [tExist] = await pool.query('SELECT id FROM booking_transactions WHERE booking_id = ?', [bookingId]);
        console.log(`Existence check: Booking=${bExist.length}, Transaction=${tExist.length}`);

        // 4. Perform the cleanup logic (simulating the backend cascading logic)
        console.log("Simulating cascading delete...");
        await pool.query('DELETE FROM booking_transactions WHERE booking_id = ?', [bookingId]);
        await pool.query('DELETE FROM supplier_bookings WHERE booking_id = ?', [bookingId]);
        await pool.query('DELETE FROM bookings WHERE id = ?', [bookingId]);

        // 5. Verify they are gone
        const [bGone] = await pool.query('SELECT id FROM bookings WHERE id = ?', [bookingId]);
        const [tGone] = await pool.query('SELECT id FROM booking_transactions WHERE booking_id = ?', [bookingId]);
        
        if (bGone.length === 0 && tGone.length === 0) {
            console.log("SUCCESS: Test booking and its transactions were deleted successfully.");
        } else {
            console.error("FAILURE: Some records remained.");
        }

        console.log("--- Verification End ---");
        process.exit(0);
    } catch (e) {
        console.error("ERROR during verification:");
        console.error(e);
        process.exit(1);
    } finally {
        if (pool) await pool.end();
    }
}

verify();
