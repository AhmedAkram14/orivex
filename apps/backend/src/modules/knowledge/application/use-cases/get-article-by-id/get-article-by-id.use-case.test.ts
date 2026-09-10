import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { DoctorProfile } from '../../../../doctor/domain/entities/doctor-profile.entity.js';
import type { DoctorProfileRepository } from '../../../../doctor/domain/repositories/doctor-profile.repository.js';
import { KnowledgeArticle } from '../../../domain/entities/knowledge-article.entity.js';
import type { KnowledgeArticleRepository } from '../../../domain/repositories/knowledge-article.repository.js';

import { GetArticleByIdUseCase } from './get-article-by-id.use-case.js';

const AUTHOR_ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ACCOUNT_ID = '44444444-4444-4444-8444-444444444444';

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
  async update(): Promise<void> {}
}

function authorDoctorProfile(): DoctorProfile {
  return DoctorProfile.register({
    accountId: AUTHOR_ACCOUNT_ID,
    licenseNumber: 'LIC-1',
    specialtyId: '33333333-3333-4333-8333-333333333333',
  });
}

describe('GetArticleByIdUseCase', () => {
  it('returns a Published article to any caller', async () => {
    const article = KnowledgeArticle.author({
      authoringDoctorId: 'some-doctor-profile-id',
      title: 'Title',
      body: 'Body content here.',
      requiresPreReview: false,
    });
    const useCase = new GetArticleByIdUseCase(
      new FakeKnowledgeArticleRepository(article),
      new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(null)),
    );

    const result = await useCase.execute({ articleId: article.getId(), callerAccountId: OTHER_ACCOUNT_ID });
    assert.equal(result.getId(), article.getId());
  });

  it('returns a non-Published article to its own authoring doctor', async () => {
    const doctorProfile = authorDoctorProfile();
    const article = KnowledgeArticle.author({
      authoringDoctorId: doctorProfile.getId(),
      title: 'Title',
      body: 'Body content here.',
      requiresPreReview: true,
    });
    const useCase = new GetArticleByIdUseCase(
      new FakeKnowledgeArticleRepository(article),
      new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(doctorProfile)),
    );

    const result = await useCase.execute({ articleId: article.getId(), callerAccountId: AUTHOR_ACCOUNT_ID });
    assert.equal(result.getId(), article.getId());
  });

  it('never leaks existence of a non-Published article to a non-owner (404, not 403)', async () => {
    const doctorProfile = authorDoctorProfile();
    const article = KnowledgeArticle.author({
      authoringDoctorId: doctorProfile.getId(),
      title: 'Title',
      body: 'Body content here.',
      requiresPreReview: true,
    });
    const otherDoctorProfile = DoctorProfile.register({
      accountId: OTHER_ACCOUNT_ID,
      licenseNumber: 'LIC-2',
      specialtyId: '33333333-3333-4333-8333-333333333333',
    });
    const useCase = new GetArticleByIdUseCase(
      new FakeKnowledgeArticleRepository(article),
      new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(otherDoctorProfile)),
    );

    await assert.rejects(
      () => useCase.execute({ articleId: article.getId(), callerAccountId: OTHER_ACCOUNT_ID }),
      NotFoundError,
    );
  });

  it('throws NotFoundError when the article does not exist', async () => {
    const useCase = new GetArticleByIdUseCase(
      new FakeKnowledgeArticleRepository(null),
      new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(null)),
    );

    await assert.rejects(
      () => useCase.execute({ articleId: 'missing-id', callerAccountId: OTHER_ACCOUNT_ID }),
      NotFoundError,
    );
  });
});
