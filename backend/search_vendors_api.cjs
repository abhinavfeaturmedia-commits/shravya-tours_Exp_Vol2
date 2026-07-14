const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.js');
const content = fs.readFileSync(filePath, 'utf8');

const startIdx = content.indexOf("app.get('/api/vendors-with-stats'");
if (startIdx !== -1) {
    // Print 100 lines from startIdx
    const lines = content.slice(startIdx).split('\n').slice(0, 100);
    lines.forEach((l, i) => console.log(`${i+1}: ${l}`));
} else {
    console.log("Not found");
}
