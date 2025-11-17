/**
 * Custom Server Example
 * Demonstrates manual configuration (without .env)
 */

const { AnalyticsAPIServer } = require('../dist/server');

async function main() {
  console.log('Starting Custom Analytics Server...\n');

  // Manual configuration (alternative to .env)
  const config = {
    database: {
      type: 'sqlite',
      connection: {
        filename: './custom-analytics.db'
      }
    },

    server: {
      port: 4000,
      host: '127.0.0.1',

      cors: {
        origin: ['http://localhost:3000', 'http://localhost:8080'],
        credentials: true,
        methods: ['GET', 'POST', 'OPTIONS']
      },

      security: {
        apiKeys: ['dev_key_123', 'dev_key_456'],
        rateLimit: {
          windowMs: 60000,
          maxRequests: 100
        }
      }
    },

    analytics: {
      batchSize: 50,
      flushInterval: 3000,
      enableRealtime: false
    },

    privacy: {
      enableGDPR: true,
      dataRetentionDays: 90,
      anonymizeIP: true
    }
  };

  try {
    const server = new AnalyticsAPIServer(config);
    await server.start();

    console.log('✓ Custom server started successfully');
    console.log(`  Listening on http://${config.server.host}:${config.server.port}`);
    console.log('  Database: SQLite (custom-analytics.db)');
    console.log('  API Keys: 2 configured');
    console.log('\nPress Ctrl+C to stop');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down...');
      await server.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

main();
