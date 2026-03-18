import { ThirdwebClient } from "thirdweb";
import { parseUnits } from "viem";
import {
  createX402PaymentService,
  X402PaymentService,
  PaymentRequirements,
  USDC_TESTNET,
  USDT_TESTNET,
} from "./x402PaymentService";
import { subscriptionApi, Subscription as ApiSubscription } from "./subscriptionApi";
import { SUBSCRIPTION_CONTRACT_ADDRESS } from "../contracts/config";

export interface Subscription {
  id: string;
  service: string;
  cost: number; // human amount (PAS or stablecoin depending on paymentToken)
  frequency: 'monthly' | 'weekly' | 'yearly';
  recipientAddress: string; // Service provider wallet address
  lastPaymentDate: Date | null;
  nextPaymentDate: Date;
  isActive: boolean;
  autoPay: boolean;
  paymentToken: 'PAS' | 'USDC' | 'USDt';
  onChainSubscriptionId?: string | null; // SubscriptionManager contract id when created on-chain
  usageData?: {
    lastUsed?: Date;
    usageCount?: number;
    avgUsagePerMonth?: number;
    stablecoin?: 'USDC' | 'USDt';
  };
}

// Helper to convert API subscription to local format
function apiToLocalSubscription(apiSub: ApiSubscription): Subscription {
  // Handle cost conversion - it can be number, string, or Decimal
  let costValue: number;
  if (typeof apiSub.cost === 'number') {
    costValue = apiSub.cost;
  } else if (typeof apiSub.cost === 'string') {
    costValue = parseFloat(apiSub.cost);
  } else {
    // Handle Decimal type from Prisma
    costValue = parseFloat(String(apiSub.cost));
  }

  const stablecoin = apiSub.usageData?.stablecoin;
  const paymentToken: 'PAS' | 'USDC' | 'USDt' =
    apiSub.onChainSubscriptionId ? 'PAS' : stablecoin === 'USDt' ? 'USDt' : 'USDC';

  return {
    id: apiSub.id,
    service: apiSub.service?.name || 'Unknown Service',
    cost: costValue,
    frequency: apiSub.frequency as 'monthly' | 'weekly' | 'yearly',
    recipientAddress: apiSub.recipientAddress,
    lastPaymentDate: apiSub.lastPaymentDate ? new Date(apiSub.lastPaymentDate) : null,
    nextPaymentDate: new Date(apiSub.nextPaymentDate),
    isActive: apiSub.isActive,
    autoPay: apiSub.autoPay,
    onChainSubscriptionId: apiSub.onChainSubscriptionId ?? undefined,
    paymentToken,
    usageData: apiSub.usageData ? {
      lastUsed: apiSub.usageData.lastUsed ? new Date(apiSub.usageData.lastUsed) : undefined,
      usageCount: apiSub.usageData.usageCount,
      avgUsagePerMonth: apiSub.usageData.avgUsagePerMonth,
      stablecoin: apiSub.usageData.stablecoin,
    } : undefined,
  };
}

export interface PaymentResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export interface AISuggestion {
  type: 'SAVINGS_OPPORTUNITY' | 'USAGE_ALERT' | 'PAYMENT_REMINDER';
  message: string;
  subscriptions: Subscription[];
  potentialSavings?: number;
}

/**
 * Subscription Agent Service
 * Manages crypto subscriptions and auto-payments
 */
export class SubscriptionAgent {
  private subscriptions: Map<string, Subscription> = new Map();
  private paymentHistory: Map<string, Date[]> = new Map();
  private x402Service: X402PaymentService;
  private userAddress: string | null = null;

  constructor(client: ThirdwebClient) {
    this.x402Service = createX402PaymentService(client, 'polkadot-testnet');
  }

  /**
   * Set user address and load subscriptions from API
   */
  async setUserAddress(userAddress: string) {
    this.userAddress = userAddress;
    await this.loadFromAPI();
  }

  /**
   * Get all subscriptions
   */
  getAllSubscriptions(): Subscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Get active subscriptions
   */
  getActiveSubscriptions(): Subscription[] {
    return this.getAllSubscriptions().filter(sub => sub.isActive);
  }

  /**
   * Load subscriptions from API
   */
  async loadFromAPI() {
    if (!this.userAddress) {
      console.warn('User address not set, cannot load subscriptions');
      return;
    }

    try {
      const contractAddress = SUBSCRIPTION_CONTRACT_ADDRESS || undefined;
      const apiSubscriptions = await subscriptionApi.getUserSubscriptions(this.userAddress, contractAddress);
      this.subscriptions.clear();
      apiSubscriptions.forEach(apiSub => {
        const localSub = apiToLocalSubscription(apiSub);
        this.subscriptions.set(localSub.id, localSub);
      });
    } catch (error) {
      console.error('Failed to load subscriptions from API:', error);
    }
  }

  /**
   * Add a new subscription
   */
  async addSubscription(subscription: Omit<Subscription, 'id' | 'lastPaymentDate' | 'nextPaymentDate'>): Promise<Subscription> {
    if (!this.userAddress) {
      throw new Error('User address not set');
    }

    try {
      const apiSub = await subscriptionApi.createSubscription({
        serviceName: subscription.service,
        cost: subscription.cost,
        frequency: subscription.frequency,
        recipientAddress: subscription.recipientAddress,
        userAddress: this.userAddress,
        autoPay: subscription.autoPay,
        usageData: subscription.usageData,
      });

      const localSub = apiToLocalSubscription(apiSub);
      this.subscriptions.set(localSub.id, localSub);
      return localSub;
    } catch (error) {
      console.error('Failed to create subscription:', error);
      throw error;
    }
  }

  /**
   * Update an existing subscription
   */
  async updateSubscription(
    id: string,
    updates: Partial<Omit<Subscription, 'id' | 'lastPaymentDate' | 'nextPaymentDate'>>
  ): Promise<boolean> {
    try {
      const updateData: any = {};
      if (updates.service !== undefined) updateData.serviceName = updates.service;
      if (updates.cost !== undefined) updateData.cost = updates.cost;
      if (updates.frequency !== undefined) updateData.frequency = updates.frequency;
      if (updates.recipientAddress !== undefined) updateData.recipientAddress = updates.recipientAddress;
      if (updates.autoPay !== undefined) updateData.autoPay = updates.autoPay;
      if (updates.usageData !== undefined) updateData.usageData = updates.usageData;

      const apiSub = await subscriptionApi.updateSubscription(id, updateData);
      const localSub = apiToLocalSubscription(apiSub);
      this.subscriptions.set(id, localSub);
      return true;
    } catch (error) {
      console.error('Failed to update subscription:', error);
      return false;
    }
  }

  /**
   * Get a subscription by ID
   */
  getSubscription(id: string): Subscription | undefined {
    return this.subscriptions.get(id);
  }

  /**
   * Remove a subscription
   */
  async removeSubscription(id: string): Promise<boolean> {
    try {
      await subscriptionApi.deleteSubscription(id);
      const sub = this.subscriptions.get(id);
      if (sub) {
        sub.isActive = false;
        this.subscriptions.set(id, sub);
      }
      return true;
    } catch (error) {
      console.error('Failed to delete subscription:', error);
      return false;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(id: string): Promise<boolean> {
    return this.removeSubscription(id);
  }

  /**
   * Check if payment is due for a subscription
   */
  async checkPaymentDue(subscription: Subscription): Promise<boolean> {
    const now = new Date();
    return subscription.isActive && 
           subscription.autoPay && 
           subscription.nextPaymentDate <= now;
  }

  /**
   * Auto-pay a subscription via x402 protocol
   */
  async autoPaySubscription(
    account: any,
    subscription: Subscription
  ): Promise<PaymentResult> {
    try {
      if (!account?.address) {
        return { success: false, error: 'Wallet not connected' };
      }

      // Off-chain stablecoin auto-pay uses Polkadot Hub's native stablecoin precompile (6 decimals).
      const stablecoin = subscription.paymentToken === 'USDt' ? 'USDt' : 'USDC';
      const assetAddress = stablecoin === 'USDt' ? USDT_TESTNET : USDC_TESTNET;
      const amountInBaseUnits = parseUnits(subscription.cost.toString(), 6).toString();

      // Create payment requirements for x402
      const paymentRequirements: PaymentRequirements = {
        scheme: 'exact',
        network: 'polkadot-testnet',
        payTo: subscription.recipientAddress,
        asset: assetAddress,
        maxAmountRequired: amountInBaseUnits,
        maxTimeoutSeconds: 300, // 5 minutes
        description: `Subscription payment for ${subscription.service}`,
        mimeType: 'application/json',
      };

      // Pay using x402 protocol
      const settleResult = await this.x402Service.pay(account, paymentRequirements);

      if (settleResult.event === 'payment.failed') {
        return {
          success: false,
          error: settleResult.error || 'Payment settlement failed',
        };
      }

      // Record payment in database
      try {
        await subscriptionApi.recordPayment(
          subscription.id,
          subscription.cost,
          settleResult.txHash || '',
          'polkadot-testnet',
          'completed'
        );
      } catch (error) {
        console.error('Failed to record payment in database:', error);
        // Continue even if recording fails
      }

      // Update local state
      subscription.lastPaymentDate = new Date();
      subscription.nextPaymentDate = this.getNextPaymentDate(subscription.frequency);
      this.subscriptions.set(subscription.id, subscription);

      // Track payment history
      const history = this.paymentHistory.get(subscription.id) || [];
      history.push(new Date());
      this.paymentHistory.set(subscription.id, history);

      return {
        success: true,
        transactionHash: settleResult.txHash,
      };
    } catch (error) {
      console.error('Payment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed',
      };
    }
  }

  /**
   * Manage all subscriptions - check and auto-pay
   */
  async manageSubscriptions(account: any): Promise<PaymentResult[]> {
    const results: PaymentResult[] = [];
    const subscriptions = this.getActiveSubscriptions();

    for (const sub of subscriptions) {
      const isDue = await this.checkPaymentDue(sub);
      
      if (isDue) {
        const result = await this.autoPaySubscription(account, sub);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * AI-powered cancellation suggestions
   */
  async suggestCancellations(): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = [];
    const unused = await this.findUnusedSubscriptions();

    if (unused.length > 0) {
      const savings = this.calculateSavings(unused);
      suggestions.push({
        type: 'SAVINGS_OPPORTUNITY',
        message: `Cancel ${unused.length} unused subscription${unused.length > 1 ? 's' : ''} to save $${savings.toFixed(3)}/month`,
        subscriptions: unused,
        potentialSavings: savings,
      });
    }

    // Check for low usage subscriptions
    const lowUsage = this.findLowUsageSubscriptions();
    if (lowUsage.length > 0) {
      const savings = this.calculateSavings(lowUsage);
      suggestions.push({
        type: 'USAGE_ALERT',
        message: `${lowUsage.length} subscription${lowUsage.length > 1 ? 's have' : ' has'} low usage. Consider canceling to save $${savings.toFixed(3)}/month`,
        subscriptions: lowUsage,
        potentialSavings: savings,
      });
    }

    return suggestions;
  }

  /**
   * Find unused subscriptions (no usage in last 30 days)
   */
  private async findUnusedSubscriptions(): Promise<Subscription[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return this.getActiveSubscriptions().filter(sub => {
      if (!sub.usageData?.lastUsed) return true;
      return sub.usageData.lastUsed < thirtyDaysAgo;
    });
  }

  /**
   * Find low usage subscriptions
   */
  private findLowUsageSubscriptions(): Subscription[] {
    return this.getActiveSubscriptions().filter(sub => {
      if (!sub.usageData) return false;
      // Consider low usage if less than 5 uses per month
      return (sub.usageData.avgUsagePerMonth || 0) < 5;
    });
  }

  /**
   * Calculate potential savings
   */
  private calculateSavings(subscriptions: Subscription[]): number {
    return subscriptions.reduce((total, sub) => {
      if (sub.frequency === 'monthly') {
        return total + sub.cost;
      } else if (sub.frequency === 'weekly') {
        return total + (sub.cost * 4); // Approximate monthly
      } else if (sub.frequency === 'yearly') {
        return total + (sub.cost / 12); // Monthly portion
      }
      return total;
    }, 0);
  }

  /**
   * Get next payment date based on frequency
   */
  private getNextPaymentDate(frequency: 'monthly' | 'weekly' | 'yearly'): Date {
    const date = new Date();
    if (frequency === 'monthly') {
      date.setMonth(date.getMonth() + 1);
    } else if (frequency === 'weekly') {
      date.setDate(date.getDate() + 7);
    } else if (frequency === 'yearly') {
      date.setFullYear(date.getFullYear() + 1);
    }
    return date;
  }

  /**
   * Toggle auto-pay for a subscription
   */
  async toggleAutoPay(id: string): Promise<boolean> {
    try {
      const apiSub = await subscriptionApi.toggleAutoPay(id);
      const localSub = apiToLocalSubscription(apiSub);
      this.subscriptions.set(id, localSub);
      return true;
    } catch (error) {
      console.error('Failed to toggle auto-pay:', error);
      return false;
    }
  }

  /**
   * Get payment history for a subscription
   */
  getPaymentHistory(id: string): Date[] {
    return this.paymentHistory.get(id) || [];
  }

}

/**
 * Factory function to create subscription agent
 * Loads subscriptions from localStorage automatically
 */
export function createSubscriptionAgent(client: ThirdwebClient): SubscriptionAgent {
  return new SubscriptionAgent(client);
}

