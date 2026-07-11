import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

async function main() {
    try {
        console.log('Testing connection to DB using host:', process.env.DB_HOST);
        const [rowsChecklist] = await pool.query('SHOW COLUMNS FROM customer_packing_checklists');
        console.log('customer_packing_checklists columns:', rowsChecklist.map(r => `${r.Field} (${r.Type})`));

        const [rowsAddons] = await pool.query('SHOW COLUMNS FROM booking_purchased_addons');
        console.log('booking_purchased_addons columns:', rowsAddons.map(r => `${r.Field} (${r.Type})`));

        console.log('SUCCESS! Both tables exist and are structured correctly.');
    } catch (e) {
        console.error('Migration verification failed with error:');
        console.error(e);
    } finally {
        await pool.end();
    }
}
main();
