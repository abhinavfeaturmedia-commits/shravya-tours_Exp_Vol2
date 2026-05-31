const mysql = require('mysql2/promise');

async function checkUsers() {
    const pool = await mysql.createPool({
        host: 'srv2205.hstgr.io',
        user: 'u452305925_shravya_admin',
        password: 'Shravya@2026',
        database: 'u452305925_shravya_v1',
        waitForConnections: true,
        connectionLimit: 1,
    });

    try {
        // Show all users
        const [users] = await pool.query('SELECT id, email, role, created_at FROM users LIMIT 20');
        console.log('\n=== USERS TABLE ===');
        console.table(users);

        // Also check staff with no user record
        const [staff] = await pool.query(`
            SELECT sm.id, sm.email, sm.user_type, sm.status,
                   CASE WHEN u.id IS NOT NULL THEN 'YES' ELSE 'NO' END as has_user_record
            FROM staff_members sm
            LEFT JOIN users u ON u.email = sm.email
            LIMIT 20
        `);
        console.log('\n=== STAFF & USER RECORD STATUS ===');
        console.table(staff);

        // Check if the password_hash column exists
        const [cols] = await pool.query("DESCRIBE users");
        console.log('\n=== USERS TABLE COLUMNS ===');
        console.table(cols);

    } finally {
        await pool.end();
    }
}
checkUsers().catch(console.error);
