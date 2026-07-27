import { randomUUID } from 'node:crypto';

import { ConsultationDomainError } from '../exceptions/consultation-domain.error.js';

export interface RecommendFollowUpProps {
  consultationSessionId: string;
  authoringDoctorId: string;
  reason: string;
  recommendedDate?: Date;
}

export interface ReconstituteFollowUpRecommendationProps {
  id: string;
  consultationSessionId: string;
  authoringDoctorId: string;
  reason: string;
  recommendedDate?: Date;
  createdAt: Date;
}

// Consultation lifecycle completion follow-up (2026-07-26): deliberately
// the smallest real capability that lets a doctor's follow-up
// recommendation survive consultation completion and reach the patient --
// NOT a second booking system. The patient books the actual follow-up
// appointment through the existing real booking flow (GET /doctors ->
// POST /appointments); this only carries the doctor's own recommendation
// (a suggested date + reason) for the patient to see and act on. One per
// ConsultationSession (unique index), immutable once recorded -- no
// edit/delete use case exists, matching ConsultationFeedback's own
// immutability precedent.
export class FollowUpRecommendation {
  private constructor(
    private readonly id: string,
    private readonly consultationSessionId: string,
    private readonly authoringDoctorId: string,
    private readonly reason: string,
    private readonly recommendedDate: Date | undefined,
    private readonly createdAt: Date,
  ) {}

  static recommend(props: RecommendFollowUpProps): FollowUpRecommendation {
    if (!props.reason.trim()) {
      throw new ConsultationDomainError('A follow-up recommendation requires a reason.');
    }

    return new FollowUpRecommendation(
      randomUUID(),
      props.consultationSessionId,
      props.authoringDoctorId,
      props.reason.trim(),
      props.recommendedDate,
      new Date(),
    );
  }

  static reconstitute(props: ReconstituteFollowUpRecommendationProps): FollowUpRecommendation {
    return new FollowUpRecommendation(
      props.id,
      props.consultationSessionId,
      props.authoringDoctorId,
      props.reason,
      props.recommendedDate,
      props.createdAt,
    );
  }

  getId(): string {
    return this.id;
  }

  getConsultationSessionId(): string {
    return this.consultationSessionId;
  }

  getAuthoringDoctorId(): string {
    return this.authoringDoctorId;
  }

  getReason(): string {
    return this.reason;
  }

  getRecommendedDate(): Date | undefined {
    return this.recommendedDate;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }
}
