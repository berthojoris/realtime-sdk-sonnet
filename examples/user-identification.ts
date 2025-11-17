/**
 * User Identification Example
 * Demonstrates user tracking and session management
 */

import { AnalyticsSDK } from '../src';

async function userIdentificationExample() {
  const sdk = new AnalyticsSDK({
    database: {
      type: 'sqlite',
      connection: {
        filename: './user-analytics.db'
      }
    }
  });

  await sdk.initialize();

  // Track anonymous user activity
  console.log('--- Anonymous User Activity ---');
  const anonymousId = 'anon-12345';
  
  await sdk.track('page_view', {
    path: '/home'
  }, undefined, undefined, undefined, anonymousId);

  await sdk.track('click', {
    buttonId: 'explore-button'
  }, undefined, undefined, undefined, anonymousId);

  // User signs up - identify them
  console.log('\n--- User Signs Up ---');
  const userId = 'user-67890';
  
  const user = await sdk.identify(userId, anonymousId, {
    name: 'John Doe',
    email: 'john@example.com',
    plan: 'free',
    signupDate: new Date().toISOString()
  });

  console.log('User identified:', user);

  // Track identified user activity
  console.log('\n--- Identified User Activity ---');
  await sdk.track('page_view', {
    path: '/dashboard'
  }, undefined, undefined, userId);

  await sdk.track('feature_used', {
    feature: 'export-data',
    plan: 'free'
  }, undefined, undefined, userId);

  // Update user traits (e.g., upgrade to premium)
  console.log('\n--- User Upgrades ---');
  await sdk.identify(userId, anonymousId, {
    name: 'John Doe',
    email: 'john@example.com',
    plan: 'premium',
    upgradeDate: new Date().toISOString()
  });

  // Get user details
  const updatedUser = await sdk.getUser(userId);
  console.log('Updated user:', updatedUser);

  // Get user's events
  console.log('\n--- User Events ---');
  const userEvents = await sdk.getEvents({
    userId: userId,
    limit: 10
  });
  console.log(`Found ${userEvents.length} events for user ${userId}`);

  // Get user's session
  if (userEvents.length > 0) {
    const session = await sdk.getSession(userEvents[0].sessionId);
    console.log('User session:', {
      id: session?.id,
      eventCount: session?.eventCount,
      duration: session ? Date.now() - session.startTime : 0
    });
  }

  await sdk.shutdown();
  console.log('\n✅ User identification example complete');
}

userIdentificationExample().catch(console.error);