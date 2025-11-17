/**
 * Database Adapters Export
 * Factory for creating database adapters based on configuration
 */

import { DatabaseAdapter, DatabaseConfig, DatabaseError } from '../types';
import { MongoDBAdapter } from './MongoDBAdapter';
import { MySQLAdapter } from './MySQLAdapter';
import { PostgreSQLAdapter } from './PostgreSQLAdapter';
import { SQLiteAdapter } from './SQLiteAdapter';
import { PlaintextAdapter } from './PlaintextAdapter';

export { BaseAdapter } from './BaseAdapter';
export { MongoDBAdapter } from './MongoDBAdapter';
export { MySQLAdapter } from './MySQLAdapter';
export { PostgreSQLAdapter } from './PostgreSQLAdapter';
export { SQLiteAdapter } from './SQLiteAdapter';
export { PlaintextAdapter } from './PlaintextAdapter';

/**
 * Create a database adapter based on the configuration
 */
export function createAdapter(config: DatabaseConfig): DatabaseAdapter {
  switch (config.type) {
    case 'mongodb':
      return new MongoDBAdapter(config);
    
    case 'mysql':
      return new MySQLAdapter(config);
    
    case 'postgresql':
      return new PostgreSQLAdapter(config);
    
    case 'sqlite':
      return new SQLiteAdapter(config);
    
    case 'plaintext':
      return new PlaintextAdapter(config);
    
    default:
      throw new DatabaseError(`Unsupported database type: ${(config as any).type}`);
  }
}