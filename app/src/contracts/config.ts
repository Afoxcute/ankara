/**
 * Subscription smart contract configuration.
 * SubscriptionManager on Polkadot Hub TestNet.
 * Override with VITE_SUBSCRIPTION_CONTRACT_ADDRESS in .env if needed.
 */
export const SUBSCRIPTION_CONTRACT_ADDRESS =
  (import.meta.env.VITE_SUBSCRIPTION_CONTRACT_ADDRESS as string | undefined) ||
  "0xb2AC0Db5788B222c417F9C1353C5574bC8106C77";

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
