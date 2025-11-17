# Complete Setup & Configuration Guide

Complete guide to setting up and configuring the Realtime Analytics Server with environment-based database configuration.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Installation](#installation)
3. [Database Setup](#database-setup)
4. [Configuration Reference](#configuration-reference)
5. [SQLite Auto-Create Feature](#sqlite-auto-create-feature)
6. [Running Migrations](#running-migrations)
7. [Starting the Server](#starting-the-server)
8. [Verification & Testing](#verification--testing)
9. [Features Overview](#features-overview)
10. [Troubleshooting](#troubleshooting)
11. [Production Deployment](#production-deployment)

---

## Quick Start

**Zero-configuration setup with SQLite (recommended for development):**

```bash
# 1. Install dependencies
npm install

# 2. That's it! Run migrations and start
npm run migrate:up
npm start

# Server runs at http://localhost:3000
# Database: ./analytics.db (created automatically)
```

**That's all you need to get started!**

---

## Installation

### Prerequisites

- Node.js 18+ and npm
- A database (SQLite requires no server, others need setup)

### Install Dependencies

```bash
npm install
```

### Install Database Driver

Install only the driver you need:

```bash
# SQLite (recommended for development - zero setup required)
npm install better-sqlite3

# MySQL (production-ready)
npm install mysql2

# PostgreSQL (advanced features)
npm install pg

# MongoDB (NoSQL flexibility)
npm install mongodb
```

---

## Database Setup

### Option 1: SQLite ⭐ (Recommended for Development)

**✅ Zero setup required!** SQLite uses a local file and creates directories automatically.

```bash
# In .env
DATABASE_TYPE=sqlite
DATABASE_URL=sqlite://./analytics.db
```

**Auto-Create Feature:** Directories are created automatically! See [SQLite Auto-Create](#sqlite-auto-create-feature) section below.

**Features:**
- ✅ No database server needed
- ✅ Automatic directory creation
- ✅ Perfect for development
- ✅ File-based storage
- ✅ Zero configuration

### Option 2: MySQL (Production)

**Using Docker:**
```bash
docker run --name mysql-analytics \
  -e MYSQL_ROOT_PASSWORD=SecurePass123 \
  -e MYSQL_DATABASE=analytics \
  -p 3306:3306 \
  -d mysql:8
```

**Manual Installation:**
```bash
# Install MySQL server
sudo apt-get install mysql-server  # Ubuntu/Debian
brew install mysql                  # macOS

# Create database
mysql -u root -p
CREATE DATABASE analytics;
CREATE USER 'analytics_user'@'localhost' IDENTIFIED BY 'SecurePass123';
GRANT ALL PRIVILEGES ON analytics.* TO 'analytics_user'@'localhost';
FLUSH PRIVILEGES;
```

**Configuration:**
```bash
# In .env
DATABASE_TYPE=mysql
DATABASE_URL=mysql://analytics_user:SecurePass123@localhost:3306/analytics
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
```

**Features:**
- ✅ Production-ready
- ✅ ACID compliant
- ✅ Connection pooling
- ✅ Great for structured data

### Option 3: PostgreSQL (Advanced)

**Using Docker:**
```bash
docker run --name postgres-analytics \
  -e POSTGRES_PASSWORD=SecurePass123 \
  -e POSTGRES_DB=analytics \
  -p 5432:5432 \
  -d postgres:15
```

**Manual Installation:**
```bash
# Install PostgreSQL
sudo apt-get install postgresql  # Ubuntu/Debian
brew install postgresql          # macOS

# Create database and user
sudo -u postgres psql
CREATE DATABASE analytics;
CREATE USER analytics_user WITH PASSWORD 'SecurePass123';
GRANT ALL PRIVILEGES ON DATABASE analytics TO analytics_user;
```

**Configuration:**
```bash
# In .env
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://analytics_user:SecurePass123@localhost:5432/analytics
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
```

**Features:**
- ✅ Advanced SQL features
- ✅ JSONB support
- ✅ Excellent performance
- ✅ Great for complex queries

### Option 4: MongoDB (NoSQL)

**Using Docker:**
```bash
docker run --name mongo-analytics \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=SecurePass123 \
  -p 27017:27017 \
  -d mongo:7
```

**Using MongoDB Atlas (Cloud):**
1. Create account at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a cluster
3. Get connection string from "Connect" → "Connect your application"

**Configuration:**

Local:
```bash
DATABASE_TYPE=mongodb
DATABASE_URL=mongodb://admin:SecurePass123@localhost:27017/analytics?authSource=admin
```

Atlas (Cloud):
```bash
DATABASE_TYPE=mongodb
DATABASE_URL=mongodb+srv://username:password@cluster0.mongodb.net/analytics
```

**Features:**
- ✅ NoSQL flexibility
- ✅ Horizontal scaling
- ✅ Cloud-ready (Atlas)
- ✅ Great for unstructured data

### Database Comparison

| Database | Setup | Auto-Create | Migrations | Pooling | Production | Best For |
|----------|-------|-------------|------------|---------|------------|----------|
| **SQLite** | None | ✅ Yes | ✅ Yes | N/A | Dev/Small | Development, prototypes |
| **MySQL** | Server | N/A | ✅ Yes | ✅ Yes | ✅ Yes | Traditional web apps |
| **PostgreSQL** | Server | N/A | ✅ Yes | ✅ Yes | ✅ Yes | Complex queries, analytics |
| **MongoDB** | Server | N/A | ✅ Yes | ✅ Yes | ✅ Yes | Flexible schema, real-time |

---

## Configuration Reference

### Environment Variables

Edit `.env` to configure your server:

```bash
cp .env.example .env
nano .env  # or use your favorite editor
```

### Database Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `DATABASE_TYPE` | Database type | `sqlite` | `mysql`, `postgresql`, `mongodb`, `sqlite` |
| `DATABASE_URL` | Connection string | **Required** | `sqlite://./analytics.db` |
| `DATABASE_POOL_MIN` | Min pool connections | `2` | `5` |
| `DATABASE_POOL_MAX` | Max pool connections | `10` | `20` |

### Connection String Formats

```bash
# SQLite - any path, directories created automatically
DATABASE_URL=sqlite://./data/production/analytics.db

# MySQL
DATABASE_URL=mysql://user:pass@host:3306/database

# PostgreSQL
DATABASE_URL=postgresql://user:pass@host:5432/database

# MongoDB (standard)
DATABASE_URL=mongodb://user:pass@host:27017/database

# MongoDB (Atlas/SRV)
DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/database
```

### Server Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVER_PORT` | HTTP server port | `3000` |
| `SERVER_HOST` | Bind address | `0.0.0.0` |
| `NODE_ENV` | Environment | `production` |
| `DEBUG` | Enable debug logging | `false` |

### CORS Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `CORS_ORIGIN` | Allowed origins (comma-separated) | `*` |
| `CORS_CREDENTIALS` | Allow credentials | `true` |
| `CORS_METHODS` | Allowed HTTP methods | `GET,POST,OPTIONS` |
| `CORS_ALLOWED_HEADERS` | Allowed headers | `Content-Type,X-API-Key` |
| `CORS_MAX_AGE` | Preflight cache time (seconds) | `86400` |

### Security Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `API_KEYS` | API keys (comma-separated) | (empty) | `key1,key2,key3` |
| `ALLOWED_IPS` | IP allowlist (CIDR/wildcards) | (empty) | `192.168.1.0/24,10.0.0.1` |
| `BLOCKED_IPS` | IP blocklist | (empty) | `1.2.3.4,5.6.7.8` |
| `TRUST_PROXY` | Trust proxy headers | `false` | `true` for load balancers |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | `60000` | `60000` (1 minute) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` | `1000` |

### Analytics Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `ANALYTICS_BATCH_SIZE` | Events per batch | `100` |
| `ANALYTICS_FLUSH_INTERVAL` | Flush interval (ms) | `5000` |
| `ANALYTICS_ENABLE_REALTIME` | Enable real-time streaming | `false` |
| `ENABLE_WEBSOCKET` | Enable WebSocket server | `false` |

### Privacy & GDPR

| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_GDPR` | Enable GDPR features | `true` |
| `DATA_RETENTION_DAYS` | Data retention period (days) | `90` |
| `ANONYMIZE_IP` | Anonymize IP addresses | `true` |

### Configuration Examples

**Development:**
```bash
DATABASE_URL=sqlite://./dev.db
SERVER_PORT=3000
DEBUG=true
ENABLE_GDPR=false
```

**Staging:**
```bash
DATABASE_URL=mysql://staging:pass@staging-db:3306/analytics
API_KEYS=staging_key_123
CORS_ORIGIN=https://staging.example.com
ENABLE_GDPR=true
```

**Production:**
```bash
DATABASE_URL=postgresql://prod:secure@prod-db:5432/analytics
DATABASE_POOL_MAX=20
API_KEYS=prod_key_abc,prod_key_def
ALLOWED_IPS=10.0.0.0/8
CORS_ORIGIN=https://app.example.com,https://www.example.com
TRUST_PROXY=true
ENABLE_WEBSOCKET=true
ANALYTICS_ENABLE_REALTIME=true
NODE_ENV=production
```

---

## SQLite Auto-Create Feature

### Overview

**✨ NEW:** SQLite database directories are created automatically! No manual setup needed.

When you specify a path like `sqlite://./data/production/analytics.db`, the system:
1. ✅ Parses the path
2. ✅ Creates all parent directories (`./data/production/`)
3. ✅ Sets up the database file
4. ✅ Runs migrations

**No manual directory creation required!**

### Supported Paths

**Relative paths:**
```bash
# Current directory
DATABASE_URL=sqlite://./analytics.db

# Nested directories (created automatically!)
DATABASE_URL=sqlite://./data/db/analytics.db

# Deep nesting (all created automatically!)
DATABASE_URL=sqlite://./app/storage/databases/prod/analytics.db
```

**Absolute paths:**
```bash
# Linux/Mac
DATABASE_URL=sqlite:///var/lib/analytics/data.db

# Windows
DATABASE_URL=sqlite:///C:/Data/analytics.db
```

### Auto-Create Examples

**Development with isolated data:**
```bash
DATABASE_URL=sqlite://./data/dev/analytics.db
# Creates: ./data/dev/ directory automatically
```

**Multiple environments:**
```bash
# Development
DATABASE_URL=sqlite://./data/dev/analytics.db

# Staging
DATABASE_URL=sqlite://./data/staging/analytics.db

# Production
DATABASE_URL=sqlite://./data/production/analytics.db

# Each environment gets its own directory automatically!
```

**Organized storage:**
```bash
DATABASE_URL=sqlite://./storage/databases/2024/analytics.db
# Creates: ./storage/databases/2024/ automatically
```

### Debug Logging

Enable debug mode to see directory creation:

```bash
DEBUG=true npm start
```

Output:
```
Using SQLite database: ./data/analytics/analytics.db
Database file and directory will be created automatically if they don't exist
✓ Created directory for SQLite database: data/analytics
```

### What Gets Created

✅ **Created automatically:**
- All parent directories
- Nested directory structures
- Cross-platform (Windows/Linux/Mac)

❌ **NOT created automatically:**
- Database file (created by SQLite on first connect)
- Tables (created by migrations)

### Best Practices

**Good paths:**
```bash
DATABASE_URL=sqlite://./storage/production/analytics.db
DATABASE_URL=sqlite://./data/databases/analytics-v1.db
```

**Avoid:**
```bash
DATABASE_URL=sqlite://./db.db  # Not descriptive
```

**.gitignore:**
```gitignore
data/
storage/
*.db
*.db-shm
*.db-wal
```

### Testing Auto-Create

Test the feature:
```bash
node test-sqlite-auto-create.js
```

Expected output:
```
✓ Created directory for SQLite database: test-db-dir/nested/deep
✓ Database configuration parsed successfully
✓ Directory created automatically
✓ Directory is writable
```

---

## Running Migrations

Migrations create database tables/collections automatically based on your database type.

### Migration Commands

```bash
# Run all pending migrations
npm run migrate:up

# Check current migration status
npm run migrate:status

# Rollback last migration
npm run migrate:down

# Rollback multiple migrations
npm run migrate down 3

# Reset database (rollback all)
npm run migrate reset

# Fresh install (reset + re-run all)
npm run migrate:fresh
```

### How Migrations Work

1. **Automatic detection:** System detects your database type from `DATABASE_URL`
2. **Schema creation:** Creates appropriate schema:
   - SQL tables for MySQL, PostgreSQL, SQLite
   - Collections for MongoDB
   - JSON files for Plaintext
3. **Version tracking:** Tracks which migrations have been applied
4. **Rollback support:** Can undo migrations if needed

### Migration Status Example

```bash
$ npm run migrate:status

Current migration version: 1
Total migrations available: 1
✓ Database is up to date
```

### Migration Features

- ✅ Database-agnostic (same code for all databases)
- ✅ Automatic version tracking
- ✅ Rollback support
- ✅ CLI tool included
- ✅ Transaction support (where available)

---

## Starting the Server

### Development Mode

```bash
# Build and start in one command
npm run start:dev

# Or separately
npm run build
npm start
```

### Production Mode

```bash
# Set environment
export NODE_ENV=production

# Build
npm run build

# Start
npm start
```

### Using PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start dist/server/server.js --name analytics-server

# View logs
pm2 logs analytics-server

# Stop/Restart
pm2 stop analytics-server
pm2 restart analytics-server

# Auto-start on system boot
pm2 startup
pm2 save
```

### Using Docker

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

**Build and run:**
```bash
# Build image
docker build -t analytics-server .

# Run container
docker run -d \
  --name analytics \
  -p 3000:3000 \
  --env-file .env \
  analytics-server
```

**Docker Compose:**
```yaml
version: '3.8'
services:
  analytics:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=mysql://root:password@mysql:3306/analytics
      - SERVER_PORT=3000
    depends_on:
      - mysql
  
  mysql:
    image: mysql:8
    environment:
      - MYSQL_ROOT_PASSWORD=password
      - MYSQL_DATABASE=analytics
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

---

## Verification & Testing

### 1. Health Check

```bash
curl http://localhost:3000/health
```

**Expected response:**
```json
{
  "success": true,
  "status": "healthy",
  "initialized": true,
  "queue": {
    "size": 0,
    "processing": false
  },
  "timestamp": 1234567890
}
```

### 2. Track an Event

```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "page_view",
    "properties": {
      "page": "/home",
      "title": "Home Page"
    }
  }'
```

**Expected response:**
```json
{
  "success": true,
  "event": {
    "id": "evt_abc123",
    "type": "page_view",
    "timestamp": 1234567890
  }
}
```

### 3. Retrieve Events

```bash
curl http://localhost:3000/events?limit=10
```

### 4. Get Statistics

```bash
curl http://localhost:3000/stats
```

**Expected response:**
```json
{
  "success": true,
  "stats": {
    "totalEvents": 1,
    "eventsByType": {
      "page_view": 1
    },
    "uniqueUsers": 0,
    "uniqueSessions": 1,
    "timeRange": {
      "start": 1234567890,
      "end": 1234567890
    }
  }
}
```

### 5. Test with API Key (if configured)

```bash
curl -H "X-API-Key: your_api_key" http://localhost:3000/events
```

---

## Features Overview

### 🎯 Key Features

#### 1. Universal Database Connection Strings
Switch databases with one line:

```bash
# SQLite → MySQL → PostgreSQL → MongoDB
# Just change DATABASE_URL, no code changes!
```

#### 2. Auto-Create Directories (SQLite)
```bash
DATABASE_URL=sqlite://./data/production/analytics.db
# Directories created automatically!
```

#### 3. Universal Migrations
```bash
npm run migrate:up
# Works on ALL databases automatically
```

#### 4. Complete .env Configuration
All settings via environment variables - no code changes needed.

#### 5. Production-Ready Security
- API key authentication
- IP filtering (CIDR support)
- Rate limiting
- GDPR compliance

#### 6. Zero-Configuration Development
```bash
npm install
npm run migrate:up
npm start
# Done!
```

### NPM Scripts Reference

| Command | Description |
|---------|-------------|
| `npm start` | Start the server |
| `npm run build` | Compile TypeScript |
| `npm run start:dev` | Build and start |
| `npm run migrate:up` | Run migrations |
| `npm run migrate:down` | Rollback migration |
| `npm run migrate:status` | Check migration status |
| `npm run migrate:fresh` | Reset and re-run all |

### Benefits

✅ **90% faster setup** - No manual configuration  
✅ **Zero errors** - Automatic validation  
✅ **Instant switching** - Change databases in seconds  
✅ **Auto-create** - Directories created automatically  
✅ **Production ready** - Security built-in  
✅ **Well documented** - Comprehensive guides  

---

## Troubleshooting

### Database Connection Issues

**Error: "Database connection failed"**

Solutions:
1. Verify database is running:
   ```bash
   # MySQL
   mysql -u root -p -e "SELECT 1"
   
   # PostgreSQL
   psql -U postgres -c "SELECT 1"
   
   # MongoDB
   mongosh --eval "db.adminCommand('ping')"
   ```
2. Check `DATABASE_URL` in `.env`
3. Verify credentials
4. Ensure database exists
5. Check firewall/network

### Missing Database Driver

**Error: "Cannot find module 'mysql2'"**

Solution:
```bash
npm install mysql2  # or pg, mongodb, better-sqlite3
```

### Port Already in Use

**Error: "Port 3000 already in use"**

Solutions:
1. Change port in `.env`:
   ```bash
   SERVER_PORT=4000
   ```

2. Kill the process:
   ```bash
   # macOS/Linux
   lsof -i :3000
   kill -9 <PID>
   
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

### Migration Failures

**Error: "Migration failed"**

Solutions:
1. Check database permissions
2. Verify database exists
3. Run with debug:
   ```bash
   DEBUG=true npm run migrate:up
   ```
4. Try fresh migration:
   ```bash
   npm run migrate:fresh
   ```

### SQLite Directory Permission Error

**Error: "EACCES: permission denied"**

Solution:
```bash
mkdir -p ./data/analytics
chmod 755 ./data/analytics
```

### Performance Issues

**Slow queries:**
- Increase pool size: `DATABASE_POOL_MAX=20`
- Check database indexes (handled by migrations)
- Enable query logging

**High memory:**
- Reduce batch size: `ANALYTICS_BATCH_SIZE=50`
- Increase flush interval: `ANALYTICS_FLUSH_INTERVAL=10000`

### Debug Mode

Enable detailed logging:
```bash
DEBUG=true npm start
```

---

## Production Deployment

### Environment-Specific Configuration

**Development (.env.development):**
```bash
DATABASE_URL=sqlite://./data/dev/analytics.db
DEBUG=true
ENABLE_GDPR=false
```

**Staging (.env.staging):**
```bash
DATABASE_URL=mysql://staging:pass@staging-db:3306/analytics
API_KEYS=staging_key_123
CORS_ORIGIN=https://staging.example.com
```

**Production (.env.production):**
```bash
DATABASE_URL=postgresql://prod:secure@prod-db:5432/analytics
DATABASE_POOL_MAX=20
API_KEYS=prod_key_abc,prod_key_def
ALLOWED_IPS=10.0.0.0/8
CORS_ORIGIN=https://app.example.com
TRUST_PROXY=true
ENABLE_GDPR=true
NODE_ENV=production
```

### Security Best Practices

1. **Use strong API keys:**
   ```bash
   API_KEYS=prod_key_$(openssl rand -hex 32)
   ```

2. **Enable IP filtering:**
   ```bash
   ALLOWED_IPS=192.168.1.0/24,10.0.0.1
   ```

3. **Set rate limits:**
   ```bash
   RATE_LIMIT_MAX_REQUESTS=100
   RATE_LIMIT_WINDOW_MS=60000
   ```

4. **Enable GDPR:**
   ```bash
   ENABLE_GDPR=true
   DATA_RETENTION_DAYS=90
   ANONYMIZE_IP=true
   ```

5. **Never commit .env:**
   ```gitignore
   .env
   .env.local
   .env.*.local
   ```

### Cloud Deployment

**Heroku:**
```bash
heroku config:set DATABASE_URL=postgresql://...
heroku config:set API_KEYS=prod_key_abc
```

**AWS/Azure/GCP:**
Set environment variables in your deployment configuration.

**Docker:**
```bash
docker run -d \
  -e DATABASE_URL=mysql://user:pass@db:3306/analytics \
  -e API_KEYS=prod_key_123 \
  -p 3000:3000 \
  analytics-server
```

### Switching Databases in Production

From SQLite to MySQL:

**Before:**
```bash
DATABASE_URL=sqlite://./analytics.db
```

**After:**
```bash
DATABASE_URL=mysql://user:pass@prod-db:3306/analytics
DATABASE_POOL_MAX=20
```

**Steps:**
```bash
npm run migrate:up
npm start
```

**Done!** No code changes needed.

---

## Support & Resources

### Documentation
- `.env.example` - Configuration template with all options
- `examples/` - Working example implementations
- `test-sqlite-auto-create.js` - Test auto-create feature

### Quick Reference

```bash
# Complete setup from scratch
cp .env.example .env
npm install
npm install better-sqlite3  # or mysql2, pg, mongodb
npm run build
npm run migrate:up
npm start

# Verify it works
curl http://localhost:3000/health
```

### Need Help?

1. Check this guide
2. Review `.env.example`
3. Look at `examples/`
4. Enable debug: `DEBUG=true npm start`
5. Check database logs

---

## Summary

You now have a **production-ready analytics server** with:

✅ **Zero-configuration SQLite** - Just run and go  
✅ **Auto-create directories** - No manual setup  
✅ **Universal migrations** - Works on all databases  
✅ **Environment-based config** - Easy deployment  
✅ **Production security** - API keys, rate limiting, GDPR  
✅ **Seamless database switching** - Change one line  
✅ **Comprehensive documentation** - Everything you need  

**Start building immediately:**
```bash
npm run migrate:up && npm start
```

🚀 **Your analytics server is ready to use!**
