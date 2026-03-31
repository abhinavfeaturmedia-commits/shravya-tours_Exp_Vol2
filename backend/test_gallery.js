import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        const [rows] = await pool.query('SELECT * FROM cms_gallery_images');
        console.log('CMS Gallery Images:', rows.length);
        rows.forEach(r => console.log(`ID:${r.id} | Title:${r.title} | Category:${r.category} | URL:${r.image_url}`));
    } catch (e) {
        console.error('FAILED:', e.message);
    } finally {
        pool.end();
    }
}
test();
