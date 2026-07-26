import { DoctorDomainError } from './doctor-domain.error.js';

// Thrown when a caller-supplied departmentId doesn't exist -- caught via the
// database's own FK constraint on DoctorProfile.departmentId (P2003), not a
// second cross-module existence query (DoctorModule deliberately doesn't
// import AdministrationModule, which owns Department).
export class DepartmentNotFoundError extends DoctorDomainError {
  constructor(departmentId: string) {
    super(`Department "${departmentId}" not found.`);
  }
}
