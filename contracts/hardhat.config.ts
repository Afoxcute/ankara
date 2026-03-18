import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const PRIVATE_KEY = process.env.PRIVATE_KEY?.trim();
const accounts = PRIVATE_KEY
  ? [PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`]
  : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {},
    // Primary: use for SubscriptionManagerFLOW. yarn deploy:flow / deploy:testnet → Flow testnet.
    "flow-testnet": {
      url: "https://testnet.evm.nodes.onflow.org",
      chainId: 545,
      accounts,
    },
    // Optional: only for ConfidentialSubscriptionManager (Zama FHE). Use only with --network sepolia.
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL ?? "https://rpc.sepolia.org",
      chainId: 11155111,
      accounts,
    },
  },
  defaultNetwork: "flow-testnet",
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
