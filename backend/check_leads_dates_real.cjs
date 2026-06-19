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
      "SELECT id, name, start_date, end_date, created_at, source FROM leads ORDER BY created_at DESC LIMIT 50"
    );
    console.log("All leads with string dates:");
    rows.forEach(r => {
      console.log(`- ID: ${r.id}, Name: ${r.name}, Start: ${r.start_date}, End: ${r.end_date}, Created: ${r.created_at}, Source: ${r.source}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
