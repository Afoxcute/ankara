/**
 * FHE (Fully Homomorphic Encryption) service using Zama relayer SDK.
 * Used for confidential subscriptions on Sepolia FHEVM.
 * @see https://docs.zama.ai/protocol
 */

import {
  initSDK,
  createInstance,
  SepoliaConfig,
} from '@zama-fhe/relayer-sdk/web';

export const FHEVM_CHAIN_ID = 11155111; // Sepolia (FHEVM host)

type FhevmInstance = Awaited<ReturnType<typeof createInstance>>;

let instancePromise: Promise<FhevmInstance> | null = null;

/**
 * Load WASM and create the FHEVM instance. Call once before using encrypt/decrypt.
 * Requires window.ethereum (e.g. MetaMask) and Sepolia.
 */
export async function getFhevmInstance(): Promise<FhevmInstance> {
  if (instancePromise) return instancePromise;
  const provider =
    typeof window !== 'undefined' && (window as unknown as { ethereum?: unknown }).ethereum;
  if (!provider) {
    throw new Error('FHE: No Ethereum provider (e.g. MetaMask).');
  }
  await initSDK();
  const config = {
    ...SepoliaConfig,
    network: provider as EIP1193Provider,
  };
  instancePromise = createInstance(config);
  return instancePromise;
}

/** EIP-1193 provider type for the SDK */
interface EIP1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

/**
 * Result of creating encrypted subscription input (handles + proof for contract call).
 */
export interface EncryptedSubscriptionInput {
  /** Handle for the encrypted amount (euint64) - pass as first encrypted arg to contract */
  amountHandle: string;
  /** Single proof for all encrypted inputs - pass as `bytes calldata inputProof` */
  inputProof: string;
}

/**
 * Create encrypted subscription amount and proof for a confidential subscribe() call.
 * @param contractAddress - FHEVM contract address (ConfidentialSubscriptionManager)
 * @param userAddress - Subscriber address (allowed to use the ciphertext)
 * @param amountWei - Amount per cycle in wei (will be stored as euint64)
 */
export async function createEncryptedSubscriptionInput(
  contractAddress: string,
  userAddress: string,
  amountWei: bigint
): Promise<EncryptedSubscriptionInput> {
  const instance = await getFhevmInstance();
  const buffer = instance.createEncryptedInput(contractAddress, userAddress);
  buffer.add64(amountWei);
  const { handles, inputProof } = await buffer.encrypt();
  if (!handles.length) throw new Error('FHE: No handles returned from encrypt.');
  const amountHandle = bytesToHex(handles[0]);
  const proofHex = bytesToHex(inputProof);
  return { amountHandle, inputProof: proofHex };
}

function bytesToHex(bytes: Uint8Array): string {
  return '0x' + Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Keypair for user decryption (NaCl). Generate client-side and use privateKey only in memory.
 */
export interface FheKeypair {
  publicKey: string;
  privateKey: string;
}

/**
 * Request user decryption of ciphertext(s). Only the requesting user can see the result.
 * @param handleContractPairs - List of { handle (hex bytes32), contractAddress }
 * @param signer - Must have signTypedData (e.g. ethers Wallet or compatible)
 * @param userAddress - Address of the user (must match signer)
 * @param durationDays - Request validity in days (e.g. 10)
 * @returns Map of handle (hex) -> decrypted value (bigint for euint64, etc.)
 */
export async function userDecryptSubscription(
  handleContractPairs: { handle: string; contractAddress: string }[],
  signer: { signTypedData: (domain: unknown, types: unknown, value: unknown) => Promise<string>; address: string },
  userAddress: string,
  durationDays: number = 10
): Promise<Record<string, bigint | boolean | string>> {
  const instance = await getFhevmInstance();
  const keypair = instance.generateKeypair();
  const startTimestamp = Math.floor(Date.now() / 1000);
  const contractAddresses = [...new Set(handleContractPairs.map((p) => p.contractAddress))];

  const eip712 = instance.createEIP712(
    keypair.publicKey,
    contractAddresses,
    startTimestamp,
    durationDays
  );

  const signature = await signer.signTypedData(
    eip712.domain,
    { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
    eip712.message
  );

  const result = await instance.userDecrypt(
    handleContractPairs,
    keypair.privateKey,
    keypair.publicKey,
    signature.replace(/^0x/, ''),
    contractAddresses,
    userAddress,
    startTimestamp,
    durationDays
  );

  return result as Record<string, bigint | boolean | string>;
}

/**
 * Public decryption (everyone can see the result). Use for e.g. public auction results.
 */
export async function publicDecryptHandles(
  handles: string[]
): Promise<Record<string, unknown>> {
  const instance = await getFhevmInstance();
  const results = await instance.publicDecrypt(handles);
  return (results as { clearValues?: Record<string, unknown> }).clearValues ?? {};
}
