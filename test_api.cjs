const http = require('http');

const data = JSON.stringify({
  name: 'Backend Test Term',
  category: 'Other',
  content: 'This is a test term'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/crud/master_terms_templates',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
