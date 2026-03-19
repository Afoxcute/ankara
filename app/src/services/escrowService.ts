import { ThirdwebClient } from "thirdweb";

export interface Escrow {
  id: string;
  multisigAddress: string;
  depositor: string;
  recipient: string;
  amount: string;
  tokenAddress?: string; // For token escrows, undefined for native PAS (Polkadot Hub)
  status: 'pending' | 'approved' | 'executed' | 'cancelled';
  conditions: string;
  createdAt: number;
  expiresAt?: number;
  approvals: string[];
  approvalsNeeded: number;
  transactionHash?: string;
}

export interface EscrowTransaction {
  escrowId: string;
  transactionHash?: string;
  type: 'create' | 'approve' | 'execute' | 'cancel';
  from: string;
  timestamp: number;
}

/**
 * Escrow Service for managing escrow transactions
 */
export class EscrowService {
  private escrows: Map<string, Escrow> = new Map();
  private transactions: EscrowTransaction[] = [];

  constructor(_client: ThirdwebClient) {
    this.loadEscrowsFromStorage();
  }

  /**
   * Create a new escrow
   */
  async createEscrow(
    account: any,
    multisigAddress: string,
    recipient: string,
    amount: string,
    conditions: string,
    tokenAddress?: string,
    expiresAt?: number
  ): Promise<Escrow> {
    const escrowId = `escrow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const escrow: Escrow = {
      id: escrowId,
      multisigAddress,
      depositor: account.address,
      recipient,
      amount,
      tokenAddress,
      status: 'pending',
      conditions,
      createdAt: Date.now(),
      expiresAt,
      approvals: [],
      approvalsNeeded: 1, // Will be fetched from multisig contract
    };

    this.escrows.set(escrowId, escrow);
    this.saveEscrowsToStorage();

    // Add transaction record
    this.addTransaction({
      escrowId,
      type: 'create',
      from: account.address,
      timestamp: Date.now(),
    });

    return escrow;
  }

  /**
   * Approve an escrow transaction
   */
  async approveEscrow(
    account: any,
    escrowId: string
  ): Promise<void> {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) {
      throw new Error('Escrow not found');
    }

    if (escrow.status !== 'pending') {
      throw new Error('Escrow is not pending');
    }

    if (escrow.approvals.includes(account.address)) {
      throw new Error('Already approved');
    }

    escrow.approvals.push(account.address);

    // Check if we have enough approvals
    if (escrow.approvals.length >= escrow.approvalsNeeded) {
      escrow.status = 'approved';
    }

    this.escrows.set(escrowId, escrow);
    this.saveEscrowsToStorage();

    // Add transaction record
    this.addTransaction({
      escrowId,
      type: 'approve',
      from: account.address,
      timestamp: Date.now(),
    });
  }

  /**
   * Execute an approved escrow
   */
  async executeEscrow(
    account: any,
    escrowId: string
  ): Promise<string> {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) {
      throw new Error('Escrow not found');
    }

    if (escrow.status !== 'approved') {
      throw new Error('Escrow is not approved');
    }

    try {
      // In a real implementation, this would interact with a smart contract
      // For now, we'll simulate the transaction
      const transactionHash = `0x${Math.random().toString(16).substr(2, 64)}`;

      escrow.status = 'executed';
      escrow.transactionHash = transactionHash;
      this.escrows.set(escrowId, escrow);
      this.saveEscrowsToStorage();

      // Add transaction record
      this.addTransaction({
        escrowId,
        transactionHash,
        type: 'execute',
        from: account.address,
        timestamp: Date.now(),
      });

      return transactionHash;
    } catch (error) {
      throw new Error(`Failed to execute escrow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel an escrow
   */
  async cancelEscrow(
    account: any,
    escrowId: string
  ): Promise<void> {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) {
      throw new Error('Escrow not found');
    }

    if (escrow.depositor !== account.address) {
      throw new Error('Only the depositor can cancel');
    }

    if (escrow.status === 'executed') {
      throw new Error('Cannot cancel executed escrow');
    }

    escrow.status = 'cancelled';
    this.escrows.set(escrowId, escrow);
    this.saveEscrowsToStorage();

    // Add transaction record
    this.addTransaction({
      escrowId,
      type: 'cancel',
      from: account.address,
      timestamp: Date.now(),
    });
  }

  /**
   * Get all escrows for a multisig wallet
   */
  getEscrowsByMultisig(multisigAddress: string): Escrow[] {
    return Array.from(this.escrows.values()).filter(
      escrow => escrow.multisigAddress.toLowerCase() === multisigAddress.toLowerCase()
    );
  }

  /**
   * Get escrow by ID
   */
  getEscrow(escrowId: string): Escrow | undefined {
    return this.escrows.get(escrowId);
  }

  /**
   * Get all escrows
   */
  getAllEscrows(): Escrow[] {
    return Array.from(this.escrows.values());
  }

  /**
   * Get transactions for an escrow
   */
  getEscrowTransactions(escrowId: string): EscrowTransaction[] {
    return this.transactions.filter(tx => tx.escrowId === escrowId);
  }

  /**
   * Add transaction record
   */
  private addTransaction(tx: EscrowTransaction): void {
    this.transactions.push(tx);
    this.saveTransactionsToStorage();
  }

  /**
   * Load escrows from localStorage
   */
  private loadEscrowsFromStorage(): void {
    try {
      const stored = localStorage.getItem('escrows');
      if (stored) {
        const escrows = JSON.parse(stored);
        this.escrows = new Map(escrows);
      }
    } catch (error) {
      console.error('Error loading escrows from storage:', error);
    }

    try {
      const stored = localStorage.getItem('escrowTransactions');
      if (stored) {
        this.transactions = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading escrow transactions from storage:', error);
    }
  }

  /**
   * Save escrows to localStorage
   */
  private saveEscrowsToStorage(): void {
    try {
      localStorage.setItem('escrows', JSON.stringify(Array.from(this.escrows.entries())));
    } catch (error) {
      console.error('Error saving escrows to storage:', error);
    }
  }

  /**
   * Save transactions to localStorage
   */
  private saveTransactionsToStorage(): void {
    try {
      localStorage.setItem('escrowTransactions', JSON.stringify(this.transactions));
    } catch (error) {
      console.error('Error saving escrow transactions to storage:', error);
    }
  }
}

// Export factory function
export function createEscrowService(client: ThirdwebClient): EscrowService {
  return new EscrowService(client);
}

