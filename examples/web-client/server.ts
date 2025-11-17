/**
 * Web Client API Server Example
 * Demonstrates how to run the API server for browser clients with CORS and IP security
 */

import { AnalyticsAPIServer } from '../../src/server/APIServer';

async function startServer() {
  // Create API server instance with comprehensive CORS and security configuration
  const server = new AnalyticsAPIServer({
    database: {
      type: 'sqlite',
      connection: {
        filename: './web-analytics.db'
      }
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      
      // Enhanced CORS configuration
      cors: {
        // Option 1: Allow all origins (for development)
        origin: '*',
        
        // Option 2: Allow specific origins
        // origin: ['http://localhost:3000', 'https://example.com'],
        
        // Option 3: Dynamic origin validation with function
        // origin: (origin) => {
        //   const allowedDomains = ['.example.com', '.myapp.com'];
        //   return allowedDomains.some(domain => origin.endsWith(domain));
        // },
        
        credentials: true,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'X-API-Key', 'Authorization'],
        exposedHeaders: ['X-Request-ID'],
        maxAge: 86400 // 24 hours
      },
      
      // Security configuration
      security: {
        // API Keys (empty = no authentication required for demo)
        apiKeys: [],
        // apiKeys: ['your-secret-api-key-1', 'your-secret-api-key-2'],
        
        // IP Allowlist (empty = allow all IPs)
        allowedIPs: [],
        // Examples of IP allowlist patterns:
        // allowedIPs: [
        //   '192.168.1.100',        // Exact IP
        //   '192.168.1.*',          // Wildcard
        //   '10.0.0.0/8',           // CIDR notation
        //   '::1',                  // IPv6 localhost
        // ],
        
        // IP Blocklist
        blockedIPs: [],
        // blockedIPs: ['203.0.113.0/24', '198.51.100.*'],
        
        // Trust proxy headers (enable if behind nginx, cloudflare, etc.)
        trustProxy: false,
        
        // Rate limiting
        rateLimit: {
          windowMs: 60000,      // 1 minute
          maxRequests: 100      // Max 100 requests per minute per IP
        }
      },
      
      enableWebSocket: true
    },
    analytics: {
      batchSize: 50,
      flushInterval: 5000,
      enableRealtime: true
    },
    privacy: {
      enableGDPR: true,
      dataRetentionDays: 90,
      anonymizeIP: true
    }
  });

  // Start the server
  await server.start();

  console.log('\n🚀 Analytics API Server Started!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📍 Server URL: http://localhost:3000');
  console.log('🌐 Open the demo: examples/web-client/index.html');
  console.log('📊 Real-time WebSocket: ws://localhost:3000');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('🔒 Security Configuration:');
  console.log('  CORS: Allowing all origins (*)');
  console.log('  API Keys: Not required (demo mode)');
  console.log('  IP Filtering: Disabled (allow all)');
  console.log('  Rate Limit: 100 requests/minute\n');

  console.log('📡 Available Endpoints:');
  console.log('  POST   /events         - Track single event');
  console.log('  POST   /events/batch   - Track multiple events');
  console.log('  GET    /events         - Retrieve events');
  console.log('  GET    /stats          - Get statistics');
  console.log('  POST   /identify       - Identify user');
  console.log('  POST   /consent        - Update consent');
  console.log('  GET    /health         - Health check');
  
  console.log('\n💡 Tips:');
  console.log('  • Edit server configuration in examples/web-client/server.ts');
  console.log('  • Enable API keys for production use');
  console.log('  • Configure IP allowlist to restrict access');
  console.log('  • Set specific CORS origins for security');
  console.log('\n⌨️  Press Ctrl+C to stop the server\n');

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down server...');
    await server.stop();
    console.log('✅ Server stopped successfully');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n\n🛑 Shutting down server...');
    await server.stop();
    console.log('✅ Server stopped successfully');
    process.exit(0);
  });
}

// Start the server
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});