import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { KnowledgeDomainError } from '../exceptions/knowledge-domain.error.js';
import { KnowledgeArticleStatus } from '../enums/knowledge-article-status.enum.js';

import { KnowledgeArticle } from './knowledge-article.entity.js';

const PROPS = {
  authoringDoctorId: '11111111-1111-4111-8111-111111111111',
  title: 'Managing Hypertension at Home',
  body: 'Some real, doctor-authored content about blood pressure management.',
};

describe('KnowledgeArticle', () => {
  it('starts PendingReview when the doctor still requires pre-publication review', () => {
    const article = KnowledgeArticle.author({ ...PROPS, requiresPreReview: true });
    assert.equal(article.getStatus(), KnowledgeArticleStatus.PendingReview);
    assert.equal(article.getPublishedAt(), undefined);
  });

  it('publishes immediately once the doctor has cleared the pre-review threshold', () => {
    const article = KnowledgeArticle.author({ ...PROPS, requiresPreReview: false });
    assert.equal(article.getStatus(), KnowledgeArticleStatus.Published);
    assert.ok(article.getPublishedAt());
  });

  it('throws on an empty title or body', () => {
    assert.throws(() => KnowledgeArticle.author({ ...PROPS, title: '  ', requiresPreReview: true }), KnowledgeDomainError);
    assert.throws(() => KnowledgeArticle.author({ ...PROPS, body: '', requiresPreReview: true }), KnowledgeDomainError);
  });

  it('moderate() approves a PendingReview article to Published, recording who and when', () => {
    const article = KnowledgeArticle.author({ ...PROPS, requiresPreReview: true });
    article.moderate(KnowledgeArticleStatus.Published, 'Meets content quality guidelines.', 'admin-account-1');
    assert.equal(article.getStatus(), KnowledgeArticleStatus.Published);
    assert.equal(article.getModeratedByAccountId(), 'admin-account-1');
    assert.ok(article.getPublishedAt());
  });

  it('moderate() rejects a PendingReview article instead', () => {
    const article = KnowledgeArticle.author({ ...PROPS, requiresPreReview: true });
    article.moderate(KnowledgeArticleStatus.Rejected, 'Contains unverified medical claims.', 'admin-account-1');
    assert.equal(article.getStatus(), KnowledgeArticleStatus.Rejected);
    assert.equal(article.getPublishedAt(), undefined);
  });

  it('moderate() archives an already-Published article (post-publication spot-review)', () => {
    const article = KnowledgeArticle.author({ ...PROPS, requiresPreReview: false });
    article.moderate(KnowledgeArticleStatus.Archived, 'Outdated guidance, superseded by newer research.', 'admin-account-1');
    assert.equal(article.getStatus(), KnowledgeArticleStatus.Archived);
  });

  it('moderate() throws when approving/rejecting an article that is not PendingReview', () => {
    const article = KnowledgeArticle.author({ ...PROPS, requiresPreReview: false });
    assert.throws(() => article.moderate(KnowledgeArticleStatus.Published, 'r', 'admin-account-1'), KnowledgeDomainError);
    assert.throws(() => article.moderate(KnowledgeArticleStatus.Rejected, 'r', 'admin-account-1'), KnowledgeDomainError);
  });

  it('moderate() throws when archiving an article that is not Published', () => {
    const article = KnowledgeArticle.author({ ...PROPS, requiresPreReview: true });
    assert.throws(() => article.moderate(KnowledgeArticleStatus.Archived, 'r', 'admin-account-1'), KnowledgeDomainError);
  });

  it('moderate() throws on an empty reason', () => {
    const article = KnowledgeArticle.author({ ...PROPS, requiresPreReview: true });
    assert.throws(() => article.moderate(KnowledgeArticleStatus.Published, '  ', 'admin-account-1'), KnowledgeDomainError);
  });
});
