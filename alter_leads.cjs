const mysql = require('mysql2/promise');
require('dotenv').config({path: 'backend/.env'});

async function run() {
    const pool = mysql.createPool({ 
        host: process.env.DB_HOST, 
        user: process.env.DB_USER, 
        password: process.env.DB_PASSWORD, 
        database: process.env.DB_NAME
    });

    try {
        await pool.query("ALTER TABLE leads ADD COLUMN residential_address TEXT");
        console.log("Added residential_address successfully");
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') console.log("residential_address already exists");
        else console.error(e);
    }

    try {
        await pool.query("ALTER TABLE leads ADD COLUMN office_address TEXT");
        console.log("Added office_address successfully");
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') console.log("office_address already exists");
        else console.error(e);
    }

    console.log('DB alteration complete'); 
    process.exit(0);
}
run();
