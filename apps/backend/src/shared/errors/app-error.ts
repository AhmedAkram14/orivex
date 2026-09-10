export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
}

export class NotFoundError extends AppError {
  readonly code = 'NOT_FOUND';
  readonly httpStatus = 404;
}

// code is overridable (default 'VALIDATION_FAILED'), same pattern as
// ForbiddenError/UnauthorizedError below -- lets a specific module surface a
// stable, frontend-recognized business-rule code (e.g. I8's
// 'FREE_TIER_CAP_EXCEEDED', per docs/11-api-contracts.md §7's "Business
// Rule Error" category) without a proliferation of near-identical 422
// subclasses -- every other call site continues passing just a message.
export class ValidationError extends AppError {
  readonly code: string;
  readonly httpStatus = 422;

  constructor(message: string, code = 'VALIDATION_FAILED') {
    super(message);
    this.code = code;
  }
}

// code is overridable (default 'FORBIDDEN') so AuthenticationModule's
// exception mapper can surface a specific, frontend-recognized code (e.g.
// 'EMAIL_NOT_VERIFIED') without a proliferation of near-identical 403
// subclasses -- every other call site continues passing just a message.
export class ForbiddenError extends AppError {
  readonly code: string;
  readonly httpStatus = 403;

  constructor(message: string, code = 'FORBIDDEN') {
    super(message);
    this.code = code;
  }
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

// Sprint 15: AuthenticationModule. code is overridable (default
// 'UNAUTHORIZED') for the same reason as ForbiddenError above -- specific
// codes (INVALID_CREDENTIALS, ACCOUNT_LOCKED, TOKEN_INVALID, TOKEN_EXPIRED)
// the frontend branches on, without one subclass per code.
export class UnauthorizedError extends AppError {
  readonly code: string;
  readonly httpStatus = 401;

  constructor(message: string, code = 'UNAUTHORIZED') {
    super(message);
    this.code = code;
  }
}
