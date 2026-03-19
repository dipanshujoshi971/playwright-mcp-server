import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { chromium } from 'playwright';
import http from 'http';

const PORT = process.env.PORT || 8931;

// Create MCP server
const server = new Server(
  {
    name: "playwright-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define Playwright tools
server.setRequestHandler("tools/list", async () => {
  return {
    tools: [
      {
        name: "playwright_navigate",
        description: "Navigate to a URL in the browser",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "The URL to navigate to",
            },
          },
          required: ["url"],
        },
      },
      {
        name: "playwright_screenshot",
        description: "Take a screenshot of the current page",
        inputSchema: {
          type: "object",
          properties: {
            fullPage: {
              type: "boolean",
              description: "Whether to take a full page screenshot",
              default: false,
            },
          },
        },
      },
      {
        name: "playwright_click",
        description: "Click an element on the page",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "CSS selector for the element to click",
            },
          },
          required: ["selector"],
        },
      },
      {
        name: "playwright_fill",
        description: "Fill a form field",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "CSS selector for the input element",
            },
            value: {
              type: "string",
              description: "Value to fill",
            },
          },
          required: ["selector", "value"],
        },
      },
      {
        name: "playwright_get_text",
        description: "Get text content from the page",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "CSS selector for the element (optional, gets body if not provided)",
            },
          },
        },
      },
    ],
  };
});

// Browser instance (created when needed)
let browser = null;
let page = null;

async function ensureBrowser() {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    page = await context.newPage();
  }
  return page;
}

// Handle tool calls
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const page = await ensureBrowser();

    switch (name) {
      case "playwright_navigate":
        await page.goto(args.url);
        return {
          content: [
            {
              type: "text",
              text: `Successfully navigated to ${args.url}`,
            },
          ],
        };

      case "playwright_screenshot":
        const screenshot = await page.screenshot({
          fullPage: args.fullPage || false,
          encoding: "base64",
        });
        return {
          content: [
            {
              type: "text",
              text: `Screenshot taken successfully`,
            },
            {
              type: "image",
              data: screenshot,
              mimeType: "image/png",
            },
          ],
        };

      case "playwright_click":
        await page.click(args.selector);
        return {
          content: [
            {
              type: "text",
              text: `Clicked element: ${args.selector}`,
            },
          ],
        };

      case "playwright_fill":
        await page.fill(args.selector, args.value);
        return {
          content: [
            {
              type: "text",
              text: `Filled ${args.selector} with: ${args.value}`,
            },
          ],
        };

      case "playwright_get_text":
        const selector = args.selector || "body";
        const text = await page.textContent(selector);
        return {
          content: [
            {
              type: "text",
              text: text || "No text found",
            },
          ],
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// HTTP server for SSE connections
const httpServer = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'playwright-mcp-server',
      version: '1.0.0',
      endpoints: {
        sse: '/sse',
      }
    }));
    return;
  }

  // SSE endpoint
  if (req.url === '/sse') {
    console.log(`[${new Date().toISOString()}] New SSE connection from ${req.socket.remoteAddress}`);
    
    const transport = new SSEServerTransport('/message', res);
    await server.connect(transport);
    
    console.log(`[${new Date().toISOString()}] SSE connection established`);
    return;
  }

  // Message endpoint
  if (req.url === '/message' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        console.log(`[${new Date().toISOString()}] Received message:`, body);
        res.writeHead(202);
        res.end();
      } catch (error) {
        console.error('Error processing message:', error);
        res.writeHead(400);
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    
    return;
  }

  // 404
  res.writeHead(404);
  res.end('Not Found');
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[${new Date().toISOString()}] Playwright MCP Server started`);
  console.log(`[${new Date().toISOString()}] Listening on http://0.0.0.0:${PORT}`);
  console.log(`[${new Date().toISOString()}] SSE Endpoint: http://0.0.0.0:${PORT}/sse`);
  console.log(`[${new Date().toISOString()}] Health Check: http://0.0.0.0:${PORT}/health`);
});

// Cleanup on exit
process.on('SIGTERM', async () => {
  console.log('[${new Date().toISOString()}] SIGTERM received, shutting down...');
  if (browser) {
    await browser.close();
  }
  httpServer.close(() => {
    console.log('[${new Date().toISOString()}] Server closed');
    process.exit(0);
  });
});