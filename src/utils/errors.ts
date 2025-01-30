export class AppError extends Error {
    constructor(
      public message: string,
      public statusCode: number,
      public code?: string,
      public details?: any
    ) {
      super(message);
      this.name = 'AppError';
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  export class ValidationError extends AppError {
    constructor(message: string, details?: any) {
      super(message, 400, 'VALIDATION_ERROR', details);
      this.name = 'ValidationError';
    }
  }
  
  export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication failed') {
      super(message, 401, 'AUTHENTICATION_ERROR');
      this.name = 'AuthenticationError';
    }
  }
  
  export class AuthorizationError extends AppError {
    constructor(message: string = 'Access denied') {
      super(message, 403, 'AUTHORIZATION_ERROR');
      this.name = 'AuthorizationError';
    }
  }
  
  export class NotFoundError extends AppError {
    constructor(resource: string) {
      super(`${resource} not found`, 404, 'NOT_FOUND_ERROR');
      this.name = 'NotFoundError';
    }
  }