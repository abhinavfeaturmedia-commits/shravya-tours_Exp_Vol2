const mysql = require('mysql2/promise');

async function check() {
  const pool = mysql.createPool({ 
    host: 'srv2205.hstgr.io', 
    user: 'u452305925_shravya_admin', 
    password: 'Shravya@2026', 
    database: 'u452305925_shravya_v1',
    connectTimeout: 15000
  });
  try {
    const [cols] = await pool.query('SHOW COLUMNS FROM leads');
    console.log('LEADS COLUMNS:');
    cols.forEach(c => console.log(`  ${c.Field}: ${c.Type}`));
    const [custCols] = await pool.query('SHOW COLUMNS FROM customers');
    console.log('\nCUSTOMERS COLUMNS:');
    custCols.forEach(c => console.log(`  ${c.Field}: ${c.Type}`));
  } catch(e) { console.error(e.message); }
  await pool.end();
}
check();
