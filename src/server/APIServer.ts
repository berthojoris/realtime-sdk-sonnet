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
      origin?: string | string[] | ((origin: string) => boolean);
      credentials?: boolean;
      methods?: string[];
      allowedHeaders?: string[];
      exposedHeaders?: string[];
      maxAge?: number;
    };
    security?: {
      apiKeys?: string[];
      allowedIPs?: string[];
      blockedIPs?: string[];
      trustProxy?: boolean;
      rateLimit?: {
        windowMs?: number;
        maxRequests?: number;
      };
    };
    enableWebSocket?: boolean;
  };
}

export class AnalyticsAPIServer {
  private sdk: AnalyticsSDK;
  private config: APIServerConfig;
  private server: any;
  private wsClients: Set<any> = new Set();

  constructor(config: APIServerConfig) {
    // Set defaults first
    const defaultServer = {
      port: 3000,
      host: '0.0.0.0',
      cors: {
        origin: '*',
        credentials: true,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'X-API-Key'],
        exposedHeaders: [],
        maxAge: 86400 // 24 hours
      },
      security: {
        apiKeys: [],
        allowedIPs: [],
        blockedIPs: [],
        trustProxy: false,
        rateLimit: {
          windowMs: 60000, // 1 minute
          maxRequests: 100
        }
      },
      enableWebSocket: false
    };

    // Merge configs properly
    this.config = {
      ...config,
      server: {
        ...defaultServer,
        ...config.server,
        cors: {
          ...defaultServer.cors,
          ...config.server?.cors
        },
        security: {
          ...defaultServer.security,
          ...config.server?.security,
          rateLimit: {
            ...defaultServer.security.rateLimit,
            ...config.server?.security?.rateLimit
          }
        }
      }
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
      // Verify IP allowlist/blocklist
      if (!this.verifyIPAccess(req)) {
        this.sendError(res, 403, 'Forbidden: IP address not allowed');
        return;
      }

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
   * Get client IP address
   */
  private getClientIP(req: IncomingMessage): string {
    const security = this.config.server.security;
    
    // Trust proxy headers if enabled
    if (security?.trustProxy) {
      const forwarded = req.headers['x-forwarded-for'] as string;
      if (forwarded) {
        return forwarded.split(',')[0].trim();
      }
      
      const realIP = req.headers['x-real-ip'] as string;
      if (realIP) {
        return realIP;
      }
    }
    
    // Fall back to socket address
    return req.socket.remoteAddress || '';
  }

  /**
   * Verify IP access (allowlist/blocklist)
   */
  private verifyIPAccess(req: IncomingMessage): boolean {
    const security = this.config.server.security;
    
    // If no IP restrictions configured, allow all
    if (!security?.allowedIPs?.length && !security?.blockedIPs?.length) {
      return true;
    }

    const clientIP = this.getClientIP(req);
    
    // Check blocklist first
    if (security.blockedIPs && security.blockedIPs.length > 0) {
      if (this.matchIPPattern(clientIP, security.blockedIPs)) {
        return false;
      }
    }

    // If allowlist is configured, IP must be in it
    if (security.allowedIPs && security.allowedIPs.length > 0) {
      return this.matchIPPattern(clientIP, security.allowedIPs);
    }

    return true;
  }

  /**
   * Match IP against patterns (supports wildcards and CIDR)
   */
  private matchIPPattern(ip: string, patterns: string[]): boolean {
    // Normalize IPv6 addresses
    const normalizedIP = ip.replace(/^::ffff:/, '');
    
    for (const pattern of patterns) {
      // Exact match
      if (pattern === normalizedIP || pattern === ip) {
        return true;
      }

      // Wildcard match (e.g., "192.168.*" or "192.168.1.*")
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
        if (regex.test(normalizedIP)) {
          return true;
        }
      }

      // Simple CIDR support for common cases
      if (pattern.includes('/')) {
        const [network, bits] = pattern.split('/');
        const maskBits = parseInt(bits);
        
        // Simple IPv4 CIDR matching
        if (this.isIPv4(normalizedIP) && this.isIPv4(network)) {
          if (this.matchIPv4CIDR(normalizedIP, network, maskBits)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Check if IP is IPv4
   */
  private isIPv4(ip: string): boolean {
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
  }

  /**
   * Match IPv4 CIDR
   */
  private matchIPv4CIDR(ip: string, network: string, maskBits: number): boolean {
    const ipParts = ip.split('.').map(Number);
    const networkParts = network.split('.').map(Number);
    
    let mask = -1 << (32 - maskBits);
    
    for (let i = 0; i < 4; i++) {
      const ipByte = ipParts[i];
      const netByte = networkParts[i];
      const maskByte = (mask >> ((3 - i) * 8)) & 0xFF;
      
      if ((ipByte & maskByte) !== (netByte & maskByte)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Verify API key
   */
  private verifyApiKey(req: IncomingMessage): boolean {
    const security = this.config.server.security;
    
    // If no API keys configured, allow all requests
    if (!security?.apiKeys || security.apiKeys.length === 0) {
      return true;
    }

    const apiKey = req.headers['x-api-key'] as string;
    return security.apiKeys.includes(apiKey);
  }

  /**
   * Set CORS headers
   */
  private setCORSHeaders(req: IncomingMessage, res: ServerResponse): void {
    const cors = this.config.server.cors;
    if (!cors) return;
    
    const requestOrigin = req.headers.origin;
    
    // Handle origin
    let allowOrigin = false;
    if (cors.origin === '*') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      allowOrigin = true;
    } else if (typeof cors.origin === 'function') {
      if (requestOrigin && cors.origin(requestOrigin)) {
        res.setHeader('Access-Control-Allow-Origin', requestOrigin);
        allowOrigin = true;
      }
    } else if (Array.isArray(cors.origin)) {
      if (requestOrigin && cors.origin.includes(requestOrigin)) {
        res.setHeader('Access-Control-Allow-Origin', requestOrigin);
        allowOrigin = true;
      }
    } else if (cors.origin && requestOrigin === cors.origin) {
      res.setHeader('Access-Control-Allow-Origin', cors.origin);
      allowOrigin = true;
    }

    // Only set other CORS headers if origin is allowed
    if (allowOrigin) {
      if (cors.credentials) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }

      if (cors.methods && cors.methods.length > 0) {
        res.setHeader('Access-Control-Allow-Methods', cors.methods.join(', '));
      }

      if (cors.allowedHeaders && cors.allowedHeaders.length > 0) {
        res.setHeader('Access-Control-Allow-Headers', cors.allowedHeaders.join(', '));
      }

      if (cors.exposedHeaders && cors.exposedHeaders.length > 0) {
        res.setHeader('Access-Control-Expose-Headers', cors.exposedHeaders.join(', '));
      }

      if (cors.maxAge) {
        res.setHeader('Access-Control-Max-Age', cors.maxAge.toString());
      }
    }
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