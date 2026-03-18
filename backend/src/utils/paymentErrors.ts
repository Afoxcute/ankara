/**
 * Payment Error Categorization and Handling
 */

export enum ErrorCategory {
  RETRYABLE = 'retryable',           // Can be retried (network, temporary issues)
  NON_RETRYABLE = 'non_retryable',   // Should not be retried (invalid data, auth)
  INSUFFICIENT_FUNDS = 'insufficient_funds', // User needs to add funds
  NETWORK_ERROR = 'network_error',   // Network/connection issues
  TIMEOUT = 'timeout',               // Request timeout
  RATE_LIMIT = 'rate_limit',         // Rate limiting
  INVALID_SUBSCRIPTION = 'invalid_subscription', // Subscription issues
  WALLET_ERROR = 'wallet_error',     // Wallet-related errors
}

export interface CategorizedError {
  category: ErrorCategory;
  message: string;
  originalError: Error;
  retryable: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Categorize payment errors for appropriate handling
 */
export function categorizePaymentError(error: Error | string): CategorizedError {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorObj = typeof error === 'string' ? new Error(error) : error;
  const lowerMessage = errorMessage.toLowerCase();

  // Network errors (retryable)
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('econnrefused') ||
    lowerMessage.includes('etimedout') ||
    lowerMessage.includes('enotfound') ||
    lowerMessage.includes('socket')
  ) {
    return {
      category: ErrorCategory.NETWORK_ERROR,
      message: errorMessage,
      originalError: errorObj,
      retryable: true,
      maxRetries: 5,
      retryDelay: 5000, // 5 seconds
    };
  }

  // Timeout errors (retryable)
  if (
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('timed out') ||
    lowerMessage.includes('deadline exceeded')
  ) {
    return {
      category: ErrorCategory.TIMEOUT,
      message: errorMessage,
      originalError: errorObj,
      retryable: true,
      maxRetries: 3,
      retryDelay: 10000, // 10 seconds
    };
  }

  // Rate limiting (retryable with longer delay)
  if (
    lowerMessage.includes('rate limit') ||
    lowerMessage.includes('too many requests') ||
    lowerMessage.includes('429')
  ) {
    return {
      category: ErrorCategory.RATE_LIMIT,
      message: errorMessage,
      originalError: errorObj,
      retryable: true,
      maxRetries: 3,
      retryDelay: 60000, // 1 minute
    };
  }

  // Insufficient funds (non-retryable, user action needed)
  if (
    lowerMessage.includes('insufficient') ||
    lowerMessage.includes('balance') ||
    lowerMessage.includes('funds') ||
    lowerMessage.includes('not enough')
  ) {
    return {
      category: ErrorCategory.INSUFFICIENT_FUNDS,
      message: errorMessage,
      originalError: errorObj,
      retryable: false,
    };
  }

  // Wallet errors (non-retryable)
  if (
    lowerMessage.includes('wallet') ||
    lowerMessage.includes('signature') ||
    lowerMessage.includes('private key') ||
    lowerMessage.includes('authentication') ||
    lowerMessage.includes('unauthorized')
  ) {
    return {
      category: ErrorCategory.WALLET_ERROR,
      message: errorMessage,
      originalError: errorObj,
      retryable: false,
    };
  }

  // Invalid subscription (non-retryable)
  if (
    lowerMessage.includes('subscription not found') ||
    lowerMessage.includes('subscription is not active') ||
    lowerMessage.includes('auto-pay is disabled') ||
    lowerMessage.includes('payment is not due')
  ) {
    return {
      category: ErrorCategory.INVALID_SUBSCRIPTION,
      message: errorMessage,
      originalError: errorObj,
      retryable: false,
    };
  }

  // Server errors (5xx) - retryable
  if (
    lowerMessage.includes('500') ||
    lowerMessage.includes('502') ||
    lowerMessage.includes('503') ||
    lowerMessage.includes('504') ||
    lowerMessage.includes('internal server error') ||
    lowerMessage.includes('bad gateway') ||
    lowerMessage.includes('service unavailable')
  ) {
    return {
      category: ErrorCategory.RETRYABLE,
      message: errorMessage,
      originalError: errorObj,
      retryable: true,
      maxRetries: 3,
      retryDelay: 5000,
    };
  }

  // Client errors (4xx) - generally non-retryable
  if (
    lowerMessage.includes('400') ||
    lowerMessage.includes('401') ||
    lowerMessage.includes('403') ||
    lowerMessage.includes('404') ||
    lowerMessage.includes('bad request') ||
    lowerMessage.includes('forbidden') ||
    lowerMessage.includes('not found')
  ) {
    return {
      category: ErrorCategory.NON_RETRYABLE,
      message: errorMessage,
      originalError: errorObj,
      retryable: false,
    };
  }

  // Default: treat as retryable with conservative settings
  return {
    category: ErrorCategory.RETRYABLE,
    message: errorMessage,
    originalError: errorObj,
    retryable: true,
    maxRetries: 2,
    retryDelay: 5000,
  };
}

/**
 * Check if error should be retried
 */
export function shouldRetry(error: CategorizedError, attemptNumber: number): boolean {
  if (!error.retryable) {
    return false;
  }

  if (error.maxRetries && attemptNumber >= error.maxRetries) {
    return false;
  }

  return true;
}

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(
  error: CategorizedError,
  attemptNumber: number,
  baseDelay?: number
): number {
  const delay = error.retryDelay || baseDelay || 2000;
  
  // Exponential backoff: delay * 2^(attemptNumber - 1)
  const exponentialDelay = delay * Math.pow(2, attemptNumber - 1);
  
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * exponentialDelay; // Up to 30% jitter
  
  return Math.floor(exponentialDelay + jitter);
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: CategorizedError): string {
  switch (error.category) {
    case ErrorCategory.INSUFFICIENT_FUNDS:
      return 'Insufficient funds. Please add funds to your wallet and try again.';
    case ErrorCategory.WALLET_ERROR:
      return 'Wallet authentication failed. Please reconnect your wallet.';
    case ErrorCategory.INVALID_SUBSCRIPTION:
      return 'Subscription is not valid or active.';
    case ErrorCategory.NETWORK_ERROR:
      return 'Network error. Please check your connection and try again.';
    case ErrorCategory.TIMEOUT:
      return 'Request timed out. Please try again.';
    case ErrorCategory.RATE_LIMIT:
      return 'Too many requests. Please wait a moment and try again.';
    default:
      return error.message || 'An error occurred processing your payment.';
  }
}





