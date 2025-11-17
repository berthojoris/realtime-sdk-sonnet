/**
 * Database Migrations
 * Schema definitions for all supported databases
 */

import { Migration } from './index';

/**
 * Migration 1: Initial schema
 * Creates events, sessions, and users tables/collections
 */
export const migration001_initial_schema: Migration = {
  version: 1,
  name: 'initial_schema',

  async up(db: any) {
    // Detect database type based on the db object
    if (db.execute) {
      // MySQL
      await upMySQL(db);
    } else if (db.query) {
      // PostgreSQL
      await upPostgreSQL(db);
    } else if (db.exec) {
      // SQLite
      await upSQLite(db);
    } else if (db.createCollection) {
      // MongoDB
      await upMongoDB(db);
    }
  },

  async down(db: any) {
    // Detect database type
    if (db.execute) {
      // MySQL
      await db.execute('DROP TABLE IF EXISTS events');
      await db.execute('DROP TABLE IF EXISTS sessions');
      await db.execute('DROP TABLE IF EXISTS users');
    } else if (db.query) {
      // PostgreSQL
      await db.query('DROP TABLE IF EXISTS events CASCADE');
      await db.query('DROP TABLE IF EXISTS sessions CASCADE');
      await db.query('DROP TABLE IF EXISTS users CASCADE');
    } else if (db.exec) {
      // SQLite
      db.exec('DROP TABLE IF EXISTS events');
      db.exec('DROP TABLE IF EXISTS sessions');
      db.exec('DROP TABLE IF EXISTS users');
    } else if (db.dropCollection) {
      // MongoDB
      try {
        await db.dropCollection('events');
        await db.dropCollection('sessions');
        await db.dropCollection('users');
      } catch (e) {
        // Collections might not exist
      }
    }
  }
};

/**
 * MySQL Schema
 */
async function upMySQL(db: any): Promise<void> {
  // Events table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS events (
      id VARCHAR(36) PRIMARY KEY,
      type VARCHAR(50) NOT NULL,
      timestamp BIGINT NOT NULL,
      sessionId VARCHAR(36) NOT NULL,
      userId VARCHAR(36),
      anonymousId VARCHAR(36),
      properties JSON,
      context JSON,
      metadata JSON,
      INDEX idx_timestamp (timestamp),
      INDEX idx_sessionId (sessionId),
      INDEX idx_userId (userId),
      INDEX idx_type (type),
      INDEX idx_timestamp_type (timestamp, type),
      INDEX idx_anonymousId (anonymousId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Sessions table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(36) PRIMARY KEY,
      userId VARCHAR(36),
      anonymousId VARCHAR(36) NOT NULL,
      startTime BIGINT NOT NULL,
      lastActivityTime BIGINT NOT NULL,
      endTime BIGINT,
      eventCount INT DEFAULT 0,
      metadata JSON,
      INDEX idx_userId (userId),
      INDEX idx_anonymousId (anonymousId),
      INDEX idx_startTime (startTime)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Users table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36),
      anonymousId VARCHAR(36) PRIMARY KEY,
      traits JSON,
      consent JSON,
      createdAt BIGINT NOT NULL,
      updatedAt BIGINT NOT NULL,
      INDEX idx_id (id),
      INDEX idx_createdAt (createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

/**
 * PostgreSQL Schema
 */
async function upPostgreSQL(db: any): Promise<void> {
  // Events table
  await db.query(`
    CREATE TABLE IF NOT EXISTS events (
      id VARCHAR(36) PRIMARY KEY,
      type VARCHAR(50) NOT NULL,
      timestamp BIGINT NOT NULL,
      session_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36),
      anonymous_id VARCHAR(36),
      properties JSONB,
      context JSONB,
      metadata JSONB
    )
  `);

  // Create indexes
  await db.query('CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_events_type ON events(type)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_events_timestamp_type ON events(timestamp, type)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_events_anonymous_id ON events(anonymous_id)');

  // Sessions table
  await db.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36),
      anonymous_id VARCHAR(36) NOT NULL,
      start_time BIGINT NOT NULL,
      last_activity_time BIGINT NOT NULL,
      end_time BIGINT,
      event_count INTEGER DEFAULT 0,
      metadata JSONB
    )
  `);

  await db.query('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_sessions_anonymous_id ON sessions(anonymous_id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time)');

  // Users table
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36),
      anonymous_id VARCHAR(36) PRIMARY KEY,
      traits JSONB,
      consent JSONB,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )
  `);

  await db.query('CREATE INDEX IF NOT EXISTS idx_users_id ON users(id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)');
}

/**
 * SQLite Schema
 */
async function upSQLite(db: any): Promise<void> {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      sessionId TEXT NOT NULL,
      userId TEXT,
      anonymousId TEXT,
      properties TEXT,
      context TEXT,
      metadata TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_timestamp ON events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_sessionId ON events(sessionId);
    CREATE INDEX IF NOT EXISTS idx_userId ON events(userId);
    CREATE INDEX IF NOT EXISTS idx_type ON events(type);
    CREATE INDEX IF NOT EXISTS idx_timestamp_type ON events(timestamp, type);
    CREATE INDEX IF NOT EXISTS idx_anonymousId ON events(anonymousId);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      userId TEXT,
      anonymousId TEXT NOT NULL,
      startTime INTEGER NOT NULL,
      lastActivityTime INTEGER NOT NULL,
      endTime INTEGER,
      eventCount INTEGER DEFAULT 0,
      metadata TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_userId ON sessions(userId);
    CREATE INDEX IF NOT EXISTS idx_sessions_anonymousId ON sessions(anonymousId);
    CREATE INDEX IF NOT EXISTS idx_sessions_startTime ON sessions(startTime);

    CREATE TABLE IF NOT EXISTS users (
      id TEXT,
      anonymousId TEXT PRIMARY KEY,
      traits TEXT,
      consent TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
    CREATE INDEX IF NOT EXISTS idx_users_createdAt ON users(createdAt);
  `);
}

/**
 * MongoDB Schema
 */
async function upMongoDB(db: any): Promise<void> {
  // Create collections
  const collections = await db.listCollections().toArray();
  const collectionNames = collections.map((c: any) => c.name);

  if (!collectionNames.includes('events')) {
    await db.createCollection('events');
  }

  if (!collectionNames.includes('sessions')) {
    await db.createCollection('sessions');
  }

  if (!collectionNames.includes('users')) {
    await db.createCollection('users');
  }

  // Create indexes for events
  await db.collection('events').createIndexes([
    { key: { timestamp: 1 } },
    { key: { sessionId: 1 } },
    { key: { userId: 1 } },
    { key: { anonymousId: 1 } },
    { key: { type: 1 } },
    { key: { timestamp: 1, type: 1 } }
  ]);

  // Create indexes for sessions
  await db.collection('sessions').createIndexes([
    { key: { userId: 1 } },
    { key: { anonymousId: 1 } },
    { key: { startTime: 1 } }
  ]);

  // Create indexes for users
  await db.collection('users').createIndexes([
    { key: { id: 1 } },
    { key: { anonymousId: 1 }, unique: true },
    { key: { createdAt: 1 } }
  ]);
}

/**
 * All migrations in order
 */
export const allMigrations: Migration[] = [
  migration001_initial_schema
];
