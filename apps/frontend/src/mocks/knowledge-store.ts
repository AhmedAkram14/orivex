import type { ArticleSave, DoctorFollow, KnowledgeArticle, KnowledgeArticleStatus } from '@/features/knowledge/api/types';
import { findAllVerificationCasesBySubject } from '@/mocks/verification-case-store';
import { getDoctorByAccountId } from '@/mocks/doctor-store';

/**
 * In-memory mock "backend" state for KnowledgeController/AdministrationController's
 * `/knowledge/*` and `/admin/knowledge/*` routes (I13, ORIVEX Remaining Work
 * Audit) -- mirrors `disputes-store.ts`'s own pattern.
 */
const PRE_REVIEW_THRESHOLD = 3;

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
): { ok: true; article: KnowledgeArticle } | { ok: false; reason: 'no_profile' | 'not_verified' } {
  const doctorProfile = getDoctorByAccountId(callerAccountId);
  if (!doctorProfile) {
    return { ok: false, reason: 'no_profile' };
  }
  if (!isDoctorVerified(callerAccountId)) {
    return { ok: false, reason: 'not_verified' };
  }

  const requiresPreReview = countEverPublishedByAuthor(doctorProfile.id) < PRE_REVIEW_THRESHOLD;
  const now = new Date().toISOString();
  const article: KnowledgeArticle = {
    id: `knowledge-article-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    authoringDoctorId: doctorProfile.id,
    title,
    body,
    status: requiresPreReview ? 'pending_review' : 'published',
    moderationReason: null,
    moderatedByAccountId: null,
    moderatedAt: null,
    publishedAt: requiresPreReview ? null : now,
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

export function listPublishedArticles(doctorId?: string): KnowledgeArticle[] {
  return articles.filter((article) => article.status === 'published' && (!doctorId || article.authoringDoctorId === doctorId));
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
