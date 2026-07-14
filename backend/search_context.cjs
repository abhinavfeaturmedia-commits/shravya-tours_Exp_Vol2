const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../context/DataContext.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log("Total lines:", lines.length);

const results = [];
lines.forEach((line, idx) => {
    if (line.includes('supplierBookings') || line.includes('SupplierBooking') || line.includes('vendors') || line.includes('addSupplierBooking')) {
        results.push({ lineNum: idx + 1, content: line.trim() });
    }
});

console.log("Matching lines count:", results.length);
results.forEach(r => {
    console.log(`Line ${r.lineNum}: ${r.content}`);
});
