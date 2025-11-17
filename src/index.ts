/**
 * Real-time Analytics SDK
 * Main export file
 */

// Core SDK
export { AnalyticsSDK } from './core/AnalyticsSDK';
export { SessionManager } from './core/SessionManager';
export { BatchProcessor } from './core/BatchProcessor';
export { RealtimeEventEmitter } from './core/EventEmitter';

// Database Adapters
export {
  createAdapter,
  BaseAdapter,
  MongoDBAdapter,
  MySQLAdapter,
  PostgreSQLAdapter,
  SQLiteAdapter,
  PlaintextAdapter
} from './adapters';

// Types
export * from './types';

// Re-export for convenience
export { AnalyticsSDK as default } from './core/AnalyticsSDK';