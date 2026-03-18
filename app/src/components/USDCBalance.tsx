import { useActiveAccount, useReadContract } from "thirdweb/react";
import { getContract } from "thirdweb";
import { FLOW_TESTNET, USDC_TESTNET } from "../services/x402PaymentService";
import { formatUnits } from "viem";

interface USDCBalanceProps {
  client: any;
}

export default function USDCBalance({ client }: USDCBalanceProps) {
  const account = useActiveAccount();

  // Get USDC contract - always call getContract, even if account is null
  const usdcContract = getContract({
    address: USDC_TESTNET as `0x${string}`,
    chain: FLOW_TESTNET,
    client: client,
  });

  // Always call useReadContract hook - use enabled option to control when it runs
  const { data: balance, isLoading } = useReadContract({
    contract: usdcContract,
    method: "function balanceOf(address owner) view returns (uint256)",
    params: account?.address ? [account.address] : [undefined as any],
    queryOptions: {
      enabled: !!account && !!account.address, // Only fetch when account exists
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });

  // Early return after all hooks have been called
  if (!account) {
    return null;
  }

  if (isLoading) {
    return (
      <div style={{ 
        padding: "0.5rem 1rem", 
        fontSize: "0.875rem",
        color: "var(--color-text-secondary)"
      }}>
        Loading USDC.e...
      </div>
    );
  }

  if (!balance) {
    return null;
  }

  // USDC has 6 decimals
  const formattedBalance = formatUnits(balance as bigint, 6);
  const displayBalance = parseFloat(formattedBalance).toFixed(2);

  return (
    <div style={{ 
      padding: "0.5rem 1rem", 
      fontSize: "0.875rem",
      fontWeight: 500,
      color: "var(--color-text-primary)",
      background: "var(--color-bg-glass)",
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--color-border-primary)",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem"
    }}>
      <span>💵</span>
      <span>{displayBalance} USDC.e</span>
    </div>
  );
}

