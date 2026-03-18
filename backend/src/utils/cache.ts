import autoPayQueue from '../queue/autoPayQueue';

/**
 * Cache service using Redis
 * Reuses the Redis connection from Bull queue
 */
class CacheService {
  private client: any;
  private initialized: boolean = false;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1 second

  /**
   * Initialize cache service with Redis client from Bull queue
   */
  private async initialize(): Promise<void> {
    if (this.initialized && this.client) {
      return;
    }

    try {
      const queue = autoPayQueue();
      this.client = queue.client;
      
      // Test connection
      await this.client.ping();
      this.initialized = true;
      console.log('[CACHE] ✅ Redis cache service initialized');
    } catch (error) {
      console.error('[CACHE] ❌ Failed to initialize cache service:', error);
      throw error;
    }
  }

  /**
   * Get Redis client with retry logic
   */
  private async getClient(): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.client;
  }

  /**
   * Execute Redis operation with retry logic
   */
  private async executeWithRetry<T>(
    operation: (client: any) => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const client = await this.getClient();
        return await operation(client);
      } catch (error: any) {
        lastError = error;
        const isLastAttempt = attempt === this.maxRetries;
        
        if (isLastAttempt) {
          console.error(`[CACHE] ${operationName} failed after ${this.maxRetries} attempts:`, error.message);
          throw error;
        }

        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.warn(`[CACHE] ${operationName} failed (attempt ${attempt}/${this.maxRetries}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error(`${operationName} failed`);
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      return await this.executeWithRetry(async (client) => {
        const value = await client.get(key);
        if (!value) {
          return null;
        }
        try {
          return JSON.parse(value) as T;
        } catch {
          // If parsing fails, return as string
          return value as T;
        }
      }, `GET ${key}`);
    } catch (error) {
      console.error(`[CACHE] Error getting key ${key}:`, error);
      return null; // Return null on error to allow fallback to database
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      return await this.executeWithRetry(async (client) => {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        
        if (ttlSeconds) {
          await client.setex(key, ttlSeconds, serialized);
        } else {
          await client.set(key, serialized);
        }
        
        return true;
      }, `SET ${key}`);
    } catch (error) {
      console.error(`[CACHE] Error setting key ${key}:`, error);
      return false; // Don't throw, allow operation to continue
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      return await this.executeWithRetry(async (client) => {
        await client.del(key);
        return true;
      }, `DELETE ${key}`);
    } catch (error) {
      console.error(`[CACHE] Error deleting key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      return await this.executeWithRetry(async (client) => {
        const keys = await client.keys(pattern);
        if (keys.length === 0) {
          return 0;
        }
        await client.del(...keys);
        return keys.length;
      }, `DELETE PATTERN ${pattern}`);
    } catch (error) {
      console.error(`[CACHE] Error deleting pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      return await this.executeWithRetry(async (client) => {
        const result = await client.exists(key);
        return result === 1;
      }, `EXISTS ${key}`);
    } catch (error) {
      console.error(`[CACHE] Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get or set with cache (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch from source
    try {
      const value = await fetchFn();
      
      // Store in cache (don't wait for it to complete)
      this.set(key, value, ttlSeconds).catch(err => {
        console.warn(`[CACHE] Failed to cache value for ${key}:`, err);
      });
      
      return value;
    } catch (error) {
      console.error(`[CACHE] Error in getOrSet for ${key}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate cache for a key
   */
  async invalidate(key: string): Promise<void> {
    await this.delete(key);
  }

  /**
   * Invalidate cache for multiple keys matching a pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    await this.deletePattern(pattern);
  }

  /**
   * Clear all cache (use with caution)
   */
  async clear(): Promise<void> {
    try {
      await this.executeWithRetry(async (client) => {
        await client.flushdb();
      }, 'CLEAR ALL');
      console.log('[CACHE] All cache cleared');
    } catch (error) {
      console.error('[CACHE] Error clearing cache:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Cache key prefixes
export const CacheKeys = {
  // User subscriptions
  userSubscriptions: (userAddress: string) => `subscriptions:user:${userAddress.toLowerCase()}`,
  
  // Single subscription
  subscription: (id: string) => `subscription:${id}`,
  
  // Service metadata
  service: (id: string) => `service:${id}`,
  allServices: () => 'services:all',
  
  // Payment history
  paymentHistory: (subscriptionId: string, limit?: number) => 
    `payments:subscription:${subscriptionId}${limit ? `:limit:${limit}` : ''}`,
  
  // Statistics (with optional date range)
  statisticsSummary: (startDate?: string, endDate?: string) => 
    `stats:summary${startDate ? `:from:${startDate}` : ''}${endDate ? `:to:${endDate}` : ''}`,
  revenueByService: (startDate?: string, endDate?: string) => 
    `stats:revenue:service${startDate ? `:from:${startDate}` : ''}${endDate ? `:to:${endDate}` : ''}`,
  successRates: (startDate?: string, endDate?: string) => 
    `stats:success:rates${startDate ? `:from:${startDate}` : ''}${endDate ? `:to:${endDate}` : ''}`,
  serviceBreakdown: (startDate?: string, endDate?: string) => 
    `stats:breakdown${startDate ? `:from:${startDate}` : ''}${endDate ? `:to:${endDate}` : ''}`,
};

// Default TTL values (in seconds)
export const CacheTTL = {
  USER_SUBSCRIPTIONS: 300,      // 5 minutes
  SUBSCRIPTION: 600,             // 10 minutes
  SERVICE: 3600,                 // 1 hour
  ALL_SERVICES: 1800,            // 30 minutes
  PAYMENT_HISTORY: 300,          // 5 minutes
  STATISTICS: 600,               // 10 minutes
};

