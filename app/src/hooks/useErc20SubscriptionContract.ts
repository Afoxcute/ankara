/**
 * ERC20 SubscriptionManager integration for on-chain stablecoin payments.
 *
 * Uses:
 * - SubscriptionManager (ERC20) contract (contracts/contracts/SubscriptionManager.sol)
 * - paymentToken approve() on the underlying ERC20/precompile token (e.g. USDC/USDt)
 * - then pay(subscriptionId) on the SubscriptionManager contract
 */
import { useCallback, useState } from "react";
import {
  getContract,
  prepareContractCall,
  readContract,
  type ThirdwebClient,
} from "thirdweb";
import {
  useSendAndConfirmTransaction,
} from "thirdweb/react";
import { parseUnits, encodeEventTopics } from "viem";

import { POLKADOT_HUB_TESTNET } from "../services/x402PaymentService";
import { SUBSCRIPTION_ABI } from "../contracts/subscriptionContract";
import { subscriptionApi } from "../services/subscriptionApi";

const ERC20_APPROVE_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export type FrequencyEnum = 0 | 1 | 2; // Weekly, Monthly, Yearly

function frequencyToEnum(freq: "weekly" | "monthly" | "yearly"): FrequencyEnum {
  if (freq === "weekly") return 0;
  if (freq === "monthly") return 1;
  return 2;
}

async function fetchReceipt(txHash: string): Promise<{ logs?: { topics?: string[] }[] } | null> {
  const res = await fetch(POLKADOT_HUB_TESTNET.rpc, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getTransactionReceipt",
      params: [txHash],
    }),
  });
  const data = await res.json();
  return data?.result ?? null;
}

function parseSubscriptionIdFromReceipt(
  rec: { logs?: { topics?: string[] }[] } | null,
  subscriptionCreatedTopic0: string
): string {
  if (!rec?.logs?.length) return "0";
  for (const log of rec.logs) {
    if (log.topics?.[0]?.toLowerCase() === subscriptionCreatedTopic0.toLowerCase()) {
      const subId = log.topics[1] ? BigInt(log.topics[1]).toString() : "0";
      return subId;
    }
  }
  return "0";
}

export function useErc20SubscriptionContract(client: ThirdwebClient) {
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const { mutateAsync: sendAndConfirm, isPending: isSendAndConfirmPending } =
    useSendAndConfirmTransaction();

  // Topic0 for SubscriptionCreated(uint256 indexed subscriptionId, ...)
  const SUBSCRIPTION_CREATED_TOPIC_0 = encodeEventTopics({
    abi: SUBSCRIPTION_ABI,
    eventName: "SubscriptionCreated",
  });

  const subscribe = useCallback(
    async (args: {
      managerAddress: string;
      recipient: string;
      amountPerCycle: number;
      frequency: "weekly" | "monthly" | "yearly";
      tokenDecimals: number;
    }): Promise<{ subscriptionId: string; txHash: string }> => {
      const {
        managerAddress,
        recipient,
        amountPerCycle,
        frequency,
        tokenDecimals,
      } = args;

      if (!managerAddress) {
        throw new Error("ERC20 SubscriptionManager address is not configured (missing VITE_SUBSCRIPTION_CONTRACT_ADDRESS_USDC/USDT).");
      }
      if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
        throw new Error("Invalid recipient address");
      }

      const managerContract = getContract({
        client,
        chain: POLKADOT_HUB_TESTNET,
        address: managerAddress as `0x${string}`,
        abi: SUBSCRIPTION_ABI,
      });

      const amountWei = parseUnits(amountPerCycle.toString(), tokenDecimals);
      const tx = prepareContractCall({
        contract: managerContract,
        method: "subscribe",
        params: [recipient as `0x${string}`, amountWei, frequencyToEnum(frequency)],
      });
      const receipt = await sendAndConfirm(tx);
      const txHash = receipt.transactionHash;
      setLastTxHash(txHash);

      const rec = await fetchReceipt(txHash);
      const subscriptionId = parseSubscriptionIdFromReceipt(rec, SUBSCRIPTION_CREATED_TOPIC_0);
      return { subscriptionId, txHash };
    },
    [client, sendAndConfirm, SUBSCRIPTION_CREATED_TOPIC_0]
  );

  const cancel = useCallback(
    async (args: { managerAddress: string; onChainSubscriptionId: string }): Promise<string> => {
      const { managerAddress, onChainSubscriptionId } = args;
      if (!managerAddress) {
        throw new Error("ERC20 SubscriptionManager address is not configured.");
      }

      const managerContract = getContract({
        client,
        chain: POLKADOT_HUB_TESTNET,
        address: managerAddress as `0x${string}`,
        abi: SUBSCRIPTION_ABI,
      });

      const tx = prepareContractCall({
        contract: managerContract,
        method: "cancel",
        params: [BigInt(onChainSubscriptionId)],
      });

      const receipt = await sendAndConfirm(tx);
      const txHash = receipt.transactionHash;
      setLastTxHash(txHash);
      return txHash;
    },
    [client, sendAndConfirm]
  );

  const payWithApproval = useCallback(
    async (args: {
      managerAddress: string;
      tokenAddress: string;
      tokenDecimals: number;
      onChainSubscriptionId: string;
      amount: number;
      subscriptionIdBackend: string;
      networkName?: string;
    }): Promise<{ txHash: string }> => {
      const {
        managerAddress,
        tokenAddress,
        tokenDecimals,
        onChainSubscriptionId,
        amount,
        subscriptionIdBackend,
        networkName = "polkadot-testnet",
      } = args;

      if (!managerAddress) {
        throw new Error("ERC20 SubscriptionManager address is not configured.");
      }
      if (!tokenAddress) {
        throw new Error("ERC20 token address is not configured.");
      }

      const managerContract = getContract({
        client,
        chain: POLKADOT_HUB_TESTNET,
        address: managerAddress as `0x${string}`,
        abi: SUBSCRIPTION_ABI,
      });

      // Avoid PaymentNotDue revert on-chain.
      const isDue = await readContract({
        contract: managerContract,
        method: "isPaymentDue",
        params: [BigInt(onChainSubscriptionId)],
      });

      if (!isDue) {
        const sub = await readContract({
          contract: managerContract,
          method: "getSubscription",
          params: [BigInt(onChainSubscriptionId)],
        });
        const nextDueAt = sub[5] as bigint;
        const dateStr = new Date(Number(nextDueAt) * 1000).toLocaleString();
        throw new Error(`Payment not due yet on-chain. Next due: ${dateStr}.`);
      }

      const amountWei = parseUnits(amount.toString(), tokenDecimals);

      // 1) Approve SubscriptionManager to transfer tokens from subscriber.
      const tokenContract = getContract({
        client,
        chain: POLKADOT_HUB_TESTNET,
        address: tokenAddress as `0x${string}`,
        abi: ERC20_APPROVE_ABI,
      });

      const approveTx = prepareContractCall({
        contract: tokenContract,
        method: "approve",
        params: [managerAddress as `0x${string}`, amountWei],
      });
      const approveReceipt = await sendAndConfirm(approveTx);
      setLastTxHash(approveReceipt.transactionHash);

      // 2) Pay subscription for current cycle.
      const payTx = prepareContractCall({
        contract: managerContract,
        method: "pay",
        params: [BigInt(onChainSubscriptionId)],
      });
      const receipt = await sendAndConfirm(payTx);
      const txHash = receipt.transactionHash;
      setLastTxHash(txHash);

      await subscriptionApi.recordPayment(
        subscriptionIdBackend,
        amount,
        txHash,
        networkName,
        "completed"
      );

      return { txHash };
    },
    [client, sendAndConfirm]
  );

  return {
    subscribe,
    cancel,
    payWithApproval,
    isPending: isSendAndConfirmPending,
    lastTxHash,
  };
}

