/**
 * Basic Server Example
 * Demonstrates how to start the analytics server with .env configuration
 */

const { startServer, setupGracefulShutdown } = require('../dist/server');

async function main() {
  console.log('Starting Realtime Analytics Server...\n');

  try {
    // Start the server (automatically loads .env configuration)
    const server = await startServer();

    // Setup graceful shutdown handlers
    setupGracefulShutdown(server);

    console.log('\nServer is ready to accept requests!');
    console.log('Press Ctrl+C to stop the server');

  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

main();
