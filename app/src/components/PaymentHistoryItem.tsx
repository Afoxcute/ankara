import { useState } from 'react';
import { Payment } from '../services/subscriptionApi';
import './PaymentHistoryItem.css';

interface PaymentHistoryItemProps {
  payment: Payment;
  serviceName: string;
  paymentAsset: 'PAS' | 'PAS_X402';
}

export default function PaymentHistoryItem({
  payment,
  serviceName,
  paymentAsset,
}: PaymentHistoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Safely convert amount to number (handles Decimal, string, or number)
  const getAmount = (): number => {
    if (typeof payment.amount === 'number') {
      return payment.amount;
    }
    if (typeof payment.amount === 'string') {
      return parseFloat(payment.amount);
    }
    // Handle Prisma Decimal object
    if (payment.amount && typeof payment.amount === 'object' && 'toNumber' in payment.amount) {
      return (payment.amount as any).toNumber();
    }
    return 0;
  };

  const amount = getAmount();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      full: date.toLocaleString(),
    };
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <span className="status-badge status-success">✓ Completed</span>;
      case 'failed':
        return <span className="status-badge status-error">✗ Failed</span>;
      case 'pending':
        return <span className="status-badge status-warning">⏳ Pending</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const getExplorerUrl = (hash: string, _network?: string) => {
    return `https://blockscout-testnet.polkadot.io/tx/${hash}`;
  };

  const dateInfo = formatDate(payment.timestamp);
  const assetLabel =
    paymentAsset === 'PAS' || paymentAsset === 'PAS_X402' ? 'PAS' : 'PAS';

  return (
    <div className={`payment-history-item ${isExpanded ? 'expanded' : ''}`}>
      <div 
        className="payment-history-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="payment-header-left">
          <div className="payment-service-name">{serviceName}</div>
          <div className="payment-amount">{amount.toFixed(4)} {assetLabel}</div>
        </div>
        <div className="payment-header-right">
          {getStatusBadge(payment.status)}
          <div className="payment-date">{dateInfo.date}</div>
          <div className="payment-toggle">
            {isExpanded ? '▼' : '▶'}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="payment-history-details">
          <div className="payment-detail-section">
            <h4 className="detail-section-title">Transaction Details</h4>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Transaction Hash:</span>
                <span className="detail-value">
                  <a 
                    href={getExplorerUrl(payment.transactionHash, payment.network)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transaction-link"
                  >
                    {payment.transactionHash.slice(0, 10)}...{payment.transactionHash.slice(-8)}
                    <span className="external-link-icon">🔗</span>
                  </a>
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Status:</span>
                <span className="detail-value">{getStatusBadge(payment.status)}</span>
              </div>
              <div className="detail-item detail-item-amount">
                <span className="detail-label">Amount:</span>
                <span className="detail-value detail-amount-value">{amount.toFixed(4)} {assetLabel}</span>
              </div>
              <div className="detail-item detail-item-network">
                <span className="detail-label">Network:</span>
                <span className="detail-value detail-network-value">{payment.network}</span>
              </div>
              <div className="detail-item detail-item-date">
                <span className="detail-label">Date & Time:</span>
                <span className="detail-value detail-date-value">{dateInfo.full}</span>
              </div>
              {payment.errorMessage && (
                <div className="detail-item detail-item-full">
                  <span className="detail-label">Error Message:</span>
                  <span className="detail-value error-message">{payment.errorMessage}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


