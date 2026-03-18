import { useActiveAccount, useWalletBalance } from "thirdweb/react";
import { FLOW_TESTNET } from "../services/x402PaymentService";

interface FLOWBalanceProps {
  client: unknown;
}

export default function FLOWBalance({ client }: FLOWBalanceProps) {
  const account = useActiveAccount();
  const { data: balance, isLoading } = useWalletBalance({
    chain: FLOW_TESTNET,
    address: account?.address,
    client: client as any,
  });

  if (!account) {
    return null;
  }

  if (isLoading) {
    return (
      <div style={{
        padding: "0.5rem 1rem",
        fontSize: "0.875rem",
        color: "var(--color-text-secondary)",
      }}>
        Loading FLOW...
      </div>
    );
  }

  const displayBalance = balance?.displayValue ?? "0";
  const symbol = balance?.symbol ?? "FLOW";

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
      gap: "0.5rem",
    }}>
      <span>💧</span>
      <span>{displayBalance} {symbol}</span>
    </div>
  );
}
