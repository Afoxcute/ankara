import { ThirdwebClient } from "thirdweb";

export interface MultisigWallet {
  address: string;
  name: string;
  members: string[];
  threshold: number; // Number of approvals needed
  createdAt: number;
  description?: string;
}

export interface MultisigTransaction {
  id: string;
  multisigAddress: string;
  proposer: string;
  to: string;
  value: string;
  data: string;
  status: 'pending' | 'approved' | 'executed' | 'rejected';
  approvals: string[];
  rejections: string[];
  createdAt: number;
  executedAt?: number;
  transactionHash?: string;
}

/**
 * Multisig Service for managing multisig wallets
 */
export class MultisigService {
  private wallets: Map<string, MultisigWallet> = new Map();
  private transactions: Map<string, MultisigTransaction> = new Map();

  constructor(_client: ThirdwebClient) {
    this.loadWalletsFromStorage();
  }

  /**
   * Create a new multisig wallet
   */
  async createMultisigWallet(
    name: string,
    members: string[],
    threshold: number,
    description?: string
  ): Promise<MultisigWallet> {
    if (threshold < 1 || threshold > members.length) {
      throw new Error('Threshold must be between 1 and the number of members');
    }

    if (members.length < 2) {
      throw new Error('Multisig wallet must have at least 2 members');
    }

    // Generate a deterministic address (in production, this would be from a smart contract)
    const address = `0x${Array.from({ length: 40 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}`;

    const wallet: MultisigWallet = {
      address,
      name,
      members: [...members], // Create a copy
      threshold,
      createdAt: Date.now(),
      description,
    };

    this.wallets.set(address, wallet);
    this.saveWalletsToStorage();

    return wallet;
  }

  /**
   * Add member to multisig wallet
   */
  async addMember(
    multisigAddress: string,
    newMember: string
  ): Promise<void> {
    const wallet = this.wallets.get(multisigAddress);
    if (!wallet) {
      throw new Error('Multisig wallet not found');
    }

    if (wallet.members.includes(newMember)) {
      throw new Error('Member already exists');
    }

    wallet.members.push(newMember);
    this.wallets.set(multisigAddress, wallet);
    this.saveWalletsToStorage();
  }

  /**
   * Remove member from multisig wallet
   */
  async removeMember(
    multisigAddress: string,
    memberToRemove: string
  ): Promise<void> {
    const wallet = this.wallets.get(multisigAddress);
    if (!wallet) {
      throw new Error('Multisig wallet not found');
    }

    if (wallet.members.length <= wallet.threshold) {
      throw new Error('Cannot remove member: threshold would be invalid');
    }

    wallet.members = wallet.members.filter(m => m !== memberToRemove);
    this.wallets.set(multisigAddress, wallet);
    this.saveWalletsToStorage();
  }

  /**
   * Update threshold
   */
  async updateThreshold(
    multisigAddress: string,
    newThreshold: number
  ): Promise<void> {
    const wallet = this.wallets.get(multisigAddress);
    if (!wallet) {
      throw new Error('Multisig wallet not found');
    }

    if (newThreshold < 1 || newThreshold > wallet.members.length) {
      throw new Error('Threshold must be between 1 and the number of members');
    }

    wallet.threshold = newThreshold;
    this.wallets.set(multisigAddress, wallet);
    this.saveWalletsToStorage();
  }

  /**
   * Create a multisig transaction
   */
  async createTransaction(
    multisigAddress: string,
    proposer: string,
    to: string,
    value: string,
    data: string = '0x'
  ): Promise<MultisigTransaction> {
    const wallet = this.wallets.get(multisigAddress);
    if (!wallet) {
      throw new Error('Multisig wallet not found');
    }

    if (!wallet.members.includes(proposer)) {
      throw new Error('Proposer must be a member of the multisig wallet');
    }

    const txId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const transaction: MultisigTransaction = {
      id: txId,
      multisigAddress,
      proposer,
      to,
      value,
      data,
      status: 'pending',
      approvals: [proposer], // Proposer auto-approves
      rejections: [],
      createdAt: Date.now(),
    };

    this.transactions.set(txId, transaction);
    this.saveTransactionsToStorage();

    return transaction;
  }

  /**
   * Approve a transaction
   */
  async approveTransaction(
    txId: string,
    approver: string
  ): Promise<void> {
    const tx = this.transactions.get(txId);
    if (!tx) {
      throw new Error('Transaction not found');
    }

    const wallet = this.wallets.get(tx.multisigAddress);
    if (!wallet) {
      throw new Error('Multisig wallet not found');
    }

    if (!wallet.members.includes(approver)) {
      throw new Error('Approver must be a member of the multisig wallet');
    }

    if (tx.approvals.includes(approver)) {
      throw new Error('Transaction already approved by this member');
    }

    if (tx.rejections.includes(approver)) {
      throw new Error('Transaction was rejected by this member');
    }

    tx.approvals.push(approver);

    // Check if we have enough approvals
    if (tx.approvals.length >= wallet.threshold) {
      tx.status = 'approved';
    }

    this.transactions.set(txId, tx);
    this.saveTransactionsToStorage();
  }

  /**
   * Reject a transaction
   */
  async rejectTransaction(
    txId: string,
    rejector: string
  ): Promise<void> {
    const tx = this.transactions.get(txId);
    if (!tx) {
      throw new Error('Transaction not found');
    }

    const wallet = this.wallets.get(tx.multisigAddress);
    if (!wallet) {
      throw new Error('Multisig wallet not found');
    }

    if (!wallet.members.includes(rejector)) {
      throw new Error('Rejector must be a member of the multisig wallet');
    }

    if (tx.rejections.includes(rejector)) {
      throw new Error('Transaction already rejected by this member');
    }

    tx.rejections.push(rejector);
    tx.status = 'rejected';

    this.transactions.set(txId, tx);
    this.saveTransactionsToStorage();
  }

  /**
   * Execute an approved transaction
   */
  async executeTransaction(
    txId: string,
    executor: string
  ): Promise<string> {
    const tx = this.transactions.get(txId);
    if (!tx) {
      throw new Error('Transaction not found');
    }

    if (tx.status !== 'approved') {
      throw new Error('Transaction is not approved');
    }

    const wallet = this.wallets.get(tx.multisigAddress);
    if (!wallet) {
      throw new Error('Multisig wallet not found');
    }

    if (!wallet.members.includes(executor)) {
      throw new Error('Executor must be a member of the multisig wallet');
    }

    // In a real implementation, this would interact with a smart contract
    // For now, we'll simulate the transaction
    const transactionHash = `0x${Math.random().toString(16).substr(2, 64)}`;

    tx.status = 'executed';
    tx.executedAt = Date.now();
    tx.transactionHash = transactionHash;
    this.transactions.set(txId, tx);
    this.saveTransactionsToStorage();

    return transactionHash;
  }

  /**
   * Get multisig wallet by address
   */
  getWallet(address: string): MultisigWallet | undefined {
    return this.wallets.get(address);
  }

  /**
   * Get all multisig wallets
   */
  getAllWallets(): MultisigWallet[] {
    return Array.from(this.wallets.values());
  }

  /**
   * Get transactions for a multisig wallet
   */
  getWalletTransactions(multisigAddress: string): MultisigTransaction[] {
    return Array.from(this.transactions.values()).filter(
      tx => tx.multisigAddress.toLowerCase() === multisigAddress.toLowerCase()
    );
  }

  /**
   * Get transaction by ID
   */
  getTransaction(txId: string): MultisigTransaction | undefined {
    return this.transactions.get(txId);
  }

  /**
   * Get pending transactions for a wallet
   */
  getPendingTransactions(multisigAddress: string): MultisigTransaction[] {
    return this.getWalletTransactions(multisigAddress).filter(
      tx => tx.status === 'pending'
    );
  }

  /**
   * Load wallets from localStorage
   */
  private loadWalletsFromStorage(): void {
    try {
      const stored = localStorage.getItem('multisigWallets');
      if (stored) {
        const wallets = JSON.parse(stored);
        this.wallets = new Map(wallets);
      }
    } catch (error) {
      console.error('Error loading multisig wallets from storage:', error);
    }

    try {
      const stored = localStorage.getItem('multisigTransactions');
      if (stored) {
        const transactions = JSON.parse(stored);
        this.transactions = new Map(transactions);
      }
    } catch (error) {
      console.error('Error loading multisig transactions from storage:', error);
    }
  }

  /**
   * Save wallets to localStorage
   */
  private saveWalletsToStorage(): void {
    try {
      localStorage.setItem('multisigWallets', JSON.stringify(Array.from(this.wallets.entries())));
    } catch (error) {
      console.error('Error saving multisig wallets to storage:', error);
    }
  }

  /**
   * Save transactions to localStorage
   */
  private saveTransactionsToStorage(): void {
    try {
      localStorage.setItem('multisigTransactions', JSON.stringify(Array.from(this.transactions.entries())));
    } catch (error) {
      console.error('Error saving multisig transactions to storage:', error);
    }
  }
}

// Export factory function
export function createMultisigService(client: ThirdwebClient): MultisigService {
  return new MultisigService(client);
}

