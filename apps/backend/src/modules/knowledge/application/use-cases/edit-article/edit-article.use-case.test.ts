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

import { EditArticleUseCase } from './edit-article.use-case.js';

const AUTHOR_ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ACCOUNT_ID = '44444444-4444-4444-8444-444444444444';
const SPECIALTY_ID = '33333333-3333-4333-8333-333333333333';
const NEW_SPECIALTY_ID = '55555555-5555-4555-8555-555555555555';

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

function authorDoctorProfile(specialtyId = SPECIALTY_ID): DoctorProfile {
  return DoctorProfile.register({ accountId: AUTHOR_ACCOUNT_ID, licenseNumber: 'LIC-1', specialtyId });
}

describe('EditArticleUseCase', () => {
  it('edits a Draft article in place with no status change', async () => {
    const doctorProfile = authorDoctorProfile();
    const article = KnowledgeArticle.author({
      authoringDoctorId: doctorProfile.getId(),
      title: 'x',
      body: 'y',
      language: KnowledgeArticleLanguage.Arabic,
      specialtyId: SPECIALTY_ID,
      saveAsDraft: true,
    });
    const repository = new FakeKnowledgeArticleRepository(article);
    const useCase = new EditArticleUseCase(repository, new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(doctorProfile)));

    const result = await useCase.execute({
      articleId: article.getId(),
      callerAccountId: AUTHOR_ACCOUNT_ID,
      title: 'New title',
      body: 'New body',
      language: KnowledgeArticleLanguage.English,
    });

    assert.equal(result.getStatus(), KnowledgeArticleStatus.Draft);
    assert.equal(result.getTitle(), 'New title');
    assert.equal(repository.updated.length, 1);
  });

  it('edits a PendingReview article in place with no status change', async () => {
    const doctorProfile = authorDoctorProfile();
    const article = KnowledgeArticle.author({
      authoringDoctorId: doctorProfile.getId(),
      title: 'Managing Hypertension at Home',
      body: 'Some real, doctor-authored content.',
      language: KnowledgeArticleLanguage.Arabic,
      specialtyId: SPECIALTY_ID,
      requiresPreReview: true,
    });
    const repository = new FakeKnowledgeArticleRepository(article);
    const useCase = new EditArticleUseCase(repository, new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(doctorProfile)));

    const result = await useCase.execute({
      articleId: article.getId(),
      callerAccountId: AUTHOR_ACCOUNT_ID,
      title: 'Edited title',
      body: 'Edited body',
      language: KnowledgeArticleLanguage.Arabic,
    });

    assert.equal(result.getStatus(), KnowledgeArticleStatus.PendingReview);
  });

  it('editing a Published article re-enters PendingReview', async () => {
    const doctorProfile = authorDoctorProfile();
    const article = KnowledgeArticle.author({
      authoringDoctorId: doctorProfile.getId(),
      title: 'Managing Hypertension at Home',
      body: 'Some real, doctor-authored content.',
      language: KnowledgeArticleLanguage.Arabic,
      specialtyId: SPECIALTY_ID,
      requiresPreReview: false,
    });
    const repository = new FakeKnowledgeArticleRepository(article);
    const useCase = new EditArticleUseCase(repository, new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(doctorProfile)));

    const result = await useCase.execute({
      articleId: article.getId(),
      callerAccountId: AUTHOR_ACCOUNT_ID,
      title: 'Edited title',
      body: 'Edited body',
      language: KnowledgeArticleLanguage.Arabic,
    });

    assert.equal(result.getStatus(), KnowledgeArticleStatus.PendingReview);
  });

  it('re-derives specialtyId from the doctor profile CURRENT specialty, never trusting client input', async () => {
    const doctorProfile = authorDoctorProfile(NEW_SPECIALTY_ID);
    const article = KnowledgeArticle.author({
      authoringDoctorId: doctorProfile.getId(),
      title: 'x',
      body: 'y',
      language: KnowledgeArticleLanguage.Arabic,
      specialtyId: SPECIALTY_ID,
      saveAsDraft: true,
    });
    const repository = new FakeKnowledgeArticleRepository(article);
    const useCase = new EditArticleUseCase(repository, new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(doctorProfile)));

    const result = await useCase.execute({
      articleId: article.getId(),
      callerAccountId: AUTHOR_ACCOUNT_ID,
      title: 'New title',
      body: 'New body',
      language: KnowledgeArticleLanguage.English,
    });

    assert.equal(result.getSpecialtyId(), NEW_SPECIALTY_ID);
  });

  it('throws NotFoundError (never 403) when the caller does not own the article', async () => {
    const doctorProfile = authorDoctorProfile();
    const article = KnowledgeArticle.author({
      authoringDoctorId: doctorProfile.getId(),
      title: 'x',
      body: 'y',
      language: KnowledgeArticleLanguage.Arabic,
      specialtyId: SPECIALTY_ID,
      saveAsDraft: true,
    });
    const otherDoctorProfile = DoctorProfile.register({
      accountId: OTHER_ACCOUNT_ID,
      licenseNumber: 'LIC-2',
      specialtyId: SPECIALTY_ID,
    });
    const repository = new FakeKnowledgeArticleRepository(article);
    const useCase = new EditArticleUseCase(
      repository,
      new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(otherDoctorProfile)),
    );

    await assert.rejects(
      () =>
        useCase.execute({
          articleId: article.getId(),
          callerAccountId: OTHER_ACCOUNT_ID,
          title: 'New title',
          body: 'New body',
          language: KnowledgeArticleLanguage.English,
        }),
      NotFoundError,
    );
  });

  it('throws NotFoundError when the article does not exist', async () => {
    const repository = new FakeKnowledgeArticleRepository(null);
    const useCase = new EditArticleUseCase(repository, new GetDoctorProfileByAccountIdUseCase(new FakeDoctorProfileRepository(null)));

    await assert.rejects(
      () =>
        useCase.execute({
          articleId: 'missing-id',
          callerAccountId: OTHER_ACCOUNT_ID,
          title: 'New title',
          body: 'New body',
          language: KnowledgeArticleLanguage.English,
        }),
      NotFoundError,
    );
  });
});
