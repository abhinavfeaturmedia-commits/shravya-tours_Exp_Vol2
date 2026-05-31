import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, 'backend', '.env') });

const pool = await mysql.createPool({
    host: process.env.DB_HOST || 'srv2205.hstgr.io',
    user: process.env.DB_USER || 'u452305925_shravya_admin',
    password: process.env.DB_PASSWORD || 'Shravya@2026',
    database: process.env.DB_NAME || 'u452305925_shravya_v1',
    waitForConnections: true,
    connectionLimit: 1,
});

console.log('\n=== USERS TABLE ===');
const [users] = await pool.query('SELECT id, email, role, LEFT(password_hash, 30) as hash_preview, created_at FROM users LIMIT 20');
console.table(users);

console.log('\n=== STAFF vs USERS (joined) ===');
const [staff] = await pool.query(`
    SELECT sm.id as staff_id, sm.email, sm.user_type, sm.status,
           CASE WHEN u.id IS NOT NULL THEN 'YES' ELSE 'NO' END as has_user_record,
           u.role as user_role
    FROM staff_members sm
    LEFT JOIN users u ON u.email = sm.email
    LIMIT 20
`);
console.table(staff);

// Test a specific bcrypt comparison
if (users.length > 0 && users[0].hash_preview) {
    console.log('\nNote: password_hash exists for', users.length, 'user(s)');
    console.log('First user:', users[0].email, '| Role:', users[0].role);
}

await pool.end();
