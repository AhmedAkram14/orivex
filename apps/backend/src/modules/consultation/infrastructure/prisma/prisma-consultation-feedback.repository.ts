import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../platform/database/prisma.service.js';
import type { ConsultationFeedback } from '../../domain/entities/consultation-feedback.entity.js';
import type {
  ConsultationFeedbackRepository,
  DoctorRatingAggregate,
} from '../../domain/repositories/consultation-feedback.repository.js';

import { toDomainConsultationFeedback } from './consultation-feedback.mapper.js';

@Injectable()
export class PrismaConsultationFeedbackRepository implements ConsultationFeedbackRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByConsultationSessionId(consultationSessionId: string): Promise<ConsultationFeedback | null> {
    const row = await this.prisma.consultationFeedback.findUnique({ where: { consultationSessionId } });
    return row ? toDomainConsultationFeedback(row) : null;
  }

  async listForDoctor(
    doctorId: string,
    page: number,
    limit: number,
  ): Promise<{ feedback: ConsultationFeedback[]; total: number }> {
    const [rows, total] = await Promise.all([
      this.prisma.consultationFeedback.findMany({
        where: { doctorId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.consultationFeedback.count({ where: { doctorId } }),
    ]);
    return { feedback: rows.map(toDomainConsultationFeedback), total };
  }

  // Real-time aggregation (AVG/COUNT), no materialized/cached column --
  // matches the approved scope ("do not introduce caching/materialized
  // aggregates unless current performance requirements actually justify
  // it"). A single indexed (doctorId) aggregate query is cheap at this
  // platform's current scale.
  async getRatingAggregateForDoctor(doctorId: string): Promise<DoctorRatingAggregate> {
    const result = await this.prisma.consultationFeedback.aggregate({
      where: { doctorId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    return { averageRating: result._avg.rating, reviewCount: result._count.rating };
  }

  async getRatingAggregatesForDoctors(doctorIds: string[]): Promise<Map<string, DoctorRatingAggregate>> {
    if (doctorIds.length === 0) {
      return new Map();
    }
    const groups = await this.prisma.consultationFeedback.groupBy({
      by: ['doctorId'],
      where: { doctorId: { in: doctorIds } },
      _avg: { rating: true },
      _count: { rating: true },
    });
    const result = new Map<string, DoctorRatingAggregate>();
    for (const group of groups) {
      result.set(group.doctorId, { averageRating: group._avg.rating, reviewCount: group._count.rating });
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
        createdAt: feedback.getCreatedAt(),
      },
    });
  }
}
