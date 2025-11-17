# Getting Started with Real-time Analytics SDK

This guide will help you get up and running with the Real-time Analytics SDK in just a few minutes.

## Installation

```bash
npm install @realtime-analytics/sdk
```

### Install Database Driver

Choose and install the appropriate database driver:

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

## Quick Start (5 Minutes)

### 1. Basic Setup

Create a new file `analytics.ts`:

```typescript
import { AnalyticsSDK } from '@realtime-analytics/sdk';

// Initialize SDK with SQLite (easiest for getting started)
const sdk = new AnalyticsSDK({
  database: {
    type: 'sqlite',
    connection: {
      filename: './analytics.db'
    }
  }
});

async function main() {
  // Initialize
  await sdk.initialize();
  console.log('✅ SDK initialized');

  // Track your first event
  await sdk.track('page_view', {
    path: '/home',
    title: 'Home Page'
  });
  console.log('✅ Event tracked');

  // Get statistics
  const stats = await sdk.getStats();
  console.log('📊 Stats:', stats);

  // Shutdown
  await sdk.shutdown();
}

main().catch(console.error);
```

### 2. Run It

```bash
npx ts-node analytics.ts
```

You should see:
```
✅ SDK initialized
✅ Event tracked
📊 Stats: { totalEvents: 1, ... }
```

## Common Use Cases

### Track Page Views

```typescript
await sdk.track('page_view', {
  path: window.location.pathname,
  title: document.title,
  referrer: document.referrer
});
```

### Track Button Clicks

```typescript
await sdk.track('click', {
  buttonId: 'signup-button',
  buttonText: 'Sign Up',
  page: '/landing'
});
```

### Identify Users

```typescript
// When user signs up
await sdk.identify('user-123', 'anon-456', {
  name: 'John Doe',
  email: 'john@example.com',
  plan: 'free'
});
```

### Track Custom Events

```typescript
await sdk.track('video_played', {
  videoId: 'intro-video',
  duration: 120,
  quality: '1080p'
});
```

## Database Configuration

### SQLite (Recommended for Development)

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

### MongoDB

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

### MySQL

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
    }
  }
}
```

### PostgreSQL

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
    }
  }
}
```

## Real-time Analytics

Enable real-time streaming to broadcast events as they happen:

```typescript
const sdk = new AnalyticsSDK({
  database: { /* ... */ },
  analytics: {
    enableRealtime: true
  }
});

// Listen to events
const eventEmitter = sdk.getEventEmitter();
eventEmitter.on('event', (event) => {
  console.log('New event:', event);
});
```

## Privacy & GDPR

Enable GDPR compliance:

```typescript
const sdk = new AnalyticsSDK({
  database: { /* ... */ },
  privacy: {
    enableGDPR: true,
    dataRetentionDays: 90,
    anonymizeIP: true
  }
});

// Update user consent
await sdk.updateConsent('anon-456', {
  analytics: true,
  marketing: false,
  necessary: true
});
```

## Analytics Dashboard

Get insights from your data:

```typescript
// Get overall statistics
const stats = await sdk.getStats();
console.log('Total events:', stats.totalEvents);
console.log('Unique users:', stats.uniqueUsers);

// Get recent events
const events = await sdk.getEvents({
  limit: 10
});

// Filter by date range
const todayStats = await sdk.getStats({
  startTime: Date.now() - 24 * 60 * 60 * 1000
});

// Filter by event type
const pageViews = await sdk.getEvents({
  eventType: 'page_view',
  limit: 100
});
```

## Best Practices

### 1. Initialize Once

Initialize the SDK once at application startup:

```typescript
// app.ts
export const analytics = new AnalyticsSDK({ /* config */ });
await analytics.initialize();
```

### 2. Use Batch Processing for High Volume

```typescript
const events = [];
for (let i = 0; i < 1000; i++) {
  events.push({
    type: 'event',
    properties: { index: i }
  });
}
await sdk.trackBatch(events);
```

### 3. Handle Errors Gracefully

```typescript
try {
  await sdk.track('event', { data: 'value' });
} catch (error) {
  console.error('Tracking failed:', error);
  // Don't block user experience
}
```

### 4. Flush on Shutdown

```typescript
process.on('SIGTERM', async () => {
  await sdk.shutdown(); // Flushes pending events
  process.exit(0);
});
```

### 5. Clean Up Old Data

```typescript
// Run this periodically (e.g., daily cron job)
const deleted = await sdk.cleanupOldEvents(90);
console.log(`Cleaned up ${deleted} old events`);
```

## Configuration Options

### Full Configuration Example

```typescript
const sdk = new AnalyticsSDK({
  database: {
    type: 'mongodb',
    connection: {
      uri: 'mongodb://localhost:27017',
      database: 'analytics'
    }
  },
  analytics: {
    batchSize: 100,          // Events per batch
    flushInterval: 5000,     // Flush every 5 seconds
    enableRealtime: true     // Enable real-time streaming
  },
  privacy: {
    enableGDPR: true,        // GDPR compliance
    dataRetentionDays: 90,   // Keep data for 90 days
    anonymizeIP: true        // Anonymize IP addresses
  }
});
```

## Next Steps

1. **Explore Examples**: Check the `examples/` directory for more use cases
2. **Read API Docs**: See `docs/API.md` for complete API reference
3. **Production Setup**: Configure your production database
4. **Real-time Streaming**: Set up WebSocket server for live analytics
5. **Data Export**: Implement data export for GDPR compliance

## Troubleshooting

### SDK Not Initializing

Make sure you've installed the appropriate database driver:

```bash
npm install mongodb  # or mysql2, pg, better-sqlite3
```

### Events Not Being Tracked

Check if GDPR is enabled and consent is given:

```typescript
await sdk.updateConsent('anonymous-id', {
  analytics: true
});
```

### High Memory Usage

Adjust batch size and flush interval:

```typescript
{
  analytics: {
    batchSize: 50,        // Smaller batches
    flushInterval: 2000   // More frequent flushing
  }
}
```

## Support

- **Documentation**: See [README.md](./README.md) and [docs/API.md](./docs/API.md)
- **Examples**: Check the `examples/` directory
- **Issues**: Report bugs on GitHub
- **Questions**: Open a discussion on GitHub

## License

MIT

---

Happy tracking! 🚀