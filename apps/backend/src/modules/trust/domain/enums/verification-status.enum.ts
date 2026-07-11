// Matches docs/12-openapi.md's VerificationCase.status enum exactly.
export enum VerificationStatus {
  Submitted = 'submitted',
  UnderReview = 'under_review',
  Approved = 'approved',
  Rejected = 'rejected',
  MoreInfoNeeded = 'more_info_needed',
  ReVerificationDue = 're_verification_due',
  Suspended = 'suspended',
}
