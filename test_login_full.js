// Test login with all known scenarios
async function testLogin(email, password, label) {
    try {
        const res = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        console.log(`[${label}] Status: ${res.status} | Role: ${data.user?.role || 'N/A'} | Error: ${data.error || 'none'}`);
        if (data.token) {
            const payload = JSON.parse(atob(data.token.split('.')[1]));
            console.log(`  → JWT payload: id=${payload.id}, email=${payload.email}, role=${payload.role}`);
        }
    } catch (e) {
        console.error(`[${label}] FAILED:`, e.message);
    }
}

console.log('Testing login scenarios...\n');
await testLogin('admin@shravyatours.com', 'admin', 'Dev Bypass');
await testLogin('admin@shravyatours.com', 'Shravya@2026', 'Admin (real password)');
await testLogin('rohit14101987@gmail.com', 'wrongpassword', 'Staff (wrong pass - should 401)');
console.log('\nDone.');
