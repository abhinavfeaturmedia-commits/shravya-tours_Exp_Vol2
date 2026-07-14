const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function main() {
    try {
        console.log("DB Host:", process.env.DB_HOST);
        console.log("DB Name:", process.env.DB_NAME);
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });
        
        const [tables] = await pool.query('SHOW TABLES');
        console.log("Tables in database:");
        const tableNames = tables.map(r => Object.values(r)[0]);
        console.log(tableNames);

        for (const tableName of tableNames) {
            console.log(`\n=== Schema for table ${tableName} ===`);
            const [cols] = await pool.query(`DESCRIBE \`${tableName}\``);
            console.table(cols);
        }

        process.exit(0);
    } catch(e) {
        console.error("Error connecting to database or querying schema:", e);
        process.exit(1);
    }
}
main();
