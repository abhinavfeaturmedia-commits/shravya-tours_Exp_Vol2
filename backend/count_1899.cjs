const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function run() {
  const pool = mysql.createPool({ 
    host: process.env.DB_HOST, 
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_NAME,
    connectTimeout: 30000
  });

  try {
    const [rows] = await pool.query(
      "SELECT id, name, CAST(start_date AS CHAR) as start_raw, CAST(end_date AS CHAR) as end_raw, preferences, created_at, source FROM leads WHERE start_date = '1899-11-30'"
    );
    console.log(`Found ${rows.length} rows with 1899-11-30`);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
