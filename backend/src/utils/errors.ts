export class AppError extends Error {
  constructor(public message: string, public statusCode: number = 500) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public details?: Array<{ field: string; message: string }>
  ) {
    super(message);
  }
}

export class UnauthorizedError extends AppError {}
export class ForbiddenError extends AppError {}
export class NotFoundError extends AppError {}
export class ConflictError extends AppError {}
export class BusinessRuleViolationError extends AppError {}
export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}
