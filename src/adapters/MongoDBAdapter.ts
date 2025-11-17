/**
 * MongoDB Database Adapter
 * Adapter for storing analytics data in MongoDB
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

export class MongoDBAdapter extends BaseAdapter {
  private db: any = null;
  private client: any = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      const mongodb = await import('mongodb');
      const MongoClient = mongodb.MongoClient;

      const uri = this.config.connection?.uri || 
        `mongodb://${this.config.connection?.host || 'localhost'}:${this.config.connection?.port || 27017}`;

      this.client = new MongoClient(uri, this.config.options);
      await this.client.connect();
      
      this.db = this.client.db(this.config.connection?.database || 'analytics');
      
      // Create indexes for better query performance
      await this.createIndexes();
      
      this.connected = true;
    } catch (error) {
      this.handleError(error, 'MongoDB connection');
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        this.connected = false;
        this.db = null;
        this.client = null;
      }
    } catch (error) {
      this.handleError(error, 'MongoDB disconnection');
    }
  }

  async saveEvent(event: AnalyticsEvent): Promise<void> {
    this.validateEvent(event);
    try {
      const collection = this.db.collection('events');
      await collection.insertOne(event);
    } catch (error) {
      this.handleError(error, 'Save event');
    }
  }

  async saveEvents(events: AnalyticsEvent[]): Promise<void> {
    if (events.length === 0) return;

    events.forEach(event => this.validateEvent(event));
    
    try {
      const collection = this.db.collection('events');
      await collection.insertMany(events);
    } catch (error) {
      this.handleError(error, 'Save events batch');
    }
  }

  async getEvents(filter: EventFilter): Promise<AnalyticsEvent[]> {
    try {
      const collection = this.db.collection('events');
      const query = this.buildMongoQuery(filter);
      
      let cursor = collection.find(query);

      if (filter.limit) {
        cursor = cursor.limit(filter.limit);
      }

      if (filter.offset) {
        cursor = cursor.skip(filter.offset);
      }

      cursor = cursor.sort({ timestamp: -1 });

      const events = await cursor.toArray();
      return events.map(this.mapMongoDocument);
    } catch (error) {
      this.handleError(error, 'Get events');
    }
  }

  async saveSession(session: Session): Promise<void> {
    this.validateSession(session);
    try {
      const collection = this.db.collection('sessions');
      await collection.insertOne(session);
    } catch (error) {
      this.handleError(error, 'Save session');
    }
  }

  async getSession(sessionId: string): Promise<Session | null> {
    try {
      const collection = this.db.collection('sessions');
      const session = await collection.findOne({ id: sessionId });
      return session ? this.mapMongoDocument(session) : null;
    } catch (error) {
      this.handleError(error, 'Get session');
    }
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<void> {
    try {
      const collection = this.db.collection('sessions');
      await collection.updateOne(
        { id: sessionId },
        { $set: updates }
      );
    } catch (error) {
      this.handleError(error, 'Update session');
    }
  }

  async saveUser(user: User): Promise<void> {
    this.validateUser(user);
    try {
      const collection = this.db.collection('users');
      await collection.updateOne(
        { anonymousId: user.anonymousId },
        { $set: user },
        { upsert: true }
      );
    } catch (error) {
      this.handleError(error, 'Save user');
    }
  }

  async getUser(userId: string): Promise<User | null> {
    try {
      const collection = this.db.collection('users');
      const user = await collection.findOne({
        $or: [{ id: userId }, { anonymousId: userId }]
      });
      return user ? this.mapMongoDocument(user) : null;
    } catch (error) {
      this.handleError(error, 'Get user');
    }
  }

  async deleteOldEvents(olderThanTimestamp: number): Promise<number> {
    try {
      const collection = this.db.collection('events');
      const result = await collection.deleteMany({
        timestamp: { $lt: olderThanTimestamp }
      });
      return result.deletedCount || 0;
    } catch (error) {
      this.handleError(error, 'Delete old events');
    }
  }

  async getEventStats(filter: EventFilter): Promise<EventStats> {
    try {
      const collection = this.db.collection('events');
      const query = this.buildMongoQuery(filter);

      const [
        totalEvents,
        eventsByType,
        uniqueUsers,
        uniqueSessions,
        timeRange
      ] = await Promise.all([
        collection.countDocuments(query),
        this.getEventsByType(query),
        this.getUniqueCount('userId', query),
        this.getUniqueCount('sessionId', query),
        this.getTimeRange(query)
      ]);

      return {
        totalEvents,
        eventsByType,
        uniqueUsers,
        uniqueSessions,
        timeRange
      };
    } catch (error) {
      this.handleError(error, 'Get event stats');
    }
  }

  private async createIndexes(): Promise<void> {
    const eventsCollection = this.db.collection('events');
    const sessionsCollection = this.db.collection('sessions');
    const usersCollection = this.db.collection('users');

    await Promise.all([
      eventsCollection.createIndex({ timestamp: -1 }),
      eventsCollection.createIndex({ sessionId: 1 }),
      eventsCollection.createIndex({ userId: 1 }),
      eventsCollection.createIndex({ type: 1 }),
      eventsCollection.createIndex({ timestamp: -1, type: 1 }),
      sessionsCollection.createIndex({ id: 1 }, { unique: true }),
      sessionsCollection.createIndex({ userId: 1 }),
      sessionsCollection.createIndex({ anonymousId: 1 }),
      usersCollection.createIndex({ id: 1 }),
      usersCollection.createIndex({ anonymousId: 1 }, { unique: true })
    ]);
  }

  private buildMongoQuery(filter: EventFilter): any {
    const query: any = {};

    if (filter.startTime || filter.endTime) {
      query.timestamp = {};
      if (filter.startTime) query.timestamp.$gte = filter.startTime;
      if (filter.endTime) query.timestamp.$lte = filter.endTime;
    }

    if (filter.eventType) {
      query.type = filter.eventType;
    }

    if (filter.userId) {
      query.userId = filter.userId;
    }

    if (filter.sessionId) {
      query.sessionId = filter.sessionId;
    }

    return query;
  }

  private async getEventsByType(query: any): Promise<Record<string, number>> {
    const collection = this.db.collection('events');
    const result = await collection.aggregate([
      { $match: query },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]).toArray();

    const eventsByType: Record<string, number> = {};
    result.forEach((item: any) => {
      eventsByType[item._id] = item.count;
    });

    return eventsByType;
  }

  private async getUniqueCount(field: string, query: any): Promise<number> {
    const collection = this.db.collection('events');
    const result = await collection.distinct(field, query);
    return result.filter((id: any) => id != null).length;
  }

  private async getTimeRange(query: any): Promise<{ start: number; end: number }> {
    const collection = this.db.collection('events');
    const result = await collection.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          start: { $min: '$timestamp' },
          end: { $max: '$timestamp' }
        }
      }
    ]).toArray();

    if (result.length === 0) {
      return { start: 0, end: 0 };
    }

    return {
      start: result[0].start || 0,
      end: result[0].end || 0
    };
  }

  private mapMongoDocument(doc: any): any {
    const { _id, ...rest } = doc;
    return rest;
  }
}