"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../utils/utils");
const config_1 = require("../../utils/config");
const uploadToIpfs_1 = require("../../utils/functions/uploadToIpfs");
const crypto_1 = require("crypto");
const viem_1 = require("viem");
const licenseAttachmentWorkflowsAbi_1 = require("../../utils/abi/licenseAttachmentWorkflowsAbi");
const main = async function () {
    const ipMetadata = config_1.client.ipAsset.generateIpMetadata({
        title: 'Midnight Marriage',
        description: 'This is a house-style song generated on suno.',
        createdAt: '1740005219',
        creators: [
            {
                name: 'Jacob Tucker',
                address: '0xA2f9Cf1E40D7b03aB81e34BC50f0A8c67B4e9112',
                contributionPercent: 100,
            },
        ],
        image: 'https://cdn2.suno.ai/image_large_8bcba6bc-3f60-4921-b148-f32a59086a4c.jpeg',
        imageHash: '0xc404730cdcdf7e5e54e8f16bc6687f97c6578a296f4a21b452d8a6ecabd61bcc',
        mediaUrl: 'https://cdn1.suno.ai/dcd3076f-3aa5-400b-ba5d-87d30f27c311.mp3',
        mediaHash: '0xb52a44f53b2485ba772bd4857a443e1fb942cf5dda73c870e2d2238ecd607aee',
        mediaType: 'audio/mpeg',
    });
    const nftMetadata = {
        name: 'Midnight Marriage',
        description: 'This is a house-style song generated on suno. This NFT represents ownership of the IP Asset.',
        image: 'https://cdn2.suno.ai/image_large_8bcba6bc-3f60-4921-b148-f32a59086a4c.jpeg',
        animation_url: 'https://cdn1.suno.ai/dcd3076f-3aa5-400b-ba5d-87d30f27c311.mp3',
        attributes: [
            {
                key: 'Suno Artist',
                value: 'amazedneurofunk956',
            },
            {
                key: 'Artist ID',
                value: '4123743b-8ba6-4028-a965-75b79a3ad424',
            },
            {
                key: 'Source',
                value: 'Suno.com',
            },
        ],
    };
    const ipIpfsHash = await (0, uploadToIpfs_1.uploadJSONToIPFS)(ipMetadata);
    const ipHash = (0, crypto_1.createHash)('sha256').update(JSON.stringify(ipMetadata)).digest('hex');
    const nftIpfsHash = await (0, uploadToIpfs_1.uploadJSONToIPFS)(nftMetadata);
    const nftHash = (0, crypto_1.createHash)('sha256').update(JSON.stringify(nftMetadata)).digest('hex');
    const transactionRequest = {
        to: '0xcC2E862bCee5B6036Db0de6E06Ae87e524a79fd8', // example nft contract
        data: (0, viem_1.encodeFunctionData)({
            abi: licenseAttachmentWorkflowsAbi_1.licenseAttachmentWorkflowsAbi, // abi from another file
            functionName: 'mintAndRegisterIpAndAttachPILTerms',
            args: [
                utils_1.SPGNFTContractAddress,
                config_1.account.address,
                {
                    ipMetadataURI: `https://ipfs.io/ipfs/${ipIpfsHash}`,
                    ipMetadataHash: `0x${ipHash}`,
                    nftMetadataURI: `https://ipfs.io/ipfs/${nftIpfsHash}`,
                    nftMetadataHash: `0x${nftHash}`,
                },
                [
                    {
                        terms: (0, utils_1.createCommercialRemixTerms)({ defaultMintingFee: 0, commercialRevShare: 0 }),
                        licensingConfig: utils_1.defaultLicensingConfig,
                    },
                ],
                true,
            ],
        }),
    };
    try {
        const txHash = await config_1.walletClient.sendTransaction({
            ...transactionRequest,
            account: config_1.account,
            chain: config_1.networkInfo.chain,
        });
        console.log(`Transaction sent: ${config_1.networkInfo.blockExplorer}/tx/${txHash}`);
    }
    catch (error) {
        console.error(error);
    }
};
main();
//# sourceMappingURL=sendRawTransaction.js.map