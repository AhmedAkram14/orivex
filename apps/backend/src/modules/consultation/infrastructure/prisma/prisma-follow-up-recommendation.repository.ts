import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { FollowUpRecommendation } from '../../domain/entities/follow-up-recommendation.entity.js';
import type { FollowUpRecommendationRepository } from '../../domain/repositories/follow-up-recommendation.repository.js';

import { toDomainFollowUpRecommendation } from './follow-up-recommendation.mapper.js';

@Injectable()
export class PrismaFollowUpRecommendationRepository implements FollowUpRecommendationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByConsultationSessionId(consultationSessionId: string): Promise<FollowUpRecommendation | null> {
    const row = await this.prisma.followUpRecommendation.findUnique({ where: { consultationSessionId } });
    return row ? toDomainFollowUpRecommendation(row) : null;
  }

  async save(recommendation: FollowUpRecommendation): Promise<void> {
    await this.prisma.followUpRecommendation.create({
      data: {
        id: recommendation.getId(),
        consultationSessionId: recommendation.getConsultationSessionId(),
        authoringDoctorId: recommendation.getAuthoringDoctorId(),
        reason: recommendation.getReason(),
        recommendedDate: recommendation.getRecommendedDate() ?? null,
        createdAt: recommendation.getCreatedAt(),
      },
    });
  }
}
