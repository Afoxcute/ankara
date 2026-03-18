"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bigIntReplacer = bigIntReplacer;
exports.serializeWithBigInt = serializeWithBigInt;
exports.convertBigIntsToStrings = convertBigIntsToStrings;
/**
 * Custom JSON replacer function to handle BigInt serialization
 * @param key - The property key
 * @param value - The property value
 * @returns The serialized value
 */
function bigIntReplacer(key, value) {
    if (typeof value === 'bigint') {
        return value.toString();
    }
    return value;
}
/**
 * Serialize an object to JSON with BigInt support
 * @param obj - The object to serialize
 * @returns JSON string with BigInt values converted to strings
 */
function serializeWithBigInt(obj) {
    return JSON.stringify(obj, bigIntReplacer);
}
/**
 * Convert an object with potential BigInt values to a JSON-safe object
 * @param obj - The object to convert
 * @returns Object with BigInt values converted to strings
 */
function convertBigIntsToStrings(obj) {
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (typeof obj === 'bigint') {
        return obj.toString();
    }
    if (Array.isArray(obj)) {
        return obj.map(convertBigIntsToStrings);
    }
    if (typeof obj === 'object') {
        const converted = {};
        for (const [key, value] of Object.entries(obj)) {
            converted[key] = convertBigIntsToStrings(value);
        }
        return converted;
    }
    return obj;
}
//# sourceMappingURL=bigIntSerializer.js.map