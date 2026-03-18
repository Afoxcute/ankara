import express from 'express';
import { failedPaymentTracker } from '../services/failedPaymentTracker';

const router = express.Router();

/**
 * GET /api/failed-payments/subscription/:subscriptionId
 * Get failed payments for a subscription
 */
router.get('/subscription/:subscriptionId', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const failedPayments = await failedPaymentTracker.getFailedPayments(subscriptionId, limit);

    res.json({
      success: true,
      data: {
        subscriptionId,
        failedPayments,
        count: failedPayments.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching failed payments:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch failed payments',
    });
  }
});

/**
 * GET /api/failed-payments/stats
 * Get failed payment statistics
 * Query params: userAddress, startDate, endDate
 */
router.get('/stats', async (req, res) => {
  try {
    const userAddress = req.query.userAddress as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const stats = await failedPaymentTracker.getFailedPaymentStats(userAddress, startDate, endDate);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Error fetching failed payment stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch failed payment statistics',
    });
  }
});

export default router;





