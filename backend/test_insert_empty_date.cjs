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
    // Let's insert a test lead with empty string date and see what is saved
    const testId = `test-date-${Date.now()}`;
    await pool.query(
      "INSERT INTO leads (id, name, start_date, end_date) VALUES (?, 'Test Date Conversion', '', NULL)",
      [testId]
    );

    const [[row]] = await pool.query(
      "SELECT id, start_date, CAST(start_date AS CHAR) as start_raw FROM leads WHERE id = ?",
      [testId]
    );
    console.log("Raw row inserted with '':", row);

    // Let's update it to '' and check
    await pool.query(
      "UPDATE leads SET start_date = '' WHERE id = ?",
      [testId]
    );

    const [[rowUpdated]] = await pool.query(
      "SELECT id, start_date, CAST(start_date AS CHAR) as start_raw FROM leads WHERE id = ?",
      [testId]
    );
    console.log("Raw row updated with '':", rowUpdated);

    // Cleanup
    await pool.query("DELETE FROM leads WHERE id = ?", [testId]);

  } catch (err) {
    console.error("Error during test:", err);
  } finally {
    await pool.end();
  }
}

run();
