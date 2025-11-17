/**
 * Analytics SDK Core
 * Main SDK class that ties all components together
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ServerConfig,
  DatabaseAdapter,
  AnalyticsEvent,
  EventType,
  EventContext,
  Session,
  User,
  EventFilter,
  EventStats,
  ValidationError
} from '../types';
import { createAdapter } from '../adapters';
import { SessionManager } from './SessionManager';
import { BatchProcessor } from './BatchProcessor';
import { RealtimeEventEmitter } from './EventEmitter';

export class AnalyticsSDK {
  private config: ServerConfig;
  private adapter: DatabaseAdapter;
  private sessionManager: SessionManager;
  private batchProcessor: BatchProcessor;
  private eventEmitter: RealtimeEventEmitter;
  private initialized: boolean = false;

  constructor(config: ServerConfig) {
    this.config = config;
    
    // Create database adapter
    this.adapter = createAdapter(config.database);
    
    // Initialize session manager
    this.sessionManager = new SessionManager(
      {
        sessionTimeout: config.analytics?.enableRealtime ? 30 * 60 * 1000 : undefined,
        persistSessions: true
      },
      this.adapter
    );

    // Initialize batch processor
    this.batchProcessor = new BatchProcessor(this.adapter, {
      batchSize: config.analytics?.batchSize || 100,
      flushInterval: config.analytics?.flushInterval || 5000,
      maxRetries: 3,
      retryDelay: 1000,
      maxQueueSize: 10000
    });

    // Initialize event emitter
    this.eventEmitter = new RealtimeEventEmitter();
    if (config.analytics?.enableRealtime) {
      this.eventEmitter.enable();
    }
  }

  /**
   * Initialize the SDK
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.adapter.connect();
      this.initialized = true;
      console.log('Analytics SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Analytics SDK:', error);
      throw error;
    }
  }

  /**
   * Track an event
   */
  async track(
    type: EventType | string,
    properties: Record<string, any> = {},
    context?: Partial<EventContext>,
    sessionId?: string,
    userId?: string,
    anonymousId?: string
  ): Promise<AnalyticsEvent> {
    if (!this.initialized) {
      throw new Error('SDK not initialized. Call initialize() first.');
    }

    // Get or create session
    const session = await this.sessionManager.getOrCreateSession(userId, anonymousId);

    // Create event
    const event: AnalyticsEvent = {
      id: uuidv4(),
      type,
      timestamp: Date.now(),
      sessionId: sessionId || session.id,
      userId: userId || session.userId,
      anonymousId: anonymousId || session.anonymousId,
      properties: this.sanitizeProperties(properties),
      context: this.buildContext(context)
    };

    // Validate event
    this.validateEvent(event);

    // Check privacy settings
    if (!this.shouldTrack(session.anonymousId)) {
      console.log('Event tracking skipped due to privacy settings');
      return event;
    }

    // Update session activity
    await this.sessionManager.updateSessionActivity(event.sessionId);

    // Add to batch processor
    await this.batchProcessor.add(event);

    // Broadcast event in real-time if enabled
    if (this.eventEmitter.enabled()) {
      this.eventEmitter.broadcastEvent(event);
    }

    return event;
  }

  /**
   * Track multiple events at once
   */
  async trackBatch(events: Array<{
    type: EventType | string;
    properties?: Record<string, any>;
    context?: Partial<EventContext>;
    sessionId?: string;
    userId?: string;
    anonymousId?: string;
  }>): Promise<AnalyticsEvent[]> {
    if (!this.initialized) {
      throw new Error('SDK not initialized. Call initialize() first.');
    }

    const analyticsEvents: AnalyticsEvent[] = [];

    for (const eventData of events) {
      const event = await this.track(
        eventData.type,
        eventData.properties,
        eventData.context,
        eventData.sessionId,
        eventData.userId,
        eventData.anonymousId
      );
      analyticsEvents.push(event);
    }

    return analyticsEvents;
  }

  /**
   * Identify a user
   */
  async identify(
    userId: string,
    anonymousId: string,
    traits?: Record<string, any>
  ): Promise<User> {
    if (!this.initialized) {
      throw new Error('SDK not initialized. Call initialize() first.');
    }

    return await this.sessionManager.identifyUser(userId, anonymousId, traits);
  }

  /**
   * Update user consent
   */
  async updateConsent(
    anonymousId: string,
    consent: { analytics: boolean; marketing?: boolean; necessary?: boolean }
  ): Promise<void> {
    if (!this.initialized) {
      throw new Error('SDK not initialized. Call initialize() first.');
    }

    await this.sessionManager.updateUserConsent(anonymousId, consent);
  }

  /**
   * Get events with filters
   */
  async getEvents(filter: EventFilter = {}): Promise<AnalyticsEvent[]> {
    if (!this.initialized) {
      throw new Error('SDK not initialized. Call initialize() first.');
    }

    return await this.adapter.getEvents(filter);
  }

  /**
   * Get event statistics
   */
  async getStats(filter: EventFilter = {}): Promise<EventStats> {
    if (!this.initialized) {
      throw new Error('SDK not initialized. Call initialize() first.');
    }

    const stats = await this.adapter.getEventStats(filter);

    // Broadcast stats in real-time if enabled
    if (this.eventEmitter.enabled()) {
      this.eventEmitter.broadcastStats(stats);
    }

    return stats;
  }

  /**
   * Get session
   */
  async getSession(sessionId: string): Promise<Session | null> {
    if (!this.initialized) {
      throw new Error('SDK not initialized. Call initialize() first.');
    }

    return await this.sessionManager.getSession(sessionId);
  }

  /**
   * Get user
   */
  async getUser(userId: string): Promise<User | null> {
    if (!this.initialized) {
      throw new Error('SDK not initialized. Call initialize() first.');
    }

    return await this.sessionManager.getUser(userId);
  }

  /**
   * Delete old events (data retention)
   */
  async cleanupOldEvents(daysToKeep: number = 90): Promise<number> {
    if (!this.initialized) {
      throw new Error('SDK not initialized. Call initialize() first.');
    }

    const retentionDays = this.config.privacy?.dataRetentionDays || daysToKeep;
    const cutoffTimestamp = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

    return await this.adapter.deleteOldEvents(cutoffTimestamp);
  }

  /**
   * Subscribe to real-time events
   */
  subscribeToRealtime(subscriber: any): void {
    this.eventEmitter.subscribe(subscriber);
  }

  /**
   * Unsubscribe from real-time events
   */
  unsubscribeFromRealtime(subscriber: any): void {
    this.eventEmitter.unsubscribe(subscriber);
  }

  /**
   * Get event emitter for custom event handling
   */
  getEventEmitter(): RealtimeEventEmitter {
    return this.eventEmitter;
  }

  /**
   * Flush pending events
   */
  async flush(): Promise<void> {
    await this.batchProcessor.flush();
  }

  /**
   * Get queue status
   */
  getQueueStatus(): { size: number; failed: number } {
    return {
      size: this.batchProcessor.getQueueSize(),
      failed: this.batchProcessor.getFailedCount()
    };
  }

  /**
   * Shutdown the SDK
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      // Flush remaining events
      await this.batchProcessor.shutdown();

      // Cleanup session manager
      this.sessionManager.cleanup();

      // Clear event emitter subscribers
      this.eventEmitter.clearSubscribers();

      // Disconnect adapter
      await this.adapter.disconnect();

      this.initialized = false;
      console.log('Analytics SDK shutdown successfully');
    } catch (error) {
      console.error('Error during SDK shutdown:', error);
      throw error;
    }
  }

  /**
   * Validate event data
   */
  private validateEvent(event: AnalyticsEvent): void {
    if (!event.id) {
      throw new ValidationError('Event ID is required');
    }

    if (!event.type) {
      throw new ValidationError('Event type is required');
    }

    if (!event.timestamp) {
      throw new ValidationError('Event timestamp is required');
    }

    if (!event.sessionId) {
      throw new ValidationError('Session ID is required');
    }
  }

  /**
   * Build event context
   */
  private buildContext(partialContext?: Partial<EventContext>): EventContext {
    return {
      ...partialContext
    };
  }

  /**
   * Sanitize properties to remove PII if configured
   */
  private sanitizeProperties(properties: Record<string, any>): Record<string, any> {
    if (!this.config.privacy?.enableGDPR) {
      return properties;
    }

    // Create a copy to avoid modifying original
    const sanitized = { ...properties };

    // List of common PII fields to remove or anonymize
    const piiFields = ['email', 'phone', 'ssn', 'creditCard', 'password', 'apiKey'];

    for (const field of piiFields) {
      if (field in sanitized) {
        // Remove or hash the PII field
        delete sanitized[field];
      }
    }

    return sanitized;
  }

  /**
   * Check if tracking should occur based on user consent
   */
  private async shouldTrack(anonymousId: string): Promise<boolean> {
    if (!this.config.privacy?.enableGDPR) {
      return true;
    }

    const user = await this.sessionManager.getUser(anonymousId);

    if (!user || !user.consent) {
      // Default to not tracking if no consent given
      return false;
    }

    return user.consent.analytics === true;
  }

  /**
   * Check if SDK is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}