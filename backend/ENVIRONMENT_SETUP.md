# Backend Environment Setup

## Quick Setup

1. **Copy the example file:**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Edit `.env` file** with your actual credentials (see below)

## Required Configuration

Create a `.env` file in the `backend` directory with the following content:

```bash
# Database Configuration (REQUIRED)
DATABASE_URL=postgresql://user:password@host:port/database

# Redis Configuration (REQUIRED for auto-pay queue)
# Option 1: Full connection string (recommended)


# Option 2: Individual components (used if REDIS_URL is not set)
# REDIS_USERNAME=default
# REDIS_PASSWORD=WsjE9g4MJCwrcmyXL0dR80etUIAZ8sOZ
# REDIS_HOST=redis-15358.c15.us-east-1-2.ec2.cloud.redislabs.com
# REDIS_PORT=15358

# Server Configuration
PORT=5000

# Optional: Wallet Configuration (for contract interactions)
# WALLET_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Optional: RPC Configuration (Flow EVM Testnet)
# RPC_PROVIDER_URL=https://testnet.evm.nodes.onflow.org

# Optional: Pinata IPFS Configuration
# PINATA_JWT=

# Optional: Yakoa API Configuration
# YAKOA_API_KEY=
# YAKOA_SUBDOMAIN=
# YAKOA_NETWORK=flow_testnet

# Optional: NFT Contract Configuration
# NFT_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
```

## Redis Configuration

The auto-pay queue system requires Redis. You can use:

1. **Redis Cloud (Free Tier)** - Already configured with hardcoded credentials
2. **Local Redis** - Set `REDIS_URL=redis://localhost:6379`
3. **Custom Redis** - Update `REDIS_URL` with your connection string

### Current Redis Setup (Hardcoded Fallback)

If `REDIS_URL` is not set in `.env`, the system will use:
- **Host**: `redis-15358.c15.us-east-1-2.ec2.cloud.redislabs.com`
- **Port**: `15358`
- **Username**: `default`
- **Password**: `WsjE9g4MJCwrcmyXL0dR80etUIAZ8sOZ`

### To Use Your Own Redis

1. **Local Redis:**
   ```bash
   REDIS_URL=redis://localhost:6379
   ```

2. **Redis Cloud:**
   - Sign up at https://redis.com/cloud
   - Create a database
   - Copy the connection URL
   - Set `REDIS_URL` in `.env`

## Network Configuration

- **Network**: Flow EVM Testnet
- **Chain ID**: 545
- **RPC URL**: https://testnet.evm.nodes.onflow.org
- **Explorer**: https://evm-testnet.flowscan.io
- **Native Token**: FLOW

## To Get Your Real Credentials

### Database URL:
1. Use your PostgreSQL connection string
2. Format: `postgresql://user:password@host:port/database`

### Pinata JWT (for IPFS - optional):
1. Go to [Pinata Developers](https://app.pinata.cloud/developers/api-keys)
2. Create a new API key
3. Copy the JWT token

## Running the Backend

After creating the `.env` file:

```bash
cd backend
yarn install
yarn start
```

The backend should now start successfully with:
- ✅ Database connection
- ✅ Redis connection (for auto-pay queue)
- ✅ Payment scheduler (if Redis is configured)
