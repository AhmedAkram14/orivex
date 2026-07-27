import type { FollowUpRecommendation } from '../entities/follow-up-recommendation.entity.js';

export interface FollowUpRecommendationRepository {
  findByConsultationSessionId(consultationSessionId: string): Promise<FollowUpRecommendation | null>;
  save(recommendation: FollowUpRecommendation): Promise<void>;
}
