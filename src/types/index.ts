/**
 * Core types and interfaces for the Real-time Analytics SDK
 */

// Event Types
export enum EventType {
  CLICK = "click",
  PAGE_VIEW = "page_view",
  SCROLL = "scroll",
  INPUT = "input",
  NAVIGATION = "navigation",
  ERROR = "error",
  CUSTOM = "custom",
  SESSION_START = "session_start",
  SESSION_END = "session_end",
}

// Event Interface
export interface AnalyticsEvent {
  id: string;
  type: EventType | string;
  timestamp: number;
  sessionId: string;
  userId?: string;
  anonymousId?: string;
  properties: Record<string, any>;
  context: EventContext;
  metadata?: Record<string, any>;
}

// Event Context
export interface EventContext {
  page?: {
    url?: string;
    path?: string;
    title?: string;
    referrer?: string;
  };
  browser?: {
    name?: string;
    version?: string;
    userAgent?: string;
  };
  device?: {
    type?: string;
    model?: string;
    os?: string;
  };
  screen?: {
    width?: number;
    height?: number;
    density?: number;
  };
  locale?: string;
  timezone?: string;
  ip?: string;
}

// Session Interface
export interface Session {
  id: string;
  userId?: string;
  anonymousId: string;
  startTime: number;
  lastActivityTime: number;
  endTime?: number;
  eventCount: number;
  metadata?: Record<string, any>;
}

// User Interface
export interface User {
  id?: string;
  anonymousId: string;
  traits?: Record<string, any>;
  consent?: {
    analytics: boolean;
    marketing?: boolean;
    necessary?: boolean;
  };
  createdAt: number;
  updatedAt: number;
}

// Database Adapter Interface
export interface DatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  saveEvent(event: AnalyticsEvent): Promise<void>;
  saveEvents(events: AnalyticsEvent[]): Promise<void>;
  getEvents(filter: EventFilter): Promise<AnalyticsEvent[]>;
  saveSession(session: Session): Promise<void>;
  getSession(sessionId: string): Promise<Session | null>;
  updateSession(sessionId: string, updates: Partial<Session>): Promise<void>;
  saveUser(user: User): Promise<void>;
  getUser(userId: string): Promise<User | null>;
  deleteOldEvents(olderThanTimestamp: number): Promise<number>;
  getEventStats(filter: EventFilter): Promise<EventStats>;
}

// Event Filter
export interface EventFilter {
  startTime?: number;
  endTime?: number;
  eventType?: EventType | string;
  userId?: string;
  sessionId?: string;
  limit?: number;
  offset?: number;
}

// Event Statistics
export interface EventStats {
  totalEvents: number;
  eventsByType: Record<string, number>;
  uniqueUsers: number;
  uniqueSessions: number;
  timeRange: {
    start: number;
    end: number;
  };
}

// SDK Configuration
export interface SDKConfig {
  apiKey: string;
  endpoint?: string;
  debug?: boolean;
  batchSize?: number;
  batchInterval?: number;
  maxRetries?: number;
  retryDelay?: number;
  enableAutoTracking?: boolean;
  enableWebWorker?: boolean;
  sessionTimeout?: number;
  enableOfflineQueue?: boolean;
  maxQueueSize?: number;
  enablePrivacyMode?: boolean;
  respectDoNotTrack?: boolean;
  cookieOptions?: CookieOptions;
  transport?: "fetch" | "beacon" | "websocket";
}

// Cookie Options
export interface CookieOptions {
  domain?: string;
  path?: string;
  expires?: number;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
}

// Server Configuration
export interface ServerConfig {
  database: DatabaseConfig;
  server?: {
    port?: number;
    host?: string;
    cors?: {
      origin?: string | string[] | ((origin: string) => boolean);
      credentials?: boolean;
      methods?: string[];
      allowedHeaders?: string[];
      exposedHeaders?: string[];
      maxAge?: number;
    };
    security?: {
      apiKeys?: string[];
      allowedIPs?: string[];
      blockedIPs?: string[];
      trustProxy?: boolean;
      rateLimit?: {
        windowMs?: number;
        maxRequests?: number;
      };
    };
    enableWebSocket?: boolean;
  };
  analytics?: {
    batchSize?: number;
    flushInterval?: number;
    enableRealtime?: boolean;
  };
  privacy?: {
    enableGDPR?: boolean;
    dataRetentionDays?: number;
    anonymizeIP?: boolean;
  };
  rateLimit?: {
    windowMs?: number;
    maxRequests?: number;
  };
}

// Database Configuration
export interface DatabaseConfig {
  type: "mysql" | "postgresql" | "mongodb" | "sqlite" | "plaintext";
  connection?: {
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    uri?: string;
    filename?: string;
    directory?: string;
  };
  pool?: {
    min?: number;
    max?: number;
  };
  options?: Record<string, any>;
}

// Batch Queue Item
export interface QueueItem {
  id: string;
  event: AnalyticsEvent;
  attempts: number;
  timestamp: number;
}

// Real-time Stream Event
export interface StreamEvent {
  type: "event" | "stats" | "session";
  data: AnalyticsEvent | EventStats | Session;
  timestamp: number;
}

// Plugin Interface
export interface Plugin {
  name: string;
  version: string;
  initialize?(sdk: any): void;
  track?(event: AnalyticsEvent): void | AnalyticsEvent;
  beforeSend?(
    event: AnalyticsEvent,
  ): void | AnalyticsEvent | Promise<AnalyticsEvent>;
  afterSend?(event: AnalyticsEvent): void;
}

// Error Types
export class AnalyticsError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "AnalyticsError";
  }
}

export class DatabaseError extends AnalyticsError {
  constructor(message: string, code?: string) {
    super(message, code);
    this.name = "DatabaseError";
  }
}

export class NetworkError extends AnalyticsError {
  constructor(message: string, code?: string) {
    super(message, code);
    this.name = "NetworkError";
  }
}

export class ValidationError extends AnalyticsError {
  constructor(message: string, code?: string) {
    super(message, code);
    this.name = "ValidationError";
  }
}
