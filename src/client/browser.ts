/**
 * Browser SDK Bundle
 * Standalone browser version that exposes BrowserAnalyticsSDK globally
 */

import { BrowserAnalyticsSDK } from './BrowserSDK';

// Expose to window for browser use
if (typeof window !== 'undefined') {
  (window as any).BrowserAnalyticsSDK = BrowserAnalyticsSDK;
}

export { BrowserAnalyticsSDK };
