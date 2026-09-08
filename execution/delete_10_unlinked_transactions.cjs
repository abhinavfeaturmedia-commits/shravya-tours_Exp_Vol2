const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: 'backend/.env' });

const TARGET_IDS = [1, 2, 3, 6, 8, 9, 10, 97530174, 97530175, 97530177];

async function main() {
    console.log('--- Starting Deletion of 10 Unlinked Transactions ---');

    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'shravya_tours'
    });

    // 1. Check baseline count
    const [totalBeforeRows] = await pool.query('SELECT COUNT(*) as c FROM booking_transactions');
    const totalBefore = totalBeforeRows[0].c;
    console.log(`1. Total booking_transactions before: ${totalBefore}`);

    // Check baseline counts of other tables
    const tablesToCheck = ['bookings', 'leads', 'customers', 'partners', 'expenses', 'vendors', 'accounts'];
    const baselineCounts = {};
    for (const tbl of tablesToCheck) {
        const [rows] = await pool.query(`SELECT COUNT(*) as c FROM \`${tbl}\``);
        baselineCounts[tbl] = rows[0].c;
    }
    console.log('Baseline other tables:', baselineCounts);

    // 2. Fetch the target 10 records to verify and back up
    const placeholders = TARGET_IDS.map(() => '?').join(',');
    const [targetRows] = await pool.query(`SELECT * FROM booking_transactions WHERE id IN (${placeholders})`, TARGET_IDS);
    console.log(`2. Found ${targetRows.length} target records matching IDs.`);

    if (targetRows.length !== TARGET_IDS.length) {
        console.warn(`Warning: expected ${TARGET_IDS.length} records, found ${targetRows.length}`);
    }

    const totalTargetAmount = targetRows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    console.log(`   Target records total amount: ₹${totalTargetAmount}`);

    // 3. Save backup
    const tmpDir = path.join(__dirname, '..', '.tmp');
    if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
    }
    const backupFile = path.join(tmpDir, 'backup_10_unlinked_transactions_20260908.json');
    const backupData = {
        exportedAt: new Date().toISOString(),
        count: targetRows.length,
        totalAmount: totalTargetAmount,
        records: targetRows
    };
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf8');
    console.log(`3. Backup saved to ${backupFile}`);

    // 4. Delete ONLY these 10 records
    console.log('4. Executing surgical deletion...');
    const [delResult] = await pool.query(`DELETE FROM booking_transactions WHERE id IN (${placeholders})`, TARGET_IDS);
    console.log(`✓ Deleted ${delResult.affectedRows} records from booking_transactions.`);

    // 5. Verify post-deletion counts
    const [totalAfterRows] = await pool.query('SELECT COUNT(*) as c FROM booking_transactions');
    const totalAfter = totalAfterRows[0].c;
    console.log(`5. Total booking_transactions after: ${totalAfter} (Expected: ${totalBefore - delResult.affectedRows})`);

    if (totalAfter !== totalBefore - delResult.affectedRows) {
        throw new Error('Count mismatch on booking_transactions!');
    }

    // 6. Verify zero side-effects on other tables
    console.log('6. Verifying other tables untouched:');
    let anyMismatch = false;
    for (const tbl of tablesToCheck) {
        const [rows] = await pool.query(`SELECT COUNT(*) as c FROM \`${tbl}\``);
        const match = rows[0].c === baselineCounts[tbl];
        if (!match) anyMismatch = true;
        console.log(`   - ${tbl}: ${rows[0].c} ${match ? '✓ MATCH' : '❌ MISMATCH'}`);
    }

    if (anyMismatch) {
        throw new Error('Integrity check failed: other tables were affected!');
    }

    await pool.end();
    console.log('--- Deletion of 10 Unlinked Transactions Completed Successfully ---');
}

main().catch(err => {
    console.error('Workflow error:', err);
    process.exit(1);
});
