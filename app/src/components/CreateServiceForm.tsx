import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { CONFIDENTIAL_SUBSCRIPTION_CONTRACT_ADDRESS } from "../contracts/config";
import "./CreateServiceForm.css";

export interface ServiceFormData {
  service: string;
  cost: number;
  frequency: 'monthly' | 'weekly' | 'yearly';
  recipientAddress: string;
  autoPay: boolean;
  /**
   * How payments are executed:
   * - `PAS`: on-chain SubscriptionManagerFLOW (native PAS).
   * - `PAS_X402`: off-chain x402 payments (PAS).
   */
  paymentToken: 'PAS' | 'PAS_X402';
  /** When true, create a confidential (FHE) subscription on Sepolia. */
  isPrivate?: boolean;
  /** When set, subscribe to this existing service (API uses it instead of creating a new one). */
  serviceId?: string;
}

interface CreateServiceFormProps {
  onSubmit: (service: ServiceFormData) => void;
  onCancel: () => void;
  loading?: boolean;
  initialData?: ServiceFormData & { serviceId?: string }; // For editing or subscribing to existing service
}

export default function CreateServiceForm({
  onSubmit,
  onCancel,
  loading,
  initialData,
}: CreateServiceFormProps) {
  const account = useActiveAccount();
  const isEditMode = !!initialData && !(initialData as { serviceId?: string }).serviceId;
  const existingServiceId = (initialData as { serviceId?: string } | undefined)?.serviceId;
  const [serviceName, setServiceName] = useState(initialData?.service || '');
  const [cost, setCost] = useState(initialData?.cost.toString() || '');
  const [frequency, setFrequency] = useState<'monthly' | 'weekly' | 'yearly'>((initialData?.frequency as 'monthly' | 'weekly' | 'yearly') || 'monthly');
  const [recipientAddress, setRecipientAddress] = useState(initialData?.recipientAddress || account?.address || '');
  const [autoPay, setAutoPay] = useState(initialData?.autoPay ?? true);
  const [paymentToken, setPaymentToken] = useState<
    'PAS' | 'PAS_X402'
  >(initialData?.paymentToken ?? 'PAS');
  const [isPrivate, setIsPrivate] = useState(initialData?.isPrivate ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!serviceName.trim()) {
      newErrors.serviceName = 'Service name is required';
    }

    const costValue = parseFloat(cost);
    if (!cost || isNaN(costValue) || costValue <= 0) {
      newErrors.cost = 'Please enter a valid cost greater than 0';
    }

    if (!recipientAddress.trim()) {
      newErrors.recipientAddress = 'Recipient wallet address is required';
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(recipientAddress.trim())) {
      newErrors.recipientAddress = 'Please enter a valid Ethereum address (0x...)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSubmit({
      service: serviceName.trim(),
      cost: parseFloat(cost),
      frequency,
      recipientAddress: recipientAddress.trim(),
      autoPay,
      paymentToken,
      isPrivate,
      ...(existingServiceId ? { serviceId: existingServiceId } : {}),
    });
  };

  const handleUseMyAddress = () => {
    if (account?.address) {
      setRecipientAddress(account.address);
      setErrors(prev => ({ ...prev, recipientAddress: '' }));
    }
  };

  return (
    <div className="create-service-form-overlay">
      <div className="create-service-form card">
        <div className="form-header">
          <h2>{isEditMode ? '✏️ Edit Service' : existingServiceId ? '📌 Subscribe to Service' : '➕ Create New Service'}</h2>
          <button
            type="button"
            className="btn-close"
            onClick={onCancel}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              Service Name <span className="required">*</span>
            </label>
            <input
              type="text"
              className={`form-input ${errors.serviceName ? 'error' : ''}`}
              value={serviceName}
              onChange={(e) => {
                setServiceName(e.target.value);
                setErrors(prev => ({ ...prev, serviceName: '' }));
              }}
              placeholder="e.g., Netflix-Web3, Spotify-Crypto, Cloud-Storage"
              disabled={loading}
            />
            {errors.serviceName && (
              <span className="error-message">{errors.serviceName}</span>
            )}
          </div>

          <div className="form-group-row">
            <div className="form-group">
              <label className="form-label">
                Cost ({paymentToken === 'PAS' ? (isPrivate ? "ETH" : "PAS") : "PAS"}) <span className="required">*</span>
              </label>
              <input
                type="number"
                className={`form-input ${errors.cost ? 'error' : ''}`}
                value={cost}
                onChange={(e) => {
                  setCost(e.target.value);
                  setErrors(prev => ({ ...prev, cost: '' }));
                }}
                placeholder="0.01"
                min="0"
                step="0.001"
                disabled={loading}
              />
              {errors.cost && (
                <span className="error-message">{errors.cost}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                Payment Frequency <span className="required">*</span>
              </label>
              <select
                className="form-select"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as 'monthly' | 'weekly' | 'yearly')}
                disabled={loading}
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div className="form-group">
              <label className="form-label">
                Payment Asset <span className="required">*</span>
              </label>
              <select
                className="form-select"
                value={paymentToken}
                onChange={(e) => {
                  const next = e.target.value as 'PAS' | 'PAS_X402';
                  setPaymentToken(next);
                  if (next !== 'PAS') setIsPrivate(false);
                }}
                disabled={loading}
              >
                <option value="PAS">Native PAS (on-chain)</option>
                <option value="PAS_X402">PAS (x402, off-chain)</option>
              </select>
            </div>

          <div className="form-group">
            <label className="form-label">
              Recipient Wallet Address <span className="required">*</span>
            </label>
            <div className="address-input-group">
              <input
                type="text"
                className={`form-input ${errors.recipientAddress ? 'error' : ''}`}
                value={recipientAddress}
                onChange={(e) => {
                  setRecipientAddress(e.target.value);
                  setErrors(prev => ({ ...prev, recipientAddress: '' }));
                }}
                placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"
                disabled={loading}
              />
              {account?.address && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleUseMyAddress}
                  disabled={loading}
                >
                  Use My Address
                </button>
              )}
            </div>
            {errors.recipientAddress && (
              <span className="error-message">{errors.recipientAddress}</span>
            )}
            <div className="form-hint">
              This is the wallet address that will receive payments for this service
            </div>
          </div>

          {paymentToken === 'PAS' && CONFIDENTIAL_SUBSCRIPTION_CONTRACT_ADDRESS && !isEditMode && (
            <div className="form-group">
              <label className="checkbox-group">
                <input
                  type="checkbox"
                  className="checkbox-input"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  disabled={loading}
                />
                <span className="checkbox-label">
                  Private subscription (Zama FHE on Sepolia — amount hidden on-chain)
                </span>
              </label>
            </div>
          )}
          <div className="form-group">
            <label className="checkbox-group">
              <input
                type="checkbox"
                className="checkbox-input"
                checked={autoPay}
                onChange={(e) => setAutoPay(e.target.checked)}
                disabled={loading}
              />
              <span className="checkbox-label">
                Enable Auto-Pay (automatically pay when due)
              </span>
            </label>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Service' : 'Create Service')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

