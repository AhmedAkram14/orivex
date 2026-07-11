export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
}

export class NotFoundError extends AppError {
  readonly code = 'NOT_FOUND';
  readonly httpStatus = 404;
}

export class ValidationError extends AppError {
  readonly code = 'VALIDATION_FAILED';
  readonly httpStatus = 422;
}

export class ForbiddenError extends AppError {
  readonly code = 'FORBIDDEN';
  readonly httpStatus = 403;
}

export class ConflictError extends AppError {
  readonly code = 'CONFLICT';
  readonly httpStatus = 409;
}

// Sprint 9: docs/12-openapi.md documents '402' for initiateCharge's payment-
// declined case specifically -- a distinct status from the generic 422
// ValidationError used elsewhere.
export class PaymentRequiredError extends AppError {
  readonly code = 'PAYMENT_REQUIRED';
  readonly httpStatus = 402;
}
