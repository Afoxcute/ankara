# Ankara Subscription Smart Contracts

Hardhat project for the on-chain subscription system used by the Ankara frontend.

## Contracts

- **SubscriptionManagerFLOW** (recommended): Same subscription model but **payments in native PAS**. No ERC20; `pay(subscriptionId)` is `payable` and forwards PAS to the recipient. Amounts in wei (18 decimals).
- **SubscriptionManager**: ERC20-based, using Polkadot Hub native stablecoins (USDC at `0x0000053900000000000000000000000001200000`, USDt at `0x000007C000000000000000000000000001200000`) via ERC20 precompile.

## Setup

```bash
cd contracts
yarn install
yarn compile
```

## Deploy (Polkadot Hub TestNet)

1. Create `.env` in `contracts/` with:
   ```
   PRIVATE_KEY=0x...   # Deployer wallet private key (with PAS for gas)
   ```
2. **Native PAS (recommended):**
   ```bash
   yarn deploy:flow
   ```
   Deploys `SubscriptionManagerFLOW`. Copy the printed address.
3. **ERC20 (real stablecoin on-chain — USDC and/or USDt):**
   - Deploy one contract per payment token (constructor takes the token address).
   - For **USDC**:
     ```bash
     USDC_ADDRESS=0x0000053900000000000000000000000001200000 yarn deploy:testnet
     ```
     Copy the printed address and set in app `.env`: `VITE_USDC_SUBSCRIPTION_CONTRACT_ADDRESS=<address>`.
   - For **USDt**:
     ```bash
     USDC_ADDRESS=0x000007C000000000000000000000000001200000 yarn deploy:testnet
     ```
     Copy the printed address and set in app `.env`: `VITE_USDT_SUBSCRIPTION_CONTRACT_ADDRESS=<address>`.
4. In the app `.env` you can override the PAS contract (optional):
   ```
   VITE_SUBSCRIPTION_CONTRACT_ADDRESS=<deployed SubscriptionManagerFLOW address>
   VITE_USDC_SUBSCRIPTION_CONTRACT_ADDRESS=<deployed USDC SubscriptionManager address>
   VITE_USDT_SUBSCRIPTION_CONTRACT_ADDRESS=<deployed USDt SubscriptionManager address>
   ```

**Current SubscriptionManagerFLOW (Polkadot Hub TestNet):** `0xb2AC0Db5788B222c417F9C1353C5574bC8106C77`

## Export ABI for frontend

After compiling:

```bash
npx hardhat run scripts/export-abi.ts
```

This writes the ABI to `app/src/contracts/SubscriptionManager.json`. The app also has a minimal inline ABI in `subscriptionContract.ts` for direct use with viem.

## Usage from frontend (SubscriptionManagerFLOW)

- **Create subscription**: `subscribe(recipientAddress, amountPerCycleWei, frequency)` where `frequency` is 0 = Weekly, 1 = Monthly, 2 = Yearly. Amount in wei (18 decimals, FLOW).
- **Pay**: Send native FLOW with the transaction: `pay(subscriptionId)` with `value = amountPerCycle` (no approval).
- **Cancel**: `cancel(subscriptionId)` (callable only by subscriber).

Backend can listen for `PaymentMade` and call the existing `recordPayment` API with `transactionHash` to keep the database in sync.

## Test

```bash
yarn test
```

## Network config

- **Polkadot Hub TestNet**: chainId 420420417, RPC `https://eth-rpc-testnet.polkadot.io`, Explorer `https://blockscout-testnet.polkadot.io`

For ERC20 deploy, set `USDC_ADDRESS` in `.env` if different from the default Polkadot Hub USDC precompile address.
