const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function fixTitles() {
  let pool;
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectTimeout: 8000
    });

    const sql = "UPDATE master_terms_templates SET title = CONCAT(category, ' Terms') WHERE title IS NULL OR title = ''";
    const [result] = await pool.query(sql);
    console.log('Rows updated:', result.affectedRows);

    const [rows] = await pool.query('SELECT id, title, category FROM master_terms_templates');
    console.log('Updated records:');
    rows.forEach(r => console.log(`  [${r.category}] => "${r.title}"`));
  } catch(e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}

fixTitles();
