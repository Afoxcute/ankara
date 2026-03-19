import express from 'express';
import { SubscriptionService } from '../services/subscriptionService';

const router = express.Router();
const subscriptionService = new SubscriptionService();

// Get all services
router.get('/', async (req, res) => {
  try {
    const services = await subscriptionService.getAllServices();
    res.json({ success: true, data: services });
  } catch (error: any) {
    console.error('Error fetching services:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch services',
    });
  }
});

// Get services for a merchant (merchant is the recipientAddress)
router.get('/merchant/:recipientAddress', async (req, res) => {
  try {
    const { recipientAddress } = req.params;
    const services = await subscriptionService.getMerchantServices(recipientAddress);
    res.json({ success: true, data: services });
  } catch (error: any) {
    console.error('Error fetching merchant services:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch merchant services',
    });
  }
});

// Create a new service as the merchant (merchant is identified by recipientAddress)
router.post('/merchant/:recipientAddress', async (req, res) => {
  try {
    const { recipientAddress } = req.params;
    const { name, description, cost, frequency } = req.body;

    const service = await subscriptionService.createMerchantService({
      recipientAddress,
      name,
      description,
      cost,
      frequency,
    });

    res.status(201).json({ success: true, data: service });
  } catch (error: any) {
    console.error('Error creating merchant service:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create merchant service',
    });
  }
});

// Update an existing merchant-owned service
router.put('/merchant/:recipientAddress/:serviceId', async (req, res) => {
  try {
    const { recipientAddress, serviceId } = req.params;
    const { name, description, cost, frequency } = req.body;

    const service = await subscriptionService.updateMerchantService(serviceId, recipientAddress, {
      name,
      description,
      cost,
      frequency,
    });

    res.json({ success: true, data: service });
  } catch (error: any) {
    console.error('Error updating merchant service:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update merchant service',
    });
  }
});

// Enable/disable a merchant-owned service
router.patch('/merchant/:recipientAddress/:serviceId/active', async (req, res) => {
  try {
    const { recipientAddress, serviceId } = req.params;
    const { isActive } = req.body as { isActive: boolean };

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isActive must be boolean',
      });
    }

    const service = await subscriptionService.setMerchantServiceActive(
      serviceId,
      recipientAddress,
      isActive
    );

    res.json({ success: true, data: service });
  } catch (error: any) {
    console.error('Error toggling merchant service active:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to toggle merchant service active',
    });
  }
});

// Create a new service
router.post('/', async (req, res) => {
  try {
    const service = await subscriptionService.createService(req.body);
    res.status(201).json({ success: true, data: service });
  } catch (error: any) {
    console.error('Error creating service:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create service',
    });
  }
});

export default router;






















