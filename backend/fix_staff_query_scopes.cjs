const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function run() {
    console.log('=== UPDATING STAFF QUERY SCOPES TO SHOW ALL QUERIES ===');
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        // Set query_scope to 'Show All Queries' for all active staff members
        const [res] = await pool.query("UPDATE staff_members SET query_scope = 'Show All Queries'");
        console.log(`✓ Successfully updated query_scope to 'Show All Queries' for all ${res.affectedRows} staff members.`);

        const [staff] = await pool.query('SELECT id, name, email, role, user_type, query_scope FROM staff_members');
        console.log('\nUPDATED STAFF SCOPES:', JSON.stringify(staff, null, 2));

    } catch (e) {
        console.error('Failed to update staff query scopes:', e);
    } finally {
        await pool.end();
    }
}

run();
