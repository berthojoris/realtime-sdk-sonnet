/**
 * Real-time Event Emitter
 * Handles real-time event streaming and WebSocket communication
 */

import EventEmitter from "eventemitter3";
import { AnalyticsEvent, StreamEvent, EventStats, Session } from "../types";

export interface StreamMessage {
  type: "event" | "stats" | "session" | "connection" | "error";
  data: any;
  timestamp: number;
}

export class RealtimeEventEmitter extends EventEmitter {
  private subscribers: Set<WebSocket | any> = new Set();
  private isEnabled: boolean = false;
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    super();

    // Set up periodic cleanup to remove stale connections
    this.startPeriodicCleanup();
  }

  /**
   * Start periodic cleanup to remove stale WebSocket connections
   */
  private startPeriodicCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleSubscribers();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Clean up stale connections
   */
  private cleanupStaleSubscribers(): void {
    this.subscribers.forEach((subscriber) => {
      try {
        // Check if WebSocket is closed
        if (
          subscriber.readyState !== undefined &&
          subscriber.readyState !== 1
        ) {
          this.unsubscribe(subscriber);
        }
        // For custom subscribers with onMessage, we can't check status, so skip
      } catch (error) {
        // If there's an error checking the subscriber, remove it
        this.unsubscribe(subscriber);
      }
    });
  }

  /**
   * Enable real-time streaming
   */
  enable(): void {
    this.isEnabled = true;
  }

  /**
   * Disable real-time streaming
   */
  disable(): void {
    this.isEnabled = false;
  }

  /**
   * Check if real-time streaming is enabled
   */
  enabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Subscribe a client to real-time events
   */
  subscribe(subscriber: any): void {
    if (!this.isEnabled) return;

    this.subscribers.add(subscriber);

    // Send connection confirmation
    this.sendToSubscriber(subscriber, {
      type: "connection",
      data: { status: "connected", timestamp: Date.now() },
      timestamp: Date.now(),
    });
  }

  /**
   * Unsubscribe a client from real-time events
   */
  unsubscribe(subscriber: any): void {
    this.subscribers.delete(subscriber);
  }

  /**
   * Broadcast an event to all subscribers
   */
  broadcastEvent(event: AnalyticsEvent): void {
    if (!this.isEnabled) return;

    const message: StreamMessage = {
      type: "event",
      data: event,
      timestamp: Date.now(),
    };

    this.broadcast(message);
    this.emit("event", event);
  }

  /**
   * Broadcast statistics to all subscribers
   */
  broadcastStats(stats: EventStats): void {
    if (!this.isEnabled) return;

    const message: StreamMessage = {
      type: "stats",
      data: stats,
      timestamp: Date.now(),
    };

    this.broadcast(message);
    this.emit("stats", stats);
  }

  /**
   * Broadcast session update to all subscribers
   */
  broadcastSession(session: Session): void {
    if (!this.isEnabled) return;

    const message: StreamMessage = {
      type: "session",
      data: session,
      timestamp: Date.now(),
    };

    this.broadcast(message);
    this.emit("session", session);
  }

  /**
   * Broadcast error to all subscribers
   */
  broadcastError(error: Error): void {
    if (!this.isEnabled) return;

    const message: StreamMessage = {
      type: "error",
      data: {
        message: error.message,
        name: error.name,
        stack: error.stack,
      },
      timestamp: Date.now(),
    };

    this.broadcast(message);
    this.emit("error", error);
  }

  /**
   * Broadcast message to all subscribers
   */
  private broadcast(message: StreamMessage): void {
    const messageStr = JSON.stringify(message);

    this.subscribers.forEach((subscriber) => {
      this.sendToSubscriber(subscriber, message);
    });
  }

  /**
   * Send message to a specific subscriber
   */
  private sendToSubscriber(subscriber: any, message: StreamMessage): void {
    try {
      const messageStr = JSON.stringify(message);

      // Handle WebSocket
      if (subscriber.send && typeof subscriber.send === "function") {
        if (subscriber.readyState === 1) {
          // WebSocket.OPEN
          subscriber.send(messageStr);
        }
      }
      // Handle custom subscriber with onMessage callback
      else if (
        subscriber.onMessage &&
        typeof subscriber.onMessage === "function"
      ) {
        subscriber.onMessage(message);
      }
    } catch (error) {
      console.error("Error sending to subscriber:", error);
      this.unsubscribe(subscriber);
    }
  }

  /**
   * Get subscriber count
   */
  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  /**
   * Clear all subscribers
   */
  clearSubscribers(): void {
    this.subscribers.clear();

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }
}
