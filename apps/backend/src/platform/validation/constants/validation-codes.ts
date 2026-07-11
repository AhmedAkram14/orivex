export const VALIDATION_FAILED_CODE = 'VALIDATION_FAILED';

// Fallback code for any class-validator constraint not yet listed below.
// Deliberately a fixed, generic code — never derived from the constraint's
// raw name, since that would leak validation-library internals into the API.
export const UNMAPPED_CONSTRAINT_CODE = 'INVALID_VALUE';

// Maps class-validator constraint keys to stable, library-independent API
// error codes (docs/12-openapi.md's ErrorDetail.code). This is the one place
// that couples to class-validator's naming — add new entries here as new
// validators are adopted, so the API contract never has to change if the
// validation library itself is ever swapped out.
export const VALIDATION_CONSTRAINT_CODE_MAP: Readonly<Record<string, string>> = {
  isEmail: 'INVALID_EMAIL',
  isNotEmpty: 'REQUIRED_FIELD',
  isDefined: 'REQUIRED_FIELD',
  isString: 'INVALID_TYPE',
  isNumber: 'INVALID_TYPE',
  isBoolean: 'INVALID_TYPE',
  isInt: 'INVALID_TYPE',
  isArray: 'INVALID_TYPE',
  isDate: 'INVALID_DATE',
  isUuid: 'INVALID_UUID',
  isEnum: 'INVALID_ENUM_VALUE',
  minLength: 'MIN_LENGTH',
  maxLength: 'MAX_LENGTH',
  min: 'MIN_VALUE',
  max: 'MAX_VALUE',
  matches: 'INVALID_FORMAT',
};
