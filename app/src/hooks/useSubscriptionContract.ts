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
import {
  createPublicClient,
  decodeEventLog,
  defineChain,
  getAddress,
  http,
  parseUnits,
  encodeEventTopics,
  type Address,
  type Hex,
} from "viem";

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

/** Same RPC/chain as Thirdweb for reliable viem eth_call + receipts (avoids empty 0x from mismatched clients). */
const polkadotHubViemChain = defineChain({
  id: POLKADOT_HUB_TESTNET.id,
  name: POLKADOT_HUB_TESTNET.name,
  nativeCurrency: POLKADOT_HUB_TESTNET.nativeCurrency,
  rpcUrls: {
    default: { http: [POLKADOT_HUB_TESTNET.rpc] },
  },
});

const hubPublicClient = createPublicClient({
  chain: polkadotHubViemChain,
  transport: http(POLKADOT_HUB_TESTNET.rpc),
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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Resolve new subscription id from receipt logs (decodeEventLog + topic fallback).
 * Only considers logs emitted by the subscription manager contract.
 */
function parseSubscriptionIdFromReceiptLogs(
  logs: readonly { address: `0x${string}`; topics: readonly Hex[]; data: Hex }[],
  contractAddress: string
): { subscriptionId: string; matched: boolean } {
  const target = contractAddress.toLowerCase();
  if (!logs.length) return { subscriptionId: "0", matched: false };

  for (const log of logs) {
    if (log.address.toLowerCase() !== target) continue;
    try {
      const d = decodeEventLog({
        abi: SUBSCRIPTION_ABI_NATIVE_PAS,
        data: log.data,
        topics: log.topics as [Hex, ...Hex[]],
      });
      if (
        d.eventName === "SubscriptionCreated" &&
        d.args &&
        typeof d.args === "object" &&
        "subscriptionId" in d.args
      ) {
        const id = (d.args as { subscriptionId: bigint }).subscriptionId;
        return { subscriptionId: id.toString(), matched: true };
      }
    } catch {
      /* try topic fallback */
    }
  }

  const topic0 = SUBSCRIPTION_CREATED_TOPIC_0.toLowerCase();
  for (const log of logs) {
    if (log.address.toLowerCase() !== target) continue;
    const t0 = log.topics[0]?.toLowerCase();
    if (t0 === topic0 && log.topics[1]) {
      return { subscriptionId: BigInt(log.topics[1]).toString(), matched: true };
    }
  }
  return { subscriptionId: "0", matched: false };
}

async function waitForHubReceipt(txHash: `0x${string}`) {
  return hubPublicClient.waitForTransactionReceipt({
    hash: txHash,
    pollingInterval: 750,
    timeout: 120_000,
  });
}

async function readSubscriberIdsViem(subscriberAddress: string): Promise<readonly bigint[] | null> {
  try {
    const addr = getAddress(subscriberAddress);
    return await hubPublicClient.readContract({
      address: SUBSCRIPTION_CONTRACT_ADDRESS as Address,
      abi: SUBSCRIPTION_ABI_NATIVE_PAS,
      functionName: "getSubscriptionsBySubscriber",
      args: [addr],
    });
  } catch {
    return null;
  }
}

async function readNextSubscriptionIdViem(): Promise<bigint | null> {
  try {
    return await hubPublicClient.readContract({
      address: SUBSCRIPTION_CONTRACT_ADDRESS as Address,
      abi: SUBSCRIPTION_ABI_NATIVE_PAS,
      functionName: "nextSubscriptionId",
    });
  } catch {
    return null;
  }
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
      frequency: "weekly" | "monthly" | "yearly",
      /** Used to resolve subscription id if the RPC receipt is slow or missing logs. */
      subscriberAddress: string
    ): Promise<{ subscriptionId: string; txHash: string }> => {
      const code = await hubPublicClient.getBytecode({
        address: SUBSCRIPTION_CONTRACT_ADDRESS as Address,
      });
      if (!code || code === "0x") {
        throw new Error(
          `No bytecode at VITE_SUBSCRIPTION_CONTRACT_ADDRESS (${SUBSCRIPTION_CONTRACT_ADDRESS}) on Polkadot Hub. Deploy SubscriptionManagerPas and set the env.`
        );
      }

      const nextBefore = await readNextSubscriptionIdViem();

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
      const txHash = receipt.transactionHash as `0x${string}`;
      setLastTxHash(receipt.transactionHash);

      let subscriptionId = "0";
      let matched = false;

      try {
        const viemReceipt = await waitForHubReceipt(txHash);
        if (viemReceipt.status === "reverted") {
          throw new Error(
            "Subscribe transaction reverted on-chain. Check PAS balance, recipient address, and contract address."
          );
        }
        const parsed = parseSubscriptionIdFromReceiptLogs(
          viemReceipt.logs,
          SUBSCRIPTION_CONTRACT_ADDRESS
        );
        subscriptionId = parsed.subscriptionId;
        matched = parsed.matched;
      } catch (e) {
        if (e instanceof Error && e.message.includes("reverted")) throw e;
        /* fall through to subscriber / counter fallbacks */
      }

      if (!matched && subscriberAddress) {
        await sleep(600);
        const ids = await readSubscriberIdsViem(subscriberAddress);
        if (ids && ids.length > 0) {
          subscriptionId = ids[ids.length - 1]!.toString();
          matched = true;
        }
      }

      if (!matched) {
        const nextAfter = await readNextSubscriptionIdViem();
        if (
          nextBefore !== null &&
          nextAfter !== null &&
          nextAfter > nextBefore
        ) {
          subscriptionId = (nextAfter - 1n).toString();
          matched = true;
        } else if (nextAfter !== null && nextAfter > 0n) {
          subscriptionId = (nextAfter - 1n).toString();
          matched = true;
        }
      }

      if (!matched) {
        throw new Error(
          `Could not read subscription id after tx ${txHash.slice(0, 14)}… Open Blockscout and confirm logs from ${SUBSCRIPTION_CONTRACT_ADDRESS.slice(0, 10)}… — if the contract or RPC does not match Polkadot Hub, set VITE_SUBSCRIPTION_CONTRACT_ADDRESS to your SubscriptionManagerPas deployment.`
        );
      }

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
