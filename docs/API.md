# API Documentation

Complete API reference for the Real-time Analytics SDK.

## Table of Contents

- [AnalyticsSDK](#analyticssdk)
- [Database Adapters](#database-adapters)
- [Session Manager](#session-manager)
- [Batch Processor](#batch-processor)
- [Real-time Event Emitter](#realtime-event-emitter)
- [Types](#types)

---

## AnalyticsSDK

Main SDK class for tracking and analyzing events.

### Constructor

```typescript
new AnalyticsSDK(config: ServerConfig)
```

**Parameters:**
- `config`: Server configuration object

### Methods

#### `initialize(): Promise<void>`

Initialize the SDK and connect to the database.

**Returns:** `Promise<void>`

**Example:**
```typescript
await sdk.initialize();
```

---

#### `track(type, properties, context?, sessionId?, userId?, anonymousId?): Promise<AnalyticsEvent>`

Track a single event.

**Parameters:**
- `type` (string | EventType): Event type
- `properties` (Record<string, any>): Event properties
- `context?` (Partial<EventContext>): Event context
- `sessionId?` (string): Session ID
- `userId?` (string): User ID
- `anonymousId?` (string): Anonymous ID

**Returns:** `Promise<AnalyticsEvent>`

**Example:**
```typescript
await sdk.track('page_view', {
  path: '/home',
  title: 'Home Page'
}, {
  page: {
    url: 'https://example.com/home',
    referrer: 'https://google.com'
  }
});
```

---

#### `trackBatch(events): Promise<AnalyticsEvent[]>`

Track multiple events at once.

**Parameters:**
- `events`: Array of event objects

**Returns:** `Promise<AnalyticsEvent[]>`

**Example:**
```typescript
await sdk.trackBatch([
  { type: 'page_view', properties: { path: '/home' } },
  { type: 'click', properties: { buttonId: 'cta' } }
]);
```

---

#### `identify(userId, anonymousId, traits?): Promise<User>`

Identify a user.

**Parameters:**
- `userId` (string): User ID
- `anonymousId` (string): Anonymous ID
- `traits?` (Record<string, any>): User traits

**Returns:** `Promise<User>`

**Example:**
```typescript
await sdk.identify('user-123', 'anon-456', {
  name: 'John Doe',
  email: 'john@example.com'
});
```

---

#### `updateConsent(anonymousId, consent): Promise<void>`

Update user consent for GDPR compliance.

**Parameters:**
- `anonymousId` (string): Anonymous ID
- `consent`: Consent object

**Returns:** `Promise<void>`

**Example:**
```typescript
await sdk.updateConsent('anon-456', {
  analytics: true,
  marketing: false,
  necessary: true
});
```

---

#### `getEvents(filter?): Promise<AnalyticsEvent[]>`

Retrieve events with optional filters.

**Parameters:**
- `filter?` (EventFilter): Filter options

**Returns:** `Promise<AnalyticsEvent[]>`

**Example:**
```typescript
const events = await sdk.getEvents({
  eventType: 'page_view',
  startTime: Date.now() - 24 * 60 * 60 * 1000,
  limit: 100
});
```

---

#### `getStats(filter?): Promise<EventStats>`

Get event statistics.

**Parameters:**
- `filter?` (EventFilter): Filter options

**Returns:** `Promise<EventStats>`

**Example:**
```typescript
const stats = await sdk.getStats({
  startTime: Date.now() - 7 * 24 * 60 * 60 * 1000
});
```

---

#### `getSession(sessionId): Promise<Session | null>`

Get session details.

**Parameters:**
- `sessionId` (string): Session ID

**Returns:** `Promise<Session | null>`

---

#### `getUser(userId): Promise<User | null>`

Get user details.

**Parameters:**
- `userId` (string): User ID or Anonymous ID

**Returns:** `Promise<User | null>`

---

#### `cleanupOldEvents(daysToKeep?): Promise<number>`

Delete events older than specified days.

**Parameters:**
- `daysToKeep?` (number): Number of days to keep (default: 90)

**Returns:** `Promise<number>` - Number of deleted events

---

#### `subscribeToRealtime(subscriber): void`

Subscribe to real-time event stream.

**Parameters:**
- `subscriber`: WebSocket or custom subscriber

---

#### `unsubscribeFromRealtime(subscriber): void`

Unsubscribe from real-time event stream.

**Parameters:**
- `subscriber`: WebSocket or custom subscriber

---

#### `getEventEmitter(): RealtimeEventEmitter`

Get the event emitter instance for custom event handling.

**Returns:** `RealtimeEventEmitter`

---

#### `flush(): Promise<void>`

Force flush pending events.

**Returns:** `Promise<void>`

---

#### `getQueueStatus(): { size: number; failed: number }`

Get current queue status.

**Returns:** Object with queue size and failed count

---

#### `shutdown(): Promise<void>`

Gracefully shutdown the SDK.

**Returns:** `Promise<void>`

---

#### `isInitialized(): boolean`

Check if SDK is initialized.

**Returns:** `boolean`

---

## Database Adapters

### createAdapter(config): DatabaseAdapter

Factory function to create a database adapter.

**Parameters:**
- `config` (DatabaseConfig): Database configuration

**Returns:** `DatabaseAdapter`

**Example:**
```typescript
import { createAdapter } from '@realtime-analytics/sdk';

const adapter = createAdapter({
  type: 'mongodb',
  connection: {
    uri: 'mongodb://localhost:27017',
    database: 'analytics'
  }
});
```

### Available Adapters

- **MongoDBAdapter**: MongoDB storage
- **MySQLAdapter**: MySQL storage
- **PostgreSQLAdapter**: PostgreSQL storage
- **SQLiteAdapter**: SQLite storage
- **PlaintextAdapter**: File-based storage (JSON/CSV)

---

## Session Manager

Manages user sessions and identification.

### Constructor

```typescript
new SessionManager(config?: SessionManagerConfig, adapter?: DatabaseAdapter)
```

### Methods

#### `getOrCreateSession(userId?, anonymousId?): Promise<Session>`

Get existing session or create new one.

**Returns:** `Promise<Session>`

---

#### `getSession(sessionId): Promise<Session | null>`

Get session by ID.

**Returns:** `Promise<Session | null>`

---

#### `updateSessionActivity(sessionId): Promise<void>`

Update session last activity time.

**Returns:** `Promise<void>`

---

#### `endSession(sessionId): Promise<void>`

End a session.

**Returns:** `Promise<void>`

---

#### `identifyUser(userId, anonymousId, traits?): Promise<User>`

Identify a user.

**Returns:** `Promise<User>`

---

#### `getUser(userId): Promise<User | null>`

Get user by ID.

**Returns:** `Promise<User | null>`

---

#### `updateUserConsent(anonymousId, consent): Promise<void>`

Update user consent.

**Returns:** `Promise<void>`

---

#### `cleanup(): void`

Clear all sessions and timeouts.

---

#### `getActiveSessionCount(): number`

Get count of active sessions.

**Returns:** `number`

---

## Batch Processor

Handles event batching and retry logic.

### Constructor

```typescript
new BatchProcessor(adapter: DatabaseAdapter, config?: BatchProcessorConfig)
```

### Methods

#### `add(event): Promise<void>`

Add event to batch queue.

**Parameters:**
- `event` (AnalyticsEvent): Event to add

**Returns:** `Promise<void>`

---

#### `addBatch(events): Promise<void>`

Add multiple events to queue.

**Parameters:**
- `events` (AnalyticsEvent[]): Events to add

**Returns:** `Promise<void>`

---

#### `flush(): Promise<void>`

Flush all pending events.

**Returns:** `Promise<void>`

---

#### `getQueueSize(): number`

Get current queue size.

**Returns:** `number`

---

#### `getFailedCount(): number`

Get count of failed items.

**Returns:** `number`

---

#### `clear(): Promise<void>`

Clear the queue after flushing.

**Returns:** `Promise<void>`

---

#### `shutdown(): Promise<void>`

Shutdown the processor.

**Returns:** `Promise<void>`

---

## Real-time Event Emitter

Manages real-time event broadcasting.

### Methods

#### `enable(): void`

Enable real-time streaming.

---

#### `disable(): void`

Disable real-time streaming.

---

#### `enabled(): boolean`

Check if streaming is enabled.

**Returns:** `boolean`

---

#### `subscribe(subscriber): void`

Subscribe to events.

**Parameters:**
- `subscriber`: WebSocket or custom subscriber

---

#### `unsubscribe(subscriber): void`

Unsubscribe from events.

**Parameters:**
- `subscriber`: WebSocket or custom subscriber

---

#### `broadcastEvent(event): void`

Broadcast an event.

**Parameters:**
- `event` (AnalyticsEvent): Event to broadcast

---

#### `broadcastStats(stats): void`

Broadcast statistics.

**Parameters:**
- `stats` (EventStats): Statistics to broadcast

---

#### `broadcastSession(session): void`

Broadcast session update.

**Parameters:**
- `session` (Session): Session to broadcast

---

#### `getSubscriberCount(): number`

Get subscriber count.

**Returns:** `number`

---

#### `clearSubscribers(): void`

Clear all subscribers.

---

## Types

### EventType

```typescript
enum EventType {
  CLICK = 'click',
  PAGE_VIEW = 'page_view',
  SCROLL = 'scroll',
  INPUT = 'input',
  NAVIGATION = 'navigation',
  ERROR = 'error',
  CUSTOM = 'custom',
  SESSION_START = 'session_start',
  SESSION_END = 'session_end'
}
```

### AnalyticsEvent

```typescript
interface AnalyticsEvent {
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
```

### EventContext

```typescript
interface EventContext {
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
```

### Session

```typescript
interface Session {
  id: string;
  userId?: string;
  anonymousId: string;
  startTime: number;
  lastActivityTime: number;
  endTime?: number;
  eventCount: number;
  metadata?: Record<string, any>;
}
```

### User

```typescript
interface User {
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
```

### EventFilter

```typescript
interface EventFilter {
  startTime?: number;
  endTime?: number;
  eventType?: EventType | string;
  userId?: string;
  sessionId?: string;
  limit?: number;
  offset?: number;
}
```

### EventStats

```typescript
interface EventStats {
  totalEvents: number;
  eventsByType: Record<string, number>;
  uniqueUsers: number;
  uniqueSessions: number;
  timeRange: {
    start: number;
    end: number;
  };
}
```

### ServerConfig

```typescript
interface ServerConfig {
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
```

#### CORS Configuration

The SDK provides comprehensive CORS (Cross-Origin Resource Sharing) configuration:

**`origin`**: Controls which origins can access your API
- `'*'` - Allow all origins (development only)
- `string` - Single allowed origin (e.g., `'https://example.com'`)
- `string[]` - Multiple allowed origins (e.g., `['https://app.com', 'https://admin.app.com']`)
- `function` - Dynamic validation function (e.g., `(origin) => origin.endsWith('.example.com')`)

**`credentials`**: Enable credentials (cookies, authorization headers) in cross-origin requests
- `true` - Allow credentials
- `false` - Do not allow credentials

**`methods`**: HTTP methods allowed for CORS requests
- Default: `['GET', 'POST', 'OPTIONS']`
- Example: `['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']`

**`allowedHeaders`**: Request headers allowed from client
- Default: `['Content-Type', 'X-API-Key']`
- Example: `['Content-Type', 'Authorization', 'X-Custom-Header']`

**`exposedHeaders`**: Response headers exposed to client
- Default: `[]`
- Example: `['X-Request-ID', 'X-RateLimit-Remaining']`

**`maxAge`**: Preflight cache duration in seconds
- Default: `86400` (24 hours)
- Example: `3600` (1 hour)

**Example CORS Configurations:**

```typescript
// Allow all origins (development)
cors: {
  origin: '*',
  credentials: true
}

// Specific origins
cors: {
  origin: ['https://app.example.com', 'https://admin.example.com'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}

// Dynamic validation
cors: {
  origin: (origin) => {
    const allowedDomains = ['.example.com', '.myapp.com'];
    return allowedDomains.some(domain => origin.endsWith(domain));
  },
  credentials: true,
  exposedHeaders: ['X-Request-ID']
}
```

#### Security Configuration

The SDK provides robust security features for production deployments:

**`apiKeys`**: Array of valid API keys for authentication
- Empty array `[]` - No authentication required (development only)
- Example: `['key1', 'key2']` - Requests must include `X-API-Key` header

**`allowedIPs`**: IP allowlist (whitelist)
- Empty array `[]` - Allow all IPs
- Supports multiple formats:
  - Exact IP: `'192.168.1.100'`
  - Wildcard: `'192.168.1.*'`
  - CIDR: `'10.0.0.0/8'`
  - IPv6: `'::1'`

**`blockedIPs`**: IP blocklist (blacklist)
- Empty array `[]` - No IPs blocked
- Same format support as allowedIPs
- Checked before allowlist

**`trustProxy`**: Trust X-Forwarded-For headers
- `false` - Use socket remote address (default)
- `true` - Trust proxy headers (enable if behind nginx, cloudflare, etc.)

**`rateLimit`**: Rate limiting per IP
- `windowMs`: Time window in milliseconds
- `maxRequests`: Maximum requests per window

**Example Security Configurations:**

```typescript
// Production with API keys
security: {
  apiKeys: ['prod-key-1', 'prod-key-2'],
  trustProxy: true,
  rateLimit: {
    windowMs: 60000,    // 1 minute
    maxRequests: 100
  }
}

// IP-restricted internal API
security: {
  allowedIPs: [
    '192.168.1.0/24',   // Internal network
    '10.0.0.0/8',       // VPN network
    '203.0.113.50'      // Specific external IP
  ],
  trustProxy: true
}

// Public API with rate limiting
security: {
  apiKeys: ['public-api-key'],
  blockedIPs: [
    '198.51.100.0/24'   // Block suspicious subnet
  ],
  rateLimit: {
    windowMs: 60000,
    maxRequests: 1000
  }
}
```

**IP Pattern Matching:**

The SDK supports flexible IP matching:
- **Exact match**: `'192.168.1.100'` matches only that IP
- **Wildcard**: `'192.168.*'` matches all IPs starting with 192.168
- **CIDR notation**: `'10.0.0.0/8'` matches entire subnet
- **IPv6**: Full IPv6 address support

**Security Best Practices:**

1. **Always use API keys in production**
   ```typescript
   security: { apiKeys: ['strong-random-key'] }
   ```

2. **Enable trustProxy behind reverse proxy**
   ```typescript
   security: { trustProxy: true }
   ```

3. **Use specific CORS origins**
   ```typescript
   cors: { origin: ['https://yourapp.com'] }
   ```

4. **Implement rate limiting**
   ```typescript
   security: {
     rateLimit: { windowMs: 60000, maxRequests: 100 }
   }
   ```

5. **Use IP allowlist for internal APIs**
   ```typescript
   security: { allowedIPs: ['10.0.0.0/8'] }
   ```

### DatabaseConfig

```typescript
interface DatabaseConfig {
  type: 'mysql' | 'postgresql' | 'mongodb' | 'sqlite' | 'plaintext';
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
```

---

## Error Types

### AnalyticsError

Base error class for analytics errors.

### DatabaseError

Database-related errors.

### NetworkError

Network-related errors.

### ValidationError

Data validation errors.

---

## Examples

See the `examples/` directory for complete working examples:

- `basic-usage.ts` - Basic SDK usage
- `multi-database.ts` - Different database configurations
- `realtime-streaming.ts` - Real-time event streaming
- `user-identification.ts` - User tracking and sessions
- `gdpr-privacy.ts` - Privacy and GDPR compliance
- `analytics-dashboard.ts` - Analytics and reporting
- `batch-processing.ts` - Batch event processing