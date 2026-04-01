/**
 * SECURITY MIDDLEWARE
 * 
 * Wrapper for applying security measures to API routes
 * Includes rate limiting, input sanitization, and error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from './rate-limit';
import { sanitizeInput } from './sanitize';

export interface SecurityConfig {
  rateLimit?: {
    maxRequests: number;
    interval: number;
  };
  sanitizeInputs?: boolean;
}

/**
 * Apply security middleware to API route handler
 * 
 * @param handler - API route handler function
 * @param config - Security configuration
 * @returns Wrapped handler with security measures
 */
export function withSecurity(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config: SecurityConfig = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Apply rate limiting if configured
      if (config.rateLimit) {
        const identifier = getClientIdentifier(req);
        const rateLimitResult = checkRateLimit(identifier, config.rateLimit);
        
        if (!rateLimitResult.allowed) {
          return NextResponse.json(
            {
              error: {
                message: 'Too many requests. Please try again later.',
                code: 'RATE_LIMIT_EXCEEDED',
                resetTime: rateLimitResult.resetTime,
              },
            },
            { status: 429 }
          );
        }
        
        // Add rate limit headers
        const response = await handler(req);
        response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
        response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
        return response;
      }
      
      // No rate limiting, just call handler
      return await handler(req);
    } catch (error) {
      console.error('Security middleware error:', error);
      return NextResponse.json(
        {
          error: {
            message: 'An error occurred while processing your request',
            code: 'INTERNAL_ERROR',
          },
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Sanitize request body
 * 
 * @param body - Request body object
 * @returns Sanitized body
 */
export function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }
  
  const sanitized: any = {};
  
  for (const key in body) {
    const value = body[key];
    
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeInput(item) : item
      );
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeRequestBody(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Create API error response
 * 
 * @param message - Error message
 * @param code - Error code
 * @param status - HTTP status code
 * @returns NextResponse with error
 */
export function createErrorResponse(
  message: string,
  code: string,
  status: number = 500
): NextResponse {
  return NextResponse.json(
    {
      error: {
        message,
        code,
      },
    },
    { status }
  );
}

/**
 * Create success response
 * 
 * @param data - Response data
 * @param status - HTTP status code
 * @returns NextResponse with data
 */
export function createSuccessResponse(
  data: any,
  status: number = 200
): NextResponse {
  return NextResponse.json(data, { status });
}
