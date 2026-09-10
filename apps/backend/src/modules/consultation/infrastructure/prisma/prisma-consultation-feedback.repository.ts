import { Injectable } from '@nestjs/common';

import { ReviewModerationStatus as PrismaReviewModerationStatus } from '@prisma/client';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { ConsultationFeedback } from '../../domain/entities/consultation-feedback.entity.js';
import type { ReviewModerationStatus } from '../../domain/enums/review-moderation-status.enum.js';
import type {
  ConsultationFeedbackRepository,
  DoctorRatingAggregate,
} from '../../domain/repositories/consultation-feedback.repository.js';

import { toDomainConsultationFeedback, toPrismaModerationStatus } from './consultation-feedback.mapper.js';

@Injectable()
export class PrismaConsultationFeedbackRepository implements ConsultationFeedbackRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ConsultationFeedback | null> {
    const row = await this.prisma.consultationFeedback.findUnique({ where: { id } });
    return row ? toDomainConsultationFeedback(row) : null;
  }

  async findByConsultationSessionId(consultationSessionId: string): Promise<ConsultationFeedback | null> {
    const row = await this.prisma.consultationFeedback.findUnique({ where: { consultationSessionId } });
    return row ? toDomainConsultationFeedback(row) : null;
  }

  async listForDoctor(
    doctorId: string,
    page: number,
    limit: number,
  ): Promise<{ feedback: ConsultationFeedback[]; total: number }> {
    const where = { doctorId, moderationStatus: PrismaReviewModerationStatus.VISIBLE };
    const [rows, total] = await Promise.all([
      this.prisma.consultationFeedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.consultationFeedback.count({ where }),
    ]);
    return { feedback: rows.map(toDomainConsultationFeedback), total };
  }

  async listByModerationStatus(
    status: ReviewModerationStatus,
    page: number,
    limit: number,
  ): Promise<{ feedback: ConsultationFeedback[]; total: number }> {
    const where = { moderationStatus: toPrismaModerationStatus(status) };
    const [rows, total] = await Promise.all([
      this.prisma.consultationFeedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.consultationFeedback.count({ where }),
    ]);
    return { feedback: rows.map(toDomainConsultationFeedback), total };
  }

  // Real-time aggregation (AVG/COUNT), no materialized/cached column --
  // matches the approved scope ("do not introduce caching/materialized
  // aggregates unless current performance requirements actually justify
  // it"). A single indexed (doctorId) aggregate query is cheap at this
  // platform's current scale.
  async getRatingAggregateForDoctor(doctorId: string): Promise<DoctorRatingAggregate> {
    // I11 -- Admin content moderation: a Flagged/Hidden review counts
    // toward neither the public average nor the review count -- matches
    // listForDoctor's own Visible-only filter, so the number on a doctor's
    // profile always agrees with what the review list actually shows.
    const [result, writtenReviewCount] = await Promise.all([
      this.prisma.consultationFeedback.aggregate({
        where: { doctorId, moderationStatus: PrismaReviewModerationStatus.VISIBLE },
        _avg: { rating: true, communicationRating: true, punctualityRating: true, thoroughnessRating: true },
        _count: { rating: true },
      }),
      this.prisma.consultationFeedback.count({
        where: { doctorId, comment: { not: null }, moderationStatus: PrismaReviewModerationStatus.VISIBLE },
      }),
    ]);
    return {
      averageRating: result._avg.rating,
      reviewCount: result._count.rating,
      writtenReviewCount,
      averageCommunicationRating: result._avg.communicationRating,
      averagePunctualityRating: result._avg.punctualityRating,
      averageThoroughnessRating: result._avg.thoroughnessRating,
    };
  }

  async getRatingAggregatesForDoctors(doctorIds: string[]): Promise<Map<string, DoctorRatingAggregate>> {
    if (doctorIds.length === 0) {
      return new Map();
    }
    const [groups, writtenGroups] = await Promise.all([
      this.prisma.consultationFeedback.groupBy({
        by: ['doctorId'],
        where: { doctorId: { in: doctorIds }, moderationStatus: PrismaReviewModerationStatus.VISIBLE },
        _avg: { rating: true, communicationRating: true, punctualityRating: true, thoroughnessRating: true },
        _count: { rating: true },
      }),
      this.prisma.consultationFeedback.groupBy({
        by: ['doctorId'],
        where: { doctorId: { in: doctorIds }, comment: { not: null }, moderationStatus: PrismaReviewModerationStatus.VISIBLE },
        _count: { rating: true },
      }),
    ]);
    const writtenCountByDoctorId = new Map(writtenGroups.map((group) => [group.doctorId, group._count.rating]));
    const result = new Map<string, DoctorRatingAggregate>();
    for (const group of groups) {
      result.set(group.doctorId, {
        averageRating: group._avg.rating,
        reviewCount: group._count.rating,
        writtenReviewCount: writtenCountByDoctorId.get(group.doctorId) ?? 0,
        averageCommunicationRating: group._avg.communicationRating,
        averagePunctualityRating: group._avg.punctualityRating,
        averageThoroughnessRating: group._avg.thoroughnessRating,
      });
    }
    return result;
  }

  async save(feedback: ConsultationFeedback): Promise<void> {
    await this.prisma.consultationFeedback.create({
      data: {
        id: feedback.getId(),
        consultationSessionId: feedback.getConsultationSessionId(),
        patientId: feedback.getPatientId(),
        doctorId: feedback.getDoctorId(),
        rating: feedback.getRating(),
        comment: feedback.getComment() ?? null,
        communicationRating: feedback.getCommunicationRating() ?? null,
        punctualityRating: feedback.getPunctualityRating() ?? null,
        thoroughnessRating: feedback.getThoroughnessRating() ?? null,
        createdAt: feedback.getCreatedAt(),
      },
    });
  }

  async update(feedback: ConsultationFeedback): Promise<void> {
    await this.prisma.consultationFeedback.update({
      where: { id: feedback.getId() },
      data: {
        rating: feedback.getRating(),
        comment: feedback.getComment() ?? null,
        communicationRating: feedback.getCommunicationRating() ?? null,
        punctualityRating: feedback.getPunctualityRating() ?? null,
        thoroughnessRating: feedback.getThoroughnessRating() ?? null,
        // I11 -- Admin content moderation: persisted here too, since
        // FlagConsultationFeedbackUseCase/ModerateConsultationFeedbackUseCase
        // both mutate the entity in memory then call this same update().
        moderationStatus: toPrismaModerationStatus(feedback.getModerationStatus()),
        moderationReason: feedback.getModerationReason() ?? null,
        moderatedByAccountId: feedback.getModeratedByAccountId() ?? null,
        moderatedAt: feedback.getModeratedAt() ?? null,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.consultationFeedback.delete({ where: { id } });
  }
}
