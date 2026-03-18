"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_sdk_1 = require("@story-protocol/core-sdk");
const config_1 = require("../../utils/config");
// TODO: You can change this.
const IP_ID = '0x24281Ca84D0Ab9f9Ca39A44537871266FEA9009E';
const main = async function () {
    // 1. Claim Revenue
    //
    // Docs: https://docs.story.foundation/sdk-reference/royalty#claimallrevenue
    const response = await config_1.client.royalty.claimAllRevenue({
        ancestorIpId: IP_ID,
        claimer: IP_ID,
        childIpIds: [],
        royaltyPolicies: [],
        currencyTokens: [core_sdk_1.WIP_TOKEN_ADDRESS],
    });
    console.log('Claimed revenue:', response.claimedTokens);
};
main();
//# sourceMappingURL=claimRevenue.js.map