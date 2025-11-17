# Web Client Integration Guide

Complete guide for integrating the Real-time Analytics SDK into web applications.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Server Setup](#server-setup)
- [Browser SDK Setup](#browser-sdk-setup)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Real-time Analytics SDK provides a complete solution for tracking user analytics in web applications:

- **Browser SDK** - Lightweight client-side library for tracking events
- **API Server** - Backend server that receives and stores analytics data
- **Real-time Streaming** - WebSocket support for live analytics dashboards
- **Privacy-First** - Built-in GDPR compliance and consent management

### Architecture

```
┌─────────────────┐
│   Web Browser   │
│                 │
│  Browser SDK    │──┐
└─────────────────┘  │
                     │ HTTP/WebSocket
┌─────────────────┐  │
│   Web Browser   │  │
│                 │  │
│  Browser SDK    │──┤
└─────────────────┘  │
                     ▼
              ┌─────────────┐
              │  API Server │
              │             │
              │ Process &   │
              │ Validate    │
              └──────┬──────┘
                     │
                     ▼
              ┌─────────────┐
              │  Database   │
              │             │
              │ MongoDB     │
              │ PostgreSQL  │
              │ MySQL       │
              │ SQLite      │
              └─────────────┘
```

---

## Quick Start

### 1. Install Dependencies

```bash
npm install realtime-analytics-sdk
```

### 2. Start the API Server

```typescript
import { AnalyticsAPIServer } from 'realtime-analytics-sdk/server';

const server = new AnalyticsAPIServer({
  database: {
    type: 'sqlite',
    connection: {
      filename: './analytics.db'
    }
  },
  server: {
    port: 3000,
    cors: { origin: '*' }
  }
});

await server.start();
```

### 3. Include Browser SDK in Your Web App

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Web App</title>
</head>
<body>
    <h1>Welcome to My App</h1>
    
    <script src="https://cdn.example.com/analytics-sdk.js"></script>
    <script>
        const analytics = new BrowserAnalyticsSDK({
            apiKey: 'your-api-key',
            endpoint: 'http://localhost:3000',
            enableAutoTracking: true
        });
        
        // Track page view
        analytics.page();
    </script>
</body>
</html>
```

---

## Server Setup

### Installation

The API server runs on Node.js and requires a database.

#### 1. Install Required Database Driver

```bash
# For MongoDB
npm install mongodb

# For PostgreSQL
npm install pg

# For MySQL
npm install mysql2

# For SQLite (recommended for development)
npm install better-sqlite3
```

#### 2. Create Server Configuration

```typescript
import { AnalyticsAPIServer } from 'realtime-analytics-sdk/server';

const config = {
  database: {
    type: 'mongodb',
    connection: {
      uri: 'mongodb://localhost:27017',
      database: 'analytics'
    }
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    cors: {
      origin: ['https://yourapp.com', 'http://localhost:3000'],
      credentials: true
    },
    apiKeys: ['your-secret-api-key'], // Optional
    enableWebSocket: true // Enable real-time streaming
  },
  analytics: {
    batchSize: 100,
    flushInterval: 5000,
    enableRealtime: true
  },
  privacy: {
    enableGDPR: true,
    dataRetentionDays: 90,
    anonymizeIP: true
  }
};

const server = new AnalyticsAPIServer(config);
await server.start();
```

### API Endpoints

The server automatically provides these endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/events` | Track single event |
| POST | `/events/batch` | Track multiple events |
| GET | `/events` | Retrieve events |
| GET | `/stats` | Get statistics |
| POST | `/identify` | Identify user |
| POST | `/consent` | Update consent |
| GET | `/health` | Health check |

### Example: Running the Server

```typescript
// server.ts
import { AnalyticsAPIServer } from 'realtime-analytics-sdk/server';

async function main() {
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
  console.log('Server running on http://localhost:3000');
}

main();
```

---

## Browser SDK Setup

### Installation Methods

#### Option 1: NPM/Yarn (Recommended for Modern Apps)

```bash
npm install realtime-analytics-sdk
```

```typescript
import { BrowserAnalyticsSDK } from 'realtime-analytics-sdk/client';

const analytics = new BrowserAnalyticsSDK({
  apiKey: 'your-api-key',
  endpoint: 'https://api.yourapp.com'
});
```

#### Option 2: CDN (For Quick Integration)

```html
<script src="https://cdn.jsdelivr.net/npm/realtime-analytics-sdk@latest/dist/browser.min.js"></script>
<script>
  const analytics = new BrowserAnalyticsSDK({
    apiKey: 'your-api-key',
    endpoint: 'https://api.yourapp.com'
  });
</script>
```

#### Option 3: Self-Hosted

1. Build the browser bundle:
```bash
npm run build
```

2. Include in your HTML:
```html
<script src="/js/analytics-sdk.js"></script>
```

### Configuration Options

```typescript
const analytics = new BrowserAnalyticsSDK({
  // Required
  apiKey: 'your-api-key',
  endpoint: 'https://api.yourapp.com',
  
  // Optional
  debug: false,                    // Enable debug logging
  batchSize: 10,                   // Events per batch
  batchInterval: 5000,             // Flush interval (ms)
  maxRetries: 3,                   // Max retry attempts
  retryDelay: 1000,                // Delay between retries (ms)
  enableAutoTracking: false,       // Auto-track clicks, errors, etc.
  sessionTimeout: 30 * 60 * 1000,  // Session timeout (30 minutes)
  enableOfflineQueue: true,        // Queue events when offline
  maxQueueSize: 1000,              // Max queued events
  respectDoNotTrack: true,         // Honor DNT browser setting
  transport: 'fetch',              // 'fetch' or 'beacon'
  cookieDomain: '.yourapp.com'     // Cookie domain
});
```

---

## API Reference

### BrowserAnalyticsSDK

#### Methods

##### `track(type, properties, context?)`

Track a custom event.

```typescript
analytics.track('purchase', {
  orderId: 'order-123',
  total: 99.99,
  items: 3
}, {
  page: {
    url: window.location.href,
    title: document.title
  }
});
```

**Parameters:**
- `type` (string): Event type
- `properties` (object): Event properties
- `context` (object, optional): Event context

##### `page(name?, category?, properties?)`

Track a page view.

```typescript
analytics.page('Home', 'Landing', {
  campaign: 'summer-sale',
  variant: 'A'
});
```

**Parameters:**
- `name` (string, optional): Page name
- `category` (string, optional): Page category
- `properties` (object, optional): Additional properties

##### `identify(userId, traits?)`

Identify a user.

```typescript
analytics.identify('user-123', {
  name: 'John Doe',
  email: 'john@example.com',
  plan: 'premium',
  signupDate: '2024-01-01'
});
```

**Parameters:**
- `userId` (string): User identifier
- `traits` (object, optional): User traits/properties

##### `flush()`

Flush pending events immediately.

```typescript
await analytics.flush();
```

##### `reset()`

Reset the SDK (new session).

```typescript
analytics.reset();
```

##### Getters

```typescript
const sessionId = analytics.getSessionId();
const anonymousId = analytics.getAnonymousId();
const userId = analytics.getUserId();
```

---

## Examples

### Basic Page Tracking

```html
<!DOCTYPE html>
<html>
<head>
    <title>My App</title>
    <script src="/js/analytics-sdk.js"></script>
</head>
<body>
    <script>
        // Initialize
        const analytics = new BrowserAnalyticsSDK({
            apiKey: 'demo-key',
            endpoint: 'http://localhost:3000',
            enableAutoTracking: true
        });
        
        // Track page view
        analytics.page();
    </script>
</body>
</html>
```

### E-commerce Tracking

```typescript
// Product view
analytics.track('product_viewed', {
  productId: 'prod-123',
  name: 'Blue T-Shirt',
  price: 29.99,
  category: 'Apparel'
});

// Add to cart
analytics.track('product_added', {
  productId: 'prod-123',
  quantity: 2,
  price: 29.99
});

// Checkout
analytics.track('checkout_started', {
  orderId: 'order-456',
  total: 59.98,
  items: 2
});

// Purchase
analytics.track('purchase', {
  orderId: 'order-456',
  total: 59.98,
  revenue: 59.98,
  items: 2,
  paymentMethod: 'credit_card'
});
```

### User Authentication

```typescript
// User signup
function onSignup(user) {
  analytics.identify(user.id, {
    name: user.name,
    email: user.email,
    plan: user.plan,
    signupDate: new Date().toISOString()
  });
  
  analytics.track('user_signup', {
    method: 'email',
    plan: user.plan
  });
}

// User login
function onLogin(user) {
  analytics.identify(user.id);
  
  analytics.track('user_login', {
    method: 'password'
  });
}

// User logout
function onLogout() {
  analytics.track('user_logout');
  analytics.reset(); // Start new session
}
```

### Form Tracking

```typescript
// Track form submission
document.getElementById('contactForm').addEventListener('submit', (e) => {
  analytics.track('form_submitted', {
    formId: 'contact',
    formName: 'Contact Us',
    fields: ['name', 'email', 'message']
  });
});

// Track form errors
function onFormError(fieldName, errorMessage) {
  analytics.track('form_error', {
    formId: 'contact',
    field: fieldName,
    error: errorMessage
  });
}
```

### Video Tracking

```typescript
const player = document.getElementById('video');

player.addEventListener('play', () => {
  analytics.track('video_played', {
    videoId: 'intro-video',
    title: 'Product Introduction',
    duration: player.duration
  });
});

player.addEventListener('pause', () => {
  analytics.track('video_paused', {
    videoId: 'intro-video',
    currentTime: player.currentTime,
    percentWatched: (player.currentTime / player.duration) * 100
  });
});

player.addEventListener('ended', () => {
  analytics.track('video_completed', {
    videoId: 'intro-video',
    duration: player.duration
  });
});
```

### Single Page Application (SPA)

```typescript
// React example
import { useEffect } from 'react';
import { BrowserAnalyticsSDK } from 'realtime-analytics-sdk/client';

const analytics = new BrowserAnalyticsSDK({
  apiKey: 'your-api-key',
  endpoint: 'https://api.yourapp.com'
});

function App() {
  useEffect(() => {
    // Track initial page view
    analytics.page();
  }, []);
  
  return <Router />;
}

// Track route changes
function Router() {
  const location = useLocation();
  
  useEffect(() => {
    analytics.page(location.pathname);
  }, [location]);
  
  return <Routes />;
}
```

---

## Best Practices

### 1. Initialize Early

Initialize the SDK as early as possible in your page load:

```html
<head>
  <script src="/analytics-sdk.js"></script>
  <script>
    window.analytics = new BrowserAnalyticsSDK({...});
  </script>
</head>
```

### 2. Use Auto-Tracking

Enable auto-tracking for common events:

```typescript
const analytics = new BrowserAnalyticsSDK({
  enableAutoTracking: true // Tracks clicks, errors, visibility
});
```

### 3. Batch Events

Configure batching for better performance:

```typescript
const analytics = new BrowserAnalyticsSDK({
  batchSize: 20,        // Send 20 events at once
  batchInterval: 5000   // Or every 5 seconds
});
```

### 4. Handle Offline

Enable offline queueing for reliability:

```typescript
const analytics = new BrowserAnalyticsSDK({
  enableOfflineQueue: true,
  maxQueueSize: 1000
});
```

### 5. Privacy Compliance

Respect user privacy settings:

```typescript
const analytics = new BrowserAnalyticsSDK({
  respectDoNotTrack: true  // Honor DNT setting
});

// Update consent
if (userConsent.analytics) {
  analytics.identify(userId);
}
```

### 6. Error Handling

Catch and log errors properly:

```typescript
try {
  analytics.track('event', {...});
} catch (error) {
  console.error('Analytics error:', error);
}
```

### 7. Flush Before Unload

Ensure events are sent before page closes:

```typescript
window.addEventListener('beforeunload', () => {
  analytics.flush();
});
```

---

## Troubleshooting

### Events Not Being Tracked

**Check:**
1. Is the API server running?
2. Is the endpoint URL correct?
3. Check browser console for errors
4. Verify CORS settings
5. Check API key configuration

```typescript
// Enable debug mode
const analytics = new BrowserAnalyticsSDK({
  debug: true  // See all events in console
});
```

### CORS Errors

Configure CORS on server:

```typescript
const server = new AnalyticsAPIServer({
  server: {
    cors: {
      origin: ['https://yourapp.com'],
      credentials: true
    }
  }
});
```

### Events Being Dropped

Check queue size and batch settings:

```typescript
const analytics = new BrowserAnalyticsSDK({
  maxQueueSize: 2000,    // Increase queue size
  batchSize: 50,         // Larger batches
  batchInterval: 10000   // Less frequent flushes
});
```

### Session Not Persisting

Verify cookie settings:

```typescript
const analytics = new BrowserAnalyticsSDK({
  cookieDomain: '.yourapp.com',  // Set proper domain
  sessionTimeout: 30 * 60 * 1000 // 30 minutes
});
```

---

## Advanced Topics

### Custom Transport

Use Beacon API for reliability:

```typescript
const analytics = new BrowserAnalyticsSDK({
  transport: 'beacon'  // More reliable for page unload
});
```

### Custom Context

Add custom context to all events:

```typescript
analytics.track('event', {}, {
  app: {
    version: '1.2.3',
    environment: 'production'
  },
  campaign: {
    source: 'google',
    medium: 'cpc'
  }
});
```

### Real-time Dashboard Integration

Connect to WebSocket for live updates:

```typescript
const ws = new WebSocket('ws://localhost:3000');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'event') {
    console.log('New event:', message.data);
    updateDashboard(message.data);
  }
};
```

---

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/yourrepo/issues)
- Documentation: [Full docs](https://docs.example.com)
- Email: support@example.com