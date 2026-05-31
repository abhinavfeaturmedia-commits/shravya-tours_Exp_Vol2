import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';

dotenv.config({ path: './backend/.env' });

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_please_change';
// Backend runs on PORT from .env (3001), NOT port 3000 (that's the Vite dev server)
const PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${PORT}`;


async function main() {
    console.log("=== STARTING PERMISSIONS & CRUD SCOPING TESTS ===");
    console.log(`Backend target: ${BASE_URL}`);

    // Pre-flight: verify backend is reachable
    console.log("\n[0] Pre-flight: checking backend health...");
    const healthRes = await apiRequest('/api/health', 'GET', null);
    if (healthRes.status !== 200) {
        console.error(`❌ Backend is not reachable at ${BASE_URL}/api/health (Status: ${healthRes.status})`);
        console.error(`   Make sure the backend is running: cd backend && npm run dev`);
        console.error(`   Body:`, JSON.stringify(healthRes.body));
        await pool.end();
        return;
    }
    console.log(`✓ Backend is reachable (${BASE_URL})`);

    // Clean up any previous test state first
    await cleanup();

    try {
        // 1. Seed Test Staff & Leads
        console.log("\n[1] Seeding test database state...");

        // View-only staff (id: 1001)
        const viewPermissions = {
            dashboard: { view: true, manage: false },
            leads: { view: true, manage: false },
            bookings: { view: true, manage: false }
        };
        await pool.query(
            `INSERT INTO staff_members (id, name, email, role, user_type, department, status, initials, color, permissions)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [1001, 'View Staff', 'view_staff@shravya.com', 'Staff', 'Staff', 'Sales', 'Active', 'VS', 'blue', JSON.stringify(viewPermissions)]
        );

        // Manage staff (id: 1002)
        const managePermissions = {
            dashboard: { view: true, manage: true },
            leads: { view: true, manage: true },
            bookings: { view: true, manage: true }
        };
        await pool.query(
            `INSERT INTO staff_members (id, name, email, role, user_type, department, status, initials, color, permissions)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [1002, 'Manage Staff', 'manage_staff@shravya.com', 'Staff', 'Staff', 'Sales', 'Active', 'MS', 'green', JSON.stringify(managePermissions)]
        );

        // Other staff member (id: 1003) to test scoping cross-access
        await pool.query(
            `INSERT INTO staff_members (id, name, email, role, user_type, department, status, initials, color, permissions)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [1003, 'Other Staff', 'other_staff@shravya.com', 'Staff', 'Staff', 'Sales', 'Active', 'OS', 'red', JSON.stringify(managePermissions)]
        );

        // Seed some leads
        // Lead owned by view_staff (id: 'lead-1001')
        await pool.query(
            `INSERT INTO leads (id, name, email, phone, destination, budget, potential_value, status, type, source, assigned_to)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['lead-1001', 'View Staff Client', 'client1@test.com', '1234567890', 'Paris', '100000', 100000, 'New', 'Custom Package', 'Manual Entry', 1001]
        );

        // Lead owned by manage_staff (id: 'lead-1002')
        await pool.query(
            `INSERT INTO leads (id, name, email, phone, destination, budget, potential_value, status, type, source, assigned_to)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['lead-1002', 'Manage Staff Client', 'client2@test.com', '1234567890', 'Kyoto', '200000', 200000, 'New', 'Custom Package', 'Manual Entry', 1002]
        );

        // Lead owned by other_staff (id: 'lead-1003')
        await pool.query(
            `INSERT INTO leads (id, name, email, phone, destination, budget, potential_value, status, type, source, assigned_to)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['lead-1003', 'Other Staff Client', 'client3@test.com', '1234567890', 'Tokyo', '300000', 300000, 'New', 'Custom Package', 'Manual Entry', 1003]
        );

        console.log("Database seeded successfully.");

        // 2. Generate signed JWT tokens
        const adminToken = jwt.sign({ id: 999, email: 'admin@shravyatours.com', role: 'admin' }, JWT_SECRET);
        const viewToken = jwt.sign({ id: 1001, email: 'view_staff@shravya.com', role: 'staff', staffId: 1001 }, JWT_SECRET);
        const manageToken = jwt.sign({ id: 1002, email: 'manage_staff@shravya.com', role: 'staff', staffId: 1002 }, JWT_SECRET);

        console.log("\n[2] Verification Tests...");

        // ==========================================
        // TEST 1: ADMIN ACCESS (UNRESTRICTED)
        // ==========================================
        console.log("\n>> Test 1: Admin Actions (Expected: Full Scopes, Unrestricted)");
        
        // Admin GET /api/crud/leads
        const adminGetRes = await apiRequest('/api/crud/leads', 'GET', adminToken);
        if (adminGetRes.status !== 200) {
            console.error(`  [ADMIN GET DEBUG] Status: ${adminGetRes.status}, Body:`, JSON.stringify(adminGetRes.body).substring(0, 300));
        }
        assert(adminGetRes.status === 200, `Admin GET should succeed (Status: ${adminGetRes.status})`);
        const allLeads = adminGetRes.body.data || [];
        const seededLeadIds = ['lead-1001', 'lead-1002', 'lead-1003'];
        const seededVisible = allLeads.filter(l => seededLeadIds.includes(l.id));
        assert(seededVisible.length >= 3, `Admin should see all 3 seeded leads (Found: ${seededVisible.length}, total: ${allLeads.length})`);
        console.log(`✓ Admin sees all leads (Total: ${allLeads.length}, seeded visible: ${seededVisible.length})`);

        // ==========================================
        // TEST 2: VIEW-ONLY STAFF ACCESS
        // ==========================================
        console.log("\n>> Test 2: View-Only Staff Actions (Expected: View Owned Only, Modifies Blocked)");

        // View-only GET /api/crud/leads (Should be scoped to 1001 only)
        const viewGetRes = await apiRequest('/api/crud/leads', 'GET', viewToken);
        if (viewGetRes.status !== 200) {
            console.error(`  [VIEW GET DEBUG] Status: ${viewGetRes.status}, Body:`, JSON.stringify(viewGetRes.body).substring(0, 300));
        }
        assert(viewGetRes.status === 200, `View-only staff GET leads should succeed (Status: ${viewGetRes.status})`);
        const visibleToViewOnly = viewGetRes.body.data || [];
        const ownedByView = visibleToViewOnly.filter(l => l.id === 'lead-1001');
        const notOwnedByView = visibleToViewOnly.filter(l => ['lead-1002', 'lead-1003'].includes(l.id));
        assert(ownedByView.length === 1, `View-only staff should see their own lead (lead-1001). (Seen IDs: ${JSON.stringify(visibleToViewOnly.map(l => l.id))})`);
        assert(notOwnedByView.length === 0, `View-only staff should NOT see other staff leads. (Leaked: ${JSON.stringify(notOwnedByView.map(l => l.id))})`);
        console.log(`✓ View-only scoping enforced: owns lead visible, others hidden. (Total seen: ${visibleToViewOnly.length})`);

        // View-only POST /api/crud/leads (Should fail with 403 Forbidden)
        const viewPostRes = await apiRequest('/api/crud/leads', 'POST', viewToken, {
            name: 'Forbidden New Client',
            destination: 'Swiss Alps',
            budget: 500000
        });
        assert(viewPostRes.status === 403, `View-only staff should be blocked from creating leads (Status: ${viewPostRes.status})`);
        console.log("✓ View-only creation blocked correctly (403 Forbidden).");

        // View-only PUT /api/crud/leads/lead-1001 (Should fail with 403 Forbidden)
        const viewPutRes = await apiRequest('/api/crud/leads/lead-1001', 'PUT', viewToken, {
            destination: 'Updated Paris'
        });
        assert(viewPutRes.status === 403, `View-only staff should be blocked from editing their own leads (Status: ${viewPutRes.status})`);
        console.log("✓ View-only editing blocked correctly (403 Forbidden).");

        // View-only DELETE /api/crud/leads/lead-1001 (Should fail with 403 Forbidden)
        const viewDelRes = await apiRequest('/api/crud/leads/lead-1001', 'DELETE', viewToken);
        assert(viewDelRes.status === 403, `View-only staff should be blocked from deleting leads (Status: ${viewDelRes.status})`);
        console.log("✓ View-only deleting blocked correctly (403 Forbidden).");


        // ==========================================
        // TEST 3: MANAGE STAFF ACCESS
        // ==========================================
        console.log("\n>> Test 3: Manage Staff Actions (Expected: Modify Owned, Block Cross-Access)");

        // Manage staff GET /api/crud/leads (Should be scoped to 1002 only)
        const manageGetRes = await apiRequest('/api/crud/leads', 'GET', manageToken);
        if (manageGetRes.status !== 200) {
            console.error(`  [MANAGE GET DEBUG] Status: ${manageGetRes.status}, Body:`, JSON.stringify(manageGetRes.body).substring(0, 300));
        }
        assert(manageGetRes.status === 200, `Manage staff GET should succeed (Status: ${manageGetRes.status})`);
        const visibleToManage = manageGetRes.body.data || [];
        const ownedByManage = visibleToManage.filter(l => l.id === 'lead-1002');
        const notOwnedByManage = visibleToManage.filter(l => ['lead-1001', 'lead-1003'].includes(l.id));
        assert(ownedByManage.length === 1, `Manage staff should see their own lead (lead-1002). (Seen IDs: ${JSON.stringify(visibleToManage.map(l => l.id))})`);
        assert(notOwnedByManage.length === 0, `Manage staff should NOT see other staff leads. (Leaked: ${JSON.stringify(notOwnedByManage.map(l => l.id))})`);
        console.log(`✓ Manage staff scoping enforced: own lead visible, others hidden. (Total seen: ${visibleToManage.length})`);

        // Manage staff PUT /api/crud/leads/lead-1002 (Own lead - Should succeed)
        const managePutOwnRes = await apiRequest('/api/crud/leads/lead-1002', 'PUT', manageToken, {
            destination: 'Updated Kyoto'
        });
        assert(managePutOwnRes.status === 200, `Manage staff should succeed in updating their own lead (Status: ${managePutOwnRes.status})`);
        console.log("✓ Manage staff successfully updated their own lead.");

        // Manage staff PUT /api/crud/leads/lead-1003 (Other's lead - Should fail with 403 Forbidden)
        const managePutOtherRes = await apiRequest('/api/crud/leads/lead-1003', 'PUT', manageToken, {
            destination: 'Breached Tokyo'
        });
        assert(managePutOtherRes.status === 403, `Manage staff should be blocked from updating another's lead (Status: ${managePutOtherRes.status})`);
        console.log("✓ Ownership validation enforced: Manage staff blocked from updating another's lead (403 Forbidden).");

        // Manage staff DELETE /api/crud/leads/lead-1003 (Other's lead - Should fail with 403 Forbidden)
        const manageDelOtherRes = await apiRequest('/api/crud/leads/lead-1003', 'DELETE', manageToken);
        assert(manageDelOtherRes.status === 403, `Manage staff should be blocked from deleting another's lead (Status: ${manageDelOtherRes.status})`);
        console.log("✓ Ownership validation enforced: Manage staff blocked from deleting another's lead (403 Forbidden).");

        // Manage staff POST /api/crud/leads setting assigned_to = 1003 (Should override and force to 1002)
        const managePostRes = await apiRequest('/api/crud/leads', 'POST', manageToken, {
            name: 'Auto Assigned Client',
            destination: 'Sydney',
            budget: 150000,
            assigned_to: 1003
        });
        assert(managePostRes.status === 201, `Manage staff lead creation should succeed (Status: ${managePostRes.status})`);
        const returnedAssignedTo = Number(managePostRes.body.data?.assigned_to);
        assert(returnedAssignedTo === 1002, 
            `Server must force lead creation assigned_to to creator's staffId 1002. (Assigned to: ${managePostRes.body.data?.assigned_to}, type: ${typeof managePostRes.body.data?.assigned_to})`);
        console.log("✓ Server-side assignment injection verified: forced assigned_to to creator's staffId.");

        console.log("\n=== ALL TESTS PASSED SUCCESSFULLY ===");

    } catch (e) {
        console.error("\n❌ TEST FAILURE:", e);
    } finally {
        console.log("\n[3] Cleaning up seeded test database state...");
        await cleanup();
        await pool.end();
        console.log("Cleanup finished.");
    }
}

async function cleanup() {
    try {
        await pool.query('DELETE FROM leads WHERE id IN (?, ?, ?)', ['lead-1001', 'lead-1002', 'lead-1003']);
        await pool.query('DELETE FROM leads WHERE name = ?', ['Auto Assigned Client']);
        await pool.query('DELETE FROM staff_members WHERE id IN (?, ?, ?)', [1001, 1002, 1003]);
    } catch (e) {
        console.warn("Cleanup warning:", e.message);
    }
}

async function apiRequest(endpoint, method = 'GET', token = null, body = null) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body) headers['Content-Type'] = 'application/json';

    const options = {
        method,
        headers,
    };
    if (body) options.body = JSON.stringify(body);

    try {
        const res = await fetch(`${BASE_URL}${endpoint}`, options);
        let responseBody = {};
        try {
            responseBody = await res.json();
        } catch {}
        return {
            status: res.status,
            body: responseBody
        };
    } catch (e) {
        throw new Error(`Request failed on ${endpoint}: ${e.message}`);
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

main();
