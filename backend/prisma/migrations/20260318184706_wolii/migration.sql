/*
  Warnings:

  - A unique constraint covering the columns `[onChainSubscriptionId,onChainContractAddress]` on the table `subscriptions` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "subscriptions_onChainSubscriptionId_key";

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "network" SET DEFAULT 'polkadot-testnet';

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_onChainSubscriptionId_onChainContractAddress_key" ON "subscriptions"("onChainSubscriptionId", "onChainContractAddress");
