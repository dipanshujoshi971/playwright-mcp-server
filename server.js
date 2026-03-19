import http from 'http';
import { createConnection } from '@playwright/mcp';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

const PORT = process.env.PORT || 8931;
const HOST = '0.0.0.0';

// Create HTTP server
const server = http.createServer(async (req, res) => {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // SSE endpoint
  if (req.url === '/sse' && req.method === 'GET') {
    console.log('New SSE connection established');
    
    const transport = new SSEServerTransport('/message', res);
    
    // Create Playwright MCP connection
    await createConnection({
      transport,
      options: {
        headless: true,
        browser: 'chromium',
        timeout: 30000
      }
    });
    
    return;
  }

  // Message endpoint for SSE
  if (req.url === '/message' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const message = JSON.parse(body);
        // Handle the message through the transport
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'received' }));
      } catch (error) {
        console.error('Error processing message:', error);
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid message format' }));
      }
    });
    
    return;
  }

  // Health check endpoint
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy',
      service: 'playwright-mcp-server',
      endpoints: {
        sse: '/sse',
        message: '/message'
      }
    }));
    return;
  }

  // 404 for other routes
  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, HOST, () => {
  console.log(`Playwright MCP Server running on http://${HOST}:${PORT}`);
  console.log(`SSE endpoint: http://${HOST}:${PORT}/sse`);
  console.log(`Message endpoint: http://${HOST}:${PORT}/message`);
  console.log(`Health check: http://${HOST}:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
