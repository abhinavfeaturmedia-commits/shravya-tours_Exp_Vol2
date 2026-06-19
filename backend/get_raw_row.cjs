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
      "SELECT id, name, start_date, end_date, CAST(start_date AS CHAR) as start_raw, CAST(end_date AS CHAR) as end_raw, created_at, source FROM leads WHERE id = 'a9f8a329-ea26-444b-bd22-8178a9cbb37a'"
    );
    console.log(rows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
