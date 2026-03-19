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
import { POLKADOT_HUB_TESTNET, USDC_TESTNET, USDT_TESTNET } from "../services/x402PaymentService";
import {
  SUBSCRIPTION_CONTRACT_ADDRESS,
  USDC_SUBSCRIPTION_CONTRACT_ADDRESS,
  USDt_SUBSCRIPTION_CONTRACT_ADDRESS,
} from "../contracts/config";
import { SUBSCRIPTION_ABI_FLOW, SUBSCRIPTION_ABI_ERC20 } from "../contracts/subscriptionContract";
import { subscriptionApi } from "../services/subscriptionApi";
import { parseUnits, encodeEventTopics } from "viem";

/** PAS uses 18 decimals (wei). */
const PAS_DECIMALS = 18;

const STABLECOIN_DECIMALS = 6;

const ERC20_APPROVE_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

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
    abi: SUBSCRIPTION_ABI_FLOW,
  });
}

export function getSubscriptionManagerContractErc20(
  client: ThirdwebClient,
  contractAddress: string
) {
  if (!contractAddress) {
    throw new Error(
      "Missing ERC20 SubscriptionManager contract address. Set VITE_USDC_SUBSCRIPTION_CONTRACT_ADDRESS / VITE_USDT_SUBSCRIPTION_CONTRACT_ADDRESS."
    );
  }
  return getContract({
    client,
    chain: POLKADOT_HUB_TESTNET,
    address: contractAddress as `0x${string}`,
    abi: SUBSCRIPTION_ABI_ERC20,
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
      amountPerCycleFlow: number,
      frequency: "weekly" | "monthly" | "yearly"
    ): Promise<{ subscriptionId: string; txHash: string }> => {
      const amountWei = parseUnits(amountPerCycleFlow.toString(), PAS_DECIMALS);
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

  const subscribeErc20 = useCallback(
    async (
      paymentToken: "USDC_ONCHAIN" | "USDt_ONCHAIN",
      recipient: string,
      amountHuman: number,
      frequency: "weekly" | "monthly" | "yearly"
    ): Promise<{ subscriptionId: string; txHash: string }> => {
      const addr =
        paymentToken === "USDC_ONCHAIN"
          ? USDC_SUBSCRIPTION_CONTRACT_ADDRESS
          : USDt_SUBSCRIPTION_CONTRACT_ADDRESS;
      if (!addr) {
        throw new Error(
          `ERC20 SubscriptionManager not configured for ${paymentToken}. Set VITE_USDC_SUBSCRIPTION_CONTRACT_ADDRESS / VITE_USDT_SUBSCRIPTION_CONTRACT_ADDRESS.`
        );
      }
      const erc20Contract = getSubscriptionManagerContractErc20(client, addr);
      const amountWei = parseUnits(amountHuman.toString(), STABLECOIN_DECIMALS);
      const tx = prepareContractCall({
        contract: erc20Contract,
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
    [client, sendAndConfirm]
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

  const cancelErc20 = useCallback(
    (paymentToken: "USDC_ONCHAIN" | "USDt_ONCHAIN", subscriptionId: string): Promise<string> => {
      const addr =
        paymentToken === "USDC_ONCHAIN"
          ? USDC_SUBSCRIPTION_CONTRACT_ADDRESS
          : USDt_SUBSCRIPTION_CONTRACT_ADDRESS;
      if (!addr) throw new Error(`ERC20 contract not configured for ${paymentToken}`);
      const erc20Contract = getSubscriptionManagerContractErc20(client, addr);
      const tx = prepareContractCall({
        contract: erc20Contract,
        method: "cancel",
        params: [BigInt(subscriptionId)],
      });
      return new Promise((resolve, reject) => {
        sendTx(tx, {
          onSuccess: (result) => resolve(result.transactionHash),
          onError: (e) => reject(e),
        });
      });
    },
    [client, sendTx]
  );

  return {
    subscribe,
    subscribeErc20,
    pay,
    cancel,
    cancelErc20,
    isPending: isSendPending,
    lastTxHash,
  };
}

export function useSubscriptionContractPay(client: ThirdwebClient) {
  const { pay, isPending: contractPending } = useSubscriptionContract(client);
  const { mutate: sendTx } = useSendTransaction();
  const pasContract = getSubscriptionManagerContract(client);

  /** Pay with native PAS. No approval needed; send value with the pay() call. */
  const payWithApproval = useCallback(
    async (
      onChainSubscriptionId: string,
      amountFlow: number,
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
      const amountWei = parseUnits(amountFlow.toString(), PAS_DECIMALS);
      const txHash = await pay(onChainSubscriptionId, amountWei);
      await subscriptionApi.recordPayment(
        subscriptionIdBackend,
        amountFlow,
        txHash,
        "polkadot-testnet",
        "completed"
      );
      return { txHash };
    },
    [pasContract, pay]
  );

  /** Pay with ERC20 stablecoin (USDC/USDt) on-chain: approve then pay. */
  const payErc20WithApproval = useCallback(
    async (
      paymentToken: "USDC_ONCHAIN" | "USDt_ONCHAIN",
      onChainSubscriptionId: string,
      amountTokenHuman: number,
      subscriptionIdBackend: string,
      subscriberAddress: string
    ): Promise<{ txHash: string }> => {
      const erc20ManagerAddress =
        paymentToken === "USDC_ONCHAIN"
          ? USDC_SUBSCRIPTION_CONTRACT_ADDRESS
          : USDt_SUBSCRIPTION_CONTRACT_ADDRESS;

      if (!erc20ManagerAddress) {
        throw new Error(
          `ERC20 SubscriptionManager not configured for ${paymentToken}. Set VITE_USDC_SUBSCRIPTION_CONTRACT_ADDRESS and/or VITE_USDT_SUBSCRIPTION_CONTRACT_ADDRESS.`
        );
      }

      const tokenAddress = paymentToken === "USDC_ONCHAIN" ? USDC_TESTNET : USDT_TESTNET;
      const erc20Contract = getSubscriptionManagerContractErc20(client, erc20ManagerAddress);

      const isDue = await readContract({
        contract: erc20Contract,
        method: "isPaymentDue",
        params: [BigInt(onChainSubscriptionId)],
      });
      if (!isDue) {
        const sub = await readContract({
          contract: erc20Contract,
          method: "getSubscription",
          params: [BigInt(onChainSubscriptionId)],
        });
        const nextDueAt = sub[5];
        const dateStr = new Date(Number(nextDueAt) * 1000).toLocaleString();
        throw new Error(`Payment not due yet on-chain. Next due: ${dateStr}. You can pay again then.`);
      }

      const amountWei = parseUnits(amountTokenHuman.toString(), STABLECOIN_DECIMALS);

      const tokenContract = getContract({
        client,
        chain: POLKADOT_HUB_TESTNET,
        address: tokenAddress as `0x${string}`,
        abi: ERC20_APPROVE_ABI,
      });

      try {
        const allowanceAmount = await readContract({
          contract: tokenContract,
          method: "allowance",
          params: [subscriberAddress as `0x${string}`, erc20ManagerAddress as `0x${string}`],
        });
        if (BigInt(String(allowanceAmount)) < amountWei) {
          const approveTx = prepareContractCall({
            contract: tokenContract,
            method: "approve",
            params: [erc20ManagerAddress as `0x${string}`, amountWei],
          });
          await new Promise<void>((resolve, reject) => {
            sendTx(approveTx, {
              onSuccess: () => resolve(),
              onError: (e) => reject(e),
            });
          });
        }
      } catch {
        const approveTx = prepareContractCall({
          contract: tokenContract,
          method: "approve",
          params: [erc20ManagerAddress as `0x${string}`, amountWei],
        });
        await new Promise<void>((resolve, reject) => {
          sendTx(approveTx, {
            onSuccess: () => resolve(),
            onError: (e) => reject(e),
          });
        });
      }

      const payTx = prepareContractCall({
        contract: erc20Contract,
        method: "pay",
        params: [BigInt(onChainSubscriptionId)],
      });

      const txHash: string = await new Promise((resolve, reject) => {
        sendTx(payTx, {
          onSuccess: (result) => resolve(result.transactionHash),
          onError: (e) => reject(e),
        });
      });

      await subscriptionApi.recordPayment(
        subscriptionIdBackend,
        amountTokenHuman,
        txHash,
        "polkadot-testnet",
        "completed"
      );
      return { txHash };
    },
    [client, sendTx]
  );

  return { payWithApproval, payErc20WithApproval, pay, isPending: contractPending };
}
