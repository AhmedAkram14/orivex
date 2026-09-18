/** I13 -- Knowledge Center. Matches KnowledgeArticleResponseDto exactly. */
export type KnowledgeArticleStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';

/**
 * Knowledge Center Hardening Phase 0/1: a knowledge-owned language tag,
 * deliberately not a re-export of identity's own `Language` enum (see the
 * backend's own `knowledge-article-language.enum.ts` comment) -- same
 * string values as identity's `Language`/`Account.preferredLanguage` on
 * purpose, so a doctor's/patient's own preferred-language string can be
 * used directly as a default here without translation.
 */
export type KnowledgeArticleLanguage = 'Arabic' | 'English';

export interface KnowledgeArticle {
  id: string;
  authoringDoctorId: string;
  title: string;
  body: string;
  status: KnowledgeArticleStatus;
  language: KnowledgeArticleLanguage;
  specialtyId: string;
  sourcesText: string | null;
  viewCount: number;
  moderationReason: string | null;
  moderatedByAccountId: string | null;
  moderatedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Matches ListKnowledgeArticlesResponseDto exactly. */
export interface ListKnowledgeArticlesResult {
  articles: KnowledgeArticle[];
  total: number;
  page: number;
  limit: number;
}

export interface ListPublishedArticlesParams {
  doctorId?: string;
  language?: KnowledgeArticleLanguage;
  page?: number;
  limit?: number;
}

export interface AuthorArticleInput {
  title: string;
  body: string;
  language: KnowledgeArticleLanguage;
  sourcesText?: string;
  saveAsDraft?: boolean;
}

/** Matches EditArticleRequestDto exactly. */
export interface EditArticleInput {
  title: string;
  body: string;
  language: KnowledgeArticleLanguage;
  sourcesText?: string;
}

/** Matches ArticleSaveResponseDto exactly. */
export interface ArticleSave {
  id: string;
  articleId: string;
  createdAt: string;
}

/** Matches DoctorFollowResponseDto exactly. */
export interface DoctorFollow {
  id: string;
  doctorId: string;
  createdAt: string;
}
