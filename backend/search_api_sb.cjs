const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/lib/api.ts');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log("Total lines:", lines.length);

const results = [];
lines.forEach((line, idx) => {
    if (line.includes('createSupplierBooking') || line.includes('updateSupplierBooking') || line.includes('deleteSupplierBooking')) {
        results.push({ lineNum: idx + 1, content: line.trim() });
    }
});

console.log("Matching lines count:", results.length);
results.forEach(r => {
    console.log(`Line ${r.lineNum}: ${r.content}`);
});
