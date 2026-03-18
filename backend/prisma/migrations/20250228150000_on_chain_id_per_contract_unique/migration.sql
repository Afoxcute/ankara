-- Prisma applies migrations to a "shadow database" from scratch to validate them.
-- This migration is intended to add a compound unique constraint, but it may run
-- before the `subscriptions` table exists in the shadow DB (due to historical
-- ordering of migration files). Guard against that so the migration is idempotent.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
  ) THEN
    -- Drop the single-column unique on onChainSubscriptionId (IDs are only unique per contract)
    DROP INDEX IF EXISTS "subscriptions_onChainSubscriptionId_key";

    -- Compound unique: same on-chain ID can exist for different contracts (e.g. id 0 on contract A and id 0 on contract B)
    CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_on_chain_id_contract_key"
      ON "subscriptions"("onChainSubscriptionId", "onChainContractAddress");
  END IF;
END $$;
