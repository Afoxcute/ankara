"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storyService_1 = require("../services/storyService");
const yakoascanner_1 = require("../services/yakoascanner");
const bigIntSerializer_1 = require("../utils/bigIntSerializer");
const idGenerator_1 = require("../utils/idGenerator");
const handleRegistration = async (req, res) => {
    console.log("🔥 Entered handleRegistration");
    try {
        const { ipHash, metadata, isEncrypted, SeekerIPContractAddress } = req.body;
        console.log("📦 Received body:", req.body);
        // Validate required parameters
        if (!ipHash || !metadata || isEncrypted === undefined || !SeekerIPContractAddress) {
            return res.status(400).json({
                error: 'Missing required parameters: ipHash, metadata, isEncrypted, SeekerIPContractAddress'
            });
        }
        // 1. Register on Etherlink using SeekerIP contract
        const { txHash, ipAssetId, blockNumber, explorerUrl } = await (0, storyService_1.registerIpWithEtherlink)(ipHash, metadata, isEncrypted, SeekerIPContractAddress);
        console.log("✅ Etherlink registration successful:", {
            txHash,
            ipAssetId,
            blockNumber,
            explorerUrl
        });
        // 2. Submit to Yakoa (if ipAssetId is available)
        if (ipAssetId) {
            // Ensure contract address is properly formatted
            const contractAddress = SeekerIPContractAddress.toLowerCase();
            // Format ID as contract address with token ID: 0x[contract_address]:[token_id]
            // Generate unique timestamped ID for Yakoa registration to prevent conflicts
            const Id = (0, idGenerator_1.generateTimestampedId)(contractAddress, ipAssetId);
            console.log("📞 Calling registerToYakoa...");
            console.log("🔍 Yakoa ID format:", Id);
            console.log("🔍 Contract address:", contractAddress);
            console.log("🔍 IP Asset ID:", ipAssetId);
            // Parse metadata to get creator and title info
            let parsedMetadata;
            try {
                parsedMetadata = JSON.parse(metadata);
            }
            catch (e) {
                parsedMetadata = { name: 'Unknown', description: '', creator: 'unknown' };
            }
            // Ensure creator_id is a valid Ethereum address
            let creatorId = parsedMetadata.creator;
            console.log("🔍 Parsed metadata creator:", creatorId);
            if (!creatorId || !creatorId.match(/^0x[a-fA-F0-9]{40}$/)) {
                console.log("⚠️ Invalid creator address, using default");
                // Use a default address if creator is not a valid Ethereum address
                creatorId = '0x0000000000000000000000000000000000000000';
            }
            // Ensure creator address is lowercase for consistency
            creatorId = creatorId.toLowerCase();
            console.log("✅ Final creator_id for Yakoa:", creatorId);
            // Prepare comprehensive metadata for Yakoa
            const yakoaMetadata = {
                title: parsedMetadata.name || 'Unknown',
                description: parsedMetadata.description || '',
                creator: creatorId,
                created_at: parsedMetadata.created_at || new Date().toISOString(),
                ip_hash: ipHash,
                is_encrypted: isEncrypted,
                contract_address: contractAddress,
                token_id: ipAssetId.toString(),
                // Add additional metadata for better infringement detection
                content_type: parsedMetadata.content_type || 'unknown',
                file_size: parsedMetadata.file_size || 0,
                mime_type: parsedMetadata.mime_type || 'unknown',
                tags: parsedMetadata.tags || [],
                category: parsedMetadata.category || 'general',
                license_type: parsedMetadata.license_type || 'all_rights_reserved',
                commercial_use: parsedMetadata.commercial_use || false,
                derivatives_allowed: parsedMetadata.derivatives_allowed || false,
            };
            // Prepare media array with more detailed information
            const yakoaMedia = [
                {
                    media_id: parsedMetadata.name || 'Unknown',
                    url: `https://ipfs.io/ipfs/${ipHash}`,
                    type: parsedMetadata.mime_type || 'unknown',
                    size: parsedMetadata.file_size || 0,
                    hash: ipHash,
                    metadata: {
                        name: parsedMetadata.name || 'Unknown',
                        description: parsedMetadata.description || '',
                        creator: creatorId,
                        created_at: parsedMetadata.created_at || new Date().toISOString(),
                    }
                },
            ];
            // Prepare authorizations for infringement monitoring
            const authorizations = [
                {
                    brand_id: null,
                    brand_name: null,
                    data: {
                        type: 'email',
                        email_address: parsedMetadata.creator_email || 'creator@SeekerIP.com'
                    }
                }
            ];
            const yakoaResponse = await (0, yakoascanner_1.registerToYakoa)({
                Id: Id,
                transactionHash: txHash,
                blockNumber,
                creatorId: creatorId,
                metadata: yakoaMetadata,
                media: yakoaMedia,
                brandId: null,
                brandName: null,
                emailAddress: parsedMetadata.creator_email || 'creator@SeekerIP.com',
                licenseParents: [],
                authorizations: authorizations,
            });
            // Determine success message based on Yakoa response
            const successMessage = yakoaResponse.alreadyRegistered
                ? 'IP Asset registered on Etherlink, already exists in Yakoa'
                : 'IP Asset successfully registered on Etherlink and Yakoa';
            const responseData = {
                message: successMessage,
                etherlink: {
                    txHash,
                    ipAssetId,
                    explorerUrl,
                    blockNumber,
                    ipHash
                },
                yakoa: yakoaResponse,
            };
            return res.status(200).json((0, bigIntSerializer_1.convertBigIntsToStrings)(responseData));
        }
        else {
            const responseData = {
                message: 'Registration successful (IP Asset ID not extracted)',
                etherlink: {
                    txHash,
                    ipAssetId: null,
                    explorerUrl,
                    blockNumber,
                    ipHash
                },
            };
            return res.status(200).json((0, bigIntSerializer_1.convertBigIntsToStrings)(responseData));
        }
    }
    catch (err) {
        console.error('❌ Registration error:', err);
        return res.status(500).json({
            error: 'Registration failed',
            details: err instanceof Error ? err.message : err,
        });
    }
};
exports.default = handleRegistration;
//# sourceMappingURL=registerController.js.map