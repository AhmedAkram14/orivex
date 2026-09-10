import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ForbiddenError, NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import type { DoctorProfile } from '../../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../../doctor/domain/repositories/doctor-profile.repository.js';
import { ConsultationFeedback } from '../../../domain/entities/consultation-feedback.entity.js';
import type { ConsultationFeedback as ConsultationFeedbackType } from '../../../domain/entities/consultation-feedback.entity.js';
import { ReviewModerationStatus } from '../../../domain/enums/review-moderation-status.enum.js';
import type { ConsultationFeedbackRepository, DoctorRatingAggregate } from '../../../domain/repositories/consultation-feedback.repository.js';

import { FlagConsultationFeedbackCommand } from './flag-consultation-feedback.command.js';
import { FlagConsultationFeedbackUseCase } from './flag-consultation-feedback.use-case.js';

const DOCTOR_ID = '33333333-3333-4333-8333-333333333333';

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

class FakeDoctorProfileRepository implements DoctorProfileRepository {
  constructor(private readonly profileByAccountId: Map<string, DoctorProfile>) {}
  async findById(): Promise<DoctorProfile | null> {
    return null;
  }
  async findByAccountId(accountId: string): Promise<DoctorProfile | null> {
    return this.profileByAccountId.get(accountId) ?? null;
  }
  async save(): Promise<void> {}
}

function buildFeedback(): ConsultationFeedbackType {
  return ConsultationFeedback.submit({
    consultationSessionId: '11111111-1111-4111-8111-111111111111',
    patientId: '22222222-2222-4222-8222-222222222222',
    doctorId: DOCTOR_ID,
    rating: 5,
  });
}

function buildUseCase(props: {
  feedback: ConsultationFeedbackType | null;
  doctorAccountId?: string;
  doctorProfileId?: string;
}): {
  useCase: FlagConsultationFeedbackUseCase;
  repository: FakeConsultationFeedbackRepository;
} {
  const doctorProfiles = new Map<string, DoctorProfile>();
  if (props.doctorAccountId) {
    doctorProfiles.set(props.doctorAccountId, { getId: () => props.doctorProfileId ?? DOCTOR_ID } as DoctorProfile);
  }
  const repository = new FakeConsultationFeedbackRepository(props.feedback);
  return {
    useCase: new FlagConsultationFeedbackUseCase(
      repository,
      new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(doctorProfiles)),
    ),
    repository,
  };
}

describe('FlagConsultationFeedbackUseCase', () => {
  it('lets the reviewed doctor flag the review', async () => {
    const feedback = buildFeedback();
    const { useCase, repository } = buildUseCase({ feedback, doctorAccountId: 'doctor-account-1' });

    const result = await useCase.execute(
      new FlagConsultationFeedbackCommand({ feedbackId: feedback.getId(), callerAccountId: 'doctor-account-1', reason: 'Contains a name.' }),
    );

    assert.equal(result.getModerationStatus(), ReviewModerationStatus.Flagged);
    assert.equal(repository.updated.length, 1);
  });

  it('throws NotFoundError when the feedback does not exist', async () => {
    const { useCase } = buildUseCase({ feedback: null, doctorAccountId: 'doctor-account-1' });

    await assert.rejects(
      () => useCase.execute(new FlagConsultationFeedbackCommand({ feedbackId: 'missing-id', callerAccountId: 'doctor-account-1', reason: 'r' })),
      NotFoundError,
    );
  });

  it('throws ForbiddenError when the caller is not the doctor this review is about', async () => {
    const feedback = buildFeedback();
    const { useCase } = buildUseCase({ feedback, doctorAccountId: 'other-doctor-account', doctorProfileId: 'other-doctor-profile-id' });

    await assert.rejects(
      () => useCase.execute(new FlagConsultationFeedbackCommand({ feedbackId: feedback.getId(), callerAccountId: 'other-doctor-account', reason: 'r' })),
      ForbiddenError,
    );
  });
});
