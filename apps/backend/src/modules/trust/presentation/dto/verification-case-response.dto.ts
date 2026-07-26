import type { VerificationCase } from '../../domain/entities/verification-case.entity.js';
import type { VerificationStatus } from '../../domain/enums/verification-status.enum.js';
import type { VerificationSubjectType } from '../../domain/enums/verification-subject-type.enum.js';
import { DoctorProfessionalDetails } from '../../domain/value-objects/doctor-professional-details.js';

// Matches docs/12-openapi.md's VerificationCase schema, plus `reason`
// (Doctor Onboarding, Phase 4 continuation: an applicant needs their own
// rejection/more-info reason surfaced back to them). Onboarding Redesign
// (2026-07-21 proposal, Stage O.2): doctorId replaced by subjectAccountId/
// subjectType (uniform across Doctor and Patient cases); licenseNumber/
// specialtyCode are now optional, present only for subjectType='doctor'.
// documentAssetIds remains deliberately excluded — internal submission
// detail, not part of the applicant's status view.
export class VerificationCaseResponseDto {
  id!: string;
  subjectAccountId!: string;
  subjectType!: VerificationSubjectType;
  licenseNumber?: string;
  specialtyCode?: string;
  status!: VerificationStatus;
  reason?: string;
  submittedAt!: string;
  decidedAt!: string | null;

  static fromDomain(verificationCase: VerificationCase): VerificationCaseResponseDto {
    const dto = new VerificationCaseResponseDto();
    const subjectDetails = verificationCase.getSubjectDetails();

    dto.id = verificationCase.getId();
    dto.subjectAccountId = verificationCase.getSubjectAccountId();
    dto.subjectType = verificationCase.getSubjectType();
    if (subjectDetails instanceof DoctorProfessionalDetails) {
      dto.licenseNumber = subjectDetails.getLicenseNumber();
      dto.specialtyCode = subjectDetails.getSpecialtyCode();
    }
    dto.status = verificationCase.getStatus();
    dto.reason = verificationCase.getReason();
    dto.submittedAt = verificationCase.getSubmittedAt().toISOString();
    dto.decidedAt = verificationCase.getDecidedAt()?.toISOString() ?? null;
    return dto;
  }
}
