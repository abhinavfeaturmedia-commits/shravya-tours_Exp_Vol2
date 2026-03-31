import https from 'https';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const url1 = 'https://images.unsplash.com/photo-1598448835260-15bd048eb560?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
const url2 = 'https://images.unsplash.com/photo-1560179406-1c6c60e0dc26?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'; // alternative temple

https.get(url1, (res) => {
    console.log('Status code for URL1:', res.statusCode);
    if (res.statusCode !== 200 && res.statusCode !== 302) {
        console.log('Using backup URL because first failed.');
        updateDB(url2);
    } else {
        console.log('URL1 is fine, there must be another issue.');
    }
});

async function updateDB(workingUrl) {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });
    await pool.query("UPDATE cms_gallery_images SET image_url = ? WHERE id = 'GAL-005'", [workingUrl]);
    console.log("Updated DB to fallback URL.");
    pool.end();
}
