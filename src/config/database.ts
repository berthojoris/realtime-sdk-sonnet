/**
 * Database Configuration Parser
 * Parses DATABASE_URL connection strings and creates DatabaseConfig objects
 */

import { DatabaseConfig } from "../types";

export interface ParsedDatabaseConfig extends DatabaseConfig {
  // Additional metadata from parsing
  connectionString?: string;
}

/**
 * Parse a database connection string URL into a DatabaseConfig object
 *
 * Supported formats:
 * - sqlite://path/to/database.db
 * - mysql://username:password@host:port/database
 * - postgresql://username:password@host:port/database
 * - mongodb://username:password@host:port/database
 * - mongodb+srv://username:password@cluster.mongodb.net/database
 * - plaintext://path/to/directory
 *
 * @param connectionString - The database connection string URL
 * @param options - Additional options like pool settings
 * @returns DatabaseConfig object
 */
export function parseDatabaseURL(
  connectionString: string,
  options?: {
    poolMin?: number;
    poolMax?: number;
    options?: Record<string, any>;
  },
): ParsedDatabaseConfig {
  if (!connectionString) {
    throw new Error("Database connection string is required");
  }

  try {
    // Handle different URL formats
    let url: URL;

    // Special handling for SQLite and Plaintext which use file paths
    if (connectionString.startsWith("sqlite://")) {
      return parseSQLiteURL(connectionString, options);
    } else if (connectionString.startsWith("plaintext://")) {
      return parsePlaintextURL(connectionString, options);
    }

    // Parse standard URL format for other databases
    url = new URL(connectionString);

    const protocol = url.protocol.replace(":", "");

    switch (protocol) {
      case "mysql":
        return parseMySQLURL(url, options);

      case "postgresql":
      case "postgres":
        return parsePostgreSQLURL(url, options);

      case "mongodb":
      case "mongodb+srv":
        return parseMongoDBURL(url, connectionString, options);

      default:
        throw new Error(`Unsupported database type: ${protocol}`);
    }
  } catch (error: any) {
    throw new Error(`Failed to parse database URL: ${error.message}`);
  }
}

/**
 * Parse SQLite connection string
 * Format: sqlite://path/to/database.db or sqlite:///absolute/path/to/database.db
 */
function parseSQLiteURL(
  connectionString: string,
  options?: any,
): ParsedDatabaseConfig {
  // Remove protocol
  let path = connectionString.replace(/^sqlite:\/\//, "");

  // Handle absolute paths (sqlite:///absolute/path)
  if (connectionString.startsWith("sqlite:///")) {
    path = connectionString.replace(/^sqlite:\/\//, "");
  }

  // Ensure directory exists for the database file
  ensureSQLiteDirectory(path);

  return {
    type: "sqlite",
    connection: {
      filename: path,
    },
    options: options?.options || {},
    connectionString,
  };
}

/**
 * Ensure the directory for SQLite database file exists
 */
function ensureSQLiteDirectory(filePath: string): void {
  try {
    const path = require("path");
    const fs = require("fs");

    // Normalize path (handle both forward and backward slashes)
    const normalizedPath = path.normalize(filePath);

    // Get directory path
    const dir = path.dirname(normalizedPath);

    // Skip if it's current directory
    if (dir === "." || dir === "") {
      return;
    }

    // Create directory recursively if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✓ Created directory for SQLite database: ${dir}`);
    }
  } catch (error: any) {
    console.warn(
      `Warning: Could not create directory for SQLite database: ${error.message}`,
    );
  }
}

/**
 * Parse Plaintext connection string
 * Format: plaintext://path/to/directory
 */
function parsePlaintextURL(
  connectionString: string,
  options?: any,
): ParsedDatabaseConfig {
  const path = connectionString.replace(/^plaintext:\/\//, "");

  // Ensure directory exists
  ensurePlaintextDirectory(path);

  return {
    type: "plaintext",
    connection: {
      directory: path,
    },
    options: options?.options || {},
    connectionString,
  };
}

/**
 * Ensure the directory for Plaintext storage exists
 */
function ensurePlaintextDirectory(dirPath: string): void {
  try {
    const fs = require("fs");

    // Create directory recursively if it doesn't exist
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✓ Created directory for Plaintext storage: ${dirPath}`);
    }
  } catch (error: any) {
    console.warn(
      `Warning: Could not create directory for Plaintext storage: ${error.message}`,
    );
  }
}

/**
 * Parse MySQL connection string
 * Format: mysql://username:password@host:port/database
 */
function parseMySQLURL(url: URL, options?: any): ParsedDatabaseConfig {
  const config: ParsedDatabaseConfig = {
    type: "mysql",
    connection: {
      host: url.hostname,
      port: url.port ? parseInt(url.port) : 3306,
      database: url.pathname.replace(/^\//, ""),
      username: url.username || undefined,
      password: url.password || undefined,
    },
    pool: {
      min: options?.poolMin || 2,
      max: options?.poolMax || 10,
    },
    options: options?.options || {},
    connectionString: sanitizeConnectionString(url.toString()),
  };

  // Parse query parameters as additional options
  url.searchParams.forEach((value, key) => {
    if (config.options) {
      config.options[key] = parseValue(value);
    }
  });

  return config;
}

/**
 * Parse PostgreSQL connection string
 * Format: postgresql://username:password@host:port/database
 */
function parsePostgreSQLURL(url: URL, options?: any): ParsedDatabaseConfig {
  const config: ParsedDatabaseConfig = {
    type: "postgresql",
    connection: {
      host: url.hostname,
      port: url.port ? parseInt(url.port) : 5432,
      database: url.pathname.replace(/^\//, ""),
      username: url.username || undefined,
      password: url.password || undefined,
    },
    pool: {
      min: options?.poolMin || 2,
      max: options?.poolMax || 10,
    },
    options: options?.options || {},
    connectionString: sanitizeConnectionString(url.toString()),
  };

  // Parse query parameters as additional options
  url.searchParams.forEach((value, key) => {
    if (config.options) {
      config.options[key] = parseValue(value);
    }
  });

  return config;
}

/**
 * Parse MongoDB connection string
 * Format: mongodb://username:password@host:port/database
 * or mongodb+srv://username:password@cluster.mongodb.net/database
 */
function parseMongoDBURL(
  url: URL,
  originalConnectionString: string,
  options?: any,
): ParsedDatabaseConfig {
  // MongoDB uses the full URI for connection
  const config: ParsedDatabaseConfig = {
    type: "mongodb",
    connection: {
      uri: originalConnectionString,
      database: url.pathname.replace(/^\//, "").split("?")[0],
    },
    options: options?.options || {},
    connectionString: sanitizeConnectionString(originalConnectionString),
  };

  return config;
}

/**
 * Parse value to appropriate type
 */
function parseValue(value: string): any {
  // Boolean
  if (value === "true") return true;
  if (value === "false") return false;

  // Number
  if (/^\d+$/.test(value)) return parseInt(value);
  if (/^\d+\.\d+$/.test(value)) return parseFloat(value);

  // String
  return value;
}

/**
 * Sanitize connection string for logging (remove passwords)
 */
function sanitizeConnectionString(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    if (url.password) {
      url.password = "***";
    }
    return url.toString();
  } catch {
    return connectionString.replace(/:([^@:]+)@/, ":***@");
  }
}

/**
 * Load database configuration from environment variables
 */
export function loadDatabaseConfigFromEnv(): ParsedDatabaseConfig {
  const databaseURL = process.env.DATABASE_URL;
  const databaseType = process.env.DATABASE_TYPE;

  if (!databaseURL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  // Verify DATABASE_TYPE matches the URL if both are provided
  if (databaseType) {
    const urlType = databaseURL.split("://")[0].replace("+srv", "");
    const normalizedType =
      databaseType === "postgres" ? "postgresql" : databaseType;
    const normalizedUrlType = urlType === "postgres" ? "postgresql" : urlType;

    if (normalizedType !== normalizedUrlType) {
      console.warn(
        `DATABASE_TYPE (${databaseType}) doesn't match DATABASE_URL protocol (${urlType}). Using DATABASE_URL.`,
      );
    }
  }

  // Parse pool settings from environment
  const poolMin = process.env.DATABASE_POOL_MIN
    ? parseInt(process.env.DATABASE_POOL_MIN)
    : undefined;
  const poolMax = process.env.DATABASE_POOL_MAX
    ? parseInt(process.env.DATABASE_POOL_MAX)
    : undefined;

  return parseDatabaseURL(databaseURL, {
    poolMin,
    poolMax,
  });
}

/**
 * Validate database configuration
 */
export function validateDatabaseConfig(config: DatabaseConfig): void {
  if (!config.type) {
    throw new Error("Database type is required");
  }

  const validTypes = ["mysql", "postgresql", "mongodb", "sqlite", "plaintext"];
  if (!validTypes.includes(config.type)) {
    throw new Error(
      `Invalid database type: ${config.type}. Must be one of: ${validTypes.join(", ")}`,
    );
  }

  // Type-specific validation
  switch (config.type) {
    case "mysql":
    case "postgresql":
      if (!config.connection?.host) {
        throw new Error(`${config.type} requires connection.host`);
      }
      if (!config.connection?.database) {
        throw new Error(`${config.type} requires connection.database`);
      }
      break;

    case "mongodb":
      if (!config.connection?.uri && !config.connection?.host) {
        throw new Error("MongoDB requires connection.uri or connection.host");
      }
      break;

    case "sqlite":
      if (!config.connection?.filename) {
        throw new Error("SQLite requires connection.filename");
      }
      break;

    case "plaintext":
      if (!config.connection?.directory) {
        throw new Error("Plaintext requires connection.directory");
      }
      break;
  }
}

/**
 * Create a database connection string from DatabaseConfig
 * (reverse of parseDatabaseURL)
 */
export function createConnectionString(config: DatabaseConfig): string {
  switch (config.type) {
    case "sqlite":
      return `sqlite://${config.connection?.filename || "./analytics.db"}`;

    case "plaintext":
      return `plaintext://${config.connection?.directory || "./data"}`;

    case "mysql":
    case "postgresql": {
      const protocol = config.type === "mysql" ? "mysql" : "postgresql";
      const host = config.connection?.host || "localhost";
      const port =
        config.connection?.port || (config.type === "mysql" ? 3306 : 5432);
      const database = config.connection?.database || "analytics";
      const username = config.connection?.username || "";
      const password = config.connection?.password || "";

      const auth = username
        ? `${username}${password ? ":" + password : ""}@`
        : "";
      return `${protocol}://${auth}${host}:${port}/${database}`;
    }

    case "mongodb":
      return config.connection?.uri || "mongodb://localhost:27017/analytics";

    default:
      throw new Error(
        `Cannot create connection string for type: ${config.type}`,
      );
  }
}
