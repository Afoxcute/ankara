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
    // Primary: Polkadot Hub TestNet for contract deployment.
    "polkadot-testnet": {
      url: "https://eth-rpc-testnet.polkadot.io",
      chainId: 420420417,
      accounts,
    },
    // Optional: only for ConfidentialSubscriptionManager (Zama FHE). Use only with --network sepolia.
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL ?? "https://rpc.sepolia.org",
      chainId: 11155111,
      accounts,
    },
  },
  defaultNetwork: "polkadot-testnet",
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
