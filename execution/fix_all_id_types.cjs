/**
 * fix_all_id_types.cjs
 * Converts ID columns from INT AUTO_INCREMENT to VARCHAR(64) for tables
 * that use frontend-generated UUIDs (leads, customers, vendors, accounts, etc.).
 *
 * This is critical because the frontend sends strings like "5ebe485c-..."
 * which MySQL truncates to 0 if the column is an INT.
 */
const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function migrate() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 30000,
  });

  const tablesToFix = [
    'leads', 'customers', 'vendors', 'accounts', 'bookings',
    'master_locations', 'master_hotels', 'master_activities',
    'master_transports', 'master_plans', 'master_room_types',
    'master_meal_plans', 'master_lead_sources', 'master_terms_templates',
    'daily_inventory', 'proposals', 'follow_ups', 'tasks', 'cms_banners',
    'cms_testimonials', 'cms_gallery_images', 'cms_posts'
  ];

  console.log('--- Starting ID Type Migration ---');

  for (const table of tablesToFix) {
    try {
      // 1. Check if table exists and what the ID type is
      const [desc] = await pool.query(`DESCRIBE \`${table}\``);
      const idCol = desc.find(r => r.Field === 'id');
      
      if (!idCol) {
        console.log(`Table ${table} has no 'id' column, skipping.`);
        continue;
      }

      if (idCol.Type.includes('varchar')) {
        console.log(`Table ${table} already uses VARCHAR id, skipping.`);
      } else {
        console.log(`Converting ${table}.id from ${idCol.Type} to VARCHAR(64)...`);
        
        // To change an AUTO_INCREMENT PK to VARCHAR, we need to modify it.
        // If there are foreign keys, this might be tricky, but we'll try direct modify first.
        await pool.query(`ALTER TABLE \`${table}\` MODIFY id VARCHAR(64) NOT NULL`);
        console.log(`  ✅ ${table}.id converted.`);
      }
    } catch (e) {
      console.error(`  ❌ Failed to convert ${table}:`, e.message);
    }
  }

  // 2. Fix Foreign Key columns that should be VARCHAR
  const fkFixes = [
    { table: 'lead_logs', column: 'lead_id' },
    { table: 'booking_transactions', column: 'booking_id' },
    { table: 'account_transactions', column: 'account_id' },
    { table: 'proposals', column: 'lead_id' },
    { table: 'follow_ups', column: 'lead_id' },
    { table: 'tasks', column: 'related_lead_id' },
    { table: 'tasks', column: 'related_booking_id' }
  ];

  console.log('\n--- Fixing Foreign Key Type Mismatches ---');
  for (const fix of fkFixes) {
    try {
      const [desc] = await pool.query(`DESCRIBE \`${fix.table}\``);
      const col = desc.find(r => r.Field === fix.column);
      if (col && !col.Type.includes('varchar')) {
        console.log(`Converting ${fix.table}.${fix.column} to VARCHAR(64)...`);
        await pool.query(`ALTER TABLE \`${fix.table}\` MODIFY \`${fix.column}\` VARCHAR(64)`);
        console.log(`  ✅ ${fix.table}.${fix.column} converted.`);
      }
    } catch (e) {
      console.error(`  ❌ Failed to convert ${fix.table}.${fix.column}:`, e.message);
    }
  }

  // 3. Final Check on packages (just in case)
  try {
     await pool.query('ALTER TABLE packages MODIFY id VARCHAR(64) NOT NULL');
  } catch(e) {}

  console.log('\nMigration Complete.');
  await pool.end();
}

migrate().catch(e => console.error(e));
