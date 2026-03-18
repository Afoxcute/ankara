"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BLOCK_EXPLORER_URL = exports.NATIVE_TOKEN_ADDRESS = exports.walletClient = exports.publicClient = exports.account = exports.networkInfo = void 0;
const viem_1 = require("viem");
const accounts_1 = require("viem/accounts");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Etherlink testnet configuration
const etherlinkTestnet = {
    id: 128123,
    name: 'Etherlink Testnet',
    nativeCurrency: {
        name: 'HBAR',
        symbol: 'HBAR',
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: ['https://node.ghostnet.etherlink.com'],
        },
        public: {
            http: ['https://node.ghostnet.etherlink.com'],
        },
    },
    blockExplorers: {
        default: {
            name: 'Etherlink Testnet Explorer',
            url: 'https://testnet.explorer.etherlink.com',
        },
    },
};
// Network configuration
const networkConfig = {
    rpcProviderUrl: 'https://node.ghostnet.etherlink.com',
    blockExplorer: 'https://testnet.explorer.etherlink.com',
    chain: etherlinkTestnet,
    nativeTokenAddress: '0x0000000000000000000000000000000000000000', // Native HBAR token
};
// Helper functions
const validateEnvironmentVars = () => {
    if (!process.env.WALLET_PRIVATE_KEY) {
        throw new Error('WALLET_PRIVATE_KEY is required in .env file');
    }
};
// Initialize configuration
validateEnvironmentVars();
exports.networkInfo = {
    ...networkConfig,
    rpcProviderUrl: process.env.RPC_PROVIDER_URL || networkConfig.rpcProviderUrl,
};
exports.account = (0, accounts_1.privateKeyToAccount)(`0x${process.env.WALLET_PRIVATE_KEY}`);
const baseConfig = {
    chain: exports.networkInfo.chain,
    transport: (0, viem_1.http)(exports.networkInfo.rpcProviderUrl),
};
exports.publicClient = (0, viem_1.createPublicClient)(baseConfig);
exports.walletClient = (0, viem_1.createWalletClient)({
    ...baseConfig,
    account: exports.account,
});
// Export constants
exports.NATIVE_TOKEN_ADDRESS = exports.networkInfo.nativeTokenAddress;
exports.BLOCK_EXPLORER_URL = exports.networkInfo.blockExplorer;
//# sourceMappingURL=config.js.map