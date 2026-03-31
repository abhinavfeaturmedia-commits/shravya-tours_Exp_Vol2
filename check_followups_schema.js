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
    
    console.log('Checking follow_ups table schema...');
    const [rows] = await pool.query('DESCRIBE follow_ups');
    console.log(JSON.stringify(rows, null, 2));

    console.log('\nChecking some data in follow_ups...');
    const [data] = await pool.query('SELECT * FROM follow_ups LIMIT 5');
    console.log(JSON.stringify(data, null, 2));

  } catch(e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}
check();
