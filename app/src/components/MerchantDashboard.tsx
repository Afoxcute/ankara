import { useEffect, useMemo, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import {
  Payment,
  RevenueByService,
  Service,
  Subscription,
  statisticsApi,
  subscriptionApi,
} from "../services/subscriptionApi";
import PaymentHistoryItem from "./PaymentHistoryItem";
import "./MerchantDashboard.css";
import { SUBSCRIPTION_CONTRACT_ADDRESS } from "../contracts/config";

export default function MerchantDashboard({
  onSuccess,
  onError,
}: {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}) {
  const account = useActiveAccount();
  const [activeTab, setActiveTab] = useState<"overview" | "subscriptions">("overview");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date filters for revenue
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [merchantServices, setMerchantServices] = useState<Service[]>([]);
  const [merchantSubscriptions, setMerchantSubscriptions] = useState<Subscription[]>([]);
  const [revenueByService, setRevenueByService] = useState<RevenueByService[]>([]);

  const [expandedSubscriptionId, setExpandedSubscriptionId] = useState<string | null>(null);
  const [paymentsBySubscriptionId, setPaymentsBySubscriptionId] = useState<Map<string, Payment[]>>(
    new Map()
  );

  const merchantAddress = account?.address?.toLowerCase();

  const contractAddress = SUBSCRIPTION_CONTRACT_ADDRESS;

  const refresh = async () => {
    if (!merchantAddress) return;

    setLoading(true);
    setError(null);
    try {
      const dateStart = startDate || undefined;
      const dateEnd = endDate || undefined;

      const [services, subs, revenue] = await Promise.all([
        subscriptionApi.getMerchantServices(merchantAddress),
        subscriptionApi.getMerchantSubscriptions(merchantAddress, contractAddress),
        statisticsApi.getRevenueByService(dateStart, dateEnd),
      ]);

      setMerchantServices(services);
      setMerchantSubscriptions(subs);
      setRevenueByService(revenue);

      onSuccess?.("Merchant dashboard synced.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load merchant dashboard";
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!merchantAddress) {
      setMerchantServices([]);
      setMerchantSubscriptions([]);
      setRevenueByService([]);
      return;
    }

    // Initial load and reload when date filters change
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantAddress, startDate, endDate]);

  const revenueMap = useMemo(() => {
    return new Map(revenueByService.map((r) => [r.serviceId, r]));
  }, [revenueByService]);

  const subscriptionCountByServiceId = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of merchantSubscriptions) {
      map.set(s.serviceId, (map.get(s.serviceId) ?? 0) + 1);
    }
    return map;
  }, [merchantSubscriptions]);

  const totalRevenueForMerchant = useMemo(() => {
    let sum = 0;
    for (const svc of merchantServices) {
      const r = revenueMap.get(svc.id);
      if (r) sum += r.totalRevenue;
    }
    return sum;
  }, [merchantServices, revenueMap]);

  const visibleSubscriptions = useMemo(() => {
    return [...merchantSubscriptions].sort(
      (a, b) => +new Date(a.nextPaymentDate) - +new Date(b.nextPaymentDate)
    );
  }, [merchantSubscriptions]);

  const ensurePaymentsLoaded = async (subscriptionId: string) => {
    if (paymentsBySubscriptionId.has(subscriptionId)) return;

    const payments = await subscriptionApi.getPaymentHistory(subscriptionId, 20);
    setPaymentsBySubscriptionId((prev) => {
      const next = new Map(prev);
      next.set(subscriptionId, payments);
      return next;
    });
  };

  const toggleExpanded = async (subscriptionId: string) => {
    const willExpand = expandedSubscriptionId !== subscriptionId;
    setExpandedSubscriptionId(willExpand ? subscriptionId : null);

    if (willExpand) {
      try {
        await ensurePaymentsLoaded(subscriptionId);
      } catch {
        // Error will be surfaced by onError in refresh; keep this silent to avoid UI flashing.
      }
    }
  };

  return (
    <div className="merchant-dashboard">
      <div className="merchant-header">
        <h2>🏪 Merchant Dashboard</h2>
        <div className="merchant-subtitle">
          Services where <code>recipientAddress</code> = {account?.address ?? "—"}
        </div>
      </div>

      <div className="merchant-filters">
        <div className="date-filters">
          <label>
            Start Date:
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label>
            End Date:
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
        </div>

        <div className="merchant-actions">
          <button className="btn btn-secondary" onClick={() => void refresh()} disabled={loading || !merchantAddress}>
            {loading ? "Loading..." : "🔄 Refresh"}
          </button>
        </div>
      </div>

      <div className="merchant-tabs">
        <button
          className={activeTab === "overview" ? "nav-tab active" : "nav-tab"}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          className={activeTab === "subscriptions" ? "nav-tab active" : "nav-tab"}
          onClick={() => setActiveTab("subscriptions")}
        >
          Subscriptions
        </button>
      </div>

      {error && <div className="merchant-error">❌ {error}</div>}

      {!account?.address ? (
        <div className="empty-state card">
          <p>Connect your wallet to view your merchant dashboard.</p>
        </div>
      ) : loading ? (
        <div className="loading">Loading merchant data...</div>
      ) : activeTab === "overview" ? (
        <>
          <div className="merchant-summary-grid">
            <div className="stat-card">
              <div className="stat-label">Total Revenue (filtered)</div>
              <div className="stat-value">{totalRevenueForMerchant.toFixed(4)} PAS</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active Services</div>
              <div className="stat-value">{merchantServices.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active Subscriptions (this contract)</div>
              <div className="stat-value">{merchantSubscriptions.length}</div>
            </div>
          </div>

          <div className="merchant-services-grid">
            {merchantServices.length === 0 ? (
              <div className="empty-state card">
                <p>No active services found for this merchant.</p>
              </div>
            ) : (
              merchantServices.map((svc) => {
                const r = revenueMap.get(svc.id);
                const subCount = subscriptionCountByServiceId.get(svc.id) ?? 0;
                return (
                  <div key={svc.id} className="card merchant-service-card">
                    <div className="service-card-name">{svc.name}</div>
                    <div className="service-card-detail">
                      {typeof svc.cost === "number" ? svc.cost : Number(svc.cost)} / {svc.frequency}
                    </div>
                    <div className="service-card-recipient">
                      To: {svc.recipientAddress.slice(0, 6)}…{svc.recipientAddress.slice(-4)}
                    </div>
                    <div className="merchant-service-metrics">
                      <div className="metric-row">
                        <span className="metric-label">Active subs</span>
                        <span className="metric-value">{subCount}</span>
                      </div>
                      <div className="metric-row">
                        <span className="metric-label">Revenue</span>
                        <span className="metric-value">
                          {(r?.totalRevenue ?? 0).toFixed(4)} PAS
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        <>
          <div className="merchant-subscriptions-table-wrap">
            {visibleSubscriptions.length === 0 ? (
              <div className="empty-state card">
                <p>No active subscriptions for this merchant (this contract filter).</p>
              </div>
            ) : (
              <table className="merchant-table">
                <thead>
                  <tr>
                    <th>Subscription</th>
                    <th>Subscriber</th>
                    <th>Service</th>
                    <th>Next Due</th>
                    <th>Auto-pay</th>
                    <th>Payments</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSubscriptions.map((sub) => (
                    <>
                      <tr key={sub.id} className="merchant-row">
                        <td>{sub.id.slice(0, 10)}…</td>
                        <td title={sub.userAddress}>{sub.userAddress.slice(0, 6)}…{sub.userAddress.slice(-4)}</td>
                        <td>{sub.service?.name ?? sub.serviceId}</td>
                        <td>{new Date(sub.nextPaymentDate).toLocaleDateString()}</td>
                        <td>{sub.autoPay ? "Yes" : "No"}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => void toggleExpanded(sub.id)}
                          >
                            {expandedSubscriptionId === sub.id ? "Hide" : "View"}
                          </button>
                        </td>
                      </tr>
                      {expandedSubscriptionId === sub.id && (
                        <tr>
                          <td colSpan={6} className="merchant-payments-cell">
                            <div className="merchant-payments-inner">
                              <h4>Recent payments</h4>
                              {paymentsBySubscriptionId.get(sub.id)?.length ? (
                                <div className="payments-list">
                                  {paymentsBySubscriptionId
                                    .get(sub.id)!
                                    .map((p, idx) => (
                                      <PaymentHistoryItem key={`${p.transactionHash}-${idx}`} payment={p} serviceName={sub.service?.name ?? sub.serviceId} />
                                    ))}
                                </div>
                              ) : (
                                <div className="empty-state">No payments found.</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

