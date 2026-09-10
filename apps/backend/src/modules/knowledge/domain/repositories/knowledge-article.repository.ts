import type { KnowledgeArticle } from '../entities/knowledge-article.entity.js';
import type { KnowledgeArticleStatus } from '../enums/knowledge-article-status.enum.js';

export interface KnowledgeArticleRepository {
  findById(id: string): Promise<KnowledgeArticle | null>;
  /** The public/patient-facing feed -- Published only, newest first. Optionally scoped to one doctor (a portfolio's own article list). */
  listPublished(page: number, limit: number, doctorId?: string): Promise<{ articles: KnowledgeArticle[]; total: number }>;
  /** A doctor's own articles, any status -- their "my articles" view. */
  listByAuthor(authoringDoctorId: string): Promise<KnowledgeArticle[]>;
  /** I13's own admin moderation queue. */
  listByStatus(status: KnowledgeArticleStatus, page: number, limit: number): Promise<{ articles: KnowledgeArticle[]; total: number }>;
  /** How many of this doctor's articles have ever been Published or Archived -- the pre-publication-review threshold check (never counts Rejected/PendingReview, which were never actually live). */
  countEverPublishedByAuthor(authoringDoctorId: string): Promise<number>;
  save(article: KnowledgeArticle): Promise<void>;
  update(article: KnowledgeArticle): Promise<void>;
}
