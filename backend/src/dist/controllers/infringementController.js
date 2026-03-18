"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleInfringementStatusByContract = exports.handleInfringementStatus = void 0;
const yakoascanner_1 = require("../services/yakoascanner");
const bigIntSerializer_1 = require("../utils/bigIntSerializer");
const handleInfringementStatus = async (req, res) => {
    console.log("🔥 Entered handleInfringementStatus");
    try {
        const { id } = req.params;
        console.log("📦 Received infringement status request for ID:", id);
        // Validate required parameters
        if (!id) {
            return res.status(400).json({
                error: 'Missing required parameter: id'
            });
        }
        // Get infringement status from Yakoa
        const infringementStatus = await (0, yakoascanner_1.getYakoaInfringementStatus)(id);
        const responseData = {
            message: 'Infringement status retrieved successfully',
            data: infringementStatus
        };
        return res.status(200).json((0, bigIntSerializer_1.convertBigIntsToStrings)(responseData));
    }
    catch (err) {
        console.error('❌ Infringement status error:', err);
        return res.status(500).json({
            error: 'Failed to retrieve infringement status',
            details: err instanceof Error ? err.message : err,
        });
    }
};
exports.handleInfringementStatus = handleInfringementStatus;
const handleInfringementStatusByContract = async (req, res) => {
    console.log("🔥 Entered handleInfringementStatusByContract");
    try {
        const { contractAddress, tokenId } = req.params;
        console.log("📦 Received infringement status request for contract:", contractAddress, "token:", tokenId);
        // Validate required parameters
        if (!contractAddress || !tokenId) {
            return res.status(400).json({
                error: 'Missing required parameters: contractAddress, tokenId'
            });
        }
        // Format ID as contract address with token ID
        const id = `${contractAddress.toLowerCase()}:${tokenId}`;
        // Get infringement status from Yakoa
        const infringementStatus = await (0, yakoascanner_1.getYakoaInfringementStatus)(id);
        const responseData = {
            message: 'Infringement status retrieved successfully',
            data: infringementStatus
        };
        return res.status(200).json((0, bigIntSerializer_1.convertBigIntsToStrings)(responseData));
    }
    catch (err) {
        console.error('❌ Infringement status error:', err);
        return res.status(500).json({
            error: 'Failed to retrieve infringement status',
            details: err instanceof Error ? err.message : err,
        });
    }
};
exports.handleInfringementStatusByContract = handleInfringementStatusByContract;
//# sourceMappingURL=infringementController.js.map