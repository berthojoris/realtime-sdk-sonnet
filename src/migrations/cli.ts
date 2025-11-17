#!/usr/bin/env node
/**
 * Migration CLI Tool
 * Run database migrations from the command line
 */

import { loadEnv, loadDatabaseConfigFromEnv } from '../config';
import { createMigrationRunner } from './index';
import { allMigrations } from './migrations';

// Load environment variables
loadEnv();

const command = process.argv[2];

async function main() {
  try {
    // Load database configuration
    const dbConfig = loadDatabaseConfigFromEnv();

    console.log('==============================================');
    console.log('  DATABASE MIGRATION TOOL');
    console.log('==============================================');
    console.log(`Database Type: ${dbConfig.type}`);
    console.log('');

    // Create migration runner
    const runner = await createMigrationRunner(dbConfig, allMigrations);

    switch (command) {
      case 'up':
      case 'migrate':
        console.log('Running migrations...');
        await runner.runMigrations();
        console.log('');
        console.log('✓ All migrations completed successfully');
        break;

      case 'down':
      case 'rollback': {
        const steps = parseInt(process.argv[3] || '1');
        console.log(`Rolling back ${steps} migration(s)...`);
        await runner.rollback(steps);
        console.log('');
        console.log('✓ Rollback completed successfully');
        break;
      }

      case 'status':
      case 'version': {
        const version = await runner.getCurrentVersion();
        console.log(`Current migration version: ${version}`);
        console.log(`Total migrations available: ${allMigrations.length}`);

        const pending = allMigrations.filter(m => m.version > version);
        if (pending.length > 0) {
          console.log('');
          console.log('Pending migrations:');
          pending.forEach(m => {
            console.log(`  ${m.version}. ${m.name}`);
          });
        } else {
          console.log('');
          console.log('✓ Database is up to date');
        }
        break;
      }

      case 'reset': {
        console.log('WARNING: This will rollback ALL migrations!');
        console.log('Press Ctrl+C to cancel or wait 5 seconds to continue...');

        await new Promise(resolve => setTimeout(resolve, 5000));

        const version = await runner.getCurrentVersion();
        if (version > 0) {
          console.log('Rolling back all migrations...');
          await runner.rollback(version);
          console.log('');
          console.log('✓ All migrations rolled back');
        } else {
          console.log('No migrations to rollback');
        }
        break;
      }

      case 'fresh': {
        console.log('WARNING: This will reset and re-run ALL migrations!');
        console.log('Press Ctrl+C to cancel or wait 5 seconds to continue...');

        await new Promise(resolve => setTimeout(resolve, 5000));

        const version = await runner.getCurrentVersion();
        if (version > 0) {
          console.log('Rolling back all migrations...');
          await runner.rollback(version);
          console.log('');
        }

        console.log('Running fresh migrations...');
        await runner.runMigrations();
        console.log('');
        console.log('✓ Fresh migration completed successfully');
        break;
      }

      default:
        printHelp();
        process.exit(0);
    }

    console.log('==============================================');
    process.exit(0);
  } catch (error: any) {
    console.error('');
    console.error('✗ Migration failed:', error.message);
    console.error('==============================================');

    if (process.env.DEBUG === 'true') {
      console.error('');
      console.error('Stack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

function printHelp() {
  console.log('Usage: npm run migrate <command>');
  console.log('');
  console.log('Commands:');
  console.log('  up, migrate        Run pending migrations');
  console.log('  down, rollback [n] Rollback last n migrations (default: 1)');
  console.log('  status, version    Show migration status');
  console.log('  reset              Rollback all migrations');
  console.log('  fresh              Reset and re-run all migrations');
  console.log('  help               Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  npm run migrate up');
  console.log('  npm run migrate down 2');
  console.log('  npm run migrate status');
  console.log('  npm run migrate fresh');
}

// Run CLI
if (require.main === module) {
  main();
}
