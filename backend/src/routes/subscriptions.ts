import express from 'express';
import { SubscriptionService } from '../services/subscriptionService';

const router = express.Router();
const subscriptionService = new SubscriptionService();

// Get all subscriptions for a user (optional ?contractAddress=0x... to filter by current contract)
router.get('/user/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    const contractAddress = req.query.contractAddress as string | undefined;
    console.log('Fetching subscriptions for user:', userAddress, contractAddress ? `(contract: ${contractAddress.slice(0, 10)}...)` : '');
    const subscriptions = await subscriptionService.getUserSubscriptions(userAddress, contractAddress);
    console.log('Found subscriptions:', subscriptions.length);
    res.json({ success: true, data: subscriptions });
  } catch (error: any) {
    console.error('Error fetching subscriptions:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch subscriptions',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// Get a single subscription
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const subscription = await subscriptionService.getSubscription(id);
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found',
      });
    }

    res.json({ success: true, data: subscription });
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch subscription',
    });
  }
});

// Create a new subscription
router.post('/', async (req, res) => {
  try {
    const subscription = await subscriptionService.createSubscription(req.body);
    res.status(201).json({ success: true, data: subscription });
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create subscription',
    });
  }
});

// Update a subscription
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const subscription = await subscriptionService.updateSubscription(id, req.body);
    res.json({ success: true, data: subscription });
  } catch (error: any) {
    console.error('Error updating subscription:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update subscription',
    });
  }
});

// Delete (deactivate) a subscription
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await subscriptionService.deleteSubscription(id);
    res.json({ success: true, message: 'Subscription deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting subscription:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to delete subscription',
    });
  }
});

// Toggle auto-pay
router.patch('/:id/auto-pay', async (req, res) => {
  try {
    const { id } = req.params;
    const subscription = await subscriptionService.toggleAutoPay(id);
    res.json({ success: true, data: subscription });
  } catch (error: any) {
    console.error('Error toggling auto-pay:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to toggle auto-pay',
    });
  }
});

// Record a payment
router.post('/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, transactionHash, network, status, errorMessage } = req.body;

    if (!amount || !transactionHash) {
      return res.status(400).json({
        success: false,
        error: 'Amount and transactionHash are required',
      });
    }

    const result = await subscriptionService.recordPayment(
      id,
      amount,
      transactionHash,
      network || 'polkadot-testnet',
      status || 'completed',
      errorMessage
    );

    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error recording payment:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to record payment',
    });
  }
});

// Get payment history for a subscription
router.get('/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const payments = await subscriptionService.getPaymentHistory(id, limit);
    res.json({ success: true, data: payments });
  } catch (error: any) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch payment history',
    });
  }
});

// Manually trigger auto-pay for a subscription
router.post('/:id/trigger-payment', async (req, res) => {
  try {
    const { id } = req.params;
    const subscription = await subscriptionService.getSubscription(id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found',
      });
    }

    if (!subscription.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Subscription is not active',
      });
    }

    if (!subscription.autoPay) {
      return res.status(400).json({
        success: false,
        error: 'Auto-pay is not enabled for this subscription',
      });
    }

    // Import here to avoid circular dependency
    const { addAutoPayJob } = require('../queue/autoPayQueue');
    
    const amount = typeof subscription.cost === 'object' && 'toNumber' in subscription.cost
      ? (subscription.cost as any).toNumber()
      : typeof subscription.cost === 'string'
      ? parseFloat(subscription.cost)
      : subscription.cost;

    const job = await addAutoPayJob({
      subscriptionId: subscription.id,
      userAddress: subscription.userAddress,
      amount,
      recipientAddress: subscription.recipientAddress,
      serviceName: subscription.service?.name || 'Unknown Service',
    });

    res.json({
      success: true,
      message: 'Payment job queued successfully',
      data: {
        jobId: job.id.toString(),
        subscriptionId: subscription.id,
      },
    });
  } catch (error: any) {
    console.error('Error triggering payment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to trigger payment',
    });
  }
});

export default router;


