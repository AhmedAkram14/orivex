import type { VerificationCase } from '../entities/verification-case.entity.js';
import type { VerificationStatus } from '../enums/verification-status.enum.js';
import type { VerificationSubjectType } from '../enums/verification-subject-type.enum.js';

export interface VerificationCaseRepository {
  findById(id: string): Promise<VerificationCase | null>;
  // Backs the admin review queue (docs/10-backend-architecture.md's
  // AdministrationModule entry), ordered oldest-submitted-first. Optionally
  // scoped to one subject type (Onboarding Redesign, 2026-07-21 proposal,
  // Stage O.2). Onboarding Redesign Stage O.8: also optionally scoped to one
  // exact status -- when omitted, defaults to the original "pending review"
  // set (Submitted/UnderReview/MoreInfoNeeded), preserving the queue's
  // original default view; an explicit status (e.g. Approved) is how an
  // admin finds a case to suspend, since Approved/Suspended/Rejected never
  // appear in the default pending set.
  findPendingReview(subjectType?: VerificationSubjectType, status?: VerificationStatus): Promise<VerificationCase[]>;
  // Every case a given subject has ever submitted (resubmission after
  // rejection creates a new row, never mutates the old one), ordered
  // most-recently-submitted-first -- backs both the applicant's own status
  // view and the admin's "verification history" view. Generalized (Stage
  // O.2) from the former Doctor-only findAllByDoctorId.
  findAllBySubject(subjectType: VerificationSubjectType, subjectAccountId: string): Promise<VerificationCase[]>;
  save(verificationCase: VerificationCase): Promise<void>;
}
