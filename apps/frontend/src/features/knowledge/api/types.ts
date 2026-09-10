/** I13 -- Knowledge Center. Matches KnowledgeArticleResponseDto exactly. */
export type KnowledgeArticleStatus = 'pending_review' | 'published' | 'rejected' | 'archived';

export interface KnowledgeArticle {
  id: string;
  authoringDoctorId: string;
  title: string;
  body: string;
  status: KnowledgeArticleStatus;
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
  page?: number;
  limit?: number;
}

export interface AuthorArticleInput {
  title: string;
  body: string;
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
