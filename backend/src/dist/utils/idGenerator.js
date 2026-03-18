"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUniqueId = generateUniqueId;
exports.generateTimestampedId = generateTimestampedId;
exports.parseYakoaId = parseYakoaId;
/**
 * Generate a unique ID for IP asset registration
 * @param contractAddress - The contract address
 * @param tokenId - The token ID
 * @param timestamp - Optional timestamp to make ID more unique
 * @returns A unique ID string
 */
function generateUniqueId(contractAddress, tokenId, timestamp) {
    const baseId = `${contractAddress.toLowerCase()}:${tokenId}`;
    if (timestamp) {
        // Add timestamp to make ID more unique
        return `${baseId}:${timestamp}`;
    }
    return baseId;
}
/**
 * Generate a unique ID with current timestamp
 * @param contractAddress - The contract address
 * @param tokenId - The token ID
 * @returns A unique ID string with timestamp
 */
function generateTimestampedId(contractAddress, tokenId) {
    return generateUniqueId(contractAddress, tokenId, Date.now());
}
/**
 * Extract contract address and token ID from a Yakoa ID
 * @param id - The Yakoa ID (format: contract:tokenId or contract:tokenId:timestamp)
 * @returns Object with contract address and token ID
 */
function parseYakoaId(id) {
    const parts = id.split(':');
    if (parts.length < 2) {
        throw new Error('Invalid Yakoa ID format');
    }
    return {
        contractAddress: parts[0],
        tokenId: parts[1]
    };
}
//# sourceMappingURL=idGenerator.js.map