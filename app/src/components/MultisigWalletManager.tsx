import { useState, useEffect } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { MultisigService, MultisigWallet } from '../services/multisigService';
import './MultisigWalletManager.css';

interface MultisigWalletManagerProps {
  multisigService: MultisigService;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export default function MultisigWalletManager({
  multisigService,
  onSuccess,
  onError,
}: MultisigWalletManagerProps) {
  const account = useActiveAccount();
  const [wallets, setWallets] = useState<MultisigWallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form state
  const [walletName, setWalletName] = useState('');
  const [members, setMembers] = useState<string[]>(['']);
  const [threshold, setThreshold] = useState(2);
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = () => {
    const allWallets = multisigService.getAllWallets();
    setWallets(allWallets);
  };

  const handleAddMember = () => {
    setMembers([...members, '']);
  };

  const handleRemoveMember = (index: number) => {
    if (members.length > 1) {
      setMembers(members.filter((_, i) => i !== index));
    }
  };

  const handleMemberChange = (index: number, value: string) => {
    const newMembers = [...members];
    newMembers[index] = value;
    setMembers(newMembers);
  };

  const handleCreateWallet = async () => {
    if (!account?.address) {
      onError?.('Please connect your wallet');
      return;
    }

    if (!walletName.trim()) {
      onError?.('Please enter a wallet name');
      return;
    }

    const validMembers = members.filter(m => m.trim() !== '');
    if (validMembers.length < 2) {
      onError?.('Multisig wallet must have at least 2 members');
      return;
    }

    if (threshold < 1 || threshold > validMembers.length) {
      onError?.('Threshold must be between 1 and the number of members');
      return;
    }

    // Ensure current account is included
    if (!validMembers.includes(account.address)) {
      validMembers.push(account.address);
    }

    try {
      setLoading(true);
      const wallet = await multisigService.createMultisigWallet(
        walletName,
        validMembers,
        threshold,
        description || undefined
      );

      onSuccess?.(`Multisig wallet "${wallet.name}" created successfully!`);
      
      // Reset form
      setWalletName('');
      setMembers(['']);
      setThreshold(2);
      setDescription('');
      setShowCreateForm(false);
      
      loadWallets();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to create multisig wallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="multisig-wallet-manager">
      <div className="section-header">
        <span className="section-icon">👥</span>
        <h2 className="section-title">Multisig Wallets</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : '+ Create Wallet'}
        </button>
      </div>

      {showCreateForm && (
        <div className="create-wallet-form card">
          <h3>Create New Multisig Wallet</h3>
          
          <div className="form-group">
            <label className="form-label">Wallet Name</label>
            <input
              type="text"
              className="form-input"
              value={walletName}
              onChange={(e) => setWalletName(e.target.value)}
              placeholder="My Multisig Wallet"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description (Optional)</label>
            <textarea
              className="form-input form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this multisig wallet"
              rows={2}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Members</label>
            {members.map((member, index) => (
              <div key={index} className="member-input-row">
                <input
                  type="text"
                  className="form-input"
                  value={member}
                  onChange={(e) => handleMemberChange(index, e.target.value)}
                  placeholder="0x..."
                />
                {members.length > 1 && (
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => handleRemoveMember(index)}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              className="btn btn-secondary btn-small"
              onClick={handleAddMember}
            >
              + Add Member
            </button>
            {account?.address && (
              <p className="form-hint">
                Your address ({account.address.substring(0, 10)}...) will be automatically added
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              Threshold (Approvals Needed: {threshold} of {members.filter(m => m.trim() !== '').length || 1})
            </label>
            <input
              type="number"
              className="form-input"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              min={1}
              max={members.filter(m => m.trim() !== '').length || 1}
            />
          </div>

          <button
            className="btn btn-primary btn-full"
            onClick={handleCreateWallet}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Wallet'}
          </button>
        </div>
      )}

      <div className="wallets-grid">
        {wallets.map((wallet) => (
          <div key={wallet.address} className="wallet-card card">
            <div className="wallet-header">
              <h3>{wallet.name}</h3>
              <span className="wallet-badge">
                {wallet.threshold} of {wallet.members.length}
              </span>
            </div>
            
            {wallet.description && (
              <p className="wallet-description">{wallet.description}</p>
            )}
            
            <div className="wallet-address">
              <span className="address-label">Address:</span>
              <span className="address-value">{wallet.address}</span>
            </div>

            <div className="wallet-members">
              <span className="members-label">Members ({wallet.members.length}):</span>
              <div className="members-list">
                {wallet.members.map((member, index) => (
                  <div key={index} className="member-item">
                    <span className="member-address">{member.substring(0, 10)}...</span>
                    {member.toLowerCase() === account?.address?.toLowerCase() && (
                      <span className="member-badge">You</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="wallet-footer">
              <span className="wallet-created">
                Created: {new Date(wallet.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}

        {wallets.length === 0 && (
          <div className="empty-state card">
            <div className="empty-icon">👥</div>
            <h3>No Multisig Wallets</h3>
            <p>Create your first multisig wallet to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}



