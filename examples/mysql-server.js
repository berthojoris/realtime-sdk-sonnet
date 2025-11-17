/**
 * MySQL Server Example
 * Demonstrates MySQL configuration
 */

const { AnalyticsAPIServer } = require('../dist/server');

async function main() {
  console.log('Starting MySQL Analytics Server...\n');

  // MySQL configuration using connection string
  const config = {
    database: {
      type: 'mysql',
      connection: {
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT || '3306'),
        database: process.env.MYSQL_DATABASE || 'analytics',
        username: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || 'password'
      },
      pool: {
        min: 2,
        max: 10
      }
    },

    server: {
      port: 3000,
      cors: {
        origin: '*'
      }
    }
  };

  try {
    console.log('Connecting to MySQL...');
    console.log(`  Host: ${config.database.connection.host}:${config.database.connection.port}`);
    console.log(`  Database: ${config.database.connection.database}`);
    console.log(`  User: ${config.database.connection.username}`);
    console.log('');

    const server = new AnalyticsAPIServer(config);
    await server.start();

    console.log('✓ MySQL server started successfully');
    console.log(`  Server listening on port ${config.server.port}`);
    console.log('\nPress Ctrl+C to stop');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down...');
      await server.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start server:', error.message);
    console.error('\nMake sure MySQL is running and credentials are correct');
    console.error('You can set environment variables:');
    console.error('  MYSQL_HOST=localhost');
    console.error('  MYSQL_PORT=3306');
    console.error('  MYSQL_DATABASE=analytics');
    console.error('  MYSQL_USER=root');
    console.error('  MYSQL_PASSWORD=your_password');
    process.exit(1);
  }
}

main();
