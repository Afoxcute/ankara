"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkYakoaTokenExists = checkYakoaTokenExists;
exports.registerToYakoa = registerToYakoa;
exports.getYakoaToken = getYakoaToken;
exports.getYakoaInfringementStatus = getYakoaInfringementStatus;
// yakoaScanner.ts
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const sanitizeBigInts_1 = require("../utils1/sanitizeBigInts");
dotenv_1.default.config();
const YAKOA_API_KEY = process.env.YAKOA_API_KEY;
const SUBDOMAIN = process.env.YAKOA_SUBDOMAIN;
const NETWORK = process.env.YAKOA_NETWORK;
const REGISTER_TOKEN_URL = `https://${SUBDOMAIN}.ip-api-sandbox.yakoa.io/${NETWORK}/token`;
// Check if IP asset already exists in Yakoa
async function checkYakoaTokenExists(id) {
    try {
        const response = await axios_1.default.get(`${REGISTER_TOKEN_URL}/${id}`, {
            headers: {
                "X-API-KEY": YAKOA_API_KEY,
            },
        });
        console.log("✅ IP asset already exists in Yakoa:", response.data);
        return true;
    }
    catch (err) {
        if (err.response?.status === 404) {
            console.log("✅ IP asset does not exist in Yakoa, can proceed with registration");
            return false;
        }
        console.error("❌ Error checking Yakoa token existence:", err.response?.data || err.message);
        throw err;
    }
}
async function registerToYakoa({ Id, transactionHash, blockNumber, creatorId, metadata, media, brandId = null, brandName = null, emailAddress = null, licenseParents = [], authorizations = [] }) {
    const timestamp = new Date().toISOString();
    try {
        // Check if IP asset already exists
        const alreadyExists = await checkYakoaTokenExists(Id);
        if (alreadyExists) {
            console.log("⚠️ IP asset already registered in Yakoa, returning existing data");
            const existingData = await getYakoaToken(Id);
            return {
                ...existingData,
                alreadyRegistered: true,
                message: "IP asset already registered in Yakoa"
            };
        }
        const payload = {
            id: Id, // Keep original case for validation
            registration_tx: {
                hash: transactionHash.toLowerCase(),
                block_number: blockNumber,
                timestamp,
            },
            creator_id: creatorId.toLowerCase(), // Ensure creator_id is lowercase
            metadata,
            media,
            license_parents: licenseParents,
            token_authorizations: authorizations,
            creator_authorizations: authorizations,
        };
        console.log("🧪 Raw Payload Before Sanitization:", payload);
        let sanitizedPayload;
        try {
            sanitizedPayload = (0, sanitizeBigInts_1.sanitizeBigInts)(payload);
        }
        catch (err) {
            console.error("🔥 Error in sanitizeBigInts:", err);
            throw err;
        }
        console.log("💡 Yakoa Payload:", JSON.stringify(sanitizedPayload, null, 2));
        const response = await axios_1.default.post(REGISTER_TOKEN_URL, sanitizedPayload, {
            headers: {
                "X-API-KEY": YAKOA_API_KEY,
                "Content-Type": "application/json",
            },
        });
        console.log("✅ Yakoa Registration Response:", response.data);
        return {
            ...response.data,
            alreadyRegistered: false,
            message: "IP asset successfully registered in Yakoa"
        };
    }
    catch (err) {
        // Handle 409 Conflict specifically
        if (err.response?.status === 409) {
            console.log("⚠️ IP asset already registered (409 Conflict), fetching existing data");
            try {
                const existingData = await getYakoaToken(Id);
                return {
                    ...existingData,
                    alreadyRegistered: true,
                    message: "IP asset already registered in Yakoa (handled conflict)"
                };
            }
            catch (fetchErr) {
                console.error("❌ Error fetching existing data after conflict:", fetchErr);
                throw err; // Re-throw original error if we can't fetch existing data
            }
        }
        console.error("❌ Error registering to Yakoa:", err.response?.data || err.message);
        throw err;
    }
}
async function getYakoaToken(id) {
    try {
        const response = await axios_1.default.get(`${REGISTER_TOKEN_URL}/${id}`, {
            headers: {
                "X-API-KEY": YAKOA_API_KEY,
            },
        });
        console.log("✅ Yakoa Token Data:", response.data);
        return response.data;
    }
    catch (err) {
        console.error("❌ Error fetching Yakoa token:", err.response?.data || err.message);
        throw err;
    }
}
async function getYakoaInfringementStatus(id) {
    try {
        const response = await axios_1.default.get(`${REGISTER_TOKEN_URL}/${id}`, {
            headers: {
                "X-API-KEY": YAKOA_API_KEY,
            },
        });
        const tokenData = response.data;
        const infringementStatus = {
            id: tokenData.id,
            status: tokenData.infringements?.status || 'unknown',
            result: tokenData.infringements?.result || 'unknown',
            inNetworkInfringements: tokenData.infringements?.in_network_infringements || [],
            externalInfringements: tokenData.infringements?.external_infringements || [],
            credits: tokenData.infringements?.credits || {},
            lastChecked: tokenData.infringements?.last_checked || null,
            totalInfringements: (tokenData.infringements?.in_network_infringements?.length || 0) +
                (tokenData.infringements?.external_infringements?.length || 0)
        };
        console.log("✅ Yakoa Infringement Status:", infringementStatus);
        return infringementStatus;
    }
    catch (err) {
        console.error("❌ Error fetching Yakoa infringement status:", err.response?.data || err.message);
        throw err;
    }
}
//# sourceMappingURL=yakoascanner.js.map