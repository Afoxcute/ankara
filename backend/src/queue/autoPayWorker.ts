import { Job } from 'bull';
import { autoPayQueue as getQueue, AutoPayJobData } from './autoPayQueue';
import { SubscriptionService } from '../services/subscriptionService';
import { failedPaymentTracker } from '../services/failedPaymentTracker';
import {
  categorizePaymentError,
  shouldRetry,
  calculateRetryDelay,
  ErrorCategory,
  getUserFriendlyMessage,
} from '../utils/paymentErrors';
import axios from 'axios';

const subscriptionService = new SubscriptionService();

// x402 Payment Facilitator URL
const FACILITATOR_URL = process.env.FACILITATOR_URL || '';
const USDC_TESTNET = process.env.USDC_MINT_TESTNET || '0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0';

interface PaymentResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  errorCategory?: ErrorCategory;
}

/**
 * Process auto-pay jobs from the queue
 */
function initializeWorker() {
  try {
    const queue = getQueue();
    
    queue.process(async (job: Job<AutoPayJobData>) => {
    const { subscriptionId, userAddress, amount, recipientAddress, serviceName } = job.data;
    const attemptNumber = (job.attemptsMade || 0) + 1;

    console.log(`[AUTO_PAY_WORKER] Processing job ${job.id} for subscription: ${subscriptionId} (attempt ${attemptNumber})`);

    try {
      // Update progress
      await job.progress(10);

      // Get subscription to verify it still exists and is active
      const subscription = await subscriptionService.getSubscription(subscriptionId);

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (!subscription.isActive) {
        throw new Error('Subscription is not active');
      }

      if (!subscription.autoPay) {
        throw new Error('Auto-pay is disabled for this subscription');
      }

      // Check if subscription has too many consecutive failures
      const hasTooManyFailures = await failedPaymentTracker.hasTooManyFailures(subscriptionId, 3);
      if (hasTooManyFailures) {
        throw new Error('Too many consecutive payment failures. Please check your subscription and payment method.');
      }

      // Check if payment is actually due
      const now = new Date();
      if (subscription.nextPaymentDate > now) {
        throw new Error('Payment is not due yet');
      }

      await job.progress(30);

      // Process payment via x402 protocol
      console.log(`[AUTO_PAY_WORKER] Attempting payment for subscription ${subscriptionId}`);
      console.log(`[AUTO_PAY_WORKER] Amount: ${amount}, Recipient: ${recipientAddress}`);

      await job.progress(50);

      // Attempt payment processing
      // TODO: Implement actual payment processing with wallet signing
      const paymentResult: PaymentResult = await processPayment(
        subscriptionId,
        userAddress,
        amount,
        recipientAddress,
        attemptNumber
      );

      // If payment was successful, record it
      if (paymentResult.success && paymentResult.transactionHash) {
        await job.progress(80);

        await subscriptionService.recordPayment(
          subscriptionId,
          amount,
          paymentResult.transactionHash,
          'flow-testnet',
          'completed'
        );

        await job.progress(100);

        console.log(`[AUTO_PAY_WORKER] ✅ Payment recorded successfully for subscription ${subscriptionId}`);

        return {
          success: true,
          transactionHash: paymentResult.transactionHash,
          subscriptionId,
          amount,
          attemptNumber,
        };
      } else {
        // Categorize and handle the error
        const error = new Error(paymentResult.error || 'Payment processing failed');
        const categorized = categorizePaymentError(error);

        // Record failed payment with categorization
        await subscriptionService.recordPayment(
          subscriptionId,
          amount,
          '',
          'flow-testnet',
          'failed',
          `${categorized.category}: ${categorized.message}`
        );

        // Track the failure
        const nextRetryAt = shouldRetry(categorized, attemptNumber)
          ? new Date(Date.now() + calculateRetryDelay(categorized, attemptNumber))
          : undefined;

        await failedPaymentTracker.recordFailure(
          subscriptionId,
          userAddress,
          amount,
          categorized.originalError,
          attemptNumber,
          nextRetryAt
        );

        // If retryable and within max attempts, let Bull handle the retry
        if (shouldRetry(categorized, attemptNumber)) {
          console.log(`[AUTO_PAY_WORKER] ⚠️ Payment failed (retryable): ${categorized.message}`);
          console.log(`[AUTO_PAY_WORKER] Will retry in ${calculateRetryDelay(categorized, attemptNumber)}ms`);
          throw error; // Bull will retry with exponential backoff
        } else {
          // Non-retryable error - fail immediately
          console.error(`[AUTO_PAY_WORKER] ❌ Payment failed (non-retryable): ${categorized.message}`);
          throw new Error(getUserFriendlyMessage(categorized));
        }
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      const categorized = categorizePaymentError(errorObj);

      console.error(`[AUTO_PAY_WORKER] Job ${job.id} failed (attempt ${attemptNumber}):`, {
        error: categorized.message,
        category: categorized.category,
        retryable: categorized.retryable,
      });

      // Record failed payment attempt
      try {
        await subscriptionService.recordPayment(
          subscriptionId,
          amount,
          '',
          'flow-testnet',
          'failed',
          `${categorized.category}: ${categorized.message}`
        );

        const nextRetryAt = shouldRetry(categorized, attemptNumber)
          ? new Date(Date.now() + calculateRetryDelay(categorized, attemptNumber))
          : undefined;

        await failedPaymentTracker.recordFailure(
          subscriptionId,
          userAddress,
          amount,
          categorized.originalError,
          attemptNumber,
          nextRetryAt
        );
      } catch (recordError) {
        console.error(`[AUTO_PAY_WORKER] Failed to record payment error:`, recordError);
      }

      // Re-throw to let Bull handle retries
      throw errorObj;
    }
  });

    console.log('[AUTO_PAY_WORKER] Auto-pay worker started');
  } catch (error: any) {
    console.warn('[AUTO_PAY_WORKER] Queue not available, worker not started:', error.message);
    console.warn('[AUTO_PAY_WORKER] Worker will be initialized when Redis is configured correctly');
  }
}

/**
 * Process payment (placeholder - implement actual payment logic)
 */
async function processPayment(
  subscriptionId: string,
  userAddress: string,
  amount: number,
  recipientAddress: string,
  attemptNumber: number
): Promise<PaymentResult> {
  // TODO: Implement actual payment processing
  // This is a placeholder that simulates payment processing
  
  // For now, return a failure (as auto-pay requires wallet signing)
  // In production, this would:
  // 1. Generate EIP-712 signature (requires user's private key or wallet interaction)
  // 2. Submit to x402 facilitator
  // 3. Wait for transaction confirmation
  // 4. Return success with transaction hash

  // Simulate different error types for testing
  if (attemptNumber === 1) {
    // Simulate network error on first attempt (retryable)
    return {
      success: false,
      error: 'Network error: Connection timeout',
      errorCategory: ErrorCategory.NETWORK_ERROR,
    };
  }

  // After retry, still fail (non-retryable)
  return {
    success: false,
    error: 'Auto-pay requires wallet signing. Please implement wallet signing mechanism.',
    errorCategory: ErrorCategory.WALLET_ERROR,
  };
}

// Initialize worker when module loads (but only if queue is available)
// This will be called when the module is imported, but will gracefully handle
// Redis connection issues
initializeWorker();



