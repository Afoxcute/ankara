import { Subscription } from "../services/subscriptionService";
import "./SubscriptionCard.css";

interface SubscriptionCardProps {
  subscription: Subscription;
  onCancel: () => void;
  onToggleAutoPay: () => void;
  onManualPay: () => void;
  onEdit?: () => void;
  loading?: boolean;
}

export default function SubscriptionCard({
  subscription,
  onCancel,
  onToggleAutoPay,
  onManualPay,
  onEdit,
  loading,
}: SubscriptionCardProps) {
  const isDue = new Date() >= subscription.nextPaymentDate;
  const assetLabel =
    subscription.paymentToken === 'PAS' || subscription.paymentToken === 'PAS_X402'
      ? 'PAS'
      : subscription.paymentToken;
  const daysUntilDue = Math.ceil(
    (subscription.nextPaymentDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case 'monthly': return 'Monthly';
      case 'weekly': return 'Weekly';
      case 'yearly': return 'Yearly';
      default: return freq;
    }
  };

  const getUsageStatus = () => {
    if (!subscription.usageData?.lastUsed) return 'Never used';
    const daysSinceUse = Math.floor(
      (new Date().getTime() - subscription.usageData.lastUsed.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceUse === 0) return 'Used today';
    if (daysSinceUse === 1) return 'Used yesterday';
    if (daysSinceUse < 7) return `Used ${daysSinceUse} days ago`;
    if (daysSinceUse < 30) return `Used ${Math.floor(daysSinceUse / 7)} weeks ago`;
    return `Used ${Math.floor(daysSinceUse / 30)} months ago`;
  };

  return (
    <div className={`subscription-card card ${isDue ? 'due' : ''}`}>
      <div className="subscription-card-header">
          <div className="subscription-service-info">
          <h3 className="subscription-service-name">{subscription.service}</h3>
          <div className="subscription-cost">{subscription.cost.toFixed(4)} {assetLabel} / {getFrequencyLabel(subscription.frequency)}</div>
        </div>
        <div className="subscription-status-badges">
          {subscription.autoPay && (
            <span className="badge badge-success">Auto-Pay</span>
          )}
          {isDue && (
            <span className="badge badge-warning">Due Now</span>
          )}
        </div>
      </div>

      <div className="subscription-card-body">
        <div className="subscription-details">
          <div className="subscription-detail-row">
            <span className="detail-label">Next Payment:</span>
            <span className={`detail-value ${isDue ? 'due' : ''}`}>
              {isDue ? 'Due Now' : `In ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`}
            </span>
          </div>
          {subscription.lastPaymentDate && (
            <div className="subscription-detail-row">
              <span className="detail-label">Last Payment:</span>
              <span className="detail-value">
                {subscription.lastPaymentDate.toLocaleDateString()}
              </span>
            </div>
          )}
          {subscription.usageData && (
            <div className="subscription-detail-row">
              <span className="detail-label">Usage:</span>
              <span className="detail-value">
                {getUsageStatus()}
                {subscription.usageData.avgUsagePerMonth !== undefined && (
                  <span className="usage-count">
                    {' '}({subscription.usageData.avgUsagePerMonth}/month avg)
                  </span>
                )}
              </span>
            </div>
          )}
          <div className="subscription-detail-row">
            <span className="detail-label">Recipient:</span>
            <span className="detail-value address">
              {subscription.recipientAddress.slice(0, 6)}...{subscription.recipientAddress.slice(-4)}
            </span>
          </div>
        </div>
      </div>

      <div className="subscription-card-actions">
        <button
          className={`btn btn-primary btn-sm ${isDue ? 'due-payment' : ''}`}
          onClick={onManualPay}
          disabled={loading}
        >
          💳 Pay Now{' '}
          {subscription.cost > 0 && `(${subscription.cost.toFixed(4)} ${assetLabel})`}
        </button>
        {onEdit && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={onEdit}
            disabled={loading}
          >
            ✏️ Edit
          </button>
        )}
        <button
          className="btn btn-secondary btn-sm"
          onClick={onToggleAutoPay}
          disabled={loading}
        >
          {subscription.autoPay ? '⏸️ Disable Auto-Pay' : '▶️ Enable Auto-Pay'}
        </button>
        <button
          className="btn btn-secondary btn-sm btn-danger"
          onClick={onCancel}
          disabled={loading}
        >
          ❌ Cancel
        </button>
      </div>
    </div>
  );
}

