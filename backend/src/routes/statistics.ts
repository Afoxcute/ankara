import express from 'express';
import { SubscriptionService } from '../services/subscriptionService';

const router = express.Router();
const subscriptionService = new SubscriptionService();

/**
 * GET /api/statistics/summary
 * Get overall statistics summary
 * Query params: startDate, endDate (ISO date strings)
 */
router.get('/summary', async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const summary = await subscriptionService.getStatisticsSummary(startDate, endDate);
    res.json({ success: true, data: summary });
  } catch (error: any) {
    console.error('Error fetching statistics summary:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch statistics summary',
    });
  }
});

/**
 * GET /api/statistics/revenue-by-service
 * Get revenue statistics by service
 * Query params: startDate, endDate (ISO date strings)
 */
router.get('/revenue-by-service', async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const revenue = await subscriptionService.getRevenueByService(startDate, endDate);
    res.json({ success: true, data: revenue });
  } catch (error: any) {
    console.error('Error fetching revenue by service:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch revenue by service',
    });
  }
});

/**
 * GET /api/statistics/success-rates
 * Get payment success/failure rates
 * Query params: startDate, endDate (ISO date strings)
 */
router.get('/success-rates', async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const rates = await subscriptionService.getPaymentSuccessRates(startDate, endDate);
    res.json({ success: true, data: rates });
  } catch (error: any) {
    console.error('Error fetching success rates:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch success rates',
    });
  }
});

/**
 * GET /api/statistics/service-breakdown
 * Get detailed service breakdown analytics
 * Query params: startDate, endDate (ISO date strings)
 */
router.get('/service-breakdown', async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const breakdown = await subscriptionService.getServiceBreakdown(startDate, endDate);
    res.json({ success: true, data: breakdown });
  } catch (error: any) {
    console.error('Error fetching service breakdown:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch service breakdown',
    });
  }
});

/**
 * GET /api/statistics/receipts/recent
 * Get recent receipts across all subscriptions
 * Query params: limit, startDate, endDate, status, serviceId, userAddress
 */
router.get('/receipts/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const status = req.query.status as string | undefined;
    const serviceId = req.query.serviceId as string | undefined;
    const userAddress = req.query.userAddress as string | undefined;

    const receipts = await subscriptionService.getRecentReceipts(limit, {
      startDate,
      endDate,
      status,
      serviceId,
      userAddress,
    });

    res.json({ success: true, data: receipts });
  } catch (error: any) {
    console.error('Error fetching recent receipts:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch recent receipts',
    });
  }
});

/**
 * GET /api/statistics/receipts/payer/:userAddress
 * Get payer-specific receipt queries
 * Query params: startDate, endDate, status, serviceId, limit
 */
router.get('/receipts/payer/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const status = req.query.status as string | undefined;
    const serviceId = req.query.serviceId as string | undefined;
    const limit = parseInt(req.query.limit as string) || 100;

    const receipts = await subscriptionService.getPayerReceipts(userAddress, {
      startDate,
      endDate,
      status,
      serviceId,
      limit,
    });

    res.json({ success: true, data: receipts });
  } catch (error: any) {
    console.error('Error fetching payer receipts:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch payer receipts',
    });
  }
});

export default router;





