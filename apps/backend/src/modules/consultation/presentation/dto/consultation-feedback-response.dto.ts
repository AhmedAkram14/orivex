import type { ConsultationFeedback } from '../../domain/entities/consultation-feedback.entity.js';
import type { ReviewModerationStatus } from '../../domain/enums/review-moderation-status.enum.js';

// The patient identity fields (name/avatar) require an extra Account +
// PatientProfile lookup this DTO can't do itself -- the caller resolves
// them (batched, avoiding one lookup per review) and passes the result in.
export interface ReviewerInfo {
  patientProfileId: string;
  patientName: string;
  patientAvatarUrl?: string;
}

export class ConsultationFeedbackResponseDto {
  id!: string;
  consultationSessionId!: string;
  doctorId!: string;
  rating!: number;
  comment!: string | null;
  communicationRating!: number | null;
  punctualityRating!: number | null;
  thoroughnessRating!: number | null;
  createdAt!: string;
  patientProfileId!: string;
  patientName!: string;
  patientAvatarUrl?: string;
  // I11 -- Admin content moderation.
  moderationStatus!: ReviewModerationStatus;
  moderationReason!: string | null;
  moderatedByAccountId!: string | null;
  moderatedAt!: string | null;

  // `reviewer` is omitted by every call site where the viewer is the
  // patient looking at their own submitted feedback (consultation summary,
  // feedback submit/update responses) -- there's nothing to resolve, they
  // already know who they are. Only the public reviews list (a stranger
  // reading someone else's review) passes it in.
  static fromDomain(feedback: ConsultationFeedback, reviewer?: ReviewerInfo): ConsultationFeedbackResponseDto {
    const dto = new ConsultationFeedbackResponseDto();
    dto.id = feedback.getId();
    dto.consultationSessionId = feedback.getConsultationSessionId();
    dto.doctorId = feedback.getDoctorId();
    dto.rating = feedback.getRating();
    dto.comment = feedback.getComment() ?? null;
    dto.communicationRating = feedback.getCommunicationRating() ?? null;
    dto.punctualityRating = feedback.getPunctualityRating() ?? null;
    dto.thoroughnessRating = feedback.getThoroughnessRating() ?? null;
    dto.createdAt = feedback.getCreatedAt().toISOString();
    dto.patientProfileId = reviewer?.patientProfileId ?? feedback.getPatientId();
    dto.patientName = reviewer?.patientName ?? '';
    dto.patientAvatarUrl = reviewer?.patientAvatarUrl;
    dto.moderationStatus = feedback.getModerationStatus();
    dto.moderationReason = feedback.getModerationReason() ?? null;
    dto.moderatedByAccountId = feedback.getModeratedByAccountId() ?? null;
    dto.moderatedAt = feedback.getModeratedAt()?.toISOString() ?? null;
    return dto;
  }
}
