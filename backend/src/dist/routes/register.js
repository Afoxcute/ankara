"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/register.ts
const express_1 = __importDefault(require("express"));
const registerController_1 = __importDefault(require("../controllers/registerController"));
const asyncHandler_1 = require("../utils1/asyncHandler");
const router = express_1.default.Router();
router.post('/', (0, asyncHandler_1.asyncHandler)(registerController_1.default));
exports.default = router;
//# sourceMappingURL=register.js.map