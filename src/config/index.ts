/**
 * Configuration Loader
 * Loads and validates configuration from environment variables
 */

import { ServerConfig } from "../types";
import { loadDatabaseConfigFromEnv, validateDatabaseConfig } from "./database";

export * from "./database";

/**
 * Load complete server configuration from environment variables
 */
export function loadServerConfig(): ServerConfig {
  // Load database configuration
  const database = loadDatabaseConfigFromEnv();
  validateDatabaseConfig(database);

  // Log helpful message for SQLite
  if (database.type === "sqlite" && isDebugEnabled()) {
    console.log(`Using SQLite database: ${database.connection?.filename}`);
    console.log(
      "Database file and directory will be created automatically if they don't exist",
    );
  }

  // Parse CORS configuration
  const corsOrigin = parseCorsOrigin(process.env.CORS_ORIGIN || "*");
  const corsMethods = parseArray(
    process.env.CORS_METHODS || "GET,POST,OPTIONS",
  );
  const corsAllowedHeaders = parseArray(
    process.env.CORS_ALLOWED_HEADERS || "Content-Type,X-API-Key",
  );
  const corsExposedHeaders = parseArray(process.env.CORS_EXPOSED_HEADERS || "");

  // Parse security configuration
  const apiKeys = parseArray(process.env.API_KEYS || "");
  const allowedIPs = parseArray(process.env.ALLOWED_IPS || "");
  const blockedIPs = parseArray(process.env.BLOCKED_IPS || "");

  const config: ServerConfig = {
    database,

    server: {
      port: parseInt(process.env.SERVER_PORT || "3000"),
      host: process.env.SERVER_HOST || "0.0.0.0",

      cors: {
        origin: corsOrigin,
        credentials: parseBoolean(process.env.CORS_CREDENTIALS, true),
        methods: corsMethods,
        allowedHeaders: corsAllowedHeaders,
        exposedHeaders:
          corsExposedHeaders.length > 0 ? corsExposedHeaders : undefined,
        maxAge: parseInt(process.env.CORS_MAX_AGE || "86400"),
      },

      security: {
        apiKeys: apiKeys.length > 0 ? apiKeys : undefined,
        allowedIPs: allowedIPs.length > 0 ? allowedIPs : undefined,
        blockedIPs: blockedIPs.length > 0 ? blockedIPs : undefined,
        trustProxy: parseBoolean(process.env.TRUST_PROXY, false),
        rateLimit: {
          windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000"),
          maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
        },
      },

      enableWebSocket: parseBoolean(process.env.ENABLE_WEBSOCKET, false),
    },

    analytics: {
      batchSize: parseInt(process.env.ANALYTICS_BATCH_SIZE || "100"),
      flushInterval: parseInt(process.env.ANALYTICS_FLUSH_INTERVAL || "5000"),
      enableRealtime: parseBoolean(
        process.env.ANALYTICS_ENABLE_REALTIME,
        false,
      ),
    },

    privacy: {
      enableGDPR: parseBoolean(process.env.ENABLE_GDPR, true),
      dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS || "90"),
      anonymizeIP: parseBoolean(process.env.ANONYMIZE_IP, true),
    },
  };

  return config;
}

/**
 * Parse CORS origin configuration
 * Supports: *, single origin, comma-separated list
 */
function parseCorsOrigin(
  value: string,
): string | string[] | ((origin: string) => boolean) {
  if (!value || value === "*") {
    return "*";
  }

  // Multiple origins
  if (value.includes(",")) {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Single origin
  return value;
}

/**
 * Parse comma-separated array
 */
function parseArray(value: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Parse boolean value from string
 */
function parseBoolean(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (value === undefined) return defaultValue;
  return value === "true" || value === "1" || value === "yes";
}

/**
 * Validate server configuration
 */
export function validateServerConfig(config: ServerConfig): void {
  // Validate database
  validateDatabaseConfig(config.database);

  // Validate server settings
  if (config.server) {
    if (
      config.server.port &&
      (config.server.port < 1 || config.server.port > 65535)
    ) {
      throw new Error("Server port must be between 1 and 65535");
    }

    if (config.analytics) {
      if (config.analytics.batchSize && config.analytics.batchSize < 1) {
        throw new Error("Analytics batch size must be at least 1");
      }

      if (
        config.analytics.flushInterval &&
        config.analytics.flushInterval < 100
      ) {
        throw new Error("Analytics flush interval must be at least 100ms");
      }
    }

    if (config.privacy) {
      if (
        config.privacy.dataRetentionDays &&
        config.privacy.dataRetentionDays < 1
      ) {
        throw new Error("Data retention days must be at least 1");
      }
    }
  }
}

/**
 * Load and validate environment variables
 * Call this early in your application to ensure all required env vars are set
 */
export function loadEnv(): void {
  try {
    // Try to load dotenv
    require("dotenv").config();
  } catch (error) {
    // dotenv not available, rely on system environment variables
    if (process.env.DEBUG === "true") {
      console.log("dotenv not available, using system environment variables");
    }
  }
}

/**
 * Get environment name
 */
export function getEnvironment(): string {
  return process.env.NODE_ENV || "development";
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getEnvironment() === "production";
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getEnvironment() === "development";
}

/**
 * Check if debug mode is enabled
 */
export function isDebugEnabled(): boolean {
  return process.env.DEBUG === "true";
}

/**
 * Print configuration summary (with sensitive data redacted)
 */
export function printConfigSummary(config: ServerConfig): void {
  console.log("=================================================");
  console.log("  REALTIME ANALYTICS SERVER CONFIGURATION");
  console.log("=================================================");
  console.log(`Environment: ${getEnvironment()}`);
  console.log(`Debug: ${isDebugEnabled()}`);
  console.log("");
  console.log("Database:");
  console.log(`  Type: ${config.database.type}`);

  if (config.database.type === "sqlite") {
    console.log(`  File: ${config.database.connection?.filename}`);
  } else if (config.database.type === "plaintext") {
    console.log(`  Directory: ${config.database.connection?.directory}`);
  } else if (config.database.type === "mongodb") {
    console.log(`  URI: ${sanitizeURI(config.database.connection?.uri || "")}`);
  } else {
    console.log(
      `  Host: ${config.database.connection?.host}:${config.database.connection?.port}`,
    );
    console.log(`  Database: ${config.database.connection?.database}`);
    console.log(
      `  Username: ${config.database.connection?.username || "(none)"}`,
    );
    console.log(
      `  Pool: min=${config.database.pool?.min}, max=${config.database.pool?.max}`,
    );
  }

  console.log("");
  console.log("Server:");
  console.log(`  Host: ${config.server?.host}`);
  console.log(`  Port: ${config.server?.port}`);
  console.log(
    `  WebSocket: ${config.server?.enableWebSocket ? "enabled" : "disabled"}`,
  );

  console.log("");
  console.log("CORS:");
  console.log(`  Origin: ${JSON.stringify(config.server?.cors?.origin)}`);
  console.log(`  Credentials: ${config.server?.cors?.credentials}`);
  console.log(`  Methods: ${config.server?.cors?.methods?.join(", ")}`);

  console.log("");
  console.log("Security:");
  console.log(
    `  API Keys: ${config.server?.security?.apiKeys?.length || 0} configured`,
  );
  console.log(
    `  Allowed IPs: ${config.server?.security?.allowedIPs?.length || 0} configured`,
  );
  console.log(
    `  Blocked IPs: ${config.server?.security?.blockedIPs?.length || 0} configured`,
  );
  console.log(`  Trust Proxy: ${config.server?.security?.trustProxy}`);
  console.log(
    `  Rate Limit: ${config.server?.security?.rateLimit?.maxRequests} req/${config.server?.security?.rateLimit?.windowMs}ms`,
  );

  console.log("");
  console.log("Analytics:");
  console.log(`  Batch Size: ${config.analytics?.batchSize}`);
  console.log(`  Flush Interval: ${config.analytics?.flushInterval}ms`);
  console.log(
    `  Realtime: ${config.analytics?.enableRealtime ? "enabled" : "disabled"}`,
  );

  console.log("");
  console.log("Privacy:");
  console.log(`  GDPR: ${config.privacy?.enableGDPR ? "enabled" : "disabled"}`);
  console.log(`  Data Retention: ${config.privacy?.dataRetentionDays} days`);
  console.log(
    `  Anonymize IP: ${config.privacy?.anonymizeIP ? "enabled" : "disabled"}`,
  );
  console.log("=================================================");
  console.log("");
}

/**
 * Sanitize URI for display (remove password)
 */
function sanitizeURI(uri: string): string {
  try {
    const url = new URL(uri);
    if (url.password) {
      url.password = "***";
    }
    return url.toString();
  } catch {
    return uri.replace(/:([^@:]+)@/, ":***@");
  }
}
