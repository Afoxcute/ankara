# Database Setup Guide

This guide will help you set up PostgreSQL database for the subscription management system.

## Prerequisites

1. PostgreSQL installed and running
2. Node.js and yarn installed

## Setup Steps

### 1. Install Dependencies

```bash
cd backend
yarn install
```

### 2. Configure Database Connection

Create a `.env` file in the `backend` directory:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/subscriptions?schema=public"
PORT=5000
```

Replace `username`, `password`, and `localhost:5432` with your PostgreSQL credentials.

### 3. Create Database

Create a new PostgreSQL database:

```sql
CREATE DATABASE subscriptions;
```

Or using psql command line:

```bash
psql -U postgres -c "CREATE DATABASE subscriptions;"
```

### 4. Run Prisma Migrations

Generate Prisma Client and run migrations:

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

This will:
- Generate the Prisma Client
- Create the database tables (services, subscriptions, payments)
- Set up the schema

### 5. (Optional) View Database with Prisma Studio

```bash
npx prisma studio
```

This opens a web interface at `http://localhost:5555` to view and edit your database.

## Database Schema

The database includes three main tables:

### Services
- Represents payable services that users can subscribe to
- Fields: id, name, description, cost, frequency, recipientAddress

### Subscriptions
- User subscriptions to services
- Fields: id, serviceId, userAddress, cost, frequency, recipientAddress, lastPaymentDate, nextPaymentDate, autoPay, usageData

### Payments
- Records of payments made for subscriptions
- Fields: id, subscriptionId, amount, transactionHash, network, status, timestamp

## API Endpoints

Once the database is set up, the following endpoints are available:

### Subscriptions
- `GET /api/subscriptions/user/:userAddress` - Get all subscriptions for a user
- `GET /api/subscriptions/:id` - Get a single subscription
- `POST /api/subscriptions` - Create a new subscription
- `PUT /api/subscriptions/:id` - Update a subscription
- `DELETE /api/subscriptions/:id` - Delete a subscription
- `PATCH /api/subscriptions/:id/auto-pay` - Toggle auto-pay
- `POST /api/subscriptions/:id/payments` - Record a payment
- `GET /api/subscriptions/:id/payments` - Get payment history

### Services
- `GET /api/services` - Get all services
- `POST /api/services` - Create a new service

## Frontend Configuration

Update your frontend `.env` file to point to the backend API:

```env
VITE_API_URL=http://localhost:5000/api
```

## Troubleshooting

### Connection Issues

If you get connection errors:
1. Verify PostgreSQL is running: `pg_isready`
2. Check your DATABASE_URL format
3. Ensure the database exists
4. Verify user permissions

### Migration Issues

If migrations fail:
1. Check if tables already exist
2. Try resetting: `npx prisma migrate reset` (WARNING: This deletes all data)
3. Check Prisma schema syntax

### Port Conflicts

If port 5000 is in use, change the PORT in `.env` file.






















