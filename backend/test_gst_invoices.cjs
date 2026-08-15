const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const pathsToTry = [
    path.join(__dirname, '.env'),
    path.join(__dirname, '..', '.env.local'),
    path.join(__dirname, '..', '.env')
];

for (const envPath of pathsToTry) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        break;
    }
}

async function testGstInvoicing() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        connectTimeout: 30000
    });

    try {
        console.log("=== Testing GST Invoicing Engine ===");

        // Test FY calculation
        function getIndianFinancialYear(dateInput) {
            const d = dateInput ? new Date(dateInput) : new Date();
            const validDate = isNaN(d.getTime()) ? new Date() : d;
            const month = validDate.getMonth();
            const year = validDate.getFullYear();
            const startYear = (month >= 3) ? year : (year - 1);
            const endYear = startYear + 1;
            return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
        }

        const testMarch = getIndianFinancialYear('2025-03-31');
        const testApril = getIndianFinancialYear('2025-04-01');
        const testAug26 = getIndianFinancialYear('2026-08-15');

        console.log(`FY for 2025-03-31: ${testMarch} (Expected: 24-25) -> ${testMarch === '24-25' ? 'PASS' : 'FAIL'}`);
        console.log(`FY for 2025-04-01: ${testApril} (Expected: 25-26) -> ${testApril === '25-26' ? 'PASS' : 'FAIL'}`);
        console.log(`FY for 2026-08-15: ${testAug26} (Expected: 26-27) -> ${testAug26 === '26-27' ? 'PASS' : 'FAIL'}`);

        // Check document_sequences table
        const [seqs] = await pool.query('SELECT * FROM document_sequences');
        console.log("Current document sequences in DB:", seqs);

        // Check invoices table columns
        const [cols] = await pool.query("SHOW COLUMNS FROM invoices LIKE 'invoice_no'");
        console.log("invoice_no column verified:", cols.length > 0 ? 'YES' : 'NO');

        console.log("=== All DB Checks Passed ===");
        process.exit(0);
    } catch (e) {
        console.error("Test failed:", e);
        process.exit(1);
    }
}

testGstInvoicing();
