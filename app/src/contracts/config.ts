/** Only use env value if it is a valid 20-byte (40 hex char) address. */
function validAddress(v: string | undefined): v is string {
  return typeof v === "string" && /^0x[a-fA-F0-9]{40}$/.test(v);
}

/**
 * Subscription smart contract configuration.
 * SubscriptionManager on Polkadot Hub TestNet.
 * If VITE_SUBSCRIPTION_CONTRACT_ADDRESS is set but invalid (e.g. placeholder "0x..."), the default is used.
 */
export const SUBSCRIPTION_CONTRACT_ADDRESS: string =
  validAddress(import.meta.env.VITE_SUBSCRIPTION_CONTRACT_ADDRESS as string | undefined)
    ? (import.meta.env.VITE_SUBSCRIPTION_CONTRACT_ADDRESS as string)
    : "0xb2AC0Db5788B222c417F9C1353C5574bC8106C77";

// ERC20 SubscriptionManager contracts (USDC/USDt payments).
// These must be deployed separately (one contract per paymentToken in the constructor).
export const USDC_SUBSCRIPTION_CONTRACT_ADDRESS = import.meta.env
  .VITE_USDC_SUBSCRIPTION_CONTRACT_ADDRESS as string | undefined;

export const USDt_SUBSCRIPTION_CONTRACT_ADDRESS = import.meta.env
  .VITE_USDT_SUBSCRIPTION_CONTRACT_ADDRESS as string | undefined;

/** Polkadot Hub TestNet */
export const POLKADOT_TESTNET_CHAIN_ID = 420420417;
export const POLKADOT_TESTNET_RPC = "https://eth-rpc-testnet.polkadot.io";
export const POLKADOT_TESTNET_EXPLORER = "https://blockscout-testnet.polkadot.io";

/** Confidential subscriptions (Zama FHE) on Sepolia. Set VITE_CONFIDENTIAL_SUBSCRIPTION_CONTRACT_ADDRESS after deploying ConfidentialSubscriptionManager. */
export const CONFIDENTIAL_SUBSCRIPTION_CONTRACT_ADDRESS =
  import.meta.env.VITE_CONFIDENTIAL_SUBSCRIPTION_CONTRACT_ADDRESS as string | undefined;
/** Sepolia (FHEVM host for Zama). */
export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_RPC = "https://rpc.sepolia.org";
