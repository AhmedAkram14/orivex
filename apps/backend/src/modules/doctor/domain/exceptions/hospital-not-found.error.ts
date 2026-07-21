import { DoctorDomainError } from './doctor-domain.error.js';

// Thrown when a caller-supplied hospitalId doesn't exist -- caught via the
// database's own FK constraint on DoctorProfile.hospitalId (P2003), not a
// second cross-module existence query (DoctorModule deliberately doesn't
// import AdministrationModule, which owns Hospital).
export class HospitalNotFoundError extends DoctorDomainError {
  constructor(hospitalId: string) {
    super(`Hospital "${hospitalId}" not found.`);
  }
}
