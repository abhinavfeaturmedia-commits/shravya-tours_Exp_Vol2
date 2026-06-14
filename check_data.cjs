const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: './backend/.env' });

async function check() {
  try {
    const pool = mysql.createPool({ 
      host: process.env.DB_HOST, 
      user: process.env.DB_USER, 
      password: process.env.DB_PASSWORD, 
      database: process.env.DB_NAME,
      connectTimeout: 30000
    });
    
    const filePath = path.join(__dirname, 'premium_pdf_mockup.png');
    if (!fs.existsSync(filePath)) {
        console.error('Test file not found:', filePath);
        process.exit(1);
    }
    
    const fileData = fs.readFileSync(filePath);
    const id = crypto.randomBytes(16).toString('hex');
    const filename = `test-${Date.now()}.png`;
    const mimeType = 'image/png';
    
    console.log(`Attempting to insert test file of size ${(fileData.length/1024).toFixed(2)} KB...`);
    
    const [result] = await pool.query(
        'INSERT INTO uploaded_files (id, filename, mime_type, data) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data), mime_type = VALUES(mime_type)',
        [id, filename, mimeType, fileData]
    );
    
    console.log('Insert success! Result:', result);
    
    // Clean up
    await pool.query('DELETE FROM uploaded_files WHERE filename = ?', [filename]);
    console.log('Cleanup success!');

  } catch(e) {
    console.error('Error during insert:', e.message);
  }
  process.exit(0);
}
check();







