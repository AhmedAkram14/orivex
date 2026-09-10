import type { KnowledgeArticle } from '../../../domain/entities/knowledge-article.entity.js';
import type { KnowledgeArticleRepository } from '../../../domain/repositories/knowledge-article.repository.js';

import type { ListPublishedArticlesQuery } from './list-published-articles.query.js';

export interface ListPublishedArticlesResult {
  articles: KnowledgeArticle[];
  total: number;
}

// I13 -- Knowledge Center: the patient/doctor-facing feed -- optionally
// scoped to one doctor (a portfolio's own "Articles" tab).
export class ListPublishedArticlesUseCase {
  constructor(private readonly knowledgeArticleRepository: KnowledgeArticleRepository) {}

  async execute(query: ListPublishedArticlesQuery): Promise<ListPublishedArticlesResult> {
    const { articles, total } = await this.knowledgeArticleRepository.listPublished(query.page, query.limit, query.doctorId);
    return { articles, total };
  }
}
