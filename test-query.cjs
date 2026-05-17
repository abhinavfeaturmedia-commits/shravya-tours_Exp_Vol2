const mysql = require('mysql2/promise');

async function testQuery() {
    try {
        const pool = mysql.createPool({
            host: 'srv2205.hstgr.io',
            user: 'u452305925_shravya_admin',
            password: 'Shravya@2026',
            database: 'u452305925_shravya_v1',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        });

        console.log("Testing booking_transactions query...");
        const [txRows] = await pool.query(`
            SELECT 
                t.id, t.date, t.amount, t.type, t.method, t.reference, t.notes, t.status, t.receipt_url, t.recorded_by,
                t.booking_id as bookingId, t.created_at,
                b.customer_name as customer, b.customer_email as email, b.customer_phone as phone, b.package_id as packageId, b.title as bookingName,
                'booking_payment' as source,
                s.name as recordedByName
            FROM booking_transactions t
            LEFT JOIN bookings b ON t.booking_id = b.id
            LEFT JOIN staff_members s ON t.recorded_by = s.id OR t.recorded_by = s.name
        `);
        console.log("booking_transactions Success. Rows:", txRows.length);
        process.exit(0);
    } catch (e) {
        console.error("Error:", e.message);
        process.exit(1);
    }
}

testQuery();
