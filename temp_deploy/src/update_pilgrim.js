import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function updateDB() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        // The URL requested by the user for Pilgrim Yatra
        const pilgrim = 'https://unsplash.com/photos/kA-0Lj-nJI8/download?w=800';
        
        // Let's also reset Family Escapes to a real family photo because the user accidentally gave the temple link for Family in the previous message
        const family = 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';

        // Update Pilgrim Yatra (GAL-005)
        await pool.query("UPDATE cms_gallery_images SET image_url = ? WHERE id = 'GAL-005'", [pilgrim]);
        
        // Update Family Escapes (GAL-009)
        await pool.query("UPDATE cms_gallery_images SET image_url = ? WHERE id = 'GAL-009'", [family]);

        console.log("Updated Pilgrim Yatra to the requested image.");
    } catch (e) {
        console.error('FAILED:', e);
    } finally {
        pool.end();
    }
}
updateDB();
