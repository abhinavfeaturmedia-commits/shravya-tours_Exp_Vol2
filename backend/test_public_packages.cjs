const http = require('http');

http.get('http://localhost:3001/api/crud/packages?order=created_at&asc=false', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', res.headers);
    try {
      const parsed = JSON.parse(data);
      console.log('Returned Packages count:', parsed.data ? parsed.data.length : 'no data field');
      if (parsed.data && parsed.data.length > 0) {
        console.log('First package:', JSON.stringify(parsed.data[0], null, 2));
      } else {
        console.log('Full response body:', data);
      }
    } catch(e) {
      console.log('Parsing error:', e.message);
      console.log('Raw body:', data);
    }
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
