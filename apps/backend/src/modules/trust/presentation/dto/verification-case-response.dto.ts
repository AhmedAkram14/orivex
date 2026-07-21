import type { VerificationCase } from '../../domain/entities/verification-case.entity.js';
import type { VerificationStatus } from '../../domain/enums/verification-status.enum.js';

// Matches docs/12-openapi.md's VerificationCase schema, plus `reason`
// (Doctor Onboarding, Phase 4 continuation: an applicant needs their own
// rejection/more-info reason surfaced back to them -- docs/12-openapi.md's
// schema predates this requirement and should be updated to match).
// documentAssetIds/licenseNumber/specialtyCode remain deliberately excluded
// — internal submission detail, not part of the applicant's status view.
export class VerificationCaseResponseDto {
  id!: string;
  doctorId!: string;
  status!: VerificationStatus;
  reason?: string;
  submittedAt!: string;
  decidedAt!: string | null;

  static fromDomain(verificationCase: VerificationCase): VerificationCaseResponseDto {
    const dto = new VerificationCaseResponseDto();
    dto.id = verificationCase.getId();
    dto.doctorId = verificationCase.getDoctorId();
    dto.status = verificationCase.getStatus();
    dto.reason = verificationCase.getReason();
    dto.submittedAt = verificationCase.getSubmittedAt().toISOString();
    dto.decidedAt = verificationCase.getDecidedAt()?.toISOString() ?? null;
    return dto;
  }
}
