/**
 * Real-time Analytics SDK
 * Main export file
 */

// Core SDK
export { AnalyticsSDK } from "./core/AnalyticsSDK";
export { SessionManager } from "./core/SessionManager";
export { BatchProcessor } from "./core/BatchProcessor";
export { RealtimeEventEmitter } from "./core/EventEmitter";

// Database Adapters
export {
  createAdapter,
  BaseAdapter,
  MongoDBAdapter,
  MySQLAdapter,
  PostgreSQLAdapter,
  SQLiteAdapter,
  PlaintextAdapter,
} from "./adapters";

// Configuration
export {
  loadEnv,
  loadServerConfig,
  loadDatabaseConfigFromEnv,
  validateServerConfig,
  validateDatabaseConfig,
  parseDatabaseURL,
  createConnectionString,
  printConfigSummary,
  getEnvironment,
  isProduction,
  isDevelopment,
  isDebugEnabled,
} from "./config";

// Migrations
export { createMigrationRunner } from "./migrations";
export type { Migration, MigrationRunner } from "./migrations";

// Types
export * from "./types";

// Re-export for convenience
export { AnalyticsSDK as default } from "./core/AnalyticsSDK";
