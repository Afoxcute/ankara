/**
 * Custom JSON replacer function to handle BigInt serialization
 * @param key - The property key
 * @param value - The property value
 * @returns The serialized value
 */
export declare function bigIntReplacer(key: string, value: any): any;
/**
 * Serialize an object to JSON with BigInt support
 * @param obj - The object to serialize
 * @returns JSON string with BigInt values converted to strings
 */
export declare function serializeWithBigInt(obj: any): string;
/**
 * Convert an object with potential BigInt values to a JSON-safe object
 * @param obj - The object to convert
 * @returns Object with BigInt values converted to strings
 */
export declare function convertBigIntsToStrings(obj: any): any;
//# sourceMappingURL=bigIntSerializer.d.ts.map