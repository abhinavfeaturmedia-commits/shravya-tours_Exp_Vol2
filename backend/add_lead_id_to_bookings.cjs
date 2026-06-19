const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function run() {
    console.log('Connecting to database...');
    const pool = mysql.createPool({ 
        host: process.env.DB_HOST, 
        user: process.env.DB_USER, 
        password: process.env.DB_PASSWORD, 
        database: process.env.DB_NAME
    });

    try {
        console.log('Adding lead_id column to bookings table...');
        await pool.query("ALTER TABLE bookings ADD COLUMN lead_id VARCHAR(64) NULL");
        console.log("Column lead_id added successfully");
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log("Column lead_id already exists");
        } else {
            console.error('Failed to add column:', e);
            process.exit(1);
        }
    }

    try {
        console.log('Adding index on lead_id column for performance...');
        await pool.query("ALTER TABLE bookings ADD INDEX idx_bookings_lead_id (lead_id)");
        console.log("Index idx_bookings_lead_id added successfully");
    } catch (e) {
        if (e.code === 'ER_DUP_KEYNAME') {
            console.log("Index idx_bookings_lead_id already exists");
        } else {
            console.warn('Failed to add index:', e.message);
        }
    }

    try {
        console.log('Backfilling lead_id for existing converted leads...');
        const [result] = await pool.query(`
            UPDATE bookings b 
            JOIN leads l ON (b.customer_email = l.email AND b.customer_email != '') OR (b.customer_phone = l.phone AND b.customer_phone != '') 
            SET b.lead_id = l.id 
            WHERE l.status = 'Converted' AND b.lead_id IS NULL
        `);
        console.log(`Backfill complete. Affected rows: ${result.affectedRows}`);
    } catch (e) {
        console.error('Failed to backfill lead_id:', e);
    }

    console.log('Database migration complete'); 
    await pool.end();
    process.exit(0);
}

run();
