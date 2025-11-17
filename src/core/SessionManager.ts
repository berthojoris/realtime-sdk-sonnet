/**
 * Session Manager
 * Handles user session tracking and management
 */

import { v4 as uuidv4 } from 'uuid';
import { Session, User, DatabaseAdapter } from '../types';

export interface SessionManagerConfig {
  sessionTimeout?: number; // in milliseconds
  persistSessions?: boolean;
}

export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private users: Map<string, User> = new Map();
  private config: SessionManagerConfig;
  private adapter?: DatabaseAdapter;
  private sessionTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: SessionManagerConfig = {}, adapter?: DatabaseAdapter) {
    this.config = {
      sessionTimeout: config.sessionTimeout || 30 * 60 * 1000, // 30 minutes default
      persistSessions: config.persistSessions !== false
    };
    this.adapter = adapter;
  }

  /**
   * Create or get a session
   */
  async getOrCreateSession(userId?: string, anonymousId?: string): Promise<Session> {
    const actualAnonymousId = anonymousId || this.generateAnonymousId();
    
    // Check if user has an active session
    const existingSession = this.findActiveSession(userId, actualAnonymousId);
    
    if (existingSession) {
      await this.updateSessionActivity(existingSession.id);
      return existingSession;
    }

    // Create new session
    const session: Session = {
      id: uuidv4(),
      userId,
      anonymousId: actualAnonymousId,
      startTime: Date.now(),
      lastActivityTime: Date.now(),
      eventCount: 0
    };

    this.sessions.set(session.id, session);

    // Persist to database if configured
    if (this.config.persistSessions && this.adapter) {
      await this.adapter.saveSession(session);
    }

    // Set session timeout
    this.setSessionTimeout(session.id);

    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    // Check in-memory first
    let session = this.sessions.get(sessionId);
    
    if (session) {
      return session;
    }

    // Check database if adapter is available
    if (this.adapter) {
      const dbSession = await this.adapter.getSession(sessionId);
      
      if (dbSession) {
        this.sessions.set(sessionId, dbSession);
        return dbSession;
      }
    }

    return null;
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      return;
    }

    session.lastActivityTime = Date.now();
    session.eventCount++;

    this.sessions.set(sessionId, session);

    // Update in database
    if (this.config.persistSessions && this.adapter) {
      await this.adapter.updateSession(sessionId, {
        lastActivityTime: session.lastActivityTime,
        eventCount: session.eventCount
      });
    }

    // Reset session timeout
    this.clearSessionTimeout(sessionId);
    this.setSessionTimeout(sessionId);
  }

  /**
   * End a session
   */
  async endSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      return;
    }

    session.endTime = Date.now();

    // Update in database
    if (this.config.persistSessions && this.adapter) {
      await this.adapter.updateSession(sessionId, {
        endTime: session.endTime
      });
    }

    // Clear timeout and remove from memory
    this.clearSessionTimeout(sessionId);
    this.sessions.delete(sessionId);
  }

  /**
   * Create or update a user
   */
  async identifyUser(userId: string, anonymousId: string, traits?: Record<string, any>): Promise<User> {
    let user = this.users.get(anonymousId);

    if (user) {
      user.id = userId;
      user.traits = { ...user.traits, ...traits };
      user.updatedAt = Date.now();
    } else {
      user = {
        id: userId,
        anonymousId,
        traits,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    }

    this.users.set(anonymousId, user);

    // Persist to database
    if (this.adapter) {
      await this.adapter.saveUser(user);
    }

    return user;
  }

  /**
   * Get user by ID or anonymous ID
   */
  async getUser(userId: string): Promise<User | null> {
    // Check in-memory first
    let user = this.users.get(userId);
    
    if (user) {
      return user;
    }

    // Check database if adapter is available
    if (this.adapter) {
      const dbUser = await this.adapter.getUser(userId);
      
      if (dbUser) {
        this.users.set(dbUser.anonymousId, dbUser);
        return dbUser;
      }
    }

    return null;
  }

  /**
   * Update user consent
   */
  async updateUserConsent(
    anonymousId: string,
    consent: { analytics: boolean; marketing?: boolean; necessary?: boolean }
  ): Promise<void> {
    let user = await this.getUser(anonymousId);

    if (!user) {
      user = {
        anonymousId,
        consent,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    } else {
      user.consent = consent;
      user.updatedAt = Date.now();
    }

    this.users.set(anonymousId, user);

    // Persist to database
    if (this.adapter) {
      await this.adapter.saveUser(user);
    }
  }

  /**
   * Generate anonymous ID
   */
  private generateAnonymousId(): string {
    return uuidv4();
  }

  /**
   * Find active session for user
   */
  private findActiveSession(userId?: string, anonymousId?: string): Session | null {
    const now = Date.now();

    for (const session of this.sessions.values()) {
      // Skip ended sessions
      if (session.endTime) {
        continue;
      }

      // Check if session is still active (not timed out)
      const isActive = (now - session.lastActivityTime) < this.config.sessionTimeout!;
      
      if (!isActive) {
        continue;
      }

      // Match by userId or anonymousId
      if (userId && session.userId === userId) {
        return session;
      }

      if (anonymousId && session.anonymousId === anonymousId) {
        return session;
      }
    }

    return null;
  }

  /**
   * Set session timeout
   */
  private setSessionTimeout(sessionId: string): void {
    const timeout = setTimeout(() => {
      this.endSession(sessionId);
    }, this.config.sessionTimeout!);

    this.sessionTimeouts.set(sessionId, timeout);
  }

  /**
   * Clear session timeout
   */
  private clearSessionTimeout(sessionId: string): void {
    const timeout = this.sessionTimeouts.get(sessionId);
    
    if (timeout) {
      clearTimeout(timeout);
      this.sessionTimeouts.delete(sessionId);
    }
  }

  /**
   * Clean up all sessions and timeouts
   */
  cleanup(): void {
    // Clear all timeouts
    this.sessionTimeouts.forEach(timeout => clearTimeout(timeout));
    this.sessionTimeouts.clear();
    
    // Clear all sessions
    this.sessions.clear();
    this.users.clear();
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    const now = Date.now();
    let count = 0;

    for (const session of this.sessions.values()) {
      if (!session.endTime && (now - session.lastActivityTime) < this.config.sessionTimeout!) {
        count++;
      }
    }

    return count;
  }
}