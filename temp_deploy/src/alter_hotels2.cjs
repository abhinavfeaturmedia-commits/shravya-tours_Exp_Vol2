const mysql = require('mysql2/promise');
require('dotenv').config();

async function alterDb() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'shravya_tours'
  });
  try {
    console.log("Adding address column to master_hotels...");
    await connection.query('ALTER TABLE master_hotels ADD COLUMN address TEXT;');
    console.log("Success.");
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log("Column already exists.");
    } else {
      console.error(err);
    }
  } finally {
    await connection.end();
  }
}
alterDb();
