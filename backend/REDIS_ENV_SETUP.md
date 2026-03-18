# Redis Environment Configuration

## Overview

The auto-pay queue system requires Redis to be configured via environment variables. **No hardcoded credentials are used** for security.

## Setup

### Step 1: Create `.env` file

Create a `.env` file in the `backend` directory:

```bash
cd backend
touch .env
```

### Step 2: Add Redis Configuration

You have two options:

#### Option 1: Full Connection String (Recommended)

```env
REDIS_URL=redis://username:password@host:port
```

**Example:**
```env

```

#### Option 2: Individual Components

```env
REDIS_USERNAME=default
REDIS_PASSWORD=WsjE9g4MJCwrcmyXL0dR80etUIAZ8sOZ
REDIS_HOST=redis-15358.c15.us-east-1-2.ec2.cloud.redislabs.com
REDIS_PORT=15358
```

## Complete `.env` Example

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database

# Redis Configuration (REQUIRED for auto-pay queue)


# Server Configuration
PORT=5000
```

## Redis Providers

### Local Redis

```env
REDIS_URL=redis://localhost:6379
```

### Redis Cloud (Free Tier)

1. Sign up at https://redis.com/cloud
2. Create a database
3. Copy the connection URL
4. Add to `.env`:
   ```env
   REDIS_URL=redis://username:password@host:port
   ```

### Other Redis Providers

Any Redis provider that supports the standard Redis protocol will work. Just use the connection string format:
```
redis://username:password@host:port
```

## Verification

After setting up your `.env` file:

1. **Start the backend:**
   ```bash
   cd backend
   yarn start
   ```

2. **Check logs for:**
   ```
   [AUTO_PAY_QUEUE] Initializing queue with Redis: redis://****@host:port
   [AUTO_PAY_QUEUE] ✅ Redis connection successful
   ✅ Payment scheduler started
   ```

3. **Check health endpoint:**
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

## Error Messages

### "Redis configuration is required"

**Cause:** No Redis environment variables are set.

**Fix:** Add `REDIS_URL` or the individual components to your `.env` file.

### "Redis connection failed"

**Possible causes:**
1. Wrong credentials
2. Redis server not running
3. Network connectivity issues
4. Firewall blocking connection

**Solutions:**
1. Verify credentials in `.env`
2. Check if Redis server is running
3. Test connection: `redis-cli -h host -p port -a password ping`
4. Check network/firewall settings

## Security Notes

- ✅ **Never commit `.env` files** to version control
- ✅ `.env` is already in `.gitignore`
- ✅ Passwords are hidden in logs (shown as `****`)
- ✅ Use environment variables for all sensitive data

## Migration from Hardcoded Config

If you were using the previous hardcoded configuration, you need to:

1. Create `.env` file
2. Add your Redis credentials:
   ```env

   ```
3. Restart the backend server

The system will now use your environment variables instead of hardcoded values.





