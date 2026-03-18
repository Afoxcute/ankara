import { ethers } from "hardhat";

// Default payment token; set USDC_ADDRESS in .env for Polkadot Hub TestNet (or other network)
const USDC_DEFAULT = "0x0000053900000000000000000000000001200000";

async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  if (!deployer) {
    throw new Error(
      "No deployer account. Set PRIVATE_KEY in contracts/.env (e.g. PRIVATE_KEY=0x...). " +
      "Use the private key of a wallet that has PAS for gas on Polkadot Hub TestNet."
    );
  }
  console.log("Deploying SubscriptionManager with account:", deployer.address);

  const paymentToken = process.env.USDC_ADDRESS || USDC_DEFAULT;
  const SubscriptionManager = await ethers.getContractFactory("SubscriptionManager");
  const manager = await SubscriptionManager.deploy(paymentToken);
  await manager.waitForDeployment();
  const address = await manager.getAddress();
  console.log("SubscriptionManager deployed to:", address);
  console.log("Payment token (USDC):", paymentToken);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
