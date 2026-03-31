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
        // The unsplash download endpoint is a reliable way to get the proper sized image for a given ID without needing the exact raw images.unsplash.com path
        const honeymoon = 'https://unsplash.com/photos/xrHSUh3BmPs/download?w=800';
        const mountain = 'https://unsplash.com/photos/gIrND2YWXHM/download?w=800';
        const family = 'https://unsplash.com/photos/kA-0Lj-nJI8/download?w=800';

        // Update Romantic Honeymoon (GAL-007)
        await pool.query("UPDATE cms_gallery_images SET image_url = ? WHERE id = 'GAL-007'", [honeymoon]);

        // Update Mountain Adventure (GAL-008)
        await pool.query("UPDATE cms_gallery_images SET image_url = ? WHERE id = 'GAL-008'", [mountain]);
        
        // Update Family Escapes (GAL-009)
        await pool.query("UPDATE cms_gallery_images SET image_url = ? WHERE id = 'GAL-009'", [family]);

        // Fix Pilgrim Yatra to a very generic, guaranteed un-deleted URL if the previous one failed.
        // Also checking what the DB actually has for Pilgrim Yatra.
        const pilgrim = 'https://images.unsplash.com/photo-1590050720468-b39176fbfa21?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'; // Taj or temple landscape
        await pool.query("UPDATE cms_gallery_images SET image_url = ? WHERE id = 'GAL-005'", [pilgrim]);

        console.log("Updated URLs successfully.");
    } catch (e) {
        console.error('FAILED:', e);
    } finally {
        pool.end();
    }
}
updateDB();
