import type {
  ArticleSave,
  DoctorFollow,
  EditArticleInput,
  KnowledgeArticle,
  KnowledgeArticleLanguage,
  KnowledgeArticleStatus,
} from '@/features/knowledge/api/types';
import { findAllVerificationCasesBySubject } from '@/mocks/verification-case-store';
import { getDoctorByAccountId } from '@/mocks/doctor-store';

/**
 * In-memory mock "backend" state for KnowledgeController/AdministrationController's
 * `/knowledge/*` and `/admin/knowledge/*` routes (I13, ORIVEX Remaining Work
 * Audit) -- mirrors `disputes-store.ts`'s own pattern.
 */
const PRE_REVIEW_THRESHOLD = 3;
const TITLE_MIN_FOR_SUBMIT = 10;
const BODY_MIN_FOR_SUBMIT = 200;

let articles: KnowledgeArticle[] = [];
const savesByPatientId = new Map<string, ArticleSave[]>();
const followsByPatientId = new Map<string, DoctorFollow[]>();

function isDoctorVerified(accountId: string): boolean {
  const cases = findAllVerificationCasesBySubject('doctor', accountId);
  return cases[0]?.status === 'approved';
}

function countEverPublishedByAuthor(doctorProfileId: string): number {
  return articles.filter(
    (article) => article.authoringDoctorId === doctorProfileId && (article.status === 'published' || article.status === 'archived'),
  ).length;
}

export function authorArticle(
  callerAccountId: string,
  title: string,
  body: string,
  language: KnowledgeArticleLanguage,
  sourcesText?: string,
  saveAsDraft?: boolean,
): { ok: true; article: KnowledgeArticle } | { ok: false; reason: 'no_profile' | 'not_verified' } {
  const doctorProfile = getDoctorByAccountId(callerAccountId);
  if (!doctorProfile) {
    return { ok: false, reason: 'no_profile' };
  }
  if (!isDoctorVerified(callerAccountId)) {
    return { ok: false, reason: 'not_verified' };
  }

  const now = new Date().toISOString();
  // Mirrors the real domain entity's own author(): `saveAsDraft` always
  // lands as Draft, no length floor -- the floor is enforced only by
  // `submitForReview()` below, never here.
  const requiresPreReview = countEverPublishedByAuthor(doctorProfile.id) < PRE_REVIEW_THRESHOLD;
  const status = saveAsDraft ? 'draft' : requiresPreReview ? 'pending_review' : 'published';
  const article: KnowledgeArticle = {
    id: `knowledge-article-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    authoringDoctorId: doctorProfile.id,
    title,
    body,
    status,
    language,
    specialtyId: doctorProfile.specialtyId,
    sourcesText: sourcesText?.trim() || null,
    viewCount: 0,
    moderationReason: null,
    moderatedByAccountId: null,
    moderatedAt: null,
    publishedAt: status === 'published' ? now : null,
    createdAt: now,
    updatedAt: now,
  };
  articles = [article, ...articles];
  return { ok: true, article };
}

export function listMyArticles(callerAccountId: string): KnowledgeArticle[] {
  const doctorProfile = getDoctorByAccountId(callerAccountId);
  if (!doctorProfile) return [];
  return articles.filter((article) => article.authoringDoctorId === doctorProfile.id);
}

export function listPublishedArticles(doctorId?: string, language?: KnowledgeArticleLanguage): KnowledgeArticle[] {
  return articles.filter(
    (article) =>
      article.status === 'published' &&
      (!doctorId || article.authoringDoctorId === doctorId) &&
      (!language || article.language === language),
  );
}

/** Knowledge Center Hardening Phase 3 (mock parity): mirrors `KnowledgeArticle.edit()` -- legal from Draft/PendingReview/Published, illegal from Rejected/Archived; from Published also resets to PendingReview and clears the stale moderation verdict while preserving `publishedAt`. */
export function editArticle(
  id: string,
  input: EditArticleInput,
): { ok: true; article: KnowledgeArticle } | { ok: false; reason: 'not_found' | 'illegal_status' } {
  const existing = articles.find((article) => article.id === id);
  if (!existing) return { ok: false, reason: 'not_found' };
  if (existing.status === 'rejected' || existing.status === 'archived') {
    return { ok: false, reason: 'illegal_status' };
  }

  const wasPublished = existing.status === 'published';
  const updated: KnowledgeArticle = {
    ...existing,
    title: input.title,
    body: input.body,
    language: input.language,
    sourcesText: input.sourcesText?.trim() || null,
    status: wasPublished ? 'pending_review' : existing.status,
    moderationReason: wasPublished ? null : existing.moderationReason,
    moderatedByAccountId: wasPublished ? null : existing.moderatedByAccountId,
    moderatedAt: wasPublished ? null : existing.moderatedAt,
    updatedAt: new Date().toISOString(),
  };
  articles = articles.map((article) => (article.id === id ? updated : article));
  return { ok: true, article: updated };
}

/** Mirrors `KnowledgeArticle.submitForReview()` -- Draft only, enforcing the same 10/200-character floor. */
export function submitArticleForReview(
  id: string,
  authoringDoctorId: string,
): { ok: true; article: KnowledgeArticle } | { ok: false; reason: 'not_found' | 'illegal_status' | 'too_short' } {
  const existing = articles.find((article) => article.id === id);
  if (!existing) return { ok: false, reason: 'not_found' };
  if (existing.status !== 'draft') return { ok: false, reason: 'illegal_status' };
  if (existing.title.trim().length < TITLE_MIN_FOR_SUBMIT || existing.body.trim().length < BODY_MIN_FOR_SUBMIT) {
    return { ok: false, reason: 'too_short' };
  }

  const requiresPreReview = countEverPublishedByAuthor(authoringDoctorId) < PRE_REVIEW_THRESHOLD;
  const now = new Date().toISOString();
  const status = requiresPreReview ? 'pending_review' : 'published';
  const updated: KnowledgeArticle = { ...existing, status, publishedAt: status === 'published' ? now : existing.publishedAt, updatedAt: now };
  articles = articles.map((article) => (article.id === id ? updated : article));
  return { ok: true, article: updated };
}

/** Mirrors `KnowledgeArticle.unpublish()` -- Published only. */
export function unpublishArticle(
  id: string,
  reason: string,
  actingAccountId: string,
): { ok: true; article: KnowledgeArticle } | { ok: false; reason: 'not_found' | 'illegal_status' } {
  const existing = articles.find((article) => article.id === id);
  if (!existing) return { ok: false, reason: 'not_found' };
  if (existing.status !== 'published') return { ok: false, reason: 'illegal_status' };

  const now = new Date().toISOString();
  const updated: KnowledgeArticle = {
    ...existing,
    status: 'archived',
    moderationReason: reason,
    moderatedByAccountId: actingAccountId,
    moderatedAt: now,
    updatedAt: now,
  };
  articles = articles.map((article) => (article.id === id ? updated : article));
  return { ok: true, article: updated };
}

/** Mirrors `KnowledgeArticle.recordView()`/decision 7: a stranger's read of a Published article increments the count; the authoring doctor's own read never does. */
export function recordArticleView(id: string, readerDoctorProfileId: string | undefined): void {
  const existing = articles.find((article) => article.id === id);
  if (!existing || existing.status !== 'published') return;
  if (readerDoctorProfileId && readerDoctorProfileId === existing.authoringDoctorId) return;
  articles = articles.map((article) => (article.id === id ? { ...article, viewCount: article.viewCount + 1 } : article));
}

export function listArticlesByStatus(status: KnowledgeArticleStatus): KnowledgeArticle[] {
  return articles.filter((article) => article.status === status);
}

export function findArticleById(id: string): KnowledgeArticle | undefined {
  return articles.find((article) => article.id === id);
}

export function moderateArticle(
  id: string,
  status: 'published' | 'rejected' | 'archived',
  reason: string,
  moderatorAccountId: string,
): KnowledgeArticle | null {
  const existing = articles.find((article) => article.id === id);
  if (!existing) return null;
  const now = new Date().toISOString();
  const updated: KnowledgeArticle = {
    ...existing,
    status,
    moderationReason: reason,
    moderatedByAccountId: moderatorAccountId,
    moderatedAt: now,
    publishedAt: status === 'published' ? now : existing.publishedAt,
  };
  articles = articles.map((article) => (article.id === id ? updated : article));
  return updated;
}

export function saveArticle(patientId: string, articleId: string): ArticleSave {
  const list = savesByPatientId.get(patientId) ?? [];
  const existing = list.find((save) => save.articleId === articleId);
  if (existing) return existing;
  const save: ArticleSave = {
    id: `article-save-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    articleId,
    createdAt: new Date().toISOString(),
  };
  savesByPatientId.set(patientId, [...list, save]);
  return save;
}

export function unsaveArticle(patientId: string, articleId: string): void {
  const list = savesByPatientId.get(patientId) ?? [];
  savesByPatientId.set(patientId, list.filter((save) => save.articleId !== articleId));
}

export function listSavedArticles(patientId: string): ArticleSave[] {
  return savesByPatientId.get(patientId) ?? [];
}

export function followDoctor(patientId: string, doctorId: string): DoctorFollow {
  const list = followsByPatientId.get(patientId) ?? [];
  const existing = list.find((follow) => follow.doctorId === doctorId);
  if (existing) return existing;
  const follow: DoctorFollow = { id: `doctor-follow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, doctorId, createdAt: new Date().toISOString() };
  followsByPatientId.set(patientId, [...list, follow]);
  return follow;
}

export function unfollowDoctor(patientId: string, doctorId: string): void {
  const list = followsByPatientId.get(patientId) ?? [];
  followsByPatientId.set(patientId, list.filter((follow) => follow.doctorId !== doctorId));
}

export function listFollowedDoctors(patientId: string): DoctorFollow[] {
  return followsByPatientId.get(patientId) ?? [];
}

/** Test-only reset seam, matching every other mock store's own `resetX()` convention. */
export function resetKnowledgeStore(): void {
  articles = [];
  savesByPatientId.clear();
  followsByPatientId.clear();
}
