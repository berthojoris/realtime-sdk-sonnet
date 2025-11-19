/**
 * MySQL Database Adapter
 * Adapter for storing analytics data in MySQL
 */

import { BaseAdapter } from "./BaseAdapter";
import {
  AnalyticsEvent,
  Session,
  User,
  EventFilter,
  EventStats,
  DatabaseConfig,
  DatabaseError,
} from "../types";

export class MySQLAdapter extends BaseAdapter {
  private pool: any = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      const mysql = await import("mysql2/promise");

      this.pool = mysql.createPool({
        host: this.config.connection?.host || "localhost",
        port: this.config.connection?.port || 3306,
        user: this.config.connection?.username,
        password: this.config.connection?.password,
        database: this.config.connection?.database || "analytics",
        waitForConnections: true,
        connectionLimit: this.config.pool?.max || 10,
        queueLimit: 0,
        ...this.config.options,
      });

      // Create tables if they don't exist
      await this.createTables();

      // Set up connection pool monitoring
      this.setupPoolMonitoring();

      this.connected = true;
    } catch (error) {
      this.handleError(error, "MySQL connection");
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.pool) {
        // Gracefully close all connections
        await this.pool.end();
        this.connected = false;
        this.pool = null;
      }
    } catch (error) {
      this.handleError(error, "MySQL disconnection");
    }
  }

  /**
   * Set up connection pool monitoring
   */
  private setupPoolMonitoring(): void {
    if (!this.pool) return;

    // Monitor pool events for better resource management
    this.pool.on('connection', (connection: any) => {
      console.debug('New MySQL connection established');
    });

    this.pool.on('enqueue', () => {
      console.warn('MySQL connection queue is full, requests are being queued');
    });

    this.pool.on('release', (connection: any) => {
      console.debug('MySQL connection released back to pool');
    });
  }

  async saveEvent(event: AnalyticsEvent): Promise<void> {
    this.validateEvent(event);
    try {
      const query = `
        INSERT INTO events (id, type, timestamp, sessionId, userId, anonymousId, properties, context, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.pool.execute(query, [
        event.id,
        event.type,
        event.timestamp,
        event.sessionId,
        event.userId || null,
        event.anonymousId || null,
        JSON.stringify(event.properties),
        JSON.stringify(event.context),
        event.metadata ? JSON.stringify(event.metadata) : null,
      ]);
    } catch (error) {
      this.handleError(error, "Save event");
    }
  }

  async saveEvents(events: AnalyticsEvent[]): Promise<void> {
    if (events.length === 0) return;

    events.forEach((event) => this.validateEvent(event));

    try {
      const query = `
        INSERT INTO events (id, type, timestamp, sessionId, userId, anonymousId, properties, context, metadata)
        VALUES ?
      `;

      const values = events.map((event) => [
        event.id,
        event.type,
        event.timestamp,
        event.sessionId,
        event.userId || null,
        event.anonymousId || null,
        JSON.stringify(event.properties),
        JSON.stringify(event.context),
        event.metadata ? JSON.stringify(event.metadata) : null,
      ]);

      await this.pool.query(query, [values]);
    } catch (error) {
      this.handleError(error, "Save events batch");
    }
  }

  async getEvents(filter: EventFilter): Promise<AnalyticsEvent[]> {
    try {
      const { query, params } = this.buildSelectQuery(filter);
      const [rows] = await this.pool.execute(query, params);

      return (rows as any[]).map(this.mapRowToEvent);
    } catch (error) {
      this.handleError(error, "Get events");
    }
  }

  async saveSession(session: Session): Promise<void> {
    this.validateSession(session);
    try {
      const query = `
        INSERT INTO sessions (id, userId, anonymousId, startTime, lastActivityTime, endTime, eventCount, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          lastActivityTime = VALUES(lastActivityTime),
          endTime = VALUES(endTime),
          eventCount = VALUES(eventCount),
          metadata = VALUES(metadata)
      `;

      await this.pool.execute(query, [
        session.id,
        session.userId || null,
        session.anonymousId,
        session.startTime,
        session.lastActivityTime,
        session.endTime || null,
        session.eventCount,
        session.metadata ? JSON.stringify(session.metadata) : null,
      ]);
    } catch (error) {
      this.handleError(error, "Save session");
    }
  }

  async getSession(sessionId: string): Promise<Session | null> {
    try {
      const query = "SELECT * FROM sessions WHERE id = ?";
      const [rows] = await this.pool.execute(query, [sessionId]);

      if ((rows as any[]).length === 0) return null;

      return this.mapRowToSession((rows as any[])[0]);
    } catch (error) {
      this.handleError(error, "Get session");
    }
  }

  async updateSession(
    sessionId: string,
    updates: Partial<Session>,
  ): Promise<void> {
    try {
      const fields: string[] = [];
      const values: any[] = [];

      Object.entries(updates).forEach(([key, value]) => {
        fields.push(`${key} = ?`);
        if (typeof value === "object" && value !== null) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      });

      if (fields.length === 0) return;

      values.push(sessionId);
      const query = `UPDATE sessions SET ${fields.join(", ")} WHERE id = ?`;

      await this.pool.execute(query, values);
    } catch (error) {
      this.handleError(error, "Update session");
    }
  }

  async saveUser(user: User): Promise<void> {
    this.validateUser(user);
    try {
      const query = `
        INSERT INTO users (id, anonymousId, traits, consent, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          traits = VALUES(traits),
          consent = VALUES(consent),
          updatedAt = VALUES(updatedAt)
      `;

      await this.pool.execute(query, [
        user.id || null,
        user.anonymousId,
        user.traits ? JSON.stringify(user.traits) : null,
        user.consent ? JSON.stringify(user.consent) : null,
        user.createdAt,
        user.updatedAt,
      ]);
    } catch (error) {
      this.handleError(error, "Save user");
    }
  }

  async getUser(userId: string): Promise<User | null> {
    try {
      const query =
        "SELECT * FROM users WHERE id = ? OR anonymousId = ? LIMIT 1";
      const [rows] = await this.pool.execute(query, [userId, userId]);

      if ((rows as any[]).length === 0) return null;

      return this.mapRowToUser((rows as any[])[0]);
    } catch (error) {
      this.handleError(error, "Get user");
    }
  }

  async deleteOldEvents(olderThanTimestamp: number): Promise<number> {
    try {
      const query = "DELETE FROM events WHERE timestamp < ?";
      const [result] = await this.pool.execute(query, [olderThanTimestamp]);

      return (result as any).affectedRows || 0;
    } catch (error) {
      this.handleError(error, "Delete old events");
    }
  }

  async getEventStats(filter: EventFilter): Promise<EventStats> {
    try {
      const { whereClause, params } = this.buildWhereClause(filter);

      const [totalResult] = await this.pool.execute(
        `SELECT COUNT(*) as total FROM events ${whereClause}`,
        params,
      );

      const [typeResult] = await this.pool.execute(
        `SELECT type, COUNT(*) as count FROM events ${whereClause} GROUP BY type`,
        params,
      );

      const [userResult] = await this.pool.execute(
        `SELECT COUNT(DISTINCT userId) as count FROM events ${whereClause} WHERE userId IS NOT NULL`,
        params,
      );

      const [sessionResult] = await this.pool.execute(
        `SELECT COUNT(DISTINCT sessionId) as count FROM events ${whereClause}`,
        params,
      );

      const [timeResult] = await this.pool.execute(
        `SELECT MIN(timestamp) as start, MAX(timestamp) as end FROM events ${whereClause}`,
        params,
      );

      const eventsByType: Record<string, number> = {};
      (typeResult as any[]).forEach((row) => {
        eventsByType[row.type] = row.count;
      });

      return {
        totalEvents: (totalResult as any[])[0].total,
        eventsByType,
        uniqueUsers: (userResult as any[])[0].count,
        uniqueSessions: (sessionResult as any[])[0].count,
        timeRange: {
          start: (timeResult as any[])[0].start || 0,
          end: (timeResult as any[])[0].end || 0,
        },
      };
    } catch (error) {
      this.handleError(error, "Get event stats");
    }
  }

  private async createTables(): Promise<void> {
    const createEventsTable = `
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
        INDEX idx_timestamp_type (timestamp, type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    const createSessionsTable = `
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
        INDEX idx_anonymousId (anonymousId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36),
        anonymousId VARCHAR(36) PRIMARY KEY,
        traits JSON,
        consent JSON,
        createdAt BIGINT NOT NULL,
        updatedAt BIGINT NOT NULL,
        INDEX idx_id (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await this.pool.execute(createEventsTable);
    await this.pool.execute(createSessionsTable);
    await this.pool.execute(createUsersTable);
  }

  private buildSelectQuery(filter: EventFilter): {
    query: string;
    params: any[];
  } {
    const { whereClause, params } = this.buildWhereClause(filter);

    let query = `SELECT * FROM events ${whereClause} ORDER BY timestamp DESC`;

    // Add LIMIT and OFFSET with validation to prevent SQL injection
    if (
      filter.limit &&
      typeof filter.limit === "number" &&
      filter.limit > 0 &&
      filter.limit <= 10000
    ) {
      query += ` LIMIT ?`;
      params.push(filter.limit);

      if (
        filter.offset &&
        typeof filter.offset === "number" &&
        filter.offset >= 0
      ) {
        query += ` OFFSET ?`;
        params.push(filter.offset);
      }
    } else if (filter.limit) {
      // Add default limit of 100 if limit is provided but invalid
      query += " LIMIT ?";
      params.push(100);
    }

    return { query, params };
  }

  private buildWhereClause(filter: EventFilter): {
    whereClause: string;
    params: any[];
  } {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter.startTime) {
      conditions.push("timestamp >= ?");
      params.push(filter.startTime);
    }

    if (filter.endTime) {
      conditions.push("timestamp <= ?");
      params.push(filter.endTime);
    }

    if (filter.eventType) {
      conditions.push("type = ?");
      params.push(filter.eventType);
    }

    if (filter.userId) {
      conditions.push("userId = ?");
      params.push(filter.userId);
    }

    if (filter.sessionId) {
      conditions.push("sessionId = ?");
      params.push(filter.sessionId);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

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
      properties: JSON.parse(row.properties || "{}"),
      context: JSON.parse(row.context || "{}"),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
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
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      anonymousId: row.anonymousId,
      traits: row.traits ? JSON.parse(row.traits) : undefined,
      consent: row.consent ? JSON.parse(row.consent) : undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
