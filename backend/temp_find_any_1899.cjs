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
    
    console.log("=== BOOKINGS WITH DATE BEFORE 2020 ===");
    const [bookingsBefore] = await pool.query("SELECT id, booking_number, date, endDate, guests, amount, type FROM bookings WHERE date < '2020-01-01' OR endDate < '2020-01-01'");
    console.log(JSON.stringify(bookingsBefore, null, 2));
    
    await pool.end();
  } catch(e) {
    console.error('Error:', e.message);
  }
}
check();
