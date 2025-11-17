/**
 * Browser Analytics SDK
 * Lightweight client-side SDK for tracking events in web applications
 */

import { EventType, EventContext, AnalyticsEvent } from '../types';

export interface BrowserSDKConfig {
  apiKey: string;
  endpoint: string;
  debug?: boolean;
  batchSize?: number;
  batchInterval?: number;
  maxRetries?: number;
  retryDelay?: number;
  enableAutoTracking?: boolean;
  sessionTimeout?: number;
  enableOfflineQueue?: boolean;
  maxQueueSize?: number;
  respectDoNotTrack?: boolean;
  transport?: 'fetch' | 'beacon';
  cookieDomain?: string;
}

interface QueuedEvent {
  event: Partial<AnalyticsEvent>;
  attempts: number;
  timestamp: number;
}

export class BrowserAnalyticsSDK {
  private config: BrowserSDKConfig;
  private queue: QueuedEvent[] = [];
  private batchTimer?: number;
  private sessionId: string;
  private anonymousId: string;
  private userId?: string;
  private isOnline: boolean = true;
  private flushPromise?: Promise<void>;

  constructor(config: BrowserSDKConfig) {
    this.config = {
      debug: false,
      batchSize: 10,
      batchInterval: 5000,
      maxRetries: 3,
      retryDelay: 1000,
      enableAutoTracking: false,
      sessionTimeout: 30 * 60 * 1000,
      enableOfflineQueue: true,
      maxQueueSize: 1000,
      respectDoNotTrack: true,
      transport: 'fetch',
      ...config
    };

    // Get or create anonymous ID
    this.anonymousId = this.getOrCreateAnonymousId();
    
    // Get or create session ID
    this.sessionId = this.getOrCreateSessionId();

    // Initialize auto-tracking
    if (this.config.enableAutoTracking) {
      this.enableAutoTracking();
    }

    // Setup online/offline listeners
    if (this.config.enableOfflineQueue) {
      this.setupOfflineHandling();
    }

    // Start batch timer
    this.startBatchTimer();

    this.log('Browser SDK initialized', { sessionId: this.sessionId, anonymousId: this.anonymousId });
  }

  /**
   * Track an event
   */
  track(
    type: EventType | string,
    properties: Record<string, any> = {},
    context?: Partial<EventContext>
  ): void {
    // Check Do Not Track
    if (this.config.respectDoNotTrack && this.isDoNotTrackEnabled()) {
      this.log('Tracking skipped due to Do Not Track');
      return;
    }

    const event: Partial<AnalyticsEvent> = {
      type,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      anonymousId: this.anonymousId,
      properties,
      context: this.buildContext(context)
    };

    this.addToQueue(event);
  }

  /**
   * Identify a user
   */
  identify(userId: string, traits?: Record<string, any>): void {
    this.userId = userId;
    
    // Track identify event
    this.track('identify', {
      userId,
      traits: traits || {},
      anonymousId: this.anonymousId
    });

    this.log('User identified', { userId });
  }

  /**
   * Track page view
   */
  page(
    name?: string,
    category?: string,
    properties: Record<string, any> = {}
  ): void {
    this.track(EventType.PAGE_VIEW, {
      name,
      category,
      ...properties,
      url: window.location.href,
      path: window.location.pathname,
      title: document.title,
      referrer: document.referrer
    });
  }

  /**
   * Flush events immediately
   */
  async flush(): Promise<void> {
    if (this.flushPromise) {
      return this.flushPromise;
    }

    this.flushPromise = this.processBatch();
    try {
      await this.flushPromise;
    } finally {
      this.flushPromise = undefined;
    }
  }

  /**
   * Reset the SDK (new session)
   */
  reset(): void {
    this.sessionId = this.createSessionId();
    this.saveSessionId(this.sessionId);
    this.userId = undefined;
    this.log('SDK reset', { sessionId: this.sessionId });
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get anonymous ID
   */
  getAnonymousId(): string {
    return this.anonymousId;
  }

  /**
   * Get user ID
   */
  getUserId(): string | undefined {
    return this.userId;
  }

  /**
   * Enable auto-tracking
   */
  private enableAutoTracking(): void {
    // Track clicks
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A' || target.tagName === 'BUTTON' || target.hasAttribute('data-track')) {
        this.track(EventType.CLICK, {
          elementType: target.tagName,
          elementId: target.id,
          elementClass: target.className,
          elementText: target.textContent?.substring(0, 100),
          trackData: target.getAttribute('data-track')
        });
      }
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.track(document.hidden ? 'page_hidden' : 'page_visible', {
        hidden: document.hidden
      });
    });

    // Track errors
    window.addEventListener('error', (e) => {
      this.track(EventType.ERROR, {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        stack: e.error?.stack
      });
    });

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (e) => {
      this.track(EventType.ERROR, {
        message: 'Unhandled Promise Rejection',
        reason: String(e.reason)
      });
    });

    this.log('Auto-tracking enabled');
  }

  /**
   * Setup offline/online handling
   */
  private setupOfflineHandling(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.log('Connection restored, flushing queue');
      this.flush();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.log('Connection lost, queueing events');
    });
  }

  /**
   * Add event to queue
   */
  private addToQueue(event: Partial<AnalyticsEvent>): void {
    if (this.queue.length >= this.config.maxQueueSize!) {
      this.log('Queue full, dropping oldest event');
      this.queue.shift();
    }

    this.queue.push({
      event,
      attempts: 0,
      timestamp: Date.now()
    });

    this.log('Event queued', { type: event.type, queueSize: this.queue.length });

    // Flush if batch size reached
    if (this.queue.length >= this.config.batchSize!) {
      this.flush();
    }
  }

  /**
   * Start batch timer
   */
  private startBatchTimer(): void {
    this.batchTimer = window.setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, this.config.batchInterval);
  }

  /**
   * Process batch of events
   */
  private async processBatch(): Promise<void> {
    if (this.queue.length === 0 || !this.isOnline) {
      return;
    }

    const batch = this.queue.splice(0, this.config.batchSize);
    const events = batch.map(item => item.event);

    try {
      await this.sendEvents(events);
      this.log('Batch sent successfully', { count: events.length });
    } catch (error) {
      this.log('Batch send failed', error);
      
      // Re-queue failed events
      for (const item of batch) {
        if (item.attempts < this.config.maxRetries!) {
          item.attempts++;
          this.queue.unshift(item);
        } else {
          this.log('Event dropped after max retries', { event: item.event });
        }
      }
    }
  }

  /**
   * Send events to server
   */
  private async sendEvents(events: Partial<AnalyticsEvent>[]): Promise<void> {
    const url = `${this.config.endpoint}/events/batch`;
    
    if (this.config.transport === 'beacon' && navigator.sendBeacon) {
      const success = navigator.sendBeacon(url, JSON.stringify({
        apiKey: this.config.apiKey,
        events
      }));
      
      if (!success) {
        throw new Error('Beacon send failed');
      }
    } else {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey
        },
        body: JSON.stringify({ events }),
        keepalive: true
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }
  }

  /**
   * Build event context
   */
  private buildContext(partialContext?: Partial<EventContext>): EventContext {
    const context: EventContext = {
      page: {
        url: window.location.href,
        path: window.location.pathname,
        title: document.title,
        referrer: document.referrer
      },
      browser: {
        name: this.getBrowserName(),
        version: this.getBrowserVersion(),
        userAgent: navigator.userAgent
      },
      device: {
        type: this.getDeviceType(),
        os: this.getOS()
      },
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        density: window.devicePixelRatio
      },
      locale: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...partialContext
    };

    return context;
  }

  /**
   * Get or create anonymous ID
   */
  private getOrCreateAnonymousId(): string {
    const key = '_analytics_anon_id';
    let id = this.getCookie(key) || localStorage.getItem(key);
    
    if (!id) {
      id = this.generateId();
      this.setCookie(key, id, 365);
      localStorage.setItem(key, id);
    }
    
    return id;
  }

  /**
   * Get or create session ID
   */
  private getOrCreateSessionId(): string {
    const key = '_analytics_session_id';
    const timestampKey = '_analytics_session_timestamp';
    
    let sessionId = sessionStorage.getItem(key);
    const lastActivity = sessionStorage.getItem(timestampKey);
    
    // Check if session expired
    if (sessionId && lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity, 10);
      if (elapsed > this.config.sessionTimeout!) {
        sessionId = null;
      }
    }
    
    if (!sessionId) {
      sessionId = this.createSessionId();
      sessionStorage.setItem(key, sessionId);
    }
    
    sessionStorage.setItem(timestampKey, Date.now().toString());
    
    return sessionId;
  }

  /**
   * Create new session ID
   */
  private createSessionId(): string {
    return this.generateId();
  }

  /**
   * Save session ID
   */
  private saveSessionId(sessionId: string): void {
    const key = '_analytics_session_id';
    const timestampKey = '_analytics_session_timestamp';
    sessionStorage.setItem(key, sessionId);
    sessionStorage.setItem(timestampKey, Date.now().toString());
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Check if Do Not Track is enabled
   */
  private isDoNotTrackEnabled(): boolean {
    return navigator.doNotTrack === '1' || 
           (window as any).doNotTrack === '1' || 
           (navigator as any).msDoNotTrack === '1';
  }

  /**
   * Get browser name
   */
  private getBrowserName(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    if (ua.includes('MSIE') || ua.includes('Trident')) return 'IE';
    return 'Unknown';
  }

  /**
   * Get browser version
   */
  private getBrowserVersion(): string {
    const ua = navigator.userAgent;
    const match = ua.match(/(Firefox|Chrome|Safari|Edge)\/(\d+)/);
    return match ? match[2] : 'Unknown';
  }

  /**
   * Get device type
   */
  private getDeviceType(): string {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }

  /**
   * Get operating system
   */
  private getOS(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Win')) return 'Windows';
    if (ua.includes('Mac')) return 'MacOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  /**
   * Cookie helpers
   */
  private setCookie(name: string, value: string, days: number): void {
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    const domain = this.config.cookieDomain ? `; domain=${this.config.cookieDomain}` : '';
    document.cookie = `${name}=${value}; expires=${expires}; path=/${domain}; SameSite=Lax`;
  }

  private getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  /**
   * Debug logging
   */
  private log(message: string, data?: any): void {
    if (this.config.debug) {
      console.log(`[Analytics SDK] ${message}`, data || '');
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    
    // Flush remaining events
    this.flush();
    
    this.log('SDK destroyed');
  }
}

// Auto-initialize from global config if present
if (typeof window !== 'undefined') {
  const globalConfig = (window as any).ANALYTICS_CONFIG;
  if (globalConfig) {
    (window as any).analytics = new BrowserAnalyticsSDK(globalConfig);
  }
}