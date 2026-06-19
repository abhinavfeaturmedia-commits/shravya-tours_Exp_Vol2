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
    const [all] = await pool.query("SELECT COUNT(*) as total FROM leads");
    console.log("Total leads:", all[0].total);

    const [nulls] = await pool.query("SELECT COUNT(*) as null_starts FROM leads WHERE start_date IS NULL");
    console.log("Null start dates:", nulls[0].null_starts);

    const [nullEnds] = await pool.query("SELECT COUNT(*) as null_ends FROM leads WHERE end_date IS NULL");
    console.log("Null end dates:", nullEnds[0].null_ends);

    const [sampleNulls] = await pool.query("SELECT id, name, created_at, source, start_date, end_date FROM leads WHERE start_date IS NULL LIMIT 10");
    console.log("Sample leads with null start dates:", sampleNulls);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
