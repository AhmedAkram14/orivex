import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { KnowledgeDomainError } from '../../../domain/exceptions/knowledge-domain.error.js';
import { KnowledgeArticle } from '../../../domain/entities/knowledge-article.entity.js';
import { KnowledgeArticleStatus } from '../../../domain/enums/knowledge-article-status.enum.js';
import type { KnowledgeArticleRepository } from '../../../domain/repositories/knowledge-article.repository.js';

import { ModerateArticleUseCase } from './moderate-article.use-case.js';

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

function pendingArticle(): KnowledgeArticle {
  return KnowledgeArticle.author({
    authoringDoctorId: 'doctor-profile-id',
    title: 'Title',
    body: 'Body content here.',
    requiresPreReview: true,
  });
}

describe('ModerateArticleUseCase', () => {
  it('approves a PendingReview article to Published and persists it', async () => {
    const article = pendingArticle();
    const repository = new FakeKnowledgeArticleRepository(article);
    const useCase = new ModerateArticleUseCase(repository);

    const result = await useCase.execute({
      articleId: article.getId(),
      status: KnowledgeArticleStatus.Published,
      reason: 'Meets content quality guidelines.',
      moderatorAccountId: 'admin-account-1',
    });

    assert.equal(result.getStatus(), KnowledgeArticleStatus.Published);
    assert.equal(repository.updated.length, 1);
  });

  it('rejects a PendingReview article', async () => {
    const article = pendingArticle();
    const useCase = new ModerateArticleUseCase(new FakeKnowledgeArticleRepository(article));

    const result = await useCase.execute({
      articleId: article.getId(),
      status: KnowledgeArticleStatus.Rejected,
      reason: 'Contains unverified medical claims.',
      moderatorAccountId: 'admin-account-1',
    });

    assert.equal(result.getStatus(), KnowledgeArticleStatus.Rejected);
  });

  it('throws NotFoundError when the article does not exist', async () => {
    const useCase = new ModerateArticleUseCase(new FakeKnowledgeArticleRepository(null));

    await assert.rejects(
      () =>
        useCase.execute({
          articleId: 'missing-id',
          status: KnowledgeArticleStatus.Published,
          reason: 'r',
          moderatorAccountId: 'admin-account-1',
        }),
      NotFoundError,
    );
  });

  it('propagates the domain error when the article is not in a moderable source status', async () => {
    const article = pendingArticle();
    article.moderate(KnowledgeArticleStatus.Rejected, 'Contains unverified medical claims.', 'admin-account-1');
    const useCase = new ModerateArticleUseCase(new FakeKnowledgeArticleRepository(article));

    await assert.rejects(
      () =>
        useCase.execute({
          articleId: article.getId(),
          status: KnowledgeArticleStatus.Published,
          reason: 'r',
          moderatorAccountId: 'admin-account-1',
        }),
      KnowledgeDomainError,
    );
  });
});
