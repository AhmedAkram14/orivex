import { PatientDomainError } from './patient-domain.error.js';

// Thrown when a caller-supplied insuranceProviderId doesn't exist -- caught
// via the database's own FK constraint on PatientProfile.insuranceProviderId
// (P2003), not a second cross-module existence query (PatientModule
// deliberately does not import ReferenceModule).
export class InsuranceProviderNotFoundError extends PatientDomainError {
  constructor(insuranceProviderId: string) {
    super(`Insurance provider "${insuranceProviderId}" not found.`);
  }
}
