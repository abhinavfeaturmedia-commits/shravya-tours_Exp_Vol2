const mysql = require('mysql2/promise');

async function verify() {
  const pool = mysql.createPool({ 
    host: 'srv2205.hstgr.io', 
    user: 'u452305925_shravya_admin', 
    password: 'Shravya@2026', 
    database: 'u452305925_shravya_v1',
    connectTimeout: 15000
  });
  try {
    // Check the two new columns
    const [cols] = await pool.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'u452305925_shravya_v1'
        AND TABLE_NAME = 'leads'
        AND COLUMN_NAME IN ('customer_id', 'is_returning_customer', 'alt_phone')
      ORDER BY ORDINAL_POSITION
    `);
    
    if (cols.length === 0) {
      console.log('⚠  Columns NOT found yet — server restart needed to trigger migration.');
    } else {
      console.log('✅ Column check:');
      cols.forEach(c => console.log(`   ${c.COLUMN_NAME}: ${c.COLUMN_TYPE}  nullable=${c.IS_NULLABLE}  default=${c.COLUMN_DEFAULT}`));
    }

    // Ensure customer_id exists — add it manually if migration hasn't run yet
    const hasCustomerId   = cols.some(c => c.COLUMN_NAME === 'customer_id');
    const hasIsReturning  = cols.some(c => c.COLUMN_NAME === 'is_returning_customer');

    if (!hasCustomerId) {
      console.log('\n🔧 Manually adding customer_id column...');
      await pool.query("ALTER TABLE leads ADD COLUMN IF NOT EXISTS customer_id VARCHAR(64) DEFAULT NULL");
      console.log('   ✅ customer_id added');
    }
    if (!hasIsReturning) {
      console.log('🔧 Manually adding is_returning_customer column...');
      await pool.query("ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_returning_customer TINYINT(1) DEFAULT 0");
      console.log('   ✅ is_returning_customer added');
    }
    if (hasCustomerId && hasIsReturning) {
      console.log('\n✅ All new columns already present — migration complete!');
    }

    // Quick sanity: test the phone normalisation query
    const [testRows] = await pool.query(`
      SELECT id, name, phone,
        RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(IFNULL(phone,''), ' ', ''), '-', ''), '+', ''), '()', ''), 10) as normalised
      FROM customers LIMIT 5
    `);
    console.log('\n📞 Sample phone normalisation from customers:');
    testRows.forEach(r => console.log(`   "${r.phone}" → "${r.normalised}"  (${r.name})`));

  } catch (e) { console.error('Error:', e.message); }
  await pool.end();
}
verify();
