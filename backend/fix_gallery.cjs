const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/.env' });

async function fixGallery() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });
        
        console.log('Inserting/Updating Pilgrim Yatra...');
        await pool.query(
            `INSERT INTO cms_gallery_images (id, title, category, image_url) 
             VALUES ('GAL-005', 'Pilgrim Yatra', 'Other', 'https://images.unsplash.com/photo-1596788062829-01c0cde6f2eb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')
             ON DUPLICATE KEY UPDATE image_url=VALUES(image_url)`
        );
        
        console.log('Inserting/Updating Wildlife Safari...');
        await pool.query(
            `INSERT INTO cms_gallery_images (id, title, category, image_url) 
             VALUES ('GAL-006', 'Wildlife Safari', 'Landscape', 'https://images.unsplash.com/photo-1516426122078-c23e76319801?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')
             ON DUPLICATE KEY UPDATE image_url=VALUES(image_url)`
        );

        console.log('Done!');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
fixGallery();
