/**
 * SubscriptionManager contract integration for the frontend.
 * Native PAS on Polkadot Hub TestNet: deploy SubscriptionManagerFLOW.sol and set VITE_SUBSCRIPTION_CONTRACT_ADDRESS.
 */
import { getContract } from "viem";
import { SUBSCRIPTION_CONTRACT_ADDRESS } from "./config";

/** ABI for native PAS subscription manager (matches `SubscriptionManagerFLOW.sol`). pay() is payable. */
export const SUBSCRIPTION_ABI_NATIVE_PAS = [
  {
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amountPerCycle", type: "uint256" },
      { name: "frequency", type: "uint8" },
    ],
    name: "subscribe",
    outputs: [{ name: "subscriptionId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "subscriptionId", type: "uint256" }],
    name: "pay",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "subscriptionId", type: "uint256" }],
    name: "cancel",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "subscriptionId", type: "uint256" }],
    name: "getSubscription",
    outputs: [
      { name: "id", type: "uint256" },
      { name: "subscriber", type: "address" },
      { name: "recipient", type: "address" },
      { name: "amountPerCycle", type: "uint256" },
      { name: "frequency", type: "uint8" },
      { name: "nextDueAt", type: "uint256" },
      { name: "active", type: "bool" },
      { name: "createdAt", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "subscriber", type: "address" }],
    name: "getSubscriptionsBySubscriber",
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "subscriptionId", type: "uint256" }],
    name: "isPaymentDue",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "subscriptionId", type: "uint256" },
      { indexed: true, name: "subscriber", type: "address" },
      { indexed: true, name: "recipient", type: "address" },
      { indexed: false, name: "amountPerCycle", type: "uint256" },
      { indexed: false, name: "frequency", type: "uint8" },
      { indexed: false, name: "nextDueAt", type: "uint256" },
    ],
    name: "SubscriptionCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "subscriptionId", type: "uint256" },
      { indexed: true, name: "subscriber", type: "address" },
      { indexed: true, name: "recipient", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "nextDueAt", type: "uint256" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
    name: "PaymentMade",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "subscriptionId", type: "uint256" },
      { indexed: true, name: "subscriber", type: "address" },
      { indexed: true, name: "recipient", type: "address" },
    ],
    name: "SubscriptionCancelled",
    type: "event",
  },
  // Custom errors (native PAS subscription manager) so reverts decode
  { type: "error", name: "InvalidRecipient", inputs: [] },
  { type: "error", name: "InvalidAmount", inputs: [] },
  { type: "error", name: "SubscriptionNotFound", inputs: [] },
  { type: "error", name: "SubscriptionInactive", inputs: [] },
  { type: "error", name: "NotSubscriber", inputs: [] },
  { type: "error", name: "PaymentNotDue", inputs: [] },
  { type: "error", name: "InsufficientValue", inputs: [] },
  { type: "error", name: "TransferFailed", inputs: [] },
] as const;

/** @deprecated Use SUBSCRIPTION_ABI_NATIVE_PAS for native PAS. Kept for reference (ERC20 contract). */
export const SUBSCRIPTION_ABI = [
  {
    inputs: [{ name: "_paymentToken", type: "address" }],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amountPerCycle", type: "uint256" },
      { name: "frequency", type: "uint8" },
    ],
    name: "subscribe",
    outputs: [{ name: "subscriptionId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "subscriptionId", type: "uint256" }],
    name: "pay",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "subscriptionId", type: "uint256" },
      { name: "subscriber", type: "address" },
    ],
    name: "payFor",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "subscriptionId", type: "uint256" }],
    name: "cancel",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "subscriptionId", type: "uint256" }],
    name: "getSubscription",
    outputs: [
      { name: "id", type: "uint256" },
      { name: "subscriber", type: "address" },
      { name: "recipient", type: "address" },
      { name: "amountPerCycle", type: "uint256" },
      { name: "frequency", type: "uint8" },
      { name: "nextDueAt", type: "uint256" },
      { name: "active", type: "bool" },
      { name: "createdAt", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "subscriber", type: "address" }],
    name: "getSubscriptionsBySubscriber",
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "subscriptionId", type: "uint256" }],
    name: "isPaymentDue",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "paymentToken",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "subscriptionId", type: "uint256" },
      { indexed: true, name: "subscriber", type: "address" },
      { indexed: true, name: "recipient", type: "address" },
      { indexed: false, name: "amountPerCycle", type: "uint256" },
      { indexed: false, name: "frequency", type: "uint8" },
      { indexed: false, name: "nextDueAt", type: "uint256" },
    ],
    name: "SubscriptionCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "subscriptionId", type: "uint256" },
      { indexed: true, name: "subscriber", type: "address" },
      { indexed: true, name: "recipient", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "nextDueAt", type: "uint256" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
    name: "PaymentMade",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "subscriptionId", type: "uint256" },
      { indexed: true, name: "subscriber", type: "address" },
      { indexed: true, name: "recipient", type: "address" },
    ],
    name: "SubscriptionCancelled",
    type: "event",
  },
] as const;

export type Frequency = 0 | 1 | 2; // Weekly, Monthly, Yearly

export interface SubscriptionOnChain {
  id: bigint;
  subscriber: `0x${string}`;
  recipient: `0x${string}`;
  amountPerCycle: bigint;
  frequency: Frequency;
  nextDueAt: bigint;
  active: boolean;
  createdAt: bigint;
}

export function getSubscriptionContract(client: { publicClient?: any; walletClient?: any }) {
  if (!SUBSCRIPTION_CONTRACT_ADDRESS) {
    throw new Error("VITE_SUBSCRIPTION_CONTRACT_ADDRESS is not set. Deploy the contract first.");
  }
  return getContract({
    address: SUBSCRIPTION_CONTRACT_ADDRESS as `0x${string}`,
    abi: SUBSCRIPTION_ABI,
    client: client.publicClient ?? client.walletClient ?? client,
  });
}

export { SUBSCRIPTION_CONTRACT_ADDRESS };
