import { Address } from 'viem'
import { NFTContractAddress } from '../utils'
import { publicClient, walletClient, account } from '../config'
import { defaultNftContractAbi } from '../abi/defaultNftContractAbi'

export async function mintNFT(to: Address, uri: string): Promise<number | undefined> {
    console.log('Minting a new NFT...')

    // Check if NFT contract is configured
    if (NFTContractAddress === '0x0000000000000000000000000000000000000000') {
        console.warn('NFT contract not configured, skipping NFT minting')
        return undefined
    }

    try {
        const { request } = await publicClient.simulateContract({
            address: NFTContractAddress,
            functionName: 'mintNFT',
            args: [to, uri],
            abi: defaultNftContractAbi,
        })
        const hash = await walletClient.writeContract({ ...request, account: account })
        const { logs } = await publicClient.waitForTransactionReceipt({
            hash,
        })
        if (logs[0].topics[3]) {
            return parseInt(logs[0].topics[3], 16)
        }
    } catch (error) {
        console.error('Error minting NFT:', error)
        throw error
    }
}
