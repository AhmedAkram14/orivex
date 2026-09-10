import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConsultationFeedback } from '../../../domain/entities/consultation-feedback.entity.js';
import type { ConsultationFeedback as ConsultationFeedbackType } from '../../../domain/entities/consultation-feedback.entity.js';
import { ReviewModerationStatus } from '../../../domain/enums/review-moderation-status.enum.js';
import type { ConsultationFeedbackRepository, DoctorRatingAggregate } from '../../../domain/repositories/consultation-feedback.repository.js';

import { ListConsultationFeedbackByModerationStatusQuery } from './list-consultation-feedback-by-moderation-status.query.js';
import { ListConsultationFeedbackByModerationStatusUseCase } from './list-consultation-feedback-by-moderation-status.use-case.js';

class FakeConsultationFeedbackRepository implements ConsultationFeedbackRepository {
  public lastArgs?: { status: ReviewModerationStatus; page: number; limit: number };
  constructor(private readonly result: { feedback: ConsultationFeedbackType[]; total: number }) {}
  async findById(): Promise<ConsultationFeedbackType | null> {
    return null;
  }
  async findByConsultationSessionId(): Promise<ConsultationFeedbackType | null> {
    return null;
  }
  async listForDoctor(): Promise<{ feedback: ConsultationFeedbackType[]; total: number }> {
    return { feedback: [], total: 0 };
  }
  async listByModerationStatus(
    status: ReviewModerationStatus,
    page: number,
    limit: number,
  ): Promise<{ feedback: ConsultationFeedbackType[]; total: number }> {
    this.lastArgs = { status, page, limit };
    return this.result;
  }
  async getRatingAggregateForDoctor(): Promise<DoctorRatingAggregate> {
    return {
      averageRating: null,
      reviewCount: 0,
      writtenReviewCount: 0,
      averageCommunicationRating: null,
      averagePunctualityRating: null,
      averageThoroughnessRating: null,
    };
  }
  async getRatingAggregatesForDoctors(): Promise<Map<string, DoctorRatingAggregate>> {
    return new Map();
  }
  async save(): Promise<void> {}
  async update(): Promise<void> {}
  async delete(): Promise<void> {}
}

describe('ListConsultationFeedbackByModerationStatusUseCase', () => {
  it('passes the status/page/limit through to the repository and returns its result', async () => {
    const feedback = ConsultationFeedback.submit({
      consultationSessionId: '11111111-1111-4111-8111-111111111111',
      patientId: '22222222-2222-4222-8222-222222222222',
      doctorId: '33333333-3333-4333-8333-333333333333',
      rating: 5,
    });
    feedback.flag('Contains a name.');
    const repository = new FakeConsultationFeedbackRepository({ feedback: [feedback], total: 1 });
    const useCase = new ListConsultationFeedbackByModerationStatusUseCase(repository);

    const result = await useCase.execute(
      new ListConsultationFeedbackByModerationStatusQuery({ status: ReviewModerationStatus.Flagged, page: 1, limit: 20 }),
    );

    assert.equal(result.total, 1);
    assert.equal(result.feedback[0]?.getId(), feedback.getId());
    assert.deepEqual(repository.lastArgs, { status: ReviewModerationStatus.Flagged, page: 1, limit: 20 });
  });
});
