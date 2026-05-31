import http from 'http';

const ports = [3000, 3001, 5000];

ports.forEach(port => {
    const req = http.get(`http://localhost:${port}/api/crud/leads`, (res) => {
        console.log(`Port ${port}: Status ${res.statusCode}`);
        res.resume();
    });
    req.on('error', (err) => {
        console.log(`Port ${port}: Error ${err.message}`);
    });
});
