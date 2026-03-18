# Ankara

**Ankara** is a subscription and recurring-payment system on blockchain. Users create subscriptions, pay in native PAS (or optionally in private/confidential mode on Sepolia), and manage everything from a single app with optional auto-pay and AI suggestions.

---

## Table of contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Subscription system](#subscription-system)
- [Smart contracts](#smart-contracts)
- [Backend API](#backend-api)
- [Frontend app](#frontend-app)
- [Environment variables](#environment-variables)
- [Getting started](#getting-started)
- [Deployment](#deployment)

---

## Overview

- **Public subscriptions (Polkadot Hub TestNet)**
  On-chain subscriptions with **native PAS**. No ERC20 approvals; `pay()` is payable and forwards PAS to the recipient. Amounts and schedules are public on-chain.

- **Confidential subscriptions (Sepolia, optional)**  
  Uses **Zama FHEVM**: subscription amount is stored as an encrypted value (`euint64`). Only the subscriber can decrypt their amount via the relayer SDK. Payments are still in native ETH on Sepolia.

- **Backend**  
  PostgreSQL + Express API for services catalog, user subscriptions, payment history, auto-pay queue (Bull + Redis), and statistics. Subscriptions are synced with on-chain IDs and contract addresses.

- **Frontend**  
  React (Vite) + Thirdweb: connect wallet (Flow testnet or Sepolia for confidential), create or subscribe to services, pay when due, view payment history, and use AI suggestions for cancellations.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Frontend (app/)                                                        │
│  React, Vite, Thirdweb, @zama-fhe/relayer-sdk (for confidential)        │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
                ▼                               ▼
┌───────────────────────────────┐   ┌─────────────────────────────────────┐
│  Backend (backend/)           │   │  On-chain                            │
│  Express, Prisma, Bull, Redis │   │  • Polkadot Hub TestNet:             │
│  POST /api/subscriptions      │   │    SubscriptionManager (native PAS)  │
│  GET  /api/subscriptions/user │   │  • Sepolia: ConfidentialSubscription │
│  GET  /api/services           │   │    Manager (Zama FHE, optional)       │
└───────────────────────────────┘   └─────────────────────────────────────┘
```

- User creates a subscription in the app → frontend calls the contract (`subscribe`) → then POSTs to backend with `onChainSubscriptionId` and `onChainContractAddress`.
- Payments: user (or auto-pay job) calls contract `pay()` with native PAS/ETH → backend records the payment via `POST /api/subscriptions/:id/payments`.

---

## Subscription system

### Concepts

| Concept | Description |
|--------|-------------|
| **Service** | A payable offering (name, cost, frequency, recipient address). Created once; visible to all users. Stored in backend only. |
| **Subscription** | A user’s commitment to a service. Stored in backend and optionally on-chain (Flow or Sepolia). Has `onChainSubscriptionId` and `onChainContractAddress` when created via the app’s contract flow. |
| **Payment** | A recorded payment for a subscription (amount, tx hash, network). Stored in backend. |

### Frequencies

- **Weekly**, **Monthly**, **Yearly** (on-chain and in backend).

### Flow (public, Flow testnet)

1. User connects wallet (Polkadot Hub TestNet).
2. **Create new service**: name, cost (PAS), frequency, recipient → contract `subscribe(recipient, amountWei, frequency)` → backend `POST /api/subscriptions` with `onChainSubscriptionId` and contract address.
3. **Subscribe to existing service**: pick from “Available services” → same contract + backend flow with `serviceId`.
4. When due: user (or auto-pay) sends PAS via contract `pay(subscriptionId)`; backend records payment.

### Flow (confidential, Sepolia)

1. User connects wallet (Sepolia).
2. App uses `@zama-fhe/relayer-sdk` to encrypt amount and get proof.
3. Contract `subscribe(recipient, encryptedAmountPerCycle, frequency, inputProof)` on `ConfidentialSubscriptionManager`.
4. Backend subscription is created with `onChainContractAddress` = confidential contract.
5. Only the subscriber can decrypt the amount (relayer SDK `userDecrypt`). Payments are `pay(subscriptionId)` with native ETH.

---

## Smart contracts

### 1. SubscriptionManagerFLOW (Polkadot Hub TestNet)

- **Path:** `contracts/contracts/SubscriptionManagerFLOW.sol`
- **Network:** Polkadot Hub TestNet (chain ID 420420417)
- **Payments:** Native PAS (18 decimals). No ERC20.

**Main functions:**

- `subscribe(recipient, amountPerCycle, frequency)` → returns `subscriptionId`
- `pay(subscriptionId)` — payable; sends `msg.value` to recipient, updates `nextDueAt`
- `cancel(subscriptionId)`
- `getSubscription(subscriptionId)`, `getSubscriptionsBySubscriber(subscriber)`, `isPaymentDue(subscriptionId)`

**Events:** `SubscriptionCreated`, `PaymentMade`, `SubscriptionCancelled`

### 2. ConfidentialSubscriptionManager (Sepolia, optional)

- **Path:** `contracts/contracts-sepolia/ConfidentialSubscriptionManager.sol`
- **Network:** Sepolia (chain ID 11155111). Requires Zama FHEVM (relayer, ACL, etc.).
- **Payments:** Native ETH. Amount per cycle is stored as `euint64` (encrypted).

**Main functions:**

- `subscribe(recipient, encryptedAmountPerCycle, frequency, inputProof)` → returns `subscriptionId`
- `pay(subscriptionId)` — payable; forwards `msg.value` to recipient (amount not checked on-chain)
- `cancel(subscriptionId)`
- `getEncryptedAmountPerCycle(subscriptionId)` — for user decryption via relayer SDK
- `getSubscriptionPublic(subscriptionId)`, `getSubscriptionsBySubscriber(subscriber)`, `isPaymentDue(subscriptionId)`

**Dependencies:** `@fhevm/solidity`, `ZamaEthereumConfig`. Built with `hardhat.sepolia.config.ts` (sources: `contracts-sepolia/`).

---

## Backend API

- **Base URL:** `VITE_API_URL` in app (e.g. `http://localhost:5000/api`).

### Subscriptions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/subscriptions/user/:userAddress` | List subscriptions for a user. Query: `?contractAddress=0x...` to filter by contract. |
| GET | `/subscriptions/:id` | Get one subscription. |
| POST | `/subscriptions` | Create subscription (body: serviceId or serviceName, cost, frequency, recipientAddress, userAddress, autoPay, onChainSubscriptionId, onChainContractAddress). |
| PUT | `/subscriptions/:id` | Update subscription. |
| DELETE | `/subscriptions/:id` | Deactivate subscription. |
| PATCH | `/subscriptions/:id/auto-pay` | Toggle auto-pay. |
| POST | `/subscriptions/:id/payments` | Record a payment (amount, transactionHash, network, status). |
| GET | `/subscriptions/:id/payments` | Payment history (?limit=50). |
| POST | `/subscriptions/:id/trigger-payment` | Manually queue auto-pay job. |

### Services

| Method | Path | Description |
|--------|------|-------------|
| GET | `/services` | List all services (for “Available services” in the app). |
| POST | `/services` | Create a service (name, description?, cost, frequency, recipientAddress). |

### Other

- `GET /health` — Database and Redis status.
- `GET /api/statistics/*` — Summary, revenue, success rates, etc.
- `GET /api/jobs/*`, `GET /api/failed-payments/*` — Jobs and failed payments.

### Database (Prisma)

- **Service:** id, name, description, cost, frequency, recipientAddress, isActive.
- **Subscription:** id, serviceId, userAddress, cost, frequency, recipientAddress, nextPaymentDate, isActive, autoPay, onChainSubscriptionId, onChainContractAddress, usageData.
- **Payment:** id, subscriptionId, amount, transactionHash, network, status, errorMessage, timestamp.

Auto-pay uses a Bull queue (Redis). Scheduler checks for due subscriptions and enqueues payment jobs.

---

## Frontend app

- **Stack:** React, Vite, TypeScript, Thirdweb (connect wallet, send tx), Tailwind.
- **Location:** `app/`

**Main flows:**

- **Landing:** “Ankara” branding, “Open app” → main app.
- **Main app:** Header (Ankara, balance, Connect), tabs: Subscriptions | Analytics.
- **Subscriptions:**  
  - **Available services** — list from `GET /api/services`; “Subscribe” opens form pre-filled with that service.  
  - **Create new service** — form (name, cost PAS/ETH, frequency, recipient, auto-pay, optional “Private subscription” for FHE). On submit: contract `subscribe` then `POST /api/subscriptions` with on-chain id and contract address.  
  - **Your subscriptions** — list from `GET /api/subscriptions/user/:address`; pay, cancel, edit, toggle auto-pay.  
  - **Payment history** per subscription.
- **Confidential:** If `VITE_CONFIDENTIAL_SUBSCRIPTION_CONTRACT_ADDRESS` is set, “Private subscription” is shown; uses Sepolia and Zama relayer SDK for encrypt/decrypt.

**Config (app):**

- `app/src/contracts/config.ts`: default contract addresses, Flow testnet chain id, Sepolia chain id.

---

## Environment variables

### App (`app/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL (e.g. `http://localhost:5000/api`). |
| `VITE_SUBSCRIPTION_CONTRACT_ADDRESS` | SubscriptionManagerFLOW on Polkadot Hub TestNet. |
| `VITE_CONFIDENTIAL_SUBSCRIPTION_CONTRACT_ADDRESS` | (Optional) ConfidentialSubscriptionManager on Sepolia. |

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string. |
| `PORT` | Server port (default 5000). |
| `REDIS_URL` | Redis for Bull auto-pay queue. |
| `SUBSCRIPTION_CONTRACT_ADDRESS` | (Optional) Default contract for subscription filtering. |

### Contracts (`contracts/.env`)

| Variable | Description |
|----------|-------------|
| `PRIVATE_KEY` | Deployer wallet private key (with PAS for Polkadot Hub, ETH for Sepolia). |
| `SEPOLIA_RPC_URL` | (Optional) Sepolia RPC for confidential deploy. |

---

## Getting started

### Prerequisites

- Node.js (v18+)
- Yarn
- PostgreSQL database
- Redis (for backend auto-pay)

### 1. Contracts (Flow testnet)

```bash
cd contracts
cp .env.example .env   # or create .env with PRIVATE_KEY
yarn install
yarn compile
yarn deploy:flow
# Set VITE_SUBSCRIPTION_CONTRACT_ADDRESS in app/.env to the deployed address
```

### 2. Backend

```bash
cd backend
yarn install
cp .env.example .env   # set DATABASE_URL, REDIS_URL, etc.
npx prisma migrate deploy
yarn dev
# Runs on http://localhost:5000
```

### 3. App

```bash
cd app
yarn install
cp .env.example .env   # set VITE_API_URL, VITE_SUBSCRIPTION_CONTRACT_ADDRESS
yarn dev
# Open http://localhost:5173
```

### 4. Optional: Confidential (Sepolia)

- Install deps and deploy confidential contract (uses separate Hardhat config and `contracts-sepolia/`):

```bash
cd contracts
yarn install   # includes @fhevm/solidity
yarn deploy:confidential
# Set VITE_CONFIDENTIAL_SUBSCRIPTION_CONTRACT_ADDRESS in app/.env
```

- In the app, use “Private subscription” when creating a subscription; ensure wallet is on Sepolia.

---

## Deployment

### Contracts

- **Polkadot Hub TestNet (public):** `cd contracts && yarn deploy:flow` (default network is `polkadot-testnet`).
- **Sepolia (confidential):** `cd contracts && yarn deploy:confidential` (uses `hardhat.sepolia.config.ts` and `contracts-sepolia/`).

### Backend

- Set `DATABASE_URL`, `REDIS_URL`, `PORT`, and any CORS/origin in production.
- Run migrations: `npx prisma migrate deploy`.
- Start: `yarn start` or your process manager.

### App

- Set `VITE_API_URL` and contract addresses for the target environment.
- Build: `yarn build`. Output in `app/dist`. Deploy to Vercel/Netlify/static host, or serve the built files.

---

## Summary

| Layer | Role |
|-------|------|
| **SubscriptionManagerFLOW** | On-chain subscriptions and native PAS payments on Polkadot Hub TestNet. |
| **ConfidentialSubscriptionManager** | Optional private subscriptions (encrypted amount) on Sepolia via Zama FHEVM. |
| **Backend** | Services catalog, user subscriptions, payment records, auto-pay queue, statistics. |
| **App** | Wallet connect, create/subscribe to services, pay, cancel, view history, AI suggestions; supports both public (Flow) and confidential (Sepolia) subscriptions. |

All services created in the app are available to every connected user via “Available services”; anyone can subscribe to any service and pay on-chain.
