"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadJSONToIPFS = uploadJSONToIPFS;
exports.uploadFileToIPFS = uploadFileToIPFS;
const pinata_web3_1 = require("pinata-web3");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pinata = new pinata_web3_1.PinataSDK({
    pinataJwt: process.env.PINATA_JWT,
});
async function uploadJSONToIPFS(jsonMetadata) {
    if (!jsonMetadata || typeof jsonMetadata !== 'object') {
        throw new Error('❌ uploadJSONToIPFS: Invalid or empty metadata provided');
    }
    const { IpfsHash } = await pinata.upload.json(jsonMetadata);
    return IpfsHash;
}
// could use this to upload music (audio files) to IPFS
async function uploadFileToIPFS(filePath, fileName, fileType) {
    const fullPath = path_1.default.join(process.cwd(), filePath);
    const blob = new Blob([fs_1.default.readFileSync(fullPath)]);
    const file = new File([blob], fileName, { type: fileType });
    const { IpfsHash } = await pinata.upload.file(file);
    return IpfsHash;
}
//# sourceMappingURL=uploadToIpfs.js.map