/**
 * Batch Processor
 * Handles batching and retry logic for event delivery
 */

import { AnalyticsEvent, QueueItem, DatabaseAdapter } from "../types";
import { v4 as uuidv4 } from "uuid";

export interface BatchProcessorConfig {
  batchSize?: number;
  flushInterval?: number; // in milliseconds
  maxRetries?: number;
  retryDelay?: number; // in milliseconds
  maxQueueSize?: number;
}

export class BatchProcessor {
  private queue: QueueItem[] = [];
  private config: BatchProcessorConfig;
  private adapter: DatabaseAdapter;
  private flushTimer?: NodeJS.Timeout;
  private processing: boolean = false;

  constructor(adapter: DatabaseAdapter, config: BatchProcessorConfig = {}) {
    this.adapter = adapter;
    this.config = {
      batchSize: config.batchSize || 100,
      flushInterval: config.flushInterval || 5000, // 5 seconds
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000, // 1 second
      maxQueueSize: config.maxQueueSize || 10000,
    };

    // Start periodic flush
    this.startFlushTimer();
  }

  /**
   * Add event to the queue
   */
  async add(event: AnalyticsEvent): Promise<void> {
    // Check queue size limit
    if (this.queue.length >= this.config.maxQueueSize!) {
      throw new Error("Queue size limit exceeded");
    }

    const queueItem: QueueItem = {
      id: uuidv4(),
      event,
      attempts: 0,
      timestamp: Date.now(),
    };

    this.queue.push(queueItem);

    // Flush if batch size is reached
    if (this.queue.length >= this.config.batchSize!) {
      await this.flush();
    }
  }

  /**
   * Add multiple events to the queue
   */
  async addBatch(events: AnalyticsEvent[]): Promise<void> {
    for (const event of events) {
      if (this.queue.length >= this.config.maxQueueSize!) {
        break;
      }

      const queueItem: QueueItem = {
        id: uuidv4(),
        event,
        attempts: 0,
        timestamp: Date.now(),
      };

      this.queue.push(queueItem);
    }

    // Flush if batch size is reached
    if (this.queue.length >= this.config.batchSize!) {
      await this.flush();
    }
  }

  /**
   * Flush the queue (process all pending events)
   */
  async flush(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      // Get batch to process
      const batchSize = Math.min(this.queue.length, this.config.batchSize!);
      const batch = this.queue.splice(0, batchSize);

      // Process batch
      await this.processBatch(batch);
    } catch (error) {
      console.error("Flush error:", error);
    } finally {
      this.processing = false;

      // Process remaining items if any
      if (this.queue.length > 0) {
        setImmediate(() => this.flush());
      }
    }
  }

  /**
   * Process a batch of queue items
   */
  private async processBatch(batch: QueueItem[]): Promise<void> {
    try {
      const events = batch.map((item) => item.event);
      await this.adapter.saveEvents(events);
    } catch (error) {
      console.error("Batch processing error:", error);

      const itemsToRetry: QueueItem[] = [];
      const itemsToDiscard: QueueItem[] = [];

      // Categorize items based on retry attempts
      for (const item of batch) {
        item.attempts++;

        if (item.attempts < this.config.maxRetries!) {
          // Add to retry queue
          itemsToRetry.push(item);
        } else {
          // Max retries exceeded, mark for discard
          itemsToDiscard.push(item);
          console.error(`Max retries exceeded for event ${item.event.id}`);
        }
      }

      // Add retry items back to queue
      if (itemsToRetry.length > 0) {
        await this.delay(this.config.retryDelay!);
        for (const item of itemsToRetry) {
          this.queue.push(item);
        }
      }

      // Log discarded items if needed for debugging
      if (itemsToDiscard.length > 0) {
        console.warn(
          `Discarded ${itemsToDiscard.length} events after max retries`,
        );
      }
    }
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval!);
  }

  /**
   * Stop periodic flush timer
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Get failed items count
   */
  getFailedCount(): number {
    return this.queue.filter((item) => item.attempts > 0).length;
  }

  /**
   * Clear the queue
   */
  async clear(): Promise<void> {
    await this.flush();
    this.queue = [];
  }

  /**
   * Shutdown the batch processor
   */
  async shutdown(): Promise<void> {
    this.stopFlushTimer();
    await this.flush();
    this.queue = [];
  }
}
