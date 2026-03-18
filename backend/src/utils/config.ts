import 'dotenv/config'
import { Chain, Address, createPublicClient, createWalletClient, http, WalletClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

// Polkadot Hub TestNet configuration
const polkadotHubTestnet: Chain = {
  id: 420420417,
  name: 'Polkadot Hub TestNet',
  nativeCurrency: {
    name: 'Paseo',
    symbol: 'PAS',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://eth-rpc-testnet.polkadot.io'],
    },
    public: {
      http: ['https://eth-rpc-testnet.polkadot.io'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Polkadot Hub TestNet Explorer',
      url: 'https://blockscout-testnet.polkadot.io',
    },
  },
}

interface NetworkConfig {
    rpcProviderUrl: string
    blockExplorer: string
    chain: Chain
    nativeTokenAddress: Address
}

// Network configuration (Polkadot Hub TestNet)
const networkConfig: NetworkConfig = {
    rpcProviderUrl: 'https://eth-rpc-testnet.polkadot.io',
    blockExplorer: 'https://blockscout-testnet.polkadot.io',
    chain: polkadotHubTestnet,
    nativeTokenAddress: '0x0000000000000000000000000000000000000000' as Address, // Native PAS token
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
