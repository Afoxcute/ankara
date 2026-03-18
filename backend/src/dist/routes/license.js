"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/license.ts
const express_1 = __importDefault(require("express"));
const licenseController_1 = __importDefault(require("../controllers/licenseController"));
const asyncHandler_1 = require("../utils1/asyncHandler");
const router = express_1.default.Router();
router.post('/mint', (0, asyncHandler_1.asyncHandler)(licenseController_1.default));
exports.default = router;
//# sourceMappingURL=license.js.map