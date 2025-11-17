/**
 * Batch Processing Example
 * Demonstrates efficient batch event processing
 */

import { AnalyticsSDK } from '../src';

async function batchProcessingExample() {
  const sdk = new AnalyticsSDK({
    database: {
      type: 'sqlite',
      connection: {
        filename: './batch-analytics.db'
      }
    },
    analytics: {
      batchSize: 50,        // Process 50 events at a time
      flushInterval: 2000,   // Flush every 2 seconds
      enableRealtime: false
    }
  });

  await sdk.initialize();

  // Example 1: Track events individually (automatic batching)
  console.log('--- Individual Event Tracking (Auto-batching) ---\n');
  
  console.log('Tracking 100 events individually...');
  const startTime = Date.now();
  
  for (let i = 0; i < 100; i++) {
    await sdk.track('page_view', {
      path: `/page-${i}`,
      timestamp: Date.now()
    });
  }
  
  const individualTime = Date.now() - startTime;
  console.log(`Completed in ${individualTime}ms`);
  console.log(`Queue size: ${sdk.getQueueStatus().size}\n`);

  // Example 2: Track multiple events as a batch
  console.log('--- Batch Event Tracking ---\n');
  
  const batchEvents = [];
  for (let i = 0; i < 100; i++) {
    batchEvents.push({
      type: 'click',
      properties: {
        buttonId: `btn-${i}`,
        timestamp: Date.now()
      }
    });
  }

  console.log(`Tracking ${batchEvents.length} events as batch...`);
  const batchStartTime = Date.now();
  
  await sdk.trackBatch(batchEvents);
  
  const batchTime = Date.now() - batchStartTime;
  console.log(`Completed in ${batchTime}ms`);
  console.log(`Queue size: ${sdk.getQueueStatus().size}\n`);

  // Example 3: Manual flush control
  console.log('--- Manual Flush Control ---\n');
  
  // Track some events
  for (let i = 0; i < 25; i++) {
    await sdk.track('custom_event', {
      value: i
    });
  }

  console.log(`Before flush - Queue size: ${sdk.getQueueStatus().size}`);
  
  // Force flush
  await sdk.flush();
  
  console.log(`After flush - Queue size: ${sdk.getQueueStatus().size}\n`);

  // Example 4: High-volume event tracking
  console.log('--- High-Volume Event Tracking ---\n');
  
  const highVolumeCount = 1000;
  console.log(`Tracking ${highVolumeCount} events...`);
  
  const hvStartTime = Date.now();
  
  // Track in smaller batches
  const batchSize = 100;
  for (let i = 0; i < highVolumeCount; i += batchSize) {
    const batch = [];
    for (let j = 0; j < batchSize && (i + j) < highVolumeCount; j++) {
      batch.push({
        type: 'high_volume_event',
        properties: {
          index: i + j,
          batch: Math.floor(i / batchSize)
        }
      });
    }
    await sdk.trackBatch(batch);
    
    if ((i + batchSize) % 500 === 0) {
      console.log(`  Processed ${i + batchSize}/${highVolumeCount} events`);
    }
  }
  
  const hvTime = Date.now() - hvStartTime;
  console.log(`Completed in ${hvTime}ms`);
  console.log(`Average: ${(hvTime / highVolumeCount).toFixed(2)}ms per event\n`);

  // Ensure all events are flushed
  await sdk.flush();

  // Get final statistics
  console.log('--- Final Statistics ---\n');
  const stats = await sdk.getStats();
  console.log(`Total Events Tracked: ${stats.totalEvents}`);
  console.log(`Events by Type:`);
  Object.entries(stats.eventsByType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  // Queue status
  const finalStatus = sdk.getQueueStatus();
  console.log(`\nFinal Queue Status:`);
  console.log(`  Queue Size: ${finalStatus.size}`);
  console.log(`  Failed Events: ${finalStatus.failed}`);

  await sdk.shutdown();
  console.log('\n✅ Batch processing example complete');
}

batchProcessingExample().catch(console.error);