/**
 * Database Migration System
 * Handles schema creation and migrations for all supported databases
 */

import { DatabaseConfig } from "../types";

export interface Migration {
  version: number;
  name: string;
  up: (db: any) => Promise<void>;
  down: (db: any) => Promise<void>;
}

export interface MigrationRunner {
  runMigrations(): Promise<void>;
  getCurrentVersion(): Promise<number>;
  rollback(steps?: number): Promise<void>;
}

/**
 * Create a migration runner for the specified database type
 */
export async function createMigrationRunner(
  config: DatabaseConfig,
  migrations: Migration[],
): Promise<MigrationRunner> {
  switch (config.type) {
    case "mysql":
      return createMySQLMigrationRunner(config, migrations);

    case "postgresql":
      return createPostgreSQLMigrationRunner(config, migrations);

    case "sqlite":
      return createSQLiteMigrationRunner(config, migrations);

    case "mongodb":
      return createMongoDBMigrationRunner(config, migrations);

    case "plaintext":
      // Plaintext doesn't need migrations
      return createNoOpMigrationRunner();

    default:
      throw new Error(
        `Migration runner not available for database type: ${config.type}`,
      );
  }
}

/**
 * MySQL Migration Runner
 */
async function createMySQLMigrationRunner(
  config: DatabaseConfig,
  migrations: Migration[],
): Promise<MigrationRunner> {
  const mysql = await import("mysql2/promise");

  const pool = mysql.createPool({
    host: config.connection?.host || "localhost",
    port: config.connection?.port || 3306,
    user: config.connection?.username,
    password: config.connection?.password,
    database: config.connection?.database || "analytics",
    waitForConnections: true,
    connectionLimit: config.pool?.max || 10,
    ...config.options,
  });

  const runner: MigrationRunner = {
    async runMigrations() {
      // Create migrations table if it doesn't exist
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS migrations (
          version INT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const currentVersion = await runner.getCurrentVersion();

      // Run pending migrations
      for (const migration of migrations) {
        if (migration.version > currentVersion) {
          console.log(
            `Running migration ${migration.version}: ${migration.name}`,
          );
          await migration.up(pool);
          await pool.execute(
            "INSERT INTO migrations (version, name) VALUES (?, ?)",
            [migration.version, migration.name],
          );
          console.log(`✓ Migration ${migration.version} completed`);
        }
      }
    },

    async getCurrentVersion(): Promise<number> {
      try {
        const [rows] = (await pool.execute(
          "SELECT MAX(version) as version FROM migrations",
        )) as any;
        return rows[0].version || 0;
      } catch {
        return 0;
      }
    },

    async rollback(steps = 1): Promise<void> {
      const [rows] = (await pool.execute(
        "SELECT version, name FROM migrations ORDER BY version DESC LIMIT ?",
        [steps],
      )) as any;

      for (const row of rows) {
        const migration = migrations.find((m) => m.version === row.version);
        if (migration) {
          console.log(
            `Rolling back migration ${migration.version}: ${migration.name}`,
          );
          await migration.down(pool);
          await pool.execute("DELETE FROM migrations WHERE version = ?", [
            migration.version,
          ]);
          console.log(`✓ Migration ${migration.version} rolled back`);
        }
      }
    },
  };

  return runner;
}

/**
 * PostgreSQL Migration Runner
 */
async function createPostgreSQLMigrationRunner(
  config: DatabaseConfig,
  migrations: Migration[],
): Promise<MigrationRunner> {
  const { Pool } = await import("pg");

  const pool = new Pool({
    host: config.connection?.host || "localhost",
    port: config.connection?.port || 5432,
    user: config.connection?.username,
    password: config.connection?.password,
    database: config.connection?.database || "analytics",
    min: config.pool?.min || 2,
    max: config.pool?.max || 10,
    ...config.options,
  });

  const runner: MigrationRunner = {
    async runMigrations() {
      // Create migrations table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          version INTEGER PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const currentVersion = await runner.getCurrentVersion();

      // Run pending migrations
      for (const migration of migrations) {
        if (migration.version > currentVersion) {
          console.log(
            `Running migration ${migration.version}: ${migration.name}`,
          );
          await migration.up(pool);
          await pool.query(
            "INSERT INTO migrations (version, name) VALUES ($1, $2)",
            [migration.version, migration.name],
          );
          console.log(`✓ Migration ${migration.version} completed`);
        }
      }
    },

    async getCurrentVersion(): Promise<number> {
      try {
        const result = await pool.query(
          "SELECT MAX(version) as version FROM migrations",
        );
        return result.rows[0].version || 0;
      } catch {
        return 0;
      }
    },

    async rollback(steps = 1): Promise<void> {
      const result = await pool.query(
        "SELECT version, name FROM migrations ORDER BY version DESC LIMIT $1",
        [steps],
      );

      for (const row of result.rows) {
        const migration = migrations.find((m) => m.version === row.version);
        if (migration) {
          console.log(
            `Rolling back migration ${migration.version}: ${migration.name}`,
          );
          await migration.down(pool);
          await pool.query("DELETE FROM migrations WHERE version = $1", [
            migration.version,
          ]);
          console.log(`✓ Migration ${migration.version} rolled back`);
        }
      }
    },
  };

  return runner;
}

/**
 * SQLite Migration Runner
 */
async function createSQLiteMigrationRunner(
  config: DatabaseConfig,
  migrations: Migration[],
): Promise<MigrationRunner> {
  const Database = (await import("better-sqlite3")).default;
  const filename = config.connection?.filename || "./analytics.db";
  const db = new Database(filename, config.options);

  // Enable WAL mode
  db.pragma("journal_mode = WAL");

  const runner: MigrationRunner = {
    async runMigrations() {
      // Create migrations table if it doesn't exist
      db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
      `);

      const currentVersion = await runner.getCurrentVersion();

      // Run pending migrations
      for (const migration of migrations) {
        if (migration.version > currentVersion) {
          console.log(
            `Running migration ${migration.version}: ${migration.name}`,
          );
          await migration.up(db);
          const stmt = db.prepare(
            "INSERT INTO migrations (version, name) VALUES (?, ?)",
          );
          stmt.run(migration.version, migration.name);
          console.log(`✓ Migration ${migration.version} completed`);
        }
      }
    },

    async getCurrentVersion(): Promise<number> {
      try {
        const stmt = db.prepare(
          "SELECT MAX(version) as version FROM migrations",
        );
        const row = stmt.get() as any;
        return row?.version || 0;
      } catch {
        return 0;
      }
    },

    async rollback(steps = 1): Promise<void> {
      const stmt = db.prepare(
        "SELECT version, name FROM migrations ORDER BY version DESC LIMIT ?",
      );
      const rows = stmt.all(steps) as any[];

      for (const row of rows) {
        const migration = migrations.find((m) => m.version === row.version);
        if (migration) {
          console.log(
            `Rolling back migration ${migration.version}: ${migration.name}`,
          );
          await migration.down(db);
          const deleteStmt = db.prepare(
            "DELETE FROM migrations WHERE version = ?",
          );
          deleteStmt.run(migration.version);
          console.log(`✓ Migration ${migration.version} rolled back`);
        }
      }
    },
  };

  return runner;
}

/**
 * MongoDB Migration Runner
 */
async function createMongoDBMigrationRunner(
  config: DatabaseConfig,
  migrations: Migration[],
): Promise<MigrationRunner> {
  const { MongoClient } = await import("mongodb");

  const uri = config.connection?.uri || "mongodb://localhost:27017";
  const dbName = config.connection?.database || "analytics";

  const client = new MongoClient(uri, config.options);
  await client.connect();
  const db = client.db(dbName);

  const runner: MigrationRunner = {
    async runMigrations() {
      // Create migrations collection if it doesn't exist
      const collections = await db
        .listCollections({ name: "migrations" })
        .toArray();
      if (collections.length === 0) {
        await db.createCollection("migrations");
      }

      const currentVersion = await runner.getCurrentVersion();

      // Run pending migrations
      for (const migration of migrations) {
        if (migration.version > currentVersion) {
          console.log(
            `Running migration ${migration.version}: ${migration.name}`,
          );
          await migration.up(db);
          await db.collection("migrations").insertOne({
            version: migration.version,
            name: migration.name,
            applied_at: new Date(),
          });
          console.log(`✓ Migration ${migration.version} completed`);
        }
      }
    },

    async getCurrentVersion(): Promise<number> {
      try {
        const result = await db
          .collection("migrations")
          .find()
          .sort({ version: -1 })
          .limit(1)
          .toArray();

        return result.length > 0 ? result[0].version : 0;
      } catch {
        return 0;
      }
    },

    async rollback(steps = 1): Promise<void> {
      const migrations_records = await db
        .collection("migrations")
        .find()
        .sort({ version: -1 })
        .limit(steps)
        .toArray();

      for (const record of migrations_records) {
        const migration = migrations.find((m) => m.version === record.version);
        if (migration) {
          console.log(
            `Rolling back migration ${migration.version}: ${migration.name}`,
          );
          await migration.down(db);
          await db
            .collection("migrations")
            .deleteOne({ version: migration.version });
          console.log(`✓ Migration ${migration.version} rolled back`);
        }
      }
    },
  };

  return runner;
}

/**
 * No-op migration runner for databases that don't need migrations
 */
function createNoOpMigrationRunner(): MigrationRunner {
  return {
    async runMigrations() {
      console.log("No migrations needed for this database type");
    },
    async getCurrentVersion() {
      return 0;
    },
    async rollback() {
      console.log("No migrations to rollback");
    },
  };
}

/**
 * Export database-specific migration helpers
 */
export * from "./migrations";
