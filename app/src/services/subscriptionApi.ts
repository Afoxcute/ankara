import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Subscription {
  id: string;
  serviceId: string;
  userAddress: string;
  cost: number | string; // Can be number, string, or Decimal from Prisma
  frequency: 'monthly' | 'weekly' | 'yearly';
  recipientAddress: string;
  lastPaymentDate: string | null;
  nextPaymentDate: string;
  isActive: boolean;
  autoPay: boolean;
  onChainSubscriptionId?: string | null; // SubscriptionManager contract id (uint256 as string)
  usageData?: {
    lastUsed?: string;
    usageCount?: number;
    avgUsagePerMonth?: number;
    /**
     * When a subscription is paid via x402 (off-chain),
     * indicates which Polkadot Hub stablecoin to use.
     */
    stablecoin?: 'USDC' | 'USDt';
  };
  service?: {
    id: string;
    name: string;
    description?: string;
    cost: number | string; // Can be number, string, or Decimal from Prisma
    frequency: string;
    recipientAddress: string;
  };
  payments?: Payment[];
}

export interface Payment {
  id: string;
  subscriptionId: string;
  amount: number;
  transactionHash: string;
  network: string;
  status: string;
  errorMessage?: string;
  timestamp: string;
}

/** Service from GET /api/services — available for any user to subscribe to */
export interface Service {
  id: string;
  name: string;
  description?: string | null;
  cost: number;
  frequency: string;
  recipientAddress: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionInput {
  serviceId?: string;
  serviceName?: string;
  cost: number;
  frequency: 'monthly' | 'weekly' | 'yearly';
  recipientAddress: string;
  userAddress: string;
  autoPay?: boolean;
  onChainSubscriptionId?: string;
  onChainContractAddress?: string; // So we only show this subscription when using this contract
  usageData?: {
    lastUsed?: Date;
    usageCount?: number;
    avgUsagePerMonth?: number;
    stablecoin?: 'USDC' | 'USDt';
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
    stablecoin?: 'USDC' | 'USDt';
  };
}

export const subscriptionApi = {
  /**
   * Get all services (available for any connected user to subscribe to).
   */
  async getAllServices(): Promise<Service[]> {
    const response = await api.get('/services');
    return response.data.data;
  },

  /**
   * Get all subscriptions for a user. Pass contractAddress to only show subscriptions for the current contract.
   */
  async getUserSubscriptions(userAddress: string, contractAddress?: string): Promise<Subscription[]> {
    const params = contractAddress ? { contractAddress } : {};
    const response = await api.get(`/subscriptions/user/${userAddress}`, { params });
    return response.data.data;
  },

  /**
   * Get a single subscription by ID
   */
  async getSubscription(id: string): Promise<Subscription> {
    const response = await api.get(`/subscriptions/${id}`);
    return response.data.data;
  },

  /**
   * Create a new subscription
   */
  async createSubscription(input: CreateSubscriptionInput): Promise<Subscription> {
    const response = await api.post('/subscriptions', input);
    return response.data.data;
  },

  /**
   * Update a subscription
   */
  async updateSubscription(id: string, input: UpdateSubscriptionInput): Promise<Subscription> {
    const response = await api.put(`/subscriptions/${id}`, input);
    return response.data.data;
  },

  /**
   * Delete (deactivate) a subscription
   */
  async deleteSubscription(id: string): Promise<void> {
    await api.delete(`/subscriptions/${id}`);
  },

  /**
   * Toggle auto-pay for a subscription
   */
  async toggleAutoPay(id: string): Promise<Subscription> {
    const response = await api.patch(`/subscriptions/${id}/auto-pay`);
    return response.data.data;
  },

  /**
   * Record a payment
   */
  async recordPayment(
    subscriptionId: string,
    amount: number,
    transactionHash: string,
    network: string = 'polkadot-testnet',
    status: string = 'completed',
    errorMessage?: string
  ): Promise<any> {
    const response = await api.post(`/subscriptions/${subscriptionId}/payments`, {
      amount,
      transactionHash,
      network,
      status,
      errorMessage,
    });
    return response.data.data;
  },

  /**
   * Get payment history for a subscription
   */
  async getPaymentHistory(subscriptionId: string, limit: number = 50): Promise<Payment[]> {
    const response = await api.get(`/subscriptions/${subscriptionId}/payments`, {
      params: { limit },
    });
    return response.data.data;
  },
};

// Statistics API Types
export interface StatisticsSummary {
  totalPayments: number;
  completedPayments: number;
  failedPayments: number;
  successRate: number;
  totalRevenue: number;
  averagePaymentAmount: number;
  activeServices: number;
  uniquePayers: number;
  period: {
    startDate: string | null;
    endDate: string | null;
  };
}

export interface RevenueByService {
  serviceId: string;
  serviceName: string;
  totalRevenue: number;
  paymentCount: number;
  averageAmount: number;
}

export interface PaymentSuccessRates {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  successRate: number;
  failureRate: number;
  breakdown: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
}

export interface ServiceBreakdown {
  serviceId: string;
  serviceName: string;
  totalRevenue: number;
  paymentCount: number;
  averageAmount: number;
  minAmount: number;
  maxAmount: number;
  uniquePayers: number;
  frequencyBreakdown: Record<string, number>;
}

export interface RecentReceipt {
  id: string;
  amount: number;
  transactionHash: string;
  network: string;
  status: string;
  errorMessage?: string;
  timestamp: string;
  payer: {
    address: string;
  };
  service: {
    id: string;
    name: string;
  };
  subscription: {
    id: string;
    frequency: string;
  };
}

export interface PayerReceipts {
  payer: string;
  totalReceipts: number;
  totalAmount: number;
  completedCount: number;
  failedCount: number;
  receipts: Array<{
    id: string;
    amount: number;
    transactionHash: string;
    network: string;
    status: string;
    errorMessage?: string;
    timestamp: string;
    service: {
      id: string;
      name: string;
    };
    subscription: {
      id: string;
      frequency: string;
    };
  }>;
}

export const statisticsApi = {
  /**
   * Get overall statistics summary
   */
  async getSummary(startDate?: string, endDate?: string): Promise<StatisticsSummary> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    const response = await api.get('/statistics/summary', { params });
    return response.data.data;
  },

  /**
   * Get revenue statistics by service
   */
  async getRevenueByService(startDate?: string, endDate?: string): Promise<RevenueByService[]> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    const response = await api.get('/statistics/revenue-by-service', { params });
    return response.data.data;
  },

  /**
   * Get payment success/failure rates
   */
  async getSuccessRates(startDate?: string, endDate?: string): Promise<PaymentSuccessRates> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    const response = await api.get('/statistics/success-rates', { params });
    return response.data.data;
  },

  /**
   * Get detailed service breakdown analytics
   */
  async getServiceBreakdown(startDate?: string, endDate?: string): Promise<ServiceBreakdown[]> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    const response = await api.get('/statistics/service-breakdown', { params });
    return response.data.data;
  },

  /**
   * Get recent receipts
   */
  async getRecentReceipts(options?: {
    limit?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
    serviceId?: string;
    userAddress?: string;
  }): Promise<RecentReceipt[]> {
    const params: any = {};
    if (options?.limit) params.limit = options.limit;
    if (options?.startDate) params.startDate = options.startDate;
    if (options?.endDate) params.endDate = options.endDate;
    if (options?.status) params.status = options.status;
    if (options?.serviceId) params.serviceId = options.serviceId;
    if (options?.userAddress) params.userAddress = options.userAddress;
    
    const response = await api.get('/statistics/receipts/recent', { params });
    return response.data.data;
  },

  /**
   * Get payer-specific receipts
   */
  async getPayerReceipts(
    userAddress: string,
    options?: {
      startDate?: string;
      endDate?: string;
      status?: string;
      serviceId?: string;
      limit?: number;
    }
  ): Promise<PayerReceipts> {
    const params: any = {};
    if (options?.startDate) params.startDate = options.startDate;
    if (options?.endDate) params.endDate = options.endDate;
    if (options?.status) params.status = options.status;
    if (options?.serviceId) params.serviceId = options.serviceId;
    if (options?.limit) params.limit = options.limit;
    
    const response = await api.get(`/statistics/receipts/payer/${userAddress}`, { params });
    return response.data.data;
  },
};

// Failed Payment Types
export interface FailedPayment {
  id: string;
  subscriptionId: string;
  userAddress: string;
  amount: number;
  errorCategory: string;
  errorMessage: string;
  attemptNumber: number;
  timestamp: string;
  retryable: boolean;
  nextRetryAt?: string;
}

export interface FailedPaymentStats {
  total: number;
  byCategory: Record<string, number>;
  retryable: number;
  nonRetryable: number;
  recentFailures: FailedPayment[];
}

export interface FailedPaymentsResponse {
  subscriptionId: string;
  failedPayments: FailedPayment[];
  count: number;
}

export const failedPaymentsApi = {
  /**
   * Get failed payments for a subscription
   */
  async getFailedPayments(subscriptionId: string, limit: number = 10): Promise<FailedPaymentsResponse> {
    const params: any = {};
    if (limit) params.limit = limit;
    
    const response = await api.get(`/failed-payments/subscription/${subscriptionId}`, { params });
    return response.data.data;
  },

  /**
   * Get failed payment statistics
   */
  async getFailedPaymentStats(options?: {
    userAddress?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<FailedPaymentStats> {
    const params: any = {};
    if (options?.userAddress) params.userAddress = options.userAddress;
    if (options?.startDate) params.startDate = options.startDate;
    if (options?.endDate) params.endDate = options.endDate;
    
    const response = await api.get('/failed-payments/stats', { params });
    return response.data.data;
  },
};

