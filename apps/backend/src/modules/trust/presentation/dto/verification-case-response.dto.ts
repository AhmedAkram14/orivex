import type { VerificationCase } from '../../domain/entities/verification-case.entity.js';
import type { VerificationStatus } from '../../domain/enums/verification-status.enum.js';

// Matches docs/12-openapi.md's VerificationCase schema exactly.
// documentAssetIds/licenseNumber/specialtyCode/reason are deliberately
// excluded — not part of the documented response shape.
export class VerificationCaseResponseDto {
  id!: string;
  doctorId!: string;
  status!: VerificationStatus;
  submittedAt!: string;
  decidedAt!: string | null;

  static fromDomain(verificationCase: VerificationCase): VerificationCaseResponseDto {
    const dto = new VerificationCaseResponseDto();
    dto.id = verificationCase.getId();
    dto.doctorId = verificationCase.getDoctorId();
    dto.status = verificationCase.getStatus();
    dto.submittedAt = verificationCase.getSubmittedAt().toISOString();
    dto.decidedAt = verificationCase.getDecidedAt()?.toISOString() ?? null;
    return dto;
  }
}
