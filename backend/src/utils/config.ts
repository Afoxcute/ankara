import 'dotenv/config'
import { Chain, Address, createPublicClient, createWalletClient, http, WalletClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

// Flow EVM Testnet configuration
const flowTestnet: Chain = {
  id: 545,
  name: 'Flow EVM Testnet',
  nativeCurrency: {
    name: 'FLOW',
    symbol: 'FLOW',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://testnet.evm.nodes.onflow.org'],
    },
    public: {
      http: ['https://testnet.evm.nodes.onflow.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Flow EVM Testnet Explorer',
      url: 'https://evm-testnet.flowscan.io',
    },
  },
}

interface NetworkConfig {
    rpcProviderUrl: string
    blockExplorer: string
    chain: Chain
    nativeTokenAddress: Address
}

// Network configuration (Flow EVM Testnet)
const networkConfig: NetworkConfig = {
    rpcProviderUrl: 'https://testnet.evm.nodes.onflow.org',
    blockExplorer: 'https://evm-testnet.flowscan.io',
    chain: flowTestnet,
    nativeTokenAddress: '0x0000000000000000000000000000000000000000' as Address, // Native FLOW token
}

// Helper functions
const validateEnvironmentVars = () => {
    if (!process.env.WALLET_PRIVATE_KEY && !process.env.ECDSA_PRIVATE_KEY_TEST) {
        throw new Error('WALLET_PRIVATE_KEY or ECDSA_PRIVATE_KEY_TEST is required in .env file')
    }
}

validateEnvironmentVars()

// Create account from private key
const privateKey = (process.env.WALLET_PRIVATE_KEY || process.env.ECDSA_PRIVATE_KEY_TEST) as `0x${string}`;
export const account = privateKeyToAccount(privateKey);

export const networkInfo = {
    ...networkConfig,
    rpcProviderUrl: process.env.RPC_PROVIDER_URL || networkConfig.rpcProviderUrl,
}

const baseConfig = {
    chain: networkInfo.chain,
    transport: http(networkInfo.rpcProviderUrl),
} as const

export const publicClient = createPublicClient(baseConfig)
export const walletClient: WalletClient = createWalletClient({
    chain: networkInfo.chain,
    transport: http(networkInfo.rpcProviderUrl),
    account,
})

// Export constants
export const NATIVE_TOKEN_ADDRESS = networkInfo.nativeTokenAddress
export const BLOCK_EXPLORER_URL = networkInfo.blockExplorer
