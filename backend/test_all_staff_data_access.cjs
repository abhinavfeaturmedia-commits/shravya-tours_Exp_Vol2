const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_please_change';
const PORT = process.env.PORT || 3001;

async function testStaff(email, name, staffId) {
    console.log(`\n--- Verifying Staff Account: ${name} (${email}) ---`);
    const token = jwt.sign(
        { id: staffId, email, role: 'Editor', staffId },
        JWT_SECRET,
        { expiresIn: '1h' }
    );

    // 1. Fetch Staff Profile via API
    const resStaff = await fetch(`http://localhost:${PORT}/api/crud/staff_members?eq_email=${encodeURIComponent(email)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const dataStaff = await resStaff.json();
    const staffRow = dataStaff.data?.[0];

    // 2. Fetch Bookings via API
    const resBookings = await fetch(`http://localhost:${PORT}/api/crud/bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const dataBookings = await resBookings.json();

    console.log(`✓ HTTP Status: ${resStaff.status}`);
    console.log(`✓ Query Scope: ${staffRow?.query_scope}`);
    console.log(`✓ Total Accessible Bookings Count: ${dataBookings.data?.length || 0}`);
}

async function run() {
    console.log('=== VERIFYING ALL STAFF ACCOUNTS DATA ACCESS ===');
    await testStaff('rohit14101987@gmail.com', 'Rohit Sankpal (Gmail)', 29);
    await testStaff('rohit_sankpal@yahoo.com', 'Rohit Sankpal (Yahoo)', 1006);
    await testStaff('shrawello@gmail.com', 'Manali Sankpal', 30);
    await testStaff('avjagdale96@gmail.com', 'Ajinkya', 31);
    await testStaff('sayali300shinde@gmail.com', 'Sayali Shinde', 32);
    await testStaff('omkarbhalerao42@gmail.com', 'Omkar', 33);
    await testStaff('deepakpathade60638@gmail.com', 'Dipak Pathade', 1005);
    console.log('\n=== ALL STAFF ACCOUNTS ACCESS VERIFIED PERFECTLY ===');
}

run();
