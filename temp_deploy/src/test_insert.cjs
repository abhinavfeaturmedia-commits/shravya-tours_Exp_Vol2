const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function check() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });
        
        console.log("Testing bookings INSERT query...");
        try {
            const dbBooking = {
                customer_name: "Test Customer",
                email: "test@example.com",
                phone: "1234567890",
                date: "2026-03-25",
                amount: 50000,
                status: "Pending",
                payment_status: "Unpaid",
                invoice_no: "INV-TEST123",
                package_title: "Trip to Goa",
                customer_id: "CU-123456"
            };

            const columns = Object.keys(dbBooking);
            const values = Object.values(dbBooking).map(v => typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
            const placeholders = columns.map(() => '?').join(', ');
            const colNames = columns.map(c => `\`${c}\``).join(', ');

            const [result] = await pool.query(
                `INSERT INTO \`bookings\` (${colNames}) VALUES (${placeholders})`,
                values
            );
            console.log("Query Success! Insert ID:", result.insertId);
        } catch (e) {
            console.log("Query ERROR:", e.message);
        }

        process.exit(0);
    } catch (e) {
        console.error("Connection ERROR:", e.message);
        process.exit(1);
    }
}
check();
