/**
 * Plaintext File Database Adapter
 * Adapter for storing analytics data in plaintext files (JSON/CSV)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
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

export class PlaintextAdapter extends BaseAdapter {
  private directory: string;
  private format: 'json' | 'jsonl' | 'csv';
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    super();
    this.config = config;
    this.directory = config.connection?.directory || './analytics-data';
    this.format = (config.options?.format as 'json' | 'jsonl' | 'csv') || 'jsonl';
  }

  async connect(): Promise<void> {
    try {
      // Create directory structure
      await fs.mkdir(this.directory, { recursive: true });
      await fs.mkdir(path.join(this.directory, 'events'), { recursive: true });
      await fs.mkdir(path.join(this.directory, 'sessions'), { recursive: true });
      await fs.mkdir(path.join(this.directory, 'users'), { recursive: true });

      this.connected = true;
    } catch (error) {
      this.handleError(error, 'Plaintext connection');
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async saveEvent(event: AnalyticsEvent): Promise<void> {
    this.validateEvent(event);
    try {
      const eventsDir = path.join(this.directory, 'events');
      const date = new Date(event.timestamp).toISOString().split('T')[0];
      const filename = `events-${date}.${this.format === 'csv' ? 'csv' : 'jsonl'}`;
      const filepath = path.join(eventsDir, filename);

      let content: string;
      
      if (this.format === 'csv') {
        // Check if file exists to write header
        let needsHeader = false;
        try {
          await fs.access(filepath);
        } catch {
          needsHeader = true;
        }

        const csvLine = this.eventToCSV(event);
        
        if (needsHeader) {
          const header = 'id,type,timestamp,sessionId,userId,anonymousId,properties,context,metadata\n';
          content = header + csvLine + '\n';
        } else {
          content = csvLine + '\n';
        }
      } else {
        // JSONL format (one JSON object per line)
        content = JSON.stringify(event) + '\n';
      }

      await fs.appendFile(filepath, content, 'utf8');
    } catch (error) {
      this.handleError(error, 'Save event');
    }
  }

  async saveEvents(events: AnalyticsEvent[]): Promise<void> {
    if (events.length === 0) return;

    events.forEach(event => this.validateEvent(event));

    try {
      // Group events by date
      const eventsByDate = new Map<string, AnalyticsEvent[]>();
      
      events.forEach(event => {
        const date = new Date(event.timestamp).toISOString().split('T')[0];
        if (!eventsByDate.has(date)) {
          eventsByDate.set(date, []);
        }
        eventsByDate.get(date)!.push(event);
      });

      // Write events for each date
      for (const [date, dateEvents] of eventsByDate) {
        const eventsDir = path.join(this.directory, 'events');
        const filename = `events-${date}.${this.format === 'csv' ? 'csv' : 'jsonl'}`;
        const filepath = path.join(eventsDir, filename);

        let content: string;

        if (this.format === 'csv') {
          let needsHeader = false;
          try {
            await fs.access(filepath);
          } catch {
            needsHeader = true;
          }

          let csvContent = '';
          if (needsHeader) {
            csvContent += 'id,type,timestamp,sessionId,userId,anonymousId,properties,context,metadata\n';
          }
          
          dateEvents.forEach(event => {
            csvContent += this.eventToCSV(event) + '\n';
          });

          content = csvContent;
        } else {
          content = dateEvents.map(e => JSON.stringify(e)).join('\n') + '\n';
        }

        await fs.appendFile(filepath, content, 'utf8');
      }
    } catch (error) {
      this.handleError(error, 'Save events batch');
    }
  }

  async getEvents(filter: EventFilter): Promise<AnalyticsEvent[]> {
    try {
      const eventsDir = path.join(this.directory, 'events');
      const files = await fs.readdir(eventsDir);
      
      let allEvents: AnalyticsEvent[] = [];

      for (const file of files) {
        if (!file.startsWith('events-')) continue;

        const filepath = path.join(eventsDir, file);
        const content = await fs.readFile(filepath, 'utf8');

        let fileEvents: AnalyticsEvent[];

        if (this.format === 'csv') {
          fileEvents = this.parseCSV(content);
        } else {
          fileEvents = content
            .split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line));
        }

        allEvents = allEvents.concat(fileEvents);
      }

      // Apply filters
      let filteredEvents = allEvents;

      if (filter.startTime) {
        filteredEvents = filteredEvents.filter(e => e.timestamp >= filter.startTime!);
      }

      if (filter.endTime) {
        filteredEvents = filteredEvents.filter(e => e.timestamp <= filter.endTime!);
      }

      if (filter.eventType) {
        filteredEvents = filteredEvents.filter(e => e.type === filter.eventType);
      }

      if (filter.userId) {
        filteredEvents = filteredEvents.filter(e => e.userId === filter.userId);
      }

      if (filter.sessionId) {
        filteredEvents = filteredEvents.filter(e => e.sessionId === filter.sessionId);
      }

      // Sort by timestamp descending
      filteredEvents.sort((a, b) => b.timestamp - a.timestamp);

      // Apply limit and offset
      if (filter.offset) {
        filteredEvents = filteredEvents.slice(filter.offset);
      }

      if (filter.limit) {
        filteredEvents = filteredEvents.slice(0, filter.limit);
      }

      return filteredEvents;
    } catch (error) {
      this.handleError(error, 'Get events');
    }
  }

  async saveSession(session: Session): Promise<void> {
    this.validateSession(session);
    try {
      const sessionsDir = path.join(this.directory, 'sessions');
      const filepath = path.join(sessionsDir, `${session.id}.json`);

      await fs.writeFile(filepath, JSON.stringify(session, null, 2), 'utf8');
    } catch (error) {
      this.handleError(error, 'Save session');
    }
  }

  async getSession(sessionId: string): Promise<Session | null> {
    try {
      const sessionsDir = path.join(this.directory, 'sessions');
      const filepath = path.join(sessionsDir, `${sessionId}.json`);

      const content = await fs.readFile(filepath, 'utf8');
      return JSON.parse(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      this.handleError(error, 'Get session');
    }
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      
      if (!session) {
        throw new DatabaseError('Session not found');
      }

      const updatedSession = { ...session, ...updates };
      await this.saveSession(updatedSession);
    } catch (error) {
      this.handleError(error, 'Update session');
    }
  }

  async saveUser(user: User): Promise<void> {
    this.validateUser(user);
    try {
      const usersDir = path.join(this.directory, 'users');
      const filepath = path.join(usersDir, `${user.anonymousId}.json`);

      await fs.writeFile(filepath, JSON.stringify(user, null, 2), 'utf8');
    } catch (error) {
      this.handleError(error, 'Save user');
    }
  }

  async getUser(userId: string): Promise<User | null> {
    try {
      const usersDir = path.join(this.directory, 'users');
      
      // Try to find by anonymousId first
      let filepath = path.join(usersDir, `${userId}.json`);
      
      try {
        const content = await fs.readFile(filepath, 'utf8');
        return JSON.parse(content);
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      // Search all user files for matching ID
      const files = await fs.readdir(usersDir);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        filepath = path.join(usersDir, file);
        const content = await fs.readFile(filepath, 'utf8');
        const user: User = JSON.parse(content);

        if (user.id === userId || user.anonymousId === userId) {
          return user;
        }
      }

      return null;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      this.handleError(error, 'Get user');
    }
  }

  async deleteOldEvents(olderThanTimestamp: number): Promise<number> {
    try {
      const eventsDir = path.join(this.directory, 'events');
      const files = await fs.readdir(eventsDir);
      
      let deletedCount = 0;

      for (const file of files) {
        if (!file.startsWith('events-')) continue;

        const filepath = path.join(eventsDir, file);
        const content = await fs.readFile(filepath, 'utf8');

        let events: AnalyticsEvent[];

        if (this.format === 'csv') {
          events = this.parseCSV(content);
        } else {
          events = content
            .split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line));
        }

        const remainingEvents = events.filter(e => e.timestamp >= olderThanTimestamp);
        deletedCount += events.length - remainingEvents.length;

        if (remainingEvents.length === 0) {
          // Delete the file if no events remain
          await fs.unlink(filepath);
        } else if (remainingEvents.length !== events.length) {
          // Rewrite the file with remaining events
          let content: string;

          if (this.format === 'csv') {
            content = 'id,type,timestamp,sessionId,userId,anonymousId,properties,context,metadata\n';
            content += remainingEvents.map(e => this.eventToCSV(e)).join('\n') + '\n';
          } else {
            content = remainingEvents.map(e => JSON.stringify(e)).join('\n') + '\n';
          }

          await fs.writeFile(filepath, content, 'utf8');
        }
      }

      return deletedCount;
    } catch (error) {
      this.handleError(error, 'Delete old events');
    }
  }

  async getEventStats(filter: EventFilter): Promise<EventStats> {
    try {
      const events = await this.getEvents({ ...filter, limit: undefined, offset: undefined });

      const eventsByType: Record<string, number> = {};
      const uniqueUsers = new Set<string>();
      const uniqueSessions = new Set<string>();
      
      let minTimestamp = Infinity;
      let maxTimestamp = -Infinity;

      events.forEach(event => {
        // Count by type
        eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;

        // Track unique users
        if (event.userId) {
          uniqueUsers.add(event.userId);
        }

        // Track unique sessions
        uniqueSessions.add(event.sessionId);

        // Track time range
        if (event.timestamp < minTimestamp) minTimestamp = event.timestamp;
        if (event.timestamp > maxTimestamp) maxTimestamp = event.timestamp;
      });

      return {
        totalEvents: events.length,
        eventsByType,
        uniqueUsers: uniqueUsers.size,
        uniqueSessions: uniqueSessions.size,
        timeRange: {
          start: minTimestamp === Infinity ? 0 : minTimestamp,
          end: maxTimestamp === -Infinity ? 0 : maxTimestamp
        }
      };
    } catch (error) {
      this.handleError(error, 'Get event stats');
    }
  }

  private eventToCSV(event: AnalyticsEvent): string {
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    return [
      escapeCSV(event.id),
      escapeCSV(event.type),
      escapeCSV(event.timestamp),
      escapeCSV(event.sessionId),
      escapeCSV(event.userId),
      escapeCSV(event.anonymousId),
      escapeCSV(event.properties),
      escapeCSV(event.context),
      escapeCSV(event.metadata)
    ].join(',');
  }

  private parseCSV(content: string): AnalyticsEvent[] {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    // Skip header
    const dataLines = lines.slice(1);

    return dataLines.map(line => {
      const values = this.parseCSVLine(line);
      
      return {
        id: values[0],
        type: values[1],
        timestamp: parseInt(values[2]),
        sessionId: values[3],
        userId: values[4] || undefined,
        anonymousId: values[5] || undefined,
        properties: values[6] ? JSON.parse(values[6]) : {},
        context: values[7] ? JSON.parse(values[7]) : {},
        metadata: values[8] ? JSON.parse(values[8]) : undefined
      };
    });
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }
}