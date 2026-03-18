"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const viem_1 = require("viem");
const config_1 = require("../config");
const main = async function () {
    // Create a new SPG NFT collection
    //
    // NOTE: Use this code to create a new SPG NFT collection. You can then use the
    // `newCollection.spgNftContract` address as the `spgNftContract` argument in
    // functions like `mintAndRegisterIpAssetWithPilTerms` in the
    // `simpleMintAndRegisterSpg.ts` file.
    //
    // You will mostly only have to do this once. Once you get your nft contract address,
    // you can use it in SPG functions.
    //
    const newCollection = await config_1.client.nftClient.createNFTCollection({
        name: 'Test NFTs',
        symbol: 'TEST',
        isPublicMinting: true,
        mintOpen: true,
        mintFeeRecipient: viem_1.zeroAddress,
        contractURI: '',
        txOptions: { waitForTransaction: true },
    });
    console.log('New collection created:', {
        'SPG NFT Contract Address': newCollection.spgNftContract,
        'Transaction Hash': newCollection.txHash,
    });
};
main();
//# sourceMappingURL=createSpgNftCollection.js.map