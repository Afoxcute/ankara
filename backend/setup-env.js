const fs = require('fs');
const path = require('path');

console.log('🔧 Backend Environment Setup');
console.log('============================\n');

// Check if .env already exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('⚠️  .env file already exists');
  console.log('Please check the existing file or remove it to create a new one.\n');
  process.exit(0);
}

// Create .env file with default values
const envContent = `# Wallet Configuration
# Replace with your actual wallet private key (without 0x prefix)
WALLET_PRIVATE_KEY=1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# RPC Configuration (Cronos Testnet)
RPC_PROVIDER_URL=https://evm-t3.cronos.org

# Pinata IPFS Configuration
# Get your JWT from https://app.pinata.cloud/developers/api-keys
PINATA_JWT=your_pinata_jwt_here

# Yakoa API Configuration
# Get these from your Yakoa account
YAKOA_API_KEY=your_yakoa_api_key_here
YAKOA_SUBDOMAIN=your_subdomain
YAKOA_NETWORK=cronos_testnet

# NFT Contract Configuration
NFT_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000

# Server Configuration
PORT=5000
`;

try {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env file with default values');
  console.log('\n📝 Next steps:');
  console.log('1. Edit the .env file with your actual credentials');
  console.log('2. Get your wallet private key from your Cronos testnet wallet');
  console.log('3. Get your Pinata JWT from https://app.pinata.cloud/developers/api-keys');
  console.log('4. Configure Yakoa API keys if needed');
  console.log('\n⚠️  Important: Never commit the .env file to version control!');
} catch (error) {
  console.error('❌ Failed to create .env file:', error.message);
  process.exit(1);
}
