# Statistics API Documentation

## Overview

Enhanced receipt storage and statistics system providing comprehensive analytics and reporting for the subscription payment system.

## Features

- ✅ Revenue statistics by service
- ✅ Payment success/failure rates
- ✅ Service breakdown analytics
- ✅ Payer-specific receipt queries
- ✅ Recent receipts API
- ✅ Overall statistics summary

## API Endpoints

### 1. Statistics Summary

Get overall statistics summary with key metrics.

**Endpoint:** `GET /api/statistics/summary`

**Query Parameters:**
- `startDate` (optional): ISO date string - Filter from this date
- `endDate` (optional): ISO date string - Filter until this date

**Example:**
```bash
GET /api/statistics/summary?startDate=2024-01-01&endDate=2024-12-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalPayments": 150,
    "completedPayments": 145,
    "failedPayments": 5,
    "successRate": 96.67,
    "totalRevenue": 1450.50,
    "averagePaymentAmount": 10.00,
    "activeServices": 5,
    "uniquePayers": 25,
    "period": {
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-12-31T23:59:59.999Z"
    }
  }
}
```

### 2. Revenue by Service

Get revenue statistics grouped by service.

**Endpoint:** `GET /api/statistics/revenue-by-service`

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Example:**
```bash
GET /api/statistics/revenue-by-service?startDate=2024-01-01
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "serviceId": "svc_123",
      "serviceName": "Premium API",
      "totalRevenue": 500.00,
      "paymentCount": 50,
      "averageAmount": 10.00
    },
    {
      "serviceId": "svc_456",
      "serviceName": "Basic Plan",
      "totalRevenue": 300.00,
      "paymentCount": 30,
      "averageAmount": 10.00
    }
  ]
}
```

### 3. Payment Success Rates

Get payment success/failure rates and breakdown.

**Endpoint:** `GET /api/statistics/success-rates`

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Example:**
```bash
GET /api/statistics/success-rates
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "completed": 145,
    "failed": 5,
    "pending": 0,
    "successRate": 96.67,
    "failureRate": 3.33,
    "breakdown": [
      {
        "status": "completed",
        "count": 145,
        "percentage": 96.67
      },
      {
        "status": "failed",
        "count": 5,
        "percentage": 3.33
      }
    ]
  }
}
```

### 4. Service Breakdown Analytics

Get detailed analytics breakdown by service.

**Endpoint:** `GET /api/statistics/service-breakdown`

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Example:**
```bash
GET /api/statistics/service-breakdown?startDate=2024-01-01
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "serviceId": "svc_123",
      "serviceName": "Premium API",
      "totalRevenue": 500.00,
      "paymentCount": 50,
      "averageAmount": 10.00,
      "minAmount": 5.00,
      "maxAmount": 20.00,
      "uniquePayers": 25,
      "frequencyBreakdown": {
        "monthly": 40,
        "weekly": 10
      }
    }
  ]
}
```

### 5. Recent Receipts

Get recent receipts across all subscriptions.

**Endpoint:** `GET /api/statistics/receipts/recent`

**Query Parameters:**
- `limit` (optional): Number of receipts to return (default: 50)
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `status` (optional): Filter by status (completed, failed, pending)
- `serviceId` (optional): Filter by service ID
- `userAddress` (optional): Filter by payer address

**Example:**
```bash
GET /api/statistics/receipts/recent?limit=20&status=completed
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "pay_123",
      "amount": 10.00,
      "transactionHash": "0x...",
      "network": "polkadot-testnet",
      "status": "completed",
      "errorMessage": null,
      "timestamp": "2024-01-15T10:30:00.000Z",
      "payer": {
        "address": "0x1234..."
      },
      "service": {
        "id": "svc_123",
        "name": "Premium API"
      },
      "subscription": {
        "id": "sub_123",
        "frequency": "monthly"
      }
    }
  ]
}
```

### 6. Payer-Specific Receipts

Get receipts for a specific payer.

**Endpoint:** `GET /api/statistics/receipts/payer/:userAddress`

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `status` (optional): Filter by status
- `serviceId` (optional): Filter by service ID
- `limit` (optional): Number of receipts to return (default: 100)

**Example:**
```bash
GET /api/statistics/receipts/payer/0x1234...?limit=50&status=completed
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payer": "0x1234...",
    "totalReceipts": 25,
    "totalAmount": 250.00,
    "completedCount": 24,
    "failedCount": 1,
    "receipts": [
      {
        "id": "pay_123",
        "amount": 10.00,
        "transactionHash": "0x...",
        "network": "polkadot-testnet",
        "status": "completed",
        "errorMessage": null,
        "timestamp": "2024-01-15T10:30:00.000Z",
        "service": {
          "id": "svc_123",
          "name": "Premium API"
        },
        "subscription": {
          "id": "sub_123",
          "frequency": "monthly"
        }
      }
    ]
  }
}
```

## Usage Examples

### Get Monthly Revenue Report

```bash
# Get revenue for January 2024
curl "http://localhost:5000/api/statistics/revenue-by-service?startDate=2024-01-01&endDate=2024-01-31"
```

### Get Payment Success Rate for Last 30 Days

```javascript
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const response = await fetch(
  `/api/statistics/success-rates?startDate=${thirtyDaysAgo.toISOString()}`
);
const data = await response.json();
console.log(`Success Rate: ${data.data.successRate}%`);
```

### Get User's Payment History

```javascript
const userAddress = '0x1234...';
const response = await fetch(
  `/api/statistics/receipts/payer/${userAddress}?limit=100`
);
const data = await response.json();
console.log(`Total Payments: ${data.data.totalReceipts}`);
console.log(`Total Amount: $${data.data.totalAmount}`);
```

### Get Recent Completed Payments

```bash
curl "http://localhost:5000/api/statistics/receipts/recent?limit=10&status=completed"
```

## Data Structure

### Payment Status Values
- `completed`: Payment successfully processed
- `failed`: Payment failed
- `pending`: Payment is pending processing

### Date Filtering
All date parameters accept ISO 8601 format:
- `2024-01-01` (date only)
- `2024-01-01T00:00:00.000Z` (with time)

### Amount Format
All amounts are returned as numbers (USDC with 6 decimals).

## Performance Considerations

- Statistics queries are optimized with database indexes
- Date filtering is recommended for large datasets
- Use `limit` parameter to control result size
- Consider caching statistics for frequently accessed data

## Error Handling

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad request (invalid parameters)
- `500`: Internal server error

## Integration Notes

- All endpoints support CORS
- Responses are JSON formatted
- Date parameters are timezone-aware (UTC)
- Empty result sets return empty arrays `[]`





