import { BadRequestException } from '@nestjs/common';

import { VALIDATION_FAILED_CODE } from './constants/validation-codes.js';
import { VALIDATION_FAILED_MESSAGE } from './constants/validation-messages.js';

export interface ValidationErrorDetail {
  field?: string;
  code: string;
  message: string;
}

// Matches the ErrorDetail schema in docs/12-openapi.md exactly, so the
// AllExceptionsFilter can pass `details` straight through without re-deriving
// field/code information from class-validator's error shape a second time.
export class ValidationFailedException extends BadRequestException {
  constructor(public readonly details: ValidationErrorDetail[]) {
    super({
      code: VALIDATION_FAILED_CODE,
      message: VALIDATION_FAILED_MESSAGE,
      details,
    });
  }
}
