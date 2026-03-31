const mysql = require('mysql2/promise');
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
    
    console.log('Full CREATE TABLE follow_ups:');
    const [rows] = await pool.query('SHOW CREATE TABLE follow_ups');
    console.log(rows[0]['Create Table']);

  } catch(e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}
check();
