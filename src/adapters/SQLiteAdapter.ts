/**
 * SQLite Database Adapter
 * Adapter for storing analytics data in SQLite
 */

import { BaseAdapter } from './BaseAdapter';
import {
  AnalyticsEvent,
  Session,
  User,
  EventFilter,
  EventStats,
  DatabaseConfig,
  DatabaseError
} from '../types';

export class SQLiteAdapter extends BaseAdapter {
  private db: any = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      const Database = (await import('better-sqlite3')).default;

      const filename = this.config.connection?.filename || './analytics.db';
      this.db = new Database(filename, this.config.options);

      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');

      // Create tables if they don't exist
      this.createTables();

      this.connected = true;
    } catch (error) {
      this.handleError(error, 'SQLite connection');
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.db) {
        this.db.close();
        this.connected = false;
        this.db = null;
      }
    } catch (error) {
      this.handleError(error, 'SQLite disconnection');
    }
  }

  async saveEvent(event: AnalyticsEvent): Promise<void> {
    this.validateEvent(event);
    try {
      const stmt = this.db.prepare(`
        INSERT INTO events (id, type, timestamp, sessionId, userId, anonymousId, properties, context, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        event.id,
        event.type,
        event.timestamp,
        event.sessionId,
        event.userId || null,
        event.anonymousId || null,
        JSON.stringify(event.properties),
        JSON.stringify(event.context),
        event.metadata ? JSON.stringify(event.metadata) : null
      );
    } catch (error) {
      this.handleError(error, 'Save event');
    }
  }

  async saveEvents(events: AnalyticsEvent[]): Promise<void> {
    if (events.length === 0) return;

    events.forEach(event => this.validateEvent(event));

    try {
      const stmt = this.db.prepare(`
        INSERT INTO events (id, type, timestamp, sessionId, userId, anonymousId, properties, context, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertMany = this.db.transaction((events: AnalyticsEvent[]) => {
        for (const event of events) {
          stmt.run(
            event.id,
            event.type,
            event.timestamp,
            event.sessionId,
            event.userId || null,
            event.anonymousId || null,
            JSON.stringify(event.properties),
            JSON.stringify(event.context),
            event.metadata ? JSON.stringify(event.metadata) : null
          );
        }
      });

      insertMany(events);
    } catch (error) {
      this.handleError(error, 'Save events batch');
    }
  }

  async getEvents(filter: EventFilter): Promise<AnalyticsEvent[]> {
    try {
      const { query, params } = this.buildSelectQuery(filter);
      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params);

      return rows.map(this.mapRowToEvent);
    } catch (error) {
      this.handleError(error, 'Get events');
    }
  }

  async saveSession(session: Session): Promise<void> {
    this.validateSession(session);
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO sessions (id, userId, anonymousId, startTime, lastActivityTime, endTime, eventCount, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        session.id,
        session.userId || null,
        session.anonymousId,
        session.startTime,
        session.lastActivityTime,
        session.endTime || null,
        session.eventCount,
        session.metadata ? JSON.stringify(session.metadata) : null
      );
    } catch (error) {
      this.handleError(error, 'Save session');
    }
  }

  async getSession(sessionId: string): Promise<Session | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM sessions WHERE id = ?');
      const row = stmt.get(sessionId);

      return row ? this.mapRowToSession(row) : null;
    } catch (error) {
      this.handleError(error, 'Get session');
    }
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<void> {
    try {
      const fields: string[] = [];
      const values: any[] = [];

      Object.entries(updates).forEach(([key, value]) => {
        fields.push(`${key} = ?`);
        if (typeof value === 'object' && value !== null) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      });

      if (fields.length === 0) return;

      values.push(sessionId);
      const query = `UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`;

      const stmt = this.db.prepare(query);
      stmt.run(...values);
    } catch (error) {
      this.handleError(error, 'Update session');
    }
  }

  async saveUser(user: User): Promise<void> {
    this.validateUser(user);
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO users (id, anonymousId, traits, consent, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        user.id || null,
        user.anonymousId,
        user.traits ? JSON.stringify(user.traits) : null,
        user.consent ? JSON.stringify(user.consent) : null,
        user.createdAt,
        user.updatedAt
      );
    } catch (error) {
      this.handleError(error, 'Save user');
    }
  }

  async getUser(userId: string): Promise<User | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE id = ? OR anonymousId = ? LIMIT 1');
      const row = stmt.get(userId, userId);

      return row ? this.mapRowToUser(row) : null;
    } catch (error) {
      this.handleError(error, 'Get user');
    }
  }

  async deleteOldEvents(olderThanTimestamp: number): Promise<number> {
    try {
      const stmt = this.db.prepare('DELETE FROM events WHERE timestamp < ?');
      const result = stmt.run(olderThanTimestamp);

      return result.changes || 0;
    } catch (error) {
      this.handleError(error, 'Delete old events');
    }
  }

  async getEventStats(filter: EventFilter): Promise<EventStats> {
    try {
      const { whereClause, params } = this.buildWhereClause(filter);

      const totalStmt = this.db.prepare(`SELECT COUNT(*) as total FROM events ${whereClause}`);
      const totalResult = totalStmt.get(...params);

      const typeStmt = this.db.prepare(`SELECT type, COUNT(*) as count FROM events ${whereClause} GROUP BY type`);
      const typeResult = typeStmt.all(...params);

      const userStmt = this.db.prepare(`SELECT COUNT(DISTINCT userId) as count FROM events ${whereClause} WHERE userId IS NOT NULL`);
      const userResult = userStmt.get(...params);

      const sessionStmt = this.db.prepare(`SELECT COUNT(DISTINCT sessionId) as count FROM events ${whereClause}`);
      const sessionResult = sessionStmt.get(...params);

      const timeStmt = this.db.prepare(`SELECT MIN(timestamp) as start, MAX(timestamp) as end FROM events ${whereClause}`);
      const timeResult = timeStmt.get(...params);

      const eventsByType: Record<string, number> = {};
      typeResult.forEach((row: any) => {
        eventsByType[row.type] = row.count;
      });

      return {
        totalEvents: totalResult.total,
        eventsByType,
        uniqueUsers: userResult.count,
        uniqueSessions: sessionResult.count,
        timeRange: {
          start: timeResult.start || 0,
          end: timeResult.end || 0
        }
      };
    } catch (error) {
      this.handleError(error, 'Get event stats');
    }
  }

  private createTables(): void {
    this.db.exec(`
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

      CREATE TABLE IF NOT EXISTS users (
        id TEXT,
        anonymousId TEXT PRIMARY KEY,
        traits TEXT,
        consent TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
    `);
  }

  private buildSelectQuery(filter: EventFilter): { query: string; params: any[] } {
    const { whereClause, params } = this.buildWhereClause(filter);
    
    let query = `SELECT * FROM events ${whereClause} ORDER BY timestamp DESC`;

    if (filter.limit) {
      query += ` LIMIT ${filter.limit}`;
      if (filter.offset) {
        query += ` OFFSET ${filter.offset}`;
      }
    }

    return { query, params };
  }

  private buildWhereClause(filter: EventFilter): { whereClause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter.startTime) {
      conditions.push('timestamp >= ?');
      params.push(filter.startTime);
    }

    if (filter.endTime) {
      conditions.push('timestamp <= ?');
      params.push(filter.endTime);
    }

    if (filter.eventType) {
      conditions.push('type = ?');
      params.push(filter.eventType);
    }

    if (filter.userId) {
      conditions.push('userId = ?');
      params.push(filter.userId);
    }

    if (filter.sessionId) {
      conditions.push('sessionId = ?');
      params.push(filter.sessionId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return { whereClause, params };
  }

  private mapRowToEvent(row: any): AnalyticsEvent {
    return {
      id: row.id,
      type: row.type,
      timestamp: row.timestamp,
      sessionId: row.sessionId,
      userId: row.userId,
      anonymousId: row.anonymousId,
      properties: JSON.parse(row.properties || '{}'),
      context: JSON.parse(row.context || '{}'),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    };
  }

  private mapRowToSession(row: any): Session {
    return {
      id: row.id,
      userId: row.userId,
      anonymousId: row.anonymousId,
      startTime: row.startTime,
      lastActivityTime: row.lastActivityTime,
      endTime: row.endTime,
      eventCount: row.eventCount,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    };
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      anonymousId: row.anonymousId,
      traits: row.traits ? JSON.parse(row.traits) : undefined,
      consent: row.consent ? JSON.parse(row.consent) : undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }
}