"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mintNFT_1 = require("../../utils/functions/mintNFT");
const utils_1 = require("../../utils/utils");
const config_1 = require("../../utils/config");
const uploadToIpfs_1 = require("../../utils/functions/uploadToIpfs");
const crypto_1 = require("crypto");
const main = async function () {
    // 1. Set up your IP Metadata
    //
    // Docs: https://docs.story.foundation/concepts/ip-asset/ipa-metadata-standard
    const ipMetadata = config_1.client.ipAsset.generateIpMetadata({
        title: "Skeleton's gift",
        description: 'This IP Asset represents ownership of the IP Asset.',
        creators: [
            {
                name: 'Grim Reaper',
                address: '0xd4a6166d966F4821Ce8658807466Dd0b0bb92AE9',
                contributionPercent: 100,
            },
        ],
        image: 'demo',
        mediaUrl: 'demo url',
        mediaType: 'png'
    });
    // 2. Set up your NFT Metadata
    //
    // Docs: https://docs.opensea.io/docs/metadata-standards#metadata-structure
    const nftMetadata = {
        name: "Skeleton's gift",
        description: ' This NFT represents ownership of the IP Asset.',
        image: 'https://videos.openai.com/vg-assets/assets%2Ftask_01jwz7tf33eh8r6ngz3h3c6gbt%2F1749100147_img_0.webp?st=2025-06-05T03%3A25%3A33Z&se=2025-06-11T04%3A25%3A33Z&sks=b&skt=2025-06-05T03%3A25%3A33Z&ske=2025-06-11T04%3A25%3A33Z&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skoid=8ebb0df1-a278-4e2e-9c20-f2d373479b3a&skv=2019-02-02&sv=2018-11-09&sr=b&sp=r&spr=https%2Chttp&sig=5twjbryFKaSPvqyuA%2B4mCfNpkZR%2FGcr8dNquqpP38zo%3D&az=oaivgprodscus',
        attributes: [
            {
                key: 'sora Artist',
                value: 'Grim Reaper',
            },
            ,
            {
                key: 'Source',
                value: 'sora.chatgpt.com',
            },
        ],
    };
    // 3. Upload your IP and NFT Metadata to IPFS
    const ipIpfsHash = await (0, uploadToIpfs_1.uploadJSONToIPFS)(ipMetadata);
    const ipHash = (0, crypto_1.createHash)('sha256').update(JSON.stringify(ipMetadata)).digest('hex');
    const nftIpfsHash = await (0, uploadToIpfs_1.uploadJSONToIPFS)(nftMetadata);
    const nftHash = (0, crypto_1.createHash)('sha256').update(JSON.stringify(nftMetadata)).digest('hex');
    // 4. Mint an NFT
    const tokenId = await (0, mintNFT_1.mintNFT)(config_1.account.address, `https://ipfs.io/ipfs/${nftIpfsHash}`);
    console.log(`NFT minted with tokenId ${tokenId}`);
    // 5. Register an IP Asset
    //
    // Docs: https://docs.story.foundation/sdk-reference/ip-asset#register
    const response = await config_1.client.ipAsset.registerIpAndAttachPilTerms({
        nftContract: utils_1.NFTContractAddress,
        tokenId: tokenId,
        licenseTermsData: [
            {
                terms: (0, utils_1.createCommercialRemixTerms)({ defaultMintingFee: 1, commercialRevShare: 5 }),
            },
        ],
        ipMetadata: {
            ipMetadataURI: `https://ipfs.io/ipfs/${ipIpfsHash}`,
            ipMetadataHash: `0x${ipHash}`,
            nftMetadataURI: `https://ipfs.io/ipfs/${nftIpfsHash}`,
            nftMetadataHash: `0x${nftHash}`,
        },
        txOptions: { waitForTransaction: true },
    });
    console.log('Root IPA created:', {
        'Transaction Hash': response.txHash,
        'IPA ID': response.ipId,
    });
    console.log(`View on the explorer: ${config_1.networkInfo.protocolExplorer}/ipa/${response.ipId}`);
};
main();
//# sourceMappingURL=registerCustom.js.map