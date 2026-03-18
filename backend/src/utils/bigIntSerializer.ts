/**
 * Custom JSON replacer function to handle BigInt serialization
 * @param key - The property key
 * @param value - The property value
 * @returns The serialized value
 */
export function bigIntReplacer(key: string, value: any): any {
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
export function serializeWithBigInt(obj: any): string {
    return JSON.stringify(obj, bigIntReplacer);
}

/**
 * Convert an object with potential BigInt values to a JSON-safe object
 * @param obj - The object to convert
 * @returns Object with BigInt values converted to strings
 */
export function convertBigIntsToStrings(obj: any): any {
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
        const converted: any = {};
        for (const [key, value] of Object.entries(obj)) {
            converted[key] = convertBigIntsToStrings(value);
        }
        return converted;
    }
    
    return obj;
} 