/**
 * ConfidentialSubscriptionManager (Zama FHEVM on Sepolia) ABI.
 * Amount per cycle is encrypted (euint64); use fheService.userDecrypt to view.
 */
export const CONFIDENTIAL_SUBSCRIPTION_ABI = [
  {
    inputs: [
      { name: "recipient", type: "address" },
      { name: "encryptedAmountPerCycle", type: "bytes32" },
      { name: "frequency", type: "uint8" },
      { name: "inputProof", type: "bytes" },
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
    name: "getEncryptedAmountPerCycle",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "subscriptionId", type: "uint256" }],
    name: "getSubscriptionPublic",
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "subscriber", type: "address" },
          { name: "recipient", type: "address" },
          { name: "frequency", type: "uint8" },
          { name: "nextDueAt", type: "uint256" },
          { name: "active", type: "bool" },
          { name: "createdAt", type: "uint256" },
        ],
      },
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
] as const;
