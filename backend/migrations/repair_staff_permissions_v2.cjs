const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const ALIAS_MAP = {
    'support': 'support_inbox',
    'supportInbox': 'support_inbox',
    'marketing': 'marketing_logs',
    'marketingLogs': 'marketing_logs',
    'carRental': 'car_rental',
    'car_rental': 'car_rental',
    'financeVerification': 'finance_verification',
    'finance_verification': 'finance_verification',
    'offerBanners': 'offer_banners',
    'offer_banners': 'offer_banners',
    'trainingHub': 'training',
    'training_hub': 'training',
    'activityFeed': 'audit',
    'activity_feed': 'audit',
    'performance': 'staff_performance',
    'staffPerformance': 'staff_performance',
    'staff': 'staff_management',
    'staffManagement': 'staff_management',
    'cms': 'content_cms',
    'contentCms': 'content_cms',
    'trending': 'trending_destinations',
    'trendingDestinations': 'trending_destinations'
};

const ALL_MODULES = [
    'dashboard', 'reports', 'attendance', 'analytics', 'audit',
    'leads', 'customers', 'feedback', 'tasks', 'follow_ups',
    'bookings', 'operations', 'calendar', 'transfers', 'car_rental',
    'finance', 'finance_verification', 'supplier_ledger', 'expenses', 'pricing', 'coupons',
    'destinations', 'packages', 'reviews', 'content_cms', 'offer_banners', 'trending_destinations',
    'marketing_logs', 'training', 'support_inbox',
    'staff_management', 'staff_performance', 'settings'
];

function normalizeScope(qs) {
    if (qs === 'Show All Queries' || qs === 'all') return 'all';
    if (qs === 'Show Department Queries' || qs === 'department') return 'department';
    return 'assigned';
}

function repairPermissions(rawPerms, userType, queryScope) {
    const targetScope = normalizeScope(queryScope);
    let parsed = {};

    if (typeof rawPerms === 'string') {
        try {
            parsed = JSON.parse(rawPerms);
        } catch (e) {
            parsed = {};
        }
    } else if (typeof rawPerms === 'object' && rawPerms !== null) {
        parsed = { ...rawPerms };
    }

    // Remap any aliases first
    const remapped = {};
    for (const [key, val] of Object.entries(parsed)) {
        const canonical = ALIAS_MAP[key] || key;
        remapped[canonical] = val;
    }

    const result = {};

    ALL_MODULES.forEach(mod => {
        if (userType === 'Admin') {
            result[mod] = {
                view: true,
                create: true,
                edit: true,
                delete: true,
                export: true,
                manage: true,
                scope: 'all',
                subFeatures: {}
            };
            return;
        }

        const existing = remapped[mod];
        if (existing && typeof existing === 'object') {
            const hasExplicitFalse = existing.view === false;
            const isView = existing.view === true || (!hasExplicitFalse && (existing.create || existing.edit || existing.manage));

            result[mod] = {
                view: !!isView,
                create: !!existing.create,
                edit: !!existing.edit,
                delete: !!existing.delete,
                export: !!existing.export,
                manage: !!existing.manage,
                scope: (targetScope === 'all' || targetScope === 'department') ? targetScope : (existing.scope || targetScope),
                subFeatures: typeof existing.subFeatures === 'object' && existing.subFeatures !== null ? { ...existing.subFeatures } : {}
            };
        } else {
            result[mod] = {
                view: false,
                create: false,
                edit: false,
                delete: false,
                export: false,
                manage: false,
                scope: targetScope,
                subFeatures: {}
            };
        }
    });

    return result;
}

async function runRepair() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log("=== CONNECTED TO DATABASE. FETCHING ALL STAFF MEMBERS ===");
        const [staffMembers] = await pool.query(
            'SELECT id, name, email, role, department, user_type, query_scope, permissions FROM staff_members ORDER BY id ASC'
        );

        console.log(`Found ${staffMembers.length} staff members.`);

        for (const sm of staffMembers) {
            console.log(`\nProcessing: ID ${sm.id} - ${sm.name} (${sm.email}) [${sm.user_type} | ${sm.query_scope || 'N/A'}]`);

            const repaired = repairPermissions(sm.permissions, sm.user_type, sm.query_scope);

            // Special grant checks for known roles
            if (sm.id === 29 || sm.email === 'rohit14101987@gmail.com') {
                // Rohit Sankpal: Senior Sales & Operations
                ['dashboard', 'leads', 'bookings', 'customers', 'calendar', 'tasks', 'follow_ups', 'attendance', 'operations', 'reports', 'transfers', 'car_rental'].forEach(m => {
                    if (repaired[m]) {
                        repaired[m].view = true;
                        repaired[m].create = true;
                        repaired[m].edit = true;
                        repaired[m].scope = 'all';
                    }
                });
                if (repaired.attendance) {
                    repaired.attendance.subFeatures = {
                        ...(repaired.attendance.subFeatures || {}),
                        punch_attendance: true,
                        view_all_staff: true,
                        approve_regularization: true
                    };
                }
            } else if (sm.id === 30 || sm.email === 'shrawello@gmail.com') {
                // Manali Sankpal: Marketing
                ['dashboard', 'leads', 'content_cms', 'offer_banners', 'trending_destinations', 'marketing_logs', 'attendance', 'operations'].forEach(m => {
                    if (repaired[m]) {
                        repaired[m].view = true;
                        repaired[m].create = true;
                        repaired[m].edit = true;
                        repaired[m].scope = 'all';
                    }
                });
            } else if (sm.id === 1007 || sm.email === 'vaishnavivernekar81@gmail.com') {
                // Vaishnavi Vernekar: Executive
                ['dashboard', 'leads', 'bookings', 'customers', 'attendance', 'tasks', 'follow_ups', 'operations'].forEach(m => {
                    if (repaired[m]) {
                        repaired[m].view = true;
                        repaired[m].create = true;
                        repaired[m].edit = true;
                        repaired[m].scope = 'assigned';
                    }
                });
            }

            const jsonStr = JSON.stringify(repaired);
            await pool.query('UPDATE staff_members SET permissions = ? WHERE id = ?', [jsonStr, sm.id]);

            const activeModules = Object.entries(repaired)
                .filter(([_, p]) => p.view)
                .map(([m, p]) => `${m}(${p.scope})`);

            console.log(`  -> Repaired. Active modules (${activeModules.length}): ${activeModules.join(', ')}`);
        }

        console.log("\n=== ALL STAFF PERMISSIONS REPAIRED SUCCESSFULLY ===");
    } catch (err) {
        console.error("Migration Error:", err);
    } finally {
        await pool.end();
    }
}

runRepair();
