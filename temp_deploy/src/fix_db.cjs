const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function fixDB() {
    try {
        console.log("Connecting to remote DB...");
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            connectTimeout: 20000
        });

        console.log("Dropping users table...");
        await pool.query('DROP TABLE IF EXISTS users');

        console.log("Recreating users table with AUTO_INCREMENT...");
        await pool.query(`
            CREATE TABLE users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'staff',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log("Done! Users table is ready.");
        process.exit(0);
    } catch (e) {
        console.error("Failed:", e);
        process.exit(1);
    }
}

fixDB();
