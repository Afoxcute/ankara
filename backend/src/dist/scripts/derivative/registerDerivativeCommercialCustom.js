"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const viem_1 = require("viem");
const mintNFT_1 = require("../../utils/functions/mintNFT");
const utils_1 = require("../../utils/utils");
const config_1 = require("../../utils/config");
const core_sdk_1 = require("@story-protocol/core-sdk");
// TODO: This is Ippy on Aeneid. The license terms specify 1 $WIP mint fee
// and a 5% commercial rev share. You can change these.
const PARENT_IP_ID = '0x641E638e8FCA4d4844F509630B34c9D524d40BE5';
const PARENT_LICENSE_TERMS_ID = '96';
const main = async function () {
    // 1. Register another (child) IP Asset
    //
    // You will be paying for the License Token using $WIP:
    // https://aeneid.storyscan.xyz/address/0x1514000000000000000000000000000000000000
    // If you don't have enough $WIP, the function will auto wrap an equivalent amount of $IP into
    // $WIP for you.
    //
    // Docs: https://docs.story.foundation/sdk-reference/ip-asset#registerderivativeip
    const childTokenId = await (0, mintNFT_1.mintNFT)(config_1.account.address, 'test-uri');
    const childIp = await config_1.client.ipAsset.registerDerivativeIp({
        nftContract: utils_1.NFTContractAddress,
        tokenId: childTokenId,
        derivData: {
            parentIpIds: [PARENT_IP_ID],
            licenseTermsIds: [PARENT_LICENSE_TERMS_ID],
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
    console.log('Derivative IPA created:', {
        'Transaction Hash': childIp.txHash,
        'IPA ID': childIp.ipId,
    });
    // 2. Parent Claim Revenue
    //
    // Docs: https://docs.story.foundation/sdk-reference/royalty#claimallrevenue
    const parentClaimRevenue = await config_1.client.royalty.claimAllRevenue({
        ancestorIpId: PARENT_IP_ID,
        claimer: PARENT_IP_ID,
        childIpIds: [childIp.ipId],
        royaltyPolicies: [utils_1.RoyaltyPolicyLRP],
        currencyTokens: [core_sdk_1.WIP_TOKEN_ADDRESS],
    });
    console.log('Parent claimed revenue receipt:', parentClaimRevenue);
};
main();
//# sourceMappingURL=registerDerivativeCommercialCustom.js.map