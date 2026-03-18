import { Address } from 'viem';
export interface LicenseRequest {
    tokenId: number;
    royaltyPercentage: number;
    duration: number;
    commercialUse: boolean;
    terms: string;
    SeekerIPContractAddress: Address;
}
export declare const mintLicense: (licenseRequest: LicenseRequest) => Promise<any>;
export declare const getLicenseExplorerUrl: (txHash: string) => string;
//# sourceMappingURL=licenseService.d.ts.map