/**
 * Basic Usage Example
 * Demonstrates basic SDK setup and event tracking
 */

import { AnalyticsSDK } from "realtime-analytics-sdk";

async function basicExample() {
  // Create SDK instance with MongoDB
  const sdk = new AnalyticsSDK({
    database: {
      type: "mongodb",
      connection: {
        uri: "mongodb://localhost:27017",
        database: "analytics",
      },
    },
    analytics: {
      batchSize: 50,
      flushInterval: 3000,
      enableRealtime: true,
    },
  });

  // Initialize SDK
  await sdk.initialize();
  console.log("SDK initialized successfully");

  // Track a simple page view
  await sdk.track("page_view", {
    path: "/home",
    title: "Home Page",
  });
  console.log("Page view tracked");

  // Track a button click with more context
  await sdk.track(
    "click",
    {
      elementId: "signup-button",
      elementText: "Sign Up Now",
      page: "/landing",
    },
    {
      page: {
        url: "https://example.com/landing",
        title: "Landing Page",
        referrer: "https://google.com",
      },
      browser: {
        name: "Chrome",
        version: "118.0",
      },
    },
  );
  console.log("Click event tracked");

  // Track a custom event
  await sdk.track("video_played", {
    videoId: "intro-video",
    duration: 120,
    progress: 0,
  });
  console.log("Custom event tracked");

  // Flush pending events
  await sdk.flush();
  console.log("Events flushed");

  // Get recent events
  const events = await sdk.getEvents({
    limit: 10,
  });
  console.log(`Retrieved ${events.length} events`);

  // Get statistics
  const stats = await sdk.getStats();
  console.log("Statistics:", stats);

  // Shutdown SDK
  await sdk.shutdown();
  console.log("SDK shutdown complete");
}

// Run example
basicExample().catch(console.error);
