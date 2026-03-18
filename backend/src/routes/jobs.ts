import express from 'express';
import { getAutoPayJobStatus, getJobsForSubscription } from '../queue/autoPayQueue';

const router = express.Router();

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

export default router;







