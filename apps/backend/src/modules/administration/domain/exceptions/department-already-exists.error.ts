import { AdministrationDomainError } from './administration-domain.error.js';

// Thrown when the database's own unique constraint on
// (Department.hospitalId, Department.name) rejects a concurrent duplicate
// that raced past the application-layer check-then-act guard — same
// precedent as AccountAlreadyExistsError.
export class DepartmentAlreadyExistsError extends AdministrationDomainError {
  constructor(hospitalId: string, name: string) {
    super(`A department named "${name}" already exists for hospital "${hospitalId}".`);
  }
}
