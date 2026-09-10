import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { ConsultationFeedback } from '../../../domain/entities/consultation-feedback.entity.js';
import type { ConsultationFeedback as ConsultationFeedbackType } from '../../../domain/entities/consultation-feedback.entity.js';
import { ReviewModerationStatus } from '../../../domain/enums/review-moderation-status.enum.js';
import type { ConsultationFeedbackRepository, DoctorRatingAggregate } from '../../../domain/repositories/consultation-feedback.repository.js';

import { ModerateConsultationFeedbackCommand } from './moderate-consultation-feedback.command.js';
import { ModerateConsultationFeedbackUseCase } from './moderate-consultation-feedback.use-case.js';

class FakeConsultationFeedbackRepository implements ConsultationFeedbackRepository {
  public readonly updated: ConsultationFeedbackType[] = [];
  constructor(private readonly feedback: ConsultationFeedbackType | null) {}
  async findById(): Promise<ConsultationFeedbackType | null> {
    return this.feedback;
  }
  async findByConsultationSessionId(): Promise<ConsultationFeedbackType | null> {
    return this.feedback;
  }
  async listForDoctor(): Promise<{ feedback: ConsultationFeedbackType[]; total: number }> {
    return { feedback: [], total: 0 };
  }
  async listByModerationStatus(): Promise<{ feedback: ConsultationFeedbackType[]; total: number }> {
    return { feedback: [], total: 0 };
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
  async update(feedback: ConsultationFeedbackType): Promise<void> {
    this.updated.push(feedback);
  }
  async delete(): Promise<void> {}
}

function buildFeedback(): ConsultationFeedbackType {
  return ConsultationFeedback.submit({
    consultationSessionId: '11111111-1111-4111-8111-111111111111',
    patientId: '22222222-2222-4222-8222-222222222222',
    doctorId: '33333333-3333-4333-8333-333333333333',
    rating: 5,
  });
}

describe('ModerateConsultationFeedbackUseCase', () => {
  it('hides a review, recording the admin and reason', async () => {
    const feedback = buildFeedback();
    const repository = new FakeConsultationFeedbackRepository(feedback);
    const useCase = new ModerateConsultationFeedbackUseCase(repository);

    const result = await useCase.execute(
      new ModerateConsultationFeedbackCommand({
        feedbackId: feedback.getId(),
        status: ReviewModerationStatus.Hidden,
        reason: 'Contains identifying details.',
        moderatorAccountId: 'admin-account-1',
      }),
    );

    assert.equal(result.getModerationStatus(), ReviewModerationStatus.Hidden);
    assert.equal(result.getModeratedByAccountId(), 'admin-account-1');
    assert.equal(repository.updated.length, 1);
  });

  it('restores a flagged review to visible', async () => {
    const feedback = buildFeedback();
    feedback.flag('Contains a name.');
    const repository = new FakeConsultationFeedbackRepository(feedback);
    const useCase = new ModerateConsultationFeedbackUseCase(repository);

    const result = await useCase.execute(
      new ModerateConsultationFeedbackCommand({
        feedbackId: feedback.getId(),
        status: ReviewModerationStatus.Visible,
        reason: 'No PHI found.',
        moderatorAccountId: 'admin-account-1',
      }),
    );

    assert.equal(result.getModerationStatus(), ReviewModerationStatus.Visible);
  });

  it('throws NotFoundError when the feedback does not exist', async () => {
    const repository = new FakeConsultationFeedbackRepository(null);
    const useCase = new ModerateConsultationFeedbackUseCase(repository);

    await assert.rejects(
      () =>
        useCase.execute(
          new ModerateConsultationFeedbackCommand({
            feedbackId: 'missing-id',
            status: ReviewModerationStatus.Hidden,
            reason: 'r',
            moderatorAccountId: 'admin-account-1',
          }),
        ),
      NotFoundError,
    );
  });
});
