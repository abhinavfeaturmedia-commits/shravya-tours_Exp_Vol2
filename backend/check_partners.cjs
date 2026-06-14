const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 1,
    });

    try {
        console.log('Querying all records in partners table...');
        const [partners] = await pool.query('SELECT id, name, email, phone, company_name, location, status, commission_type, commission_value FROM partners');
        console.table(partners);

        console.log('\nQuerying all records in users table for partner role...');
        const [users] = await pool.query("SELECT id, email, role FROM users WHERE role = 'partner' OR email LIKE '%abhinav%'");
        console.table(users);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
