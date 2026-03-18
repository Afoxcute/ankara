"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const infringementController_1 = require("../controllers/infringementController");
const router = express_1.default.Router();
// Get infringement status by Yakoa ID
router.get('/status/:id', infringementController_1.handleInfringementStatus);
// Get infringement status by contract address and token ID
router.get('/status/:contractAddress/:tokenId', infringementController_1.handleInfringementStatusByContract);
exports.default = router;
//# sourceMappingURL=infringement.js.map