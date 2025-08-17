// Simple local server for testing multi-tenant routing
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// MIME types for different file extensions
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    
    let filePath = req.url;
    
    // Handle multi-tenant routing
    if (filePath.startsWith('/gym1') || 
        filePath.startsWith('/gym2') || 
        filePath.startsWith('/gym3') || 
        filePath.startsWith('/demo')) {
        filePath = '/index.html';
    }
    
    // Default to index.html for root
    if (filePath === '/') {
        filePath = '/demo'; // Redirect to demo
        res.writeHead(302, { 'Location': '/demo' });
        res.end();
        return;
    }
    
    // If it's a tenant path, serve index.html
    if (filePath === '/demo' || filePath.match(/^\/gym\d+$/)) {
        filePath = '/index.html';
    }
    
    // Build full file path
    const fullPath = path.join(__dirname, filePath);
    
    // Check if file exists
    fs.access(fullPath, fs.constants.F_OK, (err) => {
        if (err) {
            // File not found
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(`
                <h1>404 - File Not Found</h1>
                <p>Requested: ${req.url}</p>
                <p>Available routes:</p>
                <ul>
                    <li><a href="/demo">/demo</a> - Demo Gym</li>
                    <li><a href="/gym1">/gym1</a> - Gym 1</li>
                    <li><a href="/gym2">/gym2</a> - Gym 2</li>
                    <li><a href="/gym3">/gym3</a> - Gym 3</li>
                </ul>
            `);
            return;
        }
        
        // Get file extension for MIME type
        const ext = path.extname(fullPath);
        const contentType = mimeTypes[ext] || 'text/plain';
        
        // Read and serve the file
        fs.readFile(fullPath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end('<h1>500 - Internal Server Error</h1>');
                return;
            }
            
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Tenant-ID'
            });
            res.end(data);
        });
    });
});

server.listen(PORT, () => {
    console.log(`🚀 GymFlow local server running at http://localhost:${PORT}`);
    console.log(`📱 Test URLs:`);
    console.log(`   Demo Gym: http://localhost:${PORT}/demo`);
    console.log(`   Gym 1:    http://localhost:${PORT}/gym1`);
    console.log(`   Gym 2:    http://localhost:${PORT}/gym2`);
    console.log(`   Gym 3:    http://localhost:${PORT}/gym3`);
    console.log(`\n💡 Press Ctrl+C to stop the server`);
});

// Handle server shutdown gracefully
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down server...');
    server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
    });
});
