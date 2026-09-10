import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ForbiddenError, NotFoundError } from '../../../../../shared/errors/app-error.js';
import { CheckIdentityVerificationStatusUseCase } from '../../../../trust/application/use-cases/check-identity-verification-status/check-identity-verification-status.use-case.js';
import { VerificationCase } from '../../../../trust/domain/entities/verification-case.entity.js';
import { VerificationStatus } from '../../../../trust/domain/enums/verification-status.enum.js';
import type { VerificationCaseRepository } from '../../../../trust/domain/repositories/verification-case.repository.js';
import { DoctorProfessionalDetails } from '../../../../trust/domain/value-objects/doctor-professional-details.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { DoctorProfile } from '../../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../../doctor/domain/repositories/doctor-profile.repository.js';
import { KnowledgeArticleStatus } from '../../../domain/enums/knowledge-article-status.enum.js';
import type { KnowledgeArticleRepository } from '../../../domain/repositories/knowledge-article.repository.js';

import { AuthorArticleUseCase } from './author-article.use-case.js';

const DOCTOR_ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';

class FakeDoctorProfileRepository implements DoctorProfileRepository {
  constructor(private readonly profile: DoctorProfile | null) {}
  async findById(): Promise<DoctorProfile | null> {
    return this.profile;
  }
  async findByAccountId(): Promise<DoctorProfile | null> {
    return this.profile;
  }
  async save(): Promise<void> {}
}

class FakeVerificationCaseRepository implements VerificationCaseRepository {
  constructor(private readonly cases: VerificationCase[]) {}
  async findById(): Promise<VerificationCase | null> {
    return null;
  }
  async findPendingReview(): Promise<VerificationCase[]> {
    return [];
  }
  async findAllBySubject(): Promise<VerificationCase[]> {
    return this.cases;
  }
  async save(): Promise<void> {}
}

class FakeKnowledgeArticleRepository implements KnowledgeArticleRepository {
  public saved: unknown[] = [];
  constructor(private readonly priorPublishedCount: number) {}
  async findById(): Promise<null> {
    return null;
  }
  async listPublished(): Promise<{ articles: []; total: number }> {
    return { articles: [], total: 0 };
  }
  async listByAuthor(): Promise<[]> {
    return [];
  }
  async listByStatus(): Promise<{ articles: []; total: number }> {
    return { articles: [], total: 0 };
  }
  async countEverPublishedByAuthor(): Promise<number> {
    return this.priorPublishedCount;
  }
  async save(article: unknown): Promise<void> {
    this.saved.push(article);
  }
  async update(): Promise<void> {}
}

function approvedDoctorVerification(): VerificationCase[] {
  const approved = VerificationCase.submit({
    subjectAccountId: DOCTOR_ACCOUNT_ID,
    subjectDetails: DoctorProfessionalDetails.create('LIC-1', 'general-medicine'),
    documentAssetIds: ['22222222-2222-4222-8222-222222222222'],
  });
  approved.decide(VerificationStatus.Approved);
  return [approved];
}

function buildDoctorProfile(): DoctorProfile {
  return DoctorProfile.register({
    accountId: DOCTOR_ACCOUNT_ID,
    licenseNumber: 'LIC-1',
    specialtyId: '33333333-3333-4333-8333-333333333333',
  });
}

describe('AuthorArticleUseCase', () => {
  it('creates a PendingReview article when the verified doctor has not yet cleared the pre-review threshold', async () => {
    const useCase = new AuthorArticleUseCase(
      new FakeKnowledgeArticleRepository(0),
      new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(buildDoctorProfile())),
      new CheckIdentityVerificationStatusUseCase(new FakeVerificationCaseRepository(approvedDoctorVerification())),
    );

    const article = await useCase.execute({
      callerAccountId: DOCTOR_ACCOUNT_ID,
      title: 'Managing Hypertension at Home',
      body: 'Some real, doctor-authored content.',
    });

    assert.equal(article.getStatus(), KnowledgeArticleStatus.PendingReview);
  });

  it('publishes immediately once the verified doctor has cleared the pre-review threshold', async () => {
    const useCase = new AuthorArticleUseCase(
      new FakeKnowledgeArticleRepository(3),
      new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(buildDoctorProfile())),
      new CheckIdentityVerificationStatusUseCase(new FakeVerificationCaseRepository(approvedDoctorVerification())),
    );

    const article = await useCase.execute({
      callerAccountId: DOCTOR_ACCOUNT_ID,
      title: 'Managing Hypertension at Home',
      body: 'Some real, doctor-authored content.',
    });

    assert.equal(article.getStatus(), KnowledgeArticleStatus.Published);
  });

  it('throws ForbiddenError when the caller is not Syndicate-verified', async () => {
    const useCase = new AuthorArticleUseCase(
      new FakeKnowledgeArticleRepository(0),
      new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(buildDoctorProfile())),
      new CheckIdentityVerificationStatusUseCase(new FakeVerificationCaseRepository([])),
    );

    await assert.rejects(
      () =>
        useCase.execute({
          callerAccountId: DOCTOR_ACCOUNT_ID,
          title: 'Managing Hypertension at Home',
          body: 'Some real, doctor-authored content.',
        }),
      ForbiddenError,
    );
  });

  it('throws NotFoundError when the caller has no doctor profile', async () => {
    const useCase = new AuthorArticleUseCase(
      new FakeKnowledgeArticleRepository(0),
      new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(null)),
      new CheckIdentityVerificationStatusUseCase(new FakeVerificationCaseRepository(approvedDoctorVerification())),
    );

    await assert.rejects(
      () =>
        useCase.execute({
          callerAccountId: DOCTOR_ACCOUNT_ID,
          title: 'Managing Hypertension at Home',
          body: 'Some real, doctor-authored content.',
        }),
      NotFoundError,
    );
  });
});
