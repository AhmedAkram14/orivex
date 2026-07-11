import type { ValidationError } from 'class-validator';

import { mapConstraintToCode } from './validation-code.mapper.js';
import { ValidationFailedException, type ValidationErrorDetail } from './validation-exception.js';

function flatten(errors: ValidationError[], parentPath = ''): ValidationErrorDetail[] {
  const details: ValidationErrorDetail[] = [];

  for (const error of errors) {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;

    if (error.constraints) {
      for (const [constraintKey, message] of Object.entries(error.constraints)) {
        details.push({ field, code: mapConstraintToCode(constraintKey), message });
      }
    }

    if (error.children && error.children.length > 0) {
      details.push(...flatten(error.children, field));
    }
  }

  return details;
}

export function createValidationException(errors: ValidationError[]): ValidationFailedException {
  return new ValidationFailedException(flatten(errors));
}
