-- Drop the single-column unique on onChainSubscriptionId (IDs are only unique per contract)
DROP INDEX IF EXISTS "subscriptions_onChainSubscriptionId_key";

-- Compound unique: same on-chain ID can exist for different contracts (e.g. id 0 on contract A and id 0 on contract B)
CREATE UNIQUE INDEX "subscriptions_on_chain_id_contract_key" ON "subscriptions"("onChainSubscriptionId", "onChainContractAddress");
