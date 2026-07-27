import type { FollowUpRecommendation as PrismaFollowUpRecommendation } from '@prisma/client';

import { FollowUpRecommendation } from '../../domain/entities/follow-up-recommendation.entity.js';

export function toDomainFollowUpRecommendation(row: PrismaFollowUpRecommendation): FollowUpRecommendation {
  return FollowUpRecommendation.reconstitute({
    id: row.id,
    consultationSessionId: row.consultationSessionId,
    authoringDoctorId: row.authoringDoctorId,
    reason: row.reason,
    recommendedDate: row.recommendedDate ?? undefined,
    createdAt: row.createdAt,
  });
}
