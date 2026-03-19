import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import type { ThirdwebClient } from "thirdweb";
import { SubscriptionAgent, Subscription, AISuggestion } from "../services/subscriptionService";
import { subscriptionApi, Payment, Service } from "../services/subscriptionApi";
import { useSubscriptionContract, useSubscriptionContractPay } from "../hooks/useSubscriptionContract";
import { useConfidentialSubscription } from "../hooks/useConfidentialSubscription";
import {
  SUBSCRIPTION_CONTRACT_ADDRESS,
  CONFIDENTIAL_SUBSCRIPTION_CONTRACT_ADDRESS,
} from "../contracts/config";
import SubscriptionCard from "./SubscriptionCard";
import AISuggestions from "./AISuggestions";
import CreateServiceForm from "./CreateServiceForm";
import PaymentHistoryItem from "./PaymentHistoryItem";
import "./SubscriptionManager.css";

interface SubscriptionManagerProps {
  client: ThirdwebClient;
  subscriptionAgent: SubscriptionAgent;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export default function SubscriptionManager({
  client,
  subscriptionAgent,
  onSuccess,
  onError,
}: SubscriptionManagerProps) {
  const account = useActiveAccount();
  const { subscribe: contractSubscribe, cancel: contractCancel, isPending: contractPending } = useSubscriptionContract(client);
  const { payWithApproval, isPending: payPending } = useSubscriptionContractPay(client);
  const { subscribe: confidentialSubscribe, isPending: confidentialPending } = useConfidentialSubscription();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoManageEnabled, setAutoManageEnabled] = useState(true);
  /** Single object so "subscribe to catalog" never opens with stale/null service (avoids wrong form mode). */
  const [createForm, setCreateForm] = useState<
    | { open: false }
    | { open: true; mode: "subscribe"; service: Service }
  >({ open: false });
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<Map<string, Payment[]>>(new Map());
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  const closeCreateForm = () => setCreateForm({ open: false });

  useEffect(() => {
    if (account?.address) {
      subscriptionAgent.setUserAddress(account.address).then(() => {
        loadSubscriptions();
        loadSuggestions();
      });
      loadAllServices();
    } else {
      setSubscriptions([]);
      setSuggestions([]);
      setAllServices([]);
    }
    
    // Auto-check every minute
    const interval = setInterval(() => {
      if (autoManageEnabled && account) {
        checkAndPaySubscriptions();
      }
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, [account, autoManageEnabled]);

  const loadSubscriptions = async () => {
    if (account?.address) {
      await subscriptionAgent.loadFromAPI();
    }
    const subs = subscriptionAgent.getAllSubscriptions();
    setSubscriptions(subs);
    // Load payment history for all subscriptions
    await loadPaymentHistory(subs);
  };

  const loadPaymentHistory = async (subs: Subscription[]) => {
    if (!account?.address || subs.length === 0) return;
    
    setLoadingPayments(true);
    try {
      const paymentMap = new Map<string, Payment[]>();
      
      // Load payment history for each subscription
      await Promise.all(
        subs.map(async (sub) => {
          try {
            const payments = await subscriptionApi.getPaymentHistory(sub.id, 50);
            paymentMap.set(sub.id, payments);
          } catch (error) {
            console.error(`Error loading payment history for subscription ${sub.id}:`, error);
            paymentMap.set(sub.id, []);
          }
        })
      );
      
      setPaymentHistory(paymentMap);
    } catch (error) {
      console.error('Error loading payment history:', error);
    } finally {
      setLoadingPayments(false);
    }
  };

  const loadSuggestions = async () => {
    try {
      const aiSuggestions = await subscriptionAgent.suggestCancellations();
      setSuggestions(aiSuggestions);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const loadAllServices = async () => {
    setLoadingServices(true);
    try {
      const services = await subscriptionApi.getAllServices();
      setAllServices(services);
    } catch (error) {
      console.error('Error loading services:', error);
      setAllServices([]);
    } finally {
      setLoadingServices(false);
    }
  };

  const checkAndPaySubscriptions = async () => {
    if (!account) return;

    try {
      setLoading(true);
      const dueSubs = subscriptions.filter(
        (s) => s.isActive && s.autoPay && new Date() >= s.nextPaymentDate
      );
      let successCount = 0;
      for (const sub of dueSubs) {
        try {
          if (sub.onChainSubscriptionId) {
            await payWithApproval(sub.onChainSubscriptionId, sub.cost, sub.id);
            successCount++;
          } else {
            const result = await subscriptionAgent.autoPaySubscription(account, sub);
            if (result.success) successCount++;
          }
        } catch (_) {
          // continue with next
        }
      }
      if (successCount > 0) {
        onSuccess?.(`Automatically paid ${successCount} subscription${successCount > 1 ? 's' : ''}`);
        await loadSubscriptions();
      }
      if (dueSubs.length > successCount && dueSubs.length > 0) {
        onError?.(`Failed to pay ${dueSubs.length - successCount} subscription(s)`);
      }
    } catch (error) {
      console.error('Error managing subscriptions:', error);
      onError?.('Error managing subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async (subscription: Subscription) => {
    const id = subscription.id;
    try {
      if (subscription.onChainSubscriptionId) {
        await contractCancel(subscription.onChainSubscriptionId);
      }
      if (await subscriptionAgent.removeSubscription(id)) {
        onSuccess?.('Subscription cancelled');
        await loadSubscriptions();
        loadSuggestions();
      } else {
        onError?.('Failed to cancel subscription');
      }
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Failed to cancel subscription');
    }
  };

  const handleToggleAutoPay = async (id: string) => {
    if (await subscriptionAgent.toggleAutoPay(id)) {
      onSuccess?.('Auto-pay toggled');
      await loadSubscriptions();
    } else {
      onError?.('Failed to toggle auto-pay');
    }
  };

  const handleEditSubscription = (subscription: Subscription) => {
    setEditingSubscription(subscription);
  };

  const handleUpdateSubscription = async (serviceData: {
    service: string;
    cost: number;
    frequency: 'monthly' | 'weekly' | 'yearly';
    recipientAddress: string;
    autoPay: boolean;
    isPrivate?: boolean;
  }) => {
    if (!editingSubscription) return;

    try {
      setLoading(true);
      const updates: Partial<
        Omit<Subscription, 'id' | 'lastPaymentDate' | 'nextPaymentDate'>
      > = {
        service: serviceData.service,
        cost: serviceData.cost,
        frequency: serviceData.frequency,
        recipientAddress: serviceData.recipientAddress,
        autoPay: serviceData.autoPay,
      };

      const success = await subscriptionAgent.updateSubscription(
        editingSubscription.id,
        updates
      );
      
      if (success) {
        onSuccess?.(`Service "${serviceData.service}" updated successfully!`);
        setEditingSubscription(null);
        await loadSubscriptions();
        loadSuggestions();
      } else {
        onError?.('Failed to update service');
      }
    } catch (error) {
      console.error('Error updating service:', error);
      onError?.('Failed to update service');
    } finally {
      setLoading(false);
    }
  };

  const handleManualPay = async (subscription: Subscription) => {
    if (!account) {
      onError?.('Please connect your wallet to make a payment');
      return;
    }

    const assetLabel = 'PAS';

    try {
      setLoading(true);
      onSuccess?.(
        `Processing payment of ${subscription.cost.toFixed(4)} ${assetLabel} to ${subscription.service}...`
      );

      if (subscription.onChainSubscriptionId) {
        const { txHash } = await payWithApproval(
          subscription.onChainSubscriptionId,
          subscription.cost,
          subscription.id
        );
        onSuccess?.(
          `✅ Paid ${subscription.cost.toFixed(4)} ${assetLabel}. Tx: ${txHash.slice(0, 10)}...`
        );
      } else {
        const result = await subscriptionAgent.autoPaySubscription(account, subscription);
        if (result.success) {
          onSuccess?.(
            `✅ Successfully paid ${subscription.cost.toFixed(4)} ${assetLabel}. Transaction: ${result.transactionHash?.slice(0, 10)}...`
          );
        } else {
          onError?.(result.error || `Payment failed. Please check your ${assetLabel} balance.`);
        }
      }
      await loadSubscriptions();
    } catch (error) {
      console.error('Payment error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      // Friendly messages for known cases
      if (message.includes('Payment not due yet on-chain')) {
        onError?.(message);
        return;
      }
      if (message.includes('PaymentNotDue') || message.includes('TransactionError: PaymentNotDue')) {
        onError?.('This payment isn’t due yet on-chain. The button will work when the next due date is reached.');
        return;
      }
      const isAbiDecodeError =
        message.includes('AbiErrorSignatureNotFoundError') ||
        message.includes('0x00a71fbb') ||
        message.includes('not found on ABI');
      onError?.(
        isAbiDecodeError
          ? `Payment failed. Ensure you have enough ${assetLabel}, the subscription is due, and you are the subscriber.`
          : `Payment failed: ${message}. Ensure sufficient ${assetLabel} balance.`
      );
    } finally {
      setLoading(false);
    }
  };

  const monthlyCostsByToken = subscriptions
    .filter(sub => sub.isActive)
    .reduce(
      (acc, sub) => {
        const monthlyEquivalent =
          sub.frequency === 'monthly'
            ? sub.cost
            : sub.frequency === 'weekly'
              ? sub.cost * 4
              : sub.frequency === 'yearly'
                ? sub.cost / 12
                : sub.cost;

        acc.PAS += monthlyEquivalent;
        return acc;
      },
      { PAS: 0 }
    );

  const activeSubscriptions = subscriptions.filter(sub => sub.isActive);
  const dueSubscriptions = activeSubscriptions.filter(sub => {
    const now = new Date();
    return sub.nextPaymentDate <= now;
  });

  return (
    <div className="subscription-manager">
      {/* Header Stats */}
      <div className="subscription-stats">
        <div className="stat-card">
          <div className="stat-label">Active Subscriptions</div>
          <div className="stat-value">{activeSubscriptions.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Monthly Cost</div>
          <div className="stat-value">
            {monthlyCostsByToken.PAS.toFixed(4)} PAS
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Due Now</div>
          <div className="stat-value warning">{dueSubscriptions.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Auto-Manage</div>
          <div className="stat-value">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={autoManageEnabled}
                onChange={(e) => setAutoManageEnabled(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <AISuggestions
          suggestions={suggestions}
          onCancel={(id) => {
            const sub = subscriptions.find((s) => s.id === id);
            if (sub) handleCancelSubscription(sub);
          }}
        />
      )}

      {/* Actions */}
      <div className="subscription-actions">
        <button
          className="btn btn-primary"
          onClick={checkAndPaySubscriptions}
          disabled={loading || !account}
        >
          {loading ? 'Processing...' : '🔄 Check & Pay Due Subscriptions'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={loadSuggestions}
        >
          🤖 Refresh AI Suggestions
        </button>
      </div>

      {/* Available services (for any connected user) */}
      {account?.address && (
        <div className="subscriptions-section available-services-section">
          <h2 className="section-title">Available Services</h2>
          {loadingServices ? (
            <div className="empty-state card"><p>Loading services...</p></div>
          ) : allServices.length === 0 ? (
            <div className="empty-state card">
              <p>No services yet. Create one to make it available for everyone.</p>
            </div>
          ) : (
            <div className="subscriptions-grid">
              {allServices.map((svc) => (
                <div key={svc.id} className="card service-card">
                  <div className="service-card-name">{svc.name}</div>
                  <div className="service-card-detail">
                    {typeof svc.cost === 'number' ? svc.cost : Number(svc.cost)} / {svc.frequency}
                  </div>
                  <div className="service-card-recipient" title={svc.recipientAddress}>
                    To: {svc.recipientAddress.slice(0, 6)}…{svc.recipientAddress.slice(-4)}
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() =>
                      setCreateForm({ open: true, mode: "subscribe", service: svc })
                    }
                    disabled={loading}
                  >
                    Subscribe
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subscribe Form */}
      {createForm.open && (
        <CreateServiceForm
          key={`subscribe-${createForm.service.id}`}
          initialData={
            {
              service: createForm.service.name,
              cost:
                typeof createForm.service.cost === "number"
                  ? createForm.service.cost
                  : Number(createForm.service.cost),
              frequency: createForm.service.frequency as "monthly" | "weekly" | "yearly",
              recipientAddress: createForm.service.recipientAddress,
              autoPay: true,
              serviceId: createForm.service.id,
            }
          }
          context="subscription"
          onSubmit={async (serviceData) => {
            if (!account?.address) {
              onError?.('Connect your wallet to create a subscription');
              return;
            }
            try {
              setLoading(true);
              // Keep createForm unchanged until close — clearing service mid-flight remounted the form as "create"

              onSuccess?.('Creating subscription on-chain and syncing with API...');
              const isPrivate =
                !!serviceData.isPrivate &&
                !!CONFIDENTIAL_SUBSCRIPTION_CONTRACT_ADDRESS;
              const { subscriptionId: onChainId, txHash } = isPrivate
                ? await confidentialSubscribe(
                    serviceData.recipientAddress,
                    serviceData.cost,
                    serviceData.frequency
                  )
                : await contractSubscribe(
                    serviceData.recipientAddress,
                    serviceData.cost,
                    serviceData.frequency,
                    account.address
                  );
              await subscriptionApi.createSubscription({
                ...(serviceData.serviceId
                  ? { serviceId: serviceData.serviceId }
                  : { serviceName: serviceData.service }),
                cost: serviceData.cost,
                frequency: serviceData.frequency,
                recipientAddress: serviceData.recipientAddress,
                userAddress: account.address,
                autoPay: serviceData.autoPay,
                onChainSubscriptionId: onChainId,
                onChainContractAddress: isPrivate
                  ? CONFIDENTIAL_SUBSCRIPTION_CONTRACT_ADDRESS
                  : SUBSCRIPTION_CONTRACT_ADDRESS || undefined,
                usageData: {
                  stablecoin: 'PAS',
                },
              });
              onSuccess?.(
                `Subscription created (PAS: on-chain + x402-ready). Tx: ${txHash.slice(0, 10)}...`
              );
              closeCreateForm();
              await loadSubscriptions();
              loadSuggestions();
              await loadAllServices();
            } catch (error) {
              console.error('Error creating subscription:', error);
              onError?.(error instanceof Error ? error.message : 'Failed to create subscription');
            } finally {
              setLoading(false);
            }
          }}
          onCancel={closeCreateForm}
          loading={loading || contractPending || confidentialPending}
        />
      )}

      {/* Edit Subscription Form */}
      {editingSubscription && (
        <CreateServiceForm
          initialData={{
            service: editingSubscription.service,
            cost: editingSubscription.cost,
            frequency: editingSubscription.frequency,
            recipientAddress: editingSubscription.recipientAddress,
            autoPay: editingSubscription.autoPay,
          }}
          context="subscription"
          onSubmit={handleUpdateSubscription}
          onCancel={() => setEditingSubscription(null)}
          loading={loading}
        />
      )}

      {/* Subscriptions List */}
      <div className="subscriptions-section">
        <h2 className="section-title">Your Subscriptions</h2>
        {activeSubscriptions.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-icon">📭</div>
            <h3>No Active Subscriptions</h3>
            <p>Add a subscription to get started with auto-payments</p>
          </div>
        ) : (
          <div className="subscriptions-grid">
            {activeSubscriptions.map((subscription) => (
              <SubscriptionCard
                key={subscription.id}
                subscription={subscription}
                onCancel={() => handleCancelSubscription(subscription)}
                onToggleAutoPay={() => handleToggleAutoPay(subscription.id)}
                onManualPay={() => handleManualPay(subscription)}
                onEdit={() => handleEditSubscription(subscription)}
                loading={loading || payPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Payment History Section */}
      {activeSubscriptions.length > 0 && (() => {
        // Collect all payments from all subscriptions
        const allPayments: Array<{
          payment: Payment;
          serviceName: string;
        }> = [];
        paymentHistory.forEach((payments, subscriptionId) => {
          const subscription = subscriptions.find(s => s.id === subscriptionId);
          if (subscription) {
            payments.forEach(payment => {
              allPayments.push({
                payment,
                serviceName: subscription.service || 'Unknown Service',
              });
            });
          }
        });

        // Sort by timestamp (newest first)
        allPayments.sort((a, b) => 
          new Date(b.payment.timestamp).getTime() - new Date(a.payment.timestamp).getTime()
        );

        if (allPayments.length === 0 && !loadingPayments) {
          return null;
        }

        return (
          <div className="payment-history-section">
            <h2 className="section-title">
              Transaction History
              {loadingPayments && <span className="loading-indicator">Loading...</span>}
            </h2>
            <div className="payment-history-list">
              {allPayments.length > 0 ? (
                allPayments.map(({ payment, serviceName }) => (
                  <PaymentHistoryItem
                    key={payment.id}
                    payment={payment}
                    serviceName={serviceName}
                  />
                ))
              ) : (
                <div className="empty-payment-history">
                  <p>No payment history available yet.</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

