"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/yakoaRoutes.ts
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const router = express_1.default.Router();
const YAKOA_API_KEY = process.env.YAKOA_API_KEY;
const BASE_URL = 'https://docs-demo.ip-api-sandbox.yakoa.io/docs-demo/token';
// GET /api/yakoa/status/:id
router.get('/status/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const yakoaApiUrl = `https://docs-demo.ip-api-sandbox.yakoa.io/docs-demo/token/${encodeURIComponent(id)}`;
        console.log("Fetching Yakoa status from:", yakoaApiUrl);
        const response = await axios_1.default.get(yakoaApiUrl, {
            headers: {
                'X-API-KEY': process.env.YAKOA_API_KEY || 'your-api-key',
            },
        });
        console.log("Yakoa response:", response.data);
        res.json(response.data);
    }
    catch (error) {
        console.error('❌ Error fetching Yakoa status:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch infringement status' });
    }
});
exports.default = router;
//# sourceMappingURL=yakoaRoutes.js.map