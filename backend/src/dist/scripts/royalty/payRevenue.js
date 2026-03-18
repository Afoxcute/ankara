"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const viem_1 = require("viem");
const utils_1 = require("../../utils/utils");
const config_1 = require("../../utils/config");
const core_sdk_1 = require("@story-protocol/core-sdk");
// TODO: This is Ippy on Aeneid. The license terms specify 1 $WIP mint fee
// and a 5% commercial rev share. You can change these.
const PARENT_IP_ID = '0x641E638e8FCA4d4844F509630B34c9D524d40BE5';
const LICENSE_TERMS_ID = '96';
const main = async function () {
    // 1. Mint and Register IP asset and make it a derivative of the parent IP Asset
    //
    // You will be paying for the License Token using $WIP:
    // https://aeneid.storyscan.xyz/address/0x1514000000000000000000000000000000000000
    // If you don't have enough $WIP, the function will auto wrap an equivalent amount of $IP into
    // $WIP for you.
    //
    // Docs: https://docs.story.foundation/sdk-reference/ip-asset#mintandregisteripandmakederivative
    const childIp = await config_1.client.ipAsset.mintAndRegisterIpAndMakeDerivative({
        spgNftContract: utils_1.SPGNFTContractAddress,
        derivData: {
            parentIpIds: [PARENT_IP_ID],
            licenseTermsIds: [LICENSE_TERMS_ID],
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
    // 2. Pay Royalty
    //
    // You will be paying for this royalty using $WIP:
    // https://aeneid.storyscan.xyz/address/0x1514000000000000000000000000000000000000
    // If you don't have enough $WIP, the function will auto wrap an equivalent amount of $IP into
    // $WIP for you.
    //
    // Docs: https://docs.story.foundation/sdk-reference/royalty#payroyaltyonbehalf
    const payRoyalty = await config_1.client.royalty.payRoyaltyOnBehalf({
        receiverIpId: childIp.ipId,
        payerIpId: viem_1.zeroAddress,
        token: core_sdk_1.WIP_TOKEN_ADDRESS,
        amount: (0, viem_1.parseEther)('2'), // 2 $WIP
        txOptions: { waitForTransaction: true },
    });
    console.log('Paid royalty:', {
        'Transaction Hash': payRoyalty.txHash,
    });
    // 3. Child Claim Revenue
    //
    // Docs: https://docs.story.foundation/sdk-reference/royalty#claimallrevenue
    const childClaimRevenue = await config_1.client.royalty.claimAllRevenue({
        ancestorIpId: childIp.ipId,
        claimer: childIp.ipId,
        childIpIds: [],
        royaltyPolicies: [],
        currencyTokens: [core_sdk_1.WIP_TOKEN_ADDRESS],
    });
    console.log('Child claimed revenue:', childClaimRevenue.claimedTokens);
    // 4. Parent Claim Revenue
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
//# sourceMappingURL=payRevenue.js.map