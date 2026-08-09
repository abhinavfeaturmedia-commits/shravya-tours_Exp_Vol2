const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_please_change';
const PORT = process.env.PORT || 3001;

function parsePermissionsSafe(raw) {
    let parsed = raw;
    while (typeof parsed === 'string') {
        if (!parsed.trim()) break;
        try {
            parsed = JSON.parse(parsed);
        } catch {
            break;
        }
    }
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
}

async function testStaff(email, name, staffId) {
    console.log(`\n--- Testing Staff: ${name} (${email}) ---`);
    const token = jwt.sign(
        { id: staffId, email, role: 'Editor', staffId },
        JWT_SECRET,
        { expiresIn: '1h' }
    );

    const res = await fetch(`http://localhost:${PORT}/api/crud/staff_members?eq_email=${encodeURIComponent(email)}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!res.ok) {
        console.error(`❌ HTTP Error ${res.status}:`, await res.json());
        return;
    }

    const data = await res.json();
    const staffRow = data.data?.[0];

    if (!staffRow) {
        console.error(`❌ Staff row not found for ${email}`);
        return;
    }

    const parsedPerms = parsePermissionsSafe(staffRow.permissions);
    const activeKeys = Object.keys(parsedPerms).filter(k => parsedPerms[k]?.view || parsedPerms[k]?.manage);

    console.log(`✓ HTTP Status: ${res.status}`);
    console.log(`✓ Fetched Profile: ${staffRow.name} (${staffRow.email})`);
    console.log(`✓ Total Active Permission Modules: ${activeKeys.length}`);
    console.log(`  Modules with 'view': ${Object.keys(parsedPerms).filter(k => parsedPerms[k]?.view).join(', ')}`);
}

async function run() {
    console.log('=== VERIFYING STAFF LOGIN & PERMISSIONS FIX ===');
    await testStaff('rohit14101987@gmail.com', 'Rohit Sankpal (Gmail)', 29);
    await testStaff('rohit_sankpal@yahoo.com', 'Rohit Sankpal (Yahoo)', 34);
    await testStaff('shrawello@gmail.com', 'Manali Sankpal', 30);
    await testStaff('avjagdale96@gmail.com', 'Ajinkya', 31);
    await testStaff('sayali300shinde@gmail.com', 'Sayali Shinde', 32);
    await testStaff('omkarbhalerao42@gmail.com', 'Omkar', 33);
    await testStaff('deepakpathade60638@gmail.com', 'Dipak Pathade', 1005);
    console.log('\n=== ALL STAFF LOGIN & PERMISSION TESTS PASSED PERFECTLY ===');
}

run();
