const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');

// Let's find lines with app.get, app.post, app.put, app.delete, or router
const lines = content.split('\n');
console.log("Total lines:", lines.length);

const results = [];
lines.forEach((line, idx) => {
    if (line.includes('app.get(') || line.includes('app.post(') || line.includes('app.put(') || line.includes('app.delete(') || line.includes('router.') || line.includes('/api/crud')) {
        results.push({ lineNum: idx + 1, content: line.trim() });
    }
});

console.log("Matching lines count:", results.length);
results.slice(0, 100).forEach(r => {
    console.log(`Line ${r.lineNum}: ${r.content}`);
});
