const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function check() {
  try {
    const pool = mysql.createPool({ 
      host: process.env.DB_HOST, 
      user: process.env.DB_USER, 
      password: process.env.DB_PASSWORD, 
      database: process.env.DB_NAME,
      connectTimeout: 5000
    });
    
    const [rows] = await pool.query('SELECT * FROM master_hotels');
    console.log(JSON.stringify(rows, null, 2));

  } catch(e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}
check();
