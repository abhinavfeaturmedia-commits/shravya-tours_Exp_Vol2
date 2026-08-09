const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const FULL_PERMISSIONS = {
    dashboard: { view: true, manage: true },
    leads: { view: true, manage: true },
    customers: { view: true, manage: true },
    bookings: { view: true, manage: true },
    operations: { view: true, manage: true },
    itinerary: { view: true, manage: true },
    inventory: { view: true, manage: true },
    masters: { view: true, manage: true },
    vendors: { view: true, manage: true },
    finance: { view: true, manage: true },
    invoices: { view: true, manage: true },
    proposals: { view: true, manage: true },
    marketing: { view: true, manage: true },
    staff: { view: true, manage: true },
    reports: { view: true, manage: true },
    audit: { view: true, manage: true },
    settings: { view: true, manage: true },
    cms: { view: true, manage: true },
    partners: { view: true, manage: true },
    memberships: { view: true, manage: true },
    testimonials: { view: true, manage: true }
};

async function run() {
    console.log('=== SYNCING ROHIT SANKPAL ACCOUNTS IN MYSQL DB ===');
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 2,
    });

    try {
        const jsonPerms = JSON.stringify(FULL_PERMISSIONS);

        // 1. Ensure rohit14101987@gmail.com has full permissions in staff_members
        await pool.query(
            "UPDATE staff_members SET permissions = ?, user_type = 'Staff', role = 'Editor' WHERE email = 'rohit14101987@gmail.com'",
            [jsonPerms]
        );

        // 2. Check if rohit_sankpal@yahoo.com exists in staff_members
        const [yahooStaff] = await pool.query("SELECT * FROM staff_members WHERE email = 'rohit_sankpal@yahoo.com'");
        
        if (yahooStaff.length === 0) {
            console.log('Adding rohit_sankpal@yahoo.com into staff_members table with FULL permissions...');
            await pool.query(
                `INSERT INTO staff_members 
                (name, email, role, user_type, department, status, initials, color, permissions, query_scope, whatsapp_scope) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    'Rohit Sankpal',
                    'rohit_sankpal@yahoo.com',
                    'Editor',
                    'Staff',
                    'Sales',
                    'Active',
                    'RS',
                    'indigo',
                    jsonPerms,
                    'Show All Queries',
                    'All Messages'
                ]
            );
            console.log('✓ Added rohit_sankpal@yahoo.com to staff_members table.');
        } else {
            await pool.query(
                "UPDATE staff_members SET permissions = ?, user_type = 'Staff', role = 'Editor' WHERE email = 'rohit_sankpal@yahoo.com'",
                [jsonPerms]
            );
            console.log('✓ Updated rohit_sankpal@yahoo.com permissions in staff_members.');
        }

        // 3. Ensure role in users table for rohit_sankpal@yahoo.com and rohit14101987@gmail.com is set to 'Editor' / 'staff'
        await pool.query("UPDATE users SET role = 'Editor' WHERE email IN ('rohit14101987@gmail.com', 'rohit_sankpal@yahoo.com')");

        console.log('✓ Successfully synced all Rohit Sankpal accounts.');

    } catch (e) {
        console.error('Sync failed:', e);
    } finally {
        await pool.end();
    }
}

run();
