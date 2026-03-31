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
    
    // Check if table exists
    const [tables] = await pool.query("SHOW TABLES LIKE 'master_locations'");
    if (tables.length === 0) {
      console.log("Table master_locations DOES NOT EXIST!");
    } else {
      const [rows] = await pool.query('DESCRIBE master_locations');
      console.log(JSON.stringify(rows, null, 2));
    }

  } catch(e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}
check();
