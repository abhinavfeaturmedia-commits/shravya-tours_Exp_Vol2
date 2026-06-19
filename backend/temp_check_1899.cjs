const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function check() {
  try {
    const pool = mysql.createPool({ 
      host: process.env.DB_HOST, 
      user: process.env.DB_USER, 
      password: process.env.DB_PASSWORD, 
      database: process.env.DB_NAME,
      connectTimeout: 30000
    });
    
    console.log("=== COUNT OF LEADS BY START_DATE ===");
    const [counts] = await pool.query(`
      SELECT 
        start_date, 
        COUNT(*) as count 
      FROM leads 
      GROUP BY start_date 
      ORDER BY count DESC 
      LIMIT 20
    `);
    console.table(counts);

    console.log("\n=== LEADS WITH 1899-11-30 ===");
    const [leads1899] = await pool.query("SELECT id, name, start_date, end_date, created_at, type, travelers FROM leads WHERE start_date = '1899-11-30' LIMIT 5");
    console.table(leads1899);

    console.log("\n=== LEADS WITH NULL START_DATE ===");
    const [leadsNull] = await pool.query("SELECT id, name, start_date, end_date, created_at, type, travelers FROM leads WHERE start_date IS NULL LIMIT 5");
    console.table(leadsNull);
    
    await pool.end();
  } catch(e) {
    console.error('Error:', e.message);
  }
}
check();
