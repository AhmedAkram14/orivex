import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { KnowledgeDomainError } from '../exceptions/knowledge-domain.error.js';
import { KnowledgeArticleStatus } from '../enums/knowledge-article-status.enum.js';
import { KnowledgeArticleLanguage } from '../enums/knowledge-article-language.enum.js';

import { KnowledgeArticle } from './knowledge-article.entity.js';

const SPECIALTY_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_SPECIALTY_ID = '55555555-5555-4555-8555-555555555555';

const PROPS = {
  authoringDoctorId: '11111111-1111-4111-8111-111111111111',
  title: 'Managing Hypertension at Home',
  body: 'Some real, doctor-authored content about blood pressure management.',
  language: KnowledgeArticleLanguage.Arabic,
  specialtyId: SPECIALTY_ID,
};

const LONG_TITLE = 'A'.repeat(10);
const LONG_BODY = 'B'.repeat(200);

function reconstituteDraft(overrides: Partial<Parameters<typeof KnowledgeArticle.reconstitute>[0]> = {}) {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return KnowledgeArticle.reconstitute({
    id: '33333333-3333-4333-8333-333333333333',
    authoringDoctorId: PROPS.authoringDoctorId,
    title: 'Draft title',
    body: 'Draft body',
    status: KnowledgeArticleStatus.Draft,
    language: KnowledgeArticleLanguage.Arabic,
    specialtyId: SPECIALTY_ID,
    sourcesText: undefined,
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

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

  it('exposes language, specialtyId, sourcesText, and viewCount getters', () => {
    const article = KnowledgeArticle.author({ ...PROPS, sourcesText: 'https://example.org/study', requiresPreReview: true });
    assert.equal(article.getLanguage(), KnowledgeArticleLanguage.Arabic);
    assert.equal(article.getSpecialtyId(), SPECIALTY_ID);
    assert.equal(article.getSourcesText(), 'https://example.org/study');
    assert.equal(article.getViewCount(), 0);
  });

  describe('edit()', () => {
    it('updates content in place from Draft with no status change', () => {
      const article = reconstituteDraft();
      article.edit('New title', 'New body', KnowledgeArticleLanguage.English, OTHER_SPECIALTY_ID, 'src');
      assert.equal(article.getStatus(), KnowledgeArticleStatus.Draft);
      assert.equal(article.getTitle(), 'New title');
      assert.equal(article.getBody(), 'New body');
      assert.equal(article.getLanguage(), KnowledgeArticleLanguage.English);
      assert.equal(article.getSpecialtyId(), OTHER_SPECIALTY_ID);
      assert.equal(article.getSourcesText(), 'src');
    });

    it('updates content in place from PendingReview with no status change', () => {
      const article = KnowledgeArticle.author({ ...PROPS, requiresPreReview: true });
      article.edit('New title', 'New body', KnowledgeArticleLanguage.English, OTHER_SPECIALTY_ID);
      assert.equal(article.getStatus(), KnowledgeArticleStatus.PendingReview);
      assert.equal(article.getTitle(), 'New title');
    });

    it('transitions Published -> PendingReview, clears moderation fields, and preserves publishedAt', () => {
      // Built via moderate()'s own approval path so moderationReason/
      // moderatedByAccountId/moderatedAt are genuinely populated beforehand.
      const publishedArticle = KnowledgeArticle.author({ ...PROPS, requiresPreReview: true });
      publishedArticle.moderate(KnowledgeArticleStatus.Published, 'Looks good.', 'admin-account-1');
      const publishedAtBefore = publishedArticle.getPublishedAt();
      assert.ok(publishedAtBefore);

      publishedArticle.edit('Edited title', 'Edited body', KnowledgeArticleLanguage.English, OTHER_SPECIALTY_ID);

      assert.equal(publishedArticle.getStatus(), KnowledgeArticleStatus.PendingReview);
      assert.equal(publishedArticle.getTitle(), 'Edited title');
      assert.equal(publishedArticle.getModerationReason(), undefined);
      assert.equal(publishedArticle.getModeratedByAccountId(), undefined);
      assert.equal(publishedArticle.getModeratedAt(), undefined);
      assert.equal(publishedArticle.getPublishedAt(), publishedAtBefore);
    });

    it('throws when called on a Rejected article', () => {
      const article = KnowledgeArticle.author({ ...PROPS, requiresPreReview: true });
      article.moderate(KnowledgeArticleStatus.Rejected, 'No.', 'admin-account-1');
      assert.throws(() => article.edit('t', 'b', KnowledgeArticleLanguage.Arabic, SPECIALTY_ID), KnowledgeDomainError);
    });

    it('throws when called on an Archived article', () => {
      const article = KnowledgeArticle.author({ ...PROPS, requiresPreReview: false });
      article.moderate(KnowledgeArticleStatus.Archived, 'Outdated.', 'admin-account-1');
      assert.throws(() => article.edit('t', 'b', KnowledgeArticleLanguage.Arabic, SPECIALTY_ID), KnowledgeDomainError);
    });
  });

  describe('submitForReview()', () => {
    it('transitions Draft -> PendingReview when requiresPreReview is true', () => {
      const article = reconstituteDraft({ title: LONG_TITLE, body: LONG_BODY });
      article.submitForReview(true);
      assert.equal(article.getStatus(), KnowledgeArticleStatus.PendingReview);
      assert.equal(article.getPublishedAt(), undefined);
    });

    it('transitions Draft -> Published when requiresPreReview is false', () => {
      const article = reconstituteDraft({ title: LONG_TITLE, body: LONG_BODY });
      article.submitForReview(false);
      assert.equal(article.getStatus(), KnowledgeArticleStatus.Published);
      assert.ok(article.getPublishedAt());
    });

    it('throws when the title is under 10 trimmed characters', () => {
      const article = reconstituteDraft({ title: 'short', body: LONG_BODY });
      assert.throws(
        () => article.submitForReview(true),
        (error: unknown) => error instanceof KnowledgeDomainError && /title of at least 10 characters/.test(error.message),
      );
    });

    it('throws when the body is under 200 trimmed characters', () => {
      const article = reconstituteDraft({ title: LONG_TITLE, body: 'too short' });
      assert.throws(
        () => article.submitForReview(true),
        (error: unknown) => error instanceof KnowledgeDomainError && /body of at least 200 characters/.test(error.message),
      );
    });

    it('succeeds at exactly the 10/200 character boundary', () => {
      const article = reconstituteDraft({ title: LONG_TITLE, body: LONG_BODY });
      assert.doesNotThrow(() => article.submitForReview(true));
    });

    it('throws when called on a non-Draft article', () => {
      const article = KnowledgeArticle.author({ ...PROPS, requiresPreReview: true });
      assert.throws(() => article.submitForReview(true), KnowledgeDomainError);
    });
  });

  describe('unpublish()', () => {
    it('transitions Published -> Archived, recording reason/actor/timestamp', () => {
      const article = KnowledgeArticle.author({ ...PROPS, requiresPreReview: false });
      article.unpublish('No longer accurate.', 'doctor-account-1');
      assert.equal(article.getStatus(), KnowledgeArticleStatus.Archived);
      assert.equal(article.getModerationReason(), 'No longer accurate.');
      assert.equal(article.getModeratedByAccountId(), 'doctor-account-1');
      assert.ok(article.getModeratedAt());
    });

    it('throws when called on a non-Published article', () => {
      const article = KnowledgeArticle.author({ ...PROPS, requiresPreReview: true });
      assert.throws(() => article.unpublish('reason', 'doctor-account-1'), KnowledgeDomainError);
    });

    it('throws on an empty reason', () => {
      const article = KnowledgeArticle.author({ ...PROPS, requiresPreReview: false });
      assert.throws(() => article.unpublish('  ', 'doctor-account-1'), KnowledgeDomainError);
    });
  });

  describe('recordView()', () => {
    it('increments viewCount without touching updatedAt', () => {
      const article = KnowledgeArticle.author({ ...PROPS, requiresPreReview: false });
      const updatedAtBefore = article.getUpdatedAt();
      article.recordView();
      article.recordView();
      assert.equal(article.getViewCount(), 2);
      assert.equal(article.getUpdatedAt(), updatedAtBefore);
    });
  });
});
