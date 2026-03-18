"use strict";
// story/backend/src/app.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const register_1 = __importDefault(require("./routes/register"));
const yakoaRoutes_1 = __importDefault(require("./routes/yakoaRoutes"));
const license_1 = __importDefault(require("./routes/license"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
// API Routes
app.use('/api/register', register_1.default);
app.use('/api/yakoa', yakoaRoutes_1.default);
app.use('/api/license', license_1.default);
// Default route (optional)
app.get('/', (_req, res) => {
    res.send('✅ Yakoa + Etherlink backend is running!');
});
// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Backend server running at http://localhost:${PORT}`);
});
//# sourceMappingURL=app.js.map