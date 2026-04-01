/**
 * RATE LIMITING
 * 
 * In-memory rate limiting for API endpoints
 * Prevents abuse and brute force attacks
 * 
 * NOTE: This is a simple in-memory implementation
 * For production at scale, use Redis or similar
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limits
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  maxRequests: number;
  interval: number; // in milliseconds
}

export const RATE_LIMITS = {
  // Login attempts: 5 per 15 minutes
  login: {
    maxRequests: 5,
    interval: 15 * 60 * 1000,
  },
  // General API calls: 100 per minute
  api: {
    maxRequests: 100,
    interval: 60 * 1000,
  },
  // Create operations: 20 per minute
  create: {
    maxRequests: 20,
    interval: 60 * 1000,
  },
  // Search operations: 30 per minute
  search: {
    maxRequests: 30,
    interval: 60 * 1000,
  },
} as const;

/**
 * Check if request is rate limited
 * 
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);
  
  // No entry or expired entry
  if (!entry || entry.resetTime < now) {
    const resetTime = now + config.interval;
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime,
    });
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime,
    };
  }
  
  // Entry exists and not expired
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }
  
  // Increment count
  entry.count++;
  rateLimitStore.set(identifier, entry);
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Reset rate limit for an identifier
 * 
 * @param identifier - Unique identifier
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Get rate limit status without incrementing
 * 
 * @param identifier - Unique identifier
 * @param config - Rate limit configuration
 * @returns Current rate limit status
 */
export function getRateLimitStatus(
  identifier: string,
  config: RateLimitConfig
): {
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);
  
  if (!entry || entry.resetTime < now) {
    return {
      remaining: config.maxRequests,
      resetTime: now + config.interval,
    };
  }
  
  return {
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetTime: entry.resetTime,
  };
}

/**
 * Create a rate limiter middleware
 * 
 * @param config - Rate limit configuration
 * @returns Middleware function
 */
export function createRateLimiter(config: RateLimitConfig) {
  return (identifier: string): boolean => {
    const result = checkRateLimit(identifier, config);
    return result.allowed;
  };
}

/**
 * Get client identifier from request
 * Uses IP address or user ID
 * 
 * @param request - Request object
 * @returns Identifier string
 */
export function getClientIdentifier(request: Request): string {
  // Try to get IP from headers
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  
  return ip;
}
