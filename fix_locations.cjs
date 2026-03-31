const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function fix() {
  try {
    const pool = mysql.createPool({ 
      host: process.env.DB_HOST, 
      user: process.env.DB_USER, 
      password: process.env.DB_PASSWORD, 
      database: process.env.DB_NAME,
      connectTimeout: 5000
    });
    
    console.log("Altering master_locations...");
    await pool.query(`
      ALTER TABLE master_locations 
      ADD COLUMN type VARCHAR(100) AFTER name,
      ADD COLUMN region VARCHAR(255) AFTER type,
      ADD COLUMN status VARCHAR(50) DEFAULT 'Active' AFTER region,
      ADD COLUMN image TEXT AFTER status;
    `);
    console.log("Success! Columns added.");

  } catch(e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log("Columns already exist.");
    } else {
      console.error('Error:', e.message);
    }
  }
  process.exit(0);
}
fix();
