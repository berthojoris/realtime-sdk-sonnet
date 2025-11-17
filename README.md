# Real-time Analytics SDK

A comprehensive Node.js SDK for real-time analytics with multi-database support. Track user interactions, events, and behavior across your applications with powerful insights and real-time streaming capabilities.

## Features

- ✨ **Multi-Database Support**: MySQL, PostgreSQL, MongoDB, SQLite, and Plaintext files
- 🚀 **Real-time Streaming**: WebSocket-based real-time event broadcasting
- 📊 **Event Tracking**: Track clicks, page views, custom events, and more
- 👤 **Session Management**: Automatic session handling with intelligent timeouts
- 🔒 **Privacy First**: Built-in GDPR compliance with consent management
- ⚡ **Batch Processing**: Efficient event batching with automatic retry logic
- 📈 **Analytics & Stats**: Get insights with event statistics and aggregations
- 🎯 **Type Safety**: Full TypeScript support with comprehensive type definitions
- 🔄 **Offline Support**: Queue events when offline and sync when reconnected
- 🛡️ **Data Retention**: Configurable data retention policies

## Installation

```bash
npm install @realtime-analytics/sdk
```

### Database Driver Installation

Install the appropriate database driver based on your needs:

```bash
# For MongoDB
npm install mongodb

# For MySQL
npm install mysql2

# For PostgreSQL
npm install pg

# For SQLite
npm install better-sqlite3
```

## Quick Start

### Server-Side (Node.js)

For backend analytics processing and data storage:

```typescript
import { AnalyticsSDK } from '@realtime-analytics/sdk';

const sdk = new AnalyticsSDK({
  database: {
    type: 'mongodb',
    connection: {
      uri: 'mongodb://localhost:27017',
      database: 'analytics'
    }
  },
  analytics: {
    batchSize: 100,
    flushInterval: 5000,
    enableRealtime: true
  }
});

// Initialize the SDK
await sdk.initialize();

// Track an event
await sdk.track('page_view', {
  path: '/home',
  title: 'Home Page'
});
```

### Client-Side (Web Browser)

**Step 1**: Start the API server to receive events from browsers:

```typescript
import { AnalyticsAPIServer } from '@realtime-analytics/sdk/server';

const server = new AnalyticsAPIServer({
  database: {
    type: 'sqlite',
    connection: { filename: './analytics.db' }
  },
  server: {
    port: 3000,
    cors: { origin: '*' }
  }
});

await server.start();
```

**Step 2**: Use the Browser SDK in your web app:

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Web App</title>
</head>
<body>
    <h1>Welcome!</h1>
    
    <script src="path/to/browser-sdk.js"></script>
    <script>
        const analytics = new BrowserAnalyticsSDK({
            apiKey: 'your-api-key',
            endpoint: 'http://localhost:3000',
            enableAutoTracking: true
        });
        
        // Track page view
        analytics.page();
        
        // Track custom event
        analytics.track('button_click', {
            buttonId: 'signup',
            page: '/landing'
        });
        
        // Identify user
        analytics.identify('user-123', {
            name: 'John Doe',
            email: 'john@example.com'
        });
    </script>
</body>
</html>
```

**See the complete [Web Client Integration Guide](docs/WEB_CLIENT_GUIDE.md) for detailed instructions.**

## Configuration

### Database Configuration

#### MongoDB

```typescript
{
  database: {
    type: 'mongodb',
    connection: {
      uri: 'mongodb://localhost:27017',
      database: 'analytics'
    }
  }
}
```

#### MySQL

```typescript
{
  database: {
    type: 'mysql',
    connection: {
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'password',
      database: 'analytics'
    },
    pool: {
      min: 2,
      max: 10
    }
  }
}
```

#### PostgreSQL

```typescript
{
  database: {
    type: 'postgresql',
    connection: {
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'password',
      database: 'analytics'
    },
    pool: {
      min: 2,
      max: 10
    }
  }
}
```

#### SQLite

```typescript
{
  database: {
    type: 'sqlite',
    connection: {
      filename: './analytics.db'
    }
  }
}
```

#### Plaintext (JSON/CSV)

```typescript
{
  database: {
    type: 'plaintext',
    connection: {
      directory: './analytics-data'
    },
    options: {
      format: 'jsonl' // or 'csv'
    }
  }
}
```

### Analytics Configuration

```typescript
{
  analytics: {
    batchSize: 100,           // Number of events per batch
    flushInterval: 5000,      // Flush interval in milliseconds
    enableRealtime: true      // Enable real-time streaming
  }
}
```

### Privacy Configuration

```typescript
{
  privacy: {
    enableGDPR: true,          // Enable GDPR compliance
    dataRetentionDays: 90,     // Data retention period
    anonymizeIP: true          // Anonymize IP addresses
  }
}
```

## API Reference

### Core Methods

#### `initialize()`

Initialize the SDK and connect to the database.

```typescript
await sdk.initialize();
```

#### `track(type, properties, context?, sessionId?, userId?, anonymousId?)`

Track an event.

```typescript
await sdk.track('button_click', {
  buttonId: 'submit-form',
  page: '/contact'
}, {
  page: {
    url: 'https://example.com/contact',
    title: 'Contact Us'
  }
});
```

**Parameters:**
- `type` (string): Event type (e.g., 'click', 'page_view', 'custom')
- `properties` (object): Event properties
- `context` (object, optional): Event context (page, browser, device info)
- `sessionId` (string, optional): Session ID
- `userId` (string, optional): User ID
- `anonymousId` (string, optional): Anonymous ID

#### `trackBatch(events)`

Track multiple events at once.

```typescript
await sdk.trackBatch([
  {
    type: 'page_view',
    properties: { path: '/home' }
  },
  {
    type: 'click',
    properties: { elementId: 'hero-cta' }
  }
]);
```

#### `identify(userId, anonymousId, traits?)`

Identify a user.

```typescript
await sdk.identify('user-123', 'anon-456', {
  name: 'John Doe',
  email: 'john@example.com',
  plan: 'premium'
});
```

#### `updateConsent(anonymousId, consent)`

Update user consent for GDPR compliance.

```typescript
await sdk.updateConsent('anon-456', {
  analytics: true,
  marketing: false,
  necessary: true
});
```

#### `getEvents(filter?)`

Retrieve events with optional filters.

```typescript
const events = await sdk.getEvents({
  startTime: Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
  eventType: 'page_view',
  limit: 100
});
```

**Filter Options:**
- `startTime` (number): Filter events after this timestamp
- `endTime` (number): Filter events before this timestamp
- `eventType` (string): Filter by event type
- `userId` (string): Filter by user ID
- `sessionId` (string): Filter by session ID
- `limit` (number): Maximum number of events to return
- `offset` (number): Pagination offset

#### `getStats(filter?)`

Get event statistics.

```typescript
const stats = await sdk.getStats({
  startTime: Date.now() - 7 * 24 * 60 * 60 * 1000 // Last 7 days
});

console.log(stats);
// {
//   totalEvents: 15420,
//   eventsByType: {
//     page_view: 8500,
//     click: 5200,
//     custom: 1720
//   },
//   uniqueUsers: 342,
//   uniqueSessions: 891,
//   timeRange: {
//     start: 1699564800000,
//     end: 1700169600000
//   }
// }
```

#### `getSession(sessionId)`

Get session details.

```typescript
const session = await sdk.getSession('session-123');
```

#### `getUser(userId)`

Get user details.

```typescript
const user = await sdk.getUser('user-123');
```

#### `flush()`

Flush pending events immediately.

```typescript
await sdk.flush();
```

#### `shutdown()`

Shutdown the SDK gracefully.

```typescript
await sdk.shutdown();
```

### Real-time Streaming

#### Subscribe to Real-time Events

```typescript
// Custom subscriber
const subscriber = {
  onMessage: (message) => {
    console.log('Real-time event:', message);
  }
};

sdk.subscribeToRealtime(subscriber);
```

#### Using with WebSocket

```typescript
import WebSocket from 'ws';

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  sdk.subscribeToRealtime(ws);
  
  ws.on('close', () => {
    sdk.unsubscribeFromRealtime(ws);
  });
});
```

#### Event Emitter

```typescript
const eventEmitter = sdk.getEventEmitter();

eventEmitter.on('event', (event) => {
  console.log('New event:', event);
});

eventEmitter.on('stats', (stats) => {
  console.log('Stats update:', stats);
});

eventEmitter.on('session', (session) => {
  console.log('Session update:', session);
});
```

## Event Types

Pre-defined event types:

- `CLICK` - User click events
- `PAGE_VIEW` - Page view events
- `SCROLL` - Scroll events
- `INPUT` - Input/form events
- `NAVIGATION` - Navigation events
- `ERROR` - Error events
- `CUSTOM` - Custom events
- `SESSION_START` - Session start
- `SESSION_END` - Session end

You can also use custom event type strings.

## Usage Examples

### Track Page Views

```typescript
await sdk.track('page_view', {
  path: '/products/shoes',
  title: 'Shoes Collection',
  category: 'products'
}, {
  page: {
    url: 'https://example.com/products/shoes',
    referrer: 'https://google.com'
  }
});
```

### Track User Actions

```typescript
await sdk.track('button_click', {
  buttonId: 'add-to-cart',
  productId: 'prod-123',
  price: 49.99
});
```

### Track Errors

```typescript
await sdk.track('error', {
  message: error.message,
  stack: error.stack,
  page: window.location.pathname
});
```

### Get Analytics Dashboard Data

```typescript
// Get stats for the last 30 days
const stats = await sdk.getStats({
  startTime: Date.now() - 30 * 24 * 60 * 60 * 1000
});

// Get top pages
const pageViews = await sdk.getEvents({
  eventType: 'page_view',
  startTime: Date.now() - 7 * 24 * 60 * 60 * 1000,
  limit: 10
});
```

### Data Retention

```typescript
// Clean up events older than 90 days
const deletedCount = await sdk.cleanupOldEvents(90);
console.log(`Deleted ${deletedCount} old events`);
```

## Advanced Usage

### Custom Event Context

```typescript
await sdk.track('purchase', {
  orderId: 'order-789',
  total: 99.99,
  items: 3
}, {
  page: {
    url: 'https://example.com/checkout',
    title: 'Checkout'
  },
  browser: {
    name: 'Chrome',
    version: '118.0'
  },
  device: {
    type: 'desktop',
    os: 'Windows'
  },
  screen: {
    width: 1920,
    height: 1080
  },
  locale: 'en-US',
  timezone: 'America/New_York'
});
```

### Batch Processing

```typescript
const events = [];

// Collect events
for (let i = 0; i < 1000; i++) {
  events.push({
    type: 'custom_event',
    properties: { index: i }
  });
}

// Track in batch
await sdk.trackBatch(events);
```

### Session Management

```typescript
// Get or create session
const session = await sdk.getSession('session-123');

if (session) {
  console.log('Active session:', session.id);
  console.log('Event count:', session.eventCount);
  console.log('Duration:', Date.now() - session.startTime);
}
```

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import {
  AnalyticsSDK,
  AnalyticsEvent,
  EventType,
  EventFilter,
  EventStats,
  Session,
  User,
  ServerConfig
} from '@realtime-analytics/sdk';

const config: ServerConfig = {
  database: {
    type: 'mongodb',
    connection: {
      uri: 'mongodb://localhost:27017',
      database: 'analytics'
    }
  }
};

const sdk = new AnalyticsSDK(config);
```

## Performance Considerations

- **Batch Size**: Adjust `batchSize` based on your event volume (default: 100)
- **Flush Interval**: Control how often events are flushed (default: 5000ms)
- **Database Indexes**: Ensure proper indexes are created for query performance
- **Connection Pooling**: Configure connection pool size for your workload
- **Data Retention**: Regularly clean up old events to maintain performance

## Error Handling

```typescript
try {
  await sdk.track('event', { data: 'value' });
} catch (error) {
  if (error.name === 'ValidationError') {
    console.error('Invalid event data:', error.message);
  } else if (error.name === 'DatabaseError') {
    console.error('Database error:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Migration Guide

### From Other Analytics Solutions

The SDK provides a simple and flexible API that can be adapted from other analytics solutions:

```typescript
// Google Analytics style
await sdk.track('page_view', {
  page_title: document.title,
  page_location: window.location.href
});

// Mixpanel style
await sdk.track('Button Clicked', {
  button_name: 'Sign Up',
  button_location: 'navbar'
});

// Segment style
await sdk.identify('user-123', 'anon-456', {
  email: 'user@example.com',
  name: 'John Doe'
});
```

## Testing

```typescript
import { AnalyticsSDK } from '@realtime-analytics/sdk';

describe('Analytics SDK', () => {
  let sdk: AnalyticsSDK;

  beforeAll(async () => {
    sdk = new AnalyticsSDK({
      database: {
        type: 'sqlite',
        connection: { filename: ':memory:' }
      }
    });
    await sdk.initialize();
  });

  afterAll(async () => {
    await sdk.shutdown();
  });

  test('should track events', async () => {
    const event = await sdk.track('test_event', { foo: 'bar' });
    expect(event.type).toBe('test_event');
    expect(event.properties.foo).toBe('bar');
  });
});
```

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/yourrepo/issues)
- Documentation: [Full docs](https://docs.example.com)
- Email: support@example.com