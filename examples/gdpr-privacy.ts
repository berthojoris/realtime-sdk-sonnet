/**
 * GDPR & Privacy Example
 * Demonstrates privacy controls and GDPR compliance
 */

import { AnalyticsSDK } from '../src';

async function privacyExample() {
  // Create SDK with GDPR enabled
  const sdk = new AnalyticsSDK({
    database: {
      type: 'sqlite',
      connection: {
        filename: './privacy-analytics.db'
      }
    },
    privacy: {
      enableGDPR: true,
      dataRetentionDays: 30,
      anonymizeIP: true
    }
  });

  await sdk.initialize();

  const anonymousId = 'anon-privacy-demo';

  // Step 1: User visits site (no consent yet)
  console.log('--- No Consent: Events Not Tracked ---');
  
  // This event won't be tracked because no consent is given
  await sdk.track('page_view', {
    path: '/landing'
  }, undefined, undefined, undefined, anonymousId);

  // Check if events were saved
  let events = await sdk.getEvents({ limit: 10 });
  console.log(`Events tracked without consent: ${events.length}`);

  // Step 2: User gives consent
  console.log('\n--- User Gives Consent ---');
  
  await sdk.updateConsent(anonymousId, {
    analytics: true,
    marketing: false,
    necessary: true
  });

  console.log('Consent updated');

  // Step 3: Now events will be tracked
  console.log('\n--- With Consent: Events Are Tracked ---');
  
  await sdk.track('page_view', {
    path: '/products'
  }, undefined, undefined, undefined, anonymousId);

  await sdk.track('click', {
    buttonId: 'add-to-cart',
    productId: 'prod-123'
  }, undefined, undefined, undefined, anonymousId);

  // Verify events are tracked
  events = await sdk.getEvents({ limit: 10 });
  console.log(`Events tracked with consent: ${events.length}`);

  // Step 4: Identify user (with consent)
  console.log('\n--- User Identification ---');
  
  const user = await sdk.identify('user-privacy-123', anonymousId, {
    name: 'Jane Smith',
    // Note: Email is sanitized if PII removal is enabled
    country: 'US'
  });

  console.log('User identified:', user);

  // Step 5: User revokes consent
  console.log('\n--- User Revokes Consent ---');
  
  await sdk.updateConsent(anonymousId, {
    analytics: false,
    marketing: false,
    necessary: true
  });

  console.log('Consent revoked');

  // These events won't be tracked
  await sdk.track('page_view', {
    path: '/checkout'
  }, undefined, undefined, 'user-privacy-123');

  // Step 6: Data retention - clean up old data
  console.log('\n--- Data Retention ---');
  
  // In production, this would run on a schedule
  const deletedCount = await sdk.cleanupOldEvents(30);
  console.log(`Deleted ${deletedCount} events older than 30 days`);

  // Step 7: Get user data (for GDPR data export request)
  console.log('\n--- GDPR Data Export ---');
  
  const userData = await sdk.getUser(anonymousId);
  const userEvents = await sdk.getEvents({
    userId: 'user-privacy-123',
    limit: 100
  });

  console.log('User data for export:', {
    user: userData,
    eventCount: userEvents.length,
    consent: userData?.consent
  });

  await sdk.shutdown();
  console.log('\n✅ Privacy example complete');
}

privacyExample().catch(console.error);