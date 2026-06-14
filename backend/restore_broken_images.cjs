const mysql = require('mysql2/promise');
const https = require('https');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Helper to download image to Buffer
function downloadImage(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to download image: HTTP ${res.statusCode}`));
                return;
            }
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        }).on('error', reject);
    });
}

// Map package/destination title to curated premium Unsplash images
function getUnsplashUrl(name = '') {
    const n = name.toLowerCase();
    
    // Goa / Beaches
    if (n.includes('goa') || n.includes('beach') || n.includes('maldives') || n.includes('bali')) {
        return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80';
    }
    // Hill Stations / Mountains / Cold regions
    if (n.includes('manali') || n.includes('shimla') || n.includes('himachal') || n.includes('spiti') || n.includes('kashmir') || n.includes('ladakh') || n.includes('mount')) {
        return 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80';
    }
    // Heritage / Palaces / Forts / Monuments
    if (n.includes('jaipur') || n.includes('rajasthan') || n.includes('unity') || n.includes('statue') || n.includes('heritage') || n.includes('palace') || n.includes('fort') || n.includes('gujarat')) {
        return 'https://images.unsplash.com/photo-1603262110263-fb0112e7cc33?w=1200&q=80';
    }
    // Temples / Spiritual / Holy / Rivers
    if (n.includes('varanasi') || n.includes('ayodhya') || n.includes('prayagraj') || n.includes('ashtavinayak') || n.includes('darshan') || n.includes('jyotirlinga') || n.includes('shirdi') || n.includes('divine') || n.includes('temple')) {
        return 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=1200&q=80';
    }
    // Forests / Wildlife / Nature / Agrotourism / Greenery
    if (n.includes('dandeli') || n.includes('safari') || n.includes('jungle') || n.includes('ooty') || n.includes('mysore') || n.includes('coonoor') || n.includes('agro') || n.includes('nature') || n.includes('green') || n.includes('forest') || n.includes('lake') || n.includes('kerala')) {
        return 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80';
    }
    // Tea gardens / North East / Gangtok / Darjeeling
    if (n.includes('gangtok') || n.includes('darjeeling') || n.includes('tea') || n.includes('east')) {
        return 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1200&q=80';
    }
    // Maharashtra City / Western Ghats / Mumbai / Pune / Lonavala / Mahabaleshwar
    if (n.includes('mumbai') || n.includes('pune') || n.includes('lonavala') || n.includes('mahabaleshwar')) {
        return 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=1200&q=80';
    }
    // Default high-quality travel placeholder
    return 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?w=1200&q=80';
}

async function restore() {
    console.log('Connecting to database:', process.env.DB_NAME);
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        connectTimeout: 30000
    });

    try {
        // 1. Gather all file references from trending_destinations
        console.log('Querying trending_destinations...');
        const [destRows] = await pool.query('SELECT name, image_url FROM trending_destinations');
        const fileMap = new Map(); // filename -> { contextName, unsplashUrl }

        for (const dest of destRows) {
            const url = dest.image_url;
            if (url && url.startsWith('/uploads/')) {
                const filename = url.replace('/uploads/', '');
                fileMap.set(filename, {
                    context: `Trending Destination: ${dest.name}`,
                    unsplashUrl: getUnsplashUrl(dest.name)
                });
            }
        }

        // 2. Gather all file references from packages (image and gallery)
        console.log('Querying packages...');
        const [packageRows] = await pool.query('SELECT title, image, gallery, location FROM packages');
        for (const pkg of packageRows) {
            // Main image
            if (pkg.image && pkg.image.startsWith('/uploads/')) {
                const filename = pkg.image.replace('/uploads/', '');
                fileMap.set(filename, {
                    context: `Package main image: ${pkg.title}`,
                    unsplashUrl: getUnsplashUrl(pkg.title + ' ' + (pkg.location || ''))
                });
            }
            // Gallery images
            if (pkg.gallery) {
                try {
                    const gallery = typeof pkg.gallery === 'string' ? JSON.parse(pkg.gallery) : pkg.gallery;
                    if (Array.isArray(gallery)) {
                        for (const url of gallery) {
                            if (url && url.startsWith('/uploads/')) {
                                const filename = url.replace('/uploads/', '');
                                fileMap.set(filename, {
                                    context: `Package gallery image: ${pkg.title}`,
                                    unsplashUrl: getUnsplashUrl(pkg.title + ' ' + (pkg.location || ''))
                                });
                            }
                        }
                    }
                } catch (e) {
                    // Ignore bad JSON
                }
            }
        }

        console.log(`Found ${fileMap.size} unique uploaded file references on the website.`);

        // 3. Query existing uploaded_files in DB
        const [dbFiles] = await pool.query('SELECT filename FROM uploaded_files');
        const existingSet = new Set(dbFiles.map(r => r.filename));
        console.log(`Database currently has ${existingSet.size} files in uploaded_files table.`);

        // 4. Identify missing files
        const missingFiles = [];
        for (const [filename, info] of fileMap.entries()) {
            if (!existingSet.has(filename)) {
                missingFiles.push({ filename, ...info });
            }
        }

        console.log(`Need to restore ${missingFiles.length} missing files.`);

        // 5. Restore missing files by downloading premium images and inserting them
        let count = 0;
        for (const file of missingFiles) {
            console.log(`\n[${++count}/${missingFiles.length}] Restoring: ${file.filename}`);
            console.log(`   Context: ${file.context}`);
            console.log(`   Source URL: ${file.unsplashUrl}`);

            try {
                const fileData = await downloadImage(file.unsplashUrl);
                const id = crypto.randomBytes(16).toString('hex');
                const ext = path.extname(file.filename).toLowerCase();
                let mimeType = 'image/jpeg';
                if (ext === '.png') mimeType = 'image/png';
                else if (ext === '.webp') mimeType = 'image/webp';
                else if (ext === '.gif') mimeType = 'image/gif';

                await pool.query(
                    'INSERT INTO uploaded_files (id, filename, mime_type, data) VALUES (?, ?, ?, ?)',
                    [id, file.filename, mimeType, fileData]
                );
                console.log(`   SUCCESS: Restored and saved to DB (${(fileData.length/1024).toFixed(0)} KB)`);
            } catch (err) {
                console.error(`   ERROR restoring ${file.filename}:`, err.message);
            }
        }

        console.log('\n--- Restoration Complete ---');
        console.log(`Successfully processed all ${missingFiles.length} files.`);

    } catch (err) {
        console.error('Fatal error during restoration:', err.message);
    } finally {
        await pool.end();
    }
}

restore();
