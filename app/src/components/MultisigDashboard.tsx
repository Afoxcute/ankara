import { useState, useEffect } from 'react';
import { MultisigService } from '../services/multisigService';
import { EscrowService } from '../services/escrowService';
import './MultisigDashboard.css';

interface MultisigDashboardProps {
  multisigService: MultisigService;
  escrowService: EscrowService;
}

export default function MultisigDashboard({
  multisigService,
  escrowService,
}: MultisigDashboardProps) {
  const [stats, setStats] = useState({
    totalWallets: 0,
    totalEscrows: 0,
    pendingTransactions: 0,
    pendingEscrows: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = () => {
    const wallets = multisigService.getAllWallets();
    const escrows = escrowService.getAllEscrows();
    
    let pendingTxs = 0;
    wallets.forEach(wallet => {
      const txs = multisigService.getPendingTransactions(wallet.address);
      pendingTxs += txs.length;
    });

    const pendingEscs = escrows.filter(e => e.status === 'pending').length;

    setStats({
      totalWallets: wallets.length,
      totalEscrows: escrows.length,
      pendingTransactions: pendingTxs,
      pendingEscrows: pendingEscs,
    });
  };

  return (
    <div className="multisig-dashboard">
      <div className="dashboard-header">
        <h1>Multisig & Escrow Dashboard</h1>
        <p className="dashboard-subtitle">Manage your multisig wallets and escrow services</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalWallets}</div>
            <div className="stat-label">Multisig Wallets</div>
          </div>
        </div>

        <div className="stat-card card">
          <div className="stat-icon">🔒</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalEscrows}</div>
            <div className="stat-label">Total Escrows</div>
          </div>
        </div>

        <div className="stat-card card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-value">{stats.pendingTransactions}</div>
            <div className="stat-label">Pending Transactions</div>
          </div>
        </div>

        <div className="stat-card card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <div className="stat-value">{stats.pendingEscrows}</div>
            <div className="stat-label">Pending Escrows</div>
          </div>
        </div>
      </div>

      <div className="dashboard-info">
        <div className="info-card card">
          <h3>🚀 Getting Started</h3>
          <ol>
            <li>Create a multisig wallet with multiple members</li>
            <li>Set the approval threshold (e.g., 2 of 3)</li>
            <li>Create escrow transactions that require multisig approval</li>
            <li>Approve and execute transactions when conditions are met</li>
          </ol>
        </div>

        <div className="info-card card">
          <h3>🔐 Security Features</h3>
          <ul>
            <li>Multiple signatures required for transactions</li>
            <li>Configurable approval thresholds</li>
            <li>Escrow conditions must be met before release</li>
            <li>Transparent transaction history</li>
          </ul>
        </div>
      </div>
    </div>
  );
}



