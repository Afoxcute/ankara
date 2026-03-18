"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../utils/utils");
const config_1 = require("../../utils/config");
const viem_1 = require("viem");
const viem_2 = require("viem");
const totalLicenseTokenLimitHook_1 = require("../../utils/abi/totalLicenseTokenLimitHook");
const main = async function () {
    // 1. Set up Licensing Config
    //
    // Docs: https://docs.story.foundation/concepts/licensing-module/license-config-hook#license-config
    const licensingConfig = {
        isSet: true,
        mintingFee: 0n,
        // address of TotalLicenseTokenLimitHook
        // from https://docs.story.foundation/developers/deployed-smart-contracts
        licensingHook: '0xaBAD364Bfa41230272b08f171E0Ca939bD600478',
        hookData: viem_2.zeroAddress,
        commercialRevShare: 0,
        disabled: false,
        expectMinimumGroupRewardShare: 0,
        expectGroupRewardPool: viem_2.zeroAddress,
    };
    // 2. Mint and register IP with the licensing config
    //
    // Docs: https://docs.story.foundation/sdk-reference/ipasset#mintandregisteripassetwithpilterms
    const response = await config_1.client.ipAsset.mintAndRegisterIpAssetWithPilTerms({
        spgNftContract: utils_1.SPGNFTContractAddress,
        licenseTermsData: [
            {
                terms: (0, utils_1.createCommercialRemixTerms)({ commercialRevShare: 0, defaultMintingFee: 0 }),
                // set the licensing config here
                licensingConfig,
            },
        ],
        ipMetadata: {
            ipMetadataURI: 'test-uri',
            ipMetadataHash: (0, viem_1.toHex)('test-metadata-hash', { size: 32 }),
            nftMetadataHash: (0, viem_1.toHex)('test-nft-metadata-hash', { size: 32 }),
            nftMetadataURI: 'test-nft-uri',
        },
        txOptions: { waitForTransaction: true },
    });
    console.log('Root IPA created:', {
        'Transaction Hash': response.txHash,
        'IPA ID': response.ipId,
        'License Term IDs': response.licenseTermsIds,
    });
    // 3. Set Total License Token Limit
    const { request } = await config_1.publicClient.simulateContract({
        // address of TotalLicenseTokenLimitHook
        // from https://docs.story.foundation/developers/deployed-smart-contracts
        address: '0xaBAD364Bfa41230272b08f171E0Ca939bD600478',
        abi: totalLicenseTokenLimitHook_1.totalLicenseTokenLimitHook,
        functionName: 'setTotalLicenseTokenLimit',
        args: [
            response.ipId, // licensorIpId
            '0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316', // licenseTemplate
            response.licenseTermsIds[0], // licenseTermsId
            1n, // limit (as BigInt)
        ],
        account: config_1.account, // Specify the account to use for permission checking
    });
    // Prepare transaction
    const hash = await config_1.walletClient.writeContract({ ...request, account: config_1.account });
    // Wait for transaction to be mined
    const receipt = await config_1.publicClient.waitForTransactionReceipt({
        hash,
    });
    console.log('Total license token limit set:', {
        Receipt: receipt,
    });
};
main();
//# sourceMappingURL=oneTimeUseLicense.js.map