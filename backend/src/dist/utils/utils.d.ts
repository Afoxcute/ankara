import { Address } from 'viem';
export declare const WIP_TOKEN_ADDRESS: Address;
export declare const NFTContractAddress: Address;
export interface LicenseTerms {
    transferable: boolean;
    royaltyPolicy: Address;
    defaultMintingFee: bigint;
    expiration: bigint;
    commercialUse: boolean;
    commercialAttribution: boolean;
    commercializerChecker: Address;
    commercializerCheckerData: string;
    commercialRevShare: number;
    commercialRevCeiling: bigint;
    derivativesAllowed: boolean;
    derivativesAttribution: boolean;
    derivativesApproval: boolean;
    derivativesReciprocal: boolean;
    derivativeRevCeiling: bigint;
    currency: Address;
    uri: string;
}
export declare const NonCommercialSocialRemixingTermsId = "1";
export declare const NonCommercialSocialRemixingTerms: LicenseTerms;
export declare const RoyaltyPolicyLAP: Address;
export declare const RoyaltyPolicyLRP: Address;
export declare function createCommercialRemixTerms(terms: {
    commercialRevShare: number;
    defaultMintingFee: number;
}): LicenseTerms;
export interface LicensingConfig {
    mintingFee: bigint;
    isSet: boolean;
    disabled: boolean;
    commercialRevShare: number;
    expectGroupRewardPool: Address;
    expectMinimumGroupRewardShare: number;
    licensingHook: Address;
    hookData: string;
}
export declare const defaultLicensingConfig: LicensingConfig;
export declare function convertRoyaltyPercentToTokens(royaltyPercent: number): number;
export declare function getEtherlinkExplorerUrl(txHash: string): string;
export declare function getEtherlinkAddressExplorerUrl(address: string): string;
//# sourceMappingURL=utils.d.ts.map