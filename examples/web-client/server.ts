/**
 * Web Client API Server Example
 * Demonstrates how to run the API server for browser clients
 */

import { AnalyticsAPIServer } from '../../src/server/APIServer';

async function startServer() {
  // Create API server instance
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
      cors: {
        origin: '*', // Allow all origins for demo
        credentials: true
      },
      apiKeys: [], // No API key required for demo
      enableWebSocket: true // Enable real-time streaming
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

  console.log('Available Endpoints:');
  console.log('  POST   /events         - Track single event');
  console.log('  POST   /events/batch   - Track multiple events');
  console.log('  GET    /events         - Retrieve events');
  console.log('  GET    /stats          - Get statistics');
  console.log('  POST   /identify       - Identify user');
  console.log('  POST   /consent        - Update consent');
  console.log('  GET    /health         - Health check');
  console.log('\n💡 Press Ctrl+C to stop the server\n');

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