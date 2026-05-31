const mysql = require('mysql2/promise');
require('dotenv').config();

async function verify() {
  console.log('Connecting to database...');
  const pool = mysql.createPool({ 
    host: process.env.DB_HOST, 
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_NAME,
    connectTimeout: 5000
  });

  try {
    const [columns] = await pool.query('SHOW COLUMNS FROM leads');
    console.log('Leads table schema:');
    columns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} (Null: ${col.Null}, Default: ${col.Default})`);
    });
  } catch (err) {
    console.error('Failed to get schema:', err.message);
  } finally {
    await pool.end();
  }
}

verify();
