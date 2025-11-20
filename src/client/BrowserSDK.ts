/**
 * Browser Analytics SDK
 * Lightweight client-side SDK for tracking events in web applications
 */

import { EventType, EventContext, AnalyticsEvent } from "../types";

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
  transport?: "fetch" | "beacon";
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
      transport: "fetch",
      ...config,
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

    this.log("Browser SDK initialized", {
      sessionId: this.sessionId,
      anonymousId: this.anonymousId,
    });
  }

  /**
   * Track an event (non-blocking, fire-and-forget)
   */
  track(
    type: EventType | string,
    properties: Record<string, any> = {},
    context?: Partial<EventContext>,
  ): void {
    try {
      // Check Do Not Track
      if (this.config.respectDoNotTrack && this.isDoNotTrackEnabled()) {
        this.log("Tracking skipped due to Do Not Track");
        return;
      }

      const event: Partial<AnalyticsEvent> = {
        type,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        userId: this.userId,
        anonymousId: this.anonymousId,
        properties,
        context: this.buildContext(context),
      };

      this.addToQueue(event);
    } catch (error) {
      // Silent fail - never block client code
      this.logError("track", error);
    }
  }

  /**
   * Identify a user (non-blocking, fire-and-forget)
   */
  identify(userId: string, traits?: Record<string, any>): void {
    try {
      this.userId = userId;

      // Track identify event
      this.track("identify", {
        userId,
        traits: traits || {},
        anonymousId: this.anonymousId,
      });

      this.log("User identified", { userId });
    } catch (error) {
      // Silent fail - never block client code
      this.logError("identify", error);
    }
  }

  /**
   * Track page view (non-blocking, fire-and-forget)
   */
  page(
    name?: string,
    category?: string,
    properties: Record<string, any> = {},
  ): void {
    try {
      this.track(EventType.PAGE_VIEW, {
        name,
        category,
        ...properties,
        url: window.location.href,
        path: window.location.pathname,
        title: document.title,
        referrer: document.referrer,
      });
    } catch (error) {
      // Silent fail - never block client code
      this.logError("page", error);
    }
  }

  /**
   * Flush events immediately (non-blocking, fire-and-forget)
   * Returns void immediately, processes in background
   */
  flush(): void {
    // Fire-and-forget: don't block caller
    if (this.flushPromise) {
      return; // Already flushing
    }

    this.flushPromise = this.processBatch()
      .catch((error) => {
        // Silent fail - log error but don't throw
        this.logError("flush", error);
      })
      .finally(() => {
        this.flushPromise = undefined;
      });
  }

  /**
   * Reset the SDK (new session) (non-blocking)
   */
  reset(): void {
    try {
      this.sessionId = this.createSessionId();
      this.saveSessionId(this.sessionId);
      this.userId = undefined;
      this.log("SDK reset", { sessionId: this.sessionId });
    } catch (error) {
      // Silent fail - never block client code
      this.logError("reset", error);
    }
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
   * Enable auto-tracking (non-blocking event handlers)
   */
  private enableAutoTracking(): void {
    try {
      // Track clicks - wrapped in try-catch to never block UI
      document.addEventListener("click", (e) => {
        try {
          const target = e.target as HTMLElement;
          if (
            target.tagName === "A" ||
            target.tagName === "BUTTON" ||
            target.hasAttribute("data-track")
          ) {
            this.track(EventType.CLICK, {
              elementType: target.tagName,
              elementId: target.id,
              elementClass: target.className,
              elementText: target.textContent?.substring(0, 100),
              trackData: target.getAttribute("data-track"),
            });
          }
        } catch (error) {
          this.logError("auto-track-click", error);
        }
      });

      // Track page visibility changes - wrapped to never block
      document.addEventListener("visibilitychange", () => {
        try {
          this.track(document.hidden ? "page_hidden" : "page_visible", {
            hidden: document.hidden,
          });
        } catch (error) {
          this.logError("auto-track-visibility", error);
        }
      });

      // Track errors - wrapped to prevent recursion
      window.addEventListener("error", (e) => {
        try {
          this.track(EventType.ERROR, {
            message: e.message,
            filename: e.filename,
            lineno: e.lineno,
            colno: e.colno,
            stack: e.error?.stack,
          });
        } catch (error) {
          this.logError("auto-track-error", error);
        }
      });

      // Track unhandled promise rejections - wrapped to prevent recursion
      window.addEventListener("unhandledrejection", (e) => {
        try {
          this.track(EventType.ERROR, {
            message: "Unhandled Promise Rejection",
            reason: String(e.reason),
          });
        } catch (error) {
          this.logError("auto-track-rejection", error);
        }
      });

      this.log("Auto-tracking enabled");
    } catch (error) {
      this.logError("enableAutoTracking", error);
    }
  }

  /**
   * Setup offline/online handling (non-blocking)
   */
  private setupOfflineHandling(): void {
    try {
      window.addEventListener("online", () => {
        try {
          this.isOnline = true;
          this.log("Connection restored, flushing queue");
          this.flush(); // Fire-and-forget flush
        } catch (error) {
          this.logError("online-handler", error);
        }
      });

      window.addEventListener("offline", () => {
        try {
          this.isOnline = false;
          this.log("Connection lost, queueing events");
        } catch (error) {
          this.logError("offline-handler", error);
        }
      });
    } catch (error) {
      this.logError("setupOfflineHandling", error);
    }
  }

  /**
   * Add event to queue (non-blocking)
   */
  private addToQueue(event: Partial<AnalyticsEvent>): void {
    try {
      if (this.queue.length >= this.config.maxQueueSize!) {
        this.log("Queue full, dropping oldest event");
        this.queue.shift();
      }

      this.queue.push({
        event,
        attempts: 0,
        timestamp: Date.now(),
      });

      this.log("Event queued", {
        type: event.type,
        queueSize: this.queue.length,
      });

      // Flush if batch size reached (fire-and-forget)
      if (this.queue.length >= this.config.batchSize!) {
        this.flush();
      }
    } catch (error) {
      this.logError("addToQueue", error);
    }
  }

  /**
   * Start batch timer (non-blocking)
   */
  private startBatchTimer(): void {
    try {
      this.batchTimer = window.setInterval(() => {
        try {
          if (this.queue.length > 0) {
            this.flush(); // Fire-and-forget flush
          }
        } catch (error) {
          this.logError("batch-timer", error);
        }
      }, this.config.batchInterval);
    } catch (error) {
      this.logError("startBatchTimer", error);
    }
  }

  /**
   * Process batch of events (non-blocking, catches all errors)
   */
  private async processBatch(): Promise<void> {
    try {
      if (this.queue.length === 0 || !this.isOnline) {
        return;
      }

      const batch = this.queue.splice(0, this.config.batchSize);
      const events = batch.map((item) => item.event);

      try {
        await this.sendEvents(events);
        this.log("Batch sent successfully", { count: events.length });
      } catch (error) {
        this.log("Batch send failed", error);

        // Re-queue failed events
        for (const item of batch) {
          if (item.attempts < this.config.maxRetries!) {
            item.attempts++;
            this.queue.unshift(item);
          } else {
            this.log("Event dropped after max retries", { event: item.event });
            // Send SDK error to backend silently
            this.reportSDKError("max_retries_exceeded", item.event);
          }
        }
      }
    } catch (error) {
      // Outer catch to ensure processBatch never throws
      this.logError("processBatch", error);
    }
  }

  /**
   * Send events to server (non-blocking, catches all errors)
   */
  private async sendEvents(events: Partial<AnalyticsEvent>[]): Promise<void> {
    try {
      const url = `${this.config.endpoint}/events/batch`;

      if (this.config.transport === "beacon" && navigator.sendBeacon) {
        const success = navigator.sendBeacon(
          url,
          JSON.stringify({
            apiKey: this.config.apiKey,
            events,
          }),
        );

        if (!success) {
          throw new Error("Beacon send failed");
        }
      } else {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": this.config.apiKey,
            "X-Session-Id": this.sessionId,
          },
          body: JSON.stringify({ events }),
          keepalive: true,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Log successful connection on first request
        if (events.length > 0) {
          this.log("✅ Successfully sent events to analytics server", {
            count: events.length,
            endpoint: this.config.endpoint,
          });
        }
      }
    } catch (error) {
      // Re-throw to be caught by processBatch, but ensure it's a proper Error
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Build event context (wrapped in try-catch)
   */
  private buildContext(partialContext?: Partial<EventContext>): EventContext {
    try {
      const context: EventContext = {
        page: {
          url: window.location.href,
          path: window.location.pathname,
          title: document.title,
          referrer: document.referrer,
        },
        browser: {
          name: this.getBrowserName(),
          version: this.getBrowserVersion(),
          userAgent: navigator.userAgent,
        },
        device: {
          type: this.getDeviceType(),
          os: this.getOS(),
        },
        screen: {
          width: window.screen.width,
          height: window.screen.height,
          density: window.devicePixelRatio,
        },
        locale: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...partialContext,
      };

      return context;
    } catch (error) {
      this.logError("buildContext", error);
      // Return minimal context on error
      return partialContext || {};
    }
  }

  /**
   * Get or create anonymous ID
   */
  private getOrCreateAnonymousId(): string {
    const key = "_analytics_anon_id";
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
    const key = "_analytics_session_id";
    const timestampKey = "_analytics_session_timestamp";

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
    const key = "_analytics_session_id";
    const timestampKey = "_analytics_session_timestamp";
    sessionStorage.setItem(key, sessionId);
    sessionStorage.setItem(timestampKey, Date.now().toString());
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Check if Do Not Track is enabled
   */
  private isDoNotTrackEnabled(): boolean {
    return (
      navigator.doNotTrack === "1" ||
      (window as any).doNotTrack === "1" ||
      (navigator as any).msDoNotTrack === "1"
    );
  }

  /**
   * Get browser name
   */
  private getBrowserName(): string {
    const ua = navigator.userAgent;
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Safari")) return "Safari";
    if (ua.includes("Edge")) return "Edge";
    if (ua.includes("MSIE") || ua.includes("Trident")) return "IE";
    return "Unknown";
  }

  /**
   * Get browser version
   */
  private getBrowserVersion(): string {
    const ua = navigator.userAgent;
    const match = ua.match(/(Firefox|Chrome|Safari|Edge)\/(\d+)/);
    return match ? match[2] : "Unknown";
  }

  /**
   * Get device type
   */
  private getDeviceType(): string {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return "tablet";
    }
    if (
      /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
        ua,
      )
    ) {
      return "mobile";
    }
    return "desktop";
  }

  /**
   * Get operating system
   */
  private getOS(): string {
    const ua = navigator.userAgent;
    if (ua.includes("Win")) return "Windows";
    if (ua.includes("Mac")) return "MacOS";
    if (ua.includes("Linux")) return "Linux";
    if (ua.includes("Android")) return "Android";
    if (ua.includes("iOS")) return "iOS";
    return "Unknown";
  }

  /**
   * Cookie helpers
   */
  private setCookie(name: string, value: string, days: number): void {
    const expires = new Date(
      Date.now() + days * 24 * 60 * 60 * 1000,
    ).toUTCString();
    const domain = this.config.cookieDomain
      ? `; domain=${this.config.cookieDomain}`
      : "";
    document.cookie = `${name}=${value}; expires=${expires}; path=/${domain}; SameSite=Lax`;
  }

  private getCookie(name: string): string | null {
    const match = document.cookie.match(
      new RegExp("(^| )" + name + "=([^;]+)"),
    );
    return match ? match[2] : null;
  }

  /**
   * Debug logging (safe)
   */
  private log(message: string, data?: any): void {
    try {
      if (this.config.debug) {
        console.log(`[Analytics SDK] ${message}`, data || "");
      }
    } catch (error) {
      // Even logging can fail, suppress it
    }
  }

  /**
   * Error logging (reports to backend silently, never throws)
   */
  private logError(context: string, error: any): void {
    try {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      if (this.config.debug) {
        console.error(`[Analytics SDK Error] ${context}:`, errorMessage);
      }

      // Send SDK error to backend silently (fire-and-forget)
      this.reportSDKError(context, {
        message: errorMessage,
        stack: errorStack,
      });
    } catch (e) {
      // Complete silence - don't let error reporting cause more errors
    }
  }

  /**
   * Report SDK errors to backend (fire-and-forget, never blocks)
   */
  private reportSDKError(context: string, details: any): void {
    try {
      // Queue SDK error as a special event type
      const errorEvent: Partial<AnalyticsEvent> = {
        type: "sdk_error",
        timestamp: Date.now(),
        sessionId: this.sessionId,
        anonymousId: this.anonymousId,
        properties: {
          context,
          details,
          sdkVersion: "1.0.0",
          userAgent: navigator.userAgent,
        },
        context: {}, // Minimal context to avoid recursion
      };

      // Add directly to queue without triggering flush
      if (this.queue.length < this.config.maxQueueSize!) {
        this.queue.push({
          event: errorEvent,
          attempts: 0,
          timestamp: Date.now(),
        });
      }
    } catch (e) {
      // Complete silence - even error reporting must not throw
    }
  }

  /**
   * Cleanup (non-blocking)
   */
  destroy(): void {
    try {
      if (this.batchTimer) {
        clearInterval(this.batchTimer);
      }

      // Flush remaining events (fire-and-forget)
      this.flush();

      this.log("SDK destroyed");
    } catch (error) {
      this.logError("destroy", error);
    }
  }
}

// Expose BrowserAnalyticsSDK to window for browser usage
if (typeof window !== "undefined") {
  (window as any).BrowserAnalyticsSDK = BrowserAnalyticsSDK;

  // Auto-initialize from global config if present
  const globalConfig = (window as any).ANALYTICS_CONFIG;
  if (globalConfig) {
    (window as any).analytics = new BrowserAnalyticsSDK(globalConfig);
  }
}
