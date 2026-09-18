import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { KnowledgeDomainError } from '../../../domain/exceptions/knowledge-domain.error.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { DoctorProfile } from '../../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../../doctor/domain/repositories/doctor-profile.repository.js';
import { KnowledgeArticle } from '../../../domain/entities/knowledge-article.entity.js';
import { KnowledgeArticleLanguage } from '../../../domain/enums/knowledge-article-language.enum.js';
import { KnowledgeArticleStatus } from '../../../domain/enums/knowledge-article-status.enum.js';
import type { KnowledgeArticleRepository } from '../../../domain/repositories/knowledge-article.repository.js';

import { UnpublishArticleUseCase } from './unpublish-article.use-case.js';

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
  constructor(private readonly article: KnowledgeArticle | null) {}
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
    return 0;
  }
  async save(): Promise<void> {}
  async update(article: KnowledgeArticle): Promise<void> {
    this.updated.push(article);
  }
}

function authorDoctorProfile(): DoctorProfile {
  return DoctorProfile.register({ accountId: AUTHOR_ACCOUNT_ID, licenseNumber: 'LIC-1', specialtyId: SPECIALTY_ID });
}

function buildPublishedArticle(doctorProfile: DoctorProfile): KnowledgeArticle {
  return KnowledgeArticle.author({
    authoringDoctorId: doctorProfile.getId(),
    title: 'Managing Hypertension at Home',
    body: 'Some real, doctor-authored content.',
    language: KnowledgeArticleLanguage.Arabic,
    specialtyId: SPECIALTY_ID,
    requiresPreReview: false,
  });
}

describe('UnpublishArticleUseCase', () => {
  it('archives a Published article, recording reason and actor', async () => {
    const doctorProfile = authorDoctorProfile();
    const article = buildPublishedArticle(doctorProfile);
    const repository = new FakeKnowledgeArticleRepository(article);
    const useCase = new UnpublishArticleUseCase(
      repository,
      new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(doctorProfile)),
    );

    const result = await useCase.execute({
      articleId: article.getId(),
      callerAccountId: AUTHOR_ACCOUNT_ID,
      reason: 'No longer accurate.',
    });

    assert.equal(result.getStatus(), KnowledgeArticleStatus.Archived);
    assert.equal(result.getModerationReason(), 'No longer accurate.');
    assert.equal(result.getModeratedByAccountId(), AUTHOR_ACCOUNT_ID);
    assert.equal(repository.updated.length, 1);
  });

  it('throws NotFoundError (never 403) when the caller does not own the article', async () => {
    const doctorProfile = authorDoctorProfile();
    const article = buildPublishedArticle(doctorProfile);
    const otherDoctorProfile = DoctorProfile.register({
      accountId: OTHER_ACCOUNT_ID,
      licenseNumber: 'LIC-2',
      specialtyId: SPECIALTY_ID,
    });
    const repository = new FakeKnowledgeArticleRepository(article);
    const useCase = new UnpublishArticleUseCase(
      repository,
      new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(otherDoctorProfile)),
    );

    await assert.rejects(
      () => useCase.execute({ articleId: article.getId(), callerAccountId: OTHER_ACCOUNT_ID, reason: 'reason' }),
      NotFoundError,
    );
  });

  it('throws NotFoundError when the article does not exist', async () => {
    const repository = new FakeKnowledgeArticleRepository(null);
    const useCase = new UnpublishArticleUseCase(repository, new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(null)));

    await assert.rejects(
      () => useCase.execute({ articleId: 'missing-id', callerAccountId: OTHER_ACCOUNT_ID, reason: 'reason' }),
      NotFoundError,
    );
  });

  it('rejects an empty reason via the entity`s own validation', async () => {
    const doctorProfile = authorDoctorProfile();
    const article = buildPublishedArticle(doctorProfile);
    const repository = new FakeKnowledgeArticleRepository(article);
    const useCase = new UnpublishArticleUseCase(
      repository,
      new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(doctorProfile)),
    );

    await assert.rejects(
      () => useCase.execute({ articleId: article.getId(), callerAccountId: AUTHOR_ACCOUNT_ID, reason: '   ' }),
      KnowledgeDomainError,
    );
  });
});
