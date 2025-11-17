# Project Structure

Complete overview of the Real-time Analytics SDK project structure.

## Directory Structure

```
realtime-analytics-sdk/
├── src/                          # Source code
│   ├── types/                    # TypeScript type definitions
│   │   └── index.ts             # Core types and interfaces
│   ├── adapters/                 # Database adapters
│   │   ├── BaseAdapter.ts       # Abstract base adapter
│   │   ├── MongoDBAdapter.ts    # MongoDB implementation
│   │   ├── MySQLAdapter.ts      # MySQL implementation
│   │   ├── PostgreSQLAdapter.ts # PostgreSQL implementation
│   │   ├── SQLiteAdapter.ts     # SQLite implementation
│   │   ├── PlaintextAdapter.ts  # File-based storage (JSON/CSV)
│   │   └── index.ts             # Adapter exports and factory
│   ├── core/                     # Core SDK components
│   │   ├── AnalyticsSDK.ts      # Main SDK class
│   │   ├── SessionManager.ts    # Session management
│   │   ├── BatchProcessor.ts    # Event batching and retry
│   │   └── EventEmitter.ts      # Real-time streaming
│   └── index.ts                  # Main export file
├── examples/                     # Usage examples
│   ├── basic-usage.ts           # Basic SDK usage
│   ├── multi-database.ts        # Multi-database examples
│   ├── realtime-streaming.ts    # Real-time streaming
│   ├── user-identification.ts   # User tracking
│   ├── gdpr-privacy.ts          # GDPR compliance
│   ├── analytics-dashboard.ts   # Analytics queries
│   └── batch-processing.ts      # Batch processing
├── docs/                         # Documentation
│   └── API.md                   # Complete API reference
├── dist/                         # Compiled output (generated)
├── README.md                     # Main documentation
├── GETTING_STARTED.md           # Quick start guide
├── CHANGELOG.md                 # Version history
├── LICENSE                      # MIT License
├── PROJECT_STRUCTURE.md         # This file
├── package.json                 # Package configuration
├── tsconfig.json                # TypeScript configuration
└── .gitignore                   # Git ignore rules
```

## Core Components

### 1. Types (`src/types/`)

**Purpose**: Define all TypeScript interfaces and types used throughout the SDK.

**Key Types**:
- `AnalyticsEvent` - Event data structure
- `Session` - User session data
- `User` - User profile and consent
- `EventFilter` - Query filters
- `EventStats` - Analytics statistics
- `DatabaseAdapter` - Database interface
- `ServerConfig` - SDK configuration

### 2. Database Adapters (`src/adapters/`)

**Purpose**: Provide abstracted database access for multiple storage backends.

**Adapters**:
- **BaseAdapter**: Abstract base class with common functionality
- **MongoDBAdapter**: MongoDB with aggregation support
- **MySQLAdapter**: MySQL with connection pooling
- **PostgreSQLAdapter**: PostgreSQL with JSONB
- **SQLiteAdapter**: Embedded SQLite database
- **PlaintextAdapter**: File-based storage (JSONL/CSV)

**Features**:
- Unified interface across all databases
- Automatic schema creation
- Index optimization
- Connection pooling
- Error handling

### 3. Core SDK (`src/core/`)

**AnalyticsSDK** (`AnalyticsSDK.ts`)
- Main SDK class
- Event tracking
- User identification
- Statistics and queries
- GDPR compliance
- Lifecycle management

**SessionManager** (`SessionManager.ts`)
- Session creation and management
- User identification
- Consent management
- Automatic session timeouts
- Session persistence

**BatchProcessor** (`BatchProcessor.ts`)
- Event batching
- Automatic retry logic
- Queue management
- Configurable flush intervals
- Error handling

**RealtimeEventEmitter** (`EventEmitter.ts`)
- Real-time event broadcasting
- WebSocket support
- Subscriber management
- Event streaming
- Stats broadcasting

## Database Support

### MongoDB
- **File**: `MongoDBAdapter.ts`
- **Features**: Aggregations, indexes, document storage
- **Best For**: Flexible schema, high write throughput

### MySQL
- **File**: `MySQLAdapter.ts`
- **Features**: ACID transactions, JSON storage, connection pooling
- **Best For**: Relational data, strong consistency

### PostgreSQL
- **File**: `PostgreSQLAdapter.ts`
- **Features**: JSONB, advanced queries, full-text search
- **Best For**: Complex queries, PostgreSQL ecosystem

### SQLite
- **File**: `SQLiteAdapter.ts`
- **Features**: Embedded database, WAL mode, zero configuration
- **Best For**: Development, small deployments, edge computing

### Plaintext
- **File**: `PlaintextAdapter.ts`
- **Features**: JSONL and CSV formats, no dependencies
- **Best For**: Simple deployments, data portability, debugging

## Features Overview

### Event Tracking
- 9 pre-defined event types
- Custom event support
- Rich event context (page, browser, device)
- Metadata support
- Event validation

### Session Management
- Automatic session creation
- Configurable timeouts
- Session persistence
- Multi-device support
- Anonymous to identified user migration

### User Identification
- Anonymous tracking
- User identification
- Trait management
- Consent tracking
- Privacy controls

### Real-time Streaming
- WebSocket support
- Event broadcasting
- Stats streaming
- Custom subscribers
- Connection management

### Privacy & GDPR
- Consent management
- PII sanitization
- Data retention policies
- Right to be forgotten
- Data export

### Analytics & Reporting
- Event counting and aggregation
- Unique user/session tracking
- Event type distribution
- Time-based filtering
- Custom queries

### Batch Processing
- Configurable batch size
- Automatic retry logic
- Queue management
- Flush control
- Error handling

## Configuration

### Database Configuration
- Type selection
- Connection settings
- Pool configuration
- Custom options

### Analytics Configuration
- Batch size
- Flush interval
- Real-time streaming
- Performance tuning

### Privacy Configuration
- GDPR compliance
- Data retention
- IP anonymization
- Consent requirements

## Examples

### Basic Usage
**File**: `examples/basic-usage.ts`
- SDK initialization
- Event tracking
- Basic queries
- Shutdown

### Multi-Database
**File**: `examples/multi-database.ts`
- MongoDB setup
- MySQL setup
- PostgreSQL setup
- SQLite setup
- Plaintext setup

### Real-time Streaming
**File**: `examples/realtime-streaming.ts`
- Event emitter usage
- WebSocket integration
- Real-time analytics
- Subscriber management

### User Identification
**File**: `examples/user-identification.ts`
- Anonymous tracking
- User identification
- Trait updates
- Session tracking

### GDPR & Privacy
**File**: `examples/gdpr-privacy.ts`
- Consent management
- Data retention
- Event filtering
- Privacy controls

### Analytics Dashboard
**File**: `examples/analytics-dashboard.ts`
- Statistics retrieval
- Event queries
- Top pages analysis
- User metrics

### Batch Processing
**File**: `examples/batch-processing.ts`
- Individual tracking
- Batch tracking
- High-volume events
- Performance optimization

## Documentation

### README.md
- Feature overview
- Installation guide
- Quick start
- Configuration examples
- API reference
- Usage examples
- TypeScript support
- Performance tips

### GETTING_STARTED.md
- 5-minute quick start
- Common use cases
- Database setup
- Best practices
- Troubleshooting
- Next steps

### docs/API.md
- Complete API reference
- All classes and methods
- Type definitions
- Code examples
- Error types

### CHANGELOG.md
- Version history
- Feature additions
- Breaking changes
- Planned features

## Dependencies

### Production
- `eventemitter3`: Event emitter
- `uuid`: ID generation

### Peer Dependencies (Optional)
- `mongodb`: MongoDB driver
- `mysql2`: MySQL driver
- `pg`: PostgreSQL driver
- `better-sqlite3`: SQLite driver

### Development
- `typescript`: TypeScript compiler
- `@types/node`: Node.js types
- `@types/uuid`: UUID types

## Build & Development

### Build
```bash
npm run build
```

### Development
```bash
npm run dev
```

### Testing
```bash
npm test
```

## Key Design Decisions

1. **Database Agnostic**: Adapter pattern allows easy addition of new databases
2. **TypeScript First**: Full type safety and autocomplete
3. **Privacy by Design**: GDPR compliance built-in from the start
4. **Performance**: Batch processing and connection pooling
5. **Real-time**: Optional WebSocket streaming for live analytics
6. **Extensible**: Plugin-ready architecture for future enhancements

## Future Enhancements

- Redis caching layer
- Event replay
- A/B testing support
- Funnel analysis
- Cohort analysis
- Dashboard UI
- Webhook notifications
- Rate limiting
- Event sampling

## License

MIT License - See LICENSE file for details

---

**Version**: 1.0.0  
**Last Updated**: 2024-01-16