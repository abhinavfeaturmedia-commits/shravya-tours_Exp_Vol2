const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.js');
const content = fs.readFileSync(filePath, 'utf8');

const startIdx = content.indexOf("app.get('/api/vendors-with-stats'");
if (startIdx !== -1) {
    const lines = content.slice(startIdx).split('\n').slice(90, 190);
    lines.forEach((l, i) => console.log(`${i+91}: ${l}`));
} else {
    console.log("Not found");
}
