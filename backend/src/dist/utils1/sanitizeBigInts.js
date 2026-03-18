"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeBigInts = sanitizeBigInts;
function sanitizeBigInts(obj) {
    if (typeof obj === 'bigint') {
        return obj.toString();
    }
    if (Array.isArray(obj)) {
        return obj.map(sanitizeBigInts);
    }
    if (obj !== null && typeof obj === 'object') {
        const sanitized = {};
        for (const key in obj) {
            sanitized[key] = sanitizeBigInts(obj[key]);
        }
        return sanitized;
    }
    return obj;
}
//# sourceMappingURL=sanitizeBigInts.js.map