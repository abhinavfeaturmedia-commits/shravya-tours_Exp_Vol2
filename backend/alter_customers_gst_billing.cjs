const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'backend/.env' });

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'shravya_tours'
  });

  console.log('Altering customers table...');
  try {
    // Add billing_address if it doesn't exist
    await pool.query(`
      ALTER TABLE customers 
      ADD COLUMN IF NOT EXISTS billing_address TEXT NULL,
      ADD COLUMN IF NOT EXISTS gstin VARCHAR(50) NULL
    `);
    console.log('Successfully added columns billing_address and gstin to customers table.');
  } catch (error) {
    console.error('Error altering table:', error.message);
  } finally {
    await pool.end();
  }
}

run();
