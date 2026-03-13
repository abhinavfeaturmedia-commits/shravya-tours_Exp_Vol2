const email = 'admin@shravyatours.com';
const password = 'admin';

async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    console.log('Login Response:', data);

    if (data.token) {
      console.log('Testing getting staff profile...');
      const res2 = await fetch('http://localhost:3000/api/crud/staff_members?eq_email=admin@shravyatours.com', {
        headers: { Authorization: `Bearer ${data.token}` }
      });
      console.log('Staff list:', await res2.json());
      
      console.log('Testing creating staff profile fallback...');
      const reqBody = {
          name: "admin",
          email: "admin@shravyatours.com",
          role: "Administrator",
          user_type: "Admin",
          department: "Executive",
          status: "Active",
          initials: "AD",
          color: "indigo",
          permissions: {"dashboard":{"view":true,"manage":true},"leads":{"view":true,"manage":true},"customers":{"view":true,"manage":true},"bookings":{"view":true,"manage":true},"itinerary":{"view":true,"manage":true},"inventory":{"view":true,"manage":true},"masters":{"view":true,"manage":true},"vendors":{"view":true,"manage":true},"finance":{"view":true,"manage":true},"marketing":{"view":true,"manage":true},"staff":{"view":true,"manage":true},"reports":{"view":true,"manage":true},"audit":{"view":true,"manage":true}},
          query_scope: "Show All Queries",
          whatsapp_scope: "All Messages"
      };
      const res3 = await fetch('http://localhost:3000/api/crud/staff_members', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.token}` 
        },
        body: JSON.stringify(reqBody)
      });
      console.log('Create Staff Response:', await res3.json());
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
