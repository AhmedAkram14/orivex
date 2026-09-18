import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { DoctorProfile } from '../../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../../doctor/domain/repositories/doctor-profile.repository.js';
import { KnowledgeArticle } from '../../../domain/entities/knowledge-article.entity.js';
import { KnowledgeArticleLanguage } from '../../../domain/enums/knowledge-article-language.enum.js';
import { KnowledgeArticleStatus } from '../../../domain/enums/knowledge-article-status.enum.js';
import type { KnowledgeArticleRepository } from '../../../domain/repositories/knowledge-article.repository.js';
import { PreReviewThresholdService } from '../../services/pre-review-threshold.service.js';

import { SubmitArticleForReviewUseCase } from './submit-article-for-review.use-case.js';

const AUTHOR_ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ACCOUNT_ID = '44444444-4444-4444-8444-444444444444';
const SPECIALTY_ID = '33333333-3333-4333-8333-333333333333';

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

class FakeKnowledgeArticleRepository implements KnowledgeArticleRepository {
  public updated: KnowledgeArticle[] = [];
  constructor(
    private readonly article: KnowledgeArticle | null,
    private readonly priorPublishedCount = 0,
  ) {}
  async findById(): Promise<KnowledgeArticle | null> {
    return this.article;
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
  async save(): Promise<void> {}
  async update(article: KnowledgeArticle): Promise<void> {
    this.updated.push(article);
  }
}

function authorDoctorProfile(): DoctorProfile {
  return DoctorProfile.register({ accountId: AUTHOR_ACCOUNT_ID, licenseNumber: 'LIC-1', specialtyId: SPECIALTY_ID });
}

function buildDraftArticle(doctorProfile: DoctorProfile): KnowledgeArticle {
  return KnowledgeArticle.author({
    authoringDoctorId: doctorProfile.getId(),
    title: 'A'.repeat(10),
    body: 'B'.repeat(200),
    language: KnowledgeArticleLanguage.Arabic,
    specialtyId: SPECIALTY_ID,
    saveAsDraft: true,
  });
}

describe('SubmitArticleForReviewUseCase', () => {
  it('submits into PendingReview when the author has not cleared the pre-review threshold', async () => {
    const doctorProfile = authorDoctorProfile();
    const article = buildDraftArticle(doctorProfile);
    const repository = new FakeKnowledgeArticleRepository(article, 0);
    const useCase = new SubmitArticleForReviewUseCase(
      repository,
      new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(doctorProfile)),
      new PreReviewThresholdService(repository),
    );

    const result = await useCase.execute({ articleId: article.getId(), callerAccountId: AUTHOR_ACCOUNT_ID });

    assert.equal(result.getStatus(), KnowledgeArticleStatus.PendingReview);
    assert.equal(repository.updated.length, 1);
  });

  it('submits straight to Published once the author has cleared the pre-review threshold', async () => {
    const doctorProfile = authorDoctorProfile();
    const article = buildDraftArticle(doctorProfile);
    const repository = new FakeKnowledgeArticleRepository(article, 3);
    const useCase = new SubmitArticleForReviewUseCase(
      repository,
      new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(doctorProfile)),
      new PreReviewThresholdService(repository),
    );

    const result = await useCase.execute({ articleId: article.getId(), callerAccountId: AUTHOR_ACCOUNT_ID });

    assert.equal(result.getStatus(), KnowledgeArticleStatus.Published);
  });

  it('throws NotFoundError when the article does not exist', async () => {
    const repository = new FakeKnowledgeArticleRepository(null);
    const useCase = new SubmitArticleForReviewUseCase(
      repository,
      new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(null)),
      new PreReviewThresholdService(repository),
    );

    await assert.rejects(
      () => useCase.execute({ articleId: 'missing-id', callerAccountId: OTHER_ACCOUNT_ID }),
      NotFoundError,
    );
  });

  it('throws NotFoundError (never 403) when the caller does not own the article', async () => {
    const doctorProfile = authorDoctorProfile();
    const article = buildDraftArticle(doctorProfile);
    const otherDoctorProfile = DoctorProfile.register({
      accountId: OTHER_ACCOUNT_ID,
      licenseNumber: 'LIC-2',
      specialtyId: SPECIALTY_ID,
    });
    const repository = new FakeKnowledgeArticleRepository(article);
    const useCase = new SubmitArticleForReviewUseCase(
      repository,
      new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(otherDoctorProfile)),
      new PreReviewThresholdService(repository),
    );

    await assert.rejects(
      () => useCase.execute({ articleId: article.getId(), callerAccountId: OTHER_ACCOUNT_ID }),
      NotFoundError,
    );
  });
});
