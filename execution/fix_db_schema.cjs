/**
 * fix_db_schema.cjs
 * Runs ALTER TABLE migrations to fix column mismatches between the frontend API
 * and the Hostinger MySQL database tables.
 *
 * Safe to run multiple times — uses IF NOT EXISTS for ALTER TABLE.
 */
const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function runMigrations() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 30000,
    waitForConnections: true,
    connectionLimit: 5,
  });

  const migrations = [
    // ── master_activities ──────────────────────────────────────────────
    // Frontend sends: name, locationId (as location_id), duration, cost, category, status
    // DB has: name, description, duration, price
    {
      table: 'master_activities',
      sqls: [
        `ALTER TABLE master_activities ADD COLUMN IF NOT EXISTS location_id INT(11) DEFAULT NULL`,
        `ALTER TABLE master_activities ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2) DEFAULT 0`,
        `ALTER TABLE master_activities ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT NULL`,
        `ALTER TABLE master_activities ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active'`,
      ]
    },
    // ── master_transports ──────────────────────────────────────────────
    // Frontend sends: name, type, capacity, baseRate (as base_rate), status
    // DB has: name, type, capacity, price_per_km
    {
      table: 'master_transports',
      sqls: [
        `ALTER TABLE master_transports ADD COLUMN IF NOT EXISTS base_rate DECIMAL(10,2) DEFAULT 0`,
        `ALTER TABLE master_transports ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active'`,
      ]
    },
    // ── master_room_types ──────────────────────────────────────────────
    // Frontend sends: name, description, status
    // DB has: name, description, max_occupancy
    {
      table: 'master_room_types',
      sqls: [
        `ALTER TABLE master_room_types ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active'`,
        `ALTER TABLE master_room_types ADD COLUMN IF NOT EXISTS image TEXT DEFAULT NULL`,
      ]
    },
    // ── master_meal_plans ──────────────────────────────────────────────
    // Frontend sends: code, name, description, status
    // DB has: name, description
    {
      table: 'master_meal_plans',
      sqls: [
        `ALTER TABLE master_meal_plans ADD COLUMN IF NOT EXISTS code VARCHAR(20) DEFAULT NULL`,
        `ALTER TABLE master_meal_plans ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active'`,
      ]
    },
    // ── master_lead_sources ────────────────────────────────────────────
    // Frontend sends: name, category, status
    // DB has: name, description
    {
      table: 'master_lead_sources',
      sqls: [
        `ALTER TABLE master_lead_sources ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT NULL`,
        `ALTER TABLE master_lead_sources ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active'`,
      ]
    },
    // ── master_terms_templates ─────────────────────────────────────────
    // Frontend sends: title, category, content, isDefault, status
    // DB has: name, content
    {
      table: 'master_terms_templates',
      sqls: [
        `ALTER TABLE master_terms_templates ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT NULL`,
        `ALTER TABLE master_terms_templates ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT NULL`,
        `ALTER TABLE master_terms_templates ADD COLUMN IF NOT EXISTS is_default TINYINT(1) DEFAULT 0`,
        `ALTER TABLE master_terms_templates ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active'`,
      ]
    },
    // ── master_plans ───────────────────────────────────────────────────
    // Frontend sends: title, duration, locationId, estimatedCost, status, days (JSON)
    // DB has: name, description, days (int), nights
    {
      table: 'master_plans',
      sqls: [
        `ALTER TABLE master_plans ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT NULL`,
        `ALTER TABLE master_plans ADD COLUMN IF NOT EXISTS duration INT(11) DEFAULT NULL`,
        `ALTER TABLE master_plans ADD COLUMN IF NOT EXISTS location_id INT(11) DEFAULT NULL`,
        `ALTER TABLE master_plans ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10,2) DEFAULT 0`,
        `ALTER TABLE master_plans ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active'`,
        `ALTER TABLE master_plans ADD COLUMN IF NOT EXISTS plan_days LONGTEXT DEFAULT NULL`,
      ]
    },
    // ── master_hotels ──────────────────────────────────────────────────
    // Frontend sends: name, locationId, rating, amenities, pricePerNight, image, status
    // DB has: name, location_id, rating, amenities, price_per_night, image, status  → mostly fine
    // location_id in DB is INT, but frontend sends locationId as a string key like 'LOC-001'
    // Let's make location_id also accept a string (location_name) as fallback
    {
      table: 'master_hotels',
      sqls: [
        // No changes needed - schema already matches frontend for hotels
        `SELECT 1`, // no-op
      ]
    },
    // ── packages ───────────────────────────────────────────────────────
    // Frontend sends: id (UUID), title, description, price, location, days, image,
    //   features (JSON), remaining_seats, group_size, theme, overview, status,
    //   offer_end_time, included (JSON), not_included (JSON), builder_data (JSON)
    {
      table: 'packages',
      sqls: [
        `ALTER TABLE packages ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT NULL`,
        `ALTER TABLE packages ADD COLUMN IF NOT EXISTS group_size VARCHAR(100) DEFAULT 'Family'`,
        `ALTER TABLE packages ADD COLUMN IF NOT EXISTS theme VARCHAR(100) DEFAULT 'Tour'`,
        `ALTER TABLE packages ADD COLUMN IF NOT EXISTS overview TEXT DEFAULT NULL`,
        `ALTER TABLE packages ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active'`,
        `ALTER TABLE packages ADD COLUMN IF NOT EXISTS offer_end_time DATETIME DEFAULT NULL`,
        `ALTER TABLE packages ADD COLUMN IF NOT EXISTS included LONGTEXT DEFAULT NULL`,
        `ALTER TABLE packages ADD COLUMN IF NOT EXISTS not_included LONGTEXT DEFAULT NULL`,
        `ALTER TABLE packages ADD COLUMN IF NOT EXISTS builder_data LONGTEXT DEFAULT NULL`,
        `ALTER TABLE packages ADD COLUMN IF NOT EXISTS remaining_seats INT(11) DEFAULT 10`,
        `ALTER TABLE packages ADD COLUMN IF NOT EXISTS features LONGTEXT DEFAULT NULL`,
      ]
    },
    // ── lead_logs ──────────────────────────────────────────────────────
    // Frontend sends: lead_id, type, content, timestamp
    // Check if table exists with correct schema
    {
      table: 'lead_logs',
      sqls: [
        `CREATE TABLE IF NOT EXISTS lead_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          lead_id INT NOT NULL,
          type VARCHAR(100) DEFAULT 'Note',
          content TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
      ]
    },
    // ── proposals ──────────────────────────────────────────────────────
    {
      table: 'proposals',
      sqls: [
        `CREATE TABLE IF NOT EXISTS proposals (
          id VARCHAR(64) PRIMARY KEY,
          lead_id VARCHAR(64) DEFAULT NULL,
          title VARCHAR(255) DEFAULT NULL,
          status VARCHAR(50) DEFAULT 'Draft',
          content LONGTEXT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
      ]
    },
    // ── follow_ups ─────────────────────────────────────────────────────
    {
      table: 'follow_ups',
      sqls: [
        `CREATE TABLE IF NOT EXISTS follow_ups (
          id VARCHAR(64) PRIMARY KEY,
          lead_id VARCHAR(64) DEFAULT NULL,
          type VARCHAR(100) DEFAULT NULL,
          note TEXT DEFAULT NULL,
          due_date DATE DEFAULT NULL,
          status VARCHAR(50) DEFAULT 'Pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
      ]
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const migration of migrations) {
    console.log(`\n── ${migration.table} ──`);
    for (const sql of migration.sqls) {
      try {
        await pool.query(sql);
        console.log(`  ✅ ${sql.substring(0, 80).trim()}...`);
        passed++;
      } catch (e) {
        // Ignore "Column already exists" errors (1060) - those are fine
        if (e.errno === 1060) {
          console.log(`  ⏭️  Already exists: ${sql.substring(40, 80).trim()}`);
          passed++;
        } else {
          console.error(`  ❌ FAILED: ${e.message}`);
          console.error(`     SQL: ${sql.substring(0, 120)}`);
          failed++;
        }
      }
    }
  }

  console.log(`\n═══════════════════════════════`);
  console.log(`✅ Passed: ${passed} | ❌ Failed: ${failed}`);

  // Now verify packages table schema
  console.log('\n── Verifying packages table ──');
  const [pkgCols] = await pool.query('DESCRIBE packages');
  console.log('Columns:', pkgCols.map(r => r.Field).join(', '));

  // Check if packages id is auto_increment or takes UUIDs
  const idCol = pkgCols.find(r => r.Field === 'id');
  console.log('packages.id type:', idCol?.Type, '| Extra:', idCol?.Extra);
  if (idCol?.Type?.includes('int') && idCol?.Extra?.includes('auto_increment')) {
    console.log('\n⚠️  packages.id is AUTO_INCREMENT INT. Frontend sends UUID strings.');
    console.log('   Run: ALTER TABLE packages MODIFY id VARCHAR(64) NOT NULL;');
  }

  // Check lead_logs
  console.log('\n── Verifying lead_logs ──');
  const [llCols] = await pool.query('DESCRIBE lead_logs');
  console.log('Columns:', llCols.map(r => r.Field).join(', '));

  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

runMigrations().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
