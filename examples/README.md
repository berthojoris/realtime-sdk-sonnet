# Examples

This directory contains example configurations and usage patterns for the Realtime Analytics Server.

## Running Examples

Before running any example, make sure to:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Install database drivers** (as needed):
   ```bash
   # For MySQL examples
   npm install mysql2
   
   # For PostgreSQL examples
   npm install pg
   
   # For MongoDB examples
   npm install mongodb
   
   # For SQLite examples
   npm install better-sqlite3
   ```

## Example Files

### `basic-server.js`
The simplest way to start the server using `.env` configuration.

**Usage:**
```bash
# 1. Copy and configure .env
cp .env.example .env

# 2. Edit .env with your settings
nano .env

# 3. Run migrations
npm run migrate:up

# 4. Start the server
node examples/basic-server.js
```

### `custom-server.js`
Demonstrates manual configuration without `.env` file.

**Usage:**
```bash
node examples/custom-server.js
```

**Features:**
- Manual configuration object
- Custom SQLite database location
- API key authentication
- Custom port (4000)

### `mysql-server.js`
Example MySQL configuration with connection pooling.

**Setup:**
```bash
# 1. Start MySQL (using Docker)
docker run --name mysql-analytics \
  -e MYSQL_ROOT_PASSWORD=password \
  -e MYSQL_DATABASE=analytics \
  -p 3306:3306 \
  -d mysql:8

# 2. Set environment variables
export MYSQL_HOST=localhost
export MYSQL_PORT=3306
export MYSQL_DATABASE=analytics
export MYSQL_USER=root
export MYSQL_PASSWORD=password

# 3. Run the example
node examples/mysql-server.js
```

## Quick Start Configurations

### SQLite (Zero Configuration)

Create `.env`:
```bash
DATABASE_TYPE=sqlite
DATABASE_URL=sqlite://./analytics.db
SERVER_PORT=3000
```

Run:
```bash
npm run migrate:up
npm start
```

### MySQL (Docker)

Start MySQL:
```bash
docker run --name mysql-analytics \
  -e MYSQL_ROOT_PASSWORD=SecurePass123 \
  -e MYSQL_DATABASE=analytics \
  -p 3306:3306 \
  -d mysql:8
```

Create `.env`:
```bash
DATABASE_TYPE=mysql
DATABASE_URL=mysql://root:SecurePass123@localhost:3306/analytics
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
SERVER_PORT=3000
```

Run:
```bash
npm run migrate:up
npm start
```

### PostgreSQL (Docker)

Start PostgreSQL:
```bash
docker run --name postgres-analytics \
  -e POSTGRES_PASSWORD=SecurePass123 \
  -e POSTGRES_DB=analytics \
  -p 5432:5432 \
  -d postgres:15
```

Create `.env`:
```bash
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://postgres:SecurePass123@localhost:5432/analytics
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
SERVER_PORT=3000
```

Run:
```bash
npm run migrate:up
npm start
```

### MongoDB (Docker)

Start MongoDB:
```bash
docker run --name mongo-analytics \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=SecurePass123 \
  -p 27017:27017 \
  -d mongo:7
```

Create `.env`:
```bash
DATABASE_TYPE=mongodb
DATABASE_URL=mongodb://admin:SecurePass123@localhost:27017/analytics?authSource=admin
SERVER_PORT=3000
```

Run:
```bash
npm run migrate:up
npm start
```

## Testing the Server

Once your server is running, test it with curl:

### Health Check
```bash
curl http://localhost:3000/health
```

### Track an Event
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

### Get Events
```bash
curl http://localhost:3000/events?limit=10
```

### Get Statistics
```bash
curl http://localhost:3000/stats
```

## Switching Between Databases

The beauty of the connection string approach is that you can easily switch databases:

### From SQLite to MySQL:

**Before:**
```bash
DATABASE_URL=sqlite://./analytics.db
```

**After:**
```bash
DATABASE_URL=mysql://root:pass@localhost:3306/analytics
```

### From MySQL to PostgreSQL:

**Before:**
```bash
DATABASE_URL=mysql://root:pass@localhost:3306/analytics
```

**After:**
```bash
DATABASE_URL=postgresql://postgres:pass@localhost:5432/analytics
```

Then just run migrations and restart:
```bash
npm run migrate:up
npm start
```

## Production Deployment

### Using Environment Variables (Recommended)

Most cloud platforms inject environment variables automatically:

**Heroku:**
```bash
heroku config:set DATABASE_URL=postgresql://user:pass@host:5432/db
heroku config:set API_KEYS=prod_key_abc,prod_key_def
```

**AWS/Azure/GCP:**
Set environment variables in your deployment configuration.

**Docker:**
```bash
docker run -d \
  -e DATABASE_URL=mysql://user:pass@db:3306/analytics \
  -e SERVER_PORT=3000 \
  -e API_KEYS=prod_key_123 \
  -p 3000:3000 \
  your-analytics-server
```

### Using Docker Compose

Create `docker-compose.yml`:
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
      - NODE_ENV=production
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

Run:
```bash
docker-compose up -d
```

## Troubleshooting

### "Cannot find module 'mysql2'"
Install the database driver:
```bash
npm install mysql2
```

### "Connection refused"
Make sure the database server is running and accessible:
```bash
# Test MySQL connection
mysql -h localhost -u root -p

# Test PostgreSQL connection
psql -h localhost -U postgres

# Check if port is open
nc -zv localhost 3306
```

### "Migration failed"
Run migrations with debug mode:
```bash
DEBUG=true npm run migrate:up
```

## Next Steps

- Read [CONFIGURATION.md](../CONFIGURATION.md) for detailed configuration options
- Check [API.md](../docs/API.md) for API documentation
- See [README.md](../README.md) for general information
