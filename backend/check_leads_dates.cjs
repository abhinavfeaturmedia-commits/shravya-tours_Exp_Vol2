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
    const [rows] = await pool.query("SELECT id, name, location, destination, start_date, end_date, travelers, potential_value, type, source, assigned_to FROM leads WHERE type = 'Train'");
    console.log("Train leads:", rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
