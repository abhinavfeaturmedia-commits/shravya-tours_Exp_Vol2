import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { initEmailService, sendEmail } from './emailService.js';

dotenv.config();

async function run() {
    console.log('Connecting to database...');
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    console.log('Initializing email service...');
    initEmailService(pool);

    try {
        console.log('Fetching stored SMTP keys to inspect configuration status...');
        const [rows] = await pool.query(
            "SELECT setting_key, setting_value FROM settings WHERE setting_key LIKE 'integrations.smtpGeneral.%' OR setting_key LIKE 'integrations.smtpBilling.%'"
        );

        console.log(`Found ${rows.length} SMTP settings entries in DB.`);
        rows.forEach(r => {
            let val = r.setting_value;
            if (r.setting_key.includes('password')) val = '[MASKED]';
            console.log(` - ${r.setting_key}: ${val}`);
        });

        const args = process.argv.slice(2);
        const type = args[0] || 'general';
        const recipient = args[1];

        if (recipient) {
            console.log(`Attempting to send real test email of type "${type}" to: ${recipient}`);
            const result = await sendEmail({
                type,
                to: recipient,
                subject: `Shrawello SMTP Test - ${type.toUpperCase()}`,
                html: `<h1>SMTP Test Successful</h1><p>This email was triggered using Shrawello's <strong>${type}</strong> SMTP configuration.</p>`
            });
            console.log('Result:', result ? 'SUCCESS' : 'FAILED');
        } else {
            console.log('\nTo run a real email test, execute:');
            console.log('  node test_email_service.js [general|billing] [recipient_email]');
        }

    } catch (e) {
        console.error('Error during test:', e);
    } finally {
        await pool.end();
        console.log('DB Connection closed.');
    }
}

run();
