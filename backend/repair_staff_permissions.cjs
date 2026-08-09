const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

function parsePermissionsSafe(raw) {
    let parsed = raw;
    while (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed);
        } catch {
            break;
        }
    }
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
}

async function run() {
    console.log('=== STARTING STAFF PERMISSIONS DATA REPAIR ===');
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 2,
    });

    try {
        const [rows] = await pool.query('SELECT id, name, email, permissions FROM staff_members');
        console.log(`Found ${rows.length} staff member records.`);

        let repairedCount = 0;
        for (const sm of rows) {
            const cleanObj = parsePermissionsSafe(sm.permissions);
            const cleanJsonString = JSON.stringify(cleanObj);
            
            // Check if string in DB was double-encoded or formatted differently
            const originalString = typeof sm.permissions === 'string' ? sm.permissions : JSON.stringify(sm.permissions || {});
            
            if (originalString !== cleanJsonString) {
                console.log(`Repairing Staff ID ${sm.id} (${sm.name} - ${sm.email})...`);
                await pool.query('UPDATE staff_members SET permissions = ? WHERE id = ?', [cleanJsonString, sm.id]);
                repairedCount++;
            }
        }

        console.log(`✓ Repair complete. Fixed ${repairedCount} staff member permission record(s).`);

        // Verify repaired records
        const [repairedRows] = await pool.query('SELECT id, name, email, permissions FROM staff_members');
        console.log('\n=== REPAIRED STAFF PERMISSIONS SUMMARY ===');
        for (const sm of repairedRows) {
            const parsed = parsePermissionsSafe(sm.permissions);
            const activeModules = Object.keys(parsed).filter(k => parsed[k]?.view || parsed[k]?.manage);
            console.log(`ID: ${sm.id} | ${sm.name} (${sm.email}) -> Active Modules: ${activeModules.length}`);
        }

    } catch (e) {
        console.error('Error during permissions repair:', e);
    } finally {
        await pool.end();
    }
}

run();
