# Redis Caching System Implementation

## Overview

A comprehensive Redis caching layer has been implemented for the subscription system to improve performance and reduce database load. The caching system reuses the existing Redis connection from the Bull queue infrastructure.

## Features

### 1. **Cache Service** (`backend/src/utils/cache.ts`)
- **Redis Connection**: Reuses Redis client from Bull queue
- **Retry Logic**: Exponential backoff with configurable retries (default: 3 attempts)
- **Error Handling**: Graceful fallback to database on cache failures
- **Cache-Aside Pattern**: Automatic cache population on misses
- **TTL Support**: Configurable time-to-live for cached data

### 2. **Cached Operations**

#### User Subscriptions
- **Cache Key**: `subscriptions:user:{userAddress}`
- **TTL**: 5 minutes (300 seconds)
- **Invalidation**: On create, update, delete, or payment

#### Single Subscription
- **Cache Key**: `subscription:{id}`
- **TTL**: 10 minutes (600 seconds)
- **Invalidation**: On update, delete, or payment

#### Service Metadata
- **Cache Key**: `service:{id}` or `services:all`
- **TTL**: 1 hour (3600 seconds) for individual, 30 minutes (1800 seconds) for all
- **Invalidation**: On service creation

#### Payment History
- **Cache Key**: `payments:subscription:{subscriptionId}:limit:{limit}`
- **TTL**: 5 minutes (300 seconds)
- **Invalidation**: On new payment

#### Statistics
- **Cache Keys**: 
  - `stats:summary:from:{startDate}:to:{endDate}`
  - `stats:revenue:service:from:{startDate}:to:{endDate}`
  - `stats:success:rates:from:{startDate}:to:{endDate}`
  - `stats:breakdown:from:{startDate}:to:{endDate}`
- **TTL**: 10 minutes (600 seconds)
- **Invalidation**: On any payment or subscription change

## Implementation Details

### Cache Service Methods

```typescript
// Get value from cache
async get<T>(key: string): Promise<T | null>

// Set value in cache with optional TTL
async set(key: string, value: any, ttlSeconds?: number): Promise<boolean>

// Delete key from cache
async delete(key: string): Promise<boolean>

// Delete multiple keys matching pattern
async deletePattern(pattern: string): Promise<number>

// Check if key exists
async exists(key: string): Promise<boolean>

// Get or set (cache-aside pattern)
async getOrSet<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds?: number
): Promise<T>

// Invalidate cache
async invalidate(key: string): Promise<void>
async invalidatePattern(pattern: string): Promise<void>
```

### Retry Logic

The cache service implements exponential backoff retry logic:
- **Max Retries**: 3 attempts
- **Initial Delay**: 1 second
- **Backoff**: Exponential (1s, 2s, 4s)
- **Error Handling**: Returns null on failure to allow database fallback

### Cache Invalidation Strategy

Cache invalidation is performed automatically on:
1. **Subscription Changes**: Create, update, delete
2. **Payment Recording**: All payment-related caches invalidated
3. **Service Changes**: Service metadata caches invalidated
4. **Statistics**: All statistics caches invalidated on data changes

## Usage Examples

### In Subscription Service

```typescript
// Cached read operation
async getUserSubscriptions(userAddress: string) {
  const cacheKey = CacheKeys.userSubscriptions(userAddress);
  return cacheService.getOrSet(
    cacheKey,
    async () => {
      // Database query
      return await prisma.subscription.findMany({...});
    },
    CacheTTL.USER_SUBSCRIPTIONS
  );
}

// Cache invalidation on write
async createSubscription(input: CreateSubscriptionInput) {
  const subscription = await prisma.subscription.create({...});
  
  // Invalidate related caches
  await Promise.all([
    cacheService.invalidate(CacheKeys.userSubscriptions(userAddress)),
    cacheService.invalidatePattern('stats:*'),
  ]);
  
  return subscription;
}
```

## Performance Benefits

1. **Reduced Database Load**: Frequently accessed data served from cache
2. **Faster Response Times**: Cache hits return data in milliseconds
3. **Scalability**: Redis handles high concurrent read requests
4. **Cost Reduction**: Fewer database queries reduce infrastructure costs

## Error Handling

The caching system is designed to be resilient:
- **Cache Failures**: Automatically fall back to database queries
- **Connection Issues**: Retry with exponential backoff
- **Invalid Data**: Cache misses trigger fresh database queries
- **No Breaking Changes**: All operations continue to work even if Redis is unavailable

## Configuration

Cache TTL values are configurable in `backend/src/utils/cache.ts`:

```typescript
export const CacheTTL = {
  USER_SUBSCRIPTIONS: 300,      // 5 minutes
  SUBSCRIPTION: 600,             // 10 minutes
  SERVICE: 3600,                 // 1 hour
  ALL_SERVICES: 1800,            // 30 minutes
  PAYMENT_HISTORY: 300,          // 5 minutes
  STATISTICS: 600,               // 10 minutes
};
```

## Monitoring

Cache operations are logged with prefixes:
- `[CACHE]` - General cache operations
- `[CACHE] ✅` - Successful operations
- `[CACHE] ❌` - Failed operations
- `[CACHE] ⚠️` - Warnings (retries, etc.)

## Future Enhancements

Potential improvements:
1. Cache warming on application startup
2. Cache hit/miss metrics
3. Adaptive TTL based on data volatility
4. Cache compression for large objects
5. Distributed cache invalidation

## Testing

To test the caching system:

1. **Check Cache Hits**: Monitor logs for `[CACHE]` messages
2. **Verify Invalidation**: Make changes and confirm cache is cleared
3. **Test Fallback**: Disable Redis and verify database fallback works
4. **Performance**: Compare response times with and without cache

## Notes

- The cache service automatically initializes when first used
- Redis connection is shared with Bull queue (no additional connections needed)
- All cached data is JSON-serialized for storage
- Decimal values are converted to numbers for JSON compatibility





