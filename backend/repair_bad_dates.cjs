/**
 * repair_bad_dates.cjs
 * 
 * Fixes MySQL leads rows where start_date / end_date was stored as
 * 0000-00-00 (displayed by Node.js mysql2 as 1899-11-30).
 *
 * Strategy:
 *   1. Find all leads where start_date IS NULL or year(start_date) <= 1900
 *   2. Try to extract a real date from the `preferences` text column
 *      (format written by QuickBookingModal: "... Date: YYYY-MM-DD. ...")
 *   3. If found  → UPDATE start_date (and end_date if also bad) to that date
 *   4. If not found → leave as NULL (already safe)
 *
 * Run: node backend/repair_bad_dates.cjs
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
    });

    console.log('🔍 Scanning for leads with bad/zero dates...\n');

    // Fetch leads with problematic start_date
    const [rows] = await pool.query(`
        SELECT id, lead_number, start_date, end_date, preferences
        FROM leads
        WHERE start_date IS NULL
           OR YEAR(start_date) <= 1900
           OR start_date = '0000-00-00'
    `);

    console.log(`Found ${rows.length} lead(s) with bad/missing start_date.\n`);

    let fixed = 0;
    let nulled = 0;

    for (const row of rows) {
        const prefs = row.preferences || '';

        // Pattern: "Date: YYYY-MM-DD" in the preferences string
        const match = prefs.match(/Date:\s*(\d{4}-\d{2}-\d{2})/i);

        if (match) {
            const recoveredDate = match[1];

            // Also check end_date
            const endBad = !row.end_date ||
                (new Date(row.end_date).getFullYear() <= 1900);

            await pool.query(
                `UPDATE leads SET start_date = ?, end_date = ? WHERE id = ?`,
                [recoveredDate, endBad ? recoveredDate : row.end_date, row.id]
            );

            console.log(`✅ FIXED   [${row.lead_number || row.id}] → start_date = ${recoveredDate}${endBad ? ` (end_date also set to ${recoveredDate})` : ''}`);
            fixed++;
        } else {
            // No date recoverable — ensure it is NULL (not 0000-00-00)
            const endBad = !row.end_date ||
                (new Date(row.end_date).getFullYear() <= 1900);

            await pool.query(
                `UPDATE leads SET start_date = NULL, end_date = ? WHERE id = ?`,
                [endBad ? null : row.end_date, row.id]
            );

            console.log(`⚪ NULLED  [${row.lead_number || row.id}] — no date found in preferences`);
            nulled++;
        }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Fixed with real date : ${fixed}`);
    console.log(`   Reset to NULL        : ${nulled}`);
    console.log(`   Total processed      : ${rows.length}`);

    await pool.end();
    console.log('\n✅ Done! Database dates are now clean.');
}

run().catch(err => {
    console.error('❌ Script failed:', err.message);
    process.exit(1);
});
