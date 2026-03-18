"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const licenseService_1 = require("../services/licenseService");
const bigIntSerializer_1 = require("../utils/bigIntSerializer");
const handleLicenseMinting = async (req, res) => {
    console.log("🔥 Entered handleLicenseMinting");
    try {
        const { tokenId, royaltyPercentage, duration, commercialUse, terms, SeekerIPContractAddress } = req.body;
        console.log("📦 Received license request:", req.body);
        // Validate required parameters
        if (!tokenId || !royaltyPercentage || !duration || commercialUse === undefined || !terms || !SeekerIPContractAddress) {
            return res.status(400).json({
                error: 'Missing required parameters: tokenId, royaltyPercentage, duration, commercialUse, terms, SeekerIPContractAddress'
            });
        }
        const licenseRequest = {
            tokenId,
            royaltyPercentage,
            duration,
            commercialUse,
            terms,
            SeekerIPContractAddress
        };
        const result = await (0, licenseService_1.mintLicense)(licenseRequest);
        if (result.success) {
            const responseData = {
                message: result.message,
                data: {
                    txHash: result.txHash,
                    blockNumber: result.blockNumber,
                    explorerUrl: result.explorerUrl
                }
            };
            return res.status(200).json((0, bigIntSerializer_1.convertBigIntsToStrings)(responseData));
        }
        else {
            return res.status(500).json({
                error: result.message,
                details: result.error
            });
        }
    }
    catch (err) {
        console.error('❌ License minting error:', err);
        return res.status(500).json({
            error: 'License minting failed',
            details: err instanceof Error ? err.message : err,
        });
    }
};
exports.default = handleLicenseMinting;
//# sourceMappingURL=licenseController.js.map