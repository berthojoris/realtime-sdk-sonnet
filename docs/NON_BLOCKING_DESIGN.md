# Non-Blocking Design

## Overview

The Browser Analytics SDK is designed to be **completely non-blocking** and operate silently in the background without ever interfering with your web application's performance or user experience.

## Key Principles

### 1. Fire-and-Forget Operations

All public SDK methods return immediately (`void`) and process events asynchronously in the background:

```javascript
// ✓ Returns immediately - never blocks
analytics.track('button_click', { button: 'submit' });

// ✓ Your code continues immediately
console.log('This runs right away!');
```

### 2. Silent Error Handling

**The SDK will NEVER throw errors to your application code.** All errors are:
- Caught internally with try-catch blocks
- Logged to console (if debug mode is enabled)
- Reported to the backend as `sdk_error` events
- Handled gracefully without interrupting your app

```javascript
// Even with bad data, this never throws
analytics.track('event', { 
  circular: window,  // Circular reference
  func: () => {}     // Functions
});

// Your app keeps running smoothly ✓
```

### 3. Non-Blocking Network Requests

Network operations are queued and processed asynchronously:
- Events are batched for efficiency
- Failed requests are retried automatically
- Offline events are queued until connection is restored
- Network failures are silent and don't affect your app

## Non-Blocking Features

### Track Events
```javascript
// Returns immediately, event queued for background processing
analytics.track('page_view', { url: '/home' });
```

### Identify Users
```javascript
// Returns immediately, user context updated asynchronously
analytics.identify('user-123', { name: 'John Doe' });
```

### Page Tracking
```javascript
// Returns immediately, page view tracked in background
analytics.page('Home Page', 'Marketing');
```

### Flush Events
```javascript
// Fire-and-forget: returns immediately, processes in background
analytics.flush();
```

**Note:** Even `flush()` is non-blocking! It returns `void` immediately and processes events asynchronously.

## Error Scenarios Handled Silently

### 1. Network Failures
```javascript
// Server is down? No problem - events queue for retry
analytics.track('event', data);
// Your app continues normally ✓
```

### 2. Invalid Data
```javascript
// Bad data is caught and handled gracefully
analytics.track('event', { invalid: undefined });
// No error thrown, app keeps running ✓
```

### 3. SDK Internal Errors
```javascript
// Even if SDK has internal errors, your app is protected
analytics.someMethod();
// Errors caught internally, app continues ✓
```

### 4. Browser API Failures
```javascript
// Storage quota exceeded? API not available? SDK handles it
analytics.track('event', data);
// Fails silently, app unaffected ✓
```

## Implementation Details

### Try-Catch Wrapping

Every SDK method is wrapped in try-catch blocks:

```typescript
track(type: string, properties: any): void {
  try {
    // SDK logic here
    this.addToQueue(event);
  } catch (error) {
    // Silent fail - never block client code
    this.logError('track', error);
  }
}
```

### Error Reporting

Errors are reported to the backend as special events:

```typescript
private logError(context: string, error: any): void {
  try {
    // Log to console if debug mode
    if (this.config.debug) {
      console.error(`[Analytics SDK Error] ${context}:`, error);
    }
    
    // Queue as sdk_error event (fire-and-forget)
    this.reportSDKError(context, {
      message: error.message,
      stack: error.stack
    });
  } catch (e) {
    // Even error reporting can't throw
  }
}
```

### Async Processing

Network requests are processed asynchronously without blocking:

```typescript
private async processBatch(): Promise<void> {
  try {
    // Process events asynchronously
    await this.sendEvents(events);
  } catch (error) {
    // Re-queue failed events
    // Error logged silently
  }
}

// Fire-and-forget flush
flush(): void {
  this.flushPromise = this.processBatch()
    .catch(error => this.logError('flush', error))
    .finally(() => this.flushPromise = undefined);
  // Returns immediately ✓
}
```

### Event Handlers

Even auto-tracking event handlers are non-blocking:

```typescript
document.addEventListener('click', (e) => {
  try {
    // Track click event
    this.track('click', data);
  } catch (error) {
    // Never interfere with user clicks
    this.logError('auto-track-click', error);
  }
});
```

## Configuration Options

### Debug Mode
Enable to see SDK activity in console (errors still don't throw):

```javascript
const analytics = new BrowserAnalyticsSDK({
  apiKey: 'your-key',
  endpoint: 'https://api.example.com',
  debug: true  // See console logs without affecting app
});
```

### Queue Management
Control event queuing behavior:

```javascript
const analytics = new BrowserAnalyticsSDK({
  batchSize: 10,           // Events per batch
  batchInterval: 5000,     // ms between batches
  maxQueueSize: 1000,      // Max events in queue
  maxRetries: 3,           // Retry failed requests
  enableOfflineQueue: true // Queue when offline
});
```

### Transport Options
Choose between fetch and beacon (both non-blocking):

```javascript
const analytics = new BrowserAnalyticsSDK({
  transport: 'beacon'  // Uses sendBeacon (fire-and-forget)
  // or
  transport: 'fetch'   // Uses fetch with keepalive
});
```

## Testing Non-Blocking Behavior

### Test 1: UI Responsiveness
```javascript
// Start a counter
setInterval(() => counter++, 100);

// Send many events
for (let i = 0; i < 1000; i++) {
  analytics.track('event', { index: i });
}

// Counter should continue smoothly ✓
```

### Test 2: Network Failures
```javascript
// Point to non-existent server
const analytics = new BrowserAnalyticsSDK({
  endpoint: 'http://localhost:9999' // Doesn't exist
});

// Track events (will fail silently)
analytics.track('event', data);

// App continues normally ✓
```

### Test 3: Error Scenarios
```javascript
// Try to break the SDK
analytics.track(null, undefined);
analytics.flush();
analytics.identify(null);

// No errors thrown, app keeps running ✓
```

## Performance Characteristics

### Synchronous Operations (Instant)
- Adding events to queue: < 1ms
- User identification: < 1ms
- Context building: < 1ms

### Asynchronous Operations (Background)
- Network requests: Non-blocking
- Event batching: Non-blocking
- Error reporting: Non-blocking

### Memory Usage
- Configurable queue size (default: 1000 events)
- Automatic cleanup of old events
- Efficient batching reduces memory overhead

## Best Practices

### 1. Trust the SDK
Don't wrap SDK calls in try-catch - it's already done:

```javascript
// ✗ Unnecessary
try {
  analytics.track('event', data);
} catch (e) {
  console.error(e);
}

// ✓ SDK never throws
analytics.track('event', data);
```

### 2. Use Fire-and-Forget
Don't wait for SDK operations:

```javascript
// ✓ Good - fire and forget
analytics.track('click', data);
handleClick();

// ✗ Bad - SDK has no async API to await
// await analytics.track('click', data); // Not possible
```

### 3. Enable Debug Mode During Development
```javascript
const analytics = new BrowserAnalyticsSDK({
  debug: process.env.NODE_ENV === 'development'
});
```

### 4. Set Appropriate Batch Sizes
```javascript
// High traffic site - smaller batches, faster sends
const analytics = new BrowserAnalyticsSDK({
  batchSize: 5,
  batchInterval: 2000
});

// Low traffic site - larger batches, less overhead
const analytics = new BrowserAnalyticsSDK({
  batchSize: 20,
  batchInterval: 10000
});
```

## Guarantees

### What is Guaranteed ✓
1. **Never Blocks UI**: All operations return immediately
2. **Never Throws Errors**: All errors caught internally
3. **Graceful Degradation**: Works even when server is down
4. **Offline Support**: Events queued when offline
5. **Automatic Retries**: Failed requests retried automatically
6. **Silent Operation**: No user-facing errors

### What is NOT Guaranteed ✗
1. **Event Delivery**: Events may be lost if retry limit exceeded
2. **Order Preservation**: Events may arrive out of order during retries
3. **Real-time Delivery**: Events are batched for efficiency
4. **Complete Sync**: Some events may be dropped when queue is full

## Example: Complete Integration

```html
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
</head>
<body>
  <button id="myButton">Click Me</button>

  <script type="module">
    import { BrowserAnalyticsSDK } from './BrowserSDK.js';

    // Initialize SDK
    const analytics = new BrowserAnalyticsSDK({
      apiKey: 'your-key',
      endpoint: 'https://api.example.com',
      debug: true,
      enableAutoTracking: true
    });

    // All these operations are non-blocking ✓
    analytics.track('page_load', { url: window.location.href });
    analytics.identify('user-123', { name: 'John' });
    analytics.page('Home');

    // Your app code runs immediately
    document.getElementById('myButton').addEventListener('click', () => {
      // Non-blocking tracking
      analytics.track('button_click', { button: 'myButton' });
      
      // Your logic runs immediately
      console.log('Button clicked!');
      handleClick();
    });

    function handleClick() {
      // Your app logic here
      // SDK tracking happens in parallel, never blocks this
    }
  </script>
</body>
</html>
```

## Summary

The Browser Analytics SDK is designed from the ground up to be:
- **100% Non-Blocking**: Every operation returns immediately
- **Error-Proof**: Never throws errors to your application
- **Silent**: Fails gracefully without user impact
- **Resilient**: Handles network failures, bad data, and edge cases
- **Efficient**: Batches events and minimizes overhead

Your web application will **never be slowed down or interrupted** by analytics tracking, regardless of network conditions, server availability, or unexpected errors.