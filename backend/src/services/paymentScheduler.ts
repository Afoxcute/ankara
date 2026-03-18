import { prisma } from '../lib/prisma';
import { addAutoPayJob } from '../queue/autoPayQueue';
import { SubscriptionService } from './subscriptionService';

const subscriptionService = new SubscriptionService();

/**
 * Check for subscriptions with due payments and queue them for auto-pay
 */
export async function checkAndQueueDuePayments(): Promise<{
  checked: number;
  queued: number;
  errors: string[];
}> {
  const now = new Date();
  const errors: string[] = [];
  let queued = 0;

  try {
    // Find all active subscriptions with auto-pay enabled and due payments
    const dueSubscriptions = await prisma.subscription.findMany({
      where: {
        isActive: true,
        autoPay: true,
        nextPaymentDate: {
          lte: now,
        },
      },
      include: {
        service: true,
      },
    });

    console.log(`[PAYMENT_SCHEDULER] Found ${dueSubscriptions.length} subscriptions with due payments`);

    for (const subscription of dueSubscriptions) {
      try {
        // Check if there's already a pending job for this subscription
        // (to avoid duplicate payments)
        const existingJobs = await prisma.payment.findMany({
          where: {
            subscriptionId: subscription.id,
            status: 'pending',
            timestamp: {
              gte: new Date(now.getTime() - 60000), // Within last minute
            },
          },
        });

        if (existingJobs.length > 0) {
          console.log(`[PAYMENT_SCHEDULER] Skipping subscription ${subscription.id} - payment already in progress`);
          continue;
        }

        // Queue the payment job
        await addAutoPayJob({
          subscriptionId: subscription.id,
          userAddress: subscription.userAddress,
          amount: typeof subscription.cost === 'object' && 'toNumber' in subscription.cost
            ? (subscription.cost as any).toNumber()
            : typeof subscription.cost === 'string'
            ? parseFloat(subscription.cost)
            : subscription.cost,
          recipientAddress: subscription.recipientAddress,
          serviceName: subscription.service?.name || 'Unknown Service',
        });

        queued++;
        console.log(`[PAYMENT_SCHEDULER] Queued payment for subscription ${subscription.id}`);
      } catch (error) {
        const errorMsg = `Failed to queue payment for subscription ${subscription.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`[PAYMENT_SCHEDULER] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    return {
      checked: dueSubscriptions.length,
      queued,
      errors,
    };
  } catch (error) {
    console.error('[PAYMENT_SCHEDULER] Error checking due payments:', error);
    throw error;
  }
}

/**
 * Start the payment scheduler (runs every 5 minutes)
 */
export function startPaymentScheduler(intervalMinutes: number = 5): NodeJS.Timeout {
  console.log(`[PAYMENT_SCHEDULER] Starting payment scheduler (checking every ${intervalMinutes} minutes)`);

  // Run immediately on start
  checkAndQueueDuePayments().catch(error => {
    console.error('[PAYMENT_SCHEDULER] Error in initial payment check:', error);
  });

  // Then run at intervals
  const interval = setInterval(() => {
    checkAndQueueDuePayments().catch(error => {
      console.error('[PAYMENT_SCHEDULER] Error in scheduled payment check:', error);
    });
  }, intervalMinutes * 60 * 1000);

  return interval;
}







