"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const viem_1 = require("viem");
const utils_1 = require("../../utils/utils");
const config_1 = require("../../utils/config");
// TODO: You can change this
const PARENT_IP_ID = '0x641E638e8FCA4d4844F509630B34c9D524d40BE5';
const main = async function () {
    // 1. Mint and Register IP asset and make it a derivative of the parent IP Asset
    //
    // Docs: https://docs.story.foundation/sdk-reference/ip-asset#mintandregisteripandmakederivative
    const childIp = await config_1.client.ipAsset.mintAndRegisterIpAndMakeDerivative({
        spgNftContract: utils_1.SPGNFTContractAddress,
        derivData: {
            parentIpIds: [PARENT_IP_ID],
            licenseTermsIds: [utils_1.NonCommercialSocialRemixingTermsId],
        },
        // NOTE: The below metadata is not configured properly. It is just to make things simple.
        // See `simpleMintAndRegister.ts` for a proper example.
        ipMetadata: {
            ipMetadataURI: 'test-uri',
            ipMetadataHash: (0, viem_1.toHex)('test-metadata-hash', { size: 32 }),
            nftMetadataHash: (0, viem_1.toHex)('test-nft-metadata-hash', { size: 32 }),
            nftMetadataURI: 'test-nft-uri',
        },
        txOptions: { waitForTransaction: true },
    });
    console.log('Derivative IPA created and linked:', {
        'Transaction Hash': childIp.txHash,
        'IPA ID': childIp.ipId,
    });
};
main();
//# sourceMappingURL=registerDerivativeNonCommercial.js.map