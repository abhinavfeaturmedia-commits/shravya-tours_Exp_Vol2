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
    
    console.log("=== ALL LEADS ===");
    const [allLeads] = await pool.query("SELECT id, name, location, destination, start_date, end_date, travelers, potential_value, type, assigned_to FROM leads ORDER BY created_at DESC");
    console.log(JSON.stringify(allLeads, null, 2));
    
    await pool.end();
  } catch(e) {
    console.error('Error:', e.message);
  }
}
check();
