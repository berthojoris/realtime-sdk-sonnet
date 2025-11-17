/**
 * PostgreSQL Database Adapter
 * Adapter for storing analytics data in PostgreSQL
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

export class PostgreSQLAdapter extends BaseAdapter {
  private pool: any = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      const { Pool } = await import('pg');

      this.pool = new Pool({
        host: this.config.connection?.host || 'localhost',
        port: this.config.connection?.port || 5432,
        user: this.config.connection?.username,
        password: this.config.connection?.password,
        database: this.config.connection?.database || 'analytics',
        min: this.config.pool?.min || 2,
        max: this.config.pool?.max || 10,
        ...this.config.options
      });

      // Create tables if they don't exist
      await this.createTables();

      this.connected = true;
    } catch (error) {
      this.handleError(error, 'PostgreSQL connection');
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.pool) {
        await this.pool.end();
        this.connected = false;
        this.pool = null;
      }
    } catch (error) {
      this.handleError(error, 'PostgreSQL disconnection');
    }
  }

  async saveEvent(event: AnalyticsEvent): Promise<void> {
    this.validateEvent(event);
    try {
      const query = `
        INSERT INTO events (id, type, timestamp, session_id, user_id, anonymous_id, properties, context, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;

      await this.pool.query(query, [
        event.id,
        event.type,
        event.timestamp,
        event.sessionId,
        event.userId || null,
        event.anonymousId || null,
        JSON.stringify(event.properties),
        JSON.stringify(event.context),
        event.metadata ? JSON.stringify(event.metadata) : null
      ]);
    } catch (error) {
      this.handleError(error, 'Save event');
    }
  }

  async saveEvents(events: AnalyticsEvent[]): Promise<void> {
    if (events.length === 0) return;

    events.forEach(event => this.validateEvent(event));

    try {
      const client = await this.pool.connect();
      
      try {
        await client.query('BEGIN');

        const query = `
          INSERT INTO events (id, type, timestamp, session_id, user_id, anonymous_id, properties, context, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;

        for (const event of events) {
          await client.query(query, [
            event.id,
            event.type,
            event.timestamp,
            event.sessionId,
            event.userId || null,
            event.anonymousId || null,
            JSON.stringify(event.properties),
            JSON.stringify(event.context),
            event.metadata ? JSON.stringify(event.metadata) : null
          ]);
        }

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      this.handleError(error, 'Save events batch');
    }
  }

  async getEvents(filter: EventFilter): Promise<AnalyticsEvent[]> {
    try {
      const { query, params } = this.buildSelectQuery(filter);
      const result = await this.pool.query(query, params);

      return result.rows.map(this.mapRowToEvent);
    } catch (error) {
      this.handleError(error, 'Get events');
    }
  }

  async saveSession(session: Session): Promise<void> {
    this.validateSession(session);
    try {
      const query = `
        INSERT INTO sessions (id, user_id, anonymous_id, start_time, last_activity_time, end_time, event_count, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          last_activity_time = EXCLUDED.last_activity_time,
          end_time = EXCLUDED.end_time,
          event_count = EXCLUDED.event_count,
          metadata = EXCLUDED.metadata
      `;

      await this.pool.query(query, [
        session.id,
        session.userId || null,
        session.anonymousId,
        session.startTime,
        session.lastActivityTime,
        session.endTime || null,
        session.eventCount,
        session.metadata ? JSON.stringify(session.metadata) : null
      ]);
    } catch (error) {
      this.handleError(error, 'Save session');
    }
  }

  async getSession(sessionId: string): Promise<Session | null> {
    try {
      const query = 'SELECT * FROM sessions WHERE id = $1';
      const result = await this.pool.query(query, [sessionId]);

      if (result.rows.length === 0) return null;

      return this.mapRowToSession(result.rows[0]);
    } catch (error) {
      this.handleError(error, 'Get session');
    }
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<void> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        const columnName = this.camelToSnake(key);
        fields.push(`${columnName} = $${paramCount}`);
        paramCount++;
        
        if (typeof value === 'object' && value !== null) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      });

      if (fields.length === 0) return;

      values.push(sessionId);
      const query = `UPDATE sessions SET ${fields.join(', ')} WHERE id = $${paramCount}`;

      await this.pool.query(query, values);
    } catch (error) {
      this.handleError(error, 'Update session');
    }
  }

  async saveUser(user: User): Promise<void> {
    this.validateUser(user);
    try {
      const query = `
        INSERT INTO users (id, anonymous_id, traits, consent, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (anonymous_id) DO UPDATE SET
          traits = EXCLUDED.traits,
          consent = EXCLUDED.consent,
          updated_at = EXCLUDED.updated_at
      `;

      await this.pool.query(query, [
        user.id || null,
        user.anonymousId,
        user.traits ? JSON.stringify(user.traits) : null,
        user.consent ? JSON.stringify(user.consent) : null,
        user.createdAt,
        user.updatedAt
      ]);
    } catch (error) {
      this.handleError(error, 'Save user');
    }
  }

  async getUser(userId: string): Promise<User | null> {
    try {
      const query = 'SELECT * FROM users WHERE id = $1 OR anonymous_id = $1 LIMIT 1';
      const result = await this.pool.query(query, [userId]);

      if (result.rows.length === 0) return null;

      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      this.handleError(error, 'Get user');
    }
  }

  async deleteOldEvents(olderThanTimestamp: number): Promise<number> {
    try {
      const query = 'DELETE FROM events WHERE timestamp < $1';
      const result = await this.pool.query(query, [olderThanTimestamp]);

      return result.rowCount || 0;
    } catch (error) {
      this.handleError(error, 'Delete old events');
    }
  }

  async getEventStats(filter: EventFilter): Promise<EventStats> {
    try {
      const { whereClause, params } = this.buildWhereClause(filter);

      const totalResult = await this.pool.query(
        `SELECT COUNT(*) as total FROM events ${whereClause}`,
        params
      );

      const typeResult = await this.pool.query(
        `SELECT type, COUNT(*) as count FROM events ${whereClause} GROUP BY type`,
        params
      );

      const userResult = await this.pool.query(
        `SELECT COUNT(DISTINCT user_id) as count FROM events ${whereClause} WHERE user_id IS NOT NULL`,
        params
      );

      const sessionResult = await this.pool.query(
        `SELECT COUNT(DISTINCT session_id) as count FROM events ${whereClause}`,
        params
      );

      const timeResult = await this.pool.query(
        `SELECT MIN(timestamp) as start, MAX(timestamp) as end FROM events ${whereClause}`,
        params
      );

      const eventsByType: Record<string, number> = {};
      typeResult.rows.forEach(row => {
        eventsByType[row.type] = parseInt(row.count);
      });

      return {
        totalEvents: parseInt(totalResult.rows[0].total),
        eventsByType,
        uniqueUsers: parseInt(userResult.rows[0].count),
        uniqueSessions: parseInt(sessionResult.rows[0].count),
        timeRange: {
          start: parseInt(timeResult.rows[0].start) || 0,
          end: parseInt(timeResult.rows[0].end) || 0
        }
      };
    } catch (error) {
      this.handleError(error, 'Get event stats');
    }
  }

  private async createTables(): Promise<void> {
    const createEventsTable = `
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
      );
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
      CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
      CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
      CREATE INDEX IF NOT EXISTS idx_events_timestamp_type ON events(timestamp, type);
    `;

    const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36),
        anonymous_id VARCHAR(36) NOT NULL,
        start_time BIGINT NOT NULL,
        last_activity_time BIGINT NOT NULL,
        end_time BIGINT,
        event_count INTEGER DEFAULT 0,
        metadata JSONB
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_anonymous_id ON sessions(anonymous_id);
    `;

    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36),
        anonymous_id VARCHAR(36) PRIMARY KEY,
        traits JSONB,
        consent JSONB,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
    `;

    await this.pool.query(createEventsTable);
    await this.pool.query(createSessionsTable);
    await this.pool.query(createUsersTable);
  }

  private buildSelectQuery(filter: EventFilter): { query: string; params: any[] } {
    const { whereClause, params } = this.buildWhereClause(filter);
    
    let query = `SELECT * FROM events ${whereClause} ORDER BY timestamp DESC`;

    if (filter.limit) {
      params.push(filter.limit);
      query += ` LIMIT $${params.length}`;
      
      if (filter.offset) {
        params.push(filter.offset);
        query += ` OFFSET $${params.length}`;
      }
    }

    return { query, params };
  }

  private buildWhereClause(filter: EventFilter): { whereClause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter.startTime) {
      params.push(filter.startTime);
      conditions.push(`timestamp >= $${params.length}`);
    }

    if (filter.endTime) {
      params.push(filter.endTime);
      conditions.push(`timestamp <= $${params.length}`);
    }

    if (filter.eventType) {
      params.push(filter.eventType);
      conditions.push(`type = $${params.length}`);
    }

    if (filter.userId) {
      params.push(filter.userId);
      conditions.push(`user_id = $${params.length}`);
    }

    if (filter.sessionId) {
      params.push(filter.sessionId);
      conditions.push(`session_id = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return { whereClause, params };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  private snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  private mapRowToEvent(row: any): AnalyticsEvent {
    return {
      id: row.id,
      type: row.type,
      timestamp: parseInt(row.timestamp),
      sessionId: row.session_id,
      userId: row.user_id,
      anonymousId: row.anonymous_id,
      properties: row.properties || {},
      context: row.context || {},
      metadata: row.metadata || undefined
    };
  }

  private mapRowToSession(row: any): Session {
    return {
      id: row.id,
      userId: row.user_id,
      anonymousId: row.anonymous_id,
      startTime: parseInt(row.start_time),
      lastActivityTime: parseInt(row.last_activity_time),
      endTime: row.end_time ? parseInt(row.end_time) : undefined,
      eventCount: parseInt(row.event_count),
      metadata: row.metadata || undefined
    };
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      anonymousId: row.anonymous_id,
      traits: row.traits || undefined,
      consent: row.consent || undefined,
      createdAt: parseInt(row.created_at),
      updatedAt: parseInt(row.updated_at)
    };
  }
}