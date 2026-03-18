# Bumpa Subscription Smart Contracts

Hardhat project for the on-chain subscription system used by the Bumpa frontend.

## Contracts

- **SubscriptionManagerFLOW** (recommended): Same subscription model but **payments in native FLOW**. No ERC20; `pay(subscriptionId)` is `payable` and forwards FLOW to the recipient. Amounts in wei (18 decimals).
- **SubscriptionManager**: ERC20-based (e.g. USDC). Use `SubscriptionManagerFLOW` for FLOW payments.

## Setup

```bash
cd contracts
yarn install
yarn compile
```

## Deploy (Flow EVM Testnet)

1. Create `.env` in `contracts/` with:
   ```
   PRIVATE_KEY=0x...   # Deployer wallet private key (with FLOW for gas)
   ```
2. **Native FLOW (recommended):**
   ```bash
   yarn deploy:flow
   ```
   Deploys `SubscriptionManagerFLOW`. Copy the printed address.
3. **ERC20 (USDC):**
   ```bash
   yarn deploy:testnet
   ```
4. In the app `.env` you can override the address (optional; app default is set below):
   ```
   VITE_SUBSCRIPTION_CONTRACT_ADDRESS=<deployed address>
   ```

**Current SubscriptionManagerFLOW (Flow EVM Testnet):** `0xb2AC0Db5788B222c417F9C1353C5574bC8106C77`

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

- **Flow EVM Testnet**: chainId 545, RPC `https://testnet.evm.nodes.onflow.org`, Explorer `https://evm-testnet.flowscan.io`

For ERC20 deploy, set `USDC_ADDRESS` in `.env` if different from the default.
