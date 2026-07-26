import type { VerificationCase } from '../../../trust/domain/entities/verification-case.entity.js';
import type { VerificationStatus } from '../../../trust/domain/enums/verification-status.enum.js';
import type { VerificationSubjectType } from '../../../trust/domain/enums/verification-subject-type.enum.js';
import { DoctorProfessionalDetails } from '../../../trust/domain/value-objects/doctor-professional-details.js';

// Onboarding Redesign integration-gap closure (2026-07-25, Stage O.8): the
// admin-only view of a VerificationCase -- unlike the applicant-facing
// VerificationCaseResponseDto, this one includes documentAssetIds, since an
// admin reviewing a case must be able to see what was actually submitted.
// Never returned from any applicant-facing route.
export class AdminVerificationCaseResponseDto {
  id!: string;
  subjectAccountId!: string;
  subjectType!: VerificationSubjectType;
  licenseNumber?: string;
  specialtyCode?: string;
  status!: VerificationStatus;
  reason?: string;
  submittedAt!: string;
  decidedAt!: string | null;
  documentAssetIds!: string[];

  static fromDomain(verificationCase: VerificationCase): AdminVerificationCaseResponseDto {
    const dto = new AdminVerificationCaseResponseDto();
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
    dto.documentAssetIds = verificationCase.getDocumentAssetIds();
    return dto;
  }
}
