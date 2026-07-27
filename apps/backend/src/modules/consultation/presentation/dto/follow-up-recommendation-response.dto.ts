import type { FollowUpRecommendation } from '../../domain/entities/follow-up-recommendation.entity.js';

export class FollowUpRecommendationResponseDto {
  id!: string;
  consultationSessionId!: string;
  reason!: string;
  recommendedDate!: string | null;
  createdAt!: string;

  static fromDomain(recommendation: FollowUpRecommendation): FollowUpRecommendationResponseDto {
    const dto = new FollowUpRecommendationResponseDto();
    dto.id = recommendation.getId();
    dto.consultationSessionId = recommendation.getConsultationSessionId();
    dto.reason = recommendation.getReason();
    dto.recommendedDate = recommendation.getRecommendedDate()?.toISOString() ?? null;
    dto.createdAt = recommendation.getCreatedAt().toISOString();
    return dto;
  }
}
