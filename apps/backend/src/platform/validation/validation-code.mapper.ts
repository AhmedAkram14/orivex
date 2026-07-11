import { UNMAPPED_CONSTRAINT_CODE, VALIDATION_CONSTRAINT_CODE_MAP } from './constants/validation-codes.js';

// Translation boundary between class-validator's internal constraint names
// (e.g. "isEmail") and this API's stable error codes (e.g. "INVALID_EMAIL").
// Swapping the validation library later only requires changes here — no
// other file should ever read a raw constraint name directly.
export function mapConstraintToCode(constraintKey: string): string {
  return VALIDATION_CONSTRAINT_CODE_MAP[constraintKey] ?? UNMAPPED_CONSTRAINT_CODE;
}
