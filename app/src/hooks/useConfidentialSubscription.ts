/**
 * Confidential subscriptions (Zama FHE) on Sepolia.
 * Uses fheService for encrypt/userDecrypt and ethers for contract calls.
 */
import { useCallback, useState } from "react";
import { BrowserProvider, Contract, parseEther } from "ethers";
import {
  createEncryptedSubscriptionInput,
  userDecryptSubscription,
  getFhevmInstance,
} from "../services/fheService";
import { CONFIDENTIAL_SUBSCRIPTION_CONTRACT_ADDRESS } from "../contracts/config";
import { CONFIDENTIAL_SUBSCRIPTION_ABI } from "../contracts/confidentialSubscriptionContract";

const SEPOLIA_CHAIN_ID = 11155111;

function frequencyToEnum(freq: "weekly" | "monthly" | "yearly"): number {
  if (freq === "weekly") return 0;
  if (freq === "monthly") return 1;
  return 2;
}

export function useConfidentialSubscription() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscribe = useCallback(
    async (
      recipient: string,
      amountEth: number,
      frequency: "weekly" | "monthly" | "yearly"
    ): Promise<{ subscriptionId: string; txHash: string }> => {
      if (!CONFIDENTIAL_SUBSCRIPTION_CONTRACT_ADDRESS) {
        throw new Error(
          "Confidential contract not configured. Set VITE_CONFIDENTIAL_SUBSCRIPTION_CONTRACT_ADDRESS and deploy ConfidentialSubscriptionManager to Sepolia."
        );
      }
      const provider = (window as unknown as { ethereum?: unknown }).ethereum;
      if (!provider) throw new Error("No wallet (e.g. MetaMask) found.");
      setIsPending(true);
      setError(null);
      try {
        const ethersProvider = new BrowserProvider(provider as never);
        const signer = await ethersProvider.getSigner();
        const userAddress = await signer.getAddress();
        const network = await ethersProvider.getNetwork();
        if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
          try {
            await (provider as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }).request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: "0xaa36a7" }],
            });
          } catch (e) {
            throw new Error("Please switch to Sepolia in your wallet for confidential subscriptions.");
          }
        }
        const amountWei = parseEther(amountEth.toString());
        if (amountWei > BigInt("18446744073709551615")) {
          throw new Error("Amount too large for encrypted type (max ~18.44 ETH in wei for euint64).");
        }
        const { amountHandle, inputProof } = await createEncryptedSubscriptionInput(
          CONFIDENTIAL_SUBSCRIPTION_CONTRACT_ADDRESS,
          userAddress,
          amountWei
        );
        const contract = new Contract(
          CONFIDENTIAL_SUBSCRIPTION_CONTRACT_ADDRESS,
          CONFIDENTIAL_SUBSCRIPTION_ABI,
          signer
        );
        const tx = await contract.subscribe(
          recipient,
          amountHandle as `0x${string}`,
          frequencyToEnum(frequency),
          inputProof as `0x${string}`
        );
        const receipt = await tx.wait();
        const subscriptionId = receipt?.logs?.[0]?.topics?.[1]
          ? BigInt(receipt.logs[0].topics[1]).toString()
          : "0";
        return { subscriptionId, txHash: receipt.hash };
      } finally {
        setIsPending(false);
      }
    },
    []
  );

  const decryptAmount = useCallback(
    async (
      subscriptionId: string,
      signer?: { signTypedData: (domain: unknown, types: unknown, value: unknown) => Promise<string>; address: string }
    ): Promise<bigint> => {
      if (!CONFIDENTIAL_SUBSCRIPTION_CONTRACT_ADDRESS) {
        throw new Error("Confidential contract not configured.");
      }
      await getFhevmInstance();
      const provider = (window as unknown as { ethereum?: unknown }).ethereum;
      if (!provider) throw new Error("No wallet found.");
      const ethersProvider = new BrowserProvider(provider as never);
      const ethersSigner = await ethersProvider.getSigner();
      const contract = new Contract(
        CONFIDENTIAL_SUBSCRIPTION_CONTRACT_ADDRESS,
        CONFIDENTIAL_SUBSCRIPTION_ABI,
        ethersSigner
      );
      const handleRaw = await contract.getEncryptedAmountPerCycle(BigInt(subscriptionId));
      const handle =
        typeof handleRaw === "string"
          ? handleRaw
          : `0x${Array.from(new Uint8Array(handleRaw as ArrayLike<number>))
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("")}`;
      const s = signer ?? {
        signTypedData: (d: unknown, t: unknown, v: unknown) =>
          ethersSigner.signTypedData(d as never, t as never, v as never),
        address: await ethersSigner.getAddress(),
      };
      const results = await userDecryptSubscription(
        [{ handle, contractAddress: CONFIDENTIAL_SUBSCRIPTION_CONTRACT_ADDRESS }],
        s,
        s.address
      );
      const value = results[handle];
      if (typeof value === "bigint") return value;
      if (typeof value === "number") return BigInt(value);
      return BigInt(0);
    },
    []
  );

  return { subscribe, decryptAmount, isPending, error, setError };
}
