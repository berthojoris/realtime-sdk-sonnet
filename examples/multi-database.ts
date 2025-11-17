/**
 * Multi-Database Example
 * Demonstrates using different database adapters
 */

import { AnalyticsSDK } from '../src';

// Example 1: Using MongoDB
async function mongoExample() {
  const sdk = new AnalyticsSDK({
    database: {
      type: 'mongodb',
      connection: {
        uri: 'mongodb://localhost:27017',
        database: 'analytics'
      }
    }
  });

  await sdk.initialize();
  await sdk.track('page_view', { path: '/mongo' });
  await sdk.shutdown();
}

// Example 2: Using MySQL
async function mysqlExample() {
  const sdk = new AnalyticsSDK({
    database: {
      type: 'mysql',
      connection: {
        host: 'localhost',
        port: 3306,
        username: 'root',
        password: 'password',
        database: 'analytics'
      },
      pool: {
        min: 2,
        max: 10
      }
    }
  });

  await sdk.initialize();
  await sdk.track('page_view', { path: '/mysql' });
  await sdk.shutdown();
}

// Example 3: Using PostgreSQL
async function postgresExample() {
  const sdk = new AnalyticsSDK({
    database: {
      type: 'postgresql',
      connection: {
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'password',
        database: 'analytics'
      }
    }
  });

  await sdk.initialize();
  await sdk.track('page_view', { path: '/postgres' });
  await sdk.shutdown();
}

// Example 4: Using SQLite
async function sqliteExample() {
  const sdk = new AnalyticsSDK({
    database: {
      type: 'sqlite',
      connection: {
        filename: './analytics.db'
      }
    }
  });

  await sdk.initialize();
  await sdk.track('page_view', { path: '/sqlite' });
  await sdk.shutdown();
}

// Example 5: Using Plaintext (JSONL)
async function plaintextExample() {
  const sdk = new AnalyticsSDK({
    database: {
      type: 'plaintext',
      connection: {
        directory: './analytics-data'
      },
      options: {
        format: 'jsonl'
      }
    }
  });

  await sdk.initialize();
  await sdk.track('page_view', { path: '/plaintext' });
  await sdk.shutdown();
}

// Example 6: Using Plaintext (CSV)
async function csvExample() {
  const sdk = new AnalyticsSDK({
    database: {
      type: 'plaintext',
      connection: {
        directory: './analytics-csv'
      },
      options: {
        format: 'csv'
      }
    }
  });

  await sdk.initialize();
  await sdk.track('page_view', { path: '/csv' });
  await sdk.shutdown();
}

// Run all examples
async function runAll() {
  console.log('Testing MongoDB...');
  await mongoExample();
  
  console.log('Testing MySQL...');
  await mysqlExample();
  
  console.log('Testing PostgreSQL...');
  await postgresExample();
  
  console.log('Testing SQLite...');
  await sqliteExample();
  
  console.log('Testing Plaintext JSONL...');
  await plaintextExample();
  
  console.log('Testing CSV...');
  await csvExample();
  
  console.log('All examples completed!');
}

runAll().catch(console.error);