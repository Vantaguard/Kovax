/**
 * ERROR HANDLING UTILITIES
 * 
 * Centralized error handling for the application
 * Never expose raw database errors to the client
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public errors: Record<string, string[]>
  ) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 'DATABASE_ERROR', 500);
    this.name = 'DatabaseError';
  }
}

/**
 * Sanitize database errors - never expose raw DB errors
 */
export function sanitizeError(error: unknown): AppError {
  // If it's already an AppError, return it
  if (error instanceof AppError) {
    return error;
  }

  // Log the original error for debugging
  console.error('Sanitized error:', error);

  // Return a generic error
  return new DatabaseError('An error occurred while processing your request');
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: unknown) {
  const sanitized = sanitizeError(error);

  return {
    error: {
      message: sanitized.message,
      code: sanitized.code,
      ...(sanitized instanceof ValidationError && { errors: sanitized.errors }),
    },
  };
}
