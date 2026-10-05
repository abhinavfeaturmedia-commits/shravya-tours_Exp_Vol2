const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
    console.log('=== STARTING ORGANIZATION STRUCTURE MIGRATION ===');
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 1,
    });

    try {
        // 1. Create departments table
        console.log('Creating departments table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS departments (
                id VARCHAR(64) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                code VARCHAR(50) NOT NULL UNIQUE,
                description TEXT,
                status VARCHAR(50) DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ departments table created/verified');

        // 2. Create designations table
        console.log('Creating designations table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS designations (
                id VARCHAR(64) PRIMARY KEY,
                department_id VARCHAR(64) NULL,
                name VARCHAR(255) NOT NULL,
                grade_level VARCHAR(10) NOT NULL,
                default_discount_limit DECIMAL(10,2) DEFAULT 0,
                default_expense_limit DECIMAL(10,2) DEFAULT 0,
                status VARCHAR(50) DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ designations table created/verified');

        // 3. Create branches table
        console.log('Creating branches table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS branches (
                id VARCHAR(64) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                code VARCHAR(50) NOT NULL UNIQUE,
                city VARCHAR(100),
                state VARCHAR(100),
                address TEXT,
                status VARCHAR(50) DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ branches table created/verified');

        // 4. Update staff_members table with hierarchy columns
        console.log('Checking staff_members columns...');
        const [cols] = await pool.query('DESCRIBE staff_members');
        const colNames = cols.map(c => c.Field);

        if (!colNames.includes('employee_code')) {
            console.log('Adding employee_code to staff_members...');
            await pool.query('ALTER TABLE staff_members ADD COLUMN employee_code VARCHAR(50) NULL UNIQUE AFTER id');
        }
        if (!colNames.includes('designation_id')) {
            console.log('Adding designation_id to staff_members...');
            await pool.query('ALTER TABLE staff_members ADD COLUMN designation_id VARCHAR(64) NULL AFTER role');
        }
        if (!colNames.includes('grade_level')) {
            console.log('Adding grade_level to staff_members...');
            await pool.query('ALTER TABLE staff_members ADD COLUMN grade_level VARCHAR(10) NULL DEFAULT "L8" AFTER designation_id');
        }
        if (!colNames.includes('reporting_to_id')) {
            console.log('Adding reporting_to_id to staff_members...');
            await pool.query('ALTER TABLE staff_members ADD COLUMN reporting_to_id INT NULL AFTER grade_level');
        }
        if (!colNames.includes('branch_id')) {
            console.log('Adding branch_id to staff_members...');
            await pool.query('ALTER TABLE staff_members ADD COLUMN branch_id VARCHAR(64) NULL AFTER department');
        }
        if (!colNames.includes('employment_status')) {
            console.log('Adding employment_status to staff_members...');
            await pool.query('ALTER TABLE staff_members ADD COLUMN employment_status VARCHAR(50) DEFAULT "Active" AFTER status');
        }
        console.log('✓ staff_members columns verified/added');

        // 5. Seed default departments if table is empty
        const [existingDepts] = await pool.query('SELECT COUNT(*) as count FROM departments');
        if (existingDepts[0].count === 0) {
            console.log('Seeding default departments...');
            const defaultDepts = [
                { id: 'dept_sales', name: 'Sales & Business Development', code: 'SALES', description: 'Tour Sales, Corporate, B2B, MICE' },
                { id: 'dept_operations', name: 'Operations & Fleet', code: 'OPS', description: 'Tour execution, cab bookings, hotel coordination' },
                { id: 'dept_marketing', name: 'Marketing', code: 'MKT', description: 'Digital campaigns, social media, performance marketing' },
                { id: 'dept_finance', name: 'Finance & Accounts', code: 'FIN', description: 'Invoicing, billing, GST, vendor settlements' },
                { id: 'dept_cx', name: 'Customer Experience', code: 'CX', description: 'Customer care, feedback, escalations' },
                { id: 'dept_hr', name: 'HR', code: 'HR', description: 'Recruitment, payroll, attendance, performance' },
                { id: 'dept_admin', name: 'Admin', code: 'ADM', description: 'Office management, facility, logistics' },
                { id: 'dept_tech', name: 'Technology & Automation', code: 'TECH', description: 'CRM, website, IT infrastructure, automation' },
            ];
            for (const d of defaultDepts) {
                await pool.query(
                    'INSERT INTO departments (id, name, code, description, status) VALUES (?, ?, ?, ?, "Active")',
                    [d.id, d.name, d.code, d.description]
                );
            }
            console.log(`✓ Seeded ${defaultDepts.length} default departments`);
        }

        // 6. Seed default branches if empty
        const [existingBranches] = await pool.query('SELECT COUNT(*) as count FROM branches');
        if (existingBranches[0].count === 0) {
            console.log('Seeding default branches...');
            const defaultBranches = [
                { id: 'br_ho_mum', name: 'Head Office - Mumbai', code: 'HO-MUM', city: 'Mumbai', state: 'Maharashtra', address: 'Corporate Towers, Mumbai' },
                { id: 'br_pune', name: 'Pune Branch', code: 'BR-PUN', city: 'Pune', state: 'Maharashtra', address: 'Shivaji Nagar, Pune' },
                { id: 'br_delhi', name: 'Delhi Branch', code: 'BR-DEL', city: 'Delhi', state: 'Delhi NCR', address: 'Connaught Place, New Delhi' },
            ];
            for (const b of defaultBranches) {
                await pool.query(
                    'INSERT INTO branches (id, name, code, city, state, address, status) VALUES (?, ?, ?, ?, ?, ?, "Active")',
                    [b.id, b.name, b.code, b.city, b.state, b.address]
                );
            }
            console.log(`✓ Seeded ${defaultBranches.length} default branches`);
        }

        // 7. Seed default designations if empty
        const [existingDesigs] = await pool.query('SELECT COUNT(*) as count FROM designations');
        if (existingDesigs[0].count === 0) {
            console.log('Seeding default designations across L1 to L8...');
            const defaultDesigs = [
                // L1 Ownership
                { id: 'desig_founder', department_id: null, name: 'Founder Director', grade_level: 'L1', default_discount_limit: 100000, default_expense_limit: 1000000 },
                // L2 Executive Management
                { id: 'desig_md_ceo', department_id: null, name: 'Managing Director / CEO', grade_level: 'L2', default_discount_limit: 50000, default_expense_limit: 500000 },
                // L3 Functional Leadership
                { id: 'desig_head_sales', department_id: 'dept_sales', name: 'Head of Sales & BD', grade_level: 'L3', default_discount_limit: 30000, default_expense_limit: 250000 },
                { id: 'desig_head_ops', department_id: 'dept_operations', name: 'Head of Operations', grade_level: 'L3', default_discount_limit: 15000, default_expense_limit: 250000 },
                { id: 'desig_head_fin', department_id: 'dept_finance', name: 'Head of Finance & Accounts', grade_level: 'L3', default_discount_limit: 30000, default_expense_limit: 500000 },
                { id: 'desig_head_cx', department_id: 'dept_cx', name: 'Head of Customer Experience', grade_level: 'L3', default_discount_limit: 10000, default_expense_limit: 100000 },
                { id: 'desig_head_hr', department_id: 'dept_hr', name: 'Head of HR & Admin', grade_level: 'L3', default_discount_limit: 5000, default_expense_limit: 100000 },
                { id: 'desig_head_tech', department_id: 'dept_tech', name: 'Head of Technology', grade_level: 'L3', default_discount_limit: 5000, default_expense_limit: 200000 },
                // L4 Regional Management
                { id: 'desig_zonal_mgr', department_id: 'dept_sales', name: 'Zonal / Regional Manager', grade_level: 'L4', default_discount_limit: 15000, default_expense_limit: 75000 },
                // L5 Area / Branch Management
                { id: 'desig_area_mgr', department_id: 'dept_sales', name: 'Area Manager / Branch Manager', grade_level: 'L5', default_discount_limit: 8000, default_expense_limit: 25000 },
                { id: 'desig_ops_mgr', department_id: 'dept_operations', name: 'Operations Manager', grade_level: 'L5', default_discount_limit: 5000, default_expense_limit: 30000 },
                // L6 First-Line Management / Supervisor
                { id: 'desig_sales_sup', department_id: 'dept_sales', name: 'Assistant Manager / Sales Supervisor', grade_level: 'L6', default_discount_limit: 3500, default_expense_limit: 5000 },
                { id: 'desig_ops_sup', department_id: 'dept_operations', name: 'Operations Supervisor / Fleet Lead', grade_level: 'L6', default_discount_limit: 2000, default_expense_limit: 10000 },
                // L7 Senior Executive
                { id: 'desig_sr_sales', department_id: 'dept_sales', name: 'Senior Sales Executive', grade_level: 'L7', default_discount_limit: 1500, default_expense_limit: 1000 },
                { id: 'desig_sr_ops', department_id: 'dept_operations', name: 'Senior Operations Executive', grade_level: 'L7', default_discount_limit: 1000, default_expense_limit: 2500 },
                // L8 Execution
                { id: 'desig_sales_exec', department_id: 'dept_sales', name: 'Sales Executive / Tour Consultant', grade_level: 'L8', default_discount_limit: 0, default_expense_limit: 0 },
                { id: 'desig_ops_coord', department_id: 'dept_operations', name: 'Operations Coordinator / Field Exec', grade_level: 'L8', default_discount_limit: 0, default_expense_limit: 0 },
                { id: 'desig_cx_exec', department_id: 'dept_cx', name: 'Customer Support Executive', grade_level: 'L8', default_discount_limit: 0, default_expense_limit: 0 },
                { id: 'desig_acc_exec', department_id: 'dept_finance', name: 'Accounts Executive / Billing Clerk', grade_level: 'L8', default_discount_limit: 0, default_expense_limit: 0 },
            ];
            for (const des of defaultDesigs) {
                await pool.query(
                    'INSERT INTO designations (id, department_id, name, grade_level, default_discount_limit, default_expense_limit, status) VALUES (?, ?, ?, ?, ?, ?, "Active")',
                    [des.id, des.department_id, des.name, des.grade_level, des.default_discount_limit, des.default_expense_limit]
                );
            }
            console.log(`✓ Seeded ${defaultDesigs.length} default designations across L1 to L8`);
        }

        // 8. Auto-assign employee_code to existing staff members if missing
        const [staffRows] = await pool.query('SELECT id, name, employee_code, role, user_type FROM staff_members ORDER BY id ASC');
        for (let i = 0; i < staffRows.length; i++) {
            const s = staffRows[i];
            if (!s.employee_code) {
                const code = `EMP-${String(s.id).padStart(4, '0')}`;
                console.log(`Assigning code ${code} to staff ID ${s.id} (${s.name})`);
                await pool.query('UPDATE staff_members SET employee_code = ? WHERE id = ?', [code, s.id]);
            }
            // If Admin, tag with L1/L2
            if (s.user_type === 'Admin' && (!s.grade_level || s.grade_level === 'L8')) {
                await pool.query('UPDATE staff_members SET grade_level = "L1" WHERE id = ?', [s.id]);
            }
        }
        console.log('✓ Existing staff assigned employee codes and baseline levels');

        console.log('\n=== MIGRATION COMPLETED SUCCESSFULLY! ===');
    } catch (e) {
        console.error('Migration error:', e);
    } finally {
        await pool.end();
    }
}

run();
