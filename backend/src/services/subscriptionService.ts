import { prisma } from '../lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { cacheService, CacheKeys, CacheTTL } from '../utils/cache';

export interface CreateSubscriptionInput {
  serviceId?: string;
  serviceName?: string;
  cost: number;
  frequency: 'monthly' | 'weekly' | 'yearly';
  recipientAddress: string;
  userAddress: string;
  autoPay?: boolean;
  onChainSubscriptionId?: string; // SubscriptionManager contract subscription id (uint256 as string)
  onChainContractAddress?: string; // Contract address (e.g. SubscriptionManagerFLOW) for filtering
  usageData?: {
    lastUsed?: Date;
    usageCount?: number;
    avgUsagePerMonth?: number;
  };
}

export interface UpdateSubscriptionInput {
  serviceId?: string;
  serviceName?: string;
  cost?: number;
  frequency?: 'monthly' | 'weekly' | 'yearly';
  recipientAddress?: string;
  autoPay?: boolean;
  usageData?: {
    lastUsed?: Date;
    usageCount?: number;
    avgUsagePerMonth?: number;
  };
}

export class SubscriptionService {
  /**
   * Get all subscriptions for a user (with caching)
   */
  /**
   * Get subscriptions for a user. When SUBSCRIPTION_CONTRACT_ADDRESS is set, only returns
   * subscriptions for that contract (or with no on-chain id). Hides subscriptions from other contracts.
   */
  async getUserSubscriptions(userAddress: string, contractAddress?: string) {
    // When contractAddress is not passed, return all subscriptions (PAS, USDC, USDt, off-chain).
    const currentContract = contractAddress;
    const cacheKey = currentContract
      ? `${CacheKeys.userSubscriptions(userAddress)}:${currentContract}`
      : `${CacheKeys.userSubscriptions(userAddress)}:all`;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const where: any = {
          userAddress: userAddress.toLowerCase(),
          isActive: true,
        };
        // Only show subscriptions for the current contract (or off-chain only)
        if (currentContract) {
          const addr = currentContract.toLowerCase();
          where.AND = [
            { OR: [{ onChainContractAddress: null }, { onChainContractAddress: addr }] },
          ];
        }
        const subscriptions = await prisma.subscription.findMany({
          where,
          include: {
            service: true,
            payments: {
              orderBy: {
                timestamp: 'desc',
              },
              take: 10, // Last 10 payments
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });
        
        // Convert Decimal to number for JSON serialization
        return subscriptions.map(sub => ({
          ...sub,
          cost: this.decimalToNumber(sub.cost),
          service: sub.service ? {
            ...sub.service,
            cost: this.decimalToNumber(sub.service.cost),
          } : null,
          payments: sub.payments?.map(payment => ({
            ...payment,
            amount: this.decimalToNumber(payment.amount),
          })),
        }));
      },
      CacheTTL.USER_SUBSCRIPTIONS
    );
  }

  /**
   * Get a single subscription by ID (with caching)
   */
  async getSubscription(id: string) {
    const cacheKey = CacheKeys.subscription(id);
    
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const subscription = await prisma.subscription.findUnique({
          where: { id },
          include: {
            service: true,
            payments: {
              orderBy: {
                timestamp: 'desc',
              },
            },
          },
        });
        
        if (!subscription) {
          return null;
        }
        
        // Convert Decimal to number for JSON serialization
        return {
          ...subscription,
          cost: this.decimalToNumber(subscription.cost),
          service: subscription.service ? {
            ...subscription.service,
            cost: this.decimalToNumber(subscription.service.cost),
          } : null,
          payments: subscription.payments?.map(payment => ({
            ...payment,
            amount: this.decimalToNumber(payment.amount),
          })),
        };
      },
      CacheTTL.SUBSCRIPTION
    );
  }

  /**
   * Create a new subscription (with cache invalidation)
   */
  async createSubscription(input: CreateSubscriptionInput) {
    const { serviceId, serviceName, cost, frequency, recipientAddress, userAddress, autoPay, onChainSubscriptionId, onChainContractAddress, usageData } = input;

    // Calculate next payment date
    const nextPaymentDate = this.calculateNextPaymentDate(frequency);

    // If serviceId is provided, use it; otherwise create a new service
    let finalServiceId = serviceId;
    if (!finalServiceId && serviceName) {
      const service = await prisma.service.create({
        data: {
          name: serviceName,
          cost: new Decimal(cost),
          frequency,
          recipientAddress,
        },
      });
      finalServiceId = service.id;
      
      // Invalidate services cache
      await cacheService.invalidate(CacheKeys.allServices());
    }

    if (!finalServiceId) {
      throw new Error('Either serviceId or serviceName must be provided');
    }

    const subscription = await prisma.subscription.create({
      data: {
        serviceId: finalServiceId,
        userAddress: userAddress.toLowerCase(),
        cost: new Decimal(cost),
        frequency,
        recipientAddress,
        nextPaymentDate,
        autoPay: autoPay ?? false,
        onChainSubscriptionId: onChainSubscriptionId ?? null,
        onChainContractAddress: onChainContractAddress ? onChainContractAddress.toLowerCase() : null,
        usageData: usageData ? JSON.parse(JSON.stringify(usageData)) : null,
      },
      include: {
        service: true,
      },
    });

    // Invalidate caches (pattern so we clear key with and without contract address suffix)
    await Promise.all([
      cacheService.invalidatePattern(`${CacheKeys.userSubscriptions(userAddress)}*`),
      cacheService.invalidatePattern('stats:*'), // Invalidate all statistics
    ]);

    return subscription;
  }

  /**
   * Update a subscription (with cache invalidation)
   */
  async updateSubscription(id: string, input: UpdateSubscriptionInput) {
    // Get subscription first to get userAddress for cache invalidation
    const existingSubscription = await prisma.subscription.findUnique({
      where: { id },
      select: { userAddress: true },
    });

    if (!existingSubscription) {
      throw new Error('Subscription not found');
    }

    const updateData: any = {};

    if (input.cost !== undefined) {
      updateData.cost = new Decimal(input.cost);
    }
    if (input.frequency !== undefined) {
      updateData.frequency = input.frequency;
      // Recalculate next payment date if frequency changed
      updateData.nextPaymentDate = this.calculateNextPaymentDate(input.frequency);
    }
    if (input.recipientAddress !== undefined) {
      updateData.recipientAddress = input.recipientAddress;
    }
    if (input.autoPay !== undefined) {
      updateData.autoPay = input.autoPay;
    }
    if (input.usageData !== undefined) {
      updateData.usageData = JSON.parse(JSON.stringify(input.usageData));
    }

    const subscription = await prisma.subscription.update({
      where: { id },
      data: updateData,
      include: {
        service: true,
      },
    });

    // Invalidate caches
    await Promise.all([
      cacheService.invalidate(CacheKeys.subscription(id)),
      cacheService.invalidatePattern(`${CacheKeys.userSubscriptions(existingSubscription.userAddress)}*`),
      cacheService.invalidatePattern('stats:*'), // Invalidate all statistics
    ]);

    return subscription;
  }

  /**
   * Delete (deactivate) a subscription (with cache invalidation)
   */
  async deleteSubscription(id: string) {
    // Get subscription first to get userAddress for cache invalidation
    const existingSubscription = await prisma.subscription.findUnique({
      where: { id },
      select: { userAddress: true },
    });

    if (!existingSubscription) {
      throw new Error('Subscription not found');
    }

    const subscription = await prisma.subscription.update({
      where: { id },
      data: { isActive: false },
    });

    // Invalidate caches
    await Promise.all([
      cacheService.invalidate(CacheKeys.subscription(id)),
      cacheService.invalidatePattern(`${CacheKeys.userSubscriptions(existingSubscription.userAddress)}*`),
      cacheService.invalidatePattern('stats:*'), // Invalidate all statistics
    ]);

    return subscription;
  }

  /**
   * Toggle auto-pay for a subscription (with cache invalidation)
   */
  async toggleAutoPay(id: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: { autoPay: !subscription.autoPay },
    });

    // Invalidate caches
    await Promise.all([
      cacheService.invalidate(CacheKeys.subscription(id)),
      cacheService.invalidatePattern(`${CacheKeys.userSubscriptions(subscription.userAddress)}*`),
    ]);

    return updated;
  }

  /**
   * Record a payment (with cache invalidation)
   */
  async recordPayment(
    subscriptionId: string,
    amount: number,
    transactionHash: string,
    network: string = 'polkadot-testnet',
    status: string = 'completed',
    errorMessage?: string
  ) {
    // Update subscription's last payment date and next payment date
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const nextPaymentDate = this.calculateNextPaymentDate(subscription.frequency);

    // Use a transaction to ensure both operations succeed
    const result = await prisma.$transaction([
      prisma.payment.create({
        data: {
          subscriptionId,
          amount: new Decimal(amount),
          transactionHash,
          network,
          status,
          errorMessage,
        },
      }),
      prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          lastPaymentDate: new Date(),
          nextPaymentDate,
        },
      }),
    ]);

    // Invalidate caches
    await Promise.all([
      cacheService.invalidate(CacheKeys.subscription(subscriptionId)),
      cacheService.invalidatePattern(`${CacheKeys.userSubscriptions(subscription.userAddress)}*`),
      cacheService.invalidatePattern(`payments:subscription:${subscriptionId}*`), // Payment history
      cacheService.invalidatePattern('stats:*'), // All statistics
    ]);

    return result;
  }

  /**
   * Get payment history for a subscription (with caching)
   */
  async getPaymentHistory(subscriptionId: string, limit: number = 50) {
    const cacheKey = CacheKeys.paymentHistory(subscriptionId, limit);
    
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const payments = await prisma.payment.findMany({
          where: { subscriptionId },
          orderBy: { timestamp: 'desc' },
          take: limit,
        });
        
        // Convert Decimal amounts to numbers for JSON serialization
        return payments.map(payment => ({
          ...payment,
          amount: this.decimalToNumber(payment.amount),
        }));
      },
      CacheTTL.PAYMENT_HISTORY
    );
  }

  /**
   * Get all services (with caching)
   */
  async getAllServices() {
    const cacheKey = CacheKeys.allServices();
    
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const services = await prisma.service.findMany({
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        });
        
        // Convert Decimal to number for JSON serialization
        return services.map(service => ({
          ...service,
          cost: this.decimalToNumber(service.cost),
        }));
      },
      CacheTTL.ALL_SERVICES
    );
  }

  /**
   * Create a new service (with cache invalidation)
   */
  async createService(data: {
    name: string;
    description?: string;
    cost: number;
    frequency: string;
    recipientAddress: string;
  }) {
    const service = await prisma.service.create({
      data: {
        name: data.name,
        description: data.description,
        cost: new Decimal(data.cost),
        frequency: data.frequency,
        recipientAddress: data.recipientAddress,
      },
    });

    // Invalidate services cache
    await cacheService.invalidate(CacheKeys.allServices());

    return service;
  }

  /**
   * Calculate next payment date based on frequency
   */
  private calculateNextPaymentDate(frequency: string): Date {
    const now = new Date();
    const nextDate = new Date(now);

    switch (frequency) {
      case 'weekly':
        nextDate.setDate(now.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(now.getMonth() + 1);
        break;
      case 'yearly':
        nextDate.setFullYear(now.getFullYear() + 1);
        break;
      default:
        nextDate.setMonth(now.getMonth() + 1); // Default to monthly
    }

    return nextDate;
  }

  /**
   * Convert Decimal to number helper
   */
  private decimalToNumber(value: any): number {
    if (typeof value === 'object' && 'toNumber' in value) {
      return (value as any).toNumber();
    }
    if (typeof value === 'string') {
      return parseFloat(value);
    }
    return value;
  }

  // ==================== STATISTICS METHODS ====================

  /**
   * Get revenue statistics by service (with caching)
   */
  async getRevenueByService(startDate?: Date, endDate?: Date) {
    const cacheKey = CacheKeys.revenueByService(
      startDate?.toISOString(),
      endDate?.toISOString()
    );
    
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        return this.fetchRevenueByServiceInternal(startDate, endDate);
      },
      CacheTTL.STATISTICS
    );
  }

  /**
   * Internal method to fetch revenue by service (without cache)
   */
  private async fetchRevenueByServiceInternal(startDate?: Date, endDate?: Date) {
    const whereClause: any = {
      status: 'completed',
    };

    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) {
        whereClause.timestamp.gte = startDate;
      }
      if (endDate) {
        whereClause.timestamp.lte = endDate;
      }
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        subscription: {
          include: {
            service: true,
          },
        },
      },
    });

    // Group by service
    const serviceRevenue: Record<string, {
      serviceId: string;
      serviceName: string;
      totalRevenue: number;
      paymentCount: number;
      averageAmount: number;
    }> = {};

    payments.forEach((payment) => {
      const serviceId = payment.subscription.serviceId;
      const serviceName = payment.subscription.service?.name || 'Unknown Service';
      const amount = this.decimalToNumber(payment.amount);

      if (!serviceRevenue[serviceId]) {
        serviceRevenue[serviceId] = {
          serviceId,
          serviceName,
          totalRevenue: 0,
          paymentCount: 0,
          averageAmount: 0,
        };
      }

      serviceRevenue[serviceId].totalRevenue += amount;
      serviceRevenue[serviceId].paymentCount += 1;
    });

    // Calculate averages
    Object.values(serviceRevenue).forEach((service) => {
      service.averageAmount = service.totalRevenue / service.paymentCount;
    });

    return Object.values(serviceRevenue).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  /**
   * Get payment success/failure rates (with caching)
   */
  async getPaymentSuccessRates(startDate?: Date, endDate?: Date) {
    const cacheKey = CacheKeys.successRates(
      startDate?.toISOString(),
      endDate?.toISOString()
    );
    
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        return this.fetchPaymentSuccessRatesInternal(startDate, endDate);
      },
      CacheTTL.STATISTICS
    );
  }

  /**
   * Internal method to fetch payment success rates (without cache)
   */
  private async fetchPaymentSuccessRatesInternal(startDate?: Date, endDate?: Date) {
    const whereClause: any = {};

    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) {
        whereClause.timestamp.gte = startDate;
      }
      if (endDate) {
        whereClause.timestamp.lte = endDate;
      }
    }

    const payments = await prisma.payment.groupBy({
      by: ['status'],
      where: whereClause,
      _count: {
        id: true,
      },
    });

    const totalPayments = payments.reduce((sum, p) => sum + p._count.id, 0);
    const completed = payments.find((p) => p.status === 'completed')?._count.id || 0;
    const failed = payments.find((p) => p.status === 'failed')?._count.id || 0;
    const pending = payments.find((p) => p.status === 'pending')?._count.id || 0;

    return {
      total: totalPayments,
      completed,
      failed,
      pending,
      successRate: totalPayments > 0 ? (completed / totalPayments) * 100 : 0,
      failureRate: totalPayments > 0 ? (failed / totalPayments) * 100 : 0,
      breakdown: payments.map((p) => ({
        status: p.status,
        count: p._count.id,
        percentage: totalPayments > 0 ? (p._count.id / totalPayments) * 100 : 0,
      })),
    };
  }

  /**
   * Get service breakdown analytics (with caching)
   */
  async getServiceBreakdown(startDate?: Date, endDate?: Date) {
    const cacheKey = CacheKeys.serviceBreakdown(
      startDate?.toISOString(),
      endDate?.toISOString()
    );
    
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        return this.fetchServiceBreakdownInternal(startDate, endDate);
      },
      CacheTTL.STATISTICS
    );
  }

  /**
   * Internal method to fetch service breakdown (without cache)
   */
  private async fetchServiceBreakdownInternal(startDate?: Date, endDate?: Date) {
    const whereClause: any = {
      status: 'completed',
    };

    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) {
        whereClause.timestamp.gte = startDate;
      }
      if (endDate) {
        whereClause.timestamp.lte = endDate;
      }
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        subscription: {
          include: {
            service: true,
          },
        },
      },
    });

    // Group by service with detailed analytics
    const serviceStats: Record<string, {
      serviceId: string;
      serviceName: string;
      totalRevenue: number;
      paymentCount: number;
      averageAmount: number;
      minAmount: number;
      maxAmount: number;
      uniquePayers: Set<string>;
      frequencyBreakdown: Record<string, number>;
    }> = {};

    payments.forEach((payment) => {
      const serviceId = payment.subscription.serviceId;
      const serviceName = payment.subscription.service?.name || 'Unknown Service';
      const amount = this.decimalToNumber(payment.amount);
      const frequency = payment.subscription.frequency;
      const userAddress = payment.subscription.userAddress;

      if (!serviceStats[serviceId]) {
        serviceStats[serviceId] = {
          serviceId,
          serviceName,
          totalRevenue: 0,
          paymentCount: 0,
          averageAmount: 0,
          minAmount: Infinity,
          maxAmount: 0,
          uniquePayers: new Set(),
          frequencyBreakdown: {},
        };
      }

      const stats = serviceStats[serviceId];
      stats.totalRevenue += amount;
      stats.paymentCount += 1;
      stats.minAmount = Math.min(stats.minAmount, amount);
      stats.maxAmount = Math.max(stats.maxAmount, amount);
      stats.uniquePayers.add(userAddress);
      stats.frequencyBreakdown[frequency] = (stats.frequencyBreakdown[frequency] || 0) + 1;
    });

    // Calculate averages and format
    return Object.values(serviceStats).map((stats) => ({
      serviceId: stats.serviceId,
      serviceName: stats.serviceName,
      totalRevenue: stats.totalRevenue,
      paymentCount: stats.paymentCount,
      averageAmount: stats.totalRevenue / stats.paymentCount,
      minAmount: stats.minAmount === Infinity ? 0 : stats.minAmount,
      maxAmount: stats.maxAmount,
      uniquePayers: stats.uniquePayers.size,
      frequencyBreakdown: stats.frequencyBreakdown,
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  /**
   * Get payer-specific receipt queries
   */
  async getPayerReceipts(
    userAddress: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      status?: string;
      serviceId?: string;
      limit?: number;
    }
  ) {
    const whereClause: any = {
      subscription: {
        userAddress: userAddress.toLowerCase(),
      },
    };

    if (options?.startDate || options?.endDate) {
      whereClause.timestamp = {};
      if (options.startDate) {
        whereClause.timestamp.gte = options.startDate;
      }
      if (options.endDate) {
        whereClause.timestamp.lte = options.endDate;
      }
    }

    if (options?.status) {
      whereClause.status = options.status;
    }

    if (options?.serviceId) {
      whereClause.subscription = {
        ...whereClause.subscription,
        serviceId: options.serviceId,
      };
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        subscription: {
          include: {
            service: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: options?.limit || 100,
    });

    // Calculate summary statistics
    const totalAmount = payments.reduce((sum, p) => sum + this.decimalToNumber(p.amount), 0);
    const completedPayments = payments.filter((p) => p.status === 'completed');
    const failedPayments = payments.filter((p) => p.status === 'failed');

    return {
      payer: userAddress,
      totalReceipts: payments.length,
      totalAmount,
      completedCount: completedPayments.length,
      failedCount: failedPayments.length,
      receipts: payments.map((payment) => ({
        id: payment.id,
        amount: this.decimalToNumber(payment.amount),
        transactionHash: payment.transactionHash,
        network: payment.network,
        status: payment.status,
        errorMessage: payment.errorMessage,
        timestamp: payment.timestamp,
        service: {
          id: payment.subscription.serviceId,
          name: payment.subscription.service?.name || 'Unknown Service',
        },
        subscription: {
          id: payment.subscriptionId,
          frequency: payment.subscription.frequency,
        },
      })),
    };
  }

  /**
   * Get recent receipts across all subscriptions
   */
  async getRecentReceipts(limit: number = 50, options?: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
    serviceId?: string;
    userAddress?: string;
  }) {
    const whereClause: any = {};

    if (options?.startDate || options?.endDate) {
      whereClause.timestamp = {};
      if (options.startDate) {
        whereClause.timestamp.gte = options.startDate;
      }
      if (options.endDate) {
        whereClause.timestamp.lte = options.endDate;
      }
    }

    if (options?.status) {
      whereClause.status = options.status;
    }

    if (options?.serviceId) {
      whereClause.subscription = {
        serviceId: options.serviceId,
      };
    }

    if (options?.userAddress) {
      whereClause.subscription = {
        ...whereClause.subscription,
        userAddress: options.userAddress.toLowerCase(),
      };
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        subscription: {
          include: {
            service: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    });

    return payments.map((payment) => ({
      id: payment.id,
      amount: this.decimalToNumber(payment.amount),
      transactionHash: payment.transactionHash,
      network: payment.network,
      status: payment.status,
      errorMessage: payment.errorMessage,
      timestamp: payment.timestamp,
      payer: {
        address: payment.subscription.userAddress,
      },
      service: {
        id: payment.subscription.serviceId,
        name: payment.subscription.service?.name || 'Unknown Service',
      },
      subscription: {
        id: payment.subscriptionId,
        frequency: payment.subscription.frequency,
      },
    }));
  }

  /**
   * Get overall statistics summary (with caching)
   */
  async getStatisticsSummary(startDate?: Date, endDate?: Date) {
    const cacheKey = CacheKeys.statisticsSummary(
      startDate?.toISOString(),
      endDate?.toISOString()
    );
    
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        return this.fetchStatisticsSummaryInternal(startDate, endDate);
      },
      CacheTTL.STATISTICS
    );
  }

  /**
   * Internal method to fetch statistics summary (without cache)
   */
  private async fetchStatisticsSummaryInternal(startDate?: Date, endDate?: Date) {
    const whereClause: any = {};

    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) {
        whereClause.timestamp.gte = startDate;
      }
      if (endDate) {
        whereClause.timestamp.lte = endDate;
      }
    }

    const [totalPayments, completedPayments, totalRevenue, serviceCount, uniquePayers] = await Promise.all([
      prisma.payment.count({ where: whereClause }),
      prisma.payment.count({ where: { ...whereClause, status: 'completed' } }),
      prisma.payment.aggregate({
        where: { ...whereClause, status: 'completed' },
        _sum: { amount: true },
      }),
      prisma.service.count({ where: { isActive: true } }),
      prisma.payment.findMany({
        where: { ...whereClause, status: 'completed' },
        select: { subscription: { select: { userAddress: true } } },
        distinct: ['subscriptionId'],
      }),
    ]);

    const revenue = this.decimalToNumber(totalRevenue._sum.amount || 0);

    return {
      totalPayments,
      completedPayments,
      failedPayments: totalPayments - completedPayments,
      successRate: totalPayments > 0 ? (completedPayments / totalPayments) * 100 : 0,
      totalRevenue: revenue,
      averagePaymentAmount: completedPayments > 0 ? revenue / completedPayments : 0,
      activeServices: serviceCount,
      uniquePayers: uniquePayers.length,
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    };
  }
}




