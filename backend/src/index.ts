import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';

import subscriptionRoutes from './routes/subscriptions';
import serviceRoutes from './routes/services';
import './queue/autoPayWorker'; // Initialize auto-pay worker
import { startPaymentScheduler } from './services/paymentScheduler';

// Load environment variables
dotenv.config();

// Test database connection on startup
import { prisma } from './lib/prisma';

async function testDatabaseConnection() {
  try {
    // Test connection with a simple query
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connected successfully');
    return true;
  } catch (error: any) {
    console.error('❌ Database connection failed');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'P1001') {
      console.error('\n📋 Troubleshooting steps:');
      console.error('1. Check if your Aiven database is running (not paused)');
      console.error('2. Verify the DATABASE_URL in your .env file');
      console.error('3. Check if your IP is whitelisted in Aiven firewall settings');
      console.error('4. Try using the connection pooler URL (port 10189) instead of direct connection');
      console.error('5. Verify network connectivity to the database host');
      
      if (process.env.DATABASE_URL) {
        try {
          const url = new URL(process.env.DATABASE_URL);
          console.error(`\nCurrent connection: ${url.hostname}:${url.port}`);
        } catch {
          console.error('\nDATABASE_URL format might be incorrect');
        }
      }
    } else if (error.code === 'P1017') {
      console.error('\n📋 Server closed the connection. Possible causes:');
      console.error('1. Database server is overloaded');
      console.error('2. Connection timeout - try using connection pooler');
      console.error('3. Too many connections - check connection limits');
    }
    
    return false;
  }
}

// Test connection asynchronously (don't block server startup)
testDatabaseConnection();

const app = express();

// Parse command-line arguments for port
function getPortFromArgs(): number | null {
  const args = process.argv.slice(2);
  const portIndex = args.findIndex(arg => arg === '-p' || arg === '--port');
  if (portIndex !== -1 && args[portIndex + 1]) {
    return parseInt(args[portIndex + 1], 10);
  }
  return null;
}

const PORT = getPortFromArgs() || parseInt(process.env.PORT || '5000', 10);

// Middleware
app.use(cors({ origin: '*' }));
app.use(bodyParser.json());

// API Routes
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/services', serviceRoutes);

// Import and use jobs routes
import jobsRoutes from './routes/jobs';
app.use('/api/jobs', jobsRoutes);

// Import and use statistics routes
import statisticsRoutes from './routes/statistics';
app.use('/api/statistics', statisticsRoutes);

// Import and use failed payments routes
import failedPaymentsRoutes from './routes/failedPayments';
app.use('/api/failed-payments', failedPaymentsRoutes);

// Health check endpoint
app.get('/health', async (_req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Test Redis connection (hardcoded in autoPayQueue.ts)
    let redisStatus = 'unknown';
    try {
      const { autoPayQueue } = await import('./queue/autoPayQueue');
      const queue = autoPayQueue(); // Call the getter function
      const client = queue.client;
      await client.ping();
      redisStatus = 'connected';
    } catch (redisError: any) {
      redisStatus = `disconnected: ${redisError.message}`;
    }

    res.json({
      status: 'healthy',
      database: 'connected',
      redis: redisStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Default route (optional)
app.get('/', (_req, res) => {
  res.json({
    message: '✅ Smart Subscription Manager backend is running!',
    version: '1.0.0',
    endpoints: {
      subscriptions: '/api/subscriptions',
      services: '/api/services',
      jobs: '/api/jobs',
      statistics: '/api/statistics',
      failedPayments: '/api/failed-payments',
      health: '/health',
    }
  });
});

// 404 handler - return JSON instead of HTML
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: 'The requested endpoint does not exist. Check the root path for available endpoints.'
  });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message || 'An unexpected error occurred'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running at http://localhost:${PORT}`);
  
  // Start payment scheduler (checks every 5 minutes)
  // Requires Redis configuration in .env file
  const redisUrl = process.env.REDIS_URL || 
    (process.env.REDIS_USERNAME && process.env.REDIS_PASSWORD && process.env.REDIS_HOST && process.env.REDIS_PORT);
  
  if (redisUrl) {
    try {
      const schedulerInterval = startPaymentScheduler(5);
      console.log('✅ Payment scheduler started');
      
      // Clean up on shutdown
      process.on('SIGTERM', () => {
        clearInterval(schedulerInterval);
        console.log('Payment scheduler stopped');
      });
      
      process.on('SIGINT', () => {
        clearInterval(schedulerInterval);
        console.log('Payment scheduler stopped');
      });
    } catch (error: any) {
      console.error('❌ Failed to start payment scheduler:', error.message);
      console.warn('⚠️  Payment scheduler disabled - check Redis configuration');
    }
  } else {
    console.warn('⚠️  Redis configuration not found - payment scheduler disabled');
    console.warn('   Please set REDIS_URL or REDIS_USERNAME, REDIS_PASSWORD, REDIS_HOST, REDIS_PORT in .env file');
  }
});
