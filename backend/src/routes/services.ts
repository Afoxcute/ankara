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






















