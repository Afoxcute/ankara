import { ethers } from "hardhat";

/**
 * Deploy SubscriptionManagerFLOW (native FLOW payments). No payment token.
 * Set PRIVATE_KEY in contracts/.env. Then: yarn deploy:flow
 */
async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  if (!deployer) {
    throw new Error(
      "No deployer account. Set PRIVATE_KEY in contracts/.env (e.g. PRIVATE_KEY=0x...). " +
      "Use the private key of a wallet that has FLOW for gas on Flow EVM Testnet."
    );
  }
  console.log("Deploying SubscriptionManagerFLOW (native FLOW) with account:", deployer.address);

  const SubscriptionManagerFLOW = await ethers.getContractFactory("SubscriptionManagerFLOW");
  const manager = await SubscriptionManagerFLOW.deploy();
  await manager.waitForDeployment();
  const address = await manager.getAddress();
  console.log("SubscriptionManagerFLOW deployed to:", address);
  console.log("Payments: native FLOW (18 decimals). Set VITE_SUBSCRIPTION_CONTRACT_ADDRESS=", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
