/**
 * Analytics API Server
 * HTTP/WebSocket server for receiving analytics events from browser clients
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse as parseUrl } from 'url';
import { AnalyticsSDK } from '../core/AnalyticsSDK';
import { ServerConfig, AnalyticsEvent, EventFilter } from '../types';

export interface APIServerConfig extends ServerConfig {
  server: {
    port: number;
    host?: string;
    cors?: {
      origin?: string | string[];
      credentials?: boolean;
    };
    apiKeys?: string[];
    enableWebSocket?: boolean;
  };
}

export class AnalyticsAPIServer {
  private sdk: AnalyticsSDK;
  private config: APIServerConfig;
  private server: any;
  private wsClients: Set<any> = new Set();

  constructor(config: APIServerConfig) {
    this.config = {
      server: {
        port: 3000,
        host: '0.0.0.0',
        cors: {
          origin: '*',
          credentials: true
        },
        apiKeys: [],
        enableWebSocket: false,
        ...config.server
      },
      ...config
    };

    this.sdk = new AnalyticsSDK(config);
  }

  /**
   * Start the API server
   */
  async start(): Promise<void> {
    await this.sdk.initialize();

    this.server = createServer((req, res) => this.handleRequest(req, res));

    const { port, host } = this.config.server;
    
    this.server.listen(port, host, () => {
      console.log(`Analytics API Server listening on http://${host}:${port}`);
    });

    // Setup WebSocket if enabled
    if (this.config.server.enableWebSocket) {
      this.setupWebSocket();
    }

    // Subscribe to real-time events
    if (this.config.analytics?.enableRealtime) {
      const emitter = this.sdk.getEventEmitter() as any;
      emitter.on('event', (event: AnalyticsEvent) => {
        this.broadcastToWebSocketClients({
          type: 'event',
          data: event,
          timestamp: Date.now()
        });
      });
    }
  }

  /**
   * Stop the API server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(async () => {
          await this.sdk.shutdown();
          console.log('Analytics API Server stopped');
          resolve();
        });

        // Close all WebSocket connections
        this.wsClients.forEach(ws => {
          try {
            ws.close();
          } catch (e) {
            // Ignore errors
          }
        });
        this.wsClients.clear();
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle HTTP request
   */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Set CORS headers
    this.setCORSHeaders(req, res);

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = parseUrl(req.url || '', true);
    const pathname = url.pathname || '';

    try {
      // Verify API key
      if (!this.verifyApiKey(req)) {
        this.sendError(res, 401, 'Unauthorized: Invalid API key');
        return;
      }

      // Route requests
      if (pathname === '/events' && req.method === 'POST') {
        await this.handleTrackEvent(req, res);
      } else if (pathname === '/events/batch' && req.method === 'POST') {
        await this.handleTrackBatch(req, res);
      } else if (pathname === '/events' && req.method === 'GET') {
        await this.handleGetEvents(req, res);
      } else if (pathname === '/stats' && req.method === 'GET') {
        await this.handleGetStats(req, res);
      } else if (pathname === '/identify' && req.method === 'POST') {
        await this.handleIdentify(req, res);
      } else if (pathname === '/consent' && req.method === 'POST') {
        await this.handleConsent(req, res);
      } else if (pathname === '/health' && req.method === 'GET') {
        this.handleHealth(req, res);
      } else {
        this.sendError(res, 404, 'Not Found');
      }
    } catch (error: any) {
      console.error('Request error:', error);
      this.sendError(res, 500, error.message || 'Internal Server Error');
    }
  }

  /**
   * Handle track single event
   */
  private async handleTrackEvent(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.parseBody(req);
    const { type, properties, context, sessionId, userId, anonymousId } = body;

    if (!type) {
      this.sendError(res, 400, 'Missing required field: type');
      return;
    }

    const event = await this.sdk.track(
      type,
      properties || {},
      context,
      sessionId,
      userId,
      anonymousId
    );

    this.sendJSON(res, 200, {
      success: true,
      event: {
        id: event.id,
        type: event.type,
        timestamp: event.timestamp
      }
    });
  }

  /**
   * Handle track batch events
   */
  private async handleTrackBatch(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.parseBody(req);
    const { events } = body;

    if (!Array.isArray(events) || events.length === 0) {
      this.sendError(res, 400, 'Invalid or empty events array');
      return;
    }

    const trackedEvents = await this.sdk.trackBatch(events);

    this.sendJSON(res, 200, {
      success: true,
      count: trackedEvents.length,
      events: trackedEvents.map(e => ({
        id: e.id,
        type: e.type,
        timestamp: e.timestamp
      }))
    });
  }

  /**
   * Handle get events
   */
  private async handleGetEvents(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = parseUrl(req.url || '', true);
    const query = url.query;

    const filter: EventFilter = {
      startTime: query.startTime ? parseInt(query.startTime as string) : undefined,
      endTime: query.endTime ? parseInt(query.endTime as string) : undefined,
      eventType: query.eventType as string,
      userId: query.userId as string,
      sessionId: query.sessionId as string,
      limit: query.limit ? parseInt(query.limit as string) : 100,
      offset: query.offset ? parseInt(query.offset as string) : 0
    };

    const events = await this.sdk.getEvents(filter);

    this.sendJSON(res, 200, {
      success: true,
      count: events.length,
      events
    });
  }

  /**
   * Handle get statistics
   */
  private async handleGetStats(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = parseUrl(req.url || '', true);
    const query = url.query;

    const filter: EventFilter = {
      startTime: query.startTime ? parseInt(query.startTime as string) : undefined,
      endTime: query.endTime ? parseInt(query.endTime as string) : undefined,
      eventType: query.eventType as string
    };

    const stats = await this.sdk.getStats(filter);

    this.sendJSON(res, 200, {
      success: true,
      stats
    });
  }

  /**
   * Handle user identification
   */
  private async handleIdentify(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.parseBody(req);
    const { userId, anonymousId, traits } = body;

    if (!userId || !anonymousId) {
      this.sendError(res, 400, 'Missing required fields: userId, anonymousId');
      return;
    }

    const user = await this.sdk.identify(userId, anonymousId, traits);

    this.sendJSON(res, 200, {
      success: true,
      user
    });
  }

  /**
   * Handle consent update
   */
  private async handleConsent(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.parseBody(req);
    const { anonymousId, consent } = body;

    if (!anonymousId || !consent) {
      this.sendError(res, 400, 'Missing required fields: anonymousId, consent');
      return;
    }

    await this.sdk.updateConsent(anonymousId, consent);

    this.sendJSON(res, 200, {
      success: true,
      message: 'Consent updated'
    });
  }

  /**
   * Handle health check
   */
  private handleHealth(req: IncomingMessage, res: ServerResponse): void {
    const queueStatus = this.sdk.getQueueStatus();
    
    this.sendJSON(res, 200, {
      success: true,
      status: 'healthy',
      initialized: this.sdk.isInitialized(),
      queue: queueStatus,
      timestamp: Date.now()
    });
  }

  /**
   * Setup WebSocket server
   */
  private setupWebSocket(): void {
    try {
      // Dynamic import to avoid forcing ws as a dependency
      const WebSocket = require('ws');
      const wss = new WebSocket.Server({ server: this.server });

      wss.on('connection', (ws: any) => {
        console.log('WebSocket client connected');
        this.wsClients.add(ws);

        // Subscribe to real-time events
        this.sdk.subscribeToRealtime(ws);

        ws.on('close', () => {
          console.log('WebSocket client disconnected');
          this.wsClients.delete(ws);
          this.sdk.unsubscribeFromRealtime(ws);
        });

        ws.on('error', (error: Error) => {
          console.error('WebSocket error:', error);
        });
      });

      console.log('WebSocket server enabled');
    } catch (error) {
      console.warn('WebSocket not available. Install "ws" package to enable real-time streaming.');
    }
  }

  /**
   * Broadcast message to all WebSocket clients
   */
  private broadcastToWebSocketClients(message: any): void {
    const data = JSON.stringify(message);
    this.wsClients.forEach(ws => {
      try {
        if (ws.readyState === 1) { // OPEN
          ws.send(data);
        }
      } catch (error) {
        console.error('Error broadcasting to WebSocket client:', error);
      }
    });
  }

  /**
   * Verify API key
   */
  private verifyApiKey(req: IncomingMessage): boolean {
    // If no API keys configured, allow all requests
    if (!this.config.server.apiKeys || this.config.server.apiKeys.length === 0) {
      return true;
    }

    const apiKey = req.headers['x-api-key'] as string;
    return this.config.server.apiKeys.includes(apiKey);
  }

  /**
   * Set CORS headers
   */
  private setCORSHeaders(req: IncomingMessage, res: ServerResponse): void {
    const { origin, credentials } = this.config.server.cors || {};
    
    const requestOrigin = req.headers.origin;
    
    if (origin === '*') {
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (Array.isArray(origin)) {
      if (requestOrigin && origin.includes(requestOrigin)) {
        res.setHeader('Access-Control-Allow-Origin', requestOrigin);
      }
    } else if (origin && requestOrigin === origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    if (credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  }

  /**
   * Parse request body
   */
  private parseBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';
      
      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve(parsed);
        } catch (error) {
          reject(new Error('Invalid JSON'));
        }
      });

      req.on('error', reject);
    });
  }

  /**
   * Send JSON response
   */
  private sendJSON(res: ServerResponse, status: number, data: any): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  /**
   * Send error response
   */
  private sendError(res: ServerResponse, status: number, message: string): void {
    this.sendJSON(res, status, {
      success: false,
      error: message
    });
  }

  /**
   * Get the SDK instance
   */
  getSDK(): AnalyticsSDK {
    return this.sdk;
  }
}