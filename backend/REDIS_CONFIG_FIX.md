# Redis Configuration Fix

## Problem

The error `getaddrinfo ENOTFOUND 15358` indicates that `REDIS_URL` is set to just a port number (`15358`) instead of a full Redis URL.

## Solution

The code has been updated to:
1. **Validate and normalize** the Redis URL automatically
2. **Detect common mistakes** (port number only, missing protocol, etc.)
3. **Provide helpful warnings** when misconfiguration is detected
4. **Gracefully handle** Redis connection errors without crashing the app

## Configuration

### Correct Redis URL Formats

```env
# Local Redis (default)
REDIS_URL=redis://localhost:6379

# Redis with password
REDIS_URL=redis://:password@localhost:6379

# Redis Cloud
REDIS_URL=redis://username:password@host:port

# Redis with SSL
REDIS_URL=rediss://username:password@host:port
```

### Automatic Fixes

The system will automatically fix these common mistakes:

1. **Port number only** (`15358`):
   - Automatically converts to `redis://localhost:15358`
   - Shows warning: `REDIS_URL appears to be just a port number`

2. **Missing protocol** (`localhost:6379`):
   - Automatically adds `redis://` prefix
   - Shows warning: `REDIS_URL missing protocol`

3. **Hostname only** (`my-redis-host`):
   - Automatically converts to `redis://my-redis-host:6379`
   - Shows warning: `REDIS_URL appears to be just a hostname`

## Setup Instructions

### Option 1: Local Redis

1. **Install Redis:**
   ```bash
   # macOS
   brew install redis
   brew services start redis
   
   # Linux
   sudo apt-get install redis-server
   sudo systemctl start redis
   
   # Windows (Docker)
   docker run -d -p 6379:6379 redis:alpine
   ```

2. **Set in .env:**
   ```env
   REDIS_URL=redis://localhost:6379
   ```

### Option 2: Redis Cloud (Free Tier)

1. Sign up at https://redis.com/cloud
2. Create a database
3. Copy the connection URL
4. Set in .env:
   ```env
   REDIS_URL=redis://username:password@host:port
   ```

## Verification

After setting `REDIS_URL`, restart the server and check:

1. **Server logs:**
   ```
   [AUTO_PAY_QUEUE] Initializing queue with Redis URL: redis://localhost:6379
   [AUTO_PAY_QUEUE] ✅ Redis connection successful
   ```

2. **Health check:**
   ```bash
   curl http://localhost:5000/health
   ```
   
   Should return:
   ```json
   {
     "status": "healthy",
     "database": "connected",
     "redis": "connected",
     "timestamp": "..."
   }
   ```

## Troubleshooting

### Error: `getaddrinfo ENOTFOUND 15358`

**Cause:** `REDIS_URL` is set to just a port number.

**Fix:** Update `.env`:
```env
REDIS_URL=redis://localhost:6379
```

### Error: `Redis connection failed`

**Possible causes:**
1. Redis server not running
2. Wrong host/port
3. Firewall blocking connection
4. Wrong password

**Solutions:**
1. Check if Redis is running: `redis-cli ping` (should return `PONG`)
2. Verify `REDIS_URL` in `.env`
3. Check network connectivity
4. Verify credentials

### Warning: `Payment scheduler disabled`

**Cause:** `REDIS_URL` is not set or invalid.

**Fix:** Set a valid `REDIS_URL` in `.env` and restart the server.

## Current Status

The system will now:
- ✅ Automatically detect and fix common Redis URL mistakes
- ✅ Show helpful warnings for misconfiguration
- ✅ Continue running even if Redis is unavailable (with warnings)
- ✅ Provide clear error messages in health check endpoint

The queue system will only initialize when a valid Redis URL is provided, preventing the `ENOTFOUND` errors.





