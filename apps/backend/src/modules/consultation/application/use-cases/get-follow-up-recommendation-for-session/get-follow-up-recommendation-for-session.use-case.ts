import type { FollowUpRecommendation } from '../../../domain/entities/follow-up-recommendation.entity.js';
import type { FollowUpRecommendationRepository } from '../../../domain/repositories/follow-up-recommendation.repository.js';

export interface GetFollowUpRecommendationForSessionQuery {
  consultationSessionId: string;
}

export class GetFollowUpRecommendationForSessionUseCase {
  constructor(private readonly followUpRecommendationRepository: FollowUpRecommendationRepository) {}

  async execute(query: GetFollowUpRecommendationForSessionQuery): Promise<FollowUpRecommendation | null> {
    return this.followUpRecommendationRepository.findByConsultationSessionId(query.consultationSessionId);
  }
}
