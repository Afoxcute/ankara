import { ethers } from "hardhat";

/**
 * Deploy ConfidentialSubscriptionManager (Zama FHEVM on Sepolia).
 * Requires @fhevm/solidity. Set PRIVATE_KEY and run:
 *   yarn hardhat run scripts/deploy-confidential.ts --network sepolia
 * Then set VITE_CONFIDENTIAL_SUBSCRIPTION_CONTRACT_ADDRESS in app/.env
 */
async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  if (!deployer) {
    throw new Error(
      "No deployer. Set PRIVATE_KEY in contracts/.env. Use a wallet with Sepolia ETH for gas."
    );
  }
  console.log("Deploying ConfidentialSubscriptionManager (FHEVM) with account:", deployer.address);

  const ConfidentialSubscriptionManager =
    await ethers.getContractFactory("ConfidentialSubscriptionManager");
  const manager = await ConfidentialSubscriptionManager.deploy();
  await manager.waitForDeployment();
  const address = await manager.getAddress();
  console.log("ConfidentialSubscriptionManager deployed to:", address);
  console.log("Set in app/.env: VITE_CONFIDENTIAL_SUBSCRIPTION_CONTRACT_ADDRESS=", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
