import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function migrate() {
    console.log('Connecting to database...');
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('Checking if gallery column exists in packages table...');
        const [columns] = await pool.query('SHOW COLUMNS FROM packages LIKE "gallery"');
        
        if (Array.isArray(columns) && columns.length === 0) {
            console.log('Adding gallery column to packages table...');
            // Using TEXT to store JSON string of images
            await pool.query('ALTER TABLE packages ADD COLUMN gallery TEXT AFTER image');
            console.log('Successfully added gallery column.');
        } else {
            console.log('Gallery column already exists.');
        }

        // Also check if builder_data exists (it should based on fix_packages_all_columns_v2.sql but let's be sure)
        const [builderDataCol] = await pool.query('SHOW COLUMNS FROM packages LIKE "builder_data"');
        if (Array.isArray(builderDataCol) && builderDataCol.length === 0) {
            console.log('Adding builder_data column to packages table...');
            await pool.query('ALTER TABLE packages ADD COLUMN builder_data TEXT');
            console.log('Successfully added builder_data column.');
        }

    } catch (error) {
        console.error('Migration failed:', error.message);
    } finally {
        await pool.end();
        console.log('Database connection closed.');
    }
}

migrate();
