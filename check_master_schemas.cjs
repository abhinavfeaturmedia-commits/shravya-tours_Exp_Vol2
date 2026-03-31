const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function check() {
  try {
    const pool = mysql.createPool({ 
      host: process.env.DB_HOST, 
      user: process.env.DB_USER, 
      password: process.env.DB_PASSWORD, 
      database: process.env.DB_NAME,
      connectTimeout: 5000
    });
    
    const tables = [
      'master_locations', 'master_hotels', 'master_activities',
      'master_transports', 'master_plans', 'master_room_types',
      'master_meal_plans', 'master_lead_sources', 'master_terms_templates'
    ];

    for (const table of tables) {
        console.log(`== ${table} ==`);
        const [rows] = await pool.query(`DESCRIBE ${table}`);
        console.log(rows.map(r => `${r.Field}: ${r.Type} PRI=${r.Key} EXTRA=${r.Extra}`).join(', '));
    }

  } catch(e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}
check();
