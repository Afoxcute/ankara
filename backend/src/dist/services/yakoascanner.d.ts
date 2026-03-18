export declare function checkYakoaTokenExists(id: string): Promise<boolean>;
export declare function registerToYakoa({ Id, transactionHash, blockNumber, creatorId, metadata, media, brandId, brandName, emailAddress, licenseParents, authorizations }: {
    Id: string;
    transactionHash: `0x${string}`;
    blockNumber: bigint;
    creatorId: string;
    metadata: {
        [key: string]: string;
    };
    media: {
        media_id: string;
        url: string;
    }[];
    brandId?: string | null;
    brandName?: string | null;
    emailAddress?: string | null;
    licenseParents?: Array<{
        parent_id: string;
        license_id: string;
    }>;
    authorizations?: Array<{
        brand_id?: string | null;
        brand_name?: string | null;
        data: {
            type: 'email';
            email_address: string;
        } | null;
    }>;
}): Promise<any>;
export declare function getYakoaToken(id: string): Promise<any>;
export declare function getYakoaInfringementStatus(id: string): Promise<{
    id: any;
    status: any;
    result: any;
    inNetworkInfringements: any;
    externalInfringements: any;
    credits: any;
    lastChecked: any;
    totalInfringements: any;
}>;
//# sourceMappingURL=yakoascanner.d.ts.map