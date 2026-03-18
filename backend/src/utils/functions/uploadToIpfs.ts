import { PinataSDK } from 'pinata-web3'
import fs from 'fs'
import path from 'path'

const pinata = new PinataSDK({
    pinataJwt: process.env.PINATA_JWT,
})

export async function uploadJSONToIPFS(jsonMetadata: any): Promise<string> {
    if (!jsonMetadata || typeof jsonMetadata !== 'object') {
        throw new Error('❌ uploadJSONToIPFS: Invalid or empty metadata provided');
    }

    const { IpfsHash } = await pinata.upload.json(jsonMetadata)
    return IpfsHash
}

// could use this to upload music (audio files) to IPFS
export async function uploadFileToIPFS(filePath: string, fileName: string, fileType: string): Promise<string> {
    const fullPath = path.join(process.cwd(), filePath)
    const blob = new Blob([fs.readFileSync(fullPath)])
    const file = new File([blob], fileName, { type: fileType })
    const { IpfsHash } = await pinata.upload.file(file)
    return IpfsHash
}
