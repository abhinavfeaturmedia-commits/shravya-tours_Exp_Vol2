const mysql = require('mysql2/promise');
require('dotenv').config({path: 'backend/.env'});

async function run() {
    const pool = mysql.createPool({ 
        host: process.env.DB_HOST, 
        user: process.env.DB_USER, 
        password: process.env.DB_PASSWORD, 
        database: process.env.DB_NAME
    });

    await pool.query("UPDATE follow_ups SET lead_id = 'LD-1774548951330', notes = 'Please call to discuss the Goa package.', scheduled_at = NOW() WHERE id = '1'");
    await pool.query("UPDATE follow_ups SET lead_id = 'LD-1774629580693', notes = 'Send follow up email with itinerary details.', scheduled_at = DATE_ADD(NOW(), INTERVAL 1 DAY) WHERE id = '2'");
    await pool.query("UPDATE follow_ups SET lead_id = 'LD-1774629932583', notes = 'Confirm the booking deposit.', scheduled_at = NOW() WHERE id = '208d2625-0ff4-4d99-a9d7-9cc46dab6815'");

    console.log('Fixed DB rows'); 
    process.exit(0);
}
run();
