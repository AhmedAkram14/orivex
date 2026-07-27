import type { ListConsultationFeedbackForDoctorResult } from '../../application/use-cases/list-consultation-feedback-for-doctor/list-consultation-feedback-for-doctor.use-case.js';
import type { DoctorRatingAggregate } from '../../domain/repositories/consultation-feedback.repository.js';

import { ConsultationFeedbackResponseDto } from './consultation-feedback-response.dto.js';

// Consultation lifecycle completion follow-up (2026-07-26): the public
// reviews list + rating aggregate backing the doctor directory/profile
// (§10/§11 of the fix's own scope: written comments are shown publicly,
// not just the numeric average). Lives in ConsultationModule, not
// DoctorModule -- DoctorModule cannot depend on ConsultationModule without
// creating a real circular module dependency (see
// DoctorReviewsController's own header comment); the frontend composes
// GET /doctors/:id with this endpoint.
export class DoctorReviewsResponseDto {
  reviews!: ConsultationFeedbackResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  averageRating!: number | null;
  reviewCount!: number;

  static fromResult(
    result: ListConsultationFeedbackForDoctorResult,
    page: number,
    limit: number,
    ratingAggregate: DoctorRatingAggregate,
  ): DoctorReviewsResponseDto {
    const dto = new DoctorReviewsResponseDto();
    dto.reviews = result.feedback.map((feedback) => ConsultationFeedbackResponseDto.fromDomain(feedback));
    dto.total = result.total;
    dto.page = page;
    dto.limit = limit;
    dto.averageRating = ratingAggregate.averageRating;
    dto.reviewCount = ratingAggregate.reviewCount;
    return dto;
  }
}
