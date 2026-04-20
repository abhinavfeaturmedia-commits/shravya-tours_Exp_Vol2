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
        
        console.log("Searching for tables with 'booking_id'...");
        const [cols] = await pool.query(`
            SELECT TABLE_NAME, COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE (COLUMN_NAME = 'booking_id' OR COLUMN_NAME = 'bookingId')
            AND TABLE_SCHEMA = ?
        `, [process.env.DB_NAME]);
        
        console.table(cols);
        
        console.log("\nSearching for Foreign Keys on 'bookings' table...");
        const [fks] = await pool.query(`
            SELECT 
                TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
            FROM
                INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE
                REFERENCED_TABLE_NAME = 'bookings'
                AND TABLE_SCHEMA = ?
        `, [process.env.DB_NAME]);
        
        console.table(fks);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
