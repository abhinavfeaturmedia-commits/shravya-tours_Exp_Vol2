require('dotenv').config();
const mysql = require('mysql2/promise');

async function testUpdate() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 30000
    });

    try {
        const [leads] = await pool.query('SELECT * FROM leads LIMIT 1');
        if (leads.length === 0) {
            console.log("No leads found");
            return;
        }
        
        const lead = leads[0];
        console.log("Updating lead:", lead.id);
        
        const [staff] = await pool.query('SELECT * FROM staff_members LIMIT 1');
        const staffId = staff[0] ? staff[0].id : 1;
        
        await pool.query('UPDATE leads SET assigned_to = ? WHERE id = ?', [staffId, lead.id]);
        console.log("Update successful, assigned_to =", staffId);
        
        const [updatedList] = await pool.query('SELECT assigned_to FROM leads WHERE id = ?', [lead.id]);
        console.log("Fetched after update:", updatedList[0]);
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

testUpdate();
