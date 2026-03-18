import { ethers } from "hardhat";

/**
 * Deploy SubscriptionManagerFLOW (native PAS payments). No payment token.
 * Set PRIVATE_KEY in contracts/.env. Then: yarn deploy:flow
 */
async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  if (!deployer) {
    throw new Error(
      "No deployer account. Set PRIVATE_KEY in contracts/.env (e.g. PRIVATE_KEY=0x...). " +
      "Use the private key of a wallet that has PAS for gas on Polkadot Hub TestNet."
    );
  }
  console.log("Deploying SubscriptionManagerFLOW (native PAS) with account:", deployer.address);

  const SubscriptionManagerFLOW = await ethers.getContractFactory("SubscriptionManagerFLOW");
  const manager = await SubscriptionManagerFLOW.deploy();
  await manager.waitForDeployment();
  const address = await manager.getAddress();
  console.log("SubscriptionManagerFLOW deployed to:", address);
  console.log("Payments: native PAS (18 decimals). Set VITE_SUBSCRIPTION_CONTRACT_ADDRESS=", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
