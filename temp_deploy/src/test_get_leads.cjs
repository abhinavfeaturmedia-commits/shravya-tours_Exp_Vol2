const http = require('http');

http.get('http://localhost:5000/api/leads-with-logs', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Body start:', data.substring(0, 100));
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
