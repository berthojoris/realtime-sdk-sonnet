/**
 * Base Database Adapter
 * Abstract class that all database adapters must extend
 */

import {
  DatabaseAdapter,
  AnalyticsEvent,
  Session,
  User,
  EventFilter,
  EventStats,
  DatabaseError
} from '../types';

export abstract class BaseAdapter implements DatabaseAdapter {
  protected connected: boolean = false;

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract saveEvent(event: AnalyticsEvent): Promise<void>;
  abstract saveEvents(events: AnalyticsEvent[]): Promise<void>;
  abstract getEvents(filter: EventFilter): Promise<AnalyticsEvent[]>;
  abstract saveSession(session: Session): Promise<void>;
  abstract getSession(sessionId: string): Promise<Session | null>;
  abstract updateSession(sessionId: string, updates: Partial<Session>): Promise<void>;
  abstract saveUser(user: User): Promise<void>;
  abstract getUser(userId: string): Promise<User | null>;
  abstract deleteOldEvents(olderThanTimestamp: number): Promise<number>;
  abstract getEventStats(filter: EventFilter): Promise<EventStats>;

  /**
   * Check if adapter is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Validate event data
   */
  protected validateEvent(event: AnalyticsEvent): void {
    if (!event.id) {
      throw new DatabaseError('Event ID is required');
    }
    if (!event.type) {
      throw new DatabaseError('Event type is required');
    }
    if (!event.timestamp) {
      throw new DatabaseError('Event timestamp is required');
    }
    if (!event.sessionId) {
      throw new DatabaseError('Session ID is required');
    }
  }

  /**
   * Validate session data
   */
  protected validateSession(session: Session): void {
    if (!session.id) {
      throw new DatabaseError('Session ID is required');
    }
    if (!session.anonymousId) {
      throw new DatabaseError('Anonymous ID is required');
    }
    if (!session.startTime) {
      throw new DatabaseError('Session start time is required');
    }
  }

  /**
   * Validate user data
   */
  protected validateUser(user: User): void {
    if (!user.anonymousId) {
      throw new DatabaseError('Anonymous ID is required');
    }
  }

  /**
   * Build event filter query
   */
  protected buildFilterConditions(filter: EventFilter): any {
    const conditions: any = {};

    if (filter.startTime) {
      conditions.timestamp = conditions.timestamp || {};
      conditions.timestamp.$gte = filter.startTime;
    }

    if (filter.endTime) {
      conditions.timestamp = conditions.timestamp || {};
      conditions.timestamp.$lte = filter.endTime;
    }

    if (filter.eventType) {
      conditions.type = filter.eventType;
    }

    if (filter.userId) {
      conditions.userId = filter.userId;
    }

    if (filter.sessionId) {
      conditions.sessionId = filter.sessionId;
    }

    return conditions;
  }

  /**
   * Handle database errors
   */
  protected handleError(error: any, operation: string): never {
    const message = error.message || 'Unknown database error';
    throw new DatabaseError(`${operation} failed: ${message}`, error.code);
  }
}