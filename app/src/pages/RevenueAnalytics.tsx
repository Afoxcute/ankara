import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import {
  statisticsApi,
  StatisticsSummary,
  RevenueByService,
  PaymentSuccessRates,
  ServiceBreakdown,
  RecentReceipt,
  PayerReceipts,
  failedPaymentsApi,
  FailedPaymentStats,
} from "../services/subscriptionApi";
import "./RevenueAnalytics.css";

interface RevenueAnalyticsProps {
  merchantAddress?: string;
}

export default function RevenueAnalytics({ merchantAddress }: RevenueAnalyticsProps) {
  const account = useActiveAccount();
  const [activeTab, setActiveTab] = useState<'summary' | 'revenue' | 'success' | 'breakdown' | 'receipts' | 'failed'>('summary');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Data states
  const [summary, setSummary] = useState<StatisticsSummary | null>(null);
  const [revenueByService, setRevenueByService] = useState<RevenueByService[]>([]);
  const [successRates, setSuccessRates] = useState<PaymentSuccessRates | null>(null);
  const [serviceBreakdown, setServiceBreakdown] = useState<ServiceBreakdown[]>([]);
  const [recentReceipts, setRecentReceipts] = useState<RecentReceipt[]>([]);
  const [payerReceipts, setPayerReceipts] = useState<PayerReceipts | null>(null);
  const [failedPaymentsStats, setFailedPaymentsStats] = useState<FailedPaymentStats | null>(null);

  // Load data based on active tab
  useEffect(() => {
    loadData();
  }, [activeTab, startDate, endDate, account?.address]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const dateParams = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      switch (activeTab) {
        case 'summary':
          const summaryData = await statisticsApi.getSummary(
            dateParams.startDate,
            dateParams.endDate,
            merchantAddress
          );
          setSummary(summaryData);
          break;

        case 'revenue':
          const revenueData = await statisticsApi.getRevenueByService(
            dateParams.startDate,
            dateParams.endDate,
            merchantAddress
          );
          setRevenueByService(revenueData);
          break;

        case 'success':
          const ratesData = await statisticsApi.getSuccessRates(
            dateParams.startDate,
            dateParams.endDate,
            merchantAddress
          );
          setSuccessRates(ratesData);
          break;

        case 'breakdown':
          const breakdownData = await statisticsApi.getServiceBreakdown(
            dateParams.startDate,
            dateParams.endDate,
            merchantAddress
          );
          setServiceBreakdown(breakdownData);
          break;

        case 'receipts':
          if (merchantAddress) {
            const merchantReceipts = await statisticsApi.getRecentReceipts({
              ...dateParams,
              recipientAddress: merchantAddress,
              limit: 50,
            });
            setRecentReceipts(merchantReceipts);
            setPayerReceipts(null);
          } else if (account?.address) {
            const payerData = await statisticsApi.getPayerReceipts(account.address, {
              ...dateParams,
              limit: 50,
            });
            setPayerReceipts(payerData);
            setRecentReceipts([]);
          } else {
            const recentData = await statisticsApi.getRecentReceipts({
              ...dateParams,
              limit: 50,
            });
            setRecentReceipts(recentData);
            setPayerReceipts(null);
          }
          break;
        case 'failed':
          const failedStats = await failedPaymentsApi.getFailedPaymentStats({
            userAddress: account?.address,
            ...dateParams,
          });
          setFailedPaymentsStats(failedStats);
          break;
      }
    } catch (err) {
      console.error('Error loading statistics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="revenue-analytics">
      <div className="analytics-header">
        <h1>📊 Revenue Analytics</h1>
        <div className="date-filters">
          <label>
            Start Date:
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label>
            End Date:
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
          <button onClick={loadData} disabled={loading}>
            {loading ? 'Loading...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="analytics-tabs">
        <button
          className={activeTab === 'summary' ? 'active' : ''}
          onClick={() => setActiveTab('summary')}
        >
          📈 Summary
        </button>
        <button
          className={activeTab === 'revenue' ? 'active' : ''}
          onClick={() => setActiveTab('revenue')}
        >
          💰 Revenue by Service
        </button>
        <button
          className={activeTab === 'success' ? 'active' : ''}
          onClick={() => setActiveTab('success')}
        >
          ✅ Success Rates
        </button>
        <button
          className={activeTab === 'breakdown' ? 'active' : ''}
          onClick={() => setActiveTab('breakdown')}
        >
          📋 Service Breakdown
        </button>
        <button
          className={activeTab === 'receipts' ? 'active' : ''}
          onClick={() => setActiveTab('receipts')}
        >
          🧾 Receipts
        </button>
        <button
          className={activeTab === 'failed' ? 'active' : ''}
          onClick={() => setActiveTab('failed')}
        >
          ⚠️ Failed Payments
        </button>
      </div>

      {/* Content */}
      <div className="analytics-content">
        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        {loading && (
          <div className="loading">Loading statistics...</div>
        )}

        {!loading && !error && (
          <>
            {/* Summary Tab */}
            {activeTab === 'summary' && summary && (
              <div className="summary-grid">
                <div className="stat-card">
                  <h3>Total Revenue</h3>
                  <p className="stat-value">{formatCurrency(summary.totalRevenue)}</p>
                </div>
                <div className="stat-card">
                  <h3>Total Payments</h3>
                  <p className="stat-value">{summary.totalPayments}</p>
                </div>
                <div className="stat-card">
                  <h3>Success Rate</h3>
                  <p className="stat-value">{formatPercentage(summary.successRate)}</p>
                </div>
                <div className="stat-card">
                  <h3>Average Payment</h3>
                  <p className="stat-value">{formatCurrency(summary.averagePaymentAmount)}</p>
                </div>
                <div className="stat-card">
                  <h3>Active Services</h3>
                  <p className="stat-value">{summary.activeServices}</p>
                </div>
                <div className="stat-card">
                  <h3>Unique Payers</h3>
                  <p className="stat-value">{summary.uniquePayers}</p>
                </div>
                <div className="stat-card">
                  <h3>Completed Payments</h3>
                  <p className="stat-value">{summary.completedPayments}</p>
                </div>
                <div className="stat-card">
                  <h3>Failed Payments</h3>
                  <p className="stat-value">{summary.failedPayments}</p>
                </div>
              </div>
            )}

            {/* Revenue by Service Tab */}
            {activeTab === 'revenue' && (
              <div className="revenue-table">
                <table>
                  <thead>
                    <tr>
                      <th>Service Name</th>
                      <th>Total Revenue</th>
                      <th>Payment Count</th>
                      <th>Average Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueByService.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="empty-state">No revenue data available</td>
                      </tr>
                    ) : (
                      revenueByService.map((service) => (
                        <tr key={service.serviceId}>
                          <td>{service.serviceName}</td>
                          <td className="amount">{formatCurrency(service.totalRevenue)}</td>
                          <td>{service.paymentCount}</td>
                          <td className="amount">{formatCurrency(service.averageAmount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Success Rates Tab */}
            {activeTab === 'success' && successRates && (
              <div className="success-rates">
                <div className="rates-summary">
                  <div className="rate-card success">
                    <h3>Success Rate</h3>
                    <p className="rate-value">{formatPercentage(successRates.successRate)}</p>
                    <p className="rate-count">{successRates.completed} / {successRates.total}</p>
                  </div>
                  <div className="rate-card failure">
                    <h3>Failure Rate</h3>
                    <p className="rate-value">{formatPercentage(successRates.failureRate)}</p>
                    <p className="rate-count">{successRates.failed} / {successRates.total}</p>
                  </div>
                </div>
                <div className="breakdown-list">
                  <h3>Status Breakdown</h3>
                  {successRates.breakdown.map((item) => (
                    <div key={item.status} className="breakdown-item">
                      <span className="status-badge">{item.status}</span>
                      <span className="count">{item.count} payments</span>
                      <span className="percentage">{formatPercentage(item.percentage)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Service Breakdown Tab */}
            {activeTab === 'breakdown' && (
              <div className="breakdown-grid">
                {serviceBreakdown.length === 0 ? (
                  <div className="empty-state">No service breakdown data available</div>
                ) : (
                  serviceBreakdown.map((service) => (
                    <div key={service.serviceId} className="breakdown-card">
                      <h3>{service.serviceName}</h3>
                      <div className="breakdown-stats">
                        <div className="breakdown-stat">
                          <span className="label">Total Revenue:</span>
                          <span className="value">{formatCurrency(service.totalRevenue)}</span>
                        </div>
                        <div className="breakdown-stat">
                          <span className="label">Payments:</span>
                          <span className="value">{service.paymentCount}</span>
                        </div>
                        <div className="breakdown-stat">
                          <span className="label">Average:</span>
                          <span className="value">{formatCurrency(service.averageAmount)}</span>
                        </div>
                        <div className="breakdown-stat">
                          <span className="label">Range:</span>
                          <span className="value">
                            {formatCurrency(service.minAmount)} - {formatCurrency(service.maxAmount)}
                          </span>
                        </div>
                        <div className="breakdown-stat">
                          <span className="label">Unique Payers:</span>
                          <span className="value">{service.uniquePayers}</span>
                        </div>
                        <div className="breakdown-stat">
                          <span className="label">Frequency:</span>
                          <span className="value">
                            {Object.entries(service.frequencyBreakdown).map(([freq, count]) => (
                              <span key={freq} className="freq-badge">
                                {freq}: {count}
                              </span>
                            ))}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Receipts Tab */}
            {activeTab === 'receipts' && (
              <div className="receipts-list">
                {!merchantAddress && account?.address ? (
                  payerReceipts ? (
                    <>
                      <div className="receipts-summary">
                        <h3>Your Payment History</h3>
                        <div className="summary-stats">
                          <span>Total Receipts: {payerReceipts.totalReceipts}</span>
                          <span>Total Amount: {formatCurrency(payerReceipts.totalAmount)}</span>
                          <span>Completed: {payerReceipts.completedCount}</span>
                          <span>Failed: {payerReceipts.failedCount}</span>
                        </div>
                      </div>
                      <div className="receipts-table">
                        <table>
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Service</th>
                              <th>Amount</th>
                              <th>Status</th>
                              <th>Transaction</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payerReceipts.receipts.map((receipt) => (
                              <tr key={receipt.id}>
                                <td>{formatDate(receipt.timestamp)}</td>
                                <td>{receipt.service.name}</td>
                                <td className="amount">{formatCurrency(receipt.amount)}</td>
                                <td>
                                  <span className={`status-badge ${receipt.status}`}>
                                    {receipt.status}
                                  </span>
                                </td>
                                <td>
                                  <a
                                    href={`https://blockscout-testnet.polkadot.io/tx/${receipt.transactionHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="tx-link"
                                  >
                                    {receipt.transactionHash.slice(0, 10)}...
                                  </a>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="empty-state">No receipts found</div>
                  )
                ) : (
                  <>
                    <h3>{merchantAddress ? 'Merchant Receipts' : 'Recent Receipts (All Users)'}</h3>
                    <div className="receipts-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Payer</th>
                            <th>Service</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Transaction</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentReceipts.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="empty-state">No recent receipts</td>
                            </tr>
                          ) : (
                            recentReceipts.map((receipt) => (
                              <tr key={receipt.id}>
                                <td>{formatDate(receipt.timestamp)}</td>
                                <td className="address">{receipt.payer.address.slice(0, 10)}...</td>
                                <td>{receipt.service.name}</td>
                                <td className="amount">{formatCurrency(receipt.amount)}</td>
                                <td>
                                  <span className={`status-badge ${receipt.status}`}>
                                    {receipt.status}
                                  </span>
                                </td>
                                <td>
                                  <a
                                    href={`https://blockscout-testnet.polkadot.io/tx/${receipt.transactionHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="tx-link"
                                  >
                                    {receipt.transactionHash.slice(0, 10)}...
                                  </a>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Failed Payments Tab */}
            {activeTab === 'failed' && failedPaymentsStats && (
              <div className="failed-payments-section">
                <div className="failed-payments-summary">
                  <h3>Failed Payment Statistics</h3>
                  <div className="summary-stats">
                    <div className="stat-card">
                      <h4>Total Failures</h4>
                      <p className="stat-value">{failedPaymentsStats.total}</p>
                    </div>
                    <div className="stat-card">
                      <h4>Retryable</h4>
                      <p className="stat-value">{failedPaymentsStats.retryable}</p>
                    </div>
                    <div className="stat-card">
                      <h4>Non-Retryable</h4>
                      <p className="stat-value">{failedPaymentsStats.nonRetryable}</p>
                    </div>
                  </div>
                </div>

                {/* Failure Categories */}
                {Object.keys(failedPaymentsStats.byCategory).length > 0 && (
                  <div className="failure-categories">
                    <h3>Failures by Category</h3>
                    <div className="category-list">
                      {Object.entries(failedPaymentsStats.byCategory).map(([category, count]) => (
                        <div key={category} className="category-item">
                          <span className="category-name">{category.replace(/_/g, ' ')}</span>
                          <span className="category-count">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Failures */}
                {failedPaymentsStats.recentFailures.length > 0 && (
                  <div className="recent-failures">
                    <h3>Recent Failures</h3>
                    <div className="receipts-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Category</th>
                            <th>Error</th>
                            <th>Attempt</th>
                            <th>Retryable</th>
                            <th>Next Retry</th>
                          </tr>
                        </thead>
                        <tbody>
                          {failedPaymentsStats.recentFailures.map((failure) => (
                            <tr key={failure.id}>
                              <td>{formatDate(failure.timestamp)}</td>
                              <td className="amount">{formatCurrency(failure.amount)}</td>
                              <td>
                                <span className={`category-badge ${failure.errorCategory.toLowerCase()}`}>
                                  {failure.errorCategory.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="error-message">{failure.errorMessage}</td>
                              <td>{failure.attemptNumber}</td>
                              <td>
                                <span className={`retryable-badge ${failure.retryable ? 'yes' : 'no'}`}>
                                  {failure.retryable ? 'Yes' : 'No'}
                                </span>
                              </td>
                              <td>
                                {failure.nextRetryAt ? formatDate(failure.nextRetryAt) : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {failedPaymentsStats.recentFailures.length === 0 && (
                  <div className="empty-state">
                    <p>No failed payments found</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
