import type { ConsultationFeedback } from '../../domain/entities/consultation-feedback.entity.js';

export class ConsultationFeedbackResponseDto {
  id!: string;
  consultationSessionId!: string;
  doctorId!: string;
  rating!: number;
  comment!: string | null;
  createdAt!: string;

  static fromDomain(feedback: ConsultationFeedback): ConsultationFeedbackResponseDto {
    const dto = new ConsultationFeedbackResponseDto();
    dto.id = feedback.getId();
    dto.consultationSessionId = feedback.getConsultationSessionId();
    dto.doctorId = feedback.getDoctorId();
    dto.rating = feedback.getRating();
    dto.comment = feedback.getComment() ?? null;
    dto.createdAt = feedback.getCreatedAt().toISOString();
    return dto;
  }
}
