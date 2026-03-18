# Auto-Pay Queue System Setup

This document describes the Bull + Redis job queue system for processing auto-pay subscriptions asynchronously.

## Overview

The auto-pay queue system processes subscription payments in the background, providing:
- **Asynchronous Processing**: Payments are queued and processed in the background
- **Retry Logic**: Failed payments are automatically retried with exponential backoff
- **Job Tracking**: Monitor payment job status and progress
- **Scalability**: Handle multiple payments concurrently
- **Reliability**: Failed jobs are kept for debugging and analysis

## Architecture

```
Payment Scheduler (every 5 minutes)
    ↓
Checks for due subscriptions
    ↓
Queues auto-pay jobs
    ↓
Auto-Pay Worker
    ↓
Processes payments
    ↓
Records results in database
```

## Prerequisites

1. **Redis Server**: Required for Bull queue
   - Local: `redis://localhost:6379`
   - Cloud: Set `REDIS_URL` environment variable

2. **Dependencies**: Already added to `package.json`
   - `bull`: ^4.12.0
   - `@types/bull`: ^4.10.0

## Installation

1. **Install dependencies:**
   ```bash
   cd backend
   yarn install
   ```

2. **Set up Redis:**
   
   **Option 1: Local Redis**
   ```bash
   # macOS
   brew install redis
   brew services start redis
   
   # Linux
   sudo apt-get install redis-server
   sudo systemctl start redis
   
   # Windows (using WSL or Docker)
   docker run -d -p 6379:6379 redis:alpine
   ```

   **Option 2: Redis Cloud (Free Tier)**
   - Sign up at https://redis.com/cloud
   - Create a database
   - Copy the connection URL
   - Set `REDIS_URL` in `.env`

3. **Configure environment:**
   ```env
   REDIS_URL=redis://localhost:6379
   # Or for Redis Cloud:
   REDIS_URL=redis://username:password@host:port
   ```

## Components

### 1. Auto-Pay Queue (`src/queue/autoPayQueue.ts`)

Manages the job queue with Bull:
- Creates and manages auto-pay jobs
- Provides job status tracking
- Handles job queries and filtering

**Key Functions:**
- `addAutoPayJob()`: Queue a new payment job
- `getAutoPayJobStatus()`: Get job status and results
- `getJobsForSubscription()`: Get all jobs for a subscription

### 2. Auto-Pay Worker (`src/queue/autoPayWorker.ts`)

Processes queued payment jobs:
- Validates subscription status
- Processes payments via x402 protocol
- Records payment results
- Handles errors and retries

**Features:**
- Automatic retry with exponential backoff (3 attempts)
- Progress tracking (10%, 30%, 50%, 80%, 100%)
- Error recording in database

### 3. Payment Scheduler (`src/services/paymentScheduler.ts`)

Automatically checks for due payments:
- Runs every 5 minutes (configurable)
- Finds subscriptions with due payments
- Queues payment jobs
- Prevents duplicate payments

**Functions:**
- `checkAndQueueDuePayments()`: Check and queue due payments
- `startPaymentScheduler()`: Start the scheduler

## API Endpoints

### Job Status

**GET `/api/jobs/:jobId`**
Get status of a specific payment job.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "completed",
    "progress": 100,
    "result": {
      "success": true,
      "transactionHash": "0x...",
      "subscriptionId": "...",
      "amount": 0.01
    },
    "attemptsMade": 1,
    "data": {
      "subscriptionId": "...",
      "userAddress": "0x...",
      "amount": 0.01,
      "recipientAddress": "0x...",
      "serviceName": "Service Name"
    }
  }
}
```

**Status Values:**
- `waiting`: Job is queued, waiting to be processed
- `active`: Job is currently being processed
- `completed`: Job completed successfully
- `failed`: Job failed after all retry attempts
- `delayed`: Job is scheduled for later execution

### Subscription Jobs

**GET `/api/jobs/subscription/:subscriptionId`**
Get all payment jobs for a subscription.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "jobId": "123",
      "status": "completed",
      "progress": 100,
      "result": {...},
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Manual Payment Trigger

**POST `/api/subscriptions/:id/trigger-payment`**
Manually trigger a payment for a subscription (if auto-pay is enabled).

**Response:**
```json
{
  "success": true,
  "message": "Payment job queued successfully",
  "data": {
    "jobId": "123",
    "subscriptionId": "..."
  }
}
```

## Job Retry Logic

Failed payments are automatically retried with exponential backoff:

- **Attempt 1**: Immediate
- **Attempt 2**: After 2 seconds
- **Attempt 3**: After 4 seconds

If all attempts fail, the job is marked as `failed` and kept for debugging.

## Monitoring

### Queue Statistics

Check queue status via Bull's built-in methods:

```typescript
import { autoPayQueue } from './queue/autoPayQueue';

// Get queue statistics
const waiting = await autoPayQueue.getWaitingCount();
const active = await autoPayQueue.getActiveCount();
const completed = await autoPayQueue.getCompletedCount();
const failed = await autoPayQueue.getFailedCount();
```

### Health Check

The `/health` endpoint now includes Redis status:

```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Usage Examples

### Queue a Payment Manually

```typescript
import { addAutoPayJob } from './queue/autoPayQueue';

const job = await addAutoPayJob({
  subscriptionId: 'sub_123',
  userAddress: '0x...',
  amount: 0.01,
  recipientAddress: '0x...',
  serviceName: 'Service Name',
});

console.log('Job ID:', job.id);
```

### Check Job Status

```typescript
import { getAutoPayJobStatus } from './queue/autoPayQueue';

const status = await getAutoPayJobStatus('123');
console.log('Status:', status.status);
console.log('Progress:', status.progress);
```

### Start Scheduler Manually

```typescript
import { startPaymentScheduler } from './services/paymentScheduler';

// Check every 10 minutes
const interval = startPaymentScheduler(10);
```

## Error Handling

Failed payments are:
1. Retried automatically (up to 3 times)
2. Recorded in the database with `status: 'failed'`
3. Kept in the queue for debugging
4. Logged with detailed error messages

## Production Considerations

1. **Redis Persistence**: Enable Redis persistence for production
2. **Monitoring**: Set up monitoring for queue length and failed jobs
3. **Scaling**: Run multiple workers for high-volume scenarios
4. **Security**: Store wallet private keys securely (if implementing server-side signing)
5. **Rate Limiting**: Consider rate limiting for payment processing

## Troubleshooting

### Redis Connection Issues

**Error**: `Redis connection failed`

**Solutions:**
1. Verify Redis is running: `redis-cli ping` (should return `PONG`)
2. Check `REDIS_URL` in `.env`
3. Verify network connectivity to Redis server
4. Check Redis server logs

### Jobs Not Processing

**Possible Causes:**
1. Worker not started (check server logs)
2. Redis connection issues
3. Worker crashed (check error logs)

**Solutions:**
1. Restart the server
2. Check worker initialization in `index.ts`
3. Verify Redis connection

### Duplicate Payments

The scheduler checks for recent pending payments to prevent duplicates. If you see duplicates:
1. Check the time window in `paymentScheduler.ts`
2. Verify payment status checks are working
3. Review job queue for duplicate jobs

## Future Enhancements

1. **Wallet Signing**: Implement server-side wallet signing for true automation
2. **Meta-Transactions**: Use meta-transactions for gasless payments
3. **Webhooks**: Add webhook notifications for payment events
4. **Dashboard**: Create admin dashboard for queue monitoring
5. **Analytics**: Add payment success rate analytics

## Support

For issues or questions, check:
- Server logs for detailed error messages
- Redis logs for connection issues
- Database for payment records
- Job queue status via API endpoints







