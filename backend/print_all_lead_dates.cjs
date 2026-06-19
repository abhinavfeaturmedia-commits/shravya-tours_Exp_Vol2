const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function run() {
  const pool = mysql.createPool({ 
    host: process.env.DB_HOST, 
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_NAME,
    connectTimeout: 30000
  });

  try {
    const [rows] = await pool.query("SELECT id, name, start_date, end_date, created_at, source, type FROM leads ORDER BY created_at DESC");
    console.log("All Lead Dates:");
    rows.forEach(r => {
      console.log(`- ID: ${r.id}, Name: ${r.name}, Source: ${r.source}, Type: ${r.type}, Start: ${r.start_date ? r.start_date.toISOString().slice(0, 10) : 'null'}, End: ${r.end_date ? r.end_date.toISOString().slice(0, 10) : 'null'}, Created: ${r.created_at}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
