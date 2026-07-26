/**
 * Onboarding Redesign (2026-07-21 proposal, Stage O.2/O.7): matches
 * TrustModule's real, generalized `VerificationCase` shape exactly --
 * `subjectAccountId`/`subjectType`, not the pre-Stage-O.2 `doctorId` this
 * type used to carry. Shared between Doctor Onboarding and Patient Identity
 * Verification (the same aggregate, generalized backend-side in Stage O.2)
 * rather than duplicated per feature.
 */
export type VerificationSubjectType = 'doctor' | 'patient';

/** Matches TrustModule's real 7-value VerificationStatus enum exactly. */
export type VerificationCaseStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'more_info_needed'
  | 're_verification_due'
  | 'suspended';

/** Matches TrustModule's real VerificationCaseResponseDto exactly. `licenseNumber`/`specialtyCode` are present only for subjectType 'doctor'. */
export interface VerificationCase {
  id: string;
  subjectAccountId: string;
  subjectType: VerificationSubjectType;
  licenseNumber?: string;
  specialtyCode?: string;
  status: VerificationCaseStatus;
  /** Set when status is 'rejected' or 'more_info_needed'. */
  reason?: string;
  submittedAt: string;
  decidedAt: string | null;
}

export interface UploadedDocument {
  id: string;
  fileName: string;
}
