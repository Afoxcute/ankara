import Bull from 'bull';

export interface AutoPayJobData {
  subscriptionId: string;
  userAddress: string;
  amount: number;
  recipientAddress: string;
  serviceName: string;
}

/**
 * Get Redis connection configuration
 * Requires environment variables to be set
 */
function getRedisConfig(): string {
  // Option 1: Use full connection string (recommended)
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  // Option 2: Build from individual components
  const username = process.env.REDIS_USERNAME;
  const password = process.env.REDIS_PASSWORD;
  const host = process.env.REDIS_HOST;
  const port = process.env.REDIS_PORT;

  if (username && password && host && port) {
    // Format: redis://username:password@host:port
    return `redis://${username}:${password}@${host}:${port}`;
  }

  // No configuration found
  throw new Error(
    'Redis configuration is required. Please set either REDIS_URL or REDIS_USERNAME, REDIS_PASSWORD, REDIS_HOST, and REDIS_PORT in your .env file.\n' +
    'Example: REDIS_URL=redis://username:password@host:port'
  );
}

/**
 * Job queue for auto-pay processing
 * Only created if Redis URL is valid
 */
let autoPayQueue: Bull.Queue<AutoPayJobData> | null = null;

function initializeQueue(): Bull.Queue<AutoPayJobData> {
  if (autoPayQueue) {
    return autoPayQueue;
  }

  try {
    const redisUrl = getRedisConfig();
    // Hide password in logs for security
    const safeUrl = redisUrl.replace(/:([^:@]+)@/, ':****@');
    console.log(`[AUTO_PAY_QUEUE] Initializing queue with Redis: ${safeUrl}`);

    autoPayQueue = new Bull<AutoPayJobData>('auto-pay', redisUrl, {
      defaultJobOptions: {
        attempts: 5, // Increased max attempts for better retry coverage
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2 seconds, then 4s, 8s, 16s, 32s
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: false, // Keep failed jobs for debugging and analysis
      },
      settings: {
        retryProcessDelay: 5000, // Delay before retrying failed jobs
        maxStalledCount: 2, // Max times a job can be stalled before being marked as failed
      },
    });

    // Error handling
    autoPayQueue.on('error', (error) => {
      console.error('[AUTO_PAY_QUEUE] Queue error:', error.message);
      // Don't crash the app, just log the error
    });

    autoPayQueue.on('failed', (job, error) => {
      console.error(`[AUTO_PAY_QUEUE] Job ${job?.id} failed:`, error);
    });

    autoPayQueue.on('completed', (job) => {
      console.log(`[AUTO_PAY_QUEUE] Job ${job.id} completed successfully`);
    });

    // Test connection
    autoPayQueue.client.ping().then(() => {
      console.log('[AUTO_PAY_QUEUE] ✅ Redis connection successful');
    }).catch((error) => {
      console.error('[AUTO_PAY_QUEUE] ❌ Redis connection failed:', error.message);
      console.error('[AUTO_PAY_QUEUE] Queue operations will fail until Redis is configured correctly');
    });

    return autoPayQueue;
  } catch (error) {
    console.error('[AUTO_PAY_QUEUE] Failed to initialize queue:', error);
    throw error;
  }
}

// Initialize queue lazily
function getQueue(): Bull.Queue<AutoPayJobData> {
  if (!autoPayQueue) {
    return initializeQueue();
  }
  return autoPayQueue;
}

/**
 * Add auto-pay job to queue
 */
export async function addAutoPayJob(data: AutoPayJobData): Promise<Bull.Job<AutoPayJobData>> {
  const queue = getQueue();
  const job = await queue.add(data, {
    timeout: 300000, // 5 minutes max processing time
    jobId: `autopay-${data.subscriptionId}-${Date.now()}`, // Unique job ID
  });

  console.log(`[AUTO_PAY_QUEUE] Job ${job.id} added for subscription: ${data.subscriptionId}`);

  return job;
}

/**
 * Get job by ID
 */
export async function getAutoPayJobById(jobId: string): Promise<Bull.Job<AutoPayJobData> | null> {
  const queue = getQueue();
  return await queue.getJob(jobId);
}

/**
 * Get job status
 */
export async function getAutoPayJobStatus(jobId: string): Promise<{
  status: string;
  progress?: number;
  result?: any;
  error?: string;
  attemptsMade?: number;
  data?: AutoPayJobData;
}> {
  const job = await getAutoPayJobById(jobId);

  if (!job) {
    throw new Error('Job not found');
  }

  const state = await job.getState();
  const progress = job.progress();

  if (state === 'completed') {
    return {
      status: 'completed',
      progress: 100,
      result: job.returnvalue,
      attemptsMade: job.attemptsMade,
      data: job.data,
    };
  }

  if (state === 'failed') {
    return {
      status: 'failed',
      error: job.failedReason,
      attemptsMade: job.attemptsMade,
      data: job.data,
    };
  }

  return {
    status: state,
    progress: typeof progress === 'number' ? progress : undefined,
    attemptsMade: job.attemptsMade,
    data: job.data,
  };
}

/**
 * Get all jobs for a subscription
 */
export async function getJobsForSubscription(subscriptionId: string): Promise<Bull.Job<AutoPayJobData>[]> {
  const queue = getQueue();
  const jobs = await queue.getJobs(['completed', 'failed', 'active', 'waiting', 'delayed']);
  return jobs.filter(job => job.data.subscriptionId === subscriptionId);
}

/**
 * Check if queue is available
 */
export function isQueueAvailable(): boolean {
  try {
    return autoPayQueue !== null && autoPayQueue !== undefined;
  } catch {
    return false;
  }
}

// Export the queue getter for worker (lazy initialization)
export { getQueue as autoPayQueue };

// Default export - returns queue when accessed (lazy)
export default getQueue;



