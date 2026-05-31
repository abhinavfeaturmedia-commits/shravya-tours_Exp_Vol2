async function test() {
    try {
        console.log("Testing login API on port 3001...");
        const res = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'abhinavgaikwad063@gmail.com',
                password: 'wrongpassword' // Just to see if it responds with 401 instead of crashing or failing
            })
        });
        console.log("Status:", res.status);
        const data = await res.json();
        console.log("Data:", data);
    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
}
test();
