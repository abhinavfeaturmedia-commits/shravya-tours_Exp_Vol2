import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

async function main() {
    try {
        console.log('Running migrations on host:', process.env.DB_HOST);
        
        // Create table for customer packing checklists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS customer_packing_checklists (
                id VARCHAR(64) PRIMARY KEY,
                booking_id VARCHAR(64) NOT NULL,
                customer_email VARCHAR(255) NOT NULL,
                items LONGTEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('customer_packing_checklists table verified/created');

        // Create table for purchased booking add-ons
        await pool.query(`
            CREATE TABLE IF NOT EXISTS booking_purchased_addons (
                id VARCHAR(64) PRIMARY KEY,
                booking_id VARCHAR(64) NOT NULL,
                addon_id VARCHAR(64) NOT NULL,
                label VARCHAR(255) NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'Pending Payment',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('booking_purchased_addons table verified/created');
        
        console.log('Migrations completed successfully!');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await pool.end();
    }
}
main();
