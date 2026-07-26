import { ReferenceDomainError } from './reference-domain.error.js';

// Thrown when the database's own unique constraint on MedicalSpecialty.name
// rejects a concurrent duplicate that raced past the application-layer
// check-then-act guard -- same precedent as AccountAlreadyExistsError.
export class MedicalSpecialtyAlreadyExistsError extends ReferenceDomainError {
  constructor(name: string) {
    super(`A medical specialty named "${name}" already exists.`);
  }
}
