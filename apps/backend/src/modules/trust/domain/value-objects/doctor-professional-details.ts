import { DoctorVerifiedEvent } from '../events/doctor-verified.event.js';
import { TrustDomainError } from '../exceptions/trust-domain.error.js';
import { VerificationSubjectType } from '../enums/verification-subject-type.enum.js';

import type { VerificationSubjectDetails } from './verification-subject-details.js';

// The Doctor-specific data a professional-credential verification needs —
// license number and specialty. Patient identity verification has no
// equivalent (see PatientIdentityDetails) -- this is exactly the
// subject-specific data the shared VerificationCase aggregate never sees
// directly (Onboarding Redesign, 2026-07-21 proposal, Stage O.2).
export class DoctorProfessionalDetails implements VerificationSubjectDetails {
  private constructor(
    private readonly licenseNumber: string,
    private readonly specialtyCode: string,
  ) {}

  static create(licenseNumber: string, specialtyCode: string): DoctorProfessionalDetails {
    if (!licenseNumber || licenseNumber.trim().length === 0) {
      throw new TrustDomainError('licenseNumber must not be empty.');
    }
    if (!specialtyCode || specialtyCode.trim().length === 0) {
      throw new TrustDomainError('specialtyCode must not be empty.');
    }
    return new DoctorProfessionalDetails(licenseNumber.trim(), specialtyCode.trim());
  }

  getSubjectType(): VerificationSubjectType {
    return VerificationSubjectType.Doctor;
  }

  getApprovalEvent(subjectAccountId: string, verificationCaseId: string): DoctorVerifiedEvent {
    return new DoctorVerifiedEvent(subjectAccountId, verificationCaseId);
  }

  getLicenseNumber(): string {
    return this.licenseNumber;
  }

  getSpecialtyCode(): string {
    return this.specialtyCode;
  }
}
