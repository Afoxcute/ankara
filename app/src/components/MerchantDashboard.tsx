import { Fragment, useEffect, useMemo, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import {
  Payment,
  RecentReceipt,
  RevenueByService,
  Service,
  Subscription,
  statisticsApi,
  subscriptionApi,
} from "../services/subscriptionApi";
import PaymentHistoryItem from "./PaymentHistoryItem";
import "./CreateServiceForm.css";
import "./MerchantDashboard.css";
import { SUBSCRIPTION_CONTRACT_ADDRESS } from "../contracts/config";
import RevenueAnalytics from "../pages/RevenueAnalytics";

export default function MerchantDashboard({
  onSuccess,
  onError,
}: {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}) {
  const account = useActiveAccount();
  const [activeTab, setActiveTab] = useState<"overview" | "subscriptions" | "analytics">("overview");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Service management (merchant-owned services)
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [serviceModalMode, setServiceModalMode] = useState<"create" | "edit">("create");
  const [serviceModalServiceId, setServiceModalServiceId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState<{
    name: string;
    description: string;
    cost: string;
    frequency: "monthly" | "weekly" | "yearly";
  }>({
    name: "",
    description: "",
    cost: "",
    frequency: "monthly",
  });
  const [serviceFormErrors, setServiceFormErrors] = useState<Record<string, string>>({});
  const [serviceSaving, setServiceSaving] = useState(false);

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

  const activeServiceCount = useMemo(
    () => merchantServices.filter((s) => s.isActive).length,
    [merchantServices]
  );

  const refresh = async () => {
    if (!merchantAddress) return;

    setLoading(true);
    setError(null);
    try {
      const dateStart = startDate || undefined;
      const dateEnd = endDate || undefined;

      // Backfill chain PaymentMade events first so merchant analytics/subscription payment panels
      // include payments that were made on-chain without DB recording.
      await statisticsApi.syncChainPayments({
        contractAddress: contractAddress,
      });

      const [services, subs, revenue] = await Promise.all([
        subscriptionApi.getMerchantServices(merchantAddress),
        subscriptionApi.getMerchantSubscriptions(merchantAddress, contractAddress),
        statisticsApi.getRevenueByService(dateStart, dateEnd, merchantAddress),
      ]);

      setMerchantServices(services);
      setMerchantSubscriptions(subs);
      setRevenueByService(revenue);
      // Reset payment-history cache to avoid stale "no payments" after new payments are made.
      setPaymentsBySubscriptionId(new Map());
      setExpandedSubscriptionId(null);

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

  const mapRecentReceiptToPayment = (r: RecentReceipt): Payment => {
    return {
      id: r.id,
      subscriptionId: r.subscription.id,
      amount: r.amount,
      transactionHash: r.transactionHash,
      network: r.network,
      status: r.status,
      errorMessage: r.errorMessage,
      timestamp: r.timestamp,
    };
  };

  const ensurePaymentsLoaded = async (sub: Subscription) => {
    if (paymentsBySubscriptionId.has(sub.id)) return;

    const direct = await subscriptionApi.getPaymentHistory(sub.id, 20);
    if (direct.length > 0) {
      setPaymentsBySubscriptionId((prev) => {
        const next = new Map(prev);
        next.set(sub.id, direct);
        return next;
      });
      return;
    }

    // Fallback: pull merchant receipts scoped by service + subscriber.
    // This covers legacy rows where payment history may be attached to a sibling DB subscription.
    if (!merchantAddress) {
      setPaymentsBySubscriptionId((prev) => {
        const next = new Map(prev);
        next.set(sub.id, []);
        return next;
      });
      return;
    }

    const receipts = await statisticsApi.getRecentReceipts({
      recipientAddress: merchantAddress,
      serviceId: sub.serviceId,
      userAddress: sub.userAddress,
      limit: 50,
    });
    const mapped = receipts
      .filter((r) => r.service.id === sub.serviceId && r.payer.address.toLowerCase() === sub.userAddress.toLowerCase())
      .map(mapRecentReceiptToPayment);

    setPaymentsBySubscriptionId((prev) => {
      const next = new Map(prev);
      next.set(sub.id, mapped);
      return next;
    });
  };

  const toggleExpanded = async (sub: Subscription) => {
    const willExpand = expandedSubscriptionId !== sub.id;
    setExpandedSubscriptionId(willExpand ? sub.id : null);

    if (willExpand) {
      try {
        await ensurePaymentsLoaded(sub);
      } catch {
        // Error will be surfaced by onError in refresh; keep this silent to avoid UI flashing.
      }
    }
  };

  const openCreateServiceModal = () => {
    setServiceModalMode("create");
    setServiceModalServiceId(null);
    setServiceFormErrors({});
    setServiceForm({
      name: "",
      description: "",
      cost: "",
      frequency: "monthly",
    });
    setServiceModalOpen(true);
  };

  const openEditServiceModal = (svc: Service) => {
    setServiceModalMode("edit");
    setServiceModalServiceId(svc.id);
    setServiceFormErrors({});
    setServiceForm({
      name: svc.name,
      description: svc.description ?? "",
      cost: String(svc.cost),
      frequency: (svc.frequency as "monthly" | "weekly" | "yearly") ?? "monthly",
    });
    setServiceModalOpen(true);
  };

  const validateServiceForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!serviceForm.name.trim()) nextErrors.name = "Service name is required";

    const parsedCost = parseFloat(serviceForm.cost);
    if (!serviceForm.cost || Number.isNaN(parsedCost) || parsedCost <= 0) {
      nextErrors.cost = "Cost must be a positive number";
    }

    if (!["monthly", "weekly", "yearly"].includes(serviceForm.frequency)) {
      nextErrors.frequency = "Invalid frequency";
    }

    setServiceFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submitServiceForm = async () => {
    if (!merchantAddress) return;
    if (!serviceModalServiceId && serviceModalMode === "edit") return;
    if (!validateServiceForm()) return;

    setServiceSaving(true);
    try {
      const parsedCost = parseFloat(serviceForm.cost);
      const description =
        serviceForm.description.trim().length > 0 ? serviceForm.description.trim() : null;

      if (serviceModalMode === "create") {
        await subscriptionApi.createMerchantService(merchantAddress, {
          name: serviceForm.name.trim(),
          description: description ?? undefined,
          cost: parsedCost,
          frequency: serviceForm.frequency,
        });
        onSuccess?.("Service created");
      } else {
        await subscriptionApi.updateMerchantService(
          merchantAddress,
          serviceModalServiceId as string,
          {
            name: serviceForm.name.trim(),
            description,
            cost: parsedCost,
            frequency: serviceForm.frequency,
          }
        );
        onSuccess?.("Service updated");
      }

      setServiceModalOpen(false);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save service";
      setServiceFormErrors((prev) => ({ ...prev, form: msg }));
      onError?.(msg);
    } finally {
      setServiceSaving(false);
    }
  };

  const toggleMerchantServiceActive = async (svc: Service) => {
    if (!merchantAddress) return;
    setLoading(true);
    setError(null);
    try {
      await subscriptionApi.setMerchantServiceActive(merchantAddress, svc.id, !svc.isActive);
      onSuccess?.(svc.isActive ? "Service disabled" : "Service enabled");
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update service";
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="merchant-dashboard">
      <div className="merchant-header">
        <h2>🏪 Merchant Dashboard</h2>
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
        <button
          className={activeTab === "analytics" ? "nav-tab active" : "nav-tab"}
          onClick={() => setActiveTab("analytics")}
        >
          Analytics
        </button>
      </div>

      {error && <div className="merchant-error">❌ {error}</div>}

      {!account?.address ? (
        <div className="empty-state card">
          <p>Connect your wallet to view your merchant dashboard.</p>
        </div>
      ) : loading ? (
        <div className="loading">Loading merchant data...</div>
      ) : activeTab === "analytics" ? (
        <RevenueAnalytics merchantAddress={merchantAddress} />
      ) : activeTab === "overview" ? (
        <>
          <div className="merchant-actions" style={{ justifyContent: "space-between" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={openCreateServiceModal}
              disabled={serviceSaving}
            >
              ➕ Create Service
            </button>
          </div>

          <div className="merchant-summary-grid">
            <div className="stat-card">
              <div className="stat-label">Total Revenue (filtered)</div>
              <div className="stat-value">{totalRevenueForMerchant.toFixed(4)} PAS</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active Services</div>
              <div className="stat-value">{activeServiceCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active Subscriptions (this contract)</div>
              <div className="stat-value">{merchantSubscriptions.length}</div>
            </div>
          </div>

          <div className="merchant-services-grid">
            {merchantServices.length === 0 ? (
              <div className="empty-state card">
                <p>No services found for this merchant.</p>
              </div>
            ) : (
              merchantServices.map((svc) => {
                const r = revenueMap.get(svc.id);
                const subCount = subscriptionCountByServiceId.get(svc.id) ?? 0;
                return (
                  <div key={svc.id} className="card merchant-service-card">
                    <div className="merchant-service-topline">
                      <span className={`service-status ${svc.isActive ? "active" : "inactive"}`}>
                        {svc.isActive ? "Active" : "Disabled"}
                      </span>
                      <div className="merchant-service-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEditServiceModal(svc)}
                          disabled={serviceSaving}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => void toggleMerchantServiceActive(svc)}
                          disabled={serviceSaving}
                        >
                          {svc.isActive ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </div>
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

          {serviceModalOpen && (
            <div className="service-modal-overlay" role="dialog" aria-modal="true">
              <div className="service-modal card">
                <div className="service-modal-header">
                  <h3>
                    {serviceModalMode === "edit" ? "✏️ Edit Service" : "➕ Create Service"}
                  </h3>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setServiceModalOpen(false)}
                    disabled={serviceSaving}
                  >
                    ✕
                  </button>
                </div>

                <div className="service-modal-body">
                  <div className="form-group">
                    <label className="form-label">
                      Service Name <span className="required">*</span>
                    </label>
                    <input
                      className={`form-input ${serviceFormErrors.name ? "error" : ""}`}
                      value={serviceForm.name}
                      onChange={(e) => {
                        setServiceForm((prev) => ({ ...prev, name: e.target.value }));
                        setServiceFormErrors((prev) => ({ ...prev, name: "" }));
                      }}
                      placeholder="e.g., Subscription-Pro"
                      disabled={serviceSaving}
                    />
                    {serviceFormErrors.name && (
                      <span className="error-message">{serviceFormErrors.name}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-input form-textarea"
                      value={serviceForm.description}
                      onChange={(e) =>
                        setServiceForm((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Short description shown to users"
                      disabled={serviceSaving}
                    />
                  </div>

                  <div className="form-group-row">
                    <div className="form-group">
                      <label className="form-label">
                        Cost (PAS) <span className="required">*</span>
                      </label>
                      <input
                        className={`form-input ${serviceFormErrors.cost ? "error" : ""}`}
                        type="number"
                        value={serviceForm.cost}
                        onChange={(e) => {
                          setServiceForm((prev) => ({ ...prev, cost: e.target.value }));
                          setServiceFormErrors((prev) => ({ ...prev, cost: "" }));
                        }}
                        min="0"
                        step="0.001"
                        disabled={serviceSaving}
                      />
                      {serviceFormErrors.cost && (
                        <span className="error-message">{serviceFormErrors.cost}</span>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Payment Frequency <span className="required">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={serviceForm.frequency}
                        onChange={(e) =>
                          setServiceForm((prev) => ({
                            ...prev,
                            frequency: e.target.value as "monthly" | "weekly" | "yearly",
                          }))
                        }
                        disabled={serviceSaving}
                      >
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                      {serviceFormErrors.frequency && (
                        <span className="error-message">{serviceFormErrors.frequency}</span>
                      )}
                    </div>
                  </div>

                  <div className="service-form-meta">
                    Merchant recipientAddress:
                    <code>{merchantAddress}</code>
                  </div>

                  {serviceFormErrors.form && (
                    <div className="merchant-error" style={{ marginTop: "0.75rem" }}>
                      {serviceFormErrors.form}
                    </div>
                  )}
                </div>

                <div className="service-modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setServiceModalOpen(false)}
                    disabled={serviceSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void submitServiceForm()}
                    disabled={serviceSaving}
                  >
                    {serviceSaving
                      ? serviceModalMode === "edit"
                        ? "Updating..."
                        : "Creating..."
                      : serviceModalMode === "edit"
                        ? "Update Service"
                        : "Create Service"}
                  </button>
                </div>
              </div>
            </div>
          )}
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
                    <Fragment key={sub.id}>
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
                            onClick={() => void toggleExpanded(sub)}
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
                    </Fragment>
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

