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
      "SELECT id, name, start_date, end_date, created_at, source FROM leads WHERE start_date IS NOT NULL"
    );
    console.log(`Checking ${rows.length} leads with non-null start_date...`);
    rows.forEach(r => {
      const start = new Date(r.start_date);
      if (start.getFullYear() < 2020) {
        console.log(`FOUND OLD DATE Lead - ID: ${r.id}, Name: ${r.name}, Start: ${r.start_date} (${start.toDateString()}), Created: ${r.created_at}, Source: ${r.source}`);
      }
    });
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
