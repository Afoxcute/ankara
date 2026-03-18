"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultLicensingConfig = exports.RoyaltyPolicyLRP = exports.RoyaltyPolicyLAP = exports.NonCommercialSocialRemixingTerms = exports.NonCommercialSocialRemixingTermsId = exports.NFTContractAddress = exports.WIP_TOKEN_ADDRESS = void 0;
exports.createCommercialRemixTerms = createCommercialRemixTerms;
exports.convertRoyaltyPercentToTokens = convertRoyaltyPercentToTokens;
exports.getEtherlinkExplorerUrl = getEtherlinkExplorerUrl;
exports.getEtherlinkAddressExplorerUrl = getEtherlinkAddressExplorerUrl;
const viem_1 = require("viem");
const dotenv_1 = __importDefault(require("dotenv"));
const config_1 = require("./config");
dotenv_1.default.config();
// Use native HBAR token as WIP_TOKEN_ADDRESS
exports.WIP_TOKEN_ADDRESS = config_1.NATIVE_TOKEN_ADDRESS;
// Export contract addresses with appropriate defaults based on network
exports.NFTContractAddress = process.env.NFT_CONTRACT_ADDRESS || viem_1.zeroAddress;
// Non-commercial social remixing terms
exports.NonCommercialSocialRemixingTermsId = '1';
exports.NonCommercialSocialRemixingTerms = {
    transferable: true,
    royaltyPolicy: viem_1.zeroAddress,
    defaultMintingFee: 0n,
    expiration: 0n,
    commercialUse: false,
    commercialAttribution: false,
    commercializerChecker: viem_1.zeroAddress,
    commercializerCheckerData: '0x',
    commercialRevShare: 0,
    commercialRevCeiling: 0n,
    derivativesAllowed: true,
    derivativesAttribution: true,
    derivativesApproval: false,
    derivativesReciprocal: true,
    derivativeRevCeiling: 0n,
    currency: exports.WIP_TOKEN_ADDRESS,
    uri: 'https://github.com/piplabs/pil-document/blob/998c13e6ee1d04eb817aefd1fe16dfe8be3cd7a2/off-chain-terms/NCSR.json',
};
// Royalty policy addresses for Etherlink
exports.RoyaltyPolicyLAP = '0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E';
exports.RoyaltyPolicyLRP = '0x9156e603C949481883B1d3355c6f1132D191fC41';
// Commercial remix terms for Etherlink
function createCommercialRemixTerms(terms) {
    return {
        transferable: true,
        royaltyPolicy: exports.RoyaltyPolicyLAP,
        defaultMintingFee: (0, viem_1.parseEther)(terms.defaultMintingFee.toString()),
        expiration: BigInt(0),
        commercialUse: true,
        commercialAttribution: true,
        commercializerChecker: viem_1.zeroAddress,
        commercializerCheckerData: '0x',
        commercialRevShare: terms.commercialRevShare,
        commercialRevCeiling: BigInt(0),
        derivativesAllowed: true,
        derivativesAttribution: true,
        derivativesApproval: false,
        derivativesReciprocal: true,
        derivativeRevCeiling: BigInt(0),
        currency: exports.WIP_TOKEN_ADDRESS,
        uri: 'https://github.com/piplabs/pil-document/blob/ad67bb632a310d2557f8abcccd428e4c9c798db1/off-chain-terms/CommercialRemix.json',
    };
}
exports.defaultLicensingConfig = {
    mintingFee: 0n,
    isSet: false,
    disabled: false,
    commercialRevShare: 0,
    expectGroupRewardPool: viem_1.zeroAddress,
    expectMinimumGroupRewardShare: 0,
    licensingHook: viem_1.zeroAddress,
    hookData: '0x',
};
function convertRoyaltyPercentToTokens(royaltyPercent) {
    // there are 100,000,000 tokens total (100, but 6 decimals)
    return royaltyPercent * 1000000;
}
// Etherlink-specific utility functions
function getEtherlinkExplorerUrl(txHash) {
    return `${config_1.networkInfo.blockExplorer}/tx/${txHash}`;
}
function getEtherlinkAddressExplorerUrl(address) {
    return `${config_1.networkInfo.blockExplorer}/address/${address}`;
}
//# sourceMappingURL=utils.js.map