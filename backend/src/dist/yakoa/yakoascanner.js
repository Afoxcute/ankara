"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerToYakoa = registerToYakoa;
// yakoaScanner.ts
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
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
// Get existing token data
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
async function registerToYakoa() {
    const tokenId = "0x8f0a1ac6ca4f8cb0417112069c0f4dc93b9f0217:1117";
    const transactionHash = "0xa6aa90bc9033aebf5d3efa8be88b85377ebf8d55aa053439f0217e1ccdedd3b2"; // 32 char fake hash
    const creatorId = "0xd4a6166d966f4821ce8658807466dd0b0bb92ae9";
    const timestamp = new Date().toISOString(); // ISO string format
    try {
        // Check if IP asset already exists
        const alreadyExists = await checkYakoaTokenExists(tokenId);
        if (alreadyExists) {
            console.log("⚠️ IP asset already registered in Yakoa, returning existing data");
            const existingData = await getYakoaToken(tokenId);
            return {
                ...existingData,
                alreadyRegistered: true,
                message: "IP asset already registered in Yakoa"
            };
        }
        const response = await axios_1.default.post(REGISTER_TOKEN_URL, {
            id: tokenId,
            registration_tx: {
                hash: transactionHash,
                block_number: 5177789,
                timestamp: timestamp,
            },
            creator_id: creatorId,
            metadata: {
                title: "Skeleton's gift",
                description: "This IP Asset represents ownership of the IP Asset.",
            },
            media: [
                {
                    media_id: "Skeleton's gift",
                    url: "https://ipfs.io/ipfs/bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku"
                }
            ]
        }, {
            headers: {
                "X-API-KEY": YAKOA_API_KEY,
                "Content-Type": "application/json"
            }
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
                const existingData = await getYakoaToken(tokenId);
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
//# sourceMappingURL=yakoascanner.js.map