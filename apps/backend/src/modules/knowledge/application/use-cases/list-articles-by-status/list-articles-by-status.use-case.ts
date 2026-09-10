import type { KnowledgeArticle } from '../../../domain/entities/knowledge-article.entity.js';
import type { KnowledgeArticleRepository } from '../../../domain/repositories/knowledge-article.repository.js';

import type { ListArticlesByStatusQuery } from './list-articles-by-status.query.js';

export interface ListArticlesByStatusResult {
  articles: KnowledgeArticle[];
  total: number;
}

// I13 -- Knowledge Center: the admin moderation queue -- defaults to
// PendingReview in the controller (what an admin needs to act on).
export class ListArticlesByStatusUseCase {
  constructor(private readonly knowledgeArticleRepository: KnowledgeArticleRepository) {}

  async execute(query: ListArticlesByStatusQuery): Promise<ListArticlesByStatusResult> {
    const { articles, total } = await this.knowledgeArticleRepository.listByStatus(query.status, query.page, query.limit);
    return { articles, total };
  }
}
