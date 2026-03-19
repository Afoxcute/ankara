import { ethers } from "hardhat";

/**
 * Deploy SubscriptionManagerFLOW (native PAS on Polkadot Hub TestNet). No ERC20 payment token.
 * Contract name remains SubscriptionManagerFLOW for artifact compatibility.
 * Set PRIVATE_KEY in contracts/.env. Then: yarn deploy:pas (or yarn deploy:flow)
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
  console.log("Deploying native PAS subscription manager with account:", deployer.address);

  const Factory = await ethers.getContractFactory("SubscriptionManagerFLOW");
  const manager = await Factory.deploy();
  await manager.waitForDeployment();
  const address = await manager.getAddress();
  console.log("Subscription manager deployed to:", address);
  console.log("Payments: native PAS (18 decimals). Set VITE_SUBSCRIPTION_CONTRACT_ADDRESS=", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
