const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 1,
    });

    try {
        console.log('DB Connection details:', {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            database: process.env.DB_NAME
        });

        // Query staff_members
        const [staff] = await pool.query('SELECT id, name, email, role, user_type, department, status, initials, color, permissions FROM staff_members');
        console.log('=== STAFF MEMBERS ===');
        for (const sm of staff) {
            console.log(`ID: ${sm.id} | Name: ${sm.name} | Email: ${sm.email} | Role: ${sm.role} | Type: ${sm.user_type}`);
            console.log('Permissions:', typeof sm.permissions === 'string' ? sm.permissions : JSON.stringify(sm.permissions));
            console.log('--------------------------------------------------');
        }

        // Query users
        const [users] = await pool.query('SELECT id, email, role FROM users');
        console.log('=== USERS ===');
        console.table(users);

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
