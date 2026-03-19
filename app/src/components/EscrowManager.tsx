import { useState, useEffect } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { EscrowService, Escrow } from '../services/escrowService';
import { MultisigService } from '../services/multisigService';
import './EscrowManager.css';

interface EscrowManagerProps {
  escrowService: EscrowService;
  multisigService: MultisigService;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export default function EscrowManager({
  escrowService,
  multisigService,
  onSuccess,
  onError,
}: EscrowManagerProps) {
  const account = useActiveAccount();
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedMultisig, setSelectedMultisig] = useState<string>('');

  // Form state
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [conditions, setConditions] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    loadEscrows();
  }, []);

  const loadEscrows = () => {
    if (selectedMultisig) {
      const multisigEscrows = escrowService.getEscrowsByMultisig(selectedMultisig);
      setEscrows(multisigEscrows);
    } else {
      const allEscrows = escrowService.getAllEscrows();
      setEscrows(allEscrows);
    }
  };

  const handleCreateEscrow = async () => {
    if (!account?.address) {
      onError?.('Please connect your wallet');
      return;
    }

    if (!selectedMultisig) {
      onError?.('Please select a multisig wallet');
      return;
    }

    if (!recipient.trim()) {
      onError?.('Please enter recipient address');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      onError?.('Please enter a valid amount');
      return;
    }

    if (!conditions.trim()) {
      onError?.('Please enter escrow conditions');
      return;
    }

    try {
      setLoading(true);
      const expiresAtTimestamp = expiresAt 
        ? new Date(expiresAt).getTime() 
        : undefined;

      const escrow = await escrowService.createEscrow(
        account,
        selectedMultisig,
        recipient,
        amount,
        conditions,
        undefined, // tokenAddress - can be extended for token escrows
        expiresAtTimestamp
      );

      onSuccess?.(`Escrow created successfully! ID: ${escrow.id}`);
      
      // Reset form
      setRecipient('');
      setAmount('');
      setConditions('');
      setExpiresAt('');
      setShowCreateForm(false);
      
      loadEscrows();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to create escrow');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (escrowId: string) => {
    if (!account?.address) {
      onError?.('Please connect your wallet');
      return;
    }

    try {
      setLoading(true);
      await escrowService.approveEscrow(account, escrowId);
      onSuccess?.('Escrow approved successfully');
      loadEscrows();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to approve escrow');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (escrowId: string) => {
    if (!account?.address) {
      onError?.('Please connect your wallet');
      return;
    }

    try {
      setLoading(true);
      const txHash = await escrowService.executeEscrow(account, escrowId);
      onSuccess?.(`Escrow executed! Transaction: ${txHash}`);
      loadEscrows();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to execute escrow');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (escrowId: string) => {
    if (!account?.address) {
      onError?.('Please connect your wallet');
      return;
    }

    try {
      setLoading(true);
      await escrowService.cancelEscrow(account, escrowId);
      onSuccess?.('Escrow cancelled successfully');
      loadEscrows();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to cancel escrow');
    } finally {
      setLoading(false);
    }
  };

  const multisigWallets = multisigService.getAllWallets();

  return (
    <div className="escrow-manager">
      <div className="section-header">
        <span className="section-icon">🔒</span>
        <h2 className="section-title">Escrow Services</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : '+ Create Escrow'}
        </button>
      </div>

      <div className="filter-section">
        <label className="form-label">Filter by Multisig Wallet:</label>
        <select
          className="form-select"
          value={selectedMultisig}
          onChange={(e) => {
            setSelectedMultisig(e.target.value);
            loadEscrows();
          }}
        >
          <option value="">All Escrows</option>
          {multisigWallets.map((wallet) => (
            <option key={wallet.address} value={wallet.address}>
              {wallet.name} ({wallet.address.substring(0, 10)}...)
            </option>
          ))}
        </select>
      </div>

      {showCreateForm && (
        <div className="create-escrow-form card">
          <h3>Create New Escrow</h3>
          
          <div className="form-group">
            <label className="form-label">Multisig Wallet</label>
            <select
              className="form-select"
              value={selectedMultisig}
              onChange={(e) => setSelectedMultisig(e.target.value)}
            >
              <option value="">Select a multisig wallet</option>
              {multisigWallets.map((wallet) => (
                <option key={wallet.address} value={wallet.address}>
                  {wallet.name} ({wallet.address.substring(0, 10)}...)
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Recipient Address</label>
            <input
              type="text"
              className="form-input"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Amount (PAS)</label>
            <input
              type="number"
              className="form-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              min="0"
              step="0.001"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Conditions</label>
            <textarea
              className="form-input form-textarea"
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="Describe the conditions for releasing the escrow..."
              rows={4}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Expiration Date (Optional)</label>
            <input
              type="datetime-local"
              className="form-input"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <button
            className="btn btn-primary btn-full"
            onClick={handleCreateEscrow}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Escrow'}
          </button>
        </div>
      )}

      <div className="escrows-grid">
        {escrows.map((escrow) => (
          <div key={escrow.id} className="escrow-card card">
            <div className="escrow-header">
              <h3>Escrow #{escrow.id.substring(0, 8)}</h3>
              <span className={`status-badge status-${escrow.status}`}>
                {escrow.status}
              </span>
            </div>

            <div className="escrow-details">
              <div className="detail-row">
                <span className="detail-label">Recipient:</span>
                <span className="detail-value address">{escrow.recipient.substring(0, 10)}...</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Amount:</span>
                <span className="detail-value">{escrow.amount} PAS</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Conditions:</span>
                <span className="detail-value">{escrow.conditions}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Approvals:</span>
                <span className="detail-value">
                  {escrow.approvals.length} / {escrow.approvalsNeeded}
                </span>
              </div>
              {escrow.expiresAt && (
                <div className="detail-row">
                  <span className="detail-label">Expires:</span>
                  <span className="detail-value">
                    {new Date(escrow.expiresAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="escrow-actions">
              {escrow.status === 'pending' && (
                <>
                  {!escrow.approvals.includes(account?.address || '') && (
                    <button
                      className="btn btn-primary btn-small"
                      onClick={() => handleApprove(escrow.id)}
                      disabled={loading}
                    >
                      Approve
                    </button>
                  )}
                  {escrow.depositor === account?.address && (
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => handleCancel(escrow.id)}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  )}
                </>
              )}
              {escrow.status === 'approved' && (
                <button
                  className="btn btn-success btn-small"
                  onClick={() => handleExecute(escrow.id)}
                  disabled={loading}
                >
                  Execute
                </button>
              )}
            </div>
          </div>
        ))}

        {escrows.length === 0 && (
          <div className="empty-state card">
            <div className="empty-icon">🔒</div>
            <h3>No Escrows</h3>
            <p>Create your first escrow to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}

