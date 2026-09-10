import { apiFetch } from '@/shared/lib/api/client';
import { KNOWLEDGE_PATHS } from '@/features/knowledge/api/paths';
import type {
  ArticleSave,
  AuthorArticleInput,
  DoctorFollow,
  KnowledgeArticle,
  ListKnowledgeArticlesResult,
  ListPublishedArticlesParams,
} from '@/features/knowledge/api/types';

function buildListArticlesQuery(params: ListPublishedArticlesParams): string {
  const query = new URLSearchParams();
  if (params.doctorId) query.set('doctorId', params.doctorId);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return qs ? `${KNOWLEDGE_PATHS.articles()}?${qs}` : KNOWLEDGE_PATHS.articles();
}

/**
 * I13 -- Knowledge Center (docs/01.1-prd-update.md §6). The only module
 * that talks to `/knowledge/*` -- mirrors `messagingApi`'s shape: a thin
 * typed wrapper over `apiFetch`.
 */
export const knowledgeApi = {
  author: (input: AuthorArticleInput) =>
    apiFetch<KnowledgeArticle>({ method: 'POST', path: KNOWLEDGE_PATHS.articles(), body: input }),

  listMine: () => apiFetch<KnowledgeArticle[]>({ path: KNOWLEDGE_PATHS.myArticles() }),

  listPublished: (params: ListPublishedArticlesParams = {}) =>
    apiFetch<ListKnowledgeArticlesResult>({ path: buildListArticlesQuery(params) }),

  getById: (id: string) => apiFetch<KnowledgeArticle>({ path: KNOWLEDGE_PATHS.article(id) }),

  save: (id: string) => apiFetch<ArticleSave>({ method: 'POST', path: KNOWLEDGE_PATHS.saveArticle(id) }),

  unsave: (id: string) => apiFetch<void>({ method: 'DELETE', path: KNOWLEDGE_PATHS.saveArticle(id) }),

  listSaved: () => apiFetch<ArticleSave[]>({ path: KNOWLEDGE_PATHS.savedArticles() }),

  followDoctor: (doctorId: string) =>
    apiFetch<DoctorFollow>({ method: 'POST', path: KNOWLEDGE_PATHS.followDoctor(doctorId) }),

  unfollowDoctor: (doctorId: string) =>
    apiFetch<void>({ method: 'DELETE', path: KNOWLEDGE_PATHS.followDoctor(doctorId) }),

  listFollowed: () => apiFetch<DoctorFollow[]>({ path: KNOWLEDGE_PATHS.followedDoctors() }),
};
