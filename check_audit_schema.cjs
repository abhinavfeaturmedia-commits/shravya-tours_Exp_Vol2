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
    
    console.log('Checking audit_logs table schema...');
    const [rows] = await pool.query('DESCRIBE audit_logs');
    console.log(JSON.stringify(rows, null, 2));

  } catch(e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}
check();
