import { DoctorDomainError } from './doctor-domain.error.js';

// Thrown when a caller-supplied specialtyId doesn't exist -- caught via the
// database's own FK constraint on DoctorProfile.specialtyId (P2003), not a
// second cross-module existence query (DoctorModule deliberately doesn't
// import ReferenceModule).
export class MedicalSpecialtyNotFoundError extends DoctorDomainError {
  constructor(specialtyId: string) {
    super(`Medical specialty "${specialtyId}" not found.`);
  }
}
