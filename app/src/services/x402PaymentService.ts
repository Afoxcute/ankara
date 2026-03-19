import { ThirdwebClient } from "thirdweb";
import { ethers } from "ethers";
import axios from "axios";

// Network Constants - Polkadot Hub TestNet (primary testnet)
export const POLKADOT_HUB_TESTNET = {
  id: 420420417,
  name: 'Polkadot Hub TestNet',
  nativeCurrency: {
    name: 'Paseo',
    symbol: 'PAS',
    decimals: 18,
  },
  rpc: 'https://eth-rpc-testnet.polkadot.io',
  rpcUrls: {
    default: {
      http: ['https://eth-rpc-testnet.polkadot.io'],
    },
    public: {
      http: ['https://eth-rpc-testnet.polkadot.io'],
    },
  },
  blockExplorers: [{
    name: 'Polkadot Hub TestNet Explorer',
    url: 'https://blockscout-testnet.polkadot.io',
  }],
};

// PAS (Paseo) ERC20-precompile address for x402 payments.
// For Polkadot Hub reviving, the native token PAS is exposed as an ERC20 precompile
// with asset id = 0, encoded into the first 4 bytes of the precompile address.
// If your x402 facilitator expects a different address/domain, override via env vars.
export const PAS_TESTNET =
  (typeof import.meta !== 'undefined' &&
    import.meta.env?.VITE_PAS_X402_ASSET_ADDRESS &&
    String(import.meta.env.VITE_PAS_X402_ASSET_ADDRESS)) ||
  '0x0000000000000000000000000000000001200000';

export const PAS_MAINNET = PAS_TESTNET;

export const PAS_DECIMALS =
  Number(import.meta.env?.VITE_PAS_X402_DECIMALS || 18) || 18;

// Off-chain metadata for precompile tokens (the precompile does not expose name/symbol/decimals)
export const STABLECOIN_METADATA: Record<string, { name: string; symbol: string; decimals: number }> = {
  [PAS_TESTNET.toLowerCase()]: {
    name: String(import.meta.env?.VITE_PAS_X402_DOMAIN_NAME || 'PAS'),
    symbol: 'PAS',
    decimals: PAS_DECIMALS,
  },
};

// Facilitator URL (set VITE_FACILITATOR_URL in .env for payment settlement)
export const FACILITATOR_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FACILITATOR_URL) || '';

// EIP-712 Domain default (actual domain is queried from contract when possible)
export const TOKEN_DOMAIN = {
  name: "PAS",
  version: "1",
};

// EIP-712 Types for TransferWithAuthorization
export const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
};

export interface PaymentRequirements {
  scheme: string;
  network: string;
  payTo: string;
  asset: string;
  maxAmountRequired: string;
  maxTimeoutSeconds: number;
  description?: string;
  mimeType?: string;
}

export interface PaymentHeaderPayload {
  from: string;
  to: string;
  value: string;
  validAfter: string | number; // Can be string or number, but should match signed message
  validBefore: string | number; // Can be string or number, but should match signed message
  nonce: string;
  signature: string;
  asset: string;
}

export interface PaymentHeader {
  x402Version: number;
  scheme: string;
  network: string;
  payload: PaymentHeaderPayload;
}

export interface VerifyResponse {
  isValid: boolean;
  invalidReason?: string;
}

export interface SettleResponse {
  x402Version: number;
  event: 'payment.settled' | 'payment.failed';
  txHash?: string;
  from?: string;
  to?: string;
  value?: string;
  blockNumber?: number;
  network?: string;
  timestamp?: string;
  error?: string;
}

/**
 * X402 Payment Service
 * Handles payment header generation, verification, and settlement
 */
export class X402PaymentService {
  constructor(_client: ThirdwebClient, _network: 'polkadot-testnet' = 'polkadot-testnet') {
    // Only Polkadot Hub TestNet is supported; _network kept for API compatibility.
  }

  /**
   * Generate a random 32-byte nonce for EIP-3009 authorization
   * Uses ethers.randomBytes(32) as per guide
   * Returns a hex string starting with 0x (bytes32 format)
   */
  generateNonce(): string {
    const nonce = ethers.hexlify(ethers.randomBytes(32));
    console.log('🎲 Generated nonce:', nonce, '(length:', nonce.length, 'bytes)');
    return nonce;
  }

  /**
   * Query the token contract's EIP-712 domain
   * This ensures we use the correct domain name from the contract
   * Tries multiple methods to get the domain name
   */
  private async getTokenDomain(asset: string): Promise<{ name: string; version: string } | null> {
    // Polkadot Hub ERC20 precompiles don't expose name()/symbol()/decimals(),
    // so check the local metadata map first before hitting the RPC.
    const known = STABLECOIN_METADATA[asset.toLowerCase()];
    if (known) {
      console.log(`Using known token metadata for ${known.symbol}:`, known.name);
      return { name: known.name, version: "1" };
    }

    const rpcUrl = 'https://eth-rpc-testnet.polkadot.io';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    try {
      // Method 1: Try EIP-5267 eip712Domain() function
      const eip712DomainABI = [
        "function eip712Domain() public view returns (bytes1 fields, string memory name, string memory version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] memory extensions)"
      ];
      
      console.log('🔍 Querying contract for EIP-712 domain (Method 1: eip712Domain):', asset);
      const contract = new ethers.Contract(asset, eip712DomainABI, provider);
      const domain = await contract.eip712Domain();
      
      console.log('✅ Successfully queried contract EIP-712 domain:', {
        name: domain.name,
        version: domain.version,
        chainId: domain.chainId.toString(),
        verifyingContract: domain.verifyingContract,
      });
      
      return {
        name: domain.name,
        version: domain.version,
      };
    } catch (error1) {
      console.warn('❌ Method 1 (eip712Domain) failed:', error1 instanceof Error ? error1.message : error1);
      
      try {
        // Method 2: Try to get the token name and use it as domain name
        const erc20ABI = [
          "function name() public view returns (string)",
          "function symbol() public view returns (string)"
        ];
        
        console.log('🔍 Trying Method 2: Querying token name() function');
        const tokenContract = new ethers.Contract(asset, erc20ABI, provider);
        const tokenName = await tokenContract.name();
        
        console.log('✅ Got token name from contract:', tokenName);
        // Use token name as domain name (common pattern)
        return {
          name: tokenName,
          version: "1",
        };
      } catch (error2) {
        console.warn('❌ Method 2 (token name) also failed:', error2 instanceof Error ? error2.message : error2);
        return null;
      }
    }
  }

  /**
   * Create payment header for x402 payments
   * Follows the exact format from the x402 guide
   * @param domainNameOverride - Optional domain name to use instead of querying the contract
   */
  async createPaymentHeader(
    account: any,
    paymentRequirements: PaymentRequirements,
    domainNameOverride?: string
  ): Promise<string> {
    if (!account?.address) {
      throw new Error('Wallet not connected');
    }

    const { payTo, asset, maxAmountRequired, maxTimeoutSeconds, scheme, network } = paymentRequirements;

    // Generate unique nonce (32 bytes)
    const nonce = this.generateNonce();
    
    // Calculate validity window (in seconds, not milliseconds)
    const validAfter = 0; // Valid immediately
    const validBefore = Math.floor(Date.now() / 1000) + maxTimeoutSeconds;

    // Get chain ID as number (required for EIP-712) - Polkadot Hub TestNet
    const chainId = 420420417;

    // Try to get the actual domain from the contract, fallback to defaults
    let domainName: string | undefined;
    let domainVersion: string | undefined;
    
    if (domainNameOverride) {
      // Use provided domain name override
      domainName = domainNameOverride;
      domainVersion = "1";
      console.log(`🔧 Using domain name override: "${domainName}"`);
    } else {
      // Try to query the contract
      const contractDomain = await this.getTokenDomain(asset);
      domainName = contractDomain?.name;
      domainVersion = contractDomain?.version;
      
      // If contract query failed (or token is a precompile with no metadata),
      // fall back to our default domain.
      if (!domainName) {
        domainName = TOKEN_DOMAIN.name;
        domainVersion = TOKEN_DOMAIN.version;
      }
    }
    
    console.log('Using EIP-712 domain name:', domainName, 'version:', domainVersion);
    console.log('Token contract:', asset, '(Polkadot Hub TestNet)');

    // Set up EIP-712 domain
    // The domain name must match the token contract's EIP-712 domain exactly
    // verifyingContract should be checksummed to match message addresses
    const domain = {
      name: domainName,
      version: domainVersion,
      chainId: chainId,
      verifyingContract: ethers.getAddress(asset), // Checksummed to match message addresses
    };
    
    console.log('🔐 EIP-712 Domain:', JSON.stringify(domain, null, 2));

    // Define EIP-712 typed data structure
    const types = {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    };

    // Create the message to sign
    // For EIP-712 with ethers.js:
    // - uint256 should be string for large numbers (more reliable)
    // - address should be checksummed (EIP-55) - this is the standard
    // - bytes32 should be hex string
    // Note: EIP-712 standard uses addresses as-is (checksummed format)
    const fromAddress = ethers.getAddress(account.address); // Checksummed
    const toAddress = ethers.getAddress(payTo); // Checksummed
    const assetAddress = ethers.getAddress(asset); // Checksummed
    
    const message = {
      from: fromAddress, // Checksummed address (EIP-55)
      to: toAddress, // Checksummed address
      value: maxAmountRequired, // String representation of uint256
      validAfter: validAfter.toString(), // Convert to string for uint256
      validBefore: validBefore.toString(), // Convert to string for uint256
      nonce: nonce, // Hex string (bytes32)
    };
    
    console.log('📝 Message to sign:', {
      from: fromAddress,
      to: toAddress,
      value: maxAmountRequired,
      validAfter: validAfter.toString(),
      validBefore: validBefore.toString(),
      nonce: nonce,
    });

    // Sign using EIP-712 with ethers
    console.log('Creating payment header with:', {
      domain,
      message,
      accountAddress: account.address,
    });
    
    const signature = await this.signTypedData(account, domain, types, message);
    
    console.log('Signature generated:', signature.substring(0, 20) + '...');
    
    // Verify signature locally to ensure it's valid
    let localVerificationPassed = false;
    try {
      // Recover signer from signature
      const recoveredAddress = ethers.verifyTypedData(
        domain,
        types,
        message,
        signature
      );
      
      localVerificationPassed = recoveredAddress.toLowerCase() === fromAddress.toLowerCase();
      
      console.log('✅ Local signature verification:', {
        expected: fromAddress,
        recovered: recoveredAddress,
        valid: localVerificationPassed,
      });
      
      if (!localVerificationPassed) {
        console.error('⚠️ Signature recovery failed! Recovered address does not match signer.');
        console.error('This means the signature is invalid and will be rejected by the facilitator.');
      }
    } catch (verifyError) {
      console.error('❌ Local signature verification error:', verifyError);
      console.error('This signature will definitely be rejected by the facilitator.');
    }

    // Construct payment header
    // Payload uses numbers for validAfter/validBefore (as per interface)
    // The facilitator will convert them to strings when reconstructing the EIP-712 message
    const paymentHeader: PaymentHeader = {
      x402Version: 1,
      scheme: scheme,
      network: network,
      payload: {
        from: fromAddress, // Match signed message (checksummed)
        to: toAddress, // Match signed message (checksummed)
        value: maxAmountRequired, // String (matches signed message)
        validAfter: validAfter, // Number in payload (facilitator converts to string for EIP-712)
        validBefore: validBefore, // Number in payload (facilitator converts to string for EIP-712)
        nonce: nonce, // Hex string (matches signed message)
        signature: signature,
        asset: assetAddress, // Checksummed asset address
      },
    };
    
    // Compare signed message with payload to ensure they match
    console.log('📦 Payment header payload:', {
      from: paymentHeader.payload.from,
      to: paymentHeader.payload.to,
      value: paymentHeader.payload.value,
      validAfter: paymentHeader.payload.validAfter,
      validBefore: paymentHeader.payload.validBefore,
      nonce: paymentHeader.payload.nonce,
      asset: paymentHeader.payload.asset,
      signatureLength: paymentHeader.payload.signature.length,
    });
    
    console.log('🔍 Message vs Payload comparison:', {
      'message.from === payload.from': message.from === paymentHeader.payload.from,
      'message.to === payload.to': message.to === paymentHeader.payload.to,
      'message.value === payload.value': message.value === paymentHeader.payload.value,
      'message.validAfter (string) vs payload.validAfter (number)': `${message.validAfter} (${typeof message.validAfter}) vs ${paymentHeader.payload.validAfter} (${typeof paymentHeader.payload.validAfter})`,
      'message.validBefore (string) vs payload.validBefore (number)': `${message.validBefore} (${typeof message.validBefore}) vs ${paymentHeader.payload.validBefore} (${typeof paymentHeader.payload.validBefore})`,
      'message.nonce === payload.nonce': message.nonce === paymentHeader.payload.nonce,
    });
    
    if (!localVerificationPassed) {
      console.error('🚨 WARNING: Local signature verification failed! The facilitator will reject this signature.');
    }

    // Base64-encode
    return Buffer.from(JSON.stringify(paymentHeader)).toString('base64');
  }

  /**
   * Get the preferred EVM wallet provider (MetaMask preferred, excludes Phantom)
   */
  private getPreferredEVMProvider(): any {
    if (typeof window === 'undefined') return null;
    
    const ethereum = (window as any).ethereum;
    if (!ethereum) return null;
    
    // If multiple providers are available (e.g., both MetaMask and Phantom)
    if (ethereum.providers && Array.isArray(ethereum.providers)) {
      // First, try to find MetaMask
      const metaMaskProvider = ethereum.providers.find((p: any) => p.isMetaMask);
      if (metaMaskProvider) {
        console.log('[X402] Selected MetaMask from multiple providers');
        return metaMaskProvider;
      }
      
      // Then, find any non-Phantom provider
      const nonPhantomProvider = ethereum.providers.find((p: any) => !p.isPhantom);
      if (nonPhantomProvider) {
        console.log('[X402] Selected non-Phantom EVM wallet from multiple providers');
        return nonPhantomProvider;
      }
      
      // Fallback to first provider if no better option
      console.warn('[X402] No MetaMask found, using first available provider');
      return ethereum.providers[0];
    }
    
    // Single provider case
    if (ethereum.isPhantom) {
      console.warn('[X402] Phantom detected but not supported for EVM. Please use MetaMask or another EVM wallet.');
      return null; // Don't use Phantom for EVM
    }
    
    if (ethereum.isMetaMask) {
      console.log('[X402] Using MetaMask');
    } else {
      console.log('[X402] Using detected EVM wallet');
    }
    
    return ethereum;
  }

  /**
   * Sign typed data using ethers (following x402 guide)
   * Properly handles thirdweb accounts and browser wallets
   * Prioritizes MetaMask and excludes Phantom
   */
  private async signTypedData(
    account: any,
    domain: any,
    types: any,
    message: any
  ): Promise<string> {
    const rpcUrl = 'https://eth-rpc-testnet.polkadot.io';
    try {
      const provider = this.getPreferredEVMProvider();
      if (provider) {
        try {
          const ethersProvider = new ethers.BrowserProvider(provider);
          await provider.request({ method: 'eth_requestAccounts' });
          const network = await ethersProvider.getNetwork();
          const expectedChainId = 420420417n;
          if (network.chainId !== expectedChainId) {
            console.warn(`Network mismatch: expected ${expectedChainId}, got ${network.chainId}`);
            try {
              await provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${expectedChainId.toString(16)}` }],
              });
            } catch (switchError: any) {
              if (switchError.code === 4902) {
                const chainConfig = {
                  chainId: `0x${expectedChainId.toString(16)}`,
                  chainName: 'Polkadot Hub TestNet',
                  nativeCurrency: { name: 'Paseo', symbol: 'PAS', decimals: 18 },
                  rpcUrls: ['https://eth-rpc-testnet.polkadot.io'],
                  blockExplorerUrls: ['https://blockscout-testnet.polkadot.io'],
                };
                await provider.request({
                  method: 'wallet_addEthereumChain',
                  params: [chainConfig],
                });
              }
            }
          }
          
          const signer = await ethersProvider.getSigner(account.address);
          
          // Ensure domain chainId is a number
          const domainWithNumberChainId = {
            ...domain,
            chainId: typeof domain.chainId === 'string' ? parseInt(domain.chainId, 10) : domain.chainId,
          };
          
          console.log('Signing with domain:', domainWithNumberChainId);
          console.log('Signing with message:', message);
          
          const signature = await signer.signTypedData(domainWithNumberChainId, types, message);
          console.log('Signature received:', signature);
          return signature;
        } catch (browserError) {
          console.warn('Browser provider signing failed, trying alternatives:', browserError);
        }
      }

      // Priority 2: Use JsonRpcProvider with private key if available
      if (account.privateKey) {
        const provider = new ethers.JsonRpcProvider(rpcUrl);  
        const wallet = new ethers.Wallet(account.privateKey, provider);
        
        // Ensure domain chainId is a number
        const domainWithNumberChainId = {
          ...domain,
          chainId: typeof domain.chainId === 'string' ? parseInt(domain.chainId, 10) : domain.chainId,
        };
        
        return await wallet.signTypedData(domainWithNumberChainId, types, message);
      }

      // Priority 3: Try to get signer from thirdweb account
      // For thirdweb accounts, we need to use the underlying wallet (but not Phantom)
      if (account) {
        const provider = this.getPreferredEVMProvider();
        if (provider) {
          const ethersProvider = new ethers.BrowserProvider(provider);
          const signer = await ethersProvider.getSigner(account.address);
          
          const domainWithNumberChainId = {
            ...domain,
            chainId: typeof domain.chainId === 'string' ? parseInt(domain.chainId, 10) : domain.chainId,
          };
          
          return await signer.signTypedData(domainWithNumberChainId, types, message);
        }
      }
    } catch (error) {
      console.error('Signing error:', error);
      throw new Error(`Failed to sign typed data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    throw new Error('Unable to sign typed data. Please ensure your wallet is connected and supports EIP-712 signing. Make sure you have MetaMask or a compatible wallet installed.');
  }

  /**
   * Verify payment header
   */
  async verifyPayment(
    paymentHeader: string,
    paymentRequirements: PaymentRequirements
  ): Promise<VerifyResponse> {
    if (!FACILITATOR_URL) {
      return { isValid: false, invalidReason: 'VITE_FACILITATOR_URL is not set' };
    }
    try {
      // Decode payment header for debugging
      const decodedHeader = JSON.parse(Buffer.from(paymentHeader, 'base64').toString());
      console.log('📋 Decoded payment header (what facilitator will see):', JSON.stringify(decodedHeader, null, 2));
      
      // Check if the facilitator can reconstruct the message correctly
      const payload = decodedHeader.payload;
      console.log('🔍 Facilitator will reconstruct message from payload:', {
        from: payload.from,
        to: payload.to,
        value: payload.value,
        validAfter: payload.validAfter,
        validBefore: payload.validBefore,
        nonce: payload.nonce,
        asset: payload.asset,
      });
      
      // The facilitator needs to convert validAfter/validBefore from number to string for EIP-712
      console.log('💡 Note: Facilitator should convert validAfter/validBefore to strings for EIP-712 verification');
      
      console.log('Verifying payment with facilitator:', {
        url: `${FACILITATOR_URL}/verify`,
        paymentHeader: paymentHeader.substring(0, 100) + '...',
        paymentRequirements,
      });

      const response = await axios.post<VerifyResponse>(
        `${FACILITATOR_URL}/verify`,
        {
          x402Version: 1,
          paymentHeader: paymentHeader,
          paymentRequirements: paymentRequirements,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X402-Version': '1',
          },
        }
      );

      console.log('Verification response status:', response.status);
      console.log('Verification response data:', JSON.stringify(response.data, null, 2));
      console.log('Verification response headers:', response.headers);
      console.log('Full response object keys:', Object.keys(response));
      
      if (!response.data) {
        console.warn('Verification response data is empty or undefined');
        console.warn('Response object:', response);
        return {
          isValid: false,
          invalidReason: 'Empty response from facilitator',
        };
      }
      
      // Ensure the response matches our expected format
      const verifyResponse: VerifyResponse = {
        isValid: response.data.isValid ?? false,
        invalidReason: response.data.invalidReason,
      };
      
      console.log('Parsed verification response:', verifyResponse);
      return verifyResponse;
    } catch (error: any) {
      console.error('Verify payment error:', error);
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      if (error.response) {
        console.error('Error response status:', error.response.status);
        console.error('Error response status text:', error.response.statusText);
        console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
        console.error('Error response headers:', JSON.stringify(error.response.headers, null, 2));
      } else if (error.request) {
        console.error('No response received. Request details:', {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data,
        });
      }
      
      return {
        isValid: false,
        invalidReason: error.response?.data?.invalidReason || 
                      error.response?.data?.error || 
                      error.response?.data?.message ||
                      error.message ||
                      'Unknown verification error',
      };
    }
  }

  /**
   * Settle payment on-chain
   */
  async settlePayment(
    paymentHeader: string,
    paymentRequirements: PaymentRequirements
  ): Promise<SettleResponse> {
    if (!FACILITATOR_URL) {
      return {
        x402Version: 1,
        event: 'payment.failed',
        network: paymentRequirements.network,
        timestamp: new Date().toISOString(),
        error: 'VITE_FACILITATOR_URL is not set',
      };
    }
    try {
      const response = await axios.post<SettleResponse>(
        `${FACILITATOR_URL}/settle`,
        {
          x402Version: 1,
          paymentHeader: paymentHeader,
          paymentRequirements: paymentRequirements,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X402-Version': '1',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Settle payment error:', error);
      return {
        x402Version: 1,
        event: 'payment.failed',
        network: paymentRequirements.network,
        timestamp: new Date().toISOString(),
        error: error.response?.data?.error || error.message,
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    if (!FACILITATOR_URL) {
      return { ok: false, message: 'VITE_FACILITATOR_URL not set' };
    }
    try {
      const base = FACILITATOR_URL.replace(/\/v2\/x402\/?$/, '');
      const response = await axios.get(`${base}/healthcheck`);
      return response.data;
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    }
  }

  /**
   * Get supported payment kinds
   */
  async getSupported(): Promise<any> {
    try {
      const response = await axios.get(`${FACILITATOR_URL}/supported`);
      return response.data;
    } catch (error) {
      console.error('Get supported error:', error);
      throw error;
    }
  }


  /**
   * Complete payment flow: verify and settle
   * Tries different domain names if verification fails
   */
  async pay(
    account: any,
    paymentRequirements: PaymentRequirements
  ): Promise<SettleResponse> {
    // Step 1: Create payment header with contract's domain (or default)
    let paymentHeader = await this.createPaymentHeader(account, paymentRequirements);

    // Step 2: Verify payment
    let verifyResult = await this.verifyPayment(paymentHeader, paymentRequirements);
    
    // If verification fails, try alternative domain names
    if (!verifyResult.isValid && verifyResult.invalidReason?.includes('signature')) {
      console.log('🔄 Verification failed, trying alternative domain names...');
      const pasDomainEnv = String(import.meta.env?.VITE_PAS_X402_DOMAIN_NAME || 'PAS');
      const alternativeDomains = [
        pasDomainEnv,
        "PAS",
        "Paseo",
      ];
      
      for (const altDomain of alternativeDomains) {
        try {
          console.log(`🔄 Trying domain: "${altDomain}"`);
          paymentHeader = await this.createPaymentHeader(account, paymentRequirements, altDomain);
          verifyResult = await this.verifyPayment(paymentHeader, paymentRequirements);
          
          if (verifyResult.isValid) {
            console.log(`✅ Verification successful with domain: "${altDomain}"`);
            break;
          } else {
            console.log(`❌ Domain "${altDomain}" also failed:`, verifyResult.invalidReason);
          }
        } catch (error) {
          console.error(`Error trying domain "${altDomain}":`, error);
          continue;
        }
      }
    }
    
    if (!verifyResult.isValid) {
      return {
        x402Version: 1,
        event: 'payment.failed',
        network: paymentRequirements.network,
        timestamp: new Date().toISOString(),
        error: verifyResult.invalidReason || 'Payment verification failed',
      };
    }

    // Step 3: Settle payment
    const settleResult = await this.settlePayment(paymentHeader, paymentRequirements);

    return settleResult;
  }
}

/**
 * Factory function to create x402 payment service
 */
export function createX402PaymentService(
  client: ThirdwebClient,
  network: 'polkadot-testnet' = 'polkadot-testnet'
): X402PaymentService {
  return new X402PaymentService(client, network);
}

