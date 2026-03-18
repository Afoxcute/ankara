"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mintLicenseOnEtherlink = exports.registerIpWithEtherlink = void 0;
const config_1 = require("../utils/config");
// SeekerIP contract ABI (simplified for IP registration)
const MODRED_IP_ABI = [
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "ipHash",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "metadata",
                "type": "string"
            },
            {
                "internalType": "bool",
                "name": "isEncrypted",
                "type": "bool"
            }
        ],
        "name": "registerIP",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "tokenId",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "royaltyPercentage",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "duration",
                "type": "uint256"
            },
            {
                "internalType": "bool",
                "name": "commercialUse",
                "type": "bool"
            },
            {
                "internalType": "string",
                "name": "terms",
                "type": "string"
            }
        ],
        "name": "mintLicense",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];
const registerIpWithEtherlink = async (ipHash, metadata, isEncrypted, SeekerIPContractAddress) => {
    try {
        console.log('ipHash:', ipHash);
        console.log('metadata:', metadata);
        console.log('isEncrypted:', isEncrypted);
        // Register IP on SeekerIP contract
        const { request } = await config_1.publicClient.simulateContract({
            address: SeekerIPContractAddress,
            abi: MODRED_IP_ABI,
            functionName: 'registerIP',
            args: [
                ipHash,
                metadata,
                isEncrypted
            ],
            account: config_1.account.address,
        });
        const hash = await config_1.walletClient.writeContract({
            ...request,
            account: config_1.account,
        });
        const receipt = await config_1.publicClient.waitForTransactionReceipt({ hash });
        // Extract IP Asset ID from transaction logs
        let ipAssetId;
        if (receipt.logs && receipt.logs.length > 0) {
            // Look for the Transfer event which contains the token ID
            for (const log of receipt.logs) {
                if (log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
                    // Transfer event signature
                    if (log.topics[3]) {
                        ipAssetId = parseInt(log.topics[3], 16);
                        break;
                    }
                }
            }
        }
        return {
            txHash: hash,
            ipAssetId: ipAssetId,
            blockNumber: receipt.blockNumber,
            explorerUrl: `${config_1.BLOCK_EXPLORER_URL}/tx/${hash}`,
        };
    }
    catch (error) {
        console.error('Error registering IP with Etherlink:', error);
        throw error;
    }
};
exports.registerIpWithEtherlink = registerIpWithEtherlink;
const mintLicenseOnEtherlink = async (tokenId, royaltyPercentage, duration, commercialUse, terms, SeekerIPContractAddress) => {
    try {
        const { request } = await config_1.publicClient.simulateContract({
            address: SeekerIPContractAddress,
            abi: MODRED_IP_ABI,
            functionName: 'mintLicense',
            args: [
                BigInt(tokenId),
                BigInt(royaltyPercentage),
                BigInt(duration),
                commercialUse,
                terms
            ],
            account: config_1.account.address,
        });
        const hash = await config_1.walletClient.writeContract({
            ...request,
            account: config_1.account,
        });
        const receipt = await config_1.publicClient.waitForTransactionReceipt({ hash });
        return {
            txHash: hash,
            blockNumber: receipt.blockNumber,
            explorerUrl: `${config_1.BLOCK_EXPLORER_URL}/tx/${hash}`,
        };
    }
    catch (error) {
        console.error('Error minting license on Etherlink:', error);
        throw error;
    }
};
exports.mintLicenseOnEtherlink = mintLicenseOnEtherlink;
//# sourceMappingURL=storyService.js.map