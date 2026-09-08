const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: 'backend/.env' });

async function main() {
    console.log('--- Starting Accounts & Agents Safe Deletion Workflow ---');

    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'shravya_tours'
    });

    // 1. Baseline counts of unrelated tables to verify isolation
    const tablesToCheck = ['bookings', 'leads', 'customers', 'partners', 'expenses', 'vendors', 'staff_members', 'invoices'];
    const baselineCounts = {};
    for (const tbl of tablesToCheck) {
        try {
            const [rows] = await pool.query(`SELECT COUNT(*) as c FROM \`${tbl}\``);
            baselineCounts[tbl] = rows[0].c;
        } catch (e) {
            baselineCounts[tbl] = 'N/A';
        }
    }
    console.log('1. Baseline row counts of other tables:', baselineCounts);

    // 2. Fetch all accounts and account transactions to backup
    const [accounts] = await pool.query('SELECT * FROM accounts');
    const [transactions] = await pool.query('SELECT * FROM account_transactions');

    console.log(`2. Found ${accounts.length} accounts and ${transactions.length} account transactions.`);

    // 3. Create backup in .tmp/
    const tmpDir = path.join(__dirname, '..', '.tmp');
    if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
    }
    const backupFile = path.join(tmpDir, 'accounts_backup_20260908.json');
    const backupData = {
        exportedAt: new Date().toISOString(),
        accountsCount: accounts.length,
        transactionsCount: transactions.length,
        accounts,
        transactions
    };
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf8');
    console.log(`3. Backup safely written to: ${backupFile} (${fs.statSync(backupFile).size} bytes)`);

    // 4. Delete child records: account_transactions
    console.log('4. Deleting child records from account_transactions...');
    const [delTxResult] = await pool.query('DELETE FROM account_transactions');
    console.log(`✓ Deleted ${delTxResult.affectedRows} records from account_transactions.`);

    // 5. Delete parent records: accounts
    console.log('5. Deleting parent records from accounts...');
    const [delAccResult] = await pool.query('DELETE FROM accounts');
    console.log(`✓ Deleted ${delAccResult.affectedRows} records from accounts.`);

    // 6. Verify post-deletion counts
    const [newAccCount] = await pool.query('SELECT COUNT(*) as c FROM accounts');
    const [newTxCount] = await pool.query('SELECT COUNT(*) as c FROM account_transactions');
    console.log(`6. Post-deletion: accounts=${newAccCount[0].c}, account_transactions=${newTxCount[0].c}`);

    // 7. Verify all other tables are completely unchanged
    console.log('7. Verifying zero side-effects on other tables:');
    let anyMismatch = false;
    for (const tbl of tablesToCheck) {
        try {
            const [rows] = await pool.query(`SELECT COUNT(*) as c FROM \`${tbl}\``);
            const newCount = rows[0].c;
            const match = newCount === baselineCounts[tbl];
            if (!match) anyMismatch = true;
            console.log(`   - ${tbl}: before=${baselineCounts[tbl]}, after=${newCount} ${match ? '✓ MATCH' : '❌ MISMATCH'}`);
        } catch (e) {
            console.log(`   - ${tbl}: skipped (${e.message})`);
        }
    }

    if (anyMismatch) {
        throw new Error('Integrity check failed: side-effects detected on unrelated tables!');
    }

    await pool.end();
    console.log('--- Deletion & Isolation Verification Finished Successfully ---');
}

main().catch(err => {
    console.error('Workflow error:', err);
    process.exit(1);
});
