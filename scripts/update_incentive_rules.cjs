const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config({ path: './backend/.env' });

async function updateRules() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 5
    });

    const conn = await pool.getConnection();
    try {
        console.log('--- UPDATING INCENTIVE RULES SLABS & ADDING DEPT RULES ---');

        // 1. Update rule-sales-executive slabs to have 1.0% floor for < 70%
        const salesSlabs = [
            { min_pct: 0, max_pct: 69.99, rate_pct: 1.0, label: 'Below 70% (Floor)' },
            { min_pct: 70, max_pct: 89.99, rate_pct: 1.0, label: '70% - 89%' },
            { min_pct: 90, max_pct: 99.99, rate_pct: 1.5, label: '90% - 99%' },
            { min_pct: 100, max_pct: 119.99, rate_pct: 2.0, label: '100% - 119%' },
            { min_pct: 120, max_pct: 149.99, rate_pct: 2.5, label: '120% - 149%' },
            { min_pct: 150, max_pct: 9999, rate_pct: 3.0, label: '150%+' }
        ];

        await conn.query(`
            UPDATE incentive_rules 
            SET slabs_json = ? 
            WHERE id = 'rule-sales-executive'
        `, [JSON.stringify(salesSlabs)]);
        console.log('Updated rule-sales-executive slabs with 1.0% floor');

        // 2. Update rule-senior-sales slabs to have 1.25% floor
        const seniorSalesSlabs = [
            { min_pct: 0, max_pct: 69.99, rate_pct: 1.25, label: 'Below 70% (Floor)' },
            { min_pct: 70, max_pct: 89.99, rate_pct: 1.25, label: '70% - 89%' },
            { min_pct: 90, max_pct: 99.99, rate_pct: 1.75, label: '90% - 99%' },
            { min_pct: 100, max_pct: 119.99, rate_pct: 2.5, label: '100% - 119%' },
            { min_pct: 120, max_pct: 149.99, rate_pct: 3.0, label: '120% - 149%' },
            { min_pct: 150, max_pct: 9999, rate_pct: 3.5, label: '150%+' }
        ];

        await conn.query(`
            UPDATE incentive_rules 
            SET slabs_json = ? 
            WHERE id = 'rule-senior-sales'
        `, [JSON.stringify(seniorSalesSlabs)]);
        console.log('Updated rule-senior-sales slabs with 1.25% floor');

        // 3. Add Marketing rule if not present
        const [mkt] = await conn.query(`SELECT id FROM incentive_rules WHERE id = 'rule-marketing'`);
        if (mkt.length === 0) {
            await conn.query(`
                INSERT INTO incentive_rules (
                    id, plan_id, department, role, incentive_type, percentage, fixed_amount,
                    kpi_dependency, target_dependency, slabs_json, kpi_weights_json, kpi_multipliers_json,
                    priority, status, version
                ) VALUES (
                    'rule-marketing', 'plan-standard-fy26-27', 'Marketing', 'Marketing Head', 'percentage', 1.00, 0.00,
                    0, 0, NULL, NULL, NULL, 8, 'Active', '1.0'
                )
            `);
            console.log('Inserted rule-marketing');
        }

        // 4. Add Technology / IT rule if not present
        const [tech] = await conn.query(`SELECT id FROM incentive_rules WHERE id = 'rule-technology'`);
        if (tech.length === 0) {
            await conn.query(`
                INSERT INTO incentive_rules (
                    id, plan_id, department, role, incentive_type, percentage, fixed_amount,
                    kpi_dependency, target_dependency, slabs_json, kpi_weights_json, kpi_multipliers_json,
                    priority, status, version
                ) VALUES (
                    'rule-technology', 'plan-standard-fy26-27', 'Technology', 'Administrator', 'percentage', 1.00, 0.00,
                    0, 0, NULL, NULL, NULL, 9, 'Active', '1.0'
                )
            `);
            console.log('Inserted rule-technology');
        }

        console.log('All rules updated successfully.');
    } catch (e) {
        console.error('Update error:', e);
    } finally {
        conn.release();
        await pool.end();
    }
}

updateRules();

