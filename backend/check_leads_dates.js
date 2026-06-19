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
    const [rows] = await pool.query("SELECT id, name, start_date, end_date, created_at, source, type FROM leads WHERE start_date < '2000-01-01' OR end_date < '2000-01-01'");
    console.log("Leads with old dates:", rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
