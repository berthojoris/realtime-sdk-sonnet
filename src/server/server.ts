/**
 * Server Entry Point
 * Starts the analytics server with .env configuration
 */

import { AnalyticsAPIServer } from './APIServer';
import { loadEnv, loadServerConfig, validateServerConfig, printConfigSummary, isDebugEnabled } from '../config';

/**
 * Start the analytics server
 */
export async function startServer(): Promise<AnalyticsAPIServer> {
  // Load environment variables from .env file
  loadEnv();

  // Load and validate configuration
  const config = loadServerConfig();
  validateServerConfig(config);

  // Print configuration summary in debug mode
  if (isDebugEnabled()) {
    printConfigSummary(config);
  }

  // Create and start server
  const server = new AnalyticsAPIServer(config);

  try {
    await server.start();
    console.log('✓ Analytics server started successfully');
    return server;
  } catch (error: any) {
    console.error('✗ Failed to start analytics server:', error.message);
    throw error;
  }
}

/**
 * Graceful shutdown handler
 */
export async function stopServer(server: AnalyticsAPIServer): Promise<void> {
  console.log('Shutting down server...');

  try {
    await server.stop();
    console.log('✓ Server stopped successfully');
  } catch (error: any) {
    console.error('✗ Error during shutdown:', error.message);
    throw error;
  }
}

/**
 * Setup signal handlers for graceful shutdown
 */
export function setupGracefulShutdown(server: AnalyticsAPIServer): void {
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down gracefully...`);

    try {
      await stopServer(server);
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
  });
}

// If this file is run directly
if (require.main === module) {
  startServer()
    .then(server => {
      setupGracefulShutdown(server);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
