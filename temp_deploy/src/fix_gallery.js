import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function fix() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        // 1. Fix the broken Pilgrim Yatra image
        // Replaced with a generic beautiful temple/spiritual image from Unsplash
        await pool.query(
            "UPDATE cms_gallery_images SET image_url = 'https://images.unsplash.com/photo-1598448835260-15bd048eb560?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' WHERE id = 'GAL-005'"
        );
        console.log("Updated Pilgrim Yatra image URL");

        // 2. Add more collections to fill out the "Curated Collections" row
        const newCollections = [
            { id: 'GAL-007', title: 'Romantic Honeymoon', category: 'Romantic', url: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
            { id: 'GAL-008', title: 'Mountain Adventure', category: 'Adventure', url: 'https://images.unsplash.com/photo-1522199755839-a2bacb67c546?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
            { id: 'GAL-009', title: 'Family Escapes', category: 'Family', url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
            { id: 'GAL-010', title: 'Beach Paradise', category: 'Relaxation', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' }
        ];

        for (const item of newCollections) {
            // Use INSERT IGNORE to prevent duplicate ID errors if run multiple times
            await pool.query(
                "INSERT IGNORE INTO cms_gallery_images (id, title, category, image_url) VALUES (?, ?, ?, ?)",
                [item.id, item.title, item.category, item.url]
            );
        }
        console.log("Inserted new curated collections");

        // View final list
        const [rows] = await pool.query('SELECT * FROM cms_gallery_images ORDER BY id ASC');
        console.log('Final Collections Count:', rows.length);

    } catch (e) {
        console.error('FAILED:', e.message);
    } finally {
        pool.end();
    }
}
fix();
