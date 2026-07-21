import type { VerificationCase } from '../entities/verification-case.entity.js';

export interface VerificationCaseRepository {
  findById(id: string): Promise<VerificationCase | null>;
  // Cases awaiting an admin decision (Submitted, UnderReview, MoreInfoNeeded)
  // — backs the review queue (docs/10-backend-architecture.md's
  // AdministrationModule entry), ordered oldest-submitted-first.
  findPendingReview(): Promise<VerificationCase[]>;
  // Doctor Onboarding (Phase 4 continuation): every case a doctor has ever
  // submitted (resubmission after rejection creates a new row, never
  // mutates the old one), ordered most-recently-submitted-first -- backs
  // the applicant's own status view.
  findAllByDoctorId(doctorId: string): Promise<VerificationCase[]>;
  save(verificationCase: VerificationCase): Promise<void>;
}
