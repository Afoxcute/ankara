import express from 'express';
import { getAutoPayJobStatus, getJobsForSubscription } from '../queue/autoPayQueue';
import { SubscriptionService } from '../services/subscriptionService';

const router = express.Router();
const subscriptionService = new SubscriptionService();

/**
 * GET /api/jobs/:jobId
 * Get job status and results
 */
router.get('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const status = await getAutoPayJobStatus(jobId);
    res.json({ success: true, data: status });
  } catch (error: any) {
    console.error('Error fetching job status:', error);
    res.status(404).json({
      success: false,
      error: error.message || 'Job not found',
    });
  }
});

/**
 * GET /api/jobs/subscription/:subscriptionId
 * Get all jobs for a subscription
 */
router.get('/subscription/:subscriptionId', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const jobs = await getJobsForSubscription(subscriptionId);
    
    const jobStatuses = await Promise.all(
      jobs.map(async (job) => {
        const status = await getAutoPayJobStatus(job.id.toString());
        return {
          jobId: job.id.toString(),
          ...status,
          createdAt: new Date(job.timestamp),
        };
      })
    );

    res.json({ success: true, data: jobStatuses });
  } catch (error: any) {
    console.error('Error fetching subscription jobs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch jobs',
    });
  }
});

/**
 * POST /api/jobs/sync-chain-payments
 * Backfill payments from on-chain PaymentMade events into DB.
 * Body: { contractAddress?: string, fromBlock?: string|number, toBlock?: string|number }
 */
router.post('/sync-chain-payments', async (req, res) => {
  try {
    const { contractAddress, fromBlock, toBlock } = req.body || {};
    const result = await subscriptionService.syncPaymentsFromChain({
      contractAddress,
      ...(fromBlock !== undefined && fromBlock !== null
        ? { fromBlock: BigInt(fromBlock) }
        : {}),
      ...(toBlock !== undefined && toBlock !== null
        ? { toBlock: BigInt(toBlock) }
        : {}),
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error syncing chain payments:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to sync chain payments',
    });
  }
});

export default router;







