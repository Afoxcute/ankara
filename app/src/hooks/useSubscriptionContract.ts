/**
 * React hook for SubscriptionManager contract (Thirdweb).
 * Subscribe, pay, and cancel on-chain; sync with backend via API.
 */
import { useCallback, useState } from "react";
import {
  getContract,
  prepareContractCall,
  readContract,
  type ThirdwebClient,
} from "thirdweb";
import {
  useSendTransaction,
  useSendAndConfirmTransaction,
} from "thirdweb/react";
import { POLKADOT_HUB_TESTNET } from "../services/x402PaymentService";
import {
  SUBSCRIPTION_CONTRACT_ADDRESS,
} from "../contracts/config";
import { SUBSCRIPTION_ABI_NATIVE_PAS } from "../contracts/subscriptionContract";
import { subscriptionApi } from "../services/subscriptionApi";
import { parseUnits, encodeEventTopics } from "viem";

/** PAS uses 18 decimals (wei). */
const PAS_DECIMALS = 18;

const SUBSCRIPTION_CREATED_ABI = [
  {
    type: "event",
    name: "SubscriptionCreated",
    inputs: [
      { name: "subscriptionId", type: "uint256", indexed: true },
      { name: "subscriber", type: "address", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "amountPerCycle", type: "uint256", indexed: false },
      { name: "frequency", type: "uint8", indexed: false },
      { name: "nextDueAt", type: "uint256", indexed: false },
    ],
  },
] as const;

const [SUBSCRIPTION_CREATED_TOPIC_0] = encodeEventTopics({
  abi: SUBSCRIPTION_CREATED_ABI,
  eventName: "SubscriptionCreated",
});

export function getSubscriptionManagerContract(client: ThirdwebClient) {
  if (!SUBSCRIPTION_CONTRACT_ADDRESS) {
    throw new Error(
      "VITE_SUBSCRIPTION_CONTRACT_ADDRESS is not set. Deploy SubscriptionManager: cd contracts && yarn deploy then set the env."
    );
  }
  return getContract({
    client,
    chain: POLKADOT_HUB_TESTNET,
    address: SUBSCRIPTION_CONTRACT_ADDRESS as `0x${string}`,
    abi: SUBSCRIPTION_ABI_NATIVE_PAS,
  });
}

export type FrequencyEnum = 0 | 1 | 2; // Weekly, Monthly, Yearly

function frequencyToEnum(
  freq: "weekly" | "monthly" | "yearly"
): FrequencyEnum {
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

function parseSubscriptionIdFromReceipt(rec: { logs?: { topics?: string[] }[] } | null): string {
  if (!rec?.logs?.length) return "0";
  for (const log of rec.logs) {
    if (
      log.topics?.[0]?.toLowerCase() === SUBSCRIPTION_CREATED_TOPIC_0.toLowerCase()
    ) {
      const subId = log.topics[1] ? BigInt(log.topics[1]).toString() : "0";
      return subId;
    }
  }
  return "0";
}

export function useSubscriptionContract(client: ThirdwebClient) {
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const { mutate: sendTx, isPending: isSendPending } = useSendTransaction();
  const { mutateAsync: sendAndConfirm } = useSendAndConfirmTransaction();

  const contract = getSubscriptionManagerContract(client);

  const subscribe = useCallback(
    async (
      recipient: string,
      amountPerCyclePas: number,
      frequency: "weekly" | "monthly" | "yearly"
    ): Promise<{ subscriptionId: string; txHash: string }> => {
      const amountWei = parseUnits(amountPerCyclePas.toString(), PAS_DECIMALS);
      const tx = prepareContractCall({
        contract,
        method: "subscribe",
        params: [
          recipient as `0x${string}`,
          amountWei,
          frequencyToEnum(frequency),
        ],
      });
      const receipt = await sendAndConfirm(tx);
      const txHash = receipt.transactionHash;
      setLastTxHash(txHash);
      const rec = await fetchReceipt(txHash);
      const subscriptionId = parseSubscriptionIdFromReceipt(rec);
      return { subscriptionId, txHash };
    },
    [contract, sendAndConfirm]
  );

  const pay = useCallback(
    (subscriptionId: string, valueWei?: bigint): Promise<string> => {
      const tx = prepareContractCall({
        contract,
        method: "pay",
        params: [BigInt(subscriptionId)],
        ...(valueWei !== undefined && valueWei !== null ? { value: valueWei } : {}),
      });
      return new Promise((resolve, reject) => {
        sendTx(tx, {
          onSuccess: (result) => {
            setLastTxHash(result.transactionHash);
            resolve(result.transactionHash);
          },
          onError: (e) => reject(e),
        });
      });
    },
    [contract, sendTx]
  );

  const cancel = useCallback(
    (subscriptionId: string): Promise<string> => {
      const tx = prepareContractCall({
        contract,
        method: "cancel",
        params: [BigInt(subscriptionId)],
      });
      return new Promise((resolve, reject) => {
        sendTx(tx, {
          onSuccess: (result) => {
            setLastTxHash(result.transactionHash);
            resolve(result.transactionHash);
          },
          onError: (e) => reject(e),
        });
      });
    },
    [contract, sendTx]
  );

  return {
    subscribe,
    pay,
    cancel,
    isPending: isSendPending,
    lastTxHash,
  };
}

export function useSubscriptionContractPay(client: ThirdwebClient) {
  const { pay, isPending: contractPending } = useSubscriptionContract(client);
  const pasContract = getSubscriptionManagerContract(client);

  /** Pay with native PAS. No approval needed; send value with the pay() call. */
  const payWithApproval = useCallback(
    async (
      onChainSubscriptionId: string,
      amountPas: number,
      subscriptionIdBackend: string
    ): Promise<{ txHash: string }> => {
      const isDue = await readContract({
        contract: pasContract,
        method: "isPaymentDue",
        params: [BigInt(onChainSubscriptionId)],
      });
      if (!isDue) {
        const sub = await readContract({
          contract: pasContract,
          method: "getSubscription",
          params: [BigInt(onChainSubscriptionId)],
        });
        const nextDueAt = sub[5];
        const dateStr = new Date(Number(nextDueAt) * 1000).toLocaleString();
        throw new Error(
          `Payment not due yet on-chain. Next due: ${dateStr}. You can pay again then.`
        );
      }
      const amountWei = parseUnits(amountPas.toString(), PAS_DECIMALS);
      const txHash = await pay(onChainSubscriptionId, amountWei);
      await subscriptionApi.recordPayment(
        subscriptionIdBackend,
        amountPas,
        txHash,
        "polkadot-testnet",
        "completed"
      );
      return { txHash };
    },
    [pasContract, pay]
  );

  return { payWithApproval, pay, isPending: contractPending };
}
