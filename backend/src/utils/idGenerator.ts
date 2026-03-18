/**
 * Generate a unique ID for IP asset registration
 * @param contractAddress - The contract address
 * @param tokenId - The token ID
 * @param timestamp - Optional timestamp to make ID more unique
 * @returns A unique ID string
 */
export function generateUniqueId(
  contractAddress: string, 
  tokenId: number | string,
  timestamp?: number
): string {
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
export function generateTimestampedId(
  contractAddress: string, 
  tokenId: number | string
): string {
  return generateUniqueId(contractAddress, tokenId, Date.now());
}

/**
 * Extract contract address and token ID from an ID string
 * @param id - The ID (format: contract:tokenId or contract:tokenId:timestamp)
 * @returns Object with contract address and token ID
 */
export function parseId(id: string): { contractAddress: string; tokenId: string } {
  const parts = id.split(':');
  if (parts.length < 2) {
    throw new Error('Invalid ID format');
  }
  
  return {
    contractAddress: parts[0],
    tokenId: parts[1]
  };
}

// Legacy alias (deprecated - use parseId instead)
export const parseYakoaId = parseId; 