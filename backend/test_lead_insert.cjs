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
    const testId = `TEST-LD-${Date.now()}`;
    console.log("Inserting test lead with NULL/undefined dates...");
    
    // Simulating insert with NULL
    await pool.query(
      "INSERT INTO leads (id, name, start_date, end_date, travelers, budget, type, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [testId, "Test Date Lead", null, null, "2 Adults", "TBD", "Train", "Website"]
    );

    // Read it back
    const [rows] = await pool.query("SELECT id, name, start_date, end_date, CAST(start_date AS CHAR) as start_str FROM leads WHERE id = ?", [testId]);
    console.log("Inserted Lead:", rows[0]);

    // Clean up
    await pool.query("DELETE FROM leads WHERE id = ?", [testId]);
    console.log("Cleanup complete.");

  } catch (err) {
    console.error("Error during test insert:", err);
  } finally {
    await pool.end();
  }
}

run();
