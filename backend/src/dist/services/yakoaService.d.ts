type RegistrationTx = {
    hash: string;
    block_number: number | bigint;
};
type MediaItem = {
    media_id: string;
    url: string;
};
type YakoaPayload = {
    id: string;
    registration_tx: RegistrationTx;
    creator_id: string;
    metadata: Record<string, string>;
    media: MediaItem[];
};
export declare const submitToYakoa: (data: YakoaPayload) => Promise<any>;
export declare function fetchInfringementStatus(id: string): Promise<unknown>;
export {};
//# sourceMappingURL=yakoaService.d.ts.map