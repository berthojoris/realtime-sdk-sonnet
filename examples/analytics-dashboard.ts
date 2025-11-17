/**
 * Analytics Dashboard Example
 * Demonstrates retrieving and analyzing event data
 */

import { AnalyticsSDK, EventStats } from '../src';

async function dashboardExample() {
  const sdk = new AnalyticsSDK({
    database: {
      type: 'sqlite',
      connection: {
        filename: './dashboard-analytics.db'
      }
    }
  });

  await sdk.initialize();

  // Generate some sample data
  console.log('--- Generating Sample Data ---\n');
  
  const eventTypes = ['page_view', 'click', 'scroll', 'video_played', 'form_submit'];
  const pages = ['/home', '/products', '/about', '/contact', '/pricing'];
  
  for (let i = 0; i < 100; i++) {
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const page = pages[Math.floor(Math.random() * pages.length)];
    
    await sdk.track(eventType, {
      path: page,
      index: i
    });
  }

  await sdk.flush();
  console.log('Generated 100 sample events\n');

  // Dashboard Analytics
  console.log('=== ANALYTICS DASHBOARD ===\n');

  // 1. Overall Statistics
  console.log('--- Overall Statistics ---');
  const allStats = await sdk.getStats();
  displayStats(allStats);

  // 2. Last 24 Hours
  console.log('\n--- Last 24 Hours ---');
  const last24h = await sdk.getStats({
    startTime: Date.now() - 24 * 60 * 60 * 1000
  });
  displayStats(last24h);

  // 3. Events by Type
  console.log('\n--- Events By Type ---');
  for (const [type, count] of Object.entries(allStats.eventsByType)) {
    const percentage = ((count / allStats.totalEvents) * 100).toFixed(2);
    console.log(`  ${type.padEnd(15)} ${count.toString().padStart(5)} (${percentage}%)`);
  }

  // 4. Top Pages
  console.log('\n--- Top Pages ---');
  const pageViews = await sdk.getEvents({
    eventType: 'page_view',
    limit: 100
  });

  const pageStats = pageViews.reduce((acc, event) => {
    const path = event.properties.path;
    acc[path] = (acc[path] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedPages = Object.entries(pageStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  sortedPages.forEach(([page, count], index) => {
    console.log(`  ${(index + 1)}. ${page.padEnd(15)} ${count} views`);
  });

  // 5. Recent Events
  console.log('\n--- Recent Events (Last 5) ---');
  const recentEvents = await sdk.getEvents({
    limit: 5
  });

  recentEvents.forEach((event, index) => {
    console.log(`  ${index + 1}. [${event.type}] ${new Date(event.timestamp).toLocaleTimeString()}`);
    console.log(`     Properties: ${JSON.stringify(event.properties)}`);
  });

  // 6. User Metrics
  console.log('\n--- User Metrics ---');
  console.log(`  Unique Users:    ${allStats.uniqueUsers}`);
  console.log(`  Unique Sessions: ${allStats.uniqueSessions}`);
  console.log(`  Avg Events/User: ${(allStats.totalEvents / Math.max(allStats.uniqueUsers, 1)).toFixed(2)}`);

  // 7. Time Range
  console.log('\n--- Data Time Range ---');
  console.log(`  Start: ${new Date(allStats.timeRange.start).toLocaleString()}`);
  console.log(`  End:   ${new Date(allStats.timeRange.end).toLocaleString()}`);
  const duration = allStats.timeRange.end - allStats.timeRange.start;
  console.log(`  Duration: ${(duration / 1000 / 60).toFixed(2)} minutes`);

  // 8. Queue Status
  console.log('\n--- System Status ---');
  const queueStatus = sdk.getQueueStatus();
  console.log(`  Queue Size: ${queueStatus.size}`);
  console.log(`  Failed: ${queueStatus.failed}`);
  console.log(`  SDK Status: ${sdk.isInitialized() ? 'Active' : 'Inactive'}`);

  await sdk.shutdown();
  console.log('\n✅ Dashboard example complete');
}

function displayStats(stats: EventStats) {
  console.log(`  Total Events:    ${stats.totalEvents}`);
  console.log(`  Unique Users:    ${stats.uniqueUsers}`);
  console.log(`  Unique Sessions: ${stats.uniqueSessions}`);
  console.log(`  Event Types:     ${Object.keys(stats.eventsByType).length}`);
}

dashboardExample().catch(console.error);