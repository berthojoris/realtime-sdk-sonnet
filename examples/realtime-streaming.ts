/**
 * Real-time Streaming Example
 * Demonstrates WebSocket-based real-time event streaming
 */

import { AnalyticsSDK } from '../src';

async function realtimeExample() {
  // Create SDK with real-time enabled
  const sdk = new AnalyticsSDK({
    database: {
      type: 'mongodb',
      connection: {
        uri: 'mongodb://localhost:27017',
        database: 'analytics'
      }
    },
    analytics: {
      batchSize: 10,
      flushInterval: 2000,
      enableRealtime: true
    }
  });

  await sdk.initialize();

  // Get event emitter
  const eventEmitter = sdk.getEventEmitter();

  // Listen to real-time events
  eventEmitter.on('event', (event) => {
    console.log('📊 New Event:', {
      type: event.type,
      timestamp: new Date(event.timestamp).toISOString(),
      properties: event.properties
    });
  });

  // Listen to stats updates
  eventEmitter.on('stats', (stats) => {
    console.log('📈 Stats Update:', {
      totalEvents: stats.totalEvents,
      uniqueUsers: stats.uniqueUsers,
      uniqueSessions: stats.uniqueSessions
    });
  });

  // Listen to session updates
  eventEmitter.on('session', (session) => {
    console.log('👤 Session Update:', {
      sessionId: session.id,
      eventCount: session.eventCount,
      duration: Date.now() - session.startTime
    });
  });

  // Subscribe custom handler
  const customSubscriber = {
    onMessage: (message: any) => {
      console.log('🔔 Real-time Message:', message);
    }
  };
  sdk.subscribeToRealtime(customSubscriber);

  // Simulate tracking events
  console.log('\n--- Tracking Events ---\n');
  
  for (let i = 1; i <= 5; i++) {
    await sdk.track('page_view', {
      path: `/page-${i}`,
      number: i
    });
    
    // Wait a bit between events
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Get and broadcast stats
  await sdk.getStats();

  // Wait for events to be processed
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Cleanup
  sdk.unsubscribeFromRealtime(customSubscriber);
  await sdk.shutdown();
  console.log('\n✅ Real-time example complete');
}

realtimeExample().catch(console.error);