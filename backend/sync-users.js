import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

async function syncUsers() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        console.log(`Connected to host: ${process.env.DB_HOST}, db: ${process.env.DB_NAME}`);

        // Ensure users table exists just in case
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'staff',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Fetch all staff members
        const [staffMembers] = await pool.query('SELECT * FROM staff_members');
        console.log(`Found ${staffMembers.length} staff members.`);

        const defaultPassword = 'password123';
        const hash = await bcrypt.hash(defaultPassword, 10);

        for (const staff of staffMembers) {
            // Check if user exists
            const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [staff.email]);

            if (users.length === 0) {
                // Insert missing user
                await pool.query('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', [staff.email, hash, staff.role || 'staff']);
                console.log(`Created user for staff: ${staff.email} with default password: ${defaultPassword}`);
            } else {
                // If it's the requested user or we just want to reset all, let's reset it to be safe
                // Only resetting the specific one mentioned just in case they forgot it.
                if (staff.email === 'abhinavgaikwad063@gmail.com') {
                    await pool.query('UPDATE users SET password_hash = ? WHERE email = ?', [hash, staff.email]);
                    console.log(`Reset password for: ${staff.email} to: ${defaultPassword}`);
                } else {
                    console.log(`User already exists for: ${staff.email}`);
                }
            }
        }
    } catch (err) {
        console.error('Error syncing users:', err.message);
    } finally {
        await pool.end();
    }
}

syncUsers();
