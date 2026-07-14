const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../pages/admin/Vendors.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log("Total lines:", lines.length);

const results = [];
lines.forEach((line, idx) => {
    if (line.includes('transaction') || line.includes('pay') || line.includes('ledger') || line.includes('SupplierBooking') || line.includes('balance_due')) {
        results.push({ lineNum: idx + 1, content: line.trim() });
    }
});

console.log("Matching lines count:", results.length);
results.slice(0, 50).forEach(r => {
    console.log(`Line ${r.lineNum}: ${r.content}`);
});
