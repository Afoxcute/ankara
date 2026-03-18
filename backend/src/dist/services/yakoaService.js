"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitToYakoa = void 0;
exports.fetchInfringementStatus = fetchInfringementStatus;
const axios_1 = __importDefault(require("axios"));
const YAKOA_BASE_URL = 'https://docs-demo.ip-api-sandbox.yakoa.io/docs-demo/token'; // Replace with correct network if needed
const submitToYakoa = async (data) => {
    try {
        const response = await axios_1.default.post(YAKOA_BASE_URL, data, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        console.log('✅ Yakoa response:', response.data);
        return response.data;
    }
    catch (error) {
        console.error('❌ Error submitting to Yakoa:', error.response?.data || error.message);
        throw error;
    }
};
exports.submitToYakoa = submitToYakoa;
async function fetchInfringementStatus(id) {
    try {
        const response = await fetch(`/api/yakoa/status/${id}`);
        if (!response.ok) {
            throw new Error('Failed to fetch infringement status');
        }
        const data = await response.json();
        return data;
    }
    catch (error) {
        console.error('Error fetching Yakoa status:', error);
        throw error;
    }
}
//# sourceMappingURL=yakoaService.js.map