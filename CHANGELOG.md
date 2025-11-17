# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-16

### Added

#### Core Features
- **Multi-Database Support**: Support for MySQL, PostgreSQL, MongoDB, SQLite, and Plaintext (JSON/CSV) storage
- **Real-time Streaming**: WebSocket-based real-time event broadcasting with subscriber management
- **Event Tracking**: Comprehensive event tracking system with pre-defined and custom event types
- **Session Management**: Automatic session handling with configurable timeouts and persistence
- **User Identification**: User tracking with traits and anonymous ID management
- **Batch Processing**: Efficient event batching with configurable batch size and flush intervals
- **Privacy Controls**: Built-in GDPR compliance with consent management
- **Data Retention**: Configurable data retention policies with automatic cleanup

#### Database Adapters
- MongoDB adapter with full aggregation support
- MySQL adapter with connection pooling
- PostgreSQL adapter with JSONB support
- SQLite adapter for embedded analytics
- Plaintext adapter supporting JSONL and CSV formats
- Base adapter with common functionality and validation

#### Analytics Features
- Event statistics and aggregations
- Unique user and session counting
- Event filtering by type, time range, user, and session
- Time-based analytics queries
- Event type distribution analysis

#### Privacy & Compliance
- GDPR consent management system
- PII sanitization
- IP address anonymization
- Configurable data retention
- User data export capabilities
- Right to be forgotten support

#### Developer Experience
- Full TypeScript support with comprehensive type definitions
- Extensive documentation and examples
- Easy-to-use API
- Error handling with custom error types
- Automatic database schema creation
- Connection pooling support

### Examples
- Basic usage example
- Multi-database configuration examples
- Real-time streaming example
- User identification and tracking
- GDPR and privacy compliance
- Analytics dashboard
- Batch processing demonstrations

### Documentation
- Comprehensive README with API reference
- Migration guide from other analytics solutions
- TypeScript support documentation
- Performance optimization guidelines
- Testing examples

## [Unreleased]

### Planned Features
- Redis caching layer
- Event replay capability
- A/B testing support
- Funnel analysis
- Cohort analysis
- Real-time dashboard UI
- Data export to CSV/JSON
- Webhook notifications
- Rate limiting per client
- Event sampling for high-volume scenarios