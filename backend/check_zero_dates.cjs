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
    const [rows] = await pool.query(
      "SELECT id, name, CAST(start_date AS CHAR) as start_str, CAST(end_date AS CHAR) as end_str FROM leads"
    );
    console.log("All leads with string dates:");
    rows.forEach(r => {
      console.log(`- ID: ${r.id}, Name: ${r.name}, Start: ${r.start_str}, End: ${r.end_str}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
