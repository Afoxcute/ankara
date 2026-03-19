import { useState, useEffect } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { MultisigService, MultisigTransaction } from '../services/multisigService';
import './TransactionApproval.css';

interface TransactionApprovalProps {
  multisigService: MultisigService;
  multisigAddress: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export default function TransactionApproval({
  multisigService,
  multisigAddress,
  onSuccess,
  onError,
}: TransactionApprovalProps) {
  const account = useActiveAccount();
  const [transactions, setTransactions] = useState<MultisigTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [to, setTo] = useState('');
  const [value, setValue] = useState('');
  const [data, setData] = useState('0x');

  useEffect(() => {
    loadTransactions();
  }, [multisigAddress]);

  const loadTransactions = () => {
    const walletTransactions = multisigService.getWalletTransactions(multisigAddress);
    setTransactions(walletTransactions.sort((a, b) => b.createdAt - a.createdAt));
  };

  const handleCreateTransaction = async () => {
    if (!account?.address) {
      onError?.('Please connect your wallet');
      return;
    }

    if (!to.trim()) {
      onError?.('Please enter recipient address');
      return;
    }

    if (!value || parseFloat(value) <= 0) {
      onError?.('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      await multisigService.createTransaction(
        multisigAddress,
        account.address,
        to,
        value,
        data || '0x'
      );

      onSuccess?.('Transaction proposal created successfully');
      
      // Reset form
      setTo('');
      setValue('');
      setData('0x');
      setShowCreateForm(false);
      
      loadTransactions();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to create transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (txId: string) => {
    if (!account?.address) {
      onError?.('Please connect your wallet');
      return;
    }

    try {
      setLoading(true);
      await multisigService.approveTransaction(txId, account.address);
      onSuccess?.('Transaction approved successfully');
      loadTransactions();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to approve transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (txId: string) => {
    if (!account?.address) {
      onError?.('Please connect your wallet');
      return;
    }

    try {
      setLoading(true);
      await multisigService.rejectTransaction(txId, account.address);
      onSuccess?.('Transaction rejected');
      loadTransactions();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to reject transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (txId: string) => {
    if (!account?.address) {
      onError?.('Please connect your wallet');
      return;
    }

    try {
      setLoading(true);
      const txHash = await multisigService.executeTransaction(txId, account.address);
      onSuccess?.(`Transaction executed! Hash: ${txHash}`);
      loadTransactions();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to execute transaction');
    } finally {
      setLoading(false);
    }
  };

  const wallet = multisigService.getWallet(multisigAddress);
  const pendingTransactions = transactions.filter(tx => tx.status === 'pending');

  return (
    <div className="transaction-approval">
      <div className="section-header">
        <span className="section-icon">✅</span>
        <h2 className="section-title">Transaction Approvals</h2>
        {wallet && (
          <span className="wallet-info">
            {wallet.name} ({wallet.threshold} of {wallet.members.length})
          </span>
        )}
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : '+ Propose Transaction'}
        </button>
      </div>

      {showCreateForm && (
        <div className="create-transaction-form card">
          <h3>Propose New Transaction</h3>
          
          <div className="form-group">
            <label className="form-label">To Address</label>
            <input
              type="text"
              className="form-input"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="0x..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Amount (PAS)</label>
            <input
              type="number"
              className="form-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0.0"
              min="0"
              step="0.001"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Data (Hex, Optional)</label>
            <input
              type="text"
              className="form-input"
              value={data}
              onChange={(e) => setData(e.target.value)}
              placeholder="0x"
            />
          </div>

          <button
            className="btn btn-primary btn-full"
            onClick={handleCreateTransaction}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Propose Transaction'}
          </button>
        </div>
      )}

      <div className="transactions-list">
        {pendingTransactions.length > 0 && (
          <div className="pending-section">
            <h3 className="section-subtitle">Pending Transactions ({pendingTransactions.length})</h3>
            {pendingTransactions.map((tx) => (
              <TransactionCard
                key={tx.id}
                transaction={tx}
                wallet={wallet}
                account={account}
                onApprove={handleApprove}
                onReject={handleReject}
                onExecute={handleExecute}
                loading={loading}
              />
            ))}
          </div>
        )}

        {transactions.filter(tx => tx.status !== 'pending').length > 0 && (
          <div className="history-section">
            <h3 className="section-subtitle">Transaction History</h3>
            {transactions
              .filter(tx => tx.status !== 'pending')
              .map((tx) => (
                <TransactionCard
                  key={tx.id}
                  transaction={tx}
                  wallet={wallet}
                  account={account}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onExecute={handleExecute}
                  loading={loading}
                />
              ))}
          </div>
        )}

        {transactions.length === 0 && (
          <div className="empty-state card">
            <div className="empty-icon">✅</div>
            <h3>No Transactions</h3>
            <p>Propose your first transaction to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface TransactionCardProps {
  transaction: MultisigTransaction;
  wallet: any;
  account: any;
  onApprove: (txId: string) => void;
  onReject: (txId: string) => void;
  onExecute: (txId: string) => void;
  loading: boolean;
}

function TransactionCard({
  transaction,
  wallet,
  account,
  onApprove,
  onReject,
  onExecute,
  loading,
}: TransactionCardProps) {
  const hasApproved = transaction.approvals.includes(account?.address || '');
  const hasRejected = transaction.rejections.includes(account?.address || '');
  const canApprove = wallet && wallet.members.includes(account?.address) && !hasApproved && !hasRejected;
  const canExecute = transaction.status === 'approved' && wallet && wallet.members.includes(account?.address);

  return (
    <div className="transaction-card card">
      <div className="transaction-header">
        <div>
          <h4>Transaction #{transaction.id.substring(0, 8)}</h4>
          <span className={`status-badge status-${transaction.status}`}>
            {transaction.status}
          </span>
        </div>
      </div>

      <div className="transaction-details">
        <div className="detail-row">
          <span className="detail-label">To:</span>
          <span className="detail-value address">{transaction.to}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Amount:</span>
          <span className="detail-value">{transaction.value} PAS</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Proposed by:</span>
          <span className="detail-value address">{transaction.proposer.substring(0, 10)}...</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Approvals:</span>
          <span className="detail-value">
            {transaction.approvals.length} / {wallet?.threshold || 0}
          </span>
        </div>
        {transaction.transactionHash && (
          <div className="detail-row">
            <span className="detail-label">Tx Hash:</span>
            <span className="detail-value address">{transaction.transactionHash.substring(0, 20)}...</span>
          </div>
        )}
        <div className="detail-row">
          <span className="detail-label">Created:</span>
          <span className="detail-value">
            {new Date(transaction.createdAt).toLocaleString()}
          </span>
        </div>
      </div>

      {transaction.status === 'pending' && (
        <div className="transaction-actions">
          {canApprove && (
            <button
              className="btn btn-primary btn-small"
              onClick={() => onApprove(transaction.id)}
              disabled={loading}
            >
              Approve
            </button>
          )}
          {canApprove && (
            <button
              className="btn btn-secondary btn-small"
              onClick={() => onReject(transaction.id)}
              disabled={loading}
            >
              Reject
            </button>
          )}
          {hasApproved && (
            <span className="action-status">✓ You approved</span>
          )}
          {hasRejected && (
            <span className="action-status">✗ You rejected</span>
          )}
        </div>
      )}

      {canExecute && (
        <div className="transaction-actions">
          <button
            className="btn btn-success btn-small"
            onClick={() => onExecute(transaction.id)}
            disabled={loading}
          >
            Execute
          </button>
        </div>
      )}
    </div>
  );
}

