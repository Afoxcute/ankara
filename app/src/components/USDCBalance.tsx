import { useActiveAccount, useReadContract } from "thirdweb/react";
import { getContract } from "thirdweb";
import { POLKADOT_HUB_TESTNET, USDC_TESTNET, STABLECOIN_METADATA } from "../services/x402PaymentService";
import { formatUnits } from "viem";

interface USDCBalanceProps {
  client: any;
}

const meta = STABLECOIN_METADATA[USDC_TESTNET.toLowerCase()];

export default function USDCBalance({ client }: USDCBalanceProps) {
  const account = useActiveAccount();

  const usdcContract = getContract({
    address: USDC_TESTNET as `0x${string}`,
    chain: POLKADOT_HUB_TESTNET,
    client: client,
  });

  const { data: balance, isLoading } = useReadContract({
    contract: usdcContract,
    method: "function balanceOf(address owner) view returns (uint256)",
    params: account?.address ? [account.address] : [undefined as any],
    queryOptions: {
      enabled: !!account && !!account.address,
      refetchInterval: 10000,
    },
  });

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
        Loading {meta?.symbol ?? 'USDC'}...
      </div>
    );
  }

  if (!balance) {
    return null;
  }

  const decimals = meta?.decimals ?? 6;
  const symbol = meta?.symbol ?? 'USDC';
  const formattedBalance = formatUnits(balance as bigint, decimals);
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
      <span>{displayBalance} {symbol}</span>
    </div>
  );
}

